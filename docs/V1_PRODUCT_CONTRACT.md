# Nuave V1 product contract

> Status: **Product hypothesis locked for V1**
> Filed: 2026-08-29
> Governs: intake design, reasoning workflow, audit generation, and reporting

Shared reference for Fable, engineering, reasoning workflow, audit generation,
and reporting.

**Default rule:** If a detail is not explicitly defined, choose the simplest
reversible option that does not violate this contract.

---

## 1. Core product promise

Nuave helps a business owner understand:

1. whether their brand **appears spontaneously** when a prospective customer
   asks an AI system without mentioning the brand;
2. whether the brand is actually **recommended**, rather than merely mentioned;
3. whether the AI considers the brand a **good fit for a specific need** when
   the brand is asked about directly;
4. how the brand is **positioned relative to competitors or alternatives**.

Nuave is not intended to build a perfect business profile or complete research
dataset.

Its job is to gather enough context to generate a relevant audit, form a working
understanding of the business, and let the user correct material mistakes.

## 2. The user's job during intake

The intake is a **correction loop**, not a blank-form workflow.

The user should not be asked to explain their business from scratch.

The default interaction model is:

**Nuave reads → Nuave drafts its understanding → user confirms, removes, or
corrects → Nuave updates its understanding → user reviews the final readback.**

The user's responsibilities should be limited to:

* confirming that Nuave found the correct business;
* selecting or correcting category, offerings, customer situations,
  market/location, or competitors when Nuave's draft is materially wrong;
* adding important facts that Nuave could not reasonably know;
* reviewing and editing the final business readback before audit questions are
  generated.

Nuave must **not ask for audit priority**. The default product priority is to
measure whether AI systems mention and recommend the brand.

Missing non-critical information **must not block the user from continuing**.

Payment sits **before the intake begins**, but payment placement and payment
experience are outside the scope of this intake-design stage.

## 3. Nuave's job behind the scenes

Nuave should do more work so the user has to think less.

The system should:

* read the available source evidence first;
* identify the brand and the relevant business scope;
* draft a sufficiently specific business category;
* infer important offerings;
* infer relevant customer situations, needs, problems, or goals;
* infer market/location when it materially affects recommendations;
* infer relevant competitors or alternatives where possible;
* perform **semantic normalization** from user-facing language into the
  structures required by the reasoning engine;
* allow one UI interaction to map to multiple backend concepts when appropriate;
* store internal metadata such as provenance, source, confidence,
  inferred/extracted/user-supplied status when technically useful;
* use model reasoning to understand business meaning;
* use deterministic logic only for hard invariants;
* generate exactly 10 audit questions according to the contract below;
* ensure unbranded questions do not contain the brand name or its aliases;
* preserve question review before the audit is explicitly run.

**The schema does not define the UI.**

A backend field does not require a corresponding UI field. One UI interaction
may populate or normalize into several engine fields.

## 4. Minimum information that may appear in the UI

The intake should expose only the information that materially improves
recommendation-oriented audit quality.

### Brand being audited

The relevant brand identity and business scope.

### What the business offers

A sufficiently specific category and the important products or services.

### Why customers look for something like this

Relevant customer situations, needs, problems, or goals.

### Where the business is relevant

Market or location only when it materially affects recommendation quality.

### Alternatives customers may consider

Competitors or substitutes when known or reasonably inferred.

### Something Nuave must not misunderstand

One lightweight, optional section for a material fact that would significantly
distort the audit if misunderstood.

Buyer role, decision criteria, priority offering, terminology, pricing,
certifications, and other details may be inferred, merged into other
interactions, made optional, or omitted if they are not materially relevant.

Metadata such as **extracted, inferred, user supplied, confidence, provenance,
or source timestamp must not be shown in the UI** unless future evidence shows
that it helps the user make a meaningful decision.

**V1 hypothesis:** showing a reasonable, easily correctable guess is preferable
to adding another question solely to eliminate minor uncertainty.

## 5. The 10-question audit contract

Every audit uses exactly:

**6 unbranded questions + 4 branded questions.**

### Six unbranded questions

These questions must not contain the brand name or any brand alias.

They test spontaneous discovery and recommendation through:

1. direct category recommendation;
2. recommendation based on a customer situation or occasion;
3. fit based on a relevant need or decision criterion;
4. offering recommendation for a specific use case;
5. shortlist creation;
6. consideration or comparison among multiple possible choices.

### Four branded questions

The brand name may be included because these questions do not measure
spontaneous discovery.

They test:

7. brand fit for a specific need;
8. whether the AI explicitly recommends the brand;
9. direct comparison with a relevant competitor or alternative;
10. when the brand is a good fit, poor fit, or carries meaningful trade-offs.

All questions should sound like plausible questions from a real prospective
customer.

Factual lookup questions such as address, opening hours, or ordering
instructions should not be part of the default audit unless they are materially
relevant to recommendation.

**Branded results must never be counted as spontaneous discovery.**

**Mentioned and recommended are separate outcomes.**

## 6. Required primary report outcomes

The report must separate discovery performance from branded evaluation.

At minimum, the primary report should show:

* **Unbranded appearance:** in how many of the 6 unbranded questions the brand
  appeared;
* **Unbranded recommendation:** in how many of the 6 unbranded questions the
  brand was actually recommended;
* **Branded fit/recommendation:** how the brand performed across the 4 branded
  questions;
* **Comparison position:** how the AI positioned the brand relative to
  competitors or alternatives.

The report must not use a headline metric that combines branded and unbranded
appearances in a way that implies all appearances represent spontaneous
discovery.

