# -*- coding: utf-8 -*-
import urllib.request
import ssl
import os
import struct
import zlib

dest = os.path.dirname(os.path.abspath(__file__))
ctx = ssl.create_default_context()
ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"


def try_dl(url, path):
    print("GET", url)
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": ua,
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Referer": "https://www.google.com/",
        },
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=40) as r:
            data = r.read()
            ct = r.headers.get("Content-Type")
        print("  bytes", len(data), "ct", ct, "sig", data[:12])
        if len(data) < 4000:
            return False
        if data[:15].lower().startswith(b"<!doctype") or data[:5].lower().startswith(b"<html"):
            print("  html")
            return False
        ok = (
            data[:8].startswith(b"\x89PNG")
            or data[:2] == b"\xff\xd8"
            or data[:4] == b"RIFF"
            or data[:3] == b"GIF"
        )
        if not ok:
            print("  not image")
            return False
        with open(path, "wb") as f:
            f.write(data)
        print("  saved", path, os.path.getsize(path))
        return True
    except Exception as e:
        print("  ERR", e)
        return False


def png_chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path, w, h, rgba_rows):
    """rgba_rows: list of bytes length w*4 each"""
    raw = b"".join(b"\x00" + row for row in rgba_rows)
    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", compressed) + png_chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("generated", path, os.path.getsize(path))


def set_px(row, x, r, g, b, a=255):
    i = x * 4
    if 0 <= i < len(row) - 3:
        row[i] = r
        row[i + 1] = g
        row[i + 2] = b
        row[i + 3] = a


def fill_rect(rows, x0, y0, x1, y1, color):
    r, g, b = color
    h = len(rows)
    w = len(rows[0]) // 4
    for y in range(max(0, y0), min(h, y1)):
        row = rows[y]
        for x in range(max(0, x0), min(w, x1)):
            set_px(row, x, r, g, b)


def fill_ellipse(rows, cx, cy, rx, ry, color):
    r, g, b = color
    h = len(rows)
    w = len(rows[0]) // 4
    for y in range(max(0, cy - ry), min(h, cy + ry + 1)):
        for x in range(max(0, cx - rx), min(w, cx + rx + 1)):
            dx = (x - cx) / max(1, rx)
            dy = (y - cy) / max(1, ry)
            if dx * dx + dy * dy <= 1.0:
                set_px(rows[y], x, r, g, b)


def gen_luigi(path):
    """Classic-style Luigi portrait (original drawing, green palette)."""
    W, H = 160, 200
    rows = [bytearray(W * 4) for _ in range(H)]
    # transparent bg already 0
    # shoes
    fill_rect(rows, 40, 175, 70, 195, (20, 20, 20))
    fill_rect(rows, 90, 175, 120, 195, (20, 20, 20))
    # legs blue
    fill_rect(rows, 48, 140, 72, 178, (20, 50, 180))
    fill_rect(rows, 88, 140, 112, 178, (20, 50, 180))
    # body overalls
    fill_ellipse(rows, 80, 125, 38, 36, (20, 55, 190))
    # green shirt arms
    fill_ellipse(rows, 42, 115, 16, 20, (30, 170, 55))
    fill_ellipse(rows, 118, 115, 16, 20, (30, 170, 55))
    fill_rect(rows, 55, 95, 105, 125, (30, 170, 55))
    # buttons
    fill_ellipse(rows, 70, 120, 4, 4, (240, 200, 40))
    fill_ellipse(rows, 90, 120, 4, 4, (240, 200, 40))
    # hands
    fill_ellipse(rows, 35, 128, 10, 9, (255, 200, 160))
    fill_ellipse(rows, 125, 128, 10, 9, (255, 200, 160))
    # gloves white
    fill_ellipse(rows, 35, 128, 9, 8, (245, 245, 245))
    fill_ellipse(rows, 125, 128, 9, 8, (245, 245, 245))
    # head
    fill_ellipse(rows, 80, 62, 34, 36, (255, 205, 165))
    # nose
    fill_ellipse(rows, 80, 72, 10, 8, (255, 190, 150))
    # mustache
    fill_ellipse(rows, 80, 82, 18, 7, (40, 30, 20))
    # eyes
    fill_ellipse(rows, 68, 58, 6, 8, (255, 255, 255))
    fill_ellipse(rows, 92, 58, 6, 8, (255, 255, 255))
    fill_ellipse(rows, 70, 59, 3, 4, (40, 80, 200))
    fill_ellipse(rows, 94, 59, 3, 4, (40, 80, 200))
    # hat green
    fill_ellipse(rows, 80, 38, 36, 18, (20, 150, 40))
    fill_rect(rows, 44, 34, 116, 48, (20, 150, 40))
    # brim
    fill_ellipse(rows, 80, 48, 42, 8, (15, 130, 35))
    # L badge
    fill_ellipse(rows, 80, 36, 12, 12, (255, 255, 255))
    fill_rect(rows, 74, 28, 80, 44, (20, 150, 40))
    fill_rect(rows, 74, 38, 88, 44, (20, 150, 40))
    # hair sideburns
    fill_rect(rows, 48, 48, 56, 70, (40, 30, 20))
    fill_rect(rows, 104, 48, 112, 70, (40, 30, 20))
    write_png(path, W, H, [bytes(r) for r in rows])


