# Nuave Whole-Repository Overnight Review — 2026-08-23

## 1. Executive verdict

**FAIL**

The frozen application is not ready to be relied on for the founder-supervised live report-quality run. No catastrophic P0 was verified, and the canonical offline gate is green, but the review leaves 18 P1 root defects. The highest-risk failures are source/entity drift before questions are generated, weak immutable binding and positive provenance at run/report boundaries, browser state transitions that can strand or erase recoverable work, and customer-facing report/public surfaces that omit evidence or state false current facts.

| Final classification                   | Root count |
| -------------------------------------- | ---------: |
| P0                                     |          0 |
| P1                                     |         18 |
| P2                                     |         22 |
| P3                                     |          2 |
| Future-scope / accepted limitation     |          2 |
| **Total tracked roots**                |     **44** |
| Rejected/deduplicated raw field claims |         17 |

Count interpretation:

- The four overnight reports contained **51 raw worker claims** and retained **38 field-level findings** after their own synthesis.
- Final cross-pod challenge produced **34 distinct new overnight root records**: 14 P1, 17 P2, 2 P3, and 1 accepted deferred limitation.
- The 10 previously known pilot roots are tracked separately: 4 P1, 5 P2, and 1 Future. They are not counted again when an overnight report merely added a consequence.
- Therefore the final root ledger contains **44 records**, not 51 + the pilot findings.
- “Rejected/deduplicated” is the arithmetic difference between 51 raw field claims and 34 distinct new overnight roots. It includes unsupported claims, duplicates, and consequences folded under a known root; it is not a claim that all 17 were false.

## 2. Review methodology

The review used four parallel field orchestrators, each running four GPT-5.6 Luna reviewers at medium reasoning, followed by a GPT-5.6 Sol field synthesis. This report is the independent GPT-5.6 Sol final synthesis. The application baseline was frozen throughout at:

`028aaa72149c81d71b940adfcb16bd144f0df047`

No field branch was merged. Reports were read directly from their remote refs. The final synthesis challenged severe claims against the frozen source and governing documents rather than accepting them by vote. No live provider call, deployment, merge, or application change was made.

### Field metrics

| Pod       | Scope                      | Reviewers | Raw claims |             Field findings |                                                 Parallel wall time |    Exposed calls | Token metrics                  |
| --------- | -------------------------- | --------: | ---------: | -------------------------: | -----------------------------------------------------------------: | ---------------: | ------------------------------ |
| A         | Audit intake and questions |         4 |         15 |                         11 |                                                           399.59 s |               66 | 7,386,169 input; 32,095 output |
| B         | Audit core                 |         4 |         12 |                          8 |                                                           358.53 s |              105 | unavailable                    |
| C         | Product and client         |         4 |         15 |                         14 |                                                           231.59 s |               61 | unavailable                    |
| D         | Infrastructure and tests   |         4 |          9 | 5 + 1 known-root extension | not fully instrumented; two initial lanes completed in about 226 s |      unavailable | unavailable                    |
| **Total** | Whole repository           |    **16** |     **51** |      **38 field findings** |                  A–C measured pod wall time 989.71 s; D incomplete | **at least 232** | only A exposed tokens          |

Pod D had two continued reviewer sessions after brief-access/tooling problems; they were resumed rather than replaced. Its D3 continuation followed a 120-second tool timeout, and D4 runtime was not instrumented. No combined token, monetary, quota, or exact whole-review wall-clock total is invented.

### Verification evidence inherited from the fields

- Pod A: 188/188 scoped audit tests, 503/503 unit tests, `npm run check`, and 6/6 scratch boundary reproductions passed.
- Pod B: 416/416 audit tests, 30/30 scratch/adversarial tests, and the complete offline `npm run verify` passed.
- Pod C: `npm run check` passed; narrow workflow/fixture runs passed; no provider-backed E2E was run by that pod.
- Pod D: canonical `npm run verify` passed: 503/503 unit tests in 38 files, 37 + 3 + 2 = 42/42 Playwright tests, Next build, and OpenNext Cloudflare build. Its interrupted verifier run also reproduced cleanup debt.
- No test above made a Nuave AI-provider call.

## 3. Coverage statement