The report must preserve the distinction between:

* the brand being **mentioned**;
* the brand being **recommended**.

## 7. Non-goals and intentionally deferred work

V1 is not intended to:

* build a complete or scientific business dataset;
* require the user to populate the full backend schema;
* ask the user for audit priority;
* include a dedicated conversion-action screen for address, WhatsApp, ordering
  method, or customer CTA;
* expose provenance or confidence metadata;
* add UI solely to support entity resolution;
* perform advanced competitor disambiguation in the UI;
* provide full Google Maps support;
* block progress because non-critical information is missing;
* optimize the payment experience during this intake-design stage;
* replace the existing question-review or explicit audit-run mechanism;
* solve every conceivable edge case before testing the V1 with real businesses.

**V1 hypothesis:** Google Maps support and advanced competitor resolution can be
deferred without materially weakening Nuave's ability to test its core product
promise.

## 8. End-to-end acceptance criteria

V1 satisfies this contract when:

1. A user can begin from a supported source without explaining the business from
   scratch.
2. Nuave reads available evidence before asking the user to provide business
   context.
3. Nuave produces a draft understanding of the business.
4. The dominant user actions are confirm, remove, and correct rather than
   completing a long blank questionnaire.
5. The intake does not ask for audit priority.
6. There is no dedicated conversion-action screen.
7. Missing non-critical information does not block the flow.
8. The UI does not expose provenance or confidence metadata.
9. The UI may be simpler than the backend schema, and semantic normalization
   produces the engine structure required downstream.
10. Before question generation, the user sees an editable readback of Nuave's
    current understanding.
11. The system generates exactly 10 questions: 6 unbranded and 4 branded.
12. None of the 6 unbranded questions contains the brand name or an alias.
13. The 4 branded questions are never used to measure spontaneous discovery.
14. The questions focus on discovery, recommendation, fit, shortlist creation,
    comparison, and trade-offs rather than irrelevant factual lookup.
15. The user can review the generated questions before explicitly running the
    audit.
16. The audit distinguishes **mentioned** from **recommended**.
17. The report separates results from the 6 unbranded questions and the 4
    branded questions.
18. The report explicitly shows unbranded appearance, unbranded recommendation,
    branded fit/recommendation, and comparison position.
19. There is no misleading overall appearance score that combines branded and
    unbranded results.

If these conditions are met, V1 is sufficiently defined to test with real
businesses.

Further complexity should be added only when real audit failures demonstrate
that it is necessary, not simply to make the schema more complete.

## What changed from the original Fable concept

* Payment is moved before the intake and is outside the scope of the current
  intake redesign.
* Audit priority is removed entirely from user input.
* The UI no longer needs to map one-to-one to engine fields or schema structure.
* Conversion action no longer has a dedicated screen.
* "Must be correct" information is reduced to one lightweight optional input.
* Missing information is acceptable; Nuave may make reasonable, easily
  correctable inferences.
* Provenance and confidence remain backend concerns rather than user-facing UI.
* Google Maps and advanced competitor resolution are not V1 blockers.
* The audit structure is explicitly locked to **6 unbranded + 4 branded**
  questions.
* Spontaneous discovery, mention, and recommendation are treated as distinct
  concepts and must remain distinct in reporting.

---

# Appendix — repository impact (bookkeeping, not part of the contract)

This appendix records what the contract above supersedes. It is repository
bookkeeping added when the contract was filed on 2026-08-29. It does not modify
the contract.

## Already reconciled

| Surface | Change |
|---|---|
| `intake-redesign-spec.md` | Rewritten to comply. Conversion-action screen removed, confidence badges removed, chapter 4 reduced to one optional input, criteria/goals merged, priority offering dropped from UI, buyer-role question dropped, Google Maps entry removed, question review added. |
| `intake-handoff.md` | Rewritten to match; superseded locked decisions and now-settled open decisions recorded. |
| `intake-prototype.html` | Rebuilt against the revised spec. |

## Open conflicts with shipped work — needs a founder decision

**1. Question pack is 5 unbranded + 5 branded, not 6 + 4.**

`src/lib/audit/contracts.ts` declares `unbranded_prompts: 5` /
`branded_prompts: 5` (~line 336), asserts `five_unbranded` / `five_branded`
invariants (~line 343), and its deterministic validator (~line 775) *rejects*
any pack that is not exactly 5/5. `PROMPT_MATRIX` fixes the branded status of
each of the ten slots. Moving to 6/4 changes the matrix, the invariants, the
validator, and the fixtures and tests pinned to them.

**2. Two shipped questions are factual lookup, which §5 now excludes.**

The production generation instruction in `docs/journey/04-questions.md`
(~line 457) assigns slots 7–8 to "check useful public facts about the audited
business"; its own worked example uses "Di mana alamat … Buka jam berapa?".
§5 excludes address and opening-hours lookups from the default audit. Slots
9–10 ("take a practical next step") also overlap the conversion action that §7
removes from intake.

**3. Report labels and counts are pinned to /5.**

`src/components/ReportPagePreview.tsx` and `ExampleReportPreview.tsx` render
"Tanpa menyebut bisnis Anda: 1/5 · Menyebut bisnis Anda: 3/5";
`src/lib/fixture-journey/adapter.ts` splits composition at question 6. §6 also
requires unbranded **recommendation** to be reported separately from unbranded
**appearance**, which needs checking against what `contracts.ts` currently
derives.

Until these are resolved, the intake design complies with the contract but the
downstream engine does not.
