/** Spec 009 direct-ten writer instruction (approved 2026-09-18).
 *
 * DIRECT_TEN_SOURCE_BODY is the exact recovered founder-accepted prompt body
 * (docs/references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md, between
 * the BEGIN/END markers; SHA-256
 * 652cfeda5cb6b11fa08d33f80325854738fdaacd8f0f59b3533ae0ad0cf71d0a).
 * It is stored verbatim — the runtime adaptations live in
 * glmDirectTenWriterInstruction() so the exact diff stays code-visible.
 * Do not paraphrase the source text. */

export const DIRECT_TEN_SOURCE_BODY = `# Task: Generate natural consumer questions with genuine business-recommendation opportunity

You are helping design consumer questions for a brand visibility audit.

The purpose is **not** to generate every plausible question someone could ask about a business category.

Instead, generate questions that sit in a narrower and more commercially meaningful space:

> **Natural questions a real consumer might ask when they are open to choosing a business, provider, store, product, or brand.**

A good question should create a genuine opportunity for an AI assistant to mention one or more specific businesses, providers, stores, products, or brands in its answer.

---

## Core distinction

Consider these two questions:

**A.**
> AC saya sudah tidak dingin. Apakah harus isi freon?

This is natural, but it has weak business relevance. An AI can answer it completely by explaining AC troubleshooting without mentioning any service provider.

**B.**
> Ada rekomendasi tukang AC di Depok yang kerjanya rapi dan harganya nggak ngaco?

This is also natural, but now the consumer is trying to **choose a provider**. A useful answer naturally creates room for specific businesses to be mentioned.

We are looking for questions closer to **B**.

---

# Fundamental principle

Generate questions about:

> **choosing, finding, buying, hiring, visiting, or obtaining something**

rather than merely:

> **understanding the problem that thing solves.**

The underlying unit is a **consumer decision situation**, not merely a topic.

For example:

Topic:
> AC tidak dingin

This may produce informational questions.

Consumer decision situation:
> Someone in Depok needs AC service, wants a competent technician, and is worried about unnecessary upselling.

This can naturally produce:

> Tukang AC di Depok yang jujur dan harganya masuk akal ada rekomendasi?

---

# The strongest acceptance test

For every candidate question, ask:

> **Could an AI give a completely satisfactory answer without mentioning any business, provider, store, product, or brand?**

If the answer is **yes**, the question is probably too informational and should be rejected or rewritten.

If naming relevant entities would materially improve the answer, the question is suitable.

---

# What makes a strong question

A useful general structure is:

**CHOICE JOB + CATEGORY + CONTEXT + 1–2 DECISION CRITERIA**

Not every question needs all four explicitly, and you should not mechanically follow a template.

### 1. Choice job

The consumer is trying to make a decision.

Possible underlying jobs include:

- find a provider
- ask for recommendations
- find where to buy something
- choose between available options
- find something suitable for a particular situation
- reduce purchase risk
- find a specialist
- find a convenient option
- find better value
- find a business with a particular capability

The surface wording should vary naturally.

Examples of Indonesian expressions include:

- cariin...
- ada rekomendasi...?
- yang bagus di ... apa ya?
- di mana beli...?
- enaknya pakai apa?
- ada yang recommended?
- toko ... yang lengkap di mana?
- kalau mau ... mending ke mana?
- ada ... yang bisa ...?
- biasanya orang pakai apa?

Do **not** force these exact phrases.

---

### 2. Category

The question should concern something that real businesses compete to provide, such as:

- restaurants
- cafes
- laundry
- AC repair
- beauty clinics
- furniture stores
- software
- laptops
- skincare
- catering
- hotels
- courses
- accounting services
- logistics
- contractors
- products
- professional services

---

### 3. Context

Add context when it naturally affects the decision.

Examples:

- location
- customer type
- use case
- occasion
- urgency
- household/business situation
- accessibility
- online/offline preference

Examples:

> di Depok  
> buat kerja beberapa jam  
> untuk acara kantor  
> buat anak  
> untuk UMKM  
> yang dekat stasiun

Do not add context merely to make a question longer.

---

### 4. Decision criteria

Use criteria real customers might use to distinguish between businesses.

Examples:

- reasonable price
- quality
- trustworthiness
- convenience
- speed
- expertise
- completeness of selection
- ambience
- accessibility
- delivery
- warranty
- responsiveness
- suitability for a particular use case

Use only **1–3 meaningful criteria**.

Prefer everyday consumer language.

Better:

> kerjanya rapi  
> nggak terlalu mahal  
> pilihannya lengkap  
> bisa antar jemput  
> nggak terlalu rame

Worse:

> memberikan layanan profesional berkualitas tinggi dengan customer experience yang optimal

---

# Important: recommendation intent does not have to be explicit

Do not make every question say:

> “Rekomendasikan...”

Recommendation intent can be implicit.

For example:

> Kafe enak buat kerja di Depok yang nggak terlalu rame apa ya?

> Toko HP paling lengkap di Depok biasanya di mana?

> Kalau mau laundry yang bisa pickup dari rumah, enaknya pakai apa?

These naturally invite entity recommendations even without explicitly asking for them.

---

# Important: do not overfit to the target business

You will receive information about a sample brand.

Use it to understand:

- its market/category
- what customers are trying to accomplish
- likely buying situations
- common decision dimensions

Do **not** simply convert the brand's claims, features, or USP into a question.

For example, suppose a laundry says:

> Pickup 24 hours, finished in 6 hours, eco-friendly detergent, free delivery, Rp7,000/kg.

Bad generated question:

> Laundry di Depok yang pickup 24 jam, selesai 6 jam, pakai deterjen eco-friendly, gratis antar, dan harganya Rp7.000/kg ada nggak?

This is effectively a fingerprint of the target brand.

Instead, abstract those facts into broader customer decision dimensions:

- pickup convenience
- turnaround speed
- cleanliness
- reliability
- reasonable pricing

Then generate a plausible consumer situation, for example:

> Laundry di Depok yang bisa pickup dan pengerjaannya cepat ada yang bagus?

The target business should have an opportunity to qualify, but the question should also be fair to competitors.

---

# Keep the competitive field open

A strong audit question should allow multiple legitimate businesses or products to compete for recommendation.

Reject questions that are so specific that they effectively identify only the target brand.

The objective is not:

> “Write a question designed so this brand wins.”

The objective is:

> “Write a natural decision question where this business reasonably could be considered.”

---

# Useful underlying intent patterns

Use a diverse mix rather than repeating one template.

Possible patterns include:

### Direct discovery
> Cariin tukang AC di Depok yang bagus tapi nggak mahal.

### Open recommendation
> Ada rekomendasi laundry di Depok yang bisa antar jemput?

### Where-to-buy
> Di mana beli laptop baru yang harganya biasanya lebih murah?

### Which one / shortlist
> Toko HP yang paling lengkap di Depok apa ya?

### Fit for a situation
> Kafe di Depok yang enak buat kerja beberapa jam tapi nggak terlalu ramai apa ya?

### Problem → provider
> Butuh servis laptop yang bisa cek dulu sebelum ganti part. Di Depok ada yang bagus?

### Trust / risk reduction
> Ada jasa renovasi rumah yang reputasinya bagus dan nggak suka tiba-tiba nambah biaya?

### Convenience
> Laundry sekitar Beji yang bisa pickup-delivery ada yang recommended?

### Specialist capability
> Dokter hewan di Depok yang biasa menangani kucing senior ada rekomendasi?

### Product choice
> Sepatu lari yang nyaman buat pemula dan nggak terlalu mahal apa ya?

These are patterns, **not templates to copy mechanically**.

---

# Naturalness rules

The questions should sound like things Indonesians could genuinely type or say to ChatGPT.

Use Indonesian naturally.

Common English words are allowed when Indonesians normally use them, such as:

- recommended
- pickup
- delivery
- budget
- laptop
- cafe
- service
- online

Avoid deliberately injecting slang merely to appear natural.

Natural language may be:

- formal
- neutral
- conversational
- slightly colloquial

depending on the situation.

Avoid making all questions share the same tone.

---

# Reject or downrank

Avoid questions that are primarily:

- definitions
- explanations
- tutorials
- troubleshooting
- educational questions
- generic industry questions
- factual questions
- “why” questions

when a useful answer does not require recommending an entity.

Examples to reject:

> Kenapa AC saya tidak dingin?

> Apa perbedaan dry clean dan laundry biasa?

> Berapa lama biasanya servis laptop?

> Apa manfaat facial?

These can be perfectly answered without mentioning businesses.

They may be realistic consumer questions, but they are not the target of this exercise.

---

# Evaluation dimensions

Before returning each question, evaluate it internally against four dimensions:

### 1. Naturalness
Would a real Indonesian plausibly ask this?

### 2. Entity demand
Would naming specific businesses, providers, products, stores, or brands materially improve the answer?

### 3. Commercial relevance
Is the consumer making a choice that businesses actually compete over?

### 4. Openness
Can multiple legitimate businesses potentially qualify?

A strong question should perform well on all four.

Do not show numerical scores unless requested.

---

# Your task

I will give you information about a sample brand.

First infer:

1. the actual market/category it competes in;
2. typical consumer decision situations around that category;
3. broad buying criteria that customers might genuinely care about;
4. which criteria come from general market logic versus unusually specific claims of the target brand.

Then generate **12 candidate consumer questions**.

Requirements:

- All questions must create meaningful opportunity for specific entities to be recommended.
- Do not mention the target brand by name unless I explicitly ask for branded questions.
- Keep the competitive field reasonably open.
- Use a diverse mix of decision situations and question structures.
- Do not mechanically repeat “rekomendasi” or “cariin”.
- Do not simply paraphrase the brand's website.
- Do not force every available business attribute into the questions.
- Prefer one clear consumer decision per question.
- Questions should differ in substance, not merely wording.
- Optimize simultaneously for naturalness and business relevance.

---

# Output format

## 1. Market interpretation

Briefly state:

- Category:
- Likely customer decision situations:
- Common decision dimensions:
- Target-brand facts that should **not** be copied too literally:

Keep this section concise.

## 2. Candidate questions

For each question, provide:

**1. [question]**  
Intent pattern: [short label]

Do this for all 12.

## 3. Self-critique

At the end, identify:

- the 3 strongest questions for testing AI business visibility;
- any questions you think are borderline;
- any assumptions you had to make because the brand information was incomplete.

Be critical of your own output rather than defending it.

---

# Sample brand

[PASTE SAMPLE BRAND INFORMATION HERE]`;

