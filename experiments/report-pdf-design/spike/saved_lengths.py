"""Step 0 spike: the longest texts saved on Nuave's orders, as numbers only.

Read-only. One fixed SELECT on the production D1 database (`nuave-v2-spend`,
table `orders`) returns, for every text field inside each saved report, its
JSON path, its length in characters and its word count. No text leaves the
database: the query returns numbers and field paths only. This script then
groups the paths (array positions removed) and prints, per field, how many
values there are, and the longest in characters and in words.

Usage: python3 -I experiments/report-pdf-design/spike/saved_lengths.py
Needs CLOUDFLARE_API_TOKEN with D1 read access.
"""

import json
import os
import re
import urllib.request

DATABASE_ID = "e2bd6ac9-7fd9-4d3a-890c-66fcfecd23ea"  # nuave-v2-spend (production)
SQL = """
SELECT j.fullkey AS path,
       length(j.value) AS chars,
       length(trim(j.value)) - length(replace(trim(j.value), ' ', '')) + 1 AS words
FROM orders o, json_tree(o.report_json) j
WHERE o.report_json IS NOT NULL AND j.type = 'text' AND length(j.value) > 0
"""


def api(path, body=None):
    request = urllib.request.Request(
        "https://api.cloudflare.com/client/v4" + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + os.environ["CLOUDFLARE_API_TOKEN"],
                 "Content-Type": "application/json"},
        method="GET" if body is None else "POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


account = api("/accounts")["result"][0]["id"]
rows = api(f"/accounts/{account}/d1/database/{DATABASE_ID}/query", {"sql": SQL})["result"][0]["results"]
orders = api(f"/accounts/{account}/d1/database/{DATABASE_ID}/query",
             {"sql": "SELECT count(*) AS n FROM orders WHERE report_json IS NOT NULL"})["result"][0]["results"][0]["n"]

fields = {}
for row in rows:
    key = re.sub(r"\[\d+\]", "[]", row["path"])
    entry = fields.setdefault(key, {"values": 0, "max_chars": 0, "max_words": 0})
    entry["values"] += 1
    entry["max_chars"] = max(entry["max_chars"], row["chars"])
    entry["max_words"] = max(entry["max_words"], row["words"])

print(f"saved reports: {orders}")
print(f"{'field':70} {'values':>6} {'max chars':>9} {'max words':>9}")
for key, entry in sorted(fields.items(), key=lambda kv: -kv[1]["max_words"]):
    if entry["max_words"] >= 5:
        print(f"{key[:70]:70} {entry['values']:>6} {entry['max_chars']:>9} {entry['max_words']:>9}")
