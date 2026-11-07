#!/usr/bin/env python3
"""Pemeriksa mekanis untuk teks bahasa Indonesia (skill bahasa-indonesia-luwes).

Pemeriksa ini menandai kesalahan yang bisa dikenali mesin: tanda pisah, bentuk
tidak baku, kata sambung "di mana", kalimat yang terlalu panjang, dan
sejenisnya. Ia tidak menilai rasa. Rasa tetap dinilai dengan membaca.

Pakai, dari akar repo:
  P=.agents/skills/bahasa-indonesia-luwes/scripts/periksa_teks.py
  python3 $P berkas.md [berkas lain ...]
  python3 $P -                       # baca dari masukan standar
  python3 $P --tanpa-nuave berkas    # lewati aturan khusus Nuave
  python3 $P --periksa-kutipan berkas
  python3 $P --ketat berkas          # kode keluar 1 jika ada temuan
                                     # [Nuave] atau [kaidah]

Yang tidak diperiksa: kepala YAML, blok kode, kode sebaris, tautan, tag HTML,
dan teks sesudah tanda ✗ sampai tanda | atau ✓ berikutnya. Pakai tanda ✗ untuk
contoh keliru di dokumen panduan.

Teks di dalam tanda petik juga dilewati, kecuali dengan --periksa-kutipan.
Kutipan jawaban AI, pertanyaan, dan bukti lain harus disalin persis
(docs/VOICE.md §5). Jangan memakai pemeriksa ini untuk pertanyaan audit,
karena ragamnya sengaja lisan (docs/VOICE.md §7.3).

Kategori temuan:
  [Nuave]  aturan docs/VOICE.md
  [kaidah] bentuk baku dan kaidah umum
  [gaya]   preferensi gaya dari korpus Ivan Lanin
"""

from __future__ import annotations

import argparse
import re
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

# Profil badan tulisan Ivan Lanin (lihat references/profil-korpus.md).
IVAN = {"rerata": 12.6, "median": 12.0, "panjang": 1.9, "pendek": 11.1}
BATAS_KATA = 25

KATA_RE = re.compile(r"[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\-·']*")
SINGKATAN = ("hlm", "dll", "dsb", "dst", "dkk", "No", "Dr", "Prof", "St", "Jl", "Mrs", "Mr")


@dataclass(frozen=True)
class Aturan:
    kategori: str
    pola: re.Pattern
    pesan: str
    khusus_nuave: bool = False
    bukan_tanya: bool = False
    lindungi: Optional[re.Pattern] = None  # bagian yang dikosongkan dulu untuk aturan ini
    saring: Optional[Callable[[str, int], bool]] = None  # False berarti temuan dilewati


def _r(pola: str, peka_huruf: bool = False) -> re.Pattern:
    return re.compile(pola, 0 if peka_huruf else re.IGNORECASE)


def _kata_sebelum(teks: str, posisi: int) -> str:
    """Kata tepat sebelum posisi, atau tanda baca jika yang mendahului tanda baca."""
    m = re.search(r"(\w+|[^\w\s])\s*$", teks[:posisi])
    return m.group(1).lower() if m else ""


# Kata sebelum "di mana" yang menandakan kata tanya, bukan kata sambung.
_SEBELUM_DI_MANA_TANYA = {
    "dan", "atau", "tahu", "mengetahui", "tentang", "pertanyaan", "bertanya", "menanyakan",
    "ditanya", "menjawab", "melihat", "menunjukkan", "menentukan", "memilih", "kepada",
    "dari", "sampai", "hingga", "(", ":", "“", '"',
}


def _di_mana_relatif(teks: str, posisi: int) -> bool:
    if _kata_sebelum(teks, posisi) in _SEBELUM_DI_MANA_TANYA:
        return False
    sesudah = teks[posisi + len("di mana"):]
    # "siapa, di mana, dan kapan" adalah deretan kata tanya, bukan kata sambung.
    return not re.match(r"\s*(?:,|dan\b|atau\b)", sesudah)


