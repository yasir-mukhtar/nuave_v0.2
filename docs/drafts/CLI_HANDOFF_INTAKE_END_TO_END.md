# CLI handover: complete Nuave intake journey

Continue the authorized intake work in `/Users/yasir/nuave_v0.2`.
You are the implementation owner for one deliverable: **one complete local
intake journey Yasir can test through normal controls, without authentication
or payment, using the approved Airbnb style and the previously tested flow.**
Finish the working journey and its verification; do not stop at a plan or a
gallery of individual screens.

This handover was checked against local Git history, source files, and GitHub
branch heads on 12 September 2026. Recheck the checkout before editing.

## Latest user direction

Yasir approved fixing the existing screens, then challenged the result because
it showed five isolated screens instead of the flow he had already tested.
He wants the complete intake, including all three branches from the scope
question. His final clarification was **`/intake-prototype.html`**, not
`/intake-preview.html`.

The top strip headed “Pratinjau lima layar” and its five screen tabs are
development preview controls. They are **not the approved product design**.
The quiet Nuave wordmark, four-segment progress, and persistent Back/Next
footer are part of the product shell.

The immediate deliverable runs from the intake entry/reading and brand
confirmation through scope, facts Review, Question Review, and a safe local
audit-start handoff. Bypass login and checkout at the local entry boundary.
Use deterministic preparation/question adapters where a provider would be
needed; the actual navigation, validation, edits, state, and handoffs must
work. Do not make paid/live provider calls or imply a real audit ran.
Producing a live report and implementing production payment are outside this
intake task.

## The correct branch and why it matters

**The earlier Airbnb Gate 1 interaction work is on
`origin/feat/airbnb-intake-rebuild`.** GitHub currently resolves it to:

```text
afd518dd75d436319c7a5f1c31db9d640e2728d3
```

Relevant commits on that branch:

- `ec10b3f`: isolated Airbnb intake shell and `/audit/new-intake` preview.
- `4ede2fd`: approved shell journey contract.
- `955ae90`: September 5 approved experience handoff and HTML workbench.
- `f3a80bd`: service channels, market reach, Review chevrons, and other
  approved amendments.
- **`b2ac154`**: founder Gate 1 interaction findings. Scope selections now
  actually route to branch/product screens; product skips offerings;
  selected chips show checks; market and competitor validation block
  progression correctly. Its commit message records 90 intake unit tests,
  an offline verification pass, and 20 browser checks. These are historical
  results, not a fresh verification of the current deliverable.
- **`afd518d`**: shell-owned `IntakeState`, Review edit transactions,
  dependency invalidation, fact versions, and state regression tests.

Primary implementation paths on that branch:

```text
src/lib/intake/IntakeJourney.tsx
src/lib/intake/navigation.ts
src/lib/intake/state.ts
src/lib/intake/screens-bab1.tsx
src/lib/intake/screens-bab2.tsx
src/lib/intake/fixtures.ts
src/lib/intake/*test*
src/app/audit/new-intake/page.tsx
src/app/audit/new-intake/intake-screens.client.tsx
```

The branch's preview entry is `/audit/new-intake`, enabled by the server
environment variable `NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true`. Its default
entry starts at reading/brand confirmation and does not require checkout.
The optional `arrival=1` includes an arrival flow; it is unnecessary for this
task. URL scenario drivers exist, but the user must be able to choose all
three routes through the scope controls without changing a URL.

**Do not confuse this with `feat/spec-008-g1-facts-context`.** That separate
local branch ends at `e9cd00c` and contains `c974ec4` (Spec 008 confirmed-facts
adapter) plus an older seeded `/audit/v2/intake-preview?demo=1`. Its “G1” is
not the Airbnb Gate 1 interaction work. Preserve it, but do not use it as the
source of the approved complete shell.

## Preserve the current workspace

The root checkout is currently:

```text
branch: codex/spec-007-approved-s2-repair
HEAD:   505ccd49ce857e8726bf85e796edf10f5738878c
```

It has substantial **uncommitted tracked changes and untracked files** from
the previous attempt. Preserve all of them, including this handover. Do not
reset, clean, overwrite, or switch this dirty checkout to another branch.
Do not auto-commit or stash it to simplify your workflow.

