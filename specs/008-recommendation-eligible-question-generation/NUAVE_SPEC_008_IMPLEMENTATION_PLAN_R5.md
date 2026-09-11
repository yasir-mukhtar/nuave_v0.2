# Nuave Spec 008 — Implementation Plan R5

**Natural Indonesian consumer questions and requests with genuine business-recommendation opportunity**

> Status: Adopted 2026-09-11 on branch `docs/spec-008-recommendation-eligible-questions` (adoption commit `ab8336b4b9a79051b1ce9b4c7cfe13156bf45d92`), after Adversarial Review 5's proceed verdict. No implementation, paid experiment, or release gate is claimed complete.
> Revision: R5, 2026-09-07 UTC. Supersedes R4 and the package's pre-R5 `EXECUTION_PLAN.md` (archived at `Archive Candidates/superseded-plans/SPEC_008_EXECUTION_PLAN_PRE_R5.md`; the old path is now a tombstone redirecting here). Source blob SHA-256 `6fa504d8e7e9e8b0985cebbb77556fd51b56c3eca9fc36a7a320ad8dd3338f44`.
> Owner: Founder / implementation orchestrator.
> Purpose: One standalone contract and execution ledger for work across sessions and devices.

## 1. Authority and revision decisions

Adopt this packet for Spec 008 through the repository workflow. Applicable repository instructions and unrelated product contracts remain authoritative. G0 reconciles affected product documents and redirects stale plan pointers; previous revisions become provenance, not competing execution instructions. Do not reconstruct unavailable original experiments as evidence.

R5 retains R4's architecture and makes four decisions:

| Review 4 finding | Decision | Owning contract |
| --- | --- | --- |
| F-01: no held-out simple control | Within the existing 32-call release ceiling, compare retained rich generation against fresh simple-control outputs on every held-out input and its scheduled repeat. Ties do not retain complexity. | §8.2 |
| F-02: prepared sessions retain stale policy | Add one read-only policy endpoint, reconcile on restoration and before approval/execution, and check the same revision server-side before paid work. Generation provenance stays immutable. | §6.2 |
| F-03: interrogative-only restriction | Allow an independent consumer question or direct request. Explicitly remove the mandatory terminal question mark from compatible-008 validation; keep the v2 writer and unprepared-client path unchanged. | §5.1 |
| F-04: evidence lost at execution | Carry generation evidence at `pack.questionEvidence`, then explicitly at run-request root `questionEvidence`; keep server-recomputed execution evidence separate. | §4.3 |

This packet explicitly amends earlier R-01/02/05/09 relevance to require commercial choice at the correct competitive answer level; R-19/31 context authority only as specified in §3.2; R-33 recovery as §6.1; and R-16/38/39 sequencing so provider feasibility and component value precede production plumbing. R-10's inspectable decisions and R-16's reserves remain initial hypotheses: removing either requires a recorded contract amendment with affected evidence. R5 replaces R3/R4's grammatical restrictions with §5.1; adopting R5 adopts that punctuation decision without a separate unresolved product choice.

**Evidence basis.** Both supplied attachments were read in full. R4 SHA-256: `e0a7cd20fe6292d99edd3e0c88201b9d9879271e0032bb5c7ad15f5a7c3d9ae1`; Review 4 SHA-256: `48e26addfb7a3f605eda4da7dbf1e98f079940d97d234279eef6069fc8796945`.

Targeted inspection for this revision checked the review's pinned commit `e531ff4653c324007eb049bee93f2a3b922cf216`: [prompt/pack schemas](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/lib/audit/types.ts), [question validator](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/lib/audit/questions-id.ts), [client run preflight/serialization](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/app/audit/AuditWorkflow.tsx), [run parser](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/app/api/audit/run/route.ts), [lock boundary](https://github.com/yasir-mukhtar/nuave_v0.2/blob/e531ff4653c324007eb049bee93f2a3b922cf216/src/lib/audit/locked-question-pack.ts), and root instructions. This confirms the transport and punctuation boundaries, not current deployment. PR #46 ref `afd518dd75d436319c7a5f1c31db9d640e2728d3` is inherited from Review 4 and was not inspected here. G0 establishes the actual branch, current provider configuration, deployed bundles, and approved intake handoff; parallel work may have changed them. Earlier originals were not independently reviewed for R5.

## 2. Product contract

The journey remains **confirmed facts → ten suggestions → customer review/edit → explicit audit start**. Generation never starts execution. Customer value is testing requests people plausibly make while choosing where to buy, whom to hire, what brand to use, or which business fits their needs. The six/four composition is an internal measurement boundary, not the customer-facing explanation.

### 2.1 Generated consumer intent

Every unnamed question or request must:

1. Express a plausible commercial choice: find, choose, buy, hire, visit, obtain, shortlist, or compare something entities compete to provide.
2. Need concrete relevant entities for a satisfactory answer. Generic advice with optional business examples is insufficient.
3. Match the confirmed competitive role and offering scope. An ordinary suitable peer must be a direct possible answer without introducing another purchasing task. The target need not satisfy every preference, appear, or win.
4. Leave fair opportunity for competitors. Avoid target-only prices, slogans, proprietary features, restrictive feature combinations, or unnecessary location precision.
5. Be one independently understandable, plausible Indonesian consumer question or direct request. Naturalness comes from the decision and wording; slang and interrogative grammar are not prerequisites.
6. Use zero to three material criteria, normally one to three, without invented personas, corporate phrasing, overload, or six paraphrases of one decision.

Entity demand and answer level are separate judgments. A multi-brand laptop retailer competes with retailers; a laptop brand/product can compete with brands/models. A service provider is not interchangeable with an equipment brand. The word `rekomendasi` is neither necessary nor sufficient. Category inference permits ordinary buyer preferences, never invented entity facts about identity, geography, channels, offerings, price, availability, policies, certification, reputation, or outcomes.

### 2.2 Fixed boundaries

- Preserve ten ordered canonical slots, six unnamed and four named; IDs, categories, measurement purposes, identity/comparison policies, persisted descriptions including `generatorSlotDescription`, and report assessment classes remain fixed.
- Slot 2 retains a real occasion; slot 4 a concrete supported offering/use case; slot 6 identification and comparison of concrete options. All satisfy §2.1. Slots 7–10 retain their purposes; slot 9 retains its comparison-target relation. Recommendation-oriented wording does not change a slot's report class.
- Preserve report denominators, calculations, and interpretation. Different wording may change observations; fixed observations must produce identical calculations.
- One bounded primary generation call, without search. No runtime semantic reviewer, new required intake screen, Questions UI redesign, or blocking semantic certification of customer edits. Preserve the non-blocking purpose-drift warning.
- Keep market objects, candidate metadata, and diagnostics out of customer screens and observation prompts. Disclose material continuity fallback truthfully. Preserve identity, privacy, safety, premise, and approval protections subject only to §5's explicit amendments.

