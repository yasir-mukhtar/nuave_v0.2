/**
 * RETIRED HISTORICAL TOOL — Spec 003.
 *
 * This file used to execute the founder-approved Sozo private script run from
 * 2026-08-17. That historical run used the then-current direct OpenAI transport
 * for GPT-5.6 Luna and wrote private evidence under
 * `.secrets/sozo-live-run-2026-08-17/`.
 *
 * Do not restore live execution here and do not rewrite those historical
 * artifacts to look like they used the later production transport.
 *
 * The protected production transport changed on 2026-08-21 to OpenCode Go:
 *   NUAVE_PROVIDER=opencodego
 *   NUAVE_QUESTION_PROVIDER=opencodego
 *   OPENCODEGO_API_KEY=<server secret>
 *   OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
 *
 * Current Spec 003 verification must be driven through the real `/audit`
 * product path. Historical script runs do not substitute for the required
 * founder-supervised product-path run and quality-gate review.
 *
 * This retired test intentionally imports no audit provider, performs no
 * filesystem writes, and makes no provider/network call.
 */
import { describe, it } from "vitest";

describe("RETIRED — Sozo 2026-08-17 historical live-run script", () => {
  it.skip(
    "historical direct-OpenAI runner; current Spec 003 verification uses /audit with OpenCode Go",
    () => undefined,
  );
});
