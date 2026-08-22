# Overnight Review A — Audit Intake & Questions

## 1. Executive summary

**Verdict: FAIL**

| Severity | Count |
| -------- | ----: |
| P0       |     0 |
| P1       |     4 |
| P2       |     7 |
| P3       |     0 |

The frozen intake-to-question path is not yet safe to rely on without correction. The highest-risk themes are:

1. **Source identity can change before extraction.** A submitted Instagram post URL is normalized to the unrelated account-like URL `https://instagram.com/p`.
2. **Comparison-business identity and provenance can be wrong or unconfirmed.** AI-suggested names are hidden from the editor, promoted into the confirmed comparison field, and can survive a URL edit that points to another business.
3. **Credential-bearing competitor URLs can cross the provider boundary.** URL userinfo is accepted and copied into the minimized question-generation brief.
4. **The protected question path verifies only the requested model, not the returned model.** A different or missing returned model is accepted as a successful GPT-5.6 Luna generation.

No P0 was verified. Three raw claims were rejected as unsupported, already accepted/documented exposure, or lacking a demonstrated active consequence. Two accepted raw P1 claims were downgraded to P2 after accounting for the mandatory human question-review gate.

## 2. Scope and baseline

- **Frozen SHA:** `028aaa72149c81d71b940adfcb16bd144f0df047`
- **Branch:** `review/overnight-a-audit-input`
- **Isolated worktree:** `/Users/yasir/nuave-review-a`
- **Initial `git rev-parse HEAD`:** `028aaa72149c81d71b940adfcb16bd144f0df047`
- **Initial `git status --short`:** empty
- **Initial `git diff --stat 028aaa72149c81d71b940adfcb16bd144f0df047`:** empty

Review scope was limited to the active production intake, extraction, business-facts, similar-business, Indonesian question-generation, and protected question-provider path named in the field brief.

Excluded:

- audit-run, report, and variance defects except where needed to prove intake/question reachability;
- K-01 through K-10 as new findings;
- Phase 4/5 durable architecture;
- archived prototypes and `archive/`;
- fixture/demo paths as production evidence;
- live or paid provider calls;
- deployment, merge, application/test/config edits, and fixes.

## 3. Execution metrics

- **Four reviewers actually parallel:** yes. All four were dispatched in one Hermes batch before any completed.
- **Orchestrator:** GPT-5.6 Sol, medium reasoning.
- **Workers:** GPT-5.6 Luna, medium reasoning.
- **Parallel batch wall time:** 399.59 seconds.

| Reviewer  | Lane                                           | Wall time | Exposed tool/API calls |  Input tokens | Output tokens |
| --------- | ---------------------------------------------- | --------: | ---------------------: | ------------: | ------------: |
| A1        | Source input + extraction                      |  187.15 s |                     14 |     1,233,782 |         7,981 |
| A2        | Business facts + similar businesses            |  399.45 s |                     25 |     3,372,899 |         9,283 |
| A3        | Question contract + generation                 |  205.10 s |                     15 |     1,644,289 |         8,178 |
| A4        | Provider preparation + protected question path |  157.76 s |                     12 |     1,135,199 |         6,653 |
| **Total** |                                                |           |                 **66** | **7,386,169** |    **32,095** |

Hermes exposed worker model, duration, tool/API-call count, and token counts. Worker monetary cost was reported as USD 0.00 with status `included`. No Nuave provider call was made. The token figures include worker context/tool traffic and should not be interpreted as Nuave audit-provider usage.

## 4. Verified findings

### OA-01 — Instagram post URLs are rewritten to the wrong source

