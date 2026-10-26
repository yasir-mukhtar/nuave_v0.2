import { metaPixelId } from "../consent/meta-pixel";
import { PRIVACY_VERSION } from "../legal";
import { midtransSettings, setting, siteOrigin } from "../orders/config";
import { orderRuntime } from "../orders/http";
import { getOrder, isOrderId } from "../orders/store";
import { sha256Hex } from "../orders/link-secret";
import { ORDER_GROSS_AMOUNT } from "../payments/midtrans";

/**
 * Spec 021: the server Purchase event (Meta Conversions API). Sent once per
 * paid order, only from the paying customer's own browser call after Allow
 * (Option A), so the IP address and browser type go to Meta at the moment of
 * that request and are never stored (privacy item 7). Nothing else in Nuave
 * contacts Meta (R-23).
 */

/** R-18: fixed in code; v26.0 was current at build time (2026-10-26). */
export const META_GRAPH_VERSION = "v26.0";
/** R-12: Meta gets one try of at most 3 seconds. */
export const META_SEND_TIMEOUT_MS = 3000;

/** What the route logs and, when a send was tried, stores (R-13, R-14).
 * Codes only: never the IP address, browser type, cookie codes, email, hash
 * or token. */
export type PurchaseOutcome =
  | "sent"
  | `meta_${number}`
  | "timeout"
  | "error"
  /** No token or Pixel ID (previews, local): nothing is sent (R-16). */
  | "off"
  /** Not a real paid order, or a request Meta could not use. */
  | "skipped"
  /** The choice was not made under the current privacy version (R-05). */
  | "no_consent"
  /** Midtrans sandbox without a Test Events code (R-06). */
  | "sandbox"
  /** This order's one send was already tried (R-10). */
  | "already_sent"
  /** The shared per-IP limit stopped the call before any work (R-15). */
  | "rate_limited";

export type MetaCapiSettings = {
  pixelId: string;
  token: string;
  testEventCode: string | null;
};

/** R-16: off without the token or the Pixel ID. R-17: the Test Events code is
 * an optional Worker secret, set by hand only while checking. */
export function metaCapiSettings(): MetaCapiSettings | null {
  const pixelId = metaPixelId();
  const token = setting(
    "META_CAPI_ACCESS_TOKEN",
    process.env.META_CAPI_ACCESS_TOKEN,
  )?.trim();
  if (!pixelId || !token) return null;
  const testEventCode =
    setting(
      "META_CAPI_TEST_EVENT_CODE",
      process.env.META_CAPI_TEST_EVENT_CODE,
    )?.trim() || null;
  return { pixelId, token, testEventCode };
}

/** Meta's `em`: the email trimmed, lower-cased and hashed with SHA-256. */
export function hashedEmail(email: string): Promise<string> {
  return sha256Hex(email.trim().toLowerCase());
}

/** One cookie's value from a `Cookie` header, or null. */
export function cookieValue(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const at = part.indexOf("=");
    if (at > 0 && part.slice(0, at).trim() === name) {
      const value = part.slice(at + 1).trim();
      return value || null;
    }
  }
  return null;
}

export type PurchaseEvent = {
  eventId: string;
  /** Seconds since 1970: the time of this call (R-03). */
  eventTime: number;
  email: string;
  ip: string;
  userAgent: string;
  fbp: string | null;
  fbc: string | null;
  /** The fixed `<site>/audit`, never the real address (Q-4). */
  pageUrl: string;
};

/** R-03: exactly the fields section 10 lists, plus Meta's required envelope.
 * R-17/R-18: the events, the token and any test code go as form fields in
 * the body, never in the address; the test code once, next to the events. */
