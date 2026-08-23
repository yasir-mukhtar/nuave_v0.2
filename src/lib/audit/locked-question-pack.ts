import type {
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "./types";
import {
  classifyIndonesianQuestion,
  minimizeIndonesianBrief,
} from "./questions-id";
import { selectVariancePrompts } from "./variance";

export type CanonicalLockedQuestionPack = {
  prompts: AuditPrompt[];
  by_id: ReadonlyMap<string, AuditPrompt>;
};

function normalizedPromptId(value: string) {
  return value.trim();
}

function canonicalPrompt(
  prompt: AuditPrompt,
  brief: BusinessBrief,
): AuditPrompt {
  const minimized = minimizeIndonesianBrief(brief);
  const question = prompt.question.trim();
  const classification = classifyIndonesianQuestion(question, minimized);
  return {
    ...prompt,
    prompt_id: normalizedPromptId(prompt.prompt_id),
    question,
    branded: classification === "menyebut_bisnis_anda",
  };
}

/**
 * Phase-3 canonical locked-pack boundary.
 *
 * The browser may carry duplicated convenience metadata, but the server owns
 * the final interpretation of the exact ten strings. Prompt identity must be
 * non-empty and unique before any provider work, and final branded/unbranded
 * classification is always derived from the exact locked question text.
 */
export function canonicalLockedQuestionPack(
  prompts: AuditPrompt[],
  brief: BusinessBrief,
): CanonicalLockedQuestionPack {
  if (prompts.length !== 10) {
    throw new Error(
      `A locked question pack requires exactly ten questions; received ${prompts.length}.`,
    );
  }

  const canonical = prompts.map((prompt) => canonicalPrompt(prompt, brief));
  const ids = canonical.map((prompt) => prompt.prompt_id);
  if (ids.some((id) => !id || id.length > 160)) {
    throw new Error("Every locked question requires a valid prompt_id.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("Locked prompt_ids must be unique before execution begins.");
  }

  return {
    prompts: canonical,
    by_id: new Map(canonical.map((prompt) => [prompt.prompt_id, prompt])),
  };
}

/** Exact evidence-to-question correspondence for resume/report boundaries. */
export function lockedObservationBindingErrors(input: {
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  brief: BusinessBrief;
}): string[] {
  const pack = canonicalLockedQuestionPack(input.prompts, input.brief);
  const errors: string[] = [];

  for (const observation of input.observations) {
    const locked = pack.by_id.get(normalizedPromptId(observation.prompt_id));
    if (!locked) {
      errors.push(`${observation.prompt_id}: not one of the locked questions.`);
      continue;
    }
    if (observation.question !== locked.question) {
      errors.push(
        `${observation.prompt_id}: observation question does not match the exact locked question.`,
      );
    }
    if (observation.category !== locked.category) {
      errors.push(
        `${observation.prompt_id}: observation category does not match the locked question.`,
      );
    }
    if (observation.branded !== locked.branded) {
      errors.push(
        `${observation.prompt_id}: observation classification does not match the final exact question.`,
      );
    }
  }

  return errors;
}

/** The only variance designation rule: derive from the canonical full pack. */
export function designatedVariancePrompts(
  prompts: AuditPrompt[],
  brief: BusinessBrief,
): AuditPrompt[] {
  return selectVariancePrompts(canonicalLockedQuestionPack(prompts, brief).prompts);
}

/**
 * Proves a requested variance subset is exactly the designated subset of the
 * full locked pack, including exact text and category identity. The request's
 * branded booleans are not trusted; they are recomputed from final text first.
 */
export function variancePromptBindingErrors(input: {
  locked_prompts: AuditPrompt[];
  requested_prompts: AuditPrompt[];
  brief: BusinessBrief;
}): string[] {
  const designated = designatedVariancePrompts(
    input.locked_prompts,
    input.brief,
  );
  const requested = input.requested_prompts.map((prompt) =>
    canonicalPrompt(prompt, input.brief),
  );
  const errors: string[] = [];

  if (requested.length !== designated.length) {
    errors.push(
      `Variance must re-ask exactly the ${designated.length} designated locked questions.`,
    );
    return errors;
  }

  for (let index = 0; index < designated.length; index += 1) {
    const expected = designated[index];
    const actual = requested[index];
    if (
      actual.prompt_id !== expected.prompt_id ||
      actual.question !== expected.question ||
      actual.category !== expected.category ||
      actual.branded !== expected.branded
    ) {
      errors.push(
        `Variance prompt ${index + 1} is not the exact designated locked question ${expected.prompt_id}.`,
      );
    }
  }
  return errors;
}
