# Spec 003 — Five-business provider evaluation: evaluation results

> Status: **Draft — internal evaluation record; nothing committed or published**
> Owner: Founder
> Updated: 2026-08-17
> Covers: Spec 003 R-06..R-11 (evaluation set, candidates and controls, review
> rubric, practical quality gate, provider-lock decision input, cost accounting)
> and AC-06..AC-09 (evaluation cleared before the generator is approved)
> Evaluator: Nuave leaf worker (human review applied to every pack record)
> Runner: `scripts/eval/provider-evaluation.spec.ts` (re-runnable,
> `npx vitest run scripts/eval`; lives outside `src/`, so `npm run test:audit`
> never picks it up)
> Raw evidence: `scripts/eval/.results/evaluation-results.json` (local only,
> not part of this record; contains no contact details and no unnecessary
> personal data — only clinic public facts, scores, and telemetry)

## 1. Executive summary

**The practical quality gate was NOT cleared by any model candidate — because no
model candidate could be measured on this run.** Both model paths were
unavailable at run time:

- **Gemini 3.5 Flash-Lite (03 and 04 candidate):** the `GEMINI_API_KEY`
  present in `.env.local` belongs to a billing-enabled Google AI Studio project
  whose **prepayment credits are depleted**. Every live call returned
  `429 RESOURCE_EXHAUSTED` ("Your prepayment credits are depleted…"),
  verified 2026-08-17 on both `gemini-3.5-flash-lite` and the free-tier
  `gemini-3.1-flash-lite` (probe call). This blocks ALL models on that key.
- **GPT-5.6 Luna (03 and 04 benchmark):** **`OPENAI_API_KEY` is absent from
  `.env.local`** (and from the shell environment). The benchmark could not run.
  Per the task rule, this is flagged, not asked for.

What DID run, with real results: the **deterministic Indonesian fallback (04
only)** on all five confirmed briefs. It passed the mechanical parts of the
gate (ten executable questions in all five packs; no identity or comparison
leakage; no material unsupported premise; USD 0.00 cost; ~0 ms latency) but
**failed the naturalness/relevance bar decisively**: only **9 of 50 questions
(18%)** were judged relevant and natural without substantive replacement, and
no pack reached the 8/10 threshold. That is the expected profile of a
continuity fallback, not a primary generator.

**Spend: USD 0.00.** No provider tokens were consumed (all Gemini calls were
rejected before generation). The USD 0.4357 carryover is unchanged; **USD
4.5643 of headroom remains** under the USD 5 ceiling, fully available for the
provider rerun.

**Provider-lock recommendation: DEFERRED — no lock decision can be made from
this run.** The 03/04 provider selection (Spec 003 R-10) needs one usable
provider key. The runner is ready and the five confirmed briefs are frozen in
it; a rerun requires founder action (restore Gemini prepayment, add an OpenAI
key, or approve another key). Founder approval is required for any lock.

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

Comparison-business scoping (confirmed-brief input, per User Flow/03
"comparison-business relevance"): Sozo ↔ SATU Dental Margonda; SATU ↔ Sozo
Dental Depok; FDC ↔ OMDC Dental Margonda; OMDC ↔ FDC Dental Clinic Margonda
(all credible: same corridor, comparable category, public source each). Nirmala
was deliberately left **without a named comparator** (mixed dental + general
clinic; no single credible match) to exercise the unnamed-comparison fallback
(User Flow/04 required behaviour).

## 3. Candidates and controls (R-07)

