# Overnight D — Infrastructure and test-system review

## Executive summary

**Verdict: no P0 or P1 release/test-system blocker was verified at the frozen baseline.** The canonical offline gate completes successfully, including the Cloudflare build and all configured browser modes. The review nevertheless verified four P2 robustness problems and one P3 repository-hygiene problem:

1. Playwright modes inherit ambient environment values, so mode isolation is not deterministic.
2. The live `/audit` surface loads an unasserted third-party asset during the nominally offline browser suite.
3. The root Vitest discovery configuration includes tracked live-provider runners; a broad `vitest run` can make external AI requests when local credentials exist.
4. Interrupting `npm run verify` can leave its temporary production env and Next dev processes behind.
5. A generated provider-evaluation artifact described as local-only is tracked in Git with unnecessary public contact and provider metadata.

The four GPT-5.6 Luna / medium reviewers produced **9 raw candidates**. Orchestrator review deduplicated, reproduced, downgraded, or rejected them into **5 verified findings** plus **1 known-root extension**. The official `npm run verify` path made no provider request and passed: 503 unit tests, 42 Playwright tests, the Next.js build, and the OpenNext Cloudflare build.

Severity totals:

| Severity  | Verified |
| --------- | -------: |
| P0        |        0 |
| P1        |        0 |
| P2        |        4 |
| P3        |        1 |
| **Total** |    **5** |

## Baseline

- Repository: `https://github.com/yasir-mukhtar/nuave_v0.2`
- Required frozen baseline: `028aaa72149c81d71b940adfcb16bd144f0df047`
- Reviewed HEAD: `028aaa72149c81d71b940adfcb16bd144f0df047`
- Review branch: `review/overnight-d-infra-tests`
- Newer commits reviewed: none
- Initial tracked diff: none
- Initial unrelated untracked files, preserved and excluded from the review deliverable:
  - `docs/content/landing-copy-v3-scratch.md`
  - `docs/content/proposed-landing-copy.md`
  - `docs/content/wireframe-landing.html`
  - `docs/content/wireframe-v3-scratch.html`

Only this report was created by the review.

## Execution metrics

### Parallel reviewers

Exactly four GPT-5.6 Luna / medium reviewers were started concurrently at 22:15:07 local time:

| Reviewer | Scope                                                | Raw candidates | Runtime evidence                                                                                                     |
| -------- | ---------------------------------------------------- | -------------: | -------------------------------------------------------------------------------------------------------------------- |
| D1       | Unit-test system and coverage blind spots            |              1 | Initial worker process completed in about 226 seconds; its unit run took 1.78 seconds                                |
| D2       | Playwright/E2E harness                               |              3 | Initial worker process completed in about 226 seconds; no E2E command run by the worker                              |
| D3       | CI, Cloudflare, build, configuration, secrets        |              1 | About 120 seconds of instrumented verification before a tool timeout; same reviewer session resumed to finish review |
| D4       | Scripts, reachability, dead code, repository hygiene |              4 | Runtime not instrumented; same reviewer session continued after its temporary attached brief was denied              |

D3 and D4 initially could not read attached `/tmp` briefs. They were continued—not replaced—as the same named OpenCode sessions with the briefs supplied inline. One concurrent continuation encountered an OpenCode database lock and was retried in the same D3 session. The four-reviewer count did not change.

### Raw-to-verified disposition

- Raw worker candidates: 9
- Verified distinct findings: 5
- Known-root extensions: 1
- Deduplicated, merged, downgraded, or rejected raw candidates: 6 dispositions (some raw candidates were folded into one verified finding)
- Tracked files classified with `git ls-files`: 395/395
- Provider calls: 0
- Deployment commands: 0
- GitHub/Cloudflare setting changes: 0
- Task-scoped worker token/API cost totals: unavailable from the OpenCode session exporter; no totals are invented here

## Verified findings

### D-01 — Playwright server modes inherit ambient fixture and provider state

