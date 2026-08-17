# Nuave voice and language — v2 writing contract (candidate)

> Status: **Candidate for founder review** (DRAFT — do not edit copy or code from this document)
> Version: writing-standard-v2 (Indonesian) · Created: 2026-08-17
> Owner: Orchestrator
> Output of: leaf-worker copy review. This file does NOT overwrite `docs/drafts/VOICE.md`.
>
> This document is the versioned Indonesian writing contract candidate. It
> extends [`VOICE.md`](VOICE.md) (v1, the general voice guide) with the
> founder's settled terminology and translation preferences and the mechanical
> resolutions from
> [`../reviews/002-voice-candidate-review.md`](../reviews/002-voice-candidate-review.md).
> It is the source a future runtime `report-language` Indonesian contract
> (writing-standard version + `nuave-report-v3`) should compile from.
>
> Authority order: `AGENTS.md` → `docs/VISION.md` → `docs/PRODUCT.md` →
> `docs/AUDIT.md` → this document. Exact settled customer-facing labels and
> exact evidence are never rewritten to satisfy this guide.

---

## Part 1 — The versioned writing contract

### 1. Purpose

Define, in one place, the Indonesian words, tone, numbers, and sentence rules a
fresh AI session needs so every customer-facing string reads as natural,
honest, and consistently Nuave. This contract is prescriptive for copy; it is
descriptive for the exact evidence and settled labels it must preserve.

### 2. Terminology table

The founder's settled preferences are encoded below. "Exact" means the string
is settled elsewhere (`AUDIT.md`, `DECISION_LOG.md`) and must be copied
verbatim, even when it does not follow the general prose rules.

| Meaning | Prefer (customer-facing) | Avoid |
|---|---|---|
| Your business (prose) | **brand Anda** | bisnis Anda (outside the settled labels below) |
| Settled exact labels (verbatim) | **Tanpa menyebut bisnis Anda** · **Menyebut bisnis Anda** · **Bisnis Anda muncul di X dari 10 pertanyaan** · **Tidak diuji** · **Download PDF** | any paraphrase or spelling variant of these five |
| Prospective customer | **calon pelanggan** | calon klien, calon customer, customer potensial, bare "customer" |
| Existing customer | **pelanggan** | klien, customer |
| The AI model as the answering/deciding actor | **model AI** | bare "AI" where it means the model ("disebut oleh model AI", "diuji ke model AI") |
| AI as a category/concept | **AI** (era AI, pencarian AI, jawaban AI) | mesin AI, semua AI, "the AI" |
| The tested product | the exact product name, e.g. **ChatGPT** | semua AI, mesin AI, generic "AI" as the tested system |
| Data consistency | **sinkron** / **samakan** / **konsisten** | seragam |
| Competitor (when a competitor is verified) | **pesaing** | kompetitor |
| Other named businesses in the report | **bisnis lain yang disebut** | daftar kompetitor (unless the context verifies competitors) |
| Report artifact name (kept in English) | **AI Visibility Report** | AI Visibility Audit, AI Visibility Score (score band is retired) |
| Authority terms (kept in English) | **expertise** · **customer journey** · **touchpoint** | keahlian / perjalanan pelanggan / titik kontak where the authority term is intended |
| Re-check | **cek ulang** | monitoring, pemantauan real-time |
| Finding | **temuan** | insight |
| Non-appearance | **tidak muncul dalam jawaban ini** | tidak terlihat di AI, tidak dikenal AI |
| Failed test | **tidak dapat diuji** / **belum berhasil diuji** | visibilitas nol, "tidak muncul" for a technical failure |
| Mention | **disebut** | terekspos |
| Recommend | **direkomendasikan** / **disarankan** | menang, peringkat teratas |
| Download action (exact) | **Download PDF** | di-download, didownload, "Unduh laporan" as the button label |
| Fact-review action | **Periksa pertanyaan audit** | Review pertanyaan audit |
| Landing CTA (settled) | **Cek bisnis saya di AI** | "Audit bisnis saya" as the primary hero CTA |
| syariah (standing convention) | lowercase **syariah** | Syariah |

Notes:

- **`brand Anda` vs `bisnis Anda`:** `brand Anda` is the default for general
  prose. The five settled labels intentionally use `bisnis Anda`. Until the
  founder decides otherwise, do NOT "fix" those labels to `brand Anda`, and do
  NOT use `brand Anda` inside a phrase that is meant to be the settled label.
