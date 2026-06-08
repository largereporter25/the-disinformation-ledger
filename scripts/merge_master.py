import csv

SCHEMA = ["claim_id","date_claimed","actor","country","actor_category","claim_verbatim",
          "topic_tag","platform","post_url","archived_url","verdict","verdict_source",
          "source_url","source_date","views","reposts","likes","platform_corrected",
          "claim_status","electoral_political_impact","notes"]

FILES = {
    "UK":        "United Kingdom",
    "US_ISRAEL": None,   # has country col already (US/Israel)
    "INDIA":     "India",
    "FRANCE":    "France",
    "GERMANY":   "Germany",
    "ITALY":     "Italy",
    "SPAIN":     "Spain",
}
PREFIX = {"UK":"UK","US_ISRAEL":"US","INDIA":"IN","FRANCE":"FR","GERMANY":"DE","ITALY":"IT","SPAIN":"ES"}

master = []
seen_ids = set()
for f, default_country in FILES.items():
    rows = list(csv.DictReader(open(f"drive_csvs/{f}.csv")))
    for r in rows:
        out = {}
        for col in SCHEMA:
            out[col] = r.get(col, "")
        if not out["country"]:
            out["country"] = default_country or ""
        # globally-unique id: <PREFIX>-<original>
        orig = out["claim_id"].strip() or f"{PREFIX[f]}row{len(master)}"
        gid = f"{PREFIX[f]}::{orig}"
        if gid in seen_ids:
            gid = f"{gid}-{len(master)}"
        seen_ids.add(gid)
        out["claim_id"] = gid
        master.append(out)
    print(f"{f}: +{len(rows)} rows (country={default_country or 'inline'})")

with open("MASTER_GLOBAL.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=SCHEMA)
    w.writeheader()
    w.writerows(master)

print(f"\nTOTAL MASTER: {len(master)} rows -> MASTER_GLOBAL.csv")

from collections import Counter
print("\nBy country:")
for k,v in Counter(r['country'] for r in master).most_common():
    print(f"  {v:5} {k}")
