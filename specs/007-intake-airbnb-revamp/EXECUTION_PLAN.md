# Execution plan — Spec 007, the runnable V1 journey

> Status: **Active** — companion to [`SPEC.md`](./SPEC.md) in this folder, which
> is **Approved** (founder-approved 2026-08-30).
> Created: 2026-08-30
> Purpose: split the approved spec into packages that can each be implemented,
> verified, and landed on their own, and give an orchestrating agent everything
> it needs to run them without re-deciding anything.

`SPEC.md` says what must be true. This plan says in what order, by whom, and how
each step is proven. Where they disagree, **the spec wins** and this file is
wrong.

## How to use this file

You are reading the entry point. An orchestrator needs exactly three documents:

1. [`AGENTS.md`](../../AGENTS.md) — repository rules that bind every agent here.
2. [`SPEC.md`](./SPEC.md) — the contract.
3. **This file** — sequence, gates, and status.

**Do not read `PLANNER-HANDOFF.md`.** It is addressed to the planner role and
carries eight rounds of review history, superseded arguments, and the
considered-and-rejected list. An implementer or orchestrator reading it will
re-litigate settled decisions instead of building. Its one broadly useful part —
which of the spec's citations were verified directly and which were only
spot-checked — is reproduced where it matters, in each worker prompt.

## Orchestrator brief

The orchestrating agent sequences packages, writes and dispatches worker
prompts, reads verification results, and keeps this file's status ledger
current. It does not implement.

**It may decide, alone:** which package runs next among those whose
dependencies are met; how to split or narrow a package that proves too large;
when to send a package back to a worker with a bounded fix list; what a worker
prompt says, within the scope this plan sets.

**It must escalate to the founder, and stop:** any product decision, including
anything that would add a row to `DECISION_LOG.md`; any change to `SPEC.md`;
any conflict between the spec and what the code makes possible; marking the spec
**Verified**; and any request to merge, deploy, or spend money on a provider
call. `PLANNER-HANDOFF.md`'s authority rule governs and is worth stating once
here, because it settles most disputes:

> Founder/product decisions define WHAT the product must do and what is in
> scope. Repository/code findings define HOW it must be implemented safely and
> correctly, as long as they do not override the founder decisions.

**It must never:** approve its own worker's output on the worker's say-so;
accept "tests pass" as evidence without a CI result; or expand a package to make
a check pass.

## Operating rules

1. **One spec governs.** Each package implements only its own requirements. A
   package that uncovers a missing product decision stops and returns the
   question; it never patches the spec from code.
2. **Every package lands green.** No package may hand over failing checks,
   skipped tests, or a weakened assertion. If an existing test pins behavior a
   package supersedes, it is rewritten to derive from the new authority — not
   deleted, and not marked skip.
3. **Order is not a preference in Blocker A.** R-04 fixes it and explains the
   failure mode: flip the composition before folding the guards and `slot <= 5`
   and `index === 5` stay standing, which silently stops checking identity
   leakage on unnamed slot 6 while every existing test still passes.
4. **The measurement core is single-threaded.** A1, A2, and A3 rewrite the same
   files — `contracts.ts`, `questions-id.ts`, `question-suggestion-guards.ts`.
   Never run two of them at once. Parallel workers there produce merge conflicts
   no one can adjudicate.
5. **Track D is parallel from day one.** Safe source handling is new server code
   that touches nothing in the measurement core.
6. **Scope is a fence, not a suggestion.** A worker that finds a real problem
   outside its fence reports it; the orchestrator decides which package owns it.
7. **No paid calls without founder authorization.** `npm run test:live-provider`
   and everything under `scripts/eval` spend real money and are never part of a
   package gate.

## The gate

Every package is proven the same way, and the orchestrator reads the result
rather than a claim about it.

**The worker** branches, implements, runs `npm run check` and `npm run test:unit`
locally, pushes the branch, and opens a pull request.

**CI decides.** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs
on every pull request: `npm run check`, `npm run test:unit`, `npm run build`, and
the Playwright end-to-end suites. A red check is not complete work, and CI is not
a debugger — do not push a known-failing change to see what happens.

**What CI does not cover**, and therefore what a package's exit gate must name
explicitly if it needs it: live provider behavior (paid, excluded by design),
anything requiring a deployed Worker, and human judgment on customer-facing copy
and layout. Blocker E's journey work needs the last of these; the founder is the
reviewer.

**Branching.** Merge the approved spec documents to `main` first, through a pull
request, then branch every package from `main` and target `main`. Each package
is green and shippable on its own — that is the point of R-04's order — so
short-lived branches with CI on each one beat a long-lived integration branch
that merges in a single risky step. Direct pushes to `main` are prohibited by
convention (`AGENTS.md`); the `verify-main-origin` gate exists because branch
protection is unavailable on this plan.

