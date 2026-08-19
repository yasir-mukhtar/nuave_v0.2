# 04 — Questions

> Status: Working product plan
> Depends on: [`03-business-facts.md`](./03-business-facts.md)
> Updated: 2026-08-17

## Objective

Prepare ten relevant, context-aware Indonesian questions that resemble what
real prospective customers might ask an AI system about this kind of business,
then let the business owner freely replace or rewrite any question before the
audit begins.

The intended customer reaction is:

> “These sound like questions my customers would actually ask. Nuave has given
> me a useful starting point, and I can still test anything I genuinely want to
> know.”

The question pack is not merely an input to the audit engine. It is the
customer's first concrete view of what they purchased. Generic, translated, or
overly formal questions weaken both the audit evidence and the customer's
perception of Nuave.

## Position in the journey

```text
Verified payment
  → Nuave prepares a business-information draft
  → customer corrects and confirms the facts
  → Nuave prepares ten suggested questions
  → customer reads, replaces, or rewrites any question
  → Nuave explains material coverage changes without blocking ordinary edits
  → customer explicitly starts the audit
  → the exact final questions are locked and run independently
```

Generating or editing questions does not start the audit or consume the paid
order. The order is consumed only when Nuave accepts the customer's explicit
**“Mulai audit sekarang”** action.

## Settled product decisions

1. Nuave recommends ten questions as a useful starting pack; it does not dictate
   what a business owner is allowed to ask.
2. A model writes the primary suggested pack after the business facts have been
   confirmed. Universal sentence templates are not the primary generation
   method.
3. The model receives a fixed coverage brief but must author category- and
   context-specific Indonesian rather than fill slots in translated templates.
4. The suggested pack starts with five questions that do not name the business
   and five that do. This creates a useful default balance between discovery
   and named-business understanding.
5. After generation, customers may freely rewrite or replace any of the ten
   questions, including changing the original purpose or the five/five balance.
6. Nuave uses advice and transparent consequences instead of artificial
   restrictions. It blocks only narrow safety, privacy, scope, and technical
   violations.
7. Questions may investigate facts that are not yet known. Asking whether a
   facility, menu item, policy, or access option exists is not the same as
   asserting that it exists.
8. The exact customer-approved pack is persisted and replayed verbatim for any
   later comparable re-check.
9. The customer-facing interface calls them **pertanyaan**, not prompts,
   unbranded prompts, branded prompts, query classes, or Intent-5 records.
10. The current word **credit** is removed. The customer bought one audit, not
    platform credits.

## Product principle: coverage guide, not universal templates

Nuave still needs an internal method so the first suggestion is not ten random
questions. The existing five purposes remain useful as a coverage guide:

| Internal purpose | Default quantity | What it should reveal |
|---|---:|---|
| Need discovery | 2 | How AI responds to a customer's situation before a business is named |
| Option discovery | 2 | Which relevant businesses, providers, or products AI proposes |
| Comparison | 2 | How AI compares unnamed choices and the audited business with another option |
| Validation | 2 | Whether AI understands important public information about the named business |
| Decision or action | 2 | Whether AI can answer practical questions needed to proceed |

The default allocation is:

- five questions without the audited business name: two need discovery, two
  option discovery, and one comparison; and
- five questions with the audited business name: one comparison, two
  validation, and two decision or action questions.

This matrix tells the question-writing model which customer jobs to cover. It
does **not** prescribe sentence structure.

A coffee-shop customer may naturally ask:

> Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.

A small-business owner looking for accounting help may ask:

> Ada rekomendasi konsultan pajak di Jakarta yang biasa menangani bisnis kecil?

A retailer evaluating software may ask:

> Tools inventory apa yang cocok buat toko dengan tiga cabang?

The vocabulary, formality, amount of context, and shape of the request are
different because the underlying buying situations are different. A single
fill-in-the-blanks sentence pattern cannot represent all three responsibly.

## Generation strategy

### Primary path: one bounded model call

After the customer confirms the Business Facts page, Nuave makes one low-cost
model call to prepare ten suggested questions.

The call:

- does not need web search, Maps grounding, or URL retrieval;
- receives only the confirmed, minimized business brief;
- receives no email, payment information, provider metadata, or sensitive free
  text;
