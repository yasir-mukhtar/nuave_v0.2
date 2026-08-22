# Overnight Review B — Audit Core

## Executive summary

Verdict: **fail the audit-core correctness gate pending four P1 corrections**.

The four GPT-5.6 Luna lanes ran concurrently against frozen commit
`028aaa72149c81d71b940adfcb16bd144f0df047`. They produced 12 raw claims. After
independent source inspection, offline adversarial reproduction, known-finding
filtering, and deduplication, this review accepts eight findings: **P0 0 · P1 4 ·
P2 3 · P3 1**.

The highest-risk current defects are: final question name/no-name metadata can
remain stale after an allowed edit; the report gate does not prove a completed
protected observation attempt; browser disconnect does not cancel request-bound
provider/retry work; and a citation annotation can satisfy the required-search
check without an actual `web_search_call`. No live provider call was made.

## Scope and frozen baseline

- Repository: `https://github.com/yasir-mukhtar/nuave_v0.2`
- Frozen baseline: `028aaa72149c81d71b940adfcb16bd144f0df047`
- Review branch: `review/overnight-b-audit-core`
- Isolated worktree: `/Users/yasir/.hermes/worktrees/nuave-overnight-b-audit-core`
- Initial worktree status: clean
- Allowed repository write: this report only
- Production method reviewed: OpenCode Go Responses-compatible transport →
  GPT-5.6 Luna
- Trace reviewed: locked questions → run route → observation provider →
  telemetry → NDJSON stream → retry/resume → 10/10 gate → report route/pipeline
  → variance route/record → workflow completion
- Explicit exclusions honored: no application/test/config edits; no fixes; no
  deploy, merge, or PR; no live/paid provider request; no durable state; no
  Phase 4/5 expansion

## Execution metrics

| Metric                                        |                                              Result |
| --------------------------------------------- | --------------------------------------------------: |
| Review lanes requested/completed/failed       |                                           4 / 4 / 0 |
| Parallel batch wall time                      |                                            358.53 s |
| Slowest lane                                  |          B1 — Contracts + Trust Boundaries, 358.4 s |
| Raw claims                                    |                                                  12 |
| Final accepted findings                       |                                                   8 |
| Duplicate reductions                          |                                                   2 |
| Rejected claims                               |                                                   2 |
| Material severity downgrades                  |                                                   1 |
| Reviewer API/tool calls exposed by delegation |              105 total (B1 37, B2 16, B3 28, B4 24) |
| Reviewer token counts                         |             Unavailable from the delegation runtime |
| Model/provider                                | `openai-codex` / `gpt-5.6-luna`, reasoning `medium` |

Claim accounting reconciles: 12 raw claims = 8 final findings + 2 duplicate
reductions + 2 rejected claims. The one downgrade remains among the eight final
findings.

## Verified findings

### AC-01 — Edited question composition can retain stale `branded` metadata

- **ID:** AC-01
- **Severity:** P1
- **Confidence:** High
- **Files:** `src/app/audit/AuditWorkflow.tsx`;
  `src/app/api/audit/run/route.ts`; `src/lib/audit/questions-id.ts`;
  `src/lib/audit/questions-id-live.ts`; `src/lib/audit/contracts.ts`
- **Lines:** `AuditWorkflow.tsx:694-712`; `run/route.ts:30-34,67-80`;
  `questions-id.ts:281-291,919-931,1053-1070`;
  `questions-id-live.ts:290-320`; `contracts.ts:1083-1201`
- **Finding:** The approved UI allows question text edits but updates only
  `question`; it does not recompute the prompt's `branded` flag. The run route
  validates only the ten strings, then trusts the stale flag. Report composition
  and denominators are therefore derived from metadata that can disagree with
  the exact final question.
- **Evidence:** `classifyIndonesianQuestion` is the canonical dynamic
  classification, and generation uses it. `editPrompt` changes only the string.
  The run route passes only strings to `validateIndonesianQuestionPack`, while
  `buildAuditReport` partitions observations by the inherited `branded` boolean.
