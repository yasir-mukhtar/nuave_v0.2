/**
 * Deterministic, bounded processing simulation for the fixture journey.
 *
 * The five customer-meaningful stages mirror the target journey in
 * `docs/END_TO_END_PLAN.md` (touchpoint 6). The simulation is pure local
 * state: it never contacts a provider, never animates fabricated live
 * per-question completion, and never implies that background work continues
 * after the tab is closed. The whole sequence is always labelled simulated.
 */

export const fixtureProcessingStages = [
  { id: "preparing-brief", label: "Preparing the verified example brief" },
  { id: "running-questions", label: "Running the ten example questions" },
  { id: "checking-evidence", label: "Checking evidence and sources" },
  { id: "preparing-report", label: "Preparing the example report" },
  { id: "ready", label: "Report ready" },
] as const;

export type FixtureProcessingStageId =
  (typeof fixtureProcessingStages)[number]["id"];

/** The four work stages the reviewer watches; the fifth is the terminal state. */
export const FIXTURE_PROCESSING_WORK_STAGE_COUNT = 4;

/** Per-stage duration for the normal (motion-allowed) path. */
export const FIXTURE_PROCESSING_STAGE_MS = 1_400;

/**
 * Per-stage duration when the reviewer prefers reduced motion: the same
 * stages and state text are shown, but the staged progression is
 * near-immediate instead of decorative.
 */
export const FIXTURE_PROCESSING_REDUCED_MOTION_MS = 200;

/**
 * True when `index` is a persisted work stage (0–3). The terminal "Report
 * ready" stage is never persisted mid-run; reaching it completes the run.
 */
export function isWorkStage(index: number): boolean {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < FIXTURE_PROCESSING_WORK_STAGE_COUNT
  );
}

export function processingStageDurationMs(reducedMotion: boolean): number {
  return reducedMotion
    ? FIXTURE_PROCESSING_REDUCED_MOTION_MS
    : FIXTURE_PROCESSING_STAGE_MS;
}
