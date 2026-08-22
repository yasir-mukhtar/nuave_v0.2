# Overnight whole-repo review — field orchestrator

You are the **field orchestrator** for Nuave's first overnight whole-repository code review.

Repository:
`https://github.com/yasir-mukhtar/nuave_v0.2`

Working branch:
`review/overnight-repo-2026-08-22`

Frozen application baseline:
`028aaa72149c81d71b940adfcb16bd144f0df047`

Final report path:
`docs/reviews/findings/overnight-repo-review-2026-08-23.md`

This is **REVIEW ONLY**. Do not fix application code.

## Mission

Review the entire **active, non-archived engineering surface** of the repository deeply enough that the founder can wake up to one validated, deduplicated code-review report.

The goal is not to maximize finding count. The goal is to find concrete defects, unsafe assumptions, missing invariants, integration failures, and meaningful regression gaps that could affect Nuave's real product path.

Two smaller parallel-review pilots have already examined the audit-run and report/variance paths. Their verified root defects are listed below as **known findings**. Do not spend this overnight review rediscovering them. Report only:

- genuinely new defects;
- a materially new failure consequence that changes severity or correction scope; or
- a distinct defect that happens to touch the same files.

## Model and delegation configuration

The founder will run you as **GPT-5.6 Sol, medium reasoning**.

Use **GPT-5.6 Luna, medium reasoning** for every reviewer.

Run exactly **16 reviewer tasks**, in **four waves of four reviewers**.

- Start all four reviewers in a wave before waiting for any of them.
- Do not run more than four reviewers concurrently.
- Finish and collect a wave before starting the next wave.
- Reviewers must not spawn their own subagents.
- Do not add extra reviewers, even if more quota appears available.
- If one reviewer fails because of a platform/tool error, do not automatically replace it. Record the lane as incomplete and personally inspect its highest-risk unreviewed paths during synthesis.

This is deliberately quota-bounded.

Expected wall-clock target: roughly **60–120 minutes**. Finishing sooner is fine if coverage is complete. Do not stretch work merely because the founder is asleep.

## Read first

You must read:

1. `AGENTS.md`
2. `README.md`
3. `docs/NOW.md`
4. `docs/INDEX.md`
5. `docs/WORKFLOW.md`
6. the approved spec relevant to each lane, only when needed

Do not load every historical planning document.

## Freeze and repository hygiene

Before delegation:

1. Confirm branch is `review/overnight-repo-2026-08-22`.
2. Confirm `origin/main` still resolves to baseline `028aaa72149c81d71b940adfcb16bd144f0df047`.
3. Confirm application/test/config files on this review branch have not diverged from that baseline.
4. The branch is expected to differ only by this orchestrator document and, at the end, the final report.
5. Preserve all pre-existing untracked files. In particular, if these exist locally, do not read, edit, stage, delete, or commit them:
   - `docs/content/landing-copy-v3-scratch.md`
   - `docs/content/proposed-landing-copy.md`
   - `docs/content/wireframe-landing.html`
   - `docs/content/wireframe-v3-scratch.html`

If tracked application code has moved from the frozen baseline, stop rather than reviewing a moving target.

## Hard safety constraints

Do not:

- modify application code, tests, configuration, specs, or product docs;
- deploy;
- merge;
- open a PR;
- make a Nuave live/provider call;
- call OpenCode Go, OpenAI, Gemini, Groq, OpenRouter, Tavily, or any other external model/search provider from Nuave;
- run live smoke/evaluation scripts;
- inspect or use `archive/`;
- inspect or use `Archive Candidates/`;
- use GitHub CI as a debugger;
- install or upgrade dependencies;
- run an online vulnerability scanner or other network-dependent package audit;
- weaken, edit, or delete a test;
- treat style preferences or speculative refactors as defects.

Static inspection and offline tests are allowed.

## What “whole repo” means for this review

The review boundary is every active engineering artifact that can affect current behavior or engineering safety:

- `src/**`
- `tests/**`
- `.github/workflows/**`
- `.env.example`
- `package.json` and relevant lockfile/config implications
- Next.js/OpenNext/Cloudflare/Vitest/Playwright/TypeScript/ESLint configuration
- `scripts/**` by **static inspection only** when a script can spend money or touch providers
- `skills/**`
- current authoritative docs/specs only as references needed to judge implementation truth

