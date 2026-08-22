# Verification: Spec 003 — Live engine connection and report-quality gate

> Result: **Pending — the 2026-08-21 OpenCode Go migration and production-method
> lock are automated-verified, but the first founder-supervised paid report
> through the actual product path and its report-quality judgment have not
> occurred. This is not a Spec 003 quality-gate Pass.**
> Reviewer: Adversarial review (`docs/reviews/findings/phase-3-adversarial-review.md`,
> `docs/reviews/findings/phase-3-fix-round-2.md`,
> `docs/reviews/findings/phase-3-fix-round-3.md`) + migration fix passes +
> Agent E documentation/config reconciliation
> Date: 2026-08-21
> Spec version or commit: `specs/003-live-report-quality-gate/SPEC.md`, status
> **Approved — implementation in progress** (founder-approved 2026-08-17)
> Migration implementation commit: PR #3 code head
> `11b4807383a8d86bb6f03100a89b582f27619fbc`; documentation reconciliation
> follows that implementation without changing application behavior.

## 2026-08-21 OpenCode Go migration checkpoint

The protected production method now has one coherent configuration and fails
closed when that method is not present:

| Method fact | Current protected production value |
|---|---|
| Transport | OpenCode Go Responses-compatible API |
| Audit provider | `NUAVE_PROVIDER=opencodego` |
| Question provider | `NUAVE_QUESTION_PROVIDER=opencodego` |
| Canonical credential | `OPENCODEGO_API_KEY` |
| SDK compatibility | `OPENAI_API_KEY` may be populated internally/build-time only as the alias consumed by the existing OpenAI SDK adapter |
| Endpoint | `https://opencode.ai/zen/go/v1` |
| Model | `gpt-5.6-luna` |
| Reasoning | `low`; the protected path rejects another `OPENAI_AUDIT_REASONING_EFFORT` value |
| 03 extraction | Web search required and restricted to the submitted official website/domain |
| 04 question generation | Indonesian, one bounded provider call, no web search |
| 05 observations | Indonesian `neutral-response-v1`; web search required; a missing search is a technical failure rather than an evaluable result |
| 06 report synthesis | Indonesian report path, `plain-id-v1`; no web search |
| Alternate providers | Direct OpenAI, Gemini, Groq/Tavily, and OpenRouter are testing-only and cannot serve the protected production path |

The protected observation method additionally rejects evidence whose recorded
system/requested-model provenance is not OpenCode Go + GPT-5.6 Luna. Exact
returned-model provenance remains recorded rather than rewritten to a guessed
canonical model identifier.

The deployment example agrees with the code: the GitHub workflow writes
`OPENCODEGO_API_KEY` as the canonical secret and supplies the same value as
`OPENAI_API_KEY` only inside the gitignored build environment for SDK
compatibility. `.env.example` likewise separates the canonical production
variables from explicit testing-only provider variables and contains no secret
values.

### Automated verification observed for the migration code

No provider call was made for this reconciliation. The required non-provider
validation commands were observed in PR #3 CI run `32448533641`, job
`96672489541`, against merge ref `4a000465fecb29652e081ddc7de20943a5f62658`
(branch head `11b4807383a8d86bb6f03100a89b582f27619fbc` merged with the then-current
`main`):

| Command | Observed result |
|---|---|
| `npm run check` | **Passed** — typecheck clean, lint 0 errors / 13 warnings, Prettier clean |
| `npm run test:unit` | **453/453 passed (28 files)** |
| `npm run build` | **Passed** — Next.js production build completed and generated all application/API routes |
| `npm run test:e2e` | **33/33 passed** (additional CI coverage: 28 normal + 3 forced-failure + 2 preview-disabled) |

These results verify the integrated migration code and its regression coverage;
they do not spend provider budget and do not replace the founder-supervised
paid report required by the phase exit gate.

## Why this record is still not a Pass

Spec 003's central deliverable remains one real Indonesian report produced by
driving the founder through the actual `/audit` + `/api/audit/*` product path,
then reading that rendered report and its evidence against the phase exit gate.
That run has not happened on the current OpenCode Go production method.

