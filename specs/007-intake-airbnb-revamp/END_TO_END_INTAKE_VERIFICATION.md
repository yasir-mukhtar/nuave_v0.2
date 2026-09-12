# Complete local intake verification

Observation date: 2026-09-12, Asia/Jakarta. Founder requested work stop at 13:58,
then explicitly resumed the session. Final results checked after resumption.

## Deliverable and checkout

One local journey starts at reading/brand confirmation, routes from committed
scope choices, supports facts Review transactions, prepares ten questions, and
ends at an explicitly simulated downloadable start handoff. No real audit or
report is produced. Login and checkout are not required at this local entry.

- Implementation worktree: `/private/tmp/nuave-intake-complete`
- Branch: `codex/complete-local-intake`
- Baseline: refreshed `origin/main`, `505ccd49ce857e8726bf85e796edf10f5738878c`
- Approved interaction source: `origin/feat/airbnb-intake-rebuild`,
  `afd518dd75d436319c7a5f1c31db9d640e2728d3`
- Root dirty checkout `/Users/yasir/nuave_v0.2` and its files were preserved;
  no reset, switch, or stash was performed. Implementation and verification
  initially remained uncommitted; the founder subsequently authorized committing
  and pushing the complete implementation and handover on its dedicated branch.
  No merge or deployment is included in that authorization.
- Unrelated `/Users/yasir/nuave-glm-test` was not changed.

Start in this implementation checkout:

```sh
NUAVE_NEW_INTAKE_PREVIEW_ENABLED=true npm run dev -- --port 3001
```

Open <http://localhost:3001/audit/new-intake>. Choose the desired scope using
the three scope controls. Use `Uji perjalanan baru` after the local handoff to
start another route. Opening a fresh browser tab also starts a separate session.
The original `intake-prototype.html` is a design/behavior reference, not the
five-screen gallery and not the implementation route.

## Implemented behavior

- Whole brand: Category → Offerings. Location: Location → Category → Offerings.
  Product: Product → Category, with Offerings omitted.
- All routes continue through optional customer reasons, multi-select exact
  service channels, always-present market reach, competitors, optional public
  fact, Facts Review, controlled question preparation, Question Review, and
  local start.
- Manual location/product controls work with empty suggestions. Exact targets
  and category change the deterministic suggestions; unknown targets receive
  conservative manual fallbacks, not relabeled whole-brand candidates.
- One-area and selected-area validation, nationwide/international clearing,
  required offerings, and mutually exclusive named/no-direct competitors work.
- Every active Review row opens its owner. Save reconfirms only dependencies
  and returns to Review; Cancel/Back restores the original committed snapshot.
- Wrong identity correction returns through reading. Failures never create a
  successful identity. Reading and question failures have controlled recovery.
- Functional child updates cannot replace newer parent answers. Stable Back
  history excludes processing and inactive branches.
- `nuave.localIntake.v1` is a separate, schema-validated sessionStorage key.
  Refresh keeps committed answers and saved question edits, discards unfinished
  Review/correction drafts, and rejects corrupt/stale packs. No live key is used.
- The frozen question input retains all active confirmed meanings, including
  exact target/address, optional reasons/fact, all service channels and names.
  The existing ten-slot, six-unbranded/four-branded question contract is used.
  Material intake edits invalidate old questions; start validates the input
  fingerprint, fact version, wording and fixed slot metadata again.
- The JSON handoff explicitly marks `auditExecuted: false`. No live provider,
  auth, payment, audit execution, reporting, or deployment endpoint is called.
- Quiet wordmark, four-segment progress, one heading, canonical Geist tokens,
  shared shadcn/Base UI controls, Tabler icons and persistent footer are used.
  Development screen tabs are absent. The Next development indicator is disabled
  because its badge obscured Back on narrow screens.

## Reproduction and evidence

The dirty-root gallery was reproduced before integration, using ordinary scope
controls at `/audit/v2/intake-preview?demo=1`. All three choices advanced to
Location; product then visited Offerings. Six Review owners were unavailable,
and question edits reset on remount. The dirty gallery remains preserved; it is
not the deliverable and was not extended.

Screenshots and diagnostics are local outside Git:

- `/private/tmp/nuave-gallery-failure-*.png`: original fixed-sequence failure.
- `/private/tmp/nuave-reference-*.png`: rendered approved workbench, mobile and
  desktop, including selected and Review states.
- `/private/tmp/nuave-intake-visual/`: 69 sequential captures from six complete
  location/product walkthroughs at 320, 390 and 1280px. All checked widths had
  no horizontal overflow; footer controls remained reachable, keyboard focus
  was visible, and no external or API request occurred.
- `/private/tmp/nuave-intake-final-journeys/`: canonical browser regression
  captures preserved before later verification configurations replace
  `test-results/`; sequential screenshots for all three complete scope journeys.
- `/private/tmp/nuave-intake-complete-verify.log`: latest full verification log.

