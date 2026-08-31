import type { AuditObservation, AuditPrompt, BusinessBrief } from "./types";
import {
  classifyIndonesianQuestion,
  minimizeIndonesianBrief,
} from "./questions-id";
import {
  isHistoricalPromptPack,
  measurementSlotForOrder,
  measurementSlotForPromptId,
  type HistoricalPromptPackId,
} from "./measurement-matrix";
import { selectVariancePrompts } from "./variance";

export type CanonicalLockedQuestionPack = {
  prompts: AuditPrompt[];
  by_id: ReadonlyMap<string, AuditPrompt>;
};

function normalizedPromptId(value: string) {
  return value.trim();
}

function lockedPromptSlotIndex(value: string): number | null {
  const promptId = normalizedPromptId(value);
  const slot = measurementSlotForPromptId(promptId);
  return slot ? slot.order - 1 : null;
}

function hasCanonicalSlotMetadata(
  prompt: AuditPrompt,
  slotIndex: number,
): boolean {
  const slot = measurementSlotForOrder(slotIndex + 1);
  return (
    slot !== undefined &&
    prompt.category === slot.category &&
    prompt.role === slot.generatorSlotDescription
  );
}

function canonicalPrompt(
  prompt: AuditPrompt,
  brief: BusinessBrief,
  slotIndex: number,
  historicalPack: boolean,
): AuditPrompt {
  const slot = measurementSlotForOrder(slotIndex + 1);
  if (!slot) {
    throw new Error(`Locked question slot ${slotIndex + 1} is not canonical.`);
  }
  const minimized = minimizeIndonesianBrief(brief);
  const question = prompt.question.trim();
  const classification = classifyIndonesianQuestion(question, minimized);

  return {
    ...prompt,
    prompt_id: normalizedPromptId(prompt.prompt_id),
    // Frozen pre-A3 records remain readable through this explicit historical
    // adapter. Current canonical prompts always take matrix-owned metadata.
    category: historicalPack ? slot.legacyCategory : slot.category,
    role: historicalPack ? prompt.role : slot.generatorSlotDescription,
    rationale: historicalPack ? prompt.rationale : slot.measurementPurpose,
    inputs_used: historicalPack
      ? prompt.inputs_used
      : [...slot.allowedContextFields],
    question,
    branded: classification === "menyebut_bisnis_anda",
  };
}

/**
 * Phase-3 canonical locked-pack boundary.
 *
 * The browser may carry duplicated convenience metadata, but the server owns
 * the final interpretation of the exact ten strings. Prompt identity must be
 * non-empty, unique, and remain in canonical slot order before any provider
 * work. Active category and role metadata must already match the code-owned
 * slot; the explicit historical adapter is the only exception. Final
 * branded/unbranded classification is derived from the exact locked question
 * text.
 */