## 3. Confirmed facts and context authority

### 3.1 One canonical facts adapter

Project v3 from active, confirmed facts through a pure adapter. Do not reuse the lossy v2 minimizer, import React state into generation, or move generation semantics into intake. G1 maps the actual approved intake and `BusinessBrief` paths to:

| Confirmed source | Representation / limitation |
| --- | --- |
| Identity, aliases, audit scope | Identity registry and separate `entityScope`; preserve whole-brand, one-location, and offering scopes. Identifiers are not automatically allowed in unnamed wording. |
| Category, business type, competitive role | `category`, `businessType`, and market `entityType`; distinguish retailer, service, venue, product, platform, and professional answer levels. Conflicting role/scope needs correction. |
| Offerings | Safe concrete `offerings`; abstract proprietary names before unnamed realization. |
| Audience and approved needs | `targetCustomer`, `customerNeeds`; no invented demographic persona. |
| Approved criteria / buyer constraints | Typed `buyerConstraints`; distinguish confirmed abstractions, consumer preferences, and category inference. |
| Market, reach, served areas | Separate `marketContext`; missing geography remains unknown. |
| Approved fulfilment / service channels | Optional structured `serviceChannels`; preserve multiple channels separately from geography. |
| Confirmed comparators | Existing slot-specific identity registry and slot-9 relation. |
| Safe facts / category restrictions | Minimal permitted facts and regulated-category safety context. |
| Contact/payment data, raw HTML, source-only URLs, sensitive free text | Exclude from writer input and captures. Arbitrary free text cannot become a fallback fragment. |

Use only the smallest backward-compatible optional facts extension required by the approved intake handoff. Absence never supplies a default area/channel. Verify raw request parsing, generator invocation, response parsing, review, and saved state—not TypeScript types alone.

Bind generation to a facts revision/fingerprint and request ID. Fact changes invalidate suggestions through the established confirmation flow and require review of a new pack. Late responses cannot overwrite a newer revision/request. A policy refresh or client upgrade is not a fact change and must preserve questions and edits.

### 3.2 Effective v3 context map

Leave `measurement-matrix.ts` and persisted values unchanged; its `allowedContextFields` remain authoritative for v2. The sole v3 writer-input/realization exception is:

`effectiveV3Context(slot) = safe legacy allowlist(slot) ∪ shared context ∪ explicit slot additions`

| Layer | Permission |
| --- | --- |
| Safe legacy allowlist | Existing slot fields minimized through §3.1. Permission is not permission to copy every value. |
| Shared, slots 1–10 | Confirmed scope, market/reach/areas, approved channels, safe general access/fulfilment buyer constraints. |
| Slot 2 — `situation` | Legacy occasion content plus shared context, including confirmed local occasion and channel. |
| Slot 3 — `need_fit` | Approved `verified_customer_needs` or normalized equivalent, plus legacy/shared context. |
| Slots 1 and 4–10 | No further slot-specific additions. |
| Overriding denials | Unnamed identity leakage, unauthorized comparators, sensitive data, unsupported premises, target fingerprinting, and category safety violations. |

General buyer constraints cannot smuggle offerings, needs, identifiers, differentiators, or claims past their permissions. Include shared context only when relevant to the decision. One versioned code map derives both instruction permissions and diagnostics; no parallel handwritten prompt allowlist. A single call can expose named-slot identities to the model, so projections do not prove isolation: local identity guards remain necessary.

Fixtures must show slot 2 receives confirmed Depok/home visit, slot 3 receives an approved need, absent channels remain absent, and slot/report/identity restrictions survive. These establish supplied and permitted information, not actual model use.

## 4. Generation, finalization, and evidence

### 4.1 Initial structured response

Use ordinary modules in the existing generation area. The initial rich hypothesis returns one compact market, primary/reserve candidates for six unnamed slots, and four named texts: sixteen texts total.

| Element | Bound / owner |
| --- | --- |
| Market | Confirmed-role-bound category/entity type; ≤8 ordinary dimensions, labels ≤80 characters; provenance `confirmed_abstraction`, `buyer_constraint`, or `category_inference`. |
| Unnamed candidate | Slot and primary/reserve position; choice description ≤140 characters; ≤3 context references; 0–3 dimension IDs; final text. |
| Named candidate | Four slot-bound texts; no required reserves. |
| References/text | Bounded resolving IDs, no missing/duplicate slots or dimension IDs; preserve current visible text limits. The inspected baseline allows at most 700 characters; G0 verifies all effective limits. |
| Code-owned | Canonical/report metadata, versions, identity registry, fingerprints, and origins. |

The writer abstracts the market, identifies consumer decisions, and realizes text in one response. Request compact decisions, not hidden reasoning, exhaustive target-signal inventories, or semantic pass booleans. Malformed required structure invalidates the response; a validly structured candidate with a demonstrated text violation may be rejected individually.

G2 freezes provider/model, sampling, schema mode, timeout, output-token cap, and instruction/schema versions. Verify current configuration instead of assuming the historically reported 2,048-token v2 cap or a particular provider. Do not silently raise limits or substitute a provider. §8 decides which production contract earns retention.

### 4.2 One finalizer and bounded recovery

1. Detect demonstrable input deficiencies before the provider call; return §6.1's correction outcome.
2. Make at most one primary call and validate its response. Provider/structural failure goes directly to the single full-fallback attempt if safe facts permit it.
3. Check candidates mechanically, including §5, identity, known-copy, references, and demonstrated premise violations. Derive copy/identity checks from confirmed input, not model exclusions. Distinguish buyer constraints from copied target prices/specifications.
4. Select one surviving candidate per unnamed slot; retain valid named texts. Reject invalid portfolios and exact normalized duplicates. There are at most 64 primary/reserve portfolios.
5. If none is complete and valid, add at most one reviewed fallback per affected missing/invalid/conflicting slot and make one further selection pass: at most 729 unnamed portfolios. Each named slot has its valid original or one safe fallback.
6. If still unsuccessful, attempt one reviewed full fallback pack. Steps 2 and 6 share one full-fallback budget; no recursive repair or provider retry. Unsafe/insufficient/invalid fallback returns the appropriate §6.1 error.
7. Recheck exact final texts; derive origins, fingerprints, counts, matrix-owned metadata, and diagnostics. Downstream consumers may reject but cannot silently replace wording.

**Default selection hypothesis:** among valid portfolios minimize reserve substitutions, then use stable slot/candidate order. In the fallback pass minimize fallback slots first, then reserves. The candidate coverage policy first minimizes fallback slots, then maximizes distinct valid dimension IDs, then minimizes reserves, with the same stable ties. Coverage never bypasses validity or introduces fallback solely for a better label count. Freeze one global policy; never select a policy per business after seeing its output.

