# -*- coding: utf-8 -*-
from pathlib import Path
import re
html = Path("games/minis/battle-all.html").read_text(encoding="utf-8")
chunk = html[html.find("const HEROES"): html.find("const GROUPS")]
ids = re.findall(r'\{ id:"([^"]+)"', chunk)
heroes = Path("images/heroes")
small, missing, ok = [], [], []
for hid in ids:
    p = heroes / f"{hid}.png"
    if not p.exists():
        missing.append(hid)
    elif p.stat().st_size < 25000:
        small.append((hid, p.stat().st_size))
    else:
        ok.append(hid)
print("total", len(ids), "ok", len(ok), "small", len(small), "missing", len(missing))
print("SMALL:", ", ".join(h for h,s in small))
print("MISSING:", ", ".join(missing))
