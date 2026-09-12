# Handover: complete local Nuave intake

> Updated: 12 September 2026, after founder acceptance of the local preview.
> Status: implemented, offline-verified, founder-accepted locally, committed and pushed; PR pending.
> This handover accompanies the implementation on its dedicated branch; a root copy is retained for discovery.

## Read this first: use the implementation branch

**The complete implementation and this handover belong to
`codex/complete-local-intake`.** Its current local worktree is
`/private/tmp/nuave-intake-complete`; continue there after checking its status.
The founder explicitly authorized committing and pushing this work after the
initial handover. Local HEAD and GitHub's `codex/complete-local-intake` both
resolve to `5821d2fb70fe8217182683aba5e5a951544f4b8f` (`feat(intake): complete
local intake journey`). The implementation worktree was clean before this
documentation follow-up. Commit and push are complete; no PR exists yet.

If recovery is needed, fetch `origin/codex/complete-local-intake` and verify
that it includes `5821d2f`. Preserve the dirty root checkout; use a separate
worktree.
The screenshots and logs listed below are still outside Git and may not survive
cleanup of `/private/tmp`. Nothing was merged or deployed.

The root `/Users/yasir/nuave_v0.2` remains dirty on
`codex/spec-007-approved-s2-repair` at `505ccd4`. Its earlier five-screen repair,
untracked gallery and previous handover are intentionally preserved. Root
`docs/NOW.md` still describes that earlier work, not the complete implementation.
Use the implementation worktree's `docs/NOW.md` for this deliverable.

This handover supersedes the incomplete-implementation status in the older
root-only `docs/drafts/CLI_HANDOFF_INTAKE_END_TO_END.md` (under
`/Users/yasir/nuave_v0.2`). That older handover remains useful for the original
authorization and provenance, but is not needed to run this branch.
Do not resume its gallery or recreate the integration from scratch.

The unrelated `/Users/yasir/nuave-glm-test` worktree must remain untouched.

## Current outcome and scope

Yasir authorized one complete local intake using the approved Airbnb-style
shell, all three scope branches, normal controls, facts Review edits, Question
Review and a safe local audit-start handoff. This is implemented at:

**<http://localhost:3001/audit/new-intake>**

The server was left running from `/private/tmp/nuave-intake-complete` and
returned HTTP 200 when rechecked at 14:04 Jakarta. Recheck availability before
claiming it remains running. Startup command, from that worktree:

```sh
cd /private/tmp/nuave-intake-complete
NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true npm run dev -- --port 3001
```

No login or payment is required. Preparation and questions use deterministic
local adapters, not live providers. The end is a downloadable JSON handoff
explicitly marked `auditExecuted: false`, not an audit result or report.
Production routing, entitlement, provider configuration, execution, reporting,
payment and deployment behavior were not changed.

Yasir initially requested a 13:58 stop, then explicitly said “continue working.”
The completed verification log was confirmed after resumption. That earlier
deadline is not an instruction to halt a fresh authorized follow-up task.

## First checks for the next agent

Run these in the implementation worktree before editing:

```sh
git status --short --branch
git worktree list
git rev-parse HEAD
git diff --check
```

Expected branch: `codex/complete-local-intake`. Its original baseline is
`505ccd49ce857e8726bf85e796edf10f5738878c`, refreshed `origin/main` when this
session began; the committed implementation is `5821d2f`. The root
repair branch still points to the baseline and has unrelated uncommitted work.
Recheck status rather than assuming either checkout is clean. Do not reset,
clean, switch, stash or auto-commit user changes.

The approved shell was imported selectively from
`origin/feat/airbnb-intake-rebuild` at
`afd518dd75d436319c7a5f1c31db9d640e2728d3`. This included the established
`src/lib/intake/` module, preview entry, tests and necessary approved references.
Historical CI changes and test quarantines were not imported. Recent main
provider/workflow fixes were retained.

Do not confuse that source with `feat/spec-008-g1-facts-context`: its “G1” was
not the approved Airbnb interaction branch. Do not replace the complete shell
with per-screen legacy renderers.

## Required context, in order

Read in `/private/tmp/nuave-intake-complete`, unless another location is named:

1. `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/WORKFLOW.md`.
2. `specs/007-intake-airbnb-revamp/END_TO_END_INTAKE_VERIFICATION.md` — actual
   checks, changes, evidence and limits from this implementation.
3. `src/lib/intake/README.md` — current ownership and local boundary semantics.
4. `docs/drafts/NUAVE_INTAKE_EXPERIENCE_HANDOFF.md` and rendered
   `docs/drafts/nuave-intake-design-workbench.html`. The handoff is explicitly
   founder-approved on 5 September despite its `drafts/` location.