- **Active reachability:** Normal current product path. A founder can remove the
  business name from a generated named-business question, which is an allowed
  composition edit, without tampering with the request.
- **Reproduction:** In the scratch baseline, ten valid Indonesian questions
  passed `validateIndonesianQuestionPack`; question 6 classified as
  `tanpa_menyebut_bisnis_anda` while a retained client `branded: true` value
  disagreed. The route has no cross-field check that would reject this shape.
- **Failure scenario:** A named-business question is edited into an unbranded
  discovery question. The run records it as branded and the final report
  understates discovery denominator while overstating recognition denominator.
- **Impact:** The primary report arithmetic and the distinction between
  discovery and recognition can be materially wrong for an allowed customer
  edit.
- **Existing coverage:** Question generation and edit-record classification are
  tested in library code, but no current route/workflow test proves that an
  edited `AuditPrompt.branded` value is recomputed before execution.
- **Known-root relationship:** Independent of K-02. It is stale cross-field
  classification metadata, not positional prompt/evidence correspondence.
- **Recommended correction:** Recompute final classification from each exact
  locked question at the server boundary, or carry and verify the approved
  question-pack record/hash. Do not trust the browser boolean.

### AC-02 — Client disconnect does not cancel request-bound audit execution

- **ID:** AC-02
- **Severity:** P1
- **Confidence:** High
- **Files:** `src/app/api/audit/run/route.ts`;
  `src/lib/audit/run-orchestrator.ts`; `src/lib/audit/retry.ts`;
  `src/lib/audit/openai.ts`
- **Lines:** `run/route.ts:145-175`; `run-orchestrator.ts:43-55,137-192`;
  `retry.ts:180-181,243-332`; `openai.ts:448-555`
- **Finding:** The NDJSON route does not observe `request.signal`, defines no
  stream `cancel()` cleanup, and passes no abort signal through orchestration,
  retry sleep, or the provider SDK request.
- **Evidence:** Every request-bound layer awaits work unconditionally. The
  provider call uses `responses.create(request)` without abort options.
- **Active reachability:** Current Phase 3 foreground stream. Tab close,
  navigation, network loss, reader cancellation, or intermediary timeout can
  detach the browser while server work continues without durable ownership.
- **Reproduction:** A scratch orchestrator test aborted an external controller
  after the first injected observation. Because the orchestration contract has
  no signal, all ten observations still executed (`calls === 10`). Static route
  inspection confirms no cancellation bridge exists.
- **Failure scenario:** The browser loses the stream after partial progress;
  abandoned provider calls/retries continue. A later resume can overlap with
  still-running abandoned work, while the browser has no terminal record.
- **Impact:** Hidden paid work, lost terminal state, overlapping execution, and
  violation of the current browser-bound expectation that closing the tab stops
  the run.
- **Existing coverage:** Retry, stream chunking, terminal events, and resume are
  covered; request cancellation, backoff cancellation, and provider abort are
  not.
- **Known-root relationship:** Distinct from K-01 and K-10. This is cleanup for
  the current request-bound architecture, not durable cross-tab ownership.
- **Recommended correction:** Carry `request.signal` through route,
  orchestrator, retry/backoff, and provider calls; stop scheduling new prompts
  after abort and preserve an explicit resumable terminal state. Durable
  background execution remains a separate Phase 4 choice.

### AC-03 — Citation-only output can falsely satisfy required web search

- **ID:** AC-03
- **Severity:** P1
- **Confidence:** High
- **Files:** `src/lib/audit/openai.ts`; `src/lib/audit/telemetry.ts`
- **Lines:** `openai.ts:420-445,448-528`; `telemetry.ts:294-347`
- **Finding:** `executeAuditPrompt` accepts either a real search-call item or any
  `collectSources()` result as proof of search. Because `collectSources()` also
  gathers URL citation annotations, a citation without `web_search_call` passes.