Not in review scope:

- `archive/**`
- `Archive Candidates/**`
- binary/image visual quality
- historical drafts as product authority
- prose/style critique unrelated to code correctness

For binary assets, only review code-level handling/references if relevant; do not inspect image content pixel-by-pixel.

## Coverage ledger — mandatory

Before starting Wave 1, generate an inventory from `git ls-files` for the review boundary.

Map each active source/config/test/script file to one primary lane below. Shared reference files may be read by multiple lanes, but every active engineering file must have one primary owner or be explicitly classified as:

- generated/lock metadata;
- binary/static asset;
- documentation reference only; or
- deliberately excluded by the boundary above.

At final synthesis, compare the inventory against actual reviewer coverage. The final report must list any active paths that were not meaningfully inspected.

A “whole repo reviewed” verdict is not allowed if meaningful active code paths remain silently unreviewed.

# Known-finding registry — do not rediscover as new

These are already verified by the two pilots and will be fixed separately.

### K-01 — stale async work survives reset

Known IDs: `ARP-001`, `RVP-003`.

Reset does not invalidate/abort active run, report, or variance work; late async events can write into discarded state.

### K-02 — immutable prompt/evidence binding is incomplete

Known IDs: `ARP-002`, `RVP-001`.

Resume/report acceptance can match observations by `prompt_id` without proving exact question/category/branded binding.

### K-03 — completed observation lacks a positive successful/search-grounded invariant

Known IDs: `ARP-003`, `RVP-002`, `RVP-007`.

Failed-only or insufficiently grounded telemetry can satisfy later completion/method checks because success/search provenance is not positively required everywhere.

### K-04 — duplicate prompt IDs are rejected too late

Known ID: `ARP-004`.

Ten questions can carry duplicate logical IDs through execution before downstream report validation rejects them.

### K-05 — NDJSON parser can lose a valid earlier event when a later line in the same push is malformed

Known ID: `ARP-005`.

Do not report ordinary variations of this parser failure as new.

### K-06 — valid-current-contract run-route production-boundary regression coverage is missing

Known ID: `ARP-007`.

### K-07 — cross-question cumulative budget propagation lacks direct regression coverage

Known ID: `ARP-008`.

### K-08 — variance route does not prove requested prompts are the designated subset of the completed main run

Known ID: `RVP-004`.

### K-09 — variance helper completeness is not derived from full positive evaluability

Known ID: `RVP-005`.

### K-10 — resumed observation telemetry can be duplicated in the report/variance budget ledger

Known ID: `RVP-006`.

### Accepted future/non-scope risk

Pilot `ARP-006`: copied/duplicated browser contexts lack server-owned run idempotency. Durable server-owned run state is Phase 4 non-scope. Do not promote this to a current defect unless you find a narrower failure that violates current Phase-3 contracts without requiring durable jobs/state.

If a reviewer encounters a known issue, it should write `known: K-xx` in cross-lane notes and continue. It should not spend a reproduction budget on it.

# Shared reviewer contract

Every reviewer returns to you only; reviewers do not write repository files.

Each reviewer must provide:

## 1. Coverage

- files actually inspected;
- important entry/exit boundaries traced;
- relevant tests inspected;
- authoritative spec/docs consulted, if any.

## 2. Findings

For every proposed defect:

- temporary lane ID;
- severity `P0`, `P1`, `P2`, or `P3`;
- concise title;
- exact `path:line` evidence where practical;
- concrete failure sequence;
- expected behavior;
- actual behavior;
- user/product/engineering impact;
- confidence: high / medium / low;
- whether it overlaps a known `K-xx` finding;
- minimal correction direction;
- regression test that would catch it.

## 3. Verification

A reviewer may run at most **two narrowly targeted offline test commands**.

Do not run broad E2E/build suites per reviewer.

Scratch reproductions are allowed outside the repository, but:

- maximum two scratch reproductions per reviewer;
- never call a live provider;
- for every proposed P0/P1 based on a scratch reproduction, preserve enough exact test code, fixture shape, command, and result in the returned review so the orchestrator can include it in the final report;
- a failed test harness is not evidence that application behavior is safe.

## 4. No-finding statement

If no defect survives review, state what meaningful failure scenarios were checked.

## 5. Known/cross-lane notes

