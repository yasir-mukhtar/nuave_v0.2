# Execution plan — Spec 008 recommendation-eligible question generation

> Status: **Draft** — companion to [`SPEC.md`](./SPEC.md), which is also **Draft**.
> Created: 2026-09-07
> Planning baseline: `main` at `e531ff4653c324007eb049bee93f2a3b922cf216`
> Active adjacent work at planning time: PR #46 `feat/airbnb-intake-rebuild` at `afd518dd75d436319c7a5f1c31db9d640e2728d3`; its own PR description explicitly says `s-questions` has no generation wiring.
> Purpose: turn the approved semantic direction into a sequence that fresh sessions on different devices can execute without relying on chat or harness memory.

`SPEC.md` says what must be true. This file says what the repository currently does, what must change, in what order, where the seams are, and how each package is proven. If this plan conflicts with the spec, **the spec wins**.

No implementation package may start until the founder marks `SPEC.md` **Approved**. Planning, review, and test-design work may refine this package while it remains Draft.

---

## 1. How to resume this work in a fresh session

A new orchestrator should read only:

1. [`AGENTS.md`](../../AGENTS.md)
2. [`SPEC.md`](./SPEC.md)
3. **this file**
4. the exact package-specific code/context listed under the next `Ready` package

Then:

1. inspect the **Status ledger** near the bottom;
2. confirm the latest `main` SHA and any PR named in the active row;
3. read the last landed package's verification artifact if the next package depends on it;
4. do **not** reconstruct project status from local chat memory, previous harness state, or an old branch checkout;
5. update the ledger in this file when a package lands or is explicitly blocked.

The ledger is the durable cross-session state. Git history is evidence, not the primary task tracker.

---

## 2. Current-state audit

### 2.1 What the pre-Spec-008 system already gets right

The existing system is not merely a template generator. It already contains important foundations worth preserving:

- `AUDIT_MEASUREMENT_MATRIX` owns one ten-slot measurement contract, with six unnamed and four named slots, explicit identity policies, a slot-9 comparison relation, and code-owned report semantics.
- `INDONESIAN_QUESTION_WRITER_INSTRUCTION` tells the model to write plausible Indonesian prospective-customer questions, use real buying context, prefer direct customer questions over abstract evaluation frameworks, vary customer jobs rather than wording, and avoid wording designed to reveal or favour the audited business.
- The provider boundary is bounded and no-search and receives a minimized confirmed brief.
- The live model returns exactly ten final question strings; code owns slot order and metadata.
- `validateCanonicalIndonesianQuestionPack` checks count, emptiness, shape, identity leakage/requirements, comparison-target behavior, comparison relation, unsupported-premise patterns, 6/4 composition, and exact duplicate text.
- `repairIndonesianSuggestion` and deterministic fallback prevent a provider formatting/safety failure from hard-failing the preparation step.
- approved packs preserve exact text, edit history, provider/model/instruction provenance, and replay behavior.
- `docs/PROMPT_GENERATION_CONTEXT.md`, `docs/journey/04-questions.md`, and the repository skill already tell writers to use concrete decisions and semantic job diversity.

This means Spec 008 should **deepen the semantic pipeline**, not discard the existing measurement, safety, replay, or human-review architecture.

### 2.2 The structural limitation

The active runtime still reduces generation to:

```text
BusinessBrief
  -> MinimizedIndonesianBrief
  -> one provider prompt containing confirmed business fields + matrix slot instructions
  -> exactly ten final strings
  -> mechanical validation/repair
  -> customer review
```

There is no inspectable semantic object between business facts and sentence wording. The model may reason about a decision internally, but the system cannot observe, validate, select, or test that decision independently from the wording.

This creates several gaps:

1. **Natural but informational questions can pass.** Mechanical validity says nothing about whether a useful answer needs named entities.
2. **Target facts flow too close to wording.** The minimized brief contains offerings, needs, decision considerations, and differentiator; the writer receives them directly. The deterministic fallback also interpolates these fields directly into question templates.
3. **There is no market-abstraction layer.** Code cannot distinguish a normal buying dimension (`speed`) from a target fingerprint (`6-hour turnaround + free pickup + eco detergent + exact price`).
4. **There is no explicit entity-demand test.** The strongest new acceptance question — “can this be fully answered without naming entities?” — is absent.
5. **Commercial relevance is weakly represented.** The blocker code recognizes some decision vocabulary only to reject obviously unrelated edits; it is not a semantic acceptance contract.
6. **Competitive openness is not validated.** Existing leakage guards protect literal identity; they do not protect against reverse-engineered target profiles.
7. **Diversity is mostly instruction-level.** The prompt says “vary the customer job,” but code only rejects normalized exact duplicates. Six semantically equivalent recommendation questions can survive.
8. **Generation and selection are fused.** One model answer equals one candidate per slot. There is no reserve candidate or portfolio optimizer.
9. **Naturalness is encouraged but not evaluated as its own quality dimension.** Surface question-form checks cannot distinguish plausible Indonesian from synthetic marketing language.
10. **The deterministic fallback carries the old weakness.** In particular, the current slot-2 fallback asks when customers usually seek the category; that can be answered generically and fails the new entity-demand invariant.

### 2.3 The measurement matrix is not the core problem

Do **not** respond to the new direction by replacing the canonical matrix.

The current matrix already contains slot purposes that can be realized as recommendation-eligible consumer decisions:

- slot 1: category options;
- slot 2: a real occasion;
- slot 3: fit for a need;
- slot 4: where to obtain a concrete offering/use case;
- slot 5: shortlist;
- slot 6: open comparison;
- slots 7–10: named brand evaluation/comparison.

The problem is that slot guidance currently permits weak realizations. Slot 2 can become “when do people look for X?” instead of “I am in situation Y; which X should I choose?”. Slot 6 can become a generic comparison framework instead of identification and comparison of concrete options.

`buildAuditReport` also makes an important distinction: **appearance is counted across all six unnamed questions**, while only matrix rows whose `reportAssessmentClass` is `recommendation` feed the narrower recommendation measure. Therefore every unnamed question can be made entity-eligible without changing every slot into a recommendation-assessment slot.

Spec 008 should preserve that distinction.

---

## 3. Delta: current versus target

| Area | Pre-Spec-008 behavior | Spec 008 target | Required change |
|---|---|---|---|
| Semantic target | Natural prospective-customer questions that satisfy fixed slot purposes | Natural **consumer decision** questions with genuine entity opportunity | Make recommendation eligibility an explicit generation invariant |
| Primary unit | Final sentence string | `ConsumerDecisionSituation` before wording | Add typed intermediate contract |
| Market understanding | Confirmed fields are sent directly to writer | Target facts first become market-level decision dimensions | Add `MarketDecisionProfile` abstraction |
| Target-specific attributes | Avoid literal identity / “don’t favour” guidance | Separate ordinary dimensions from target fingerprints | Add abstraction + anti-fingerprint validation |
| Entity demand | Not explicitly modeled | Helpful answer materially benefits from named entities | Add explicit semantic eligibility result |
| Commercial relevance | Prompt intent plus weak token-based unrelated-content blocker | Actual choice over commercially competing entities | Add first-class choice job/entity type |
| Competitive openness | No target identity leakage | Multiple legitimate entities can qualify | Validate openness separately from leakage |
| Criteria | Uses verified decision criteria; no hard semantic count | Usually 1–3 meaningful customer criteria | Encode and enforce on situation |
| Context | Writer chooses confirmed context | Context only when it changes the decision | Model it explicitly; reject artificial context |
| Candidate generation | One final candidate per slot | Generation and selection separated | Generate reserve candidates for unnamed slots |
| Diversity | Writer instruction + exact duplicate check | Different consumer decisions/intent families across the portfolio | Select using semantic metadata, not paraphrase distance |
| Naturalness | Strong instruction, weak observable gate | Separate quality dimension after semantic soundness | Add fixture/human evaluation; retain surface guards |
| Validation | Mechanical rules | Mechanical + semantic eligibility + portfolio validation | New typed validation layer |
| Fallback | Direct templates from brief fields | Recommendation-eligible slot-safe fallback | Replace weak fallback forms |
| Provider output | `{ questions: [10 strings] }` | Structured internal generation artifact + final text | Version output contract/instruction |
| Customer-visible output | 10 reviewable strings | Still 10 reviewable strings | Preserve downstream boundary |
| Customer edits | Mechanical enforcement, purpose drift warns | Same in V1 | Explicitly do not expand scope |
| Report semantics | Matrix-owned assessment classes and denominators | Same | Regression-lock unchanged report behavior |
| Intake coupling | `BusinessBrief` -> minimized projection | Same seam | Do not import new intake screen state into generator |
| Evaluation | Unit tests mostly structural/provider plumbing | Cross-category positive + negative semantic corpus | Add deterministic evaluation harness + founder sample review |

