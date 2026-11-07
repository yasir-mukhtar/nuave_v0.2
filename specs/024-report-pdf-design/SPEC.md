# Spec 024: The designed report PDF (16:9)

> Status: **In review**. The founder answered Q-3, Q-4, Q-10 and Q-11 on
> 2026-11-07 (all as recommended); the spec awaits the founder's approval.
> Owner: founder; drafted by Claude on `claude/vigilant-cerf-e5kktf`
> Updated: 2026-11-07, revision 5. Revision 5 records the founder's answers
> to Q-3, Q-4, Q-10 and Q-11 and applies the two minor notes of the review
> of `348138a` (1.5 times cases for Ringkasan and Celah topik, AC-S6b;
> Pesaing in Q-1). Revision 4 applies the review of
> `91a6890` (PASS+NOTES): Q-3 as three options, an AC for the log cause
> (AC-F12), the Lampiran divider in Part 3, L-06 and L-07 in order, and the
> 7 saved reports in Q-11. Revision 3 applied the review of
> `f885989` (PASS+NOTES): AC-G3 limited to counts, the designed-print switch
> (F-10), Rencana continued pages, one template-ownership rule, the font
> failure rule, and dividers only for sections with a page. Revision 2
> applied the review of `72660aa`: Part 5, checkable AC-G2 and AC-G3, the
> ready rule split between Parts 1 and 3, S-01 to S-03 made exact, Q-2 and
> Q-5 to Q-9 settled.
> Implements: [`docs/REPORT_PDF_DESIGN_PLAN.md`](../../docs/REPORT_PDF_DESIGN_PLAN.md)
> (approved 2026-11-07, D-0 to D-10;
> [decision](../../docs/DECISION_LOG.md#2026-11-07--approve-the-pdf-report-design-plan-d-0-to-d-10)),
> its §7 packages PR 1, PR 2, PR 3, PR 4 and PR 4b. Amends
> [Spec 021](../021-report-v2/SPEC.md) Part P (plan D-10).

## Required context

Read in order:

1. `AGENTS.md`.
2. [`docs/REPORT_PDF_DESIGN_PLAN.md`](../../docs/REPORT_PDF_DESIGN_PLAN.md),
   all of it. This spec links to its sections instead of copying them.
3. The Report v3 plan (`docs/REPORT_V3_PLAN.md` on PR #205, revision 6.4):
   "Approval and alignment", "Format of the report PDF" and "Counts on the
   PDF pages". It owns what each page says, the page order and the counting
   rule (plan §5.3).
4. Step 0 results: [`experiments/report-pdf-design/README.md`](../../experiments/report-pdf-design/README.md)
   (the reference export) and
   [`experiments/report-pdf-design/spike/README.md`](../../experiments/report-pdf-design/spike/README.md).
5. [Spec 021](../021-report-v2/SPEC.md): Part P (the server PDF this
   replaces), Part B (B-04 limits, B-05 headline numbers), A-05, A-07, AC-A5.
6. [Spec 018](../018-search-grounded-chatgpt-google-audit/SPEC.md): the
   "Report layout" count sentences, R-20 (failed slot), R-28 (privacy),
   R-29 (old reports), AC-20 ("Klinik Anda").
7. `docs/VOICE.md` (dashes, settled labels), `docs/DESIGN.md` (fonts, tokens,
   report exception), `docs/AUDIT.md` (per-source denominators).
8. Code: `src/lib/orders/report-pdf.ts`, `src/app/api/report/pdf/route.ts`,
   `src/app/r/print/page.tsx`, `src/app/r/SavedReport.tsx`,
   `src/lib/audit/two-source-report.ts`, `src/lib/audit/two-source-writing.ts`,
   `src/app/audit/report/TwoSourceReport.tsx`,
   `src/app/audit/report/report-v2-data.ts`, `src/lib/orders/mail.ts`,
   `src/app/fonts.ts`, `src/styles/tokens.css`.

Do not load: `archive/`, older report prototypes, the parked PRs named in
`AGENTS.md`.

## Problem

Observed: the server PDF (Spec 021 Part P) is an A4 print of the phone-first
web report. The founder approved a different look on 2026-11-07: a 16:9,
presentation-ready PDF that reads like an agency report (Figma "Redesain
Report Nuave", exported as `experiments/report-pdf-design/reference.pdf`,
39 pages). Nothing in the product makes that PDF from an order's saved data.

## Desired outcome

Every two-source report's "Unduh PDF" gives the designed 16:9 PDF, filled
only from that report's saved data, with every count per source and nothing
cut off. The finish line is the plan's §3.

## User and situation

The clinic owner (and the people they show it to: a partner, a web vendor, a
meeting room) opens the PDF after the report-ready email. They want a report
they can present and act on, without the web page beside it.

## Scope

| Part | Plan package | What it builds |
| --- | --- | --- |
| Part 0 | all | Rules every Part keeps, the limits, the budgets, the fixed text |
| Part 1 | PR 1 | Fonts and tokens, the print request, the designed-print switch, the page box, the page list, the ready rule, the always-present pages and the divider template |
| Part 2 | PR 2 | The report pages filled from saved data, with code headlines |
| Part 3 | PR 3 | The appendix (Lampiran); turns the designed print on in production |
| Part 4 | PR 4 | One line on the web report and in the report-ready email |
| Part 4b | PR 4b | The "Unduh Lembar Kerja" button on the web report |
| Part 5 | One PR with each v3 Phase 0 package | The page templates for v3 Phase 0: the moment page, the Cara membaca additions, the Rencana and Langkah tags, the Penutup decisions, the Lembar Kerja page |

## Non-scope

- A redesign of the web report. It stays frozen at Spec 021 v2 (D-1 A),
  except the line of Part 4 and the button of Part 4b.
- The data, claims, counts and rules of every Report v3 package. They stay
  with v3's specs (plan §5.3).
- The templates of v3 packages after Phase 0 are not written yet: Cek fakta
  (P1.2), Kata AI dan kata Anda (P2.3), Halaman mereka (P2.2), Situs yang
  dibaca AI (P2.1), Untuk tim web Anda (P1.1), Bahan siap pakai (P2.4), the
  Titik Awal tab line (P3.3), the stability box and re-asks (P3.2), v3's
  answer notes on A0 and the two questions that name the clinic (F-4).
  Until then such a page or part is left out (G-02). **Template ownership,
  one rule:** Spec 024 owns every PDF template; v3's specs own the data.
  Each later template is added to this spec as a reviewed change (a new
  Part, like Part 5) in the same PR as its v3 package (plan §7 "Later PRs",
  §5.3 rule 3).
- The worksheet file itself (v3 P0.10). Part 4b only adds its button.
- Email changes beyond Part 4's one line.
- D-1 options B and C (closing the web report).
- A4 portrait, dark mode for the whole report, translated reports.
- New writer fields (D-9 option B), new counts, pooled numbers, or any change
  to how the report counts (`docs/AUDIT.md`, Spec 018).
- A re-run button, a scheduled re-check, or any promised date (D-7, D-8).
- Reports saved before Spec 018: their web page and their print stay
  exactly as today (Spec 018 R-29, Spec 021 AC-A5 and P-05).
- Prices, refunds, the delivery promise.

## Experience

The owner opens the private link from the report-ready email and sees the
frozen web report. "Unduh PDF" behaves exactly as Spec 021 "Experience",
"PDF" says: a spinner for a few seconds, then the file
`Laporan-Nuave-<klinik>.pdf`; on failure a short retry message, with the
page itself unaffected. What changes is the file: 16:9 pages in the Part 0
order, in Indonesian, read on a screen, in a meeting or printed on A4
landscape with "fit to page" (D-2). Part 4 adds one line saying the PDF is
the full designed report; Part 4b adds "Unduh Lembar Kerja" beside "Unduh
PDF" once the worksheet exists.

## Decisions recorded

D-1 to D-13 were settled by the founder on 2026-11-07; D-14 is Report v3's.
The plan's §4 holds the full text; this spec does not reopen them.

| # | Decision |
| --- | --- |
| D-1 | Option A: the web report stays frozen at Spec 021 v2 and is the fallback when a PDF cannot be made; only the PDF gets the design. B or C later, by its own spec. |
| D-2 | 16:9 landscape, 1440 × 810 CSS px (about 381 × 214 mm), not A4. |
| D-3 | Newsreader (headlines, big numbers), Geist (text), Roboto Condensed (labels, page numbers), Geist Mono only for text that shows code; loaded through `src/app/fonts.ts`; report type values in `tokens.css`; the `DESIGN.md` exceptions listed in the plan. |
| D-4 | The corrected Figma is the visual reference, exported once to `experiments/report-pdf-design/reference.pdf`. Where it and a spec disagree, the spec wins. |
| D-5 | Appendix notes ("Catatan Nuave") come from code: a fixed sentence with blanks, only for a fact the saved report holds. |
| D-6 | Conclusion headlines come from code templates built on the settled per-source sentences; writer headlines kept under B-05 show as saved; no pooled numbers (plan D-6 defines them). |
| D-7 | Fixed text is written once with `VOICE.md` and the writing skill, approved once, kept in one file. No download button in the PDF. No line claims what patients do or promises a scheduled service, re-check or date. Re-audit advice stays. |
| D-8 | The help path on a failed check is "Minta bantuan", the mailto link to `support@nuave.ai` with the order number. No re-run button. |
| D-9 | Option A: Ringkasan is filled from saved fields; only "Yang dikerjakan dulu" of its three columns is shown. |
| D-10 | Spec 021 Part P changes: dark pages, the footer format, the print request (see "Amendments to Spec 021"). |
| D-11 | The official Nuave logo (`src/components/product/journey/NuaveLogo.tsx`) on the cover and in every page header; a back cover as the last page with the logo, the website (nuave.ai) and one sentence on what Nuave does; Penutup before the Lampiran. |
| D-12 | The five section titles are approved fixed text (see "Fixed text"). |
| D-13 | Report v3 F-13 option A: an "Unduh Lembar Kerja" button next to "Unduh PDF" on the web report (Part 4b), shipped with v3 P0.10. |
| D-14 | Titik awal is its own page after Penutup. This is Report v3's decision (revision 6.4, direction 3), adopted from this plan's §5.3 proposal; v3 owns page order (plan §5.3). |

D-1 to D-10 are the plan's numbers. D-11 to D-13 are numbered here for the
founder's later decisions in the plan's "Changes after approval" and the
decision log entry "Report section titles approved; worksheet download is a
button". D-14 records v3's decision, not a founder decision of this plan.

## Part 0: rules for every Part

### Pages and their order

The page order and what each page holds are plan §5.2, which follows Report
v3 "Format of the report PDF". The table says which Part builds each page
and when it is shown.

| Section | Page | Built in | Shown when |
| --- | --- | --- | --- |
| Front | Sampul | Part 1 | Always |
| Front | Daftar isi | Part 1 | Always |
| Front | Cara membaca laporan | Part 1 | Always; v3 parts only when saved |
| Front | Ringkasan | Part 2 | Always |
| Front | Saat calon pasien bertanya | Part 5, with v3 P0.1 to P0.3 | Only when its saved data exists |
| Front | Peta jawaban | Part 2 | Always |
| 01 | Divider | Part 1 | When section 01 has a page |
| 01 | Temuan, one per finding and one for `google_finding` | Part 2 | One per saved finding |
| 01 | Pesaing | Part 2 | When competitor rows exist |
| 01 | Celah topik | Part 2 | When it has a row |
| 02 | Divider | Part 1 | When section 02 has a page (none today) |
| 02 | Cek fakta, Kata AI dan kata Anda | Later Parts, with v3 P1.2, P2.3 | Only when their saved data exists |
| 03 | Divider | Part 1 | When section 03 has a page (none today) |
| 03 | Halaman mereka, Situs yang dibaca AI, Untuk tim web Anda | Later Parts, with v3 P2.2, P2.1, P1.1 | Only when their saved data exists |
| 04 | Divider | Part 1 | When section 04 has a page |
| 04 | Rencana | Part 2 | When recommendations exist |
| 04 | Langkah, one per recommendation | Part 2 | One per saved recommendation |
| 04 | Bahan siap pakai | Later Part, with v3 P2.4 | Only when its saved data exists |
| 04 | Lembar Kerja | Part 5, with v3 P0.10 | Only once the worksheet exists |
| 04 | Penutup | Part 1 | Always |
| 04 | Titik awal | Part 2 (Q-6, settled) | Always; v3 numbers only when saved |
| 05 | Divider (Part 1's template), A0, A1 to A10 with continued pages | Part 3 | Always |
| End | Sampul belakang | Part 1 (Q-6, settled) | Always |

Parts of pages that wait for Phase 0 (Cara membaca's P0.8 lines, the P0.6
and P0.7 tags on Rencana and Langkah, the P0.4 decisions on Penutup) are
added by Part 5; later v3 parts by the later Part added with that package
(Non-scope, template ownership).

### Requirements

- **G-01: Which reports.** The designed PDF is made for every two-source
  (Spec 018) report, including those written before Spec 021 Part B, which
  fall back where the web page falls back today. Reports saved before Spec
  018 keep their web page and their browser print exactly as today.
- **G-02: Page list.** The pages and their order come only from the page-list
  function (F-05), whose order is the v3 order above. A page whose data does
  not exist is left out, and so is its row on Daftar isi. No page is added,
  dropped or reordered to fit a template (plan §5.3).
- **G-03: Counts.** Every count is per source with its denominator, computed
  by code, and equals the same count elsewhere in the report. Answers are
  never added across the two sources; no pooled number (plan D-6) appears
  except inside a writer headline kept under B-05. A denominator of 0 shows
  "Tidak diuji", never "0 dari 0". "Direkomendasikan" is counted only for the
  clinic and only for ChatGPT. The count sentences are produced by the code
  that produces them for the web report today (`two-source-report.ts`,
  `TwoSourceReport.tsx`), never retyped, so "Klinik Anda" and "Bisnis Anda"
  follow `two_source.subject` (Spec 018 AC-20).
- **G-04: Headline numbers.** A finding's large number is shown only as
  saved and only when B-05 kept it ("X dari Y", a whole number such as "2×",
  or a figure copied from an answer, plan §5.3). Numbers the reference shows
  that have no B-05 form today (Temuan 3's "4 dari 8" klaim, Temuan 4's "1")
  are not shown.
- **G-05: Fixed text.** Every customer-facing string that is not saved data
  comes from the one fixed-text file (see "Fixed text"). No fixed line claims
  what patients do, states a cause, or promises a scheduled service,
  re-check or date. Section titles state what their pages show, never a
  cause.
- **G-06: Nothing cut.** No text is cut off, set below the reference sizes,
  or placed outside its page box; no page is empty. Long text goes to
  continued pages: by word count on report pages (F-06; Rencana S-06 and
  Pesaing S-04 under Q-3 option (a)), by measuring in the
  appendix (L-05).
- **G-07: Made fresh.** Each download is made from the saved, unchanging
  report; nothing is stored and nothing is regenerated (Spec 021 P-04, Spec
  018 R-29).
- **G-08: Charts and marks.** Charts, bars and dots are plain HTML and SVG
  drawn from the numbers, with no chart library. The "●" and "○" style marks
  are drawn as shapes, not font glyphs (Step 0: Geist's Latin subset lacks
  them and a fallback font appeared).
- **G-09: No button in the PDF.** The PDF has no download or other button.

### Limits

Set from Step 0 (spike README, 2026-11-07; each case ran once).

| Limit | Value | Basis |
| --- | --- | --- |
| Browser Run page load | 30 s, unchanged | `report-pdf.ts` |
| Ready marker wait | 20 s, unchanged | `report-pdf.ts` |
| PDFs per report per UTC day | 20 (`PDF_DAILY_CAP`), unchanged | plan §9 |
| Print code | single use, 60 s (`PRINT_TOKEN_TTL_MS`), unchanged | Spec 021 P-02 |
| Route rate limit | unchanged | Spec 021 P-02 |
| Page size | CSS `1440px × 810px`, zero margins; the PDF page measures 1080 × 607.9 pt | D-2; spike finding 5 (the reference export is 1440 × 810 pt, the same shape at a larger size) |
| Measured worst cases | 86 pages at the word limits with assumed 1,200 and 400 word answers: 2.2 s whole request, 0.87 s browser time, 851 KB. At real saved maxima (680 and 450 word answers): 76 pages, 2.4 s, 1.57 s browser time, about 785 KB | spike, Browser Run REST endpoint with inline HTML |
| Fixture thresholds (engineering) | Whole request at most 10 s; PDF at most 3 MB, on every fixture | Q-2, settled: about four times the largest measured time (2.4 s) and size (851 KB), leaving room for the real print path and source lists while staying far inside the 30 s and 20 s limits |

The measured cases did not go through the Worker's binding opening the
print page, did not draw source lists, and used simpler layouts than the
Figma; Part 1 and Part 3 measure the real path (AC-F8, AC-L6).

### Word budgets

Budgets are the Spec 021 B-04 writer limits
(`TWO_SOURCE_WRITING_LIMITS`), **confirmed against saved maxima on
2026-11-07 (7 reports)**: every saved writer text was within its limit
(spike README, "The longest texts saved on Nuave's orders"). Seven reports
is a small sample; Q-1 re-checks the budgets as orders grow.

The "Longest saved" numbers are approximate: `saved_lengths.py` counts words
by spaces, while the budgets are counted by the writer's `words()`
(`two-source-writing.ts`), which counts letter and number runs, so
"Sp.DVE" is two words and words joined by a line break count separately.
The 14-word recommendation title may already be over its 14-word limit by
the writer's rule. The page-list function counts with `words()`.

| Page | Text | Budget | Longest saved | Over budget |
| --- | --- | --- | --- | --- |
| Ringkasan | Verdict | 220 characters and 2 sentences (no word limit; cut by code today) | 30 words | Code cuts it as the web does |
| Ringkasan | "Yang dikerjakan dulu" (first plan step) | 35 words | 23 | Fits at 1.5 times (Q-3 a) |
| Temuan | Finding title / text | 12 / 80 words | 10 / 64 | Continued page (F-06) |
| Pesaing | "Menurut jawaban AI" reason, up to five | 20 words each | 15 | 1.5 times layout, then continued page (Q-3 a) |
| Pesaing | Takeaways, up to three | 10 + 30 words each | 25 (text) | 1.5 times layout, then continued page (Q-3 a) |
| Celah topik | Topic name, up to five rows | 6 words | not measured | Fits at 1.5 times (Q-3 a) |
| Rencana, Langkah | Recommendation title / paragraph | 14 / 100 words | 14 / 60 | Langkah: continued page (F-06); Rencana: continued page (S-06) |
| Penutup | Conclusion; three plan steps | 70; 35 words each | 58; 23 | Continued page (F-06) |

Reports written before Part B have no limits; the same budgets apply to
them. Step 0 found that at 1.25 times the limits two pages overflow:
**Pesaing** (six rows with 25-word reasons, 15 chips, three takeaways; 743 of
626 px) and **Cek fakta** (eight rows; 640 of 626 px). Pesaing is built in
Part 2 and fits on one page at its budget (S-04); above it, Q-3 option (a) applies. Cek fakta's spec (v3 P1.2) must set its own budget or overflow rule.

### Fixed text (D-7)

All fixed strings live in one file (path chosen in Part 1), written with
`VOICE.md` and the writing skill, and approved once by the founder, in Part
1's review, for Parts 1 to 3 (Q-5, settled). Later strings (Part 4's line,
Part 5 and later templates) are added to the same file and approved in the
review of the PR that adds them.
No em or en dash appears in Indonesian prose; the only en dash allowed is in
a range such as "Minggu 1–2" or "08.00–21.00" (`VOICE.md` §3). This spec does
not write new customer-facing copy. The strings already settled or named by
the plan:

| String | Where | Source |
| --- | --- | --- |
| "01 Posisi <klinik> hari ini", "02 Apa kata AI tentang <klinik>", "03 Apa yang dibaca AI", "04 Rencana delapan minggu", "05 Lampiran" | Dividers, Daftar isi | D-12 (approved) |
| "Tidak dapat diuji", "Minta bantuan" | Failed checks | Spec 018 R-20 |
| "Tidak diuji" | Denominator 0 | `VOICE.md`, Spec 018 |
| The count sentences and the code-built Google sentence | Cards, headlines, Titik awal | Code (G-03); not in the file |
| "Yang dikerjakan dulu" | Ringkasan | D-9 |
| "Menurut jawaban AI", "disebut lebih jarang", "Direkomendasikan" | Pesaing | plan §5.1, §5.2 |
| "Catatan Nuave" and one sentence with blanks per note kind | Appendix | D-5 |
| "lanjutan"; labels "A0", "A1", "A3 · 1/2" | Continued pages, appendix footers | plan §6.3 |
| Method line with and without search data (`search_data_available`) | Cara membaca laporan | D-7 |
| Page names (Daftar isi, Cara membaca laporan, Ringkasan, Peta jawaban, Temuan, Pesaing, Celah topik, Rencana, Langkah, Penutup, Titik awal, Lampiran) | Page titles, Daftar isi | plan §5.2 |
| Re-audit advice: about eight weeks after the changes, an audit with the same ten questions, so the two reports can be compared; the comparison alone does not show what caused the differences; no date or service | Titik awal | D-7, v3 direction 3 (meaning fixed; wording to be written) |
| The sentence on what Nuave does, and "nuave.ai" | Back cover | D-11 (wording as in the reference, approved with the file) |
| The confidential label and the "date the numbers come from" line | Titik awal footer and as the reference shows | plan "Changes after approval" (wording to be written) |
| The PDF line of Part 4 | Web report, email | Founder approves the wording (W-01) |

The web button stays "Unduh PDF" (Spec 021 AC-P1) and the email keeps
"Download PDF" (D-7).

### Fixtures

Plan §8.1, plus **an answer citing 44 or more sources** (saved maximum: 44)
and **answers of about 700 words (ChatGPT) and 450 words (Google)**. No
personal data. A fixture whose data is longer than saved maxima is allowed
and expected.

### Acceptance criteria for every Part

Each Part runs these on its fixture PDFs, for the pages it has built.

- **AC-G1:** Given any fixture, the PDF's pages are 1440 × 810 CSS px
  (1080 × 607.9 pt), and its page count and page labels equal the page list
  after splitting.
- **AC-G2:** Given any fixture, no element lies outside its page box, no
  page is empty, and no element's computed font size is below the minimum
  for its type role in the F-02 list.
- **AC-G3:** Given any fixture, every count equals the saved per-source
  counts. A test finds every count element of the form "X dari Y" in the PDF
  text (position labels such as "Temuan 1 dari 5", "Langkah 1 dari 6" or
  "1 dari 5" on Bahan siap pakai are not counts and are skipped; the
  templates mark which elements are counts) and checks that Y is one of:
  one source's own denominator (ChatGPT N, Google M or Z, Spec 018); the
  number of questions the finding cites; or a denominator the relevant v3
  package spec defines, such as Kata AI's "x dari 4" (the ChatGPT answers
  that name the clinic, P2.3), "dari 8 klaim yang diperiksa" (P1.2), "dari 5
  pemeriksaan teknis yang dinilai" (P1.1) or the stability "2 dari 3"
  (P3.2). The only other exception is a writer headline kept under B-05,
  shown as saved. No sum of the two sources
  appears: no X or Y equals a ChatGPT count plus the Google count of the
  same kind (named, completed, failed, answers), except where the fixture's
  test lists that value as also a legitimate per-source or question count.
- **AC-G4:** Given the fixed-text file, it holds no em dash and no en dash
  outside the allowed ranges, and every page's fixed strings come from it.
- **AC-G5:** `npm run verify` passes; the Spec 021 AC-A5 snapshots and the
  pre-Spec-018 print pass unchanged.
- **AC-G6 (judgement):** The founder compares the fixture PDFs with the
  reference export and accepts them.
- **AC-G7:** An independent verdict is recorded on the Part's exact head.

## Part 1: the page frame (PR 1)

### Requirements

- **F-01: Fonts.** Newsreader, Geist, Roboto Condensed and Geist Mono (D-3),
  loaded only through `src/app/fonts.ts`, used only inside the PDF pages.
  Font files are static, one weight per file, of a kind Chromium embeds as
  TrueType, not Type 3 (Step 0 finding 4: variable woff2 files embedded as
  Type 3, which can look soft and copy poorly). The PR records each file's
  licence (SIL OFL or Apache 2.0, D-3). If static files still embed as Type
  3, the PR stops and returns to the orchestrator.
- **F-02: Tokens and `DESIGN.md`.** The report type values go in
  `tokens.css` as a report block, so `npm run check:typography` keeps
  passing. Neither the plan nor the reference README gives the sizes, so
  this Part delivers the list: each type role of the PDF pages (for example
  headline, big number, text, label, page number, appendix answer, code
  text) with its minimum size in CSS px, taken from the reference and
  approved by the founder with the fixture PDFs (AC-G6). AC-G2 checks
  against this list. `DESIGN.md` gets the three changes D-3 lists: the two new families
  in `fonts.ts`, Newsreader replacing the system serif stack for the PDF,
  and an exception for Roboto Condensed inside the PDF pages only.
- **F-03: Print request.** `pdfRequest` asks for the page's own CSS page size
  (`preferCSSPageSize`), backgrounds, no Browser Run header or footer, and
  zero margins. The load wait (30 s, `networkidle0`), the ready selector and
  its 20 s wait, the print code, the cap and the file name
  `Laporan-Nuave-<klinik>.pdf` stay as today. While the switch (F-10) is
  off, today's A4 request is used.
- **F-04: Print page and page box.** `/r/print` gets a new body made of the
  PDF pages for two-source reports while the switch (F-10) is on; other
  reports keep today's print. Each
  page is one 1440 × 810 box with its own header (the official logo, D-11)
  and footer drawn by the page: the page number on report pages ("05") and
  the appendix label in the appendix ("A3 · 1/2") (D-10). The cover, the
  section dividers shown, Penutup, Titik awal and the back cover are dark pages
  (D-10); all others use the light palette.
- **F-05: Page-list function.** A pure function turns a saved report into
  the ordered list of pages, each with its kind, its label and its number,
  in the order of Part 0. Lists that can grow are spread by count, never by
  measuring: one Temuan page per finding, one Langkah page per
  recommendation, at most five "Menurut jawaban AI" lines, at most five
  Celah topik rows (Spec 018 R-18). Daftar isi's numbers come from this list
  and are fixed before printing.
- **F-06: Continued report pages.** A Temuan, Langkah or Penutup text over
  its budget gets as many continued pages ("lanjutan") as it needs, decided
  by the page-list function from the word count before printing; the text
  never overflows. A text splits at a sentence end, so no sentence is broken
  across pages (Q-7, settled: it reads better and is decidable from the
  text alone); a single sentence longer than a page splits at a word.
- **F-07: `long_texts`.** The existing `report_pdf` log line gains one
  count, `long_texts`: the number of texts over budget, worked out by running
  the page-list function on the saved report the route already reads.
  Numbers and codes only. When Browser Run fails, the line also records the
  cause the route can see: a ready timeout gets its own status code,
  separate from today's `browser_error` and `browser_failed` (with its HTTP
  status). How the route recognises a ready timeout in Browser Run's
  response is found and recorded in Part 1; a failure it cannot classify
  keeps `browser_failed`.
- **F-08: Ready comes last.** The print page sets `[data-saved-report="ready"]`
  only after the data has arrived and `document.fonts.ready` has resolved,
  and no face in `document.fonts` whose family is one of the PDF fonts
  (matched by the family names `next/font` generates for them) has status
  `"error"`. `document.fonts.check()` is not used: it returns true for a
  family with no face in the set. If a font has failed, the marker is never
  set (Q-9, settled: fail closed; a PDF in a fallback font would break the
  design and the embedded-font check, and the web report stays the full
  report, D-1 A). Part 3 extends this rule to the appendix split (L-05). The
  web report's marker is unchanged.
- **F-09: Always-present pages.** As in the reference, filled from saved
  data where they show data:
  - **Sampul**, with the logo.
  - **Daftar isi:** one row per section shown, pointing at its divider, and
    at the appendix's first page only.
  - **Cara membaca laporan:** the method facts (places, dates,
    `checked_from`, `checked_to`), the per-source denominators and the dot
    legend; the method line chosen by `search_data_available`. v3 P0.8's
    lines come with Part 5; the P3.2 stability box with its later Part.
  - **The section divider template**, owned by this Part: one dark page
    per section, with the approved title (D-12). A section shows its divider
    and its Daftar isi row only when it has at least one page (settled in
    revision 3: a divider followed by nothing is an empty section; today
    sections 02 and 03 have none). The other sections keep their approved
    numbers, with gaps (Q-4, founder 2026-11-07).
  - **Penutup:** the saved `conclusion` always, and `two_source_writing.plan`
    as three phase columns; a report without a plan falls back as the web
    Penutup does (Spec 021 A-07). P0.4's decisions come with Part 5.
  - **Sampul belakang** as the last page: the logo, nuave.ai and the
    approved sentence (D-11).
- **F-10: Designed-print switch.** A server-side setting per deployment
  turns the designed print (the F-04 body and the F-03 request together) on
  or off. It is on in PR previews and off in production until Part 3 turns
  it on; with it off, two-source reports print exactly as today (body and
  A4 request). Part 3 turns it on in production and removes the setting, so
  it does not stay as a test-only switch (`AGENTS.md`, engineering
  guardrail 6). Part 3 is where it goes on (Q-10, founder 2026-11-07).

### Acceptance criteria

- **AC-F1:** A unit test shows `pdfRequest` asks for `preferCSSPageSize`,
  `printBackground`, no header or footer template, zero margins, and keeps
  the 30 s load and 20 s ready waits.
- **AC-F2:** Given the fixtures, the page-list function returns the Part 0
  order (a test asserts it equals the v3 order), leaves out pages without
  data with their Daftar isi rows, and gives a Temuan, Langkah or Penutup
  text over budget the right number of continued pages and one at its
  budget none.
- **AC-F3:** Given the fixtures, Daftar isi's numbers point at the right
  pages; the dark pages are the ones F-04 lists; the back cover is the last
  page.
- **AC-F4:** A test shows the ready marker is absent until the data has
  arrived and the fonts have loaded, and stays absent when a font fails to
  load.
- **AC-F5:** Given a fixture PDF, its fonts are embedded, none is Type 3, and
  no fallback font appears.
- **AC-F6:** `npm run check:typography` passes; no font loader exists
  outside `fonts.ts`.
- **AC-F7:** A route test shows the `report_pdf` line carries `long_texts`
  and only numbers and codes.
- **AC-F8:** With the switch on in a PR preview (F-10), `verify-nuave`
  downloads the designed PDF; the
  largest fixture's PDF through the real Browser Run path is inside the 30 s
  and 20 s limits, and its time and size are recorded.
- **AC-F9:** A report saved before Spec 018 still prints with today's print.
- **AC-F10:** With the switch off (the production setting until Part 3), a
  test shows a two-source report's print page and `pdfRequest` are exactly
  today's (body, A4, footer, margins), and the production configuration
  has the switch off.
- **AC-F11:** Given the fixtures, no divider appears for a section without
  a page, and Daftar isi has no row for it.
- **AC-F12:** A route test, with Browser Run answering as it does when the
  ready marker never appears, shows the `report_pdf` line logged with the
  ready-timeout code, numbers and codes only, and the retry answer
  returned.

## Part 2: the report pages from saved data (PR 2)

### Requirements

- **S-01: Ringkasan (D-9 A).** The statement is `two_source_writing.verdict`;
  when there is none, it is `verdictFromConclusion(conclusion)`, as on the
  web: the conclusion cut at a sentence end, at most 220 characters, never
  the whole conclusion;
  one card per source with its count, its settled sentence and ten dots; the
  first plan step as "Yang dikerjakan dulu", left out when there is no plan.
  The other two columns are not shown. The page is laid out to fit at 1.5
  times its budget (Q-3 option (a)): a plan step of 53 words, beside a
  verdict at its 220-character cut (code cuts it, so it never exceeds that).
- **S-02: Peta jawaban.** The ten questions by the two sources, with the
  clinic's state in each cell first, then competitor columns for the first
  four other businesses in `competitorRows` order (`report-v2-data.ts`),
  the clinic's own row skipped.
- **S-03: Temuan.** One page per `key_findings` item, in saved order, in
  this order on the page: the title (the writer's meaning sentence), the
  headline number and caption when B-05 kept them (G-04), the text, then
  each cited question (`evidence_prompt_ids`) as a chip naming its appendix
  label. `google_finding` gets its own Temuan page, placed where the web
  report shows it, holding its one code-built sentence with no title, no
  number and no chips.
- **S-04: Pesaing.** Bars per source for the first five businesses and the
  clinic's own row, chips for the rest, the "Menurut jawaban AI" line for
  those five, `other_businesses` per source as the "disebut lebih jarang"
  line, and up to three takeaways in the right column. Mentions per source;
  "Direkomendasikan" only on the clinic's row, ChatGPT only. Rows may keep
  `sortRows` order; the sum that orders them is never printed. Older reports
  derive rows as `competitorRows` does today. Under Q-3 option (a), a Pesaing still over its page after the 1.5 times layout
  continues between rows onto a "lanjutan" page, decided before printing.
  Every business shows its
  initials, never a logo, and the print page makes no logo request (Q-8,
  settled: today's print copy already makes none, `showLogos` in
  `SavedReport.tsx`; a fetch from third-party sites during printing would
  send Browser Run's requests to them and could delay `networkidle0`).
- **S-05: Celah topik.** The rows the web report's Celah Topik shows (Spec
  021 A-05), at most five. The page is laid out to fit at 1.5 times its
  budget (Q-3 option (a)): five topic names of 9 words each.
- **S-06: Rencana.** Every recommendation in one list. When the rows are
  over the page's budget (its recommendation titles at 14 words each, plus
  the tags once Part 5 adds them), the list continues on a Rencana
  "lanjutan" page, decided by the page-list function before printing,
  between rows, as F-06 does. Chosen over a fixture-only test because ten
  rows with tags is at risk, a fixture proves only the cases it holds, and a
  continued page is decidable before printing so Daftar isi stays right.
  This extends plan §6.3's list (Temuan, Langkah, Penutup) by one page kind;
  the founder chose this with Q-3 option (a) on 2026-11-07. v3 P0.6's who, time and done-when and
  P0.7's tags come with Part 5.
- **S-07: Langkah.** One page per recommendation in the "Detail langkah"
  layout: title and paragraph. P0.6 and P0.7 parts come with Part 5; P1.1's
  evidence block with its later Part.
- **S-08: Code headlines (D-6).** A page headline that states a conclusion
  is a code template built on the settled sentences, in the code's own words,
  for example "ChatGPT: Klinik Anda muncul di 4 dari 10 pertanyaan dan
  direkomendasikan di 2." The template stays the fallback if a writer
  headline is added later (v3 P0.5).
- **S-09: Titik awal.** Today's per-source counts with denominators, each
  equal to the same count elsewhere, the date they come from, and the
  re-audit advice (fixed text). Nothing is compared between reports; no
  target or forecast. v3 P1.2, P1.1 and P3.3 numbers and the worksheet tab
  line only once saved.

### Acceptance criteria

- **AC-S1:** A test shows every number on the Part 2 pages equals the saved
  report's per-source counts, for every fixture.
- **AC-S2:** A test shows every §5.1 field this Part maps appears in the PDF
  text.
- **AC-S3:** Given the ten-other-businesses fixture, "Direkomendasikan"
  appears only on the clinic's ChatGPT row and no summed count is printed.
- **AC-S4:** Given a finding whose headline B-05 dropped, its page shows no
  number; given one kept, the number shows as saved.
- **AC-S5:** Given a report with ten findings and ten recommendations,
  the PDF has eleven Temuan pages (with `google_finding`) and ten Langkah
  pages, plus their continued pages, and Daftar isi is correct.
- **AC-S6:** Given Pesaing at its budget (five 20-word reasons, three
  takeaways at 10 + 30 words, the most chips in the fixtures) and a long
  business name, the page fits on one page. Under Q-3 option (a): given Pesaing at 1.5 times its budget (five 30-word reasons,
  three takeaways at 15 + 45 words, the same chips), the page fits or
  continues between rows onto a "lanjutan" page, with nothing outside its
  box.
- **AC-S6b:** Given Ringkasan at 1.5 times its budget (a 220-character
  verdict, a 53-word first plan step) and Celah topik at 1.5 times its
  budget (five 9-word topic names), each page fits on one page with nothing
  outside its box (Q-3 option (a)).
- **AC-S7:** Given a report written before Part B and a non-clinic report,
  the pages fall back as the web does and say "Bisnis Anda" where AC-20
  requires.
- **AC-S8:** Given ten recommendations with titles at 1.5 times their
  budget, Rencana continues onto a "lanjutan" page between rows, nothing
  overflows, and Daftar isi is correct.

## Part 3: the appendix (PR 3)

### Requirements

- **L-01: A0.** Section 05's divider ("05 Lampiran"), drawn with Part 1's
  divider template (F-09), then A0: every question with its
  topic, search volume and state per source; v3's answer notes only when
  saved.
- **L-02: One page per question (A1 to A10).** The question, its origin
  label (`label_text`) under it, its topic and volume; the full ChatGPT
  answer (`raw_answer`) and the full Google text (`google.text`); Google
  `references` and the ChatGPT `sources` as numbered lists.
- **L-03: States and empty cards.** No AI Overview; a failed check with
  "Tidak dapat diuji" and "Minta bantuan" (mailto `support@nuave.ai` with the
  order number, D-8, no re-run); no business named; no cited sources; no
  search volume.
- **L-04: Catatan Nuave (D-5).** A note only for a fact the saved report
  holds: an answer that cited the clinic's site without its name, no AI
  Overview, a failed check, no search volume, no cited sources, no business
  named. The "berbeda" claim note and the stability re-ask note only once
  their data exists. Each note is a fixed sentence with blanks.
- **L-05: Split by measuring.** A script in the print page measures each
  answer block; a block taller than its box is split at a paragraph, list
  item or table row onto "A3 · 2/2"; when both answers together are too
  tall, each source gets its own page. Text is never cut or shrunk.
  This Part extends the ready rule (F-08): the marker is also held until the
  split has finished. Only the appendix splits this way, so the report pages
  and Daftar isi do not move.
- **L-06: Long answers and long source lists.** The appendix holds answers
  of about 700 words (ChatGPT) and 450 (Google), the saved maxima, and
  longer. A source list of 40 or more items (saved maximum: 44) stays a
  numbered list, splits between items onto continued pages like an answer
  block, keeps its numbering across pages, and is never cut, shortened or
  set smaller.
- **L-07: Switch on.** This Part turns the designed print on in production
  and removes the switch (F-10).

### Acceptance criteria

- **AC-L1:** For every fixture, every saved answer is found in the PDF text,
  compared paragraph by paragraph after removing list marks, table bars and
  line breaks and joining columns.
- **AC-L2:** Given the longest saved answer and the answer with a table, the
  answers split cleanly at paragraphs, items or rows, and the labels
  ("A3 · 1/2", "A3 · 2/2") equal the page list after splitting; a test shows
  the ready marker is absent until the split has finished.
- **AC-L3:** Given the 44-source fixture, every source appears once, in
  order, numbered without a gap across pages.
- **AC-L4:** Given each empty-state fixture, its card shows; the "Minta
  bantuan" link is the mailto with the order number; no re-run button
  exists.
- **AC-L5:** Given a fixture without a note's fact, that note is absent;
  with it, the note shows.
- **AC-L6:** `verify-nuave` on a preview downloads a PDF with the appendix;
  the 76-page-class fixture prints through the real path inside the limits,
  with time and size recorded.
- **AC-L7:** After this Part, production serves the designed print for
  two-source reports, and no switch setting remains.

## Part 4: the PDF line on the web report (PR 4)

### Requirements

- **W-01:** One line on the web report and one in the report-ready email
  (`src/lib/orders/mail.ts`) saying the PDF is the full designed report. The
  founder approves the wording; it goes in the fixed-text file.
- **W-02:** The line shows only on two-source reports. Nothing else on the
  frozen web report or in the email changes. It ships only once production
  serves the designed print (F-10, Part 3), because before that it is not
  true.

### Acceptance criteria

- **AC-W1:** A new test shows the line on a two-source report and not on a
  report saved before Spec 018.
- **AC-W2:** The email test output carries the line.
- **AC-W3:** The pre-Spec-018 snapshots stay unchanged.
- **AC-W4:** `verify-nuave` passes on a preview.

## Part 4b: the worksheet button (PR 4b)

### Requirements

- **K-01:** An "Unduh Lembar Kerja" button next to "Unduh PDF" on the web
  report (D-13), downloading the worksheet that v3 P0.10 builds. It ships
  with P0.10.
- **K-02:** The button shows only on two-source reports and only once P0.10
  exists. Nothing else on the web report changes.
- **K-03:** Part 4b is built and verified together with v3 P0.10, in the
  same PR or verdict, because the button has nothing to download before
  the worksheet exists.

### Acceptance criteria

- **AC-K1:** A new test shows the button only on two-source reports and only
  when P0.10 is present.
- **AC-K2:** The button downloads the worksheet.
- **AC-K3:** The pre-Spec-018 snapshots stay unchanged; `verify-nuave`
  passes on a preview.
- **AC-K4:** The independent verdict for Part 4b is given on the same head
  as v3 P0.10's.

## Part 5: page templates for v3 Phase 0 (one PR with each package)

Plan §7 and §5.3 rule 3: when v3 adds a page or part of a page, this plan
maps it to a template. Spec 024 owns these templates; v3's specs own their
data, claims, counts, labels, row limits and when they show. Later v3
packages follow the same rule with a new Part (Non-scope).

### Requirements

- **T-01: Where they are built.** Each template is built in the same PR as
  its v3 package, against that package's approved spec, and plugs into
  Part 1's page list (F-05), page box (F-04), budgets and continued-page
  rule (F-06), fixed-text file (G-05) and ready rule (F-08). Part 0's rules
  apply to every template.
- **T-02: The templates.**
  - The moment page "Saat calon pasien bertanya" (P0.1 to P0.3), right
    after Ringkasan.
  - The P0.8 lines on Cara membaca laporan.
  - The P0.6 and P0.7 tags on Rencana and Langkah.
  - The P0.4 decisions under the plan steps on Penutup.
  - The Lembar Kerja page (P0.10), which names the worksheet and its tabs
    and has no download button (G-09).
- **T-03: Absent until saved.** Without the package's saved data, the page
  or part is left out and the Part 1 to 3 PDF is unchanged.

### Acceptance criteria

- **AC-T1:** Given a fixture with the package's saved data, the template
  shows it in the v3 position, and AC-G1 to AC-G4 pass.
- **AC-T2:** Given a fixture without it, the PDF equals the Part 1 to 3
  output (same page list and text).
- **AC-T3:** The package spec's own acceptance criteria for its data pass on
  the same head.

## Amendments to Spec 021 (D-10)

For two-source reports, from the Part that ships each:

- **P-03** reads: layout as this spec (16:9 pages, dark pages as F-04, page
  footers drawn by the page, the appendix of Part 3). "Always the light
  palette" no longer applies to the PDF.
- **AC-P1** reads: "Unduh PDF" downloads the designed 16:9 PDF, with "05"
  style page numbers on report pages and "A3 · 1/2" labels in the appendix.
- The "PDF" bullets of Spec 021 "Experience" (A4, page 1 content, the footer
  "Nuave · Laporan Visibilitas AI · <klinik>" and "<n> / <total>") are
  replaced by this spec. The button, its spinner, its file name and its
  retry message stay.
- P-01, P-02, P-04 and P-05 are unchanged.

## Failure and recovery

- **The PDF cannot be made** (Browser Run down or missing, the ready marker
  not set in 20 s, the daily cap reached): the web report shows today's retry
  message (Spec 021 P-05) and stays the full report and the fallback (D-1 A).
  Where Browser Run is missing, the button uses the browser's print of the
  web page, as today.
- **A font fails to load in Browser Run:** the ready marker is not set
  (F-08), so the failure shows as a Browser Run ready timeout after about
  20 s, then the retry message. Each attempt still counts against
  `PDF_DAILY_CAP`. The `report_pdf` log line records the cause the route can
  see, a ready timeout as its own code (F-07, AC-F12); telling a font
  failure apart from another timeout is not required. A font outage therefore stops
  every designed PDF while the web report stays up as the full report,
  which D-1 option A accepts. The founder confirms this fail-closed rule at
  approval.
- **A page's data is missing:** the page is left out (G-02); nothing is
  inferred, invented or filled with sample content.
- **A writer text is over budget:** continued pages on Temuan, Langkah,
  Penutup (F-06), and under Q-3 option (a) Rencana (S-06) and Pesaing (S-04);
  Ringkasan and Celah topik are laid out to fit at 1.5 times. Text is never
  cut.
- **Never:** a pooled number, a cause, a promised date or re-check, a number
  with no denominator, or content from the Figma sample.

## Evidence, data, privacy, and cost

- **Data:** only what the saved report already holds and the web report
  already shows (Spec 018 R-28). No new field is collected or saved; the
  `long_texts` log count is a number.
- **Privacy:** no new data is sent anywhere. Browser Run already opens the
  print page with a single-use code (Spec 021 P-02); the font files come from
  Nuave's own site through `fonts.ts`, so the print page asks no font
  service. No competitor logo is requested (S-04).
- **Cost:** no new model or search calls; the order's worst case stays
  USD 4.785, under the USD 5.00 hold (plan §9). Browser Run time per PDF
  measured at 0.87 to 1.57 s of browser time in the worst cases, inside the
  included hours at current volume (Spec 021 P-01); `PDF_DAILY_CAP` stays.
- **Licences:** the four font families are open licence; each file's licence
  is recorded in Part 1 (F-01).

## Open questions

Still open:

- **Q-1 (orchestrator; not blocking approval): re-check the budgets.** They
  were confirmed on 7 saved reports on 2026-11-07, counted by spaces. Re-run
  the check when more orders are saved and before this spec is marked
  Verified, counting with the writer's `words()`, not by spaces. If a saved
  text exceeds its budget, `long_texts` and the continued pages cover it on
  Temuan, Langkah, Penutup, Rencana and Pesaing, and the budget table is
  updated.

Settled by the founder on 2026-11-07, each as recommended:

- **Q-3: option (a).** Ringkasan, Pesaing and Celah topik are laid out to
  fit at 1.5 times their budget (S-01, S-04, S-05), and Pesaing and Rencana
  get continued pages when they are still over (S-04, S-06), beside the
  plan's Temuan, Langkah and Penutup (§6.3). The 1.5 factor is a judgement:
  a margin above the 1.25 case that overflowed in the spike. Checked by
  AC-S6, AC-S6b and AC-S8.
- **Q-4: keep the approved numbers.** A section without a page shows no
  divider and no Daftar isi row, and the others keep their approved numbers
  (D-12), so today's PDF goes 01, 04, 05.
- **Q-10: the switch goes on with Part 3.** Parts 1 and 2 merge with the
  switch (F-10) off in production; Part 3 turns it on for customers (L-07),
  and Part 4 ships after it (W-02).
- **Q-11: every two-source report gets the designed PDF,** including reports
  already delivered, on their next download (G-01, plan §6.1). Nothing is
  stored; every PDF is made fresh.

Settled in revision 2, as recommended by the review of `72660aa`:

- **Q-2:** fixture thresholds of 10 s for the whole request and 3 MB per
  PDF (Limits), about four times the measured maxima, far inside Browser
  Run's limits.
- **Q-5:** the fixed-text file is approved once, in Part 1's review, so
  Parts 2 and 3 build on approved text (Fixed text).
- **Q-6:** the back cover in Part 1 (design only, like the other
  always-present pages) and Titik awal in Part 2 (it shows saved counts).
- **Q-7:** a continued page splits at a sentence end (F-06), so no sentence
  breaks across pages.
- **Q-8:** initials only, no logo requests (S-04), as today's print copy
  already does; no third-party request during printing.
- **Q-9:** fail closed on a font that fails (F-08); the founder confirms at
  approval.

Settled in revision 3, from the review of `f885989`:

- A section without a page shows no divider (F-09); its numbering is Q-4.
- Rencana gets continued pages (S-06) under Q-3 option (a), which the
  founder chose on 2026-11-07.

## Implementation notes

- Step 0 used Chromium's `preferCSSPageSize` with `printBackground` and zero
  margins; the spike's code is throwaway and is not the implementation.
- `next/font` may serve a variable file even when weights are listed;
  F-01's TrueType check is the test, not the loader's settings.
- The spike's appendix held about 420 words per page across the full width;
  the Figma's question column and side-by-side answers hold fewer, so the
  real appendix has more pages than the spike counted.

## Verification record

Complete after implementation, per Part:

- Verification artifact: `specs/024-report-pdf-design/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
