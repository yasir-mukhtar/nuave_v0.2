/**
 * Thin presentation projection of the golden fixture.
 *
 * Every displayed identity, fact, and question comes from the existing golden
 * fixture (`../audit/fixtures/report-golden.ts`). This adapter is the only
 * place that arranges those values for the fixture-journey screens; page
 * components must not keep a second hand-copied business or question fixture.
 * Facts and questions remain read-only in this phase.
 */
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
} from "../audit/fixtures/report-golden";
import type { AuditPrompt } from "../audit/types";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const officialSource = goldenBrief.official_sources[0];

/** The single execution surface recorded by the golden observations. */
const recordedSystem = goldenObservations[0]?.system ?? "OpenAI Responses API";

/** Fictional model names recorded by the golden observations, in first-seen order. */
const recordedModels = [
  ...new Set(
    goldenObservations
      .map((observation) => observation.requested_model)
      .filter(Boolean),
  ),
];

export const fixtureJourneyContext = {
  business: {
    name: goldenBrief.brand_name,
    entityScope: goldenBrief.entity_scope,
    category: goldenBrief.category,
    marketContext: goldenBrief.market_context,
    targetCustomer: goldenBrief.target_customer,
    offerings: goldenBrief.verified_offerings,
    priorityOffering: goldenBrief.priority_offering,
    officialSources: goldenBrief.official_sources,
    nameVariants: goldenBrief.brand_name_variants,
    competitor: {
      name: goldenBrief.verified_competitor.name,
      scope: goldenBrief.verified_competitor.scope,
      sourceUrl: goldenBrief.verified_competitor.source_url,
    },
    accuracyQuestions: goldenBrief.known_accuracy_questions,
  },
  /** Fictional contact context, always on the reserved `.example` domain. */
  contact: {
    email: `hello@${hostnameOf(officialSource)}`,
    website: officialSource,
  },
  questions: {
    /** The fixture's ten questions in their original order. */
    all: goldenPrompts,
    /** Five questions that never name the business. */
    unbranded: goldenPrompts.filter((prompt) => !prompt.branded),
    /** Five questions that name the business. */
    branded: goldenPrompts.filter((prompt) => prompt.branded),
  },
  /**
   * Order-summary facts derived from the fixture, so the summary tracks the
   * golden prompts and observations instead of hard-coded copy.
   */
  summary: {
    questionCount: goldenPrompts.length,
    executionSurface: {
      system: recordedSystem,
      models: recordedModels,
    },
  },
};

/** Plain-language explanation of the two question classes. */
export const questionClassExplanations = {
  unbranded: {
    label: "Discovery questions",
    detail: `These five questions never name ${goldenBrief.brand_name}. They are what a customer looking for ${goldenBrief.category} help in ${goldenBrief.market_context} would type, and they test whether the business would be discovered at all.`,
  },
  branded: {
    label: "Named-business questions",
    detail: `These five questions name ${goldenBrief.brand_name}. They test what AI says about the business when a customer already knows it: whether the details are accurate, consistent, and easy to act on.`,
  },
} as const;

export function questionPackIsBalanced(): boolean {
  return (
    goldenPrompts.length === 10 &&
    goldenPrompts.filter((prompt) => !prompt.branded).length === 5 &&
    goldenPrompts.filter((prompt) => prompt.branded).length === 5
  );
}

export type FixtureJourneyQuestion = AuditPrompt;
