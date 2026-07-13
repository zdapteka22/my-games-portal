# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw
import os

out = os.path.dirname(os.path.abspath(__file__))


def save(name, img):
    path = os.path.join(out, name)
    img.save(path, "PNG")
    print("saved", name, img.size)


def upscale(img, scale=8):
    return img.resize((img.width * scale, img.height * scale), Image.NEAREST)


def make_goomba():
    s = 16
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    p = im.load()
    for y in range(s):
        for x in range(s):
            cx, cy = 7.5, 8
            rx, ry = 7, 6
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                p[x, y] = (139, 69, 19, 255) if y < 11 else (101, 50, 14, 255)
    for x, y in [(2, 13), (3, 13), (4, 14), (5, 14), (10, 14), (11, 14), (12, 13), (13, 13)]:
        p[x, y] = (60, 30, 10, 255)
    for x, y in [(4, 6), (5, 6), (6, 6), (4, 7), (5, 7), (9, 6), (10, 6), (11, 6), (10, 7), (11, 7)]:
        p[x, y] = (255, 255, 255, 255)
    p[5, 7] = (0, 0, 0, 255)
    p[10, 7] = (0, 0, 0, 255)
    for x in range(3, 7):
        p[x, 5] = (40, 20, 5, 255)
    for x in range(9, 13):
        p[x, 5] = (40, 20, 5, 255)
    return upscale(im, 8)


def make_koopa():
    s = (16, 20)
    im = Image.new("RGBA", s, (0, 0, 0, 0))
    p = im.load()
    for y in range(6, 16):
        for x in range(2, 14):
            if ((x - 7.5) / 6) ** 2 + ((y - 10.5) / 5) ** 2 <= 1:
                p[x, y] = (46, 180, 60, 255) if (x + y) % 3 else (34, 140, 40, 255)
    for y in range(10, 16):
        for x in range(5, 11):
            p[x, y] = (240, 200, 80, 255)
    for y in range(2, 9):
        for x in range(4, 12):
            if ((x - 7.5) / 4) ** 2 + ((y - 5) / 3.5) ** 2 <= 1:
                p[x, y] = (240, 200, 80, 255)
    p[6, 5] = (255, 255, 255, 255)
    p[9, 5] = (255, 255, 255, 255)
    p[6, 6] = (0, 0, 0, 255)
    p[9, 6] = (0, 0, 0, 255)
    for x, y in [(3, 17), (4, 17), (5, 18), (10, 18), (11, 17), (12, 17)]:
        p[x, y] = (240, 160, 40, 255)
    for x in range(3, 13):
        p[x, 7] = (20, 100, 30, 255)
    return upscale(im, 8)


def make_piranha():
    s = (16, 20)
    im = Image.new("RGBA", s, (0, 0, 0, 0))
    p = im.load()
    for y in range(10, 20):
        for x in range(6, 10):
            p[x, y] = (20, 140, 30, 255)
    for x, y in [(2, 12), (3, 12), (4, 13), (11, 13), (12, 12), (13, 12)]:
        p[x, y] = (40, 200, 50, 255)
    for y in range(1, 12):
        for x in range(1, 15):
            if ((x - 7.5) / 7) ** 2 + ((y - 6) / 5) ** 2 <= 1:
                p[x, y] = (220, 30, 30, 255) if y < 7 else (180, 20, 20, 255)
    for x, y in [(3, 4), (4, 5), (11, 4), (12, 5)]:
        p[x, y] = (255, 255, 255, 255)
    for i in range(3, 13, 2):
        p[i, 8] = (255, 255, 255, 255)
        p[i, 9] = (255, 255, 255, 255)
    p[5, 4] = (255, 255, 255, 255)
    p[10, 4] = (255, 255, 255, 255)
    p[5, 5] = (0, 0, 0, 255)
    p[10, 5] = (0, 0, 0, 255)
    return upscale(im, 8)