- **Severity:** P1
- **Confidence:** HIGH
- **Scope:** Source parsing and extraction identity
- **Files:** `src/lib/audit/source-input.ts:27-53`, `src/app/audit/SourceHero.tsx:84-98`, `src/app/audit/AuditWorkflow.tsx:577-605`, `src/app/api/audit/extract/route.ts:54-75`
- **Finding:** Instagram parsing accepts arbitrary paths and treats the first path segment as an account handle. `https://instagram.com/p/ABC123/` becomes `https://instagram.com/p`.
- **Evidence:** `parseSourceInput()` takes the first non-empty pathname segment without validating the handle grammar or rejecting reserved Instagram paths such as `p`, `reel`, `stories`, `explore`, and `accounts`. The normalized value flows through `SourceHero.onExtract`, `AuditWorkflow.extractWebsite()`, and the active extraction route.
- **Active reachability:** The production landing and `/audit` both render `SourceHero`; both can reach `POST /api/audit/extract`.
- **Failure scenario:** A user pastes an Instagram post URL. Nuave submits `/p` as if it were the intended account and can draft facts for an unrelated source.
- **Why it matters:** This changes source identity and provenance before human fact confirmation. The customer can believe a draft came from the submitted account when it did not.
- **Existing coverage:** `source-input.test.ts` covers normal account paths and an absent handle, but not post/reel/story/explore URLs, reserved paths, encoded invalid handles, or multi-segment paths.
- **Scratch reproduction:** The offline scratch suite asserted the exact rewrite and passed. No provider call was made.
- **Known-root relationship:** None; new intake-boundary defect.
- **Recommended correction:** Accept only canonical Instagram profile paths whose first segment passes the handle grammar; reject reserved and multi-segment content paths. Add one shared adversarial corpus for landing, audit, and server validation.

### OA-02 — Client and server disagree on which full URLs are usable

- **Severity:** P2
- **Confidence:** HIGH
- **Scope:** Client/server input contract
- **Files:** `src/lib/audit/source-input.ts:27-53`, `src/lib/audit/website-input.ts:28-53`, `src/app/audit/SourceHero.tsx:39-40,84-98`, `src/app/api/audit/extract/route.ts:54-75`
- **Finding:** The hero accepts any syntactically parseable explicit HTTP(S) URL, while the server rejects credentials and single-label/local-looking hosts.
- **Evidence:** `parseSourceInput()` skips `hasPlausibleDomain()` whenever a scheme is present. `normalizeWebsiteInput()` separately rejects credentials and hostnames that do not satisfy its public-host shape.
- **Active reachability:** Both active hero instances use only `parseSourceInput()` for their usable state; the server rejects later before provider work.
- **Failure scenario:** `https://localhost/path` enables submission in the hero and then fails at the route.
- **Why it matters:** The interface reports a value as usable even though the actual boundary rejects it, and two security policies must be audited independently.
- **Existing coverage:** No parity test runs the same corpus through both functions.
- **Scratch reproduction:** Offline test: client parser returned a website object for `https://localhost/path`; server normalizer returned `ok: false`.
- **Known-root relationship:** None.
- **Recommended correction:** Share one canonical normalization/validation policy. Explicitly define handling for credentials, local/reserved hosts, ports, and supported social/profile URLs.

### OA-03 — Google Business Profile is advertised without a GBP contract

- **Severity:** P2
- **Confidence:** HIGH
- **Scope:** Advertised source type and extraction provenance
- **Files:** `src/app/audit/SourceHero.tsx:118-142,163-173`, `src/lib/audit/source-input.ts:5-7,27-53`, `src/app/api/audit/extract/route.ts:40-75`, `src/lib/audit/openai.ts:271-325`
- **Finding:** The active UI advertises Google Business Profile input, but the parser has only `website` and `instagram`, and the backend always treats accepted non-Instagram values as the official website.
- **Evidence:** Maps/GBP links become generic website sources. Extraction then restricts search by hostname and describes the submitted value to the provider as `official_website`.
- **Active reachability:** Production landing and `/audit`.
- **Failure scenario:** A short Maps or GBP link is submitted; the method applies official-site semantics to a listing/redirect host and may return an empty or misattributed draft.
- **Why it matters:** The promised source type and recorded provenance do not match actual processing.
- **Existing coverage:** No parser or route coverage for `maps.app.goo.gl`, Google Maps, or GBP URLs.
- **Scratch reproduction:** Static active-path trace; no GBP-specific type or route exists.
- **Known-root relationship:** None.
- **Recommended correction:** Remove GBP from current copy until supported, or introduce explicit GBP detection, canonicalization, provenance labels, redirect handling, and offline route tests.

### OA-04 — Hidden AI comparison identity can be promoted or become stale

