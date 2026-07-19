# Nuave v2 documentation

> Status: **Canonical routing index**
> Updated: 2026-07-19

This directory is the source of truth for Nuave v2: the one-time AI visibility
audit. It supersedes `docs/V2_GRAND_DESIGN.md` and other earlier v2 strategy
briefs. Documentation for the existing subscription SaaS describes the legacy
product only and must not silently govern v2.

## Required reading

Read documents according to the work being performed. Do not load every file
when a narrower source is sufficient.

| Work | Governing document |
|---|---|
| Strategy, customer, positioning, principles, non-goals | [`FOUNDATION.md`](./FOUNDATION.md) |
| What the first sellable product includes | [`MVP_SPEC.md`](./MVP_SPEC.md) |
| Audit methodology, prompts, evidence, report, re-audit | [`MEASUREMENT_SPEC.md`](./MEASUREMENT_SPEC.md) |
| Ads, organic content, landing page, checkout, aftersales | [`FUNNEL_AND_LIFECYCLE.md`](./FUNNEL_AND_LIFECYCLE.md) |
| QA, delivery, support, failures, refunds | [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) |
| Stack, data model, state machine, jobs, security | [`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md) |
| Validation gates, metrics, experiments, scale rules | [`EXPERIMENTS_AND_GATES.md`](./EXPERIMENTS_AND_GATES.md) |
| Clinic claims, privacy, consent, retention | [`COMPLIANCE_AND_DATA.md`](./COMPLIANCE_AND_DATA.md) |
| Dated decisions and revisit triggers | [`DECISION_LOG.md`](./DECISION_LOG.md) |
| Artifact phases, fidelity, session protocol, acceptance | [`ARTIFACT_WORKFLOW.md`](./ARTIFACT_WORKFLOW.md) |
| Current artifact phase, progress, blockers, next task | [`ARTIFACT_STATUS.md`](./ARTIFACT_STATUS.md) |

## Authority order

When documents conflict:

1. The newest founder-approved entry in `DECISION_LOG.md` wins.
2. `FOUNDATION.md` governs strategy and principles.
3. The relevant specialist document governs implementation details.
4. An explicit `[OPEN]` remains open; do not infer a decision.
5. Legacy Nuave documentation is evidence and reusable context, not v2 policy.

## Decision labels

- **[SETTLED]**: proceed unless the revisit trigger is met.
- **[HYPOTHESIS]**: plausible but not validated.
- **[EXPERIMENT]**: a bounded test with a decision outcome.
- **[OPEN]**: must be resolved before the dependent work proceeds.
- **[NON-GOAL]**: intentionally excluded from the current product.
- **[SUPERSEDED]**: retained only for historical traceability.

## Rules for future AI sessions

1. Name the governing document and labels behind material recommendations.
2. Never turn a hypothesis, threshold, estimate, or open question into a fact.
3. Preserve the distinction between provider observation, Nuave inference, and
   customer action.
4. Prefer a truthful end-to-end customer journey over feature breadth.
5. Do not inherit organization, workspace, subscription, or dashboard scope
   from the legacy SaaS.
6. Record material strategy or scope changes in `DECISION_LOG.md`.
7. Put experiments and evidence in `EXPERIMENTS_AND_GATES.md`; do not rewrite
   history to make an experiment look pre-decided.
8. For artifact work, read `ARTIFACT_STATUS.md` before acting and update it in
   the same change as the artifact; do not use chat history as the tracker.

## Maintenance

Keep the foundation concise and stable. Put operational detail in the specialist
files. When a decision changes, update the decision log first, then reconcile the
affected documents in the same change.
