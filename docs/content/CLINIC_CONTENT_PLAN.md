# Clinic content plan: landing page and audit journey

> Status: **Proposed. Founder approval needed before implementation** (decisions in §11)
> Date: 2026-10-23
> Prepared for: Yasir, and the agent who will implement it
> Covers: the landing page (`/`), the audit journey (`/audit`, Figma J01–J35),
> the report page (`/r`), the customer emails, and `/faq`
> Audited: live `v2.nuave.ai` on 2026-10-23 (phone 390 px and desktop 1440 px,
> no submissions), and `main` at `56619db` walked end to end in synthetic
> mode with a fictional dental clinic ("Klinik Fiksi"). No live AI call was made.

Nuave now sells to Indonesian clinics that already spend on digital marketing:
beauty and aesthetic clinics, dental clinics, circumcision (khitan) clinics,
children's clinics, general clinics and similar. The product, price and method
stay the same. This plan changes **what the words say and how the reader is
asked to think**, so a clinic owner or a clinic marketing team feels the page
was made for them.

---

## 0. How to use this plan (implementing agent)

1. Read this whole plan, then `AGENTS.md` and `docs/VOICE.md` §2 to §7. Do not
   load other planning documents unless a step below names them.
2. Check §11. Implement a decision only if the founder approved it. If a
   decision is not approved, use its "If not approved" column.
3. Work in the pull-request order of §12. One pull request per step.
4. **Change words, not behaviour.** Keep the gates, payment, the audit method,
   every AI prompt, validation limits, stored values and what the browser
   saves. The only behaviour changes allowed are the ones this plan names: two
   removed lines (J27), new chip lists and examples (J16, J17, J22), the service
   example on J11, the optional landing section and sheet blocks (D8, D9), and
   the report's "Detail teknis" fold (D6).
5. Find each string by its **exact current text**. Line numbers (`~L218`) are
   hints and drift. Text that wraps across lines in JSX is quoted whole here.
6. If the code no longer matches a "Now" cell, follow the intent in §2 to §4
   and report the mismatch in the pull request. Never guess a new product fact.
7. Customer copy is Indonesian. Everything else in this plan is English.

---

## 1. Summary

- **The problem today:** every line is written for "a business" and "its
  customers". A clinic owner has to translate it. Nothing on the page names
  their real situation: they pay for ads, SEO, Instagram and Google Maps, yet
  patients now also ask AI which clinic to choose, AI answers with a few
  names, and none of their dashboards shows that answer.
- **The fix:** say *klinik*, *pasien*, *layanan*. Show one patient question and
  one AI answer. Promise three things only: see what AI says, see which clinics
  it names instead, know what to fix first.
- **Also fix:** the questions screen shows the tech stack to customers
  (question model name, "provider", cost in USD); the report header leads with
  "OpenAI Responses API" and a model ID; the FAQ contradicts the live product;
  the browser tab and WhatsApp preview still say "brand" and "ChatGPT".
- **Design:** the current design stays. Two optional upgrades are worth it
  (§10): a patient-question example on the landing, and two small blocks in the
  example report sheet. Nothing else needs a redesign.

---

## 2. What the audit found

### 2.1 Landing page

| # | Finding | Why it matters | Fix |
|---|---|---|---|
| FL1 | Hero, lead, field, button, steps and bullets all say *bisnis* or *pelanggan*. | A clinic owner reads a generic tool, not a clinic specialist. | §5 |
| FL2 | The page never states the clinic's pain: paid marketing, patients asking AI, a short list of names, no visibility in their dashboards. | Curiosity ("am I mentioned?") is weaker than a business problem ("patients pick from a list I cannot see"). | §4.1, §5.1, §5.2 |
| FL3 | The cream band says "Pelanggan tidak lagi cek website satu per satu. Mereka tanya ke AI." over an abstract phone: grey bars and two small shops. Its caption "Contoh tampilan. Nama bisnis fiktif." explains names the picture does not show. | The one section meant to show the problem shows nothing a clinic recognises. | §5.2 |
| FL4 | Browser tab and link preview: "Nuave · Apakah brand Anda muncul di ChatGPT?" and "…bagaimana AI menyebut brand Anda…". | This is what a clinic sees when the link is shared on WhatsApp. It uses the retired voice (brand, ChatGPT). | §5.7 |
| FL5 | The example report sheet is already a clinic, but shows only the counts and one quote. | It hides the two things a marketing team pays for: which clinics AI named instead, and what to fix first. | §5.6 |
| FL6 | "Yang Anda terima": "Skor kemunculan, misalnya 4 dari 10", "Bisnis lain yang disebut". | Abstract ("kemunculan") and generic. | §5.4 |

### 2.2 Audit journey

| # | Finding | Why it matters | Fix |
|---|---|---|---|
| FJ1 | About 25 screens say *bisnis*, *pelanggan*, *produk*, *jual*, "Seluruh brand", "Datang ke tempat", "Dikirim", "Anda yang datang". | The owner keeps translating. "Apa saja yang Anda jual?" is wrong for a clinic. | §6 |
| FJ2 | Coffee-shop chip lists. Who searches: "pekerja remote, wisatawan, komunitas, pelaku usaha". What they compare: "harga, kualitas, jam buka, kecepatan layanan". | These are the first optional choices a clinic sees after paying. They look made for someone else. | §6 J16, J17 |
| FJ3 | **The questions screen shows the stack on live:** "Pertanyaan disiapkan melalui satu panggilan provider. Model diminta: glm-5.3-flash. Model diterima: … Biaya: USD …". | Directly against "do not show the tech stack". Also reads like internal billing. | §6 J27 |
| FJ4 | The retry state says trying again "dapat menambah biaya penggunaan AI". | A founder-testing note. To a paying clinic it reads like a hidden charge. | §6 J27 |
| FJ5 | The differentiator examples, placeholder and keyboard starters push "Satu-satunya…" and "harga terjangkau". | Superlative and "only" claims are what health advertising rules restrict (§4.4) and what AI cannot check. Nuave should model factual claims. | §6 J22 |
| FJ6 | The paid reading lists found items under "Produk". | Clinics list services, not products. | §6 J09 |

### 2.3 Report and emails

| # | Finding | Fix |
|---|---|---|
| FR1 | Report header: "Sistem yang diuji: OpenAI Responses API" and "Model jawaban: gpt-5.6-luna". Each answer repeats system and model. "Tentang audit ini" says "melalui OpenAI Responses API (…)" and "Jawaban dari API tidak mewakili…". | §7, decision D6 |
| FR2 | "Brand Anda diunggulkan" (VOICE.md says *bisnis*, never *brand*). Owner roles "Pemilik bisnis", "Pengembang web". Scope line "Seluruh brand Klinik Fiksi" repeats the name. | §7 |
| FR3 | "Daftar ini terbatas pada catatan terstruktur yang tersimpan…": internal wording. | §7 |
| FR4 | Payment email: "Lanjutkan di browser yang sama untuk mengisi data bisnis Anda." Sensitive-input notices say "informasi publik tentang brand Anda". | §7 |

### 2.4 FAQ (`/faq`, linked from the landing footer and from "Bantuan" on every journey screen)

It contradicts the live product: it says payment is not active, reports are
not emailed, closing the tab stops the audit, and five of the ten questions
name the business. It gives `hello@nuave.ai` while every other screen gives
`support@nuave.ai`. It uses internal words (intake, state, browser/session-based,
API, SLA, snapshot). A clinic that taps "Lihat pertanyaan umum" mid-journey
loses trust. Fix: §8.

### 2.5 What already works (keep it)

