# Spec 008: recommendation-eligible question generation

> Status: **Approved** (founder-approved 2026-09-11)
> Owner: Founder / orchestrator
> Updated: 2026-09-11
> Implements: a deeper semantic target for Nuave-generated questions: natural Indonesian consumer decisions with genuine entity-recommendation opportunity

This specification changes **how Nuave generates the suggested question pack**. It does not change the audited entity, the canonical ten-slot composition, the report method, or the customer's existing wording-edit contract unless this spec explicitly says so.

## Required context

Read in order:

1. `AGENTS.md`
2. this `SPEC.md`
3. `docs/AUDIT.md`, especially **Scope of one audit**, **Question rules**, and the distinction between appearance/recommendation/comparison/information
4. `docs/PROMPT_GENERATION_CONTEXT.md`
5. `docs/journey/04-questions.md`
6. `src/lib/audit/measurement-matrix.ts`
7. `src/lib/audit/questions-id.ts`
8. `src/lib/audit/questions-id-provider.ts`
9. the directly relevant tests beside those files
10. `NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md` in this package when implementing — the sole current execution authority and cross-session ledger (the older `EXECUTION_PLAN.md` is superseded and redirects there)

At the intake-integration package only, also read the then-current `src/app/audit/intake/` data handoff and its approved contract. The planning baseline on 2026-09-07 was PR #46 (`feat/airbnb-intake-rebuild`), which closed unmerged; the intake module actually landed at `src/app/audit/intake/` via PR #49 (Spec 007 R-27 intake recovery, merged 2026-09-11) with question-generation dispatch still owned by `AuditWorkflow` → `POST /api/audit/prompts`, not by the intake module.

Do not load `archive/`, superseded prompt-generation experiments, or prior drafts unless a task explicitly names them for regression evidence.

## Problem

The current question writer already does several things well:

- it writes natural Indonesian rather than translating a fixed English template;
- it uses one canonical 6-unnamed / 4-named measurement matrix;
- it tells the model to understand buying context and vary the customer job;
- it blocks identity leakage, invalid composition, unsupported premises, malformed questions, and slot-9 comparison errors; and
- it preserves the exact customer-approved pack and generation provenance.

But its semantic architecture still goes essentially:

`confirmed brief -> one model call -> ten final question strings -> mechanical validation/repair`

That leaves a large failure space. A question can be natural, slot-shaped, mechanically valid, and still be weak for Nuave because a helpful AI can answer it completely with explanation or generic advice and never need to name a business, provider, store, product, or brand.

Examples of the failure class include troubleshooting, definitions, education, generic how-to, and broad informational questions. They are not linguistically wrong; they simply create weak business-visibility measurement opportunities.

The current code also has no explicit market-abstraction object, no first-class consumer-decision-situation object, no entity-demand or competitive-openness validation, no target-fingerprint guard beyond identity leakage, and only exact-text duplicate detection rather than portfolio-level semantic diversity.

One current mechanical rule also overreaches relative to the new target: `INDONESIAN_UNSUPPORTED_PREMISE_PATTERNS` rejects words such as `terlengkap` or `termurah` anywhere in a question. The new target permits a consumer to **ask which option best satisfies a criterion**; that is different from asserting without evidence that a named entity already has that property. Spec 008 must preserve unsupported-claim safety without treating every comparative/superlative preference as a false premise.

## Desired outcome

When Nuave prepares its suggested pack:

- every **unnamed** question represents a plausible consumer decision in which specific entities are a useful and expected part of a good answer;
- the decision is commercially real: the consumer is choosing, finding, buying, hiring, visiting, obtaining, shortlisting, or comparing something businesses compete to provide;
- the question remains competitively open rather than encoding the audited business's exact profile;
- the language sounds like a plausible Indonesian consumer in that category and context;
- the six unnamed questions cover meaningfully different decision situations rather than six paraphrases of recommendation intent; and
- the four named questions continue to serve their existing canonical measurement purposes.

The concise semantic target is:

> Generate natural questions about **choosing, finding, buying, hiring, visiting, or obtaining something**, not merely questions about the problem that thing solves.

This property is called **recommendation-eligible intent**. It is semantic, not a requirement to use the word `rekomendasi`. In this spec, “question” includes a natural direct request (for example, `Cariin jasa cuci AC di Depok yang bisa datang ke rumah.`); terminal punctuation is governed by the implementation plan, not by this contract.

## User and situation

The buyer has already confirmed the business information that Nuave will use for one audit. Before the audit starts, Nuave prepares ten questions for review. The buyer should see questions that feel plausible as real customer questions and that make the audit commercially meaningful by giving relevant entities a fair opportunity to appear.

The audited business is not entitled to appear. Zero appearance remains a valid result.

## Scope

This specification includes:

- the semantic target for Nuave-generated question suggestions;
- an explicit market-abstraction stage downstream of confirmed business facts;
- an explicit consumer-decision-situation stage before final wording;
- recommendation-eligibility, commercial-relevance, openness, anti-fingerprint, and portfolio-diversity checks;
- natural Indonesian realization from a sound consumer decision situation;
- a candidate-generation / candidate-selection separation for unnamed slots;
- a premise-safety rule that distinguishes consumer selection criteria from unsupported assertions about entities;
- an updated deterministic continuity fallback that respects the new semantic target;
- versioning, diagnostics, regression fixtures, and evaluation needed to make the behavior observable;
- preservation of historical approved-pack replay; and
- an integration seam from the current `BusinessBrief`/minimized brief so the generator is not coupled to a particular intake UI implementation.

## Non-scope

This specification does **not**:

- change the canonical count of 10 questions, the 6 unnamed / 4 named allocation, slot IDs, audited-brand identity policy, comparison-target identity policy, or slot-9 comparison relation;
- change `reportAssessmentClass`, report denominators, appearance counting, recommendation counting, or report interpretation;
- make every slot a `recommendation` assessment slot. A question can create entity opportunity while its canonical report class remains `comparison`, `information`, or `none`;
- change the customer's existing V1 wording-edit policy (slot ownership, fixed purposes, composition, and the no-model-assisted-purpose-validator rule) or add such a validator to customer edits. One explicit exception: the mechanical terminal-punctuation form check follows the implementation plan's compatible-008 amendment (R5 §5.1), which adoption of that plan approves;
- redesign the Questions UI or the new intake experience;
- add new required intake questions solely for generation;
- use web search during question generation;
- add a second paid/model call to the production generation path without a separate founder-approved cost decision; or
- execute questions, predict answers, optimize for the audited business to win, or write report findings.

## Experience

The customer-visible sequence remains:

`confirmed facts -> Nuave prepares ten questions -> customer reviews/edits -> customer starts audit`

No internal market model, semantic score, candidate pool, or validation metadata is shown to the customer by default. The existing truthful fallback disclosure remains appropriate when a continuity fallback materially affects the task.

The generated questions must remain concise enough to read and edit comfortably. Internal sophistication must not create longer, denser, more synthetic customer questions.

## Requirements

### Semantic target

- **R-01 — Recommendation eligibility:** every Nuave-generated unnamed question must describe a consumer choice for which naming relevant businesses, providers, stores, products, brands, platforms, or professionals materially improves a good answer. If a completely satisfactory answer can remain purely explanatory or generic, the candidate fails.
- **R-02 — Commercial decision:** every generated unnamed question must represent a real decision over something commercial entities compete to provide. The consumer is choosing rather than merely learning.
- **R-03 — Recommendation wording is optional:** eligibility must not be implemented as a keyword rule. Questions may express the choice implicitly through forms such as where-to-buy, fit-for-situation, shortlist, convenience, specialist capability, trust/risk reduction, or product choice.
- **R-04 — Named slots stay purposeful:** slots 7–10 remain bound to their existing canonical purposes. This spec does not force them into generic recommendation wording merely because the unnamed target is recommendation-eligible.

### Market abstraction before wording