def _hal_samar(teks: str, posisi: int) -> bool:
    sebelum = _kata_sebelum(teks, posisi)
    if sebelum == "dalam":
        return False  # ungkapan "dalam hal ini"
    return not re.fullmatch(r"ke\w+|beberapa|banyak|semua|segala|berbagai|\d+", sebelum)


def _pasti_tegas(teks: str, posisi: int) -> bool:
    """'tidak pasti' dan 'belum pasti' justru menyangkal kepastian."""
    return _kata_sebelum(teks, posisi) not in {"tidak", "tak", "belum", "kurang"}


BAKU = [
    (r"dikarenakan", "karena"),
    (r"merubah", "mengubah"),
    (r"dirubah", "diubah"),
    (r"mempercayai", "memercayai"),
    (r"mempercayakan", "memercayakan"),
    (r"mempengaruhi", "memengaruhi"),
    (r"memberitahu", "memberi tahu"),
    (r"kadaluarsa|kadaluwarsa|kedaluarsa", "kedaluwarsa"),
    (r"(?:be)?resiko", "risiko atau berisiko"),
    (r"\w*praktek\w*", "praktik"),
    (r"(?:meng|di)?analisa", "analisis, menganalisis, atau dianalisis"),
    (r"silahkan", "silakan"),
    (r"(?:per|meng|di)?ijin(?:an|kan)?", "izin, perizinan, mengizinkan"),
    (r"\w*nasehat\w*", "nasihat"),
    (r"karir", "karier"),
    (r"apotik", "apotek"),
    (r"jadual", "jadwal"),
    (r"sistim", "sistem"),
    (r"aktifitas", "aktivitas"),
    (r"kwalitas", "kualitas"),
    (r"obyek\w*", "objek"),
    (r"subyek\w*", "subjek"),
    (r"frekwensi", "frekuensi"),
    (r"standarisasi", "standardisasi"),
    (r"mengkoordinir|mengkoordinasi(?:kan)?", "mengoordinasi(kan)"),
    (r"mengorganisir", "mengorganisasi"),
    (r"mensosialisasikan", "menyosialisasikan"),
    (r"mengkonsumsi", "mengonsumsi"),
    (r"mengkonfirmasi", "mengonfirmasi"),
    (r"mentaati", "menaati"),
    (r"terlanjur", "telanjur"),
    (r"sekedar", "sekadar"),
    (r"(?:meng|di)?himbau(?:an|kan)?", "imbau, imbauan, mengimbau"),
    (r"hutang", "utang"),
    (r"nafas", "napas"),
    (r"(?:meng)?antri(?:an)?", "antre, mengantre, antrean"),
    (r"cidera", "cedera"),
    (r"teoritis", "teoretis"),
    (r"hipotesa", "hipotesis"),
    (r"konkrit", "konkret"),
    (r"tehnik|tekhnik", "teknik"),
    (r"trampil", "terampil"),
    (r"propinsi", "provinsi"),
    (r"nopember", "November"),
    (r"pebruari", "Februari"),
    (r"atlit", "atlet"),
    (r"was-was", "waswas"),
    (r"kasat mata", "kasatmata"),
]

KATA_KERJA_DASAR = (
    "kirim|simpan|proses|cek|periksa|hapus|ubah|buat|tampilkan|bagikan|jalankan|"
    "terima|gunakan|pakai|tanyakan|uji|siapkan|kembalikan|catat|baca|tulis|isi|"
    "unduh|unggah|pilih|lihat|buka|tutup|kabari|hubungi|lanjutkan|perbaiki|"
    "perbarui|tambahkan|pastikan|sampaikan|ucapkan|berikan|kirimkan"
)

