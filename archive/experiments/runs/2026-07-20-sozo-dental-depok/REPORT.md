# Laporan uji AI — Sozo Dental Depok (Margonda)

> Sampel awal, bukan peringkat permanen.
> Dicatat: 20 Juli 2026 · Sistem yang sudah diuji: Gemini Developer API Free · Model: `gemini-3.5-flash`

## Ringkasan cepat

| Indikator | Hasil |
|---|---:|
| Sozo disebut dalam 5 pertanyaan | **1 dari 5** |
| Sozo disebut dalam 4 pertanyaan tanpa nama brand | **0 dari 4** |
| Sozo disebut saat namanya ditulis langsung | **1 dari 1** |
| Jawaban bermerek yang cocok dengan alamat cabang audit | **Tidak** |

**Kesimpulan singkat:** untuk pertanyaan umum soal klinik gigi di Depok atau Margonda, Gemini belum memilih Sozo Dental. Saat nama Sozo ditulis langsung, Gemini mengenal brand-nya, tetapi mengembalikan alamat cabang yang berbeda dari cabang audit. Jadi urutan kerja yang masuk akal adalah: rapikan fakta cabang dulu, baru menguji upaya menaikkan visibilitas.

## Tiga hal yang perlu ditangani

1. **Pastikan identitas cabang Margonda konsisten di semua profil yang dikelola.**
   Gemini menjawab alamat `Jl. Margonda Raya No.34 B, Pancoran Mas`, sedangkan cabang yang diaudit adalah `Jl. Margonda No.267, Kemiri Muka, Beji`. Ini bisa berarti Gemini mencampur cabang, membaca data lama, atau mengambil sumber pihak ketiga yang keliru. Apa pun penyebabnya, ini harus diperiksa.

2. **Buat satu halaman resmi yang lengkap untuk cabang Margonda.**
   Halaman itu perlu memuat alamat, tautan peta, WhatsApp/nomor reservasi, jam buka, layanan yang tersedia di cabang ini, dan tanggal pembaruan. Jangan mengandalkan halaman brand umum atau daftar cabang yang tercampur.

3. **Hubungkan layanan prioritas dengan lokasi cabang.**
   Gemini tidak menyebut Sozo untuk scaling, pemeriksaan rutin, keluarga, maupun akses Margonda. Mulai dari halaman/section yang menjawab langsung: “scaling di Sozo Dental Margonda, Depok”.

## Cara membaca hasil ini

- Ini adalah satu kali uji, lima pertanyaan, pada satu sistem. Hasilnya bukan ukuran pangsa pasar atau jaminan hasil di ChatGPT.
- Gemini Free tidak memberikan tautan sitasi pada lima jawaban ini. Karena itu, sumber di bawah adalah sumber untuk mengecek fakta cabang—bukan klaim bahwa sumber tersebut dipakai Gemini.
- **ChatGPT Free belum dapat diuji dari lingkungan ini** karena akses ke `chatgpt.com` diblokir oleh kebijakan browser. Saat hasil ChatGPT dari akun Anda tersedia, hasilnya akan ditambahkan dengan format yang sama.

## Bukti per pertanyaan

### 1. Pemeriksaan gigi rutin di Depok

**Prompt**

> Saya tinggal di Depok dan mau periksa gigi rutin. Klinik gigi mana yang layak saya pertimbangkan?

**Sozo disebut?** Tidak.

**Jawaban Gemini (utuh)**