- writes the ten questions in Indonesian;
- returns no predicted answers, visibility result, findings, score, or report
  content; and
- is stored against one order and one confirmed fact version so a refresh does
  not repeat the call.

Gemini Flash-Lite is the first implementation candidate because the paid facts
flow already evaluates Gemini and this stage needs language generation rather
than costly web grounding. GPT-5.6 Luna remains a quality benchmark. Provider
selection is not final until the evaluation in this plan is run.

### Why a model is justified here

The question pack needs judgment that deterministic substitution handles
poorly:

- choosing which need sounds most realistic for the category;
- deciding whether customers say *kedai kopi*, *cafe*, or *coffee shop*;
- using natural mixtures such as *WFC*, *meeting*, or *affordable* when the
  audience genuinely uses them;
- varying sentence length and shape without artificial variation;
- distinguishing local, ecommerce, B2B, software, and professional-service
  buying situations;
- turning a decision criterion into a direct question rather than an abstract
  request for a comparison framework; and
- selecting a useful unknown to investigate without asserting it as fact.

This is product value, not decorative copy generation. A question no plausible
customer would ask produces weak evidence even if its schema is valid.

### Resilient fallback

Question generation must not hard-fail the paid order. Retain a deterministic
Indonesian fallback, but treat it as continuity protection rather than the
ideal customer experience.

Fallback order:

1. Use the first valid model output.
2. If provider-native structured output is missing, attempt a deterministic
   parse of the returned numbered questions without another model call.
3. If ten safe questions cannot be recovered, build the deterministic
   Indonesian fallback from the confirmed facts.
4. Tell the customer only when the fallback materially affects their task:

   > **Kami menyiapkan pertanyaan dasar**
   >
   > Nuave belum dapat menyesuaikan seluruh pertanyaan secara otomatis. Anda
   > tetap dapat mengubah pertanyaan mana pun sebelum audit dimulai.

Do not show provider errors, JSON terminology, retry counts, or internal model
names to the customer. Retain them in operational telemetry.

Do not spend repeated generation calls trying to perfect wording. One primary
call and a local fallback are sufficient for the first version. A single
bounded retry may be introduced later only if evaluation shows that it fixes a
frequent, attributable failure at acceptable cost.

## Confirmed input available to the question writer

The question-writing model receives a normalized projection of the confirmed
Business Facts page:

- exact business name and common public name variants;
- exact branch, city, service area, or market scope;
- ordinary business category;
- up to three selected products or services;
- likely customer context;
- the needs or situations those customers have;
- practical considerations that influence their decision;
- an observable differentiator, when available;
- one comparison business, when credibly established;
- known outdated, conflicting, or frequently incorrect information;
- official public sources only as provenance signals, not as content to copy;
- the practical action a customer can take, when known; and
- the required output language, `id-ID`.

The generation request should identify which fields are sourced, which are
Nuave interpretations confirmed by the customer, and which are supplied by the
customer. That distinction prevents a customer-supplied claim from becoming an
unqualified premise.

The model does not need the logo, full page HTML, raw search results, payment
record, recipient email, or raw provider response.

### Optional customer curiosity

Do not add another required field to Business Facts merely to collect question
ideas. The Questions page itself provides the lighter mechanism:

> **Ada hal lain yang ingin Anda ketahui dari AI?**
>
> Ubah salah satu pertanyaan di bawah. Misalnya fasilitas, menu, harga, cara
> membeli, area layanan, kebijakan, atau informasi lain yang penting bagi
> pelanggan Anda.

This keeps the fact-confirmation step focused while giving an owner with a
specific concern full control at the correct moment.

## Embedded question-writer guidance

The implementor must turn this section into the canonical generation context
and model instruction used by Nuave. It may live in the existing
`generate-ai-visibility-prompts` skill or an equivalent versioned module, but
there must be one authoritative instruction source rather than slightly
different guidance in a skill, API route, and UI component.

### Role

The model acts as an Indonesian prospective-customer question writer. It does
not act as a marketer, SEO specialist, auditor, report writer, or advocate for
the audited business.

Its job is:

> From the confirmed business context, write ten independent questions that
> plausible prospective customers might naturally ask an AI assistant while
> discovering options, comparing choices, checking the named business, or
> deciding what to do next.

### Required writing behaviour

The model must:

1. Understand the buying or decision context before writing.
2. Choose the vocabulary plausible customers in that context would use.
3. Write directly as the customer, not as someone describing a customer.
4. Use natural Indonesian rather than translating an English question form.
5. Preserve familiar borrowed terms when they are natural for the audience,
   such as *cafe*, *meeting*, *WFC*, *software*, or *delivery*.
6. Use a more formal register when the situation genuinely calls for it, such
   as B2B procurement or professional services.
7. Make every question understandable when executed in a fresh, independent AI
   conversation.
8. Include the location or market only when it materially scopes the answer.
9. Prefer concrete requests over abstract meta-questions.
10. Give the ten questions different customer jobs; do not produce superficial
    paraphrases of the same request.
11. Keep the audited business and its identifying clues out of the five
    default discovery questions.
12. Name the audited business clearly in the five default named-business
    questions.
13. Use the comparison business only when it is supplied and credibly scoped.
14. Ask about unknown decision details without presenting them as true.
15. Avoid wording designed to force the audited business to appear.

### Naturalness standard

Natural does not mean maximally slangy. The model should infer an appropriate
register from the category, audience, and task.

Good naturalness can include:

- short keyword-like requests;
- conversational questions;
- ordinary abbreviations;
- a mixture of Indonesian and familiar category terms;
- omitted words that are normally omitted in conversation; and
- direct commands such as *rekomendasikan*, *bandingin*, or *cariin* when they
  fit the context.

The model should not “correct” plausible customer language into corporate
Indonesian. It should also not force Jakarta slang, English words, or casual
spelling into contexts where customers would communicate more formally.

Avoid output that sounds like:

- market research;
- an audit checklist;
- an academic questionnaire;
- a translated English template;
- marketing copy written by the audited business; or
- instructions intended to manipulate an AI ranking.

### Concrete requests over abstract frameworks

For a casual local purchase, this is weak:

> Faktor apa saja yang perlu dipertimbangkan ketika memilih kedai kopi di Dago?

This is more plausible:

> Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.

This is weak:

> Bagaimana cara membandingkan opsi kedai kopi berdasarkan berbagai kriteria?

This is more plausible:

> Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable,
> dan buka sampai malam.

The first versions ask the AI to teach a comparison method. The second versions
ask the AI to help make the decision the customer actually has.

This is a contextual rule, not a universal ban on “what should I consider.” A
buyer choosing accounting software, an industrial supplier, or a professional
service may realistically ask about evaluation criteria. The model must choose
the form that fits the decision.

### Unknown facts: questions are allowed, premises are not

The model may ask:

> Kopi Taman Senja ada parkiran mobilnya nggak?

when parking is unknown. The question investigates a public fact.

The model may not write:

> Apakah parkiran mobil Kopi Taman Senja cukup luas dan aman?

unless the existence of the parking area is already supported. That wording
silently assumes the facility exists and introduces subjective service-quality
claims.

The same distinction applies to:

- opening hours;
- menu and product availability;
- prayer rooms and accessibility facilities;
- delivery or service areas;
- booking and contact methods;
- payment options;
- stock, compatibility, or integrations;
- return, cancellation, or other public policies; and
- directions or access.

The question writer can propose a useful unknown from common category decision
needs, but must phrase it as an open investigation.

### Comparison behaviour

When a confirmed comparison business exists, the default named comparison may
use it:

> Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.

When no credible comparison business exists, generation must not stop and must
not invent one. Use an unnamed alternative:

> Bandingin Kopi Taman Senja dengan coffee shop lain untuk WFC di Dago.

The comparison-business input is therefore optional for generation. This
supersedes the current contract that treats `verified_competitor` as universally
required.

### Safety and integrity boundaries

The generated suggestion must not:

- request or expose private customer, employee, patient, or account data;
- ask for individualized medical, legal, financial, employment, housing,
  insurance, or eligibility advice;
- claim that the business is best, safest, cheapest, most trusted, or otherwise
  superior without evidence;
- assume a price, facility, policy, availability, credential, outcome, rating,
  or service quality that has not been confirmed;
- ask the AI to ensure that the audited business appears;
- request ranking manipulation, fabricated reviews, or false promotion;
- request citations, audit methodology, scoring, or report analysis inside the
  customer-style question; or
- combine several unrelated tasks merely to make one slot appear comprehensive.

