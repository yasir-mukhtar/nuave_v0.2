# Adversarial review — "Lightweight Product-Experience Fidelity System"

> Reviewer: Claude (fresh context, read against the repository at `e531ff4`)
> Date: 2026-09-02
> Subject: the proposed experience-drift prevention plan (uploaded, not in repo)
> Verdict: **Do not adopt as written.** The diagnosis is wrong about where the
> drift entered, and four of the five safeguards already exist in this
> repository under different names.

## Summary

The plan is well written and its instincts about founder attention are sound.
But it was designed as if this repository had no experience authority, no
judgment review, and no escalation rule. It has all three. Meanwhile the actual
intake drift — which I found and cite below — entered through a mechanism none
of the plan's four controls sits in front of.

Adopting it would add a fifth statement of a rule already stated four times,
cost two to three new founder checkpoints per journey, and leave the live defect
in place.

---

## F1 — Critical: the drift entered through the approved spec, not through workers or component reuse

The plan asserts that "existing components and architecture supplied a
convenient implementation path back toward the previous intake model" and that
"the more detailed written specification became authoritative by default." The
first half is not supported by the code. The second half is right, but the plan
misses *how*, and that changes which control is needed.

What actually shipped, on the `customer-reasons` screen
(`src/app/audit/AuditStages.tsx:1219-1290`):

- `Target pelanggan` — required free-text
- `Kebutuhan pelanggan` — required, one item per line
- `Pertimbangan keputusan` — required, one item per line, beside the previous field

Empty-state hint, verbatim: *"Nuave belum menemukan target pelanggan dari sumber
ini. Isi nilai yang benar untuk melanjutkan."* — Nuave did not find this; enter
the correct value to continue.

The blocking behavior is real, not cosmetic
(`src/lib/audit/workflow-authority.ts:129-133`, `:760-786`): `target_customer`,
`verified_customer_needs`, `verified_decision_criteria`, `verified_offerings`,
and `verified_competitor` are all `required: true` and push blocking issues.

This contradicts four higher artifacts:

| Artifact | What it says |
|---|---|
| `docs/V1_PRODUCT_CONTRACT.md` §8.7 | "Missing non-critical information does not block the flow." |
| `docs/V1_PRODUCT_CONTRACT.md` §8.4 | "The dominant user actions are confirm, remove, and correct rather than completing a long blank questionnaire." |
| `intake-handoff.md` locked decision 5 | `decisionCriteria` is "inferred, not collected… they have **no UI**." |
| `intake-handoff.md` locked decision 9 | "Nothing blocks Lanjut except brand confirmation, scope, and category." |

And here is the origin. `specs/007-intake-airbnb-revamp/SPEC.md:451`, inside
R-12's field-ownership table:

> `verified_decision_criteria` | Extracted chips | Customer reasons | **Yes — add `.min(1)`** | —

The approved specification made it required. The worker implemented the approved
specification faithfully. The verification passed because Blocker B's acceptance
criterion is that *"every field in R-12 has an owner, screen, requiredness, and
invalidation rule"* (`SPEC.md:1003`) — a completeness criterion, which is
satisfied just as well by marking everything required.

Note also that `intake-handoff.md` open decision 3 — "Suggestion quality bar for
the no-website path — may need to ask rather than confirm on more screens" — was
still open. R-12's table closed it silently, in the direction of asking. That is
precisely the plan's own thesis ("product-experience decisions were allowed to
change as implementation consequences"), but it happened one level above where
the plan aims every one of its controls.

Now test the plan against this:

1. **Baseline lock** — the baseline existed. `SPEC.md:28` already names
   `intake-prototype.html` as "**the approved experience**", and the mental
   model is stated in the spec's own Purpose: "AI drafts → the user verifies,
   corrects, and adds. It must never become a blank questionnaire." It did not
   help. A fifth restatement will not either.
2. **Thin-slice checkpoint** — the slice would have been built from the same
   approved spec and would have shown the same required fields. This one *might*
   have caught it at founder walkthrough, and that is the plan's strongest idea.
   But only by luck: the defect is invisible whenever extraction succeeds, and
   appears only when it returns nothing.
3. **Material-deviation stop rule** — a worker escalates when it notices a
   conflict. R-12 row 451 is a plausible-looking requiredness column 450 lines
   into a 1,060-line spec. Nothing signals that it contradicts a plain-language
   rule in a different document.
