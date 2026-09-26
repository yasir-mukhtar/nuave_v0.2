# Verification: Spec 012 — Evidence-first AI Visibility Report

> Result: **PASS with founder-approved exception (AC-18). Spec 012 Verified on 2026-09-26.** Independent closeout PASS was relayed by the founder and accepted by the orchestrator; see [CLOSEOUT_ACCEPTANCE.md](./CLOSEOUT_ACCEPTANCE.md).
> Date: 2026-09-26
> Prepared by: closeout worker (evidence matrix); final status recorded by orchestrator after founder-relayed independent review. Existing test attribution is unchanged.
> Approved specification: `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`, SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`
> Runtime evaluated: `main` at `d45a944674f29828bdd95bc878ce8ca07ff01818` (PR #81 merge), deployed 2026-09-26
> Closeout record: [CLOSEOUT_RESULT.md](./CLOSEOUT_RESULT.md)

## Combined closeout (2026-09-26)

### Scope and integration order

This section maps AC-01 through AC-19 to the evidence that already exists. No
product code changed after `d45a944`. This closeout reused the attributed
checks listed below; it did not rerun tests, regenerate PDFs, or repeat
founder walkthroughs.

| Step | PR / merge | Base | Main CI on merge (read-only GitHub check, 2026-09-26) |
|---|---|---|---|
| A — presentation | #74 / `d08b9e9` | `4e6b2cf` | [35712356136](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/35712356136): attempt 1 failed (flaky `generation-attempts.test.tsx`); attempt 2 passed validate, the merged-PR gate and deployment |
| Test race fix | #76 / `d679a51` | — | [35715969940](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/35715969940) success |
| A closeout docs | #75 / `7da8003` | — | [35795099105](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/35795099105) success |
| Contents-nav fix (PR A Finding 1) | #77 / `4470deb` | — | [35795727194](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/35795727194) success |
| Spec 011 intake (verified) + A integration | #78 / `7f34d69` | `4470deb` | [36075063156](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36075063156) success |
| Privacy R3 | #79 / `8907d96` | `7f34d69` | [36099502093](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36099502093) success |
| B1 — content and header | #80 / `d93ec82` | `8907d96` | [36123028659](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36123028659) success: 1,429 tests, both builds, 32 browser checks |
| B2 — useful completion and recovery | #81 / `d45a944` | `d93ec82` | [36206938604](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36206938604) success: 1,460 tests, both builds, 33 browser checks (30 + 3), merged-PR gate, deployment |

This follows R-19: A from then-current main, the Spec 011 merge before B1/B2,
B1 on integrated A plus verified Spec 011, and B2 on B1. The documentation half
of R-19 (reconciling the approved report amendments onto main after the intake
merge) is delivered by this closeout candidate.

### Acceptance matrix

"Review" means an independent fresh-context review. "Worker" means the
implementer's own record. All automated evidence uses fictional, synthetic or
mocked data.

| AC | Disposition | Implementation / evidence source | Attribution and limits |
|---|---|---|---|
| AC-01 | **Pass** | A: `report-presentation.ts`, `DirectTenReportBody.tsx`, `ReportAnswer.tsx`. Body test and saved-session browser test (ten exact questions, whole answers, late caveats, reload). | Worker plus [PR A review](./PR_A_REVIEW.md). Rechecked as inherited regressions in the [B1 review](./B1_IMPLEMENTATION_REVIEW.md), the Spec 011 [integration review](../011-smart-consultant-intake/MAIN_INTEGRATION_REVIEW.md) and the [B2 visual result](./B2_VISUAL_VERIFICATION_RESULT.md) (ten tail markers). |
| AC-02 | **Pass** | A: 40 adapter-first tests passed before any UI/CSS edit. B2 added 8 `buildObservationAnswers` cases. | Worker timestamped gate. The PR A review confirmed the 40 adapter tests exist and pass; the adapter-first chronology itself is implementer-reported and not independently provable (the uncommitted tree left no Git evidence of order), though the adapter's lack of any UI dependency is consistent with the claim. B2 cases in the B2 review's canonical run. |
| AC-03 | **Pass** | A: zero, mention-only, and 1/10 recommendation with nine `not_assessed`; corrupt denominator rejected; detail label `Tidak dinilai dari jawaban yang tersedia`. | Worker plus PR A review. The B2 visual result observed the detail label on a completed report and no `Tidak diuji` on completed observations. |
| AC-04 | **Pass** | A: `AnswerMarkdown.tsx` bounded AST policy. Hostile-Markdown fixture; the browser recorded zero external requests. | Worker plus PR A review. B2 visual: literal image/script text and `external = []`. |
| AC-05 | **Pass** | A: exact JS-string comparisons for question/raw/clipboard; truthful clipboard-failure notice. | Worker plus PR A review. B2 visual: raw view and clipboard byte-identical to the stored answer. |
| AC-06 | **Pass** | A: `ReportReferences.tsx`; every reference kept; keyboard focus lands on one target per question. | Worker plus PR A review. B2 visual: evidence link focuses `#report-question-1`. |
| AC-07 | **Pass** | A: empty comparator omitted despite raw names; invalid references unavailable. | Worker plus PR A review. |
| AC-08 | **Pass with accepted qualifications** | A: 1440/390/320px, CSS 200%, keyboard/focus, 44px answer controls; 12-page A4 PDF with every page inspected. B1: 11-page PDF. Spec 011 integration: 11-page PDF. B2: recovery and completed report at all widths; 11-page completed-report PDF with every page inspected. | Worker PDFs; every page inspected independently by the PR A review, B1 review and integration review. B2 pages were inspected by the visual worker, and the orchestrator re-inspected all 11 ([B2 acceptance](./B2_ACCEPTANCE.md)). Qualifications accepted in the cited reviews, not unmet criteria: PDFs come from the headless Chromium print engine. The toolbar's `window.print()` callback was spied, and the native OS Save dialog was not exercised. The PR A review found "toolbar" and "native" PDFs were one capture; toolbar and browser print use the same DOM and print CSS. CSS zoom is not native zoom. Viewport emulation is not a physical phone. The decorative section index wraps at 320px (cosmetic). |
| AC-09 | **Pass** | A: explicit-method routing; `ReportToolbar` default and `INDONESIAN_REPORT_LABELS.download_pdf` are `Download PDF`; label test and e2e locators. | Worker plus PR A review. |
| AC-10 | **Pass** (A; rechecked B1 and B2) | A: snapshot and request-counter browser test. B1: inherited regression. B2: request table (one run; one, two or three report calls for success, retry and ceiling). | PR A review; B1 review; B2 review browser regression; B2 visual result. The export baseline for B1/B2 is the post-Spec-011 `nuave-evidence-v5` / `live-audit-report-v2`, with the inner `nuave-report-v3`. R-17's `nuave-evidence-v4` wording predates Spec 011's approved context versioning. Spec 012 changed no export version. |
| AC-11 | **Pass** | B1: `types.ts` maxima 10; three stay three; ten pass; eleven fail. | Worker plus B1 review (305 focused tests plus probes). |
| AC-12 | **Pass with pre-existing limitation** | B1: `report-prompt-contract.ts` guidance to all four adapters; versions `report-synthesis-v6`/`-v6-context` (B2 later `v7`); language calibration rechecked (20/25, no floor, no field totals). | B1 review. The Gemini provider-side schema conversion is a pre-existing, testing-only limitation that the review did not certify. Mocked requests do not prove real model compliance. |
| AC-13 | **Pass** | B1: `ReportView.tsx` header from the Spec 011 `DirectTenAuditContext`; `report-header.ts` UTC observation window; creation time only in `Tentang audit ini`; contents follow body order. | B1 review, including timezone probes. |
| AC-14 | **Pass** | B2: `directTenReportSynthesisSchema`, `report-noncorrective.ts`, `report-pipeline.ts` insertion after repair/revision; P then V, earliest ordinal; no template in any request. | Worker plus [B2 review](./B2_IMPLEMENTATION_REVIEW.md) (canonical `npm run verify` rerun; 22 reviewer assertions against the pinned R-13 table). |
| AC-15 | **Pass** | B2: ordinary gap validation for model-authored priorities; exact field-set/equality check for inserted actions; forged copies discarded. | Worker plus B2 review. |
| AC-16 | **Pass** | B2: all three empty-section cases produce `REPORT_USEFULNESS_FAILURE`/422 before `buildAuditReport`; recovery reader shows no analysis. | Worker plus B2 review. |
| AC-17 | **Pass** | B2: `AnswersOnlyRecovery.tsx` and `SmartAuditStage.tsx`; copy present; no Nuave print/PDF/JSON control or export; guarded explicit retry; ceiling; Back/reload; other failure codes use ordinary recovery. | B2 review browser regression; B2 visual result (21 focus stops, print media keeps answers, `onbeforeprint` null). The spec names `LocalAuditStage`/`AuditRunStep`; the B2 review accepted the active `SmartAuditStage` as the correct counterpart (a moved-path mapping). |
| AC-18 | **Founder-accepted exception: original same-evidence comparison unperformed and deferred** | No before/after rubric was run on retained real evidence. On 2026-09-26, after the disclosed fictional B2 layout sample (SHA-256 `cdc7626e…a5d3c`), the founder judged the new report more useful and substantially complete, said to keep it and move forward, and deferred format simplification including the long reference/link section ([decision](../../docs/DECISION_LOG.md#2026-09-26--accept-the-current-report-for-now-and-defer-formatting-improvements); [B2 acceptance](./B2_ACCEPTANCE.md#founder-acceptance-for-now--2026-09-26)). | Not a test PASS. No timed rubric results or real-synthesis quality are claimed. The PR A founder check on the real 2026-09-19 record ("good enough for now") is separate, earlier evidence of A's layout only; it is not the integrated B1/B2 comparison. The comparison remains deferred and needs no new founder decision to proceed. |
| AC-19 | **Pass** (code PRs); documentation part delivered by this candidate | Allowlists, base SHAs and dependency pins: PR A review (exact pins `react-markdown@10.1.0`, `remark-gfm@4.0.1`), B1 review (20-file delta), B2 review (25-file delta). Integration order: table above. `npm run verify`: A worker plus reviewer (1,174 tests); B1 worker (1,429) reused by the reviewer; B2 reviewer's independent rerun (1,460). Combined result: the B2 reviewer's run on product files identical to `d45a944` (331/331 hashes), plus main CI on `d45a944`. A fictional restricted-data marker stays behind an unavailable binding (PR A). No persisted fields, schema migration, transport or protected edits (B1/B2 reviews). | The two live-flow tasks are accounted for in [CLOSEOUT_RESULT.md](./CLOSEOUT_RESULT.md#live-flow-tasks). PR A's main CI initially failed and passed on attempt 2 (see table). Docs reconciliation received independent closeout PASS, relayed by the founder and recorded in CLOSEOUT_ACCEPTANCE.md. |

### Requirements trace and carried items

R-01–R-09 are covered by AC-01–AC-10 (A). R-10–R-12 are covered by AC-11–AC-13
(B1). R-13–R-15 are covered by AC-14–AC-17 (B2). R-16–R-17 are covered by
AC-10/AC-17. R-18–R-19 are covered by AC-19. No untested requirement or extra
behavior was reported by any review. Items PR A carried to B1:

- The contents-nav anchors that left the report were fixed by PR #77.
- Header labels and order were delivered by B1 (AC-13).
- Verbatim model link tails such as `?utm_source=openai` still print, as R-04/R-05's
  exact-answer rule requires. The founder's deferred reference-clutter
  simplification covers this; it is not a criterion failure.

### Preserved limits

Headless PDF output is not the native Save dialog. CSS zoom is not browser zoom.
Emulation is not a physical phone. Fictional evidence does not establish real
usefulness. No evidence covers production provider output quality, real billing
or production rate-limit bindings. Spec 011 F-01/F-03/AC-07 stay closed.
Accounting stays USD 1.06241155 of the USD 5 ceiling. No live-call allowance
exists or is granted here.

---

## PR A verification record (2026-09-22; historical)

> Later status (2026-09-26): the header below is the dated PR A record. GitHub
> shows run 35712356136 **attempt 2** (started 2026-09-22T10:01:49Z) passed
> `validate`, the merged-PR gate and deployment on `d08b9e9`; attempt 1 is the
> failure recorded below. PR #76 (`d679a51`) later fixed the test race. See the
> combined closeout above for current status.

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

> Later status: independently reviewed PASS ([review](./B1_IMPLEMENTATION_REVIEW.md)), merged through PR #80 as `d93ec82` and deployed on 2026-09-25 ([acceptance](./B1_ACCEPTANCE.md)).

> Result: **worker PASS, offline; focused independent review pending.** Not merged; Spec 012 stays in progress (B2 and AC-18 pending).
> Base: `8907d96d10ca101f6fdd68c8c77607cd994d83f3` (contains PR #78, PR #74 and privacy PR #79). Branch: `codex/spec012-b1-report-content` (unstaged).
> Record: [B1_IMPLEMENTATION_RESULT.md](./B1_IMPLEMENTATION_RESULT.md).

- AC-11: findings/priorities/order maximum 10. Three stay three, ten pass, eleven fail, zero stays invalid.
- AC-12: direct-ten content guidance goes to all four adapters on initial and language-only retry requests, and the observed-gap clause is kept. Synthesis versions are `report-synthesis-v6` / `report-synthesis-v6-context`. Language calibration was rechecked (20/25, no floor, no field totals), with no change.
- AC-13: the direct-ten header shows the `AI Visibility Report` title, exact brand/scope from `DirectTenAuditContext`, a UTC observation range from retained `observed_at`, and system/answer model. Creation time appears only in `Tentang audit ini`. Contents match body order and stay report-local.
- Inherited A regressions and request counters are unchanged. `npm run verify` passes: 1,429 unit tests, both builds, 29 + 3 browser tests. An 11-page fictional A4 PDF was inspected page by page with PDFKit. The native Save dialog and native zoom were not exercised.

## B2 offline candidate (2026-09-25)

> Later status: independently reviewed PASS ([review](./B2_IMPLEMENTATION_REVIEW.md)), visual follow-up PASS ([result](./B2_VISUAL_VERIFICATION_RESULT.md)), merged through PR #81 as `d45a944` and deployed on 2026-09-26 ([acceptance](./B2_ACCEPTANCE.md)).

> Result: **worker PASS, offline; focused independent review pending.** Not merged; Spec 012 stays in progress (AC-18 founder usefulness judgment pending).
> Base: `d93ec8256200b662796103246e224bd4a3800603` (PR #80, the accepted B1 merge). Branch: `codex/spec012-b2-useful-recovery` (unstaged), isolated clone `/private/tmp/nuave-spec012-b2/candidate`.
> Record: [B2_IMPLEMENTATION_RESULT.md](./B2_IMPLEMENTATION_RESULT.md).

- AC-14: direct-ten initial and language-only retry synthesis accept `priorities: []` via the method-aware schema; the persisted contract and historical methods still require one. With no surviving corrective action, code inserts at most one exact eligible P/V action — verified byte-for-byte against the R-13 table, P before V then earliest ordinal — and no template, candidate or flag enters any model request or retry draft.
- AC-15: a model-authored copy of the template (including a forged discriminator field) is discarded by the unchanged observed-gap sanitizer; the inserted object additionally passes exact-equality and field-set checks plus a local writing-contract check, with no extra provider call.
- AC-16: the three failure shapes (findings empty, actions empty with no eligible candidate, both empty) each fail `REPORT_USEFULNESS_FAILURE`/422 before `buildAuditReport`, with retained telemetry and `usefulness_minimum_not_met` diagnostic; no report body is returned.
- AC-17: the answers-only recovery shows the exact notice, all ten retained questions and full answers, sources and provenance; copy and raw view work; no classification, finding, action, comparator, score, report-ready or print/PDF/JSON/export control renders. Reload restores the state without a request; the explicit guarded retry replays identical observations/context under the existing 3-attempt report ceiling and never reruns completed observations.
- `npm run verify` passes: 1,460 unit tests across 95 files, both builds, 30 + 3 browser tests including the new recovery e2e.
