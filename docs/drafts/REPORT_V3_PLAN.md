# Plan: Report v3, from mirror to adviser

> Status: **Draft, not approved.** Do not implement from this file
> ([`docs/INDEX.md`](../INDEX.md), Working documents). It becomes the report
> plan after G1 only when the founder approves it in
> [`DECISION_LOG.md`](../DECISION_LOG.md). Every work package then still
> needs its own approved spec ([`WORKFLOW.md`](../WORKFLOW.md)).
> Author: Claude (orchestrator role), 2026-11-06, branch
> `claude/inspiring-tesla-yox17h`.
> Review: independent review rounds are recorded on the pull request
> (`WORKFLOW.md`, Evidence per change).
> Inputs: the founder's benchmark request of 2026-11-06 (two premium agency
> sample reports and one workbook, not kept in Git; summarised in
> Appendix A), [`NOW.md`](../NOW.md) (2026-10-30),
> [`PAYING_CUSTOMER_PLAN.md`](../PAYING_CUSTOMER_PLAN.md) §6,
> [Spec 018](../../specs/018-search-grounded-chatgpt-google-audit/SPEC.md),
> [Spec 021](../../specs/021-report-v2/SPEC.md),
> [Spec 023](../../specs/023-report-writing-quality/SPEC.md),
> [`AUDIT.md`](../AUDIT.md) and the
> [report playbook](../content/report/PLAYBOOK.md).
> Relationship: this plan does not change the order of work to G1.
> `PAYING_CUSTOMER_PLAN.md` governs until G1 is done.

## 1. Why

Today's report is an honest, sharp **mirror**. It shows what ChatGPT and
Google's AI Overview said to ten real questions, which businesses they named
instead, and what to do, with each real answer one tap away. On a good day
its findings match what agency reports costing Rp85 million sell (Appendix
A.4).

The two premium reports the founder benchmarked (Appendix A) give the owner
six things Nuave's report does not:

1. what AI gets **wrong** about the business;
2. whether AI can **read the business's website** at all;
3. **why** it is happening (a diagnosis, with stated confidence);
4. **who** should do each action, how long it takes, and how to tell it is
   done;
5. **ready-to-use work**: texts, code, messages and a workbook;
6. numbers **sturdy enough to compare later**, and a re-check that compares
   them.

Part of the gap is Nuave's own method not yet being built. `AUDIT.md`
already says to keep factual accuracy as a separate observation and to report
"only specific, verifiable" accuracy and source gaps, and its report
acceptance checklist says each action "has an owner and completion check".
Spec 021 removed the owner and completion boxes from the report. The writer
already returns an `accuracy_status` (`src/lib/audit/types.ts`), and the
two-source report page does not show it.

## 2. Finish line

When the plan is done, a clinic owner who paid gets, within the same 30
minutes:

1. **In one screen:** one real AI answer where the clinic is missing or
   described wrongly (the "moment of truth"), the clinic's rank among the
   businesses AI named in this report, and the verdict.
2. **"Cek fakta: apa kata AI tentang Anda":** each checkable claim AI made
   about the clinic, compared with the facts the owner confirmed or the
   clinic's own website, marked "sesuai", "berbeda" or "tidak bisa dicek",
   with the site AI relied on and where to fix it.
3. **"Untuk tim web Anda":** a pass/fail page on whether search and AI
   readers can read the website, made to be forwarded to the web vendor.
4. **"Situs yang dibaca AI":** the sites AI relied on, whether the clinic
   appears on them, and one action for each.
5. **Recommendations with handles:** who, effort, impact and "selesai jika"
   for each, two or three marked "kerjakan minggu ini", and at most three
   decisions for the owner.
6. **"Bahan siap pakai":** a facts page text, structured-data code, a review
   invitation, correction emails and one page outline.
7. **A workbook** ("Rencana Kerja", Excel; opens in Google Sheets) to track
   the work.
8. **Sturdier numbers:** each question asked three times, shown as "selalu /
   kadang / tidak".
9. **A paid re-check** of the same questions that shows before and after.

How we will know it worked. The numbers are set by the founder at approval;
this plan claims none:

- Owners shown a v3 report answer yes to Track V's first question ("Did this
  report tell you something you didn't know?").
- Owners act: a follow-up email two weeks after delivery asks "Sudah
  mengerjakan salah satu rekomendasi?"; the share who say yes is recorded.
- Re-check uptake, once the re-check exists.
- The refund and complaint rate does not rise.
- Provider cost stays at or below USD 3.00 an order (§7), and delivery stays
  within 30 minutes.

## 3. Rules for every package

1. **Nothing invented.** Every number comes from saved answers, code checks,
   owner-confirmed facts or pages read. Quotations pass
   `src/lib/audit/quote-check.ts`. No market statistic Nuave did not measure.