The baseline contains **395 tracked files**, all classified by Pod D. The four pods together covered every active production TypeScript path at least by route/import/reachability mapping, with deep review concentrated on the intake-to-report path, public product surfaces, tests, and release-critical configuration. This is not a claim that every line of every tracked file received equal review.

| Classification                      | Files | Final treatment                                                                                                                                                                                           |
| ----------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production source                   |   116 | All active `src/` paths mapped; audit routes/libraries and customer/public surfaces reviewed deeply across A/B/C; active reachability confirmed from Next routes/imports                                  |
| Active tests                        |    43 | All 37 `src/**/*.test.ts` files and all configured E2E specs/helpers inventoried or reviewed; key suites executed offline                                                                                 |
| CI/build/config/engineering context |    84 | Required product/spec context read; root manifests, Vitest, Playwright modes, CI workflow, Next/OpenNext/Cloudflare config, and offline verifier reviewed; not every prose/content file was line-reviewed |
| Active scripts                      |     8 | All tracked source scripts classified for live-call reachability; live runners were not executed                                                                                                          |
| Fixture/demo                        |    10 | Fixture journey reviewed and verified offline; `/audit/spec004` separately treated as active production reachability, not assumed safe because it is called a demo                                        |
| Archive                             |   133 | Intentionally excluded as non-authoritative; only names/reference edges were checked for active imports; no active production import was confirmed                                                        |
| Generated artifact                  |     1 | Inspected only enough to validate repository/evidence-handling claims                                                                                                                                     |
| Unknown                             |     0 | None                                                                                                                                                                                                      |

Defensible conclusion: **all active production TypeScript and release-critical configuration were covered at least for reachability and contract risk, with deep review of the complete active audit path and its tests. Static assets, binary image content, most non-runtime copy documents, and intentionally archived material were not code-reviewed.**

Material coverage gaps:

- No live OpenCode Go/provider execution was permitted, so provider behavior beyond mocked contracts remains unverified.
- Visual fidelity was inferred from source and existing E2E rather than a new exhaustive cross-browser/manual walkthrough.
- Static images and other binary assets were existence/reachability checked, not visually or forensically audited.
- Archive content was intentionally excluded; only active-reference edges were checked.
- Public policy correctness was assessed from visible placeholders/contradictions, not as legal advice.

## 4. Critical root-cause map

### R-A — Mutable identity is promoted before exact customer confirmation

```text
Source/entity normalization is not one canonical, versioned boundary
├── Instagram content URL is rewritten as account /p (OA-01)
├── client and server accept different URL sets (OA-02)
├── GBP is advertised but treated as an official website (OA-03)
├── hidden AI competitor name survives a user URL change (OA-04)
├── credential-bearing competitor URL reaches the model brief (OA-05)
├── re-extraction overwrites corrected facts (OA-06)
└── invalid competitor input disappears without a correction path (C2-07)
```

The shared correction is a canonical source/entity parser plus explicit fact-version and comparison-identity confirmation. Patching each screen independently would leave the same class of drift elsewhere.

### R-B — Exact locked questions are not the single source of truth

```text
Question text, classification, identity, and provenance can diverge
├── K-02 prompt/evidence immutable binding weakness
│   └── generation already emits positional NVA-ID-* identity
├── edited text retains stale branded metadata (AC-01)
├── generated pack can violate claimed 5/5 default (OA-07)
├── compact competitor identity bypasses slot restriction (OA-09)
├── inputs_used provenance is hard-coded (OA-10)
├── duplicate prompt IDs are rejected after execution (K-04)
└── variance route does not prove designated questions (K-06)
```

One server-owned locked-pack validator should derive classification from exact text, enforce unique IDs, and bind all downstream observations/variance inputs.

### R-C — “Completed protected observation” lacks one positive invariant

```text
Protected completion is inferred from partial/negative signals
├── K-03 successful protected-call/provenance proof is inadequate
│   └── report gate can accept wrong-stage/failed-only telemetry (KX-01)
├── citation annotation can masquerade as executed web search (AC-03)
├── returned question-generation model is not enforced (OA-11)
├── variance completeness can accept failed/malformed evidence (K-07)
└── resumed telemetry can be duplicated in accounting (K-08)
```

The invariant must positively select one completed observation-stage attempt with exact instruction, actual search call, requested/returned model match, response/attempt correspondence, and immutable prompt binding. Provider completion, resume acceptance, report acceptance, and variance validation should all call the same validator.

