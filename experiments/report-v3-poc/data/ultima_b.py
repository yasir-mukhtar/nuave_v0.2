"""Proof of concept B: real evidence, clinic renamed "Ultima Clinic".

The answers are the saved ChatGPT and Google AI Overview answers from the
Nuave test of 24 October 2026 (experiments/dataforseo-sozo/results/answers/
SUMMARY.md), read at build time. The clinic's name and domain are replaced;
nothing else in the answers changes. Links that would reveal the clinic are
kept as plain text.

The site evidence (claims, verdicts, page facts) comes from 31 plain page
loads on 7 November 2026 (WIB); see ../evidence/NOTES.md. Every fact quote
below is checked by build.py to appear word for word in its answer.

Rules this file follows (plan §4): counts come from statuses, not prose;
questions that name the clinic are shown apart and never counted; safety and
licensing claims get no verdict; opinions in the answers are not fact-checked;
nothing here is invented. Where the test has no data (owner's own words, the
stability sample, search volume for most questions) the report says so.
"""

import json
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[3]
SUMMARY = ROOT / "experiments/dataforseo-sozo/results/answers/SUMMARY.md"
EVIDENCE = Path(__file__).resolve().parents[1] / "evidence/evidence.json"

G_AI = "https://developers.google.com/search/docs/appearance/ai-features"
G_HELP = "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"
G_REV = "https://support.google.com/contributionpolicy/answer/7400114"
G_LOCAL = "https://support.google.com/business/answer/7091"
SITE = "https://ultimaclinic.example"

# ---------------------------------------------------------------- renaming

DOMAINS = [("sozoskinclinic.cloudindo.co.id", "ultimaclinic.cloudindo.example"), ("sozoskinclinic.com", "ultimaclinic.example")]
NAMES = [("SOZO Skin Clinic", "Ultima Clinic"), ("Sozo Skin Clinic", "Ultima Clinic"), ("SOZO SKIN", "ULTIMA"),
         ("Sozo Skin", "Ultima Clinic"), ("Sozo Clinic", "Ultima Clinic"), ("SOZO", "Ultima"), ("Sozo", "Ultima"), ("sozo", "ultima")]


def rename(text):
    for a, b in DOMAINS + NAMES:
        text = text.replace(a, b)
    return text


def clean_url(url):
    parts = urlsplit(url)
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if not k.startswith("utm_")])
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))


def own(url, own_urls):
    return "sozo" in url.lower() or url in own_urls


def relink(text, own_urls):
    """Keeps links to other sites; turns links that reveal the clinic into plain text."""
    text = re.sub(r"\[\[(\d+)\]\]\((https?://[^)\s]+)\)",
                  lambda m: f"[[{m.group(1)}]]" if own(clean_url(m.group(2)), own_urls) else f"[[{m.group(1)}]]({clean_url(m.group(2))})", text)
    return re.sub(r"\[([^\]\[]+)\]\((https?://[^)\s]+)\)",
                  lambda m: m.group(1) if own(clean_url(m.group(2)), own_urls) else f"[{m.group(1)}]({clean_url(m.group(2))})", text)


def blocks(section):
    """Yields (question, text, sources) for each '### N. question' block (as in report-v2-poc)."""
    for match in re.finditer(r"^### (\d+)\. (.+?)\n(.*?)(?=^### \d+\. |\Z)", section, re.S | re.M):
        body, sources = match.group(3), []
        if "\nSources:" in body:
            body, tail = body.split("\nSources:", 1)
            for line in tail.splitlines():
                found = re.match(r"- (.*) (https?://\S+)$", line.strip())
                if found:
                    sources.append((found.group(1).strip(), clean_url(found.group(2))))
        own_urls = {u for t, u in sources if "sozo" in t.lower() or "sozo" in u.lower()}
        lines = [l for l in body.strip().splitlines() if not re.match(r"^(Mentions Sozo|AI Overview shown):", l) and l.strip() != "---"]
        text = relink("\n".join(lines).strip(), own_urls).replace("`", "")
        text = re.sub(r"\n{3,}", "\n\n", text)
        out = []
        for title, url in sources:
            dom = urlsplit(url).netloc.removeprefix("www.")
            hidden = url in own_urls
            out.append({"title": rename(title), "url": "" if hidden else url, "domain": rename(dom)})
        yield rename(match.group(2).strip()), rename(text), out


def load_answers():
    summary = SUMMARY.read_text(encoding="utf-8")
    chatgpt = summary.split("## ChatGPT", 1)[1].split("## Google AI Overview", 1)[0]
    google = summary.split("## Google AI Overview", 1)[1].split("\n## Cost", 1)[0]
    return list(blocks(chatgpt)), list(blocks(google))


CHATGPT, GOOGLE = load_answers()
assert len(CHATGPT) == 5 and len(GOOGLE) == 5

# --------------------------------------------- the reading of each answer
# Status of Ultima in each answer, and the other businesses it names and
# recommends, read by hand (statuses as in report-v2-poc/build.py). P7 lists
# its clinics under the heading "Rekomendasi Klinik Kecantikan Populer di
# Indonesia", so they count as recommended there. P6: Google marked an AI
# Overview as shown but its text was not saved, so the check cannot be judged.

READ = {
    1: ("chatgpt", "mentioned", ["Diri Clinic", "RS Royal Progress", "K Young", "Fabella Beauty Clinic"],
        ["Diri Clinic", "RS Royal Progress", "K Young"]),
    2: ("chatgpt", "none", ["Primavita Clinic", "ERHA", "Aveia Health Skin Clinic", "NMW Aesthetic Clinic", "Farla Infinite", "Amala Clinic"],
        ["Primavita Clinic", "ERHA", "Aveia Health Skin Clinic", "NMW Aesthetic Clinic", "Amala Clinic"]),
    3: ("chatgpt", "none", ["RSUD Pasar Minggu", "RSUD Budhi Asih", "C Derma", "Bamed Clinic"],
        ["RSUD Pasar Minggu", "RSUD Budhi Asih", "C Derma", "Bamed Clinic"]),
    4: ("chatgpt", "recommended", ["SuperSkin Clinic", "Naavagreen", "Larissa Aesthetic Center", "Natasha Skin Clinic", "ZAP Clinic", "ERHA"],
        ["SuperSkin Clinic", "Naavagreen", "Larissa Aesthetic Center", "Natasha Skin Clinic", "ZAP Clinic", "ERHA"]),
    5: ("chatgpt", "mentioned", [], []),
    6: ("google", "failed", [], []),
    7: ("google", "cited", ["ZAP Clinic", "Dermaster", "ERHA", "Bening's Clinic", "Jakarta Aesthetic Clinic", "Miracle Aesthetic Clinic"],
        ["ZAP Clinic", "Dermaster", "ERHA", "Bening's Clinic", "Jakarta Aesthetic Clinic", "Miracle Aesthetic Clinic"]),
    8: ("google", "cited", ["Bening's Clinic", "ZAP Clinic", "ERHA"], []),
    9: ("google", "none", ["ERHA"], []),
    10: ("google", "mentioned", [], []),
}
NOTES = {6: "Google menandai ada AI Overview untuk pertanyaan ini, tetapi teksnya tidak tersimpan dalam data uji, jadi hasilnya tidak dapat dinilai."}
# The product's "Tidak dapat diuji" means a check that failed; P6 did not fail.
LABELS = {6: "Tidak dapat dinilai"}
# Volumes: experiments/dataforseo-sozo/results/discover/SUMMARY.md (Google
# searches a month for P6; DataForSEO's estimate of monthly mentions of the
# topic in AI assistants for P1, P2 and P7). The other questions have none.
TOPIC = {
    1: ("Flek hitam", {"ai_mentions": 3602}), 2: ("Bekas jerawat", {"ai_mentions": 1146}), 3: ("Filler dan botox", {}),
    4: ("Klinik dengan banyak cabang", {}), 5: ("Nama klinik: bagus dan aman?", {"brand": True}),
    6: ("Klinik terdekat", {"volume": 49500}), 7: ("Klinik kecantikan terbaik", {"ai_mentions": 299}),
    8: ("Biaya laser flek hitam", {}), 9: ("Bekas jerawat di klinik", {}), 10: ("Nama klinik: harga", {"brand": True}),
}
BRAND_SUMMARY = {
    5: "ChatGPT menilai Ultima “cukup oke” untuk facial dan perawatan dasar dengan harga promo, mengutip rating dan ulasan dari CariBisnis, lalu menyarankan dokter spesialis untuk kasus berat.",
    10: "Google menulis 14 harga perawatan Ultima dan mengutip Traveloka, tiket.com, Tokopedia, Scribd, dan Instagram untuk harga-harga itu. Sepuluh berbeda dari teks di situs Ultima; enam di antaranya berupa kisaran yang memuat harga situs atau berujung di harga itu.",
}

