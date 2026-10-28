/** Facts the terms, privacy, support and FAQ pages share (S5). One place, so
 * the four pages never disagree. The founder approves every customer-facing
 * word on those pages. */

/** The company that runs Nuave and its city, shown on /terms, /privacy and
 * /support (founder, 2026-10-24). */
export const OPERATOR_NAME = "PT Nuave Arah Baru";
export const OPERATOR_CITY = "Jakarta Selatan";

/** The terms' version and date. 1.2 (2026-10-28): the report is ready in
 * 30 minutes after the audit starts (was 15). */
export const LEGAL_VERSION = "1.2";
export const LEGAL_EFFECTIVE_DATE = "28 Oktober 2026";
/** The privacy page's own version and date: 1.2 adds that the cookie choice
 * is kept in the browser for 12 months (Spec 019); 1.3 names the notice's
 * English button, Allow; 1.4 (Spec 022) adds the short summary of what goes
 * to Meta and narrows server events to purchases; 1.5 (Spec 021 PR 6b) adds
 * the page reader and the public pages read for the report; 1.6 says the
 * own pages are also read for the business summary at step 3. A new version
 * asks every visitor for their cookie choice again. */
export const PRIVACY_VERSION = "1.6";
export const PRIVACY_EFFECTIVE_DATE = "28 Oktober 2026";

/** Support and privacy requests share one inbox (S0 D4; founder 2026-10-24). */
export const SUPPORT_EMAIL = "support@nuave.ai";
export const SUPPORT_REPLY = "1 hari kerja";
