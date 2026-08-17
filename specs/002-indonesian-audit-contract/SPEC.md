# Spec 002: Indonesian audit and report contract

> Status: **Approved — implementation in progress** (founder-approved 2026-08-17)
> Owner: Founder
> Updated: 2026-08-17
> Implements: Phase 2 of `docs/END_TO_END_PLAN.md` — the Indonesian audit and
> report contract, including the fixture-journey realignment to Order Preview →
> simulated payment → Business Facts → Questions → Audit Run → Report

> **Relationship to Spec 001:** `specs/001-simulated-journey-shell` remains the
> approved implementation and verification record of the earlier fixture order
> (intake → facts → questions → summary → simulated checkout → processing →
> report) and is finished and verified against that record. This specification
> adapts the protected fixture to the 2026-08-17 canonical sequence and defines
> the Indonesian audit and report contract. It does not rewrite Spec 001's
> history.

## Required context

Read in order:

1. `AGENTS.md`
2. `README.md`
3. `docs/NOW.md` — Current objective, What is known, and Do now
4. `docs/END_TO_END_PLAN.md` — **Phase 2 — Indonesian audit and report
   contract**, **Target customer journey** (touchpoints 3–7), **Experience
   state model**, **Verification strategy**, **Failure and recovery matrix**,
   and **Cross-cutting quality requirements**
5. `docs/JOURNEY_CONTRACT.md` — the Phase-2 build row, the module ownership and
   handoff table, and the cross-module invariants
6. `specs/README.md` (spec lifecycle) and `docs/templates/SPEC.md` (spec
   structure)
7. `specs/001-simulated-journey-shell/SPEC.md` — its post-approval note about
   aligning the fixture to the new sequence, plus its structure as a format
   reference
8. `docs/drafts/VOICE-v2-candidate.md` — the voice/writing contract candidate
   that `docs/VOICE.md` will be promoted from
9. `docs/drafts/00-journey-fixtures.md` — the frozen 10/10 fixture set to
   reference (itself a draft pending founder approval; see Open questions)
10. `docs/AUDIT.md` — **Question rules**, **Plain-language writing standard**,
    **Report acceptance checklist**, and **Data boundaries**
11. `User Flow/03 - Business Facts.md`, `User Flow/04 - Questions.md`,
    `User Flow/05 - Audit Run.md`, and `User Flow/06 - Audit Report.md` — the
    language and data contracts this spec finalizes
12. Code to ground the contract changes (read-only):
    `src/lib/audit/report-language.ts`, `src/lib/audit/questions.ts`,
    `src/lib/audit/contracts.ts`, `src/lib/audit/types.ts`,
    `src/lib/fixture-journey/*`, `src/app/audit/fixture/*`,
    `src/messages/id.json`, `src/i18n/*`

Do not load or use as product authority: `archive/`, private run artefacts,
superseded plans, or the legacy repository. Do not read `node_modules/`.

## Problem

### Observed evidence

- The founder changed the target customer sequence on 2026-08-17 to
  **Order Preview → Payment → Business Facts → Questions → Audit Run →
  Audit Report** (`docs/NOW.md`, `docs/JOURNEY_CONTRACT.md`,
  `docs/END_TO_END_PLAN.md` §4, and the post-approval note in Spec 001). The
  protected fixture journey still implements the earlier order
  (intake → facts → questions → summary → simulated checkout → processing →
  report), so the reviewable fixture no longer matches the canonical sequence:
  payment comes after question approval instead of unlocking facts and
  question preparation.
- The fixture journey's report destination renders the Phase-1 golden fixture
  (Northstar Advisory, 9 completed + 1 failed observation). A report with a
  failed test cannot satisfy the settled 10/10 evaluable-observation gate
  (`docs/NOW.md`, `docs/JOURNEY_CONTRACT.md` invariant 6), so the fixture
  report cannot demonstrate the deliverable report shape this phase must
  validate.
- Every customer-facing journey surface is still mostly English
  (`src/app/audit/fixture/FixtureJourney.tsx`, `src/lib/fixture-journey/*`,
  the landing messages in `src/messages/id.json` that still carry
  agency-era copy such as `5x Konversi Lebih Tinggi`, `Skor AI Visibility`,
  and `Daftar kompetitor`). An English report cannot pass the report-quality
  gate (`docs/NOW.md`).
- The question generator authors English questions through deterministic
  sentence templates (`src/lib/audit/questions.ts`,
  `PROMPT_CONTRACT_VERSION = "deterministic-v4-en"`), and the report writing
  contract is calibrated for English only (`plain-en-v1` in
  `src/lib/audit/report-language.ts`; `docs/AUDIT.md` states an Indonesian
  contract version is required before an Indonesian report can be checked).
- The audit test baseline is currently **208 passing tests in `src/lib/audit`**
  (verified 2026-08-17). These tests pin English deterministic generation,
  English report copy, evidence, provenance, and cost guardrails.
- `docs/drafts/VOICE-v2-candidate.md` is a complete, reviewed writing-contract
  candidate whose terminology table encodes the founder's settled labels and
  naming defaults, but it is not yet promoted to canonical `docs/VOICE.md`,
  and the candidate's findings (F1–F15) document live copy that contradicts
  settled decisions (guarantee/ranking claims, `kompetitor`, `di-download`,
  `Skor`, `AI Visibility Audit` vs the canonical **AI Visibility Report**).

### Interpretation

Nuave cannot yet review the product as the founder now defines it: the fixture
journey shows the wrong sequence, the report destination cannot demonstrate
the 10/10 deliverable, and no customer-facing surface speaks the settled
Indonesian contract. Phase 2 must (a) realign the protected fixture to the
canonical sequence using the existing simulated payment boundary, (b) promote
and apply the approved Indonesian voice, and (c) build the Indonesian
question-generation and report-writing contracts additively, without weakening
the evidence, provenance, and cost guardrails the 208-test baseline protects.

