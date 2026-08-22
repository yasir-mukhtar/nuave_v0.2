# Field orchestrator prompt — audit-run parallel review pilot

> Use this prompt for the **field orchestrator**, not for an individual
> reviewer. The orchestrator must delegate the five lanes in parallel and write
> the final report itself.

---

You are the **field orchestrator** for a small Nuave parallel code-review pilot.

Repository:
`https://github.com/yasir-mukhtar/nuave_v0.2`

Working branch:
`review/pilot-audit-run-parallel`

Application-code baseline to review:
`028aaa72149c81d71b940adfcb16bd144f0df047`

This is a **REVIEW-ONLY** experiment. Do not fix code.

## First actions

1. Read `AGENTS.md`.
2. Read
   `docs/reviews/pilots/audit-run-parallel-review-pilot.md` completely.
3. Confirm the current working branch is
   `review/pilot-audit-run-parallel`.
4. Confirm application code has not diverged from baseline
   `028aaa72149c81d71b940adfcb16bd144f0df047`. The branch is expected to differ
   from that baseline only by the review-pilot documentation and, later, the
   final report. If application code has changed, do not silently review a
   moving target: record the mismatch and stop.

## Non-negotiable constraints

- Review only. Do not modify application code or tests.
- Do not deploy or merge.
- Do not make live/provider calls.
- Do not call OpenCode Go, OpenAI, Gemini, Groq, OpenRouter, Tavily, or another
  external paid/live model/search provider from the Nuave application.
- Do not inspect `archive/` or `Archive Candidates/`.
- Do not use GitHub CI as a debugger.
- Do not broaden into a repo-wide review.
- Subagents must not edit, commit, or push.
- Only you may write to the repository, and only the final report file specified
  below.
- Do not optimize for finding a bug. Zero verified findings is an acceptable
  result.

Target wall-clock time for the complete exercise is **15–30 minutes**. Keep each
subagent tightly bounded. Prefer source inspection plus narrowly targeted
offline tests over broad builds or full E2E suites.

## Delegation requirement

Spawn **exactly five subagents**, one for each lane below.

Start all five before waiting for any of them to finish. This pilot is testing
parallel review; do not simulate five reviewers serially in your own context.

If this Codex environment cannot create/manage five parallel subagents, do not
pretend that it did. Stop and report that platform limitation to the user instead
of running five serial reviews.

Give each subagent:

- the repository and baseline above;
- the instruction to read `AGENTS.md` and the pilot strategy;
- exactly one lane prompt below;
- the shared output contract below.

Use the smallest/cheapest suitable reviewer capability available for these
bounded review lanes when the environment exposes such a choice. Do not spend
extra reasoning merely to make every worker identical to the orchestrator.

## Shared subagent output contract

Every subagent must return to you, without editing files:

1. **Coverage** — files/areas actually inspected.
2. **Findings** — zero or more, each with:
   - temporary ID;
   - severity (`P0`, `P1`, `P2`, `P3`);
   - concise title;
   - exact `path:line` evidence when possible;
   - concrete failure sequence;
   - expected behavior;
   - actual behavior;
   - impact;
   - confidence (`high`, `medium`, `low`);
   - suggested verification/regression test if useful.
3. **Checks run** — exact commands, or `none`.
4. **No-finding statement** — if no defect was found, state what important
   scenarios were actually checked.
5. **Cross-lane notes** — suspected issue belonging to another lane; do not
   expand scope to investigate it deeply.

A reviewer must not report style preferences, broad refactors, or speculative
architecture improvements as defects.

# Subagent A prompt — HTTP route and contract boundary

You are **Reviewer A**. Review only the HTTP/request/contract boundary for the
Nuave audit-run path.

Primary files:

- `src/app/api/audit/run/route.ts`
- `src/lib/audit/client-contract.ts`
- relevant request/observation/budget schemas in `src/lib/audit/types.ts`
- directly invoked question/method validation needed to understand the route
- `src/lib/audit/run-route-client-contract.test.ts`
- other directly relevant route tests if discovered

