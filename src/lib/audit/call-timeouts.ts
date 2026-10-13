/**
 * Explicit timeouts for every paid provider call (spec 016 R-18). The runner's
 * time budget and claim lengths are built from these, so a call that outlives
 * its timeout can never outlive its claim.
 */
export const OBSERVATION_CALL_TIMEOUT_MS = 90_000;
export const EXTRACT_CALL_TIMEOUT_MS = 120_000;
export const REPORT_CALL_TIMEOUT_MS = 120_000;
