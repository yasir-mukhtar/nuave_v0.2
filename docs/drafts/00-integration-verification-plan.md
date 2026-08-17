# 00 — Nuave integration verification plan

> Status: **Plan (draft)** — no code or test changes made
> Author: independent verification leaf worker
> Date: 2026-08-17
> Governs: how every acceptance criterion and the 18 integration checks map to
> concrete automated and human test gates across the v2 journey
>
> This document is a verification *plan* only. It changes nothing in the
> repository, runs no suite, and preserves the current uncommitted worktree.

## 1. Purpose and scope

Nuave v2 is one thin Indonesian journey:

```text
00 Landing → 01 Order Preview → 02 Payment → 03 Business Facts
→ 04 Questions → 05 Audit Run → 06 Audit Report (+ report-ready email)
→ 07 Report Access and Recovery (later)
```

The product contract is split across [`docs/END_TO_END_PLAN.md`](../END_TO_END_PLAN.md)
(verification strategy, failure-and-recovery matrix, cross-cutting quality
requirements), [`docs/JOURNEY_CONTRACT.md`](../JOURNEY_CONTRACT.md) (12
cross-module invariants, module ownership and handoffs), and six touchpoint
plans under `User Flow/01`–`06`, each with numbered acceptance criteria (ACs).
This plan maps **every AC** and the **18 integration checks** to concrete test
layers and names the human gates where judgment is the only valid gate.

Two facts anchor the plan:

1. A passing build is necessary but never sufficient. Natural Indonesian,
   founder-truth, and report-worthiness are judgment gates, not assertions.
2. The 18 integration checks are the seam where modules stop being separately
   correct and start being one correct journey. Each maps to at least one
   automated layer and, where the risk is language, evidence truth, or
   commercial promise, to a named human gate.

## 2. Test layers (taxonomy used throughout)

| Layer | Tool | What it proves | No side effects |
|---|---|---|---|
| **Contract / unit** | Vitest (`src/lib/**/*.test.ts`) | Pure contracts and arithmetic: score count, denominators, quote expiry, question classification, safe failure categories, idempotency keys | No network, no provider |
| **Integration** | Vitest with provider/db adapters stubbed | API boundaries behave under retries, duplicates, out-of-order events, and partial data (Midtrans, Resend, OpenAI/Gemini, durable job store) | Providers stubbed/mocked |
| **Browser / e2e** | Playwright (`tests/e2e/`) | The real journey in a real browser: navigation, gates, refresh, recovery, mobile, keyboard, reduced motion | Fixture mode; no paid model/email/payment call |
| **Rendering** | Playwright print-media + PDF page QA | Screen, print, and PDF share one report version and facts; no clipping or divergence | Fixture payload |
| **Security** | Targeted adversarial tests + review | Access proof is unguessable, webhooks are authenticated, state is server-authoritative, PII stays out of prompts/reports/git | Stubbed or local |

**Human gates** (judgment the machine cannot make): native Indonesian review,
founder truth check, sceptical-customer + audit-professional report review,
permission/privacy review, mobile/desktop visual QA, and founder approval of
delivery promise, retention, and terminal remedy.

## 3. Current test baseline (observed, read-only)

Observed by source inspection on 2026-08-17; no suite was executed and no file
was modified. Counts are `it(`/`test(` definitions (including parameterized
`.each` cases), so they are a source-level approximation of runtime case count.

**Unit tests — `src/lib/audit/` (9 files, 110 definitions):**

| File | Definitions |
|---|---:|
| `contracts.test.ts` | 26 |
| `report-gaps.test.ts` | 17 |
| `groq.test.ts` | 14 |
| `questions.test.ts` | 13 |
| `openai.test.ts` | 13 |
| `telemetry.test.ts` | 11 |
| `report-pipeline.test.ts` | 6 |
| `gemini.test.ts` | 6 |
| `stream.test.ts` | 4 |

