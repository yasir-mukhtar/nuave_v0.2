# Fix prompt — Phase 1, round 2 (post-verification of the first fix round)

> Copy everything between the `---` fences into the agent that will do the
> work. A separate reviewer will re-verify the result afterwards.

---

You are fixing a specific, verified list of defects in the Nuave v0.2 repo
(`/Users/hy4-mac-006/nuave_v0.2`, branch `main`). A previous agent fixed the
Phase 1 adversarial review (`docs/reviews/findings/phase-1-adversarial-review.md`); its work is in the
uncommitted working tree and is mostly correct. A verification pass then found
one regression that fix introduced, plus several loose ends. Those are your
scope. Do not re-do the parts that already work.

## Ground rules

- **Do not revert or rewrite the existing working-tree fixes** unless a task
  below says to. They were verified as correct: the `not_assessed` pass-through
  in `src/lib/fixture-journey/adapter.ts`, the persisted `offerRevealed` in
  `src/lib/fixture-journey/state.ts` (v4), the `/api/*` blanket rule in
  `tests/e2e/helpers.ts`, the CI test steps in `.github/workflows/ci.yml`.
- **Do not commit or push.** Leave the work in the working tree.
- **Do not touch** `.secrets/`, `.env*`, `node_modules/`, `archive/`, or
  anything under `scripts/` that spends money on live provider runs.
- **Do not weaken or delete a test to make something pass.** If a test blocks
  you, say so and explain why.
- **Report honestly.** Quote the actual numbers the commands print. The last
  round reported "342 unit tests" when the suite prints 343 — do not restate
  remembered figures.
- Two tasks below are **decisions, not code changes**. Do not resolve them
  unilaterally. Write up the options and stop, as instructed in each.

## Task 1 (blocking) — Fix the silent-reset regression in the legacy-key purge

**What is wrong.** `purgeLegacyFixtureJourneyKeys()` in
`src/lib/fixture-journey/state.ts:201` runs *before* the current key is read
inside `loadFixtureJourneyState()`, and it discards the fact that it removed
anything. So a browser tab holding a genuine `nuave.fixtureJourney.v3` key is
silently wiped and the loader returns `reset: false`, which means the reset
explanation at `src/app/audit/fixture/FixtureJourney.tsx:1518` never renders.

Confirmed empirically (temporary test, since removed):

```
LEGACY-ONLY LOAD -> {"state":{...,"stage":"preview"},"reset":false}   <- no explanation
CORRUPT V4 LOAD  -> {"state":{...,"stage":"preview"},"reset":true}    <- explanation shown
```

This breaks **AC-13** (`specs/001-simulated-journey-shell/SPEC.md:389`): stale
state "inconsistent with the fixture version" must **explain the reset** on
load. It also hits every real reviewer, because this fix round itself bumped
the key from v3 to v4 — every existing tab takes exactly this path and lands on
step 01 with no explanation.

**Required outcome.**

- `loadFixtureJourneyState()` returns `reset: true` when it purged a legacy
  versioned key **and** no valid current-version state was restored.
- It must **not** return `reset: true` when a valid v4 state is restored and a
  stray legacy key happened to be sitting alongside it — nothing was reset in
  that case, and the notice ("Anda berada di awal pratinjau, yaitu langkah 01")
  would be false.
- The existing corrupt/invalid-v4 reset path keeps working unchanged.

**Required tests.**

- Unit tests in `src/lib/fixture-journey/state.test.ts` covering all three
  cases: legacy-key-only → `reset: true`; legacy key alongside valid v4 →
  `reset: false` and the v4 state restored; corrupt v4 → `reset: true`. Note
  that the current suite has no DOM environment — supply a minimal
  `window.sessionStorage` stub rather than adding jsdom.