### R-D — Async work has no workflow generation/transaction boundary

```text
Request lifecycle and browser state commit independently
├── K-01 reset/start-over does not invalidate stale async work
├── initial run failure commits the UI to an unrecoverable run stage (C1-01)
├── failed resume clears and persists away completed evidence (C1-02)
├── late question-generation response repopulates abandoned state (C1-03)
├── disconnect does not cancel request/retry/provider work (AC-02)
└── K-05 stream parser can lose valid earlier events in a bad batch
```

Use one workflow generation/run identity, abort propagation, and commit-on-acceptance state transition. Evidence must remain durable until replacement work succeeds.

### R-E — Report/public presentation is not derived from one validated product record

```text
Correct internal data does not guarantee truthful customer output
├── live report omits observed-business evidence/evidence triad (C2-05)
├── legacy facts contradict corrected eligible measures (KX-02)
├── whitespace-normalized excerpts are labelled exact (AC-05)
├── raw provider errors cross into the customer UI (AC-04/C2-03)
├── FAQ names the wrong model and future purchase/delivery as current (C4-01)
├── policy/support routes expose unresolved placeholders (C4-02)
└── Download PDF opens print without an artifact state (C2-06)
```

The correction should not add another projection. Use one validated report/public-facts record and finite customer-safe error/status mappings.

### R-F — Green verification does not prove hermetic or complete route coverage

```text
Canonical checks are green, but their boundaries are porous
├── K-09 route tests do not reach a valid protected production path
│   └── configured E2E never posts through /api/audit/prompts
├── Playwright modes inherit ambient provider/fixture state (D-01)
├── offline E2E permits third-party /audit asset traffic (D-02/C4-03)
├── broad Vitest discovers credentialed live-provider scripts (D-03)
├── interrupted verifier leaves env/process state (D-04)
└── spec004 live-call behavior lacks no-side-effect coverage (C3-01)
```

## 5. P0 findings

None.

No immediate catastrophic security/integrity/release defect was proven. Credential-bearing URL propagation is serious, but it requires user-supplied URL userinfo and no repository credential exposure was found; it remains P1 rather than P0. The canonical release gate passed offline.

## 6. P1 findings

### Previously known roots counted here once

| ID   | Root defect                                                   | Current proof / overnight extension                                                                                                           |
| ---- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| K-01 | Stale async work survives reset/start-over                    | Pilot proved late run/report/variance writes; C1 adds separate failed-start, failed-resume, and navigation races rather than duplicating K-01 |
| K-02 | Immutable prompt/evidence binding is insufficient             | Pilot proved prompt↔observation mismatch acceptance; OA generation namespace drift shows positional identity begins earlier                   |
| K-03 | Successful protected-call/provenance proof is inadequate      | KX-01 proves the downstream report gate can accept wrong-stage, failed-only, missing-instruction, zero-search evidence                        |
| K-06 | Variance designation is not bound to the completed locked run | Pilot proved arbitrary valid prompts can be paid re-asked under an opaque run key                                                             |

### New overnight P1 roots

| ID      | Source        | Finding and realistic failure path                                                                                                             |
| ------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| N-P1-01 | OA-01         | Instagram post/reel-like paths can be normalized to the wrong account identity before extraction                                               |
| N-P1-02 | OA-04         | A hidden AI-suggested competitor name can be promoted or survive a URL edit, binding two businesses together                                   |
| N-P1-03 | OA-05         | HTTP userinfo in a competitor URL is accepted and copied into the provider-bound question brief                                                |
| N-P1-04 | OA-11         | Protected question generation accepts a missing or different returned model while claiming GPT-5.6 Luna                                        |
| N-P1-05 | AC-01         | Allowed question edits retain stale `branded` metadata, corrupting discovery/recognition denominators                                          |
| N-P1-06 | AC-02         | Browser disconnect does not cancel request-bound scheduling, backoff, or provider work; resume may overlap abandoned work                      |
| N-P1-07 | AC-03         | Citation-only output can pass the required-search check with `web_search_calls: 0`                                                             |
| N-P1-08 | AC-04 + C2-03 | Raw provider/transport error messages are streamed and rendered to customers; duplicate field claims merged                                    |
| N-P1-09 | C1-01         | Initial run POST failure leaves `executionStarted=true` and strands the persisted workflow without run retry                                   |
| N-P1-10 | C1-02         | Failed resume clears completed observations before request acceptance and persists the empty state                                             |
| N-P1-11 | C1-03         | A late question-generation response can restore a pack after the user left the facts state                                                     |
| N-P1-12 | C2-05         | Live `ReportView` drops `observed_competitors` and does not render the required observation/interpretation/action evidence structure           |
| N-P1-13 | C4-01         | Active FAQ names GPT-4o and describes payment/email/private delivery that the active product does not implement                                |
| N-P1-14 | C4-02         | Active Terms/Privacy/FAQ/Support routes expose unresolved operator, date, provider, price, payment, delivery, access, and support placeholders |