- **Severity:** P1
- **Confidence:** HIGH
- **Scope:** Business-fact confirmation and similar-business identity
- **Files:** `src/app/audit/AuditWorkflow.tsx:607-637,656-676`, `src/app/audit/SimilarBusinessesEditor.tsx:20-39`, `src/lib/audit/similar-businesses.ts:88-118`, `src/app/api/audit/prompts/route.ts:21-27`, `src/lib/audit/questions-id.ts:120-152`
- **Finding:** The first AI-suggested similar business is promoted into `verified_competitor`; its AI-provided name is not displayed in the URL-only editor. Editing that row’s URL marks it `user` but preserves the hidden AI name, allowing the name and URL to identify different businesses.
- **Evidence:** `updateEntry()` changes only `source_url` and `origin`; `withPrimarySimilarBusiness()` prefers the retained `name`; the prompt route invokes promotion before minimizing the brief.
- **Active reachability:** `/audit` extraction → Business Facts → question generation.
- **Failure scenario:** AI suggests “Peer A” at A’s URL. The user changes the visible URL to Peer B. The provider-bound brief becomes `{name: "Peer A", source_url: "Peer B"}` and the comparison question can name the wrong entity.
- **Why it matters:** This defeats the correction gate and can bind comparison questions and later evidence to different businesses.
- **Existing coverage:** Tests explicitly preserve an AI name and test URL normalization, but do not test editing an AI row’s URL or exact entity confirmation.
- **Scratch reproduction:** Offline suite produced `name: "AI suggested peer A"` with `source_url: "https://peer-b.example/"`.
- **Known-root relationship:** None. Raw A2-01 and A2-02 were merged because they share the same hidden-name promotion root.
- **Recommended correction:** Keep suggestions separate from confirmed comparison state. Show and explicitly confirm the exact name/source pair. Clear or re-resolve the name whenever the source changes, while retaining origin provenance.

### OA-05 — Credential-bearing competitor URLs are sent to question generation

- **Severity:** P1
- **Confidence:** HIGH
- **Scope:** URL validation and provider-boundary privacy
- **Files:** `src/lib/audit/similar-businesses.ts:9-33`, `src/lib/audit/types.ts:39-46,55-61,74-79`, `src/lib/audit/questions-id.ts:141-148`, `src/app/api/audit/prompts/route.ts:17-27`
- **Finding:** Similar-business URLs containing HTTP userinfo are accepted and copied unchanged into the minimized provider brief.
- **Evidence:** The shared URL schema checks URL syntax and HTTP(S) scheme but not `username` or `password`. Similar-business normalization removes only fragments. `minimizeIndonesianBrief()` copies the resulting URL to `comparison_business.source_url`.
- **Active reachability:** User adds a competitor source in Business Facts, then generates questions.
- **Failure scenario:** `https://user:secret@peer.example/path?q=x` passes schema validation and enters the model payload.
- **Why it matters:** Repository policy explicitly prohibits sending credentials/access tokens to model providers. Query parameters can also carry unnecessary secrets or identifiers.
- **Existing coverage:** Tests reject unsupported schemes but do not reject userinfo or sensitive URL components.
- **Scratch reproduction:** Offline suite proved the URL was considered valid and remained unchanged in the minimized brief.
- **Known-root relationship:** None.
- **Recommended correction:** Reject URL userinfo at every public-source boundary. Strip or reject unnecessary query strings before storage and model projection; allow only documented query-bearing source forms.

### OA-06 — Re-extraction silently overwrites customer-edited facts

- **Severity:** P2
- **Confidence:** HIGH
- **Scope:** Business-fact version transition
- **Files:** `src/app/audit/AuditWorkflow.tsx:554-575,577-654,1114-1117`, `src/app/audit/AuditStages.tsx:350-365`, `docs/journey/03-business-facts.md:453-467`
- **Finding:** Returning to the source step and extracting again replaces most edited brief fields with the new provider draft without a replacement warning or field-level review.
- **Evidence:** “Change website” only sets `factsExtracted(false)`. The edited `brief` remains in memory; the next successful extraction spreads `current` and then overwrites category, offerings, needs, criteria, similar businesses, customer facts, accuracy questions, USP, and other fields with `draft.*`.
- **Active reachability:** Direct `/audit` path before execution starts.
- **Failure scenario:** A user corrects facts, returns to the source, and retries. Corrected values are silently replaced before confirmation.
- **Why it matters:** Question generation may use AI values the customer had already corrected.
- **Existing coverage:** No edit → back → re-extract integration test.
- **Scratch reproduction:** Static state-transition trace; no provider call was needed.
- **Known-root relationship:** None; this is not K-01’s stale in-flight work.
- **Recommended correction:** Treat re-extraction as a new draft version, warn before replacement, and show diffs or require explicit acceptance of replacement fields.