## Desired outcome

With a protected fixture preview enabled, a reviewer can complete one coherent
Indonesian journey in the canonical order — **01 Order Preview → 02 simulated
payment → 03 Business Facts → 04 Questions → 05 Audit Run → 06 Report** —
ending in a report built from a frozen 10/10 evaluable evidence fixture that
passes an Indonesian writing contract.

The audit and report contracts can produce customer-facing Indonesian that is
natural, bounded, and machine-checkable: a model-first Indonesian question
generation path with a deterministic Indonesian fallback that cannot hard-fail,
a versioned Indonesian report-writing calibration, deterministic Indonesian
labels for method, status, failure, and evidence, and an id-ID locale contract
under which evidence excerpts remain exact and never translated. The fixture
path makes no paid call, records no real payment, sends no email, and does not
alter the live audit engine's orchestration or cost controls.

## User and situation

The immediate user is the founder or an invited product reviewer evaluating the
future experience from the perspective of an Indonesian small- or medium-
business owner responsible for marketing. They need to judge the canonical
sequence, the naturalness and honesty of the Indonesian copy, and the
deliverable report shape before Nuave connects live behavior in Phase 3.

This is a protected product preview, not a customer pilot and not a purchasable
offer. The live-contract work in this spec (Indonesian question generation and
report-writing boundaries) is prepared and tested with stubs and fixtures; no
paid provider call is approved in this phase.

## Scope

- Realign the protected fixture journey to the canonical sequence
  01 → 02 (simulated payment) → 03 → 04 → 05 → 06, reusing the existing
  server-controlled preview mode, the simulated payment boundary, and the
  session-only state model.
- Present the Order Preview as a fixture-backed identity and offer preview
  (Rp99.000 total, 30-day quote, one-audit scope, limitations) with no real
  payment behavior.
- Adopt the frozen Indonesian 10/10 fixture chain
  (`docs/drafts/00-journey-fixtures.md`, NVA-FIKTIF-001: facts.v1 →
  questions.v1 → evidence.v1, fictional Kopi Taman Senja) as the fixture
  journey's data source, pending founder approval of that fixture document.
  `src/lib/audit/fixtures/report-golden.ts` stays protected and unmodified.
- Translate the fixture journey copy to Indonesian per the promoted voice
  contract, with the settled labels verbatim.
- Promote `docs/VOICE.md` from `docs/drafts/VOICE-v2-candidate.md` applying
  the settled naming defaults, and gate customer copy on its approval.
- Change customer-facing locale contracts from `en-US` to `id-ID`; keep
  English only for exact source, provider, model, or official business text
  and internal engineering artifacts.
- Build the Indonesian question generation boundary: one bounded no-search
  model call from the confirmed fact version (model-first, minimal output
  contract), deterministic Indonesian fallback that cannot hard-fail,
  validation and narrow blockers, dynamic name/no-name classification, and
  persistence of the exact approved pack for verbatim re-check replay.
- Add a versioned Indonesian report-writing calibration to
  `report-language.ts` (limits calibrated for Indonesian, produced in the
  dedicated product-language session), with the existing language-only retry
  protection that cannot change classifications, evidence, or sources.
- Translate deterministic method, status, failure, and evidence labels
  (including the settled five labels and the run-status set
  **Menunggu / Sedang diuji / Mencoba kembali / Selesai / Belum berhasil
  diuji**).
- Update fixtures and tests additively without weakening the existing
  evidence, provenance, and cost guardrails; the 208-test audit baseline keeps
  passing and new Indonesian contract tests are added.
- Update browser automation to prove the realigned fixture path.

## Non-scope

- Live question-generation, extraction, observation, or report provider calls.
  The generation boundary is implemented behind a provider interface and
  exercised with stubs; any paid call, including the five-business provider
  evaluation, requires founder approval and belongs to Phase 3.
- Real payment, Midtrans, QRIS, bank transfer, GoPay, or DANA checkout.
- Durable orders, jobs, server-owned state, Resend email, delivery, or
  report-ready email (Phase 4).
- Module 00 (Landing) and Module 07 (Access/Recovery); they are later modules
  and out of scope here.
- The landing-page rewrite and final visual/copy pass (Phase 6), except the
  minimal fixture entry changes required for a coherent preview.
- Delivery-time promise, report retention period, and terminal remedy
  decisions; these are Phase 4/5 founder decisions and this spec must not
  pre-commit them.
- Final customer wording of the named AI execution surface in the report
  method section (founder review required; see Open questions).
- Editing fixture facts or questions in the fixture journey; the fixture keeps
  read-only confirm/approve touchpoints. Customer editing of live facts and
  questions is implemented with the live contract in Phase 3.
- Re-check purchase or comparison behavior.
- PDF generation changes beyond the existing browser print/save path and the
  settled **Download PDF** label.
- Public customer access, outreach, analytics, or launch.
- Broad multi-vertical or multi-city support, dashboards, accounts,
  subscriptions, or credits.

## Experience

### Canonical sequence for the fixture journey

The fixture journey mirrors the canonical customer sequence
(`docs/JOURNEY_CONTRACT.md`), with Module 00 and 07 explicitly later:

```text
01 Order Preview   — fixture-backed identity and offer preview
02 Payment         — simulated payment (existing boundary; no charge)
03 Business Facts  — read-only fixture facts, explicit confirmation
04 Questions       — frozen Indonesian ten-question pack, explicit approval
05 Audit Run       — deterministic simulated processing (the explicit run
                     action consumes the simulated run)
06 Report          — report built from the frozen 10/10 evidence fixture
```

