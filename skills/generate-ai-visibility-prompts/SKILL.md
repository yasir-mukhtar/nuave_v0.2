---
name: generate-ai-visibility-prompts
description: Generate, revise, or quality-check a structured ten-question AI visibility prompt pack for one verified Indonesian business, using the Intent-5 matrix with five unbranded and five branded questions. Questions are written in natural Indonesian for later independent execution in ChatGPT, across local services, ecommerce, B2B, software, professional services, or other reviewed categories. Do not use it to execute questions, analyze answers, calculate scores, or write the audit report.
---

# Generate Brand AI Visibility Prompts

Create one reviewable ten-question prompt pack for one exact, verified business.
Write the questions in natural Indonesian, as a real Indonesian customer would
type them. Tailor the language to the business's real category and market
without favouring it or inventing facts.

## Load the context

Read
[`../../docs/PROMPT_GENERATION_CONTEXT.md`](../../docs/PROMPT_GENERATION_CONTEXT.md)
completely before generating or revising a pack. Treat it as the source for the
required inputs, Intent-5 matrix, natural-language rules, safety boundaries, and
acceptance checks.

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

## Build the fixed universal matrix

Generate the ten records in the exact order defined in the universal context:

1. two unbranded `need_discovery` questions;
2. two unbranded `solution_discovery` questions;
3. one unbranded and one branded `comparison` question;
4. two branded `validation` questions; and
5. two branded `action` questions.

Preserve the exact `NUAVE-BRAND-*` prompt IDs, category, role, and branded
status. Return `needs_input` when approved inputs cannot support a required row.

Do not change the matrix simply because another question would be easier to
write.

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
8. Make branded validation and action questions useful without presuming the
   brand is good, suitable, available, or recommended.

Keep the audited brand, its name variants, URLs, slogans, unique product names,
and other identifying clues out of every unbranded question.

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
- exactly two prompts in each Intent-5 category;
- exactly five unbranded and five branded prompts;
- exact prompt IDs, roles, and branded status;
- no brand leakage in unbranded prompts;
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
    "unbranded_prompts": 5,
    "branded_prompts": 5
  },
  "prompts": [
    {
      "prompt_id": "NUAVE-BRAND-NEED-01",
      "category": "need_discovery",
      "role": "Explore one verified need without naming a brand",
      "branded": false,
      "question": "Exact customer-style question",
      "rationale": "Why this question represents the assigned intent",
      "inputs_used": ["verified_customer_needs[0]", "market_context"],
      "review_status": "needs_human_review"
    }
  ],
  "self_check": {
    "ten_prompts": true,
    "two_per_category": true,
    "five_unbranded": true,
    "five_branded": true,
    "no_brand_leakage": true,
    "verified_inputs_only": true,
    "verified_competitor_only": true,
    "single_entity_scope": true,
    "category_safety_pass": true,
    "independent_natural_questions": true
  },
  "warnings": []
}
```

Return all ten prompt records. Use the supplied `prompt_pack_version`; otherwise
use `draft-v1`. List only inputs that directly determine each question in
`inputs_used`. Keep warnings factual and specific.

Do not include predicted answers, expected visibility, a score, report findings,
or claims about why ChatGPT may include or omit the brand.

## Revise an existing pack

When revising:

1. Preserve prompt IDs, category roles, and branded allocation.
2. Change only wording or approved input substitutions required by feedback.
3. Re-run every pack-level check, including scope, leakage, duplication, and
   category safety.
4. Return the complete ten-question pack, not only changed rows.
5. Keep every prompt marked `needs_human_review`.
