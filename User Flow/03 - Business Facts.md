# 03 — Business Facts

> Status: Working product plan
> Depends on: [`02 - Payment.md`](./02%20-%20Payment.md)
> Updated: 2026-08-17

## Objective

Prepare the most accurate business-information draft Nuave can produce from
public sources, then ask the customer to correct and approve it before it shapes
the ten audit questions.

The intended customer reaction is:

> “Nuave already understands most of my business. I only need to check and
> correct it.”

This is not a blank intake form and not an invitation to accept AI output
without review. Nuave does the initial work; the customer supplies the final
judgment.

## Position in the journey

```text
Verified payment
  → prepare business draft
  → customer checks and corrects facts
  → customer approves the business information
  → Nuave builds ten questions
  → customer reviews the questions
  → explicit audit run
```

Preparing and confirming business facts does not start or consume the audit.
The audit starts only after the final questions are approved and Nuave accepts
the customer's explicit run action.

## Core experience decision

The page should present an AI-prepared draft rather than empty fields. The
customer may edit every material item, but Nuave should minimize how often the
customer needs to type from zero.

Customer-facing introduction:

> **Periksa informasi bisnis Anda**
>
> Kami menyiapkan informasi ini dari sumber publik. Perbaiki bagian yang kurang
> tepat sebelum Nuave membuat pertanyaan audit.

Use customer language, not the internal audit schema. Do not expose terms such
as “entity scope,” “market context,” “brand type,” “decision criteria,” or
“verified offering” in the interface.

## Preparation behavior

After Midtrans payment is verified, Nuave may begin preparing the business
draft in the background. This uses the paid preparation allowance but does not
run any audit question.

When the customer opens the page:

- show the completed draft immediately when ready;
- show honest progress when preparation is still running;
- restore the same saved draft after refresh;
- never repeat the model call merely because the page was reopened; and
- fall back to editable manual fields if automatic preparation cannot finish.

Preparation must be idempotent: one paid order owns one current preparation
job and draft version. A deliberate refresh from new sources may create a new
draft version, but an ordinary reload may not.

Loading copy:

> **Menyiapkan informasi bisnis Anda**
>
> Kami sedang memeriksa sumber publik yang Anda kirimkan. Audit belum dimulai.

Do not show an endless spinner. If the operation exceeds its expected window,
show a recoverable status and let the customer continue with manual entry.

## Source behavior

Start with the exact public source submitted on Order Preview, then look for
additional official sources needed to resolve identity and improve the draft.

Supported official source types:

- official website;
- exact Google Maps business listing; and
- public Instagram business profile.

Nuave may propose additional official links, but the customer can remove an
incorrect one or add another. A directory, marketplace page, news article,
review page, or similarly named social account is not labelled “official.” It
may be retained as supporting evidence only when relevant.

Source priority:

1. The customer-submitted official source.
2. Exact official website and Google Maps listing.
3. Exact official Instagram business profile.
4. Other public evidence used only to clarify or identify conflicts.
5. Customer-supplied information, visibly labelled as such until verified.

If sources disagree, Nuave shows the conflict and asks the customer to select
or enter the current version. It does not silently choose the cleanest answer.

## Provenance labels

Every AI-prepared item is distinguishable from a customer-entered item. Use a
small label or accessible disclosure such as:

- **Ditemukan di website**
- **Ditemukan di Google Maps**
- **Ditemukan di Instagram**
- **Saran Nuave**
- **Ditambahkan oleh Anda**
- **Perlu diperiksa**

“Ditemukan” means the value is supported by the named source. “Saran Nuave”
means it is an interpretation based on public material, such as a likely
category or typical customer. Neither means the customer has confirmed it.

Do not show numerical confidence scores. They create false precision and add
little value to the correction task.

## Information shown to the customer

### 1. Business identity

AI-prepared and editable:

- business name;
- exact branch, city, or service area;
- official website;
- Google Maps listing;
- Instagram profile; and
- official logo or public profile image.

Business name, exact scope, and at least one official source are required.

