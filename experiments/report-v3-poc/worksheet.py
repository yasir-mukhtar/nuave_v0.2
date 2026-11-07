"""The "Lembar Kerja" (worksheet) that accompanies a Report v3 proof of concept.

Built from the same data as the report page (plan §4 rule 13), so its numbers,
quotes and recommendations always equal the report's. Summary numbers are
live formulas over the "Pertanyaan & Hasil" tab, status cells are drop-down
lists, and progress counts itself. Opens in Excel and Google Sheets.
"""

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

VIOLET = "533AFD"
VIOLET_INK = "3620B8"
WASH = "F5F3FF"
SOFT = "E5E0FF"
INK = "16161D"
MUTED = "6B6A85"
LINE = "E7E6EE"
ZEBRA = "F7F6FB"
GOOD, GOOD_W = "137A56", "E8F6EF"
BAD, BAD_W = "C52F4A", "FDEEF1"
WARN, WARN_W = "A35A06", "FFF4E3"

FONT = "Arial"
STATUS = ["Belum mulai", "Sedang dikerjakan", "Selesai", "Ditunda"]
RESULT = {"recommended": "Direkomendasikan", "mentioned": "Disebut", "cited": "Situs dikutip, nama tidak disebut",
          "none": "Tidak disebut", "noaio": "Tidak ada AI Overview", "failed": "Tidak dapat diuji", "notasked": "Tidak ditanyakan"}
SRC = {"chatgpt": "ChatGPT", "google": "Google AI Overview"}
VERDICT = {"berbeda": "Berbeda", "sesuai": "Sesuai", "tidak_bisa_dicek": "Tidak bisa dicek", "tanpa_penilaian": "Tanpa penilaian"}
WEB = {"lulus": "Lulus", "gagal": "Gagal", "sebagian": "Sebagian", "tidakcocok": "Tidak cocok", "indikasi": "Indikasi",
       "netral": "Catatan", "tidakada": "Tidak ada", "f3": "Butuh F-3"}

thin = Side(style="thin", color=LINE)
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)


def font(size=10, bold=False, color=INK, italic=False):
    return Font(name=FONT, size=size, bold=bold, color=color, italic=italic)


def fill(color):
    return PatternFill("solid", start_color=color, end_color=color)


def title(ws, text, sub, width_cols):
    ws["A1"] = text
    ws["A1"].font = font(16, True)
    ws["A2"] = sub
    ws["A2"].font = font(10, color=MUTED)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=width_cols)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=width_cols)
    ws.row_dimensions[1].height = 26
    ws.sheet_view.showGridLines = False


def table(ws, row, headers, rows, widths, wrap_cols=(), center_cols=()):
    """Writes a styled table; returns (first data row, last data row)."""
    for i, (h, w) in enumerate(zip(headers, widths), start=1):
        c = ws.cell(row=row, column=i, value=h)
        c.font = font(10, True, "FFFFFF")
        c.fill = fill(VIOLET)
        c.alignment = Alignment(vertical="center", wrap_text=True)
        c.border = BORDER
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = 30
    for r_i, values in enumerate(rows, start=row + 1):
        for c_i, v in enumerate(values, start=1):
            c = ws.cell(row=r_i, column=c_i, value=v)
            c.font = font(10)
            c.border = BORDER
            c.alignment = Alignment(vertical="top", wrap_text=c_i in wrap_cols or isinstance(v, str) and len(v) > 30,
                                    horizontal="center" if c_i in center_cols else None)
            if (r_i - row) % 2 == 0:
                c.fill = fill(ZEBRA)
    first, last = row + 1, row + max(len(rows), 1)
    ws.freeze_panes = ws.cell(row=row + 1, column=1)
    if rows:
        ws.auto_filter.ref = f"A{row}:{get_column_letter(len(headers))}{last}"
    return first, last


