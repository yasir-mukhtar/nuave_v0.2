# Spec 003 / Phase 3 — Adversarial review

**Reviewer stance:** adversarial. Every verdict below is backed by a file:line, a command I ran, or a named test.
**Pinned state:** commit `f22b8ec` (`test-results: commit Sozo Dental AI Visibility Report artifacts`), extracted read-only via `git archive f22b8ec` into a scratch tree and measured there.
**Reviewed:** 2026-08-18.

## 0. Two conditions that limit what anyone can verify

**0.1 — The working tree mutated during this review.** At session start `git status` listed two modified files. Partway through it listed:

```
M next-env.d.ts, package-lock.json, src/app/audit/ReportView.tsx,
  src/lib/audit/contracts.ts, src/lib/audit/report-gaps.test.ts,
  src/lib/fixture-journey/adapter.ts, src/lib/fixture-journey/report.test.ts
D test-results/report-pipeline.md
D test-results/report.md
```

`src/lib/audit/contracts.ts` mtime moved to 15:45:14 — after my 15:38 test run. Consequence: `npm run test:audit` passed 263/263 at 15:38 and now fails 1/263, consistently, three runs:

```
report-pipeline.test.ts:293 — "report synthesis integrity (Sozo live-run defect regression,
Spec 003 R-19/R-37) rejects a synthesis that marks a completed, mentioned observation
not_assessed (the Sozo defect)"  → expected reject, resolved instead
```

The two Sozo artifacts under review were deleted from the working tree mid-review. They survive in `f22b8ec`, which is what I reviewed. **No Phase 3 verdict can be recorded against a tree that is being edited concurrently.**

**0.2 — The live run's evidence record does not exist on this machine.**

```
$ ls -la .secrets/
ls: .secrets/: No such file or directory
```

`scripts/sozo/sozo-live-run.spec.ts:107` writes every artifact — `questions.json`, `observations.json`, `variance.json`, `telemetry.json`, `run-record.json` — to `.secrets/sozo-live-run-2026-08-17/`. `test-results/report.md:173` tells the reader "Jawaban asli, sumber, dan telemetri tersimpan di `observations.json` dan `telemetry.json` pada direktori privat." That directory is gone. Every criterion that depends on retained raw answers, attempts, sources, or per-call telemetry (AC-14, AC-19, R-20, R-30, R-37) is therefore **unverifiable, not met** — not because the run failed, but because its evidence is unavailable to any reviewer.

---

## 1. The three findings that decide the phase

### 1.1 — The run did not travel through the interface (Critical)

Phase 3's Outcome is "one real Indonesian business travels **through the same interface**." It did not. `scripts/sozo/sozo-live-run.spec.ts` is a vitest script that imports the library directly and calls `runAuditObservations` (line 476) and `createValidatedAuditReport` (line 643). It never issues an HTTP request to `/api/audit/run` or `/api/audit/report`, never renders `AuditWorkflow.tsx`, and never passes through `src/middleware.ts`.

Concretely, the run bypassed:

- the access gate (`src/middleware.ts:21`),
- the run route's Indonesian pack validation and resume dedup (`src/app/api/audit/run/route.ts:39-105`),
- **`assertReportGenerationGate`** — the ten-of-ten gate. It is defined at `report-pipeline.ts:44` and called only at `src/app/api/audit/report/route.ts:34`. `createValidatedAuditReport` does **not** call it internally (`report-pipeline.ts:111-115`). Both `sozo-live-run.spec.ts:643` and `scripts/sozo/report-rerun.ts` call `createValidatedAuditReport` directly, so the gate R-19/AC-05/AC-13 rest on was never executed on the path that produced these artifacts.

### 1.2 — The delivered report was assembled by hand (Critical)

Phase 3 requires one complete report "**without manual rescue**." `test-results/report.md:169` states the opposite in its own method section:

> "satu panggilan sintesis dijalankan, tetapi hasilnya ditolak gerbang integritas karena status rekomendasi 'tidak dinilai' pada pertanyaan selesai. **Laporan ini disusun langsung dari jawaban terekam**"

The integrity gate that rejected it is `contracts.ts:731-737`. `scripts/sozo/report-rerun.ts:1-13` confirms the sequence: first synthesis rejected → instruction fixed → synthesis re-run against saved observations. So the Indonesian document under review is a human-authored markdown file, and the product's own output for the same run is `test-results/report-pipeline.md`, which is **English** and stamped `writing standard plain-en-v1` (line 3).

