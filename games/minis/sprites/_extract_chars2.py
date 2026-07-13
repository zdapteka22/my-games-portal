# -*- coding: utf-8 -*-
"""Manual crop + finalize character arts for Mario themes."""
from PIL import Image
import os
import math

base = r"C:\Users\Евгений\Desktop\my-games-portal\games\minis\sprites\_dl"
spr = r"C:\Users\Евгений\Desktop\my-games-portal\games\minis\sprites"
ex = os.path.join(base, "extracted")
os.makedirs(ex, exist_ok=True)


def make_transparent(im, mode="blue"):
    im = im.convert("RGBA")
    pix = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pix[x, y]
            kill = False
            if mode == "blue":
                kill = b > 160 and b > r + 30 and b > g + 15 and r < 140
            elif mode == "cyan":
                kill = g > 140 and b > 140 and r < 120
            elif mode == "magenta":
                kill = r > 180 and b > 180 and g < 100
            elif mode == "black":
                kill = r < 25 and g < 25 and b < 25
            elif mode == "dark":
                kill = r < 40 and g < 40 and b < 40
            if kill:
                pix[x, y] = (0, 0, 0, 0)
    return im


def trim(im, pad=1):
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def upscale(im, target_h=96):
    scale = max(1, math.ceil(target_h / max(im.height, 1)))
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


def save(im, name, target_h=96):
    out = upscale(im, target_h)
    path = os.path.join(spr, name)
    out.save(path)
    print("OK", name, out.size, os.path.getsize(path), "bytes")
    # preview
    out.save(os.path.join(ex, "final_" + name))
    return out


# ── SMW: known good stand frames ──────────────────────────
smw_m = Image.open(os.path.join(base, "smw_mario.png")).convert("RGBA")
# small Mario standing facing right ~ x=8 y=115 16x29
smw_mario = make_transparent(smw_m.crop((6, 113, 26, 146)), "blue")
smw_mario = trim(smw_mario)
save(smw_mario, "smw_mario.png", 96)

smw_l = Image.open(os.path.join(base, "smw_luigi.png")).convert("RGBA")
# standing Luigi facing ~ x=27 y=116 16x30
smw_luigi = make_transparent(smw_l.crop((25, 114, 45, 148)), "blue")
smw_luigi = trim(smw_luigi)
save(smw_luigi, "smw_luigi.png", 96)

# Bowser in clown car - good frame
smw_b = Image.open(os.path.join(base, "smw_bowser.png")).convert("RGBA")
bow = make_transparent(smw_b.crop((158, 0, 226, 98)), "blue")
bow = trim(bow)
save(bow, "smw_bowser.png", 128)

# ── SMB2: grid-based (16x24-ish cells, cyan bg, magenta grid) ──
# Sheet has header ~ y 0-48, then cells. Looking at preview:
# First row stand: Mario arms down ~ after header
# Let's probe cyan color and find first solid sprite


def sample_bg(im, x, y):
    return im.getpixel((x, y))[:3]


for fname in ("smb2_mario.png", "smb2_luigi.png"):
    im = Image.open(os.path.join(base, fname)).convert("RGBA")
    print(fname, "size", im.size, "tl", im.getpixel((2, 50)), "mid", im.getpixel((30, 80)))

# Manual: from tl preview, sprites start around y=50-60
# Cell size roughly: looking at magenta lines, ~48x? No - NES is 16x24 but sheet may be 2x or more
# Sheet 645x618 - many frames. Header text ends ~y=45
# From TL image (200px of sheet * 3 = 600 preview), first sprite row starts after header.

smb2_m = Image.open(os.path.join(base, "smb2_mario.png")).convert("RGBA")
# Try several candidate stand crops and save all for pick
cands = []
# Scan first non-cyan blob near top-left after header
w, h = smb2_m.size
pix = smb2_m.load()


def is_cyan_px(p):
    r, g, b, a = p
    return g > 130 and b > 130 and r < 130


def is_mag_px(p):
    r, g, b, a = p
    return r > 200 and b > 200 and g < 120


