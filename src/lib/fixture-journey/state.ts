/**
 * Versioned fixture-journey state model.
 *
 * The fixture journey keeps its own small state in session storage, separate
 * from the live audit workflow keys (`nuave.audit.workflow.v3` and
 * `nuave.audit.session.v1`). The full phase-1 path is reachable: example
 * intake (`draft`), fixture fact review (`facts`), ten-question review
 * (`questions`), scope summary (`summary`), simulated checkout (`paid`),
 * simulated processing (`processing`), and the example report (`ready`).
 *
 * Version 2 adds the summary, simulated-paid, processing, and ready states.
 * Stored v1 shapes are treated as stale and reset with an explanation.
 */
export const FIXTURE_JOURNEY_STORAGE_KEY = "nuave.fixtureJourney.v2";
export const FIXTURE_JOURNEY_STATE_VERSION = 2;

export const fixtureJourneyStages = [
  "draft",
  "facts",
  "questions",
  "summary",
  "paid",
  "processing",
  "ready",
] as const;
export type FixtureJourneyStage = (typeof fixtureJourneyStages)[number];

export type FixtureJourneyState = {
  version: typeof FIXTURE_JOURNEY_STATE_VERSION;
  /** The screen the reviewer is on. */
  stage: FixtureJourneyStage;
  /** The reviewer explicitly confirmed the fixture facts. */
  factsConfirmed: boolean;
  /** The reviewer explicitly approved the ten-question pack. */
  questionsApproved: boolean;
  /** The simulated checkout was completed. No charge, receipt, or order. */
  checkoutComplete: boolean;
  /**
   * Index into the fixture processing stages (0–3 are the four work stages;
   * the terminal "report ready" stage is never persisted mid-run).
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
    stage: "draft",
    factsConfirmed: false,
    questionsApproved: false,
    checkoutComplete: false,
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
  if (typeof record.factsConfirmed !== "boolean") return null;
  if (typeof record.questionsApproved !== "boolean") return null;
  if (typeof record.checkoutComplete !== "boolean") return null;
  if (typeof record.processingStage !== "number") return null;
  if (typeof record.processingCompleted !== "boolean") return null;
  if (typeof record.reportConstructionFailed !== "boolean") return null;

  const stage = record.stage as FixtureJourneyStage;
  const factsConfirmed = record.factsConfirmed;
  const questionsApproved = record.questionsApproved;
  const checkoutComplete = record.checkoutComplete;
  const processingStage = record.processingStage;
  const processingCompleted = record.processingCompleted;
  const reportConstructionFailed = record.reportConstructionFailed;

  // A question approval without confirmed facts is impossible.
  if (questionsApproved && !factsConfirmed) return null;
  // The simulated checkout requires the confirmed facts and the approved pack.
  if (checkoutComplete && !factsConfirmed) return null;
  if (checkoutComplete && !questionsApproved) return null;
  // Stages from question review onward require confirmed facts.
  const factsRequiredStages: readonly FixtureJourneyStage[] = [
    "questions",
    "summary",
    "paid",
    "processing",
    "ready",
  ];
  if (factsRequiredStages.includes(stage) && !factsConfirmed) return null;
  // The summary and everything after it require an approved question pack.
  const approvedRequiredStages: readonly FixtureJourneyStage[] = [
    "summary",
    "paid",
    "processing",
    "ready",
  ];
  if (approvedRequiredStages.includes(stage) && !questionsApproved) return null;
  // Simulated payment gates processing and the report.
  if (["paid", "processing", "ready"].includes(stage) && !checkoutComplete) {
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
  // A started run implies completed simulated checkout, and the run stages
  // may appear only while processing or at the terminal ready destination.
  if (processingStage > 0 && !checkoutComplete) return null;
  if (processingStage > 0 && stage !== "processing" && stage !== "ready") {
    return null;
  }
  // The simulated run cannot be finished before simulated payment.
  if (processingCompleted && !checkoutComplete) return null;
  // "Ready" is the completed-run destination; completion always lands there.
  if (stage === "ready" && !processingCompleted) return null;
  if (processingCompleted && stage !== "ready") return null;
  // The fixture-construction failure is a terminal error at the report step.
  if (reportConstructionFailed && stage !== "ready") return null;

  return {
    version: FIXTURE_JOURNEY_STATE_VERSION,
    stage,
    factsConfirmed,
    questionsApproved,
    checkoutComplete,
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
