import { PROMPT_MATRIX } from "../contracts";
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
  "Which advisory firms help local manufacturers prepare for export?",
  "What should a manufacturer check before hiring an export adviser?",
  "Which export advisory firms serve Port Aurora?",
  "Who is recommended for export-readiness support in Port Aurora?",
  "How do local export advisers differ in their support?",
  "How does Northstar Advisory compare with Meridian Partners?",
  "Does Northstar Advisory offer export-readiness reviews?",
  "Is Northstar Advisory based in Port Aurora?",
  "Is Northstar Advisory's published registration information consistent?",
  "How can a manufacturer contact Northstar Advisory?",
] as const;

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

export const goldenPrompts: AuditPrompt[] = PROMPT_MATRIX.map(
  ([prompt_id, category, branded, role], index) => ({
    prompt_id,
    category,
    role,
    branded,
    question: questions[index],
    rationale: "Represents one fictional customer decision intent.",
    inputs_used: ["market_context"],
    review_status: "needs_human_review",
  }),
);

const answers = [
  "Several local firms offer export planning and documentation support.",
  "Check relevant experience, scope, written deliverables, and references.",
  "Northstar Advisory is one export advisory option in Port Aurora.",
  "Northstar Advisory is recommended for manufacturers needing an export-readiness review.",
  "",
  "Northstar Advisory is a better fit for readiness reviews, while Meridian Partners focuses on logistics.",
  "Northstar Advisory offers export-readiness reviews for local manufacturers.",
  "Northstar Advisory lists its office in Port Aurora.",
  "Sources conflict on Northstar Advisory's registration date.",
  "Use Northstar Advisory's official contact form to request a consultation.",
] as const;

export const goldenObservations: AuditObservation[] = goldenPrompts.map(
  (prompt, index) => ({
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
    question: prompt.question,
    system: "OpenAI Responses API",
    requested_model: "fixture-requested-model",
    returned_model: "fixture-returned-model",
    response_id: `fixture-response-${index + 1}`,
    observed_at: "2026-08-01T00:00:00.000Z",
    raw_answer: answers[index],
    sources:
      index === 4
        ? []
        : [
            {
              url:
                index === 5
                  ? "https://meridian.example/services"
                  : `https://northstar.example/evidence-${index + 1}`,
              title: `Fictional source ${index + 1}`,
            },
          ],
    run_status: index === 4 ? "failed" : "completed",
    failure_reason: index === 4 ? "Synthetic provider timeout." : "",
    telemetry: [],
  }),
);

export function goldenReportContent(): ReportContent {
  return {
    conclusion:
      "Northstar appeared in two discovery answers. One recommended it, while one comparison preferred it for a specific need.",
    accuracy_status: "needs_correction",
    observed_competitors: [
      {
        name: "Meridian Partners",
        relationship: "client_preferred",
        evidence_prompt_ids: [goldenPrompts[5].prompt_id],
      },
    ],
    key_findings: [
      {
        title: "Discovery was limited",
        explanation:
          "Northstar appeared in two of five discovery attempts. One attempt failed.",
        evidence_prompt_ids: [
          goldenPrompts[2].prompt_id,
          goldenPrompts[3].prompt_id,
          goldenPrompts[4].prompt_id,
        ],
      },
      {
        title: "One public detail conflicts",
        explanation:
          "The registration date differed between the sources used for one answer.",
        evidence_prompt_ids: [goldenPrompts[8].prompt_id],
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action: "Clarify the registration date",
        why: "One answer found conflicting public dates.",
        basis: "The registration check found inconsistent dates.",
        owner: "business_owner",
        done_when: "The same date appears on every official page.",
        evidence_prompt_ids: [goldenPrompts[8].prompt_id],
        caveat: "This may not change future answers.",
      },
      {
        order: 2,
        timing: "do_next",
        action: "Explain the readiness review clearly",
        why: "Three discovery answers did not name Northstar.",
        basis: "The first two searches did not name a provider.",
        owner: "marketing",
        done_when: "One official page explains the service and ideal client.",
        evidence_prompt_ids: [
          goldenPrompts[0].prompt_id,
          goldenPrompts[1].prompt_id,
        ],
        caveat: "Clearer copy does not guarantee discovery.",
      },
      {
        order: 3,
        timing: "do_next",
        action: "Repeat the failed comparison test",
        why: "One comparison could not be completed.",
        basis: "The provider returned no usable answer.",
        owner: "marketing",
        done_when: "The same question completes and its answer is reviewed.",
        evidence_prompt_ids: [goldenPrompts[4].prompt_id],
        caveat: "A later answer may still vary.",
      },
    ],
    details: goldenPrompts.map((prompt, index) => ({
      prompt_id: prompt.prompt_id,
      ...expectedDimensionsByPrompt[prompt.prompt_id],
      finding:
        index === 4
          ? "This test could not be completed."
          : "The result follows the synthetic answer.",
      answer_excerpt: goldenObservations[index].raw_answer,
      evidence_note:
        index === 4
          ? "No answer was available to assess."
          : "The copied answer supports this result.",
      source_urls: goldenObservations[index].sources.map(
        (source) => source.url,
      ),
    })),
  };
}

