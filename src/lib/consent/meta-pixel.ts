import { PRIVACY_VERSION } from "@/lib/legal";
import { ORDER_GROSS_AMOUNT } from "@/lib/payments/midtrans";
import { readTestPassCode } from "@/lib/intake/test-pass";

/**
 * Spec 019: the Meta Pixel, loaded only after the visitor taps Allow on the
 * cookie notice (privacy page section 10). Without a Pixel ID nothing here
 * runs: no notice, no footer link, no request to Meta.
 */

/** Next.js inlines this at build time; CI sets it from the repository
 * variable META_PIXEL_ID. Read on each call so tests can set it. */
export function metaPixelId(): string {
  const id = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();
  return /^\d{5,20}$/.test(id) ? id : "";
}

/** R-04: never on the report link (its secret is in the address) or the
 * founder test pass. */
export function trackingExcludedPath(pathname: string): boolean {
  return /^\/(r|uji)(\/|$)/.test(pathname);
}

export const COOKIE_CHOICE_KEY = "nuave-cookie-choice";
const SENT_KEY = "nuave-pixel-sent";
const CHOICE_DAYS = 365;
const SENT_DAYS = 7;
const DAY = 86_400_000;
/** The footer link and the notice talk through this window event. */
export const COOKIE_SETTINGS_EVENT = "nuave:cookie-settings";

export type CookieChoice = "yes" | "no";

/** R-03: the stored choice, or null when there is none, it is older than 12
 * months, it was made under another privacy-page version, or storage is
 * blocked (then the notice shows each time and the Pixel never loads). */
export function readCookieChoice(now = Date.now()): CookieChoice | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CHOICE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as {
      choice?: unknown;
      at?: unknown;
      version?: unknown;
    };
    const at = typeof saved.at === "string" ? Date.parse(saved.at) : NaN;
    if (
      (saved.choice !== "yes" && saved.choice !== "no") ||
      saved.version !== PRIVACY_VERSION ||
      !Number.isFinite(at) ||
      now - at > CHOICE_DAYS * DAY
    ) {
      // An old or unreadable choice is not kept past its 12 months.
      window.localStorage.removeItem(COOKIE_CHOICE_KEY);
      return null;
    }
    return saved.choice;
  } catch {
    return null;
  }
}

