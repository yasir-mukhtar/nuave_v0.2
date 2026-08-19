# Verification: Spec 003 — Live engine connection and report-quality gate

> Result: **Pending — automated regression and the code-level defects found by
> the fix-round-2 and fix-round-3 adversarial reviews are fixed and tested; the
> live run driven through the actual product interface, and the founder
> quality-gate review it unlocks (R-31/R-32, AC-24/AC-26), have not occurred.**
> Reviewer: Adversarial review (`Adversary Review/Phase 3.md`,
> `Adversary Review/Phase 3 - Fix Round 2.md`,
> `Adversary Review/Phase 3 - Fix Round 3.md`) + this fix pass
> Date: 2026-08-19 (round-3 fix pass; round-2 pass recorded 2026-08-18)
> Spec version or commit: `specs/003-live-report-quality-gate/SPEC.md`, status
> **Approved — implementation in progress** (founder-approved 2026-08-17)
> Implementation version or commit: this working tree (uncommitted), parent
> `6c5b8dd` ("fix: Phase 3 fix-round-2 adversarial review findings")

## Why this record exists now, and why it is not a Pass

`SPEC.md`'s own instruction (Implementation notes) is to add this file "when
implementation begins," with automated results (R-33) plus fresh human
reviews for AC-24 and AC-26. Two adversarial review passes since have found
real, reproducible defects; this record exists so the next session inherits a
written state instead of an absent file (the defect the round-2 review itself
flagged as O-4). It is not a verification **Pass** because the phase's central
deliverable — one real Indonesian report produced by driving the founder
through the actual `/audit` + `/api/audit/*` interface, then read by the
founder against the eight-part exit gate (R-32) — has not happened yet. The
one full pipeline run recorded so far (`.secrets/sozo-live-run-2026-08-17/`)
called `runAuditObservations` and `createValidatedAuditReport` directly from a
script, not through the HTTP routes or the access-gated browser surface (round
2 review finding O-1), so it does not stand in for R-31's human read of a
report the product itself rendered.

## Findings fixed in this pass, with reproducing tests

All findings below are from `Adversary Review/Phase 3 - Fix Round 2.md`,
reviewed at `c18fe8e`.

