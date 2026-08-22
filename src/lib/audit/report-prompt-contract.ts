export const REPORT_ASSESSMENT_INSTRUCTIONS = [
  "For a FAILED observation, set recommendation, comparison, and information all to not_assessed.",
  "For a COMPLETED need_discovery, solution_discovery, or comparison observation, recommendation must be recommended or not_recommended: use recommended only for an explicit suggestion or endorsement of the audited brand; a factual answer, contact path, or mere mention is not a recommendation.",
  "For a COMPLETED validation or action observation, recommendation may be not_assessed when the question does not ask for a recommendation judgment; if it does assess a recommendation, use recommended or not_recommended by the same explicit-endorsement rule.",
  "For a COMPLETED observation, use comparison client_preferred, competitor_preferred, or compared_no_preference only when the answer actually compares the audited brand with another named business; otherwise use not_observed.",
  "For a COMPLETED observation, use information confirmed, incomplete, or conflicting only when the answer assesses a public fact about the audited brand; otherwise information must be not_assessed, even though the observation completed successfully.",
] as const;

export function reportAssessmentInstructions(): string[] {
  return [...REPORT_ASSESSMENT_INSTRUCTIONS];
}
