# Spec 003: Live engine connection and report-quality gate

> Status: **Approved — implementation in progress** (founder-approved 2026-08-17)
> Owner: Founder
> Updated: 2026-08-17
> Implements: Phase 3 of `docs/END_TO_END_PLAN.md` — **Live engine connection and
> report-quality gate** (candidate sequence `003-live-report-quality-gate`)

> **Relationship to Specs 001 and 002:** `specs/001-simulated-journey-shell` and
> `specs/002-indonesian-audit-contract` are **Verified** (2026-08-17). The
> fixture journey (NVA-FIKTIF-001, fictional Kopi Taman Senja) is the frozen
> offline harness for the canonical 01 → 06 sequence with Indonesian contracts;
> the live audit engine (`/audit` + `/api/audit/*`) is English, browser-bound,
> and separate. This specification connects that live engine behind the same
> journey states for **03 Business Facts → 04 Questions → 05 Audit Run →
> 06 Report** and applies the Phase 3 report-quality gate to one real
> Indonesian report. It is a **Draft**: nothing in it is approved for
> implementation.

## Required context

Read in order:

1. `AGENTS.md` — contributor rules and the no-commit/no-publish gate
2. `README.md` — product flow, live workflow state, cost-guard environment
3. `docs/NOW.md` — Current objective, What is known, and Do now (steps 5 and 6)
4. `docs/END_TO_END_PLAN.md` — **Phase 3 — Live engine connection and
   report-quality gate** (Outcome, Work, Exit gate), **Target customer journey**
   (touchpoints 6–7 Processing and Report delivery), **Experience state model**
   (Section 5), **Verification strategy** (Section 9), **Failure and recovery
   matrix** (Section 10), **Risks and controls** (Section 11), and **Founder
   decisions by gate** (Section 13, "Needed before the first real audit")
5. `docs/JOURNEY_CONTRACT.md` — the Phase-3 build row, the module ownership and
   handoff table (modules 03–06), and the cross-module invariants
6. `docs/DECISION_LOG.md` — the 2026-08-17 rows (durable one-provider run with
   the 1+2 retry policy; one to five actions; canonical journey order; direct
   appearance count; 10/10 evaluable with substantive-refusal rules;
   Rp99.000/Midtrans/Resend being Phase 4/5) and the surface-honesty rows
   (OpenAI Responses API / ChatGPT naming, 2026-07-31 and 2026-08-01)
