# Plan — implement the recommendation-eligible generation approach fully

2026-09-18. For orchestrator review and alignment. Not a spec; a design
proposal to converge on before any implementation.

## Why

The single authorized GLM call (evidence: `.local-evidence/glm/` in the
glm-prototype worktree) returned ten real questions that the founder judged
as a regression toward the old procedural formula. Analysis of the exact
bytes sent shows why:

- The instruction carried the accepted prompt's philosophy text
  verbatim-adapted, **plus** a fixed ten-slot contract where every slot had
  a named functional purpose ("situation", "need_fit", "offering_use_case",
  "direct_comparison", …) and its own behavioral clause.
- A rigid per-slot JSON permissions matrix (`auditedBrandIdentity`,
  `comparisonTargetIdentity`, field whitelists, safetyPolicy) told the model
  how each position must behave.
- GLM answered the contract: ten near-identical
  `Laundry kiloan di Jakarta Selatan yang [criterion]` + tag constructions,
  six texts carrying two question marks — each slot stuffing a natural ask
  and an entity-eligibility marker to satisfy its written purpose.
- It then failed the mechanical checks anyway (8 issues), including a
  **self-contradictory requirement**: slot 9 demands naming a comparison
  target that the context never supplies (`comparisonTargetIdentity:
  "required"`, `comparisonTarget: none`).

The founder-accepted prompt (WINNING_QUESTION_GENERATION_PROMPT_2026-09-07)
produced recommendation-eligible questions in experiments with **no slot
machinery** — 12 free candidates, quality controlled by the acceptance
test, not by per-slot functions.

## Goal

Generation asks the model only for natural, recommendation-eligible
questions. The slot apparatus becomes bookkeeping **downstream** of
generation: position and identity permission, nothing else. No per-slot
functional purpose reaches the prompt.

## Proposed design

### 1. Generation prompt = the accepted prompt, minimally adapted

`questions-id-glm-instruction.ts` becomes the recovered prompt verbatim,
with only these adaptations:

- Output count split by identity permission: **six questions that never
  name the audited business** (or comparators), then **four questions that
  name it** — "the way a real customer who already knows the business would
  ask." That is an identity rule, not a functional purpose; the audit
  product genuinely needs both kinds to measure organic vs named mention.
- Keep the three-section output format (market interpretation / questions /
  self-critique) — it is the parsing contract, not generation steering.
- Keep the 2026-09-16 amendment (no diversity quota; same need may recur).
- For the named section, one soft clause: questions may include comparing
  the business with alternatives — phrased as intent, not as a slot
  contract. (See decision point 2.)

Everything per-slot is deleted from the prompt: no slot IDs, no category
names, no behavioral clauses, no JSON permissions matrix.

### 2. Writer context = one flat confirmed-facts brief

Replace `buildV3WriterContext`'s per-slot projection for this path with a
single block of confirmed business facts — labeled provenance (confirmed
fact / buyer constraint / unknown), no permission fields:

- brand name + aliases (marked "for the named questions only")
- category, market/areas
- customer needs, offerings, service channels
- comparator names when `mode: "named"` — **actually supplied this time**,
  fixing the slot-9 contradiction by construction
- public fact, if present

Prose or flat JSON — either is fine; the point is it describes the
business, not the slots.

### 3. Slots become position + identity permission only

The ten positions keep their order, their `auditedBrandIdentity`
(forbidden for 1–6, required for 7–10) and their slot IDs for storage and
report joins. `measurementPurpose`/`generatorSlotDescription` no longer
influence generation. What the report does with per-slot
`reportAssessmentClass` is decision point 3.

### 4. Validation keeps protections, drops functional checks

Keep (safety/identity/honesty — none of these steer generation):

- exactly ten texts, non-empty, no duplicates;
- brand/aliases absent from 1–6, present in 7–10;
- comparator name handling consistent with what was supplied;
- guarantee/superlative-premise checks on named entities, safety patterns;
- length/character sanity.

Drop (functional-purpose enforcement):

- slot-specific semantic checks (situation-ness, offering_use_case,
  shortlist, open_comparison, brand_fit, explicit_recommendation,
  direct_comparison relation markers, fit_misfit).

Decide (decision point 4): the single-`?` "one request" rule. It caught
real compound-ask behavior, and the accepted prompt itself says "prefer
one clear consumer decision per question" — but as implemented it is a
punctuation count. Keep as-is, soften to a warning, or drop.

### 5. What does not change

Everything built for the live path is generation-agnostic and stays:

- frozen intake → facts adapter → request builder → strict three-section
  extractor;
- single-attempt binding, consumed marker, evidence preservation, gates;
- the edit/review UI, provenance banner, originals-vs-edited, honest
  failure display, `auditExecuted: false`;
- deterministic packs and production provider paths untouched.

### 6. Slot assignment

Unnamed questions fill positions 1–6 in output order; named fill 7–10 in
output order. No selection step. (Decision point 1 covers the
generate-pool-then-pick alternative.)

## Decision points for the orchestrator

1. **Exact count vs pool.** Recommended: ask for exactly 6 + 4 — simplest,
   one call, faithful enough (the amendment already adapted 12→slot count).
   Alternative: generate a larger candidate pool and select — adds a
   selection authority (who ranks? the model's self-critique? a validator?)
   for unclear gain.
2. **Named-section freedom vs one comparative requirement.** If the audit
   must always contain a brand-vs-comparator question, a single light
   instruction is the minimum procedural footprint — and it requires
   comparator names in context to be executable. If not required, drop it
   and let the report describe what the question actually does rather than
   a predetermined class.
3. **Report interpretation.** With functional purposes gone from
   generation, per-slot `reportAssessmentClass`/`measurementPurpose` lose
   their guarantee. Options: (a) keep coarse interpretation — unnamed
   slots measure organic recommendation, named slots measure named-brand
   handling — which survives intact; (b) re-derive per-question labels
   from the model's own `Intent pattern:` tag (already emitted, comes
   free); (c) deeper matrix redesign — out of scope for this step.
4. **Punctuation rule** (see §4).
5. **Comparator names in context.** Supplying real names in the brief makes
   the named-comparison question writable; withholding them made slot 9
   impossible. Recommend supplying, since the unnamed section still forbids
   naming them.

## Risks / honest notes

- Removing slot purposes means the pack may contain two questions serving
  similar measurement ends and none serving a purpose we used to guarantee
  (e.g. no direct comparison). That is the intended trade: truthful
  naturalness over guaranteed coverage. The report must not describe a
  question as measuring something it does not measure — handled by
  decision point 3.
- The model may still produce formulaic output; the fix is removing the
  scaffolding, not adding new rules. The founder's eye is the quality gate
  the accepted approach always relied on.
- A changed prompt changes the request bytes: any new live call is a
  **new** frozen request needing fresh authorization. All verification up
  to that point stays offline with the synthetic stub.

## Rough shape of the work

1. New instruction text (verbatim accepted prompt + the identity split).
2. Flat context brief builder (replaces the per-slot projection for this
   path).
3. Validator: remove functional checks, keep protections, resolve the
   comparator-name contradiction.
4. Pack/restore/types: mostly unchanged — slots already store position +
   labels; functional-purpose metadata stops being asserted.
5. Tests: rewrite validator and builder tests around the new contract;
   keep extraction/provenance/B1–B3 suites intact.
6. Offline verify → founder reviews ten fresh stub-or-live texts → live
   attempt only under new authorization.
