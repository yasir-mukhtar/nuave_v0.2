# Usulan teks landing page klinik: versi luwes

> Status: **Draf untuk ditinjau founder.** Belum disetujui dan belum dipasang.
> Dibuat: 7 November 2026, dengan skill `bahasa-indonesia-luwes`.
> Sumber: `specs/020-clinic-landing-page/COPY.md` (disetujui 25 Oktober 2026).
> Teks di kode sama dengan sumber itu.

## Ringkasan

Ada 28 usulan: 23 disarankan dan 5 opsional. Teks lain tetap, karena banyak
yang sudah luwes. Sebagian lagi adalah label atau keputusan founder yang tidak
diubah demi gaya.

Tiga perubahan yang paling penting:

1. **Baris di bawah formulir tidak lagi berbunyi "bisa ditemukan".** Kalimat
   itu mudah dibaca sebagai "bisa ditemukan AI". Padahal, langkah gratis hanya
   mencari klinik Anda (FAQ no. 6). VOICE.md §7.1 meminta cek gratis dibedakan
   dengan jelas dari audit berbayar.
2. **Baris di S2 tidak lagi membandingkan saran AI dengan hasil Google.** Tiga
   sumber di bawahnya menunjukkan bahwa banyak orang bertanya ke AI. Sumber itu
   tidak menunjukkan bahwa pasien lebih mengikuti AI daripada Google.
3. **Langkah kerja dan rincian harga memakai kata sehari-hari.** Istilah
   "volume pencarian" dan "bahasa natural" diganti, dan setiap kalimat menyebut
   pelakunya.

Pegangan selama menulis:

- Panjang teks dijaga mirip dengan aslinya agar desain Figma tetap. Jika
  disetujui, tampilannya perlu dicek di ponsel dan laptop.
- Label tetap tidak diubah, misalnya **Cek klinik saya di AI**, **Download
  PDF**, dan label hitungan laporan. Isi gambar contoh, pertanyaan pasien,
  angka yang bersumber, dan keputusan D-1 sampai D-4 juga tetap.
- Tanda `/` menandai pergantian baris di laptop, seperti di COPY.md.

## Halaman

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| Deskripsi halaman | Cek apakah klinik Anda muncul di ChatGPT dan Google AI Overview. Dapatkan rekomendasi perbaikan. | Cek apakah klinik Anda muncul di ChatGPT dan Google AI Overview, lalu lihat apa yang perlu dibenahi. | Sama dengan usulan lede di bawah. |

## S1 · Hero

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| Lede | Cek apakah klinik Anda muncul di ChatGPT dan Google AI Overview. Dapatkan rekomendasi perbaikan. | Cek apakah klinik Anda muncul di ChatGPT dan Google AI Overview, lalu lihat apa yang perlu dibenahi. | "Dapatkan ..." adalah pola iklan terjemahan ("Get ..."). Usulan menyatukan dua langkah dengan kata kerja yang konkret. |
| Baris di bawah formulir (juga di S9, sesuai D-3) | Cek apakah klinik Anda bisa ditemukan, **gratis**. / Rp249.000 untuk mulai audit lengkap. | Langkah pertama **gratis**: Nuave mencari klinik Anda. / Audit lengkapnya Rp249.000. | Memisahkan dua hal yang mudah tertukar: pencarian klinik yang gratis dan audit AI yang berbayar (FAQ no. 6, VOICE.md §7.1). |

**Opsional, H1.** Teks sekarang, "Pasien sekarang / tanya AI dulu / sebelum
pilih klinik", sudah lisan dan konkret, dan bunyinya dekat dengan contoh di
VOICE.md §3. Satu catatan: data di S2 berasal dari AS dan dunia, belum dari
Indonesia. Jika ingin klaimnya lebih terjaga, pakai "Kini banyak pasien / tanya
AI dulu / sebelum pilih klinik". Baris pertamanya tiga karakter lebih panjang.