| # | Finding | Severity | Fix | Reproducing test |
|---|---|---|---|---|
| N-1 | `ReportView.tsx`'s "Tanpa menyebut bisnis Anda" tile read `counts.unbranded_mentioned` (mentioned **and not** recommended) instead of "appeared regardless of recommendation" — the live run rendered 0/5 under a headline of 8/10 and a conclusion saying the business was recommended | Critical | `buildAuditReport` now computes a `measures` block (`overall`/`unbranded`/`branded` appeared, plus assessed-denominator `recommendation`/`comparison`/`information`); `ReportView.tsx` reads `report.measures.unbranded.appeared` | `contracts.test.ts`: "counts appearances, not recommendation status, in `measures.*.appeared` (N-1/R3-7)". **Corrected in round 3 (R3-1):** the test originally cited here used a fixture with `unbranded_recommended: 0, unbranded_mentioned: 1`, under which the buggy numerator and the fixed one are both `1` — reverting the fix left the suite green, so it did not reproduce the finding. The named test uses the shape the live run produced (3 recommended, 1 mentioned-not-recommended) and was checked to fail against the reverted line |
| N-2 | The headline tile put the sentence in the giant `<strong>` slot and the X/10 figure in the small caption `<span>` — the inverse of the fixture reference and of `.resultGrid strong`'s CSS role | Major | Swapped: `<strong>` = `indonesianCountLabel` (X/10), caption = `indonesianHeadline` (sentence), matching `FixtureReportView.tsx`'s structure | Covered indirectly by the `measures.overall` test above; no DOM-rendering test exists in this repo (see "Deliberately not fixed" below) |
| N-3 | `ReportView.tsx` re-derived `appearanceCount` client-side from `report.details`, violating `report-labels.ts`'s "never recompute evidence" rule | Minor | Removed the client-side derivation; the view reads `report.measures.overall.appeared`, computed once in `buildAuditReport` | Same `contracts.test.ts` test as N-1 above, corrected in round 3 (R3-1): under the old fixture the deleted client-side `details.filter(d => d.appearance === "mentioned").length` also equalled `1`, so it reproduced nothing either. The replacement fixture separates the two numbers |
| O-2 | Indonesian reports stamped `writing_standard_version: "plain-en-v1"` and `prompt_contract_version: "deterministic-v4-en"` regardless of language; two code comments claimed otherwise | Critical | `AuditReportLabelPack` now owns `writingStandardVersion`/`promptContractVersion`; `buildAuditReport` stamps from the active label pack instead of a module constant; `INDONESIAN_AUDIT_REPORT_LABELS` declares `plain-id-v1` / new `deterministic-v4-id`; corrected the stale `report-language.ts` comment | `report-pipeline.test.ts`: "stamps the Indonesian writing standard and produces Indonesian facts/method copy for language: id" drives `createValidatedAuditReport` end to end and asserts the stamps; `report-language-id.test.ts`'s two founder-approval tests now assert against `buildAuditReport`'s real output instead of a constant equalling itself |
| O-3 | The live report rendered no recommendation/comparison/information measure at all (dropped `unbranded_recommended` entirely) and had no live implementation of the assessed-denominator "Tidak diuji" rule (AC-17) | Critical | Added `measures.recommendation`/`comparison`/`information` (assessed-only denominators) to `buildAuditReport`; `ReportView.tsx` renders a `dimensionList` block using a ported `measureLabel` helper, styled via new `.dimensionList` CSS | `contracts.test.ts`'s `measures` assertion covers the assessed=0 **data** branches (`comparison`/`information` both `{ assessed: 0, ... }` on the fixture case). **Corrected in round 3 (R3-8):** it did not cover the rendering helper — `report-labels.test.ts` covers `indonesianCountLabel`, a different function on a different path. The helper is now `indonesianMeasureLabel` in `report-labels.ts`, imported by both views, with its own zero- and negative-denominator tests |
| O-5 | `SPEC.md` R-33/AC-02 recorded a 276/126/31 baseline that did not match Spec 002's own `VERIFICATION.md` (82 fixture-journey tests) and was never reproducible | Major | **Not fixed in round 2 — see R3-2 below.** The 82 and 33 figures were corrected and are right; the audit-unit figure was rewritten to 276, which was never measured either | Superseded by R3-2 |
| O-6 | `evaluation-results.md` reported real Luna spend (USD 0.0654) as "accounted USD 0.00 by repo convention" — no such convention exists, and R-11 requires evaluation spend to be accounted against the ceiling | Major | Corrected the three places this appeared to state plainly that the spend was measured but never folded into the carryover, with the true headroom (≈ USD 4.4989) alongside the as-recorded figure; left the actual carryover value change as an open founder decision rather than silently rewriting it | N/A (documentation) |
| O-7 | `run/route.ts` and `report/route.ts` accept the full client-supplied `budget` object including `calls`; no server-side session store exists, so a client posting `calls: []` restores full session headroom — the ceiling is enforced per-request, not per-session; `.env.example`'s carryover floor ships blank | Major | Documented the gap explicitly in code (`telemetry.ts`'s `effectiveAuditCarryoverCostUsd`, `run/route.ts`'s request schema) and in `.env.example`, including why a full fix (a server-owned session ledger) is out of this phase's scope per `SPEC.md`'s own Non-scope line ("server-owned order/run state ... Phase 4") — **not implemented**, see below | N/A — deliberately not fixed; see next section |
| O-8 | Telemetry recorded 11 `web_search_call` items across 10 single-attempt observations despite `AUDIT_CALL_LIMITS.observation.max_tool_calls: 1`; the cap is advisory, not enforced by the provider | Major | Documented in `telemetry.ts` that `max_tool_calls` is a requested cap the provider has been observed exceeding, and that real cost accounting is always computed from actual returned `web_search_call` items regardless — so the cost ledger stays correct even when the request-level cap does not hold | N/A — provider-side behavior outside Nuave's code; not something a test can enforce |
| O-9 | No test exercised anything the round-1 fix added: the Indonesian pipeline path, the writing-standard stamp, or the report tile values; `report-language-id.test.ts` asserted constants equal their own literals | Major | Added the `report-pipeline.test.ts` Indonesian end-to-end test above; replaced the two tautological `report-language-id.test.ts` assertions with assertions against `buildAuditReport`'s real output; the tile values (`measures`) are covered by `contracts.test.ts` | See O-2's and N-1's rows above |
| O-10 (m-1) | `NUAVE_LIVE_PROVIDER_TESTING=1` re-enabled Groq/Gemini on the protected live path with nothing stopping it from being set in a real production deployment, contradicting R-13's "cannot be selected for a live protected run" | Minor | `liveAuditProvider`/`liveIndonesianQuestionProviderName` now also require `NODE_ENV !== "production"` before honoring the testing flag | `provider.test.ts`: "ignores the testing flag and fails closed when NODE_ENV=production (O-10)" |
| O-10 (m-2) | A missing `OPENAI_API_KEY` was only discovered deep inside `executeAuditPrompt`'s per-attempt try/catch, misclassified as a retryable technical failure and burning the full 1+2 retry policy across all ten questions (up to 30 guaranteed-failing attempts) before surfacing | Minor | New `assertLiveProviderCredentialsConfigured()` in `provider.ts`, called at the top of `run/route.ts`, `report/route.ts`, and `extract/route.ts`. **Corrected in round 3 (R3-5):** those are the three HTTP handlers, and the live run has never gone through them, so "before any provider work begins" was true only of the route path — the burn was still reachable on the script path the run actually used. `runAuditObservations` and `createValidatedAuditReport` now assert too | `provider.test.ts`: "fails closed before any provider call when OPENAI_API_KEY is missing on the live path (O-10)" and "does not fail closed once OPENAI_API_KEY is configured"; plus the R3-5 rows below for the script path |