If several branches or similarly named businesses are found, do not preselect
one silently. Ask the customer to choose the exact entity being audited.

The paid order remains tied to the submitted business. Correcting a name,
branch, or link is allowed; switching to an unrelated business follows the
wrong-business remedy in the payment plan.

Before confirmation, state plainly that the customer must verify the exact
business, branch, and scope before starting the audit. A correction to the same
intended business creates a new fact version. If questions already exist, it
also invalidates and regenerates the complete question pack for review.

### 2. Business category

Use one editable text field with no more than three AI-suggested chips. The
strongest supported suggestion may prefill the field, but remains labelled
**Saran Nuave** until the customer confirms the page.

Example suggestions:

- Kedai kopi
- Kafe
- Ruang kerja bersama

Selecting a chip replaces the text-field value. The customer may type a better
answer. Only one category is primary so the ten questions stay focused.

Caption:

> Pilih kategori yang paling mirip dengan cara calon pelanggan mencari bisnis
> Anda.

### 3. Short business description

The engine drafts one or two short factual sentences in natural Indonesian
from the available sources. It is editable and not required to continue.

Caption:

> Draf Nuave berdasarkan sumber publik. Perbaiki jika ada informasi yang kurang
> tepat.

The description must not introduce praise, reputation, popularity, service
quality, customer outcomes, rankings, or other unsupported claims. If no useful
description can be grounded, leave it empty instead of inventing one.

### 4. Products or services

Label:

> **Produk atau layanan utama**

The engine proposes short editable items from official sources. Show the most
relevant suggestions as chips or compact rows and allow the customer to add,
remove, rename, and choose up to three that should shape the audit.

Caption:

> Pilih hingga tiga produk atau layanan yang paling penting untuk audit ini.
> Gunakan nama yang biasa dicari pelanggan, bukan nama paket internal.

At least one selected product or service is required. Additional extracted
offerings may remain under **“Lihat lainnya”** but do not all shape the question
pack.

### 5. Typical customer context

The engine prepares editable drafts for:

**Siapa yang biasanya mencari bisnis Anda?**

**Apa yang biasanya mereka butuhkan?**

**Apa yang biasanya mereka pertimbangkan?**

These fields help Nuave write realistic discovery and comparison questions.
They are interpretations, not objective public facts, so label them **Saran
Nuave** unless the wording comes directly from a source.

The first field is required because customer context materially changes the
questions. Needs and considerations are recommended but may be empty when no
responsible suggestion is available; the deterministic question builder can
fall back to category, location, and selected offering.

### 6. Differentiator

Label:

> **Apa yang membuat bisnis Anda berbeda?**

The engine prepares one short editable draft based on observable public
information.

Caption:

> Jelaskan hal yang dapat diperiksa dari sumber publik. Contoh: buka 24 jam,
> menggunakan kopi lokal, menyediakan ruang kerja, melayani area tertentu, atau
> memiliki layanan khusus.

This is optional. Nuave removes or flags unsupported superlatives such as
“terbaik,” “nomor satu,” “paling dipercaya,” or “kualitas tertinggi.” A
customer-entered differentiator remains labelled as customer-supplied when it
cannot be verified publicly.

### 7. Comparison business

Label:

> **Bisnis pembanding**

Supporting copy:

> Nuave menemukan bisnis yang menawarkan pilihan serupa di area yang sama.

Show one proposed business with:

- name;
- comparable category;
- location or service scope;
- one public source; and
- a short explanation of why it is comparable.

Actions:

- **Gunakan bisnis ini**
- **Ganti**
- **Masukkan bisnis lain**

Do not produce a long competitor list and do not select a comparator from name
similarity alone. A customer-provided alternative must still resolve to a real,
appropriately scoped public business.

The comparator is suggested and reviewable, but should not block the order when
Nuave cannot establish a credible one. In that case, the later comparison
question uses “pilihan lain” rather than naming an invented or weakly matched
business. This requires the question contract to support the no-named-
comparator fallback.

### 8. Changed or frequently incorrect information

