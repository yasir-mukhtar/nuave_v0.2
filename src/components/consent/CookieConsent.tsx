"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BOTTOM_BAR_HEIGHT_VAR, NOTICE_CLEAR_VAR } from "@/lib/bottom-bars";
import {
  COOKIE_CHOICE_KEY,
  COOKIE_SETTINGS_EVENT,
  grantTracking,
  metaPixelId,
  pruneSentCodes,
  readCookieChoice,
  revokeTracking,
  saveCookieChoice,
  trackPageView,
  trackingExcludedPath,
  type CookieChoice,
} from "@/lib/consent/meta-pixel";

/**
 * Spec 019: the cookie notice. Shown on every page except `/r` and `/uji`
 * while there is no stored choice, and again from "Pengaturan cookie".
 * Renders nothing without a Pixel ID (R-01).
 */
export function CookieConsent() {
  const pathname = usePathname() ?? "/";
  const enabled = metaPixelId() !== "" && !trackingExcludedPath(pathname);
  // undefined until the browser has been read, so the server render and the
  // first browser render agree.
  const [choice, setChoice] = useState<CookieChoice | null | undefined>();
  const [open, setOpen] = useState(false);
  const [reopened, setReopened] = useState(false);
  // Spec 021 R-19a: the second layer, opened inside the notice.
  const [explained, setExplained] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const noticeRef = useRef<HTMLElement>(null);
  // The "Pengaturan cookie" link that reopened the notice gets focus back.
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    pruneSentCodes();
    const stored = readCookieChoice();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only read
    setChoice(stored);
    setOpen(stored === null);
    if (stored === "yes") grantTracking(window.location.pathname);
  }, [enabled]);

  // R-06: one PageView per page shown, including moves inside the site.
  useEffect(() => {
    if (enabled && choice === "yes") trackPageView();
  }, [enabled, choice, pathname]);

  // A choice made in another tab applies here at once: Don't allow there stops
  // this tab before it sends anything more (privacy page section 10).
  useEffect(() => {
    if (!enabled) return;
    const sync = (event: StorageEvent) => {
      if (event.key !== null && event.key !== COOKIE_CHOICE_KEY) return;
      const stored = readCookieChoice();
      if (stored === "yes") grantTracking(window.location.pathname);
      else revokeTracking();
      setChoice(stored);
      if (stored !== null) setOpen(false);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const reopen = () => {
      openerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setReopened(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, [enabled]);

  useEffect(() => {
    if (open && reopened) headingRef.current?.focus();
  }, [open, reopened]);

  // R-14: while the notice shows, the browser keeps a focused control, and
  // any scroll to one, clear of it (and on /audit of the journey's bottom bar
  // it sits on). Set inline so it wins over a page's own scroll padding, and
  // put back when the notice goes. The room at the page's end lets its last
  // controls scroll that far.
  const shown = enabled && open;
  useEffect(() => {
    const notice = noticeRef.current;
    if (!shown || !notice) return;
    const root = document.documentElement;
    const before = root.style.scrollPaddingBottom;
    const measure = () =>
      root.style.setProperty(NOTICE_CLEAR_VAR, `${notice.offsetHeight + 8}px`);
    measure();
    root.style.scrollPaddingBottom = `calc(var(${NOTICE_CLEAR_VAR}) + var(${BOTTOM_BAR_HEIGHT_VAR}, 0px))`;
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    resize?.observe(notice);
    return () => {
      resize?.disconnect();
      root.style.removeProperty(NOTICE_CLEAR_VAR);
      root.style.scrollPaddingBottom = before;
    };
  }, [shown]);

  if (!shown) return null;

  function choose(next: CookieChoice) {
    // R-03: with storage blocked the choice cannot be kept, so the Pixel
    // never loads and the notice comes back on the next page load.
    const kept = saveCookieChoice(next);
    if (next === "yes" && kept) grantTracking(window.location.pathname);
    else revokeTracking();
    setChoice(next);
    setOpen(false);
    setExplained(false);
    if (reopened) openerRef.current?.focus();
    setReopened(false);
  }

  return (
    <>
      <div aria-hidden="true" style={{ height: `var(${NOTICE_CLEAR_VAR})` }} />
      <section
        ref={noticeRef}
        aria-labelledby="cookie-notice-title"
        data-cookie-notice=""
        className="fixed inset-x-0 z-50 px-4"
        style={{
          // On /audit it sits just above the journey's bottom bar, whose
          // buttons stay in view and tappable (R-14). The bar already clears
          // the home-bar inset, so the notice adds it only without a bar.
          bottom: `var(${BOTTOM_BAR_HEIGHT_VAR}, 0px)`,
          paddingBottom: `calc(16px + max(env(safe-area-inset-bottom, 0px) - var(${BOTTOM_BAR_HEIGHT_VAR}, 0px), 0px))`,
        }}
      >
        <div className="mx-auto grid max-w-[420px] gap-3 rounded-2xl border border-line-200 bg-white p-4 shadow-lg">
          <div className="grid gap-1">
            <h2
              id="cookie-notice-title"
              ref={headingRef}
              tabIndex={-1}
              className="type-label-strong m-0 text-ink-900"
            >
              Help us understand what works
            </h2>
            {/* Spec 021 Q-1 (founder, 2026-10-26): the first layer, short and
                about the purpose. Its wording is for the lawyer's check. */}
            <p className="type-caption m-0 text-ink-600">
              We use cookies and limited purchase information to measure which
              ads lead to sales. Your report and business answers are never
              shared with advertising partners.{" "}
              <button
                type="button"
                aria-expanded={explained}
                aria-controls="cookie-notice-how"
                className="text-ink-900 underline"
                onClick={() => setExplained((shown) => !shown)}
              >
                How it works
              </button>
            </p>
            {explained ? <HowItWorks /> : null}
            {reopened && choice ? (
              <p className="type-caption m-0 text-ink-600">
                Your choice now:{" "}
                <strong>{choice === "yes" ? "Allow" : "Don't allow"}</strong>.{" "}
                {choice === "yes"
                  ? "Meta cookies already set can be removed in your browser settings."
                  : null}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="inkOutline"
              className="h-10"
              onClick={() => choose("no")}
            >
              Don&apos;t allow
            </Button>
            {/* Founder decision 2026-10-25: Allow is the main (purple) button. */}
            <Button
              variant="commit"
              className="h-10"
              onClick={() => choose("yes")}
            >
              Allow
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

/** Spec 021 Q-9 (approved 2026-10-26): what is shared, with whom and why,
 * shown inside the notice before the choice (R-19a). Nothing loads from Meta.
 * It scrolls on its own, so the buttons below stay in reach on a phone. */
function HowItWorks() {
  return (
    <div
      id="cookie-notice-how"
      className="type-caption mt-1 grid max-h-[40vh] gap-2 overflow-y-auto rounded-xl bg-stone-50 p-3 text-ink-700"
    >
      <p className="type-label-strong m-0 text-ink-900">How it works</p>
      <ul className="m-0 grid gap-1.5 pl-4">
        <li>
          If you allow, Meta (Facebook and Instagram), our advertising partner,
          sets cookies and learns which Nuave pages you open and when you finish
          the free check or open checkout, with your IP address and device type,
          so we can see which ads bring visitors.
        </li>
        <li>
          If you buy, we also send Meta that a purchase happened and its value
          (Rp249.000), your IP address, browser type and Meta cookie codes, and
          your order email in coded (hashed) form, never as readable text. Meta
          uses these to match the purchase to your Facebook or Instagram account
          and the ad you saw, and to show our ads to people similar to our
          buyers.
        </li>
        <li>
          We never send Meta your report, your questions, AI answers or your
          business details.
        </li>
        <li>
          If you don&apos;t allow, none of your data is sent to Meta, from your
          browser or from our server. You can change your choice anytime under
          Pengaturan cookie, at the bottom of our home page and privacy page.
        </li>
      </ul>
      <Link href="/privacy#cookie" className="text-ink-900 underline">
        Privacy policy
      </Link>
    </div>
  );
}

/** Spec 019: the "Pengaturan cookie" footer link that reopens the notice. Hidden without a
 * Pixel ID, like the notice. */
export function CookieSettingsLink({ className }: { className?: string }) {
  if (!metaPixelId()) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
    >
      Pengaturan cookie
    </button>
  );
}