Identify known `K-xx` propagation and genuine cross-lane concerns without turning them into duplicate findings.

# Severity rubric

- **P0:** credible immediate catastrophic exposure: secrets, irreversible destructive action, uncontrolled live spend/data exposure, or a production path fundamentally unsafe to operate.
- **P1:** concrete defect that can materially corrupt an audit/report, break the protected production method, lose paid work, create wrong customer truth, defeat a major gate, or make the live path unreliable.
- **P2:** meaningful but narrower defect, failure handling flaw, maintainability/integration risk with a concrete failure scenario, or important regression gap capable of hiding a real defect.
- **P3:** small correctness/robustness issue with limited impact.

Do not inflate missing test coverage to P1 when implementation is currently correct.

# WAVE 1 — Intake, question generation, provider preparation

Start these four reviewers concurrently.

## W1-A — source intake and extraction

Primary ownership:

- `src/app/api/audit/extract/**`
- `src/lib/audit/source-input.ts`
- `src/lib/audit/source-input.test.ts`
- `src/lib/audit/website-input.ts`
- `src/lib/audit/website-input.test.ts`
- `src/lib/audit/source-handoff.ts`
- `src/lib/audit/similar-businesses.ts`
- `src/lib/audit/similar-businesses.test.ts`
- `src/app/audit/SourceHero.tsx`
- `src/app/audit/SimilarBusinessesEditor.tsx`
- their CSS only where behavior/accessibility depends on it
- directly relevant extraction/intake tests and E2E paths

Review questions:

- Can unsupported/malicious/ambiguous URLs or source types cross intake validation?
- Does extraction stay restricted to the submitted official site and preserve verified-vs-inferred truth?
- Can stale source results overwrite newer intake state independently of known reset races?
- Are business facts, similar-business suggestions, and user edits represented without silent data loss or category confusion?
- Can extraction failures or partial results advance the user with false confidence?
- Are server/client validation rules materially inconsistent?
- Are any public inputs able to trigger unintended network targets, SSRF-like behavior, redirects to unrelated domains, or unsafe URL schemes?

Do not broaden into run/report logic.

## W1-B — question contract and generation logic

Primary ownership:

- `src/app/api/audit/prompts/**`
- `src/lib/audit/questions.ts`
- `src/lib/audit/questions.test.ts`
- `src/lib/audit/questions-id.ts`
- `src/lib/audit/questions-id.test.ts`
- `src/lib/audit/questions-id-live.ts`
- `src/lib/audit/questions-id-live.test.ts`
- `docs/PROMPT_GENERATION_CONTEXT.md` only as active contract reference
- `skills/generate-ai-visibility-prompts/**`

Review questions:

- Can generated/fallback packs violate the actual 10-question/category/branded contract despite passing validators?
- Are deterministic fallback and model-generated paths semantically equivalent where the product assumes they are?
- Can buyer-supplied or extracted unverified facts leak into prompts as asserted facts?
- Are competitor/similar-business inputs treated with the intended optionality and verification state?
- Can classification disagree with rendered question meaning in a way that changes report denominators?
- Are prompt IDs/version/language metadata stable and truthful?
- Is human review meaningfully preserved before execution?

Known K-02/K-04 concern downstream is not a new finding here unless question-generation logic creates a distinct defect before execution.

## W1-C — question-provider boundary and production configuration

Primary ownership:

- `src/lib/audit/questions-id-provider.ts`
- `src/lib/audit/questions-id-provider.test.ts`
- `src/lib/audit/questions-id-provider-regression.test.ts`
- `src/lib/audit/provider.ts`
- `src/lib/audit/provider.test.ts`
- `src/lib/audit/opencodego.ts`
- `.env.example` for provider/config truth
- directly relevant `live-reliability-regression.test.ts` portions

Review questions:

- Does production fail closed to the approved OpenCode Go method at each entry point this lane owns?
- Can testing/local environment flags leak into production?
- Are credentials checked consistently and without exposing values?
- Do question generation and extraction use the intended search/no-search behavior?
- Are telemetry/model/version fields truthful when fallbacks occur?
- Can provider failure be misclassified as successful model generation?
- Are budget/cost reservations for preparation stages preserved without obvious under/over-accounting?

Do not report K-03 itself; look for distinct preparation/provider defects.

## W1-D — alternate/test provider adapters and isolation

