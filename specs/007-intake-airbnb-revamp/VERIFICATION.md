# Verification: Spec 007 — Blocker A, package 1

> Result: **Pass (A1 package scope only; Spec 007 remains Implementing)**
> Reviewer: Hermes orchestrator
> Date: 2026-08-30
> Spec version or commit: Spec 007 approved 2026-08-30; base `393281d8cf8f95cd3abb8c87976d0b4a849734d7`
> Implementation version or commit: `e8bb703` (implementation commit; this verification record is finalized in the follow-up commit)

## Scope reviewed

- Approved contract: `specs/007-intake-airbnb-revamp/SPEC.md`, R-01, R-02, R-04, R-06, and R-13.
- Changed audit-core files: `contracts.ts`, `measurement-matrix.ts`, `measurement-matrix.test.ts`, `question-suggestion-guards.ts`, `questions-id-live.ts`, `questions-id.test.ts`, `questions-id.ts`, `locked-question-pack.ts`, and `types.ts`.
- Removed the unused legacy English generator and its sole test: `questions.ts`, `questions.test.ts`.
- Verification environment: local macOS checkout in `/Users/yasir/nuave-a1`, Node/npm dependency tree from the repository checkout. No live or paid provider command was run.

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| 1. Pre-payment extraction ordering | Blocked | Package C1 covers the payment boundary and supported-journey routing. |
| 2. Populated AI-drafted intake | Blocked | Package B1 covers the intake workflow and populated field screens. |
| 3. BusinessBrief field ownership | Blocked | Package B1 covers the R-12 field ownership contract and screens. |
| 4. No positional measurement-policy logic outside the canonical matrix | Pass | `measurement-matrix.ts` is the single policy definition; `contracts.ts`, `questions-id.ts`, `question-suggestion-guards.ts`, `questions-id-live.ts`, and `locked-question-pack.ts` consume matrix-derived metadata. The matrix/compatibility derivation regression is covered by `measurement-matrix.test.ts` and `questions-id.test.ts`. |
| 5. Forbidden identities are rejected and required identities cannot disappear | Pass | `validateCanonicalIndonesianQuestionPack` derives every slot from `AUDIT_MEASUREMENT_MATRIX`; agreement tests cover every forbidden audited-brand slot, every required audited-brand slot, forbidden/required comparison-target cases, and slot 6's two prohibitions. |
| 6. A six-unnamed-plus-three-named pack is rejected as invalid 6/4 | Blocked | Package A3 owns the composition flip and its final acceptance tests. A1 includes the matrix-derived canonical composition check but does not change the live/fallback 5/5 composition. |
| 7. Final pack remains semantically 6/4 after corrections and edit policy is enforced | Pass in part | A1 proves the fixed canonical slot policies and canonical 6/4 text validator. Customer edit enforcement, warning behavior, and the 6/4 live pack are package A3. |
| 8. Generation instruction agrees with the matrix | Blocked | Package A3 owns R-07, the instruction rewrite, version bump, and fixture version updates. |
| 9. Report assessment, labels, and denominators derive from the matrix | Blocked | Package A2 owns downstream report and interpretation consumers under R-08. |
| 10. Comparison target derivation and projection | Pass in part | `minimizeIndonesianBrief` preserves a non-empty name with an empty URL; the fallback is recognized by normalized category-fallback equality; fallback leakage is skipped; URL-backed targets remain unchanged. The customer-facing proposal/accept/edit/replace flow is package B1. |
| 11. Scope invalidation and canonical entity_scope | Blocked | Package B1 owns R-14 scope screens and stale-data invalidation. |
| 12. Website/Instagram identity handling | Blocked | Package D1 owns R-21–R-23 source fetching, identity, and rate-limit controls. |
| 13. Reviewed final context reaches audit execution | Blocked | Packages C1 and E1 own the payment-to-run handoff and end-to-end execution scenario. |
| 14. Corrected source re-extracts exactly once and preserves user entries | Blocked | Package B1 owns R-15 source-version correction and preservation behavior. |

## Requirements trace

- **R-01/R-02:** implemented in `AUDIT_MEASUREMENT_MATRIX`, with ten canonical categories, both-direction identity policy, report assessment class, allowed context fields, generator descriptions, customer labels, and slot-9-only comparison relation markers.
- **R-04 steps 1–2:** agreement tests were written before the core migration; the measurement core now reads policy from matrix rows. Current 5/5 compatibility metadata is derived from the same rows and is intentionally retained until A3.
- **R-06 rules 1–5:** canonical identity, composition, and relation checks are executable and covered in `measurement-matrix.test.ts`. The legacy 5/5 path remains separately covered by the existing audit tests.
- **R-06 rule 6 cases (a), (c), and (d):** covered by the name-only fallback, URL-backed projection, and fallback leakage tests. Case (b) remains an explicit A3 case because it requires the slot-9 composition flip.
- **R-13:** `minimizeIndonesianBrief` now projects a comparison target from a non-empty name alone and never invents a URL. Category-level fallback equality uses normalized identity semantics.
- **Legacy generator:** `questions.ts` had no production consumers and was removed with its sole test, so a second complete generator does not remain in the audit core.

## Judgment review

No customer-facing UI or copy was changed in A1. Native-language, accessibility, and journey-comprehension review are not evidenced by this package and remain with the packages that own those surfaces.

## Checks run

- `npm run check` — **passed**; typecheck, lint (17 pre-existing warnings, 0 errors), format check, and typography check all passed.
- `npm run test:audit` — **passed**; 49 test files, 555 tests.
- `npm run test:unit` — **passed**; 58 test files, 656 tests.
- `git diff --check` — **passed**.
- No `npm run test:live-provider`, `scripts/eval`, or other live/paid provider command was run.
- `npm run verify` — **passed**; offline check, unit tests, Next.js build, OpenNext Cloudflare build, and all three E2E configurations completed successfully (47 + 3 + 2 tests).

## Findings

1. The old tuple and legacy category values remain only as a derived compatibility projection for the current 5/5 consumers. They are not an independent policy table. A2/A3 must remove that compatibility layer when downstream consumers and the composition move.
2. R-05's new 6/4 deterministic fallback templates and R-07's generation-instruction/version migration are intentionally not included in A1; they belong to A3.
3. The canonical validator is available and tested now, but the supported live Indonesian generation path still uses the protected 5/5 compatibility contract until A3.

## Verdict

**Pass (A1 package scope).** The canonical matrix, matrix-derived measurement-core policy, R-06 agreement coverage, and R-13 projection are implemented and locally green. This record does not mark Spec 007 verified and does not claim the blocked packages or human gates passed.
