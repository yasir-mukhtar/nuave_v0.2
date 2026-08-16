# FAQ - Taste System Preview (draft, konsep accordion list)

Preview desain halaman FAQ Nuave memakai **taste system** (repo taste-system,
`/Users/yasir/Design System/taste-system`) dan **konsep referensi** yang
diberikan founder: halaman putih rata (flat), judul tebal, pertanyaan dalam
kategori, baris accordion dengan chevron, pemisah hairline, tanpa shadow.
Halaman utama `src/app/faq/page.tsx` TIDAK diubah.

## Cara melihat

Server lokal (folder ini):

```bash
python3 -m http.server 8125 --directory /Users/yasir/nuave_v0.2/faq-taste-preview
# lalu buka http://localhost:8125/index.html
```

## Struktur halaman (mengikuti konsep)

- Judul besar tebal (40px / 700) + lede, dipisah hairline.
- 4 grup kategori: **Umum** (6), **Laporan** (3), **Pembayaran dan pesanan**
  (2), **Privasi dan data** (3) = 14 pertanyaan, urutan sama dengan halaman
  live.
- Setiap pertanyaan adalah baris accordion: teks di kiri, chevron di kanan,
  pemisah hairline antar baris. Klik untuk membuka jawaban; satu jawaban
  terbuka dalam satu waktu. Aksesibel: `aria-expanded` + `aria-controls`,
  konten tetap di DOM (tanpa JS tetap terbaca).
- Tipografi hierarki accordion **persis mengikuti FAQ landing page**
  (`src/app/page.tsx:339,357`): pertanyaan **18px/600**, tracking -0.5px,
  line-height 1.7em, warna `#111827`; body jawaban **16px/400**, line-height
  1.6em, warna `#6B7280`; chevron 20px stroke 1.5 warna `#6B7280`.
- Animasi buka/tutup accordion **sama dengan FAQ landing page**: `grid-template-rows`
  `0fr` ke `1fr`, `300ms ease-in-out`, inner `overflow-hidden`, chevron berputar
  180deg dalam 300ms.

## Aturan taste system yang dipegang

| Aturan | Penerapan |
|---|---|
| Elevasi = border | hairline 1px antar baris dan grup; TANPA shadow (kecuali focus ring) |
| Satu warna aksen | link biru `#0077e6`; logo ungu 24x24 tetap sebagai aset brand |
| Token, bukan raw value | semua hex/radius/spacing dari token beku `tokens.css` |
| Type terkompresi | 40/18/16/14/13, weights 400/600/700, negative tracking |
| Semantik = teks merah | placeholder `[HARGA]` dkk. teks merah `#d93036`, bukan fill |
| Restraint | satu CTA sekunder (white + border), tidak ada tombol gelap |

## Perubahan dari preview v1 (dokumen mengambang)

v1 memakai pola "dokumen putih mengambang di atas canvas". Konsep baru ini
menggantinya dengan **halaman putih rata** + baris accordion, sesuai referensi
yang diberikan. Konten FAQ tetap 100% identik dengan halaman live (termasuk
placeholder merah yang harus diisi founder).

## Catatan

- Logo Nuave (ungu) dipertahankan sebagai aset brand 24x24; bukan warna UI.
- Preview ini standalone (`index.html` + `styles.css` + `script.js`), belum
  terhubung ke LandingNav/Footer Next.js. Jika desain disetujui, port ke
  `src/app/faq/page.tsx` mengikuti pola `content-pages-pattern.md`.