def status_list(ws, col, first, last, default="Belum mulai"):
    dv = DataValidation(type="list", formula1='"' + ",".join(STATUS) + '"', allow_blank=True)
    dv.error = "Pilih salah satu status dari daftar."
    dv.prompt = "Pilih status"
    ws.add_data_validation(dv)
    rng = f"{col}{first}:{col}{last}"
    dv.add(rng)
    for r in range(first, last + 1):
        c = ws[f"{col}{r}"]
        if c.value in (None, ""):
            c.value = default
        c.font = font(10, True)
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Selesai"'], fill=fill(GOOD_W), font=Font(name=FONT, color=GOOD, bold=True)))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Sedang dikerjakan"'], fill=fill(WARN_W), font=Font(name=FONT, color=WARN, bold=True)))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Ditunda"'], fill=fill(LINE), font=Font(name=FONT, color=MUTED, bold=True)))


def color_words(ws, rng, words):
    for word, (fg, bg) in words.items():
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=[f'"{word}"'], fill=fill(bg), font=Font(name=FONT, color=fg, bold=True)))


def progress(ws, cell_label, cell_value, cell_bar, status_rng, count_rng):
    ws[cell_label] = "Progres"
    ws[cell_label].font = font(10, True, MUTED)
    ws[cell_value] = f'=COUNTIF({status_rng},"Selesai")&" dari "&COUNTA({count_rng})&" selesai"'
    ws[cell_value].font = font(12, True, VIOLET_INK)
    pct = f'IF(COUNTA({count_rng})=0,0,COUNTIF({status_rng},"Selesai")/COUNTA({count_rng}))'
    ws[cell_bar] = f'=REPT("█",ROUND(10*{pct},0))&REPT("░",10-ROUND(10*{pct},0))&"  "&TEXT({pct},"0%")'
    ws[cell_bar].font = Font(name="Arial", size=12, color=VIOLET)