## Package overview

| Package | Scope | Track | Depends on | Blocks |
|---|---|---|---|---|
| **A1** Measurement authority | R-01, R-02, R-06, R-04 steps 1–2, R-13's projection. Composition stays 5/5 | A | Nothing | A2 |
| **A2** Downstream consumers | R-03's report, UI, fixture, and script sections; R-08 | A | A1 | A3 |
| **A3** Composition flip | R-04 step 4: 6/4, R-05's ten templates, R-07 and the instruction bump, R-10's edit enforcement, R-06 rule 6 case (b) | A | A2 | B, A4 |
| **A4** Document reconciliation | R-09 — the tracked documents and `SKILL.md` | A | A3 | Nothing |
| **D1** Safe source handling | R-21, R-22, R-23 | D | Nothing | C |
| **B1** Workflow and data authority | R-11 through R-18 | B | A3 | C |
| **C1** Payment boundary | R-19, R-20 | B | B1, D1 | E |
| **E1** Journey and acceptance | R-24 through R-28, the end-to-end scenario | B | C1 | — |

---

## A1 — Measurement authority

**Objective.** The canonical matrix exists and is the only measurement authority
in the audit core, with agreement tests that derive from it. The pack is still
five unnamed plus five named.

**Requirements.** R-01, R-02, R-06 (rules 1–5; rule 6 cases a, c, d), R-04 steps
1 and 2, and R-13's comparison-target projection.

**Files.** `src/lib/audit/` only — `contracts.ts`, `questions-id.ts`,
`question-suggestion-guards.ts`, `questions-id-live.ts`,
`locked-question-pack.ts`, `questions.ts`, `types.ts`, and their tests. Plus
`VERIFICATION.md` in this folder, created from the template.

**Exit gate.** `npm run check` and `npm run test:unit` green in CI; composition
still 5/5; no positional measurement-policy logic left in the core; a name-only
comparison target survives `minimizeIndonesianBrief`; `questions.ts` is either
migrated or deleted with its test, with the choice stated.

**Worker prompt.** [`spec-007-blocker-a-matrix-2026-08-30.md`](../../docs/reviews/implementation/spec-007-blocker-a-matrix-2026-08-30.md)

---

## A2 — Downstream consumers

**Objective.** Every remaining consumer of the legacy five-category model reads
from the matrix, and report semantics live in the measurement definition.

**Requirements.** R-03's *Report and interpretation*, *UI and customer-facing*,
*Scripts*, and *Fixtures and tests* sections; R-08.

**Files.** `report-prompt-contract.ts`, `ReportView.tsx`, `AuditStages.tsx`,
`ExampleReportPreview.tsx`, `ReportPagePreview.tsx`, `QuestionsPreview.tsx`,
`fixture-journey/adapter.ts`, `fixtures/report-golden.ts`, and `scripts/`.

**The known blast radius.** `fixtures/report-golden.ts` builds its prompts from
`PROMPT_MATRIX` by index and is imported by nine unit suites and two E2E specs.
Three suites pin the superseded policy as an assertion and must be rewritten
rather than re-run — R-03 names all three. `scripts/` is typechecked by
`npm run check`, so it is not optional.

**Exit gate.** CI green including E2E; report assessment, labels, and
denominators derive from the matrix with no observation falling through
per-category rules; composition still 5/5.

---

## A3 — Composition flip

**Objective.** The pack becomes six unnamed plus four named, and every guard,
template, and instruction agrees with the matrix slot by slot.

**Requirements.** R-04 step 4, R-05's ten deterministic templates, R-07 and the
`INDONESIAN_QUESTION_INSTRUCTION_VERSION` bump with its consumer, R-10's
enforcement on save, and R-06 rule 6 case (b) — the one deferred from A1.

**Why last.** Every guard is already matrix-derived by this point, so flipping
the counts changes data rather than logic. R-05 is genuinely new writing: no
current template carries a target-bearing comparison, and today's slot 6 names
both parties where R-01 forbids both.

**Exit gate.** CI green; a six-unnamed-plus-three-named pack is rejected as
invalid 6/4; slot 9 rejects a question that drops the comparison relation;
`/5` denominators are gone from the customer-facing surfaces.

---

## A4 — Document reconciliation

**Objective.** The tracked documents state the 6/4 model, not the 5/5 one.

**Requirements.** R-09. Docs only; no code. Parallel-safe and blocks nothing,
but it runs *after* A3 so the documents describe what shipped.

