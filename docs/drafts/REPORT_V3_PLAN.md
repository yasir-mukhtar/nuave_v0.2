# Plan: Report v3, from mirror to adviser

> Status: **Draft, not approved.** Do not implement from this file
> ([`docs/INDEX.md`](../INDEX.md), Working documents). It becomes the report
> plan after G1 only when the founder approves it in
> [`DECISION_LOG.md`](../DECISION_LOG.md). Every package then still needs its
> own approved spec ([`WORKFLOW.md`](../WORKFLOW.md)).
> Author: Claude (orchestrator role), 2026-11-06, branch
> `claude/inspiring-tesla-yox17h`. Revision 2, after independent review
> round 1 (FAIL; see "Review history" at the end).
> Inputs: the founder's benchmark request of 2026-11-06 (two premium agency
> sample reports and one workbook, not kept in Git; Appendix A),
> [`NOW.md`](../NOW.md), [`PAYING_CUSTOMER_PLAN.md`](../PAYING_CUSTOMER_PLAN.md)
> §5 and §6, [`VISION.md`](../VISION.md), [`PRODUCT.md`](../PRODUCT.md),
> [`AUDIT.md`](../AUDIT.md), the [report playbook](../content/report/PLAYBOOK.md),
> [Spec 018](../../specs/018-search-grounded-chatgpt-google-audit/SPEC.md),
> [Spec 021](../../specs/021-report-v2/SPEC.md) and
> [Spec 023](../../specs/023-report-writing-quality/SPEC.md).
> Relationship: this plan does not change the order of work to G1.
> `PAYING_CUSTOMER_PLAN.md` governs until G1 is done. Words in *italics* on
> first use are explained in the Glossary at the end.

## 1. Why

Today's report is an honest, sharp **mirror**. It shows what ChatGPT and
Google's AI Overview said to ten real questions, which businesses they named
instead, and what to do, with each real answer one tap away. The approved
prototype shows the depth the writer aims for; its findings were written by
hand from real answers (`experiments/report-v2-poc/README.md`).

The two premium sample reports the founder benchmarked (Appendix A) give the
owner six things Nuave's report does not give as a section of its own:

1. what AI says **differently** from the business's own facts;
2. whether search and AI readers can **read the business's website**;
3. a **diagnosis** of what stands in the way;
4. **who** does each action, how long it takes, and how to tell it is done;
5. **ready-to-use work**: texts, messages and a work list;
6. numbers that **hold up when compared later**, and a re-check that
   compares them.

