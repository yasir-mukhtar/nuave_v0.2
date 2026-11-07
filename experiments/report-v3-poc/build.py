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

import json
import re
import runpy
import sys
from pathlib import Path

HERE = Path(__file__).parent
DIST = HERE / "dist"
VALID = {"recommended", "mentioned", "cited", "none", "noaio", "failed", "notasked"}


def load(name):
    # Always from the source text: a cached .pyc can be stale when a data file is edited twice within
    # a second at the same size, and the checks would then pass or fail on old data.
    return runpy.run_path(str(HERE / "data" / f"{name}.py"), run_name=name)["DATA"]


def norm(text):
    """Text as a reader sees it: no Markdown emphasis, single spaces, lower case."""
    return re.sub(r"\s+", " ", text.replace("**", "").replace("*", "")).strip().lower()


PLAYBOOK = HERE.parents[1] / "docs/content/report/PLAYBOOK.md"
# Words that make a claim about safety, licensing or medical supervision.
# Such a claim is shown only as what AI said, with no verdict (plan §4).
SAFETY = re.compile(r"\b(aman|keamanan|bpom|izin|berizin|perizinan|sertifikat\w*|bersertifikasi|tersertifikasi|terdaftar|lisensi|berlisensi|legal|legalitas|str|sip|pengawasan dokter)\b", re.I)
# Fixed product texts a report may quote besides the evidence.
FIXED = ["Apa yang membuat bisnis Anda berbeda?", "Ada info yang sering salah ditulis AI?",
         # the report's own section names and labels, which its prose may refer to
         "Apa yang ditampilkan halaman mereka", "Tidak terdeteksi", "Ada", "tidak ada", "Cek fakta",
         "Bahan siap pakai", "Untuk tim web Anda", "Salin daftar kerja", "Unduh Lembar Kerja"]
NOT_PROSE = {"answer", "quote", "q", "sources", "url", "ref_url", "text_kit"}
MAX_FACT_ROWS = 8   # plan P1.2: the report shows at most eight fact rows
MAX_MOMENT = 5      # plan P0.1: the moment shows the first five names


def playbook_items():
    text = PLAYBOOK.read_text(encoding="utf-8")
    part = text.split("## What a clinic can do", 1)[1].split("\n## ", 1)[0]
    return {int(n) for n in re.findall(r"^(\d+)\. \*\*", part, re.M)}


def strings(node, key=""):
    """Every string the writer wrote for this report: all data except answers, quotes and sources."""
    if key in NOT_PROSE:
        return
    if isinstance(node, str):
        yield key, node
    elif isinstance(node, dict):
        for k, v in node.items():
            if k == "kit":
                for item in v:
                    yield from (("kit_text" if kk == "text" else kk, vv) for kk, vv in item.items() if isinstance(vv, str))
                continue
            yield from strings(v, k)
    elif isinstance(node, list):
        for v in node:
            yield from strings(v, key)


def corpus(d):
    """What a quotation in the report may come from: the answers, the questions, cited
    page titles, the facts' quotes and references, and the site quotes the data lists."""
    parts = list(FIXED) + d.get("site_quotes", [])
    for q in d["questions"]:
        parts.append(q["q"])
        for src in ("chatgpt", "google"):
            a = q.get(src) or {}
            parts.append(a.get("answer", ""))
            parts += [s.get("title", "") for s in a.get("sources", [])]
    for f in d.get("facts", []):
        parts += [f["quote"], f.get("ref_text", "")]
    return norm(" \n ".join(parts))