Normalization is limited to existing harmless formatting. Never append `?` to manufacture compliance, silently paraphrase approved text, weaken identity rules, or erase a premise without revalidation. Any retained wording repair belongs here and records its origin.

Fallback forms must be independently reviewed, slot-safe, and use only safe market inputs. A hypothetical category occasion cannot imply target availability. Slot 4 needs a supported offering/use case; slot 6 requests options and comparison. Exercise mixed/full fallback across scopes, channels, sparse facts, and regulated categories. Fallback quality counts toward customer usability, never raw writer success.

### 4.3 Evidence schema and exact transport

Use `questionEvidence.evidencePolicyVersion: "nuave.question-evidence.v3"` as the generation-evidence discriminator. New v3 writers emit the request ID/facts revision; generation/projection/context/instruction/schema/selector/fallback/guard versions; suggestion fingerprints; per-slot origins (`primary`, `reserve`, `slot_fallback`, `full_fallback`, `retained_repair`), context provenance, and writer hints; and semantic evaluations. Do not duplicate this envelope per prompt.

| Boundary | Canonical location and behavior |
| --- | --- |
| Generation response | Existing `{ pack, ... }` response; new evidence lives at `pack.questionEvidence`. v3 omits legacy `pack.self_check` and per-prompt `inputs_used`. All ordinary slot/text metadata remains. |
| Client review and saved state | Store/restore the complete `promptPack`, including `promptPack.questionEvidence`, through the actual state parser. Preserve original suggestion fingerprints and generation versions while editing text. Current server policy is separate state (§6.2). |
| Run request / resume | Preserve existing request fields and `prompts: promptPack.prompts`; explicitly add root `questionEvidence: promptPack.questionEvidence` when present. Do not assume sending the array carries the envelope. Use the same serializer for ordinary start and resume. |
| Server run parser | Parse the ten canonical prompt cores, accepting legacy `inputs_used` when supplied. Parse optional root `questionEvidence` separately. Absence of legacy fields on v3 must not fail the prompt parser; absence of diagnostics must not relax structural/identity checks. |
| Lock input/output | Extend `canonicalLockedQuestionPack(prompts, brief, options)` with optional `options.questionEvidence` and an explicit server-resolved validation policy. Return evidence alongside `prompts`/`by_id`, plus code-owned `executionEvidence` recomputed for this submission. Client metadata never selects the validation policy. |
| Run response to capable client | Add a `type: "question_lock"` event to the existing run stream, before observation events, carrying optional `questionEvidence` and required `executionEvidence`. Send only after successful lock/validation and only to capable clients. Update the real event parser and save both fields with that run. Unprepared clients retain existing events. |
| Stored run, replay, variance, report | Preserve `questionEvidence` and the server's `executionEvidence` beside locked prompts in the existing run/state record. Any downstream request that reconstructs the lock explicitly forwards optional root `questionEvidence`; recompute current execution checks. Record concrete consumers at G3. Do not create a persistence service. |
| Observation provider input | Use only the exact locked strings and existing permitted execution context. Evidence, writer hints, semantic judgments, and policy negotiation fields never enter observation prompts. |

Writers serialize strict v2 or v3 shapes. Readers accept ordinary v2 records and diagnostic absence without inventing a version. Share a canonical prompt-core schema rather than making core identity/slot fields optional to accommodate v3. Preserve legacy data in the v2 branch; do not synthesize `inputs_used` or semantic booleans to satisfy old parsers.

Use one shared fingerprint helper: SHA-256 of UTF-8 JSON for the ordered array `[factsFingerprint, [[prompt_id, exactQuestion], ...]]`; per-text hashes use `[prompt_id, exactQuestion]`. Derive `factsFingerprint` from the versioned canonical adapter. Apply permitted whitespace normalization before review/approval, never after fingerprinting. Bind `question_lock` events to the active run and this approved pack fingerprint; late/mismatching events cannot overwrite current state. `executionEvidence` is current server evidence only within that execution; on return through a browser it too is carried history and must be recomputed.

| Evidence basis / legacy field | v3 treatment |
| --- | --- |
| `code_check` | Named mechanical result with reason and matching text/facts fingerprints. Covers specific structure/reference/identity/copy/duplicate/premise/safety checks, not universal semantic truth. |
| `writer_hint` | Model claims about choice, dimensions, or context references; never independent verification. |
| `independent_review` | Exact-text judgment with reviewer/evidence reference and fingerprint. Browser-carried claims of review remain unverified unless resolved against trusted evidence; no new verification service is required. |
| `not_evaluated` | No independently established judgment for this text/property. Unknown never becomes `false` or a hard-coded `true`. |
| `self_check.independent_natural_questions` | Omit; use `semantic_evaluations.naturalness` and `standalone_request`, normally `not_evaluated` at runtime. |
| `self_check.verified_inputs_only` | Omit; separate recomputed projection-permission checks from semantic `input_adherence`, normally `not_evaluated`. |
| Remaining seven baseline `self_check` members and any newer ones | Inventory every member/consumer at G3. Migrate actual mechanical assertions to named checks; preserve semantic/ambiguous claims as explicitly unevaluated or legacy declarations. Omit the whole object in v3. |
| Per-prompt `inputs_used` | Omit in v3; use per-slot `context_provenance`: recorded `supplied_fields`, `permitted_fields`, optional `writer_claimed_refs`, and separately evidenced `supported_fact_refs`. None means observed model use. |

**Trust and reconciliation:** generation code records what it supplied and the context policy it used. Once that record returns through a browser, label its transport basis `client_carried`; it does not authenticate its asserted origin or contents. Server-owned `executionEvidence` binds to the submitted strings and current facts, recomputes current mechanical checks, and records the applied server guard policy. For a known recorded context-policy version, recompute its permissions to check the carried account without replacing recorded supplied fields with the legacy matrix allowlist. Unknown policy versions yield an unevaluated historical account, not fabricated provenance.

Missing evidence means unknown provenance; ordinary v2 requests remain executable. Unknown evidence versions are retained as bounded opaque diagnostics with an unsupported-version status, never interpreted as v3. Malformed known evidence is marked invalid and excluded from active judgments; preserve only a bounded diagnostic record. Cap accepted diagnostic data at 64 KiB; discard oversized diagnostics with a reason while retaining existing whole-request limits. These cases do not block an otherwise mechanically valid audit or authorize weaker guards. A structural/identity/safety failure still blocks regardless of metadata.

Changed strings retain original suggestion provenance but stale their text-specific hints and reviews; current semantic status is `not_evaluated`. Changed facts also stale facts-dependent claims. Compare fingerprints server-side rather than trusting a browser's stale flag. Current fingerprints/checks belong in `executionEvidence`; generation versions never become the current server version. Missing evidence cannot bypass the established fact-change/reapproval flow, observation binding, or resume checks. An unreviewed mechanically valid suggestion or permitted customer edit remains executable.

