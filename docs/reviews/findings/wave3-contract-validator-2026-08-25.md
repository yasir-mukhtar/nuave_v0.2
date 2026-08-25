# Wave 3 Contract Validator — Independent Review

Date: 2026-08-25

## Verdict

**BLOCK**

Frozen target reviewed: `2a6d847a6ffbb7fd628e3620c1e34b4852c0e6d4`

This was a review-only pass. No application, test, config, workflow, deployment, or provider behavior was modified or invoked.

## Review lane and independence mechanism

Reviewer A was run as the contract/data-integrity lane and inspected the frozen implementation itself rather than accepting the Wave 2 implementation report. The available ChatGPT/GitHub harness does not expose a separately spawned subagent or a genuinely isolated model context. Reviewer B was therefore not given this report during its initial browser/release checklist, but literal context-level independence cannot be claimed. The orchestrator must account for that process limitation in final synthesis.

## Scope challenged

The pass challenged source identity, customer-owned facts, generated/final question integrity, Wave 1 locked/protected invariants, report evidence truth, customer-safe errors, evidence export, and the audit route boundaries.

Key implementation boundaries inspected included:

- `src/lib/audit/source-input.ts`
- `src/lib/audit/website-input.ts`
- `src/lib/audit/similar-businesses.ts`
- `src/lib/audit/questions-id.ts`
- `src/lib/audit/questions-id-live.ts`
- `src/lib/audit/question-suggestion-guards.ts`
- `src/lib/audit/locked-question-pack.ts`
- `src/lib/audit/production-observation-method.ts`
- `src/lib/audit/report-pipeline.ts`
- `src/lib/audit/report-excerpt.ts`
- `src/lib/audit/customer-error.ts`
- `src/lib/audit/customer-evidence-export.ts`
- `/api/audit/extract`, `/prompts`, `/run`, `/report`, `/variance`
- `src/app/audit/AuditWorkflow.tsx`
- relevant permanent Wave 1/Wave 2 tests

The review brief named `src/lib/audit/protected-observation-method.ts`; that production file does not exist at the frozen head. The protected-attempt implementation is in `production-observation-method.ts`; this stale path name is not itself a defect.

## Accepted blocking findings

### A-1 — P2 — Unsupported Google Maps intake can still be accepted as a website

**Relation:** `N-P2-02` — reopened

**Exact boundary:** `src/lib/audit/source-input.ts` — `isGoogleBusinessOrMapsUrl()` / `parseSourceInput()`

**Failure scenario**

The product truth says primary intake supports an official website or Instagram profile, and explicitly does not support Google Business Profile/Google Maps. The canonical parser rejects several known Maps forms, but its Google-host test only recognizes `google.com` / `google.co.id` hosts when the pathname begins with `/maps`.

Consequently, valid Google Maps forms such as:

- `https://maps.google.com/?q=Kopi+Taman+Senja`
- a regional Google Maps URL outside the hard-coded `.com` / `.co.id` host families, for example `https://www.google.co.uk/maps/place/...`

can fall through to the generic public-website branch and become `sourceType: "website"`.

That makes the canonical parser disagree with the current public intake contract even though client and server both share the same parser.

**Why existing tests missed it**

`source-input.test.ts` covers `maps.app.goo.gl`, `g.page`, `www.google.com/maps/...`, and `www.google.co.id/maps/...`, but not the `maps.google.com` query/root form or other Google ccTLD Maps URLs.

**Minimal reproduction**

Call `parseSourceInput("https://maps.google.com/?q=Kopi+Taman+Senja")`. The expected current-contract result is `null`; the frozen implementation can return a website source instead because the pathname is `/` rather than `/maps...`.

**Zero-provider regression feasible:** yes. A pure parser unit test is sufficient.

**Impact / severity rationale**

This is a real intake-contract defect, but it does not bypass protected observation integrity or cause catastrophic release/data damage. P2 is appropriate.

---

### A-2 — P2 — A materially non-Indonesian generated pack can still be stamped `id-ID`

**Relation:** `N-P2-05` — reopened

**Exact boundary:** `src/lib/audit/question-suggestion-guards.ts` — `generatedSuggestionGuardIssues()` / `clearlyEnglishQuestion()`

**Failure scenario**

The Wave 2 generated-language guard only emits `clearly_non_indonesian_output` when at least **8 of 10** questions are independently classified as clearly English.

A generated pack with **7 clearly English questions and 3 Indonesian questions** therefore avoids the whole-pack language guard. If it retains the required default 5/5 branded composition and satisfies the other mechanical/grounding rules, `buildLiveIndonesianPromptPack()` may accept it as model output while the returned pack continues to declare `language: "id-ID"`.

A concrete pack can keep slots 1–5 unbranded, slots 6–10 branded, use business/category/location grounding terms in every English question, make slots 1–7 clearly English, and slots 8–10 Indonesian. The composition guard passes and the language threshold is not reached.

**Why existing tests missed it**

`question-suggestion-wave2.test.ts` proves rejection of a 10/10 English pack, but does not test the boundary immediately below the hard-coded threshold.

**Minimal reproduction**

Pass a 10-question 5/5 candidate to `generatedSuggestionGuardIssues()` where seven questions satisfy `clearlyEnglishQuestion()` and three are Indonesian. The frozen guard does not include `clearly_non_indonesian_output`.

**Zero-provider regression feasible:** yes. This is a pure suggestion-guard unit test; a provider stub can also prove the live builder fallback path without network access.

**Impact / severity rationale**

The customer can review/edit questions before execution, so this is not a P1 protected-method integrity failure. It is nevertheless a real product correctness defect against the Indonesian default-pack contract. P2 is appropriate.

