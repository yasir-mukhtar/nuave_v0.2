# Final corrections check — Spec 007

> Copy everything between the `---` fences into a fresh agent with read-only
> access to the Nuave v0.2 repository.
>
> **This is the narrowest pass in the series and the last one.** Round 5
> verified revision 5, closed four of its six checks outright, and returned
> exactly four corrections — stating that after them it saw *no reason for
> another review round*. This confirms those four landed. Nothing else is in
> scope.

---

You are confirming that four named corrections were made correctly.

This is not a review of the specification. Rounds 2 and 3 reviewed its design.
Round 4 checked closure of their findings. Round 5 verified the resulting patch
and pre-committed to approval contingent on four corrections. Your job is to
confirm those four, check they introduced nothing new, and return a verdict.

**Already closed by rounds 4 and 5 — do not re-verify:** R-03's migration
inventory (including the positional consumers on the live request path) · R-09's
document reconciliation (including all three SETTLED `DECISION_LOG` entries) ·
R-22's SSRF control values · the `market_context` conditional rule · fifteen-plus
spot-checked citations. Round 5 found no inventory or document gaps. Re-running
those sweeps is waste; if you do it anyway, do not report clean results as
findings.

## Repository

- Root: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`
- **Read-only.** Do not commit, push, edit, or publish. Do not read
  `.secrets/`, `.env*`, `node_modules/`, `archive/`, or `Archive Candidates/`.
- Safe to run: `git` read commands, `grep`, `rg`, `npm run check`,
  `npm run test:unit`. Do **not** run `npm run test:live-provider` or anything
  under `scripts/eval` — those make paid provider calls.
- Make no paid model calls of your own.
- Read the **working tree**. Revision 5 is commit `a612f07`; the four
  corrections may be uncommitted on top of it — `git diff` shows them if so.

## What you are reviewing

- `specs/007-intake-airbnb-revamp/SPEC.md` — **R-10** and **R-03** only
- `specs/007-intake-airbnb-revamp/PLANNER-HANDOFF.md` — §1 authority rule, §3
  locked, §4 considered-and-rejected

Supporting files the corrections make claims about:
`src/lib/audit/questions-id.ts` · `src/lib/audit/question-suggestion-guards.ts` ·
`src/lib/audit/types.ts` · `src/lib/fixture-journey/adapter.ts` · `tsconfig.json`
· `package.json`

## The four corrections

**1 · The R-10 seam — the only substantive one.**

Round 5 found that R-10 said semantic purpose drift merely warns, while locked
decision 6 said users "may not change a slot's measurement purpose." Two claims,
one contract.

The resolution separates the **permission rule** (what the product allows) from
**V1's enforcement strength** (what it can detect), enforces the rule completely
where mechanically decidable, enforces it by fixed slot frame plus a warning
where it is not, and records the residue as accepted — explicitly on the R-20
precedent, where the spec already declines to claim a payment boundary it does
not have.

Assess three things:

- (a) Is the contradiction actually gone? Read R-10 and locked decision 6
  together. Can a planner still read two enforcement models out of them?
- (b) Is the R-20 analogy sound, or is it doing rhetorical work it has not
  earned? R-20 concerns an attacker bypassing a client-side flag; this concerns
  a legitimate user's wording drifting. Decide whether that difference matters.
- (c) **Was this a planner's call to make?** The resolution defines what the
  product guarantees, not merely how it is built. Under the §1 authority rule,
  founder decisions define WHAT the product must do. Say plainly whether this
  should have been returned to the founder as an open product decision instead
  of settled in the spec. The planner flagged it as founder-overrulable; your
  job is to say whether flagging it was sufficient.

Answering (c) "should have been returned" is a legitimate outcome. It is not
reopening a locked decision — it is a question about who owns this one.

**2 · The slot-9 comparison predicate.**

Round 5 found hard-block rule 3 requiring a "comparison relation" with no
predicate defined, recreating the invent-your-own-validator problem. R-10 now
defines a closed marker list carried in the matrix.

Check: is it genuinely deterministic — could two implementers still build
different things from it? Is it in the matrix as data rather than a heuristic in
the validator, consistent with R-02? And assess the list itself as Indonesian:

- Does the `banding` stem over-match or under-match real comparison phrasing?
- Is bare `vs` safe under word-boundary matching, or a substring hazard?
- Do the comparative `lebih` forms over-trigger on non-comparison questions
  that merely use `lebih`?
- Would a natural Indonesian comparison question a customer might write be
  **rejected** by this list? A predicate too tight to pass legitimate edits is
  the failure mode R-10 exists to avoid — it hard-blocks, so a false negative
  traps the user.

Compare against the existing Indonesian vocabulary in
`question-suggestion-guards.ts` and the fallback templates near
`questions-id.ts:473-478`.

**3 · The `tsconfig` claim.** R-03 said the config "excludes only `node_modules`
and `archive`." It excludes three paths. Verify the corrected sentence is now
true and that its conclusion — the listed scripts are typechecked and
`npm run check` fails until migrated — still holds.

**4 · The `fixture-journey/adapter.ts` citation.** R-03 cited `:34-38` for
"category role/input mapping." Verify the corrected row points at the actual
`roleOf`/`inputsUsedOf` mappings and that any line numbers it now gives are
right.

## Also check

- Did correction 1 introduce a contradiction anywhere else — R-06's agreement
  tests, the acceptance criteria, or the Locked decisions list?
- Is the Locked decisions list entry for decision 6 still the founder's
  decision, with only a pointer added, or was its substance altered? Altering it
  would be out of bounds.
- Was a "response to review" section appended? There must not be one.

## Deliverable

Keep it short. This should be a page, not a report.

1. **Verdict:** approved for implementation planning · not approved, with the
   specific reason.
2. **The four corrections** — each correct / incorrect / incomplete, with the
   evidence you checked.
3. **Ownership question** — your answer to 1(c), stated plainly.
4. **New contradictions**, if the corrections introduced any.
5. Anything you would change, smallest set only.

If the four corrections are correct and introduced nothing new, say so in a
paragraph and stop. Round 5 already pre-approved on that condition; a clean
result here means the spec moves to implementation planning, and the correct
output is a short confirmation. Do not manufacture findings, do not expand
scope, and do not re-open design questions rounds 2 through 5 settled.

---