GitHub `main` was also verified at `505ccd4`. Local `main` is older; do not
use local `main` as the current baseline. At handover, `origin/main` and the
Airbnb rebuild branch have diverged by 22 main-only and 11 rebuild-only
commits. The rebuild branch is the source of the tested intake, not a
replacement for all recent main changes.

Recommended integration approach: follow `AGENTS.md` by creating an isolated
worktree and a dedicated `codex/` branch from refreshed `origin/main`. Bring
forward the established new-intake module, required design assets/contracts,
and tests from `origin/feat/airbnb-intake-rebuild` without creating commits.
Inspect dependencies and the diff first. Preserve recent main provider and
workflow fixes. Do not blindly import historical CI changes or test
quarantines, and do not blend the new shell with legacy intake renderers.

An unrelated worktree exists at `/Users/yasir/nuave-glm-test` on
`feat/cheaperinference-glm-5-3-flash`; leave it alone. A dev server for the
dirty root may still occupy port 3000. Use a separate available port and
state which checkout it serves.

Useful initial read-only commands:

```bash
git status --short --branch
git worktree list
git ls-remote origin refs/heads/main refs/heads/feat/airbnb-intake-rebuild
git log --oneline origin/main..origin/feat/airbnb-intake-rebuild
git show b2ac154 --stat
git show origin/feat/airbnb-intake-rebuild:src/lib/intake/README.md
```

## References and reading order

Read the listed context, not the whole repository or historical archive.
Use `git show <ref>:<path>` for files absent from the dirty root; do not
switch branches just to read them.

1. Root `AGENTS.md`, `README.md`, `docs/NOW.md`, and `docs/WORKFLOW.md`.
   The current NOW/S2 repair text describes the previous five-screen scope;
   this latest user request expands the task to a complete testable intake.
2. `docs/drafts/NUAVE_INTAKE_EXPERIENCE_HANDOFF.md` from the Airbnb rebuild
   branch. It is explicitly **founder-approved, 5 September 2026** despite
   being stored under `drafts/`.
3. Render and inspect `docs/drafts/nuave-intake-design-workbench.html` from
   that same branch. Its approved SHA-256 is
   `b7adc54fd2d83def25552e25961dd50eba7e63883a217861811e2f394f830a1c`.
4. Read `docs/drafts/NUAVE_NEW_INTAKE_JOURNEY_CONTRACT.md` on that branch
   for route, history, validation, Review edits, and boundary semantics.
   Apply the September 5 amendments over stale clauses: service is
   multi-select, aliases/supporting-source editing is removed, and Review
   rows use full-row chevrons.
5. Read root `intake-prototype.html` as the original approved experience
   reference. It is byte-identical to
   `/Users/yasir/Downloads/intake-prototype.html`; both have SHA-256
   `7795dc17eaf78b1002eab462dc0272e44fea51495c11f6600bbbe211484de6bd`.
   Its `flow()` genuinely branches on the scope answer. However, it is
   older: it still visits offerings for product scope and conditionally skips
   market. Those details were superseded by the September 5 handoff.
6. For the established state and mapping boundary, read the approved Gate 0
   package on the rebuild branch:
   `docs/drafts/INTAKE_EXPERIENCE_CONTRACT.md`,
   `docs/drafts/INTAKE_DATA_CONTRACT.md`, and
   `docs/drafts/INTAKE_FIXTURES_AND_BUDGETS.md`, including their amendments.
   The phase checkpoint on that branch records the approval history:
   `docs/drafts/NUAVE_AIRBNB_INTAKE_PHASE0_CHECKPOINT.md`.
7. Read `docs/DESIGN.md` and the relevant approved Spec 007 boundary clauses
   in `specs/007-intake-airbnb-revamp/SPEC.md` before integrating. Keep the
   existing question/audit contract; do not revive superseded UI rules.