The two artifacts disagree about the same run:

| Measure | `report.md` (hand-written) | `report-pipeline.md` (machine) |
|---|---|---|
| Recommended, no-name questions | "**1 dari 5**" (line 20) | "Direkomendasikan: **2**" (line 11); NEED-01 *and* SOLUTION-02 both `recommended` (lines 34, 37) |
| Public information | "Terkonfirmasi di **3 dari 3**" (line 22) | 6 `confirmed`, 2 `incomplete`, 2 `not_assessed` (lines 34-43) |
| Comparison | "1 dari **1** pertanyaan yang menguji perbandingan" (line 21) | two comparison slots; COMPARISON-01 (Q5) recorded `not_observed` (line 38) |
| Findings | 4 | 3 |
| Actions | 3 | 4 |

The headline 8/10 and the 3/5 and 5/5 components *are* derivable from the ten rows in `report.md` §4. The recommendation, comparison, and information denominators are not — they contradict the only machine record of the same evidence. That is a direct failure of exit-gate criterion 3 (every important claim traceable) and of AC-17's "eligible denominators."

### 1.3 — The live report surface is English and has no PDF action (Critical)

The report the product actually renders is `src/app/audit/ReportView.tsx`. I traced every Indonesian report label:

```
$ grep -rn "indonesianHeadline|indonesianCountLabel|INDONESIAN_REPORT_LABELS" src/
→ only src/lib/audit/report-language-id.test.ts
```

`indonesianHeadline`, `indonesianCountLabel`, and `INDONESIAN_REPORT_LABELS` (which contains `not_tested: "Tidak diuji"` and `download_pdf: "Download PDF"`) have **zero production consumers**. Only `INDONESIAN_RUN_STATUS_LABELS` is wired, at `AuditStages.tsx:35,869`.

`ReportView.tsx` renders `AI Visibility Report` / `Main Result` / `Key findings` / `What to do next` / `Audit date` (lines 167-224), formats dates with `Intl.DateTimeFormat("en-US")` (line 194), and leads with `report.counts.unbranded_recommended` (line 229) — not "Bisnis Anda muncul di X dari 10 pertanyaan / X/10". And the only toolbar action is `Download JSON` (line 160). There is **no Download PDF control anywhere in the file**, though print CSS exists (`styles.noPrint`, `styles.detailsPrint`, lines 158, 399). R-29/AC-22 require Download PDF to be the *primary* action with the JSON export *secondary*; the live surface ships the secondary action alone.

Underneath, `report-language.ts:3` sets `REPORT_WRITING_STANDARD_VERSION = "plain-en-v1"`, and lines 209-211 say so explicitly:

> "a fixture or report must not be claimed to pass a settled Indonesian contract on these candidate values alone, and this calibration is **NOT wired into the live engine path** (plain-en-v1 stays the runtime default)."

The synthesis prompt asks for English (`openai.ts:495`). So the phase's founding premise — `docs/NOW.md`'s "an English report cannot pass the report-quality gate" — is unchanged by this work on the live path. The Indonesian report exists only as a markdown file a human wrote.

---

## 2. Verdicts, AC-01 … AC-26

