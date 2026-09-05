# Intake data contract (paper — Gate 0)

> Status: draft for Gate 0, 2026-09-03. Branch `feat/airbnb-intake-rebuild`.
> Authority: Phase 0 checkpoint `NUAVE_AIRBNB_INTAKE_PHASE0_CHECKPOINT.md`
> (§3 seam, §4 keep-list, §6 scope); engine `src/lib/audit/types.ts`
> (`BusinessBrief`, `ExtractionDraft`, `businessBriefSchema`) and
> `src/lib/audit/workflow-authority.ts` (mutations, validation, strict parser);
> screen order `src/lib/intake/screens.ts` (14 `s-*` screens).
> Does NOT write the experience contract (parallel owner); assumes the 14
> `s-*` screens. Timebox rule: rich path fully mapped; messy cases listed in §5.

## 0. Vocabulary

- **Prepared value**: extraction output shown as the default answer on a screen.
- **Selected/edited value**: what the user actually confirms (tap-to-confirm a
  prepared value, or a corrected/typed replacement).
- **Confirmation status** per concept: `confirmed` (prepared value accepted as
  shown) · `corrected` (user changed it) · `unanswered` (screen not yet visited
  or skipped; prepared value kept but NOT yet confirmed).
- **Blocking** = `validateBriefForReview` fails without it → review-confirm
  refuses. **Optional** = may stay empty forever, never blocks.
- **Ledger concept**: one confirmable unit of intake meaning (not one widget).
  One screen may own several concepts; one concept never spans two screens.
- **Lossless**: the selected value reaches `BusinessBrief` byte-identical
  (modulo trim) and round-trips back to the same screen display.
- **Intentional-derived**: a deterministic engine function computes the brief
  value from intake inputs (`canonicalEntityScope`, `derivePriorityOffering`,
  `defaultConversionAction`, `defaultRegulatedCategoryNotes`); the derivation
  is the contract, not a loss. Inputs that reproduce the output are retained.
- **Downstream-change-required**: the brief field has no consumer or breaks a
  consumer; smallest coherent migration named in the table. None open (§6).

## 1. IntakeState model (minimal, explicit — NO generic form engine)

One fixed record shape. No field registry, no dynamic schema, no per-screen
flag. Conditional screens (`s-branch`, `s-product`, `s-market`) are fixed
optional slots, not runtime-registered forms.

```ts
type ConfirmationStatus = "confirmed" | "corrected" | "unanswered";
type ScopeKind = "whole-brand" | "branch" | "product";

/** One confirmable ledger concept. Prepared ≠ selected until confirmed. */
type ConceptState<T> = {
  prepared: T;            // extraction value (or deterministic default)
  selected: T;            // user-visible current value (edited or untouched)
  status: ConfirmationStatus;
  blocking: boolean;      // false ONLY for the §1.2 optional set
};

type IntakeState = {
  sourceUrl: ConceptState<string>;          // s-crawl / s-brand-fix
  brandName: ConceptState<string>;          // s-brand (+ s-brand-fix)
  identityUnverified: boolean;              // s-brand gating flag (meta-only)
  scopeKind: ScopeKind;                     // s-scope (always answered)
  scopeValue: ConceptState<string>;         // s-branch XOR s-product
  brandType: ConceptState<string>;          // s-scope
  category: ConceptState<string>;           // s-category
  offerings: ConceptState<string[]>;        // s-offerings (chips)
  targetCustomer: ConceptState<string>;     // s-customers
  customerNeeds: ConceptState<string[]>;    // s-customers (chips)
  decisionCriteria: ConceptState<string[]>; // s-customers (chips)
  marketContext: ConceptState<string>;      // s-market (conditional, §1.3)
  competitor: ConceptState<{                // s-competitors
    name: string; scope: string; source_url: string;
  }>;
  similarBusinesses: ConceptState<           // s-competitors (suggestions)
    { name?: string; source_url: string }[]>;
  usp: ConceptState<string>;                // s-facts (optional)
  suppliedFacts: ConceptState<string[]>;    // s-facts (optional)
  brandNameVariants: ConceptState<string[]>;// s-review (optional)
  // --- screen/progress needs (UI-only, NEVER cross the handoff, §3) ---
  ui: {
    currentScreen: IntakeScreenId;          // one of the 14 s-* ids
    visited: IntakeScreenId[];              // drives back-nav + progress
    invalidated: { market: boolean; offerings: boolean }; // re-ask badges
    comparisonProposal: ComparisonTargetProposal | null;  // s-competitors card
    comparisonStatus: "pending" | "confirmed" | "needs_reconfirmation";
  };
};
```