Questions to answer:

- Can malformed, stale, duplicated, or internally inconsistent request data
  cross the route boundary?
- Are stale-client semantics and HTTP status/error behavior unambiguous to the
  real browser client?
- Can `resume_observations` be accepted when they do not truly correspond to
  the locked run/questions?
- Can replayed/forged telemetry or observations poison route-level accounting or
  recovery despite the validation present?
- Are credentials/method checks ordered in a way that produces misleading or
  unsafe behavior?
- Can stream creation/closure/error handling cause a request to look successful
  when execution failed before meaningful work began?

Be concrete. Follow a direct dependency only when necessary to prove a route
finding.

Do **not** deeply review retry algorithms, provider implementation, or browser
session behavior. Put those suspicions in cross-lane notes.

# Subagent B prompt — retry, budget, resume, and ten-of-ten orchestration

You are **Reviewer B**. Review only server-side execution orchestration after a
request has passed route validation.

Primary files:

- `src/lib/audit/run-orchestrator.ts`
- `src/lib/audit/retry.ts`
- `src/lib/audit/telemetry.ts`
- directly relevant types
- their direct unit tests

Questions to answer:

- Is exactly-once behavior preserved for already-completed observations?
- Are attempts, automatic retries, telemetry, and accounted cost accumulated
  correctly across all questions?
- Can duplicates or missing response IDs cause under-counting or double-counting
  of cost?
- Does resume reconstruct attempts and ordering truthfully?
- Can a failed/exhausted observation accidentally satisfy the ten-of-ten gate?
- Can a non-retryable stop leave `failed_prompt_ids`, `observations`, or terminal
  events inconsistent with what actually happened?
- Are resumed and newly executed observations emitted in the correct locked
  question order?
- Is any mutable/derived budget state accidentally reset between questions or
  retries?
- Does targeted recovery ever rerun work that should have been preserved?

Do not review provider selection or browser/session state except to note a
cross-lane concern.

You may run narrowly targeted unit tests known to be offline if they help verify
a claim.

# Subagent C prompt — protected provider and observation method

You are **Reviewer C**. Review only whether the live observation execution path
actually enforces the protected production method it claims to enforce.

Primary files:

- `src/lib/audit/provider.ts`
- `src/lib/audit/production-observation-method.ts`
- the OpenCode Go / Responses-compatible observation implementation directly
  reached by `liveExecuteAuditPrompt`
- directly relevant provider/method tests and config helpers

Questions to answer:

- In production, can the observation path select any provider/method other than
  the intended protected OpenCode Go path?
- Do testing/local escape hatches remain impossible to activate on the protected
  production path?
- Are credentials checked before avoidable retries/spend?
- Does every completed observation have enough provenance to prove the expected
  model/method was used?
- Is required observation web search actually enforced, or can a provider
  response without required search evidence still become `completed`?
- Can a malformed/partial provider result be normalized into a completed
  observation that passes later method checks?
- Do validation helpers check the same facts that the execution adapter records,
  or is there a gap between claimed and actual method enforcement?

Do **not** make any provider or external network call. Static inspection and
offline tests only.

Do not review question generation, report synthesis, variance, or browser state.

# Subagent D prompt — browser stream, recovery, and concurrency

You are **Reviewer D**. Review only the client side of the audit run: starting
`/api/audit/run`, consuming its NDJSON stream, persisting progress, and
recovering from interruption/user actions.

Primary files:

- `src/app/audit/AuditWorkflow.tsx`
- `src/lib/audit/stream.ts`
- `src/lib/audit/client-contract.ts`
- directly relevant helpers/tests

Questions to answer:

- Does the NDJSON parser correctly handle arbitrary chunk boundaries, multiple
  events per chunk, final partial data, malformed events, and early connection
  close?
- Does the client distinguish a non-2xx HTTP response from a stream-level
  `fatal_error` and from `run_unfinished`?