The module order is the product truth: payment unlocks personalized Business
Facts and question preparation; it never starts or consumes the audit. Only
the explicit run action starts the simulated run. In the fixture, facts and
questions remain read-only (as in Spec 001) because correction and validated
editing arrive with the live contract in Phase 3; fabricating fixture
corrections would misalign pre-recorded answers.

### Start condition and preview boundary

The fixture journey exists only when the server-controlled preview setting
(`NUAVE_FIXTURE_PREVIEW_ENABLED`) is enabled. The setting is not a
customer-selectable query parameter or browser toggle. When disabled, the
simulated payment, fixture facts, questions, run, and report cannot be reached
through the public interface. Per the founder's standing decision (recorded in
`docs/HANDOFF_LP_REPLACE.md` and asserted by the Spec 001 e2e suite), the live
landing page carries no fixture CTA; the fixture journey is entered directly at
`/audit/fixture`. The fixture intake presents the settled CTA label
**Cek bisnis saya di AI** on its own fictional-preview-identified action, and
nearby context states this is a fictional product preview. The live landing
page is not modified in this phase (the landing rewrite is Phase 6).

### Persistent trust signal

Every journey screen, including the report and printed output, carries a
visible Indonesian fixture-preview signal communicating all of the following:

- the business and results are fictional;
- the AI processing is simulated;
- no payment is taken; and
- the preview is not a delivered customer audit.

The simulated payment screen uses the exact disclosure
**“Simulasi pembayaran — tidak ada tagihan”**. The disclosure is not hidden in
a tooltip, footer, legal text, or transient toast.

### Main path

1. **01 — Order Preview.** Shows the fixture business identity, exact scope,
   category, official sources, the ten-question scope, the named execution
   surface from the fixture record, the one-audit nature, **Rp99.000 total**
   with no added tax or fee, the **30-day** unpaid-quote note, and the report
   scope and limitations. It shows no result, competitor, finding,
   recommendation, or score, and makes no personalized preparation call. The
   priced action label **Bayar Rp99.000** opens the simulated payment.
2. **02 — Payment (simulated).** The screen repeats the previewed business and
   the one approved total, states the preview limitation, and is unmistakably
   labelled **Simulasi pembayaran — tidak ada tagihan**. No payment instrument
   control, provider widget, receipt, transaction identifier, or payment API
   call exists. Completing it produces only a session-scoped simulated-paid
   state and a visible no-charge confirmation (no charge, receipt, order, or
   entitlement was created).
3. **03 — Business Facts.** The screen shows the frozen fixture facts
   (identity, scope, category, sources, offerings, customer context,
   differentiator, comparison business, warnings) with provenance labels, and
   the reviewer must explicitly confirm that the example facts have been
   reviewed. Facts are read-only in the fixture.
4. **04 — Questions.** The screen shows the frozen Indonesian ten-question
   pack in final order, five **Tanpa menyebut bisnis Anda** and five
   **Menyebut bisnis Anda**, and the reviewer must explicitly approve the pack
   before the run is available. Questions are read-only in the fixture.
5. **05 — Audit Run.** One explicit run action (settled
   **Mulai audit sekarang** confirmation over **Jalankan audit**) starts
   deterministic simulated processing. Customer-meaningful stages show the ten
   questions running, evidence and sources being checked, and the report being
   prepared, with the run-status labels **Menunggu / Sedang diuji / Mencoba
   kembali / Selesai / Belum berhasil diuji** where a per-question status is
   shown. The whole sequence is visibly simulated; it does not claim a
   provider is responding, does not animate fabricated live per-question
   completion, and never becomes an indefinite spinner.
6. **06 — Report.** A dedicated destination renders the five canonical
   sections from the frozen 10/10 evidence fixture: headline
   **Bisnis Anda muncul di 8 dari 10 pertanyaan** and **8/10**, with the
   separate **Tanpa menyebut bisnis Anda** (3/5) and **Menyebut bisnis Anda**
   (5/5) measures directly beneath, recommendation/comparison/information
   measures with eligible denominators, one to five findings, one to five
   actions, the ten test-by-test rows with exact excerpts, and the method
   section from recorded run facts. The primary action is **Download PDF**
   (browser print/save in this phase). The destination explains that it is
   session-only and does not claim secure, durable, or private hosting.

### Navigation and completion

- Before the run starts, the reviewer can move backward without losing prior
  fixture confirmations.
- After the run starts, locked fixture inputs remain locked; the reviewer can
  continue to the report or start over.
- Refreshing in the same tab restores the furthest valid fixture state from
  session storage; restored state is validated against the journey-state
  version before use.
- Start over clears only the fixture journey's own session keys after
  confirmation when progress could be discarded.
- The report is the completion state. No upsell, outreach capture, dashboard,
  subscription, testimonial, or claim of customer delivery appears.

### Language and presentation

Copy is concise, non-technical, truthful, and Indonesian, per the promoted
`docs/VOICE.md` (see Requirements R-24 and R-25). Exact evidence — tested
questions, answer excerpts, business and competitor names, source titles,
official terms, dates, and models — is copied verbatim and never translated.
English appears only for exact source, provider, model, or official business
text and internal engineering artifacts.

The primary path works at narrow mobile widths without horizontal scrolling,
does not depend on hover, has visible focus, uses native or equivalent
semantic controls, and announces processing and terminal state changes
accessibly. Reduced-motion preferences must not make the reviewer wait through
decorative progress animation.

## Requirements

### Fixture-journey realignment (carried from Spec 001, adjusted to the 2026-08-17 sequence)

- **R-01 — Protected fixture mode:** The journey shell is available only from
  a server-controlled fixture-preview mode. Client input cannot switch a live
  journey into fixture-paid or report-ready state.