For a regulated or high-impact category, the system may use a reviewed
category-specific generation guide. If the current category cannot be handled
safely, stop generation and route the paid order to a truthful recovery path;
do not silently produce a generic pack that may create harmful advice.

## Minimal model-output contract

The model should author question text, not operational metadata that code
already knows.

Code owns:

- the ten slot identifiers and their order;
- the default coverage role for each slot;
- whether the default slot should name the business;
- the confirmed brief and its version;
- generation provider and model provenance;
- validation results;
- customer edit history; and
- final approval and lock state.

The preferred model output is one ordered collection containing exactly ten
question strings. If provider-native structured output is reliable in the
evaluation, use the smallest possible schema:

```json
{
  "questions": [
    "Pertanyaan 1",
    "Pertanyaan 2",
    "Pertanyaan 3",
    "Pertanyaan 4",
    "Pertanyaan 5",
    "Pertanyaan 6",
    "Pertanyaan 7",
    "Pertanyaan 8",
    "Pertanyaan 9",
    "Pertanyaan 10"
  ]
}
```

Do not ask the model to repeat the business brief, generate rationales, invent
input provenance, classify its own output, predict answers, or populate the
report schema. Those requirements increase output fragility without improving
the customer-visible questions.

If native structured output remains unreliable, accept an exact numbered list
with one question per item and parse it deterministically. The evaluation must
choose between these two representations using observed reliability, not
preference.

## Suggested generation instruction

The implementor may refine formatting, but the production instruction must
preserve this substance:

```text
You write questions that plausible Indonesian prospective customers would ask
an AI assistant about one business category and one exact business.

Use the confirmed business context below. Write natural Indonesian appropriate
to the category and audience. Do not translate fixed English sentence
templates. Familiar borrowed words, abbreviations, direct commands, and casual
wording are allowed when real customers in this context would use them. Do not
force slang where a more formal register is natural.

Write exactly ten independent questions in the assigned order:
1–2: customer needs or situations, without the audited business name.
3–4: requests for relevant options, without the audited business name.
5: compare relevant unnamed options, without the audited business name.
6: compare the audited business with the supplied comparison business; if no
credible comparison is supplied, compare it with relevant alternatives without
inventing a name.
7–8: check useful public facts about the audited business.
9–10: help a customer make a decision or take a practical next step involving
the audited business.

Prefer the direct question a customer wants answered over an abstract question
about how to evaluate options. Vary the customer job, not merely the wording.

You may ask whether an unknown public fact is true, but do not write as if that
fact is already true. Use only confirmed facts as premises. Do not favour the
audited business or word a discovery question to reveal it.

Do not include answers, explanations, rationales, citations, scores, findings,
or marketing claims. Return only the ten questions in the required output
format.
```

The confirmed business context and per-slot allowed facts follow this
instruction as structured data, not concatenated prose from raw sources.

## Dedicated customer-screen simulation

The following is customer-visible simulation for the fictional business from
the Business Facts plan. **Kopi Taman Senja**, **Kopi Ruang Pagi**, and their
sources are fictional.

### Preparing state

> **Menyiapkan pertanyaan audit**
>
> Nuave sedang menyusun pertanyaan berdasarkan informasi bisnis yang Anda
> setujui. Audit belum dimulai.

Do not show a fake multi-stage progress animation for one short generation
call. If the call finishes quickly, transition directly to the review page. If
it takes longer, show elapsed time and a recoverable state rather than an
indefinite spinner.

### Review page

> ## Periksa pertanyaan audit
>
> Nuave menyiapkan 10 pertanyaan sebagai titik awal. Anda bebas mengubah
> pertanyaan mana pun sesuai hal yang ingin Anda ketahui dari AI.
>
> **Audit belum dimulai.**
>
> `5 Tanpa menyebut bisnis Anda` · `5 Menyebut bisnis Anda` · `10 pertanyaan`

#### Suggested questions

> **1** · Tanpa menyebut bisnis Anda
>
> Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.
>
> `[Ubah]`

> **2** · Tanpa menyebut bisnis Anda
>
> Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa dipakai
> kerja di mana ya?
>
> `[Ubah]`

> **3** · Tanpa menyebut bisnis Anda
>
> Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?
>
> `[Ubah]`