/* ── Runtime adaptation diff (Spec 009 R-01, approved 2026-09-18) ──
 * The ONLY changes applied to the recovered body at assembly time:
 *
 * 1. twelve→ten: "Then generate **12 candidate consumer questions**." becomes
 *    "Then generate **10 consumer questions**." — ten is the audit workload;
 *    "candidate" is dropped because there is no selection pool.
 * 2. Necessary section-format guidance: the "## 2. Candidate questions"
 *    sample block is replaced by the concrete numbered-line contract the
 *    strict extractor reads (numbered lines 1–10, optional "Intent pattern:"
 *    label line, no other text). Section names and order are unchanged.
 * 3. Business-placeholder substitution: "[PASTE SAMPLE BRAND INFORMATION
 *    HERE]" is replaced by the serialized minimized brief at request build.
 * 4. Founder amendments appended at the end (DIRECT_TEN_AMENDMENTS): the
 *    2026-09-16 no-quota amendment and the 2026-09-18 all-unnamed direct-ten
 *    delivery terms. Both are addenda; no source sentence is edited for them.
 *
 * No matrix roles, per-slot permissions, named exceptions, forced intent
 * mixes, or evaluator prompt are appended. */

const COUNT_ADAPTATION: readonly [string, string] = [
  "Then generate **12 candidate consumer questions**.",
  "Then generate **10 consumer questions**.",
];

