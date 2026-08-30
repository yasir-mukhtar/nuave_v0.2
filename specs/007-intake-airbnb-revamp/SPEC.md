# Spec 007: Runnable V1 audit journey

> Status: **Approved** (founder-approved 2026-08-30)
> Owner: Founder
> Updated: 2026-08-30
> Implements: the V1 customer journey, end to end, with real business data

## Purpose

Make the Nuave workflow runnable end to end with a real business source:

**Landing → Preview → Simulated payment → AI extraction → Intake review →
Prompt review → Audit**

The intake mental model is **AI drafts → the user verifies, corrects, and
adds**. It must never become a blank questionnaire.

Everything here exists to make that sequence work with real data. Anything else
is deferred.

## Required context

1. `AGENTS.md` · `docs/INDEX.md` §Authority
2. **`docs/AUDIT.md`** — higher authority than this spec on measurement method
3. `docs/PRODUCT.md` §2–§5 · `docs/DECISION_LOG.md` (2026-08-17 entries)
4. `docs/VOICE.md` §2, §7.1 · **`docs/DESIGN.md`**
5. `docs/journey/04-questions.md` · `docs/V1_PRODUCT_CONTRACT.md`
6. `intake-prototype.html` — the approved experience
7. `src/lib/audit/`: `contracts.ts`, `types.ts`, `questions-id.ts`,
   `questions-id-provider.ts`, `questions-id-live.ts`,
   `question-suggestion-guards.ts`, `report-prompt-contract.ts`,
   `source-input.ts`, `workflow-storage.ts`
8. `src/app/audit/AuditWorkflow.tsx` · `AuditStages.tsx` · `ReportView.tsx`
9. `src/components/LandingAuditHero.tsx` · `src/lib/fixture-journey/adapter.ts`
10. `src/app/api/audit/extract/route.ts` · `tests/e2e/network-guard.ts`

---

# Blocker A — Measurement authority

## R-01 · The canonical matrix

Ten slots. Six do not name the business; four do. Identity policy is stated in
**both directions** — forbidden *and* required — so a pack cannot pass
structural validation while being semantically wrong.

| # | Category | Audited brand | Comparison target | Purpose |
|---|---|---|---|---|
| 1 | `category_recommendation` | forbidden | forbidden | Which options exist in this category and context |
| 2 | `situation` | forbidden | forbidden | A real occasion that leads someone to look |
| 3 | `need_fit` | forbidden | forbidden | A specific need and what suits it |
| 4 | `offering_use_case` | forbidden | forbidden | One concrete offering or use case |
| 5 | `shortlist` | forbidden | forbidden | A short list a customer would consider |
| 6 | `open_comparison` | forbidden | forbidden | Comparison among realistic **unnamed** options |
| 7 | `brand_fit` | **required** | forbidden | Whether the business suits a stated need |
| 8 | `explicit_recommendation` | **required** | forbidden | Whether the model recommends the business |
| 9 | `direct_comparison` | **required** | **required** | The business against the comparison target |
| 10 | `fit_misfit` | **required** | forbidden | Who it suits, who it does not, trade-offs |

## R-02 · The matrix is the only measurement authority

One exported structure carries, per slot: id, order, category,
`auditedBrandIdentity: "forbidden" | "required"`,
`comparisonTargetIdentity: "forbidden" | "required"`, measurement purpose,
customer-facing label, report assessment class, the generator's slot
description, and — where the slot declares one — `comparisonRelationMarkers`,
the closed token list R-10 rule 3 uses. Only slot 9 declares it today; the field
is absent, not empty, on the other nine.

No measurement policy may exist outside it. Ordering and ids may of course
contain numbers; what is prohibited is **positional measurement-policy logic**
— any code deciding branded state, leakage rules, or composition from a slot's
number rather than from the matrix.

## R-03 · Migration inventory

Every surface below encodes the old model. This inventory was built by scanning
the tree for the legacy category enum, the 5/5 composition markers, and — the
class most easily missed — every module that maps a slot by **array index** into
a parallel table. The acceptance criterion is that no legacy policy consumer
remains and no positional slot mapping survives outside the matrix — not that a
count was matched.

### Measurement core

| File | What |
|---|---|
| `types.ts:3-9` | `promptCategories` — the five-category enum itself, consumed at `:138` and `:185` |
| `types.ts:164-172` | `unbranded_prompts`, `branded_prompts`, `two_per_category`, `five_unbranded`, `five_branded` schema fields |
| `contracts.ts:153` | `PROMPT_MATRIX` |
| **`contracts.ts:216`** | **`PROMPT_INPUT_FIELD_MATRIX` — a second positional slot table, joined to `PROMPT_MATRIX` by array index at `:268`. Row 6 feeds `brand_name` and `verified_competitor` into the slot R-01 makes `open_comparison`; row 9 gives the new `direct_comparison` slot no comparison target at all. Fold it into the matrix as a per-slot `allowedContextFields`** |
| `contracts.ts:336-344` | `unbranded_prompts: 5`, `five_unbranded`, `two_per_category` self-check |
| `contracts.ts:727` | `prompt_id !== "NUAVE-BRAND-COMPARISON-02"` competitor exception |
| `contracts.ts:765-774` | Five categories × exactly two — **delete**, it encodes the old model |
| `contracts.ts:775-778` | Branded count `!== 5` and its message |
| **`locked-question-pack.ts:22-32`** | **`lockedPromptSlotIndex` — parses `NVA-ID-NN` into an array index, and maps legacy ids through `PROMPT_MATRIX` (`:14-16`)** |
| **`locked-question-pack.ts:34-52`** | **`canonicalPrompt` — the server's final interpretation of every question, taking `category` from `INDONESIAN_SLOT_CATEGORIES[slotIndex]`. Live on `/api/audit/run`, `/api/audit/variance`, `report-pipeline.ts`, and `AuditWorkflow.tsx`. Left unmigrated, the server relabels a correct pack with legacy categories after review** |
| **`questions-id.ts:141-147`** | **`minimizeIndonesianBrief` builds `comparison_business` only when `verified_competitor.source_url` is non-empty as well as the name, so R-13's name-only fallback target becomes `comparison_business: null` and slot 9 has nothing to name. Project on the name alone and carry `source_url` through when it exists. The doc comment at `:114-118` calls the null case "unusable"; a missing URL is not that** |
| `questions-id.ts:352` / `:371` | `INDONESIAN_SLOT_CATEGORIES`, `INDONESIAN_SLOT_MATRIX` |
| `questions-id.ts:378` | `default_branded: index >= 5` |
| `questions-id.ts:454-494` | The ten deterministic fallback templates — see R-05 |
| `questions-id.ts:586` / `:599` | `slot <= 5` identity guard, `slot !== 6` competitor guard |
| `questions-id.ts:645` | `repairIndonesianSuggestion` — corrected by consequence of the templates |
| `questions-id.ts:941` | `INDONESIAN_SLOT_MATRIX[index].suggested_category` — positional |
| **`question-suggestion-guards.ts:92`** | **`if (unbranded !== 5) … "default_composition_not_five_five"`** |
| **`question-suggestion-guards.ts:102`** | **`if (index === 5) return;` — the positional slot-6 competitor exception** |
| **`questions.ts`** | **A second complete legacy generator — ten English templates carrying the old per-slot semantics, with slot 6 naming both the brand and the competitor (`:194`) and slot 8 reading `known_accuracy_questions` (`:122`, `:210`), which R-12 stops collecting. It is reachable only from `questions.test.ts`. Migrate it onto the matrix or delete it together with its test; do not leave a second generator standing** |
| `questions-id-live.ts:30-52` | `CATEGORY_LABELS` and `categoryLabels` — role and rationale keyed on the five legacy categories, called at `:351` |
| `questions-id-live.ts:368-370` | `two_per_category: true`, `five_unbranded: … === 5`, `five_branded: … === 5` |

