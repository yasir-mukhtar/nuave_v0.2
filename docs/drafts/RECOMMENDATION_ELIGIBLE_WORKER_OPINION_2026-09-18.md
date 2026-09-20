# Worker opinion — recommendation-eligible generation plan

2026-09-18. Read-only review of
[`RECOMMENDATION_ELIGIBLE_PLAN_2026-09-18.md`](./RECOMMENDATION_ELIGIBLE_PLAN_2026-09-18.md)
against the connected code in `/Users/yasir/nuave-worktrees/glm-prototype`.
No code changed, no calls made.

## Verdict

**Agree with the direction, and the orchestrator's version is stronger than
the one I drafted.** Two of its choices are better than my earlier proposal:

1. **All-unnamed default.** I had proposed keeping a 6/4 identity split with
   four "natural" named questions. The named positions are where functional
   purpose was *unavoidable* — `direct_comparison` needed a supplied target,
   relation markers, and a naming rule, i.e. slot machinery by definition.
   Removing named questions from the first delivery removes the last place
   where the matrix could creep back in. It also collapses validation to one
   identity rule (brand absent everywhere) instead of a two-class policy,
   and deletes the slot-9 contradiction rather than repairing it.
   The audit's core claim — "does AI surface you unprompted" — is exactly
   what unnamed questions measure.
2. **12 candidates → human selects 10.** This preserves the experiment that
   actually worked. The invoice capture (`CAPTURED_QUESTIONS.md`) shows the
   model produced 12 usable candidates and the founder's review was light
   edits, not slot repair. Founder selection *is* the naturalness gate; a
   direct-10 generation would quietly remove it.

No disagreement with the plan's structure (replace generation contract,
separate protections from quality judgment, carry through report).

## Facts the plan should know (confirmed in code)

- **The slot contract is load-bearing end-to-end, not just upstream.**
  `locked-question-pack.ts:25–65` requires each prompt's `category`/`role`
  to equal the matrix slot's `category`/`generatorSlotDescription`.
  `questions-id-live.ts:306–312` enforces
  `CANONICAL_COMPOSITION_COUNTS` (6 unbranded / 4 branded) and stamps
  `category: slot.category` per position (line 341).
  `report-prompt-contract.ts:39–43` embeds the **entire matrix** as "the
  only authority for report interpretation," per-slot.
  A free-form pack fails all three checkpoints today. The change needs a
  **parallel v2 contract dispatched on pack method version** — editing the
  shared matrix would break every historical pack.
- **Verify before claiming unnamed purity:** `questions-id-live.ts:319–330`
  builds a `brand:` block (`brand_name`, `entity_scope`, `category`,
  `market_context`) in the run payload. Whether that reaches the *answering*
  model's context or is run metadata must be confirmed — the plan's own row
  requires it. (Hypothesis, not yet verified.)
- **Review screen is small.** `QuestionReviewScreen.tsx` is 237 lines,
  slot-grouped by `auditedBrandIdentity` with `customerFacingLabel` cards.
  Replacing it with a flat candidate list + select/edit is a rewrite of a
  small screen, not a subsystem.
- **Reusable, already verified:** the GLM transport (frozen-attempt binding,
  consume marker, evidence preservation, gates), the strict three-section
  extractor, `sessionStorage` pack persistence with originals-vs-edited
  restore, the provenance banner, and the honest failure display all carry
  over unchanged — none of them encode slot purposes.
- **The punctuation gate would have rejected the accepted output.**
  Captured invoice Q3/Q5/Q9 use context-sentence + question (Q5 has a
  two-part ask) — the exact shape the "one `?`" rule rejected in the
  laundry run. The plan is right to remove punctuation-count proxies.

## Recommended count/selection and naming policy

- **Generate 12, founder selects 10.** Selection is the accepted method's
  own quality control, and the UI cost is modest (keep-checkbox + counter
  on existing cards). If a selection step ever becomes the bottleneck,
  generating 10 directly is a *count-only* departure to be recorded as
  such — but I would not start there.
