# Spec 018: Real-search questions, answered by ChatGPT and Google (Rp249.000)

> Status: **Approved** by Yasir on 2026-10-24 (revision 7; revision 8 change approved the same day), after plan review
> round 4 PASS+NOTES (notes applied in revision 6). Q-2..Q-5 answered as
> recommended; Q-1 stays open until PR 2. Building may start once the Q-5
> probe re-run passes (AC-00).
> Owner: orchestrator
> Updated: 2026-10-24. Revision 8 (founder-approved change): DataForSEO's
> "navigational" intent no longer drops a text (R-05b, AC-04b).
>
> Revision 7 records the founder's approval and answers
> (Q-2..Q-5), production on Workers Paid, and the customer name "ChatGPT dan
> Google AI Overview" (Google's AI summary is called "Google AI Overview"
> everywhere customers see it).
>
> Revision 6 applies the round-4 notes: other-place
> matching is longest-name-first and never hits the customer's own place, with
> an explicit Jakarta rule (R-10a); the new checks apply to every pack,
> including the fallback and customer edits (R-11a); the probe's provider-choice
> and "dr."/"drg." checks match the spec, and the one-letter-word step is gone
> (R-04a, AC-00); repeated place names show regency and province.
>
> Revision 5 changes:
> - every provider-choice question names the search place, and no question
>   names another place (R-10a), because ChatGPT treats a question with no
>   city as Jakarta;
> - the place list covers Jakarta and matches whole names, leaving the field
>   empty when a name is ambiguous (R-03);
> - texts that name another business, and off-topic texts, are dropped by
>   rules code can run (R-05a, R-05b), with ACs;
> - the probe ran (AC-00: both rules PASS, USD 0.244); its quality findings
>   are now rules, and Google's AI-summary coverage (3 of 6) is recorded, with
>   Q-3 for the founder;
> - Workers Free limits (Q-4), the DataForSEO top-up before AC-14, one
>   business day for support, the brand-token rule and the document list are
>   fixed; Q-5 asks to re-run the probe on these rules.
>
> Revision 4 changed: ChatGPT asked from "Indonesia" only; the R-04a phrase
> rule and the probe on three real clinics; price and promise ship with the
> checks.
>
> Implements: the new audit the founder chose to sell first (Option A, before
> S5 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md)).
> Decision basis: [2026-10-23: Real-search questions, ChatGPT and Google, Rp249.000](../../docs/DECISION_LOG.md#2026-10-23--real-search-questions-chatgpt-and-google-rp249000),
> including its 2026-10-24 addendum and clarification.
> Evidence: [`experiments/dataforseo-sozo/`](../../experiments/dataforseo-sozo/).
> The test on Sozo Skin Clinic ran on 2026-10-23 and cost USD 0.16. The
> three-clinic probe (stage `probe`) ran on 2026-10-24 (Actions run
> 40053640709 on `028d55f`) and cost USD 0.244: above the "about USD 0.20"
> estimate, inside the USD 0.30 hard stop.

## Required context

Read in order:

1. `AGENTS.md`.
2. `docs/DECISION_LOG.md`: the 2026-10-23 entry, its 2026-10-24 addendum and
   clarification, and D-05 of 2026-09-22 (the settled report labels).
3. The experiment results:
   - `experiments/dataforseo-sozo/results/discover/SUMMARY.md`;
   - `experiments/dataforseo-sozo/results/answers/SUMMARY.md`;
   - `experiments/dataforseo-sozo/results/probe/SUMMARY.md` (AC-00, run on
     revision 4's rules; read the topic and wording lists, not only the PASS
     lines).

   `run.mjs` shows the working API calls. Its `probe` stage now implements
   revision 5's rules (R-03, R-04a, R-04, R-05, R-05a, R-05b, R-08, R-10a,
   R-12); the committed summary predates them.
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
- **Google often shows no AI summary for local, provider-choice
  questions.** In the probe, Google showed a summary with text for 3 of the 6
  test questions: 2 of 2 in Bandung, 1 of 2 in Surabaya, 0 of 2 for the
  Jakarta clinic (asked as "Indonesia" because the place list had no
  Jakarta). The Sozo test had 4 of 5, on national questions. So a report will
  often say "Google tidak menampilkan AI Overview" for a question; that is a
  finding in itself (Q-3).
