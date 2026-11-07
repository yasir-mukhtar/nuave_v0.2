# Report v3: two proofs of concept

Built on 2026-11-07 at the founder's request, before deciding whether to
approve [`docs/REPORT_V3_PLAN.md`](../../docs/REPORT_V3_PLAN.md) (decision
F-1). The founder approved the plan the same day, preferring proof A's voice
(plan §4 rule 14). The PDF's look now comes from the PDF design plan (16:9);
these pages remain the reference for content and counts. They show what a report and its worksheet ("Lembar Kerja")
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
  answers' statuses, not written by hand, and kept per source (plan,
  "Counts on the PDF pages"). Competitor cards show mentions per source;
  "Direkomendasikan" appears for the clinic only, because the product saves
  no recommendations for other businesses.
- `data/ultima_a.py`, `data/ultima_b.py`: the two data sets. B reads the saved
  answers at build time and renames the clinic; links that would reveal it
  stay as plain text.
- `worksheet.py`: the worksheet, built from the same data as the page. Its
  summary numbers are live formulas over the "Pertanyaan & Hasil" tab (which
  lists the businesses each answer names, as plan P0.10 says), status cells
  are drop-down lists, and progress counts itself. Both worksheets were
  recalculated in LibreOffice and match their reports.
- `build.py`: stops the build when a report breaks one of these checks:
  - every business an answer is said to name or recommend is in the business
    list and appears, by name or alias, in that answer's text (the data's
    `rec` lists are checked but not shown);
  - every fact quote appears word for word in its answer, and every other
    quotation (in curly or straight double quotes) in the report's own text
    appears in the answers, the questions,
    cited page titles, the facts, or the site quotes the data file lists
    (for B, `data/ultima_b.py` also checks each site quote against
    `evidence/evidence.json`);
  - a claim about safety, licensing, registration (STR, SIP) or medical
    supervision (a fixed word list, or a "Keamanan" topic) gets no verdict and
    no reference;
  - each recommendation uses a playbook item that exists in
    `docs/content/report/PLAYBOOK.md` and has its tags in the data;
  - at most eight fact rows in the report (plan P1.2) and five names in the
    moment of truth (P0.1);
  - each word in "Kata AI" is in the clinic's passage in every answer it
    is counted in, and in no such passage in the other answers of its
    source. The passage is a line naming the clinic, with the sub-items
    under it, or the section under a heading naming it, up to the next
    heading; either stops at a line naming another business in the data.
    A lead-in line that does not name the clinic does not count; the note names the source, the denominator and
    the answers counted ("dari 4 jawaban ChatGPT ... (P1, P4, P7, P8)");
  - a topic's count of other clinics names its source;
  - no em dashes anywhere in the report's own text, the kit's texts included,
    a verdict under 220
    characters, and no recommendation title starting with "Periksa",
    "Pertahankan", "Pertimbangkan" or "Pastikan".

  It does not judge whether a sentence implies a cause, whether a hand-set
  status is right, or whether a word in the clinic's passage is said about
  the clinic ("saya sarankan Ultima Clinic atau klinik lain" holds "klinik
  lain"); a sentence that runs onto a line without the name is also not
  read. The independent reviews on the pull request did that, and plan
  P2.3's spec counts within the clinic's passage. It reads the
  data files from source every time, never from a cached copy.
- `evidence/`: the record behind B (`evidence.json`, `NOTES.md`, the page-load
  log). Doctor names and STR numbers in page text are redacted (page URLs are
  kept as cited); raw pages are not kept. Search volumes come from
  `../dataforseo-sozo/results/discover/SUMMARY.md`.

## What B shows about the plan

- The old test asked each question to one source only (ChatGPT for 1 to 5,
  Google for 6 to 10), so B's cards count 4 ChatGPT answers and 3 Google
  summaries. The product asks every question to both.
- Two test questions name the clinic. B shows them apart and does not count
  them, which is what decision F-4 would add. One of them is about safety; the
  plan never asks that, so B shows it as an old test, as is.
- The report shows eight of the 36 checked claims; the worksheet lists all
  36, as the plan now says (P1.2, P1.3).
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
