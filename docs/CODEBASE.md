# Nuave Codebase Map

## 1. Purpose and authority

This document is a navigation map for the Nuave v2 codebase. It tells a fresh
agent where each capability lives, how the current flows pass through the code,
and which seams are dangerous to change. It is **not** product authority, not an
implementation specification, and not a substitute for reading the active
specification.

- [`docs/INDEX.md`](./INDEX.md) remains the canonical document map and
  authority chain.
- Code and tests describe **current implementation reality**. A specification
  existing in `specs/` does not mean it is implemented.
- Canonical product documents and approved specs govern intended behavior per
  the repository's authority rules; where this map notes a difference between
  documentation and code, the map reports it without resolving it.

Inspected branch and baseline:

- Branch: `feat/spec-007-a2-downstream-consumers`
- HEAD: `0267e358216a6bcf128ebbba07c21d2d1edfedc3`
  (`feat(audit): derive downstream report/UI/fixture semantics from A1 matrix`)

## 2. Repository at a glance

| Area | Contents |
|---|---|
| `src/app/` | Next.js App Router pages and API routes. Landing page, `/audit` workflow, `/audit/fixture` simulation, `/audit/spec004` demo, `/api/audit/*` handlers |
| `src/components/` | Product components (landing, audit, previews) and `ui/` shadcn/Base UI primitives |
| `src/lib/audit/` | The audit engine: contracts, measurement matrix, question generation, execution, providers, report pipeline, storage |
| `src/lib/fixture-journey/` | Deterministic end-to-end fixture simulation (state, processing, adapter, report) |
| `src/i18n/`, `src/messages/` | next-intl wiring; single Indonesian locale (`id`) with `localePrefix: "never"` |
| `src/styles/`, `src/app/globals.css` | Design tokens and global styles |
| `src/app/faq/`, `src/app/terms/`, `src/app/privacy/`, `src/app/support/` | Static public/support pages; not part of the audit execution flow |
| `tests/` | Playwright E2E suites + offline verify-gate tests |
| `scripts/` | Offline verification, typography check, and live-provider evaluation harnesses (run manually only) |
| `.github/workflows/ci.yml` | CI validate job + `verify-main-origin` deployment gate + Cloudflare deploy |
| `specs/` | Specification packages; `007-intake-airbnb-revamp/` is the active spec |
| `docs/` | Canonical product documents (see `docs/INDEX.md`) |

## 3. Product surface map

Frame: **Landing → Order Preview → Payment → Business Facts → Questions →
Audit Run → Audit Report**. Status legend: ✅ production-relevant code;
🧪 fixture/simulation only; 🔶 partially implemented; ⏳ specified/planned.

| Capability | Route/Page | Primary components | Core logic | State | Status |
|---|---|---|---|---|---|
| Landing | `/` (`src/app/page.tsx`) | `LandingAuditHero`, `HowItWorks`, `LandingTileReveal`, preview tiles | Landing→`/audit` handoff: GET budget + POST extract (`LandingAuditHero.tsx`), writes initial state to session storage | `nuave.audit.workflow.v7` | ✅ |
| Order Preview | — | `PaymentPreview` (landing tile), simulated offer in `FixtureJourney` | Static preview copy; fixture shows a Rp99.000 simulated order | — | 🔶 (simulated; no real offer state) |
| Payment / checkout | — | Simulated checkout inside `FixtureJourney` (fixture) | **No payment implementation anywhere.** Real checkout is gated behind an approved spec; the fixture journey marks its checkout as simulated | — | ⏳ (real) / 🧪 (fixture) |
| Business Facts (brief) | `/audit` step 1 | `BriefStep` (`AuditStages.tsx`) | Edits the AI-drafted brief; `customer_supplied_facts` vs AI-drafted field ownership (`workflow-storage.ts`, `similar-businesses.ts`) | workflow state | ✅ |
| Questions | `/audit` step 2 | `QuestionsStep` (`AuditStages.tsx`) | Live Indonesian generation (`questions-id-live.ts` → provider) with deterministic fallback (`questions-id.ts`); reviewed pack is locked before run | workflow state | ✅ |
| Audit Run | `/audit` step 3 | `AuditRunStep` | Streaming observation execution (`stream.ts`, `run-orchestrator.ts`, `retry.ts`) via `/api/audit/run` | workflow state | ✅ |
| Audit Report | `/audit` step 4 | `ReportView`, `ReportToolbar` | Report synthesis + repair (`report-pipeline.ts`, `report-recovery.ts`, `report-quality-repair.ts`) via `/api/audit/report`; evidence export (`customer-evidence-export.ts`) | workflow state | ✅ (browser print/save-to-PDF is implemented; durable PDF delivery and hosted/private access are planned) |
| Fixture journey | `/audit/fixture` (`src/app/audit/fixture/`) | `FixtureJourney`, `FixtureReportView` | Full 01→06 journey with fictional business (Kopi Taman Senja), simulated payment and destination; gated by server env `NUAVE_FIXTURE_PREVIEW_ENABLED`; makes **no** `/api/audit/*` calls (`state.test.ts` enforces this) | `nuave.fixtureJourney.v4` (session storage) | 🧪 |
| Spec 004 demo | `/audit/spec004` | `Spec004Demo`, `Spec004Hero` | Standalone demo surface, isolated from the live workflow | none | 🧪 |