This plan brings these in **without breaking Nuave's own rules**: observed
evidence first and no invented causes (`VISION.md` principle 1), counts with
their denominators and no rankings or scores (`VISION.md` principle 2;
`PRODUCT.md` non-goals), and no claim that a gap caused a result
(`AUDIT.md`). Where the premium reports claim causes, Nuave shows a **checked
fact and what official guidance says it means** ("Your robots.txt blocks
ChatGPT's search reader; OpenAI says pages need that reader allowed to appear
in ChatGPT search"). That is a diagnosis without an invented cause.

Part of the gap is Nuave's own method not yet built. `AUDIT.md` keeps
factual accuracy as a separate observation, and its report acceptance
checklist asks that each action have "an owner and completion check"; Spec
021 removed the owner and completion boxes from the report (Spec 021,
Rekomendasi). The writer already returns an `accuracy_status`
(`src/lib/audit/types.ts`), and the two-source report page does not show it.

## 2. Finish line

When the plan is done, a clinic owner who paid gets, within the same 30
minutes:

1. **Under the source cards:** one real AI answer where the clinic is
   missing or described differently from its own site (the "moment of
   truth"), and how often AI named the most-named business compared with the
   clinic, as counts.
2. **"Cek fakta":** the claims AI made about the clinic, compared with its
   own website and, clearly labelled, with what the owner told Nuave, marked
   "sesuai", "berbeda" or "tidak bisa dicek".
3. **"Untuk tim web Anda":** pass/fail checks that official guidance
   supports, shared as a PDF page or copied text.
4. **"Situs yang dibaca AI":** the sites AI relied on, whether the clinic
   appears on them, and a next step for the directories and health portals
   among them.
5. **Recommendations with handles:** who usually does the work, roughly how
   long it takes, and how to check it is done, all taken from the playbook.
6. **A small kit:** correction requests and a review invitation; texts for
   publishing only after the legal conditions in F-7.
7. **A stability note:** a few questions asked again, showing how much the
   answers move.
8. **A paid re-check** of the same questions that shows before and after.

## 3. Gates and success measures

Nuave has not yet sold a report to anyone but the founder, and "internal
technical completion is not evidence of customer demand" (`VISION.md`). Each
phase therefore starts only when the gate before it passes. The numbers below
are defaults the founder may change in F-1.

| Gate | Before | Passes when |
| ---- | ------ | ----------- |
| 0 | Phase 0 | G1 is done and F-1 is approved. Phase 0 runs alongside the first sales and never holds them up. |
| 1 | Phase 1 | At least **5 paid orders** from customers other than the founder; at least **3 of those owners** have answered the three Track V questions about the report they received (the baseline); and the claims count (P1.0) is done. |
| 2 | Phase 2 | At least **5 more paid orders** received Phase 1; of the owners asked, at least **3 of 5** name a "Cek fakta" or website-check item as new information, and at least **1 of 5** says they did one recommendation within two weeks; refunds and complaints are no higher than for Gate 1's orders. |
| 3 | P3.4 (paid re-check) | At least **2 of the first 10 owners asked** say they would pay the proposed re-check price. |
| 4 | Phase 4 | About **20 paid orders**. |

If a gate does not pass, stop, write down what owners said, and re-plan with
the founder. The report page records nothing about readers (`/r` has no
tracking, `NOW.md`), so these answers come only from asking owners (F-6).

## 4. Rules for every package

1. **Nothing invented.** Every number comes from saved answers, code checks,
   the business's own pages or what the owner told Nuave. Quotations pass
   `src/lib/audit/quote-check.ts`. No market statistic Nuave did not measure.
2. **Code before AI opinion.** Counts, the website check and the grouping of
   sources are computed by code. The writer explains; it does not count.
3. **Checked facts and their official meaning, never causes.** A finding may
   state a checked fact and what the playbook's sources say it means. It
   never says the fact caused an answer (`VISION.md` principle 1; `AUDIT.md`:
   "Do not claim that a source gap caused exclusion unless causal evidence
   exists"; playbook rule 3; Spec 023 R-09). A value that also appears on a
   page AI cited is stated as an observation ("Angka yang sama ada di
   <situs>, yang dikutip jawaban ini"), never as "the source".
4. **Counts, not rankings.** Counts keep their denominators. No rank
   numbers, scores, market percentages or benchmarks (`PRODUCT.md`
   non-goals; `AUDIT.md`: "Do not turn one response into a percentage or
   stable rank").
5. **Old reports stay as they are.** The page draws only the parts a saved
   report has data for, and nothing is rewritten when a report is opened (S0;
   the "rule for old reports" in [Spec 021's plan](../../specs/021-report-v2/PLAN.md)).
6. **Spending stays inside today's limits.** The *worst case* of one order
   must stay at or under the USD 5.00 order hold (decision 2026-10-28). Today
   it is USD 4.785: USD 1.5452 before the report plus three report calls at
   USD 1.08 (`src/lib/spending/spend-worst-case.test.ts`). That leaves USD
   0.215. Passing that test is part of every package's "done when". New
   writer fields must fit the writer's limits: 24,000 output tokens a call
   (`src/lib/audit/models.ts`), 150,000 input tokens
   (`src/lib/audit/anthropic-report.ts`), and in practice two calls a report,
   because every report so far needed the language-fix call (Spec 021 plan,
   PR 6b). Raising the hold is F-10.
7. **Privacy as today.** No phone numbers or email addresses in report data
   or the writer's input; raw provider answers that contain them stay in
   restricted evidence (Spec 018 R-28). New data kept, new data sent to a
   provider, or a new use of the order email needs the privacy page updated
   first, with the founder approving the wording.
8. **Health advertising rules** (Permenkes 1787/2010, playbook): no
   "terbaik", no comparisons with other clinics, no testimonials, no promised
   results. Nuave hands over no text meant for publishing until F-7's
   conditions are met.
9. **No promise of when AI will name the clinic.** Saying how long a task
   takes is fine.
10. **Phone first and short.** On a 390×844 phone, the verdict and the first
    source card stay on the first screen (Spec 021 AC-A1). New sections hide
    when empty; technical ones fold away. The PDF keeps the owner's part
    first. Anything for the web vendor is shared as a PDF page or copied
    text, never by forwarding the private report link (S0).
11. **Way of working.** A lo-fi prototype on real saved orders before any new
    layout (Spec 021 D-4), then a spec, founder approval, small pull
    requests, an independent verdict on each, and `verify-nuave` on the real
    path. Each spec measures the limits it touches (§7, "Platform limits")
    before building. Merge and deploy stay with the founder.

## 5. Decisions the founder owes

Each has a recommendation. Nothing below is decided. "Changes" lists every
approved document the decision would change.

| # | Decision | Changes | Recommendation |
| - | -------- | ------- | -------------- |
| F-1 | Approve this plan with its gates (§3) and their default numbers. | `INDEX.md` and `NOW.md` routing; this file moves out of `drafts/` | Yes, after G1. |
| F-2 | Add to each playbook item ("What a clinic can do") who usually does it and roughly how long it takes; the report shows these, with the item's existing "Check" line, as small tags under each recommendation. No "impact" tag and no "do this first" line. | `PLAYBOOK.md`; Spec 021's Rekomendasi rule, which removed "Penanggung jawab yang disarankan" and "Selesai ketika" (SPEC.md, Rekomendasi). Spec 023 R-09 is kept, because the effort then comes from the playbook, not the writer. | Yes. `AUDIT.md`'s checklist still asks for an owner and completion check. |
| F-3 | Website-check rows the playbook does not cover yet (a *sitemap*; text that appears only after the browser runs code; ChatGPT's user-request reader) need a playbook amendment, each backed by an official source. | `PLAYBOOK.md` | Add a row only when an official source supports it; leave it out until then. |
| F-4 | Three fixed questions that name the business (its branches and the starting price of its main service; never safety), asked apart from the ten. | Spec 018 R-02 ("no request to DataForSEO contains the business's name"); Terms §3 ("sepuluh pertanyaan … 20 pemeriksaan") and §8 (Rp12.450 = Rp249.000 ÷ 20); the privacy page (the name goes to DataForSEO, ChatGPT and Google); `AUDIT.md`'s question rules | Decide at Gate 1, only if the claims count (P1.0) shows too few claims to check. |
| F-5 | Show the owner's own answer to "Apa yang membuat bisnis Anda berbeda?" (already asked in the intake) next to how AI describes the clinic, labelled "Menurut Anda". | Spec 023's quotation rule, which never lets the owner's own claims be quoted | Yes; no new intake question is needed. |
| F-6 | How owners are asked the gate questions: the founder asks only owners who said yes to one line in the report-ready email ("Boleh kami tanya pendapat Anda?"). Needed before Gate 1. | The report-ready email; the privacy page (today the order email is only for payment confirmation, the report link and support replies, §2); `AGENTS.md` needs founder approval before contacting anyone | Yes. |
| F-7 | The kit as a deliverable, in two steps: (a) correction requests and a review invitation, fixed texts the founder approves once; (b) texts meant for publishing (a facts text, a page outline) only after the official Permenkes 1787/2010 text is read (the playbook used summaries) and the parking lot's legal review is done. No requests to be added to "best clinic" list articles. | Terms (new deliverable); `PLAYBOOK.md` if new advice | (a) with Phase 2; (b) only after the legal review. |
| F-8 | A stability sample: three questions asked twice more, one try each, shown apart as variation. It never changes the counts, the "at least 5 of 10 checks" report rule, refunds or the dots. | Spec 018 (each question asked once). `AUDIT.md` already encourages "re-asking a small number of questions" as "variance measurement". | Decide after the variance study (P3.0). |
| F-9 | Re-check price, timing and reminder email (the parking-lot wishlist). | Terms; privacy page; landing page | Decide at Gate 3. |
| F-10 | Keep the USD 5.00 order hold, and design every package within it. | — | Yes. Raise it only if a package cannot fit: at USD 6.00 the USD 50 daily cap allows 8 orders in progress at once, not 10. |
| F-11 | A price or offer test. | Landing page; terms | Phase 4. |
| F-12 | Google AI Mode or Gemini as another source. | Landing page, terms and FAQ ("ChatGPT dan Google AI Overview") | Phase 4, after a trial of the provider. |

## 6. Phases

### Phase 0: Lead with the evidence (no new data)

Writer instructions and layout. About three pull requests.

**P0.0 Prototype on real two-source orders.** The Sozo prototype in
`experiments/report-v2-poc/` asked each question to one source only and has
no pages, owner facts or site files, so it cannot show Phases 1 and 2. Use
the two-source orders NV-3WDSAY and NV-8XAPUF instead: re-export them with
the report-writer test's read-only queries
(`scripts/report-writer-test/README.md`, step 1; the founder runs them or
approves the run). Plain page loads of those clinics' public pages and
robots.txt feed the website-check mock, at no provider cost. Mock the
sections of Phases 0 to 2 with that data; the founder judges it on a phone.

**P0.1 The moment of truth.** Directly under the source cards: the patient's
question, the businesses the AI named (first five), and "Klinik Anda: tidak
disebut" or the AI's sentence about the clinic. Code picks the answer: the
clinic not named and the most other businesses named, ties broken by search
volume. If every answer names the clinic, it shows the answer that names it
first. The writer may add one caption sentence (code has a fallback). Its
link opens the full answer in the existing side panel.

**P0.2 Counts side by side.** "Bisnis yang paling sering disebut: <nama>, di
5 dari 20 jawaban. Klinik Anda: 4 dari 20." Counts with their denominator
and the split by source; no rank number. Code only; the counts already exist
in `src/app/audit/report/report-v2-data.ts`.

**P0.3 Why it matters, from this report.** One code-written sentence: in the
answers that named any business, how many businesses an answer named on
average ("Jawaban yang menyebut bisnis rata-rata menyebut 4 nama"), with its
denominator. No outside statistics.

**P0.4 The owner's decision inside the existing plan.** The three-step plan in
Penutup (Spec 021 B-04) may say which decision the owner must make before a
step can start ("Keputusan Anda: setujui harga 'mulai dari'"). No new
section.

**P0.5 Section intros that state a conclusion.** One quote-checked sentence
for Peta Pesaing and for Celah Topik; code falls back to today's intros.

**P0.6 Recommendation tags** (needs F-2). The writer names the playbook item
each recommendation follows; code shows that item's "who", rough effort and
"Check" line as one line of small tags. The writer never writes effort
itself.

**P0.7 "Dasar" link.** Code maps each playbook item to its source link. This
is new code: `src/lib/audit/report-playbook.ts` holds only the playbook text
today. Only sources Nuave read directly are linked; the OpenAI pages and
Permenkes, read through summaries only (playbook, Sources), are re-read
first or left unlinked.

**P0.8 "Cara membaca angka ini".** A folded box under Jawaban AI: what was
asked, from where, when and how many times; what "disebut",
"direkomendasikan" and "dikutip" mean, and whether code or the writer decides
each; what ten questions cannot show.

**P0.9 PDF.** A cover page with the moment of truth; a contents box ("Baca 3
menit: halaman 1"); page-break rules that avoid half-empty pages (pages 6 and
8 of the prototype PDF); the owner's part first.

- **Done when:** on a 390×844 phone the verdict and the first source card
  show without scrolling, with the moment of truth below them; the owner's
  part stays within a word budget the spec sets after measuring today's
  NV-3WDSAY report; `spend-worst-case.test.ts` passes at or under USD 5.00;
  both protected report snapshots pass unchanged; delivery stays within 30
  minutes on the first three paid orders after release; the founder judges
  one new order.
- **Cost:** about USD 0.02 to 0.08 an order, from 1,000 to 2,000 more output
  tokens at USD 20 per million, within the 24,000-token allowance, on two
  calls.
- **Founder time:** about 4 to 6 hours (prototype, spec, merges, one order).
  About 1 to 2 weeks.

### Phase 1: Check the basics

About four or five pull requests. Starts at Gate 1.

**P1.0 Claims count** (free, no code). On the exported orders and the first
paid orders, count the claims AI made about the clinic and how many could be
compared with the clinic's own pages. Spec 018's ten questions never name
the business (R-02), so claims come only from answers that named it on their
own. If most orders have almost none, P1.2 waits, and F-4 is decided.

**P1.1 Website check: "Untuk tim web Anda".** Plain page loads only: no AI,
and no request pretending to be an AI reader. Only rows the playbook supports
today:

| Row | Playbook basis | Shown as |
| --- | -------------- | -------- |
| robots.txt allows Googlebot, Bingbot and OAI-SearchBot | item 6 | pass or fail for each |
| A page carries a *noindex* tag or header | Google: a page must be indexed to appear in AI Overviews | pass or fail |
| Prices, doctor names with titles, the address and opening hours appear as text on the pages read | items 1 and 2; "keep important content as text" | terdeteksi or tidak terdeteksi |
| *Structured data*, if present, matches the confirmed name and address | "make any structured data match the visible text" | cocok, tidak cocok or tidak ada (neutral; Nuave never advises adding it, because the playbook says no special markup is needed) |
| Ordinary readers are refused (the plain load gets a 403 or a *challenge page* while Firecrawl reads the page) | item 6, "bot protection" | an "indikasi" warning, never a checked fact about AI readers |

- Each row's fix line is fixed text taken from the playbook.
- Results only are saved, never page text. Synthetic mode uses *fixtures*
  and no network.
- It runs in the runner's pages step or a small step of its own; the spec
  measures it against the pages step's 150-second deadline and the runner's
  work budget (§7, "Platform limits").
- **Done when:** fixture sites (OAI-SearchBot blocked; a noindex page;
  structured data naming another business; a 403) give the expected rows; no
  row claims what AI did because of it; the worst-case test passes; it runs
  within its step on the two exported orders' sites; older reports are
  unchanged.

**P1.2 "Cek fakta"** (only if P1.0 finds enough claims).

- **References in `AUDIT.md`'s order:** first the clinic's official website
  (the pages Nuave read); then Indonesian third-party sources such as
  directories and public registries, which are out of scope until Nuave can
  read them reliably; then what the owner told Nuave (the intake's optional
  "Ada info yang sering salah ditulis AI?" field and the confirmed basics),
  always labelled "menurut Anda". When the site and the owner disagree, the
  row shows both, as `AUDIT.md` asks.
- **Claims:** the writer lists each claim AI made about the clinic: question,
  source, the exact quotation, topic (cabang dan lokasi, harga, dokter,
  layanan, jam buka, profil), verdict ("sesuai", "berbeda", "tidak bisa
  dicek") and the reference text.
- **Code checks:** the quotation is in the cited answer; the reference text
  is on the cited page or in the owner's facts; "berbeda" without a found
  reference becomes "tidak bisa dicek". At most eight rows.
- **Safety and licensing:** shown only as what AI said, with no verdict.
  Nuave never states that the clinic is safe, licensed or good (`AUDIT.md`
  checklist; `AGENTS.md` working rule 9).
- **Page:** after Temuan Utama, hidden when empty; differing sentences are
  marked inside the answer panel; the existing `accuracy_status` becomes the
  one-line summary.
- **Done when:** fixtures with a known differing branch count and price give
  the right rows; an invented quotation is dropped; no row says "berbeda"
  without a reference; the worst-case test passes; the writer's output fits
  its allowance on the exported orders; older reports are unchanged; the
  founder judges two real orders.

- **Cost:** about USD 0.04 to 0.15 an order (writer output); the website
  check has no provider cost.
- **Founder time:** about 6 to 10 hours. About 2 to 3 weeks.

### Phase 2: Make it actionable

About four to six pull requests. Starts at Gate 2.

**P2.1 Source map: "Situs yang dibaca AI".** Code groups every cited site:
the clinic's own; named competitors' sites (Spec 021 Part C data); list
articles and media; directories and marketplaces; health portals; social
media; forums; other. A small list of known sites lives in code, and the
writer only labels unknown ones. For cited pages Nuave read, code checks
whether the clinic's name appears. Only directories and health portals get a
next step ("minta koreksi" or "daftar"; playbook item 5). List articles are
shown without one, because asking to be added invites superlatives and paid
placement, which the playbook rules out.

**P2.2 "Apa yang ditampilkan halaman mereka".** For up to three competitors
whose page AI cited and Nuave read, a tick grid against the clinic's own
matching page: doctor named with a title, registration (SIP or STR), a price,
common questions answered, process and recovery time, a last-updated date.
The writer already compares pages in prose and is told to "state these as
differences, never as the reason AI chose a business"
(`src/lib/audit/two-source-writer.ts`); this makes it a code-checked grid.
Unsure items show "tidak terdeteksi", never "tidak ada". A competitor page not
yet read is read within the existing limit of 24 Firecrawl requests a
reading (`src/lib/reading/page-reader.ts`).

**P2.3 How AI describes the clinic** (needs F-5). AI's one-line description
of the clinic, built from quote-checked words, and the words AI attaches to
it, counted by code. Next to it, labelled "Menurut Anda", the owner's own
answer to "Apa yang membuat bisnis Anda berbeda?".

**P2.4 Kit** (needs F-7). First: correction requests to the directories and
portals in the source map and "Cek fakta", and a review invitation (ask every
patient, no rewards, no script; playbook item 4). Later, only after the legal
review: a facts text and one page outline for the biggest topic gap. No
structured-data code, because the playbook says no special markup is needed.

**P2.5 Work list.** "Salin daftar kerja" copies the recommendations and their
tags as text for WhatsApp or notes. An Excel workbook like the premium one
comes only if at least two owners or their agencies ask for one: it suits
teams on laptops more than owners on phones.

- **Done when:** each package's spec sets observable checks, plus the
  worst-case test and unchanged older reports.
- **Cost:** about USD 0.05 to 0.15 an order (writer output); up to nine more
  Firecrawl requests, billed in credits outside the USD ledger.
- **Founder time:** about 8 to 12 hours, plus the legal review for P2.4's
  later texts. About 3 to 4 weeks.

### Phase 3: Make it measurable

**P3.0 Variance study** (no code; a few dollars of live spend the founder
approves). Ask three to five questions from two or three exported orders
again, at different times and on different days, and record how much the
counts move. It answers the parking lot's question "How much does ordinary
run-to-run variation move the count out of ten?", and whether answers asked
at the same moment differ at all.

**P3.1 The parking lot's check fixes first:** ask ChatGPT from the
customer's city instead of all of Indonesia (if the provider allows it;
Spec 018 found its ChatGPT reader accepts countries only), check a missing
AI Overview once more, and handle DataForSEO status 40101. They make every
count sturdier than repeats do.

**P3.2 Stability sample** (needs F-8). Three questions asked twice more, one
try each, shown apart as "Seberapa stabil". It never feeds the counts, the
"at least 5 of 10 checks" rule (Spec 018), refunds or the dots.

- Worst case: 12 calls × USD 0.006 = USD 0.072, so 4.785 + 0.072 = USD
  4.857, under the hold. About USD 0.05 billed.
- It needs its own table, with its own attempt and failure columns, and the
  cleanup job must cover it (`src/lib/orders/retention.ts`).
- The spec measures it against the runner's work budget: a question step
  costs 24 units, one run allows 80 and at most two orders
  (`src/lib/orders/runner.ts`).

**P3.3 Starting-point card.** The report saves a small "Titik awal" block:
the counts, the "Cek fakta" and website-check results. Nothing is tracked
between reports; when a re-check is ordered, Nuave asks the owner which
recommendations were done.

**P3.4 Paid re-check** (needs F-9; Gate 3). The same questions and sources;
no new intake beyond "what changed"; a report that compares each question
and each check, before and after, and says what changed, never why. It needs
a re-check order type linked to the first order, a price, a reminder email
with consent, and updated terms and privacy pages.

- **Founder time:** about 10 to 20 hours; the re-check is a small product of
  its own. About 4 to 6 weeks.

### Phase 4: Prove it is worth more (evidence first)

- **P4.1 Priorities by value:** the prices AI itself quoted for each topic
  (code reads "Rp" ranges from the answers), plus an optional owner choice
  of their most important treatments (its own decision), giving a "rebut
  dulu / pertahankan / nanti" grid. No revenue forecast.
- **P4.2 Nuave's own reference numbers:** after enough audits in one city and
  category (the parking lot asks whether about twenty is enough), one line of
  combined, anonymous counts, only once `VISION.md`'s bar is met ("until
  their reliability has been demonstrated") and a privacy review is done.
- **P4.3 Offer and price test** (F-11), decided from conversion, refund and
  re-check data.
- **P4.4 More sources** (F-12): Google AI Mode, then Gemini, after a trial of
  the provider.
- **P4.5 Optional human time:** a paid read-through call, only if owners ask.
  No report ever depends on it.

## 7. Unit economics

**Assumptions.** Price Rp249.000, tax included (Terms §6: no tax or fee is
added at checkout). Rp16.500 to the dollar (use the month's rate). Midtrans
fees about 1–2% depending on the payment method, about Rp2.500 to Rp5.000
(confirm on the Midtrans dashboard).

**Provider cost per order today** (*billed*; the worst case is below):

| Item | USD | Basis |
| ---- | --- | ----- |
| Discovery (keyword data) | ≈ 0.07 | Spec 018 cost table |
| Question writing (GLM 5.3 Flash) | ≈ 0.01 | question canary, decision 2026-10-26 |
| Step 3 reading (Luna, about five Firecrawl requests) | ≈ 0.05 | decision 2026-10-28 |
| 20 answer checks (DataForSEO) | ≈ 0.08 | Spec 018: about 0.04 a source; up to 0.36 reserved, three tries each |
| Report pages (Firecrawl, up to 24 requests) | ≈ 0.05–0.12 | 22 credits cost about USD 0.11 |
| Report writer (Opus 5.5, two calls) | ≈ 1.18–1.26 | decision 2026-10-27 (USD 1.26); Spec 023's blind test (USD 4.72 for four reports) |
| PDF (Browser Run) | ≈ 0 | within the included hours |
| **Total** | **≈ 1.45–1.60** | about Rp24.000–26.000, about 10% of the price |

**After Phases 0 to 3** (estimates, billed): add about USD 0.16 to 0.43
(Phase 0, 0.02–0.08; Phase 1, 0.04–0.15; Phase 2, 0.05–0.15; Phase 3, about
0.05), for about **USD 1.6 to 2.0** an order, about Rp26.500–33.500.
The worst case rises only by the stability sample: USD 4.857, under the
hold, provided the writer's new fields fit its existing allowance.

**Per order, after Midtrans and provider costs, before tax:** about
Rp217.500–222.500 today; about Rp210.500–220.000 after the plan.

**Costs not in that line:**

- **Tax:** if Nuave is VAT-registered (PKP), about Rp24.700 of the price is
  VAT (11/111); if it pays the 0.5% final tax instead, about Rp1.250. The
  founder confirms with an accountant.
- **Refunds:** Rp12.450 for each failed check that cannot be re-run (Terms
  §8), and a full refund for a failed order whose provider costs are already
  spent.
- **Support:** answering owners and refunding bank transfers by hand is
  founder time.
- **Monthly fees:** Cloudflare Workers Paid (about USD 5 a month at minimum;
  check the bill); Firecrawl's USD 19 plan once orders pass about 160–200 a
  month (decision 2026-10-26); Browser Run beyond its 10 included hours at
  USD 0.09 an hour (Spec 021 P-01).
- **Per change:** a blind test of each writer change, about USD 5 (Spec 023:
  USD 4.72 for four reports); GitHub Actions minutes, 2,000 a month, which
  ran out mid-month before the 2026-10-28 change. Docs-only and draft pull
  requests now run only code checks and unit tests, under ten billed minutes
  on this pull request; code pull requests marked ready run the full set.
- **Founder time,** the largest cost: about 30 to 50 hours across Phases 0
  to 3 (§6), and about 15 to 20 pull requests to review.

**What pays for it** (hypotheses the gates test, not forecasts):

- Reports that show the owner something new, so fewer refunds and more word
  of mouth (Phases 0 and 1).
- Owners who act are the likely buyers of a re-check (Phases 2 and 3). The
  extra provider cost, about Rp2.500 to Rp7.000 an order, is covered when
  more than about 2–6% of owners buy a re-check. That assumes a placeholder
  price of Rp149.000 (F-9) and about Rp31.000 to deliver it and take the
  payment. The founder's time is covered only if owners value the new
  sections, which is what Gates 1 to 3 check before each next phase.
- A fuller report may carry a higher price (Phase 4).

**Platform limits** (each spec measures the ones it touches):

- **Daily cap:** at the USD 5.00 hold, the USD 50 cap allows 10 orders in
  progress at once; at about USD 2 billed, about 25 orders a day settle
  under it. Revisit at about 15 orders a day.
- **Runner work budget:** a question step costs 24 of a run's 80 units, and a
  run takes at most two orders (`src/lib/orders/runner.ts`).
- **Pages step:** a 150-second deadline, and 24 Firecrawl requests a reading.
- **Writer:** 24,000 output tokens a call, a 150,000-token input ceiling, and
  the language-fix call on every report so far.

## 8. Risks

| Risk | What reduces it |
| ---- | --------------- |
| A "berbeda" row is itself wrong (an outdated site, a misread quotation) | a reference is required; the quotation check; both sources shown when they disagree; `AUDIT.md`'s correction path for an objectively wrong report |
| "Cek fakta" reads as Nuave vouching for the clinic's safety or quality | safety and licensing get no verdict; verdicts are always relative to a named reference |
| The website check blames the web vendor for a refusal Nuave caused | refusals are only an "indikasi"; no fake AI readers; fixed explanatory text |
| Building before anyone has paid | Gates 1 to 3; Phase 0 small and alongside the first sales |
| The order's worst case passes USD 5.00 | the worst-case test in every "done when"; F-10 |
| The report gets long | prototype first; a word budget; sections hide when empty; technical parts folded |
| Delivery passes 30 minutes | each spec measures its step; time checked on the first three orders after each phase |
| Kit texts break health advertising rules | F-7: no publishing texts before the legal review; fixed texts approved once |
| A provider changes (DataForSEO, Firecrawl) | trials before promises; fail closed, as today |

## 9. What we will not do

- Rank numbers, scores, market percentages or benchmarks (`PRODUCT.md`
  non-goals); counts side by side instead.
- Causes, whether stated as certain or as "likely"; checked facts and their
  official meaning instead.
- Revenue forecasts or "return per rupiah".
- Ask every question three times and count every run; `AUDIT.md` keeps
  repeats as variance measurement.
- Structured-data code, special AI files or markup offered as a fix (the
  playbook says none is needed).
- Requests to be added to "best clinic" list articles.
- Advice on letting AI companies train on the site.
- Requests pretending to be an AI reader.
- An Excel workbook by default, a monitoring dashboard, or a subscription.
- A progress tracker: progress lives in each spec's `VERIFICATION.md` and its
  pull requests, and `NOW.md` names the active phase.

## 10. How agents use this plan

- Read `AGENTS.md`, `NOW.md`, then §1 to §5 of this plan and only your
  phase.
- Check the gate (§3) before starting a phase. Every package needs its own
  approved spec, which lists its required context.
- New ideas go to `PAYING_CUSTOMER_PLAN.md` §6, not here.

## Glossary

- **robots.txt:** a small public file on a website that says which automatic
  readers may read it.
- **OAI-SearchBot, Googlebot, Bingbot:** the automatic readers of ChatGPT's
  search, Google and Bing.
- **noindex:** a tag that tells search engines not to list a page.
- **sitemap:** a list of a site's pages for search engines.
- **structured data:** hidden labels in a page that tell machines "this is
  the address, this is a doctor".
- **plain page load:** opening a page the simple way, without running the
  code inside it.
- **challenge page:** a "prove you are human" page some websites show to
  automatic readers.
- **fixtures:** made-up test sites and answers used by automatic tests.
- **worst case:** the most an order could cost if every call used its full
  allowance and every retry happened; Nuave reserves it before each call.
- **billed:** what the calls actually cost.

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

1. They open with the owner's decision ("approve these three decisions";
   five decisions with owners and deadlines; the next meeting's date on the
   cover).
2. A hook that reframes the problem ("Loved by patients. Overlooked by AI.";
   "There is no page two."; "Five root causes. None of them is the quality
   of your care.").
3. A diagnosis: blocked AI readers, five versions of the name, a closed branch
   still listed, text AI cannot read, prices only in images.
4. "What AI gets wrong" as a main section: differing facts ranked by harm,
   each with the clinic's fact, how often, which AI, the likely source, the
   fix and the fix time; real answers marked up; a fact register with an
   owner for each fact.
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
- Several of their practices break Nuave's own rules: rankings and scores,
  causes, forecasts. This plan does not copy them (§9).

### A.4 Where Nuave already leads

- Real answers one tap away from every finding.
- The depth the prototype targets, in hand-written findings from real
  answers: "Google uses your blog to introduce other clinics"; a "best
  clinics" list sourced from an employee-attendance app's blog; 70 branches
  on a copy of the site against 75+ on the site.
- Natural Indonesian written to the owner, on a phone.
- No made-up score, forecast or cause.
- Thirty minutes and Rp249.000.

### A.5 The gap, side by side

| What matters | Assessment | Northlight | Nuave today |
| ------------ | ---------- | ---------- | ----------- |
| Hook and story | Weak | Very strong | OK |
| Evidence you can check | Strong (workbook) | OK | Very strong |
| Sample size | 720 answers, 3 runs | 4,320 answers, 3 runs | about 20 answers, 1 run |
| What AI gets wrong | Strong | Very strong | No section; the writer may raise it in a finding |
| Diagnosis | Strong, careful | Strong, overconfident | None, by rule |
| Website check | Strong | Strong | None |
| Competitors | OK | Very strong | Good |
| Sites AI relies on | Strong | Very strong | Listed per topic in Celah Topik; no full map |
| Priorities by value | Strong | Strong | Search volume only |
| Ready-to-use work | Very strong | Strong | None |
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
| 1 Moment of truth | P0.1 (under the source cards) |
| 2 Rank among named businesses | Changed: counts side by side, no rank (P0.2) |
| 3 Why it matters, from this audit | P0.3 |
| 4 Three decisions | Folded into the existing plan (P0.4) |
| 5 Graded causes | Dropped: checked facts and their official meaning (§4 rule 3) |
| 6 Action tags and "do this week" | Tags from the playbook (P0.6, F-2); no "do this week" line |
| 7 How AI describes the clinic, and the wanted positioning | P2.3, using the existing differentiator answer (F-5) |
| 8 Section intros that state a conclusion | P0.5 |
| 9 Official source beside the advice | P0.7 |
| 10 "Cara membaca angka ini" | P0.8 |
| 11 Website check | P1.1, playbook-supported rows only (F-3) |
| 12 Fact check | P1.0 and P1.2; branded questions only through F-4 |
| 13 Source map | P2.1, next steps only for directories and portals |
| 14 "Kenapa mereka" | Renamed and reframed as differences (P2.2) |
| 15 Three runs per question | Changed: variance study, then a stability sample (P3.0, P3.2, F-8) |
| 16 Ready-to-use kit | P2.4, in two steps (F-7); no structured-data code |
| 17 Workbook | P2.5: copy as text; Excel only on request |
| 18 Re-check as a product | P3.3 and P3.4 (F-9) |
| 19 Google AI Mode, Gemini, Meta AI | Phase 4 (F-12); Meta AI not planned |
| 20 Priorities by value | P4.1 |
| 21 Nuave's own benchmark | P4.2, only once reliable |
| 22 The business lesson (re-check, fix pack) | P3.4 and P4.3; no done-for-you fix pack |
| Design: charts, colours, PDF cover | P0.9; charts and colours settled in the P0.0 prototype |

## Review history

- **Round 1 (2026-11-06): FAIL.** Ten findings. Several conflicts with
  approved rules were not raised as decisions (graded causes against
  `VISION.md`; rank against `PRODUCT.md`; effort tags against Spec 023 R-09;
  three counted runs against `AUDIT.md`; the fact-check order against
  `AUDIT.md`; a safety question; a follow-up email against the privacy
  page). Phase 3 broke the USD 5.00 worst case. Building started before
  outside demand. The success measures could not decide anything. Costs
  were missing. The prototype data could not show Phases 1 and 2. Platform
  limits were ignored. There were small grounding errors.
- **Revision 2:** answers every finding. Conflicts are redesigned away or
  raised as F-decisions with the documents they change. Gates with default
  numbers come before each phase. Every package must stay inside the USD
  5.00 worst case. The unit economics are completed. The prototype now uses
  the two-source orders. Platform limits are named. A glossary is added.
