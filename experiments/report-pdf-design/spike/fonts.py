"""Step 0 spike: download the latin subset of the report fonts from Google
Fonts and write them as base64 @font-face rules for build.py.

Usage: python3 -I fonts.py <out_dir>   (writes <out_dir>/fonts.css)
"""

import base64
import os
import re
import sys
import urllib.request

OUT = sys.argv[1]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
CSS_URLS = [
    "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,400"
    "&family=Roboto+Condensed:wght@400;500&display=swap",
    "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400&display=swap",
]


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})) as r:
        return r.read()


faces = {}
for url in CSS_URLS:
    css = get(url).decode()
    for subset, block in re.findall(r"/\* (\S+) \*/\s*@font-face \{(.*?)\}", css, re.S):
        if subset != "latin":
            continue
        family = re.search(r"font-family: '([^']+)'", block).group(1)
        style = re.search(r"font-style: (\w+)", block).group(1)
        faces[(family, style)] = re.search(r"url\((\S+?)\)", block).group(1)

os.makedirs(OUT, exist_ok=True)
rules = []
for (family, style), url in faces.items():
    data = base64.b64encode(get(url)).decode()
    rules.append(f"@font-face{{font-family:'{family}';font-style:{style};font-weight:100 900;"
                 f"font-display:block;src:url(data:font/woff2;base64,{data}) format('woff2');}}")
with open(os.path.join(OUT, "fonts.css"), "w") as f:
    f.write("\n".join(rules))
print(f"{len(rules)} faces written to {OUT}/fonts.css")
