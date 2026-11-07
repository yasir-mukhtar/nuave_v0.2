# Report PDF design reference (D-4)

The visual reference for [`docs/REPORT_PDF_DESIGN_PLAN.md`](../../docs/REPORT_PDF_DESIGN_PLAN.md).
It was exported from the founder's Figma page "Redesain Report Nuave" (file
`W66XEpO1rKQY8vbKyvo7xq`, page `1:156`) on 2026-11-07. That export came
after the Figma followed the approved Report v3 page order (plan §5.2) and
the founder approved the five section titles.

- `reference.pdf`: 39 pages, 16:9 (1440 × 810 points), each page an image of
  one Figma frame at 1.5× resolution. Text in it cannot be selected; it is a
  picture of the design, not the product PDF.

Where this reference and a spec disagree, the spec wins (D-4). It is not
served by the app and nothing reads it at run time.

## What the pages hold

- **Pages 1 to 6, front pages:** cover, Daftar isi, Cara membaca laporan,
  Ringkasan, Saat calon pasien bertanya, Peta jawaban.
- **Pages 7 to 14, 01 "Posisi Ultima hari ini":** divider, five Temuan pages,
  Pesaing, Celah topik.
- **Pages 15 to 17, 02 "Apa kata AI tentang Ultima":** divider, Cek fakta,
  Kata AI dan kata Anda.
- **Pages 18 to 21, 03 "Apa yang dibaca AI":** divider, Halaman mereka,
  Situs yang dibaca AI, Untuk tim web Anda.
- **Pages 22 to 29, 04 "Rencana delapan minggu":** divider, Rencana, two
  Langkah pages, Bahan siap pakai, Lembar Kerja, Penutup, Titik awal. Titik
  awal is its own page (v3 revision 6.4).
- **Pages 30 to 38, 05 "Lampiran":** divider, an index (A0) and sample answer
  pages for the likely cases:
  - a question asked three times;
  - a long answer with a table and its continued page;
  - an ordinary answer;
  - Google without an AI Overview;
  - an answer that names no clinic;
  - no search volume, no cited sources and a failed check.
- **Page 39:** the back cover.

## Limits

- **The data is invented,** from the Report v3 proof of concept A ("Ultima
  Clinic", `.example` sites, PR #205). The A5 "no clinic named" and A8
  pages change that data on purpose, to show the case.
- **Only some pages show real data today.** The plan's §5.2 says which pages
  today's saved data can fill and which wait for a Report v3 package.
- **Only two Langkah pages are drawn.** The PDF gets one per recommendation:
  page 24 shows the full v3 version and page 25 the version with today's
  data.