The older full-pipeline evidence from 2026-08-17 called
`runAuditObservations` and `createValidatedAuditReport` directly from scripts,
not through the product route. It therefore does not stand in for the required
product-path run or founder judgment. The old direct-OpenAI and access-gate
configuration surrounding that run is historical; the 2026-08-21 decision-log
entry supersedes the provider transport, and the 2026-08-20 decision removed
the access-code gate in code. The unresolved fact is narrower and unchanged:
the current product path has not yet produced the paid quality-gate report.

## Historical findings fixed before the OpenCode Go migration

The detailed findings below are retained as dated verification history. Where a
provider name or access-control detail differs from the current checkpoint
above, the current 2026-08-21 checkpoint governs operational truth; the defect,
fix, and reproducing-test history remains valid.

All findings in the first table are from
`docs/reviews/findings/phase-3-fix-round-2.md`, reviewed at `c18fe8e`.

| # | Finding | Severity | Fix | Reproducing test |
|---|---|---|---|---|
| N-1 | `ReportView.tsx`'s "Tanpa menyebut bisnis Anda" tile read `counts.unbranded_mentioned` (mentioned **and not** recommended) instead of "appeared regardless of recommendation" | Critical | `buildAuditReport` computes a `measures` block and `ReportView.tsx` reads `report.measures.unbranded.appeared` | `contracts.test.ts`: "counts appearances, not recommendation status, in `measures.*.appeared` (N-1/R3-7)"; round 3 corrected the fixture so reverting the fix fails |
| N-2 | The headline tile put the sentence in the large numeric slot and the X/10 figure in the small caption | Major | Swapped the figure and sentence to match the fixture reference and CSS roles | Covered indirectly by the `measures.overall` data test; DOM rendering remained code-review-only |
| N-3 | `ReportView.tsx` re-derived appearance count client-side, violating the single evidence derivation rule | Minor | Removed client-side derivation; the view reads server-computed `report.measures.overall.appeared` | Same corrected `contracts.test.ts` regression as N-1 |
| O-2 | Indonesian reports stamped `plain-en-v1` / `deterministic-v4-en` regardless of language | Critical | `AuditReportLabelPack` owns writing/prompt contract versions; Indonesian reports stamp `plain-id-v1` and the Indonesian prompt contract | `report-pipeline.test.ts` drives the Indonesian report pipeline and asserts the stamps; `report-language-id.test.ts` asserts against real built output |
| O-3 | The live report omitted recommendation/comparison/information measures and the assessed-denominator `Tidak diuji` rule | Critical | Added assessed-denominator measures and a shared Indonesian measure-label helper | `contracts.test.ts` covers data branches; `report-labels.test.ts` covers the zero-denominator rendering helper |
| O-5 | Spec 003 recorded an unreproducible 276/126/31 baseline | Major | Corrected to Spec 002's measured 274 audit-unit floor, 82 fixture-journey tests, and 33 e2e tests | Documentation reconciliation, re-measured in round 3 |
| O-6 | Evaluation spend was described as accounted USD 0.00 despite measured spend | Major | Corrected the evaluation record to distinguish measured spend from the configured carry-over rather than inventing a convention | Documentation |
| O-7 | Client-supplied `budget.calls` can reset per-session headroom without server-owned run state | Major | Explicitly documented; a server-owned ledger remains Phase 4 scope | Deliberately not implemented in Spec 003 |
| O-8 | Provider telemetry exceeded the requested `max_tool_calls` cap | Major | Documented the request cap as advisory and kept accounting based on actual returned tool calls | Provider-side behavior; not enforceable by a unit test |
| O-9 | No test exercised the Indonesian pipeline path, writing-standard stamp, or report tile values | Major | Added real pipeline/contract assertions rather than tautological constant checks | Covered by the O-2 and N-1 tests above |
| O-10 (m-1) | `NUAVE_LIVE_PROVIDER_TESTING=1` could re-enable alternate providers in production | Minor | Testing flag is ignored when `NODE_ENV=production` | `provider.test.ts` production fail-closed assertion |
| O-10 (m-2) | Missing provider credentials were discovered too deep in execution and could burn retries | Minor | Added fail-fast credential assertions at route/orchestrator/report boundaries; the 2026-08-21 migration extends that guard to the complete OpenCode Go method | Provider/orchestrator/report-pipeline tests assert failure before provider work |

## Round-3 findings fixed before the migration

All findings below are from
`docs/reviews/findings/phase-3-fix-round-3.md`, reviewed at `6c5b8dd`. The
reproducing tests were checked against reverted code during that pass.