### OA-07 — Generated suggestions can violate the default five/five composition

- **Severity:** P2 (downgraded from raw P1)
- **Confidence:** HIGH
- **Scope:** Generation-time composition
- **Files:** `src/lib/audit/questions-id.ts:532-624`, `src/lib/audit/questions-id-live.ts:191-228,303-332`, `src/app/api/audit/prompts/route.ts:21-27`
- **Finding:** A safe, distinct ten-question provider result is returned even when the generated suggestion is not five without-name and five with-name; false self-check fields do not trigger repair/fallback.
- **Evidence:** The validator prevents audited-brand leakage in slots 1–5 but does not require identity in slots 6–10. The live builder computes five/five booleans but does not enforce them.
- **Active reachability:** Active prompts route.
- **Failure scenario:** The provider returns ten unbranded questions. The route returns HTTP 200 and the Questions UI still shows hard-coded “5 unbranded / 5 branded” chips.
- **Why it matters:** The initial generated coverage can differ from what the review UI claims. Customer edits may intentionally alter composition, but generation is still assigned a five/five default.
- **Existing coverage:** Good fixture only; no adversarial 0/10, 4/6, or 10/0 provider candidate.
- **Scratch reproduction:** Static validator/builder trace.
- **Known-root relationship:** None.
- **Recommended correction:** Enforce default slot posture for unedited provider suggestions, fall back when violated, and render counts from the actual pack rather than fixed UI text.

### OA-08 — Non-Indonesian output can be stamped `id-ID`

- **Severity:** P2 (downgraded from raw P1)
- **Confidence:** MEDIUM
- **Scope:** Question-language quality gate
- **Files:** `src/lib/audit/questions-id-provider.ts:98-111`, `src/lib/audit/questions-id.ts:532-624,790-845`, `src/lib/audit/questions-id-live.ts:290-334`
- **Finding:** Mechanical validation does not inspect language, while the live pack is stamped `id-ID` regardless of actual provider text.
- **Evidence:** Indonesian is requested in the instruction. Candidate validation covers count, distinctness, leakage, unsupported premises, sensitive content, grounding, and size, but not output language.
- **Active reachability:** Active prompts route and Questions UI.
- **Failure scenario:** Ten safe English questions are accepted and labeled Indonesian.
- **Why it matters:** Customer-facing questions are contractually Indonesian and downstream provenance becomes inaccurate.
- **Existing coverage:** Indonesian fixtures and instruction assertions only; no non-Indonesian output case.
- **Scratch reproduction:** Static gate inventory.
- **Known-root relationship:** None.
- **Severity rationale:** Downgraded because every generated pack is intentionally subject to human review, and reliable language/naturalness judgment is partly a human gate. The false language stamp remains a concrete robustness defect.
- **Recommended correction:** Add a conservative language-confidence check with deterministic fallback for clearly non-Indonesian output, and do not stamp language solely from the requested path.

### OA-09 — Compact competitor identity can leak outside comparison slot 6

- **Severity:** P2
- **Confidence:** HIGH
- **Scope:** Generation validator
- **Files:** `src/lib/audit/questions-id.ts:546-595`
- **Finding:** Audited-brand detection supports compact matching, but competitor detection uses only normalized space-delimited matching.
- **Evidence:** `Kopi Ruang Pagi` becomes `kopi ruang pagi`; `KopiRuangPagi` in another slot becomes `kopiruangpagi` and bypasses the comparison-business check.
- **Active reachability:** Live generation validation and the pre-run validation path.
- **Failure scenario:** Slot 1 names the comparison business without spaces; it passes as an unbranded discovery question.
- **Why it matters:** It contaminates the question’s measurement by revealing comparison context outside its designated slot.
- **Existing coverage:** Normal competitor leakage only; no compact/punctuation/domain variants.
- **Scratch reproduction:** Deterministic normalization trace.
- **Known-root relationship:** None.
- **Recommended correction:** Reuse the audited-brand identity matcher for competitor names and relevant source identity signals, allowing the competitor only in slot 6.

### OA-10 — `inputs_used` provenance is hard-coded and inaccurate

