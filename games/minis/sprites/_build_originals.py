# -*- coding: utf-8 -*-
"""
Extract ORIGINAL-looking character / enemy / tile frames from downloaded
sprite sheets into sprites/*.png used by mario.html themes.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import urllib.request

ROOT = Path(__file__).resolve().parent
DL = ROOT / "_dl"
OUT = ROOT
DL.mkdir(parents=True, exist_ok=True)

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def dl(name, url):
    out = DL / name
    if out.exists() and out.stat().st_size > 1000:
        return out
    try:
        req = urllib.request.Request(url, headers=UA)
        data = urllib.request.urlopen(req, timeout=30).read()
        out.write_bytes(data)
        print("DL", name, len(data))
        return out
    except Exception as e:
        print("DL FAIL", name, e)
        return out if out.exists() else None


def load(p):
    return Image.open(p).convert("RGBA")


def is_bg(px, mode="auto"):
    r, g, b, a = px
    if a < 12:
        return True
    # magenta / pure blue sheet bg
    if b > 200 and b > r + 40 and b > g + 40:
        return True
    if r > 200 and b > 200 and g < 80:  # magenta
        return True
    # near-white paper
    if r > 245 and g > 245 and b > 245:
        return True
    # dark grid lines sometimes
    return False


def strip_bg(im, bg_fn=is_bg):
    im = im.copy().convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if bg_fn(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return im


def bbox_crop(im, pad=1):
    bb = im.getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def scale_min(im, min_side=96):
    im = bbox_crop(im)
    w, h = im.size
    if max(w, h) < min_side:
        s = max(2, (min_side + max(w, h) - 1) // max(w, h))
        im = im.resize((w * s, h * s), Image.NEAREST)
    return im


def save(im, name, min_side=96):
    im = scale_min(im, min_side)
    path = OUT / name
    im.save(path, optimize=True)
    print("SAVE", name, im.size, path.stat().st_size)
    return path


def find_blobs(im, min_area=80, max_area=80000):
    """Connected components of non-transparent pixels."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    blobs = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or px[x, y][3] < 20:
                continue
            # BFS
            stack = [(x, y)]
            seen[y][x] = True
            cells = []
            minx = maxx = x
            miny = maxy = y
            while stack:
                cx, cy = stack.pop()
                cells.append((cx, cy))
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] >= 20:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            area = (maxx - minx + 1) * (maxy - miny + 1)
            if min_area <= area <= max_area and len(cells) >= min_area // 4:
                blobs.append((minx, miny, maxx + 1, maxy + 1, len(cells)))
    blobs.sort(key=lambda b: (b[1], b[0]))  # top-to-bottom, left-to-right
    return blobs


def crop_blob(im, blob, pad=1):
    x0, y0, x1, y1, _ = blob
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def extract_top_left_frames(im, count=4, row_h_guess=None):
    """After bg strip, take largest blobs near top as frames."""
    im2 = strip_bg(im)
    blobs = find_blobs(im2, min_area=120)
    # prefer blobs in upper half
    upper = [b for b in blobs if b[1] < im2.height * 0.45]
    if not upper:
        upper = blobs[:count]
    # sort by size desc then left
    upper.sort(key=lambda b: (-b[4], b[0], b[1]))
    frames = []
    used = []
    for b in upper:
        # skip overlapping with already taken
        ox0, oy0, ox1, oy1, _ = b
        overlap = False
        for u in used:
            ux0, uy0, ux1, uy1, _ = u
            if not (ox1 <= ux0 or ox0 >= ux1 or oy1 <= uy0 or oy0 >= uy1):
                overlap = True
                break
        if overlap:
            continue
        used.append(b)
        frames.append(crop_blob(im2, b))
        if len(frames) >= count:
            break
    return frames


def tile_from_region(im, box, size=40):
    im = strip_bg(im)
    crop = im.crop(box)
    crop = bbox_crop(crop)
    if crop.width < 2:
        return None
    return crop.resize((size, size), Image.NEAREST)