### 1.1 Rules

1. `prepared` is written once per extraction merge; `selected` starts as a copy
   of `prepared`. Tapping a prepared answer flips `unanswered → confirmed`
   without changing the value; editing flips to `corrected`.
2. Re-extraction (source change) overwrites `prepared` but never a `corrected`
   `selected` (engine `mergeExtractionIntoBrief` + `customerEditedFields`
   preservation). Overwritten `prepared` under a `corrected` selected value is
   dropped, not merged.
3. `scopeKind` has no `unanswered`: `s-scope` always yields an explicit choice;
   default before visit is `"whole-brand"` and counts as unanswered until the
   screen is confirmed.
4. Skipped conditional screens (§1.3) keep `status: "unanswered"` with
   `selected = prepared`; `s-review` lists every unanswered blocking concept
   for explicit confirm — nothing reaches the brief silently unconfirmed.
5. No other state exists. Anything not in this model is either `BusinessBrief`
   (post-handoff) or throwaway render state (scroll, animation, focus).

### 1.2 Optional vs blocking

- **Optional (never block review):** `usp`, `suppliedFacts`,
  `brandNameVariants`, `similarBusinesses`, `competitor.scope`,
  `competitor.source_url`. `s-facts` as a whole screen is optional (§6 scope:
  "`s-facts` (optional)").
- **Blocking (must be confirmed, non-empty at review):** everything else —
  mirrors `validateBriefForReview`
  (`workflow-authority.ts:691-858`): brand, source, entity_scope (+ scopeValue
  when branch/product), brand_type, category, market_context, target_customer,
  needs ≥1, criteria ≥1, offerings ≥1, competitor.name + `comparisonStatus =
  "confirmed"`.

### 1.3 Conditional screens

| Screen | Shows when | Skipped means |
|---|---|---|
| `s-branch` | `scopeKind === "branch"` | N/A (other branch of the XOR) |
| `s-product` | `scopeKind === "product"` | N/A (other branch of the XOR) |
| `s-market` | branch scope, or `marketInvalidated` (geography changed), or extraction left `market_context` empty | extraction `market_context` kept as prepared; still listed on `s-review` for confirm |
| `s-brand-fix` | `identityUnverified` (extraction could not read the brand) | identity verified; screen never entered |

`s-questions` is post-handoff (reads the prompt pack only, writes nothing to
intake or brief) and takes no `ConceptState`.

### 1.4 Screen/progress needs

Progress = position over the *applicable* sequence only
(`whole-brand`: 10 screens + review; branch/product: 11 + review;
`s-crawl` is the entry scan, `s-questions` post-handoff). `visited` enables
back-navigation to any visited screen; forward movement never requires
re-confirming unchanged screens. `invalidated` flags (`market`, `offerings`)
are the only cross-screen invalidation UI, set exactly by the §3 events.

## 2. Intake-concept → BusinessBrief mapping (COMPLETE)

Destination = `BusinessBrief` field (`types.ts:90-123`). Transformation cites
the engine function. Every row ends in exactly one verdict.