- **R-02 — One canonical fixture source:** All displayed identity, facts,
  questions, observations, report content, and source URLs come from the
  frozen Indonesian fixture chain (NVA-FIKTIF-001) or a thin presentation
  projection of it. The shell must not maintain a second hand-copied business
  or report fixture.
- **R-03 — Coherent fixture entry:** The fixture journey is reachable directly
  at `/audit/fixture` (the founder's standing decision keeps the live landing
  page free of a fixture CTA; the Spec 001 e2e suite asserts its absence). The
  fixture intake presents one fictional-preview-identified action labelled
  **Cek bisnis saya di AI** — the settled CTA — and tells the reviewer the path
  is a fictional preview before they confirm. The live landing page is not
  modified in this phase (the landing rewrite is Phase 6).
- **R-04 — Persistent disclosure:** The preview, payment, facts, questions,
  run, on-screen report, and printed report each visibly distinguish the
  experience from a real audit, in Indonesian. The simulated payment includes
  the exact **“Simulasi pembayaran — tidak ada tagihan.”**
- **R-05 — No real intake:** The shell does not submit an arbitrary website,
  business name, email address, consent record, or other customer data. Any
  input-shaped controls use fixed `.example` fixture values and cannot change
  the audited identity.
- **R-06 — Explicit fact confirmation:** The reviewer cannot approve the
  question pack until the fixture facts have been visibly reviewed and
  explicitly confirmed.
- **R-07 — Exact question review:** The shell presents the frozen pack's ten
  Indonesian questions in their final order and labels them with the exact
  composition labels **Tanpa menyebut bisnis Anda** and **Menyebut bisnis
  Anda**. Approval locks the pack for the simulated run.
- **R-08 — Accurate order preview:** The Order Preview derives its business,
  scope, ten-question scope, **Rp99.000 total**, **30-day** quote note,
  execution-surface statements, and report-scope statements from the same
  fixture state shown later. It does not invent delivery, privacy, remedy, or
  commercial terms.
- **R-09 — Safe simulated payment:** The simulated payment has no payment
  instrument control, provider widget, real receipt, real transaction
  identifier, or payment API call. Its action produces only a session-scoped
  simulated-paid state and a visible no-charge confirmation. The **Rp99.000**
  total and 30-day quote appear as previewed offer content only, always
  accompanied by the simulation disclosure.
- **R-10 — Deterministic processing simulation:** The run advances through the
  shared customer-visible `Running`, `Preparing report`, and `Ready` states
  without a provider call. Its progress is bounded, deterministic, explicitly
  simulated, and never described as live per-question completion.
- **R-11 — Evidence-faithful report:** The destination constructs and renders
  the report through the existing report model and view from the frozen
  10/10 evaluable evidence fixture. It preserves the fixture's exact
  questions, raw excerpts, sources, denominators, and conclusions.
- **R-12 — One screen/print payload:** The screen report, printable report,
  and any evidence export use the same report and observation objects. The
  print result retains the fixture-preview disclosure.
- **R-13 — Session-only recovery:** The furthest valid state and required
  confirmations survive a same-tab refresh in session storage only. Restored
  state is validated against the fixture and journey-state version before use.
- **R-14 — Safe reset:** Start over clears only the fixture journey's own
  session keys, returns to the fixture entry, and never clears unrelated
  browser or live-workflow state.
- **R-15 — No external side effects:** Walking the fixture path makes no
  request to `/api/audit/*`, an AI/search provider, payment provider, email
  service, analytics service, database, or background-job service.
- **R-16 — Live-engine isolation:** Existing audit contracts, API behavior,
  live provider orchestration, cost controls, and their tests remain
  unchanged. Contract extensions introduced by this spec are additive and
  versioned; they do not rewrite the live engine's behavior.
- **R-17 — Accessible state:** Every required confirmation and primary action
  is keyboard operable and visibly focused. Step names, errors, simulation
  status, and terminal readiness are available without relying only on color,
  motion, or an icon.
- **R-18 — Responsive completion:** The complete path and report controls
  remain usable on a representative mobile viewport and desktop viewport
  without obscured required actions or horizontal page scrolling.
- **R-19 — Browser regression:** Automated browser coverage proves the
  realigned primary path, refresh restoration, reset behavior, persistent
  simulation disclosure, and absence of audit API calls.

### Canonical sequence invariants

- **R-20 — Canonical order:** The fixture journey advances strictly
  01 Order Preview → 02 simulated payment → 03 Business Facts →
  04 Questions → 05 Audit Run → 06 Report. Module 00 (Landing) and Module 07
  (Access/Recovery) are later and out of scope.
- **R-21 — Payment unlocks preparation:** Simulated payment gates the facts
  and question screens. Payment never starts and never consumes the simulated
  run.
- **R-22 — Run consumes the run:** Only the explicit run action
  (the **Mulai audit sekarang** confirmation opened by **Jalankan audit**)
  starts simulated processing. Refreshing, double-clicking, or reopening
  cannot start the run twice or consume an entitlement.
- **R-23 — Gate order enforcement:** The persisted state validator enforces
  preview → simulated-paid → facts confirmed → questions approved → run
  started → report ready, and rejects any inconsistent or missing gate.

### Voice and locale contract

- **R-24 — Voice promotion:** `docs/VOICE.md` is created from
  `docs/drafts/VOICE-v2-candidate.md` applying the settled naming defaults
  (R-25), and is founder-approved before any customer copy is implemented from
  it. It governs customer vocabulary, tone, numerals, dates, currency,
  sentence-length rules, and prohibited patterns across questions, report,
  and journey copy. It supersedes `docs/drafts/VOICE.md` (v1) as the canonical
  customer-facing writing guide.
