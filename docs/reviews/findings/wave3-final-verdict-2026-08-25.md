# Wave 3 Final Independent Verdict

Date: 2026-08-25

## Frozen target

`2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4`

Frozen base: `0ee72cf1d867bebbe755b91350262fc6499876ae`

PR #18 was verified before review as OPEN, DRAFT, UNMERGED, base `main`, with the exact frozen base and exact frozen head. The target did not move during the review.

## Reviewer independence

Two scope-separated review lanes were performed:

- Reviewer A: adversarial contract / data-integrity review.
- Reviewer B: browser / customer-path / release-isolation review.

Both challenged the frozen implementation itself rather than treating the Wave 2 implementation report as authoritative. Reviewer B's initial checklist was executed from the browser/public/test/release surfaces rather than from Reviewer A's report.

**Process limitation:** the available ChatGPT/GitHub harness does not expose a separately spawned subagent or a genuinely isolated second model context. Therefore literal context-level independence cannot be truthfully claimed. This is recorded as a certification-process limitation, not disguised as full independent-agent execution. It does not change the final BLOCK verdict because every accepted blocker below was re-inspected by the orchestrator against the frozen source and has a direct offline reproduction.

Reviewer A report:

`docs/reviews/findings/wave3-contract-validator-2026-08-25.md`

Branch: `review/wave3-contract-validator-2026-08-25`

Report commit: `498741f0f6ffc782ed8d6ff43ddec9162237d438`

Reviewer B report:

`docs/reviews/findings/wave3-browser-release-validator-2026-08-25.md`

Branch: `review/wave3-browser-release-validator-2026-08-25`

Report commit: `93946f7968c77527cdba60e8fa57e6b561476251`

## Reviewer A verdict

**BLOCK**

Accepted after synthesis:

1. **P2 / N-P2-02 reopened** — primary source parser still accepts some Google Maps forms as a generic website, notably `maps.google.com` root/query forms and Google regional Maps domains outside the hard-coded host families.
2. **P2 / N-P2-05 reopened** — generated-language guard only rejects when at least 8/10 questions are clearly English, so a materially non-Indonesian 7-English/3-Indonesian default pack can avoid the guard while still being stamped `id-ID` if other mechanical rules pass.
3. **P2 / N-P2-06 reopened** — compact comparison-business identity is protected in the generated-suggestion guard but not at the final customer-edited pack/run boundary; `KopiPesaing` can evade the spaced competitor check outside slot 6.

No P0/P1 contract, report, evidence-export, or Wave 1 regression was accepted.

## Reviewer B verdict

**BLOCK**

Accepted after synthesis:

1. **P2 / N-P2-17 reopened** — `verify-offline.mjs` writes the temporary `.env.production.local` before entering its cleanup `try/finally`; an exception during that write can bypass snapshot restoration entirely.
2. **P3 / N-P2-14 residual** — closed mobile navigation is correctly removed from the DOM and no longer focusable, but the hamburger retains `aria-controls="nuave-mobile-menu"` while the controlled element does not exist in the collapsed state.

The P3 item is non-blocking by itself. No public-truth, network-isolation, Spec004, live-test-discovery, or PR-deployment blocker was accepted.

## Accepted findings

| ID | Severity | Root | Final disposition |
| --- | --- | --- | --- |
| W3-A1 | P2 | N-P2-02 | REOPENED — unsupported Maps URL can enter primary intake as website |
| W3-A2 | P2 | N-P2-05 | REOPENED — 7/10 clearly English generated pack can evade language guard |
| W3-A3 | P2 | N-P2-06 | REOPENED — compact competitor leakage not enforced after customer edit |
| W3-B1 | P2 | N-P2-17 | REOPENED — verifier env write occurs outside cleanup `try/finally` |
| W3-B2 | P3 | N-P2-14 | PARTIAL residual — dangling `aria-controls` when menu closed |
| K-10 | Future | durable cross-tab/server-state | Accepted future limitation; explicitly outside Wave 3 blocker scope |

Final accepted counts:

- P0: **0**
- P1: **0**
- P2: **4**
- P3: **1**
- Future: **1**

All four P2 findings have zero-provider regression paths. None requires live AI/provider execution to prove.

## Rejected/downgraded claims