> **4** · Tanpa menyebut bisnis Anda
>
> Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di
> Bandung?
>
> `[Ubah]`

> **5** · Tanpa menyebut bisnis Anda
>
> Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable,
> dan buka sampai malam.
>
> `[Ubah]`

> **6** · Menyebut bisnis Anda
>
> Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.
>
> `[Ubah]`

> **7** · Menyebut bisnis Anda
>
> Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan
> kopi apa?
>
> `[Ubah]`

> **8** · Menyebut bisnis Anda
>
> Di mana alamat Kopi Taman Senja? Buka jam berapa?
>
> `[Ubah]`

> **9** · Menyebut bisnis Anda
>
> Cariin kontak Kopi Taman Senja.
>
> `[Ubah]`

> **10** · Menyebut bisnis Anda
>
> Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?
>
> `[Ubah]`

> **Ada hal lain yang ingin Anda ketahui dari AI?**
>
> Ubah salah satu pertanyaan di atas. Misalnya fasilitas, menu, harga, cara
> membeli, area layanan, kebijakan, atau informasi lain yang penting bagi
> pelanggan Anda.

Each **Ubah** action converts that card into a plain multiline text field with:

- **Simpan pertanyaan**;
- **Batalkan**; and
- after saving, **Kembalikan saran Nuave**.

Do not place ten large text areas on the page by default. Reading should be the
primary task; editing is available when needed.

## Customer editing and ownership

### What the customer may change

The customer may replace any question with another business-relevant question,
including:

- adding or removing the audited business name;
- changing a discovery question into a factual question;
- replacing a comparison with a facility, menu, route, policy, availability,
  or contact question;
- using their own vocabulary and spelling; and
- changing the original five-with-name/five-without-name balance.

Nuave does not silently rewrite a customer's saved wording for grammar, style,
or methodology.

One paid audit still runs exactly ten independent questions. To test a new
question, the customer replaces one of the ten; the first version does not add
question packages, overage pricing, or extra credits.

### Dynamic classification

After each edit, code recalculates only the customer-useful distinction:

- **Tanpa menyebut bisnis Anda** when the final text contains no audited business name
  or known variant; and
- **Menyebut bisnis Anda** when it does.

The count at the top updates immediately. Internal intent labels may be
retained for the original suggestion, but must not be treated as factual after
the customer substantially replaces its content. Do not add a second model
call merely to classify every edit.

### Advice instead of prohibition

If all or nearly all final questions name the business, show:

> **Hampir semua pertanyaan menyebut nama bisnis Anda**
>
> Nuave tetap dapat menjalankan audit, tetapi hasilnya akan lebih banyak
> menunjukkan bagaimana AI menjelaskan bisnis Anda—bukan apakah bisnis Anda
> muncul ketika calon pelanggan belum mengetahui namanya.
>
> `[Lihat saran Nuave]` `[Tetap gunakan pertanyaan saya]`

If most questions do not name the business, show the inverse:

> **Hanya sedikit pertanyaan yang memeriksa bisnis Anda secara langsung**
>
> Nuave dapat menguji bisnis apa yang muncul, tetapi hanya sedikit informasi
> tentang bisnis Anda yang akan diperiksa.

These are warnings, not blockers. Do not repeatedly show the same warning after
the customer chooses to continue with their pack.

### Narrow hard stops

Block approval only when a question:

- is empty or cannot be executed as a meaningful request;
- exceeds the provider's safe input limit;
- contains private or sensitive personal data;
- requests disallowed individualized high-impact advice;
- is clearly unrelated to the audited business or its customer decision; or
- contains content the chosen provider cannot lawfully or safely process.

Do not block a question merely because it is informal, contains English terms,
changes its original intent, investigates an unknown fact, or alters the 5/5
balance.

## Information and navigation questions

Some customer-authored questions have limitations that should be explained at
the moment they matter without forbidding them.

For changing facts such as hours, prices, menus, stock, or availability:

> Nuave akan menunjukkan jawaban dan sumber yang ditemukan saat audit
> dijalankan. Informasi terbaru tetap perlu diperiksa melalui sumber resmi.

For directions or travel routes:

> Jawaban rute dari AI dapat berubah dan bukan pengganti aplikasi navigasi.