> Berikut adalah beberapa klinik gigi di Depok yang populer dan layak Anda pertimbangkan untuk pemeriksaan rutin:
>
> ### 1. Klinik Gigi Khusus (Berjejaring)
> Klinik-klinik ini umumnya memiliki fasilitas modern, cabang di beberapa lokasi, dan sering menawarkan paket perawatan rutin (seperti *scaling* atau pembersihan karang gigi):
>
> * **Audy Dental (Cabang Margonda):** Terkenal dengan pelayanan yang modern dan memiliki tim dokter gigi umum maupun spesialis yang lengkap.
> * **FDC Dental Clinic (Cabang Margonda & Sawangan):** Pilihan populer bagi yang mencari harga relatif terjangkau, karena sering menawarkan promo paket pemeriksaan dan *scaling*.
> * **Damessa Dental Clinic (Cabang Margonda & GDC):** Dikenal memiliki suasana klinik yang nyaman dan ramah anak, cocok jika Anda ingin melakukan pemeriksaan bersama keluarga.
>
> ### 2. Klinik Gigi Rumah Sakit (Fasilitas Lebih Lengkap)
> Jika Anda mencari fasilitas medis yang lebih besar dengan standar rumah sakit:
>
> * **Poli Gigi RSUI (Rumah Sakit Universitas Indonesia):** Berlokasi di area kampus UI Depok. Memiliki peralatan medis yang sangat lengkap dan dokter-dokter ahli, karena terafiliasi dengan Fakultas Kedokteran Gigi UI.
>
> **Tips Tambahan Sebelum Berkunjung:**
> * **Cek Biaya & Promo:** Biaya pemeriksaan rutin dan *scaling* bisa sangat bervariasi. Disarankan untuk mengecek akun Instagram resmi atau menghubungi WhatsApp klinik tersebut terlebih dahulu untuk menanyakan estimasi biaya atau promo yang sedang berlangsung.
> * **Buat Janji Temu (Appointment):** Sebagian besar klinik gigi di atas menerapkan sistem reservasi agar Anda tidak perlu mengantre lama.
> * **BPJS Kesehatan:** Jika ingin menggunakan BPJS, pastikan Anda memeriksa fasilitas kesehatan tingkat pertama (FKTP) Anda terlebih dahulu, atau mencari rumah sakit yang menerima rujukan gigi.

**Catatan:** Gemini memilih Audy, FDC, Damessa, dan RSUI; Sozo tidak muncul.