**Opsional, pesan galat formulir.** Dari "Masukkan satu website atau akun
Instagram yang valid." menjadi "Tulis alamat website atau akun Instagram
klinik, misalnya @namaklinik." Pesan galat yang baik menunjukkan cara
membetulkannya. Pesan ini juga dipakai di `/audit`, jadi perubahannya berlaku
di dua tempat.

Tetap: ketiga centang. Centang pertama dipertahankan sesuai D-2. Jika founder
ingin membukanya lagi, "10 pertanyaan dari topik yang paling banyak dicari di
Google" lebih mudah dibaca, dengan catatan yang sama soal pertanyaan dari
profil klinik.

## S2 · Pasien pilih lewat AI

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| Baris | Banyak pasien lebih mengikuti saran AI daripada hasil pencarian di Google. | Kini banyak pasien tidak hanya mencari di Google, tetapi juga bertanya ke AI. | Klaim dibatasi sesuai sumbernya. Jika founder punya sumber untuk perbandingan itu, kalimat lama boleh tetap, asalkan sumbernya dicantumkan. |
| Data ketiga (opsional) | AI Overview mulai digunakan dalam pencarian Google di Indonesia.³ | AI Overview mulai hadir di pencarian Google Indonesia.³ | "Hadir" lebih tepat untuk peluncuran. "Digunakan" menyisakan pertanyaan: digunakan oleh siapa? |

Tetap: H2 "Makin banyak pasien / pilih dokter lewat AI", dua data pertama, dan
semua sumber.

## S3 · Tidak ada halaman dua

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| Baris (opsional) | ChatGPT dan Google AI Overview hanya menyebut beberapa klinik. / Apakah klinik Anda termasuk? | ChatGPT dan Google AI Overview biasanya hanya menyebut beberapa klinik. / Apakah klinik Anda termasuk? | "Biasanya" membatasi klaim. Keterangan gambar di bawahnya pun berkata "Google tidak selalu menampilkan AI Overview". |

Tetap: H2 "Di jawaban AI, / tidak ada halaman dua". Perumpamaan ini konkret dan
langsung dipahami, persis teknik yang disarankan skill.

## S4 · Cara kerja

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| H2 | Kami tanya AI persis / seperti pasien Anda | Nuave bertanya ke AI / dengan bahasa pasien Anda | Kata "persis" berlebihan karena pertanyaan disusun dari data pencarian Google, bukan disalin dari pasien Anda. VOICE.md memakai "Nuave" untuk perilaku produk. Usulan juga menggemakan kartu "Bahasa pasien" di S6. |
| Langkah 1, isi | Atau akun Instagram klinik Anda. Nuave membaca data yang tersedia. | Atau akun Instagram klinik Anda. Nuave mencarinya, lalu Anda memastikan hasilnya benar. | "Membaca data yang tersedia" samar. Usulan menyebut apa yang sungguh terjadi di langkah gratis (FAQ no. 6). |
| Langkah 2, judul | Bayar dan cek | Bayar dan periksa | VOICE.md memakai "Periksa" untuk meninjau pertanyaan (**Periksa pertanyaan audit**). "Cek" tetap untuk ajakan gratis, jadi dua langkah ini tidak tertukar. |
| Langkah 2, isi | Nuave siapkan 10 pertanyaan berdasarkan volume pencarian di Google. Anda tinggal cek. | Nuave menyiapkan 10 pertanyaan dari data pencarian Google. Anda tinggal memeriksa dan menyetujuinya. | "Menyiapkan" adalah bentuk baku. "Data pencarian" lebih akrab daripada "volume pencarian" dan sama dengan FAQ no. 5. "Menyetujui" menyebut langkah yang sebenarnya, karena pertanyaan dikunci setelah disetujui. |
| Langkah 3, isi | Kami tanyakan ke ChatGPT dan Google AI Overview. Laporan lengkap siap dalam 30 menit. | Pertanyaan diajukan ke ChatGPT dan Google AI Overview. Laporan lengkap siap dalam 30 menit. | Kalimat lama tidak punya objek: apa yang ditanyakan? Proses otomatis ditulis dalam bentuk pasif. |