- **Evidence:** The accepted observation can simultaneously contain sources and
  telemetry with `web_search_calls: 0`.
- **Active reachability:** Active production OpenCode Go path through the OpenAI
  adapter.
- **Reproduction:** A mocked completed Responses result with one URL citation,
  no `web_search_call`, and non-empty text returned a completed observation with
  one source and `web_search_calls === 0`. The adversarial case passed offline.
- **Failure scenario:** Provider output preserves or emits a citation annotation
  without executing the required search tool. Nuave records it as grounded and
  includes it among the ten reportable observations.
- **Impact:** Model-memory or otherwise ungrounded output can alter visibility,
  recommendation, and source findings while being presented as web-searched
  evidence.
- **Existing coverage:** Existing test rejects a no-search response only when it
  also has no citation annotation.
- **Known-root relationship:** Independent of K-03 and K-08; this is a
  provider-side search-execution bypass.
- **Recommended correction:** Require an actual expected `web_search_call`
  action as the sole search-execution predicate. Treat citations and consulted
  sources as evidence content, not execution proof.

### AC-04 — Raw provider failure messages cross into the customer UI

- **ID:** AC-04
- **Severity:** P2
- **Confidence:** High
- **Files:** `src/lib/audit/telemetry.ts`; `src/lib/audit/retry.ts`;
  `src/lib/audit/run-orchestrator.ts`; `src/app/api/audit/run/route.ts`;
  `src/app/audit/AuditRunStep.tsx`
- **Lines:** `telemetry.ts:350-390`; `retry.ts:309-329`;
  `run-orchestrator.ts:153-190`; `run/route.ts:165-172`;
  `AuditRunStep.tsx:110-140`
- **Finding:** `failedCallTelemetry` copies `Error.message` into
  `failure_reason`; retry/failure/fatal stream events preserve it; the UI renders
  `observation.failure_reason` directly beneath the question.
- **Evidence:** No finite safe error category or localization boundary replaces
  the provider-authored message before browser delivery.
- **Active reachability:** Any active observation-provider or transport failure.
- **Reproduction:** An injected provider error message becomes the failed
  observation reason and is rendered by `AuditRunStep`.
- **Failure scenario:** Upstream diagnostic text includes endpoint, account,
  routing, HTTP, or provider-specific details unsuitable for customers.
- **Impact:** Operational metadata leakage, unstable provider-specific copy, and
  violation of the journey contract's safe customer-error boundary.
- **Existing coverage:** Tests intentionally preserve synthetic failure text but
  do not assert redacted customer output.
- **Known-root relationship:** None of K-01–K-10.
- **Recommended correction:** Separate restricted diagnostic detail from a
  finite safe category/reference; stream and render only localized safe text.

### AC-05 — Whitespace-mutated excerpts pass the “exact” evidence guard

- **ID:** AC-05
- **Severity:** P2
- **Confidence:** High
- **Files:** `src/lib/audit/contracts.ts`
- **Lines:** `contracts.ts:381-389,538-543,920-934`
- **Finding:** Excerpt normalization and validation collapse whitespace before
  containment checks, then retain the model-supplied excerpt. Whitespace-altered
  text can therefore be labelled and exported as an exact excerpt.
- **Evidence:** Both checks use `normalizeWhitespace`; neither compares the
  retained substring verbatim.
- **Active reachability:** Every report synthesis path.
- **Reproduction:** A scratch test changed a retained answer from one space to
  two while keeping the single-space report excerpt. `validateReportContent`
  returned no “not copied exactly” error.
- **Failure scenario:** Newlines, repeated spaces, or other whitespace in provider
  evidence are silently rewritten in a report excerpt presented as verbatim.
- **Impact:** Evidence fidelity and traceability are weakened, especially for
  formatting-sensitive excerpts.
- **Existing coverage:** Semantic rewrites are rejected; whitespace-only
  mutations are not tested.
- **Known-root relationship:** None of K-01–K-10.
- **Recommended correction:** Use exact substring matching against the retained
  answer, or explicitly define and label a normalized-excerpt contract.