Label:

> **Adakah informasi tentang bisnis Anda yang sudah berubah atau sering salah?**

Caption:

> Contoh: Anda baru berganti alamat, berganti jam kerja, mengubah layanan,
> mengganti nama brand, atau memperbarui cara pelanggan menghubungi bisnis Anda.

This optional field starts empty because Nuave cannot reliably know about an
unpublished change. If the engine finds conflicting public sources, show the
conflict separately rather than filling this field on the customer's behalf.

## Dedicated screen simulation

The following is a customer-visible simulation, not a real business, result, or
claim. **Kopi Taman Senja**, its sources, and **Kopi Ruang Pagi** are fictional.
Reserved `.example` domains are used deliberately.

### Preparing state

> **Menyiapkan informasi bisnis Anda**
>
> Kami sedang memeriksa website, profil bisnis, dan sumber publik yang Anda
> kirimkan. Audit belum dimulai.
>
> Kopi Taman Senja · Pesanan NVA-FIKTIF-001

### Prepared page

> ## Periksa informasi bisnis Anda
>
> Kami menyiapkan informasi ini dari sumber publik. Perbaiki bagian yang kurang
> tepat sebelum Nuave membuat pertanyaan audit.

#### Bisnis yang akan diaudit

> **[Logo KTS]**
>
> **Nama bisnis** · Ditemukan di website
>
> `Kopi Taman Senja`
>
> **Cabang, kota, atau area layanan** · Perlu diperiksa
>
> `Dago, Bandung`
>
> **Sumber resmi**
>
> ✓ `https://kopitamansenja.example` — Website  
> ✓ `https://maps.example/kopi-taman-senja` — Simulasi Google Maps  
> ✓ `https://instagram.example/kopitamansenja` — Simulasi Instagram
>
> `[+ Tambah sumber resmi]`
>
> Logo ditemukan di website. `[Hapus logo]`

If multiple branches were found, replace the single scope field with:

> **Kami menemukan beberapa lokasi**
>
> Pilih cabang yang ingin Anda audit.
>
> ○ Dago, Bandung  
> ○ Buah Batu, Bandung  
> ○ Lokasi lain

#### Kategori bisnis

> **Kategori bisnis** · Saran Nuave
>
> `Kedai kopi`
>
> Saran lain: `[Kafe]` `[Ruang kerja bersama]`
>
> Pilih kategori yang paling mirip dengan cara calon pelanggan mencari bisnis
> Anda.

#### Tentang bisnis

> **Deskripsi singkat** · Draf Nuave dari website dan Instagram
>
> `Kopi Taman Senja adalah kedai kopi dan ruang kerja di Bandung yang menawarkan
> kopi lokal, makanan ringan, serta area untuk bekerja dan berkumpul.`
>
> Draf Nuave berdasarkan sumber publik. Perbaiki jika ada informasi yang kurang
> tepat.

#### Produk atau layanan utama

> **Produk atau layanan utama** · Saran Nuave
>
> Dipilih untuk audit:
>
> `[✓ Kopi lokal]` `[✓ Ruang kerja]` `[✓ Makanan ringan]`
>
> Saran lain: `[Penyewaan ruang komunitas]` `[+ Tambah sendiri]`
>
> Pilih hingga tiga produk atau layanan yang paling penting untuk audit ini.
> Gunakan nama yang biasa dicari pelanggan, bukan nama paket internal.

#### Calon pelanggan

> **Siapa yang biasanya mencari bisnis Anda?** · Saran Nuave
>
> `Pekerja remote, mahasiswa, dan komunitas kecil di Bandung.`
>
> **Apa yang biasanya mereka butuhkan?** · Saran Nuave
>
> `Tempat untuk bekerja atau bertemu dengan Wi-Fi, makanan, dan minuman.`
>
> **Apa yang biasanya mereka pertimbangkan?** · Saran Nuave
>
> `Lokasi, suasana, fasilitas, harga, dan jam buka.`

#### Apa yang membuat bisnis Anda berbeda?

