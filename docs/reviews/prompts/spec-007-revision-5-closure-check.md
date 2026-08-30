# Final closure check — Spec 007 revision 5

> Copy everything between the `---` fences into a fresh agent with read-only
> access to the Nuave v0.2 repository.
>
> **This is the last review of this spec.** Four rounds have run. Round 4
> disputed no product decision and asked for one bounded correction pass;
> revision 5 is that pass. This verifies the patch — nothing wider.

---

You are performing a **final closure verification** on a specification.

Round 4's synthesized verdict was: *product decisions locked, spec requires one
final bounded correction pass before implementation planning.* It named five
corrections plus one citation fix. Revision 5 made them. Your job is to confirm
each one actually closed, and that the patch introduced no seam or
contradiction elsewhere in the spec.

You are **not** running a fifth adversarial review. Round 4 explicitly
recommended against one, on the grounds that another unrestricted pass is more
likely to reopen settled choices than to reduce risk. Respect that.

## Repository

- Root: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`
- **Read-only.** Do not commit, push, edit, or publish. Do not read
  `.secrets/`, `.env*`, `node_modules/`, `archive/`, or `Archive Candidates/`.
- Safe to run: `git` read commands, `grep`, `rg`, `npm run check`,
  `npm run test:unit`. Do **not** run `npm run test:live-provider` or anything
  under `scripts/eval` — those make paid provider calls.
- Make no paid model calls of your own.
- The revision-5 edits are **uncommitted**. Read the working tree, not `HEAD`.
  `git diff` shows exactly what changed.

## What you are reviewing

**Primary:**

- `specs/007-intake-airbnb-revamp/SPEC.md` — revision 5, the contract
- `specs/007-intake-airbnb-revamp/PLANNER-HANDOFF.md` — read **§1 authority
  rule, §2 purpose, §3 locked, §4 considered-and-rejected, §7 genuinely open**

Read §3 and §4 before you write a single finding. They list decisions already
taken and proposals already examined and dropped. A finding that lands on
either list is out of scope, not a finding — report it as such and move on.

**Deliberately withhold trust from §5 and §6.** Those sections record which
citations a previous author claims to have verified. Do not inherit that.
Check citations yourself.

**Code the spec makes claims about** — verify against these, do not take the
spec's word:

| Area | Files |
|---|---|
| Measurement core | `src/lib/audit/contracts.ts` · `types.ts` · `questions-id.ts` · `questions-id-live.ts` · `question-suggestion-guards.ts` |
| Positional consumers | `src/lib/audit/locked-question-pack.ts` · `questions.ts` · `fixtures/report-golden.ts` |
| Generation instruction | `src/lib/audit/questions-id-provider.ts` · `skills/generate-ai-visibility-prompts/SKILL.md` |
| Scripts (typechecked) | `scripts/kk/run.ts` · `scripts/kopikenangan/kopi-kenangan-live-run.spec.ts` · `scripts/openrouter/smoke.spec.ts` · `tsconfig.json` |
| Report and UI | `report-prompt-contract.ts` · `ReportView.tsx` · `AuditStages.tsx` · `ExampleReportPreview.tsx` · `ReportPagePreview.tsx` · `QuestionsPreview.tsx` · `fixture-journey/adapter.ts` |
| Canon documents | `docs/AUDIT.md` · `docs/DECISION_LOG.md` · `docs/journey/04-questions.md` · `docs/PRODUCT.md` · `docs/NOW.md` · `docs/V1_PRODUCT_CONTRACT.md` · `docs/PROMPT_GENERATION_CONTEXT.md` · `docs/content/website/FAQ.md` · `docs/drafts/00-journey-fixtures.md` · `intake-handoff.md` |

## Settled — do not reopen

The canonical 6 unnamed + 4 named composition · mandatory public source ·
website and Instagram with Google Maps deferred · manual name entry as recovery
only · simulated payment as sequencing, not security · constrained question
editing · the proposed-then-editable comparison target · AI-drafts-then-user-
verifies intake · the deferral list in the spec's "Deferred after workflow
validation" section.

Flag a *consequence* the founder may not have seen. Do not re-argue the
decision.

## The six checks

Answer each **closed / partially closed / not closed**, with the evidence you
actually looked at.

**1 · R-03 — the migration inventory.** This is the check round 4 failed and
the highest-value item in this pass. Do the sweep yourself; do not read the
spec's table and grade it against itself.

Search the tree independently for: the legacy category enum (`need_discovery`,
`solution_discovery`, `comparison`, `validation`, `action`), the 5/5 markers
(`five_unbranded`, `five_branded`, `unbranded_prompts`, `two_per_category`,
`default_composition_not_five_five`), and — the class round 4 found missing —
**every module that maps a slot by array index into a parallel table**
(`[index]`, `slotIndex`, `slot <= `, `slot !== `, `index >= `, `index === `).

Then ask: does R-03 name every consumer you found? Report any it misses, with
file and line. Note especially whether anything on the **live request path**
(`/api/audit/run`, `/api/audit/variance`, `report-pipeline.ts`) is unlisted.

**2 · R-09 — document reconciliation.** Independently grep the documentation
surface for surviving 5/5 policy. Does R-09's table name every authoritative
document that still contradicts the locked model? Pay attention to
`DECISION_LOG.md` specifically: how many entries assert the old composition,
what status is each marked, and does R-09 supersede all of them?

**3 · R-22 — SSRF control values.** Every row must now carry a stated value.
Two questions: (a) is any row still undefined, other than the DNS-rebinding row
the feasibility spike is scoped to settle? (b) are the stated numbers —
3 redirect hops, 5 s per request, 10 s total, 512 KB — actually defensible for
fetching a public page's `<head>`, or would a real site legitimately exceed
one of them? A number that is too tight to work is as much a defect as a
missing one.

**4 · `market_context`.** Round 4 found R-12 requiring the field while R-14
allowed its screen to be skipped, and asked for one explicit sentence settling
it. Read R-12's table row, the note under it, and R-14. Is exactly one reading
now possible? Cross-check against R-24's screen list and against
`businessBriefSchema` in `src/lib/audit/types.ts`.

**5 · R-10 — purpose validation.** Revision 5 splits enforcement: certain
checks hard-block on save, unprovable purpose drift only warns. Verify (a) the
hard-block list is genuinely mechanically decidable with no model call, (b) the
split does not leave locked decision 6 unenforceable, and (c) the spec's
acceptance criteria promise only what R-10 actually enforces — round 4's
concern was a planner left to invent a validator, so a criterion that overclaims
is the same defect wearing different clothes.

**6 · Citations.** Round 4 found `questions-id-live.ts:351` pointing at a call
site rather than the five-category definition it described. Verify that fix,
then spot-check **fifteen** further file-and-line citations across the spec,
weighted toward the ones revision 5 added. Line drift of a few lines is not a
finding; a citation pointing at the wrong construct is.

## Also check — patch seams

A bounded patch to a long document creates contradictions at its edges. Read
the spec end to end once and report any place where revision 5's edits now
disagree with text they did not touch. Specifically:

- Does R-10's warn/block split sit consistently with R-06's agreement tests and
  with the end-to-end acceptance criteria?
- Does R-14's treatment of the Market screen sit consistently with R-24's
  screen list and R-26's Back behavior?
- Does R-03's expanded inventory sit consistently with R-04's migration order
  and R-28's sequencing — in particular, is anything now in the inventory that
  R-28 should have named as funnel-critical but does not?
- Was a "response to review" section appended anywhere? There must not be one;
  the spec must read as a single implementation contract. Its absence is a
  requirement, not a stylistic preference.

## What would make this fail

- A legacy policy consumer R-03 still misses, especially on the live request
  path.
- An authoritative document still asserting 5/5 that R-09 does not name.
- An R-22 control with no value, or a value that would break real sites.
- A `market_context` path still open to two readings.
- A requirement ambiguous enough that two implementers would build different
  things.
- Any claim about the codebase that does not hold.

## Deliverable

1. **Verdict:** approved for implementation planning · approved with listed
   corrections · not closed, with reasons.
2. **The six checks** — each closed / partially closed / not closed, with
   evidence.
3. **Inventory or document gaps** — anything R-03 or R-09 still misses, with
   file and line.
4. **Patch seams** — contradictions introduced at the edges of the edits.
5. **False claims** — any codebase assertion that does not hold.
6. **Out of scope** — findings you formed that land on the handoff's §3 locked
   list or §4 rejected list, listed separately so they are visibly not
   corrections.
7. **The smallest set of changes** that would move the verdict to approved.

Keep it proportionate. A clean result stated in a paragraph is the correct
output for a spec that closed its gaps — say so plainly and stop. Do not
manufacture findings to demonstrate thoroughness. Do not propose an alternative
architecture. If you believe a locked decision is wrong, say so once, in the
out-of-scope section, and leave it to the founder.

---
