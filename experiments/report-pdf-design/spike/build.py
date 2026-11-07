"""Step 0 spike (docs/REPORT_PDF_DESIGN_PLAN.md §7): a throwaway generator for a
maximum-length report PDF page set. Not product code.

It writes one HTML file with every page the §5.2 page list can hold at its
largest: 10 findings plus google_finding, 10 recommendations, every v3 page,
ten appendix questions with continued pages for long answers, and the back
cover. Each writer text is filled to its Spec 021 B-04 word limit
(src/lib/audit/two-source-writing.ts) times SCALE, so SCALE=1.25 tests text
over the soft limit.

Usage: python3 -I build.py <fonts.css> <out.html> [scale] [chatgpt_words] [google_words]
"""

import html
import sys

FONTS_CSS, OUT = sys.argv[1], sys.argv[2]
SCALE = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
CHATGPT_WORDS = int(sys.argv[4]) if len(sys.argv) > 4 else 1200
GOOGLE_WORDS = int(sys.argv[5]) if len(sys.argv) > 5 else 400

LIMITS = dict(conclusion=70, finding_title=12, finding=80, rec_title=14, rec=100,
              reason=20, takeaway_title=10, takeaway=30, plan=35)

SOURCE = (
    "ChatGPT dan Google AI Overview menjawab pertanyaan tentang flek, melasma, bopeng, "
    "dan biaya perawatannya. Nirmala Derma disebut di ketiga jawaban ChatGPT dan ChatGPT "
    "menulis bahwa klinik itu punya program khusus melasma yang menggabungkan laser, obat "
    "oles, dan kontrol rutin. Menurut Anda, program melasma jangka panjang adalah salah "
    "satu pembeda Ultima. Ringkasan Google mengutip artikel blog Ultima tanpa menyebut "
    "namanya, lalu menyebut klinik lain yang mencantumkan harga mulai dari dan nama dokter "
    "spesialis kulit di halaman perawatannya."
).split()


def words(n, offset=0):
    n = max(1, round(n * SCALE))
    return " ".join(SOURCE[(offset + i) % len(SOURCE)] for i in range(n)).capitalize() + "."


def raw_words(n, offset=0):
    return " ".join(SOURCE[(offset + i) % len(SOURCE)] for i in range(n))


pages = []
total_label = "{TOTAL}"


def page(body, label, dark=False, cls=""):
    n = len(pages) + 1
    pages.append(
        f'<section class="pg {"dark" if dark else ""} {cls}" data-label="{label}">'
        f'<header><b class="logo">nuave</b><span class="sec">{html.escape(label)}</span></header>'
        f'<div class="content">{body}</div>'
        f'<footer><span>Ultima Clinic · AI Visibility Report · November 2026</span>'
        f'<span class="pn">{n:02d}</span></footer></section>'
    )


def head(text, size=44):
    return f'<h1 style="font-size:{size}px">{html.escape(text)}</h1>'


def para(text, cls="p"):
    return f'<p class="{cls}">{html.escape(text)}</p>'


# Front pages
page('<div class="cover"><div class="kicker">AI VISIBILITY REPORT</div>'
     '<h1 class="huge">Bagaimana AI memperkenalkan Ultima Clinic</h1></div>', "Sampul", dark=True)
page(head("Isi laporan", 36) + "".join(para(f"0{i} Bagian {i}") for i in range(1, 6)), "Daftar isi")
page(head("Cara membaca laporan ini", 36) + '<div class="cols3">' + "".join(
    para(words(60, i * 7)) for i in range(3)) + "</div>", "Cara membaca")
page(head(words(45), 36) + '<div class="cards">' + para(words(20)) + para(words(25)) + "</div>", "Ringkasan")
page(head(words(18), 34) + para(words(40)) + '<div class="box">' + para(words(30)) + "</div>", "Saat calon pasien bertanya")
page(head(words(16), 30) + '<table class="grid">' + "".join(
    f"<tr><td>P{i}</td><td>{raw_words(6, i)}</td><td>1.000</td><td>●</td><td>○</td></tr>" for i in range(1, 11)) +
    "</table>", "Peta jawaban")