### Generation instruction

| File | What |
|---|---|
| `questions-id-provider.ts` | `INDONESIAN_QUESTION_WRITER_INSTRUCTION` — still describes the old slot semantics |
| `questions-id.ts:41` | `INDONESIAN_QUESTION_INSTRUCTION_VERSION = "question-writer-v1"` — **bump** |
| `fixture-journey/report.ts:119` | Consumes the version; update with the bump |
| **`skills/generate-ai-visibility-prompts/SKILL.md`** | **A retained, authoritative generation instruction that states the Intent-5 composition rule directly: `:82-86` (two per category, one unbranded and one branded comparison), `:142-145` (exactly two per category, exactly five unbranded and five branded), `:176-177` and `:194-195` (the `unbranded_prompts: 5` / `five_unbranded` output shape), `:218` (preserve branded allocation). It is named as SETTLED at `DECISION_LOG.md:41` and referenced from `PROMPT_GENERATION_CONTEXT.md:15`, `NOW.md:140`, and `journey/04-questions.md:224`, `:888`. Rewrite it against R-01 or retire it explicitly — an unmigrated skill is a second authoritative generation contract** |

### Report and interpretation

| File | What |
|---|---|
| `report-prompt-contract.ts:2-6` | Assessment rules keyed on `need_discovery`/`solution_discovery`/`comparison` and `validation`/`action` |
| `contracts.ts` observation validation | Legacy `validation`/`action` special-casing |
| `ReportView.tsx` | Report category labels |
| `fixture-journey/adapter.ts:306-336` | `roleOf` and `inputsUsedOf` — role and allowed-input mappings switched on the five legacy categories, consumed at `:343` and `:347`. The legacy assessed-denominator reasoning is documented separately at `:34-38` |

### UI and customer-facing

| File | What |
|---|---|
| `AuditStages.tsx` | Question-review grouping by the five legacy categories, and the group counts |
| **`ExampleReportPreview.tsx:26`** | **"Tanpa menyebut bisnis Anda: 1/5 · Menyebut bisnis Anda: 3/5"** |
| **`ReportPagePreview.tsx:22`** | Same hardcoded `/5` denominators |
| `QuestionsPreview.tsx:30,51` | Hardcoded group counts of 5 and 5 |

### Scripts

`tsconfig.json:31` includes `**/*.ts` and excludes only `node_modules`,
`archive`, and `Archive Candidates` — none of which cover `scripts/`. These are
typechecked, and `npm run check` runs `tsc --noEmit`, so it fails until they are
migrated. They are not optional.

| File | What |
|---|---|
| `scripts/kk/run.ts:74,78` | Imports `PROMPT_MATRIX` and `INDONESIAN_SLOT_MATRIX`; indexes them positionally at `:178` and `:286` |
| `scripts/kopikenangan/kopi-kenangan-live-run.spec.ts:92,175` | `PROMPT_MATRIX[index]` |
| `scripts/openrouter/smoke.spec.ts:116` | Hardcodes `category: "solution_discovery"` |

### Fixtures and tests

**`fixtures/report-golden.ts`** is the protected golden fixture and the largest
single blast radius. It builds `goldenPrompts` from `PROMPT_MATRIX` by index
(`:76-82`) against ten hardcoded questions whose slot 6 names both the brand and
the competitor, and pins slot-6 and slot-5 behavior by index at `:115-127`.
Nine unit suites and two E2E specs import it: `report-pipeline.test.ts` ·
`report-gaps.test.ts` · `report-priority.test.ts` ·
`report-delivery-resilience.test.ts` · `report-pipeline-telemetry.test.ts` ·
`live-reliability-regression.test.ts` · `variance-workflow.test.ts` ·
`similar-businesses.test.ts` · `workflow-storage.test.ts` ·
`tests/e2e/wave1-workflow-lifecycle.spec.ts` ·
`tests/e2e/live-audit-variance.spec.ts`.

Three suites pin the superseded policy as an assertion and must be rewritten,
not merely re-run:

| File | What it pins |
|---|---|
| `question-suggestion-wave2.test.ts:115,133,142,151` | The `default_composition_not_five_five` rule directly |
| `questions-id-live.test.ts:171,203` | Exactly five branded prompts in the live pack |
| `wave3-blocker-regressions.test.ts:68,96,113` | Slot 6 as the designated comparison-target exception |

Also: `fixtures/fixture-kopi-taman-senja.ts` · `contracts.test.ts` ·
`questions.test.ts` · `questions-id.test.ts` ·
`questions-id-provider-regression.test.ts` · `wave2-route-contract.test.ts` ·
`locked-question-pack.test.ts` · `report-prompt-contract.test.ts` ·
`run-orchestrator.test.ts` · `variance.test.ts` · `variance-route-proof.test.ts` ·
`stream.test.ts` · `retry.test.ts` · `groq.test.ts` · `openrouter.test.ts` ·
`fixture-journey/adapter.test.ts`.

### Documentation

`docs/AUDIT.md` · `docs/journey/04-questions.md` · `docs/PRODUCT.md` ·
`docs/DECISION_LOG.md` · `docs/NOW.md` · `docs/V1_PRODUCT_CONTRACT.md` ·
`docs/content/website/FAQ.md` · `docs/PROMPT_GENERATION_CONTEXT.md` ·
`docs/drafts/00-journey-fixtures.md` · `intake-handoff.md` — see R-09.

## R-04 · Migration order

1. Write R-06's agreement tests against the matrix.
2. Fold every matrix and guard onto the matrix, keeping current counts.
3. Migrate the report contract, UI labels, and fixtures.
4. **Only then** change the composition to 6/4.

Changing counts first leaves `slot <= 5` and `index === 5` in place, which stops
checking identity leakage on unnamed slot 6 while today's tests still pass —
they pin the old composition rather than deriving from a matrix.

## R-05 · The deterministic fallback pack is new work

`questions-id.ts:454-494` encodes the old semantics throughout:

- **Slot 6** is `Bandingkan ${brand} dengan ${competitor}…` — it names both.
  Under R-01 slot 6 forbids both. It is also the repair target used by
  `repairIndonesianSuggestion`, so a leak here is written *by the safety
  mechanism itself*.
- **No template carries a target-bearing comparison.** New slot 9 requires the
  target; today's slot 9 is `Bagaimana cara ${action} dengan ${brand}?`, a
  contact question. That template must be written.
- The remaining eight map to different purposes than the categories they were
  written for.

Derive all ten from the matrix. A template adapted by analogy will not satisfy
R-06.

## R-06 · Agreement tests, in both directions

All derive their slot sets from the matrix; none may hard-code `1–6`.