- **Severity:** P2
- **Confidence:** High
- **File/line:** `tests/e2e/shared-config.ts:19-37`; `playwright.config.ts:24`; `playwright.config.disabled.ts:23`; `playwright.config.failure.ts:23-26`; `scripts/verify-offline.mjs:20-30`
- **Finding:** `journeyWebServer` starts each server with `...process.env` and then overlays only values supplied by that config. The disabled mode does not explicitly force `NUAVE_FIXTURE_PREVIEW_ENABLED` and `NUAVE_FIXTURE_FORCE_REPORT_FAILURE` off; the normal enabled mode does not explicitly force the failure flag off. The offline verifier also preserves ambient variables not listed in its override object.
- **Evidence:** D1 and D2 independently identified the same merge behavior. The normal clean-environment `npm run verify` passed, which proves the default environment is currently usable but does not establish isolation from an altered caller environment.
- **Reachability:** Developer shells, local automation, or CI contexts with fixture/failure/provider variables already exported. Next dev can also load local env files in addition to the explicit child environment.
- **Failure/reproduction:** Static reproduction: export `NUAVE_FIXTURE_PREVIEW_ENABLED=true` before the disabled suite, or `NUAVE_FIXTURE_FORCE_REPORT_FAILURE=true` before the normal suite, then inspect the spawned server environment. The polluted executions were not run because the merge semantics are direct and sufficient.
- **Impact:** A suite can test the wrong server mode, fail for the wrong reason, or give false confidence in preview-disabled behavior. Inheriting credentials also raises the consequence of any future un-intercepted API request.
- **Existing protection:** Separate ports; `reuseExistingServer: false`; current live-flow requests are intercepted; the clean offline gate passed all 42 configured browser tests.
- **Known-root relation:** Independent of K-01 through K-10.
- **Recommendation:** Construct an allowlisted server environment and set both fixture flags explicitly in every mode. Remove provider credentials and live-testing flags from browser-server environments unless a specific offline stub test requires a dummy value.

### D-02 — The offline E2E path has an unasserted third-party asset dependency

- **Severity:** P2
- **Confidence:** High
- **File/line:** `src/app/audit/SourceHero.module.css:48-57`; `tests/e2e/landing-audit-handoff.spec.ts:125-171`; `tests/e2e/helpers.ts:45-74`
- **Finding:** The `/audit` hero loads its background from `https://blume.codes/...`. The landing-to-audit E2E test reaches that page but stubs only `/api/audit/extract`; unlike the fixture suite, it does not assert that external requests are absent.
- **Evidence:** The CSS contains the external URL at line 53. The valid handoff test navigates to `/audit`, waits for extraction, and ends without applying `assertNoSideEffects` or blocking non-local hosts. The offline gate passed on a networked machine, so that pass does not prove hermetic execution.
- **Reachability:** Every `/audit` page render and the valid landing handoff browser test.
- **Failure/reproduction:** Deny `blume.codes` or run the browser suite in a network sandbox and record requests. The review did not intentionally contact or block the host.
- **Impact:** Browser checks depend on an unrelated third party, leak ordinary request metadata, and can become flaky or visually incomplete during an outage. The current offline gate cannot detect a new external asset on this live surface.
- **Existing protection:** Fixture-journey tests have their own side-effect request ledger; it is not applied to this handoff test. This is not an AI-provider or paid-call finding.
- **Known-root relation:** Independent of K-01 through K-10.
- **Recommendation:** Bundle the asset locally and extend the no-external-request assertion to every E2E suite intended to be offline.

### D-03 — Broad Vitest discovery includes executable live-provider runners

- **Severity:** P2
- **Confidence:** High
- **File/line:** `vitest.config.mts:18-25`; `package.json:13-18`; `scripts/eval/provider-evaluation.spec.ts:4-8,45-67,600-668`; `scripts/openrouter/smoke.spec.ts:7-14,33-62,70-92`; `scripts/kopikenangan/kopi-kenangan-live-run.spec.ts:1-25,197-203`
- **Finding:** The root Vitest config excludes dependencies, build outputs, worktrees, and `archive`, but not `scripts/**`. Tracked `*.spec.ts` files under `scripts/` load `.env.local` and contain real provider calls. The official npm unit scripts are path-limited and safe, but a conventional broad `npx vitest run`, IDE test discovery, or future unscoped test job can execute live runners when credentials are available.
- **Evidence:** The evaluation runner states that it makes real Gemini/OpenAI calls and loads `.env.local`. The OpenRouter smoke suite runs when a key is configured. The Kopi Kenangan suite identifies itself as a real paid engine test. None is excluded in `vitest.config.mts`.
- **Reachability:** Any unscoped Vitest invocation in a credentialed developer environment. No broad Vitest command was executed during this review.
- **Failure/reproduction:** `npx vitest run` would discover these `*.spec.ts` files under the current config. Running it was prohibited because inspection established external-request reachability.
- **Impact:** A familiar test command can spend provider budget, create new evidence artifacts, fail because a historical transport is stale, or mix live evaluation with regression output. This is a test-system footgun even though canonical CI is path-limited.
- **Existing protection:** `npm run test:unit`, `npm run test:audit`, CI, and `npm run verify` all pass explicit safe paths; the Sozo historical runner is skipped; individual live scripts include warning comments.
- **Known-root relation:** Independent of K-01 through K-10.
- **Recommendation:** Exclude `scripts/**` from root Vitest discovery and give live runners an explicit, founder-authorized command with a positive opt-in guard. Consider keeping historical live runners outside test filename conventions.