### AC-06 — Evidence request collections lack bounded sizes

- **ID:** AC-06
- **Severity:** P3
- **Confidence:** Medium
- **Files:** `src/lib/audit/types.ts`; run/report/variance API routes
- **Lines:** `types.ts:183-246,263-327`; `run/route.ts:30-45`;
  `report/route.ts:26-32`; `variance/route.ts:38-47`
- **Finding:** `raw_answer`, per-observation `sources`, per-observation
  `telemetry`, and several evidence strings/collections have no explicit useful
  maxima even though these values are request-controlled on resume/report paths.
- **Evidence:** Top-level observation counts and budget calls are bounded, but
  nested evidence size is not.
- **Active reachability:** Current server routes, subject to platform request
  limits and the current direct-link/noindex operating posture.
- **Reproduction:** Schema inspection confirms multi-megabyte answers and large
  source/telemetry arrays are representable until platform/request memory limits
  intervene.
- **Failure scenario:** An oversized client payload amplifies JSON parsing, Zod
  validation, normalization, serialization, and session-state pressure.
- **Impact:** Concrete but presently low-risk resource-abuse and robustness debt.
- **Existing coverage:** No nested evidence-size boundary tests.
- **Known-root relationship:** Independent of K-10 and the accepted Phase 3
  server-owned budget gap.
- **Recommended correction:** Add method-derived maxima for answer length,
  source count, telemetry attempts, error text, and total request size before
  any provider work.

## Known-root extensions

### KX-01 — Protected report evidence gate does not prove the locked observation method

- **ID:** KX-01
- **Severity:** P1
- **Confidence:** High
- **Files:** `src/lib/audit/types.ts`;
  `src/lib/audit/production-observation-method.ts`;
  `src/lib/audit/report-pipeline.ts`; `src/app/api/audit/report/route.ts`
- **Lines:** `types.ts:183-246`; `production-observation-method.ts:13-64`;
  `report-pipeline.ts:57-105`; `report/route.ts:26-45`
- **Finding:** The report gate requires only non-empty telemetry. It does not
  require a successful observation-stage attempt, `neutral-response-v1`, actual
  search calls, or complete response/attempt cross-field correspondence.
- **Evidence:** `productionObservationMethodErrors` validates observation-stage
  calls only if they exist. `instruction_version` is optional. A completed
  observation backed only by report-stage or failed telemetry can pass.
- **Active reachability:** `/api/audit/report` accepts browser-supplied
  observations and invokes this gate before paid synthesis.
- **Reproduction:** Ten scratch observations with completed top-level status,
  usable answers, protected system/model strings, missing instruction version,
  and only completed report-stage zero-search telemetry passed
  `assertReportGenerationGate` without throwing.
- **Failure scenario:** Stale, malformed, or tampered evidence is treated as ten
  protected, grounded observations despite proving no successful locked-method
  attempt.
- **Impact:** False 10/10 completion, false method disclosure, and report
  generation from evidence without protected observation provenance.
- **Existing coverage:** Missing telemetry, mixed systems, and model mismatches
  are tested; wrong-stage-only, failed-only, missing-instruction, zero-search,
  and response-ID mismatch cases are not.
- **Known-root relationship:** **Known-root extension of K-03.** This is the
  concrete downstream bypass and merges raw B1-03, B3-03, and B4-01.
- **Recommended correction:** Define one strict selected-attempt invariant:
  completed observation-stage telemetry, exact instruction version, actual
  search execution, aligned attempt/response/model/timestamps, and top-level
  status derived from that selected attempt.

### KX-02 — Corrected measures coexist with contradictory legacy facts

- **ID:** KX-02
- **Severity:** P2
- **Confidence:** High
- **Files:** `src/lib/audit/contracts.ts`
- **Lines:** `contracts.ts:1122-1201,1234-1252,1293-1305`
- **Finding:** `measures.comparison` and `measures.information` correctly use
  eligible appeared-and-assessed subsets, but legacy `facts` counts all details;
  `facts.comparison.label` uses all observations as its denominator and
  `facts.information` has no assessed denominator.
