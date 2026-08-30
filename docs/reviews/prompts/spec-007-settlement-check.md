# Settlement check — Spec 007

> Copy everything between the `---` fences into a fresh agent with read-only
> access to the Nuave v0.2 repository.
>
> **The shortest pass in the series, and the last.** Round 6 returned two
> corrections and said no broader review was warranted after them. One was a
> code-level fix. The other was a product decision the founder has since made.
> This confirms both landed and that the founder's ruling was applied faithfully.

---

You are confirming two corrections and one founder decision.

Round 6 found the slot-9 comparison predicate still underdetermined, and found
that the planner had recorded a product guarantee as accepted when the authority
rule assigns it to the founder. The predicate was rewritten. The decision was
returned to the founder as an explicit either/or, and the founder chose
**warn and proceed** on 2026-08-30.

Your job is narrow: did the predicate become deterministic, was the founder's
choice recorded faithfully, and did logging it break anything.

**Already closed by rounds 4, 5, and 6 — do not re-verify:** R-03's migration
inventory · R-09's document reconciliation · R-22's SSRF control values · the
`market_context` rule · the `tsconfig` and `fixture-journey/adapter.ts`
corrections · the citation sweep. Re-running these is waste. If you do it
anyway, do not report clean results as findings.

## Repository

- Root: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`
- **Read-only.** Do not commit, push, edit, or publish. Do not read
  `.secrets/`, `.env*`, `node_modules/`, `archive/`, or `Archive Candidates/`.
- Safe to run: `git` read commands, `grep`, `rg`, `npm run check`,
  `npm run test:unit`. Do **not** run `npm run test:live-provider` or anything
  under `scripts/eval` — those make paid provider calls.
- Make no paid model calls of your own.
- Everything is committed and pushed. `1ca506f` is the round-6 fix pair;
  `7ccdb2b` is the founder settlement. `git show <sha>` for either.

## What you are reviewing

- `specs/007-intake-airbnb-revamp/SPEC.md` — **R-02**, **R-10**, locked
  decision 6, and the Blocker A row
- `docs/DECISION_LOG.md` — the new 2026-08-30 row
- `specs/007-intake-airbnb-revamp/PLANNER-HANDOFF.md` — §3, §4, §7

Supporting: `src/lib/audit/question-suggestion-guards.ts` ·
`src/lib/audit/questions-id.ts`

## The three checks

**1 · Is the slot-9 predicate now deterministic?**

Round 6's four objections were: the marker list had no home in R-02's matrix
shape; "comparative `lebih` forms" was not a closed list; matching semantics
were unstated; and the list missed ordinary Indonesian difference phrasing
(`perbedaan`, `beda`, `bedanya`) while bare `lebih` would accept
non-comparisons.

Verify each is addressed. Then answer the only question that matters: **could
two competent implementers still build materially different validators from
what R-10 now says?** Check specifically that the matching rule is stated (not
merely gestured at), that it matches the helper it cites at
`question-suggestion-guards.ts:7-14`, and that every listed token is a token
rather than a stem requiring inference.

Then stress the list as Indonesian, not as code. Construct three natural
comparison questions a real customer might type for the comparison slot, and
three natural non-comparison questions. Does the predicate accept and reject
them correctly? Report any false negative you find — the rule hard-blocks, so a
false negative stops a paying customer at the final step.

**2 · Was the founder's decision recorded faithfully?**

The founder chose warn-and-proceed. Read R-10, locked decision 6, and the
Blocker A row together and check:

- Does the spec state the decision as made, without hedging it back open or
  quietly widening it beyond what was chosen?
- Is anything now claimed as *guaranteed* that the chosen option does not
  actually deliver? R-10 should say plainly that this is not semantic purpose
  validation.
- Locked decision 6's own wording must be the founder's original. Confirm only
  a pointer was added.
- Blocker A should no longer be gated on the ruling.

**3 · The `DECISION_LOG.md` row.**

This edits the repository's highest-authority document, so check it properly:

- Is it chronologically placed, correctly formatted for the table, and is the
  `Updated:` header consistent with it?
- Does it contradict any existing row?
- Does it accurately describe what R-10 specifies — neither broader nor
  narrower? A decision-log row that outruns its spec becomes the authority by
  default.
- Does it pre-empt or collide with R-09's pending work on the three SETTLED
  5/5 entries at `:34`, `:41`, and `:60`? It must not silently do R-09's job or
  contradict it.

## Also check

R-10 now contains a sentence instructing the reader **not** to justify the gap
by analogy to R-20. That is unusual for a contract. Judge whether it reads as a
standing design constraint or as leftover argument with a past reviewer. The
spec must read as one implementation contract — the handoff forbids
review-response residue anywhere in it. If that sentence reads as residue, say
so and propose the neutral phrasing.

Beyond that: did settling R-10 introduce a contradiction in R-06, the
acceptance criteria, or the Locked decisions list?

## Deliverable

Keep it to a page.

1. **Verdict:** approved for implementation planning · not approved, with the
   specific reason.
2. **The three checks** — each correct / incorrect / incomplete, with evidence.
3. **Predicate stress results** — your six constructed questions and how the
   rule treats them.
4. **New contradictions**, if any.
5. Smallest set of changes, if any.

Two items are known to remain open and are **not** findings: the R-22
Cloudflare SSRF feasibility spike and the R-23 rate-limit decision. Both are
recorded as open in the spec and the handoff. Do not report them as gaps.

If the three checks are clean, say so in a paragraph and stop. Do not
manufacture findings, do not expand scope, and do not reopen the founder's
decision — if you think it is wrong, say so once and separately, and leave it
to the founder.

---
