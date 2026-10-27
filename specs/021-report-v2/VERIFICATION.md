# Verification: Spec 021 — Report v2

> Result: **Pending** (Parts A and D built; Parts P, C and B to come; not
> Verified until the founder's AC-A7 and AC-D2 checks are recorded)
> Reviewer: independent agent review on each PR (verdict comment on the PR)
> Date: 2026-10-26
> Spec version or commit: `specs/021-report-v2/SPEC.md` at 590a273
> Implementation version or commit: Part A (PR #173), Part D (PR #175)

Each PR in [`PLAN.md`](./PLAN.md) adds its results here. The spec is marked
**Verified** after PR 6 and the founder's AC-A7 and AC-B4 readings.

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
and while it closes, three runs each: every frame was at most 16.8 ms. A
Chromium performance trace of one opening (main-thread tasks) was also taken;
the click's own work fell from 93 ms to 41 ms after the panel was kept mounted
and the answer text moved to a deferred render. The reviewer's re-run with the
CPU slowed showed one 33 ms frame at 2× and 50 to 100 ms frames at 4×, so a
much slower phone may drop frames at the start of the slide; the slide itself
is a compositor transform.

### Review round 2 (ALMOST) and fixes

[Round 2 comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/175#issuecomment-6430529047).
All seven round-1 findings confirmed fixed. New:

- Long links and words in an answer wrap again on screen (`overflow-wrap:
anywhere` on the panel and the print appendix; source chips may shrink). The
  print overlap round 2 also saw had another cause, fixed in round 3 below. The e2e test now
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

- **Print overlap fixed.** When a table in an answer crossed a page break,
  Chromium repeated its header on the next page and pushed the answer under
  the source chips and time that follow it in the appendix grid. The table
  header now prints once (`.appendix thead { display: table-row-group }` in
  print). Checked by printing the reviewer's report with a 9-row table in
  every answer (14 A4 pages): the chips sit below each answer, where before
  "source.example" printed over the last sentence.
- AC-D2 is worded accurately above (the first open's dropped frames, a
  mid-range laptop and a phone for the founder's check).
- Smaller: the panel opens at the top even when reopening the question last
  read; the scroll reset runs before paint; a long source domain ends with
  "…"; the unused reduced-motion fade is removed (the panel appears in place).