**Unit tests — `src/lib/fixture-journey/` (3 files, 55 definitions):**
`state.test.ts` (40), `report.test.ts` (11), `processing.test.ts` (4).

**Unit total: 12 files, 165 definitions.**

**Browser e2e — `tests/e2e/` (3 spec files, 23 tests):**

| Spec | Tests |
|---|---:|
| `fixture-journey.spec.ts` | 18 |
| `forced-failure.spec.ts` | 3 |
| `preview-disabled.spec.ts` | 2 |

Plus non-spec harness files `helpers.ts` (access-cookie grant, request/no-side-
effect recording, state seeding) and `shared-config.ts` (three server modes on
distinct ports, `NUAVE_ACCESS_CODE` gate).

> Note on history: `specs/001-simulated-journey-shell/VERIFICATION.md` recorded
> "93/93" audit tests and "23/23" e2e tests on 2026-08-12. The audit test count
> now reads 110 definitions, consistent with post-specification contract growth
> (`report-gaps`, `report-pipeline` additions). Treat the 2026-08-12 figure as
> the last *recorded passing run*, and this document's numbers as the current
> source-level baseline that a fresh run should be checked against.

## 4. The 18 integration checks → test gates

Each check names its automated layers and, where judgment is required, its
human gate. "Primary" is the layer that must fail the check if anything is
wrong; the others are corroborating.

### 1. Landing → order preview
- **Primary — browser/e2e.** Land CTA **"Cek bisnis saya di AI"** → submit one
  supported source (website / Google Maps / Instagram) → best-effort identity
  preview with no model/audit call. Replace-link path, missing-logo/description
  fallback, ambiguous-business clarification, and the "upper CTA scrolls, only
  **Bayar Rp99.000** starts payment" split. Extend the existing
  `fixture-journey.spec.ts` no-side-effect harness so the preview path asserts
  zero `/api/audit/*` and zero external-service requests.
- **Contract/unit.** Source normalization and the supported-URL allowlist; safe
  URL handling; cache key = normalized source.
- **Human gate.** Fresh reviewer walkthrough (mobile + desktop); native
  Indonesian copy review of the preview and trust wording.
- **ACs covered.** 01 AC 1–7, 12.

### 2. Rp99.000 quote + 30-day validity
- **Contract/unit.** Server-owned total constant (`Rp99.000`, no added tax/fee);
  `quote_expires_at` arithmetic; 30-day rule "expired ⇒ refresh before payment,
  never expire an already-paid order" (JOURNEY invariant 11).
- **Integration.** Browser-submitted price/amount is ignored; a quote older than
  30 days cannot create a Midtrans attempt until preview refresh.
- **Browser/e2e.** Price, expiry, and "one audit, not a subscription" are visible
  on mobile; expired-quote state blocks payment with a refresh path.
- **Human gate.** Founder approval of commercial terms (price, delivery promise,
  retention) before real checkout.
- **ACs covered.** 01 AC 8, 12 (price/email); 02 AC 18.

### 3. Midtrans payment states + duplicate protection
- **Integration (primary).** With Midtrans stubbed: authenticated notifications,
  order+amount+currency match, idempotent `payment_events`, out-of-order /
  delayed / missed / duplicated webhooks, "two successful attempts ⇒ one
  entitlement + duplicate flag," reversal/refund/dispute handling, and the
  status destination rendering checking/pending/confirmed/expired/cancelled/
  failed/unavailable truthfully.
- **Security.** Signature mismatch or mismatched reference ⇒ reject and lock the
  order; no browser callback or screenshot ever unlocks paid state (JOURNEY
  invariant 1); server-authoritative amount/scope.
- **Human gate.** Founder approval of merchant configuration, sandbox→live
  verification, and refund operations per method.
- **ACs covered.** 02 AC 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16.

### 4. Payment unlocks Business Facts without starting the audit
- **Integration.** Verified paid state ⇒ `facts_preparing`, never
  `audit_queued`/`audit_running`; entitlement stays unused.
