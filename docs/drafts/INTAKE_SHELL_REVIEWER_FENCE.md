# Intake shell reviewer fence — standing context

> For the external design critic of the new post-payment intake journey.
> Give this document to the reviewing agent before each critique batch.
> Written 2026-09-04 by the intake rebuild orchestrator.

## Your role

You review and refine **only the post-payment intake shell**: reading/brand
confirmation → scope → target → category → offerings → customers → service /
market → comparators → optional fact → identifiers → intake review → question
review → the `Mulai audit` handoff.

Your `NUAVE_NEW_INTAKE_JOURNEY_CONTRACT.md` is received as **Gate 1 review
input**. It is a *proposed* contract. Do not implement, do not edit repository
files; critique and contract text only.

## In scope

- Screens, copy, interaction grammar, navigation, dependency/validation
  semantics, and Review behavior **inside** the intake shell.
- The **interface definitions** of the two boundary handoffs (entry from
  payment; exit to audit) — not the systems behind them.

## Out of scope — owned by the approved rebuild plan; do not redesign

1. **Pre-payment surfaces**: landing, URL entry, source scan, business
   preview, payment flow. Existing production code, deliberately preserved.
2. **Payment/entitlement logic**, order state, abandonment/refund policy.
3. **Source retrieval, preparation, extraction** internals (keep-list module).
4. **Question generation** provider, prompts, 6/4 composition, measurement
   matrix (keep-list module). The shell only freezes a draft version in and
   receives a ten-slot pack out.
5. **Audit runner, provider boundary, reporting, variance** (keep-list modules).
6. **Storage keys/versioning** (legacy `nuave.audit.workflow.v9`; planned
   `intake.v1` + `workflow.v10`) and one-writer rules.
7. **Legacy intake** (`AuditWorkflow`, `INTAKE_SCREENS`): frozen evidence.
   Never propose forward-porting from it.
8. **CI/deploy/preview infrastructure** and the funnel-event allowlist.

## Governing documents (read before further critique)

- `docs/drafts/NUAVE_AIRBNB_INTAKE_CLEAN_REBUILD_PLAN.md` (plan, Rev 3)
- `docs/drafts/NUAVE_AIRBNB_INTAKE_PHASE0_CHECKPOINT.md` (PROCEED verdict, keep-list §4)
- `docs/drafts/INTAKE_EXPERIENCE_CONTRACT.md`, `INTAKE_DATA_CONTRACT.md`,
  `INTAKE_FIXTURES_AND_BUDGETS.md` (Gate 0 package, founder-approved 2026-09-03)

Authority order: safety/payment/privacy → newest founder decision → locked V1
product contract → approved prototype → **approved Gate 0 contracts** → your
proposed contract. Any delta against an approved Gate 0 contract is a founder
decision, never a silent adoption.

## Vocabulary mapping (your IDs ↔ implemented s-* IDs)

| Yours | Implemented |
|---|---|
| X01_READING / X01_READING_ERROR | s-crawl |
| I01 / I02 | s-brand / s-brand-fix |
| I03 / I04 / I05 | s-scope / s-branch / s-product |
| I06 / I07 / I08 | s-category / s-offerings / s-customers |
| I10 / I11 / I12 | s-market / s-competitors / s-facts |
| I14 / Q01 | s-review / s-questions |
| X02 | (question generation, unwired in skeleton) |
| I09 / I13 | **no counterpart** — proposals pending founder approval |

The implementation, tests, fixtures, and Gate 0 contracts all use the `s-*`
IDs. Renaming is a founder-level convenience decision, not yours to apply.

## Known skeleton gaps — accepted, scheduled; do not re-litigate

Stub-permissive validation · query-prop-driven routing · component-local
screen state · Review reading fixture data · question screen not wired to
generation. These are Phase 5/6 work in the approved plan. Your diagnosis of
them in PR #46 is confirmed and welcome as validation, not as new findings.

## Deliverables from you

Contract revisions, critique, acceptance scenarios. Flag every place your
proposal amends an approved Gate 0 contract as a **founder decision** with a
recommended option.
