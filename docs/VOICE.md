# Nuave voice and language — canonical Indonesian writing contract

> Status: **Canonical**
> Approved: 2026-08-17 (founder, via Spec 002 R-24/R-25)
> Version: writing-standard-v2 (Indonesian) · Created: 2026-08-17
> Owner: Orchestrator
> Supersedes: `Archive Candidates/superseded-voice/voice-candidate-2026-08-10.md` (v1 draft)
>
> This document is the canonical Indonesian writing contract for
> customer-facing copy. It encodes the founder's settled terminology and
> naming defaults (Spec 002 R-24/R-25) and the mechanical resolutions from
> [`docs/reviews/findings/voice-candidate-review.md`](reviews/findings/voice-candidate-review.md).
> It supersedes `Archive Candidates/superseded-voice/voice-candidate-2026-08-10.md` (v1, the general voice guide) as the
> customer-facing writing guide. It is the source a future runtime
> `report-language` Indonesian contract (writing-standard version +
> `nuave-report-v3`) should compile from.
>
> Authority order: `AGENTS.md` → `docs/VISION.md` → `docs/PRODUCT.md` →
> `docs/AUDIT.md` → this document. Exact settled customer-facing labels and
> exact evidence are never rewritten to satisfy this guide.

---

## The versioned writing contract

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
  prose. The settled labels that keep `bisnis Anda` are **Tanpa menyebut
  bisnis Anda**, **Menyebut bisnis Anda**, **Bisnis Anda muncul di X dari 10
  pertanyaan**, and the **X/10**-style count (e.g. **4/10**). Do NOT "fix"
  those labels to `brand Anda`, and do NOT use `brand Anda` inside a phrase
  that is meant to be the settled label.
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