- **Browser/e2e.** Simulated payment ⇒ **"Periksa informasi bisnis"**; no
  observation/report request is issued (assert via the request recorder).
- **Security.** Client state cannot forge `paid`; payment state is server-owned.
- **Human gate.** None beyond product review.
- **ACs covered.** 02 AC 10, 14; 03 AC 1; JOURNEY "preparation cannot start
  before verified or explicitly simulated payment."

### 5. Business correction invalidating + regenerating questions
- **Integration.** A same-business fact change creates a new
  `business_fact_version_id`, supersedes the `question_pack_version_id`, and
  issues exactly one new generation call; the old pack is preserved for audit
  but only the newest can run (JOURNEY invariant 4).
- **Browser/e2e.** Edit confirmed fact → explicit warning → regenerate → full
  re-review; ordinary reload/back-navigation does **not** regenerate (04 AC 13).
- **Human gate.** None.
- **ACs covered.** 03 AC 18; 04 AC 13.

### 6. Free question editing + final-pack approval
- **Browser/e2e (primary).** Replace any of ten questions, restore suggestion,
  dynamic **Tanpa/Menyebut bisnis Anda** counts from final text, advisory
  coverage warnings (not blockers), narrow hard stops (empty/unexecutable, PII,
  disallowed high-impact advice, off-scope, provider-unsafe), and final
  **Jalankan audit** / **Mulai audit sekarang** confirmation.
- **Contract/unit.** Name/no-name classification from final text; validation
  rules; "no credit language" assertion.
- **Human gate.** Native Indonesian review of generated question packs (the
  five-business evaluation rubric and practical quality gate — naturalness,
  relevance, no name leakage, no unsupported premises) cannot be automated.
- **ACs covered.** 04 AC 10–16.

### 7. Explicit audit consumption
- **Integration (primary).** One atomic start transaction: verify private order
  access + unused entitlement → lock fact version → lock ten-question pack →
  lock provider/model/instruction → create one job + ten observation records →
  mark entitlement consumed → return the same job on double-click (05 AC 1, 2).
- **Browser/e2e.** Double-click / refresh / reopen cannot start a second audit.
- **Security.** Entitlement consumed server-side; no client bypass.
- **Human gate.** None.
- **ACs covered.** 04 AC 15; 05 AC 1, 2.

### 8. Browser closure + durable continuation
- **Integration (primary).** Worker continues after client disconnect; each
  observation persisted before and after the provider call; bounded lease
  recovery; resume after server restart; reconnect restores state without
  replacing the job (05 AC 6, 12; JOURNEY invariant 3).
- **Browser/e2e.** Close/reopen and refresh reconstruct server state; no
  duplicate job. (Current `fixture-journey.spec.ts` refresh/pause-resume tests
  are the session-store precursor; durable-state equivalents belong to Phase 4.)
- **Human gate.** None.
- **ACs covered.** 05 AC 6, 12.

### 9. Targeted recovery of failed observations
- **Contract/unit.** Safe failure categories; evaluable-vs-technical taxonomy
  (valid negative / uncertainty / conflict / source-less / substantive refusal
  = completed; provider/policy block with no usable answer = failed) (05 AC 13).
- **Integration.** Retry only the failed question with the same locked
  configuration; ≤2 automatic retries after initial attempt; customer-initiated
  retry for exhausted failures without new payment; completed questions never
  rerun (05 AC 14–18).
- **Human gate.** Founder support may retry only failed work under the locked
  method; cannot edit evidence or rerun valid observations.
- **ACs covered.** 05 AC 14–18; JOURNEY invariant 5.

### 10. The 10/10 report gate
- **Integration/unit (primary).** One report request is emitted only when ten
  of ten observations are evaluable, durable, and frozen; structural integrity
  checks precede synthesis; report retry reuses frozen evidence and never
  reruns an observation (05 AC 19, 20; JOURNEY invariant 6).
- **Rendering.** Report always derives from the frozen evidence set, never from
  a partial set.