### D-04 — Interrupted offline verification leaves env and server state behind

- **Severity:** P2
- **Confidence:** High
- **File/line:** `scripts/verify-offline.mjs:5-9,32-39,41-71`
- **Finding:** The verifier overwrites `.env.production.local` before entering its `try/finally`. Normal exceptions restore it, but forced termination does not run JavaScript cleanup reliably and does not explicitly terminate descendant Playwright/Next processes.
- **Evidence:** D3's `npm run verify` was terminated by its 120-second tool timeout after the 37-test main E2E suite. The dummy 249-byte `.env.production.local` remained with a 22:23:11 modification time, and a Next server remained listening on port 3200. A follow-up E2E command failed with “Another next dev server is already running.” The orchestrator removed the review-created dummy file and terminated the stale process without reading any env contents.
- **Reachability:** Terminal cancellation, automation timeout, machine shutdown, or force termination during the long E2E phase.
- **Failure/reproduction:** Start `npm run verify`, interrupt it during Playwright, then inspect `.env.production.local` existence and the configured ports. This occurred during the review.
- **Impact:** A pre-existing local production env can remain overwritten until noticed, and stale servers cause misleading failures or run with stale configuration. The issue is local verification cleanup debt, not a normal-completion CI release blocker.
- **Existing protection:** Normal completion and ordinary thrown failures execute `finally`; the file is gitignored; the verifier writes dummy credentials; the orchestrator's separately completed `npm run verify` restored its state and passed.
- **Known-root relation:** Independent of K-01 through K-10.
- **Recommendation:** Register `SIGINT`/`SIGTERM` handlers before writing, use an atomic backup or dedicated temporary env, and own/terminate the complete child process group on exit.

### D-05 — A generated evaluation artifact documented as local-only is tracked

- **Severity:** P3
- **Confidence:** High
- **File/line:** `specs/003-live-report-quality-gate/evaluation-results.md:10-16`; `scripts/eval/.results/evaluation-results.json:1-1724`; `.gitignore:1-42`
- **Finding:** The specification record describes the raw evaluation JSON as “local only, not part of this record,” but `git ls-files` confirms it is tracked. It contains real public-business addresses and phone numbers, provider response IDs, usage telemetry, failure details, and structured extraction evidence.
- **Evidence:** A representative public contact entry appears at `scripts/eval/.results/evaluation-results.json:445-454`; response and usage metadata appears throughout. No ignore rule covers `scripts/eval/.results/`.
- **Reachability:** Every clone and all Git history readers. It is not imported by production code or normal tests.
- **Failure/reproduction:** `git ls-files scripts/eval/.results/evaluation-results.json` returns the file despite its local-only documentation.
- **Impact:** Repository history carries unnecessary generated evidence and provider metadata, weakening the restricted-evidence/local-artifact boundary. No credential or private customer record was found, so this is P3 rather than the worker's proposed P2.
- **Existing protection:** The repository is private; the data observed is public-business information; `.secrets/` is ignored for newer private live runs.
- **Known-root relation:** Independent of K-01 through K-10.
- **Recommendation:** Keep only the minimized evaluation summary in Git, move raw generated output to restricted ignored storage, and ignore `scripts/eval/.results/`.

## Known-root extensions

### K-09 extension — green E2E does not cross the prompts route

D2 confirmed that the landing handoff test stops after extraction, while the live variance tests seed a prepared prompt pack. No configured E2E test posts through `/api/audit/prompts`. This is a broader test-confidence consequence of known K-09 (“route-contract tests failing to reach valid production path”), not a new finding and is not included in severity counts.

Recommended correction under the K-09 fix: add a fully stubbed browser path that confirms facts, exercises `/api/audit/prompts`, reaches question review, and asserts exact request count, fallback/telemetry behavior, and zero unexpected external requests.

## Rejected/downgraded findings

