# Wave 1 Shared Invariants — Implementation and Certification Report

Date: 2026-08-23

## Purpose and scope

Wave 1 closes the shared correctness invariants identified by the frozen whole-repository review without expanding into Wave 2, Phase 4, or Phase 5. The implementation is limited to locked question identity, protected observation proof, variance binding, comparison-business identity safety, workflow lifecycle/cancellation, transactional browser state, and stream-prefix preservation.

No deployment, merge to `main`, or live/provider execution was permitted during implementation or certification.

## Frozen baseline and certified implementation head

- Frozen `main` baseline: `028aaa72149c81d71b940adfcb16bd144f0df047`
- Frozen baseline tree: `26792f331791e71c710042d4edc31caf37854e1c`
- Previous certification/documentation head, now superseded: `4445be209ddb4e9d30f040d8c78b9599f7ab7412`
- Previous certified implementation code head, now superseded: `0ad5d5e8684c9c2e35c41f5872cc08eafdaf4d90`
- Certified category-ownership correction code head before this documentation-only report update: `5a7032ae0365b8ca9bbc6003816e395ac1168520`
- Integration branch: `fix/wave1-shared-invariants-2026-08-23`
- Draft pull request: #17

The branch tip after this report is a documentation-only certification commit. A commit cannot embed its own resulting SHA; the final branch SHA is recorded in the PR metadata and handoff response.

## Wave 1 finding matrix

| Finding | Status | Closure |
| --- | --- | --- |
| K-01 — stale async work survives reset/start-over | RESOLVED | Workflow generation tokens invalidate prompts, run, report, and variance work; invalidation aborts active requests and suppresses stale commits. |
| K-02 — immutable prompt/evidence binding is insufficient | RESOLVED | One canonical locked-pack boundary owns exact IDs, canonical slot order, category from the existing Indonesian slot-category contract, exact final question text, and derived branded classification; resume/report/variance bind observations back to that exact pack. The final narrow review found that category still survived the client spread and this was corrected. |
| K-03 — protected-call/provenance proof is inadequate | RESOLVED | One positive protected-attempt invariant requires a completed observation-stage attempt, exact method/model/instruction, response correspondence, substantive answer, and actual search execution. |
| K-04 — duplicate prompt IDs rejected too late | RESOLVED | Canonical pack validation rejects duplicate/non-empty ID violations before protected execution. |
| K-05 — malformed NDJSON can discard valid prefix events | RESOLVED | The parser returns valid earlier events, records a terminal malformed-line error, and throws only after the valid prefix has been delivered. |
| K-06 — variance designation not bound to completed locked run | RESOLVED | Variance requires exact locked 10/10 proof and the exact server-canonical designated subset; client designation now uses the same canonical final-question classification and canonical slot category. |
| K-07 — variance completeness can accept weak evidence | RESOLVED | Variance completeness calls the same positive protected-observation invariant; failed, zero-search, wrong-method, or malformed evidence cannot be complete. |
| K-08 — duplicate telemetry/attempt association risk | RESOLVED | Accepted protected observations require one matching completed response-owned attempt; cross-prompt response-ID reuse is rejected and client budget ledgers deduplicate response-owned calls. |
| N-P1-02 — stale AI competitor identity can survive URL edit | RESOLVED | Editing a suggested source URL rebinds it as user input and clears the old AI-provided name. |
| N-P1-03 — credential-bearing comparison URL can reach provider brief | RESOLVED | Comparison-business URLs are validated before provider-bound use and embedded username/password credentials are rejected. |
| N-P1-04 — question generation returned model is not enforced | RESOLVED | Protected question generation validates returned model and response identity; invalid/missing provenance uses deterministic fallback rather than accepting the apparent provider output. |
| N-P1-05 — edited question retains stale branded classification | RESOLVED | `branded` is derived from the exact final question at the canonical lock boundary; variance designation also canonicalizes before selecting repeats. Category remains independently code-owned by slot. |
| N-P1-06 — disconnect/cancel does not propagate through protected work | RESOLVED | Abort signals now flow through browser fetches, run/variance routes, orchestration, retry/backoff, and the provider adapter. |
| N-P1-07 — citation-only response can masquerade as search | RESOLVED | Protected completion requires an actual `web_search_call`; citation annotations alone do not satisfy the invariant. |
| N-P1-09 — initial run POST failure strands workflow state | RESOLVED | Run state commits only after the POST is accepted and a response stream exists; rejected starts preserve the reviewed question pack and retryable state. |
| N-P1-10 — failed resume clears completed observations | RESOLVED | Existing completed observations remain the transactional resume base and are not cleared before request acceptance. |
| N-P1-11 — late question generation can repopulate abandoned state | RESOLVED | Prompt-generation work is generation-bound and aborted/ignored after back/reset/edit invalidation. |
| KX-01 — protected evidence checks diverge across downstream boundaries | RESOLVED | Resume, report, completed-run variance proof, and variance completeness share the same protected-attempt and locked-identity primitives. |