- **R-25 — Naming defaults:** Use **brand Anda** everywhere except the five
  settled labels that keep **bisnis Anda**: **Tanpa menyebut bisnis Anda**,
  **Menyebut bisnis Anda**, **Bisnis Anda muncul di X dari 10 pertanyaan**,
  and the **X/10**-style count (e.g. **4/10**). The canonical report artifact
  name is **AI Visibility Report** (English, kept verbatim); the banded
  **AI Visibility Score** is retired. The landing CTA is **Cek bisnis saya di
  AI**.
- **R-26 — Locale contract:** Customer-facing strings move to `id-ID` for the
  fixture journey, questions, and report. English remains only for exact
  source, provider, model, or official business text, and for internal
  engineering artifacts no customer sees.
- **R-27 — Exact evidence never translated:** Tested questions, answer
  excerpts, business and competitor names, source titles, official terms,
  dates, and models are copied verbatim in whatever language they were
  observed. No localization step may translate or paraphrase them.
- **R-28 — Formats:** Money **Rp99.000** (no space after Rp, thousands by full
  stop), dates **17 Agustus 2026** (day, spelled month, year), times
  **10.00** and **08.00–21.00** (24-hour, period separator), percentages with
  a comma decimal separator. No em dashes in prose (settled exact labels are
  exempt). Counts keep their denominators; an empty denominator is
  **Tidak diuji**, never zero performance.

### Indonesian question generation

- **R-29 — Model-first primary generation:** One bounded, no-search model call
  from the confirmed fact version produces the primary ten-question
  suggestion. The call receives only the minimized confirmed brief, no email,
  payment, provider metadata, or sensitive free text; it returns no predicted
  answers, visibility results, findings, scores, or report content; and it is
  stored against one order and one confirmed fact version so a refresh does
  not repeat it.
- **R-30 — Minimal output contract:** The preferred model output is exactly
  ten Indonesian question strings in assigned order (the smallest schema that
  passes observed reliability testing). The model does not repeat the brief,
  generate rationales, classify its own output, or populate report fields.
- **R-31 — Resilient fallback:** Question generation cannot hard-fail the
  order. Fallback order: first valid model output; then deterministic parsing
  of returned numbered questions; then the deterministic Indonesian pack built
  from the confirmed facts. The customer is told only when the fallback
  materially affects their task (light disclosure; provider errors, JSON
  terminology, and internal model names stay in operational telemetry).
- **R-32 — Human review:** Every question pack stays in human review. No pack
  runs without the customer's explicit approval of the exact final strings.
- **R-33 — Pack persistence and replay:** The exact final customer-approved
  pack — ordered ten strings, edits, final classification, provenance,
  warnings, and approval timestamp — is persisted and replayed verbatim for a
  comparable re-check.
- **R-34 — Dynamic classification:** Final name/no-name classification is
  computed in code from the final question text (**Tanpa menyebut bisnis
  Anda** when the text contains no audited business name or known variant;
  **Menyebut bisnis Anda** when it does). Counts update immediately; no second
  model call classifies edits. Denominators derive from the final pack, never
  from the suggested matrix.
- **R-35 — Narrow blockers only:** Approval is blocked only for an empty or
  unexecutable question, provider input limits, private or sensitive personal
  data, disallowed individualized high-impact advice, content unrelated to
  the audited business or its customer decision, and content the provider
  cannot lawfully or safely process. Informal wording, English terms, changed
  intent, unknown-fact investigations, and 5/5-balance changes never block.
- **R-36 — No regeneration on refresh:** An ordinary reload or backward
  navigation without a fact change never repeats the generation call. A
  changed confirmed fact supersedes the pack, and after an explicit warning
  one fresh pack is generated from the new fact version and re-reviewed; old
  edits are not merged automatically.
- **R-37 — Fixture pack compliance:** The frozen question pack
  (`NVA-FIKTIF-001.questions.v1`) passes the same mechanical safety rules and
  validation the live path uses, including the identity-leakage, unsupported-
  premise, and distinctness checks.

### Indonesian report-writing contract

- **R-38 — Indonesian calibration:** `report-language.ts` gains an Indonesian
  writing-standard calibration: word and sentence limits calibrated for
  Indonesian, applied only to Nuave-authored fields, with exact evidence
  exempt. The calibration values are produced in the dedicated
  product-language review session required by `docs/AUDIT.md` (a required
  human gate; see Open question 2), and the writing-standard version is
  incremented when those rules materially change.
- **R-39 — Language-only retry protection:** A language-only retry may change
  only Nuave-authored language. It cannot change classifications, evidence
  IDs, sources, answer excerpts, run facts, or method copy. The protected
  report-shape validation (as in `validateReportLanguageRevision`) is retained
  for the Indonesian calibration.
- **R-40 — Deterministic label translation:** Method, status, failure, and
  evidence labels are translated deterministically in code and carry the
  settled Indonesian labels: **Tanpa menyebut bisnis Anda**, **Menyebut
  bisnis Anda**, **Bisnis Anda muncul di X dari 10 pertanyaan** and **X/10**,
  **Tidak diuji**, **Download PDF**, and the run-status set **Menunggu**,
  **Sedang diuji**, **Mencoba kembali**, **Selesai**, **Belum berhasil
  diuji**. Label translation never recomputes or reinterprets evidence.
- **R-41 — Report gate and shape:** A deliverable report requires 10/10
  evaluable observations, one to five material findings, and one to five
  evidence-backed actions. The primary report action is **Download PDF**.
  Recommendation, comparison, and information measures use only assessed
  denominators; an empty denominator is **Tidak diuji**.
