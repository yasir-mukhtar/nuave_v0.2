# Rich preparation

Spec 013 R-29 adds one clearly labelled rich fictional preparation:
`RICH_PREPARATION_DRAFT` in `tests/e2e/journey.ts`, served to the page through
stubbed identity and extract routes. Every prepared field is filled: two
branches published on the business's own site, whole-brand category
suggestions, one category suggestion per offering, a brand alias, and the
customer meanings (target customer, needs, considerations, a competitor and a
differentiator). The drive proves the prepared values reach the session, keep
their source labels and survive a reload, and that the owner can change them
on the Step 2 screens and in the review's Bisnis sheet. It never claims
anything about live extraction quality. The default synthetic preparation
("no facts extracted") is unchanged and stays on `smart-intake-summary`.

## Sub-features

- `rich-reading`: the stubbed draft drives the free check, the business
  found, checkout, the simulated payment, the paid reading and the Step 2
  cover with no typing beyond the website and the email.
- `location-target`: `Satu cabang` opens "Cabang mana?", which lists both
  published branches and says once that they were "Ditemukan di website". A
  pick continues to the detail screens.
- `prepared-values`: the v9 session's `prepared` carries both published
  locations with origin `website`, and the whole-brand suggestions, the
  per-offering suggestions, the target customer, the considerations and the
  differentiator with origin `nuave` (shown as `Saran Nuave`).
- `detail-screens`: category, offerings and service keep their prepared
  picks and need no typing; the target customer, needs and considerations,
  competitor and differentiator show their prepared values marked
  `Saran Nuave` and take the owner's edits; the public fact stays optional; a
  branch focus skips the market screen.
- `reload-persistence`: a reload on the review restores the identical
  prepared state.
- `alias-edit`: the review's `Nama` shows "Juga disebut: Kedai Fiksi Bandung";
  the Bisnis sheet adds a second name with `Tambah nama lain` and saves it
  with `Simpan`.
- `downstream-unchanged`: the owner's answers and the edited aliases freeze
  with exact values and origins; confirming produces ten questions with
  exactly one identity, one order, one simulated payment, one extract and one
  question request.

## How to get to it (user POV)

- From the audit entry, type the website and press `Cek klinik saya di AI`,
  then follow the same path as [smart-intake-summary](./smart-intake-summary.md)
  to the focus screen, with the fixture standing in for the reading. Tap
  `Satu cabang`, pick one published branch, then press `Lanjut` through
  category, offerings, target customer, needs and considerations, service,
  competitors and the differentiator. The market screen is skipped.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive rich-preparation` (it is part of `drive all`). Steps, in
order:

- **Entry.** Opens `/audit` and fills `https://kedai-fiksi.example/`.
  Evidence: `01-entry-filled`.
- **Rich reading to the review.** The stubbed routes serve the fixture. The
  drive confirms `Kedai Fiksi`, pays, waits for the Step 2 cover and presses
  `Mulai`. On the focus screen it taps `Satu cabang`; "Cabang mana?" says
  "Ditemukan di website" and lists `Kedai Fiksi Dago` and
  `Kedai Fiksi Cimahi`; it picks `Kedai Fiksi Dago`. It then presses `Lanjut`
  through category and offerings (prepared picks). On the target customer
  screen the prepared `pekerja kantoran sekitar` chip is on and marked
  `Saran Nuave`; the drive turns it off and adds `keluarga sekitar`. On the
  needs screen it turns the prepared need `minuman dekat kantor` off and on
  again, adds `sarapan sebelum kerja`, turns the prepared consideration
  `lokasi` off and adds `jam buka`. Service keeps its prepared picks. On
  competitors the prepared `Kedai Tetangga` is ticked and described as
  `Saran Nuave`; the drive adds `Warung Fiksi`. The differentiator shows the
  prepared `Racikan kopi rumahan fiktif` marked `Saran Nuave`; the drive
  replaces it with `Pilihan roti rumahan fiktif` and opens "Ada info yang
  sering salah ditulis AI?" to add `Buka setiap hari sampai pukul 21.00.`.
  No market screen shows; the Step 3 cover's `Mulai` opens the review.
  Evidence: `02-rich-reading-to-location`.
- **Prepared proof.** `localStorage` `nuave.localIntake.v9` `prepared` equals
  the expected locations, suggestion lists and customer meanings, with their
  origins.
- **Reload.** Refreshes; the review shows again and the stored `prepared` is
  identical. Evidence: `03-summary-after-reload`.
- **Alias edit.** `Nama` reads "Juga disebut: Kedai Fiksi Bandung".
  `Ubah Klinik` → `Tambah nama lain` → `Nama lain baru` = `Kedai Fiksi Pusat`
  → `Tambah` → `Simpan`. `Nama` then reads "Juga disebut: Kedai Fiksi
  Bandung, Kedai Fiksi Pusat". Evidence: `04-alias-edit`.
- **Questions.** Ticks the confirmation and presses `Buat pertanyaan audit`;
  ten `[data-question-slot]` show. The frozen context has the aliases
  `["Kedai Fiksi Bandung", "Kedai Fiksi Pusat"]`, focus
  `{kind: "cabang", name: "Kedai Fiksi Dago"}`, no market, and the owner's
  target customer, needs, considerations, differentiator, competitors
  (`named`: `Kedai Tetangga`, `Warung Fiksi`) and public fact, each with
  origin `owner`. `network.json.apiCalls` has exactly one
  `GET /api/audit/identity`, one `POST /api/orders`, one
  `POST /api/payments/start`, one `POST /api/audit/extract` and one
  `POST /api/audit/glm-questions` (the free `POST /api/orders/status` checks
  made by a reload are not counted). Evidence: `05-questions-created`.

## Gotchas

- The fixture is the only source of the rich values: both routes are
  stubbed, so this drive proves UI and session handling, not reading quality.
  Report it as such.
- The fixture's `published_locations` keep `source_url`s on the
  `kedai-fiksi.example` host. Moving them off it means no branch is offered:
  "Cabang mana?" then says "Kami belum menemukan cabang di website Anda." (the
  e2e suite covers that boundary).
- `RICH_PREPARATION_DRAFT` keeps offering spellings (`kopi susu`, `roti`) that
  other journeys select by name; changing them breaks downstream drives.
- The simulated payment still marks the local order paid, so the name and
  website are locked afterwards. The alias edit is the only Bisnis-sheet
  change this drive makes.
- A stale pre-v9 session restarts at the entry: the parser never mixes old
  and new shapes.