7. `specs/002-indonesian-audit-contract/SPEC.md` and its `VERIFICATION.md` —
   the implemented state this phase connects (Indonesian generation boundary,
   `plain-id-v1` writing contract, settled labels, fixture chain, test
   baseline 276 + 82 + 33 — see the baseline correction note under "Observed
   evidence")
8. `specs/README.md` (spec lifecycle) and `docs/templates/SPEC.md` (structure)
9. `User Flow/05 - Audit Run.md` — settled production decisions (one provider
   per audit; OpenAI Responses API GPT-5.6 Luna web search low reasoning;
   neutral Indonesian instruction; retry contract 1+2; ten-of-ten gate;
   discovery contamination; evidence record; sequential prototype) and the
   acceptance criteria
10. `User Flow/06 - Audit Report.md` — report content hierarchy, result and
    denominator contract, and the acceptance criteria (settled-decision and
    acceptance sections)
11. `User Flow/04 - Questions.md` — **Provider and prompt-instruction
    evaluation** and **Practical quality gate** (the five-business evaluation)
12. `User Flow/03 - Business Facts.md` — **Recommended engine and evaluation
    gate** (Gemini 3.5 Flash-Lite candidate, GPT-5.6 Luna benchmark, five-
    business evaluation)
13. `docs/AUDIT.md` — Measurement statement, Question rules, Capture, Verify
    sources, Report format, Plain-language writing standard, Report acceptance
    checklist, and Data boundaries
14. Code to ground the spec (read-only):
    `src/lib/audit/provider.ts`, `openai.ts`, `gemini.ts`, `groq.ts`,
    `stream.ts`, `report-pipeline.ts`, `telemetry.ts`, `contracts.ts`,
    `types.ts`, `questions-id.ts`, `report-language.ts`, `report-labels.ts`,
    `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts` (the frozen chain used
    as the offline harness), `src/app/audit/*` (`AuditWorkflow.tsx`,
    `ReportView.tsx`, `AuditStages.tsx`), `src/app/api/audit/*/route.ts`,
    `src/middleware.ts`, `.env.example`

Do not load or use as product authority: `archive/`, `node_modules/`, private
run artefacts outside the repository, superseded plans, or the legacy
repository. Private run results from earlier cycles remain outside the
repository and unpublished unless a later decision changes that.

## Problem

### Observed evidence

- Specs 001 and 002 are verified (2026-08-17): 276 audit unit tests, 82
  fixture-journey unit tests, 33 e2e tests, check and build all pass. The
  fixture journey is Indonesian, canonical 01 → 06, and makes no
  `/api/audit/*` call. The live engine is untouched and separate
  (`specs/002-indonesian-audit-contract/VERIFICATION.md`).
  **Baseline correction (Phase 3 fix-round-2 adversarial review, 2026-08-18):**
  this section and R-33/AC-02 originally read "126 fixture-journey unit tests,
  31 e2e tests" — figures that do not match Spec 002's own `VERIFICATION.md`
  (which recorded **82/82 fixture-journey tests, 4 files** at its verified
  commit) and were never reproducible from committed history. The e2e count
  also drifted from 31 to 33 as tests were added after Spec 002 verified. The
  numbers here are corrected to the measured, reproducible baseline: **276
  audit unit tests (18 files), 82 fixture-journey unit tests (4 files), 33 e2e
  tests (28 enabled + 3 forced-failure + 2 disabled)**.
- The live engine has never produced a real Indonesian report. The live
  workflow (`src/app/audit/*`) remains English, and the observation and
  extraction instructions ask the provider for **English** output
  (`src/lib/audit/openai.ts`: "Answer the user's question naturally in
  English…"). `docs/NOW.md` states the known gap: "an English report cannot
  pass the report-quality gate."
- The live run is browser-bound: `/api/audit/run/route.ts` owns the run inside
  one streaming HTTP request with sequential concurrency 1 and one attempt per
  question. `AuditStages.tsx` offers to rerun all ten after an interruption
  rather than retrying only failed questions. There is no retry policy.
- The settled retry contract (decision log 2026-08-17; User Flow/05) is one
  initial attempt plus up to two automatic technical retries per question,
  targeted, never rerunning a valid result. The current observation stage
  ceiling of ten calls (`AUDIT_STAGE_CALL_LIMITS.observation = 10` in
  `telemetry.ts`) cannot absorb any retry without an explicit revision, and
  User Flow/05 records this as a known conflict.
- The settled report requires one to five evidence-backed actions; the report
  synthesis contract still caps priorities at three (`openai.ts`: "Return no
  more than three priorities"), and Spec 002's verification records this as a
  known implementation gap belonging to Phase 3.
- The Indonesian question-generation boundary (`questions-id.ts`) is built and
  tested with a stubbed provider (Spec 002 R-29…R-37) but is not wired to a
  live call. The 03 extraction provider and the 04 generation provider are not
  locked; User Flow/03 and /04 require a five-business evaluation before
  locking them.
- Cumulative accounted private-run spend is USD 0.4357, leaving USD 4.5643
  under the USD 5 per-session ceiling (`docs/NOW.md`). No additional paid
  observation is approved by that planning note; this phase's paid calls
  require founder approval (open question 3).
- The Phase 3 exit gate ("report worth paying for") has never been applied to
  a real report (`docs/END_TO_END_PLAN.md` Phase 3; `docs/NOW.md` "Do now"
  steps 5–6). `docs/AUDIT.md` explicitly encourages the variance re-ask as a
  separate measurement that never feeds the reported count.

### Interpretation

Nuave cannot yet judge whether its report is worth paying for: the live engine
is not connected behind the journey states, produces English output that
cannot pass the quality gate, has no targeted retry policy, and the 03/04
provider choice is unverified. Phase 3 must (a) run the five-business provider
evaluation to lock the 03/04 providers, (b) connect the protected live engine
behind the same journey states for 03 → 04 → 05 → 06 with the settled
Indonesian method and retry contract, (c) produce one real Indonesian report
for one founder-approved business within the server cost ceiling, and (d)
apply the quality gate and record the verdict — all while the fixture mode and
its entire test baseline stay untouched and green. If the gate fails, the
phase repeats (method first), and nothing proceeds to durable delivery or real
checkout.

## Desired outcome

One real Indonesian business travels through the same journey states as the
fixture journey — **03 Business Facts → 04 Questions → 05 Audit Run →
06 Report** — through the protected live surface, and produces one complete
real Indonesian report **without manual rescue**: ten evaluable observations
under one locked production provider, a report that passes evidence and
`plain-id-v1` writing checks, and a PDF/print artifact derived from the same
report payload. That complete report and its evidence export are then read as
a sceptical owner and as an audit professional against the Phase 3 exit gate,
and the verdict with its concrete evidence is recorded in this spec package.

The run is a **founder-supervised private run**, not customer delivery: it is
access-gated, makes no payment, email, or durable-delivery claim, and accepts
that the browser must stay open (durable jobs are Phase 4). The fixture
journey and its tests remain untouched and passing, and there is no public
live/fixture switch.

## User and situation

The immediate user is the founder, operating a protected private run of the
live engine for the first real Indonesian report. They act as the business
owner's stand-in (confirming facts, approving questions, reading the report)
and as the operator (supervising the run, judging provider output, applying
the quality gate). The five-business evaluation is founder-directed: five real
public businesses in the selected launch category and city are audited for
provider quality only, with no contact and no publishing.

This is not a customer pilot and not a purchasable offer. No payment is
collected, no email is sent, no private access is provisioned, and nothing is
shown to any customer outside this repository.

## Scope

- Connect the existing live engine (extraction, observation streaming, compact
  report synthesis, evidence export, PDF/print) behind the same journey states
  for **03 Business Facts → 04 Questions → 05 Audit Run → 06 Report**, reusing
  the protected `/audit` surface behind the existing server access gate.
  Modules 01 (Order Preview) and 02 (Payment) remain fixture-only in this
  phase; the live path begins at 03.
- Keep explicit live/fixture separation: live behavior is selected by
  server-controlled configuration only; there is never a public live/fixture
  switch, query parameter, or client toggle.
- Run the five-business provider evaluation defined by User Flow/03 and /04
  (candidates Gemini 3.5 Flash-Lite vs GPT-5.6 Luna vs the deterministic
  Indonesian fallback) as the prerequisite for locking the 03/04 providers.
- Make the live run browser-bound truthfully: state the browser-close caveat;
  preserve completed observations in the browser session; resume without
  rerunning completed work. Durable jobs remain Phase 4.
- Run ten independent observations with one production provider per audit
  (OpenAI Responses API, GPT-5.6 Luna, web search required, low reasoning,
  Indonesian output per the decision log), the neutral Indonesian instruction,
  no business brief in discovery questions, verified location only, and the
  settled retry contract (one initial attempt + up to two automatic technical
  retries per question, targeted, never rerunning a valid result).
- Re-ask two or three designated questions separately after the main run to
  observe run-to-run variation; record repeats as variance measurement only,
  never blended into reported counts or denominators.
- Generate the report (06): direct appearance count out of ten with the
  separate **Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda**
  components; recommendation/comparison/information with eligible denominators
  (**Tidak diuji** when empty); one to five material findings; one to five
  evidence-backed actions; exact excerpts never translated; method section
  from recorded run facts; `plain-id-v1` writing contract; **Download PDF**
  via browser print/save in this phase; complete evidence export.
- Widen the report action capacity from three to five (the settled 1–5 range).
- Apply the Phase 3 quality gate to the complete real report and evidence
  export, and record the verdict and its concrete evidence in this spec
  package.
- Add the smallest test extensions needed to prove live/fixture separation,
  the retry contract, the ten-of-ten gate, the report shape, and cost
  enforcement, without weakening the existing evidence, provenance, or cost
  guardrails.

## Non-scope

- Real checkout, payment, Midtrans, QRIS, bank transfer, GoPay, or DANA
  (Phase 5). The fixture's simulated payment stays fixture-only.
- Durable jobs, queues, server-owned order/run state, or execution that
  survives browser closure (Phase 4). This phase states the browser-close
  caveat explicitly and does not pretend background continuation.
- Resend email, report-ready email, delivery failure, or resend (Phase 4).
- Module 07 private report access and recovery (later module).
- Landing rewrite and final visual/copy pass (Phase 6), except the minimal
  Indonesian surface copy the private run needs (settled labels and
  customer-meaningful stages).
- Public rate limits, bot/abuse controls, per-brand caching, or public cost
  exposure (Phase 5).
- Multi-provider fallback inside a run, provider mixing, or automatic
  cross-provider recovery. One provider per audit stays.
- Re-check purchase or comparison behavior (Phase 9).
- Customer exposure, outreach, analytics, or launch of any kind. The private
  run and the evaluation are unpublished.
- The delivery-time promise, report retention period, and terminal remedy
  decisions; these remain Phase 4/5 founder items and this spec does not
  pre-commit them.
- The final customer wording of the named AI execution surface in the report
  method section (Spec 002 open question 1; founder review required, see Open
  questions).
- Editing, migrating, or deleting the frozen fixture chain, the golden Phase-1
  fixture, or any existing fixture test.

## Experience

### Protected live entry

The live path is the existing access-gated `/audit` surface (`src/middleware.ts`
compares the httpOnly `nuave_access` cookie; API requests fail closed with 401
before any provider call). Live mode is enabled by server configuration
(existing `NUAVE_ACCESS_CODE` gate); fixture mode remains behind its own
server flag (`NUAVE_FIXTURE_PREVIEW_ENABLED`) at `/audit/fixture`. Neither is
selectable by a client, and no screen presents a live/fixture choice. The
fixture journey continues to make zero `/api/audit/*` calls.

### Main path (founder-supervised private run)

1. **03 — Business Facts.** The founder submits one official public source.
   Live extraction runs once through the production provider selected by the
   five-business evaluation (R-06…R-10); a null or unusable parsed draft falls
   back to manual fact entry **without a second paid call** (existing behavior
   in `openai.ts`, `extractionDraftOrManualFallback`). The founder confirms or
   corrects the facts; correction before start creates a new fact version.
   Facts supplied by the founder remain labelled until verified.
2. **04 — Questions.** One bounded, no-search model call from the confirmed
   fact version produces the primary ten-question suggestion through the
   Indonesian generation boundary (`questions-id.ts`), with the deterministic
   Indonesian fallback when the model call fails; dynamic name/no-name
   classification; narrow blockers only; free editing; and explicit founder
   approval of the exact final strings. No regeneration on refresh; a changed
   fact version supersedes the pack.
3. **05 — Audit Run.** One explicit start action begins the run. Ten
   independent observations execute with one production provider (OpenAI
   Responses API, GPT-5.6 Luna, web search required, low reasoning, Indonesian
   output), the neutral Indonesian instruction, and the exact locked
   questions. The progress surface uses the customer-meaningful Indonesian
   stages and the settled run-status set **Menunggu / Sedang diuji / Mencoba
   kembali / Selesai / Belum berhasil diuji**. Targeted technical retries
   occur (one initial attempt + up to two automatic retries per question).
   The surface states plainly that this phase's run keeps the browser open:
   closing the tab stops the run; completed observations are preserved in the
   browser session and are not rerun on return. The run reaches the report
   only at 10/10 evaluable observations. After the main run, two or three
   designated questions are re-asked separately as variance measurement
   (R-22).
4. **06 — Report.** The five canonical Indonesian sections render from the
   frozen evidence set of the real run: headline **Bisnis Anda muncul di X
   dari 10 pertanyaan** and **X/10**, the separate **Tanpa menyebut bisnis
   Anda** and **Menyebut bisnis Anda** measures with their own denominators,
   recommendation/comparison/information with eligible denominators
   (**Tidak diuji** when empty), one to five findings, one to five
   evidence-backed actions, ten test-by-test rows with exact excerpts, and the
   method section built from recorded run facts. **Download PDF** prints the
   same payload through the browser; the evidence export (JSON, v3) is the
   secondary action. The screen and print output share the same report
   version and facts.

### Completion state and review

The report is the completion state of the private run. The founder then reads
the complete report and evidence export as a sceptical owner and as an audit
professional against the Phase 3 exit gate (R-31, R-32) and records the
verdict and its concrete evidence in this spec package. No upsell, customer
delivery claim, testimonial, or public exposure appears anywhere in the live
path.

### Language and accessibility

Customer-facing surfaces of the private run (facts confirmation, question
review, run progress, report) carry the settled Indonesian labels verbatim
(`docs/VOICE.md`, `report-labels.ts`) and are written in Indonesian per the
plain-language standard; exact evidence (questions, excerpts, business and
competitor names, source titles, official terms, dates, models) is copied
verbatim and never translated. The run progress and terminal states are
accessible without relying only on color or motion, and the primary path
works on a desktop viewport; mobile equivalence for the live run is judged
during review rather than claimed in this phase.

## Requirements

### Protected live mode and separation

- **R-01 — Protected live mode:** The live run is available only through the
  existing server access gate (`NUAVE_ACCESS_CODE` middleware; `/api/audit/*`
  fails closed). Live/fixture selection is server-controlled configuration;
  no query parameter, form value, or client state can enable or disable live
  mode, fixture mode, or convert one into the other.
- **R-02 — Fixture isolation:** Fixture mode, the frozen NVA-FIKTIF-001
  chain, `report-golden.ts`, and every fixture test remain untouched. The
  fixture journey still makes no `/api/audit/*` call, and a live run never
  consumes fixture evidence or fixture state.
- **R-03 — Shared journey states:** The live path advances 03 Business Facts
  → 04 Questions → 05 Audit Run → 06 Report with the same customer-visible
  vocabulary as the fixture journey (facts confirmed → questions approved →
  running → preparing report → ready). Modules 01 and 02 remain fixture-only
  in this phase.
- **R-04 — Browser-bound truthfulness:** The live run executes inside the
  browser-bound request lifecycle. The progress surface states that the
  browser must remain open, that closing it stops the run, and that completed
  observations are preserved in the browser session and are not rerun on
  return. It never claims background continuation or durable delivery.
- **R-05 — Founder-supervised private run:** The live path is operated and
  reviewed by the founder only. It makes no payment, email, private-access, or
  customer-delivery claim, and no customer outside this repository touches it
  in this phase.

### Five-business provider evaluation (03/04 providers)

- **R-06 — Evaluation set:** Run the evaluation on five real public
  businesses in the selected launch category and city (founder decision, open
  question 1). Use only public business information; do not contact the
  businesses and do not publish the drafts. Nothing from the evaluation is
  presented as customer proof.
- **R-07 — Candidates and controls:** Evaluate Gemini 3.5 Flash-Lite (03/04
  implementation candidate), GPT-5.6 Luna (quality benchmark), and the
  deterministic Indonesian fallback (04 only), using the same minimized
  inputs and the same versioned generation guidance for both models, with no
  web search in the question-writer test (User Flow/04).
- **R-08 — Review rubric:** Score every pack record against the User Flow/04
  rubric: ten questions returned and parsed; default five/five name/no-name
  composition; category and location relevance; plausible customer decision;
  Indonesian naturalness; meaningful distinctness; unsupported premises;
  identity leakage; open unknown facts; comparison relevance and unnamed
  fallback; accepted unchanged / light edit / substantive replacement counts;
  latency; and total provider cost.
- **R-09 — Practical quality gate:** A candidate is acceptable only when the
  User Flow/04 practical quality gate passes: all five packs recover to ten
  executable questions without manual technical repair; no discovery question
  leaks audited or comparison identity; no material unsupported premise or
  prohibited request; at least eight of ten questions in at least four of five
  packs are relevant and natural without substantive replacement; the model
  materially outperforms the deterministic fallback on naturalness and
  contextual relevance; and measured cost and latency fit the paid preparation
  allowance. If neither model clears the gate, keep the product to the first
  reviewed vertical, improve generation examples and guidance, and rerun the
  evaluation — never pretend universal templates are good enough.
- **R-10 — Provider lock decision:** The evaluation result selects one
  production provider for 03 extraction and one for 04 question generation.
  The decision, the scores behind it, and the resulting default configuration
  are recorded and require founder approval (open question 4). One provider
  per audit stays; no general automatic fallback is built.
- **R-11 — Evaluation cost accounting:** Every evaluation call runs within
  the approved budget (open question 3), is recorded with the same telemetry
  contract as production calls, and is accounted against the USD 5 per-session
  ceiling including the USD 0.4357 carryover.

### Live observations (05)

- **R-12 — One provider, ten independent observations:** The run uses one
  production provider and method for all ten questions: OpenAI Responses API,
  GPT-5.6 Luna, required web search, low reasoning, Indonesian output
  (decision log 2026-08-17). Every question executes in a new independent
  context with no shared conversation history. Providers are never mixed
  inside a run.
- **R-13 — Testing-only providers excluded:** Groq/Tavily and any
  non-production path cannot be selected for a live protected run, cannot act
  as recovery, and cannot appear in the run record as production. Startup or
  deployment fails closed when the intended production credential is missing.
- **R-14 — Neutral Indonesian instruction:** The observation request carries
  the neutral Indonesian instruction (User Flow/05 substance): answer
  naturally in Indonesian, use web search, do not discuss Nuave/audit/scoring,
  do not favor any business, state uncertainty when public information is
  incomplete or conflicting. The current English observation instruction is
  not used for live observations. Instruction text is versioned and recorded.
- **R-15 — No discovery contamination:** The provider request contains only
  the neutral instruction, the exact locked question, and the verified
  location context when relevant. It never receives the business brief, the
  audited business name (for questions that omit it), a hidden brand or
  competitor hint, a URL, another question's answer, the report method, or any
  request to produce a favorable result.
- **R-16 — Verified location only:** Location context comes only from the
  confirmed business market context (country, and city or region when the
  decision is local). Device GPS, IP-derived location, unverified defaults,
  and customer home location are never used; nationwide questions receive no
  city metadata.
- **R-17 — Retry contract:** One initial attempt plus up to two automatic
  technical retries per question, targeted to the failed question, using the
  same locked configuration (exact question, provider, model, instruction
  version, language, location, search configuration, method version), with
  bounded backoff appropriate to the safe failure category. A valid result is
  never rerun; retrying stops as soon as one evaluable response is saved.
  Every attempt is persisted.
- **R-18 — Evaluable versus failed:** A substantive response that declines to
  recommend, cannot verify a fact, or explains uncertainty is evaluable and is
  preserved, never retried for a more favorable result. A provider or policy
  refusal that blocks the request with no usable answer is a failed test,
  receives targeted same-method recovery, and is never converted into
  non-appearance or success.
- **R-19 — Ten-of-ten gate:** Report generation begins only when all ten
  locked questions have one selected evaluable observation from the locked
  provider and method, every attempt and source record is retained, and the
  evidence set passes structural integrity checks. No partial report exists;
  if recovery cannot reach 10/10, the run records the state, preserves all
  evidence, surfaces the affected questions, and exposes founder support —
  never a nine-question report.
- **R-20 — Provenance and telemetry:** For every attempt, retain: question
  text and order, final name/no-name classification, attempt order and
  timestamps, system and execution surface, requested and returned model,
  instruction version, language, location when used, search configuration,
  provider search actions, raw answer or restricted durable reference, inline
  and consulted sources, response ID, token usage, web-search call count,
  latency, accounted cost, provider completion status, safe failure category,
  and whether the attempt was automatic. The evidence export and method record
  reflect exactly what occurred.
- **R-21 — Sequential execution:** The private prototype stays sequential
  (concurrency one) in this phase, per User Flow/05; concurrency two arrives
  with durable jobs in Phase 4.

### Variance re-ask

- **R-22 — Variance measurement:** After the main run completes, two or three
  designated questions are re-asked separately, one independent observation
  each, under the same locked method. Repeats are recorded as variance
  measurement only: they never change the reported count, any denominator, any
  finding, or any action, and they are not shown as additional observations in
  the test-by-test rows. Repeat results may be used in the quality-gate review
  and in the method/limitation wording to explain ordinary run-to-run
  variation. Each repeat is a paid call with full telemetry inside the ceiling
  (open question 3).

### Report (06)

- **R-23 — Report shape and headline:** The report follows the five canonical
  sections with the direct appearance count out of ten as the headline
  (**Bisnis Anda muncul di X dari 10 pertanyaan** and **X/10**), the separate
  **Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda** measures with
  their own denominators directly beneath it, and recommendation, comparison,
  and public-information measures with eligible denominators only (**Tidak
  diuji** when a dimension has no eligible question, never zero performance).
- **R-24 — Findings:** One to five material, specific findings; one or two
  strong findings are sufficient and no finding exists merely to fill the
  section. Observation, interpretation, and evidence references are visibly
  distinct. Other named businesses are described as **other businesses
  mentioned** unless verified context supports more.
- **R-25 — Actions:** One to five evidence-backed actions, each with the
  concrete work, why it matters, evidence references, suggested owner, and an
  observable completion check. When no immediate corrective gap is supported,
  an action may preserve a supported strength, improve its public evidence, or
  check an explicitly untested aspect, labelled as maintenance or further
  investigation, and never invents a deficiency. The report action capacity is
  widened from three to five.
- **R-26 — Exact evidence:** Answer excerpts are copied exactly from the
  retained answer and never translated. A citation URL alone never counts as
  visible appearance; appearance requires the resolved business to be
  identifiable in the answer text.
- **R-27 — Method section from recorded facts:** The method section is built
  from recorded run facts: exact execution surface, returned model, language,
  location when used, date range, web-search condition, retries, variance
  re-asks, and method version. The final customer-facing wording of the named
  execution surface requires founder review (open question 5); an API result
  is never presented as the customer's personalized ChatGPT session.
- **R-28 — Indonesian writing contract:** Nuave-authored report fields pass
  the `plain-id-v1` writing standard (founder-approved Indonesian calibration,
  12–20 word target / 25-word ceiling, no field totals); exact questions and
  excerpts are exempt. A language-only retry may change only Nuave-authored
  language and cannot change classifications, evidence IDs, sources, excerpts,
  or run facts.
- **R-29 — PDF/print and primary action:** **Download PDF** is the primary
  report action and prints the same report payload through the browser
  (print/save in this phase), expanding the required details. Print uses the
  same report version and facts as the screen.
- **R-30 — Evidence export:** The complete evidence export (JSON, v3) is
  available as the secondary action and contains the same report, questions,
  observations, attempts, sources, telemetry, and versions shown on screen,
  with no fabricated or reconstructed values.

### Quality-gate review

- **R-31 — Quality-gate review:** The complete real report and its evidence
  export are read as a sceptical owner and as an audit professional against
  the Phase 3 exit gate. The verdict and the concrete evidence behind it
  (which criteria passed, which failed, with references to report sections and
  evidence rows) are recorded in this spec package (verification record) —
  this is a human judgment gate, not replaceable by automated checks.
- **R-32 — Exit gate: report worth paying for:** The report must (1) contain
  10/10 evaluable observations; (2) reveal one to five material, specific
  findings, with one or two strong findings sufficient; (3) make every
  important claim traceable to an observation or public source; (4) be
  understandable by a non-technical Indonesian decision-maker in about ten
  minutes; (5) distinguish observation, interpretation, and action; (6) offer
  one to five feasible, evidence-linked actions, including a clearly labelled
  maintenance or further-investigation action when no immediate corrective gap
  is supported; (7) retain failures and limitations visibly; and (8) render
  the same facts in the PDF whenever that derived artifact is available. If
  the gate fails, stop and improve questions, observation analysis, evidence
  normalization, or report synthesis and repeat this phase; do not proceed to
  real persistence, payment, or polish merely because the software ran.

### Exit gates and regression

- **R-33 — Fixture regression:** The existing baseline stays green: 276 audit
  unit tests, 82 fixture-journey unit tests, and 33 e2e tests (enabled,
  forced-failure, and disabled configurations), plus `npm run check` and
  `npm run build`, with no change to live audit contracts that existing tests
  pin.
- **R-34 — Live/fixture separation enforcement:** A live run can never
  produce a fixture-stamped result and a fixture journey can never produce a
  live result; automated coverage proves the separation (no `/api/audit/*`
  calls from fixture mode, no fixture data in a live report).
- **R-35 — No partial report:** No report is generated, delivered, or
  exported with fewer than ten evaluable observations; a failed or blocked
  test never becomes a partial paid report.
- **R-36 — Server-side cost ceilings:** The USD 5 per-session ceiling, the
  USD 0.4357 carryover (server-enforced as a minimum the client cannot lower),
  stage call limits revised to accommodate the retry policy (R-17), and
  per-attempt cost accounting are enforced server-side in every live route.
  Client input cannot raise the limit, lower the carryover, increase the retry
  allowance, or select another provider.
- **R-37 — Provenance completeness:** Every report claim maps to a retained
  observation or public source; every observation maps to a retained attempt
  set; and the evidence export contains the complete record (R-20, R-30).

## Failure and recovery

| Failure or interruption | Preserve | Founder sees | Recovery and forbidden behavior |
|---|---|---|---|
| Browser closes or network drops mid-run | Completed observations and attempt telemetry in the browser session | A truthful interrupted state naming the completed count | Reopen and resume only uncompleted questions; never rerun a valid result; never claim background continuation (Phase 4) |
| One question times out or fails technically | All completed observations and the failed attempt | **Mencoba kembali** on the affected row | Retry only that question under the locked method, up to two automatic retries; stop at the first evaluable response |
| Provider or policy block with no usable answer | The failed attempt with safe failure category | **Belum berhasil diuji** after automatic recovery | Treat as failed test; targeted same-method recovery; never convert to non-appearance; never switch provider mid-run |
| Substantive refusal with a usable answer | The observation | **Selesai**; later dimensions may be `not assessed` | Preserve as evaluable; never retry for a more favorable answer |
| Required web search did not execute | The attempt | Retrying state | Treat as technical failure; retry only that question |
| Automatic retries exhausted before 10/10 | All evidence and attempts | No report; affected questions listed; founder-support path | No partial report; no automatic delivery; record the state; delay/remedy semantics for customers are Phase 4/5 |
| Report generation fails | Frozen evidence and every report attempt | Failure state with retry | Retry only report generation (existing ceiling), including the single language-only retry; never rerun an observation |
| Evidence validation fails | Raw observations and diagnostics | No report published | Safe retry or founder review; never "fix" protected observed facts |
| Variance re-ask fails | Main run unchanged | Variance record marked incomplete | Record the failure; never blend the repeat into counts; the quality-gate review notes it |
| PDF/print cancelled or unavailable | Ready report state | On-screen report remains usable | Retry through the browser; never claim a PDF was delivered |
| Cost ceiling reached | Completed work and accounting | Clear stop state | Stop safely; never fabricate results; route to founder attention; never present internal configuration cost as customer fault |
| Production credential missing or live mode misconfigured | Nothing from the live path | Fail-closed error before any provider call | Refuse to run; never fall back to Groq/Tavily or fixture data |
| Fixture preview disabled | No fixture paid/report state | Safe unavailable or normal state | Enable only through server configuration; never accept a client-side override |

No failure in this phase may trigger a payment, submit customer data to a
provider beyond the bounded request (R-15), invent evidence, send email,
create an order or entitlement, or imply that a customer remedy is owed.

## Evidence, data, privacy, and cost

- The five-business evaluation uses only public business information for the
  selected category and city; drafts are internal, unpublished, and never
  used as customer proof. Contacting or publishing about the evaluated
  businesses is not authorized by this spec.
- The first live audit uses one real business explicitly approved by the
  founder with permission for the private run (open question 2). Its report,
  raw answers, and evidence remain unpublished and outside the repository
  unless a later decision changes that; nothing in this phase represents the
  report as a delivered customer result.
- Recipient email, payment data, access secrets, and sensitive free text do
  not exist in this phase's live path and never enter provider prompts.
  Observation and generation requests contain only the bounded inputs defined
  by R-14, R-15, and R-16. The safety identifier is hashed before any
  provider call (existing behavior).
- Raw provider answers and unnecessary provider metadata stay in restricted
  evidence storage; the customer-facing report displays only what its
  evidence and method sections need, and displayed sources are the provider's
  returned sources.
- Cost: the USD 5 per-session ceiling applies with USD 0.4357 accounted
  carryover (server-enforced minimum; USD 4.5643 remaining at the start of the
  phase). Every paid call — evaluation (R-11), live observations, report
  synthesis, and variance re-asks (R-22) — requires founder approval (open
  question 3) and is recorded with actual usage, web-search calls, latency,
  and accounted cost under the pinned pricing version. No call outside the
  approved allowance is made; no previously accounted spend is reset.
- No customer data is retained server-side beyond what the browser session
  holds; no account, database, payment record, or delivery record is created.
- Nothing in this phase is indexed, emailed, published, or shared with any
  customer or third party.

## Acceptance criteria

- **AC-01 — Protected live entry:** Given live mode configured on the server,
  when the founder opens the access-gated live surface and the API routes,
  then the live 03 → 06 path is available; when the access cookie is missing
  or wrong, `/audit/*` redirects and `/api/audit/*` returns 401 before any
  provider call; and no client input can enable or disable live or fixture
  mode.
- **AC-02 — Fixture regression:** Given the implementation is complete, when
  the full test baseline runs, then 276 audit unit tests, 82 fixture-journey
  unit tests, and 33 e2e tests pass, `npm run check` and `npm run build`
  pass, and the fixture journey still makes zero `/api/audit/*` calls.
- **AC-03 — Shared journey states:** Given a fresh live run, when the founder
  proceeds, then the path advances 03 Business Facts → 04 Questions →
  05 Audit Run → 06 Report with the same customer-meaningful vocabulary, and
  no path reaches the run without confirmed facts and an approved question
  pack.
- **AC-04 — Browser-bound truthfulness:** Given the live run is executing,
  when the progress surface is inspected, then it states that the browser
  must stay open, that closing it stops the run, and that completed
  observations are preserved; a forced reload resumes from saved observations
  without rerunning completed questions and without claiming background
  continuation.
- **AC-05 — No partial report:** Given fewer than ten evaluable observations
  after targeted recovery, when the run ends, then no report is generated or
  exported, the affected questions are visible, the evidence and attempts are
  retained, and no partial-report state exists.
- **AC-06 — Evaluation set:** Given the evaluation is run, then it covers
  five real public businesses in the selected launch category and city, uses
  only public information, contacts no one, and publishes nothing.
- **AC-07 — Evaluation controls:** Given the evaluation is run, then Gemini
  3.5 Flash-Lite and GPT-5.6 Luna receive the same minimized inputs and the
  same versioned generation guidance with no web search in the question-writer
  test, and the deterministic Indonesian fallback is scored alongside them.
- **AC-08 — Practical quality gate verdict:** Given the evaluation completes,
  then each pack record is scored against the User Flow/04 rubric and the
  practical quality gate verdict (pass/fail per candidate, with counts) is
  recorded; if neither model clears the gate, the recorded next step is to
  keep the product to the first reviewed vertical and rerun after improving
  generation guidance.
- **AC-09 — Provider lock:** Given the evaluation verdict is approved, then
  the live run uses exactly one production provider per audit, Groq/Tavily
  cannot be selected for a live protected run, and a missing production
  credential fails closed before any provider call.
- **AC-10 — Neutral instruction and no contamination:** Given the ten
  observations run, when the provider requests are inspected, then each
  contains only the neutral Indonesian instruction, the exact locked question,
  and verified location when relevant; discovery requests contain no audited
  business name, brief, URL, or competitor hint, and answers are returned in
  Indonesian under the recorded instruction version.
- **AC-11 — Retry contract:** Given a forced technical failure on one
  question, when the run executes, then that question retries with the same
  locked configuration at most twice after the initial attempt while completed
  questions remain unchanged, every attempt is persisted, and a valid result
  is never rerun.
- **AC-12 — Evaluable classification:** Given a substantive refusal with a
  usable answer, when the run classifies it, then it is evaluable and
  preserved; given a provider or policy block with no usable answer, then it
  is a failed test with targeted same-method recovery and is never counted as
  non-appearance.
- **AC-13 — Ten-of-ten gate:** Given the tenth evaluable observation
  completes, when the evidence set is frozen, then report generation starts
  exactly once from the frozen evidence; a report retry or language retry
  never reruns an observation.
- **AC-14 — Telemetry completeness:** Given a completed run, when the
  evidence record is inspected, then every attempt retains question text and
  order, classification, timestamps, surface, requested and returned model,
  instruction version, language, location when used, search configuration,
  sources, response ID, usage, latency, cost, completion status, failure
  category, and attempt origin, and the method record matches the run that
  actually occurred.
- **AC-15 — Variance re-asks:** Given the main run is complete, when two or
  three designated questions are re-asked separately, then the repeats are
  recorded as variance measurement only; the headline count, denominators,
  findings, and actions are unchanged by the repeats, and no repeat appears in
  the test-by-test rows.
- **AC-16 — Report headline and components:** Given the report is generated,
  then it shows **Bisnis Anda muncul di X dari 10 pertanyaan** and **X/10**
  with the separate **Tanpa menyebut bisnis Anda** and **Menyebut bisnis
  Anda** measures and their own denominators directly beneath it.
- **AC-17 — Assessed denominators:** Given the report is generated, when
  recommendation, comparison, and information measures are inspected, then
  each uses only eligible denominators and an empty denominator renders
  **Tidak diuji**, never zero performance.
- **AC-18 — Findings and actions:** Given the report is generated, then it
  contains one to five material findings (one or two strong sufficient) and
  one to five evidence-backed actions, each with evidence references, an
  owner, and an observable completion check; maintenance or further-
  investigation actions are labelled and never invent a deficiency.
- **AC-19 — Exact evidence:** Given the report and evidence export are
  generated, then answer excerpts are verbatim from the retained answers, no
  excerpt is translated, and a citation URL alone never counts as visible
  appearance.
- **AC-20 — Method section:** Given the report is generated, then the method
  section is built from recorded run facts (surface, returned model, language,
  location when used, date range, web-search condition, retries, variance
  re-asks, method version), and the named execution-surface wording is
  flagged for founder review rather than silently final.
- **AC-21 — Indonesian writing contract:** Given the report is generated,
  then every Nuave-authored field passes the `plain-id-v1` limits, and a
  forced language-only retry changes no classification, evidence ID, source,
  excerpt, or run fact.
- **AC-22 — PDF/print fidelity:** Given the report is ready, when print/PDF
  is invoked, then the print output uses the same report payload and version,
  expands the required details, and **Download PDF** is the primary report
  action with the complete evidence export as the secondary action.
- **AC-23 — Cost ceilings:** Given live calls are made, when the budget guard
  runs, then the USD 5 ceiling and the USD 0.4357 carryover are enforced
  server-side, the retry-aware observation allowance is respected, a client
  cannot lower the carryover or raise the limit, and every paid call
  (evaluation, observations, report, variance re-asks) is accounted with real
  usage.
- **AC-24 — Quality-gate review:** Given one complete real Indonesian report
  and its evidence export, when the founder reads them as a sceptical owner
  and as an audit professional, then the verdict against all eight exit-gate
  criteria (R-32) is recorded in this spec package with concrete evidence, and
  a failed gate stops the phase for method improvement rather than proceeding
  to persistence or payment work.
- **AC-25 — Repository checks:** Given the implementation is complete, when
  the repository's formatting/type/lint check and production build run, then
  both pass, with any pre-existing warnings distinguished from new
  regressions.
- **AC-26 — Human judgment gates:** Given the private run and report are
  complete, then (a) the founder confirms the run was supervised, private, and
  unpublished; (b) the founder or a fresh reviewer confirms the report is
  understandable by a non-technical Indonesian decision-maker in about ten
  minutes; and (c) any native-language judgment the founder requires on the
  live report copy is recorded (judgment criteria; not replaceable by string
  rules alone).

## Open questions

These are flagged for the founder/orchestrator. They are not resolved by this
draft and no answer is invented here.

1. **Launch wedge — vertical and city (founder decision).** The five-business
   evaluation (R-06) and the first live audit need one selected launch
   category and city. The active direction is one vertical in one city until
   it works. **RESOLVED 2026-08-17:** **dental clinics in Depok
   (Jabodetabek)** — recorded in `docs/DECISION_LOG.md` (2026-08-17).
2. **The real business for the first audit, with permission for a private
   run (founder decision).** The first live report needs one real business
   the founder approves and permission for the private, unpublished run.
   **RESOLVED 2026-08-17:** **Sozo Dental Depok/Margonda**, approved by the
   founder for a private, unpublished run (no contact, no publishing).
3. **Approval for paid provider calls (founder decision).** Approval is
   required for paid calls within the USD 5 per-session ceiling (USD 0.4357
   carryover accounted; USD 4.5643 remaining), including the five-business
   evaluation cost, the first live run, and the variance re-asks.
   **RESOLVED 2026-08-17:** founder approved paid provider calls within the
   USD 5 per-session ceiling for the evaluation, the first audit, and the
   variance re-asks.
4. **Whether the evaluation may change the default providers (founder
   decision).** The five-business evaluation may show that Gemini 3.5
   Flash-Lite (or another candidate) should become the default 03/04
   provider instead of the current OpenAI default; the evaluation verdict
   (R-10) requires explicit founder approval before any default changes.
   **RESOLVED 2026-08-17:** the evaluation measured **GPT-5.6 Luna** on five
   real Depok dental clinics (the only candidate that ran — Gemini's
   prepayment credits were depleted) and Luna **cleared the practical quality
   gate** (50/50 questions relevant & natural; 49 accepted unchanged / 1 light
   / 0 replaced; 0 leaks/premises/blockers; 03 drafts resolve the exact branch
   with official-source-only evidence). Founder **approved the lock: GPT-5.6
   Luna for 03 and 04** (both already the wired defaults; no code change
   needed) — recorded in `docs/DECISION_LOG.md` (2026-08-17). A Gemini
   comparison rerun remains possible when its credits are restored; the
   runner and five confirmed briefs are frozen.
5. **Named AI execution surface customer wording (founder review; carried
   from Spec 002 open question 1).** The final customer-facing wording of the
   named execution surface in the report method section (R-27) needs founder
   review before it is implemented as settled copy.

## Implementation notes

- This is a draft. Before any code changes: founder approval of the open
  questions above, then a review pass, then an **Approved** status.
- Connect the live engine additively: wire the existing
  `questions-id.ts` generation boundary to its provider interface (the stub
  becomes a real bounded no-search call, with the deterministic Indonesian
  fallback unchanged), keep the English deterministic path
  (`questions.ts`, `deterministic-v4-en`) intact for the tests that pin it,
  and translate the live observation instruction to the neutral Indonesian
  version (R-14) as a versioned change rather than editing the English
  behavior that existing tests pin.
- The run route (`/api/audit/run`) gains targeted retry: persist each
  attempt, retry only failed questions under the locked method, and emit the
  settled run-status states including **Mencoba kembali**; the stream event
  set is extended additively (attempt metadata on prompt events). The
  observation stage ceiling must be revised so the retry policy can execute
  (at most three attempts per question) while the USD 5 ceiling remains the
  binding cap; document the exact ceiling value in the run record.
- Widen the report synthesis priority capacity from three to five (R-25);
  the existing three-cap is a known Phase-3 gap recorded in Spec 002's
  verification.
- Keep the private prototype sequential (concurrency one). Do not add
  durable jobs, queues, or server-owned order state — those are Phase 4.
- The variance re-ask is a small separate flow after the main run, using the
  same observation boundary; its results live in a separate variance record
  keyed to the run and never feed the reported counts (R-22).
- The live run's customer-facing surfaces must carry the settled Indonesian
  labels verbatim (`report-labels.ts`); the remaining English copy in the
  live workflow screens is harmonized in the Phase 6 cohesion pass except
  where the private run surfaces need it now (R-03, R-23…R-30).
- The quality-gate verdict is recorded in this spec package when the run
  happens (verification record), with concrete evidence references rather
  than a bare pass/fail.
- Add `VERIFICATION.md` from the repository template when implementation
  begins. Verification must include the automated suite results (R-33) plus
  the fresh human reviews for AC-24 and AC-26.

## Verification record

- Verification artifact: `specs/003-live-report-quality-gate/VERIFICATION.md`
- Result: Pending — automated regression and the code-level defects from the
  fix-round-2 adversarial review are fixed and tested; the live run through
  the actual product interface and the founder quality-gate review it unlocks
  (R-31/R-32, AC-24/AC-26) have not occurred
- Date: 2026-08-18
- Verified commit or working-tree state: working tree, parent `c18fe8e`
