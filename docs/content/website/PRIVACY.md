# Kebijakan Privasi dan Data

> Route: `/privacy` (`src/app/privacy/page.tsx`)
> Status: version 1.2 (2026-10-25) adds that the cookie choice is kept in the
> browser for 12 months (Spec 019). Version 1.1 (2026-10-25) added the clauses
> adopted from the HaloAI comparison; approved by the founder on 2026-10-25
> (PR #160). The lawyer
> checks listed below are still open. The page and this file say the same thing; change
> both together.
> Language: Indonesian
> Shared facts: `src/lib/legal.ts` (operator, city, version, date, support
> email, reply time) and `src/lib/orders/promise.ts` (delivery promise).

## Notes for whoever changes this page

- Every statement must match what the system does. Sources: S0 decisions D1
  to D8 (`docs/DECISION_LOG.md`, 2026-10-05), Spec 016 Q3 (record lifetimes),
  Spec 018 (providers and checks), and `.github/workflows/ci.yml` (the
  providers production actually uses).
- No "patuh", "tersertifikasi", "100% aman" or "sesuai UU PDP" claims.
- **Before the Meta Pixel or Conversions API goes live** (founder decision
  2026-10-24: keep the promise of a choice before tracking), the tracking
  change must:
  1. show a cookie notice with **Setuju** and **Tolak**, and load nothing
     from Meta until the visitor taps Setuju; once server events send the
     hashed order email, the notice names it (founder, 2026-10-25: the
     browser step sends no email, so the notice does not mention one yet);
  2. send server events (Conversions API) only for visitors who agreed, and
     send no fields beyond those section 10 lists (event, value, IP address,
     browser type, Meta cookie codes, hashed email for purchases);
  3. add a **Pengaturan cookie** link in the footer that reopens the choice;
  4. send purchase value 249000 IDR (the price since Spec 018), not 99000;
  5. never load the Pixel on `/r` (the report link keeps its secret in the
     address) or `/uji` (the founder test pass);
  6. never send the report, the audit questions, AI answers or intake facts;
  7. pass the visitor's IP address and browser type to Meta at request time
     without storing them, so section 2's "Nuave sendiri tidak menyimpan
     alamat IP Anda" stays true.
  If any of these changes, section 10 below must change first.
  **Spec 019 (browser step)** meets items 1, 3, 4, 5 and 6: the notice, the
  footer link and the Pixel are on in production (Pixel ID set in
  `.github/workflows/ci.yml`); with the ID blank, all three are off. The Pixel sends PageView, Lead (the free check found
  the business), InitiateCheckout and Purchase (249000 IDR), never the email,
  business, order number or report, and runs with automatic configuration
  off. Items 2 and 7 (server events) wait for the Conversions API step. The
  page's "seberapa jauh Anda membacanya" is not sent yet; sending less than the
  page lists keeps it true.
- **Deletion (section 9):** an hourly cleanup in the order cron
  (`src/lib/orders/retention.ts`, minute 17) makes an order anonymous 12 months
  after its report was saved, or 30 days after it failed or expired. It empties
  the email, business details, intake, questions, answers, report and link, and
  deletes the question, email and payment-email rows; a bare order row stays
  (order number, dates, state, payment links) so payment records still add up.
  It skips an order with an open refund case (the cases `support refunds`
  lists, plus any payment attempt still open), a running order, and one under
  a support hold (`npm run support
  -- hold <order> <days>`). Settled cost rows go after 24 months. Payment
  records are never removed. A late payment for an anonymised order becomes a
  refund case and never revives it.
  Not covered by the job, to handle by hand or later:
  - the support inbox (12 months) and the email provider's own copies;
  - orders in a mode or environment the production cron does not run
    (synthetic orders in the production database, and the preview database);
  - cost rows that never settled (a call whose cost is unknown);
  - Midtrans `snap_token` and `redirect_url` on payment attempts;
  - an order whose refund case was settled without a recorded refund (fixed
    by hand, declined, or a chargeback on a `needs_refund` transaction) stays
    on `support refunds` until `npm run support -- norefund <order>
    <declined|delivered|settled>` closes it; then the job reaches it;
  - a delivered order with a chargeback near its 12 months: set a `hold`.
  - a failed order whose report link support resent by hand: the link stops
    working at 30 days, so set a `hold` when resending it.
  For a paid order, the bare row and the payment records still carry Midtrans
  IDs that Midtrans can link to the customer, so paid orders are pseudonymous
  rather than anonymous; unpaid orders become effectively anonymous.
- **Version 1.2 (2026-10-25):** section 10 adds "Pilihan cookie Anda sendiri
  disimpan di browser Anda selama 12 bulan." The privacy page now has its own
  version (`PRIVACY_VERSION` in `src/lib/legal.ts`); the terms stay at 1.1. A
  new privacy version asks every visitor for their cookie choice again.
- **Version 1.1 (2026-10-25):** adds the legal basis for each use (section
  5), providers bound by their service agreements (section 7), and a written
  breach notice within 3 x 24 hours (section 11). Before publishing,
  check that the terms of DataForSEO, Cheaper Inference and the inbox provider
  support "hanya memproses data untuk menjalankan layanan Nuave, sesuai
  perjanjian layanan mereka" (Cloudflare, OpenAI's API terms and Resend do);
  owner: the founder, with the lawyer check. **Lawyer check:** the
  3 x 24 hour notice follows UU 27/2022 Pasal 46 as we understand it.
- **Provider names (founder, 2026-10-24):** the public page names only the
  companies a customer deals with directly (Midtrans, Meta) and describes the
  rest by type. Give a customer the names on request. Keep this map current:

  | Type on the page | Company today |
  |---|---|
  | Penyedia hosting dan penyimpanan cloud | Cloudflare (Workers, D1) |
  | Penyedia layanan AI | OpenAI; Cheaper Inference (draft questions) |
  | Penyedia data pencarian | DataForSEO |
  | Penyedia pengiriman email | Resend |
  | Penyedia kotak masuk email | not yet recorded |

  The report's method section still names DataForSEO, so paying customers
  see that one anyway.

---

## Public page copy

**Page title:** Kebijakan Privasi dan Data | Nuave

**Meta description:** Data yang dipakai Nuave, untuk apa, siapa yang ikut
memprosesnya, berapa lama disimpan, dan pilihan Anda.

# Kebijakan privasi dan data

Berlaku sejak 25 Oktober 2026 · Versi 1.2

Halaman ini menjelaskan data yang dipakai Nuave, untuk apa, siapa yang ikut
memprosesnya, berapa lama disimpan, dan pilihan Anda. Prinsip kami sederhana.
Kami mengambil data seperlunya dan memakainya sesuai tujuan. Laporan Anda tidak
kami bagikan tanpa izin.

## 1. Siapa yang bertanggung jawab

Nuave adalah layanan independen yang dijalankan oleh PT Nuave Arah Baru
di Jakarta Selatan, Indonesia.

Pertanyaan dan permintaan soal data dikirim ke support@nuave.ai. Kami membalas
dalam 1 hari kerja (Senin sampai Jumat, WIB).

## 2. Data yang kami pakai

- **Alamat website atau akun Instagram bisnis** yang Anda masukkan, dan
  informasi publik yang kami baca dari sana, seperti nama, alamat, dan layanan.
- **Email pesanan.** Kami pakai untuk konfirmasi pembayaran, link laporan, dan
  jawaban bantuan. Jika Anda menyetujui cookie Meta, email ini juga dikirim ke
  Meta dalam bentuk kode acak saat pembelian (bagian 10).
- **Data pembayaran dari Midtrans:** status, jumlah, waktu, cara bayar, dan
  nomor transaksi. Kami tidak menerima nomor kartu, PIN, kata sandi bank, atau kode
  OTP. Jika kami perlu mengembalikan uang lewat transfer bank, kami
  menanyakan nomor rekening Anda lewat email bantuan.
- **Data bisnis yang Anda periksa:** kota untuk pencarian, kategori, layanan,
  calon pelanggan, pesaing, dan fakta publik lain yang Anda konfirmasi.
- **Data audit:** sepuluh pertanyaan yang Anda setujui, jawaban ChatGPT dan
  Google AI Overview, sumber yang disebut, dan laporan.
- **Data teknis:** penyedia hosting kami memproses alamat IP dan
  informasi browser untuk menjalankan situs dan menahan serangan. Nuave sendiri
  tidak menyimpan alamat IP Anda.

## 3. Data yang tidak kami perlukan

Nuave memeriksa bisnis, bukan pasien atau pelanggan Anda. Jangan kirim data
pasien, rekam medis, daftar pelanggan, kata sandi, data keuangan pribadi, atau
data sensitif lain.

Pengecualiannya nomor rekening yang kami tanyakan untuk pengembalian
dana. Nomor itu hanya kami pakai untuk transfer tersebut. Jika data
lain seperti itu sampai ke kami, kami batasi aksesnya dan berhenti
memprosesnya. Lalu kami menghapusnya, kecuali ada kewajiban untuk menyimpannya.

## 4. Untuk apa data dipakai

- memastikan bisnis yang diperiksa memang bisnis Anda;
- menyiapkan data bisnis dan pertanyaan untuk Anda periksa;
- menerima dan mencatat pembayaran;
- menjalankan audit dan menyusun laporan;
- mengirim link laporan dan membantu jika ada masalah;
- mengembalikan uang jika diperlukan;
- menjaga keamanan layanan dan mencegah penyalahgunaan;
- mengukur iklan Nuave di Facebook dan Instagram, dan menampilkan iklan kepada
  orang yang mirip dengan pembeli Nuave, hanya jika Anda setuju (bagian 10); dan
- memenuhi kewajiban pembukuan dan hukum.

Kami tidak menjual data pribadi Anda. Kami tidak memakai laporan Anda sebagai contoh atau bahan promosi tanpa izin terpisah dari Anda.

## 5. Dasar pemrosesan data

Kami memproses data Anda berdasarkan:

- **pesanan Anda**: untuk menjalankan pesanan, atau atas permintaan Anda
  sebelum memesan, seperti cek gratis;
- **persetujuan Anda**: untuk cookie dan pengukuran iklan Meta;
- **kewajiban hukum**: untuk catatan pembayaran dan pajak; dan
- **kepentingan yang sah**: untuk menjaga keamanan layanan dan mencegah
  penyalahgunaan.

Anda bisa menarik persetujuan kapan saja, lewat tautan Pengaturan cookie
(bagian 10) atau email ke support@nuave.ai. Penarikan tidak mengubah pemrosesan
yang sudah terjadi sebelumnya.

## 6. Layanan AI dan pencarian

Untuk membuat audit, sebagian data bisnis dan pertanyaan Anda dikirim ke
penyedia layanan AI dan penyedia data pencarian. Penyedia data pencarian
mengambil data pencarian Google. Penyedia itu juga menanyakan sepuluh pertanyaan
Anda ke ChatGPT dan Google, lalu mengembalikan jawabannya kepada kami.

Kami tidak memasukkan email, data pembayaran, atau data pribadi lain ke
permintaan ini. Penyedia tersebut dapat memproses data di luar Indonesia sesuai
kebijakan masing-masing.

## 7. Pihak yang membantu kami

| Penyedia | Untuk | Data yang terkait |
|---|---|---|
| Penyedia hosting dan penyimpanan cloud | Menjalankan situs, menjaga keamanannya, dan menyimpan data pesanan serta laporan | Permintaan ke situs (termasuk alamat IP), data pesanan, data audit, dan laporan |
| Penyedia layanan AI | Membaca website bisnis, menyiapkan ringkasan dan draf pertanyaan, dan menyusun laporan | Alamat dan isi website, data bisnis yang Anda konfirmasi, data pencarian, pertanyaan, dan jawaban yang diperiksa |
| Penyedia data pencarian | Mengambil data pencarian Google dan menanyakan pertanyaan Anda ke ChatGPT dan Google | Kata kunci layanan, kota pencarian, dan sepuluh pertanyaan |
| Midtrans | Pembayaran | Email pesanan, nomor pesanan, jumlah, dan data yang Anda isi langsung di halaman Midtrans |
| Penyedia pengiriman email | Mengirim email pesanan dan link laporan | Email pesanan, nama bisnis, nomor pesanan, dan link laporan |
| Penyedia kotak masuk email | Menerima dan membalas email ke support@nuave.ai | Isi email yang Anda kirim ke kami |
| Meta Platforms | Iklan dan pengukuran iklan, hanya jika Anda setuju | Lihat bagian 10 |

Kami menyebut nama Midtrans dan Meta karena Anda berhubungan langsung dengan
keduanya. Penyedia lain kami sebut menurut jenisnya. Jika Anda ingin tahu nama penyedia yang memproses data Anda, tanyakan ke support@nuave.ai.

Penyedia yang kami sebut menurut jenisnya hanya memproses data untuk menjalankan
layanan Nuave, sesuai perjanjian layanan mereka dengan kami. Midtrans dan Meta
memproses data sesuai kebijakan mereka sendiri. Pertanyaan audit juga sampai ke
ChatGPT dan Google, yang memprosesnya sesuai kebijakan mereka.

Kami juga dapat memberikan data jika diminta secara sah oleh pemerintah atau
penegak hukum, atau jika perlu untuk melindungi keamanan orang yang memakai Nuave dan layanan kami.

## 8. Pemrosesan di luar Indonesia

Sebagian besar penyedia di atas menyimpan atau memproses data di luar
Indonesia. Kami memilih pengaturan yang membatasi penggunaan data jika penyedia
menyediakannya. Tanyakan ke support@nuave.ai jika Anda ingin tahu lebih lanjut.

## 9. Berapa lama data disimpan

| Data | Masa simpan |
|---|---|
| Pesanan yang selesai: email, data bisnis, pertanyaan, hasil pemeriksaan, laporan, dan catatan pengiriman | 12 bulan setelah laporan selesai |
| Pesanan yang gagal atau tidak dilanjutkan | 30 hari, kecuali masih ada permintaan bantuan yang terbuka |
| Link laporan | Berlaku 12 bulan, atau sampai diganti atau dimatikan |
| Catatan biaya per pesanan (tanpa email) | 24 bulan |
| Kemajuan pesanan di browser Anda | Paling lama 7 hari, di perangkat Anda |
| Email bantuan dan keluhan | 12 bulan setelah masalahnya selesai |
| Catatan pembayaran | Paling sedikit 24 bulan, atau lebih lama jika diwajibkan untuk pajak atau hukum |
| Salinan email di penyedia pengiriman email | Sesuai masa simpan penyedia itu, kami atur sesingkat yang tersedia |

Setelah masa itu, data dihapus atau dibuat tidak lagi menunjuk ke Anda.
Pengecualiannya data yang masih diperlukan untuk permintaan, sengketa, atau
kewajiban hukum yang belum selesai.

## 10. Cookie, penyimpanan di browser, dan iklan Meta

Nuave menyimpan kemajuan pesanan di browser Anda, agar Anda bisa melanjutkan
setelah halaman dimuat ulang. Data ini tetap di perangkat Anda. Setelah 7 hari data itu tidak dipakai lagi, dan
dihapus saat Anda membuka Nuave berikutnya. Penyedia hosting kami juga dapat memasang cookie keamanan untuk
menahan lalu lintas berbahaya.

Untuk mengukur iklan Nuave di Facebook dan Instagram, kami memakai Meta Pixel
di browser dan Meta Conversions API dari server kami. Keduanya hanya aktif jika
Anda memilih **Setuju** pada pemberitahuan cookie. Jika Anda menolak atau belum
memilih, Nuave tidak memasang cookie Meta dan tidak mengirim data Anda ke Meta.

Jika Anda setuju, yang dikirim ke Meta Platforms adalah:

- halaman Nuave yang Anda buka dan seberapa jauh Anda membacanya, cookie Meta di
  browser Anda, dan informasi teknis yang biasa dikirim browser, seperti alamat
  IP dan jenis perangkat;
- tanda bahwa cek gratis selesai, checkout dibuka, dan pembayaran berhasil,
  beserta nilai pembelian (Rp249.000);
- untuk cek gratis dan pembelian, catatan yang sama dari server kami, beserta
  alamat IP, jenis browser, dan kode cookie Meta Anda; dan
- untuk pembelian, email pesanan yang sudah diubah menjadi kode acak (hash)
  sebelum dikirim. Meta memakainya untuk mencocokkan pembelian dengan akun
  Facebook atau Instagram Anda.

Tujuannya untuk mengetahui iklan mana yang benar-benar menghasilkan cek gratis
dan pembelian. Data ini juga dipakai untuk menampilkan iklan Nuave kepada orang
yang mirip dengan pembeli Nuave.

Yang tidak pernah kami kirim ke Meta: laporan Anda, sepuluh pertanyaan audit,
jawaban AI, dan data bisnis yang Anda isi.

Meta memproses data ini sesuai
[Kebijakan Privasi Meta](https://www.facebook.com/privacy/policy). Pilihan
cookie Anda sendiri disimpan di browser Anda selama 12 bulan. Anda bisa
mengubahnya kapan saja lewat tautan **Pengaturan cookie** di bagian bawah
halaman. Anda juga bisa mengatur iklan di
[pengaturan iklan Meta](https://www.facebook.com/adpreferences), atau memblokir
cookie di pengaturan browser Anda.

## 11. Cara kami melindungi data

Kami memakai koneksi HTTPS, membatasi siapa yang bisa membuka data, menyimpan
kunci akses hanya di server, dan memperbarui perangkat lunak. Tidak ada sistem
yang bebas risiko. Jika terjadi kebocoran yang menyangkut data Anda, kami akan memeriksanya, membatasi dampaknya, dan memberi tahu Anda secara
tertulis paling lambat 3 x 24 jam setelah kami mengetahuinya.

## 12. Hak Anda

Anda bisa meminta kami untuk:

- menjelaskan data tentang Anda yang kami simpan;
- mengirim salinan data yang tersedia;
- memperbaiki data yang salah;
- menghapus data yang tidak lagi diperlukan, kecuali ada kewajiban untuk
  menyimpannya; dan
- berhenti memakai data yang Anda izinkan sebelumnya.

Kirim permintaan ke support@nuave.ai dari email pesanan Anda. Nomor pesanan
saja tidak cukup untuk membuktikan pesanan itu milik Anda, jadi kami mungkin
meminta konfirmasi dari email tersebut.

## 13. Link laporan bersifat pribadi

Siapa pun yang memegang link laporan bisa membukanya. Jangan teruskan link itu
ke orang yang tidak berhak. Jika link terlanjur tersebar, tulis ke support@nuave.ai dari email pesanan. Kami akan mematikan link lama
dan mengirim link baru ke email pesanan.

## 14. Usia

Nuave untuk pemesan berusia 18 tahun ke atas. Jangan kirim data anak melalui
isian, pertanyaan, atau email bantuan.

## 15. Perubahan kebijakan

Kebijakan ini bisa berubah jika layanan atau penyedia kami berubah. Tanggal dan
versi terbaru ada di bagian atas halaman ini.

## 16. Hubungi kami

Pengelola: PT Nuave Arah Baru, Jakarta Selatan
Email: support@nuave.ai
Halaman bantuan: [Kontak dan bantuan](/support)
Syarat layanan: [Syarat dan ketentuan](/terms)