### Stale review path: `protected-observation-method.ts`

The brief names `src/lib/audit/protected-observation-method.ts`, but that production file is absent. The actual shared positive protected-attempt invariant is implemented in `production-observation-method.ts`. This is a stale review-path name, not a product defect.

### Raw diagnostics existing internally

Audit API/stream records still retain operational failure messages for diagnosis, but the reviewed customer-rendered paths map failures through finite `customerAuditErrorMessage()` copy. `AuditRunStep` does not render raw `runUnfinished.message`. No N-P1-08 regression was reproduced.

### Legacy `report.counts.failed` reference

One report line still references the internal counts projection, but the current report-generation gate requires exactly ten completed/evaluable protected observations before a report exists. No contradictory customer denominator was reproduced on the frozen path, so this was not accepted as a current N-P2-09 regression.

### Literal `npm run verify` absence

The Wave 2 implementation harness did not separately invoke the wrapper. Per review instructions, that absence is not itself a defect because the constituent gates are green and helper behavior has permanent tests. W3-B1 is accepted for the independent concrete reason that the wrapper's own pre-`try` write can bypass restoration.

### Missing `.github/workflows/deploy-pages.yml`

The path in the brief is stale. The active deployment path is contained in `.github/workflows/ci.yml`; no second Pages deployment workflow was found or introduced by Wave 2.

### N-P2-14 severity

The original P2 customer-impact issue — closed navigation content remaining focusable / keyboard behavior — is fixed. The remaining dangling `aria-controls` IDREF is real but narrower and does not prevent navigation, Escape closure, or focus restoration. It is therefore downgraded to P3 rather than severity-inflated to P2.

### K-10

Durable cross-tab/server-state execution remains a valid future architecture limitation. The Wave 3 instructions explicitly exclude it from current blockers.

## Wave 1 regression assessment

**No Wave 1 regression accepted.**

The orchestrator re-inspected the shared invariants rather than inheriting the Wave 1 report by assertion. The frozen Wave 2 code still enforces:

- deterministic canonical prompt IDs and slot order;
- unique prompt IDs before protected execution;
- code-owned canonical category;
- exact final question/observation binding;
- `branded` derived from exact final question text;
- positive completed observation-stage proof;
- exact requested/returned model proof;
- accepted response-ID ownership/correspondence;
- actual `web_search_call > 0`;
- exact completed 10/10 report proof;
- exact completed 10/10 variance prerequisite;
- exact designated variance subset;
- request cancellation propagation through run/variance retry execution;
- workflow-generation invalidation;
- transactional start/resume preservation;
- valid NDJSON-prefix preservation.

The final PR unit suite also executed the retained locked-pack, protected-observation, variance-route, cancellation, workflow-generation, stream, report, and route-contract regressions as part of the 601/601 green unit run.

Wave 1 assessment: **PASS / no P1 regression found**.

## Wave 2 finding matrix reassessment

Wave 3 does **not** accept the implementation handoff's blanket `23/23 RESOLVED` conclusion.

