"""Builds the Report v3 proofs of concept from template.html and data/*.py.

Run from the repository root:
    python3 experiments/report-v3-poc/build.py

Writes, for each data set (a, b):
    dist/ultima-<x>.html        the page, as published (no doctype; the
                                artifact host adds the document skeleton)
    dist/ultima-<x>.local.html  the same page with a doctype, for a browser
                                and for the PDF
    dist/Lembar-Kerja-Ultima-<X>.xlsx   the worksheet (worksheet.py)
Then `node experiments/report-v3-poc/render.mjs` prints the PDFs.
No network calls.
"""

import importlib.util
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
DIST = HERE / "dist"
VALID = {"recommended", "mentioned", "cited", "none", "noaio", "failed", "notasked"}


def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / "data" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.DATA


def norm(text):
    """Answer text as a reader sees it: no Markdown emphasis, single spaces."""
    return re.sub(r"\s+", " ", text.replace("**", "").replace("*", "")).strip()


def prose(d):
    """Every piece of report prose written for this report (quotes from answers excluded)."""
    out = [d["verdict"], d["closing"]["text"], d["closing"]["recheck"], d.get("comp_lede", ""), d.get("brand_note", "")]
    out += [f["title"] + " " + f["text"] for f in d["findings"]]
    out += [r["title"] + " " + r["text"] for r in d["recs"]]
    out += [t["status"] for t in d.get("topics", [])] + [t["text"] for t in d.get("takeaways", [])]
    out += [p["title"] + " " + p["text"] for p in d["closing"]["plan"]]
    out += [f.get("ref_text", "") + " " + f.get("seen_on", "") for f in d.get("facts", [])]
    out += d.get("method", []) + [q.get("brand_summary", "") for q in d["questions"]]
    if d.get("moment"):
        out.append(d["moment"].get("caption", ""))
    if d.get("description"):
        out += [d["description"].get(k, "") for k in ("ai_line", "gap", "owner_line", "lede")]
    return [t for t in out if t]


def check(d, label):
    """The plan's rules, as code: what a report may show must be in its data."""
    errors = []
    names = {b["name"] for b in d["businesses"]}
    for q in d["questions"]:
        for src in ("chatgpt", "google"):
            a = q.get(src)
            if not a:
                continue
            if a["status"] not in VALID:
                errors.append(f"P{q['n']} {src}: bad status {a['status']}")
            for n in a.get("named", []) + a.get("rec", []):
                if n not in names:
                    errors.append(f"P{q['n']} {src}: '{n}' is not in businesses")
            for n in a.get("rec", []):
                if n not in a.get("named", []):
                    errors.append(f"P{q['n']} {src}: '{n}' recommended but not named")
    for f in d.get("facts", []):
        q = next(x for x in d["questions"] if x["n"] == f["n"])
        text = (q.get(f["source"]) or {}).get("answer", "")
        if norm(f["quote"]) not in norm(text):
            errors.append(f"fact quote not in P{f['n']} {f['source']}: {f['quote'][:50]}")
        if f["verdict"] not in ("berbeda", "sesuai", "tidak_bisa_dicek", "tanpa_penilaian"):
            errors.append(f"fact {f['quote'][:30]}: bad verdict {f['verdict']}")
        if f["topic"].lower().startswith("keamanan") and f["verdict"] != "tanpa_penilaian":
            errors.append(f"safety or licensing claim with a verdict: {f['quote'][:50]}")
    mo = d.get("moment")
    if mo:
        a = next(x for x in d["questions"] if x["n"] == mo["n"])[mo["source"]]
        for it in mo["list"]:
            if it["name"] not in a.get("named", []):
                errors.append(f"moment lists '{it['name']}', not named in that answer")
    for r in d["recs"]:
        if r["item"] not in d["playbook"]:
            errors.append(f"recommendation uses playbook item {r['item']} with no tags")
    for text in prose(d):
        if "—" in text:
            errors.append(f"em dash in report prose: {text[:50]}")
    for r in d["recs"]:
        if r["title"].split()[0] in ("Periksa", "Pertahankan", "Pertimbangkan", "Pastikan"):
            errors.append(f"recommendation title starts with a banned verb: {r['title']}")
    if len(d["verdict"]) > 220:
        errors.append(f"verdict is {len(d['verdict'])} characters (limit 220)")
    if errors:
        print(f"[{label}] {len(errors)} problem(s):")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print(f"[{label}] checks passed")


def page(d, title):
    data = json.dumps(d, ensure_ascii=False).replace("</", "<\\/")
    html = (HERE / "template.html").read_text(encoding="utf-8")
    return html.replace("__TITLE__", title).replace("__DATA__", data)


def main():
    DIST.mkdir(exist_ok=True)
    sys.path.insert(0, str(HERE))
    from worksheet import build_workbook  # noqa: E402

    for key, title in (("a", "Ultima Clinic PoC A"), ("b", "Ultima Clinic PoC B")):
        path = HERE / "data" / f"ultima_{key}.py"
        if not path.exists():
            print(f"[{key}] no data yet, skipped")
            continue
        d = load(f"ultima_{key}")
        d["playbook"] = {int(k): v for k, v in d["playbook"].items()}
        check(d, key)
        html = page(d, title)
        (DIST / f"ultima-{key}.html").write_text(html, encoding="utf-8")
        (DIST / f"ultima-{key}.local.html").write_text("<!doctype html>\n<html lang=\"id\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\"></head><body>\n" + html + "\n</body></html>", encoding="utf-8")
        out = DIST / f"Lembar-Kerja-Ultima-{key.upper()}.xlsx"
        build_workbook(d, out)
        print(f"[{key}] {len(html) // 1024} KB page, worksheet {out.name}")


if __name__ == "__main__":
    main()