| AC | Verdict | Evidence |
|---|---|---|
| **AC-01** Protected live entry | **MET (code), UNVERIFIED (test)** | `middleware.ts:25` requires `expected && cookie === expected`; `:29-31` returns 401 for `/api/audit` before any handler; `:38` matcher covers both trees. Fail-closed when `NUAVE_ACCESS_CODE` unset. Live/fixture are env-only (`provider.ts:48`, `NUAVE_FIXTURE_PREVIEW_ENABLED`); no client toggle exists. No automated test covers the live 401 — all three e2e specs are fixture-only. |
| **AC-02** Fixture regression | **NOT MET** | Measured at `f22b8ec`: `npm run test:audit` → **263 tests / 17 files** (baseline requires 276/19); `npx vitest run src/lib/fixture-journey` → **71 tests / 4 files** (baseline requires 126/7). `npm run check` **fails** (§AC-25). e2e specs statically total 31 (26+3+2) but I could not execute them (§3.9). |
| **AC-03** Shared journey states | **NOT MET** | Live surface vocabulary is English: `AuditStages.tsx:781-789` ("Run audit", "Collecting ten independent observations"), `ReportView.tsx:167-224`. The fixture journey is Indonesian. "Same customer-meaningful vocabulary" does not hold. Stage *sequencing* 03→06 and the facts/questions preconditions are implemented. |
| **AC-04** Browser-bound truthfulness | **NOT MET (half)** | The browser-close caveat exists at exactly one place — `AuditStages.tsx:815-818` — inside the `interrupted ?` branch, i.e. it is shown only **after** the run has already been interrupted. The running-state description (`:789`) says nothing about the browser. `grep -rn "stays open\|remain open\|tetap terbuka" src/app/audit/` returns that single line. Resume *is* implemented and truthful: `AuditWorkflow.tsx:556-586`, route validation `run/route.ts:62-105`, orchestrator `run-orchestrator.ts:77-104`, and the no-background-continuation comment at `AuditWorkflow.tsx:617-620`. |
| **AC-05** No partial report | **MET (code), UNVERIFIED (run)** | `report-pipeline.ts:44-91` rejects with 422 before any provider call; `run/route.ts:34` invokes it; `run-orchestrator.ts:210-229` emits `run_unfinished` with evidence and failed ids instead of a report. Never exercised on the Sozo path (§1.1). |
| **AC-06** Evaluation set | **MET (record)** | `evaluation-results.md:78-84` — five real Depok dental clinics with official branch URLs, public info only, no contact, nothing published. Not independently re-runnable without paid calls. |
| **AC-07** Evaluation controls | **NOT MET** | Design is fair — same `minimizeIndonesianBrief`, same `question-writer-v1`, no search in the writer test (`evaluation-results.md:109-111`), fallback scored alongside (§5.5). But Gemini produced **zero tokens** (`:106`, `:124`), so "both models receive the same inputs" was never exercised. One arm of a two-arm control was not run. |
| **AC-08** Practical quality gate verdict | **PARTIALLY MET** | Luna scored against all six gate rows with counts (`:265-273`), 50/50 R+N, 49/1/0. Fallback FAIL recorded. Gemini **INCONCLUSIVE**. Note the rubric's own ❌: "Natural Indonesian writing — not satisfiable on wired path (English instruction in `openai.ts`)" (`:259`) — a rubric item the winning candidate failed, not mentioned in the executive summary's "all six practical-gate criteria pass." |
| **AC-09** Provider lock | **MET with a caveat** | `provider.ts:48-55` fails closed to OpenAI on the live path. **Caveat:** `:51` — `NUAVE_LIVE_PROVIDER_TESTING=1` re-enables gemini/groq on the protected live path. R-13's wording is absolute ("cannot be selected for a live protected run"); an env escape hatch is not "cannot". Also **no startup fail-closed check**: `openai.ts:55-58` throws lazily *inside* `executeAuditPrompt`'s try (`:389`), so a missing `OPENAI_API_KEY` yields a `temporary`-classified failure that burns all three retry attempts per question rather than refusing at startup as R-13 requires. |
| **AC-10** Neutral instruction, no contamination | **MET (observations)** | `openai.ts:370-378` — the request body is exactly `[developer: neutral instruction, user: prompt.question]`. No brief, URL, competitor, prior answer, or method text. Instruction is Indonesian, versioned `neutral-response-v1` (`openai.ts:111-117`, `contracts.ts:27`). The separate 03 extraction instruction *is* still English (`openai.ts:263`) but 03 was not run live for Sozo — `sozo-live-run.spec.ts:119` reuses a frozen brief. Indonesian-answer confirmation rests on excerpts only; raw answers are gone. |
| **AC-11** Retry contract | **MET (code), NOT EXERCISED** | `retry.ts:261-326` — 1 initial + max 2 automatic, same locked input, `budget` carried forward per attempt (`:290`), every attempt persisted (`:284-289`), returns immediately on `evaluable` (`:294-300`), never rerunning a valid result. Tested in `retry.test.ts`. The Sozo run used 0 retries (`report.md:167`), so the contract has no live evidence. |
| **AC-12** Evaluable classification | **MET (code)** | `retry.ts:87-112`: completed + non-empty → evaluable; completed + empty → `empty_or_unusable` failed test; `markObservationFailed` (`:118`) prevents a block becoming non-appearance. Weakness: a policy refusal that still emits prose is classified evaluable — the classifier keys on answer length, not refusal semantics, and `refusal_present` (`telemetry.ts:219`) is not consulted in `classifyObservationFailure`. |
| **AC-13** Report starts exactly once | **NOT MET** | Report synthesis ran **at least twice** for this run: the first call was rejected by the integrity gate (`report.md:169`) and `scripts/sozo/report-rerun.ts` re-ran synthesis against the saved observations. The "never reruns an observation" half **is** honoured — `report-rerun.ts:1-13` explicitly re-runs synthesis only, "no new observation spend". |
| **AC-14** Telemetry completeness | **UNVERIFIABLE / NOT MET** | `.secrets/` absent. Additionally the method record contradicts itself: `report.md:166` claims "**11 panggilan pencarian untuk 10 observasi utama**" while `:167` claims one attempt per question and no retries — but `AUDIT_CALL_LIMITS.observation.max_tool_calls = 1` (`telemetry.ts:40`) caps each observation at one web-search call. 11 searches across 10 single-attempt observations is not reachable under the recorded configuration. AC-14 requires "the method record matches the run that actually occurred." |
| **AC-15** Variance re-asks | **MET (on the artifact)** | `report.md` §4 contains exactly ten rows and no repeat; variance appears only in the method section (`:168`) and explicitly "tidak mengubah angka laporan". Selection logic `sozo-live-run.spec.ts:328-356`, separate budget `:566-570`, separate artifact `:608-621`. The variance record itself is unverifiable. |
| **AC-16** Report headline and components | **NOT MET** | See §1.3. `ReportView.tsx:229` leads with `unbranded_recommended`; the Indonesian headline helper has no production consumer. |
| **AC-17** Assessed denominators / **Tidak diuji** | **NOT MET** | `indonesianCountLabel` — the only implementation of the `Tidak diuji` rule (`report-labels.ts:81`) — is called by nothing but its test. And the hand-written report's denominators contradict the recorded classifications (§1.2 table). |
| **AC-18** Findings and actions | **PARTIALLY MET** | `report.md` §2 has 4 findings, §3 has 3 actions, each with *Apa / Kenapa / Bukti / Pemilik / Selesai ketika*; action 3 is labelled "(investigasi lanjutan)" and states "Ini bukan temuan kekurangan layanan" (`:70-75`). Shape satisfies R-25. But these are hand-authored, and the pipeline's own four actions (`report-pipeline.md:25-28`) are different — so the schema cap `priorities … .max(5)` (`types.ts:294-297`, widened from 3 ✓) was not what produced the delivered list. |
| **AC-19** Exact evidence | **UNVERIFIABLE** | Excerpt-verbatim enforcement exists in the pipeline path (`contracts.ts` evidence validation, `:742` brand-appearance check against `raw_answer`), and `sozo-live-run.spec.ts:249` implements exact excerpting. But the delivered report bypassed the pipeline and the raw answers are gone, so no excerpt can be checked against its source. Excerpts are at least untranslated Indonesian, and the appearance rule strips URLs before matching (`:235-247`), so a citation URL alone cannot count as appearance ✓. |
| **AC-20** Method section | **PARTIALLY MET** | `report.md` §5 carries surface, requested/returned model, language + instruction version, location, date range, search condition, retries, variance, and synthesis provenance, and does flag "bukan sesi ChatGPT konsumen milik pengguna" (`:161`). But it was written by hand, contains the 11-vs-10 contradiction, and its "satu panggilan sintesis" line is stale given `report-rerun.ts`. |
| **AC-21** Indonesian writing contract | **NOT MET** | `report-language.ts:3` `plain-en-v1` is the runtime standard; `:209-211` states plain-id-v1 is not wired to the live engine; `report-pipeline.md:3` stamps `plain-en-v1`. No plain-id-v1 validation ran on anything delivered. |
| **AC-22** PDF/print fidelity | **NOT MET** | No Download PDF action exists in `ReportView.tsx`; `Download JSON` (`:159-161`) is the only action, inverting the specified primary/secondary. `INDONESIAN_REPORT_LABELS.download_pdf` unused. No PDF artifact exists for the Sozo run. |
| **AC-23** Cost ceilings | **PARTIALLY MET** | ✓ `limit_usd: z.literal(5)` (`types.ts:242`) — a client cannot raise the limit. ✓ carryover floor `Math.max(client, env)` (`telemetry.ts:93-95`). ✓ retry-aware allowance `observation: 30` (`telemetry.ts:51`, `retry.ts:27`). ✗ the env that supplies the floor is **blank in `.env.example:17`** and documented as "Optional", so by default `configuredAuditCarryoverCostUsd()` returns 0 and a client-supplied `carryover_cost_usd: 0` stands. ✗ `budget.calls` is client-supplied on every request (`run/route.ts:20-29`, `report/route.ts:21-27`) with no server-side persistence — prior spend is resettable by sending `calls: []`, so "per-session ceiling" is per-request in practice. ✗ **accounting honesty:** `evaluation-results.md:126` records "Accounted cost (repo convention) USD 0.00" while `:123` records USD 0.0654 of real Luna spend across 10 real calls. AC-23 requires "every paid call … is accounted with real usage." Recording real spend as zero is not an accounting convention; it is an unaccounted call. The same wording recurs at `:60` and `:281-283`. |
| **AC-24** Quality-gate review | **NOT MET** | `SPEC.md:808-813` — Verification artifact / Result / Date / Commit all "Pending". No `specs/003-live-report-quality-gate/VERIFICATION.md` exists (`find specs -type f` returns only `SPEC.md` and `evaluation-results.md`). |
| **AC-25** Repository checks | **NOT MET** | At `f22b8ec`, `npm run check` **fails**: `typecheck` ✓, `lint` ✓ (12 warnings, 0 errors — pre-existing `<img>` and unused-arg warnings), `format:check` ✗ — `[warn] src/lib/audit/report-gaps.test.ts`. The uncommitted working-tree change to that file is precisely the prettier fix, i.e. the committed state is unformatted. `npm run build` not executed (§3.9). |
| **AC-26** Human judgment gates | **N/A (founder), UNRECORDED** | Founder gates I cannot re-run. Nothing is recorded: no VERIFICATION.md, and open question 5 (named execution-surface wording, `SPEC.md:765-768`) remains unresolved while `report.md:161` already ships wording for it. |