Closure must exercise actual generation-response parsing → client storage/restoration/editing → client request serialization → run parser → lock → downstream replay. A helper that receives evidence directly does not prove the transport.

## 5. Guard and language policy

### 5.1 Explicit punctuation amendment

The inspected v2 validator requires exactly one `?` at the end; it does not classify Indonesian grammar. R5 intentionally changes that mechanical restriction for compatible-008. This avoids rejecting a good direct request solely because it uses ordinary punctuation.

| Path | Applicable form contract |
| --- | --- |
| v3 generation, repairs, fallback | One independently understandable consumer question or direct request; natural terminal `?`, `.`, `!`, or no terminal punctuation is allowed. Semantic quality is evaluated on the exact text under §§2/8. |
| Prepared-client edits, approval, execution after compatible-008 activation | Remove the mandatory final `?`. Keep existing nonempty/minimum/maximum-length checks; reject more than one `?`, and if one is present require it at the end after trimming. No Indonesian grammar classifier or semantic edit gate. |
| Before activation; new v2 generation; unprepared clients | Preserve shipped v2 form behavior and writer/fallback instructions, including command-plus-`?` forms. |
| After writer rollback | New suggestions follow v2; compatible prepared-client/server validation continues to accept already-approved v3 requests with ordinary punctuation. |

Apply the compatible mechanical rule to v3 finalization too. One-request semantics cannot be proven by punctuation; preserve demonstrable existing protections, independent generation review, and the non-blocking purpose-drift warning. Do not add a simplistic sentence counter that mistakes abbreviations for multiple requests. Remove obsolete copy demanding a question mark only in the prepared compatible path.

Freeze paired examples before writer/rubric evaluation:

| Exact text | Semantic judgment | Compatible punctuation / legacy punctuation |
| --- | --- | --- |
| “Cariin jasa cuci AC di Depok yang bisa datang ke rumah.” | Valid direct-request form and recommendation opportunity, given the confirmed service context. | Pass / fail |
| “Ada rekomendasi jasa cuci AC di Depok yang bisa datang ke rumah?” | Same valid opportunity. | Pass / pass |
| “Rekomendasikan toko laptop di Depok?” | Grammar alone does not disqualify it; assess naturalness and slot/context fit. | Pass / pass |
| “Bandingkan Aruna dengan Bima berdasarkan biaya dan jangkauan layanan?” | Permitted form; use identity-valid slot-9 facts and relation. | Pass / pass |
| “Jelaskan kenapa AC saya tidak dingin.” / “Kenapa AC saya tidak dingin?” | Both fail generated unnamed recommendation opportunity: advice can satisfy them without entities. | First pass/fail; second pass/pass |

“Pass” here covers only the named property, not blanket slot, identity, safety, or execution approval. No historical label or caller capability can exempt text from other protections. Preserve ordinary approved `Bandingkan …?` history without a privileged fixture exemption.

### 5.2 Guard and answer-level pairs

Narrow overbroad token checks: a requested preference is not a claim that the audited business satisfies it. Equipment diagnosis depends on the text/category. Named examples must occupy identity-valid slots.

| Property | Allow under the relevant guard | Reject / retain conservative handling |
| --- | --- | --- |
| Superlative preference | “Toko laptop mana di Depok yang pilihannya terlengkap untuk kebutuhan kuliah desain?”; also `paling lengkap`. | Unsupported premise that Aruna is the most complete store. |
| Price preference | “Jasa cuci AC mana di Depok yang termurah untuk dua unit?”; also `paling murah`. | Unsupported premise that Aruna is cheapest. |
| Warranty preference | “Penyedia servis AC mana yang menawarkan garansi pengerjaan?” | Unsupported lifetime warranty or guaranteed-outcome premise. |
| Equipment diagnosis | Ask which AC services diagnose damage before replacing parts; also `memeriksa penyebab`. | Personal cancer-diagnosis suitability; mixed human/equipment text remains conservative. |
| Regulated discovery | Ask which dental clinics offer online registration. | Personal drug suitability, clinical winner claims, or promised cure; retain restrictions even without guarantee tokens. |
| Unknown facts | Open requests for providers satisfying preferences. | Unsupported stock, certification, availability, price, reputation, policy, or outcome premises. |
| Retailer answer level | Ask for stores to consider when buying a laptop. | Asking only which laptop model to buy when auditing a retailer. |
| AC service answer level | Ask for providers to inspect/clean/repair an AC. | Asking only which AC brand to buy when auditing a service. |

The product/model questions become legitimate when that is the confirmed competitive scope. Independent review also covers informational requests, forced recommendation phrasing, context-free choices, target fingerprints, personas, overload, paraphrases, and misleading metadata. Labels cannot certify these. Test guard pairs across finalization, edits, approval, and locked execution using the actual policy dispatch.

## 6. Recovery, policy delivery, and compatibility

### 6.1 Two generation-failure outcomes

Retain the existing compatible error string; capable clients also receive bounded structured codes and correction targets.

| Outcome | Trigger | Customer action |
| --- | --- | --- |
| `INPUT_CORRECTION_REQUIRED` | Demonstrated missing/conflicting facts necessary for the confirmed scope or a safe meaningful pack. | Preserve facts; explain the deficiency and link to the existing relevant fact-edit destination. No provider call on unchanged known-invalid facts. |
| `GENERATION_TEMPORARILY_UNAVAILABLE` | Provider/structure/finalization failure with no usable fallback and no demonstrated fact deficiency. | Preserve facts; existing bounded retry with provider/finalization telemetry. |

Examples of deficiencies: one-offering scope without an offering, conflicting role/scope, or absent locality for a confirmed task that actually requires it. Optional missing channels and unknown semantic quality are not input errors. Use existing correction screens; no universally required intake fields or persistent failure-cache service.

Concrete copy: “Pertanyaan audit belum dapat dibuat. Lengkapi produk atau layanan yang ingin diaudit.” → “Perbaiki data brand”. Transient failure offers “Coba lagi”. G5 proves the actual destination, or the established support recovery when the flow cannot correct that fact.

Server preflight is authoritative across reloads. Exercise invalid facts → correction with zero calls → unchanged retry with zero calls → existing edit destination → corrected revision → one generation attempt → review → explicit start. Separately prove transient retry, mixed/full fallback disclosure, and late-response handling.

### 6.2 Authoritative policy delivery without generation

The prompts route owns writer dispatch. Add optional request-root `questionPolicyCapability: "nuave.question-policy.v3"` without wrapping/replacing the brief. Strip negotiation fields before projection. Capability advertises support; it is not authorization or pack provenance.

