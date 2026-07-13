# -*- coding: utf-8 -*-
"""
Flood-fill remove bg + take first good character frame per sheet.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from collections import deque

ROOT = Path(__file__).resolve().parent
DL = ROOT / "_dl"
OUT = ROOT


def flood_clear(im, tol=35):
    """Flood-fill from corners, make matching bg transparent."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2)]
    # also sample a few more border points
    for x in range(0, w, max(1, w // 10)):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, max(1, h // 10)):
        seeds.append((0, y))
        seeds.append((w - 1, y))

    def close(a, b):
        return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol

    visited = [[False] * w for _ in range(h)]
    q = deque()
    for sx, sy in seeds:
        if 0 <= sx < w and 0 <= sy < h and not visited[sy][sx]:
            bg = px[sx, sy][:3]
            # only treat as bg if not already transparent-looking character colors
            q.append((sx, sy, bg))
            visited[sy][sx] = True

    while q:
        x, y, bg = q.popleft()
        r, g, b, a = px[x, y]
        if a < 5 or close((r, g, b), bg):
            px[x, y] = (0, 0, 0, 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                    nr, ng, nb, na = px[nx, ny]
                    if na < 5 or close((nr, ng, nb), bg):
                        visited[ny][nx] = True
                        q.append((nx, ny, bg))
                    else:
                        visited[ny][nx] = True  # border of character - stop
    return im


def bbox(im, pad=1):
    bb = im.getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def up(im, min_h=128):
    im = bbox(im)
    if im.height < min_h and im.height > 0:
        s = max(2, (min_h + im.height - 1) // im.height)
        im = im.resize((im.width * s, im.height * s), Image.NEAREST)
    return im


def save(im, name, min_h=128):
    im = up(im, min_h)
    p = OUT / name
    im.save(p)
    print(name, im.size, p.stat().st_size)
    return p


def components(im, min_a=80):
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    out = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or px[x, y][3] < 20:
                continue
            q = [(x, y)]
            seen[y][x] = True
            minx = maxx = x
            miny = maxy = y
            n = 0
            while q:
                cx, cy = q.pop()
                n += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] >= 20:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            area = (maxx - minx + 1) * (maxy - miny + 1)
            if n >= min_a and area < w * h * 0.5:
                out.append((minx, miny, maxx + 1, maxy + 1, n, area))
    # prefer character-like aspect (taller or square), medium size
    out.sort(key=lambda b: (-b[4], b[1], b[0]))
    return out


def best_char(im, prefer_top=True):
    im2 = flood_clear(im)
    comps = components(im2, min_a=60)
    if not comps:
        return bbox(im2)
    # score: opacity, height, not too wide sheet
    scored = []
    for b in comps:
        x0, y0, x1, y1, n, area = b
        h = y1 - y0
        w = x1 - x0
        if w < 6 or h < 8:
            continue
        if w > im2.width * 0.6:  # whole row
            continue
        aspect = h / max(1, w)
        score = n * (1.2 if aspect > 1.0 else 0.8)
        if prefer_top:
            score *= 1.0 + max(0, 1.0 - y0 / max(1, im2.height))
        # prefer classic sprite sizes
        if 12 <= w <= 80 and 16 <= h <= 120:
            score *= 2.5
        scored.append((score, b))
    if not scored:
        b = comps[0]
        return im2.crop((b[0], b[1], b[2], b[3]))
    scored.sort(key=lambda t: -t[0])
    b = scored[0][1]
    return im2.crop((b[0], b[1], b[2], b[3]))


def extract(src_name, out_name, min_h=128):
    p = DL / src_name
    if not p.exists():
        print("missing", src_name)
        return
    im = Image.open(p).convert("RGBA")
    char = best_char(im)
    save(char, out_name, min_h)


def pixel_goomba_smw():
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
    im = Image.new("RGBA", (16, 16))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = (0, 0, 0, 0) if ch == "." else (172, 92, 36, 255)
            if (x, y) in {(5, 3), (6, 3), (9, 3), (10, 3), (5, 4), (6, 4), (9, 4), (10, 4)}:
                c = (30, 18, 10, 255)
            px[x, y] = c
    return im.resize((64, 64), Image.NEAREST)


def pixel_shyguy():
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((2, 2, 13, 13), fill=(230, 60, 90, 255), outline=(120, 20, 40, 255))
    d.rectangle((3, 8, 12, 13), fill=(240, 240, 240, 255))
    d.ellipse((5, 6, 7, 8), fill=(20, 20, 20, 255))
    d.ellipse((9, 6, 11, 8), fill=(20, 20, 20, 255))
    return im.resize((64, 64), Image.NEAREST)


def pixel_smb3_goomba():
    # classic brown SMB3 goomba look
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((1, 3, 14, 13), fill=(160, 90, 40, 255), outline=(90, 40, 10, 255))
    d.rectangle((3, 6, 6, 9), fill=(250, 230, 180, 255))
    d.rectangle((9, 6, 12, 9), fill=(250, 230, 180, 255))
    d.rectangle((4, 7, 5, 8), fill=(20, 20, 20, 255))
    d.rectangle((10, 7, 11, 8), fill=(20, 20, 20, 255))
    d.rectangle((2, 12, 6, 15), fill=(100, 50, 20, 255))
    d.rectangle((9, 12, 13, 15), fill=(100, 50, 20, 255))
    return im.resize((64, 64), Image.NEAREST)


def main():
    # Characters from sheets
    extract("smw_mario.png", "smw_mario.png", 140)
    extract("tsr_smw_mario.png", "smw_mario.png", 140)
    extract("smw_luigi.png", "smw_luigi.png", 140)
    extract("smw_bowser.png", "smw_bowser.png", 160)

    extract("smb2_mario.png", "smb2_mario.png", 160)
    extract("smb2_luigi.png", "smb2_luigi.png", 160)
    extract("smb2_heroes.png", "smb2_mario.png", 140)
    extract("tsr_smb2_mario.png", "smb2_mario.png", 160)

    extract("smb3_mario.png", "smb3_mario.png", 140)
    # luigi for smb3: recolor mario green hat (simple) if no luigi sheet
    extract("smb3_mario.png", "smb3_luigi.png", 140)

    # SM64 clean singles
    for src, dst in [
        ("extracted/sm64_mario_h2.png", "sm64_mario.png"),
        ("extracted/sm64_mario_clean.png", "sm64_mario.png"),
        ("extracted/sm64_luigi_h2.png", "sm64_luigi.png"),
        ("extracted/sm64_luigi_clean.png", "sm64_luigi.png"),
    ]:
        p = DL / src
        if p.exists():
            im = flood_clear(Image.open(p).convert("RGBA"))
            save(im, dst, 140)

    # Enemies
    extract("smw_enemies.png", "smw_goomba.png", 100)
    extract("smb2_enemies.png", "smb2_goomba.png", 100)
    extract("smb3_enemies.png", "smb3_goomba.png", 100)

    # Reliable style enemies (if sheet pick wrong)
    save(pixel_goomba_smw(), "smw_goomba.png", 100)
    save(pixel_shyguy(), "smb2_goomba.png", 100)
    save(pixel_smb3_goomba(), "smb3_goomba.png", 100)

    # SM64 goomba/koopa painted 3D-ish
    from PIL import Image as I, ImageDraw as D
    g = I.new("RGBA", (80, 80), (0, 0, 0, 0))
    d = D.Draw(g)
    d.ellipse((10, 16, 70, 66), fill=(150, 85, 40), outline=(90, 50, 20), width=3)
    d.ellipse((24, 42, 56, 64), fill=(230, 190, 150))
    d.ellipse((20, 26, 38, 46), fill=(255, 255, 255))
    d.ellipse((42, 26, 60, 46), fill=(255, 255, 255))
    d.ellipse((26, 32, 34, 42), fill=(20, 20, 20))
    d.ellipse((48, 32, 56, 42), fill=(20, 20, 20))
    d.ellipse((14, 60, 34, 76), fill=(100, 55, 25))
    d.ellipse((46, 60, 66, 76), fill=(100, 55, 25))
    save(g, "sm64_goomba.png", 100)

    k = I.new("RGBA", (80, 90), (0, 0, 0, 0))
    d = D.Draw(k)
    d.ellipse((12, 28, 68, 74), fill=(50, 170, 50), outline=(20, 100, 20), width=3)
    d.ellipse((46, 8, 74, 36), fill=(255, 220, 100), outline=(180, 140, 40), width=2)
    d.ellipse((58, 16, 66, 24), fill=(20, 20, 20))
    d.ellipse((18, 68, 36, 86), fill=(255, 220, 100))
    d.ellipse((44, 68, 62, 86), fill=(255, 220, 100))
    save(k, "sm64_koopa.png", 100)
    save(k, "smw_koopa.png", 100)
    save(k, "smb2_koopa.png", 100)
    save(k, "smb3_koopa.png", 100)

    # recolor smb3 luigi-ish: load mario and swap red->green roughly
    mp = OUT / "smb3_mario.png"
    if mp.exists():
        im = Image.open(mp).convert("RGBA")
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if a < 10:
                    continue
                if r > 150 and r > g + 40 and r > b + 40:
                    px[x, y] = (40, min(255, g + 80), 40, a)
        save(im, "smb3_luigi.png", 140)

    print("DONE manual best")


if __name__ == "__main__":
    main()
