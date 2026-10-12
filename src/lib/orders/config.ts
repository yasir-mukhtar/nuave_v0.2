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

/** The real mail sender's settings: Worker secrets set by the deploy job
 * (R-25). Null when either is missing, so live mode cannot take or deliver an
 * order. */
export function resendSettings(): { apiKey: string; from: string } | null {
  const apiKey = setting("RESEND_API_KEY", process.env.RESEND_API_KEY)?.trim();
  const from = setting("NUAVE_MAIL_FROM", process.env.NUAVE_MAIL_FROM)?.trim();
  return apiKey && from ? { apiKey, from } : null;
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

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** R-04: sent to the provider instead of the order id: a fixed prefix and the
 * first 32 hex characters of the id's SHA-256. Never the email, never the raw
 * id. */
export async function orderSafetyIdentifier(orderId: string): Promise<string> {
  return `nuave-order-${(await sha256Hex(orderId)).slice(0, 32)}`;
}

/** At least 128 random bits (R-24): 24 bytes, URL-safe base64, 32 characters. */
export function newLinkSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
