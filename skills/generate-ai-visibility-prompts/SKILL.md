---
name: generate-ai-visibility-prompts
description: Generate, revise, or quality-check a structured ten-question AI visibility prompt pack for one verified Indonesian business, using Spec 007's canonical matrix with six unnamed and four named slots. Questions are written in natural Indonesian for later independent execution in ChatGPT, across local services, ecommerce, B2B, software, professional services, or other reviewed categories. Do not use it to execute questions, analyze answers, calculate scores, or write the audit report.
---

# Generate Brand AI Visibility Prompts

Create one reviewable ten-question prompt pack for one exact, verified business.
Write the questions in natural Indonesian, as a real Indonesian customer would
type them. Tailor the language to the business's real category and market
without favouring it or inventing facts.

## Load the context

Read
[`../../docs/PROMPT_GENERATION_CONTEXT.md`](../../docs/PROMPT_GENERATION_CONTEXT.md)
completely before generating or revising a pack. Treat it as the generation
guidance for the required inputs, while the canonical matrix's slot IDs,
categories, purposes, identity policies, and comparison policy come only from
Spec 007 R-01/R-02 and its implementation.

If the context is missing or conflicts with this skill, stop and report the
conflict. Follow the newest founder-approved decision when the decision log
clearly resolves it.

## Keep the task boundary

Perform only prompt-pack generation, revision, and quality review.

Do not:

- send questions to ChatGPT or another provider;
- browse for or silently verify missing brand facts;
- analyze prior AI responses;
- predict whether the audited brand will appear;
- calculate visibility, accuracy, or composite scores;
- generate findings, recommendations, or report copy; or
- change repository files unless the user explicitly requests saved output.

## Collect and validate inputs

Require every field defined as required in the universal context:

- `brand_name`;
- `entity_scope`;
- `brand_type`;
- `category`;
- `market_context`;
- `target_customer`;
- `official_sources`;
- `verified_offerings`;
- `verified_customer_needs`;
- `verified_decision_criteria`; and
- `verified_competitor`.

Accept the optional fields defined there. Treat verified inputs as approved for
wording, while keeping customer-supplied facts visibly identified. Do not
invent a missing customer need, comparison criterion, competitor, location,
offering, price, policy, or conversion action.

Never request private customer records, sensitive personal data, confidential
business data, or regulated personal records.

If required inputs are missing, ambiguous, contradictory, or unsafe, return
only:

```json
{
  "status": "needs_input",
  "missing_inputs": ["field_name"],
  "conflicts": [],
  "prompts": []
}
```

Add a short plain-language explanation after the JSON only when it helps the
user supply or resolve the input. Do not return a complete-looking partial pack.

## Build the canonical matrix

Read the single `AUDIT_MEASUREMENT_MATRIX` definition referenced by the context
before writing any question. Generate its ten records in exact matrix order;
the matrix is the authority, not this skill. Its slots measure:

1. `category_recommendation`;
2. `situation`;
3. `need_fit`;
4. `offering_use_case`;
5. `shortlist`;
6. `open_comparison`;
7. `brand_fit`;
8. `explicit_recommendation`;
9. `direct_comparison`; and
10. `fit_misfit`.

Slots 1–6 are unnamed and forbid the audited brand and comparison target. Slots
7–10 are named and require the audited brand. Slot 9 additionally requires the
comparison target and an explicit comparison relation. Preserve the exact
`NUAVE-BRAND-*` IDs, matrix categories, roles, and identity policies. Return
`needs_input` when approved inputs cannot support a required row.

Do not change a slot's purpose or policy because another question would be
easier to write.

## Generate natural customer questions

For each row:

1. Identify the customer's immediate need and decision.
2. Select only approved inputs relevant to that row.
3. Write one independently understandable customer question.
4. Use the requested language; default to natural Bahasa Indonesia.
5. Include location only for local decisions. Otherwise use the relevant
   country, industry, audience, use case, or other verified market context.
6. Use ordinary customer terms instead of audit, SEO, GEO, or AI-ranking jargon.
7. Keep one main request and concise wording.
8. Make named questions useful without presuming the brand is good, suitable,
   available, or recommended. Keep slot 9 as a direct comparison.

Keep the audited brand, its name variants, URLs, slogans, unique product names,
comparison target, and other identifying clues out of slots 1–6. Include the
audited brand in slots 7–10, and include the comparison target plus an explicit
relation in slot 9.

