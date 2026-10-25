/**
 * The CSS variables the fixed bars at the bottom of the screen set on
 * `<html>` while they show, so each can sit clear of the others. Kept apart
 * from the bars themselves, so the cookie notice (on every page) can read
 * them without loading the journey's bars.
 */

/** The `/audit` journey's bottom bar height (`BottomBar` in JourneyBars). */
export const BOTTOM_BAR_HEIGHT_VAR = "--journey-bottom-bar";

/** Spec 019 R-14: the room the open cookie notice takes, its height plus a
 * small gap (`CookieConsent`). Unset while the notice is closed. */
export const NOTICE_CLEAR_VAR = "--cookie-notice-clear";
