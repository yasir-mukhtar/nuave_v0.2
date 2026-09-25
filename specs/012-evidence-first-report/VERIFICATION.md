# Verification: Spec 012 — PR A evidence-first report presentation

> Result: **PR A merged; independent review passed; Spec 012 remains in progress (B1/B2 pending)**
> Implementation: Codex; independent review: Claude ([review record](./PR_A_REVIEW.md)); follow-up self-verification: Codex
> Date: 2026-09-22
> Approved specification: `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174` on `docs/astra-report-redesign-plan`
> Branch: `codex/spec-012-pr-a` (verified before commit)
> Base: `4e6b2cf6302a0679aa7820d163b214ac8b486e1f`
> PR #74 merge commit: `d08b9e90e20930377873fe2fd79e2489ab9c39a6`
> Founder check: On 2026-09-22, the founder reviewed the real September 19 record in the new layout and judged it "good enough for now".
> Local artifacts: named temporary fictional evidence was removed during closeout; real-report check results remain in owner-only storage.
> Main workflow: [run 35712356136](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/35712356136) passed the merged-PR gate, but `validate` failed at `src/lib/intake/generation-attempts.test.tsx:204` (1 failed / 1,173 passed); deployment was skipped. No retry was made because the authorized exception named line 159. The post-deployment live-site check remains blocked.

## Scope reviewed

PR A, requirements R-01–R-09 and applicable R-16–R-19, AC-01–AC-10
and A's portion of AC-19. Current origin/main was fetched before branching;
its SHA equals the spec investigation base, with no base differences.

The original shared checkout was switched by another task to the intake
branch after the adapter gate. PR A was moved to the isolated worktree
`/private/tmp/nuave-spec-012-pr-a` on its original branch/base. Only this task's
matching adapter/dependency changes were removed from the shared checkout;
pre-existing untracked drafts were preserved. Spec 011 is not integrated here.
Apply R-19's one-time integration/reverification when its verified merge lands.

## Required adapter-first gate

The tests were written first. Initial run failed because the adapter did not
yet exist. At 14:23:11 Asia/Jakarta on 2026-09-22, the pure adapter suite passed
**40/40** before any React or CSS edits. Git status at that point contained
only the three new adapter/test/fictional-fixture files plus pre-existing
untracked user documents. No React, CSS or dependency edits preceded the gate.

Coverage includes missing observation/detail/question/raw answer; duplicates
on both sides; extra/unknown IDs; independent order defects; non-lexical valid
order; all evidence references; corrupt measures; one recommendation plus nine
unassessed answers; frozen input preservation; exact CRLF/Unicode/spacing;
historical routing; and safe/inert retained source URLs.

## Dependencies and component provenance