- **R-05 — Market abstraction:** generation must create an internal market-level model before final unnamed-question wording. At minimum it distinguishes category/entity type, plausible customer choice jobs, ordinary decision dimensions, meaningful contexts, common choice risks/concerns, and target-specific signals that must not be copied directly.
- **R-06 — Source information is evidence, not wording material:** business facts are used to infer the decision space. They must not flow mechanically into question text merely because they exist in the confirmed brief.
- **R-07 — Target-specific versus market-level:** the generator must explicitly distinguish ordinary market dimensions from unusually specific target attributes. A target-specific attribute may influence a question only after abstraction into a legitimate broader decision dimension.
- **R-07A — Market inference boundary:** the generator may infer conservative **category-level** choice jobs, buying dimensions, and choice concerns that were not literally entered as verified business facts when they are needed to model a plausible consumer decision. These inferred dimensions are preferences or decision criteria, not factual premises. They must never be presented as facts about the audited business, a competitor, market price, reputation, availability, policy, certification, outcome, or other entity-specific state. Business-specific factual premises still require confirmed/approved input. The system must preserve this distinction in its internal provenance so “market inference” cannot become a loophole for invented brand claims.
- **R-08 — No fingerprinting:** unnamed questions must not reproduce exact target-only feature combinations, exact prices, proprietary claims, unusual specifications, slogans, or unnecessarily precise location combinations that effectively identify the audited business.
- **R-09 — Competitive openness:** a strong unnamed question must leave a legitimate field in which multiple real entities could qualify. The target should have a fair opportunity, not a guaranteed path.

### Consumer decision situation as the primary semantic unit

- **R-10 — First-class situation object:** the generation contract must model a consumer decision situation separately from the final sentence. It must be possible to inspect what choice the user is making without parsing the wording back out of the question.
- **R-11 — Situation contents:** an unnamed situation must carry a choice job, category/entity type, any genuinely material context, one to three relevant decision criteria, and an optional concern/risk when it changes the choice. Exact field names are implementation details; the meanings are not.
- **R-12 — No artificial persona injection:** context is included only when it plausibly changes the choice. The generator must not invent elaborate customer stories merely to create variation.
- **R-13 — Criteria discipline:** prefer one to three meaningful criteria. Criteria must be phrased or realized in ordinary customer language, not website or corporate language.

### Realization and portfolio

- **R-14 — Natural realization:** final questions are written only after the consumer decision situation is sound. Naturalness is not a cleanup pass that adds slang to a synthetic decision.
- **R-15 — Indonesian register:** the writer may use neutral, conversational, slightly colloquial, or naturally code-switched Indonesian according to category and audience. It must not mechanically inject slang, English, or rough grammar.
- **R-16 — Candidate and selection separation:** unnamed-question generation and final portfolio selection are separate responsibilities. The implementation must be able to reject one candidate without discarding the semantic target or silently accepting a weak mechanically valid sentence.
- **R-17 — Semantic diversity:** final selection prioritizes different decision situations/intent families over paraphrase diversity. Exact-string distinctness alone is insufficient.
- **R-18 — Portfolio quality:** the six unnamed questions are evaluated both individually and as a set. An individually valid candidate may be omitted if it adds little decision coverage beyond selected questions.

### Canonical measurement compatibility

- **R-19 — Preserve matrix semantics:** the canonical matrix remains the authority for slot ID, order, category, measurement purpose, identity policies, comparison relation, and report assessment class. This spec may strengthen `generatorSlotDescription`, allowed generation context, or writer guidance so a slot is realized as an entity-eligible decision without silently changing what the slot measures.
- **R-20 — Slot 2 interpretation:** the `situation` slot must still measure a real occasion, but the final question must ask for entity-level help in that situation rather than ask generically when or why customers seek the category.
- **R-21 — Slot 4 interpretation:** the `offering_use_case` slot remains about one concrete offering/use case, but the question must make the consumer seek a place/provider/product/entity that can satisfy it rather than merely ask factual background about the offering.
- **R-22 — Slot 6 interpretation:** the `open_comparison` slot remains an unnamed comparison. It must invite the AI to identify and compare realistic concrete options, not merely teach a comparison framework.

