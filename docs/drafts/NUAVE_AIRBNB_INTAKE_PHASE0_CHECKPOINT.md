# Phase 0 checkpoint — Airbnb intake clean rebuild

> Date: 2026-09-03. Checkout: `fix/identity-scan-loading-state` @ `28f2561`, clean.
> `origin/main` @ `e531ff46`. Plan Rev 3 read from `origin/docs/airbnb-intake-clean-rebuild-plan` (808 lines, commit `483d634`) via `git show` — no branch switches, no commits, no live calls, `archive/` never read.

## Verdict: PROCEED (with 3 small docs fixes before Gate 0)

No load-bearing plan assumption failed. The two risks found are docs-only and non-blocking for the fixture skeleton.

## 1. Baseline (verified this session)

- Workflow record `nuave.audit.workflow.v9` (`src/lib/audit/workflow-storage.ts:24`, schema v9 `workflow-authority.ts:13`, pinned by `workflow-storage.test.ts:35-39`). Session key `nuave.audit.session.v1` (`:25`).
- No `v10` / `intake.v1` keys anywhere (`git grep` = zero hits). No `PREVIEW_INTAKE_SURFACE` / `intake-preview` in `src/` (only `NUAVE_FIXTURE_PREVIEW_ENABLED`).
- Routes: `/audit`, `/audit/v2`, `/audit/fixture`, `/audit/spec004`. No preview route yet.
- Recovery branch `origin/claude/nuave-intake-recovery-plan-tlv905` = one doc file only (`specs/007-intake-airbnb-revamp/INTAKE_RECOVERY_PLAN.md`, 723 insertions, 0 code). All 7 flag hits are prose in that file. Nothing to forward-port — archival only, confirmed.
- `AuditWorkflow.tsx` is 1,548 lines owning restore, extraction, brief editing, navigation, prompts, audit, report, variance — confirms the plan's "controller migration is first-class, not wiring."

## 2. Forensic update (cycles 1–2: no change, mechanism confirmed in code)

- Single-key persist: `AuditWorkflow.tsx:530-572` writes the whole record; restore `:435-492` hydrates all state; strict parser `workflow-authority.ts:860-1028` rejects any version/screen/scope/derived-field drift → split-brain if two writers ever exist. This is why the plan demands one writer per record.
- Payment flag (`paymentSatisfiedRef`, `:279`) and budget (`carryoverCostUsd`, `:494-528`) are memory-only — reload loses them unless facts were persisted. Paid durability is therefore correctly scoped as paid-launch work, not this rebuild.
- Source handoff is consume-once (`SourceHero.tsx:73-78`). Report step requires settled variance (`:644-649` + `:582-586`).

## 3. State-ownership map (condensed; full table in worker evidence)

| Record | Sole writer | Persistence | Resume |
|---|---|---|---|
| Workflow record (brief, meta, extraction, promptPack, observations, report, telemetries) | `AuditWorkflow` persist effect | `sessionStorage nuave.audit.workflow.v9` | Full hydrate; strict reject on drift |
| `safety_identifier` | `AuditWorkflow` memo `:281-288` | `sessionStorage nuave.audit.session.v1` | Same-tab only |
| Variance + failure records | `runVariance` / `runAudit` | `nuave.audit.variance.v1` + `.failure.v1` | `run_key` match or re-run; report gated |
| Source handoff (bare URL) | `AuditPrePaymentJourney` | `nuave:audit-source-handoff-v1` | Consume-once, auto-extract |
| Pre-payment form state | `AuditPrePaymentJourney` | Memory only | Lost on navigation |

Controller seam: `AuditV2Journey.tsx:47` renders `<AuditWorkflow/>` post-payment; inside, `deriveAuditStep` 0=source + 1=facts (intake: `SourceHero` + `B1BriefStep`) vs 2=questions + 3=run + 4=report (stays with narrowed `AuditWorkflow`). Handoff boundary = `factsConfirmed=true` + clean `validateBriefForReview` + `promptPack` set.