---

## 3. Independent exit-gate assessment (R-32, all eight)

Applied to `test-results/report.md` + `test-results/report-pipeline.md` + retained evidence.

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | 10/10 evaluable observations | **PASS (claim), UNVERIFIABLE (evidence)** | `sozo-live-run.spec.ts:488-509` asserts 10 observations, no failures, each `completed`, non-empty, `evaluable`, `neutral-response-v1`, `OpenAI Responses API`, `gpt-5.6-luna`. `report.md:81` and `report-pipeline.md:34-43` both show ten completed rows. The underlying `observations.json` is gone. |
| 2 | 1–5 material, specific findings | **PASS** | Four findings (`report.md:32-50`), each concrete and question-anchored (5/5 name recognition; Q2/Q5 absence; Q4 WhatsApp recommendation; balanced SATU Dental comparison). None is filler. |
| 3 | Every important claim traceable | **FAIL** | The component counts in §1 contradict the machine record of the same run (§1.2 table): "1 dari 5" vs 2 recommended; "3 dari 3" vs 6 confirmed / 2 incomplete / 2 not assessed; "1 dari 1" comparison while Q5 is a comparison question recorded `not_observed`. Separately, finding 1 asserts the business "**selalu** dikenali" (`:24`, `:32`) — a universal claim from n=5 in one sample on one date. |
| 4 | Non-technical Indonesian reader, ~10 minutes | **UNVERIFIABLE as a product property** | The markdown reads plainly and is about 1,400 words. But it is not what the product renders: `ReportView.tsx` is English throughout (§1.3). A gate passed by a hand-written document does not establish that the system produces a passing report. The founder-readability judgment itself is AC-26 and is unrecorded. |
| 5 | Observation / interpretation / action distinguished | **PASS** | `report.md:33-35, 38-40, 43-45, 48-50` label *Observasi / Interpretasi / Bukti* explicitly; §3 separates *Apa / Kenapa / Bukti*. |
| 6 | 1–5 feasible, evidence-linked actions incl. labelled maintenance/further-investigation | **PASS** | Three actions with owner and observable completion check; action 2 is a preserve-a-strength action; action 3 is labelled "(investigasi lanjutan)" and explicitly disclaims inventing a deficiency (`:70-75`). |
| 7 | Failures and limitations visibly retained | **PARTIAL** | §1 "Batasan penting", §5 "Yang tidak dibuktikan audit ini", the variance note, and the disclosure that synthesis was rejected (`:169`) are all present and honest. But the report does not tell its reader that it was assembled by hand rather than produced by the audit system, and its "satu panggilan sintesis" line omits the later `report-rerun.ts` synthesis. |
| 8 | Same facts rendered in the PDF | **FAIL** | No PDF/print action exists in the live report view (§1.3), and no PDF artifact exists for this run. The criterion's escape clause is "whenever that derived artifact is available" — it is not available, and R-29/AC-22 required it to be. |

