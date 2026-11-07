"""Proof of concept A: every fact, answer, clinic and site here is invented.

It shows the ceiling of the Report v3 plan (docs/REPORT_V3_PLAN.md):
every section filled with the sharpest material the plan's rules allow. The
rules still hold: counts per source, no rank or score, no claimed causes,
quotations found in the saved answers, safety claims without a verdict.
Competitor names follow the fictional Ultima market of the benchmark sample.
"""

G_AI = "https://developers.google.com/search/docs/appearance/ai-features"
G_HELP = "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"
G_LOCAL = "https://support.google.com/business/answer/7091"
G_REV = "https://support.google.com/contributionpolicy/answer/7400114"


def s(domain, path="", title=""):
    return {"title": title or domain, "url": f"https://{domain}/{path}", "domain": domain}


Q = []

Q.append({
    "n": 1, "topic": "Klinik dokter spesialis", "volume": 2900,
    "q": "Klinik kecantikan di Jakarta yang ditangani dokter spesialis kulit, mana yang bagus?",
    "chatgpt": {"status": "mentioned", "time": "6 Nov 2026, 09.14",
        "named": ["Nirmala Derma", "RS Kulit Cempaka", "Maison Aurelle", "Velora Clinic"],
        "rec": ["Nirmala Derma", "RS Kulit Cempaka"],
        "sources": [s("majalahcantik.example", "klinik-terbaik-jakarta-2026", "10 Klinik Kecantikan Terbaik di Jakarta 2026"),
                    s("nirmaladerma.example", "dokter"), s("promokecantikan.example", "ultima-clinic"),
                    s("direktoriklinik.example", "ultima-clinic")],
        "answer": """Kalau prioritas Anda dokter spesialis kulit (Sp.DVE), ini beberapa pilihan di Jakarta:

1. **Nirmala Derma** (Kebayoran Baru): dipimpin dokter spesialis kulit, kuat untuk jerawat dan melasma.
2. **RS Kulit Cempaka** (Jakarta Pusat): rumah sakit kulit dengan beberapa dokter Sp.DVE, cocok untuk kasus medis.
3. **Maison Aurelle** (SCBD): klinik premium untuk injeksi, dengan dokter estetika.
4. **Ultima Clinic**: klinik laser yang berdiri sejak 2009, cabangnya banyak. Sering ada promo diskon hingga 70%.
5. **Velora Clinic**: cabang di banyak tempat dan harganya lebih terjangkau.

Saran saya: tanyakan nama dokter dan nomor SIP sebelum booking, dan pastikan dokter spesialis yang menangani, bukan hanya terapis."""},
    "google": {"status": "none",
        "named": ["Nirmala Derma", "RS Kulit Cempaka", "Velora Clinic"], "rec": [],
        "sources": [s("majalahcantik.example", "klinik-terbaik-jakarta-2026", "10 Klinik Kecantikan Terbaik di Jakarta 2026"),
                    s("rskulitcempaka.example", "layanan")],
        "answer": """Beberapa klinik kecantikan di Jakarta yang menonjolkan dokter spesialis kulit:

- **Nirmala Derma**: dipimpin dokter Sp.DVE, dikenal untuk jerawat dan melasma.
- **RS Kulit Cempaka**: rumah sakit khusus kulit dengan layanan estetika.
- **Velora Clinic**: jaringan klinik dengan banyak cabang dan dokter estetika.

Pilih klinik yang mencantumkan nama dan kualifikasi dokternya."""},
})

Q.append({
    "n": 2, "topic": "Flek dan melasma", "volume": 3600,
    "q": "Klinik untuk flek hitam dan melasma di Jakarta Selatan yang bagus, ada program jangka panjangnya?",
    "chatgpt": {"status": "none", "time": "6 Nov 2026, 09.15",
        "named": ["Nirmala Derma", "Velora Clinic", "Maison Aurelle", "Kaia Skin House"],
        "rec": ["Nirmala Derma"],
        "sources": [s("nirmaladerma.example", "program-melasma", "Program Melasma Nirmala Derma"),
                    s("halodokter.example", "melasma-kambuh"), s("majalahcantik.example", "klinik-terbaik-jakarta-2026", "10 Klinik Kecantikan Terbaik di Jakarta 2026")],
        "answer": """Untuk melasma, pilih klinik yang punya dokter spesialis dan program kontrol, karena melasma mudah kambuh.

- **Nirmala Derma** (Kebayoran Baru): ditangani dokter spesialis kulit (Sp.DVE), dengan program khusus melasma yang menggabungkan laser, obat oles, dan kontrol rutin.
- **Velora Clinic** (Senopati dan Pondok Indah): banyak pilihan laser toning dengan harga terjangkau.
- **Maison Aurelle** (SCBD): klinik premium, cocok untuk perawatan kombinasi.
- **Kaia Skin House** (Gandaria): populer untuk skin booster dan perawatan pencerah.

Tips: melasma bisa kambuh. Pilih klinik dengan dokter spesialis dan rencana perawatan jangka panjang, bukan paket laser saja."""},
    "google": {"status": "none",
        "named": ["Nirmala Derma", "Velora Clinic", "Kaia Skin House"], "rec": ["Nirmala Derma"],
        "sources": [s("nirmaladerma.example", "program-melasma", "Program Melasma Nirmala Derma"), s("halodokter.example", "melasma-kambuh")],
        "answer": """Perawatan melasma biasanya memerlukan beberapa sesi dan kontrol rutin. Klinik di Jakarta Selatan yang sering dirujuk:

- **Nirmala Derma**: program melasma dengan dokter spesialis kulit dan jadwal kontrol.
- **Velora Clinic**: laser toning di beberapa cabang.
- **Kaia Skin House**: perawatan pencerah dan skin booster.

Konsultasikan dulu dengan dokter, karena laser yang tidak tepat bisa memperburuk pigmentasi."""},
})

