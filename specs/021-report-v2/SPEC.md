# Spec 021: Report v2, a report worth Rp249.000

> Status: **Draft**, waiting for the founder's approval
> Owner: founder; built by Claude Code on `claude/sweet-mayer-3uzcuk`
> Updated: 2026-10-26
> Implements: the founder's report feedback of 2026-10-26; moved ahead of G1
> ([decision](../../docs/DECISION_LOG.md#2026-10-26--report-v2-before-g1-confident-advice-no-score))

## Required context

Read in order:

1. `AGENTS.md`, `docs/DESIGN.md`, `docs/VOICE.md`.
2. [Spec 018](../018-search-grounded-chatgpt-google-audit/SPEC.md): the
   "Report layout" table, R-16 to R-19 (outcomes, topics, counts), R-28
   (privacy) and R-29 (old reports). This spec replaces that layout table and
   keeps everything else.
3. The report today: `src/app/audit/report/DirectTenReportPage.tsx`,
   `DirectTenReportBody.tsx`, `TwoSourceSections.tsx`,
   `src/lib/audit/two-source-report.ts`, `src/lib/orders/two-source.ts`,
   `src/lib/audit/report-prompt-contract.ts`.
4. The reference look the founder likes: isitagentready.com (a short, clean
   header; the result visible at once; one row per check, details on click).

Do not load: `archive/`, Spec 014, older report prototypes.

## Problem

The founder's review of a real report (order NV-3WDSAY, 2026-10-26),
summarised:

- **Hard to read.** The header says the date twice and "ChatGPT and Google AI
  Overview" twice. The two summary cards look alike, and each has two rows of
  ten dots that take effort to compare. The big picture is not visible
  without scrolling.
- **The answers section is the most painful part.** Ten long blocks, each
  with two full answers and repeated details (place, time, sources, notes).
- **The analysis is a recap, not an analysis.** It restates the counts
  ("you don't say") instead of showing the owner something they did not
  know.
- **The competitor list looks like lazy work.** It lists names, with no sense
  of how strong each competitor is or what the owner can learn from them.
- **The recommendations are not authoritative.** "Periksa…",
  "Pertahankan…", followed by boxes for *Mengapa*, *Berdasarkan*,
  *Penanggung jawab yang disarankan* and *Selesai ketika*.
- **Section names over-explain** ("Topik yang belum menyebut Anda"), and a
  topic row says "Tidak ada data jumlah pencarian", which reads as an
  admission of not knowing.
- **"Tentang audit ini" explains the method at length**, and **"Unduh bukti
  JSON"** has no use for a clinic owner.

Causes found in the code (evidence, not guesses):

- The report writer (GPT-5.6 Luna) is told mostly what *not* to say (for
  example "Non-appearance alone does not show a missing page… Do not
  diagnose one from absence") and gets ChatGPT's answer texts but only
  counts and cited domains from Google.
- The writer's output format requires *why, basis, owner, done_when* and
  *caveat* for every action, which produces the boxes.
- The competitor list is the names ChatGPT and Google listed themselves,
  without counts, ratings or reasons, although the answers usually say why
  each clinic was picked.
- "Tentang audit ini", the per-answer details and the JSON export come from
  the evidence-first report (Spec 012), whose job was to prove the method.

## Desired outcome

A clinic owner opens their report and within one screen knows how visible
their clinic is in ChatGPT and in Google's AI Overview, and what that means.
Reading on, they learn something about their market they did not know,
see which competitors AI favours and why, and get a short list of firm,
specific recommendations they believe. The answers stay available as proof,
one click away.

## User and situation

A clinic owner (beauty, skin, dental) who paid Rp249.000 and opened the
report from the email link, usually on a phone, sometimes on a laptop, and
sometimes as a PDF to share with staff or a marketing person.

## Scope

Built in four parts, one pull request each, in this order. A part may ship
before the next one starts.

- **Part A: clean layout.** Header, summary, section names and order,
  recommendation layout, topic gaps, the short disclaimer, no JSON button.
  Uses only what saved reports already hold, so it improves every Spec 018
  report, including ones already delivered.
- **Part B: deeper writing.** What the report writer reads, how it is
  instructed, what it returns, and which model writes it. Applies to reports
  made after it ships.
- **Part C: competitor map.** Per-competitor counts, strength signals,
  logos and takeaways. Applies to reports made after it ships (logos and
  counts may also show on older Spec 018 reports where the saved data allows).
- **Part D: answers as a list with a side panel.** A one-line row per
  question; a click opens the full answers in a chat-like panel; the PDF
  prints them as an appendix.

## Non-scope

- A 0 to 100 score (founder decision 2026-10-26: not yet).
- New answer sources, more questions, asking from the customer's city, or
  re-checking a missing AI Overview (these stay in the plan's parking lot).
- Reports saved before Spec 018 (one-source, direct-ten): they keep
  rendering exactly as today (Spec 018 R-29, AC-18 snapshot).
- Server-side PDF. The browser's print path stays.
- The landing page's report preview (`ReportShowcase`, Spec 020) and the
  report email. They are updated in a follow-up once Part A's names settle.
- A polished visual design. This is a lo-fi build from this spec; the
  founder tweaks the look later.

## Experience

### Page order (Part A)

1. **Header**
2. **Ringkasan** (the summary; no section number)
3. **Temuan Utama** (key findings)
4. **Peta Pesaing** (competitor map)
5. **Celah Topik** (topics where the clinic is missing)
6. **Rekomendasi**
7. **Jawaban AI** (the questions and answers, as proof)
8. **Catatan** (three short lines)

The sticky contents chips use these names. Section numbers 01 to 06 stay on
the numbered sections (Temuan Utama to Jawaban AI).

### Header (Part A)

- A small label "Laporan Visibilitas AI".
- The clinic name, large.
- One line: the website or Instagram address the audit started from and
  the search place, for example "rumahkhitanan.com · Padang".
- One line: "Diperiksa 26 Oktober 2026 · ChatGPT dan Google AI Overview".
  The date appears once. A check window over two days shows the last day.
- No facts box, no "Isi laporan" label, no illustration.
- "Download PDF" stays in the top bar.

### Ringkasan (Part A; the verdict improves in Part B)

Visible on a 390×844 phone without scrolling past the first source card.

- **Verdict:** one or two sentences in large type. Part A shows the saved
  conclusion; Part B makes it a sharp verdict.
- **Two source cards**, each starting with the source's logo (Tabler
  `IconBrandOpenai` for ChatGPT, `IconBrandGoogle` for Google AI Overview)
  and name, so they are told apart at a glance.
- **ChatGPT card:**
  - Headline: "Disebut di X dari N jawaban · direkomendasikan di Y".
  - **One row of ten dots**, one per question in order. Each dot is one of:
    - *not mentioned*: an empty ring;
    - *mentioned*: a light fill;
    - *recommended*: a solid fill with a small check;
    - *not tested* (a failed check): a faint dashed ring.
- **Google AI Overview card:**
  - Headline: "Disebut di W dari Z ringkasan AI", and when Google showed no
    AI Overview for some questions, "· tidak ada AI Overview di K
    pertanyaan".
  - One row of ten dots with the same looks, plus *no AI Overview*: a small
    grey dash in place of a dot. Until Part B adds a recommendation reading
    for Google, Google dots are never "recommended".
- **One legend** under both cards explains the looks once.
- A count with nothing to count says "Tidak diuji", never "0 dari 0" (Spec
  018 R-19, unchanged).
- Each dot has an accessible name ("Pertanyaan 3: direkomendasikan"), and
  clicking a dot goes to that question in Jawaban AI.
- Under the cards, one link: "Lihat N rekomendasi" to the Rekomendasi
  section.

### Temuan Utama (Part A layout; Part B content)

- Each finding: a short title and one paragraph. No "Berdasarkan
  pertanyaan" list under each finding; the question numbers it relies on
  appear as small links at the end of the paragraph.
- The code-built Google coverage finding stays when it applies.

### Peta Pesaing (Part A tidy list; Part C full map)

- **Part A:** one combined list of the other businesses named, each with
  small "ChatGPT" and/or "Google" marks for where it appeared, instead of
  two comma-separated lists.
- **Part C:** see "Competitor map" below.

### Celah Topik (Part A)

- Each row is a **topic** (a short service name such as "laser hair
  removal"), never a full question. A question with no saved topic is
  left out of this section.
- When a search volume exists it shows: "±1.900 pencarian/bulan". When it
  does not, nothing is said about volume.
- The websites AI quoted for that topic show as "Sumber yang dipakai AI:
  alodokter.com, …".
- The section is hidden when it has no rows.

### Rekomendasi (Part A layout; Part B content)

- Numbered cards: **1**, **2**, **3** …
- Each card: the action as a firm, specific title, then one argument
  paragraph that explains how it works, how to win, and what exactly to do.
- No *Mengapa*, *Berdasarkan*, *Penanggung jawab yang disarankan*, *Selesai
  ketika*, "Kerjakan dulu" or caveat lines.
- For reports saved before Part B, the title is the saved action and the
  paragraph is the saved "why".

### Jawaban AI (Part A moves it; Part D redesigns it)

- **Part A:** the section moves after Rekomendasi and is renamed "Jawaban
  AI". Inside, the question blocks stay as they are, except the topic line
  "Tidak ada data jumlah pencarian" is no longer shown.
- **Part D:** see "Answers list and side panel" below.

### Catatan (Part A)

Three short lines, in small type, replacing "Tentang audit ini":

- "Jawaban AI dapat berubah menurut waktu, model, akun, dan lokasi."
- "Pertanyaan diajukan dari Indonesia" (or the search place, when Google was
  asked from a city: "Pertanyaan diajukan dari Indonesia; Google dari
  Padang").
- "Disebut belum tentu direkomendasikan."

When the questions were written from the clinic's profile because search
data was missing, a fourth line says so plainly. "Laporan dibuat", the
system, the model and the JSON wording are not shown.

### Bottom of the page (Part A)

"Download PDF" and "Butuh bantuan? support@nuave.ai". No "Unduh bukti JSON"
button.

### Competitor map (Part C)

- A table (cards on a phone), sorted by how often AI named them:
  - **logo** (the competitor website's icon; their initials in a circle
    when there is no website or the icon does not load);
  - **name**, and website when known;
  - **"Disebut 7× dari 20 jawaban"**, with a ChatGPT/Google split;
  - **"Direkomendasikan 4×"** (ChatGPT, and Google once Part B reads it);
  - **rating and review count** when ChatGPT's or Google's own page showed
    them;
  - **"Dipuji AI karena:"** a short phrase taken from the answers, for
    example "spesialis laser, ulasan 4.8 dari 1.200 pasien".
- The owner's clinic appears as one highlighted row in the same table, so
  they see where they stand.
- The top five show in full; the rest show as a compact list of names with
  their counts, so thirty names stay tidy.
- Under the table, **2 or 3 takeaways** written by the report writer: what
  the leaders do that AI rewards, and what the owner can copy.

### Answers list and side panel (Part D)

- **List:** one row per question: number, the question, a ChatGPT mark and a
  Google mark using the same four looks as the summary dots.
- **Click a row:** a side panel (from the right on a laptop, full-height
  sheet on a phone) with tabs "ChatGPT" and "Google AI Overview".
- **Inside the panel**, styled like a chat app: the question as the user's
  bubble, the answer as the assistant's reply (formatted text), the clinic's
  name and competitors' names highlighted, sources as small chips at the
  end, and the time in small text.
- A failed check shows "Tidak dapat diuji" and "Minta bantuan", as today. A
  missing AI Overview shows "Google tidak menampilkan AI Overview untuk
  pertanyaan ini."
- Escape or the close button closes the panel and returns focus to the row.
  Arrows or "Berikutnya" move to the next question without closing.
- **PDF:** the panel never prints. The list prints, followed by an appendix
  "Lampiran: jawaban lengkap" with every question and both answers in the
  same chat style. One page, two layouts (screen and print); no second
  page to maintain.

## Requirements

### Part A

- **A-01 Header.** As described; the date and the source names each appear
  once.
- **A-02 Summary cards.** Source logos; one row of ten dots per source with
  the looks above; one shared legend; the counts in the headline equal the
  dots of each look. Dots link to their question.
- **A-03 Section names and order.** As in "Page order"; the contents chips
  follow.
- **A-04 Findings.** Title and paragraph; question numbers as small links.
- **A-05 Competitor list.** One combined list with source marks.
- **A-06 Topic gaps.** Topic names only; volume only when known; never "Tidak
  ada data jumlah pencarian"; hidden when empty.
- **A-07 Recommendations.** Number, firm title, one paragraph; none of the
  removed boxes.
- **A-08 Catatan.** The three (or four) lines; "Tentang audit ini" and its
  method paragraph are gone from two-source reports.
- **A-09 No JSON button** on the report page. The server export stays for
  support use.
- **A-10 Old reports.** Reports saved before Spec 018 render exactly as
  today (the existing snapshot test passes unchanged).
- **A-11 Print.** The PDF shows the same order and content; the sticky bars
  and links do not print.
- **A-12 Words.** Customer text is Indonesian, follows `docs/VOICE.md`, and
  says "Klinik Anda" for a clinic (Spec 018 AC-20).

### Part B

- **B-01 What the writer reads.** Within Spec 018 R-28 (no phones, no raw
  responses): the questions and topics, both sources' answer texts and
  cited domains, the code-built counts, the businesses named per answer,
  and the clinic's confirmed profile (services, place, website).
- **B-02 Nuave's playbook.** A short written guide in Nuave's voice,
  `docs/content/report/PLAYBOOK.md`, on how ChatGPT and Google's AI Overview
  choose which clinics to name, and what clinics can do about it. It is
  based on public, checkable guidance, reviewed and approved by the founder
  before the writer uses it, and given to the writer with every report.
- **B-03 How the writer is instructed.** The instructions ask for analysis,
  not a recap: each finding must show the owner something the counts alone do
  not, from angles such as:
  - which websites AI relies on for this market, and whether the clinic is on
    them;
  - which kinds of questions name the clinic and which do not (for example
    general questions versus treatment questions);
  - what AI says about the clinic that is wrong, out of date or missing;
  - how ChatGPT and Google differ, and why that matters;
  - what the clinics AI favours have in common.

  "Do not diagnose from absence" is replaced by the founder's rule of
  2026-10-26: facts must come from the answers; advice may be confident
  expert guidance drawn from the playbook; never claim that something *caused*
  this clinic's result.
- **B-04 What the writer returns.**
  - a verdict of one or two sentences;
  - 3 to 6 findings (title and paragraph, with the question numbers they use);
  - 3 to 6 recommendations (a firm title starting with a verb, such as
    "Gunakan satu alamat yang sama di website dan semua media sosial", and
    one argument paragraph);
  - for each competitor, a short "praised for" phrase taken from the answers,
    and 2 or 3 competitor takeaways;
  - a short topic name for any question that has none;
  - a recommendation reading for each Google AI Overview that names the
    clinic.

  The old fields stay readable for reports saved before Part B.
- **B-05 Count check stays.** The existing check that rewrites a sentence
  with a wrong count stays and covers the new fields.
- **B-06 Banned shapes.** Titles never start with "Periksa", "Pertahankan",
  "Pertimbangkan" or "Pastikan"; no "Mengapa"/"Berdasarkan" labels; no
  sentence that only restates a count shown in Ringkasan. A code check
  rejects the banned starts and asks for one revision, as today.
- **B-07 Model choice by side-by-side test.** The same saved answers
  (NV-3WDSAY) are written by GPT-5.6 Luna (today), Claude Sonnet 5.5 and
  Claude Opus 5.5 with the new instructions. The founder reads the three
  reports and picks one. The pick, its cost per report and its time per
  report are recorded. It must fit the per-order limit (USD 2.00) with room
  to spare; today's whole order costs about USD 0.18.

### Part C

- **C-01 Saved competitor details.** When a check is saved, keep for each
  business that ChatGPT's or Google's own page listed: name, website, rating
  and review count, when present. Never phone numbers (Spec 018 R-28).
- **C-02 Counts.** Per competitor: times named per source, times
  recommended, and which questions. Built by code.
- **C-03 Logos.** From the competitor's website icon; initials otherwise;
  never a logo guessed from the name. Loading a logo never sends the report's
  private link (no referrer).
- **C-04 Layout.** As in "Competitor map", including the clinic's own row
  and the compact tail.
- **C-05 Takeaways.** From Part B's writer, each tied to questions.

### Part D

- **D-01 List and panel.** As in "Answers list and side panel", using the
  existing shadcn `Sheet` and `Tabs`.
- **D-02 Keyboard and screen reader.** The panel is a dialog with a title;
  focus moves in and back; tabs work with arrow keys.
- **D-03 PDF appendix.** Every answer prints in full, in the chat style.
- **D-04 Deep link.** A dot in Ringkasan opens that question's panel.

## Failure and recovery

- A failed check shows "Tidak dapat diuji" and "Minta bantuan" wherever that
  question appears (dot, row, panel), as today. No button runs it again.
- If the Part B writer fails its checks after one revision, the existing
  repair (code-built count sentences) applies, and an order is never failed
  for writing quality (Spec 018 B-4, unchanged).
- If a competitor's logo does not load, initials show. Nothing breaks.
- A report saved before a part shipped shows that part's new layout only
  where its saved data allows. Nothing is regenerated when a report is opened
  (S0).

## Evidence, data, privacy, and cost

- No new answer data is collected. Part C keeps more of what the provider
  already returns (website, rating, review count), never phone numbers.
- The playbook (B-02) states general guidance, not claims about any named
  business, and is approved by the founder.
- The report never claims a cause, a ranking guarantee, or the quality of
  any clinic's actual service (`AGENTS.md` rules 8 and 9).
- **Cost:** Part A, C and D add no provider calls. Part B's side-by-side test
  needs a named founder approval for its live writer calls (estimated under
  USD 2 in total; the result is recorded). A more capable writer may raise the
  per-order cost; it is measured in B-07 before the switch.

## Acceptance criteria

### Part A

- **AC-A1:** Given a saved Spec 018 report, when it opens on a 390×844
  phone, then the header shows the date once and the source names once, and
  the verdict and the ChatGPT card's ten dots are visible without scrolling.
- **AC-A2:** Given answers where the clinic is not named, named, and named
  and recommended, plus a failed check and a missing AI Overview, then each
  dot shows the matching look, and each card's headline counts equal its
  dots.
- **AC-A3:** The sections appear in the order of "Page order", with the new
  names in the page and in the contents chips.
- **AC-A4:** No recommendation shows "Mengapa", "Berdasarkan", "Penanggung
  jawab yang disarankan", "Selesai ketika" or "Kerjakan dulu".
- **AC-A5:** "Tidak ada data jumlah pencarian" and "Unduh bukti JSON" appear
  nowhere on a two-source report, and Celah Topik lists topic names only.
- **AC-A6:** "Tentang audit ini" is replaced by Catatan's three lines (four
  when search data was missing).
- **AC-A7:** A report saved before Spec 018 renders exactly as before (the
  existing snapshot passes unchanged).
- **AC-A8:** `npm run verify` passes, and the `verify-nuave` journey reaches
  the report and its PDF.
- **AC-A9 (judgement):** the founder reads the NV-3WDSAY report in the new
  layout on a phone and agrees the big picture is clear within one screen.

### Part B

- **AC-B1:** The writer's input holds Google's answer texts and the
  playbook, and no phone numbers.
- **AC-B2:** A recommendation title that starts with a banned word is
  rejected and revised once; the delivered report contains none.
- **AC-B3:** The side-by-side test is run and recorded (three reports, cost
  and time each), and the founder's pick is the model in use.
- **AC-B4 (judgement):** on the NV-3WDSAY answers, the founder judges that
  at least two findings say something not visible from the counts, and that
  the recommendations read as firm and specific.

### Part C

- **AC-C1:** Given saved checks naming competitors, the map shows each with
  correct counts per source, its rating and reviews when saved, and the
  clinic's own row.
- **AC-C2:** A competitor with no website shows initials; a broken logo
  shows initials.
- **AC-C3:** With 30 competitors, five show in full and the rest in the
  compact list.

### Part D

- **AC-D1:** Clicking a question row opens the panel on that question with
  ChatGPT selected; the Google tab shows its answer, "no AI Overview", or
  "failed".
- **AC-D2:** Escape closes the panel and focus returns to the row.
- **AC-D3:** The printed PDF holds no panel and has every answer in the
  appendix.

## Decisions (founder, 2026-10-26)

- **D-1 Confident advice.** Facts must come from the answers; advice may be
  confident expert guidance; the report never claims what caused a result.
- **D-2 Before G1.** This work moves ahead of G1, out of the parking lot.
- **D-3 No score yet.** No 0 to 100 score; the verdict and the dots carry the
  big picture.
- **D-4 Lo-fi from this spec.** No Figma first; the founder adjusts the
  look after seeing it.

## Open questions

None blocking Part A. Part B's model choice is settled by B-07.
