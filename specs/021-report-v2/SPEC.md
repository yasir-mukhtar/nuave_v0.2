# Spec 021: Report v2, a report worth Rp249.000

> Status: **Approved** by the founder on 2026-10-26, after four prototype
> rounds; the build follows [`PLAN.md`](./PLAN.md) once its independent review
> passes
> Owner: founder; built by Claude Code on `claude/sweet-mayer-3uzcuk` and
> follow-up branches
> Updated: 2026-10-26. Edited after approval from the plan review (rounds 1-2):
> A-04 and A-05 (counts from saved answers, hidden topic rows), A-08 (support
> export), A-11 (light only, **awaiting founder confirmation**: the prototype
> also showed dark mode), P-02 and P-05 (no secret in URLs, own rate limit,
> previews have Browser Run), C-03 (own-site icons), B-05 (headline number
> rule), verdict and Penutup fallbacks.
> Implements: the founder's report feedback of 2026-10-26; moved ahead of G1
> ([decision](../../docs/DECISION_LOG.md#2026-10-26--report-v2-before-g1-confident-advice-no-score))

## Required context

Read in order:

1. `AGENTS.md`, `docs/DESIGN.md` (type roles, motion, report exception),
   `docs/VOICE.md`.
2. **The approved prototype:** `experiments/report-v2-poc/` (open
   `index.html`; `template.html` is the source; `sample-report.pdf` is the
   PDF). It is the visual and behavioural reference for this spec. Where the
   prototype and this text disagree, this text wins.
3. [Spec 018](../018-search-grounded-chatgpt-google-audit/SPEC.md): R-16 to
   R-19 (outcomes, topics, counts), R-28 (privacy) and R-29 (old reports).
   This spec replaces Spec 018's "Report layout" table and keeps everything
   else.
4. The report today: `src/app/r/SavedReport.tsx`, `src/app/audit/ReportView.tsx`,
   `src/app/audit/report/*`, `src/lib/audit/two-source-report.ts`,
   `src/lib/orders/two-source.ts`, `src/lib/orders/runner.ts` (report step),
   `src/lib/audit/report-pipeline.ts`, `src/lib/audit/openai.ts` (writer
   schema), `src/lib/audit/report-prompt-contract.ts`.

Do not load: `archive/`, Spec 014, older report prototypes.

## Problem

The founder's review of a real report (order NV-3WDSAY, 2026-10-26),
summarised:

- **Hard to read.** The header repeats the date and the source names; the two
  summary cards look alike, each with two rows of ten dots; the big picture is
  not visible without scrolling.
- **The answers section is the most painful part:** ten long blocks with two
  full answers each and repeated details.
- **The analysis is a recap, not an analysis.** It restates the counts.
- **The competitor list looks like lazy work:** names only.
- **The recommendations are not authoritative:** "Periksa…", "Pertahankan…",
  then boxes for *Mengapa*, *Berdasarkan*, *Penanggung jawab yang disarankan*
  and *Selesai ketika*.
- **Section names over-explain**, a topic row says "Tidak ada data jumlah
  pencarian", "Tentang audit ini" is long, and "Unduh bukti JSON" has no use
  for a clinic owner.
- **The PDF is the browser's print**, with no reliable page numbers or
  branding.

Causes found in the code (evidence):

- The writer (GPT-5.6 Luna) is told mostly what *not* to say ("Do not diagnose
  one from absence"), reads ChatGPT's answer texts but only counts and cited
  domains from Google.
- Its output format requires *why, basis, owner, done_when, caveat* per
  action, which produces the boxes.
- The competitor list is the names ChatGPT and Google listed themselves, with
  no counts, ratings, links or reasons.
- "Tentang audit ini", the per-answer details and the JSON export come from
  the evidence-first report (Spec 012).

## Desired outcome

A clinic owner opens the report and within one screen knows how visible the
clinic is in ChatGPT and Google's AI Overview, and what that means. Reading
on, they learn something about their market they did not know, see which
competitors AI names and why, and get firm, specific recommendations and a
short plan. The answers stay one click away as proof. "Unduh PDF" gives a
clean, branded PDF of the same report.

## User and situation

A clinic owner (beauty, skin, dental) who paid Rp249.000 and opened the report
from the email link, usually on a phone, sometimes on a laptop, and sometimes
as a PDF to share with staff or an agency.

## Scope

Five parts, built and merged in the order of [`PLAN.md`](./PLAN.md):

- **Part A, layout:** the whole page structure and look of the prototype,
  using what saved Spec 018 reports already hold, so delivered reports improve
  too.
- **Part D, answers:** the questions table with the chat-style side panel.
- **Part P, PDF:** a server-made PDF behind "Unduh PDF".
- **Part C, competitor data:** keep competitor websites, ratings and review
  counts when checks are saved; counts per competitor; logos and links.
- **Part B, writing:** what the report writer reads, how it is instructed,
  what it returns (verdict, findings with a headline number, recommendations,
  competitor reasons and takeaways, closing and plan, topic names, Google
  recommendation reading), and which model writes it.

## Non-scope

- A 0 to 100 score (decision 2026-10-26).
- **The re-audit reminder** ("Jadwalkan audit ulang"): in the plan's wishlist
  since 2026-10-26. Penutup recommends a re-audit after eight weeks in words,
  with no scheduling button.
- New answer sources, more questions, asking from the customer's city,
  re-checking a missing AI Overview (parking lot).
- Reports saved before Spec 018 (one-source, direct-ten): unchanged (Spec 018
  R-29, AC-18 snapshot).
- The landing page's report preview (Spec 020) and the report email: a
  follow-up once Part A ships.
- Stored PDF files: the PDF is made on request and not kept (Spec 016
  non-scope stands).

## Experience

The prototype shows every element below. Customer text is Indonesian and says
"Klinik Anda" for a clinic (Spec 018 AC-20).

### Page order

1. Top bar: Nuave logo, **"Unduh PDF"** (always visible).
2. **Header and Ringkasan** (one block, no section heading).
3. Contents chips: Temuan Utama, Peta Pesaing, Celah Topik, Rekomendasi,
   Penutup, Jawaban AI. No chip for Ringkasan.
4. **Temuan Utama**
5. **Peta Pesaing**
6. **Celah Topik**
7. **Rekomendasi**
8. **Penutup**
9. **Jawaban AI**, ending with the three-line notes (the former "Tentang
   audit ini").
10. **Simpan laporan ini** row with "Unduh PDF", then the footer line.

Sections are full-width bands separated by a thin top line, headed by a large
title and a one-line lede. No "01, 02" numbers. Rekomendasi's band is white at
the top with a soft violet glow toward the bottom right; Penutup's band is
dark (ink); Jawaban AI's band is light grey.

### Header and Ringkasan

- Label "Laporan Visibilitas AI", the clinic name large, one line with the
  address the audit started from and the search place, one line "Diperiksa
  <tanggal> · ChatGPT dan Google AI Overview". Each fact once.
- **Verdict:** one or two sentences in large type, no highlight. Reports
  written before Part B use the saved conclusion's first sentences, cut at a
  sentence end, at most 220 characters; the full conclusion is Penutup's
  paragraph.
- **Two source cards**, each with the source logo (Tabler `IconBrandOpenai`,
  `IconBrandGoogle`), a headline count ("3 dari 10 jawaban", "1 dari 8
  ringkasan AI"), one sentence, and **one row of ten dots**.
- **Dot looks** (Figma `q4dKn79BsqQUPj95Lp5cXD`, node `2011:24`), in this
  legend order:
  - Tidak ada AI Overview: grey ring with a grey dash;
  - Tidak disebut: empty grey ring;
  - Situs dikutip, nama tidak disebut: violet ring with a violet centre dot;
  - Disebut: solid violet;
  - Direkomendasikan: solid violet with a white check;
  - Tidak dapat diuji: dashed grey ring (not in the legend unless present).
  Rings and marks are exactly centred; ring borders meet 3:1 contrast.
- One legend strip under both cards. Each dot opens its question in the side
  panel. A link "Lihat N rekomendasi" goes to Rekomendasi.
- A count with nothing to count says "Tidak diuji" (Spec 018 R-19).

### Temuan Utama

- Each finding: a **headline number** with a short caption on the left ("0
  dari 2" / "pertanyaan treatment medis yang menyebut Klinik Anda"), then a
  title and one paragraph; findings separated by thin lines.
- Question references ("P1", "P5") sit at the end of the paragraph in a
  neutral grey, and open that question.
- Reports written before Part B have no headline number: the finding shows
  title and paragraph only.
- The code-built Google coverage finding stays when it applies.

### Peta Pesaing

- A list sorted by how often AI named each business (both sources together).
  Each row: logo (the site's icon; initials when none or when it fails), name,
  **website as a link** (opens in a new tab, no referrer), rating and review
  count when saved, "N×" named, "direkomendasikan N×", the per-source split,
  and **"Disebut AI karena: …"** when the writer gave a reason.
- The owner's clinic is in the same list, drawn as an inset card inside its
  row (thin violet border, violet-to-white fill) with a "Klinik Anda" label.
  Every row, including the owner's, has the same divider.
- The top five rows show in full; the rest show as chips. A chip with a known
  website or Instagram is a link (outlined, external-link icon, violet on
  hover); a chip without one is plain grey text. A note explains the icon.
- Under the list, two or three **takeaways** from the writer (Part B).
- Spec 018 reports saved before Part C hold only one name list per source, so
  their counts are derived when the page renders, by matching each saved name
  in the saved answer texts (the same matching that highlights names); they
  show no recommended counts, ratings or links.

### Celah Topik

- Rows are short topic names ("Bekas jerawat dan bopeng"), never questions.
- Right column: "±1.146 pencarian/bulan" when the search volume is known;
  otherwise **"N klinik lain disebut AI"** for that topic (named businesses
  found in that question's answers). Never "Tidak ada data jumlah
  pencarian".
- Each row says where the clinic stands, the sites AI used ("Sumber yang
  dipakai AI: …") and the question references. Hidden when empty.

### Rekomendasi

- Numbered white cards (violet number circle, neutral border, subtle neutral
  shadow): a firm title that starts with a verb, then one paragraph that says
  how it works and exactly what to do.
- None of *Mengapa*, *Berdasarkan*, *Penanggung jawab yang disarankan*,
  *Selesai ketika*, "Kerjakan dulu" or caveat lines.
- Reports written before Part B: title = saved action, paragraph = saved
  "why".

### Penutup

- A conclusion paragraph, a three-step plan with week ranges, and a card
  "Audit ulang setelah 8 minggu" explaining why and that the same ten
  questions make the result comparable. No button (wishlist).
- Reports written before Part B show the saved conclusion and the re-audit
  card (no plan).

### Jawaban AI

- A table with its header row inside: "#", "Pertanyaan", ChatGPT logo,
  Google logo (shadcn Tooltip). Each row: number, question (with a "menyebut nama Anda" tag
  when the question names the clinic), and one dot per source.
- Hovering or focusing a header logo shows a tooltip above it, centred
  ("ChatGPT", "Google AI Overview"). Hovering a row's dot shows "ChatGPT ·
  Disebut" and so on.
- Clicking a row, a dot or a "P" reference opens the **side panel**: from the
  right on a laptop, full width on a phone; tabs ChatGPT and Google AI
  Overview; a chat layout (question as the user's bubble, the answer as the
  reply with the status pill, names highlighted, sources as chips, time);
  "Sebelumnya" and "Berikutnya"; Escape and the close button return focus.
- **Motion:** the backdrop fades in and the panel slides in, both with an
  ease-in-out curve, and reverse on close; transform and opacity only, so it
  holds 60 fps; reduced-motion users get an instant change.
- Notes under the table: answers change with time, model, account and place;
  where the questions were asked from; mentioned is not recommended; one more
  line when questions came from the clinic's profile because search data was
  missing.

### PDF

- "Unduh PDF" (top bar and end row) downloads a file named
  `Laporan-Nuave-<klinik>.pdf`, made on the server from the same report.
- A4; page 1 is the header, verdict and source cards; Temuan Utama,
  Rekomendasi and Penutup start new pages; then an appendix "Lampiran:
  jawaban lengkap" with every answer in the chat style; a footer on every
  page "Nuave · Laporan Visibilitas AI · <klinik>" and "<n> / <total>";
  always the light palette.
- While it is being made the button shows a spinner (a few seconds). If it
  fails, a short message offers to try again; the page itself is unaffected.

## Requirements

### Part A, layout

- **A-01** Page order, bands, chips and header as in "Experience".
- **A-02** Source cards, dots and legend as specified; headline counts equal
  the dots of each look; every dot opens its question.
- **A-03** Findings layout, with and without a headline number; neutral
  question references.
- **A-04** Competitor list layout from the data saved today, with counts
  derived at render time as described in Peta Pesaing; richer fields arrive
  with Part C.
- **A-05** Celah Topik as specified; a row whose saved topic equals its
  question text has no topic name and is left out until Part B supplies
  names.
- **A-06** Recommendation cards as specified, with the pre-Part B fallback.
- **A-07** Penutup as specified, with the pre-Part B fallback.
- **A-08** No "Unduh bukti JSON" on Spec 018 reports. Support keeps the
  export through a new `npm run support -- export <order>` that builds the
  same JSON from the saved order. Reports saved before Spec 018 keep their
  button.
- **A-09** Reports saved before Spec 018 render exactly as today (the
  existing snapshot passes unchanged).
- **A-10** Typography uses `docs/DESIGN.md` roles (`npm run check:typography`
  passes); icons from Tabler; generic parts from shadcn/Base UI.
- **A-11** The page works from 320px to 1920px wide with no sideways scroll,
  in the product's light palette (the design system has no dark scheme).

### Part D, answers

- **D-01** Table, tooltips and side panel as specified, using the shadcn
  `Sheet` and `Tabs` and the motion presets in `src/components/motion/`.
- **D-02** The panel is a labelled dialog; focus moves in and back; tabs
  work with arrow keys; Escape closes.
- **D-03** Opening and closing animate only transform and opacity, with an
  ease-in-out curve; reduced motion removes the slide.

### Part P, PDF

- **P-01** A server route makes the PDF from the saved report with
  Cloudflare Browser Run (Workers Paid; 10 browser-hours a month included,
  then USD 0.09 per hour, checked 2026-10-26) and returns it as a download.
- **P-02** It takes the same secret as the report-data route, in a POST
  body, and never puts it in any URL (Browser Run's dashboard logs target
  URLs); a wrong secret gets the same "not available" answer. It has its own
  tighter rate limit and a per-report daily cap, so one link cannot use up
  the included browser hours.
- **P-03** Layout as in "Experience" (A4, page breaks, footer, appendix,
  light palette).
- **P-04** Nothing is stored; each download is made fresh from the saved,
  unchanging report.
- **P-05** Failure shows a retry message. Production and PR previews have
  Browser Run; where it is missing (local development, offline tests) the
  route answers `pdf_unavailable` and the button uses the browser's print.
  Reports saved before Spec 018 keep the browser's print.

### Part C, competitor data

- **C-01** When a check is saved, keep for each business that ChatGPT's or
  Google's own page listed: name, website or Instagram, rating, review count,
  when present. Never phone numbers (Spec 018 R-28).
- **C-02** Per business, code counts times named per source, times
  recommended, and which questions.
- **C-03** Logos come from the business's own site icon
  (`https://<domain>/favicon.ico`), loaded by the browser without a referrer;
  no third-party icon service; initials on error or with no site; never a
  logo guessed from a name; no logo requests in synthetic mode.
- **C-04** Links only for addresses that came from the provider data or the
  answers' cited sources.

### Part B, writing

- **B-01** The writer reads (within Spec 018 R-28): the questions and topics,
  both sources' answer texts and cited domains, the code-built counts, the
  businesses named per answer, the clinic's confirmed profile, and Nuave's
  playbook.
- **B-02** Nuave's playbook, `docs/content/report/PLAYBOOK.md`: how ChatGPT
  and Google's AI Overview choose which clinics to name and what clinics can
  do, from public, checkable guidance; approved by the founder before use.
- **B-03** Instructions ask for analysis, not a recap, from angles such as:
  which sites AI relies on and whether the clinic is on them; which kinds of
  questions name the clinic; what AI says that is wrong or missing; how the
  two sources differ; what the favoured clinics have in common. Facts must
  come from the answers; advice may be confident expert guidance from the
  playbook; no sentence claims what *caused* this clinic's result (decision
  2026-10-26).
- **B-04** The writer returns: a verdict; 3 to 6 findings, each with title,
  paragraph, question ids and an optional headline number with caption (the
  number must be checkable against the code-built counts or the answers);
  3 to 6 recommendations (verb-first title and argument); per competitor a
  short "disebut karena" reason; 2 or 3 takeaways; a conclusion and a
  three-step plan with week ranges; a topic name for any question without
  one; a recommendation reading for each AI Overview that names the clinic.
  Reports keep a new version string; older versions still render.
- **B-05** The existing count check covers the new fields. A headline number
  is kept only if code can confirm it: a count over the finding's cited
  questions or a source's completed checks ("X dari Y"), a count of distinct
  cited domains or named businesses in the cited answers, or a figure that
  appears verbatim in a cited answer. Otherwise it is dropped and the finding
  keeps its text.
- **B-06** Titles never start with "Periksa", "Pertahankan", "Pertimbangkan"
  or "Pastikan"; no "Mengapa"/"Berdasarkan" labels; a code check asks for one
  revision, as today.
- **B-07** Model choice by side-by-side test on the same saved answers: GPT-5.6
  Luna (today) and at least one Claude model (Sonnet 5.5; Opus 5.5 if
  affordable). The founder reads the reports and picks. Cost and time per
  report are recorded and must fit the per-order limit (USD 2.00) with room.

## Failure and recovery

- A failed check shows "Tidak dapat diuji" and "Minta bantuan" wherever its
  question appears (dot, row, panel). No button runs it again.
- If the writer fails its checks after one revision, the existing repair
  applies and the order is never failed for writing quality (Spec 018 B-4).
- A logo that fails shows initials. A PDF that fails shows a retry message.
- A report saved before a part shipped shows that part only where its saved
  data allows. Nothing is regenerated when a report is opened (S0).

## Evidence, data, privacy, and cost

- No new answer data is collected; Part C keeps more of what the provider
  already returns, never phone numbers.
- The playbook states general guidance, not claims about a named business.
- No claim of cause, ranking guarantee or service quality (`AGENTS.md` 8, 9).
- **Cost:** Parts A, D and C add no provider calls. Part P uses Browser Run
  (within the included hours at current volume). Part B's side-by-side test
  needs a named founder approval for its live writer calls, and a Claude
  model needs an Anthropic API key, which is a new paid provider and needs a
  founder decision (`AGENTS.md`).

## Acceptance criteria

### Part A

- **AC-A1** A saved Spec 018 report on a 390×844 phone shows the date and the
  source names once, and the verdict and the first source card's dots without
  scrolling.
- **AC-A2** With answers not named, cited, named, recommended, failed, and a
  missing AI Overview, each dot shows its look, centred, and each card's
  headline count equals its dots.
- **AC-A3** Sections and chips appear in the specified order and names; no
  Ringkasan chip.
- **AC-A4** No recommendation shows the removed labels; "Tidak ada data jumlah
  pencarian", "Unduh bukti JSON" and "Tentang audit ini" appear nowhere on a
  two-source report.
- **AC-A5** A report saved before Spec 018 renders exactly as before.
- **AC-A6** `npm run verify` passes; the `verify-nuave` journey reaches the
  report; an automated check finds no sideways scroll at 320, 390, 768, 1280
  and 1920 wide.
- **AC-A7 (judgement)** The founder reads NV-3WDSAY in the new layout on a
  phone and agrees it matches the prototype's intent.

### Part D

- **AC-D1** Clicking a row, a dot or a "P" reference opens the panel on that
  question and source; Escape closes it and focus returns.
- **AC-D2** Opening the panel runs without long frames on a mid-range laptop
  (no frame over 20 ms in a Chromium trace).

### Part P

- **AC-P1** "Unduh PDF" downloads an A4 PDF with the footer and page numbers
  on every page, page breaks as specified, and the appendix.
- **AC-P2** A wrong secret gets "not available"; the secret never appears in
  a URL outside Cloudflare.

### Part C

- **AC-C1** From saved checks naming businesses, the map shows correct counts
  per source, rating and reviews when saved, links only for saved addresses,
  and the owner's card.
- **AC-C2** No phone number appears in saved competitor data.

### Part B

- **AC-B1** The writer input holds Google's answer texts and the playbook, and
  no phone numbers.
- **AC-B2** A banned title start is revised once; the delivered report has
  none; a wrong headline number is dropped.
- **AC-B3** The side-by-side test is recorded and the founder's pick is in
  use.
- **AC-B4 (judgement)** On NV-3WDSAY, the founder judges at least two findings
  new information and the recommendations firm and specific.

## Decisions (founder, 2026-10-26)

- **D-1** Confident advice without claiming causes.
- **D-2** Before G1, out of the parking lot.
- **D-3** No score yet.
- **D-4** Lo-fi prototype first; approved after four rounds.
- **D-5** The server-made PDF comes with this work.
- **D-6** The re-audit reminder goes to the wishlist.

## Open questions

- **Anthropic API key** for the B-07 side-by-side test (new paid provider;
  founder). Without it, B-07 compares the models available through the
  existing providers.
