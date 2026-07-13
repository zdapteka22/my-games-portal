# -*- coding: utf-8 -*-
"""Generate original stylized avatar arts for battle-all heroes (no img)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import re
import colorsys

OUT = Path(__file__).resolve().parent / "images" / "heroes"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 256

# id -> (bg, accent, shape, mark)
# shape: round, tall, wide, star, square, oval
# mark: face type for drawing
SPECS = {
  # smesh extras
  "nyusha": ("#ff8fab", "#ffe0ec", "round", "pig"),
  "sovunya": ("#6d4c41", "#d7ccc8", "tall", "owl"),
  "kar_kanych": ("#37474f", "#90a4ae", "tall", "crow"),
  # ru
  "masha": ("#e53935", "#ffcc00", "round", "girl"),
  "medved": ("#8d6e63", "#efebe9", "wide", "bear"),
  "korzhik": ("#f4a460", "#fff3e0", "round", "cat"),
  "karamelka": ("#ff69b4", "#fce4ec", "round", "cat_girl"),
  "kompot": ("#87ceeb", "#e3f2fd", "wide", "cat_big"),
  "simka": ("#e91e63", "#f8bbd0", "tall", "fixi"),
  "nolik": ("#2196f3", "#bbdefb", "round", "fixi"),
  "dedus": ("#607d8b", "#cfd8dc", "tall", "old"),
  "cheburashka": ("#a1887f", "#efebe9", "wide", "ears"),
  "gena": ("#43a047", "#c8e6c9", "tall", "croc"),
  "volk_np": ("#5d4037", "#bcaaa4", "tall", "wolf"),
  "zayac_np": ("#eceff1", "#ff8a80", "tall", "bunny"),
  "fedor": ("#42a5f5", "#e3f2fd", "round", "boy"),
  "matroskin": ("#ef5350", "#ffcdd2", "round", "cat_stripe"),
  "sharik_ps": ("#8d6e63", "#d7ccc8", "wide", "dog"),
  "karlson": ("#ff7043", "#ffccbc", "round", "prop"),
  "malysh_k": ("#7e57c2", "#d1c4e9", "round", "kid"),
  "vinni_su": ("#ffb300", "#ffe082", "wide", "bear"),
  "pyatachok": ("#f8bbd0", "#fce4ec", "round", "pig"),
  "drugok": ("#fb8c00", "#ffe0b2", "round", "dog"),
  "rosa_barb": ("#ec407a", "#f8bbd0", "tall", "girl"),
  "kesha_mimi": ("#5c6bc0", "#c5cae9", "wide", "bear"),
  "tuchka": ("#8d6e63", "#eceff1", "wide", "bear"),
  "alenka": ("#ff5722", "#ffccbc", "tall", "mage_fire"),
  "varya_sp": ("#3f51b5", "#c5cae9", "tall", "warrior"),
  "masha_sp": ("#9c27b0", "#e1bee7", "tall", "mage"),
  "snezhka": ("#4fc3f7", "#e1f5fe", "tall", "mage_ice"),
  "buba": ("#66bb6a", "#c8e6c9", "wide", "blob"),
  "leopold": ("#ffb74d", "#fff3e0", "round", "cat_stripe"),
  "kuzya_l": ("#8bc34a", "#dcedc8", "tall", "bug"),
  "mila_l": ("#ef5350", "#ffcdd2", "round", "ladybug"),
  "pchelenok": ("#fdd835", "#fff9c4", "round", "bee"),
  "troubadour": ("#5c6bc0", "#c5cae9", "tall", "bard"),
  "pes_brem": ("#8d6e63", "#d7ccc8", "wide", "dog"),
  "kot_brem": ("#455a64", "#b0bec5", "round", "cat"),
  "osel_brem": ("#795548", "#bcaaa4", "wide", "donkey"),
  "winnie_petson": ("#78909c", "#cfd8dc", "tall", "old"),
  "findus": ("#ff7043", "#ffccbc", "round", "cat"),
  # us
  "spongebob": ("#ffeb3b", "#fff59d", "square", "sponge"),
  "patrick": ("#ff8a80", "#ffcdd2", "star", "starfish"),
  "squidward": ("#80cbc4", "#b2dfdb", "tall", "squid"),
  "mickey": ("#212121", "#e53935", "round", "mouse"),
  "minnie": ("#e91e63", "#f8bbd0", "round", "mouse_girl"),
  "donald": ("#1565c0", "#90caf9", "round", "duck"),
  "goofy": ("#ff9800", "#ffe0b2", "tall", "dog"),
  "tom_cat": ("#90a4ae", "#cfd8dc", "tall", "cat"),
  "jerry_mouse": ("#ff7043", "#ffccbc", "round", "mouse_small"),
  "scooby": ("#6d4c41", "#d7ccc8", "wide", "dog"),
  "shaggy": ("#66bb6a", "#c8e6c9", "tall", "boy"),
  "bugs": ("#9e9e9e", "#f5f5f5", "tall", "bunny"),
  "daffy": ("#212121", "#ffeb3b", "round", "duck"),
  "woody": ("#ff7043", "#ffccbc", "tall", "cowboy"),
  "buzz": ("#fdd835", "#fff59d", "square", "astro"),
  "elsa": ("#4fc3f7", "#e1f5fe", "tall", "queen_ice"),
  "anna_frozen": ("#ef5350", "#ffcdd2", "tall", "girl"),
  "olaf": ("#eceff1", "#ffcc80", "tall", "snow"),
  "simba": ("#ffb300", "#ffe082", "wide", "lion"),
  "timon": ("#ff7043", "#ffccbc", "round", "meerkat"),
  "pumbaa": ("#a1887f", "#d7ccc8", "wide", "boar"),
  "po_panda": ("#212121", "#eeeeee", "wide", "panda"),
  "mcqueen": ("#e53935", "#ffcdd2", "wide", "car"),
  "mater": ("#8d6e63", "#d7ccc8", "wide", "truck"),
  "minion": ("#ffeb3b", "#fff59d", "tall", "minion"),
  "mike_w": ("#7cb342", "#c5e1a5", "round", "eyeball"),
  "sully": ("#42a5f5", "#bbdefb", "wide", "monster"),
  "finn": ("#29b6f6", "#b3e5fc", "round", "hero_hat"),
  "jake": ("#ffb300", "#ffe082", "wide", "dog_stretch"),
  "bluey": ("#42a5f5", "#bbdefb", "round", "dog"),
  "bingo": ("#ff8a65", "#ffccbc", "round", "dog"),
  "chase_paw": ("#1e88e5", "#90caf9", "round", "pup"),
  "marshall_paw": ("#e53935", "#ffcdd2", "round", "pup"),
  "skye_paw": ("#ec407a", "#f8bbd0", "round", "pup"),
  "tails": ("#ff9800", "#ffe0b2", "tall", "fox2"),
  "knuckles": ("#e53935", "#ffcdd2", "wide", "echidna"),
  "fiona": ("#43a047", "#a5d6a7", "tall", "ogre_f"),
  "donkey_shrek": ("#6d4c41", "#d7ccc8", "wide", "donkey"),
  "george_pig": ("#81c784", "#c8e6c9", "round", "pig"),
  "spiderman": ("#e53935", "#212121", "round", "spidey"),
  "batman_c": ("#212121", "#ffeb3b", "round", "bat"),
  "nemo": ("#ff7043", "#ffffff", "wide", "fish"),
  "dory": ("#29b6f6", "#ffeb3b", "wide", "fish"),
  "stitch": ("#42a5f5", "#bbdefb", "wide", "alien"),
  "gumball": ("#29b6f6", "#b3e5fc", "round", "cat"),
  "darwin_g": ("#ff9800", "#ffe0b2", "round", "fish"),
  "phineas": ("#ff8a65", "#ffccbc", "tall", "triangle"),
  "ferb": ("#66bb6a", "#c8e6c9", "tall", "boy"),
  "perry": ("#26a69a", "#b2dfdb", "wide", "platypus"),
  "dora": ("#ff7043", "#ffccbc", "round", "girl"),
  "boots": ("#ef5350", "#ffcdd2", "round", "monkey"),
  "pony_twilight": ("#ab47bc", "#e1bee7", "wide", "pony"),
  "pony_rainbow": ("#42a5f5", "#ffeb3b", "wide", "pony"),
  "winnie_us": ("#ffb300", "#ffe082", "wide", "bear"),
  "tigger": ("#ff7043", "#212121", "tall", "tiger"),
  "moana": ("#26c6da", "#b2ebf2", "tall", "girl"),
  "maui": ("#8d6e63", "#d7ccc8", "wide", "warrior"),
  "rapunzel": ("#ab47bc", "#ffe082", "tall", "longhair"),
  "mulan": ("#c62828", "#ef9a9a", "tall", "warrior"),
  "aladdin": ("#7e57c2", "#d1c4e9", "tall", "boy"),
  "genie": ("#29b6f6", "#b3e5fe", "tall", "genie"),
  "puss_in_boots": ("#ff9800", "#212121", "tall", "cat_hat"),
}

EMOJI = {}  # filled from battle file if needed


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def lighten(rgb, a=0.35):
    return tuple(min(255, int(c + (255 - c) * a)) for c in rgb)


def darken(rgb, a=0.35):
    return tuple(max(0, int(c * (1 - a))) for c in rgb)


def draw_bg(draw, bg, accent):
    # radial-ish gradient via rings
    cx = cy = SIZE // 2
    for r in range(SIZE // 2, 0, -2):
        t = 1 - r / (SIZE / 2)
        col = tuple(int(bg[i] * (1 - t * 0.45) + accent[i] * t * 0.45) for i in range(3))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    # vignette ring
    draw.ellipse([6, 6, SIZE - 6, SIZE - 6], outline=lighten(bg, 0.5), width=4)
    draw.ellipse([14, 14, SIZE - 14, SIZE - 14], outline=darken(bg, 0.25), width=2)


def eyes(draw, x, y, s=14, color=(20, 20, 30), shine=True):
    draw.ellipse([x - s, y - s, x + s, y + s], fill=(255, 255, 255))
    draw.ellipse([x - s + 4, y - s + 4, x + s - 2, y + s - 2], fill=color)
    if shine:
        draw.ellipse([x - 2, y - s + 6, x + 4, y - s + 12], fill=(255, 255, 255))


def smile(draw, x, y, w=28, happy=True):
    if happy:
        draw.arc([x - w, y - 10, x + w, y + 22], 20, 160, fill=(40, 20, 20), width=4)
    else:
        draw.arc([x - w, y, x + w, y + 28], 200, 340, fill=(40, 20, 20), width=4)


def body_circle(draw, cx, cy, r, fill, outline=None):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline or darken(fill, 0.3), width=3)


def draw_character(draw, mark, bg, accent):
    cx = cy = SIZE // 2
    skin = lighten(bg, 0.55)
    dark = darken(bg, 0.4)
    acc = accent

    if mark in ("pig",):
        body_circle(draw, cx, cy + 10, 78, (255, 170, 190))
        # snout
        draw.ellipse([cx - 28, cy + 8, cx + 28, cy + 48], fill=(255, 140, 170))
        draw.ellipse([cx - 14, cy + 20, cx - 4, cy + 34], fill=(200, 80, 120))
        draw.ellipse([cx + 4, cy + 20, cx + 14, cy + 34], fill=(200, 80, 120))
        eyes(draw, cx - 22, cy - 10, 12)
        eyes(draw, cx + 22, cy - 10, 12)
        # ears
        draw.ellipse([cx - 70, cy - 70, cx - 30, cy - 25], fill=(255, 150, 180))
        draw.ellipse([cx + 30, cy - 70, cx + 70, cy - 25], fill=(255, 150, 180))
        # bow
        draw.ellipse([cx + 20, cy - 75, cx + 55, cy - 45], fill=(255, 80, 140))
        draw.ellipse([cx + 45, cy - 75, cx + 80, cy - 45], fill=(255, 80, 140))
    elif mark == "owl":
        body_circle(draw, cx, cy + 8, 80, (121, 85, 72))
        draw.polygon([(cx, cy - 90), (cx - 50, cy - 30), (cx + 50, cy - 30)], fill=(93, 64, 55))
        eyes(draw, cx - 28, cy - 5, 22, (40, 30, 20))
        eyes(draw, cx + 28, cy - 5, 22, (40, 30, 20))
        draw.polygon([(cx - 8, cy + 18), (cx + 8, cy + 18), (cx, cy + 36)], fill=(255, 183, 77))
    elif mark == "crow":
        body_circle(draw, cx, cy + 10, 70, (55, 71, 79))
        draw.polygon([(cx + 20, cy + 5), (cx + 75, cy + 15), (cx + 20, cy + 28)], fill=(255, 193, 7))
        eyes(draw, cx - 15, cy - 10, 14, (255, 235, 59))
        eyes(draw, cx + 10, cy - 12, 12, (255, 235, 59))
        # hat
        draw.ellipse([cx - 45, cy - 75, cx + 45, cy - 35], fill=(33, 33, 33))
        draw.rectangle([cx - 55, cy - 50, cx + 55, cy - 40], fill=(33, 33, 33))
    elif mark in ("girl", "cat_girl", "longhair", "queen_ice"):
        hair = (255, 214, 10) if mark == "girl" else (acc if mark != "queen_ice" else (180, 230, 255))
        if mark == "cat_girl":
            hair = (255, 105, 180)
        if mark == "longhair":
            hair = (255, 224, 130)
            draw.rectangle([cx - 20, cy + 20, cx + 20, cy + 110], fill=hair)
        body_circle(draw, cx, cy + 20, 70, (255, 220, 190))
        # hair
        draw.ellipse([cx - 75, cy - 70, cx + 75, cy + 20], fill=hair if isinstance(hair, tuple) else hex_rgb(hair) if isinstance(hair, str) else hair)
        body_circle(draw, cx, cy + 25, 55, (255, 220, 190))
        eyes(draw, cx - 18, cy + 10, 11)
        eyes(draw, cx + 18, cy + 10, 11)
        smile(draw, cx, cy + 30, 18)
        if mark == "queen_ice":
            draw.polygon([(cx - 40, cy - 80), (cx, cy - 110), (cx + 40, cy - 80)], fill=(200, 240, 255))
            draw.ellipse([cx - 35, cy - 85, cx + 35, cy - 55], fill=(180, 230, 255))
        if mark == "girl":
            # yellow dress bit
            draw.polygon([(cx - 50, cy + 70), (cx + 50, cy + 70), (cx + 40, cy + 110), (cx - 40, cy + 110)], fill=(255, 204, 0))
    elif mark in ("bear", "panda"):
        col = (20, 20, 20) if mark == "panda" else (141, 110, 99)
        face = (245, 245, 245) if mark == "panda" else (161, 136, 127)
        body_circle(draw, cx, cy + 10, 78, face)
        # ears
        draw.ellipse([cx - 85, cy - 70, cx - 35, cy - 20], fill=col)
        draw.ellipse([cx + 35, cy - 70, cx + 85, cy - 20], fill=col)
        if mark == "panda":
            draw.ellipse([cx - 50, cy - 20, cx - 5, cy + 25], fill=(20, 20, 20))
            draw.ellipse([cx + 5, cy - 20, cx + 50, cy + 25], fill=(20, 20, 20))
        eyes(draw, cx - 22, cy, 12, (20, 20, 20))
        eyes(draw, cx + 22, cy, 12, (20, 20, 20))
        draw.ellipse([cx - 12, cy + 22, cx + 12, cy + 42], fill=col)
        smile(draw, cx, cy + 40, 16)
    elif mark in ("cat", "cat_stripe", "cat_big", "cat_hat"):
        col = bg if mark != "cat_stripe" else (239, 83, 80)
        body_circle(draw, cx, cy + 15, 72 if mark != "cat_big" else 82, lighten(col, 0.25))
        # ears triangle
        draw.polygon([(cx - 70, cy - 10), (cx - 30, cy - 80), (cx - 10, cy - 15)], fill=lighten(col, 0.15))
        draw.polygon([(cx + 70, cy - 10), (cx + 30, cy - 80), (cx + 10, cy - 15)], fill=lighten(col, 0.15))
        if mark == "cat_stripe":
            for i in range(-2, 3):
                draw.arc([cx - 60, cy - 40 + i * 8, cx + 60, cy + 40 + i * 8], 200, 340, fill=darken(col, 0.2), width=3)
        eyes(draw, cx - 22, cy + 5, 13, (60, 180, 60) if mark == "cat_hat" else (40, 40, 40))
        eyes(draw, cx + 22, cy + 5, 13, (60, 180, 60) if mark == "cat_hat" else (40, 40, 40))
        draw.ellipse([cx - 8, cy + 28, cx + 8, cy + 40], fill=(255, 150, 150))
        smile(draw, cx, cy + 42, 14)
        if mark == "cat_hat":
            draw.ellipse([cx - 40, cy - 90, cx + 40, cy - 40], fill=(30, 30, 30))
            draw.rectangle([cx - 50, cy - 55, cx + 50, cy - 42], fill=(30, 30, 30))
            draw.ellipse([cx + 25, cy - 75, cx + 55, cy - 50], fill=(200, 30, 30))
    elif mark in ("fixi",):
        body_circle(draw, cx, cy + 10, 60, lighten(bg, 0.2))
        # antenna
        draw.line([cx, cy - 50, cx, cy - 90], fill=darken(bg, 0.3), width=5)
        draw.ellipse([cx - 12, cy - 105, cx + 12, cy - 80], fill=accent)
        eyes(draw, cx - 18, cy, 14)
        eyes(draw, cx + 18, cy, 14)
        smile(draw, cx, cy + 28, 16)
        # wrench hint
        draw.rectangle([cx + 40, cy + 40, cx + 70, cy + 50], fill=(180, 180, 190))
    elif mark in ("old", "bard"):
        body_circle(draw, cx, cy + 15, 70, (255, 220, 190))
        draw.ellipse([cx - 70, cy - 40, cx + 70, cy + 30], fill=(158, 158, 158) if mark == "old" else (63, 81, 181))
        body_circle(draw, cx, cy + 20, 50, (255, 220, 190))
        eyes(draw, cx - 16, cy + 10, 10)
        eyes(draw, cx + 16, cy + 10, 10)
        smile(draw, cx, cy + 32, 14)
        if mark == "bard":
            draw.ellipse([cx - 30, cy + 70, cx + 30, cy + 110], fill=(121, 85, 72))
    elif mark == "ears":
        # cheburashka big ears
        draw.ellipse([cx - 110, cy - 40, cx - 20, cy + 70], fill=(161, 136, 127))
        draw.ellipse([cx + 20, cy - 40, cx + 110, cy + 70], fill=(161, 136, 127))
        body_circle(draw, cx, cy + 15, 65, (188, 170, 164))
        eyes(draw, cx - 18, cy + 5, 14)
        eyes(draw, cx + 18, cy + 5, 14)
        smile(draw, cx, cy + 35, 16)
    elif mark == "croc":
        body_circle(draw, cx, cy + 10, 75, (67, 160, 71))
        draw.ellipse([cx - 50, cy + 20, cx + 70, cy + 70], fill=(102, 187, 106))
        eyes(draw, cx - 25, cy - 15, 12)
        eyes(draw, cx + 10, cy - 18, 12)
        # harmonica
        draw.rectangle([cx - 35, cy + 35, cx + 35, cy + 55], fill=(255, 193, 7))
    elif mark in ("wolf", "lion", "tiger", "fox2", "echidna", "meerkat", "boar"):
        col = bg
        body_circle(draw, cx, cy + 10, 75, lighten(col, 0.15))
        if mark == "wolf":
            draw.polygon([(cx - 60, cy - 20), (cx - 25, cy - 85), (cx - 5, cy - 20)], fill=darken(col, 0.1))
            draw.polygon([(cx + 60, cy - 20), (cx + 25, cy - 85), (cx + 5, cy - 20)], fill=darken(col, 0.1))
        if mark == "lion":
            draw.ellipse([cx - 95, cy - 70, cx + 95, cy + 70], fill=(255, 152, 0))
            body_circle(draw, cx, cy + 10, 60, (255, 224, 130))
        if mark == "tiger":
            for i in range(-3, 4):
                draw.line([cx + i * 18, cy - 50, cx + i * 12, cy + 60], fill=(30, 30, 30), width=6)
        if mark == "fox2":
            draw.polygon([(cx - 70, cy - 10), (cx - 25, cy - 90), (cx - 5, cy - 10)], fill=(255, 152, 0))
            draw.polygon([(cx + 70, cy - 10), (cx + 25, cy - 90), (cx + 5, cy - 10)], fill=(255, 152, 0))
            # second tail hint
            draw.ellipse([cx + 50, cy + 40, cx + 100, cy + 100], fill=(255, 183, 77))
            draw.ellipse([cx - 100, cy + 40, cx - 50, cy + 100], fill=(255, 183, 77))
        if mark == "echidna":
            for ang in range(0, 360, 30):
                rad = math.radians(ang)
                x2 = cx + int(math.cos(rad) * 95)
                y2 = cy + int(math.sin(rad) * 95)
                draw.line([cx, cy, x2, y2], fill=(183, 28, 28), width=8)
            body_circle(draw, cx, cy + 5, 55, (229, 57, 53))
        eyes(draw, cx - 20, cy, 12)
        eyes(draw, cx + 20, cy, 12)
        smile(draw, cx, cy + 30, 18)
    elif mark == "bunny":
        body_circle(draw, cx, cy + 25, 65, (245, 245, 245))
        draw.ellipse([cx - 45, cy - 100, cx - 10, cy + 10], fill=(245, 245, 245))
        draw.ellipse([cx + 10, cy - 100, cx + 45, cy + 10], fill=(245, 245, 245))
        draw.ellipse([cx - 38, cy - 90, cx - 17, cy - 10], fill=(255, 182, 193))
        draw.ellipse([cx + 17, cy - 90, cx + 38, cy - 10], fill=(255, 182, 193))
        eyes(draw, cx - 18, cy + 15, 11)
        eyes(draw, cx + 18, cy + 15, 11)
        smile(draw, cx, cy + 40, 14)
    elif mark in ("boy", "kid", "hero_hat", "cowboy", "triangle"):
        body_circle(draw, cx, cy + 20, 65, (255, 220, 190))
        if mark == "hero_hat":
            draw.ellipse([cx - 60, cy - 70, cx + 60, cy + 10], fill=(255, 255, 255))
            body_circle(draw, cx, cy + 25, 50, (255, 220, 190))
            draw.rectangle([cx - 55, cy - 40, cx + 55, cy - 15], fill=(255, 255, 255))
        if mark == "cowboy":
            draw.ellipse([cx - 70, cy - 70, cx + 70, cy - 20], fill=(141, 110, 99))
            draw.rectangle([cx - 35, cy - 95, cx + 35, cy - 45], fill=(141, 110, 99))
            draw.rectangle([cx - 20, cy + 55, cx + 20, cy + 100], fill=(255, 87, 34))
        if mark == "triangle":
            draw.polygon([(cx, cy - 90), (cx - 50, cy + 20), (cx + 50, cy + 20)], fill=(255, 171, 145))
            body_circle(draw, cx, cy + 30, 40, (255, 220, 190))
        eyes(draw, cx - 16, cy + 15, 11)
        eyes(draw, cx + 16, cy + 15, 11)
        smile(draw, cx, cy + 38, 14)
        if mark == "boy" and accent:
            draw.rectangle([cx - 40, cy + 70, cx + 40, cy + 105], fill=accent)
    elif mark == "prop":
        body_circle(draw, cx, cy + 15, 70, (255, 183, 77))
        # propeller
        draw.ellipse([cx - 15, cy - 95, cx + 15, cy - 55], fill=(120, 120, 130))
        draw.ellipse([cx - 70, cy - 85, cx + 70, cy - 65], fill=(200, 200, 210))
        eyes(draw, cx - 18, cy + 5, 12)
        eyes(draw, cx + 18, cy + 5, 12)
        smile(draw, cx, cy + 32, 20)
    elif mark == "dog" or mark == "dog_stretch" or mark == "pup":
        body_circle(draw, cx, cy + 15, 70, lighten(bg, 0.25))
        draw.ellipse([cx - 80, cy - 20, cx - 30, cy + 40], fill=darken(bg, 0.1))
        draw.ellipse([cx + 30, cy - 20, cx + 80, cy + 40], fill=darken(bg, 0.1))
        eyes(draw, cx - 18, cy + 5, 12)
        eyes(draw, cx + 18, cy + 5, 12)
        draw.ellipse([cx - 10, cy + 28, cx + 10, cy + 45], fill=(255, 180, 180))
        smile(draw, cx, cy + 48, 16)
        if mark == "pup":
            draw.ellipse([cx - 30, cy - 70, cx + 30, cy - 40], fill=accent)
    elif mark == "bug":
        body_circle(draw, cx, cy + 10, 55, (139, 195, 74))
        draw.line([cx - 30, cy - 40, cx - 50, cy - 80], fill=(100, 150, 50), width=4)
        draw.line([cx + 30, cy - 40, cx + 50, cy - 80], fill=(100, 150, 50), width=4)
        eyes(draw, cx - 15, cy, 12)
        eyes(draw, cx + 15, cy, 12)
    elif mark == "ladybug":
        body_circle(draw, cx, cy + 10, 70, (239, 83, 80))
        draw.ellipse([cx - 20, cy - 30, cx + 20, cy + 10], fill=(33, 33, 33))
        for px, py in [(-25, 20), (25, 20), (-15, 50), (15, 50), (0, 35)]:
            draw.ellipse([cx + px - 10, cy + py - 10, cx + px + 10, cy + py + 10], fill=(33, 33, 33))
        eyes(draw, cx - 12, cy - 20, 10)
        eyes(draw, cx + 12, cy - 20, 10)
    elif mark == "bee":
        body_circle(draw, cx, cy + 10, 65, (255, 235, 59))
        for i in range(-2, 3):
            draw.rectangle([cx - 50, cy + i * 16, cx + 50, cy + i * 16 + 8], fill=(33, 33, 33))
        draw.ellipse([cx - 80, cy - 20, cx - 30, cy + 30], fill=(200, 230, 255, ))
        # wings approx
        draw.ellipse([cx - 90, cy - 30, cx - 25, cy + 25], fill=(200, 230, 255))
        draw.ellipse([cx + 25, cy - 30, cx + 90, cy + 25], fill=(200, 230, 255))
        eyes(draw, cx - 15, cy - 5, 11)
        eyes(draw, cx + 15, cy - 5, 11)
    elif mark == "sponge":
        draw.rounded_rectangle([cx - 70, cy - 80, cx + 70, cy + 80], radius=16, fill=(255, 235, 59))
        for px, py in [(-35, -40), (20, -50), (-10, 10), (30, 20), (-40, 40)]:
            draw.ellipse([cx + px - 8, cy + py - 8, cx + px + 8, cy + py + 8], fill=(255, 200, 0))
        eyes(draw, cx - 22, cy - 15, 16)
        eyes(draw, cx + 22, cy - 15, 16)
        smile(draw, cx, cy + 30, 24)
    elif mark == "starfish":
        pts = []
        for i in range(5):
            a = math.radians(-90 + i * 72)
            pts.append((cx + int(math.cos(a) * 90), cy + int(math.sin(a) * 90)))
            a2 = math.radians(-90 + i * 72 + 36)
            pts.append((cx + int(math.cos(a2) * 40), cy + int(math.sin(a2) * 40)))
        draw.polygon(pts, fill=(255, 138, 128))
        eyes(draw, cx - 18, cy - 5, 12)
        eyes(draw, cx + 18, cy - 5, 12)
        smile(draw, cx, cy + 25, 18)
    elif mark == "squid":
        body_circle(draw, cx, cy - 10, 60, (128, 203, 196))
        for i in range(-2, 3):
            draw.ellipse([cx + i * 22 - 12, cy + 50, cx + i * 22 + 12, cy + 110], fill=(128, 203, 196))
        eyes(draw, cx - 18, cy - 15, 14, (80, 40, 40))
        eyes(draw, cx + 18, cy - 15, 14, (80, 40, 40))
        smile(draw, cx, cy + 15, 16, happy=False)
    elif mark in ("mouse", "mouse_girl", "mouse_small"):
        body_circle(draw, cx, cy + 20, 55 if mark == "mouse_small" else 65, (245, 245, 245) if mark != "mouse" else (40, 40, 40))
        ear = (245, 245, 245) if mark == "mouse" else (255, 240, 245)
        draw.ellipse([cx - 95, cy - 70, cx - 25, cy + 5], fill=ear if mark != "mouse" else (40, 40, 40))
        draw.ellipse([cx + 25, cy - 70, cx + 95, cy + 5], fill=ear if mark != "mouse" else (40, 40, 40))
        if mark == "mouse":
            draw.ellipse([cx - 80, cy - 55, cx - 40, cy - 10], fill=(255, 150, 160))
            draw.ellipse([cx + 40, cy - 55, cx + 80, cy - 10], fill=(255, 150, 160))
            body_circle(draw, cx, cy + 25, 50, (40, 40, 40))
        if mark == "mouse_girl":
            draw.ellipse([cx - 20, cy - 90, cx + 50, cy - 50], fill=(233, 30, 99))
        eyes(draw, cx - 16, cy + 10, 11, (20, 20, 20) if mark != "mouse" else (255, 255, 255))
        eyes(draw, cx + 16, cy + 10, 11, (20, 20, 20) if mark != "mouse" else (255, 255, 255))
        smile(draw, cx, cy + 35, 12)
    elif mark == "duck":
        body_circle(draw, cx, cy + 10, 70, bg if sum(bg) > 200 else (30, 30, 30))
        draw.ellipse([cx + 10, cy + 10, cx + 70, cy + 45], fill=(255, 193, 7))
        eyes(draw, cx - 15, cy - 10, 12)
        eyes(draw, cx + 15, cy - 15, 11)
        if sum(bg) < 200:
            # sailor hat hint
            draw.ellipse([cx - 40, cy - 80, cx + 40, cy - 40], fill=(21, 101, 192))
    elif mark == "astro":
        draw.rounded_rectangle([cx - 60, cy - 70, cx + 60, cy + 70], radius=20, fill=(255, 235, 59))
        draw.ellipse([cx - 35, cy - 40, cx + 35, cy + 30], fill=(120, 200, 255))
        eyes(draw, cx - 12, cy - 10, 10)
        eyes(draw, cx + 12, cy - 10, 10)
        draw.rectangle([cx - 50, cy + 50, cx + 50, cy + 75], fill=(229, 57, 53))
    elif mark == "snow":
        body_circle(draw, cx, cy + 30, 50, (245, 245, 245))
        body_circle(draw, cx, cy - 25, 38, (245, 245, 245))
        eyes(draw, cx - 12, cy - 30, 8)
        eyes(draw, cx + 12, cy - 30, 8)
        draw.polygon([(cx - 4, cy - 15), (cx + 4, cy - 15), (cx, cy + 5)], fill=(255, 152, 0))
    elif mark == "car":
        draw.rounded_rectangle([cx - 90, cy - 20, cx + 90, cy + 50], radius=20, fill=(229, 57, 53))
        draw.rounded_rectangle([cx - 50, cy - 55, cx + 40, cy - 5], radius=12, fill=(200, 40, 40))
        draw.ellipse([cx - 60, cy + 25, cx - 20, cy + 70], fill=(33, 33, 33))
        draw.ellipse([cx + 20, cy + 25, cx + 60, cy + 70], fill=(33, 33, 33))
        draw.ellipse([cx + 35, cy - 10, cx + 75, cy + 20], fill=(255, 235, 59))
        eyes(draw, cx - 30, cy - 5, 10)
        eyes(draw, cx + 5, cy - 5, 10)
    elif mark == "truck":
        draw.rounded_rectangle([cx - 90, cy - 10, cx + 70, cy + 45], radius=12, fill=(141, 110, 99))
        draw.ellipse([cx - 50, cy + 25, cx - 10, cy + 70], fill=(33, 33, 33))
        draw.ellipse([cx + 20, cy + 25, cx + 60, cy + 70], fill=(33, 33, 33))
        eyes(draw, cx - 40, cy, 12)
        smile(draw, cx - 20, cy + 20, 20)
    elif mark == "minion":
        draw.rounded_rectangle([cx - 45, cy - 80, cx + 45, cy + 80], radius=40, fill=(255, 235, 59))
        draw.ellipse([cx - 35, cy - 35, cx + 35, cy + 35], fill=(200, 200, 210))
        eyes(draw, cx, cy, 22)
        draw.rectangle([cx - 45, cy + 40, cx + 45, cy + 75], fill=(21, 101, 192))
    elif mark == "eyeball":
        body_circle(draw, cx, cy, 85, (124, 179, 66))
        draw.ellipse([cx - 40, cy - 45, cx + 40, cy + 45], fill=(255, 255, 255))
        draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(30, 30, 30))
        smile(draw, cx, cy + 50, 25)
    elif mark == "monster":
        body_circle(draw, cx, cy + 10, 80, (66, 165, 245))
        for i in range(8):
            ang = i * 45
            rad = math.radians(ang)
            draw.ellipse([cx + int(math.cos(rad)*50) - 10, cy + int(math.sin(rad)*50) - 10,
                          cx + int(math.cos(rad)*50) + 10, cy + int(math.sin(rad)*50) + 10], fill=(25, 118, 210))
        eyes(draw, cx - 22, cy - 5, 14)
        eyes(draw, cx + 22, cy - 5, 14)
        smile(draw, cx, cy + 30, 22)
    elif mark in ("mage", "mage_fire", "mage_ice", "warrior", "ogre_f"):
        face = (200, 230, 180) if mark == "ogre_f" else (255, 220, 190)
        body_circle(draw, cx, cy + 15, 65, face)
        if mark == "mage_fire":
            draw.polygon([(cx - 30, cy - 90), (cx, cy - 30), (cx + 30, cy - 90)], fill=(255, 87, 34))
            draw.polygon([(cx - 20, cy - 100), (cx, cy - 50), (cx + 20, cy - 100)], fill=(255, 193, 7))
        if mark == "mage_ice":
            draw.polygon([(cx - 35, cy - 40), (cx, cy - 100), (cx + 35, cy - 40)], fill=(179, 229, 252))
        if mark == "warrior":
            draw.polygon([(cx - 40, cy - 70), (cx, cy - 100), (cx + 40, cy - 70)], fill=darken(bg, 0.2))
            draw.rectangle([cx + 40, cy - 20, cx + 55, cy + 70], fill=(200, 200, 210))
        if mark == "mage":
            draw.ellipse([cx - 50, cy - 80, cx + 50, cy - 20], fill=(156, 39, 176))
        eyes(draw, cx - 16, cy + 10, 11)
        eyes(draw, cx + 16, cy + 10, 11)
        smile(draw, cx, cy + 32, 14)
    elif mark == "blob":
        body_circle(draw, cx, cy + 10, 80, (102, 187, 106))
        eyes(draw, cx - 25, cy - 10, 16)
        eyes(draw, cx + 25, cy - 10, 16)
        smile(draw, cx, cy + 30, 28)
    elif mark == "donkey":
        body_circle(draw, cx, cy + 15, 70, (121, 85, 72))
        draw.ellipse([cx - 55, cy - 90, cx - 15, cy - 20], fill=(93, 64, 55))
        draw.ellipse([cx + 15, cy - 90, cx + 55, cy - 20], fill=(93, 64, 55))
        eyes(draw, cx - 18, cy + 5, 12)
        eyes(draw, cx + 18, cy + 5, 12)
        smile(draw, cx, cy + 35, 16)
    elif mark == "spidey":
        body_circle(draw, cx, cy, 80, (229, 57, 53))
        # web-ish lines
        for a in range(0, 360, 45):
            rad = math.radians(a)
            draw.line([cx, cy, cx + int(math.cos(rad)*80), cy + int(math.sin(rad)*80)], fill=(20, 20, 20), width=3)
        for r in (30, 55):
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(20, 20, 20), width=3)
        # eyes
        draw.ellipse([cx - 40, cy - 30, cx - 5, cy + 15], fill=(255, 255, 255))
        draw.ellipse([cx + 5, cy - 30, cx + 40, cy + 15], fill=(255, 255, 255))
    elif mark == "bat":
        body_circle(draw, cx, cy + 10, 70, (33, 33, 33))
        draw.polygon([(cx - 90, cy - 20), (cx - 30, cy - 10), (cx - 40, cy + 40)], fill=(20, 20, 20))
        draw.polygon([(cx + 90, cy - 20), (cx + 30, cy - 10), (cx + 40, cy + 40)], fill=(20, 20, 20))
        draw.ellipse([cx - 35, cy - 25, cx - 5, cy + 5], fill=(255, 235, 59))
        draw.ellipse([cx + 5, cy - 25, cx + 35, cy + 5], fill=(255, 235, 59))
    elif mark == "fish":
        body_circle(draw, cx, cy, 60, lighten(bg, 0.2))
        draw.polygon([(cx + 50, cy - 30), (cx + 100, cy), (cx + 50, cy + 30)], fill=darken(bg, 0.15))
        eyes(draw, cx - 10, cy - 5, 14)
        if accent:
            draw.ellipse([cx - 30, cy + 10, cx + 10, cy + 35], fill=accent)
    elif mark == "alien":
        body_circle(draw, cx, cy + 15, 70, (66, 165, 245))
        draw.ellipse([cx - 80, cy - 50, cx - 20, cy + 20], fill=(66, 165, 245))
        draw.ellipse([cx + 20, cy - 50, cx + 80, cy + 20], fill=(66, 165, 245))
        eyes(draw, cx - 22, cy, 16, (20, 20, 40))
        eyes(draw, cx + 22, cy, 16, (20, 20, 40))
        smile(draw, cx, cy + 35, 18)
    elif mark == "platypus":
        body_circle(draw, cx, cy + 10, 70, (38, 166, 154))
        draw.ellipse([cx + 20, cy + 5, cx + 90, cy + 45], fill=(255, 193, 7))
        eyes(draw, cx - 20, cy - 10, 12)
        # hat
        draw.ellipse([cx - 40, cy - 75, cx + 40, cy - 40], fill=(33, 33, 33))
    elif mark == "monkey":
        body_circle(draw, cx, cy + 10, 70, (161, 136, 127))
        draw.ellipse([cx - 40, cy - 10, cx + 40, cy + 55], fill=(255, 224, 178))
        eyes(draw, cx - 16, cy + 5, 11)
        eyes(draw, cx + 16, cy + 5, 11)
        smile(draw, cx, cy + 30, 14)
    elif mark == "pony":
        body_circle(draw, cx, cy + 15, 70, lighten(bg, 0.35))
        draw.ellipse([cx - 30, cy - 80, cx + 30, cy - 20], fill=accent)
        # horn
        draw.polygon([(cx - 8, cy - 70), (cx, cy - 110), (cx + 8, cy - 70)], fill=(255, 224, 130))
        eyes(draw, cx - 16, cy + 5, 12)
        eyes(draw, cx + 16, cy + 5, 12)
        smile(draw, cx, cy + 30, 14)
    elif mark == "genie":
        body_circle(draw, cx, cy - 10, 60, (41, 182, 246))
        draw.ellipse([cx - 40, cy + 40, cx + 40, cy + 100], fill=(41, 182, 246))
        eyes(draw, cx - 16, cy - 15, 12)
        eyes(draw, cx + 16, cy - 15, 12)
        smile(draw, cx, cy + 10, 18)
        draw.ellipse([cx - 50, cy - 80, cx + 50, cy - 40], fill=(255, 235, 59))
    else:
        # generic avatar
        body_circle(draw, cx, cy + 10, 75, lighten(bg, 0.25))
        eyes(draw, cx - 20, cy, 14)
        eyes(draw, cx + 20, cy, 14)
        smile(draw, cx, cy + 30, 20)


def make_icon(hid, bg_h, acc_h, shape, mark):
    bg = hex_rgb(bg_h)
    acc = hex_rgb(acc_h)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # circular canvas base
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    draw_bg(d, bg, acc)
    draw_character(d, mark, bg, acc)
    # circular mask
    mask = Image.new("L", (SIZE, SIZE), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([2, 2, SIZE - 3, SIZE - 3], fill=255)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(layer, (0, 0))
    out.putalpha(mask)
    # soft border
    border = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    bd = ImageDraw.Draw(border)
    bd.ellipse([2, 2, SIZE - 3, SIZE - 3], outline=(255, 255, 255, 180), width=4)
    bd.ellipse([6, 6, SIZE - 7, SIZE - 7], outline=(0, 0, 0, 60), width=2)
    out = Image.alpha_composite(out, border)
    path = OUT / f"{hid}.png"
    out.save(path, "PNG")
    return path


def main():
    n = 0
    for hid, (bg, acc, shape, mark) in SPECS.items():
        make_icon(hid, bg, acc, shape, mark)
        n += 1
    print("generated", n, "icons in", OUT)


if __name__ == "__main__":
    main()
