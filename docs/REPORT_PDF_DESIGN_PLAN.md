# Plan: the PDF report design, from Figma to every order

> Status: **Approved by the founder on 2026-11-07** (D-0 to D-10 as
> recommended; [decision](./DECISION_LOG.md#2026-11-07--approve-the-pdf-report-design-plan-d-0-to-d-10)).
> Each package still needs its own approved spec ([`WORKFLOW.md`](./WORKFLOW.md));
> nothing is built from this file directly.
> Author: Claude (orchestrator role), 2026-11-07, branch
> `claude/vigilant-cerf-e5kktf`. Revision 6 applies independent review
> rounds 1 (FAIL) and 2 to 5 (PASS+NOTES); see "Review history" at the end.
> Inputs: the founder's PDF redesign in Figma, page "Redesain Report Nuave"
> (file `W66XEpO1rKQY8vbKyvo7xq`, page `1:156`), made and iterated with the
> founder on 2026-11-07; the [Report v3 plan](https://github.com/yasir-mukhtar/nuave_v0.2/pull/205)
> (`docs/REPORT_V3_PLAN.md` on PR #205, approved by the founder on
> 2026-11-07, F-1; revision 6.3), whose proof of concept A supplied the
> sample content; [Spec 018](../specs/018-search-grounded-chatgpt-google-audit/SPEC.md)
> (what a saved report holds and how it counts); [Spec 021](../specs/021-report-v2/SPEC.md)
> (report v2, Part P: the server PDF); [Spec 023](../specs/023-report-writing-quality/SPEC.md);
> [`AUDIT.md`](./AUDIT.md); [`DESIGN.md`](./DESIGN.md); [`VOICE.md`](./VOICE.md);
> the Indonesian writing skill `bahasa-indonesia-luwes` (PR #206, not merged).

## 1. What this plan does

The founder approved a new look for the report on 2026-11-07: a landscape,
presentation-ready PDF that reads like an agency report. This plan turns that
look into the PDF every new order gets, filled from the order's own saved
data.

It covers **how the report looks and how its pages are made**. It does not
change **what the report says or how it counts**. Everything the web report
shows today gets a place in the new PDF (§5.1), and every count keeps its
per-source denominator and its settled sentence (§4, D-6). A designed page
whose data does not exist yet is left out until the package that brings the
data ships (§5.2).

The Figma pages were drawn with invented sample content from the v3 proof of
concept. Some of that sample breaks settled counting rules; D-4 lists the
corrections the Figma needs before it becomes the reference.

## 2. Where this sits

| Document | Owns | This plan |
| --- | --- | --- |
| Spec 018 | The ten questions, the two sources, the states, the per-source counts and their sentences (AC-20: "Klinik Anda muncul di X dari N pertanyaan", on screen and in the PDF) | Uses them unchanged |
| Spec 021 | Report v2: the web report (Part A, phone first), answers (Part D), the server PDF (Part P: A4, light palette, footer "<n> / <total>") | Proposes changes to Part P only (D-2, D-3, D-10). Part A stays unless the founder picks D-1 option B or C |
| Spec 023 | The writer's prose; R-13 keeps the code count sentences as they are | Unchanged |
| Report v3 plan (PR #205, approved 2026-11-07, F-1) | New content: moment of truth, fact check, website check, sites AI reads, kit, worksheet, stability | **Owns the substance and format** (founder, 2026-11-07; §5.3): sections, order, claims, counts, labels and row limits. This plan follows its order (§5.2) and owns only how it looks. Several v3 packages are written for the web page (P0.1, P0.8, P1.2, P2.5, Phase 0's phone check); D-1 says what that means for them |
| `AUDIT.md` | "counts use per-source denominators" (line 22) | Binding on every page |
| `DESIGN.md` | Fonts (`src/app/fonts.ts` is the only loader), report tokens in `tokens.css`, the report exception | D-3 lists each rule it touches |
| `VOICE.md`, writing skill | Words and settled labels (for example **Download PDF**) | All fixed text follows them (D-7) |

Both plans are approved (v3 F-1 and this plan's D-0), so v3 P0.9 ("PDF")
is done by this plan's Step 0 and PR 1 to PR 3 (PR 4 is only the web report's line), and the two plans are laid out together so
the report is built once.

## 3. Finish line

1. Every new two-source order's PDF download gives the designed PDF:
   16:9 pages, the Figma type, colours and grid, section dividers, a contents
   page whose numbers match, and an appendix with every question and both
   full answers.
2. Everything the web report shows today appears in the PDF (§5.1).
3. Every count is per source, with its settled sentence and denominator.
4. Pages without data are left out; the contents page follows what is left.
5. No text is cut off, shrunk below the reference sizes, or outside its page.
6. Saved reports from before Spec 018 keep their web page and their PDF
   exactly as today (Spec 021 AC-A5 snapshots unchanged).
7. The PDF stays inside Browser Run's time limits and adds no provider cost.
8. The web report follows the option the founder picks in D-1.

## 4. Decisions the founder owes

| # | Decision | Changes | Recommendation |
| - | -------- | ------- | -------------- |
| D-0 | Approve this plan. | `INDEX.md`, `NOW.md` routing; this file leaves `drafts/` | After review. |
| D-1 | **What happens to the web report.** Option A: keep today's web report as it is (frozen at Spec 021 v2, no new sections), and redesign only the PDF. Option B: the private link opens a short delivery page; the PDF is the only full report. Option C: B, plus a short phone summary on the delivery page. | A: the v3 plan's web-page items move to the PDF (P0.1 under the source cards and its side panel, P0.8 under Jawaban AI, P1.2's marks in the answer panel, P2.5's copy on a phone, and Phase 0's "done when" phone check); PR 4 adds one line to the web report and to the approved report-ready email, and PR 4b the "Unduh Lembar Kerja" button (founder, 2026-11-07), both changes to the frozen Spec 021 web report. B and C: see the list below this table | **A now; decide B or C later**, after PR 3 ships and the checks in the paragraph below pass. |
| D-2 | Page format **16:9 landscape, 1440 × 810 CSS pixels** (about 381 × 214 mm), not A4. | Spec 021 Part P (A4 today); v3 P0.9 (A4 proof) | Yes. It is what the founder approved and it fits a meeting screen. It prints on A4 landscape with "fit to page". |
| D-3 | Report type: **Newsreader** (headlines, big numbers), **Geist** (text), **Roboto Condensed** (labels, page numbers), **Geist Mono** only for text that shows code (for example robots.txt). | `DESIGN.md`: the two new families are added in `src/app/fonts.ts` (the only loader; no per-component loader), used only by the PDF pages; the report type values go in `tokens.css` as a report block, so `check:typography` keeps passing (it rejects raw px font sizes outside `tokens.css`); the "system serif stack only" line of the report exception changes to Newsreader for the PDF; and the rule "Do not ... introduce Inter or another UI font" (`DESIGN.md`, Typography families) gets an exception for Roboto Condensed inside the PDF pages only. Geist and Geist Mono are already app fonts. | Yes. Both new families are open licence (SIL OFL or Apache 2.0); the spec confirms each file's licence. |
| D-4 | **The Figma is the visual reference after the corrections below**, then exported once to `experiments/report-pdf-design/reference.pdf`. Where the Figma and a spec disagree, the spec wins. Corrections before export: every pooled count removed (05 "6 dari 17 jawaban", 08 "dari 17 jawaban", 08 "lebih dari dua kali lebih sering", 05 grid cells "dari 2 jawaban", 07 "dicari sekitar 9.000 kali"), replaced by the per-source forms of D-6; the contents quote's unmeasured claim "lalu datang ke klinik yang disebut" rewritten (AGENTS rule 8); the A8 note "halaman yang membuat Ultima disebut" rewritten without a cause; the help line on A8 changed to D-8's path; the download label as D-7 settles it; every line that promises a scheduled re-check or a date ("Cek ulang dijadwalkan awal Januari 2027" on Penutup, "Cek ulang pada awal Januari 2027" on Rencana) removed, because Nuave runs no scheduled re-check (Spec 021 wishlist; v3 F-9); and two frames added that the Figma does not have yet: **Celah topik** and one **Langkah** page per recommendation (§5.1). | Figma only | Yes. |
| D-5 | **Appendix notes ("Catatan Nuave") come from code, not the writer.** A note appears only for a fact the saved report holds: a claim marked "berbeda" (when the fact check exists), an answer that cited the clinic's site without its name, no AI Overview, a failed check, no search volume, no cited sources, no business named, a stability re-ask (when it exists). Each note is a fixed sentence with blanks, approved once. | Spec 021 Part D (answers) | Yes. |
| D-6 | **Headlines and counts.** Page headlines that state a conclusion come from code templates built on the settled per-source sentences, in the code's own words (`TwoSourceReport.tsx`), for example "ChatGPT: Klinik Anda muncul di 4 dari 10 pertanyaan dan direkomendasikan di 2." and "Google menampilkan AI Overview di 7 dari 10 pertanyaan; klinik Anda muncul di 2 dari 7." A **pooled number** means answers from both sources counted against one combined denominator (such as "6 dari 17 jawaban"), a ratio between such counts, or search volumes summed across questions. Pooled numbers are not shown unless a later spec defines them and the founder approves the change to `AUDIT.md`. Writer headlines kept under Spec 021 B-05 show as saved. The writer may replace a page headline later (v3 P0.5), with the template as fallback. | None, as long as templates use the settled sentences | Yes. |
| D-7 | Fixed text (section names, legends, empty states, notes, "Tidak dapat diuji", "Minta bantuan") is written once with `VOICE.md` and the writing skill, approved once, and kept in one file. The PDF has no download button; the web button stays "Unduh PDF" (Spec 021 AC-P1) and the email keeps "Download PDF", as today. Text that depends on the order is chosen by code from approved variants, for example the method line with and without search data (`search_data_available`). No fixed line may claim what patients do, or promise a scheduled service, re-check or date. Advice to audit again, such as the web Penutup's "Audit ulang setelah 8 minggu" card, stays. | `VOICE.md` only if a new settled label is added | Yes. |
| D-8 | The help path on a failed check is today's: **"Minta bantuan"**, the mailto link to `support@nuave.ai` with the order number (Spec 018). There is no re-run button (Spec 018 R-20). | None | Yes. |
| D-9 | **Ringkasan's three short columns** ("Yang sudah berjalan", "Yang belum terlihat", "Yang dikerjakan dulu") have no saved field. Option A: fill the page with saved fields (the `verdict` as the statement, the per-source counts as figures, the first `plan` step as "Yang dikerjakan dulu"), and leave the other two columns out. Option B: a new writer field with a quote check (a Spec 023 change, with its cost measured). | Option B: Spec 023, the writer schema | **A** for this plan; B, if wanted, goes into v3 P0.5. |
| D-10 | Spec 021 Part P points this plan changes: the dark pages (P-03 says the PDF is always the light palette): the cover, the five section dividers, Penutup, Titik awal and the back cover; the footer format (AC-P1 "<n> / <total>" becomes "05" on report pages and "A3 · 1/2" in the appendix); the print request (§6.2). | Spec 021 Part P, by amendment in this plan's spec | Yes. |

**D-1, what B or C would change.** The PDF would become the only way to read
the report, so a Browser Run failure (`src/app/api/report/pdf/route.ts`) or
the cap of 20 PDFs per report per day (`PDF_DAILY_CAP`,
`src/lib/orders/report-pdf.ts`) would leave the owner with nothing, and Part
P's fallback (the browser's print of the web page, P-05) would go. It would
also change: Spec 021 Part A and AC-A1 (phone first), Part D (answers on the
page), AC-A6 and AC-A7; the `verify-nuave` checks of the report page; v3
P0.1, P0.8, P1.2 and P2.5 and Phase 0's phone check, which are written for
the web page; terms §2 ("hasil audit di halaman web, PDF, dan file bukti",
`src/app/terms/page.tsx`); the report-ready email ("Di halaman laporan, pilih
Download PDF", `src/lib/orders/mail.ts`); `docs/content/website/FAQ.md` and the live FAQ page (`src/app/faq/page.tsx`); and
the landing page's report pictures (`ReportShowcase.tsx`). Reports saved
before Spec 018 would keep their web page in any option, because their PDF
is the browser's print of it.

**Why A now.** A removes the double work (the web report is frozen, so no
section is built twice), keeps a working fallback when the PDF cannot be
made, and changes no approved document except Part P. Its cost: the web page
and the PDF look different, and new v3 sections appear only in the PDF, so
the web page needs one line saying the full report is in the PDF. B or C
becomes sensible once three things are shown: the PDF is made reliably on
real orders, it reads acceptably in a phone's PDF viewer (iPhone Files and
Android Drive), and the founder accepts the list above.

## 5. What goes where

"Today" means a saved Spec 018 report holds the data
(`src/lib/audit/two-source-report.ts`, `src/lib/audit/types.ts`). Reports
written before Spec 021 Part B have no `two_source_writing` block, so the
pages that need it fall back as the web page does today.

### 5.1 Everything the web report shows has a page

| Saved field | PDF page |
| --- | --- |
| Per-source counts and failed checks (`two_source.counts`) | Cover orbit; Ringkasan cards; the moment page's per-source bars; Titik awal |
| `two_source_writing.verdict` | Ringkasan statement (D-9 option A) |
| `conclusion` | Penutup's paragraph, always (as the web Penutup shows it); also Ringkasan's statement when there is no verdict |
| `key_findings` (with `headline`) | One **Temuan** page per finding, in the Temuan template (Figma pages 08 to 12): the headline's number and caption (shown as saved, D-6), the title, the text, and the questions it cites (`evidence_prompt_ids`) as chips that point to their appendix pages |
| `google_finding` | Its own Temuan page, as on the web page today |
| `two_source_writing.takeaways` | Pesaing page, the right column (at most three, Spec 021) |
| `two_source.competitors` (Part C; derived from the answers for older reports, as `competitorRows` does today), `competitor_reasons` ("Menurut jawaban AI") | Pesaing page (bars per source for the first five businesses and the clinic's own row, chips for the rest, as the web page does, and the "Menurut jawaban AI" line for those five) and the Peta jawaban grid's competitor columns |
| `other_businesses` per source | Pesaing page, "disebut lebih jarang" line |
| `topics_missing` (Celah Topik) | The **Celah topik** page |
| `priorities` (each recommendation's title and paragraph) | One **Langkah** page per recommendation, in the Figma "Detail langkah" layout (title and paragraph today; who, effort, evidence block and "Dasarnya" added by v3 P0.6, P1.1 and P0.7); the Rencana page lists them, with who, time and done-when once v3 P0.6 adds them |
| `two_source_writing.plan` (three steps with weeks) | Penutup, as the three phase columns, with the owner's decision under a step once v3 P0.4 adds it |
| Questions, states, topic, volume | Peta jawaban; Ringkasan cards (the dots); Lampiran A0 |
| Each question's origin label (`label_text`) | Its appendix page, under the question |
| Both full answers (ChatGPT: the observation's `raw_answer`; Google: `google.text`), Google `references`, the ChatGPT observation's `sources` | Lampiran A1 to A10 |
| Method facts (places, dates, `checked_from`, `checked_to`) | Cara membaca laporan |

### 5.2 The report's pages, in the Report v3 order

The page order and what each page holds follow the approved Report v3 plan,
"Format of the report PDF" (`docs/REPORT_V3_PLAN.md` on PR #205, revision
6.3). The sample content comes from its proof of concept A
(`experiments/report-v3-poc/data/ultima_a.py`). "Today" means saved data
fills the page now; a v3 package number means the page, or the part named,
waits for that package. A page whose data does not exist yet is left out.

| Section | Page | Data | Notes |
| --- | --- | --- | --- |
| Front | Sampul | Design only | |
| Front | Daftar isi | Today | One row per section, pointing to its divider |
| Front | Cara membaca laporan | Today, partly | The method facts, the per-source denominators and the dot legend are saved today; v3 P0.8 adds who decides each label, and the stability box waits for v3 P3.2 |
| Front | Ringkasan | Today | The verdict as the statement, each source card with its count, its settled sentence and ten dots, and the first plan step as "Yang dikerjakan dulu" (D-9 A) |
| Front | Saat calon pasien bertanya | v3 P0.1 to P0.3 | One answer in which the clinic is not named, chosen by code; the per-source bars; "Mengapa ini penting" with the average-names line |
| Front | Peta jawaban | Today | The ten questions by the two sources, with the clinic's state in each cell and the competitors named by code |
| 01 Posisi <klinik> hari ini | Temuan, one page per finding | Today | The writer's meaning sentence first, the code's count and its caption beneath, then the text and the cited questions as chips (v3 rule 14; §5.1) |
| 01 | Pesaing | Today (Part C) | Each business's mentions per source, "Menurut jawaban AI" and the takeaways. "Direkomendasikan" appears only on the clinic's own row, per source, because the saved report does not keep whether an answer recommended another business and no v3 package adds it. Rows may keep the web report's order (`sortRows`); the sum that orders them is never printed |
| 01 | Celah topik | Today | |
| 02 Apa kata AI tentang <klinik> | Cek fakta | v3 P1.2 | Up to eight rows, "berbeda" first, with the count of all claims checked; the source column reads "<situs>, yang dikutip jawaban ini"; safety and licensing claims as "Tanpa penilaian" with no reference |
| 02 | Kata AI dan kata Anda | v3 P2.3 (F-5) | AI's line and word counts next to "Menurut Anda", and the other clinics' lines |
| 03 Apa yang dibaca AI | Halaman mereka | v3 P2.2 | |
| 03 | Situs yang dibaca AI | v3 P2.1 | Key sites as rows, the rest in one line; each site's ChatGPT answers and Google summaries counted apart, with no group totals |
| 03 | Untuk tim web Anda | v3 P1.1 | Made to be shared alone with the web vendor |
| 04 Rencana delapan minggu | Rencana | Today; tags with v3 P0.6, P0.7 | Every step in one list |
| 04 | Langkah, one page per recommendation | Today | |
| 04 | Bahan siap pakai | v3 P2.4 (F-7a) | |
| 04 | Lembar Kerja | v3 P0.10 | Names the worksheet and its tabs; the owner downloads it with the "Unduh Lembar Kerja" button on the web report (v3 F-13 option A, PR 4b). The work-plan preview rows are this report's own recommendations; the person, date and status columns start empty, and the reference fills them only as a labelled example |
| 04 | Penutup | Today; decisions with v3 P0.4 | The closing paragraph and the three phases |
| 04 | Titik awal | Today, partly | Today's counts and the re-audit advice (D-7); v3 P3.3 adds the comparison with a later audit. A page of its own is an open proposal to v3 (§5.3 rule 4); if v3 declines, it folds back into Penutup |
| 05 Lampiran | A0, the questions | Today | With v3's answer notes |
| 05 | A1 to A10, one question per page | Today | Both full answers, their sources and the code notes; continued pages as needed (§6.4); the two questions that name the clinic, if v3 F-4 is approved |
| End | Sampul belakang | Design only | |

**Design-only pages:** the cover, the five section dividers and the back
cover. Section titles state what the pages show, never a cause (v3 rule 3).

### 5.3 Keeping the design in step with Report v3

Founder direction, 2026-11-07: **substance and format follow the Report v3
session; aesthetics and delivery belong to this plan.**

0. **The counting rule** for every page is v3's "Counts on the PDF pages"
   (revision 6.4, in its "Approval and alignment"): each number keeps its
   source and denominator, and answers are never added across the sources.
1. **What v3 owns:** which pages exist and in what order, what each page
   holds, every claim, number, count rule and denominator, labels and what
   they mean, row limits, and when a page is shown. This plan never adds,
   drops or reorders a page, or changes a claim to fit a page.
2. **What this plan owns:** page templates, dividers, type, colour, charts,
   page breaks, and the wording polish of v3's text with the writing skill,
   without changing a fact, a claim, a label or a qualifier.
3. **When v3 changes a page,** the design maps it to a template; if no
   template fits, this plan adds one. A page is never changed to fit a
   template.
4. **Proposals to v3** are listed here until v3 adopts or rejects them.
   The two earlier ones (Cara membaca laporan before Ringkasan; Peta
   jawaban) were adopted in v3 revision 6.3. Open:
   - Titik awal as its own page after Penutup. v3's list has Penutup as the
     last page of section 04, and in the reference export the starting
     point was part of it; the Figma gives it a page so the counts to
     compare in eight weeks stand alone.
5. **In code,** the page-list function takes the v3 page order as its input,
   and a test asserts that the PDF's page order equals it.
6. **Sample content:** the Figma's sample text comes from proof of concept
   A's data file. When v3 changes that file, the Figma sample is refreshed.
   Where the sample's wording pools the two sources or differs from a
   settled sentence, the Figma uses the per-source or per-question form
   (D-6; Spec 018 AC-20), not the sample's.

Numbers the Figma shows come from proof of concept A. Each appears in a real
report only after the v3 spec that brings it defines it with its denominator
(for example "3,4 nama per jawaban", v3 P0.3, and the word counts, v3 P2.3).
A finding's number is shown as saved and only in a form Spec 021 B-05 keeps:
"X dari Y" where Y is the number of questions the finding cites or a
source's own denominator, a whole number such as "2×", or a figure copied
from an answer. The Figma's finding numbers are per question for that reason
("0 dari 3 pertanyaan", not "0 dari 6 jawaban"). Since v3 revision 6.4 the
sample's finding numbers carry their source ("2 dari 7" ringkasan Google,
"2 dari 10" jawaban ChatGPT) or their split per source beside them. One has
no B-05 form today and waits for the basis v3 P1.2 defines: Temuan 3's
"4 dari 8" klaim.

## 6. How the PDF is made

1. **Same printing service, a new print page.** Browser Run still opens a
   print page with a one-time code (Spec 021 Part P). Today `/r/print` shows
   the web report itself (`src/app/r/print/page.tsx`); it gets a new body
   made of the PDF pages, for Spec 018 reports only. Reports saved before
   Spec 018 keep today's print.
2. **The print request changes.** `pdfRequest` asks today for `format: "a4"`,
   a Browser Run header and footer, and 14 and 16 mm margins
   (`src/lib/orders/report-pdf.ts`). The new request uses the page's own CSS
   page size (1440 × 810), no Browser Run header or footer (the pages draw
   their own), and zero margins.
3. **A page list made by code.** A pure function turns a saved report into
   the ordered list of pages in the §5.2 order (the Report v3 plan's
   "Format of the report PDF"): the front pages, the four content sections
   with their dividers, the Lampiran divider and the appendix questions, and
   the back cover as the last page. A page whose data does not exist is
   left out. Lists that can grow are spread by count, never by
   measuring: one Temuan page per finding, one Langkah page per
   recommendation, at most five "Menurut jawaban AI" lines, at most five
   Celah topik rows (R-18). Because the writer's word limits are soft (a
   too-long text can be saved, and reports written before Part B have no
   limits), the function also gives each report page a word budget, set by
   the spike: a Temuan, Langkah or Penutup text over its budget gets a
   continued page ("lanjutan"), decided before printing from the word count,
   so the contents page stays correct. A text takes as many continued pages
   as it needs and never overflows. For the founder to see how often this
   happens, the existing `report_pdf` log line (numbers and codes only) gains
   one count, `long_texts`, which the PDF route works out by running the
   same page-list function on the saved report it already reads. Splitting by measurement (below) happens
   only inside the appendix, so the report pages and the contents page are
   fixed before printing. Appendix
   pages are labelled A0, A1, A3 · 1/2 and so on, as in the Figma, and the
   contents page points only at the appendix's first page.
4. **Long answers flow onto continued pages.** A small script in the print
   page measures each appendix answer. A block taller than its box is split
   at a paragraph, list item or table row onto "A3 · 2/2"; when both answers
   together are too tall, each source gets its own page. Text is never cut
   and never made smaller than the reference sizes.
5. **"Ready" comes last.** The page sets its ready marker
   (`[data-saved-report="ready"]`) only after the data has arrived, the fonts
   have loaded (`document.fonts.ready`) and the appendix has been split.
   Today the marker is set as soon as the data arrives
   (`src/app/r/SavedReport.tsx`).
6. **Charts are plain HTML and SVG** drawn from the numbers. No chart
   library.
7. **Fonts and tokens follow `DESIGN.md`** as amended by D-3.

## 7. Packages

Each package is one small pull request with its own spec section, tests and
an independent verdict. Merge and deploy stay with the founder.

**Step 0: spike and spec (no product code).** A throwaway test builds a
**maximum-length** PDF: the page list's largest case today (about 47 pages:
10 findings plus `google_finding`, 10 recommendations, the fixed and section
pages, all appendix pages and the back cover) plus continued pages for the longest saved
answers, with embedded fonts,
through the same Browser Run setup on a preview, against today's limits: 30
seconds to load the page and 20 seconds for the ready marker
(`src/lib/orders/report-pdf.ts`). It also renders the worst-case report pages from the
longest texts actually saved on Nuave's orders (not the writer's nominal
limits): the longest finding, the longest recommendation, Penutup with the
longest conclusion, the three-step plan and the counts, Pesaing with the most
businesses, three takeaways, and a report written before Part B. These set
each page's word budget (§6.3). It records the time, the
file size, the page breaks, the fonts and whether each worst case fits. The spec then sets the limits, records D-1 to
D-10, the fixed text (D-7), and the corrected reference export (D-4).

**PR 1: the page frame.** Fonts and tokens (D-3), the new print request, the
page box with header and footer, the page-list function, the ready rule, and
the always-present pages: cover, Daftar isi, Cara membaca laporan, section
dividers, Penutup.
*Done when:* fixture PDFs (§8) have the right size, page count and labels;
pre-Spec-018 snapshots are unchanged.

**PR 2: the report pages from saved data.** Ringkasan (D-9 A), Peta jawaban,
Temuan pages, Pesaing, Celah topik, Rencana, the Langkah pages, with code
headlines (D-6).
*Done when:* every number equals the saved report's per-source counts in a
test, and every field in §5.1 appears.

**PR 3: the appendix.** A0 and one page per question, continued pages, the
states and empty cards (no AI Overview, failed check with "Minta bantuan",
no business named, no sources, no search volume), sources as a numbered
list, and code notes (D-5).
*Done when:* the text check of §8 finds every saved answer, and the longest
saved answer splits cleanly.

**PR 4: the web page line (D-1 option A).** One line on the web report and in
the report-ready email that the PDF is the full designed report; the founder
approves the wording. If the founder later picks B or C, that becomes its
own spec.
*Done when:* the line shows only on two-source reports (a new test asserts
it), the email test output carries it, the pre-Spec-018 snapshots stay
unchanged, and `verify-nuave` passes on a preview.

**PR 4b: the worksheet button (v3 F-13 option A, founder 2026-11-07).** An
"Unduh Lembar Kerja" button next to "Unduh PDF" on the web report, a second
small exception to the freeze. It downloads the worksheet that v3 P0.10
builds and ships with P0.10.
*Done when:* the button shows only on two-source reports and only once P0.10
exists (a new test asserts both), it downloads the worksheet, the
pre-Spec-018 snapshots stay unchanged, and `verify-nuave` passes on a
preview.

**Later PRs, one per v3 package**, each with its designed page (§5.2).

## 8. How it is checked

1. **Fixtures.** NV-3WDSAY and NV-8XAPUF; a clinic named in no answer; named
   in all twenty; three AI Overviews not shown; a failed check on each
   source; no search volume; the longest saved answer; an answer with a
   table; ten other businesses named; a long business name; an answer naming
   no business; a report written before Spec 021 Part B; a report saved
   before Spec 018; the longest finding, recommendation and conclusion saved
   on Nuave's orders; ten findings and ten recommendations. No personal data.
2. **Automatic checks on each fixture PDF.**
   - Page size 1440 × 810, page count and labels equal the final page list
     after splitting.
   - Contents page numbers point at the right pages.
   - No element outside its page box; no empty page.
   - Every count equals the saved per-source counts, and no pooled number
     (D-6's definition) appears outside B-05 writer headlines.
   - Every field in §5.1 is present.
   - Every saved answer is found in the PDF text, compared after removing
     list marks, table bars and line breaks and joining columns, paragraph by
     paragraph.
   - No computed font size below the reference sizes.
   - Fonts embedded, no fallback font.
   - File size and render time inside the spike's limits.
   - No em dash in fixed text.
3. **Old reports.** Spec 021 AC-A5 snapshots and the pre-Spec-018 print pass
   unchanged.
4. **The founder's eye** on the fixture PDFs against the reference export.
5. **The real path.** `verify-nuave` on a preview for PR 1, PR 3 and PR 4.
6. **Independent verdict** on each PR's exact head.

## 9. Cost and limits

- No new model or search calls. The order's worst case stays USD 4.785
  (USD 1.5452 before the report plus three report calls at USD 1.08,
  `src/lib/spending/spend-worst-case.test.ts`), under the USD 5.00 hold.
- Browser Run time grows with the page count; the spike measures the
  maximum-length PDF (about 47 pages plus continued pages) against the
  30-second and 20-second limits before PR 1.
- `PDF_DAILY_CAP` (20 PDFs per report per day) stays.

## 10. Risks

| Risk | What protects against it |
| --- | --- |
| The PDF cannot be made (Browser Run down, daily cap reached) | D-1 option A keeps the web report as the fallback |
| A maximum-length PDF misses the time limits | Step 0 measures it before any product code |
| Writer text longer than the sample breaks a page | Word budgets give report pages continued pages decided before printing; only the appendix splits by measuring; overflow checks on fixtures |
| A page shows a number nobody defined, or a pooled count | §5 and D-6; the "no pooled number" check |
| Saved content disappears from the PDF | §5.1 and its check |
| A report page overflows, including from writer text over its soft limit | Lists spread by count and word budgets with continued pages (§6.3); only the appendix splits by measuring; worst cases from real saved text in the spike |
| Fonts fail in Browser Run | Ready only after `document.fonts.ready`; the embedded-font check |
| The Figma and the code drift apart | Corrected reference export (D-4); the founder's check per PR |

## 11. Not in this plan

- New report content or data (the v3 plan).
- The worksheet (v3 P0.10).
- A web version of the new design.
- Prices, refunds, the delivery promise.
- A4 portrait, dark mode, translated reports.

## 12. Order of work

1. Founder: D-0 to D-10 (D-1, D-2 and D-6 first).
2. Figma corrections (D-4) and the reference export.
3. Step 0 spike and the spec; founder approves the spec.
4. PR 1, PR 2, PR 3, PR 4 (and PR 4b with v3 P0.10), each merged by the founder after its verdict.
5. Later PRs with the v3 packages. If the v3 plan is approved first, its
   Phase 0 layout work and PR 1 to PR 3 are planned together.

## Changes after approval

- **2026-11-07, founder:** the official Nuave logo (`src/components/product/journey/NuaveLogo.tsx`) replaces the "nuave." wordmark text on the cover and in every page header; a back cover is added as the last page (§5.2); Penutup moves before the Lampiran so the back cover closes the PDF (§6.3). The D-4 corrections were applied in the Figma the same day (pooled counts replaced by per-source forms, the re-check promise and the unmeasured and causal lines rewritten, the help line, the Celah topik and Langkah frames added). The same day the founder added two pages from the Report v3 structure (Untuk tim web Anda; Lembar Kerja), and the reference was exported to `experiments/report-pdf-design/reference.pdf` (33 pages; see its [README](../experiments/report-pdf-design/README.md)). D-10 now lists every dark page shown in the approved design (the section dividers, Penutup and the back cover), not only the cover.
- **2026-11-07, founder:** substance and format follow the Report v3 session, and aesthetics and delivery belong to this plan (§5.3). The Figma was restructured to v3's content: a Ringkasan with the verdict and the two source cards, a moment page, five Temuan pages from v3's findings, a Rencana page with v3's six steps, and a Penutup with v3's three phases.
- **2026-11-07, Report v3 revision 6.3** (the plan was approved at 6.1, F-1, and the approval recorded in 6.2): its "Format of the report PDF" sets the page order, and the Figma now follows it (§5.2): Cara membaca laporan before Ringkasan and Peta jawaban as a front page (both had been this plan's proposals, and v3 adopted them), five sections ("Posisi <klinik> hari ini", "Apa kata AI tentang <klinik>", "Apa yang dibaca AI", "Rencana delapan minggu", "Lampiran"), and section titles that state no cause. The "Untuk dikerjakan" divider is gone; its pages sit in sections 03 and 04. Temuan pages now lead with the writer's meaning sentence and show the count beneath it (v3 rule 14). The sample counts are per question or per source (D-6), Cek fakta and A1 keep v3's wording ("…, yang dikutip jawaban ini"; "Tanpa penilaian"), Cara membaca carries all of v3's method lines, and Ringkasan shows the first plan step (D-9 A). The reference was exported again afterwards (39 pages; see the entry below).

- **2026-11-07, founder:** the five section titles are approved as fixed text (D-7): "01 Posisi <klinik> hari ini", "02 Apa kata AI tentang <klinik>", "03 Apa yang dibaca AI", "04 Rencana delapan minggu", "05 Lampiran". v3 F-13 is decided as option A: an "Unduh Lembar Kerja" button next to "Unduh PDF" on the web report (PR 4b). The reference was exported again from the Figma the same day: `experiments/report-pdf-design/reference.pdf`, 39 pages in the §5.2 order.

- **2026-11-07, Report v3 revision 6.4:** "Counts on the PDF pages" becomes the counting rule (§5.3 rule 0). The Figma follows it: finding numbers with their source, Pesaing's "Direkomendasikan" only on the clinic's row, Situs yang dibaca AI counted per source without group totals, and the takeaways with denominators. The reference was exported again.

## Review history

| Round | Head | Verdict | Findings, in short |
| --- | --- | --- | --- |
| 1 | `f79705b` | FAIL | Pages marked "Today" that need unsaved data, and saved fields with no page; pooled counts and a ratio against `AUDIT.md`, Spec 018 AC-20 and Spec 023 R-13; D-1's costs (PDF as the only path, unlisted surfaces, no middle option); the print request and ready marker also change; D-3's other `DESIGN.md` rules; dark cover and footer format against Part P; page list vs continued pages; missing checks; the help path; unmeasured and causal fixed text, and **Download PDF**. All addressed in revision 2. |
| 2 | `6e6d64b` | PASS+NOTES | `conclusion` hidden on Part B reports; recommendation paragraphs and competitor lines without room; the "no pooled number" check against B-05 headlines; option A's real changes; D-6 example not in the code's words; the download label; no Celah topik frame, no place for `label_text`, the live FAQ page, `DESIGN.md`'s "another UI font" rule; PR 4 without "done when"; finish line 2 too broad. All addressed in revision 3. |
| 3 | `5e3004e` | PASS+NOTES | Soft writer limits with no rule for long text on report pages; the spike below the real page maximum (about 46); PR 4's "done when" against finish line 6; D-6's B-05 clause; the Figma's scheduled re-check promise; the Temuan evidence card rule, the number of Pesaing bars, and Langkah pages in the page list. All addressed in revision 4. |
| 4 | `73c939a` | PASS+NOTES | The over-budget case named an order log that does not exist and left the page undefined; the evidence card rule for findings that name no source; a stale risk row; Penutup's place; the re-audit advice card and the clinic's own Pesaing row. All addressed in revision 5. |
| 5 | `9789039` | PASS+NOTES | Three optional notes: the broad "every saved field" wording in §1 and §5.1; the evidence card's basis rule; where `long_texts` is counted. All addressed in revision 6. |
| 6 | `cc1d94a` | FAIL | §5.2 followed the proof of concept's `render()` instead of v3's own page order; pooled finding counts and a false claim that they survive B-05; competitor recommendation counts marked as saved today; Cek fakta and A1 wording that turned "cited by this answer" into a cause and dropped the BPOM qualifiers; method lines missing from Cara membaca; card sentences not in the settled form; Titik awal and Cara membaca marked as waiting for v3; D-10's dark-page list. All addressed in `130090b` (§5.2, §5.3, D-10, the Figma). |
| 7 | `130090b` | PASS+NOTES | Ringkasan and moment-page sentences not in the code's settled form; "Yang dikerjakan dulu" showed recommendation 1, not the first plan step; §5.1 had lost its Peta jawaban mappings and two stale names; Titik awal as a page v3 does not list; Temuan 1's question and answer counts; a Langkah 1 claim beyond the playbook line; the Celah topik headline for a question without AI Overview; the B-05 paragraph; revision numbers; topic names; four small sample issues. All addressed in `f0756c7`. |
| 8 | `f0756c7` | PASS | All round 7 notes resolved. |
| 9 | `3f8a0ca` | PASS+NOTES | Two exported pages with overlapping text (divider 02, Titik awal); the Lembar Kerja row and D-1 still treating the download as open; no checks for the button. All addressed in `f0efe5c`. |
| 10 | `f0efe5c` | PASS | All round 9 notes resolved. |
