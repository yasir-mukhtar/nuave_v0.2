# Comparison-target projection check — Spec 007

> Copy everything between the `---` fences into a fresh agent with read-only
> access to the Nuave v0.2 repository.
>
> The round-8 closure check returned **one** issue: R-13's category-level
> fallback comparison target would be dropped by the Indonesian brief
> projection. This confirms that one correction, and the two rules the planner
> added while making it. It is the narrowest pass in the series and is intended
> to be the last.

---

You are confirming one correction and judging two rules that came with it.

This is not a review of the specification. Eight rounds have run and closed.
Read the delta, decide whether the correction closes what it claims, and say
whether either added rule should not be there. A page is the right length.

## Repository

- Root: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`
- **Read-only.** Do not commit, push, edit, or publish. Do not read
  `.secrets/`, `.env*`, `node_modules/`, `archive/`, or `Archive Candidates/`.
- Safe to run: `git` read commands, `grep`, `rg`, `npm run check`,
  `npm run test:unit`. Do **not** run `npm run test:live-provider` or anything
  under `scripts/eval` — those make paid provider calls.
- Make no paid model calls of your own. Deploy nothing.
- The delta is two commits, `87ec6ea..490e7c3`, on `specs/007-intake-airbnb-revamp/SPEC.md`
  alone. `git diff 11b476e..490e7c3` is the whole of it. `11b476e` is the tree
  the round-8 closure check approved.
- The spec has still never been implemented. **No code has changed, and none
  should have** — verify that, since this correction describes a change to
  `questions-id.ts` that must not have been made yet.

**Reading it in a browser instead.** The repository is private, so this needs a
GitHub session that can see `yasir-mukhtar/nuave_v0.2`. The delta:
`https://github.com/yasir-mukhtar/nuave_v0.2/compare/11b476e...490e7c3`. The
spec at that commit:
`https://github.com/yasir-mukhtar/nuave_v0.2/blob/490e7c3/specs/007-intake-airbnb-revamp/SPEC.md`.
The source files the checks depend on are under
`blob/490e7c3/src/lib/audit/` — `questions-id.ts`,
`question-suggestion-guards.ts`, `contracts.ts`, `types.ts`. If you cannot reach
the repository, say so and stop rather than confirming something you did not
read.

## What changed, and where

R-13 gained a projection contract; R-03 gained a migration row for
`questions-id.ts:141-147`; R-06 gained rule 6, a four-case regression test, and
its former rule 6 became rule 7; Blocker A's "done when" and acceptance item 10
each gained a clause.

## The correction

`minimizeIndonesianBrief` builds `comparison_business` only when
`verified_competitor.name` **and** `verified_competitor.source_url` are both
non-empty. R-13's fallback target — `alternatif lain di kategori <kategori>` —
deliberately has no source, so it would have reached generation as
`comparison_business: null`, and slot 9 would have had no target to name.

Confirm three things:

1. **The characterization is true of the tree.** Read
   `questions-id.ts:114-147`, then the consumers at `:393-395`, `:447-449`,
   `:562`, and `question-suggestion-guards.ts:100`. Does a null
   `comparison_business` actually cost slot 9 its target, or does something
   downstream already recover it? If the premise is wrong, say so first — the
   correction would then be unnecessary rather than merely imperfect.
2. **The contract is implementable exactly as written.** A non-empty name
   produces a comparison target; `source_url` may stay empty and is never
   invented or substituted; a URL-backed target projects unchanged. Could two
   implementers still build different things from those three sentences —
   particularly around `scope`, which the fallback also leaves empty?
3. **Nothing else in the spec now contradicts it.** R-05's slot-9 template,
   R-10's identity policy and rule 3, R-12's requiredness of
   `verified_competitor.name`, R-02's matrix fields.

## The two rules the planner added

Neither was asked for. Judge them on their merits and say plainly whether each
should stay.

**A · The leakage guard does not run while the fallback is the target.** The
comparison-target leakage check keeps a *named* business out of every slot but
9. `alternatif lain di kategori <kategori>` is category vocabulary, and slot 1
is `category_recommendation` — a legitimate question there could match the
phrase and be rejected as leakage.

Press on it: is the reasoning right, or is this a hole a determined pack could
walk a real competitor through? Does it weaken R-06 rule 1 or R-10 in any slot?
And is it scoped tightly enough — the audited brand's own identity checks are
supposed to be untouched everywhere, so verify the spec actually says that and
that nothing else reads as disabling them.

**B · How the fallback is recognized.** The comparison target *is* the fallback
exactly when its name equals the composed string for that brief's own
`category`, normalized the way `question-suggestion-guards.ts:7-14` normalizes.

Press on it: is that predicate deterministic, and does it survive a customer who
edits the category afterwards, one who types the phrase themselves, or a
category containing punctuation or casing the normalizer folds? Is comparing
against the brief's own category the right binding, or should it match the shape
of the phrase regardless of category? Say which, and why.

## R-06's renumbering

The former rule 6 is now rule 7, and rule 6 is the new regression test. R-10
cites rules 1 and 2 (`SPEC.md:334-335`) and R-10's predicate cases cite it as
"R-06 test 5" (`:366`). Confirm those still land on the rules they mean, and that nothing
anywhere cites a rule by a number that has moved.

## The four regression cases

R-06 rule 6 requires: (a) the fallback with an empty `source_url` reaches the
minimized brief as `comparison_business`; (b) slot 9 built from that brief
satisfies the required comparison-target identity and rule 3's relation
predicate; (c) a URL-backed target projects unchanged; (d) an unnamed slot
asking about alternatives in the customer's own category is not rejected as
leakage, while a named business there still is.

Are those four sufficient and genuinely distinct? Is any of them untestable as
stated — (b) in particular depends on R-02 carrying
`comparisonRelationMarkers`. Name a fifth only if its absence would let a real
defect ship.

## Not in scope

Do not re-verify and do not re-argue: the six round-8 corrections the previous
closure check already approved · R-03's wider inventory · R-09 · R-10's
enforcement model and slot-9 predicate · the `market_context` rule · R-22 and
R-23 · the citation sweep · the nine locked decisions · the handoff's §3 and §4
lists. R-21's live Instagram check and the throwaway
`fetch()`-to-private-IP verification remain known-open and are not findings.

Do **not** redesign R-13. Whether the fallback should exist at all is a founder
decision recorded in `DECISION_LOG.md` on 2026-08-30. That it must work is what
you are checking.

## Deliverable

1. **Verdict:** approved for implementation planning · not approved, with the
   specific reason.
2. **The correction** — closed / not closed / closed but introduces something
   new, with the evidence you actually checked.
3. **Rules A and B** — keep or drop, with the reason, one short paragraph each.
4. **Anything the delta broke.** Smallest set only.

A clean result moves this spec to implementation planning, and a paragraph
saying so is the correct output. Do not manufacture a finding to justify the
pass. If you find nothing, say nothing more.

---