## Round-3 findings fixed in this pass, with reproducing tests

All findings below are from `Adversary Review/Phase 3 - Fix Round 3.md`,
reviewed at `6c5b8dd`. Every reproducing test was checked to **fail** against
the reverted code before being kept; the specific revert is named in each row.

| # | Finding | Severity | Fix | Reproducing test (and the revert it was checked against) |
|---|---|---|---|---|
| R3-1 | The N-1/N-3 regression test did not reproduce either finding: its fixture had `unbranded_recommended: 0, unbranded_mentioned: 1`, so the buggy and the fixed numerator were both `1` and reverting `contracts.ts` left the suite green | Major | Added a fixture in the shape the live run produced — unbranded details that are `mentioned + recommended`, `mentioned + not_recommended`, and `absent` — and asserted `measures.unbranded.appeared` against the count of `mentioned`, explicitly **not** against `counts.unbranded_mentioned` | `contracts.test.ts`: "counts appearances, not recommendation status, in `measures.*.appeared` (N-1/R3-7)". Checked: reverting `measures.unbranded.appeared` to `unbrandedMentioned` fails it (expected 1 to be 3) |
| R3-2 | `SPEC.md`'s "corrected to the measured, reproducible baseline: 276 audit unit tests" was never measured. Round 2 measured 275 at `c18fe8e`, `6c5b8dd` added 4 `it` blocks and reports 279, and Spec 002's `VERIFICATION.md` — the cited authority — records 274. `VERIFICATION.md`'s "3 higher than 276" arithmetic was wrong against an unreproducible baseline, and AC-02 as written could never be satisfied | Major | The audit-unit figure at all five `SPEC.md` locations is now Spec 002's directly-measured **274 (18 files)** at its verified commit `83ad34c`, stated as a **floor** rather than a target, since every fix adds its reproducing tests. R-33 and AC-02 are rephrased as non-regression ("at least 274 … with zero failures") with the requirement that the count as run is recorded here against the commit it was measured at. The 82 and 33 figures were already right and are unchanged | N/A (documentation). The arithmetic is reproduced in "Checks run" below, with both endpoints measured in this pass rather than carried forward |
| R3-3 | The three assessed denominators contradicted each other: `normalizeReportEvidence` forces an `absent` detail to `not_recommended` / `not_observed` / `not_assessed`, and the denominators counted `not_recommended` as assessed but the other two as not assessed. A 1-of-10 report rendered "0 dari 10 pertanyaan yang dinilai" next to "Tidak diuji" twice, for the same nine questions; on the live Sozo data the three read 10 / 4 / 8 | Medium | One eligibility rule, applied identically to all three: a dimension is assessed only when the brand **appeared** (`appearance === "mentioned"`) **and** the dimension was judged. `measures.information`'s numerators now read from the same eligible set as its denominator, as recommendation and comparison already did (AC-17) | `contracts.test.ts`: "applies one eligibility rule — appeared and judged — to all three assessed denominators (R3-3)" pins all three against one shared observation set containing absent details, and asserts no denominator can exceed the appeared count. Checked: reverting `recommendationAssessed` to `detailValues` fails it (`{recommended: 3, assessed: 9}` vs `{recommended: 2, assessed: 3}`) and also fails the existing "derives counts" test |
| R3-4 | `measures` is a new required field on `AuditReport`, but the restore path is an unchecked `JSON.parse(saved) as SavedState` under an unchanged `STORAGE_KEY`. A report written by the previous build has no `measures`, so on reload `report.measures.overall.appeared` threw during render — outside the `try/catch`, which wraps only the parse — taking out the report screen for a completed audit | Medium | Both fixes the review offered, in a new pure-logic module `src/lib/audit/workflow-storage.ts`: the key is bumped `nuave.audit.workflow.v3` → `v4` because the saved shape changed, **and** `restorableAuditReport()` structurally checks a restored report and drops it if it does not carry the fields the report screen reads. Optional chaining at the call sites was rejected as the review directed — it would silently render a report with missing numbers | `workflow-storage.test.ts`: 5 tests, including "drops a report written before measures existed instead of crashing the report screen", which builds a current report, deletes `measures`, and asserts both that the guard returns `null` and that the unguarded read the report screen performs throws `TypeError` |
| R3-5 | `assertLiveProviderCredentialsConfigured` was called only from the three HTTP handlers, and the live run has never gone through them (O-1). `scripts/sozo/sozo-live-run.spec.ts` and `scripts/sozo/report-rerun.ts` call `runAuditObservations` / `createValidatedAuditReport` directly, so the 30-guaranteed-failing-attempt burn on a missing `OPENAI_API_KEY` was still reachable — the exact path the "OPENAI_API_KEY absent" failed runs in `evaluation-results.md:298` took | Medium | `runAuditObservations` and `createValidatedAuditReport` now assert before doing any work, guarded by a new `isLiveProviderCall()` so the assertion fires exactly when the injected `execute`/`generate` is a real provider binding. Unit tests that inject their own doubles make no provider call and need no credential | `run-orchestrator.test.ts`: "fails before the first question when OPENAI_API_KEY is missing and a real provider binding is passed" and "covers the env-selected binding the Sozo runner actually uses" (both assert **no** event was emitted); `report-pipeline.test.ts`: "fails before synthesis when OPENAI_API_KEY is missing and the live generator is used", asserting the guard's own message rather than `openai.ts`'s per-call one. Checked: removing either guard fails all three |
| R3-6 | The pipeline ten-of-ten gate ran only for `language === "id"`, directly under a comment claiming "Scripts and future callers must not be able to spend on synthesis for a partial evidence set" — false for English. Round 2 asked for this explicitly and it was neither done nor listed as deferred | Low | The `if` is gone; `assertReportGenerationGate` runs unconditionally in `createValidatedAuditReport`. `report-pipeline.test.ts`'s shared input is now a ten-of-ten evidence set, and the Phase-1 golden 9-completed-plus-1-failed record (`partialInput`) is kept for the gate's own rejection tests and for `buildAuditReport` elsewhere. The stale docstring claiming the gate is not applied inside the pipeline is corrected | `report-pipeline.test.ts`: "blocks English synthesis before the provider on incomplete evidence" and "blocks English synthesis on the partial golden record (9 completed + 1 failed)". Checked: restoring the `if (input.language === "id")` fails both |
| R3-7 | `measures.*.appeared`'s comment said it counts `appearance === "mentioned"` regardless of recommendation, but the code computed `unbrandedRecommended + unbrandedMentioned`. These agree only because `normalizeReportEvidence` forces `absent → not_recommended` two files away; `buildAuditReport` is exported and is called with un-normalized content by tests, where `{ appearance: "absent", recommendation: "recommended" }` would count as an appearance and overstate the headline | Low | `appeared` filters on `appearance === "mentioned"` directly, as the fixture reference does (`fixture-journey/adapter.ts:217-218`), removing the dependency on a cross-file invariant. `types.ts`'s comment is corrected to describe the eligibility rule actually implemented | Same `contracts.test.ts` test as R3-1: its fixture includes a deliberately un-normalized `absent + recommended` unbranded detail. Checked: reverting to `unbrandedRecommended + unbrandedMentioned` fails it (expected 4 to be 3) |
| R3-8 | `measureLabel` was a verbatim copy in `ReportView.tsx` and `FixtureReportView.tsx` with no test on either; the "no component-test framework" deferral did not cover it, since it is pure logic | Low | Moved next to `indonesianCountLabel` in `report-labels.ts` as `indonesianMeasureLabel`, imported by both views. It now also treats a negative denominator as "Tidak diuji", matching `indonesianCountLabel` | `report-labels.test.ts`: "renders an empty assessed denominator as Tidak diuji without calling the sentence builder" (asserts the sentence builder is never invoked) and "builds the measure sentence from a non-empty assessed denominator" |