- **Severity:** P2
- **Confidence:** HIGH
- **Scope:** Business-fact binding and question provenance
- **Files:** `src/lib/audit/questions-id-live.ts:308-318`, `src/lib/audit/questions-id.ts:91-112`, `skills/generate-ai-visibility-prompts/SKILL.md:179-189,207-209`
- **Finding:** Every live question is assigned `inputs_used: ["brand_name", "market_context", "category"]`, independent of the facts that shaped it.
- **Evidence:** The assignment is unconditional even for offering, competitor, accuracy, needs, and conversion-action slots.
- **Active reachability:** Every active live pack returned by `/api/audit/prompts`.
- **Failure scenario:** A competitor comparison claims no competitor input; an unbranded generic question claims it used the brand name.
- **Why it matters:** The review/export trail misstates which confirmed facts shaped each question.
- **Existing coverage:** No per-question provenance assertions for the live Indonesian pack.
- **Scratch reproduction:** Construction is deterministic for every generated and fallback pack.
- **Known-root relationship:** None.
- **Recommended correction:** Compute slot-aware truthful provenance from code-owned allowed fields, or omit this field until the path can support truthful attribution.

### OA-11 — Returned model is not enforced on the protected question path

- **Severity:** P1
- **Confidence:** HIGH
- **Scope:** Protected provider method and provenance
- **Files:** `src/lib/audit/questions-id-provider.ts:100-119,202-238,348-413,476-506`, `src/lib/audit/questions-id-live.ts:240-280,336-350`, `src/lib/audit/opencodego.ts:16-52`
- **Finding:** The protected path validates configured/requested `gpt-5.6-luna` but accepts a completed response from a different or missing returned model.
- **Evidence:** Response parsing ignores `json.model`. Telemetry later records it but no guard compares it with `OPENCODEGO_AUDIT_MODEL`.
- **Active reachability:** `/api/audit/prompts` uses this exact Responses-compatible parser and live builder.
- **Failure scenario:** OpenCode Go returns ten valid questions with `model: "different-model"`; the route returns a successful model-generated pack and completed telemetry.
- **Why it matters:** Nuave can claim the protected GPT-5.6 Luna method without proving that model produced the questions.
- **Existing coverage:** Tests assert the requested model and happy-path response only; no mismatch/missing-model negative test.
- **Scratch reproduction:** Offline scratch fetch returned `model: "different-model"`. `buildLiveIndonesianPromptPack()` returned ten prompts, telemetry status `completed`, and `returned_model: "different-model"`.
- **Known-root relationship:** None. K-03 concerns production observation validity; this is a separate question-generation enforcement gap.
- **Recommended correction:** Require a non-empty returned model matching `OPENCODEGO_AUDIT_MODEL` before accepting protected question generation. Preserve the actual value and add mismatch/missing-model regressions.

## 5. Known-root extensions

### K-02 extension — positional identity drift begins at generation

Raw A3-03 showed that the live Indonesian builder emits `NVA-ID-01` through `NVA-ID-10`, while the older canonical Intent-5 material uses `NUAVE-BRAND-*` identifiers. The genuinely new observation is that positional identity risk begins when the pack is generated, not only when later evidence is resumed or bound.

This was **not counted as a new standalone finding** because no active consumer failure was demonstrated solely from the namespace difference, and K-02 already covers the dangerous downstream dependence on positional identity. The final synthesis orchestrator should correlate this generation-originated drift with any run/report evidence-binding report.

No other K-01–K-10 extension was accepted.

## 6. Rejected/downgraded raw findings

Raw finding accounting: **15 raw claims → 11 verified findings + 3 rejected claims, with A2-01/A2-02 merged into one final finding.** Two accepted claims were materially downgraded.