1. **Forbidden identity is rejected.** For every slot where the audited brand
   is forbidden, a question containing the brand name or any known variant is
   rejected. Same for the comparison target.
2. **Required identity cannot disappear.** For every slot where the audited
   brand is required, a question *omitting* it is rejected. Slot 9 additionally
   rejects a question omitting the comparison target.
3. **Slot 6 names neither** — the one slot where both prohibitions apply, and
   the one the current fallback violates.
4. **Composition integrity.** A pack of six unnamed plus three genuinely-named
   questions must not pass as valid 6/4.
5. **Slot 9 carries a comparison relation.** Naming both parties is not enough:
   the question must satisfy one of R-10 rule 3's three forms. The eight cases
   listed there are required, including the two rejections that prove a marker
   sitting anywhere in the sentence does not pass.
6. **A name-only comparison target survives the projection.** A regression
   test, not a review item, in four cases: (a) `verified_competitor.name` set
   to R-13's category-level fallback with an empty `source_url` reaches the
   minimized brief as `comparison_business`, not `null`; (b) slot 9 built from
   that brief satisfies both the required comparison-target identity and R-10
   rule 3's relation predicate; (c) a URL-backed comparison target projects
   exactly as it does today, `source_url` included and unchanged; and (d) an
   unnamed slot asking about alternatives in the customer's own category is
   **not** rejected as comparison-target leakage while the fallback is the
   target, though a named business in that slot still is.
7. All six run against the deterministic fallback pack as well as generated
   packs. That is what proves R-05.

## R-07 · The generation instruction derives from the matrix

`INDONESIAN_QUESTION_WRITER_INSTRUCTION` still describes the old slot
semantics. Left unchanged, the migration can look green while the model
generates invalid questions and the repair layer silently substitutes fallback
templates — a degraded product with no failing test.

Required: slot descriptions generated from or derived from the matrix; an
agreement test comparing writer-instruction semantics with the matrix slot by
slot; a bump of `INDONESIAN_QUESTION_INSTRUCTION_VERSION`; and every fixture
pinned to that version updated. This is Blocker A, not cleanup.

## R-08 · Report semantics move into the measurement definition

`report-prompt-contract.ts:2-6` keys assessment rules on the five legacy
categories. R-01's ten match none of them, which produces both failure modes:

- **silent degradation** — blank report labels, generic role and rationale
  fallbacks, observations falling through per-category assessment;
- **hard failure** — observation validation still special-cases `validation`
  and `action`.

Each slot's report assessment class, customer-facing label, and recommendation
applicability live in the matrix or a structure derived directly from it. Do
not create a third independent category mapping.

## R-09 · Document reconciliation

`docs/AUDIT.md` outranks this spec on measurement method (`INDEX.md` §Authority)
and currently preserves the old policy.

| Document | What contradicts the locked model |
|---|---|
| **`AUDIT.md:33`** | "the final customer-approved composition, which **may contain any mix**" |
| `AUDIT.md:81` | "five-and-five composition" |
| **`journey/04-questions.md:51-55`** | 5/5 default, and customers "may freely rewrite … including changing the original purpose or the five/five balance" |
| `journey/04-questions.md:72,84-86` | The five-purpose coverage guide and its 5/5 breakdown |
| `journey/04-questions.md:224,888` | Names `generate-ai-visibility-prompts` as the generation method |
| **`DECISION_LOG.md:34`** | The 2026-07-29 Intent-5 entry: five categories, two questions each, five-unbranded/five-branded — **SETTLED** |
| **`DECISION_LOG.md:41`** | The 2026-07-31 entry making `generate-ai-visibility-prompts` the universal default skill "with five unbranded and five branded questions" — **SETTLED** |
| `DECISION_LOG.md:60` | The 2026-08-17 five-and-five coverage brief |
| `PRODUCT.md:164-165` | "five … five … may change that composition" |
| `PRODUCT.md:109` | Lists Google Maps as an accepted source, which R-11 defers |
| `NOW.md:141-144` | "not a composition the customer must preserve" |
| `NOW.md:140` | The universal Intent-5 matrix and skill described as known-good |
| `FAQ.md:61-63` | Customer-facing 5/5 and composition-change language |
| `V1_PRODUCT_CONTRACT.md:291-300` | The 6/4-versus-shipped conflict; mark resolved |
| **`intake-handoff.md:151-160`** | "Blocking conflict with shipped code — not resolved here", ending in "That gap needs a founder decision before intake implementation lands." The decision has been taken; mark it resolved and point at this spec |
| **`docs/drafts/00-journey-fixtures.md:63-84`** | A section headed **"Composition decision: 5/5, not 6/4"** that decides against the locked model outright; also `:671-674`, `:689`, `:711`, `:731` |
| `PROMPT_GENERATION_CONTEXT.md` | Legacy category semantics; `:15` points at the skill |

All three `DECISION_LOG.md` entries are marked SETTLED. Superseding only one
leaves two authoritative-looking decisions standing against this spec. Supersede
`:34`, `:41`, and `:60`, and add the corresponding rows to the superseded-
directions table (`DECISION_LOG.md:79` onward) with the 6/4 model as the
superseding direction.

Also state explicitly that Spec 007 absorbs Spec 004's source-intake
responsibility, set spec 004 to **Superseded** at the handoff (R-28), register
Spec 007 in `INDEX.md`, and note that approval does not reorder `NOW.md`'s
phase gates — the live-report quality gate remains the current objective until
the founder advances it.

## R-10 · Editing preserves measurement purpose

The ten slots are a measurement definition, not ten editable text boxes. The
risk is a pack that passes structural 6/4 validation while a slot no longer
measures what it exists to measure — `brand_fit` reduced to an address lookup,
`category_recommendation` to an unrelated factual question,
`direct_comparison` to something that does not compare.

The slot frame, not free-text analysis, is the primary defence: a question
cannot leave its slot, and the slot's policies travel with it.

**Mechanism: constrained editing.** The user edits within a slot. The slot's
category, purpose, and both identity policies are fixed, displayed, and not
editable. Composition cannot drift, because no edit moves a question between
slots.

**What V1 enforces, and how.** Purpose is upheld by the fixed slot frame plus a
small set of mechanical checks. V1 does not build a semantic purpose classifier
for ten slots.

*Hard block on save* — every check deterministic, every failure carrying a plain
Indonesian message that names what the slot must ask:

1. R-06 rule 1 — none of the slot's forbidden identities appear.
2. R-06 rule 2 — every identity the slot requires appears. On slot 9 that
   includes the comparison target.