## 4. Keep-or-rebuild (all six: KEEP — rebuild is presentation-only)

Source retrieval (`safe-source-fetch.ts`, `source-identity/input`, `website-input` + tests) · payment boundary (`payment-boundary.ts:1-12` + `payment-boundary.test.ts`) · preparation/extraction (`workflow-authority/storage/operation-generation`, extract route + tests) · question gen + review (canonical 6/4 in `measurement-matrix.ts:474-481`, `questions-id`, `locked-question-pack` + tests) · audit runner + provider (`run-orchestrator`, `provider.ts` fails-closed + tests) · reporting/variance (`report-pipeline`, `variance.ts` + tests). Each sits wholly outside intake presentation with boundary contract tests. Proposed storage split: new `nuave.audit.intake.v1` (per-screen draft, intake-owned, intake-only parser) + bumped `workflow.v10` (canonical record, authority-owned); only validated Brief+Meta crosses at review-confirm.

## 5. Conflict register

- **C1 provenance hide-vs-show → HIDE.** `V1_PRODUCT_CONTRACT.md:127-129` (+`:222`,`:249`,`:285`), `intake-handoff.md:32-35,136` beat `VOICE.md:180-190` §7.2 six visible labels, via plan Rev 3 authority + newer V1 filing. **Required: rewrite VOICE §7.2 to backend-only + one explicit DECISION_LOG "hide" row** (no such row exists today — currently rests on the plan alone).
- **C2 "labelled/marked" wording → backend-only.** Fix `END_TO_END_PLAN.md:183,194`, clarify `PRODUCT.md:156`, `JOURNEY_CONTRACT.md:86` (server flags, never rendered).
- **C3 question mix 5/5 vs 6/4 → 6/4.** Fix `END_TO_END_PLAN.md:79-80,204-216` (Spec 007 R-01/R-02 + AUDIT/V1/PRODUCT control).
- **C4 Maps-as-source → deferred.** Fix `END_TO_END_PLAN.md:143` (website/Instagram only).
- **C5 final CTA → RESOLVED 2026-09-03: single label "Mulai audit".** Trim VOICE `:199` to one label; update `intake-handoff.md:27-31` (currently mandates "Jalankan audit, do not paraphrase") to the picked label.
- Same-level note: `INDEX.md` never ranks V1/JOURNEY/END_TO_END vs VOICE — C1 resolves only via Rev 3 + the recommended log row above.

## 6. Scope split + screen inventory (accepted tweak 2 locked here)

- This rebuild = simulated-payment path only. Real payment, server-owned paid state, cross-device resume, paid remedies = separately blocked paid-launch scope.
- **Out of scope (existing surfaces stay):** `p-landing, p-scan, p-reveal, p-pay, p-pay-qris, p-pay-va, p-pay-wallet, p-processing, p-success, p-manual`.
- **In scope (new journey):** `s-crawl, s-brand, s-brand-fix, s-scope, s-branch*, s-product*, s-category, s-offerings, s-customers, s-market*, s-competitors, s-facts (optional), s-review, s-questions` (*conditional). Normal path ≤10 + review; Gate 0 ledger may preserve or reduce, never grow without founder approval.
- **Typing metric (new, Gate 0):** happy path needs zero free-typing; every prepared answer correctable in ≤2 taps. Screen-count + happy-path/recovery time budgets stand.

## 7. Telemetry

Cost/ops ledger exists (`telemetry.ts`, `types.ts`); completion, per-screen time, drop-off, validation/correction funnel = none exist, prototype uninstrumented. Privacy-safe funnel (no answer text, no source content, no contact/payment data) ships with the preview per plan — no pre-launch baseline exists or is fabricated.

## 8. Execution order (accepted tweak 1) + keep-list (tweak 3)