Reference hashes were checked before implementation:

- Approved workbench:
  `b7adc54fd2d83def25552e25961dd50eba7e63883a217861811e2f394f830a1c`
- Root and Downloads `intake-prototype.html`:
  `7795dc17eaf78b1002eab462dc0272e44fea51495c11f6600bbbe211484de6bd`

## Verification results

The final canonical gate ran with `NUAVE_E2E_PORT=3300 npm run verify`
to avoid the unrelated root server on port 3000. All existing main tests remain
enabled. The preview-disabled suite additionally checks that query parameters
cannot enable this route without its server flag.

Before the final history correction: 998 unit tests passed, typecheck passed,
lint had zero errors and 17 existing warnings, formatting and typography passed,
and both Next/OpenNext builds passed. Its browser child completed with 87/89
passing after the parent was interrupted. Two new failure assertions needed
correction: the F6 fixture has no prepared identity even on retry, so it must
remain unsuccessful until source correction; and Next's route announcer made
an unscoped alert locator ambiguous. The final gate reruns the full suite after
those assertions and the Review scope-edit Back-history regression were fixed.
The earlier run is not recorded as a completed canonical pass.

Final gate: **PASS**, confirmed from the complete log at 13:59 after the founder
resumed work. Typecheck, formatting, typography, 998 unit tests across 83 files,
both Next/OpenNext builds, and all 95 browser tests passed: 89 primary tests
(including all ten new intake regressions), three forced-failure tests and three
preview-disabled tests. Lint reported zero errors and 17 existing warnings.
The log ends with `Offline verification passed.` The attempted cutoff process
stop was not executed; the existing verifier completed, and its result was only
confirmed after resumption. Final diff whitespace checks passed.

The founder accepted the local preview's logic, layout, and flow on 2026-09-12.
This acceptance does not activate production. Sequential evidence contains 31 preserved canonical
PNGs, plus the 69 visual QA captures. The isolated server is restarted on port
3001 for handoff; verification ports are no longer running. A fresh browser
check returned HTTP 200, reached brand confirmation and all three scope controls,
found no gallery strip, and observed zero external/API requests. The interrupted
first verifier had left its exact dummy-only build environment file; it was
identified by creation time/content and removed after the successful final gate.
No customer credentials were copied into the worktree.

The ten new browser regressions cover all three complete routes and exact
handoff input, persistent question edits and stale invalidation, every Review
owner Save/Cancel, dependency reconfirmation, market branches/clearing,
no-direct mode, wrong identity and Back, empty/manual targets, reading failure,
and question failure/retry. Manual-target coverage asserts no console errors;
it caught and now protects the shared disclosure default-state fix.

## Changed files

- `src/lib/intake/`: established approved shell, route/state/control modules,
  fixtures/contracts and tests; completed `IntakeJourney.tsx`, `preparation.ts`,
  `local-session.ts`, `local-questions.ts`, `questions-screen.tsx`, and focused
  unit/DOM regression files. No legacy intake renderer is embedded.
- `src/app/audit/new-intake/page.tsx` and `intake-screens.client.tsx`: server-flag
  gated local entry. Diagnostic fixtures affect preparation, not scope routing.
- `src/components/product/selection/Chip.tsx` and its tests: optional selected
  checkmark, preserving existing consumers' default removal affordance.
- `src/components/product/selection/Reveal.tsx`: freeze initial uncontrolled
  disclosure state so adding options does not trigger a Base UI warning.
- `next.config.ts`: disable local development badge.
- `playwright.config.ts`, `tests/e2e/shared-config.ts`,
  `tests/e2e/preview-disabled.spec.ts`, `tests/e2e/new-intake-journey.spec.ts`:
  full-journey and disabled-route coverage; configurable verification port.
- Seven approved `docs/drafts/` handoff/workbench/Gate 0 reference files restored
  from the rebuild branch; `docs/NOW.md` and this verification record updated.

Production providers, workflow/entitlement contracts, legacy routes, payment,
audit execution, reports, package dependencies and CI deployment gates remain
unchanged. Historical quarantines were not imported.

## Honest limits and next action

These are deterministic, explicitly local examples, not fetched business facts
or AI evidence. Session resume is same-tab only. Failure fixtures are controlled
examples (`F6`, whose missing identity requires source correction after retry,
and `failure=questions`), not a live-provider resilience claim.
Final Question Review/local-start screenshots have no significant mobile layout
blocker; the small “6 pertanyaan” count can wrap on a narrow group header, a
remaining cosmetic detail. Yasir subsequently approved the latest preview
for logic, layout, and flow on 2026-09-12. No live-provider run, production
activation, or live report is claimed. The next smallest useful action is
branch closeout and PR preparation. Follow-up inspection found HEAD at
`505ccd4` with implementation changes staged; commit/push authorization in the
earlier handover is not evidence that those actions completed.
