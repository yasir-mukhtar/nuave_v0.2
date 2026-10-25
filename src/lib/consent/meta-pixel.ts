import { PRIVACY_VERSION } from "@/lib/legal";
import { ORDER_GROSS_AMOUNT } from "@/lib/payments/midtrans";

/**
 * Spec 019: the Meta Pixel, loaded only after the visitor taps Setuju on the
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
    )
      return null;
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

/** Whether this page may send: an ID, Setuju given in this page, and not an
 * excluded page. Set by the notice. */
let granted = false;

/** Meta's standard snippet, inserted only after Setuju (R-02), with automatic
 * configuration off so it never reads form fields or button text (R-05), and
 * its own history tracking off, since Nuave sends PageView itself (R-06). */
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

/** Setuju (or a stored Setuju): load the Pixel, or grant it again after an
 * earlier Tolak in this page. */
export function grantTracking(pathname: string): boolean {
  const id = metaPixelId();
  if (!id || trackingExcludedPath(pathname)) return false;
  if (window.fbq) window.fbq("consent", "grant");
  else loadPixel(id);
  granted = true;
  return true;
}

/** R-11: Tolak stops every further event in this page. */
export function revokeTracking() {
  granted = false;
  window.fbq?.("consent", "revoke");
}

function canSend(): boolean {
  return (
    granted &&
    Boolean(window.fbq) &&
    !trackingExcludedPath(window.location.pathname)
  );
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

/** Records `key` as sent; false when it was already sent in the last 7 days. */
function firstTime(key: string, now: number): boolean {
  const code = shortCode(key);
  let sent: Record<string, number> = {};
  try {
    sent = JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "{}");
  } catch {
    sent = {};
  }
  const kept = Object.fromEntries(
    Object.entries(sent)
      .filter(([, at]) => typeof at === "number" && now - at < SENT_DAYS * DAY)
      .slice(-50),
  );
  if (code in kept) return false;
  kept[code] = now;
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify(kept));
  } catch {
    // Storage blocked: the Pixel never loads then (R-03), so this is unreachable.
  }
  return true;
}

export type JourneyEvent = "Lead" | "InitiateCheckout" | "Purchase";

/** R-07..R-10: one journey event per `key` (a website or an order), carrying
 * only the value and currency, never who or what the order is. */
export function trackJourneyEvent(
  event: JourneyEvent,
  key: string,
  now = Date.now(),
) {
  if (!canSend() || !firstTime(`${event}:${key}`, now)) return;
  if (event === "Lead") window.fbq!("track", "Lead");
  else
    window.fbq!("track", event, {
      value: ORDER_GROSS_AMOUNT,
      currency: "IDR",
    });
}

/** For tests: forget this page's Setuju. */
export function resetTrackingForTests() {
  granted = false;
}