- **Human gate.** None (deterministic gate).
- **ACs covered.** 05 AC 19, 20; 06 AC (delivery only after 10/10).

### 11. Direct appearance-count arithmetic (4/10 style)
- **Contract/unit (primary).** Overall count = visible appearance across all ten
  retained answers; separate **Tanpa menyebut bisnis Anda** and **Menyebut
  bisnis Anda** denominators beneath it; zero eligible denominator ⇒
  **Tidak diuji** (never zero performance); no percentage/rank/forecast; count
  derived in code, not prose (06 AC 1–4, 14; JOURNEY invariant 8).
- **Human gate.** Founder approval of the direct-count presentation and its
  name/no-name breakdown; sceptical-customer review of the first real report.
- **ACs covered.** 06 AC 1, 2, 3, 4, 14.

### 12. 1–5 findings and actions without filler
- **Contract/unit.** Findings count 1–5 (one or two strong findings
  sufficient); actions 1–5, each with concrete work, why, evidence refs, owner,
  observable completion check, caveat; maintenance/further-investigation action
  is explicitly labelled and never presents an untested aspect as a weakness
  (06 AC 5, 15, 16; JOURNEY invariants 9, 10).
- **Human gate.** Sceptical-customer + audit-professional review of the first
  real report (Phase 3 exit gate: "report worth paying for").
- **ACs covered.** 06 AC 5, 15, 16.

### 13. Web report delivered while PDF failed
- **Integration.** `web_report_ready` independent of `pdf_pending`/`pdf_failed`;
  report-ready email does not wait for `pdf_ready` (06 AC 19; JOURNEY
  invariant 12).
- **Browser/e2e.** **Download PDF** label stays visible but unavailable with a
  truthful nearby status; web report and access are not withheld.
- **Human gate.** None.
- **ACs covered.** 06 AC 19.

### 14. Later PDF recovery from the same report version
- **Integration.** PDF retry changes only the derived-artifact status, reusing
  the same `report_version_id`; no observation rerun; success restores
  **Download PDF** without changing facts (06 AC 20).
- **Rendering.** Recovered PDF renders the identical report facts/version.
- **Human gate.** PDF page-by-page visual QA (no factual divergence, clipping,
  or unreadable evidence).
- **ACs covered.** 06 AC 20.

### 15. Report-ready email resend / failure behavior
- **Integration (primary).** Resend stubbed: delivery record keyed on report
  version + recipient version + template version; duplicate report-ready event
  cannot storm; resend creates a new delivery attempt against the same immutable
  report — never regenerates the report or reruns an observation (06 AC 17, 18;
  JOURNEY invariant 6); from **Tim Nuave <support@nuave.ai>** (06 AC 21).
- **Human gate.** Native Indonesian review of the email; founder approval of the
  delivery promise and finite-access wording.
- **ACs covered.** 06 AC 17, 18, 21.

### 16. Mechanism-neutral handoff to Module 07
- **Contract/integration.** Handoff fields both ways: 06 → 07 (immutable
  validated report version, web artifact status, PDF status, recipient version,
  approved expiry/retention); 07 → 06 (approved access destination +
  access-grant version) that 06 records in delivery and uses for email.
  Provisioning/recovery are idempotent, rate-limited, and cannot duplicate or
  mutate order/report/audit (JOURNEY handoff table + invariant 12).
- **Security.** Access proof unguessable, revocable, finite, no indexing/
  referrer leakage.
- **Human gate.** Founder decision on the mechanism itself (private link vs
  narrow history vs account) — explicitly deferred, not assumed.
- **ACs covered.** JOURNEY 06↔07 handoff fields; invariants 3, 12.

### 17. Wrong-business founder remedy without rewriting the original run
- **Integration.** Restricted founder admin action grants one replacement audit
  chance linked to the original order; original run + evidence + payment record
  preserved; replacement order is last resort (05 support routing; JOURNEY).
