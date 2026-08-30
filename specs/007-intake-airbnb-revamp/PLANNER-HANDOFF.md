# Spec 007 — planner handoff

> For the agent taking over the planner role. Read this before revising
> `SPEC.md` in response to any review.
>
> `SPEC.md` is the contract. This note is the context behind it — what was
> already considered and rejected, which claims are verified, and how to
> resolve a review that disagrees with it. None of this is reconstructable
> from the repository.

## Current state

- Branch `feat/intake-big-revamp`, commit `1765eaa`, pushed to origin.
- `specs/007-intake-airbnb-revamp/SPEC.md` — revision 4, status **Draft**.
- `docs/reviews/prompts/spec-007-closure-check.md` — the next review pass.
- `docs/reviews/findings/spec-007-adversarial-review-r2.md` — round 2 findings.
- `docs/reviews/prompts/spec-007-revision-3-planner.md` — the founder directive
  that produced revision 4. **Read this; it carries decisions the spec
  summarizes but does not fully explain.**

The spec has never been implemented. No code in this spec's scope has changed.

---

## 1 · The authority rule

Given by the founder in the revision-3 directive. It governs every future
conflict between a review and the spec:

> **Founder/product decisions define WHAT the product must do and what is in
> scope. Repository/code findings define HOW it must be implemented safely and
> correctly, as long as they do not override the founder decisions.**

Practical consequence: when two reviews disagree, do **not** adopt one
wholesale. Sort each finding into product-direction or implementation-safety,
and apply the rule. A reviewer citing existing code as a reason to change the
product model is providing evidence about implementation cost, not product
authority.

## 2 · The purpose that outranks tidiness

> Make the new Nuave workflow runnable end-to-end with real business data as
> quickly as possible.

Revision 1 failed because it was scoped as a presentation refactor. Revisions
2–3 over-corrected into infrastructure, persistence, browser history, and
design-system work. Revision 4 cut all of that.

If a review proposes work that does not serve the end-to-end journey, it is
deferred by default — even when the reviewer is technically correct.

---

## 3 · Locked — do not reopen

The nine locked decisions are listed in `SPEC.md`. In addition:

| Decision | Status |
|---|---|
| 6 unnamed + 4 named composition | Locked. Supersedes the 5/5 default across all documents |
| Mandatory public source | Locked. No brand-name-only entry path |
| Website + Instagram; Google Maps deferred | Locked by founder decision, not by implementation difficulty |
| Manual name entry as **recovery only** | Locked. Allowed after a valid source fails identification; never as an entry path |
| Simulated payment | Locked. Not a security boundary, and must not be described as one |
| Constrained question editing | Locked. Users edit wording within a slot, never composition or purpose |
| Comparison target proposed then accept/edit/replace | Locked |
| AI-drafts-then-user-verifies intake | Locked. Never a blank questionnaire |

## 4 · Considered and rejected — do not re-add

A reviser with no history will re-propose these. Each was examined and dropped
deliberately.

| Proposal | Why it was dropped |
|---|---|
| Global design-token, typography, focus, and legacy-CSS migration | Was Phases 3–5 of revision 2. Cut in revision 4 as unnecessary to validate the journey. Not a prerequisite for anything |
| The four `tweakcn-intake.css` "collapses" (`--border-*` → one value, `--text-body` → `--foreground`, `--text-placeholder` → `--muted-foreground`, `--action-hover` → lighter) | Founder briefly approved absorbing them, then reversed: they flatten the approved prototype. Do not re-add |
| `npx shadcn add radio-group toggle-group card` | Recommended twice, then rejected — the default shadcn registry installs **Radix**, forking a **Base UI** stack. `@base-ui/react` already ships all needed primitives |
| Preserving the five-categories-×-two invariant | Argued in revision 3 as cheaper, then deliberately deleted per founder direction: existing structure is evidence about cost, not product authority |
| Browser history / `popstate` contract | Deferred. In-product Back only |
| Comprehensive refresh/restore matrix | Deferred. Minimal session state is acceptable |
| `--chart-1..5` blue ramp | Deferred. Five near-identical blues with no consumer |
| Analytics on the preview | Deliberate non-scope, recorded so it is not mistaken for oversight |
| Anti-double-charge guarantees | Rejected — no charge exists |
| Calling R-15's guard "idempotent" | Rejected. It is narrower; the word was removed on purpose |

## 5 · Citation verification status

`SPEC.md` carries roughly forty file-and-line citations. Reliability varies:

**Verified directly against the tree during spec authoring** — trust these:
`questions-id.ts` 41, 352, 378, 454-494, 586, 599 · `question-suggestion-guards.ts`
92, 102 · `contracts.ts` 153, 336-344, 727, 765-778 · `report-prompt-contract.ts`
1-6 · `types.ts` businessBriefSchema (full read) · `LandingAuditHero.tsx` 70-140 ·
`AuditWorkflow.tsx` 81, 484, 694 · `source-input.ts` 110-135 ·
`ExampleReportPreview.tsx` 26 · `ReportPagePreview.tsx` 22 · `AUDIT.md` 33, 81 ·
`journey/04-questions.md` 51-55, 72, 84-86 · `PRODUCT.md` 64, 109, 164-165, 277 ·
`NOW.md` 141-144 · Base UI package exports · `ci.yml` triggers ·
`network-guard.test.ts`.

**Inherited from a review and spot-checked, not independently re-read** —
re-verify before relying on them: `stream.ts:174` · `workflow-storage.ts:25, 38` ·
`AuditWorkflow.tsx:209` · `AuditEntryShell.tsx:13` · `VOICE.md:42` ·
`FAQ.md:61-63` · `V1_PRODUCT_CONTRACT.md:291-300` · `playwright.config.ts:13-14` ·
`types.ts:164-171` · `fixture-journey/adapter.ts:34-38`.

Line-level drift of a few lines is expected and is not a finding. A citation
pointing at the wrong *construct* is.

## 6 · Errors made in prior rounds

Recorded so they are not repeated, and as calibration on how this spec's claims
were produced.

Three assertions were made from recall rather than verification and were wrong:

1. "`--shadow-focus` is dead code" — it is consumed at `spec004.module.css:65`
   via `--shadow-app-focus` (`globals.css:482`).
2. "`PROMPT_MATRIX` and `INDONESIAN_SLOT_MATRIX` are incompatible" — they are
   structurally identical. The real problem is duplication.
3. "`BriefStep` receives a brief and an `onSubmit`" — it takes nine props and
   mutates parent state field-by-field via `updateBrief`.

Reviews have also been wrong. Round 3's MED-3 claimed `AuditWorkflow` never
calls extract; it calls it at `:484` (GET budget) and `:694` (POST extraction).

**Rule: grep before asserting, including against a reviewer's claim.** Every
claim that was verified before being written has held; every claim written from
memory that failed, failed for that reason.

## 7 · Genuinely open

Not gaps in the spec — real unknowns that need work, not more review.

1. **R-22, Cloudflare SSRF feasibility.** Resolving a hostname and validating
   the IP does not pin the subsequent fetch to that address on Workers. The
   spec requires a feasibility determination *before* implementation planning.
   This is a spike, not a review item. If it comes back negative, whether
   identity fetching ships in V1 is a founder decision.
2. **R-23, rate limiting.** Must be decided explicitly: name a
   Cloudflare-compatible mechanism, or defer and record the accepted risk.
3. **R-21, Instagram parsing behaviors.** Observed during research, not
   reproduced in a committed test. Confirm against a live profile first.

## 8 · Convergence state

Three review rounds have run. Each was narrower than the last: round 2 found
product-model and workflow-invariant problems; round 3 found migration
completeness problems. The next pass is a **closure check**, not a fourth broad
review — that is what `spec-007-closure-check.md` is for.

If a review returns another broad redesign or a new set of product questions,
treat that as a signal the loop has stopped converging rather than as a
finding. The spec is already more thoroughly specified than most of what has
shipped in this repository.

## 9 · Repository governance

- `docs/INDEX.md` §Authority sets the order: `DECISION_LOG.md` → `VISION.md` →
  `PRODUCT.md` → domain guide (`AUDIT.md`, `VOICE.md`) → spec → code. **A spec
  cannot override `AUDIT.md` on measurement method** — this is why R-09 must
  amend `AUDIT.md:33`.
- `docs/WORKFLOW.md` defines the spec lifecycle: Draft → In review → Approved →
  Implementing → Verified. Implementation begins only at **Approved**.
- Material product decisions belong in `DECISION_LOG.md` with a date.
- Approving this spec does **not** reorder `docs/NOW.md`'s phase gates. The
  live-report quality gate remains the current objective until the founder
  advances it.

## 10 · Handling the incoming review

1. Read `SPEC.md`, then the revision-3 directive, then this note.
2. Sort every finding: product-direction or implementation-safety. Apply the
   §1 authority rule.
3. Check each finding against §4 before acting. If it is on that list, it was
   already rejected — note it and move on.
4. Verify every code claim against the tree, including the reviewer's. See §6.
5. Rewrite the affected sections of `SPEC.md` in place. **Do not append a
   "response to review" section** — the spec must read as one implementation
   contract. The founder directed this explicitly in revision 3.
6. Update this note if a decision changes or something new is rejected.