**Exit gate: 3 PASS, 2 FAIL, 1 PARTIAL, 2 unverifiable.** Criteria 3 and 8 fail outright. The gate cannot be recorded as passed.

---

## 4. Findings

### Critical

**C-1 — The live run bypassed the interface, the access gate, and the ten-of-ten gate.**
Evidence: `scripts/sozo/sozo-live-run.spec.ts:476` and `:643` call `runAuditObservations` / `createValidatedAuditReport` directly; `assertReportGenerationGate` (`report-pipeline.ts:44`) is called only from `src/app/api/audit/report/route.ts:34`, and `createValidatedAuditReport` (`:111-115`) does not call it.
Why it matters: Phase 3's outcome is a claim about the *system*, not about the library. The gate the phase relies on to guarantee "no partial report" has never run on the path that produced the artifacts.
Counter-example: delete any one observation from the array passed at `sozo-live-run.spec.ts:643` — `createValidatedAuditReport` will proceed to a paid synthesis call, because the only 10/10 check lives in the route the script does not use.

**C-2 — The delivered Indonesian report was hand-assembled after the pipeline's output was rejected.**
Evidence: `test-results/report.md:169`; `scripts/sozo/report-rerun.ts:1-13`; the machine output `test-results/report-pipeline.md:3` is English/`plain-en-v1`.
Why it matters: "without manual rescue" is the operative phrase in the Phase 3 outcome. A report a human wrote from recorded answers proves the answers were good; it proves nothing about report synthesis, which is exactly what the quality gate is meant to test.