Add **`GET /api/audit/question-policy`**, implemented at `src/app/api/audit/question-policy/route.ts`. Prepared clients send header `X-Nuave-Question-Policy-Capability: nuave.question-policy.v3`. Use the same authentication/access rules as the audit bootstrap. It takes no business facts, makes no provider call, consumes no audit budget, and does not modify packs. Client fetch and server response both use `no-store` behavior, including `Cache-Control: no-store`.

One code-owned resolver supplies this response and the same fields on capable generation responses:

```ts
type QuestionPolicySnapshot = {
  policyProtocolVersion: "nuave.question-policy.v3";
  policyRevision: number; // monotonically increasing safe integer
  selectedGenerationPolicy: "v2" | "v3";
  sharedGuardPolicy: "legacy-v2" | "compatible-008";
};
```

The revision is a deployment/configuration value, incremented whenever either policy changes and never rolled back numerically. It needs no per-user persistence service. The writer and shared guard choices are independent; saved pack generation/evidence versions do not select current guards.

**Prepared-client reconciliation:**

1. Fetch on restoration/initial review entry. A saved snapshot is a hint, never authoritative. Preserve confirmed facts, exact questions, approval state, and edits while checking.
2. Fetch again for every approval/start action **before any policy-dependent local blocker can return**. This covers an indefinitely open pre-activation page that never regenerates. Coalesce requests within one action, but do not reuse a previous action's cached result. Typing/saving draft edits must not be rejected or discarded by stale policy; policy-sensitive feedback waits for reconciliation.
3. Correlate requests with a client sequence and the active workflow. Ignore superseded responses and responses with a revision lower than the last accepted snapshot. An ignored response cannot satisfy the current action's required refresh. Unknown protocol/guard policies require the existing supported update/recovery flow.
4. If the read fails or times out, preserve the draft and show retryable readiness failure: “Kesiapan audit belum bisa diperiksa. Coba lagi.” Do not execute, regenerate, call it bad brand data, or silently select legacy guards. Freeze a bounded timeout at G4.
5. Bind approval to a snapshot of facts, IDs, and exact text. If any changes while reconciliation awaits, return to review; do not execute a different snapshot. After success, validate and serialize that same approved snapshot with the received policy.

Capable run requests add `questionPolicyCapability` and `questionPolicyRevision` alongside §4.3's independent `questionEvidence`. The server selects its own current policy, keeps the existing `client_contract_version` gate, and checks revision before lock/provider/budget effects. A missing, malformed, or mismatching revision for recognized capability returns **409 `QUESTION_POLICY_CHANGED` plus the current snapshot**, with zero paid work. The client may reconcile/revalidate and retry this pre-execution rejection once for unchanged approved text; repeated mismatch returns readiness recovery. Never automatically repeat a run after an ambiguous network/provider failure. Missing/unknown capability follows the existing run-contract/error path and cannot select weaker validation.

Generation responses may refresh policy state but are not the only delivery mechanism. Accept a generation result only for its current facts/request; a delayed generation response must not downgrade a newer shared policy. Its recorded selected writer remains its own provenance.

### 6.3 Activation, old clients, and rollback

| Stage | Prepared capable client | Absent/older/unknown generation capability | Server/readers |
| --- | --- | --- | --- |
| G0–G6 customer route | v2 generation and legacy-v2 shared policy; prepared code may ship inert. | Complete v2 writer, response, and recovery vocabulary. | v3 only in explicit internal evaluation; route defaults stay legacy. |
| G7 activation | Evaluated v3 writer; compatible-008 guards/form via §6.2. | Complete v2 generation/response/errors until a tested upgrade. | Compatible shared validation and dual-version readers; old valid v2 remains accepted. |
| Writer rollback | New suggestions use v2; compatible-008 stays active. | Complete v2 generation/response/errors. | Keep compatible readers, punctuation, guards, policy endpoint, and evidence transport; approved v3 stays executable. |

The unchanged v2 generator/finalizer is isolated from shared-policy corrections; an old client must not receive v3-only `termurah` wording, ordinary-punctuation output, or unfamiliar correction codes. The server's compatible execution policy remains authoritative for all submissions after activation. Unprepared clients retain their local limits until upgraded.

At G5, rehearse against actual bundles and real route/state parsers in isolation, using provider stubs where possible:

- Hold the actual unprepared pre-cutover bundle open across activation. Prove v2 dispatch/errors, existing run-contract acceptance, review/start, and its real correction/update path. Preserve facts, edits, and approved wording through an upgrade; prove storage restoration before relying on reload.
- In the **prepared pre-activation bundle**, generate/save a v2 pack; activate; edit to an otherwise valid `termurah` request; approve/run without regeneration. Repeat after restoration and after writer rollback. Repeat with ordinary-punctuation direct requests. Assert zero generation calls during reconciliation and exact text at execution.
- Exercise stale out-of-order policy replies, failed reads, mid-await edits/fact changes, a policy-revision race at run, and a delayed generation reply. No stale local guard may prevent the policy read.
- Generate new v3 after activation and exercise correction, review/edit/start. Use a new browser against the rollback server, including a newly generated v2 `Bandingkan …?` fallback.

Separately replay ordinary approved pre-008 wording, unreviewed v3 suggestions, approved v3 requests, and permitted edits through actual saved-state/request/lock/observation/report paths. Verify exact text, matrix classes, evidence staleness, and fixed-observation report equality. Preserve existing explicit pre-canonical historical adapters only where already required; ordinary v2 replay must not depend on a test-only history exemption.

Simultaneous deployment is not proof of compatibility. Never roll back to a binary unable to read or execute approved packs. Record the supported oldest bundle, tested rollback ref, safe dispatch telemetry, and compatibility retirement owner. Retire the narrow old-client branch only with enforceable session expiry or a verified update flow; quiet traffic and elapsed time do not expire indefinitely open tabs. If state-safe recovery is unavailable, G5 stays blocked.

## 7. Execution gates

Read current `AGENTS.md`, repository entry points/workflow, this packet/ledger, then only relevant code/evidence. Existing authorization remains valid; prepare concrete experiments/release changes before requesting any authorization the repository requires. A blocked paid gate permits offline preparation, not downstream implementation that depends on its result.