## 4. End-to-end implementation flow

The **production** flow (`/audit`, `AuditWorkflow.tsx`):

1. **Landing (`/`)** → `LandingAuditHero` GETs `/api/audit/extract` (budget
   check), then POSTs the website URL to extract a draft; writes an initial
   workflow state (key `nuave.audit.workflow.v7` via `createInitialExtractedAuditWorkflowState`)
   and routes to `/audit`.
2. **Intake** → `/audit` (`page.tsx` + `AuditEntryShell`): `SourceStep`/`SourceHero`
   collects the source; `BriefStep` (step 1) edits the AI-drafted business brief.
3. **Questions (step 2)** → POST `/api/audit/prompts` with the prepared brief;
   the returned pack is reviewed and locked (`locked-question-pack.ts`).
4. **Run (step 3)** → POST `/api/audit/run` streams ten observation events
   (`stream.ts` `AuditRunEventParser`) into `promptStatuses`/`observations`.
5. **Report (step 4)** → POST `/api/audit/report`; `ReportView` renders the
   matrix-derived report; toolbar offers evidence export (no durable delivery).

Transitions that are **simulated or planned** (not production code):

- Landing → `/audit` handoff extraction is real; everything after is a single
  client session.
- Payment/checkout: **not implemented** — neither the production nor the
  fixture path makes a payment call. The fixture journey renders a simulated
  checkout screen.
- Durable delivery (named-recipient access, generated/hosted PDF): **planned**
  per README, not present in code. Browser print/save-to-PDF is implemented
  through `ReportView` (`window.print()`); the report is otherwise only in
  browser session state.
- Spec 007's 6/4 composition (six unnamed + three named + comparison slot):
  **planned** (package A3). Current live generation still produces the 5/5
  compatibility composition.

## 5. State and data ownership

All resumable customer workflow state is **browser-side**; there is no
database, server store, or accounts.

- **Live workflow** (`src/lib/audit/workflow-storage.ts`):
  - `AUDIT_WORKFLOW_STORAGE_KEY = "nuave.audit.workflow.v7"` — the resumable
    `SavedState` (brief, extraction, promptPack, observations, report,
    telemetry, `executionStarted`).
  - `AUDIT_SESSION_STORAGE_KEY = "nuave.audit.session.v1"`.
  - `AuditWorkflow.tsx` owns all persistence after mount; restore guard
    `restorableAuditReport()` refuses report shapes missing required fields.
  - `workflow-storage.test.ts` covers constructors and restore compatibility.
  - `variance.ts` owns separate variance storage keys; `variance.test.ts`
    covers that boundary.
- **Fixture journey** (`src/lib/fixture-journey/state.ts`):
  `FIXTURE_JOURNEY_STORAGE_KEY = "nuave.fixtureJourney.v4"`; legacy v1–v3 keys
  are purged on load/reset. Stage machine: preview → payment → facts →
  questions → run → report.
- **Versioned keys are an invariant**: bump the key when the persisted shape or
  resumable semantics change (precedent: v5 → v7 for provider migration).
