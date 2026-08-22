# Pilot — parallel code review of audit-run execution and recovery

> Status: ready to run
> Date prepared: 2026-08-22
> Baseline commit: `028aaa72149c81d71b940adfcb16bd144f0df047`
> Working branch: `review/pilot-audit-run-parallel`
> Mode: review only — no application-code changes
> Target wall-clock time: 15–30 minutes

## Why this pilot exists

This is a small-scale test of a review pattern we may later use across the full
Nuave repository:

1 field orchestrator → 5 parallel specialist reviewers → 1 validated report.

The goal is not to maximize the number of comments. The goal is to learn whether
five bounded parallel reviews produce useful, non-duplicative, evidence-backed
findings quickly enough to justify scaling the pattern to an overnight repo-wide
review.

The pilot therefore evaluates two things at once:

1. the correctness and resilience of the audit-run execution/recovery path; and
2. the quality and efficiency of the multi-agent review process itself.

## Review target

Review the production path that begins when the browser starts the ten-question
audit run and ends when the client receives a terminal run event.

Conceptually:

`AuditWorkflow` → `POST /api/audit/run` → provider/method guard → retry/run
orchestration → NDJSON stream → browser recovery/state.

### Primary implementation files

- `src/app/api/audit/run/route.ts`
- `src/lib/audit/run-orchestrator.ts`
- `src/lib/audit/retry.ts`
- `src/lib/audit/provider.ts`
- `src/lib/audit/production-observation-method.ts`
- `src/lib/audit/telemetry.ts`
- `src/lib/audit/stream.ts`
- `src/lib/audit/client-contract.ts`
- `src/lib/audit/types.ts`
- `src/app/audit/AuditWorkflow.tsx`

### Primary test files

- `src/lib/audit/run-orchestrator.test.ts`
- `src/lib/audit/run-route-client-contract.test.ts`
- `src/lib/audit/stream.test.ts`
- provider/retry/telemetry tests directly associated with the files above
- narrowly relevant audit E2E coverage only when needed to judge a concrete
  finding

Reviewers may follow a direct dependency when necessary to prove or disprove a
finding. They must not broaden into a general review of report synthesis,
variance, extraction, question generation, landing, checkout, fixture journeys,
or archived material.

## Central review question

Can a real ten-question audit run be duplicated, corrupted, incorrectly resumed,
incorrectly accepted, incorrectly rejected, under-accounted, over-accounted, or
left in a misleading client state under realistic failures or user actions?

High-value failure scenarios include:

- malformed or stale clients;
- a provider/method configuration that should fail closed;
- interrupted streaming;
- retries and exhausted retries;
- resumed observations;
- duplicate/replayed telemetry;
- cost-ceiling behavior;
- browser reload/navigation;
- double-start or repeated user actions;
- two `/audit` tabs interacting with browser session state;
- terminal events that disagree with the observations actually collected.

## Hard constraints

All participants must read `AGENTS.md` first and obey it.

This pilot is **review only**.

Do not:

- modify application code or tests;
- fix findings;
- deploy or merge;
- make any live provider call;
- call OpenCode Go, OpenAI, Gemini, Groq, OpenRouter, Tavily, or another paid or
  live external model/search provider;
- read `archive/` or `Archive Candidates/`;
- weaken tests;
- use GitHub CI as a debugger;
- expand the review beyond the target above.

Targeted offline tests are allowed when they materially verify a finding and are
known not to make live/provider calls. A full `npm run verify`, full E2E run, or
build is not required for this time-boxed review.

Only the **field orchestrator** may write to the repository, and only to create
the final review report named below. Subagents must return findings to the field
orchestrator without editing files.

## Evidence standard

A finding is reportable only when it contains:

- a concrete failure scenario;
- exact supporting code location(s) using `path:line` when possible;
- expected behavior versus actual behavior;
- user, correctness, reliability, security, or cost impact;
- severity;
- confidence;
- enough reasoning for the field orchestrator to reproduce the conclusion from
  the source.

Do not report style preferences, speculative architecture improvements, or
"could be cleaner" comments as defects.

### Severity

- **P0 — Critical:** plausible production behavior can cause severe security,
  privacy, irreversible data/cost damage, or fundamentally invalid audit output.
- **P1 — High:** plausible behavior can break or materially corrupt a paid audit,
  bypass a protected production invariant, duplicate meaningful spend, or lose
  recoverable completed work.
- **P2 — Medium:** real defect with bounded impact, degraded recovery, misleading
  state, or meaningful test weakness that is unlikely to destroy an audit.
- **P3 — Low:** small correctness/resilience issue worth fixing but not currently
  threatening the core run.

When severity is uncertain, choose the lower level and explain the uncertainty.

## Five parallel review lanes

The field orchestrator must create exactly five specialist subagents and start
all five before waiting for results.

### Lane A — HTTP route and input/contract boundary

Owns request parsing, validation, response semantics, resume-input validation,
client-version contract, and route-level streaming/error behavior.

Primary files:

- `src/app/api/audit/run/route.ts`
- `src/lib/audit/client-contract.ts`
- relevant schemas in `src/lib/audit/types.ts`
- directly relevant question-pack/method validation called by the route
- `src/lib/audit/run-route-client-contract.test.ts`

Avoid deep review of retry internals, provider implementation, or browser state;
refer cross-lane concerns to the orchestrator.

### Lane B — retry, budget, resume, and ten-of-ten orchestration

Owns execution sequencing and state accumulation after route validation.

Primary files:

- `src/lib/audit/run-orchestrator.ts`
- `src/lib/audit/retry.ts`
- `src/lib/audit/telemetry.ts`
- relevant types
- their direct unit tests

