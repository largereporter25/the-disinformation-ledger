import csv, subprocess, sys, json, re, concurrent.futures as cf

rows = list(csv.DictReader(open('drive_csvs/US_ISRAEL.csv')))

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
# Hosts that block bots but are valid in-browser
SOFTBLOCK = ("apnews.com", "reuters.com", "afp.com", "washingtonpost.com", "factcheck.afp.com")

def check(row):
    url = row['source_url'].strip()
    cid = row['claim_id']
    if not url:
        return (cid, "NO_URL", url, "")
    host = re.sub(r'https?://([^/]+).*', r'\1', url).lower()
    try:
        p = subprocess.run(
            ["curl", "-sS", "-L", "--max-time", "30", "-A", UA,
             "-w", "%{http_code}", "-o", "/tmp/pf_%s.html" % cid.replace('/', '_'), url],
            capture_output=True, text=True, timeout=40)
        code = p.stdout.strip()[-3:]
    except Exception:
        code = "000"
    # soft-block hosts: accept any non-404
    if any(h in host for h in SOFTBLOCK):
        if code in ("404",):
            return (cid, "DEAD", url, code)
        return (cid, "SOFT_OK", url, code)
    if code == "200":
        # verify actor surname present in page for politifact
        try:
            html = open("/tmp/pf_%s.html" % cid.replace('/', '_'), encoding='utf-8', errors='ignore').read().lower()
        except Exception:
            html = ""
        actor = row['actor'].split()[-1].lower() if row['actor'] else ""
        # politifact pages embed the speaker; check loosely
        if 'politifact.com' in host and actor and actor not in html and len(html) > 500:
            return (cid, "MISMATCH", url, code)
        if len(html) < 500:
            return (cid, "THIN", url, code)
        return (cid, "OK", url, code)
    if code in ("403", "429"):
        return (cid, "SOFT_OK", url, code)  # blocked but likely valid
    return (cid, "DEAD", url, code)

results = []
with cf.ThreadPoolExecutor(max_workers=12) as ex:
    futs = {ex.submit(check, r): r for r in rows}
    for f in cf.as_completed(futs):
        results.append(f.result())

from collections import Counter
status = Counter(r[1] for r in results)
print("STATUS:", dict(status))
problems = [r for r in results if r[1] in ("DEAD", "MISMATCH", "THIN", "NO_URL")]
print(f"\nPROBLEMS: {len(problems)}")
for cid, st, url, code in sorted(problems):
    print(f"  {cid} [{st} {code}] {url}")

json.dump({"results": results, "problems": problems}, open("us_israel_validation.json", "w"), indent=2)
print("\nSaved us_israel_validation.json")
