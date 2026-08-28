"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

export default function LandingNav({
  overlayHero = false,
}: {
  overlayHero?: boolean;
}) {
  const scrolled = useScrolled();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations();

  useEffect(() => {
    const onResize = () => {
      if (globalThis.innerWidth > 768) setMobileMenuOpen(false);
    };
    globalThis.addEventListener("resize", onResize);
    return () => globalThis.removeEventListener("resize", onResize);
  }, []);

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
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
          maxWidth: 1200,
          padding: "12px 24px",
          zIndex: 100,
        }}
      >
        <div
          className="lp-nav-inner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 44,
            padding: "0 4px",
            backgroundColor: scrolled
              ? "rgba(250, 250, 252, 0.88)"
              : "transparent",
            backdropFilter: scrolled ? "blur(20px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
            borderRadius: scrolled ? 20 : 0,
            border: "0",
            transition:
              "background-color 0.3s ease, border-radius 0.3s ease, backdrop-filter 0.3s ease",
          }}
        >
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img
              src={LOGO_SVG}
              alt="Nuave logo"
              width={24}
              height={24}
              className="lp-nav-brand-logo object-contain"
            />
            <span className="lp-nav-brand-text text-[17px] leading-[25px] tracking-[-0.374px] font-semibold text-[#1D1D1F]">
              Nuave
            </span>
          </Link>

          <div className="lp-nav-links flex items-center gap-8">
            <a
              href="/support"
              className="lp-nav-contact text-[12px] font-normal leading-4 tracking-[-0.12px] text-[#474747] no-underline hover:text-[#1D1D1F] transition-colors duration-150"
            >
              {t("nav.contact")}
            </a>
          </div>

          <div className="lp-nav-masuk flex items-center gap-3">
            <Link
              href="/audit"
              className="lp-nav-hero-cta btn-lp-purple flex items-center justify-center px-4 py-2 text-white text-[14px] font-normal leading-[18px] tracking-[-0.224px] rounded-full no-underline cursor-pointer"
            >
              {t("cta.auditBrandFreeNoExclaim")}
            </Link>
          </div>

          <SheetTrigger
            render={
              <Button
                ref={hamburgerRef}
                type="button"
                variant="ghost"
                size="icon-lg"
                className="lp-nav-hamburger hidden min-h-11 min-w-11 rounded-full text-[#1D1D1F]"
                aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls={mobileMenuOpen ? MOBILE_MENU_ID : undefined}
              >
                {mobileMenuOpen ? <IconX /> : <IconMenu2 />}
              </Button>
            }
          />
        </div>
      </nav>

      <SheetContent
        id={MOBILE_MENU_ID}
        side="right"
        className="lp-mobile-menu w-[calc(100%-2rem)] max-w-sm rounded-l-[28px] border-l-0 bg-[#FAFAFC] p-4"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("nav.contact")}</SheetTitle>
          <SheetDescription>Menu navigasi Nuave</SheetDescription>
        </SheetHeader>
        <div className="mt-10 flex flex-col items-stretch gap-2">
          <a
            id="nuave-mobile-menu-first-link"
            href="/support"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-full px-5 py-3.5 text-center text-[17px] font-normal tracking-[-0.022em] text-[#1D1D1F] no-underline transition-colors hover:bg-[#E8E8ED] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("nav.contact")}
          </a>
          <Link
            href="/audit"
            onClick={() => setMobileMenuOpen(false)}
            className="btn-lp-purple flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-[17px] font-normal tracking-[-0.022em] text-white no-underline"
          >
            {t("cta.auditBrandFreeNoExclaim")}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
