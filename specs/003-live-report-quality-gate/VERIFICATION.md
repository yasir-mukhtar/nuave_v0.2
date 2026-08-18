# Verification: Spec 003 — Live engine connection and report-quality gate

> Result: **Pending — automated regression and the code-level defects found by
> the fix-round-2 adversarial review are fixed and tested; the live run driven
> through the actual product interface, and the founder quality-gate review it
> unlocks (R-31/R-32, AC-24/AC-26), have not occurred.**
> Reviewer: Adversarial review (`Adversary Review/Phase 3.md`,
> `Adversary Review/Phase 3 - Fix Round 2.md`) + this fix pass
> Date: 2026-08-18
> Spec version or commit: `specs/003-live-report-quality-gate/SPEC.md`, status
> **Approved — implementation in progress** (founder-approved 2026-08-17)
> Implementation version or commit: this working tree (uncommitted), parent
> `c18fe8e` ("fix: connect Indonesian live report pipeline")

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
| N-1 | `ReportView.tsx`'s "Tanpa menyebut bisnis Anda" tile read `counts.unbranded_mentioned` (mentioned **and not** recommended) instead of "appeared regardless of recommendation" — the live run rendered 0/5 under a headline of 8/10 and a conclusion saying the business was recommended | Critical | `buildAuditReport` now computes a `measures` block (`overall`/`unbranded`/`branded` appeared, plus assessed-denominator `recommendation`/`comparison`/`information`); `ReportView.tsx` reads `report.measures.unbranded.appeared` | `contracts.test.ts`: "derives counts from separate detail dimensions" asserts `report.measures` on a case with `unbranded_recommended: 0, unbranded_mentioned: 1` — appeared is `1`, not `0` |
| N-2 | The headline tile put the sentence in the giant `<strong>` slot and the X/10 figure in the small caption `<span>` — the inverse of the fixture reference and of `.resultGrid strong`'s CSS role | Major | Swapped: `<strong>` = `indonesianCountLabel` (X/10), caption = `indonesianHeadline` (sentence), matching `FixtureReportView.tsx`'s structure | Covered indirectly by the `measures.overall` test above; no DOM-rendering test exists in this repo (see "Deliberately not fixed" below) |
| N-3 | `ReportView.tsx` re-derived `appearanceCount` client-side from `report.details`, violating `report-labels.ts`'s "never recompute evidence" rule | Minor | Removed the client-side derivation; the view reads `report.measures.overall.appeared`, computed once in `buildAuditReport` | Same `contracts.test.ts` assertion above covers the server-computed value the view now reads |
| O-2 | Indonesian reports stamped `writing_standard_version: "plain-en-v1"` and `prompt_contract_version: "deterministic-v4-en"` regardless of language; two code comments claimed otherwise | Critical | `AuditReportLabelPack` now owns `writingStandardVersion`/`promptContractVersion`; `buildAuditReport` stamps from the active label pack instead of a module constant; `INDONESIAN_AUDIT_REPORT_LABELS` declares `plain-id-v1` / new `deterministic-v4-id`; corrected the stale `report-language.ts` comment | `report-pipeline.test.ts`: "stamps the Indonesian writing standard and produces Indonesian facts/method copy for language: id" drives `createValidatedAuditReport` end to end and asserts the stamps; `report-language-id.test.ts`'s two founder-approval tests now assert against `buildAuditReport`'s real output instead of a constant equalling itself |
| O-3 | The live report rendered no recommendation/comparison/information measure at all (dropped `unbranded_recommended` entirely) and had no live implementation of the assessed-denominator "Tidak diuji" rule (AC-17) | Critical | Added `measures.recommendation`/`comparison`/`information` (assessed-only denominators) to `buildAuditReport`; `ReportView.tsx` renders a `dimensionList` block using a ported `measureLabel` helper, styled via new `.dimensionList` CSS | `contracts.test.ts`'s `measures` assertion covers the assessed=0 branches (`comparison`/`information` both `{ assessed: 0, ... }` on the fixture case); the "Tidak diuji" zero-denominator formatting itself was already covered by `report-labels.test.ts` |
| O-5 | `SPEC.md` R-33/AC-02 recorded a 276/126/31 baseline that did not match Spec 002's own `VERIFICATION.md` (82 fixture-journey tests) and was never reproducible | Major | Corrected all four `SPEC.md` locations (Required context, Observed evidence, R-33, AC-02) to the measured 276/82/33, with an inline note explaining the discrepancy | N/A (documentation); reproducible via the "Checks run" table below |
| O-6 | `evaluation-results.md` reported real Luna spend (USD 0.0654) as "accounted USD 0.00 by repo convention" — no such convention exists, and R-11 requires evaluation spend to be accounted against the ceiling | Major | Corrected the three places this appeared to state plainly that the spend was measured but never folded into the carryover, with the true headroom (≈ USD 4.4989) alongside the as-recorded figure; left the actual carryover value change as an open founder decision rather than silently rewriting it | N/A (documentation) |
| O-7 | `run/route.ts` and `report/route.ts` accept the full client-supplied `budget` object including `calls`; no server-side session store exists, so a client posting `calls: []` restores full session headroom — the ceiling is enforced per-request, not per-session; `.env.example`'s carryover floor ships blank | Major | Documented the gap explicitly in code (`telemetry.ts`'s `effectiveAuditCarryoverCostUsd`, `run/route.ts`'s request schema) and in `.env.example`, including why a full fix (a server-owned session ledger) is out of this phase's scope per `SPEC.md`'s own Non-scope line ("server-owned order/run state ... Phase 4") — **not implemented**, see below | N/A — deliberately not fixed; see next section |
| O-8 | Telemetry recorded 11 `web_search_call` items across 10 single-attempt observations despite `AUDIT_CALL_LIMITS.observation.max_tool_calls: 1`; the cap is advisory, not enforced by the provider | Major | Documented in `telemetry.ts` that `max_tool_calls` is a requested cap the provider has been observed exceeding, and that real cost accounting is always computed from actual returned `web_search_call` items regardless — so the cost ledger stays correct even when the request-level cap does not hold | N/A — provider-side behavior outside Nuave's code; not something a test can enforce |
| O-9 | No test exercised anything the round-1 fix added: the Indonesian pipeline path, the writing-standard stamp, or the report tile values; `report-language-id.test.ts` asserted constants equal their own literals | Major | Added the `report-pipeline.test.ts` Indonesian end-to-end test above; replaced the two tautological `report-language-id.test.ts` assertions with assertions against `buildAuditReport`'s real output; the tile values (`measures`) are covered by `contracts.test.ts` | See O-2's and N-1's rows above |
| O-10 (m-1) | `NUAVE_LIVE_PROVIDER_TESTING=1` re-enabled Groq/Gemini on the protected live path with nothing stopping it from being set in a real production deployment, contradicting R-13's "cannot be selected for a live protected run" | Minor | `liveAuditProvider`/`liveIndonesianQuestionProviderName` now also require `NODE_ENV !== "production"` before honoring the testing flag | `provider.test.ts`: "ignores the testing flag and fails closed when NODE_ENV=production (O-10)" |
| O-10 (m-2) | A missing `OPENAI_API_KEY` was only discovered deep inside `executeAuditPrompt`'s per-attempt try/catch, misclassified as a retryable technical failure and burning the full 1+2 retry policy across all ten questions (up to 30 guaranteed-failing attempts) before surfacing | Minor | New `assertLiveProviderCredentialsConfigured()` in `provider.ts`, called at the top of `run/route.ts`, `report/route.ts`, and `extract/route.ts` before any provider work begins | `provider.test.ts`: "fails closed before any provider call when OPENAI_API_KEY is missing on the live path (O-10)" and "does not fail closed once OPENAI_API_KEY is configured" |

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
  favor of the data-layer coverage above; verified by code review only.
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