- **`model AI` vs `AI`:** use `model AI` only where the AI system is the thing
  that learns, answers, decides, or is being tested. Keep `AI` for the general
  category. `ChatGPT` is named explicitly and needs no gloss.
- **English authority terms** stay English because they signal credibility to
  the Indonesian SMB audience; never transliterate them in customer copy.

### 3. Tone rules

Nuave sounds like a careful adviser: **plain, calm, specific, respectful, never
alarmist or all-knowing.** Apply these invariants to every surface:

- Use **`Anda`**, never `kamu`, `Bapak/Ibu`, or `pengguna` in product copy.
- Use `Nuave` for product behavior, `audit ini` for a bounded result, `kami`
  for team communication. Never use `kami` to imply a machine judgment was
  human-reviewed.
- Keep **observation, interpretation, and action** separate. Lead with the
  result or required action, then evidence, then next step, then limitation.
- Use active voice. Prefer the specific verb (`samakan`, `tambahkan`,
  `perbarui`, `periksa`, `jelaskan`).
- **No em dashes (—) and no en dashes (–) in prose.** Use a comma, a period,
  or `sampai` / `hingga`. The only allowed en dash is inside a time range
  written as `08.00–21.00`.
- **Short sentences.** One idea per sentence; no multi-clause sentences that
  are one English sentence in disguise.
- No false urgency, fear, or hype (`mendominasi AI`, `jangan sampai
  tertinggal`, `tak terlihat di dunia AI`, countdowns, scarcity).
