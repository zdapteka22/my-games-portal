# -*- coding: utf-8 -*-
import json
import os
import re
import urllib.request

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
tmp = r"C:\Users\Евгений\Desktop\my-games-portal\_refs"
os.makedirs(tmp, exist_ok=True)


def get(url, name):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        data = urllib.request.urlopen(req, timeout=40).read()
        path = os.path.join(tmp, name)
        with open(path, "wb") as f:
            f.write(data)
        print("OK", name, len(data))
        return path
    except Exception as e:
        print("FAIL", name, e)
        return None


for label, u in [
    ("domer", "https://www.youtube.com/oembed?url=https://www.youtube.com/channel/UCb5oqCZ4AfmfXbgHsfei0tQ&format=json"),
    ("derzko", "https://www.youtube.com/oembed?url=https://www.youtube.com/@derzko69&format=json"),
    ("vanya", "https://www.youtube.com/oembed?url=https://www.youtube.com/@VanyaDmitrienko&format=json"),
]:
    try:
        req = urllib.request.Request(u, headers={"User-Agent": ua})
        j = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
        print(label, j.get("author_name"), j.get("thumbnail_url", "")[:100])
        if j.get("thumbnail_url"):
            get(j["thumbnail_url"], label + "_thumb.jpg")
    except Exception as e:
        print(label, "oembed fail", e)

for label, url in [
    ("domer_fandom", "https://minecraft-youtubers.fandom.com/ru/wiki/Domer_Grief"),
    ("derzko_fandom", "https://derzko69.fandom.com/ru/wiki/%D0%94%D0%B5%D1%80%D0%B7%D0%BA%D0%BE69"),
]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        imgs = re.findall(r"https://static\.wikia\.nocookie\.net/[^\"'\s]+", html)
        # unique preserve order
        seen = set()
        uniq = []
        for im in imgs:
            if im not in seen:
                seen.add(im)
                uniq.append(im)
        print(label, "imgs", len(uniq))
        for i, im in enumerate(uniq[:8]):
            print(" ", im[:140])
            if any(x in im.lower() for x in ["smart", "scale-to-width-down", "revision", "png", "jpg", "webp", "jpeg"]):
                get(im, f"{label}_{i}.img")
    except Exception as e:
        print(label, "fail", e)

print("done", os.listdir(tmp))