def make_placeholder_tile(kind, theme):
    """Fallback colored tiles if sheet crop fails."""
    im = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pal = {
        "smw": {"ground": (180, 100, 40), "brick": (200, 80, 40), "question": (240, 180, 30), "pipe": (40, 180, 40), "coin": (255, 210, 40)},
        "sm64": {"ground": (120, 180, 70), "brick": (200, 120, 60), "question": (255, 200, 40), "pipe": (30, 160, 40), "coin": (255, 220, 50)},
        "smb2": {"ground": (160, 120, 70), "brick": (190, 90, 50), "question": (240, 160, 50), "pipe": (50, 160, 50), "coin": (255, 200, 40)},
        "smb3": {"ground": (170, 110, 50), "brick": (210, 100, 50), "question": (250, 190, 30), "pipe": (40, 170, 50), "coin": (255, 215, 40)},
    }[theme]
    c = pal.get(kind, (120, 120, 120))
    if kind == "coin":
        d.ellipse((6, 4, 34, 36), fill=c, outline=(120, 80, 10))
    elif kind == "pipe":
        d.rectangle((8, 0, 32, 40), fill=c, outline=(20, 80, 20))
        d.rectangle((4, 0, 36, 10), fill=tuple(min(255, x + 30) for x in c))
    elif kind == "question":
        d.rectangle((2, 2, 38, 38), fill=c, outline=(80, 50, 0), width=2)
        d.text((12, 8), "?", fill=(80, 40, 0))
    else:
        d.rectangle((0, 0, 39, 39), fill=c, outline=tuple(max(0, x - 40) for x in c))
        if kind == "brick":
            d.line((0, 20, 40, 20), fill=(60, 30, 10))
            d.line((20, 0, 20, 20), fill=(60, 30, 10))
            d.line((10, 20, 10, 40), fill=(60, 30, 10))
            d.line((30, 20, 30, 40), fill=(60, 30, 10))
    return im