def check(d, label):
    """The plan's rules, as code. Each failure names the rule it breaks."""
    errors = []
    names = {b["name"]: [b["name"]] + b.get("aliases", []) for b in d["businesses"]}
    for q in d["questions"]:
        for src in ("chatgpt", "google"):
            a = q.get(src)
            if not a:
                continue
            if a["status"] not in VALID:
                errors.append(f"P{q['n']} {src}: bad status {a['status']}")
            text = norm(a.get("answer", ""))
            for n in a.get("named", []) + a.get("rec", []):
                if n not in names:
                    errors.append(f"P{q['n']} {src}: '{n}' is not in businesses")
                elif not any(norm(alias) in text for alias in names[n]):
                    errors.append(f"P{q['n']} {src}: '{n}' is listed as named but does not appear in the answer")
            for n in a.get("rec", []):
                if n not in a.get("named", []):
                    errors.append(f"P{q['n']} {src}: '{n}' recommended but not named")
    facts = d.get("facts", [])
    for f in facts:
        q = next(x for x in d["questions"] if x["n"] == f["n"])
        if norm(f["quote"]) not in norm((q.get(f["source"]) or {}).get("answer", "")):
            errors.append(f"fact quote not in P{f['n']} {f['source']}: {f['quote'][:50]}")
        if f["verdict"] not in ("berbeda", "sesuai", "tidak_bisa_dicek", "tanpa_penilaian"):
            errors.append(f"fact {f['quote'][:30]}: bad verdict {f['verdict']}")
        if (SAFETY.search(f["quote"]) or f["topic"].lower().startswith("keamanan")) and f["verdict"] != "tanpa_penilaian":
            errors.append(f"safety or licensing claim with a verdict: {f['quote'][:50]}")
        if f["verdict"] == "tanpa_penilaian" and ("“" in f.get("ref_text", "") or not f.get("ref_text", "").startswith("Nuave tidak menilai")):
            errors.append(f"a claim with no verdict must not be set against a reference: {f['quote'][:50]}")
    shown = [f for f in facts if f.get("show", True)]
    if len(shown) > MAX_FACT_ROWS:
        errors.append(f"{len(shown)} fact rows shown (plan P1.2 allows {MAX_FACT_ROWS})")
    mo = d.get("moment")
    if mo:
        a = next(x for x in d["questions"] if x["n"] == mo["n"])[mo["source"]]
        if len(mo["list"]) > MAX_MOMENT:
            errors.append(f"moment lists {len(mo['list'])} names (plan P0.1 shows {MAX_MOMENT})")
        for it in mo["list"]:
            if it["name"] not in a.get("named", []):
                errors.append(f"moment lists '{it['name']}', not named in that answer")
    items = playbook_items()
    for r in d["recs"]:
        if r["item"] not in items:
            errors.append(f"recommendation uses item {r['item']}, which is not in PLAYBOOK.md")
        if r["item"] not in d["playbook"]:
            errors.append(f"recommendation uses playbook item {r['item']} with no tags")
        if r["title"].split()[0] in ("Periksa", "Pertahankan", "Pertimbangkan", "Pastikan"):
            errors.append(f"recommendation title starts with a banned verb: {r['title']}")
    desc = d.get("description") or {}
    if desc.get("words"):
        # Plan P2.3: the words AI attaches to the clinic are counted by code, on lines that name the clinic
        # (a list heading does not count); rule 4: the note names the source, the denominator and the
        # answers. Each word lists the answers that use it: the pattern must be on a line naming the clinic
        # in each of them, and on no such line in the other answers of the pool.
        src = desc.get("words_source", "chatgpt")
        own = [d["meta"]["clinic"], d["meta"].get("short", "")] + d["meta"].get("aliases", [])
        own = [n.lower() for n in own if n]
        pool = {q["n"]: q[src] for q in d["questions"]
                if not q.get("brand") and (q.get(src) or {}).get("status") in ("mentioned", "recommended")}
        unit = {"chatgpt": "jawaban ChatGPT", "google": "ringkasan Google"}[src]
        note = desc.get("words_note", "")
        if f"dari {len(pool)} {unit}" not in note:
            errors.append(f"words_note must say 'dari {len(pool)} {unit}' (rule 4: source and denominator)")
        listed = re.search(r"\((P\d+(?:, P\d+)*)\)", note)
        if not listed or {int(x[1:]) for x in listed.group(1).split(", ")} != set(pool):
            errors.append(f"words_note must list the answers counted: ({', '.join(f'P{n}' for n in sorted(pool))})")
        def own_lines(a):
            return [l for l in a.get("answer", "").split("\n") if any(o in l.lower() for o in own)]
        for w, where, pattern in desc["words"]:
            rx = re.compile(pattern, re.I)
            for n in where:
                if n not in pool:
                    errors.append(f"word '{w}': P{n} is not a {src} answer that names the clinic")
                elif not any(rx.search(l) for l in own_lines(pool[n])):
                    errors.append(f"word '{w}': not on a line naming the clinic in P{n} {src}")
            for n, a in pool.items():
                if n in where:
                    continue
                if any(rx.search(l) for l in own_lines(a)):
                    errors.append(f"word '{w}': on a line naming the clinic in P{n} {src}, but not counted")
    known = corpus(d)
    for key, text in strings(d):
        if "—" in text:
            errors.append(f"em dash in {key}: {text[:50]}")
        if key in ("ref_text", "site_quotes", "kit_text"):
            continue
        for quoted in re.findall(r"“([^”]+)”", text) + re.findall(r'"([^"<>]+)"', text):
            if norm(quoted.rstrip(".,")) not in known:
                errors.append(f"quotation in {key} not found in the answers or evidence: “{quoted[:50]}”")
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
