/**
 * Canonical screen order for the new Airbnb-inspired intake journey.
 *
 * Derived from document order of the `s-*` sections in
 * `intake-prototype.html` (prototype screens, lines ~531-685). This constant
 * is the single source of truth for screen sequence; the `IntakeJourney`
 * shell renders screens in exactly this order.
 *
 * Why `src/lib/intake/` (and not a route-colocated module): the shell and
 * screen order are router-independent journey logic. Living in `lib/` keeps
 * them importable by the guard test and any future entry without coupling to
 * the App Router, while the only route surface stays a single thin preview
 * page. See `README.md` in this directory.
 *
 * Isolation rule: nothing in this directory may import legacy intake
 * presentation (see README.md). The guard test enforces this.
 */

export const INTAKE_SCREEN_ORDER = [
  "s-crawl",
  "s-brand",
  "s-brand-fix",
  "s-scope",
  "s-branch",
  "s-product",
  "s-category",
  "s-offerings",
  "s-customers",
  "s-service",
  "s-market",
  "s-competitors",
  "s-facts",
  "s-review",
  "s-questions",
] as const;

export type IntakeScreenId = (typeof INTAKE_SCREEN_ORDER)[number];

export const FIRST_INTAKE_SCREEN: IntakeScreenId = INTAKE_SCREEN_ORDER[0];

export const LAST_INTAKE_SCREEN: IntakeScreenId =
  INTAKE_SCREEN_ORDER[INTAKE_SCREEN_ORDER.length - 1];

export function isIntakeScreenId(value: string): value is IntakeScreenId {
  return (INTAKE_SCREEN_ORDER as readonly string[]).includes(value);
}

/** 1-based position of a screen in the canonical order, for progress UI. */
export function intakeScreenPosition(screenId: IntakeScreenId): number {
  return INTAKE_SCREEN_ORDER.indexOf(screenId) + 1;
}
