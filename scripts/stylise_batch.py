import json, subprocess, os, sys

PROMPT = ("Convert the person in the reference photograph into a high-contrast editorial screenprint portrait, "
          "preserving their EXACT facial likeness, features, expression, hairstyle and identity faithfully. "
          "Style: bold two-tone risograph/halftone poster illustration, restrained newspaper-investigative aesthetic. "
          "Deep charcoal ink and a single warm crimson-red spot color on a clean off-white paper background. "
          "Subtle halftone dot texture, confident graphic linework, dramatic directional lighting. "
          "Head-and-shoulders crop, centered, facing forward. Serious documentary tone. "
          "No text, no logos, no background scenery, just the stylised portrait on flat paper. "
          "Must remain instantly recognizable as the real person.")

def slug(name):
    return name.replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "").replace(".", "").replace("'", "")

results = json.load(open("portrait_fetch_results.json"))
valid = [x for x in results if x.get("file") and os.path.exists(x["file"]) and os.path.getsize(x["file"]) > 5000]

# allow a shard arg: python stylise_batch.py START END
start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end = int(sys.argv[2]) if len(sys.argv) > 2 else len(valid)

for x in valid[start:end]:
    name = x["name"]; src = x["file"]
    out_slug = slug(name)
    outfile = f"portraits_styled/{out_slug}"
    if os.path.exists(outfile + ".png") and os.path.getsize(outfile + ".png") > 50000:
        print(f"SKIP {name} (exists)"); continue
    payload = json.dumps({"prompt": PROMPT, "filename": outfile, "model": "nano_banana_pro",
                          "aspect_ratio": "1:1", "images": [os.path.abspath(src)]})
    p = subprocess.run(["asi-generate-image", payload], capture_output=True, text=True,
                       env={**os.environ})
    ok = os.path.exists(outfile + ".png") and os.path.getsize(outfile + ".png") > 50000
    print(f"{'OK  ' if ok else 'FAIL'} {name} -> {outfile}.png  {p.stdout.strip()[-60:]} {p.stderr.strip()[-80:]}")
