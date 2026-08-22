# Audit-run parallel review pilot — validated findings

## 1. Metadata

- **Reviewed baseline:** `028aaa72149c81d71b940adfcb16bd144f0df047`
- **Working branch:** `review/pilot-audit-run-parallel`
- **Branch HEAD before this report:** `4b0d66594d9775d7b08136764097890ba39cba5c`
- **Mode:** review only; no application-code or test changes
- **Review date:** 2026-08-22
- **Parallel execution:** five lanes started together in delegation `deleg_7c7c4cb1`; all five completed successfully
- **Reviewer runtime:** `gpt-5.6-luna`; 73 exposed worker API calls in total. Per-lane durations were A 148.61s, B 132.48s, C 107.85s, D 138.09s, and E 128.45s. Token counts were **not available**.
- **Live/provider calls from the Nuave application:** none
- **Application baseline check:** `git diff --quiet 028aaa72149c81d71b940adfcb16bd144f0df047..HEAD -- src package.json package-lock.json next.config.* playwright.config.* tsconfig.json` returned success. The branch differed from baseline only by the two review-pilot documents before this report.

### Offline checks run

1. Existing targeted suite, executed against a read-only `git archive` snapshot with the repository's already-installed dependencies:

   ```text
   vitest run run-orchestrator.test.ts run-route-client-contract.test.ts
     stream.test.ts retry.test.ts telemetry.test.ts provider.test.ts
   → 6 files passed, 63 tests passed
   ```

2. Scratch-only adversarial checks, not added to the repository:

   ```text
   mismatched resumed question/category reaches run_completed
   failed-only telemetry reaches run_completed and passes the report gate
   valid NDJSON preceding a malformed line is not delivered
   → 3 tests passed

   duplicate prompt IDs reach run_completed before the report gate rejects
   → 1 test passed
   ```

### Material limitations

- The review worktree intentionally had no local dependency installation. Workers could not run Vitest there. The field orchestrator therefore extracted the exact branch HEAD to `/tmp`, linked the existing dependency installation, and ran the offline tests against that snapshot without modifying the review worktree.
- No browser E2E suite or full build was run; the pilot explicitly preferred narrow offline verification.
- Token counts were not exposed by the platform.
- Multi-tab behavior is partly browser-entry dependent: ordinary independently opened tabs have separate `sessionStorage`; duplicated tabs or tabs opened with an opener may begin with copied workflow state.

## 2. Executive verdict

**FAIL — one or more verified P0/P1 findings require correction before relying on this path**

The bounded review verified three P1 defects. A user can reset an active run without invalidating its stream, allowing late events to restore a discarded audit. Resume acceptance also fails to bind evidence to the locked question and accepts “completed” observations backed only by failed telemetry; the latter can pass both `run_completed` and the downstream report gate. Five additional P2 defects or concrete regression gaps affect duplicate IDs, stream recovery, duplicated-tab spend, route-boundary coverage, and cumulative budget coverage. No P0 was found.

**Verified counts:** P0 0 · P1 3 · P2 5 · P3 0

## 3. Coverage table

| Lane                  | Scope actually reviewed                                                                             | Result                                                                        | Unique verified finding? |
| --------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| A — HTTP/contract     | Run route, schemas, locked-question validation, resume acceptance, route tests, direct dependencies | Three claims survived: ARP-002, ARP-003 (merged), ARP-004                     | Yes                      |
| B — orchestration     | Resume preservation, retry/attempt accumulation, terminal gating, cost propagation, direct tests    | Independently corroborated ARP-003; no second orchestration defect survived   | No                       |
| C — provider/method   | OpenCode Go lock, credential guards, completed-attempt/search provenance, report acceptance         | Independently corroborated and narrowed ARP-003; provider lock otherwise held | No                       |
| D — browser/stream    | NDJSON parsing, terminal events, persistence, reset races, multi-tab behavior                       | ARP-001, ARP-005, ARP-006                                                     | Yes                      |
| E — adversarial tests | Route, orchestration, stream, provider, storage, and concurrency coverage                           | ARP-007 and ARP-008; one duplicate and one rejected claim                     | Yes                      |

