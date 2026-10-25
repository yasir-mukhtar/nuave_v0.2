import { getCloudflareContext } from "@opennextjs/cloudflare";
import { dailySpendLimitUsd } from "../spending/provider-spend";
import { sha256Hex } from "./link-secret";
import { parseOrderEmail } from "./order-email";

export { newLinkSecret, sha256Hex } from "./link-secret";

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

/** Spec 017 R-17: the Midtrans server key and the production switch. The
 * switch must be exactly `true` or `false`; anything else counts as missing.
 * Null when either is missing. The key is never logged or returned to a page. */
export function midtransSettings(): {
  serverKey: string;
  isProduction: boolean;
} | null {
  const serverKey = setting(
    "MIDTRANS_SERVER_KEY",
    process.env.MIDTRANS_SERVER_KEY,
  )?.trim();
  const production = setting(
    "MIDTRANS_IS_PRODUCTION",
    process.env.MIDTRANS_IS_PRODUCTION,
  )
    ?.trim()
    .toLowerCase();
  if (!serverKey || (production !== "true" && production !== "false")) {
    return null;
  }
  return { serverKey, isProduction: production === "true" };
}

/** R-17/Q8: where founder notices go. */
export function founderAlertEmail(): string | null {
  return parseOrderEmail(
    setting("NUAVE_FOUNDER_ALERT_EMAIL", process.env.NUAVE_FOUNDER_ALERT_EMAIL),
  );
}

/** R-17: in live mode no payment and no test pass starts unless the Midtrans
 * server key, the production switch and the founder alert address are all set
 * (fail closed). Synthetic mode never calls Midtrans: it uses the labeled
 * simulated payment, so it needs none of them. */
export function paymentSettingsReady(mode: "live" | "synthetic"): boolean {
  if (mode === "synthetic") return true;
  return midtransSettings() !== null && founderAlertEmail() !== null;
}

/** R-20: a test-pass secret shorter than this is no test pass at all. */
export const TEST_PASS_MIN_SECRET_LENGTH = 24;
const TEST_PASS_MAX_CODE_LENGTH = 256;

/** Equal-length hex strings compared without stopping at the first difference. */
function sameHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * R-20: does the code in the request body match `NUAVE_TEST_PASS_CODE`? A hash
 * of each is compared in constant time. A missing secret, or one shorter than
 * 24 characters, never matches: no test pass. Always hashes both, so a wrong
 * code and a missing secret take the same path. The code is never logged,
 * stored or echoed.
 */
export async function testPassCodeMatches(code: unknown): Promise<boolean> {
  // The /uji form trims what is typed, so both sides are trimmed (a secret
  // saved with a trailing newline still works); the 24-character rule counts
  // the trimmed secret.
  const secret = (
    setting("NUAVE_TEST_PASS_CODE", process.env.NUAVE_TEST_PASS_CODE) ?? ""
  ).trim();
  const given =
    typeof code === "string" && code.length <= TEST_PASS_MAX_CODE_LENGTH
      ? code.trim()
      : "";
  const [givenHash, secretHash] = await Promise.all([
    sha256Hex(given),
    sha256Hex(secret),
  ]);
  const matches = sameHex(givenHash, secretHash);
  return (
    matches &&
    secret.length >= TEST_PASS_MIN_SECRET_LENGTH &&
    given.length > 0 &&
    typeof code === "string"
  );
}

export { parseOrderEmail };

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

/** R-04: sent to the provider instead of the order id: a fixed prefix and the
 * first 32 hex characters of the id's SHA-256. Never the email, never the raw
 * id. */
export async function orderSafetyIdentifier(orderId: string): Promise<string> {
  return `nuave-order-${(await sha256Hex(orderId)).slice(0, 32)}`;
}
