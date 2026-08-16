# Nuave voice and language

> Status: **Candidate for founder review**
> Updated: 2026-08-10
>
> This document defines how Nuave communicates with customers in Indonesian.
> It governs voice, tone, terminology, and writing behavior across reports,
> interfaces, support, outreach, and marketing. It derives from
> [`VISION.md`](../VISION.md), [`PRODUCT.md`](../PRODUCT.md), and
> [`AUDIT.md`](../AUDIT.md). Where they disagree, the higher-authority document
> governs.

## Purpose

Nuave turns an unfamiliar and variable subject into evidence a business can
understand, discuss, and act on. Its language must make the result clearer
without making the evidence sound more certain than it is.

Good Nuave writing helps the reader answer four questions on the first read:

1. What happened in this test?
2. Why does it matter?
3. What can the business do next?
4. What does this result not prove?

The goal is clarity with full meaning, not simplification that removes
important qualifications.

## Who we are speaking to

The primary reader is the owner or person accountable for marketing in an
Indonesian small or medium business. They are capable business decision-makers,
but they should not need to understand AI systems, APIs, statistical methods,
or marketing jargon to use Nuave.

The report may be shared with leadership, a budget holder, a marketer, an
administrator, or the person who will update a website or public listing. Write
so the primary reader can explain the result without translating Nuave's
language for someone else.

## The Nuave voice

Nuave sounds like a careful adviser who has examined the evidence and respects
the reader's judgment.

| Nuave is | Nuave is not |
|---|---|
| calm | dramatic or urgent without cause |
| specific | vague or padded with general advice |
| evidence-led | all-knowing or overly confident |
| direct | blunt, cold, or accusatory |
| practical | obsessed with metrics or methodology |
| professional | bureaucratic, stiff, or corporate |
| naturally Indonesian | English thinking expressed with Indonesian words |

### Calm

State negative findings without dramatizing them. A business that did not
appear in a test has received useful evidence, not a verdict on its quality or
future.

- Prefer: `Bisnis Anda tidak muncul dalam 4 dari 5 pertanyaan tanpa nama bisnis.`
- Avoid: `Bisnis Anda tidak terlihat oleh AI.`
- Avoid: `Anda tertinggal dari pesaing.`

### Specific

Name the result, scope, date, and action. Replace broad advice with the exact
information or location that needs attention.

- Prefer: `Samakan alamat cabang di situs resmi dan profil bisnis Anda.`
- Avoid: `Optimalkan kehadiran digital Anda.`

### Evidence-led

Say what Nuave observed before saying what it may mean. Never make an
interpretation sound like an observed fact.

- Observation: `Nama bisnis muncul dalam 2 dari 5 pertanyaan dengan nama bisnis.`
- Interpretation: `Informasi tentang layanan utama belum muncul secara konsisten.`
- Action: `Tambahkan layanan utama pada halaman cabang dan profil bisnis yang digunakan pelanggan.`

### Direct and respectful

Use active sentences and name the next step. Do not blame the reader for
missing information, a failed request, or an interrupted audit.

- Prefer: `Alamat situs belum dapat dibaca. Periksa alamatnya, lalu coba lagi.`
- Avoid: `Anda memasukkan URL yang tidak valid.`

### Naturally Indonesian

Write from the reader's need in Indonesian. Do not draft in English and then
translate its sentence structure. A grammatically correct translation can
still sound unnatural.

- Prefer: `Periksa 10 pertanyaan sebelum pengujian dimulai.`
- Avoid: `Lakukan peninjauan terhadap 10 pertanyaan sebelum proses pengujian dijalankan.`

## Relationship with the reader

### Use `Anda`

Use `Anda` consistently in customer-facing communication. It is respectful
without requiring assumptions about age, title, gender, or position.

- Do not alternate between `Anda`, `kamu`, `Bapak/Ibu`, and `pengguna`.
- Use `bisnis Anda` when ownership or responsibility matters.
- Omit the pronoun when a direct instruction is clearer: `Periksa kembali nama cabang.`
- Use a person's supplied name only where personalization is useful and
  expected.

Customer-style questions tested during an audit are an exception. They are
written from the prospective customer's point of view and may naturally use
`saya`, omit a pronoun, or use another locally appropriate form.

### Use `Nuave`, `audit ini`, and `kami` deliberately

- Use `Nuave` for product behavior: `Nuave menyusun laporan dari jawaban yang berhasil diuji.`
- Use `audit ini` for the report's bounded result: `Audit ini mencatat hasil pada 10 Agustus 2026.`
- Use `kami` for communication from the team: `Kami akan mengirim tautan laporan ke alamat ini.`
- Do not use `kami` to make a machine-generated judgment sound human-reviewed
  when it was not.

