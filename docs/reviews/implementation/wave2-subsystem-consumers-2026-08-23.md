# Wave 2 Subsystem Consumers — Implementation and Certification Report

Date: 2026-08-25

## Purpose and scope

Wave 2 closes the consumer-facing and verification findings assigned after the frozen whole-repository review. The work is limited to source intake/fact correction, report/customer-error presentation, truthful public surfaces/accessibility, and offline test/CI isolation. It preserves the accepted Wave 1 protected execution contracts and does not begin Wave 3, Phase 4, or Phase 5.

No deployment, merge to `main`, live provider execution, or paid provider execution was permitted during implementation or certification.

## Frozen baseline and certified code head

- Frozen `main` baseline: `0ee72cf1d867bebbe755b91350262fc6499876ae`
- Integration branch: `fix/wave2-subsystem-consumers-2026-08-23`
- Draft pull request: #18
- Final Wave 2 code head before this documentation-only report: `7a271addfb3907f3d335a4801f6ec68f851cc7b4`
- Baseline → code-head relation: 82 commits ahead, 0 behind
- Code-head Wave 2 diff: 53 files

The branch tip after this report is a documentation-only commit. A commit cannot embed its own resulting SHA; the final documentation-head SHA is therefore recorded in PR metadata and the final handoff.

## Lane SHAs

| Lane | Scope | Final lane SHA |
| --- | --- | --- |
| Lane 1 | Intake / facts / correction path | `b842afdadf1757e79d073931203da8ecaf69b9f6` |
| Lane 2 | Report / customer error UI | `4558f60e30537d5e3cc02e2a57eb5aa300b0bb7d` |
| Lane 3 | Public truth / accessibility | `00c435dc313877499d45f93681503f68006bb2c7` |
| Lane 4 | Test / CI isolation | `4e561de1dec6d6b87d44710f540c3a732f2cef61` |

The lane histories were integrated rather than reimplemented. Shared hotspots were reconciled on the integration branch.

## Finding matrix

Only the approved classifications are used below. `RESOLVED` is used where the final repository contains a permanent implementation boundary and permanent proof through unit/static/E2E coverage or an executable fail-closed contract exercised by normal CI.