5. `docs/drafts/NUAVE_NEW_INTAKE_JOURNEY_CONTRACT.md`, applying the September 5
   amendments: multi-select service, no aliases/supporting-source editing,
   full-row Review chevrons, product skips Offerings, Market always appears.
6. `docs/DESIGN.md` and relevant approved boundaries in
   `specs/007-intake-airbnb-revamp/SPEC.md` before changing UI or mapping.

If changing the data boundary, additionally read the restored Gate 0 references:
`INTAKE_EXPERIENCE_CONTRACT.md`, `INTAKE_DATA_CONTRACT.md`,
`INTAKE_FIXTURES_AND_BUDGETS.md`, and
`NUAVE_AIRBNB_INTAKE_PHASE0_CHECKPOINT.md` under `docs/drafts/`.

The original root `intake-prototype.html` is the original experience reference,
not `intake-preview.html`. Its older branching details do not override September
5 amendments. Workbench tabs/hash navigation are reference controls, not product
design. The old “Pratinjau lima layar” strip is not approved product UI.

Verified source hashes:

- Workbench: `b7adc54fd2d83def25552e25961dd50eba7e63883a217861811e2f394f830a1c`
- Root/Downloads prototype:
  `7795dc17eaf78b1002eab462dc0272e44fea51495c11f6600bbbe211484de6bd`

Do not read `archive/` or load unrelated historical planning.

## Implemented flow and state

```text
Reading → Brand confirmation → Scope

Whole brand:  Category → Offerings
One location: Location → Category → Offerings
One product:  Product → Category                  (no Offerings)

All: Customer reasons → Service channels → Market reach → Competitors
     → Optional fact → Facts Review → Question preparation
     → Question Review → Local start handoff

Wrong brand: Brand confirmation → Correct name/source → Reading
             → Brand confirmation
```

- Scope/target choices, not URL or tab indexes, determine navigation and
  downstream candidates. Unknown targets have conservative manual fallbacks.
- Required offerings, target/address, service, market areas and competitors
  validate. Reasons/fact are optional. No-direct competitors excludes names;
  nationwide/international clears active areas. Service has four exact channels.
- `IntakeJourney.tsx` owns committed answers and stages functional child updates.
  It owns stable Back history, preparation/failures, Review transactions and start.
- Review Save reconfirms only affected dependencies, then returns to Review.
  Cancel/Back restores the entire original transaction, including the old pack.
  Successful scope edits rebuild Back history from actually confirmed active
  owners, so a newly selected product/location is not skipped.
- `preparation.ts` consumes the exact selected entity and category. It never
  fetches a source. Failed preparation never silently creates a brand identity.
- `local-questions.ts` freezes the active confirmed input without discarding
  optional reasons/fact, multiple service channels/comparators, reach or target.
  It uses the existing canonical ten-slot, six-unbranded/four-branded contract.
- `questions-screen.tsx` has parent-owned wording edits. Saved edits survive
  Back/Next/remount/refresh. Material intake edits invalidate stale questions;
  local start revalidates slot metadata, wording, input fingerprint and version.
- The only session key is `nuave.localIntake.v1` in sessionStorage. Refresh
  restores committed state and validated saved questions, drops unfinished
  Review/correction drafts, and rejects incompatible/corrupt records.
  It never uses live workflow keys. Resume is same-tab, not durable/cross-device.
  The terminal handoff UI is not persisted: refreshing it returns to the saved
  Question Review, from which the validated local handoff can be created again.
- The shell uses the quiet wordmark, four progress segments, one heading,
  persistent footer, canonical Geist typography, shadcn/Base UI and Tabler.

## Changed file map

All implementation paths below are relative to the implementation worktree:

- `src/lib/intake/`: complete shell, navigation/state, preparation and question
  adapters, local session parser, both screen modules/CSS, fixtures, contracts,
  README and unit/DOM regressions.
- `src/app/audit/new-intake/page.tsx`, `intake-screens.client.tsx`: server-flag
  gated route, no production navigation link or authentication/payment entry.
- `src/components/product/selection/Chip.tsx`, `Chip.test.tsx`: optional selected
  checkmark, preserving legacy consumers' default removal affordance.
- `src/components/product/selection/Reveal.tsx`: freezes initial uncontrolled
  `defaultOpen`; adding a manual row no longer triggers Base UI console errors.
- `next.config.ts`: hides the Next development badge that obscured mobile Back.
- `playwright.config.ts`, `tests/e2e/shared-config.ts`,
  `tests/e2e/new-intake-journey.spec.ts`, `tests/e2e/preview-disabled.spec.ts`:
  full-journey coverage, disabled-route protection and configurable test port.
- Seven restored approved reference files under `docs/drafts/`, plus
  `docs/NOW.md` and `END_TO_END_INTAKE_VERIFICATION.md`.

