/**
 * Shared run-state types for the public audit journey (Spec 010). Extracted
 * from the archived legacy AuditStages.tsx — the direct-ten run step and the
 * local audit stage both report an interrupted run with this shape.
 */
export type RunUnfinishedState = {
  completed: number;
  failedPromptIds: string[];
  message: string;
};
