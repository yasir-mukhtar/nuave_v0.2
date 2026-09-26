# Spec 012 B2 — independent implementation review

2026-09-25. **PASS — accept the bounded offline B2 implementation.**

No actionable findings or blocking questions. No corrective code changes are requested. This review does not complete Spec 012 or AC-18, and does not authorize publication, merging, deployment, or live calls.

## Reviewed state and preservation

- Candidate: `/private/tmp/nuave-spec012-b2/candidate`, branch `codex/spec012-b2-useful-recovery`, HEAD/base `d93ec8256200b662796103246e224bd4a3800603`.
- Reviewed all 25 changed files, including the five untracked files. The complete patch is retained in [reviewed.patch](/private/tmp/nuave-b2-review-eopg00d2/reviewed.patch); SHA-256 `e67e46bfb1301470344be5dab7a70baa7dff8e022535a99353e5a8096480ce18`.
- Used the approved spec from `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174`, independently confirming SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`. Read repository instructions, README, NOW, WORKFLOW, the worker result, and its verification entry.
- The isolated review copy matched all 331 product/test/configuration files before and after verification. All 25 changed-file hashes remained unchanged. Candidate and shared checkout HEAD, branch, index diff and working-tree status matched their initial snapshots. `git diff --check` passed. See [preservation-check.json](/private/tmp/nuave-b2-review-eopg00d2/preservation-check.json) and [product-manifest.json](/private/tmp/nuave-b2-review-eopg00d2/product-manifest.json).

## Implementation assessment

| Area | Independent assessment |
|---|---|
| Direct-ten intermediate schema | `types.ts:454` overrides only the synthesis priorities minimum to zero. Final content and historical synthesis retain their minimums. The four adapter diffs select the method-aware schema at their structured-output/parse boundaries; provider routing, models, transports, search settings and request limits are unchanged. |
| Code-owned P/V actions | `report-noncorrective.ts:11` contains the exact approved strings. Eligibility uses completed, bound normalized evidence, mention and the unchanged no-gap predicate; P requires recommendation and V requires unassessed information. Selection prefers P, then V, then retained ordinal. `report-noncorrective.ts:182` checks the full field set and exact values, with the permitted display-order exception. |
| Insertion and model boundary | `report-pipeline.ts:503` inserts only after normalization, ordinary priority/quality repair and any permitted language revision. Models receive only the no-gap/empty-list instruction. Code-owned candidates never enter initial requests or revision drafts; model-authored copies still undergo ordinary gap validation. Supported corrective actions receive no filler. Empty priorities alone cause no extra model call. |
| Final usefulness gate | `report-pipeline.ts:551` rejects each empty-section combination with `REPORT_USEFULNESS_FAILURE`/422 before `buildAuditReport`, retains call telemetry/diagnostics, and returns no report body. Successful revisions are revalidated first. Existing delivered reports are not reinterpreted. |
| Recovery contents | `report-presentation.ts:216` projects ten usable retained answers with null analysis details. `ReportAnswer.tsx:81` omits classifications when detail is null. `AnswersOnlyRecovery.tsx:19` uses the approved notice, full answers, sources, provenance, copy/raw view and guarded retry. No rejected analysis, measures, report-ready controls, export callback or exporter is attached. |
| Restore, limits and accounting | `SmartAuditStage.tsx:540` preserves the synchronous retry guard; `SmartAuditStage.tsx:553` requires the usefulness failure code and ten completed observations. Existing session fields, ledger, attempt counter and server budget enforcement remain in use. A saved usefulness failure remains readable at the attempt ceiling. A subsequent integrity, transport or limit code uses its own existing recovery path, as the approved failure table specifies. |
| Scope and continuity | No persisted fields, session versions, observation/extraction paths, exporter semantics, final report fields, or live/synthetic controls changed. The active SmartAuditStage integration is the appropriate counterpart of the spec's older LocalAuditStage reference. |

## Checks independently rerun

1. **Canonical `npm run verify`: PASS** in `/private/tmp/nuave-b2-review-eopg00d2/repo`: typecheck, lint (24 warnings, zero errors), formatting, typography, **1,460 unit tests in 95 files**, Next build, OpenNext/Cloudflare build, and **33 browser tests (30 enabled + 3 disabled)**. This includes the affected pipeline, schema, route, recovery, presentation, component and adapter suites. [Verification log](/private/tmp/nuave-b2-review-eopg00d2/verify.log).
2. **22 additional reviewer unit assertions: PASS.** Compared both complete P/V objects and UTF-8 string values directly with the pinned R-13 table at each ordinal 1–10; checked normal earliest selection and rejection of independently reordered observation/detail bindings before template insertion. [Assertions](/private/tmp/nuave-b2-review-eopg00d2/reviewer-probes.test.ts), [log](/private/tmp/nuave-b2-review-eopg00d2/reviewer-probes.log).
3. **Additional reviewer browser regression: PASS.** A fictional usefulness failure retained two nonzero report-call telemetry entries. Two synchronous retry clicks produced one request. That request preserved exact observations, context, questions, carryover and prior costs. A third report-call entry exhausted the existing ceiling while ten answers remained readable and retry disabled through reload and Back/re-entry. No observations or preparation were rerun. Changing the persisted code to integrity, transient or limit failures selected the ordinary recovery path without a request. [Regression](/private/tmp/nuave-b2-review-eopg00d2/reviewer-browser.spec.ts), [log](/private/tmp/nuave-b2-review-eopg00d2/reviewer-browser.log).

The worker's reported gate totals were independently reproduced; they were not accepted solely from the worker record. Reviewer tests/configuration and all generated artifacts reside outside the candidate. No candidate or shared source file was edited.

## Remaining limits

All data and responses were fictional, synthetic or mocked. These checks establish offline behavior, not live provider output quality, successful live interpretation, production Cloudflare bindings/rate limiting, or actual billing. No credentials or private live payloads were inspected. No new PDF/native-print inspection was performed; B2 reuses the answer renderer and adds no recovery export or print controls.

AC-18 remains the separate founder usefulness judgment. This PASS accepts only the reviewed uncommitted B2 snapshot. The next smallest action is the founder's publication decision for this snapshot; no commit, push, merge, deployment or live call was performed.