questions = []
for n in range(1, 11):
    src, status, named, rec = READ[n]
    q, text, sources = (CHATGPT + GOOGLE)[n - 1]
    if src == "google":
        q = q[0].upper() + q[1:]
    topic, extra = TOPIC[n]
    item = {"n": n, "topic": topic, "q": q, **extra}
    if n in BRAND_SUMMARY:
        item["brand_summary"] = BRAND_SUMMARY[n]
    item[src] = {"status": status, "named": named, "rec": rec, "sources": sources, "answer": text}
    if n in NOTES:
        item[src]["note"] = NOTES[n]
    if n in LABELS:
        item[src]["label"] = LABELS[n]
    item["google" if src == "chatgpt" else "chatgpt"] = {"status": "notasked"}
    questions.append(item)

# ------------------------------------------------------------- site quotes
# Text from the clinic's own pages that the report quotes. Each one, and each
# quotation inside a fact's reference, must appear in evidence/evidence.json
# once the clinic is renamed; the check below stops the build otherwise.

SITE_QUOTES = [
    "Saat ini Ultima Clinic memiliki 60 cabang yang tersebar di berbagai kota besar di Indonesia, dan akan terus bertambah.",
    "60+ cabang di Jakarta, Bogor, Depok, Tangerang, Bekasi, Medan, dan Semarang.",
    "70+ Lokasi Klinik Kecantikan",
    "Ultima Clinic adalah jaringan klinik kecantikan premium di Indonesia dengan 78 cabang",
    "80+ cabang tersebar di seluruh Indonesia, siap memberikan perawatan kulit terbaik untukmu",
    "Dilakukan langsung oleh dokter profesional.",
    "ditangani langsung oleh terapis serta Dokter Kecantikan profesional",
    "Seluruh tindakan filler dilakukan langsung oleh dokter tersertifikasi",
    "Info Lengkap Harga Hubungi Admin",
    "Korean Filler Mulai dari Rp3.799.000",
    "RF Wajah 45 Menit Konsultasikan",
    "0 +",
]

# ------------------------------------------------------------- fact check
# From evidence.json claim_checks (C-numbers kept). Opinions and positioning
# (C05, C06, C11, C15, C25, C26, C27) and two trivial claims (C01, C04) are
# left out. Safety, licensing and medical-supervision claims (C16, C18, C19,
# C20) get no verdict and no reference. A price range counts as "berbeda" even
# when one end equals the site's price; the reference then says so.

WEB = "Menurut website Anda"
NOTE = "Catatan Nuave"
NO_VERDICT = "Nuave tidak menilai klaim keamanan, izin, atau mutu layanan."
UNREAD = "belum bisa ditentukan: halaman yang dikutip tidak terbaca oleh Nuave"
TRAVELOKA = "Ringkasan mengutip dua listing Ultima di Traveloka untuk kelompok harga ini. Keduanya menolak dibuka Nuave."
FACIAL = ("Ringkasan mengutip listing Ultima di tiket.com, dua listing di Traveloka, listing Tokopedia, dan dokumen Scribd untuk kelompok harga ini. "
          "tiket.com dan Traveloka menolak dibuka, Tokopedia tidak menjawab, dan teks harga di dokumen Scribd tidak terbaca.")
SCRIBD_IG = "Ringkasan mengutip dokumen Scribd dan unggahan Instagram untuk kelompok harga ini. Unggahan Instagram itu tidak dibuka Nuave, dan teks harga di dokumen Scribd tidak terbaca."
SCRIBD_TOKO = "Ringkasan mengutip dokumen Scribd dan listing Tokopedia untuk kelompok harga ini. Tokopedia tidak menjawab, dan teks harga di dokumen Scribd tidak terbaca."
TOP_END = "Ujung atas kisaran di jawaban sama dengan harga ini."


def fact(c, n, src, topic, verdict, quote, label, ref, page="", seen="", fix="", show=False):
    return {"id": c, "n": n, "source": src, "topic": topic, "verdict": verdict, "quote": quote, "ref_label": label, "ref_text": ref,
            "ref_site": f"ultimaclinic.example{page}" if page else "", "ref_url": f"{SITE}{page}" if page else "",
            "seen_on": seen, "seen_label": "Sumber yang dikutip jawaban", "fix": fix, "show": show}


