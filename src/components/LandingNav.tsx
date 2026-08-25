"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const LOGO_SVG = "/logo-nuave.svg";
const MOBILE_MENU_ID = "nuave-mobile-menu";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(globalThis.scrollY > 20);
    onScroll();
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    return () => globalThis.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function MobileMenu({
  open,
  onClose,
  t,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}>) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Tutup menu"
        className="lp-mobile-menu-overlay fixed inset-0 z-[99] bg-black/20"
        style={{ backdropFilter: "blur(1px)", WebkitBackdropFilter: "blur(1px)" }}
        onClick={onClose}
      />
      <div
        id={MOBILE_MENU_ID}
        className="lp-mobile-menu fixed left-4 right-4 z-[101] bg-white rounded-[12px] border border-[rgba(117,115,114,0.15)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] py-2 flex flex-col items-center"
        style={{ top: 92 }}
      >
        <a
          id="nuave-mobile-menu-first-link"
          href="/support"
          onClick={onClose}
          className="px-5 py-3.5 text-[16px] font-medium text-[var(--lp-text-primary)] no-underline text-center block w-full"
        >
          {t("nav.contact")}
        </a>
        <div className="h-px bg-[#E5E7EB] mx-4 self-stretch" />
        <div className="px-4 py-3 w-full box-border">
          <Link
            href="/audit"
            onClick={onClose}
            className="btn-lp-black flex items-center justify-center px-5 py-3 text-white text-[15px] font-medium rounded-[8px] no-underline cursor-pointer w-full"
          >
            {t("cta.auditBrandFreeNoExclaim")}
          </Link>
        </div>
      </div>
    </>
  );
}

export default function LandingNav({ overlayHero = false }: { overlayHero?: boolean }) {
  const scrolled = useScrolled();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const t = useTranslations();

  useEffect(() => {
    const onResize = () => {
      if (globalThis.innerWidth > 768) setMobileMenuOpen(false);
    };
    globalThis.addEventListener("resize", onResize);
    return () => globalThis.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    if (mobileMenuOpen) {
      globalThis.setTimeout(() => {
        document.getElementById("nuave-mobile-menu-first-link")?.focus();
      }, 0);
    } else if (wasOpenRef.current) {
      hamburgerRef.current?.focus();
    }
    wasOpenRef.current = mobileMenuOpen;
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <>
      <nav
        className="lp-nav-bar"
        data-overlay-hero={overlayHero ? "true" : "false"}
        data-scrolled={scrolled ? "true" : "false"}
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: scrolled ? 834 : 1072,
          padding: 16,
          zIndex: 100,
          transition: "max-width 0.3s ease",
        }}
      >
        <div
          className="lp-nav-inner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
            padding: "12px 12px 12px 14px",
            backgroundColor: scrolled ? "rgba(255, 255, 255, 0.9)" : "transparent",
            backdropFilter: scrolled ? "blur(10px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(10px)" : "none",
            borderRadius: 12,
            border: scrolled ? "1px solid rgba(117, 115, 114, 0.15)" : "1px solid transparent",
            transition: "background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
          }}
        >
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img src={LOGO_SVG} alt="Nuave logo" width={28} height={28} className="lp-nav-brand-logo object-contain" />
            <span className="lp-nav-brand-text text-[20px] font-semibold text-[#0d0d0d]">Nuave</span>
          </Link>

          <div className="lp-nav-links flex items-center gap-8">
            <a href="/support" className="lp-nav-contact text-[14px] font-medium leading-[24px] text-[var(--lp-text-primary)] no-underline hover:text-brand transition-colors duration-150">
              {t("nav.contact")}
            </a>
          </div>

          <div className="lp-nav-masuk flex items-center gap-3">
            <Link href="/audit" className="lp-nav-hero-cta btn-lp-black flex items-center justify-center px-5 py-2 text-white text-[14px] font-medium leading-[1.7em] rounded-[6px] no-underline cursor-pointer">
              {t("cta.auditBrandFreeNoExclaim")}
            </Link>
          </div>

          <button
            ref={hamburgerRef}
            type="button"
            className="lp-nav-hamburger hidden bg-transparent border-none cursor-pointer p-2"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls={MOBILE_MENU_ID}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {mobileMenuOpen ? (
                <>
                  <path d="M6 6L18 18" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" />
                  <path d="M18 6L6 18" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M4 8H20" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 16H20" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>
      <MobileMenu open={mobileMenuOpen} onClose={closeMobile} t={t} />
    </>
  );
}