**Sumber untuk cek fakta cabang:** [halaman resmi Sozo Dental Depok](https://www.sozodental.com/lokasi/depok/). Gemini tidak menyertakan sitasi.

### 2. Klinik gigi keluarga di Depok

**Prompt**

> Saya cari klinik gigi di Depok untuk keluarga. Pilihan apa saja yang bisa saya cek?

**Sozo disebut?** Tidak.

**Jawaban Gemini (utuh)**

> Berikut adalah beberapa pilihan klinik gigi di Depok yang populer dan ramah untuk keluarga (menyediakan layanan dokter gigi umum hingga spesialis anak):
>
> 1. **OMDC (Organic Medical Dental Center) Depok**
>    * **Kelebihan:** Sangat dikenal dengan konsep kliniknya yang unik, berwarna, dan ramah anak, sehingga cocok untuk mengurangi rasa takut anak pada dokter gigi.
>    * **Lokasi:** Sekitar area Margonda.
>
> 2. **Audy Dental Depok**
>    * **Kelebihan:** Jaringan klinik gigi besar yang memiliki tim dokter spesialis lengkap, termasuk spesialis kedokteran gigi anak (pedodontis) dan spesialis merapikan gigi (ortodontis).
>    * **Lokasi:** Jl. Margonda Raya.
>
> 3. **FDC Dental Clinic Depok**
>    * **Kelebihan:** Menawarkan berbagai perawatan gigi dengan harga yang relatif terjangkau dan sering kali memiliki program promosi untuk keluarga.
>    * **Lokasi:** Jl. Margonda Raya.
>
> 4. **Poli Gigi RSUI (Rumah Sakit Universitas Indonesia)**
>    * **Kelebihan:** Pilihan yang baik jika Anda mencari fasilitas medis yang komprehensif di lingkungan rumah sakit dengan dokter spesialis yang lengkap.
>    * **Lokasi:** Kampus UI Depok.
>
> **Catatan:** Fasilitas, kenyamanan, dan tarif perawatan di setiap klinik dapat bervariasi tergantung pada tindakan yang dibutuhkan serta kebijakan terbaru klinik. Sebelum datang, disarankan untuk menghubungi pihak klinik terlebih dahulu atau memeriksa akun media sosial mereka untuk membuat janji temu dan memastikan jadwal dokter gigi anak (jika membawa balita).

**Catatan:** Sozo tidak dipilih untuk konteks keluarga. Ini belum berarti Sozo tidak cocok untuk keluarga; hanya tidak muncul pada jawaban ini.

**Sumber untuk cek fakta cabang:** [halaman resmi Sozo Dental Depok](https://www.sozodental.com/lokasi/depok/). Gemini tidak menyertakan sitasi.

### 3. Scaling di Depok

**Prompt**

> Saya mau scaling di Depok. Klinik mana yang mencantumkan layanan scaling?

**Sozo disebut?** Tidak.

**Jawaban Gemini (utuh)**

> Berikut adalah beberapa klinik gigi di Depok yang secara publik mencantumkan layanan *scaling* (pembersihan karang gigi) dalam daftar perawatan mereka:
>
> 1. **Audy Dental (Cabang Depok)**
>    * **Lokasi:** Jl. Margonda Raya.
>    * **Keterangan:** Jaringan klinik gigi besar yang secara transparan mencantumkan layanan *scaling* gigi di situs resmi dan media sosial mereka.
>
> 2. **FDC Dental Clinic (Cabang Depok)**
>    * **Lokasi:** Jl. Kartini, Pancoran Mas.
>    * **Keterangan:** Dikenal sering menawarkan paket promo untuk pembersihan karang gigi (*scaling*) yang diinfokan melalui situs web dan aplikasi mereka.
>
> 3. **Damessa Dental Clinic (Cabang Depok)**
>    * **Lokasi:** Beberapa cabang, termasuk di Grand Depok City (GDC) dan Sawangan.
>    * **Keterangan:** Klinik gigi keluarga yang menyediakan perawatan umum termasuk *scaling* gigi.
>
> 4. **Puskesmas di Depok**
>    * **Keterangan:** Sebagian besar Puskesmas kecamatan di Depok juga menyediakan layanan pembersihan karang gigi dengan tarif yang lebih terjangkau atau menggunakan BPJS Kesehatan (sesuai indikasi medis dan prosedur yang berlaku).
>
> **Catatan & Keterbatasan:** Biaya, promo, dan ketersediaan dokter gigi untuk tindakan *scaling* dapat berubah sewaktu-waktu. Sebelum datang, sangat disarankan untuk menghubungi klinik atau Puskesmas tujuan terlebih dahulu melalui WhatsApp atau media sosial mereka untuk melakukan konfirmasi tarif terbaru dan reservasi jadwal.

**Catatan:** halaman resmi Sozo menyebut scaling, tetapi Sozo tidak muncul untuk permintaan ini.

**Sumber untuk cek fakta cabang:** [halaman resmi Depok](https://www.sozodental.com/lokasi/depok/) dan [halaman layanan Sozo](https://www.sozodental.com/layanan/). Gemini tidak menyertakan sitasi.

### 4. Akses dari Depok dan Margonda

**Prompt**

> Saya sering beraktivitas di Depok dan Margonda. Klinik gigi mana yang mudah dijangkau dari area ini?

**Sozo disebut?** Tidak.

**Jawaban Gemini (utuh)**

> Untuk Anda yang sering beraktivitas di area Margonda dan Depok, berikut adalah beberapa klinik gigi yang lokasinya sangat strategis di sepanjang jalan utama Jl. Margonda Raya, sehingga mudah dijangkau baik dengan kendaraan pribadi, transportasi umum (angkot), maupun KRL (dekat dengan stasiun seperti Stasiun Depok Baru atau Pondok Cina):
>
> 1. **FDC Dental Clinic Depok**
>    * **Lokasi:** Jl. Margonda Raya.
>    * **Kelebihan Akses:** Terletak di pinggir jalan utama dan cukup populer untuk perawatan gigi umum maupun estetika.
>
> 2. **Orange Dental Depok**
>    * **Lokasi:** Jl. Margonda Raya.
>    * **Kelebihan Akses:** Sangat mudah ditemukan dan memiliki akses parkir yang memadai untuk pasien.
>
> 3. **Audy Dental Depok**
>    * **Lokasi:** Jl. Margonda Raya.
>    * **Kelebihan Akses:** Merupakan cabang dari jaringan klinik gigi yang cukup besar, lokasinya mudah diakses dari arah Jakarta maupun Depok dalam.
>
> 4. **Damessa Dental Clinic Margonda**
>    * **Lokasi:** Jl. Margonda Raya.
>    * **Kelebihan Akses:** Menyediakan layanan dokter gigi umum dan spesialis dengan lokasi yang ramah keluarga.
>
> **Tips Tambahan:** Karena kondisi lalu lintas Margonda yang sering padat pada jam pulang kerja atau akhir pekan, Anda disarankan untuk **melakukan reservasi terlebih dahulu** melalui kontak resmi masing-masing klinik guna menghindari antrean panjang. Jam operasional dan ketersediaan dokter spesialis dapat berubah sewaktu-waktu, jadi sebaiknya konfirmasikan sebelum kedatangan.

**Catatan:** Sozo tidak muncul, walaupun cabang audit berada di Jl. Margonda No.267.

**Sumber untuk cek fakta cabang:** [halaman resmi Sozo Dental Depok](https://www.sozodental.com/lokasi/depok/). Gemini tidak menyertakan sitasi.

### 5. Informasi Sozo Dental Depok

**Prompt**

> Saya mencari informasi tentang Sozo Dental Depok di Margonda. Apa yang bisa diverifikasi soal lokasi, layanan, jam buka, dan cara menghubungi?

**Sozo disebut?** Ya.

**Jawaban Gemini (utuh)**

> Berikut adalah informasi yang dapat diverifikasi mengenai **Sozo Dental Depok** yang berlokasi di kawasan Margonda:
>
> **1. Lokasi**
> * **Alamat:** Jl. Margonda Raya No.34 B, Pancoran Mas, Kecamatan Pancoran Mas, Kota Depok, Jawa Barat (16431).
> * **Aksesibilitas:** Berlokasi di pinggir jalan utama Margonda Raya, sehingga relatif mudah diakses baik dengan kendaraan pribadi maupun transportasi umum.
>
> **2. Layanan yang Ditawarkan**
> Klinik ini menyediakan perawatan gigi umum dan estetika, antara lain:
> * Pembersihan karang gigi (*scaling*).
> * Tambal gigi dan cabut gigi.
> * Perawatan saluran akar.
> * Pemasangan kawat gigi (*behel/orthodontic*).
> * Estetika gigi seperti pemutihan gigi (*bleaching*) dan *veneer*.
> * Pembuatan gigi tiruan (*denture*) dan mahkota gigi (*crown*).
>
> **3. Jam Operasional**
> * **Waktu Buka:** Secara umum buka setiap hari, pukul **10.00 – 20.00 WIB**.
> * *Catatan:* Jam operasional dapat berubah pada hari libur nasional atau kondisi khusus. Disarankan untuk melakukan konfirmasi terlebih dahulu sebelum berkunjung.
>
> **4. Cara Menghubungi & Reservasi**
> * **Media Sosial Resmi:** Instagram **@sozodental** (akun utama yang membagikan informasi cabang, promo, dan kontak).
> * **Reservasi:** Pendaftaran atau konsultasi awal sangat disarankan dilakukan secara online melalui tautan WhatsApp resmi yang tercantum di bio Instagram mereka, guna menghindari antrean panjang di lokasi.

**Catatan penting:** alamat yang diberikan Gemini **tidak cocok** dengan cabang audit (`Jl. Margonda No.267, Kemiri Muka, Beji`). Jawaban ini tidak boleh dipakai sebagai fakta cabang sebelum diverifikasi. Jam buka dan kontak juga perlu dicek terhadap kanal resmi saat ini.

**Sumber untuk cek fakta cabang:** [halaman resmi Sozo Dental Depok](https://www.sozodental.com/lokasi/depok/), [halaman layanan Sozo](https://www.sozodental.com/layanan/), dan [bukti identitas cabang sebelumnya](./EVIDENCE.md). Gemini tidak menyertakan sitasi.

## Langkah berikutnya

1. Konfirmasi fakta cabang Margonda dengan pemilik: alamat, jam buka, WhatsApp/nomor reservasi, dan layanan yang benar-benar tersedia.
2. Cocokkan fakta itu di situs resmi, Google Business Profile, Instagram, dan direktori yang paling sering muncul.
3. Jalankan ulang lima pertanyaan ini setelah pembaruan, lalu bandingkan hasilnya—jangan mengubah prompt di tengah perbandingan.
