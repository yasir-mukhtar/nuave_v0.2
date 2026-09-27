/**
 * The single registry of founder-approved live provider transports and the
 * `system` label each one records on its evidence (DECISION_LOG 2026-08-21
 * OpenCode Go; 2026-09-20 direct OpenAI). Every gate — the observation
 * `system` enum in types.ts, the production observation-method invariant,
 * the provider adapters, the report's system naming — derives its label from
 * this module so a new approved transport is added once instead of being
 * re-typed into each gate. `tests/provider-label.guard.test.ts` fails when
 * an approved label reappears as a string literal in any other non-test
 * file under `src/`.
 */
export const OPENAI_SYSTEM = "OpenAI Responses API" as const;
export const OPENCODEGO_SYSTEM = "OpenCode Go Responses API" as const;

/** The approved live providers paired with their evidence `system` labels. */
export const APPROVED_LIVE_PROVIDERS = [
  { name: "openai", system: OPENAI_SYSTEM },
  { name: "opencodego", system: OPENCODEGO_SYSTEM },
] as const;

export type ApprovedLiveProvider = (typeof APPROVED_LIVE_PROVIDERS)[number];

/** The approved labels alone, as a readonly tuple `z.enum` can consume. */
export const APPROVED_LIVE_SYSTEMS = [
  OPENAI_SYSTEM,
  OPENCODEGO_SYSTEM,
] as const;