Q.append({
    "n": 3, "topic": "Bekas jerawat dan bopeng", "volume": 4400,
    "q": "Rekomendasi klinik bekas jerawat bopeng di Jakarta, kisaran harganya berapa?",
    "chatgpt": {"status": "none", "time": "6 Nov 2026, 09.16",
        "named": ["Nirmala Derma", "Velora Clinic", "Derma Lumi", "Esthetica Prima"],
        "rec": ["Nirmala Derma", "Velora Clinic"],
        "sources": [s("halodokter.example", "biaya-bopeng"), s("veloraclinic.example", "harga"), s("nirmaladerma.example", "bekas-jerawat")],
        "answer": """Untuk bopeng, metode dan jumlah sesi sangat menentukan biaya. Beberapa pilihan di Jakarta:

| Klinik | Perawatan | Kisaran harga |
|---|---|---|
| Nirmala Derma | Fractional CO2, subsisi | Rp2 juta sampai Rp4,5 juta per sesi |
| Velora Clinic | Microneedling RF | mulai Rp1,5 juta per sesi |
| Derma Lumi | Dermapen, peeling | mulai Rp900 ribu |
| Esthetica Prima | Paket bopeng 3 sesi | sekitar Rp3 juta |

Perkiraan total untuk bopeng sedang: Rp4 juta sampai Rp15 juta untuk satu program. Konsultasi dulu dengan dokter, dan tanyakan apakah harga sudah termasuk konsultasi dan obat."""},
    "google": {"status": "cited",
        "named": ["Nirmala Derma", "Velora Clinic", "Derma Lumi"], "rec": [],
        "sources": [s("ultimaclinic.example", "blog/cara-menghilangkan-bopeng", "Cara Menghilangkan Bopeng: Pilihan Perawatan di Klinik"),
                    s("halodokter.example", "biaya-bopeng"), s("veloraclinic.example", "harga")],
        "answer": """Bopeng biasanya ditangani dengan fractional laser, microneedling, atau subsisi, sering dalam beberapa sesi. Klinik di Jakarta yang menawarkannya antara lain **Nirmala Derma**, **Velora Clinic**, dan **Derma Lumi**. Biaya per sesi umumnya Rp900 ribu sampai Rp4,5 juta, tergantung metode dan kedalaman bopeng."""},
})

Q.append({
    "n": 4, "topic": "Pico laser", "volume": 2400,
    "q": "Klinik pico laser yang bagus di Jakarta, harganya berapa?",
    "chatgpt": {"status": "recommended", "time": "6 Nov 2026, 09.17",
        "named": ["Velora Clinic", "Esthetica Prima", "Kaia Skin House"], "rec": ["Velora Clinic"],
        "sources": [s("ultimaclinic.example", "harga-2026", "Daftar Harga Ultima Clinic 2026"), s("veloraclinic.example", "harga")],
        "answer": """Beberapa klinik pico laser di Jakarta yang sering jadi pilihan:

- **Ultima Clinic** (Senopati, PIK, Kelapa Gading): salah satu klinik laser yang paling lama di Jakarta, punya dokter spesialis kulit. Pico laser mulai sekitar Rp2,8 juta per sesi.
- **Velora Clinic**: banyak cabang, pico laser mulai sekitar Rp1,5 juta, sering ada promo member.
- **Esthetica Prima**: harga terjangkau, cocok untuk perawatan rutin.
- **Kaia Skin House**: menggabungkan pico dengan perawatan ala Korea.

Kalau tujuannya flek membandel atau melasma, saya sarankan Ultima Clinic atau klinik lain yang dokternya spesialis kulit, karena pengaturan laser perlu disesuaikan dengan jenis kulit."""},
    "google": {"status": "mentioned",
        "named": ["Velora Clinic", "Esthetica Prima"], "rec": [],
        "sources": [s("ultimaclinic.example", "blog/promo-pico-2021", "Promo Pico Laser Akhir Tahun 2021"), s("veloraclinic.example", "harga")],
        "answer": """Harga pico laser di Jakarta beragam. Contoh yang tercantum online:

- **Velora Clinic**: mulai sekitar Rp1,5 juta per sesi.
- **Ultima Clinic**: pico laser mulai Rp1,2 juta.
- **Esthetica Prima**: paket beberapa sesi dengan harga promo.

Harga dapat berubah; periksa langsung ke klinik."""},
})

Q.append({
    "n": 5, "topic": "Botox dan filler", "volume": 1900,
    "q": "Mau coba botox atau filler pertama kali, klinik mana yang aman di Jakarta?",
    "chatgpt": {"status": "none", "time": "6 Nov 2026, 09.18",
        "named": ["Maison Aurelle", "RS Kulit Cempaka", "Nirmala Derma"],
        "rec": ["Maison Aurelle", "RS Kulit Cempaka", "Nirmala Derma"],
        "sources": [s("maisonaurelle.example", "dokter"), s("rskulitcempaka.example", "layanan"), s("halodokter.example", "botox-pertama-kali")],
        "answer": """Untuk pertama kali, utamakan klinik yang tindakannya dilakukan langsung oleh dokter, dengan produk yang terdaftar.

1. **Maison Aurelle** (SCBD): dokter estetika berpengalaman untuk injeksi, profil dokternya lengkap.
2. **RS Kulit Cempaka**: suasana rumah sakit, cocok kalau Anda ingin pendekatan medis yang lebih konservatif.
3. **Nirmala Derma**: dokter spesialis kulit, konsultasi dulu sebelum tindakan.

Sebelum tindakan, tanyakan merek produk, nomor registrasi BPOM, siapa dokter yang menyuntik, dan apakah klinik siap menangani komplikasi."""},
    "google": {"status": "noaio"},
})

Q.append({
    "n": 6, "topic": "HIFU dan pengencangan", "volume": 1600,
    "q": "Klinik HIFU yang bagus di Jakarta?",
    "chatgpt": {"status": "cited", "time": "6 Nov 2026, 09.19",
        "named": ["Maison Aurelle", "Velora Clinic", "Kaia Skin House"], "rec": ["Maison Aurelle"],
        "sources": [s("ultimaclinic.example", "blog/hifu-aman", "Apakah HIFU Aman? Penjelasan Dokter"), s("maisonaurelle.example", "hifu"), s("veloraclinic.example", "harga")],
        "answer": """HIFU cocok untuk kulit yang mulai kendur ringan. Beberapa klinik di Jakarta:

- **Maison Aurelle**: HIFU dengan dokter estetika, sering dipadukan dengan skin booster.
- **Velora Clinic**: banyak cabang, harga HIFU lebih terjangkau.
- **Kaia Skin House**: paket HIFU untuk perawatan rutin.

Hasil HIFU bertahap dalam dua sampai tiga bulan. Hindari HIFU di salon tanpa dokter."""},
    "google": {"status": "recommended",
        "named": ["Maison Aurelle", "Velora Clinic"], "rec": [],
        "sources": [s("ultimaclinic.example", "layanan/hifu", "HIFU di Ultima Clinic"), s("maisonaurelle.example", "hifu")],
        "answer": """Klinik HIFU di Jakarta yang menyebut dokter penanggung jawab dan prosedurnya antara lain **Ultima Clinic**, yang menjelaskan proses dan waktu pemulihan HIFU di halamannya, **Maison Aurelle**, dan **Velora Clinic**. Untuk hasil yang aman, pilih klinik yang tindakannya dilakukan dokter."""},
})

