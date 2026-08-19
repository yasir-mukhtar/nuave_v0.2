# Spec 003 — Five-business provider evaluation: evaluation results

> Status: **Draft — internal evaluation record; nothing committed or published
> without founder approval**
> Owner: Founder
> Updated: 2026-08-17 (Luna run; Gemini still provider-blocked)
> Covers: Spec 003 R-06..R-11 (evaluation set, candidates and controls, review
> rubric, practical quality gate, provider-lock decision input, cost accounting)
> and AC-06..AC-09 (evaluation cleared before the generator is approved)
> Evaluator: Nuave orchestrator + leaf worker (human review applied to every
> pack record)
> Runner: `scripts/eval/provider-evaluation.spec.ts` (re-runnable,
> `npx vitest run scripts/eval`; lives outside `src/`, so `npm run test:audit`
> never picks it up)
> Raw evidence: `scripts/eval/.results/evaluation-results.json` (local only,
> not part of this record; contains no contact details and no unnecessary
> personal data — only clinic public facts, scores, and telemetry)

## 1. Executive summary

**The practical quality gate was CLEARED by GPT-5.6 Luna (03 and 04).** This
run (2026-08-17, OpenAI key added by the founder) measured the Luna candidate
on all five Depok dental clinics with real provider calls:

- **03 extraction — Luna: 5/5 completed** (HTTP 200, `gpt-5.6-luna`, real
  usage; 6.3–11.0 s per call; ≈ USD 0.012–0.013 per call). Drafts resolve the
  exact business/branch, cite only the official source with per-field
  evidence, list accurate service offerings, flag honest uncertainty
  (`known_accuracy_questions`), and leave unsupported fields empty — no
  flattery, no invented facts.
- **04 question writer — Luna: 5/5 completed** (real packs, 10/10 questions
  each, 0 issues/blockers/leaks/premises; 2.9–5.7 s per pack; ≈ USD
  0.0004–0.0007 per pack). Qualitative review: **50/50 questions (100%)
  relevant and natural** — accepted unchanged 49, light edit 1, substantive
  replacement 0 (fallback comparison: 18% / 3 / 47 / 0).
- **All six practical-gate criteria pass for Luna** (Section 7).
- **Gemini 3.5 Flash-Lite: still NOT measurable** — the `GEMINI_API_KEY` in
  `.env.local` belongs to a billing-enabled Google AI Studio project whose
  prepayment credits are **depleted** (`429 RESOURCE_EXHAUSTED`, verified again
  this session on every call). Gemini verdict remains INCONCLUSIVE; the
  comparison rerun is possible whenever credits are restored (runner frozen).
- **Deterministic fallback: unchanged FAIL** (continuity path only, as
  designed).

