# Spec 021 build plan

> Status: **PASS** (review rounds 2 and 3); the founder confirmed the spec
> edits (A-11 light only) on 2026-10-26; building
> Spec: [`SPEC.md`](./SPEC.md) (approved 2026-10-26)
> Reference: `experiments/report-v2-poc/` (approved prototype)
> Updated: 2026-10-26
> Kept in the spec folder at the founder's request of 2026-10-26 ("create plan
> first and make a PR"), the exception `docs/WORKFLOW.md` allows. The founder
> also set this plan's review verdicts to PASS, ALMOST or FAIL.

## How the work is cut

Six pull requests, merged in this order. Each leaves `main` working and
deployable, so the founder can stop after any of them. Each gets an
independent review (PASS, ALMOST or FAIL, posted on the PR), iterated until it
passes; merge and deploy stay with the founder.

| PR | Part | What changes for the customer | Live calls or new cost |
|---|---|---|---|
| 1 (#171) | Plan | Nothing (spec, plan, prototype, wishlist, decisions) | None |
| 2 | A, layout | New page structure and look for every Spec 018 report, including delivered ones | None |
| 3 | D, answers | Questions table with tooltips and the side panel | None |
| 4 | P, PDF | "Unduh PDF" gives a server-made, branded PDF | Browser Run time (within included hours) |
| 5 | C, competitor data | Exact counts, links, ratings, logos for new orders | None, or one live check (founder approval) |
| 6 | B, writing | Deeper findings with headline numbers, firm recommendations, reasons, takeaways, Penutup plan | Side-by-side test (founder approval); Anthropic key if Claude (founder decision) |

Why this order: A and D are presentation only and help every report at once,
including delivered ones. P removes the last "print it yourself" step. C starts
saving richer competitor data early, because only orders made after it have
it. B waits on founder approvals; its outputs slot into places A, C and D built.

## The rule for old reports (applies to every PR)

There are three kinds of saved report. Every change is gated so each keeps
working:

1. **Before Spec 018** (no `report.two_source`): renders byte-for-byte as
   today, including both "Download PDF" buttons (browser print), "Unduh bukti
   JSON", `TenBeads`, the anchor jumps and the footer. The protected snapshot
   in `two-source-report.test.tsx` (the "report saved before Spec 018" case)
   must pass unchanged in every PR. None of PRs 2–6 touches this branch: new
   components are only used under the `two` check, `TenBeads` stays for this
   branch, and no shared component changes behaviour for it. These reports do
   not get the server PDF.
2. **Spec 018 reports saved before PR 5/PR 6:** get the new layout, using only
   what they hold (see "What saved Spec 018 reports hold" below).
3. **Reports saved after PR 5/PR 6:** use the new fields.

The renderer branches on the presence of fields, never on dates; nothing is
regenerated when a report is opened (S0).

### What saved Spec 018 reports hold (checked in code)

- `two_source.questions[]`: per question the ChatGPT and Google outcomes,
  named facts, ChatGPT recommended flag, the AI Overview text and references,
  topic (stored as `topic ?? question`), volume, data month.
- `two_source.other_businesses`: one de-duplicated name list per source, at
  most 10 each, with **no counts or question ids**
  (`src/lib/orders/two-source.ts:377-389`).
- The ChatGPT answer texts in the saved observations (`raw_answer`, with the
  local-business card lines appended by `chatgptAnswerText`).
- `report.conclusion`, `key_findings` (title, explanation, prompt ids),
  `priorities` (action, why, …).

So, for these reports, PR 2 **derives counts at render time** by matching each
saved name in each saved answer text (ChatGPT `raw_answer`, Google `text`),
with the same whole-word, case-insensitive rule `mark-names.ts` uses to
highlight names, pulled out of that rehype plugin into a plain shared
function. A count is the number of answers that name the business (not
occurrences); names are matched longest first and a shorter name inside a
longer matched one ("Erha" inside "Erha Clinic") is not counted again. That
gives per-business "named N×" and per-topic "N klinik
lain disebut AI". No "direkomendasikan N×" for competitors and no ratings or
links until PR 5. A topic row whose stored topic equals its question text has
no topic name and is hidden until PR 6 supplies names.

## PR 2: Part A, layout

**Files and approach.**
- `src/app/audit/report/DirectTenReportPage.tsx`: under `two` only, the new top
  bar ("Unduh PDF", browser print until PR 4), header, chips without
  Ringkasan, the end-of-report save row and footer. The old header, buttons,
  JSON button and footer stay for the old branch.
- `src/app/audit/report/DirectTenReportBody.tsx`: under `two` only, the new
  sections in the new order.
- `src/app/audit/report/TwoSourceSections.tsx`: new `SourceCards` and
  `MentionLegend`, `Findings`, `CompetitorList` (with the render-time counts
  above and the owner's card), `TopicGaps`, `Recommendations`, `Closing`, and
  `AnswerNotes` (the three notes, replacing `TwoSourceMethod`).
- New `src/components/product/report/MentionDot.tsx` (six looks, marks drawn
  so they stay centred). `TenBeads.tsx` stays for old reports.
- **Verdict for reports written before Part B:** the first sentences of the
  saved conclusion, cut at a sentence end, at most 220 characters, using the
  abbreviation-aware sentence splitter in `two-source-report.ts` (exported
  for this). If the first sentence alone is longer, it is cut at the last
  word before 220 characters with "…". The full conclusion is Penutup's
  paragraph.
- `src/styles/tokens.css`: dot, band and card tokens (light only; the design
  system has no dark scheme, so the report stays light like the rest of the
  product). `report-body.module.css`: bands, findings grid, competitor rows,
  recommendation cards, closing band.
- **"Unduh bukti JSON" is removed for Spec 018 reports only.** Support keeps
  the export: a new `npm run support -- export <order>` (logic in
  `src/lib/orders/support.ts`, which `scripts/support.mjs` already bundles
  with esbuild) builds the same JSON (`makeSmartCustomerEvidenceExport`
  and `promptsWithOriginals` from `customer-evidence-export.ts`) from the saved
  order, with the same privacy rules, and has a unit test. Both existing
  JSON e2e steps run on two-source reports (`new-intake-glm.spec.ts:464` and
  `:817`); their assertions, including the byte-for-byte check that every
  answer reaches the customer, move onto the report-data route's JSON
  response, which the test already fetches. `ReportView` and `SavedReport`
  keep `onDownloadJson` for the old branch.
- Jawaban AI keeps today's stacked question blocks in this PR (moved to the
  end, renamed, notes added); PR 3 replaces them.

**Tests.**
- `two-source-report.test.tsx`: assertions for AC-A2 (each dot look, counts
  equal dots), AC-A3 (order and chip names), AC-A4 (absent strings), the
  render-time competitor and topic counts, hidden topic rows, the verdict cut;
  the Spec 018 snapshot is updated deliberately; the pre-Spec 018 snapshot
  passes unchanged (AC-A5).
- `report-body.test.tsx`: recommendation fallback (action + why, no removed
  labels), finding without a headline number, Penutup fallback; the anchor
  test at line 108 keeps passing for old reports.
- `tests/e2e/journey.ts` and its specs: "Unduh PDF" for Spec 018 reports, no
  JSON step for them; `.claude/skills/verify-nuave/` follows.
- **Layout check (automated, Playwright, in the e2e suite):** at 390×844 the
  verdict and the first card's dots are inside the first viewport (AC-A1);
  no horizontal scroll at 320, 390, 768, 1280 and 1920 wide.
- `npm run verify` before every push.

**Finish.** AC-A1 to AC-A6 pass. AC-A7 (founder judgement) is done on the PR
preview with a synthetic report, and by the founder on NV-3WDSAY after deploy;
no production data is pulled by an agent. The PR description says that
delivered reports show the new layout as soon as it deploys, before the
founder's NV-3WDSAY reading (acceptable: presentation only).

## PR 3: Part D, answers

- **First, search BeUI** for a side sheet, tabs and tooltip (`AGENTS.md` UI
  rule 3); record what was found and why it was used or not.
- New `src/app/audit/report/AnswersTable.tsx` (table with header row) and
  `AnswerPanel.tsx`: shadcn `Sheet` (Base UI dialog) from the right, full width
  under 640px; shadcn `Tabs`; chat layout reusing `AnswerMarkdown` and
  `mark-names.ts`.
- **Tooltips:** add the shadcn `Tooltip` component (Base UI, already a
  dependency) with the shadcn CLI; no hand-made tooltip.
- **Motion:** the sheet's own CSS transitions only (Base UI
  `data-starting-style`/`data-ending-style`), not Motion as well, with the
  existing `--ease-in-out` token in `tokens.css` (founder asked for ease in
  and out; a line in `docs/DESIGN.md` motion rules records it). The panel
  animates `transform` only; its overlay animates opacity only, through a new
  `blur={false}` prop on `SheetOverlay`, passed through `SheetContent` (which
  draws the overlay itself); the default is unchanged for `LandingNav` and
  `SiteHeader`. Reduced motion comes from a `prefers-reduced-motion`
  media rule (no slide, fades kept), since CSS transitions do not read
  `useMotionAllowed`.
