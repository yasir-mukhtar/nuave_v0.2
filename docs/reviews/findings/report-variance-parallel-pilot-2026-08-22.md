# Report/variance parallel review pilot — validated findings

## 1. Metadata

- **Application baseline:** `028aaa72149c81d71b940adfcb16bd144f0df047`
- **Working branch:** `review/pilot-report-variance-parallel`
- **Branch HEAD before this report:** `34bf718881bbab1686cf654515c9748074582781`
- **Orchestrator:** GPT-5.6 Sol, medium reasoning
- **Reviewers:** exactly four GPT-5.6 Luna reviewers, medium reasoning
- **Parallel proof:** one batch delegation, `deleg_f2ea202d`, started all four lanes at `2026-08-22 21:16:09`; all four genuinely overlapped and completed by `21:19:56`
- **Per-lane runtime:** A 225.59s; B 152.44s; C 144.74s; D 188.66s
- **Slowest lane:** 225.59s
- **Parallel wall clock:** 226.18s (about 3m 46s)
- **Exposed reviewer API calls:** A 16; B 11; C 11; D 22; total 60
- **Exposed worker tool calls:** A 34; B 28; C 18; D 39; total 119
- **Token counts:** not available
- **Nuave live/provider calls:** none. No OpenCode Go, OpenAI, Gemini, Groq, OpenRouter, or Tavily call was made.
- **Application baseline check:** before review and again before report writing, `git diff --quiet 028aaa72149c81d71b940adfcb16bd144f0df047..HEAD -- src tests package.json package-lock.json next.config.* playwright.config.* tsconfig.json` returned exit 0. Before this report, the branch differed from baseline only by the orchestrator prompt. Reviewers created no repository changes.

### Offline checks

Orchestrator:

```text
vitest run report-pipeline.test.ts report-pipeline-telemetry.test.ts
  variance.test.ts variance-workflow.test.ts
→ 4 files passed, 37 tests passed

scratch-report-binding.test.ts
→ 1 file passed, 2 tests passed
```

The four lanes also ran narrow offline suites: A 5 files/51 tests passed; B 4 files/58 tests passed; C 3 files/10 tests passed; D 6 files/54 tests passed after removing a Playwright spec mistakenly passed to Vitest. No full build or full E2E suite ran.

A scratch Playwright reset-race reproduction was attempted outside the repository. It could not start the disposable snapshot: Turbopack rejected the external `node_modules` symlink, and a bounded webpack retry stopped on the baseline CSS-module selector in `LandingAuditHero.module.css`. The complete deterministic test body is preserved under RVP-003. This was a harness limitation, not an application pass.

## 2. Executive verdict

**FAIL — one or more verified P0/P1 defects require correction**

**Verified counts:** P0 0 · P1 4 · P2 3 · P3 0

The protected report gate does not bind observations to the immutable locked prompt fields and does not positively prove a successful, search-grounded observation attempt. The variance route accepts browser-supplied prompts without proving they are the designated subset of the completed main run. Reset also fails to invalidate active report or variance requests, so stale completions retain write access to discarded workflow state. Three narrower P2 defects affect variance completeness, resumed-run cost accounting, and variance-result provenance validation.

## 3. Coverage table

| Lane                 | Actual scope                                                                                                    | Result                                                           | Unique value                                        | Important overlap                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| A — route boundaries | Report/variance routes, schemas, protected provider guards, production observation method, route-adjacent tests | RVP-001, RVP-002, RVP-004; raised RVP-007                        | Unique route-binding and designated-prompt findings | Corroborated D on report acceptance                               |
| B — core logic       | Report gate/pipeline, variance record logic, retry and telemetry budget flow, direct tests                      | RVP-005; corroborated RVP-001/RVP-002; raised budget concerns    | Unique failed-variance completeness defect          | Overlapped A/D on positive provenance                             |
| C — client/recovery  | `AuditWorkflow`, storage, report retry, variance restore, reset and stale async work                            | RVP-003, RVP-006                                                 | Unique client race and resumed-ledger findings      | Reset coverage overlaps D's test-gap lane                         |
| D — tests            | Report/variance unit tests, workflow E2E, route coverage inventory, adversarial scratch checks                  | Independently reproduced RVP-001/RVP-002; concrete coverage gaps | Strong independent corroboration and test inventory | Intentionally duplicated implementation findings only as coverage |

## 4. Verified findings

### RVP-001 — P1 — Report acceptance does not bind observation evidence to locked prompt fields