- **Evidence:** The same report object and evidence export can carry both the
  corrected measures and broad legacy arithmetic.
- **Active reachability:** Every report payload/export. The main UI currently
  renders measures, but downstream consumers can read facts.
- **Reproduction:** A scratch report with one assessed comparison produced
  `measures.comparison = { client_preferred: 1, assessed: 1 }` while
  `facts.comparison.label` stated `1 of 10 questions`.
- **Failure scenario:** A consumer uses `facts` rather than `measures` and
  presents comparison/information performance over ineligible questions.
- **Impact:** Contradictory report semantics and misleading downstream
  denominators despite a correct current main tile.
- **Existing coverage:** Measures are tested; cross-field agreement with legacy
  facts is not.
- **Known-root relationship:** **Known-root extension of historical O-3/R3-3**
  denominator work; it is not a new K-06 variance issue.
- **Recommended correction:** Remove legacy fields or derive them from the same
  eligible sets with explicit assessed denominators and consistency tests.

## Rejected/downgraded findings

| Raw ID | Disposition                           | Reason                                                                                                                                                                                                            |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1-01  | Rejected                              | Server-owned/signed evidence-set ownership is Phase 4 architecture under the explicit Spec 003 browser-state non-scope and overlaps K-10/K-03. The current concrete gate bypass is retained narrowly as KX-01.    |
| B1-02  | Accepted as AC-01                     | Narrowed from arbitrary prompt metadata to the normally reachable stale final-classification path after allowed question editing.                                                                                 |
| B1-03  | Duplicate → KX-01                     | Same missing selected successful protected-attempt invariant.                                                                                                                                                     |
| B1-04  | Rejected                              | `AUDIT_CLIENT_CONTRACT_VERSION` is documented specifically as the NDJSON stream contract. No current report/variance wire incompatibility was reproduced; this is future versioning design, not an active defect. |
| B1-05  | Downgraded P2 → P3, accepted as AC-06 | Unbounded nested fields are concrete, but current platform request limits, founder-only posture, and no public-link sharing reduce present severity.                                                              |
| B2-N01 | Accepted as AC-02                     | Independently confirmed in source and scratch orchestration.                                                                                                                                                      |
| B3-01  | Accepted as AC-03                     | Independently reproduced with a citation-only mocked provider result.                                                                                                                                             |
| B3-02  | Accepted as AC-04                     | Direct UI rendering path confirmed.                                                                                                                                                                               |
| B3-03  | Duplicate → KX-01                     | Same protected evidence-gate root.                                                                                                                                                                                |
| B4-01  | Duplicate → KX-01                     | Same protected evidence-gate root.                                                                                                                                                                                |
| B4-02  | Accepted as AC-05                     | Independently reproduced offline.                                                                                                                                                                                 |
| B4-03  | Accepted as KX-02                     | Independently reproduced; classified as a historical denominator-root extension.                                                                                                                                  |

## Adversarial reproduction evidence

All scratch work occurred outside the review worktree in a `git archive` export
of the frozen baseline at `/tmp/nuave-review-b-repro`. Its `node_modules` entry
was a symlink to the isolated review worktree dependency installation. No
scratch test was added to the repository.

Command:

```text
npx vitest run src/lib/audit/overnight-b-adversarial.scratch.test.ts src/lib/audit/openai.test.ts
```

Observed result after adding five adversarial cases to the scratch snapshot:

```text
Test Files  2 passed (2)
Tests       30 passed (30)
```

The passing adversarial assertions demonstrated the current behavior rather
than a correction:

1. wrong-stage, zero-search, missing-instruction telemetry passes the report gate;
2. whitespace-mutated excerpts pass the exact-excerpt check;
3. legacy comparison facts say 1/10 while assessed measures say 1/1;
4. final text classification can disagree with retained `branded` metadata; and
5. aborting an external controller after call 1 does not stop the signal-less
   orchestrator from executing all ten calls.