- **The probe passed its rules but showed quality gaps** (revision 4's rules):
  - ChatGPT, asked from Indonesia, answered "v shape klinik" (for a Bandung
    clinic) with "Rekomendasi klinik V-Shape di Jakarta". When a question
    named the city, ChatGPT kept to it.
  - Pools held off-topic texts ("v shape bra", "v shape belt", "obat nyeri
    lutut", "icd 10 nyeri lutut"), duplicates, texts naming other places
    ("… bekasi", "… surabaya" for a Jakarta clinic) and a text naming another
    business ("wonder dental spesialis implan gigi surabaya").
  - Most city-specific wordings ("behel gigi surabaya harga") have no Google
    volume of their own; they carry their topic's national number or none.
  - "Jakarta" was not found in the place list.
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
   city for it. The report shows both places when they differ. Every
   question about choosing a provider names the place in its own text, so
   both sources answer for the same place (R-10a).

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
  - §7.4: the renamed answers section (see Report layout), and the new
    strings: "Google menampilkan AI Overview di Z dari M pertanyaan",
    "Bisnis Anda muncul di W dari Z pertanyaan", "Google tidak menampilkan
    AI Overview", "Google tidak menampilkan AI Overview untuk X dari M
    pertanyaan ini.", "K pemeriksaan tidak dapat diuji", "Tidak diuji",
    "Tidak ada data jumlah pencarian", "dipakai sebagai sumber", and the
    helper text in Experience 2.
- **`docs/AUDIT.md`:**
  - the scope of one audit: ten questions, two sources;
  - the method: ChatGPT app and Google AI summary through DataForSEO, and
    OpenAI only for the business reading and report writing;
  - replace "ten evaluable observations before delivery" (lines 20, 196 and
    418) and "counts out of ten" (lines 226–230, 353–356 and 419–420) with
    the gate and per-source denominators in R-19.
- **`docs/PRODUCT.md`:** the price (lines 72, 149 and 311); how results are
  reported (per source, with failed checks shown); lines 81–84 and 205–207
  (results only after 10/10; counts out of ten) replaced by R-19; line 183
  (question review: the origin labels and topic line).
- **`docs/PAYING_CUSTOMER_PLAN.md`:** G1 and the §5 price lines say Rp249.000.
- **`specs/012`, `016` and `017`:** add a "Changed by Spec 018" note where this
  spec amends them:
  - Spec 012's ten-of-ten denominators;
  - Spec 016's failure path and report gate;
  - Spec 017's delivery promise, refund wording and payment-start checks.

## Experience

1. **Order and payment:** unchanged, except:
   - every price shows **Rp249.000**;
   - the order preview and checkout say the audit checks "ChatGPT dan Google AI Overview";
   - the delivery promise uses the R-23 text;
   - Midtrans charges 249,000.
2. **Intake review screen:** one new field, **"Kota untuk pencarian"**:
   - It is a searchable pick-list of supported Indonesian cities shown with
     their Indonesian names (R-03), plus **"Seluruh Indonesia"**.
   - It is pre-filled only when **exactly one** list entry matches (R-03):
     - branch focus (`cabang`): the city in the branch address;
     - brand or product focus with a market reach of `sekitar` or `beberapa`:
       the first confirmed market area that matches (for example "Jakarta
       Selatan" matches the "Jakarta Selatan" entry, and "Jakarta" or "DKI
       Jakarta" matches "Jakarta");
     - otherwise, including reach `seluruh` or `luar`, or when more than one
       entry matches (for example "Depok"): empty, and the customer must
       choose. Names that repeat are shown with their regency or city and
       province taken from the stored list's parent entries, for example
       "Depok (Kota Depok, Jawa Barat)"; the "Cisarua" entries likewise.
   - Helper text (true for both sources): "Google kami tanya seolah-olah dari
     kota ini. ChatGPT hanya bisa diatur per negara, jadi ChatGPT ditanya dari
     Indonesia. Karena itu, pertanyaan tentang memilih tempat akan menyebut
     kota ini."
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
     (data <bulan tahun>)". The number belongs to the topic, not to the exact
     wording. Other questions show "Tidak ada data jumlah pencarian" (R-06).
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
| Header | Business name, date | Adds "Diperiksa di ChatGPT dan Google AI Overview · <tanggal>" and the places actually used (R-13): one place when both are the same, otherwise "Google: <kota> · ChatGPT: Indonesia". |
| Hasil singkat | One result card with ten beads | **Two cards, stacked**, each keeping the D-05 sentences with its own denominator:<br>**"ChatGPT":** "Bisnis Anda muncul di X dari N pertanyaan"; "Bisnis Anda direkomendasikan di Y dari N pertanyaan".<br>**"Google AI Overview":** "Google menampilkan AI Overview di Z dari M pertanyaan"; "Bisnis Anda muncul di W dari Z pertanyaan". Google has no "direkomendasikan" line.<br>A count whose denominator is 0 shows "Tidak diuji", never "0 dari 0". Beads show only completed checks. A line "K pemeriksaan tidak dapat diuji" appears when K > 0. The conclusion and the limit note stay; the limit note adds the places and date. |
| Jawaban model AI → "Jawaban ChatGPT dan Google AI Overview" | One answer block per question | **One block per question:** the number, the question, the origin label, the topic line, then **two stacked answers** in the existing answer style. Each answer has a source heading ("ChatGPT", "Google AI Overview"), the place used, the existing name highlight and references list, and the outcome text from R-16/R-17. There are no tabs, so the PDF shows everything. |
| Analisis Nuave | Findings; "Bisnis lain yang disebut" | Findings name the source they come from. "Bisnis lain yang disebut" becomes one short list per source, taken from the answer text. When Google showed no AI summary for some completed checks, a **code-built** finding says so: "Google tidak menampilkan AI Overview untuk X dari M pertanyaan ini." (the Q-3 default). |
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
    for Indonesia, stored in the repo with its date (the list read on
    2026-10-24 is dated 2026-09-01). It holds the entries of type City, plus
    Jakarta's "City Region". Each entry maps the DataForSEO name (English,
    with region, for example "Surabaya,East Java,Indonesia") to an Indonesian
    display name ("Surabaya") and its province.
  - **Jakarta.** The DataForSEO list has Jakarta as a province ("Jakarta,
    Indonesia", 20440), a "City Region" ("Jakarta,Jakarta,Indonesia",
    1007716) and five cities with English names ("South Jakarta", "East
    Jakarta", "Central Jakarta", "North Jakarta", "West Jakarta"). The
    pick-list shows them as "Jakarta" (1007716) and "Jakarta Selatan",
    "Jakarta Timur", "Jakarta Pusat", "Jakarta Utara", "Jakarta Barat" (the
    matching city codes from the snapshot). "DKI Jakarta" is an alias of
    "Jakarta". Other English names in the snapshot get an Indonesian display
    name in the same file.
  - **Matching for pre-fill:** case-insensitive and on whole names, after
    removing only a leading "Kota", "Kabupaten" or "Kab." and extra spaces.
    Compass words are part of the name and are never removed, so "Tangerang
    Selatan" and "Tangerang" stay different places. Exact display names and
    aliases match first. If more than one entry matches (for example the
    three "Depok" entries), nothing is pre-filled and the customer picks.
    Names that repeat are shown with their province.
  - Google uses the entry's `location_code`. "Seluruh Indonesia" uses 2360.
  - The ChatGPT scraper always uses Indonesia (2360). Its locations list has
    countries only (215 entries, checked 2026-10-24).
  - Seeds and question text use the Indonesian display name.

### Discovery

- **R-04a: Search phrase from a service.** Code turns each confirmed service
  into one search phrase:
  1. lowercase it;
  2. remove text in brackets, digits, units (ml, cc, g, gr, kg, unit, sesi,
     x) and punctuation (a hyphen becomes a space). One-letter words such as
     the "v" in "V shape" stay;
  3. remove the business's **brand tokens** (R-02) and the filler words
     "layanan", "paket", "promo", "dan", "untuk", "di", "treatment",
     "perawatan". Brand tokens are the
     words of the business name, confirmed aliases and domain label **minus
     generic words**. Generic words are the category's words plus a small
     founder-editable list kept in code (starting with: klinik, clinic, skin,
     beauty, aesthetic, aesthetics, estetika, dental, dentist, gigi,
     kecantikan, care, center, centre, health, medika, medical, fisioterapi,
     physio, physiotherapy). So for aliases "Sozo Skin Clinic" and "Sozo
     Beauty Clinic" the brand token is "sozo", and "Skin Booster" stays "skin
     booster";
  4. keep the first 4 remaining words;
  5. if exactly 1 word remains, it is generic: append the category's subject
     word, which is the last word of the category after removing "klinik"
     (for example "laser" in a "klinik gigi" becomes "laser gigi", and "meso"
     in a "klinik kecantikan" becomes "meso kecantikan"); if the category has
     no word left after removing "klinik", or the subject word is already in
     the phrase, the phrase is used as is;
  6. if nothing remains, the service is skipped.

  Known limitation: the phrase keeps the customer's own words. A service typed
  as "Botox treatment" gives "botox treatment", so a common search like
  "harga botox" may not be found for it (seen on Sozo's real intake). "treatment"
  and "perawatan" are added to the filler words in step 3, which turns that
  example into "botox"; other wordings are checked in the Q-5 probe re-run.

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
    `people_also_ask_click_depth: 1` and `load_async_ai_overview: false` for
    two seeds, "<category> terbaik di <kota>" and "biaya <first phrase>",
    with the Google location and language `id`.
  - **Business names seen:** from those two SERP results, code keeps only the
    titles of local-pack entries and the site names of organic results, for
    R-05b. Phone numbers and other fields are not kept.
  - With "Seluruh Indonesia", " di <kota>" (including "di") and "<kota>" are
    left out of the seeds, so the first seed is "<category> terbaik".
- **R-05: Usable topic.** A keyword counts as a usable topic when:
  - it contains every core word of its phrase, as whole words;
  - it is relevant under R-05a;
  - it names no other business under R-05b;
  - it names no place other than the search place under R-10a;
  - its monthly search volume is at least 10; and
  - it contains no brand token, alias or domain from R-02.

  Topics are de-duplicated on their normalised text (lowercase, single
  spaces), so a seed returned twice counts once. Its data month is the latest
  month in its `monthly_searches`.
- **R-05a: Relevance.** A pool text (topic or real wording) is relevant when
  it contains the core words of a phrase (whole words) **and** either:
  - it is the phrase itself, or the phrase plus the search place; or
  - it contains a context word: a word of the category, the category's
    subject word, "klinik", "dokter", "drg", "dr", "treatment", "perawatan",
    "terapi", "tindakan", "pasang", "pemasangan", "harga", "biaya", "tarif",
    "murah", "terbaik", "rekomendasi", "terdekat", or the search place's name;

  **and** it contains no out-of-domain word. The out-of-domain list is a
  small founder-editable list in code, matched as whole words, starting with:
  bra, belt, sabuk, celana, baju, kaos, sepatu, obat, salep, apotek, apotik,
  icd, sikat, pasta, jual, beli, shopee, tokopedia, lazada, diy, sendiri,
  alami, rumahan, tanpa. (So "v shape bra", "obat nyeri lutut", "icd 10 nyeri
  lutut" and "cara merapikan gigi tanpa behel" are dropped, and "harga behel
  gigi surabaya" is kept.)
- **R-05b: No other business named.** A pool text is dropped when:
  - it contains the **distinctive words** of a business name seen during
    discovery (R-04), as consecutive whole words. Distinctive words are the
    name's words minus generic words (R-04a), place names (R-03 list) and the
    phrase's words; a name with no distinctive word left is ignored. (So the
    local-pack name "Wonder Dental" gives "wonder", and "wonder dental
    spesialis implan gigi surabaya" is dropped.) Or
  - it contains "dr." or "drg." followed by a name.

  The seen names are saved with the pool (names only) and used again by the
  validator (R-11).

  DataForSEO's "navigational" search intent is **not** a reason to drop a
  text (founder, 2026-10-24): the probe re-run showed it marks ordinary local
  searches such as "klinik kecantikan laser terdekat" as navigational, which
  left the Bandung clinic with 3 real wordings. The intent may be saved for
  information only.
- **R-06: Topic and number for real wordings.** An autocomplete or "People
  also ask" text gets the longest usable topic whose core words it contains,
  and that topic's number. If it contains no topic's core words, it has no
  topic and no number, and the question shows "Tidak ada data jumlah
  pencarian"; it may still be used only if it is relevant (R-05a). The probe
  showed this is common for city-specific wordings: Google publishes no
  volume for "behel gigi surabaya harga", so the number shown is the topic's,
  across Indonesia, or none. Numbers can also look small when the phrase is
  not the most common wording (for example "laser kecantikan" rather than
  "laser wajah"); the report never adjusts them.
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
  Inference writes ten questions from the business facts, as today, but they
  must pass R-10, R-10a and R-11 like any pack (R-11a).
  - A **real wording** counts toward the pool only if it is brand-free (R-02),
    relevant (R-05a), names no other business (R-05b), names no place other
    than the search place (R-10a), is at most 120 characters, and is not a
    duplicate (normalised text).
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
  - include at least 7 **provider-choice** questions. Matching is on whole
    words after lowercasing and splitting on anything that is not a letter.
    A question is provider-choice when it contains:
    - one of the words "rekomendasi", "terbaik", "terdekat", "bagus",
      "dimana", "tempat", "klinik", "harga", "biaya", "tarif", "murah"; or
    - one of the word pairs "di mana", "mana yang", "yang mana"; or
    - "berapa" directly followed by "harga", "biaya" or "tarif".

    Bare "mana" (so "bagaimana" never matches) and bare "berapa" (so "berapa
    lama…" and "berapa kali…" never match) do not count;
  - include at most 2 **advice** questions, meaning not provider-choice
    (for example "cara…", "bolehkah…", "berapa lama…", "setelah facial tidak
    boleh apa?");
  - reuse a pool text word for word whenever one fits. Otherwise they phrase a
    short, everyday question that contains the topic's core words;
  - follow the place rule R-10a;
  - skip any pool text that names a business, clinic, doctor or product
    brand (the instruction to Cheaper Inference; R-05b and R-11 enforce it);
    and
  - contain no business name, under the existing rule.
- **R-10a: Place in the question text.**
  - With a search place chosen, **every provider-choice question names it**
    as whole words: its display name, or "Jakarta" for one of the five
    Jakarta parts. Advice questions need not name it.
  - A provider-choice pool text that does not name the place may be used only
    reworded with the place added. It is then labelled "Disusun dari topik
    yang dicari", never "Dicari di Google" or "Orang lain juga bertanya".
  - **No question, and no counted pool text, names any other place** from
    the R-03 list. Matching:
    1. find place names as consecutive whole words, **longest name first**;
       words already matched are not matched again (so "Tangerang Selatan"
       is one match, never also "Tangerang");
    2. a match equal to the search place is the customer's own place and
       never counts as another place. Because of step 1, the words of the
       customer's own place are used up by that match, so "Tangerang" inside
       "Tangerang Selatan" or "Padang" inside "Padang Panjang" is never seen
       on its own; a standalone "Tangerang" in a Tangerang Selatan question
       is another place;
    3. **Jakarta rule:** for a customer in one Jakarta part (for example
       "Jakarta Barat"), "Jakarta" alone is allowed and the other four parts
       count as other places; for a customer whose place is "Jakarta", all
       five parts are allowed;
    4. place names that are also ordinary words are skipped, from a small
       founder-editable list in code starting with "batu", "medan", "palu"
       and "padang" (the search place itself is always checked).
  - With "Seluruh Indonesia", no question names any place, and questions
    with "terdekat", "dekat sini", "di sekitar" or "near me" are not used.
- **R-11: Validator.** These checks are added to `validateDirectTenQuestions`,
  which already rejects competitor names, false premises, private data and
  high-impact advice.
  - A question labelled "Dicari di Google" or "Orang lain juga bertanya" must
    match a saved pool text exactly. Case and spaces are normalised, and the
    origin must match too.
  - A question labelled "Disusun dari topik yang dicari" must contain its
    topic's core words.
  - At least 7 provider-choice and at most 2 advice questions (R-10 word
    lists, whole words).
  - The place rule R-10a: every provider-choice question names the search
    place, and no question names another place.
  - No question contains the distinctive words of a business name seen
    during discovery (R-05b), the customer's brand tokens, or "dr."/"drg."
    followed by a name.
  - A question carries a number only if it contains its topic's core words.

  A failing pack is retried once; then R-08 applies.
- **R-11a: Where the checks run.** The same validator runs everywhere it runs
  today, so every new check applies at each point:
  - **generated packs** (`prepareGlmQuestionsForIntake`, `glm-local.ts`);
  - **the fallback pack (R-08):** it also follows R-10 and R-10a, including
    the place rule and the 7/2 split, so the fallback instruction tells
    Cheaper Inference to name the search place in provider-choice
    questions. If it still fails after the existing retry, the order takes
    the existing `validation_failed` path: the questions screen shows its
    current error and its existing "try again" limit, and nothing new is
    invented;
  - **customer edits** (`SmartQuestionsScreen.tsx`): an edit must keep the
    place rule and the 7/2 split. A failing edit shows, under that question:
    "Sebutkan kota <kota> di pertanyaan ini." (place missing), "Pertanyaan
    ini menyebut kota lain. Gunakan <kota>." (other place), or "Minimal 7
    pertanyaan harus tentang memilih tempat." (split broken);
  - **approval** (`api/orders/approve/route.ts`) and the **report pipeline**
    (`report-pipeline.ts`): rejected as today when a check fails.

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
    run. Production runs on **Workers Paid** (founder, 2026-10-24). `RUN_UNIT_LIMIT`
    stays 40 unless the builder shows a reason to raise it, and `runner-worst-case.test.ts`
    shows that two orders' question steps (two paid calls each, with their
    ledger writes) fit in it (AC-15). If they do not fit, raise `RUN_UNIT_LIMIT` within Workers Paid limits
    and update the test.
  - **Discovery runs in its own request,** separate from question writing:
    ten paid calls with two ledger writes each, about 30 subrequests, plus
    the pool save. It must stay under 50 subrequests and within the Worker
    CPU budget (small limits, R-09).
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
      result, shown as "Google tidak menampilkan AI Overview";
    - **"failed":** R-14 attempts used up.

    Google has no "recommended" count.
- **R-18: "Topik yang belum menyebut Anda".** Code builds this block from the
  evidence, with no model-written text. It lists up to 5 questions that have
  at least one completed **answer with text** (a ChatGPT answer, or a Google
  summary with text; a Google "not shown" result has no answer) and where the
  business was not named in any of those answers, ordered by demand. Each row shows the topic, its number
  (if any) and up to 3 domains that the answers cited.

### Report gate and failures

- **R-19: Report gate** (founder-approved 2026-10-24, Q-2). It
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
  founder replies to the support email within one business day (S0 D4, and
  the failure email's "1 hari kerja"). The founder may
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
  - The order preview and checkout say "ChatGPT dan Google AI Overview".
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

- **AC-00 (gate): the probe. Ran 2026-10-24 on revision 4's rules: discovery
  rule PASS (3 of 3 clinics not thin), scraper rule PASS (6 of 6; 15–35 s per
  call; Indonesian; 2–9 sources); cost USD 0.244.** **Re-run 2026-10-24 on
  revision 6/7's rules (Q-5): discovery rule PASS (3 of 3 not thin; counted
  real wordings 3 / 20 / 9), scraper rule PASS (6 of 6; 25–70 s per call;
  Indonesian; 4–10 sources); Google AI Overview with text for 4 of 6; cost
  USD 0.244.** Its lists showed the
  quality gaps now handled by R-03, R-05a, R-05b and R-10a. The founder
  approved about USD 0.20, with a hard stop at USD 0.30. The `probe` stage of
  `experiments/dataforseo-sozo/run.mjs` implements, as revision 6 writes them,
  R-03 (place lookup and the Jakarta entries), R-04a, R-04, R-05, R-05a,
  R-05b, R-08, R-10 (provider-choice detection), R-10a (place matching) and
  R-12, and runs on three real clinics. Their services are
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
  - **Before PR 1 (Q-5):** re-run the probe with revision 5's rules (the
    updated `probe` stage; about USD 0.25, within a USD 0.30 hard stop),
    after the founder approves the spend and tops up the balance. It also
    saves the extracted pool (texts, volumes, intents and the business names
    seen; no phone numbers, no raw responses), so the rules can be checked
    offline afterwards. A reader checks the lists for off-topic texts, other
    places and other businesses. The same two pass rules apply.
  - The founder may also run it locally:
    `DATAFORSEO_LOGIN=… DATAFORSEO_PASSWORD=… node experiments/dataforseo-sozo/run.mjs probe`
    and commit `results/probe/`.
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
  kopi": "Kopi Susu Sudut" → "kopi susu", "Non-kopi (matcha, cokelat)" →
  "non kopi" and "Biji kopi kemasan 200g" → "biji kopi kemasan"; brand "CS
  Dental", category "klinik gigi": "Behel (orthodonti)" → "behel gigi" and
  "Veneer porselen" → "veneer porselen"; brand "MS Glow", category "klinik
  kecantikan": "Laser" → "laser kecantikan"; aliases "Sozo Skin Clinic" and
  "Sozo Beauty Clinic", category "klinik kecantikan": "Skin Booster" → "skin
  booster".
- **AC-04:** Given a pack, every "Dicari di Google" or "Orang lain juga
  bertanya" question exactly matches a saved pool item of that origin. Every
  "Disusun dari topik" question contains its topic's core words. At least 7
  are provider-choice and at most 2 advice, and no brand appears. Given a
  label or number changed in the browser, approval is rejected.
- **AC-04a:** Given the place Surabaya, every provider-choice question
  contains "Surabaya", and a pool text without it is used only reworded and
  labelled "Disusun dari topik yang dicari". Given the place "Jakarta Barat",
  "fisioterapi saraf kejepit bekasi" and "… surabaya" are not counted and
  cannot pass validation. Given "Seluruh Indonesia", no question names a
  place and no "terdekat"-type question is used. Given "Bagaimana cara
  memilih klinik?", the pair rule does not match "mana"; given "Berapa lama
  efek laser wajah terlihat?", it is an advice question. Given the place
  "Tangerang Selatan", "klinik gigi terbaik di tangerang selatan" passes and
  "klinik gigi terbaik di tangerang" is rejected as another place. Given the
  place "Jakarta Barat", "fisioterapi stroke jakarta" passes and "…jakarta
  selatan" is rejected. Given the place "Padang Panjang", a question naming
  "Padang Panjang" passes. Given "fisioterapi stroke jakarta barat" with no
  provider-choice word, it is an advice question (naming a place alone does
  not make a question provider-choice). Given a customer edit that drops the
  place, the R-11a message shows and approval is blocked.
- **AC-04b:** Given a pool with "wonder dental spesialis implan gigi
  surabaya" and a seen local-pack name "Wonder Dental", the text is not
  counted, and a question containing "wonder" is rejected by the validator.
  Given "klinik kecantikan laser terdekat" marked navigational and naming
  no seen business, it stays usable. Given "v
  shape bra", "obat nyeri lutut" or "icd 10 nyeri lutut", none is counted.
  Given the same topic returned twice, it counts once.
- **AC-04c:** Given the market area "Jakarta Selatan", the field is pre-filled
  "Jakarta Selatan" and Google uses that part's code; given "DKI Jakarta",
  "Jakarta" (1007716); given "Depok", nothing is pre-filled and the choices
  show regency and province; "Tangerang Selatan" never pre-fills
  "Tangerang".
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
    only questions with at least one completed answer with text;
  - when Z < M, the code-built Google finding appears with the right counts.
- **AC-12:** Given the report data sent to the browser, the JSON export and
  the report-writing prompt input, none contains raw DataForSEO responses or
  third-party phone numbers.
- **AC-13:** Given the daily cap is reached, no DataForSEO call is sent. Given
  credentials, access, balance or cost-limit errors, payment start is refused
  with "Audit tidak tersedia saat ini." and one `dataforseo_unavailable`
  notice is sent per day. Given status 50301, the call is retried; given an
  unknown code, it is not.
- **AC-14 (live, founder-run, USD 2.00 order hold, approved by Yasir):**
  before it, the founder tops up the DataForSEO balance above USD 2.00, which
  R-22 requires for any payment to start (a spending decision; the balance
  was USD 0.59 after the probe). One live order on a real business is
  delivered with both sources. It records:
  - the total cost;
  - the time from approval to the email (15 minutes or less expected);
  - founder review of report screenshots (layout judgment);
  - the founder's judgment that the questions read as real human questions.
- **AC-15:** Given `runner-worst-case.test.ts`, one question step with both
  sources fits the run budget, and two orders running at the same time each
  take one step per run, with `RUN_UNIT_LIMIT` 40 (or the raised value under R-15). Given the discovery request's worst case, it stays
  under 50 subrequests. Given `spend-worst-case.test.ts`, the per-order worst
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
Answered on 2026-10-24 (approval):

- **Q-2:** deliver when each source completed at least 5 of its 10 checks;
  otherwise the order fails as today and the founder resolves it (R-19).
- **Q-3:** (a), accept that Google often shows no AI Overview and report how
  often it did as a finding.
- **Q-4:** production is already on Workers Paid.
- **Q-5:** re-run the probe on the current rules before PR 1 (about USD 0.25,
  hard stop USD 0.30; the USD 0.59 balance covers it).
- **Name:** customers see "ChatGPT dan Google AI Overview"; Google's AI
  summary is called "Google AI Overview".

Answered earlier on 2026-10-24:

- **The ChatGPT label:** use the real ChatGPT app through DataForSEO, so the
  label is "ChatGPT".
- **Failed checks:** send them to support. The founder resolves them by hand,
  and a refund is given only if they cannot be fixed.
- **No re-run button** in this spec.
- **"Kota untuk pencarian":** added. Clarification (2026-10-24): it sets the
  place for Google; ChatGPT can only be asked as "Indonesia", so every
  provider-choice question names the place (R-10a).
- **The probe:** approved, and run (AC-00).

Answered on 2026-10-23: one package, Rp249.000, the existing report design, and
naming "ChatGPT dan Google AI Overview".

## Implementation notes

- **Free testing first.** Development and automated tests use the DataForSEO
  sandbox (`sandbox.dataforseo.com`, free, same request and response layout,
  fixed sample data) or recorded fixtures. Paid calls are only for the AC-00
  probe and the AC-14 live order. The sandbox cannot judge question or answer
  quality, because it returns the same sample for every request.

- **Build order.** A merge to `main` deploys, so nothing customer-visible may
  go live before the behaviour it describes.
  1. **PR 1:** the place field, discovery, question choice and fallback. It
     waits for the AC-00 discovery rule and goes synthetic first.
  2. **PR 2:** both checks, the report, the failure handling, the price, the
     promise, "ChatGPT dan Google AI Overview" and all document updates. It waits for the
     AC-00 scraper rule. PR 2 is stacked on PR 1, and the two merge to `main`
     together.
  3. The live run, AC-14, right after that merge.
- **Actions.** GitHub Actions stopped starting jobs on 2026-10-23 because the
  account's included minutes ran out. The founder made the repository public
  on 2026-10-24, and jobs run again.
- **DataForSEO basics:** it uses HTTP Basic auth, with one task per live
  request. The working calls and response shapes are in
  `experiments/dataforseo-sozo/run.mjs`.
- **Before merging this spec's PR (#151), founder action:** the raw JSON in
  `experiments/dataforseo-sozo/results/` holds third-party phone numbers, and
  this repository uses merge commits, so deleting it in a later commit would
  still put it in `main`'s history. The repository is now public, so the
  branch history is visible too. Either **rebuild the branch without those
  commits** (which also removes them from the public branch) or squash-merge
  PR 151 after removing the raw JSON and
  `.github/workflows/dataforseo-test.yml`. Only the summaries and `run.mjs`
  are kept.

## Verification record

Complete after implementation:

- Verification artifact: `specs/018-search-grounded-chatgpt-google-audit/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