- One `openAnswer(questionNumber, source?)` used by dots, rows and "P"
  references, under `two` only; old reports keep anchor jumps.
- `ReportAppendix.tsx`: every answer in the chat style, print only (PR 4 uses
  it).

**Tests.** Unit: panel opens on the right question and source; Escape and
focus return; tab arrow keys; failed and not-shown states; tooltips have
accessible names. E2e: open, switch tab, next, close. AC-D2: a Chromium trace
attached to the PR (no frame over 20 ms while opening).

## PR 4: Part P, PDF

**Read first:** the Next 16 route-handler guide in
`node_modules/next/dist/docs/` (`AGENTS.md`), and Cloudflare Browser Run's
Quick Actions and limits pages.

**Approach.**
- `wrangler.jsonc`: a `browser` binding `BROWSER` in production **and** the PR
  preview environment (previews test the real path). Local dev and the offline
  tests have no binding (Quick Actions need remote mode).
- New route `POST /api/report/pdf`, body `{ secret }`. It reuses the
  report-data route's secret check (same "not available" answer for a wrong
  secret) and has **its own tighter rate limit**: a new ratelimit binding of 3
  per minute per caller (ids in all three wrangler environments, and
  `wrangler-config.test.ts` updated), and a per-report cap of 20 PDFs per UTC
  day, so one link cannot use up the included browser hours.