- **Code evidence:** `src/lib/audit/report-pipeline.ts:61-100`; request boundary `src/app/api/audit/report/route.ts:26-44`; downstream evidence mapping `src/lib/audit/contracts.ts:519-526`
- **Failure sequence:** A caller submits ten valid locked prompts and ten completed observations with matching `prompt_id` values, but changes an observation's `question`, `category`, or `branded` value. The gate checks ID-set membership, completion shape, and method metadata but never compares those immutable fields. Report synthesis therefore proceeds with forged or stale observation content under a familiar ID.
- **Expected:** Each observation must match its locked prompt's exact ID, question, category, and branded classification before any report call.
- **Actual:** Matching IDs are sufficient; mismatched immutable fields pass.
- **Impact:** Evidence from another question or run can be attributed to a locked question and materially change report findings, counts, excerpts, and recommendations.
- **Confidence:** High; found independently by A and D and reproduced offline by the orchestrator.
- **Minimal correction direction:** Centralize prompt↔observation immutable binding and apply it at the report route and library gate before synthesis.
- **Regression test:** Submit ten production-shaped records with one valid ID but mismatched question/category/branded fields; assert HTTP 422 and zero generator calls.

#### Reproduction

Disposable test body (outside the repository):

```ts
it("accepts mismatched immutable fields at the current gate", () => {
  const mismatched = completed.map((observation, index) =>
    index === 0
      ? {
          ...observation,
          question: "A forged question unrelated to the locked prompt",
          category: "public_information" as const,
          branded: !observation.branded,
        }
      : observation,
  );

  expect(() =>
    assertReportGenerationGate({
      brief: goldenBrief,
      prompts: goldenPrompts,
      observations: mismatched,
      safety_identifier: "scratch-review-only",
      budget: fixtureBudget,
    }),
  ).not.toThrow();
});
```

Command and result:

```text
npx vitest run scratch-report-binding.test.ts
→ passed; the forged binding was accepted
```

### RVP-002 — P1 — Failed or zero-search telemetry can satisfy the completed report-evidence gate

- **Code evidence:** `src/lib/audit/report-pipeline.ts:88-100`; `src/lib/audit/production-observation-method.ts:33-61`
- **Failure sequence:** Ten observations claim `run_status: "completed"`, carry non-empty answers and returned models, but their only observation telemetry entries are failed attempts with empty response IDs and `web_search_calls: 0`. `assertReportGenerationGate` requires only non-empty telemetry. `productionObservationMethodErrors` iterates completed calls but does not require one to exist and does not require successful web search. The report call proceeds.
- **Expected:** Every completed observation positively proves at least one successful protected observation attempt whose response/model provenance matches and whose required web search executed.
- **Actual:** Failed-only or completed zero-search telemetry can pass the gate.
- **Impact:** A paid report can be synthesized from evidence that telemetry says never completed under the required protected method.
- **Confidence:** High; A and D independently reproduced the variants, and the orchestrator reproduced failed-only zero-search acceptance.
- **Minimal correction direction:** Define one positive completed-attempt invariant: matching completed telemetry, non-empty response provenance, required search execution, and protected method fields. Reuse it at run resume, report acceptance, and variance-result validation.
- **Regression test:** Assert rejection of failed-only telemetry, completed telemetry with zero required-search calls, missing response ID, and returned-model mismatch before synthesis.

#### Reproduction

```ts
it("accepts failed-only zero-search telemetry at the current gate", () => {
  const failedOnly = completed.map((observation, index) => ({
    ...observation,
    telemetry: [
      fixtureCallTelemetry({
        stage: "observation",
        status: "failed",
        requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
        returned_model: "",
        response_id: "",
        web_search_calls: 0,
        failure_reason: `Synthetic failed attempt ${index + 1}`,
      }),
    ],
  }));

  expect(() =>
    assertReportGenerationGate({
      brief: goldenBrief,
      prompts: goldenPrompts,
      observations: failedOnly,
      safety_identifier: "scratch-review-only",
      budget: fixtureBudget,
    }),
  ).not.toThrow();
});
```

Command and result:

```text
npx vitest run scratch-report-binding.test.ts
→ passed; completed evidence backed only by failed zero-search attempts was accepted
```

### RVP-003 — P1 — Reset does not invalidate active report or variance work