# 01
page(head("Posisi Ultima hari ini", 60), "Bagian 01", dark=True)
for i in range(11):
    label = "Temuan Google" if i == 10 else f"Temuan {i + 1} dari 10"
    page(f'<div class="fx" data-fit="1">{head(words(LIMITS["finding_title"], i))}'
         f'<div class="row"><div class="num">2 dari 10</div><div class="body">{para(words(LIMITS["finding"], i * 3))}'
         '<div class="chips">P1 · A1 &nbsp; P2 · A2 &nbsp; P3 · A3</div></div></div></div>', label)
rows = "".join(
    f'<tr><td>Klinik {i}</td><td>8 dari 10</td><td>6 dari 7</td><td>{html.escape(words(LIMITS["reason"], i))}</td></tr>'
    for i in range(6))
take = "".join(f'<div class="take"><b>{html.escape(words(LIMITS["takeaway_title"], i))}</b>'
               f'{para(words(LIMITS["takeaway"], i * 5))}</div>' for i in range(3))
page(f'<div class="fx" data-fit="1">{head(words(25), 26)}<table class="tbl">{rows}</table>'
     f'<div class="chips">' + " ".join(f"Bisnis {i} · ChatGPT 1, Google 1" for i in range(15)) +
     f'</div><div class="takes">{take}</div></div>', "Pesaing")
page(head(words(10), 30) + '<table class="tbl">' + "".join(
    f"<tr><td>{raw_words(6, i)}</td><td>4.400</td><td>{html.escape(words(20, i))}</td></tr>" for i in range(5)) +
    "</table>", "Celah topik")

# 02
page(head("Apa kata AI tentang Ultima", 60), "Bagian 02", dark=True)
page(head(words(12), 30) + '<table class="tbl">' + "".join(
    f"<tr><td>Topik</td><td>{html.escape(words(10, i))}</td><td>{html.escape(words(12, i))}</td>"
    f"<td>{html.escape(words(10, i + 3))}</td></tr>" for i in range(8)) + "</table>", "Cek fakta")
page(head(words(14), 30) + para(words(90)), "Kata AI dan kata Anda")

# 03
page(head("Apa yang dibaca AI", 60), "Bagian 03", dark=True)
for name in ("Halaman mereka", "Situs yang dibaca AI", "Untuk tim web Anda"):
    page(head(words(16), 30) + '<table class="tbl">' + "".join(
        f"<tr><td>situs{i}.example</td><td>ChatGPT 3 · Google 4</td><td>{html.escape(words(18, i))}</td></tr>"
        for i in range(7)) + "</table>", name)

# 04
page(head("Rencana delapan minggu", 60), "Bagian 04", dark=True)
page(head(words(8), 30) + '<table class="tbl">' + "".join(
    f"<tr><td>{i + 1}</td><td>{html.escape(words(LIMITS['rec_title'], i))}</td><td>Vendor web</td></tr>"
    for i in range(10)) + "</table>", "Rencana")
for i in range(10):
    page(f'<div class="fx" data-fit="1">{head(words(LIMITS["rec_title"], i), 38)}'
         f'<div class="row"><div class="body">{para(words(LIMITS["rec"], i * 2))}</div>'
         f'<div class="side">{para(words(30, i))}</div></div></div>', f"Langkah {i + 1} dari 10")
page(head(words(10), 30) + para(words(80)), "Bahan siap pakai")
page(head("Lembar Kerja", 30) + para(words(50)), "Lembar Kerja")
page(f'<div class="fx" data-fit="1">{para(words(LIMITS["conclusion"]), "lead")}<div class="cols3">' + "".join(
    para(words(LIMITS["plan"], i * 4)) for i in range(3)) + "</div></div>", "Penutup", dark=True)
page(head("Titik awal, untuk dibandingkan setelah delapan minggu.", 48) + para(words(60)), "Titik awal", dark=True)

# 05 Lampiran
page(head("Lampiran", 60), "Bagian 05", dark=True)
page(head("Sepuluh pertanyaan, dua puluh jawaban", 30) + '<table class="tbl">' + "".join(
    f"<tr><td>P{i}</td><td>{raw_words(14, i)}</td><td>●</td><td>○</td></tr>" for i in range(1, 11)) +
    "</table>", "A0")