**Two real live-path bugs were found and fixed during this run** (both in the
wired OpenAI question-writer, the product's default 04 provider):
1. `buildOpenAIIndonesianQuestionRequest` sent the developer instruction as an
   **array containing a bare string** (`content: [INSTRUCTION]`), which the
   Responses API rejects ("Invalid type for input[0].content[0]") — every
   live call degraded to the deterministic fallback. Fixed to the joined-string
   form used by the extraction path.
2. The live response returns the schema object **JSON-encoded inside
   `output_text.text` without a `parsed` field** — the parser fell through to
   the numbered-list text path, so the boundary degraded. `parseOpenAIIndonesianResponse`
   now accepts the JSON-in-text form (mirrors the Gemini parser); regression
   test added (+1 audit test, suite 337 green).

**Spend this session: ≈ USD 0.13 notional** (5 extraction + 5 question Luna
calls + earlier failed-run attempts at ≈ USD 0.06 each). **Correction
(Phase 3 fix-round-2 adversarial review, O-6, 2026-08-18):** this spend was
previously reported as "USD 0.00 by repo convention" — there is no such
convention; R-11 requires every evaluation call to be accounted against the
USD 5 per-session ceiling including the carryover, and this run's real Luna
cost (USD 0.0654, Section 8) was never folded into the USD 0.4357 carryover.
The carryover figure below therefore still understates true cumulative spend
by that amount; a founder decision on whether/how to advance the carryover
value is open and not made here. **USD 5 ceiling headroom, using the
unadvanced carryover, is USD 4.5643; the true remaining headroom if this
run's Luna spend is folded in is ≈ USD 4.4989.**

**Provider-lock recommendation (R-10 — for founder approval; NOT decided
here): GPT-5.6 Luna for both 03 and 04.** It is the only candidate that
clears the practical quality gate, it is already the wired default
(`NUAVE_QUESTION_PROVIDER` default `openai`; `NUAVE_PROVIDER` default
`openai`), and its cost profile fits the Rp99.000 product (extraction ≈
USD 0.013, question pack ≈ USD 0.0007 per audit). The Gemini comparison can
be re-run later without code changes; the runner's five confirmed briefs and
the `question-writer-v1` instruction are frozen.

## 2. Evaluation set (R-06): five real public dental clinics in Depok

Public information only (research 2026-08-17). No business was contacted; no
draft is published. The first audit target, Sozo Dental Depok/Margonda, is
included as required.

| # | Clinic (exact branch) | Official website (branch page) | Google Maps listing | Category (public) | Priority services (public site) |
|---|---|---|---|---|---|
| 1 | **Sozo Dental Depok** — Margonda, Beji, Kota Depok (Jl. Margonda No.267, Kemiri Muka) | https://www.sozodental.com/lokasi/depok/ | https://maps.app.goo.gl/7FkoFyipTPspnVjM9 (link published on official site) | Klinik gigi — jaringan 60+ cabang nasional | Pemeriksaan gigi, scaling, tambal gigi, perawatan saluran akar, cabut gigi, behel (metal & spesialis ortho), aligner, veneer, bleaching, gigi palsu, implan |
| 2 | **SATU Dental Margonda** — Margonda, Beji, Kota Depok (Jl. Margonda Raya No.529, Pondok Cina) | https://www.satudental.com/lokasi/klinik-gigi-margonda/ | Maps link published on the official branch page (directions URL) | Klinik gigi — jaringan 56 cabang, 500+ dokter | Behel, veneer, scaling, perawatan umum & spesialis, perawatan gigi anak (SATU 4 Kids), lab gigi in-house; buka 09.00–21.00 |
| 3 | **FDC Dental Clinic Margonda** — Margonda, Beji, Kota Depok (Jl. Raya Margonda No.333) | https://fdcdentalclinic.co.id/lokasi/fdc-margonda | https://www.google.com/maps/search/?api=1&query=FDC+Dental+Clinic+Margonda+Depok (listing search URL) | Klinik gigi — jaringan 68+ klinik di 25+ kota | Reservasi dokter gigi online, scaling (promo rutin), behel (termasuk Damon/Clear), perawatan umum; pricelist & promo via aplikasi |
| 4 | **OMDC Dental Margonda** — Margonda, Pondok Cina, Kota Depok (Jl. Margonda Raya No.414) | https://www.omdc.co.id/location/omdc-margonda | https://www.google.com/maps/search/?api=1&query=OMDC+Dental+Margonda+Depok (listing search URL) | Klinik gigi — OMDC Group (dental & healthcare) | Scaling, pencabutan, penambalan, ortodonti, bleaching, prostodontik, perawatan gigi anak; playground & movie theater di klinik; buka 10.00–21.00 |
| 5 | **Nirmala Dental** — Margonda, Pondok Cina, Kota Depok (Jl. Margonda No.492A) | https://nirmaladental.com/ | https://www.google.com/maps/search/?api=1&query=Klinik+Gigi+Nirmala+Depok+Margonda (listing search URL) | Klinik gigi dan kesehatan umum (mandiri, sejak 2004) | Pemeriksaan & konsultasi gigi, scaling, behel/ortodonti (anak–dewasa), perawatan saluran akar, bedah mulut, penyakit mulut, gigi tiruan & implan, pemeriksaan dokter umum; menerima asuransi |

Customer-context notes used in the confirmed briefs (all public): Sozo —
warga Depok mencari klinik gigi terdekat & terjangkau, reservasi/promo via
WhatsApp; SATU — mahasiswa/karyawan, jam buka panjang, booking online; FDC —
reservasi mudah & murah, promo-driven, aplikasi; OMDC — keluarga dengan anak,
harga transparan, konsep nyaman; Nirmala — dokter umum + dokter gigi umum &
spesialis satu atap, pasien asuransi.

Comparison-business scoping (confirmed-brief input, per docs/journey/03
"comparison-business relevance"): Sozo ↔ SATU Dental Margonda; SATU ↔ Sozo
Dental Depok; FDC ↔ OMDC Dental Margonda; OMDC ↔ FDC Dental Clinic Margonda
(all credible: same corridor, comparable category, public source each). Nirmala
was deliberately left **without a named comparator** (mixed dental + general
clinic; no single credible match) to exercise the unnamed-comparison fallback
(docs/journey/04 required behaviour).

## 3. Candidates and controls (R-07)

| Candidate | Role | 03 extraction | 04 question writer | Status this run |
|---|---|---|---|---|
| GPT-5.6 Luna (`gpt-5.6-luna`) | Quality benchmark **→ recommended lock** | `NUAVE_PROVIDER=openai` (Responses API, web search, low reasoning), wired `openai.ts` path | `NUAVE_QUESTION_PROVIDER=openai` (Responses API, no search, `question-writer-v1`), wired `questions-id-provider.ts` + `questions-id.ts` boundary | **RAN 5/5 03 + 5/5 04 — GATE CLEARED** |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | Implementation candidate | `NUAVE_PROVIDER=gemini`, wired `gemini.ts` path (web search on) | `NUAVE_QUESTION_PROVIDER=gemini`, wired boundary, no search | **NOT RUN** — provider blocked (depleted prepayment credits, `429 RESOURCE_EXHAUSTED`, verified 2026-08-17 incl. free-tier probe) |
| Deterministic Indonesian fallback | Continuity control (04 only) | — | `buildDeterministicIndonesianPack` from the confirmed brief | **RAN 5/5 packs** (no provider call, USD 0.00) — gate FAIL (expected) |

Same minimized confirmed brief (`minimizeIndonesianBrief`, one per clinic,
frozen in the runner) and the same `question-writer-v1` instruction for both
models. No web search in the question-writer test, per docs/journey/04.

## 4. Session telemetry (real)

Luna session (2026-08-17, UTC 15:04:26 start, 112.4 s wall):

| Metric | Value |
|---|---|
| 03 extraction calls (Luna, with web search) | 5 — **all completed**, HTTP 200 |
| 04 question-writer calls (Luna, no search) | 5 — **all completed** |
| Luna input tokens (total) | 40,260 |
| Luna output tokens (total) | 5,388 |
| **Luna notional cost (official pricing)** | **USD 0.0654** (extraction ≈ USD 0.012–0.013/call; questions ≈ USD 0.0004–0.0007/call) |
| Gemini calls attempted | 10 (5 extract + 5 questions) — all rejected pre-generation (depleted credits); 0 tokens |
| Deterministic fallback packs | 5/5 (USD 0.00, ~0–5 ms) |
| **Accounted cost — as recorded pre-fix (not R-11-compliant)** | USD 0.00 |
| Carryover (USD) — as recorded pre-fix, unadvanced | 0.4357 |
| Ceiling headroom — as recorded pre-fix (USD) | 4.5643 |
| **True remaining headroom if this run's USD 0.0654 Luna spend is folded into the carryover, per R-11 (USD)** | **≈ 4.4989** |

Gemini pricing reference (official developer pricing page, updated 2026-08-13):
`gemini-3.5-flash-lite` paid tier USD 0.30 / 1M input, USD 2.50 / 1M output
(thinking included); Google Search grounding 5,000 free requests / month then
USD 14 / 1,000. Luna pricing (repo `AUDIT_PRICING_VERSION
"openai-standard-2026-08-01"`): short-context input USD 0.20 / 1M, output USD
1.20 / 1M, web search USD 0.01 / call.

## 5. Per-candidate results

### 5.1 03 extraction — GPT-5.6 Luna: RAN 5/5, high quality

| Clinic | Status | Latency | Notional cost | Key quality observations (from the draft) |
|---|---|---|---|---|
| Sozo Dental Depok | completed | 10,987 ms | USD 0.01315 | Exact branch resolution (Depok/Margonda); official source only; 11 accurate service offerings incl. "Behel Spesialis Ortho", "Pemasangan Gigi Palsu"; conversion_action "Reservasi atau konsultasi melalui WhatsApp"; honest `known_accuracy_questions` (branch-level availability, hours, prices); unsupported fields (target_customer, usp) left empty; per-field evidence with source URLs |
| SATU Dental Margonda | completed | 6,575 ms | USD 0.01215 | Branch-resolved; offerings match public site (behel, veneer, scaling, SATU 4 Kids, lab in-house); hours/booking grounded |
| FDC Dental Clinic Margonda | completed | 9,432 ms | USD 0.01189 | Branch-resolved; promo-driven framing captured; online reservation service extracted |
| OMDC Dental Margonda | completed | 6,337 ms | USD 0.01183 | Branch-resolved; family/child positioning + playground/movie theater extracted; transparent pricing noted |
| Nirmala Dental | completed | 8,547 ms | USD 0.01309 | Branch-resolved; mixed general+dental scope captured; insurance acceptance extracted |

Every draft: brand_name and entity_scope resolve the exact audited branch;
`official_sources` contains only the official page; `verified_offerings` match
the public site; unsupported scalar/array fields are left empty (no flattery,
no invented facts); `known_accuracy_questions` records honest uncertainty;
per-field `evidence` cites the source URL. The one known gap (recorded, not
changed): the wired extraction instruction (`openai.ts`) still asks for
"clear, natural English" explanatory text — the docs/journey/03 "natural
Indonesian writing" measure is not satisfiable on the wired path yet (Spec 003
known gap; see Findings). The draft's evidence notes came out in Indonesian
regardless.

