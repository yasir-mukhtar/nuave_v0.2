# Nuave prompt-generation context

> Status: **Working product context for the ten-question prompt pack**
>
> Updated: 2026-08-09

## Purpose

This document defines how to generate a ten-question AI visibility prompt pack
for one verified business. The audited business is the buyer's own business.
The matrix is category-agnostic so that one method covers the range of small and
medium Indonesian businesses without a new framework per vertical.

The
[`generate-ai-visibility-prompts`](../skills/generate-ai-visibility-prompts/SKILL.md)
skill reads this file before creating or revising a pack.

The universal method is a working prompt framework. It does not prove that one
matrix fits every industry or that Nuave can safely deliver a complete audit for
every brand type. Regulated, sensitive, or unusually complex categories still
require category-specific review.

Questions are written in natural Indonesian, as a real Indonesian customer would
type them, not translated from an English template. A deterministic Indonesian
template set is retained as the guaranteed fallback so this stage cannot
hard-fail.

An earlier vertical-specific method is retained in the repository as history.
It is not part of the current direction.

## Product boundary

Nuave observes how ChatGPT responds to a defined sample of realistic customer
questions about one exact brand scope. The scope may be a local business, one
branch, a professional-service firm, an ecommerce brand, a software company, or
another clearly identified commercial brand.

Every pack must define one measured entity. Do not silently combine multiple
branches, product lines, countries, audiences, or substantially different
offers in one pack.

The audit is a dated sample, not a permanent ranking, a prediction of every
consumer response, or proof of brand quality.

The universal pack uses:

- one verified brand and one exact entity scope;
- ten independently understandable questions;
- five customer-intent categories with two questions each;
- five unbranded and five branded questions;
- the language requested by the user, defaulting to Bahasa Indonesia;
- ChatGPT as the named target product; and
- human review before audit execution.

The exact execution surface, model when available, date, language, market
context, and run conditions belong to the later audit configuration. Do not
represent an API observation as an exact reproduction of personalized ChatGPT.

## Required verified inputs

Require:

- `brand_name`: canonical public brand or business name;
- `entity_scope`: exact branch, business, product line, or brand scope being
  measured;
- `brand_type`: local service, ecommerce, B2B service, software, consumer
  product, professional service, or another plain-language type;
- `category`: the ordinary category customers use to describe the offering;
- `market_context`: the location, country, service area, industry, or customer
  market needed to make the questions meaningful;
- `target_customer`: the intended customer or buyer described without sensitive
  profiling;
- `official_sources`: at least one authoritative brand source;
- `verified_offerings`: one or more approved products, services, or capabilities;
- `verified_customer_needs`: at least two real needs, jobs, or situations the
  offering is intended to address;
- `verified_decision_criteria`: at least two practical, publicly checkable
  factors customers may use when comparing options; and
- `verified_competitor`: one real relevant competitor with its scope and source.

Accept when available:

- `brand_name_variants`;
- `priority_offering`;
- `conversion_action`, such as contact, visit, book, request a quote, start a
  trial, or purchase;
- `customer_supplied_facts`;
- `known_accuracy_questions`;
- `regulated_category_notes`;
- `language`; and
- `prompt_pack_version`.

Inputs labelled `verified_*` must be approved by the operator or supplied with
a reviewable source. Keep customer-supplied facts identified as such. Do not
turn an unverified claim into a premise merely because it would make a useful
question.

## Universal Intent-5 matrix

