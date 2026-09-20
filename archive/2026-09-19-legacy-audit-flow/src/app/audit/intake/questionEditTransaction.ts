import {
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
  type IndonesianValidationIssue,
} from "@/lib/audit/questions-id";
import type { BusinessBrief, PromptPack } from "@/lib/audit/types";

/**
 * The question-edit save transaction (recovery plan §6.5). Blocks on any
 * issue the edit newly introduces, whatever slot the validator attributes it
 * to: `composition` carries no slot and `distinctness` is attributed to the
 * later duplicate, so filtering to the edited slot would wrongly accept both.
 * Pre-existing issues never block a customer from saving.
 */
export function introducedQuestionEditIssues(input: {
  brief: BusinessBrief;
  prompts: PromptPack["prompts"];
  index: number;
  draft: string;
}): IndonesianValidationIssue[] {
  const questionsOf = (prompts: PromptPack["prompts"]) =>
    prompts.map((prompt) => prompt.question);
  const minimized = minimizeIndonesianBrief(input.brief);
  const key = (issue: IndonesianValidationIssue) =>
    `${issue.slot}|${issue.rule}|${issue.message}`;

  const before = new Set(
    validateCanonicalIndonesianQuestionPack(
      questionsOf(input.prompts),
      minimized,
    ).map(key),
  );
  const candidate = input.prompts.map((prompt, promptIndex) =>
    promptIndex === input.index ? { ...prompt, question: input.draft } : prompt,
  );
  return validateCanonicalIndonesianQuestionPack(
    questionsOf(candidate),
    minimized,
  ).filter((issue) => !before.has(key(issue)));
}
