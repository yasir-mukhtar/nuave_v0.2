# F-03: prepared-summary completeness review

Date: 2026-09-24. Role: orchestrator review of the worker handoff.
Scope: the missing target customer and market reach in the completed
[founder walkthrough](./F03_FOUNDER_WALKTHROUGH.md), under approved Spec 011.

**Review complete; acceptance remains open.** The retained evidence supports
the required/optional distinction and the disabled confirmation. It does not
establish a source-specific extraction or selection defect to fix. Preserve
the founder's qualified acceptance and the independent offline correction PASS.

## Evidence and findings

1. **Target customer is optional.** R-14 permits an empty value, and the
   extractor requires website support rather than inferred demographics.
   `prepareUnderstanding` maps `target_customer` directly; optional absence
   does not enter the summary's confirmation gate. The empty value may reduce
   usefulness, as the founder observed, but it is not itself a contract defect.
   Do not make it required or invent a generic customer segment.

2. **Market reach is the required unresolved meaning for this whole-brand
   preparation.** The worker records reach as empty in the returned draft,
   before summary mapping. The inspected mapper preserves populated reach and
   deliberately keeps empty reach unselected. `SmartSummary` and
   `confirmSmartSelection` both require reach, plus the applicable area choice.
   There is no evidence of this run losing populated reach in mapping/display.
   The existing inline choices provide the owner-correction path; a supplied
   choice becomes `Dari Anda`. No choice was supplied or made in this review.

3. **The upstream cause remains unresolved.** The request already asks for
   reach and published service areas, and requires unsupported values to stay
   empty. `source_excerpt_status: included` establishes that a document excerpt
   was attached, not that it contained geographic coverage or that the model
   used it. The excerpt was not retained, and hosted search also ran. The
   available records cannot distinguish missing source information, information
   outside the selected passage, or extraction omission. A contact address,
   brand familiarity, or prose in `market_context` cannot supply the missing
   confirmed meaning. A later page inspection cannot prove what the previous
   model saw.

4. **Founder judgment and acceptance limits remain distinct.** The founder
   accepted the other evaluated aspects and called completeness lacking. This
   closes the pending-feedback step; it does not waive the required reach,
   establish unobserved interactions, or prove the representative rich local
   path. Source disclosure was not inspected. The recorded English explanatory
   text remains an R-03 observation, without recasting it as a new founder
   rejection or silently waiving the Indonesian contract.

Code inspected: [extraction instruction](../../src/lib/audit/openai.ts),
[prepared/confirmed mapping](../../src/lib/intake/smart-intake-contract.ts),
[summary controls](../../src/lib/intake/SmartSummary.tsx), shared extraction
schema, and the existing excerpt selector. Live outcomes and founder wording
come from the [acceptance record](./ACCEPTANCE_EVIDENCE.md#2026-09-24-founder-review-received)
and its preceding execution section; this review did not reproduce the live run
or inspect private payloads/screenshots.

## Smallest next action

Establish source support for **market reach first**, with target customer checked
only if explicit supporting text is present. Use already available permitted
public-source material if supplied. Otherwise obtain separate authorization
for one read-only check of the exact nominated homepage, including running the
existing selector on that same document. No Periksa, model call, extra page,
crawl, or automatic retry is needed for that check. The consumed preparation
allowance does not authorize a new fetch.

Return a minimal note with source URL, observation date, a necessary short public
passage, and whether that passage survives the existing selector. Keep full HTML,
private records and raw provider data out of the note and Git. Report only what
the inspected document establishes; do not infer absence across the whole site.

- If explicit coverage is present but the selector loses it, propose a bounded
  selector correction with a fictional regression reproducing that loss.
- If explicit coverage survives selection, review the existing extraction
  instruction against that meaning before proposing a change. This narrows a
  current candidate; it still does not prove the historical model input/cause.
- If coverage is unsupported or cannot be assessed, keep it unknown and use
  the existing owner selection when the founder supplies the intended reach
  and any required areas. That completes business input, not proof that
  automated preparation met the rich-case target.

No implementation change or new live allowance follows from this review.
Do not retry a valid partial draft merely to obtain a fuller result.

## Validation and status

Independently ran the existing `smart-intake-contract.test.ts` and
`smart-journey.test.tsx`: **7 tests passed in 2 files**. They cover exact rich-case
mapping/handoff, optional omission, unsupported empty fields and historical
preservation. The missing-reach gate was inspected in code; these tests are not
a live completeness check. No new tests or runtime changes were made, and the
previous broad offline gates were not repeated.

Recomputed the recorded accounting: USD 1.03498655 + USD 0.01287795 =
**USD 1.04786450** of USD 5. The carryover includes the historical estimate;
this arithmetic is not independent provider-billing verification.

**F-01 stays closed. F-03/AC-07 stay open. Spec 011 stays Approved, not Verified.**
No source/provider request, business edit, confirmation, question generation,
commit, push or deployment occurred. The approved spec, protected notes,
existing product/tests and earlier evidence remain unchanged.