### Validation and observability

- **R-23 — Separate semantic validation:** generated unnamed candidates must receive explicit eligibility results for at least entity demand, commercial relevance, openness, and anti-fingerprint safety before selection. Naturalness and portfolio diversity are evaluated separately rather than collapsed into one opaque “quality” flag. These results are supplied by the versioned generation contract's structured fields, code-owned mechanical checks, and recorded evidence records (writer claims, evaluations, independent review); where no mechanical or independent judgment exists the recorded result is explicitly `not_evaluated` rather than fabricated. No separate runtime semantic-reviewer call is required.
- **R-24 — Failure codes, not hidden reasoning:** validation and selection store compact machine-readable outcomes/reasons. Do not persist model chain-of-thought or free-form private reasoning.
- **R-25 — Mechanical guards remain:** identity leakage, identity requirements, comparison relation, question shape, safety/privacy, unsupported entity-fact premises, and composition checks remain enforced. Semantic validation complements them; it does not replace them.
- **R-25A — Selection criterion is not an asserted premise:** the unsupported-premise guard must distinguish “which option is cheapest/most complete/best fit?” from “Brand X is the cheapest/most complete/best.” A comparative or superlative token is not by itself a hard failure when it is part of an open consumer selection question. Named-entity assertions, guarantees, safety claims, and high-impact winner/suitability requests remain subject to the existing evidence and category-safety rules.
- **R-26 — No target-optimization loophole:** a candidate fails when it is engineered so the audited business uniquely qualifies, even if it contains no literal brand identity.
- **R-27 — No semantic-keyword shortcut:** a list of recommendation verbs cannot be the primary eligibility validator. Such tokens may be weak signals or diagnostics only.

### Provider/runtime architecture

- **R-28 — Versioned internal generation contract:** the provider boundary must become capable of returning the internal market abstraction and consumer-decision situations needed by this spec, not only ten final strings. Historical records retain their recorded instruction/pack versions.
- **R-29 — One-call default:** the first production implementation keeps one bounded, no-search primary generation call. The internal stages may be represented in one structured response. A second semantic-review provider call may be introduced only if the evaluation gate proves it necessary and the founder separately approves the cost/method change.
- **R-30 — Stable downstream output:** regardless of richer internal generation data, the customer/replay boundary still receives exactly ten ordered question strings plus the existing code-owned slot metadata. Rich internal data must not leak into observation prompts.
- **R-31 — Input minimization:** generation remains downstream of the confirmed `BusinessBrief`/minimized projection. It receives no payment/contact data, raw page HTML, provider metadata, or sensitive free text and does not depend on React intake state. The v3 provider request should use a writer-specific projection that excludes provenance-only official-source URLs and comparison-source URLs unless an implementation need is demonstrated; those values may remain local for identity/provenance validation without being wording material.

### Fallback, edits, and history

- **R-32 — Recommendation-eligible fallback:** deterministic continuity questions must satisfy the same semantic target as far as deterministic generation can guarantee. Existing fallback forms that are informational rather than entity-seeking must be replaced. Unnamed fallback must not use `differentiator`, exact target-only numeric claims, or other target-specific material merely to make the question specific; prefer confirmed category/customer decision inputs and broader safe wording.
- **R-33 — Safe degradation:** when a generated candidate fails semantic or mechanical validation and no valid reserve candidate exists, use a slot-safe recommendation-eligible fallback. Do not keep a weak question merely because it is grammatically natural.
- **R-34 — Customer edits unchanged in V1:** after the suggestion reaches the customer, the existing mechanical approval contract and non-blocking purpose-drift behavior remain, with one explicit exception: the terminal-punctuation form check follows the implementation plan's compatible-008 amendment (R5 §5.1). This spec improves Nuave's generated defaults; changing customer-edit semantics requires a separate product decision.
- **R-35 — Historical replay:** previously approved packs remain replayable verbatim. Do not relabel historical instruction versions, regenerate old questions, or change their report interpretation.

