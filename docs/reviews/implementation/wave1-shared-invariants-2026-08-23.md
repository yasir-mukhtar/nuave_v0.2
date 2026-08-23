# Wave 1 Shared Invariants — Implementation and Certification Report

Date: 2026-08-23

## Purpose and scope

Wave 1 closes the shared correctness invariants identified by the frozen whole-repository review without expanding into Wave 2, Phase 4, or Phase 5. The implementation is limited to locked question identity, protected observation proof, variance binding, comparison-business identity safety, workflow lifecycle/cancellation, transactional browser state, and stream-prefix preservation.

No deployment, merge to `main`, or live/provider execution was permitted during implementation or certification.

## Frozen baseline and certified implementation head

- Frozen `main` baseline: `028aaa72149c81d71b940adfcb16bd144f0df047`
- Frozen baseline tree: `26792f331791e71c710042d4edc31caf37854e1c`
- Certified implementation code head before this documentation-only report commit: `0ad5d5e8684c9c2e35c41f5872cc08eafdaf4d90`
- Integration branch: `fix/wave1-shared-invariants-2026-08-23`
- Draft pull request: #17

The branch tip after this report is a documentation-only certification commit. A commit cannot embed its own resulting SHA; the final branch SHA is recorded in the PR metadata and handoff response.

## Wave 1 finding matrix

| Finding | Status | Closure |
| --- | --- | --- |
| K-01 — stale async work survives reset/start-over | RESOLVED | Workflow generation tokens invalidate prompts, run, report, and variance work; invalidation aborts active requests and suppresses stale commits. |
| K-02 — immutable prompt/evidence binding is insufficient | RESOLVED | One canonical locked-pack boundary owns exact IDs, exact final question text, category, and derived branded classification; resume/report/variance bind observations back to that exact pack. |
| K-03 — protected-call/provenance proof is inadequate | RESOLVED | One positive protected-attempt invariant requires a completed observation-stage attempt, exact method/model/instruction, response correspondence, substantive answer, and actual search execution. |
| K-04 — duplicate prompt IDs rejected too late | RESOLVED | Canonical pack validation rejects duplicate/non-empty ID violations before protected execution. |
| K-05 — malformed NDJSON can discard valid prefix events | RESOLVED | The parser returns valid earlier events, records a terminal malformed-line error, and throws only after the valid prefix has been delivered. |
| K-06 — variance designation not bound to completed locked run | RESOLVED | Variance requires exact locked 10/10 proof and the exact server-canonical designated subset; client designation now uses the same canonical final-question classification. |
| K-07 — variance completeness can accept weak evidence | RESOLVED | Variance completeness calls the same positive protected-observation invariant; failed, zero-search, wrong-method, or malformed evidence cannot be complete. |
| K-08 — duplicate telemetry/attempt association risk | RESOLVED | Accepted protected observations require one matching completed response-owned attempt; cross-prompt response-ID reuse is rejected and client budget ledgers deduplicate response-owned calls. |
| N-P1-02 — stale AI competitor identity can survive URL edit | RESOLVED | Editing a suggested source URL rebinds it as user input and clears the old AI-provided name. |
| N-P1-03 — credential-bearing comparison URL can reach provider brief | RESOLVED | Comparison-business URLs are validated before provider-bound use and embedded username/password credentials are rejected. |
| N-P1-04 — question generation returned model is not enforced | RESOLVED | Protected question generation validates returned model and response identity; invalid/missing provenance uses deterministic fallback rather than accepting the apparent provider output. |
| N-P1-05 — edited question retains stale branded classification | RESOLVED | `branded` is derived from the exact final question at the canonical lock boundary; variance designation also canonicalizes before selecting repeats. |
| N-P1-06 — disconnect/cancel does not propagate through protected work | RESOLVED | Abort signals now flow through browser fetches, run/variance routes, orchestration, retry/backoff, and the provider adapter. |
| N-P1-07 — citation-only response can masquerade as search | RESOLVED | Protected completion requires an actual `web_search_call`; citation annotations alone do not satisfy the invariant. |
| N-P1-09 — initial run POST failure strands workflow state | RESOLVED | Run state commits only after the POST is accepted and a response stream exists; rejected starts preserve the reviewed question pack and retryable state. |
| N-P1-10 — failed resume clears completed observations | RESOLVED | Existing completed observations remain the transactional resume base and are not cleared before request acceptance. |
| N-P1-11 — late question generation can repopulate abandoned state | RESOLVED | Prompt-generation work is generation-bound and aborted/ignored after back/reset/edit invalidation. |
| KX-01 — protected evidence checks diverge across downstream boundaries | RESOLVED | Resume, report, completed-run variance proof, and variance completeness share the same protected-attempt and locked-identity primitives. |

Wave 1 target findings: **18 RESOLVED, 0 PARTIAL, 0 NOT ADDRESSED**.