ATURAN: list[Aturan] = [
    # Nuave: tanda baca, angka, sapaan, istilah (docs/VOICE.md)
    Aturan("Nuave", _r(r"—"), "Tanda pisah panjang. Ganti dengan koma, titik dua, kurung, atau kalimat baru.", True),
    Aturan("Nuave", _r(r"–"), "Tanda pisah pendek di prosa. Tulis rentang dengan 'sampai'.", True,
           lindungi=_r(r"\b\d{1,2}\.\d{2}–\d{1,2}\.\d{2}\b|\bMinggu \d+–\d+\b", peka_huruf=True)),
    Aturan("Nuave", _r(r"(?<=\w) - (?=\w)"), "Tanda hubung berspasi dipakai sebagai tanda pisah. Ganti dengan koma atau 'sampai'.", True),
    Aturan("Nuave", _r(r"\bRp\.?\s+\d|\bRp\.\d"), "Tulis uang tanpa spasi dan tanpa titik sesudah Rp, misalnya Rp249.000.", True),
    Aturan("Nuave", _r(r"\d\s+%"), "Tanpa spasi sebelum %, misalnya 50%.", True),
    Aturan("Nuave", _r(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"), "Tulis tanggal dengan nama bulan, misalnya 17 Agustus 2026.", True),
    Aturan("Nuave", _r(r"\b(?:pukul|jam)\s+\d{1,2}:\d{2}\b|\b\d{1,2}:\d{2}\s*(?:WIB|WITA|WIT)\b"),
           "Tulis jam dengan titik, misalnya pukul 10.00.", True),
    Aturan("Nuave", _r(r"\bkamu\b"), "Sapa pembaca dengan 'Anda'.", True),
    Aturan("Nuave", _r(r"\bBapak\s*/\s*Ibu\b|\bIbu\s*/\s*Bapak\b|\bBapak dan Ibu\b|\bIbu dan Bapak\b"), "Sapa pembaca dengan 'Anda'.", True),
    Aturan("Nuave", _r(r"\bpengguna\b"), "Jika ini sapaan kepada pembaca, pakai 'Anda'.", True),
    Aturan("gaya", _r(r"\bkita\b"), "Di teks produk, 'kita' dapat mengaburkan pelaku. Pakai Anda, Nuave, atau kami.", True),
    Aturan("Nuave", _r(
        r"\bdi-?(?:download|upload|update|review|submit|share|cancel|refund)\b|"
        r"\bdi (?:download|upload|update|review|submit|share|cancel|refund)\b"
    ), "Imbuhan Indonesia dengan kata Inggris. Pakai padanannya, misalnya 'diunduh' atau 'diperbarui'. Label tombol 'Download PDF' tetap.", True),
    Aturan("Nuave", _r(r"\bcustomers?\b(?!\s+journey)"), "Pakai 'pelanggan' atau 'calon pelanggan'.", True),
    Aturan("Nuave", _r(r"\bklien\b"), "Pakai 'pelanggan'.", True),
    Aturan("Nuave", _r(r"\bkompetitor\b"), "Pakai 'pesaing' jika pesaingnya terverifikasi, atau 'bisnis lain yang disebut'.", True),
    Aturan("Nuave", _r(r"\binsights?\b"), "Pakai 'temuan'.", True),
    Aturan("Nuave", _r(r"\bmonitoring\b|\bpemantauan real-?time\b"), "Pakai 'cek ulang'.", True),
    Aturan("Nuave", _r(r"\bbrand Anda\b"), "Pakai 'bisnis Anda' atau jenis usahanya, misalnya 'klinik Anda'.", True),
    Aturan("Nuave", _r(r"\bmesin AI\b|\bsemua AI\b"), "Pakai 'AI' atau 'model AI' sesuai VOICE.md.", True),
    Aturan("Nuave", _r(r"\bterekspos\b"), "Pakai 'disebut'.", True),
    Aturan("Nuave", _r(r"\b(?:dll|dsb|dst)\.|\be\.g\.|\bi\.e\."), "Tulis frasanya secara lengkap.", True),
    Aturan("Nuave", _r(r"\bReview\b|\bSubmit\b", peka_huruf=True), "Hindari campur kode. Pakai 'Periksa' atau 'Kirim'.", True),
    Aturan("Nuave", _r(r"\bOK\b", peka_huruf=True), "Pakai label kata kerja yang jelas, misalnya 'Lanjut' atau 'Simpan' (VOICE.md §6).", True),
    Aturan("Nuave", _r(r"\banda\b", peka_huruf=True), "Tulis 'Anda' dengan huruf kapital.", True),
    Aturan("Nuave", _r(r"\b\d+(?:,\d+)?\s+persen\b"), "Tulis persen dengan lambang, misalnya 50% (VOICE.md §4).", True),
    Aturan("Nuave", _r(r"\b\d+\.\d+\s*%"), "Desimal memakai koma, misalnya 14,2% (VOICE.md §4).", True),
    Aturan("Nuave", _r(r"\bmendominasi\b|\bjangan sampai tertinggal\b|\btak terlihat di dunia AI\b|\brevolusi\w*|\bgame changer\b"),
           "Hype, ketakutan, atau klaim dominasi (VOICE.md §6).", True),
    Aturan("Nuave", _r(r"\bdijamin\b|\bterbukti meningkatkan\b"), "Kepastian tanpa bukti (VOICE.md §6).", True),
    Aturan("Nuave", _r(r"\bperingkat (?:teratas|pertama)\b|\bnomor satu\b|\bpaling dipercaya\b|\bpertama ditemukan\b"),
           "Peringkat atau superlatif tanpa dasar (VOICE.md §3 dan §6).", True),
    Aturan("Nuave", _r(r"\bvisibilitas nol\b"), "Uji yang gagal ditulis 'Tidak dapat diuji'. Jumlah nol tetap ditulis dengan penyebutnya.", True),
    Aturan("Nuave", _r(r"\bprompt\b"), "Di teks pelanggan, pakai 'pertanyaan' (VOICE.md §7.3).", True),
    Aturan("gaya", _r(r"\bpasti\b"), "Kepastian perlu dasar (VOICE.md §6). Abaikan jika kalimatnya memang menyangkal kepastian.", True,
           saring=_pasti_tegas),
    Aturan("gaya", _r(r"\bseragam\w*"), "Jika ini tentang data, VOICE.md memakai 'sinkron', 'samakan', atau 'konsisten'.", True),
    # Kaidah
    Aturan("kaidah", _r(r"\bdimana\b"), "Tulis 'di mana' terpisah. Sebagai kata sambung, pakai 'yang' atau 'tempat'."),
    Aturan("kaidah", _r(r"\b(?:disini|disana|disitu|kemana|darimana)\b"),
           "Kata depan ditulis terpisah: di sini, di sana, di situ, ke mana, dari mana."),
    Aturan("kaidah", _r(r"\bdi mana\b(?![-\s]+(?:pun|mana)\b)"), "Jika ini kata sambung, pakai 'yang' atau 'tempat', atau pecah kalimatnya.",
           bukan_tanya=True, saring=_di_mana_relatif),
    Aturan("kaidah", _r(r",\s*yang mana\b"), "'yang mana' sebagai kata sambung. Pakai 'yang', atau pecah kalimatnya.", bukan_tanya=True),
    Aturan("kaidah", _r(r"(?:,|[a-z])\s+namun\b", peka_huruf=True), "'namun' membuka kalimat baru. Di dalam kalimat, pakai ', tetapi'."),
    Aturan("kaidah", _r(r"\bNamun(?=\s)", peka_huruf=True), "Beri koma sesudah 'Namun' di awal kalimat."),
    Aturan("kaidah", _r(r"\bsangat\s+\w+\s+sekali\b"), "Pleonasme. Pilih 'sangat' atau 'sekali'."),
    Aturan("kaidah", _r(r"\bagar supaya\b|\bdemi untuk\b|\bsejak dari\b"), "Pleonasme. Buang kata yang berlebih."),
    Aturan("kaidah", _r(r"\bpara\s+(\w+)-\1\b"), "Setelah 'para', kata tidak perlu diulang."),
    Aturan("gaya", _r(r"\bnaik ke atas\b|\bturun ke bawah\b|\bmundur ke belakang\b|\bmaju ke depan\b"), "Kemungkinan pleonasme. Buang kata yang berlebih jika maknanya tetap."),
    # Gaya (korpus Ivan Lanin)
    Aturan("gaya", _r(r"\btapi\b"), "Ivan menulis 'tetapi' (90 kali) dan tidak pernah 'tapi' di badan tulisan."),
    Aturan("gaya", _r(r"\bsemakin\b"), "Ivan memakai 'makin'."),
    Aturan("gaya", _r(r"\bhal (?:ini|tersebut)\b"), "Sebut nama hal yang dimaksud.", saring=_hal_samar),
    Aturan("gaya", _r(
        r"\bdalam rangka\b|\badapun\b|\bbahwasanya\b|\bguna\b|\bmaka dari itu\b|\boleh sebab itu\b|"
        r"\bdengan ini kami\b|\bbersama ini kami\b|\bsehubungan dengan\b|\bberkenaan dengan\b|\bterkait hal\b|"
        r"\btidak dapat dipungkiri\b|\bseperti yang kita ketahui\b|\bpada dasarnya\b|\bperlu diingat\b|"
        r"\btentunya\b|\bjangan ragu untuk\b|\bdi era (?:digital|modern|sekarang|ini|serba)\w*"
    ), "Klise atau kata birokrat. Tulis langsung ke pokoknya."),
    Aturan("gaya", _r(r"\bmelakukan\s+(?:pe\w+an|\w+asi)\b"), "Pertimbangkan kata kerjanya langsung, misalnya 'membayar', bukan 'melakukan pembayaran'."),
    Aturan("gaya", _r(r"\bmaaf atas ketidaknyamanan\w*"), "Terjemahan harfiah 'Sorry for the inconvenience'. Lihat references/bahasa-layanan.md."),
    Aturan("gaya", _r(rf"\b(?:kami|saya)\s+(?:akan|tidak|sudah|belum|telah|sedang)\s+(?:{KATA_KERJA_DASAR})\b"), "Untuk pasif nol, letakkan kata bantu sebelum pelaku ('akan kami kirim'). Untuk kalimat aktif, pakai meN- ('kami akan mengirim')."),
    Aturan("gaya", _r(r"!(?![\[=])"), "Tanda seru. Perintah dan ajakan tidak memerlukannya."),
    Aturan("gaya", _r(r";"), "Titik koma boleh sesuai fungsinya (WRITING_GUIDE.md §6), tetapi Ivan tidak memakainya. Periksa apakah dua kalimat lebih jernih."),
]

for _salah, _baku in BAKU:
    ATURAN.append(Aturan("kaidah", _r(rf"\b(?:{_salah})\b"), f"Bentuk baku: {_baku}."))


@dataclass
class Blok:
    teks: str
    baris_awal: int
    statistik: bool = True
    tabel: bool = False


@dataclass
class Temuan:
    baris: int
    kategori: str
    pesan: str
    cuplikan: str


def _kosongkan(pola: str, teks: str, flags: int = 0) -> str:
    """Ganti bagian yang cocok dengan spasi sepanjang aslinya agar posisi tetap."""
    return re.sub(pola, lambda m: re.sub(r"[^\n]", " ", m.group(0)), teks, flags=flags)


# Hanya tag HTML yang dikenal. Placeholder seperti <nama bisnis> tetap terbaca.
_TAG_HTML = (
    r"</?(?:a|b|i|u|em|strong|br|p|div|span|code|pre|kbd|sup|sub|img|ul|ol|li|table|thead|"
    r"tbody|tr|td|th|details|summary|blockquote|hr|h[1-6])\b[^<>\n]*/?>"
)


def bersihkan(teks: str, periksa_kutipan: bool) -> str:
    teks = _kosongkan(r"`[^`\n]*`", teks)
    # Tanda baca di ujung tautan dan alamat email tetap ada agar kalimat terpisah.
    teks = _kosongkan(r"https?://[^\s<>()]*[^\s<>().,;:!?'\"”’]", teks)
    teks = _kosongkan(r"\]\([^)\n]*\)", teks)
    teks = _kosongkan(r"<!--.*?-->", teks, re.DOTALL)
    teks = _kosongkan(_TAG_HTML, teks, re.IGNORECASE)
    teks = _kosongkan(r"&[A-Za-z]+;|&#\d+;", teks)
    teks = _kosongkan(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", teks)
    teks = _kosongkan(r"✗[^|✓]*", teks)
    teks = teks.replace("✓", " ").replace("**", "  ")
    teks = _kosongkan(r"(?<![\w*])\*(?=\S)|(?<=\S)\*(?![\w*])", teks)
    teks = _kosongkan(r"(?<!\w)_(?=\w)|(?<=\w)_(?!\w)", teks)
    if not periksa_kutipan:
        teks = _kosongkan(r"“[^”]*”", teks)
        teks = _kosongkan(r'"[^"]*"', teks)
        teks = _kosongkan(r"‘[^’]*’", teks)
    return teks


def susun_blok(isi: str) -> list[Blok]:
    baris = isi.split("\n")
    blok: list[Blok] = []
    sekarang: list[str] = []
    awal = 0
    dalam_kode = False
    pagar_kode = ""

    def tutup() -> None:
        nonlocal sekarang
        if sekarang:
            blok.append(Blok("\n".join(sekarang), awal))
            sekarang = []

    mulai = 0
    if baris and baris[0].strip() == "---":
        for i in range(1, len(baris)):
            if baris[i].strip() == "---":
                mulai = i + 1
                break

    for i in range(mulai, len(baris)):
        b = baris[i]
        s = b.strip()
        nomor = i + 1
        if dalam_kode:
            if s.startswith(pagar_kode):
                dalam_kode = False
            continue
        if s.startswith("```") or s.startswith("~~~"):
            tutup()
            dalam_kode = True
            pagar_kode = s[:3]
            continue
        if not s:
            tutup()
            continue
        if s.startswith("#"):
            tutup()
            blok.append(Blok(s.lstrip("#").strip(), nomor, statistik=False))
            continue
        if s.startswith("|"):
            tutup()
            if re.fullmatch(r"\|?[\s:|-]+\|?", s):
                continue
            blok.append(Blok(s, nomor, tabel=True))
            continue
        if s.startswith(">"):
            s = s.lstrip(">").strip()
        butir = re.match(r"^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?", s)
        if butir:
            tutup()
            awal = nomor
            sekarang = [s[butir.end():]]
            continue
        if not sekarang:
            awal = nomor
        sekarang.append(s)
    tutup()
    return blok


def pecah_kalimat(teks: str) -> list[tuple[int, str]]:
    """Kembalikan pasangan (posisi awal, kalimat) dari teks satu blok."""
    lindung = teks
    for ab in SINGKATAN:
        lindung = re.sub(rf"\b{ab}\.", lambda m: m.group(0)[:-1] + "\x00", lindung)
    hasil = []
    pos = 0
    # Kalimat baru diawali huruf kapital, angka, atau placeholder seperti [nama] dan {nama}.
    for m in re.finditer(r"[.?!…][”\"’)\]]*(?=\s+(?:[“\"‘(]?[A-Z0-9]|[\[{<]))", lindung):
        akhir = m.end()
        potong = teks[pos:akhir]
        if potong.strip():
            hasil.append((pos + len(potong) - len(potong.lstrip()), potong.strip()))
        pos = akhir
    sisa = teks[pos:]
    if sisa.strip():
        hasil.append((pos + len(sisa) - len(sisa.lstrip()), sisa.strip()))
    return hasil


def kata(kalimat: str) -> list[str]:
    return KATA_RE.findall(kalimat)


def baris_dari(blok: Blok, posisi: int) -> int:
    return blok.baris_awal + blok.teks.count("\n", 0, posisi)


def cuplik(teks: str, mulai: int, akhir: int) -> str:
    kiri = max(0, mulai - 30)
    kanan = min(len(teks), akhir + 30)
    potong = re.sub(r"\s+", " ", teks[kiri:kanan]).strip()
    return ("…" if kiri > 0 else "") + potong + ("…" if kanan < len(teks) else "")


def kalimat_tanya(teks: str, posisi: int) -> bool:
    sesudah = re.search(r"[.?!]", teks[posisi:])
    return bool(sesudah and sesudah.group(0) == "?")


def periksa(isi: str, tanpa_nuave: bool, periksa_kutipan: bool) -> tuple[list[Temuan], list[int]]:
    temuan: list[Temuan] = []
    panjang: list[int] = []
    for blok in susun_blok(isi):
        bersih = bersihkan(blok.teks, periksa_kutipan)
        for aturan in ATURAN:
            if tanpa_nuave and aturan.khusus_nuave:
                continue
            sasaran = bersih
            if aturan.lindungi is not None:
                sasaran = aturan.lindungi.sub(lambda m: " " * len(m.group(0)), bersih)
            for m in aturan.pola.finditer(sasaran):
                if aturan.bukan_tanya and kalimat_tanya(bersih, m.start()):
                    continue
                if aturan.saring is not None and not aturan.saring(bersih, m.start()):
                    continue
                temuan.append(Temuan(baris_dari(blok, m.start()), aturan.kategori, aturan.pesan,
                                     cuplik(bersih, m.start(), m.end())))
        if not blok.statistik:
            continue
        bagian = bersih.split("|") if blok.tabel else [bersih]
        geser = 0
        for sel in bagian:
            for posisi, kal in pecah_kalimat(sel):
                n = len(kata(kal))
                if n == 0:
                    continue
                if re.search(r"[.?!…][”\"’)\]]*$", kal):
                    panjang.append(n)
                if n > BATAS_KATA:
                    temuan.append(Temuan(baris_dari(blok, geser + posisi), "gaya",
                                         f"Kalimat {n} kata. Pertimbangkan memecahnya.",
                                         cuplik(kal, 0, min(len(kal), 60))))
            geser += len(sel) + 1
    temuan.sort(key=lambda t: t.baris)
    return temuan, panjang


def angka(x: float) -> str:
    return f"{x:.1f}".replace(".", ",")


def ringkasan(panjang: list[int]) -> str:
    if not panjang:
        return "Ringkasan: tidak ada kalimat lengkap yang dapat dihitung."
    n = len(panjang)
    rerata = statistics.mean(panjang)
    median = statistics.median(panjang)
    lebih = 100 * sum(1 for p in panjang if p > BATAS_KATA) / n
    pendek = 100 * sum(1 for p in panjang if p <= 6) / n
    return (
        f"Ringkasan: {n} kalimat · rerata {angka(rerata)} kata (Ivan {angka(IVAN['rerata'])}) · "
        f"median {angka(median)} (Ivan {angka(IVAN['median'])}) · "
        f"lebih dari {BATAS_KATA} kata {angka(lebih)}% (Ivan {angka(IVAN['panjang'])}%) · "
        f"6 kata atau kurang {angka(pendek)}% (Ivan {angka(IVAN['pendek'])}%)"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Periksa teks bahasa Indonesia secara mekanis.")
    parser.add_argument("berkas", nargs="+", help="Berkas teks atau Markdown. Pakai - untuk masukan standar.")
    parser.add_argument("--tanpa-nuave", action="store_true", help="Lewati aturan khusus Nuave (VOICE.md).")
    parser.add_argument("--periksa-kutipan", action="store_true",
                        help="Periksa juga teks di dalam tanda petik. Bawaannya dilewati karena kutipan harus persis.")
    parser.add_argument("--ketat", action="store_true", help="Kode keluar 1 jika ada temuan [Nuave] atau [kaidah].")
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    berat = 0
    for nama in args.berkas:
        isi = sys.stdin.read() if nama == "-" else Path(nama).read_text(encoding="utf-8")
        label = "masukan" if nama == "-" else nama
        temuan, panjang = periksa(isi, args.tanpa_nuave, args.periksa_kutipan)
        print(f"== {label} ==")
        for t in temuan:
            print(f"{label}:{t.baris}: [{t.kategori}] {t.pesan} «{t.cuplikan}»")
        hitung = {k: sum(1 for t in temuan if t.kategori == k) for k in ("Nuave", "kaidah", "gaya")}
        berat += hitung["Nuave"] + hitung["kaidah"]
        print(ringkasan(panjang))
        print(f"Temuan: {hitung['Nuave']} Nuave · {hitung['kaidah']} kaidah · {hitung['gaya']} gaya\n")
    return 1 if args.ketat and berat else 0


if __name__ == "__main__":
    sys.exit(main())
