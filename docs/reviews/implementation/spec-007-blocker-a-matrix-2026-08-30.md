# Worker prompt — Spec 007, Blocker A, package 1: the canonical matrix

> Copy everything between the `---` fences into a fresh worker session with
> write access to the repository.
>
> This is the first implementation package for Spec 007. It builds the
> measurement authority and folds the measurement core onto it **without
> changing the 5/5 composition**. R-04 fixes that order and explains why.

---

You are the worker for one bounded task in the Nuave repository.

Repository: `/Users/yasir/nuave_v0.2`, branch `feat/intake-big-revamp`.

Objective: make the canonical slot matrix the only measurement authority in the
audit core, with agreement tests that derive from it — while the pack stays
five unnamed plus five named, exactly as it is today.

## Read these files completely, in this order

1. `AGENTS.md`
2. `specs/007-intake-airbnb-revamp/SPEC.md` — **R-01 through R-06 and R-10 are
   your contract.** R-13's projection paragraph is the fourth deliverable. Read
   R-12 for `verified_competitor`, and the Locked decisions list. You do not
   need Blockers B, C, or E for this package.
3. `src/lib/audit/contracts.ts`, `questions-id.ts`,
   `question-suggestion-guards.ts`, `questions-id-live.ts`,
   `locked-question-pack.ts`, `questions.ts`, `types.ts`

Do not read `specs/007-intake-airbnb-revamp/PLANNER-HANDOFF.md`. It is written
for the planner role and carries review history you do not need.

**On citations:** the spec's file-and-line references were verified when it was
written, and the tree has drifted a few lines since. A citation pointing at
roughly the right construct is right; grep for the construct rather than
trusting the number. If a citation points at the *wrong construct*, stop and
report it — that is a spec defect, not something to work around.

## Scope

You may inspect and modify:

- `src/lib/audit/` — the measurement core and its tests
- `specs/007-intake-airbnb-revamp/VERIFICATION.md` — create it (see deliverable 5)

You may run: `npm run check`, `npm run test:unit`, `npm run test:audit`, and
`git` read commands.

## Out of scope — do not touch these in this package

- **The 5/5 composition.** It stays. R-04 step 4 changes it, and doing it now
  leaves `slot <= 5` and `index === 5` standing while today's tests still pass,
  which silently stops checking identity leakage on unnamed slot 6.
- **R-05's ten deterministic fallback templates** (`questions-id.ts:454-494`).
  They encode per-slot semantics that change with the composition; they are
  rewritten in the package that flips it.
- Report, UI, fixture, and script consumers: `report-prompt-contract.ts`,
  `ReportView.tsx`, `AuditStages.tsx`, `ExampleReportPreview.tsx`,
  `ReportPagePreview.tsx`, `QuestionsPreview.tsx`, `fixture-journey/`,
  `fixtures/report-golden.ts`, `scripts/`. That is R-04 step 3.
- `skills/generate-ai-visibility-prompts/SKILL.md` and the R-09 document
  reconciliation.
- Blockers B, C, D, and E.
- Do not change the customer, the product promise, the evidence standard, or the
  approved specification. Do not commit, push, publish, contact anyone, deploy,
  or spend money. Do not run `npm run test:live-provider` or anything under
  `scripts/eval` — those make paid provider calls.

## Deliverables

**1 · The canonical matrix (R-01, R-02).** One exported structure in
`src/lib/audit/`, carrying per slot: id, order, category,
`auditedBrandIdentity`, `comparisonTargetIdentity`, measurement purpose,
customer-facing label, report assessment class, the generator's slot
description, and `comparisonRelationMarkers` — present on slot 9 only, and
**absent, not empty**, on the other nine. R-10 defines the marker groups and
whole-token matching; take them from there verbatim rather than inventing
equivalents.

Slot order and identity policy come from R-01's table. Populate all ten slots
even though the composition does not switch in this package.

**2 · R-06's agreement tests.** Rules 1 through 5, deriving every slot set from
the matrix — **none may hard-code `1–6`**. Rule 5's eight predicate cases are
listed in R-10 and are required, including the two rejections.

Rule 6 is the projection regression test. Cases (a), (c), and (d) are in scope
here. **Case (b) is not**: it needs slot 9 to be the comparison slot, which
happens when the composition flips. Write (a), (c), (d) now, and leave a named
`it.todo` or equivalent marker for (b) referencing R-06 rule 6 so the next
package cannot lose it.

**3 · Fold the measurement core onto the matrix (R-04 step 2).** Every table and
guard in R-03's *Measurement core* section reads its policy from the matrix
instead of from a slot number: `PROMPT_MATRIX`, `PROMPT_INPUT_FIELD_MATRIX` and
its index join, the self-check fields, the competitor exception, the
`INDONESIAN_SLOT_*` tables, the `slot <= 5` and `slot !== 6` guards,
`lockedPromptSlotIndex` and `canonicalPrompt`, and
`question-suggestion-guards.ts`'s composition and positional checks.

Counts stay 5/5, so tests that pin 5/5 keep passing. `questions.ts` is a second
complete legacy generator reachable only from its own test — migrate it onto the
matrix or delete it with its test, and say which you did and why. Do not leave a
second generator standing.

**4 · The comparison-target projection (R-13, R-03's `questions-id.ts:141-147`
row).** Three changes, all specified in R-13's projection paragraph:

- `minimizeIndonesianBrief` produces `comparison_business` from a non-empty
  `verified_competitor.name` alone. `source_url` and `scope` pass through as
  they are — empty stays empty. **Invent no URL.**
- The comparison-target leakage guard does not run when the target is the
  category-level fallback.
- The fallback is recognized by equality against the composed string for that
  brief's own `category`, normalized as `question-suggestion-guards.ts:7-14`
  normalizes. No new field on `verified_competitor`.

The doc comment above `minimizeIndonesianBrief` calls the null case "unusable";
correct it, because a missing URL is not that.

**5 · `specs/007-intake-airbnb-revamp/VERIFICATION.md`**, copied from
`docs/templates/VERIFICATION.md`. Fill only the acceptance criteria this package
evidences — from SPEC's end-to-end acceptance list, that is items 4, 5, and 7 in
part, and item 10's projection half. Mark everything else Blocked with one line
saying which package covers it. Record evidence, not a narrative of what you
did.

## Acceptance requirements

- `npm run check` passes. `npm run typecheck` covers `scripts/`, so a matrix
  change that breaks them fails here — if that happens, report it rather than
  migrating `scripts/`, which is a later package.
- `npm run test:unit` passes. No test is skipped, weakened, or deleted to make
  it pass. If an existing test pins behavior the matrix now owns, rewrite it to
  derive from the matrix and say so.
- No positional measurement-policy logic remains in the measurement core — no
  code deciding branded state, leakage rules, or composition from a slot's
  number. Ordering and ids may contain numbers; that is not the prohibition.
- The pack is still five unnamed plus five named at the end of this package.
- Nothing outside the scope list changed.

## If something does not fit

Stop that part and report it. Do not silently make a product decision, weaken a
requirement, or expand scope to make a check pass. Two specific cases:

- **A spec citation points at the wrong construct** — report it; the spec is
  wrong and a planner fixes it.
- **A folding step forces a composition change to keep tests green.** That is
  R-04's warning arriving in practice. Stop and report; do not flip the
  composition to unblock yourself.

## At completion, report

1. the outcome;
2. files changed;
3. checks run and their results, quoted;
4. assumptions made;
5. unresolved risks or blockers — including anything you left for the
   composition-flip package; and
6. the next smallest useful action.

---