| # | Ledger concept (screen) | Destination | Transformation / default | Lossless? | Downstream consumer |
|---|---|---|---|---|---|
| 1 | Submitted source URL (s-crawl) | `official_sources[0]` | `parseSourceInput` normalize; extraction merges `acceptedSourceUrl + draft.official_sources`, deduped (`supportedOfficialSources`) | **lossless** (canonical URL form is the contract) | extract request; prompt-pack provenance; report sources |
| 2 | Corrected source URL (s-brand-fix) | `official_sources` | same as #1; re-extraction re-runs, `corrected` values elsewhere preserved | **lossless** | same as #1 |
| 3 | Brand name confirm/correct (s-brand, s-brand-fix) | `brand_name` | trim; whole-brand `entity_scope` re-derived from new name; `brand_name_variants` cleared (stale alternates of old name) | **lossless** | prompt-pack `brand.brand_name`; all branded prompts; report identity |
| 4 | Scope kind + branch name (s-scope + s-branch) | `entity_scope` | `canonicalEntityScope` → `"Cabang: <value>"`; `(brand, kind, value)` triple retained in meta → `inferScopeSelection` round-trips exactly | **intentional-derived** | prompt-pack `brand.entity_scope` (single-entity-scope self-check); report scope line |
| 5 | Scope kind + product name (s-scope + s-product) | `entity_scope` | `canonicalEntityScope` → `"Produk: <value>"`; round-trips via `inferScopeSelection` | **intentional-derived** | same as #4 |
| 6 | Whole-brand scope (s-scope) | `entity_scope` | `canonicalEntityScope` → `"Seluruh brand <brand>"`; re-derived on brand rename | **intentional-derived** | same as #4 |
| 7 | Brand type (s-scope) | `brand_type` | trim only | **lossless** | prompt-pack `brand.brand_type`; question-gen context |
| 8 | Category select/edit (s-category) | `category` | trim only; clears `similar_businesses`, re-derives #19/#20, rebuilds comparison proposal | **lossless** | prompt-pack `brand.category`; category-safety self-check; #19/#20 inputs; comparison fallback name |
| 9 | Offerings chips (s-offerings) | `verified_offerings` (1–12) | trim, drop empties, dedupe (`uniqueStrings`); product-scope change clears to `[]` for re-ask | **lossless** | prompt `inputs_used` (verified-inputs-only self-check); report findings |
| 10 | Priority offering (derived, no screen) | `priority_offering` | `derivePriorityOffering` = first non-empty offering | **intentional-derived** | review display (`AuditStages.tsx:1323`); report context |
| 11 | Target customer (s-customers) | `target_customer` | trim only | **lossless** | prompt-pack `brand.target_customer`; question-gen context |
| 12 | Customer needs chips (s-customers) | `verified_customer_needs` (1–12) | trim/drop-empty/dedupe | **lossless** | prompt `inputs_used`; report needs dimension |
| 13 | Decision criteria chips (s-customers) | `verified_decision_criteria` (1–12) | trim/drop-empty/dedupe | **lossless** | prompt `inputs_used`; report comparison dimension |
| 14 | Market context (s-market) | `market_context` | trim only; branch-scope change clears to `""` for re-ask | **lossless** | prompt-pack `brand.market_context`; extraction `market_context` echo |
| 15 | Competitor accept/replace (s-competitors) | `verified_competitor{name, scope, source_url}` | trim; empty scope/source_url allowed; `comparisonStatus: "confirmed"` required at review | **lossless** | verified-competitor-only self-check; branded comparison prompts; report comparison |
| 16 | Rival suggestions (s-competitors) | `similar_businesses` (0–5, optional) | `normalizeSimilarBusinesses`; invalid URLs filtered; category change clears | **lossless** | comparison proposal derivation (`deriveComparisonProposal`); alternatives UI |
| 17 | Extra facts (s-facts, optional) | `customer_supplied_facts` (0–20) | trim/drop-empty/dedupe; additive, never overwrites extraction | **lossless** | report evidence notes; question-gen context |
| 18 | Differentiator (s-facts, optional) | `usp` | trim only; empty allowed | **lossless** | review/facts display; report context |
| 19 | Conversion default (derived, no screen) | `conversion_action` | `defaultConversionAction(category)` template by category keywords | **intentional-derived** | report CTA context; strict parser pins value to derivation |
| 20 | Regulated-notes default (derived, no screen) | `regulated_category_notes` | `defaultRegulatedCategoryNotes(category)`; `""` for non-regulated | **intentional-derived** | report safety note; strict parser pins value to derivation |
| 21 | Other brand names (s-review, optional) | `brand_name_variants` (0–12) | trim/drop-empty/dedupe; brand rename clears (stale) | **lossless** | prompt-pack brand matching; question-gen aliases |
| 22 | Frozen engine defaults (no screen, never collected) | `known_accuracy_questions: []`, `agency_name: ""`, `agency_logo_data_url: ""`, `language: "en-US"` | `rederiveBrief` forces on every mutation; strict parser rejects any other value | **intentional-derived** | schema/compat (pre-paid single-language path; agency fields are paid-launch scope) — **no downstream change required**: engine already enforces |
| 23 | Identity-unverified flag (s-brand gating) | *meta-only* (`WorkflowMeta.identityUnverified`), NOT a brief field | blocks review until `confirmIdentity`; cleared on confirm | N/A (never enters brief) | review gate messaging |