| Candidate | Role | 03 extraction | 04 question writer | Status this run |
|---|---|---|---|---|
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | Implementation candidate | `NUAVE_PROVIDER=gemini`, `GEMINI_AUDIT_MODEL=gemini-3.5-flash-lite`, wired `gemini.ts` path (web search on) | `NUAVE_QUESTION_PROVIDER=gemini`, wired `questions-id-provider.ts` + `questions-id.ts` boundary, no search, `question-writer-v1` instruction | **NOT RUN** — provider blocked (depleted prepayment credits, `429 RESOURCE_EXHAUSTED`, verified 2026-08-17 incl. free-tier probe) |
| GPT-5.6 Luna (`gpt-5.6-luna`) | Quality benchmark | `NUAVE_PROVIDER=openai` (Responses API, web search, low reasoning) | `NUAVE_QUESTION_PROVIDER=openai` (Responses API, no search, `question-writer-v1`) | **NOT RUN** — `OPENAI_API_KEY` absent from `.env.local` and environment (flagged) |
| Deterministic Indonesian fallback | Continuity control (04 only) | — | `buildDeterministicIndonesianPack` from the confirmed brief | **RAN 5/5 packs** (no provider call, USD 0.00) |

Same minimized confirmed brief (`minimizeIndonesianBrief`, one per clinic,
frozen in the runner) and the same `question-writer-v1` instruction for both
models — the models were not reached, but the control input is identical for
the rerun. No web search in the question-writer test, per User Flow/04.

## 4. Session telemetry (real, R-11)

All timings from the 2026-08-17 session (UTC 14:44:49 start, 49.2 s wall):

| Metric | Value |
|---|---|
| Live Gemini calls attempted | 10 (5 extraction with search + 5 question-writer no-search) |
| Gemini calls completed with model output | 0 |
| Gemini tokens consumed | 0 (all calls rejected pre-generation) |
| OpenAI calls attempted | 0 (no key) |
| Deterministic fallback packs built | 5/5 |
| **Accounted cost (USD)** | **0.00** |
| Carryover (USD) | 0.4357 (unchanged) |
| **Ceiling headroom remaining (USD)** | **4.5643** |
| Session latency | 49.2 s (mostly the wired `gemini.ts` 4-attempt retry on the hard 429) |

Gemini candidate pricing reference (official developer pricing page, updated
2026-08-13): `gemini-3.5-flash-lite` paid tier USD 0.30 / 1M input, USD 2.50 /
1M output (thinking included); Google Search grounding 5,000 free requests /
month then USD 14 / 1,000. The repo's Gemini telemetry convention
(`gemini.ts`) records `service_tier: "free"`, `accounted_cost_usd: 0`; the
runner also records a notional paid-tier figure per call (0 this run because
no tokens were consumed).

## 5. Per-candidate results

### 5.1 03 extraction — Gemini 3.5 Flash-Lite: NOT RUN

| Clinic | Status | Provider reason |
|---|---|---|
| Sozo Dental Depok | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| SATU Dental Margonda | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| FDC Dental Clinic Margonda | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| OMDC Dental Margonda | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |
| Nirmala Dental | failed | prepayment credits depleted (`429 RESOURCE_EXHAUSTED`) |

No extraction draft exists for any clinic. The User Flow/03 measures (exact
business/branch resolution, official-source identification, category
suggestions, product/service accuracy, unsupported/flattering claims,
customer-context suggestions, comparison relevance, natural Indonesian,
structured-output validity, latency, cost) are **unmeasurable this run**.

Pre-existing code-path notes (recorded, not changed — no `src/` edits):
1. The wired extraction instruction (`gemini.ts`) still asks for **English**
   explanatory text — the "natural Indonesian writing" measure for 03 is not
   satisfiable on the current wired path (known Spec 003 gap for the
   Indonesian 03 contract).
2. The wired extraction draft schema has **no comparison-business field**;
   comparison relevance is proposed at confirmed-brief time, not by the 03
   engine.
3. `gemini.ts` retries every 429 four times with backoff; the hard
   `RESOURCE_EXHAUSTED` quota error is not a transient throttle, so ~5 s per
   call was spent retrying a config/billing error (the skill's fail-fast rule
   suggests 429-with-RESOURCE_EXHAUSTED should reject immediately).

### 5.2 04 question writer — Gemini 3.5 Flash-Lite: NOT RUN (degraded)