For opinions such as *bagus*, *aman*, or *worth it*, the report must distinguish
what the AI said from verified business facts. Nuave must not turn a generated
opinion into its own claim about the quality of the business's actual service.

## Returning to Business Facts

Before the audit starts, the customer may return to Business Facts.

- If no confirmed fact changes, preserve the generated pack and all edits.
- If a confirmed fact changes, the existing pack is no longer guaranteed to
  match the approved brief.
- Before saving changed facts, explain that Nuave will prepare a fresh question
  pack and existing question edits will be replaced.
- After confirmation, create one new fact version and one new question-pack
  version. Do not merge old edits into new facts automatically.

This full regeneration is deliberately simpler and safer than attempting to
identify and merge only the questions affected by a fact change. It happens
only after explicit warning and before the audit consumes the order.

An ordinary page reload or backward navigation without a fact change never
repeats the model call.

## Final approval and audit start

The page does not use a credit warning.

Persistent action area:

> **10 pertanyaan siap dijalankan**
>
> Setelah audit dimulai, informasi bisnis dan pertanyaan tidak dapat diubah.
>
> `[Kembali ke informasi bisnis]` `[Jalankan audit]`

Selecting **Jalankan audit** opens one confirmation dialog:

> ## Mulai audit sekarang?
>
> Nuave akan menjalankan 10 pertanyaan ini satu per satu. Setelah dimulai,
> informasi bisnis dan pertanyaan tidak dapat diubah.
>
> Jika proses terhenti karena masalah teknis, Nuave akan melanjutkan atau
> mengulang pengujian yang gagal tanpa menggunakan pesanan baru.
>
> `[Kembali periksa]` `[Mulai audit sekarang]`

The second action is the single consumption boundary. It must be server-side,
idempotent, and bound to the exact paid order, fact version, and question-pack
version. Double-clicking, refreshing, or reopening the page cannot start a
second audit.

After Nuave accepts the start:

- lock the exact ten strings;
- preserve their order;
- store whether each final question contains the business name;
- store the original Nuave suggestion separately from the customer-approved
  final text;
- record approval and start timestamps;
- prevent further edits; and
- send each question as an independent observation with no conversational
  history from another question.

## Report and re-check implications

The report must describe the questions the customer actually approved, not the
original suggested matrix.

If customer edits change the composition:

- calculate discovery denominators from the final questions without the
  business name;
- calculate named-business denominators from the final questions with the
  business name;
- never keep displaying `5/5` merely because the suggestions started that way;
- show **“tidak diuji”** when the final pack contains no question for a result
  dimension rather than treating it as zero performance; and
- explain that customer-selected questions affect which parts of the business
  were examined.

The report headline uses the direct overall appearance count, for example
**Bisnis Anda muncul di 4 dari 10 pertanyaan** and **4/10**. Directly beneath
it, preserve the separate **Tanpa menyebut bisnis Anda** and **Menyebut bisnis
Anda** denominators so the overall count is not mistaken for spontaneous
discovery.

Persist the exact locked pack for a re-check. A comparable re-check replays it
verbatim, including the customer's informal wording and any non-default
composition. If the customer wants different questions, that creates a new
baseline rather than a directly comparable repeat.

## State and minimum retained record

For one generated pack retain:

- order reference;
- confirmed business-fact version;
- question-pack version;
- generation status;
- requested and returned provider/model identity;
- generation instruction version;
- generated-at timestamp;
- latency and usage/cost telemetry;
- original ten suggestions in order;
- fallback use and safe internal failure reason;
- final ten customer-approved questions;
- which questions were edited;
- final with-name/without-name classification;
- warnings shown and acknowledged;
- approval timestamp;
- audit-start timestamp; and
- lock/consumption status.

Do not retain hidden model reasoning, unnecessary raw provider metadata, raw
business-source contents, customer email, or payment details inside the
question pack.

## Failure and recovery behaviour