Wave 1 target findings: **18 RESOLVED, 0 PARTIAL, 0 NOT ADDRESSED**.

## Architectural changes

### 1. Canonical locked identity

`locked-question-pack.ts` is the shared lock boundary. It enforces exactly ten questions, unique non-empty IDs, canonical deterministic slot identity/order, exact final question text, category, and `branded` classification derived from the final text rather than trusting stale client metadata. Observation and variance validators bind all downstream evidence to this canonical pack.

The final narrow independent review found one remaining ownership gap: `category` was still inherited from `...prompt`. That is now closed. Current Indonesian IDs (`NVA-ID-01` through `NVA-ID-10`) and the retained legacy deterministic prompt IDs are resolved to their canonical slot identity; the full locked pack must remain in canonical slot order. The category is then read only from the existing `INDONESIAN_SLOT_CATEGORIES` contract. No second category table and no semantic category classifier were introduced. `branded` remains independently derived from the exact final question text, so editing a question can change branded/unbranded classification without changing its code-owned slot category.

Comparison-business edits also use an explicit identity boundary: a changed URL becomes user-supplied identity, stale AI names are removed, and provider-bound comparison URLs must be valid HTTP(S) without embedded credentials.

Protected question generation now verifies the returned model and response identity before model-authored output is accepted.

### 2. Positive protected observation proof

The production observation invariant positively selects one completed observation-stage provider attempt and requires:

- system: `OpenCode Go Responses API`
- requested model: `gpt-5.6-luna`
- returned model: `gpt-5.6-luna`
- instruction version: `neutral-response-v1`
- non-empty raw answer
- non-empty response ID
- matching completed observation telemetry
- matching requested/returned model and response ID
- `web_search_calls > 0`
- no duplicate completed match
- no accepted response ID reused by another prompt

This same proof is used by resume/report/variance boundaries instead of independent weaker approximations.

### 3. Exact variance proof

The variance route requires the complete locked ten, the complete ten protected observations, and the requested 2–3 repeats. Before credential or provider work it verifies exact locked identity, exact 10/10 completed protected evidence, and exact designated subset. Provider execution receives the server-canonical subset rather than arbitrary request prompts.

After the review-only challenge, the browser also derives its repeat subset through the same canonical helper, so edited question text cannot leave variance selection attached to stale `branded` booleans. The final category-ownership correction also re-derives a requested variance prompt's category from its canonical slot ID before exact binding, so a tampered client category cannot become authoritative.

### 4. Workflow generation, cancellation, and transactional state

Prompt generation, run, report, and variance work are associated with a workflow generation and AbortController. Reset, back-navigation, facts edits, question edits, or replacement work invalidate the old generation. Stale results cannot commit to the new workflow.

Run start/resume is transactional: prior completed evidence and reviewed questions are preserved until the server accepts the POST and exposes the stream. Failed initial starts remain retryable. Cancellation propagates through browser fetch, route request signal, orchestration, retry/backoff, and provider execution. The review-only challenge found and closed the remaining variance-route signal gap.

Restored reports do not launch variance when complete main-run proof or the required post-report cost ledger is unavailable; a terminal variance failure record is created instead.

### 5. NDJSON valid-prefix semantics

The stream parser preserves already-valid events when a later line in the same chunk is malformed. The malformed input becomes terminal, but valid prefix events are not erased from the caller's state.

## Intentionally not changed

Wave 1 did not redesign provider architecture, add durable server jobs/state, change Phase 3's browser-bound/sequential execution model, implement payment/persistence/customer delivery, address Wave 2 report/public-surface findings, or begin Phase 4/5. Existing non-Wave-1 lint warnings and dependency-audit notices were not expanded into this scope.

The category correction did not redesign question semantics, infer category from edited question text, add durable state, or add a new category table. It only moved category authority from client metadata to the existing code-owned slot contract.

## Tests added or updated

Permanent Wave 1 coverage includes:

- canonical locked-pack identity, duplicate IDs, edited-text classification, and canonical variance designation
- canonical slot-order proof before category assignment
- slot 1 category tampering (`action` → canonical `need_discovery`)
- slot 7 category tampering (incorrect category → canonical `validation`)
- observation category mismatch rejection and valid canonical-category acceptance
- variance designation/binding after client category tampering
- independence of code-owned slot category from edited-text `branded` classification
- exact resumed observation/question correspondence
- protected observation method and cross-prompt response identity
- protected provider actual-search and AbortSignal handling
- question-generation returned-model provenance/fallback
- abort-aware retry/backoff and run orchestration
- variance route completed-run proof, exact designation, and request-signal propagation
- variance completeness
- NDJSON valid-prefix behavior
- workflow operation generation invalidation
- transactional initial run failure
- restored-report variance suppression without complete evidence
- full report/run fixture migration to canonical protected evidence

