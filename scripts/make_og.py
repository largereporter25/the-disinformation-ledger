from PIL import Image, ImageDraw, ImageFont
import os

SRC = "uploaded_attachments/b2a5d2b5f2214b159b63846636f4c1ba/portrait_contact_sheet.jpg"
OUT_DIR = "dashboard/dist"
PAPER = (244, 241, 232)   # off-white editorial paper
INK = (28, 25, 23)        # charcoal
CRIMSON = (185, 29, 29)   # #b91c1c

W, H = 1200, 630
card = Image.new("RGB", (W, H), PAPER)
draw = ImageDraw.Draw(card)

# --- load fonts (fall back gracefully) ---
def font(paths, size):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

serif_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
]
mono_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
]
f_title = font(serif_paths, 54)
f_strike = font(serif_paths, 54)
f_kicker = font(mono_paths, 20)
f_sub = font(mono_paths, 18)

# --- left text panel ---
PANEL_W = 510
pad = 48

# top crimson rule
draw.rectangle([pad, 70, pad + 60, 76], fill=CRIMSON)

# kicker
draw.text((pad, 92), "THE DISINFORMATION LEDGER", font=f_kicker, fill=CRIMSON)

# Title: "Know Your" / "Leaders Liars" (Leaders struck through)
y = 150
draw.text((pad, y), "Know Your", font=f_title, fill=INK)
y2 = y + 78
# "Leaders" in muted grey with strikethrough, then "Liars" in crimson
leaders_txt = "Leaders"
lead_color = (130, 124, 118)
draw.text((pad, y2), leaders_txt, font=f_strike, fill=lead_color)
lw = draw.textlength(leaders_txt, font=f_strike)
# strikethrough line in crimson
mid = y2 + 36
draw.rectangle([pad - 2, mid - 3, pad + lw + 2, mid + 3], fill=CRIMSON)
# "Liars"
draw.text((pad + lw + 18, y2), "Liars", font=f_title, fill=CRIMSON)

# subtitle lines
sy = y2 + 110
draw.text((pad, sy), "1,656 fact-checked claims", font=f_sub, fill=INK)
draw.text((pad, sy + 28), "8 countries  ·  41 tracked figures", font=f_sub, fill=INK)

# mission line
draw.text((pad, H - 70), "MAKING FACT-CHECKS TRAVEL", font=f_kicker, fill=INK)
draw.text((pad, H - 46), "FASTER THAN LIES", font=f_kicker, fill=CRIMSON)

# --- right: contact sheet, cropped to fill remaining area ---
img = Image.open(SRC).convert("RGB")
area_x = PANEL_W
area_w = W - PANEL_W
area_h = H
# scale to cover
scale = max(area_w / img.width, area_h / img.height)
nw, nh = int(img.width * scale), int(img.height * scale)
img_r = img.resize((nw, nh), Image.LANCZOS)
# center crop
left = (nw - area_w) // 2
top = (nh - area_h) // 2
img_c = img_r.crop((left, top, left + area_w, top + area_h))
card.paste(img_c, (area_x, 0))

# thin crimson divider between panel and image
draw.rectangle([area_x - 3, 0, area_x, H], fill=CRIMSON)

os.makedirs(OUT_DIR, exist_ok=True)
out_path = os.path.join(OUT_DIR, "og-image.png")
card.save(out_path, "PNG")
print("saved", out_path, card.size)
