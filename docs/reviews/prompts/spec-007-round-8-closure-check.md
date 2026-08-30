# Round-8 closure check — Spec 007

> Copy everything between the `---` fences into a fresh agent with read-only
> access to the Nuave v0.2 repository.
>
> Round 8 was an adversarial pass at the surfaces seven prior rounds never
> covered. It returned six corrections, judged them bounded, and recommended a
> **narrow closure check rather than a ninth review**. This is that check.

---

You are confirming that six named corrections were made correctly, and that
three rules the planner added on top of them are sound.

This is not a review of the specification. Rounds 2 and 3 reviewed its design,
rounds 4 through 7 closed their findings, and round 8 attacked the premises of
the security material and the journey. Your job is narrower than any of them:
read the delta, decide whether each correction actually closes what it claims,
and say whether anything it introduced is worse than what it replaced.

## Repository

- Root: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`
- **Read-only.** Do not commit, push, edit, or publish. Do not read
  `.secrets/`, `.env*`, `node_modules/`, `archive/`, or `Archive Candidates/`.
- Safe to run: `git` read commands, `grep`, `rg`, `npm run check`,
  `npm run test:unit`. Do **not** run `npm run test:live-provider` or anything
  under `scripts/eval` — those make paid provider calls.
- Make no paid model calls of your own. Deploy nothing.
- The corrections are commit `f927adb` —
  `f927adb4476a250a4ec488ab741f7619546f0632`. `git show f927adb` is the exact
  delta you are confirming; `69c3987` is the tree round 8 reviewed.
- The spec has still never been implemented. No code in its scope has changed,
  and none should have.

**Reading it in a browser instead.** The repository is private, so this needs a
GitHub session that can see `yasir-mukhtar/nuave_v0.2`. The delta:
`https://github.com/yasir-mukhtar/nuave_v0.2/commit/f927adb`. The four files, at
that commit:

- `https://github.com/yasir-mukhtar/nuave_v0.2/blob/f927adb/specs/007-intake-airbnb-revamp/SPEC.md`
- `https://github.com/yasir-mukhtar/nuave_v0.2/blob/f927adb/specs/007-intake-airbnb-revamp/R-22-SSRF-FEASIBILITY.md`
- `https://github.com/yasir-mukhtar/nuave_v0.2/blob/f927adb/specs/007-intake-airbnb-revamp/PLANNER-HANDOFF.md`
- `https://github.com/yasir-mukhtar/nuave_v0.2/blob/f927adb/docs/DECISION_LOG.md`

Several checks below ask you to verify a claim against source files —
`contracts.ts`, `similar-businesses.ts`, `questions-id.ts`, `openai.ts`,
`types.ts`, `wrangler.jsonc`. Read them at the same commit, under
`blob/f927adb/src/lib/audit/`. If you cannot reach the repository at all, say so
and stop rather than confirming a correction you did not read.

## What you are reviewing

- `specs/007-intake-airbnb-revamp/SPEC.md` — R-12, R-13, R-15, R-22, R-23, R-24,
  and the acceptance scenario
- `specs/007-intake-airbnb-revamp/R-22-SSRF-FEASIBILITY.md` — §2, §3, §4, Sources
- `specs/007-intake-airbnb-revamp/PLANNER-HANDOFF.md` — Current state, §3, §8, §8b
- `docs/DECISION_LOG.md` — the new 2026-08-30 comparison-target row

## The six corrections

**1 · R-23's hostname limiter moved into the fetch primitive.** It was keyed on
the hostname the caller submitted, at route ingress, while R-22 permits three
redirect hops and a separate icon fetch — so a caller rotating throwaway
hostnames that redirect to one victim never charged the victim's bucket. It is
now consumed immediately before every outbound request, keyed on that request's
own destination.

Check: is the rule stated in one place or two, and do the R-22 control row and
the R-23 prose agree? Is there still an abuse path the three limiters miss now
that the second one is per destination — in particular, does anything bound the
number of *hostnames* one caller can touch, and should it? Is the behavior on
refusal defined well enough to build: mid-chain refusal, icon refusal, and what
the customer sees.

**2 · R-22 now says how a multi-address DNS answer is judged.** Every address in
both families must pass; `resolve4`/`resolve6` from `node:dns` are named because
`lookup` is not available; a family returning nothing is normal, including
`resolve6` rejecting with `ENODATA` for an IPv4-only host.

Check: is it deterministic — could two implementers still build different things?
Is the `ENODATA`/`ENOTFOUND` carve-out correct for the runtime, and does it
leave a hole where a resolution failure gets read as a pass? Are the four
required tests the right four? And confirm what the row itself claims: that this
is preflight validation only and does not reopen the accepted rebinding residue.