- **Security.** The remedy is a server-side restricted action, not a customer
  or dashboard control.
- **Human gate.** Founder truth check: the wrong-business claim is genuine and
  the remedy is recorded.
- **ACs covered.** 05 support-routing clauses; 03/04 wrong-business clauses;
  JOURNEY "one recorded replacement audit chance."

### 18. Mobile / accessibility / Indonesian / privacy / evidence checks
Cross-cutting (END_TO_END_PLAN §8). This is one composite gate split by layer:
- **Browser/e2e.** Mobile viewport no horizontal scroll; keyboard-only
  completion with visible focus; `aria-live` status; reduced-motion path
  (already demonstrated by `fixture-journey.spec.ts`).
- **Contract/unit.** Evidence integrity: exact excerpts preserved and never
  translated; deterministic counts and method copy in code.
- **Security.** Recipient email / payment data / access secrets / unrelated
  free text never enter observation or report-model prompts (JOURNEY invariant
  7); rate limits and server cost ceilings.
- **Human gates.** Native Indonesian review (questions, workflow copy, report,
  emails); permission/privacy review before any real business is used as a
  sample; mobile + desktop visual QA; founder approval of privacy/retention/
  terms.
- **ACs covered.** 01 AC 12; 02 AC 17; 04 AC 3; 05 AC 8, 9, 10; END_TO_END_PLAN
  §8 quality requirements.

## 5. Acceptance-criterion coverage matrix

Every AC in the six touchpoint plans and the JOURNEY_CONTRACT invariants is
assigned to at least one of the 18 checks (and thereby to a layer + human gate).
Rows are AC ranges; "checks" cites the check numbers from §4.

| Source | ACs | Checks that cover them | Dominant layer(s) |
|---|---|---|---|
| 01 Order Preview | 1–12 | 1, 2, 18 | browser/e2e, contract |
| 02 Payment | 1–18 | 2, 3, 4, 18 | integration, security |
| 03 Business Facts | 1–18 | 4, 5, 18 | integration, browser/e2e |
| 04 Questions | 1–20 | 5, 6, 7, 18 | browser/e2e, contract |
| 05 Audit Run | 1–27 | 7, 8, 9, 10, 17, 18 | integration, contract |
| 06 Audit Report | 1–21 | 10, 11, 12, 13, 14, 15 | contract, rendering |
| JOURNEY invariants | 1–12 | 2, 3, 4, 5, 9, 10, 11, 12, 13, 16, 18 | integration, contract |

An AC is "covered" only when a named test (automated layer) or named human gate
exists that would fail if the criterion were violated. The parent orchestrator
should tick this matrix off per completed workstream so no AC is orphaned.

## 6. Verification ownership model

One **independent verification agent per completed workstream**, plus one
**final end-to-end reviewer**. The builder of a workstream never signs off its
own work — each workstream's `VERIFICATION.md` is authored by a different agent
that inspects the working tree, runs the checks, and issues Pass/Fail.

| Verification role | Owns | Deliverable |
|---|---|---|
| V-00 Order Preview | Landing entry + preview + quote (checks 1, 2, 18) | `specs/<n>/VERIFICATION.md` (Module 01) |
| V-02 Payment | Midtrans states + duplicates + entitlement (checks 3, 4) | Module 02 verification record |
| V-03 Business Facts | Preparation + correction/regeneration (checks 4, 5) | Module 03 verification record |
| V-04 Questions | Generation + editing + approval + consumption (checks 6, 7) | Module 04 verification record |
| V-05 Audit Run | Durable job + retry + 10/10 gate (checks 8, 9, 10) | Module 05 verification record |
| V-06 Audit Report | Counts + findings/actions + PDF + email (checks 11–15) | Module 06 verification record |
| V-07 Access (later) | Handoff + access/recovery (checks 16, 17) | Module 07 verification record |
| **Final E2E reviewer** | Cross-module invariants, the full 18-check integration list, and the human gates | One consolidated integration-verification record |