- The structure: one field, a free identity check, three steps, the price
  stated early, one call to action, the honesty lines ("Ini bukan peringkat atau
  jaminan…", "Hasil audit belum ada di sini.", the delivery promise).
- The illustrations already say "clinic": the 3D clinic with the green cross,
  the treatment-room browser, the cross sign, the serum bottle. Keep them (§9).
- The best existing lines, which set the tone for everything else:
  - J03: "Klinik gigi dekat kantor di Dago yang buka sore apa ya?"
  - Example report quote: "…Ada juga Klinik Fiksi di Jalan Dago, tetapi
    informasi jadwal dokter dan biaya perawatannya belum banyak ditemukan.…"
  - J22 example: "Dokter gigi praktik sampai jam 9 malam, daftar cukup lewat
    WhatsApp." (a fact a patient can check, no claim about other clinics)

---

## 3. The mental model

### 3.1 Before and after

- **Now:** "Is your business mentioned by AI?" A curiosity check that fits any
  business.
- **After:** "When patients ask AI which clinic to choose, AI answers with a
  short list. Is your clinic on it, for the services you sell, in your area?
  Which clinics are named instead? What should your team fix first?"

### 3.2 The readers

One page, two readers. Write for both at once.

- **Clinic owner.** Often a doctor or dentist, or a business owner with one to
  five branches. Cares about new patients, wasted marketing money, the clinic's
  reputation, and not breaking health advertising rules.
- **Clinic marketing lead or team, or the agency they hire.** Cares about
  proving what works, finding the next lever, and having something concrete to
  show the owner.

Both already pay for ads, SEO, Instagram content, Google Maps, and sometimes
influencers. Neither is an analyst. Both read on a phone, between other work.

### 3.3 Three promises (every screen supports one of them)

1. **Lihat** what AI tells patients about clinics like yours: named,
   recommended, or missing.
2. **Bandingkan:** which clinics AI names instead.
3. **Benahi:** which public information to fix first, as a list the team can
   work through.

### 3.4 Words to use

| Meaning | Use | Do not use | Note |
|---|---|---|---|
| The audited business | **klinik Anda** in prose; **klinik** in labels; **nama klinik** | bisnis Anda, brand Anda, usaha | Exceptions in §3.5 |
| People who ask AI (prospects) | **calon pasien** | calon pelanggan, customer, klien, konsumen | |
| People the clinic treats | **pasien** | pelanggan, customer | |
| What the clinic offers | **layanan** (default); **perawatan** or a treatment name inside examples | produk, jual, menjual, penawaran | "produk" only for physical items such as skincare |
| One location | **cabang** | gerai, outlet, toko | |
| How patients are served | **datang ke klinik**, **kunjungan ke rumah**, **konsultasi online**, **produk dikirim** | datang ke tempat, dikirim, Anda yang datang | Labels only; stored values stay (§3.5) |
| A multi-branch clinic as a whole | **Seluruh klinik** | Seluruh brand | Decision D4 |
| Other named businesses | landing: **klinik lain yang disebut AI**; report: **bisnis lain yang disebut** (exact, VOICE.md) | pesaing (unless verified), kompetitor | AI also names hospitals and directories, so the report keeps "bisnis" |
| The AI | **AI** (landing, journey); **model AI** (report) | model names, provider names, "API" | |
| The tested AI, where scope must be named (FAQ, report "Tentang audit ini") | **AI buatan OpenAI, pembuat ChatGPT, dengan pencarian web** | ChatGPT as the tested system; any model ID outside "Detail teknis" | VOICE.md §2 |
| Search data | **data pencarian** only after gate G-DATA (§4.3) | DataForSEO, keyword tool names | |

### 3.5 Do not change

- **Stored or AI-facing values.** The frozen intake labels in
  `src/lib/intake/frozen-intake.ts` (`SERVICE_CHANNEL_LABELS`), stored
  categories and offerings, the question-writer and report prompts
  (`src/lib/audit/*instruction*.ts`, `src/lib/audit/openai.ts`), fingerprints
  and storage keys. They feed the AI or saved sessions; changing them changes
  the audit, not the copy.
- **Exact settled strings**, unless decision D3 is approved: "Tanpa menyebut
  bisnis Anda", "Menyebut bisnis Anda", "Bisnis Anda muncul di X dari 10
  pertanyaan", "Bisnis Anda direkomendasikan di Y dari 10 pertanyaan", "Tidak
  diuji", "Download PDF". Always keep the review confirmation sentence: "Saya
  sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam
  pertanyaan audit."
- **`/terms`, `/privacy`, `/support`.** Milestone S5 owns them.
- **Files not on the live path.** Do not edit `src/lib/intake/IntakeJourney.tsx`,
  `screens-bab1.tsx`, `screens-bab2.tsx`, `questions-screen.tsx`,
  `src/app/audit/ReportView.tsx` or `src/app/audit/SourceHero.tsx`. The live
  journey is `SmartIntakeJourney.tsx` and the files it imports.
- **Non-clinic businesses** still work end to end; they simply read clinic
  words (decision D11). Do not build conditional wording.

---

## 4. The message

### 4.1 The pain, in the reader's words

The page must make a clinic owner or marketer nod at four things:

1. "We pay to be found." Ads, SEO, Instagram, Google Maps, influencers.
2. "Patients now ask AI first." For example: *"Klinik gigi di Bekasi yang bagus
   buat pasang behel, biayanya berapa?"*
3. "AI answers with a few clinics." Usually a short list, often with price
   ranges, doctors and a checklist of what to ask before booking.
4. "We cannot see that answer." Ad dashboards and website statistics do not
   show what AI said, so nobody knows whether the clinic was on the list.

Then Nuave's answer: ask the questions patients ask, show the answers as they
are, show which clinics were named, and list what to fix first.

Two more pains are real and sit behind the journey and the report, not the
hero:

5. **"AI can be wrong about us."** An old address, a doctor who left, last
   year's hours. The journey already asks for this ("Ada info yang sering salah
   ditulis AI?") and the report covers wrong or missing public information.
6. **"Every clinic looks the same, and the rules forbid the usual claims."**
   Health advertising rules bar superlatives, comparisons, discounts and
   testimonials (§4.4), so clinics win on clear, correct public facts. That is
   exactly what Nuave's fix list is about.

Do not lead with rising ad costs, agencies reporting vanity metrics, or
dependence on influencers: the research found no solid Indonesian evidence for
them (Appendix A.2).

Evidence behind this framing is in Appendix A. None of it goes on the page as a
statistic.

### 4.2 What we may say (true today)

- Nuave asks 10 questions the way patients ask, without the clinic's name.
- The answers come from AI with live web search, shown word for word with
  their sources.
- The report shows which other clinics or businesses AI named.
- The report lists fixes based on what was observed, with who should do each.
- Rp99.000, one payment, no subscription. The identity check is free. The
  report arrives by email, usually within 15 minutes after the questions are
  approved, at most 24 hours, with a refund if it fails (the exact delivery
  promise in `src/lib/orders/promise.ts`).
- No patient data and no account access are needed. Public information only.

### 4.3 The data claim (gate G-DATA)

Yasir wants the page to say, simply, that Nuave works from reliable data about
what patients search, how often, and why, without naming any vendor.

**Today the live product does not use search-demand data.** A one-off
DataForSEO test for a skin clinic exists on branch
`claude/laughing-fermi-prsgqf` (an experiment, not the product). Saying it now
would be untrue, which `AGENTS.md` rule 8 forbids.

- **Ship today's wording** (in §5 and §6).
- **Switch to the data wording** in the three marked places (§5.3, J27 lead,
  FAQ Q3) only when (a) the question step uses search-demand data in
  production, and (b) the founder records it in `docs/DECISION_LOG.md`.
- Data wording, once allowed: "Nuave memakai data pencarian tepercaya: apa yang
  dicari calon pasien, seberapa sering, dan untuk apa."
- Never name, anywhere a customer reads: DataForSEO, GLM or any model ID,
  OpenAI Responses API, Cheaper Inference, Cloudflare, Resend, "provider",
  "API", tokens, or AI cost. Midtrans stays on checkout only, because the
  customer is sent to its payment page.

### 4.4 What we never say (clinic rules on top of VOICE.md)

- **No claim a clinic could not make in its own ad.** Permenkes
  1787/MENKES/PER/XII/2010 Pasal 5 bars health-service ads that mislead, raise
  unrealistic expectations, compare quality with other facilities, praise the
  facility excessively (superlatives, "satu-satunya"), run sales promotions in
  any form (discounts, rewards) or carry testimonials. The dentists' code
  (KODEKGI) adds "garansi keberhasilan perawatan". Nuave's copy, examples and
  sample report model the same restraint (Appendix A.2; this is copy
  sensitivity, not legal advice). Plain facts a clinic publishes as
  information are fine: services, schedule, which kinds of doctors practise,
  method, location, payment options.
- **No superlatives or "only"** in our copy or our examples: terbaik, nomor 1,
  paling, satu-satunya, termurah, #1. AI cannot verify them either.
- **No comparison with other clinics' quality** in examples ("bukan seperti
  klinik lain", "lebih bagus dari"). State the clinic's own facts.
- **No discounts, promos or prices as a hook** in our examples. A patient may
  ask about price; our copy does not sell on price.
- **No guarantees or forecasts:** pasti muncul, dijamin, naik peringkat, tambah
  pasien, a percentage.
- **No fear or urgency:** jangan sampai tertinggal, klinik Anda hilang dari AI,
  countdowns.
- **No medical claims or quality judgements** about any clinic or treatment in
  our voice (aman, tidak sakit, hasil permanen, paling ampuh). A patient
  question in an example may say what a patient would type, but keep it about
  choosing a clinic, not about a medical result.
- **No testimonials, ratings, client logos or market statistics** until they
  are real, sourced and approved.
- **No "ChatGPT says"** for Nuave's own answers. ChatGPT may name the patient's
  habit only.

### 4.5 Taste: how it should read

- Like a calm adviser who knows clinic marketing and has read the AI answers.
  Not a tech startup, not an agency pitch.
- **Show, then say.** A patient question and an AI answer come before any
  claim about Nuave.
- **Concrete over abstract:** a treatment, a district, a weekday, a doctor's
  schedule, a price range. Never "solusi", "optimalkan", "visibilitas digital",
  "ekosistem".
- **One idea per line.** Every button says what happens next.
- **Two registers.** Patient questions sound typed on a phone ("Cariin…",
  "ada rekomendasi?", "biayanya berapa?", "bisa BPJS nggak?"). Lines for the
  owner use "Anda", short and polite, with light spoken words where a person
  would use them (cuma, dulu).
- **Rotate** clinic types (gigi, kecantikan, khitan, anak, umum) and cities
  (Bandung, Bekasi, Depok, Surabaya, Medan, Makassar, Semarang). Do not make
  every example a dental clinic in Jakarta.

| Instead of | Write |
|---|---|
| Optimalkan visibilitas klinik Anda di era AI | Klinik Anda disebut AI? |
| Nuave memakai model GLM dan data DataForSEO | Ditulis seperti calon pasien bertanya. |
| Jangan sampai klinik Anda tertinggal | (say nothing; show the example) |
| Skor visibilitas AI 40% | Disebut di 4 dari 10 pertanyaan |
| Satu-satunya klinik terbaik di Bandung | Dokter gigi praktik sampai jam 9 malam |
| Apa saja yang Anda jual? | Apa saja layanan klinik Anda? |
| Bagaimana pelanggan mendapatkannya? | Bagaimana pasien dilayani? |

---

## 5. Landing page

Files: `src/components/landing/Landing.tsx`; the hero headline and the form are
shared with the `/audit` entry (J01) and live in `src/lib/intake/step-one-screens.tsx`
(`HeroHeadline`, `WebsiteForm`).

The order of sections stays: hero, how patients ask, how it works, what you
get, final button, footer.

Preview: [`clinic-plan/landing-before-after.png`](./clinic-plan/landing-before-after.png)
shows the live page next to this plan's words (with D8), rendered in the real
page styles at 390 px. It is a preview made by swapping the text in a browser,
not a design file; the tables below are the source of truth.

### 5.1 Hero (also J01 on `/audit`)

| Element | Now | New | Where |
|---|---|---|---|
| H1, line 1 | Bisnis Anda | **Klinik Anda** | `step-one-screens.tsx` ~L218 |
| H1, line 2 (violet) | disebut AI? | disebut AI? (keep) | same |
| Lead | Sekarang pelanggan tanya AI dulu. Nuave bertanya seperti mereka, lalu menunjukkan bisnis mana yang disebut. | **Sekarang calon pasien tanya AI dulu. AI biasanya cuma menyebut beberapa klinik. Lihat apakah klinik Anda salah satunya.** | ~L221 |
| Field placeholder | Website atau akun Instagram | **Website atau Instagram klinik** | ~L165 |
| Field label (screen readers) | Website atau akun Instagram bisnis | **Website atau akun Instagram klinik** | ~L151 |
| Button | Cek bisnis saya di AI | **Cek klinik saya di AI** (D2) | ~L191, `Landing.tsx` ~L434, and the notice in `SmartIntakeJourney.tsx` ~L151 that names the button |
| Note under button | Pratinjau gratis. Audit Rp99.000, sekali bayar. | **Pratinjau gratis. Audit Rp99.000, sekali bayar. Tanpa data pasien.** (D12). Balance the text so "Tanpa data pasien." does not break in the middle on a phone. | ~L197 |
| Invalid input | Masukkan satu website atau akun Instagram yang valid. | keep | |

The fallback lead, if Yasir prefers to keep the method sentence: "Sekarang
calon pasien tanya AI dulu sebelum memilih. Nuave bertanya seperti mereka, lalu
menunjukkan klinik mana yang disebut."

Fit, measured in the live type styles on 2026-10-23: both leads take the same
space as today's lead (3 lines at 390 px, 4 at 320 px); "Klinik Anda" and
"disebut AI?" each stay on one line at 320 px.

### 5.2 "How patients ask" (the cream band)

**Recommended (D8): replace the abstract phone with a real example.** It is the
only place the page shows the problem, and today it shows nothing a clinic
recognises.

Layout, top to bottom, inside the existing cream band:

1. Heading (h2): **Begini calon pasien bertanya ke AI**
2. A row of single-choice chips (radiogroup, accessible name "Jenis klinik"):
   **Gigi · Kecantikan · Khitan · Anak · Umum**. Default: Gigi. No auto-rotation.
3. The patient's question as a dark chat bubble on the right, the same look as
   the J03 `CustomerBubble` in `step-one-screens.tsx`.
4. The AI reply as a white card on the left, with the small sparkle mark from
   the phone art and the label "Jawaban AI": the line "Berikut beberapa klinik
   yang bisa dipertimbangkan:" and three fictional clinics, each with its area.
5. Bold line: **Klinik Anda ada di jawaban ini?**
6. Under it (copy-sm, ink-600): **Dashboard iklan dan statistik website Anda
   tidak menunjukkannya.**
7. Caption (caption, ink-600): **Contoh. Nama klinik fiktif.**

The five examples. Every name must contain *Fiksi*, *Rekaan* or *Contoh*, so it
can never match a real clinic.

| Chip | Patient asks | AI reply lists |
|---|---|---|
| Gigi | Klinik gigi di Bekasi yang bagus buat pasang behel, biayanya kira-kira berapa? | Klinik Gigi Rekaan (Bekasi Barat) · Senyum Fiksi Dental (Summarecon) · Klinik Contoh Sehat (Galaxy) |
| Kecantikan | Mau laser flek hitam pertama kali di Surabaya, klinik mana yang dokternya berpengalaman? | Klinik Kulit Rekaan (Darmo) · Estetika Fiksi (Pakuwon) · Klinik Contoh Ayu (Rungkut) |
| Khitan | Sunat anak di Depok metode klamp, ada yang bisa home service? | Rumah Khitan Rekaan (Margonda) · Klinik Sunat Fiksi (Cinere) · Khitan Contoh (Sawangan) |
| Anak | Klinik anak di Bintaro buat vaksin, jadwal dokternya kapan aja? | Klinik Anak Rekaan (Bintaro) · Klinik Fiksi Ceria (Pondok Aren) · Klinik Contoh Bunda (Pesanggrahan) |
| Umum | Klinik dekat Kemang yang bisa pakai BPJS dan buka sampai malam? | Klinik Pratama Rekaan (Kemang) · Klinik Fiksi 24 Jam (Mampang) · Klinik Contoh Medika (Cipete) |

Build notes: reuse the existing chip and bubble styles, add no library, make no
network call, respect reduced motion (swap the example without animation), and
announce the new example politely (`aria-live="polite"`) when a chip changes.
At 320 px the chips wrap to two lines and nothing scrolls sideways.

**If D8 is not approved** (copy only, keep the phone picture):

| Element | Now | New |
|---|---|---|
| Heading | Pelanggan tidak lagi cek website satu per satu. Mereka tanya ke AI. | **Calon pasien tanya AI. AI menjawab dengan beberapa nama klinik.** |
| Caption | Contoh tampilan. Nama bisnis fiktif. | **Dashboard iklan dan statistik website Anda tidak menunjukkannya.** |

### 5.3 "Cara kerjanya"

`Landing.tsx` `STEPS` (~L100). The titles must match the journey (J06, J10).

| Step | Title now | Title new | Body now | Body new |
|---|---|---|---|---|
| 1 | Cek bisnis Anda | **Cek klinik Anda** | Masukkan website. Kami tampilkan bisnis yang kami temukan. Gratis. | **Masukkan website klinik. Kami tunjukkan klinik yang kami temukan. Gratis.** |
| 2 | Ceritakan bisnis Anda | **Ceritakan klinik Anda** | Setelah bayar Rp99.000, periksa informasi yang sudah kami isi. | **Setelah bayar Rp99.000, cek layanan dan info klinik yang sudah kami isi.** |
| 3 | Jalankan audit | Jalankan audit (keep) | Periksa 10 pertanyaan. Laporan dikirim ke email Anda. | **Setujui 10 pertanyaan calon pasien. Laporan dikirim ke email Anda.** |

After G-DATA only, add one line under the list (copy-sm, ink-600): "Nuave
memakai data pencarian tepercaya: apa yang dicari calon pasien, seberapa
sering, dan untuk apa."

### 5.4 "Yang Anda terima"

`Landing.tsx` `RECEIVES` (~L122). Heading and "Lihat contoh laporan" stay.

| Icon | Now | New |
|---|---|---|
| Chart | Skor kemunculan, misalnya 4 dari 10 | **Di berapa dari 10 pertanyaan klinik Anda disebut dan direkomendasikan** |
| Quote | Jawaban AI apa adanya, dengan sumbernya | keep |
| People | Bisnis lain yang disebut | **Klinik lain yang disebut AI** |
| **New**, Tabler `IconInfoCircle` | none | **Info klinik yang keliru atau kurang di jawaban AI** |
| Checklist | Saran perbaikan sesuai temuan | **Saran perbaikan untuk tim Anda, sesuai temuan** |

The new fourth line is true to the report (it covers wrong, inconsistent or
missing public information when observed) and names pain 5 in §4.1.

### 5.5 Final button

| Element | Now | New |
|---|---|---|
| Button | Cek bisnis saya di AI | **Cek klinik saya di AI** |
| Note | Ini bukan peringkat atau jaminan. Jawaban AI bisa berubah dari waktu ke waktu. | keep |

### 5.6 Example report sheet ("Contoh laporan")

`Landing.tsx` `ExampleReportSheet` (~L158). Preview with D3, D4 and D9:
[`clinic-plan/example-sheet-proposed.png`](./clinic-plan/example-sheet-proposed.png).

| Element | Now | New |
|---|---|---|
| Note | Contoh tampilan. Nama bisnis fiktif. Hasil untuk bisnis Anda bisa berbeda. | **Contoh. Nama klinik fiktif. Hasil klinik Anda bisa berbeda.** |
| Scope line | Seluruh brand · Bandung | **Seluruh klinik · Bandung** (D4) |
| Count, line 1 | Bisnis Anda muncul di 3 dari 10 pertanyaan | **Klinik Anda muncul di 3 dari 10 pertanyaan** (D3; if not approved, keep) |
| Count, line 2 | Direkomendasikan di 1 dari 10 pertanyaan | keep |
| Question card | Pertanyaan 2, "Cariin klinik gigi di Dago yang buka sore, setelah jam kantor." and its quote | keep |
| **New block (D9)** | none | Heading "Bisnis lain yang disebut". Two rows: "Klinik Gigi Rekaan · Bisnis lain diunggulkan · Pertanyaan 2, 5, 7" and "Senyum Fiksi Dental · Disebut dalam jawaban · Pertanyaan 2". Same labels as the real report. |
| **New block (D9)** | none | Card with the tag "Kerjakan dulu", the action "Tampilkan jadwal praktik dokter di halaman layanan.", and "Berdasarkan Pertanyaan 2". |
| Footnote | Laporan lengkap juga memuat semua jawaban AI apa adanya, sumber yang tersimpan, bisnis lain yang disebut, dan saran perbaikan. | **Laporan lengkap memuat 10 jawaban AI apa adanya, dengan sumbernya.** (only if D9 ships; otherwise keep) |

### 5.7 Browser tab and link preview

| Where | Now | New |
|---|---|---|
| `src/app/layout.tsx` title | Nuave · Apakah brand Anda muncul di ChatGPT? | **Nuave · Klinik Anda disebut AI?** |
| `src/app/layout.tsx` description | Nuave memberi Anda laporan bagaimana AI menyebut brand Anda dan apa yang bisa diperbaiki. | **Calon pasien kini tanya AI sebelum memilih klinik. Nuave menunjukkan apakah klinik Anda disebut, klinik mana yang disebut, dan apa yang perlu dibenahi.** |
| `src/app/audit/page.tsx` title | Buat AI Visibility Report \| Nuave | **Cek klinik Anda di AI \| Nuave** |
| `src/app/audit/page.tsx` description | Periksa satu bisnis, tinjau sepuluh pertanyaan, lalu buat AI Visibility Report berbasis bukti. | **Masukkan website klinik, setujui 10 pertanyaan calon pasien, lalu terima AI Visibility Report.** |

Also set `openGraph.title` and `openGraph.description` to the same text, so the
WhatsApp preview matches. The optional preview image is in §9.

---

## 6. Audit journey, screen by screen

Screen codes follow the Figma file (J01 to J35). "keep" means do not touch.
Wherever a test, `tests/e2e/journey.ts` constant or verify-nuave feature file
quotes a changed string, update it in the same pull request.

### J01 entry
Same hero and form as §5.1. No other change.

### J02 to J04 free check (`step-one-screens.tsx`, `BusinessCheckScreen`)

| Element | Now | New |
|---|---|---|
| J02 title | Sebentar, kami cari bisnis Anda | **Sebentar, kami cari klinik Anda** |
| J02 lead | Biasanya kurang dari 10 detik. | keep |
| Checklist, line 3 | Membaca deskripsi bisnis | **Membaca deskripsi klinik** |
| J03 label | Sambil menunggu: begini pelanggan bertanya ke AI | **Sambil menunggu: begini calon pasien bertanya ke AI** |
| J03 bubble | Klinik gigi dekat kantor di Dago yang buka sore apa ya? | keep |
| J03 line | Laporan Anda menunjukkan apakah bisnis Anda ikut disebut, dan siapa saja yang disebut. | **Laporan Anda menunjukkan apakah klinik Anda ikut disebut, dan klinik mana saja yang disebut.** |
| J04 lead | Anda bisa lanjut sekarang dengan nama bisnis Anda. Website Anda kami baca lengkap setelah pembayaran. | **Anda bisa lanjut sekarang dengan nama klinik Anda. Website Anda kami baca lengkap setelah pembayaran.** |
| J04 field | Nama bisnis | **Nama klinik** |

### J05 clinic found (`BusinessFoundScreen`; button in `SmartIntakeJourney.tsx` ~L2041, ~L2055)

| Element | Now | New |
|---|---|---|
| Title | Kami menemukan bisnis Anda | **Kami menemukan klinik Anda** |
| Title when the name was typed (J04 path) | Bisnis yang akan diaudit | **Klinik yang akan diaudit** |
| Lead | Ini yang kami baca dari website Anda. Hasil audit belum ada di sini. | keep |
| Card label (screen readers) | Bisnis yang ditemukan | **Klinik yang ditemukan** |
| Link line | Bukan bisnis Anda? · Ganti tautan bisnis | **Bukan klinik Anda? · Ganti tautan** |
| Rename sheet title and field | Nama bisnis | **Nama klinik** |
| Rename hint | Pakai nama yang dikenal pelanggan. | **Pakai nama yang dikenal pasien.** |
| Primary button | Ya, ini bisnis saya | **Ya, ini klinik saya** |

### J06 three steps (`StepsScreen`)

| Element | Now | New |
|---|---|---|
| Step 1 body | Cek bisnis Anda, lalu bayar Rp99.000 sekali. Tanpa langganan. | **Cek klinik Anda, lalu bayar Rp99.000 sekali. Tanpa langganan.** |
| Step 2 title | Ceritakan bisnis Anda | **Ceritakan klinik Anda** |
| Everything else | | keep |

### J07 and J08 checkout (`order-screens.tsx`)

| Element | Now | New |
|---|---|---|
| Info line (~L370) | Pembayaran belum menjalankan audit. Anda masih memeriksa informasi bisnis dan menyetujui pertanyaan dulu. | **Pembayaran belum menjalankan audit. Anda masih memeriksa info klinik dan menyetujui pertanyaan dulu.** |
| Price, promise, email, payment methods, consent | | keep |

### J09 paid reading (`journey-moments.tsx`)

| Element | Now | New |
|---|---|---|
| Found group label | Produk | **Layanan** |
| Nothing found | Website Anda belum menyebut produk atau cabang dengan jelas. Anda bisa mengisinya di langkah berikutnya. | **Website Anda belum menyebut layanan atau cabang dengan jelas. Anda bisa mengisinya di langkah berikutnya.** |

### J10 Step 2 cover (`SmartIntakeJourney.tsx` ~L2335)

| Element | Now | New |
|---|---|---|
| Title | Ceritakan bisnis Anda | **Ceritakan klinik Anda** |
| Body | Sebagian besar sudah kami isi dari website Anda. Anda cukup memeriksa, mengetuk, lalu lanjut. | keep |

### J11 audit focus (`smart-target-screens.tsx`)

| Element | Now | New |
|---|---|---|
| Lead when the owner chose | Ini menentukan sudut pandang seluruh audit. | **Pertanyaan audit akan fokus ke pilihan ini.** |
| Card 1 | Seluruh brand · Semua cabang dan produk dinilai sebagai satu bisnis | **Seluruh klinik · Semua cabang dan layanan, sebagai satu klinik** (D4) |
| Card 2 | Satu cabang · Satu lokasi tertentu, misalnya {first branch} | keep |
| Card 3 | Satu produk · Satu produk atau layanan tertentu | **Satu layanan · Satu layanan tertentu, misalnya {first service}** (D4) |

For card 3, take `{first service}` from `prepared.offerings.proposed[0]`, the
same pattern card 2 uses for its branch. With no service found, show "Satu
layanan tertentu". This is the one small logic change in this screen. It makes
the most useful choice for a marketer (audit the treatment you advertise)
self-explanatory.

### J12 branch and service lists (`smart-target-screens.tsx`)

| Element | Now | New |
|---|---|---|
| Branch sheet name placeholder | Contoh: nama bisnis dan daerahnya | **Contoh: nama klinik dan daerahnya** |
| Service card | Satu produk · Satu produk atau layanan tertentu | **Satu layanan · Satu layanan tertentu** |
| Service list heading | Produk mana? | **Layanan mana?** |
| Nothing found | Kami belum menemukan produk di website Anda. Tambahkan produk atau layanan yang ingin diaudit. | **Kami belum menemukan layanan di website Anda. Tambahkan layanan yang ingin diaudit.** |
| Add chip and sheet title | Tambah produk | **Tambah layanan** |
| Status | Pilih atau tambahkan satu produk atau layanan. | **Pilih atau tambahkan satu layanan.** |
| Sheet field | Nama produk atau layanan | **Nama layanan** |
| Branch texts | Cabang mana? and the rest | keep |

### J13 what patients call you (`smart-detail-screens.tsx`)

| Element | Now | New |
|---|---|---|
| Title, whole clinic | Bisnis Anda biasanya disebut apa? | **Klinik Anda biasanya disebut apa?** |
| Title, one branch | Lokasi ini biasanya disebut apa? | **Cabang ini biasanya disebut apa?** |
| Title, one service | Produk atau layanan ini biasanya disebut apa? | **Layanan ini biasanya disebut apa?** |
| Lead | Pilih kata yang dipakai pelanggan saat bertanya ke AI. | **Pilih kata yang dipakai calon pasien saat bertanya ke AI.** |
| Preview caption | Contoh pertanyaan pelanggan | **Contoh pertanyaan calon pasien** |
| Add field placeholder | Sebutan yang dikenal pelanggan | **Sebutan yang dikenal pasien** |

### J14 services

| Element | Now | New |
|---|---|---|
| Title | Apa saja yang Anda jual? | **Apa saja layanan klinik Anda?** |
| Lead, prefilled | Sudah kami pilih dari website. Ketuk untuk membuang, ketik untuk menambah. | keep |
| Lead, empty | Tambahkan produk atau layanan utama yang pelanggan cari. | **Tambahkan layanan utama yang dicari pasien.** |
| Lead, one-service focus | Audit ini berfokus pada {target}. Penawaran lain dari website Anda tetap tercatat sebagai konteks dan tidak ikut diaudit. | **Audit ini fokus ke {target}. Layanan lain tetap dicatat, tetapi tidak ikut diaudit.** |
| Chip group name (screen readers) | Produk dan layanan; Katalog penawaran | **Layanan; Daftar layanan** |
| Field | Produk atau layanan lain | **Layanan lain** |
| Placeholder | Contoh: nama produk, nama layanan | **Contoh: nama layanan atau perawatan** |
| Status | Pilih atau tambah setidaknya satu produk atau layanan. | **Pilih atau tambah setidaknya satu layanan.** |

### J16 who searches (`smart-customer-screens.tsx`)

| Element | Now | New |
|---|---|---|
| Title | Siapa yang biasanya mencari bisnis Anda? | **Siapa yang biasanya mencari klinik Anda?** |
| Lead | Pilih semua yang cocok. Boleh lebih dari satu. | **Pilih semua yang cocok.** ("Boleh lebih dari satu" repeats "semua") |
| Common chips (`CUSTOMER_TYPES`, ~L162) | keluarga, mahasiswa, pekerja kantoran, pekerja remote, wisatawan, komunitas, pelaku usaha | **orang tua dengan anak, remaja, mahasiswa, pekerja kantoran, ibu hamil, keluarga, lansia, calon pengantin** |
| Chip group name | Jenis pelanggan | **Jenis pasien** |
| Add field | Pelanggan lain | **Pasien lain** |
| Add placeholder | Contoh: ibu hamil, lansia | **Contoh: atlet, ekspatriat** |
| Limit messages | …jenis pelanggan… / Daftar pelanggan… | same sentences with **pasien** |

Why "orang tua dengan anak": for khitan and children's clinics the person who
asks AI is the parent, not the patient.

### J17 what they look for

| Element | Now | New |
|---|---|---|
| Title | Apa yang mereka cari saat memilih? | **Apa yang mereka cari saat memilih klinik?** |
| Lead | Boleh dilewati. | keep |
| "Mereka butuh…" and "Mereka membandingkan…" | | keep |
| Common comparison chips (`COMPARISON_REASONS`, ~L294) | harga, lokasi, kualitas, ulasan, jam buka, kecepatan layanan | **biaya, lokasi, dokter, metode perawatan, ulasan, jam praktik, BPJS atau asuransi, waktu tunggu** |
| Needs field | Kebutuhan pelanggan lain | **Kebutuhan pasien lain** |
| Needs placeholder | Contoh: periksa tanpa antre lama | keep |
| Comparison field | Pertimbangan pembeli lain | **Pertimbangan pasien lain** |
| Comparison placeholder | Contoh: parkir | **Contoh: dokter perempuan, produk halal** |

Why these: patients compare price, the doctor, the method (for khitan:
klamp, stapler, sealer, laser; for beauty: laser or peeling), reviews, schedule,
BPJS or insurance, and waiting time. Some Muslim patients ask for a female
doctor or halal products; that stays an example, not a default chip
(Appendix A.2).

### J18 how patients are served (`smart-detail-screens.tsx`)

| Element | Now | New |
|---|---|---|
| Title | Bagaimana pelanggan mendapatkannya? | **Bagaimana pasien dilayani?** |
| Lead | Pilih semua yang berlaku. Sudah kami isi dari website. | keep |
| Tile `on_premise` | Datang ke tempat | **Datang ke klinik** |
| Tile `on_customer` | Anda yang datang | **Kunjungan ke rumah** |
| Tile `online` | Online | **Konsultasi online** |
| Tile `delivery` | Dikirim | **Produk dikirim** |
| Tile order | on_premise, delivery, on_customer, online | **on_premise, on_customer, online, delivery** |
| Group name | Cara pelanggan mendapatkan yang Anda tawarkan | **Cara pasien dilayani** |

Only the labels and their order change. The values (`on_premise` and so on) and
`SERVICE_CHANNEL_LABELS` in `frozen-intake.ts` stay. Optional icon swaps
(Tabler): `on_premise` IconBuildingStore → IconBuildingHospital, `delivery`
IconTruckDelivery → IconPackage.

### J19 where patients come from

| Element | Now | New |
|---|---|---|
| Title | Di mana pelanggan Anda berada? | **Pasien Anda datang dari mana?** |
| Lead, tiles, "Area mana saja?", "Tambah kota" | | keep |

### J20 and J21 clinics compared with you (`smart-customer-screens.tsx`)

| Element | Now | New |
|---|---|---|
| Title, Nuave found names (J20) | Siapa yang mungkin dibandingkan dengan Anda? | **Klinik mana pembanding Anda?** |
| Title, none found (J21) | Bisnis mana yang sering dibandingkan dengan Anda? | **Klinik mana pembanding Anda?** (one title; the two leads still differ) |
| Lead, J20 | AI sering menyebut bisnis lain. Centang yang Anda kenal. | **AI sering menyebut klinik lain. Centang yang Anda kenal.** |
| Lead, J21 | Kami belum menemukannya di website Anda. Tulis 1 sampai 5 nama. | keep |
| List name | Bisnis pembanding | **Klinik pembanding** |
| Add field | Nama atau website bisnis | **Nama atau website klinik** |
| Add hint | Contoh: usaha di jalan yang sama, atau yang sering disebut pelanggan. | **Contoh: klinik di jalan yang sama, atau yang sering disebut pasien.** |
| Skip 1 | Belum tahu? Lewati, kami bandingkan dengan bisnis sejenis. | **Belum tahu? Lewati, kami bandingkan dengan klinik sejenis.** |
| Skip 2 | Tidak ada pembanding langsung? Lewati juga. | keep |
| Limit message | Pilih paling banyak 5 bisnis pembanding. … | **Pilih paling banyak 5 klinik pembanding. …** |

### J22 and J23 what makes you different

| Element | Now | New |
|---|---|---|
| Title | Apa yang membuat bisnis Anda berbeda? | **Apa yang membuat klinik Anda berbeda?** |
| Lead | Satu atau dua kalimat. Pakai info yang memang publik. | keep |
| Field | Pembeda bisnis | **Pembeda klinik** |
| Placeholder (~L824) | Contoh: satu-satunya di area ini yang… | **Contoh: dokter spesialis anak praktik setiap Sabtu** |
| Keyboard starters (`STARTER_PHRASES`) | buka sampai malam, dokter spesialis, harga terjangkau, bisa daftar online, berdiri sejak | **buka sampai malam, dokter spesialis, menerima BPJS, bisa daftar online, berdiri sejak** |
| Examples heading | Contoh dari bisnis lain | **Contoh dari klinik lain** |
| Examples (`EXAMPLES`) | 3 examples: "Dokter gigi praktik sampai jam 9 malam, daftar cukup lewat WhatsApp." · "Perawatan wajah langsung oleh dokter, bukan terapis." · "Satu-satunya klinik anak di Dago yang buka hari Minggu." | 1. keep "Dokter gigi praktik sampai jam 9 malam, daftar cukup lewat WhatsApp." (Klinik gigi) · 2. **"Perawatan wajah dikerjakan langsung oleh dokter."** (Klinik kecantikan; drops "bukan terapis", a comparison) · 3. **"Khitan metode klamp, bisa di rumah pasien."** (Klinik khitan) · 4. **"Klinik anak yang buka hari Minggu, dengan dokter spesialis anak."** (Klinik anak; replaces "Satu-satunya…") |
| Inline example while typing (~L848) | Contoh: "Satu-satunya klinik anak di Dago yang buka hari Minggu." | **Contoh: "Klinik anak yang buka hari Minggu, dengan dokter spesialis anak."** |
| Public fact toggle | Ada info yang sering salah ditulis AI? | keep |
| Public fact placeholder | Contoh: kami buka setiap hari, termasuk Minggu. | **Contoh: klinik kami sudah pindah ke Jl. Merdeka No. 10.** |
| Public fact hint | Hanya fakta publik, bukan info pribadi atau rahasia. | **Hanya fakta publik. Jangan tulis data pasien.** |

The rule behind these examples: facts AI can check (schedule, doctor, method,
location, payment options), never superlatives.

### J24 Step 3 cover (`SmartIntakeJourney.tsx` ~L2346)

| Element | Now | New |
|---|---|---|
| Body | Cek profil bisnis dan 10 pertanyaan sekali saja. Setelah itu Nuave bekerja sendiri, dan laporan dikirim ke email Anda. | **Cek profil klinik dan 10 pertanyaan sekali saja. Setelah itu Nuave bekerja sendiri, dan laporan dikirim ke email Anda.** |

### J25 and J26 profile review and edit sheets (`SmartReview.tsx`)

| Element | Now | New |
|---|---|---|
| Title | Ini profil yang akan Nuave pakai | **Ini profil klinik yang akan Nuave pakai** |
| Lead | Cek sekilas. Ketuk Ubah jika ada yang kurang tepat. | keep |
| Section titles (`SECTION_TITLES`) | Bisnis · Calon pelanggan · Pembanding | **Klinik · Calon pasien · Pembanding** (sheet titles follow: "Ubah Klinik", "Ubah Calon pasien") |
| Fact "Menjual" | Menjual | **Layanan** |
| Fact "Cara mendapatkan" | Cara mendapatkan | **Cara dilayani** |
| Fact "Bisnis pembanding" | Bisnis pembanding | **Klinik pembanding** |
| Focus text | Seluruh brand · Satu produk: {x} | **Seluruh klinik · Satu layanan: {x}** |
| Channel words (`CHANNEL_WORDS`) | datang ke tempat, dikirim, Anda yang datang, online | **datang ke klinik, produk dikirim, kunjungan ke rumah, konsultasi online** |
| Comparator text | …Nuave membandingkan dengan bisnis sejenis. (two lines) | **…Nuave membandingkan dengan klinik sejenis.** |
| Alias help (~L286) | Nama lain membantu Nuave memastikan pertanyaan tanpa nama bisnis benar-benar tidak menyebut bisnis Anda. | **Nama lain membantu Nuave memastikan pertanyaan tidak menyebut klinik Anda.** |
| Sheet blocks that repeat J16 to J19 titles | | follow the new titles |
| Confirmation sentence, "Buat pertanyaan audit" | | keep |

### J27 and J28 the ten questions (`SmartQuestionsScreen.tsx`)

| Element | Now | New |
|---|---|---|
| Lead | Ditulis seperti calon pelanggan bertanya. Anda bisa mengubahnya. | **Ditulis seperti calon pasien bertanya. Anda bisa mengubahnya.** After G-DATA: "Dipilih dari data pencarian, ditulis seperti calon pasien bertanya. Anda bisa mengubahnya." |
| Tag | 10 Tanpa menyebut bisnis Anda | **10 Tanpa menyebut klinik Anda** (D3; if not approved, keep) |
| Row caption | Tanpa menyebut bisnis Anda | **Tanpa menyebut klinik Anda** (D3) |
| Explainer toggle | Kenapa pertanyaannya tanpa nama bisnis? | **Kenapa tanpa nama klinik?** |
| Explainer text | Calon pelanggan yang belum mengenal bisnis Anda bertanya tanpa menyebut namanya. Pertanyaan seperti ini menunjukkan apakah AI menyebut bisnis Anda dengan sendirinya. Nama bisnis pembanding juga tidak dipakai, supaya AI tidak diarahkan. | **Calon pasien yang belum mengenal klinik Anda bertanya tanpa menyebut namanya. Dari sini terlihat apakah AI menyebut klinik Anda dengan sendirinya. Nama klinik pembanding juga tidak dipakai, supaya AI tidak diarahkan.** |
| **Provenance line, live mode (~L515)** | Pertanyaan disiapkan melalui satu panggilan provider. Model diminta: {model}. Model diterima: {model}. Biaya: {USD}. | **Remove from the screen in live mode** (D7). Keep the data in stored evidence; keep the synthetic-mode label for testers. Keep any `data-*` attribute tests need, without visible text. |
| Edit sheet hint | Tulis satu pertanyaan seperti calon pelanggan bertanya. Mengubah kalimat dapat mengubah apa yang diukur. | **Tulis satu pertanyaan seperti calon pasien bertanya. Mengubah kalimat dapat mengubah apa yang diukur.** |
| Preparing lead | Ditulis seperti calon pelanggan bertanya, dari profil yang Anda setujui. | **Ditulis seperti calon pasien bertanya, dari profil yang Anda setujui.** |
| **Retry note, live mode (~L627)** | Mencoba lagi mengirim permintaan baru dan dapat menambah biaya penggunaan AI. | **Remove** (D7). The per-order cost limit on the server already protects spending. |
| Start sheet description and body (~L316) | …Setelah dimulai, informasi bisnis dan pertanyaan tidak dapat diubah. | **…Setelah dimulai, info klinik dan pertanyaan tidak dapat diubah.** |
| Start sheet, technical-problem note, buttons | | keep |

### J29 and J30 running and ready (`src/app/audit/SmartAuditStage.tsx`)

| Element | Now | New |
|---|---|---|
| J29 title (~L404) | Audit bisnis Anda sedang berjalan | **Audit klinik Anda sedang berjalan** |
| Everything else on J29 and J30 | | keep |

### Help sheet ("Bantuan") and saved-progress banner
Keep. They are already neutral.

---

## 7. Report and emails

The report is the thing clinics share with their owner, team or agency. Its
evidence rules (Spec 012) do not change. Only labels and fixed sentences do.

### 7.1 Report page (`src/app/audit/report/*`, `src/lib/audit/report-*.ts`)

| Element | Now | New | Decision |
|---|---|---|---|
| Scope line under the name (`DirectTenReportPage.tsx` ~L83), one per focus | whole: Seluruh brand {name}; service: Produk atau layanan: {x}; branch: Lokasi: {x} ({address}) | whole: **Seluruh klinik** (the name is already the title above); service: **Layanan: {x}**; branch: **Cabang: {x} ({address})** | D4 |
| Header facts (~L182) | Sistem yang diuji: OpenAI Responses API · Model jawaban: {model ID} | **AI yang diuji: AI buatan OpenAI, dengan pencarian web** | D6 |
| Headline labels | Bisnis Anda muncul di X dari 10 pertanyaan · Bisnis Anda direkomendasikan di Y dari 10 pertanyaan | **Klinik Anda muncul di X dari 10 pertanyaan · Klinik Anda direkomendasikan di Y dari 10 pertanyaan** | D3 |
| Relationship labels (`DirectTenReportBody.tsx` ~L25, `ReportAnswer.tsx` ~L31) | Brand Anda diunggulkan | **Klinik Anda diunggulkan** (the other three stay) | D1; without D1 use "Bisnis Anda diunggulkan", because "brand Anda" breaks VOICE.md either way |
| Other-businesses note (~L171) | Daftar ini terbatas pada catatan terstruktur yang tersimpan, bukan seluruh nama dalam jawaban. | **Hanya nama yang tercatat dari jawaban di atas. Jawaban lengkap bisa memuat nama lain.** | always |
| Action owners (~L19) | Pemilik bisnis · Admin · Pemasaran · Pengembang web | **Pemilik klinik · Admin klinik · Tim pemasaran · Pengelola website** | D1 |
| Per-answer details (`ReportAnswer.tsx`) | Waktu pengamatan · Sistem · Model diminta · Model jawaban | **Waktu pengamatan** shown; system and model IDs inside a collapsed **"Detail teknis"**. The PDF may print the fold closed; the JSON export keeps the full record. | D6 |
| "Tentang audit ini" bullet (~L264) | Jawaban dari API tidak mewakili seluruh aplikasi atau percakapan model AI. | **Jawaban di aplikasi AI yang dipakai calon pasien bisa berbeda.** | D6 |
| Method sentence (`report-language.ts` ~L527) | Kami menguji 10 pertanyaan satu per satu melalui {system} ({model}) dengan pencarian web. 10 pertanyaan tanpa nama tidak menyebut bisnis dalam pertanyaannya. 0 pemeriksaan langsung menyebut nama bisnis. … | **Kami menanyakan 10 pertanyaan satu per satu ke AI buatan OpenAI, dengan pencarian web. Tidak ada pertanyaan yang menyebut nama klinik Anda.** Keep the coverage sentence and "Disebut bukan berarti direkomendasikan…". The model ID moves to "Detail teknis". | D6. Check the report-language validators before changing it. |
| Code-owned actions (`report-noncorrective.ts`) | …brand Anda… / …tentang brand… | **…klinik Anda… / …tentang klinik…** | D3. These strings are stored inside saved reports and checked for an exact match: keep the old strings valid so reports already delivered still open. Add a test that an old saved report still renders. |
| Footer, section names, "Download PDF", "Unduh bukti JSON" | | keep | |

### 7.2 Emails (`src/lib/orders/mail.ts`)

| Email | Now | New |
|---|---|---|
| Payment received (~L162) | …Lanjutkan di browser yang sama untuk mengisi data bisnis Anda. … | **…Lanjutkan di browser yang sama untuk melengkapi profil klinik Anda. …** |
| Report ready, audit failed | | keep |

### 7.3 Sensitive-input notices (`src/lib/audit/types.ts` ~L22, ~L24; mirrored in `tests/e2e/journey.ts` `SENSITIVE_INPUT_NOTICE`)

| Now | New |
|---|---|
| …Pilih halaman lain yang hanya memuat informasi publik tentang brand Anda. | **…Pilih halaman lain yang hanya memuat informasi publik tentang klinik Anda.** |
| …Gunakan hanya informasi publik tentang brand Anda, tanpa data pribadi atau akses akun. | **…Gunakan hanya informasi publik tentang klinik Anda, tanpa data pasien, data pribadi, atau akses akun.** |

---

## 8. FAQ (`src/app/faq/page.tsx`)

Replace the page text with the answers below. Keep the page structure. Leave
`docs/content/website/FAQ.md` in place and add one line at its top: "Superseded
for the live page by `docs/content/CLINIC_CONTENT_PLAN.md` §8."

- Page title: **Pertanyaan yang sering diajukan | Nuave**
- Description: **Jawaban singkat untuk klinik: cara kerja Nuave, biaya, waktu laporan, data, dan batasannya.**
- H1: **Pertanyaan yang sering diajukan** (no intro paragraph)

| Question | Answer |
|---|---|
| Apa itu Nuave? | Nuave mengecek apa jawaban AI saat calon pasien mencari klinik seperti klinik Anda. Anda menerima satu laporan: apakah klinik Anda disebut atau direkomendasikan, klinik mana yang disebut, dan apa yang perlu dibenahi dulu. |
| AI apa yang diuji? | AI buatan OpenAI, pembuat ChatGPT, dengan pencarian web. Jawaban di aplikasi ChatGPT di ponsel Anda bisa sedikit berbeda. |
| Pertanyaan apa yang ditanyakan? | 10 pertanyaan seperti yang biasa ditanyakan calon pasien, tanpa menyebut nama klinik Anda. Anda bisa memeriksa dan mengubah setiap pertanyaan sebelum audit dimulai. (After G-DATA, add: "Pertanyaan dipilih dari data pencarian calon pasien.") |
| Berapa biayanya? | Rp99.000 untuk satu audit, sekali bayar, tanpa langganan. Tidak ada pajak atau biaya tambahan dari Nuave. Bayar dengan QRIS, transfer bank, GoPay, atau DANA. |
| Berapa lama sampai laporan jadi? | Laporan biasanya siap dalam 15 menit setelah Anda menyetujui pertanyaan, paling lama 24 jam. Jika gagal, kami kembalikan uang Anda. Link laporan dikirim ke email Anda dan berlaku 12 bulan. |
| Apakah Nuave butuh data pasien atau akses akun klinik? | Tidak. Nuave hanya membaca informasi publik klinik Anda, seperti website dan Instagram. Jangan masukkan data pasien, kata sandi, atau data pribadi. |
| Apa bedanya dengan SEO atau iklan yang sudah berjalan? | SEO dan iklan membawa orang ke website dan media sosial Anda. Nuave melihat sisi lain: apa yang dijawab AI saat calon pasien bertanya. Laporannya bisa Anda bagikan ke tim pemasaran atau agensi. |
| Apakah klinik saya pasti disebut AI setelah perbaikan? | Tidak ada yang bisa menjamin itu. Jawaban AI bisa berubah. Laporan menunjukkan apa yang terlihat saat diuji, dan perbaikan mana yang layak dikerjakan dulu. |
| Klinik saya punya beberapa cabang. Bisa? | Bisa. Pilih fokus audit: seluruh klinik, satu cabang, atau satu layanan. |
| Kapan sebaiknya dicek lagi? | Kami sarankan audit lagi sekitar 6 sampai 8 minggu setelah perbaikan dikerjakan. |
| Bagaimana kalau ada masalah? | Email support@nuave.ai dan sebutkan nomor pesanan Anda. |

The delivery promise sentence must stay word for word as
`DELIVERY_PROMISE` in `src/lib/orders/promise.ts`. If S5 changes it, the FAQ
follows S5.

---

## 9. Illustrations

- **Keep all current 3D art.** It already reads as a clinic.
- **Optional:** `public/v2/3d/phone-chat.webp` (used in the J27b start sheet,
  J29, and the landing band if D8 is not adopted) shows two small shops without
  the green cross. Re-export it from Figma page 11 with the cross sign on both
  answer rows. Low priority.
- **Optional, worth it:** a link-preview image (1200 x 630) for WhatsApp and
  social shares: the busy clinic on white, "Klinik Anda disebut AI?" in the
  hero style, the Nuave logo. Add it with the Next.js `opengraph-image` file
  convention or `metadata.openGraph.images`. Clinic owners share links on
  WhatsApp; today the preview has no picture.
- **Do not add** stock photos of doctors or patients, before-and-after images,
  syringes, teeth close-ups or any medical imagery. They are off-tone and sit
  close to what health advertising rules restrict.

---

## 10. Design changes: worth it, and not worth it

Worth it (each is optional, each has a fallback):

1. **The patient-question example on the landing (D8).** Today the only section
   meant to show the problem is an abstract picture. A real question and a real
   looking answer, switchable by clinic type, shows the pain in two seconds and
   shows that Nuave knows dental, beauty, khitan, children's and general
   clinics. One small component in the existing band, reusing existing chip and
   bubble styles. Moderate effort.
2. **Two blocks in the example report sheet (D9):** "Bisnis lain yang disebut"
   and one "Kerjakan dulu" action. They show the competitor view and the fix
   list, which is what a marketing team pays for. Small effort.
3. **Removing the stack lines (D7, D6).** Required by the founder's instruction.
   Small effort.
4. **Link-preview image (§9).** Small effort.

Not worth it now:

- A long-form landing (testimonials, logos, pricing tables, feature grids):
  there is no real proof to show yet, and VOICE.md forbids invented proof.
- Separate landing pages per clinic type: wait until one type actually buys
  (`AGENTS.md` working rule 5).
- Changing how questions are written for clinics: a method change, not copy
  (§14).

---

## 11. Decisions for the founder

Reply "approve all recommended" to accept every recommended default, or name
the ones to change. The implementing agent records the answers in
`docs/DECISION_LOG.md`.

| ID | Decision | Recommended | If not approved |
|---|---|---|---|
| D1 | Clinic words across the landing and journey (klinik, calon pasien, pasien, layanan), with VOICE.md §2 and §7.1 amended to match | Approve | Fix only findings FJ3 to FJ5 (§2.2), the FAQ and the metadata |
| D2 | The settled button "Cek bisnis saya di AI" becomes **"Cek klinik saya di AI"** | Approve | Keep "Cek bisnis saya di AI" |
| D3 | The settled report labels become "Klinik Anda muncul…", "Klinik Anda direkomendasikan…", "Tanpa menyebut klinik Anda", "Menyebut klinik Anda"; code-owned report actions follow, with old saved reports still valid | Approve, in PR C | Keep the six settled labels |
| D4 | Focus names "Seluruh klinik / Satu cabang / Satu layanan" in the journey and the report scope line | Approve | Keep "Seluruh brand / Satu produk" |
| D5 | The search-data line stays off until gate G-DATA (§4.3) is met | Approve | Not applicable: the line cannot ship while untrue |
| D6 | The report names the tested AI in plain words ("AI buatan OpenAI, dengan pencarian web"); system and model IDs move into "Detail teknis". This replaces item 10 of the 2026-10-21 design decision | Approve | Keep the header facts, but still rewrite the "Jawaban dari API…" bullet |
| D7 | Remove the question model, provider and cost line, and the "biaya penggunaan AI" retry note, from live screens | Approve (follows your instruction) | Not applicable |
| D8 | Landing section 2 becomes the patient-question example (§5.2) | Approve | Use the copy-only fallback in §5.2 |
| D9 | Two new blocks in the example report sheet (§5.6) | Approve | Keep the sheet, new words only |
| D10 | Rewrite the FAQ (§8) | Approve | At least remove the false statements |
| D11 | Non-clinic businesses see clinic words; no conditional wording | Approve | Not recommended: it means building two vocabularies |
| D12 | Add "Tanpa data pasien." to the note under the hero button | Approve | Drop the sentence |

---

## 12. Implementation steps

Branch from current `origin/main`. Each pull request follows
`docs/WORKFLOW.md` "Evidence per change" and needs an independent verdict.

### PR A: clinic words on the landing and in the journey (D1, D2, D4, D7, D11, D12)

1. Landing: §5.1, §5.3, §5.4, §5.5, §5.7, the §5.2 fallback copy (unless PR B
   ships first) and the word changes in §5.6 (not the new blocks).
2. Journey: all of §6, including the two removed lines (D7), the new chip
   lists, the examples, the starters and the J11 service example.
3. Emails and notices: §7.2 and §7.3.
4. Tests and tooling: update `tests/e2e/journey.ts` constants (for example
   `CHECK_BUSINESS`, `WEBSITE_FIELD`, `BRAND_HEADING`, `CONFIRM_BRAND`,
   `CATEGORY_HEADING`, `OFFERINGS_HEADING`, `TARGET_CUSTOMER_HEADING`,
   `CUSTOMER_NEEDS_HEADING`, `SERVICE_HEADING`, `MARKET_HEADING`,
   `COMPETITORS_HEADING`, `SKIP_COMPETITORS`, `DIFFERENTIATOR_HEADING`,
   `REVIEW_HEADING`, `SENSITIVE_INPUT_NOTICE`, the `FocusChoice` type and the
   service tile names), every unit and e2e test that asserts an old string, and
   the verify-nuave feature files that quote one. Change a test only where it
   quotes copy; never weaken what it checks.
5. Documents: amend `docs/VOICE.md` §2 (rows for klinik Anda, calon pasien,
   pasien, layanan, the button, and the "Seluruh brand" note, which becomes
   "Seluruh klinik") and §7.1 (the hero example); add a dated entry to
   `docs/DECISION_LOG.md` quoting the founder's approval.

### PR B: show how patients ask (D8, D9)

1. Build §5.2 (recommended version) and the two §5.6 blocks.
2. Unit test: each chip shows its own question and answer; the selected chip
   is announced; no request is made.
3. Screenshots at 320 px, 390 px and desktop, with and without reduced motion.

### PR C: clinic words in the report and the FAQ (D3, D6, D10)

1. §7.1 rows and §8.
2. Keep old saved reports opening (see the `report-noncorrective.ts` row) and
   test it.
3. Amend `docs/VOICE.md` (settled labels) and add the decision-log entry. Note
   the label change against Spec 012 in the entry; do not rewrite Spec 012.

### Later, only after G-DATA

Switch the three marked lines (§5.3, J27 lead, FAQ Q3) to the data wording, in
one small pull request that links the decision-log entry.

---

## 13. Checks before handing back

1. `npm run verify` passes (the offline gate; no live AI call).
2. `verify-nuave drive all` passes in synthetic mode. Attach the screenshots of
   every changed screen to the pull request.
3. Phone check at **320 px and 390 px**: the landing, J02 to J06, J11, J13 to
   J25, J27, J29 and the report header. No heading longer than three lines, no
   sideways scrolling, chips wrap cleanly. If a new title is too long, shorten
   it with the same meaning and say so in the pull request.
4. Word scan of the live files. Review every hit; comments and identifiers are
   fine, customer-visible text is not:

   ```sh
   grep -rnE "pelanggan|bisnis Anda|brand Anda|Seluruh brand|Satu produk|jual|kedai|pekerja remote" \
     src/components/landing src/app/layout.tsx src/app/audit/page.tsx src/app/faq \
     src/app/audit/SmartAuditStage.tsx src/lib/intake/SmartIntakeJourney.tsx \
     src/lib/intake/{step-one-screens,order-screens,smart-target-screens,smart-detail-screens,smart-customer-screens,journey-moments,SmartReview,SmartQuestionsScreen}.tsx
   ```

5. Stack scan of the rendered pages in live mode (or with the live-mode branch
   forced in a unit test): no "glm", "provider", "Model diminta", "Model
   diterima", "USD", "API", "Responses" or model IDs in visible text, except
   inside "Detail teknis" if D6 shipped.
6. New Indonesian prose has no em dash or en dash, except time ranges such as
   08.00–21.00 (VOICE.md §3).
7. Every example name contains Fiksi, Rekaan or Contoh. No example or new line
   contains terbaik, nomor 1, paling, satu-satunya, termurah, dijamin or pasti
   (the FAQ question "Apakah klinik saya pasti disebut AI…", answered "no", is
   the one allowed exception).
8. "data pencarian" appears nowhere unless G-DATA is recorded.
9. The pull request description has the finish condition, the commands and
   their outputs, the screenshots, and the "Corrections:" line.

---

## 14. Out of scope, and follow-ups worth their own decision

- **Question writing for clinics.** Patients ask about the doctor, price range,
  BPJS, schedule and method ("metode klamp", "dokter spesialis"). Calibrating
  the question writer is a method change: it touches the protected prompt and
  the 2026-09-17 checkpoint. Separate spec.
- **A clinic guardrail for report actions.** The report's AI should not
  recommend what Permenkes 1787/2010 and the professional codes restrict:
  testimonials, before-and-after promises, superlatives or "satu-satunya",
  comparisons with other clinics, discounts or promos, success guarantees
  (Appendix A.2). It touches the report prompt contract. Separate spec. Only
  after it ships may the FAQ add: "Apakah saran Nuave aman untuk aturan iklan
  kesehatan?" "Saran Nuave berupa informasi faktual seperti layanan, jadwal
  dokter, dan lokasi. Nuave tidak menyarankan testimoni, diskon, atau klaim
  seperti 'terbaik'." (founder approval needed; no legal claim).
- **Testing Google's AI answers as well as OpenAI's.** The DataForSEO test did
  both. A product decision.
- `/terms`, `/privacy`, `/support` (S5); the FAQ's visual style (it still uses
  the old navigation and footer); the desktop layout (still the phone column);
  ads and outreach messages.

