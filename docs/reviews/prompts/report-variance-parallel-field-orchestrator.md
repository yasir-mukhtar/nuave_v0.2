# Field orchestrator prompt — report/variance parallel review pilot

> Give this file to the **field orchestrator**. It is self-contained: the orchestrator must spawn four reviewers in parallel, validate their claims, and write one final report.

---

You are the **field orchestrator** for Nuave's second small-scale parallel code-review pilot.

Repository:
`https://github.com/yasir-mukhtar/nuave_v0.2`

Working branch:
`review/pilot-report-variance-parallel`

Application-code baseline to review:
`028aaa72149c81d71b940adfcb16bd144f0df047`

Expected orchestrator model:
**GPT-5.6 Sol, medium reasoning**.

Required reviewer model:
**exactly four GPT-5.6 Luna reviewers**, medium/default reasoning where Hermes exposes that control.

This is a **REVIEW-ONLY** experiment. Do not fix application code.

## Goal

Review the bounded path after the ten main audit observations finish:

`run completed → /api/audit/report → report pipeline → /api/audit/variance → final completion/recovery UI`

The purpose is twofold:

1. find real correctness/integrity/recovery defects in this subsystem;
2. test whether **one Sol orchestrator + four parallel Luna reviewers** gives enough coverage with less redundancy than the previous five-reviewer pilot.

Target wall-clock time for the entire exercise: **15–30 minutes maximum**.

## First actions

1. Read `AGENTS.md`.
2. Read `specs/003-live-report-quality-gate/SPEC.md` only for requirements relevant to report generation, variance, cost, provenance, and completion/recovery.
3. Read the previous pilot report only for orchestration lessons, not as authority for findings in this subsystem:
   `docs/reviews/findings/audit-run-parallel-pilot-2026-08-22.md` if it exists on another branch or is otherwise accessible. Do not import its findings mechanically.
4. Confirm the current branch is `review/pilot-report-variance-parallel`.
5. Confirm application code matches baseline `028aaa72149c81d71b940adfcb16bd144f0df047` before review. This branch should initially differ only by this prompt file. If application code differs, stop and report the mismatch rather than reviewing a moving target.

## Non-negotiable constraints

- Review only. Do not modify application code or tests.
- Do not deploy, merge, open a PR, or change production configuration.
- Do not make live/provider calls.
- Do not call OpenCode Go, OpenAI, Gemini, Groq, OpenRouter, Tavily, or any external paid/live provider from Nuave.
- Do not run scripts under `scripts/` that may spend money.
- Do not inspect `archive/` or `Archive Candidates/`.
- Do not use GitHub CI as a debugger.
- Do not broaden into intake, extraction, question generation, the main ten-observation run, landing pages, payment, Phase 4 durable jobs, or Phase 5 public controls unless a direct dependency is necessary to prove a finding.
- Subagents must not edit, commit, or push.
- Only the field orchestrator may write to the repository, and only the final report file named below.
- Zero verified findings is an acceptable outcome.
- Do not report style preferences, generalized refactors, or later-phase architecture as current defects.

## Parallel delegation requirement

Spawn **exactly four subagents**.

Start all four before waiting for any of them to finish. They must genuinely overlap in time.

If Hermes cannot create/manage four parallel subagents, stop and report that platform limitation. Do not simulate four agents serially.

Use `gpt-5.6-luna` for all four reviewers.

Give every reviewer:

- repository and baseline above;
- instruction to read `AGENTS.md`;
- only its lane below;
- the shared output contract below.

Avoid duplicate work. Each reviewer should stay inside its lane unless following one direct dependency is necessary to prove or reject a claim.

## Shared reviewer output contract

Each reviewer returns to the field orchestrator, without editing files:

1. **Coverage** — files and important functions actually inspected.
2. **Findings** — zero or more. Each candidate finding must include:
   - temporary ID;
   - severity `P0`, `P1`, `P2`, or `P3`;
   - concise title;
   - exact `path:line` evidence when possible;
   - concrete failure sequence;
   - expected behavior;
   - actual behavior;
   - user/product/cost/integrity impact;
   - confidence `high`, `medium`, or `low`;
   - proposed minimal regression test.