- Validation boundaries: Zod schemas in `types.ts`
  (`extractionDraftSchema`, `auditObservationSchema`, `reportSynthesisSchema`…);
  `contracts.ts` builds/validates report structures; question-pack validation
  lives in `questions-id.ts` (`validateIndonesianQuestionPack`),
  `question-suggestion-guards.ts`, and `locked-question-pack.ts`.

## 6. AI and audit execution

API boundary (`src/app/api/audit/`): `extract`, `prompts`, `run`, `report`,
`variance`. All five are server routes; the client calls them from
`AuditWorkflow.tsx` (variance), `LandingAuditHero.tsx` (extract), and the
workflow's operations.

- **Extraction**: `extract/route.ts` (GET = budget, POST = draft with web
  search) → provider `extractBusinessDraft`.
- **Question generation**: `prompts/route.ts` →
  `questions-id-live.ts` `buildLiveIndonesianPromptPack` → provider
  `generateIndonesianQuestionPack`; deterministic fallback
  `buildDeterministicIndonesianPack` (`questions-id.ts`). Telemetry:
  `telemetry.ts` (reserve/cost guards).
- **Observation execution**: `run/route.ts` → `run-orchestrator.ts`
  (concurrency via `stream.ts` `runWithConcurrency`, per-prompt
  `executeAuditPrompt`, `retry.ts` bounded retries with timeout signals).
- **Report synthesis**: `report-pipeline.ts` → `generateReportContent`
  (no web search) + `report-quality-repair.ts` / `report-recovery.ts`;
  `report-prompt-contract.ts` defines the synthesis prompt contract.
- **Variance**: `variance/route.ts` + `variance.ts` — guards that prompt-pack
  semantics match the measurement matrix before a run is accepted.
- **Provider boundary** (`src/lib/audit/`): `provider.ts` binds
  extraction/observation/report provider behavior from `NUAVE_PROVIDER`.
  `questions-id-provider.ts` independently selects the question-generation
  provider from `NUAVE_QUESTION_PROVIDER`. Implementations: `openai.ts`,
  `gemini.ts`, `groq.ts`, `openrouter.ts`, `opencodego.ts`
  (the protected production path, OpenAI-Responses-compatible).
  `protected-observation-provider.ts` / `production-observation-method.ts`
  enforce the production method (web search on, reasoning effort `low`).
  `questions-id-provider.ts` is the question-provider selector.
- **Measurement policy**: `measurement-matrix.ts` `AUDIT_MEASUREMENT_MATRIX`
  is the single policy table; `contracts.ts`, `questions-id.ts`,
  `locked-question-pack.ts` consume it. Downstream report/UI/fixture semantics
  were derived from it in the A2 commit (HEAD).
- Cost guard: `telemetry.ts` reserves and accounts per call against a USD
  ceiling; `OPENAI_AUDIT_CARRYOVER_COST_USD` seeds already-accounted cost.
  The budget ledger is not durable server-owned session state; `telemetry.ts`
  explicitly treats that as an accepted current gap. (No secret values are
  reproduced here; see `.env.example`.)

## 7. UI and design system

- **Primitives**: shadcn + Base UI under `src/components/ui/` (e.g.
  `accordion.tsx`, `field.tsx`). No second generic stack.
- **Product components**: `src/components/` (landing/previews) and
  `src/components/product/` (`AuditProgress`, `AuditNotice`, `ReportToolbar`).
- **Tokens/global styles**: `src/styles/tokens.css`, `src/app/globals.css`,
  `src/styles/landing.css`; audit styles in
  `src/app/audit/audit.module.css` (+ `tweakcn-intake.css` for the brief-step
  intake styling), fixture in `fixture.module.css`, demo in
  `spec004.module.css`.
- **i18n**: `src/i18n/request.ts` + `routing.ts` (single `id` locale,
  `localePrefix: "never"`); copy in `src/messages/id.json`.
- **Design authority**: `docs/DESIGN.md`; enforced by
  `scripts/check-typography.mjs` (forbidden tokens/fonts, part of `npm run check`).

## 8. Tests and verification

