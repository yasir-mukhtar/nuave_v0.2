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
  per business, named per source, ChatGPT business cards in answers that
  name it (shown as "kartu ChatGPT N×", not "direkomendasikan"), question
  ids, website, rating, reviews; the owner's row from the same counts, with
  listing details only from listings under the owner's exact name. New report version string. The renderer prefers this block
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
9. **Spec 018 R-28 wording:** state that the writer reads Google's AI
   Overview text (phone numbers removed), as the founder approved on
   2026-10-26 ([decision](../../docs/DECISION_LOG.md#2026-10-26--audit-stack-plan-report-test-before-g1-reading-after)),
   and change SPEC B-01's "(within Spec 018 R-28)" to "(Spec 018 R-28 as
   amended 2026-10-26)". B-07 runs the five writers that decision names.

### PR 6 is built in two pull requests

PR 6 is large and its last step needs the founder's blind reading, so it ships
as two pull requests, each with its own independent review:

- **PR 6a, the new writer** (steps 1 to 6 and 9): what the writer reads and
  returns, the code checks, the page, and the offline writer. New orders
  get the new writer, on today's model (GPT-5.6 Luna through OpenCode Go).
- **PR 6b, the model choice** (steps 7 and 8, AC-B3): run the blind
  side-by-side test on orders delivered after PR 6a, the founder's reading,
  and the switch to the pick (with an Anthropic adapter if a Claude model
  wins). The test harness itself is already merged
  (`scripts/report-writer-test/`, PR #174): it writes with whatever the
  production writer is, through `reportRequest`, `reportOutputSchema` and
  `reportContentFromAnswer`, so PR 6a routes the new writer through those
  three functions.

### PR 6a design

**Which reports.** Every two-source order made after PR 6a uses the new
writer. Orders without two-source checks keep today's writer unchanged.
Saved reports are never rewritten (S0): a saved report without the new block
renders as today (Part A's fallbacks).

**What the writer reads (B-01).** `twoSourceReportFacts` gains, all built by
code from saved rows:
- per question: `topic` and `volume` (when known), whether each source named
  the business or cited its site only, Google's AI Overview text
  (`stripPhoneNumbers` applied again; longer than 3,000 characters is cut at
  a sentence end with "…", the limit the test harness uses), and the
  businesses each source's answer names (`chatgpt`, `google` name lists, from
  the same counting as Part C);
- the list of other businesses that a "disebut karena" reason may name.

The ChatGPT answers are sent as today (already phone-stripped when saved,
`src/lib/checks/chatgpt.ts`); every text in the request is still cleaned of
phone numbers once more before it is sent, so nothing saved earlier can leak. The approved playbook is sent as text in the
developer message: `src/lib/audit/report-playbook.ts` exports it, and a unit
test checks it equals `docs/content/report/PLAYBOOK.md` byte for byte, so the
Worker bundle needs no file read. The request is built by one pure function,
so AC-B1 tests it directly: Google texts and playbook present, no phone
number (`src/lib/checks/phones.ts` patterns).

**Instructions (B-03).** The developer message gets a Part B block:
analysis angles (sites AI relies on and whether the clinic is on them;
which kinds of questions name the clinic; what AI says that is wrong or
missing; how the sources differ; what favoured clinics share); facts only
from the answers; advice confident and specific, only where the playbook
supports it; never a sentence that says why this clinic got its result.
The old "do not diagnose from absence" line is dropped for this writer
(decision 2026-10-26, point 2). The existing source and count rules stay.

**What the writer returns (B-04).** A new structured-output schema,
`twoSourceWritingSynthesisSchema` (all fields required, nulls where
optional, so OpenAI strict mode accepts it):

| Field | Shape | Notes |
| --- | --- | --- |
| `verdict` | string | one or two sentences, ≤ 220 characters |
| `conclusion`, `accuracy_status`, `assessments` | as today | |
| `key_findings[]` | `title`, `explanation`, `evidence_prompt_ids`, `headline: {number, caption, basis} \| null` | 1 to 6 in the schema; 3 to 6 asked; `basis` names what the number counts |
| `priorities[]` | `order`, `action` (title), `why` (argument), `evidence_prompt_ids` | 1 to 6 in the schema; 3 to 6 asked |
| `competitor_reasons[]` | `name`, `reason` | names from the supplied list only |
| `takeaways[]` | `title`, `text` | 0 to 3; 2 or 3 asked (the prototype's cards) |
| `plan[]` | `weeks` ("Minggu 1–2"), `title`, `text` | exactly 3 |
| `topic_names[]` | `prompt_id`, `topic` | for questions without a topic |
| `google_readings[]` | `prompt_id`, `recommended` | for each AI Overview that names the clinic |

Saving. Code maps this onto the saved report:
- **Findings:** `key_findings` keep their shape, plus an optional `headline`.
- **Priorities:** `priorities` keep `order`, `action`, `why` and
  `evidence_prompt_ids`. `basis`, `owner`, `done_when`, `timing` and `caveat`
  become optional in the saved schema, and code never fills them for this
  version.
- **The rest** goes into a new optional block, `two_source_writing: {version:
  "nuave-two-source-writing-v1", verdict, competitor_reasons, takeaways,
  plan, topic_names, google_readings}`.

Older saved reports parse unchanged, and the old synthesis schemas keep every
field required. `report-presentation.ts` validates through the same schema,
so new reports are not marked "Bukti laporan tidak tersedia".

**Checks (B-05, B-06), all in code, all for the new version only:**
- *Observed-gap rule:* each recommendation cites a question where the clinic
  was absent, cited without its name, or not recommended (either source).
  When no question shows a gap, any cited question passes (a valid report
  can never fail it). When the rule would leave no recommendation, the
  writer's list is kept whole: an empty list would bring back the old
  code-written action or fail the paid order.
- *Headline number:* the writer names a `basis` (what the number counts)
  and code checks the number against that basis only:
  1. a per-question fact (ChatGPT named / not named / cited only /
     recommended / not recommended; Google shown / not shown / named / not
     named / cited only / recommended; named by either or neither): "X dari
     Y" with Y the cited questions and X those with the fact, or Y the
     source's completed count and X all questions with the fact; or "N" /
     "N×" for the cited questions with the fact;
  2. the distinct domains cited, or other businesses named, in the cited
     answers (per source or both): "N";
  3. `verbatim`: the figure is a whole token of a cited answer ("75+", never
     the "2" of "Rp 250.000"); two such figures may stand side by side
     ("70 vs 75+").

  The caption must fit the basis: a "not" basis (not named, not
  recommended, not shown, named by neither) needs a negation ("tidak",
  "belum", "tanpa"), any other per-question basis may not have one (cited
  only is not checked: "tanpa menyebut nama" is how it reads). A number code
  cannot confirm, a caption that does not fit, or a headline outside the
  saved bounds (number up to 24 characters, caption 1 to 160) is dropped; the finding keeps its
  text, and the report diagnostic is `headline_dropped`.
- *Banned title starts* ("Periksa", "Pertahankan", "Pertimbangkan",
  "Pastikan") on finding titles and recommendation titles: a writing
  violation, so the one revision call fixes it. A title still banned after
  the revision has the word removed by code. The delivered report never
  has one (AC-B2).
- *Counts:* the existing contradiction check and repair also read the
  verdict. Not the recommendations, takeaways or plan: they are about other
  businesses and advice, which that check misreads as claims about the
  owner ("ERHA, C Derma, dan Bamed disebut AI lewat dokternya" reads as "the
  business was named"), so it would replace good advice with count
  sentences.
- *Language:* the same prohibited-claim and Indonesian checks read every new
  text field. Word limits for this version:

  | Field | Limit |
  | --- | --- |
  | verdict | 2 sentences, 220 characters (longer is cut by code) |
  | finding title | 12 words |
  | finding paragraph | 80 words |
  | recommendation title | 14 words |
  | recommendation paragraph | 100 words |
  | takeaway | title 10 words, text 30 words |
  | plan step | 35 words |
  | reason | 20 words |
  | topic name | 6 words |
- *Clean-up without a call:* code drops topic names for unknown or
  already-named questions (or a name equal to the question), reasons for
  businesses not in the list, and readings for AI Overviews that do not
  name the clinic. A "Mengapa:" or "Berdasarkan:" label left after the
  revision is removed (`writing_label_removed`).
- *Last guard:* before saving, the report must pass the saved schema the
  page checks; should the new block still fail it, the report is saved
  without the block (and its headlines) rather than shown as "Bukti laporan
  tidak tersedia" (diagnostic `writing_block_dropped`).
- *Version:* a report from the new writer records `report_prompt_version`
  `nuave-two-source-writing-v1`, so the side-by-side test never compares a
  delivered report with a writer that did not write it.

**Page.** `TwoSourceReport.tsx` reads the block when present:
- the verdict;
- the headline number and caption in Temuan Utama;
- "Disebut AI karena: …" on competitor rows, and the takeaways under Peta
  Pesaing;
- Penutup's three-step plan;
- topic names in Celah Topik, so rows that were hidden appear;
- a Google dot shows "Direkomendasikan" when its reading says so.

Without the block, every section renders as today.

**Offline writer.** `generateSyntheticLocalReport` returns the new shape
(fictional, labelled), so the journey, the e2e tests and the PDF cover it.

**Spec 018 R-28** wording is updated as step 9 says.

**Tests (PR 6a).**
- Schema: the old and the new version both parse, and the presentation
  check passes both.
- AC-B1: the input builder.
- Headline rule: each kind kept, others dropped.
- Banned titles: revision first, then code removal.
- Observed-gap rule for the new version.
- The repair path with the new fields.
- The page shows each new field, and old reports render unchanged.
- E2e: the synthetic journey shows the verdict, a headline, the plan and a
  reason.

**Tests.** Unit: schema and presentation validation for old and new versions;
headline number rule (each kind kept, others dropped); banned titles; repair
path; **AC-B1: the writer input builder includes Google texts and the
playbook and contains no phone number** (checked with the phone patterns in
`src/lib/checks/phones.ts`). The offline fixture writer returns a Part B
report so the journey and snapshots cover it.

## PR 6b: go live with Claude Opus 5.5 and pages read

The founder's pick, after the reading test
([decision](../../docs/DECISION_LOG.md#2026-10-27--reading-test-opus-55-medium-with-pages-read-wins-on-nv-3wdsay)),
and the go-live choices of 2026-10-28:
- **Writer:** every live two-source order made after this deploys is written
  by Claude Opus 5.5 at medium effort, with the pages Firecrawl read. No
  staged roll-out.
- **Limits:** per-order hold USD 5.00, daily cap USD 50.
- **Delivery promise:** 30 minutes, up from 15.
- **Merge timing:** the founder merges only when no live order is in
  progress, so every order the new writer touches holds USD 5.

Claude Sonnet 5.5 at high effort is the cheaper writer. Switching to it is a
one-line change in `ci.yml` and a deploy.

What does not change:
- synthetic mode and previews (no Claude call, no page read);
- orders without two-source checks (today's OpenAI writer);
- the questions and the checks;
- every saved report (S0: never rewritten).

### 1. The writer (`src/lib/audit/anthropic-report.ts`)

- **Which writer.** A new server setting `NUAVE_REPORT_WRITER` takes
  `claude-opus-5-5` (effort medium) or `claude-sonnet-5-5` (effort high).
  - Unset keeps today's OpenAI writer.
  - Any other value fails closed: the cron skips audit steps, as it does for
    a missing key.
  - `liveGenerateReportContent` sends a report to Claude only when the input
    has the new writer's facts (`hasWriterFacts`). Everything else goes where
    it goes today.
- **Same text as the test.**
  - The request is built from `reportRequest`: the developer text becomes
    `system`, and the user text the one user message.
  - The answer format is `reportOutputSchema`, passed as
    `output_config.format` via `zodOutputFormat`.
  - The answer goes through `reportContentFromAnswer`, so the checks, repairs
    and language fix are unchanged.
  - The harness's `claudeWriter` switches to the same request builder, so the
    test keeps sending what production sends.
- **Call settings.**
  - `thinking: {type: "adaptive"}` and `output_config.effort`.
  - `metadata.user_id` = the hashed safety identifier.
  - Streamed (`.stream().finalMessage()`).
  - SDK retries off: the runner's step retry decides.
  - The workspace header when `NUAVE_ANTHROPIC_WORKSPACE_ID` is set (the key
    is not scoped to one workspace).
  - No refusal fallback model: it was never part of the test, and it bills a
    second model inside the same call.
- **Output allowance.** Opus 24,000 tokens, Sonnet 32,000. See section 2 for
  the measured use.
- **One time limit for the whole call.** One `AbortSignal` covers the token
  count and the whole stream. The SDK's `timeout` stops at the response
  headers only (`@anthropic-ai/sdk` `client.js`), so it cannot bound a
  stalled stream. The limit (`CLAUDE_REPORT_CALL_MS`, section 2) is shorter
  than the order lease, so a second run can never start a second call on the
  same order while one is still streaming. A test proves the signal aborts a
  stream that stops sending.
- **How an answer ends.**
  - `end_turn`: the answer is parsed with the schema.
  - `refusal`, `max_tokens`, an abort, or anything else: a failed call
    (`AuditCallExecutionError`). The runner retries on a later run, with at
    most three report calls per order as today; then the order fails with its
    refund path.
  - The language-fix call is different. If it fails, the pipeline keeps the
    first draft and saves it with the existing repair, as today. Its attempt
    is spent either way.
- **Its own cost path.** `reserveAuditCall` and `completedCallTelemetry`
  accept only Luna (`telemetry.ts`), so the Claude path does not use them.
  - It keeps the shared stage-call limit and the request-budget check, moved
    into one helper both paths call.
  - It writes its own telemetry, with pricing version
    `anthropic-standard-2026-10-28`.

### 2. Time, spending and limits

- **Measured in the reading test** (NV-3WDSAY, from the test-B session's
  records; each time runs from the reservation to the next record).

  | Writer and call | Time | Input → output tokens |
  | --- | --- | --- |
  | Opus medium with pages, call 1 | 107 s | 106,820 → 12,230 |
  | Opus medium with pages, call 2 (language fix) | 48 s | 113,246 → 6,771 |
  | Sonnet high with pages, call 1 (32k allowance) | 154 s | 106,820 → 23,901 |
  | Sonnet high with pages, call 2 | 38 s | 113,065 → 7,166 |

  Every report needed the language fix. Opus writes about 115 tokens a
  second and Sonnet about 155, so even a whole allowance (Opus 24k, Sonnet
  32k) takes about 210 seconds. Reading 16 pages one at a time took about 88
  seconds; one earlier try hit a 429 about 68 seconds in. Firecrawl allows two
  requests at a time on this account.
- **Time.**
  - A Claude report call gets `CLAUDE_REPORT_CALL_MS` = 240 seconds. That
    is more than a whole allowance takes (about 210 seconds) and more than
    twice the test's slowest Opus call.
  - The report step holds two calls, so 495 seconds.
  - A longer run budget (570 seconds) applies only when the run's first
    audit step is a Claude report step or a pages step. Nothing starts after
    it.
  - The email work after the step can take about 165 seconds: the ready
    email, the payment email, two notices and the failure email, each up to
    about 36 seconds (`mail.ts`). The run then ends by about 735 seconds,
    inside the cron's 900-second wall time.
  - The design can carry a call limit up to about 320 seconds. Past that,
    the language fix would need its own run.
  - Email-only retries and OpenAI-writer orders keep today's short steps.
- **Reservation from the real token count.**
  - Before each call, Anthropic's free token-count endpoint counts the
    request.
  - The call reserves that count at the model's input price, plus the whole
    output allowance at the output price. It reserves through
    `reserveProviderSpend` (provider `anthropic`, stage `report`) and the
    request's audit budget, before anything is sent.
  - The count follows the same error rules as the call (below).
- **Input ceiling.** A request counted above 150,000 input tokens is rebuilt
  first with half its pages, then with none, and counted again. If it is
  still over 150,000, nothing is sent and the report fails at once as
  `REPORT_INTEGRITY_FAILURE`, with the refund path. The request would always
  be too long, and sending it could pass the hold. The test's request was
  about 107,000 tokens with pages and 58,600 without.
- **Worst case fits the hold.**
  - Before the report, the order can hold USD 1.545 in reservations (AC-15,
    `spend-worst-case.test.ts`).
  - Each Opus call reserves at most USD 1.08 (150k × 4 + 24k × 20 per
    million), and three calls USD 3.24.
  - The total is USD 4.785, under USD 5.00, even when every call times out
    and keeps its whole reservation.
  - Sonnet: USD 0.62 per call.
  - AC-15 gets a Claude case. It counts 3 report calls, because the runner
    counts the language fix as one.
- **Settled from real usage.** Opus 5.5 is priced at USD 4/20 per million,
  Sonnet 5.5 at 2/10. Cache reads and writes are priced at their rates.
- **Errors from Anthropic** (the token count and the call). The check is
  Claude's own, because `releaseIfRejectedUnrun` knows only OpenAI's error
  class.
  - **Retryable:** an HTTP 429, 529 or other 5xx answer received before the
    stream starts. The reservation is released and the call throws
    `SpendCapError("unavailable")`. That is the runner's branch that gives
    the attempt back (`runner.ts`), so a later run tries again.
  - **A network error, or no answer at all:** Anthropic may have run and
    billed the call, so the reservation stays held (the ledger's rule for a
    dropped connection) and the attempt counts.
  - **Not retryable:** any other 4xx before the stream starts, such as a bad
    or revoked key (401, 403) or "credit balance too low" (400). The
    reservation is released and the attempt counts, so the order fails after
    its three attempts, with its refund, as today.
  - Anything after the stream starts keeps its reservation.
  - Every Anthropic error also records a founder notice, at most one a day
    for each kind of problem: the notice's subject is the day and the status
    group (busy, key, credit, other), so a busy morning does not hide a key
    or credit problem later that day.
- **The token count's request** carries `model`, `system`, `messages`,
  `thinking` and `output_config` only (no `max_tokens`, `metadata` or
  `stream`), built from the same request so the two never differ. A count is
  free; one live count with the production request, which the founder
  approves, confirms its shape before merging.
- **Limits.** `DEFAULT_ORDER_SPEND_LIMIT_USD` goes 2 → 5 and
  `DEFAULT_DAILY_SPEND_LIMIT_USD` 5 → 50, in code and in the production
  deploy.
- **Expected cost per order.** Checks are about USD 0.20, plus Opus for two
  calls (as in the test). About USD 1.50.
- **Firecrawl.** It is billed in credits on the founder's plan, not in the
  USD ledger. One read makes at most 24 Firecrawl requests, retries
  included, and an order has at most two tries (section 3), so 48 at
  most.

### 3. Pages read for every live two-source order

- **When.** In `reporting`, before the first report call. If the order has
  the new writer's facts and no saved pages, the step reads the pages, saves
  them and ends ("pages_read"). The next run writes the report. It takes no
  report attempt.
- **What.** `readPagesForReport`, as tested:
  - the own site and up to four of its useful pages;
  - the ten pages the answers cited most, with tracking tags removed;
  - public business pages only.

  Phone numbers and email addresses are removed from everything kept.
- **One deadline.** One `AbortSignal` of 150 seconds covers every request and
  every wait.
  - Pages are read two at a time, the smallest Firecrawl plan's limit.
  - On a 429 the reader waits as long as Firecrawl asks (Retry-After) or 30
    seconds, at most 70 and never past the deadline. It tries up to three
    times.
  - Pages not read by the deadline are listed as unread.
  - `patientFetch` moves from the harness into `page-reader.ts`, and both use
    it.
- **Errors.**
  - A 5xx, a timeout or a 4xx on one page makes that page unread.
  - A 403 is one unread page too: Firecrawl answers 403 for sites it does not
    read, such as LinkedIn.
  - Only 401 or 402 (bad key, no credits), or a 429 after its three waits,
    stops the reading.
  - Pages already read are always kept.
- **Saved.** Migration 0016 adds `orders.pages_json` (nullable).
  - A marker `{status: "reading", tries}` is written before reading. A run
    that dies mid-read is counted. After two tries the order goes on without
    pages (`gave_up`).
  - The result is one of:
    - `read`, with its pages (any number);
    - `partial`, stopped by 401, 402 or 429, keeping the pages read so far;
    - `gave_up`, after two tries that never finished;
    - `no_key`, with no `FIRECRAWL_API_KEY` set.
  - The writer gets the saved pages in `two_source_facts.writer.pages`.
  - With none, the report is written as today's new writer writes it: the
    request is byte-identical without pages.
  - `partial` and `gave_up` record a founder notice, at most one a day, so a
    Firecrawl problem is not silent.
- **Kept only while needed.** When the report is saved, `pages_json` keeps
  only the status and the page addresses, not the text. `purgeOrder` clears
  it with the rest of the order.
- **Run meter.** The pages step costs `RUN_COST.pages` = 30: up to 24
  requests plus its D1 queries. The token counts add up to 6 to the report
  step's cost (up to three counts for each of two calls).

### 4. The delivery promise: 30 minutes

"Laporan siap dalam 15 menit" becomes "30 menit" everywhere:
- `promise.ts` (the order screen and the payment email);
- `Hero.tsx`, `HowItWorks.tsx` and `PriceReceipt.tsx`;
- the running page's help notice (`DELAY_NOTICE_MS`);
- `TERMS.md` and the terms page, with `LEGAL_VERSION` going 1.1 → 1.2;
- `FAQ.md` and `specs/020-clinic-landing-page/COPY.md`;
- Spec 018 R-23, with an amendment note dated 2026-10-28;
- the tests that quote it.

The founder's first live orders measure the real time.

### 5. Deploy (`.github/workflows/ci.yml`)

- **New Worker secrets, set by the production deploy:**
  - `NUAVE_REPORT_WRITER: claude-opus-5-5`;
  - `NUAVE_ANTHROPIC_API_KEY`;
  - `NUAVE_ANTHROPIC_WORKSPACE_ID`;
  - `FIRECRAWL_API_KEY`;
  - the new limits, `"5"` and `"50"`.
- **The founder adds the three keys to GitHub secrets before merging.** A
  secret that is empty fails the deploy.
- **Fail closed.** The cron refuses audit steps when the writer is Claude and
  the Anthropic key is missing.

### 6. Privacy wording (2026-10-26, point 4)

Anthropic and Firecrawl receive customer-order data from this PR, so the
founder approves this wording before it merges:

- **Penyedia layanan AI**, data column: add "isi halaman web publik yang
  dikutip jawaban AI".
- **New row:** "Penyedia pembaca halaman web" | "Membaca halaman website
  bisnis Anda dan halaman web publik yang dikutip jawaban AI, untuk bahan
  laporan" | "Alamat website bisnis Anda dan alamat halaman yang dikutip".
- **Section 6, "Layanan AI dan pencarian",** names the page reader the same
  way.
- **Section 2's "Data audit" bullet** adds the public pages read for the
  report.
- **Version.** Privacy goes 1.4 → 1.5. This asks every visitor for their
  cookie choice again, as each new version does.
- **Internal map.** `docs/content/website/PRIVACY.md` names Anthropic (AI)
  and Firecrawl (page reader).

**Founder checks before merge:**
- Anthropic's and Firecrawl's terms support the section 7 sentence ("hanya
  memproses data untuk menjalankan layanan Nuave").
- The accounts opened "for the tests only" may receive customer orders.
- Anthropic auto-reload is on.
- Firecrawl credits renew monthly.

### 7. Records and checks

- **Spec amendment, for the founder to confirm:**
  - `SPEC.md` B-07's "USD 2.00" becomes USD 5.00.
  - A new **B-08**: the writer may read the pages Firecrawl read, as section
    3 describes, with its **AC-B5**.
  - The data section says which page data is kept and for how long.
- **Decision log.** `DECISION_LOG.md` has the 2026-10-28 entry (added with
  this revision): writer, pages, USD 5 and USD 50, 30 minutes, merging with
  no live order open. Point 5 of 2026-10-26 (the USD 2 hold) is superseded.
  `NOW.md` is updated with the code.
- **Tests.**
  - The writer request: system, user, schema, effort, allowance, metadata.
  - Every way an answer ends, and the abort of a stalled stream.
  - The reservation, the input ceiling, and the count's request shape and
    error rules.
  - Release and attempt rules for 429, 529, 5xx, other 4xx and network
    errors; the founder notice and its subject; the over-ceiling request failing without a call; a failed
    language fix keeping the first draft.
  - The routing: Claude only with writer facts, and fail closed on a bad
    setting.
  - The pages step: once, no report attempt, the marker and its two tries,
    each saved status, 429 waits inside the deadline, one bad page as
    unread, the notice, no read in synthetic mode.
  - The long budget only for Claude and pages steps.
  - Page text dropped when the report is saved, and the purge.
  - The limits, the AC-15 Claude case, and the 30-minute wording.
  - `npm run verify` and the synthetic journey stay green. Neither CI nor an
    agent makes a live call.
- **First live orders.** After the deploy, the founder's next live order or
  two show the real time, cost, pages and CPU time per report. The agent
  reads them from the support export, not from production.

### Risks

- **Time.** A call over the time limit fails and retries; three failures fail
  the order. The first orders measure it.
- **CPU.** A cron that runs every minute has 30 seconds of CPU per run.
  Streaming and parsing one report should be far below that; the first
  orders confirm it.
- **Page text is untrusted.** The writer's instructions already say the
  pages are data and any instruction in them is ignored. The code checks
  (counts, headline numbers, verbatim figures) still run on every report.

### Plan review

Round 1 (ALMOST,
[comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/185#issuecomment-6458698387)).
Its seven must-fixes are in this revision:
- one abort signal for the whole stream;
- a worst case that fits USD 5, with the input ceiling, the smaller Opus
  allowance and the attempt given back on a failed count;
- orders already in progress (the founder chose to merge when none is open);
- the 15-minute promise (the founder chose 30 minutes);
- the spec amendment and decision entry;
- one bad page no longer drops every page;
- one reading deadline.

Its should-fixes are in too:
- the long budget only for Claude and pages steps;
- 429 and 529 give the attempt back;
- a Claude-specific release check;
- the Claude cost path;
- no fallback model;
- two calls per order;
- the privacy section 6, email stripping and the founder's checks;
- page text dropped when the report is saved;
- the read marker;
- the run meter;
- Sonnet needing a deploy;
- CPU time.

Round 2 (ALMOST,
[comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/185#issuecomment-6458966304)).
Fixed in this revision:
- a request still over the ceiling fails without a call;
- only 429, 529, 5xx and network errors give the attempt back, with a
  founder notice for every Anthropic error;
- the call limit set from the test's timings (240 seconds), with the
  wall-time sum;
- 403 is one unread page;
- a failed language fix keeps the first draft;
- the request counts;
- `gave_up` and its notice;
- the 15-minute wording in Specs 018 and 020;
- the privacy section names;
- the decision recorded now.

Round 3 (PASS,
[comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/185#issuecomment-6459001289)).
Its non-blocking notes are in:
- a network error keeps its reservation and counts its attempt;
- the notice subject names the kind of problem;
- the count's request shape, with one live count before merging;
- the wording;
- watching the 240-second limit on the first live orders (raising it is one
  constant, up to 320 seconds).

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

All settled:

1. Named approval for the B-07 live writer calls: given 2026-10-26 (audit
   stack plan, point 2; up to USD 5 for tests A and B).
2. An Anthropic API key: allowed 2026-10-26 (same decision); the key is set
   for the test as `NUAVE_ANTHROPIC_API_KEY`.
3. Approval of `PLAYBOOK.md`: approved 2026-10-27
   ([decision](../../docs/DECISION_LOG.md#2026-10-27--report-playbook-approved)).
4. DataForSEO's published schema names every field PR 5 keeps, so no live
   check was needed (VERIFICATION.md, Part C).

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