The wired boundary **never hard-fails** (User Flow/04 resilience design): all
five provider calls were rejected by Gemini, and the boundary returned the
**deterministic fallback pack** in every case (`source: "fallback"`,
`warnings: ["fallback_used"]`, boundary telemetry `null` by contract). The
runner labels this `degraded_to_fallback` and captures the provider reason from
the HTTP layer:

| Clinic | Boundary status | Pack source | Warnings | Provider reason |
|---|---|---|---|---|
| Sozo Dental Depok | degraded_to_fallback | fallback | fallback_used | prepayment credits depleted |
| SATU Dental Margonda | degraded_to_fallback | fallback | fallback_used | prepayment credits depleted |
| FDC Dental Clinic Margonda | degraded_to_fallback | fallback | fallback_used | prepayment credits depleted |
| OMDC Dental Margonda | degraded_to_fallback | fallback | fallback_used | prepayment credits depleted |
| Nirmala Dental | degraded_to_fallback | fallback | fallback_used | prepayment credits depleted |

**No model-authored question exists for any clinic.** The rubric items
(naturalness, relevance, distinctness of model output, accepted/light/
substantive counts, latency, model cost) are **unmeasurable** for the model
candidate this run. The boundary behaviour itself is verified working: blocked
provider → safe deterministic pack + fallback disclosure signal, zero cost,
~0.4–0.7 s per attempt (no retry on this path).

### 5.3 04 question writer — deterministic Indonesian fallback: RAN, scored

Real deterministic packs from the five confirmed briefs. Mechanical results
(computed by the wired validation code):

| Clinic | Count | 5/5 no-name/name | Issues | Blockers | Distinctness |
|---|---|---|---|---|---|
| Sozo Dental Depok | 10 | 5 / 5 | 0 | 0 | pass |
| SATU Dental Margonda | 10 | 5 / 5 | 0 | 0 | pass |
| FDC Dental Clinic Margonda | 10 | 5 / 5 | 0 | 0 | pass |
| OMDC Dental Margonda | 10 | 5 / 5 | 0 | 0 | pass |
| Nirmala Dental | 10 | 5 / 5 | 0 | 0 | pass |

Qualitative scoring (human review of every question; rubric: relevant to the
audited business/customer decision AND natural Indonesian as a customer would
ask it, without substantive replacement):

| Clinic | R+N count (/10) | Accepted unchanged | Light edit | Substantive replacement |
|---|---|---|---|---|
| Sozo Dental Depok | 1 | 0 | 10 | 0 |
| SATU Dental Margonda | 2 | 1 | 9 | 0 |
| FDC Dental Clinic Margonda | 1 | 0 | 10 | 0 |
| OMDC Dental Margonda | 2 | 1 | 9 | 0 |
| Nirmala Dental | 3 | 1 | 9 | 0 |
| **Total (50 questions)** | **9 (18%)** | **3 (6%)** | **47 (94%)** | **0** |