## Round-3 items left open by design

- **The recorded live-run evidence still has to be regenerated.**
  `.secrets/sozo-live-run-2026-08-17/report-pipeline-output.json` predates
  `measures` and therefore cannot be fed to `ReportView` to produce a rendered
  artifact. Regenerating it means a live run, which is O-1 — deferred with the
  rest of O-1, not additionally deferred here.

## Deliberately not fixed, and why

- **O-1 (Critical) — the run still does not travel through the interface.**
  `scripts/sozo/sozo-live-run.spec.ts` still calls `runAuditObservations` and
  `createValidatedAuditReport` directly; there is still no `POST /api/audit/run`
  or `POST /api/audit/report` call anywhere in the repository's run record.
  Closing this requires an actual live run with real OpenAI spend against a
  running server (`NUAVE_ACCESS_CODE` set) — explicitly deferred at the
  requester's direction in this pass, not attempted here. This is also why
  R-31/R-32 and AC-24/AC-26 cannot be marked Pass in this record: they require
  a report the product itself rendered through the protected surface, read by
  the founder as a sceptical owner and an audit professional.
- **O-7's full fix (a server-owned session cost ledger).** The deeper half of
  O-7 — verifying `budget.calls` against a trusted server-side store instead
  of trusting the client's own running total — was not implemented. `SPEC.md`'s
  Non-scope section explicitly defers "server-owned order/run state" to
  Phase 4, and the live path is founder-operated only in this phase (R-05), so
  the trust boundary this closes does not yet apply to a real adversarial
  client. Building it now would be scope creep beyond this phase's own stated
  boundary. The gap is documented in code and `.env.example` so it is not
  silently carried forward; it must be closed before any customer-facing
  (Phase 4/5) deployment.