> **Apa yang membuat bisnis Anda berbeda?** · Saran Nuave
>
> `Menggunakan kopi dari produsen lokal sekaligus menyediakan area untuk bekerja
> dan pertemuan kecil.`
>
> Jelaskan hal yang dapat diperiksa dari sumber publik. Contoh: buka 24 jam,
> menggunakan kopi lokal, menyediakan ruang kerja, melayani area tertentu, atau
> memiliki layanan khusus.

#### Bisnis pembanding

> **Bisnis pembanding**
>
> Nuave menemukan bisnis yang menawarkan pilihan serupa di area yang sama.
>
> **Kopi Ruang Pagi** · Kedai kopi dan ruang kerja · Dago, Bandung  
> Sumber: `https://kopiruangpagi.example`  
> Menawarkan kedai kopi dan area kerja dalam wilayah yang sama.
>
> `[Gunakan bisnis ini]` `[Ganti]` `[Masukkan bisnis lain]`

#### Informasi yang berubah atau sering salah

> **Adakah informasi tentang bisnis Anda yang sudah berubah atau sering salah?**
>
> `[Tulis di sini—opsional]`
>
> Contoh: Anda baru berganti alamat, berganti jam kerja, mengubah layanan,
> mengganti nama brand, atau memperbarui cara pelanggan menghubungi bisnis Anda.

When Nuave finds a conflict, show it above this empty field:

> **Kami menemukan informasi yang berbeda**
>
> Website mencantumkan jam buka **08.00–21.00**, sedangkan simulasi Google Maps
> mencantumkan **09.00–20.00**.
>
> `Jam yang masih berlaku: [________________]`

#### Confirmation

> ☐ **Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam
> pertanyaan audit.**
>
> Anda masih dapat memeriksa dan memperbaiki seluruh pertanyaan sebelum audit
> dijalankan.
>
> `[Buat pertanyaan audit]`

The primary action remains disabled until every required field is complete and
the confirmation is selected. Validation takes the customer to the exact field
that needs attention instead of showing a generic form error.

## Editing and regeneration behavior

- Save edits continuously or on field exit so a refresh does not lose work.
- Never overwrite a customer edit with a later AI suggestion.
- When a customer adds a new source, offer **“Perbarui saran Nuave.”** Apply the
  resulting differences individually or in a reviewable group.
- Removing a source does not silently remove customer-confirmed facts; mark any
  fact that has lost its supporting source for review.
- Changing any confirmed business fact after questions have been created
  invalidates the current question-pack version. After an explicit warning,
  prepare one new complete pack from the new fact version and require review;
  do not merge old customer edits automatically.
- Question regeneration follows the approved model-first Questions plan: one
  bounded no-search generation call with the deterministic Indonesian pack as
  resilience fallback. An ordinary reload never regenerates.
- Once the audit starts, the confirmed brief and questions lock. A genuine
  wrong-business mistake goes to founder support, which may grant one linked
  replacement audit chance while preserving the original evidence. This is an
  order remedy, not a correction to completed observations.

## AI drafting rules

The preparation engine receives only the public business information needed for
this order. It does not receive the customer's payment credentials or include
the delivery email in its research prompt.

The engine must:

- prioritize the submitted official sources;
- search only to resolve identity, find additional official sources, draft the
  requested fields, and find one appropriately scoped comparison business;
- produce natural Indonesian;
- return a defined structured result;
- attach supporting source references to material extracted values;
- distinguish observed facts from inferred suggestions;
- leave unsupported values empty;
- report conflicts and uncertainty;
- avoid service-quality, popularity, ranking, outcome, or superiority claims;
- avoid inferring sensitive traits about owners, staff, or customers; and
- never treat a similarly named business as the same entity without evidence.

The application validates the structured result. Model output does not become a
confirmed business fact merely because it matched the requested format.

## Recommended engine and evaluation gate

### Implementation candidate: Gemini 3.5 Flash-Lite

