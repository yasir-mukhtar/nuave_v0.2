# Smart intake summary

After `Cek klinik saya di AI`, a free check (J02) looks the website up and
shows "Kami menemukan klinik Anda" (J05) with the name it read. `Ya, ini
bisnis saya` leads through "Tinggal 3 langkah" (J06) to checkout (J07). After
the simulated payment the paid reading (J09) starts by itself, and the Step 2
cover "Ceritakan klinik Anda" (J10) opens the intake with `Mulai`: the focus
"Apa yang ingin Anda audit?" (whole brand, marked `Saran Nuave`, one branch or
one product), category, offerings, target customer, what customers need and
compare (one screen), service, market (skipped for a branch), competitors and
the differentiator with its folded public fact. The Step 3 cover "Periksa,
lalu jalankan audit" (J24) opens the review "Ini profil klinik yang akan Nuave pakai"
(J25), whose three sections each open an edit sheet. One tick and
`Buat pertanyaan audit` freeze the context and create the ten questions.

## Sub-features

- `free-check`: `Cek klinik saya di AI` shows "Sebentar, kami cari bisnis
  Anda" with the synthetic-mode label while `GET /api/audit/identity` runs.
  A slow check offers a way out (J04); the e2e suite covers it.
- `business-found`: "Kami menemukan klinik Anda" shows the name read from the
  website, the address, `Ubah nama`, `Ganti tautan`, `Kembali` and
  `Ya, ini klinik saya`. Nothing is ordered yet.
- `steps-and-checkout`: "Tinggal 3 langkah" names the price
  (Rp99.000 untuk satu audit); `Lanjut ke pembayaran` opens checkout, where
  the shared `confirmBrand` step types the test email and presses
  `Bayar Rp99.000`.
- `paid-reading`: after payment, "Nuave sedang membaca website Anda" runs once
  by itself (no button), with "Pembayaran diterima · NV-…", then the Step 2
  cover shows.
- `focus-screen`: the whole-brand pick carries `Saran Nuave`; `Satu cabang`
  names an example ("misalnya …") only when the reading found published
  branches. One tap on `Satu cabang` or `Satu layanan` opens its list.
- `product-target`: "Layanan mana?" lists prepared products or takes one
  through `Tambah layanan` (`Nama layanan`, `Simpan`).
- `category-screen`: suggestions are single-choice chips (`Pilihan kategori`);
  `Lainnya` opens `Kategori lain`. `Lanjut` stays blocked until one is picked.
- `offerings-screen`: prepared offerings are chips; the always-open
  `Layanan lain` field adds one with Enter. Under a product focus
  the list is read-only context.
- `target-customer`: optional `Jenis pasien` chips, prepared ones marked
  `Saran Nuave`; `Tambah lainnya` adds a phrase. `Lanjut` is never blocked.
- `customer-needs`: one optional screen with two chip groups, `Mereka butuh…`
  and `Mereka membandingkan…`. `Lainnya (kebutuhan)` and
  `Lainnya (pertimbangan)` open adders with `Tambah`; refused drafts stay for
  correction.
- `service-screen`: four multi-select tiles (`Datang ke klinik`, `Produk dikirim`,
  `Kunjungan ke rumah`, `Konsultasi online`); `Lanjut` stays blocked until one is on.
- `market-screen`: four reach tiles. `Satu area` needs one area,
  `Beberapa area` one to eight; a ninth is refused, never cut. A branch focus
  never shows this screen.
- `competitors`: checkbox rows, prepared ones marked `Saran Nuave`;
  `Tambah pembanding` adds up to five names and refuses a sixth. "Belum tahu?
  Lewati, kami bandingkan dengan bisnis sejenis." stores "not sure".
- `differentiator`: optional `Pembeda klinik`; the fold "Ada info yang sering
  salah ditulis AI?" holds the optional public fact (`Info yang benar`),
  checked by the same sensitive-text stop as other owner text.
- `review-sheets`: `Ubah Klinik`, `Ubah Calon pasien` and
  `Ubah Pembanding` open sheets. `Simpan` keeps the edits; `Batal` and Escape
  drop them. The Bisnis sheet also offers `Ubah nama` (brand check),
  `Ganti website` (entry), `Ganti fokus audit` (focus screen, whose chain
  returns to the review) and `Tambah nama lain` (aliases).
- `summary-confirm`: `Buat pertanyaan audit` stays disabled until the box
  "Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam
  pertanyaan audit." is ticked, then makes exactly one question request.
  While a required answer is missing the button reads
  `Lengkapi yang perlu dipastikan` and opens the owning screen.

## How to get to it (user POV)

- From the audit entry, type the website and press `Cek klinik saya di AI`;
  press `Ya, ini klinik saya`, `Lanjut ke pembayaran`, type an email and press
  `Bayar Rp99.000`; after the paid reading press `Mulai` and walk the Step 2
  screens with `Lanjut`.