---

## Appendix A. Evidence behind the message (internal, not for the page)

### A.1 What AI answers look like for clinic questions

From the DataForSEO experiment on branch `claude/laughing-fermi-prsgqf`
(2026-10-23; one skin clinic in Jakarta; five questions to `gpt-5.6-luna` with
web search, and five Google searches). Observed once, not generalised:

- The AI answers were shortlists of about five or six clinics, often as a table
  with the treatment and a price range, citing the clinics' own treatment and
  price pages.
- They named doctors' credentials (specialist titles, the professional
  association's directory) and told the patient to check, before booking, who
  performs the treatment, the doctor's practice licence and the product's
  registration.
- One answer put public hospital clinics and a professional directory ahead of
  private clinics.
- In the four questions that did not name the clinic, it appeared in two.
- Google showed an AI Overview for all five searches.

What this means for copy: "AI answers with a few clinics" is observed, and the
example report's quote ("informasi jadwal dokter dan biaya perawatannya belum
banyak ditemukan") reflects what AI actually looks for. It does not support any
promise that publishing a price list will get a clinic named.

### A.2 Clinic marketing reality and health advertising rules

Desk research on 2026-10-23. V means the source was read and says this; U means
it was not confirmed first-hand. Vendor case studies are marked as such. This
is background for the copy, not legal advice.