## 7. P2 findings

### Previously known roots counted here once

| ID   | Root defect                                       | Current consequence                                                                 |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| K-04 | Duplicate prompt IDs rejected too late            | Paid execution can reach `run_completed` before report rejection                    |
| K-05 | Stream batch parser can drop earlier valid events | A valid event followed by malformed NDJSON in one chunk is lost to the caller       |
| K-07 | Variance completeness robustness weakness         | Failed/unusable or wrong-method variance evidence can appear complete               |
| K-08 | Duplicate telemetry attempts                      | Resumed observation telemetry can be counted twice in report/variance ledgers       |
| K-09 | Route tests do not reach a valid production path  | E2E also stops before `/api/audit/prompts`, leaving protected route wiring unproven |

### New overnight P2 roots

| ID      | Source       | Finding                                                                                                                                                                            |
| ------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-P2-01 | OA-02        | Client and server disagree on valid explicit HTTP(S) URLs; the UI enables submissions the route rejects                                                                            |
| N-P2-02 | OA-03        | Google Business Profile is advertised without a parser/provenance/extraction contract                                                                                              |
| N-P2-03 | OA-06        | Re-extraction silently overwrites customer-edited business facts                                                                                                                   |
| N-P2-04 | OA-07        | Generated suggestions can violate the advertised default five/five composition                                                                                                     |
| N-P2-05 | OA-08        | Clearly non-Indonesian output can be accepted and stamped `id-ID`; human review limits severity                                                                                    |
| N-P2-06 | OA-09        | Compact/punctuation competitor identity can leak outside the designated comparison slot                                                                                            |
| N-P2-07 | OA-10        | `inputs_used` is hard-coded and inaccurate for every live generated question                                                                                                       |
| N-P2-08 | AC-05        | Whitespace-mutated text can pass an “exact excerpt” guard and be exported as verbatim                                                                                              |
| N-P2-09 | KX-02        | Correct eligible measures coexist with contradictory broad legacy `facts` denominators                                                                                             |
| N-P2-10 | C3-01        | `/audit/spec004` is a built, reachable preview that performs live extraction calls; downgraded because ungated direct-link exposure is explicitly accepted pending Spec 006 Wave 2 |
| N-P2-11 | C2-06        | **Download PDF** invokes `window.print()` without a PDF artifact/readiness contract                                                                                                |
| N-P2-12 | C2-07        | Invalid similar-business input disappears on blur without validation feedback                                                                                                      |
| N-P2-13 | C4-03 + D-02 | `/audit` loads an unrelated third-party hero asset, and offline E2E neither blocks nor asserts it; duplicate merged                                                                |
| N-P2-14 | C4-04        | Closed mobile navigation remains keyboard-focusable and lacks disclosure semantics                                                                                                 |
| N-P2-15 | D-01         | Playwright modes inherit ambient fixture/provider variables and are not deterministically isolated                                                                                 |
| N-P2-16 | D-03         | Root Vitest discovery includes credentialed live-provider runner specs; a broad familiar command can make paid calls                                                               |
| N-P2-17 | D-04         | Forced interruption of `npm run verify` can leave `.env.production.local` overwritten and Next processes listening                                                                 |

## 8. P3 findings

| ID      | Source | Finding                                                                                                                                                           |
| ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-P3-01 | AC-06  | Nested evidence strings/collections lack method-derived size bounds; current platform/direct-link posture limits immediate risk                                   |
| N-P3-02 | D-05   | A generated evaluation JSON described as local-only is tracked with unnecessary public contact and provider metadata; no secret/private customer record was found |

## 9. Known pilot findings still applicable

All 10 pilot roots remain applicable at the frozen baseline. They are classified once in this report:

| ID   | Classification | Status in synthesis                                                                                     |
| ---- | -------------- | ------------------------------------------------------------------------------------------------------- |
| K-01 | P1             | Open; overnight client failures are additional consequences, not five new reset roots                   |
| K-02 | P1             | Open; OA generation identity drift is an extension                                                      |
| K-03 | P1             | Open; KX-01 is the concrete downstream report-gate bypass                                               |
| K-04 | P2             | Open                                                                                                    |
| K-05 | P2             | Open                                                                                                    |
| K-06 | P1             | Open                                                                                                    |
| K-07 | P2             | Open                                                                                                    |
| K-08 | P2             | Open                                                                                                    |
| K-09 | P2             | Open; prompts-route E2E omission is an extension                                                        |
| K-10 | Future         | Valid need for durable cross-tab/server idempotency, intentionally outside current Phase 3 architecture |

The pilot’s missing cumulative cross-question budget regression is carried under K-09’s test-program correction rather than added as an eleventh root.

## 10. Future-scope / accepted limitations

| ID   | Classification               | Rationale                                                                                                                                                                                                                                                                                                                       |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K-10 | Future                       | Durable jobs, cross-tab ownership, and server idempotency belong to later durable-delivery architecture. Current cancellation and state-integrity defects remain fixable without implementing that architecture.                                                                                                                |
| F-01 | Accepted deferred limitation | The live `/audit` shell remains extensively English and declares `lang="en"`. The Indonesian product decision supersedes English, but `docs/NOW.md` and approved Spec 006 explicitly defer P2–P7 localization/polish until after the report-quality gate. It is a real known gap, not a new P1 blocker invented by this review. |

Interim ungated exposure itself is not counted as a finding: the founder explicitly accepted it on 2026-08-20 while the site remains noindex/direct-link-only, with a server rate/cost guard mandatory before public sharing. The specific `/audit/spec004` live-call side effect remains P2 because Spec 006 explicitly requires it to stop.

## 11. Rejected, downgraded and duplicate claims

### Final-synthesis rejections or downgrades

- **C2-01 rejected.** The source proves one click on an explicit **Run the audit** action starts execution. Product contracts require approved questions and explicit atomic acceptance, but they do not require a second confirmation dialog. The fixture’s dialog is an implementation pattern, not sufficient proof of a mandatory second boundary.
- **C2-04 P1 → accepted deferred limitation.** Indonesian customer surfaces are required, but the exact remaining live-shell work is disclosed and sequenced in approved Spec 006 Wave 2 after the report-quality gate.
- **C3-01 P1 → P2.** The live-call demo is real and violates Spec 006 R-43, but current direct-link ungated exposure was founder-accepted and the route is not part of the canonical customer path.
- **AC-04/C2-03 merged.** Both describe the same raw-error-to-UI path.
- **C4-03/D-02 merged.** Both describe the same third-party `/audit` hero request and missing offline assertion.
- **KX-01 merged under K-03.** It is important new proof of the known provenance root, not another P1 count.
- **OA K-02 extension and D K-09 extension not counted separately.** They change correction scope and tests, not root totals.

### Important field-level skepticism retained

- Rejected unsupported fast-Enter/double-extraction race.
- Rejected broad SSRF framing where only client/server parity was proven.
- Rejected server-owned evidence/run authenticity as a Phase 3 requirement; the narrower current binding/provenance bypasses remain.
- Rejected generic contract-versioning, GitHub Action tag, Node-version, archive-existence, and literal-`npm run verify` CI complaints without an active failure path.
- Rejected paid-provider calls from configured Playwright: reached provider-capable routes are intercepted; the third-party image is not an AI-provider call.
- Rejected background execution as a current requirement; request cancellation is retained separately as a current P1.
- Downgraded generated five/five composition and language stamping because the customer/founder review gate limits immediate execution impact.
- Downgraded tracked evaluation output because it contains public-business data/provider metadata rather than secrets or private customer records.

Across all layers, **17 of 51 raw claims did not survive as independent new roots**. Seven field-reported material downgrades plus two additional final-synthesis downgrades were applied. A uniform “hard false-positive count” cannot be reconstructed without inventing one because Pod D reports overlapping dispositions rather than a one-to-one raw ledger.

## 12. Cross-subsystem interactions