- **Code evidence:** `src/app/audit/AuditWorkflow.tsx:253-331`, `714-768`, `951-973`, and the always-enabled reset control at `1043-1045`
- **Failure sequence:** The report or variance request starts. The user clicks **Mulai ulang**. `startOver()` clears state and storage but neither aborts the request nor advances a workflow/run identity. The old response later calls `setReport`, writes report/variance storage, sets errors, and may launch variance using the discarded closure. The persistence effect can store the stale report into the reset workflow.
- **Expected:** Reset aborts or invalidates active post-run work; late responses from the discarded workflow are ignored.
- **Actual:** Old requests retain write access after reset.
- **Impact:** Discarded paid work can resurrect stale report/variance state, attach errors to a new workflow, or start variance after the user reset.
- **Confidence:** High from deterministic control flow and independent C review. Browser execution was attempted but blocked by the disposable-snapshot tooling described in Metadata.
- **Minimal correction direction:** Add a workflow generation/run identity and abort controllers for report and variance. Invalidate both on reset and ignore responses whose identity is no longer current.
- **Regression test:** Delay report and variance responses, reset, release the old responses, and assert blank state/storage plus no follow-on variance.

#### Reproduction

```ts
await page.route("**/api/audit/report", async (route) => {
  sequence.push("report");
  signalReportStarted();
  await reportRelease;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ report, telemetry: [reportTelemetry] }),
  });
});
await page.route("**/api/audit/variance", async (route) => {
  sequence.push("variance");
  await route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Synthetic variance stop." }),
  });
});

await page.goto("/audit");
await expect.poll(budgetCalls).toBe(1);
await page.getByRole("button", { name: "Run the audit" }).click();
await reportStarted;
await page.getByRole("button", { name: "Mulai ulang" }).click();
releaseReport();

await expect
  .poll(() =>
    page.evaluate((key) => {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return false;
      return Boolean((JSON.parse(raw) as { report?: unknown }).report);
    }, AUDIT_WORKFLOW_STORAGE_KEY),
  )
  .toBe(true);
expect(sequence).toEqual(["run", "report", "variance"]);
```

Attempted command:

```text
npx playwright test tests/e2e/live-audit-variance.spec.ts -g "scratch reproduction"
```

The temporary app server did not start for the snapshot-specific reasons recorded in Metadata. The snippet and exact state transition are retained so the permanent regression can be added without relying on `/tmp`.

### RVP-004 — P1 — Variance requests are not tied to designated prompts from the completed main run

- **Code evidence:** `src/app/api/audit/variance/route.ts:38-67`; `src/lib/audit/variance.ts:60-75`; the legitimate browser selection exists only client-side at `src/app/audit/AuditWorkflow.tsx:274-290`
- **Failure sequence:** A caller sends any two or three structurally valid, unique prompts and an arbitrary `run_key`. The route validates only prompt shape, count, and unique IDs. It receives neither the completed main pack nor a server-verifiable binding, so it cannot prove the prompts are the stable designated subset selected from that run. It executes paid re-asks anyway.
- **Expected:** Variance executes only the designated 2–3 questions from the completed locked ten, preserving exact immutable fields and run association.
- **Actual:** The browser follows the rule, but the protected route accepts arbitrary prompt text/category/branded values and an opaque run key.
- **Impact:** Paid calls and the quality-gate variance record can measure unrelated questions while appearing attached to a completed report.
- **Confidence:** High from the complete request/route data flow.
- **Minimal correction direction:** Pass enough frozen main-run context for the route to recompute and compare the designated subset, or use another bounded verifiable run binding; durable server-owned jobs are not required for this Phase-3 check.
- **Regression test:** Send familiar IDs with altered prompt fields and send unrelated IDs; assert 422 before `liveExecuteAuditPrompt`.

#### Reproduction

Deterministic route steps:

1. POST `/api/audit/variance` with a valid brief, budget, safety identifier, arbitrary `run_key`, and two unique `promptSchema` objects not selected from the completed main ten.
2. Observe that `requestSchema` and `validateVarianceRequest({ prompt_ids })` pass.
3. Observe execution reaches `runQuestionWithRetry` at `route.ts:73-80`; there is no completed-pack comparison anywhere in the route.

### RVP-005 — P2 — A failed variance observation can be marked complete