- **Unit tests** (Vitest): colocated `*.test.ts` under `src/lib/` — audit
  engine (`src/lib/audit/`) and fixture journey (`src/lib/fixture-journey/`).
  Run with `npm run test:audit` or `npm run test:unit`.
- **E2E** (Playwright): `tests/e2e/` — `fixture-journey.spec.ts`,
  `landing-audit-handoff.spec.ts`, `wave1-workflow-lifecycle.spec.ts`,
  `live-audit-variance.spec.ts`, `preview-disabled.spec.ts`,
  `offline-network.spec.ts`, `forced-failure.spec.ts` (three configurations:
  `playwright.config.ts`, `.failure.ts`, `.disabled.ts`).
- **Offline guarantee**: `tests/e2e/offline-network.spec.ts` +
  `network-guard.ts` assert only loopback traffic; `shared-config.ts` forces
  dummy provider env (`offlineE2EServerEnv`).
- **Canonical verification**: `npm run verify` (aliases `validate:full`) —
  `check` (typecheck, lint, format, typography), unit tests, Next.js build,
  OpenNext Cloudflare build (`build:cf`), all three Playwright configs, with
  dummy provider settings and **no live provider calls**. `npm run validate:fast`
  is the iterate-while-working subset.
- **CI**: `.github/workflows/ci.yml` — `validate` job (check, unit, build,
  build:cf, e2e); `verify-main-origin` rejects direct pushes to `main` (deploy
  gate); `deploy` builds the OpenNext worker and deploys to Cloudflare Workers
  (wrangler) for merged-PR `main` commits only.

## 9. Important implementation seams and invariants

- **Versioned session-storage keys must be bumped, not migrated in place** when
  the persisted shape or resumable method changes (`workflow-storage.ts` v7,
  `fixture-journey/state.ts` v4; stale shapes are rejected, legacy keys purged).
- **Fixture and live paths are sealed off from each other.** The fixture
  journey must never call `/api/audit/*` (`state.test.ts` enforces it) and is
  enabled only by a server env flag (`NUAVE_FIXTURE_PREVIEW_ENABLED`, never
  client-controllable). Do not route live traffic through fixture code.
- **Provider resolution happens once at module load** (`provider.ts` for the
  audit provider; `questions-id-provider.ts` for the question provider). A
  single audit/observation run must not mix audit providers. The protected production path
  (opencodego + `low` reasoning + web search on) fails closed on
  misconfiguration (`protected-observation-provider.ts`,
  `production-observation-method.ts`).
- **Measurement policy has a single source**: `AUDIT_MEASUREMENT_MATRIX`.
  Positional/identity/composition logic must not be re-derived ad hoc in
  consumers (A1 invariant, `measurement-matrix.test.ts`). The 5/5
  compatibility projection is a derived compatibility layer slated for removal
  by Spec 007 A2/A3, not an independent policy table.
- **Locked question pack**: after the customer approves the pack,
  `locked-question-pack.ts` enforces ten prompts, canonical IDs/order, exact
  observation binding, and re-derived classification. The model-authored
  suggestion guards in `question-suggestion-guards.ts` apply before customer
  editing; they do not enforce the final customer-edit rules or identity
  prohibitions, which remain planned under Spec 007 A3. The run receives the
  reviewed pack, not a regenerated one.
- **`executionStarted` and report shape**: once execution begins, the run is
  not restartable from an arbitrary earlier state; `restorableAuditReport()`
  guards required fields on restore. Report `measures`/`counts` are derived,
  not authored by the model.
- **No payment/durable-delivery code exists**; do not assume a checkout or
  hosted report path when modifying the journey.
- **Provider credentials live only in env** (see `.env.example`); never commit
  or log key values. E2E/verify force dummy credentials so suites never depend
  on ambient secrets.

## 10. Where to look for common changes

