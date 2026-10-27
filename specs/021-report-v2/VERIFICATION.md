# Verification: Spec 021 — Report v2

> Result: **Pending** (Parts A, D and P built; Parts C and B to come; not
> Verified until the founder's AC-A7 and AC-D2 checks are recorded)
> Reviewer: independent agent review on each PR (verdict comment on the PR)
> Date: 2026-10-26
> Spec version or commit: `specs/021-report-v2/SPEC.md` at 590a273
> Implementation version or commit: Part A (PR #173), Part D (PR #175),
> Part P (PR #176)

Each PR in [`PLAN.md`](./PLAN.md) adds its results here. The spec is marked
**Verified** after PR 6 and the founder's AC-A7, AC-B4 and AC-D2 checks.

## Part A, layout (PR 2)

### Scope reviewed

- New two-source renderer: `src/app/audit/report/TwoSourceReport.tsx`,
  `report-v2.module.css`, `report-v2-data.ts`,
  `src/components/product/report/MentionDot.tsx` and its CSS, the new tokens
  in `src/styles/tokens.css`.
- Routing: `DirectTenReportPage.tsx` and `DirectTenReportBody.tsx` send
  two-source reports to the new renderer; the old renderer is otherwise
  unchanged. Unused two-source sections removed from `TwoSourceSections.tsx`.
- Support export: `npm run support -- export <order>`
  (`src/lib/orders/support.ts`, `scripts/support.mjs`), sharing
  `savedReportEvidence` with the old reports' JSON button.
- Tests: `two-source-report.test.tsx`, `report-v2-data.test.ts`,
  `support.test.ts`, `tests/e2e/new-intake-glm.spec.ts`, `tests/e2e/journey.ts`,
  and the `verify-nuave` skill.

### Acceptance results

| Criterion | Result  | Evidence                                                                                                                                                                                                  |
| --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-A1     | Pass    | e2e "Spec 012 on the saved report": at 390×844 the verdict and the first card's ten dots are in the first viewport (with the synthetic-test notice above them)                                            |
| AC-A2     | Pass    | unit "AC-A2: each card's headline count equals its dots"; `report-v2-data.test.ts` covers every look, including no AI Overview, cited and failed                                                          |
| AC-A3     | Pass    | unit chip-order test; e2e chip names (Celah Topik is hidden in the synthetic run because its saved topics equal the questions, per A-05)                                                                  |
| AC-A4     | Pass    | unit and e2e: no "Tidak ada data jumlah pencarian", "Unduh bukti JSON", "Tentang audit ini", or the removed recommendation labels; saved topic lines that carry the no-volume phrase are shown without it |
| AC-A5     | Pass    | the pre-Spec 018 snapshot in `two-source-report.test.tsx` passes unchanged                                                                                                                                |
| AC-A6     | Pass    | `npm run check` and `npm run test:unit` pass; all three Playwright suites pass (see Checks run); no sideways scroll at 1920, 1280, 768, 390 and 320 wide and at 200% zoom                                 |
| AC-A7     | Pending | founder reading on the PR preview, then on NV-3WDSAY after deploy                                                                                                                                         |

### Checks run

- `npm run check`: pass (no new lint warnings).
- `npm run test:unit`: 2599 passed. Run with this container's own
  `CHEAPERINFERENCE_API_KEY` unset: `glm-local.test.ts` assumes no key is
  present and fails on the unchanged code when one is.
- `npm run build` and `npm run build:cf`: pass (inside `npm run verify`).
- Playwright, all three configs: 85 + 3 + 11 passed. Run with the
  container's installed browser build through an uncommitted wrapper config,
  because the pinned Playwright expects a browser build this container does
  not ship.

### Findings

- In-page links in the new layout (question references and dots) keep the
  address unchanged, so the link secret after `#` is never replaced.
- Delivered reports show the new layout as soon as it deploys, before the
  founder's NV-3WDSAY reading (presentation only; saved reports unchanged).
- The removed JSON e2e steps checked the customer export's shape (no `brief`,
  no `operational_telemetry`, no observation `telemetry`). Those checks did
  not move to the report-data response, because that route returns the saved
  report as it is (as before this PR). The export's shape stays covered by
  `customer-evidence-export.test.ts`, and `support.test.ts` checks that the
  support export equals the old button's file.

### Independent review

- Round 1: **ALMOST**
  ([comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/173#issuecomment-6419303413)),
  fixed in 09699b4 as listed below.
- Round 2: **PASS**
  ([comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/173#issuecomment-6419792781)).
  Its optional notes: the re-audit card no longer splits across printed
  pages (fixed); chip height and radius, the source cards' heading level,
  and an automated check for the 320px own row are left for Part D, which
  rebuilds this part of the page.

### Review round 1 fixes

- The verdict no longer stops on ";" (a clause stays with its sentence).
- On phones under 480px a competitor's numbers sit under its name, so a long
  clinic name keeps its width at 320px.
- Dots, the check and the recommendation numbers print without the
  browser's "Background graphics" option.
- An answer that only names the clinic no longer counts for a competitor
  whose name sits inside the clinic's ("Natasha" in "Natasha Skin Clinic").
- Every text style uses one whole type role (size, weight, line height,
  tracking).
- Tests added for each of the above that can be unit tested, and for
  ChatGPT's recommended, named and cited looks.
- Smaller: the contents navigation is named "Isi laporan"; "P2" links say
  "P2" to screen readers and are 24px tall; "Simpan laporan ini" is its own
  heading; unused code removed; section titles stay with their content in
  print.

## Part D, answers (PR 3)

### Scope reviewed

- `src/app/audit/report/AnswersTable.tsx`: the Jawaban AI table (header row
  inside, labelled source logos with tooltips, one row per question with a dot
  per source and a "menyebut nama Anda" tag).
- `src/app/audit/report/AnswerPanel.tsx`: the side panel (shadcn `Sheet` from
  the right, full width on a phone; shadcn `Tabs`; chat layout) and the one
  `openAnswer` that rows, summary dots and "P" references use.
- `src/app/audit/report/ReportAppendix.tsx`: every answer in the chat style,
  print only. The stacked on-screen answers (`TwoSourceAnswers`) are removed.
- `src/components/ui/tooltip.tsx` (added with the shadcn CLI; the CLI also
  added an unrelated `cn` npm package and imported from it, which was reverted
  to the project's `@/lib/utils`), `src/components/ui/sheet.tsx` (`blur`,
  `overlayClassName` and `keepMounted` options; defaults unchanged for the
  landing menus).
- `docs/DESIGN.md`: the ease-in-out exception for the answer panel.

### BeUI search (`AGENTS.md` UI rule 3)

BeUI has `drawer`, `tabs` and `tooltip`. Not used: the drawer and tabs move
with a spring (the founder asked for ease-in-out), the tabs bring
`lucide-react` (a second icon set) and the tooltip brings `@floating-ui/dom`.
The shadcn `Sheet`, `Tabs` and `Tooltip` on Base UI are already the project's
stack.

### Acceptance results

| Criterion | Result     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-D1     | Pass       | unit "AC-D1, D-02" (a row, a summary dot and a P reference open the panel on that question and source; Escape and the close button return focus to the opener); e2e "Spec 012 on the saved report" (row, tabs, Berikutnya, P reference by pointer and keyboard, Escape, address unchanged)                                                                                                                                                                                                                                                                                                                                                                                                |
| AC-D2     | Partly met | Production build, Chromium at 1280×860, no CPU slow-down, frame intervals from `requestAnimationFrame`: **the first open of a fresh page drops one or two frames of about 33 ms** (one 29 to 41 ms task in the Chromium trace); after that, opens and closes stay at or under 16.8 ms per frame, with an occasional single 33 ms frame. With the CPU slowed 2× the first open shows frames of 50 to 70 ms. This container has no GPU, so it cannot stand in for a real device; the slide itself is a compositor transform. The trace is not attached. **The founder checks it on a mid-range laptop and on a phone**; Spec 021 is not marked Verified until that result is recorded here. |

### Checks run

- Unit: `two-source-report.test.tsx` (table, panel, failed check in the panel,
  print appendix), all report tests.
- E2e: the two report tests in `new-intake-glm.spec.ts`, then the full suites
  (see the PR).
- Print: the A4 PDF from the e2e run shows the table hidden and every answer
  in the appendix.

### Review round 1 (ALMOST) and fixes

[Round 1 comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/175#issuecomment-6430058137).

- The panel fits a 320px phone: one shrinkable column, a tab row that may
  scroll, a chat column that keeps long tables inside their own scroll box,
  and footer buttons that share the width. The e2e test now opens the panel
  at 320px and checks that nothing reaches past the screen edge.
- No 40px snap on close: the sheet's own `translate` nudge is replaced for
  this panel (the build merged a `translate: none` override into `transform`,
  so a class override is used instead). The e2e test checks that the panel
  carries no extra offset while it closes and only moves right. Under reduced
  motion the panel stays in place and appears at once.
- Focus stays in the panel when "Berikutnya" or "Sebelumnya" turns off at the
  last or first question; a "copied" note no longer carries over to another
  question; an open panel never prints over the report; the header logos are
  labelled images; a dot in the table opens that source's tab.
- Smaller: `openAnswer` is stable (no re-render of every row on open), the
  bubble and the answer always show the same question, focus returns to the
  clicked element (Safari does not focus buttons on click), appendix questions
  are `h4`, an unused class is removed.

### Smoothness method (AC-D2)

Production build (`next build` and `next start`), headless Chromium at
1280×860, a fictional report served through a route intercept. Frame times are
the intervals between `requestAnimationFrame` callbacks while the panel opens
and closes; long tasks come from a Chromium performance trace. The figures
are in the AC-D2 row above: the first open of a fresh page drops one or two
frames of about 33 ms, later opens and closes stay at or under 16.8 ms per
frame, and with the CPU slowed 2× the first open shows frames of 50 to 70 ms.
Keeping the panel mounted and drawing the answer text in a deferred render
cut the click's own work from 93 ms to about 30 to 40 ms on the first open.

### Review round 2 (ALMOST) and fixes

[Round 2 comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/175#issuecomment-6430529047).
All seven round-1 findings confirmed fixed. New:

- Long links and words in an answer wrap again on screen (`overflow-wrap:
anywhere` on the panel and the print appendix; source chips may shrink). The
  print overlap round 2 also saw had another cause, fixed in round 4 below. The e2e test now
  adds a long plain-text link to every answer and checks, at 320px, every
  question on both tabs; it fails without the fix.
- Each question opens at its top when paging; the e2e test scrolls to the end
  and checks the next question starts at the top.
- AC-D2 is recorded as partly met above, with the trace numbers.
- Paging is announced to screen readers; the title follows the shown
  question; the panel is full width below 640px; a unit test covers focus when
  "Sebelumnya" reaches question 1; the reduced-motion wording is corrected.

### Review round 3 (ALMOST) and fixes

[Round 3 comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/175#issuecomment-6430879466).
All round-2 findings confirmed fixed on screen. New:

- Print: the table header now prints once (`.appendix thead`). This removed
  one trigger of the print overlap but not its cause; round 4 below has the
  real fix.
- AC-D2 is worded accurately above (the first open's dropped frames, a
  mid-range laptop and a phone for the founder's check).
- Smaller: the scroll reset when paging runs before paint (the reset on
  reopening did not work in a real browser; round 4 below); a long source domain ends with
  "…"; the unused reduced-motion fade is removed (the panel appears in place).

### Review round 4 (ALMOST) and fixes

[Round 4 comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/175#issuecomment-6431170685).

- **Print overlap fixed at its cause.** The appendix used CSS grids, whose
  rows are sized before the page is split; any answer that grows at a page
  break (a split line, a table header) ran under the source chips and time
  after it. In print the appendix now flows as blocks (the avatar sits to the
  left by positioning). Checked with the reviewer's four long reports (plain
  paragraphs, a long list, long mixed Markdown in both sources, and a table
  in every answer; 14 to 74 A4 pages) and a word-box overlap check
  (`pdftotext -bbox`): no answer, chip or time text overlaps anywhere, the
  same result as the reviewer's tested fix. The only boxes the check flags
  are in the page-1 report header, present in every run including the base
  branch.
- **Reopening the question last read starts at its top in a real browser.**
  The closed panel is not displayed, so the reset is repeated on the first
  frame after it is shown (while it is still off-screen). Checked with the
  reviewer's browser probe (by row, dot and "P" reference: scroll 0 from the
  second frame); the e2e test now scrolls a question to its end, closes,
  reopens it and checks it starts at the top.
- The smoothness paragraph agrees with the AC-D2 row; the Verified condition
  above names AC-D2.
- Not changed: "P" references are buttons now, so a printed or PDF report has
  no internal link from "P2" to the appendix. Noted for Part P (the server PDF
  can add a print-only link).

### Review round 5: PASS

[Round 5 comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/175#issuecomment-6431487510).
Both round-4 findings confirmed fixed (word-box check on five printed reports;
per-frame reopen probe), every earlier fix holds, AC-D2 recorded accurately as
partly met. Of its optional notes, one stale line and one code comment are
corrected. Not done: keeping a status pill and its avatar on one printed page
with `break-inside`/`break-after` rules made source chips print over the notes
below the appendix (word-box check on the long mixed report and the fictional
report), so the passed print layout stays; the split is cosmetic (no text
overlaps or goes missing). Left for Part P: an automated long-answer print
check (word-box overlap on the PDF) before the server PDF reuses the appendix,
and print-only links from "P2" to the appendix.

## Part P, PDF (PR 176)

### Scope reviewed

- `src/app/api/report/pdf/route.ts`: "Unduh PDF" posts the link secret; the
  route checks it like the report-data route, counts the PDF against the
  report's daily cap, makes a single-use print code and asks Browser Run
  (`env.BROWSER.quickAction("pdf", …)`) to print `/r/print#<code>`.
- `src/lib/orders/report-pdf.ts`: the cap (20 per report per UTC day), the
  print code (32 random bytes, 60 seconds, hash only, deleted when read), the
  footer, the file name and the Browser Run request.
- `src/app/api/report/route.ts`: also accepts `print_token` and spends it.
  Its shared answers moved to `src/lib/orders/report-route.ts`.
- `src/app/r/print/page.tsx` and `src/app/r/SavedReport.tsx` (`via="print"`).
- `src/app/audit/report/ReportPdfButton.tsx`, `report-pdf.ts` (page side),
  `TwoSourceReport.tsx` (both buttons; Temuan Utama, Rekomendasi and Penutup
  start a new page in print; the "Ketuk pertanyaan" hint is not printed).
- `migrations/0014_report_pdf.sql`, `src/lib/orders/retention.ts` (both new
  tables deleted with the order), `wrangler.jsonc` (Browser Run binding in
  production and previews, none in `dev`; `REPORT_PDF_CALLER_RATE_LIMITER`,
  3 a minute, in all three environments).
- The `verify-nuave` skill's PDF step.

### Spike (PLAN.md PR 4): HTML mode failed, URL mode with a print code

Criterion 1 failed at once: a route handler that imports `react-dom/server`
does not build on Next 16 ("You're importing a component that imports
react-dom/server"), and the report's components are client components, which
the server layer only sees as references. So, as the plan says for a failed
spike, Browser Run opens the real report page by URL with a **single-use
print code** in the fragment, never the link secret. The code is spent when
the page reads the report, so a URL in Browser Run's run list opens nothing
afterwards. What this gives:

- The PDF is the page's own print layout (the same CSS and Geist fonts as the
  browser's print), so criteria 2 and 3 do not arise; fonts and CSS load from
  the site's own address, which Browser Run reaches (public pages).
- No server renderer is added to the Worker (criterion 4).
- Time (criterion 5): on the PR preview, with the real Browser Run, 10.9 and
  8.0 seconds from the press to the saved file (under 15). Locally, against
  `next start` with Chromium, 1.5 to 1.9 seconds for 11, 29 and 75 pages.

### Acceptance results

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-P1     | Pass   | **PR preview (real Browser Run), 2026-10-27:** a fictional synthetic report put in the preview database; "Unduh PDF" in a browser saved `Laporan-Nuave-Klinik-Kecantikan-Contoh-Sentosa-Kemang-Raya.pdf` (200, `application/pdf`, `no-store`): 11 A4 pages, Geist embedded, footer "Nuave · Laporan Visibilitas AI · <klinik>" and "n / 11" on every page, page 1 the header, verdict and source cards, Temuan Utama (p. 2), Rekomendasi (p. 4) and Penutup (p. 5) each start a page, then "Lampiran: jawaban lengkap"; no text overlaps beyond the page-1 baseline. **Time per PDF: 10.9 s, then 8.0 s** (press to saved file). Afterwards no print code was left in the database and the day count was 2. Local runs of the same request for 29 and 75 page reports were also clean. Unit: request options, headers, file name. |
| AC-P2     | Pass   | Unit "the link secret never goes into a URL": Browser Run gets `/r/print#<43-character code>`, never the secret; only the code's hash is stored; the code opens the report once and not after 60 seconds or after the link is switched off; a wrong, malformed or switched-off secret gets the report route's exact answer and Browser Run is not called; logs carry numbers and codes only. E2e: the page posts the secret in the body, never in a URL.                                                                                                                                                                                                                                                                                                                                                                          |

### Checks run

- Unit: `report-pdf.test.ts` (16), `saved-report.test.tsx` (the print page
  sends a print code, never the secret), `two-source-report.test.tsx` (button,
  spinner, one request per press, retry message next to the pressed button,
  print fallback, page breaks), `retention.test.ts`, `wrangler-config.test.ts`,
  `rate-limit-config.test.ts`, then the full suite.
- E2e: `new-intake-glm.spec.ts` checks the PDF route's `pdf_unavailable`
  answer locally and the print that follows, then the full suites (see the
  PR).
- `npm run check`, `next build`.

### Risks to check after merge

- Browser Run is identified as a bot. Cloudflare does not block it by
  default; if bot protection (for example Bot Fight Mode) is switched on for
  `nuave.ai`, the PDF fails with "PDF belum bisa dibuat" in production while
  the preview (on `workers.dev`) works. The first production download after
  the deploy confirms it.
- Browser Run's reads of `/api/report` probably all come from one address, so
  every PDF being made at the same moment shares that route's 20-a-minute
  limit. Fine at today's volume; a busy day would show "PDF belum bisa
  dibuat" for some presses.
- When a report's 20 PDFs for the day are used up, "Unduh PDF" opens the
  browser's print without a note (by design: the customer still gets a PDF,
  and no browser time is used).
