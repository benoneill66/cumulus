import numpy as np
from PIL import Image, ImageDraw, ImageChops, ImageFilter

S = 2048                      # render at 2x, downscale to 1024 for crisp edges
PAD = 120                     # tighter than Apple spec so it reads big in the dock
R = 408                       # squircle corner radius
x0, y0, x1, y1 = PAD, PAD, S - PAD, S - PAD

# ---- dark diagonal gradient (the squircle body) ----
top = (26, 29, 42)
bot = (8, 9, 15)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
t = (xx + yy) / (2 * (S - 1))
dark = np.zeros((S, S, 3), np.uint8)
for c in range(3):
    dark[..., c] = (top[c] + (bot[c] - top[c]) * t).astype(np.uint8)
dark_img = Image.fromarray(dark, "RGB").convert("RGBA")

# squircle mask
sq = Image.new("L", (S, S), 0)
ImageDraw.Draw(sq).rounded_rectangle([x0, y0, x1, y1], radius=R, fill=255)

base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
dark_img.putalpha(sq)
base = Image.alpha_composite(base, dark_img)

# ---- amber radial glow, clipped to the squircle ----
cx, cy = S / 2, S * 0.40
dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
glow_a = np.clip(1 - dist / (S * 0.48), 0, 1) ** 1.7
glow_rgba = np.zeros((S, S, 4), np.uint8)
glow_rgba[..., 0] = 255; glow_rgba[..., 1] = 157; glow_rgba[..., 2] = 47
glow_rgba[..., 3] = (glow_a * 125).astype(np.uint8)
glow_img = Image.fromarray(glow_rgba, "RGBA")
glow_img.putalpha(ImageChops.multiply(glow_img.getchannel("A"), sq))
base = Image.alpha_composite(base, glow_img)

# ---- cloud silhouette (filled, amber vertical gradient) — large, fills the tile ----
cloud = Image.new("L", (S, S), 0)
d = ImageDraw.Draw(cloud)
def circle(cxx, cyy, r):
    d.ellipse([cxx - r, cyy - r, cxx + r, cyy + r], fill=255)
d.rounded_rectangle([520, 1000, 1528, 1238], radius=120, fill=255)
circle(1024, 832, 272)
circle(786, 938, 212)
circle(1262, 916, 226)
circle(612, 1058, 158)
circle(1436, 1044, 170)
cloud = cloud.filter(ImageFilter.GaussianBlur(1.3))

cgrad = np.zeros((S, S, 3), np.uint8)
ctop, cbot = (255, 196, 80), (255, 104, 58)
ct = np.clip((yy - 560) / (1240 - 560), 0, 1)
for c in range(3):
    cgrad[..., c] = (ctop[c] + (cbot[c] - ctop[c]) * ct).astype(np.uint8)
cloud_img = Image.fromarray(cgrad, "RGB").convert("RGBA")
cloud_img.putalpha(cloud)
base = Image.alpha_composite(base, cloud_img)

# ---- three status pips (the monitoring cue) ----
dd = ImageDraw.Draw(base)
pips = [(868, 1392, (52, 226, 160)), (1024, 1392, (255, 180, 84)), (1180, 1392, (255, 106, 61))]
for px, py, col in pips:
    r = 52
    dd.ellipse([px - r, py - r, px + r, py + r], fill=col + (255,))

# ---- hairline border for definition ----
hi = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(hi).rounded_rectangle([x0, y0, x1, y1], radius=R, outline=(255, 255, 255, 28), width=4)
base = Image.alpha_composite(base, hi)

out = base.resize((1024, 1024), Image.LANCZOS)
out.save("/tmp/cumulus-1024.png")
print("wrote /tmp/cumulus-1024.png", out.size)
