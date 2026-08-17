/**
 * Versioned fixture-journey state model.
 *
 * The fixture journey keeps its own small state in session storage, separate
 * from the live audit workflow keys (`nuave.audit.workflow.v3` and
 * `nuave.audit.session.v1`). The full canonical path is reachable: order
 * preview (`preview`), simulated payment (`payment`), fixture fact review
 * (`facts`), ten-question review (`questions`), the simulated audit run
 * (`run`), and the example report (`ready`).
 *
 * Version 3 realigns the journey to the Spec 002 canonical sequence
 * (01 Order Preview -> 02 simulated payment -> 03 Business Facts ->
 * 04 Questions -> 05 Audit Run -> 06 Report). Simulated payment now unlocks
 * the facts and question screens (R-21); only the explicit run action starts
 * the simulated run (R-22); and the persisted-state validator enforces
 * preview -> simulated-paid -> facts confirmed -> questions approved ->
 * run started -> report ready (R-23). Stored v1 and v2 shapes (Spec 001
 * order) are treated as stale and reset with an explanation.
 */
export const FIXTURE_JOURNEY_STORAGE_KEY = "nuave.fixtureJourney.v3";
export const FIXTURE_JOURNEY_STATE_VERSION = 3;

export const fixtureJourneyStages = [
  "preview",
  "payment",
  "facts",
  "questions",
  "run",
  "ready",
] as const;
export type FixtureJourneyStage = (typeof fixtureJourneyStages)[number];

export type FixtureJourneyState = {
  version: typeof FIXTURE_JOURNEY_STATE_VERSION;
  /** The screen the reviewer is on. */
  stage: FixtureJourneyStage;
  /** The simulated payment was completed. No charge, receipt, or order. */
  simulatedPaid: boolean;
  /** The reviewer explicitly confirmed the fixture facts. */
  factsConfirmed: boolean;
  /** The reviewer explicitly approved the ten-question pack. */
  questionsApproved: boolean;
  /**
   * The reviewer explicitly started the simulated run through the
   * "Mulai audit sekarang" confirmation. Refreshing or double-clicking can
   * never start it twice.
   */
  runStarted: boolean;
  /**
   * Index into the fixture processing stages (0–3 are the four work stages;
   * the terminal "Laporan siap" stage is never persisted mid-run).
   */
  processingStage: number;
  /** The simulated run finished and the example report is available. */
  processingCompleted: boolean;
  /** Fixture report construction failed; the terminal error replaces the report. */
  reportConstructionFailed: boolean;
};

export function freshFixtureJourneyState(): FixtureJourneyState {
  return {
    version: FIXTURE_JOURNEY_STATE_VERSION,
    stage: "preview",
    simulatedPaid: false,
    factsConfirmed: false,
    questionsApproved: false,
    runStarted: false,
    processingStage: 0,
    processingCompleted: false,
    reportConstructionFailed: false,
  };
}

/**
 * Strictly validates persisted state. Missing, stale, corrupt, or internally
 * inconsistent state is rejected as a whole; the journey never partially
 * trusts or migrates unvalidated state and never falls back to the live
 * engine.
 *
 * Gate order (R-23): preview -> simulated-paid -> facts confirmed ->
 * questions approved -> run started -> report ready. Any inconsistent or
 * missing gate invalidates the whole stored state.
 */