## Put meaning in the right order

Use this default sequence:

1. result or required action;
2. evidence or reason;
3. next step; and
4. limitation when it changes interpretation.

Do not make a reader cross several paragraphs of background before learning
the result.

### Reports

Lead with the observed result and denominator. Follow with what it may mean,
then the recommended action and its evidence.

### Interfaces

Lead with what the reader needs to do or what the system is doing. Put the
reason in helper text when it helps the decision.

### Errors

State what happened, what was preserved when known, and what the reader can do
next. Never promise that data is safe unless the product has confirmed it.

### Outreach and marketing

Lead with a real observed problem or a clear customer question. Explain the
offer after making the relevance concrete. Do not manufacture anxiety about a
new technology.

## Evidence and certainty

Nuave's credibility depends on small words that preserve scope.

### Use bounded observation language

Prefer:

- `Dalam pengujian ini...`
- `Pada 10 Agustus 2026...`
- `Bisnis muncul dalam 3 dari 5 pertanyaan yang berhasil diuji.`
- `Jawaban yang diuji menyebut...`
- `Pola ini dapat menunjukkan...`
- `Informasi publik belum terlihat konsisten dalam sumber yang diperiksa.`

Avoid:

- `AI selalu...`
- `ChatGPT tidak mengenal bisnis Anda.`
- `Pelanggan tidak akan menemukan Anda.`
- `Hal ini membuktikan...`
- `Penyebabnya adalah...`
- `Perubahan ini akan meningkatkan visibilitas.`

Use `menunjukkan` only for what the evidence directly shows. Use `dapat
menunjukkan`, `mungkin berkaitan`, or `belum dapat dipastikan` for a qualified
interpretation. Do not add `mungkin` automatically to every sentence; name the
uncertainty precisely.

### Preserve exact evidence

The following are evidence, not Nuave prose:

- tested questions;
- AI answer excerpts;
- business and competitor names;
- source titles and URLs;
- official terms;
- dates, models, product surfaces, and recorded run facts; and
- customer-supplied facts that are explicitly labeled.

Copy them exactly. Do not shorten, translate, paraphrase, correct, or smooth an
exact excerpt. If the excerpt is not Indonesian, show the original and add a
separate Indonesian explanation when needed. Never present a translation as
the original quote.

### Keep the three evidence layers visible

Use stable labels where the layers could otherwise blur:

- `Yang ditemukan` for observation;
- `Artinya bagi bisnis Anda` for qualified interpretation; and
- `Yang dapat dilakukan` for action.

A design may use shorter labels when the relationship remains unmistakable.
The wording must not turn an interpretation into a measured fact.

## Preferred customer terminology

Use the simplest term that preserves the audit definition.

| Meaning | Prefer | Avoid in customer-facing copy |
|---|---|---|
| the general category | `kemunculan bisnis di AI` or a plain question such as `apakah bisnis Anda muncul saat orang bertanya kepada AI` | unexplained `AI visibility`, `visibilitas AI` as the only explanation |
| defined observed process | `pengujian` or `audit` | `API observation`, `run`, `query execution` |
| tested AI product | the actual product name, such as `ChatGPT` | `semua AI`, `mesin AI` |
| execution surface in method detail | `sistem yang diuji`, followed by the exact official surface | unexplained `surface` |
| unbranded question | `pertanyaan tanpa nama bisnis` | `unbranded question`, `pertanyaan unbranded` |
| branded question | `pertanyaan dengan nama bisnis` | `branded question`, `pertanyaan branded` |
| appearance | `muncul` | `terdeteksi`, `terindeks`, `memiliki presence` |
| mention | `disebut` | `terekspos` |
| recommendation | `direkomendasikan` or `disarankan` according to the answer | `menang`, `peringkat teratas` |
| non-appearance | `tidak muncul dalam jawaban ini` | `tidak terlihat di AI`, `tidak dikenal AI` |
| failed test | `tidak dapat diuji` | `visibilitas nol`, `tidak muncul` |
| finding | `temuan` | `insight` |
| competitor | `pesaing` | `kompetitor` when `pesaing` is equally clear |
| public-information gap | `informasi yang belum lengkap`, `berbeda`, or `bertentangan` | generic `data gap`, `source gap` |
| re-check | `cek ulang` | `monitoring`, `pemantauan real-time` |
| score band | `rentang skor visibilitas AI` | an exact score without the range, components, and method |
| benchmark | `tolok ukur` or `pembanding` | unexplained `benchmark` |
| point-in-time result | `hasil pada tanggal pengujian` or `gambaran saat diuji` | unexplained `snapshot` |
| call to action | the exact action: `Periksa fakta`, `Mulai pengujian`, `Unduh laporan` | `Submit`, `Proses`, `OK` |

