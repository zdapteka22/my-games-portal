# -*- coding: utf-8 -*-
"""Copy fixed portal files into git deploy folder (without huge temp assets)."""
import shutil
from pathlib import Path

SRC = Path(r"C:\Users\Евгений\Desktop\my-games-portal")
DST = Path(r"C:\Users\Евгений\Desktop\_my-games-portal-git")

# Top-level files
for name in [
    "index.html", "menu.html", "app.js", "styles.css", "game.html", "play.html",
    "auth-config.js",
    "robots.txt", "sitemap.xml", "LINKS.txt", "README.md",
    "serve_nocache.py",
]:
    s, d = SRC / name, DST / name
    if s.exists():
        shutil.copy2(s, d)
        print("file", name)

# games/game-meta.js
gm = SRC / "games" / "game-meta.js"
if gm.exists():
    (DST / "games").mkdir(parents=True, exist_ok=True)
    shutil.copy2(gm, DST / "games" / "game-meta.js")
    print("file games/game-meta.js")

# data/ (shared reviews etc.)
data_src = SRC / "data"
if data_src.exists():
    data_dst = DST / "data"
    data_dst.mkdir(parents=True, exist_ok=True)
    for f in data_src.iterdir():
        if f.is_file() and f.suffix.lower() in {".json", ".txt", ".md"}:
            shutil.copy2(f, data_dst / f.name)
            print("data", f.name)

# GitHub Actions workflows
wf_src = SRC / ".github" / "workflows"
if wf_src.exists():
    wf_dst = DST / ".github" / "workflows"
    wf_dst.mkdir(parents=True, exist_ok=True)
    for f in wf_src.iterdir():
        if f.is_file() and f.suffix.lower() in {".yml", ".yaml"}:
            shutil.copy2(f, wf_dst / f.name)
            print("workflow", f.name)

# images (+ heroes avatars)
(DST / "images").mkdir(parents=True, exist_ok=True)
for f in (SRC / "images").iterdir():
    if f.is_file() and f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}:
        shutil.copy2(f, DST / "images" / f.name)
        print("img", f.name)
heroes_src = SRC / "images" / "heroes"
if heroes_src.exists():
    heroes_dst = DST / "images" / "heroes"
    heroes_dst.mkdir(parents=True, exist_ok=True)
    for f in heroes_src.iterdir():
        if f.is_file() and f.suffix.lower() == ".png":
            shutil.copy2(f, heroes_dst / f.name)
            print("hero", f.name)

# games/minis essentials + sprites (not _dl)
minis_dst = DST / "games" / "minis"
minis_dst.mkdir(parents=True, exist_ok=True)
skip_names = {"_dl", "extracted", "preview", "__pycache__"}
for f in (SRC / "games" / "minis").iterdir():
    if f.name.startswith("_") and f.suffix in {".py", ".js"}:
        continue
    if f.is_file() and f.suffix.lower() in {".html", ".js", ".css", ".json", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp3", ".ogg", ".wav", ".m4a"}:
        # skip huge SSBU arts if present (optional: include them)
        if f.name in {"art_luigi_ssbu.png", "art_bowser_ssbu.png"} and f.stat().st_size > 500_000:
            # still copy — needed for quality; but check size
            print("copy large", f.name, f.stat().st_size)
        shutil.copy2(f, minis_dst / f.name)
        print("minis", f.name)
    elif f.is_dir() and f.name == "sprites":
        spr_dst = minis_dst / "sprites"
        spr_dst.mkdir(exist_ok=True)
        for sf in f.iterdir():
            if sf.is_file() and sf.suffix.lower() == ".png" and not sf.name.startswith("_"):
                shutil.copy2(sf, spr_dst / sf.name)
                print("sprite", sf.name)
    elif f.is_dir() and f.name == "music":
        mus_dst = minis_dst / "music"
        mus_dst.mkdir(exist_ok=True)
        for sf in f.iterdir():
            if sf.is_file() and sf.suffix.lower() in {".mp3", ".ogg", ".wav", ".m4a"}:
                shutil.copy2(sf, mus_dst / sf.name)
                print("music", sf.name, sf.stat().st_size)

# labyrinth
if (SRC / "games" / "minis" / "labyrinth.html").exists():
    print("labyrinth ok")

# smeshariki (html + images only, skip music bulk if already there)
sm_src = SRC / "games" / "smeshariki"
sm_dst = DST / "games" / "smeshariki"
sm_dst.mkdir(parents=True, exist_ok=True)
for name in ["index.html", "game.html"]:
    if (sm_src / name).exists():
        shutil.copy2(sm_src / name, sm_dst / name)
        print("smesh", name)
img_src = sm_src / "images"
if img_src.exists():
    (sm_dst / "images").mkdir(exist_ok=True)
    for f in img_src.iterdir():
        if f.is_file():
            shutil.copy2(f, sm_dst / "images" / f.name)

# Update LINKS
(DST / "LINKS.txt").write_text(
    """САЙТ В ИНТЕРНЕТЕ:

Портал (GitHub Pages):
https://zdapteka22.github.io/my-games-portal/

Марио:
https://zdapteka22.github.io/my-games-portal/games/minis/mario.html

Меню:
https://zdapteka22.github.io/my-games-portal/menu.html

Репозиторий:
https://github.com/zdapteka22/my-games-portal

Локально:
запусти «Открыть_локально.bat» или:
  python serve_nocache.py
  http://127.0.0.1:8765/
""",
    encoding="utf-8",
)
print("DONE")
