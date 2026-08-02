import type { BusinessBrief, PromptPack } from "./types";
import {
  PROMPT_MATRIX,
  assemblePromptPack,
  type PromptQuestionDraft,
} from "./contracts";

// Nuave builds the ten audit questions in code from the verified brief and the
// fixed Intent-5 matrix. No provider call is made here, so question generation
// cannot fail on structured output and cannot spend audit budget. Every
// question still requires human review before the audit runs.

type BriefField = keyof BusinessBrief;

function phrase(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\?/g, "")
    .trim()
    .replace(/[.,;:!]+$/, "")
    .trim();
}

function normalizeIdentity(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

// A value may be used in an unbranded question only when it cannot reveal the
// audited business: no brand name or variant, no competitor name, no link, and
// no domain-like token. Required scalar fields (category, market context,
// target customer) are not filtered here; if one of those carries the brand,
// the pack fails review instead of quietly rewriting a verified fact.
function safeForUnbranded(value: string, brief: BusinessBrief) {
  const candidate = phrase(value);
  if (!candidate) return "";
  if (/https?:\/\//i.test(candidate)) return "";
  if (/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i.test(candidate)) return "";
  const haystack = ` ${normalizeIdentity(candidate)} `;
  const identities = [
    brief.brand_name,
    ...brief.brand_name_variants,
    brief.verified_competitor.name,
  ]
    .map(normalizeIdentity)
    .filter((identity) => identity.length >= 3);
  if (identities.some((identity) => haystack.includes(` ${identity} `)))
    return "";
  return candidate;
}

function firstUnbranded(values: string[], brief: BusinessBrief) {
  for (const value of values) {
    const safe = safeForUnbranded(value, brief);
    if (safe) return safe;
  }
  return "";
}

// Returns the first usable value together with the verified field it came
// from, so provenance records the field the question actually used.
function firstUnbrandedField(
  candidates: readonly (readonly [BriefField, string])[],
  brief: BusinessBrief,
): { value: string; field: BriefField } | null {
  for (const [field, value] of candidates) {
    const safe = safeForUnbranded(value, brief);
    if (safe) return { value: safe, field };
  }
  return null;
}

function draft(
  question: string,
  inputs_used: BriefField[],
): PromptQuestionDraft {
  return { question, inputs_used };
}

/**
 * Ten ordered question drafts, one per fixed matrix row. Each draft records
 * only the verified brief fields that its wording actually uses.
 */
export function deterministicQuestionDrafts(
  brief: BusinessBrief,
): PromptQuestionDraft[] {
  const category = phrase(brief.category);
  const market = phrase(brief.market_context);
  const customer = phrase(brief.target_customer);
  const brand = phrase(brief.brand_name);
  const competitor = phrase(brief.verified_competitor.name);
  const needs = brief.verified_customer_needs;
  const criteria = brief.verified_decision_criteria;

  const firstNeed = firstUnbranded(needs, brief);
  const secondNeed = firstUnbranded(needs.slice(1), brief);
  const firstCriterion = firstUnbranded(criteria, brief);
  const unbrandedOffering = firstUnbrandedField(
    [
      ["priority_offering", brief.priority_offering],
      ...brief.verified_offerings.map(
        (offering) => ["verified_offerings", offering] as const,
      ),
    ],
    brief,
  );
  const brandedOfferingField: BriefField = brief.priority_offering.trim()
    ? "priority_offering"
    : "verified_offerings";
  const brandedOffering =
    phrase(brief.priority_offering) ||
    phrase(brief.verified_offerings[0] ?? "");
  const comparisonBasis = criteria.length
    ? criteria
        .slice(0, 2)
        .map((value) => phrase(value))
        .filter(Boolean)
        .join(" and ")
    : "";
  const accuracyQuestion = phrase(brief.known_accuracy_questions[0] ?? "");
  const action = phrase(brief.conversion_action);
  // NUAVE-BRAND-ACTION-02 may only use brand name, priority offering,
  // decision criteria, or the conversion action.
  const decisionDetail: { value: string; field: BriefField } | null =
    firstCriterion
      ? { value: firstCriterion, field: "verified_decision_criteria" }
      : phrase(brief.priority_offering)
        ? {
            value: phrase(brief.priority_offering),
            field: "priority_offering",
          }
        : null;

  return [
    // NUAVE-BRAND-NEED-01 — one verified need, no brand.
    firstNeed
      ? draft(
          `I need help with ${firstNeed} in ${market}, so where do I start?`,
          ["verified_customer_needs", "market_context"],
        )
      : draft(
          `I am a ${customer} looking into ${category}, so where do I start?`,
          ["target_customer", "category"],
        ),

    // NUAVE-BRAND-NEED-02 — a different verified need, no brand.
    secondNeed
      ? draft(
          `What should a ${customer} check when dealing with ${secondNeed}?`,
          ["target_customer", "verified_customer_needs"],
        )
      : firstCriterion
        ? draft(
            `What should a ${customer} check when ${firstCriterion} matters to them?`,
            ["target_customer", "verified_decision_criteria"],
          )
        : draft(
            `What should a ${customer} check before arranging ${category}?`,
            ["target_customer", "category"],
          ),

    // NUAVE-BRAND-SOLUTION-01 — category options in the verified market.
    draft(`What ${category} options are available in ${market}?`, [
      "category",
      "market_context",
    ]),

    // NUAVE-BRAND-SOLUTION-02 — one verified offering or use case.
    unbrandedOffering
      ? draft(`Where can I find ${unbrandedOffering.value} in ${market}?`, [
          unbrandedOffering.field,
          "market_context",
        ])
      : draft(`Where can I find ${category} in ${market}?`, [
          "category",
          "market_context",
        ]),

    // NUAVE-BRAND-COMPARISON-01 — unnamed options on verified criteria.
    comparisonBasis
      ? draft(
          `How should I compare ${category} options in ${market} on ${comparisonBasis}?`,
          ["category", "market_context", "verified_decision_criteria"],
        )
      : draft(
          `How should I compare ${category} options in ${market} before deciding?`,
          ["category", "market_context"],
        ),

    // NUAVE-BRAND-COMPARISON-02 — the only question that names the competitor.
    draft(
      `How does ${brand} compare with ${competitor} for ${category} in ${market}?`,
      ["brand_name", "verified_competitor", "category", "market_context"],
    ),

    // NUAVE-BRAND-VALIDATION-01 — category fit or a verified offering.
    brandedOffering
      ? draft(`Does ${brand} offer ${brandedOffering}?`, [
          "brand_name",
          brandedOfferingField,
        ])
      : draft(`Does ${brand} work in ${category}?`, ["brand_name", "category"]),

    // NUAVE-BRAND-VALIDATION-02 — identity, scope, or a known accuracy question.
    accuracyQuestion
      ? draft(
          `What does public information say about ${brand} regarding ${accuracyQuestion}?`,
          ["brand_name", "known_accuracy_questions"],
        )
      : draft(
          `What public information is available about ${brand} in ${market}?`,
          ["brand_name", "market_context"],
        ),

    // NUAVE-BRAND-ACTION-01 — the verified access or conversion path.
    action
      ? draft(`How can I ${action} with ${brand}?`, [
          "brand_name",
          "conversion_action",
        ])
      : draft(`How can I contact ${brand}?`, ["brand_name"]),

    // NUAVE-BRAND-ACTION-02 — another verified decision detail.
    decisionDetail
      ? draft(
          `What should I know about ${decisionDetail.value} before I choose ${brand}?`,
          ["brand_name", decisionDetail.field],
        )
      : action
        ? draft(`What should I know before I ${action} with ${brand}?`, [
            "brand_name",
            "conversion_action",
          ])
        : draft(`What should I know before I choose ${brand}?`, ["brand_name"]),
  ];
}

/**
 * The full review pack the workflow, observation runner, report, and evidence
 * export consume. Assembly fails closed if any deterministic question breaks a
 * matrix, leakage, or safety rule.
 */
export function buildPromptPack(brief: BusinessBrief): PromptPack {
  const drafts = deterministicQuestionDrafts(brief);
  if (drafts.length !== PROMPT_MATRIX.length) {
    throw new Error("Question generation must produce exactly 10 questions.");
  }
  return assemblePromptPack(drafts, brief);
}
