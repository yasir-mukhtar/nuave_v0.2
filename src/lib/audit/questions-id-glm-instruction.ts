/** Dormant GLM prototype instruction text (revision-3 draft, adapted winning
 * prompt 2026-09-07 + founder amendment 2026-09-16). The ten slot lines are
 * NOT stored here — they are rendered from AUDIT_MEASUREMENT_MATRIX by
 * glmQuestionWriterInstructionV3() so the slot contract stays code-owned.
 * Everything else is verbatim adapted text; do not paraphrase. */

export const GLM_INSTRUCTION_HEAD = `# Task: Generate natural consumer questions with genuine business-recommendation opportunity

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

# The strongest acceptance test — unnamed questions (slots 1–6)

For every unnamed candidate question, ask:

> **Could an AI give a completely satisfactory answer without mentioning any business, provider, store, product, or brand?**

If the answer is **yes**, the question is probably too informational and should be rejected or rewritten.

If naming relevant entities would materially improve the answer, the question is suitable.

This test governs the unnamed slots (1–6). The named slots (7–10) have fixed measurement purposes of their own and are not subject to it.

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

# Important: do not overfit to the audited business

You will receive confirmed information about one audited business.

Use it to understand:

- its market/category
- what customers are trying to accomplish
- likely buying situations
- common decision dimensions

Do **not** simply convert the business's claims, features, or USP into a question.

For example, suppose a laundry says:

> Pickup 24 hours, finished in 6 hours, eco-friendly detergent, free delivery, Rp7,000/kg.

Bad generated question:

> Laundry di Depok yang pickup 24 jam, selesai 6 jam, pakai deterjen eco-friendly, gratis antar, dan harganya Rp7.000/kg ada nggak?

This is effectively a fingerprint of the audited business.

Instead, abstract those facts into broader customer decision dimensions:

- pickup convenience
- turnaround speed
- cleanliness
- reliability
- reasonable pricing

Then generate a plausible consumer situation, for example:

> Laundry di Depok yang bisa pickup dan pengerjaannya cepat ada yang bagus?

The audited business should have an opportunity to qualify, but the question should also be fair to competitors.

---

# Keep the competitive field open

A strong audit question should allow multiple legitimate businesses or products to compete for recommendation.

Reject questions that are so specific that they effectively identify only the audited business.

The objective is not:

> “Write a question designed so this business wins.”

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

Founder-calibrated examples, supplied for a different category (invoice software) — style guidance, not templates to copy:

> Aplikasi buat bikin invoice untuk usaha kecil enaknya pakai apa ya?

> Bikin invoice tiap bulan capek kalau manual. Biasanya UMKM pakai aplikasi apa sih?

A short context clause before the question is fine; a need statement followed by its related question is still one request.

---

# Reject or downrank — unnamed questions (slots 1–6)

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

Before writing each unnamed question, evaluate it internally against four dimensions — do not write this evaluation in the response:

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

You will receive confirmed business information as structured data: a per-slot context projection for the ten fixed audit slots below. Distinguish three kinds of supplied information: plain values are confirmed facts about the audited business; items tagged \`provenance: "buyer_constraint"\` are customer preferences and decision criteria — what the buyer cares about, never claims that the audited business satisfies them; and anything absent or null is unknown — it may be asked about openly, but never written as already true. Use only what each slot's own context supplies.

Before writing, work through this inference and state it in the Market interpretation section of your response:

1. the actual market/category the audited business competes in;
2. typical consumer decision situations around that category;
3. broad buying criteria that customers might genuinely care about;
4. which criteria come from general market logic versus unusually specific claims of the audited business.

Then write exactly **ten questions** — one for each fixed slot below, in order. The slots are the product's fixed measurement contract: do not change a slot's order, purpose, or naming rule.

## Fixed slots

**Unnamed slots (1–6):** never name the audited business, its aliases, or the comparison target. Each must satisfy the acceptance test above.

`;

export const GLM_INSTRUCTION_MID = `

**Named slots (7–10):** name the audited business exactly as supplied in the confirmed context, the way a real customer who already knows the business would ask.

`;

export const GLM_INSTRUCTION_TAIL = `

Requirements:

- All questions must create meaningful opportunity for specific entities to be recommended; in slots 7–10 the named business is the entity under test.
- Do not name the audited business, its aliases, or the comparison target in slots 1–6. Slots 7–10 must name the audited business; slot 9 must also name the comparison target.
- Keep the competitive field reasonably open.
- Use a natural mix of decision situations and question structures.
- Do not mechanically repeat “rekomendasi” or “cariin”.
- Do not simply paraphrase the business's website or listing.
- Do not force every available business attribute into the questions.
- Prefer one clear consumer decision per question.
- Optimize simultaneously for naturalness and business relevance.
- Within the ten slot questions in section 2, do not include answers, explanations, rationales, citations, scores, findings, or marketing claims. (Sections 1 and 3 are your analysis; this rule governs only the extracted question text.)

---

# Output format

Return three sections in this exact order, each beginning with its marker line exactly as written:

## 1. Market interpretation

Briefly state:

- Category:
- Likely customer decision situations:
- Common decision dimensions:
- Audited-business facts that should **not** be copied too literally:

Keep this section concise. It is provider-side analysis, never shown to the customer.

## 2. Slot questions

Write exactly ten questions, one per fixed slot, in slot order, each on its own numbered line:

1. [question for slot 1]
Intent pattern: [short label]
2. [question for slot 2]
Intent pattern: [short label]

…through:

10. [question for slot 10]
Intent pattern: [short label]

Each numbered line is one Indonesian consumer question or direct request. An "Intent pattern:" label may appear on the line after its question. No other text may appear in this section.

## 3. Self-critique

At the end, identify:

- the 3 strongest questions for testing AI business visibility;
- any questions you think are borderline;
- any assumptions you had to make because the business information was incomplete.

Be critical of your own output rather than defending it. This section is provider-side analysis, never shown to the customer.

Only the ten numbered lines inside "## 2. Slot questions" become the product's questions. Sections 1 and 3 are not part of the customer-facing pack.

---

`;

export const GLM_FOUNDER_AMENDMENT_2026_09_16 = `Founder amendment, 2026-09-16 (takes precedence over conflicting diversity guidance above; adapted for the ten-slot contract — the original experiment requested 12 unnamed candidates): Natural, relevant questions may address the same underlying need. There is no minimum number of distinct needs or consumer decisions. Do not invent needs, occasions, features, or comparison criteria to make the questions different. Still provide the requested ten questions in slot order and avoid exact duplicate questions. Preserve naturalness, a real opportunity to recommend relevant competing entities, and honesty about unknown business facts. Do not name the audited business in the unnamed slots (1–6).`;

export const GLM_CONTEXT_HEADING = "# Confirmed business context\n\n";
