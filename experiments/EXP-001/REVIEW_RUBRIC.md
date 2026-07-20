# EXP-001 review rubric

> Status: **PREPARED — no reviews completed**
> Applies to: `exp-001-v0.1`

One named measurement reviewer applies this rubric to all ten evidence clinics.
A second reviewer may inspect critical defects, but must not silently replace
the primary review judgment.

## Review outcomes

- `PASS`: acceptable for the experiment analysis.
- `REVISE`: evidence is preserved but extraction, interpretation, or
  presentation must change before analysis.
- `EXCLUDE_FINDING`: the observation remains, but the proposed finding or action
  is unsupported or unsafe.
- `BLOCK_AUDIT`: wrong identity, prohibited data, systematic evidence failure,
  or another critical defect prevents a reviewable candidate.

## 1. Identity review

- [ ] The subject is one exact Jakarta clinic location.
- [ ] Canonical name, variants, address, listing, website/social profile, and
  public phone where available agree or have documented conflicts.
- [ ] Every counted audited-clinic appearance is resolved beyond name alone.
- [ ] Every material competitor is a real, relevant, resolved clinic.
- [ ] Ambiguous, unresolved, and hallucinated entities are not counted as real
  clinic appearances or competitors.

Critical defect: a finding or count is attributed to the wrong clinic or branch.

## 2. Run and coverage review

- [ ] Prompt ID, exact rendered text, class, run index, surface, model/settings,
  timestamps, city/language context, and status are present.
- [ ] Core repeats are independent requests with no shared conversation history.
- [ ] A retry does not silently become an extra independent run.
- [ ] Provider failures, safety blocks, irrelevant responses, and valid
  non-appearances remain distinct.
- [ ] Coverage is calculated without treating failures as zero visibility.
- [ ] Any timing or configuration deviation is visible.

Candidate full coverage requires both surfaces, at least 10 of 12 successful
core runs per surface, at least two successful runs for every core prompt per
surface, and at least 30 of 36 successful observations overall.

## 3. Observation review

- [ ] Appearance, mention, recommendation inclusion, comparison, citation,
  presentation order, factual statement, and accuracy issue are not conflated.
- [ ] Branded observations are separate from non-branded discovery.
- [ ] Appearance counts use direct denominators, such as `1 of 3 runs`, and are
  not converted into a universal visibility percentage.
- [ ] Provider citations are preserved but not assumed to validate every claim.
- [ ] Contradictory and negative observations remain visible.

## 4. Finding and inference review

- [ ] Every material finding links to one or more retained observation IDs.
- [ ] The finding says what was observed, not why it happened.
- [ ] The inference is explicitly qualified and supported by the cited evidence.
- [ ] No source overlap, correlation, or competitor pattern is stated as proven
  causation.
- [ ] No API result is represented as exactly what every patient sees.
- [ ] Sparse or inconclusive evidence is allowed to remain inconclusive.

Critical defect: the report requires a fabricated fact, hidden contradiction,
unsupported causal explanation, or permanent-ranking claim to appear useful.

## 5. Candidate-finding usefulness proxy

This is an operator proxy for Gate 0, not customer evidence. Mark a candidate
finding `specific_non_generic` only when all conditions pass:

- it is specific to the clinic, prompt, surface, source, or observed conflict;
- it would not follow merely from knowing that the subject is a dental clinic;
- it is supported by traceable evidence;
- it changes a plausible owner decision or identifies a material uncertainty;
- it can be explained without false precision or causation; and
- any associated action is within the clinic's control or names the specialist
  who would own it.

Record `none` when no finding qualifies. Do not manufacture one to meet the
threshold.

## 6. Recommendation review

- [ ] The action links to one or more reviewed findings.
- [ ] It states expected direction, confidence, effort, owner, dependency,
  caveat, and a verifiable completion check.
- [ ] It does not guarantee inclusion, leads, ranking, or revenue.
- [ ] It does not infer clinical quality from public-information completeness.
- [ ] It does not draft or endorse unsupported treatment, credential, safety,
  efficacy, price, testimonial, before/after, or competitor-superiority claims.
- [ ] High-risk topics are excluded or routed for appropriate review.

## 7. Data and publication review

- [ ] Provider payloads contain only necessary public business context.
- [ ] No patient, customer contact, payment, secret, or access-token data appears.
- [ ] Raw responses remain in restricted evidence storage and out of Git and
  generic analytics.
- [ ] Clinic-specific results are labeled internal and unpublished.

Critical defect: patient data, a secret, private contact data, or an unapproved
clinic-specific result is exposed.

## 8. Review record

For each clinic record:

- reviewer and timestamp;
- start and end time;
- outcome;
- candidate full-coverage status;
- number of specific non-generic candidate findings;
- interventions by category;
- removed or narrowed findings and reasons;
- critical and non-critical defects;
- unresolved questions; and
- total review minutes.