4. **Dual acceptance** — plausibly catches it, but so would the "Judgment
   review" section that is **already in** `docs/templates/VERIFICATION.md`. See
   F3 for why that section did not fire.

**The control this failure calls for** is a reconciliation pass at *spec
approval*: every table row that sets requiredness, blocking, ordering, or field
visibility is checked against the product contract's acceptance conditions
before the spec is marked Approved. R-09 already does exactly this for
measurement policy, across 20 documents. It simply was not extended to
requiredness.

---

## F2 — Critical: the plan proposes artifacts the repository already has

The plan's §8 says its proposed locations "must be mapped to the repository's
current tree before editing." That mapping is the whole job, and skipping it is
why the plan reads as greenfield process design. The map:

| Plan proposes | Already exists as |
|---|---|
| Approved Experience Baseline (pinned prototype) | `intake-prototype.html`, git-pinned, named "the approved experience" at `SPEC.md:28` |
| Experience Contract / invariants | `V1_PRODUCT_CONTRACT.md` §2 (the correction loop, stated as a five-step model) and §8 (19 numbered acceptance conditions), plus `intake-handoff.md` "Locked decisions (don't relitigate)" |
| Experience verification verdict | `docs/templates/VERIFICATION.md` → "Judgment review: assess customer comprehension… accessibility, failure clarity" |
| Material-deviation stop rule | `AGENTS.md` escalation clause; `WORKFLOW.md` worker rule ("stops and reports the conflict instead of silently choosing"); `EXECUTION_PLAN.md` "It must escalate to the founder, and stop" |
| "CI green is not experience acceptance" | `EXECUTION_PLAN.md` §The gate: "**What CI does not cover**… human judgment on customer-facing copy and layout. Blocker E's journey work needs the last of these; **the founder is the reviewer**." |

Five of the plan's five safeguards have a predecessor here. The interesting
question — which the plan never asks — is why the existing ones did not fire.

---

## F3 — High: the plan's escape hatches reproduce the failure it diagnoses

The plan permits `Experience verification: NOT REVIEWED`, permits marking review
`NOT REQUIRED` "with one sentence", lets an invariant trace defer a checkpoint
to "Final", and allows foundational work first when "genuinely blocking" —
without a test for what that means.

Compare `specs/007-intake-airbnb-revamp/VERIFICATION.md`. Nine of fourteen
acceptance criteria are marked **Blocked**, each with a reason of the form
"Package B1 covers the intake workflow and populated field screens." The verdict
is **Pass**. Its own Judgment review section reads:

> "No customer-facing UI or copy was changed in A1. Native-language,
> accessibility, and journey-comprehension review are not evidenced by this
> package and remain with the packages that own those surfaces."

That is not a control failing to exist. That is a control deferring itself,
package by package, each deferral locally correct, with nothing tracking the
cumulative set. The plan adds a new field with the same allowed value and the
same absence of a bound.

**Fix:** one deferral ledger per spec. A criterion deferred by a package is
added to it; the spec cannot be marked Verified while the ledger is non-empty;
the ledger is reprinted in every package's verification record so it is visible
without archaeology. This is one table, not a system.

---

## F4 — High: nothing in the plan is enforceable here, and the plan defers the only enforceable controls

`AGENTS.md` already states this repository's enforcement ceiling: branch
protection is unavailable on the Free plan, so direct pushes to `main` are
"prohibited by convention." CI (`.github/workflows/ci.yml`) is the only thing
that actually blocks anything.

Every control the plan adopts now is a convention that a fresh agent session can
skip. Every control it can actually enforce, it defers to §10 "future maturity":
repository checks requiring a baseline reference, and Playwright capture of
named journey frames. Playwright is already configured, already runs ten e2e
specs in CI, and already has `screenshot: only-on-failure` wired
(`playwright.config.ts`). Meanwhile the plan mandates 4–8 manually captured
mobile frames per experience-bearing package, now.

That cost model is inverted. And it misses the cheapest possible catch for F1:

```
The set of fields that can block "Lanjut" equals
{brand confirmation, scope, category}.
```

