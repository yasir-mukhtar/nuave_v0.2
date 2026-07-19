# Nuave v2 artifact status

> Status: **Live tracker — update after every artifact session**
> Workflow: [`ARTIFACT_WORKFLOW.md`](./ARTIFACT_WORKFLOW.md)
> Updated: 2026-07-19

This file tells a fresh AI session where artifact work currently stands and
what to do next. It records progress, not strategy authority.

## Current state

- **Current phase:** P1 — Journey contract
- **Phase status:** READY
- **Last completed phase:** P0 — Workflow setup
- **Next exact task:** Ask the founder to select one provisional artifact city
  and one working message family; record both choices here before drafting P1.
- **Phase owner:** [OPEN]
- **Review owner:** Founder

## Working decisions for artifacts

| Item | Current value | Status |
|---|---|---|
| Initial vertical | Single-location dental clinic | SETTLED |
| Artifact city | Choose one of Jakarta, Bandung, or Surabaya | OPEN — required before P1 exits |
| First message family | Competitive discovery, accuracy, or controllability | OPEN — choose one working hypothesis in P1 |
| Public offer | Founding Cohort Full Audit — Rp149,000 | SETTLED |
| Pre-payment personalized audit | Not allowed | SETTLED |
| Pre-payment proof | Dated market observation, permissioned sample, or clearly illustrative material | SETTLED |
| Product fixture | One internally consistent fictional or permissioned dental clinic audit | NOT_STARTED |
| Report scoring | No composite score for the first ten reports | SETTLED |
| Delivery format | Reviewed mobile web report plus same-version PDF | SETTLED |

## Phase tracker

Status vocabulary: `NOT_STARTED`, `READY`, `IN_PROGRESS`, `REVIEW`, `BLOCKED`,
or `COMPLETE`.

| Phase | Status | Dependencies | Completion evidence |
|---|---|---|---|
| P0 — Workflow setup | COMPLETE | None | Workflow, tracker, artifact index, and brief template committed |
| P1 — Journey contract | READY | Founder selects or approves a provisional artifact city and working message family before phase exit | Not yet available |
| P2 — Acquisition and landing | NOT_STARTED | P1 complete | Not yet available |
| P3 — Eligibility and purchase | NOT_STARTED | P1 complete; relevant P2 promise stable | Not yet available |
| P4 — Intake and fulfillment | NOT_STARTED | P3 purchase contract stable | Not yet available |
| P5 — Product and action | NOT_STARTED | P1 fixture and measurement-shaped evidence stable | Not yet available |
| P6 — Aftersales | NOT_STARTED | P5 action and report states stable | Not yet available |
| P7 — Integration and validation | NOT_STARTED | P2–P6 complete at L1 or better | Not yet available |

## P1 checklist

- [ ] Select one provisional artifact city; record whether it is only a design
  hypothesis or also the intended launch-city decision.
- [ ] Select one primary acquisition message family as a working hypothesis.
- [ ] Create `artifacts/JOURNEY_MAP.md` covering the complete golden path and
  principal recovery branches.
- [ ] Create `artifacts/MESSAGE_CONTRACT.md` defining audience, problem, promise,
  proof, offer, CTA, prohibited transformations, and downstream obligation.
- [ ] Create `artifacts/fixtures/dental-clinic-v0.json` with one consistent
  fictional or permissioned clinic, customer, audit scope, observations,
  findings, recommendations, states, and consent choices.
- [ ] Create `artifacts/TRACEABILITY_MATRIX.md` linking acquisition claims to
  proof, product sections, operational states, and journey events.
- [ ] Review the four outputs together for identity, terminology, message, offer,
  and evidence consistency.
- [ ] Update the artifact manifest and attach the reviewed files as P1 completion
  evidence.

## P1 exit gate

P1 is complete only when a fresh reviewer can follow one customer from first
touch through re-audit without encountering a changed clinic identity, city,
promise, offer, evidence definition, or action vocabulary.

## Artifact manifest

| Artifact | Phase | Fidelity | Status | Last review | Notes |
|---|---|---|---|---|---|
| [`artifacts/README.md`](../../artifacts/README.md) | P0 | Instruction | COMPLETE | 2026-07-19 | Directory rules and planned structure |
| [`artifacts/templates/ARTIFACT_BRIEF.md`](../../artifacts/templates/ARTIFACT_BRIEF.md) | P0 | Template | COMPLETE | 2026-07-19 | Required context capsule for touchpoints |
| `artifacts/JOURNEY_MAP.md` | P1 | L0 | NOT_STARTED | — | Next phase output |
| `artifacts/MESSAGE_CONTRACT.md` | P1 | L0 | NOT_STARTED | — | Next phase output |
| `artifacts/fixtures/dental-clinic-v0.json` | P1 | Fixture | NOT_STARTED | — | Shared source data |
| `artifacts/TRACEABILITY_MATRIX.md` | P1 | L0 | NOT_STARTED | — | Claim-to-evidence and state mapping |

## Progress log

| Date | Phase | Change | Decision or evidence | Next task |
|---|---|---|---|---|
| 2026-07-19 | P0 | Established the artifact workflow, tracker, directory instruction, and artifact brief | Founder requested a durable phased workflow for future AI sessions | Begin P1 journey contract |

## Tracker update rule

At the end of every artifact session:

1. update current phase, phase status, and next exact task;
2. update the relevant checklist and manifest rows;
3. add one concise progress-log row;
4. link completion evidence rather than describing it only in prose;
5. record blockers and their required decision; and
6. ensure at most one phase is `IN_PROGRESS` or `REVIEW` at a time.

Do not mark a phase `COMPLETE` because a draft exists. Apply the exit gate in
[`ARTIFACT_WORKFLOW.md`](./ARTIFACT_WORKFLOW.md).
