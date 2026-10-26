"""Builds index.html from template.html and the saved Sozo test answers.

Run from the repository root: python3 experiments/report-v2-poc/build.py
No network calls; it reads experiments/dataforseo-sozo/results/answers/SUMMARY.md.
"""

import json
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

HERE = Path(__file__).parent
SOURCE = HERE.parent / "dataforseo-sozo/results/answers/SUMMARY.md"

# The judgement for each answer, read by hand (see the PR for the reasoning).
# ChatGPT 1-5, Google 6-10. "cited" = sozoskinclinic.com is a source but the
# name is not in the text; "noaio" = Google returned no AI Overview text.
STATUS = {
    1: "mentioned", 2: "none", 3: "none", 4: "recommended", 5: "mentioned",
    6: "noaio", 7: "cited", 8: "cited", 9: "none", 10: "mentioned",
}
BRAND = {5, 10}

COMPETITORS = [
    {"name": "Sozo Skin Clinic", "logo": True, "you": True, "full": True, "domain": "sozoskinclinic.com", "chatgpt": 3, "google": 1, "cited": 2, "rec": 1,
     "rating": "Kelapa Gading 4,7 (222 ulasan) · Tebet 4,8 (137 ulasan)",
     "why": "banyak cabang hingga luar Jawa, promo mulai Rp199 ribu, cocok untuk facial dasar"},
    {"name": "ERHA", "full": True, "domain": "erhaultimate.co.id", "chatgpt": 2, "google": 3, "rec": 2,
     "why": "dokter spesialis kulit (Sp.D.V.E), 100+ cabang, kuat untuk jerawat, flek, dan rambut"},
    {"name": "ZAP Clinic", "logo": True, "full": True, "domain": "zapclinic.com", "chatgpt": 1, "google": 2, "rec": 1,
     "why": "laser dan hair removal dengan teknologi modern, 60+ cabang"},
    {"name": "Bening's Clinic", "match": ["Bening's Clinic", "Bening's"], "full": True, "domain": "beningsclinic.com", "chatgpt": 0, "google": 2, "rec": 0,
     "why": "perawatan glow dan laser, skincare racikan dokter, 66+ cabang"},
    {"name": "K Young", "domain": None, "chatgpt": 1, "google": 0, "rec": 1,
     "why": "konsultasi dokter; D2PL untuk flek lebih murah daripada Pico"},
    {"name": "C Derma", "logo": True, "full": True, "domain": "cderma.id", "chatgpt": 1, "google": 0, "rec": 1,
     "why": "filler dan botox ditangani dokter spesialis kulit dan estetika"},
    {"name": "Bamed Clinic", "logo": True, "match": ["Bamed Clinic", "Bamed"], "full": True, "domain": "klinikbamed.com", "chatgpt": 1, "google": 0, "rec": 1,
     "why": "profil dokter lengkap: spesialis lulusan UI, anggota PERDOSKI"},
    {"name": "Diri Clinic", "domain": "diricare.com", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "RS Royal Progress", "domain": None, "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "Primavita Clinic", "match": ["Primavita Clinic", "Primavita"], "domain": "primavitaclinic.co.id", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "Aveia Health Skin Clinic", "match": ["Aveia Health Skin Clinic", "Aveia"], "domain": "aveiaclinic.com", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "NMW Aesthetic Clinic", "match": ["NMW Aesthetic Clinic", "NMW"], "domain": "nmwclinic.co.id", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "Amala Clinic", "match": ["Amala Clinic", "Amala"], "domain": "amalaclinic.com", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "RSUD Pasar Minggu", "domain": "rsudpasarminggu.jakarta.go.id", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "RSUD Budhi Asih", "domain": "rsudbudhiasih.jakarta.go.id", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "Natasha Skin Clinic", "match": ["Natasha Skin Clinic", "Natasha"], "domain": None, "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "SuperSkin Clinic", "match": ["SuperSkin Clinic", "SuperSkin"], "domain": "superskinme.id", "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "Naavagreen", "domain": None, "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "Larissa Aesthetic Center", "match": ["Larissa Aesthetic Center", "Larissa"], "domain": None, "chatgpt": 1, "google": 0, "rec": 1, "why": ""},
    {"name": "Farla Infinite", "match": ["Farla Infinite", "Farla"], "domain": "farla.id", "chatgpt": 1, "google": 0, "rec": 0, "why": ""},
    {"name": "Fabella Beauty Clinic", "match": ["Fabella Beauty Clinic", "Fabella"], "domain": None, "chatgpt": 1, "google": 0, "rec": 0, "why": ""},
    {"name": "Dermaster", "domain": None, "chatgpt": 0, "google": 1, "rec": 0, "why": ""},
    {"name": "Jakarta Aesthetic Clinic", "match": ["Jakarta Aesthetic Clinic", "JAC"], "domain": None, "chatgpt": 0, "google": 1, "rec": 0, "why": ""},
    {"name": "Miracle Aesthetic Clinic", "match": ["Miracle Aesthetic Clinic", "Miracle"], "domain": None, "chatgpt": 0, "google": 1, "rec": 0, "why": ""},
]


def clean_url(url: str) -> str:
    parts = urlsplit(url)
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if not k.startswith("utm_")])
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))


def blocks(section: str):
    """Yields (question, body, sources) for each '### N. question' block."""
    for match in re.finditer(r"^### (\d+)\. (.+?)\n(.*?)(?=^### \d+\. |\Z)", section, re.S | re.M):
        body = match.group(3)
        sources = []
        if "\nSources:" in body:
            body, tail = body.split("\nSources:", 1)
            for line in tail.splitlines():
                found = re.match(r"- (.*) (https?://\S+)$", line.strip())
                if found:
                    url = clean_url(found.group(2))
                    sources.append({"title": found.group(1).strip(), "url": url,
                                    "domain": urlsplit(url).netloc.removeprefix("www.")})
        # Drop the test's own status line ("Mentions Sozo: …").
        lines = [l for l in body.strip().splitlines() if not re.match(r"^(Mentions Sozo|AI Overview shown):", l)]
        text = "\n".join(lines).strip()
        text = re.sub(r"\(\[([^\]]+)\]\((https?://[^)]+)\)\)", lambda m: f"([{m.group(1)}]({clean_url(m.group(2))}))", text)
        yield match.group(2).strip(), text, sources


def main():
    summary = SOURCE.read_text(encoding="utf-8")
    chatgpt_part = summary.split("## ChatGPT", 1)[1].split("## Google AI Overview", 1)[0]
    google_part = summary.split("## Google AI Overview", 1)[1].split("\n## Cost", 1)[0]
    questions = []
    for source, part in (("chatgpt", chatgpt_part), ("google", google_part)):
        for question, text, sources in blocks(part):
            n = len(questions) + 1
            if source == "google":
                question = question[0].upper() + question[1:]
            questions.append({"n": n, "source": source, "q": question, "brand": n in BRAND,
                              "status": STATUS[n], "answer": text, "sources": sources})
    assert len(questions) == 10, len(questions)
    data = json.dumps({"questions": questions, "competitors": COMPETITORS}, ensure_ascii=False).replace("</", "<\\/")
    html = (HERE / "template.html").read_text(encoding="utf-8").replace("__DATA__", data)
    (HERE / "index.html").write_text(html, encoding="utf-8")
    print(f"index.html: {len(html) // 1024} KB, {len(questions)} questions")


if __name__ == "__main__":
    main()
