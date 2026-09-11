# Spec 008 — verification and evidence index

> Status: adoption recorded; no implementation-gate evidence exists yet.
> Index owner:
> [`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`](./NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md)
> §9–§10 (execution ledger and acceptance evidence index).

This file is the single evidence index required by R5 §9. It records adoption
provenance now and will link concrete evidence per gate as work lands.

## Adoption provenance

| Artifact | Role | Source SHA-256 |
| --- | --- | --- |
| `NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md` | Sole current implementation/execution authority for Spec 008 | `6fa504d8e7e9e8b0985cebbb77556fd51b56c3eca9fc36a7a320ad8dd3338f44` |
| `NUAVE_SPEC_008_ADVERSARIAL_REVIEW_5.md` | Final adversarial review of R5; verdict "proceed to G0–G2P, no broad R6 rewrite" | `6fecf01f95bf824957e2e723f2259063c188145a762a5bbcacaa3fd51186f62c` |

- R5 was committed byte-identical to the supplied source (SHA-256 verified at
  adoption, 2026-09-11). Later ledger edits live in R5's own §9 record.
- Adversarial Review 5 attach findings: F-01 → G1, F-02 → G3 (both are
  clarifications inside already-required work, not new gates).
- Superseded pre-R5 execution plan: preserved at
  [`Archive Candidates/superseded-plans/SPEC_008_EXECUTION_PLAN_PRE_R5.md`](../../Archive%20Candidates/superseded-plans/SPEC_008_EXECUTION_PLAN_PRE_R5.md);
  the tombstone at `./EXECUTION_PLAN.md` redirects here.
- Ordinary historical pack preserved for baseline/replay evidence:
  `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts`
  (`NVA-FIKTIF-001.questions.v1`, fictional/privacy-safe).

## Gate evidence

None yet. G0 is in progress — R5 §9's ledger carries the reconciled baseline
and the remaining unverified operational facts. Do not record gate completion
here without a landed commit plus the evidence R5's gate table requires.

## Verification record

- Result: Pending (spec In review; implementation not started)
- Date: Pending
- Verified commit or working-tree state: Pending