| Finding | Status | Permanent closure / proof |
| --- | --- | --- |
| N-P1-01 — Instagram post/reel-like paths can become the wrong account identity | RESOLVED | Canonical source parsing accepts Instagram profiles but rejects `/p/`, `/reel/`, `/reels/`, `/stories/`, and extra content paths. `source-input.test.ts` is permanent coverage. |
| N-P1-08 — raw provider/transport diagnostics can reach customer UI | RESOLVED | `customerAuditErrorMessage()` is the finite customer-facing mapping used by `AuditWorkflow`; raw diagnostic text remains internal. Unit tests cover known/unknown provider codes, and live variance E2E proves the safe variance message while the synthetic diagnostic remains stored but not rendered. |
| N-P1-12 — live report omits observed competitors and observation → interpretation → action structure | RESOLVED | Production `ReportView` renders `report.observed_competitors` with question references, and each key finding renders observed excerpt → `Artinya bagi Anda` → matched `Yang dapat dilakukan`, all from the validated report record. Production build and full report/E2E suites remain green. |
| N-P1-13 — active FAQ makes stale GPT-4o/payment/email/private-delivery claims | RESOLVED | Public pages were rewritten to current product truth. Permanent public-truth tests reject `GPT-4o` and require unimplemented payment/email delivery to be described as unavailable. |
| N-P1-14 — public pages expose unresolved operational placeholders | RESOLVED | Permanent public-truth tests scan FAQ, Terms, Privacy, and Support for unresolved operator/date/provider/price/payment/delivery/access/support placeholder forms. Unknown public/legal facts were omitted or described as unavailable rather than invented. |
| K-09 — coverage did not reach a valid protected production route boundary | RESOLVED | `wave2-route-contract.test.ts` exercises the real offline route chain: extraction → `/api/audit/prompts` → exact reviewed prompt pack → accepted `/api/audit/run`, with protected provider execution stubbed and live-provider detection false. It passed inside the normal 601-test unit suite. |
| N-P2-01 — client and server disagree on explicit HTTP(S) source validity | RESOLVED | One canonical source parser drives compatibility and extraction-route decisions. `website-input.test.ts` proves supported source parity and rejects unsupported sources before any provider call. |
| N-P2-02 — UI advertises Google Business Profile without an extraction contract | RESOLVED | Primary intake supports website and Instagram profile only. Source tests reject Google Maps/GBP intake, integration wiring proves SourceHero contains no GBP claim, and default E2E explicitly proves the live landing does not advertise Google Business Profile. |
| N-P2-03 — re-extraction can overwrite customer-edited facts | RESOLVED | `AuditWorkflow` tracks `factsCustomerOwned`; when true, re-extraction preserves the customer-owned brief and adds `PRESERVED_FACTS_WARNING` instead of overwriting it. Cross-lane wiring tests permanently assert this preservation plus Wave 1 invalidation behavior. |
| N-P2-04 — generated suggestion pack can violate advertised 5/5 composition | RESOLVED | Permanent Wave 2 suggestion guards detect non-5/5 defaults and repair unsafe slots before display while restoring the required 5/5 classification summary. |
| N-P2-05 — clearly non-Indonesian output can be stamped `id-ID` | RESOLVED | Permanent suggestion-guard coverage detects clearly non-Indonesian model output before it can be accepted as a valid Indonesian suggestion pack. |
| N-P2-06 — compact/punctuation competitor identity can leak outside its slot | RESOLVED | Permanent suggestion-guard coverage catches compact/punctuation-mutated competitor identity leakage outside the designated comparison slot. |
| N-P2-07 — `inputs_used` provenance can be inaccurate | RESOLVED | Repaired/generated suggestions carry truthful `inputs_used: ["confirmed_business_facts"]`; permanent Wave 2 test coverage asserts this for every prompt in the repaired pack. |
| N-P2-08 — whitespace-mutated excerpt can pass as verbatim | RESOLVED | Exact excerpt validation requires a true substring of retained raw response text, including original whitespace/newlines. Permanent tests accept exact text and reject whitespace-normalized mutation. |
| N-P2-09 — correct eligible measures can coexist with contradictory broad denominators/facts | RESOLVED | Customer report dimensions are rendered from `report.measures`; the customer JSON projection retains validated measures while removing competing legacy `facts`, `counts`, and operational telemetry. Permanent export tests and report rendering use this single customer-facing source. |
| N-P2-10 — `/audit/spec004` can perform live extraction | RESOLVED | Spec004 is a hard-offline preview. Permanent Playwright coverage proves the route makes no `/api/audit/*` request and no unexpected third-party request. |
| N-P2-11 — “Download PDF” actually invokes print without a PDF artifact contract | RESOLVED | Production action is truthfully labeled `Cetak / simpan PDF` and calls the browser print flow. Unit label coverage and live E2E assert that exact action; no generated PDF artifact is claimed. |
| N-P2-12 — invalid similar-business input can disappear without useful feedback | RESOLVED | Similar-business normalization keeps malformed user text available for correction, validates public HTTP(S) before provider-bound use, rejects Instagram content paths, and sanitizes invalid AI suggestions. Permanent tests cover these boundaries. |
| N-P2-13 — `/audit` depends on unrelated third-party hero asset / offline tests do not enforce host boundary | RESOLVED | Production SourceHero uses a local CSS backdrop with no remote asset URL. Permanent public-truth/static coverage and Playwright external-host guards prove `/`, `/audit`, `/audit/fixture`, and Spec004 do not make unexpected third-party requests. |
| N-P2-14 — closed mobile navigation remains focusable and lacks disclosure semantics | RESOLVED | Closed mobile menu is removed from the DOM; `aria-expanded`, `aria-controls`, Escape dismissal, and hamburger focus restoration are permanent production behavior and are asserted in public-truth tests. |
| N-P2-15 — Playwright modes inherit ambient provider/fixture environment | RESOLVED | `offlineE2EServerEnv()` overwrites ambient provider credentials/live switches and allows only explicit fixture-mode overrides. Permanent tests prove the environment isolation; all three normal Playwright configurations passed. |
| N-P2-16 — broad root Vitest discovery includes credentialed live-provider runners | RESOLVED | Normal `test:unit` uses the safe `vitest.config.ts`; live-provider execution has its own explicit `test:live-provider` config and was not run. Normal CI discovered 56 files / 601 tests without executing credentialed live runners. |
| N-P2-17 — interrupted offline verification can leave env/processes behind | RESOLVED | `verify-offline.mjs` snapshots/restores `.env.production.local`, handles SIGINT/SIGTERM, terminates the detached child process group, restores the file in `finally`, and forces provider-sensitive environment values offline. Permanent helper tests cover exact file restoration/removal and offline env enforcement. |

Wave 2 target findings: **23 RESOLVED, 0 PARTIALLY RESOLVED, 0 NOT ADDRESSED, 0 BLOCKED, 0 DEFERRED BY APPROVED SCOPE**.

## Integration reconciliation

### 1. `AuditWorkflow` conflict reconciliation

`AuditWorkflow.tsx` was a shared Lane 1 / Lane 2 / Wave 1 hotspot. The integrated version preserves all three responsibilities instead of choosing one lane's version:

- Lane 1 source/fact behavior:
  - `factsCustomerOwned` is persisted and restored;
  - customer edits/confirmation mark the facts customer-owned;
  - re-extraction sanitizes newly suggested similar businesses;
  - if facts are customer-owned, the extraction result is kept for review but the customer brief is not overwritten;
  - `PRESERVED_FACTS_WARNING` explains the preserved state.
- Wave 1 lifecycle safety:
  - business-fact edits invalidate old operations;
  - prompts, run, report, and variance retain operation-generation/AbortSignal boundaries;
  - restart/back-navigation invalidate stale work;
  - report/variance still require the protected locked evidence path.
- Lane 2 customer-facing behavior:
  - arbitrary request diagnostics are mapped through `customerAuditErrorMessage()`;
  - report and variance errors keep raw diagnostic detail in internal records while rendering finite customer-safe messages;
  - customer evidence export uses `makeCustomerEvidenceExport()` rather than the operational/raw projection;
  - the report completion flow retains the truthful print/save-PDF action.

Permanent `wave2-integration-wiring.test.ts` asserts the key cross-lane wiring and Wave 1 invalidation calls.

### 2. `SourceHero` conflict reconciliation

`SourceHero.tsx` was a Lane 1 / Lane 3 hotspot. The final component keeps:

- the Lane 1 canonical `parseSourceInput()` contract;
- website and Instagram-profile-only customer copy;
- rejection of unsupported/malformed sources;
- the Lane 3 local CSS backdrop, eliminating the prior third-party asset dependency;
- the landing→audit one-shot source handoff behavior.

It does not advertise Google Business Profile intake.

### 3. Customer evidence export wiring

The real `AuditWorkflow.downloadEvidenceJson()` path now calls `makeCustomerEvidenceExport(brief, prompts, observations, report)`. The customer projection:

- keeps the validated report measures;
- keeps observable question/answer evidence;
- omits competing legacy `facts` and `counts` projections;
- omits operational telemetry;
- omits observation failure diagnostics and call telemetry.

This is permanent unit-tested behavior and is also statically asserted in the integration wiring suite.

### 4. Lane 4 isolation changes

Lane 4 hardened the default developer/CI test boundary without introducing a deployment path:

- deterministic Playwright server environment that blanks provider credentials and disables live testing;
- external-host network guard for active customer surfaces;
- hard-offline Spec004 preview with no audit API request;
- safe default Vitest discovery and separate explicit live-provider config;
- route-level K-09 offline contract coverage;
- interruption-safe offline verifier with process-tree termination and exact `.env.production.local` restoration.

The production CI workflow itself was not replaced by a diagnostic workflow. Normal PR CI remains the certification path.

## Integration regression found by normal E2E

The first integrated normal E2E run exposed one genuine production regression in the landing → `/audit` source handoff.

### Root cause

Lane 2 changed budget-bootstrap failures to the finite customer-safe error mapping. `AuditWorkflow` therefore rendered the new bootstrap message. `SourceHero`, however, still compared against the old literal bootstrap wait string before deciding whether a one-shot handoff should retry after budget readiness.

The mismatch caused a valid landing submission to navigate to `/audit` but never issue the intended extraction POST.

### Fix

At commit `029b0d032fab74af979cefb6b8ab2e89bc32fccf`, `SourceHero` stopped duplicating the old literal and instead derives its known bootstrap wait state from:

`customerAuditErrorMessage("bootstrap")`

This keeps customer-safe messaging and the automatic one-shot handoff on the same source of truth. The corrected normal E2E later proved the valid landing source extracts exactly once after navigation.

## Six stale E2E migrations after the production fix

After the bootstrap fix, exactly six remaining browser failures were stale expectations against intentional Wave 2 behavior. Production behavior was not weakened.

1. Live landing source hint migrated from unsupported GBP advertising to:
   `Masukkan URL website atau akun Instagram resmi bisnis Anda.`
   The test also now proves Google Business Profile is not advertised.
2. Invalid landing input expectation migrated to:
   `Masukkan link website resmi atau akun Instagram yang valid.`
   It still proves the browser remains on `/` and no audit API request occurs.
3. Successful report+variance action expectation migrated from `Download PDF` to `Cetak / simpan PDF`.
4. Variance-failure report action expectation migrated to `Cetak / simpan PDF`.
5. Restored-completed-variance action expectation migrated to `Cetak / simpan PDF`.
6. Restored incomplete-evidence assertion stopped requiring an obsolete localized internal diagnostic. It now proves the internal reason is a non-empty rejection of incomplete completed-observation proof, no variance POST occurs, and the customer UI renders the finite safe variance message rather than the raw diagnostic.

The variance-failure E2E continues to prove that `Synthetic variance outage.` remains stored internally while not appearing in customer UI.

## Public/legal truth deliberately not invented

