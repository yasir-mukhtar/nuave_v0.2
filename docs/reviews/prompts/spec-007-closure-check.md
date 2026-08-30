# Closure check — Spec 007 revision 4

> Copy everything between the `---` fences into a fresh agent with read-only
> access to the Nuave v0.2 repository.
>
> **This is not another adversarial review.** Two broad reviews have already
> run and their findings are incorporated. This pass verifies that specific,
> named gaps were actually closed.

---

You are performing a **closure check** on a specification, not a design review.

Two prior adversarial reviews found real problems in Spec 007. Both sets of
findings were incorporated into revision 4. Your job is to verify that each gap
was genuinely closed — not to re-open the product design, not to propose a
different architecture, and not to re-litigate settled decisions.

## Repository

- Root: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`
- **Read-only.** Do not commit, push, edit, or publish. Do not read
  `.secrets/`, `.env*`, `node_modules/`, `archive/`, or `Archive Candidates/`.
- Safe to run: `git` read commands, `grep`, `rg`, `npm run check`,
  `npm run test:unit`. Do **not** run `npm run test:live-provider` or anything
  under `scripts/eval` — those make paid provider calls.
- Make no paid model calls of your own.

## What you are checking

`specs/007-intake-airbnb-revamp/SPEC.md` (revision 4).

The spec names its own required context in its "Required context" section. Read
that, then the spec. You do not need any prior conversation, review, or
revision — revision 4 is self-contained by design.

## Settled — do not reopen

The canonical 6 unnamed + 4 named composition · mandatory public source ·
website and Instagram support with Google Maps deferred · simulated payment ·
the comparison-target question · the post-payment intake workflow · constrained
question editing · the AI-drafts-then-user-verifies intake model.

Flag a *consequence* the founder may not have seen. Do not re-argue the
decision.

## The closure checklist

Answer each **closed / not closed / partially closed**, with the evidence you
checked. Where the spec makes a claim about the codebase, verify it against the
actual file.

**Blocker A — measurement authority**

1. Does R-01 state identity policy in **both directions** — forbidden *and*
   required — for both the audited brand and the comparison target?
2. Does R-06 test both directions, including that a six-unnamed-plus-three-
   genuinely-named pack is rejected as invalid 6/4?
3. Is R-03's migration inventory actually complete? **Search the tree yourself**
   for the legacy category enum (`need_discovery`, `solution_discovery`,
   `validation`, `action`) and the 5/5 markers (`five_unbranded`,
   `five_branded`, `unbranded_prompts`, `two_per_category`,
   `default_composition_not_five_five`). Report any consumer the inventory
   misses. This is the highest-value check in this pass.
4. Does R-05 treat the deterministic fallback templates as new work rather than
   a patch, and does it name both the slot-6 violation and the missing slot-9
   target-bearing template?
5. Does R-07 require the generation instruction to derive from the matrix, with
   a version bump and an agreement test?
6. Does R-08 move report assessment semantics into the matrix rather than
   creating a third independent category mapping?
7. Does R-09's document list include `AUDIT.md` and
   `journey/04-questions.md` — the two highest-authority contradictions?
8. Does R-10 specify an actual enforcement mechanism for edit integrity, rather
   than leaving the planner to invent one?

**Blocker B — workflow and data authority**

9. Does R-12 give **every** `BusinessBrief` field an owner, a screen, a
   requiredness decision, and an invalidation rule? Check against
   `src/lib/audit/types.ts` — is any field in the schema missing from the table?
10. Is R-17's error routing executable for every required field — that is, does
    every required field have a screen that can receive focus?
11. Does R-13 define how `verified_competitor` is created, without silently
    inferring it from `similar_businesses`?
12. Does R-14 define invalidation for stale data when scope changes, and does
    it prevent a conditional-screen skip from orphaning a required field?

**Blockers C and D**

13. Does R-20 avoid claiming a server-side security boundary, and does the
    acceptance criterion ask only for what is achievable without entitlement?
14. Does R-15 avoid the word "idempotent" for the weaker property it actually
    provides?
15. Does R-22 require the Cloudflare feasibility determination *before*
    planning, and does it give every listed control a testable value?
16. Does R-23 force an explicit rate-limiting decision rather than leaving it
    dependent on deferred infrastructure?

**Sequencing**

17. Does R-28 separate pre-handoff verification from final acceptance without
    circularity, and does Blocker A include migrating the legacy-category
    consumers needed to keep the current funnel working?

## Also verify

Spot-check ten file-and-line citations in the spec against the actual tree.
Report any that are wrong. Line-level drift of a few lines is expected and not
a finding; a citation pointing at the wrong construct is.

## What would make this fail

- A legacy policy consumer that R-03's inventory misses.
- A `BusinessBrief` field with no owner or no screen.
- A requirement ambiguous enough that two implementers would build different
  things.
- A claim about the codebase that is false.

## Deliverable

1. **Verdict:** ready for implementation planning · ready with listed
   corrections · not ready, with reasons.
2. **Checklist results** — the seventeen items, each closed / not closed /
   partially closed, with evidence.
3. **Inventory gaps** — any legacy consumer R-03 missed, with file and line.
4. **False claims** — any codebase assertion that does not hold.
5. **The smallest set of changes** that would move the verdict to ready.

Keep it proportionate. If the checklist is clean, say so plainly and stop —
a short review is the correct output for a spec that closed its gaps. Do not
manufacture findings to demonstrate thoroughness, and do not expand scope into
a third broad design review.

---
