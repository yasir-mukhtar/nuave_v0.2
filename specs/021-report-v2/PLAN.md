# Spec 021 build plan

> Status: **In review** (independent review on PR #171; the build starts after
> a PASS)
> Spec: [`SPEC.md`](./SPEC.md) (approved 2026-10-26)
> Reference: `experiments/report-v2-poc/` (approved prototype)
> Updated: 2026-10-26

## How the work is cut

Six pull requests, merged in this order. Each one leaves `main` working and
deployable, so the founder can stop after any of them and customers still get
a better report. Each gets its own independent review (verdict PASS, ALMOST or
FAIL, posted on the PR) and is iterated until it passes; merge and deploy stay
with the founder.

| PR | Part | What changes for the customer | Live calls or new cost |
|---|---|---|---|
| 1 (#171) | Plan | Nothing (spec, plan, prototype, wishlist, decisions) | None |
| 2 | A, layout | New page structure and look for every Spec 018 report, including delivered ones | None |
| 3 | D, answers | Questions table with tooltips and the side panel | None |
| 4 | P, PDF | "Unduh PDF" gives a server-made, branded PDF | Browser Run time (within included hours) |
| 5 | C, competitor data | Richer competitor list for new orders: links, ratings, logos, counts | None |
| 6 | B, writing | Deeper findings with headline numbers, firm recommendations, reasons, takeaways, Penutup plan | Side-by-side test (founder approval); Anthropic key if Claude (founder decision) |

Why this order: A and D are presentation only and help every report at once,
including the ones already delivered. P removes the last "print it yourself"
step. C starts saving richer competitor data early, because only orders made
after it ships have it. B depends on founder approvals and its outputs (reasons,
headline numbers, Penutup) slot into places A, C and D already built.

## PR 2: Part A, layout

**Approach.** Rebuild the two-source branch of the report renderer to the
prototype; keep the pre-Spec 018 branch untouched.

- `src/app/audit/report/DirectTenReportPage.tsx`: new top bar ("Unduh PDF"
  calls the browser print until PR 4), header, chips (no Ringkasan), the
  end-of-report save row. The direct-ten (old) header stays as is behind the
  `two` check.
- `src/app/audit/report/DirectTenReportBody.tsx`: for `two` reports, render
  the new sections in the new order; old reports keep today's markup exactly.
- `src/app/audit/report/TwoSourceSections.tsx`: replace `TwoSourceSummary`
  (cards, legend), `OtherBusinesses` (competitor list from today's per-source
  name lists, deduplicated, with the owner's card), `TopicsMissing` (topic
  names, volume or "N klinik lain disebut AI" counted from the per-question
  business lists), `TwoSourceMethod` (becomes the three notes under Jawaban
  AI). New `Findings`, `Recommendations`, `Closing` components with the
  pre-Part B fallbacks of the spec.
- `src/components/product/report/TenBeads.tsx`: replaced by a `MentionDot`
  component with the six looks (centred marks drawn without borders that
  shift the centre) and a `MentionLegend`.
- `src/styles/tokens.css`: dot, band and card tokens for light and dark (no
  raw colours in components).
- `report-body.module.css`: section bands, findings grid, competitor rows,
  recommendation cards, closing band.
- Remove "Unduh bukti JSON" from the page (`DirectTenReportPage`,
  `ReportView`, `SavedReport`); keep `customer-evidence-export.ts` and its
  route for support.
- Jawaban AI keeps today's stacked question blocks in this PR (moved to the
  end, renamed, notes added); PR 3 replaces them.

**Tests.**
- `two-source-report.test.tsx`: new assertions per AC-A2 (each dot look,
  counts equal dots, headline sentences), AC-A3 (order, chip names), AC-A4
  (absent strings); update its Spec 018 snapshot deliberately; the "report
  saved before Spec 018" snapshot must pass unchanged (AC-A5).
- `report-body.test.tsx`: recommendation fallback (action + why, no removed
  labels), finding without a headline number, Penutup fallback.
