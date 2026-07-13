# -*- coding: utf-8 -*-
import json
import os
import urllib.parse
import urllib.request

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
tmp = r"C:\Users\Евгений\Desktop\my-games-portal\_official"
os.makedirs(tmp, exist_ok=True)


def get(url, name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        data = urllib.request.urlopen(req, timeout=45).read()
        path = os.path.join(tmp, name)
        with open(path, "wb") as f:
            f.write(data)
        print("OK", name, len(data))
        return path
    except Exception as e:
        print("FAIL", name, e)
        return None


def commons_search(q, out_prefix, n=8):
    api = (
        "https://commons.wikimedia.org/w/api.php?action=query&generator=search"
        "&gsrsearch=" + urllib.parse.quote(q)
        + "&gsrlimit=" + str(n)
        + "&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|size"
        + "&iiurlwidth=1200&format=json"
    )
    req = urllib.request.Request(api, headers={"User-Agent": ua})
    j = json.loads(urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace"))
    pages = (j.get("query") or {}).get("pages") or {}
    i = 0
    for _pid, p in pages.items():
        title = p.get("title", "")
        info = (p.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        mime = info.get("mime", "")
        print(out_prefix, "|", title, "|", mime)
        if not url:
            continue
        if "image" in (mime or "") or any(url.lower().endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif")):
            ext = ".png" if "png" in (mime or "") or url.lower().endswith(".png") else ".jpg"
            get(url, f"{out_prefix}_{i}{ext}")
            i += 1


for q, pref in [
    ("Peppa Pig", "peppa"),
    ("File:Peppa", "peppaf"),
    ("Shrek ogre", "shrek"),
    ("Shrek 2001", "shrek2"),
    ("Barbie doll Mattel", "barbie"),
    ("Barbie fashion doll", "barbie2"),
    ("Amy Rose Sonic", "amy"),
    ("Sonic the Hedgehog Amy", "amy2"),
    ("Vanya Dmitrienko", "vanya"),
]:
    print("===", q)
    try:
        commons_search(q, pref)
    except Exception as e:
        print("search fail", e)

# Direct known Wikimedia / free sources
direct = [
    (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/%D0%92%D0%B0%D0%BD%D1%8F_%D0%94%D0%BC%D0%B8%D1%82%D1%80%D0%B8%D0%B5%D0%BD%D0%BA%D0%BE_%D0%BD%D0%B0_VK_Fest_2025_%D0%B2_%D0%A1%D0%9F%D0%B1_%28cropped%29.jpg/1024px-%D0%92%D0%B0%D0%BD%D1%8F_%D0%94%D0%BC%D0%B8%D1%82%D1%80%D0%B8%D0%B5%D0%BD%D0%BA%D0%BE_%D0%BD%D0%B0_VK_Fest_2025_%D0%B2_%D0%A1%D0%9F%D0%B1_%28cropped%29.jpg",
        "vanya_real.jpg",
    ),
    (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/%D0%92%D0%B0%D0%BD%D1%8F_%D0%94%D0%BC%D0%B8%D1%82%D1%80%D0%B8%D0%B5%D0%BD%D0%BA%D0%BE_%28%D0%91%D0%B5%D0%BB%D1%8B%D0%B5_%D0%BD%D0%BE%D1%87%D0%B8_%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%D0%B0_%E2%80%94_2022%2C_%D0%B4%D0%B5%D0%BD%D1%8C_1%29.jpg/800px-file.jpg",
        "vanya2.jpg",
    ),
]
for u, n in direct:
    get(u, n)

# Wikipedia pageimages for related articles
for title, name in [
    ("Peppa_Pig", "wiki_peppa"),
    ("Shrek_(character)", "wiki_shrek"),
    ("Barbie", "wiki_barbie"),
    ("Amy_Rose", "wiki_amy"),
    ("%D0%94%D0%BC%D0%B8%D1%82%D1%80%D0%B8%D0%B5%D0%BD%D0%BA%D0%BE,_%D0%92%D0%B0%D0%BD%D1%8F", "wiki_vanya"),
]:
    api = (
        "https://en.wikipedia.org/w/api.php?action=query&titles=" + title
        + "&prop=pageimages&format=json&pithumbsize=1200"
    )
    if title.startswith("%"):
        api = (
            "https://ru.wikipedia.org/w/api.php?action=query&titles=" + title
            + "&prop=pageimages&format=json&pithumbsize=1200"
        )
    try:
        req = urllib.request.Request(api, headers={"User-Agent": ua})
        j = json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace"))
        for p in (j.get("query") or {}).get("pages", {}).values():
            src = (p.get("thumbnail") or {}).get("source")
            print(name, "pageimage", src)
            if src:
                get(src, name + ".jpg")
    except Exception as e:
        print(name, "fail", e)

print("DONE", os.listdir(tmp))