**C-3 — The live report surface cannot produce the report the gate was applied to.**
Evidence: `ReportView.tsx:160,167-224,229` (English, `Download JSON` only, `unbranded_recommended` headline); `report-language.ts:3,209-211` (`plain-en-v1` runtime, plain-id-v1 explicitly not wired); `openai.ts:495` (synthesis asks for English); `grep` shows `indonesianHeadline` / `indonesianCountLabel` / `INDONESIAN_REPORT_LABELS` consumed only by `report-language-id.test.ts`.
Why it matters: AC-16, AC-17, AC-21, AC-22 are all unmet on the live path simultaneously, and `docs/NOW.md`'s stated blocker ("an English report cannot pass the report-quality gate") is untouched.

**C-4 — The report's component counts contradict the recorded classifications for the same run.**
Evidence: §1.2 table — `report.md:20,21,22` vs `report-pipeline.md:11,34-43`.
Why it matters: exit-gate criterion 3 and AC-17. A paying reader cannot reconcile "1 dari 5 direkomendasikan" with a machine record saying two questions were recommended.
Reproduction: open both committed files at `f22b8ec` and compare the recommendation and information columns.

### Major

**M-1 — The recorded test baseline is not reproducible; two suites are far below it, and `npm run check` fails.**
Evidence: at `f22b8ec` — audit **263/17 files** (AC-02 requires 276/19); fixture-journey **71/4 files** (requires 126/7); `npm run check` fails on `prettier` for `src/lib/audit/report-gaps.test.ts`. `evaluation-results.md:56,306` claims "suite 337 green" — off by 74 from anything measurable. The Spec 002 commit that recorded the 276/126 baseline (`127090c`) contained only **9** audit test files and **3** fixture-journey test files; `git log --diff-filter=D -- 'src/lib/**/*.test.ts'` shows no test file was ever deleted. So the baseline was never reproducible from committed history.
Why it matters: AC-02 and AC-25 are the automated half of the phase's verification, and R-33 forbids regressing them. Three different numbers (276, 337, 263) are in circulation for one suite.

**M-2 — Real paid spend is recorded as USD 0.00.**
Evidence: `evaluation-results.md:126` "Accounted cost (repo convention) **USD 0.00**" against `:123` "Luna notional cost **USD 0.0654**" from 10 real calls; repeated at `:60` and `:281-283`.
Why it matters: AC-23 requires "every paid call (evaluation, observations, report, variance re-asks) is accounted with real usage." A convention that books real spend at zero defeats the carryover mechanism it feeds — the next run inherits `0.4357` as though the evaluation were free. The honest entry is USD 0.0654 with the carryover advanced accordingly.