3. Slot 9 additionally requires a **comparison relation between the two named
   parties**, not merely both names present somewhere in the text. Nothing in
   the tree defines one — `containsIndonesianComparisonIdentity`
   (`questions-id.ts:278`) tests identity presence only — so the predicate is
   defined here in full, as `comparisonRelationMarkers` data on the slot
   (R-02), not as a heuristic inside the validator.

   **Matching.** Whole normalized tokens, using the rule already in
   `question-suggestion-guards.ts:7-14`: lower-case with the `id-ID` locale,
   replace every non-alphanumeric run with a space, split on whitespace, compare
   complete tokens. Never substring matching — that is what makes the two-letter
   `vs` safe. An identity's "token run" below means the consecutive tokens of
   the audited brand, a known variant, or the comparison target, matched the
   same way.

   The question passes when both required identities are present **and** at
   least one of these three forms holds:

   | Form | Rule |
   |---|---|
   | **1 · Direct marker** | Any of these tokens appears anywhere: `bandingkan`, `dibandingkan`, `membandingkan`, `perbandingan`, `dibanding`, `banding`, `versus`, `vs`, `daripada`, `perbedaan`, `berbeda`, `membedakan`, `beda`, `bedanya` |
   | **2 · Identity choice** | The token `atau` appears with one identity's complete token run **immediately before** it and the other identity's complete token run **immediately after** it |
   | **3 · Bracketed comparison** | Both `antara` and `lebih` appear |

   Adjacency in form 2 is what ties the relation to the two parties rather than
   accepting a marker anywhere in the sentence. `lebih` never satisfies the rule
   on its own — it is ordinary quantity phrasing — and qualifies only through
   form 3.

   R-06 test 5 covers the predicate, and these cases are required:

   | Question shape | Must | Via |
   |---|---|---|
   | `Bandingkan X dengan Y…` | accept | form 1 |
   | `Apa perbedaan X dan Y?` · `Apa bedanya X dan Y?` | accept | form 1 |
   | `Mana yang lebih nyaman untuk meeting, X atau Y?` | accept | form 2 |
   | `Kalau buat nongkrong lama, mending X atau Y?` | accept | form 2 |
   | `Antara X dan Y, mana yang lebih cocok?` | accept | form 3 |
   | `Apakah X dan Y buka lebih dari 8 jam?` | **reject** | no form holds |
   | `Di mana alamat X dan Y?` | **reject** | no form holds |
   | `Apakah X buka lebih dari 8 jam atau tidak, dan di mana alamat Y?` | **reject** | `atau` is not between the identities |

   The lists are finite and spec-owned. Adding a token or a form is a spec
   change, not an implementation choice.
4. The text is non-empty, within `promptSchema`'s 700-character bound
   (`types.ts:140`), and phrased as a question.

*Warn, do not block* — a drift away from the slot's stated purpose that no
mechanical check can establish. The screen restates the slot's purpose and says
the edit may no longer measure it; the user may proceed. A warning never
prevents completing intake.

**What this does and does not guarantee.** Locked decision 6 says users may
not change a slot's measurement purpose. The mechanism above delivers that
wherever it is mechanically decidable: category, declared purpose, and both
identity policies are fixed matrix metadata no edit can reach, and the four
checks hard-block. It does not deliver it for wording that keeps the slot's
required identities, passes every check above, and still stops measuring what
the slot exists to measure. Nothing detects that.

**The founder settled this on 2026-08-30: warn and proceed** — the mechanism
above ships as written, and Nuave runs no model-assisted purpose validation on
edits in V1. The reasoning is recorded in `DECISION_LOG.md`: a validator strong
enough to block would add a model call per save and a false-positive class that
can trap a paying customer at the final intake step. What survives a drifted
edit is bounded and stated precisely — identity and composition labels and the
reported denominators remain mechanically correct, because they derive from the
final question text; the slot's measurement intent may not.

**This spec must therefore not be described as providing semantic purpose
validation.** It provides a fixed slot frame, four mechanical guarantees, and a
warning.

**Boundary:** R-10's accepted enforcement gap is independent of R-20. R-20
concerns bypass outside the supported client journey; R-10 concerns
undetectable purpose drift within it.

If real packs later show customers materially degrading their own slots,
hardening one specific slot is a narrower decision to take then.

Replacing a question means replacing it *for that slot*. There is no
free-composition editor.

Reported denominators continue to derive from the actual final question text —
existing behavior, preserved.

---

# Blocker B — Workflow and data authority

## R-11 · Sources

Official website and Instagram profile; Google Maps deferred.
`parseSourceInput` remains the single authority. A public source is mandatory;
there is no brand-name-only entry path.

## R-12 · Field ownership contract

Every field has an owner, a screen, a requiredness decision, and invalidation
rules. Requiredness follows from whether the audit needs the field — not from
the existence of an old screen. **No required or editable field lacks a screen**,
because R-17's error routing must always be executable.

| Field | Owner | Screen | Required | Invalidated by |
|---|---|---|---|---|
| `brand_name` | Extracted | Brand confirm | Yes | — |
| `official_sources` | Derived from submitted source | Brand confirm (shown) | Yes (min 1) | Source change |
| `entity_scope` | Extracted, then **co-owned by the branch or product screen** | Scope, then branch or product when one applies | Yes | Scope-kind change (drops the branch or product part) |
| `brand_type` | Extracted | Scope | Yes | — |
| `category` | Extracted, offered as choices | Category | Yes | — |
| `market_context` | Extracted | Market — **never skipped** | Yes | **Scope change** |
| `target_customer` | Extracted | Customer reasons | Yes | — |
| `verified_offerings` | Extracted chips | Offerings | Yes (min 1) | **Scope change to single product** |
| `verified_customer_needs` | Extracted chips | Customer reasons | **Yes — add `.min(1)`** | — |
| `verified_decision_criteria` | Extracted chips | Customer reasons | **Yes — add `.min(1)`** | — |
| `verified_competitor` | Proposed (R-13) | Comparison target | **Yes — add `.min(1)` on `name`** | **Scope or category change** |
| `similar_businesses` | Extracted suggestions | Comparison target (as choices) | No | Category change |
| `usp` | Extracted | Facts | No | — |
| `customer_supplied_facts` | Customer-entered | Facts | No | — |
| `brand_name_variants` | Derived; editable | Review | No — empty is legitimate | Brand name change |
| `priority_offering` | Derived from `verified_offerings` | — | Derived | Offerings change |
| `conversion_action` | Deterministic default by category | — | Default | Category change |
| `regulated_category_notes` | Deterministic default | — | Default | Category change |
| `known_accuracy_questions` | **No longer collected**; empty | — | — | — |
| `agency_name`, `agency_logo_data_url` | **No longer collected** (agency layer deferred, `NOW.md`); empty | — | — | — |
| `language` | Frozen literal `en-US` | — | Default | — |

`verified_customer_needs`, `verified_decision_criteria`, and
`verified_competitor.name` accept empty values today while the audit needs
them. Those three schema changes are deliberate.

`market_context` stays required on every path. It is `requiredText` in
`businessBriefSchema` (`types.ts:68`), and `PROMPT_INPUT_FIELD_MATRIX` feeds it
into six of the ten slots. A business with no geographic market still has a
market context — nationwide, or online across Indonesia. What scope changes is
what the Market screen asks, not whether the field is required and not whether
the screen appears. See R-14.

**The branch or product choice is written into `entity_scope`, and nowhere
else.** R-24's conditional screen produces a value the audit must carry, and no
other field can hold it: a dedicated `selected_branch` would need its own
schema, invalidation rule, and prompt-matrix entry, and this iteration is not
adding a field to the brief. The Scope screen sets the kind, the conditional
screen completes the value, and the canonical forms are the approved
prototype's own readback (`intake-prototype.html:1348-1350`):

| Scope | Canonical `entity_scope` |
|---|---|
| Whole brand | `Seluruh brand <brand_name>` |
| One branch or location | `Cabang: <nama cabang>` |
| One product or service | `Produk: <nama produk atau layanan>` |