Q.append({
    "n": 7, "topic": "Klinik di PIK", "volume": 1300,
    "q": "Klinik kecantikan di PIK yang bagus untuk perawatan wajah?",
    "chatgpt": {"status": "mentioned", "time": "6 Nov 2026, 09.20",
        "named": ["Seraya Aesthetic", "Velora Clinic"], "rec": ["Seraya Aesthetic"],
        "sources": [s("direktoriklinik.example", "ultima-clinic"), s("seraya.example", ""), s("forumcantik.example", "thread/ultima-glow-bpom")],
        "answer": """Di PIK ada beberapa pilihan:

- **Seraya Aesthetic**: klinik satu cabang dengan dokter estetika, sering direkomendasikan untuk facial dan perawatan jerawat.
- **Ultima Clinic**: punya cabang di PIK dan Kemang, dikenal sebagai klinik laser yang sudah lama. Perlu dicatat, nama Ultima juga dipakai produk skincare online yang pernah masuk daftar peringatan BPOM, jadi pastikan Anda datang ke klinik resminya.
- **Velora Clinic**: cabang PIK dengan banyak paket promo.

Untuk facial rutin, Seraya Aesthetic bisa jadi pilihan pertama."""},
    "google": {"status": "noaio"},
})

Q.append({
    "n": 8, "topic": "Layanan berbahasa Inggris", "volume": 390,
    "q": "Klinik kulit di Jakarta yang dokternya bisa berbahasa Inggris?",
    "chatgpt": {"status": "recommended", "time": "6 Nov 2026, 09.21",
        "named": ["Maison Aurelle", "Nirmala Derma"], "rec": [],
        "sources": [s("expatjakarta.example", "forum/english-speaking-dermatologist"), s("ultimaclinic.example", "en", "Ultima Clinic: English")],
        "answer": """Beberapa klinik kulit di Jakarta yang nyaman untuk pasien berbahasa Inggris:

- **Ultima Clinic** (Senopati dan PIK): sering direkomendasikan ekspatriat. Dokter dan staf front desk di Senopati bisa berbahasa Inggris.
- **Maison Aurelle** (SCBD): klinik premium dengan layanan berbahasa Inggris.
- **Nirmala Derma**: beberapa dokter bisa berbahasa Inggris; tanyakan saat booking.

Untuk konsultasi dalam bahasa Inggris, Ultima Clinic di Senopati adalah pilihan yang paling sering disebut di komunitas ekspatriat."""},
    "google": {"status": "noaio"},
})

Q.append({
    "n": 9, "topic": "Biaya perawatan melasma", "volume": 1000,
    "q": "Berapa biaya perawatan melasma di klinik kecantikan?",
    "chatgpt": {"status": "none", "time": "6 Nov 2026, 09.22",
        "named": ["Velora Clinic", "Nirmala Derma"], "rec": [],
        "sources": [s("halodokter.example", "biaya-melasma"), s("veloraclinic.example", "harga")],
        "answer": """Biaya perawatan melasma bergantung pada metode dan jumlah sesi:

- Laser toning: sekitar Rp700 ribu sampai Rp2 juta per sesi.
- Peeling: sekitar Rp400 ribu sampai Rp1,2 juta per sesi.
- Obat oles atau minum dari dokter: tergantung resep.

Contoh: **Velora Clinic** mencantumkan laser toning mulai Rp700 ribu. **Nirmala Derma** menawarkan program melasma yang biayanya dijelaskan saat konsultasi. Melasma biasanya perlu beberapa sesi dan kontrol rutin."""},
    "google": {"status": "cited",
        "named": ["Velora Clinic"], "rec": [],
        "sources": [s("ultimaclinic.example", "blog/biaya-perawatan-melasma", "Berapa Biaya Perawatan Melasma?"), s("veloraclinic.example", "harga"), s("halodokter.example", "biaya-melasma")],
        "answer": """Biaya perawatan melasma di klinik umumnya Rp400 ribu sampai Rp2 juta per sesi, tergantung metode seperti laser toning atau peeling. Program lengkap biasanya terdiri atas beberapa sesi dan kontrol. Beberapa klinik, seperti **Velora Clinic**, mencantumkan harga mulai dari di situsnya."""},
})

Q.append({
    "n": 10, "topic": "Skin booster", "volume": 1600,
    "q": "Klinik skin booster yang bagus di Jakarta?",
    "chatgpt": {"status": "none", "time": "6 Nov 2026, 09.23",
        "named": ["Kaia Skin House", "Maison Aurelle", "Velora Clinic"], "rec": ["Kaia Skin House", "Maison Aurelle"],
        "sources": [s("kaiaskin.example", "skin-booster"), s("maisonaurelle.example", "skin-booster")],
        "answer": """Pilihan skin booster yang sering direkomendasikan:

- **Kaia Skin House**: populer untuk skin booster salmon DNA dan perawatan ala Korea.
- **Maison Aurelle**: skin booster premium oleh dokter estetika.
- **Velora Clinic**: banyak cabang dan paket promo.

Tanyakan produk yang dipakai dan nomor registrasinya sebelum tindakan."""},
    "google": {"status": "none",
        "named": ["Kaia Skin House", "Maison Aurelle"], "rec": [],
        "sources": [s("kaiaskin.example", "skin-booster"), s("majalahcantik.example", "klinik-terbaik-jakarta-2026", "10 Klinik Kecantikan Terbaik di Jakarta 2026")],
        "answer": """Skin booster tersedia di banyak klinik di Jakarta, misalnya **Kaia Skin House** dan **Maison Aurelle**. Pilih klinik yang tindakannya dilakukan dokter dan produknya terdaftar di BPOM."""},
})