| Prompt ID | Category | Customer job | Branded |
|---|---|---|---|
| `NUAVE-BRAND-NEED-01` | `need_discovery` | Explore one verified need or situation without naming a brand | `false` |
| `NUAVE-BRAND-NEED-02` | `need_discovery` | Explore a different verified need or situation | `false` |
| `NUAVE-BRAND-SOLUTION-01` | `solution_discovery` | Find relevant category options in the market context | `false` |
| `NUAVE-BRAND-SOLUTION-02` | `solution_discovery` | Find options for one verified offering or use case | `false` |
| `NUAVE-BRAND-COMPARISON-01` | `comparison` | Compare unnamed category options using verified criteria | `false` |
| `NUAVE-BRAND-COMPARISON-02` | `comparison` | Compare the brand with one verified competitor | `true` |
| `NUAVE-BRAND-VALIDATION-01` | `validation` | Verify category fit, offering, or an important public fact | `true` |
| `NUAVE-BRAND-VALIDATION-02` | `validation` | Verify identity, scope, market, or information consistency | `true` |
| `NUAVE-BRAND-ACTION-01` | `action` | Ask about a practical next step or access path | `true` |
| `NUAVE-BRAND-ACTION-02` | `action` | Ask about another verified decision or conversion detail | `true` |

### Need discovery

Use situations or jobs already present in `verified_customer_needs`. Do not
invent pain, urgency, demographics, or outcomes. Ask what category, approach,
or type of provider/product a customer could consider without steering the
answer toward the audited brand.

### Solution discovery

Ask for relevant options using natural category language. Use geography only
for genuinely local decisions. Use industry, audience, use case, or country when
those define the real market instead.

### Comparison

The unbranded question should expose practical comparison criteria without
naming the audited brand. The branded question may name the audited brand and
one verified competitor. Do not ask for an unsupported winner, universal
ranking, or subjective superiority verdict.

### Validation

Ask about facts a prospective customer could reasonably verify after learning
the brand name. Suitable topics include offering fit, service area, product
scope, availability, compatibility, branch identity, public policies, or other
approved facts.

### Action

Ask about the practical next step appropriate to the brand: contact, visit,
book, request a quote, start a trial, buy, or another verified action. Do not
invent prices, stock, availability, promotions, response times, or contractual
terms.

## Natural-language rules

- Write as a plausible prospective customer, not an auditor or marketer.
- Keep one main request per question.
- Use ordinary category language and the requested language naturally.
- Make every question understandable without conversation history.
- Use only the market context needed for a meaningful answer.
- Vary sentence shape without forcing slang or artificial personas.
- Keep unbranded questions free of the brand name, name variants, URLs, slogans,
  unique product names, or other clues that reveal the audited brand.
- Do not request citations, methodology, scoring, or audit limitations inside
  the customer-style question.
- Do not optimize wording to make the audited brand appear.

## Integrity and safety rules

Never request or use private customer records, health information, financial
account data, identity documents, confidential contracts, private messages, or
other unnecessary personal data.

For healthcare, finance, legal, employment, housing, insurance, education, or
another regulated or high-impact category:

- keep questions to business discovery and publicly verifiable brand facts;
- do not request diagnosis, treatment, legal conclusions, financial advice,
  eligibility decisions, or individualized recommendations;
- do not ask ChatGPT to certify safety, legality, professional quality, returns,
  outcomes, or suitability; and
- return `needs_input` or escalate for category-specific review when the fixed
  matrix cannot be filled safely.

Across all categories, avoid unsupported `best`, `safest`, `most trusted`,
guaranteed outcome, revenue, performance, quality, or reputation premises.

## Pre-audit acceptance check

Approve a draft only when:

- all required inputs are present and internally consistent;
- the measured entity and market scope are unambiguous;
- all ten rows match the fixed matrix;
- exactly five questions are unbranded and five are branded;
- no unbranded question leaks the audited brand;
- every factual premise traces to an approved input;
- the two need questions and two solution questions perform different jobs;
- the competitor is real, relevant, and verified;
- regulated-category boundaries are respected; and
- a human has reviewed the exact wording.

## Interpretation boundary

This context generates questions only. It does not execute them, predict
answers, calculate scores, infer visibility, or write findings and
recommendations.

Do not infer universal support from a structurally valid pack. Each new client
category still needs report and claims review before paid delivery.