1. **Wrong source identity × hidden comparison identity × immutable-binding weakness.** A malformed Instagram source or stale competitor pair can generate the wrong question; K-02 then allows downstream evidence to remain attached by familiar ID. Correct report arithmetic would still describe the wrong business.
2. **Stale `branded` metadata × legacy denominators.** AC-01 can partition the run incorrectly, while KX-02 exposes a second contradictory denominator projection. Together they can make both the main and exported explanation disagree about discovery versus recognition.
3. **Citation-only search bypass × weak positive attempt gate.** AC-03 can mark an observation grounded with zero actual search; K-03/KX-01 can then admit that evidence to the report. Two boundary weaknesses combine into a customer-facing false method claim.
4. **Disconnect without cancellation × failed-resume deletion.** AC-02 allows abandoned paid work to continue, while C1-02 deletes the browser’s completed evidence before resume succeeds. The same question may continue invisibly and later be rerun because the surviving client lost its recovery source.
5. **Initial run commit-before-acceptance × stream batch loss.** C1-01 strands the UI when no stream starts; K-05 can discard valid early events when a later line is malformed. Both paths present as “run started but no recoverable progress,” complicating safe retry.
6. **Ambient E2E environment × broad live-test discovery.** D-01 can start a browser server in the wrong mode; D-03 allows a conventional broad test command to discover real provider runners when credentials are present. A future test expansion could turn a false-confidence problem into actual spend.
7. **External hero traffic × no external-host assertion.** The current offline gate is green while `/audit` makes a third-party request. This weakens the meaning of “offline” and allows future external dependencies to enter unnoticed.
8. **Public misinformation × unresolved policy placeholders.** The FAQ asserts a purchase/delivery flow that does not exist while linked policy pages cannot state complete terms. Together they create a more serious trust failure than either copy defect alone.
9. **Report evidence omission × print-as-download.** Even if browser print produces a PDF, it reproduces the live view that omits observed-business evidence. The artifact path can therefore preserve and distribute an incomplete report consistently.

## 13. Test and verification gaps

### Missing tests

- Shared adversarial source corpus across landing parser, audit parser, and server normalization: Instagram reserved/content paths, userinfo, local/reserved hosts, GBP/Maps forms.
- AI comparison-name/URL edit and explicit exact-entity confirmation.
- Final edited-question classification, unique IDs, truthful `inputs_used`, and compact competitor identity.
- Positive completed-attempt invariant across resume, report, and variance.
- Initial run failure, failed resume persistence, pending prompt generation navigation, and late responses after reset.
- Live `ReportView` rendering of observed businesses, evidence triad, eligible measures, exact excerpts, and artifact actions.
- Public page rejection of unresolved placeholders/model/flow claims.
- Mobile closed-menu keyboard traversal.

### Weak tests

- Existing search enforcement rejects no-search only when citations are also absent; it does not require a real `web_search_call`.
- Exact-excerpt coverage rejects semantic rewrites but not whitespace mutation.
- Generation tests cover a good five/five fixture, not adversarial 0/10, 4/6, or 10/0 output.
- Playwright mode tests assume a clean ambient environment rather than asserting sanitized variables.
- Current no-side-effect helper applies to fixture paths, not every E2E surface intended to be offline.

### Unreachable test branches

- K-09: current route-contract tests stop at stale/missing client-contract rejection and do not reach valid protected production wiring.
- Configured E2E reaches extraction but does not POST through `/api/audit/prompts`; later tests seed a prepared prompt pack.
- Root Vitest discovery is unsafe to use as a “whole suite” check because it includes live runners; canonical npm scripts are intentionally path-limited.

### E2E gaps

- Fully stubbed landing/source → facts confirmation → `/api/audit/prompts` → question review → accepted run boundary.
- Reset/cancel during run, report, and variance with delayed old responses.
- Failed resume that must retain completed observations.
- Live report evidence rendering and print/download fact parity.
- `/audit/spec004` no-provider/no-side-effect assertion.
- External-host allowlist on `/audit` and other offline browser suites.

### CI gaps

- Sanitize/allowlist browser-server environment rather than inheriting ambient credentials and fixture flags.
- Exclude `scripts/**` live runners from root Vitest discovery and require explicit founder-authorized opt-in.
- Make offline verifier signal/process-group safe.
- CI currently executes equivalent release-critical checks and passed; absence of the literal `npm run verify` command is not itself a defect.

