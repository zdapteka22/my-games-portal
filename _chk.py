from pathlib import Path
t = Path(__file__).with_name("index.html").read_text(encoding="utf-8")
key = 'class="brand-banner-title"'
i = t.find(key)
print("idx", i)
print(repr(t[i:i+160]))
key2 = "Портал любимых игр"
print("count favorite", t.count(key2))
print("has banner block", "brand-banner" in t)