### 5.2 03 extraction — Gemini 3.5 Flash-Lite: NOT RUN

| Clinic | Status | Provider reason |
|---|---|---|
| Sozo Dental Depok | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| SATU Dental Margonda | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| FDC Dental Clinic Margonda | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| OMDC Dental Margonda | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| Nirmala Dental | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |

### 5.3 04 question writer — GPT-5.6 Luna: RAN 5/5, gate cleared

Mechanical results (computed by the wired validation code):

| Clinic | Count | 5/5 no-name/name | Issues | Blockers | Leaks | Premises |
|---|---|---|---|---|---|---|
| Sozo Dental Depok | 10 | 5 / 5 | 0 | 0 | 0 | 0 |
| SATU Dental Margonda | 10 | 5 / 5 | 0 | 0 | 0 | 0 |
| FDC Dental Clinic Margonda | 10 | 5 / 5 | 0 | 0 | 0 | 0 |
| OMDC Dental Margonda | 10 | 5 / 5 | 0 | 0 | 0 | 0 |
| Nirmala Dental | 10 | 5 / 5 | 0 | 0 | 0 | 0 |

Qualitative scoring (human review of every question; rubric: relevant to the
audited business/customer decision AND natural Indonesian as a customer would
ask it, without substantive replacement):

| Clinic | R+N count (/10) | Accepted unchanged | Light edit | Substantive replacement |
|---|---|---|---|---|
| Sozo Dental Depok | 10 | 10 | 0 | 0 |
| SATU Dental Margonda | 10 | 9 | 1 | 0 |
| FDC Dental Clinic Margonda | 10 | 10 | 0 | 0 |
| OMDC Dental Margonda | 10 | 10 | 0 | 0 |
| Nirmala Dental | 10 | 10 | 0 | 0 |
| **Total (50 questions)** | **50 (100%)** | **49 (98%)** | **1 (2%)** | **0** |