2. **Code before AI opinion.** Counts, rank, stability, the website check and
   the grouping of sources are computed by code. The writer explains; it
   does not count.
3. **Graded causes, never proven causes** (needs F-2). Three labels: *Pasti*
   (Nuave checked it directly, such as a robots.txt rule), *Kemungkinan
   besar* (a differing fact also appears on a page AI cited and Nuave read),
   *Dugaan* (a pattern worth testing at the re-check). No sentence says that
   something caused an AI answer.
4. **Old reports stay as they are.** The renderer branches on the fields a
   saved report holds, never on dates, and nothing is regenerated when a
   report is opened (S0; the "rule for old reports" in
   [Spec 021's plan](../../specs/021-report-v2/PLAN.md)).
5. **The promise holds:** 30 minutes, the USD 5.00 per-order hold and the
   USD 50 daily cap (decision 2026-10-28). Target actual cost: at most
   USD 3.00 an order.
6. **Privacy as today:** no phone numbers or email addresses kept from pages
   or answers (Spec 018 R-28, Spec 021 B-08); page text dropped when the
   report is saved; no patient data. A package that keeps a new kind of
   data, or sends new data to a provider, gets the privacy page updated
   first, with the founder approving the wording.
7. **Health advertising rules** (Permenkes 1787/2010, playbook) apply to every
   text Nuave hands over for publishing: no "terbaik", no comparison with
   other clinics, no testimonials, no promised results. Medical texts say
   "wajib ditinjau dokter".
8. **No promise of when AI will name the clinic.** Saying how long a task
   takes is fine.
9. **Phone first and short.** The owner's part of the report stays readable
   in about ten minutes. New sections hide when empty, the technical ones
   fold away, and the PDF keeps the owner's part first.
10. **Way of working:** a lo-fi prototype on saved answers before any new
    layout (Spec 021 D-4), then a spec, founder approval, small pull
    requests, an independent verdict on each, and `verify-nuave` on the real
    path. Merge and deploy stay with the founder.

## 4. Decisions the founder owes

Each has a recommendation. Nothing below is decided.

| #    | Decision | Recommendation | Needed before |
| ---- | -------- | -------------- | ------------- |
| F-1  | Approve this plan as the report plan after G1. | Yes. Do G1 first (about a day); do not hold G1 for this plan. | Phase 0 |
| F-2  | Replace "no causes" (decision 2026-10-26, Spec 021 D-1 and B-03, playbook rule 3) with the graded causes of §3 rule 3. | Yes. `VISION.md` only rules out claiming to *prove* why; the labels keep the honesty. | Phase 1 spec |
| F-3  | Bring back who, effort, impact and "selesai jika" for each recommendation, as one line of small tags rather than the boxes Spec 021 removed. | Yes. The founder objected to the boxes and the weak verbs, not to the information, and `AUDIT.md`'s acceptance checklist still asks for an owner and completion check. | Phase 0 spec |
| F-4  | Allow three fixed **branded** fact questions (branches, main price, "aman dan berizin?"), asked apart from the ten. This changes Spec 018 R-02 ("no request to DataForSEO contains the business's name") and sends the business name to DataForSEO, ChatGPT and Google. | Decide after Phase 1's fact check runs on the existing answers. If too few clinics are named for it to say anything, approve; update the privacy page first. | Phase 1, second step |
| F-5  | Ask each question three times (Spec 018 asks once). | Yes, with the re-check in Phase 3. | Phase 3 |
| F-6  | One new optional intake question: "Anda ingin dikenal sebagai apa?" | Yes. | Phase 2 |
| F-7  | The kit and the workbook become customer deliverables. | Yes. | Phase 2 |
| F-8  | Re-check price, timing and reminder email (the parking-lot wishlist). | Decide in Phase 3, after real orders. | Phase 3 |
| F-9  | A price or offer test once Phases 1 to 3 ship. | Test rather than assume, after about 20 paid orders at Rp249.000. | Phase 4 |
| F-10 | Google AI Mode as a third source. It changes "ChatGPT dan Google AI Overview" on the landing page, terms and FAQ. | Spike first: availability for Indonesia and Indonesian, price, answer shape. | Phase 3 |

## 5. Phases

Proposed section order for the finished report (the Phase 0 prototype
confirms it): header with the verdict, the moment of truth, rank and the two
source cards; "Tiga keputusan untuk Anda"; Temuan Utama; "Cek fakta"; Peta
Pesaing (with "Kenapa mereka" and how AI describes the clinic);
Celah Topik; "Situs yang dibaca AI"; Rekomendasi; Penutup; then, folded,
"Untuk tim web Anda" and "Bahan siap pakai"; then Jawaban AI with "Cara
membaca angka ini".

### Phase 0: Lead with the evidence (no new data)

Writer instructions and layout only. Every new report gets it; older reports
keep their look.

**P0.0 Prototype.** Extend the approved prototype
(`experiments/report-v2-poc/`, built from the Sozo answers saved in
`experiments/dataforseo-sozo/`) with every new section of Phases 0 to 2, at
real length. The founder judges it on a phone. No live calls. Output: the
approved layout and section order.

**P0.1 The moment of truth.** At the top, above the source cards: the
patient's question, the AI's list (first five names), and "Klinik Anda:
tidak disebut" or the AI's sentence about the clinic. Code picks the answer:
the clinic not named and the most other businesses named, with ties broken
by search volume. If every answer names the clinic, it shows the strongest
mention instead. The writer adds one caption sentence (a new optional field;
code has a fallback). The link opens the full answer in the existing side
panel.

- Data: the saved answers and named businesses (`src/lib/orders/two-source.ts`,
  `src/lib/checks/named.ts`).
- Done when: on a saved report with such an answer, the card shows that
  answer's real text and its link opens it; a report in which every answer
  names the clinic shows the strongest mention; older reports are unchanged.

**P0.2 Rank among named businesses.** "Dari M bisnis yang disebut AI dalam
laporan ini, Klinik Anda urutan ke-N", with the leader and its count and the
split by source; ties shown as ties. Code only: the counts already exist in
`src/app/audit/report/report-v2-data.ts`. The wording is a count scoped to
this report ("dalam laporan ini"), never a ranking of the market:
`AUDIT.md`'s acceptance checklist forbids implying a permanent ranking or an
unearned peer benchmark.

**P0.3 Why it matters, from this audit.** One code-written sentence: the
average number of businesses named in the answers that named any ("Rata-rata
satu jawaban menyebut 4 bisnis"). No outside statistics.

**P0.4 At most three decisions for the owner.** A new writer field
`decisions` (zero to three, verb first, each pointing to a recommendation),
shown above Rekomendasi and repeated in Penutup.

**P0.5 Section intros that state a conclusion.** A new writer field holding a
one-sentence intro for Peta Pesaing and for Celah Topik, quote-checked. Code
falls back to today's intros.

**P0.6 Action tags** (needs F-3). For each recommendation: `who` (pemilik,
tim marketing, vendor web, dokter, front desk), `effort` (< 1 jam, ±1 hari,
±1 minggu, > 1 minggu), `impact` (tinggi, sedang, rendah; the writer's
judgement, said so in the method box), `done_when` (one checkable sentence)
and `this_week` (at most three). One line of small tags under the title, no
boxes. The banned title starts stay (Spec 021 B-06).

**P0.7 Official basis.** Each recommendation names the playbook item it
relies on (items 1 to 9). The page shows "Dasar: panduan Google" or
"panduan OpenAI" with the link. Code maps the item to its link
(`src/lib/audit/report-playbook.ts`).

**P0.8 "Cara membaca angka ini".** A folded box under Jawaban AI: what was
asked, from where, when and how many times; what "disebut",
"direkomendasikan" and "dikutip" mean, and whether code or the writer
decides each; what ten questions cannot show. It replaces today's three
notes and stays far shorter than the old "Tentang audit ini".

**P0.9 PDF.** A cover page with the moment of truth; a contents box ("Baca 3
menit: halaman 1"); page-break rules that avoid half-empty pages (pages 6
and 8 of the prototype PDF); the owner's part first and the answers last.

- Cost: roughly 1,000 to 2,000 more output tokens, about USD 0.02 to 0.04 a
  call at Opus 5.5's USD 20 per million output tokens
  (`src/lib/audit/models.ts`), at most two calls. No new provider.
- Size: about four pull requests (prototype, layout, writer fields, PDF);
  one spec.
- Phase 0 is done when: the founder agrees on two real orders (one older
  order shown with the new layout where its data allows, one new order) that
  the first screen and the recommendations read like an adviser's.

### Phase 1: Check the basics (two new checks)

**P1.1 Website check: "Untuk tim web Anda".** It runs in the runner's pages
step (`src/lib/orders/pages.ts`) on the own-site addresses saved at step 3.
Plain fetches only: no AI, and no request pretending to be an AI reader.

| Row | How | Shown as |
| --- | --- | -------- |
| Search readers allowed | parse `robots.txt` for Googlebot, Bingbot, OAI-SearchBot and ChatGPT-User | pass or fail for each (*Pasti*) |
| Training readers | the same file: GPTBot, Google-Extended, ClaudeBot and others | "keputusan Anda", never a failure |
| The site refuses ordinary readers | the plain fetch is refused (403 or a challenge page) while Firecrawl reads the page, or both fail | a warning, *Kemungkinan* (real case: brawijayahospital.com's 403, decision 2026-10-28) |
| Text readable without running code | compare the plain HTML's text with Firecrawl's rendered text for the same pages | ya, sebagian or tidak; limits set in the spec from ten real sites |
| Machine labels | JSON-LD found (reusing the reader in `src/lib/audit/business-name.ts`): its types, and its name and address against the confirmed facts | ada, tidak ada or tidak cocok |
| Key facts as text | a price ("Rp"), doctor titles ("dr.", "Sp."), an address and opening hours in the pages read | terdeteksi or tidak terdeteksi |
| Sitemap and noindex | `/sitemap.xml`, a sitemap line in robots.txt, a `noindex` tag or header | ada or tidak |

- Saved: results only, never page text, in a new `site_check` block of the
  saved report. The writer reads the results and may cite them as *Pasti*.
- Each row has one fixed line on how to fix it, taken from the playbook and
  not written by AI.
- Synthetic mode uses fixtures and makes no network call (like the logo rule,
  Spec 021 C-03).
- Cost: no provider cost; a few seconds and some processing time in the pages
  step (each fetched page capped, for example at 2 MB).
- Risk: a refusal can come from where Nuave's request starts rather than from
  the site's rules, so it is only ever *Kemungkinan*.
- Done when: fixture sites (OAI-SearchBot disallowed; page text that appears
  only after code runs; JSON-LD present, absent, or naming another business;
  a 403) give the expected rows; training readers are never shown as
  failures; older reports are unchanged.

**P1.2 Fact check: "Cek fakta: apa kata AI tentang Anda".**

- **Nuave compares; it does not rule on truth.** Each verdict is relative to
  a named reference ("berbeda dengan data yang Anda konfirmasi", "berbeda
  dengan website Anda"). Nuave never states that the clinic is safe,
  licensed or good: `AUDIT.md`'s checklist forbids service-quality and
  safety claims, and AGENTS.md rule 9 forbids claims about the quality of a
  business's actual service. For safety and licensing claims the row shows
  what AI said and the owner's confirmed fact, side by side.
- **References**, in `AUDIT.md`'s order: first the owner-confirmed intake
  facts (brand, offerings, place, the "fakta yang wajib benar" from the
  `s-facts` screen, the branch focus); then the own pages read at step 3,
  labelled "menurut website Anda". Third-party pages are never a reference
  for what is true.
- **Claims:** a new writer field lists the claims AI made about the clinic:
  question, source, the exact quotation, topic (cabang, harga, dokter,
  layanan, jam buka, profil, keamanan dan izin, lainnya), verdict (sesuai,
  berbeda, tidak bisa dicek) and the reference text.
- **Code checks:** the quotation is in the cited answer (quote check); the
  reference text is in the confirmed facts or the cited own page; "berbeda"
  without a found reference becomes "tidak bisa dicek". Harm order by topic
  is set in code (safety and licensing first, then branch and location,
  price, doctors, services, profile). At most eight rows are shown.
- **Graded cause:** when the differing value also appears on a third-party
  page AI cited and Nuave read, the row may say "Kemungkinan besar dari:
  <site>".
- **First step uses only the existing answers.** Spec 018's ten questions are
  brand-free (R-02), so claims come from the answers that named the clinic
  on their own. A clinic AI never named gets one line instead: "AI belum
  menyebut Anda, jadi belum ada klaim untuk diperiksa." The share of real
  orders that get no claims decides F-4.
- **Second step, only with F-4:** three fixed Indonesian questions built from
  the confirmed brand and city, asked to both sources, shown on the
  questions screen as "Pemeriksaan fakta otomatis" and counted apart from
  the ten. Cost: six calls, at most USD 0.036 at today's reservation
  (`DATAFORSEO_CALL_MAX_USD` in `src/lib/discovery/dataforseo.ts`).
- **Page:** the section sits after Temuan Utama and hides when it has
  nothing; wrong sentences are marked inside the answer panel. When nothing
  differs, one line says so, with the number of claims checked. The
  existing `accuracy_status` becomes the section's one-line summary.
- **Risk:** the own site is out of date and AI is right. The wording says
  "berbeda dengan website Anda; periksa mana yang benar", and confirmed facts
  rank above the site.
- Done when: fixtures with a known wrong branch count and a wrong price give
  the right rows; an invented quotation is dropped; no row says "berbeda"
  without a reference; older reports are unchanged; the founder judges two
  real orders.

- Size: about five pull requests; one or two specs.
- **Stop rule after Phase 1.** After at least five paid orders with Phase 1,
  ask the Track V questions and send the two-week follow-up. If owners do not
  read or use the new sections, stop and re-plan before Phase 2.

### Phase 2: Make it actionable

**P2.1 Source map: "Situs yang dibaca AI".** Code groups every cited
domain: the clinic's site; named competitors' sites (Spec 021 Part C data);
list articles and media; directories and marketplaces; health portals;
social media; forums; other. A small domain list lives in code, and the
writer only labels unknown domains. Counts per domain. For the cited pages
Nuave already read, code checks whether the clinic's name appears (the
existing name matching). Each row ends with a fixed action by type: minta
koreksi, minta dimasukkan, daftar, or tidak perlu.

**P2.2 "Kenapa mereka".** For up to three competitors whose page AI cited
and Nuave read, a tick grid against the clinic's own matching page: doctor
named with a title, registration (SIP or STR) shown, a price shown, common
questions answered, process and recovery time, English, a last-updated
date. Code checks with simple text rules, and anything unsure shows "tidak
terdeteksi", never "tidak ada". A competitor page not yet read is read
within the existing limit (`MAX_FIRECRAWL_REQUESTS`, 24 a reading, in
`src/lib/reading/page-reader.ts`).

**P2.3 Kit: "Bahan siap pakai".**

1. A "Fakta Resmi" page text from the confirmed facts and the own pages, with
   blanks where a fact is missing (a code template).
2. Structured-data code (JSON-LD `MedicalClinic` or `LocalBusiness`) filled by
   a code template from confirmed facts only, never by AI, and without a
   phone number (the owner adds it).
3. A WhatsApp review invitation: a fixed text the founder approves once (ask
   every patient, no rewards, no script; playbook item 4).
4. Correction and inclusion emails: fixed texts whose fields are filled from
   the fact check and the source map.
5. One page outline for the biggest topic gap: a writer field; code rejects
   "terbaik", "nomor 1", "testimoni" and promised results; it is marked
   "wajib ditinjau dokter".

Copy buttons on the web page; an appendix in the PDF.

**P2.4 Workbook: "Rencana Kerja".** An Excel file made on request and not
stored, in Indonesian, with five tabs: Rencana (the recommendations with
their tags and a status list), Fakta (the fact-check rows), Sumber AI (the
source map), Pertanyaan & Hasil (each question, each source's result, the
businesses named, and stability once Phase 3 exists) and Pesaing. A spike
decides where it is built: in the browser from the report data the page
already holds (a library loaded only on click; no server cost), or on the
server like the PDF. Support's JSON export stays (Spec 021 A-08).

**P2.5 How AI describes the clinic.** A writer field with AI's one-line
description of the clinic and the words AI attaches to it; code counts how
many answers use each word. It sits next to the top three competitors'
"Menurut jawaban AI" lines (Spec 023). With F-6, the owner's answer to "Anda
ingin dikenal sebagai apa?" shows the gap. That intake question changes the
Spec 013 screens and gets its own small spec.

- Cost: about USD 0.05 to 0.10 more writer output; up to nine more Firecrawl
  requests, about USD 0.045 (22 credits cost about USD 0.11, decision
  2026-10-28). Together about USD 0.05 to 0.15.
- Size: about seven pull requests; two or three specs.

### Phase 3: Make it measurable

**P3.1 Three runs per question** (needs F-5). A new table holds runs 2 and
3, and run 1 stays in today's `order_questions` columns (migration 0010), so
saved reports never change. The runner asks the three runs in the same step,
in parallel and within today's step time (`TWO_SOURCE_STEP_MS` in
`src/lib/orders/runner.ts`), so the number of steps, and the 30 minutes,
stay. Counts per question and source: "selalu" (3 of 3), "kadang" (1 or 2),
"tidak" (0); headline counts over all runs. The writer reads run 1's texts in
full plus a code-made stability summary and the extra names from runs 2 and
3, so its input barely grows. The method box says plainly that runs asked
at the same time show AI's randomness, not changes from day to day.

- Cost: 40 more calls (12 more with F-4's questions), about USD 0.16 billed
  at Spec 018's expected USD 0.004 a call, at most USD 0.31 reserved.
- It answers the parking lot's open question "How much does ordinary
  run-to-run variation move the count out of ten?"

**P3.2 Starting-point card.** The report saves a small "Titik awal" block:
the counts, the rank, and the fact-check and website-check results. Nothing
is tracked between reports; when a re-check is ordered, Nuave asks the owner
which recommendations were done.

**P3.3 Paid re-check** (needs F-8). The same questions, sources and runs, with
no new intake beyond "what changed"; the report compares each question and
each check, before and after, and says what changed, never why. It needs a
re-check order type linked to the first order, a price, a reminder email
with consent, and updated terms and privacy pages (the parking-lot
wishlist).

**P3.4 Google AI Mode** (needs F-10). A spike first (DataForSEO support for
Indonesia and Indonesian, price, answer shape); then a third source card and
counts. It changes the promise wording on the landing page, the terms and
the FAQ.

- Size: about eight pull requests plus the re-check spec. The largest phase.

### Phase 4: Prove it is worth more (evidence first)

**P4.1 Priorities by value.** An optional intake question ("Treatment mana
yang paling penting untuk bisnis Anda?", up to three of the confirmed
offerings) plus the price ranges AI itself quoted (code reads "Rp" ranges
from the answers for each topic) give a "rebut dulu / pertahankan / nanti"
grid. No revenue forecast.

**P4.2 Nuave's own benchmark.** After enough completed audits in one city
and category (the founder sets the number; the parking lot asks whether
about twenty is enough), one context line from combined, anonymous counts.
It needs a privacy review first.

**P4.3 Offer and price test** (F-9), decided from conversion, refund and
re-check data, not from agency prices.

**P4.4 Optional human time.** A paid read-through call, only if owners ask
for it. It does not scale, and no report ever depends on it.

## 6. Order and size

| Phase | Packages | Specs | Pull requests (rough) | Added provider cost an order | Starts when |
| ----- | -------- | ----- | --------------------- | ---------------------------- | ----------- |
| 0 | P0.0–P0.9 | 1 | ~4 | USD 0.02–0.08 | G1 is done and F-1, F-3 are decided |
| 1 | P1.1–P1.2 | 1–2 | ~5 | USD 0.04–0.15 (+0.036 with F-4) | Phase 0 merged; F-2 decided |
| 2 | P2.1–P2.5 | 2–3 | ~7 | USD 0.05–0.15 | Phase 1's stop rule passed |
| 3 | P3.1–P3.4 | 2–3 | ~8 | USD 0.16–0.31, plus AI Mode once priced | Phase 2 merged; F-5, F-8 decided |
| 4 | P4.1–P4.4 | as needed | — | small | about 20 paid orders |

## 7. Unit economics

**Assumptions.** Price Rp249.000 including tax (Terms §6: Nuave adds no tax
or fee at checkout). Rp16.500 per USD (an assumption; use the month's rate).
Midtrans fees of about 1–2% depending on the method, about Rp2.500 to
Rp5.000 (confirm on the Midtrans dashboard). Nuave's own tax depends on its
tax status and is not modelled here (confirm with an accountant).

**Provider cost per order today:**

| Item | USD | Basis |
| ---- | --- | ----- |
| Discovery (keyword data) | ≈ 0.07 | Spec 018 cost table; `DISCOVERY_TARGET_USD` 0.08 |
| Question writing (GLM 5.3 Flash) | ≈ 0.01 | question canary, decision 2026-10-26 |
| Step 3 reading (Luna medium, ~5 Firecrawl requests) | ≈ 0.05 | decision 2026-10-28 |
| 20 answer checks (DataForSEO) | ≈ 0.08 | Spec 018: ≈ 0.04 a source; reserved at most 0.12 |
| Report pages (Firecrawl, up to 24 requests) | ≈ 0.05–0.12 | 22 credits ≈ USD 0.11 |
| Report writer (Opus 5.5 medium) | ≈ 1.18–1.26 | measured: decision 2026-10-27 (USD 1.26) and Spec 023's blind test (USD 4.72 for four reports) |
| PDF (Browser Run) | ≈ 0 | within the included hours |
| **Total** | **≈ 1.45–1.60** | about Rp24.000–26.000, about 10% of the price |

**After all phases (estimate):** add about USD 0.27 to 0.73 (Phases 0 to 3
from §6, including F-4's questions; AI Mode not yet priced) for a total of
about **USD 1.7 to 2.3**, about Rp28.000–39.000, or 11–16% of the price.
That is under the USD 3.00 target and the USD 5.00 hold.

**Per order, after payment fees and provider costs:** about Rp218.000–222.000
today; about Rp205.000–218.000 after the plan. The plan costs about Rp4.500
to Rp12.000 an order.

**What pays for it** (hypotheses to test, not forecasts):

- Fewer refunds and more word of mouth from reports that show something new
  (Phases 0 and 1).
- Owners who act (Phase 2) are the ones likely to buy a re-check (Phase 3).
  Break-even: the plan's extra cost per order is covered when the share of
  owners buying a re-check is above *extra cost ÷ margin per re-check*. With
  a placeholder re-check price of Rp149.000 (F-8) and a re-check costing
  about Rp28.000 to deliver after fees, that share is about 4–10%.
- A fuller report may carry a higher price (Phase 4 test).

**Limits that bind before money does:**

- **Daily cap:** the USD 5.00 hold allows at most 10 orders in progress at
  once under the USD 50 cap; at about USD 2.3 actual, about 20 orders a day
  settle under it. Revisit when orders pass about 15 a day.
- **Engineering and review time:** about 24 pull requests across Phases 0 to
  3, each with an independent verdict. GitHub Actions minutes are limited
  (2,000 a month, decision 2026-10-28), so keep pull requests few and run
  `npm run verify` locally first.
- **Founder time:** every phase has founder steps (prototype, spec approval,
  two real orders). The stop rule after Phase 1 protects it.

## 8. Risks

| Risk | What reduces it |
| ---- | --------------- |
| A "berbeda" row is itself wrong (an outdated own site, a misread quotation) | a reference is required; the quote check; the wording "periksa mana yang benar"; `AUDIT.md`'s correction path for an objectively wrong report |
| The fact check reads as Nuave vouching for the clinic's safety or quality | verdicts are relative to a named reference; Nuave never states the clinic is safe, licensed or good (`AUDIT.md` checklist, AGENTS.md rule 9) |
| The website check blames the web vendor for a refusal Nuave caused | refusals are only *Kemungkinan*; no fake AI readers; fixed explanatory text |
| The report gets long | prototype first; sections hide when empty; technical parts folded; the PDF keeps the owner's part first |
| Writer cost or time grows | the writer reads run 1 only; new fields are short; cost is measured per order; Sonnet 5.5 high is the cheaper fallback (`MODELS.md`) |
| The 30-minute promise slips | runs asked in the same step; the website check inside the pages step; time measured on the first orders after each phase |
| A kit text breaks health advertising rules | the code ban list; "wajib ditinjau dokter"; the founder approves the fixed texts once |
| Building too much before customers prove demand | G1 first; the stop rule after Phase 1; Phase 4 only with evidence |
| A provider changes (DataForSEO, Firecrawl, AI Mode) | spikes before promises; fail closed as today |

## 9. What we will not do

- Revenue forecasts or "return per rupiah".
- A 0–100 score (decision 2026-10-26 stays; rank and "X dari Y" instead).
- Length for its own sake.
- Market statistics Nuave did not measure.
- Causes stated as certain.
- Advising owners to let AI companies train on their site. That stays the
  owner's decision, shown neutrally.
- Pretending to be an AI reader in the website check.
- A monitoring dashboard or a subscription (`AGENTS.md`, working rule 5).

## 10. How agents use this plan

- Read `AGENTS.md`, `NOW.md`, then §1 to §4 of this plan and only your
  phase.
- Every package needs its own approved spec, which names its own required
  context.
- Once approved, the orchestrator records progress in the table below after
  each verdict. New ideas go to `PAYING_CUSTOMER_PLAN.md` §6, not here.

| Phase | State | Spec | Pull requests | Verdict |
| ----- | ----- | ---- | ------------- | ------- |
| 0 | Not started | — | — | — |
| 1 | Not started | — | — | — |
| 2 | Not started | — | — | — |
| 3 | Not started | — | — | — |
| 4 | Not started | — | — | — |

## Appendix A: the benchmark (2026-11-06)

### A.1 The inputs

The founder shared two reports and one workbook, presented as the work of
two reputable Jakarta agencies for a well-known clinic. **Both say they are
fictional samples**: one cover reads "Fictional worked example", and the
other's last page says every figure, quote and AI answer in it is invented.
Learn from how they are made; never reuse their numbers (for example, a "46%
of Jakarta adults asked AI about skin treatments" figure that comes from a
survey that does not exist).

- **"AI Search Assessment and Growth Plan"** (24 pages, plus an eight-sheet
  workbook): Rp85.000.000 for a five-week assessment, plus Rp45.000.000 a
  month for optional execution.
- **"AI Search Visibility Audit & 12-Month Plan"** by "Northlight" (37 pages):
  a 12-month programme of Rp1,38 miliar.

### A.2 What earns their price

1. They open with the owner's decision ("approve these three decisions"; five
   decisions with owners and deadlines; the next meeting's date on the
   cover).
2. A hook that reframes the problem ("Loved by patients. Overlooked by AI.";
   "There is no page two."; "Five root causes. None of them is the quality
   of your care.").
3. A diagnosis: blocked AI readers, five versions of the name, a closed branch
   still listed, text AI cannot read, prices only in images.
4. "What AI gets wrong" as a main section: wrong facts ranked by harm, each
   with the truth, how often, which AI, the likely source, the fix and the
   fix time; real answers marked up; a fact register with an owner for each
   fact.
5. Competitor comparison from every angle, including "how AI sums up each
   clinic in one line", today and as a target.
6. Priorities by money (value against visibility; a break-even in patients).
7. Finished work handed over (an Indonesian page draft, page briefs, a review
   message, structured-data code, a fix list for the web agency).
8. Every action trackable (who, when, effort, impact, "done when"; first 30
   days with dates; checkpoints where the owner may stop).
9. Visible care with numbers (720 and 4,320 answers, three runs each,
   definitions, the count behind every percentage, second-person checks,
   "what the sample cannot tell us", official sources cited).
10. Local knowledge (patient-style Indonesian questions, neighbourhoods,
    Sp.DVE, STR, BPOM, health advertising rules, the data-protection law,
    WhatsApp's Meta AI).
11. An expensive look (editorial type, numbered charts with "what this
    means").
12. People and a next sale (workshops, check-ins, handover; each report leads
    to a monthly contract).

The workbook's strength is that it is the report's skeleton made editable:
every headline number is a formula over the answer rows; ID codes link
question, answer, fact, evidence, action and page brief; the actions sheet
keeps working as a tracker with a status list; and the question list is
frozen so the test can be repeated.

### A.3 Their weak spots

- Northlight claims causes it cannot prove ("we traced every weak score back
  to where it came from"; "one forum thread is behind 41% of the negative
  things AI says").
- Its revenue forecast and "3.3×" return rest on 13 survey answers and count
  revenue, not profit; it blends six AI tools into one weighted 0–100 score;
  it advises letting AI companies train on the site.
- The Assessment is dry (tables, almost no charts, no hook), checks only
  three AI surfaces, and about a fifth of it is the sales proposal.

### A.4 Where Nuave already leads

- Real answers one tap away from every finding.
- Findings that match agency insight on a good day (the prototype: "Google
  uses your blog to introduce other clinics"; a "best clinics" list sourced
  from an employee-attendance app's blog; 70 branches on a copy of the site
  against 75+ on the site).
- Natural Indonesian written to the owner, on a phone.
- No made-up score, forecast or cause.
- Thirty minutes and Rp249.000.

### A.5 The gap, side by side

| What matters | Assessment | Northlight | Nuave today |
| ------------ | ---------- | ---------- | ----------- |
| Hook and story | Weak | Very strong | OK |
| Evidence you can check | Strong (workbook) | OK | Very strong |
| Sample size | 720 answers, 3 runs | 4,320 answers, 3 runs | about 20 answers, 1 run |
| What AI gets wrong | Strong | Very strong | Missing |
| Diagnosis | Strong, careful | Strong, overconfident | Missing by rule |
| Website check | Strong | Strong | Missing |
| Competitors | OK | Very strong | Good |
| Sites AI relies on | Strong | Very strong | Inside findings only |
| Priorities by value | Strong | Strong | Search volume only |
| Ready-to-use work | Very strong | Strong | Missing |
| Who does what, by when | Very strong | Very strong | Weak |
| Measuring progress | Very strong | Strong | One sentence |
| Honesty about limits | Very strong | OK | Strong |
| Local knowledge | Good | Very strong | Good |
| Design | Plain | Premium | Clean web page, weak PDF |
| Language | English | English (Indonesian offered) | Natural Indonesian |
| Price | Rp85 million + Rp45 million a month | Rp1,38 miliar programme | Rp249.000 |

## Appendix B: ideas from the analysis and where they went

The 2026-11-06 analysis listed 22 ideas. Where each went:

| Idea | Package |
| ---- | ------- |
| 1 Moment of truth | P0.1 |
| 2 Rank among named businesses | P0.2 |
| 3 Why it matters, from this audit | P0.3 |
| 4 Three decisions | P0.4 |
| 5 Graded causes | §3 rule 3, F-2 |
| 6 Action tags and "kerjakan minggu ini" | P0.6, F-3 |
| 7 How AI describes the clinic, and the desired positioning | P2.5, F-6 |
| 8 Section intros that state a conclusion | P0.5 |
| 9 Official source beside the advice | P0.7 |
| 10 "Cara membaca angka ini" | P0.8 |
| 11 Website check | P1.1 |
| 12 Fact check | P1.2, F-4 |
| 13 Source map | P2.1 |
| 14 "Kenapa mereka" | P2.2 |
| 15 Three runs per question | P3.1, F-5 |
| 16 Ready-to-use kit | P2.3, F-7 |
| 17 Workbook | P2.4, F-7 |
| 18 Re-check designed as a product | P3.2, P3.3, F-8 |
| 19 Google AI Mode, then Gemini; Meta AI when it can be measured honestly | P3.4, F-10 (Gemini and Meta AI not planned yet) |
| 20 Priorities by value | P4.1 |
| 21 Nuave's own benchmark | P4.2 |
| 22 The business lesson (re-check, optional fix pack) | P3.3, P4.3; a done-for-you fix pack is not planned |
| Design: charts, red/amber/green, PDF cover | P0.9; charts and colours set in the Phase 0 prototype |