## 4. Verified findings

### ARP-001 — P1 — Reset does not invalidate the active run, so late events can restore discarded state

- **Evidence:** `src/app/audit/AuditWorkflow.tsx:770-809`, `:812-925`, `:951-973`, `:1043-1045`
- **Failure sequence:**
  1. The user starts an audit and `runAudit()` begins consuming `/api/audit/run`.
  2. While the request is active, the user clicks **Mulai ulang**; the top-bar action remains enabled.
  3. `startOver()` clears React state and session storage but does not abort the fetch, close its reader, or invalidate the active run.
  4. The old stream emits `prompt_completed` or `run_completed`.
  5. `handleRunEvent()` writes the old observations back into state, and a late `run_completed` may invoke `createReport()` for the discarded run.
  6. The persistence effect can store the resurrected state again.
- **Expected:** Reset cancels or invalidates the active stream, and events from the discarded run cannot mutate the blank/new workflow.
- **Actual:** The old stream retains write access after reset.
- **Impact:** A discarded paid audit can reappear, generate an unwanted report, and race with a newly started workflow.
- **Confidence:** High
- **Recommended correction direction:** Give each active run an identity and abort controller; invalidate both during reset and ignore events whose identity is no longer current. Disable reset until cancellation is complete or make reset explicitly cancel first.
- **Recommended regression coverage:** Start a controlled stream, reset before terminal delivery, release late events, and assert that observations, report, and persisted storage remain empty.

### ARP-002 — P1 — Resumed evidence is not bound to the locked question content

- **Evidence:** `src/app/api/audit/run/route.ts:92-126`; `src/lib/audit/types.ts:183-246`; `src/lib/audit/run-orchestrator.ts:96-125`
- **Failure sequence:**
  1. A resume observation uses a valid locked `prompt_id` but carries another question's text, category, or branded flag.
  2. Schema validation succeeds; the route checks only status, membership of the ID, duplicate resume IDs, and limited production-method fields.
  3. The orchestrator indexes resume records only by `prompt_id` and emits the mismatched record verbatim.
  4. Ten such records can satisfy `run_completed`.
- **Expected:** Every resumed observation matches its locked prompt's ID, exact question text, category, and branded classification.
- **Actual:** Only the ID relationship is checked.
- **Impact:** Stale or tampered evidence can be attributed to the wrong question, materially corrupting the audit and later report.
- **Confidence:** High; reproduced with a scratch-only test.
- **Recommended correction direction:** Validate immutable prompt fields against the locked prompt before folding telemetry or entering orchestration.
- **Recommended regression coverage:** Submit a production-shaped completed observation with a valid ID but another locked question's text/category/branded flag; assert HTTP 422 and no stream creation.

### ARP-003 — P1 — Failed-only telemetry can satisfy the protected method, run-completion, and report gates

- **Evidence:** `src/lib/audit/production-observation-method.ts:33-61`; `src/app/api/audit/run/route.ts:92-127`; `src/lib/audit/run-orchestrator.ts:58-68`, `:96-125`, `:196-239`; `src/lib/audit/report-pipeline.ts:88-103`
- **Failure sequence:**
  1. A resumed observation declares `run_status: "completed"`, carries non-empty answer and returned-model fields, and uses the expected OpenCode Go system/requested model.
  2. Its telemetry contains only a failed observation call with no returned model and `web_search_calls: 0`.
  3. `productionObservationMethodErrors()` checks returned-model consistency only inside the list of completed calls. With no completed call, that loop is vacuous.
  4. The route accepts the record; the orchestrator preserves it and counts completion from `run_status` alone.
  5. Ten records emit `run_completed`.
  6. The report gate requires non-empty telemetry but not a completed attempt or required web-search evidence, so it also accepts them.