| Gate | Bounded work | Required exit evidence |
| --- | --- | --- |
| G0 — Adopt/baseline | Locate Spec 008; record branch/base, actual provider/settings, deployed/old client bundle, approved intake handoff, question limits, and current correction/restoration paths. Inspect matrix and affected domain docs. | Adopt R5's explicit amendments; reconcile `docs/AUDIT.md`, `docs/PROMPT_GENERATION_CONTEXT.md`, `docs/journey/04-questions.md`, and active pointers. Preserve source hashes and an ordinary historical pack. No conflicting authority. |
| G1 — Facts/context | Dormant pure adapter, optional approved facts seam, one §3.2 map, demonstrable sufficiency checks. | Actual parsing/projection fixtures for scope, locality, channels, needs, identity/privacy, absence, conflict, revisions, and correction targets. |
| G2 — Evaluation freeze | Dormant writer/schema/parser and minimal finalizer/fallback prototype; freeze pilot and release comparison rules, input partitions, blind rubric, configurations, budgets, and numerical ceilings. | Offline bounded-selection checks and all §8.3 decision counterexamples. Pilot packet ready; provider feasibility unproven. |
| G2P — Pilot | Authorized exact-provider §8.1 pilot or valid matching captures. | Whole-contract/component decisions; exact proposed production configuration and any R-10/R-16 amendments. Required before G3–G5 plumbing. |
| G3 — Finalizer/evidence | Implement adopted §4 in provider/live adapter and schemas. Inventory every legacy field/consumer, including downstream replay requests. | Bounded recovery/origins, truthful diagnostics, no unmapped `self_check` consumers, strict writers and compatible readers. Customer dispatch still v2. |
| G4 — Server/policy/history | Implement §§4.3/5/6.2 at actual parsers/lock/policy/run boundaries; freeze policy timeout. | Form/guard pairs, evidence transport through client serializer and server parser, absent/invalid/unknown diagnostics, no semantic edit gate, policy-race preflight, historical/report/rollback regressions. |
| G5 — Actual client/recovery | Re-read current intake handoff; integrate prepared client, restoration, correction targets, prompts dispatch, and customer errors. | Full §6.3 actual-bundle matrix and §6.1 correction flow. Concrete correction/readiness copy/action review under applicable workflow. No state loss or generation during policy reconciliation. |
| G6 — Integrated release evidence | Exact integrated configuration, §8.2 plus acceptance index; normal offline verification/CI. | All absolute, held-out simplicity, component, resource, transport, browser, historical, and rollback gates pass. Production still v2. |
| G7 — Activate/close | Applicable release authorization; activate resolver revision and evaluated v3 dispatch; retain compatibility; update pointers and remove temporary evaluation access. | Actual generation → review/edit → explicit execution smoke, replay, deployed/config versions, rollback and compatibility retirement record. |

Only the minimum prototype needed for G2P precedes it. Intermediate deployments must preserve dormant customer dispatch; prove behavior at actual routes. A failed gate records a concrete next action, not a claim of completion based on document detail.

## 8. Evaluation and decisions

Freeze inputs, variant instructions, rubric/decision rules, configurations, numeric resource ceilings, and authorized maximum attempts before outputs or tuning. Freeze the rubric, not reviewer answers. Use privacy-safe fictional or approved public business facts. Disable automatic SDK/transport retries; every attempted provider request counts, including failures. Capture request/response versions, finish reasons, parse outcomes, raw/final wording, repair/fallback origins, usage/cost, and latency. No manual output repair, hidden retry, post-hoc threshold, or per-case policy selection.

Reviewers must be independent of the writer/implementer. Blind variant identity; review exact final text and confirmed facts, then canonical purposes, then metadata for diagnosis. The founder adjudicates disputed critical judgments. Arrange independent review through the approved workflow; any paid reviewer-model calls need their own existing/new authorization. Naturalness: **0 implausible; 1 needs rewriting; 2 plausible with minor issues; 3 natural/clear**.

**Usable final pack:** all structural/identity/slot/purpose/safety requirements pass; every unnamed text satisfies §2.1; six materially distinct consumer decisions; every text scores ≥2; named purposes remain intact; and at least one unnamed request offers a legitimate implicit recommendation opportunity without needing an explicit recommendation formula. This is an evaluation criterion, not a keyword quota or runtime semantic gate.

**Comparison rule, used unchanged at pilot and held-out retention:** rich must produce usable packs for all scheduled attempts. Its mean unnamed naturalness must not be lower on any matched attempt. A material win is a usable rich pack where simple is unusable, or an unnamed mean advantage of ≥0.5 with all required properties intact. A business counts once regardless of repeats; at least one attempt must win and every scheduled repeat must meet non-regression. A missing final pack scores zero for comparison and is unusable; an available but defective pack is scored honestly. Fewer fallbacks alone, better labels, and pilot replay are not customer-quality wins.

### 8.1 G2P: whole contract, then components

Four sufficient inputs: local AC with approved home visits; multi-brand laptop retailer; B2B SaaS; sparse sufficient consumer-product scope. Preselect AC for a second attempt: **five rich and five new simple-control attempts, at most ten primary calls**.

The simple control uses the same confirmed projection and consumer-intent, form, identity, safety, and context instructions, returning ten final strings in canonical order without returned market/decision metadata or reserves. Apply matching mechanical/fallback protections. It is an improved writer control, not the old v2 writer or a reconstruction of the unavailable successful experiment.

Keep provider/model/sampling fixed; prefer equal authorized output caps. Before calls freeze absolute cost/token/latency/timeout ceilings and maximum permitted incremental mean cost and latency for rich versus simple. Record any variant-specific cap explicitly. Configuration changes require bounded, versioned re-evaluation.

Derive these offline from each rich response using identical guards/fallbacks:

| Portfolio | Algorithm and attribution |
| --- | --- |
| P — primary-only | Ignore reserves and coverage; apply bounded fallback when needed. Record raw-primary validity separately. |
| M — minimum repair | §4.2 default ranking; M–P measures mechanical rescue and avoided fallback without text regression. |
| C — coverage-selected | §4.2 coverage ranking; C–M measures actual final wording/decision improvement when M was already mechanically valid. Labels alone do not count. |

**Decision A:** a fixed rich variant must complete all five structured responses without truncation, produce five usable packs, materially beat simple on at least **two distinct pilot businesses** under the comparison rule, and meet all absolute/incremental resource ceilings. Fallback cannot count as successful serialization. If quality and usable-pack reliability tie, choose simple for amendment; if both are inadequate, stop.

**Decision B:** reserves require ≥1 M–P mechanical rescue/avoided fallback without final-text regression, or independently justified C–M benefit. Coverage requires ≥1 independently reviewed material consumer-decision/wording gain in C–M on a mechanically valid M, with no C-caused final-text regression. Freeze examples defining such gains at G2. Mechanical-only rescue cannot justify coverage. Retain only a fixed variant passing both decisions; equal outcomes favor the simpler variant.

Record amendments before adopting simple, removing reserves, or changing metadata/schema. Removing reserves changes the provider request, so a replay that merely ignores them cannot establish feasibility of the revised request. Reuse captures only under exact request/configuration matches; otherwise obtain bounded affected evidence. A second call or provider substitution is a separate decision. Close G2P before production plumbing.

### 8.2 G6: integrated release and held-out retention