The root repo was not changed during implementation. This new root handover is
the only file added by the subsequent documentation request; the old handover
and all root user edits remain untouched.

## Verification: actual results, not historical claims

**`NUAVE_E2E_PORT=3300 npm run verify` passed** on the final implementation:

- Typecheck, formatting and typography: passed.
- Lint: zero errors, 17 existing warnings.
- Unit tests: 998 passed across 83 files.
- Browser tests: 95 passed — 89 primary, three forced-failure, three disabled.
- Both Next and OpenNext/Cloudflare builds: passed; no deployment performed.
- Final diff whitespace check: passed.

All ten new intake browser regressions passed: three complete scope routes and
exact handoffs; question persistence/stale invalidation; Review Save/Cancel and
dependency reconfirmation; market branches/clearing/no-direct mode; wrong-brand
Back behavior; empty/manual targets; reading retry/correction; question failure
and retry. Existing main tests stayed enabled.

The old gallery was first reproduced: every scope advanced to Location,
product visited Offerings, six Review owners were unavailable and question
edits reset on remount. This failure was not mistaken for the complete journey.

Visual checks covered six sequential location/product walkthroughs at 320,
390 and 1280px: no horizontal overflow, reachable footer controls, visible
keyboard focus, and zero external/API requests. The final server smoke check
reached all three scope controls, had no gallery strip and made no API/provider
request. On 12 September, Yasir reported reviewing the latest local preview
and approved its logic, layout, and flow.

Evidence remains local outside Git:

- `/private/tmp/nuave-intake-complete-verify.log` — complete log ending
  `Offline verification passed.`
- `/private/tmp/nuave-intake-final-journeys/` — 31 preserved sequential canonical
  PNGs; copied before later browser configurations replaced `test-results/`.
- `/private/tmp/nuave-intake-visual/` — 69 sequential responsive QA captures.
- `/private/tmp/nuave-reference-*.png` — rendered approved reference screens.
- `/private/tmp/nuave-gallery-failure-*.png` — original failure reproduction.
- `/private/tmp/nuave-intake-final-entry.png` — final running entry smoke capture.

Before rerunning `npm run verify`, stop only this worktree's dev server: the
build and test servers share its `.next` directory/lock. Use port 3300 for the
primary suite if 3000 is occupied, then restart port 3001 for Yasir. Preserve
screenshots before repeated Playwright configurations replace `test-results/`.
Use graceful process shutdown: an earlier interrupted verifier left its own
dummy build env file, which was safely identified and removed after the final
pass. No customer credentials were copied into this worktree.

## How Yasir can test, and what remains

At the single normal entry, choose each scope through the UI. Continue to
Facts Review, open rows, exercise Save/Cancel and Back, edit a question and
download the local handoff. `Uji perjalanan baru` starts another route after
handoff. A fresh tab/session avoids restoring the previous committed state.

Optional recovery examples require a fresh local session. Changing a query in
an existing tab does not override restored `nuave.localIntake.v1`; use a fresh
browser context or remove only that key. Do not clear unrelated live storage.

- `?fixture=F2`: empty target suggestions; add a manual location/product.
- `?fixture=F4`: wrong identity; correct its name/source normally.
- `?fixture=F6`: no prepared identity. Retry stays unsuccessful until correction;
  do not “fix” it by manufacturing a successful brand from missing data.
- `?failure=questions`: one preparation failure with retry/cancel recovery.

No material implementation blocker is recorded. Minor cosmetic limit: the small
“6 pertanyaan” group count can wrap at a narrow width. All examples remain
deterministic, not verified business facts or live AI evidence. Durable resume,
real provider preparation, actual audit/report output, production payment and
live activation are outside this local intake deliverable.

**Founder acceptance: complete for the local preview.** Yasir confirmed on
12 September: “The logic works, the layout and flow works as expected.” This
accepts the local intake experience; it does not validate real preparation,
AI questions, audit execution, or a report.

**Next smallest useful action: prepare the accepted implementation PR.**
Commit/push are complete at `5821d2f`; review the complete branch diff and
verification evidence and prepare the pull request for review. Merge remains
a separate founder decision because main triggers deployment.

Separately, prepare the bounded integration specification connecting
confirmed intake facts and approved questions to the existing audit/report
engine. Reconcile the Spec 008 question-generation boundary before implementing
that connection. Prove the connection offline first; the subsequent explicitly
authorized real run must pass the Spec 003 report-quality gate. Do not redesign
the accepted intake or treat the JSON handoff as a report.
Further code changes require focused regressions and a fresh full verify before
declaring the changed implementation ready.

The founder explicitly authorized the commit and push of this implementation
and handover. That does not authorize merging, deployment, publishing, contacting
anyone or paid/live provider calls. Further external actions still require their
own explicit request; do not infer them from the completed commit/push.