- **Expected:** A completed observation has at least one successful observation attempt whose returned-model/response provenance matches the observation and whose required web search completed.
- **Actual:** Failed-only telemetry satisfies all three gates.
- **Impact:** A paid report can be created from observations that the telemetry says never completed and were never grounded by the protected method.
- **Confidence:** High; independently found by lanes A/B/C and reproduced through both run and report gates.
- **Recommended correction direction:** Centralize a positive completed-attempt invariant and apply it at resume validation, orchestration completion, and report generation. Require matching response provenance and the required search evidence.
- **Recommended regression coverage:** Use ten resumed records containing only failed telemetry; assert route rejection, no `run_completed`, and report-gate rejection. Include zero-search and missing-response cases.

### ARP-004 — P2 — Duplicate locked prompt IDs can execute and claim run completion

- **Evidence:** `src/app/api/audit/run/route.ts:30-34`; `src/lib/audit/types.ts:136-145`; `src/lib/audit/questions-id.ts:610-622`; `src/lib/audit/run-orchestrator.ts:100-125`, `:196-239`; downstream guard at `src/lib/audit/report-pipeline.ts:61-66`
- **Failure sequence:**
  1. The request contains ten distinct question strings but repeats a `prompt_id`.
  2. The prompt schema and route length check accept it; question-pack distinctness checks text, not IDs.
  3. The orchestrator executes or resumes all ten positions and can emit `run_completed` with duplicate logical identity.
  4. The report gate rejects the duplicate locked IDs only after observation work has already occurred.
- **Expected:** Ten locked questions have ten unique IDs and are rejected before execution otherwise.
- **Actual:** Uniqueness is enforced only downstream at report generation.
- **Impact:** Paid work can complete and the UI can receive terminal success before report generation fails; resume maps can also reuse one record for duplicate positions.
- **Confidence:** High; reproduced in scratch: `run_completed` was emitted, then the report gate rejected uniqueness.
- **Recommended correction direction:** Enforce prompt-ID uniqueness in the request schema/route and defensively in orchestration.
- **Recommended regression coverage:** Submit ten valid distinct questions with one duplicate ID and assert HTTP 422 before execution.

### ARP-005 — P2 — A malformed NDJSON line discards valid preceding events in the same chunk

- **Evidence:** `src/lib/audit/stream.ts:97-113`; caller at `src/app/audit/AuditWorkflow.tsx:886-905`
- **Failure sequence:**
  1. One network chunk contains a valid `prompt_completed` line followed by malformed JSON or a schema-invalid event.
  2. `AuditRunEventParser.push()` parses all complete lines through one `.map()`.
  3. The later line throws before the array is returned.
  4. The caller receives none of the valid earlier events, so completed evidence is not merged or persisted.
- **Expected:** Valid events preceding the malformed record are delivered before the stream is rejected, or parsing exposes both accepted events and the terminal parse failure.
- **Actual:** The whole `push()` result is lost atomically.
- **Impact:** Recoverable completed work can disappear from browser state and may be rerun after recovery.
- **Confidence:** High; reproduced with a scratch-only parser test.
- **Recommended correction direction:** Parse incrementally and commit each valid line before reporting a later malformed line; make the error contract explicit.
- **Recommended regression coverage:** Feed valid NDJSON plus malformed NDJSON in one push and assert the valid event is retained before failure is surfaced.

### ARP-006 — P2 — Duplicated browser contexts can start independent paid runs without a run lock or idempotency identity