A branch or product the customer adds by hand supplies its own name. The
extracted `entity_scope` seeds the Scope screen's default selection, per R-16;
what the brief carries is the customer's selection in the form above. This is
the string `minimizeIndonesianBrief` hands to question generation as `scope`
(`questions-id.ts:127`), so it must read as Indonesian a customer would
recognize. Changing the scope kind recomposes the value and drops the previous
branch or product name — it never leaves the old name inside the new scope.

One consequence to carry into Blocker A: the whole-brand form contains
`brand_name`, so `entity_scope` may be supplied only to slots where the audited
brand is already required. `PROMPT_INPUT_FIELD_MATRIX` satisfies this today —
`entity_scope` appears in three rows, and each already carries `brand_name`
(`contracts.ts:227-249`) — and the canonical matrix must keep it that way.
Handing this field to one of the six unnamed slots would put the brand name in a
question R-01 forbids it in.

## R-13 · How the comparison target is created

Extraction does not currently produce `verified_competitor`. Specify it as an
**explicit deterministic post-extraction derivation step**: after extraction,
Nuave proposes one target and offers `similar_businesses` as selectable
candidates when present, with the extracted category and market context framing
what the screen asks for. The derivation is stated exactly below; none of it is
left to the implementer's reading.

It is **not** silently taken from `similar_businesses` — that array is
suggestions, and the product contract does not define it as the target. A
suggestion shown as a proposal the customer must act on is not a silent take;
writing one into the brief unseen is.

The user accepts, edits, or replaces the proposal. The goal is to learn how the
model positions the business against something a customer would realistically
choose; it is not a competitor taxonomy.

**The derivation, exactly — and it makes no additional provider or web call.**
Founder decision, 2026-08-30 (`DECISION_LOG.md`). The comparison screen is
reached in one of two states, and there is no third:

1. **`similar_businesses` holds at least one entry with a usable name or URL.**
   The first such entry in the returned order becomes the *proposal*, rendered
   on the comparison screen with its name and source and labelled as Nuave's
   suggestion. `verified_competitor` is written when the customer accepts,
   edits, or replaces it — never before. Nothing is written on the customer's
   behalf while they are not looking, which is what "not silently taken"
   forbids.
2. **`similar_businesses` is empty.** This is a normal outcome, not a failure:
   extraction is instructed to return an empty list when it is not confident
   (`openai.ts:305`), and `extractionDraftOrManualFallback` always produces one
   (`openai.ts:212`). The screen then asks the customer to name the business a
   customer would realistically compare them against, and offers **one fallback
   they may accept instead** — the category-level alternative, written as
   `alternatif lain di kategori <kategori>`. The fallback exists so a customer
   who genuinely cannot name a competitor is not trapped:
   `verified_competitor.name` is required (R-12), and on this path the fallback
   is the only way that requirement is satisfiable. Its consequence is
   deliberate and worth stating: the fallback becomes `comparison_business`
   (`questions-id.ts:103`), so slot 9 compares the business against a category
   alternative rather than a named one. That is the honest version of what the
   customer told us, and it still carries the comparison relation R-10
   requires.

`withPrimarySimilarBusiness` (`similar-businesses.ts:150-181`) today writes the
first valid suggestion straight into `verified_competitor` with no customer
step. Its ranking is what case 1 keeps; the silent write is what this
requirement removes.

**The fallback must survive the Indonesian projection, and today it would not.**
`minimizeIndonesianBrief` builds `comparison_business` only when
`verified_competitor.source_url` is non-empty as well as the name
(`questions-id.ts:141-147`), so the fallback — which deliberately has no source —
would arrive at generation as `comparison_business: null`, and slot 9 would lose
the target R-10 requires it to name. The contract, which Blocker A implements:

- **A non-empty `verified_competitor.name` produces a comparison target.** The
  name alone is sufficient; the URL is not part of the test.
- **`source_url` may be empty, and stays empty.** No URL is invented,
  synthesized, or substituted for the category-level fallback. It is not a
  business with a website, and the brief must not imply it is.
- **A comparison target the customer chose with a real URL keeps it**, projected
  exactly as it is today.
- **The fallback is not an identity, and the leakage guard must not treat it as
  one.** The comparison-target leakage check exists to stop a *named* business
  appearing outside slot 9. `alternatif lain di kategori <kategori>` is category
  vocabulary, and slots 1 through 6 legitimately ask about alternatives in a
  category — matching it there means the customer's own category words appeared,
  not that a target leaked. When the comparison target is this fallback, the
  comparison-target leakage check does not run. Every check on the audited
  brand's own identity is unaffected, in every slot.
- **How the fallback is recognized**, so this is decidable and not a judgement
  call: the comparison target *is* the fallback exactly when its name equals the
  composed string for that brief's own `category`, compared after the same
  normalization the identity guards use (`question-suggestion-guards.ts:7-14`).
  Nothing else is treated as the fallback, no field is added to
  `verified_competitor` to mark it, and a customer who types that phrase
  themselves gets the same treatment — which is the right one, because they have
  told us the same thing.

R-03 carries the migration row and R-06 rule 6 carries the regression test.

**Field mapping**, because three concepts coexist unnamed:

| Concept | Where | Role |
|---|---|---|
| `verified_competitor` | `types.ts:76-80` | **The comparison target** |
| `comparison_business` | `questions-id.ts:103` | Derived from `verified_competitor` and nothing else; the string the guard screens |
| `similar_businesses` | `types.ts:81` | Optional suggestions offered as choices |

## R-14 · Conditional screens and stale data

Scope determines which screens apply: a single location shows the branch
screen, a single product shows the product screen, whole-brand shows neither.

**The Market screen is not one of the conditional screens.** It is always
shown, because `market_context` is required on every path (R-12). Scope changes
the question it asks — a service area for a single location, national or online
reach for a whole brand or a single product — and therefore changes the value,
never the screen's existence.

**Changing scope after answering downstream screens must not leave stale data
in the audit.** Concretely: a user picks a single location, answers
location-specific market questions, goes back, and switches to a nationwide
product. The branch-specific market answer must not survive into the final
brief.

Rules, per the invalidation column in R-12:

- **Clear and re-ask** `market_context` when scope changes in a way that
  changes whether geography applies.
- **Re-derive** `conversion_action`, `regulated_category_notes`, and
  `priority_offering` from their new upstream values.
- **Re-propose** `verified_competitor` on scope or category change, preserving
  a user-edited value but marking it for re-confirmation at review.
- **Preserve** everything else.

Skipping a conditional screen may never leave a required field with no screen
that owns it. If a skip would orphan a field, the field is either not required
in that path or the screen is not skipped. `market_context` was the one field
this rule could have stranded; it is settled above by never skipping its screen,
so no path is left to the implementer's reading.

## R-15 · Extraction runs after payment, once per accepted source

On entry to intake, `AuditWorkflow` calls `/api/audit/extract` with the
confirmed source and any user-corrected name. Route behavior is unchanged.

Two POST call sites exist today — `LandingAuditHero.tsx:96` (removed by R-19)
and `AuditWorkflow.tsx:694`. R-15 adds a third trigger point.

**Guarantee: one extraction per accepted source version during the supported
uninterrupted client journey.** Achieved with an in-flight guard plus a
draft-present check: extract only when no draft exists **for the current
accepted source** and no extraction is in flight.