Characteristic pattern: every slot template is mechanically distinct and
correct, but the confirmed-brief tail clause ("untuk Warga Depok … yang
mencari …") is appended to nearly every question, producing long, repetitive,
brief-like sentences; slot 2 templates carry grammar artifacts ("Saya cari
menemukan …", "Saya cari merapikan gigi …"); some slot-9 prepositions are
awkward ("reservasi … dengan <klinik>"). The consistently acceptable items
were slot 8 (address + hours) and the unnamed slot-6 fallback (Nirmala:
"Bandingkan Nirmala Dental dengan pilihan lain yang serupa di Margonda…" —
correct unnamed fallback, natural).

Safety: no discovery-question identity leakage, no comparison-name leakage
outside slot 6, no unsupported-premise patterns, no prohibited request, no
empty/unexecutable question in any pack.

## 6. Review rubric table (R-08) — per candidate

Legend: ✅ pass · ❌ fail · ➖ not measurable (candidate did not run)

| Rubric item | Gemini 3.5 Flash-Lite 04 | GPT-5.6 Luna 04 | Deterministic fallback 04 |
|---|---|---|---|
| Ten questions returned and parsed (all 5 packs) | ➖ (boundary returned fallback, not model output) | ➖ | ✅ 5/5 |
| Default five/five name/no-name composition | ➖ | ➖ | ✅ 5/5 all packs |
| Category and location relevance | ➖ | ➖ | ✅ (every question grounded in Depok + clinic category) |
| Plausible customer decision per question | ➖ | ➖ | ✅ (jobs are customer-real; wording is the weakness) |
| Natural Indonesian vocabulary/register/shape | ➖ | ➖ | ❌ 18% R+N; brief-tails and slot-2 grammar artifacts |
| Meaningful distinctness (not paraphrases) | ➖ | ➖ | ✅ mechanically distinct slots (template-identical shape though) |
| Unsupported premises / invented facts | ➖ | ➖ | ✅ none |
| Identity leakage (audited/comparison) | ➖ | ➖ | ✅ none |
| Useful unknown facts asked openly | ➖ | ➖ | ✅ (slot 10 availability checks; no asserted premises) |
| Comparison relevance + unnamed fallback | ➖ | ➖ | ✅ named comparisons scoped correctly; Nirmala unnamed fallback correct |
| Accepted unchanged / light / substantive | ➖ | ➖ | 3 / 47 / 0 of 50 |
| Latency | ➖ (blocked; ~0.4–0.7 s to rejection) | ➖ | ✅ ~0 ms (pure code) |
| Total provider cost | ✅ USD 0.00 (0 tokens) | ➖ | ✅ USD 0.00 |

| Rubric item (03) | Gemini 3.5 Flash-Lite 03 | GPT-5.6 Luna 03 |
|---|---|---|
| Exact business/branch resolution | ➖ not run | ➖ not run |
| Official-source identification | ➖ not run | ➖ not run |
| Category suggestions | ➖ not run | ➖ not run |
| Product/service accuracy | ➖ not run | ➖ not run |
| Unsupported/flattering claims | ➖ not run | ➖ not run |
| Customer-context suggestions | ➖ not run | ➖ not run |
| Comparison-business relevance | ➖ (out of current draft schema) | ➖ (out of current draft schema) |
| Natural Indonesian writing | ❌ not satisfiable on wired path (English instruction) | ❌ not satisfiable on wired path (English instruction) |
| Valid structured output first attempt | ➖ not run | ➖ not run |
| Latency / total cost | ➖ not run / USD 0.00 | ➖ not run / USD 0.00 |

## 7. Practical quality gate verdict (R-09)

| Gate requirement | Deterministic fallback | Gemini 3.5 Flash-Lite | GPT-5.6 Luna |
|---|---|---|---|
| 1. All five packs recover to ten executable questions without manual technical repair | ✅ | ➖ | ➖ |
| 2. No discovery question leaks audited or comparison identity | ✅ | ➖ | ➖ |
| 3. No material unsupported premise or prohibited request | ✅ | ➖ | ➖ |
| 4. ≥ 8/10 relevant & natural in ≥ 4/5 packs | ❌ (9/50 = 18%; best pack 3/10) | ➖ | ➖ |
| 5. Model materially outperforms the fallback on naturalness & contextual relevance | n/a (control) | ➖ | ➖ |
| 6. Measured cost and latency fit the paid preparation allowance | ✅ (USD 0.00, ~0 ms) | ➖ (0 tokens, USD 0.00) | ➖ |
| **Overall** | **FAIL (expected for a continuity path)** | **INCONCLUSIVE — not measured** | **INCONCLUSIVE — not measured** |

**The practical quality gate was NOT cleared.** No model candidate ran, so no
model candidate can be approved. The fallback alone cannot clear the gate (its
naturalness/relevance is far below the bar, as documented). Per User Flow/04,
when neither model clears the gate the product stays on the first reviewed
vertical with improved generation guidance and a rerun — here the rerun is a
provider-key prerequisite, not a guidance problem.

## 8. Cost accounting (R-11)

- Real billed spend this session: **USD 0.00** (no tokens consumed; both
  provider paths unavailable).
- Accounted against the USD 5 ceiling including the USD 0.4357 carryover:
  **0.00** → ceiling position unchanged; **USD 4.5643 headroom remains** for
  the provider rerun (10 Gemini calls ≈ USD 0.02–0.06 notional at paid-tier
  rates; the full Luna benchmark ≈ USD 1–2, both far inside the ceiling).
- Every attempted call was recorded with the same telemetry contract shape as
  production (requested model, latency, HTTP status, usage, accounted cost,
  failure reason), plus HTTP-layer usage capture for the 04 boundary (whose
  record telemetry is null by contract).

## 9. Findings recorded for the founder

1. **Both model paths are currently unusable** — Gemini prepayment depleted
   (`429 RESOURCE_EXHAUSTED`, all models, verified 2026-08-17); OpenAI key
   absent. No provider lock can be made from this run (R-10 deferred).
2. **The 04 boundary's graceful degradation worked as designed**: 5/5 blocked
   provider calls became deterministic packs (`fallback_used`) with zero cost
   and no hard failure — but a consumer that reads only `status`/question
   count cannot distinguish model output from fallback output; `pack.source`
   and `warnings` must be checked (the runner now does).
3. **The deterministic fallback is safe but not customer-grade** (18% R+N):
   the confirmed-brief tail-clause and slot-2 grammar artifacts are the two
   fixes that would most raise the fallback's floor — and they are the exact
   weaknesses the model candidate is expected to beat.
4. **`gemini.ts` retries the hard quota error** (429 RESOURCE_EXHAUSTED) 4×
   with backoff (~5 s wasted per extraction call); fail-fast on that status
   would be safer (recorded; no `src/` change made).
5. **03 extraction instruction remains English** in the wired path; the
   User Flow/03 "natural Indonesian writing" measure requires the Indonesian
   03 contract work before the measure is testable.
6. Uncommitted worktree changes were preserved untouched; no commits, no
   publishing, no business contact, no e2e run. `npm run test:audit` passes
   (runner lives outside `src/`).

## 10. Recommended provider lock (R-10 — for founder approval; NOT decided here)

| Stage | Recommended default | Basis | Action required |
|---|---|---|---|
| 03 extraction | **No lock — deferred** | No extraction ran this session | Restore Gemini prepayment OR add `OPENAI_API_KEY`, then rerun `npx vitest run scripts/eval`; the runner reuses the same five frozen briefs and instruction versions |
| 04 question writer | **No lock — deferred** | No model question pack exists this session; fallback fails the gate | Same as above; measure Gemini 3.5 Flash-Lite vs GPT-5.6 Luna vs fallback on the same five briefs, then decide |

The runner's five confirmed briefs, the `question-writer-v1` instruction, the
rubric scoring, and the telemetry capture are frozen and re-runnable. The next
smallest action: founder restores one provider credential, rerun, then approve
the lock from the completed table.

## 11. Files read / written

- Read (no changes): `specs/003-live-report-quality-gate/SPEC.md`,
  `User Flow/04 - Questions.md`, `User Flow/03 - Business Facts.md`,
  `src/lib/audit/questions-id-provider.ts`, `questions-id.ts`, `gemini.ts`,
  `openai.ts` (extraction shape), `telemetry.ts`, `provider.ts`, `types.ts`,
  `.env.local` (key presence only), `package.json`, `tsconfig.json`,
  `eslint.config.mjs`, official public pages of the five clinics.
- Written: `scripts/eval/provider-evaluation.spec.ts` (runner, reusable),
  `scripts/eval/.results/evaluation-results.json` (raw local evidence),
  this record.