Use internal contract terms in code and technical evidence exports when they
are the exact schema. Translate the meaning for customers; do not rename stored
evidence fields merely to satisfy this guide.

## Writing by product surface

### Customer-style questions

Questions should sound like something a real prospective customer would type,
not like an auditor measuring a brand.

- Use ordinary category and location language.
- Ask one main thing per question.
- Make every question understandable without earlier conversation.
- Do not ask for sources, scoring, methodology, or an audit conclusion.
- Do not insert the business name into a question intended to test discovery.
- Do not force slang, personas, or Jakarta-centric phrasing.
- Read every question aloud. If it sounds translated or unusually formal,
  rewrite it from the customer's intent.

Illustrative, not a reusable template:

- Natural: `Apa pilihan katering untuk acara kantor di Bandung?`
- Translated-sounding: `Apa saja opsi penyedia layanan katering yang tersedia untuk kebutuhan acara perusahaan di wilayah Bandung?`

### Reports

- Put the main count and denominator before the score range.
- Place the snapshot limitation beside the result, not only in methodology.
- Use short sections and descriptive headings that help a reader brief someone
  else.
- State what happened before why it may matter.
- Limit recommendations to actions supported by the cited evidence.
- Start each action with a concrete verb: `samakan`, `tambahkan`, `perbarui`,
  `periksa`, or `jelaskan`.
- Name who can act and what observable condition means the action is complete.
- Keep methods and model details available without making them the main story.
- Use neutral language for competitors. The audit observes their appearance; it
  does not certify their quality.

Example:

- Prefer: `Samakan jam buka di situs dan profil bisnis. Dua sumber yang diperiksa menampilkan jam yang berbeda.`
- Avoid: `Optimalkan konsistensi data lintas ekosistem untuk memperkuat sinyal kepercayaan AI.`

### Forms and helper text

- Use a visible label for every field. A placeholder may show a format example,
  but it never replaces the label.
- Explain why information is needed when the reason is not obvious.
- Tell the reader which facts will be checked and when inputs become locked.
- Mark optional information explicitly.
- Use examples that match Indonesian businesses without assuming Jakarta,
  high-speed internet, or advanced marketing knowledge.

### Buttons and links

Use an active verb that names the result of the action.

- Prefer: `Ambil fakta dari situs`, `Periksa pertanyaan`, `Mulai pengujian`,
  `Unduh laporan`, `Coba lagi`.
- Avoid: `Lanjut` when the consequence is important, `Proses`, `Submit`, `OK`,
  and `Klik di sini`.

Link text should still make sense when read on its own. Use `Lihat metode
pengujian`, not `Baca selengkapnya`.

### Progress and waiting states

Tell the reader what is happening without inventing precision or progress.

- Prefer: `Menguji pertanyaan 3 dari 10.`
- Prefer: `Laporan sedang disusun dari jawaban yang berhasil diuji.`
- Avoid: `Hampir selesai` unless the system can establish that state.
- Avoid playful loading copy when money, evidence, or a long-running task is at
  stake.

### Empty states

Name the condition and offer the next useful action.

- Prefer: `Belum ada jawaban yang dapat diperiksa. Mulai pengujian setelah semua pertanyaan disetujui.`
- Avoid: `Tidak ada data.`

### Success states

Say exactly what completed and where the reader can go next. Celebration should
be restrained because report generation is expected product behavior.

- Prefer: `Laporan selesai. Anda dapat membacanya sekarang atau mengunduh PDF.`
- Avoid: `Berhasil! Audit luar biasa Anda sudah siap!!!`

### Errors and recovery

An error message contains:

1. what happened in plain language;
2. what was preserved, only when known; and
3. the next available action.

Examples:

- `Situs belum dapat dibaca. Periksa alamatnya, lalu coba lagi.`
- `Pengujian berhenti setelah pertanyaan ke-6. Enam jawaban yang selesai tetap tersimpan di sesi ini. Coba lanjutkan saat koneksi stabil.`
- `Laporan belum dibuat karena bukti tidak cukup. Tinjau hasil yang gagal sebelum mencoba lagi.`

