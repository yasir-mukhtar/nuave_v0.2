# Final adversarial review — Spec 007

> Copy everything between the `---` fences into a fresh agent with read-only
> access to the Nuave v0.2 repository.
>
> Seven rounds have run. Rounds 4–7 were closure checks against named findings.
> This is a deliberate return to an adversarial posture for one pass, aimed at
> the surfaces those closure checks never covered — **not** a re-run of them.

---

You are trying to find what will actually go wrong when this specification is
implemented.

Not what is imperfect. Not what you would have written differently. **What
breaks.** A finding that would not change the code, the schedule, or a customer
outcome is not worth writing down.

## The posture

Assume a competent engineer implements this spec literally, without asking
anyone a question. Then answer: where do they build the wrong thing, ship a
defect, or get stuck?

The most valuable findings, in order:

1. A requirement two competent implementers would satisfy in materially
   different, incompatible ways.
2. A stated fact about the codebase, the runtime, or a third party that is
   **false** — the spec makes many, and they load-bear.
3. A path through the customer journey the spec does not cover, that a real
   user will hit.
4. An accepted risk whose **stated premise** is wrong (see below).

## Repository

- Root: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`, at `20a7542`
- **Read-only.** Do not commit, push, edit, or publish. Do not read
  `.secrets/`, `.env*`, `node_modules/`, `archive/`, or `Archive Candidates/`.
- Safe to run: `git` read commands, `grep`, `rg`, `npm run check`,
  `npm run test:unit`. Do **not** run `npm run test:live-provider` or anything
  under `scripts/eval` — those make paid provider calls.
- Make no paid model calls of your own. Deploy nothing.

## What you are reviewing

- `specs/007-intake-airbnb-revamp/SPEC.md`
- `specs/007-intake-airbnb-revamp/R-22-SSRF-FEASIBILITY.md`
- `docs/DECISION_LOG.md` — the two 2026-08-30 entries
- `specs/007-intake-airbnb-revamp/PLANNER-HANDOFF.md` — §1–§4 for authority and
  scope. Treat §5's citation-verification claims as unverified.

## Where to spend your effort

**Aim here. This is the point of the pass.**

**1 · R-22, R-23, and the feasibility determination — never independently
reviewed.** Every other part of this spec has been through seven rounds. This
material was written in one sitting, partly from web research, and no reviewer
has yet touched it. It is also the only security-relevant work in the spec.

Attack the **premises**, not the conclusion. The founder accepted the
DNS-rebinding residue on the record, and re-arguing an accepted risk is not a
finding. But the acceptance rests on specific factual claims — that the only
binding is `ASSETS`; that no Workers VPC, Tunnel, Hyperdrive, Durable Object,
or KV exists; that Workers exposes no VM-style metadata service; that the
high-impact SSRF target therefore does not exist. **Check each against the
repository and the runtime.** If any premise is false, the decision is wrong and
that is a real finding.

Then: are the nine R-22 controls sufficient and implementable as written? Is
any value wrong for the job — would a real site legitimately exceed the 512 KB
cap, the 3-hop limit, or the 5 s timeout? Does the R-23 design actually bound
what it claims, given per-colo counters? Is there an abuse path the three
limiters miss?

**2 · Blockers B, C, and E, and the journey (R-24 to R-28).** These were covered
once, in round 4's checklist, and not since. R-10 and R-03 have had six rounds
of attention; these have had one. Look especially for journey paths the field
ownership and conditional-screen rules do not cover, and for whether the
end-to-end acceptance scenario could actually pass or fail as written.

**3 · Implementability across the whole spec.** For any requirement, ask the
question that has only ever been asked of R-10: could two implementers build
materially different things from this? Report the worst three, not all of them.

## Already settled — do not re-verify, do not re-argue

Rounds 4–7 closed these against the tree: R-03's migration inventory · R-09's
document reconciliation · R-10's enforcement model and slot-9 predicate · the
`market_context` rule · R-22's control *values* · the citation sweep. Clean
results here are not findings.

The nine locked decisions in `SPEC.md`, and the handoff's §3 and §4 lists, are
founder decisions and prior rejections. **You may flag a consequence the founder
may not have seen. You may not re-argue the decision.** Anything you form that
lands on those lists goes in a separate out-of-scope section, so it is visibly
not a correction.

Two things are known-open and are **not** findings: R-21's live Instagram check,
and the throwaway `fetch()`-to-private-IP verification in §7 of the
determination. Both are recorded as operational follow-ups.

## Calibration

This spec is more thoroughly specified than most of what has shipped in this
repository, and the founder's stated purpose outranks tidiness: *make the
workflow runnable end to end with real business data as quickly as possible.*
Work that does not serve that is deferred by default, even when it is correct.

So: **do not pad.** If you find two real problems, report two. Zero is a
legitimate outcome and should be stated in a paragraph. A long list of minor
observations at this stage is a worse result than a short list of real ones,
because it costs another round to dispose of.

Conversely, do not soften a genuine blocker because seven rounds have run. If
something will actually break, say so plainly and rank it first.

## Deliverable

1. **Verdict:** ready for implementation planning · ready with listed
   corrections · not ready, with reasons.
2. **Findings**, severity-ranked, each with: the file and line, the concrete
   failure — inputs or path, then what breaks — and the smallest fix. Evidence
   you actually checked, not inference.
3. **False claims** — any assertion about the code, the runtime, or a third
   party that does not hold.
4. **Out of scope** — anything landing on the locked or rejected lists.
5. **What you deliberately did not examine**, so the next reader knows the
   shape of the gap.

---