## 14. Recommended implementation program

### P0 Immediate

None.

### P1-A shared invariant fixes

#### 1. Canonical locked identity and question-pack boundary

- **Findings resolved:** K-02, K-04, K-06, N-P1-02, N-P1-03, N-P1-05, and parts of N-P2-04/06/07.
- **Likely files:** `src/lib/audit/source-input.ts`, `website-input.ts`, `similar-businesses.ts`, `questions-id.ts`, `questions-id-live.ts`, `types.ts`, `src/app/api/audit/prompts/route.ts`, `run/route.ts`, `variance/route.ts`, `AuditWorkflow.tsx`.
- **Dependency/order:** define canonical normalized entity + immutable question-pack record first; then make routes derive/verify classification and unique IDs; then update client display/provenance.
- **Independent verification:** adversarial route tests with mismatched question/category/branded fields, duplicate IDs, changed competitor source/name, and arbitrary variance prompts. Zero provider calls.

#### 2. Positive protected-attempt invariant

- **Findings resolved:** K-03, K-07, N-P1-04, N-P1-07, and KX-01; supports K-08.
- **Likely files:** `src/lib/audit/production-observation-method.ts`, `openai.ts`, `questions-id-provider.ts`, `report-pipeline.ts`, `variance.ts`, route tests.
- **Dependency/order:** define selected completed attempt and actual-search predicate; apply at provider completion, resume, report, and variance; enforce returned model on question generation separately but with the same provenance semantics.
- **Independent verification:** failed-only, wrong-stage, missing-instruction, citation-only, zero-search, missing/mismatched response ID, and wrong/missing returned-model cases all fail before synthesis/variance completion.

#### 3. Workflow generation, cancellation, and transactional state

- **Findings resolved:** K-01, K-05, N-P1-06, N-P1-09, N-P1-10, N-P1-11.
- **Likely files:** `AuditWorkflow.tsx`, `stream.ts`, `run/route.ts`, `run-orchestrator.ts`, `retry.ts`, `openai.ts`, workflow/E2E tests.
- **Dependency/order:** add workflow/run generation ID and abort propagation; commit run stage only after acceptance; preserve resume snapshot until success; make parser deliver valid prior events before terminal parse error.
- **Independent verification:** controlled delayed fetch/NDJSON tests; reset/navigation/abort before terminal events; assert no stale state, no duplicate scheduling, and preserved completed observations.

### P1-B subsystem fixes

#### 4. Intake/entity correction path

- **Findings resolved:** N-P1-01, N-P2-01/02/03/12.
- **Likely files:** source parsers/tests, `SourceHero.tsx`, `SimilarBusinessesEditor.tsx`, `AuditWorkflow.tsx`, extraction route tests.
- **Dependency/order:** after canonical identity boundary; update UI to use the shared policy and explicit draft-version replacement.
- **Independent verification:** one corpus runs through both clients and server; edit → back → re-extract retains or explicitly replaces corrections.

#### 5. Report and public-truth projection