The clean rebuild plan is available at
`origin/docs/airbnb-intake-clean-rebuild-plan` (`483d634`), path
`docs/drafts/NUAVE_AIRBNB_INTAKE_CLEAN_REBUILD_PLAN.md`. It is **not present
in the rebuild branch tree**, although other docs link to it. Read its
state/mapping and Phase 5–6 sections if needed for integration. Older
external-reviewer role instructions are context for that review, not an
instruction for this implementation session to stop at critique.

Reference priority: latest explicit founder instructions → September 5
approved handoff amendments → rendered workbench product screens → approved
journey contract → amended Gate 0 package/rebuild plan. The root prototype
remains the original reference; it does not override later approved changes.
Do not copy workbench navigation tabs, hash routing, or simplified demo state
as the product implementation.

## What the previous session changed, and what remains incomplete

The dirty repair primarily touches `src/app/audit/intake/`,
`src/app/audit/AuditWorkflow.tsx`, `AuditStages.tsx`, shared selection
components, typography tokens, two intake browser test files, and status
docs. The complete changed-file list and prior results are in:

```text
specs/007-intake-airbnb-revamp/S2_REPAIR_PLAN.md
specs/007-intake-airbnb-revamp/S2_REPAIR_VERIFICATION.md
```

It repaired presentation for Scope, Branch, Offerings, Review, and the
Question Review frame. It also added some Review save/cancel handling in
the legacy controller. It restored the approved handoff and workbench as
untracked local files. These changes were not committed, pushed, or deployed.

The major error was adding this separate gallery:

```text
src/app/audit/v2/intake-preview/IntakePreviewDemo.tsx
src/app/audit/v2/intake-preview/demo.module.css
src/app/audit/v2/intake-preview/demoData.ts
```

At `/audit/v2/intake-preview?demo=1`, it bypasses `AuditWorkflow`, advances
through a fixed five-screen array regardless of scope, and leaves most
Review owners unavailable. Without `demo=1`, that route uses the legacy
controller with only five replacement surfaces. Neither is the approved
complete Airbnb journey. Do not make the gallery the final deliverable or
extend the per-screen legacy replacement scheme.

The dirty repair passed `npm run verify`: 836 unit tests, 91 browser tests,
and both builds, recorded in its verification document. That proves its
bounded checks passed; it does **not** establish a complete correct intake
flow or founder visual acceptance. The full log was saved outside Git at
`/private/tmp/nuave-s2-repair-verify.log`.

The correct rebuild branch also has unfinished boundary work. Its
`QuestionsScreen` explicitly says generation is not connected, derives
questions from fixtures, and keeps wording edits local to the mounted
screen. Its review/start callbacks default to advancing to questions and a
terminal state. Inspect and complete those boundaries for the local journey;
do not claim its historical Gate 1 pass already proves full integration.

## Required behavior

Use one complete shell and one committed intake state. Route from the user's
committed choices, not a tab index or query parameter.

```text
Reading → Brand confirmation → Scope

Whole brand:   Category → Offerings
One location: Location → Category → Offerings
One product:  Product → Category                 [skip Offerings]

All routes: Customer reasons → Service channels → Market reach
            → Competitors → Optional fact → Facts Review
            → Question preparation → Question Review → Local start handoff

Wrong brand: Brand confirmation → Correct brand/source → Reading
             → Brand confirmation
```

- Back preserves answers, follows stable states actually visited, and skips
  processing/unvisited/inactive branches.
- Every visible choice works. Prepared options can be kept, removed,
  reselected, corrected, or supplemented through approved fallback controls.
  Empty prepared locations/products still allow a valid manual target.
- Scope and exact target affect downstream suggestions and Review. Do not
  merely relabel whole-brand fixture answers as branch/product answers.
- Offerings require at least one for whole-brand/location scope. Customer
  reasons and the public fact are optional.
- Service supports one or more exact channels: at the business location,
  at the customer location, delivered, online. No “mixed” option.
- Market always appears. Around-one-area requires one area; selected-areas
  requires at least one. Nationwide/international clears active area data.
- Competitors require one or more names or explicit no-direct-competitor
  mode. The two modes are mutually exclusive.
- Every Review row opens its owner. Save returns to updated Review after
  necessary dependent reconfirmation; Cancel/Back restores unchanged Review.
  An edit must not resume the rest of the normal linear journey.