Tetap: judul langkah 1 dan 3, tag "Gratis" dan "Rp249.000", gambar contoh, dan
keterangan gambar.

## S5 · Laporan

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| Tab Klinik lain | Menampilkan klinik lain yang muncul dalam jawaban AI. | Klinik lain yang muncul dalam jawaban AI. | Sejajar dengan deskripsi tab lain. "Menampilkan" tidak menambah arti. |
| Tab Perbaikan | Tindak lanjut yang bisa dikerjakan, plus topik yang belum menyebut Anda. | Tindak lanjut yang bisa dikerjakan, beserta topik yang belum menyebut Anda. | "Plus" adalah kata pinjaman yang tidak perlu. "Beserta" sejajar dengan tab Jawaban AI ("beserta sumbernya"). |

Tetap: H2 "Lihat apa kata AI tentang klinik Anda", "Lengkap dengan rekomendasi
perbaikan.", "Download PDF, siap dibawa ke rapat.", dan seluruh isi kartu
laporan.

## S6 · Bisa dipercaya, bisa ditindaklanjuti

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| Bahasa pasien | 10 pertanyaan dengan bahasa natural pasien. | 10 pertanyaan dalam bahasa sehari-hari pasien. | "Bahasa natural" terjemahan dari "natural language". Padanan Indonesianya lebih akrab. |
| Siap ditindaklanjuti | Ada penjelasan lengkap untuk / setiap saran perbaikan. | Setiap saran disertai alasan, / bukti, dan tanda selesainya. | "Penjelasan lengkap" samar. Laporan memang menampilkan Mengapa, Berdasarkan, dan Selesai ketika untuk setiap saran. |

Tetap: H2, kartu "Apa adanya", dan kartu "Tanpa repot".

## S7 · Yang Anda dapat dan harga

| No. | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| 01 | Berdasarkan volume pencarian di Google untuk jenis klinik dan kota Anda. | Disusun dari data pencarian Google untuk jenis klinik dan kota Anda. | Kata sehari-hari, sama dengan FAQ no. 5. |
| 02 | Data berapa kali topiknya dicari per bulan. | Berapa kali tiap topik dicari di Google setiap bulan. | Kata "Data" di depan tidak menambah arti. |
| 03 | Ditanyakan langsung ke ChatGPT, dijawab lengkap dengan sumbernya. | Ditanyakan langsung ke ChatGPT, dicatat utuh beserta sumber jika ada. | ChatGPT tidak selalu menyertakan sumber. Klaim dibatasi sesuai kenyataan. |
| 04 | Dicek dari kota Anda dan seberapa sering Google menampilkannya. | Dicari dari kota Anda. Tercatat juga seberapa sering AI Overview tampil. | Kalimat lama menyambung dua hal yang tidak sejajar. Kini dipecah menjadi dua kalimat. |
| 05 | Disebut di berapa jawaban ChatGPT dan Google AI Overview. | Muncul di berapa jawaban ChatGPT dan Google AI Overview. | Sama dengan tab Skor dan label laporan ("muncul"): satu keadaan, satu istilah. |
| 06 | Menampilkan klinik lain yang muncul dalam jawaban AI. | Klinik lain yang muncul dalam jawaban AI. | Sama dengan tab Klinik lain. |
| 07 | Situs apa saja yang menjadi referensi AI dalam membuat jawaban. | Situs yang dikutip ChatGPT dan Google AI Overview dalam jawabannya. | "Dikutip" adalah istilah laporan dan lebih tepat daripada "menjadi referensi". |
| 08 | Topik yang dicari orang, tapi belum menyebut klinik Anda. | Topik yang banyak dicari, tetapi jawabannya belum menyebut klinik Anda. | Yang belum menyebut klinik adalah jawaban AI, bukan topiknya. Bentuk "tapi" juga diganti "tetapi". |
| 09 | Apa tindak lanjut yang bisa dikerjakan. Siap dibahas dalam rapat. | Tindak lanjut yang bisa dikerjakan, dalam PDF yang siap dibawa ke rapat. | "Apa tindak lanjut ..." terbaca seperti pertanyaan yang kehilangan tanda tanya. Usulan menggemakan "siap dibawa ke rapat" di S5. |

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| Blok harga | Bayar setelah klinik Anda ketemu. | Bayar setelah Nuave menemukan klinik Anda. | Pelakunya disebut. Untuk urusan uang, "menemukan" lebih jelas daripada "ketemu". |

