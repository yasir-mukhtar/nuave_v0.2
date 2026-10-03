# Rich preparation

J3 (Spec 013 R-29) adds one clearly labelled rich fictional preparation:
`RICH_PREPARATION_DRAFT` in `tests/e2e/journey.ts`, served to the page
through stubbed identity and extract routes. Every prepared field is filled
— including the J3 additions: up to eight business-published locations, up
to three whole-brand category suggestions, and one category suggestion per
offering — and the JQ retained customer meanings: target customer, buyer
considerations, and differentiator. The drive proves the prepared values
reach the session, keep their
provenance, and survive a reload; it also exercises the optional J6 customer
needs, named competitor, and public fact screens, and edits the three JQ
meanings to owner answers. It never claims anything
about live extraction quality. The default synthetic preparation
("no facts extracted") is unchanged and stays on `smart-intake-summary`.

## Sub-features

- `rich-reading`: the stubbed draft drives `Periksa` → brand check → focus
  screen with no typed input beyond the entry fields.
- `location-target`: the focus screen offers `Satu lokasi` because the
  fixture publishes two locations on the canonical host; the location
  screen lists them labelled `Dari website Anda` and a pick continues to
  the detail screens.
- `prepared-values`: the v9 session's `prepared` carries both published
  locations with origin `website`, the whole-brand suggestions, the
  per-offering suggestions, and the three JQ meanings (target customer,
  buyer considerations, differentiator) with origin `nuave` — `Saran Nuave`,
  never `Dari website Anda`.
- `detail-screens`: category and offerings show their prepared picks and
  need no typing; the JQ screens show their prepared meanings labelled
  `Saran Nuave` and take the owner edits (`keluarga sekitar`, `jam buka`,
  `Pilihan roti rumahan fiktif`); the service screen's prepared channels
  stay selected; the
  prepared customer need keeps its provenance; the prepared competitor
  defaults to named mode; the public fact stays optional; a location focus
  skips the market screen.
- `reload-persistence`: a reload restores the identical prepared state.
- `downstream-unchanged`: JQ and J6 owner answers and edited `Nama lain`
  aliases freeze with exact values and origins; confirming
  produces ten questions with exactly one identity, one extract and one
  question request.

## How to get to it (user POV)

- From the audit entry, fill `Nama bisnis` and `URL website publik`, then
  press `Periksa` and `Lanjut` — the same path as
  [smart-intake-summary](./smart-intake-summary.md), with the fixture
  standing in for the extraction answer. On the focus screen pick
  `Satu lokasi`, press `Lanjut`, pick one published row, then press
  `Lanjut` through category, offerings, target customer, customer needs and
  buyer considerations to service, then
  through competitors, differentiator and public fact; the market screen is skipped.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive rich-preparation` (it is part of `drive all`). Steps, in
order:

- **Entry.** Fills `Kedai Fiksi` and `https://kedai-fiksi.example/`.
  Evidence: `01-entry-filled`.
- **Rich reading to location.** The stubbed routes serve the fixture; the
  drive passes the brand check, picks `Satu lokasi` on the focus screen,
  sees both published rows labelled `Dari website Anda`, and picks
  `Kedai Fiksi Dago`. It then presses `Lanjut` through category and offerings
  (prepared picks), sees the prepared target customer labelled `Saran Nuave`
  and edits it to `keluarga sekitar`, toggles the prepared customer need off
  and back on and adds one owner need, sees the prepared consideration
  `lokasi` selected, deselects it and adds `jam buka`, continues through
  service (prepared picks), keeps the
  prepared named competitor and adds a second, sees the prepared
  differentiator labelled `Saran Nuave` and edits it to
  `Pilihan roti rumahan fiktif`, then adds an optional public
  fact before landing on "Ini yang akan Nuave audit" — a location focus audits
  no market, so the market screen never appears. Evidence:
  `02-rich-reading-to-location`.
- **Prepared proof.** `sessionStorage` `nuave.localIntake.v9` `prepared` is
  asserted equal to the expected locations, suggestion lists and JQ meanings
  with their origins.
- **Reload.** Refreshes; the review shows again and the stored `prepared`
  is identical. Evidence: `03-summary-after-reload`.
- **Alias edit.** The `Nama lain` row shows the prepared
  `Kedai Fiksi Bandung` alias labelled `Dari website Anda`; the editor adds
  `Kedai Fiksi Pusat`, flipping the row to `Dari Anda`. Evidence:
  `04-alias-edit`.
- **Questions.** `Sudah sesuai — buat pertanyaan audit` works with no
  further review edits; ten `[data-question-slot]` show, and the frozen
  context's `identity.aliases` equals the edited
  `["Kedai Fiksi Bandung", "Kedai Fiksi Pusat"]`. The three JQ meanings
  freeze as the owner edits with origin `owner`.
  `network.json.apiCalls` is
  exactly one `GET /api/audit/identity`, one `POST /api/audit/extract` and
  one `POST /api/audit/glm-questions`. Evidence: `05-questions-created`.

## Gotchas

- The fixture is the only source of the rich values — both routes are
  stubbed, so this drive proves UI/state handling, not extraction quality.
  Report it as such.
- The fixture's `published_locations` keep `source_url`s on the canonical
  `kedai-fiksi.example` host; moving them off it trips the J4 source-host
  gate and the `Satu lokasi` card disappears (the e2e suite covers that
  boundary).
- `RICH_PREPARATION_DRAFT` keeps offering spellings (`kopi susu`, `roti`)
  that other journeys select by name; changing them breaks downstream
  drives.
- A stale pre-v9 session restarts at entry — the parser never mixes old and
  new shapes.