Do not expose provider messages, schema terminology, stack traces, or raw error
codes as the only customer explanation. Keep technical detail available to the
operator when it helps diagnosis.

### Destructive or irreversible actions

State the object, consequence, and reversibility before confirmation.

- Prefer: `Hapus draf audit? Fakta dan pertanyaan yang belum dijalankan akan dihapus dari sesi ini.`
- Avoid: `Apakah Anda yakin?`

Do not say an action is irreversible unless it actually is.

### Outreach and marketing

- Demonstrate the observed problem before selling the category.
- Use the exact tested question, date, and answer when making a finding about a
  specific business.
- Sell clarity, evidence, and useful action—not fear of being left behind.
- Do not imply that absence in one result means lost customers or revenue.
- Do not call Nuave a monitoring platform, ranking tool, or optimization
  service.
- Use a question-and-answer section only for recurring buying, privacy, or
  method questions. Do not use it to repeat information the main page should
  explain clearly.
- Treat a report, result, client name, logo, and quote as private unless Nuave
  has specific permission to publish them.

## Tone changes with the situation

The voice stays consistent; the tone responds to context.

| Situation | Tone | Behavior |
|---|---|---|
| onboarding | clear and encouraging | explain the purpose and next decision without forced enthusiasm |
| fact confirmation | precise and neutral | distinguish extracted facts, buyer-supplied facts, and facts still needing review |
| testing in progress | calm and factual | report real progress and retained work without invented timing |
| positive finding | restrained and specific | say where the business appeared; do not celebrate a sampled result as a win |
| negative finding | direct and nonjudgmental | state the denominator and what can be checked next |
| uncertainty | transparent | name what is unknown and how it affects interpretation |
| error | calm and action-oriented | explain what happened, preservation, and recovery |
| recommendation | practical and qualified | use a concrete verb, evidence basis, responsible person, and completion check |
| payment or privacy | plain and formal | make price, consequence, retention, and consent explicit |
| outreach | relevant and respectful | lead with retained evidence; avoid pressure and false urgency |

## Numbers, scores, dates, and money

### Counts before percentages

Use the direct observed count and denominator:

- Prefer: `muncul dalam 3 dari 5 pertanyaan tanpa nama bisnis`.
- Avoid: `visibilitas 60%` as the only result.

Keep discovery, recognition, recommendation, information accuracy, and failed
tests separate. Do not combine unlike denominators in one sentence merely to
make the result shorter.

### Score ranges

Present the score as a range only with its components, method version, and
snapshot limitation. Do not describe movement as improvement or decline unless
the runs are comparable under the audit method.

### Accessible numbers

- Break up sentences that contain several numbers.
- Pair a percentage with its base count when it materially helps understanding.
- Do not create an analogy or business-impact estimate that the evidence does
  not support.
- Show calculations or formulas when the customer is expected to interpret
  them.

### Indonesian formats

- Date: `10 Agustus 2026`, not `10/08/26`.
- Time: `10.00` and `10.00–11.30`.
- Money: `Rp250.000`, without a space after `Rp`.
- Percentage: `50%`, without a space.
- Thousands use a full stop; decimals use a comma.
- Write number ranges with `sampai` or `hingga` in prose when that prevents
  ambiguity.

## Mechanics and formatting

- Use sentence case for headings, buttons, labels, and table headings.
- Use active voice when the actor matters.
- Keep one main idea per sentence and one topic per paragraph.
- Aim for roughly 12 to 20 words in Nuave-authored explanatory sentences. Treat
  25 words as a review signal, not an automatic failure.
- Field-level limits belong in the versioned Indonesian runtime writing
  contract and require testing; this guide does not set them.
- Exact evidence and literal labels are exempt from prose-length guidance.
- Prefer short paragraphs and lists when they make relationships easier to scan.
- Use numbered steps only when order matters.
- Use exclamation marks rarely and never more than one.
- Avoid all capitals for emphasis.
- Use bold text for structure or literal interface labels, not to compensate
  for weak wording.
- Use Indonesian words when a familiar, accurate equivalent exists. Preserve
  official product, model, API, schema, and business names where exactness
  matters.
- Do not use abbreviations such as `dll.`, `dsb.`, `e.g.`, or `i.e.` when a
  complete phrase is clearer.

## Inclusivity and cognitive accessibility

- Do not assume the reader's gender, age, family, location, device, bandwidth,
  marketing maturity, or technical ability.
- Do not use disability, mental health, intelligence, or financial status as a
  metaphor for product quality or user behavior.