- **R-42 — Method section from recorded facts:** The report's method section
  is built from recorded run facts: exact execution surface, returned model,
  language, location when used, date range, web-search condition, retries, and
  method version. The final customer-facing wording of the named execution
  surface requires founder review (Open question 1).

### Fixtures, tests, and exit gates

- **R-43 — Additive 10/10 fixture chain:** The frozen Indonesian fixture chain
  (`NVA-FIKTIF-001.facts.v1 → questions.v1 → evidence.v1`, fictional
  Kopi Taman Senja) is adopted as the fixture journey's data source.
  `src/lib/audit/fixtures/report-golden.ts` remains the protected Phase-1
  record and is not modified; no module may complete the golden failure by
  pointing it at the new fixture.
- **R-44 — Test baseline:** The existing audit test baseline (currently 208
  tests in `src/lib/audit`) keeps passing without weakening evidence,
  provenance, or cost guardrails. New tests cover the Indonesian generation
  boundary, deterministic Indonesian fallback, dynamic classification,
  narrow blockers, pack persistence and replay, label translation, and the
  Indonesian report-language calibration.
- **R-45 — Exit gates (Phase 2):** All ten questions pass mechanical safety
  rules and native-language judgment; the fixture report passes the Indonesian
  writing contract; every customer-facing journey string is Indonesian except
  exact source, provider, model, or official business text; and the existing
  evidence, provenance, and cost tests still pass.

## Failure and recovery

| Failure or interruption | Preserve | Reviewer sees | Recovery and forbidden behavior |
|---|---|---|---|
| Required confirmation is missing | Current fixture step | A specific inline prompt identifying the required confirmation | Confirm and continue; never infer consent or approval |
| Reviewer navigates back before the run | Valid fixture state and confirmations | The earlier step with prior state intact | Review again and continue |
| Same-tab refresh | Furthest validated fixture state | The restored step and persistent preview disclosure | Continue; never restart a live call |
| Missing, corrupt, stale, or incompatible session state | Nothing from the invalid state | A concise reset explanation | Return to the fixture entry; never partially trust or migrate unvalidated state |
| Fixture or report construction fails | Valid earlier step when possible | A terminal example-preview error with start-over action | Reset or retry fixture construction locally; never fall back to a live API |
| Simulated payment is interrupted | The preview state | A clear option to resume the simulation or start over | Resume deterministically; never claim background work continued or a charge occurred |
| Question generation (live boundary, stubbed this phase) times out or fails | Confirmed facts | The deterministic Indonesian fallback with a light disclosure and full editing (live path) | Record failure telemetry; never consume the audit; never show provider errors |
| Model returns fewer or more than ten questions | Confirmed facts | Ten recoverable questions only when parsing is deterministic; otherwise the fallback | Do not ask the customer to repair provider formatting |
| Suggested discovery question leaks the business identity or assumes an unsupported fact | The rest of the pack | A safe slot fallback before display | Record a contract failure; never display the leaking or assuming question as valid |
| Report language validation fails | Protected evidence and the first attempt | Continued processing within retry policy | One language-only retry that cannot change classifications, evidence, sources, or excerpts |
| Browser print/save is cancelled or unavailable | Ready report state | The on-screen report remains usable | Retry through the browser; never claim a PDF was delivered |
| Fixture preview is disabled | No fixture paid/report state | A safe unavailable or normal landing state | Enable through server-controlled preview configuration; never accept a client-side override |

No failure in this phase may trigger a paid call, submit customer data, invent
evidence, create an order, or imply that a customer remedy is owed.

## Evidence, data, privacy, and cost

- The fixture journey uses only the fictional **Kopi Taman Senja** chain
  (NVA-FIKTIF-001) with reserved `.example` domains. Its business, people,
  answers, findings, sources, and timestamps are synthetic test data.
- Raw fixture observations remain immutable. Exact answer excerpts remain
  exact, source URLs cannot be promoted into visible brand appearances, and a
  failed test (in any fixture retained for other purposes) is never converted
  into non-appearance or success.
- The report derives through the existing audited report contracts
  (`normalizeReportEvidence`, `validateReportContent`, `buildAuditReport`). It
  does not translate evidence, recompute a more favorable result, or add a
  testimonial, benchmark, rank, outcome, revenue, lead, or guarantee claim.
- The browser retains only a versioned fixture-journey state in session
  storage. No local storage, cookie, durable server record, account,
  personal-data record, or recovery lookup is created. Any contact value used
  for illustration stays on the reserved `.example` domain.
- No real customer email or consent is collected. Recipient email, payment
  data, and sensitive free text never enter question-generation or
  report-model prompts (the generation boundary accepts only the minimized
  confirmed brief).
- The fixture report must not be indexed, represented as a real customer
  result, or reused as public proof without a later explicit decision.
- Provider-call cost for the complete fixture path is USD 0. No previously
  accounted private-run budget is consumed or reset. The question-generation
  boundary is exercised only through stubbed tests and the frozen fixtures;
  the five-business provider evaluation and any live call are Phase 3 work
  requiring founder approval and the server cost ceiling.
- Fixture mode and payment mode are authoritative server configuration/state,
  never values inferred from customer-visible labels.
- `docs/VOICE.md` promotion is a product-language document change; it is
  applied to customer copy only after founder approval (R-24).

## Acceptance criteria

- **AC-01 — Entry:** Given fixture preview is enabled, when the reviewer opens
  `/audit/fixture` directly (the founder's standing decision keeps the live
  landing page free of a fixture CTA), then the fixture intake presents one
  action labelled **Cek bisnis saya di AI** that visibly identifies the path as
  fictional before any confirmation, and the live landing page is unchanged.
- **AC-02 — Protected boundary:** Given fixture preview is disabled, when a
  visitor uses normal navigation or a fixture URL, then the simulated payment,
  fixture facts/questions, run, and report are unavailable and no client input
  can enable them.
