# Nuave audit journey verification map

This directory is the maintained source for verifying Nuave's user-facing audit
journey (the v2 mobile journey, Figma J01–J35). Read this index before driving,
then use the matching feature file as the recipe. `V` below means
`.agents/skills/verify-nuave/bin/verify-nuave`.

## Baseline preconditions

- `npm ci` has run in this checkout.
- `$V launch` started the server from this checkout. Nothing else is driven.
- `$V doctor` prints `doctor: OK`. Use `--allow-dirty` only when you are
  verifying uncommitted work, and say so in the report.
- Mode is synthetic. Every answer, question and report comes from a labelled
  synthetic substitute. Live mode is out of scope for this skill.
- Every drive starts from an empty browser session (a new context). The
  intake progress lives in the browser's `localStorage`
  (`nuave.localIntake.v9`, and `nuave.activeOrder.v1` for the order id; spec
  016 R-29), so a new context is the baseline. The report is not in the browser
  at all: it opens only from the emailed link.
- The fictional business is `Kedai Fiksi` at `https://kedai-fiksi.example/`.
  The customer types only the website; the free check reads the name
  `Kedai Fiksi` from it.

## Driving conventions

- Drive only through `$V drive <feature>`. Its steps come from
  `tests/e2e/journey.ts`, the shared driver the e2e specs also use.
- Use ARIA roles and accessible names, plus the stable `data-*` handles the app
  exposes: `data-intake-screen`, `data-journey-tone`, `data-smart-summary`,
  `data-question-slot`, `data-order-stage`, `data-order-note`,
  `data-saved-report`, `data-direct-ten-report`, `data-answer-body`,
  `data-report-answer`. Never use coordinates.
- UI text is Indonesian. Copy names exactly, including the ellipsis in
  `Mereka butuh…` and the middle dot in `Pembayaran diterima · NV-…`.
- Edit sheets (`Ubah Bisnis`, `Tambah produk`, `Ubah pertanyaan 1`, the start
  sheet) are dialogs. While one is open the page behind it is hidden from
  role queries, so look for controls inside the sheet.
- Screens slide in and out. A step waits for the next screen's heading
  before it acts, never for a fixed time.
- A new step goes into `tests/e2e/journey.ts` first, then into the recipe in
  `src/features.ts`.

## Proof and skip reporting

- A drive's proof is its `result.json` plus a screenshot and an ARIA snapshot
  after every user action, and `network.json`.
- `result.json.checks` lists the end states the recipe asserted; a drive that
  throws is `failed`, never partially passed.
- Every artifact carries the feature ID (its folder) and the drive-time
  `HEAD` and dirty flag.
- The network log must show zero unexpected external requests.
- An entry point that is not driven is reported as not driven. Do not report
  it as verified through another path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the
user-visible behavior. It then uses exactly four H2 sections in this order:

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-nuave` starts with `Preconditions:` and pairs each
   user action with the exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a run.

## Features

- [Audit entry](./audit-entry.md) covers the `/audit` website step (J01), its
  validation, the landing form that hands its website to `/audit`, and
  `Ganti tautan bisnis` on the business found.
- [Smart intake summary](./smart-intake-summary.md) covers the free check
  (J02), the business found (J05), the three steps and checkout, the paid
  reading, the Step 2 screens (focus, category, offerings, target customer,
  customer needs and considerations, service, market, competitors,
  differentiator with its folded public fact), the Step 3 cover, the review
  "Ini profil yang akan Nuave pakai" with its edit sheets, and question
  creation.
- [Rich preparation](./rich-preparation.md) covers the labelled fictional
  preparation: published branches, category suggestions, the prepared
  customer meanings and a named competitor in the session, reload
  persistence, `Nama lain` aliases in the Bisnis sheet, and downstream
  question creation.
- [Question review](./question-review.md) covers "10 pertanyaan untuk AI",
  question edits, and the start sheet (`Jalankan audit`, then
  `Mulai audit sekarang` approves the questions on the server).
- [Audit run](./audit-run.md) covers the whole order path: the free business
  check, the three steps, checkout with its price, simulated payment, the paid
  reading, intake, ten questions, the start sheet, closing the tab, the server
  audit and the report opened from the emailed link.
- [Report link](./report-link.md) covers the saved report page, both
  `Download PDF` buttons, the JSON download and the not-available page.