| Situation | Customer experience | System behaviour |
|---|---|---|
| Generation is still running | Show honest short progress and state that the audit has not begun | Reuse the same in-progress job; do not start another call on refresh |
| Model call times out or fails | Show the deterministic Indonesian fallback with a light disclosure and full editing | Record failure telemetry; do not consume the audit |
| Model returns fewer or more than ten questions | Recover ten only when parsing is deterministic; otherwise use the fallback | Do not ask the customer to repair provider formatting |
| Suggested discovery question leaks the business identity | Replace the suggestion with a safe fallback for that slot before display | Record contract failure; never display it as a valid discovery suggestion |
| Suggested question assumes an unsupported fact | Replace that question with a safe fallback or phrase it as an open investigation only through deterministic rules | Do not silently present the assumption |
| Customer refreshes | Restore the same suggestions and edits | No new generation call |
| Customer opens another authorized device | Restore the current server-backed pack | Do not depend only on browser session state |
| Customer changes confirmed facts | Warn that the question pack will be replaced, then regenerate once from the new fact version | Preserve history for auditability; only the newest approved version can run |
| Customer creates an unusual but allowed pack | Explain coverage consequences once and permit approval | Recalculate denominators from the final pack |
| Customer double-clicks start | Show one running audit | Idempotently consume one entitlement and create one run |
| Audit start fails before a run is created | Keep the approved pack locked but recoverable | Reconcile server state; do not consume a second order |

## Provider and prompt-instruction evaluation

Do not select the question writer from vendor descriptions alone. Evaluate the
same five confirmed business briefs from the first supported category and city
with:

1. Gemini Flash-Lite as the implementation candidate;
2. GPT-5.6 Luna as the quality benchmark; and
3. the deterministic Indonesian fallback.

No web search is used in this test. Use the same minimized inputs and the same
generation guidance for both models.

### Review rubric

For every pack record:

- whether all ten questions were returned and parsed;
- correct five-without-name/five-with-name default composition;
- category and location relevance;
- whether each question represents a plausible customer decision;
- naturalness of Indonesian vocabulary, register, and sentence shape;
- whether the questions are meaningfully different rather than paraphrases;
- unsupported premises or invented facts;
- accidental business-name leakage;
- whether useful unknown facts are asked openly rather than assumed;
- comparison relevance and correct fallback without a named comparator;
- number of questions accepted unchanged;
- number needing a light wording edit;
- number needing substantive replacement;
- latency; and
- total provider cost.

### Practical quality gate

A candidate is acceptable for initial implementation only when:

- all five packs can be recovered into ten executable questions without manual
  technical repair;
- no discovery question leaks the audited business or comparison-business
  identity;
- no generated question contains a material unsupported premise or prohibited
  request;
- at least eight of ten questions in at least four of five packs are judged
  relevant and natural without substantive replacement;
- the model materially outperforms the deterministic fallback on naturalness
  and contextual relevance; and
- measured cost and latency fit the paid preparation allowance.

A **light edit** changes spelling or small phrasing while preserving the
question's customer job. A **substantive replacement** changes what the
question is trying to learn.

If neither model clears the gate, do not pretend that universal templates are
good enough for broad launch. Keep the product to the first reviewed vertical,
improve its generation examples and guidance, and rerun the five-business
evaluation.

## Implementation work packages

This plan is not itself an approved implementation specification. Before code
changes, the orchestrator must reconcile it with canonical product and audit
contracts and produce or amend an approved bounded specification.

The eventual implementor should work in this order:

### 1. Canonical contract reconciliation

- Update `docs/PROMPT_GENERATION_CONTEXT.md` so the matrix is a default model
  coverage brief rather than universal sentence templates.
- Make a named comparison business optional with an unnamed fallback.
- Distinguish unknown facts being investigated from unsupported factual
  premises.
- Define free customer editing and dynamic final denominators.
- Update `docs/AUDIT.md` and `docs/PRODUCT.md` where they still imply that the
  default matrix must remain fixed after customer edits.
- Preserve the exact final pack for comparable re-checks.

### 2. One authoritative question-writer instruction

- Revise the existing `generate-ai-visibility-prompts` skill or replace it
  through an explicitly approved migration; do not create two competing skills.
- Make the same versioned instruction available to the runtime generator.
- Keep provider-specific request formatting outside the product guidance.
- Test the instruction independently with the five-business fixture set.

### 3. Generation boundary

- Implement one no-search model call from a minimized confirmed brief.
- Prefer the smallest output schema that passes observed reliability testing.
- Add deterministic parsing and Indonesian fallback.
- Add idempotency, fact-version binding, telemetry, and cost limits.
- Never regenerate on refresh.

### 4. Review and editing interface

