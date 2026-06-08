import json, subprocess, urllib.parse, os, time

roster = json.load(open("portrait_roster.json"))
os.makedirs("portraits_raw", exist_ok=True)

# Explicit Wikipedia page titles where the actor name differs from page title
PAGE = {
    "Tommy Robinson (Stephen Yaxley-Lennon)": "Tommy Robinson (activist)",
    "Robert F. Kennedy Jr.": "Robert F. Kennedy Jr.",
    "JD Vance": "JD Vance",
    "Marjorie Taylor Greene": "Marjorie Taylor Greene",
    "Surendra Poonia": "Surendra Poonia",
    "Rishi Bagree": "Rishi Bagree",
    "Paul Golding": "Paul Golding",
    "Katie Hopkins": "Katie Hopkins",
    "Andrew Tate": "Andrew Tate",
    "Laurence Fox": "Laurence Fox",
}
UA = "DisinfoLedgerResearch/1.0 (journalism project; contact vanshkunalshah@gmail.com)"

def slug(name):
    return name.replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "")

def get_thumb(title, size=800):
    # Wikipedia REST: get original image via pageimages
    api = ("https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages"
           "&piprop=original|thumbnail&pithumbsize=%d&titles=%s&redirects=1"
           % (size, urllib.parse.quote(title)))
    p = subprocess.run(["curl", "-sS", "--max-time", "30", "-A", UA, api],
                       capture_output=True, text=True)
    try:
        d = json.loads(p.stdout)
        pages = d["query"]["pages"]
        for _, pg in pages.items():
            if "original" in pg:
                return pg["original"]["source"], pg.get("title")
            if "thumbnail" in pg:
                return pg["thumbnail"]["source"], pg.get("title")
    except Exception as e:
        return None, str(e)
    return None, "no-image"

results = []
for item in roster:
    name = item["name"]
    title = PAGE.get(name, name)
    url, resolved = get_thumb(title)
    entry = {"name": name, "country": item["country"], "count": item["count"],
             "page_title": title, "image_url": url, "resolved": resolved}
    if url:
        ext = url.split(".")[-1].split("?")[0].lower()
        if ext not in ("jpg", "jpeg", "png", "webp"):
            ext = "jpg"
        fn = f"portraits_raw/{slug(name)}.{ext}"
        dl = subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "-o", fn, url],
                            capture_output=True, text=True)
        sz = os.path.getsize(fn) if os.path.exists(fn) else 0
        entry["file"] = fn; entry["bytes"] = sz
        print(f"OK   {name:42} -> {fn} ({sz} bytes)")
    else:
        print(f"FAIL {name:42} -> {resolved}")
    results.append(entry)
    time.sleep(0.3)

json.dump(results, open("portrait_fetch_results.json", "w"), indent=2)
nok = sum(1 for r in results if r.get("bytes", 0) > 1000)
print(f"\nFetched {nok}/{len(results)} portraits")