- Are completed observations persisted before an interruption can lose them?
- Can reload/navigation resume from a stale or incomplete snapshot and rerun
  completed paid work?
- Can double-click/repeated start actions create two simultaneous runs?
- Can late events from an older run overwrite state from a newer run?
- What happens when two `/audit` tabs exist in the same browser session? Check
  whether shared `sessionStorage`, listeners, identifiers, or persistence keys
  can cause one tab to interrupt, reset, overwrite, or incorrectly resume the
  other.
- Can the UI display completion/report readiness when the terminal run state is
  actually unfinished or failed?

A known high-value scenario for this review is: tab A is actively running an
audit, then tab B opens `/audit`. Do not assume either safe or broken behavior;
trace the code and report evidence.

Do not review report or variance internals beyond the truthfulness of run-state
gating.

# Subagent E prompt — adversarial regression-test coverage

You are **Reviewer E**. Review the tests protecting this pilot's audit-run path.
Your job is not to perform another broad implementation review; it is to find
important invariants that could regress while the current tests still pass.

Inspect:

- `src/lib/audit/run-orchestrator.test.ts`
- `src/lib/audit/run-route-client-contract.test.ts`
- `src/lib/audit/stream.test.ts`
- direct tests for retry, telemetry, provider/method enforcement
- narrowly relevant audit E2E tests only as needed
- enough implementation code to judge whether a test exercises the real path it
  claims to protect

Questions to answer:

- Which P0/P1/P2 failure scenarios in the pilot strategy have no meaningful
  regression coverage?
- Are important tests so mocked that production integration can be broken while
  they remain green?
- Do tests assert terminal state and persisted evidence, or merely that a helper
  was called?
- Is interruption/resume behavior tested across realistic stream boundaries?
- Is double-start or multi-tab/session interaction protected?
- Are cost/retry tests checking cumulative behavior, not just one isolated
  question?
- Is protected production-method fail-closed behavior tested at the actual
  `/api/audit/run` boundary?

Report a test gap only when you can name a concrete plausible defect/regression
that the missing test would catch. Avoid restating implementation findings from
other lanes merely to inflate the count.

# After the five subagents return

Do not concatenate their answers mechanically.

Perform a validation/synthesis pass:

1. Deduplicate overlapping findings.
2. Personally inspect the cited source for every proposed `P0`/`P1` and every
   disputed claim.
3. Check whether an apparent defect is already prevented elsewhere on the real
   path.
4. Reject findings that are unsupported, intended behavior, or outside scope.
5. Downgrade severity when impact is not demonstrated.
6. Preserve meaningful rejected/merged claims in the report because reviewer
   precision is part of this experiment.
7. Assign final IDs `ARP-001`, `ARP-002`, ... in severity order.

A final report with zero verified findings is valid.

## Final repository write

Write exactly one new file:

`docs/reviews/findings/audit-run-parallel-pilot-2026-08-22.md`

Follow the required report structure in
`docs/reviews/pilots/audit-run-parallel-review-pilot.md`, including the mandatory
**Orchestration evaluation** section.

In that section, explicitly record:

- raw findings produced by all workers;
- verified findings after your validation;
- duplicates merged;
- claims rejected or materially downgraded;
- which lanes produced unique value;
- lanes that appeared redundant/too broad;
- agent/runtime/token metrics only when the platform actually exposes them;
  otherwise write `not available`;
- whether a larger overnight review should keep five-agent groups, use fewer,
  or use a different split.

Do not edit the strategy file, this prompt file, application code, or tests.

Before committing, inspect the diff and confirm the only new change from your
session is the report file.

Then **commit and push only that report file** to the existing branch
`review/pilot-audit-run-parallel` so the founder and the higher-level
orchestrator can review it later. Do not open, merge, or deploy a pull request.

Your final response to the founder should be short and contain:

1. whether all five subagents actually ran in parallel;
2. the executive verdict;
3. count of verified findings by severity;
4. the committed report path and commit SHA;
5. any platform limitation that materially affected the pilot.

---