| Set | Frozen coverage |
| --- | --- |
| D1–D8 development | Local AC; venue/café; multi-brand retail; consumer product/brand; B2B/SaaS; professional service; safe regulated discovery; sparse sufficient scope. |
| H1–H4 held out | One location of multi-location service; retail with limited fulfilment/reach; remote B2B/professional; different regulated category with sparse sufficient facts. |
| Repeats | Second attempts for D1, D3, D5, H1, chosen before output. |
| Offline | Invalid/conflicting input, absent channels, copy traps, misleading metadata, fallback variants, races, edits, evidence migration, history, actual stale bundles, rollback. |

Freeze held-out facts, output access, scoring, and call assignment at G2. No writer/fallback/selector tuning uses held-out output. Pilot/tuning cases are never held out. Interleave comparison requests in a predeclared order to reduce temporal provider effects. Both variants receive the same confirmed inputs.

| Selected production contract | Selected v3 attempts | Actual v2 attempts | New simple-control attempts | Maximum new primary calls |
| --- | --- | --- | --- | --- |
| Rich | D1–D8 + H1–H4 + four repeats = 16 | D1–D8 + D1/D3/D5 repeats = 11 | H1–H4 + H1 repeat = 5 | **32** |
| Simple adopted by amendment | Same 16 | Same 16 | None; selected v3 already is the exact simple contract | **32** |

v2 retains its actual minimizer, instructions, and finalization. Prior captures can replace scheduled calls only when inputs, provider/settings, instructions/schema/request versions, and complete attempt history match. Apply the integrated finalizer and record both versions. Previously viewed captures cannot replace fresh held-out evidence.

Release requires all of the following:

1. **Absolute quality:** all 16 selected-v3 attempts produce usable final packs under bounded recovery. Review exact final text including fallback. Every pack retains canonical IDs/order/slot-9 relation/report metadata and §5 form.
2. **v2 comparison:** mean naturalness across all ten texts, grouped by each frozen input over its scheduled repeats, is no worse than matching v2. This covers D1–D8 (11 attempts) when rich is selected and all D/H inputs (16 attempts) when simple is selected. Do not claim a v2 comparison for unpaired held-out cases; absolute quality still applies to them.
3. **Writer contribution:** ≥15/16 structurally complete responses; ≥14/16 final packs retain at least five model-written unnamed texts; ≤2 full-fallback packs. Report every partial fallback, repair, failure, and truncation. A model-written text retains provider wording apart from harmless formatting; substituted/paraphrased repairs do not qualify.
4. **Held-out rich-versus-simple retention:** for rich, run the five specified simple-control attempts and apply the frozen comparison rule to all five matched pairs. Require material wins on **at least two distinct held-out businesses**, no pair-level naturalness regression, and the frozen absolute/incremental resource ceilings. H1's repeat is not a fifth business. Ties or failure block rich activation even if rich beats v2, has component benefits, and replays every pilot win.
5. **Regression and attribution:** when rich is retained, matching pilot replay through integrated finalizers must preserve Decision A/B; label it regression evidence only. For each retained selection component, repeat P/M/C attribution on release captures: ≥1 relevant observed benefit and no component-caused final-text regression. Reserve-only rescue cannot retain coverage. These checks supplement fresh held-out simple comparison. When simple was adopted, replay its matching pilot captures for quality regression; removed components have no attribution gate.
6. **Baseline and mechanics:** preserve a real attributable v2 natural-but-informational example. If sampled v2 does not reproduce it, cite a separate historical example without discarding successful v2 calls. All offline recovery/transport/browser/history/rollback checks pass; `npm run verify` and required CI run without paid calls.
7. **Resources:** numerical mean-generation-cost and empirical p95-latency ceilings frozen before calls pass, using the actual route timeout/output cap. Count failures and recovery in customer-visible generation latency. Report individual observations and nearest-rank p95 (`ceil(0.95 × n)`); distinguish overall selected-v3 results from the five-pair held-out incremental comparison. Small samples do not establish population tail reliability.

If rich fails retention, **do not switch to simple and declare release passed**: five held-out simple attempts do not cover the 16-attempt integrated gate. Record the failure, amend the selected contract, and obtain missing/affected evidence under a declared budget. If changing instructions, schema, fallback, or selector after seeing H outputs, retire those inputs from held-out status and use a new frozen held-out set. Unchanged development evidence can be reused with explicit version/input matches. Component removal that changes the request also requires affected feasibility evidence.

These are bounded engineering selection criteria, not statistical proof or certification of arbitrary future outputs. Stop optional testing after the declared gates pass; failed gates require specific repairs/evidence, not another open-ended planning round.

### 8.3 Frozen decision counterexamples

Use synthetic results to check the decision rules before provider calls; they are rule tests, not performance evidence:

| Synthetic outcome | Required verdict |
| --- | --- |
| Rich equals simple in final quality/reliability, costs more, and rescues one bad rich primary. | Fail Decision A; self-rescue cannot retain rich. |
| M repairs a defect; C only changes dimension labels on an already valid M. | Reserves may earn support; coverage does not. |
| Rich wins pilot and beats v2, but ties or loses the declared held-out comparison against simple. | Fail rich release regardless of pilot replay/component benefit. |
| Rich wins twice on H1 and nowhere else. | Fail the two-distinct-held-out-business requirement. |
| One implicit direct request and an equivalent interrogative have equal intent/quality. | No semantic penalty for direct-request grammar; score punctuation separately under §5.1. |
| Missing evidence accompanies mechanically valid exact text. | Execution remains possible; provenance/evaluation stays unknown. |

## 9. Repository handoff and single execution ledger

At G0 place the adopted file as `NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md` in the existing Spec 008 package. Record its exact path and adoption commit here; redirect stale entry points. Keep one `VERIFICATION.md` evidence index plus normal fixtures/captures. This ledger tracks Spec 008 gates; normal `NOW.md` and decision-log updates point here rather than duplicating gate state.

Each session reads current instructions/packet/ledger, checks branch/base and existing edits, and picks the first dependency-ready incomplete gate. Inspect its actual boundaries, do bounded work, and run meaningful checks. Record exact commit/configuration, result, blocker, and next action. Commit/push only under applicable repository instructions and existing explicit authorization; chat completion alone cannot provide a cross-device handoff. Respect the current approved intake handoff and parallel changes. No competing per-session plans.

