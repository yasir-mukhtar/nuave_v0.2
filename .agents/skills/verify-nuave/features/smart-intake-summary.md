# Smart intake summary

After `Periksa`, Nuave reads the business's source on a labelled reading
screen, in synthetic mode through a labelled substitute. It then asks
"Ini brand yang ingin Anda audit?" with the typed name, the discovered name
when different, and the website; `Lanjut` confirms the brand and opens the
focus screen "Apa yang ingin Anda audit?" — whole brand (marked
`Saran Nuave`), one location, or one product/service. A product pick opens
"Produk atau layanan mana?" first. The chain then walks category
("Bisnis Anda biasanya disebut apa?"), offerings ("Apakah ini yang Anda
tawarkan?"), customer needs, service channels ("Bagaimana pelanggan
mendapatkan yang Anda tawarkan?"), market ("Di mana pelanggan Anda berada?",
skipped for a location focus), competitors, and public fact before landing on
"Ini yang Nuave pahami.", a summary whose business-detail rows are
read-back: each `Ubah` re-opens the owning screen. One confirmation,
`Sudah sesuai — buat pertanyaan audit`, freezes the context and creates the
audit questions.

## Sub-features

- `reading-screen`: `Periksa` opens "Sebentar, Nuave sedang membaca" with the
  labelled synthetic-mode note while the identity and extract requests run.
- `brand-confirm`: the brand check shows the business name and source with
  `Kembali` and `Lanjut`; `Lanjut` opens the focus screen.
- `focus-screen`: whole brand carries `Saran Nuave`; the location scope shows
  as a card only when usable published locations exist — otherwise as the
  `Isi lokasi secara manual` link.
- `product-target`: the product screen lists prepared offerings labelled
  `Dari website Anda` or accepts a typed `Nama produk atau layanan` target
  labelled `Dari Anda`; `Lanjut` stays blocked until one exists.
- `category-screen`: prepared suggestions are `Saran Nuave` cards, the
  website's main category is `Dari website Anda`, and `Tulis kategori
sendiri` accepts a manual pick labelled `Dari Anda`; `Lanjut` stays
  blocked until one exists.
- `offerings-screen`: prepared offerings sit in a `Dari website Anda` chip
  group, owner additions form `Dari Anda`, and `Penawaran lain` adds one;
  under a product focus the catalogue is read-only context.
- `service-screen`: the four fixed channel choices are multi-select
  checkboxes; `Lanjut` stays blocked until at least one is picked.
- `market-screen`: four reach cards; `sekitar` needs exactly one area and
  `beberapa` needs one to eight — a ninth area is refused with a visible
  block. A location focus never shows this screen.
- `customer-needs`: optional prepared needs keep their source label; the owner
  can deselect a suggestion or add a need.
- `competitors`: named businesses, no direct competitor, and unknown are
  distinct modes. Prepared names default to named mode; named mode requires
  one to five names and refuses a sixth instead of truncating.
- `public-fact`: optional public context accepts owner text through the
  existing sensitive-text rejection path.
- `summary-row-edit`: `Ubah` on a read-back row opens the owning detail
  screen; `Kembali`, `Lanjut`, or marked browser Back returns to the summary.
- `summary-confirm`: `Sudah sesuai — buat pertanyaan audit` freezes the
  context and makes exactly one question request; while a required meaning
  is missing the button reads `Lengkapi yang perlu dipastikan` and opens the
  first owning screen instead.

## How to get to it (user POV)

- From the audit entry, fill `Nama bisnis` and `URL website publik`, then
  press `Periksa`; confirm the brand with `Lanjut` and walk the detail
  screens.
- From the brand check, press `Kembali` to return to the filled entry.
- From question review, press `Kembali ke informasi bisnis`. The e2e suite
  covers this; this skill does not drive it.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive smart-intake-summary`. Steps, in order:

- **Entry.** Fills `Kedai Fiksi` and `https://kedai-fiksi.example/`.
  Evidence: `01-entry-filled`.
- **Reading and brand check.** Presses `Periksa`. The reading screen
  `[data-intake-screen="reading"]` shows "Sebentar, Nuave sedang membaca"
  with the synthetic-mode label, then the brand check
  `[data-intake-screen="brand"]` shows "Ini brand yang ingin Anda audit?"
  with the name, the source, `Kembali` and `Lanjut`. A short same-origin
  delay on the extract request keeps the reading screen observable; the
  response is the real route answer. Evidence: `02-reading`.
- **Focus.** Presses `Lanjut`. The focus screen shows the three scopes'
  honest labels: `Saran Nuave` on whole brand, no `Satu lokasi` card (the
  synthetic reading publishes no locations) and the `Isi lokasi secara
manual` link. Evidence: `03-brand-confirm-to-focus`.
- **Detail screens.** `Lanjut` on the whole-brand default opens the
  category screen. The synthetic reading found nothing, so each gated
  screen takes the smallest owner answer: `kedai kopi` typed into
  `Kategori`, `kopi susu` added through `Penawaran lain` + Enter, the
  `Di lokasi bisnis Anda` checkbox, and the `Seluruh Indonesia` reach card.
  The three optional J6 screens follow: customer needs remain empty,
  competitor mode remains `Belum tahu`, and public fact remains blank. The
  chain then lands on the summary. Evidence: `04-detail-screens`.
- **Product target.** Presses `Ubah` on the read-back focus row, picks
  `Satu produk atau layanan` on the re-opened focus screen, presses
  `Lanjut`, types `kopi susu` into `Nama produk atau layanan` on the
  product screen, presses `Lanjut` again, and walks the changed-focus
  detour — category checkpoint, then directly back to the summary with the focus row showing
  `Satu produk atau layanan`. Evidence: `05-focus-one-offering`.
- **Confirm.** Presses `Sudah sesuai — buat pertanyaan audit`. The heading
  "Periksa pertanyaan audit" and ten `[data-question-slot]` show. Evidence:
  `06-questions-created`.
- **Proof.** The frozen context in `sessionStorage` `nuave.localIntake.v7`
  has category `kedai kopi` (origin `owner`), focus
  `{kind: "produk", name: "kopi susu"}`, reach `seluruh`, empty optional
  customer needs, unknown competitor mode and a blank public fact.
  `network.json.apiCalls` is exactly one `GET /api/audit/identity`, one
  `POST /api/audit/extract` and one `POST /api/audit/glm-questions`.

## Gotchas

- The reading screen is transient: `verify-nuave` adds a short same-origin
  delay on the extract request so it can be observed. Do not treat the
  delay as product behavior.
- The synthetic reading proposes no offerings and no locations, so the
  product screen shows only the typed-target field and the focus screen
  shows no `Satu lokasi` card. With a live reading, radios appear.
- Under a product focus the offerings screen is read-only catalogue context
  (the product target is the offering), so the owner-filled offerings pass
  runs before the focus switch in this drive.
- A location focus never shows the market screen — customer needs precede
  service, whose `Lanjut` lands on competitors and then public fact before the
  summary.
- Until category, offering, channel and reach are filled, the button reads
  `Lengkapi yang perlu dipastikan`, not `Sudah sesuai — buat pertanyaan
audit`. The forward chain's gates mean the summary only shows it after an
  edit that clears a required answer.
- The other rich-reading variants (named competitors, corrections) need a
  stubbed extract response. They are covered by
  `tests/e2e/new-intake-journey.spec.ts`, not by this drive. The labelled J3
  rich preparation has its own drive: `rich-preparation`.
- Returning to the entry and pressing `Periksa` with only the name changed
  skips the read entirely — it reuses the stored preparation and lands on
  the brand check. The e2e suite covers the name-only and website-change
  paths.