**M-3 — Session cost accounting is client-supplied and resettable.**
Evidence: `run/route.ts:20-29` and `report/route.ts:21-27` accept `budget` (including the full `calls` array) from the request body; `telemetry.ts:140-167` computes stage counts and accounted spend from `input.budget.calls`. No server-side store exists.
Why it matters: AC-23's "USD 5 per-session ceiling enforced server-side" holds only within one HTTP request. A client that posts `calls: []` restores full headroom. `limit_usd` is correctly pinned (`types.ts:242`) and the carryover floor is correctly a `max` (`telemetry.ts:93-95`), so this is the one remaining hole — but it is the one that makes "per-session" untrue.
Related: `.env.example:17` leaves `OPENAI_AUDIT_CARRYOVER_COST_USD` blank and labelled "Optional", so the 0.4357 floor is not enforced in a default deployment at all.

**M-4 — The browser-open caveat appears only after the run is already interrupted.**
Evidence: `AuditStages.tsx:815-818` sits inside the `interrupted ?` branch; the running-state description at `:789` omits it; a repo-wide grep finds no other occurrence.
Why it matters: AC-04 is phrased "Given the live run **is executing**, when the progress surface is inspected". A user who closes the tab mid-run was never warned. The resume machinery behind it is genuinely correct, which makes the missing sentence the whole defect.

**M-5 — The method section is internally inconsistent about search calls and retries.**
Evidence: `report.md:166` ("11 panggilan pencarian untuk 10 observasi utama") vs `:167` (one attempt per question, no retries) vs `telemetry.ts:40` (`max_tool_calls: 1` per observation).
Why it matters: AC-14 requires the method record to match the run. Under the recorded configuration 11 searches across 10 single-attempt observations is unreachable; one of the three statements is wrong, and `.secrets/` is gone so none can be checked.

**M-6 — `gemini.ts` retries a hard quota error four times.**
Evidence: `gemini.ts:136-158` — `maxAttempts = 4`, and `status === 429` is grouped with `>= 500` for backoff retry.
Why it matters: recorded as a known issue at `evaluation-results.md:319-321` and still unfixed. `429 RESOURCE_EXHAUSTED` from depleted prepayment is not transient; this burned ~9.5s per call during the evaluation and would do the same in any future comparison rerun.

### Minor

**m-1 — `NUAVE_LIVE_PROVIDER_TESTING=1` re-enables Groq/Gemini on the protected live path** (`provider.ts:51`). Server-only, so AC-01's "no client input" holds, but R-13's "cannot be selected for a live protected run" is absolute and this is a switch.

**m-2 — No startup fail-closed check for the production credential.** `openai.ts:55-58` throws lazily inside the try block at `:389`, so a missing key yields a `temporary` classification (`retry.ts:106`) and consumes all three attempts per question — 30 wasted attempts before the run gives up. R-13 requires "startup or deployment fails closed."

**m-3 — The private report was committed despite being labelled private.** `report.md:6` reads "Status laporan: privat (hanya di `.secrets/`)" while the file is committed at `test-results/report.md` in `f22b8ec` — and `.gitignore:21` ignores `test-results/`, so it was force-added. The statement inside the artifact is false about the artifact.

**m-4 — The evaluation's headline overstates the rubric result.** `evaluation-results.md:36` says "All six practical-gate criteria pass for Luna", but the R-08 rubric at `:259` records ❌ for "Natural Indonesian writing" on 03 for Luna. The failing row is disclosed later (`:315-318`); the summary does not carry it.

**m-5 — "Bisnis lain yang disebut … dan lainnya"** (`report.md:153`) — an unbounded list terminator in a section that R-24 asks to be exact about other named businesses.

### Nit

**n-1 — `report.md:24` and `:32` use "selalu" (always)** for a 5/5 result in a single sample; the machine conclusion (`report-pipeline.md:20`) says "clearly recognised" without the universal.

**n-2 — Mixed-language UI strings**: `AuditStages.tsx:799` and `:805` embed "Belum berhasil diuji" and "Minta bantuan" inside otherwise English sentences.

---

## 5. Test-suite audit — weak or vacuous assertions