export function canonicalLockedQuestionPack(
  prompts: AuditPrompt[],
  brief: BusinessBrief,
  options: { historicalFixtureId?: HistoricalPromptPackId } = {},
): CanonicalLockedQuestionPack {
  if (prompts.length !== 10) {
    throw new Error(
      `A locked question pack requires exactly ten questions; received ${prompts.length}.`,
    );
  }

  const ids = prompts.map((prompt) => normalizedPromptId(prompt.prompt_id));
  if (ids.some((id) => !id || id.length > 160)) {
    throw new Error("Every locked question requires a valid prompt_id.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(
      "Locked prompt_ids must be unique before execution begins.",
    );
  }

  const slotIndexes = ids.map(lockedPromptSlotIndex);
  if (slotIndexes.some((slotIndex) => slotIndex === null)) {
    throw new Error(
      "Every locked question must use a canonical slot prompt_id.",
    );
  }
  if (slotIndexes.some((slotIndex, index) => slotIndex !== index)) {
    throw new Error("Locked questions must remain in canonical slot order.");
  }

  const historicalPack = isHistoricalPromptPack(
    prompts,
    options.historicalFixtureId,
  );
  if (!historicalPack) {
    const invalidMetadataIndex = prompts.findIndex(
      (prompt, index) => !hasCanonicalSlotMetadata(prompt, index),
    );
    if (invalidMetadataIndex !== -1) {
      throw new Error(
        `Locked question ${invalidMetadataIndex + 1} must carry canonical slot metadata; historical compatibility requires an explicit known historical fixture ID.`,
      );
    }
  }
  const canonical = prompts.map((prompt, index) =>
    canonicalPrompt(prompt, brief, index, historicalPack),
  );

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
  historicalFixtureId?: HistoricalPromptPackId;
}): string[] {
  const pack = canonicalLockedQuestionPack(input.prompts, input.brief, {
    historicalFixtureId: input.historicalFixtureId,
  });
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

/**
 * Client/server-safe proof that a set is the complete locked 10/10 run.
 * Protected provider-method evidence is intentionally checked separately by
 * the server with `productionObservationMethodErrors`; this helper contains no
 * provider configuration so the browser can use it before a restored variance
 * request without importing server-only environment code.
 */
export function completedLockedObservationSetErrors(input: {
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  brief: BusinessBrief;
  historicalFixtureId?: HistoricalPromptPackId;
}): string[] {
  const pack = canonicalLockedQuestionPack(input.prompts, input.brief, {
    historicalFixtureId: input.historicalFixtureId,
  });
  const errors = lockedObservationBindingErrors(input);
  const observationIds = input.observations.map((observation) =>
    normalizedPromptId(observation.prompt_id),
  );

  if (input.observations.length !== 10) {
    errors.push(
      `The completed locked observation proof requires exactly ten observations; received ${input.observations.length}.`,
    );
  }

  const duplicateIds = observationIds.filter(
    (id, index) => observationIds.indexOf(id) !== index,
  );
  if (duplicateIds.length) {
    errors.push(
      `Completed observation prompt_ids must be unique: ${[
        ...new Set(duplicateIds),
      ].join(", ")}.`,
    );
  }

  const missingIds = pack.prompts
    .map((prompt) => prompt.prompt_id)
    .filter((id) => !observationIds.includes(id));
  if (missingIds.length) {
    errors.push(
      `Completed observations are missing locked questions: ${missingIds.join(", ")}.`,
    );
  }

  if (
    input.observations.some(
      (observation) => observation.run_status !== "completed",
    )
  ) {
    errors.push(
      "Every observation in the completed locked proof must be completed.",
    );
  }

  return errors;
}

/** The only variance designation rule: derive from the canonical full pack. */
export function designatedVariancePrompts(
  prompts: AuditPrompt[],
  brief: BusinessBrief,
  historicalFixtureId?: HistoricalPromptPackId,
): AuditPrompt[] {
  return selectVariancePrompts(
    canonicalLockedQuestionPack(prompts, brief, { historicalFixtureId })
      .prompts,
  );
}

/**
 * Proves a requested variance subset is exactly the designated subset of the
 * full locked pack, including exact text and category identity. Active
 * category/role metadata must match the canonical slot; branded metadata is
 * re-derived from final text before comparison.
 */
export function variancePromptBindingErrors(input: {
  locked_prompts: AuditPrompt[];
  requested_prompts: AuditPrompt[];
  brief: BusinessBrief;
  historicalFixtureId?: HistoricalPromptPackId;
}): string[] {
  const designated = designatedVariancePrompts(
    input.locked_prompts,
    input.brief,
    input.historicalFixtureId,
  );
  const errors: string[] = [];

  if (input.requested_prompts.length !== designated.length) {
    errors.push(
      `Variance must re-ask exactly the ${designated.length} designated locked questions.`,
    );
    return errors;
  }

  const historicalPack = isHistoricalPromptPack(
    input.locked_prompts,
    input.historicalFixtureId,
  );
  for (let index = 0; index < designated.length; index += 1) {
    const expected = designated[index];
    const requested = input.requested_prompts[index];
    const slotIndex = lockedPromptSlotIndex(requested.prompt_id);
    if (slotIndex === null) {
      errors.push(
        `Variance prompt ${index + 1} is not the exact designated locked question ${expected.prompt_id}.`,
      );
      continue;
    }
    if (!historicalPack && !hasCanonicalSlotMetadata(requested, slotIndex)) {
      errors.push(
        `Variance prompt ${index + 1} carries non-canonical slot metadata; historical compatibility requires an explicit known fixture ID.`,
      );
      continue;
    }
    const actual = canonicalPrompt(
      requested,
      input.brief,
      slotIndex,
      historicalPack,
    );
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