A separate citation-only case in the copied `openai.test.ts` returned a completed
observation with one source and zero recorded web-search calls.

## Test evidence

| Command                            | Result                                                                                           | Provider activity                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `npm run test:audit`               | Passed — 33 files, 416 tests                                                                     | None                                                               |
| Scratch adversarial Vitest command | Passed — 2 files, 30 tests                                                                       | Mocked/injected only                                               |
| `npm run verify`                   | Passed — check; 38 unit files / 503 tests; Next build; OpenNext Cloudflare build; e2e 37 + 3 + 2 | Script inspected first; dummy build-only credentials; offline gate |

Worker-specific evidence was uneven because dependency installation occurred
while lanes were already running: B1 completed 6 targeted files / 49 tests,
typecheck, and lint (0 errors, 18 warnings); B2/B3/B4 reported dependency-blocked
targeted commands. The orchestrator therefore reran the authoritative audit
suite, scratch reproductions, and complete offline verification independently
after the parallel batch. `npm run verify` ended with `Offline verification
passed`; lint retained 18 warnings and zero errors.

## Coverage ledger

| Lane | Primary coverage                               | Raw claims | Final contribution  | Disposition notes                                                                            |
| ---- | ---------------------------------------------- | ---------: | ------------------- | -------------------------------------------------------------------------------------------- |
| B1   | Contracts, schemas, run/report/variance routes |          5 | AC-01, AC-06, KX-01 | One architecture claim and one speculative versioning claim rejected; one severity downgrade |
| B2   | Execution, retry, stream, resume               |          1 | AC-02               | Accepted; K-01/K-04/K-05 excluded                                                            |
| B3   | Provider, search, telemetry, provenance        |          3 | AC-03, AC-04, KX-01 | K-03 extension merged, K-08 excluded                                                         |
| B4   | Report arithmetic, exact evidence, variance    |          3 | AC-05, KX-01, KX-02 | K-06/K-07 excluded; one denominator-root extension retained                                  |

Known findings K-01 through K-10 were used as an exclusion ledger. No known
finding was counted as new. KX-01 and KX-02 are included only because they add
concrete bypasses or remaining contradictory payload behavior beneath known
roots.

## Cross-subsystem handoff

- **Questions → run:** classification must be recomputed from the exact edited
  text before the observation starts (AC-01).
- **Provider → telemetry → report:** actual search execution and one selected
  successful protected attempt must be represented by one strict invariant
  shared by provider completion and report acceptance (AC-03, KX-01).
- **Request lifecycle → retry/provider:** foreground cancellation must stop
  scheduling, backoff, and provider work without pretending Phase 4 durability
  exists (AC-02).
- **Telemetry → UI:** restricted provider diagnostics must not reuse the
  customer-visible failure string (AC-04).
- **Evidence normalization → report/export:** exact excerpts and denominator
  fields need one source of truth (AC-05, KX-02).
- **Route schemas → platform guard:** nested evidence sizes should match the
  maximum output and attempt policy before public link sharing (AC-06).

## Recommended correction order

1. **KX-01:** close the 10/10 protected-attempt proof bypass before any new live
   report; add wrong-stage, failed-only, instruction, search, and response-ID
   regression cases.
2. **AC-03:** require an actual search-call event, because this can corrupt a
   genuine provider-produced run without client tampering.
3. **AC-01:** recompute final name/no-name classification from edited question
   text before run and report arithmetic.
4. **AC-02:** propagate cancellation through stream, orchestrator, retry sleep,
   and provider request; add a request-abort regression.
5. **KX-02:** reconcile or remove legacy denominator fields so every payload and
   export has one arithmetic contract.
6. **AC-04:** split restricted diagnostics from customer-visible safe failures.
7. **AC-05:** enforce genuinely verbatim excerpts or rename the normalized
   contract.
8. **AC-06:** add request/evidence bounds before any public-link exposure.