Use Gemini 3.5 Flash-Lite as the first candidate because Nuave already has a
Gemini extraction path and the model supports Search grounding, Google Maps
grounding, URL context, structured outputs, and thinking. Maps grounding is
particularly relevant to the accepted Google Maps listing input.

This is a candidate, not a quality claim. The current code uses Gemini 3.1
Flash-Lite; changing the model requires a representative comparison rather than
an alias-only replacement.

### Quality benchmark: GPT-5.6 Luna

Evaluate GPT-5.6 Luna with the Responses API, structured outputs, web search,
and low reasoning effort as the immediate alternative. It provides a simpler
hosted web-search path than building a separate search service for DeepSeek.

### Deferred candidate: DeepSeek V4 Flash

Do not add DeepSeek V4 Flash to the production path yet. Although its token
price is low and it supports JSON and function calls, Nuave would need to
provide and operate its own general search/fetch function. Its JSON-output
documentation also warns about occasional empty responses. Revisit it after a
provider-independent retrieval layer exists or a measured cost need justifies
that work.

DeepSeek V4 Pro is not justified for this bounded extraction task unless a
representative evaluation shows a material quality gain over Flash.

### Five-business evaluation

Before locking the provider, run Gemini 3.5 Flash-Lite and GPT-5.6 Luna on the
same five real public businesses in the selected launch category and city. Do
not contact them or publish the drafts.

Measure:

- exact business and branch resolution;
- correct official-source identification;
- supported category suggestions;
- product and service accuracy;
- unsupported or flattering claims;
- usefulness of customer-context suggestions;
- comparison-business relevance;
- natural Indonesian writing;
- valid structured output on the first attempt;
- latency; and
- total model and search cost.

Select one production provider from observed Nuave-specific performance. Do not
run two providers for every customer or build a general automatic fallback
system before real failures justify it.

## Negative cases and edge cases

| Case | Nuave response |
|---|---|
| Submitted source is unavailable | Preserve the paid order, explain which source could not be read, and show the required manual fields. |
| Website blocks automated access | Try the exact Maps or Instagram source when available; otherwise use manual entry without consuming the audit. |
| Instagram profile is private or inaccessible | Ask for an official website, Google Maps listing, or manual information. Do not ask for login credentials. |
| Several businesses or branches match | Require the customer to choose the exact business and location. Never choose silently. |
| Submitted link belongs to a different business before audit start | Pause the flow and let the customer replace it under the same order, then create a new fact version and question pack. |
| Customer discovers the wrong business after audit start | Preserve the original run and route to founder support for the discretionary replacement-audit remedy; use a replacement order only as the last resort. |
| Only part of the draft is supported | Show the supported values, leave unsupported fields empty, and ask for the missing required information. |
| Sources conflict | Show each material version with its source and ask the customer for the current value. |
| Model returns invalid or empty structured output | Retry once only when the cost and method remain within the preparation allowance; then fall back to manual entry. |
| Preparation request times out | Restore the saved job state, check its final status, and avoid creating a second paid request. |
| Category suggestion is wrong | Let the customer choose another chip or type a replacement. Save the customer version as authoritative for the question draft. |
| No category is confidently suggested | Leave the field empty and provide examples related to the available source text without auto-selecting one. |
| Too many products are found | Show the most relevant suggestions and ask the customer to choose up to three. Do not silently select based on prominence alone. |
| No credible comparison business is found | Continue without a named comparator and use the generic comparison-question fallback. |
| Suggested comparator is disputed | Let the customer replace it; verify the replacement before using its name in a question. |
| Unsupported praise appears in the draft | Remove or flag it before display and retain a quality-failure record for evaluation. |
| Customer enters sensitive personal information | Stop processing that text, restrict it, do not send it to another provider, and explain what safe business information is needed. |
| Customer refreshes or returns later | Restore the latest saved draft and edits without rerunning preparation. |
| Customer changes a fact after question creation | Invalidate the affected question pack and require a fresh question review. |
| Provider is unavailable | Preserve the order and allow manual completion; do not start the audit or tell the customer to pay again. |

## Privacy and trust requirements