def build_workbook(d, out):
    m = d["meta"]
    clinic, short = m["clinic"], m.get("short", m["clinic"])
    qs = d["questions"]
    wb = Workbook()

    # ---------------- Panduan ----------------
    ws = wb.active
    ws.title = "Panduan"
    ws.sheet_properties.tabColor = VIOLET
    title(ws, f"Lembar Kerja {clinic}", f"Pendamping Laporan Visibilitas AI · diperiksa {m['date']} · {m['poc_label']}", 6)
    ws.column_dimensions["A"].width = 4
    ws.column_dimensions["B"].width = 100
    lines = [
        ("Cara memakai lembar ini", True),
        ("1. Mulai dari tab Rencana Kerja. Isi penanggung jawab dan tanggal target untuk setiap langkah.", False),
        ("2. Ubah kolom Status dari daftar pilihan. Progres di bagian atas terhitung sendiri.", False),
        ("3. Tab Cek Fakta, Website, dan Situs AI juga punya kolom status untuk perbaikan yang sedang berjalan.", False),
        ("4. Angka di tab Ringkasan dihitung ulang dari tab Pertanyaan & Hasil. Jangan ubah tab itu kecuali untuk koreksi.", False),
        ("5. Setelah sekitar delapan minggu, pesan audit ulang dengan sepuluh pertanyaan yang sama, lalu isi kolom Audit ulang di tab Titik Awal.", False),
        ("", False),
        ("Arti hasil", True),
        ("Direkomendasikan: jawaban menyarankan klinik untuk kebutuhan yang ditanyakan.", False),
        ("Disebut: nama klinik ada di jawaban, tanpa saran khusus.", False),
        ("Situs dikutip, nama tidak disebut: halaman klinik dipakai sebagai sumber, namanya tidak muncul.", False),
        ("Tidak ada AI Overview: Google tidak menampilkan ringkasan AI saat diperiksa.", False),
        ("", False),
        ("Yang perlu diingat", True),
        ("Jawaban AI berubah menurut waktu, model, akun, dan lokasi. Lembar ini mencatat satu pemeriksaan.", False),
        ("Laporan dan lembar ini tidak membuktikan mengapa AI menjawab seperti itu, dan tidak menjanjikan hasil.", False),
        ("Jangan menulis data pasien di lembar ini.", False),
        ("", False),
        (m["poc_note"], False),
    ]
    for i, (text, bold) in enumerate(lines, start=4):
        c = ws.cell(row=i, column=2, value=text)
        c.font = font(12 if bold else 10, bold, INK if bold or text != m["poc_note"] else MUTED, italic=text == m["poc_note"])
        c.alignment = Alignment(wrap_text=True, vertical="top")

    # ---------------- Pertanyaan & Hasil (data source for formulas) ----------------
    wq = wb.create_sheet("Pertanyaan & Hasil")
    title(wq, "Pertanyaan & Hasil", "Satu baris untuk setiap pertanyaan di setiap sumber. Tab Ringkasan dan Pesaing menghitung baris yang kolom terakhirnya Ya.", 10)
    rows = []
    for q in qs:
        for src in ("chatgpt", "google"):
            a = q.get(src) or {"status": "notasked"}
            if a["status"] == "notasked":
                continue
            rows.append([f"P{q['n']}", q["q"], q["topic"], q.get("volume") or (f"{q['ai_mentions']:,} sebutan AI".replace(",", ".") if q.get("ai_mentions") else ""), SRC[src], RESULT[a["status"]],
                         ", ".join(a.get("named", [])), ", ".join(a.get("rec", [])),
                         ", ".join(dict.fromkeys(s["domain"] for s in a.get("sources", []))),
                         "Tidak, menyebut nama klinik" if q.get("brand") else "Ya"])
    qf, ql = table(wq, 4, ["No", "Pertanyaan", "Topik", "Volume per bulan", "Sumber", f"Hasil untuk {short}", "Bisnis lain yang disebut", "Bisnis lain yang direkomendasikan", "Situs yang dikutip", "Dihitung di ringkasan"],
                   rows, [6, 52, 22, 13, 18, 24, 40, 30, 40, 18], wrap_cols=(2, 7, 8, 9, 10), center_cols=(1, 4))
    for r in range(qf, ql + 1):
        wq.cell(row=r, column=4).number_format = "#,##0"
    color_words(wq, f"F{qf}:F{ql}", {"Direkomendasikan": (VIOLET_INK, SOFT), "Disebut": (VIOLET_INK, WASH), "Tidak disebut": (BAD, BAD_W)})
    QR = f"'Pertanyaan & Hasil'!$E${qf}:$E${ql}"
    HR = f"'Pertanyaan & Hasil'!$F${qf}:$F${ql}"
    NR = f"'Pertanyaan & Hasil'!$G${qf}:$G${ql}"
    RR = f"'Pertanyaan & Hasil'!$H${qf}:$H${ql}"
    CR = f"'Pertanyaan & Hasil'!$J${qf}:$J${ql}"

    # ---------------- Ringkasan ----------------
    wr = wb.create_sheet("Ringkasan", 1)
    title(wr, f"Ringkasan · {clinic}", f"{m['site']} · {m['city']} · diperiksa {m['date']} · {m['places']}", 4)
    wr.column_dimensions["A"].width = 44
    wr.column_dimensions["B"].width = 16
    wr.column_dimensions["C"].width = 16
    wr.column_dimensions["D"].width = 60
    wr["A4"] = "Simpulan"
    wr["A4"].font = font(10, True, MUTED)
    wr["A5"] = d["verdict"]
    wr["A5"].font = font(12, True)
    wr["A5"].alignment = Alignment(wrap_text=True, vertical="top")
    wr.merge_cells("A5:D5")
    wr.row_dimensions[5].height = 48
    hdr = ["Ukuran", "Jumlah", "Dari", "Cara menghitung"]
    for i, h in enumerate(hdr, start=1):
        c = wr.cell(row=7, column=i, value=h)
        c.font = font(10, True, "FFFFFF")
        c.fill = fill(VIOLET)
        c.border = BORDER
    named = lambda s: f'COUNTIFS({CR},"Ya",{QR},"{s}",{HR},"Disebut")+COUNTIFS({CR},"Ya",{QR},"{s}",{HR},"Direkomendasikan")'
    metrics = [
        (f"ChatGPT: jawaban yang menyebut {short}", f"={named('ChatGPT')}", f'=COUNTIFS({CR},"Ya",{QR},"ChatGPT")-COUNTIFS({CR},"Ya",{QR},"ChatGPT",{HR},"Tidak dapat diuji")', "Disebut + direkomendasikan, dari jawaban yang selesai"),
        (f"ChatGPT: jawaban yang merekomendasikan {short}", f'=COUNTIFS({CR},"Ya",{QR},"ChatGPT",{HR},"Direkomendasikan")', "=C8", "Dari jawaban yang selesai"),
        (f"Google AI Overview: ringkasan yang menyebut {short}", f"={named('Google AI Overview')}", f'=COUNTIFS({CR},"Ya",{QR},"Google AI Overview")-COUNTIFS({CR},"Ya",{QR},"Google AI Overview",{HR},"Tidak ada AI Overview")-COUNTIFS({CR},"Ya",{QR},"Google AI Overview",{HR},"Tidak dapat diuji")', "Dari ringkasan AI yang tampil"),
        (f"Google AI Overview: situs {short} dikutip tanpa nama", f'=COUNTIFS({CR},"Ya",{QR},"Google AI Overview",{HR},"Situs dikutip, nama tidak disebut")', "=C10", "Dari ringkasan AI yang tampil"),
        ("Google: pertanyaan tanpa AI Overview", f'=COUNTIFS({CR},"Ya",{QR},"Google AI Overview",{HR},"Tidak ada AI Overview")', f'=COUNTIFS({CR},"Ya",{QR},"Google AI Overview")', "Dari pertanyaan yang diperiksa di Google"),
    ]
    for i, (label, val, den, how) in enumerate(metrics, start=8):
        for j, v in enumerate((label, val, den, how), start=1):
            c = wr.cell(row=i, column=j, value=v)
            c.font = font(11 if j == 2 else 10, j == 2, VIOLET_INK if j == 2 else (MUTED if j == 4 else INK))
            c.border = BORDER
            c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="center" if j in (2, 3) else None)
    wr["A15"] = "Bisnis yang paling sering disebut, per sumber"
    wr["A15"].font = font(10, True, MUTED)
    r = 16
    for src in ("chatgpt", "google"):
        counts = {}
        for q in qs:
            a = q.get(src) or {}
            if q.get("brand") or a.get("status") in (None, "notasked", "failed", "noaio"):
                continue
            for n in set(a.get("named", [])):
                counts[n] = counts.get(n, 0) + 1
        if counts:
            top = max(counts.items(), key=lambda kv: kv[1])
            wr.cell(row=r, column=1, value=f"{SRC[src]}: {top[0]}").font = font(10)
            wr.cell(row=r, column=2, value=f'=COUNTIFS({CR},"Ya",{QR},"{SRC[src]}",{NR},"*{top[0]}*")').font = font(11, True)
            wr.cell(row=r, column=3, value=f"=C8" if src == "chatgpt" else "=C10").font = font(10)
            wr.cell(row=r, column=4, value=f"Bandingkan dengan {short} di baris {8 if src == 'chatgpt' else 10}.").font = font(10, color=MUTED)
            r += 1

    # ---------------- Rencana Kerja ----------------
    wp = wb.create_sheet("Rencana Kerja", 2)
    wp.sheet_properties.tabColor = VIOLET
    title(wp, "Rencana Kerja", "Langkah dari laporan, urut dari yang perlu didahulukan. Isi kolom berwarna ungu muda.", 11)
    pb = {int(k): v for k, v in d["playbook"].items()}
    rows = []
    for i, rec in enumerate(d["recs"], start=1):
        p = pb.get(rec["item"], {})
        rows.append([i, rec["title"], rec["text"], p.get("who", ""), p.get("effort", ""), p.get("check", ""),
                     "", "", "Belum mulai", "", ", ".join(f"P{n}" for n in rec.get("refs", []))])
    pf, pl = table(wp, 5, ["No", "Langkah", "Penjelasan dari laporan", "Siapa (pedoman)", "Waktu kerja (pedoman)", "Selesai jika",
                           "Penanggung jawab", "Target tanggal", "Status", "Catatan", "Pertanyaan terkait"],
                   rows, [5, 34, 60, 20, 16, 30, 18, 14, 18, 28, 14], wrap_cols=(2, 3, 4, 6, 10), center_cols=(1, 9))
    for r in range(pf, pl + 1):
        wp.row_dimensions[r].height = 120
        for col in ("G", "H", "J"):
            wp[f"{col}{r}"].fill = fill(WASH)
        wp[f"H{r}"].number_format = "dd/mm/yyyy"
    date_dv = DataValidation(type="date", operator="greaterThan", formula1="DATE(2026,1,1)", allow_blank=True)
    date_dv.error = "Isi tanggal, misalnya 20/11/2026."
    wp.add_data_validation(date_dv)
    date_dv.add(f"H{pf}:H{pl}")
    status_list(wp, "I", pf, pl)
    progress(wp, "A3", "C3", "D3", f"I{pf}:I{pl}", f"B{pf}:B{pl}")
    wp.merge_cells("D3:F3")

    # ---------------- Pesaing ----------------
    wc = wb.create_sheet("Pesaing")
    title(wc, "Pesaing", "Bisnis yang disebut AI di laporan ini. Hitungan dihitung ulang dari tab Pertanyaan & Hasil.", 6)
    rows = [[b["name"] + (" (Klinik Anda)" if b["name"] == clinic else ""), b.get("domain") or "", "", "", b.get("rating", ""), b.get("why", "")] for b in d["businesses"]]
    cf, cl = table(wc, 4, ["Nama", "Situs", "Disebut di ChatGPT", "Disebut di Google AI Overview", "Rating dan ulasan", "Menurut jawaban AI"],
                   rows, [30, 26, 14, 16, 34, 60], wrap_cols=(5, 6), center_cols=(3, 4))
    for i, b in enumerate(d["businesses"]):
        r = cf + i
        if b["name"] == clinic:
            wc[f"C{r}"] = f'=COUNTIFS({CR},"Ya",{QR},"ChatGPT",{HR},"Disebut")+COUNTIFS({CR},"Ya",{QR},"ChatGPT",{HR},"Direkomendasikan")'
            wc[f"D{r}"] = f'=COUNTIFS({CR},"Ya",{QR},"Google AI Overview",{HR},"Disebut")+COUNTIFS({CR},"Ya",{QR},"Google AI Overview",{HR},"Direkomendasikan")'
            for col in "ABCDEF":
                wc[f"{col}{r}"].fill = fill(SOFT)
                wc[f"{col}{r}"].font = font(10, True, VIOLET_INK)
        else:
            wc[f"C{r}"] = f'=COUNTIFS({CR},"Ya",{QR},"ChatGPT",{NR},"*{b["name"]}*")'
            wc[f"D{r}"] = f'=COUNTIFS({CR},"Ya",{QR},"Google AI Overview",{NR},"*{b["name"]}*")'

    # ---------------- Cek Fakta ----------------
    if d.get("facts"):
        wf = wb.create_sheet("Cek Fakta")
        title(wf, "Cek Fakta", "Kalimat AI tentang klinik, dibandingkan dengan situs klinik dan data yang Anda konfirmasi. Nuave membandingkan, tidak menilai mana yang benar.", 9)
        rows = [[f"P{f['n']}", SRC[f["source"]], f["topic"], f["quote"], f"{f.get('ref_label', '')}: {f.get('ref_text', '')}".strip(": "),
                 VERDICT[f["verdict"]], f.get("seen_on", ""), f.get("fix", ""), "Belum mulai" if f["verdict"] != "sesuai" else "Selesai"] for f in d["facts"]]
        ff, fl = table(wf, 4, ["No", "Sumber", "Topik", "Kata AI", "Pembanding", "Hasil", "Sumber atau teks yang sama", "Perbaiki di", "Status perbaikan"],
                       rows, [6, 18, 16, 44, 48, 14, 36, 30, 18], wrap_cols=(4, 5, 7, 8), center_cols=(1, 6))
        for r in range(ff, fl + 1):
            wf.row_dimensions[r].height = 70
        color_words(wf, f"F{ff}:F{fl}", {"Berbeda": (BAD, BAD_W), "Sesuai": (GOOD, GOOD_W), "Tanpa penilaian": (WARN, WARN_W)})
        status_list(wf, "I", ff, fl)

    # ---------------- Website ----------------
    if d.get("webcheck"):
        ww = wb.create_sheet("Website")
        title(ww, "Website: untuk tim web", d.get("webcheck_note", ""), 6)
        rows = [[w["row"], WEB.get(w["result"], w["result"]), _plain(w["detail"]), w.get("fix", ""), "", "Belum mulai" if w["result"] in ("gagal", "sebagian", "tidakcocok") else "Selesai"]
                for w in d["webcheck"] if w["result"] != "f3"]
        wf_, wl_ = table(ww, 4, ["Pemeriksaan", "Hasil", "Detail", "Cara memperbaiki", "Penanggung jawab", "Status"],
                         rows, [36, 14, 60, 50, 18, 18], wrap_cols=(1, 3, 4), center_cols=(2,))
        for r in range(wf_, wl_ + 1):
            ww.row_dimensions[r].height = 64
            ww[f"E{r}"].fill = fill(WASH)
        color_words(ww, f"B{wf_}:B{wl_}", {"Lulus": (GOOD, GOOD_W), "Gagal": (BAD, BAD_W), "Sebagian": (WARN, WARN_W), "Tidak cocok": (WARN, WARN_W), "Indikasi": (WARN, WARN_W)})
        status_list(ww, "F", wf_, wl_)

    # ---------------- Situs AI ----------------
    if d.get("sitemap"):
        wsm = wb.create_sheet("Situs AI")
        title(wsm, "Situs yang dibaca AI", d["sitemap"].get("lede", ""), 7)
        counts = {}
        for q in qs:
            for src in ("chatgpt", "google"):
                for dm in {s["domain"] for s in (q.get(src) or {}).get("sources", [])}:
                    counts[dm] = counts.get(dm, 0) + 1
        rows = []
        for g in d["sitemap"]["groups"]:
            for sdata in g["sites"]:
                rows.append([g["name"], sdata["domain"], sdata.get("title", ""), counts.get(sdata["domain"], 0), sdata.get("present", ""),
                             sdata.get("action", ""), "Belum mulai" if sdata.get("action", "").startswith(("Minta", "Daftar")) else "Tidak perlu"])
        sf, sl = table(wsm, 4, ["Kelompok", "Situs", "Halaman", "Dikutip di (jawaban)", "Klinik ada di sana?", "Langkah berikut", "Status"],
                       rows, [24, 28, 40, 14, 24, 50, 18], wrap_cols=(3, 5, 6), center_cols=(4,))
        dv = DataValidation(type="list", formula1='"' + ",".join(STATUS + ["Tidak perlu"]) + '"', allow_blank=True)
        wsm.add_data_validation(dv)
        dv.add(f"G{sf}:G{sl}")
        color_words(wsm, f"G{sf}:G{sl}", {"Selesai": (GOOD, GOOD_W), "Sedang dikerjakan": (WARN, WARN_W)})

    # ---------------- Bahan Siap Pakai ----------------
    if d.get("kit"):
        wk = wb.create_sheet("Bahan Siap Pakai")
        title(wk, "Bahan Siap Pakai", d.get("kit_sub", ""), 3)
        rows = [[k["title"], k.get("for", ""), k["text"]] for k in d["kit"]]
        kf, kl = table(wk, 4, ["Bahan", "Untuk siapa dan kapan", "Teks"], rows, [34, 40, 90], wrap_cols=(1, 2, 3))
        for r in range(kf, kl + 1):
            wk.row_dimensions[r].height = 200

    # ---------------- Titik Awal ----------------
    wt = wb.create_sheet("Titik Awal")
    title(wt, "Titik Awal", "Angka hari ini, untuk dibandingkan dengan audit ulang memakai sepuluh pertanyaan yang sama.", 5)
    hdr = ["Ukuran", f"Hari ini ({m['date']})", "Audit ulang (isi nanti)", "Perubahan", "Catatan"]
    for i, (h, w) in enumerate(zip(hdr, [46, 20, 22, 14, 50]), start=1):
        c = wt.cell(row=4, column=i, value=h)
        c.font = font(10, True, "FFFFFF")
        c.fill = fill(VIOLET)
        c.border = BORDER
        wt.column_dimensions[get_column_letter(i)].width = w
    base = [
        (f"ChatGPT: jawaban yang menyebut {short}", "=Ringkasan!B8", "Dari jawaban ChatGPT yang selesai"),
        (f"ChatGPT: jawaban yang merekomendasikan {short}", "=Ringkasan!B9", ""),
        (f"Google AI Overview: ringkasan yang menyebut {short}", "=Ringkasan!B10", "Dari ringkasan AI yang tampil"),
        ("Google: pertanyaan tanpa AI Overview", "=Ringkasan!B12", ""),
    ]
    if d.get("facts"):
        nb = sum(1 for f in d["facts"] if f["verdict"] == "berbeda")
        base.append(("Cek fakta: klaim yang berbeda", nb, "Dari tab Cek Fakta"))
    if d.get("webcheck"):
        nf = sum(1 for w in d["webcheck"] if w["result"] in ("gagal", "sebagian", "tidakcocok"))
        base.append(("Website: pemeriksaan yang perlu diperbaiki", nf, "Gagal, sebagian, atau tidak cocok, dari tab Website"))
    for i, (label, val, note) in enumerate(base, start=5):
        wt.cell(row=i, column=1, value=label).font = font(10)
        c = wt.cell(row=i, column=2, value=val)
        c.font = font(11, True, VIOLET_INK)
        c.alignment = Alignment(horizontal="center")
        wt.cell(row=i, column=3).fill = fill(WASH)
        wt.cell(row=i, column=4, value=f'=IF(C{i}="","",C{i}-B{i})').alignment = Alignment(horizontal="center")
        wt.cell(row=i, column=5, value=note).font = font(10, color=MUTED)
        for col in range(1, 6):
            wt.cell(row=i, column=col).border = BORDER
    wt[f"A{len(base) + 6}"] = "Perubahan dicatat; pengaruh perbaikan tidak bisa dipastikan dari perbandingan ini saja."
    wt[f"A{len(base) + 6}"].font = font(10, color=MUTED, italic=True)

    for sheet in wb.worksheets:
        sheet.page_setup.orientation = "landscape"
        sheet.page_setup.fitToWidth = 1
        sheet.page_setup.fitToHeight = 0
        sheet.sheet_properties.pageSetUpPr.fitToPage = True
        sheet.oddFooter.center.text = f"{clinic} · Lembar Kerja · &P / &N"
    wb.active = 2  # open on Rencana Kerja
    wb.save(out)


def _plain(html):
    import re
    return re.sub(r"<[^>]+>", "", html)