3. **Checks run** — exact commands or `none`.
4. **No-finding statement** — if none, state which important scenarios were checked.
5. **Cross-lane notes** — suspected issue belonging elsewhere; do not deeply investigate it.

### Execution budget per reviewer

Before creating scratch reproductions, search existing tests first.

A reviewer may run narrowly targeted offline tests. Limit scratch/adversarial execution to **at most two minimal reproductions per lane** unless the field orchestrator later requests one additional check to resolve a disputed P0/P1.

Do not run the full build or full E2E suite as part of the reviewer lanes.

For every scratch reproduction supporting a proposed P0/P1, return enough information for another engineer to recreate it: exact command plus either the complete temporary test body or a concise executable reproduction snippet. Do not return only "scratch test passed."

# Reviewer A — request acceptance, protected method, and route boundaries

Review the server boundaries that accept report and variance requests and decide what data/method is allowed to proceed.

Primary files:

- `src/app/api/audit/report/route.ts`
- `src/app/api/audit/variance/route.ts`
- relevant request schemas in `src/lib/audit/types.ts`
- `src/lib/audit/production-observation-method.ts`
- relevant provider-selection/config guards reached by these routes
- directly relevant route tests

Questions to answer:

- Can `/api/audit/report` accept observations that do not truly correspond to the ten locked prompts, even though IDs or lengths look correct?
- Does report acceptance positively prove every "completed" observation was produced by a successful protected observation attempt with the required provenance/search evidence?
- Can forged/stale/cross-run prompt or observation fields become report evidence?
- Are duplicate IDs, duplicate observations, mismatched question/category/branded fields, or reordered identities rejected at the earliest safe boundary?
- Does the report route fail closed to the protected report provider/method before any synthesis call?
- Can testing-only provider configuration reach a protected production path?
- Does `/api/audit/variance` verify that its 2–3 prompts are legitimate designated prompts from the completed main run, or merely structurally valid prompts supplied by the browser?
- Can the caller choose arbitrary prompt text/category/branded values under familiar IDs for variance?
- Does variance use the same protected observation method and required web-search provenance as the main run?
- Are route error codes/statuses sufficiently truthful for the real client to distinguish integrity, transient, and budget failures?

Do not deeply review report prose/claim logic, budget accumulation internals, or React state. Put those in cross-lane notes.

# Reviewer B — report/variance core logic, integrity, budget, and separation

Review the pure/server-side logic after requests pass their route boundaries.

Primary files:

- `src/lib/audit/report-pipeline.ts`
- directly invoked report validation/claim/language/priority helpers only as necessary
- `src/lib/audit/variance.ts`
- `src/lib/audit/retry.ts` and `src/lib/audit/telemetry.ts` only where variance/report budget or retries depend on them
- direct unit tests for these files

Questions to answer:

- Does the report generation gate actually enforce the documented ten-of-ten invariant, not merely length/status-shaped data?
- Can structurally "completed" but method-invalid evidence satisfy report generation?
- Can duplicate observations, duplicate prompt IDs, mismatched prompt/observation immutable fields, or stale evidence pass the gate?
- Do report retries preserve accounting and provenance across first attempt, language-only retry, integrity failure, and transient failure?
- Can failed report attempts disappear from the budget used by a later retry or variance call?
- Can report telemetry be double-counted when carried forward?
- Are material findings/actions constrained to evidence, and can a failure path accidentally emit a report object anyway?
- Does variance remain mathematically and structurally separate from the main ten observations and all report counts/denominators/findings/actions?
- Can a variance record claim `complete: true` when one re-ask actually failed or has invalid provenance?
- Does early non-retryable variance failure preserve truthful failed markers and budget state without inventing provider evidence?
- Is cumulative budget propagated correctly from report attempts into variance retries?

Do not re-review provider configuration broadly or client/session state.

# Reviewer C — client transition, recovery, persistence, and stale async work

Review the browser orchestration from successful main run through report creation, variance, completion, retry, reload, reset, and stale requests.

Primary files:

- `src/app/audit/AuditWorkflow.tsx`
- `src/lib/audit/workflow-storage.ts`
- variance/report persistence helpers directly used by the workflow
- relevant client contract/error helpers
- directly relevant unit/E2E tests only as needed

Trace at least these sequences:

1. main run succeeds → report succeeds → variance succeeds → completed UI;
2. main run succeeds → report transient failure → retry report;
3. report succeeds → variance transient/incomplete failure;
4. reset/start-over while report request is active;
5. reset/start-over while variance request is active;
6. retry report after report telemetry already exists;
7. reload after report exists but variance is not terminal;
8. two async report/variance attempts overlap or an old attempt finishes after a newer workflow state exists.

Questions to answer:

- Is report UI shown too early, before variance reaches a terminal state required by the current product sequence?
- Can late report/variance responses mutate a reset or newer workflow?
- Is there an abort/run identity for these post-run requests, or can stale async work resurrect discarded state?
- Can report retry accidentally trigger variance twice?
- Can variance be lost, duplicated, or attached to the wrong report/run after reload?
- Are report and variance budget calls persisted/merged exactly once?
- Can a report failure or variance failure leave `busy`, failure code, recovery controls, or final completion state contradictory?
- Can two tabs/duplicated contexts create duplicated post-report paid work? Treat current Phase-3 non-scope carefully: report this as a current defect only if it violates an explicit current invariant, not merely because durable server ownership does not yet exist.
- Is the same immutable report shown/exported after recovery, or can retry/reload silently switch evidence sets?

Do not deeply review report wording or provider adapters.

# Reviewer D — adversarial regression-test coverage

Review the tests protecting the report → variance → completion path. Do not perform another broad implementation review.

Primary areas:

- `src/lib/audit/report-pipeline.test.ts`
- `src/lib/audit/variance.test.ts`
- tests covering `/api/audit/report`
- tests covering `/api/audit/variance`
- `tests/e2e/live-audit-variance.spec.ts`
- tests covering report retry/recovery and `AuditWorkflow`
- provider/method tests only where needed to verify whether the real route boundary is protected

Questions to answer:

- Which concrete P0/P1/P2 regressions could occur while current tests remain green?
- Do tests exercise valid production-shaped report/variance route requests, or only helper-level behavior and early rejection cases?
- Is prompt↔observation immutable binding tested at report acceptance?
- Is positive successful/search-grounded observation provenance tested before report generation?
- Is report retry telemetry/budget accumulation tested across multiple attempts?
- Is variance cumulative budget after report generation tested?
- Is variance selection tied to the actual completed main run in any test?
- Is report → variance ordering tested in the real client?
- Are report reset races, variance reset races, late responses, duplicate variance invocation, reload recovery, and terminal failure states covered?
- Do existing tests prove variance can never affect main report counts/denominators through the actual product path, not only a pure helper?

Report a test gap only when you can name a concrete plausible defect/regression it would catch. If another reviewer already owns the implementation defect, label your item as **coverage for candidate X** rather than inflating the finding count.

# Field orchestrator validation pass

After all four reviewers return, do not concatenate their answers.

Perform a personal synthesis/validation pass:

1. Deduplicate overlapping claims.
2. Inspect the cited source yourself for every proposed P0/P1 and every disputed claim.
3. Check whether another boundary already prevents the failure on the real path.
4. Check the current Spec-003 scope before treating durable server ownership/idempotency as a defect.
5. Reject unsupported/speculative claims.
6. Downgrade severity where real impact is not demonstrated.
7. For every accepted P0/P1, run or inspect at least one concrete reproduction when feasible offline.
8. Preserve the exact reproduction code/snippet or sufficient deterministic steps in the final report for every accepted P0/P1. This is mandatory; do not leave high-severity evidence only in `/tmp`.
9. Assign final IDs `RVP-001`, `RVP-002`, ... in severity order.

Severity guide:

- **P0:** credible immediate risk of corrupting customer evidence/report integrity, uncontrolled live spend, secrets/security, or production availability with broad impact.
- **P1:** realistic failure in the protected paid audit path that can produce a wrong report, wrong completion state, duplicate meaningful spend, lost paid work, or violate a core Spec-003 invariant.
- **P2:** important robustness defect or concrete missing regression protection with narrower impact.
- **P3:** minor but real defect; do not use for style/refactor preferences.