| Adoption / configuration record | Value |
| --- | --- |
| Canonical path / adopted revision commit | `specs/008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`, adopted at `ab8336b4b9a79051b1ce9b4c7cfe13156bf45d92` on branch `docs/spec-008-recommendation-eligible-questions` over `main@e531ff4653c324007eb049bee93f2a3b922cf216` (unchanged since Review 5's inspection). Review 5 artifact committed beside this file at `NUAVE_SPEC_008_ADVERSARIAL_REVIEW_5.md`; provenance hashes in `VERIFICATION.md`. |
| Actual runtime/provider, intake handoff, old bundle and recovery path | Repo evidence at baseline: question writer `NUAVE_QUESTION_PROVIDER=opencodego` (production-pinned; openai/gemini/openrouter testing-only), `gpt-5.6-luna` via `OPENAI_AUDIT_MODEL`/`AUDIT_MODEL`, endpoint `https://opencode.ai/zen/go/v1`, reasoning `low`, `INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS=2048`, no search (one bounded call + deterministic Indonesian fallback). Intake handoff: `BusinessBrief` JSON to `POST /api/audit/prompts`; `src/lib/intake/` does not exist at baseline — PR #46 `feat/airbnb-intake-rebuild` remains OPEN at `afd518dd75d436319c7a5f1c31db9d640e2728d3` with question wiring still unowned by intake; PR #47 (cheaper-inference experiment) also open, neither merged into this baseline. Deployed/old client bundle: partially verified via Cloudflare API 2026-09-11 — worker `nuave-v2` serves `v2.nuave.ai` (production); live deployment `bcd725e5-1916-4e70-84c0-65491228960a` → version `a4540241-08e2-4612-bbc2-d0a89905bfed` at 100%, deployed 2026-09-02T10:09Z — 7 minutes after the `e531ff4` merge via the merged-PR deploy gate, so the live bundle maps to `main@e531ff4653c324007eb049bee93f2a3b922cf216`, the same commit R5/Review 5 inspected (predates PRs #46/#47 and this adoption); compat `nodejs_compat`, date 2026-08-01; bindings: `ASSETS` + three rate limiters only — **zero secret/plain-text bindings**, so served provider config is code defaults (no `OPENCODEGO_API_KEY`/`NUAVE_QUESTION_PROVIDER` bound at platform layer; whether live generation on v2.nuave.ai currently succeeds is an open operational question). The actual unprepared-bundle rehearsal against this deployed build remains a G5 verification item. Recovery path: pre-start fact correction regenerates the pack under the same order; post-start runs lock; state persists in browser `sessionStorage` only. |
| Effective text limits, legacy form, current client/run contract | Question text max 700 chars; v2 legacy form requires exactly one terminal `?` (compatible-008 punctuation per §5.1 is NOT active). Run request: `client_contract_version` literal + `prompts` array of exactly 10 canonical prompt cores; legacy `inputs_used`/diagnostics tolerated. Client serializes `promptPack` through `AuditWorkflow.tsx` and restores via `sessionStorage`. `{ brief }` parses via `businessBriefSchema`; failures return a generic 400 — correctable-fact classification per Review 5 F-01 is open G1/G5 work. |
| G2 input partitions, rules, configuration hashes, numeric absolute/incremental ceilings and authorization | Pending G2 |
| Pilot decisions, chosen contract/components, amendments | Pending G2P |
| Policy resolver revision, GET timeout, concrete evidence consumers | Pending G4 |
| Release configuration, authorized allocation and evidence | Pending G6 |
| Deployed configuration, rollback ref, retirement owner/condition | Pending G7 |

| Gate | Status | Commit / evidence | Next action |
| --- | --- | --- | --- |
| G0 | In progress | `ab8336b4b9a79051b1ce9b4c7cfe13156bf45d92` (R5 adoption + superseded-plan retirement + routing); baseline facts recorded above; Review 5 committed as provenance; `SPEC.md` founder-approved 2026-09-11; deployed-worker settings verified via Cloudflare API; live bundle mapped to `main@e531ff4` (above) | Confirm whether live generation on v2.nuave.ai works with zero bound secrets; keep `fixture-kopi-taman-senja.ts` (`NVA-FIKTIF-001.questions.v1`) as the preserved ordinary pack; then G1 after this adoption lands on `main`. |
| G1 | Not started | — | Map confirmed context and correction targets. |
| G2 | Not started | — | Freeze evaluation and rule counterexamples. |
| G2P | Not started | — | Prove feasibility and retained complexity. |
| G3 | Not started | — | Implement selected finalizer/evidence contract. |
| G4 | Not started | — | Implement policy delivery and actual wire/history boundaries. |
| G5 | Not started | — | Prove client transitions, exact state preservation, and recovery. |
| G6 | Not started | — | Pass integrated absolute and comparative release gates. |
| G7 | Not started | — | Activate the evaluated configuration and record rollback. |

## 10. Acceptance evidence index

Earlier AC IDs remain traceability labels, not additional hidden requirements. Link each row to concrete `VERIFICATION.md` evidence before activation.

| Criteria / findings | Owning clauses and exit |
| --- | --- |
| AC-01 | Attributable baseline failure: §8.2, G0/G6. |
| AC-02/03/05/06/07 | Commercial choice, entity demand, correct peers, criteria, distinctness, naturalness: §§2/8, G2P/G6. |
| AC-04/04A | Identity/copy/openness; facts, preferences, inference: §§3–5, G1/G3/G6. |
| AC-08 | Matrix/report invariants and sole v3 context exception: §§2.2/3.2/6.3, G1/G4. |
| AC-09/10 | Slot 2/4/6, mixed/full fallback, actionable correction: §§4.2/6.1, G3/G5/G6. |
| AC-11/11A; Review 3 F-03; Review 4 F-03 | Implicit opportunities, guard pairs, explicit punctuation amendment, historical forms: §§5/6.3/8, G4–G6. |
| AC-12 | Ordinary historical/v3 replay, exact text/provenance: §§4.3/6.3, G4/G5. |
| AC-13/14 | Complete minimized facts, intake seam, no leakage/search, revisions/races: §§3/6, G1/G5. |
| AC-15 | Independent final-text review and offline verification/CI: §8, G6. |
| AC-16/17; Review 3 F-04; Review 4 F-04 | Finalizer ownership; truthful evidence, actual wire transport, unknown/edited/unreviewed execution: §4, G3–G5. |
| AC-18; Review 3 F-02; Review 4 F-02 | Dormant dispatch, current policy without regeneration, old/prepared/new bundles and rollback: §§6.2–6.3, G4–G7. |
| AC-19; Review 3 F-01; Review 4 F-01 | Exact attempts, simplicity/component decisions, fresh held-out controls, resources, frozen counterexamples: §8, G2/G2P/G6. |
| AC-20 | Authority, committed evidence and resumable ledger: §§1/9, every handoff. |
| Review 2 F-01–F-04 | Retained correct-peer/context/correction/early-feasibility contracts: §§2/3/6.1/8.1. |

Completion means the exact evaluated configuration is activated with compatible approval/execution, recorded final-text and regression evidence, functioning customer recovery, and a repository-contained handoff sufficient to verify or roll back it. Writing this plan closes document ambiguities; implementation and empirical gates still have to produce their own evidence.
