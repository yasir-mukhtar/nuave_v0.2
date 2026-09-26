import {
  AUDIT_MEASUREMENT_MATRIX,
  REPORT_ASSESSMENT_CLASSES,
  measurementSlotForPromptId,
  type CanonicalMeasurementSlot,
  type ComparisonRelationMarkers,
  type ReportAssessmentClass,
} from "./measurement-matrix";
import type { AuditPrompt } from "./types";
import type { AuditQuestionMethod } from "./locked-question-pack";

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

/**
 * Spec 009 direct-ten report interpretation. This method has no matrix: ten
 * unnamed questions are judged from their own retained answers. All three
 * dimensions stay eligible per answer; code-side normalization still enforces
 * the shared appearance gate (a dimension cannot be assessed when the audited
 * business did not visibly appear).
 */
export const DIRECT_TEN_REPORT_ASSESSMENT_INSTRUCTIONS = [
  "The question pack uses the direct-ten method: ten unnamed questions asked independently. There is no measurement matrix, slot, category, role, or fixed purpose for these prompt IDs — judge each answer on its own terms.",
  "For a FAILED observation, set recommendation, comparison, and information all to not_assessed.",
  "The recommendation path uses recommended or not_recommended only for an explicit suggestion or endorsement of the audited business; a factual answer, contact path, or mere mention is not a recommendation.",
  "The comparison path uses client_preferred, competitor_preferred, or compared_no_preference only when the answer actually compares the audited business with an alternative; otherwise use not_observed.",
  "The information path uses confirmed, incomplete, or conflicting only when the answer assesses a public fact about the audited business; otherwise use not_assessed.",
  "When a completed answer does not support a dimension, use the corresponding not_assessed or not_observed value; never infer a result from a label, source URL, or mere name mention.",
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

export function reportAssessmentInstructions(
  questionMethod?: AuditQuestionMethod,
): string[] {
  return questionMethod === "direct-ten"
    ? [...DIRECT_TEN_REPORT_ASSESSMENT_INSTRUCTIONS]
    : [...REPORT_ASSESSMENT_INSTRUCTIONS];
}

/**
 * Spec 012 R-10/R-11 (B1) and R-13 (B2): direct-ten findings and actions. The
 * count is a ceiling, never a quota — and B2 permits an empty priorities list
 * when the answers support no corrective action. Code owns the later
 * non-corrective candidate insertion; no template, candidate or flag wording
 * is ever described to the model here.
 */
export const DIRECT_TEN_REPORT_CONTENT_INSTRUCTIONS = [
  "Return between one and ten key findings and between zero and ten priorities, only as many as the answers support. Three supported, distinct items stay three; never pad with generic advice, repeated findings, or a restated action. When no observed gap in the answers supports a corrective action, return an empty priorities list — never invent a gap, a defect, or an action to fill it.",
  "Each key finding explains a material observation from the answers and what it may mean for the business, qualified by its limits. Cite every prompt ID that supports it.",
  "Each priority states one concrete action with why, basis (the specific answers it relies on), a suggested owner, done_when (an observable completion check), caveat, and the evidence_prompt_ids it actually uses. Number priorities in order from 1.",
  "Non-appearance alone does not show a missing page, a website defect, or a cause. Do not diagnose one from absence.",
  "Treat customer-confirmed context as the customer's selection, not independently verified fact. Do not overwrite it; propose a factual correction only when the answers show a specific conflict with it.",
  "Keep material late caveats, contradictory evidence, and unassessed dimensions visible in the interpretation; do not drop a qualification that appears later in an answer.",
] as const;

/** Content guidance for the report method; historical methods keep theirs. */
export function reportContentInstructions(
  questionMethod?: AuditQuestionMethod,
): string[] {
  return questionMethod === "direct-ten"
    ? [...DIRECT_TEN_REPORT_CONTENT_INSTRUCTIONS]
    : [];
}

const HISTORICAL_PRIORITY_COUNT = "Return no more than five priorities.";

/**
 * Count instruction for the report method. Historical wording is unchanged.
 * Direct-ten replaces only the count sentence with the widened R-10 ceiling;
 * the adapter's existing observed-gap clause stays verbatim (B1 keeps it).
 */
export function reportPriorityCountInstruction(
  questionMethod: AuditQuestionMethod | undefined,
  historical: string,
): string {
  if (questionMethod !== "direct-ten") return historical;
  if (!historical.includes(HISTORICAL_PRIORITY_COUNT))
    throw new Error("Report count instruction no longer matches its template.");
  return historical.replace(
    HISTORICAL_PRIORITY_COUNT,
    "Return no more than ten key findings and no more than ten priorities.",
  );
}