## Architectural changes

### 1. Canonical locked identity

`locked-question-pack.ts` is the shared lock boundary. It enforces exactly ten questions, unique non-empty IDs, exact final question text, category, and `branded` classification derived from the final text rather than trusting stale client metadata. Observation and variance validators bind all downstream evidence to this canonical pack.

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

After the review-only challenge, the browser also derives its repeat subset through the same canonical helper, so edited question text cannot leave variance selection attached to stale `branded` booleans.

### 4. Workflow generation, cancellation, and transactional state

Prompt generation, run, report, and variance work are associated with a workflow generation and AbortController. Reset, back-navigation, facts edits, question edits, or replacement work invalidate the old generation. Stale results cannot commit to the new workflow.

Run start/resume is transactional: prior completed evidence and reviewed questions are preserved until the server accepts the POST and exposes the stream. Failed initial starts remain retryable. Cancellation propagates through browser fetch, route request signal, orchestration, retry/backoff, and provider execution. The review-only challenge found and closed the remaining variance-route signal gap.

Restored reports do not launch variance when complete main-run proof or the required post-report cost ledger is unavailable; a terminal variance failure record is created instead.

### 5. NDJSON valid-prefix semantics

The stream parser preserves already-valid events when a later line in the same chunk is malformed. The malformed input becomes terminal, but valid prefix events are not erased from the caller's state.

## Intentionally not changed

Wave 1 did not redesign provider architecture, add durable server jobs/state, change Phase 3's browser-bound/sequential execution model, implement payment/persistence/customer delivery, address Wave 2 report/public-surface findings, or begin Phase 4/5. Existing non-Wave-1 lint warnings and dependency-audit notices were not expanded into this scope.

## Tests added or updated

Permanent Wave 1 coverage includes:

- canonical locked-pack identity, duplicate IDs, edited-text classification, and canonical variance designation
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

The Wave 1 targeted regression set was **46/46 green before the independent challenge**. The challenge added two permanent regressions (canonical post-edit variance designation and variance request-signal propagation); both are included in the final full-unit result. Therefore the evolved targeted set is **48/48 represented and passing within the full unit run**.

## Canonical verification

Certified implementation code head: `0ad5d5e8684c9c2e35c41f5872cc08eafdaf4d90`.

| Verification | Result | Evidence |
| --- | --- | --- |
| `npm run check` | PASS | Normal PR CI #420; typecheck + lint + Prettier completed successfully. |
| `npm run test:unit` | PASS | Normal PR CI #420; **45 files, 543/543 tests**. |
| `npm run build` | PASS | Normal PR CI #420; Next.js production build completed. |
| `npm run build:cf` | PASS | Normal PR CI #420; OpenNext Cloudflare build completed with dummy build-only credentials. |
| `npm run test:e2e` | PASS | Normal PR CI #420; **38/38 default + 3/3 forced-failure + 2/2 preview-disabled = 43/43**. |
| `npm run verify` | NOT SEPARATELY EXECUTED | The available certification harness has no local repository checkout and its container cannot fetch this private repository. `verify-offline.mjs` was inspected and is an offline wrapper over the same five commands above with dummy provider values and `NUAVE_LIVE_PROVIDER_TESTING=0`; every constituent command passed, but the wrapper itself was not separately invoked. |

### PR CI result

Normal PR CI run #420 (`32625783052`) on the certified implementation code head is **SUCCESS**. The deployment job is **SKIPPED**, as required for a pull request.

The normal `.github/workflows/ci.yml` is restored. The branch's workflow directory contains only `ci.yml`; temporary targeted/diagnostic workflows, artifact logging, and temporary write permissions used during diagnosis were removed before final certification.

## Review-only adversarial validator

### First challenge verdict: BLOCK

The isolated review-only challenge found two concrete integration defects:

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

No further concrete Wave 1 defect was identified.

**Validator code verdict: APPROVE.**

Process note: this ChatGPT tool harness does not expose a facility to spawn a genuinely independent reviewer/subagent. The challenge was therefore performed as a separate, read-only adversarial pass by the orchestrator. It is independent in review phase and criteria, but not a separately instantiated agent. This limitation is recorded rather than represented as stronger independence than was available.

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
- The code is fully green under the repository's normal PR gate. Literal completion of the user's additional local `npm run verify` wrapper request requires an authenticated local checkout or an approved existing CI job that invokes that wrapper; neither execution surface is available in this harness without adding temporary workflow machinery, which was explicitly prohibited.

## Certification assessment

Implementation correctness is green and the review-only code validator is APPROVE. The only remaining certification limitation is procedural: `npm run verify` was not separately invoked as a wrapper, and no separately spawned independent reviewer was available. The handoff response records whether those procedural requirements are treated as blocking for final acceptance.