- **All questions unnamed in v1.** Brand/alias/comparator names are
  forbidden in every candidate. Comparator names stay in intake as context
  (they inform "keep the competitive field open" and competitor detection
  in the report) — nothing forces their use.
- **Edits: free wording, protected identity.** No purpose to preserve; the
  only edit-time block is naming the business (or comparators) — identity
  protection, not purpose. Duplicate detection becomes a flag-for-review,
  not a block.

## Smallest end-to-end change

**Generation** — new instruction = recovered prompt verbatim + "twelve
candidates" (no slot text); flat confirmed-facts brief (brand included,
marked "do not name"); extractor relaxed to 10–14 numbered lines under
`## 2.` (or the source's `## 2. Candidate questions` marker); validator =
identity + non-empty + dedupe + existing safety patterns. All inside the
existing transport/binding/evidence shell.

**Review** — pack schema v2 (`method: "recommendation-eligible-v1"`):
ordered prompts, positional IDs, `auditedBrandIdentity: "forbidden"` per
prompt, `selected: boolean`, originals + edits preserved; **no**
category/role/purpose fields asserted. Review screen: flat candidate
list, keep-10 selection, free edit, existing persistence.

**Execution** — `locked-question-pack` gains a v2 conformance path (10
selected, all unnamed, verbatim texts); run contract bypasses
`CANONICAL_COMPOSITION_COUNTS` for v2 (10/0 unbranded/branded); audit
provider unchanged; verify the `brand:` payload field is metadata, not
answer-model context.

**Report** — v2 interpretation contract: assess each answer for
mention/recommendation of the audited business and competitors; no
per-slot classes. `Intent pattern:` labels may be *displayed* as
model-supplied descriptors, never as measured dimensions.

## Report claims and denominators that change

- Slot-level `reportAssessmentClass` coverage claims **retire for v2
  packs** — replaced by sample-level mention and recommendation counts
  over the ten selected answers (mention ≠ recommendation, kept distinct).
- **No named-handling claims** — with zero named questions there is no
  denominator; mark untested, never zero-fill.
- Comparison findings may still be reported *when answers actually
  compare* — evidence-derived, not slot-derived.
- Ten-of-ten evaluable observations stays the delivery floor (selection
  supplies them); counts describe the selected sample, not market
  coverage.
- Historical packs stay under the matrix contract via method-version
  dispatch; v1-vs-v2 counts are not presented as directly comparable.

## Sequence and rough effort

1. **Generation v2 offline** (instruction, brief, extractor, validator):
   small. *Founder sees 12 synthetic/stub candidates end-to-end.*
2. **Review + pack v2** (selection UI, persistence, edit rules): small —
   the local GLM session machinery is proven. *Founder selects 10, edits,
   refreshes, approves offline.*
3. **Execution + report v2** (lock path, run contract, interpretation,
   denominators): the bulk — three coordinated contract points, all
   version-dispatched. *Fixture-backed report + download produced
   offline.*
4. **One new authorized live call** — new frozen request (prompt bytes
   changed; prior attempt consumed). *Founder reviews real GLM texts.*
5. **Separately authorized**: run the approved pack through audit +
   report on one real business.

## Unresolved decisions that materially matter

- Whether `brand:` in the run payload reaches the answering model (must
  verify before claiming the unnamed test is pure — §facts).
- Whether the v2 report keeps any per-question display label (recommend:
  `Intent pattern:` as descriptive text only).
- Whether `s-competitors` stays required intake (recommend: keep —
  comparators serve the open-field rule and report competitor detection,
  not generation purposes).

## Reusable work inventory

Transport/gates/evidence/frozen-attempt machinery; three-section
extractor; provenance banner; session pack persistence + originals/restore;
honest failure display; `IntakeJourney` GLM branch; the Laundry Ceria
fixture; all B1–B3 tests. New: instruction text, flat brief, pack schema
v2, review-screen selection mode, lock/run/report v2 contracts.
