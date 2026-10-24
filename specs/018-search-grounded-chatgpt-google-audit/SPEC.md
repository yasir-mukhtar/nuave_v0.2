# Spec 018: Real-search questions, answered by ChatGPT and Google (Rp249.000)

> Status: **In review**. Revision 3 answers the round-1 plan review (FAIL, 7
> blocking) and the founder's answers of 2026-10-24. Not approved; do not build.
> Owner: orchestrator
> Updated: 2026-10-24. Revision 3 changes:
> - the ChatGPT part now uses the real ChatGPT app;
> - a failed check goes to support instead of a re-run;
> - a "Kota untuk pencarian" field is added;
> - discovery and Google counting are defined;
> - the doc updates are listed.
>
> Implements: the new audit the founder chose to sell first (Option A, before
> S5 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md)).
> Decision basis: [2026-10-23: Real-search questions, ChatGPT and Google, Rp249.000](../../docs/DECISION_LOG.md#2026-10-23--real-search-questions-chatgpt-and-google-rp249000),
> including its 2026-10-24 addendum.
> Evidence: [`experiments/dataforseo-sozo/`](../../experiments/dataforseo-sozo/).
> The test on Sozo Skin Clinic ran on 2026-10-23 and cost USD 0.16. The
> three-clinic probe (stage `probe`) is approved but has not run yet (AC-00).

## Required context

Read in order:

1. `AGENTS.md`.
2. `docs/DECISION_LOG.md`: the 2026-10-23 entry and its 2026-10-24 addendum.
3. The experiment results:
   - `experiments/dataforseo-sozo/results/discover/SUMMARY.md`;
   - `experiments/dataforseo-sozo/results/answers/SUMMARY.md`;
   - `results/probe/SUMMARY.md`, once AC-00 has run.

   `run.mjs` shows the working API calls.
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
   - Report pages: `src/app/audit/report/` and `src/app/r/`.
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
  discovery must use a narrower method (R-01), and it must be proven before
  it is built (AC-00).

Interpretation: customers will trust and act on the audit more when each
question is a real one, carries a demand number, and is answered by the real
ChatGPT app and by Google.

## Desired outcome

A paying customer gets one report in which each of ten questions:

1. comes from real Google search data for their business type, with demand
   measured across Indonesia;
2. keeps real human wording, with a label saying where the wording came from;
3. shows how often its topic is searched; and
4. is answered by the **ChatGPT app** and by **Google's AI summary**, with the
   exact same question text, for the place the customer confirmed.

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
- **Discovery:** searching for the confirmed services and place.
- **The ten questions:** chosen from that data, with a fallback when the data
  fails.
- **Asking:** each question goes to the ChatGPT app and to Google AI summary
  through DataForSEO, in the same runner step.
- **The report:** both answers, demand numbers and sources in the web report,
  the PDF and the JSON export.
- **Failed checks:** delivered as "Tidak dapat diperiksa" with "Minta
  bantuan", and the founder fixes them by hand.
- **Price:** Rp249.000 everywhere it is shown or charged, and "ChatGPT dan
  Google" named on the order preview and checkout.
- **Delivery promise:** the text changes to match the support-first rule
  (R-23).
- **Provider operations:** spend guard, secrets, status codes and deployment
  for DataForSEO.
- **Document updates:** listed under "Document updates". They ship in the same
  PRs as the behaviour they describe.

## Non-scope

- **More sources:** Gemini, Perplexity, Google AI Mode or any third answer
  source.
- **Choice and tiers:** tiers, add-ons, or choosing which AI to check.
- **Bigger orders:** more than ten questions, several places, or several
  branches in one order.
- **Positions:** rankings, map-pack or organic positions, monitoring,
  scheduled re-checks, dashboards.
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

## Document updates (ship with the PRs that change the behaviour)

- **`docs/VOICE.md`:**
  - §2 and the `ChatGPT` notes: the report may now call answers "ChatGPT",
    because they come from the ChatGPT app (through DataForSEO). Keep "AI
    buatan OpenAI" only for answers that come from the OpenAI API, such as
    reports saved before this change.
  - §4 and §7.1: Rp99.000 becomes Rp249.000, and "Bayar Rp99.000" becomes
    "Bayar Rp249.000".
  - §7.4: the new report section name, if renamed (see Report layout).
- **`docs/AUDIT.md`:**
  - the scope of one audit: ten questions, two sources;
  - the method: ChatGPT app and Google AI summary through DataForSEO, and
    OpenAI only for the business reading and report writing;
  - replace "ten evaluable observations before delivery" (lines 20 and 196)
    with the gate in R-19.
- **`docs/PRODUCT.md`:** the price (lines 72, 149 and 311) and how results are
  reported (per source, with failed checks shown).
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
   - It is a searchable pick-list of supported Indonesian cities (R-03), plus
     **"Seluruh Indonesia"**.
   - It is pre-filled as follows:
     - branch focus (`cabang`): the city in the branch address, if it matches
       a list entry;
     - brand or product focus with a market reach of `sekitar` or `beberapa`:
       the first confirmed market area that matches a list entry;
     - otherwise, including reach `seluruh` or `luar`: empty, and the customer
       must choose.
   - Helper text: "Kami bertanya ke ChatGPT dan Google seolah-olah dari kota
     ini."
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
   - Under each question with a topic: "Topik: laser flek hitam · ±12.100
     pencarian/bulan di Google, seluruh Indonesia (data <bulan tahun>)".
   - An edited question shows "Topik awal: …". Its number is dropped if the
     edited text no longer contains the topic's core words.
4. **Audit:**
   - It runs on the server as today.
   - One runner step asks one question to both sources (R-15), so ten steps
     and the 15-minute promise stay.
   - The progress screen still counts ten questions.
5. **Report:** see "Report layout".
6. **Failed checks:**
   - The report is delivered whenever the R-19 gate passes.
   - A failed answer slot shows **"Tidak dapat diperiksa"** and **"Minta
     bantuan"**, a mailto link to `support@nuave.ai` that includes the order
     number.
   - The founder gets one notice per order (R-21) and resolves it by hand.
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
| Header | Business name, date | Adds "Diperiksa di ChatGPT dan Google · <tempat yang dipakai> · <tanggal>". The place is what was actually used (R-13). |
| Hasil singkat | One result card with ten beads | **Two cards, stacked:**<br>**"ChatGPT":** disebut di X dari N; direkomendasikan di R dari N.<br>**"Google · Ringkasan AI":** ringkasan AI muncul di Z dari M; Anda disebut di Y dari Z.<br>Beads show only completed checks. A line "K pemeriksaan tidak dapat diperiksa" appears when K > 0. The conclusion and the limit note stay; the limit note adds the place and date. |
| Jawaban model AI → "Jawaban ChatGPT dan Google" | One answer block per question | **One block per question:** the number, the question, the origin label, the topic line, then **two stacked answers** in the existing answer style. Each answer has a source heading ("ChatGPT", "Google · Ringkasan AI"), the existing name highlight and references list, and the outcome text from R-16/R-17. There are no tabs, so the PDF shows everything. |
| Analisis Nuave | Findings; "Bisnis lain yang disebut" | Findings name the source they come from. "Bisnis lain yang disebut" becomes one short list per source, taken from the answer text. |
| Yang dapat dilakukan | Priorities | Same, plus a **code-built** block "Topik yang belum menyebut Anda" (R-18). |
| Tentang audit ini | Method | Adds:<br>- where the questions came from (Google data through DataForSEO, data month, place);<br>- that ChatGPT answers come from the ChatGPT app and Google answers from Google's results page, both through DataForSEO;<br>- that answers vary by time, account and place. |

Reports saved before this change keep rendering exactly as today (R-29).

## Requirements

### Place

- **R-01: Search place.** The confirmed "Kota untuk pencarian" is saved on the
  order with the intake.
  - It sets the Google location and the ChatGPT location (R-03).
  - Discovery volumes are always for all of Indonesia, because DataForSEO Labs
    data is country-level.
- **R-02: No brand in requests.** No request to DataForSEO contains the
  business's name, a confirmed alias or its domain. This covers discovery
  seeds, autocomplete and "People also ask" seeds. The ten questions are also
  brand-free under the existing rule.
- **R-03: Location mapping.**
  - The pick-list comes from a snapshot of DataForSEO's Google SERP locations
    for Indonesia (type City), stored in the repo with its date.
  - Google uses that city's `location_code`.
  - The ChatGPT scraper uses the same city if its own locations list has it.
    Otherwise it uses Indonesia (2360).
  - "Seluruh Indonesia" uses 2360 for both.

### Discovery

- **R-04: Discovery calls.** After intake confirmation, the server collects
  the following (to be confirmed by the AC-00 probe):
  - **Topics:** for each confirmed service, DataForSEO Labs Google `keyword_suggestions`.
    - Use up to 4 services: the first four confirmed. If fewer than 2 are
      confirmed, also use the category.
    - Settings: the service phrase as seed, Indonesia, language `id`,
      `include_seed_keyword: true`, `limit` 20, ordered by search volume.
  - **Autocomplete:** Google autocomplete for "<service> <kota>" for each
    service, with the Google location from R-03.
  - **"People also ask":** Google organic SERP with
    `people_also_ask_click_depth: 1` for two seeds, "<category> terbaik di
    <kota>" and "biaya <first service>". It uses the Google location and
    language `id`.
  - With "Seluruh Indonesia", "<kota>" is left out of the seeds.
- **R-05: Usable topic.** A keyword counts as a usable topic when:
  - it contains every core word of its service phrase (words other than the
    category word, such as "klinik" or "gigi", unless the phrase is that word
    alone);
  - its monthly search volume is at least 10; and
  - it contains no brand, alias or domain from R-02.

  Its data month is the latest month in its `monthly_searches`.
- **R-06: Topic and number for real wordings.** An autocomplete or "People
  also ask" text gets a topic as follows:
  - It takes the longest usable topic contained in the text.
  - If none is contained, it takes its seed service and that service's own
    volume.
  - If the seed has no volume, the text has no number and still keeps its
    label.
- **R-07: Server-owned pool.**
  - The pool is saved on the order, like the prepared reading. It records each
    item's origin, exact text, topic, volume, data month and the place used.
  - Labels, topics and numbers are re-checked against the saved pool when the
    customer approves. The browser never supplies them.
  - When the questions are rewritten, the saved pool is reused.
  - If the customer changes services or place, discovery runs again, at most
    once more per order. After that, the latest pool is reused.
- **R-08: Fallback.** If discovery fails or the pool is thin, Cheaper
  Inference writes ten questions from the business facts, as today.
  - Thin means fewer than 6 usable topics *and* fewer than 5 real wordings
    across autocomplete and "People also ask".
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
  - give each confirmed service with usable topics at least two questions,
    then fill the rest by highest demand;
  - are mostly "choosing a provider" questions (which, where, how much, best,
    nearest). At most two may be "how to" questions, meaning they contain
    "cara", "bagaimana", "gimana" or "tips";
  - reuse a pool text word for word whenever one fits. Otherwise they phrase a
    short, everyday question that contains the topic's core words; and
  - contain no business name, under the existing rule.
- **R-11: Validator.** These checks are added to `validateDirectTenQuestions`,
  which already rejects competitor names, false premises, private data and
  high-impact advice.
  - A question labelled "Dicari di Google" or "Orang lain juga bertanya" must
    match a saved pool text exactly. Case and spaces are normalised, and the
    origin must match too.
  - A question labelled "Disusun dari topik yang dicari" must contain its
    topic's core words.
  - At most two "how to" questions are allowed.

  A failing pack is retried once; then R-08 applies.

### Asking ChatGPT and Google

- **R-12: Sources.** Both sources are asked through DataForSEO. Details are to
  be confirmed by AC-00.
  - **ChatGPT:** the ChatGPT LLM Scraper, live advanced.
    - Request: `keyword` = the question, `location_code` from R-03,
      `language_code` `id`, `force_web_search: true`.
    - Saved: the answer markdown, `sources`, `brand_entities`, `model`,
      `datetime` and the location used.
  - **Google:** Google Organic SERP, live advanced.
    - Request: device mobile, `load_async_ai_overview: true`, language `id`,
      location from R-03.
    - Saved: the AI-summary element's text and its references.
  - The OpenAI Responses API is no longer an observation source. It is still
    used for the business reading and report writing.
- **R-13: Same text, recorded place.** Both sources receive byte-identical
  question text. Each observation records the text sent, the location code,
  the location name used and the time. The report shows that location name,
  and shows "Indonesia" when 2360 was used.
- **R-14: Retries per source.**
  - Each source has up to 3 attempts per question, with today's back-off.
  - Retry on DataForSEO status 40202, 40209, 50000 and 50401, on timeouts, and
    on network errors.
  - Do not retry 40100, 40200 or 40210 (credentials or balance). These raise
    the founder notice in R-21.
  - A source that uses up its attempts is "failed" for that question only.
- **R-15: One step per question.**
  - One runner step asks both sources for one question, in parallel.
  - `RUN_COST.question` and `OBSERVATION_STEP_MS` are raised to cover two
    calls, and `runner-worst-case.test.ts` covers them.
  - Ten questions stay ten steps, so delivery stays within the promise.

### Outcomes and counting

- **R-16: "Named" is decided by code.** The business is named when its name or
  a confirmed alias appears in the answer text.
  - It is checked case-insensitively, at word boundaries, against the brand
    name and any aliases confirmed in intake.
  - The answer text excludes link URLs and the sources list.
  - A name that appears only in links or sources is stored as "dipakai sebagai
    sumber" and is not counted as named.
  - Code decides this when the observation is saved. The report-writing model
    receives it as a fact and cannot change it.
- **R-17: Outcomes per source.**
  - **ChatGPT:** "answered" or "failed". "Recommended" keeps today's
    assessment rules. It is shown only for ChatGPT.
  - **Google:**
    - **"summary with text":** the AI-summary element has text;
    - **"empty element":** present but without text; it is retried once inside
      R-14's attempts and, if still empty, counted as not shown;
    - **"not shown":** no AI-summary element; a completed result, shown as
      "Google tidak menampilkan ringkasan AI";
    - **"failed":** R-14 attempts used up.

    Google has no "recommended" count.
- **R-18: "Topik yang belum menyebut Anda".** Code builds this block from the
  evidence, with no model-written text. It lists up to 5 questions where the
  business was not named in any completed answer, ordered by demand. Each row
  shows the topic, its number and up to 3 domains that the answers cited.

### Report gate and failures

- **R-19: Report gate.** This replaces the ten-evaluable rule for Spec 018
  orders.
  - The report is generated when every question has a final outcome for both
    sources, and at least 10 of the 20 checks completed.
  - If fewer than 10 completed, no report is generated. The customer gets an
    email directing them to "Minta bantuan", and the founder gets a notice.
  - Denominators:
    - ChatGPT counts use N = completed ChatGPT answers;
    - Google "muncul" uses M = completed Google checks, and "disebut" uses Z =
      summaries with text;
    - failed checks are counted separately.

  This amends Spec 012's ten-of-ten assumption for Spec 018 reports only.
- **R-20: Failed slot.** A failed check shows "Tidak dapat diperiksa" and
  "Minta bantuan". There is no button to re-run it.
- **R-21: Founder notices.** There are two new notice kinds, following Spec
  017 R-21:
  - `checks_failed`: once per delivered order with at least one failed check.
    It names the order number and the failed checks.
  - `dataforseo_unavailable`: credentials or balance errors, at most once a
    day.

  The founder resolves orders by hand. A refund is given only when support
  cannot fix the order.
- **R-22: Taking orders needs DataForSEO.**
  - Payment start (Spec 017 R-05) refuses a new payment when DataForSEO is
    unavailable. The check reads `/v3/appendix/user_data`, which is free,
    cached for 10 minutes.
  - It refuses when the credentials are missing or rejected, or the balance is
    below USD 2.00.
  - The customer sees the existing "audit belum tersedia" message.
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
    words (AC-17).
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
  - The worst case per order:
    - discovery: 2 runs × USD 0.12;
    - checks: 10 questions × 2 sources × 3 attempts × USD 0.006;
    - plus today's reading, questions and report.

    It must stay at or under USD 2.00 in `runner-worst-case.test.ts`. If not,
    stop and ask the founder.
- **R-26: Secrets.** `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` are Worker
  secrets, deployed by `ci.yml` like the others.
- **R-27: Synthetic mode.** It provides labelled synthetic discovery, ChatGPT
  answers and Google answers, including one empty summary and one failed check
  per run. This lets the journey and `verify-nuave` run with no spending.

### Evidence, export and old reports

- **R-28: Privacy.**
  - Raw DataForSEO responses stay in restricted server evidence under the
    existing retention policy. They contain third-party data, such as
    businesses' phone numbers.
  - Raw responses never go into the customer JSON export or the report-writing
    prompt. The prompt receives only:
    - the question, its label and topic;
    - each answer's text;
    - the cited domains;
    - the named and source facts (R-16) and the outcomes (R-17).
  - The export includes the questions, labels, topics, numbers, data month,
    place, answer texts, cited URLs and outcomes.
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
| A check fails after its attempts | The slot shows "failed"; the report is delivered if R-19 passes; `checks_failed` notice | "Tidak dapat diperiksa" and "Minta bantuan" |
| Fewer than 10 of 20 checks completed | No report; `checks_failed` notice | An email directing them to "Minta bantuan" (support@nuave.ai) |
| DataForSEO credentials or balance problem | `dataforseo_unavailable` notice; new payments refused (R-22) | New customers: "audit belum tersedia". Paid orders: as above |
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
  app and Google answers from Google's results page, both for the stated place
  and date. Each is one sample, and answers may change.

## Acceptance criteria

- **AC-00 (gate before PR 2): the probe.** The founder approved about USD 0.20,
  with a hard stop at USD 0.30. The `probe` stage of
  `experiments/dataforseo-sozo/run.mjs` runs on three clinics: dental in
  Surabaya, beauty in Bandung and physiotherapy in Medan. Its summary is
  committed. It records, per clinic:
  - the usable topics (R-05);
  - the autocomplete and "People also ask" counts;
  - city support for the SERP and the scraper;
  - Indonesian language support for the scraper;
  - scraper and Google outcomes on two real questions;
  - the cost.

  PR 2 starts only if at least two of the three clinics would pass R-08 (not
  thin). Otherwise R-04 comes back for review.
- **AC-01:** Given a confirmed intake, the review screen shows "Kota untuk
  pencarian", pre-filled per Experience 2. It cannot be confirmed empty, and
  the saved value is a list entry or "Seluruh Indonesia".
- **AC-02:** Given a city the scraper list lacks, the ChatGPT checks use 2360,
  and that answer block shows "Indonesia", not the city.
- **AC-03:** Given discovery, no DataForSEO request contains the brand name,
  an alias or the domain (checked on recorded request bodies).
- **AC-04:** Given a pack, every "Dicari di Google" or "Orang lain juga
  bertanya" question exactly matches a saved pool item of that origin. Every
  "Disusun dari topik" question contains its topic's core words. At most two
  are "how to", and no brand appears.
- **AC-05:** Given a simulated discovery failure or a thin pool, the R-08 pack
  is used and labelled, and the report says so once.
- **AC-06:** Given an approved pack, each question has one ChatGPT and one
  Google observation. Both were asked with byte-identical text in the same
  runner step, and the place used is recorded.
- **AC-07:** Given Google returns an empty element twice, the outcome is "not
  shown", with no summary text displayed.
- **AC-08:** Given the business appears only as a link or source, the outcome
  is "dipakai sebagai sumber" and it is not counted as named. Given its alias
  appears in the answer text, it is counted as named.
- **AC-09:** Given 2 failed Google checks and 1 failed ChatGPT check, the
  report is delivered. The cards use N=9 and M=8, three slots show "Tidak dapat
  diperiksa" and "Minta bantuan", and one `checks_failed` notice is sent.
- **AC-10:** Given 11 failed checks, no report is generated. The customer
  email directs them to support, and the founder is notified.
- **AC-11:** Given the report:
  - the counts are per source, with the denominators in R-19;
  - the demand line says "seluruh Indonesia" with the data month;
  - no AI-assistant estimate appears;
  - the "Topik yang belum menyebut Anda" rows match the evidence.
- **AC-12:** Given the JSON export and the report-writing prompt input, neither
  contains raw DataForSEO responses or third-party phone numbers.
- **AC-13:** Given the daily cap is reached, no DataForSEO call is sent. Given
  credentials or balance are bad, payment start is refused and one
  `dataforseo_unavailable` notice is sent per day.
- **AC-14 (live, founder-run, USD 2.00 order hold, approved by Yasir):** one
  live order on a real business is delivered with both sources. It records:
  - the total cost;
  - the time from approval to the email (15 minutes or less expected);
  - founder review of report screenshots (layout judgment);
  - the founder's judgment that the questions read as real human questions.
- **AC-15:** Given `runner-worst-case.test.ts`, one question step with both
  sources and all retries fits the run budget, and the per-order worst case is
  USD 2.00 or less.
- **AC-16:** Given synthetic mode, `verify-nuave drive all` passes, including an
  empty summary and a failed check, with no external calls.
- **AC-17:** Given the order preview and checkout, both say "ChatGPT dan
  Google", Rp249.000 and the founder-approved R-23 promise. Midtrans receives
  249000, and no customer page, email or PDF shows Rp99.000.
- **AC-18:** Given a report saved before this change, it renders exactly as
  before.
- **AC-19:** Given the customer edits a question, it shows "Diubah oleh Anda"
  and "Topik awal". Its number is shown only if the text still contains the
  topic's core words.

## Open questions

- **Q-1 (founder):** The exact Indonesian wording of the R-23 delivery promise.
  The proposal is in R-23, and the founder approves it in PR 1.

Answered on 2026-10-24:

- **The ChatGPT label:** use the real ChatGPT app through DataForSEO, so the
  label is "ChatGPT".
- **Failed checks:** send them to support. The founder resolves them by hand,
  and a refund is given only if they cannot be fixed.
- **No re-run button** in this spec.
- **"Kota untuk pencarian":** added.
- **The probe:** approved.

Answered on 2026-10-23: one package, Rp249.000, the existing report design, and
naming "ChatGPT dan Google".

## Implementation notes

- **Build order, each a separate PR:**
  1. Price, promise, "ChatGPT dan Google" wording and the document updates.
  2. The place field, discovery, question choice and fallback. This waits for
     AC-00 and goes synthetic first.
  3. Both checks, the report and the failure handling.
  4. The live run, AC-14.
- **The probe is blocked.** As of 2026-10-24, GitHub Actions is not starting
  any job on this repository (runner never assigned). AC-00 runs once the
  founder restores Actions.
- **DataForSEO basics:** it uses HTTP Basic auth, with one task per live
  request. The working calls and response shapes are in
  `experiments/dataforseo-sozo/run.mjs`.
- **Before merging this spec's PR:** the raw JSON in
  `experiments/dataforseo-sozo/results/` (it holds third-party phone numbers)
  and `.github/workflows/dataforseo-test.yml` are removed. Only the summaries
  and `run.mjs` are kept.

## Verification record

Complete after implementation:

- Verification artifact: `specs/018-search-grounded-chatgpt-google-audit/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
