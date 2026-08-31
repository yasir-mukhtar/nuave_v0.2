import {
  AUDIT_MEASUREMENT_MATRIX,
  REPORT_ASSESSMENT_CLASSES,
  measurementSlotForPromptId,
  type CanonicalMeasurementSlot,
  type ReportAssessmentClass,
} from "./measurement-matrix";
import type { AuditPrompt } from "./types";

function assessmentClassInstruction(
  assessmentClass: ReportAssessmentClass,
): string {
  switch (assessmentClass) {
    case "recommendation":
      return "The recommendation assessment path uses recommended or not_recommended only for an explicit suggestion or endorsement of the audited business; a factual answer, contact path, or mere mention is not a recommendation.";
    case "comparison":
      return "The comparison assessment path uses client_preferred, competitor_preferred, or compared_no_preference only when the answer actually compares the parties required by that slot; otherwise use not_observed.";
    case "information":
      return "The information assessment path uses confirmed, incomplete, or conflicting only when the answer assesses a public fact about the audited business; otherwise use not_assessed.";
    case "none":
      return "The none assessment path does not ask for a recommendation, comparison, or information judgment; leave those dimensions not_assessed unless the retained answer explicitly supports a separate applicable path.";
  }
}

function slotInstruction(slot: CanonicalMeasurementSlot): string {
  return `Slot ${slot.order} (${slot.id}, canonical category ${slot.category}) is customer-facing "${slot.customerFacingLabel}", measures "${slot.measurementPurpose}", and uses the ${slot.reportAssessmentClass} assessment path.`;
}

/**
 * Report interpretation instructions generated from the canonical matrix. No
 * legacy category names or position-specific policy are maintained here.
 */
export const REPORT_ASSESSMENT_INSTRUCTIONS = [
  "The canonical measurement matrix is the only authority for report interpretation. Match each assessment to its prompt ID's matrix slot.",
  "For a FAILED observation, set recommendation, comparison, and information all to not_assessed.",
  ...REPORT_ASSESSMENT_CLASSES.map(assessmentClassInstruction),
  ...AUDIT_MEASUREMENT_MATRIX.map(slotInstruction),
  "When a completed answer does not support the slot's matrix-owned assessment path, use the corresponding not_assessed or not_observed value; never infer a result from a label, source URL, or mere name mention.",
] as const;

export type ReportPromptMeasurement = {
  prompt_id: string;
  canonical_category: CanonicalMeasurementSlot["category"];
  measurement_purpose: string;
  customer_facing_label: string;
  report_assessment_class: ReportAssessmentClass;
};

/** Resolve one prompt's report meaning without consulting legacy metadata. */
export function reportPromptMeasurement(
  promptId: string,
): ReportPromptMeasurement {
  const slot = measurementSlotForPromptId(promptId);
  if (!slot) {
    throw new Error(
      `Prompt ${promptId} does not map to a canonical measurement slot.`,
    );
  }
  return {
    prompt_id: promptId,
    canonical_category: slot.category,
    measurement_purpose: slot.measurementPurpose,
    customer_facing_label: slot.customerFacingLabel,
    report_assessment_class: slot.reportAssessmentClass,
  };
}

/** Build the matrix-owned report context sent alongside provider prompts. */
export function reportPromptMeasurements(
  prompts: readonly Pick<AuditPrompt, "prompt_id">[],
): ReportPromptMeasurement[] {
  return prompts.map((prompt) => reportPromptMeasurement(prompt.prompt_id));
}

export function reportAssessmentInstructions(): string[] {
  return [...REPORT_ASSESSMENT_INSTRUCTIONS];
}