# Flood-find sprites ignoring cyan AND magenta grid
visited = set()
blobs = []
for y in range(50, min(h, 200)):
    for x in range(0, min(w, 400)):
        if (x, y) in visited:
            continue
        p = pix[x, y]
        if is_cyan_px(p) or is_mag_px(p) or p[3] < 10:
            visited.add((x, y))
            continue
        # flood
        stack = [(x, y)]
        visited.add((x, y))
        cells = []
        minx = maxx = x
        miny = maxy = y
        while stack:
            cx, cy = stack.pop()
            cells.append((cx, cy))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = cx + dx, cy + dy
                if not (0 <= nx < w and 0 <= ny < h):
                    continue
                if (nx, ny) in visited:
                    continue
                visited.add((nx, ny))
                np = pix[nx, ny]
                if is_cyan_px(np) or is_mag_px(np) or np[3] < 10:
                    continue
                stack.append((nx, ny))
                minx = min(minx, nx)
                maxx = max(maxx, nx)
                miny = min(miny, ny)
                maxy = max(maxy, ny)
        bw, bh = maxx - minx + 1, maxy - miny + 1
        if 12 <= bw <= 28 and 18 <= bh <= 40 and len(cells) > 80:
            blobs.append((minx, miny, maxx, maxy, len(cells), bh / bw))

print(f"SMB2 Mario blobs near top: {len(blobs)}")
blobs.sort(key=lambda b: (b[1], b[0]))  # top-left first
for b in blobs[:12]:
    print(" ", b)

if blobs:
    # pick best stand: tall aspect, early, decent area
    def score(b):
        minx, miny, maxx, maxy, area, aspect = b
        sc = area + aspect * 100 - miny * 2 - minx * 0.5
        if 1.3 <= aspect <= 2.2:
            sc += 80
        return sc

    blobs_scored = sorted(blobs, key=score, reverse=True)
    for i, b in enumerate(blobs_scored[:6]):
        minx, miny, maxx, maxy, area, aspect = b
        crop = smb2_m.crop((minx - 1, miny - 1, maxx + 2, maxy + 2))
        crop = make_transparent(crop, "cyan")
        # also kill leftover magenta
        pp = crop.load()
        for yy in range(crop.height):
            for xx in range(crop.width):
                r, g, b2, a = pp[xx, yy]
                if r > 200 and b2 > 200 and g < 120:
                    pp[xx, yy] = (0, 0, 0, 0)
        crop = trim(crop)
        crop.save(os.path.join(ex, f"smb2_mario_blob{i}.png"))
        print(f"  cand {i}", crop.size, "at", minx, miny)
    # best
    b = blobs_scored[0]
    minx, miny, maxx, maxy = b[0], b[1], b[2], b[3]
    crop = smb2_m.crop((minx - 1, miny - 1, maxx + 2, maxy + 2))
    crop = make_transparent(crop, "cyan")
    pp = crop.load()
    for yy in range(crop.height):
        for xx in range(crop.width):
            r, g, b2, a = pp[xx, yy]
            if r > 200 and b2 > 200 and g < 120:
                pp[xx, yy] = (0, 0, 0, 0)
    crop = trim(crop)
    save(crop, "smb2_mario.png", 96)

# Same for Luigi
smb2_l = Image.open(os.path.join(base, "smb2_luigi.png")).convert("RGBA")
w, h = smb2_l.size
pix = smb2_l.load()
visited = set()
blobs = []
for y in range(50, min(h, 200)):
    for x in range(0, min(w, 400)):
        if (x, y) in visited:
            continue
        p = pix[x, y]
        if is_cyan_px(p) or is_mag_px(p) or p[3] < 10:
            visited.add((x, y))
            continue
        stack = [(x, y)]
        visited.add((x, y))
        cells = []
        minx = maxx = x
        miny = maxy = y
        while stack:
            cx, cy = stack.pop()
            cells.append((cx, cy))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = cx + dx, cy + dy
                if not (0 <= nx < w and 0 <= ny < h):
                    continue
                if (nx, ny) in visited:
                    continue
                visited.add((nx, ny))
                np = pix[nx, ny]
                if is_cyan_px(np) or is_mag_px(np) or np[3] < 10:
                    continue
                stack.append((nx, ny))
                minx = min(minx, nx)
                maxx = max(maxx, nx)
                miny = min(miny, ny)
                maxy = max(maxy, ny)
        bw, bh = maxx - minx + 1, maxy - miny + 1
        if 12 <= bw <= 28 and 18 <= bh <= 40 and len(cells) > 80:
            blobs.append((minx, miny, maxx, maxy, len(cells), bh / bw))