- Changing scope/target/other material parents clears incompatible state
  and requires the appropriate reconfirmation. Review omits inactive rows,
  general offerings for product scope, and aliases/supporting-source edits.
- Review freezes exactly the active confirmed answers for question
  preparation. Question Review uses a valid ten-slot pack under the existing
  question contract. Edits persist through Back/Next, and a material intake
  edit invalidates stale questions before start. A fixture adapter may replace
  a network provider, but it must consume the committed input rather than
  always showing an unrelated fixed pack.
- Loading, failure, retry, correction, and cancel are real controlled
  states. Simulated failure never creates a successful prepared identity.
- Use the approved mobile-first composition throughout: one heading, quiet
  wordmark, four-segment progress, correct control grammar, fixed footer,
  and no development screen tabs in the normal walkthrough. Use the repo's
  shadcn/Base UI, Tabler, and typography rules for applicable shared UI.

## Implementation scope and boundaries

Expected work: the established `src/lib/intake/` module and its preview route,
the smallest preparation/question adapters and state boundary needed for this
local journey, relevant design tokens/primitives, focused tests, and status/
verification documentation. Inspect and preserve existing boundary contracts
before changing an adapter. Do not redesign question generation or silently
drop intake meaning to fit an older payload type.

Keep production routing, auth/payment/entitlement rules, provider configuration,
audit execution, reporting, and deployment behavior intact. Do not activate
the new journey for live customers. Do not introduce another UI stack or
copy legacy intake renderers into the new shell. Do not read `archive/`.
Do not commit, push, merge, deploy, contact anyone, or make live provider calls
without a separate explicit founder request.

Before editing, briefly state the objective, bounded files, and any real
blocker. Continue routine reversible work autonomously. If a genuinely
unresolved product decision blocks a specific boundary, explain that decision
in simple words and give a recommendation; continue unaffected work. Do not
ask Yasir to approve an already approved style or re-identify a branch that
can be verified from Git.

## Verification and delivery

1. Reproduce the fixed-sequence gallery failure before replacing it as the
   primary preview. Preserve/add regression coverage for actual scope-driven
   navigation and state; do not just test headings or tab switches.
2. Walk all three scope routes using the UI from one clean local entry.
   Exercise wrong-brand correction, empty target suggestions, both area
   branches, nationwide/international clearing, no-direct-competitor mode,
   Back, and every Review Save/Cancel path.
3. Verify state survives screen remounts and cannot be overwritten by an
   older parent snapshot. Verify the existing/new preview's agreed refresh
   behavior without colliding with live session keys. Confirm Review input,
   question pack version, and start handoff agree; stale packs cannot start.
4. Compare all screens and important selected/empty/manual states with the
   approved workbench at mobile and desktop widths. Check narrow-screen
   overflow, keyboard/focus behavior, and footer reachability. Keep screenshots
   of the sequential journeys, not only isolated screen samples.
5. Confirm the default local walkthrough requires no login/payment, performs
   no live provider calls, and contains no placeholder/dead-end owner screen.
6. Run appropriate focused checks while iterating and **`npm run verify`**
   before declaring implementation ready. Keep existing main tests enabled;
   do not use historical test quarantines to obtain a green result. Inspect
   the complete diff and remove temporary diagnostics.
7. Record actual results and remaining limitations in
   `specs/007-intake-airbnb-revamp/END_TO_END_INTAKE_VERIFICATION.md` in the
   implementation checkout. Update `docs/NOW.md` to the actual current
   deliverable when the work changes that status. Do not label founder visual
   acceptance or a live-provider run as passed unless it happened.

Leave a working local server available for Yasir. For the established route,
the startup command after integration should be equivalent to:

```bash
NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true npm run dev -- --port 3001
```

Verify the actual command/port and provide one clickable URL, normally
`http://localhost:3001/audit/new-intake`, plus short instructions for choosing
the three scopes and testing edits. Report the implementation branch and
worktree, changed files, checks/results, honest remaining limits, and the next
smallest useful action: Yasir's complete journey walkthrough. Do not describe
five repaired screens as a finished journey.