- **Code evidence:** `src/lib/audit/variance.ts:149-183`, especially completeness at `169-172`
- **Failure sequence:** `createVarianceRecord` receives the expected number of matching observations with telemetry, but one observation has `run_status: "failed"` or no usable answer and the caller omits `incomplete_reason`. The helper computes `complete: true` because it checks only count, telemetry presence, and missing reason.
- **Expected:** Every designated re-ask must be evaluable under the variance contract before `complete: true`.
- **Actual:** Failed/unusable observations can be complete in direct or future callers.
- **Impact:** The quality-gate review can treat an incomplete variance measurement as complete.
- **Confidence:** High.
- **Minimal correction direction:** Derive completeness from positive evaluability and protected attempt provenance, not caller-supplied reason alone.
- **Regression test:** One failed observation with telemetry and no reason must produce `complete: false` or rejection.

### RVP-006 — P2 — Resumed observations can be counted twice in the report and variance budget ledger

- **Code evidence:** `src/app/audit/AuditWorkflow.tsx:847-876` and `714-753`; budget summation at `src/lib/audit/telemetry.ts:197-202`
- **Failure sequence:** A resumed run starts with completed observations. `runPriorCalls` includes those observations' telemetry. The terminal `finalObservations` also contains the same resumed observations. `createReport` constructs `reportInputCalls` from both `priorCalls` and every final observation's telemetry, duplicating the resumed entries. Server accounting sums array entries without deduplication and the inflated ledger is handed to variance.
- **Expected:** Each actual provider attempt appears exactly once in the cumulative ledger.
- **Actual:** Resumed observation calls can be counted twice.
- **Impact:** Valid paid work may be stopped by a false cost/stage ceiling, and report method telemetry can overstate cost/calls.
- **Confidence:** High from the client data flow; unique to C.
- **Minimal correction direction:** Build the ledger from one canonical source or merge telemetry by stable call identity before report/variance requests.
- **Regression test:** Resume with known observation response IDs, complete the remaining questions, and assert every response ID occurs once in the report and variance budgets.

### RVP-007 — P2 — Variance output has no explicit protected-method postcondition

- **Code evidence:** `src/app/api/audit/variance/route.ts:73-85`, `169-176`; `src/lib/audit/variance.ts:149-183`
- **Failure sequence:** A provider adapter regression returns an observation with the expected prompt ID and telemetry array but wrong system/model, failed-only telemetry, missing response provenance, or no required search. The route passes it directly to `createVarianceRecord`, whose completeness logic does not enforce the protected observation method.
- **Expected:** Variance uses and proves the same locked protected observation postcondition as the main run.
- **Actual:** The route selects the protected executor but does not validate its returned evidence before marking the record.
- **Impact:** A malformed provider result can make variance look complete and undermine the quality-gate measurement, though it remains separate from main report counts.
- **Confidence:** Medium-high; current executor is correctly selected, so this is a concrete fail-closed robustness defect rather than an observed adapter failure.
- **Minimal correction direction:** Apply the same positive protected-attempt validator recommended for RVP-002 before creating the variance record.
- **Regression test:** Mock the protected executor to return wrong-method, failed-only, and zero-search observations; assert incomplete/rejection and truthful budget retention.

## 5. Rejected, duplicate, and downgraded claims

- **Full server-owned run state/idempotency:** Rejected as a current defect. Spec 003 explicitly defers durable jobs and server-owned run state to Phase 4. RVP-004 is narrower: the current route can validate a supplied frozen pack/subset without building durable ownership.
- **Report shown before variance settles:** Rejected. `deriveAuditStep` receives `hasReport: Boolean(report && varianceSettled)` at `AuditWorkflow.tsx:530-535`, and PDF is also gated by `report && varianceSettled` at `1046-1050`.
- **Report retries lose prior report telemetry:** Rejected for the ordinary fresh-run path. Failed report telemetry is appended to `setupTelemetry` and carried into the retry. The distinct resumed-observation duplication survives as RVP-006.
- **B-05 — initial report budget failure returns `telemetry: []`:** Rejected as an active real-client ledger-loss defect. The route does not echo the supplied ledger, but the real client does not replace `setupTelemetry` with the error response; it only appends returned telemetry when present (`AuditWorkflow.tsx:754-757`). The already-held setup ledger and observation telemetry therefore remain available for a later retry. The asymmetric response contract is worth tightening, but the proposed loss sequence does not occur on the current client path.
- **Failed-only telemetry, zero-search telemetry, and missing positive response provenance:** Merged into RVP-002 as one positive completed-attempt invariant rather than three inflated findings.
- **Variance arbitrary-prompt acceptance and missing variance output validation:** Kept separate as RVP-004 and RVP-007. The first is an active request-boundary integrity defect; the second is a narrower fail-closed postcondition defect.
- **Reset during report versus reset during variance:** Merged into RVP-003 because the root cause is the same missing workflow identity/abort boundary.
- **Route/test coverage reports:** Kept under Important test gaps rather than counted again as implementation findings.