- No ranking, guarantee, or forecast (`Pertama Ditemukan`, `dijamin`,
  `terbukti meningkatkan`, `membeli hingga 67% lebih banyak`, "ditemukan,
  dipercaya, langsung dipilih").
- State negative findings without dramatizing. A failed test or a non-appearance
  is evidence, not a verdict on the business's quality or future.
- Keep counts with their denominators. Never turn an empty denominator into
  zero performance; use **Tidak diuji**.

### 4. Numerals, dates, and currency

- **Money:** `Rp99.000` — no space after `Rp`; thousands separated by a full
  stop. One audit is **Rp99.000**, with no tax or fee added at checkout.
- **Quote validity:** the unpaid Order Preview keeps the `Rp99.000` total for
  **30 days**; after expiry the customer must refresh the preview before paying.
- **Dates:** `17 Agustus 2026` — day, spelled month, year; no leading zero, no
  slash form (`17/08/26`).
- **Time:** `10.00` and `08.00–21.00` (24-hour, period separator). In prose,
  write ranges with `sampai` or `hingga`.
- **Percentages:** `50%`, no space; decimal separator is a comma (`14,2%`).
- **Thousands vs decimals:** thousands use a full stop; decimals use a comma.
- **Counts before percentages.** Pair a percentage with its base count when it
  helps understanding. The headline result is a direct count plus denominator,
  e.g. **Bisnis Anda muncul di 4 dari 10 pertanyaan** and **4/10** — not a
  percentage, band, rank, or peer benchmark.

### 5. Sentence-length rules

- Target **12–20 words** for Nuave-authored explanatory sentences.
- **25 words is the hard ceiling in validated report fields** (the current
  runtime `report-language.ts` enforces it as a failure). Treat 25 words as a
  review signal only outside those validated fields (per review 002 F-01).
- Exact evidence — tested questions, AI answer excerpts, business and
  competitor names, source titles, official terms, dates, models — is exempt
  from prose-length guidance and must be copied verbatim.
- Prefer short paragraphs and lists over long blocks; use numbered steps only
  when order matters.

### 6. Prohibited AI-isms and jargon

Avoid these unless they are exact quoted evidence or an official term.

**Hype and fear:** `mendominasi AI`, `tak terlihat di dunia AI`, `jangan sampai
tertinggal`, `revolusi`, `game changer`, `transformasi` without specific
meaning, `peluang besar` without evidence, countdowns/scarcity/urgency.

**Unsupported certainty:** `pasti`, `dijamin`, `terbukti meningkatkan`,
`penyebabnya adalah` without causal evidence, `semua`/`setiap`/`selalu`,
forecasts of recommendation, traffic, leads, revenue, or sales.

**Corporate / technical filler:** `mengoptimalkan ekosistem digital`,
`meningkatkan presence`, `insight yang actionable`, `leverage`, `deep dive`,
`robust`, `end-to-end solution`, `sinergi`, `dalam rangka`, `terkait hal
tersebut`, `berkenaan dengan`, and internal terms (`execution surface`,
`schema`, `telemetry`, `provider response`) in customer-facing copy.

**Mixed-language and spelling traps:** `di-download` / `didownload`,
`Review pertanyaan`, `Submit` / `Proses` / `OK`, `kompetitor` for `pesaing`,
`klien` / `customer` for `pelanggan`, `seragam` for data, `dikarenakan`
(→ `karena`), `merubah` (→ `mengubah`), `dll.` / `dsb.` / `e.g.` / `i.e.`
(write the phrase out).

**Punctuation:** em dashes and en dashes in prose (see §3).

### 7. Application by surface

The voice is constant; the register and vocabulary shift per surface.

#### 7.1 Landing and order preview (marketing register)

- `brand Anda` throughout. Hero question, e.g. "Apakah brand Anda muncul di
  ChatGPT?".
- Lead with a real observed problem or a clear customer question; sell clarity
  and evidence, not fear of being left behind.
- No conversion/ROI statistics, no `Pertama`, no guarantee, no `5x`/`67%`/`73%`
  figures, and no unsourced market percentages.
- The settled primary CTA is **Cek bisnis saya di AI**; the priced action is
  **Bayar Rp99.000**; an upper non-charging action is **Lanjut ke pembayaran**.
- State the one-audit nature, the `Rp99.000` total, no extra tax/fee, and the
  30-day quote validity.
- Distinguish the free identity preview from the paid audit; never imply the
  business has appeared in AI before observations run.

#### 7.2 Business facts (neutral register)

- Use provenance labels exactly: **Ditemukan di website** · **Ditemukan di
  Google Maps** · **Ditemukan di Instagram** · **Saran Nuave** ·
  **Ditambahkan oleh Anda** · **Perlu diperiksa**.
- Distinguish sourced facts, Nuave suggestions, and customer input. No
  numerical confidence scores, no superlatives (`terbaik`, `nomor satu`,
  `paling dipercaya`).
- Primary action: **Buat pertanyaan audit**. Confirmation: "Saya sudah
  memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan
  audit."

#### 7.3 Questions (customer-perspective register)

- Questions sound like something a real prospective customer would type —
  natural Indonesian, and appropriately informal (`WFC`, `ngopi`, `nggak`,
  `aja`, `Bandingin`) when the category and audience warrant it.
- The two composition labels are exact: **Tanpa menyebut bisnis Anda** and
  **Menyebut bisnis Anda**.
- Primary actions: **Jalankan audit** and **Mulai audit sekarang**. Never
  credits, token-spending, or "prompt" language.

#### 7.4 Report (evidence-led register)

- Lead with the direct count and denominator (headline + `4/10`), with the two
  composition measures directly beneath it.
- Use the three evidence layers with stable labels: **Yang ditemukan** ·
  **Artinya bagi Anda** · **Yang dapat dilakukan**.
- Exact labels: **Tanpa menyebut bisnis Anda** · **Menyebut bisnis Anda** ·
  **Tidak diuji** · **Download PDF**.
- Other named businesses are **bisnis lain yang disebut**, never "competitors"
  without verified context.
- Keep the snapshot limitation beside the summary, not in fine print. Keep the
  artifact title in English (**AI Visibility Report**) with the body in
  Indonesian. Exact excerpts, questions, names, and sources stay verbatim.

#### 7.5 Transactional email (plain, formal register)

- Send as **Tim Nuave <support@nuave.ai>**.
- State the report is ready, the private access action, and the truthful PDF
  status; never promise a download that is not ready.
- Include the snapshot limitation and finite-access wording; no marketing
  consent bundled into the purchase; no response-time promise until one is
  approved; mask the recipient email on any shared status surface.

---

## Part 2 — FINDINGS (copy-review · escalated, not fixed)

These are customer-facing strings that contradict a settled product decision,
the honesty rules (`AGENTS.md` rule 8), or the founder's stated voice
preferences. They are reported here for the orchestrator/founder; **no copy file
or code was edited.** Line numbers are from the files as read on 2026-08-17.

### F1 — HIGH — Landing conversion/ROI statistics violate rule 8
`Landing Page Copy.md` #CalltoAction (lines 90–101) and #Educate (lines 22, 27):
"5x Konversi Lebih Tinggi", "14,2% dibanding 2,8%", "67% CLV Lebih Tinggi",
"membeli hingga 67% lebih banyak dalam jangka panjang", "73% Pembelian di
Kunjungan Pertama". `AGENTS.md` rule 8: *"Never fabricate … conversion data."*
The only cited sources (`MyBrandi.ai`, `Superprompt`) are marketing blogs, not
primary data, and are not verified; the "49% pencarian di ChatGPT" (line 22)
and "90% klien B2B" (line 27) figures carry no source at all. **Action:
remove, or replace only with named, verified, credible sources (or Nuave's own
observed data).**

### F2 — HIGH — Guarantee/ranking implication in the CTA
`Landing Page Copy.md` lines 85–88: "Jadi yang Pertama Ditemukan di Era Answer
Engine" and "Nuave membantu brand Anda ditemukan, dipercaya, dan langsung
dipilih di pencarian AI." Implies a ranking ("Pertama") and guarantees outcomes
("ditemukan, dipercaya, langsung dipilih"). Contradicts `AUDIT.md` (no ranking,
guarantee, or forecast) and the page's own "Ini bukan peringkat / Ini bukan
jaminan / Ini bukan sebab-akibat" section (lines 108–112). "Nuave membantu
brand Anda muncul dalam jawaban ChatGPT" (line 35) reads as an appearance
promise.

### F3 — MEDIUM — "customer" / "klien" instead of "calon pelanggan"
`Landing Page Copy.md`: line 19 "Customer Anda kini bertanya ke AI"; line 20
"Saat calon customer Anda mencari informasi"; line 27 "90% klien B2B
menggunakan ChatGPT". Founder/skill rule: `calon pelanggan` (not `calon klien`,
not `calon customer`, not bare `customer`); `pelanggan` over `klien`.

