# Nuave voice and language — canonical Indonesian writing contract

> Status: **Canonical**
> Approved: 2026-08-17 (founder, via Spec 002 R-24/R-25)
> Version: writing-standard-v2 (Indonesian) · Created: 2026-08-17
> Owner: Orchestrator
> Report-label amendment: 2026-09-22, founder decisions D-05/D-07 in Spec 012; documentation only
> Plain-voice amendment: 2026-09-28, founder decision to match landing copy v8 (see `DECISION_LOG.md`); documentation only
> Report-writer amendment: 2026-10-28, founder approval of Spec 023 (R-13): the two-source report writer's prose only (§2, §3, §5, §7.4)
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
| Your business (prose) | **bisnis Anda**, or the business type when it is known (**klinik Anda**); **usaha** in form labels (**nama usaha**, **jenis usaha**). In the two-source report writer's prose (Spec 023 R-05): the confirmed name where a section opens or where the business must be told apart from others, then **klinik ini** or **klinik Anda** for the clinic and **Anda** for the owner acting, repeating the name whenever "klinik ini" could mean two clinics; never a short form that is not a confirmed alias. Settled labels and code-built sentences are unchanged | brand Anda (except **Seluruh brand**, see the notes) |
| Settled exact labels (verbatim) | **Tanpa menyebut bisnis Anda** · **Menyebut bisnis Anda** · **Bisnis Anda muncul di X dari N pertanyaan** · **Bisnis Anda direkomendasikan di Y dari N pertanyaan** (N is the source's completed checks, 10 when all completed; Spec 018) · **Tidak diuji** · **Download PDF**. In a Spec 018 report for a clinic (confirmed category contains "klinik") the two count labels read **Klinik Anda muncul di X dari N pertanyaan** and **Klinik Anda direkomendasikan di Y dari N pertanyaan** (founder, 2026-10-24) | any paraphrase or spelling variant of these six |
| Prospective customer | **calon pelanggan** | calon klien, calon customer, customer potensial, bare "customer" |
| Existing customer | **pelanggan** | klien, customer |
| The AI model as the answering/deciding actor, in the report and intake | **model AI** | bare "AI" where it means the model ("disebut oleh model AI", "diuji ke model AI") |
| AI in marketing copy (landing, ads, order preview) | plain **AI** (tanya AI, jawaban AI, disebut AI) | model AI, mesin AI |
| AI as a category/concept | **AI** (era AI, pencarian AI, jawaban AI) | mesin AI, semua AI, "the AI" |
| The tested system | the system and model exactly as the report records them. Since Spec 018 the answers come from the ChatGPT app and Google's AI Overview (through DataForSEO), so the report and marketing say **ChatGPT** and **Google AI Overview** (**ChatGPT dan Google AI Overview**). Keep **AI buatan OpenAI** only for answers from the OpenAI API, such as reports saved before Spec 018 | semua AI, mesin AI, **ChatGPT** for answers that came from the OpenAI API |
| ChatGPT | the customer's habit and what AI does (**pelanggan tanya ChatGPT**, **ChatGPT biasanya cuma menyebut beberapa nama**); since Spec 018, the answers a two-source report shows under the **ChatGPT** heading | OpenAI API answers called ChatGPT's (**jawaban asli ChatGPT** in a report saved before Spec 018) |
| Data consistency | **sinkron** / **samakan** / **konsisten** | seragam |
| Competitor (when a competitor is verified) | **pesaing** | kompetitor |
| Other named businesses in the report | **bisnis lain yang disebut** | daftar kompetitor (unless the context verifies competitors) |
| Report artifact name (kept in English) | **AI Visibility Report** | AI Visibility Audit, AI Visibility Score (score band is retired) |
| Authority terms (kept in English) | **expertise** · **customer journey** · **touchpoint** | keahlian / perjalanan pelanggan / titik kontak where the authority term is intended |
| Re-check | **cek ulang** | monitoring, pemantauan real-time |
| Finding | **temuan** | insight |
| Non-appearance | **tidak muncul dalam jawaban ini** | tidak terlihat di AI, tidak dikenal AI |
| Failed test | **tidak dapat diuji** / **belum berhasil diuji**; a failed check slot shows **Tidak dapat diuji** with **Minta bantuan** (Spec 018) | visibilitas nol, "tidak muncul" for a technical failure |
| Mention | **disebut** | terekspos |
| Recommend | **direkomendasikan** / **disarankan** | menang, peringkat teratas |
| Download action (exact) | **Download PDF** | di-download, didownload, "Unduh laporan" as the button label |
| Fact-review action | **Periksa pertanyaan audit** | Review pertanyaan audit |
| Landing CTA (settled) | **Cek bisnis saya di AI** | "Audit bisnis saya" as the primary hero CTA |
| syariah (standing convention) | lowercase **syariah** | Syariah |

Notes:

- **`bisnis Anda`, not `brand Anda`:** since 2026-09-28, `bisnis Anda` is the
  default in all prose, the same words as the settled labels (**Tanpa
  menyebut bisnis Anda**, **Menyebut bisnis Anda**, **Bisnis Anda muncul di X
  dari 10 pertanyaan**, **Bisnis Anda direkomendasikan di Y dari 10
  pertanyaan**, and the **X/10**-style count). The one exception is
  **Seluruh brand**, where the report and intake separate a whole
  multi-location brand from one location.
- **`model AI` vs `AI`:** in the report and intake, use `model AI` only where
  the AI system is the thing that learns, answers, decides, or is being
  tested, and keep `AI` for the general category. Marketing copy says plain
  `AI` throughout: "Sekarang pelanggan tanya AI dulu", "AI tidak asal sebut
  nama".
- **`ChatGPT`:** name it for the customer's habit and for what AI does
  ("pelanggan tanya ChatGPT", "ChatGPT biasanya cuma menyebut beberapa
  nama"). Never present Nuave's own answers as ChatGPT's: Nuave asks
  OpenAI's model through the API, not the ChatGPT app. Say `jawaban AI`, and
  name the maker near the claim: "AI buatan OpenAI, pembuat ChatGPT".
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
  written as `08.00–21.00`, or the report plan's week labels (`Minggu 1–2`,
  Spec 023).
- **Short sentences.** One idea per sentence; no multi-clause sentences that
  are one English sentence in disguise. The two-source report writer has no
  ceiling (Spec 023 D-2, as revised by the founder on 2026-10-29): one clear
  point per sentence, lengths varied by what the ideas need, an occasional
  short sentence to land a point; word counts are measured in the test, not
  given to the writer as targets.
- **Think in Indonesian first.** Write the line the way an Indonesian owner
  would say it, not as a translated English sentence. Say "Cuma semenit", not
  "Hasil dalam detik". Say "Pelanggan tidak lagi cek website satu per satu.
  Mereka tanya ke AI.", not "Mereka tidak membuka 10 tab."
- **Light spoken words** are welcome in marketing copy where a person would
  say them: `cuma`, `kok`, `duluan`, `kasih tahu`, `biar`, and `ya` at the
  end of helper text ("Nama usahanya diisi dulu, ya."). Always with `Anda`.
  Business facts, the report, and email keep their own registers (§7).
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

- **Money:** `Rp249.000` — no space after `Rp`; thousands separated by a full
  stop. One audit is **Rp249.000** (Spec 018), with no tax or fee added at
  checkout.
- **Quote validity:** none is promised. The checkout no longer says the
  summary holds for 30 days (founder, 2026-10-24, S5): an unpaid order ends
  after 2 hours (Spec 016 Q2).
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
  Exception (Spec 023 R-01, 2026-10-28): the two-source report writer has no
  hard limit; it follows the §3 range, and a long sentence is neither sent
  back nor cut. The legacy writer keeps the ceiling.
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

- `bisnis Anda`, or the business type when it is known. Hero question, e.g.
  "Klinik Anda yang direkomendasikan, atau klinik sebelah?".
- Plain `AI` and light spoken words (§2 notes, §3). `ChatGPT` can name the
  customer's habit and what AI does, but never Nuave's own answers.
- Keep it lean: one idea per line and short headings. Let the chat example
  and the sample report do the explaining.
- Lead with a real observed problem or a clear customer question; sell clarity
  and evidence, not fear of being left behind.
- No conversion/ROI statistics, no `Pertama`, no guarantee, no `5x`/`67%`/`73%`
  figures, and no unsourced market percentages.
- The settled primary CTA is **Cek bisnis saya di AI**; the priced action is
  **Bayar Rp249.000**; an upper non-charging action is **Lanjut ke pembayaran**.
- State the one-audit nature, the `Rp249.000` total, that the audit checks
  **ChatGPT dan Google AI Overview**, and no extra tax/fee. Do not promise
  how long the quote holds (S5).
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
- Spec 018 question origin labels are exact: **Dicari di Google**, **Orang
  lain juga bertanya**, **Disusun dari topik yang dicari**, **Disusun dari
  profil bisnis**, **Diubah oleh Anda**. The topic line is "Topik: <topik> ·
  ±12.100 pencarian/bulan di Google, seluruh Indonesia (data <bulan tahun>)";
  without a number, **Tidak ada data jumlah pencarian**; an edited question
  shows **Topik awal: …**.
- The **Kota untuk pencarian** helper text: "Google kami tanya seolah-olah dari
  kota ini. ChatGPT hanya bisa diatur per negara, jadi ChatGPT ditanya dari
  Indonesia. Karena itu, pertanyaan tentang memilih tempat akan menyebut kota
  ini."

#### 7.4 Report (evidence-led register)

- Direct-ten reports lead with **Bisnis Anda muncul di X dari 10 pertanyaan**
  and **Bisnis Anda direkomendasikan di Y dari 10 pertanyaan**. Do not repeat
  the same unnamed count or add untested named/comparison/information tiles.
  Historical methods retain their own composition measures and denominators.
- Spec 018 two-source reports keep those two sentences word for word with the
  ChatGPT denominator N (completed ChatGPT answers), and add for Google:
  **Google menampilkan AI Overview di Z dari M pertanyaan** and **Bisnis Anda
  muncul di W dari Z pertanyaan** (no "direkomendasikan" line for Google).
  A denominator of 0 shows **Tidak diuji**. Other exact strings: **Google
  tidak menampilkan AI Overview**, **Google tidak menampilkan AI Overview
  untuk X dari M pertanyaan ini.**, **K pemeriksaan tidak dapat diuji**,
  **Tidak ada data jumlah pencarian**, **dipakai sebagai sumber** (shown as
  **Dipakai sebagai sumber**), **Topik yang belum menyebut Anda**.
- For a clinic (confirmed category contains "klinik"), a Spec 018 report says
  **Klinik Anda** wherever it would say **Bisnis Anda**: **Klinik Anda muncul
  di X dari N pertanyaan**, **Klinik Anda direkomendasikan di Y dari N
  pertanyaan**, "profil **klinik Anda**", and the code-built count sentences
  ("Di ChatGPT, **klinik Anda** disebut di …"). Other businesses keep
  **Bisnis Anda**; reports saved before Spec 018 are unchanged.
- For direct-ten, use this section order on screen and PDF: **Hasil singkat**,
  **Jawaban model AI**, **Analisis Nuave**, **Yang dapat dilakukan**,
  **Tentang audit ini**. In a Spec 018 two-source report the second section
  is **Jawaban ChatGPT dan Google AI Overview**. The three evidence layers stay distinct; historical
  reports may retain **Yang ditemukan** / **Artinya bagi Anda**.
- Exact composition/status/export labels remain **Tanpa menyebut bisnis Anda**,
  **Menyebut bisnis Anda**, **Tidak diuji**, and **Download PDF**. The PDF label
  is the shared default for every report, not a direct-ten-only override.
- Other named businesses are **bisnis lain yang disebut**, never "competitors"
  without verified context. The writer's line for each is labelled **Menurut
  jawaban AI:** (Spec 023 R-07; it replaced "Disebut AI karena:", which
  claimed a cause).
- The code-built count sentences above stay word for word (Spec 023 R-13).
  The report writer also reads
  [`content/report/WRITING_GUIDE.md`](content/report/WRITING_GUIDE.md);
  where the guide and this document differ, this document wins.
- Keep the snapshot limitation beside the summary, not in fine print. Keep the
  artifact title in English (**AI Visibility Report**) with the body in
  Indonesian. Exact excerpts, questions, names, and sources stay verbatim.

The founder-settled report direction is specified in
[Spec 012](../specs/012-evidence-first-report/SPEC.md). Its recovery state says
analysis is unfinished and offers copy/explicit retry only; it is not a
finished report with download controls. Spec 012 A/B1/B2 implemented this
guidance (PRs #74, #80, #81); it does not change the existing `plain-id-v1`
writing limits.

#### 7.5 Transactional email (plain, formal register)

- Send as **Tim Nuave <support@nuave.ai>**.
- State the report is ready, the private access action, and the truthful PDF
  status; never promise a download that is not ready.
- Include the snapshot limitation and finite-access wording; no marketing
  consent bundled into the purchase; no response-time promise until one is
  approved; mask the recipient email on any shared status surface.
