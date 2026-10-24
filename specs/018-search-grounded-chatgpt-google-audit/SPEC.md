# Spec 018: Real-search questions, answered by ChatGPT and Google (Rp249.000)

> Status: **In review**. Revision 4 answers the round-2 plan review (FAIL, 3
> blocking). Not approved; do not build.
> Owner: orchestrator
> Updated: 2026-10-24. Revision 4 changes:
> - ChatGPT is asked from "Indonesia" only (DataForSEO has no city for it);
>   every place claim now says so, and questions that depend on a place name
>   the city in their text;
> - a rule turns each confirmed service into a search phrase (R-04a), and the
>   probe (AC-00) runs that rule on three real clinics, with a separate pass
>   rule for the ChatGPT scraper that gates the checks;
> - the price and promise ship together with the checks, never before;
> - the round-2 notes (labels, no-report path, retries, business cards,
>   numbers, city names, status codes) are applied; Q-2 is new.
>
> Implements: the new audit the founder chose to sell first (Option A, before
> S5 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md)).
> Decision basis: [2026-10-23: Real-search questions, ChatGPT and Google, Rp249.000](../../docs/DECISION_LOG.md#2026-10-23--real-search-questions-chatgpt-and-google-rp249000),
> including its 2026-10-24 addendum and clarification.
> Evidence: [`experiments/dataforseo-sozo/`](../../experiments/dataforseo-sozo/).
> The test on Sozo Skin Clinic ran on 2026-10-23 and cost USD 0.16. The
> three-clinic probe (stage `probe`) is approved but has not run yet (AC-00).

## Required context

Read in order:

1. `AGENTS.md`.
2. `docs/DECISION_LOG.md`: the 2026-10-23 entry, its 2026-10-24 addendum and
   clarification, and D-05 of 2026-09-22 (the settled report labels).
3. The experiment results:
   - `experiments/dataforseo-sozo/results/discover/SUMMARY.md`;
   - `experiments/dataforseo-sozo/results/answers/SUMMARY.md`;
   - `results/probe/SUMMARY.md`, once AC-00 has run.

   `run.mjs` shows the working API calls; its `probe` stage implements R-04a,
   R-04, R-05, R-08 and R-12 exactly as written here.
4. The specs this one changes:
   - `specs/016-order-and-saved-report/SPEC.md`;
   - `specs/017-payment-and-test-pass/SPEC.md`;
   - `specs/012-evidence-first-report/SPEC.md`.
5. The domain guides this spec changes (see "Document updates"):
   `docs/VOICE.md`, `docs/AUDIT.md`, `docs/PRODUCT.md` and
   `docs/PAYING_CUSTOMER_PLAN.md`.
6. Code:
   - Audit and questions:
     - `src/app/api/audit/glm-questions/route.ts`
     - `src/lib/intake/glm-local.ts`
     - `src/lib/intake/smart-intake-contract.ts`
     - `src/lib/audit/questions-id-direct-ten.ts` (the validator, from line 399)
     - `src/lib/audit/direct-ten-context-v2.ts`
     - `src/lib/audit/provider.ts`
     - `src/lib/audit/call-timeouts.ts`
     - `src/lib/audit/report-pipeline.ts`
     - `src/lib/audit/contracts.ts`
   - Orders and spending:
     - `src/lib/orders/runner.ts`
     - `src/lib/orders/cron.ts`
     - `src/lib/orders/store.ts`
     - `src/lib/orders/mail.ts`
     - `src/lib/orders/promise.ts`
     - `src/lib/orders/runner-worst-case.test.ts`
     - `src/app/api/orders/approve/route.ts`
     - `src/lib/spending/spend-ledger.ts`
     - `src/lib/spending/provider-spend.ts`
   - Payments:
     - `src/lib/payments/midtrans.ts`
     - `src/lib/payments/apply.ts`
     - `src/lib/payments/founder-notices.ts`
   - Report pages: `src/app/audit/report/` and `src/app/r/` (including
     `SavedReport.tsx`, which builds the JSON export in the browser).
   - Deploy and checks: `.github/workflows/ci.yml` and
     `.agents/skills/verify-nuave/`.
7. DataForSEO documentation, current version, read when building:
   - **DataForSEO Labs:** Google keyword suggestions.
   - **Google SERP:**
     - organic live advanced (`load_async_ai_overview`,
       `people_also_ask_click_depth`);
     - autocomplete live advanced;
     - the locations list.
   - **AI Optimization:** ChatGPT LLM Scraper live advanced, with its
     locations and languages lists.
   - The status-code appendix.

Do not load: `archive/`, Spec 015, old checkpoints.

## Problem

Evidence from Sozo Skin Clinic, 2026-10-23, and the founder's report review:

- **The questions don't sound like real people.** Today the ten questions are
  written by an AI (Cheaper Inference) from the business facts. The founder
  finds real searches more natural and more believable, for example "berapa
  biaya treatment di sozo" and "klinik kecantikan terdekat".
- **There is no demand number.** Nuave can't say how often people search each
  question's topic. DataForSEO returns monthly Google searches per keyword,
  for example "klinik kecantikan terdekat" ≈ 49,500 a month across Indonesia.
- **Only one AI is checked.** Nuave checks only an OpenAI model, asked through
  the API. Google showed an AI summary with text for 4 of the 5 searches
  checked in the answers stage:
  - "klinik kecantikan terdekat" returned an empty summary element;
  - the discovery search "klinik kecantikan terbaik di jakarta" showed none.

  Those summaries used Sozo's own articles as sources but named only other
  clinics.
- **The wrong discovery method gives the wrong topics.** Keyword "ideas" sorted
  by volume returned mostly unrelated searches, such as "harga emas hari ini"
  and "persija jakarta". Two of the five good Google questions came from a
  search that included the brand name, which this spec forbids (R-02). So
  discovery must use a narrower method (R-04), and it must be proven on real
  intakes before it is built (AC-00).

Interpretation: customers will trust and act on the audit more when each
question is a real one, carries a demand number, and is answered by the real
ChatGPT app and by Google.

## Desired outcome

A paying customer gets one report in which each of ten questions:

1. comes from real Google search data for their business type, with demand
   measured across Indonesia;
2. keeps real human wording, with a label saying where the wording came from;
3. shows how often its topic is searched, when that is known; and
4. is answered by the **ChatGPT app** and by **Google's AI summary**, with the
   exact same question text. Google is asked from the city the customer
   confirmed; ChatGPT is asked from Indonesia, because DataForSEO cannot set a
   city for it. The report shows both places when they differ. A question
   whose answer depends on place (for example "terdekat") names the city in
   its own text, so both sources answer for the same place.

It is one product at Rp249.000.

## User and situation

The owner or marketing lead of an Indonesian small or medium business. They
want to know:

- what people ask;
- whether ChatGPT and Google name their business; and
- where the AIs get their information.

## Scope

- **Place for the search:** a "Kota untuk pencarian" field on the intake
  review screen.
- **Discovery:** turning each confirmed service into a search phrase, then
  searching for those phrases and the confirmed place.
- **The ten questions:** chosen from that data, with a fallback when the data
  fails.
- **Asking:** each question goes to the ChatGPT app and to Google AI summary
  through DataForSEO, in the same runner step on the first attempt.
- **The report:** both answers, demand numbers and sources in the web report,
  the PDF and the JSON export.
- **Failed checks:** delivered as "Tidak dapat diuji" with "Minta bantuan",
  and the founder resolves them by hand (R-21a).
- **Price:** Rp249.000 everywhere it is shown or charged, and "ChatGPT dan
  Google" named on the order preview and checkout.
- **Delivery promise:** the text changes to match the support-first rule
  (R-23).
- **Provider operations:** spend guard, secrets, status codes and deployment
  for DataForSEO.
- **Document updates:** listed under "Document updates". They ship in the same
  merge as the behaviour they describe (see the build order).

## Non-scope

- **More sources:** Gemini, Perplexity, Google AI Mode or any third answer
  source.
- **Choice and tiers:** tiers, add-ons, or choosing which AI to check.
- **Bigger orders:** more than ten questions, several places, or several
  branches in one order.
- **Positions:** rankings, map-pack or organic positions, monitoring,
  scheduled re-checks, dashboards.
- **A city for ChatGPT.** DataForSEO's ChatGPT scraper accepts countries only.
- **A free re-run button.** Failed checks go to support in this spec. A
  self-serve re-run may become its own small spec later.
- **DataForSEO's AI-assistant volume estimate.** It is built from Google's
  "People also ask" data, not from AI-assistant use, so it is not shown.
- **Written content:** the report says *what* is missing, not the text to
  publish.
- **Other pages:** the terms, privacy and support pages (S5) and the landing
  page (S6), except the price figure where it already appears.
- **The 2026-10-23 report miscount:** an answer that named Sozo was listed as
  "not found". That is a separate fix. In this spec's report, "named" is
  decided by code (R-16).

## Document updates (ship in the same merge as the behaviour they describe)

- **`docs/VOICE.md`:**
  - §2 and the `ChatGPT` rows (lines 50–51): the report may now call answers
    "ChatGPT", because they come from the ChatGPT app (through DataForSEO).
    Keep "AI buatan OpenAI" only for answers that come from the OpenAI API,
    such as reports saved before this change.
  - Line 44 (settled exact labels) and line 228 (§7.4): the D-05 sentences
    stay word for word, with the denominator taken per source: "Bisnis Anda
    muncul di X dari N pertanyaan" and "Bisnis Anda direkomendasikan di Y dari
    N pertanyaan". N is 10 whenever all checks of that source completed.
  - Line 60 (failed test): "Tidak dapat diuji" stays the failed-check text.
  - §7.3: add the five question origin labels (Experience 3) as settled
    labels, as §7.2 does for its source labels.
  - §4 and §7.1: Rp99.000 becomes Rp249.000, and "Bayar Rp99.000" becomes
    "Bayar Rp249.000".
  - §7.4: the renamed answers section (see Report layout).
- **`docs/AUDIT.md`:**
  - the scope of one audit: ten questions, two sources;
  - the method: ChatGPT app and Google AI summary through DataForSEO, and
    OpenAI only for the business reading and report writing;
  - replace "ten evaluable observations before delivery" (lines 20, 196 and
    418) and "counts out of ten" (lines 419–420) with the gate and
    denominators in R-19.
- **`docs/PRODUCT.md`:** the price (lines 72, 149 and 311); how results are
  reported (per source, with failed checks shown); line 183 (question review:
  the origin labels and topic line) and lines 205–207 (results only after
  10/10; counts out of ten) replaced by R-19.
- **`docs/PAYING_CUSTOMER_PLAN.md`:** G1 and the §5 price lines say Rp249.000.
- **`specs/012`, `016` and `017`:** add a "Changed by Spec 018" note where this
  spec amends them:
  - Spec 012's ten-of-ten denominators;
  - Spec 016's failure path and report gate;
  - Spec 017's delivery promise, refund wording and payment-start checks.

## Experience

1. **Order and payment:** unchanged, except:
   - every price shows **Rp249.000**;
   - the order preview and checkout say the audit checks "ChatGPT dan Google";
   - the delivery promise uses the R-23 text;
   - Midtrans charges 249,000.
2. **Intake review screen:** one new field, **"Kota untuk pencarian"**:
   - It is a searchable pick-list of supported Indonesian cities shown with
     their Indonesian names (R-03), plus **"Seluruh Indonesia"**.
   - It is pre-filled as follows:
     - branch focus (`cabang`): the city in the branch address, if it matches
       a list entry (R-03 name matching);
     - brand or product focus with a market reach of `sekitar` or `beberapa`:
       the first confirmed market area that matches a list entry (for example
       "Jakarta Selatan" matches "Jakarta");
     - otherwise, including reach `seluruh` or `luar`: empty, and the customer
       must choose.
   - Helper text (true for both sources): "Google kami tanya seolah-olah dari
     kota ini. ChatGPT hanya bisa diatur per negara, jadi ChatGPT ditanya dari
     Indonesia. Pertanyaan yang bergantung pada lokasi akan menyebut kota ini."
   - After discovery has run for the second time (R-07), the field is locked.
3. **Ten questions screen:**
   - While the questions are prepared: "Mencari pertanyaan yang benar-benar
     dicari orang…".
   - Each question shows one origin label:
     - **"Dicari di Google"**: exact text from Google autocomplete or a
       keyword;
     - **"Orang lain juga bertanya"**: exact text from Google's "People also
       ask";
     - **"Disusun dari topik yang dicari"**: Nuave phrased it from a topic;
       the question contains the topic's core words;
     - **"Disusun dari profil bisnis"**: the fallback (R-08);
     - **"Diubah oleh Anda"**: the customer edited it.
   - Under each question whose text contains its topic's core words: "Topik:
     laser flek hitam · ±12.100 pencarian/bulan di Google, seluruh Indonesia
     (data <bulan tahun>)". Other questions show no number (R-06).
   - An edited question shows "Topik awal: …". Its number is dropped if the
     edited text no longer contains the topic's core words.
4. **Audit:**
   - It runs on the server as today.
   - On the first attempt, one runner step asks one question to both sources
     (R-15). A retry asks only the source that failed (R-14). So ten steps
     cover a run without retries, and the 15-minute promise stays.
   - The progress screen still counts ten questions.
5. **Report:** see "Report layout".
6. **Failed checks:**
   - The report is delivered whenever the R-19 gate passes.
   - A failed answer slot shows **"Tidak dapat diuji"** and **"Minta
     bantuan"**, a mailto link to `support@nuave.ai` that includes the order
     number.
   - The founder gets one notice per order (R-21) and resolves it by hand
     (R-21a).
   - A refund is given only when support cannot fix it.
7. **Language:** all customer text is Indonesian and follows `docs/VOICE.md`,
   as updated above.

## Report layout (built from the existing design; the founder evaluates it later)

There will be no Figma design now. The worker builds from the current
direct-ten report (`src/app/audit/report/`, `DirectTenReportPage.tsx` and
`DirectTenReportBody.tsx`), with the same phone-column layout, colours and
type. The section names below are the current ones.

| Section | Today | Proposed |
|---|---|---|
| Header | Business name, date | Adds "Diperiksa di ChatGPT dan Google · <tanggal>" and the places actually used (R-13): one place when both are the same, otherwise "Google: <kota> · ChatGPT: Indonesia". |
| Hasil singkat | One result card with ten beads | **Two cards, stacked**, each keeping the D-05 sentences with its own denominator:<br>**"ChatGPT":** "Bisnis Anda muncul di X dari N pertanyaan"; "Bisnis Anda direkomendasikan di Y dari N pertanyaan".<br>**"Google · Ringkasan AI":** "Google menampilkan ringkasan AI di Z dari M pertanyaan"; "Bisnis Anda muncul di W dari Z pertanyaan". Google has no "direkomendasikan" line.<br>A count whose denominator is 0 shows "Tidak diuji", never "0 dari 0". Beads show only completed checks. A line "K pemeriksaan tidak dapat diuji" appears when K > 0. The conclusion and the limit note stay; the limit note adds the places and date. |
| Jawaban model AI → "Jawaban ChatGPT dan Google" | One answer block per question | **One block per question:** the number, the question, the origin label, the topic line, then **two stacked answers** in the existing answer style. Each answer has a source heading ("ChatGPT", "Google · Ringkasan AI"), the place used, the existing name highlight and references list, and the outcome text from R-16/R-17. There are no tabs, so the PDF shows everything. |
| Analisis Nuave | Findings; "Bisnis lain yang disebut" | Findings name the source they come from. "Bisnis lain yang disebut" becomes one short list per source, taken from the answer text. |
| Yang dapat dilakukan | Priorities | Same, plus a **code-built** block "Topik yang belum menyebut Anda" (R-18). |
| Tentang audit ini | Method | Adds:<br>- where the questions came from (Google data through DataForSEO, data month, place);<br>- that ChatGPT answers come from the ChatGPT app, asked from Indonesia, and Google answers from Google's results page for the stated place, both through DataForSEO;<br>- that answers vary by time, account and place. |

Reports saved before this change keep rendering exactly as today (R-29).

## Requirements

### Place

- **R-01: Search place.** The confirmed "Kota untuk pencarian" is saved on the
  order with the intake.
  - It sets the Google location (R-03). ChatGPT always uses Indonesia.
  - Discovery volumes are always for all of Indonesia, because DataForSEO Labs
    data is country-level.
- **R-02: No brand in requests.** No request to DataForSEO contains the
  business's name, a confirmed alias or its domain. This covers discovery
  seeds, autocomplete and "People also ask" seeds. The ten questions are also
  brand-free under the existing rule.
- **R-03: Location mapping.**
  - The pick-list comes from a snapshot of DataForSEO's Google SERP locations
    for Indonesia (type City), stored in the repo with its date. Each entry
    maps the DataForSEO name (English, with region, for example
    "Surabaya,East Java,Indonesia") to an Indonesian display name
    ("Surabaya").
  - Name matching for pre-fill compares case-insensitively after removing
    "Kota", "Kabupaten", and the compass words "Utara", "Selatan", "Barat",
    "Timur", "Pusat" (so "Jakarta Selatan" matches "Jakarta").
  - Google uses that city's `location_code`. "Seluruh Indonesia" uses 2360.
  - The ChatGPT scraper always uses Indonesia (2360). Its locations list has
    countries only (215 entries, checked 2026-10-24).
  - Seeds and question text use the Indonesian display name.

### Discovery

- **R-04a: Search phrase from a service.** Code turns each confirmed service
  into one search phrase:
  1. lowercase it;
  2. remove text in brackets, digits, units (ml, cc, unit, sesi, x) and
     punctuation (a hyphen becomes a space);
  3. remove every word of the business name, confirmed aliases and domain
     (R-02), and the filler words "layanan", "paket", "promo", "dan", "untuk",
     "di";
  4. keep the first 4 remaining words;
  5. if exactly 1 word remains, it is generic: append the category's subject
     word, which is the last word of the category after removing "klinik"
     (for example "laser" in a "klinik gigi" becomes "laser gigi", and "meso"
     in a "klinik kecantikan" becomes "meso kecantikan"); if the category has
     no word left after removing "klinik", or the subject word is already in
     the phrase, the phrase is used as is;
  6. if nothing remains, the service is skipped.

  The phrase's **core words** are its words minus "klinik" and minus the
  category's subject word, unless that would leave none (then all its words).
- **R-04: Discovery calls.** After intake confirmation, the server collects
  the following, on the phrases from R-04a:
  - **Topics:** for each of the first four phrases, DataForSEO Labs Google
    `keyword_suggestions`: the phrase as seed, Indonesia (2360), language
    `id`, `include_seed_keyword: true`, `limit` 20, ordered by search volume.
    If fewer than 2 phrases exist, the category is also used as a seed.
  - **Autocomplete:** Google autocomplete for "<phrase> <kota>" for each of
    those phrases, with the Google location from R-03 and language `id`.
  - **"People also ask":** Google organic SERP with
    `people_also_ask_click_depth: 1` for two seeds, "<category> terbaik di
    <kota>" and "biaya <first phrase>", with the Google location and language
    `id`.
  - With "Seluruh Indonesia", "<kota>" is left out of the seeds.
- **R-05: Usable topic.** A keyword counts as a usable topic when:
  - it contains every core word of its phrase;
  - its monthly search volume is at least 10; and
  - it contains no brand, alias or domain from R-02.

  Its data month is the latest month in its `monthly_searches`.
- **R-06: Topic and number for real wordings.** An autocomplete or "People
  also ask" text gets the longest usable topic whose core words it contains,
  and that topic's number. If it contains no topic's core words, it has no
  topic and no number; it may still be used only if it contains the core words
  of some phrase (R-08 relevance).
- **R-07: Server-owned pool.**
  - The pool is saved on the order, like the prepared reading. It records each
    item's origin, exact text, topic, volume, data month and the place used.
  - Labels, topics and numbers are re-checked against the saved pool when the
    customer approves. The browser never supplies them; a label or number
    changed in the browser is rejected.
  - When the questions are rewritten, the saved pool is reused.
  - If the customer changes services or place, discovery runs again, at most
    once more per order, within the R-09 budget. After that the field and the
    services are locked for discovery, and the latest pool is reused.
- **R-08: Fallback.** If discovery fails or the pool is thin, Cheaper
  Inference writes ten questions from the business facts, as today.
  - A **real wording** counts toward the pool only if it is brand-free (R-02),
    contains the core words of a confirmed phrase, is at most 120 characters,
    and passes the R-11 checks that code can run without a model (no brand, no
    competitor name from the pool's own topics list, place rule).
  - Thin means fewer than 6 usable topics *and* fewer than 5 counted real
    wordings.
  - The fallback questions are labelled "Disusun dari profil bisnis" and have
    no number.
  - The report says once that search data was not available.
- **R-09: Discovery budget.**
  - The target is USD 0.08 or less per run, with a hard stop at USD 0.12.
  - When the hard stop is reached midway, discovery keeps what it collected
    and applies R-08.
  - Discovery keeps response sizes small (the limits above), so the
    preparation request stays within the Worker CPU budget.

### Choosing the ten questions

- **R-10: Selection rules.** Cheaper Inference receives the business facts and
  the pool. It returns ten questions that:
  - give each confirmed phrase with usable topics at least two questions,
    then fill the rest by highest demand;
  - include at least 7 **provider-choice** questions. A question is
    provider-choice when it contains one of "rekomendasi", "terbaik",
    "terdekat", "bagus", "mana", "dimana", "di mana", "harga", "biaya",
    "berapa", "murah", "tempat", "klinik", or the search city's name;
  - include at most 2 **advice** questions, meaning not provider-choice
    (for example "cara…", "bolehkah…", "setelah facial tidak boleh apa?");
  - reuse a pool text word for word whenever one fits. Otherwise they phrase a
    short, everyday question that contains the topic's core words;
  - name the search city in any question that depends on place ("terdekat",
    "dekat sini", "di sekitar", "near me"). With "Seluruh Indonesia", such
    questions are not used; and
  - contain no business name, under the existing rule.
- **R-11: Validator.** These checks are added to `validateDirectTenQuestions`,
  which already rejects competitor names, false premises, private data and
  high-impact advice.
  - A question labelled "Dicari di Google" or "Orang lain juga bertanya" must
    match a saved pool text exactly. Case and spaces are normalised, and the
    origin must match too.
  - A question labelled "Disusun dari topik yang dicari" must contain its
    topic's core words.
  - At least 7 provider-choice and at most 2 advice questions (R-10 word
    lists).
  - A place-dependent question must contain the search city's name.
  - A question carries a number only if it contains its topic's core words.

  A failing pack is retried once; then R-08 applies.

### Asking ChatGPT and Google

- **R-12: Sources.** Both sources are asked through DataForSEO. The ChatGPT
  details are gated by the scraper rule in AC-00.
  - **ChatGPT:** the ChatGPT LLM Scraper, live advanced.
    - Request: `keyword` = the question, `location_code` 2360,
      `language_code` `id`, `force_web_search: true`.
    - The call timeout is 150 seconds (DataForSEO allows live scraper calls
      up to 120 seconds).
    - Saved: the answer markdown, the text of local-business cards and tables
      (name, rating, address; **phone numbers removed**), `sources`,
      `brand_entities`, `model`, `datetime`, the item types returned and the
      call time.
  - **Google:** Google Organic SERP, live advanced.
    - Request: device mobile, `load_async_ai_overview: true`, language `id`,
      location from R-03.
    - Saved: the AI-summary element's text and its references.
  - The OpenAI Responses API is no longer an observation source. It is still
    used for the business reading and report writing.
- **R-13: Same text, recorded place.** Both sources receive byte-identical
  question text. Each observation records the text sent, the location code,
  the location name used and the time. The report shows the place each source
  used ("Indonesia" for ChatGPT).
- **R-14: Retries per source.**
  - Each source has up to 3 attempts per question, with today's back-off.
  - A retry asks **only the source that failed**, with the same text. A
    completed answer is never asked again.
  - Retry on DataForSEO status 40202, 40209, 50000, 50301, 50303 and 50401,
    on timeouts, and on network errors.
  - Do not retry 40100, 40104, 40200, 40201, 40203 or 40210 (credentials,
    access, balance or cost limit). These fail the check and raise the
    `dataforseo_unavailable` notice (R-21).
  - Status 40102 (no results): for Google, the outcome is "not shown"; for
    ChatGPT, one failed attempt.
  - Any other code is one failed attempt and is not retried.
  - A source that uses up its attempts is "failed" for that question only.
- **R-15: One step per question.**
  - On the first attempt, one runner step asks both sources for one question,
    in parallel. Retries follow R-14 in later steps.
  - `RUN_COST.question` and `OBSERVATION_STEP_MS` are raised to cover two
    calls of up to 150 seconds each, in parallel.
  - Two orders running at the same time must each still take one step per
    run. If `RUN_UNIT_LIMIT` (40) does not allow it, the limit is raised
    within Workers Paid limits; `runner-worst-case.test.ts` shows this
    (AC-15).
  - Ten questions without retries stay ten steps, so delivery stays within
    the promise.

### Outcomes and counting

- **R-16: "Named" is decided by code.** The business is named when its name or
  a confirmed alias appears in the answer text.
  - It is checked case-insensitively, at word boundaries, against the brand
    name and any aliases confirmed in intake.
  - The answer text includes the visible text of links, and for ChatGPT the
    names in local-business cards and tables. It excludes link addresses
    (URLs) and the sources list.
  - A name that appears only in link addresses or the sources list is stored
    as "dipakai sebagai sumber" and is not counted as named.
  - Code decides this when the observation is saved. The report-writing model
    receives it as a fact and cannot change it.
- **R-17: Outcomes per source.**
  - **ChatGPT:** "answered" or "failed". "Recommended" keeps today's
    assessment rules. It is shown only for ChatGPT.
  - **Google:**
    - **"summary with text":** the AI-summary element has text;
    - **"empty element":** present but without text; it is retried once inside
      R-14's attempts and, if still empty, counted as not shown;
    - **"not shown":** no AI-summary element (or status 40102); a completed
      result, shown as "Google tidak menampilkan ringkasan AI";
    - **"failed":** R-14 attempts used up.

    Google has no "recommended" count.
- **R-18: "Topik yang belum menyebut Anda".** Code builds this block from the
  evidence, with no model-written text. It lists up to 5 questions that have
  at least one completed answer and where the business was not named in any
  completed answer, ordered by demand. Each row shows the topic, its number
  (if any) and up to 3 domains that the answers cited.

### Report gate and failures

- **R-19: Report gate** (pending Q-2; this is the recommended rule). It
  replaces the ten-evaluable rule for Spec 018 orders.
  - The report is generated when every question has a final outcome for both
    sources, and **each source completed at least 5 of its 10 checks**.
  - Otherwise no report is generated, and the order fails as it does today:
    its state becomes `failed`, the customer gets the existing failure email
    ("Kami akan menghubungi Anda dalam 1 hari kerja"), and the founder gets
    the existing `paid_order_failed` notice. S0's rule D3 applies: a refund
    within three business days, unless the founder fixes the order first.
  - Denominators:
    - ChatGPT: N = completed ChatGPT answers;
    - Google: M = completed Google checks; Z = summaries with text;
    - failed checks are counted separately (K).
    - A denominator of 0 shows "Tidak diuji".

  This amends Spec 012's ten-of-ten assumption for Spec 018 reports only.
- **R-20: Failed slot.** A failed check shows "Tidak dapat diuji" and "Minta
  bantuan". There is no button to re-run it.
- **R-21: Founder notices.** There are two new notice kinds, following Spec
  017 R-21:
  - `checks_failed`: once per **delivered** order with at least one failed
    check. It names the order number and the failed checks. (An order that
    fails the gate uses the existing `paid_order_failed` notice instead.)
  - `dataforseo_unavailable`: credentials, access, balance or cost-limit
    errors (R-14), at most once a day.
- **R-21a: "Resolved by hand".** The saved report never changes (S0). The
  founder replies to the support email within 2 working days. The founder may
  run the failed checks again by hand and email the missing results to the
  order email. A refund is given only when the missing results cannot be
  provided.
- **R-22: Taking orders needs DataForSEO.**
  - Payment start (Spec 017 R-05) refuses a new payment when DataForSEO is
    unavailable. The check reads `/v3/appendix/user_data`, which is free,
    cached for 10 minutes.
  - It refuses when the credentials are missing or rejected, or the balance is
    below USD 2.00.
  - The customer sees the existing message "Audit tidak tersedia saat ini."
  - Orders already paid continue. Their failed checks follow R-20 and R-21.
  - New orders are accepted again as soon as the check passes.

### Price, promise and operations

- **R-23: Price and promise.**
  - The price is Rp249.000 in Midtrans (`gross_amount` 249000) and on every
    screen, email, PDF and page that shows it. That includes
    `founder-notices.ts`, `mail.ts`, the fake Midtrans default and the
    verify-nuave skill files.
  - The order preview and checkout say "ChatGPT dan Google".
  - The delivery promise becomes: "Laporan biasanya siap dalam 15 menit
    setelah Anda menyetujui pertanyaan, paling lama 24 jam. Jika ada bagian
    yang gagal diperiksa, tim kami membantu menyelesaikannya; jika tidak dapat
    diselesaikan, kami kembalikan uang Anda." The founder approves the exact
    words (Q-1, AC-17).
  - These changes go live only together with the checks (see the build
    order).
- **R-24: Price cutover.** The paid check compares the payment with the
  constant `ORDER_GROSS_AMOUNT_TEXT`. Deploy the price change only when no
  payment attempt is open. The founder checks the Midtrans sandbox list.
  This is accepted for the sandbox and allow-list period.
- **R-25: Spend.**
  - Each DataForSEO call reserves a fixed maximum in the ledger before it is
    sent:

    | Call | Maximum (USD) |
    |---|---|
    | SERP with AI summary | 0.006 |
    | ChatGPT scraper | 0.006 |
    | Keyword suggestions | 0.015 |
    | Autocomplete | 0.004 |

  - Each call then settles to the `cost` the API returns, under the existing
    daily cap and per-order hold.
  - The worst case per order in dollars:
    - discovery: 2 runs × USD 0.12 = USD 0.24;
    - checks: 10 questions × 2 sources × 3 attempts × USD 0.006 = USD 0.36;
    - plus today's reading, questions and report.

    A new unit test, `spend-worst-case.test.ts`, sums these maxima and shows
    the total stays at or under USD 2.00. If not, stop and ask the founder.
    (`runner-worst-case.test.ts` stays about database queries and outbound
    requests per run.)
- **R-26: Secrets.** `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` are Worker
  secrets, deployed by `ci.yml` like the others.
- **R-27: Synthetic mode.** It provides labelled synthetic discovery, ChatGPT
  answers and Google answers, including one empty summary and one failed check
  per run. This lets the journey and `verify-nuave` run with no spending.

### Evidence, export and old reports

- **R-28: Privacy.**
  - Raw DataForSEO responses stay in restricted server evidence under the
    existing retention policy. They contain third-party data, such as
    businesses' phone numbers. They never reach the browser.
  - The report data sent to the browser, and so the JSON export built from it,
    holds only: the questions, labels, topics, numbers, data month, places,
    answer texts (phone numbers removed), cited URLs and outcomes.
  - The report-writing prompt receives only:
    - the question, its label and topic;
    - each answer's text (phone numbers removed);
    - the cited domains;
    - the named and source facts (R-16) and the outcomes (R-17).
  - S5's privacy page must name DataForSEO as a recipient of the questions
    and the place before G1.
- **R-29: Old reports.**
  - Reports saved before this change keep rendering with today's renderer,
    chosen by `question_method` and the report version.
  - The new report and export carry new version strings.
  - Nothing is regenerated on read.

## Failure and recovery

| Failure | What happens | Customer sees |
|---|---|---|
| Discovery fails or the pool is thin | R-08 fallback; no extra charge | Questions labelled "Disusun dari profil bisnis"; one sentence in the report |
| A check fails after its attempts | The slot shows "failed"; the report is delivered if R-19 passes; `checks_failed` notice | "Tidak dapat diuji" and "Minta bantuan"; resolved per R-21a |
| A source completed fewer than 5 of 10 checks | No report; the order fails as today; `paid_order_failed` notice; refund within 3 business days unless fixed first | The existing failure email |
| DataForSEO credentials, access, balance or cost-limit problem | `dataforseo_unavailable` notice; new payments refused (R-22) | New customers: "Audit tidak tersedia saat ini." Paid orders: as above |
| Business reading, question writing or report writing fails | Unchanged from today | Unchanged |

Never fabricate. A missing summary, a failed check or a missing number is
shown as missing, never estimated or filled in.

## Evidence, data, privacy, and cost

- **Data sent to DataForSEO:** unbranded seeds, the ten questions and a
  place. No email, order ID or personal data.
- **Expected cost per audit:**

  | Part | Cost (USD) |
  |---|---|
  | Discovery | ≈ 0.07 |
  | ChatGPT app | ≈ 0.04 |
  | Google | ≈ 0.04 |
  | Reading, questions and report (OpenAI, Cheaper Inference) | ≈ 0.10 |
  | **Total** | **≈ 0.25** |

  That is about Rp4.000, against Rp249.000. AC-00 and AC-14 confirm it.
- **Report wording:** the report says ChatGPT answers come from the ChatGPT
  app, asked from Indonesia, and Google answers from Google's results page for
  the stated place, both on the stated date. Each is one sample, and answers
  may change.

## Acceptance criteria

- **AC-00 (gate): the probe.** The founder approved about USD 0.20, with a
  hard stop at USD 0.30. The `probe` stage of
  `experiments/dataforseo-sozo/run.mjs` implements R-04a, R-04, R-05, R-08 and
  R-12 exactly as written, and runs on three real clinics. Their services are
  taken as an intake would hold them, from public listings on 2026-10-24:

  | Clinic | Category | Kota | Brand and alias words | Services (as confirmed) |
  |---|---|---|---|---|
  | MS Glow Aesthetic Clinic (msglowclinic.id) | klinik kecantikan | Bandung | MS Glow, MS Glow Clinic | Laser · Meso · Skin rejuvenation · V shape |
  | CS Dental Aesthetic Clinic (Surabaya) | klinik gigi | Surabaya | CS Dental | Veneer porselen · Behel (orthodonti) · Clear aligner · Implan gigi |
  | NK Health (Jakarta Barat) | klinik fisioterapi | Jakarta | NK Health | Fisioterapi saraf kejepit · Fisioterapi stroke · Cedera olahraga pasca operasi · Nyeri lutut |

  Its committed summary records, per clinic: the phrases from R-04a, usable
  topics, counted real wordings, whether the pool is thin, the Google city
  location found, and the cost. For two questions per clinic (six in total),
  it records the ChatGPT scraper's answer length, language check, sources
  count, item types and call time, and Google's outcome.
  - **Discovery rule (gates PR 1):** at least two of the three clinics are not
    thin under R-08. Otherwise R-04a/R-04 come back for review.
  - **Scraper rule (gates PR 2 and the "ChatGPT" label):** at least 5 of the 6
    scraper calls return answer text in Indonesian (at least 3 of "yang",
    "dan", "di", "untuk", "dengan", "bisa", "ini"), with at least one web
    source, each within 120 seconds. Otherwise R-12's ChatGPT source comes
    back to the founder.
  - If GitHub Actions stays blocked, the founder may run it locally:
    `DATAFORSEO_LOGIN=… DATAFORSEO_PASSWORD=… node experiments/dataforseo-sozo/run.mjs probe`
    and commit `results/probe/SUMMARY.md`.
- **AC-01:** Given a confirmed intake, the review screen shows "Kota untuk
  pencarian", pre-filled per Experience 2 with Indonesian names, and the
  helper text from Experience 2. It cannot be confirmed empty, and the saved
  value is a list entry or "Seluruh Indonesia".
- **AC-02:** Given any order, every ChatGPT observation used 2360. Given the
  search city differs from Indonesia, the header and limit note show "Google:
  <kota> · ChatGPT: Indonesia".
- **AC-03:** Given discovery, no DataForSEO request contains the brand name,
  an alias or the domain (checked on recorded request bodies). A unit test of
  R-04a covers its six steps, including: brand "Kopi Sudut", category "kedai
  kopi": "Kopi Susu Sudut" → "susu kopi" and "Non-kopi (matcha, cokelat)" →
  "non kopi"; brand "CS Dental", category "klinik gigi": "Behel (orthodonti)"
  → "behel gigi" and "Veneer porselen" → "veneer porselen"; brand "MS Glow",
  category "klinik kecantikan": "Laser" → "laser kecantikan".
- **AC-04:** Given a pack, every "Dicari di Google" or "Orang lain juga
  bertanya" question exactly matches a saved pool item of that origin. Every
  "Disusun dari topik" question contains its topic's core words. At least 7
  are provider-choice and at most 2 advice, and no brand appears. Given a
  label or number changed in the browser, approval is rejected.
- **AC-04a:** Given a place-dependent question ("terdekat") and the city
  Surabaya, the question contains "Surabaya". Given "Seluruh Indonesia", no
  place-dependent question is used.
- **AC-05:** Given a simulated discovery failure or a thin pool, the R-08 pack
  is used and labelled, and the report says so once.
- **AC-06:** Given an approved pack, each question has one ChatGPT and one
  Google observation asked with byte-identical text. On the first attempt
  both were asked in the same runner step. Given one source fails and is
  retried, only that source is asked again.
- **AC-07:** Given Google returns an empty element twice, the outcome is "not
  shown", with no summary text displayed.
- **AC-08:** Given the business appears only in link addresses or the sources
  list, the outcome is "dipakai sebagai sumber" and it is not counted as
  named. Given its name appears as visible link text, in a ChatGPT
  local-business card, or its alias appears in the answer text, it is counted
  as named.
- **AC-09:** Given 2 failed Google checks and 1 failed ChatGPT check, the
  report is delivered. The cards use N=9 and M=8, three slots show "Tidak dapat
  diuji" and "Minta bantuan", and one `checks_failed` notice is sent.
- **AC-10:** Given 6 failed ChatGPT checks, no report is generated. The order
  is `failed`, the existing failure email is sent, and one
  `paid_order_failed` notice is sent.
- **AC-11:** Given the report:
  - the counts are per source, with the denominators in R-19, and a
    denominator of 0 shows "Tidak diuji";
  - the D-05 sentences appear word for word with the per-source denominator;
  - the demand line says "seluruh Indonesia" with the data month;
  - no AI-assistant estimate appears;
  - the "Topik yang belum menyebut Anda" rows match the evidence and include
    only questions with at least one completed answer.
- **AC-12:** Given the report data sent to the browser, the JSON export and
  the report-writing prompt input, none contains raw DataForSEO responses or
  third-party phone numbers.
- **AC-13:** Given the daily cap is reached, no DataForSEO call is sent. Given
  credentials, access, balance or cost-limit errors, payment start is refused
  with "Audit tidak tersedia saat ini." and one `dataforseo_unavailable`
  notice is sent per day. Given status 50301, the call is retried; given an
  unknown code, it is not.
- **AC-14 (live, founder-run, USD 2.00 order hold, approved by Yasir):** one
  live order on a real business is delivered with both sources. It records:
  - the total cost;
  - the time from approval to the email (15 minutes or less expected);
  - founder review of report screenshots (layout judgment);
  - the founder's judgment that the questions read as real human questions.
- **AC-15:** Given `runner-worst-case.test.ts`, one question step with both
  sources fits the run budget, and two orders running at the same time each
  take one step per run. Given `spend-worst-case.test.ts`, the per-order worst
  case is USD 2.00 or less.
- **AC-16:** Given synthetic mode, `verify-nuave drive all` passes, including an
  empty summary and a failed check, with no external calls.
- **AC-17:** Given the order preview and checkout, both say "ChatGPT dan
  Google", Rp249.000 and the founder-approved R-23 promise. Midtrans receives
  249000, and no customer page, email or PDF shows Rp99.000. None of this is
  live before the checks are live.
- **AC-18:** Given a report saved before this change, it renders exactly as
  before.
- **AC-19:** Given the customer edits a question, it shows "Diubah oleh Anda"
  and "Topik awal". Its number is shown only if the text still contains the
  topic's core words.

## Open questions

- **Q-1 (founder):** The exact Indonesian wording of the R-23 delivery promise.
  The proposal is in R-23; the founder approves it in PR 2.
- **Q-2 (founder):** When is a report still delivered? Your answer of
  2026-10-24 says a failed check still gets a report. Two cases are not
  covered by it: many checks failing, and one whole source failing (for
  example all ten ChatGPT checks), which would deliver a "ChatGPT dan Google"
  report without ChatGPT. **Recommended (used in R-19 until answered):**
  deliver when each source completed at least 5 of its 10 checks; otherwise
  the order fails as today and you resolve it (refund within 3 business days
  unless fixed first).

Answered on 2026-10-24:

- **The ChatGPT label:** use the real ChatGPT app through DataForSEO, so the
  label is "ChatGPT".
- **Failed checks:** send them to support. The founder resolves them by hand,
  and a refund is given only if they cannot be fixed.
- **No re-run button** in this spec.
- **"Kota untuk pencarian":** added. Clarification (2026-10-24): it sets the
  place for Google; ChatGPT can only be asked as "Indonesia", so the question
  text carries the city where place matters.
- **The probe:** approved.

Answered on 2026-10-23: one package, Rp249.000, the existing report design, and
naming "ChatGPT dan Google".

## Implementation notes

- **Build order.** A merge to `main` deploys, so nothing customer-visible may
  go live before the behaviour it describes.
  1. **PR 1:** the place field, discovery, question choice and fallback. It
     waits for the AC-00 discovery rule and goes synthetic first.
  2. **PR 2:** both checks, the report, the failure handling, the price, the
     promise, "ChatGPT dan Google" and all document updates. It waits for the
     AC-00 scraper rule. PR 2 is stacked on PR 1, and the two merge to `main`
     together.
  3. The live run, AC-14, right after that merge.
- **The probe is blocked.** As of 2026-10-24, GitHub Actions is not starting
  any job on this repository (runner never assigned). AC-00 runs once the
  founder restores Actions, or locally (AC-00).
- **DataForSEO basics:** it uses HTTP Basic auth, with one task per live
  request. The working calls and response shapes are in
  `experiments/dataforseo-sozo/run.mjs`.
- **Before merging this spec's PR (#151), founder action:** the raw JSON in
  `experiments/dataforseo-sozo/results/` holds third-party phone numbers, and
  this repository uses merge commits, so deleting it in a later commit would
  still put it in `main`'s history. Either **squash-merge PR 151** after
  removing the raw JSON and `.github/workflows/dataforseo-test.yml`, or
  rebuild the branch without those commits. Only the summaries and `run.mjs`
  are kept.

## Verification record

Complete after implementation:

- Verification artifact: `specs/018-search-grounded-chatgpt-google-audit/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