All against this working tree (parent `c18fe8e`):

| Command | Result |
|---|---|
| `npm run test:audit` | **279/279 passed (18 files)** |
| `npx vitest run src/lib/fixture-journey` | **82/82 passed (4 files)** |
| `npm run test:e2e` | **33/33 passed (28 enabled + 3 forced-failure + 2 disabled)** |
| `npm run check` | Passed: typecheck clean, lint 0 errors (14 pre-existing warnings, unrelated to this pass), Prettier clean |
| `npm run build` | Passed |

`SPEC.md` R-33/AC-02's corrected baseline is 276/82/33 (see O-5 above); the
audit-unit count here (279) is 3 higher because this pass added its own
regression tests (O-10) on top of that baseline — not a discrepancy.

## Verdict

**Not a quality-gate pass.** The code-level defects the round-2 adversarial
review found in the round-1 fix (N-1 through N-3, O-2, O-3, O-5, O-6, O-9,
O-10) are fixed and covered by reproducing tests; O-7 and O-8 are documented
rather than fixed, and O-11 is partially fixed with an explicit deferral
decision, for the reasons above. The phase's exit gate (R-32) and the human
judgment gates (AC-24, AC-26) remain open pending O-1: a real Indonesian
report produced by driving a founder-supervised run through the actual
`/audit` + `/api/audit/*` interface, then read against the eight-part exit
gate and recorded here. Do not treat this record as clearing R-31/R-32 or
AC-24/AC-26 — it only clears the automated regression and the specific
defects listed above.