---

## 4. Target architecture

The durable architecture should make the semantic stages visible while keeping the downstream audit contract small.

```text
Confirmed BusinessBrief
        |
        v
MinimizedIndonesianBrief
        |
        v
+---------------------------+
| MarketDecisionProfile     |
| - category/entity type    |
| - customer choice jobs    |
| - market dimensions       |
| - meaningful contexts     |
| - common risks/concerns   |
| - target-specific signals |
+---------------------------+
        |
        v
ConsumerDecisionSituation candidates
        |
        v
Natural Indonesian realizations
        |
        v
Semantic eligibility validation
(entity demand / commercial relevance /
openness / anti-fingerprint)
        |
        v
Portfolio selection
(slot fit + semantic diversity)
        |
        v
Existing mechanical validation / repair
        |
        v
10 selected question strings
        |
        v
Existing review / approval / replay / observation path
```

### 4.1 Suggested internal records

Names may change during implementation, but responsibilities must remain separate.

#### `MarketDecisionProfile`

Recommended minimum meaning:

```ts
type MarketDecisionProfile = {
  category: string;
  entity_type: string;
  choice_jobs: ChoiceJob[];
  decision_dimensions: Array<{
    id: string;
    label: string;
  }>;
  meaningful_contexts: string[];
  common_choice_concerns: string[];
  target_specific_signals: Array<{
    source_kind: "offering" | "criterion" | "differentiator" | "fact";
    abstracted_dimension_id: string | null;
  }>;
};
```

Important: do not persist raw source copy or model reasoning here. `target_specific_signals` exists to prove that source-specific information was either abstracted to an ordinary market dimension or intentionally excluded.

#### `ConsumerDecisionSituation`

Recommended minimum meaning:

```ts
type ConsumerDecisionSituation = {
  slot_order: number;
  intent_family: string;
  choice_job: string;
  entity_type: string;
  context: string | null;
  criteria_dimension_ids: string[]; // 0..3, normally 1..3
  concern: string | null;
};
```

A situation is valid only when the consumer is choosing an entity, not merely asking about a topic.

#### `QuestionCandidate`

```ts
type QuestionCandidate = {
  candidate_id: string;
  situation: ConsumerDecisionSituation;
  text: string;
};
```

#### `SemanticEligibilityResult`

```ts
type SemanticEligibilityResult = {
  candidate_id: string;
  pass: boolean;
  failures: Array<
    | "no_entity_demand"
    | "not_commercial_choice"
    | "target_fingerprint"
    | "competitive_field_too_narrow"
    | "criteria_overload"
    | "slot_semantic_mismatch"
  >;
};
```

Naturalness should not be hidden inside this hard semantic result. Keep naturalness and portfolio quality separately observable.

### 4.2 One provider call, multiple semantic stages

The current production method budgets one question-generation call. Preserve that as the initial topology.

The provider can perform market abstraction, generate situations, realize reserve candidates, and self-review them inside **one structured response**. Code still owns:

- slot identity/order;
- allowed identities;
- candidate validation result normalization;
- deterministic anti-leakage/fingerprint guards where possible;
- final portfolio selection;
- fallback;
- versions/provenance; and
- what reaches the customer/observation path.

Do not treat a model-provided boolean as sufficient evidence by itself. The release gate must test actual outputs against an external fixture/reviewer rubric. If one-call behavior remains materially unreliable, stop at the evaluation gate and return evidence before proposing a second reviewer call.

### 4.3 Candidate pool

Default implementation target:

- **two candidates for each unnamed slot** (12 unnamed candidates total);
- one realization for each named slot (4 named candidates), unless a named slot needs a reserve for mechanical recovery;
- select one valid candidate per canonical slot;
- if both unnamed candidates fail, use the slot-safe deterministic fallback.

Candidate count is tunable if token/cost measurements show a better small bound, but a return to exactly one unnamed candidate per slot would remove the generation/selection separation and requires explicit justification.

### 4.4 Portfolio selection

Selection must be semantic, not string-distance based.

Within the valid candidate pool:

1. preserve canonical slot compatibility;
2. prefer a distinct `intent_family`/choice job relative to already selected unnamed questions;
3. penalize repeated decision-dimension combinations when another valid option exists;
4. do not add context solely for diversity;
5. do not sacrifice naturalness or openness for coverage; and
6. keep the final question wording concise.

Exact textual similarity may remain a final duplicate guard, not the primary diversity algorithm.

### 4.5 Anti-fingerprint behavior

The implementation needs two layers:

1. **semantic abstraction:** target-specific source claims are converted into broader market dimensions before situation generation;
2. **deterministic containment:** unnamed final text must still reject audited identity signals, URLs/domains, comparison identity, exact target-only numeric/price strings when they were classified as target-specific, and other effective identifiers that can be detected safely.

Do not build a giant category taxonomy or a global product ontology. The profile is per-generation and bounded to the current audit.

### 4.6 Fallback philosophy

Fallback is continuity, not permission to regress semantically.

Examples of required fallback corrections:

- old slot 2: `Dalam situasi apa ... biasanya mencari <category>?`
- new semantic shape: a generic but real situation **plus entity selection**, e.g. `Kalau butuh <category> untuk <need>, pilihan yang layak dipertimbangkan apa saja?`

The exact Indonesian wording can remain deterministic and conservative. It does not need to be the most natural possible model output, but it must not become informational-only.

---

## 5. Evaluation strategy

### 5.1 Corpus archetypes

Create privacy-safe fixtures for at least:

1. local home service — e.g. AC service;
2. local venue/hospitality — e.g. cafe;
3. store/retailer — e.g. laptop/phone retailer;
4. consumer product/brand — e.g. running shoes;
5. B2B/SaaS — e.g. accounting software;
6. professional service — e.g. contractor/accountant within safe public-business discovery boundaries;
7. regulated/high-impact boundary — used to prove safe narrowing/escalation, not individualized advice.

Each fixture should include both ordinary market facts and at least one deliberately target-specific attribute bundle so anti-fingerprint behavior is testable.

### 5.2 Positive rubric

For every final unnamed question, reviewers answer:

1. **Naturalness:** would a real Indonesian plausibly ask this?
2. **Entity demand:** would specific entities materially improve a helpful answer?
3. **Commercial relevance:** is the user making a real choice over something businesses compete to provide?
4. **Openness:** could multiple legitimate entities qualify?

The first three hard semantic dimensions from the spec must pass; openness must not be artificially narrowed. Naturalness is a founder/reviewer judgment gate.

### 5.3 Negative corpus

Permanent must-reject cases include:

- troubleshooting: `Kenapa AC saya nggak dingin?`
- definition: `Apa bedanya laundry kiloan dan dry cleaning?`
- generic how-to: `Bagaimana cara memilih laptop?`
- factual-only: `Berapa lama biasanya servis laptop?`
- explanatory why: `Kenapa kopi specialty mahal?`
- recommendation-shaped overload: a long “sebutkan lima ... berdasarkan ...” list of many criteria;
- target fingerprint: exact unique feature bundle/price copied from fixture;
- recommendation keyword monoculture: multiple semantically identical `rekomendasi...` questions;
- website-copy contamination;
- artificial persona/story injection; and
- target-engineered wording where only the audited business plausibly qualifies.

Every discovered production failure should become a permanent fixture/regression before or with its fix.

### 5.4 No paid calls in the normal gate

Unit/integration verification uses deterministic provider stubs and frozen candidate artifacts.

A live provider A/B sample is a separate release-quality activity. Before running it, the orchestrator must state:

- provider/model;
- exact old/new instruction versions;
- number of fixture packs;
- call ceiling;
- estimated cost ceiling; and
- what decision the evidence will make.

Then obtain founder authorization. Do not put live evaluation in `npm run verify` or CI.

---

## 6. Package sequence

The question-generation core is **single-threaded**. G1 through G4 intentionally touch overlapping files in `src/lib/audit/`; do not run them in parallel.