- Avoid humor based on identity, region, accent, religion, gender, or physical
  condition.
- Do not call a business `buruk`, `lemah`, `gagal`, or `tidak dipercaya` when
  the evidence only concerns sampled AI responses or public information.
- Keep consequential limitations next to the result or action they qualify.
- Do not rely on color, icons, or formatting alone to communicate status.
- Give the reader control before paid, destructive, public, or irreversible
  actions.

## Words and patterns to avoid

Avoid these unless they are exact quoted evidence or an official term:

### Hype and fear

- `mendominasi AI`;
- `tak terlihat di dunia AI`;
- `jangan sampai tertinggal`;
- `revolusi`, `game changer`, or `transformasi` without a specific meaning;
- `peluang besar` without evidence; and
- countdowns, scarcity, or urgency that is not real.

### Unsupported certainty

- `pasti`, `dijamin`, or `terbukti meningkatkan`;
- `penyebabnya adalah` without causal evidence;
- `semua pelanggan`, `setiap jawaban`, or `selalu`; and
- forecasts of recommendation, traffic, leads, revenue, or sales.

### Corporate and technical filler

- `mengoptimalkan ekosistem digital`;
- `meningkatkan presence`;
- `insight yang actionable`;
- `leverage`, `deep dive`, `robust`, `end-to-end solution`, or `sinergi`;
- `dalam rangka`, `terkait hal tersebut`, and `berkenaan dengan`; and
- internal terms such as `execution surface`, `schema`, `telemetry`, or
  `provider response` in customer-facing explanations.

### Blame and judgment

- `Anda gagal`;
- `Anda salah mengisi`;
- `bisnis Anda buruk di AI`;
- `pesaing mengalahkan Anda`; and
- any wording that treats a failed test as the reader's fault.

## RASA review for Nuave

RASA is a final quality lens, not a substitute for evidence validation.

### Ritmis

Read the copy aloud. Check whether sentence length varies naturally, the text
has clear pauses, and no phrase sounds difficult or translated. A reader should
not need to restart a sentence to understand it.

### Akurat

Check whether every word matches the evidence and audit definition. Remove
filler and vague qualifiers. Confirm that `muncul`, `disebut`,
`direkomendasikan`, `tidak muncul`, and `tidak dapat diuji` have not been
conflated.

### Sarat makna

Check whether each line helps the reader understand, decide, recover, or act.
Remove text that merely sounds professional. A call to action must name the
real action and consequence.

### Alami

Read the text as an Indonesian business decision-maker. Check whether a person
would naturally say it in that context. Remove translated syntax, forced slang,
and formality that creates distance without adding respect.

Run RASA after factual and evidence checks. Smooth writing can still be wrong;
correct evidence remains the first gate.

## Final acceptance check

Before approving customer-facing language, confirm:

### Meaning and action

- The result or required action appears first.
- Every sentence has one main job.
- The reader knows what to do next when an action is available.
- The wording can be understood without specialist knowledge.

### Evidence and honesty

- Exact evidence remains unchanged and visibly separate from explanation.
- Counts retain their denominators.
- Observation, interpretation, and action are distinct.
- Limitations are close to the claims they qualify.
- No sentence creates a ranking, cause, forecast, or guarantee the evidence
  does not support.

### Voice and Indonesian

- `Anda` is used consistently where a pronoun is needed.
- The text sounds written in Indonesian, not translated from English.
- The tone matches the situation without leaving Nuave's calm, careful voice.
- Jargon, filler, hype, blame, and false urgency have been removed.
- The text passes Ritmis, Akurat, Sarat makna, and Alami review.

### Interface and accessibility

- Buttons and links name their action or destination.
- Errors state what happened and the next step; preservation is stated only
  when known.
- Numbers, dates, money, and ranges use clear Indonesian formats.
- Meaning does not depend only on color, icons, formatting, or assumed context.

## Ownership and maintenance

This guide owns customer-facing voice, tone, terminology, and general writing
behavior.

- [`VISION.md`](../VISION.md) owns the enduring customer promise and principles.
- [`PRODUCT.md`](../PRODUCT.md) owns the offer, journey, and product boundaries.
- [`AUDIT.md`](../AUDIT.md) owns measurement definitions, evidence rules, and
  report requirements.
- `report-language.ts` owns versioned runtime limits and automated language
  validation.
- A feature specification owns the exact copy requirements for its bounded
  experience.

Do not duplicate detailed audit rules here. When a new term or situation
changes the product promise or evidence meaning, resolve that decision in the
higher-authority document before updating this guide.
