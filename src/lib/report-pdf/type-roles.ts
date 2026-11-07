/**
 * Spec 024 F-02, AC-G2: the type roles of the designed PDF pages and the
 * minimum size of each, in CSS px, measured on the reference export
 * (experiments/report-pdf-design/reference.pdf at 1 pt = 1 px, against the
 * same font files rendered in Chromium at known sizes; PR1_NOTES.md). Every
 * text element of a PDF page carries `data-type="<role>"`; the print check
 * fails any element whose computed size is below its role's minimum. The
 * sizes themselves live in `tokens.css` (`.report-pdf`).
 */
export const REPORT_TYPE_MIN = {
  /** Cover title (Newsreader Light). Reference: 72. */
  display: 72,
  /** Divider number "01" (Newsreader Light). Reference: about 210. */
  "section-number": 200,
  /** Divider title (Newsreader Light). Reference: 60. */
  "section-title": 60,
  /** A card's or finding's large number (Newsreader). Reference: 72 on
   * Ringkasan, 96 in the appendix. Used from Part 2. */
  "big-number": 72,
  /** Page title and Daftar isi lead (Newsreader). Reference: 36 and 38. */
  title: 36,
  /** Penutup's conclusion and the back cover line (Newsreader Light).
   * Reference: 30 and 26. */
  statement: 26,
  /** "Isi laporan", column, step and row titles (Newsreader). Reference:
   * 26, 22 and 20. */
  heading: 20,
  /** Cover and divider ledes (Geist). Reference: 18. */
  lede: 18,
  /** Body text and appendix answers (Geist). Reference: 14. */
  text: 14,
  /** Row notes and legends (Geist). Reference: 12. */
  small: 12,
  /** Source notes (Geist). Reference: 11. Used from Part 3. */
  caption: 11,
  /** Uppercase labels and eyebrows (Roboto Condensed). Reference: 12. */
  label: 12,
  /** Page footer (Roboto Condensed). Reference: 12. */
  footer: 12,
  /** Page number and appendix label (Roboto Condensed). Reference: 11. */
  "page-number": 11,
  /** Text that shows code (Geist Mono). No code text in the reference's
   * Part 1 pages; 13 is the appendix table size. Used from later Parts. */
  code: 13,
} as const;

export type TypeRole = keyof typeof REPORT_TYPE_MIN;

/** The `tokens.css` size variable of each role. */
export const TYPE_TOKEN: Record<TypeRole, string> = {
  display: "--pdf-type-display",
  "section-number": "--pdf-type-section-number",
  "section-title": "--pdf-type-section-title",
  "big-number": "--pdf-type-big-number",
  title: "--pdf-type-title",
  statement: "--pdf-type-statement",
  heading: "--pdf-type-heading-sm",
  lede: "--pdf-type-lede",
  text: "--pdf-type-text",
  small: "--pdf-type-small",
  caption: "--pdf-type-caption",
  label: "--pdf-type-label",
  footer: "--pdf-type-footer",
  "page-number": "--pdf-type-page-number",
  code: "--pdf-type-code",
};