A final report with zero verified findings is valid.

## Offline verification expectations

Prefer targeted tests only.

At minimum, run the existing directly relevant unit tests you relied on, if dependencies are available without modifying the repository.

You may create scratch-only tests outside the repository to verify candidate findings. Do not commit them.

Do **not** run live provider tests.

Do not run full E2E/build unless needed to resolve a specific disputed high-severity claim and it can be done offline inside the time budget. If not run, state that limitation explicitly.

# Final report

Write exactly one new repository file:

`docs/reviews/findings/report-variance-parallel-pilot-2026-08-22.md`

The report must contain:

## 1. Metadata

- baseline SHA;
- branch;
- orchestrator model/effort if known;
- reviewer model;
- proof that all four reviewers started in parallel;
- per-lane runtime if exposed;
- total worker API/tool calls if exposed;
- token counts if exposed, otherwise `not available`;
- confirmation of no Nuave live/provider calls;
- application-code baseline diff check.

## 2. Executive verdict

Use one:

- `PASS — no verified P0/P1 defects in this bounded subsystem`
- `FAIL — one or more verified P0/P1 defects require correction`

Include counts by severity.

## 3. Coverage table

One row per reviewer: actual scope, result, unique value, important overlap.

## 4. Verified findings

For every final finding:

- ID and severity;
- title;
- exact code evidence;
- concrete failure sequence;
- expected vs actual;
- impact;
- confidence;
- minimal correction direction without implementing it;
- regression test recommendation.

For every P0/P1 additionally include **Reproduction** with the exact scratch-test body/snippet or deterministic commands/steps used to validate it.

## 5. Rejected, duplicate, and downgraded claims

Preserve enough detail to judge reviewer precision.

## 6. Important test gaps

Do not duplicate implementation findings. Name concrete uncovered invariants.

## 7. Orchestration evaluation

Record:

- raw candidate findings from all four workers;
- verified findings after synthesis;
- duplicates merged;
- claims rejected;
- severity downgrades;
- which lanes produced unique value;
- whether four lanes were sufficient;
- whether any lane remained redundant or too broad;
- slowest reviewer runtime;
- exposed worker/API call count;
- token count or `not available`;
- recommendation for how to structure a larger overnight whole-repo review;
- one concrete way to reduce usage further without losing meaningful coverage.

Compare qualitatively against the previous five-agent pilot: did four lanes preserve independent corroboration while reducing overlap?

## 8. Quota measurement

The platform may not expose subscription-quota consumption. Do not invent it.

Record:

- `platform-reported quota before: not available` unless actually exposed;
- `platform-reported quota after: not available` unless actually exposed;
- any model/tool/API-call metrics Hermes exposes.

The founder will separately capture the ChatGPT/Codex subscription meter before and after this pilot. Leave a clearly labeled placeholder for that external measurement:

- `founder-reported meter before: pending`
- `founder-reported meter after: pending`
- `founder-reported delta: pending`

Do not block completion waiting for the founder to fill these values.

## 9. Recommended next action

Recommend either:

- fix a bounded set of verified defects before further review;
- proceed to the whole-repo overnight review architecture;
- or run one more pilot only if this experiment reveals a material orchestration uncertainty.

# Repository write discipline

Before writing the report:

1. confirm application code still matches baseline;
2. inspect `git status`/diff;
3. ensure subagents created no repository changes.

Then write only:

`docs/reviews/findings/report-variance-parallel-pilot-2026-08-22.md`

Commit and push **only that report file** to the existing branch `review/pilot-report-variance-parallel`.

Do not open a PR, merge, deploy, fix code, edit this prompt, or update product/spec documents.

# Final response to founder

Keep it short. State:

1. whether four Luna reviewers genuinely ran in parallel;
2. wall-clock duration / slowest lane if known;
3. PASS/FAIL;
4. verified counts by severity;
5. report path and commit SHA;
6. relevant platform metrics/limitations;
7. remind the founder to provide the before/after subscription-meter values separately.

---