Wave 2 did not manufacture operator identity, legal address, effective date, payment availability, email/private delivery, provider claims, or other missing operational facts merely to fill public pages.

Where the repository does not establish a fact, the active pages either omit the unsupported claim or state the current limitation. In particular:

- no stale GPT-4o claim is published;
- unimplemented checkout/payment is not represented as active;
- unavailable email/private report delivery is not represented as active;
- unresolved placeholder tokens are not shipped as apparent facts.

This is enforced by permanent public-truth tests.

## Wave 1 regression status

Wave 1 protected contracts remain intact. Normal Wave 2 code-head CI passed the full unit suite, including the existing locked-question, protected-observation, variance, retry/cancellation, stream, workflow-generation, report-pipeline, and client-contract tests.

The integrated workflow specifically retains:

- canonical locked prompt/evidence identity;
- protected OpenCode Go method/model proof;
- actual web-search proof;
- exact completed 10/10 variance prerequisite;
- exact designated variance subset;
- operation-generation invalidation and AbortSignal propagation;
- transactional run/resume behavior;
- valid NDJSON-prefix preservation.

No accepted Wave 1 production invariant was relaxed to make Wave 2 tests pass.

## Canonical code-head verification

Certified Wave 2 code head before this documentation commit: `7a271addfb3907f3d335a4801f6ec68f851cc7b4`.

Normal PR CI #452, run `32800785045`, executed the repository's canonical PR gate on that exact head.

| Verification | Result | Evidence |
| --- | --- | --- |
| `npm run check` | PASS | Typecheck PASS; lint 0 errors / 22 warnings; Prettier PASS. |
| `npm run test:unit` | PASS | **56 files, 601/601 tests**. |
| `npm run build` | PASS | Next.js production build completed successfully. |
| `npm run build:cf` | PASS | OpenNext Cloudflare build completed successfully with dummy build-only credentials. |
| Default/main Playwright configuration | PASS | **42/42**. |
| Forced-failure Playwright configuration | PASS | **3/3**. |
| Preview-disabled Playwright configuration | PASS | **2/2**. |
| Canonical `npm run test:e2e` | PASS | All three configurations completed sequentially: **47/47 total browser tests**. |
| `npm run verify` | NOT EXECUTED IN THIS HARNESS | The current certification harness has no repository checkout and cannot reach this private repository from its execution sandbox. No temporary workflow was added merely to run the wrapper. Its permanent cleanup/offline-env tests passed inside the **601/601** unit run, and each command the wrapper orchestrates (`check`, `test:unit`, `build`, `build:cf`, `test:e2e`) passed in normal PR CI #452. |

`npm run test:live-provider` was deliberately **not** executed.

### Normal PR CI result on code head

- CI run: #452 (`32800785045`)
- Result: **SUCCESS**
- Validate job: **SUCCESS**
- Deployment job: **SKIPPED**

## Safety accounting

- Live provider calls: **0**
- Paid provider calls: **0**
- Deployments: **0**
- Merges to `main`: **0**
- Wave 3 work started: **0**

Build-only credentials were dummy values. Playwright environments explicitly blank provider credentials and disable live-provider testing. The K-09 route test used stubs and `isLiveProviderCall: () => false`.

## Residual non-blocking notes

- `npm run check` reports 22 lint warnings and 0 errors; these warnings do not fail the repository gate and were not expanded into Wave 2 cleanup.
- `npm ci` reports two moderate dependency advisories; dependency upgrade work is outside this Wave 2 subsystem scope.
- The standalone `npm run verify` wrapper could not be invoked from the current external certification harness because it has neither a checkout nor private-repository network access. This is a harness limitation, not a product failure; its component commands are all green in normal PR CI and its Wave 2 cleanup/environment helpers have permanent unit coverage.
- PR #18 remains draft and unmerged by design.

## Certification assessment

All 23 Wave 2 target findings are classified **RESOLVED** with permanent implementation/proof in the integrated repository. The real landing→audit regression found by normal E2E was fixed without reverting customer-safe errors. The six remaining browser failures were migrated as stale assertions without restoring unsupported GBP claims, raw customer diagnostics, broad report denominators, or the misleading PDF label.

The final code head is green under the repository's complete normal PR gate and is ready for an independent Wave 3 review after this documentation-only head also passes normal PR CI. Wave 3 has not started.

## Post-certification correction note — Wave 3

Wave 3 independent verification subsequently reopened four P2 findings:

- N-P2-02
- N-P2-05
- N-P2-06
- N-P2-17

and identified a P3 residual for N-P2-14.

Therefore the original Wave 2 statement of 23/23 RESOLVED is historical and was superseded by the Wave 3 verdict at frozen head:

`2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4`

The subsequent corrective implementation and closure evidence are recorded in:

`docs/reviews/implementation/wave3-blocker-corrections-2026-08-25.md`