| Package | Outcome | Depends on | Main files | Status |
|---|---|---|---|---|
| **G0** | Baseline + evaluation corpus | Spec approval | new tests/fixtures only | Not started |
| **G1** | Semantic contract + market/situation types | G0 | new semantic module + `questions-id.ts` types | Not started |
| **G2** | Versioned writer/provider structured contract | G1 | `questions-id-provider.ts`, tests | Not started |
| **G3** | Semantic validation + portfolio selector | G2 | new validator/selector + `questions-id.ts` | Not started |
| **G4** | Fallback, orchestration, compatibility, versions | G3 | `questions-id.ts`, provider tests, persistence tests | Not started |
| **G5** | Intake/review integration seam | G4 + intake branch resolved | current `BusinessBrief` adapter / s-questions wiring only | Not started |
| **G6** | Cross-category evaluation, docs reconciliation, independent verification | G5 | eval artifacts, docs, `VERIFICATION.md` | Not started |

No package is implementation-ready while `SPEC.md` is Draft.

---

## 7. G0 — baseline and evaluation corpus

**Objective.** Make the semantic problem observable before changing production behavior.

**Scope.** Test/evaluation artifacts only. Do not change the live instruction or generator.

**Required context.** `SPEC.md`; current `measurement-matrix.ts`; current `questions-id.ts`; current writer instruction; current provider tests.

**Work.**

1. Create the seven archetype fixtures from §5.1.
2. Encode the negative cases from §5.3.
3. Add a small typed rubric helper for `naturalness`, `entity_demand`, `commercial_relevance`, and `openness` that can store expected judgments for deterministic fixtures without pretending to automatically judge arbitrary natural language.
4. Add regression examples proving the current mechanical validator accepts at least one semantically weak but structurally valid question.
5. Pin current fallback output for the known weak slot-2 behavior so the later change is deliberate rather than accidental.

**Likely files.**

- new `src/lib/audit/questions-id-semantic-fixtures.ts` (test-only export or colocated fixture module)
- new `src/lib/audit/questions-id-semantic.test.ts`
- no production code changes

**Exit gate.**

- current unit suite remains green;
- the corpus has every required archetype/failure mode;
- at least one current question demonstrates “mechanically valid but no entity demand”;
- no live calls.

**Stop/escalate if:** the corpus exposes a conflict with the canonical matrix that cannot be resolved by stronger realization guidance. Do not patch the matrix in G0.

---

## 8. G1 — semantic contract and intermediate model

**Objective.** Make market abstraction and consumer-decision situations explicit code-owned concepts without changing the live generator yet.

**Work.**

1. Introduce bounded types for `MarketDecisionProfile`, `ConsumerDecisionSituation`, `QuestionCandidate`, `SemanticEligibilityResult`, and portfolio metadata.
2. Keep these types in a focused module rather than expanding `types.ts` into a general ontology.
3. Define closed machine reason codes for hard semantic failures.
4. Define code-owned slot binding: a situation always references canonical slot order/id; it cannot invent or reorder measurement slots.
5. Define the criteria bound and ensure criteria reference abstract market dimensions rather than raw target-source strings.
6. Add serialization/shape tests and malformed-object failures.

**Likely files.**

- new `src/lib/audit/question-decision-model.ts`
- new `src/lib/audit/question-decision-model.test.ts`
- narrow imports in `questions-id.ts`

**Do not:** write provider prompts, change fallback, change matrix semantics, or expose these objects to UI.

**Exit gate.**

- all intermediate objects are bounded and serializable;
- no type permits a situation without a choice job/entity type;
- criteria cannot exceed the spec bound;
- target-specific signals can be marked excluded or mapped only to market dimensions;
- no existing runtime output changes.

---

## 9. G2 — writer v3 and structured provider contract

**Objective.** Make the model perform the target semantic process in one bounded no-search call, behind a versioned contract, while the active production path is not flipped until G4/G6 gates are satisfied.

**Work.**

1. Draft `question-writer-v3` from `SPEC.md`; do not merely append “make it more commercial.”
2. Instruction order should be:
   - understand the business/category;
   - abstract market-level decision dimensions and identify target-specific signals;
   - construct consumer decision situations;
   - create two unnamed candidates per slot;
   - realize them in natural Indonesian;
   - self-check entity demand, commercial choice, openness, anti-fingerprint, and naturalness;
   - return structured data only.
3. Preserve matrix-owned slot IDs/purposes/identity policies. Strengthen generator descriptions for slots 2/4/6 without changing `measurementPurpose` or `reportAssessmentClass`.
4. Replace the provider's ten-string-only schema with a bounded internal v3 schema that contains the market profile, situations, candidate texts, and compact self-check fields.
5. Keep the observation boundary unchanged; no internal object may be sent as an audit question.
6. Keep no-search and minimized-input assertions.
7. Keep output token bounds explicit; raise only if measured fixture payloads cannot fit, with the smallest justified bound.