- Build the Indonesian review screen and compact question cards.
- Provide full replacement editing, cancel, save, and restore-suggestion
  actions.
- Update name/no-name counts locally.
- Implement advisory coverage warnings and narrow hard stops.
- Preserve state across navigation, refresh, and authorized device recovery.

### 5. Lock and run boundary

- Add the explicit confirmation dialog.
- Bind the locked pack to one paid order and one audit run.
- Make start idempotent and ensure technical retries do not spend another
  order.
- Run every question independently and preserve exact wording.

### 6. Report and re-check alignment

- Derive denominators from the final pack rather than the suggested matrix.
- Mark untested dimensions honestly.
- Persist and replay the final approved pack verbatim for comparable re-checks.

### 7. Verification

- Run unit tests for generation parsing, identity leakage, fallback, fact
  invalidation, classification, warnings, and idempotency.
- Run browser tests for generation, editing, restore suggestion, refresh,
  backward navigation, altered pack composition, approval, and double-clicked
  start.
- Independently review Indonesian question quality; automated contract tests
  cannot establish naturalness.

## Acceptance criteria

The touchpoint is ready for implementation verification when:

1. Question generation starts only from one customer-confirmed business-fact
   version after verified payment.
2. One bounded no-search model call produces the primary ten-question
   suggestion.
3. The model instruction requires context-specific natural Indonesian and does
   not use universal fill-in-the-blanks sentence templates.
4. The default suggestion covers ten distinct customer jobs with five questions
   without the business name and five with it.
5. Unknown public facts may be investigated without being asserted as true.
6. A missing comparison business uses a truthful unnamed alternative and does
   not block generation.
7. Provider or formatting failure yields a usable Indonesian fallback without
   consuming the audit.
8. Reloading or reopening the same fact version does not repeat the generation
   call.
9. All ten suggestions are visible in one readable customer flow without
   exposing internal prompt IDs or model rationales.
10. The customer can freely replace any question and restore the original
    suggestion.
11. Name/no-name counts update from the final text, and composition changes
    produce advisory warnings rather than ordinary hard blocks.
12. Only narrow privacy, safety, business-scope, and technical violations block
    approval.
13. Changing confirmed facts explicitly invalidates and regenerates the pack;
    navigation without changes preserves it.
14. The final confirmation uses **Jalankan audit** and **Mulai audit sekarang**,
    never credits or token-spending language.
15. Audit start is server-side and idempotent and consumes no more than one paid
    order.
16. The exact final questions, order, provenance, edits, and classification are
    persisted before observations begin.
17. Every observation runs independently with the exact locked text.
18. Report denominators reflect the final customer-approved composition and
    never imply spontaneous discovery from a named-business question.
19. A comparable re-check can replay the exact final pack verbatim.
20. The five-business evaluation clears the practical quality gate before the
    generator is approved for customer use.

## Known conflicts requiring reconciliation

This founder-approved direction intentionally changes current repository
behaviour:

- `src/lib/audit/questions.ts` currently authors English questions through
  deterministic sentence templates.
- `src/lib/audit/contracts.ts` currently reports `deterministic-v4-en` and fixes
  the generated pack to `en-US`.
- `docs/PROMPT_GENERATION_CONTEXT.md` and the existing prompt skill treat one
  verified named competitor and the fixed matrix as hard pack requirements.
- Current validation assumes the generated roles and five/five allocation stay
  intact after editing.
- Current report contracts include fixed result dimensions that must become
  honest about dimensions removed by customer edits.

An implementor must not patch around these conflicts only in the UI. Resolve
the contract and report implications through an approved specification first.

## Out of scope

- running any audit observation during question generation or review;
- generating answers, findings, recommendations, scores, or report copy;
- web search during question writing;
- supporting more than ten questions, packages, add-ons, or credits;
- creating templates for every possible industry before the first vertical
  works;
- using private customer records or sensitive personal data;
- an account dashboard or subscription;
- automatically rewriting customer-approved questions after they are saved;
- promising that generated questions represent every real customer; and
- claiming an API observation exactly reproduces a personalized consumer AI
  interface.

## Next smallest product decision

After this plan is accepted and before implementation, define the **Audit Run**
touchpoint: the exact AI surface, execution conditions, progress experience,
failure/retry behaviour, and evidence captured for each of the ten locked
questions.