def build_smw():
    print("\n=== SMW ===")
    mario_p = DL / "smw_mario.png"
    luigi_p = DL / "smw_luigi.png"
    bow_p = DL / "smw_bowser.png"
    en_p = DL / "smw_enemies.png"
    tiles_p = DL / "smw_tiles.png"
    tsr = DL / "tsr_smw_mario.png"

    # Mario standing - prefer top-left large frame from sheet
    if mario_p.exists():
        frames = extract_top_left_frames(load(mario_p), 6)
        if frames:
            # pick tallest "standing-like"
            frames.sort(key=lambda f: -f.height)
            save(frames[0], "smw_mario.png", 120)
    if luigi_p.exists():
        frames = extract_top_left_frames(load(luigi_p), 6)
        if frames:
            frames.sort(key=lambda f: -f.height)
            save(frames[0], "smw_luigi.png", 120)
    if bow_p.exists():
        frames = extract_top_left_frames(load(bow_p), 4)
        if frames:
            frames.sort(key=lambda f: -f.width * f.height)
            save(frames[0], "smw_bowser.png", 140)

    # Enemies sheet
    if en_p.exists():
        im = strip_bg(load(en_p))
        blobs = find_blobs(im, min_area=60, max_area=20000)
        # goombas are small brown blobs near top; take first reasonable
        candidates = []
        for b in blobs:
            crop = crop_blob(im, b)
            # average color
            px = list(crop.getdata())
            opaque = [p for p in px if p[3] > 20]
            if not opaque:
                continue
            ar = sum(p[0] for p in opaque) / len(opaque)
            ag = sum(p[1] for p in opaque) / len(opaque)
            ab = sum(p[2] for p in opaque) / len(opaque)
            candidates.append((b, crop, ar, ag, ab, crop.width * crop.height))
        # goomba-like: brown
        gooms = [c for c in candidates if c[2] > 100 and c[2] > c[3] and c[2] > c[4] and 200 < c[5] < 8000]
        gooms.sort(key=lambda c: (c[0][1], c[0][0]))
        if gooms:
            save(gooms[0][1], "smw_goomba.png", 80)
        # koopa-like: greenish
        koops = [c for c in candidates if c[3] > c[2] and c[3] > 80 and 300 < c[5] < 12000]
        koops.sort(key=lambda c: (c[0][1], c[0][0]))
        if koops:
            save(koops[0][1], "smw_koopa.png", 90)

    # Tiles
    if tiles_p.exists():
        tim = load(tiles_p)
        # heuristic crops from SMW tiles sheet - ground often top-leftish
        w, h = tim.size
        samples = {
            "ground": (0, 0, min(64, w), min(64, h)),
            "brick": (min(64, w // 4), 0, min(128, w // 2), min(64, h)),
            "question": (min(128, w // 3), 0, min(192, w // 2), min(64, h)),
            "pipe": (0, min(h // 3, 200), min(64, w), min(h // 3 + 80, h)),
            "coin": (min(w // 2, 200), 0, min(w // 2 + 32, w), min(40, h)),
        }
        for kind, box in samples.items():
            t = tile_from_region(tim, box)
            if t:
                save(t, f"smw_{kind}.png", 40)
            else:
                save(make_placeholder_tile(kind, "smw"), f"smw_{kind}.png", 40)
    else:
        for kind in ("ground", "brick", "question", "pipe", "coin"):
            save(make_placeholder_tile(kind, "smw"), f"smw_{kind}.png", 40)


def build_smb2():
    print("\n=== SMB2 ===")
    # Official-style full arts already good size
    for src, dst, ms in [
        ("smb2_mario.png", "smb2_mario.png", 140),
        ("smb2_luigi.png", "smb2_luigi.png", 140),
        ("tsr_smb2_mario.png", "smb2_mario.png", 140),
    ]:
        p = DL / src
        if not p.exists():
            continue
        im = strip_bg(load(p))
        # for large portrait sheets, take main character blob
        frames = extract_top_left_frames(im, 3)
        if frames:
            frames.sort(key=lambda f: -f.width * f.height)
            save(frames[0], dst, ms)
            if "mario" in dst:
                break

    # heroes sheet for smaller game sprites
    heroes = DL / "smb2_heroes.png"
    if heroes.exists():
        im = strip_bg(load(heroes))
        blobs = find_blobs(im, min_area=80)
        if blobs:
            # first two tall characters often mario/luigi
            tall = sorted(blobs, key=lambda b: -(b[3] - b[1]))[:6]
            if len(tall) >= 1:
                save(crop_blob(im, tall[0]), "smb2_mario.png", 110)
            if len(tall) >= 2:
                save(crop_blob(im, tall[1]), "smb2_luigi.png", 110)

    en = DL / "smb2_enemies.png"
    if en.exists():
        im = strip_bg(load(en))
        blobs = find_blobs(im, min_area=40, max_area=5000)
        # shy guy pink at top-left typically
        if blobs:
            save(crop_blob(im, blobs[0]), "smb2_goomba.png", 80)
        if len(blobs) > 8:
            save(crop_blob(im, blobs[8]), "smb2_koopa.png", 80)
        elif len(blobs) > 1:
            save(crop_blob(im, blobs[1]), "smb2_koopa.png", 80)

    tiles = DL / "smb2_tiles.png"
    if tiles.exists():
        tim = load(tiles)
        w, h = tim.size
        for kind, box in {
            "ground": (0, 0, min(48, w), min(48, h)),
            "brick": (min(48, w // 3), 0, min(96, w // 2), min(48, h)),
            "question": (min(96, w // 2), 0, min(144, w), min(48, h)),
            "pipe": (0, min(h // 2, 80), min(48, w), min(h // 2 + 64, h)),
            "coin": (min(w - 32, w // 2), min(h // 3, 60), min(w, w // 2 + 32), min(h // 3 + 40, h)),
        }.items():
            t = tile_from_region(tim, box)
            save(t if t else make_placeholder_tile(kind, "smb2"), f"smb2_{kind}.png", 40)
    else:
        for kind in ("ground", "brick", "question", "pipe", "coin"):
            save(make_placeholder_tile(kind, "smb2"), f"smb2_{kind}.png", 40)


def build_sm64():
    print("\n=== SM64 ===")
    # Prefer cleaned extracted heads/bodies we already made
    for src, dst in [
        ("extracted/final_sm64_mario.png", "sm64_mario.png"),
        ("extracted/sm64_mario_clean.png", "sm64_mario.png"),
        ("extracted/final_sm64_luigi.png", "sm64_luigi.png"),
        ("extracted/sm64_luigi_clean.png", "sm64_luigi.png"),
    ]:
        p = DL / src
        if p.exists():
            save(strip_bg(load(p)), dst, 120)

    # icons sheet may have small 3D icons
    icons = DL / "sm64_icons.png"
    if icons.exists() and not (OUT / "sm64_mario.png").exists():
        im = strip_bg(load(icons))
        frames = extract_top_left_frames(im, 8)
        if frames:
            frames.sort(key=lambda f: -f.width * f.height)
            save(frames[0], "sm64_mario.png", 100)
            if len(frames) > 1:
                save(frames[1], "sm64_luigi.png", 100)

    wanted = DL / "sm64ds_wanted.png"
    if wanted.exists():
        im = strip_bg(load(wanted))
        frames = extract_top_left_frames(im, 10)
        # use as goomba-ish mid size sprites
        if frames:
            frames.sort(key=lambda f: -f.width * f.height)
            # keep mario if better
            if frames[0].width * frames[0].height > 2000:
                # don't overwrite good mario unless missing
                if not (OUT / "sm64_mario.png").exists():
                    save(frames[0], "sm64_mario.png", 120)
            if len(frames) > 2:
                save(frames[2], "sm64_goomba.png", 80)
            if len(frames) > 3:
                save(frames[3], "sm64_koopa.png", 90)

    # ensure goomba/koopa exist - if still drawn tiny, regenerate nicer from palette
    for name, gen in [
        ("sm64_goomba.png", lambda: _paint_sm64_goomba()),
        ("sm64_koopa.png", lambda: _paint_sm64_koopa()),
    ]:
        p = OUT / name
        if not p.exists() or p.stat().st_size < 500:
            save(gen(), name, 80)

    for kind in ("ground", "brick", "question", "pipe", "coin"):
        save(make_placeholder_tile(kind, "sm64"), f"sm64_{kind}.png", 40)


def _paint_sm64_goomba():
    im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((8, 14, 56, 52), fill=(150, 85, 40, 255), outline=(90, 50, 20, 255), width=2)
    d.ellipse((20, 34, 44, 50), fill=(220, 180, 140, 255))
    d.ellipse((18, 22, 30, 36), fill=(255, 255, 255, 255))
    d.ellipse((34, 22, 46, 36), fill=(255, 255, 255, 255))
    d.ellipse((22, 26, 28, 34), fill=(20, 20, 20, 255))
    d.ellipse((38, 26, 44, 34), fill=(20, 20, 20, 255))
    d.ellipse((12, 48, 28, 60), fill=(100, 55, 25, 255))
    d.ellipse((36, 48, 52, 60), fill=(100, 55, 25, 255))
    return im


def _paint_sm64_koopa():
    im = Image.new("RGBA", (64, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((10, 22, 54, 58), fill=(50, 170, 50, 255), outline=(20, 100, 20, 255), width=2)
    d.ellipse((38, 8, 58, 28), fill=(255, 220, 100, 255), outline=(180, 140, 40, 255), width=2)
    d.ellipse((48, 14, 54, 20), fill=(20, 20, 20, 255))
    d.ellipse((14, 54, 28, 68), fill=(255, 220, 100, 255))
    d.ellipse((36, 54, 50, 68), fill=(255, 220, 100, 255))
    return im


def build_smb3():
    print("\n=== SMB3 ===")
    mario_p = DL / "smb3_mario.png"
    en_p = DL / "smb3_enemies.png"
    if mario_p.exists():
        im = strip_bg(load(mario_p))
        frames = extract_top_left_frames(im, 8)
        if frames:
            frames.sort(key=lambda f: -f.height)
            save(frames[0], "smb3_mario.png", 120)
            # second as luigi-ish if looks greenish else same sheet walk frame
            if len(frames) > 3:
                save(frames[3], "smb3_luigi.png", 120)
            else:
                save(frames[0], "smb3_luigi.png", 120)

    if en_p.exists():
        im = strip_bg(load(en_p))
        blobs = find_blobs(im, min_area=50, max_area=15000)
        if blobs:
            save(crop_blob(im, blobs[0]), "smb3_goomba.png", 80)
        if len(blobs) > 5:
            save(crop_blob(im, blobs[5]), "smb3_koopa.png", 90)
        elif len(blobs) > 1:
            save(crop_blob(im, blobs[1]), "smb3_koopa.png", 90)

    # reuse bowser from smw if no smb3 bowser
    if (OUT / "smw_bowser.png").exists():
        save(load(OUT / "smw_bowser.png"), "smb3_bowser.png", 140)

    for kind in ("ground", "brick", "question", "pipe", "coin"):
        save(make_placeholder_tile(kind, "smb3"), f"smb3_{kind}.png", 40)


def ensure_downloads():
    urls = {
        "smw_mario.png": "https://www.mariouniverse.com/wp-content/img/sprites/snes/smw/mario.png",
        "smw_luigi.png": "https://www.mariouniverse.com/wp-content/img/sprites/snes/smw/luigi.png",
        "smw_enemies.png": "https://www.mariouniverse.com/wp-content/img/sprites/snes/smw/enemies.png",
        "smw_tiles.png": "https://www.mariouniverse.com/wp-content/img/sprites/snes/smw/tiles.png",
        "smw_bowser.png": "https://www.mariouniverse.com/wp-content/img/sprites/snes/smw/bowser.png",
        "smb3_mario.png": "https://www.mariouniverse.com/wp-content/img/sprites/nes/smb3/mario.png",
        "smb3_enemies.png": "https://www.mariouniverse.com/wp-content/img/sprites/nes/smb3/enemies.png",
        "smb2_mario.png": "https://www.mariouniverse.com/wp-content/img/sprites/nes/smb2/mario.png",
        "smb2_luigi.png": "https://www.mariouniverse.com/wp-content/img/sprites/nes/smb2/luigi.png",
        "smb2_enemies.png": "https://www.mariouniverse.com/wp-content/img/sprites/nes/smb2/enemies.png",
        "smb2_tiles.png": "https://www.mariouniverse.com/wp-content/img/sprites/nes/smb2/tiles.png",
        "smb2_heroes.png": "https://www.mariouniverse.com/wp-content/img/sprites/nes/smb2/heroes-2.png",
    }
    for n, u in urls.items():
        dl(n, u)


def main():
    ensure_downloads()
    build_smw()
    build_smb2()
    build_sm64()
    build_smb3()
    print("\nDONE originals")


if __name__ == "__main__":
    main()