**A corrected source is a new source version, and it re-extracts.** Brand
confirm offers *Bukan, ganti brand*, and the correction screen says Nuave will
read the corrected source again (`intake-prototype.html:575-584`). A literal
"extract only when no draft exists" would strand that customer with the wrong
business's facts, and R-12 already lists a source change as what invalidates
`official_sources`. Accepting a corrected source is therefore a **replacement
extraction**, not a duplicate one:

- `official_sources` is replaced.
- The draft from the superseded source is discarded, and every AI-owned field
  the customer has not edited is re-drafted from the new extraction.
- Values the customer entered or edited are preserved and marked for
  re-confirmation at review — the treatment R-14 already gives a user-edited
  comparison target. The correction screen promises exactly this: *Yang sudah
  Anda isi tidak hilang*.
- Derived fields are re-derived from their new upstream values, per R-14.
- Exactly one extraction runs for the new source version. The in-flight guard is
  unchanged; what changes is that the counter is per accepted source, not per
  journey.

**A name correction alone is not a new source version.** The correction screen
takes a name and an *optional* source. When only the name changes, nothing
re-extracts: the name is user-verified per R-18 and the existing draft stands. A
changed source is what triggers replacement extraction, and nothing else does —
this is a paid call, and a customer fixing a spelling must not spend one.

This is deliberately **not** called idempotency. It does not protect against a
lost session, a retry before state is stored, or concurrent transitions.
Durable request idempotency is deferred with that risk accepted.

## R-16 · The intake presents a populated draft

Every **AI-owned** field is pre-populated when extraction produced a usable
value. Intentionally customer-supplied fields — `customer_supplied_facts` — may
start empty.

Where extraction returned nothing for an AI-owned field, the screen says so
plainly and asks. It never renders an unexplained blank.

## R-17 · Validation and correction

- **Next stays enabled.** Do not pair a disabled Next with an error that only
  appears on press. Pressing Next either advances or surfaces an actionable
  error on the responsible field and moves focus there.
- **Final validation routes to the owning screen** with the field focused.
  `AuditWorkflow.tsx:209`'s global schema-path string is replaced.
- **Messages are human Indonesian**, tied to the field, reviewed against
  `VOICE.md`. Never a schema path.
- **Confirmation stays explicit.** The existing `factsConfirmed` action is the
  review screen's primary action. Traversing screens does not imply it.

## R-18 · Recovery when identification fails

A valid source that yields no confident name asks the user to confirm or
correct it. The copy must say Nuave could not read the name from this source —
**never "we found your business."**

The unverified state is a boolean on the identity result, carried into the
extraction request so the draft is not built as though the name were verified,
surfaced on brand confirm as the reason it is asking, and cleared when the user
confirms. It is not persisted into `BusinessBrief`: once the user confirms, the
name is user-verified, which is this product's standard everywhere else.

This is recovery after a real source, not entity search. The user may correct a
detected name at any point during review.

---

# Blocker C — Payment boundary

## R-19 · Workflow invariant

The supported Nuave journey does not trigger personalized extraction before
simulated payment success.

`LandingAuditHero.tsx:96` currently POSTs `/api/audit/extract` after a GET
budget bootstrap at `:78`, then writes `factsExtracted: true` via
`createInitialExtractedAuditWorkflowState` (`workflow-storage.ts:38`) and
redirects to `/audit?entry=landing-extracted`. Rewire it to call R-21 and hand
off to the preview.

**Two distinct mechanisms carry that handoff and must not be described as one:**
the `?entry=landing-extracted` query parameter drives `AuditEntryShell.tsx:13`,
while `factsExtracted` drives `deriveAuditStep` (`stream.ts:174`). Both need
updating.

State whether the GET budget bootstrap is still needed at the landing after the
pre-payment flow changes; if extraction no longer happens there, it is not.
`AuditWorkflow.tsx:484` performs its own unconditional GET bootstrap on mount,
which is not personalized extraction and does not violate this invariant.

## R-20 · What is proven, and what is not

Payment/extraction ordering is proven **for the supported client journey**
using routing and unit tests, a single-call-site guarantee, and E2E network
assertions.

**True server-authorized entitlement enforcement remains deferred.** A
client-side paid flag is not authorization; a determined caller can invoke the
extraction route directly. This spec does not build, and must not be described
as building, a security boundary. No anti-double-charge guarantee is specified,
because no charge exists.

---

# Blocker D — Safe source handling

## R-21 · The identity endpoint

`GET /api/audit/identity?source=…` performs **no provider call and costs
nothing**. It fetches the public source server-side and returns only: display
name, description, canonical URL, inlined icon, source type, and a confidence
flag. Never category, offerings, customers, or competitors.

**Instagram** — business name from `og:title`, parsed before ` (@`; **not**
`og:site_name`. Do **not** use Instagram's `og:description` as the description,
it contains follower and post counts. Do **not** render Instagram's `og:image`
from the browser: those URLs expire and `tests/e2e/network-guard.ts` fails any
third-party browser request. Proxy and inline server-side, or omit.

These behaviors were observed during spec research and are **not reproduced in
a committed test**. Confirm each against a live profile as the first step of the
Instagram path and record the observation date.

**Website** — name from `og:site_name` → `og:title` → `<title>`; description
from `og:description` → `meta[name=description]`; favicon from
`link[rel~=icon]` with a `/favicon.ico` fallback.

## R-22 · SSRF controls, with the feasibility determination settled

This introduces the first first-party server-side fetching of user-supplied
URLs — `extract/route.ts` performs none today; extraction reaches URLs only
through the provider's web search.

**The feasibility determination R-22 required is complete**:
[`R-22-SSRF-FEASIBILITY.md`](./R-22-SSRF-FEASIBILITY.md), 2026-08-30. Its
outcome:

**DNS pinning is not achievable on this runtime, and V1 does not attempt it.**
Workers' `fetch()` exposes no DNS control — no resolver override, no `lookup`
hook, no way to bind a request to a pre-resolved address. That alone settles it.
A second obstacle is documented: Workers subrequests can be made to URLs only,
not to IP addresses directly, which also rules out resolving the address
ourselves and fetching it. That the failure surfaces as error 1003 is
community-sourced and nothing rests on it. `connect()` from
`cloudflare:sockets` is the only path to a genuine pin and would mean writing
HTTP/1.1, TLS, redirects, and chunked decoding by hand on a socket path whose
raw-IP and custom-SNI support is undocumented.

**The founder accepted the residual risk on 2026-08-30** (`DECISION_LOG.md`),
explicitly and as a V1 tradeoff. The grounds are the deployment's shape:
**no binding gives `fetch()` a new internal target.** `wrangler.jsonc` declares
one resource binding, `ASSETS`, and no Workers VPC, Hyperdrive, Durable Object,
or KV. API credentials do reach the code as environment bindings
(`groq.ts:99`, `openai.ts:58`), which Cloudflare also calls bindings — they are
not HTTP destinations, and that is the distinction the argument rests on.
Reaching a private network or a Tunnel from a Worker requires a VPC binding,
and this Worker has none: the repository proves the binding is absent, not that
the account has no Tunnel, and the binding is the half that matters. Workers
exposes no VM-style metadata service. So the high-impact SSRF target does not
exist here. The realistic residual is abuse of Nuave as a public fetch proxy,
which **R-23** bounds. Every other control in the table below stays mandatory.

