# Smart intake summary

After `Periksa`, Nuave reads the business's source, in synthetic mode through a
labelled substitute. It shows "Ini yang Nuave pahami.", a summary the owner
corrects row by row: category and offerings, audit focus, service channel,
and market reach. One confirmation, `Sudah sesuai — buat pertanyaan audit`,
freezes the context and creates the audit questions.

## Sub-features

- `summary-open`: `Periksa` makes one identity request and one extract
  request, then shows the summary.
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
  press `Periksa`.
- From question review, press `Kembali ke informasi bisnis`. The e2e suite
  covers this; this skill does not drive it.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive smart-intake-summary`. Steps, in order:

- **Entry.** Fills `Kedai Fiksi` and `https://kedai-fiksi.example/`. Evidence:
  `01-entry-filled`.
- **Summary.** Presses `Periksa`. The heading "Ini yang Nuave pahami." shows.
  Evidence: `02-summary`.
- **Row edits.** In the section `Kategori dan penawaran utama`, presses
  `Ubah`, sets `Kategori` to `kedai kopi`, and adds `kopi susu` through
  `Penawaran lain` + Enter. Then checks `Di lokasi bisnis Anda` and presses
  `Seluruh Indonesia`. Evidence: `03-summary-rows-edited`.
- **Focus.** Presses `Satu produk atau layanan`, then types `kopi susu` into
  `Nama lain bila tidak ada dalam pilihan`. Evidence: `04-focus-one-offering`.
- **Confirm.** Presses `Sudah sesuai — buat pertanyaan audit`. The heading
  "Periksa pertanyaan audit" and ten `[data-question-slot]` show. Evidence:
  `05-questions-created`.
- **Proof.** The frozen context in `sessionStorage` has category
  `kedai kopi` (origin `owner`), focus `{kind: "produk", name: "kopi susu"}`,
  and reach `seluruh`. `network.json.apiCalls` is exactly one
  `GET /api/audit/identity`, one `POST /api/audit/extract` and one
  `POST /api/audit/glm-questions`.

## Gotchas

- The synthetic reading proposes no offerings, so `Satu produk atau layanan`
  shows no product radios. The only focus path is the
  `Nama lain bila tidak ada dalam pilihan` textbox. With a live reading, radios
  appear.
- Until category, offering, channel and reach are filled, the button reads
  `Lengkapi yang perlu dipastikan`, not `Sudah sesuai — buat pertanyaan audit`.
- The rich-reading variants (prefilled channels, comparators, named
  competitors) need a stubbed extract response. They are covered by
  `tests/e2e/new-intake-journey.spec.ts`, not by this drive.