**3 · The branch or product choice is written into `entity_scope`.** R-24's
conditional screen had nowhere canonical to put its result; R-12 now co-owns
`entity_scope` between the Scope screen and the conditional screen, with three
canonical forms taken from the approved prototype's readback.

Check: do the three forms cover every path R-14 allows, including whole-brand
after a branch was chosen and then abandoned? Is the invalidation rule complete
against R-12's other rows? And assess the hazard the spec itself raises: the
whole-brand form contains `brand_name`, and `entity_scope` feeds three prompt
slots. Verify against `contracts.ts:216-257` that all three already carry
`brand_name`, and say whether the stated constraint on the canonical matrix is
enough to keep it that way through Blocker A.

**4 · R-15 is now stated per accepted source, not per journey.** The
draft-present guard forbade the re-read the approved wrong-brand screen
promises. A corrected source is now a replacement extraction: the superseded
draft is discarded, un-edited AI-owned fields are re-drafted, customer entries
are preserved and marked for re-confirmation.

Check: does "the customer has not edited" have a decidable meaning at
implementation time, or does it need per-field tracking the spec has not
specified? Does the preservation rule actually deliver what the correction screen
promises — *Yang sudah Anda isi tidak hilang* — and does anything from the
superseded source survive where it should not? Does the in-flight guard still
hold across the replacement?

**5 · R-13's derivation is defined, and is a founder decision.** No additional
provider or web call: the first usable `similar_businesses` entry becomes a
labelled proposal the customer must act on; when there are none, the screen asks,
with `alternatif lain di kategori <kategori>` as an acceptable fallback. Recorded
in `DECISION_LOG.md`, 2026-08-30.

Check: is case 1 genuinely distinguishable from the "silent take" R-13 forbids,
or is that a distinction only the spec can see? Is "the first such entry in the
returned order" deterministic given `normalizeSimilarBusinesses`
(`similar-businesses.ts`)? And test the fallback where it lands: with
`verified_competitor.name` set to that phrase, does slot 9 still satisfy R-10's
comparison-relation predicate and its identity policy, and does the guard in
`questions-id.ts:103-150` behave? A fallback that trips the hard block would trap
the customer it exists to rescue.

**6 · The 512 KB cap is counted in decoded bytes.** "Counted on the wire" is not
measurable while reading a body the runtime hands over decompressed.

Check: is the new definition implementable with one streaming read, and is 512 KB
still the right number now that it bounds decoded rather than compressed bytes —
would a real business's home page legitimately exceed it? The **value** is
settled; only the effect of the changed measurement on it is in scope.

## Also confirm

- **Two evidence claims were narrowed** in the determination and the handoff:
  "the only binding is `ASSETS`" became a claim about *resource* bindings and
  about no new `fetch()` target, and the no-Tunnel claim became a claim about the
  absent VPC binding. Verify both against `wrangler.jsonc` and the provider
  files, and confirm the founder's accepted risk is untouched by either.
- **The literal-IP point was re-sourced** to Cloudflare's Workers known-issues
  page. Confirm the determination no longer rests on the error-1003 page for it.
- **Three rules the planner added, which no reviewer asked for.** Judge them on
  their merits, and say plainly if any should not be there: a name-only
  correction does not re-extract (R-15); the `resolve6` rejection carve-out
  (R-22); and the `entity_scope` brand-leak constraint (R-12).
- No "response to review" section was appended anywhere. There must not be one.
- Nothing in the delta contradicts R-01, R-10, R-14, R-16, R-17, or R-20.

## Not in scope

Do not re-verify and do not re-argue: R-03's migration inventory · R-09's
document reconciliation · R-10's enforcement model and slot-9 predicate · the
`market_context` rule · R-22's control values · the citation sweep · the nine
locked decisions · the handoff's §3 and §4 lists · the founder's accepted
DNS-rebinding risk and the two 2026-08-30 decisions that preceded it. Round 8
examined all of it and found nothing that reopens any of them.

Two things remain known-open and are **not** findings: R-21's live Instagram
check, and the throwaway `fetch()`-to-private-IP verification in §7 of the
determination.

## Deliverable

Keep it to a page.

1. **Verdict:** approved for implementation planning · not approved, with the
   specific reason.
2. **Each of the six** — closed / not closed / closed but introduces something
   new, with the evidence you actually checked.
3. **The three planner-added rules** — keep or drop, one line each.
4. **Anything the delta broke**, smallest set only.

If the six are correct and introduced nothing worse, say so in a paragraph and
stop. A clean result moves this spec to implementation planning. Do not
manufacture findings to justify the pass, and do not expand scope: round 8 was
the last adversarial round, and a seventh correction that is merely an
improvement costs another round to dispose of.

---
