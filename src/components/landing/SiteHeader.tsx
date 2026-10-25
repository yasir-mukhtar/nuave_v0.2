"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  HERO_SECTION_ID,
  SECTION_LINKS,
  focusHeroForm,
  scrollToSection,
} from "./landing-scroll";
import { Brand } from "./Brand";
import { useMinWidth } from "./use-min-width";
import styles from "./SiteHeader.module.css";

/**
 * The landing's menu. Laptop: logo, four section links, "Cek klinik saya".
 * Phone and tablet: logo, "Cek klinik saya" and a menu button that opens a
 * sheet with the same links (Escape or its close button closes it, and focus
 * returns to the menu button).
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  // A link chosen in the sheet: scrolled to once the sheet has closed, so
  // the sheet's scroll lock cannot undo the jump.
  const pending = useRef<string | null>(null);
  // From 1024px the menu button hides and the laptop links show. Widening
  // the window (a tablet turned sideways) closes the sheet, and focus moves
  // to the first of those links.
  const wide = useMinWidth(1024);
  const firstLink = useRef<HTMLAnchorElement>(null);
  if (wide && open) setOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" aria-label="Nuave, ke beranda" className={styles.brand}>
          <Brand />
        </Link>

        <nav aria-label="Bagian halaman" className={styles.links}>
          {SECTION_LINKS.map(({ id, label }, index) => (
            <a
              key={id}
              ref={index === 0 ? firstLink : undefined}
              href={`#${id}`}
              className={styles.link}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(id);
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <a
            href={`#${HERO_SECTION_ID}`}
            className={styles.cta}
            onClick={(event) => {
              event.preventDefault();
              focusHeroForm();
            }}
          >
            Cek klinik saya
          </a>

          <Sheet
            open={open}
            onOpenChange={(isOpen) => {
              // A fresh opening forgets the last chosen link.
              if (isOpen) pending.current = null;
              setOpen(isOpen);
            }}
            onOpenChangeComplete={(isOpen) => {
              const id = pending.current;
              if (isOpen || !id) return;
              if (id === HERO_SECTION_ID) focusHeroForm();
              else scrollToSection(id);
            }}
          >
            <SheetTrigger className={styles.menuButton} aria-label="Buka menu">
              <IconMenu2 size={18} stroke={1.75} aria-hidden="true" />
            </SheetTrigger>
            <SheetContent
              side="top"
              showCloseButton={false}
              className={styles.sheet}
              finalFocus={() => {
                if (pending.current) return false;
                return wide ? firstLink.current : true;
              }}
            >
              <div className={styles.sheetHead}>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Brand />
                <SheetClose
                  className={styles.menuButton}
                  aria-label="Tutup menu"
                >
                  <IconX size={18} stroke={1.75} aria-hidden="true" />
                </SheetClose>
              </div>
              <nav aria-label="Bagian halaman" className={styles.sheetLinks}>
                {SECTION_LINKS.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={styles.sheetLink}
                    onClick={(event) => {
                      event.preventDefault();
                      pending.current = id;
                      setOpen(false);
                    }}
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <a
                href={`#${HERO_SECTION_ID}`}
                className={styles.sheetCta}
                onClick={(event) => {
                  event.preventDefault();
                  pending.current = HERO_SECTION_ID;
                  setOpen(false);
                }}
              >
                Cek klinik saya
              </a>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