That is one assertion against `workflow-authority.ts`, roughly twenty lines,
running in existing CI on every PR. It would have failed the moment R-12's
requiredness rows were implemented — before review, before a screenshot, before
a founder checkpoint. The plan's §6.3 gestures at this class of test
("prepared values appear before empty entry controls") and then buries it under
a manual screenshot regime.

---

## F5 — High: two candidate invariants contradict landed, founder-approved contracts

The plan's own thesis is that agents copy the most explicit artifact available.
It then publishes a copyable list, two entries of which are wrong for this
product.

**E-01 "Source first: the journey begins from public business evidence."**
`V1_PRODUCT_CONTRACT.md` §2: "**Payment sits before the intake begins.**"
`JOURNEY_CONTRACT.md` canonical sequence: Landing → Order Preview → **Payment**
→ Business Facts. Commit `ed17242` is titled "enforce simulated payment before
audit extraction." The plan notices the tension in §2 prose and ships E-01 in
the list anyway. An agent will lift the list, not the prose.

**E-06 "Same journey across viewports: desktop gains space, not… a different
sequence."** `docs/DESIGN.md` — the canonical design authority, updated
2026-09-01 in #41 — says "Mobile is an intentionally composed state… Decide
information order, what is visible first, density, grouping, primary-action
placement… on purpose." These may be reconcilable, but the plan never cites
`DESIGN.md` once, in a repository where `AGENTS.md` §UI rule 11 makes it
binding.

---

## F6 — Medium: the proposed authority table conflicts with the repository's real authority chain

`docs/INDEX.md` §Authority is a numbered six-step chain: newest DECISION_LOG
entry → VISION → PRODUCT → domain guide → approved spec → implementation. The
plan's §2 table is a different six rows with no mapping onto it, and it never
places the baseline relative to two documents that already claim the same
territory:

- `DESIGN.md` — canonical design authority, now including "visual prominence
  follows product importance" and the mobile-composition principle;
- `JOURNEY_CONTRACT.md` — "**cross-module sequence**, state ownership,
  handoffs" — which is the plan's own authoritative dimension #1, "journey
  sequence and perceived stages."

Adopt the plan as written and three documents claim journey structure. That is
the ambiguity the plan says it is eliminating.

**Fix:** one row inserted into `INDEX.md` §Authority, plus one explicit sentence
saying which of DESIGN / JOURNEY_CONTRACT / baseline wins on sequence.

---

## F7 — Medium: §8.1 would duplicate authority into `AGENTS.md`

`AGENTS.md` currently *points* to `INDEX.md` for authority and deliberately does
not restate it. Adding "approximately 20–30 lines" of authority and stop rules
there creates a second authority statement that can drift from the first — the
plan's own failure mode, installed by the plan. Authority belongs in the
document that owns authority.

---

## F8 — Medium: the cost is understated and collides with the current objective

`docs/NOW.md` is unambiguous: the current objective is Spec 003's report-quality
gate — one founder-supervised real Indonesian report, judged for whether it
holds a finding worth paying for. Spec 007 is Approved and implementing; its
journey shipped in #43; its `VERIFICATION.md` covers package A1 only.

The plan's Phase 1–4 (re-lock the baseline, re-plan the intake, rebuild a
fixture-backed thin slice) is a re-do of work that already landed, and the plan
is **silent on what happens to the shipped implementation** — revert, patch, or
accept. That is the first decision the founder actually needs, and it is missing.

On review cost: `docs/reviews/prompts/` holds eight Spec 007 review prompts,
through `spec-007-round-8-closure-check.md`. Eight adversarial rounds ran on
this spec and F1 shipped anyway. The plan's answer to drift that survived eight
review rounds is a ninth review round plus two founder checkpoints. That is the
thing that already did not work.

Finally, "it pauses only the affected slice; unrelated work may continue" is
close to vacuous here. `EXECUTION_PLAN.md` describes a chain — A1→A2→A3→B1→C1→E1
— and operating rule 4 states "the measurement core is single-threaded. Never
run two of them at once."

---

## F9 — Medium: pinning the prototype as APPROVED would re-authorize superseded parts

`intake-handoff.md` carries a table headed "**Superseded by the contract (was
locked, now isn't)**": the conversion-action screen, two confidence states,
prompt-chip expanders, the priority-offering radio, ★ ranking, the buyer-vs-user
branch, the competitor tag toggle, and Google Maps as a source.