- **AC-03 — Canonical order:** Given a fresh fixture journey, when the
  reviewer proceeds through it, then the steps advance 01 Order Preview →
  02 simulated payment → 03 Business Facts → 04 Questions → 05 Audit Run →
  06 Report, and no path skips the preview or reaches facts/questions before
  the simulated payment.
- **AC-04 — Preview accuracy:** Given the Order Preview is open, when the
  reviewer inspects it, then it shows the fixture business identity, scope,
  ten-question scope, **Rp99.000 total**, the 30-day quote note, the fixture
  execution surface, and the example-report limitation derived from the same
  fixture state, with no invented commercial terms.
- **AC-05 — Payment truthfulness:** Given the simulated payment is open, when
  the reviewer inspects and completes it, then **“Simulasi pembayaran — tidak
  ada tagihan”** is prominent, no payment credential or instrument control is
  present, and the confirmation states that no charge, receipt, order, or
  entitlement was created.
- **AC-06 — Payment unlocks preparation:** Given only the preview is complete,
  when the reviewer attempts to open facts or questions, then they remain at
  the payment boundary; after the simulated payment, facts and questions open;
  and payment alone never starts the run.
- **AC-07 — Fact gate:** Given the facts screen is open and the review
  confirmation is absent, when the reviewer tries to continue, then they
  remain on the facts screen with a specific accessible prompt; after
  confirmation, they can continue.
- **AC-08 — Question gate:** Given facts are confirmed, when the question
  screen opens, then the ten frozen Indonesian questions appear once each in
  final order, five are labelled **Tanpa menyebut bisnis Anda**, five
  **Menyebut bisnis Anda**, and the run remains unavailable until explicit
  approval.
- **AC-09 — Run consumption:** Given the pack is approved, when the reviewer
  starts the run, then only the explicit run action begins simulated
  processing, and refresh or double-click cannot start it twice or create a
  second run.
- **AC-10 — Processing truthfulness:** Given the run has started, when
  processing is displayed, then the screen identifies the whole sequence as a
  simulation, advances through customer-meaningful Indonesian stages within a
  bounded interval, announces state changes, and does not display fabricated
  live per-question completion.
- **AC-11 — Report fidelity:** Given processing reaches the report, when the
  report opens, then all five canonical sections render from the frozen 10/10
  evidence fixture with the headline **Bisnis Anda muncul di 8 dari 10
  pertanyaan** and **8/10**, the separate **Tanpa menyebut bisnis Anda**
  (3/5) and **Menyebut bisnis Anda** (5/5) measures beneath it,
  recommendation/comparison/information measures with eligible denominators,
  one to five findings, one to five actions, and ten test-by-test rows with
  exact excerpts.
- **AC-12 — Print fidelity:** Given the report is ready, when print/PDF output
  is invoked, then the print layout uses the same report data, expands the
  required details, and retains a visible fictional/simulated disclosure.
- **AC-13 — Persistent disclosure:** Given any step from preview through
  report, when a reviewer scans the main content without opening secondary
  help, then they can tell that the business/result is fictional, processing
  is simulated, and no payment is taken.
- **AC-14 — Refresh recovery:** Given the reviewer has reached each gated
  state in turn, when the tab is refreshed, then the furthest valid state
  restores without losing its required confirmations or calling a live
  boundary.
- **AC-15 — Invalid-state recovery:** Given stored fixture state is missing,
  stale, corrupt, or inconsistent with the journey-state version, when the
  journey loads, then it explains the reset and returns safely to the fixture
  entry rather than rendering a later state.
- **AC-16 — Start over:** Given the reviewer has reached the run or report,
  when they confirm start over, then only fixture-journey state is cleared and
  the fixture entry opens with no live-workflow session state removed.
- **AC-17 — No side effects:** Given a browser test records network traffic
  for the complete path, when the reviewer proceeds from preview to report and
  refreshes once, then no request reaches `/api/audit/*`, an AI/search
  provider, payment, email, analytics, database, or job service.
- **AC-18 — No live fallback:** Given fixture or report construction is forced
  to fail, when recovery is offered, then the reviewer can reset or retry the
  local fixture only and no live audit call occurs.
- **AC-19 — Responsive and keyboard path:** Given representative mobile and
  desktop viewports and keyboard-only input, when the complete path is
  performed, then every required action is reachable, focus is visible,
  required messages are perceivable, and no horizontal page scrolling hides
  content or actions.
- **AC-20 — Reduced motion:** Given reduced motion is preferred, when
  simulated processing begins, then the reviewer reaches the same report
  without waiting for decorative staged animation and still receives
  meaningful state text.
- **AC-21 — Indonesian journey copy:** Given the complete fixture journey, when
  every customer-facing string is inspected, then each is Indonesian except
  exact source, provider, model, or official business text, and the five
  settled labels (**Tanpa menyebut bisnis Anda**, **Menyebut bisnis Anda**,
  **Bisnis Anda muncul di X dari 10 pertanyaan**, **Tidak diuji**,
  **Download PDF**) appear verbatim.
- **AC-22 — Voice compliance:** Given `docs/VOICE.md` is approved, when the
  journey and report copy are checked against it, then **brand Anda** is used
  outside the settled labels, formats follow **Rp99.000** / **17 Agustus
  2026** / **08.00–21.00**, no em dashes appear in prose, and no hype,
  ranking, guarantee, or forecast claim appears.
- **AC-23 — Generation boundary:** Given a confirmed fact version and a
  stubbed provider, when the generation boundary runs, then one bounded
  no-search call produces exactly ten Indonesian question strings; provider or
  formatting failure yields the deterministic Indonesian fallback without
  hard-failing; classification derives from final text; and only the narrow
  blocker list blocks approval.