export async function purchaseForm(
  settings: MetaCapiSettings,
  event: PurchaseEvent,
): Promise<URLSearchParams> {
  const userData: Record<string, unknown> = {
    em: [await hashedEmail(event.email)],
    client_ip_address: event.ip,
    client_user_agent: event.userAgent,
    ...(event.fbp ? { fbp: event.fbp } : {}),
    ...(event.fbc ? { fbc: event.fbc } : {}),
  };
  const form = new URLSearchParams();
  form.set(
    "data",
    JSON.stringify([
      {
        event_name: "Purchase",
        event_time: event.eventTime,
        event_id: event.eventId,
        action_source: "website",
        event_source_url: event.pageUrl,
        user_data: userData,
        custom_data: { value: ORDER_GROSS_AMOUNT, currency: "IDR" },
      },
    ]),
  );
  if (settings.testEventCode) {
    form.set("test_event_code", settings.testEventCode);
  }
  form.set("access_token", settings.token);
  return form;
}

/** R-12: one POST, at most 3 seconds, no retry. Never throws. */
export async function postPurchase(
  settings: MetaCapiSettings,
  event: PurchaseEvent,
  timeoutMs = META_SEND_TIMEOUT_MS,
): Promise<PurchaseOutcome> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${settings.pixelId}/events`,
      {
        method: "POST",
        body: await purchaseForm(settings, event),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    // Meta's reply is never read beyond its status, and never kept.
    void response.body?.cancel().catch(() => undefined);
    return response.ok ? "sent" : `meta_${response.status}`;
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name;
    return name === "TimeoutError" || name === "AbortError"
      ? "timeout"
      : "error";
  }
}

/**
 * The route's work (R-05, R-06, R-10, R-13). Reads only `order_id` and the
 * privacy version from the body; the IP address, browser type and cookie codes
 * come from this request and go no further than Meta.
 */
export async function sendServerPurchase(
  request: Request,
  body: unknown,
  now = new Date(),
): Promise<PurchaseOutcome> {
  const settings = metaCapiSettings();
  const server = orderRuntime();
  if (!settings || !server) return "off";
  if (server.mode !== "live") return "skipped";
  const { order_id: orderId, consent_version: consentVersion } = (body ??
    {}) as { order_id?: unknown; consent_version?: unknown };
  if (consentVersion !== PRIVACY_VERSION) return "no_consent";
  if (!isOrderId(orderId)) return "skipped";
  const order = await getOrder(server.db, orderId);
  if (
    !order ||
    order.environment !== server.environment ||
    order.mode !== "live" ||
    order.payment_kind !== "midtrans" ||
    !order.meta_event_id ||
    !order.email
  ) {
    return "skipped";
  }
  // R-06: until G1, a sandbox payment is sent only while a test code is set.
  const midtrans = midtransSettings();
  if (!midtrans || (!midtrans.isProduction && !settings.testEventCode)) {
    return "sandbox";
  }
  const origin = siteOrigin();
  const ip = request.headers.get("CF-Connecting-IP")?.trim();
  const userAgent = request.headers.get("User-Agent")?.trim();
  if (!origin || !ip || !userAgent) return "skipped";

  // R-10: the one write that only one request can win.
  const claim = await server.db
    .prepare(
      `UPDATE orders SET meta_sent_at = ?2, meta_consent_version = ?3
       WHERE id = ?1 AND meta_sent_at IS NULL AND meta_event_id IS NOT NULL`,
    )
    .bind(order.id, now.toISOString(), PRIVACY_VERSION)
    .run();
  if (claim.meta?.changes !== 1) return "already_sent";

  const cookies = request.headers.get("Cookie");
  const outcome = await postPurchase(settings, {
    eventId: order.meta_event_id,
    eventTime: Math.floor(now.getTime() / 1000),
    email: order.email,
    ip,
    userAgent,
    fbp: cookieValue(cookies, "_fbp"),
    fbc: cookieValue(cookies, "_fbc"),
    pageUrl: `${origin}/audit`,
  });
  await server.db
    .prepare("UPDATE orders SET meta_outcome = ?2 WHERE id = ?1")
    .bind(order.id, outcome)
    .run();
  return outcome;
}
