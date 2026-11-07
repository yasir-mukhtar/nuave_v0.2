# Step 0 spike: a maximum-length report PDF

A throwaway test for [`docs/REPORT_PDF_DESIGN_PLAN.md`](../../../docs/REPORT_PDF_DESIGN_PLAN.md)
§7, Step 0. It is not product code and nothing in the app uses it.

- `build.py` writes one HTML file with every page the §5.2 page list can
  hold at its largest. Each writer text is filled to its Spec 023 word limit
  (`src/lib/audit/two-source-writing.ts`), times a scale factor.
- `measure.js` prints that file in Chromium with the PDF options the new
  print request needs (`preferCSSPageSize`, `printBackground`, zero margins).
  It reports the load, ready and print times, the file size, the fonts that
  loaded, and every content box whose text does not fit.

The fonts (Newsreader, Geist, Roboto Condensed, Geist Mono) are downloaded
from Google Fonts at run time and embedded as base64. The page layout only
approximates the Figma: it uses the same page box, type sizes and column
widths, which is enough to measure time, size and fit.

## Results, 2026-11-07 (local Chromium in the cloud session)

| Case | Pages | Load | Ready | Print | PDF size | Text that does not fit |
| --- | --- | --- | --- | --- | --- | --- |
| Word limits ×1.0; ChatGPT answers 1,200 words, Google 400 | 86 | 0.2 s | 0.06 s | 0.24 s | 644 KB | none |
| Word limits ×1.25; same answers | 86 | 0.1 s | 0.07 s | 0.23 s | 656 KB | Pesaing (743 of 626 px), Cek fakta (640 of 626 px) |
| Word limits ×1.0; ChatGPT answers 500 words, Google 200 | 66 | 0.1 s | 0.06 s | 0.18 s | 533 KB | none |

What this shows:

1. **The page count is larger than the plan's "about 47".** The v3 pages add
   about nine pages, and long answers add continued pages: at about 420 words
   of answer per page, a 1,200-word ChatGPT answer plus a 400-word Google
   answer is four pages per question. The answer lengths are assumptions
   until the real ones are measured (below).
2. **Time and size are far inside the limits on a local browser.** The
   limits are 30 s to load and 20 s for the ready marker
   (`src/lib/orders/report-pdf.ts`). Browser Run adds its own start-up and
   network time, which this run could not measure (below).
3. **At the word limits every page fits.** At 25% over the limits, two pages
   overflow: Pesaing (six rows with 20-word reasons, 15 chips and three
   takeaways) and Cek fakta (eight rows). These two need either a tighter
   budget or the overflow rule in §6.3.
4. **Fonts embed, but as Type 3.** Chromium embeds variable woff2 fonts as
   Type 3 fonts. Type 3 text can look soft in some PDF viewers and copies
   less reliably. PR 1 should test static (one weight per file) font files,
   which Chromium embeds as TrueType. One fallback font (Liberation Sans)
   also appears, for the "●" and "○" marks that the Latin subset of Geist
   lacks. The real pages draw those marks as shapes, so it should not recur.

## Not done yet

- **Browser Run.** The Cloudflare token in this session cannot call Browser
  Run (the REST call answered "Authentication error"). PR previews, which do
  have the binding, are not deployed for a draft, docs-only PR.
- **The longest texts saved on Nuave's orders.** These are in the production
  database. Reading them needs the founder's permission.

Both are needed before the spec sets each page's word budget.