---

### A-3 — P2 — Compact competitor identity is not enforced at the final edited-pack boundary

**Relation:** `N-P2-06` — reopened

**Exact boundary:** `src/lib/audit/questions-id.ts` — `validateIndonesianQuestionPack()` competitor leakage check; downstream `/api/audit/run` validation

**Failure scenario**

Wave 2 added a strong compact/punctuation competitor check to the **generated suggestion** guard. The final server validation after customer edits, however, still uses the older token-spaced comparison:

`normalizeId(question)` must contain the spaced `normalizeId(competitor name)`.

For comparison business `Kopi Pesaing`, punctuation forms such as `Kopi-Pesaing` normalize back to a spaced match, but the compact form `KopiPesaing` does not. A customer-edited non-comparison slot such as:

`Ada rekomendasi kedai kopi seperti KopiPesaing di Depok?`

can remain grounded/executable and bypass the final competitor-leakage rule outside slot 6. `/api/audit/run` calls the base final-pack validator and blocker list, not the generated-suggestion-only compact guard.

**Why existing tests missed it**

The Wave 2 regression demonstrates compact/punctuation leakage at the generated-suggestion guard, but does not prove the same invariant after an allowed customer edit and at the final run boundary.

**Minimal reproduction**

Create a brief with comparison business `Kopi Pesaing`, edit slot 1 to contain `KopiPesaing`, then call `validateIndonesianQuestionPack()` (or the offline `/api/audit/run` pre-provider boundary). The expected current rule is a competitor-leakage rejection; the compact form can pass.

**Zero-provider regression feasible:** yes. A pure unit test and/or route preflight test can fail before credentials/provider execution.

**Impact / severity rationale**

This violates question-composition safety but does not falsify completed protected observations or report evidence after execution. P2 is appropriate.

## Challenged areas that remain supported

### Source identity, other than A-1

The client website adapter and server extraction route use the shared canonical parser. Instagram profile URLs canonicalize to the account identity; `/p/`, `/reel/`, `/reels/`, `/stories/`, deeper profile paths, credentials, non-HTTP(S) protocols, malformed/unsafe hosts, and the specifically enumerated unsupported Google Maps forms fail closed.

`N-P1-01` and the original client/server split root of `N-P2-01` remain resolved.

### Customer-owned facts

`AuditWorkflow` persists `factsCustomerOwned`; customer edits/confirmation mark the brief customer-owned; later extraction can update extraction evidence/suggestions without silently replacing the confirmed/customer-owned brief. Downstream prompt/run/report/variance state is invalidated on fact changes through the retained Wave 1 operation-generation boundary.

`N-P2-03` remains supported as resolved for the reviewed architecture.

### Generated default composition and provenance

Default model suggestions are checked for the intended five unbranded/five branded composition, unsafe slots are repaired/fallbacked before display, and the produced prompt records truthfully use `inputs_used: ["confirmed_business_facts"]`. Customer edits are intentionally free to change the final 5/5 balance. `N-P2-04` and `N-P2-07` remain resolved; A-2/A-3 are narrower missing adversarial cases.

### Wave 1 protected invariants

The frozen code still positively enforces:

- exactly ten canonical ordered prompt identities;
- unique non-empty IDs before execution;
- code-owned slot category;
- exact final question binding;
- branded/unbranded derived from exact final text;
- exact observation/question/category/classification correspondence;
- completed observation-stage attempt proof;
- requested/returned GPT-5.6 Luna match;
- response-ID ownership/correspondence;
- actual `web_search_call > 0`;
- exact completed 10/10 report proof;
- exact designated variance subset;
- request cancellation through run/variance orchestration;
- workflow-generation invalidation;
- transactional start/resume preservation;
- valid NDJSON-prefix semantics.

No Wave 1 P1 regression was found.

### Report truth and exact excerpts

The report pipeline canonicalizes the locked pack, requires ten evaluable protected observations, rejects evidence mismatch, requires exact answer excerpts to be literal substrings of raw answers before normalization, and validates report evidence before rendering. `ReportView` uses validated `report.measures`, renders observed competitors with prompt references, and shows finding evidence → interpretation → matched action. No reproducible current P1/P2 report-truth regression was accepted.

### Customer error boundary

Customer-facing workflow errors are mapped through finite stage/code messages. Raw report/variance/transport diagnostics remain available in internal response/telemetry/state records, but the reviewed customer UI paths do not directly render them. `AuditRunStep` does not render the raw `runUnfinished.message` field. No N-P1-08 regression was accepted.

### Customer evidence export

The actual UI download path calls `makeCustomerEvidenceExport()`. The projection removes report legacy `facts`, legacy `counts`, operational telemetry, observation `failure_reason`, and observation call telemetry while retaining observable prompt/answer/source/report evidence. No export leak or destructive over-stripping defect was accepted.

## Rejected / downgraded claims

- Missing `src/lib/audit/protected-observation-method.ts`: stale review-path reference; the live invariant is implemented in `production-observation-method.ts`.
- Raw API error bodies existing internally: not a customer leak without a rendered path; the reviewed UI applies the finite customer mapping.
- Legacy `report.counts.failed` referenced by one report line: no current denominator contradiction was reproduced because report creation itself requires ten completed/evaluable observations.
- K-10 durable cross-tab/server-state architecture: valid future limitation, explicitly outside Wave 3 blocking scope.

## Reviewer A final assessment

- P0: 0
- P1: 0
- P2: 3
- P3: 0
- Future: 0 in this lane

**Reviewer A verdict: BLOCK**

The three P2 findings are current-scope, reproducible at offline boundaries, and each admits permanent zero-provider regression coverage. No fix was performed.