Paper mapping timeboxed to 2 days (rich path fully mapped; messy cases listed); then full fixture skeleton before the controller split is perfected — Gate 1 judges the composed feel while throwaway is cheap. Keep-list = §4 six. Estimates unchanged (25–43 working days + ≤5 gate turnarounds); Phase 0 cost ~1 day.

## Gate 0 package (definition)
Screen/transition ledger · closed Indonesian copy deck (post-C1/C5) · 5 archetypes · paper IntakeState + complete mapping table · materiality table · storage decision · rich + 2 messy + wrong-identity + manual-fallback + failure fixtures · funnel event list · screen/time/typing budgets. Two rework rounds max; second rejection returns to contract, not a third patch.

## Execution record

- Rebuild branch: `feat/airbnb-intake-rebuild` (from `origin/main` @ `e531ff4`). Archival tag: `intake-rebuild-baseline` (local; recovery branch retained as evidence, never merged).
- Intake Experience Owner: the Boss orchestration session (this session); Yasir final approver at every Founder UX Gate.
- Founder decisions 2026-09-03: single CTA "Mulai audit"; conflict-register resolutions accepted (C1 hide, C2 backend-only, C3 6/4, C4 Maps deferred); Phase 1 authorized.
- Phase 1 DONE 2026-09-03 (`npm run verify` green: guard 5/5, legacy e2e 15/15, main + failure/disabled suites green, offline verification passed). Inventory gap (Task 1 no-show) closed by orchestrator. `e1-runnable-journey` stays in main suite (pre-payment, out of scope).
- Gate 0 package drafted 2026-09-03: INTAKE_EXPERIENCE_CONTRACT.md (560), INTAKE_DATA_CONTRACT.md (235), INTAKE_FIXTURES_AND_BUDGETS.md (140). Mapping: 0 lossy, 0 downstream changes. Leftover JOURNEY_CONTRACT CTA line synced to "Mulai audit". T_base unmeasured (honest gap) — needs one human trial run to bind numerically.
- Gate 0 APPROVED 2026-09-03 after founder walkthrough (DECISION_LOG row). Skeleton build dispatched.
- Skeleton integrated 2026-09-03: shell+nav+14 screens wired on /audit/new-intake (fixture injection, readback Ubah direct-jump proven target=landed, 67/67 intake tests, tsc clean). Fixture meta-text replaced with prototype SCENARIOS data; thin-detection made id-based; guard extended (all module files scanned, hook-files need "use client"). Full F1 path + 6 branch variants reach s-review in Chromium; gallery /tmp/gate1-gallery. Awaiting `npm run verify` for Gate 1.
- `npm run verify` GREEN 2026-09-03 (Offline verification passed). Fixes en route: render-time nav mutation removed (callback-only validity; shell enforcement = Phase 5), dead helper removed, prettier applied, dev-server/.next lock collision resolved (no dev server beside e2e gate). Gate 1 presented.
- Gate 1 batch-1 CHANGES REQUESTED + decision 2026-09-04 (attachment NUAVE_BRAND_CONFIRMATION_DECISION.md): s-crawl headline "Kami sedang mengenali bisnis Anda"; steps 1-3 reworded; no Continue, auto-advance, no artificial delay; read-failure stops with Coba lagi + Ubah sumber (never creates a preview). s-brand = Editorial Konfirmasi: headline secondary "Kami menemukan brand ini"; large stacked brand card (logo/initials, name, source, ≤2-3 line source-derived description — omit when no reliable description, never invent), secondary "Ubah"; sticky Kembali/Lanjut, Lanjut = implicit confirm (NO Ya/Bukan choices); no provenance/confidence. s-brand-fix = "Perbaiki brand" + "Ubah nama atau sumber jika hasilnya belum tepat", prefilled Nama brand + Sumber bisnis, Batal (back, no change) / Periksa lagi (validate, re-read via Membaca, refreshed card). Founder: keep 4-chapter progress (no local pills); implement batch 1 NOW, further batches may supersede copy/screens later.