PER_PAGE = 420  # words of answer per page, two columns at 12.5px
for q in range(1, 11):
    chunks = []
    gpt, goo = raw_words(CHATGPT_WORDS, q), raw_words(GOOGLE_WORDS, q + 5)
    text = ("CHATGPT: " + gpt + " GOOGLE AI OVERVIEW: " + goo).split()
    for i in range(0, len(text), PER_PAGE):
        chunks.append(" ".join(text[i:i + PER_PAGE]))
    for k, chunk in enumerate(chunks):
        page(f'<div class="fx" data-fit="1">{head(raw_words(14, q).capitalize() + "?", 22)}'
             f'<div class="answer">{html.escape(chunk)}</div></div>', f"A{q} · {k + 1}/{len(chunks)}")
page('<div class="cover"><h1 class="huge">nuave</h1><p>nuave.ai</p></div>', "Sampul belakang", dark=True)

CSS = """
@page { size: 1440px 810px; margin: 0; }
* { box-sizing: border-box; margin: 0; }
html, body { background: #fff; }
body { font-family: 'Geist', sans-serif; color: #16161D; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { width: 1440px; height: 810px; position: relative; overflow: hidden; break-after: page; padding: 104px 80px 80px; }
.pg.dark { background: #100D26; color: #F5F4F8; }
header { position: absolute; top: 36px; left: 80px; right: 80px; display: flex; justify-content: space-between;
  font-family: 'Roboto Condensed'; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
.logo { font-family: 'Geist'; font-weight: 600; font-size: 18px; letter-spacing: 0; text-transform: none; }
footer { position: absolute; bottom: 30px; left: 80px; right: 80px; display: flex; justify-content: space-between;
  border-top: 1px solid #E4E3EA; padding-top: 16px; font-family: 'Roboto Condensed'; font-size: 11px; }
.content { height: 626px; }
.fx { height: 100%; overflow: hidden; }
h1 { font-family: 'Newsreader'; font-weight: 400; line-height: 1.15; max-width: 1040px; margin-bottom: 28px; }
h1.huge { font-size: 68px; font-weight: 300; }
.kicker { font-family: 'Roboto Condensed'; font-size: 13px; letter-spacing: .12em; margin: 120px 0 20px; }
.p { font-size: 16px; line-height: 1.75; max-width: 760px; margin-bottom: 14px; }
.lead { font-family: 'Newsreader'; font-size: 26px; line-height: 1.35; max-width: 1000px; margin-bottom: 36px; }
.row { display: flex; gap: 100px; border-top: 1px solid #E4E3EA; padding-top: 28px; }
.num { font-family: 'Newsreader'; font-size: 96px; line-height: 1; color: #533AFD; width: 380px; flex: none; }
.body { flex: 1; } .side { width: 400px; flex: none; font-size: 14px; }
.chips { font-family: 'Roboto Condensed'; font-size: 11px; color: #533AFD; margin-top: 18px; line-height: 2; }
.cols3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.cols3 .p { font-size: 14px; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.box { background: #F5F4F8; padding: 16px 20px; margin-top: 20px; max-width: 580px; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
td { border-top: 1px solid #E4E3EA; padding: 9px 10px 9px 0; vertical-align: top; }
.tbl td:last-child { width: 45%; }
.takes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 16px; font-size: 12.5px; }
.take { background: #F5F4F8; padding: 14px 18px; } .take .p { font-size: 12.5px; line-height: 1.5; margin: 6px 0 0; }
.answer { column-count: 2; column-gap: 48px; font-size: 12.5px; line-height: 1.6; column-fill: auto; height: 520px; }
code { font-family: 'Geist Mono'; }
"""

with open(FONTS_CSS) as f:
    fonts = f.read()
doc = ("<!doctype html><html lang=id><head><meta charset=utf-8><title>Spike</title>"
       f"<style>{fonts}{CSS}</style></head><body>{''.join(pages)}"
       "<script>document.fonts.ready.then(()=>document.body.setAttribute('data-saved-report','ready'))</script>"
       "</body></html>")
with open(OUT, "w") as f:
    f.write(doc)
print(f"{len(pages)} pages, {len(doc) // 1024} KB html")