def gen_bowser(path):
    """Classic-style Bowser portrait (original drawing)."""
    W, H = 200, 200
    rows = [bytearray(W * 4) for _ in range(H)]
    # feet
    fill_ellipse(rows, 70, 180, 22, 14, (180, 120, 40))
    fill_ellipse(rows, 130, 180, 22, 14, (180, 120, 40))
    # claws
    for x in (55, 65, 75, 115, 125, 135):
        fill_rect(rows, x, 185, x + 6, 198, (240, 240, 220))
    # body green
    fill_ellipse(rows, 100, 130, 55, 48, (40, 150, 50))
    # belly cream
    fill_ellipse(rows, 100, 140, 32, 34, (240, 210, 140))
    # shell
    fill_ellipse(rows, 115, 120, 40, 38, (20, 100, 40))
    # shell spikes gold
    for i, (sx, sy) in enumerate([(95, 95), (115, 85), (135, 95), (145, 115), (100, 115)]):
        fill_ellipse(rows, sx, sy, 8, 8, (220, 180, 40))
        fill_ellipse(rows, sx, sy - 2, 4, 4, (255, 240, 120))
    # arms
    fill_ellipse(rows, 45, 125, 18, 22, (40, 150, 50))
    fill_ellipse(rows, 155, 125, 18, 22, (40, 150, 50))
    # hands
    fill_ellipse(rows, 35, 145, 14, 12, (200, 140, 50))
    fill_ellipse(rows, 165, 145, 14, 12, (200, 140, 50))
    # head
    fill_ellipse(rows, 90, 70, 42, 40, (50, 170, 55))
    # snout
    fill_ellipse(rows, 55, 85, 28, 20, (50, 170, 55))
    fill_ellipse(rows, 48, 88, 18, 12, (240, 210, 150))
    # mouth / teeth
    fill_rect(rows, 35, 90, 70, 100, (20, 20, 20))
    for tx in (38, 46, 54, 62):
        fill_rect(rows, tx, 90, tx + 5, 98, (255, 255, 255))
    # eye
    fill_ellipse(rows, 95, 58, 14, 16, (255, 255, 255))
    fill_ellipse(rows, 98, 60, 7, 9, (200, 30, 30))
    fill_ellipse(rows, 100, 62, 3, 4, (20, 20, 20))
    # eyebrows angry
    fill_rect(rows, 82, 42, 112, 50, (30, 30, 30))
    # red hair
    fill_ellipse(rows, 105, 35, 30, 18, (220, 30, 30))
    fill_rect(rows, 85, 28, 130, 48, (220, 30, 30))
    for hx in range(80, 135, 8):
        fill_ellipse(rows, hx, 22 + (hx % 16), 6, 10, (200, 20, 20))
    # horns
    fill_ellipse(rows, 60, 35, 10, 16, (245, 235, 200))
    fill_ellipse(rows, 125, 28, 10, 18, (245, 235, 200))
    fill_ellipse(rows, 58, 22, 5, 6, (255, 255, 240))
    fill_ellipse(rows, 125, 14, 5, 6, (255, 255, 240))
    # wrist spikes
    for x in (28, 38, 160, 170):
        fill_ellipse(rows, x, 140, 4, 6, (245, 235, 200))
    write_png(path, W, H, [bytes(r) for r in rows])


def main():
    luigi_path = os.path.join(dest, "art_luigi.png")
    bowser_path = os.path.join(dest, "art_bowser.png")

    luigi_urls = [
        "https://static.wikia.nocookie.net/mario/images/3/3e/Luigi_NSMBU.png/revision/latest/scale-to-width-down/250",
        "https://static.wikia.nocookie.net/ssb/images/4/4a/Luigi_SSBU.png/revision/latest/scale-to-width-down/250",
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    ]
    bowser_urls = [
        "https://static.wikia.nocookie.net/ssb/images/b/b0/Bowser_SSBU.png/revision/latest/scale-to-width-down/250",
        "https://static.wikia.nocookie.net/mario/images/7/7d/Bowser_Artwork_-_Super_Mario_3D_World.png/revision/latest/scale-to-width-down/300",
        "https://static.wikia.nocookie.net/mario/images/1/11/BowserNSMBU.png/revision/latest/scale-to-width-down/300",
    ]

    # try network; if fail generate original art
    got_l = False
    for u in luigi_urls:
        # skip test pokemon for real file later
        if "pokemon" in u:
            continue
        if try_dl(u, luigi_path):
            got_l = True
            break
    if not got_l:
        print("Generating original Luigi art")
        gen_luigi(luigi_path)

    got_b = False
    for u in bowser_urls:
        if try_dl(u, bowser_path):
            got_b = True
            break
    if not got_b:
        print("Generating original Bowser art")
        gen_bowser(bowser_path)

    # connectivity probe
    try_dl(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
        os.path.join(dest, "_net_test.png"),
    )

    for p in (luigi_path, bowser_path):
        print("final", p, os.path.getsize(p) if os.path.exists(p) else "MISSING")


if __name__ == "__main__":
    main()