This is **not** a claim that DNS rebinding has been eliminated, and **not** a
claim that Cloudflare blocks a hostname resolving to private space — that
behavior is unverified. The determination records the revisit triggers and the
one cheap live check that would settle it.

Objectively testable acceptance. Every value below is fixed by this spec and
must have a test:

| Control | Value |
|---|---|
| Protocols | `http:` and `https:` only; every other scheme rejected before any DNS lookup |
| Reserved networks | Reject localhost, loopback, private, link-local, unique-local, and cloud-metadata ranges — IPv4 and IPv6, including IPv4-mapped IPv6 |
| DNS answers | Resolve **both** families before every fetch — `resolve4` and `resolve6` from `node:dns`, which `nodejs_compat` provides; `lookup`, `lookupService`, and bare `resolve` throw *Not implemented* and cannot be used. **Every address in either answer must pass the reserved-network rules; one disallowed address rejects the hostname.** One family returning nothing is normal and is not a failure — `resolve6` **rejects** with `ENODATA` or `ENOTFOUND` for an IPv4-only host rather than returning an empty array, and treating that rejection as a failure would break most of the web. Both families returning nothing, or either failing for any other reason, rejects the hostname. Four required tests: public `A` with private `AAAA`; private `A` with public `AAAA`; an IPv4-only host whose `resolve6` rejects; and both families failing. This is preflight validation only — `fetch()` re-resolves and cannot be bound to the address checked, which is the accepted residue above |
| DNS rebinding | **Accepted residual risk, not technically mitigated by pinning** — founder decision, 2026-08-30. No pin is available on this runtime. V1 instead revalidates every redirect hop against every other row in this table |
| Redirects | **At most 3 hops.** Every hop revalidated against every rule in this table before it is followed; hop 4 is a failure, not a truncation |
| Timeout | **5 s per request**, **10 s total** across the whole redirect chain, via `AbortSignal.timeout` as `groq.ts:178` already does |
| Response size | **512 KB**, counted as bytes read from the response body and enforced while streaming; abort at the byte that exceeds it, never buffer then check. Those bytes are **decoded**: a Worker that reads a body reads it decompressed, so compressed wire bytes are not observable here and `Content-Length` is not the measurement — it may be absent, describe encoded bytes, or survive decompression unchanged. Decoded bytes are also the bound that protects the parser |
| Content type | The identity fetch accepts `text/html` and `application/xhtml+xml` only; anything else is rejected without reading the body |
| Credentials | Never forward cookies, authorization headers, or credentials; never follow a redirect that carries them |
| Per-destination rate limit | R-23's hostname limiter is consumed **immediately before every outbound fetch** — the submitted URL, each redirect destination, and each icon fetch — keyed on that request's own destination hostname. A refusal ends the attempt; it is not a hop |
| Icon fetching | The same protocol, reserved-network, DNS-answer, redirect, timeout, size, and rate-limit rules. Content type is restricted to image types instead of HTML |

These are metadata fetches of a public page's `<head>`. The numbers are sized
for that and are deliberately far below the provider-call timeouts in
`groq.ts:55` and `openrouter.ts:90`, which are model calls and not a precedent
here. Changing a value is a spec change, not an implementation choice.

## R-23 · Rate limiting: decided — the Workers Rate Limiting binding

**Decision, 2026-08-30: include it now.** The premise that a rate limiter needs
the durable infrastructure this spec defers is false on this runtime. Cloudflare
ships a **Rate Limiting binding** for Workers that needs no Durable Object, no
KV, and no paid storage: counters are held per Cloudflare location and updated
in the background.

This also carries R-22's residual. The determination found open-proxy abuse to
be the real exposure of an unauthenticated fetch endpoint; this is what bounds
it.

**Configuration** — a `ratelimits` entry in `wrangler.jsonc` per limiter, each
with a `name`, a unique `namespace_id`, and `simple: { limit, period }`. The
runtime accepts a `period` of **10 or 60 seconds only**. Call
`env.<NAME>.limit({ key })` and branch on the returned `success`.

| Route | Key | Limit |
|---|---|---|
| `/api/audit/identity` | Caller IP (`CF-Connecting-IP`) | 10 per 60 s |
| `/api/audit/identity` | Normalized hostname of each outbound destination | 20 per 60 s |
| `/api/audit/extract` | Caller IP (`CF-Connecting-IP`) | 5 per 60 s |

The second identity limiter is the one that matters for R-22: it bounds how
hard any single third-party host can be hit through Nuave, which an IP-keyed
limiter alone does not. **It is consumed inside the outbound fetch primitive,
immediately before each request and keyed on that request's own destination
hostname** — not once at the route, on the hostname the caller submitted.
Keying it on the submitted hostname would not bound the target at all: R-22
permits three redirect hops and a separate icon fetch, so a caller rotating
throwaway hostnames that redirect to one victim — or serving a page whose
favicon points at the victim — charges each request to a fresh bucket and never
touches the victim's. A refused limiter ends the attempt with R-17's message.

What it bounds is still **per Cloudflare location, not global** — the counter is
per-colo, so a distributed caller can exceed the nominal figure by a factor of
the colos it reaches. It raises the cost of using Nuave to hammer one target; it
is not an exact global ceiling. Extraction is limited because it is the surface
that spends founder budget; a journey needs one call.

**Stated limitations, so this is not mistaken for more than it is.** The
counters are per-colo and eventually consistent, and Cloudflare documents the
API as permissive and explicitly not an accounting system. Cloudflare also
discourages IP addresses as keys, because callers share them — the IP-keyed
limits above are therefore set generously and are a coarse backstop, not a
per-user quota. **This is not an entitlement boundary**; R-20 continues to
govern that, and rate limiting does not change what a determined caller can
reach.

Exceeding a limit returns a plain Indonesian message per R-17, never a raw
error.

---

# The journey

## R-24 · Screens

**Pre-payment:** source entry · scan · preview · order and delivery email ·
simulated checkout · processing · success.

**Post-payment:** brand confirm · (source correction, conditional — R-15) ·
scope · (branch | product, conditional; the choice is written into
`entity_scope` per R-12) · category · offerings · customer reasons · market ·
comparison target · facts · review · question review · run.

## R-25 · What the preview shows

Real, from R-21: business name, description, source URL, and icon. **The
preview is personalized identity by design** — `PRODUCT.md` §2 requires a
best-effort identity preview.

What must not appear before payment: **no personalized audit measurement,
finding, recommendation, competitor result, score, appearance count, or
paid-report result.**

The report card's result region is illustrative only — visibly labelled in
Indonesian as an example, obscured, and `aria-hidden`.

The result slot uses the settled label **Bisnis Anda muncul di X dari 10
pertanyaan** (`VOICE.md:42`). The prototype's "Skor Visibilitas AI" is a
retired concept (`DECISION_LOG`, 2026-08-17) and must not ship. Any example
composition rendered as `/5 + /5` — `ExampleReportPreview.tsx:26`,
`ReportPagePreview.tsx:22` — becomes `/6` and `/4`.

## R-26 · Order screen, navigation, session, copy

