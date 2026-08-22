/**
 * RETIRED HISTORICAL TOOL — Spec 003.
 *
 * This file used to rerun only report synthesis against the saved Sozo
 * observations from the 2026-08-17 private script run. Those observations are
 * historical direct-OpenAI evidence and must stay represented that way.
 *
 * The protected production transport changed on 2026-08-21 to OpenCode Go:
 *   NUAVE_PROVIDER=opencodego
 *   NUAVE_QUESTION_PROVIDER=opencodego
 *   OPENCODEGO_API_KEY=<server secret>
 *   OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
 *
 * Updating this rerun in place would create a provenance-mixed artifact:
 * historical August 17 direct-OpenAI observations combined with a later report
 * synthesis transport. It could then be mistaken for current Spec 003
 * production evidence. For that reason the rerun is deliberately frozen.
 *
 * Current Spec 003 verification must be driven through the real `/audit`
 * product path. Historical script runs do not substitute for the required
 * founder-supervised product-path run and quality-gate review.
 *
 * This file intentionally imports no audit provider, does not read or rewrite
 * the historical `.secrets/sozo-live-run-2026-08-17/` artifacts, and makes no
 * provider/network call.
 */

throw new Error(
  "RETIRED: scripts/sozo/report-rerun.ts belongs to the 2026-08-17 direct-OpenAI historical run. Use the current /audit product path with the protected OpenCode Go transport for Spec 003 verification.",
);
