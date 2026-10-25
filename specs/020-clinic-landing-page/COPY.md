# Spec 020 copy: every word on the clinic landing page

> Status: **Approved** with [`SPEC.md`](./SPEC.md) on 2026-10-25
> Language: Indonesian
> Updated: 2026-10-25

Where the words come from:

- **Figma.** The founder's design, page "Landing · Full page v2" (`244:2`),
  read on 2026-10-25 after the founder's own edits. Most of the page.
- **FAQ.md.** The approved answers in `docs/content/website/FAQ.md`
  (S5 wording, approved 2026-10-25).
- **Today.** Kept from today's landing (`src/components/landing/Landing.tsx`).
- **Proposal.** New words for things the design does not draw yet. The
  founder approved them with the spec.
- **Fix.** A small change to the design's words, listed with its reason in
  [Small fixes](#small-fixes).
- **D-n.** Settled by that decision in SPEC.md.

A `/` inside a heading marks the line break drawn in the design on a laptop.
On a phone, text wraps where it fits unless a break is noted.

## Page

| Item | Words | From |
| --- | --- | --- |
| Browser tab title | Nuave · Cek klinik Anda di ChatGPT dan Google AI Overview | Proposal |
| Description | Cek apakah klinik Anda muncul di ChatGPT dan Google AI Overview. Dapatkan rekomendasi perbaikan. | Proposal (the hero lede) |

## Menu

- Logo: "Nuave". Its link name for screen readers: "Nuave, ke beranda"
  (Today).
- Links (laptop): "Cara kerja" → S4, "Laporan" → S5, "Harga" → S7,
  "FAQ" → S8.
- Button: "Cek klinik saya". It brings the reader to the hero form.
- Phone (Proposal; not drawn):
  - Menu button: "Buka menu". Close button in the sheet: "Tutup menu".
  - The sheet shows the four links and the "Cek klinik saya" button.

## Resume banner (Today)

Shown above the headline only when this browser has a saved journey:

- "Audit Anda sedang berjalan" (an order is in progress), or
- "Lanjutkan audit {nama bisnis}", or "Lanjutkan audit Anda" without a name.

## S1 · Hero

- **H1:** "Pasien sekarang / tanya AI dulu / sebelum pilih klinik". The three
  line breaks hold on a phone too. No full stop.
- **Lede:** "Cek apakah klinik Anda muncul di ChatGPT dan Google AI
  Overview. Dapatkan rekomendasi perbaikan."
- **Form** (the same in S1, S7 and S9):
  - Field: "Website atau Instagram klinik" (placeholder, and the field's name
    for screen readers).
  - Button: "Cek klinik saya di AI".
  - Error: "Masukkan satu website atau akun Instagram yang valid." (Today)
- **Line under the form:** "Cek apakah klinik Anda bisa ditemukan, gratis. /
  Rp249.000 untuk mulai audit lengkap."
- **Ticks:**
  1. "10 pertanyaan berdasarkan volume pencarian tertinggi Google" (D-2: kept)
  2. "ChatGPT dan Google AI Overview"
  3. "Laporan siap dalam 15 menit"
- **Clinic-type tabs:** "Kecantikan" (selected on load), "Gigi", "Kulit",
  "Anak", "Lainnya". Name of the tab group for screen readers: "Jenis klinik"
  (Proposal).
- **Phone:** status bar "9:41"; chat label "AI"; the patient's question;
  the answer opens with "Beberapa klinik yang bisa dipertimbangkan:"; three
  clinics; then an empty slot "Klinik Anda?".

  | Tab | Patient question | Klinik A | Klinik B | Klinik C | From |
  | --- | --- | --- | --- | --- | --- |
  | Kecantikan | Ada klinik kecantikan di Jakarta Selatan yang bisa atasi bekas jerawat dan buka Sabtu? | laser bekas jerawat oleh dokter | buka Sabtu sampai sore | harga jelas sejak konsultasi | Figma |
  | Gigi | Ada klinik gigi di Jakarta Selatan yang bisa pasang behel dan buka sampai malam? | behel oleh dokter gigi spesialis | buka sampai malam | biaya behel bisa dicicil | D-4 |
  | Kulit | Ada klinik kulit di Jakarta Selatan yang bisa atasi jerawat parah dan konsultasi online? | ditangani dokter spesialis kulit | bisa konsultasi online dulu | jadwal dokter tertera di website | D-4 |
  | Anak | Ada klinik anak di Jakarta Selatan yang melayani vaksin dan buka hari Minggu? | jadwal vaksin anak lengkap | buka hari Minggu pagi | ruang tunggu ramah anak | D-4 |
  | Lainnya | Ada klinik umum di Jakarta Selatan yang bisa medical check-up dan buka 24 jam? | paket medical check-up lengkap | buka 24 jam, ada dokter jaga | harga paket tertera jelas | D-4 |

  Each clinic shows as "Klinik A:" with its line below.

- **Report card** (the same for every tab): "AI Visibility Report";
  "ChatGPT" "muncul di 3 dari 10"; "Google AI Overview" "muncul di 1 dari 6".
- **Caption:** "Nama klinik hanya ilustrasi." (D-3)

## Sticky bar (Proposal, from the lofi notes)

- Text: "Gratis dulu · Audit Rp249.000"
- Button: "Cek klinik saya"

## S2 · Pasien pilih lewat AI

- **H2:** "Makin banyak pasien / pilih dokter lewat AI"
- **Line:** "Banyak pasien lebih mengikuti saran AI daripada hasil pencarian
  di Google."
- **Rows**, in this order on every screen (the founder moved Indonesia last,
  so the first row matches the "AS" in the line above):

  | Figure | Text |
  | --- | --- |
  | 47% | warga AS mencari dokter lewat AI seperti ChatGPT atau Google AI Overview.¹ |
  | 40 juta | orang di dunia bertanya soal kesehatan ke ChatGPT tiap hari.² |
  | 2024 | AI Overview mulai digunakan dalam pencarian Google di Indonesia.³ |

- **Sources** (Fix: punctuation):
  - "Sumber:"
  - "¹ rater8 Patient Choice Report 2026, survei 992 orang dewasa di AS, April 2026;"
  - "² OpenAI, Januari 2026;"
  - "³ Google Indonesia, 2024."

## S3 · Tidak ada halaman dua

- **H2:** "Di jawaban AI, / tidak ada halaman dua"
- **Line:** "ChatGPT dan Google AI Overview hanya menyebut beberapa klinik. /
  Apakah klinik Anda termasuk?"
- **ChatGPT card:**
  - Label "ChatGPT".
  - Question: "rekomendasi klinik kecantikan bekas jerawat jakarta selatan".
  - Answer: "Beberapa klinik kecantikan di Jakarta Selatan yang bisa
    dipertimbangkan:"
    - "Klinik A: laser bekas jerawat oleh dokter"
    - "Klinik B: buka Sabtu sampai sore"
    - "Klinik C: ada dokter spesialis kulit"
    - "Klinik Anda?"
  - No sources (as in the design).
  - Input: "Tanyakan apa saja".
- **Google card:**
  - Label "Google AI Overview"; logo text "Google".
  - Query: "rekomendasi klinik kecantikan bekas jerawat jakarta selatan".
  - Tabs: "Semua", "Maps", "Gambar", "Berita"; block label "AI Overview".
  - Answer: "Ada beberapa klinik kecantikan di Jakarta Selatan untuk bekas
    jerawat:"
    - "Klinik A: paket laser bisa dicicil"
    - "Klinik D: ada konsultasi dokter"
    - "Klinik E: dekat stasiun, parkir luas"
    - "Klinik Anda?"
  - Sources: "klinik-a.contoh", "direktori.contoh".
- **Caption:** "Nama klinik hanya ilustrasi. Google tidak selalu menampilkan AI
  Overview." (D-3)

## S4 · Cara kerja (`#cara-kerja`)

- **H2:** "Kami tanya AI persis / seperti pasien Anda"
- **Step 1:**
  - "Masukkan website", tag "Gratis".
  - "Atau akun Instagram klinik Anda. Nuave membaca data yang tersedia."
  - Picture: a field with "klinikcantikfiksi.com", then a found card
    "Klinik Cantik Fiksi" / "Jakarta Selatan".
- **Step 2:**
  - "Bayar dan cek", tag "Rp249.000".
  - "Nuave siapkan 10 pertanyaan berdasarkan volume pencarian di Google.
    Anda tinggal cek."
  - Picture, a question card:
    - "Pertanyaan 3", tag "Contoh";
    - "Dicari di Google";
    - "v shape jakarta selatan harga";
    - "Topik: v shape · ±1.600 pencarian/bulan di Google, seluruh Indonesia
      (data September 2026)".
- **Step 3:**
  - "Terima laporan".
  - "Kami tanyakan ke ChatGPT dan Google AI Overview. Laporan lengkap siap
    dalam 15 menit."
  - Picture, an email: "Tim Nuave"; "AI Visibility Report untuk / Klinik
    Cantik Fiksi sudah siap"; button "Buka laporan".
- **Caption:** "Nama klinik hanya ilustrasi."

## S5 · Laporan (`#laporan`)

- **H2:** "Lihat apa kata AI tentang klinik Anda" (no full stop)
- **Line:** "Lengkap dengan rekomendasi perbaikan."
- **Tabs and their descriptions** (laptop: a list beside the card; phone:
  a segmented control with the selected tab's description below):

  | Tab | Description |
  | --- | --- |
  | Skor | Muncul di berapa jawaban ChatGPT dan Google AI Overview. |
  | Jawaban AI | Jawaban utuh ChatGPT dan Google AI Overview beserta sumbernya. |
  | Klinik lain | Menampilkan klinik lain yang muncul dalam jawaban AI. |
  | Perbaikan | Tindak lanjut yang bisa dikerjakan, plus topik yang belum menyebut Anda. |

- **Under the tabs:** "Download PDF, siap dibawa ke rapat." and the caption
  "Nama klinik hanya ilustrasi."
- **Report card header** (every tab):
  - "AI Visibility Report", with "Download PDF" drawn as a button. It is part
    of the picture, so it does nothing.
  - "Klinik Cantik Fiksi · Jakarta Selatan" (may wrap on a phone).
  - "Diperiksa di ChatGPT dan Google AI Overview · 20 Oktober 2026"
  - "Google: Jakarta Selatan · ChatGPT: Indonesia"

### Tab Skor

- **ChatGPT**
  - "Klinik Anda muncul di 3 dari 10 pertanyaan"
  - "Klinik Anda direkomendasikan di 1 dari 10 pertanyaan"
- **Google AI Overview**
  - "Google menampilkan AI Overview di 6 dari 10 pertanyaan"
  - "Klinik Anda muncul di 1 dari 6 pertanyaan"

### Tab Jawaban AI

The design's beauty version (Figma `294:3`), with one Fix to the question's
label and topic line.

- Title: "Jawaban ChatGPT dan Google AI Overview"
- "Pertanyaan 2"
- Question: "klinik kecantikan terdekat jakarta selatan" (Fix)
- Label: "Disusun dari topik yang dicari" (Fix)
- "Topik: klinik kecantikan terdekat · ±49.500 pencarian/bulan di Google,
  seluruh Indonesia" (Fix)
- **ChatGPT**, asked from "Indonesia":
  - "“...Klinik A di Kebayoran Baru dikenal untuk perawatan jerawat dan
    laser, dengan pilihan cicilan. Klinik Cantik Fiksi juga melayani facial
    dan laser, tetapi informasi biaya dan jadwal dokternya belum banyak
    ditemukan...”"
  - Sources: "klinik-a.contoh", "Google Maps", "direktori.contoh".
- **Google AI Overview**, searched from "Jakarta Selatan":
  - "“...Beberapa klinik kecantikan di Jakarta Selatan antara lain Klinik A,
    Klinik D, dan Klinik E. Sebaiknya bandingkan biaya dan jadwal konsultasi
    sebelum memilih...”"
  - Sources: "direktori.contoh", "klinik-d.contoh", "klinikcantikfiksi.com"
    (Fix) with the tag "Dipakai sebagai sumber".

### Tab Klinik lain

- Title: "Klinik lain yang disebut"
- **ChatGPT:** "Klinik A" "Pertanyaan 2, 5"; "Klinik B" "Pertanyaan 3, 4, 7, 8"
- **Google AI Overview:** "Klinik A" "Pertanyaan 2, 4"; "Klinik D"
  "Pertanyaan 2"; "Klinik E" "Pertanyaan 2, 6" (Fix)
- Note: "Google tidak menampilkan AI Overview untuk 4 dari 10 pertanyaan ini."

### Tab Perbaikan

- Title: "Yang dapat dilakukan"
- Tag: "Kerjakan dulu"
- "Samakan jam praktik di website, Google Maps, dan Instagram."
- "Mengapa: Jam buka berbeda di tiga tempat. Di Pertanyaan 4, ChatGPT
  menyebut klinik lain yang mencantumkan jam buka Sabtu."
- "Berdasarkan: Pertanyaan 4 dan 7 · Google Maps · Instagram"
- "Penanggung jawab yang disarankan: Admin"
- "Selesai ketika: Jam praktik sama persis di ketiga tempat."
- **"Topik yang belum menyebut Anda"** (search numbers are real, from the
  Spec 018 probe; Fix: lines worded like the real report):

  | Topic | Search line | Cited |
  | --- | --- | --- |
  | v shape | ±1.600 pencarian/bulan di Google, seluruh Indonesia · Pertanyaan 3 | Dikutip: klinik-a.contoh, direktori.contoh |
  | skin rejuvenation | ±320 pencarian/bulan di Google, seluruh Indonesia · Pertanyaan 5 | Dikutip: klinik-d.contoh |
  | biaya laser wajah di klinik kecantikan | ±260 pencarian/bulan di Google, seluruh Indonesia · Pertanyaan 9 | Dikutip: direktori.contoh |

## S6 · Bisa dipercaya, bisa ditindaklanjuti

- **H2:** "Bisa dipercaya, bisa ditindaklanjuti"

| Card | Text |
| --- | --- |
| Apa adanya | Jawaban AI ditampilkan utuh dengan sumbernya. |
| Bahasa pasien | 10 pertanyaan dengan bahasa natural pasien. |
| Tanpa repot | Cukup alamat website atau Instagram. Tanpa daftar, tanpa kata sandi. |
| Siap ditindaklanjuti | Ada penjelasan lengkap untuk setiap saran perbaikan. |

## S7 · Yang Anda dapat + harga (`#harga`)

- **H2:** "Yang Anda dapat dari satu audit"
- **Line:** "Rp249.000 sekali bayar."
- **Receipt:** "AI Visibility Report" / "Diperiksa di ChatGPT dan Google AI
  Overview"

  | No. | Item | Text |
  | --- | --- | --- |
  | 01 | 10 pertanyaan pasien | Berdasarkan volume pencarian di Google untuk jenis klinik dan kota Anda. |
  | 02 | Jumlah pencarian | Data berapa kali topiknya dicari per bulan. |
  | 03 | Jawaban ChatGPT | Ditanyakan langsung ke ChatGPT, dijawab lengkap dengan sumbernya. |
  | 04 | Google AI Overview | Dicek dari kota Anda dan seberapa sering Google menampilkannya. |
  | 05 | Skor | Disebut di berapa jawaban ChatGPT dan Google AI Overview. |
  | 06 | Klinik lain | Menampilkan klinik lain yang muncul dalam jawaban AI. |
  | 07 | Sumber AI | Situs apa saja yang menjadi referensi AI dalam membuat jawaban. |
  | 08 | Topik terlewat | Topik yang dicari orang, tapi belum menyebut klinik Anda. |
  | 09 | Perbaikan dan PDF | Apa tindak lanjut yang bisa dikerjakan. Siap dibahas dalam rapat. |

- **Price block:**
  - "Rp249.000"
  - "Sekali bayar. / Tanpa langganan. / Tanpa biaya tambahan."
  - "Bayar setelah klinik Anda ketemu."
  - "QRIS · Transfer bank · GoPay · DANA"
  - The form (see S1).
  - "Laporan siap dalam 15 menit setelah audit dimulai."

## S8 · FAQ (`#faq`)

- **H2:** "Yang sering ditanyakan"
- Eleven questions with the approved FAQ.md words and order (Fix). FAQ.md
  puts "Berapa lama?" before "Jawaban AI kan berubah-ubah?". The two
  questions only on `/faq` ("Apa yang saya terima?" and "Data apa yang
  perlu saya isi?") are left out, as in the design. Links inside answers go
  to `/terms`.

1. **Bagaimana cara klinik muncul di Google AI Overview?** (open on load)

   Tidak ada yang bisa menjamin. Google memilih sendiri sumbernya, dan sering
   tidak menampilkan AI Overview untuk pencarian lokal.

   Langkah pertama adalah tahu posisi klinik Anda sekarang: pertanyaan mana
   yang memunculkan AI Overview, klinik dan situs apa yang disebut, dan
   informasi apa yang perlu dibenahi.

2. **Bedanya dengan SEO?**

   Tujuannya mirip, tempatnya beda. SEO mengurus posisi website di hasil
   Google. Nuave melihat apakah ChatGPT dan Google AI Overview menyebut
   klinik Anda, dan dari sumber apa.

3. **Bisa cek sendiri di ChatGPT?**

   Bisa. Bedanya, Anda hanya melihat satu jawaban, dari satu akun, pada satu
   waktu. Nuave menanyakan sepuluh pertanyaan dari pencarian Google ke
   ChatGPT dan Google AI Overview. Pertanyaan tentang memilih klinik menyebut
   kota Anda. Lalu kami catat jawaban, sumber, klinik lain yang disebut, dan
   yang perlu dibenahi.

4. **AI apa yang diuji?**

   ChatGPT dan Google AI Overview, dengan sepuluh pertanyaan yang sama
   persis. Google sering tidak menampilkan AI Overview untuk pencarian lokal.
   Laporan mencatat seberapa sering, sebagai temuan, bukan sebagai
   pemeriksaan yang gagal.

5. **Dari mana pertanyaannya?**

   Dari data pencarian Google untuk jenis klinik dan kota Anda. Tiap
   pertanyaan diberi label asalnya. Jika datanya tidak cukup, pertanyaan
   disusun dari profil klinik Anda, dan labelnya menyebut itu.

   Anda membaca dan boleh mengubah sepuluh pertanyaan itu sebelum audit
   dimulai. Setelah Anda setuju, pertanyaan dikunci.

6. **Apa yang gratis?**

   Yang gratis hanya mencari klinik Anda, lalu Anda memastikan itu benar
   klinik Anda. Di langkah ini belum ada hasil AI.

   Hasil AI ada di audit Rp249.000, sekali bayar. Tidak ada langganan dan
   tidak ada biaya tambahan saat checkout. Bayar lewat QRIS, transfer bank,
   GoPay, atau DANA.

7. **Berapa lama?**

   Cek gratis biasanya hanya beberapa detik. Laporan siap dalam 15 menit
   setelah audit dimulai. Jika ada bagian yang gagal diperiksa, tim kami
   membantu menyelesaikannya. Jika tetap tidak bisa, Anda mendapat
   pengembalian dana sebagian, sesuai jumlah pemeriksaan yang gagal.

   Audit dimulai saat Anda menyetujui sepuluh pertanyaan. Anda boleh menutup
   halaman. Link laporan dikirim ke email pesanan dan berlaku 12 bulan.

   Setelah membayar, lanjutkan isian di browser yang sama. Jika pertanyaan
   belum Anda setujui dalam 7 hari, pesanan berakhir dan uang Anda kembali
   penuh.

8. **Jawaban AI kan berubah-ubah?**

   Benar. Jawaban bisa berbeda menurut waktu, akun, dan lokasi. Laporan
   mencatat jawaban pada satu waktu, lengkap dengan tanggal dan sumbernya.
   Karena itu kami sarankan cek ulang, sebagai pesanan baru, setelah 6
   sampai 8 minggu.

   Laporan bukan peringkat atau jaminan. Nuave tidak menjamin klinik Anda
   akan disebut, atau pasien dan penjualan akan naik.

9. **Klinik saya punya beberapa cabang.**

   Satu audit untuk satu kota, yaitu kota utama klinik Anda atau kota cabang
   yang Anda pilih, atau untuk seluruh Indonesia. Pilihannya Anda tentukan
   setelah membayar. Untuk kota lain, pesan audit terpisah.

10. **Aman soal aturan iklan kesehatan?**

    Laporan Nuave untuk internal klinik, bukan iklan. Sarannya biasanya
    tentang informasi seperti jadwal, layanan, dan lokasi. Sebelum
    memakainya untuk promosi, pastikan sesuai aturan iklan kesehatan yang
    berlaku.

11. **Kalau ada masalah?**

    Pemeriksaan yang gagal ditandai Tidak dapat diuji, dengan tautan Minta
    bantuan. Itu bukan hasil buruk. Tim kami membantu memeriksa ulang. Jika
    tetap tidak bisa, Anda mendapat pengembalian dana sebagian: Rp12.450
    untuk setiap pemeriksaan yang gagal. Jika audit tidak bisa selesai, atau
    laporan belum siap 24 jam setelah audit dimulai, uang Anda kembali penuh.

    Salah ketik email saat memesan? Kirim bukti pembayaran atau nomor
    transaksi Midtrans ke support@nuave.ai, dan kami bantu.

    Untuk hal lain, balas email laporan Anda atau tulis ke support@nuave.ai.
    Kami balas dalam 1 hari kerja. Rinciannya ada di
    [Syarat dan ketentuan](/terms).

## S9 · Penutup

- **H2:** "Cek klinik Anda sebelum / pasien berikutnya bertanya". The phone
  design breaks it as "Cek klinik Anda / sebelum pasien / berikutnya
  bertanya".
- **Line:** "Mulai dari website atau Instagram klinik Anda."
- **Form:** see S1.
- **Line under the form:** "Cek apakah klinik Anda bisa ditemukan, gratis. /
  Rp249.000 untuk mulai audit lengkap." (D-3: the hero's line)
- **Street picture:** the empty shop sign "Klinik Anda?" with "?".
- **Contact:** "Ada pertanyaan lain? Hubungi kami di support@nuave.ai."
  The address is a `mailto:` link.

## Footer

- "Nuave"
- Links: "FAQ" → `/faq`; "Syarat dan Ketentuan" → `/terms` (Fix);
  "Kebijakan Privasi" → `/privacy`; "Kontak" → `/support`.
- "Pengaturan cookie", only while the Meta Pixel is set up: it reopens the
  cookie notice (Spec 019, cookie notice and Meta Pixel).
- "© {tahun ini} Nuave", which shows "© 2026 Nuave" now.

## Names for screen readers (Proposal)

Not visible; read aloud by screen readers.

- Menu links (laptop and phone sheet): "Bagian halaman". Phone sheet: "Menu".
- Footer links: "Tautan situs".
- Hero clinic tabs: "Jenis klinik". S5 tabs: "Isi laporan".
- S5 report card: "Contoh laporan: Klinik Cantik Fiksi".
- The pictures, the icons and the phone's status bar are hidden from screen
  readers; the words beside them say the same.

## Small fixes

Each one keeps the design's meaning. The founder can reverse any of them in
review.

1. **S2 sources.** The three lines end ";" ";" "." instead of ";" "." ";".
2. **S5 Jawaban AI.** In the design, "klinik kecantikan terdekat" carries the
   label "Dicari di Google". A real report never shows that: a question
   about choosing a clinic must name the city, and a reworded one is labelled
   "Disusun dari topik yang dicari" (Spec 018 R-10a). The example now
   follows that rule and words the topic line like the real report.
3. **S5 Klinik lain.** Google's answer to Pertanyaan 2 names Klinik E, so
   Klinik E's row now says "Pertanyaan 2, 6" instead of "Pertanyaan 6".
4. **S5 Perbaikan.** The topic lines take the real report's wording
   ("di Google", "· Pertanyaan n", "Dikutip:"). The question numbers point
   only at questions that don't name the clinic: 3, 5 and 9 (the Skor tab
   names it in 2, 6 and 8; 5 and 9 replace 6 and 8 after the review of
   2026-10-25).
5. **S5 source.** "klinikcantikfiksi.contoh" becomes "klinikcantikfiksi.com",
   the website the reader types in S4.
6. **S5 tabs Jawaban AI, Klinik lain and Perbaikan.** They take the
   founder's newer heading, line, tab descriptions and caption from the Skor
   tab. The Figma frames for these three tabs still show the older words.
7. **Footer.** "Syarat Penggunaan" becomes "Syarat dan Ketentuan", the
   title of the `/terms` page and the footer today.
8. **Footer social icons.** Today's footer has Instagram and LinkedIn icons.
   The design has none, so they go.
9. **FAQ.** The answers and their order follow the approved FAQ.md. The
   Figma FAQ still shows an older draft of answer 1.