facts = [
    # berbeda
    fact("C35", 10, "google", "Harga", "berbeda", "Brazilian V Hair Removal: Rp349.000", WEB, "“Brazilian Hair Removal 45 Menit Mulai Rp 1.199.000”", "/treatment/",
         TRAVELOKA, UNREAD, show=True),
    fact("C41", 10, "google", "Harga", "berbeda", "Filler Korean: Rp2.849.000 – Rp2.999.000", WEB,
         "“Korean Filler Mulai dari Rp3.799.000” di halaman filler. Daftar perawatan menulis “Konsultasikan” untuk filler yang sama.", "/injectable-treatment/filler-treatment/",
         SCRIBD_TOKO, "halaman filler dan daftar perawatan Ultima, yang tidak sama satu sama lain", show=True),
    fact("C34", 10, "google", "Harga", "berbeda", "Underarm Hair Removal: Rp199.000", WEB, "“Underarm Removal Treatment 20 Menit Mulai Rp 249.000”", "/treatment/",
         TRAVELOKA, UNREAD, show=True),
    fact("C37", 10, "google", "Harga", "berbeda", "DNA Glow / DNA Salmon: Rp1.499.000", WEB, "“DNA Glow (DNA Salmon) 75 Menit Rp 1.599.000”", "/treatment/",
         SCRIBD_IG, UNREAD),
    fact("C29", 10, "google", "Harga", "berbeda", "Biolight Face / Hair: Rp194.000 – Rp199.000", WEB,
         "“Biolight Hair 70 Menit Mulai Rp 199.000”. " + TOP_END + " Biolight Face tidak ada di daftar, dan Rp194.000 tidak tertulis.", "/treatment/", FACIAL, UNREAD),
    fact("C30", 10, "google", "Harga", "berbeda", "IPL Acne / IPL Glow: Rp199.000 – Rp314.000 (diskon dari ~Rp399.000)", WEB,
         "“IPL Acne 30 Menit Rp 299.000” dan “IPL Glow 30 Menit Rp 299.000”. Harga di situs ada di dalam kisaran jawaban; harga normal Rp399.000 tidak tertulis.", "/treatment/", FACIAL, UNREAD),
    fact("C32", 10, "google", "Harga", "berbeda", "Ultima Signature Facial: Rp499.000 – Rp699.000", WEB, "“Ultima Signature Facial 60 Menit Rp 699.000”. " + TOP_END, "/treatment/",
         FACIAL, UNREAD),
    fact("C33", 10, "google", "Harga", "berbeda", "Acne Laser Facial / Diamond Laser Facial: Rp899.000 – Rp1.499.000", WEB,
         "“Diamond Laser Facial 60 Menit Rp 1.499.000” dan “Acne Laser Facial 60 Menit Rp 1.499.000”. " + TOP_END, "/treatment/", FACIAL, UNREAD),
    fact("C38", 10, "google", "Harga", "berbeda", "Glass Skin / Aqua Shine / Pink Bomb: Rp1.999.000 – Rp2.999.000", WEB,
         "“Glass Skin Booster 75 Menit Rp 2.099.000”, “Aqua Shine Skinbooster 60 Menit Rp 2.599.000”, dan “Ultima Pink Bomb 60 Menit Rp 3.099.000”. Dua dari tiga harga ini ada di dalam kisaran jawaban.",
         "/treatment/", SCRIBD_IG, UNREAD),
    fact("C42", 10, "google", "Harga", "berbeda", "Filler Premium: Rp6.799.000 – Rp6.999.000", WEB, "“Premium Filler Mulai dari Rp6.999.000” di halaman filler. " + TOP_END,
         "/injectable-treatment/filler-treatment/", SCRIBD_TOKO, "halaman filler dan daftar perawatan Ultima, yang tidak sama satu sama lain"),
    # tanpa penilaian (safety, licensing, medical supervision)
    fact("C20", 5, "chatgpt", "Keamanan dan izin", "tanpa_penilaian", "produk yang terdaftar BPOM", NOTE, NO_VERDICT, show=True),
    fact("C19", 5, "chatgpt", "Keamanan dan izin", "tanpa_penilaian", "memakai alat bersertifikasi", NOTE, NO_VERDICT),
    fact("C18", 5, "chatgpt", "Keamanan dan izin", "tanpa_penilaian", "prosedur di bawah pengawasan dokter", NOTE, NO_VERDICT),
    fact("C16", 5, "chatgpt", "Keamanan dan mutu", "tanpa_penilaian", "kualitas layanan tampaknya bisa berbeda antar cabang dan dokter", NOTE, NO_VERDICT),
    # tidak bisa dicek
    fact("C02", 1, "chatgpt", "Harga", "tidak_bisa_dicek", "promo pelanggan baru sekitar Rp499 ribu", NOTE,
         "Promo di situs Ultima berupa gambar, jadi harganya tidak terbaca. Halaman laser menulis: “Perawatan laser wajah di Ultima mulai dari Rp 499.000 saja per titik.”",
         "/skin-treatment/laser-treatment/", show=True),
    fact("C36", 10, "google", "Harga", "tidak_bisa_dicek", "Melasma Skinbooster: Rp499.000", NOTE,
         "Tidak ada perawatan bernama Melasma Skinbooster di 90 perawatan pada daftar harga Ultima.", "/treatment/", SCRIBD_IG, show=True),
    fact("C21", 5, "chatgpt", "Rating dan ulasan", "tidak_bisa_dicek", "Kelapa Gading sekitar 4,7/5 dari 222 ulasan", NOTE,
         "Rating tidak tertulis di halaman Ultima yang dibuka. Halaman CariBisnis yang dikutip jawaban ini menulis 4.7 dan 222 ulasan untuk cabang Kelapa Gading 2.", show=True),
    fact("C31", 10, "google", "Harga", "tidak_bisa_dicek", "Radiofrequency Face: Rp314.000", NOTE, "Daftar perawatan menulis “RF Wajah 45 Menit Konsultasikan”, tanpa harga.", "/treatment/", FACIAL),
    fact("C39", 10, "google", "Harga", "tidak_bisa_dicek", "Botox Standard: Rp599.000 – Rp1.493.900 (tergantung unit/promo)", NOTE,
         "Daftar perawatan menulis botox standar 10u dengan harga “Konsultasikan”.", "/treatment/", SCRIBD_TOKO),
    fact("C40", 10, "google", "Harga", "tidak_bisa_dicek", "Botox Premium: Rp999.000", NOTE, "Daftar perawatan menulis botox premium 10u dengan harga “Konsultasikan”.", "/treatment/", SCRIBD_TOKO),
    fact("C44", 10, "google", "Harga", "tidak_bisa_dicek", "melalui platform seperti Traveloka, Tiket.com, Tokopedia", NOTE,
         "Halaman Ultima yang dibuka tidak menyebut Traveloka, tiket.com, atau Tokopedia. Listing di ketiganya tidak bisa dibuka Nuave."),
    fact("C23", 5, "chatgpt", "Rating dan ulasan", "tidak_bisa_dicek", "Banyak ulasan memuji keramahan dokter/terapis, kebersihan, dan harga yang relatif terjangkau.", NOTE,
         "Isi ulasan tidak ada di halaman Ultima yang dibuka."),
    fact("C24", 5, "chatgpt", "Rating dan ulasan", "tidak_bisa_dicek",
         "Ada ulasan mengenai antrean, miskomunikasi appointment, hasil treatment yang tidak sesuai harapan, serta promo atau harga yang kurang transparan.", NOTE,
         "Isi ulasan tidak bisa dicek di situs Ultima. Jawaban ini mengutip halaman CariBisnis cabang Tebet Timur, yang tidak dibuka Nuave."),
    # sesuai
    fact("C08", 4, "chatgpt", "Cabang dan lokasi", "sesuai", "lebih dari 70 cabang menurut situsnya", WEB,
         "“70+ Lokasi Klinik Kecantikan” di beranda. Situs yang sama juga menulis 60, 60+, 75+, 78, dan 80+.", "/",
         "Jawaban ini mengutip ultimaclinic.cloudindo.example, bukan situs Ultima. Situs itu tidak bisa dibuka Nuave (sertifikatnya kedaluwarsa).", show=True),
    fact("C03", 1, "chatgpt", "Harga", "sesuai", "harga normal sekitar Rp1,199 juta", WEB, "“Pico Laser 45 Menit Rp 1.199.000”", "/treatment/"),
    fact("C14", 4, "chatgpt", "Cabang dan lokasi", "sesuai", "jaringannya mencakup Medan, Makassar, dan kota besar lainnya", WEB,
         "Halaman Lokasi mencantumkan tiga cabang di Medan dan dua di Makassar.", "/lokasi/"),
    fact("C07", 4, "chatgpt", "Harga", "sesuai", "Mulai sekitar Rp199 ribuan untuk promo/treatment tertentu", WEB,
         "“harga khusus mulai dari Rp199.000 di lebih dari 40 cabang di kota-kota besar”", "/",
         "Jawaban ini mengutip ultimaclinic.cloudindo.example, bukan situs Ultima."),
    fact("C09", 4, "chatgpt", "Cabang dan lokasi", "sesuai", "termasuk di luar Jawa", WEB,
         "“hingga ke luar Pulau Jawa seperti klinik kecantikan medan dan klinik kecantikan makassar”", "/"),
    fact("C10", 4, "chatgpt", "Harga", "sesuai", "sering menawarkan promo", WEB, "“Ultima Clinic menyediakan promo dan diskon menarik untuk perawatan kulit dan wajah.”", "/"),
    fact("C12", 4, "chatgpt", "Layanan", "sesuai", "Laser atau hair removal: biasanya ZAP dan Ultima", WEB,
         "“Teknologi Laser & Penghilang Bulu” di beranda; “Laser Hair Removal 30 Menit Mulai Rp 799.000” di daftar perawatan.", "/"),
    fact("C13", 4, "chatgpt", "Cabang dan lokasi", "sesuai", "lebih mudah ditemukan di kota-kota besar", WEB, "“Tersebar di seluruh kota besar di Indonesia.”", "/"),
    fact("C17", 5, "chatgpt", "Cabang dan lokasi", "sesuai", "Ultima mengklaim memiliki banyak cabang", WEB, "“75+ Lokasi beroperasi di Indonesia”", "/tentang-kami/"),
    fact("C22", 5, "chatgpt", "Cabang dan lokasi", "sesuai", "Kelapa Gading sekitar 4,7/5 dari 222 ulasan, Tebet 4,8/5 dari 137 ulasan, dan Rawamangun", WEB,
         "Halaman Lokasi mencantumkan Kelapa Gading Boulevard, Kelapa Gading Summarecon, Tebet, Tebet Timur, dan Rawamangun.", "/lokasi/"),
    fact("C28", 10, "google", "Harga", "sesuai", "mulai dari Rp100 ribuan hingga jutaan rupiah", WEB,
         "Harga terendah di daftar perawatan Rp 149.000 (Mini Facial) dan tertinggi Rp 11.198.000.", "/treatment/"),
    fact("C43", 10, "google", "Harga", "sesuai", "sering tersedia diskon atau paket promo khusus (seperti potongan harga atau voucher first timer)", WEB,
         "“diskon khusus untuk reservasi pertama kali.”", "/"),
    fact("C45", 10, "google", "Harga", "sesuai", "atau langsung di website resmi Ultima Clinic", WEB, "“Promo Klinik Kecantikan Ultima Bulan Ini - Cicilan 0%”", "/promo/"),
]


