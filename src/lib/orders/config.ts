import { getCloudflareContext } from "@opennextjs/cloudflare";
import { dailySpendLimitUsd } from "../spending/provider-spend";

/**
 * Server-only order settings (spec 016). Never read from a request. Values
 * come from the Worker's settings: `process.env` (OpenNext copies the Worker's
 * vars and secrets into it) and, in local `next dev`, the Worker context.
 */
export function setting(
  name: string,
  fromProcess: string | undefined,
): string | undefined {
  if (typeof fromProcess === "string" && fromProcess.trim() !== "") {
    return fromProcess;
  }
  try {
    const value = (
      getCloudflareContext().env as unknown as Record<string, unknown>
    )[name];
    if (typeof value === "string" && value.trim() !== "") return value;
  } catch {
    // No Worker context (plain Node).
  }
  return undefined;
}

export type OrderEnvironment = "production" | "preview";

/** R-14: which deployment this code is. Anything else is unclear, so no order
 * is made or run. */
export function orderEnvironment(): OrderEnvironment | null {
  const value = setting(
    "NUAVE_ENVIRONMENT",
    process.env.NUAVE_ENVIRONMENT,
  )?.trim();
  return value === "production" || value === "preview" ? value : null;
}

export const DEFAULT_ORDER_SPEND_LIMIT_USD = 2;

export class OrderConfigError extends Error {
  constructor() {
    super("order configuration is not valid");
    this.name = "OrderConfigError";
  }
}

/** R-07: the per-order limit (D2). A value that is not a number, is not above
 * zero, or is above the daily cap fails closed. */
export function orderSpendLimitUsd(): number {
  const raw = setting(
    "NUAVE_ORDER_SPEND_LIMIT_USD",
    process.env.NUAVE_ORDER_SPEND_LIMIT_USD,
  )?.trim();
  const value = raw ? Number(raw) : DEFAULT_ORDER_SPEND_LIMIT_USD;
  let daily: number;
  try {
    daily = dailySpendLimitUsd();
  } catch {
    throw new OrderConfigError();
  }
  if (!Number.isFinite(value) || value <= 0 || value > daily) {
    throw new OrderConfigError();
  }
  return value;
}

/** R-24: the fixed site address of this environment, never the request's host. */
export function siteOrigin(): string | null {
  const raw = setting("NUAVE_SITE_URL", process.env.NUAVE_SITE_URL)?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"))
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

const EMAIL_PATTERN =
  /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** The address, trimmed, or null when it is not one valid email. */
export function parseOrderEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

/** R-06 (Q6): in live mode only addresses on NUAVE_ORDER_EMAIL_ALLOWLIST
 * (comma, semicolon or whitespace separated) may order. Matched without case
 * after trimming. An empty or missing list allows nobody. */
export function emailOnAllowlist(email: string): boolean {
  const list = (
    setting(
      "NUAVE_ORDER_EMAIL_ALLOWLIST",
      process.env.NUAVE_ORDER_EMAIL_ALLOWLIST,
    ) ?? ""
  )
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