- **Evidence:** `src/app/audit/AuditWorkflow.tsx:233-240`, `:336-365`, `:812-878`; storage keys at `src/lib/audit/workflow-storage.ts:15-17`; request boundary at `src/app/api/audit/run/route.ts:30-45`
- **Failure sequence:**
  1. A prepared `/audit` context is duplicated or opened from a context that copies its initial `sessionStorage` state.
  2. Both contexts have the same prepared prompt pack and safety identifier.
  3. Each invokes `runAudit()` independently.
  4. Neither client nor server has an active-run lease, run ID, or idempotency key that prevents both POSTs from executing.
- **Expected:** A copied workflow either resumes/observes one active run or is explicitly isolated with distinct run identity and clear user state.
- **Actual:** Both contexts can initiate full execution independently.
- **Impact:** User action across duplicated contexts can duplicate meaningful provider spend and create competing evidence sets.
- **Confidence:** Medium. Ordinary separately opened tabs normally have isolated `sessionStorage`; the verified risk is duplicated/copied contexts plus the absence of server idempotency.
- **Recommended correction direction:** Introduce explicit run identity/idempotency at the server boundary and a client-visible active-run lease; do not rely on browser storage isolation as the spend guard.
- **Recommended regression coverage:** Exercise two contexts initialized from the same prepared state and assert only one execution is accepted, or that the second safely attaches to/declines the first.

### ARP-007 — P2 — Route tests never exercise a valid current-contract request through the protected production boundary

- **Evidence:** `src/lib/audit/run-route-client-contract.test.ts:7-50`; route boundary at `src/app/api/audit/run/route.ts:64-65`, `:145-164`
- **Failure sequence:**
  1. A regression removes the route credential assertion or replaces `liveExecuteAuditPrompt` with a selectable/testing implementation.
  2. Existing route tests still pass because every case is stale or missing the client contract and exits at HTTP 409 before provider setup.
  3. Direct provider/helper tests remain green while the actual route wiring is wrong.
- **Expected:** Offline route coverage proves that a valid current request reaches the protected guard and uses only the production execution binding.
- **Actual:** No valid-shaped route test reaches stream creation or production-method wiring.
- **Impact:** A protected-method regression at the real HTTP boundary could survive CI. Current implementation inspection found the correct wiring, so this is a coverage defect rather than an active provider bypass.
- **Confidence:** High
- **Recommended correction direction:** Add an offline valid-request route test with controlled mocks at the live provider boundary.
- **Recommended regression coverage:** Assert credential guard invocation, production executor binding, fail-closed provider mismatch, and no observation call before all boundary checks pass.

### ARP-008 — P2 — No test proves cumulative budget propagation across questions

- **Evidence:** implementation at `src/lib/audit/run-orchestrator.ts:93`, `:137-169`; test helper at `src/lib/audit/run-orchestrator.test.ts:75-93`; within-question coverage in `src/lib/audit/retry.test.ts`
- **Failure sequence:**
  1. A future change resets `runCalls` between questions or omits earlier failed/retry telemetry.
  2. Synthetic observations in current orchestration tests continue to pass because the test executor does not inspect the budget received by later questions.
  3. Retry tests still cover accumulation inside one question but not across question boundaries.
- **Expected:** Tests prove that question N receives every prior session call and that cumulative cost can stop a later question.
- **Actual:** Cross-question ledger propagation is implemented but not behaviorally asserted.
- **Impact:** A regression could under-account spend and cross the USD ceiling while current tests remain green.
- **Confidence:** High
- **Recommended correction direction:** Preserve the implementation and add a behavior-level orchestration assertion rather than a constant/snapshot assertion.
- **Recommended regression coverage:** Capture each executor input across ten questions; verify prior completed and failed attempts are present, then test a ceiling stop caused by accumulated earlier-question cost.

## 5. Contested, rejected, duplicate, and reclassified claims

