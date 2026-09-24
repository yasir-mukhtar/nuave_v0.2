# Spec 011 implementation verification

> Current status (2026-09-24): **Verified** on preserved `2a21f85` plus the
> reviewed 316-file product manifest. **F-03/AC-07 closed; F-01 remains closed.**
> The independent [acceptance closeout review](./ACCEPTANCE_CLOSEOUT_REVIEW.md)
> passes every criterion. Dated entries below retain their original evidence
> and pending states; the final closeout entry supersedes those states.

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

## Acceptance REVISE and bounded offline correction — 2026-09-22

The founder relayed the acceptance reviewer's **REVISE** after independent
inspection of all nine original PDF pages, export/saved-data comparison and
preservation checks. Category and offerings were already empty in extraction,
and the founder rejected the prepared understanding. The reviewer also found
`Langkah berikutnya` stranded on page 2 before its first priority on page 3.
This later verdict does not erase the earlier recovery implementation PASS.

The founder authorized the bounded diagnosis and print correction and confirmed
the replacement baseline: branch `devin/sol-smart-consultant-intake-plan`, HEAD
`2a21f856d33264887df6287f9b6d9dd22468fea5`. Branch/HEAD were rechecked after the
founder restored the checkout. This worker made no commit or checkout.

The print-only `.sectionHeading` rule now avoids breaks inside the heading and
after it. An actual before/after browser PDF from the same saved fictional
report reproduced the defect and keeps the heading with its first priority on
page 3 after correction. All nine corrected pages were inspected; all ten
details remain readable without visible clipping, overlap or blank pages.
Saved context/report/observations and filtered exports remain equal. The
[acceptance record](./ACCEPTANCE_EVIDENCE.md#f-01-correction-and-actual-beforeafter-print-evidence)
contains artifact paths, hashes, page-specific findings and rendering limits.

Two mocked SDK-to-preparation protections were added to `openai.test.ts`:
populated service category/offerings survive with website origins when channels
and reach are empty; a valid empty draft retains its accounted attempt without
fabricated facts or an extra call. Both passed with unchanged extraction
runtime. The 46-test focused run passed. Current code and the prior sanitized
response shape narrow the issue to source access versus extraction, but do not
distinguish them. No correction to live preparation is claimed; **AC-07 remains
unaccepted** and a separate diagnostic authorization is required.

This revision worker reran `validate:fast` and the canonical `verify` offline.
Final results: **88 files / 1,142 tests passed**, Next and Cloudflare builds
passed, and **28 enabled + 3 disabled browser checks passed**. Lint has 36
existing warnings and no errors. These are current worker results, not a new
independent review. The first sandboxed fast gate hit loopback `EPERM` and
timing failures; it passed with local-server access. The first full gate hit
the previously recorded timing-sensitive legacy generation-attempt storage
assertion; all three tests in that suite passed in isolation, followed by a
complete unchanged passing gate. Both failed and passing logs are retained in
the acceptance artifact directory. No test or gate was weakened.

The 274-file preservation inventory changed only for the intended print CSS
and extraction test file. The four protected notes retain their hashes and
untracked status; the index is empty and `git diff --check` passes. Current
status and next action were updated in `docs/NOW.md`. No new live call,
publication, credential-value inspection, or private-response inspection was
performed. Native save-dialog behavior, external PDF hyperlinks and physical
mobile use remain unverified. Preparation correction, renewed founder judgment
and independent acceptance closeout remain pending; Spec 011 is still Approved.

## Independent acceptance re-review — BLOCKED overall, F-01 closed

On 2026-09-22 the founder relayed the reviewer's acceptance of the bounded
offline revision at HEAD `2a21f856d33264887df6287f9b6d9dd22468fea5`. The reviewer
independently passed both new mocked regressions, checked the five-file diff,
protected hashes, empty index and `git diff --check`, and rendered/inspected
all nine corrected PDF pages. The priority heading and content share page 3;
all ten details are readable with no clipping, overlap or blank pages. Saved
data and filtered exports match. **F-01 is closed.**

Overall acceptance is **BLOCKED**: F-03/AC-07 still lack a supported distinction
between source-access and extraction failure. Full gates (1,142 tests), builds
and 31 browser checks remain worker-reported; native save-dialog behavior,
external PDF hyperlinks and physical mobile use remain unverified. This is
founder-relayed independent evidence, not a new worker execution.

The founder said **“Not yet”** to diagnostic authorization. Further live work
remains paused. The next step requires separate explicit approval for the
bounded preparation in `ACCEPTANCE_EVIDENCE.md`, followed by diagnosis before
correction and refreshed founder judgment. No live or publication permission
comes from the review. Spec 011 remains Approved, not Verified. Only this
record, the acceptance record and current status were updated in this turn;
runtime/tests and protected notes were preserved.

## F-03 diagnostic capture — offline check, 2026-09-22

The founder conditionally authorized one diagnostic preparation **once ready**
and requested capture verification first. The allowance is unused. The new
[capture plan](./F03_DIAGNOSTIC_CAPTURE.md) records a concrete blocker: current
tool/source metadata does not expose the service content delivered to the
extractor, so it cannot distinguish source-access from extraction failure.

The temporary capture and its Node tests live only in the ignored local
`acceptance-review-2026-09-22/f03-diagnostic/` directory. All **18 mocked checks
passed**, including installed-SDK parsing with a stub transport, request and
response preservation, ambiguous-cause equivalence, omission of private text,
returned/unknown costs, error/size/deadline handling and the disconnected
include-only candidate. This is an offline capture check, not a live diagnosis
or repeated product acceptance gate. The optional `web_search_call.results`
include name exists in installed openai 7.4.0; provider support and proof of
delivery are unverified. No extra field has been sent or connected to runtime.

The plan's bounded request concerns that additional diagnostic observation,
not a second preparation permission. Product runtime, existing tests, budgets,
prompts, retrieval and all protected notes are preserved; no live/source/
provider call, commit or publication occurred. F-01 remains closed and overall
acceptance remains blocked on F-03/AC-07.

## F-03 approved capability check — 2026-09-22

The founder approved the bounded documentation check and conditional diagnostic
include. The check is complete; reviewed official documentation did not
establish the required same-attempt text-content delivery receipt. See the
[findings and exact missing provider answer](./F03_DIAGNOSTIC_CAPTURE.md#approved-capability-check--2026-09-22).
This is a documented evidence gap, not a failed inference request or a claim
that the capability cannot exist. The preparation allowance remains unused.

No new adapter or runtime/test change was made. The prior 18 mocked-check
artifacts are unchanged and were not rerun; no full gate, build, browser or PDF
check was repeated. The 276-file preservation comparison reports zero changed
or missing files, all four protected hashes match, branch/HEAD are unchanged,
the index is empty, and `git diff --check` passes. Only public documentation was
accessed online; no business-source or provider inference call, provider
contact, commit or publication occurred. F-03/AC-07 remain open.

## F-03 provider-reference correction after review — 2026-09-22

The reviewer returned REVISE for an incorrect OpenCode Go attribution while
accepting the evidence limits and readiness hold. The preserved acceptance
runner's four non-secret literal settings were rechecked: direct OpenAI at
`https://api.openai.com/v1`, `gpt-5.6-luna`, low reasoning. The capture plan,
unsent question, acceptance record and current status now target that actual
path. No runner, runtime, test or capture code changed.

The reviewer independently checked documentation, capture/SDK code, preservation
and capture/test/log hashes, branch/HEAD, empty index and diff whitespace; no
tests were rerun. This worker also rechecked all 276 preservation hashes and the
capture/test/log hashes, branch/HEAD, empty index and `git diff --check` after
the documentation correction. All match/pass. The 18 passing mocked checks
remain worker-reported and were not rerun. No further documentation lookup,
live preparation, inference, provider contact, commit or publication occurred.

The already authorized allowance remains unused pending an OpenAI reference or
sanitized answer establishing the field, payload, attempt/source association,
delivery semantics and failure coverage, then offline capture verification.
Missing documentation does not establish unavailable capability. No repeat
authorization is needed; F-01 stays closed, F-03/AC-07 stay open, and Spec 011
stays Approved, not Verified.

## F-03 controlled-input amendment — approved, not yet executed, 2026-09-22

The founder replied **“approved”** to the
[controlled-input proposal](./F03_CONTROLLED_INPUT_PROPOSAL.md). The
[dated decision](../../docs/DECISION_LOG.md#2026-09-22--authorize-the-f-03-controlled-input-diagnostic)
and [spec exception](./SPEC.md#f-03-controlled-input-exception--approved-2026-09-22)
supersede the preceding provider-receipt readiness condition for this one
experiment. The historical cause remains unresolved between source access and
extraction; the empty prepared summary is not accepted.

The [worker handoff](./F03_CONTROLLED_INPUT_WORKER_PROMPT.md) authorizes focused
offline checks of a temporary runner followed by one controlled official-page
input experiment using the existing unused diagnostic allowance, same direct
OpenAI model/settings and existing cost/retry controls. No repeat permission
or provider capability answer is needed. The complete request, including the
bounded literal passage, must enter budget reservation before dispatch.
No usable passage means no paid extraction. The old 18 mocked capture checks
do not verify this new input or runner.

The [reviewer handoff](./F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md) assesses the
runner, accounting, actual evidence and limits after execution. This is not
another product walkthrough or proof of the old cause. A successful experiment
alone cannot close F-03/AC-07 or mark Spec 011 Verified; any resulting product
correction and refreshed founder judgment remain separate work.

This orchestration turn records approval and handoffs only. The allowance
remains unused at handoff. No runtime/test edits, tests, business-source fetch,
provider calls, private-evidence inspection, commit or publication occurred.
F-01 remains closed; F-03/AC-07 remain open and Spec 011 remains Approved.

Orchestrator checks: all 271 tracked runtime/test/script/configuration files in
the scoped before/after inventory are byte-identical, including the pre-existing
CSS and test edits. All four protected-note hashes/statuses and the three
existing capture/test/log hashes match. The 51 local links checked in changed
documentation resolve; new-note whitespace and `git diff --check` pass. Branch
and HEAD remain the required feature branch at `2a21f856d33264887df6287f9b6d9dd22468fea5`,
one commit ahead of the local remote-tracking ref; the index is empty. These
checks do not repeat the worker's earlier 276-file inventory or product tests.

Files changed in this approval-recording turn:

- `docs/DECISION_LOG.md`
- `docs/INDEX.md`
- `docs/NOW.md`
- `specs/README.md`
- `specs/011-smart-consultant-intake/SPEC.md`
- `specs/011-smart-consultant-intake/ACCEPTANCE_EVIDENCE.md`
- `specs/011-smart-consultant-intake/VERIFICATION.md`
- `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_PROPOSAL.md`
- `specs/011-smart-consultant-intake/F03_DIAGNOSTIC_CAPTURE.md`
- `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_WORKER_PROMPT.md` (new)
- `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md` (new)

## Controlled-input worker boundary checks — 2026-09-22

See [F03_CONTROLLED_INPUT_RESULT.md](./F03_CONTROLLED_INPUT_RESULT.md). Five new
offline probes passed: the safe HTML helper omits body content; supplemental
source input is omitted by the existing extractor's actual SDK request; a prior
extraction limits a subsequent technical retry; and stage/cost exhaustion stops
dispatch. These use the installed SDK and unmodified product modules with
fictional/stubbed inputs. Three mock SDK transports and one mock page fetch
occurred; zero live requests. The old 18 capture tests and completed product/PDF
gates were not rerun.

The controlled-input runner remains unready. Worker-prompt Step 2 requires a
concrete proposal before product changes; an unapplied two-file extension patch
is provided and passes `git apply --check` only. Its behavior and the full new
runner readiness matrix remain unverified. No historical cause, service facts,
live field counts, model attention or product correction are inferred. The
allowance remains unused; prior carryover stays unknown pending existing-runtime
confirmation and must not be reset to zero.

All 290 preservation entries match, including the previous 276-file inventory,
current approval documents and all earlier capture artifacts. Protected hashes
and untracked/unstaged status, branch/HEAD/upstream and empty index match;
`git diff --check`, new-note whitespace/links pass. Only the new result note,
acceptance record, this record and current status changed in the repository.
No runtime/test edit, live call, provider contact, commit or publication occurred.
F-01 stays closed; F-03/AC-07 remain open; Spec 011 stays Approved, not Verified.

## Orchestrator extension review — temporary runner reuse, 2026-09-22

The [result continuation](./F03_CONTROLLED_INPUT_RESULT.md#orchestrator-review-and-continuation--2026-09-22)
records review of the exact unapplied patch and six new, independently executed
fictional feasibility checks. A hash/context-checked esbuild overlay changed
only two in-memory modules, reused their original imports/SDK/accounting, and
left product sources untouched. All six checks passed. No old probe or full
product/PDF/browser gate was repeated, and the new runner's full readiness
matrix remains pending. This does not prove live quality or the historical cause.

Continuation is within the approved temporary diagnostic scope, with no further
extension approval needed: finish runner verification and establish configured
carryover, then use the existing unused allowance. Preserve the prior extraction;
one stage slot remains and prevents any subsequent technical retry. The actual
carryover was not inspected here and cannot be inferred from a fresh default.

New check code, two bundles, log and manifest are owner-only and Git-ignored in
the result's `orchestrator-overlay-review/` directory. Original worker artifacts
and the product files remain unchanged; the reviewed patch was not applied to
`src/`. Documentation changed only in `docs/NOW.md`, this record,
`ACCEPTANCE_EVIDENCE.md`, `F03_CONTROLLED_INPUT_RESULT.md`,
`F03_CONTROLLED_INPUT_WORKER_PROMPT.md`, and
`F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md`. No business fetch, provider call,
credential/private-evidence inspection, stage, commit or publication occurred.
F-01 is closed; F-03/AC-07 remain open and Spec 011 remains Approved, not Verified.

This review's scoped before/after comparison matches all 280 entries: 271
tracked runtime/test/script/configuration files, the four protected notes, and
five existing worker artifacts including the original patch. This is separate
from the worker-reported 290-entry check. Protected notes remain untracked and
unstaged, the index is empty, branch/HEAD/upstream match, `git diff --check`
passes, and 47 checked local links resolve. The new ignored review directory is
0700 and its five artifact files are 0600.

## Controlled-input worker continuation — 2026-09-23

[Detailed worker result and hashes](./F03_CONTROLLED_INPUT_RESULT.md#worker-continuation-completed--2026-09-23).
This is worker execution, awaiting independent review; prior independent results
and unverified native/PDF-link/physical-mobile limits remain attributed as before.

- New focused command: `node --test acceptance-review-2026-09-22/f03-controlled-input/worker-continuation/runner.test.mjs` — **35 passed, 0 failed**. Final suite: 30 fictional page transports and ten fictional provider transports, zero live requests. Initial 33/34 fixture-error log preserved; wrong `interface`/`type` mutation corrected in the new test only.
- `node --check acceptance-review-2026-09-22/f03-controlled-input/worker-continuation/live.mjs` passed. Readiness hashes pinned the runner, bundles, tests, log, input and ledger before execution.
- Exact reviewed patch/source/output hashes, context and two-module allowlist verified. Baseline request/SDK transport and default head behavior match. The only request delta is the labeled literal source field. Original reservation input was observed read-only in-process before dispatch; the actual SDK request hash matched it.
- Fetch DNS/redirect/rate/time/byte and privacy/no-text failures block inference; complete UTF-8 source association, carryover floor/prior ledger, empty/unusable output, capture errors, uncertain dispatch/restart and no-downstream conditions passed. Product modules were never patched, replaced or restored.
- Existing development runtime had no configured carryover; the founder approved an explicitly estimated **USD 1.00** reserve. Historical exact spend remains unknown. The prior **USD 0.0217347** extraction remained separate; the original USD 5 and two-attempt limits held.
- Executed the one authorized live experiment: one nominated-page HTTP transport, no redirects/extra documents, then one direct OpenAI extraction transport. The **1,919-byte** inspected passage matched complete request input at reservation/dispatch. One hosted-search call, zero technical retries, zero identity/confirmation/question/observation/report calls.
- Completed parsed category and **8 offerings** survived original preparation mapping; channels/reach/areas stayed empty. Counts establish population, not complete factual accuracy. Retained-passage review supports five offering meanings, partially supports one and leaves two unestablished; hosted search provenance was not captured.
- New accounted usage **USD 0.01325185**; known extraction costs sum **USD 0.03498655**; total including estimated reserve **USD 1.03498655**. Provider-usage accounting is not independent billing verification. Both extraction slots and the diagnostic allowance are consumed; durable claim remains and must not be cleared.
- **303/303** preservation entries match. Protected-note hashes/untracked/unstaged state, branch/HEAD/upstream, empty index and `git diff --check` passed; new note whitespace/local links checked. Ignored directory is 0700, all 25 evidence files 0600.

No old capture/feasibility suite, full `validate:fast`/`verify`, build, browser or
PDF gate was repeated. Only result/acceptance/verification/current-status notes
changed; runtime/tests/configuration, four protected notes and earlier evidence
remain preserved. No staging, commit, publication, provider contact or extra
live preparation occurred. This input worked once; the historical failure is
still unresolved, the candidate product change is only proposed, and founder
judgment has not been refreshed. **F-01 is closed; F-03/AC-07 remain open; Spec
011 remains Approved, not Verified.** Next: independent review of the completed
diagnostic and bounded correction proposal, not another diagnostic call.

## Independent diagnostic review — PASS relayed, 2026-09-23

The founder relayed **PASS — no actionable defect found**. The reviewer reran
all 35 focused checks independently in
`acceptance-review-2026-09-22/f03-controlled-input/reviewer-independent-sflny_vo/`
(log at `offline-check.log:213`), rebuilt the approved overlay, matched all
artifact and 303 preservation hashes, and verified permissions, branch/HEAD,
empty index and whitespace. Capture logic at `worker-continuation/runner.mjs:171`,
the authorized retained passage and ordered events support the request association
and single-call conclusions. Hash equality alone was not the proof.

The independent review agrees that five offerings are supported by the excerpt,
one partly supported and two unestablished there. It does not conclude the
historical hosted search failed or that eight offerings are independently
verified. New cost and total were independently recomputed as USD 0.01325185 and
USD 1.03498655, preserving the prior extraction and estimated reserve separately.
Historical exact carryover and provider billing remain unknown. Live execution
and earlier broad gates remain worker-recorded; no live repeat was performed.

The orchestrator records that PASS without repeating tests or opening private
business evidence. The [product-correction scope](./F03_PRODUCT_CORRECTION_SCOPE.md)
is ready for founder review of the bounded server fetch and explicit no-text
behavior. It preserves existing proposal/provenance semantics rather than
introducing per-value fact matching. This draft does not amend the approved spec
or authorize runtime changes. Both stage slots and the live allowance are consumed;
F-01 stays closed, F-03/AC-07 remain open, and Spec 011 remains Approved, not Verified.

Files changed in this scoping turn: `docs/NOW.md`, `docs/INDEX.md`,
`specs/README.md`, this verification record, `ACCEPTANCE_EVIDENCE.md`,
`F03_CONTROLLED_INPUT_RESULT.md`, the completed-task notice in
`F03_CONTROLLED_INPUT_WORKER_PROMPT.md`, and new `F03_PRODUCT_CORRECTION_SCOPE.md`.
No runtime/test edits, new test executions, live requests, credential/private
evidence inspection, staging, commits or publication occurred.

Scoping checks: all 275 before/after entries match (271 tracked runtime/test/
script/configuration files plus the four protected notes). The notes remain
untracked/unstaged, branch/HEAD/local upstream match the required checkpoint,
the index is empty, and `git diff --check` passes. All 43 local links in the
checked added/working-note content resolve, with no trailing whitespace. This
does not repeat or reattribute the reviewer's 303-entry preservation check.

## Product-correction approval and worker handoff — 2026-09-23

The founder explicitly approved the bounded product correction and requested a
short execution prompt. The new
[worker handoff](./F03_PRODUCT_CORRECTION_IMPLEMENTATION_PROMPT.md) points to
the approved scope, amended Spec 011 and dated decision. It authorizes code and
offline gates, with no repeat scope approval. It does not authorize another live
call, renew the consumed allowance, accept product quality or mark the spec Verified.

Documentation changed: `docs/DECISION_LOG.md`, `docs/NOW.md`, `docs/INDEX.md`,
`specs/README.md`, `SPEC.md`, `F03_PRODUCT_CORRECTION_SCOPE.md`, the new
`F03_PRODUCT_CORRECTION_IMPLEMENTATION_PROMPT.md`, current-status wording in
`F03_CONTROLLED_INPUT_WORKER_PROMPT.md` and `F03_CONTROLLED_INPUT_RESULT.md`,
`ACCEPTANCE_EVIDENCE.md`, and this record. No runtime/test changes, test execution,
private-evidence access, provider calls, staging, commits or publication occurred.
F-01 remains closed; F-03/AC-07 remain open; Spec 011 remains Approved.

Handoff checks: the scoped 275-entry before/after inventory is unchanged,
including existing runtime/test edits and all four protected notes. Branch/HEAD/
local upstream match; the index is empty. `git diff --check`, checked-note
whitespace and all 70 inspected local documentation links pass. The new worker
prompt is 251 words. No implementation gate was rerun for this documentation task.

## F-03 product correction — offline implementation, 2026-09-23

The [implementation result](./F03_PRODUCT_CORRECTION_IMPLEMENTATION_RESULT.md)
is the current worker handoff for the founder-approved scope. It lists the
thirteen changed/new product/test files, preservation evidence and reviewer
instructions. The active Smart preparation receives one additional safe document
read, at most 8,000 UTF-8 bytes as server-owned user data before the original
reservation. Synthetic/Instagram/testing-adapter paths remain truthful; hosted
search, prompts, settings, cost/stage limits and existing technical retry remain.
The no-text notice/source-error enum survives relevant Back/reload flows without
replaying work or entering confirmed/audit/export contracts.

Actual checks performed in this implementation task:

| Check | Worker result |
|---|---|
| Focused offline tests, shared working tree | PASS: 211 tests, nine suites |
| `validate:fast`, exact product copy | PASS: type/lint/format/typography and 1,210 tests, 90 suites; 23 existing lint warnings, zero lint errors |
| Canonical `verify`, same copy | PASS: all checks/tests, Next and Cloudflare production builds, 28 enabled + three disabled browser checks |
| Current product copy versus working tree | 316 selected files match; no product/check/config substitution |
| Initial preservation inventory | 288 unchanged of 298; ten approved existing product/test edits, no missing files; three new source/test files additional |
| Protected notes/prior revision | All four note hashes/statuses preserved; print CSS and prior extraction tests unchanged |
| Checkout/index/whitespace | Required branch/HEAD/upstream unchanged; empty index; `git diff --check` passes |

The broad gate was **not** passed in the shared tree: `eslint .` scanned retained
ignored diagnostic bundles and reported 53 existing errors there. Those files
and the lint configuration remain untouched. Gates ran unchanged in the isolated
copy at `/private/tmp/nuave-f03-offline-dw4b45te`, without credentials/private live
evidence/archive, using the already installed dependencies and dummy build values.
Initial formatting, loopback sandbox and dependency-symlink failures are recorded
alongside the successful reruns. This environmental qualification must accompany
any attribution of the broad PASS. No provider was called; no diagnostic allowance
was reused. The 68 added tests use only fictional source/provider fixtures.

Logs, initial public-source snapshots, preservation/copy inventories and artifact
hashes are owner-only and ignored in
`/Users/hy4-mac-006/nuave_v0.2/acceptance-review-2026-09-22/f03-product-correction/`.
New tests cover real Smart/API/SDK input delivery, source/private/rate failures,
request equivalence and caller injection, retry/ledger/carryover limits, static
selection boundaries, sparse unknowns, origins, notices and safe restoration.
They establish application behavior under mocks, not live source quality or
provider-side receipt. No old live evidence/PDF was reinspected; no staging,
commit, publication or live work occurred.

Independent product review is next. Only its pass followed by a separately
authorized successful founder walkthrough and judgment can close F-03/AC-07.
F-01 remains closed; Spec 011 remains Approved, not Verified. Historical
source-access versus extraction failure, live quality and the previously recorded
native-save/hyperlink/physical-mobile limits remain unresolved or unverified.

## F-03 selector revision after independent REVISE — 2026-09-23

The [independent review](./F03_PRODUCT_CORRECTION_REVIEW.md) passed the previous
offline gates but reproduced two exclusion gaps. The worker corrected numeric
zero opacity and conventional customer-review labels; no extraction request,
accounting, storage or downstream contract changed. Three product/test files
changed; the review and earlier evidence remain unchanged.

The revision adds 22 fictional cases. Pre-fix runs had 15 failures and 71 passes;
afterward the two affected suites pass all 86 tests, all nine focused suites
pass 233 tests, and the reviewer's unchanged seven standalone assertions pass.
These are worker reruns. See the [revision result](./F03_PRODUCT_CORRECTION_IMPLEMENTATION_RESULT.md#two-selector-findings-corrected--2026-09-23)
for final broad gate outcomes, the matching 316-file copy and preservation/log
hashes. The shared-tree lint limitation remains; neither lint policy nor private
evidence was changed. Independent re-review is next; no acceptance criterion is
closed by these worker checks. F-01 stays closed; F-03/AC-07 stay open; Spec 011
remains Approved, not Verified.

## F-03 correction independently passed; walkthrough plan — 2026-09-23

[Re-review 2](./F03_PRODUCT_CORRECTION_REVIEW_2.md) independently passes seven
original assertions, 233 focused tests, `validate:fast` and canonical `verify`
(1,232 tests, both builds and 31 browser checks) in a matching isolated copy.
Both previous findings are resolved; no additional finding was identified.
The shared-tree lint obstruction remains. This is an independent offline PASS,
not refreshed live founder acceptance.

The [prepared walkthrough](./F03_FOUNDER_WALKTHROUGH.md) is the next handoff.
Source nomination, current numeric accounting and fresh live authorization are
pending. The planning turn checks documentation and preservation only; it does
not repeat the gates or initiate live work. F-01 stays closed; F-03/AC-07 stay
open; Spec 011 stays Approved, not Verified.

## F-03 refreshed live preparation executed — 2026-09-23

After source nomination and explicit founder authorization, the worker executed
one ordinary Periksa on the reviewed product at the dedicated local endpoint.
The same tab was inspected at 1440 × 1000 and 390 × 844. Readiness was 15.480 s;
one identity request and one extraction request completed, with one successful
direct OpenAI `gpt-5.6-luna` provider attempt, one hosted search call and no retry.
The response reported `source_excerpt_status: included`. New accounted cost
was USD 0.01287795, totaling USD 1.04786450 with the authorized minimum carryover;
the historical estimate remains an estimate. There were no downstream requests
or final confirmation, and no additional preparation is authorized.

Category, four offerings and two channels were populated. Reach was absent from
both the returned draft and screen, leaving confirmation disabled. The upstream
cause is unresolved; no excerpt was retained to distinguish unavailable facts
from extraction omission. English generic category/context text is a live R-03
language gap; official names remain protected. Accuracy of the proposals and
rich local-case suitability are not established. The source disclosure was
visible but not expanded; a later computer-access attempt stalled on permissions.

See [acceptance evidence](./ACCEPTANCE_EVIDENCE.md#2026-09-23-refreshed-live-preparation-executed)
for measurements, origins, evidence locations and limits. This is worker-recorded
live evidence, not independent reproduction or founder acceptance. The founder's
required judgment was requested and remains pending. No code changed; the
316-file reviewed product still matches and the existing offline PASS remains
attributed to its original checks. F-01 stays closed; F-03/AC-07 stay open;
Spec 011 stays Approved, not Verified.

## F-03 founder judgment received — 2026-09-24

The founder reviewed the prepared result and stated: "Completeness is a bit
lacking. Everything else is acceptable." This closes the pending-feedback
step, not the full acceptance gate. The identified empty fields are optional
target customer and required market reach. No replacement value was supplied,
and the missing reach still has an unresolved upstream cause.

See the [exact review and interpretation](./ACCEPTANCE_EVIDENCE.md#2026-09-24-founder-review-received).
Next is independent review of completeness and the retained evidence limits,
then the smallest supported correction. Earlier language/source-disclosure/
rich-case observations remain recorded, without recasting them as a founder
rejection. No contract, code, test, live allowance or accounting changed.
F-01 stays closed; F-03/AC-07 stay open; Spec 011 stays Approved, not Verified.

## F-03 source-support result reviewed — 2026-09-24

The orchestrator accepts the [single-page result](./F03_SOURCE_SUPPORT_RESULT.md)
for its bounded conclusion: the inspected geographic ambition survives selection
but does not establish current coverage; no explicit customer segment or justified
code correction is established. The [acceptance review](./ACCEPTANCE_EVIDENCE.md#2026-09-24-source-support-result-reviewed)
records inspected passages, helper/metrics/logs and independently matched hashes
(12 artifacts; 580 pre-existing files before status edits). The worker's 124 tests
and 10 helper checks were not rerun. The source fetch was not repeated.

Its allowance is consumed; historical extraction cause remains unresolved and
accounted cost stays USD 1.04786450. Next is founder-supplied intended reach and
applicable areas through existing controls with owner origin, stopping before
confirmation. This does not establish the automated rich local path or close
remaining acceptance limits. F-01 stays closed; F-03/AC-07 stay open; Spec 011
stays Approved, not Verified. No runtime, contract or spec change was made.

## F-03 location-source implementation — worker checks, 2026-09-24

The approved instruction-only correction is implemented on the preserved
handoff baseline. [Result and exact evidence](./F03_LOCATION_SOURCE_IMPLEMENTATION_RESULT.md)
record two intended pre-fix failures/74 passes, then 259 focused tests passing,
`validate:fast` passing and canonical `verify` passing: 1,244 tests in 90 suites,
Next and Cloudflare/OpenNext builds, and 31 browser checks. Final lint has zero
errors and 23 pre-existing warnings. The final 316-file isolated product matches
the shared product; dummy/blank credentials and permitted loopback tests were
used. The known shared-tree lint obstruction remains; its gate was not claimed
to pass. Earlier environment failures and final reruns are retained in the logs.

Actual request/parity, retry, summary/confirmation, writer, report-context and
export checks preserve the approved broad-presence meaning and separate channel
values. They do not demonstrate live discovery or model interpretation. No
runtime fetcher, mapper, schema, UI, accounting, report contract or protected
message changed; the four protected notes and prior fixes remain intact.

These are worker results. Independent review is next. Current main `4470deb`
also requires separate reconciliation with the preserved `2a21f85` baseline:
the isolated integration probe conflicts in `ReportView.tsx` and
`new-intake-glm.spec.ts`. That integration was not performed, and these checks
are not a current-main integration PASS. No live calls or confirmation occurred;
accounting remains USD 1.04786450 of 5. F-01 stays closed; F-03/AC-07 stay open;
Spec 011 stays Approved, not Verified.

## F-03 location-source independent PASS accepted — 2026-09-24

The [independent review](./F03_LOCATION_SOURCE_REVIEW.md) passes the bounded
instruction correction on founder-approved preserved baseline `2a21f85`, with
no actionable finding. It independently ran 259 focused tests, `validate:fast`
and canonical `verify`: 1,244 tests, both builds and 31 browser checks, using
a fresh matching isolated copy. All 316 product hashes and preservation checks
passed. No current-main integration or live discovery was verified.

The orchestrator read the result and review, checked all 316 candidate hashes
against the current checkout, matched the review's four published artifact hashes
and inspected the gate logs. Gates were not rerun in this documentation turn;
the independent executions are the reviewer's. Product files remain unchanged.

The [prepared walkthrough handoff](./F03_LOCATION_SOURCE_WALKTHROUGH_PROMPT.md)
is the next acceptance step and still requires fresh live authorization. It
uses one ordinary preparation, inspects source disclosure and desktop/mobile
meaning in one tab, and stops before confirmation/downstream calls. This is
not a rich-local acceptance waiver or proof that a later model respects every
channel's geographic limits. Current-main report/browser conflicts remain
separate before PR readiness. No call or new spend occurred; accounting stays
USD 1.04786450 of 5. F-01 stays closed; F-03/AC-07 stay open; Spec 011 stays
Approved, not Verified.

## F-03 location-source live walkthrough — 2026-09-24

The founder authorized and the orchestrator executed the
[bounded walkthrough](./F03_LOCATION_SOURCE_WALKTHROUGH_RESULT.md). Actual live
evidence records one identity request, one extraction request/attempt, one
hosted-search call, no retry, excerpt included and a prepared summary in
15.680 seconds. The required national reach proposal has no active city list;
confirmation became enabled without further typing and remained unclicked.
Optional target stayed absent. Expanded source disclosure and the same selected
meaning appear in retained desktop/mobile screenshots. Zero downstream requests
occurred, and post-inspection request counts remained unchanged.

All 316 reviewed product hashes match both the dedicated local copy and shared
checkout. The separate fictional driver check passed before live dispatch.
No product edits or repeat broad gates were made. The result records the initial
startup bundler error, supplementary text-capture timeout after successful
screenshots, OS permission delay, exact evidence paths/hashes and interpretation
limits. These execution observations are not another independent code review
or proof of provider-internal retrieval.

New accounted spend is USD 0.01454705; cumulative accounting is USD 1.06241155
of 5 including carryover. The allowance is consumed. Founder judgment is pending,
followed by explicit remaining-criteria review; the nominated whole-brand case
does not establish the representative rich-local criterion. F-01 stays closed;
F-03/AC-07 stay open; Spec 011 stays Approved, not Verified. Current-main
integration remains separate before PR readiness.

## Founder acceptance received — 2026-09-24

The founder explicitly answered **“Accept the reach and prepared summary”**
for the latest desktop/mobile result. The live founder-judgment step is complete;
no replacement fact or correction was requested. The exact judgment is recorded
in [acceptance evidence](./ACCEPTANCE_EVIDENCE.md#2026-09-24-founder-accepted-the-reach-and-prepared-summary)
and the walkthrough result. The application remains unconfirmed; no downstream
request or new live allowance follows from this feedback.

Next is the [independent closeout review](./ACCEPTANCE_CLOSEOUT_REVIEW_PROMPT.md)
of existing AC-00–AC-08 evidence. It must distinguish AC-01's fictional intercepted
case from AC-07's live human judgment, identify any real unresolved requirement,
and explicitly decide whether F-03/AC-07 can close and Spec 011 can be Verified.
No additional business test or repeated broad gate is assumed. Existing language
and observability observations remain for proportionate review against the
approved contract; current-main integration stays separate.

No product changes or test/live executions occurred in this feedback turn.
Accounting remains USD 1.06241155 of 5. F-01 remains closed; F-03/AC-07 await
formal closeout; Spec 011 remains Approved, not Verified pending that verdict.

## Acceptance closed — 2026-09-24

The orchestrator accepted [ACCEPTANCE_CLOSEOUT_REVIEW.md](./ACCEPTANCE_CLOSEOUT_REVIEW.md):
**PASS for AC-00 through AC-08. Spec 011 is Verified; F-03 and AC-07 are closed;
F-01 remains closed.** The review maps each criterion to existing evidence and
incorporates the founder's exact acceptance of the live reach and prepared
summary. No additional acceptance gate remains on this preserved baseline.

The verified state is HEAD `2a21f856d33264887df6287f9b6d9dd22468fea5` on
`devin/sol-smart-consultant-intake-plan` plus reviewed uncommitted/untracked
product, identified by the 316-file manifest and SHA-256 in the
[specification verification record](./SPEC.md#verification-record). The
orchestrator matched all 316 product hashes again before recording closure.
The independent review's 259 focused tests, `validate:fast`, canonical `verify`
(1,244 tests, both builds, 31 browser checks), recovery/PDF evidence and authorized
live desktop/mobile preparation retain their original attribution. No tests,
rendering, source fetches or live provider calls were repeated for this closure.
Shared-tree lint remains obstructed by retained ignored evidence; gate PASS
applies to the matching isolated copy.

Preserve the closeout review's bounded language assessment with R-03 unchanged,
unobserved provider-internal retrieval, unresolved historical extraction cause,
accepted regional representation limit and recorded PDF/mobile limits. They do
not leave an unmet acceptance criterion. Confirmation remains unclicked; all
live allowances are consumed and accounting remains USD 1.06241155 of 5.

Current-main integration, PR/CI readiness and release remain separate. Next is
a bounded scope for the report/test integration conflicts; this closure performs
no integration and grants no new execution or publication authority.


## 2026-09-24 — worker current-main integration candidate

Worker offline checks **PASS** in an isolated candidate on freshly fetched main
`4470deb2553ae1413b039191a192828c93c7fcca`. See
[MAIN_INTEGRATION_RESULT.md](./MAIN_INTEGRATION_RESULT.md) for the branch/path,
complete carried/reconciled inventory, reproduction logs, manifest/patch hashes,
final main freshness and unchanged shared-source evidence. This is not an
independent integration PASS or PR/release verdict. Spec 011 remains Verified
on its original accepted manifest; F-01/F-03/AC-07 remain closed.

The combined candidate preserves exact v2 context and historical eligibility
holds alongside main's direct-ten complete-answer renderer, safe Markdown,
report-local navigation, locked dependencies and later intake fixes. A reproduced
Smart browser-Back gap received a marked-history fix; retained-renderer navigation
is tested directly at its component boundary. Browser print assertions now check
the complete-answer tree and `Download PDF`. The retry-success ledger test waits
for persistence, extending PR #76's synchronization without changing its assertions.

Actual worker checks: **402 focused tests in 20 suites**, **13 combined Smart/report
browser cases**, and canonical `npm run verify` **exit 0**: **1,301 tests in 92
suites, both Next/OpenNext builds, 29 enabled plus 3 disabled browser checks**.
Type/lint/format/typography checks passed with 23 existing warnings and no errors.
All 11 pages of the newly generated fictional A4 PDF were visually inspected;
all ten answer starts/caveats appear exactly once, question headings share the
answer-start page and the priority heading shares page 10 with its action.
Desktop 1440px, mobile 390px, 320px reflow and 200% CSS scaling were inspected.
This proves print-engine rendering and a callback spy, not native Save behavior,
physical-device coverage or live discovery. Main's header label/order and printed
URL-tail observations remain separate report work; PR #77 fixed the older nav bug.

No shared-source edit, provider/source call, staging, commit, push, PR, merge or
deployment occurred. Accounting remains USD 1.06241155 of 5. Independent review
is the next action; all live allowances remain consumed.

## 2026-09-24 — independent integration accepted; local PR package complete

[MAIN_INTEGRATION_REVIEW.md](./MAIN_INTEGRATION_REVIEW.md) records independent
**PASS with no actionable integration findings**. Its reviewer independently
ran 402 focused tests and canonical `npm run verify`: 1,301 tests in 92 suites,
both builds and 32 browser checks. All 11 PDF pages and seven viewport screenshots
were independently inspected. The orchestrator accepted that verdict and matched
the candidate and published evidence hashes; it did not repeat those executions.

The [PR-readiness record](./PR_READINESS.md) identifies the completed local
publication package. After the review, only current status/routing documentation
was updated and that record was added. Runtime, tests, dependencies, workflows
and independent reviews remain identical to the reviewed candidate. The original
worker/reviewer manifests and patch are preserved; separate packaging evidence
records the documentation delta and final publication tree.

Main remains `4470deb` at the dated packaging check. The final package still
requires founder approval for commit, branch push and draft PR creation, including
the automatic synthetic preview. Required GitHub `validate` is pending; no
commit, push, PR, preview, merge, production deployment or live call occurred.
Spec 011 stays Verified; F-01/F-03/AC-07 stay closed; Spec 012 B1/B2 remain separate.
Accounting remains USD 1.06241155 of 5.
