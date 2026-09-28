# Smart intake summary

After `Periksa`, Nuave reads the business's source on a labelled reading
screen, in synthetic mode through a labelled substitute. It then asks
"Ini brand yang ingin Anda audit?" with the typed name, the discovered name
when different, and the website; `Lanjut` confirms the brand and opens
"Ini yang Nuave pahami.", a summary the owner corrects row by row: category
and offerings, audit focus, service channel, and market reach. One
confirmation, `Sudah sesuai — buat pertanyaan audit`, freezes the context and
creates the audit questions.

## Sub-features

- `reading-screen`: `Periksa` opens "Sebentar, Nuave sedang membaca" with the
  labelled synthetic-mode note while the identity and extract requests run.
- `brand-confirm`: the brand check shows the business name and source with
  `Kembali` and `Lanjut`; `Lanjut` opens the summary.
- `summary-row-edit`: `Ubah` on "Kategori dan penawaran utama" edits the
  category and adds an offering.
- `summary-channel-reach`: the checkbox `Di lokasi bisnis Anda` and the
  button `Seluruh Indonesia`.
- `summary-focus`: "Fokus audit" choices are `Brand secara keseluruhan`,
  `Satu lokasi`, and `Satu produk atau layanan`.
- `summary-confirm`: `Sudah sesuai — buat pertanyaan audit` freezes the
  context and makes exactly one question request.

## How to get to it (user POV)

- From the audit entry, fill `Nama bisnis` and `URL website publik`, then
  press `Periksa`; confirm the brand with `Lanjut`.
- From the brand check, press `Kembali` to return to the filled entry.
- From question review, press `Kembali ke informasi bisnis`. The e2e suite
  covers this; this skill does not drive it.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive smart-intake-summary`. Steps, in order:

- **Entry.** Fills `Kedai Fiksi` and `https://kedai-fiksi.example/`. Evidence:
  `01-entry-filled`.
- **Reading and brand check.** Presses `Periksa`. The reading screen
  `[data-intake-screen="reading"]` shows "Sebentar, Nuave sedang membaca" with
  the synthetic-mode label, then the brand check
  `[data-intake-screen="brand"]` shows "Ini brand yang ingin Anda audit?" with
  the name, the source, `Kembali` and `Lanjut`. A short same-origin delay on
  the extract request keeps the reading screen observable; the response is
  the real route answer. Evidence: `02-reading`.
- **Summary.** Presses `Lanjut`. The heading "Ini yang Nuave pahami." shows.
  Evidence: `03-brand-confirm-to-summary`.
- **Row edits.** In the section `Kategori dan penawaran utama`, presses
  `Ubah`, sets `Kategori` to `kedai kopi`, and adds `kopi susu` through
  `Penawaran lain` + Enter. Then checks `Di lokasi bisnis Anda` and presses
  `Seluruh Indonesia`. Evidence: `04-summary-rows-edited`.
- **Focus.** Presses `Satu produk atau layanan`, then types `kopi susu` into
  `Nama lain bila tidak ada dalam pilihan`. Evidence: `05-focus-one-offering`.
- **Confirm.** Presses `Sudah sesuai — buat pertanyaan audit`. The heading
  "Periksa pertanyaan audit" and ten `[data-question-slot]` show. Evidence:
  `06-questions-created`.
- **Proof.** The frozen context in `sessionStorage` `nuave.localIntake.v4`
  has category `kedai kopi` (origin `owner`), focus
  `{kind: "produk", name: "kopi susu"}`, and reach `seluruh`.
  `network.json.apiCalls` is exactly one `GET /api/audit/identity`, one
  `POST /api/audit/extract` and one `POST /api/audit/glm-questions`.

## Gotchas

- The reading screen is transient: `verify-nuave` adds a short same-origin
  delay on the extract request so it can be observed. Do not treat the delay
  as product behavior.
- The synthetic reading proposes no offerings, so `Satu produk atau layanan`
  shows no product radios. The only focus path is the
  `Nama lain bila tidak ada dalam pilihan` textbox. With a live reading, radios
  appear.
- Until category, offering, channel and reach are filled, the button reads
  `Lengkapi yang perlu dipastikan`, not `Sudah sesuai — buat pertanyaan audit`.
- The other rich-reading variants (named competitors, corrections) need a
  stubbed extract response. They are covered by
  `tests/e2e/new-intake-journey.spec.ts`, not by this drive. The labelled J3
  rich preparation has its own drive: `rich-preparation`.
- Returning to the entry and pressing `Periksa` with only the name changed
  skips the read entirely — it reuses the stored preparation and lands on the
  brand check. The e2e suite covers the name-only and website-change paths.
