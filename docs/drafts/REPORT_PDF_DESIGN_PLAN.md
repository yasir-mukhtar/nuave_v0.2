# Plan: the PDF report design, from Figma to every order

> Status: **Draft, not approved.** Do not implement from this file
> ([`docs/INDEX.md`](../INDEX.md), Working documents). It becomes a plan only
> when the founder approves it (D-0) in [`DECISION_LOG.md`](../DECISION_LOG.md),
> and each package still needs its own approved spec
> ([`WORKFLOW.md`](../WORKFLOW.md)).
> Author: Claude (orchestrator role), 2026-11-07, branch
> `claude/vigilant-cerf-e5kktf`.
> Inputs: the founder's PDF redesign in Figma, page "Redesain Report Nuave"
> (file `W66XEpO1rKQY8vbKyvo7xq`, page `1:156`), made and iterated with the
> founder on 2026-11-07; the draft [Report v3 plan](https://github.com/yasir-mukhtar/nuave_v0.2/pull/205)
> (revision 6.1, PR #205, not merged), whose proof of concept A supplied the
> sample content; [Spec 021](../../specs/021-report-v2/SPEC.md) Part P (the
> server PDF); [Spec 018](../../specs/018-search-grounded-chatgpt-google-audit/SPEC.md)
> (what a saved report holds); [`DESIGN.md`](../DESIGN.md) (report exception);
> [`VOICE.md`](../VOICE.md); the Indonesian writing skill
> `bahasa-indonesia-luwes` (PR #206, not merged).

## 1. What this plan does

The founder approved a new look for the report on 2026-11-07: a landscape,
presentation-ready PDF that reads like an agency report. Every order should
now get a PDF that looks like the Figma pages, filled from the order's own
saved data.

This plan covers **how the report looks and how its pages are made**. It
does not decide **what the report says**. Content stays with Spec 018, Spec
021, Spec 023 and, once approved, the Report v3 plan. A designed page appears
only when the saved report holds the data for it (§5). Nothing is invented to
fill a page.

## 2. Where this sits

| Document | Owns | This plan |
| --- | --- | --- |
| Spec 018 | The ten questions, the two sources, the counts and states | Uses them as they are |
| Spec 021 | Report v2 content; Part P, the server PDF through Browser Run | Keeps Part P's print path; replaces the page layout of the PDF; D-1 changes the web report |
| Spec 023 | The writer's prose | Unchanged; page headlines come from code first (D-6) |
| Report v3 plan (PR #205, draft) | New sections: moment of truth, fact check, website check, sites AI reads, kit, worksheet, stability | Each v3 section gets its designed page when that v3 package ships (§5). The v3 proof of concept is A4 portrait; this plan proposes 16:9 landscape (D-2) |
| `DESIGN.md` | Type families and the report exception | D-3 amends the report exception |
| `VOICE.md`, writing skill | Words and terms | All fixed labels follow them (D-7) |

If D-0 and F-1 (the v3 plan) are both approved, this plan becomes the
"PDF" part of the v3 plan: v3 P0.9 ("PDF: a cover page, a contents box,
page-break rules") is done by this plan's packages instead.

## 3. Finish line

When this plan is done:

1. Every new two-source order's "Unduh PDF" gives the designed PDF: 16:9
   pages, the Figma type, colours and grid, page numbers, a contents page
   with correct page numbers, section dividers, and the appendix with every
   question and both full answers.
2. Pages without data are left out, and the contents page and page numbers
   follow what is left.
3. No text is cut off and no page overflows, on any saved report Nuave has.
4. The PDF still comes within the delivery promise, inside Browser Run's
   limits, with no new provider cost.
5. If D-1 is approved, the private report link opens a short delivery page
   instead of the full web report.
6. Saved reports from before Spec 018 keep the PDF they have today.

## 4. Decisions the founder owes

Each has a recommendation.

| # | Decision | Changes | Recommendation |
| - | -------- | ------- | -------------- |
| D-0 | Approve this plan. | `INDEX.md`, `NOW.md` routing; this file leaves `drafts/` | After review. |
| D-1 | **The PDF becomes the one report.** The private link no longer shows the full web report. It opens a delivery page: the business name, the date, the two source counts, "Unduh PDF" (and later "Unduh Lembar Kerja"), and how to get help. | Spec 021 Part A (phone-first web report, AC-A1) for new orders; the v3 plan rule 10 ("phone first"); report-ready email wording; FAQ and terms where they describe "halaman laporan". The link itself, its 12-month life and the privacy page stay. | **Yes, with one condition** (see below). |
| D-2 | Page format **16:9 landscape, 1440 × 810 CSS pixels** (about 381 × 214 mm), not A4. | Spec 021 Part P (A4 today); v3 P0.9 | Yes. It is what the founder approved, and it fits a meeting screen. It prints on A4 landscape when "fit to page" is chosen, with wider margins. |
| D-3 | Report type: **Newsreader** (headlines and big numbers), **Geist** (text), **Roboto Condensed** (labels, page numbers, small caps lines), **Geist Mono** only for text that shows code (for example robots.txt). Self-hosted font files, used only inside the PDF pages. | `DESIGN.md` report exception (today: a system serif stack only) | Yes. All four are open licences (SIL OFL or Apache 2.0); the spec confirms each file's licence before use. |
| D-4 | The Figma page is the visual reference. At approval, its frames are exported once to `experiments/report-pdf-design/reference.pdf` so reviewers without Figma access see the same thing. Where the Figma and the spec disagree, the spec wins. | None | Yes. |
| D-5 | **Appendix notes ("Catatan Nuave") come from code, not the writer.** A note appears only for a fact the saved report already holds: a claim marked "berbeda" in the fact check, an answer that cited the clinic's site without its name, an AI Overview not shown, a failed check, no search volume, no cited sources, no business named, a stability re-ask. Each note is a fixed sentence with blanks the founder approves once. | Spec 021 Part D (answers) | Yes. Writer-made notes can come later, through Spec 023's quote check. |
| D-6 | **Page headlines that state a conclusion come from code templates first.** For example "Ultima disebut dalam {x} dari {n} jawaban." with the counts filled in. The writer may replace a headline later (v3 P0.5), with the template as its fallback. | Spec 023 (no change until the writer adds fields) | Yes. Same numbers as the cards, no new model cost, and a page never waits for the writer. |
| D-7 | Fixed labels (section names, legends, empty states, "Catatan Nuave", "Tidak dapat diuji", "Minta bantuan") are written once with `VOICE.md` and the writing skill, approved once, and kept in one file. | `VOICE.md` only if a new settled label is added | Yes. |
| D-8 | How the appendix asks for help when a check failed. The Figma A8 says "Balas email pengiriman laporan ini". The real help path must be the one Nuave runs today (`/support`, the support email, or a re-run). | Terms §8 (refund per failed check) wording, if it is quoted | Founder chooses the path; the page shows it word for word. |

**Why the web report should close (D-1), and the condition.** Today the PDF
is already a print of a web page (`/r/print`, Spec 021 Part P). Keeping a
separate phone-first web report means two layouts for every section, kept in
step by hand, and the PDF's fixed pages cannot simply reflow into a phone
column: a landscape page scaled to a 390-pixel phone is too small to read.
Closing the full web report removes that double work.

The condition: most clinic owners will open the email on a phone. A 16:9 PDF
on a phone needs turning the phone sideways or zooming. So the delivery page
must give, on the phone itself, the two numbers that matter and a clear
"Unduh PDF", and the spec must test the PDF in a phone's PDF viewer
(iPhone Files and Android Drive) before launch. If that test is poor, the
founder can keep a short phone summary on the delivery page; the full report
stays PDF-only either way.

## 5. Page inventory and data map

Page numbers follow the Figma order on 2026-11-07. "Today" means a saved
Spec 018 report already holds the data (`src/lib/audit/two-source-report.ts`,
`src/app/audit/report/report-v2-data.ts`). "v3" means the data arrives with
that package of the Report v3 plan; until then the page is left out.

| Page | Data | Source | Shown when |
| --- | --- | --- | --- |
| Cover, with the orbit of 20 answers | Today | each question's state per source (`mentionState`) | Always |
| Daftar isi | Today | the page list this report actually has | Always |
| Cara membaca laporan | Today | fixed text; stability rows only with v3 P3.2 | Always |
| Ringkasan | Today for the counts; v3 for the fact-check figure | `counts`; v3 P1.2 | Always; a figure without data is left out |
| Peta jawaban (topic × clinic grid) | Today | questions, volumes, `competitorRows` | Always |
| Section dividers 01 to 05 | Fixed | the sections this report has | When the section has at least one page |
| Temuan ("0 dari 6" style) | Today, partly | a group of questions where the clinic is never named; the evidence card is v3 P0.1 (moment of truth) | Only when such a group exists; the code rule is set in the spec |
| Pesaing (ranked bars) | Today | `competitorRows`, per source counts | When at least one other business is named |
| Cek fakta | v3 P1.2 | claims compared with the clinic's pages | When P1.2 has rows |
| Kata AI vs Menurut Anda | v3 P2.3 (F-5) | AI's description and the owner's intake answer | When both exist |
| Halaman mereka | v3 P2.2 | page checks of up to three competitors | When P2.2 has rows |
| Situs yang dibaca AI | v3 P2.1 | cited sites grouped by code | When P2.1 has rows |
| Rencana delapan minggu, Detail langkah | Today for the steps; v3 P0.6 for who and how long | `recommendations`; playbook tags (F-2) | When there are recommendations; tags only with F-2 |
| Bahan siap pakai | v3 P2.4 (F-7a) | fixed texts the founder approved | When F-7a ships |
| Lampiran A0, index | Today | questions, states, volumes | Always |
| Lampiran A1 to A10, answers | Today | both full answers, Google references; ChatGPT citations as saved | Always, one question per page, continued pages as needed |
| Penutup, Titik awal | Today for counts; v3 P3.3 for the saved starting point | `counts` | Always |

The Figma also shows numbers that need a code definition before they can
appear, for example "3,4 nama per jawaban" (v3 P0.3) and word counts in "Kata
AI" (v3 P2.3). Each is defined, with its denominator, in the spec of the
package that brings it, never filled in by hand.

## 6. How the PDF is made

In plain words:

1. **Same printing path.** The server still asks Browser Run to open the
   private print page with a one-time code and print it (Spec 021 Part P).
   Only the print page changes.
2. **A page list made by code.** A pure function turns a saved report into
   an ordered list of pages, each with a type and its data. The contents page
   and every page number are taken from that list, so they always match. This
   function has no network calls and is easy to test.
3. **Fixed-size pages.** Each page is a 1440 × 810 box with the Figma grid:
   80-pixel side margins, the header line at the top, the footer line and
   page number at the bottom. The PDF size is set with CSS `@page`, and each
   page box starts on a new PDF page.
4. **Long answers flow onto "lanjutan" pages.** Before the print page says it
   is ready, a small script in the page measures each answer block. If a
   block is taller than its box, it is split at a paragraph, table row or
   list item, and the rest moves to a continued page (A3 · 1/2, A3 · 2/2).
   When both answers together are too tall, each source gets its own page,
   as in the Figma A3. Text is never cut and never shrunk below the Figma
   sizes.
5. **Charts are plain HTML and SVG** drawn from the numbers: the orbit, the
   dots, the bars, the grid. No chart library.
6. **Fonts load before printing.** The page waits for the fonts to finish
   loading (`document.fonts.ready`) before it marks itself ready, so Browser
   Run never prints a fallback font.
7. **Styles stay in the report.** The PDF pages use their own CSS module with
   the Figma tokens (colours, type sizes, spacing). They do not change the
   app's `tokens.css`, and the app does not load the report fonts.
8. **Old reports.** A report saved before Spec 018 keeps today's print page.
   A Spec 018 report saved before this plan gets the new pages that its data
   supports (§5), with nothing rewritten in storage.

## 7. Packages

Each package is one small pull request with its own spec section, tests and
an independent verdict. Merge and deploy stay with the founder.

**Step 0: spike and spec (no product code).** A throwaway test renders
three hard pages (cover, Peta jawaban, a long appendix answer) through the
same Browser Run setup on a preview, to measure: the PDF time for 30 to 35
pages, the file size with embedded fonts, and whether page breaks and fonts
come out right. The numbers go into the spec, which then sets the limits.
The spec also records D-1 to D-8, the fixed labels (D-7) and the exported
reference (D-4).

**PR 1: the page frame.** Fonts, report tokens, the page box, header and
footer, the page-list function, and the always-present pages: cover (with
the orbit), contents, Cara membaca laporan, section dividers, Penutup.
*Done when:* a PDF of NV-3WDSAY and of the fixtures (§8) has the right page
count, size and numbering, and passes the overflow check.

**PR 2: the summary pages from today's data.** Ringkasan, Peta jawaban,
Temuan (if its group exists), Pesaing, the Rencana page with today's
recommendations. Headlines from code templates (D-6).
*Done when:* every number on these pages equals the saved report's counts in
a test, and the fixtures pass the overflow check.

**PR 3: the appendix.** A0 index and one page per question, with continued
pages, the states and empty cards (no AI Overview, failed check, no business
named, no sources, no search volume), sources as a numbered list, and code
notes (D-5).
*Done when:* every saved answer appears in full in the PDF text (a test
extracts the PDF text and finds each answer), and the longest saved answer
splits cleanly.

**PR 4: the delivery page (only if D-1).** The private link shows the
delivery page; the report-ready email, FAQ and terms wording are updated with
the founder's approval.
*Done when:* `verify-nuave` passes on the real path (payment simulated, report
opened from the emailed link, PDF downloaded) and the phone PDF test of §4 is
recorded.

**Later PRs, one per v3 package.** Cek fakta, Kata AI vs Menurut Anda,
Halaman mereka, Situs yang dibaca AI, Bahan siap pakai, the stability rows and
the plan tags each get their designed page in the same pull request as the v3
package that brings their data.

## 8. How it is checked

1. **Fixtures.** Saved reports covering: NV-3WDSAY and NV-8XAPUF; a clinic
   named in no answer; a clinic named in all twenty; three AI Overviews not
   shown; a failed check on each source; no search volume at all; the longest
   saved answer; an answer with a table; ten other businesses named; a long
   business name; an answer that names no business. Fixtures live with the
   tests and hold no personal data.
2. **Automatic checks on every fixture's PDF.** Page size 1440 × 810; page
   count equals the page list; contents numbers match; no element outside its
   page box; no empty page; every count equals the saved data; each full
   answer found in the PDF text; fonts embedded; file size and render time
   inside the limits the spike sets; no em dash in fixed labels.
3. **The founder's eye.** For each PR, the founder compares the fixture PDFs
   with the reference export (D-4) and says go or revise.
4. **The real path.** `verify-nuave` on a preview for PR 1, PR 3 and PR 4.
5. **Independent verdict** on each PR's exact head, as `WORKFLOW.md` requires.

## 9. Cost and limits

- No new model or search calls in PR 1 to PR 4. The order's worst case
  (USD 4.785 today by the v3 plan's reading of
  `src/lib/spending/spend-worst-case.test.ts`, under the USD 5.00 hold) does
  not change.
- Browser Run time grows with the page count. The spike measures it; if a
  35-page PDF is too slow, the appendix pages are simplified before anything
  else is cut.
- `PDF_DAILY_CAP` (20 PDFs per report per day) stays.

## 10. Risks

| Risk | What protects against it |
| --- | --- |
| Landscape PDF is hard to read on a phone | D-1 condition: delivery page summary and the phone viewer test before launch |
| Writer text longer than the Figma sample breaks a page | Measure-and-split for answers; code headlines with length limits; overflow check on fixtures |
| A designed page shows a number nobody defined | §5: a page appears only with its data; every number defined in a spec with its denominator |
| Fonts fail in Browser Run | Wait for fonts before "ready"; a test fails if a fallback font is embedded |
| The Figma and the code drift apart | One reference export (D-4); the founder's visual check per PR |
| Two designs again, if the web report stays | D-1 |

## 11. Not in this plan

- New report content or new data (that is the v3 plan).
- The worksheet ("Lembar Kerja"), which is v3 P0.10; only its download
  button's place on the delivery page.
- A web version of the new design.
- Changes to prices, terms of refund, or the delivery promise.
- A4 portrait, dark mode, or translated reports.

## 12. Order of work

1. Founder: D-0 to D-8 (D-1 and D-2 first, because they change Spec 021).
2. Step 0 spike and the spec; founder approves the spec.
3. PR 1, PR 2, PR 3 (each merged by the founder after its verdict).
4. PR 4, if D-1 is approved.
5. Later PRs together with the v3 packages.

If the v3 plan is approved first, its Phase 0 layout work and PR 1 to PR 3
here are planned together, so the report is laid out once, not twice.