- **Order screen** between preview and checkout: delivery email, audit scope,
  the Rp99.000 total with no additional fee, the 30-day quote validity, and
  Terms and Privacy — per `PRODUCT.md:64` and `:277`, `DECISION_LOG.md:67`.
- **In-product Back only.** Previous currently-applicable screen, skipping
  conditional screens that no longer apply, recalculating the later flow per
  R-14. After payment, Back never re-enters the unpaid journey; the first
  post-payment screen may omit Back. No browser-history state machine.
- **Session state** as needed to run the journey. Bump
  `AUDIT_WORKFLOW_STORAGE_KEY` when the shape changes
  (`workflow-storage.ts:25`). Persistence architecture is not what this
  iteration tests.
- **Copy** passes VOICE review: "Cek brand saya" → the settled **Cek bisnis
  saya di AI**; "Kompetitor" → the preferred term; bare "AI" as actor →
  **model AI**. **Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda**
  stay verbatim.

## R-27 · UI implementation

Build on `@base-ui/react`, which already ships `radio`, `radio-group`,
`toggle`, `toggle-group`, `checkbox-group`, and `collapsible`.

**Do not run `npx shadcn add` against the default registry** — it installs
Radix primitives and forks the stack. `components.json` is configured for
`base-nova` with the `@beui` registry; check `@beui`, then compose on Base UI.

Build only what the journey needs: selection card, selection row, chip, bottom
navigation with chapter progress, floating pay bar, scan steps, example report
card. Each keyboard-operable, with visible focus, correct ARIA state, and 44px
targets.

Global token, typography, focus, and legacy-CSS migration are **not**
prerequisites. Pixel parity with the old intake is not a goal.

## R-28 · Sequencing and acceptance

Blocker A includes migrating **every legacy-category consumer required to keep
the current funnel working** — notably `AuditStages.tsx`, whose question-review
screen groups by the five legacy categories and would render empty if the enum
changed underneath it, and `locked-question-pack.ts`, which is on the live
`/api/audit/run` and `/api/audit/variance` paths and relabels every reviewed
question from a positional table. Complete that migration first; then build
`/audit/v2`.

Two distinct gates:

**Pre-handoff verification.** The complete `/audit/v2` journey verified
independently while the production entry path is unchanged. A disconnected
`/audit/v2` may pass this. It is **not** final acceptance.

**Final acceptance.** Connect the landing handoff, then run the end-to-end
journey starting from the real landing entry.

The Playwright specs that assume landing → extraction behavior are updated
deliberately at the handoff. Do not claim they pass unchanged.
`wave1-workflow-lifecycle` is in no configured `testMatch`
(`playwright.config.ts:13-14`) and must be added to one before it counts.

---

## Locked decisions

1. The journey is Landing → Preview → Simulated payment → AI extraction →
   Intake review → Prompt review → Audit.
2. Intake is AI-drafted and user-verified, never a blank questionnaire.
3. Sources are website and Instagram; Google Maps deferred.
4. A public source is mandatory. Manual name entry exists only as recovery
   after a real source fails identification, and is labelled unverified.
5. The pack is semantically 6 unnamed + 4 named per R-01, with identity policy
   enforced in both directions, and one canonical matrix is the only
   measurement authority.
6. Users may edit wording, but may not change a slot's measurement purpose,
   category, brand policy, or comparison-target policy. R-10 states how far V1
   enforces it: completely where mechanically decidable, by fixed slot frame and
   a warning elsewhere (`DECISION_LOG.md`, 2026-08-30).
7. One comparison target is proposed by an explicit derivation step and may be
   accepted, edited, or replaced.
8. Simulated payment sequences the workflow; it is not a security boundary.
9. Real Midtrans, durable persistence, and global design-system work are out.

## Implementation blockers

| | Blocker | Done when |
|---|---|---|
| **A** | Measurement authority | The canonical matrix exists with both-direction identity policy; every surface in R-03 derives from it; the generation instruction and report semantics are migrated and the instruction version bumped; the Indonesian brief projection preserves a name-only comparison target per R-13; R-06's agreement tests pass; no positional measurement-policy logic remains outside the matrix |
| **B** | Workflow and data authority | Every field in R-12 has an owner, screen, requiredness, and invalidation rule; the comparison target has an explicit creation step; conditional screens and stale-data rules are implemented; validation routing is executable for every field |
| **C** | Payment boundary | No personalized extraction occurs in the supported client journey before simulated payment success, proven by routing tests, a single-call-site guarantee, and E2E network assertions — with server-side entitlement explicitly deferred |
| **D** | Safe source handling | R-22's controls each have a stated value and a test, and R-23's limiters are configured and enforced. The feasibility determination and the rate-limit decision are both recorded (2026-08-30) and are no longer gates |
| **E** | End-to-end runnable journey | The acceptance scenario passes from the real landing entry |

## Deferred after workflow validation

Real Midtrans integration · server-side payment entitlement · durable request
idempotency · durable persistence · comprehensive refresh and restore · browser
Back/Forward · analytics · accounts · delivery-email persistence · global
token, typography, focus, and primitive migration · legacy intake CSS parity ·
Google Maps sources · desktop wide layout.

## End-to-end acceptance scenario

A real supported business source completes:

**Landing source → identity preview → simulated payment → real populated AI
draft → user verification and correction → canonical 6/4 prompt review → real
audit execution**

Stub provider infrastructure or dummy credentials where automated verification
needs them. **No paid or live provider call without explicit authorization.**

Verified along the way:

1. no personalized extraction call occurs in the supported journey before
   simulated payment success — proven by routing unit tests, a test asserting a
   single post-payment call site, and an E2E network assertion. Each is
   client-spoofable by design; that is R-20, not a gap;
2. intake is populated by Nuave, not a blank form, for every AI-owned field;
3. every retained `BusinessBrief` field has a defined owner and screen;
4. no positional measurement-policy logic exists outside the canonical matrix;
5. forbidden identities are rejected and required identities cannot disappear,
   with slot sets derived from the matrix;
6. a six-unnamed-plus-three-named pack is rejected as invalid 6/4;
7. the final pack remains semantically 6/4 after user corrections; no edit can
   change a slot's category, declared measurement purpose, or either identity
   policy; and an edit that breaks a slot's identity policy — or drops slot 9's
   comparison relation — is rejected on save, per R-10;
8. the generation instruction agrees with the matrix slot by slot;
9. report assessment, labels, and denominators derive from the matrix, with no
   observation falling through per-category rules;
10. the comparison target is proposed by the R-13 derivation step and can be
    accepted, edited, or replaced — including the category-level fallback, which
    reaches question generation as the comparison target with no source URL and
    still lets slot 9 pass R-10's identity and relation checks;
11. changing scope invalidates dependent values per R-14 and leaves no stale
    branch-specific data in the final brief, and a selected branch or product
    reaches the final brief in R-12's canonical `entity_scope` form;
12. website identity works; Instagram identity works on the intended deployment
    path, or exercises the R-18 recovery state if the edge fetch cannot
    identify it;
13. audit execution receives the reviewed final business context and the
    reviewed final question pack;
14. correcting the source at brand confirm runs exactly one replacement
    extraction per R-15, the customer's own entries survive it, and no field
    from the superseded source reaches the final brief.