**Exit gate.** Every document R-09 lists is reconciled; `AUDIT.md` is amended,
since a spec cannot override it on measurement method; `SKILL.md` is rewritten
against R-01 or explicitly retired.

---

## D1 — Safe source handling

**Objective.** `GET /api/audit/identity` fetches a public source safely and
returns identity only.

**Requirements.** R-21, R-22, R-23.

**Independence.** New server code plus a `ratelimits` block in
`wrangler.jsonc`. It touches no measurement file, so it runs alongside the whole
A track from day one.

**Exit gate.** Each of R-22's controls has a test at its stated value — the
DNS-answers row alone requires four; R-23's three limiters are configured, and
the hostname limiter is consumed inside the fetch primitive, per destination, not
at route ingress. Two items stay open by design and are **not** gates: R-21's
live Instagram confirmation, and the throwaway `fetch()`-to-private-IP check in
§7 of [`R-22-SSRF-FEASIBILITY.md`](./R-22-SSRF-FEASIBILITY.md). Both are
operational follow-ups; the second needs founder authorization to deploy.

---

## B1 — Workflow and data authority

**Objective.** Every field in the brief has an owner, a screen, a requiredness
decision, and an invalidation rule, and the intake is a populated draft.

**Requirements.** R-11 through R-18.

**Exit gate.** Every field in R-12's table is owned and reachable; the
comparison target is created by R-13's derivation step, including the
category-level fallback; scope changes invalidate per R-14 and leave no stale
branch-specific data; validation routes to the owning screen for every field; a
corrected source runs exactly one replacement extraction.

---

## C1 — Payment boundary

**Objective.** No personalized extraction occurs in the supported client journey
before simulated payment success.

**Requirements.** R-19, R-20.

**Depends on D1** — the rewire points `LandingAuditHero` at the R-21 identity
endpoint, which must exist first. Two distinct mechanisms carry the handoff and
both need updating; R-19 names them.

**Exit gate.** Routing unit tests, a single-call-site guarantee, and an E2E
network assertion. Each is client-spoofable by design: that is R-20, and this
package must not be described as building a security boundary.

---

## E1 — Journey and acceptance

**Objective.** The end-to-end scenario passes from the real landing entry.

**Requirements.** R-24 through R-28 and the spec's fourteen-point acceptance
list.

**Two gates, not one.** R-28 separates pre-handoff verification of `/audit/v2`
in isolation — which a disconnected route can pass — from final acceptance after
the landing handoff is connected. Do not report the first as the second. The
Playwright specs that assume landing-then-extraction behavior are updated
deliberately at the handoff, and `wave1-workflow-lifecycle` is in no configured
`testMatch` and must be added to one before it counts.

**Exit gate.** The founder runs the journey with a real business source. This is
the one gate CI cannot give you.

---

## Dependency map

```text
A1 Measurement authority
 └─ A2 Downstream consumers
     └─ A3 Composition flip
         ├─ A4 Documents ............ docs only, blocks nothing
         └─ B1 Workflow authority
             └─ C1 Payment boundary
                 └─ E1 Journey and acceptance
D1 Safe source handling ............. parallel from day one; C1 needs it
```

Two things run at once, and only two: the A track and D1. Everything else is
serial because it rewrites files the package before it just rewrote.

## Status ledger

The orchestrator updates this table when a package's pull request merges. It is
the durable record — a new session reads it instead of re-deriving state from
`git log`.

| Package | Status | PR | Landed | Notes |
|---|---|---|---|---|
| A1 | Not started | — | — | Worker prompt ready |
| A2 | Not started | — | — | |
| A3 | Not started | — | — | |
| A4 | Not started | — | — | |
| D1 | Not started | — | — | Startable now |
| B1 | Not started | — | — | |
| C1 | Not started | — | — | |
| E1 | Not started | — | — | |

## Worker prompt status

- **A1** — written: [`spec-007-blocker-a-matrix-2026-08-30.md`](../../docs/reviews/implementation/spec-007-blocker-a-matrix-2026-08-30.md).
- **A2, A3, A4, D1, B1, C1, E1** — not written. Each is written from the
  approved spec at the start of its package, following
  [`docs/templates/WORKER_PROMPT.md`](../../docs/templates/WORKER_PROMPT.md) and
  `docs/WORKFLOW.md`'s handoff standard. Write one at a time, not all now: a
  prompt written three packages early describes a tree that no longer exists.

## When a package fails

A failing package returns a bounded fix list to the same worker and retries. It
does not block a package on another track. If the same package fails twice for
different reasons, stop and escalate — that is a sign the package is too large
or the spec is unclear about it, and both are the founder's to resolve.