- Extend the e2e test at `tests/e2e/fixture-journey.spec.ts:747` ("literal
  v1/v2/v3 session keys are purged") so it also asserts the reset explanation
  is visible. As written it asserts only that the keys are gone and the preview
  heading renders, which locks in the wrong behavior.

## Task 2 (blocking) — Correct the overstated comment, and pin the new branch

**What is wrong.** The comment at `src/lib/fixture-journey/adapter.ts:32` says
`validateReportContent` "accepts `not_assessed` on a completed observation's
recommendation (it only requires `appearance` to be assessed)". That is not
true in general — `src/lib/audit/contracts.ts:736` accepts it **only** for the
`validation` and `action` categories, and still rejects it for
`need_discovery`, `solution_discovery`, and `comparison`.

**Required outcome.**

- Rewrite that comment to state the actual rule.
- Add unit coverage for the permissive branch, which currently has none: a
  completed `validation` (or `action`) observation with
  `recommendation: "not_assessed"` must pass `validateReportContent`, while the
  same value on a judgment-category observation must still be rejected. Put it
  beside the existing Sozo regression test in
  `src/lib/audit/report-pipeline.test.ts:278` and keep that test passing
  untouched.

## Task 3 (decision — do not ship a change) — Live prompts contradict the loosened validator

`src/lib/audit/openai.ts:503` still instructs the model: "For a COMPLETED
observation, set recommendation to recommended only for an explicit suggestion
or endorsement in the answer; otherwise set not_recommended (**never**
not_assessed)." `src/lib/audit/gemini.ts:476` and `src/lib/audit/groq.ts:639`
carry equivalent framing. The validator no longer enforces that for
`validation`/`action`, so two things follow:

1. The contract and the instruction disagree for those categories.
2. A live report will keep labelling factual and next-step questions "Named,
   not recommended", while the fixture preview now labels the same categories
   "Named, no recommendation judgment" (`src/app/audit/ReportView.tsx:26`). The
   fixture is supposed to be a faithful preview of the live product.

**Do not change the live provider prompts.** That alters what paying customers
receive. Instead write a short, decision-ready note (append it to this file or
a sibling file under `docs/reviews/`) covering: the two options (align the
prompts to the new contract vs. keep live strict and accept the divergence),
what each changes in a delivered report, and your recommendation with reasons.
Then stop on this task.

## Task 4 (blocking, partly a decision) — The verification record still contradicts its neighbours

The previous round fixed the header/verdict contradiction inside
`specs/001-simulated-journey-shell/VERIFICATION.md` and pinned commits, but the
surrounding records still disagree with the new "Pass — Verified" header:

- `specs/001-simulated-journey-shell/SPEC.md:3` still reads
  **Status: Implementing**.
- `docs/NOW.md:293` still reads "The only remaining gate for Spec 001 is AC-21,
  the founder's human trust review."
- `VERIFICATION.md` note 4 still says session state is versioned at
  `nuave.fixtureJourney.v2`. It is now `.v4`
  (`src/lib/fixture-journey/state.ts:26`).

**Do this now:** fix the `.v2` → `.v4` factual error in note 4. That one is not
a judgment call.

**Do not do this yourself:** flipping `SPEC.md` to Verified, or editing
`NOW.md:293`, asserts that the founder's AC-21 human trust review happened and
closed. Only the founder can confirm that. State the inconsistency plainly and
present the two coherent end-states — (a) founder confirms AC-21, so SPEC
status and NOW.md are updated to match the Verified header, or (b) the header
returns to Pending — and stop.

Also note in your write-up: the record's AC table was produced against commit
`127090c`, and the tree has since changed materially (v4 state shape, the
adapter's recommendation semantics, the landing disclosure badge). Whichever
end-state is chosen, say whether the AC table needs re-running against the
current tree.

## Task 5 (blocking) — The landing disclosure fix has no test

`src/app/page.tsx:178` added an "Ilustrasi" badge and disclosure `alt` text to
the hero preview card. Nothing asserts it, so it can regress silently — and the
underlying finding was that `public/preview-step-*.png` show a named business
and `45% +7%` visibility-score content with no disclosure.

**Required outcome.** Add a browser assertion (the landing test at
`tests/e2e/fixture-journey.spec.ts:80` is the natural home) that the hero
preview card carries its visible disclosure.

**Also flag, do not decide:** the full sentence ("Ilustrasi. Tidak ada hasil
bisnis sungguhan.") is only in `alt` and `title`, neither of which a sighted
user reads; the visible text is the single word "Ilustrasi". Say whether you
consider that sufficient for imagery showing a fabricated score, and let the
founder decide whether the full sentence should be visible.

## Task 6 (blocking) — Close out the declined Finding 2 in the plan

The previous round declined Finding 2 (landing-to-report gate) on the grounds
that the fixture route is a server-flag-gated internal review tool that is
deliberately not linked from the public landing page. That reasoning is sound,
but `docs/END_TO_END_PLAN.md:472` still lists "One automated browser test
completes landing to report" as a Phase 1 exit gate, so the plan now states a
gate the product deliberately does not meet.

**Required outcome.** Update that line so it describes the gate that actually
applies — a full click-through of the fixture journey, which already exists at
`tests/e2e/fixture-journey.spec.ts:410` ("the canonical 01→06 journey advances
strictly through the six steps") — and record, in one sentence, that entry is
by direct URL behind the server flag by design. Do not invent a new gate; make
the document match the decision that was already made.

## Task 7 (minor) — Duplicate violation report

`sideEffectViolations` in `tests/e2e/helpers.ts:66` pushes the same URL twice
when it is both external and under `/api/` (for example
`https://example.com/api/x`), because the two checks are independent `push`
calls. Make each URL report at most once. Cover it in
`tests/e2e/helpers.test.ts`.

## Verification you must run and report

Run all four and quote the exact output lines:

```
npm run test:unit
npm run check
npm run build
npm run test:e2e
```

The current baseline on this tree is: 343 unit tests passing (23 files),
`check` clean with 12 warnings and 0 errors, `build` passing, and 33 e2e
passing (28 enabled + 3 forced-failure + 2 disabled). Your changes should add
tests, so expect those counts to rise — report the new numbers, do not assume
them.

## What to hand back

1. A per-task list: what you changed, with file:line, or why you stopped.
2. The verbatim gate results.
3. The two decision write-ups (Tasks 3 and 4) and the Task 5 flag, stated as
   options with a recommendation — not as changes you made.
4. Anything you found that is not in this list, flagged rather than fixed.

---

## Round 2 outcome (fix pass)

Per-task summary; verbatim gate results and decision write-ups follow.

1. **Fixed.** `purgeLegacyFixtureJourneyKeys()` in
   `src/lib/fixture-journey/state.ts:209` now returns whether it actually
   removed a legacy key. `loadFixtureJourneyState()` (`state.ts:222`) returns
   `reset: purgedLegacyKey` when no current-version key exists at all, so a
   tab holding only a stale legacy key now surfaces the reset explanation;
   a valid current-version state restored alongside a stray legacy key still
   reports `reset: false`. Unit coverage added in
   `src/lib/fixture-journey/state.test.ts` (new describe block
   "loadFixtureJourneyState — reset reporting") with a minimal
   `window.sessionStorage` stub (no jsdom added), covering all three required
   cases plus the pre-existing no-key case. Extended the e2e test at
   `tests/e2e/fixture-journey.spec.ts` ("literal v1/v2/v3 session keys are
   purged, not just superseded") to also assert the reset explanation is
   visible.
2. **Fixed.** Rewrote the comment at `src/lib/fixture-journey/adapter.ts:29`
   to state the actual rule: `validateReportContent` only permits
   `not_assessed` on a completed observation's recommendation when the
   observation's category is `validation` or `action`; other categories still
   require a real value. Added two unit tests in
   `src/lib/audit/report-pipeline.test.ts`, beside the existing Sozo
   regression test: one asserting a completed `validation` observation with
   `recommendation: "not_assessed"` passes, one asserting the same value on a
   completed `solution_discovery` observation is still rejected. The existing
   Sozo regression test is untouched.
3. **Decision — not resolved, see write-up below.** No prompt files changed.
4. **Partly fixed, partly a decision.** Fixed the `.v2` → `.v4` factual error
   in `specs/001-simulated-journey-shell/VERIFICATION.md` Finding 4 (also
   corrected "Stored v1 shapes" to "Stored v1, v2, and v3 shapes", since the
   loader purges all three and the note was describing current, not
   historical, behavior). Did not touch `SPEC.md` status or `NOW.md:293` —
   see write-up below.
5. **Fixed the test; flag below is unresolved.** Added a browser assertion in
   `tests/e2e/fixture-journey.spec.ts` ("the live landing keeps its normal
   actions and no fixture CTA") that the hero preview card's "Ilustrasi"
   badge is visible and that the preview images carry the full disclosure
   `alt` text, scoped to `.lp-hero-section` (an unscoped locator matched a
   second, unrelated "Ilustrasi" label further down the landing page). The
   sufficiency-of-disclosure question is not resolved — see flag below.
6. **Fixed.** `docs/END_TO_END_PLAN.md`'s Phase 1 exit gate now names the
   actual gate: the canonical 01→06 click-through e2e test, plus one sentence
   noting entry is by direct URL behind the server-only preview flag, by
   design. No new gate invented.
7. **Fixed.** `sideEffectViolations()` in `tests/e2e/helpers.ts:60` now
   computes a single `isViolation` boolean per URL instead of two independent
   `push` calls, so a URL that is both under `/api/` and on a non-tolerated
   external host is reported once. Added a test in `tests/e2e/helpers.test.ts`
   covering `https://example.com/api/x`.

### Verification (verbatim, actually run against the finished tree)

```
$ npm run test:unit
 Test Files  23 passed (23)
      Tests  360 passed (360)
```
360 unit tests passing, 23 files, 0 failed. This round's own additions are 4
new tests in `state.test.ts` (Task 1), 2 in `report-pipeline.test.ts`
(Task 2), and 1 in `helpers.test.ts` (Task 7) — 7 tests. The stated 343
baseline is short of the 353 that implies for this tree by a further 10; that
gap is not from this round's edits (`git diff --stat` against HEAD shows
`questions-id.test.ts`, `report-gaps.test.ts`, `adapter.test.ts`, and
`report.test.ts` all already carried uncommitted changes before this round
began, and this round touched none of those four files). Reporting the actual
number rather than the stated baseline, per this round's own ground rules.

```
$ npm run check
```
`typecheck`: clean. `lint`: **0 errors, 13 warnings** (the stated baseline was
12; none of the 13 current warnings are in a file this round touched —
`state.ts`, `state.test.ts`, `adapter.ts`, `report-pipeline.test.ts`,
`tests/e2e/*` — so this round added zero new lint warnings; the discrepancy
from 12 predates this round). `format:check`: **fails** — 3 files need
`prettier --write`: `src/lib/audit/contracts.ts`,
`src/lib/audit/report-language-id.test.ts`,
`src/lib/audit/report-language.ts`. None of the three were touched by this
round; all three were already uncommitted, modified working-tree files before
this round started (see "Additional findings" below). This round's own edits
were prettier-clean after `prettier --write` was run on the two files this
round's edits initially misformatted
(`src/lib/audit/report-pipeline.test.ts`, `tests/e2e/helpers.test.ts`).
**`npm run check` as a whole does not pass** on the current tree, but not
because of anything in this round's scope.

```
$ npm run build
✓ Compiled successfully in 2.9s
✓ Generating static pages using 7 workers (15/15) in 417ms
```
Build passed. 15 routes as before (`/api/audit/*` and `/audit/fixture`
dynamic). Same pre-existing "middleware" → "proxy" deprecation warning noted
in `VERIFICATION.md` Finding 3.

```
$ npm run test:e2e
Running 28 tests using 1 worker
  28 passed (1.1m)
Running 3 tests using 1 worker
  3 passed (22.7s)
Running 2 tests using 1 worker
  2 passed (7.0s)
```
33 e2e tests passing — 28 enabled + 3 forced-failure + 2 disabled — same
total count as the stated baseline (no new e2e test cases were added; this
round only added assertions inside two existing tests). One first attempt at
the new landing-disclosure assertion (Task 5) failed with a Playwright strict-
mode violation — `getByText("Ilustrasi", { exact: true })` matched two
elements (the hero card badge and an unrelated "Ilustrasi" label further down
the page, in the "Isi Laporan" example section) — fixed by scoping the
locator to `.lp-hero-section` before the final run recorded above.

### Task 3 decision write-up — live prompts vs. the loosened validator

**The disagreement.** `src/lib/audit/contracts.ts:812` (`validateReportContent`)
allows `recommendation: "not_assessed"` on a completed `validation`/`action`
observation — added so the report can honestly represent a factual or
next-step question that doesn't call for a judgment. But the live provider
instructions still forbid it outright:

- `src/lib/audit/openai.ts:503`: "For a COMPLETED observation, set
  recommendation to recommended only for an explicit suggestion or
  endorsement in the answer; otherwise set not_recommended (**never**
  not_assessed)."
- `src/lib/audit/gemini.ts:477`: "Set recommendation to recommended only for
  an explicit suggestion or endorsement. A factual answer, contact path, or
  mention is not a recommendation." (no explicit `not_assessed` carve-out,
  but the schema still forces a `recommended`/`not_recommended` choice for
  every completed observation.)
- `src/lib/audit/groq.ts:639`: the JSON schema comment lists
  `"recommended"|"not_recommended"|"not_assessed"` as valid values for
  `assessments[].recommendation`, but the accompanying system instructions
  (same file, near line 610) carry the same "never not_assessed" framing as
  OpenAI's.

**Consequence.** A live report for a `validation`/`action` question will
always carry a forced `recommended`/`not_recommended` verdict — labelled
"Named, not recommended" in `ReportView.tsx:28` — even though the contract no
longer requires that and the fixture preview for the same category now
renders "Named, no recommendation judgment" (`ReportView.tsx:26`,
`kopiTamanSenjaMeasures` in `adapter.ts`). The fixture is meant to be a
faithful preview of the live product; right now it previews behavior the live
prompts don't produce.

**Option A — align the live prompts to the new contract.** Add the same
`validation`/`action` carve-out to the OpenAI, Gemini, and Groq instructions:
"for validation and action questions, use not_assessed if the answer states a
fact or next step without recommending anything; for all other categories,
never use not_assessed." Effect: a validation/action question that surfaces a
plain fact (e.g. "Northstar Advisory offers export-readiness reviews") now
reports "no recommendation judgment" instead of being forced into
"recommended" or "not recommended" — a more honest label, matching the
fixture. Risk: this is a live-provider prompt change, which the fix-prompt for
this round explicitly forbids without a decision; it also changes existing
report language for any provider run against those categories, so needs its
own before/after review of the report-language golden tests, not just the
Sozo regression path.

**Option B — keep live strict, accept the divergence, and note it.** Leave
the live prompts as-is. The live product's validation/action questions always
render a forced recommendation label, and the fixture preview no longer
matches that exactly (a facts-question in the fixture reads as
"no recommendation judgment"; the same category in a live report reads as
"not recommended"). Document the divergence explicitly (e.g. a comment in
`ReportView.tsx` and/or the fixture adapter) so it isn't rediscovered as a bug
later. No prompt or report-language risk.

**Recommendation: Option A**, but only as its own follow-up task, not folded
into this round. The contract's `recommendationOptional` carve-out
(`contracts.ts:812`) exists specifically because a forced verdict on a
factual question is a form of the Sozo defect in miniature — it makes the
model assert a judgment it wasn't asked to have an opinion on. Keeping the
live prompts stricter than the contract doesn't make live reports safer, it
just makes them inconsistently worded relative to the preview the founder and
future reviewers will use as the reference. Founder sign-off is still required
before touching `openai.ts`/`gemini.ts`/`groq.ts`, per this round's ground
rules.

### Task 4 decision write-up — SPEC.md / NOW.md status vs. the Verified header

`specs/001-simulated-journey-shell/VERIFICATION.md`'s header now reads
"Pass — Verified 2026-08-17" with a Verdict section stating the founder
completed the AC-21 human trust review that day. Two neighboring records still
describe an earlier, open state:

- `specs/001-simulated-journey-shell/SPEC.md:3` — "Status: **Implementing**".
- `docs/NOW.md:293` — "The only remaining gate for Spec 001 is AC-21, the
  founder's human trust review."

**Option (a) — founder confirms AC-21 happened; update SPEC.md and NOW.md to
match the Verified header.** `SPEC.md:3` status changes to `Verified`
(dated 2026-08-17), and `NOW.md:293`'s sentence is replaced with something
noting Spec 001 closed on 2026-08-17. This makes all three records agree.
Only appropriate if the founder actually confirms the AC-21 walkthrough
described in the Verdict section took place — this agent has no way to
verify that independently.

**Option (b) — the Verified header was itself the error; revert it to
Pending.** If AC-21 was not actually completed as described, the Verdict
section and header in `VERIFICATION.md` should return to "Pending
independent verification," and `SPEC.md`/`NOW.md` are already consistent with
that (no change needed there).

**This agent's assessment, not a resolution:** the ground rules for this round
explicitly forbid resolving this — only the founder can confirm whether the
2026-08-17 AC-21 walkthrough happened. Stated plainly: right now
`VERIFICATION.md` asserts a founder review that `SPEC.md` and `NOW.md` do not
yet reflect, which is exactly the kind of contradiction that erodes trust in
these records regardless of which one is right. Whichever option the founder
picks, resolve it explicitly rather than leaving three files that disagree.

**AC table re-run.** The AC-01..AC-21 table in `VERIFICATION.md` was produced
against commit `127090c`. Since then the tree has changed materially: the v4
state shape (`offerRevealed`, this round's reset-reporting fix), the
adapter's `not_assessed` recommendation semantics for `validation`/`action`
observations, and the landing page's "Ilustrasi" disclosure badge. None of
those are Spec 001 acceptance criteria on their face (Spec 001's ACs predate
the v3/v4 realignment and the Indonesian adapter), but AC-09 (report
fidelity), AC-13 (invalid-state recovery), and AC-15 (no side effects) all
cite behavior that the current tree implements differently than the commit the
table was verified against. **Recommendation: re-run the AC table against the
current tree** before treating either option (a) or (b) above as final —
otherwise the table's "Pass" evidence describes code that no longer exists in
this form.

### Task 5 flag — is an alt/title-only disclosure sufficient?

The hero preview card (`src/app/page.tsx:159`) shows a fabricated business
name, a `45%` score, and a `+7%` change with a visible badge reading only
"Ilustrasi" (`src/messages/id.json` `report.exampleBadge`). The full sentence
— "Ilustrasi. Tidak ada hasil bisnis sungguhan." (`landing.heroImageFootnote`)
— exists only in the image `alt` text and the badge's `title` attribute,
neither of which a sighted user reading the page normally encounters (`alt`
is screen-reader/broken-image-only; `title` requires a hover tooltip, which
doesn't exist on touch devices at all).

This agent's view: for a card whose whole content is a fabricated result — a
named business plus specific-looking percentages — a single word
("Ilustrasi") carries real ambiguity for a fast-scrolling visitor; it reads
as a label/watermark rather than a disclosure of fabrication. The full
sentence being sighted-inaccessible undercuts the persistent-disclosure
principle this same codebase enforces elsewhere (Spec 001 AC-11, R-04:
persistent disclosure on every fixture-journey screen). **Not fixing this
without the founder's decision, per the round's instructions** — this is a
copy/design call, not a defect with one correct answer. If the founder wants
it strengthened, the direct fix is making the visible badge text itself carry
(or precede) the full sentence, not just "Ilustrasi."

### Additional findings, not in the original task list (flagged, not fixed)

- **`npm run check` currently fails on the working tree, independent of this
  round.** `format:check` reports `src/lib/audit/contracts.ts`,
  `src/lib/audit/report-language-id.test.ts`, and
  `src/lib/audit/report-language.ts` as needing `prettier --write`. All three
  were already modified, uncommitted files before this round began (visible
  in the pre-round `git status`); this round never opened any of them for
  editing. Not fixed here because the ground rules forbid rewriting existing
  working-tree fixes outside this round's task list, and reformatting
  `contracts.ts` in particular risks masking or colliding with whatever the
  prior round left mid-edit there. Flagging so it isn't mistaken for
  something this round should have caught: **run `prettier --write` on those
  three files (or ask the author of that prior change to do it) before
  treating `npm run check` as green.**
- **`src/lib/audit/report-language.ts` contains a literal NUL byte
  (`DECIMAL_LIKE_PLACEHOLDER = "\x00"` at the byte offset that follows the
  `DECIMAL_LIKE_PERIOD` regex, near the top of the file)** — deliberate
  code (a sentinel used to protect decimal points during sentence
  splitting), not corruption. Worth knowing because it makes `git diff` and
  `file` treat the file as binary ("Binary files a/... and b/... differ"),
  which hides its diff from normal review and from `git diff --check`. Not a
  defect, just a trap for the next reviewer who runs `git diff` on this file
  and sees no readable diff.

---
