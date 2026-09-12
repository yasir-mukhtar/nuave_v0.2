/**
 * Privacy-safe funnel events for the new intake journey (plan Phase 4, data part).
 *
 * Seven funnel events (E1–E7) per `docs/drafts/INTAKE_FIXTURES_AND_BUDGETS.md` §2.
 * Payload allowlist: every event carries only the event name, a random
 * single-tab session id, the screen id (canonical order from `screens.ts`),
 * a timestamp, per-screen active ms, and counters/booleans (correction
 * count, retry count, completed flag).
 *
 * Never carried: answer text, field values, source content/URLs, brand
 * names, contact or payment data. `emitIntakeEvent` enforces this with a
 * strict allowlist — any key outside the allowed set throws, so answer
 * text, brand content, or source content can never slip into a payload.
 * No network calls are made here; the emitter constructs and returns the
 * validated event object for the caller to transport.
 */

import { isIntakeScreenId, type IntakeScreenId } from "./screens";

export const INTAKE_FUNNEL_EVENTS = [
  "intake_started",
  "intake_screen_viewed",
  "intake_continued",
  "intake_validation_failed",
  "intake_answer_corrected",
  "intake_resumed",
  "intake_completed",
] as const;

export type IntakeFunnelEventName = (typeof INTAKE_FUNNEL_EVENTS)[number];

/** Trigger point per event (fixtures/budgets doc §2, E1–E7). */
export const FUNNEL_EVENT_TRIGGERS: Record<IntakeFunnelEventName, string> = {
  intake_started:
    "First intake screen shown (s-crawl, or s-scope for F5 manual).",
  intake_screen_viewed:
    "Each intake screen becomes visible (overlays s-crawl/s-brand-fix included).",
  intake_continued: "Lanjut tapped and the next screen shown.",
  intake_validation_failed:
    "Lanjut tapped while validate() blocks (brand/scope/category/branch/product only).",
  intake_answer_corrected:
    "A prepared answer changed (count only, never what changed).",
  intake_resumed: "Existing per-screen draft rehydrated into a screen.",
  intake_completed:
    "s-review confirmed ('Buat pertanyaan audit' with all blocks satisfied).",
};

/**
 * Strict payload allowlist. Only these keys may appear in an emitted event.
 * Counts are non-negative integers; flags are booleans; timings are ms ≥ 0.
 */
export type IntakeEventPayload = {
  screenId: IntakeScreenId;
  /** Epoch ms of the event. */
  at: number;
  /** Random single-tab session id. Opaque; never derived from user data. */
  sessionId?: string;
  /** Per-screen active ms (system-wait excluded). */
  activeMs?: number;
  /** Corrections so far (E5 count). */
  correctionCount?: number;
  /** Preparation retries so far (F6 ceiling: max 2 attempts). */
  retryCount?: number;
  /** True when the journey reached review-confirm (E7). */
  completed?: boolean;
};

const ALLOWED_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  "screenId",
  "at",
  "sessionId",
  "activeMs",
  "correctionCount",
  "retryCount",
  "completed",
]);

/** Keys that must never reach telemetry, matched as a defence-in-depth layer. */
const FORBIDDEN_KEY_PATTERN =
  /answer|value|brand|source|url|content|text|label|name|email|phone|contact|payment|address|city|competitor|offer|category|customer|fact/i;

export type IntakeFunnelEvent = {
  name: IntakeFunnelEventName;
  payload: Required<Pick<IntakeEventPayload, "screenId" | "at">> &
    Partial<Omit<IntakeEventPayload, "screenId" | "at">>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isEventName(value: unknown): value is IntakeFunnelEventName {
  return (
    typeof value === "string" &&
    (INTAKE_FUNNEL_EVENTS as readonly string[]).includes(value)
  );
}

/**
 * Validate and build a funnel event. Throws on:
 * - unknown event name,
 * - unknown screen id,
 * - non-numeric / negative timestamp,
 * - any payload key outside the allowlist (answer text, brand/source
 *   content, contact/payment data are rejected here),
 * - wrong value types for allowed keys.
 */
export function emitIntakeEvent(
  name: IntakeFunnelEventName,
  payload: IntakeEventPayload,
): IntakeFunnelEvent {
  if (!isEventName(name))
    throw new Error(`unknown intake funnel event: ${String(name)}`);
  if (!isRecord(payload))
    throw new Error("intake event payload must be an object");

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) {
      throw new Error(
        `intake event payload key "${key}" is not allowlisted (counts/booleans only; no answer text, brand/source content, or contact/payment data)`,
      );
    }
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new Error(`intake event payload key "${key}" is forbidden`);
    }
  }

  const {
    screenId,
    at,
    sessionId,
    activeMs,
    correctionCount,
    retryCount,
    completed,
  } = payload;

  if (!isIntakeScreenId(screenId)) {
    throw new Error(`unknown intake screen id: ${String(screenId)}`);
  }
  if (!isNonNegativeNumber(at)) {
    throw new Error("intake event 'at' must be a non-negative epoch-ms number");
  }
  if (sessionId !== undefined && typeof sessionId !== "string") {
    throw new Error("intake event 'sessionId' must be a string");
  }
  if (activeMs !== undefined && !isNonNegativeNumber(activeMs)) {
    throw new Error("intake event 'activeMs' must be a non-negative number");
  }
  if (correctionCount !== undefined && !isNonNegativeInt(correctionCount)) {
    throw new Error(
      "intake event 'correctionCount' must be a non-negative integer",
    );
  }
  if (retryCount !== undefined && !isNonNegativeInt(retryCount)) {
    throw new Error("intake event 'retryCount' must be a non-negative integer");
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    throw new Error("intake event 'completed' must be a boolean");
  }

  return {
    name,
    payload: {
      screenId,
      at,
      ...(sessionId !== undefined ? { sessionId } : {}),
      ...(activeMs !== undefined ? { activeMs } : {}),
      ...(correctionCount !== undefined ? { correctionCount } : {}),
      ...(retryCount !== undefined ? { retryCount } : {}),
      ...(completed !== undefined ? { completed } : {}),
    },
  };
}
