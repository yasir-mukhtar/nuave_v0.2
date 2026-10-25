"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import {
  HERO_INPUT_ID,
  HERO_SECTION_ID,
  focusHeroForm,
} from "./landing-scroll";
import styles from "./StickyBar.module.css";

/**
 * Spec 019: "Gratis dulu · Audit Rp249.000" with a way back to the hero
 * form. It appears once the hero form has scrolled out of view, and hides
 * while any website form (hero, price receipt, closing) is on screen.
 * Phone: a bottom bar; from 768px: a top bar.
 */
export function StickyBar() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const forms = Array.from(document.querySelectorAll("[data-source-form]"));
    const heroForm = document
      .getElementById(HERO_INPUT_ID)
      ?.closest("[data-source-form]");
    if (!heroForm) return;
    const onScreen = new Set<Element>();
    let pastHero = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
        if (entry.target === heroForm) {
          pastHero =
            !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        }
      }
      setShown(pastHero && onScreen.size === 0);
    });
    for (const form of forms) observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(styles.bar, shown && styles.shown)}
      data-sticky-bar
      data-shown={shown || undefined}
      aria-hidden={shown ? undefined : true}
    >
      <div className={styles.inner}>
        <Brand className={styles.brand} />
        <p className={styles.text}>
          <span className={styles.free}>Gratis dulu</span>
          <span className={styles.dot} aria-hidden="true">
            {" · "}
          </span>
          <span>Audit Rp249.000</span>
        </p>
        <a
          href={`#${HERO_SECTION_ID}`}
          className={styles.cta}
          tabIndex={shown ? undefined : -1}
          onClick={(event) => {
            event.preventDefault();
            focusHeroForm();
          }}
        >
          Cek klinik saya
        </a>
      </div>
    </div>
  );
}