Approved exact pins: `react-markdown@10.1.0`, `remark-gfm@4.0.1` from Spec 012
review 1. Lockfile regenerated with `npm install --package-lock-only
--save-exact ...`; no plain install. Node `v22.23.2`; `npm ci` and
`npm ci --dry-run` pass. Existing versions and optional WASM entries are retained.
The regenerated lockfile dropped `libc` metadata on ten optional Linux binaries
(`@rolldown/binding-linux-*` and vite's nested `lightningcss-linux-*`);
`npm ci --dry-run` still passes, and CI will confirm Linux behavior. The
lockfile was not regenerated during this review follow-up.

Checked the [BeUI message component](https://beui.dev/components/agents/message)
and registry before reader UI work. No BeUI component was copied: its chat
wrapper is unnecessary for this ordinary report flow. Existing shadcn/Base UI
Button and Accordion provide copy and auxiliary raw-text behavior; Tabler owns
the copy icon. The complete rendered answer never collapses.

Markdown policy follows the official [react-markdown](https://github.com/remarkjs/react-markdown)
and [remark-gfm](https://github.com/remarkjs/remark-gfm) APIs (checked 2026-09-22).
An AST transform makes resource/link/HTML/task constructs inert readable text;
a bounded element allowlist prevents active body links, resources or IDs.

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| AC-01 | Pass | Body test and saved-session browser test: ten exact questions, whole answers and late caveats in retained order, including after reload. |
| AC-02 | Pass | 40 adapter-first tests, before UI/CSS. Invalid records return unavailable without evidence content. |
| AC-03 | Pass | Zero, mention-only, separate recommendation labels, nine unassessed details with 1/10 measures; corrupt denominators rejected. |
| AC-04 | Pass | Markdown fixture covers headings, nested lists, tables, code, URLs, HTML/script/iframe/input, images, tasks, autolinks, reference links and footnotes. Browser records zero external requests. |
| AC-05 | Pass | Exact JS string comparisons for question, raw surface and clipboard; clock-controlled customer JSON parity; selectable raw view and truthful clipboard-failure notice. |
| AC-06 | Pass | Every finding/action/comparator reference retained; keyboard Enter focuses the target without leaving the report. One target per question, no arbitrary quote/action duplication. |
| AC-07 | Pass | Empty comparator omitted despite raw names; actual structured relationship/references and limitation preserved; invalid references unavailable. |
| AC-08 | Pass for rendering and print CSS only | 1440/390/320px, 200% CSS scaling, keyboard/focus and 44px answer controls passed. The reviewed 12-page A4 output keeps every question heading with its answer start and every full answer/caveat once, without clipping or a duplicate raw body. The original two PDFs are one identical print-engine capture written twice (same SHA-256); the `window.print()` callback was spied, not rendered, and the native OS Save dialog was not exercised. The test now writes one `report-print-a4.pdf` capture. |
| AC-09 | Pass | Explicit-method routing tests keep historical denominators; shared toolbar callbacks, constant assertion and both existing e2e label locators updated. No active old-label overrides remain. |
| AC-10 | Pass | Focused browser test: read/raw/copy/anchors/PDF/JSON/reload preserve the serialized snapshot; exactly one run/report request. Existing GLM flow covers Back/return. Export versions and omissions unchanged. |
| AC-19 (A) | Pass (A offline) | Base/pins recorded; complete diff/allowlist and protected-byte comparison checked; full `npm run verify` passes. Independent review recorded separately; Spec 011 integration and whole-spec verdict remain separate. |

## Checks run

- Adapter-first: 40/40, before UI edits.
- Review follow-up focused adapter/body/labels/export suite: **68/68**;
  final full suite also passes (the original review passed 67/67).
- `npm run check`: passed (17 pre-existing lint warnings, no errors).
- `NUAVE_E2E_PORT=3122 npm run verify`: **passed**, exit 0. **88 test files /
  1,174 unit tests**, Next.js production build, OpenNext Cloudflare build,
  **24 enabled + 3 disabled browser tests**. No live provider calls.
- Original focused browser/PDF rerun: **1/1**, with artifacts retained outside
  Playwright's per-suite cleanup. The two PDFs are one identical Chromium
  print-engine capture written twice, with SHA-256
  `024098dba59bf5b7b44ee0fa36a74927759975dd1b141bc11b2259d25ee20686`.
  The `window.print()` callback was spied, not rendered; the native OS Save
  dialog was not exercised. This proves rendering and print CSS only.
- PDF extraction: **12 pages**, every `AWAL-JAWABAN-1..10` and
  `AKHIR-JAWABAN-1..10` marker exactly once; section order preserved, controls
  absent, every question heading and answer start on the same page.
- Original visual QA: all 12 pages inspected at 1200px using bundled Poppler.
  Tables/long URLs/nested lists/code wrap; no clipped text or split headings.
  The duplicate print-engine artifacts have identical extracted text and all
  12 rendered PNG pages are pixel-identical; they do not prove two print paths.
- Follow-up Spec 012 browser regression passed within the full gate and
  produced one `report-print-a4.pdf`, retained outside suite cleanup. It is
  still **12 pages**; all ten answer texts match the previously reviewed PDF,
  every answer-boundary marker occurs once, and controls remain absent.
  Whole-report extracted words match except for fresh run timestamps. The
  paragraph spacing moves one source limitation sentence from page 4 to 5;
  those two pages were rendered and visually checked with no clipping or
  orphan question heading. Unit assertions also preserve exact rendered
  text, including inline HTML, and unchanged raw/copy/export strings.
- `git diff --check`: passed. Protected file/header byte comparisons passed.
  Final `git fetch origin main` still resolves to the recorded base SHA.

## Findings and limits

The browser regression reproduced report anchor navigation firing intake's
`popstate` handler and leaving the report. The report-local reference handler
now focuses/scrolls the existing question without mutating journey history.
The regression keeps no-repeat request assertions.

The five protected "Isi laporan" contents-nav anchors in `ReportView.tsx`
still fire intake's `popstate` Back handler and leave the report; this is
pre-existing, outside PR A's allowlist, and left for B1 or the intake owner.

Protected ReportView header/brief/contents is byte-identical to the base. No
shared CSS is changed. Its existing contents order/date remains for B1.
No B1/B2 synthesis, usefulness gate or recovery behavior is implemented.

Review follow-up takes all three optional improvements: one neutrally named
`report-print-a4.pdf` capture replaces the duplicate PDF writes; root-level
HTML literals receive paragraph spacing; and missing-position literals use
`node.value ?? ""` without duplicating the raw answer. A regression test
first failed on the missing paragraph wrapper while its exact text assertion
passed, then passed after the fix. Inline HTML remains in its original
paragraph; existing Markdown, raw/copy and export assertions remain intact.

The follow-up started with the original uncommitted PR A implementation and
independent review already present. At that checkpoint, the requested
whole-worktree `git status` limit of four files could not be met without
discarding or committing that existing work, both outside the follow-up's
scope. It was preserved; the follow-up's own
changes are restricted to the four allowed files, checked against a starting
file-hash snapshot. No branch switch or shared-checkout edit was made.

A fictional restricted-data marker is held behind an invalid/failed binding
in a test, and the unavailable result contains no evidence. This does not claim
a new sensitive-data detector: upstream restriction and founder escalation
remain required. No private retained customer answers were read or published.

## Verdict

**Pass for PR A offline implementation and rendering.** The independent review
found no blocking implementation defects; its required record corrections and
lockfile note are applied. The optional follow-up changes are self-verified.
Headless print-engine output verifies layout; a
separate spy verifies the `window.print()` callback invocation, and neither
exercises the native OS Save dialog.
Human usefulness (AC-18), B1/B2 and the verified Spec 011 integration are not
claimed complete. After this verification, the founder explicitly authorized
commit, push and PR creation. Next smallest action: review the PR and its
required CI checks before any merge decision.

No commit, push, PR, merge, deployment or live provider call was made during
implementation or the review follow-up. Publication authorization does not
include merging or deployment.

Local evidence (fictional only):

- Follow-up focused log: `/private/tmp/nuave-pr-a-review-resolution-focused.log`.
- Follow-up full gate log: `/private/tmp/nuave-pr-a-review-resolution-verify.log`.
- Current PDF: `/private/tmp/nuave-pr-a-review-resolution-artifacts/new-intake-glm-Spec-012-re-8d586-s-reflow-and-one-print-tree/report-print-a4.pdf` (screenshots in the same directory).
- Current extracted text: `/private/tmp/nuave-pr-a-review-resolution-artifacts/report-print-a4.txt`.
- Follow-up page renders: `/private/tmp/nuave-pr-a-review-resolution-artifacts/print-page-04.png` and `print-page-05.png`.
- Original gate log: `/private/tmp/nuave-pr-a-verify.log`.
- Original browser log: `/private/tmp/nuave-pr-a-final-browser.log`.
- Original duplicate PDFs/screenshots: `/private/tmp/nuave-pr-a-final-browser/new-intake-glm-Spec-012-re-8d586-s-reflow-and-one-print-tree/`.
- Original every-page renders: `/private/tmp/nuave-pr-a-qa/final/`.
- Original extracted text: `/private/tmp/nuave-pr-a-final-report-toolbar-a4.txt` and
  `/private/tmp/nuave-pr-a-final-report-native-a4.txt`.

## Files changed

- `src/lib/audit/report-presentation.ts`
- `src/lib/audit/report-presentation.test.ts`
- `src/lib/audit/report-presentation.fixture.ts` (fictional test helper only)
- `src/app/audit/report/DirectTenReportBody.tsx`
- `src/app/audit/report/ReportAnswer.tsx`
- `src/app/audit/report/AnswerMarkdown.tsx`
- `src/app/audit/report/ReportReferences.tsx`
- `src/app/audit/report/report-body.module.css`
- `src/app/audit/report/report-body.test.tsx`
- `src/app/audit/ReportView.tsx` (imports, method/body wiring; historical subtree indentation only)
- `src/components/product/ReportToolbar.tsx` (PDF default only)
- `src/lib/audit/report-labels.ts` (PDF constant only)
- `src/lib/audit/report-labels.test.ts` (PDF assertion only)
- `tests/e2e/new-intake-glm.spec.ts` (two labels plus report regression)
- `package.json`, `package-lock.json` (approved pins/dependency graph)
- `specs/012-evidence-first-report/PR_A_REVIEW.md` (independent review, unchanged)
- `specs/012-evidence-first-report/VERIFICATION.md`

## B1 offline candidate (2026-09-25)

> Result: **worker PASS, offline; focused independent review pending.** Not merged; Spec 012 stays in progress (B2 and AC-18 pending).
> Base: `8907d96d10ca101f6fdd68c8c77607cd994d83f3` (contains PR #78, PR #74 and privacy PR #79). Branch: `codex/spec012-b1-report-content` (unstaged).
> Record: [B1_IMPLEMENTATION_RESULT.md](./B1_IMPLEMENTATION_RESULT.md).

- AC-11: findings/priorities/order maximum 10. Three stay three, ten pass, eleven fail, zero stays invalid.
- AC-12: direct-ten content guidance goes to all four adapters on initial and language-only retry requests, and the observed-gap clause is kept. Synthesis versions are `report-synthesis-v6` / `report-synthesis-v6-context`. Language calibration was rechecked (20/25, no floor, no field totals), with no change.
- AC-13: the direct-ten header shows the `AI Visibility Report` title, exact brand/scope from `DirectTenAuditContext`, a UTC observation range from retained `observed_at`, and system/answer model. Creation time appears only in `Tentang audit ini`. Contents match body order and stay report-local.
- Inherited A regressions and request counters are unchanged. `npm run verify` passes: 1,429 unit tests, both builds, 29 + 3 browser tests. An 11-page fictional A4 PDF was inspected page by page with PDFKit. The native Save dialog and native zoom were not exercised.
