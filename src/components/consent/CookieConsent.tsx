"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  COOKIE_SETTINGS_EVENT,
  grantTracking,
  metaPixelId,
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
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!enabled) return;
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

  useEffect(() => {
    if (!enabled) return;
    const reopen = () => {
      setReopened(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, [enabled]);

  useEffect(() => {
    if (open && reopened) headingRef.current?.focus();
  }, [open, reopened]);

  if (!enabled || !open) return null;

  function choose(next: CookieChoice) {
    // R-03: with storage blocked the choice cannot be kept, so the Pixel
    // never loads and the notice comes back on the next page load.
    const kept = saveCookieChoice(next);
    if (next === "yes" && kept) grantTracking(window.location.pathname);
    else revokeTracking();
    setChoice(next);
    setOpen(false);
    setReopened(false);
  }

  return (
    <section
      aria-labelledby="cookie-notice-title"
      data-cookie-notice=""
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
    >
      <div className="mx-auto grid max-w-[480px] gap-4 rounded-2xl border border-line-200 bg-white p-5 shadow-lg">
        <div className="grid gap-2">
          <h2
            id="cookie-notice-title"
            ref={headingRef}
            tabIndex={-1}
            className="type-heading-sm m-0 text-ink-900 outline-none"
          >
            Cookie untuk iklan
          </h2>
          <p className="type-copy-sm m-0 text-ink-600">
            Kami ingin memakai cookie Meta untuk mengukur iklan Nuave di
            Facebook dan Instagram. Jika Anda setuju dan membeli, email pesanan
            Anda dikirim ke Meta sebagai kode acak (hash). Laporan dan jawaban
            Anda tidak pernah dikirim.{" "}
            <Link href="/privacy#cookie" className="text-ink-900 underline">
              Kebijakan Privasi
            </Link>
          </p>
          {reopened && choice ? (
            <p className="type-copy-sm m-0 text-ink-600">
              Pilihan Anda sekarang:{" "}
              <strong>{choice === "yes" ? "Setuju" : "Tolak"}</strong>.{" "}
              {choice === "yes"
                ? "Cookie Meta yang sudah terpasang bisa Anda hapus lewat pengaturan browser."
                : null}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="inkOutline"
            size="touch"
            onClick={() => choose("no")}
          >
            Tolak
          </Button>
          <Button
            variant="inkOutline"
            size="touch"
            onClick={() => choose("yes")}
          >
            Setuju
          </Button>
        </div>
      </div>
    </section>
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
