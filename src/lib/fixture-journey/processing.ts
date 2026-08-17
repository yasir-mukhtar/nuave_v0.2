/**
 * Deterministic, bounded processing simulation for the fixture journey.
 *
 * The four customer-meaningful work stages mirror the canonical audit run in
 * `User Flow/05 - Audit Run.md` (Spec 002 R-10, AC-10). The simulation is
 * pure local state: it never contacts a provider, never animates fabricated
 * live per-question completion, and never implies that background work
 * continues after the tab is closed. The whole sequence is always labelled
 * simulated. The settled run-status labels (Spec 002 R-40) are the exact
 * set used wherever a per-question status is shown.
 */

export const fixtureProcessingStages = [
  { id: "preparing-questions", label: "Menyiapkan pertanyaan audit" },
  { id: "running-questions", label: "Menguji sepuluh pertanyaan" },
  { id: "checking-evidence", label: "Memeriksa bukti dan sumber" },
  { id: "preparing-report", label: "Menyiapkan laporan" },
  { id: "ready", label: "Laporan siap" },
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
 * near-immediate instead of decorative (AC-20).
 */
export const FIXTURE_PROCESSING_REDUCED_MOTION_MS = 200;

/**
 * The settled run-status labels (Spec 002 R-40). Shown verbatim wherever a
 * per-question status appears. During the simulated run the ten questions
 * stay labelled "Menunggu" because no live per-question completion is
 * fabricated (AC-10); the report rows show "Selesai" for the frozen 10/10
 * evidence.
 */
export const fixtureRunStatusLabels = {
  waiting: "Menunggu",
  testing: "Sedang diuji",
  retrying: "Mencoba kembali",
  done: "Selesai",
  notTested: "Belum berhasil diuji",
} as const;

export type FixtureRunStatusLabel =
  (typeof fixtureRunStatusLabels)[keyof typeof fixtureRunStatusLabels];

/** The five labels in the settled order, for legend display. */
export const fixtureRunStatusLabelOrder: FixtureRunStatusLabel[] = [
  fixtureRunStatusLabels.waiting,
  fixtureRunStatusLabels.testing,
  fixtureRunStatusLabels.retrying,
  fixtureRunStatusLabels.done,
  fixtureRunStatusLabels.notTested,
];

/**
 * True when `index` is a persisted work stage (0–3). The terminal "Laporan
 * siap" stage is never persisted mid-run; reaching it completes the run.
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