print(f"SMB2 Luigi blobs: {len(blobs)}")


def score(b):
    minx, miny, maxx, maxy, area, aspect = b
    sc = area + aspect * 100 - miny * 2 - minx * 0.5
    if 1.3 <= aspect <= 2.2:
        sc += 80
    return sc


if blobs:
    blobs_scored = sorted(blobs, key=score, reverse=True)
    for i, b in enumerate(blobs_scored[:4]):
        minx, miny, maxx, maxy = b[0], b[1], b[2], b[3]
        crop = smb2_l.crop((minx - 1, miny - 1, maxx + 2, maxy + 2))
        crop = make_transparent(crop, "cyan")
        pp = crop.load()
        for yy in range(crop.height):
            for xx in range(crop.width):
                r, g, b2, a = pp[xx, yy]
                if r > 200 and b2 > 200 and g < 120:
                    pp[xx, yy] = (0, 0, 0, 0)
        crop = trim(crop)
        crop.save(os.path.join(ex, f"smb2_luigi_blob{i}.png"))
    b = blobs_scored[0]
    minx, miny, maxx, maxy = b[0], b[1], b[2], b[3]
    crop = smb2_l.crop((minx - 1, miny - 1, maxx + 2, maxy + 2))
    crop = make_transparent(crop, "cyan")
    pp = crop.load()
    for yy in range(crop.height):
        for xx in range(crop.width):
            r, g, b2, a = pp[xx, yy]
            if r > 200 and b2 > 200 and g < 120:
                pp[xx, yy] = (0, 0, 0, 0)
    crop = trim(crop)
    save(crop, "smb2_luigi.png", 96)

# ── SM64: clean big heads from wanted poster ──
wanted = Image.open(os.path.join(base, "sm64ds_wanted.png")).convert("RGBA")
# From heads_region image: big heads start just under LEVEL numbers
# Full sheet 448x339. Heads roughly:
# Looking at full wanted: dark panel with heads is lower-left
# LEVEL bar then heads. Approx y=255-318 for big heads
# x: Luigi ~8-58, Mario ~58-108, Yoshi ~108-158, Wario ~158-215

# Refine by scanning dark background row
heads_y0, heads_y1 = 252, 320
# Luigi full head
luigi_h = wanted.crop((6, heads_y0, 58, heads_y1))
mario_h = wanted.crop((56, heads_y0, 110, heads_y1))
# make dark bg transparent
luigi_h = make_transparent(luigi_h, "dark")
mario_h = make_transparent(mario_h, "dark")
luigi_h = trim(luigi_h, 0)
mario_h = trim(mario_h, 0)
luigi_h.save(os.path.join(ex, "sm64_luigi_clean.png"))
mario_h.save(os.path.join(ex, "sm64_mario_clean.png"))
print("SM64 heads", luigi_h.size, mario_h.size)

# For in-game use full head portraits scaled - good for character art
# Also try smaller icons row for more complete body-ish portraits
# small heads at y~318-339
small_l = make_transparent(wanted.crop((10, 318, 42, 338)), "dark")
small_m = make_transparent(wanted.crop((42, 318, 74, 338)), "dark")
small_l = trim(small_l)
small_m = trim(small_m)
small_l.save(os.path.join(ex, "sm64_luigi_small.png"))
small_m.save(os.path.join(ex, "sm64_mario_small.png"))

# Build SM64 character "art" cards: head + simple body silhouette in SM64 style colors
# Better: use the big clean heads as the character arts (user asked for arts)
save(upscale(mario_h, 96), "sm64_mario.png", 96)  # already sized-ish
save(upscale(luigi_h, 96), "sm64_luigi.png", 96)

# Also save bowser art if we have smw one as fallback for themes
print("\nAll character arts written to", spr)