The Wave 1 targeted regression set was **46/46 green before the earlier review-only challenge**. That challenge added two permanent regressions, bringing the represented targeted set to **48/48**. The final category-ownership correction adds six permanent canonical-category regressions, so the evolved Wave 1 targeted set is **54/54 represented and passing within the full unit run**.

For this narrow correction, the directly relevant suites all passed in normal CI #427: `locked-question-pack` **13/13**, `variance` **8/8**, `report-pipeline` **24/24**, and `run-orchestrator` **13/13** — **58/58** across those named core suites. They were executed within the repository's full offline unit command rather than through a temporary targeted workflow, which remained prohibited.

## Canonical verification

Certified category-ownership correction code head: `5a7032ae0365b8ca9bbc6003816e395ac1168520`.

| Verification | Result | Evidence |
| --- | --- | --- |
| `npm run check` | PASS | Normal PR CI #427; typecheck + lint + Prettier completed successfully. |
| `npm run test:unit` | PASS | Normal PR CI #427; **45 files, 549/549 tests**. |
| `npm run build` | PASS | Normal PR CI #427; Next.js production build completed. |
| `npm run build:cf` | PASS | Normal PR CI #427; OpenNext Cloudflare build completed with dummy build-only credentials. |
| `npm run test:e2e` | PASS | Normal PR CI #427; **38/38 default + 3/3 forced-failure + 2/2 preview-disabled = 43/43**. |
| `npm run verify` | NOT SEPARATELY EXECUTED | Historical certification note retained from the previous handoff: the available certification harness has no local repository checkout and its container cannot fetch this private repository. The current narrow acceptance request requires the five commands above, all of which passed. |

### PR CI result

Normal PR CI run #427 (`32632259365`) on the certified category-ownership correction code head is **SUCCESS**. The deployment job is **SKIPPED**, as required for a pull request.

The normal `.github/workflows/ci.yml` remains restored. No temporary targeted/diagnostic workflow, artifact logging, or temporary write permission was introduced for this correction.

## Review-only adversarial validator

### First challenge verdict: BLOCK

The earlier isolated review-only challenge found two concrete integration defects:

1. browser variance designation could still use stale client classification after an allowed question edit;
2. the variance route did not pass `request.signal` into retry/provider execution.

Both were fixed narrowly and received permanent regression coverage.

### Second challenge verdict: APPROVE

After those fixes and green canonical CI, the validator re-challenged:

- immutable locked question-pack binding
- exact observation/question correspondence
- exact completed 10/10 variance proof
- protected observation method gate
- returned-model equality
- actual `web_search_call` proof
- resume validation
- workflow generation/cancellation
- transactional run start/resume behavior
- restored-report variance suppression without proof
- NDJSON valid-prefix behavior

No further concrete Wave 1 defect was identified in that pass.

### Final narrow independent review — canonical category ownership

A subsequent independent review found one remaining Wave 1 ownership gap: `canonicalPrompt()` still allowed client-supplied `prompt.category` to survive through `...prompt`. The previous certification/documentation head `4445be209ddb4e9d30f040d8c78b9599f7ab7412` and implementation head `0ad5d5e8684c9c2e35c41f5872cc08eafdaf4d90` are therefore superseded.

The correction proves deterministic slot identity/order first, then derives `category` only from the existing `INDONESIAN_SLOT_CATEGORIES` contract. It does not infer category from question semantics. Six permanent regressions cover two separate tampered slots, slot-order proof, wrong/valid observation category binding, variance category canonicalization, and independence from edited-text branded classification. Normal PR CI #427 is fully green on the corrected code head.

## Safety accounting

- Live/provider calls: **0**
- Deployments: **0**
- Merges to `main`: **0**
- Paid provider calls: **0**

Build-only provider environment values were dummy credentials. No protected live route/provider execution was invoked during certification.

## Residual non-blocking notes

- Phase 3 remains browser-bound and has no durable server job state by design; durable jobs are outside Wave 1.
- Existing lint output contains warnings but no errors; these pre-existing/non-Wave-1 warnings do not fail `npm run check`.
- `npm ci` reports two moderate dependency advisories; dependency upgrade work was not part of Wave 1.
- The optional route-level category regression was not retained because the shared `canonicalLockedQuestionPack` is the smallest common pre-execution boundary already used by `/api/audit/run`, report, resume, and variance paths. The permanent unit regressions directly prove the category-ownership invariant at that shared boundary, and the full caller suites remain green.
- The earlier standalone `npm run verify` wrapper limitation remains a historical process note; it is not part of this final narrow fix's requested five-command acceptance gate.

## Certification assessment

The final canonical-category ownership gap is closed. Category is code-owned by canonical slot identity/order, branded classification remains code-owned by exact final question text, and all existing downstream bindings continue to fail closed. The corrected code head is fully green under the repository's normal PR gate and is **READY FOR FINAL INDEPENDENT ACCEPTANCE**. Wave 2 has not started.