Primary ownership:

- `src/lib/audit/openai.ts` and tests
- `src/lib/audit/gemini.ts` and tests
- `src/lib/audit/groq.ts` and tests
- `src/lib/audit/openrouter.ts` and tests

These adapters may be testing/local paths, but they are active source and must not accidentally become production paths.

Review questions:

- Can any alternate adapter become production-active despite the production locks?
- Are external-tool/search behaviors clearly isolated from the protected method?
- Do adapters normalize completion/refusal/failure/provenance consistently enough that tests using them are meaningful?
- Can malformed provider responses be normalized into misleading successful observations?
- Do tests accidentally bless behavior that production explicitly forbids?
- Is dead/legacy compatibility code reachable in a way that creates a real production risk?

Static/offline only. Never call a provider.

# WAVE 2 — Core audit contracts, execution, report semantics, variance/storage

Start only after all Wave 1 reviews are collected.

## W2-A — audit schemas, report contracts, counting, evidence semantics

Primary ownership:

- `src/lib/audit/types.ts`
- `src/lib/audit/contracts.ts`
- `src/lib/audit/contracts.test.ts`
- `src/lib/audit/report-labels.ts` and tests
- `src/lib/audit/report-gaps.test.ts`
- `src/lib/audit/report-priority.ts` and tests
- `src/lib/audit/report-prompt-contract.ts` and tests
- `src/lib/audit/fixtures/**`

Review questions:

- Can score/count/denominator/category semantics disagree with actual ten observations?
- Can citation-only evidence count as appearance/recommendation/comparison incorrectly through a path not already covered by K-02/K-03?
- Can failed/not-assessed observations leak into customer-facing denominators?
- Are competitor evidence, material findings, priorities, gaps, actions, and excerpts structurally tied to the evidence they claim?
- Can a schema accept an internally contradictory object that later code treats as authoritative?
- Are evidence-export/report contracts lossless for provenance needed by the product?

Do not report K-02/K-03 unless you discover a distinct contract failure beyond those known roots.

## W2-B — report language, generation pipeline, retries, recovery

Primary ownership:

- `src/lib/audit/report-language.ts` and tests
- `src/lib/audit/report-pipeline.ts` and tests
- `src/lib/audit/report-pipeline-telemetry.test.ts`
- `src/lib/audit/report-recovery.ts` and tests
- report content validation/generation dependencies directly required to prove a finding
- `src/app/api/audit/report/**` as a shared boundary reference

Review questions:

- Can a language-only retry change facts/evidence rather than wording?
- Can report retry/recovery duplicate provider work or lose/replace prior telemetry in a path distinct from K-10?
- Do failure codes distinguish integrity vs transient vs cost exhaustion truthfully?
- Can generated content bypass protected unsupported-claim rules through alternate structure/text?
- Are one-to-five findings/actions and priority/evidence links enforced without forcing invented deficiencies?
- Can report creation succeed after an invalid intermediate state for a reason beyond K-02/K-03?

Known report binding/provenance defects K-02/K-03 are not new findings.

## W2-C — execution, retry, telemetry, stream semantics beyond known roots

Primary ownership:

- `src/lib/audit/retry.ts` and tests
- `src/lib/audit/run-orchestrator.ts` and tests
- `src/lib/audit/telemetry.ts` and tests
- `src/lib/audit/stream.ts` and tests
- `src/lib/audit/client-contract.ts` and tests
- `src/lib/audit/production-observation-method.ts`
- `src/app/api/audit/run/**` as shared reference

Review questions:

- Are retryable vs non-retryable failures classified correctly?
- Can a retry exceed configured attempt/cost ceilings?
- Can attempt telemetry be dropped, reordered, misattributed, or double-counted through a path other than K-10?
- Are terminal `run_completed`, `run_unfinished`, and fatal states mutually truthful?
- Can cost reservations/accounting stop too late or too early due to arithmetic/state errors?
- Are resume ordering, failed IDs, stop messages, and emitted states internally consistent outside K-02/K-03/K-04?
- Are client-contract transitions fail-closed and recoverable?

Do not report K-01/K-03/K-04/K-05/K-06/K-07 again.

## W2-D — variance and workflow storage beyond known roots

Primary ownership:

- `src/lib/audit/variance.ts` and tests
- `src/lib/audit/variance-workflow.test.ts`
- `src/app/api/audit/variance/**`
- `src/lib/audit/workflow-storage.ts` and tests
- relevant storage/variance portions of `AuditWorkflow.tsx` only as needed

Review questions:

- Can persisted workflow/variance state restore into an impossible or misleading state?
- Are storage versions and invalid-state reset semantics safe?
- Can stale/corrupt variance records bypass run-key or report matching checks in a way distinct from K-08?
- Are incomplete/failure reasons preserved truthfully?
- Can variance observations accidentally affect the main report/counts through an unreviewed path?
- Are retry/restore flows deterministic across refresh?

Do not report K-01/K-03/K-08/K-09/K-10 again unless there is a materially new consequence.

# WAVE 3 — Live UI, fixture journey, landing/public surfaces

Start only after Wave 2 is collected.

## W3-A — live `/audit` client state machine and report rendering

Primary ownership:

- `src/app/audit/AuditWorkflow.tsx`
- `src/app/audit/AuditStages.tsx`
- `src/app/audit/AuditRunStep.tsx`
- `src/app/audit/ReportView.tsx`
- `src/app/audit/page.tsx`
- directly relevant audit E2E flows

Review questions:

- Can the UI advance, unlock, or display completion before required state is valid?
- Can prompt/fact edits race with locked execution aside from known reset races?
- Are retry actions enabled only when they are semantically safe?
- Can loading/busy/error state leave irreversible or contradictory UI?
- Does browser persistence preserve exactly what the user needs without silently replacing newer state?
- Are report labels/details/PDF/evidence export consistent with the underlying data?
- Are user-visible failures understandable and actionable without lying about completion?
- Are accessible names, disabled states, keyboard behavior, and form semantics sufficient for core task completion?

Do not report K-01 or K-10 again.

## W3-B — fixture journey and fixture/live separation

Primary ownership:

- `src/lib/fixture-journey/**`
- `src/app/audit/fixture/**`
- fixture-specific sections of `tests/e2e/fixture-journey.spec.ts`
- `tests/e2e/preview-disabled.spec.ts`

Review questions:

- Can fixture behavior leak into live production behavior or vice versa?
- Can fixture state migrations/reset semantics silently corrupt journey progress?
- Does fixture scoring/reporting remain faithful enough to what it claims to preview?
- Are simulated payment/order states clearly non-real and side-effect-free?
- Can fixture flags be accidentally enabled/exposed in an unsafe production configuration?
- Are state adapters losing or changing report semantics?

Ignore previously resolved historical fixture findings unless current code still contains a distinct regression.

## W3-C — landing, handoff, preview components

Primary ownership:

- `src/app/page.tsx`
- `src/components/ConfirmBusinessPreview.tsx`
- `src/components/ExampleReportPreview.tsx`
- `src/components/Footer.tsx`
- `src/components/HowItWorks.tsx`
- `src/components/LandingAuditHero.tsx`
- `src/components/LandingNav.tsx`
- `src/components/PaymentPreview.tsx`
- `src/components/QuestionsPreview.tsx`
- `src/components/ReportPagePreview.tsx`
- `src/components/SmoothScroll.tsx`
- `src/styles/landing.css`
- `tests/e2e/landing-audit-handoff.spec.ts`
- landing-relevant portions of fixture E2E

Review questions:

- Can landing-to-audit handoff lose/alter the submitted source?
- Are CTA/link/navigation paths correct and resilient?
- Can preview/simulated content be mistaken for real measured evidence due to implementation behavior?
- Are external asset/network side effects possible?
- Are client/server rendering, hydration, form submission, and URL handling robust?
- Are obvious accessibility failures blocking core navigation or input?

This is a functional code review, not a visual-design or marketing-copy critique.

## W3-D — public pages, i18n, metadata, UI primitives

Primary ownership:

- `src/app/faq/**`
- `src/app/privacy/**`
- `src/app/support/**`
- `src/app/terms/**`
- `src/app/layout.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/globals.css` where behavior/accessibility is affected
- `src/styles/tokens.css`
- `src/messages/**`
- `src/i18n/**`
- `src/components/ui/**`
- `src/app/audit/spec004/**` unless the orchestrator classifies it as intentionally non-production demo code

Review questions:

- Are noindex/sitemap/meta/runtime signals internally contradictory?
- Do public support/privacy/terms routes render and link correctly?
- Are there locale/runtime assumptions that can break pages or produce missing text?
- Can shared UI primitives break keyboard/focus/disabled/label behavior used by the live journey?
- Is spec004/demo code unintentionally exposed or sharing production state/config in a risky way?

Do not perform legal advice. Only flag concrete inconsistency between implementation and the repository's stated current product behavior.

# WAVE 4 — Infrastructure, tests, scripts, cross-repo architecture

Start only after Wave 3 is collected.

## W4-A — CI, deploy gates, Cloudflare/build configuration, secrets

Primary ownership:

- `.github/workflows/**`
- `.env.example`
- `.gitignore`
- `.nvmrc`
- `package.json`
- `package-lock.json` at dependency/config consistency level
- `next.config.ts`
- `open-next.config.ts`
- `wrangler.jsonc`
- `tsconfig.json`
- `eslint.config.mjs`
- `vitest.config.mts`
- `playwright.config.ts`
- `playwright.config.disabled.ts`
- `playwright.config.failure.ts`
- `postcss.config.mjs`
- `scripts/verify-offline.mjs`

Review questions:

- Can direct-push/unreviewed code reach production despite documented safeguards?
- Are required CI and deployment gates actually wired to the right commands/events?
- Can secrets be echoed, committed, exposed to client bundles, or aliased unsafely?
- Are production provider variables built/runtime-injected consistently?
- Can CI pass while Cloudflare build/deploy fails for a predictable configuration reason?
- Can test-only environment flags escape into production?
- Are Node/package/config versions internally compatible?
- Does `npm run verify` actually represent the offline gate AGENTS.md claims?

Inspect workflows that actually exist; if authoritative docs name a missing workflow, treat that as a potential drift finding only after proving operational impact.

## W4-B — E2E and test harness quality

Primary ownership:

- `tests/e2e/**`
- Playwright shared config/helper behavior
- forced-failure and disabled suites
- test selection invoked by package scripts/CI
- unit-test coverage topology as needed

Review questions:

- Can E2E helpers create false positives/false negatives or silently permit external side effects?
- Are disabled/forced-failure suites invoked exactly as intended?
- Can tests pass against the wrong server/config/build mode?
- Is test isolation reliable across session/local storage and parallel workers?
- Do key customer paths have assertions strong enough to detect wrong terminal state rather than merely rendered text?
- Are there high-value regression gaps not already K-06/K-07 or the pilot findings?

Report a coverage gap only with a concrete regression it would fail to catch.

## W4-C — scripts and offline/live safety

Primary ownership:

- `scripts/**` except archive material
- especially `scripts/eval/**`, `scripts/kk/**`, `scripts/kopikenangan/**`, `scripts/openrouter/**`, `scripts/sozo/**`

**Static inspection only for scripts capable of provider/network calls. Do not execute them.**

Review questions:

- Can a supposedly offline/default command accidentally spend provider money?
- Do scripts have sufficient explicit live-run safeguards?
- Can they use obsolete provider/config assumptions and produce misleading evidence?
- Can private/raw evidence or credentials be accidentally written to tracked locations/logs?
- Are live scripts clearly separated from canonical verification commands?
- Could a maintainer reasonably invoke a dangerous script believing it is safe/offline?

Do not criticize intentionally manual one-off scripts merely for being non-general.

## W4-D — architecture, reachability, dead/stale active code, integration seams

Primary ownership:

- cross-repo import/reachability review across active `src/**`
- root-level engineering files not assigned elsewhere
- active route/component duplication
- production-vs-fixture/demo boundaries
- current docs/spec implementation drift only where it causes or conceals real engineering behavior

Review questions:

- Is production behavior duplicated in multiple active modules that have materially diverged?
- Is supposedly dead/test-only code actually reachable?
- Are current components/routes/helpers orphaned but still creating maintenance/config risk?
- Are there circular or hidden integration assumptions between intake → prompts → run → report → variance → display?
- Does any current authoritative config/doc assert a gate/path that simply does not exist in code and could mislead release operations?
- Are there active files with no meaningful owner/coverage from Waves 1–4?

Do not turn normal code duplication into a defect without a concrete failure scenario.

# Orchestrator synthesis after Wave 4