| Raw ID | Disposition                 | Reason                                                                                                                                                                                                                                                                                                                                  |
| ------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1-01  | Accepted as OA-01           | Offline reproduction and active path prove source identity rewriting.                                                                                                                                                                                                                                                                   |
| A1-02  | Rejected                    | The proposed “fast Enter before queued handoff” sequence was not reproduced. The input is blank before the callback; the callback sets the value and starts extraction in one task, after which `extracting` disables submission and removes the handoff. Static presence of two call sites did not prove the claimed paid double-call. |
| A1-03  | Accepted as OA-02           | Narrowed to demonstrated client/server parity failure; broader SSRF implications were not accepted.                                                                                                                                                                                                                                     |
| A1-04  | Accepted as OA-03           | Active copy and route behavior diverge.                                                                                                                                                                                                                                                                                                 |
| A2-01  | Merged into OA-04           | Same hidden-name/promotion root as A2-02.                                                                                                                                                                                                                                                                                               |
| A2-02  | Merged into OA-04           | Same hidden-name/promotion root as A2-01, with the stronger stale-name reproduction retained.                                                                                                                                                                                                                                           |
| A2-03  | Accepted as OA-05           | Offline reproduction proved credential-bearing URL reaches minimized provider brief.                                                                                                                                                                                                                                                    |
| A2-04  | Accepted as OA-06           | Active state transition silently replaces edits; severity remains P2.                                                                                                                                                                                                                                                                   |
| A3-01  | Accepted as OA-07; P1 → P2  | The generated default is wrong, but mandatory human review limits immediate impact and composition may legitimately change after edits.                                                                                                                                                                                                 |
| A3-02  | Accepted as OA-08; P1 → P2  | False language stamping is real, but language naturalness is partly an explicit human-review gate. Confidence reduced to MEDIUM for the appropriate automated threshold.                                                                                                                                                                |
| A3-03  | Not counted; K-02 extension | Namespace drift is real, but no independent active failure beyond the known positional-identity root was demonstrated.                                                                                                                                                                                                                  |
| A3-04  | Accepted as OA-09           | Concrete validator asymmetry and reachable bypass.                                                                                                                                                                                                                                                                                      |
| A3-05  | Accepted as OA-10           | Construction proves inaccurate provenance on every pack.                                                                                                                                                                                                                                                                                |
| A4-01  | Rejected as a new finding   | The ungated/rate-limit state is explicitly documented and founder-accepted on 2026-08-20, with a guard required before public sharing. Server-owned entitlement/idempotency is later-phase architecture. This remains an operational prerequisite, not a newly discovered defect in this review.                                        |
| A4-02  | Accepted as OA-11           | Offline end-to-end builder reproduction proved mismatched returned model is accepted.                                                                                                                                                                                                                                                   |

## 7. Test/reproduction evidence

No live provider call was made.

| Command / reproduction                                                                                | Result                                                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npx vitest run` over 11 scoped audit files                                                           | **188/188 passed; 11 files**                                             |
| `npm run test:unit`                                                                                   | **503/503 passed; 38 files**                                             |
| `npm run check`                                                                                       | **Passed**: typecheck clean, lint 0 errors / 18 warnings, Prettier clean |
| Scratch snapshot at `/tmp/nuave-review-a-scratch`, `npx vitest run review-boundaries.scratch.test.ts` | **6/6 passed; 1 file**                                                   |

The scratch suite ran from `git archive 028aaa72149c81d71b940adfcb16bd144f0df047` outside the review worktree and reproduced:

- Instagram post URL → `/p` identity rewrite;
- hero/server disagreement on `https://localhost/path`;
- reserved Instagram shared-host path acceptance;
- hidden/stale similar-business name with a changed URL;
- credential-bearing competitor URL in the minimized provider brief;
- successful protected question generation with returned model `different-model`.

Reviewer A1 attempted `tests/e2e/landing-audit-handoff.spec.ts`, but the Next/Turbopack server rejected the external `node_modules` symlink. No e2e result is claimed. That failed setup does not affect the unit and scratch results above.

## 8. Coverage ledger

### Files directly reviewed

