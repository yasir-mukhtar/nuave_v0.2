import {
  AUDIT_MEASUREMENT_MATRIX,
  measurementSlotForOrder,
  measurementSlotForPromptId,
} from "../measurement-matrix";
import type {
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
  ReportContent,
} from "../types";

export const GOLDEN_REPORT_SECTIONS = [
  "Main Result",
  "Key Findings",
  "What to Do Next",
  "Test-by-Test Results",
  "How This Audit Works",
] as const;

export type ExpectedResultDimensions = {
  appearance: "absent" | "mentioned" | "not_assessed";
  recommendation: "recommended" | "not_recommended" | "not_assessed";
  comparison:
    | "client_preferred"
    | "competitor_preferred"
    | "compared_no_preference"
    | "not_observed"
    | "not_assessed";
  information: "confirmed" | "incomplete" | "conflicting" | "not_assessed";
  run: "completed" | "failed";
};

const questions = [
  {
    order: 1,
    text: "Which advisory firms help local manufacturers prepare for export?",
  },
  {
    order: 2,
    text: "What should a manufacturer check before hiring an export adviser?",
  },
  { order: 3, text: "Which export advisory firms serve Port Aurora?" },
  {
    order: 4,
    text: "Who is recommended for export-readiness support in Port Aurora?",
  },
  { order: 5, text: "How do local export advisers differ in their support?" },
  {
    order: 6,
    text: "How does Northstar Advisory compare with Meridian Partners?",
  },
  { order: 7, text: "Does Northstar Advisory offer export-readiness reviews?" },
  { order: 8, text: "Is Northstar Advisory based in Port Aurora?" },
  {
    order: 9,
    text: "Is Northstar Advisory's published registration information consistent?",
  },
  { order: 10, text: "How can a manufacturer contact Northstar Advisory?" },
] as const;

const questionForOrder = (order: number) => {
  const question = questions.find((item) => item.order === order);
  if (!question)
    throw new Error(`Golden fixture question ${order} is missing.`);
  return question.text;
};