- **O-8's cap.** `max_tool_calls` is a parameter sent to a third-party
  provider (OpenAI); Nuave's code cannot force the provider to honor it more
  strictly than it already does. Documented as advisory rather than silently
  left inconsistent with its own field name.
- **N-2's DOM verification.** The headline/figure swap is a structural JSX and
  CSS change with no rendering test behind it: this repository has no
  React component-testing setup (no `@testing-library/react`, no jsdom/
  happy-dom environment — only pure-logic `vitest` tests and Playwright e2e
  against the fixture journey, which does not exercise `ReportView.tsx`).
  Standing up new test infrastructure was explicitly declined in this pass in
  favor of the data-layer coverage above; verified by code review only. This
  deferral covers DOM rendering only — it never covered pure logic that
  happened to live in a component file, which is why R3-8's `measureLabel`
  moved into `report-labels.ts` and was tested rather than deferred again.
- **O-11 (Minor) — explicit decision to defer the run surface's full
  translation.** `AuditStages.tsx` (886 lines, dozens of English UI strings
  across the 03 facts / 04 questions / 05 run stages) stays English; only the
  specific defect the round-2 review flagged — a single Indonesian sentence
  spliced into an otherwise-English paragraph, and two Indonesian phrases
  ("Belum berhasil diuji", "Minta bantuan") embedded mid-English-sentence —
  is fixed, by making those passages internally consistent in English rather
  than half-translated. AC-03's "same customer-meaningful vocabulary" as the
  06 Report still fails for 03–05: a full translation is customer-facing voice
  content of the same kind Spec 002's Indonesian calibration required founder
  sign-off for, and is deliberately not attempted unreviewed in this pass.
  Recorded here as the explicit decision the finding asked for, rather than
  left as a silent gap.