const SECTION_FORMAT_SOURCE = `## 2. Candidate questions

For each question, provide:

**1. [question]**  
Intent pattern: [short label]

Do this for all 12.`;

const SECTION_FORMAT_ADAPTED = `## 2. Candidate questions

Write exactly ten questions, each on its own numbered line:

1. [question]
Intent pattern: [short label]
2. [question]
Intent pattern: [short label]

…through:

10. [question]
Intent pattern: [short label]

Each numbered line is one Indonesian consumer question or direct request. An "Intent pattern:" label may appear on the line after its question. No other text may appear in this section. Only the ten numbered lines in this section become the product's questions.`;

export const DIRECT_TEN_SAMPLE_BRAND_PLACEHOLDER =
  "[PASTE SAMPLE BRAND INFORMATION HERE]";

export const DIRECT_TEN_AMENDMENTS = `Founder amendments (take precedence over conflicting guidance above):

- 2026-09-16, no-quota amendment: Natural, relevant questions may address the same underlying need. There is no minimum number of distinct needs or consumer decisions. Do not invent needs, occasions, features, or comparison criteria to make the questions different. Still provide the requested ten questions and avoid exact duplicate questions. Preserve naturalness, a real opportunity to recommend relevant competing entities, and honesty about unknown business facts.

- 2026-09-18, approved delivery: all ten questions are unnamed audit questions. Do not name the audited business, its aliases, or any supplied competitor name in any question — the confirmed business information below identifies the business to you only so the questions can leave it a fair opening.`;

/**
 * Assemble the adapted instruction. Every expected source substring must be
 * present before substitution — if the recovered body ever drifts, this
 * throws rather than silently producing a different instruction.
 */
export function glmDirectTenWriterInstruction(): string {
  for (const source of [COUNT_ADAPTATION[0], SECTION_FORMAT_SOURCE]) {
    if (!DIRECT_TEN_SOURCE_BODY.includes(source)) {
      throw new Error(
        "direct-ten source body drifted — expected adaptation anchor missing",
      );
    }
  }
  const adapted = DIRECT_TEN_SOURCE_BODY.replace(
    COUNT_ADAPTATION[0],
    COUNT_ADAPTATION[1],
  ).replace(SECTION_FORMAT_SOURCE, SECTION_FORMAT_ADAPTED);
  return `${adapted}\n\n---\n\n${DIRECT_TEN_AMENDMENTS}`;
}