- `src/lib/audit/source-input.ts`
- `src/lib/audit/source-input.test.ts`
- `src/lib/audit/website-input.ts`
- `src/lib/audit/website-input.test.ts`
- `src/lib/audit/source-handoff.ts`
- `src/app/api/audit/extract/route.ts`
- `src/app/audit/SourceHero.tsx`
- `src/app/audit/SourceHero.module.css`
- `src/components/LandingAuditHero.tsx`
- `tests/e2e/landing-audit-handoff.spec.ts`
- `src/app/audit/AuditWorkflow.tsx`
- `src/app/audit/AuditStages.tsx`
- `src/app/audit/SimilarBusinessesEditor.tsx`
- `src/app/audit/SimilarBusinessesEditor.module.css`
- `src/lib/audit/similar-businesses.ts`
- `src/lib/audit/similar-businesses.test.ts`
- `src/lib/audit/contracts.ts`
- `src/lib/audit/contracts.test.ts`
- `src/lib/audit/types.ts`
- `src/lib/audit/questions.ts`
- `src/lib/audit/questions.test.ts`
- `src/lib/audit/questions-id.ts`
- `src/lib/audit/questions-id.test.ts`
- `src/lib/audit/questions-id-live.ts`
- `src/lib/audit/questions-id-live.test.ts`
- `src/lib/audit/questions-id-provider.ts`
- `src/lib/audit/questions-id-provider.test.ts`
- `src/lib/audit/questions-id-provider-regression.test.ts`
- `src/lib/audit/provider.ts`
- `src/lib/audit/provider.test.ts`
- `src/lib/audit/opencodego.ts`
- `src/app/api/audit/prompts/route.ts`
- `.env.example`
- `skills/generate-ai-visibility-prompts/SKILL.md`
- `docs/PROMPT_GENERATION_CONTEXT.md`
- `docs/journey/03-business-facts.md`
- `docs/journey/04-questions.md`
- all mandatory baseline/specification documents named in the field brief.

### Relevant files inspected indirectly

- `src/app/page.tsx` and `src/app/audit/page.tsx` for active reachability;
- `src/lib/audit/openai.ts` for extraction request construction and provider payload;
- `src/app/api/audit/run/route.ts` and `src/lib/audit/run-orchestrator.ts` only to trace question consumers and pre-run validation;
- `src/lib/audit/client-contract.ts` and relevant tests for route contract context;
- `src/lib/audit/workflow-storage.ts` and variance storage constants for landing handoff ownership;
- `.github` deployment/config references only where provider configuration or access state affected active reachability.

### Relevant files not reviewed and why

- `src/app/api/audit/report/route.ts`, report pipeline/view files: outside intake/question scope.
- `src/app/api/audit/variance/route.ts`, variance implementation/tests: outside scope except known-root correlation.
- `src/lib/audit/gemini.ts`, `groq.ts`, `openrouter.ts`: testing-only alternatives, not the protected OpenCode Go question path.
- Full observation stream/retry implementation: another subsystem and covered by known findings.
- `tests/e2e/live-audit-variance.spec.ts`: later run/variance lane.

### Intentionally excluded

- `archive/` and `Archive Candidates/`;
- `src/app/audit/fixture/*` and frozen fixtures as production behavior;
- `src/app/audit/spec004/*` isolated demo/preview implementation;
- live provider endpoints, credentials, private run artifacts, and external business sources.

This is substantial bounded coverage, not a claim of 100% repository or subsystem coverage.

## 9. Cross-subsystem handoff

The final synthesis orchestrator should correlate:

1. **OA-04/OA-05 with question and report evidence binding:** incorrect comparison identity or leaked source metadata can persist into generated questions and later evidence.
2. **OA-07/OA-10 with run/report composition:** actual name/no-name counts and provenance may disagree with static UI claims or downstream method text.
3. **K-02 generation extension with run/report pilots:** `NVA-ID-*` positional IDs originate in generation and should be checked against immutable question-text binding downstream.
4. **OA-11 with K-03:** observation provenance may be separately guarded, but question generation does not enforce returned-model provenance. A report may therefore combine correctly guarded observations with an unproven question-generation model.
5. **OA-01/OA-03 with report source claims:** wrong or generically handled source identity can make later “official source” statements untrustworthy even if report arithmetic is correct.

## 10. Recommended correction order

1. **Block credential-bearing competitor URLs (OA-05)** before any provider-boundary use.
2. **Enforce returned-model identity on the protected question path (OA-11)** with mismatch and missing-model tests.
3. **Fix Instagram profile parsing (OA-01)** and define one shared client/server source policy (OA-02).
4. **Make comparison-business confirmation explicit and entity-safe (OA-04)**, including clearing stale hidden names on URL edits.
5. **Stop advertising GBP until a distinct supported contract exists, or implement that contract (OA-03).**
6. **Preserve or explicitly replace customer edits during re-extraction (OA-06).**
7. **Align generated composition, language stamping, competitor-leak validation, and truthful `inputs_used` provenance (OA-07 through OA-10).**
8. Re-run the scoped unit suite, full offline verification, and browser handoff tests without an external-worktree dependency symlink.

No correction was implemented in this review.