Focus on attempt accounting, deduplication, resume semantics, completed-work
preservation, failed-question semantics, non-retryable stops, cost ceilings, and
the ten-of-ten terminal gate.

Avoid provider-selection and browser-state review.

### Lane C — protected provider and observation-method enforcement

Owns the boundary that is supposed to guarantee the protected live production
method for each observation.

Primary files:

- `src/lib/audit/provider.ts`
- `src/lib/audit/production-observation-method.ts`
- the OpenCode Go / Responses-compatible observation implementation reached by
  `liveExecuteAuditPrompt`
- directly relevant provider/method tests

Focus on fail-closed production selection, credentials, exact model/method
provenance, required observation web search, testing-only escape hatches, and
whether a completed observation can be accepted without satisfying the protected
method.

Do not make a provider call.

### Lane D — browser stream, recovery, and concurrency behavior

Owns the client side from sending `/api/audit/run` through terminal event
handling and session recovery.

Primary files:

- `src/app/audit/AuditWorkflow.tsx`
- `src/lib/audit/stream.ts`
- `src/lib/audit/client-contract.ts`
- directly relevant tests/helpers

Focus on NDJSON parsing, partial chunks, HTTP errors versus stream events,
interruption, reload/navigation, persisted observations, stale state,
double-start behavior, and especially two `/audit` tabs sharing browser session
state.

Do not review report/variance internals beyond checking that run completion is
represented truthfully.

### Lane E — adversarial test-coverage review

Owns the question: "Which important run-path invariants can regress while the
current tests still pass?"

Primary material:

- tests associated with all files in this pilot;
- enough implementation context to judge whether each test exercises the real
  behavior it claims to protect.

Look for mocked-away risk, false-positive tests, missing boundary cases, and
important failure scenarios with no regression test. Report a test gap only with
a concrete plausible defect/regression it would fail to catch.

Do not duplicate implementation findings merely to increase the finding count.

## Subagent output contract

Each reviewer returns to the field orchestrator:

1. **Coverage:** files/areas actually inspected.
2. **Findings:** zero or more findings in this format:

   - temporary ID
   - severity
   - title
   - `path:line` evidence
   - failure scenario
   - expected behavior
   - actual behavior
   - impact
   - confidence (`high`, `medium`, or `low`)
   - suggested verification or regression test, if useful

3. **Checks run:** commands run, or `none`.
4. **No-finding statement:** if no defect was found, say what was specifically
   checked rather than returning an empty response.
5. **Cross-lane notes:** suspected issues belonging to another reviewer, without
   independently expanding scope.

Subagents must not edit, commit, or push.

## Field-orchestrator responsibilities

The field orchestrator is not a sixth broad reviewer. Its job is to make the
five reviews trustworthy.

After all five return, it must:

1. deduplicate overlapping claims;
2. inspect the cited source itself for every proposed P0/P1 finding and any
   disputed finding;
3. reject findings that are unsupported, intended behavior, already guarded, or
   outside scope;
4. lower severity when the claimed impact is not demonstrated;
5. preserve useful disagreement in a short "contested/rejected claims" section;
6. assign final IDs `ARP-001`, `ARP-002`, ... in severity order;
7. produce one final report and no code changes.

A good pilot may legitimately finish with zero verified defects. Finding count
is not a success metric.

## Required report

The field orchestrator writes exactly one new file:

`docs/reviews/findings/audit-run-parallel-pilot-2026-08-22.md`

The report must contain:

### 1. Metadata

- baseline SHA reviewed;
- working branch;
- five lanes started/completed/failed;
- offline commands run;
- any material limitation.

### 2. Executive verdict

One of:

- `PASS — no verified defects found in this bounded review`
- `PASS WITH FINDINGS — no P0/P1, but verified lower-severity defects/gaps exist`
- `FAIL — one or more verified P0/P1 findings require correction before relying on this path`

Include a 3–6 sentence explanation.

### 3. Coverage table

For each lane: scope actually reviewed, result, and whether it contributed a
unique verified finding.

### 4. Verified findings

For each final finding:

- ID and severity;
- concise title;
- evidence (`path:line`);
- concrete reproduction/failure sequence;
- expected versus actual;
- impact;
- confidence;
- recommended correction direction (not a patch);
- recommended regression coverage.

### 5. Contested/rejected/duplicate claims

Briefly record meaningful claims the orchestrator rejected, merged, or
reclassified. This is required because it lets us assess reviewer precision.

### 6. Important test gaps

Only gaps that remain after deduplication and are tied to a concrete failure
scenario.

### 7. Orchestration evaluation

This section is mandatory for the pilot. Record:

- how many raw findings the five agents produced;
- how many survived validation;
- how many were duplicates;
- how many were rejected or materially downgraded;
- which lanes produced unique useful information;
- whether any lane appeared redundant or too broad;
- whether the five-agent split should be kept, reduced, or changed for a larger
  overnight review;
- any obvious way to reduce agent/token usage without losing coverage.

Use observed results, not invented token or runtime numbers. If the platform
does not expose a number, say `not available`.

### 8. Recommended next action

Name the smallest next action only. Do not implement it.

## Success criteria for the experiment

The pilot succeeds when:

- five reviewers actually run in parallel rather than being simulated serially;
- all five remain inside their lanes;
- the orchestrator validates rather than blindly concatenates findings;
- the final report is evidence-backed and deduplicated;
- no application code changes;
- no provider/live calls;
- the report gives enough meta-evidence to decide whether this orchestration
  pattern is worth scaling.
