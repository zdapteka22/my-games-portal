# -*- coding: utf-8 -*-
"""
Build FULL-BODY Super Mario 64 style Mario & Luigi.
Uses SM64 face sprites + drawn body (SM64 is 3D, so full 2D sheets are rare).
Also extracts Paper Mario N64 full-body frames as extra high-quality N64 sprites.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
DL = ROOT / "_dl"
EX = DL / "extracted"
OUT = ROOT


def kill_bg(im, mode="auto"):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            if mode == "pink" or mode == "auto":
                if r > 180 and b > 180 and g < 160:  # magenta/pink sheet
                    px[x, y] = (0, 0, 0, 0)
                    continue
                if r > 200 and g < 100 and b > 200:
                    px[x, y] = (0, 0, 0, 0)
                    continue
            if mode == "gray" or mode == "auto":
                if abs(r - g) < 20 and abs(g - b) < 20 and r < 100:
                    px[x, y] = (0, 0, 0, 0)
            if b > 150 and b > r + 40 and b > g + 40:
                px[x, y] = (0, 0, 0, 0)
    return im


def trim(im, pad=1):
    bb = im.getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    return im.crop((
        max(0, x0 - pad), max(0, y0 - pad),
        min(im.width, x1 + pad), min(im.height, y1 + pad),
    ))


def extract_paper_mario_stand():
    """Paper Mario N64 sheet: full body standing frames, pink bg."""
    p = DL / "paper_mario.png"
    if not p.exists():
        return None
    im = kill_bg(Image.open(p), "pink")
    # Top-left stand is roughly first cell; sheet is tall, frames ~40-50 wide
    # From preview: first frame standing ~ row0 col0
    # Try grid: estimate cell ~56x70 from visual
    w, h = im.size
    # first standing pose top-left
    candidates = []
    for box in [
        (8, 8, 56, 72),
        (0, 0, 64, 80),
        (60, 8, 112, 72),
        (8, 80, 56, 150),
        (0, 0, 48, 64),
    ]:
        if box[2] <= w and box[3] <= h:
            c = trim(im.crop(box))
            if c.getbbox() and c.height > 20 and c.width > 12:
                candidates.append(c)
    if not candidates:
        # component hunt for tall bodies near top
        return None
    # prefer tallest densest
    candidates.sort(key=lambda c: -(c.height * sum(1 for p in c.getdata() if p[3] > 20)))
    return candidates[0]


def extract_best_sm64_head(which="mario"):
    """Single SM64-style head, clean."""
    names = {
        "mario": [
            "sm64_mario_clean.png", "sm64_mario_head.png", "sm64_mario_h2.png",
            "final_sm64_mario.png",
        ],
        "luigi": [
            "sm64_luigi_clean.png", "sm64_luigi_head.png", "sm64_luigi_h2.png",
            "final_sm64_luigi.png",
        ],
    }[which]
    for n in names:
        p = EX / n
        if not p.exists():
            continue
        im = kill_bg(Image.open(p), "gray")
        # take largest head component at top
        w, h = im.size
        px = im.load()
        seen = [[False] * w for _ in range(h)]
        comps = []
        for y in range(h):
            for x in range(w):
                if seen[y][x] or px[x, y][3] < 20:
                    continue
                st = [(x, y)]
                seen[y][x] = True
                minx = maxx = x
                miny = maxy = y
                npx = 0
                while st:
                    cx, cy = st.pop()
                    npx += 1
                    minx = min(minx, cx)
                    maxx = max(maxx, cx)
                    miny = min(miny, cy)
                    maxy = max(maxy, cy)
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] >= 20:
                            seen[ny][nx] = True
                            st.append((nx, ny))
                bw, bh = maxx - minx + 1, maxy - miny + 1
                if npx > 100 and bw >= 20 and bh >= 20:
                    comps.append((npx, minx, miny, maxx + 1, maxy + 1))
        if not comps:
            head = trim(im)
        else:
            comps.sort(reverse=True)
            # prefer top-most among large ones
            big = [c for c in comps if c[0] > 200]
            if big:
                big.sort(key=lambda c: (c[2], -c[0]))  # top first
                _, x0, y0, x1, y1 = big[0]
            else:
                _, x0, y0, x1, y1 = comps[0]
            head = trim(im.crop((x0, y0, x1, y1)))
        if head.width > 8:
            return head
    return None


def draw_sm64_body(width, height, colors):
    """
    Cartoon full body under the head, SM64 proportions (big head, short body).
    colors: dict shirt, overalls, buttons, gloves, shoes, skin
    """
    im = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = width // 2

    shirt = colors["shirt"]
    overalls = colors["overalls"]
    buttons = colors["buttons"]
    gloves = colors["gloves"]
    shoes = colors["shoes"]
    skin = colors["skin"]

    # body overalls (oval)
    body_top = int(height * 0.38)
    body_bot = int(height * 0.78)
    d.ellipse((cx - 28, body_top, cx + 28, body_bot), fill=overalls, outline=tuple(max(0, c - 40) for c in overalls[:3]) + (255,), width=2)

    # shirt torso peek / shoulders
    d.ellipse((cx - 26, body_top - 8, cx + 26, body_top + 28), fill=shirt)

    # arms
    d.ellipse((cx - 42, body_top + 5, cx - 18, body_top + 45), fill=shirt)
    d.ellipse((cx + 18, body_top + 5, cx + 42, body_top + 45), fill=shirt)
    # gloves
    d.ellipse((cx - 46, body_top + 38, cx - 16, body_top + 62), fill=gloves, outline=(200, 200, 200, 255), width=1)
    d.ellipse((cx + 16, body_top + 38, cx + 46, body_top + 62), fill=gloves, outline=(200, 200, 200, 255), width=1)

    # overall straps
    d.rectangle((cx - 18, body_top, cx - 10, body_top + 35), fill=overalls)
    d.rectangle((cx + 10, body_top, cx + 18, body_top + 35), fill=overalls)
    # buttons
    d.ellipse((cx - 16, body_top + 22, cx - 8, body_top + 30), fill=buttons)
    d.ellipse((cx + 8, body_top + 22, cx + 16, body_top + 30), fill=buttons)

    # legs
    d.ellipse((cx - 24, body_bot - 20, cx - 2, body_bot + 18), fill=overalls)
    d.ellipse((cx + 2, body_bot - 20, cx + 24, body_bot + 18), fill=overalls)
    # shoes
    d.ellipse((cx - 30, body_bot + 8, cx - 2, body_bot + 28), fill=shoes)
    d.ellipse((cx + 2, body_bot + 8, cx + 30, body_bot + 28), fill=shoes)

    return im


def compose_fullbody(which="mario"):
    head = extract_best_sm64_head(which)
    W, H = 120, 170
    if which == "mario":
        colors = {
            "shirt": (220, 40, 40, 255),
            "overalls": (40, 70, 200, 255),
            "buttons": (255, 210, 40, 255),
            "gloves": (245, 245, 245, 255),
            "shoes": (120, 60, 30, 255),
            "skin": (255, 200, 150, 255),
        }
    else:
        colors = {
            "shirt": (40, 180, 70, 255),
            "overalls": (40, 70, 200, 255),
            "buttons": (255, 210, 40, 255),
            "gloves": (245, 245, 245, 255),
            "shoes": (120, 60, 30, 255),
            "skin": (255, 200, 150, 255),
        }

    body = draw_sm64_body(W, H, colors)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(body, (0, 0))

    if head is not None:
        # scale head to ~55% of width
        target_w = 70
        scale = target_w / max(1, head.width)
        hw = max(20, int(head.width * scale))
        hh = max(20, int(head.height * scale))
        head = head.resize((hw, hh), Image.NEAREST)
        # place head on top center, overlapping shoulders
        hx = (W - hw) // 2
        hy = max(0, int(H * 0.02))
        canvas.alpha_composite(head, (hx, hy))
    else:
        # fallback simple head
        d = ImageDraw.Draw(canvas)
        d.ellipse((30, 8, 90, 70), fill=(255, 200, 150, 255), outline=(180, 120, 80, 255), width=2)

    return trim(canvas)


def extract_paper_full():
    """Save Paper Mario N64 full-body stand as secondary high quality."""
    p = DL / "paper_mario.png"
    if not p.exists():
        return
    im = kill_bg(Image.open(p), "pink")
    # grid-ish: from preview first frame ~ 0,0 size ~50x65
    cell_w, cell_h = 56, 70
    # standing front-ish: row 0 col 0 or col with face forward
    for col, row, name in [(0, 0, "sm64_mario_paper.png"), (1, 0, "sm64_mario_paper2.png")]:
        box = (col * cell_w + 4, row * cell_h + 4, (col + 1) * cell_w - 2, (row + 1) * cell_h - 2)
        if box[2] <= im.width and box[3] <= im.height:
            c = trim(im.crop(box))
            if c.getbbox():
                c = c.resize((c.width * 3, c.height * 3), Image.NEAREST)
                c.save(OUT / name)
                print("paper", name, c.size)


def main():
    # Prefer FULL BODY composite for gameplay (not just face)
    mario = compose_fullbody("mario")
    luigi = compose_fullbody("luigi")

    # Upscale for clarity in game
    mario = mario.resize((mario.width * 2, mario.height * 2), Image.NEAREST)
    luigi = luigi.resize((luigi.width * 2, luigi.height * 2), Image.NEAREST)

    # Also try paper mario as higher quality full body if extraction works well
    extract_paper_full()
    paper = OUT / "sm64_mario_paper.png"
    if paper.exists():
        pm = Image.open(paper).convert("RGBA")
        # if paper frame looks good (tall enough), use it for mario
        if pm.height >= 80 and pm.width >= 40:
            # scale to similar size
            pm = trim(pm)
            scale = 200 / max(pm.height, 1)
            pm = pm.resize((max(40, int(pm.width * scale)), max(80, int(pm.height * scale))), Image.NEAREST)
            # only replace if density ok
            dens = sum(1 for p in pm.getdata() if p[3] > 20) / (pm.width * pm.height)
            if dens > 0.25:
                mario = pm
                print("using paper mario full body")

    mario.save(OUT / "sm64_mario.png")
    luigi.save(OUT / "sm64_luigi.png")
    print("SAVED sm64_mario", mario.size, (OUT / "sm64_mario.png").stat().st_size)
    print("SAVED sm64_luigi", luigi.size, (OUT / "sm64_luigi.png").stat().st_size)

    # Also extract goomba-ish from wanted if any full body small chars - keep painted goomba
    print("DONE fullbody 64")


if __name__ == "__main__":
    main()