- **Migration `migrations/0014`:** one small table for the daily PDF count
  (and, only if the spike falls back to URL mode, the hashed single-use print
  tokens). It holds no report data (order id, day, count; token hash and
  expiry), and `src/lib/orders/retention.ts` deletes its rows with the order.
- **The secret never goes into a URL.** Browser Run's dashboard lists each
  run's target URL, so URL mode with the secret is ruled out.
  - **HTML mode (preferred):** the route builds the print view's HTML on the
    server and sends it as `html`, with the CSS inlined.
  - **Fallback, if HTML mode fails the spike:** URL mode with a **single-use
    print token** (random, stored hashed in D1, valid 60 seconds, spent on
    first read) so a logged URL is useless afterwards.
- **Spike (time box: one working day), pass criteria:**
  1. `react-dom/server` imports and renders the report's print view inside an
     OpenNext route handler on Workers;
  2. the built CSS and the Geist font files are found and inlined (if fonts
     load from the site's own address instead, Browser Run must reach the
     preview and production addresses);
  3. `next/link` and `next/image` render acceptably outside Next (or are
     avoided in the print view);
  4. the Worker bundle stays under the Workers Paid size limit, with the
     increase recorded;
  5. a synthetic report's PDF matches the print layout and takes under 15
     seconds.
  Fail on any → URL mode with the single-use token. The result goes in the PR
  description.

  **Result (2026-10-27): criterion 1 failed** (Next 16 refuses
  `react-dom/server` in a route handler, and the report is client
  components), so PR 4 (#176) uses URL mode with the single-use print code.
  Details in [`VERIFICATION.md`](./VERIFICATION.md#part-p-pdf-pr-176).
- PDF options: A4, print media, background graphics, footer template with
  "Nuave · Laporan Visibilitas AI · <klinik>" (HTML-escaped) and page numbers.
  `Content-Disposition: attachment; filename="Laporan-Nuave.pdf";
  filename*=UTF-8''<encoded clinic name>`; `Cache-Control: no-store`.
- Time per PDF from the `X-Browser-Ms-Used` response header is written to the
  Worker log as a number (no report data).
- **Client:** "Unduh PDF" posts the secret, shows a spinner, saves the file. The
  route answers `501 {"code":"pdf_unavailable"}` when `BROWSER` is missing; the
  client then uses the browser's print. Other failures show "PDF belum bisa
  dibuat. Coba lagi." with a retry.

**Tests.** Unit: wrong secret → standard answer; no secret in any outgoing
URL or log; headers and filename encoding; footer escaping; rate limits;
`pdf_unavailable` → print fallback. On the PR preview: download a synthetic
report's PDF, check footer, page breaks and appendix (AC-P1), attach it, and
record the time per PDF.

## PR 5: Part C, competitor data

- **Source for the provider fields:** raw responses are never saved (Spec 018
  R-28), so the fields are confirmed from DataForSEO's published response
  schema for the ChatGPT scraper (`chat_gpt_local_businesses`,
  `brand_entities`) and Google Organic (`local_pack`, `organic`). If the schema
  leaves a field unclear, one live check (about USD 0.02) runs only with the
  founder's named approval. The PR lists the fields found; missing fields are
  not promised.
- `src/lib/checks/chatgpt.ts` and `google.ts`: keep per listed business:
  name, website or Instagram, rating, review count. Never phone numbers or
  addresses. Stored in the existing JSON columns; no migration.
- `src/lib/orders/two-source.ts`: a `competitors` block in the saved report:
  per business, named per source, recommended (ChatGPT, from the saved
  assessment), question ids, website, rating, reviews; the owner's row from
  the same counts. New report version string. The renderer prefers this block
  and falls back to PR 2's render-time counts.
- **Logos:** the business's own `https://<domain>/favicon.ico`, loaded by the
  browser with `referrerPolicy="no-referrer"`; initials on error. No
  third-party icon service. In synthetic mode no logo is requested (the
  offline network guard forbids outside requests; synthetic data uses
  initials); the `synthetic` flag `SavedReport` already receives is passed
  down to the report components for this.

**Tests.** Unit: extraction from schema-shaped fixtures with and without the
fields; phone numbers and addresses never kept (AC-C2); counts and owner row
(AC-C1); fallback for reports without the block; no logo request in synthetic
mode.

## PR 6: Part B, writing

Built and tested offline first; live steps wait for the founder.

1. **Playbook draft** `docs/content/report/PLAYBOOK.md` (public, checkable
   guidance). The founder approves it before the writer uses it live.
2. **Writer input** (B-01) in `report-pipeline.ts`, `runner.ts` and the
   two-source facts: Google answer texts (phone-stripped), businesses per
   answer, profile, playbook.
3. **Instructions** (B-03) in `report-prompt-contract.ts` and the production
   adapter (`openai.ts` via OpenCode Go).
4. **Output schema** (B-04): the new fields live in a versioned
   `report.two_source_writing` block. For this new version the content
   schema (`reportContentSchema` in `contracts.ts`) and the "observed gap"
   rule (`contracts.ts` lines 1099-1110) are relaxed: recommendations need
   order, title, argument and at least one cited question; `basis`, `owner`,
   `done_when` and `timing` are no longer asked for, and code never invents
   them. The "observed gap" rule becomes "each recommendation cites at least
   one question where the clinic was absent, cited without its name, or not
   recommended"; when no question shows a gap (named and recommended
   everywhere), recommendations may cite any question, so a valid report can
   never fail the check. Older versions keep the old schema. **`src/lib/audit/report-presentation.ts`** validates the
   block when present (its content schema check, lines 82-84 and 169-193,
   would otherwise reject new reports and show "Bukti laporan tidak
   tersedia"); `contracts.ts` follows.
5. **Checks:** the count check in `two-source-report.ts` extended (B-05);
   banned title starts (B-06). **Headline number rule:** a number is kept only
   if it is one of:
   - a count code can compute from the per-question facts of the questions
     the finding cites, written "X dari Y" where Y is the number of those
     questions (so "0 dari 2" over two cited questions passes) or a source's
     completed count;
   - a count of distinct cited domains or named businesses in the cited
     answers;
   - a figure that appears verbatim in a cited answer text (for example
     "75+").
   Anything else is dropped; the finding keeps its text.
6. **Renderer** reads the block: headline numbers, reasons, takeaways,
   closing, plan, topic names, Google recommendation reading.
7. **Side-by-side test** (B-07): a script runs the new writer on saved answers
   with each model and writes the reports to `.local-evidence/` (never Git).
   The answers come from NV-3WDSAY, exported by the founder with
   `npm run support -- export NV-3WDSAY` (PR 2) or another order the founder
   chooses. Needs the founder's named approval for the calls (estimated under
   USD 2 in total) and, for Claude, an Anthropic API key (new paid provider,
   founder decision) with a small adapter (`anthropic.ts`) using the same
   spend reservation as other providers.
8. **Switch** to the founder's pick; record cost and time per report; confirm
   the per-order hold covers it.

**Tests.** Unit: schema and presentation validation for old and new versions;
headline number rule (each kind kept, others dropped); banned titles; repair
path; **AC-B1: the writer input builder includes Google texts and the
playbook and contains no phone number** (checked with the phone patterns in
`src/lib/checks/phones.ts`). The offline fixture writer returns a Part B
report so the journey and snapshots cover it.

## Cross-cutting rules

- **Privacy:** no phone numbers anywhere new; competitor data is public
  business information; PDFs and exports are not stored; agents pull no
  production data (founder exports go to `.local-evidence/`).
- **Design system:** Geist roles from `docs/DESIGN.md`, tokens in
  `tokens.css`, Tabler icons, shadcn/Base UI parts, BeUI searched first, motion
  presets; the prototype's raw colours become tokens; light only.
- **Checks per PR:** `npm run verify` green before pushing; the PR preview is
  checked at phone width; the review comment links evidence.
- **Verification and closeout:** each PR adds its results to
  `specs/021-report-v2/VERIFICATION.md` (from `docs/templates/VERIFICATION.md`)
  with the PR and verdict link. After PR 6 and the founder's AC-A7 and AC-B4
  readings, the spec is marked **Verified**, `NOW.md` names the next outcome,
  and Spec 018's report layout table is marked as replaced.

## Decisions the founder still owes

1. Named approval for the B-07 live writer calls (before PR 6 step 7).
2. An Anthropic API key, or comparing only models on the existing providers
   (before PR 6 step 7).
3. Approval of `PLAYBOOK.md` (before PR 6 runs live).
4. Only if DataForSEO's schema is unclear: one live check in PR 5.

## Risks

- **Browser Run inside OpenNext:** the spike may fail HTML mode; the fallback
  keeps the secret out of logs with a single-use token.
- **Render-time counts** on older reports rely on name matching in answer
  texts; a name written differently in an answer is missed (undercount), and
  longest-first matching keeps nested names from being counted twice. PR 5 replaces it with saved counts for new orders.
- **Provider fields:** if DataForSEO lacks websites or ratings for listed
  businesses, Peta Pesaing shows counts and reasons only.
- **Writer quality:** stronger instructions may still produce recaps with
  GPT-5.6 Luna; B-07 measures that before switching.
- **Browser Run cost:** concurrency beyond 10 browsers averaged monthly costs
  USD 2.00 each; negligible at current volume, watched in the dashboard.

## Review history

**Round 3 (PASS,
[comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/171#issuecomment-6417619121)).**
Two non-blocking notes folded in afterwards (the overlay prop passes through
`SheetContent`; the schema name and the no-gap case in PR 6). They are
checked again by the reviews of PR 3 and PR 6.

**Round 2 (PASS,
[comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/171#issuecomment-6417576325)).**
Its five small points are folded in: founder confirmation of the spec edits
(asked), the JSON e2e assertions moved to the report-data response,
migration 0014 with retention and rate-limit ids, motion with the existing
`--ease-in-out` token and a no-blur overlay prop, and the relaxed schema for
the new writer version; plus its notes (shared matching function, answers
not occurrences, verdict cut for long sentences, synthetic flag, font reach,
AC-A7 timing).

**Round 1 (ALMOST,
[comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/171#issuecomment-6417470715)).**
Fixed in this revision:
- Must fix 1 (old reports): "The rule for old reports"; every change gated
  under `two`; JSON, `TenBeads`, anchors kept for old reports; no server PDF
  for them.
- Must fix 2 (saved data): "What saved Spec 018 reports hold"; render-time
  counts; hidden topic rows.
- Must fix 3 (presentation check): PR 6 step 4.
- Must fix 4 (secret in Browser Run logs): URL mode with the secret ruled out;
  HTML mode or a single-use token; spike criteria and time box.
- Must fix 5 (nothing to read): DataForSEO's published schema, live check only
  with approval.
- Should fix 1: support export command; SPEC A-08 corrected.
- Should fix 2: verdict cut rule; automated 390×844 and width checks.
- Should fix 3: light only; SPEC A-11 corrected.
- Should fix 4: shadcn Tooltip.
- Should fix 5: BeUI search; sheet CSS transitions only; no blur; ease-in-out
  preset and DESIGN.md line.
- Should fix 6: own rate limits; `pdf_unavailable`; previews have the binding
  (SPEC P-05 corrected); escaping and filename encoding; browser time logged.
- Should fix 7: own-site favicons; no logo requests in synthetic mode.
- Should fix 8: headline number rule.
- Should fix 9: AC-B1 test.
- Should fix 10: founder export to `.local-evidence/`; no agent pulls.
- Should fix 11: VERIFICATION.md and closeout; PLAN.md kept at the founder's
  request.
