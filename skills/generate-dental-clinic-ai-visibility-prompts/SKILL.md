---
name: generate-dental-clinic-ai-visibility-prompts
description: Generate, revise, or quality-check a structured ten-question Bahasa Indonesia prompt pack specifically for a Nuave dental-clinic AI visibility audit using verified single-location clinic inputs, the dental Intent-5 taxonomy, and a five-unbranded/five-branded allocation. Use for dental-clinic client audits and dental methodology experiments. Do not use for general brands, execute the questions, analyze ChatGPT responses, calculate scores, or write the customer report.
---

# Generate Dental Clinic AI Visibility Prompts

Create one reviewable ten-question prompt pack for one verified dental-clinic
location. Preserve realistic customer language without favoring the audited
clinic or inventing business facts.

## Load the product context

Read
[`../../docs/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md`](../../docs/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md)
completely before generating or revising a prompt pack. Treat it as the
canonical source for the taxonomy, allocation, language rules, safety
boundaries, and interpretation limits.

If the context file is missing or conflicts with this skill, stop and report
the conflict. Follow the newer founder-approved decision when the repository
decision log clearly resolves it.

## Keep the task boundary

Perform only prompt-pack generation and review.

Do not:

- send the generated questions to ChatGPT;
- browse for or silently verify missing clinic facts;
- analyze prior AI answers;
- calculate visibility, accuracy, or composite scores;
- generate findings, recommendations, or report copy; or
- change repository files unless the user explicitly requests saved output.

## Collect the audit inputs

Require:

- `clinic_name`: canonical public clinic name;
- `branch_name`: exact audited branch or location label;
- `address`: exact public branch address;
- `city`: city used in the audit;
- `local_area`: practical neighborhood, landmark, or travel area;
- `official_sources`: at least one authoritative clinic or business-listing
  source;
- `verified_services`: one or more services approved for use in questions; and
- `verified_competitor`: one real, locally relevant competitor with its name,
  location, and verification source.

Accept when available:

- `name_variants`;
- `priority_service`;
- `intended_customer_context`;
- `customer_supplied_facts`;
- `known_accuracy_questions`; and
- `prompt_pack_version`.

Treat explicit `verified_*` inputs as approved for prompt generation. Keep
customer-supplied facts identified as customer-supplied. Do not treat an
unverified customer statement as an established public fact.

Never request or use patient names, appointment data, diagnoses, treatment
records, private messages, or patient photographs.

If any required input is missing, return only:

```json
{
  "status": "needs_input",
  "missing_inputs": ["field_name"],
  "prompts": []
}
```

Add a short plain-language explanation after the JSON only when it helps the
user supply the missing information. Do not fabricate or return a
complete-looking partial pack.

## Build the fixed Intent-5 matrix

Generate the following records and no others:

| Prompt ID | Category | Role | Branded |
|---|---|---|---|
| `NUAVE-PROBLEM-01` | `problem_discovery` | First symptom- or situation-led local need | `false` |
| `NUAVE-PROBLEM-02` | `problem_discovery` | Different symptom- or situation-led local need | `false` |
| `NUAVE-PROVIDER-01` | `provider_discovery` | General local clinic discovery | `false` |
| `NUAVE-PROVIDER-02` | `provider_discovery` | Verified service-led local discovery | `false` |
| `NUAVE-COMPARISON-01` | `comparison` | Open comparison using practical criteria | `false` |
| `NUAVE-COMPARISON-02` | `comparison` | Head-to-head with the verified competitor | `true` |
| `NUAVE-VALIDATION-01` | `validation` | Verify a priority service or important public fact | `true` |
| `NUAVE-VALIDATION-02` | `validation` | Verify branch identity, location, hours, or consistency | `true` |
| `NUAVE-ACTION-01` | `action` | Price, service access, or availability | `true` |
| `NUAVE-ACTION-02` | `action` | Hours, contact, directions, or booking | `true` |

Do not change the matrix merely to make generation easier. Return
`needs_input` when the approved inputs cannot support one of its required
roles.

## Generate natural customer questions

For each matrix row:

1. Identify the customer's immediate situation and decision.
2. Use only approved clinic, location, service, and competitor inputs.
3. Write one independently understandable question in casual-neutral
   Indonesian.
4. Keep one main request. A short setup sentence may precede it.
5. Include the city or local area naturally when local relevance affects the
   answer.
6. Prefer familiar customer words over clinical, marketing, or audit terms.
7. Vary sentence shape without forcing slang or artificial personas.
8. Keep the wording concise; prefer roughly 8–30 words when natural.

Do not put the clinic name, its branch name, an identifiable name variant, its
website, or another unique brand clue into any unbranded question.

Do not ask the customer-style question to provide citations, explain
methodology, use public information only, or discuss limitations. Put web,
source, and evidence requirements in the later execution configuration.

Avoid:

- keyword-stuffed or corporate wording;
- multiple unrelated requests in one question;
- diagnosis, medication, or treatment-plan requests;
- `terbaik`, `paling bagus`, or other clinical-superiority framing;
- claims that a service, price, hour, review, credential, or conflict exists
  unless supported by an approved input; and
- wording optimized to cause the audited clinic to appear.

When a symptom-led question is needed, describe a common synthetic situation
and ask about an appropriate clinic, service, or provider to check. Do not
diagnose the symptom in the question or imply that the audited clinic is
clinically suitable.

## Review before returning

Review the complete pack as a set. Revise it until all checks pass:

- exactly ten prompts;
- exactly two prompts in every Intent-5 category;
- exactly five unbranded and five branded prompts;
- the fixed role and branded status for every prompt ID;
- no clinic or unique brand leakage in unbranded prompts;
- one verified competitor used only where appropriate;
- no invented facts or unsupported conflict premise;
- no diagnosis, prescription, guarantee, or clinical-quality verdict;
- no two prompts performing substantially the same customer job;
- every question understandable without conversation history; and
- ordinary Indonesian when read aloud.

Do not claim that model self-review equals human approval. Every successfully
generated pack remains a draft until a human reviews its exact wording.

## Return structured output

Return valid JSON in this shape:

```json
{
  "status": "draft_for_review",
  "prompt_pack_version": "draft-v1",
  "language": "id-ID",
  "target_product": "ChatGPT",
  "clinic": {
    "clinic_name": "Canonical clinic name",
    "branch_name": "Exact branch",
    "city": "City",
    "local_area": "Local area"
  },
  "summary": {
    "total_prompts": 10,
    "unbranded_prompts": 5,
    "branded_prompts": 5
  },
  "prompts": [
    {
      "prompt_id": "NUAVE-PROBLEM-01",
      "category": "problem_discovery",
      "role": "First symptom- or situation-led local need",
      "branded": false,
      "question": "Exact Bahasa Indonesia customer question",
      "rationale": "Why this question represents the assigned customer intent",
      "inputs_used": ["city", "verified_services[0]"],
      "review_status": "needs_human_review"
    }
  ],
  "self_check": {
    "ten_prompts": true,
    "two_per_category": true,
    "five_unbranded": true,
    "five_branded": true,
    "no_brand_leakage": true,
    "verified_competitor_only": true,
    "no_clinical_quality_request": true,
    "independent_natural_questions": true
  },
  "warnings": []
}
```

Return all ten prompt records in matrix order. Use the supplied
`prompt_pack_version`; otherwise use `draft-v1`. Keep `warnings` factual and
specific. In `inputs_used`, list only approved input fields whose values appear
in or directly determine the wording of that question; do not list facts kept
only for later answer verification. Do not include a score, predicted ChatGPT
answer, expected clinic appearance, or customer-facing audit conclusion.

If any self-check cannot pass, revise the pack. If the issue depends on missing
or conflicting inputs, return `needs_input` instead.

## Revise an existing pack

When revising:

1. Preserve prompt IDs, category roles, and branded allocation.
2. Change only wording or approved input substitutions needed by the feedback.
3. Re-run every set-level check, including brand leakage and duplication.
4. Return the complete ten-prompt pack, not only the changed records.
5. Keep every record marked `needs_human_review`.