export const expectedDimensionsByPrompt: Record<
  string,
  ExpectedResultDimensions
> = {
  [goldenPrompts[0].prompt_id]: {
    appearance: "absent",
    recommendation: "not_recommended",
    comparison: "not_observed",
    information: "not_assessed",
    run: "completed",
  },
  [goldenPrompts[1].prompt_id]: {
    appearance: "absent",
    recommendation: "not_recommended",
    comparison: "not_observed",
    information: "not_assessed",
    run: "completed",
  },
  [goldenPrompts[2].prompt_id]: {
    appearance: "mentioned",
    recommendation: "not_recommended",
    comparison: "not_observed",
    information: "not_assessed",
    run: "completed",
  },
  [goldenPrompts[3].prompt_id]: {
    appearance: "mentioned",
    recommendation: "recommended",
    comparison: "not_observed",
    information: "not_assessed",
    run: "completed",
  },
  [goldenPrompts[4].prompt_id]: {
    appearance: "not_assessed",
    recommendation: "not_assessed",
    comparison: "not_assessed",
    information: "not_assessed",
    run: "failed",
  },
  [goldenPrompts[5].prompt_id]: {
    appearance: "mentioned",
    recommendation: "recommended",
    comparison: "client_preferred",
    information: "not_assessed",
    run: "completed",
  },
  [goldenPrompts[6].prompt_id]: {
    appearance: "mentioned",
    recommendation: "not_recommended",
    comparison: "not_observed",
    information: "confirmed",
    run: "completed",
  },
  [goldenPrompts[7].prompt_id]: {
    appearance: "mentioned",
    recommendation: "not_recommended",
    comparison: "not_observed",
    information: "confirmed",
    run: "completed",
  },
  [goldenPrompts[8].prompt_id]: {
    appearance: "mentioned",
    recommendation: "not_recommended",
    comparison: "not_observed",
    information: "conflicting",
    run: "completed",
  },
  [goldenPrompts[9].prompt_id]: {
    appearance: "mentioned",
    recommendation: "not_recommended",
    comparison: "not_observed",
    information: "confirmed",
    run: "completed",
  },
};

export const expectedDenominatorLabels = {
  discovery:
    "Recommended in 1 of 5 discovery questions; 1 question could not be tested.",
  recognition: "Recognized in 5 of 5 brand questions.",
} as const;

export const goldenReviewCriteria = {
  section_sequence: GOLDEN_REPORT_SECTIONS,
  screen_and_print_share_one_report: true,
  technical_failures_are_context_not_headlines: true,
  private_inputs_are_fictional: true,
} as const;
