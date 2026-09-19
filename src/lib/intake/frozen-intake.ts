/**
 * The frozen-intake wire contract shared by the client pack store and the
 * server GLM adapter. Leaf module: type-only imports only, so it is safe in
 * both the client bundle and a server route boundary.
 */
import type { IntakeState, ReviewRow } from "./state";

export const LOCAL_INTAKE_INPUT_VERSION = "nuave-local-intake-input-v1";

export const SERVICE_CHANNELS = {
  "service-location": "on_premise",
  "service-customer": "on_customer",
  "service-delivery": "delivery",
  "service-online": "online",
} as const;
export type ServiceChannel =
  (typeof SERVICE_CHANNELS)[keyof typeof SERVICE_CHANNELS];

/** Exact customer-confirmed meanings, independent of the older engine brief.
 * In particular optional reasons stay empty, and channels / comparators stay
 * arrays. Nothing is invented merely to satisfy BusinessBrief's older minima.
 */
export type FrozenLocalIntake = {
  version: typeof LOCAL_INTAKE_INPUT_VERSION;
  factVersion: number;
  fingerprint: string;
  reviewRows: ReviewRow[];
  confirmed: {
    brand: { name: string; primarySource: string };
    scope: IntakeState["scope"];
    target: { name: string; detail: string } | null;
    category: string;
    offerings: string[];
    customerReasons: string[];
    serviceChannels: { channel: ServiceChannel; label: string }[];
    market: {
      reach: NonNullable<IntakeState["market"]["kind"]>;
      areas: string[];
    };
    comparators: { mode: "named" | "category-alternatives"; names: string[] };
    publicFact: string;
  };
};

/** Deterministic equality key, deliberately collision-free rather than a hash.
 * It stays local with the snapshot, never in URLs, events, logs, or analytics. */
export function fingerprintOf(
  input: Pick<FrozenLocalIntake, "confirmed" | "reviewRows">,
) {
  return JSON.stringify({
    confirmed: input.confirmed,
    reviewRows: input.reviewRows,
  });
}

/** Server adapters use this to confirm the submitted intake record is the
 * exact one the UI froze — confirmed input only, nothing invented. */
export function isLocalIntakeFingerprintValid(input: FrozenLocalIntake) {
  return (
    input.version === LOCAL_INTAKE_INPUT_VERSION &&
    input.fingerprint === fingerprintOf(input)
  );
}
