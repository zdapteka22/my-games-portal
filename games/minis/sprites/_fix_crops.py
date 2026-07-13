# -*- coding: utf-8 -*-
"""Precise crops from known sprite sheets + clean large arts."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
DL = ROOT / "_dl"
OUT = ROOT


def load(p):
    return Image.open(p).convert("RGBA")


def strip_color_key(im, keys=None, thr=45):
    """Remove blue/magenta/near-white backgrounds common on spriter sheets."""
    im = im.copy().convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            # pure-ish blue
            if b > 160 and b > r + 50 and b > g + 50:
                px[x, y] = (0, 0, 0, 0)
                continue
            # magenta
            if r > 180 and b > 180 and g < 100:
                px[x, y] = (0, 0, 0, 0)
                continue
            # black sheet bg
            if r < 12 and g < 12 and b < 12:
                px[x, y] = (0, 0, 0, 0)
                continue
            # gray preview bg
            if abs(r - g) < 8 and abs(g - b) < 8 and 40 < r < 90:
                px[x, y] = (0, 0, 0, 0)
                continue
    return im


def bbox(im, pad=2):
    bb = im.getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    return im.crop((
        max(0, x0 - pad), max(0, y0 - pad),
        min(im.width, x1 + pad), min(im.height, y1 + pad)
    ))


def scale_up(im, min_h=120):
    im = bbox(im)
    if im.height < min_h and im.height > 0:
        s = max(2, (min_h + im.height - 1) // im.height)
        im = im.resize((im.width * s, im.height * s), Image.NEAREST)
    return im


def save(im, name, min_h=100):
    im = scale_up(im, min_h)
    path = OUT / name
    im.save(path)
    print("OK", name, im.size, path.stat().st_size)
    return path


def grid_cell(im, cols, rows, col, row, margin=1):
    w, h = im.size
    cw, ch = w / cols, h / rows
    x0 = int(col * cw) + margin
    y0 = int(row * ch) + margin
    x1 = int((col + 1) * cw) - margin
    y1 = int((row + 1) * ch) - margin
    return im.crop((x0, y0, x1, y1))


def crop(im, box):
    return im.crop(box)


# ---------- SMW: sheet is vertical animation strips ----------
def do_smw():
    print("=== SMW precise ===")
    # Mario Universe SMW mario ~392x784 — small sprites stacked.
    # Typical cell ~16x32 or so; take first small frame then upscale hard.
    mp = DL / "smw_mario.png"
    if mp.exists():
        im = strip_color_key(load(mp))
        # crop top-left character frame region (common layout: frames ~16-32 wide)
        # Try several fixed crops and pick one with most opaque pixels + not huge stick
        candidates = []
        for box in [
            (0, 0, 48, 64),
            (0, 0, 32, 48),
            (0, 64, 48, 128),
            (48, 0, 96, 64),
            (0, 0, 64, 80),
            (0, 0, 80, 100),
        ]:
            if box[2] <= im.width and box[3] <= im.height:
                c = bbox(strip_color_key(crop(im, box)))
                if c.getbbox():
                    opaque = sum(1 for p in c.getdata() if p[3] > 20)
                    candidates.append((opaque, c.width * c.height, c))
        # prefer medium-sized with good opacity (avoid stick figures with low fill)
        candidates.sort(key=lambda t: (-t[0] / max(1, t[1]), -t[0]))
        if candidates:
            save(candidates[0][2], "smw_mario.png", 128)

    # Use TSR big sheet if available - often better
    tsr = DL / "tsr_smw_mario.png"
    if tsr.exists():
        im = strip_color_key(load(tsr))
        # top-left area often has small / big mario stand
        for box, name in [
            ((0, 0, 80, 100), "smw_mario.png"),
            ((0, 0, 120, 140), "smw_mario.png"),
            ((80, 0, 160, 100), "smw_mario_alt.png"),
        ]:
            if box[2] <= im.width and box[3] <= im.height:
                c = bbox(crop(im, box))
                if c.getbbox() and c.width > 8:
                    save(c, "smw_mario.png", 128)
                    break

    lp = DL / "smw_luigi.png"
    if lp.exists():
        im = strip_color_key(load(lp))
        for box in [(0, 0, 48, 64), (0, 0, 64, 80), (0, 0, 80, 100)]:
            if box[2] <= im.width and box[3] <= im.height:
                c = bbox(crop(im, box))
                if c.getbbox():
                    save(c, "smw_luigi.png", 128)
                    break

    bp = DL / "smw_bowser.png"
    if bp.exists():
        im = strip_color_key(load(bp))
        c = bbox(im)
        # if whole sheet, take upper portion
        if c.height > 250:
            c = bbox(crop(im, (0, 0, im.width, min(220, im.height))))
        save(c, "smw_bowser.png", 140)

    # Enemies: SMW enemies sheet 440x1348 — goomba early rows
    ep = DL / "smw_enemies.png"
    if ep.exists():
        im = strip_color_key(load(ep))
        # Try grid approx 16 cols for small sprites
        # manual top-left goomba-ish region
        for box, name, mh in [
            ((0, 0, 40, 40), "smw_goomba.png", 96),
            ((40, 0, 80, 40), "smw_goomba2.png", 96),
            ((0, 40, 48, 88), "smw_koopa.png", 100),
            ((48, 40, 96, 96), "smw_koopa.png", 100),
            ((0, 80, 48, 140), "smw_koopa.png", 100),
        ]:
            if box[2] <= im.width and box[3] <= im.height:
                c = bbox(crop(im, box))
                if c.getbbox() and c.width >= 8:
                    save(c, name, mh)

    # If goomba still looks wrong, paint classic SMW-style goomba from pixel pattern
    # (still "authentic style" 16-bit look)
    gpath = OUT / "smw_goomba.png"
    if gpath.stat().st_size < 600:
        save(pixel_smw_goomba(), "smw_goomba.png", 96)
    kpath = OUT / "smw_koopa.png"
    if not kpath.exists() or kpath.stat().st_size < 600:
        save(pixel_smw_koopa(), "smw_koopa.png", 100)

    tiles = DL / "smw_tiles.png"
    if tiles.exists():
        tim = strip_color_key(load(tiles))
        # known-ish regions
        crops = {
            "ground": (0, 0, 32, 32),
            "brick": (32, 0, 64, 32),
            "question": (64, 0, 96, 32),
            "coin": (96, 0, 128, 32),
            "pipe": (0, 64, 32, 112),
        }
        for k, box in crops.items():
            if box[2] <= tim.width and box[3] <= tim.height:
                c = crop(tim, box)
                if c.getbbox():
                    save(c.resize((40, 40), Image.NEAREST), f"smw_{k}.png", 40)


def pixel_smw_goomba():
    """Classic 16x16 SMW-style goomba (hand-made pixel, not blank)."""
    # simplified authentic palette
    rows = [
        "......####......",
        "....########....",
        "...##########...",
        "..###..##..###..",
        ".###.##..##.###.",
        ".##############.",
        ".##..######..##.",
        ".##..######..##.",
        "..############..",
        "...###....###...",
        "....##....##....",
        "...####..####...",
        "..######.#####..",
        ".###############",
        ".##..........##.",
        "................",
    ]
    pal = {".": (0, 0, 0, 0), "#": (172, 92, 36, 255)}
    im = Image.new("RGBA", (16, 16))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = pal[ch]
            # eyes
            if (x, y) in {(5, 3), (6, 3), (9, 3), (10, 3)}:
                c = (40, 24, 16, 255)
            if (x, y) in {(5, 4), (6, 4), (9, 4), (10, 4)}:
                c = (20, 12, 8, 255)
            px[x, y] = c
    return im.resize((64, 64), Image.NEAREST)


def pixel_smw_koopa():
    im = Image.new("RGBA", (16, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((1, 8, 14, 20), fill=(40, 160, 40, 255), outline=(20, 100, 20, 255))
    d.ellipse((9, 2, 15, 9), fill=(250, 210, 90, 255), outline=(180, 140, 40, 255))
    d.point((13, 5), fill=(20, 20, 20, 255))
    d.rectangle((3, 18, 6, 23), fill=(250, 210, 90, 255))
    d.rectangle((10, 18, 13, 23), fill=(250, 210, 90, 255))
    return im.resize((64, 96), Image.NEAREST)


# ---------- SMB2: use large character arts ----------
def do_smb2():
    print("=== SMB2 precise ===")
    # Large mario art 645x618 — full body
    for src, dst in [
        ("smb2_mario.png", "smb2_mario.png"),
        ("tsr_smb2_mario.png", "smb2_mario.png"),
    ]:
        p = DL / src
        if not p.exists():
            continue
        im = strip_color_key(load(p))
        c = bbox(im)
        # if still huge multi-sprite, take center-left body
        if c.width > 300 and c.height > 300:
            # try focus on upper-center character
            cx = im.width // 3
            box = (max(0, cx - 120), 40, min(im.width, cx + 120), min(im.height, 400))
            c2 = bbox(crop(im, box))
            if c2.getbbox() and c2.height > 80:
                c = c2
        save(c, dst, 160)
        break

    for src, dst in [
        ("smb2_luigi.png", "smb2_luigi.png"),
    ]:
        p = DL / src
        if p.exists():
            im = strip_color_key(load(p))
            c = bbox(im)
            if c.width > 300:
                cx = im.width // 3
                box = (max(0, cx - 120), 40, min(im.width, cx + 120), min(im.height, 400))
                c2 = bbox(crop(im, box))
                if c2.getbbox():
                    c = c2
            save(c, dst, 160)

    # heroes sheet small sprites
    heroes = DL / "smb2_heroes.png"
    if heroes.exists() and (not (OUT / "smb2_mario.png").exists() or (OUT / "smb2_mario.png").stat().st_size < 2000):
        im = strip_color_key(load(heroes))
        # first character cell
        save(bbox(grid_cell(im, 8, 6, 0, 0)), "smb2_mario.png", 120)
        save(bbox(grid_cell(im, 8, 6, 1, 0)), "smb2_luigi.png", 120)

    en = DL / "smb2_enemies.png"
    if en.exists():
        im = strip_color_key(load(en))
        # sheet ~16x17 cells of shyguys etc
        save(bbox(grid_cell(im, 16, 17, 0, 0)), "smb2_goomba.png", 96)  # shyguy
        save(bbox(grid_cell(im, 16, 17, 4, 0)), "smb2_koopa.png", 96)
        # better: row 0 col 0 pink shyguy is good goomba replacement for SMB2

    tiles = DL / "smb2_tiles.png"
    if tiles.exists():
        tim = strip_color_key(load(tiles))
        for k, box in {
            "ground": (0, 0, 32, 32),
            "brick": (32, 0, 64, 32),
            "question": (0, 32, 32, 64),
            "pipe": (64, 0, 96, 48),
            "coin": (96, 0, 120, 32),
        }.items():
            if box[2] <= tim.width and box[3] <= tim.height:
                save(crop(tim, box).resize((40, 40), Image.NEAREST), f"smb2_{k}.png", 40)


# ---------- SM64: use clean head crops we had; full body from wanted poster carefully ----------
def do_sm64():
    print("=== SM64 precise ===")
    # Prefer single clean heads already extracted
    for src, dst, mh in [
        ("extracted/sm64_mario_clean.png", "sm64_mario.png", 140),
        ("extracted/final_sm64_mario.png", "sm64_mario.png", 140),
        ("extracted/sm64_mario_h2.png", "sm64_mario.png", 140),
        ("extracted/sm64_luigi_clean.png", "sm64_luigi.png", 140),
        ("extracted/final_sm64_luigi.png", "sm64_luigi.png", 140),
    ]:
        p = DL / src
        if p.exists():
            save(strip_color_key(load(p)), dst, mh)

    # goomba: paint nice 64-style if missing
    save(paint64_goomba(), "sm64_goomba.png", 100)
    save(paint64_koopa(), "sm64_koopa.png", 100)

    # tiles simple grass/brick style for 64
    for kind, col in [
        ("ground", (102, 180, 70)),
        ("brick", (200, 120, 60)),
        ("question", (255, 200, 40)),
        ("pipe", (40, 160, 50)),
        ("coin", (255, 220, 50)),
    ]:
        im = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        if kind == "coin":
            d.ellipse((6, 6, 34, 34), fill=col, outline=(120, 80, 0), width=2)
        elif kind == "pipe":
            d.rectangle((10, 4, 30, 40), fill=col)
            d.rectangle((6, 0, 34, 12), fill=tuple(min(255, c + 40) for c in col))
        else:
            d.rounded_rectangle((1, 1, 38, 38), radius=6, fill=col, outline=tuple(max(0, c - 50) for c in col), width=2)
            if kind == "question":
                d.text((14, 8), "?", fill=(80, 40, 0))
        save(im, f"sm64_{kind}.png", 40)


def paint64_goomba():
    im = Image.new("RGBA", (80, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((10, 16, 70, 66), fill=(150, 85, 40), outline=(90, 50, 20), width=3)
    d.ellipse((24, 42, 56, 64), fill=(230, 190, 150))
    d.ellipse((20, 26, 38, 46), fill=(255, 255, 255))
    d.ellipse((42, 26, 60, 46), fill=(255, 255, 255))
    d.ellipse((26, 32, 34, 42), fill=(20, 20, 20))
    d.ellipse((48, 32, 56, 42), fill=(20, 20, 20))
    d.line((18, 26, 38, 22), fill=(40, 20, 10), width=3)
    d.line((42, 22, 62, 26), fill=(40, 20, 10), width=3)
    d.ellipse((14, 60, 34, 76), fill=(100, 55, 25))
    d.ellipse((46, 60, 66, 76), fill=(100, 55, 25))
    return im


def paint64_koopa():
    im = Image.new("RGBA", (80, 90), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((12, 28, 68, 74), fill=(50, 170, 50), outline=(20, 100, 20), width=3)
    d.ellipse((46, 8, 74, 36), fill=(255, 220, 100), outline=(180, 140, 40), width=2)
    d.ellipse((58, 16, 66, 24), fill=(20, 20, 20))
    d.ellipse((18, 68, 36, 86), fill=(255, 220, 100))
    d.ellipse((44, 68, 62, 86), fill=(255, 220, 100))
    return im


# ---------- SMB3 ----------
def do_smb3():
    print("=== SMB3 precise ===")
    mp = DL / "smb3_mario.png"
    if mp.exists():
        im = strip_color_key(load(mp))
        # NES SMB3 sheet is tall; first frames small mario walk ~16x24 cells
        # crop first row of small mario
        for box in [
            (0, 0, 24, 32),
            (0, 0, 32, 40),
            (24, 0, 48, 32),
            (0, 32, 24, 64),
            (0, 0, 48, 48),
        ]:
            if box[2] <= im.width and box[3] <= im.height:
                c = bbox(crop(im, box))
                if c.getbbox() and c.height >= 12:
                    save(c, "smb3_mario.png", 128)
                    break
        # raccoon / big further down - try mid sheet for variety luigi use green-ish frame
        for box in [(0, 200, 32, 240), (0, 400, 32, 440), (32, 0, 56, 32)]:
            if box[2] <= im.width and box[3] <= im.height:
                c = bbox(crop(im, box))
                if c.getbbox():
                    save(c, "smb3_luigi.png", 128)
                    break

    ep = DL / "smb3_enemies.png"
    if ep.exists():
        im = strip_color_key(load(ep))
        for box, name in [
            ((0, 0, 24, 24), "smb3_goomba.png"),
            ((24, 0, 48, 24), "smb3_goomba.png"),
            ((0, 24, 28, 56), "smb3_koopa.png"),
            ((48, 0, 80, 40), "smb3_koopa.png"),
        ]:
            if box[2] <= im.width and box[3] <= im.height:
                c = bbox(crop(im, box))
                if c.getbbox() and c.width >= 8:
                    save(c, name, 96)

    if (OUT / "smw_bowser.png").exists():
        save(load(OUT / "smw_bowser.png"), "smb3_bowser.png", 140)

    for kind, col in [
        ("ground", (170, 110, 50)),
        ("brick", (210, 100, 50)),
        ("question", (250, 190, 30)),
        ("pipe", (40, 170, 50)),
        ("coin", (255, 215, 40)),
    ]:
        im = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        if kind == "coin":
            d.ellipse((6, 6, 34, 34), fill=col, outline=(100, 60, 0), width=2)
        elif kind == "pipe":
            d.rectangle((10, 4, 30, 40), fill=col)
            d.rectangle((6, 0, 34, 12), fill=tuple(min(255, c + 30) for c in col))
        else:
            d.rectangle((0, 0, 39, 39), fill=col, outline=tuple(max(0, c - 40) for c in col))
            if kind == "brick":
                d.line((0, 20, 40, 20), fill=(80, 30, 10))
                d.line((20, 0, 20, 20), fill=(80, 30, 10))
            if kind == "question":
                d.text((14, 8), "?", fill=(80, 40, 0))
        save(im, f"smb3_{kind}.png", 40)


def main():
    do_smw()
    do_smb2()
    do_sm64()
    do_smb3()
    print("FIXED")


if __name__ == "__main__":
    main()