def _check_site_quotes():
    """Every site quote, and every quotation in a fact's reference, is in the evidence record."""
    def walk(node):
        if isinstance(node, str):
            yield node
        elif isinstance(node, dict):
            for v in node.values():
                yield from walk(v)
        elif isinstance(node, list):
            for v in node:
                yield from walk(v)
    evidence = rename(" \n ".join(walk(json.loads(EVIDENCE.read_text(encoding="utf-8")))))
    wanted = list(SITE_QUOTES) + [q for f in facts for q in re.findall(r"“([^”]+)”", f["ref_text"])]
    missing = [q for q in wanted if q.rstrip(".") not in evidence]
    assert not missing, f"site quotes not in evidence.json: {missing}"


_check_site_quotes()

# ------------------------------------------------------------------- data

DATA = {
    "meta": {
        "clinic": "Ultima Clinic", "short": "Ultima", "aliases": ["Ultima"], "site": "ultimaclinic.example", "city": "Jakarta",
        "date": "24 Oktober 2026", "places": "dari Indonesia; situs dibuka 7 November 2026",
        "poc_label": "Proof of concept B",
        "poc_note": "Jawaban AI dan isi situs nyata, dari uji Nuave untuk satu klinik di Jakarta. Nama klinik diganti menjadi Ultima Clinic. Setiap klaim di halaman ini punya bukti.",
        "footer": "Proof of concept B untuk persetujuan rencana Laporan v3. Data nyata dengan nama klinik disamarkan, bukan laporan pelanggan.",
        "file_note": "Di produk, tombol ini mengunduh file. Di proof of concept ini, PDF dan Lembar Kerja dikirim terpisah.",
    },
    "site_quotes": SITE_QUOTES,
    "verdict": "ChatGPT menyebut Ultima di 2 dari 4 jawaban, sebagai jaringan cabang dengan harga promo. Di 3 ringkasan Google untuk pertanyaan umum, nama Ultima tidak muncul, walau dua artikel blognya dikutip.",
    "questions": questions,
    "moment": {
        "n": 2, "source": "chatgpt",
        "list": [
            {"name": "Primavita Clinic", "why": "Tebet; Dermalpunch mulai Rp1 juta"},
            {"name": "ERHA", "why": "ERHA Ultimate SCBD; mulai sekitar Rp1,385 juta"},
            {"name": "Aveia Health Skin Clinic", "why": "Mampang; sekitar Rp570 ribu sampai Rp2,45 juta"},
            {"name": "NMW Aesthetic Clinic", "why": "Petogogan; terapi khusus bekas jerawat cekung"},
            {"name": "Farla Infinite", "why": "Cilandak; CO₂ laser dan RF microneedling"},
        ],
        "caption": "Beranda Ultima mencantumkan lima cabang di Jakarta Selatan. Untuk pertanyaan ini, ChatGPT menyebut enam klinik lain, dan Ultima tidak disebut; audit ini tidak membuktikan mengapa.",
    },
    "stability": {"note_only": "Belum ada contoh kestabilan: uji ini punya satu jawaban per pertanyaan. Di produk, tiga pertanyaan ditanyakan dua kali lagi pada hari yang sama."},
    "brand_note": "Dua pertanyaan uji menyebut nama klinik. Jawabannya tidak dihitung di kartu dan peta pesaing, tetapi klaimnya ikut dicek. Di produk, pertanyaan seperti ini menunggu keputusan F-4 dan, tidak seperti P5, tidak pernah menanyakan keamanan.",
    "findings_lede": "Lima hal yang tidak terlihat dari angka saja.",
    "findings": [
        {"num": "0 dari 3", "cap": "ringkasan Google untuk pertanyaan umum yang menyebut Ultima",
         "title": "Google mengutip blog Ultima, tetapi tidak menyebut namanya",
         "text": "Dua dari tiga ringkasan Google yang tampil mengutip artikel blog Ultima. Untuk “apa klinik kecantikan terbaik di indonesia”, artikel daftar klinik di blog Ultima dikutip pada penjelasan tentang klinik lain, Jakarta Aesthetic Clinic. Untuk biaya laser flek hitam, artikel rincian harga perawatan di blog yang sama dikutip pada bagian faktor biaya. Nama Ultima tidak muncul di teks kedua ringkasan; yang disebut adalah ZAP Clinic, ERHA, Bening's Clinic, dan tiga klinik lain.",
         "refs": [7, 8]},
        {"num": "10 dari 14", "cap": "harga di ringkasan Google yang berbeda dari teks situs Ultima",
         "title": "Saat nama Ultima ditanyakan, Google mengutip situs lain untuk harganya",
         "text": "Untuk “berapa biaya treatment di ultima”, ringkasan Google menulis 14 harga perawatan dan mengutip Traveloka, tiket.com, Tokopedia, Scribd, dan Instagram untuk harga-harga itu; situs Ultima baru dikutip di catatan penutupnya. Sepuluh harga berbeda dari teks di situs Ultima, misalnya Brazilian V Hair Removal Rp349.000, sedangkan daftar harga Ultima menulis mulai Rp1.199.000. Enam dari sepuluh itu berupa kisaran yang memuat harga di situs atau berujung di harga itu, misalnya Ultima Signature Facial Rp499.000 sampai Rp699.000, sedangkan situs menulis Rp699.000. Empat harga lainnya tidak bisa dicek: situs tidak menulis harganya, atau perawatannya tidak ada di daftar.",
         "refs": [10]},
        {"num": "0 dari 3", "cap": "halaman perawatan Ultima yang menyebut nama dokter",
         "title": "Untuk kasus berat, ChatGPT menyarankan dokter spesialis, tanpa menyebut dokter Ultima",
         "text": "Di P5, ChatGPT menilai Ultima cocok untuk facial dan perawatan ringan, lalu menulis: “saya lebih menyarankan konsultasi ke dokter spesialis kulit dan kelamin (Sp.D.V.E.) atau klinik yang transparan soal dokter dan alatnya.” Halaman tim dokter Ultima mencantumkan lima dokter dengan nomor STR, dua di antaranya Sp.D.V.E, tetapi halaman laser, bopeng, dan filler yang dibaca Nuave tidak menyebut nama dokter yang menangani. Untuk filler pertama kali (P3), ChatGPT menulis bahwa ia memilih tempat yang injeksinya dilakukan dokter spesialis. Audit ini tidak membuktikan bahwa isi halaman itu memengaruhi jawaban ChatGPT.",
         "refs": [3, 5]},
        {"num": "6", "cap": "angka jumlah cabang di situs Ultima",
         "title": "Situs Ultima menulis enam angka jumlah cabang",
         "text": "Beranda menulis “60 cabang”, “60+ cabang”, dan “70+ Lokasi”; data terstruktur di beranda menulis 78 cabang; halaman Tentang Kami menulis 75+; halaman Lokasi menulis “80+ cabang” dan memuat 81 cabang. ChatGPT menulis “lebih dari 70 cabang menurut situsnya” dan mengutip situs lain yang memakai nama Ultima, yang tidak bisa dibuka Nuave. Angka yang berlaku hanya Ultima yang tahu.",
         "refs": [4, 5]},
        {"num": "2 dari 4", "cap": "jawaban ChatGPT yang menyebut Ultima",
         "title": "Di P4, ChatGPT merekomendasikan Ultima sebagai jaringan cabang dengan harga promo",
         "text": "Di P4, ChatGPT merekomendasikan Ultima untuk facial dan perawatan dasar yang hemat, untuk laser dan hair removal di kota besar, dan untuk pilihan di luar Pulau Jawa. Di P1, Ultima ada di tabel klinik flek hitam dengan harga promo pico laser, tetapi saran akhirnya RS Royal Progress, K Young, dan Diri Clinic. Untuk bekas jerawat di Jakarta Selatan (P2) dan filler pertama kali (P3), Ultima tidak disebut.",
         "refs": [1, 2, 3, 4]},
    ],
    "facts_lede": "Klaim tentang Ultima di jawaban AI, dibandingkan dengan teks di situs Ultima. Nuave membandingkan; Nuave tidak menilai mana yang benar. Pendapat dan saran di jawaban tidak dicek, dan klaim keamanan atau izin tidak diberi penilaian.",
    "facts": facts,
    "businesses": [
        {"name": "Ultima Clinic", "domain": "ultimaclinic.example", "rating": "Kelapa Gading 2: 4,7 (222 ulasan) menurut CariBisnis", "full": True,
         "why": "cabang banyak sampai luar Jawa, harga promo mulai sekitar Rp199 ribu, untuk facial dan perawatan dasar"},
        {"name": "ERHA", "aliases": ["ERHA Ultimate", "ERHA Clinic"], "domain": "erhaultimate.co.id", "full": True,
         "why": "dokter spesialis kulit (Sp.D.V.E), lebih dari 100 cabang, untuk jerawat, flek, dan rambut"},
        {"name": "ZAP Clinic", "aliases": ["ZAP"], "full": True, "why": "laser dan hair removal dengan teknologi modern, lebih dari 60 cabang"},
        {"name": "Bening's Clinic", "aliases": ["Bening's"], "full": True, "why": "perawatan glow dan laser, skincare racikan dokter, lebih dari 66 cabang"},
        {"name": "C Derma", "domain": "cderma.id", "rating": "4,9 dari 453+ ulasan Google, menurut situsnya", "full": True,
         "why": "filler dan botox ditangani dokter spesialis kulit, kelamin, dan estetika"},
        {"name": "Bamed Clinic", "aliases": ["Bamed"], "domain": "klinikbamed.com", "full": True,
         "why": "profil dokter dengan pendidikan spesialis dari UI dan keanggotaan PERDOSKI"},
        {"name": "RSUD Pasar Minggu", "domain": "rsudpasarminggu.jakarta.go.id", "why": "ditangani dokter spesialis Dermatologi dan Venereologi"},
        {"name": "RSUD Budhi Asih", "domain": "rsudbudhiasih.jakarta.go.id", "why": "injeksi Botox dan filler oleh tim dokter spesialis"},
        {"name": "Diri Clinic", "domain": "diricare.com", "why": "Pico Pro Laser mulai Rp499 ribu"},
        {"name": "RS Royal Progress", "why": "Laser Spot Pigment Rp599 ribu"},
        {"name": "K Young", "why": "D2PL untuk flek lebih murah daripada Pico"},
        {"name": "Fabella Beauty Clinic", "aliases": ["Fabella"], "why": "Pigmented Laser mulai sekitar Rp899 ribu untuk member"},
        {"name": "Primavita Clinic", "aliases": ["Primavita"], "domain": "primavitaclinic.co.id", "why": "Dermalpunch mulai Rp1 juta"},
        {"name": "Aveia Health Skin Clinic", "aliases": ["Aveia"], "domain": "aveiaclinic.com", "why": "peeling dan laser untuk bekas luka"},
        {"name": "NMW Aesthetic Clinic", "aliases": ["NMW"], "domain": "nmwclinic.co.id", "why": "terapi khusus bekas jerawat cekung"},
        {"name": "Farla Infinite", "domain": "farla.id", "why": "CO₂ laser dan RF microneedling"},
        {"name": "Amala Clinic", "aliases": ["Amala"], "domain": "amalaclinic.com", "why": "laser resurfacing untuk tekstur dan bopeng"},
        {"name": "SuperSkin Clinic", "aliases": ["SuperSkin"], "domain": "superskinme.id", "why": "sekitar 22 cabang di Jawa, sering promo"},
        {"name": "Naavagreen", "aliases": ["Naavagreen Natural Skin Care"], "why": "budget-friendly, facial dan perawatan jerawat"},
        {"name": "Larissa Aesthetic Center", "aliases": ["Larissa"], "why": "perawatan rutin dengan biaya lebih rendah"},
        {"name": "Natasha Skin Clinic", "aliases": ["Natasha"], "why": "jaringan lama dengan banyak cabang"},
        {"name": "Dermaster", "aliases": ["Dermaster Klinik Indonesia"], "why": "kontur wajah dan tanam benang"},
        {"name": "Jakarta Aesthetic Clinic", "aliases": ["JAC"], "why": "anti-aging, botox, dan filler"},
        {"name": "Miracle Aesthetic Clinic", "why": "facial reshaping, beroperasi sejak 1996"},
    ],
    "comp_lede": "ERHA disebut di kedua sumber: 2 dari 4 jawaban ChatGPT dan 3 dari 3 ringkasan Google. Ultima disebut di ChatGPT saja, sama seringnya dengan ERHA.",
    "takeaways": [
        {"title": "Dokter jadi alasan", "text": "Untuk filler pertama kali, ChatGPT menjelaskan keempat tempat yang disarankannya lewat dokter spesialisnya."},
        {"title": "Harga yang dipublikasikan", "text": "Untuk bekas jerawat di Jakarta Selatan, ChatGPT menulis harga yang dipublikasikan empat dari enam klinik, dengan tautan ke halaman mereka."},
        {"title": "Artikel daftar tanpa Ultima", "text": "“7 Klinik Kecantikan dengan Cabang Terbanyak” di hadirr.com dikutip di P4 dan P7. Ultima tidak ada di dalamnya."},
    ],
    "description": {
        "lede": "Kata-kata yang dipakai AI untuk Ultima, dibandingkan dengan yang ditonjolkan situs Ultima.",
        "ai_line": "Jaringan klinik dengan banyak cabang dan harga promo, cocok untuk facial dan perawatan dasar.",
        "words": [["promo", 2], ["laser", 2], ["terjangkau", 2], ["facial", 1], ["cabang banyak", 1], ["luar Jawa", 1], ["dokter spesialis", 0]],
        "words_note": "Angka: berapa dari dua jawaban yang menyebut Ultima tanpa ditanya namanya (P1, P4) memakai kata itu untuk Ultima.",
        "owner_head": "Menurut situs Anda",
        "owner_line": "Perawatan premium dengan harga terjangkau, oleh dokter estetika dan dokter spesialis kulit (Sp.DVE) berlisensi, di lebih dari 70 lokasi.",
        "owner_src": "Dirangkum dari beranda dan halaman Tentang Kami. Data uji ini tidak punya jawaban pemilik untuk “Apa yang membuat bisnis Anda berbeda?”.",
        "gap": "Di dua jawaban itu, AI memakai “promo”, “terjangkau”, dan “laser” untuk Ultima. “Dokter spesialis”, yang ditonjolkan situs Ultima, tidak dipakai untuk Ultima di jawaban mana pun.",
        "rivals": [
            {"name": "ERHA", "line": "dokter spesialis kulit, lebih dari 100 cabang, untuk jerawat, flek, dan rambut"},
            {"name": "ZAP Clinic", "line": "laser dan hair removal, lebih dari 60 cabang"},
            {"name": "C Derma", "line": "filler dan botox oleh dokter spesialis kulit, kelamin, dan estetika"},
        ],
    },
    "pages_grid": {
        "lede": "Halaman yang dikutip AI untuk bekas jerawat, filler, dan harga, dibandingkan dengan halaman Ultima.",
        "columns": [{"name": "Ultima Clinic", "page": "halaman bopeng", "you": True}, {"name": "Ultima Clinic", "page": "halaman filler", "you": True},
                    {"name": "Ultima Clinic", "page": "halaman tim dokter", "you": True},
                    {"name": "ERHA", "page": "artikel laser bekas jerawat"}, {"name": "C Derma", "page": "harga facial"}, {"name": "Bamed", "page": "profil dokter"}],
        "rows": [
            {"label": "Nama dokter dengan gelar", "cells": [False, False, True, False, True, True]},
            {"label": "Nomor SIP atau STR", "cells": [False, False, "STR saja", False, False, False]},
            {"label": "Harga atau kisaran harga", "cells": [False, True, False, "kisaran pasar umum", True, False]},
            {"label": "Pertanyaan pasien dijawab", "cells": [True, True, False, True, True, False]},
            {"label": "Proses atau waktu pemulihan", "cells": ["proses saja", True, False, True, True, False]},
            {"label": "Tanggal pembaruan", "cells": [False, False, False, "tanggal tanpa keterangan", True, False]},
        ],
        "note": "Tidak ada nomor SIP di halaman mana pun yang dibuka. Harga di artikel ERHA adalah kisaran pasar umum, bukan daftar harga ERHA. Ini perbedaan isi halaman, bukan alasan AI memilih mereka; audit ini tidak bisa membuktikan sebab. “Tidak terdeteksi” berarti tidak ditemukan di halaman yang dibaca Nuave.",
    },
    "topics_lede": "Empat topik yang jawabannya tidak merekomendasikan Ultima.",
    "topics": [
        {"name": "Bekas jerawat dan bopeng", "ai_mentions": 1146, "status": "Tidak disebut di ChatGPT (P2) maupun Google (P9). Halaman bopeng Ultima tidak menulis harga.",
         "sources": "primavitaclinic.co.id, erhaultimate.co.id, aveiaclinic.com, alodokter.com", "refs": [2, 9]},
        {"name": "Filler dan botox pertama kali", "others": 4, "status": "Tidak disebut di ChatGPT. Empat tempat yang disarankan dijelaskan lewat dokter spesialisnya.",
         "sources": "rsudpasarminggu.jakarta.go.id, cderma.id, klinikbamed.com, perdoski.id", "refs": [3]},
        {"name": "Klinik kecantikan terbaik", "ai_mentions": 299, "status": "Tidak disebut di Google. Artikel daftar klinik di blog Ultima dikutip pada penjelasan tentang klinik lain.",
         "sources": "hadirr.com, koranindopos.com, ultimaclinic.example", "refs": [7]},
        {"name": "Biaya laser flek hitam", "others": 7, "status": "Tidak disebut di Google; artikel harga di blog Ultima dikutip. Di ChatGPT (P1), Ultima disebut dengan harga pico laser, tanpa masuk saran akhir.",
         "sources": "erhaultimate.co.id, klinikmagna.com, hdmall.id, ultimaclinic.example", "refs": [1, 8]},
    ],
    "sitemap": {
        "lede": "Situs yang dikutip ChatGPT dan Google di sepuluh pertanyaan ini, dan apakah Ultima ada di sana. Langkah berikut hanya untuk direktori, listing, dan portal kesehatan.",
        "groups": [
            {"name": "Situs Ultima", "sites": [
                {"domain": "ultimaclinic.example", "title": "beranda, Tentang Kami, dua artikel blog", "present": "Situs Anda", "present_cls": "acc",
                 "action": "Dua artikel blog dikutip Google tanpa nama Ultima (P7, P8)."},
                {"domain": "ultimaclinic.cloudindo.example", "title": "situs lain dengan judul beranda Ultima", "present": "Tidak bisa dibuka", "present_cls": "warn",
                 "action": "Dikutip ChatGPT untuk jumlah cabang dan harga (P4). Sertifikatnya kedaluwarsa, jadi isinya tidak diperiksa."},
            ]},
            {"name": "Listing dan marketplace", "sites": [
                {"domain": "traveloka.com", "title": "listing cabang Kemang, Pondok Bambu, dan Puri Indah (P10); halaman kategori klinik (P4)", "present": "Ada, tidak terbaca", "present_cls": "warn",
                 "action": "Cocokkan harga dengan daftar harga situs (Rekomendasi 4)."},
                {"domain": "tiket.com", "title": "listing cabang Tanjung Barat", "present": "Ada, tidak terbaca", "present_cls": "warn", "action": "Cocokkan harga dengan daftar harga situs."},
                {"domain": "tokopedia.com", "title": "toko Ultima, Acne Laser Facial", "present": "Ada, tidak terbaca", "present_cls": "warn", "action": "Cocokkan harga dengan daftar harga situs."},
                {"domain": "caribisnis.id", "title": "listing cabang Kelapa Gading 2 dan Tebet Timur", "present": "Ada, jam buka berbeda", "present_cls": "warn",
                 "action": "Jam buka cabang Kelapa Gading 2 berbeda dari situs; halaman Tebet Timur tidak dibuka. Minta koreksi jam buka; teks emailnya ada di Bahan siap pakai."},
                {"domain": "id.scribd.com", "title": "dokumen daftar harga Ultima, unggahan pengguna", "present": "Ada, tanpa tanggal", "present_cls": "warn",
                 "action": "Tanpa langkah otomatis: dokumen unggahan pengguna, bukan direktori."},
            ]},
            {"name": "Portal kesehatan dan organisasi profesi", "sites": [
                {"domain": "alodokter.com", "title": "dua artikel cara menghilangkan bekas jerawat", "present": "Tidak disebut di artikel yang dibuka (1 dari 2)", "present_cls": "bad",
                 "action": "Daftar: buat profil klinik dan dokter, bila portal menyediakan direktori."},
                {"domain": "perdoski.id", "title": "direktori dokter spesialis kulit", "present": "Belum diperiksa", "present_cls": "",
                 "action": "Cek apakah dokter Sp.D.V.E Ultima ada di direktori ini. ChatGPT menyarankannya untuk memverifikasi dokter (P3)."},
                {"domain": "hdmall.id", "title": "artikel laser flek hitam", "present": "", "action": ""},
            ]},
            {"name": "Artikel daftar dan media", "sites": [
                {"domain": "hadirr.com", "title": "7 Klinik Kecantikan dengan Cabang Terbanyak", "present": "Ultima tidak disebut", "present_cls": "bad",
                 "action": "Tanpa langkah: Nuave tidak menyarankan meminta masuk daftar “terbaik”."},
                {"domain": "suara.com", "title": "biaya laser flek hitam (dibuka); rekomendasi klinik 2023 (tidak dibuka)", "present": "Tidak disebut di artikel yang dibuka", "present_cls": "bad", "action": ""},
                {"domain": "koranindopos.com", "title": "rekomendasi klinik kecantikan terbaik", "present": "", "action": ""},
                {"domain": "wartaevent.com", "title": "rekomendasi klinik kecantikan", "present": "", "action": ""},
            ]},
            {"name": "Media sosial dan video", "sites": [
                {"domain": "instagram.com", "title": "unggahan promo Ultima dan video melasma", "present": "Tidak dibuka; satu reel lain meminta login", "present_cls": "", "action": ""},
                {"domain": "youtube.com", "title": "video cara menghilangkan bekas jerawat", "present": "", "action": ""},
            ]},
            {"name": "Situs pesaing", "sites": [
                {"domain": "erhaultimate.co.id", "title": "artikel laser bekas jerawat; microneedle", "present": "", "action": "Lihat “Apa yang ditampilkan halaman mereka”."},
                {"domain": "cderma.id", "title": "beranda; harga facial", "present": "", "action": "Lihat “Apa yang ditampilkan halaman mereka”."},
                {"domain": "klinikbamed.com", "title": "profil dokter", "present": "", "action": "Lihat “Apa yang ditampilkan halaman mereka”."},
                {"domain": "diricare.com", "title": "pico laser", "present": "", "action": ""},
                {"domain": "primavitaclinic.co.id", "title": "scar treatment", "present": "", "action": ""},
                {"domain": "aveiaclinic.com", "title": "paket bekas luka", "present": "", "action": ""},
                {"domain": "nmwclinic.co.id", "title": "scar correction", "present": "", "action": ""},
                {"domain": "farla.id", "title": "skin texture", "present": "", "action": ""},
                {"domain": "amalaclinic.com", "title": "pigment and texture", "present": "", "action": ""},
                {"domain": "superskinme.id", "title": "beranda", "present": "", "action": ""},
                {"domain": "blinkbeautyclinic.com", "title": "beranda", "present": "", "action": ""},
                {"domain": "klinikmagna.com", "title": "biaya laser wajah", "present": "", "action": ""},
                {"domain": "ristraclinic.co.id", "title": "laser bekas jerawat", "present": "", "action": ""},
                {"domain": "beautyplusclinic.com", "title": "yellow laser", "present": "", "action": ""},
            ]},
            {"name": "Rumah sakit", "sites": [
                {"domain": "rsudpasarminggu.jakarta.go.id", "title": "poliklinik kulit dan kelamin", "present": "", "action": ""},
                {"domain": "rsudbudhiasih.jakarta.go.id", "title": "rawat jalan", "present": "", "action": ""},
            ]},
        ],
        "note": "Kolom tengah menghitung berapa jawaban yang mengutip situs itu. “Ada” atau “tidak ada” diperiksa pada halaman yang dikutip dan bisa dibuka Nuave; Traveloka, tiket.com, Tokopedia, dan keenam tautan Instagram tidak terbaca: satu meminta login, lima tidak dibuka.",
    },
    "playbook": {
        1: {"who": "Tim konten, ditinjau dokter", "effort": "±1 minggu per halaman", "check": "halaman terbuka tanpa login dan teksnya bukan gambar",
            "source": "panduan Google", "line": "AI Overview mengutip halaman yang terindeks dan dapat tampil dengan cuplikan; isi penting sebaiknya berupa teks.", "url": G_AI},
        2: {"who": "Tim marketing dan dokter", "effort": "±3 hari", "check": "setiap halaman perawatan menyebut dokter, dan halaman dokternya ada",
            "source": "panduan Google", "line": "Untuk topik kesehatan, Google menanyakan apakah jelas siapa penulis halaman dan apakah ia ahli di bidangnya.", "url": G_HELP},
        4: {"who": "Manajer cabang", "effort": "±15 menit sehari", "check": "ulasan baru masuk tiap bulan dan setiap ulasan dibalas",
            "source": "panduan Google", "line": "Ulasan dan rating bisa membantu peringkat lokal; ulasan berbayar, berhadiah, atau yang hanya diminta dari pasien puas melanggar aturan Google.", "urls": [G_LOCAL, G_REV]},
        5: {"who": "Admin atau tim marketing", "effort": "±1 hari", "check": "nama, alamat, dan jam buka sama di setiap listing",
            "source": "panduan Google dan OpenAI", "line": "ChatGPT dan Google menyebut dan mengutip bisnis dari halaman publik, termasuk direktori.", "url": G_AI},
    },
    "recs_lede": "Lima langkah, urut dari yang perlu didahulukan.",
    "recs": [
        {"item": 1, "title": "Tulis harga sebagai teks, dengan angka yang sama di semua halaman",
         "text": "Saat ditanya “berapa biaya treatment di ultima”, ringkasan Google menulis 14 harga dan mengutip Traveloka, tiket.com, Tokopedia, Scribd, dan Instagram untuk harga-harga itu; sepuluh berbeda dari teks di situs Ultima, enam di antaranya berupa kisaran yang memuat harga situs atau berujung di harga itu. Di situs sendiri, harga promo ada di dalam gambar, halaman bopeng tidak menulis harga, dan harga filler berbeda antara halaman filler (mulai Rp3.799.000) dan daftar perawatan (“Konsultasikan”). Tulis harga “mulai dari” yang berlaku sebagai teks di setiap halaman perawatan dan halaman promo, dengan angka yang sama di semua halaman. Audit ini tidak membuktikan bahwa AI akan memakai harga itu; langkah ini mengikuti pedoman di bawah.",
         "refs": [10]},
        {"item": 2, "title": "Sebutkan dokter yang menangani di halaman laser, bopeng, dan filler",
         "text": "Halaman tim dokter Ultima mencantumkan lima dokter dengan nomor STR, dua di antaranya Sp.D.V.E, tetapi halaman laser, bopeng, dan filler hanya menulis “dokter profesional”, “Dokter Kecantikan profesional”, atau “dokter tersertifikasi”, tanpa nama. Cantumkan nama, gelar, dan nomor STR atau SIP dokter yang menangani di setiap halaman perawatan, dengan tautan ke halaman tim dokter. Untuk filler pertama kali, ChatGPT menyarankan tempat yang dijelaskan lewat dokter spesialisnya; audit ini tidak membuktikan hubungan itu, dan langkah ini mengikuti pedoman Google untuk topik kesehatan.",
         "refs": [3, 5]},
        {"item": 1, "title": "Lengkapi halaman bopeng dengan harga dan jawaban pertanyaan pasien",
         "text": "Untuk bekas jerawat, Ultima tidak disebut di ChatGPT (P2) maupun Google (P9). Halaman bopeng Ultima menjelaskan proses dan jenis bekas luka yang bisa ditangani, tetapi untuk harga hanya menulis “Info Lengkap Harga Hubungi Admin”, dan tidak menyebut lama pemulihan atau nama dokter yang menangani. Tulis kisaran harga, jumlah sesi, waktu pemulihan, dan dokter yang menangani sebagai teks, lalu minta dokter meninjaunya sebelum terbit. Audit ini tidak membuktikan bahwa isi halaman memengaruhi jawaban AI; langkah ini mengikuti pedoman di bawah.",
         "refs": [2, 9]},
        {"item": 5, "title": "Cocokkan harga dan jam buka di listing yang dikutip AI",
         "text": "Untuk harga Ultima, ringkasan Google di P10 mengutip listing Ultima di Traveloka, tiket.com, dan Tokopedia; Nuave tidak bisa membuka listing itu. Di P5, ChatGPT mengutip CariBisnis, yang menulis jam buka cabang Kelapa Gading 2 setiap hari 10.00 sampai 20.00; situs Ultima menulis Senin sampai Sabtu 09.00 sampai 19.00 dan Minggu 09.00 sampai 17.00. Cocokkan harga dan jam buka di setiap listing itu dengan data cabang yang berlaku, dan minta koreksi bila berbeda. Teks permintaannya ada di Bahan siap pakai.",
         "refs": [5, 10]},
        {"item": 4, "title": "Minta ulasan dari semua pasien, dan balas setiap ulasan",
         "text": "Saat ditanya “Ultima Clinic bagus nggak?”, ChatGPT merangkum ulasan dari CariBisnis: ada pujian untuk keramahan, kebersihan, dan harga, dan ada keluhan soal antrean, miskomunikasi janji temu, hasil perawatan yang tidak sesuai harapan, dan harga promo yang kurang jelas. Minta ulasan dari setiap pasien setelah kunjungan, tanpa hadiah dan tanpa memilih pasien yang puas saja, lalu balas setiap ulasan, termasuk keluhan. Teks pesan WhatsApp-nya ada di Bahan siap pakai.",
         "refs": [5]},
    ],
    "closing": {
        "text": "Di jawaban ChatGPT, Ultima muncul dengan harga promo, dan di P4 sebagai jaringan dengan banyak cabang. Untuk harga Ultima, ringkasan Google mengutip situs lain, dan halaman perawatan Ultima yang dibaca Nuave tidak menyebut nama dokter. Mulailah dari harga sebagai teks, lalu tampilkan dokter di halaman perawatan.",
        "plan": [
            {"weeks": "Minggu 1–2", "title": "Rapikan harga", "text": "Tulis harga sebagai teks, samakan harga filler, dan samakan angka cabang di data terstruktur dengan teks beranda.",
             "decision": "tetapkan angka cabang dan harga “mulai dari” yang boleh tampil"},
            {"weeks": "Minggu 3–6", "title": "Tampilkan dokter", "text": "Nama dan STR dokter di halaman laser, bopeng, dan filler; lengkapi halaman bopeng.",
             "decision": "tunjuk dokter yang meninjau isi halaman"},
            {"weeks": "Minggu 5–8", "title": "Cocokkan listing, minta ulasan", "text": "Cocokkan listing di Traveloka, tiket.com, Tokopedia, dan CariBisnis; kirim pesan ulasan ke semua pasien.", "decision": ""},
        ],
        "recheck": "ChatGPT dan Google perlu waktu untuk membaca halaman baru. Setelah perubahan berjalan sekitar delapan minggu, audit ulang dengan pertanyaan yang sama, kali ini ke kedua sumber, supaya hasilnya bisa dibandingkan dengan laporan ini. Perbedaan hasil nanti dicatat; pengaruh perbaikan tidak bisa dipastikan dari perbandingan itu saja.",
    },
    "extras_lede": "Tiga bahan untuk tim Anda: pemeriksaan teknis untuk vendor web, teks yang tinggal disalin, dan Lembar Kerja untuk mencatat progres.",
    "webcheck_sub": "5 pemeriksaan pada 9 halaman Ultima · 1 sebagian, 1 tidak cocok",
    "webcheck": [
        {"row": "robots.txt untuk Googlebot dan Bingbot", "result": "lulus",
         "detail": "Keduanya boleh membaca beranda, daftar perawatan, dan halaman laser, bopeng, serta filler. Yang berlaku adalah aturan umum <code>User-agent: *</code> dengan <code>Allow: /</code>."},
        {"row": "robots.txt untuk OAI-SearchBot, pembaca pencarian ChatGPT", "result": "lulus",
         "detail": "Tidak ada aturan khusus untuk pembaca ini, jadi aturan umum yang sama berlaku: kelima halaman boleh dibaca."},
        {"row": "Harga, dokter, alamat, dan jam buka sebagai teks", "result": "sebagian",
         "detail": "Daftar perawatan menulis 90 perawatan dengan harga sebagai teks, kecuali botox, filler, dan RF wajah (“Konsultasikan”). Halaman bopeng tidak menulis harga. Harga promo ada di dalam gambar. Halaman laser, bopeng, dan filler tidak menyebut nama dokter. Jam buka ada di kaki halaman, satu untuk semua cabang.",
         "fix": "Tulis harga dan nama dokter sebagai teks di halaman perawatan dan promo. Panduan Google: isi penting sebaiknya berupa teks."},
        {"row": "Label data terstruktur dibanding teks halaman", "result": "tidakcocok",
         "detail": "Data terstruktur di beranda menulis 78 cabang dan tidak memuat alamat atau jenis klinik. Teks beranda menulis 60, 60+, dan 70+.",
         "fix": "Pakai angka cabang yang berlaku, sama dengan teks halaman, di data terstruktur. Panduan Google: data terstruktur harus sesuai dengan teks yang terlihat."},
        {"row": "Pembaca biasa ditolak", "result": "lulus", "detail": "Kesembilan halaman Ultima terbuka normal dengan cara baca biasa."},
        {"row": "Teks yang baru muncul setelah kode berjalan", "result": "f3",
         "detail": "Angka dokter, pasien, dan cabang di beranda tertulis “0 +” di HTML dan baru terisi setelah kode di browser berjalan. Baris ini tampil bila keputusan F-3 menambahkannya ke pedoman."},
        {"row": "Sitemap", "result": "f3", "detail": "robots.txt menunjuk sitemap_index.xml. Isinya tidak dibuka di proof of concept ini. Baris ini tampil bila F-3 disetujui."},
    ],
    "webcheck_note": "Bagikan bagian ini ke vendor web sebagai halaman PDF atau teks salinan, bukan dengan meneruskan link laporan. Pemeriksaan memakai cara baca biasa dan tidak berpura-pura menjadi pembaca AI.",
    "kit_sub": "Teks yang tinggal disalin. Satu kerangka halaman menunggu tinjauan hukum.",
    "kit": [
        {"title": "Email permintaan koreksi jam buka ke CariBisnis", "for": "Untuk admin atau tim marketing. Isi jam buka cabang yang berlaku dan nama pengirim, lalu kirim dari email klinik.",
         "text": "Subjek: Permintaan pembaruan data Ultima Clinic - Kelapa Gading 2\n\nHalo tim CariBisnis,\n\nKami dari Ultima Clinic. Halaman cabang Kelapa Gading 2 di situs Anda menulis jam buka setiap hari 10.00 sampai 20.00. Jam buka cabang ini yang berlaku: [isi jam buka cabang].\n\nSumber resmi: ultimaclinic.example/lokasi\n\nMohon bantuannya memperbarui halaman tersebut. Terima kasih.\n\n[Nama]\nUltima Clinic"},
        {"title": "Pesan ke Traveloka, tiket.com, dan Tokopedia", "for": "Untuk tim yang mengelola listing Ultima di platform itu, setelah mencocokkan harganya.",
         "text": "Halo tim [nama platform],\n\nKami dari Ultima Clinic. Mohon bantuan menyamakan harga di listing Ultima Clinic dengan daftar harga resmi kami di ultimaclinic.example/treatment. Yang perlu disamakan: [nama perawatan dan harga yang berlaku].\n\nTerima kasih.\n\n[Nama]\nUltima Clinic"},
        {"title": "Pesan WhatsApp untuk meminta ulasan", "for": "Kirim ke semua pasien setelah kunjungan, bukan hanya yang puas. Jangan menawarkan hadiah.",
         "text": "Terima kasih sudah berkunjung ke Ultima Clinic hari ini. Kalau berkenan, ceritakan pengalaman Anda lewat ulasan Google di tautan ini: [tautan ulasan cabang]. Semua masukan membantu kami memperbaiki layanan. Memberi ulasan tidak wajib dan tidak memengaruhi layanan yang Anda terima."},
        {"title": "Kerangka halaman bopeng", "locked": True,
         "text": "Tersedia setelah tinjauan hukum (keputusan F-7). Isinya kelak: siapa yang cocok, proses, jumlah sesi, kisaran harga, waktu pemulihan, risiko, dan dokter yang menangani."},
    ],
    "worksheet": {
        "title": "Lembar Kerja Ultima Clinic",
        "text": "Satu file Excel yang juga bisa dibuka di Google Sheets. Isinya sama dengan laporan ini, ditambah kolom untuk penanggung jawab, tanggal target, dan status. Tab Cek Fakta memuat ke-36 klaim yang dicek; laporan menampilkan delapan. Progres terhitung sendiri setiap kali status diubah.",
        "tabs": ["Panduan", "Ringkasan", "Rencana Kerja", "Pertanyaan & Hasil", "Pesaing", "Cek Fakta", "Website", "Situs AI", "Bahan Siap Pakai", "Titik Awal"],
    },
    "answers_lede": "Bukti di balik laporan ini. Ketuk pertanyaan untuk membaca jawaban lengkap. Di data uji ini, P1 sampai P5 hanya ditanyakan ke ChatGPT dan P6 sampai P10 hanya ke Google.",
    "answer_notes": ["Jawaban AI dapat berubah menurut waktu, model, akun, dan lokasi.", "Pertanyaan diajukan dari Indonesia pada 24 Oktober 2026.",
                     "Disebut belum tentu direkomendasikan.", "Nama klinik diganti menjadi Ultima Clinic; isi jawaban lain tidak diubah."],
    "method": [
        "Sepuluh pertanyaan dari uji Nuave pada 24 Oktober 2026. P1 sampai P5 ditanyakan ke ChatGPT (model gpt-5.6-luna) dan P6 sampai P10 ke Google AI Overview, dari Indonesia. Di produk, setiap pertanyaan ditanyakan ke kedua sumber.",
        "P5 dan P10 menyebut nama klinik. Jawabannya ditampilkan terpisah dan tidak dihitung di kartu, perbandingan, dan peta pesaing.",
        "P6: Google menandai ada AI Overview, tetapi teksnya tidak tersimpan, jadi hasilnya tidak dapat dinilai.",
        "Kartu ChatGPT menghitung 4 jawaban, dan kartu Google menghitung 3 ringkasan AI yang tampil.",
        "Disebut: nama Ultima ada di jawaban. Direkomendasikan: jawaban menyarankan Ultima untuk kebutuhan yang ditanyakan. Situs dikutip: halaman Ultima dikutip, tetapi namanya tidak muncul.",
        "Situs Ultima dan halaman yang dikutip dibuka pada 7 November 2026 dengan cara baca biasa, 31 kali buka halaman. Traveloka, tiket.com, Tokopedia, satu reel Instagram, dan satu situs lain menolak atau tidak menjawab.",
        "Cek fakta membandingkan kalimat AI dengan teks di situs Ultima. Pendapat dan saran di jawaban AI tidak dicek, dan klaim keamanan, izin, atau pengawasan dokter tidak diberi penilaian. Harga promo di situs berupa gambar, jadi tidak terbaca. Laporan menampilkan delapan klaim; Lembar Kerja memuat ke-36.",
        "Volume: pencarian Google per bulan bila ada, atau perkiraan sebutan topik di asisten AI per bulan, dari uji penemuan DataForSEO pada 24 Oktober 2026. Pertanyaan lain tidak punya angka.",
        "Tidak ada contoh kestabilan: uji ini punya satu jawaban per pertanyaan.",
        "Nama klinik diganti menjadi Ultima Clinic dan alamat situsnya menjadi ultimaclinic.example. Nama klinik lain, situs lain, dan isi jawaban tidak diubah.",
        "Sepuluh pertanyaan tidak mewakili semua pertanyaan calon pasien, dan laporan ini tidak membuktikan mengapa AI menjawab seperti itu.",
    ],
}