- From the business found, `Kembali` returns to the entry with the website
  kept.
- From the ten questions, the bottom bar's `Kembali` returns to the review.
  The e2e suite covers this; this skill does not drive it.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive smart-intake-summary`. Steps, in order:

- **Entry.** Opens `/audit` and fills `https://kedai-fiksi.example/`. The
  synthetic-mode label shows. Evidence: `01-entry-filled`.
- **Free check to business found.** Presses `Cek klinik saya di AI`. The free
  check `[data-intake-screen="reading"]` shows "Sebentar, kami cari bisnis
  Anda", then `[data-intake-screen="brand"]` shows "Kami menemukan bisnis
  Anda" with `Kedai Fiksi`, `kedai-fiksi.example`, `Kembali` and
  `Ya, ini klinik saya`. An 800 ms same-origin delay on the identity request
  keeps the free check visible; the answer is the real route answer.
  Evidence: `02-free-check-to-business-found`.
- **Steps, payment, paid reading, focus.** `Ya, ini klinik saya` → "Tinggal 3
  langkah" → `Lanjut ke pembayaran` → checkout → email and `Bayar Rp99.000`.
  The paid reading runs by itself, the cover "Ceritakan klinik Anda" shows,
  and `Mulai` opens the focus screen: `Saran Nuave` on whole brand, and a
  `Satu cabang` card that names no example (the synthetic reading publishes
  no branches). Evidence: `03-steps-payment-reading-to-focus`.
- **Detail screens.** `Lanjut` on whole brand opens the category screen. The
  synthetic reading found nothing, so each gated screen takes the smallest
  owner answer: `kedai kopi` through `Lainnya` → `Kategori lain` + Enter,
  `kopi susu` through `Layanan lain` + Enter, the
  `Datang ke klinik` tile and the `Seluruh Indonesia` tile. Target customer,
  needs and considerations, competitors and the differentiator stay empty on
  `Lanjut`. The Step 3 cover's `Mulai` opens the review. Evidence:
  `04-detail-screens`.
- **Optional answers stay empty.** The stored selection has empty aliases,
  target customer, needs, considerations, differentiator and public fact, and
  competitor mode `unknown` with no names.
- **Product focus.** `Ubah Klinik` → `Ganti fokus audit` re-opens the focus
  screen; `Satu layanan` opens "Layanan mana?"; `Tambah layanan` adds
  `kopi susu`; `Lanjut` passes the category checkpoint, whose `Lanjut`
  returns to the review with `Fokus audit` reading `Satu layanan: kopi susu`.
  Evidence: `05-focus-one-offering`.
- **Confirm.** Checks that `Buat pertanyaan audit` is disabled, ticks the
  confirmation and presses it. "10 pertanyaan untuk AI" and ten
  `[data-question-slot]` show. Evidence: `06-questions-created`.
- **Proof.** The frozen context in `localStorage` `nuave.localIntake.v9` has
  category `kedai kopi` (origin `owner`), focus
  `{kind: "produk", name: "kopi susu"}`, reach `seluruh`, competitors
  `{mode: "unknown"}` (origin `nuave`), and no target customer, needs,
  considerations, differentiator or public fact. `network.json.apiCalls` has
  exactly one `GET /api/audit/identity`, one `POST /api/orders`, one
  `POST /api/payments/start` (the simulated payment), one
  `POST /api/audit/extract` and one `POST /api/audit/glm-questions` (the free
  `POST /api/orders/status` checks are not counted).

## Gotchas

- The free check and the paid reading are short: the drive adds a small
  same-origin delay so they can be seen. Do not treat the delay as product
  behavior.
- The synthetic reading proposes no products and no branches, so "Produk
  mana?" starts empty and the owner adds the target through `Tambah layanan`.
  With a live reading, rows appear.
- Under a product focus the offerings screen is read-only context, so the
  owner-filled offerings pass runs before the focus switch in this drive.
- A branch focus never shows the market screen: service goes straight to
  competitors.
- The paid reading starts by itself after payment. A reading cut off by a
  reload is not restarted by itself; it waits for `Lanjut` (covered by
  `tests/e2e/payment-screens.spec.ts`).
- The way out of a slow free check (J04), `Kembali` during the check, and a
  check cut off by a reload are covered by `tests/e2e/smart-intake.spec.ts`,
  not by this drive.
- The other rich-reading variants (named competitors, corrections) need a
  stubbed extract response. They are covered by
  `tests/e2e/new-intake-journey.spec.ts`. The labelled rich preparation has
  its own drive: `rich-preparation`.
- After payment the name and website are locked for the order: the Bisnis
  sheet shows "Nama dan website sudah terkunci untuk pesanan ini." instead of
  `Ubah nama` and `Ganti website`. The name-only and website-change paths
  need an order no payment has locked (the founder test pass), so the e2e
  suite covers them, not this drive.