| Wave 2 finding | Wave 3 reassessment | Reason |
| --- | --- | --- |
| N-P1-01 | RESOLVED | Instagram profile identity canonicalization rejects post/reel/story/deeper content paths. |
| N-P1-08 | RESOLVED | Customer-rendered failures use finite safe mappings; raw diagnostics remain internal. |
| N-P1-12 | RESOLVED | Production report renders observed competitors plus evidence → interpretation → action structure. |
| N-P1-13 | RESOLVED | Active FAQ no longer publishes GPT-4o/payment/email/private-delivery as current product facts. |
| N-P1-14 | RESOLVED | Active public pages omit/inactivate unresolved commercial/legal facts rather than inventing them. |
| K-09 | RESOLVED | Real route boundary has offline protected-path coverage and final normal unit suite remains green. |
| N-P2-01 | RESOLVED | Client website adapter and server extraction use the same canonical primary source parser. |
| N-P2-02 | **REOPENED — P2** | Some Google Maps URL shapes still fall through as generic websites. |
| N-P2-03 | RESOLVED | Customer-owned fact state prevents later extraction from silently replacing the confirmed brief. |
| N-P2-04 | RESOLVED | Generated default pack is guarded/repaired to truthful 5/5 composition before display. |
| N-P2-05 | **REOPENED — P2** | Language guard's `>=8` threshold misses a materially non-Indonesian 7/10-English pack. |
| N-P2-06 | **REOPENED — P2** | Compact competitor guard exists for generated suggestions but not final edited/run validation. |
| N-P2-07 | RESOLVED | Generated/repaired prompt provenance is bound to confirmed business facts. |
| N-P2-08 | RESOLVED | Exact excerpt must be a literal raw-answer substring; whitespace-normalized mutation is rejected. |
| N-P2-09 | RESOLVED | Customer report/export primarily use validated measures and strip competing legacy projections; no current contradiction reproduced. |
| N-P2-10 | RESOLVED | Spec004 is local fixture state only; permanent browser test proves no audit API/external request. |
| N-P2-11 | RESOLVED | UI truthfully labels browser print flow as `Cetak / simpan PDF`; no generated PDF artifact is claimed. |
| N-P2-12 | RESOLVED | Invalid similar-business input is retained for correction and rejected before provider-bound use. |
| N-P2-13 | RESOLVED | Active customer surfaces use local assets and browser network guard rejects non-local hosts. |
| N-P2-14 | **PARTIALLY RESOLVED — P3 residual** | Closed content/focus/Escape/focus-return are fixed; collapsed `aria-controls` target is absent from DOM. |
| N-P2-15 | RESOLVED | Shared Playwright server env allowlists inheritance and overwrites ambient live/provider values. |
| N-P2-16 | RESOLVED | Default Vitest config excludes `scripts/**`; live specs require explicit `test:live-provider` config. |
| N-P2-17 | **REOPENED — P2** | Verifier cleanup does not cover an exception during the temporary env write itself. |

Reassessment summary:

- RESOLVED: **18/23**
- REOPENED: **4/23**
- PARTIALLY RESOLVED: **1/23**

No reopened Wave 2 issue was severity-inflated to P1.

## CI / release assessment

Final PR CI #453 (`32801362126`) was inspected directly.

`validate` is **SUCCESS** with:

- `npm run check`: PASS
- unit: **601/601**
- `npm run build`: PASS
- `npm run build:cf`: PASS using dummy build-only provider values
- default E2E: **42/42**
- forced-failure E2E: **3/3**
- preview-disabled E2E: **2/2**
- total browser: **47/47**

The run checked GitHub's synthetic PR merge of frozen head `2a6d847...` into frozen base `0ee72cf...`, which is the expected pull-request CI target.

For that PR run:

- `Verify main came from merged PR`: **SKIPPED**
- `Deploy to Cloudflare Workers`: **SKIPPED**

The active workflow has read-only repository permissions for PR validation. Deployment only runs on a `push` to `main`, requires successful validation plus the merged-PR-origin guard, and uses the validated main commit. No temporary debug workflow, provider execution workflow, or PR deployment path was introduced by Wave 2.

**CI/release guard assessment: PASS.**

The final BLOCK is caused by four current-scope correctness/reliability defects, not by a failed CI or unsafe deployment trigger.

## Residual limitations

- K-10 / durable cross-tab/server-state execution: **Future**, intentionally outside current architecture.
- Literal independent-subagent execution was unavailable in this harness. The two passes were scope-separated but not genuinely isolated model contexts. This limitation is explicitly recorded rather than claimed away.
- Existing warnings/dependency advisories visible in CI are not elevated into Wave 3 findings because they were not shown to violate the reviewed current product/release contracts.

## Final verdict

**BLOCK**

Reason: four reproducible current-scope P2 defects remain at the frozen Wave 2 head:

1. unsupported Google Maps primary intake bypass;
2. generated language guard threshold gap;
3. final edited compact-competitor leakage gap;
4. offline verifier pre-`try` env-write cleanup gap.

The founder should return these findings to an implementation worker. Wave 3 performed no fixes, merge, deployment, or provider execution.

## Safety accounting

- live AI/provider calls: **0**
- paid provider calls: **0**
- deployments: **0**
- merges to `main`: **0**
- production code/test/config mutations: **0**
- PR #18 mutation: **0**
- review-only report branches created: **3**

No K-10 implementation, Phase 4 work, or Phase 5 work was started.