- **A-02 / B-001 / C-001:** Merged into ARP-003. The broad claim that all client-provided resume data must have server-issued authenticity was narrowed because durable server-owned run state is explicitly Phase-4 non-scope (`specs/003-live-report-quality-gate/SPEC.md:224-230`). The concrete failed-only-telemetry bypass is inside the current validation contract and was reproduced.
- **A-03 — client ledger reset:** Rejected as a new pilot defect. The limitation is explicitly documented and accepted for the founder-operated Phase-3 path (`src/lib/audit/telemetry.ts:120-132`; Spec 003 non-scope above). It remains product debt but is not a newly verified defect against the approved current boundary.
- **A-05 — credential check before body parsing:** Rejected. The worker demonstrated different error ordering but not an unsafe call, violated contract, or material customer failure. The route still fails closed.
- **D-003 / E-004:** Merged into ARP-006 and kept at P2. E's P1 framing assumed shared live `sessionStorage`; ordinary tabs are isolated. The narrower copied/duplicated-context risk remains real because no client/server run identity prevents a second paid POST.
- **E-001:** Reclassified P1 → P2. Current route wiring is correct; the verified issue is missing regression protection, not an active protected-method bypass.
- **E-002 — client ignores `run_unfinished.observations`:** Rejected as a standalone current failure. On the actual ordered stream, the orchestrator emits each `prompt_completed` before `run_unfinished`, and those events are merged and persisted. The parser-corruption loss scenario survives separately as ARP-005. Consuming the terminal snapshot would still be useful defense-in-depth.

## 6. Important test gaps

1. No current-contract route test reaches the protected production execution boundary (ARP-007).
2. No orchestration test proves cumulative budget propagation across questions (ARP-008).
3. No client test covers reset while a stream remains active and then releases late events (ARP-001).
4. No route test rejects resumed evidence whose immutable prompt fields differ from the locked prompt (ARP-002).
5. No positive invariant test requires a successful/search-grounded attempt before run/report completion (ARP-003).
6. No parser test covers a valid event followed by a malformed line in one chunk (ARP-005).
7. No duplicated-context test proves one-run/idempotent behavior (ARP-006).

## 7. Orchestration evaluation

- **Raw findings produced:** 14
- **Verified findings after validation:** 8
- **Duplicate claims merged:** 3 raw claims were merged into two final findings (B-001 and C-001 into ARP-003; E-004 into ARP-006)
- **Rejected claims:** 3 (A-03, A-05, E-002)
- **Materially downgraded:** 2 (E-001 P1→P2; E-004's P1 framing→ARP-006 P2, also counted as a duplicate)
- **Unique-value lanes:** A, D, and E produced unique verified findings. B and C independently corroborated the most consequential method-gate defect and helped narrow it, but did not produce separate final findings.
- **Redundancy/breadth:** B and C overlapped heavily at the resume/method boundary. E stayed usefully test-focused but duplicated D's concurrency concern once.
- **Observed runtime:** all five started in one parallel fan-out; the slowest lane completed in 148.61s. Total worker API calls exposed by the platform: 73. Token counts: **not available**.
- **Recommendation for a larger overnight review:** use **four lanes**, not five: combine A and C into one request/resume/production-method acceptance lane; keep B for retry/budget/orchestration, D for browser/recovery/concurrency, and E for adversarial test coverage. Give the combined acceptance lane an explicit checklist for prompt binding, positive completed-attempt evidence, and method provenance.
- **Usage reduction without losing coverage:** require each worker to search existing tests before expanding dependencies; reserve execution for one or two minimal reproductions per lane; ask the test lane to report only coverage gaps not already submitted as implementation findings.

The parallel pattern was useful: independent convergence made ARP-003 more trustworthy, while the orchestrator pass removed known non-scope debt, unsupported error-ordering claims, and duplicated concurrency severity.

## 8. Recommended next action

Create one bounded fix specification for **resume/run identity and positive completion invariants**, covering ARP-001 through ARP-004 before any code change. It should define immutable prompt binding, the required successful/search-grounded telemetry evidence, prompt-ID uniqueness, and cancellation/stale-event semantics; then add the corresponding regression tests before implementation.