### Evaluation

- **R-36 — Fixed cross-category evaluation corpus:** before production flip, maintain a privacy-safe repository corpus covering at least local service, local venue/hospitality, retail/store, consumer product/brand, B2B/SaaS, and professional service. Include a regulated/high-impact boundary case for safety behavior.
- **R-37 — Negative corpus:** include explicit must-reject examples for natural-but-informational questions, recommendation-shaped but unnatural questions, target fingerprinting, recommendation-keyword monoculture, paraphrase-only diversity, criteria overload, website-language contamination, target optimization, overly broad market questions, artificial persona injection, an inferred market dimension incorrectly asserted as an entity fact, and an unsupported named-entity superlative/guarantee.
- **R-38 — Baseline comparison:** the evaluation must run the current approach and the candidate approach against the same fixtures/rubric so improvement is attributable rather than impressionistic.
- **R-39 — Human judgment remains required:** automated tests can prove contracts and known failure cases, but founder/reviewer judgment is required for naturalness and whether the resulting portfolio plausibly represents Indonesian consumer decisions.

## Failure and recovery

- Provider or structured-output failure preserves the confirmed facts and uses the recommendation-eligible deterministic fallback; it never starts the audit automatically.
- A malformed internal semantic object is treated as generation failure, not partially trusted.
- A candidate failing one hard semantic dimension is rejected before portfolio selection. Reserve candidates are considered before fallback.
- If no safe question can be produced for a regulated category, use the existing truthful recovery/escalation behavior rather than fabricating a generic pack.
- If implementation discovers that satisfying R-19 while preserving a matrix slot is impossible, stop and escalate. Do not silently change the matrix purpose or report class.
- If the active intake rebuild changes the `BusinessBrief` handoff before integration, adapt at the handoff boundary; do not duplicate generation semantics inside the intake module.

## Evidence, data, privacy, and cost

- Question generation remains no-search.
- No live or paid provider evaluation is part of CI or normal verification.
- Live provider comparisons require explicit founder authorization and predetermined call/cost ceilings.
- Evaluation fixtures use fictional/privacy-safe businesses or founder-approved public examples with no customer/contact/payment data.
- Internal semantic metadata must be compact and diagnostic. Do not persist hidden reasoning or unnecessary source copy.
- Market-level inference under R-07A may be stored as a short normalized dimension plus provenance such as `category_inference`; it must not be misrepresented as a verified business fact or source citation.
- The production default remains one primary generation call unless the separate R-29 decision gate is crossed.

## Acceptance criteria

