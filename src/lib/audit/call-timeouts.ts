/**
 * Explicit timeouts for every paid provider call (spec 016 R-18). The runner's
 * time budget and claim lengths are built from these, so a call that outlives
 * its timeout can never outlive its claim.
 */
export const OBSERVATION_CALL_TIMEOUT_MS = 90_000;
export const EXTRACT_CALL_TIMEOUT_MS = 120_000;
export const REPORT_CALL_TIMEOUT_MS = 120_000;
/** Spec 021 PR 6b: one Claude report call, its token count and its whole
 * stream together (one abort signal). The reading test's slowest Opus call
 * took 107 seconds; a whole 24,000-token allowance takes about 210. */
export const CLAUDE_REPORT_CALL_MS = 240_000;
