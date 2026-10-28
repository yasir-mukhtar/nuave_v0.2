import { motionAllowedNow } from "@/components/motion/useMotionAllowed";

/** The hero form's field: every "Cek klinik saya" button brings it back. */
export const HERO_INPUT_ID = "hero-source";
export const HERO_SECTION_ID = "mulai";

/** The menu's sections, in page order. */
export const SECTION_LINKS = [
  { id: "cara-kerja", label: "Cara kerja" },
  { id: "laporan", label: "Laporan" },
  { id: "harga", label: "Harga" },
  { id: "faq", label: "FAQ" },
] as const;

function scrollBehavior(): ScrollBehavior {
  return motionAllowedNow() ? "smooth" : "auto";
}

/** Scrolls the hero form into view and puts the cursor in its field. */
export function focusHeroForm() {
  const input = document.getElementById(HERO_INPUT_ID);
  if (!(input instanceof HTMLInputElement)) return;
  input.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
  input.focus({ preventScroll: true });
}

/**
 * Scrolls to a section and moves focus to its heading, so keyboard and
 * screen-reader users land where the page now shows. The address keeps the
 * section's `#id`, as a plain link would.
 */
export function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  const heading = section.querySelector<HTMLElement>("h2");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  history.replaceState(null, "", `#${id}`);
}