Do not mechanically concatenate worker output.

## Validation requirements

For every proposed P0/P1:

1. Personally inspect the cited source and direct dependency chain.
2. Check whether another guard prevents the failure on the real path.
3. Check against `AGENTS.md`, `docs/NOW.md`, and the relevant approved spec.
4. Reproduce offline when practical, without live/provider calls.
5. Reject or downgrade anything speculative, intended, out of scope, or already covered by K-01…K-10.

For P2/P3, spot-check evidence and reject vague architecture/style claims.

## Deduplication requirements

Merge findings with the same root cause even if multiple lanes found different symptoms.

If a finding is a **new consequence of K-01…K-10** but does not require broader correction or severity, record it under `Known issue propagation` rather than as a new finding.

If a new consequence materially expands remediation scope or severity, it may become a new finding, but explain precisely why it is not merely the known issue.

## Coverage reconciliation

Compare the initial `git ls-files` coverage ledger against actual reviewer coverage.

The final report must state:

- active engineering files/classes covered;
- deliberately excluded files/classes;
- any incomplete reviewer lane;
- any unreviewed active path;
- whether “whole active repo reviewed” is justified.

If meaningful active files were missed, personally inspect them before finalizing when feasible. Otherwise label the review incomplete rather than claiming full coverage.

## Final offline verification

After synthesis, if the environment can run the repository normally without installing dependencies or making external/provider calls, run once:

```bash
npm run verify
```

This is not a substitute for the review; it is a baseline integrity check.

If it cannot run, record the exact blocker. Do not alter code/config to make it run.

# Final report format

Write exactly one new file:

`docs/reviews/findings/overnight-repo-review-2026-08-23.md`

The report must contain:

1. **Metadata**
   - baseline SHA;
   - branch;
   - orchestrator/reviewer models and reasoning;
   - wave timing;
   - reviewer/API/tool metrics if exposed;
   - no-live-call confirmation.

2. **Executive verdict**
   - `PASS`, `PASS WITH P2/P3 FINDINGS`, or `FAIL`;
   - counts by severity.

3. **Coverage ledger**
   - all four waves/lanes;
   - owned file groups;
   - actual coverage;
   - gaps/incomplete lanes.

4. **New verified findings**
   - final IDs `ORR-001`, `ORR-002`, ... ordered by severity;
   - full evidence/failure sequence/impact/confidence/correction/test.

5. **Known issue propagation**
   - notable observations tied to K-01…K-10, not counted as new findings.

6. **Rejected / merged / downgraded claims**
   - enough detail to audit reviewer precision.

7. **Regression-test gaps**
   - only concrete high-value gaps not already known from the pilots.

8. **Architecture / release-risk summary**
   - short, evidence-based, no speculative redesign.

9. **Orchestration evaluation**
   - raw findings by lane;
   - verified count;
   - duplicates/rejections/downgrades;
   - unique value by lane;
   - runtime/API/tool/token metrics if available;
   - whether 16 workers were excessive/insufficient;
   - recommended worker count/split for future repo reviews.

10. **Verification**
    - targeted checks/reproductions;
    - `npm run verify` result or blocker.

11. **Recommended fix order**
    - combine the two pilot known findings and new overnight findings into a root-cause-oriented sequence;
    - do not write implementation code.

## Reproduction preservation

For every verified P0/P1 that relied materially on a scratch reproduction, include in the report:

- the minimal test body or precise request/object fixture;
- exact command;
- exact result;
- whether the reproduction was actually executed or reasoned from deterministic control flow.

Do not leave decisive evidence only in ephemeral `/tmp` files or subagent transcripts.

# Final repository action

Before writing, inspect `git status` and diff.

Only the orchestrator may write to the repository, and only the final report file.

Commit and push exactly that report to `review/overnight-repo-2026-08-22`.

Do not commit the four known untracked content scratch files or any other unrelated file.

Do not open a PR, merge, or deploy.

Final response to the founder should be concise and contain:

- whether all 16 reviewers completed across four waves;
- whether whole-active-repo coverage was achieved;
- executive verdict;
- P0/P1/P2/P3 counts;
- final report path;
- final commit SHA;
- total wall time and exposed reviewer/API/tool metrics;
- any incomplete lane or material tooling limitation;
- confirmation that application code remained unchanged and no live/provider calls were made.
