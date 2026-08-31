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
  return `Slot ${slot.order} (${slot.id}) has canonical R-01 category ${slot.category}, label "${slot.customerFacingLabel}", purpose "${slot.measurementPurpose}", and assessment class ${slot.reportAssessmentClass}. Until A3 changes the locked question pack, use the compatibility label "${slot.compatibilityCustomerFacingLabel}", purpose "${slot.compatibilityMeasurementPurpose}", and ${slot.compatibilityReportAssessmentClass} assessment path for the question actually being assessed.`;
}

/**
 * Report interpretation instructions generated from the canonical matrix and
 * its explicit pre-A3 compatibility projection. No legacy category names or
 * position-specific policy are maintained here.
 */
export const REPORT_ASSESSMENT_INSTRUCTIONS = [
  "The canonical measurement matrix is the only authority for report interpretation. Match each assessment to its prompt ID's matrix slot.",
  "The canonical R-01 fields describe the target semantics for the future A3 question pack. This run still uses the pre-A3 5/5 compatibility question pack.",
  "Until A3 changes the actual locked questions, use each slot's matrix-owned compatibility label, compatibility purpose, and compatibility assessment class for report assessment and customer-facing interpretation.",
  "For a FAILED observation, set recommendation, comparison, and information all to not_assessed.",
  ...REPORT_ASSESSMENT_CLASSES.map(assessmentClassInstruction),
  ...AUDIT_MEASUREMENT_MATRIX.map(slotInstruction),
  "When a completed answer does not support the slot's pre-A3 compatibility assessment path, use the corresponding not_assessed or not_observed value; never infer a result from a label, source URL, or mere name mention.",
] as const;

export type ReportPromptMeasurement = {
  prompt_id: string;
  canonical_category: CanonicalMeasurementSlot["category"];
  canonical_measurement_purpose: string;
  canonical_customer_facing_label: string;
  canonical_report_assessment_class: ReportAssessmentClass;
  /** Active fields retained for the current pre-A3 prompt contract. */
  measurement_purpose: string;
  customer_facing_label: string;
  report_assessment_class: ReportAssessmentClass;
  generator_slot_description: string;
  compatibility_customer_facing_label: string;
  compatibility_measurement_purpose: string;
  compatibility_report_assessment_class: ReportAssessmentClass;
  compatibility_category: CanonicalMeasurementSlot["legacyCategory"];
  compatibility_audited_brand_identity: CanonicalMeasurementSlot["legacyAuditedBrandIdentity"];
  compatibility_comparison_target_identity: CanonicalMeasurementSlot["legacyComparisonTargetIdentity"];
  compatibility_role: string;
  compatibility_allowed_context_fields: readonly string[];
};

/** Resolve one prompt's canonical and active compatibility report meaning. */
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
    canonical_measurement_purpose: slot.measurementPurpose,
    canonical_customer_facing_label: slot.customerFacingLabel,
    canonical_report_assessment_class: slot.reportAssessmentClass,
    measurement_purpose: slot.compatibilityMeasurementPurpose,
    customer_facing_label: slot.compatibilityCustomerFacingLabel,
    report_assessment_class: slot.compatibilityReportAssessmentClass,
    generator_slot_description: slot.compatibilityMeasurementPurpose,
    compatibility_customer_facing_label: slot.compatibilityCustomerFacingLabel,
    compatibility_measurement_purpose: slot.compatibilityMeasurementPurpose,
    compatibility_report_assessment_class:
      slot.compatibilityReportAssessmentClass,
    compatibility_category: slot.legacyCategory,
    compatibility_audited_brand_identity: slot.legacyAuditedBrandIdentity,
    compatibility_comparison_target_identity:
      slot.legacyComparisonTargetIdentity,
    compatibility_role: slot.legacyRole,
    compatibility_allowed_context_fields: [...slot.legacyAllowedContextFields],
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