| # | Finding | Severity | Fix | Reproducing test |
|---|---|---|---|---|
| R3-1 | The N-1/N-3 regression fixture did not actually separate the buggy and fixed numerators | Major | Replaced it with a live-shaped fixture containing recommended, mentioned-not-recommended, absent, and deliberately un-normalized cases | `contracts.test.ts` fails when the old numerator is restored |
| R3-2 | The 276 audit-unit baseline was never measured | Major | Spec 002's measured **274 (18 files)** at `83ad34c` became the non-regression floor; current counts are recorded against the commit actually run | Documentation plus measured checks |
| R3-3 | Recommendation/comparison/information denominators used inconsistent eligibility | Medium | All three now use one rule: brand appeared and the dimension was judged | `contracts.test.ts` pins all three dimensions against one observation set |
| R3-4 | Restoring a pre-`measures` saved report could crash the report screen | Medium | Bumped the workflow storage version and structurally validates restorable reports | `workflow-storage.test.ts` includes the pre-measures restore case |
| R3-5 | Script callers could bypass the credential fail-fast guard | Medium | `runAuditObservations` and `createValidatedAuditReport` assert live credentials for real provider bindings | `run-orchestrator.test.ts` and `report-pipeline.test.ts` assert no provider work before the guard |
| R3-6 | The ten-of-ten report gate only ran for Indonesian reports despite a broader invariant | Low | `assertReportGenerationGate` runs unconditionally | English-path report-pipeline tests reject incomplete evidence before synthesis |
| R3-7 | `measures.*.appeared` depended on a cross-file normalization invariant | Low | Appearance is counted directly from `appearance === "mentioned"` | Same corrected `contracts.test.ts` regression as R3-1 |
| R3-8 | `measureLabel` was duplicated pure logic in two components with no test | Low | Moved it to `report-labels.ts` as `indonesianMeasureLabel` and reused it in both views | `report-labels.test.ts` covers empty and non-empty denominators |

## Items intentionally still open

- **Founder-supervised paid product-path audit.** The current OpenCode Go
  method still needs one real run through `/audit` and `/api/audit/*`, followed
  by the founder's sceptical-owner and audit-professional read. This is the
  blocking Spec 003 exit gate; no script-only run substitutes for it.
- **Server-owned session cost ledger.** The deeper O-7 fix remains Phase 4
  because Spec 003 explicitly excludes server-owned order/run state. The
  founder-operated phase retains the documented carry-over floor; this gap must
  close before adversarial customer-facing use.
- **Provider-side tool-call cap.** Nuave records and prices actual returned web
  search calls even if the provider exceeds the requested advisory cap.
- **Live report DOM test infrastructure.** The report data/label logic has unit
  coverage; the repository still does not have a dedicated React component-test
  harness for `ReportView.tsx`.
- **Remaining English interface chrome.** Some hardcoded `/audit` JSX around the
  method remains English and belongs to the approved product-wide polish work.
  This is distinct from the Spec 003 execution contracts: question generation,
  audit observations, and report synthesis on the protected path are now
  Indonesian.
- **Durable jobs, server-side persistence, payment, and delivery.** These remain
  later phases and were not introduced by the provider migration.

## Historical automated baseline reconciliation

The 2026-08-19 round-3 pass measured:

| Commit | Audit-unit result | Meaning |
|---|---|---|
| `83ad34c` (Spec 002 verified) | **274/274 (18 files)** | Baseline now cited by Spec 003 R-33/AC-02 |
| `6c5b8dd` (Phase 3 fix-round-2) | **279/279 (18 files)** | Re-measured in a clean worktree during round 3 |
| round-3 working tree | **295/295 (19 files)** | Round-3 fix pass before later provider/design work |

The earlier claim that 279 was three higher than 276 is withdrawn: 276 was
never measured at a named commit, while 274 was.

## Verdict

**Not a quality-gate pass.** The implementation now has a coherent protected
OpenCode Go production method, the Indonesian question/observation/report
contracts are wired, direct OpenAI and other alternatives are testing-only,
and the integrated automated regression is green. That establishes readiness
to run the gate; it does not establish that the report is worth paying for.

R-31/R-32 and the founder judgment gates remain open until the first
founder-supervised paid report is produced through the actual product path and
its concrete evidence is reviewed and recorded here. Do not mark Spec 003
Passed before that happens.