## 6. Important test gaps

1. No report-route test sends a valid production-shaped request through the real route boundary and then mutates prompt↔observation immutable fields.
2. No positive report-gate test requires a successful, response-linked, search-grounded observation attempt; current tests prove only system/model-shaped rejection.
3. No variance-route test proves the requested prompts are the designated subset of the actual completed main pack.
4. No variance-route test mocks malformed protected-executor output and requires an incomplete/fail-closed record.
5. No client test delays report or variance, resets, and releases the stale response.
6. No resumed-run test proves telemetry response IDs appear exactly once in report and variance budget payloads.
7. Existing E2E covers successful ordering, terminal variance failure, and restored completed variance, but not report retry, reload with nonterminal variance, overlapping post-run attempts, or late responses after reset.

## 7. Orchestration evaluation

- **Raw worker findings:** 13 (A 4, B 5, C 2, D 2)
- **Verified findings after synthesis:** 7
- **Duplicates merged:** 5 raw duplicates. A-01/B-02/D-01 merged into RVP-001; A-02/B-01/D-02 merged into RVP-002; A-03/B-04 merged into RVP-004. Report-reset and variance-reset scenarios remained one root-cause finding, RVP-003.
- **Worker claims rejected:** 1 (B-05, because the real client preserves rather than replaces its existing ledger). Three additional review questions were inspected and rejected before becoming findings: full server-owned idempotency as a Phase-3 requirement, early report display, and ordinary fresh-path report telemetry loss.
- **Severity downgrades:** B-03 was downgraded P1 → RVP-005 P2 because the current route supplies `incomplete_reason` for exhausted real outcomes; the helper remains unsafe for direct/future callers but the normal route does not currently produce the claimed false-complete state. A-04 remained P2 as RVP-007 because the current protected executor is correctly wired. Route-coverage gaps were not promoted to implementation P1s.
- **Unique-value lanes:** A uniquely established route binding and arbitrary variance acceptance; B uniquely established false variance completeness; C uniquely established reset races and resumed-ledger duplication; D added independent adversarial reproduction and coverage precision.
- **Four lanes sufficient:** yes. Independent corroboration remained strong for the two report-integrity findings while each implementation lane still produced unique value.
- **Redundancy/breadth:** A and D overlapped intentionally on report acceptance; B also touched the same gate. D remained useful because it reproduced the claims and prevented test gaps from being mistaken for extra defects. A was slowest partly because one broad search timed out.
- **Slowest reviewer:** 225.59s
- **Exposed worker calls:** 60 reviewer API calls and 119 tool invocations
- **Token count:** not available
- **Comparison with previous five-agent pilot:** Four lanes preserved independent corroboration while reducing one dedicated provider/method lane. The combined route/method lane was sufficient, and the test lane still challenged it independently. Overlap was lower and every lane produced unique value.
- **Overnight whole-repo structure:** keep four role types per bounded subsystem—request/method boundary, pure core/integrity, client/recovery, and adversarial tests—then run several subsystem batches with disjoint file ownership and one Sol synthesis pass. Do not add a fifth reviewer unless a subsystem has a genuinely separate security/provider boundary.
- **Usage reduction:** give each lane exact file paths plus a precomputed test inventory and prohibit repository-wide searches; Lane A lost about one minute to an overbroad timed-out search without adding coverage.

## 8. Quota measurement

- **platform-reported quota before:** not available
- **platform-reported quota after:** not available
- **model/tool metrics:** four GPT-5.6 Luna reviewers; per-lane runtimes above; 60 reviewer API calls; 119 exposed tool invocations; token counts not available
- **founder-reported meter before:** pending
- **founder-reported meter after:** pending
- **founder-reported delta:** pending

## 9. Recommended next action

Fix one bounded set of verified defects before further review: centralize immutable prompt binding and positive protected-attempt validation (RVP-001/RVP-002/RVP-007), enforce variance designation against the completed locked pack (RVP-004/RVP-005), and add workflow identity/abort plus canonical telemetry merging (RVP-003/RVP-006). Add the listed regression tests first. After that bounded correction verifies offline, proceed to the whole-repo overnight review architecture using the same four-lane pattern.