**Likely files.**

- `src/lib/audit/questions-id-provider.ts`
- `src/lib/audit/questions-id-provider.test.ts`
- `src/lib/audit/questions-id.ts` provider-output types only
- `src/lib/audit/measurement-matrix.ts` only if `generatorSlotDescription` needs explicit refinement; no other matrix fields

**Exit gate.**

- stubbed OpenCode Go/OpenAI/Gemini request tests pass with the new schema;
- request still contains no tools/web search and only minimized confirmed context;
- malformed semantic responses fail closed to the generation recovery path;
- v2 historical version labels are not rewritten;
- no paid calls.

---

## 10. G3 — semantic validator and portfolio selector

**Objective.** Make semantic eligibility and portfolio diversity code-visible rather than trusting ten provider strings wholesale.

**Work.**

1. Validate each unnamed candidate against its situation and market profile.
2. Reject candidates with hard reason codes for:
   - no entity-demanding choice job;
   - non-commercial learning-only task;
   - target-specific fingerprint usage;
   - implausibly closed competitive field;
   - criteria overload;
   - slot-purpose mismatch.
3. Retain existing identity/shape/safety validation as a second layer over realized text.
4. Select one valid candidate per unnamed slot using semantic intent-family and dimension coverage; do not use paraphrase distance as the primary selector.
5. Make selection deterministic for a given structured response so a saved generation artifact is reproducible.
6. Record compact diagnostics: candidate id, selected/rejected, reason codes, intent family, selected dimension ids. No chain-of-thought.
7. Add focused tests for every negative corpus family.

**Likely files.**

- new `src/lib/audit/question-eligibility.ts`
- new `src/lib/audit/question-eligibility.test.ts`
- new `src/lib/audit/question-portfolio.ts`
- new `src/lib/audit/question-portfolio.test.ts`
- narrow orchestration imports in `questions-id.ts`

**Exit gate.**

- every negative fixture receives the intended rejection reason;
- equivalent/paraphrase candidates lose to a semantically distinct valid reserve when one exists;
- no keyword-only entity-demand rule is introduced;
- mechanical validation tests remain green;
- no production default flip yet.

---

## 11. G4 — fallback, generation orchestration, compatibility, and versioning

**Objective.** Make the end-to-end generator satisfy Spec 008 while preserving approval/replay compatibility.

**Work.**

1. Wire the v3 structured provider output through G3 selection.
2. Replace weak deterministic fallback wording, especially slot 2 and any slot 6 form that can elicit only a comparison framework.
3. When a primary candidate fails, try its reserve; when all reserves fail, use the slot-safe fallback.
4. Run existing mechanical validation on the selected ten final strings.
5. Bump the active instruction version. Bump the suggestion/internal contract version only where the serialized shape actually changed.
6. Preserve `IndonesianQuestionItem`, customer-visible question ordering, edit history, final brand-name classification, and approved-pack replay semantics unless a schema migration is strictly required.
7. Extend generation diagnostics with semantic selection/rejection metadata in an internal bounded record. Do not expose it to observation prompts or report copy.
8. Add compatibility tests loading a pre-Spec-008 approved record and replaying it unchanged.
9. Add report regression tests proving the canonical report assessment classes/denominators do not change merely because question wording improves.

**Likely files.**

- `src/lib/audit/questions-id.ts`
- `src/lib/audit/questions-id.test.ts`
- `src/lib/audit/questions-id-provider.ts` / test only for final version constants
- `src/lib/audit/contracts.test.ts` for report-regression lock if needed

**Exit gate.**

- all G0 corpus fixtures produce a structurally valid 10-question suggestion under stubbed v3 output;
- current 6/4, identity, slot-9, approval/edit, replay, and report tests remain green;
- deterministic fallback passes new acceptance examples;
- no live calls;
- `npm run check` and `npm run test:unit` green locally before PR push.

---

## 12. G5 — intake/review integration seam

**Objective.** Connect the improved generator to the customer question-review step without letting the active intake rebuild become a second generation authority.

**Dependency.** Resolve PR #46 first:

- if merged: branch G5 from the new `main` and read its current data handoff;
- if superseded: read the replacement approved intake contract;
- if still open: do not build a competing parallel `s-questions` integration on this spec branch. Coordinate ownership with the intake orchestrator.

**Invariant.** Question generation consumes the canonical confirmed `BusinessBrief`/minimized projection. It does **not** import `IntakeState`, screen components, fixture display items, or UI selection ids.

**Work.**

1. Wire the then-current review-confirm handoff to the v3 generator through the business-facts adapter.
2. Preserve `factVersion`/question invalidation behavior defined by the intake contract.
3. Preserve exact ten-question review/edit/approval behavior.
4. Do not show semantic metadata, candidate pools, scores, or market dimensions in the UI.
5. Keep fallback disclosure truthful and only when materially used.
6. Add integration/E2E coverage for confirmed facts -> generated questions -> edit -> approval -> audit-start lock.

**Exit gate.**

- new intake and legacy/transition paths have one generation authority;
- changing confirmed material facts invalidates the old suggestion and regenerates from the new brief;
- unchanged facts do not regenerate unexpectedly;
- customer edits still follow the existing mechanical/purpose-drift contract;
- no duplicate generation logic in `src/lib/intake/`.

---

## 13. G6 — evaluation, documentation, verification, and production flip

**Objective.** Prove the semantic improvement, reconcile repository truth, and only then make v3 the supported generation method.

### Offline gate

1. Run `npm run verify` with no live calls.
2. Run the fixed positive/negative semantic corpus.
3. Independently review every Spec 008 acceptance criterion.
4. Compare current-v2 and v3 examples on the same rubric using frozen/stubbed artifacts where possible.

### Founder naturalness gate

Present a compact sample that includes every archetype. For each pack, show only:

- the six unnamed questions;
- their short decision-family labels for review context;
- any fallback usage.

Do not show model chain-of-thought or target-derived internal reasoning.

Founder/reviewer signs off that the packs are plausibly Indonesian, commercially relevant, competitively open, and semantically diverse.

### Optional live-provider gate

If real provider quality is still unproven, prepare the bounded live A/B request described in §5.4 and obtain explicit authorization. A successful unit suite is not evidence that a stochastic writer produces good language.

If v3 fails the live semantic/naturalness bar:

- do not ship a weaker target;
- preserve the evidence;
- narrow the failing stage;
- first revise one-call prompting/selection;
- only then propose a second semantic-review model call, with a separate cost/method decision.

### Documentation reconciliation after approval of behavior

Update only documents whose product truth changed:

- `docs/PROMPT_GENERATION_CONTEXT.md`
- `docs/journey/04-questions.md`
- `skills/generate-ai-visibility-prompts/SKILL.md`
- `docs/AUDIT.md` only if its wording about question generation needs clarification; do **not** change report semantics
- `docs/INDEX.md` / `specs/README.md` when Spec 008 becomes an active approved package
- `docs/DECISION_LOG.md` only for the founder-approved material semantic-method decision
- `docs/NOW.md` only if this becomes the actual current objective/next action

Create `VERIFICATION.md` from the repository template and record the verified commit/PR evidence.

**Exit gate.**

- all acceptance criteria pass or carry an explicit founder-approved exception;
- CI is green on the implementation PR;
- `npm run verify` passes;
- human naturalness review passes;
- any required live provider evaluation is explicitly authorized and recorded;
- historical replay regression passes;
- no temporary diagnostic workflow, test-only production switch, debug logging, or stale v2/v3 feature flag remains;
- founder explicitly approves marking the spec Verified and any merge/deploy separately.

---

## 14. Branching and PR discipline

After the spec is approved and its documents have landed on `main`:

1. every G0–G6 implementation package branches from the latest `main`;
2. one package = one bounded PR when practical;
3. G1–G4 never run concurrently because they rewrite the same question-generation core;
4. a package is not handed off with known failing tests;
5. CI is a gate, not a debugger;
6. do not merge or deploy without explicit founder authorization; and
7. after a package merges, update the Status ledger in this execution plan in the next documentation commit/PR so a fresh session has a durable starting point.

The currently open intake rebuild is adjacent work, not the branch base for Spec 008 core packages. G5 reconciles with whatever intake architecture actually lands.

---

## 15. Verification matrix