**How clinics market**

- Clinic job ads list Instagram, Facebook, TikTok, WhatsApp, Google Ads, Meta
  Ads, marketplaces and the website, judged on a "target ROI"; one role covers
  "media sosial, Google Maps, dan review pasien" (V; [Kitalulus R-Klinik](https://kitalulus.com/lowongan/detail/digital-marketing-mj3t),
  [Loker.id Klinik Utama Apollo](https://www.loker.id/pemasaran/pemasaran-digital/google-adwords-spesialis-klinik-utama-apollo-jakarta-pusat.html),
  [Kalibrr](https://www.kalibrr.id/id-ID/c/kitabisa-com/jobs/256011/marketing-klinik-freelance)).
- Ads usually end in a WhatsApp chat; a hospital converts 10 to 15% of chats into
  appointments, and a beauty chain booked about 1,500 to 2,000 patients from
  15,000 to 20,000 campaign leads while its admins were "kewalahan" (V, vendor
  case studies; [Qiscus, 23 Jul 2026](https://www.qiscus.com/en/blog/whatsapp-marketing-for-hospitals/),
  [SleekFlow, 30 Jun 2026](https://sleekflow.io/id-id/customer-stories/benings-clinic)).
  The same chain tracked ad-to-booking conversion by hand.
- Aesthetic clinics grew about 20% from 2023 to 2024 (4,438 to 5,072) amid
  "persaingan yang semakin ketat" (V, count secondhand;
  [Fortune Indonesia, 6 Oct 2026](https://www.fortuneidn.com/luxury/bisnis-klinik-kecantikan-makin-kompetitif-dermalift-bidik-layanan-00-4pj81-jc5c0w)).
  A dental clinic study found 70.3% of respondents did not know the clinic
  existed among many similar competitors (V; [UMN thesis, Jun 2024](https://kc.umn.ac.id/id/eprint/34653/2/BAB_I.pdf)).
- A UGM dental-clinic workshop: clinics spend heavily on social ads but one
  negative review can become a reputation crisis (V;
  [FKG UGM, 16 Jun 2026](https://fkg.ugm.ac.id/en/dokter-gigi-hebat-tak-cukup-klinik-yang-abai-terhadap-branding-pengalaman-pasien-akan-ditinggalkan/)).
  A GP asked how to advertise "tapi tetap sesuai aturan" (V;
  [Alomedika](https://alomedika.com/komunitas/topic/etika-beriklan-ask-the-expert)).
- Not found: Indonesian evidence on rising clinic ad costs, on agencies
  reporting vanity metrics, or on dependence on influencers. Do not lead with
  them.

**How patients choose**

- Beauty: reviews and social media weigh heavily (ZAP Beauty Index 2024, U;
  2018 survey "73 persen review dari internet", V,
  [Popbela](https://www.popbela.com/beauty/make-up/fakta-perempuan-zap-beauty-index-00-f3v4p-xwt4vh)).
  Some Muslim women ask whether a treatment is halal and prefer female staff (V;
  [Halal MUI, 28 Jan 2026](https://halalmui.org/menjawab-keresahan-muslimah-mengapa-klinik-kecantikan-halal-kian-dibutuhkan/)).
- Khitan: parents compare method (klamp, stapler, sealer, laser, kauter),
  needle-free anaesthesia, home service, package tiers, price (about Rp550 ribu
  to Rp3,8 juta in Bandung) and free WhatsApp consultation (V;
  [HaiBunda, 2 Jul 2025](https://www.haibunda.com/parenting/20250626203901-61-369852/10-tempat-sunat-terdekat-di-bandung-dan-sekitarnya-beserta-estimasi-biaya)).
- Directories show "Pilih Jadwal", "Biaya Konsultasi", "Buat Janji" (V;
  [Alodokter](https://www.alodokter.com/cari-dokter/dokter-kedokteran-gigi-anak/klinik-mhdc-wisma-46)).

**AI search in Indonesia**

- Google AI Overviews in Indonesian from 2024 (V;
  [Google Indonesia, 5 Sep 2024](https://blog.google/intl/id-id/products/platforms/memperkaya-hasil-penelusuran-ai-overviews-kini-hadir-di-indonesia/));
  AI Mode in Bahasa Indonesia from 9 Sep 2025 (V;
  [Google Indonesia](https://blog.google/intl/id-id/products/explore-get-answers/google-search-memperkenalkan-mode-ai-di-indonesia/)).
- Indonesia is one of ChatGPT's top five markets by weekly users (V, OpenAI
  quoted by [Thurrott, 23 Sep 2025](https://www.thurrott.com/a-i/327134/openais-cheap-chatgpt-go-plan-launches-in-indonesia));
  more than a third of Indonesians use ChatGPT monthly (V;
  [We Are Social, 11 Nov 2025](https://wearesocial.com/id/blog/2025/11/digital-2026-top-digital-and-social-media-trends-in-indonesia/)).
- Globally, about one in four of ChatGPT's weekly users asks a health question
  each week (V; [Medical Economics, 7 Jan 2026](https://www.medicaleconomics.com/view/40-million-people-now-use-chatgpt-daily-for-health-questions-openai-report-finds)),
  and 69% of health workers have had to correct wrong AI information from
  patients (V, Philips Future Health Index 2026;
  [Industry.co.id, 19 Aug 2026](https://www.industry.co.id/read/154680/pasien-indonesia-mulai-masuk-era-ai-philips-ungkap-tantangan-kepercayaan-dan-kesiapan-sdm)).
- No Indonesian data was found on AI use for choosing local businesses.

**Advertising rules**

- Permenkes 1787/MENKES/PER/XII/2010, Pasal 5: health-service ads and
  publications may not mislead, raise unrealistic expectations, compare service
  quality with other facilities, praise the facility excessively (including
  superlatives and "satu-satunya"), promote unproven methods, run sales
  promotions in any form (discounts, rewards), carry testimonials in mass
  media, or use academic or professional titles. Pasal 8 bars health workers
  from advertising for facilities. Listed as "Berlaku" by pasal.id; no
  revocation found, status not legally confirmed (V text, U status;
  [pasal.id](https://pasal.id/peraturan/permen/permenkes-no-1787-menkes-per-xii-2010-tahun-2010),
  [Kemenkes, 10 Jun 2011](https://kemkes.go.id/id/rumah-sakit-boleh-beriklan)).
- Dentists' code (KODEKGI, PB PDGI 2017 to 2020 edition) bans self-praise,
  superlatives, "satu-satunya", "garansi keberhasilan perawatan", named patient
  testimonials with photos and results, and discount flyers (V;
  [KODEKGI PDF](https://fkg.unair.ac.id/en/wp-content/uploads/2021/06/Buku-Kode-Etik-Kedokteran-Gigi-2020.pdf)).
  Doctors' ethics (KODEKI, MKEK fatwa 029/2021) bar self-advertising and
  designed patient praise (V; [Hukumonline, 10 Mar 2023](https://www.hukumonline.com/klinik/a/etika-dokter-dalam-membuat-konten-medsos-lt640aeb611e0d7/)).
- Practice is looser than the rules: big chains run discounts, show
  testimonials and call themselves "terbaik" (V, read 2026-10-23). Nuave still
  holds its own copy and advice to the rules.

**Words clinics use**

- "Pasien" is standard in dental, khitan, general and children's clinics.
  Beauty clinics use both "pasien" and "customer" or "client"; medically framed
  chains and their promotions say "pasien" (V; job ads and chain pages above).
- Common: pasien baru, pasien lama, review pasien, cabang, reservasi, booking,
  Buat Janji, jadwal praktik, treatment, perawatan, home service, konsultasi
  gratis via WhatsApp.

---

## Appendix B. Length budget

| Element | Budget |
|---|---|
| Hero H1 | Two lines at 320 px; at most 12 characters per line |
| Hero lead | At most 22 words, at most 3 sentences |
| Section heading | At most 8 words |
| Step body, bullet | At most 12 words |
| Journey title | At most 8 words, at most 3 lines at 320 px |
| Journey lead | At most 14 words, or none when the title and controls explain themselves |
| Button | At most 4 words, starting with a verb or "Ya" |

The test for every line: if you delete it and the screen still makes sense,
delete it. If a line needs another line to explain it, rewrite the first one.