def make_bullet():
    s = (20, 12)
    im = Image.new("RGBA", s, (0, 0, 0, 0))
    p = im.load()
    for y in range(1, 11):
        for x in range(2, 18):
            p[x, y] = (30, 30, 30, 255)
    for y in range(2, 10):
        p[1, y] = (20, 20, 20, 255)
        if 3 <= y <= 8:
            p[0, y] = (15, 15, 15, 255)
    for y in range(3, 7):
        for x in range(4, 8):
            p[x, y] = (255, 255, 255, 255)
    p[6, 4] = (0, 0, 0, 255)
    p[6, 5] = (0, 0, 0, 255)
    p[5, 4] = (0, 0, 0, 255)
    for x in range(12, 16):
        p[x, 2] = (240, 240, 240, 255)
        p[x, 9] = (240, 240, 240, 255)
    return upscale(im, 8)


def make_mushroom():
    s = 16
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    p = im.load()
    for y in range(8, 15):
        for x in range(4, 12):
            p[x, y] = (250, 230, 190, 255)
    for y in range(1, 10):
        for x in range(1, 15):
            if ((x - 7.5) / 7) ** 2 + ((y - 5.5) / 4.5) ** 2 <= 1:
                p[x, y] = (220, 30, 40, 255)
    for x, y in [(4, 4), (5, 3), (5, 4), (10, 3), (11, 4), (7, 6), (8, 6)]:
        p[x, y] = (255, 255, 255, 255)
    p[6, 11] = (40, 20, 10, 255)
    p[9, 11] = (40, 20, 10, 255)
    p[6, 12] = (40, 20, 10, 255)
    p[9, 12] = (40, 20, 10, 255)
    p[7, 13] = (40, 20, 10, 255)
    p[8, 13] = (40, 20, 10, 255)
    return upscale(im, 8)


def make_star():
    s = 16
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    pts = [
        (8, 1), (10, 6), (15, 6), (11, 9), (13, 15),
        (8, 11), (3, 15), (5, 9), (1, 6), (6, 6),
    ]
    draw.polygon(pts, fill=(255, 220, 30, 255))
    p = im.load()
    p[6, 7] = (40, 30, 0, 255)
    p[10, 7] = (40, 30, 0, 255)
    p[6, 8] = (40, 30, 0, 255)
    p[10, 8] = (40, 30, 0, 255)
    p[7, 4] = (255, 255, 180, 255)
    p[8, 3] = (255, 255, 200, 255)
    return upscale(im, 8)


def make_1up():
    s = 16
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    p = im.load()
    for y in range(8, 15):
        for x in range(4, 12):
            p[x, y] = (250, 230, 190, 255)
    for y in range(1, 10):
        for x in range(1, 15):
            if ((x - 7.5) / 7) ** 2 + ((y - 5.5) / 4.5) ** 2 <= 1:
                p[x, y] = (40, 180, 60, 255)
    for x, y in [(4, 4), (5, 3), (5, 4), (10, 3), (11, 4), (7, 6), (8, 6)]:
        p[x, y] = (255, 255, 255, 255)
    p[6, 11] = (40, 20, 10, 255)
    p[9, 11] = (40, 20, 10, 255)
    return upscale(im, 8)


def make_spiny():
    s = 16
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    p = im.load()
    for y in range(6, 14):
        for x in range(1, 15):
            if ((x - 7.5) / 7) ** 2 + ((y - 10) / 4) ** 2 <= 1:
                p[x, y] = (200, 40, 40, 255)
    for sx in [2, 5, 8, 11, 13]:
        for dy in range(0, 5):
            yy = 5 - dy
            if 0 <= sx < 16 and 0 <= yy < 16:
                p[sx, yy] = (180, 30, 30, 255)
                if sx + 1 < 16:
                    p[sx + 1, yy] = (220, 60, 60, 255)
    p[5, 9] = (255, 255, 255, 255)
    p[10, 9] = (255, 255, 255, 255)
    p[5, 10] = (0, 0, 0, 255)
    p[10, 10] = (0, 0, 0, 255)
    for x, y in [(3, 14), (4, 14), (11, 14), (12, 14)]:
        p[x, y] = (80, 20, 20, 255)
    return upscale(im, 8)


if __name__ == "__main__":
    save("enemy_goomba.png", make_goomba())
    save("enemy_koopa.png", make_koopa())
    save("enemy_piranha.png", make_piranha())
    save("enemy_bullet.png", make_bullet())
    save("enemy_spiny.png", make_spiny())
    save("item_mushroom.png", make_mushroom())
    save("item_star.png", make_star())
    save("item_1up.png", make_1up())
    print("DONE")
