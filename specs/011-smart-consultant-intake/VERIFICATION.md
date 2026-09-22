# Spec 011 implementation verification

Date: 2026-09-22. Implementation branch: `devin/sol-smart-consultant-intake-plan`, starting HEAD `194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4`. This is implementation evidence, not independent review or live founder validation. No commit, push, deployment, private evidence inspection, or live provider request was made.

## Completed path

`/audit` accepts a buyer-entered name and public URL. One explicit **Periksa** request obtains identity and extraction through the existing mode-controlled routes. The buyer reviews one prepared summary, selects inline channels/reach/area or uses one required-gap clarification, and confirms once. The v2 frozen confirmation drives the direct-ten writer, ten editable questions, explicit audit start, ten observations, report synthesis, saved-context recovery, JSON v5 download, and print/PDF control. Synthetic browser tests traverse the same route boundaries with labeled substitutes.

## Acceptance evidence

| Criterion | Automated evidence and observation |
|---|---|
| AC-00 | Handover branch/HEAD/status checked before editing. Accepted 2026-09-22 decision and amended spec present. Four preexisting local note hashes matched the prompt and remained unchanged/untracked. |
| AC-01 | `tests/e2e/new-intake-journey.spec.ts` intercepts a rich fictional identity/extraction response: brand focus, two offerings, channel, local reach and one area are selected. Zero typing after **Periksa** reaches ten questions from one summary confirmation, with one identity, extraction and question request. |
| AC-02 | `smart-intake-contract.test.ts` checks exact context, distinct target/needs/considerations, selected differentiator, source and row origins in writer text, no prose-to-structure inference, and optional omission. `smart-journey.test.tsx` inspects the actual v2 question request. Browser comparator and focus tests inspect sent contexts; the revision test corrects a manually added comparator, confirms its exact name, then checks its Back-state removal control. |
| AC-03 | Empty synthetic extraction enters one `clarify` state only for missing category/offering; channel/reach choices stay on summary. `new-intake-journey.spec.ts` exercises the completion. Entered identities receive no fixture facts; old `?fixture=` parameters open the empty v2 entry. |
| AC-04 | Browser tests select an extracted product with no typing and confirm it as the sole offering, then select a location with exact name/address, retained category/offerings/channels, and `market: null`. Returning to brand retains the brand draft in `SmartSummary`. |
| AC-05 | `extractionDraftSchema` bounds the three structured fields. OpenAI extraction tests and the new offline Gemini request test cover the field instructions, valid enum values, retained area and one call; manual and synthetic fallbacks keep unsupported fields empty. Both prompts instruct concise Indonesian explanatory text while preserving official strings and URLs. |
| AC-06 | Literal fictional pre-change v1 intake/audit JSON is parsed under strict old readers for done, running with zero/partial progress, interrupted, report-failed and failed states, including a pre-provider failure with `brief: null`. `smart-journey.test.tsx` verifies the historical hold invokes no fetch and preserves both storage strings byte for byte, even after a fresh v2 entry begins. Old run/report requests fail before provider work. Browser tests cover reload, Back, duplicate actions, material correction, interrupted/partial resume, failed budget read, and report-only retry with saved context, questions, observations and ledger. Revision tests prove Back → audit start never sends a fourth report request or repeats observations, a failed extraction retains validated identity and forwards its returned call ledger, and an in-flight question request leaves an unknown attempt after reload without automatic retry. Reload regressions also restore `running` snapshots captured during unresolved first and third report requests: ten completed observations open report recovery directly; an allowed retry keeps saved context/observations/ledger, while the third attempt stays terminal through Back/re-entry with no new budget, run, or report request. |
| AC-07 | Focused unit and browser suites pass. Final `npm run validate:fast` passed offline (88 files, 1,140 tests). Final `npm run verify` passed offline with dummy build credentials (88 files, 1,140 tests; Next and Cloudflare builds; 28 enabled and 3 disabled browser tests). No founder live walkthrough was authorized or run. |
| AC-08 | `direct-ten-route.test.ts` exercises actual v2 run/report request schemas and old-brief rejection. `openai.test.ts` captures the report provider request: `confirmed_context` and authority appear, `verified_brief` does not. `customer-evidence-export.test.ts` checks v5 exact context and omission of legacy brief/internal metrics and diagnostics. Browser tests inspect run/report payloads, named and category-alternative comparators, ten report details in the print DOM, and original/edited question export equality after reload excluding `exported_at`. Groq and other unsupported testing report adapters reject v2 before provider work. |

The browser print assertion checks rendered print content and that the print control calls `window.print`; it does not claim an operating system save dialog or a generated PDF file was inspected.

## Version boundary

| Artifact | Version or key |
|---|---|
| Frozen confirmation | `nuave-local-intake-input-v2` |
| Facts projection | `nuave.question-facts.v3.2` |
| Question pack | `nuave-local-questions-v2` |
| Intake session | version 2, `nuave.localIntake.v2` |
| Audit context | `nuave-direct-ten-context-v2` |
| Run request | `live-audit-stream-v2` |
| Report request | `live-audit-report-v2` |
| Audit record | version 2, `nuave.localIntakeAudit.v2` |
| Report input prompt | `report-synthesis-v5-context` |
| Report output | `nuave-report-v3` (shape retained) |
| Customer JSON | `nuave-evidence-v5` |
| Direct-ten writer method | `nuave-glm-direct-ten-v1` (unchanged) |

