import json, subprocess, urllib.parse, os, time

UA = "DisinfoLedgerResearch/1.0 (journalism project; contact vanshkunalshah@gmail.com)"

# Bad ones (got Wikimedia error HTML) + the 2 that failed
RETRY = ["Surendra Poonia","Roberto Vannacci","Gilbert Collard","Francesco Lollobrigida",
         "Andrew Tate","Alexander Gauland","Piyush Goyal","Macarena Olona",
         "Ignacio Garriga","Christine Anderson","Amit Malviya","Rishi Bagree"]

# page-title overrides
PAGE = {"Andrew Tate":"Andrew Tate","Amit Malviya":"Amit Malviya","Rishi Bagree":None}

def slug(name):
    return name.replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "")

def get_thumb(title, size=600):
    api = ("https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages"
           "&piprop=thumbnail&pithumbsize=%d&titles=%s&redirects=1"
           % (size, urllib.parse.quote(title)))
    p = subprocess.run(["curl","-sS","--max-time","30","-A",UA,api], capture_output=True, text=True)
    try:
        d=json.loads(p.stdout)
        for _,pg in d["query"]["pages"].items():
            if "thumbnail" in pg: return pg["thumbnail"]["source"]
    except Exception: pass
    return None

results = json.load(open("portrait_fetch_results.json"))
by_name = {r["name"]: r for r in results}

for name in RETRY:
    title = PAGE.get(name, name)
    if title is None:
        print(f"SKIP {name} (no wiki page — will need alt)"); continue
    url = get_thumb(title)
    if not url:
        print(f"FAIL {name} -> no thumbnail"); continue
    ext = url.split(".")[-1].split("?")[0].lower()
    if ext not in ("jpg","jpeg","png","webp"): ext="jpg"
    fn = f"portraits_raw/{slug(name)}.{ext}"
    # remove old bad file with diff ext
    for old in os.listdir("portraits_raw"):
        if old.startswith(slug(name)+"."): 
            try: os.remove("portraits_raw/"+old)
            except: pass
    subprocess.run(["curl","-sS","-L","--max-time","60","-A",UA,"-o",fn,url], capture_output=True, text=True)
    sz = os.path.getsize(fn) if os.path.exists(fn) else 0
    isimg = subprocess.run(["file","-b","--mime-type",fn],capture_output=True,text=True).stdout.strip()
    ok = sz>5000 and isimg.startswith("image")
    print(f"{'OK  ' if ok else 'BAD '} {name:40} {sz}b {isimg} -> {fn}")
    if name in by_name:
        by_name[name].update({"image_url":url,"file":fn,"bytes":sz})
    time.sleep(1.5)

json.dump(list(by_name.values()), open("portrait_fetch_results.json","w"), indent=2)
print("\ndone")
