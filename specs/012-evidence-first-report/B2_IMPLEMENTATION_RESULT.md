# Spec 012 B2 — implementation result

2026-09-25. **Worker PASS: offline B2 candidate complete.** Next: focused
independent B2 implementation review. This is not independent acceptance,
merge readiness, or verification of all of Spec 012. AC-18's founder
usefulness judgment remains human and separate.

## Objective and base

B2 / block 3b: approved code-owned non-corrective actions, the final
usefulness minimum, and the answers-only recovery for a finished-observation
run whose synthesis retains ten answers but no valid corrective finding/action
survives.

- Candidate: `/private/tmp/nuave-spec012-b2/candidate`, branch
  `codex/spec012-b2-useful-recovery`, unstaged and uncommitted.
- Base: the accepted B1 merge `d93ec8256200b662796103246e224bd4a3800603`
  (PR #80; contains approved B1 head `eb5483e`, Spec 011 PR #78 `7f34d69`,
  report PR A `d08b9e9`, privacy PR #79 `8907d96`). The clone's local
  `origin/main` ref is the shared checkout's stale main (`a7a32cd`); the branch
  is based on the B1 merge commit itself, which the worker prompt requires.
- Approved spec: `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`,
  SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`
  (matches the pin).
- The shared checkout `/Users/hy4-mac-006/nuave_v0.2` was never modified. No
  commit, push, merge, deploy, contact, private-evidence access, or live
  provider call was made.

## What changed

| File | Change |
|---|---|
| `src/lib/audit/types.ts` | New `directTenReportSynthesisSchema` — derived from `reportSynthesisSchema`, overriding only `priorities` to `.min(0).max(10)` (R-13's intermediate generation contract). New `reportSynthesisSchemaForMethod(method)` selector and `DirectTenReportSynthesis` type. `reportContentSchema` minimums (≥1 finding, ≥1 priority) are unchanged; historical synthesis still rejects zero. |
| `src/lib/audit/report-prompt-contract.ts` | `DIRECT_TEN_REPORT_CONTENT_INSTRUCTIONS` count sentence now says "between zero and ten priorities" and adds the R-13 no-gap instruction: return an empty priorities list when no observed gap supports a corrective action; never invent a gap, defect, or action. No template, candidate, or flag wording is described to the model (S4). |
| `src/lib/audit/contracts.ts` | Extracted the unchanged observed-gap predicate as exported `detailShowsObservedGap` — `validateReportContent` calls it per evidence ID with identical conditions, and the non-corrective module reuses the same semantics. Synthesis versions bumped: `report-synthesis-v6` → `report-synthesis-v7`, `report-synthesis-v6-context` → `report-synthesis-v7-context`. |
| `src/lib/audit/report-noncorrective.ts` (new) | Exact P/V template tables from R-13, post-normalization eligibility (completed run + bound detail + `appearance === "mentioned"` + no observed gap; P additionally needs `recommendation === "recommended"`, V needs `information === "not_assessed"`), deterministic selection (P before V, earliest approved ordinal within each), and `isExactCodeOwnedNonCorrectiveAction` — exact-equality validation including the full field set (checked via `Object.keys`, before any parser could strip extra keys), with only display `order` allowed contiguous renumbering. |
| `src/lib/audit/report-pipeline.ts` | Three bounded changes. (1) The language-only retry shape check permits an empty priorities list for direct-ten — an empty list never triggers a retry on its own; only existing language violations do. (2) After normalization, repair, and any permitted revision: when no corrective priority survives, `selectCodeOwnedNonCorrectiveAction` may build at most one eligible P/V action, validated locally by exact equality plus a diff of the unchanged writing-contract errors (baseline vs. with candidate). A local-validation failure is `REPORT_INTEGRITY_FAILURE`, never silent acceptance. The inserted action never enters a prompt or retry draft. (3) R-14 final gate: for direct-ten, empty findings OR empty actions after all processing → `REPORT_USEFULNESS_FAILURE` (422) with retained `reportCalls` telemetry and `usefulness_minimum_not_met` diagnostic; `buildAuditReport` is never called, no section survives, nothing is backfilled. |
| `src/lib/audit/report-recovery.ts` | `REPORT_USEFULNESS_FAILURE` added to `REPORT_FAILURE_CODES`; `noncorrective_action_inserted` and `usefulness_minimum_not_met` added to `REPORT_DIAGNOSTIC_CODES`. `classifyReportRecovery` treats it as retryable only under the existing report-attempt ceiling — same rule as transient failures; integrity stays terminal. |
| `openai.ts`, `gemini.ts`, `groq.ts`, `openrouter.ts` | Method-aware `reportSynthesisSchemaForMethod(input.question_method)` at every structured-output schema and response-parse site. No candidate-payload plumbing, no provider wording about templates. Provider routing, models, transports unchanged. |
| `src/lib/audit/report-presentation.ts` | `AnswerPresentation.detail` is now `ReportDetail \| null`. New `buildObservationAnswers(observations)`: applies the same retained-evidence checks as the ready path (ten unique bound observations, completed runs, non-empty exact question/answer, telemetry, valid timestamp) and returns answer projections with `detail: null`; any failed check returns null so the stage keeps its ordinary failure path. `answerSources` extracted for reuse; no `AuditReport`, measures, or rejected synthesis is constructed. |
| `src/app/audit/report/ReportAnswer.tsx` | The classification `<dl>` renders only when `answer.detail` is present. Question, full answer (AnswerMarkdown), sources, provenance, copy and raw accordion are unchanged. |
| `src/app/audit/report/AnswersOnlyRecovery.tsx` (new) | The R-15 reader: the exact notice `Analisis Nuave belum selesai` with the approved explanatory text, the ten retained answers via `ReportAnswer`, per-answer copy and raw view, and one explicit `Coba buat laporan lagi` button — the retained label. At the report-attempt/cost ceiling it shows the existing `Batas pembuatan laporan tercapai` notice verbatim and disables the button. No conclusion, finding, action, classification, comparator, score, report-ready control, print/PDF/JSON control, download callback, or export route is rendered. |
| `src/app/audit/SmartAuditStage.tsx` | New `recoveryAnswers` projection (`report-failed` + `REPORT_USEFULNESS_FAILURE` + ten completed observations, not busy, not done) renders `AnswersOnlyRecovery` as an early return — before `AuditRunStep`, so no analysis surface can leak in. The report retry handler is hoisted (`retryReport`) with the existing synchronous `inFlightRef` pre-submit guard; `callReport` is unchanged — it reuses retained observations, exact questions, and the forwarded call ledger. |
| `src/lib/audit/report-prompt-contract.test.ts` | The B1-era "does not advertise a B2 non-corrective exception" test updated to B2's contract: asserts the empty-list instruction is present and that template/candidate/flag wording remains absent. |
| `src/lib/audit/openai.test.ts`, `src/lib/audit/contracts.test.ts` | Version pins moved to `report-synthesis-v7` / `-v7-context`. |
| `src/lib/audit/report-noncorrective.test.ts` (new) | 8 tests: exact P and V field tables, earliest-ordinal and P-over-V ordering, ineligibility (gap / failed run / no mention / corrective present / non-direct-ten), exact-equality rejection of edited fields, forged tags, missing keys, foreign evidence, and a per-sentence ≤25-word check of every template field. |
| `src/lib/audit/report-usefulness.test.ts` (new) | 10 tests: direct-ten synthesis accepts `priorities: []` while the persisted and historical contracts still reject it; P insertion on all-positive evidence; V insertion when only unassessed information is eligible; a surviving corrective action receives no filler; the forged model-authored template copy is discarded by ordinary gap validation and never normalized into a passing candidate; the language-only retry draft carries `priorities: []` and never the inserted template; the three R-14 failure shapes (findings empty, actions empty with no eligible candidate, both empty) each throw `REPORT_USEFULNESS_FAILURE`/422 with retained telemetry and the diagnostic; route-level POST returns 422 + code + telemetry + diagnostics + no report, and an explicit retry of the identical request then produces a valid report. |
| `src/lib/audit/report-presentation.test.ts` | 8 added cases for `buildObservationAnswers` (valid projection with null detail; missing/extra/duplicate/failed/blank/bad-time each return null) plus the nullable-detail access fix. |
| `src/lib/audit/report-recovery.test.ts` | `REPORT_USEFULNESS_FAILURE` is a known code, retryable at 2/3 attempts, `terminal_limit` at 3/3. |
| `src/app/audit/report/report-body.test.tsx` | 4 added cases: exact notice + ten exact questions/full answers + sources/provenance; no classification/finding/action/measure/report-ready control; copy + raw accordion; retry fires once per click and disables with the retained limit notice. |
| `tests/e2e/new-intake-glm.spec.ts` | One end-to-end test: intercepted 422 `REPORT_USEFULNESS_FAILURE` → the answers-only recovery shows (notice, ten answers, provenance; no classifications or export controls) → reload restores it with no request → explicit retry replays identical observations/context and the real pipeline finishes the report. |

Not changed: `report-priority.ts` (the sanitizer already routes every
model-authored priority through `validateReportContent`), `report-quality-repair.ts`,
`AuditRunStep.tsx` (the recovery view early-returns above it), `LocalAuditStage.tsx`
(orphaned v1 code with no consumer), the report route's error plumbing
(`error.code` already flows through), session storage (`reportFailure.code` is
a plain persisted string — no schema change), the customer evidence exporter,
and every provider/transport/extraction path.

## Requirement mapping

- **R-13** — the zero-priority intermediate contract is schema-scoped to
  direct-ten; the no-gap instruction is the only new model-facing wording;
  candidates are selected from normalized details + retained observations
  after repair and any permitted language revision, preferring P then V and
  the earliest ordinal; the inserted object is exact-equality checked and
  locally writing-checked; supported corrective actions get no filler.
- **R-14** — the gate runs after all processing: ≥1 supported finding and ≥1
  supported action or `REPORT_USEFULNESS_FAILURE`/422 before
  `buildAuditReport`. Already-delivered reports are never revalidated.
- **R-15** — answers-only recovery: exact notice copy, ten full answers with
  sources/provenance, copy, raw view, the retained retry label and limit
  explanation; persisted via the existing `report-failed`/`reportFailure.code`
  path with retained telemetry; reload restores without a request; retry is
  explicit, guarded, ceiling-bounded, and never reruns observations.
- **R-16/R-17** — no request on read/copy/reload; retry reuses the locked
  evidence and ledger; `nuave-report-v3`/`nuave-evidence-v4`, export
  omissions, and saved provenance unchanged; no persisted fields added.

## Verification

- `npm run verify` — passed offline: 1,460 unit tests across 95 files, both
  builds (Next + OpenNext/Cloudflare), 30 enabled + 3 disabled e2e tests,
  lint (warnings only, pre-existing), format, typography.
- Focused suites: `report-noncorrective` 8, `report-usefulness` 10,
  `report-presentation` 48, `report-recovery` 4, `report-pipeline` 24,
  `direct-ten-route` 31, `report-body` 23, `report-prompt-contract` 13.
- No live provider calls, no paid endpoints, no private evidence.

## Boundaries and caveats

- AC-18 (founder usefulness judgment) is untouched — the deterministic gates
  prove the contract holds, not that a real owner finds the report useful.
- A malformed `report-failed` record that carries the usefulness code but fails
  `buildObservationAnswers` validation falls through to the ordinary
  AuditRunStep failure path — it never guesses at a partial recovery view.
- The usefulness gate applies to newly synthesized direct-ten reports only;
  canonical/historical synthesis keeps its existing minimums.
- `isExactCodeOwnedNonCorrectiveAction` is also a tripwire: because the only
  inserted action is code-built, a local-validation failure is reported as
  `REPORT_INTEGRITY_FAILURE` (a code bug), never as customer-facing usefulness.
