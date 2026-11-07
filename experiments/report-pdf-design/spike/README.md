# Step 0 spike: a maximum-length report PDF

A throwaway test for [`docs/REPORT_PDF_DESIGN_PLAN.md`](../../../docs/REPORT_PDF_DESIGN_PLAN.md)
§7, Step 0. It is not product code and nothing in the app uses it.

- `build.py` writes one HTML file with every page the §5.2 page list can
  hold at its largest. Each writer text is filled to its Spec 021 B-04 word limit
  (`src/lib/audit/two-source-writing.ts`), times a scale factor.
- `measure.mjs` prints that file in Chromium with the PDF options the new
  print request needs (`preferCSSPageSize`, `printBackground`, zero margins).
  It reports the load, ready and print times, the file size, the fonts that
  loaded, and every content box whose text does not fit.
- `fonts.py` downloads the latin subset of the four fonts (Newsreader, Geist,
  Roboto Condensed, Geist Mono) from Google Fonts and writes them as base64
  `@font-face` rules in `fonts.css`, which `build.py` embeds.

The page layout only approximates the Figma: it uses the same page box and
type sizes, but simpler blocks (a table instead of Pesaing's bars and chips,
and each appendix answer across the full width in two columns instead of the
Figma's question column with ChatGPT and Google side by side).

## How to run it

From the repository root, after `npm ci`:

```bash
python3 -I experiments/report-pdf-design/spike/fonts.py /tmp/spike
```

```bash
python3 -I experiments/report-pdf-design/spike/build.py /tmp/spike/fonts.css /tmp/spike/max.html 1.0 1200 400
```

```bash
CHROMIUM_PATH=/opt/pw-browsers/chromium node experiments/report-pdf-design/spike/measure.mjs /tmp/spike/max.html /tmp/spike/max.pdf
```

The arguments after the HTML path are the word-limit scale, the ChatGPT
answer length and the Google answer length. `CHROMIUM_PATH` is needed only
when the installed browser does not match the `@playwright/test` version.

## Results, 2026-11-07 (local Chromium in the cloud session)

| Case | Pages | Load | Ready | Print | PDF size | Text that does not fit |
| --- | --- | --- | --- | --- | --- | --- |
| Word limits ×1.0; ChatGPT answers 1,200 words, Google 400 | 86 | 0.2 s | 0.06 s | 0.24 s | 644 KB | none |
| Word limits ×1.25; same answers | 86 | 0.1 s | 0.07 s | 0.23 s | 656 KB | Pesaing (743 of 626 px), Cek fakta (640 of 626 px) |
| Word limits ×1.0; ChatGPT answers 500 words, Google 200 | 66 | 0.1 s | 0.06 s | 0.18 s | 533 KB | none |

## Results, 2026-11-07 (Cloudflare Browser Run)

The same three HTML files, sent to Browser Run's REST PDF endpoint
(`/accounts/<id>/browser-rendering/pdf`) with the HTML inline, the same wait
for `[data-saved-report="ready"]` (20 s) and a 30 s load limit, and
`preferCSSPageSize` and `printBackground`. The founder added the Browser Run
permission to the session's token for this run.

| Case | Pages | Whole request | Browser time used | PDF size |
| --- | --- | --- | --- | --- |
| Word limits ×1.0; answers 1,200 and 400 words | 86 | 2.2 s | 0.87 s | 852 KB |
| Word limits ×1.25; same answers | 86 | 1.3 s | 0.60 s | 863 KB |
| Word limits ×1.0; answers 500 and 200 words | 66 | 0.8 s | 0.40 s | 713 KB |

"Whole request" is measured from this session and includes the upload of the
HTML (about 580 KB with the fonts). "Browser time used" is Browser Run's own
`x-browser-ms-used` header. The page count, page size (1080 × 607.9 pt) and
fonts (Newsreader, Geist and Roboto Condensed embedded, as Type 3) match the
local run, and a rendered page shows the web fonts in use.

What this shows:

1. **The page count is larger than the plan's "about 47".** The v3 pages add
   about nine pages, and long answers add continued pages: at about 420 words
   of answer per page, a 1,200-word ChatGPT answer plus a 400-word Google
   answer is four pages per question. The answer lengths are assumptions
   until the real ones are measured (below).
2. **Time and size are far inside the limits, in Browser Run too.** The
   limits are 30 s to load and 20 s for the ready marker
   (`src/lib/orders/report-pdf.ts`). The longest case took 2.2 s in all and
   0.87 s of browser time, and the PDF is under 1 MB.
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
5. **Page size.** The PDF pages are 1080 × 607.9 pt, which is 1440 × 810
   CSS px (about 381 × 214 mm), as D-2 intends. The reference export is
   1440 × 810 pt: the same shape at a larger physical size. §8's size check
   should say CSS px.

## Limits of this run

- **The appendix holds fewer words per page in the real design.** The
  Figma pages give a column to the question, topic and notes, and show
  ChatGPT and Google side by side, so a real page holds fewer than about 420
  words and 86 pages is likely an underestimate at these answer lengths.
- **Answers are plain repeated words.** Real answers have lists, tables and
  line breaks, which take more room.
- **Answers are split before printing, by word count.** The plan's split by
  measuring in the browser (§6.4), and the data the real print page loads,
  are not in the timings.
- **Bahan siap pakai is one page here.** At its maximum it may be five
  ("1 dari 5" in the Figma). The two questions that name the clinic (v3
  F-4) would add appendix pages if F-4 is approved.
- **"Every page fits" holds for these approximate pages only,** not yet for
  the Figma templates.

- **Browser Run was called through its REST endpoint with the HTML inline,**
  not through the Worker's binding opening the print page on a preview. The
  real path adds the page's own load from the Worker (its data and the font
  files), which these timings do not include.

## Not done yet

- **The longest texts saved on Nuave's orders.** These are in the production
  database. The founder allowed reading their lengths, but this session's
  permission settings block production reads, so it waits for a permission
  rule. The spec needs these before it sets each page's word budget.