### F4 — MEDIUM — Agency-era framing
`Landing Page Copy.md` CTA + HowItWorks (conversion stats, "membantu brand Anda
muncul", "Jadi yang Pertama Ditemukan") is agency-pitch language. Confirmed as a
known leftover: `docs/V2_SUBDOMAIN_LAUNCH_PLAN.md` line 90 flags the metadata as
"English and agency-facing ('Client-ready AI Visibility Audits')", and
`User Flow/06 - Audit Report.md` "Known implementation gaps" notes the current
report screen "contains agency-era attribution".

### F5 — MEDIUM — "kompetitor" and "Daftar kompetitor" overstate
`Landing Page Copy.md` line 75: "Daftar kompetitor yang disebutkan — nama
kompetitor yang muncul di pertanyaan yang sama." Two issues: (a) `kompetitor`
should be `pesaing`; (b) settled decision (06 Audit Report #9) says other named
businesses are "other businesses mentioned" unless verified context supports
calling them competitors. "Daftar kompetitor" claims a competitor relationship
the report does not certify.

### F6 — MEDIUM — Settled exact labels drifted on the landing page
`Landing Page Copy.md` lines 58–59: "5 pertanyaan tanpa nama brand Anda" / "5
pertanyaan dengan nama brand Anda". The settled labels are **Tanpa menyebut
bisnis Anda** / **Menyebut bisnis Anda** (`AUDIT.md` lines 224–226). The
landing rewords them and swaps `nama brand` for `bisnis`.

### F7 — MEDIUM — `brand Anda` vs `bisnis Anda` needs a founder decision
The founder preference is `brand Anda` not `bisnis Anda`, but the settled exact
labels use `bisnis Anda` ("Tanpa menyebut bisnis Anda", "Menyebut bisnis Anda",
"Bisnis Anda muncul di X dari 10 pertanyaan"). Customer copy mixes both:
`Landing Page Copy.md` line 3 "Apakah brand Anda muncul di ChatGPT?" vs line 14
"membantu bisnis ditemukan" vs line 72 "bisnis Anda muncul di 4 dari 10";
`Preview.md` line 5 "Kami menemukan bisnis Anda". **Escalate: does `brand Anda`
apply everywhere except the five settled labels, or should the labels themselves
migrate?**

### F8 — MEDIUM — "di-download" / "didownload" vs settled "Download PDF"
`Landing Page Copy.md` line 62 "Laporan bisa di-download"; `Preview.md` line 43
"Laporan PDF yang dapat didownload". The settled primary action label is
**Download PDF** (`AUDIT.md` line 296; `DECISION_LOG.md` 2026-08-17).

### F9 — MEDIUM — bare "AI" where the founder wants "model AI"
Where AI is the answering actor: `Landing Page Copy.md` line 5 "bagaimana AI
menyebut brand Anda", line 20 "disebutkan oleh AI", line 56 "untuk kami uji ke
AI", line 65 "Respon AI dan analisisnya"; `Preview.md` line 23 "10 pertanyaan
untuk diuji ke AI". Founder/skill rule: `model AI` where it means the model.
Bare `AI` remains acceptable for the category ("era AI", "pencarian AI").

### F10 — LOW — Em-dash / en-dash overuse
Founder rule: short sentences WITHOUT em dashes. Instances:
`Landing Page Copy.md` line 75 ("— nama kompetitor …");
`User Flow/04 - Questions.md` line 630 ("bisnis Anda—bukan apakah bisnis Anda
muncul …", customer-facing warning);
`User Flow/03 - Business Facts.md` line 425 ("`[Tulis di sini—opsional]`").
En dashes in time ranges (`08.00–21.00`) are acceptable.

### F11 — LOW — Non-standard or awkward Indonesian
`Landing Page Copy.md`: line 78 "Limitas pengujian" (→ "Keterbatasan
pengujian"); line 106 "Yang tidak bisa laporan ini beritahu" (→ "Apa yang tidak
bisa dijelaskan laporan ini"); line 116 "data yang mengubah isi laporan"
(→ "data yang memengaruhi isi laporan").

### F12 — LOW — "Skor" resurrects the retired score framing
`Landing Page Copy.md` lines 64 and 72: "Skor kemunculan langsung, misalnya
4/10". `DECISION_LOG.md` 2026-08-17 retired the banded "AI Visibility Score" in
favor of a direct count ("Bisnis Anda muncul di 4 dari 10 pertanyaan" + `4/10`).
Prefer the count sentence; avoid "skor".

### F13 — LOW — Report artifact name is inconsistent
Founder term is **AI Visibility Report** (kept English). `User Flow/06 - Audit
Report.md` line 157 titles the sample "AI Visibility Audit"; the "AI Visibility
Score" band is retired. Review 002 F-02 already flags this naming tension. One
canonical English artifact name is needed.

### F14 — LOW — "Review pertanyaan audit" (mixed language)
`Preview.md` line 53 "Review pertanyaan audit". `User Flow/01 - Order
Preview.md` lines 98–100 explicitly prefer **Periksa pertanyaan audit**.

### F15 — LOW — Landing hero CTA contradicts the settled CTA
`Landing Page Copy.md` line 7 "Audit bisnis saya". `User Flow/01 - Order
Preview.md` line 31 sets the accepted landing CTA as **Cek bisnis saya di AI**.

---

## Not changed / not decided here

- No copy file, code, `archive/`, or `node_modules/` was read or modified
  beyond the documents listed in §References.
- F7 and F13 require a founder naming decision; F1 and F2 require removal or a
  verified source before any public launch.
- This document does not set field-level word limits (those belong in the
  runtime `report-language` Indonesian contract) and does not rewrite the
  settled labels or the current application strings.

## References read

- `AGENTS.md`
- `docs/briefs/VOICE.md`
- `docs/drafts/VOICE.md` (unchanged)
- `docs/reviews/002-voice-candidate-review.md`
- `docs/AUDIT.md` (Plain-language writing standard; labels `Tanpa menyebut
  bisnis Anda` / `Menyebut bisnis Anda` / `Download PDF` / `Tidak diuji`)
- `docs/DECISION_LOG.md` (score retirement, Rp99.000 + 30-day quote, CTA)
- `docs/PRODUCT.md` (score/visibilitas terms)
- `docs/V2_SUBDOMAIN_LAUNCH_PLAN.md` (agency framing)
- `Landing Page Copy.md`, `Preview.md`
- `User Flow/01 - Order Preview.md`, `02 - Payment.md`, `03 - Business
  Facts.md`, `04 - Questions.md`, `05 - Audit Run.md`, `06 - Audit Report.md`