export function validateFixtureJourneyState(
  value: unknown,
): FixtureJourneyState | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== FIXTURE_JOURNEY_STATE_VERSION) return null;
  if (!fixtureJourneyStages.includes(record.stage as FixtureJourneyStage)) {
    return null;
  }
  if (typeof record.simulatedPaid !== "boolean") return null;
  if (typeof record.factsConfirmed !== "boolean") return null;
  if (typeof record.questionsApproved !== "boolean") return null;
  if (typeof record.runStarted !== "boolean") return null;
  if (typeof record.processingStage !== "number") return null;
  if (typeof record.processingCompleted !== "boolean") return null;
  if (typeof record.reportConstructionFailed !== "boolean") return null;

  const stage = record.stage as FixtureJourneyStage;
  const simulatedPaid = record.simulatedPaid;
  const factsConfirmed = record.factsConfirmed;
  const questionsApproved = record.questionsApproved;
  const runStarted = record.runStarted;
  const processingStage = record.processingStage;
  const processingCompleted = record.processingCompleted;
  const reportConstructionFailed = record.reportConstructionFailed;

  // Simulated payment gates facts, questions, the run, and the report.
  const paidRequiredStages: readonly FixtureJourneyStage[] = [
    "facts",
    "questions",
    "run",
    "ready",
  ];
  if (paidRequiredStages.includes(stage) && !simulatedPaid) return null;
  // Confirmed facts gate the question review and everything after it.
  const factsRequiredStages: readonly FixtureJourneyStage[] = [
    "questions",
    "run",
    "ready",
  ];
  if (factsRequiredStages.includes(stage) && !factsConfirmed) return null;
  // An approved question pack is required before the run can exist.
  const approvedRequiredStages: readonly FixtureJourneyStage[] = [
    "run",
    "ready",
  ];
  if (approvedRequiredStages.includes(stage) && !questionsApproved) {
    return null;
  }
  // Only the four bounded work stages may be persisted mid-run.
  if (
    !Number.isInteger(processingStage) ||
    processingStage < 0 ||
    processingStage > 3
  ) {
    return null;
  }
  // A started run implies the explicit run action and a completed simulated
  // payment; the run stages may appear only while running or at the terminal
  // ready destination.
  if (processingStage > 0 && !runStarted) return null;
  if (processingStage > 0 && !simulatedPaid) return null;
  if (processingStage > 0 && stage !== "run" && stage !== "ready") {
    return null;
  }
  // The explicit run action cannot appear before the approved pack or away
  // from the run and ready destinations.
  if (runStarted && !questionsApproved) return null;
  if (runStarted && stage !== "run" && stage !== "ready") return null;
  // The simulated run cannot be finished before the run started, and
  // "ready" is the completed-run destination: completion always lands there.
  if (processingCompleted && !runStarted) return null;
  if (stage === "ready" && !processingCompleted) return null;
  if (processingCompleted && stage !== "ready") return null;
  // The fixture-construction failure is a terminal error at the report step.
  if (reportConstructionFailed && stage !== "ready") return null;

  return {
    version: FIXTURE_JOURNEY_STATE_VERSION,
    stage,
    simulatedPaid,
    factsConfirmed,
    questionsApproved,
    runStarted,
    processingStage,
    processingCompleted,
    reportConstructionFailed,
  };
}

export type LoadedFixtureJourneyState = {
  state: FixtureJourneyState;
  /** True when stored state existed but was invalid and was cleared. */
  reset: boolean;
};

export function loadFixtureJourneyState(): LoadedFixtureJourneyState {
  if (typeof window === "undefined") {
    return { state: freshFixtureJourneyState(), reset: false };
  }
  const raw = window.sessionStorage.getItem(FIXTURE_JOURNEY_STORAGE_KEY);
  if (raw === null) return { state: freshFixtureJourneyState(), reset: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    window.sessionStorage.removeItem(FIXTURE_JOURNEY_STORAGE_KEY);
    return { state: freshFixtureJourneyState(), reset: true };
  }
  const valid = validateFixtureJourneyState(parsed);
  if (valid) return { state: valid, reset: false };
  window.sessionStorage.removeItem(FIXTURE_JOURNEY_STORAGE_KEY);
  return { state: freshFixtureJourneyState(), reset: true };
}

export function saveFixtureJourneyState(state: FixtureJourneyState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      FIXTURE_JOURNEY_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Continue in memory if session storage is unavailable or full.
  }
}

/**
 * Clears only the fixture journey's own session key. Never touches live
 * workflow state.
 */
export function clearFixtureJourneySession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FIXTURE_JOURNEY_STORAGE_KEY);
}