| Change | Inspect | Tests to examine |
|---|---|---|
| Intake fields / brief / business facts | `src/app/audit/AuditStages.tsx` (`BriefStep`), `src/lib/audit/types.ts` (`BusinessBrief`), `workflow-storage.ts`, `similar-businesses.ts` | `contracts.test.ts`, `wave1-workflow-lifecycle.spec.ts` |
| Source input / extraction | `src/app/audit/SourceHero.tsx`, `src/app/api/audit/extract/route.ts`, `src/lib/audit/source-input.ts`, `website-input.ts` | `website-input.test.ts`, `landing-audit-handoff.spec.ts` |
| Question generation | `src/lib/audit/questions-id.ts`, `questions-id-live.ts`, `questions-id-provider.ts`, `src/app/api/audit/prompts/route.ts` | `questions-id.test.ts`, `question-suggestion-wave2.test.ts` |
| Measurement matrix / policies | `src/lib/audit/measurement-matrix.ts` (+ consumers `contracts.ts`, `locked-question-pack.ts`, `variance.ts`) | `measurement-matrix.test.ts`, `questions-id.test.ts` |
| Audit execution | `src/app/api/audit/run/route.ts`, `run-orchestrator.ts`, `stream.ts`, `retry.ts` | `wave2-route-contract.test.ts`, `live-audit-variance.spec.ts` |
| Report output | `src/app/audit/ReportView.tsx`, `report-pipeline.ts`, `report-recovery.ts`, `report-quality-repair.ts`, `report-prompt-contract.ts`, `src/lib/audit/contracts.ts` | `report-pipeline.test.ts`, `report-gaps.test.ts`, `report-language-id.test.ts` |
| Provider integration | `src/lib/audit/provider.ts`, `opencodego.ts`/`openai.ts`/`gemini.ts`/`groq.ts`/`openrouter.ts`, `telemetry.ts` | provider colocated tests, `scripts/eval/provider-evaluation.spec.ts` |
| Visual tokens/styles | `src/styles/tokens.css`, `globals.css`, `audit.module.css`, `components.json` | `scripts/check-typography.mjs` (part of `npm run check`) |
| Landing/copy | `src/app/page.tsx`, `src/components/`, `src/messages/id.json`, `docs/content/` | `landing-audit-handoff.spec.ts`, `preview-disabled.spec.ts` |
| Fixture simulation | `src/app/audit/fixture/`, `src/lib/fixture-journey/` | `fixture-journey.spec.ts`, `fixture-journey/state.test.ts`, `adapter.test.ts` |

## 11. Known implementation/documentation boundaries

- **Spec 007 (`specs/007-intake-airbnb-revamp/`)** is approved but marked
  *Implementing*: A1 passed (matrix + canonical 6/4 validator + R-13), A2
  (downstream consumers, current HEAD commit) is landed without a final
  verification record, and A3 (live 6/4 composition flip, instruction rewrite,
  version bump) and packages B–E (intake screens, payment boundary, scope
  invalidation, source/identity controls) are **not implemented**. The live
  question path still produces the 5/5 compatibility composition — do not
  present 6/4 as current behavior.
- **Access gate removed from code**: `README.md` records the removal of the
  former access-code gate, and no `src/proxy.ts`/middleware or
  `NUAVE_ACCESS_CODE` enforcement exists in `src/`. The README's required
  "minimal server-side rate/cost guard" is **not present in code**; the
  telemetry cost ceiling in `telemetry.ts` is the only cost control. E2E
  helpers still set `nuave_access` cookies and an `E2E_ACCESS_CODE`
  (`tests/e2e/helpers.ts`, `shared-config.ts`) — inert leftovers, not an
  enforced gate.
- **Landing copy mismatch**: `README.md` states the landing page still carries
  the previous agency-facing English copy that contradicts the current
  customer definition; treat landing copy as a known gap until the polish pass.
- **Fixture/demo code resembles production**: `/audit/fixture` and
  `/audit/spec004` look like product UI but are isolated simulations; check the
  route directory before assuming a component is live.
- **Legacy/derived layers**: the 5/5 question composition and legacy category
  tuples are a derived compatibility projection of the matrix, kept until
  Spec 007 A3 removes it — change `measurement-matrix.ts` consumers with the
  A2/A3 plan in mind.
- **Consult before changing**: `docs/INDEX.md` (authority), `docs/NOW.md`
  (current objective), `docs/JOURNEY_CONTRACT.md` (module handoffs),
  `docs/AUDIT.md` (audit method), `docs/DESIGN.md` (design authority),
  `docs/VOICE.md` (Indonesian copy contract), and the active spec before
  touching audit-core or customer-facing surfaces.