- `tests/e2e/journey.ts` and the specs that use it: button name "Unduh PDF";
  drop the JSON download step; `.claude/skills/verify-nuave/SKILL.md` and its
  feature files follow.
- `npm run verify` (includes `check:typography`, lint, format, unit, e2e
  offline).
- Browser check at 390, 768 and 1280 wide, light and dark, no sideways scroll
  (Playwright screenshot script kept out of the repo).

**Finish.** AC-A1 to AC-A6 pass; screenshots of NV-3WDSAY's saved data (local
fixture copy, no live calls) attached to the PR for AC-A7.

## PR 3: Part D, answers

- New `src/app/audit/report/AnswersTable.tsx` (table with header row,
  tooltips on logos and dots) and `AnswerPanel.tsx` (shadcn `Sheet` from the
  right, full width under 640px; shadcn `Tabs`; chat layout reusing
  `AnswerMarkdown` and the name marking from `mark-names.ts`).
- Motion from `src/components/motion/presets.ts` and `useMotionAllowed`:
  scrim opacity and panel transform only, one ease-in-out curve for both
  directions, instant under reduced motion.
- One `openAnswer(questionNumber, source?)` used by dots, rows and "P"
  references (replaces today's jump-to-anchor).
- Print: the panel never prints; `ReportAppendix.tsx` renders every answer in
  the chat style for print only (PR 4 uses it for the PDF).
- Tooltips: a small Base UI tooltip via shadcn if present, else a CSS tooltip
  with `aria-label` (no new library).

**Tests.** Unit: panel opens on the right question and source, Escape and
focus return, tab arrow keys, failed and not-shown states. E2e: open, switch
tab, next, close. AC-D2: a Chromium performance trace in the PR (no frame over
20 ms while opening).

## PR 4: Part P, PDF

**Approach.**
- `wrangler.jsonc`: a `browser` binding (`BROWSER`) for production and the PR
  preview environments; the compatibility date already supports Quick Actions.
- New route `POST /api/report/pdf` with `{ secret }` in the body. It reuses
  the report-data route's secret check and rate limiter, then asks Browser Run
  (`env.BROWSER.quickAction("pdf", …)`) to open the report page in print mode
  inside Cloudflare and returns the PDF with `Content-Disposition: attachment;
  filename="Laporan-Nuave-<klinik>.pdf"`, `no-store`.
- How the page gets the data inside Browser Run without putting the secret in
  a URL that leaves Cloudflare is settled by a **spike** at the start of the
  PR, choosing between:
  1. **HTML mode:** the route renders the print view to HTML on the server
     (same React components and the built CSS) and sends it as `html`; or
  2. **URL mode:** Browser Run opens `/r?print=1#<secret>`; the request stays
     inside Cloudflare's network, and the page signals `data-report-ready`
     before printing.
  The spike records which works on Workers with OpenNext, its time per PDF,
  and the choice, in the PR description. HTML mode is preferred if it works.
- Footer and page numbers through the PDF options' footer template; A4; print
  CSS from PR 2 and the appendix from PR 3; light palette forced.
- Client: "Unduh PDF" posts the secret, shows a spinner, saves the file;
  failure shows a retry message. Where `BROWSER` is absent (local, tests),
  the button falls back to the browser's print.

**Tests.** Unit: route rejects a wrong secret with the standard answer, sends
no secret in any URL, sets the headers; client fallback. Manual on the PR
preview: download a PDF of a synthetic report, check footer, page breaks,
appendix (AC-P1), and attach it to the PR. Browser Run time per PDF recorded.

## PR 5: Part C, competitor data

- **Check first:** read a saved raw ChatGPT and Google response in the
  restricted evidence (local fixtures, no new calls) to confirm which fields
  the provider returns for listed businesses (website, rating, review count;
  for ChatGPT local-business cards and Google's local pack and organic
  results). The PR states what was found; fields that do not exist are not
  promised.
- `src/lib/checks/chatgpt.ts` and `google.ts`: keep, per listed business,
  name, website or Instagram, rating, review count (never phone or address).
  Saved inside the existing JSON columns; no migration.
- `src/lib/orders/two-source.ts`: a `competitors` block in the saved report:
  per business, named per source, recommended, question ids, website, rating,
  reviews; the owner's own row from the same counts. New report version
  string; Part A's list reads it when present and falls back to today's name
  lists.
- Logos: site icon loaded by the browser with `referrerPolicy="no-referrer"`;
  initials fallback (C-03).

**Tests.** Unit: extraction from fixture responses (with and without the
fields), phone numbers never kept (AC-C2), counts and owner row (AC-C1),
fallback for reports without the block.

## PR 6: Part B, writing

Built and tested offline first; live steps wait for the founder.

1. **Playbook draft** `docs/content/report/PLAYBOOK.md` (public, checkable
   guidance on how AI assistants choose local clinics and what clinics can
   do). Founder approves before the writer uses it.
2. **Writer input** (B-01) in `report-pipeline.ts`, `runner.ts` and the
   two-source facts: add Google answer texts (phone-stripped), businesses per
   answer, profile, playbook.
3. **Instructions** (B-03) in `report-prompt-contract.ts` and the production
   adapter (`openai.ts` via OpenCode Go): analysis angles, the confident-advice
   rule, banned shapes.
4. **Output schema** (B-04) with a new version; `contracts.ts` validation;
   the count check (`two-source-report.ts`) extended to headline numbers,
   recommendations and the closing (B-05); banned title starts (B-06).
5. **Renderer** reads the new fields (headline numbers, reasons, takeaways,
   closing, plan, topic names, Google recommendation reading).
6. **Side-by-side test** (B-07): a script runs the new writer on the saved
   NV-3WDSAY answers with each model and writes three reports to
   `.local-evidence/`; needs the founder's named approval for the calls
   (estimated under USD 2 in total) and, for Claude, an Anthropic API key
   (new paid provider, founder decision) and a small adapter
   (`anthropic.ts`) with the same spend reservation as other providers.
7. **Switch** to the founder's pick; record cost and time per report;
   confirm the per-order hold covers it.

**Tests.** Unit: schema validation, count check on headline numbers, banned
titles, repair path, renderer with old and new versions. The offline fixture
writer returns a Part B shaped report so the journey and snapshots cover it.
AC-B4 is the founder's reading.

## Cross-cutting rules

- **Old reports:** pre-Spec 018 renders byte-for-byte as today; Spec 018
  reports get each part's layout where their data allows; nothing is
  regenerated on open (S0).
- **Versions:** the saved two-source block gains a version per data change
  (PR 5, PR 6); the renderer branches on presence of fields, not on dates.
- **Privacy:** no phone numbers anywhere new; competitor data is public
  business information; PDFs are not stored.
- **Design system:** Geist roles from `docs/DESIGN.md`, tokens in
  `tokens.css`, Tabler icons, shadcn/Base UI parts, motion presets; the
  prototype's raw colours become tokens.
- **Checks per PR:** `npm run verify` green before pushing; the PR preview is
  checked on a phone width; the review comment links evidence.
- **Docs:** `NOW.md` and `DECISION_LOG.md` updated only when a part ships or a
  decision is made; Spec 018's report layout table is marked as replaced.

## Decisions the founder still owes

1. Named approval for the B-07 live writer calls (before PR 6 step 6).
2. Anthropic API key, or to compare only models on the existing providers
   (before PR 6 step 6).
3. Approval of `PLAYBOOK.md` (before PR 6 step 3 is used live).

## Risks

- **Browser Run inside OpenNext:** the spike in PR 4 may show HTML mode is
  not practical; URL mode is the fallback, with the secret staying inside
  Cloudflare's network.
- **Provider fields:** if DataForSEO does not return websites or ratings for
  listed businesses, Peta Pesaing shows counts and reasons only, and links
  come from cited sources.
- **Writer quality:** the stronger instructions may still produce recaps with
  GPT-5.6 Luna; B-07 exists to measure that before switching.
- **Snapshot churn:** PR 2 rewrites the Spec 018 snapshot; reviewers compare
  it against the prototype, not the old snapshot.