**Branch/product conditional summary:** #4 XOR #5 by `scopeKind`; #5
additionally clears #9; #4/#5-changes clear #14; both rebuild #15-proposal via
`deriveComparisonProposal`. All conditionals terminate in the table above —
no branch-exclusive brief field exists.

## 3. Field-level materiality / invalidation

Comparison basis: **normalized brief output** (trimmed strings,
trimmed/deduped arrays, canonical URL form). Anything that does not change
normalized output is non-material.

| Event | Brief fields affected | Material? | Intake behavior |
|---|---|---|---|
| Confirm prepared value as-is | none (output identical) | No — still flips concept to `confirmed` (progress) | advance |
| Correct any blocking concept pre-review | that field + §2 derived knock-ons (#10 on #9; #19/#20 on #8; #21 cleared on #3; #16 cleared on #8) | **Yes** — review re-validates; knock-on concepts return to `unanswered` with fresh prepared values | re-ask affected screens only |
| Scope-kind change | `entity_scope` (+ #9 cleared iff →product; #14 cleared iff geography changed; #15 → `needs_reconfirmation`) | **Yes** | re-ask branch/product, offerings (if cleared), market (if cleared), competitors |
| Source-URL change (s-brand-fix) | `official_sources` + full re-extraction: every un-`corrected` prepared value refreshes; `corrected` selected values preserved | **Yes** | re-ask all `unanswered` screens with new prepared values; `corrected` screens keep badge, one-tap review |
| Category change | `category`, #16 cleared, #19/#20 re-derived, #15 proposal rebuilt → `needs_reconfirmation` | **Yes** | re-ask competitors; refresh review |
| Brand rename | `brand_name`, whole-brand #6 re-derived, #21 cleared | **Yes** | re-ask review-variants row only |
| Edit optional facts (`usp`, facts, variants) | that field only | Only if it changes normalized output; empty↔empty edits are non-material | stay on screen, no cascade |
| UI-only state (`ui.*`, scroll, animation, chip collapse, progress) | none | **Never material** — excluded from snapshot and comparison | free |
| Derived-only recompute (same inputs) | none (output identical) | No | silent |
| **Any intake edit after audit start** (`promptPack` set / run begun on the active run) | — | **Forbidden**: intake is read-only once `factsConfirmed` crosses; corrections require a new run (fresh `run_key`; variance/failure records keyed to the old run are not reused) | intake screens locked; `s-review` offers "start new audit" only |

## 4. Storage decision

- **`intake.v1`** — intake-owned draft. Sole writer: the new intake shell.
  Holds `IntakeState` (§1) only. Own intake-only parser (version + 14 `s-*`
  ids + enum checks); any drift → discard draft, restart from extraction
  (never partial-hydrate). Cleared on handoff or explicit restart.
- **`workflow.v10`** — canonical record, authority-owned. Sole writer: the
  workflow authority (`AuditWorkflow` persist effect today; narrowed
  controller post-split). Holds `BusinessBrief + WorkflowMeta + promptPack +
  observations + report + telemetries`. Bumped v9→v10 for the handoff shape;
  strict parser rejects version/screen/scope/derived-field drift (existing
  `parseWorkflowStorageState` semantics preserved).
- **Handoff (immutable snapshot at review-confirm):** on
  `validateBriefForReview` clean + explicit "Mulai audit" tap, intake builds
  one `BusinessBrief` from §2, validates it against `businessBriefSchema`,
  and passes it across once. Post-handoff the snapshot is frozen:
  `applyBriefFieldChange` and friends operate on the workflow copy under
  authority rules; intake never writes `workflow.v10` and workflow never
  writes `intake.v1`. `intake.v1` is cleared after acceptance so a stale
  draft can never double-write. Two writers never share one record —
  the Phase 0 split-brain mechanism (§2 of the checkpoint) stays impossible.
- Session/variance keys unchanged: `nuave.audit.session.v1`,
  `nuave.audit.variance.v1` + `.failure.v1`, consume-once
  `nuave:audit-source-handoff-v1`.

## 5. Messy cases (listed, not mapped — timebox)

1. Multi-branch selection ("3 cabang sekaligus") — ledger assumes one audited entity; multi-select needs a product decision before mapping.
2. Mixed scope ("brand X, tapi hanya produk Y di cabang Z") — canonical `entity_scope` grammar covers one axis; combined grammar undecided.
3. Source is Instagram-only with no crawlable text — extraction-poor path; which screens may auto-skip vs force-manual is experience-contract work.
4. User pastes a competitor URL as their own source — identity-mismatch recovery flow, not a mapping question.
5. Category free-text that matches no `defaultConversionAction` keyword — falls to the generic template (lossless, but copy quality unreviewed).
6. Re-extraction returning fewer offerings than the user already confirmed — preserved per §1.1 rule 2, but the review-screen conflict presentation is experience work.
7. `s-market` skip heuristics (when confident enough to skip vs always ask) —Gate 0 default: always listed on `s-review` (§1.4); auto-skip policy deferred.

## 6. Gate 0 report

- **Lossy concepts: NONE unresolved.** 15 concepts lossless, 7
  intentional-derived (#4, #5, #6, #10, #19, #20, #22 — each reproduced from
  retained inputs by a cited engine function), 1 meta-only (#23), 0
  downstream-change-required. No Gate 0 stop.
- Closest watch (not lossy): #22 frozen defaults — `known_accuracy_questions`,
  `agency_*` are forced empty by `rederiveBrief` + strict parser. This is a
  deliberate paid-launch deferral (checkpoint §2/§6), already enforced in
  code; no migration needed for this rebuild.
- File: `docs/drafts/INTAKE_DATA_CONTRACT.md` (this file).

## Amendment — founder-approved handoff (2026-09-05)

Source: `docs/drafts/NUAVE_INTAKE_EXPERIENCE_HANDOFF.md`. Supersedes stale
clauses above where named; anything not named stands.

1. **Concept #24 — Service channels (s-service).** New canonical concept:
   `service_channels: ConceptState<ServiceChannel[]>`, one-or-more of the
   fixed enum `on_premise | on_customer | delivery | online` (exact channels
   from the handoff; the vague `mixed` market mode is removed). Required
   (blocking). Persisted in the intake draft; downstream: prompt-pack
   experience framing, question-gen situational wording.
2. **#14 Market context rewritten.** `market_context` becomes
   `ConceptState<{ reach: 'area' | 'multi_area' | 'national' | 'national_international'; areas?: string[] }>`
   — reach required; `areas` required (≥1, deduped) iff reach is area-based.
   The auto-skip heuristic (#7 above) is **retired**: s-market is always
   shown; `marketSkipped` never exists in state.
3. **#21 brand_name_variants (aliases): removed from s-review.** Aliases
   derive from the primary source; no customer-facing identifiers row, no
   identifiers-edit substate. Internal #21 data may still flow to question-gen
   unbranded screening (backend-only), but it is no longer a review concept.
4. **Screen count is 15** (`s-service` added; screens.ts order authority).
   The state parser versions accordingly at Phase 5 (bump, never migrate).
5. **Scope-kind dependency updates**: → `produk` skips s-offerings (offering
   set = the product itself; #9 preserved as the product selection);
   `#4/#5`-changes no longer clear #14 on geography grounds alone — market
   re-confirmation follows the journey contract's dependency rules, not the
   old shipped-product skip.
6. **Review projection** = the ten active-answer rows defined in the
   experience contract §10.3 (Brand · Fokus audit · Target audit (conditional)
   · Kategori · Produk dan layanan · Alasan pelanggan · Cara layanan · Pasar ·
   Pembanding · Hal yang wajib benar, + advisory conflict). The frozen
   question-generation payload must match this projection exactly.
