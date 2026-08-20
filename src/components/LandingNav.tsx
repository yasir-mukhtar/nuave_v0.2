"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const LOGO_SVG = "/logo-nuave.svg";

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

/* ───── Mobile Menu ───── */
function MobileMenu({
  open,
  onClose,
  t,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <>
      <button
        type="button"
        className="lp-mobile-menu-overlay fixed inset-0 z-[99] bg-black/20"
        style={{
          backdropFilter: open ? "blur(1px)" : "blur(0px)",
          WebkitBackdropFilter: open ? "blur(1px)" : "blur(0px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition:
            "opacity 0.3s ease, backdrop-filter 0.35s ease, -webkit-backdrop-filter 0.35s ease",
        }}
        onClick={onClose}
      />
      <div
        className="lp-mobile-menu fixed left-4 right-4 z-[101] bg-white rounded-[12px] border border-[rgba(117,115,114,0.15)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] py-2 flex flex-col items-center"
        style={{
          top: 92,
          opacity: open ? 1 : 0,
          transform: open
            ? "translateY(0) scale(1)"
            : "translateY(-12px) scale(0.97)",
          pointerEvents: open ? "auto" : "none",
          transition:
            "opacity 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <a
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

/* ───── LandingNav ───── */
export default function LandingNav() {
  const scrolled = useScrolled();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <>
      <nav
        className="lp-nav-bar"
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
            backgroundColor: scrolled
              ? "rgba(255, 255, 255, 0.9)"
              : "transparent",
            backdropFilter: scrolled ? "blur(10px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(10px)" : "none",
            borderRadius: 12,
            border: scrolled
              ? "1px solid rgba(117, 115, 114, 0.15)"
              : "1px solid transparent",
            transition:
              "background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img
              src={LOGO_SVG}
              alt="Nuave logo"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-[20px] font-semibold text-[#0d0d0d]">
              Nuave
            </span>
          </Link>

          {/* Links (desktop) */}
          <div className="lp-nav-links flex items-center gap-8">
            <a
              href="/support"
              className="text-[14px] font-medium leading-[24px] text-[var(--lp-text-primary)] no-underline hover:text-brand transition-colors duration-150"
            >
              {t("nav.contact")}
            </a>
          </div>

          {/* CTA button (desktop) */}
          <div className="lp-nav-masuk flex items-center gap-3">
            <Link
              href="/audit"
              className="btn-lp-black flex items-center justify-center px-5 py-2 text-white text-[14px] font-medium leading-[1.7em] rounded-[6px] no-underline cursor-pointer"
            >
              {t("cta.auditBrandFreeNoExclaim")}
            </Link>
          </div>

          {/* Hamburger button (mobile) */}
          <button
            className="lp-nav-hamburger hidden bg-transparent border-none cursor-pointer p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              {mobileMenuOpen ? (
                <>
                  <path
                    d="M6 6L18 18"
                    stroke="#0d0d0d"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 6L6 18"
                    stroke="#0d0d0d"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M4 8H20"
                    stroke="#0d0d0d"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 16H20"
                    stroke="#0d0d0d"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
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
