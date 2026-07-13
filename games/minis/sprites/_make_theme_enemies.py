# -*- coding: utf-8 -*-
"""Extract / generate themed enemy sprites for Mario World / 64 / Bros 2."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
DL = ROOT / "_dl"
OUT = ROOT  # save next to other theme sprites


def is_blue_bg(px, thr=40):
    r, g, b, a = px
    if a < 10:
        return True
    # SMB2 sheet pure-ish blue background
    return b > 180 and b > r + thr and b > g + thr


def strip_bg(im, bg_fn):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if bg_fn(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return im


def crop_alpha_bbox(im, pad=1):
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


def extract_grid_cell(im, col, row, cols, rows, margin=0):
    w, h = im.size
    cw, ch = w // cols, h // rows
    x0 = col * cw + margin
    y0 = row * ch + margin
    x1 = (col + 1) * cw - margin
    y1 = (row + 1) * ch - margin
    return im.crop((x0, y0, x1, y1))


def save(im, name):
    path = OUT / name
    im = crop_alpha_bbox(im)
    # ensure not tiny for game readability — scale up small sprites
    if im.width < 24 or im.height < 24:
        s = max(2, 48 // max(im.width, 1))
        im = im.resize((im.width * s, im.height * s), Image.NEAREST)
    im.save(path)
    print("saved", path.name, im.size, path.stat().st_size)
    return path


def make_smw_goomba():
    """SMW-style brown goomba pixel art."""
    # 16x16 classic SMW-ish
    pixels = [
        "......####......",
        "....########....",
        "...##########...",
        "..############..",
        ".###..####..###.",
        ".##.##.##.##.##.",
        ".##############.",
        ".##############.",
        "..############..",
        "...##########...",
        "....##....##....",
        "...####..####...",
        "..######.#####..",
        ".###############",
        ".##..........##.",
        "................",
    ]
    colors = {
        ".": (0, 0, 0, 0),
        "#": (156, 84, 36, 255),
    }
    # eyes
    eyes = {(5, 4), (6, 4), (9, 4), (10, 4)}
    brow = {(5, 3), (6, 3), (9, 3), (10, 3)}
    feet = set()
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(pixels):
        for x, ch in enumerate(row):
            c = colors[ch]
            if (x, y) in eyes:
                c = (40, 24, 16, 255)
            if (x, y) in brow:
                c = (80, 40, 16, 255)
            if y >= 13 and ch == "#":
                c = (200, 120, 60, 255)
            px[x, y] = c
    return im.resize((48, 48), Image.NEAREST)


def make_smw_koopa():
    im = Image.new("RGBA", (16, 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # shell
    d.ellipse((2, 6, 14, 16), fill=(40, 160, 40, 255), outline=(20, 100, 20, 255))
    # head
    d.ellipse((9, 2, 15, 8), fill=(250, 210, 90, 255), outline=(180, 140, 40, 255))
    # eye
    d.point((13, 4), fill=(20, 20, 20, 255))
    # feet
    d.rectangle((3, 15, 6, 19), fill=(250, 210, 90, 255))
    d.rectangle((10, 15, 13, 19), fill=(250, 210, 90, 255))
    return im.resize((48, 60), Image.NEAREST)


def make_sm64_goomba():
    """Rounder '3D-ish' SM64 goomba."""
    im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # body
    d.ellipse((8, 14, 56, 52), fill=(150, 85, 40, 255), outline=(90, 50, 20, 255), width=2)
    # belly
    d.ellipse((20, 34, 44, 50), fill=(220, 180, 140, 255))
    # eyes
    d.ellipse((18, 22, 30, 36), fill=(255, 255, 255, 255))
    d.ellipse((34, 22, 46, 36), fill=(255, 255, 255, 255))
    d.ellipse((22, 26, 28, 34), fill=(20, 20, 20, 255))
    d.ellipse((38, 26, 44, 34), fill=(20, 20, 20, 255))
    # brows
    d.line((16, 22, 30, 20), fill=(40, 20, 10, 255), width=3)
    d.line((34, 20, 48, 22), fill=(40, 20, 10, 255), width=3)
    # feet
    d.ellipse((12, 48, 28, 60), fill=(100, 55, 25, 255))
    d.ellipse((36, 48, 52, 60), fill=(100, 55, 25, 255))
    return im


def make_sm64_koopa():
    im = Image.new("RGBA", (64, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((10, 22, 54, 58), fill=(50, 170, 50, 255), outline=(20, 100, 20, 255), width=2)
    d.ellipse((38, 8, 58, 28), fill=(255, 220, 100, 255), outline=(180, 140, 40, 255), width=2)
    d.ellipse((48, 14, 54, 20), fill=(20, 20, 20, 255))
    d.ellipse((14, 54, 28, 68), fill=(255, 220, 100, 255))
    d.ellipse((36, 54, 50, 68), fill=(255, 220, 100, 255))
    return im


def extract_smb2_enemies():
    sheet = Image.open(DL / "smb2_enemies.png").convert("RGBA")
    sheet = strip_bg(sheet, is_blue_bg)
    # sheet ~ 439x458, roughly 16 cols x 16 rows of ~27px? Looking at preview:
    # actually sprites look ~16-24px. Try 16x16 grid of cells.
    # Visual: top row has ~16 shyguy-like frames
    w, h = sheet.size
    # estimate cell from first row density
    cols, rows = 16, 17
    cw, ch = w / cols, h / rows

    def cell(c, r):
        x0, y0 = int(c * cw), int(r * ch)
        x1, y1 = int((c + 1) * cw), int((r + 1) * ch)
        return crop_alpha_bbox(sheet.crop((x0, y0, x1, y1)))

    # Row 0: pink shy guys (use as goomba for SMB2)
    shy = cell(0, 0)
    # Row 5ish: black ninji? row index 5 from preview = black blobs
    # Row with bob-omb-like ~ row 7
    # Snifit-ish brown ~ row 6 col 0
    snifit = cell(0, 6)
    # green phanto-like row 9
    # Try several candidates and pick largest non-empty
    candidates = []
    for r in range(0, 12):
        for c in range(0, 4):
            im = cell(c, r)
            if im.getbbox():
                candidates.append(((r, c), im, im.width * im.height))
    candidates.sort(key=lambda x: -x[2])
    print("top smb2 cells:", [(p, s) for p, _, s in candidates[:8]])

    # Prefer pink shyguy (top-left area)
    goomba = cell(0, 0)
    if not goomba.getbbox():
        goomba = candidates[0][1]
    koopa = cell(4, 0)  # often next enemy type
    if not koopa.getbbox():
        koopa = cell(0, 2)

    save(goomba.resize((max(48, goomba.width * 2), max(48, goomba.height * 2)), Image.NEAREST), "smb2_goomba.png")
    save(koopa.resize((max(48, koopa.width * 2), max(48, koopa.height * 2)), Image.NEAREST), "smb2_koopa.png")

    # also save a few more as optional
    for name, (c, r) in [("smb2_enemy_a.png", (0, 5)), ("smb2_enemy_b.png", (0, 7))]:
        im = cell(c, r)
        if im.getbbox():
            save(im.resize((48, 48), Image.NEAREST), name)


def main():
    save(make_smw_goomba(), "smw_goomba.png")
    save(make_smw_koopa(), "smw_koopa.png")
    save(make_sm64_goomba(), "sm64_goomba.png")
    save(make_sm64_koopa(), "sm64_koopa.png")
    if (DL / "smb2_enemies.png").exists():
        extract_smb2_enemies()
    else:
        print("no smb2_enemies sheet, generating placeholders")
        save(make_smw_goomba(), "smb2_goomba.png")
        save(make_smw_koopa(), "smb2_koopa.png")
    print("done")


if __name__ == "__main__":
    main()
