# EXP-R1 evidence — Sozo Dental Depok

> Captured: 2026-07-20, Asia/Jakarta
> Use: internal product experiment only
> Surface: OpenAI Codex web-search retrieval

## Subject identity

- Public name: Klinik Gigi Depok - Sozo Dental
- Audited branch: Sozo Dental Depok, Margonda
- Address: Jl. Margonda No.267, RT.1/RW.12, Kemiri Muka, Kecamatan
  Beji, Kota Depok, Jawa Barat 16423
- User-supplied map: https://maps.app.goo.gl/pA8D5VkctMDDbKR6A
- Official branch page: https://www.sozodental.com/lokasi/depok/
- Identity outcome: resolved

The official branch page identifies Sozo Dental Depok at Margonda No.267 and
separately identifies its Cinere branch. Traveloka, a dental directory, and
current insurer-provider lists corroborate the Margonda address.

Sozo is a multi-branch brand. Using it is an explicit internal EXP-R1 exception
to Nuave's current single-location-clinic wedge; every observation and action in
this run applies only to the Margonda branch unless stated otherwise.

## Method and limitation

Five independent questions were submitted through OpenAI Codex web search. The
captured output is a search-grounded retrieval result, not the ChatGPT consumer
interface and not a permanent ranking.

Gemini was subsequently tested through the Gemini Developer API Free Tier using
the five natural-language prompts in [`REPORT.md`](./REPORT.md). Its full
answers are included in that report. This is an API surface, not the Gemini
consumer interface; it is also not a permanent ranking. ChatGPT Free could not
be observed because the available browser environment blocks access to
`chatgpt.com`.

The supplied Google Maps short link was also blocked in the browser environment.
It remains a user-supplied identity source but was not used as the only identity
evidence.

## O1 — Routine dental checkup in Depok

**Question**

> Rekomendasikan beberapa klinik gigi di Depok untuk pemeriksaan gigi rutin.
> Jelaskan alasan setiap pilihan dan sertakan sumber publik yang dapat
> diperiksa.

**Observed retrieval**

The result set surfaced Depok government dental-service information, third-party
recommendation lists, Peri Gigi Depok, Poli Gigi Alkindi, MHDC/Medikids, and
other providers. Sozo Dental did not appear in the returned sources.

**Relevant sources**

- https://dinkes.depok.go.id/User/DetailArtikel/standar-pelayanan-kesehatan-gigi
- https://hellosehat.com/sehat/rumah-sakit/rekomendasi-klinik-gigi-depok/
- https://perigigidepok.com/
- https://mhdc.co.id/artikel-dan-promo/rekomendasi-klinik-gigi-terdekat-di-depok/

**Observation:** Sozo was not retrieved for this unbranded question in this
single run.

## O2 — Family or new-patient clinic in Depok

**Question**

> Saya mencari klinik gigi di Depok untuk keluarga atau pasien baru. Klinik
> mana yang dapat dipertimbangkan berdasarkan informasi publik, dan mengapa?
> Sertakan sumber.

**Observed retrieval**

The result set surfaced MHDC/Medikids, Klinik My Dentist, Maroon Dental House,
Dokter Anggi Dental Clinic, Teman Dental, Natura Dental Center, and other local
providers. Sozo Dental did not appear in the returned sources.

**Relevant sources**

- https://mhdc.co.id/artikel-dan-promo/rekomendasi-klinik-gigi-terdekat-di-depok/
- https://klinikmydentist.com/
- https://dokteranggi.co.id/depok/
- https://www.naturadental.id/

**Observation:** Sozo was not retrieved for this family/new-patient question in
this single run, although its official Depok page uses family-oriented copy.

## O3 — Scaling in Depok

**Question**

> Klinik gigi di Depok mana yang secara publik menyediakan layanan scaling atau
> pembersihan karang gigi? Berikan beberapa contoh dan sumber yang dapat
> diperiksa.

**Observed retrieval**