- **D1-1 P1 → D-01 P2, merged with D2-2.** The environment-isolation defect is real, but the canonical clean-environment gate passed all browser modes. It does not currently block relying on CI/release; P2 matches the demonstrated reachability.
- **D2-3 → known-root extension.** Missing prompts-route browser coverage is material but overlaps the explicit K-09 root and is not counted again.
- **D4-1 P2 → D-05 P3.** The tracked artifact contradicts the local-only record and contains unnecessary metadata, but review found public-business data rather than secrets, private customer records, or production imports.
- **D4-2 rejected as a new finding.** `/audit/spec004` is a deployed noindex route capable of posting to the ungated extraction API, but the broader ungated `/api/audit/*` exposure is explicitly founder-accepted in `docs/DECISION_LOG.md:75` and `docs/NOW.md:30-38`. It remains an operational prerequisite to remove/guard before public sharing, not a newly discovered defect.
- **D4-3 and D4-4 folded into D-03.** The historical Kopi Kenangan runners have stale or environment-sensitive provider wiring. Their actionable system consequence is that root Vitest discovery includes live/historical runners. No separate severity is counted.
- **Alleged current paid-provider calls from Playwright rejected.** Extraction, run, report, and variance requests in configured live E2E tests are intercepted. `/api/audit/prompts` is not reached. The external `blume.codes` asset is real but is not an AI-provider request.
- **Generic mutable GitHub Action tag concern rejected.** No concrete compromise or repository-specific exploit evidence was established.
- **CI not calling the literal `npm run verify` rejected.** `ci.yml` explicitly runs check, unit tests, Next build, Cloudflare build-only validation, and E2E, then gates deployment on both validation and merged-PR provenance.
- **Secret-backed deploy rebuild rejected.** The deploy job checks out `github.sha`, depends on validation and main-origin verification, and no dummy key was found in the generated Worker bundle.
- **Node mismatch rejected.** `.nvmrc`, `package.json`, and CI select Node 22; observed D3 runtime was Node 22.23.2.
- **Archives existing or containing obsolete code rejected.** No active production import from `archive/` or `Archive Candidates/` was confirmed.
- **Missing component-test harness rejected as a new finding.** It is already disclosed as an open item in Spec 003 verification and no independent high-risk branch beyond K-09 was demonstrated.

## Safe commands executed

No command below made an AI-provider request or deployed anything.

| Command/procedure                                | Result                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `git rev-parse HEAD`                             | Exact frozen SHA confirmed                                                                                                              |
| `git status --short`                             | Four pre-existing untracked landing drafts only before report creation                                                                  |
| `git ls-files` + programmatic classification     | 395/395 tracked files classified                                                                                                        |
| `npm run verify` (orchestrator)                  | **Pass**; offline verifier completed normally                                                                                           |
| `npm run check` within verify                    | Pass; typecheck clean, lint 0 errors / 18 warnings, format check clean                                                                  |
| `npm run test:unit` within verify                | **503/503 passed (38 files)**                                                                                                           |
| `npm run build` within verify                    | Pass; 16 routes generated, including five audit APIs, `/audit`, `/audit/fixture`, and `/audit/spec004`                                  |
| `npm run build:cf` within verify                 | Pass; OpenNext 1.20.2 generated `.open-next/worker.js` for compatibility date 2026-08-01                                                |
| Main Playwright config                           | **37/37 passed**                                                                                                                        |
| Forced-failure config                            | **3/3 passed**                                                                                                                          |
| Preview-disabled config                          | **2/2 passed**                                                                                                                          |
| Total configured E2E                             | **42/42 passed**                                                                                                                        |
| D1 unit check                                    | 503/503 passed; duplicate validation evidence                                                                                           |
| D3 interrupted `npm run verify`                  | Check, unit, Next build, Cloudflare build, and 37/37 main E2E passed before external 120-second tool timeout; cleanup defect reproduced |
| Process/env cleanup after interrupted worker run | Review-created dummy env removed; stale ports 3000/3100/3200 confirmed clear; no secret read                                            |

Not executed because inspection established live/external AI reachability:

- bare `npx vitest run`
- `npx vitest run scripts/eval`
- `npx vitest run scripts/openrouter`
- `npx vitest run scripts/kopikenangan`
- `npx --yes tsx scripts/kk/run.ts`
- Sozo/Kopi Kenangan live runners
- provider smoke/evaluation scripts
- Wrangler/deployment commands

## Coverage/reachability ledger

Every tracked path was classified from `git ls-files`:

| Class                     | Tracked files | Review treatment                                                                                                          |
| ------------------------- | ------------: | ------------------------------------------------------------------------------------------------------------------------- |
| Active production         |           116 | Route and import reachability mapped; audit/provider boundaries sampled deeply; E2E-reached surfaces traced               |
| Active tests              |            43 | D1 mapped all 37 active `src/**/*.test.ts`; D2 reviewed all configured E2E specs; helpers and discovery included          |
| Active engineering/config |            84 | Required baseline docs and all named root/CI/build configs reviewed; sole workflow inspected in full                      |
| Scripts                   |             8 | All tracked source scripts reviewed for live-call and provider reachability; no live script executed                      |
| Fixture/demo              |            10 | Active fixture and Spec 004/demo paths classified; fixture path verified offline                                          |
| Archive                   |           133 | Names and active-reference edges checked; archive content not treated as authority; no active production import confirmed |
| Generated/artifact        |             1 | Tracked evaluation JSON inspected only enough to validate metadata/evidence handling                                      |
| Unknown                   |             0 | —                                                                                                                         |
| **Total**                 |       **395** | **395/395 classified**                                                                                                    |

Active reachability summary:

- Next production build exposes five audit API routes plus `/audit`, `/audit/fixture`, and `/audit/spec004`.
- Protected production provider wrappers fail closed to OpenCode Go configuration.
- Official unit and verification scripts are path-limited and do not discover `scripts/**`.
- Root Vitest discovery is broader than official npm scripts and does discover live `scripts/**/*.spec.ts` files.
- Fixture E2E makes no audit API request; live browser tests intercept every provider-capable route they actually reach.
- No production import from `archive/` or `Archive Candidates/` was verified.
- Alternate provider modules remain production-bundled through `provider.ts`, but protected production wrappers reject them; this is intentional testing support, not confirmed dead code.

## Operational risks

These are not additional severity-counted findings:

- `/audit` and `/api/audit/*` remain ungated under the founder's recorded interim-exposure acceptance. `noindex` is not access control. The server-side rate/cost guard remains mandatory before any public link sharing.
- `/audit/spec004` is present in the production build and posts to the live extraction route. Treat it as part of the accepted exposure until removed, gated, or converted to fixtures.
- CI injects `NUAVE_FIXTURE_FORCE_REPORT_FAILURE` during deploy. The completed launch plan says this value must remain blank. A stale true secret would force the production fixture into its synthetic failure state; no evidence showed that the live secret is set.
- The deploy job rebuilds the validated SHA with real production variables rather than deploying the validation artifact. This is intentional and no divergence was demonstrated, but future nondeterministic build steps would increase the gap.
- Lint currently reports 18 warnings. They did not fail verification and were not converted into findings without concrete test/release consequences.

## Cross-subsystem synthesis handoff

Handoff points for the other overnight reviews:

1. **Audit-core reviewers:** D-03 means a future generic test command must not be used to validate K-01 through K-08 fixes until live scripts are excluded. Use `npm run test:unit` or named paths only.
2. **Product/UI reviewers:** D-02 ties the live `/audit` experience to an external visual asset and leaves that live-surface network behavior outside the fixture side-effect assertion.
3. **Route-contract correction:** Fixing K-09 should include `/api/audit/prompts`; the current E2E flow skips that boundary entirely.
4. **CI/release:** The normal canonical gate is green and Cloudflare-build covered. D-04 concerns cancellation cleanup locally; CI runners are ephemeral, but explicit job timeouts or cancellations can still leave incomplete logs rather than a clean verifier verdict.
5. **Evidence governance:** D-05 shows repository documentation and Git state disagree about where raw evaluation evidence lives. Any later evidence-retention decision should cover generated evaluation outputs explicitly.
6. **Exposure/rate guard:** The infrastructure review did not reopen the founder's accepted interim exposure, but `/audit/spec004` increases discoverable live-call surface and should be included when the guard is implemented.

## Recommended correction order

1. **D-03 — Separate live runners from root test discovery.** This prevents accidental provider calls before any other test work expands discovery.
2. **D-01 — Sanitize Playwright server environments.** Make enabled, forced-failure, and disabled modes deterministic and credential-free.
3. **D-02 — Bundle the `/audit` hero asset and assert no external requests across all offline E2E suites.** This makes the offline claim enforceable.
4. **D-04 — Make `verify-offline.mjs` signal-safe and process-group-safe.** Preserve local env files and make interrupted checks recover cleanly.
5. **K-09 extension — Add the fully stubbed prompts-route browser path** while preserving the known-root identifier rather than creating a duplicate finding.
6. **D-05 — Remove/sanitize the tracked generated evaluation artifact and ignore its output directory.**
7. **Before public sharing — implement the already-required server-side rate/cost guard and include `/audit/spec004` in the exposure decision.**
