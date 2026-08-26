# Post-release report delivery resilience — 2026-08-26

## Production incident

A founder-supervised production audit completed all ten protected observations, retained their evidence and provenance, and completed one report-model call. The following `POST /api/audit/report` returned HTTP 422 with `REPORT_INTEGRITY_FAILURE`, leaving the browser session with `report: null` despite the completed audit.

The production browser-session evidence was inspected outside the repository. It is not committed here. The permanent regression fixture contains only the minimum sanitized formatting pattern needed to reproduce the defect.

## Reproduction

The production session contains multiline observation answers. The previous report builder collapsed internal whitespace when deriving `answer_excerpt`, so an answer such as:

```text
Bisa—kalau kantor Anda di AS, pilihan paling praktis biasanya:

- DoorDash ...
```

could become:

```text
Bisa—kalau kantor Anda di AS, pilihan paling praktis biasanya: - DoorDash ...
```

The report pipeline then required `raw_answer.includes(answer_excerpt)` against the original retained answer. The builder therefore created an excerpt that its own literal-integrity check rejected.

`src/lib/audit/report-delivery-resilience.test.ts` permanently covers the sanitized production-shaped newline case plus newline, multiple-space, bullet-list, CRLF, long-answer, and simple one-line excerpt behavior.

## Exact root cause

The bug was a contradiction between whitespace-normalized excerpt construction and literal-substring validation. Observation evidence itself was not invalid. The failure happened after the protected ten-observation gate and after report synthesis.

The repaired pipeline now derives or repairs an excerpt without rewriting internal characters. Before the final exact-excerpt assertion, every completed observation must satisfy:

```text
raw_answer.includes(answer_excerpt) === true
```

## Hard-integrity vs recoverable-quality policy

The pre-synthesis observation gate remains fail-closed. It still requires exactly ten unique evaluable observations bound to the canonical locked question pack, with the protected production method, requested/returned model, provenance, response evidence, telemetry, and required web-search proof intact.

Report presentation is handled separately after that gate. Unsupported report-layer material is now repaired or omitted when this can be done without changing the retained observations.

## Changes made

- Added literal excerpt derivation and post-normalization excerpt repair.
- Kept the final literal-substring validator as a hard invariant after repair.
- Invalid source URLs continue to be removed from report details and now emit an internal diagnostic.
- Unsupported observed competitors continue to be removed and now emit an internal diagnostic.
- Unsupported priorities, including priorities with unknown evidence IDs, are removed rather than used to reject the audit.
- Removing the last unsupported priority no longer throws an integrity failure; the report can contain zero priorities.
- Prohibited model-authored claims are removed or replaced with deterministic evidence-based neutral copy.
- Contradictory report-level accuracy status is deterministically reduced to the status supported by the retained detail results.
- A language/style retry is still permitted, but a remaining style-only violation is recorded as a warning instead of hiding an otherwise evidence-valid report. If the style retry itself cannot complete, the already evidence-valid first draft remains deliverable.
- Final evidence/revision violations that cannot be repaired safely still fail closed.

## Minimum-report behavior

Once the protected observation gate has passed, the pipeline prefers a truthful reduced report over no report. Observable detail results, literal answer excerpts, attached sources, supported competitor evidence, supported findings, and supported priorities are retained. Unsupported optional synthesis can be omitted.

If every priority is unsupported, the report is delivered with an empty priority list and the diagnostic `minimum_report_fallback_used`. No replacement action is fabricated.

The same principle applies when all optional model-authored narrative in a section must be removed: the retained per-question evidence remains available rather than discarding the completed audit.

## Internal diagnostics

The report pipeline now distinguishes safe internal diagnostic codes from the existing customer-facing failure buckets:

- `observation_gate_failure`
- `excerpt_repaired`
- `invalid_source_removed`
- `unsupported_competitor_removed`
- `unsupported_priority_removed`
- `language_warning`
- `prohibited_claim_removed`
- `minimum_report_fallback_used`
- `unrecoverable_report_failure`

Recoverable diagnostics are attached to report-stage telemetry returned to the browser. The existing workflow already persists that telemetry in session storage, so a founder can inspect the saved audit session after the network request is gone. API error responses also expose the safe diagnostic list without exposing raw provider errors.

## Regression coverage

Permanent tests cover:

1. the sanitized production-shaped newline collapse and literal repair;
2. newline, repeated-space, bullet-list, CRLF, long-answer, and single-line excerpts;
3. one or all unsupported priorities being removed without report denial;
4. invalid source removal;
5. unsupported competitor removal;
6. persistent language/style violations degrading to warnings;
7. prohibited-claim removal with neutral evidence-based replacement; and
8. incomplete underlying observation evidence remaining a hard pre-provider failure.

Existing locked-question, protected model/method, web-search, provenance, and report-integrity regressions remain in place.

## Verification

Executable verification is performed by the repository's normal PR CI because this ChatGPT runtime cannot clone the private repository or execute its Node toolchain locally. No temporary workflow is added for this task.

Final CI results will be recorded here before founder handoff.

- `npm run check`: pending
- `npm run test:unit`: pending
- `npm run build`: pending
- `npm run build:cf`: pending
- `npm run test:e2e`: pending
- `npm run test:live-provider`: **not run by design**

## Safety

- Live provider calls made by this implementation task: **0**
- Paid provider calls made by this implementation task: **0**
- Production deployments made by this implementation task: **0**
- Merges to `main` made by this implementation task: **0**
- Production session committed verbatim: **no**