Do not ask the customer-style question to provide sources, explain methodology,
calculate a score, or discuss audit limitations. Those belong to execution and
reporting.

Avoid:

- generic questions that could apply unchanged to any category;
- keyword stuffing or corporate marketing language;
- multiple unrelated requests;
- unsupported superlatives or winner requests;
- invented prices, availability, features, locations, policies, reviews,
  credentials, outcomes, conflicts, or customer pain;
- sensitive profiling or individualized high-impact advice; and
- wording designed to trigger the audited brand.

## Apply category safety

For regulated or high-impact categories, keep prompts to business discovery and
public brand facts. Do not request medical, legal, financial, employment,
housing, insurance, or eligibility advice, or ask ChatGPT to certify safety,
legality, suitability, quality, returns, or outcomes.

Return `needs_input` with a `regulated_category_review` conflict when the fixed
matrix cannot be completed safely from approved business facts.

## Review the complete pack

Revise until all checks pass:

- exactly ten prompts in matrix order;
- exact matrix slot order, IDs, categories, roles, and identity policies;
- exactly six unnamed and four named prompts;
- no brand or comparison-target leakage in slots 1–6;
- required audited-brand identity in slots 7–10;
- required comparison target and relation in slot 9;
- one exact entity and market scope throughout;
- only verified offerings, needs, criteria, and competitor facts;
- no unsupported premise, prediction, recommendation, or category guarantee;
- no duplicate customer job;
- every question works without conversation history;
- natural language appropriate to the category; and
- regulated-category guardrails pass.

Every generated pack remains a draft until a human reviews the exact wording.

## Return structured output

Return valid JSON in this shape:

```json
{
  "status": "draft_for_review",
  "prompt_pack_version": "draft-v1",
  "language": "id-ID",
  "target_product": "ChatGPT",
  "brand": {
    "brand_name": "Canonical brand name",
    "entity_scope": "Exact measured scope",
    "brand_type": "Plain-language brand type",
    "category": "Customer-facing category",
    "market_context": "Relevant market context",
    "target_customer": "Verified target customer"
  },
  "summary": {
    "total_prompts": 10,
    "unbranded_prompts": 6,
    "branded_prompts": 4
  },
  "prompts": [
    {
      "prompt_id": "NUAVE-BRAND-NEED-01",
      "category": "category_recommendation",
      "role": "Identify category options without naming either business",
      "branded": false,
      "question": "Exact customer-style question",
      "rationale": "Why this question represents the assigned intent",
      "inputs_used": ["verified_customer_needs[0]", "market_context"],
      "review_status": "needs_human_review"
    }
  ],
  "self_check": {
    "ten_prompts": true,
    "canonical_matrix": true,
    "six_unnamed": true,
    "four_named": true,
    "slot_policies": true,
    "slot_9_comparison": true,
    "no_brand_leakage": true,
    "verified_inputs_only": true,
    "approved_comparison_target": true,
    "single_entity_scope": true,
    "category_safety_pass": true,
    "independent_natural_questions": true
  },
  "warnings": []
}
```

## Customer wording edits

Editing never creates a new composition. A customer may edit wording within
the assigned slot, but the slot's ID, category, declared purpose, audited-brand
policy, comparison-target policy, and 6/4 allocation remain fixed. Deterministic
checks block forbidden or missing identities, a missing slot-9 relation, empty
or overlong text, non-questions, unsafe content, and unrelated requests.

If wording passes the mechanical checks but may drift from the slot's declared
purpose, report a non-blocking warning and allow the customer to proceed in V1.
Do not add a model-assisted purpose validator.

Return all ten prompt records. Use the supplied `prompt_pack_version`; otherwise
use `draft-v1`. List only inputs that directly determine each question in
`inputs_used`. Keep warnings factual and specific.

Do not include predicted answers, expected visibility, a score, report findings,
or claims about why ChatGPT may include or omit the brand.

## Revise an existing pack

When revising:

1. Preserve prompt IDs, matrix categories, slot roles, identity policies, and
   the 6/4 allocation.
2. Change only wording within the assigned slot or approved input substitutions
   required by feedback.
3. Re-run every pack-level check, including scope, leakage, duplication, and
   slot-policy, comparison-relation, and category-safety checks.
4. Return the complete ten-question pack, not only changed rows.
5. Keep every prompt marked `needs_human_review`.