Review notes: the default five/five name/no-name composition held in every
pack. The five no-name questions are genuinely discovery-safe — none reveals
the audited or comparison business, none asserts unverified facts. Named
comparisons used the confirmed comparator in the right slot (Sozo↔SATU,
SATU↔Sozo, FDC↔OMDC, OMDC↔FDC); **Nirmala's comparison slot used the unnamed
fallback correctly** ("…dibandingkan klinik gigi lain di Depok…"). Open-fact
checks were grounded in the brief (e.g. "Benarkah Nirmala Dental telah
melayani pasien sejak 2004?"; "Apakah SATU Dental Margonda menyediakan booking
online melalui patients.satudental.com?"; "playground dan movie theater").
Customer jobs varied naturally (after-hours scaling, family/child care,
insurance, WhatsApp booking, transparent pricing) instead of rephrasing one
template. The single light edit: SATU Q5 ("lebih baik memilih klinik dengan
laboratorium in-house atau klinik dengan harga lebih terjangkau?") — a human
would likely simplify the framing; not a substitution.

Latency 2,942–5,669 ms per pack; notional cost USD 0.0004–0.0007 per pack.

### 5.4 04 question writer — Gemini 3.5 Flash-Lite: NOT RUN (degraded)

All five provider calls were rejected by Gemini (depleted credits); the wired
boundary returned the deterministic fallback pack in every case
(`source: "fallback"`, `warnings: ["fallback_used"]`) — graceful degradation
verified working, zero cost. No model-authored question exists for Gemini this
run.

### 5.5 04 question writer — deterministic Indonesian fallback: RAN, scored

Mechanical results all pass (10/10, 5/5 no-name/name, 0 issues/blockers).
Qualitative: **9/50 (18%) R+N**, accepted 3 / light edit 47 / substantive 0 —
no pack reached 8/10. Characteristic pattern: confirmed-brief tail-clause
appended to nearly every question; slot-2 grammar artifacts ("Saya cari
menemukan…", "Saya cari merapikan gigi…"); awkward slot-9 prepositions.
Consistently acceptable: slot 8 (address + hours) and the unnamed slot-6
fallback. Safety: no leaks, no premises, no prohibited request.

## 6. Review rubric table (R-08)

Legend: ✅ pass · ❌ fail · ➖ not measurable (candidate did not run)

| Rubric item | GPT-5.6 Luna 04 | Gemini 3.5 Flash-Lite 04 | Deterministic fallback 04 |
|---|---|---|---|
| Ten questions returned and parsed (all 5 packs) | ✅ 5/5 | ➖ (blocked; boundary returned fallback) | ✅ 5/5 |
| Default five/five name/no-name composition | ✅ 5/5 all packs | ➖ | ✅ 5/5 all packs |
| Category and location relevance | ✅ every question grounded in Depok + dental | ➖ | ✅ |
| Plausible customer decision per question | ✅ varied customer jobs | ➖ | ✅ (jobs real; wording weak) |
| Natural Indonesian vocabulary/register/shape | ✅ 50/50 R+N; 49 accepted unchanged | ➖ | ❌ 18% R+N; tail-clause + slot-2 artifacts |
| Meaningful distinctness (not paraphrases) | ✅ distinct jobs, not reworded templates | ➖ | ✅ mechanically distinct slots (template-identical shape) |
| Unsupported premises / invented facts | ✅ none (open-fact checks grounded in brief) | ➖ | ✅ none |
| Identity leakage (audited/comparison) | ✅ none; comparators correct; Nirmala unnamed fallback | ➖ | ✅ none |
| Useful unknown facts asked openly | ✅ (sejak 2004, patients.satudental.com, playground, booking.omdc.co.id) | ➖ | ✅ (slot 10 availability) |
| Comparison relevance + unnamed fallback | ✅ 4 named correct + 1 unnamed correct | ➖ | ✅ named correct; Nirmala unnamed correct |
| Accepted unchanged / light / substantive | **49 / 1 / 0** of 50 | ➖ | 3 / 47 / 0 of 50 |
| Latency | ✅ 2.9–5.7 s per pack | ➖ (blocked) | ✅ ~0–5 ms |
| Total provider cost | ✅ ≈ USD 0.0031 for 5 packs | ✅ USD 0.00 (0 tokens) | ✅ USD 0.00 |

| Rubric item (03) | GPT-5.6 Luna 03 | Gemini 3.5 Flash-Lite 03 |
|---|---|---|
| Exact business/branch resolution | ✅ 5/5 drafts resolve exact branch | ➖ not run |
| Official-source identification | ✅ official source only, per-field evidence | ➖ not run |
| Category suggestions | ✅ "Klinik gigi" (matching the confirmed category) | ➖ not run |
| Product/service accuracy | ✅ offerings match public sites (spot-checked) | ➖ not run |
| Unsupported/flattering claims | ✅ none; unsupported fields left empty | ➖ not run |
| Customer-context suggestions | ✅ grounded in public pages (hours, booking, family positioning) | ➖ not run |
| Comparison-business relevance | ➖ out of current draft schema (proposed at confirmed-brief time) | ➖ out of current draft schema |
| Natural Indonesian writing | ❌ not satisfiable on wired path (English instruction in `openai.ts`) | ❌ not satisfiable on wired path (English instruction in `gemini.ts`) |
| Valid structured output first attempt | ✅ 5/5 first attempt | ➖ not run |
| Latency / notional cost | ✅ 6.3–11.0 s / ≈ USD 0.062 (5 calls) | ➖ not run / USD 0.00 |

## 7. Practical quality gate verdict (R-09)

| Gate requirement | GPT-5.6 Luna | Gemini 3.5 Flash-Lite | Deterministic fallback |
|---|---|---|---|
| 1. All five packs recover to ten executable questions without manual technical repair | ✅ 5/5 (10/10 each, 0 blockers) | ➖ | ✅ |
| 2. No discovery question leaks audited or comparison identity | ✅ 0 leaks; comparators correct; Nirmala unnamed fallback | ➖ | ✅ |
| 3. No material unsupported premise or prohibited request | ✅ 0 premises; open-fact checks grounded | ➖ | ✅ |
| 4. ≥ 8/10 relevant & natural in ≥ 4/5 packs | ✅ **10/10 in all five packs (50/50 = 100%)** | ➖ | ❌ (18%; best pack 3/10) |
| 5. Model materially outperforms the fallback on naturalness & contextual relevance | ✅ 100% vs 18% R+N; 49 vs 3 accepted | ➖ | n/a (control) |
| 6. Measured cost and latency fit the paid preparation allowance | ✅ ≈ USD 0.0031 for 5 packs; 2.9–5.7 s | ➖ (0 tokens, USD 0.00) | ✅ (USD 0.00, ~0 ms) |
| **Overall** | **PASS — quality gate cleared** | **INCONCLUSIVE — not measured** | **FAIL (expected for a continuity path)** |

Per docs/journey/04, when a model clears the gate the product may adopt it for
the first reviewed vertical; the recommendation below is for founder approval.

## 8. Cost accounting (R-11)

- Real provider calls this session: 10 Luna (5 extraction + 5 questions) +
  10 rejected Gemini. Luna notional cost **USD 0.0654** (openai.ts records
  per-call telemetry; the boundary records generation meta with telemetry
  null — HTTP-level usage captured by the runner).
- **Correction (Phase 3 fix-round-2 adversarial review, O-6, 2026-08-18):**
  this record previously stated the USD 0.0654 was "accounted USD 0.00 by
  repo convention." No such convention exists in the codebase or `.env.example`
  (`OPENAI_AUDIT_CARRYOVER_COST_USD` is blank/optional there — see O-7). R-11
  requires evaluation spend to be accounted against the ceiling including the
  carryover; this run's real cost was measured but never folded into the
  USD 0.4357 carryover value used by later sessions. That is a real gap, not a
  documented convention, and is left open for a founder decision on how to
  advance the carryover rather than silently changed here.
- Earlier failed runs this evening (OpenAI key absent / Gemini-only) billed
  USD 0.00 each (no tokens consumed).
- Against the USD 5 ceiling using the **unadvanced** USD 0.4357 carryover:
  USD 4.5643 headroom remains on record. If this run's USD 0.0654 is folded in
  as R-11 requires, true remaining headroom is **≈ USD 4.4989** — still far
  more than the Sozo Dental live audit needs (≈ USD 0.02–0.04 per audit at
  Luna rates), so this gap does not block the next run, but it should be
  reconciled before cumulative untracked spend grows large enough to matter.
- Every attempted call recorded with the production telemetry contract shape
  (requested model, latency, HTTP status, usage, accounted cost, failure
  reason).

## 9. Findings recorded for the founder

1. **GPT-5.6 Luna clears the practical quality gate for 03 and 04** (Section
   7). It is the only candidate that currently runs and passes; it is already
   the wired default for both stages.
2. **Two real live-path bugs in the wired OpenAI question-writer were found
   and fixed this session** (the default 04 provider would otherwise have
   silently degraded to the deterministic fallback in production):
   - developer content shape (`content: [INSTRUCTION]` → string) — every live
     call returned "Invalid type for input[0].content[0]";
   - `parsed` absent on live responses — structured output arrived JSON-encoded
     in `output_text.text`; the parser now accepts that form (mirrors Gemini),
     regression test added. Suite: **337 audit tests green**.
3. **Gemini remains unavailable** (depleted prepayment credits, `429
   RESOURCE_EXHAUSTED`). Re-running the Gemini comparison requires restoring
   credits; the runner, five frozen briefs, and `question-writer-v1` are
   unchanged and re-runnable (`npx vitest run scripts/eval`).
4. **The deterministic fallback is safe but not customer-grade** (18% R+N) —
   expected; it is the continuity path, not the primary generator. Its two
   worst patterns (brief tail-clause repetition; slot-2 grammar artifacts) are
   exactly what Luna's output outperforms (100% vs 18%).
5. **03 extraction instruction remains English** in the wired path
   (`openai.ts` and `gemini.ts`); the docs/journey/03 "natural Indonesian
   writing" measure needs the Indonesian 03 contract work before it is
   testable (known Spec 003 gap — separate from the provider lock).
6. **`gemini.ts` retries the hard quota error** (429 RESOURCE_EXHAUSTED) 4×
   with backoff (~9.5 s wasted per call this session); fail-fast on that
   status would be safer (recorded; no `src/` change made).
7. **Runner hardening this session:** OpenAI execution path added (03 + 04,
   gated on `OPENAI_API_KEY`); per-clinic fresh audit budget (a shared budget
   would have blocked clinics 2–5 at the 03 extract stage limit of 1 call);
   OpenAI notional cost + usage captured at the HTTP layer; gate assertions
   extended to the OpenAI candidate; ceiling guard covers both providers.
8. Uncommitted worktree changes preserved untouched; no business contact, no
   publishing, no e2e run.

## 10. Recommended provider lock (R-10 — for founder approval; NOT decided here)

| Stage | Recommended default | Basis | Action required |
|---|---|---|---|
| 03 extraction | **GPT-5.6 Luna** (`NUAVE_PROVIDER=openai`, already default) | 5/5 real extractions, exact branch resolution, official-source-only evidence, no flattery; ≈ USD 0.013/audit | **Founder approval**; record in DECISION_LOG; optional Gemini comparison rerun later |
| 04 question writer | **GPT-5.6 Luna** (`NUAVE_QUESTION_PROVIDER=openai`, already default) | Practical quality gate CLEARED (50/50 R+N, 49/1/0, 0 leaks/premises); ≈ USD 0.0007/audit | **Founder approval**; record in DECISION_LOG; optional Gemini comparison rerun later |

After approval: run the **Sozo Dental Depok live audit** (10 observations +
2–3 variance re-asks + report) with the locked provider, then the quality-gate
verdict and Spec 003 VERIFICATION.md.

## 11. Files read / written

- Read (no changes): `specs/003-live-report-quality-gate/SPEC.md`,
  `docs/journey/04-questions.md`, `docs/journey/03-business-facts.md`,
  `src/lib/audit/questions-id-provider.ts`, `questions-id.ts`, `gemini.ts`,
  `openai.ts`, `telemetry.ts`, `provider.ts`, `types.ts`, `.env.local` (key
  presence only), official public pages of the five clinics.
- Written: `scripts/eval/provider-evaluation.spec.ts` (runner — OpenAI path
  added this session, reusable), `scripts/eval/.results/evaluation-results.json`
  (raw local evidence), this record.
- Fixed (src/): `questions-id-provider.ts` (developer content shape; JSON-in-text
  parse) + `questions-id-provider.test.ts` (+1 regression test) — 337 audit
  tests green.
