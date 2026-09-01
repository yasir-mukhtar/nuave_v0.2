import {
  AUDIT_MEASUREMENT_MATRIX,
  REPORT_ASSESSMENT_CLASSES,
  measurementSlotForPromptId,
  type CanonicalMeasurementSlot,
  type ComparisonRelationMarkers,
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
  const relation =
    "comparisonRelationMarkers" in slot
      ? ` Relation markers are closed to ${JSON.stringify(slot.comparisonRelationMarkers)}.`
      : "";
  return `Slot ${slot.order} (${slot.id}) has category ${slot.category}, label "${slot.customerFacingLabel}", purpose "${slot.measurementPurpose}", and assessment class ${slot.reportAssessmentClass}. Generator description: ${slot.generatorSlotDescription}. Audited-brand identity is ${slot.auditedBrandIdentity}; comparison-target identity is ${slot.comparisonTargetIdentity}.${relation}`;
}

/**
 * Report interpretation instructions generated from the canonical matrix.
 * No legacy category names or position-specific policy are maintained here.
 */
export const REPORT_ASSESSMENT_INSTRUCTIONS = [
  "The canonical measurement matrix is the only authority for report interpretation. Match each assessment to its prompt ID's matrix slot.",
  "The final question pack uses the canonical R-01 slot category, identity policies, measurement purpose, customer-facing label, and report assessment class.",
  "For a FAILED observation, set recommendation, comparison, and information all to not_assessed.",
  ...REPORT_ASSESSMENT_CLASSES.map(assessmentClassInstruction),
  ...AUDIT_MEASUREMENT_MATRIX.map(slotInstruction),
  "When a completed answer does not support the slot's assessment path, use the corresponding not_assessed or not_observed value; never infer a result from a label, source URL, or mere name mention.",
] as const;

export type ReportPromptMeasurement = {
  prompt_id: string;
  category: CanonicalMeasurementSlot["category"];
  audited_brand_identity: CanonicalMeasurementSlot["auditedBrandIdentity"];
  comparison_target_identity: CanonicalMeasurementSlot["comparisonTargetIdentity"];
  measurement_purpose: CanonicalMeasurementSlot["measurementPurpose"];
  customer_facing_label: CanonicalMeasurementSlot["customerFacingLabel"];
  report_assessment_class: ReportAssessmentClass;
  generator_slot_description: CanonicalMeasurementSlot["generatorSlotDescription"];
  allowed_context_fields: readonly string[];
} & (
  | { comparison_relation_markers: ComparisonRelationMarkers }
  | { comparison_relation_markers?: never }
);

/** Resolve one prompt's canonical report meaning. */
export function reportPromptMeasurement(
  promptId: string,
): ReportPromptMeasurement {
  const slot = measurementSlotForPromptId(promptId);
  if (!slot) {
    throw new Error(
      `Prompt ${promptId} does not map to a canonical measurement slot.`,
    );
  }
  const base: ReportPromptMeasurement = {
    prompt_id: promptId,
    category: slot.category,
    audited_brand_identity: slot.auditedBrandIdentity,
    comparison_target_identity: slot.comparisonTargetIdentity,
    measurement_purpose: slot.measurementPurpose,
    customer_facing_label: slot.customerFacingLabel,
    report_assessment_class: slot.reportAssessmentClass,
    generator_slot_description: slot.generatorSlotDescription,
    allowed_context_fields: [...slot.allowedContextFields],
  };
  if ("comparisonRelationMarkers" in slot) {
    return {
      ...base,
      comparison_relation_markers: slot.comparisonRelationMarkers,
    };
  }
  return base;
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
