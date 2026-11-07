# Report v3: two proofs of concept

Built on 2026-11-07 at the founder's request, before deciding whether to
approve [`docs/drafts/REPORT_V3_PLAN.md`](../../docs/drafts/REPORT_V3_PLAN.md)
(decision F-1). They show what a report and its worksheet ("Lembar Kerja")
would look like under that plan. They are not product code: the product
builds its report in the Next.js app, and every phase of the plan still needs
its own approved spec.

| | A: the ceiling | B: real evidence |
| --- | --- | --- |
| Data | Invented. Every clinic, answer and site is made up (`.example` domains). | The saved ChatGPT and Google answers from the Nuave test of 24 October 2026 (`../dataforseo-sozo/`), plus 31 plain page loads on 7 November 2026. |
| Clinic name | Ultima Clinic | Ultima Clinic (the real clinic renamed; its domain becomes `ultimaclinic.example`) |
| Says | Everything the plan can show when the data is rich. | Only what the evidence supports; empty where the test collected nothing. |
| Page | `dist/ultima-a.html` | `dist/ultima-b.html` |
| PDF | `dist/Laporan-Ultima-A.pdf` | `dist/Laporan-Ultima-B.pdf` |
| Worksheet | `dist/Lembar-Kerja-Ultima-A.xlsx` | `dist/Lembar-Kerja-Ultima-B.xlsx` |

## Build

From the repository root (no network calls):

```bash
python3 experiments/report-v3-poc/build.py
```

```bash
node experiments/report-v3-poc/render.mjs
```

The first writes the pages and worksheets; the second prints the PDFs and
takes phone and desktop screenshots into `dist/shots/` (not kept in Git). The
build needs `openpyxl`; the render uses the pre-installed Playwright.

## Files

- `template.html`: one page for both data sets. Every count (cards, bars,
  competitor counts, cited sites, the starting point) is computed from the
  answers' statuses, not written by hand.
- `data/ultima_a.py`, `data/ultima_b.py`: the two data sets. B reads the saved
  answers at build time and renames the clinic; links that would reveal it
  stay as plain text.
- `worksheet.py`: the worksheet, built from the same data as the page. Its
  summary numbers are live formulas over the "Pertanyaan & Hasil" tab, status
  cells are drop-down lists, and progress counts itself. Both worksheets were
  recalculated in LibreOffice and match their reports.
- `build.py`: refuses a report that breaks the plan's rules: every fact quote
  must appear word for word in its answer; safety and licensing claims get no
  verdict; businesses and recommendations must exist in the answers; a
  recommendation needs a playbook item; no em dashes in report prose; the
  verdict stays under 220 characters; recommendation titles never start with
  "Periksa", "Pertahankan", "Pertimbangkan" or "Pastikan".
- `evidence/`: the record behind B (`evidence.json`, `NOTES.md`, the page-load
  log). Doctor names and STR numbers are redacted; raw pages are not kept.

## What B shows about the plan

- The old test asked each question to one source only (ChatGPT for 1 to 5,
  Google for 6 to 10), so B's cards count 4 ChatGPT answers and 3 Google
  summaries. The product asks every question to both.
- Two test questions name the clinic. B shows them apart and does not count
  them, which is what decision F-4 would add. One of them is about safety; the
  plan never asks that, so B shows it as an old test, as is.
- The stability sample, the owner's own words, and search volume for most
  questions are empty in B because the test did not collect them. The page
  says so instead of filling them in.

## Limits

- Fact checks compare the AI's sentences with the clinic's own site text.
  Promo prices on that site are images, so they could not be read.
  Traveloka, tiket.com, Tokopedia and Instagram refused the plain page loads.
- The page is published without a document skeleton (the artifact host adds
  it); `*.local.html` is the same page with one, for a browser and the PDF.
- The download buttons only show a note: in the product they download the
  PDF and the worksheet.