## Historical isolation and remaining legacy consumers

The public `/audit` entry, question route and run/report routes use v2. Valid v1 started/completed records are read only to bind the historical availability hold. Their keys (`nuave.localIntake.v1`, `nuave.localIntakeAudit.v1`), serialized contents and downloaded files are untouched. No v1 report, JSON, print, observation resume or report retry is available in the app. New v2 records use separate keys and cannot delete a valid old pair. This preservation lasts only within existing browser session storage.

Legacy-only code remains as approved: `IntakeJourney`, `LocalAuditStage`, `local-questions.ts` (`sessionConfirmedBrief`, deterministic preparation and old pack parsing), `frozen-intake.ts`, `local-session.ts`, and `local-audit-session.ts` serve strict old records and existing unit/fixture tests, with no public page import. The v1 branch of `question-facts-v3.ts` and `glm-local.ts` remains for historical tests/direct callers; the public GLM route rejects old intake versions. `questions-id.ts` and canonical/historical matrix adapters retain old validation. `local-direct-ten-audit.ts` retains its separate receipt-bound legacy helper. `BusinessBrief` schemas and the v4 `makeEvidenceExport` branch serve legacy/canonical consumers only; the public v2 report route cannot accept a brief. OpenAI's `verified_brief` synthesis branch and testing-only adapters remain for legacy callers; provider selection rejects unsupported v2 report adapters before work. None of these fallbacks constructs a brief for a new v2 session.

## Final offline gates and limits

The first independent review reported six actionable defects after the initial implementation gate: report-recovery bypass through Back, discarded extraction identity/telemetry, an unrecorded in-flight question attempt, erased safe values after sensitive optional input, invisible manually selected comparators, and dropped differentiator/origin writer meaning. The first revision added fixes and focused regression coverage, including a stuck busy state after an aborted report request.

The second independent review reported 145 passing focused tests across nine suites and that the other five fixes appeared addressed, but reproduced one remaining AC-06 defect: a restored `running` record with ten completed observations and three report attempts offered observation resume and sent another run plus a fourth report request. The reviewer did not repeat the full offline gates, builds, or browser suites.

This revision changes `src/app/audit/SmartAuditStage.tsx`, `tests/e2e/new-intake-glm.spec.ts`, and this record. The report dispatch guard now applies the attempt ceiling regardless of saved status. Ten completed observations select report recovery before any budget read or run request, including Back/re-entry. Recovery display uses the saved attempt count without rewriting the restored record. Two browser regressions capture actual unresolved first/third report snapshots and restore them before hydration, modeling termination before the old document can save its fetch rejection. The third-attempt regression failed before the fix because the restored state did not enter report recovery. After the fix, both scenarios and all ten audit browser tests pass; 27 focused unit tests across three suites also pass. The subsequent founder-relayed independent PASS is recorded below.

Final `npm run validate:fast` and `npm run verify` both passed on 2026-09-22 after this revision: 88 unit files/1,140 tests, Next and Cloudflare builds, 28 enabled browser tests, and 3 disabled browser tests. These are implementation-agent results. The offline gate set dummy build credentials; no provider call was made. The linter reported 36 warnings and no errors. Browser regressions confirm that credential-like entry text is excluded from storage while the last safe draft remains, and that sensitive optional text leaves the last safe selection intact. The v2 context parser screens direct run/report requests as well. One earlier `verify` run encountered a timing-sensitive legacy generation-attempt assertion; that test passed in isolation and on subsequent complete runs.

No live business data, provider behavior, operating-system PDF save dialog, or rendered PDF file was validated in this revision.

## Independent recovery re-review — PASS, relayed by the founder

On 2026-09-22, the founder supplied the independent reviewer's final PASS. The
reviewer inspected recovery guards, reload regressions, and this record;
independently ran 27 focused tests; and exercised six mocked recovery cases
covering first/third attempts in running, interrupted, and report-failed states.
All passed. Permitted recovery sends only a report request with saved context,
observations, and ledger. Exhausted attempts send no requests, including after
Back/re-entry. Restoration preserves stored bytes. The reviewer reported all
previous findings closed, no further actionable findings, passing
`git diff --check`, and all four preserved note hashes unchanged.

This is attributed reviewer evidence relayed by the founder, not a second
execution by the orchestrator. The full 1,140-test gate, both builds, and 31
browser checks remain implementation-agent results; the reviewer did not
independently repeat them. The reviewer changed no files and made no live calls.

The remaining acceptance work is an actual rendered PDF check with fictional
offline data, plus the founder's separately authorized preparation-only
desktop/mobile walkthrough in one tab. It stops before final confirmation and
question generation. Use `ACCEPTANCE_WORKER_PROMPT.md`, then
`ACCEPTANCE_REVIEWER_PROMPT.md` for a bounded review of the new evidence.
Founder judgment and rendered-PDF evidence are still pending. Spec 011 remains
Approved, not fully Verified; no live-call or publication permission is implied.
