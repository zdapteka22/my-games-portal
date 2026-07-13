# -*- coding: utf-8 -*-
"""Extract standing character frames from SMW / SMB2 / SM64 sheets."""
from PIL import Image
import os
import math

base = r"C:\Users\Евгений\Desktop\my-games-portal\games\minis\sprites\_dl"
spr = r"C:\Users\Евгений\Desktop\my-games-portal\games\minis\sprites"
out_prev = os.path.join(base, "extracted")
os.makedirs(out_prev, exist_ok=True)


def is_bg(px, mode="blue"):
    r, g, b, a = px
    if a < 10:
        return True
    if mode == "blue":
        return b > 180 and b > r + 40 and b > g + 20 and r < 120
    if mode == "cyan":
        return g > 150 and b > 150 and r < 100
    if mode == "green":
        return g > 180 and r < 80 and b < 80
    if mode == "magenta":
        return r > 180 and b > 180 and g < 80
    return False


def extract_sprites(im, mode="blue", min_w=8, min_h=12, max_w=80, max_h=80):
    im = im.convert("RGBA")
    w, h = im.size
    pix = im.load()
    visited = [[False] * h for _ in range(w)]
    sprites = []
    for y in range(h):
        for x in range(w):
            if visited[x][y] or is_bg(pix[x, y], mode):
                visited[x][y] = True
                continue
            stack = [(x, y)]
            visited[x][y] = True
            cells = []
            minx = maxx = x
            miny = maxy = y
            while stack:
                cx, cy = stack.pop()
                cells.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                        visited[nx][ny] = True
                        if not is_bg(pix[nx, ny], mode):
                            stack.append((nx, ny))
                            minx = min(minx, nx)
                            maxx = max(maxx, nx)
                            miny = min(miny, ny)
                            maxy = max(maxy, ny)
            bw, bh = maxx - minx + 1, maxy - miny + 1
            if bw < min_w or bh < min_h or bw > max_w or bh > max_h:
                continue
            if len(cells) < 40:
                continue
            pad = 1
            x0 = max(0, minx - pad)
            y0 = max(0, miny - pad)
            x1 = min(w, maxx + 1 + pad)
            y1 = min(h, maxy + 1 + pad)
            crop = im.crop((x0, y0, x1, y1))
            cp = crop.load()
            for yy in range(crop.height):
                for xx in range(crop.width):
                    if is_bg(cp[xx, yy], mode):
                        cp[xx, yy] = (0, 0, 0, 0)
            sprites.append(
                {
                    "img": crop,
                    "x": minx,
                    "y": miny,
                    "w": bw,
                    "h": bh,
                    "area": len(cells),
                    "aspect": bh / max(bw, 1),
                }
            )
    return sprites


def pick_stand(sprites, prefer_h=None):
    cands = [s for s in sprites if 1.2 <= s["aspect"] <= 2.8 and s["w"] >= 12]
    if not cands:
        cands = list(sprites)

    def score(s):
        sc = s["area"] * 0.01 + s["aspect"] * 50 - s["y"] * 0.05 - s["x"] * 0.02
        if prefer_h and abs(s["h"] - prefer_h) < 4:
            sc += 100
        if 14 <= s["w"] <= 24 and 28 <= s["h"] <= 40:
            sc += 200
        if 14 <= s["w"] <= 20 and 24 <= s["h"] <= 36:
            sc += 150
        # front-ish: not too wide (walk frames)
        if s["w"] <= 18:
            sc += 40
        return sc

    cands.sort(key=score, reverse=True)
    return cands


def save_scaled(im, path, target_h=64):
    scale = max(1, math.ceil(target_h / max(im.height, 1)))
    out = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    out.save(path)
    print("  saved", path, out.size, "bytes", os.path.getsize(path))
    return out


def process_sheet(name, filename, mode, min_h=20, max_h=48, prefer_h=32):
    path = os.path.join(base, filename)
    im = Image.open(path)
    print(f"\n=== {name} ({im.size}) ===")
    sp = extract_sprites(im, mode, min_w=10, min_h=min_h, max_w=48, max_h=max_h)
    stands = pick_stand(sp, prefer_h=prefer_h)
    print(f"  found {len(sp)} sprites, top stands:")
    for s in stands[:8]:
        print(
            f"    x={s['x']} y={s['y']} {s['w']}x{s['h']} "
            f"aspect={s['aspect']:.2f} area={s['area']}"
        )
    if stands:
        save_scaled(stands[0]["img"], os.path.join(out_prev, f"{name}_stand.png"), 64)
        for i, s in enumerate(stands[:6]):
            save_scaled(s["img"], os.path.join(out_prev, f"{name}_c{i}.png"), 64)
    return stands


process_sheet("smw_mario", "smw_mario.png", "blue")
process_sheet("smw_luigi", "smw_luigi.png", "blue")
process_sheet("smb2_mario", "smb2_mario.png", "cyan", min_h=20, max_h=50, prefer_h=32)
process_sheet("smb2_luigi", "smb2_luigi.png", "cyan", min_h=20, max_h=50, prefer_h=32)

# Bowser SMW — larger frames
print("\n=== smw_bowser ===")
smw_b = Image.open(os.path.join(base, "smw_bowser.png"))
sp = extract_sprites(smw_b, "blue", min_w=20, min_h=20, max_w=130, max_h=130)
sp.sort(key=lambda s: s["area"], reverse=True)
print(f"  found {len(sp)}")
for s in sp[:6]:
    print(f"    x={s['x']} y={s['y']} {s['w']}x{s['h']}")
if sp:
    save_scaled(sp[0]["img"], os.path.join(out_prev, "smw_bowser_stand.png"), 96)

# SM64 wanted poster heads
print("\n=== sm64 wanted heads ===")
wanted = Image.open(os.path.join(base, "sm64ds_wanted.png")).convert("RGBA")
print("  wanted size", wanted.size)
# Heads row roughly: big portraits near bottom
# Inspect: 448x339 — LEVEL bar ~ y 220-250, big heads ~ y 250-310, x starts ~10
# Try fixed crops after visual: Luigi, Mario, Yoshi, Wario
# Save crops of bottom area for manual verify
bottom = wanted.crop((0, 220, 220, 339))
bottom.save(os.path.join(out_prev, "sm64_heads_region.png"))
print("  saved heads region")

# Also try fixed grid crops (common for this sheet)
# From image description: 4 big heads in a row under LEVEL
# Approximate from 448 width: each head ~48-55px
candidates = [
    ("sm64_luigi_head", (8, 248, 60, 318)),
    ("sm64_mario_head", (60, 248, 112, 318)),
    ("sm64_yoshi_head", (112, 248, 164, 318)),
    ("sm64_wario_head", (164, 248, 220, 318)),
]
for name, box in candidates:
    c = wanted.crop(box)
    c.save(os.path.join(out_prev, f"{name}.png"))
    print("  crop", name, box, c.size)

# Bigger alternate crops
for name, box in [
    ("sm64_luigi_h2", (5, 245, 65, 320)),
    ("sm64_mario_h2", (55, 245, 115, 320)),
]:
    wanted.crop(box).save(os.path.join(out_prev, f"{name}.png"))

print("\nDONE")
