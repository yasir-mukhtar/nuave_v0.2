# Nuave prompt-generation context

> Status: **Working product context for the ten-question prompt pack**
>
> Updated: 2026-09-01

## Purpose

This document defines how to generate a ten-question AI visibility prompt pack
for one verified business. The audited business is the buyer's own business.
The canonical matrix is the only source of slot measurement semantics. This
document explains how to use it for generation; it does not redefine the matrix
or allow its composition to change.

The
[`generate-ai-visibility-prompts`](../skills/generate-ai-visibility-prompts/SKILL.md)
skill reads this file before creating or revising a pack. The matrix definition
is in [`Spec 007 R-01/R-02`](../specs/007-intake-airbnb-revamp/SPEC.md)
and the [canonical implementation](../src/lib/audit/measurement-matrix.ts).

The universal method is a working prompt framework. It does not prove that one
matrix fits every industry or that Nuave can safely deliver a complete audit for
every brand type. Regulated, sensitive, or unusually complex categories still
require category-specific review.

The primary suggestion is written with one bounded, no-search model call in
natural Indonesian, as a real Indonesian customer would ask it, not translated
from an English template. A deterministic Indonesian set is retained only as
the guaranteed fallback so this stage cannot hard-fail.

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

The generated pack has:

- one verified brand and one exact entity scope;
- ten independently understandable questions in the canonical slot order;
- six unnamed questions in slots 1–6 and four named questions in slots 7–10;
- a slot 9 direct comparison that requires the audited brand, comparison target,
  and an explicit comparison relation;
- the language requested by the user, defaulting to Bahasa Indonesia;
- ChatGPT as the named target product; and
- wording edits constrained to the assigned slot, subject to deterministic
  identity, shape, safety, privacy, scope, and provider checks; and
- human approval of the exact final pack before audit execution.

Persist and report the exact final text. Valid final packs retain the 6/4
composition; reported name/no-name classifications still derive from that exact
text.

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
- `official_sources`: at least one supported authoritative source, either the
  official website or Instagram profile; Google Maps is deferred in V1;
- `verified_offerings`: one or more approved products, services, or capabilities;
- `verified_customer_needs`: one or more real needs, jobs, or situations the
  offering is intended to address;
- `verified_decision_criteria`: one or more practical, publicly checkable
  factors customers may use when comparing options;
- `verified_competitor`: the comparison target for slot 9, either a proposed
  relevant business or the approved category-level fallback. A source URL is
  carried when available but is not required for the fallback.

Accept when available:

- `brand_name_variants`;
- `priority_offering`;
- `conversion_action`, such as contact, visit, book, request a quote, start a
  trial, or purchase;
- `customer_supplied_facts`;
- `regulated_category_notes`;
- `language`; and
- `prompt_pack_version`.

Inputs labelled `verified_*` must be approved by the operator or supplied with
a reviewable source. Keep customer-supplied facts identified as such. Do not
turn an unverified claim into a premise merely because it would make a useful
question.

## Canonical ten-slot generation matrix

The ten slots, their IDs, categories, declared purposes, identity policies, and
allowed context fields are defined only by the
[`AUDIT_MEASUREMENT_MATRIX`](../src/lib/audit/measurement-matrix.ts), as
specified by Spec 007 R-01/R-02. Do not copy or alter that policy here. The
generator reads the matrix in order and supplies natural wording for each slot.

The slot sequence is:

1. `category_recommendation` — which options exist in the category and context;
2. `situation` — a real occasion that leads someone to look;
3. `need_fit` — a specific need and what suits it;
4. `offering_use_case` — one concrete offering or use case;
5. `shortlist` — a short list a customer would consider;
6. `open_comparison` — comparison among realistic unnamed options;
7. `brand_fit` — whether the business suits a stated need;
8. `explicit_recommendation` — whether the model recommends the business;
9. `direct_comparison` — the business against the comparison target, with an
   explicit comparison relation; and
10. `fit_misfit` — who the business suits, who it may not suit, and trade-offs.

Slots 1–6 are unnamed and forbid the audited brand and comparison target. Slots
7–10 are named and require the audited brand. Slot 9 also requires the
comparison target. The fixed composition is **10 total questions: 6 unnamed and
4 named**.

### Slot-writing guidance

Use each matrix slot's `measurementPurpose` and `generatorSlotDescription` as
the meaning to preserve. Use `allowedContextFields` to select relevant verified
inputs. Never substitute a different customer job because it is easier to
write. Natural sentence shape is flexible; slot identity and policy are not.

For slot 9, use the proposed comparison target when one is available. Otherwise
use the approved category-level fallback. The question must name both required
parties and satisfy the matrix's closed comparison-relation rule; do not invent
a named competitor.

## Natural-language rules

- Write as a plausible prospective customer, not an auditor or marketer.
- Keep one main request per question.
- Use ordinary category language and the requested language naturally.
- Make every question understandable without conversation history.
- Use only the market context needed for a meaningful answer.
- Vary sentence shape without forcing slang or artificial personas.
- Keep slots 1–6 free of the brand name, name variants, URLs, slogans, unique
  product names, comparison target, or other clues that reveal either identity.
- Include the audited brand in slots 7–10. Include the comparison target and an
  explicit relation in slot 9.
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

Approve the Nuave-generated suggestion only when:

- all required inputs are present and internally consistent;
- the measured entity and market scope are unambiguous;
- all ten suggestion slots follow the canonical matrix in order;
- exactly six questions are unnamed and four are named;
- no slot 1–6 question leaks the audited brand or comparison target;
- every required identity is present, including the target and relation in slot 9;
- every factual premise traces to an approved input;
- every slot performs its assigned customer job rather than a different one;
- any named comparison business is real, relevant, and verified, or slot 9 uses
  the approved category-level fallback;
- regulated-category boundaries are respected; and
- a human has reviewed the exact wording.

After customer editing, preserve the same slot identity, category, declared
purpose, identity policies, comparison-target policy, and 6/4 composition.
Allow wording changes within the slot, but block approval for forbidden or
missing identities, a missing slot-9 relation, empty or overlong text, a
non-question, sensitive personal data, disallowed high-impact advice, content
unrelated to the audited business decision, or content the chosen provider
cannot safely process. Derive **Tanpa menyebut bisnis Anda** and **Menyebut
bisnis Anda** from the exact final text for reporting. If wording passes the
mechanical checks but may drift from the slot's purpose, warn and proceed in V1;
do not add a model-assisted purpose validator.

## Interpretation boundary

This context generates questions only. It does not execute them, predict
answers, calculate scores, infer visibility, or write findings and
recommendations.

Do not infer universal support from a structurally valid pack. Each new client
category still needs report and claims review before paid delivery.