| Concern | Unit / deterministic | Integration | Human / live |
|---|---|---|---|
| 10 slots + 6/4 | Yes | Yes | — |
| Identity leakage/requirements | Yes | Yes | — |
| Slot-9 relation | Yes | Yes | — |
| Market-abstraction shape | Yes | — | Review examples |
| Criteria max 3 | Yes | — | — |
| Target fingerprint known cases | Yes | — | Review edge cases |
| Entity-demand known cases | Yes, fixture-labeled | Provider artifact review | Human judgment for arbitrary language |
| Commercial choice known cases | Yes, fixture-labeled | Provider artifact review | Human judgment |
| Competitive openness known cases | Yes, fixture-labeled | Provider artifact review | Human judgment |
| Semantic portfolio diversity | Yes from intent metadata | Provider artifact review | Human judgment |
| Natural Indonesian | Surface checks only | — | Founder/reviewer; optional live provider sample |
| Deterministic fallback | Yes | Yes | Review copy |
| Historical replay | Yes | Yes | — |
| Report semantics unchanged | Yes | Yes | — |
| Intake invalidation / question lock | Yes | E2E | Founder walkthrough if customer surface changes |
| No-search / minimized input | Request-shape tests | Stubbed provider | Live only if authorized |

---

## 16. Status ledger

This is the single durable progress record for Spec 008 execution.

| Package | Status | Branch / PR | Landed commit | Evidence / blocker | Next action |
|---|---|---|---|---|---|
| Spec/plan | **Drafted** | `docs/spec-008-recommendation-eligible-questions` | — | Draft spec + delta + execution plan created 2026-09-07 | Independent review, then founder approval |
| G0 Baseline/eval corpus | Blocked on spec approval | — | — | — | Start only after spec Approved |
| G1 Semantic contract | Not started | — | — | — | After G0 |
| G2 Writer/provider v3 | Not started | — | — | — | After G1 |
| G3 Validator/selector | Not started | — | — | — | After G2 |
| G4 Fallback/compatibility | Not started | — | — | — | After G3 |
| G5 Intake integration | Not started | — | — | PR #46 state must be resolved at start | After G4 + intake handoff known |
| G6 Evaluation/verification | Not started | — | — | Live eval requires founder authorization if needed | After G5 |

Allowed package states: `Not started`, `Ready`, `In progress`, `Blocked`, `In review`, `Landed`, `Verified`.

When updating a row, record a PR or commit, not “done in another session.”

---

## 17. Worker prompt discipline

Do **not** pre-write all worker prompts now. Write the next worker prompt only after its dependencies land, because file layout and exact test surfaces may change.

Every prompt follows `docs/templates/WORKER_PROMPT.md` and names:

- repo and branch base;
- one package objective;
- `AGENTS.md`, this spec, this plan, and only the package-specific code as context;
- exact in-scope and out-of-scope files;
- acceptance criteria owned by the package;
- commands to run;
- no-live-call constraint;
- what must be escalated rather than guessed; and
- required completion report including diff, tests, remaining risk, and next handoff.

Workers do not update product requirements to rationalize an implementation shortcut.

---

## 18. Stop conditions

Stop the affected package and return to the orchestrator/founder when any of these occurs:

1. satisfying recommendation eligibility appears to require changing a canonical slot's `measurementPurpose` or `reportAssessmentClass`;
2. the only viable runtime validator appears to require a second paid model call;
3. the new approach needs additional sensitive/customer data not already in the confirmed brief;
4. anti-fingerprint enforcement would require inventing unsupported market facts or a large category ontology;
5. the active intake architecture has a different canonical business-fact handoff than assumed;
6. a provider cannot fit the bounded structured response without materially increasing cost/latency;
7. the live provider repeatedly produces semantically weak output despite passing its own structured self-check;
8. report denominators or historical replay change unexpectedly; or
9. two consecutive fix rounds uncover unrelated architectural defects inside the same package, indicating the package or spec boundary is wrong.

Do not lower the semantic target to make a gate pass.

---

## 19. Definition of success

This work is successful when the generation engine no longer asks merely:

> “What natural questions might somebody ask about this category?”

and instead reliably constructs:

> “What real consumer decision is happening here, what market-level dimensions matter, and what natural Indonesian question would make concrete competing entities useful in the answer?”

while still preserving Nuave's existing ten-slot audit method, fair competitive field, exact replay, human approval, and evidence discipline.