- **AC-01 — Baseline is visible:** the repository evaluation demonstrates at least the known current failure class: a natural informational question that passes existing mechanical checks but fails entity demand under this spec.
- **AC-02 — Entity demand:** for every generated unnamed question in the fixed acceptance corpus, a reviewer can describe the expected helpful answer as containing concrete relevant entities plus fit reasons; purely generic explanation is insufficient.
- **AC-03 — Commercial choice:** every generated unnamed question in the acceptance corpus is a choosing/finding/buying/hiring/visiting/obtaining/shortlisting/comparing decision rather than a learning-only task.
- **AC-04 — Competitive openness:** target-fingerprint fixtures do not reproduce the target's unique feature bundle, exact target-only price, proprietary claim, or other effective identifier in unnamed questions.
- **AC-04A — Inference versus fact:** a generic category-level decision dimension may be inferred and used as a consumer preference without being falsely marked verified; the same mechanism must reject/assertion-block invented facts about a named entity, exact market price, reputation, availability, certification, policy, or outcome.
- **AC-05 — Criteria discipline:** unnamed generated situations use no more than three decision criteria and do not create synthetic exhaustive requests.
- **AC-06 — Semantic diversity:** the final six unnamed questions for each acceptance fixture cover meaningfully distinct consumer decision situations; paraphrases of the same choice do not satisfy this criterion.
- **AC-07 — Naturalness:** a founder/reviewer sample across every corpus archetype is judged plausible Indonesian consumer language without systematic template feel, fake slang, or website-copy contamination.
- **AC-08 — Matrix preservation:** all ten final questions retain canonical slot order, 6/4 composition, identity rules, slot-9 relation, and existing report assessment classes. Frozen report fixtures produce unchanged denominators/interpretation.
- **AC-09 — Problematic slots repaired:** slot 2, slot 4, and slot 6 examples in the acceptance corpus remain true to their canonical measurement purposes while producing entity-level answer opportunity.
- **AC-10 — Deterministic fallback:** the fallback pack passes the same mechanical invariants and the repository's deterministic recommendation-eligibility checks; it no longer contains a generic “when do customers look for X?” style situation question.
- **AC-11 — No keyword monoculture:** acceptance packs contain legitimate implicit recommendation forms; use of the literal word `rekomendasi` is neither necessary nor sufficient for pass.
- **AC-11A — Preference query versus false premise:** an unnamed open-choice question such as `Toko HP yang paling lengkap di Depok apa ya?` is not rejected solely because `paling lengkap` is a comparative/superlative selection criterion. A question or sentence that asserts without evidence that a named business is `paling lengkap`, `termurah`, guaranteed, safest, or equivalent remains blocked or routed through the applicable evidence/safety rule.
- **AC-12 — Historical compatibility:** an approved pre-Spec-008 pack replays byte-for-byte and keeps its recorded provider/model/instruction version and report interpretation.
- **AC-13 — Generation boundary:** the production-path implementation sends only the writer-specific minimized confirmed business context, performs no web search, and returns only selected question text to the observation boundary. Provenance-only source URLs are not sent to v3 merely because they exist locally.
- **AC-14 — Intake independence:** after the active intake rebuild lands, question generation consumes its canonical `BusinessBrief` handoff rather than importing `IntakeState` or screen components.
- **AC-15 — Verification:** `npm run verify` passes with no live provider calls, relevant new unit/integration regressions are green, and an independent reviewer checks every acceptance criterion.

## Open questions

No material product question is intentionally left to a worker. The following are implementation gates, not license to change product behavior:

1. Whether one bounded generation call plus code-owned checks produces usable packs in real provider output. This is decided by the implementation plan's frozen pilot and release evaluations (R5 §8), not by a second model call; if the evaluated contract fails them, stop and return evidence before proposing more calls.
2. Exact candidate-pool size and internal field names. They may be tuned as reversible implementation details as long as candidate generation and selection remain separate and all acceptance criteria hold.
3. The production model/provider choice. This spec does not change it; provider substitution is evaluated separately from the semantic contract.

## Implementation notes

A likely durable internal decomposition is:

`MinimizedIndonesianBrief`
→ writer-specific provider projection
→ `MarketDecisionProfile`
→ `ConsumerDecisionSituation[]`
→ `QuestionCandidate[]`
→ semantic eligibility validation
→ portfolio selection
→ natural question pack
→ existing mechanical validation / approval / replay boundary

A market decision dimension should carry compact provenance such as `confirmed_input_abstraction` or `category_inference`. This is not source-citation machinery; it exists so code/tests can distinguish a lawful consumer-decision inference from a fabricated business premise.

Candidate objects should reference abstract market-dimension IDs and compact context, not raw `differentiator` text. Even though one provider call can see the bounded writer context, the structured contract should make direct target-fact-to-question flow observable and rejectable.

The initial provider may return the market profile, situations, reserve candidates, and question realizations in one bounded structured response. Code should own slot identity, final selection rules, validation results, versions, and persistence metadata.

Do not make the internal semantic objects customer-facing, and do not turn them into a general market-research ontology. They exist only to make the current ten-question pack more reliable.

## Verification record

- Verification artifact: `VERIFICATION.md` (created 2026-09-11 for R5 adoption provenance; gate evidence begins with implementation)
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