export const goldenBrief: BusinessBrief = {
  brand_name: "Northstar Advisory",
  entity_scope: "Northstar Advisory in Port Aurora",
  brand_type: "B2B service",
  category: "export advisory",
  market_context: "Port Aurora",
  target_customer: "local manufacturer",
  official_sources: ["https://northstar.example"],
  verified_offerings: ["export-readiness reviews"],
  verified_customer_needs: ["prepare for export", "check export readiness"],
  verified_decision_criteria: [
    "relevant experience",
    "clear public information",
  ],
  verified_competitor: {
    name: "Meridian Partners",
    scope: "Port Aurora",
    source_url: "https://meridian.example",
  },
  brand_name_variants: ["Northstar"],
  priority_offering: "export-readiness reviews",
  conversion_action: "request a consultation",
  customer_supplied_facts: [],
  known_accuracy_questions: [
    "The published registration date needs confirmation.",
  ],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

export const goldenPrompts: AuditPrompt[] = AUDIT_MEASUREMENT_MATRIX.map(
  (slot) => ({
    prompt_id: slot.id,
    // This fixture keeps the temporary AuditPrompt compatibility shape. Its
    // report meaning is always resolved from the canonical slot above.
    category: slot.legacyCategory,
    role: slot.legacyRole,
    branded: slot.legacyBranded,
    question: questionForOrder(slot.order),
    rationale: slot.measurementPurpose,
    inputs_used: [...slot.allowedContextFields],
    review_status: "needs_human_review",
  }),
);

function goldenPromptForOrder(order: number) {
  const slot = measurementSlotForOrder(order);
  if (!slot) throw new Error(`Golden fixture slot ${order} is missing.`);
  const prompt = goldenPrompts.find((item) => item.prompt_id === slot.id);
  if (!prompt) throw new Error(`Golden fixture prompt ${order} is missing.`);
  return prompt;
}

const answersByOrder = new Map<number, string>([
  [1, "Several local firms offer export planning and documentation support."],
  [
    2,
    "Check relevant experience, scope, written deliverables, and references.",
  ],
  [3, "Northstar Advisory is one export advisory option in Port Aurora."],
  [
    4,
    "Northstar Advisory is recommended for manufacturers needing an export-readiness review.",
  ],
  [5, ""],
  [
    6,
    "Northstar Advisory is a better fit for readiness reviews, while Meridian Partners focuses on logistics.",
  ],
  [
    7,
    "Northstar Advisory offers export-readiness reviews for local manufacturers.",
  ],
  [8, "Northstar Advisory lists its office in Port Aurora."],
  [9, "Sources conflict on Northstar Advisory's registration date."],
  [
    10,
    "Use Northstar Advisory's official contact form to request a consultation.",
  ],
]);

export const goldenObservations: AuditObservation[] = goldenPrompts.map(
  (prompt) => {
    const slot = measurementSlotForPromptId(prompt.prompt_id);
    if (!slot)
      throw new Error(`Golden prompt ${prompt.prompt_id} is unmapped.`);
    const answer = answersByOrder.get(slot.order);
    if (answer === undefined) {
      throw new Error(`Golden fixture answer ${slot.order} is missing.`);
    }
    const failed = slot.order === 5;
    return {
      prompt_id: prompt.prompt_id,
      category: prompt.category,
      branded: prompt.branded,
      question: prompt.question,
      system: "OpenAI Responses API",
      requested_model: "fixture-requested-model",
      returned_model: "fixture-returned-model",
      response_id: `fixture-response-${slot.order}`,
      observed_at: "2026-08-01T00:00:00.000Z",
      raw_answer: answer,
      sources: failed
        ? []
        : [
            {
              url:
                slot.order === 6
                  ? "https://meridian.example/services"
                  : `https://northstar.example/evidence-${slot.order}`,
              title: `Fictional source ${slot.order}`,
            },
          ],
      run_status: failed ? "failed" : "completed",
      failure_reason: failed ? "Synthetic provider timeout." : "",
      telemetry: [],
    };
  },
);

export function goldenReportContent(): ReportContent {
  return {
    conclusion: `Northstar appeared in ${goldenDiscoveryAppeared} of ${compatibilityUnbrandedSlots.length} unnamed recommendation-path answers. One direct comparison preferred it for a specific need.`,
    accuracy_status: "no_clear_issues",
    observed_competitors: [
      {
        name: "Meridian Partners",
        relationship: "client_preferred",
        evidence_prompt_ids: [goldenPromptForOrder(6).prompt_id],
      },
    ],
    key_findings: [
      {
        title: "Unnamed recommendation-path coverage was limited",
        explanation:
          "Northstar appeared in one of three unnamed recommendation-path attempts. One attempt failed.",
        evidence_prompt_ids: [
          goldenPromptForOrder(3).prompt_id,
          goldenPromptForOrder(4).prompt_id,
          goldenPromptForOrder(5).prompt_id,
        ],
      },
      {
        title: "One direct comparison preferred Northstar",
        explanation:
          "One answer directly compared Northstar Advisory with Meridian Partners and preferred Northstar for a specific need.",
        evidence_prompt_ids: [goldenPromptForOrder(6).prompt_id],
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action: "Clarify the needs Northstar serves",
        why: "Unnamed recommendation-path answers did not consistently include Northstar.",
        basis:
          "The tested answers show an observed gap in unnamed recommendation-path coverage.",
        owner: "business_owner",
        done_when:
          "An official page explains the customer needs Northstar serves.",
        evidence_prompt_ids: [
          goldenPromptForOrder(1).prompt_id,
          goldenPromptForOrder(3).prompt_id,
          goldenPromptForOrder(5).prompt_id,
        ],
        caveat:
          "Clearer public information does not guarantee a recommendation.",
      },
      {
        order: 2,
        timing: "do_next",
        action: "Explain the readiness review clearly",
        why: "Two completed unnamed recommendation-path answers did not name Northstar.",
        basis: "The first two searches did not name a provider.",
        owner: "marketing",
        done_when: "One official page explains the service and ideal client.",
        evidence_prompt_ids: [
          goldenPromptForOrder(1).prompt_id,
          goldenPromptForOrder(2).prompt_id,
        ],
        caveat: "Clearer copy does not guarantee discovery.",
      },
      {
        order: 3,
        timing: "do_next",
        action: "Repeat the failed shortlist test",
        why: "One unnamed recommendation-path test could not be completed.",
        basis: "The provider returned no usable answer.",
        owner: "marketing",
        done_when: "The same question completes and its answer is reviewed.",
        evidence_prompt_ids: [goldenPromptForOrder(5).prompt_id],
        caveat: "A later answer may still vary.",
      },
    ],
    details: goldenPrompts.map((prompt) => {
      const observation = goldenObservations.find(
        (item) => item.prompt_id === prompt.prompt_id,
      );
      if (!observation) {
        throw new Error(`Golden observation ${prompt.prompt_id} is missing.`);
      }
      const failed = observation.run_status === "failed";
      return {
        prompt_id: prompt.prompt_id,
        ...expectedDimensionsByPrompt[prompt.prompt_id],
        finding: failed
          ? "This test could not be completed."
          : "The result follows the synthetic answer.",
        answer_excerpt: observation.raw_answer,
        evidence_note: failed
          ? "No answer was available to assess."
          : "The copied answer supports this result.",
        source_urls: observation.sources.map((source) => source.url),
      };
    }),
  };
}

const expectedAssessmentByPromptId: Record<
  string,
  Partial<
    Pick<
      ExpectedResultDimensions,
      "recommendation" | "comparison" | "information"
    >
  >
> = {
  [goldenPromptForOrder(3).prompt_id]: { recommendation: "not_recommended" },
  [goldenPromptForOrder(6).prompt_id]: { comparison: "client_preferred" },
};

function expectedDimensionsForPrompt(
  promptId: string,
): ExpectedResultDimensions {
  const slot = measurementSlotForPromptId(promptId);
  const observation = goldenObservations.find(
    (item) => item.prompt_id === promptId,
  );
  if (!slot || !observation) {
    throw new Error(`Golden fixture dimensions are missing for ${promptId}.`);
  }
  const failed = observation.run_status === "failed";
  if (failed) {
    return {
      appearance: "not_assessed",
      recommendation: "not_assessed",
      comparison: "not_assessed",
      information: "not_assessed",
      run: "failed",
    };
  }
  const appearance = observation.raw_answer.includes(goldenBrief.brand_name)
    ? "mentioned"
    : "absent";
  const override = expectedAssessmentByPromptId[promptId] ?? {};
  return {
    appearance,
    recommendation:
      slot.reportAssessmentClass === "recommendation"
        ? appearance === "mentioned"
          ? (override.recommendation ?? "not_assessed")
          : "not_assessed"
        : "not_assessed",
    comparison:
      slot.reportAssessmentClass === "comparison"
        ? appearance === "mentioned"
          ? (override.comparison ?? "not_observed")
          : "not_observed"
        : "not_observed",
    information:
      slot.reportAssessmentClass === "information"
        ? appearance === "mentioned"
          ? (override.information ?? "not_assessed")
          : "not_assessed"
        : "not_assessed",
    run: observation.run_status,
  };
}

export const expectedDimensionsByPrompt: Record<
  string,
  ExpectedResultDimensions
> = Object.fromEntries(
  AUDIT_MEASUREMENT_MATRIX.map((slot) => {
    const prompt = goldenPromptForOrder(slot.order);
    return [prompt.prompt_id, expectedDimensionsForPrompt(prompt.prompt_id)];
  }),
) as Record<string, ExpectedResultDimensions>;

const compatibilityUnbrandedSlots = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) =>
    !slot.legacyBranded && slot.reportAssessmentClass === "recommendation",
);
const compatibilityNamedSlots = AUDIT_MEASUREMENT_MATRIX.filter(
  (slot) => slot.legacyBranded,
);
const goldenDiscoveryRecommended = compatibilityUnbrandedSlots.filter(
  (slot) =>
    expectedDimensionsByPrompt[goldenPromptForOrder(slot.order).prompt_id]
      ?.recommendation === "recommended" &&
    expectedDimensionsByPrompt[goldenPromptForOrder(slot.order).prompt_id]
      ?.appearance === "mentioned",
).length;
const goldenDiscoveryAppeared = compatibilityUnbrandedSlots.filter(
  (slot) =>
    expectedDimensionsByPrompt[goldenPromptForOrder(slot.order).prompt_id]
      ?.appearance === "mentioned",
).length;
const goldenDiscoveryFailed = compatibilityUnbrandedSlots.filter(
  (slot) =>
    expectedDimensionsByPrompt[goldenPromptForOrder(slot.order).prompt_id]
      ?.run === "failed",
).length;
const goldenNamedRecognized = compatibilityNamedSlots.filter(
  (slot) =>
    expectedDimensionsByPrompt[goldenPromptForOrder(slot.order).prompt_id]
      ?.appearance === "mentioned",
).length;

export const expectedDenominatorLabels = {
  discovery: `Recommended in ${goldenDiscoveryRecommended} of ${compatibilityUnbrandedSlots.length} questions without the business name; ${goldenDiscoveryFailed} question could not be tested.`,
  recognition: `Recognized in ${goldenNamedRecognized} of ${compatibilityNamedSlots.length} questions that named the business.`,
} as const;

export const goldenReviewCriteria = {
  section_sequence: GOLDEN_REPORT_SECTIONS,
  screen_and_print_share_one_report: true,
  technical_failures_are_context_not_headlines: true,
  private_inputs_are_fictional: true,
} as const;
