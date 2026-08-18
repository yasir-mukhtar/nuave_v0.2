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
 * run started -> report ready (R-23).
 *
 * Version 4 adds `offerRevealed` (the Order Preview's price reveal survives
 * a refresh instead of silently collapsing back to the pre-reveal panel).
 * Stored v1, v2, and v3 shapes are all treated as stale: the loader clears
 * every prior versioned key it finds, not only the current one, so no
 * fixture-journey key accumulates in session storage across a version
 * upgrade.
 */
export const FIXTURE_JOURNEY_STORAGE_KEY = "nuave.fixtureJourney.v4";
export const FIXTURE_JOURNEY_STATE_VERSION = 4;

/** Prior versioned keys, purged whenever the journey loads or resets. */
export const LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS = [
  "nuave.fixtureJourney.v1",
  "nuave.fixtureJourney.v2",
  "nuave.fixtureJourney.v3",
] as const;

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
  /** The Order Preview's priced offer panel was revealed. */
  offerRevealed: boolean;
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
    offerRevealed: false,
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
  if (typeof record.offerRevealed !== "boolean") return null;
  if (typeof record.simulatedPaid !== "boolean") return null;
  if (typeof record.factsConfirmed !== "boolean") return null;
  if (typeof record.questionsApproved !== "boolean") return null;
  if (typeof record.runStarted !== "boolean") return null;
  if (typeof record.processingStage !== "number") return null;
  if (typeof record.processingCompleted !== "boolean") return null;
  if (typeof record.reportConstructionFailed !== "boolean") return null;

  const stage = record.stage as FixtureJourneyStage;
  const offerRevealed = record.offerRevealed;
  const simulatedPaid = record.simulatedPaid;
  const factsConfirmed = record.factsConfirmed;
  const questionsApproved = record.questionsApproved;
  const runStarted = record.runStarted;
  const processingStage = record.processingStage;
  const processingCompleted = record.processingCompleted;
  const reportConstructionFailed = record.reportConstructionFailed;

  // The offer must be revealed before it can be paid for.
  if (simulatedPaid && !offerRevealed) return null;
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
  // Converse gate checks (adversarial review Finding 1 / AC-03 / AC-08):
  // the stage rules above only require a gate once the stage reaches it, so
  // a later gate flag can otherwise be set while its predecessor is still
  // false, at an earlier stage the stage rules never inspect. Each gate
  // requires its own predecessor regardless of the current stage.
  if (factsConfirmed && !simulatedPaid) return null;
  if (questionsApproved && !factsConfirmed) return null;
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
    offerRevealed,
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

/**
 * Removes every prior versioned fixture-journey key, if present, and reports
 * whether any of them actually held a value. A tab that never carried a
 * legacy key purges nothing; that must not be conflated with a real reset.
 */
function purgeLegacyFixtureJourneyKeys(): boolean {
  let purgedAny = false;
  for (const key of LEGACY_FIXTURE_JOURNEY_STORAGE_KEYS) {
    if (window.sessionStorage.getItem(key) !== null) purgedAny = true;
    window.sessionStorage.removeItem(key);
  }
  return purgedAny;
}

export function loadFixtureJourneyState(): LoadedFixtureJourneyState {
  if (typeof window === "undefined") {
    return { state: freshFixtureJourneyState(), reset: false };
  }
  const purgedLegacyKey = purgeLegacyFixtureJourneyKeys();
  const raw = window.sessionStorage.getItem(FIXTURE_JOURNEY_STORAGE_KEY);
  if (raw === null) {
    return { state: freshFixtureJourneyState(), reset: purgedLegacyKey };
  }
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
 * Clears only the fixture journey's own session keys (current and every
 * prior version). Never touches live workflow state.
 */
export function clearFixtureJourneySession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FIXTURE_JOURNEY_STORAGE_KEY);
  purgeLegacyFixtureJourneyKeys();
}