- **AC-24 — Pack persistence:** Given a pack is approved, when the record is
  inspected, then the exact ten strings, order, edits, final classification,
  provenance, and approval timestamp are persisted and can be replayed
  verbatim for a re-check.
- **AC-25 — Report-language calibration:** Given the fixture report is
  generated, when the Indonesian writing contract runs, then all
  Nuave-authored fields pass the calibrated word/sentence limits, and a
  forced language-only retry changes no classification, evidence ID, source,
  or excerpt.
- **AC-26 — Label translation:** Given the report and run render, when
  method, status, failure, and evidence labels are inspected, then they carry
  the settled Indonesian labels, counts match the code-derived dimensions, and
  an empty denominator renders **Tidak diuji** rather than zero.
- **AC-27 — Engine regression:** Given the implementation is complete, when
  all existing audit tests run, then the current 208-test baseline in
  `src/lib/audit` passes without a change to live audit contracts, provider
  orchestration, cost controls, or fixture evidence, and the new Indonesian
  contract tests pass.
- **AC-28 — Repository checks:** Given the implementation is complete, when
  the repository's formatting/type/lint check and production build run, then
  both pass, with any pre-existing warnings distinguished from new regressions.
- **AC-29 — Human trust review:** Given a founder or fresh reviewer completes
  the path on mobile and desktop, when asked what was real, simulated, stored,
  charged, and delivered, then they correctly identify that the entire
  business audit and payment are fictional, state is same-tab/session-only,
  cost is zero, and no customer report was delivered.
- **AC-30 — Human language gate:** Given the fixture questions, journey copy,
  and fixture report are complete, when a native Indonesian reviewer judges
  them, then all ten questions pass native-language judgment and the fixture
  report passes the Indonesian writing contract (judgment criterion; not
  replaceable by string rules alone).

## Open questions

These are flagged for the founder/orchestrator. They are not resolved by this
draft and no answer is invented here.

1. **Named AI execution surface wording (founder review).** The exact
   customer-facing wording of the named execution surface in the report method
   section is mostly settled by the decision log (OpenAI Responses API /
   ChatGPT naming), but the final customer wording needs founder review before
   R-42 copy is implemented.
2. **Indonesian report-language calibration session (required human gate).**
   Per `docs/AUDIT.md`, the Indonesian writing contract must be settled and
   reviewed in its own dedicated product-language session. **RESOLVED
   2026-08-17:** the founder approved the calibration values (12–20 word
   target, 25-word ceiling, no field totals) as the settled Indonesian
   calibration (recorded in `report-language.ts` and
   `VERIFICATION.md` AC-25). AC-30 (native-language judgment) remains a
   separate human gate.
3. **Phase 4/5 decisions (explicitly out of scope).** The delivery-time
   promise, report retention period, and terminal remedy are Phase 4/5 founder
   decisions. This spec must not and does not pre-commit them; the fixture
   journey and report make no such promise.
4. **Fixture-document approval.** `docs/drafts/00-journey-fixtures.md` is
   itself a leaf-worker draft. Adopting the NVA-FIKTIF-001 chain into code
   (R-02, R-43) requires founder approval of that fixture document, including
   its escalated items: the cross-document fiction inconsistency
   (03's **Kopi Ruang Pagi** and 08.00–21.00/09.00–20.00 hours vs 06's
   English sample's **Kopi Purnama** and 08:00–22:00/09:00–22:00) and the
   final Indonesian report copy.
5. **Schema reconciliation (orchestrator decision).** Whether the new
   Indonesian handoff records (facts/questions/evidence) replace or sit beside
   the current English `BusinessBrief` / `PromptPack` / `AuditObservation`
   types is an orchestrator decision left open by `docs/drafts/00-journey-
   fixtures.md` and `User Flow/04`. This spec requires the resolution to be
   additive and versioned so the 208-test baseline stays green.

## Implementation notes

- Preserve `src/lib/audit/fixtures/report-golden.ts` untouched. Add the frozen
  Indonesian 10/10 fixture chain as a separate, additive fixture module; no
  code may treat the golden failure as completable.
- Prefer a small fixture-journey adapter that composes the frozen fixtures
  through the existing report builder (mirroring Spec 001's adapter pattern).
  Do not copy fixture strings into page components.
- Keep the existing live workflow and fixture journey as explicit modes or
  entry points selected on the server side. Do not expose a customer-facing
  live/fixture switch.
- Version the fixture journey's session state for the new sequence; stored
  v2-state shapes (Spec 001 order) are treated as stale and reset with an
  explanation.
- `report-language.ts`: add the Indonesian calibration as a second writing
  standard beside `plain-en-v1` (exact version naming is an implementation
  detail), with its own machine-checkable limits produced by the
  product-language session; widen the `writing_standard_version` type
  additively so existing tests remain green.
- `questions.ts` / `contracts.ts`: add the deterministic Indonesian fallback
  and the model-first generation boundary behind a provider interface as a new
  versioned contract; do not silently replace `deterministic-v4-en` behavior
  that existing tests pin. The live engine remains on its current path until
  Phase 3 connects it.
- The question-generation provider call is not executed in this phase; tests
  stub the provider. The five-business provider evaluation and any live call
  remain Phase 3 work after founder approval of provider and cost.
- Add the smallest browser-test extension that proves AC-01 through AC-20 for
  the realigned sequence; do not build a general end-to-end framework.
- Add `VERIFICATION.md` from the repository template when implementation
  begins. Verification must include automated results plus fresh human reviews
  for AC-29 and AC-30.

## Verification record

- Verification artifact: `specs/002-indonesian-audit-contract/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