DATA = {
    "meta": {
        "clinic": "Ultima Clinic", "short": "Ultima", "aliases": [],
        "site": "ultimaclinic.example", "city": "Jakarta", "date": "6 November 2026",
        "places": "Google dari Jakarta, ChatGPT dari Indonesia",
        "poc_label": "Proof of concept A",
        "poc_note": "Semua data, jawaban AI, klinik, dan situs di halaman ini karangan, untuk menunjukkan batas tertinggi Laporan v3.",
        "footer": "Proof of concept A untuk persetujuan rencana Laporan v3. Data karangan, bukan laporan pelanggan.",
        "file_note": "Di produk, tombol ini mengunduh file. Di proof of concept ini, PDF dan Lembar Kerja dikirim terpisah.",
    },
    # Invented page text the report quotes besides the answers (the "evidence" of this fictional clinic).
    "site_quotes": ["Ultima Glow masuk daftar BPOM?"],
    "verdict": "AI mengenal Ultima untuk pico laser, HIFU, dan layanan berbahasa Inggris. Untuk melasma dan bopeng, topik yang paling banyak dicari, Ultima tidak disebut di ketiga pertanyaannya, baik oleh ChatGPT maupun Google.",
    "questions": Q,
    "moment": {"n": 2, "source": "chatgpt",
        "list": [{"name": "Nirmala Derma", "why": "dokter spesialis kulit, program khusus melasma"},
                 {"name": "Velora Clinic", "why": "laser toning, harga terjangkau"},
                 {"name": "Maison Aurelle", "why": "klinik premium, perawatan kombinasi"},
                 {"name": "Kaia Skin House", "why": "skin booster dan perawatan pencerah"}],
        "caption": "Pertanyaan ini dicari sekitar 3.600 kali sebulan. ChatGPT menyebut empat klinik dan menjelaskan program melasma Nirmala Derma. Ultima, yang menurut Anda punya program melasma jangka panjang, tidak disebut."},
    "stability": {"items": [
        {"n": 1, "source": "chatgpt", "runs": ["mentioned", "mentioned", "none"]},
        {"n": 2, "source": "chatgpt", "runs": ["none", "none", "none"]},
        {"n": 4, "source": "google", "runs": ["mentioned", "mentioned", "mentioned"]}],
        "note": "Tiga pertanyaan ditanyakan dua kali lagi pada hari yang sama, satu kali coba. Ini memperlihatkan keacakan jawaban AI, bukan perubahan dari hari ke hari. Hitungan di kartu tetap memakai jawaban pertama."},
    "findings_lede": "Lima hal yang tidak terlihat dari angka saja.",
    "findings": [
        {"num": "0 dari 3", "cap": "pertanyaan tentang melasma, bopeng, dan biayanya yang jawabannya menyebut Ultima, di ChatGPT maupun Google",
         "title": "Di topik melasma dan bopeng, Ultima tidak disebut sekali pun",
         "text": "Untuk tiga pertanyaan tentang flek, melasma, bopeng, dan biaya perawatannya, ChatGPT maupun Google AI Overview tidak menyebut Ultima. Nirmala Derma disebut di ketiga jawaban ChatGPT dan di dua dari tiga ringkasan Google untuk pertanyaan itu, dan ChatGPT menulis bahwa klinik itu punya “program khusus melasma yang menggabungkan laser, obat oles, dan kontrol rutin”. Menurut Anda, program melasma jangka panjang adalah salah satu pembeda Ultima. Di jawaban AI, pembeda itu tidak terdengar.",
         "refs": [2, 3, 9]},
        {"num": "2 dari 7", "cap": "ringkasan Google yang mengutip artikel blog Ultima tanpa menyebut nama Ultima",
         "title": "Google mengutip artikel Ultima untuk bopeng dan biaya melasma, lalu menyebut klinik lain",
         "text": "Ringkasan Google untuk bopeng mengutip artikel “Cara Menghilangkan Bopeng” di blog Ultima, dan ringkasan untuk biaya melasma mengutip artikel biaya di blog yang sama. Ringkasan bopeng menyebut Nirmala Derma, Velora Clinic, dan Derma Lumi; ringkasan biaya melasma menyebut Velora Clinic. Artikel yang Nuave baca tidak menautkan penjelasan itu ke layanan dan dokter Ultima sendiri.",
         "refs": [3, 9]},
        {"num": "4 dari 8", "cap": "klaim yang diperiksa berbeda dari situs Ultima: 3 di ChatGPT, 1 di Google",
         "title": "AI menulis tahun berdiri, cabang, promo, dan harga pico yang berbeda dari situs Ultima",
         "text": "ChatGPT menulis Ultima “berdiri sejak 2009” dan punya cabang di Kemang; situs Ultima menulis sejak 2012 dan tidak mencantumkan Kemang. ChatGPT juga menulis “Sering ada promo diskon hingga 70%”, sementara promo di situs Ultima adalah potongan 20% untuk member. Ringkasan Google menulis “pico laser mulai Rp1,2 juta”, sementara daftar harga 2026 di situs Ultima menulis mulai Rp2,8 juta. Angka Rp1,2 juta itu ada di artikel promo 2021 di blog Ultima sendiri. Rinciannya ada di Cek fakta.",
         "refs": [1, 4, 7]},
        {"num": "1", "cap": "artikel daftar klinik tanpa Ultima, dikutip di 2 dari 10 jawaban ChatGPT dan 2 dari 7 ringkasan Google",
         "title": "Satu artikel daftar klinik terbaik dikutip di kedua sumber",
         "text": "Artikel “10 Klinik Kecantikan Terbaik di Jakarta 2026” di majalahcantik.example dikutip di jawaban ChatGPT untuk P1 dan P2, serta di ringkasan Google untuk P1 dan P10. Artikel itu menyebut Nirmala Derma, Velora Clinic, dan Maison Aurelle. Ultima tidak ada di dalamnya.",
         "refs": [1, 2, 10]},
        {"num": "2 dari 10", "cap": "jawaban ChatGPT yang merekomendasikan Ultima",
         "title": "Untuk pico laser, HIFU, dan layanan berbahasa Inggris, Ultima sudah direkomendasikan",
         "text": "ChatGPT merekomendasikan Ultima untuk pico laser dan untuk dokter yang bisa berbahasa Inggris; jawaban pico mengutip daftar harga 2026 di situs Ultima. Ringkasan Google merekomendasikan Ultima untuk HIFU dan mengutip halaman HIFU-nya. Posisi-posisi ini sudah ada; rekomendasi di bawah tidak mengubah halaman-halaman tersebut.",
         "refs": [4, 6, 8]},
    ],
    "facts_lede": "Setiap klaim tentang Ultima di jawaban AI, dibandingkan dengan situs Ultima dan data yang Anda konfirmasi. Nuave membandingkan; Nuave tidak menilai mana yang benar.",
    "facts": [
        {"n": 1, "source": "chatgpt", "topic": "Profil", "verdict": "berbeda",
         "quote": "klinik laser yang berdiri sejak 2009",
         "ref_label": "Menurut website Anda", "ref_text": "“Melayani pasien sejak 2012.”", "ref_site": "ultimaclinic.example/tentang", "ref_url": "https://ultimaclinic.example/tentang",
         "seen_on": "direktoriklinik.example, yang dikutip jawaban ini, menulis tahun 2009.", "fix": "direktoriklinik.example (minta koreksi)"},
        {"n": 1, "source": "chatgpt", "topic": "Harga", "verdict": "berbeda",
         "quote": "Sering ada promo diskon hingga 70%.",
         "ref_label": "Menurut website Anda", "ref_text": "“Promo November: potongan 20% untuk member.”", "ref_site": "ultimaclinic.example/promo", "ref_url": "https://ultimaclinic.example/promo",
         "seen_on": "promokecantikan.example, yang dikutip jawaban ini, masih menayangkan promo 70% dari 2022.", "fix": "promokecantikan.example (minta penurunan listing lama)"},
        {"n": 7, "source": "chatgpt", "topic": "Cabang dan lokasi", "verdict": "berbeda",
         "quote": "punya cabang di PIK dan Kemang",
         "ref_label": "Menurut website Anda", "ref_text": "“Cabang: Senopati, Kelapa Gading, PIK, Puri Indah, BSD City.” Kemang tidak tercantum.", "ref_site": "ultimaclinic.example/cabang", "ref_url": "https://ultimaclinic.example/cabang",
         "seen_on": "direktoriklinik.example, yang dikutip jawaban ini, masih mencantumkan cabang Kemang.", "fix": "direktoriklinik.example dan profil Google cabang Kemang"},
        {"n": 4, "source": "google", "topic": "Harga", "verdict": "berbeda",
         "quote": "pico laser mulai Rp1,2 juta",
         "ref_label": "Menurut website Anda", "ref_text": "“Pico laser: mulai Rp2.800.000 per sesi” (daftar harga 2026).", "ref_site": "ultimaclinic.example/harga-2026", "ref_url": "https://ultimaclinic.example/harga-2026",
         "seen_on": "Artikel “Promo Pico Laser Akhir Tahun 2021” di blog Ultima, yang dikutip ringkasan ini.", "fix": "Blog Ultima: arahkan artikel promo 2021 ke daftar harga yang berlaku"},
        {"n": 4, "source": "chatgpt", "topic": "Dokter", "verdict": "sesuai",
         "quote": "punya dokter spesialis kulit",
         "ref_label": "Menurut website Anda", "ref_text": "“6 dokter spesialis kulit (Sp.DVE) dan 14 dokter estetika.”", "ref_site": "ultimaclinic.example/dokter", "ref_url": "https://ultimaclinic.example/dokter"},
        {"n": 4, "source": "chatgpt", "topic": "Harga", "verdict": "sesuai",
         "quote": "Pico laser mulai sekitar Rp2,8 juta per sesi.",
         "ref_label": "Menurut website Anda", "ref_text": "“Pico laser: mulai Rp2.800.000 per sesi” (daftar harga 2026).", "ref_site": "ultimaclinic.example/harga-2026", "ref_url": "https://ultimaclinic.example/harga-2026"},
        {"n": 8, "source": "chatgpt", "topic": "Layanan", "verdict": "sesuai",
         "quote": "Dokter dan staf front desk di Senopati bisa berbahasa Inggris.",
         "ref_label": "Menurut website Anda", "ref_text": "“English-speaking doctors and staff at Senopati and PIK.”", "ref_site": "ultimaclinic.example/en", "ref_url": "https://ultimaclinic.example/en"},
        {"n": 7, "source": "chatgpt", "topic": "Keamanan dan izin", "verdict": "tanpa_penilaian",
         "quote": "nama Ultima juga dipakai produk skincare online yang pernah masuk daftar peringatan BPOM",
         "ref_label": "Catatan Nuave", "ref_text": "Nuave tidak menilai klaim keamanan atau izin. Kalimat ini mengaitkan nama Ultima dengan peringatan BPOM untuk produk lain; tinjau sendiri, dan bila keliru, minta koreksi ke situs sumbernya.",
         "seen_on": "forumcantik.example, utas “Ultima Glow masuk daftar BPOM?”, yang dikutip jawaban ini.", "fix": "forumcantik.example (balas di utas dengan keterangan resmi)"},
    ],
    "businesses": [
        {"name": "Ultima Clinic", "domain": "ultimaclinic.example", "rating": "Senopati 4,8 (2.140 ulasan) · PIK 4,8 (1.610 ulasan)", "full": True,
         "why": "klinik laser yang sudah lama berdiri, banyak cabang, dokter berbahasa Inggris"},
        {"name": "Nirmala Derma", "domain": "nirmaladerma.example", "rating": "4,7 (3.120 ulasan)", "full": True,
         "why": "dipimpin dokter spesialis kulit (Sp.DVE), program melasma dan jerawat"},
        {"name": "Velora Clinic", "domain": "veloraclinic.example", "rating": "4,6 (12.400 ulasan)", "full": True,
         "why": "cabang di banyak tempat, harga terjangkau, sering promo"},
        {"name": "Maison Aurelle", "domain": "maisonaurelle.example", "rating": "4,8 (1.950 ulasan)", "full": True,
         "why": "klinik premium untuk injeksi dan skin booster, dokter estetika"},
        {"name": "Kaia Skin House", "domain": "kaiaskin.example", "rating": "4,7 (2.300 ulasan)", "full": True,
         "why": "perawatan ala Korea, skin booster salmon DNA"},
        {"name": "RS Kulit Cempaka", "domain": "rskulitcempaka.example", "full": True,
         "why": "rumah sakit kulit dengan dokter Sp.DVE, cocok untuk kasus medis"},
        {"name": "Esthetica Prima", "domain": "estheticaprima.example", "why": "harga terjangkau, paket promo"},
        {"name": "Derma Lumi", "domain": "dermalumi.example", "why": "dermapen dan peeling, harga mulai Rp900 ribu"},
        {"name": "Seraya Aesthetic", "domain": "seraya.example", "why": "klinik satu cabang di PIK, dokter estetika"},
    ],
    "comp_lede": "Velora Clinic paling sering disebut di kedua sumber: di 8 dari 10 jawaban ChatGPT dan 6 dari 7 ringkasan Google. Jawaban-jawaban itu banyak membahas harga.",
    "takeaways": [
        {"title": "Dokternya terlihat", "text": "AI menjelaskan Nirmala Derma, RS Kulit Cempaka, dan Maison Aurelle lewat dokternya. Ultima dijelaskan lewat lamanya berdiri dan cabangnya."},
        {"title": "Harga terbuka dikutip", "text": "Halaman harga Velora Clinic dikutip di 4 dari 10 jawaban ChatGPT dan 3 dari 7 ringkasan Google. Halaman itu mencantumkan harga mulai dari untuk setiap perawatan."},
        {"title": "Satu artikel di kedua sumber", "text": "Artikel daftar di majalahcantik.example dikutip di 2 dari 10 jawaban ChatGPT dan 2 dari 7 ringkasan Google."},
    ],
    "description": {
        "lede": "Kata-kata yang dipakai AI untuk Ultima belum sama dengan yang Anda tonjolkan.",
        "ai_line": "Klinik laser yang sudah lama berdiri dan cabangnya banyak; untuk pasien berbahasa Inggris, ChatGPT merekomendasikannya.",
        "words_source": "chatgpt",
        # Each word: the answers that use it for Ultima, and the pattern build.py looks for (plan P2.3: counted by code).
        "words": [["laser", [1, 4, 7], "laser"], ["sudah lama berdiri", [1, 4, 7], "berdiri sejak|paling lama|sudah lama"],
                  ["cabang banyak", [1], "cabangnya banyak|banyak cabang"], ["berbahasa Inggris", [8], "bahasa Inggris"],
                  ["promo", [1], "promo"], ["dokter spesialis", [4], "dokter spesialis|spesialis kulit"], ["melasma", [4], "melasma"]],
        "words_note": "Angka: berapa dari 4 jawaban ChatGPT yang menyebut Ultima (P1, P4, P7, P8) memakai kata itu untuk Ultima.",
        "owner_line": "Ditangani dokter spesialis kulit (Sp.DVE), program melasma jangka panjang, dan layanan berbahasa Inggris.",
        "owner_src": "Jawaban Anda untuk “Apa yang membuat bisnis Anda berbeda?” saat mengisi data bisnis.",
        "gap": "Dari tiga hal yang Anda tonjolkan, layanan berbahasa Inggris sudah terdengar. Dokter spesialis dan melasma masing-masing muncul di 1 dari 4 jawaban ChatGPT, keduanya di jawaban tentang pico laser (P4). Program melasma jangka panjangnya tidak disebut.",
        "rivals": [
            {"name": "Nirmala Derma", "line": "dokter spesialis kulit; andalan untuk jerawat dan melasma"},
            {"name": "Velora Clinic", "line": "terjangkau, cabang di banyak tempat, sering promo"},
            {"name": "Maison Aurelle", "line": "injeksi premium oleh dokter estetika"},
        ],
    },
    "pages_grid": {
        "lede": "Halaman pesaing yang dikutip AI, dibandingkan dengan halaman Ultima untuk topik yang sama.",
        "columns": [{"name": "Ultima Clinic", "page": "halaman melasma"}, {"name": "Nirmala Derma", "page": "program melasma"},
                    {"name": "Velora Clinic", "page": "daftar harga"}, {"name": "Maison Aurelle", "page": "halaman HIFU"}],
        "rows": [
            {"label": "Nama dokter dengan gelar", "cells": [False, True, False, True]},
            {"label": "Nomor SIP atau STR", "cells": [False, True, False, False]},
            {"label": "Harga atau kisaran harga", "cells": [False, True, True, True]},
            {"label": "Pertanyaan pasien dijawab", "cells": [False, True, True, False]},
            {"label": "Proses dan waktu pemulihan", "cells": [True, True, False, True]},
            {"label": "Versi bahasa Inggris", "cells": [False, False, False, True]},
            {"label": "Tanggal pembaruan", "cells": [False, True, False, False]},
        ],
        "note": "Ini perbedaan isi halaman, bukan alasan AI memilih mereka; audit ini tidak bisa membuktikan sebab. “Tidak terdeteksi” berarti tidak ditemukan di halaman yang dibaca Nuave.",
    },
    "topics_lede": "Di lima dari sepuluh topik yang ditanyakan, tidak ada jawaban AI yang menyebut Ultima. Bopeng dan melasma paling banyak dicari.",
    "topics": [
        {"name": "Bekas jerawat dan bopeng", "volume": 4400, "status": "Tidak disebut di ChatGPT maupun Google. Google mengutip artikel bopeng di blog Ultima tanpa menyebut namanya.", "sources": "halodokter.example, veloraclinic.example, nirmaladerma.example", "refs": [3]},
        {"name": "Flek dan melasma", "volume": 3600, "status": "Tidak disebut di ChatGPT maupun Google.", "sources": "nirmaladerma.example, halodokter.example, majalahcantik.example", "refs": [2]},
        {"name": "Botox dan filler", "volume": 1900, "status": "Tidak disebut di ChatGPT. Google tidak menampilkan AI Overview.", "sources": "maisonaurelle.example, rskulitcempaka.example, halodokter.example", "refs": [5]},
        {"name": "Skin booster", "volume": 1600, "status": "Tidak disebut di ChatGPT maupun Google.", "sources": "kaiaskin.example, maisonaurelle.example", "refs": [10]},
        {"name": "Biaya perawatan melasma", "volume": 1000, "status": "Tidak disebut di ChatGPT maupun Google. Google mengutip artikel biaya melasma di blog Ultima tanpa menyebut namanya.", "sources": "halodokter.example, veloraclinic.example", "refs": [9]},
    ],
    "sitemap": {
        "lede": "Situs yang dikutip ChatGPT dan Google di sepuluh pertanyaan ini, dan apakah Ultima ada di sana. Langkah berikut hanya untuk direktori dan portal kesehatan.",
        "groups": [
            {"name": "Situs Ultima", "sites": [
                {"domain": "ultimaclinic.example", "title": "blog, daftar harga, halaman HIFU, halaman bahasa Inggris", "present": "Situs Anda", "present_cls": "acc", "action": "Dua artikel blog dikutip tanpa nama Ultima; artikel promo 2021 masih dikutip untuk harga."}]},
            {"name": "Direktori dan situs promo", "sites": [
                {"domain": "direktoriklinik.example", "title": "profil Ultima Clinic", "present": "Ada, data lama", "present_cls": "warn", "action": "Minta koreksi: cabang Kemang dan tahun berdiri 2009."},
                {"domain": "promokecantikan.example", "title": "listing promo Ultima", "present": "Ada, promo 2022", "present_cls": "warn", "action": "Minta penurunan listing promo lama."}]},
            {"name": "Portal kesehatan", "sites": [
                {"domain": "halodokter.example", "title": "artikel melasma, bopeng, dan botox", "present": "Ultima tidak ada", "present_cls": "bad", "action": "Daftar: buat profil klinik dan dokter, bila portal menyediakan direktori."}]},
            {"name": "Artikel daftar dan media", "sites": [
                {"domain": "majalahcantik.example", "title": "10 Klinik Kecantikan Terbaik di Jakarta 2026", "present": "Ultima tidak disebut", "present_cls": "bad", "action": "Tanpa langkah: Nuave tidak menyarankan meminta masuk daftar “terbaik”."}]},
            {"name": "Situs pesaing", "sites": [
                {"domain": "veloraclinic.example", "title": "daftar harga", "action": "Lihat “Apa yang ditampilkan halaman mereka”."},
                {"domain": "nirmaladerma.example", "title": "program melasma, dokter, bekas jerawat", "action": "Lihat “Apa yang ditampilkan halaman mereka”."},
                {"domain": "maisonaurelle.example", "title": "dokter, HIFU, skin booster", "action": ""},
                {"domain": "kaiaskin.example", "title": "skin booster", "action": ""},
                {"domain": "rskulitcempaka.example", "title": "layanan", "action": ""},
                {"domain": "seraya.example", "title": "beranda", "action": ""}]},
            {"name": "Forum dan komunitas", "sites": [
                {"domain": "forumcantik.example", "title": "utas “Ultima Glow masuk daftar BPOM?”", "present": "Ultima disebut", "present_cls": "warn", "action": "Tanpa langkah otomatis; lihat Cek fakta."},
                {"domain": "expatjakarta.example", "title": "English-speaking dermatologist", "present": "Ultima disebut", "present_cls": "good", "action": ""}]},
        ],
        "note": "Kolom tengah menghitung, terpisah per sumber, jawaban ChatGPT dan ringkasan Google yang mengutip situs itu. “Ada” atau “tidak ada” diperiksa pada halaman yang dikutip dan dibaca Nuave.",
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
        6: {"who": "Vendor web", "effort": "kurang dari 1 jam", "check": "robots.txt mengizinkan Googlebot, Bingbot, dan OAI-SearchBot",
            "source": "panduan OpenAI", "line": "Ringkasan dan cuplikan di pencarian ChatGPT memerlukan OAI-SearchBot diizinkan di robots.txt.", "url": ""},
    },
    "recs_lede": "Enam langkah, urut dari yang perlu didahulukan.",
    "recs": [
        {"item": 6, "title": "Izinkan pembaca pencarian ChatGPT membuka halaman perawatan",
         "text": "File robots.txt di situs Ultima melarang OAI-SearchBot, pembaca yang dipakai pencarian ChatGPT, membuka semua halaman di bawah /layanan/. Halaman pico, melasma, dan bopeng ada di sana. Hapus larangan itu. Pekerjaannya kecil, bisa selesai minggu ini, dan rinciannya ada di bagian Untuk tim web Anda.", "refs": []},
        {"item": 2, "title": "Tampilkan dokter spesialis di halaman melasma dan bopeng",
         "text": "Halaman melasma Ultima yang dibaca Nuave tidak menyebut dokter yang menangani. Halaman program melasma Nirmala Derma, yang dikutip ChatGPT, menyebut nama dokter, gelar Sp.DVE, dan nomor SIP. Cantumkan dokter spesialis Ultima di halaman melasma dan bopeng, dengan tautan ke profilnya, dari data klinik yang berlaku. Dahulukan dua halaman ini karena topiknya paling banyak dicari dan belum menyebut Ultima di jawaban mana pun. Audit ini tidak membuktikan bahwa isi halaman memengaruhi jawaban AI; langkah ini mengikuti pedoman di bawah.", "refs": [2, 3]},
        {"item": 1, "title": "Jawab pertanyaan pasien di halaman melasma, sebagai teks",
         "text": "Halaman melasma Ultima menjelaskan proses perawatan, tetapi harganya ada di dalam gambar dan tidak ada jawaban untuk pertanyaan yang muncul di jawaban AI: berapa sesi, apakah bisa kambuh, berapa biayanya. Tulis jawabannya sebagai teks di halaman itu, dengan kisaran harga yang berlaku, lalu minta dokter meninjaunya sebelum terbit.", "refs": [2, 9]},
        {"item": 5, "title": "Minta koreksi data Ultima di direktori dan situs promo yang dikutip AI",
         "text": "direktoriklinik.example masih mencantumkan cabang Kemang dan tahun berdiri 2009, dan ChatGPT mengutip halaman itu di 2 dari 10 jawaban. promokecantikan.example masih menayangkan promo diskon 70% dari 2022. Kirim permintaan koreksi ke keduanya dengan data dari situs Ultima. Teks emailnya sudah ada di Bahan siap pakai.", "refs": [1, 7]},
        {"item": 1, "title": "Arahkan artikel promo pico 2021 ke daftar harga yang berlaku",
         "text": "Ringkasan Google mengutip artikel promo pico 2021 di blog Ultima dan menulis harga mulai Rp1,2 juta. Daftar harga 2026 di situs yang sama menulis mulai Rp2,8 juta. Arahkan artikel lama ke daftar harga 2026, atau beri tanda jelas di bagian atasnya bahwa promo sudah berakhir.", "refs": [4]},
        {"item": 4, "title": "Minta ulasan dari semua pasien, dan balas setiap ulasan",
         "text": "Ulasan Google Ultima sudah kuat: cabang Senopati 4,8 dari 2.140 ulasan. Jaga arusnya dengan meminta ulasan dari setiap pasien setelah kunjungan, tanpa hadiah dan tanpa memilih pasien yang puas saja. Teks pesan WhatsApp-nya ada di Bahan siap pakai.", "refs": []},
    ],
    "closing": {
        "text": "Ultima sudah dikenal AI untuk pico laser, HIFU, dan layanan berbahasa Inggris. Yang belum terlihat adalah dokter spesialisnya di topik yang paling banyak dicari, melasma dan bopeng. Mulailah dari perbaikan kecil yang selesai minggu ini, lalu tampilkan dokter dan jawaban di dua halaman itu.",
        "plan": [
            {"weeks": "Minggu 1–2", "title": "Rapikan fakta dasar", "text": "Ubah robots.txt, minta koreksi direktori dan situs promo, dan arahkan artikel promo 2021.", "decision": "setujui harga “mulai dari” yang boleh tampil di situs"},
            {"weeks": "Minggu 3–6", "title": "Tampilkan keahlian", "text": "Profil dokter spesialis, lalu halaman melasma dan bopeng yang menjawab pertanyaan pasien.", "decision": "tunjuk satu dokter untuk meninjau isi halaman"},
            {"weeks": "Minggu 5–8", "title": "Jaga arus ulasan", "text": "Kirim pesan ulasan ke semua pasien dan balas setiap ulasan.", "decision": ""},
        ],
        "recheck": "ChatGPT dan Google perlu waktu untuk membaca halaman baru. Setelah perubahan berjalan sekitar delapan minggu, audit ulang dengan sepuluh pertanyaan yang sama supaya hasilnya bisa dibandingkan langsung dengan laporan ini. Perbedaan hasil nanti dicatat; pengaruh perbaikan tidak bisa dipastikan dari perbandingan itu saja.",
    },
    "extras_lede": "Tiga bahan untuk tim Anda: pemeriksaan teknis untuk vendor web, teks yang tinggal disalin, dan Lembar Kerja untuk mencatat progres.",
    "webcheck_sub": "5 pemeriksaan pada 5 halaman Ultima · 1 gagal, 1 sebagian, 1 tidak cocok",
    "webcheck": [
        {"row": "robots.txt untuk Googlebot dan Bingbot", "result": "lulus", "detail": "Keduanya boleh membaca semua halaman yang diperiksa."},
        {"row": "robots.txt untuk OAI-SearchBot, pembaca pencarian ChatGPT", "result": "gagal",
         "detail": "Baris <code>User-agent: OAI-SearchBot</code> diikuti <code>Disallow: /layanan/</code>. Halaman pico, melasma, bopeng, dan HIFU ada di bawah /layanan/.",
         "fix": "Hapus baris Disallow: /layanan/ untuk OAI-SearchBot. Menurut panduan OpenAI, ringkasan dan cuplikan di pencarian ChatGPT memerlukan pembaca ini diizinkan."},
        {"row": "Harga, dokter, alamat, dan jam buka sebagai teks", "result": "sebagian",
         "detail": "Alamat dan jam buka terdeteksi sebagai teks. Harga tidak terdeteksi di halaman melasma dan bopeng; harganya ada di dalam gambar. Nama dokter tidak terdeteksi di halaman perawatan.",
         "fix": "Tulis harga dan nama dokter sebagai teks di halaman. Panduan Google: isi penting sebaiknya berupa teks."},
        {"row": "Label data terstruktur dibanding teks halaman", "result": "tidakcocok",
         "detail": "Label MedicalClinic di beranda menulis alamat Jl. Kemang Raya. Teks beranda menulis Jl. Senopati.",
         "fix": "Samakan alamat di label dengan teks halaman. Panduan Google: data terstruktur harus sesuai dengan teks yang terlihat."},
        {"row": "Pembaca biasa ditolak", "result": "lulus", "detail": "Kelima halaman terbuka normal dengan cara baca biasa."},
        {"row": "noindex", "result": "f3", "detail": "Tidak ada tanda noindex di kelima halaman. Baris ini tampil bila keputusan F-3 menambahkannya ke pedoman."},
        {"row": "Sitemap", "result": "f3", "detail": "sitemap.xml ada, tetapi 38 alamat di dalamnya tidak bisa dibuka. Baris ini tampil bila F-3 disetujui."},
        {"row": "Teks yang baru muncul setelah kode berjalan", "result": "f3", "detail": "Sebagian besar teks halaman perawatan baru muncul setelah kode di browser berjalan. Baris ini tampil bila F-3 disetujui."},
    ],
    "webcheck_note": "Bagikan bagian ini ke vendor web sebagai halaman PDF atau teks salinan, bukan dengan meneruskan link laporan. Pemeriksaan memakai cara baca biasa dan tidak berpura-pura menjadi pembaca AI.",
    "kit_sub": "Teks yang tinggal disalin. Dua teks untuk dipublikasikan menunggu tinjauan hukum.",
    "kit": [
        {"title": "Email permintaan koreksi ke direktoriklinik.example", "for": "Untuk admin atau tim marketing. Isi nama pengirim, lalu kirim dari email klinik.",
         "text": "Subjek: Permintaan pembaruan data Ultima Clinic\n\nHalo tim direktoriklinik,\n\nKami dari Ultima Clinic. Halaman profil kami di situs Anda masih mencantumkan cabang Kemang dan tahun berdiri 2009. Data yang berlaku:\n- Cabang: Senopati, Kelapa Gading, PIK, Puri Indah, dan BSD City. Cabang Kemang pindah ke Senopati pada 2023.\n- Berdiri sejak 2012.\n\nSumber resmi: ultimaclinic.example/tentang dan ultimaclinic.example/cabang\n\nMohon bantuannya memperbarui halaman tersebut. Terima kasih.\n\n[Nama]\nUltima Clinic"},
        {"title": "Email permintaan penurunan promo lama ke promokecantikan.example", "for": "Untuk admin atau tim marketing.",
         "text": "Subjek: Permintaan penurunan promo Ultima Clinic yang sudah berakhir\n\nHalo tim promokecantikan,\n\nListing promo diskon 70% atas nama Ultima Clinic di situs Anda berasal dari 2022 dan sudah tidak berlaku. Mohon listing tersebut diturunkan, atau diberi keterangan bahwa promo telah berakhir. Promo yang berlaku dapat dilihat di ultimaclinic.example/promo.\n\nTerima kasih.\n\n[Nama]\nUltima Clinic"},
        {"title": "Pesan WhatsApp untuk meminta ulasan", "for": "Kirim ke semua pasien setelah kunjungan, bukan hanya yang puas. Jangan menawarkan hadiah.",
         "text": "Terima kasih sudah berkunjung ke Ultima Clinic hari ini. Kalau berkenan, ceritakan pengalaman Anda lewat ulasan Google di tautan ini: [tautan ulasan cabang]. Semua masukan membantu kami memperbaiki layanan. Memberi ulasan tidak wajib dan tidak memengaruhi layanan yang Anda terima."},
        {"title": "Teks halaman Fakta Resmi", "locked": True,
         "text": "Tersedia setelah teks resmi Permenkes 1787/2010 dibaca dan tinjauan hukum selesai (keputusan F-7)."},
        {"title": "Kerangka halaman melasma", "locked": True,
         "text": "Tersedia setelah tinjauan hukum (keputusan F-7). Isinya kelak: siapa yang cocok, proses, jumlah sesi, kisaran harga, risiko, dan dokter yang menangani, untuk ditinjau dokter Ultima."},
    ],
    "worksheet": {
        "title": "Lembar Kerja Ultima Clinic",
        "text": "Satu file Excel yang juga bisa dibuka di Google Sheets. Isinya sama dengan laporan ini, ditambah kolom untuk penanggung jawab, tanggal target, dan status. Progres terhitung sendiri setiap kali status diubah.",
        "tabs": ["Panduan", "Ringkasan", "Rencana Kerja", "Pertanyaan & Hasil", "Pesaing", "Cek Fakta", "Website", "Situs AI", "Bahan Siap Pakai", "Titik Awal"],
    },
    "answers_lede": "Bukti di balik laporan ini. Ketuk pertanyaan untuk membaca jawaban lengkap ChatGPT dan Google AI Overview.",
    "answer_notes": ["Jawaban AI dapat berubah menurut waktu, model, akun, dan lokasi.", "Pertanyaan diajukan dari Indonesia; Google dari Jakarta.", "Disebut belum tentu direkomendasikan."],
    "method": [
        "Sepuluh pertanyaan diambil dari data pencarian Google di Indonesia dan tidak menyebut nama Ultima.",
        "Setiap pertanyaan ditanyakan sekali ke aplikasi ChatGPT, dari Indonesia, dan ke Google, dari Jakarta, pada 6 November 2026.",
        "Kartu ChatGPT menghitung dari 10 jawaban. Kartu Google menghitung dari ringkasan AI yang benar-benar tampil: 7 dari 10 pertanyaan.",
        "Disebut: nama Ultima ada di jawaban. Direkomendasikan: jawaban menyarankan Ultima untuk kebutuhan yang ditanyakan; ini penilaian penulis laporan yang diperiksa kode. Situs dikutip: halaman Ultima dipakai sebagai sumber, tetapi namanya tidak disebut.",
        "Hitungan nama pesaing dan situs yang dikutip dibuat oleh kode dari jawaban yang tersimpan, bukan oleh penulis laporan.",
        "Seberapa stabil: tiga pertanyaan ditanyakan dua kali lagi pada hari yang sama. Hasilnya tidak mengubah hitungan di kartu.",
        "Cek fakta membandingkan kalimat AI dengan situs Ultima dan data yang Anda konfirmasi. Nuave tidak menilai klaim keamanan, izin, atau mutu layanan.",
        "Sepuluh pertanyaan tidak mewakili semua pertanyaan calon pasien, dan laporan ini tidak membuktikan mengapa AI menjawab seperti ini.",
    ],
}