- **Findings resolved:** N-P1-08, N-P1-12/13/14, N-P2-08/09/11.
- **Likely files:** `ReportView.tsx`, `contracts.ts`, `report-pipeline.ts`, `AuditRunStep.tsx`, telemetry/error mapping, `faq/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `support/page.tsx`.
- **Dependency/order:** validated report/evidence source first; then renderer; then public page truth/pre-launch states. Do not invent unresolved legal/commercial values.
- **Independent verification:** component/render or browser assertions against frozen report data; public route placeholder/model/current-flow checks; raw diagnostics remain restricted.

### P2 hardening

1. Enforce default generated composition/language and truthful slot provenance while keeping user-edit freedom.
2. Neutralize/remove `/audit/spec004` live calls and self-host the `/audit` hero asset.
3. Make mobile menu keyboard semantics correct.
4. Sanitize Playwright environments and extend external-host assertions.
5. Exclude live runners from root Vitest; add explicit positive opt-in commands.
6. Make `verify-offline.mjs` signal-safe and child-process-group safe.
7. Add method-derived payload bounds.

Each group should have a disjoint-file owner and an independent reviewer running `npm run verify`; no live provider call is required.

### P3 cleanup

1. Remove/sanitize the tracked raw evaluation artifact and ignore its generated results directory, preserving only the minimized review record.
2. Finish nested evidence-size limits if not completed under P2 hardening.

## 15. Suggested implementation-agent decomposition

Use staged, disjoint ownership rather than another 4×4 all-at-once swarm.

### Wave 1 — shared contracts (three implementation agents)

1. **Identity/question-pack agent:** canonical source/entity validation, competitor confirmation, immutable pack, unique IDs/classification.
2. **Protected-attempt agent:** positive observation/search/model/response invariant across run/report/variance.
3. **Workflow-lifecycle agent:** generation IDs, abort propagation, transactional start/resume, incremental parser.

Run one independent validation agent after Wave 1 to challenge all three boundaries with scratch/route tests. Do not let the validation agent edit implementation files.

### Wave 2 — subsystem consumers (four implementation agents)

4. **Intake/facts UI agent:** source hero, re-extraction, similar-business editor.
5. **Report/error UI agent:** evidence rendering, safe customer errors, exact excerpt/denominator source of truth.
6. **Public truth/accessibility agent:** FAQ/policy pre-launch truth and mobile menu semantics.
7. **Test/CI isolation agent:** Playwright environment, external-host guard, live-runner discovery, verifier cleanup, spec004 neutralization.

### Wave 3 — independent verification (two agents, then orchestrator)

8. **Adversarial contract validator:** routes/library invariants and known pilot regressions.
9. **Browser/release validator:** fully stubbed live path, recovery races, public surfaces, and canonical offline gate.

The final orchestrator should rerun `npm run verify`, inspect the complete diff, and reconcile finding IDs to tests. No agent should implement K-10 durable architecture inside this program unless a later approved spec explicitly opens Phase 4.

## 16. Review-system evaluation

### Useful unique findings per pod

| Pod | Unique new roots after final synthesis | Shared/extension value                                              | Assessment                                                                                                              |
| --- | -------------------------------------: | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A   |                                     11 | K-02 generation extension                                           | Highest unique yield; the four intake/question lanes were well partitioned                                              |
| B   |                                      6 | Raw-error duplicate with C; K-03 extension; denominator consequence | Strong integrity work, but three lanes converged on the same provenance gate                                            |
| C   |                                     11 | Raw-error duplicate with B; external-asset duplicate with D         | Highest product-path yield; one severe dialog claim was ultimately unsupported                                          |
| D   |                                      4 | External-asset duplicate with C; K-09 extension                     | Valuable release-system proof and full-tree classification; lower unique defect yield but essential coverage confidence |

There were 32 pod-unique new roots plus two cross-pod shared roots = 34 final new root records.

### Duplication and rejection rates

- Raw-to-new-root yield: **34/51 = 66.7%**.
- Raw claims not surviving as independent new roots: **17/51 = 33.3%**.
- The 33.3% is a combined duplicate/rejection/known-extension rate, not a pure false-positive rate.
- At least nine material severity downgrades occurred: seven in field synthesis and two more here.
- A strict hard-rejection percentage is unavailable because Pod D did not expose a one-to-one raw-candidate ledger; no number is fabricated.

### Topology judgment

The 4×4 topology was **appropriate for a first whole-repository baseline**, because it found high-value defects in every customer stage and gave independent convergence on the protected-attempt root. It is excessive for repeat review of the same baseline: B’s provenance lanes overlapped heavily, and D needed broad classification more than four independent defect hunters.

For future Nuave whole-repo reviews, use **three workers per bounded pod (about 12 workers total)**: request/method boundary, client/core behavior, and adversarial tests. Add at most one targeted validator only for a disputed P0/P1 or unclear reachability. Keep a separate single infra/classification lane rather than a full four-person infra pod unless release config changed materially.

### Quota/tool/runtime observations

- 16 Luna reviewers completed across four pods.
- At least 232 exposed worker API/tool calls are available from A–C; D did not expose a compatible total.
- Only Pod A exposed token totals: 7,386,169 input and 32,095 output.
- Measured pod wall times: A 399.59 s, B 358.53 s, C 231.59 s. Pod D was only partially instrumented.
- No task-scoped monetary/quota delta is available. Provider cost reported by review workers is not Nuave audit-provider spend.
- No additional Luna validator was spawned for this final synthesis; disputed claims were resolvable from frozen source and governing product decisions.