The plan's baseline format has two buckets — Authoritative and Illustrative —
and stamps `Status: APPROVED` on the artifact as a whole. It warns about this
risk once in §8.3 prose, but its own format cannot express it. It needs a third
bucket: **Superseded**, each entry naming the superseding document. Without it,
"pin the prototype" restores a conversion screen and confidence badges that were
deliberately removed.

---

## F10 — Medium: the real routing gap, which the plan almost found

`intake-prototype.html`, `intake-handoff.md`, and `intake-redesign-spec.md` are
referenced by eight documents, including `SPEC.md`'s required-context list. They
appear in **none** of the routing surfaces — not `INDEX.md`, not `NOW.md`, not
`AGENTS.md`, not `README.md`.

A fresh agent following the documented reading order (`AGENTS.md` → `INDEX.md` →
active spec) learns the prototype exists only if it reaches line 28 of a
1,060-line spec. That is the cheapest genuine fix in this whole area, and the
plan carries it as item 2 of 5 in §8, framed as part of a much larger system.

---

## F11 — Low: status vocabulary collision

The repository already uses **Approved** (spec ready to implement), **Verified**
(spec complete), **Locked** (product hypothesis), and **SETTLED** (decision-log
entry). The plan adds `Status: APPROVED` for a prototype, five verdict values,
and two more statuses (`NOT REQUIRED`, `NOT REVIEWED`). Reuse the existing words
or state explicitly how they differ.

---

## F12 — Low: the closing self-test is unfalsifiable

§11 asks whether the failure could recur and answers "**No, if this plan is
followed.**" Every control that failed on Spec 007 also existed and was
followed. A useful self-test names the artifact and line that would have blocked
the specific defect. Applied to F1 — R-12's requiredness row — my reading is
that none of the four controls catches it, and the deferral pattern in F3 lets
it through review a second time.

---

## What I would adopt instead

In order, smallest first. Items 1–3 are hours of work and address the observed
failure; items 4–5 are the founder's calls.

1. **Route the artifacts.** Three rows in `INDEX.md` for
   `intake-prototype.html`, `intake-handoff.md`, and `V1_PRODUCT_CONTRACT.md`,
   plus a "Superseded dimensions" note on the prototype pointing at the
   handoff's table. (F9, F10)

2. **Extend R-09-style reconciliation to the whole spec gate.** Before a spec is
   marked Approved, every row that sets requiredness, blocking, ordering, or
   field visibility is checked against the product contract's acceptance
   conditions. Add it to `WORKFLOW.md` §Specification gate as one bullet. This
   is the control that catches F1, and the repository already knows how to do it
   — R-09 did it across twenty documents for measurement policy. (F1)

3. **Write the blocking-field allowlist test.** Assert that the set of fields
   able to block "Lanjut" equals the set `V1_PRODUCT_CONTRACT` §8.7 and
   `intake-handoff.md` #9 permit. Machine-checkable, runs in existing CI,
   catches the exact live defect. (F4)

4. **Decide the live defect.** `verified_decision_criteria`,
   `verified_customer_needs`, `target_customer`, and `verified_offerings`
   currently block the customer. Either §8.7 and handoff #9 change, or the code
   changes. This is a founder decision and it is shipped right now.

5. **Then, and only then, consider one founder walkthrough** on the first
   customer-visible slice of a new journey. It is the plan's one genuinely new
   and genuinely valuable control. Skip the invariant ID namespace, the
   deviation-request format, the dual-verdict fields, the five-field PR block,
   and the six-phase rollout until a retrospective shows they are needed —
   `AGENTS.md` working rule 4 and the raw-MVP note in `CLAUDE.md` both point the
   same way.

Add the deferral ledger from F3 whenever the next multi-package spec starts. It
costs one table and closes the mechanism that let nine blocked criteria pass.

## Questions the plan should have put to the founder

1. Does the shipped intake get reverted, patched, or accepted as-is?
2. When extraction returns nothing, may the intake block the customer — or must
   it always let them continue with an incomplete brief?
3. On journey sequence, which wins: `DESIGN.md`, `JOURNEY_CONTRACT.md`, or the
   prototype?
4. Is founder attention better spent on a new intake checkpoint, or on the
   Spec 003 report-quality gate that `NOW.md` names as the current objective?
