# Legacy intake inventory (Phase 1, plan §5 step 3)

> Baseline: `origin/main` @ `e531ff4`; rebuild branch `feat/airbnb-intake-rebuild`; tag `intake-rebuild-baseline`.
> Recovery branch `origin/claude/nuave-intake-recovery-plan-tlv905` retained as evidence, NOT merged (doc-only: one `INTAKE_RECOVERY_PLAN.md`, 0 code).

## Renderers (frozen, legacy journey only)

- `src/app/audit/v2/AuditV2Journey.tsx:29-56` — pre/post-payment boundary; post-payment renders `<AuditWorkflow/>` (`:47`).
- `src/app/audit/AuditWorkflow.tsx` (1,548 lines) — owns restore, extraction, brief editing, intake navigation, prompts, audit, report, variance.
- `src/app/audit/AuditStages.tsx` — `B1BriefStep` (`:725-774` signature) renders the 12 intake screens; `QuestionsStep`, `AuditRunStep`, `ReportView` stay downstream.
- `src/app/audit/SourceHero.tsx` (`:17-47` props, `:59-95` consume-once handoff) — source/scan step.
- `src/components/AuditPrePaymentJourney.tsx` — pre-payment surfaces (identity, order, checkout; `:604-642` identity via `/api/audit/identity`, `:669-680` handoff write, `:614-616` key delete).

## Intake screens + authority

- `INTAKE_SCREENS` (12): brand-confirm, source-correction, scope, branch, product, category, market, customer-reasons, offerings, comparison-target, facts, review — `src/lib/audit/workflow-authority.ts:15-28` (schema v9, `:13`).
- `FIELD_OWNERSHIP` `:74-207`; mutations `createWorkflowMeta`/`applyScopeSelection`/`applyBriefFieldChange`/`acceptComparisonTarget`/`confirmIdentity`/`mergeExtractionIntoBrief`; strict resume parser `:860-1028`.

## Flags (actual)

- `NUAVE_FIXTURE_PREVIEW_ENABLED` only (`src/lib/fixture-journey/config.ts:12`). No `PREVIEW_INTAKE_SURFACE` / `intake-preview` in `src/` — per-screen flag was a recovery-plan proposal only, never implemented. No whole-journey flag yet (production stays legacy by default; new preview is unlinked).
- New preview gate: `NUAVE_NEW_INTAKE_PREVIEW_ENABLED` (defaults off) — guards `/audit/new-intake` only.

## Styles / routes

- Styles: `src/app/audit/audit.module.css`, `SourceHero.module.css`, `SourceHeroBackdrop.module.css`, `SimilarBusinessesEditor.module.css`, `tweakcn-intake.css`. New journey must not import these.
- Routes: `/audit` (AuditEntryShell → AuditWorkflow), `/audit/v2` (journey), `/audit/fixture`, `/audit/spec004` (demos, untouched). New (unlinked, noindex): `/audit/new-intake`.

## State keys

- `nuave.audit.workflow.v9` (sole writer `AuditWorkflow`), `nuave.audit.session.v1`, `nuave.audit.variance.v1` + `.failure.v1`, `nuave:audit-source-handoff-v1` (consume-once). No v10/intake keys before rebuild.

## Integration dependencies (intake → downstream)

- `GET /api/audit/identity` (pre-payment) · `GET /api/audit/extract` (budget + payment gate) · `POST /api/audit/prompts` · `/api/audit/run` (stream) · `/api/audit/report` (+ variance chain) · `/api/audit/variance`. Routes: `src/app/api/audit/{extract,identity,prompts,report,run,variance}/route.ts`.

## Test files

- Quarantined legacy-only (`playwright.config.legacy-intake.ts`, 15 tests): `tests/e2e/b1-workflow-authority.spec.ts` (10, `/audit`), `tests/e2e/e1-postpayment-journey.spec.ts` (5, `/audit/v2`). Config-only quarantine — no spec edited/deleted.
- Main suite keeps (ownership clear): `live-audit-variance`, `wave1-workflow-lifecycle` (engine), `landing-audit-handoff` (payment/security), fixture/preview/offline/forced-failure specs.
- Left in main as ambiguous (orchestrator decision 2026-09-03): `tests/e2e/e1-runnable-journey.spec.ts` pins `/audit/v2` identity/order/checkout widgets, but those pre-payment surfaces are out of rebuild scope — stays green in main suite until a later phase proves otherwise.

## New isolated module (not legacy)

- `src/lib/intake/` (`screens.ts` 14 s-* screens, `IntakeJourney.tsx` shell, `IntakeFixturePlaceholder.tsx`, `intake-isolation.guard.test.ts` 5 tests, `README.md`) + `src/app/audit/new-intake/page.tsx`. Zero edits to existing files; guard bans legacy imports and per-screen flags.

## Freeze statement

Legacy presentation is frozen until cutover or abandonment: no feature or visual work is forward-ported into the new journey. An urgent production safety fix requires a separately reviewed minimal patch; copying its UI pattern into the new journey is never automatic.