Rules:
- A module verifier may not be the module's implementer.
- The final reviewer is independent of every module verifier and runs the full
  journey (fixture → simulated checkout → report) once unassisted.
- Human gates are assigned to named people (founder or invited reviewer), never
  to an agent. The verifier's job is to *collect* the gate verdict, not to
  substitute judgment for it.

## 7. Recommended run order

Run layers cheap-first and fail-fast, so an expensive browser or judgment pass
never masks a broken contract.

1. **Baseline freeze.** Record current unit + e2e counts and a passing
   `npm run test:audit` / `test:e2e` / `check` / `build` result as the
   regression baseline (this document's §3 is the source-level freeze).
2. **Contract/unit.** Score arithmetic, denominators, quote expiry, question
   classification, safe failure categories, idempotency keys, findings/actions
   shape. (Checks 2, 5, 6, 9, 11, 12.)
3. **Integration (stubbed providers).** Payment webhook idempotency, durable
   job/resume/retry, 10/10 gate, web/PDF state machine, email delivery records,
   Module 07 handoff, wrong-business remedy. (Checks 3, 4, 7, 8, 10, 13–17.)
4. **Browser/e2e.** Full fixture journey + simulated payment through all gates,
   refresh/recovery, mobile, keyboard, reduced motion, no-side-effect
   assertions. (Checks 1, 6, 7, 13, 18.)
5. **Rendering.** Screen/print parity and PDF page-by-page QA against the same
   report version. (Checks 11, 14, 18.)
6. **Security.** Access-proof guessing, webhook signature rejection, forged
   client state, rate limits, server-authoritative amount/mode. (Checks 3, 16,
   17, 18.)
7. **Human gates.** Native Indonesian review → permission/privacy review →
   founder truth check → sceptical-customer + audit-professional report review
   → mobile/desktop visual QA → founder approval of commercial/remedy terms.

Order within the journey: the 18 checks should also be *re-verified* in the
customer sequence 1→18 at the final reviewer's pass, because the integration
checks are ordered by where a customer meets them, not by build phase.

## 8. Human gates summary (judgment required)

| Gate | Who | Where in §4 |
|---|---|---|
| Native Indonesian review (questions, copy, report, emails) | Native speaker / founder | 1, 2, 6, 15, 18 |
| Founder truth check (wrong-business remedy) | Founder | 17 |
| Sceptical-customer + audit-professional report review | Founder + invited reviewer | 11, 12 |
| Permission/privacy review before a real sample | Founder | 18 |
| Mobile + desktop visual QA | Reviewer | 18 |
| Founder approval — price, delivery promise, retention, terminal remedy | Founder | 2, 3, 15, 16 |

## 9. What this plan deliberately does not do

- Change any test, source, or config file.
- Run any test suite or `git` write command.
- Read `archive/` or `node_modules/`.
- Preselect the Module 07 access mechanism, the payment provider's production
  configuration, or any open founder decision listed in
  `docs/JOURNEY_CONTRACT.md` §Open decisions.

## 10. Files read

- `docs/END_TO_END_PLAN.md` (verification strategy §9, failure/recovery matrix
  §10, cross-cutting quality §8, plus phases/delivery §7 and decisions)
- `docs/JOURNEY_CONTRACT.md` (full: invariants, ownership/handoff, states)
- `User Flow/01 - Order Preview.md` through `User Flow/06 - Audit Report.md`
  (objectives, acceptance criteria)
- `specs/001-simulated-journey-shell/VERIFICATION.md`
- `tests/e2e/fixture-journey.spec.ts`, `forced-failure.spec.ts`,
  `preview-disabled.spec.ts`, `helpers.ts`, `shared-config.ts`
- `src/lib/audit/*.test.ts` (9 files) and `src/lib/fixture-journey/*.test.ts`
  (3 files) — counted, not modified

## 11. File written

- `docs/drafts/00-integration-verification-plan.md` (this document)
