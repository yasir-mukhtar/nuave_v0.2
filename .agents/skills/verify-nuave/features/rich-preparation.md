# Rich preparation

J3 (Spec 013 R-29) adds one clearly labelled rich fictional preparation:
`RICH_PREPARATION_DRAFT` in `tests/e2e/journey.ts`, served to the page through
stubbed identity and extract routes. Every prepared field is filled —
including the J3 additions: up to eight business-published locations, up to
three whole-brand category suggestions, and one category suggestion per
offering. The drive proves the prepared values reach the session, keep their
provenance, and survive a reload — it never claims anything about live
extraction quality. The default synthetic preparation
("no facts extracted") is unchanged and stays on `smart-intake-summary`.

## Sub-features

- `rich-reading`: the stubbed draft drives `Periksa` → brand check → summary
  with no typed input beyond the entry fields.
- `prepared-values`: the v4 session's `prepared` carries both published
  locations with origin `website`, the whole-brand suggestions and the
  per-offering suggestions with origin `nuave` — `Saran Nuave`, never
  `Dari website Anda`.
- `reload-persistence`: a reload restores the identical prepared state.
- `downstream-unchanged`: the summary confirms with no edits and produces ten
  questions with exactly one identity, one extract and one question request.

## How to get to it (user POV)

- From the audit entry, fill `Nama bisnis` and `URL website publik`, then
  press `Periksa` and `Lanjut` — the same path as
  [smart-intake-summary](./smart-intake-summary.md), with the fixture
  standing in for the extraction answer.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive rich-preparation` (it is part of `drive all`). Steps, in order:

- **Entry.** Fills `Kedai Fiksi` and `https://kedai-fiksi.example/`.
  Evidence: `01-entry-filled`.
- **Rich reading.** The stubbed routes serve the fixture; the drive passes
  the brand check and lands on "Ini yang Nuave pahami.". Evidence:
  `02-rich-reading-to-summary`.
- **Prepared proof.** `sessionStorage` `nuave.localIntake.v4` `prepared` is
  asserted equal to the expected locations and suggestion lists with their
  origins.
- **Reload.** Refreshes; the summary shows again and the stored `prepared`
  is identical. Evidence: `03-summary-after-reload`.
- **Questions.** `Sudah sesuai — buat pertanyaan audit` works with no edits;
  ten `[data-question-slot]` show. `network.json.apiCalls` is exactly one
  `GET /api/audit/identity`, one `POST /api/audit/extract` and one
  `POST /api/audit/glm-questions`. Evidence: `04-questions-created`.

## Gotchas

- The fixture is the only source of the rich values — both routes are
  stubbed, so this drive proves UI/state handling, not extraction quality.
  Report it as such.
- `RICH_PREPARATION_DRAFT` keeps offering spellings (`kopi susu`, `roti`)
  that other journeys select by name; changing them breaks downstream
  drives.
- A stale v3 session or a v4 record missing the J3 lists restarts at entry —
  the parser never mixes old and new shapes.