Tetap: H2, "Rp249.000 sekali bayar.", "Sekali bayar. / Tanpa langganan. / Tanpa
biaya tambahan.", cara bayar, dan janji 30 menit.

## S8 · FAQ (opsional)

Jawaban FAQ sudah disetujui bersama halaman Syarat dan Ketentuan (S5). Karena
itu, hanya satu jawaban yang saya sentuh. Jika disetujui, perubahannya juga
perlu masuk ke `docs/content/website/FAQ.md` dan halaman `/faq`.

| Teks | Sekarang | Usulan | Alasan |
| --- | --- | --- | --- |
| No. 3, kalimat ketiga | Nuave menanyakan sepuluh pertanyaan dari pencarian Google ke ChatGPT dan Google AI Overview. | Nuave mengajukan sepuluh pertanyaan dari data pencarian Google ke ChatGPT dan Google AI Overview. | "Menanyakan pertanyaan" berulang. |
| No. 3, kalimat terakhir | Lalu kami catat jawaban, sumber, klinik lain yang disebut, dan yang perlu dibenahi. | Lalu Nuave mencatat jawaban, sumber, klinik lain yang disebut, dan hal yang perlu dibenahi. | Catatan ini dibuat sistem. Menurut VOICE.md §3, "kami" tidak dipakai untuk penilaian mesin agar pembaca tidak mengira hasilnya diperiksa tim. |

## S9 · Penutup

Baris di bawah formulir mengikuti usulan hero (D-3). Teks lain tetap.

H2 "Cek klinik Anda sebelum / pasien berikutnya bertanya" sengaja
dipertahankan. Kalimat ini menggemakan H1, sehingga halaman ditutup dengan
gambar yang sama dengan pembukanya. Pola ini sering dipakai Ivan.

## Keputusan untuk founder

1. **Baris S2:** pakai usulan, atau pertahankan kalimat lama dengan sumber
   yang menopangnya.
2. **H1:** tetap seperti sekarang, atau pakai "Kini banyak pasien".
3. **Opsional lain:** data ketiga S2, baris S3, pesan galat formulir, dan
   FAQ no. 3. Masing-masing dapat diterima atau ditolak sendiri-sendiri.

## Jika disetujui

Berkas yang perlu diubah:

- `specs/020-clinic-landing-page/COPY.md`, agar sumber teks tetap sama dengan
  halaman
- `src/app/page.tsx` (deskripsi halaman)
- `src/components/landing/Hero.tsx` dan `sections/Closing.tsx`
- `src/components/landing/sections/Reasons.tsx`, `HowItWorks.tsx`,
  `ReportShowcase.tsx`, `TrustPoints.tsx`, dan `PriceReceipt.tsx`
- Untuk FAQ no. 3: `sections/Faq.tsx`, `docs/content/website/FAQ.md`, dan
  halaman `/faq`
- Untuk pesan galat: komponen formulir yang juga dipakai `/audit`

Sesudah dipasang, tes otomatis yang mencari teks lama perlu disesuaikan.
Tampilannya juga perlu dicek di ponsel dan laptop.