- Process only public business information and facts the customer deliberately
  supplies for the audit.
- Keep delivery email and payment details out of model prompts.
- Do not publish a business draft, logo, source set, or later finding.
- Label customer-supplied facts until verified.
- Keep raw provider responses in restricted evidence storage when they contain
  unnecessary metadata or copied content.
- Display concise source references rather than large copied passages.
- Record the preparation provider, returned model, prompt/contract version,
  observation date, sources, cost, latency, and failures internally.
- Explain that Nuave uses automated analysis without implying that the customer
  must understand the model or provider details to complete the form.

## Acceptance criteria

The touchpoint is ready for implementation review when:

1. A verified paid order starts or resumes one idempotent business-preparation
   job without starting the audit.
2. The customer sees an AI-prepared draft rather than an empty internal schema.
3. Business name, exact branch/location/service area, and at least one official
   source are confirmed before continuing.
4. Category is editable and accompanied by no more than three useful suggested
   chips.
5. At least one and no more than three selected products or services shape the
   question pack.
6. Typical customer, needs, and considerations are drafted in ordinary
   Indonesian and visibly labelled as suggestions.
7. The short description and differentiator contain no unsupported quality,
   ranking, popularity, or outcome claim.
8. Logo absence or removal does not block the flow.
9. One comparison business is proposed when supported, with exact scope and a
   source; lack of a credible comparator does not invent one or block the order.
10. The changed-or-incorrect-information field starts empty while detected
    public conflicts appear separately.
11. Every displayed item distinguishes source-supported extraction, Nuave
    suggestion, customer input, and unresolved review state.
12. Adding a source never overwrites customer edits without review.
13. Refresh and return restore the latest draft without repeating the model
    call.
14. Extraction failure, inaccessible sources, partial output, and provider
    outage all retain the paid order and provide a manual path.
15. Sensitive or unnecessary personal data is not sent to the preparation
    model.
16. The customer cannot continue until required information is complete and
    the final confirmation is selected.
17. The primary action is **“Buat pertanyaan audit.”**
18. A changed confirmed fact invalidates the affected questions and triggers a
    new question review.

## Decisions required before implementation approval

- Select the preparation provider after the five-business evaluation.
- Confirm the selected provider's production data and retention settings for
  the Privacy notice.
- Confirm the exact selected launch category and city used for the evaluation.
- Approve whether customer-supplied unverified differentiators may appear in
  questions or only remain internal context.
- Approve the generic comparison-question wording used when no named comparator
  is credible.
- Define how long an incomplete paid business draft remains recoverable.
- Align the Indonesian customer contract with the final required fields.

## Required implementation alignment

The current audit interface exposes a long English internal brief and currently
requires fields such as brand type and one named verified competitor. Its
contract is also fixed to `en-US`. Before this customer-facing touchpoint is
implemented:

- replace internal schema labels with the Indonesian customer fields in this
  plan;
- keep any additional internal derived fields behind the interface;
- support an optional named comparator with a safe generic fallback;
- add an Indonesian audit and question contract;
- retain source evidence and warnings for each drafted value; and
- replace deterministic English generation with the approved model-first
  Indonesian path and deterministic Indonesian resilience fallback.

This plan does not itself approve those broader contract changes.

## Out of scope

- collecting private customer, patient, employee, legal, or financial records;
- asking for social-media or Google account credentials;
- automatically claiming ownership of a business;
- evaluating the quality of the business's actual service;
- creating or redesigning a business logo;
- generating a marketing strategy or full brand profile;
- supporting several businesses or branches in one audit;
- publishing the business draft;
- running audit questions; and
- generating the final report.

## Provider references

- [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Gemini Search grounding](https://ai.google.dev/gemini-api/docs/google-search)
- [Gemini Maps grounding](https://ai.google.dev/gemini-api/docs/maps-grounding)
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- [DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [DeepSeek Chat API](https://api-docs.deepseek.com/api/create-chat-completion/)
- [DeepSeek JSON output](https://api-docs.deepseek.com/guides/json_mode/)