The result set surfaced Poli Gigi Alkindi, Depok public dental services, Ohana
Dental Care, Peri Gigi Depok, Hen'z Dental, Maroon Dental House, Klinik Gigi
Nirmala, and Teman Dental. Sozo Dental did not appear in the returned sources.

This absence is notable because Sozo's official Depok page and service page both
explicitly list scaling.

**Relevant sources**

- https://www.sozodental.com/lokasi/depok/
- https://www.sozodental.com/layanan/
- https://www.gigiputih.com/
- https://ohanadentalcare.id/
- https://perigigidepok.com/
- https://www.alodokter.com/cari-rumah-sakit/klinik-gigi-nirmala-depok

**Observation:** published service availability did not translate into
retrieval for this unbranded service-intent question in this single run.

## O4 — Jabodetabek user near Depok or Margonda

**Question**

> Untuk pasien Jabodetabek yang beraktivitas di sekitar Depok atau Margonda,
> bandingkan beberapa klinik gigi berdasarkan lokasi, layanan yang
> dipublikasikan, dan kemudahan akses. Sertakan sumber dan keterbatasan.

**Observed retrieval**

The result set surfaced ODAC Corp, SATU Dental Margonda, Damessa Margonda, Sozo
Dental Depok, Teman Dental, MHDC/Medikids, Axel Dental, and With Smile Dental at
Margo City. Sozo appeared through its official Depok page and Traveloka listing.

**Relevant sources**

- https://www.sozodental.com/lokasi/depok/
- https://www.traveloka.com/id-id/activities/indonesia/product/sozo-dental-depok-9041713094739
- https://damessa.id/lokasi/margonda
- https://lokasi.satudental.com/satu-dental-margonda-dental-clinic-beji-depok-474323/Home
- https://axeldental.id/locations/cabang-depok/

**Observation:** Sozo was retrieved when the question explicitly combined the
broader Jabodetabek context with the local Depok/Margonda area.

## O5 — Branded branch accuracy

**Question**

> Apa informasi publik yang dapat diverifikasi tentang Klinik Gigi Depok - Sozo
> Dental di Jl. Margonda No.267, RT.1/RW.12, Kemiri Muka, Beji, Kota Depok?
> Ringkas lokasi, layanan, jam operasional, kontak publik, dan sumber. Jangan
> menebak jika informasi tidak tersedia.

**Observed retrieval**

The official Sozo Depok page was the leading source and confirmed the Margonda
address and a broad set of services. Traveloka, a dental directory, and insurer
provider lists corroborated the branch identity. Third-party sources reported
daily hours of 10:00-21:00 and public phone numbers, but the retrieved official
branch page did not clearly publish those branch facts in its main content.

Third-party sources showed both `0857-9525-4550` and `0853-1284-4487`. This may
represent multiple valid channels or stale data; it is an item to verify, not a
confirmed error.

**Relevant sources**

- https://www.sozodental.com/lokasi/depok/
- https://www.sozodental.com/layanan/
- https://www.traveloka.com/id-id/activities/indonesia/product/sozo-dental-depok-9041713094739
- https://www.dentalclinics.care/dental-clinic/sozo-dental-depok
- https://www.chubb.com/content/dam/chubb-sites/chubb-com/id-id/lei-new-assets/rumah-sakit-rekanan/rumah-sakit-rekanan-pemegang-kartu-admedika-group-juli-2026.pdf

**Observation:** branded identity and services are easy to retrieve, while some
branch-level operating facts depend on third-party sources.

## Evidence summary

| Observation | Sozo retrieved? |
|---|---|
| Routine checkup in Depok | No |
| Family/new-patient clinic in Depok | No |
| Scaling in Depok | No |
| Jabodetabek user near Depok/Margonda | Yes |
| Exact branded branch question | Yes |

This is `0 of 3` retrievals for the narrow unbranded questions and `2 of 2` for
the broader-local and branded questions. These direct counts describe only this
five-question, one-system, one-run sample; they are not visibility percentages.