1. **`report-language-id.test.ts:215-264` is tautological.** It asserts `INDONESIAN_REPORT_LABELS.not_tested === "Tidak diuji"`, `.download_pdf === "Download PDF"`, `indonesianHeadline(8) === "Bisnis Anda muncul di 8 dari 10 pertanyaan"`, `indonesianCountLabel(0,0) === "Tidak diuji"`. Every one of these symbols has **zero production consumers** (verified by grep across `src/`). These tests assert that a constant equals its own literal. They are the only "coverage" behind AC-16, AC-17 and the `Tidak diuji` rule, and they would stay green if `ReportView.tsx` were deleted.

2. **`retry.test.ts:378-385` restates the implementation.** `expect(MAX_ATTEMPTS_PER_QUESTION).toBe(3)` and `expect(OBSERVATION_STAGE_MAX_CALLS).toBe(10 * MAX_ATTEMPTS_PER_QUESTION)` re-derive `retry.ts:19,27` from themselves. The *behavioural* retry tests in the same file are sound; these four lines are not evidence.

3. **`sozo-live-run.spec.ts` is presented as the live-run proof but can never run in CI.** It makes real paid calls, lives outside `src/` specifically so `npm run test:audit` skips it (`:30-33`), and its 10/10 assertions (`:488-509`) execute only when a human runs it with a funded key. It is a run script wearing a test's clothes; nothing in the automated suite covers what it asserts.

4. **No test covers the live report surface.** There is no assertion anywhere that `ReportView.tsx` renders the Indonesian headline, the two component measures, `Tidak diuji`, or a Download PDF action — which is why all four could be absent while the suite is green.

5. **No e2e covers the live path.** `tests/e2e/` contains only `fixture-journey.spec.ts` (26), `forced-failure.spec.ts` (3), `preview-disabled.spec.ts` (2). AC-01's 401-before-handler, AC-03, AC-04, and AC-05 have no end-to-end proof. The fixture side of R-34 *is* genuinely enforced — `tests/e2e/helpers.ts:57` fails the test on any `/api/audit/*` request from fixture mode.

6. **The one test that would have caught the Sozo defect is currently failing** in the working tree (`report-pipeline.test.ts:293`), broken by a concurrent uncommitted edit to `contracts.ts`. It passes at `f22b8ec`.

---

## 6. What I could not verify

- **e2e execution.** `npm run test:e2e` could not run in the pinned tree: Turbopack rejects the symlinked `node_modules` ("Symlink [project]/node_modules is invalid, it points out of the filesystem root", `webServer` exit 1). I did not run it in the live tree because that tree is being edited mid-review and includes changes to `fixture-journey/adapter.ts` and `report.test.ts` — a pass or fail there would not be attributable to `f22b8ec`. Static count is 31, matching the baseline.
- **`npm run build`** — same Turbopack/symlink limitation.
- **Everything downstream of `.secrets/`**: raw answers, per-attempt telemetry, sources, response IDs, usage, variance records, and therefore AC-14, AC-19, and the evidentiary half of AC-15, AC-20 and the exit gate's criterion 1.
- **AC-26 and the AC-24 human judgments** — founder gates, unrecorded.

---

## 7. Summary

The method must be improved before any quality-gate verdict is recorded. The observation engine is the strongest part of this work and it genuinely performed: ten evaluable Indonesian answers on the first attempt through one locked provider, with clean request hygiene (`openai.ts:370-378` sends only the neutral instruction and the question), a correct 1+2 retry implementation, a real 10/10 gate in the route, and an evaluation that found and fixed two live bugs before they reached production. But the phase's actual claim — that the *system* produced a report worth paying for, without manual rescue — is not supported by the artifacts. The run bypassed the interface and the ten-of-ten gate by calling the library directly; the pipeline's report was rejected by its own integrity check and the Indonesian document under review was written by hand; the live report surface is English, has no Download PDF, and never calls the Indonesian headline, `Tidak diuji`, or `plain-id-v1` code that only its own unit tests consume; the delivered component counts contradict the machine record of the same run; the evidence directory those artifacts point to does not exist; the recorded test baseline is 276/126 while the repository yields 263/71 and `npm run check` fails; and USD 0.0654 of real spend is booked as USD 0.00. Recording a pass here would certify a report the product cannot generate against evidence no one can inspect. Fix report synthesis and the Indonesian report surface, run the audit through `/audit` and `/api/audit/*` end to end, retain the evidence export in a reviewable location, reconcile the test baseline, then re-apply the gate.