/** Returns whether the choice was stored. */
export function saveCookieChoice(choice: CookieChoice, now = Date.now()) {
  try {
    window.localStorage.setItem(
      COOKIE_CHOICE_KEY,
      JSON.stringify({
        choice,
        at: new Date(now).toISOString(),
        version: PRIVACY_VERSION,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Whether this page may send: an ID, Allow given in this page, and not an
 * excluded page. Set by the notice. */
let granted = false;

/** Midtrans sends the buyer back to `/audit?order_id=NV-…&status_code=…
 * &transaction_status=…`. The page never reads these, and the Pixel reports
 * the page address with every event, so they leave the address before the
 * Pixel loads or sends anything (R-10). Other parameters (an ad's `fbclid`
 * or `utm_*`) stay. */
const PAYMENT_RETURN_PARAMS = [
  "order_id",
  "status_code",
  "transaction_status",
  "result",
];

function removePaymentReturnParams() {
  const url = new URL(window.location.href);
  const found = PAYMENT_RETURN_PARAMS.filter((name) =>
    url.searchParams.has(name),
  );
  if (found.length === 0) return;
  for (const name of found) url.searchParams.delete(name);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

/** Meta's standard snippet, inserted only after Allow (R-02), with automatic
 * configuration off (Meta's automatic events, page metadata and scroll depth)
 * and its own history tracking off, since Nuave sends PageView itself (R-06).
 * Meta's "Automatic advanced matching", which reads typed emails, is a setting
 * in Events Manager that the code cannot switch off: it must stay off there
 * (R-05, R-13). */
function loadPixel(id: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  fbq.disablePushState = true;
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("set", "autoConfig", false, id);
  fbq("init", id);
}

/** Allow (or a stored Allow): load the Pixel, or grant it again after an
 * earlier Don't allow in this page. */
export function grantTracking(pathname: string): boolean {
  const id = metaPixelId();
  if (!id || trackingExcludedPath(pathname)) return false;
  removePaymentReturnParams();
  if (window.fbq) window.fbq("consent", "grant");
  else loadPixel(id);
  granted = true;
  return true;
}

/** R-11: Don't allow stops every further event in this page, and the codes kept
 * for sending each event once go too. */
export function revokeTracking() {
  granted = false;
  window.fbq?.("consent", "revoke");
  try {
    window.localStorage.removeItem(SENT_KEY);
  } catch {
    // Nothing kept.
  }
}

/** The stored choice is read again on every send, so Don't allow chosen in another
 * tab (the privacy page opens in one from checkout) stops this tab too. */
function canSend(): boolean {
  if (
    !granted ||
    !window.fbq ||
    trackingExcludedPath(window.location.pathname) ||
    readCookieChoice() !== "yes"
  )
    return false;
  removePaymentReturnParams();
  return true;
}

/** R-06: one PageView per page shown. */
export function trackPageView() {
  if (canSend()) window.fbq!("track", "PageView");
}

/** A short one-way code for a de-duplication key, so the browser keeps no
 * readable website or order number for this (FNV-1a, 32 bits). */
function shortCode(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** The codes sent in the last 7 days; older ones are dropped from storage. */
function sentCodes(now: number): Record<string, number> {
  let sent: Record<string, number> = {};
  try {
    sent = JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "{}");
  } catch {
    sent = {};
  }
  return Object.fromEntries(
    Object.entries(sent)
      .filter(([, at]) => typeof at === "number" && now - at < SENT_DAYS * DAY)
      .slice(-50),
  );
}

function keepSentCodes(codes: Record<string, number>) {
  try {
    if (Object.keys(codes).length === 0)
      window.localStorage.removeItem(SENT_KEY);
    else window.localStorage.setItem(SENT_KEY, JSON.stringify(codes));
  } catch {
    // Storage blocked: the Pixel never loads then (R-03).
  }
}

/** On each page load: codes past 7 days leave the browser (R-09a). */
export function pruneSentCodes(now = Date.now()) {
  try {
    if (window.localStorage.getItem(SENT_KEY) === null) return;
  } catch {
    return;
  }
  keepSentCodes(sentCodes(now));
}

/** Records `key` as sent; false when it was already sent in the last 7 days. */
function firstTime(key: string, now: number): boolean {
  const code = shortCode(key);
  const kept = sentCodes(now);
  if (code in kept) return false;
  kept[code] = now;
  keepSentCodes(kept);
  return true;
}

export type JourneyEvent = "Lead" | "InitiateCheckout" | "Purchase";

/** R-07..R-10: one journey event per `key` (a website or an order), carrying
 * only the value and currency, never who or what the order is. Spec 021: a
 * Purchase with the order's event code also carries that code (R-09) and asks
 * the server to send the same Purchase (R-01), under the same checks: Allow
 * under the current privacy version, not `/r` or `/uji`, no test-pass code
 * (R-05, R-19b). */
export function trackJourneyEvent(
  event: JourneyEvent,
  key: string,
  now = Date.now(),
  purchaseEventId?: string,
) {
  // The founder's test runs (a test-pass code in this tab) are not ad results.
  if (readTestPassCode()) return;
  if (!canSend() || !firstTime(`${event}:${key}`, now)) return;
  if (event === "Lead") {
    window.fbq!("track", "Lead");
    return;
  }
  const params = { value: ORDER_GROSS_AMOUNT, currency: "IDR" };
  if (event === "Purchase" && purchaseEventId) {
    window.fbq!("track", event, params, { eventID: purchaseEventId });
    askServerPurchase(key);
  } else window.fbq!("track", event, params);
}

/** Spec 021 R-11: in the background, never waited for, its answer and any
 * error ignored; `keepalive` so leaving the page does not cancel it. The Meta
 * cookie codes go with it as the browser's own cookies. */
function askServerPurchase(orderId: string) {
  try {
    void fetch("/api/meta/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        consent_version: PRIVACY_VERSION,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Nothing on screen depends on it.
  }
}

/** For tests: forget this page's Allow. */
export function resetTrackingForTests() {
  granted = false;
}
