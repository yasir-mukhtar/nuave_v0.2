# Spec 018: Real-search questions, answered by ChatGPT and Google (Rp249.000)

> Status: **Draft** — waiting for founder review
> Owner: orchestrator
> Updated: 2026-10-23
> Implements: the new audit the founder chose to sell first (Option A, before
> S5 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md))
> Decision basis: [2026-10-23 — Real-search questions, ChatGPT and Google, Rp249.000](../../docs/DECISION_LOG.md#2026-10-23--real-search-questions-chatgpt-and-google-rp249000)
> Evidence: [`experiments/dataforseo-sozo/`](../../experiments/dataforseo-sozo/)
> (DataForSEO test on Sozo Skin Clinic, 2026-10-23, USD 0.16)

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/DECISION_LOG.md`: the 2026-10-23 entry named above
3. `experiments/dataforseo-sozo/results/discover/SUMMARY.md` and
   `experiments/dataforseo-sozo/results/answers/SUMMARY.md` (what the data
   looks like; `run.mjs` shows the working API calls)
4. `specs/016-order-and-saved-report/SPEC.md` and
   `specs/017-payment-and-test-pass/SPEC.md` (order, hold, cron, payment)
5. `specs/012-evidence-first-report/SPEC.md` (the report this extends)
6. Code: `src/app/api/audit/glm-questions/route.ts`,
   `src/lib/intake/glm-local.ts`, `src/lib/intake/smart-intake-contract.ts`,
   `src/lib/orders/runner.ts`, `src/lib/orders/cron.ts`,
   `src/lib/audit/provider.ts`, `src/lib/audit/report-pipeline.ts`,
   `src/lib/spending/provider-spend.ts`, `src/lib/payments/midtrans.ts`,
   `.github/workflows/ci.yml`
7. DataForSEO documentation, current version, read when building: Google
   Organic SERP live advanced (`load_async_ai_overview`,
   `people_also_ask_click_depth`, locations), Google autocomplete, DataForSEO
   Labs keyword data for Indonesia, AI Optimization AI keyword search volume.

Do not load: `archive/`, Spec 015, old checkpoints.

## Problem

Evidence (Sozo Skin Clinic, 2026-10-23):

- Today the ten questions are written by an AI (Cheaper Inference) from the
  business facts. They read well but are long and polished; the founder finds
  real searches ("berapa biaya treatment di sozo", "klinik kecantikan
  terdekat") more natural and more believable.
- Nuave cannot tell a customer how many people care about each question.
  DataForSEO returned monthly Google searches per topic (e.g. "klinik
  kecantikan terdekat" ≈ 49,500) and an estimate of AI-assistant mentions per
  topic (e.g. "flek hitam" ≈ 3,600).
- Nuave checks only ChatGPT. Google showed an AI summary for all five
  question-style searches tested, and those summaries used Sozo's own blog as
  a source while naming competitors, a finding the current audit cannot see.

Interpretation: customers will trust and act on the audit more when each
question is a real one, carries a demand number, and is answered by both
ChatGPT and Google.

## Desired outcome

A paying customer receives one report in which each of ten questions:

1. comes from real Google search data for their business type and city;
2. keeps real human wording;
3. shows how often its topic is searched; and
4. is answered by ChatGPT **and** Google's AI summary, with the exact same
   question text, side by side.

The package is one product at Rp249.000.

## User and situation

The owner or marketing lead of an Indonesian small or medium business who
wants to know what people ask, whether ChatGPT and Google name their business,
and what to publish to be named.

## Scope

- Search discovery for the confirmed business, city and services.
- Choosing ten questions from that data, with a fallback when the data fails.
- Asking each question to ChatGPT (today's path) and Google AI summary.
- Showing both answers, demand numbers and sources in the web report, PDF and
  JSON export.
- Price change to Rp249.000 everywhere it is shown or charged.
- Spend guard, secrets and deployment for the new provider.

## Non-scope

- Gemini, Perplexity, Google AI Mode or any third answer source.
- Tiers, add-ons or choosing which AI to check.
- More than ten questions, several cities, or several branches in one order.
- Rankings, monitoring, re-check scheduling or dashboards.
- Content writing for the customer (the report says *what* to publish, not
  the text).
- Terms, privacy and support pages (S5) and the landing page (S6), except the
  price figure where it already appears.
- Fixing the separate report miscount found on 2026-10-23 (an answer that
  named Sozo was listed as "not found"); that is its own fix.

## Experience

1. **Order and payment:** unchanged, except every price shows **Rp249.000** and
   Midtrans charges 249,000.
2. **Intake:** unchanged. The confirmed focus decides the search city:
   - brand focus → the business's main city (head-office city, else the first
     market area the customer confirmed);
   - branch focus (`cabang`) → that branch's city.
3. **Ten questions screen:** while questions are prepared the customer sees a
   short line such as "Mencari pertanyaan yang benar-benar dicari orang di
   <kota>…". Each question shows a small label:
   - "Dicari di Google" when the wording is a real question or search;
   - "Disusun dari topik yang dicari" when Nuave phrased it from a searched
     topic;
   - "Disusun dari profil bisnis" when search data was not available.
   The topic and its monthly searches are shown under each question (e.g.
   "Topik: laser flek hitam · ±12.100 pencarian/bulan di Google"). The customer
   may still edit or replace a question as today; an edited question shows
   "Diubah oleh Anda", keeps its original topic and number, and the
   customer's text is what is asked.
4. **Audit:** runs on the server as today; each question is asked twice
   (ChatGPT, then Google). The progress screen counts 20 checks.
5. **Report:** for each question: the question, its label, topic demand, then
   two answer blocks, "ChatGPT" and "Google (Ringkasan AI)", each with: named
   or not, recommended or not, competitors named, and sources used. The
   summary shows results per source ("ChatGPT: disebut di X dari 10",
   "Google: disebut di Y dari 10; ringkasan AI muncul di Z dari 10") and a
   short "Apa yang perlu dipublikasikan" list built from the questions where
   the business was missing and the sources the AIs relied on.
6. All customer text is Indonesian and follows `docs/VOICE.md`.

## Requirements

### Search discovery

- **R-01:** After intake confirmation and before question preparation, the
  server collects, for the confirmed category, services and city:
  Google keyword topics with monthly search volume (Indonesia), Google
  "People also ask" questions and Google autocomplete suggestions (city
  location where the API supports it). It also requests DataForSEO's estimated
  AI-assistant volume for the chosen topics when Indonesia is supported.
- **R-02:** Discovery uses only unbranded seeds built from the confirmed
  category, services and city, so the pool reflects what customers ask, not
  the brand. The customer's own brand is never added to seeds.
- **R-03:** Every discovered item keeps its origin (`people_also_ask`,
  `autocomplete`, `keyword`), its exact text, its topic and the topic's
  monthly volume with the data month.
- **R-04:** Discovery has a fixed call budget per order (target ≤ USD 0.06;
  hard stop USD 0.10) and finishes within the existing preparation time limit.

### Choosing the ten questions

- **R-05:** Cheaper Inference (the existing question writer) receives the
  business facts and the discovery pool and returns ten questions that:
  - cover the customer's confirmed services, highest demand first;
  - are mostly "choosing a provider" questions (which / where / how much /
    best / nearest) where an AI could name a business; at most two may be
    "how to" questions;
  - reuse a real pool text verbatim whenever one fits, otherwise phrase a
    short, everyday question from a pool topic using the topic's own words;
  - never contain the business's name (unchanged rule).
- **R-06:** A validator rejects a pack where a question labelled "Dicari di
  Google" is not an exact (case-insensitive, whitespace-normalised) pool text,
  where a question has no pool topic (unless fallback), or where the brand name
  appears. A rejected pack is retried once, then the fallback (R-07) is used.
- **R-07 (fallback):** If discovery fails, returns too little data (fewer than
  ten usable topics) or the pack fails R-06 twice, Cheaper Inference writes
  ten questions from the business facts exactly as today. Those questions are
  labelled "Disusun dari profil bisnis", carry no demand number, and the
  report says once that search data was not available for this audit.
- **R-08:** Demand numbers are always worded as topic searches ("topik ini
  dicari ±N kali/bulan di Google"), never as "N people asked this question".
  The AI-assistant figure, when shown, is labelled as an estimate
  ("perkiraan").

### Asking ChatGPT and Google

- **R-09:** ChatGPT answers come from today's observation path unchanged
  (OpenAI Responses API, `gpt-5.6-luna`, web search, low reasoning).
- **R-10:** Google answers come from DataForSEO's Google Organic SERP (live,
  advanced, mobile, `load_async_ai_overview: true`, language Indonesian,
  location = the search city from Experience step 2, falling back to
  Indonesia if the city is not a supported location).
- **R-11:** Both sources receive the **exact same question text**. The saved
  record keeps each source's raw response, the text sent, the location used
  and the time.
- **R-12:** For Google the saved observation holds: whether an AI summary was
  shown; its full text; its reference links; whether the business is named in
  the summary text (separately from appearing only as a source link); and the
  business's position in the map pack and in normal results, if present.
- **R-13:** "Google showed no AI summary" is a valid, completed result, shown
  as such, not a failure.
- **R-14:** Each Google check is retried like an observation today
  (same attempt limit and back-off). A Google check that still fails is
  marked "Tidak dapat diperiksa" for that question; ChatGPT results are not
  affected.

### Report

- **R-15:** The web report, PDF and JSON export show, per question, the label,
  topic, demand, and both answer blocks with named / recommended /
  competitors / sources. The JSON export includes the discovery data used.
- **R-16:** The summary counts are per source and never merged into one score.
- **R-17:** "Apa yang perlu dipublikasikan" lists at most five items, each
  tied to a question where the business was not named, naming the topic, its
  demand, and the sites the AIs relied on. It may only state what the
  evidence shows.
- **R-18:** The report-writing call stays one bounded call (plus the existing
  language retry) and keeps the existing validation rules; Google evidence is
  added to its input, not a second report.

### Price, spend and operations

- **R-19:** The price is Rp249.000 in Midtrans (`gross_amount` 249000), on
  every screen, email, and page that shows it. No Rp99.000 remains in customer
  text.
- **R-20:** Every DataForSEO call reserves a fixed maximum in the spend ledger
  before sending and settles to the `cost` the API returns, under the existing
  daily cap and per-order hold.
- **R-21:** The per-order hold stays USD 2.00 unless the worst-case test shows
  the new audit can exceed it; the expected cost is about USD 0.40–0.50.
- **R-22:** `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` are server secrets,
  deployed by `ci.yml` like the others. Live mode without them takes no new
  orders and sends a founder notice, because Google is part of what the
  customer pays for.
- **R-23:** Synthetic mode has labelled synthetic discovery and synthetic
  Google answers, so the journey and `verify-nuave` run with no spend.

## Failure and recovery

| Failure | What happens | Customer sees |
|---|---|---|
| Discovery fails or is thin | R-07 fallback; no extra charge to the customer | Questions labelled "Disusun dari profil bisnis"; one sentence in the report |
| One Google check fails after retries | That question's Google block is "Tidak dapat diperiksa" | Report delivered; the summary states how many Google checks completed |
| More than 3 of 10 Google checks fail | Report still delivered; founder notice sent; treated as a partial delivery under the refund rules S5 sets | Report says clearly that the Google part is incomplete |
| ChatGPT failures | Unchanged from today | Unchanged |
| DataForSEO balance empty / credentials rejected | Founder notice; no new orders are taken (R-22); orders already paid finish with Google marked "Tidak dapat diperiksa" | Existing "audit belum tersedia" path for new orders |

Never fabricate: a missing AI summary, a failed check, or a missing demand
number is shown as missing, never estimated or filled in.

## Evidence, data, privacy, and cost

- Data sent to DataForSEO: unbranded seeds, the ten questions and a city.
  No customer email, order ID or personal data.
- Raw responses are stored with the order's evidence under the existing
  retention policy.
- DataForSEO is prepaid; the founder keeps its balance topped up. Expected
  per audit: discovery ≈ USD 0.05, Google ≈ USD 0.04, ChatGPT ≈ USD 0.24,
  report ≈ USD 0.05 → ≈ USD 0.40–0.50 (≈ Rp7–8k) against Rp249.000.
- The report states that ChatGPT answers come from the same OpenAI model with
  web search, not the ChatGPT app, and that Google answers come from Google's
  results page for the stated city and date (one sample, may change).

## Acceptance criteria

- **AC-01:** Given a confirmed brand-focus intake, when questions are
  prepared, then discovery runs with the main city and the pack has ten
  questions, each with a label, a topic and (except fallback) a monthly
  volume with its data month.
- **AC-02:** Given a branch-focus intake, then the branch's city is used for
  discovery and Google checks.
- **AC-03:** Given a question labelled "Dicari di Google", then its text
  exactly matches a stored People-also-ask, autocomplete or keyword text.
- **AC-04:** Given any pack, then no question contains the brand name and at
  most two are "how to" questions.
- **AC-05:** Given discovery fails (simulated), then the R-07 fallback pack is
  used, labelled, and the report says so once.
- **AC-06:** Given an approved pack, when the audit runs, then each question
  has one ChatGPT and one Google result, asked with byte-identical text.
- **AC-07:** Given Google shows no AI summary for a question, then the report
  shows "Google tidak menampilkan ringkasan AI" for it and counts it as
  completed.
- **AC-08:** Given Google lists the business only as a source link, then the
  report says "dipakai sebagai sumber, tidak disebut" and does not count it
  as named.
- **AC-09:** Given a Google check fails after retries, then that block is
  "Tidak dapat diperiksa", ChatGPT is unaffected, and the summary counts are
  correct.
- **AC-10:** Given the report, then summary counts are per source, demand is
  worded as topic searches, and the AI-assistant figure (if any) is labelled
  as an estimate.
- **AC-11:** Given the checkout, then Midtrans receives 249000 and no customer
  page, email or PDF shows Rp99.000.
- **AC-12:** Given the daily cap is reached, then no DataForSEO call is sent.
- **AC-13:** Given synthetic mode, then `verify-nuave drive all` passes with
  labelled synthetic discovery and Google answers and no external calls.
- **AC-14 (live, founder-run):** one live order on a real business is
  delivered with both sources; total cost recorded; founder judges that the
  questions read as real human questions and the report is understandable
  (judgment criterion).

## Open questions

- **Q-1 (founder):** Refund rule when Google is incomplete (more than 3 of 10
  failed). Proposed: partial refund or free re-run; to settle in S5.
- **Q-2 (founder):** Report design for two answers per question. Proposed:
  the worker follows the current report style and the founder reviews
  screenshots; a Figma design can replace it later.
- **Q-3 (founder):** Should the order preview and landing promise name
  "ChatGPT dan Google"? Proposed: yes, wording approved in S5/S6.

## Implementation notes

- Suggested build order, each a separate PR: (1) price change; (2) discovery
  + question choice + fallback, synthetic first; (3) Google checks + report;
  (4) live run AC-14.
- DataForSEO uses HTTP Basic auth; one task per live request. Working calls
  and response shapes are in `experiments/dataforseo-sozo/run.mjs`.
- City locations: check DataForSEO's SERP location list for Indonesian
  cities; Labs/keyword volumes are country-level (Indonesia), which is why
  demand is national while answers are local; the report says so.

## Verification record

Complete after implementation:

- Verification artifact: `specs/018-search-grounded-chatgpt-google-audit/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