## Checks run

All against this working tree (parent `6c5b8dd`), run on 2026-08-19:

| Command | Result |
|---|---|
| `npm run test:audit` | **295/295 passed (19 files)** |
| `npx vitest run src/lib/fixture-journey` | **82/82 passed (4 files)** |
| `npm run test:e2e` | **33/33 passed (28 enabled + 3 forced-failure + 2 disabled)** |
| `npm run check` | Passed: typecheck clean, lint 0 errors (14 pre-existing warnings, unrelated to this pass), Prettier clean |
| `npm run build` | Passed |

### Audit-unit count reconciliation (R3-2)

Every number below was produced by a run in this pass, not carried forward.

| Commit | `npm run test:audit` | How it was measured |
|---|---|---|
| `83ad34c` (Spec 002 verified) | **274/274 (18 files)** | As recorded in `specs/002-indonesian-audit-contract/VERIFICATION.md`; this is the baseline `SPEC.md` R-33/AC-02 now cites |
| `6c5b8dd` (Phase 3 fix-round-2) | **279/279 (18 files)** | Re-measured in this pass in a clean `git worktree` at that commit, not taken from the round-2 record |
| this working tree (fix-round-3) | **295/295 (19 files)** | `npm run test:audit` |

Arithmetic: 274 → 279 is **+5** across Phase 3's round-1 and round-2 fixes;
279 → 295 is **+16** from this pass — 2 in `contracts.test.ts` (R3-1/R3-3/R3-7),
2 in `report-labels.test.ts` (R3-8), 3 in `run-orchestrator.test.ts` (R3-5),
4 in `report-pipeline.test.ts` (2 for R3-6, 2 for R3-5), and a new
`workflow-storage.test.ts` file with 5 (R3-4). The 19th file is
`workflow-storage.test.ts`.

The round-2 record's claim that 279 was "3 higher" than a 276 baseline is
withdrawn: 276 was never measured at any commit, and 279 is 5 higher than the
274 that was.

## Verdict

**Not a quality-gate pass.** The code-level defects the round-2 adversarial
review found in the round-1 fix (N-1 through N-3, O-2, O-3, O-6, O-9, O-10)
are fixed and covered by reproducing tests, and the round-3 review's eight
findings (R3-1 through R3-8) are fixed, each with a test checked to fail
against the reverted code; O-5 was not actually fixed in round 2 and is
closed here as R3-2. O-7 and O-8 are documented rather than fixed, and O-11 is
partially fixed with an explicit deferral decision, for the reasons above. The phase's exit gate (R-32) and the human
judgment gates (AC-24, AC-26) remain open pending O-1: a real Indonesian
report produced by driving a founder-supervised run through the actual
`/audit` + `/api/audit/*` interface, then read against the eight-part exit
gate and recorded here. Do not treat this record as clearing R-31/R-32 or
AC-24/AC-26 — it only clears the automated regression and the specific
defects listed above.
