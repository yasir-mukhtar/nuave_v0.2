# Adversarial Review — Phase 1 Simulated Journey Shell

## Scope and executed verification

This review assessed the current `main` working tree read-only. Existing user changes were left untouched.

Commands executed:

- `npm run test:audit` — passed: 17 files, 263 tests.
- `npm run check` — passed with 12 warnings.
- `npm run build` — passed.
- `npm run test:e2e` — passed: 26 enabled-mode, 3 forced-failure, and 2 disabled-mode tests; 31 total.

Passing these commands does not validate every acceptance criterion; several tests do not assert what their names or the verification record claim.

## Acceptance-criteria verdicts

Verdicts assess the current realigned implementation. `N/A` means Spec 002 deliberately replaced the original Phase 1 behavior; it does not validate the historical AC.

| AC | Verdict | Evidence |
|---|---|---|
| AC-01 | **N/A** | The original landing-page fixture entry was superseded. The current test asserts that the landing page has no fixture CTA, then enters by direct URL: [fixture-journey.spec.ts:44](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:44). This conflicts with the original landing-to-report gate in [END_TO_END_PLAN.md:453](/Users/hy4-mac-006/nuave_v0.2/docs/END_TO_END_PLAN.md:453). |
| AC-02 | **MET** | Enablement is server-only in [config.ts:12](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/config.ts:12); the server page returns unavailable before mounting the client at [page.tsx:48](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/page.tsx:48). The disabled test seeds a ready state and still receives unavailable: [preview-disabled.spec.ts:15](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/preview-disabled.spec.ts:15). |
| AC-03 | **N/A** | Northstar `goldenBrief` was replaced by the frozen Kopi Taman Senja fixture during realignment. |
| AC-04 | **MET** | Facts gate UI is at [FixtureJourney.tsx:654](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:654), with enforcement at [FixtureJourney.tsx:1337](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:1337). Error behavior is asserted at [fixture-journey.spec.ts:277](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:277). Crafted storage can bypass it; see Finding 5. |
| AC-05 | **N/A** | The `goldenPrompts` gate was replaced by the realigned frozen-question workflow. |
| AC-06 | **N/A** | Northstar scope was replaced with Kopi Taman Senja and a reordered offer-preview flow. |
| AC-07 | **N/A** | The original AC forbade numeric pricing; the realigned flow intentionally shows `Rp99k` and `Bayar Rp99.000` at [FixtureJourney.tsx:323](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:323). The replacement simulated-payment screen contains the no-charge disclosure at [FixtureJourney.tsx:425](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:425) and confirmation at [FixtureJourney.tsx:454](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:454). |
| AC-08 | **MET** | Simulation is labelled at [FixtureJourney.tsx:929](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:929), status is `aria-live` at [FixtureJourney.tsx:946](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:946), and local processing is implemented at [FixtureJourney.tsx:1258](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:1258). The e2e transition assertion is weak. |
| AC-09 | **N/A** | The original 9-complete/1-failed golden report was replaced by a 10/10 frozen report. The replacement has an evidence-fidelity defect in Finding 4. |
| AC-10 | **MET** | Screen/print share report rows at [FixtureReportView.tsx:401](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureReportView.tsx:401), with print controls hidden at [fixture.module.css:1605](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/fixture.module.css:1605). The test emulates print media but does not render an actual PDF: [fixture-journey.spec.ts:1032](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:1032). |
| AC-11 | **MET** | Fixture disclosure is persistent at [FixtureJourney.tsx:47](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:47) and report/print disclosure is at [FixtureJourney.tsx:66](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:66). The test checks the labelled container rather than the required wording. |
| AC-12 | **NOT MET** | `offerRevealed` is local-only at [FixtureJourney.tsx:1172](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:1172); revealing it only changes local state at [FixtureJourney.tsx:1320](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:1320). It is absent from persisted state [state.ts:23](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/state.ts:23). Refresh tests omit this state: [fixture-journey.spec.ts:595](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:595). |
| AC-13 | **NOT MET** | Loader reads only `.v3` at [state.ts:20](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/state.ts:20) and [state.ts:180](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/state.ts:180). The purported v1/v2 test writes a v2 object under the v3 key because the helper always uses the current key: [helpers.ts:19](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/helpers.ts:19), [helpers.ts:149](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/helpers.ts:149), [fixture-journey.spec.ts:682](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:682). |
| AC-14 | **NOT MET** | Start over removes only `.v3` at [state.ts:215](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/state.ts:215), leaving old fixture-owned `.v2` state behind. |
| AC-15 | **MET**, current implementation only | Current navigation/footer use local `/logo-nuave.svg` at [LandingNav.tsx:148](/Users/hy4-mac-006/nuave_v0.2/src/components/LandingNav.tsx:148) and [Footer.tsx:79](/Users/hy4-mac-006/nuave_v0.2/src/components/Footer.tsx:79). The no-side-effects e2e test passed, but its coverage has material blind spots (Finding 7). |
| AC-16 | **MET** | Failure UI is local at [FixtureJourney.tsx:1048](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:1048). Forced-failure tests passed, including [preview-failure.spec.ts:25](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/preview-failure.spec.ts:25). |
| AC-17 | **MET** | Keyboard tests use Tab/Space/Enter at [fixture-journey.spec.ts:870](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:870); mobile overflow/click tests are at [fixture-journey.spec.ts:1002](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:1002). Modal focus containment is untested. |
| AC-18 | **MET** | Reduced-motion test passed at [fixture-journey.spec.ts:845](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:845), though it does not verify every intermediate status. |
| AC-19 | **MET**, historically | `git diff 83e723c^ 83e723c -- src/lib/audit src/app/audit src/app/api/audit` showed no Phase 1 changes under `src/lib/audit/**`; current `npm run test:audit` also passed 263 tests. |
| AC-20 | **MET** | `npm run check` and `npm run build` passed; check reported 12 warnings. |
| AC-21 | **UNVERIFIABLE** | No human answer record exists. The verification header says independent verification is pending at [VERIFICATION.md:3](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/VERIFICATION.md:3), while its verdict says Pass at [VERIFICATION.md:148](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/VERIFICATION.md:148). |

## Findings

### 1. Major — Verification record is contradictory and not reproducibly pinned

The record says “Pending independent verification” and “Builder only” at [VERIFICATION.md:3](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/VERIFICATION.md:3), says AC-21 and independent confirmation remain open at [VERIFICATION.md:118](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/VERIFICATION.md:118), but declares “Pass — Verified” at [VERIFICATION.md:148](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/VERIFICATION.md:148). The spec remains `Implementing` at [SPEC.md:3](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/SPEC.md:3). `git log` showed verification commit `127090c` one second before realignment commit `05640e3`; the record does not pin either revision.

This matters because the old Northstar path and the current Kopi/v3 path are different artifacts. Checking out each produces different AC behavior, yet the record treats them as one verified implementation.

### 2. Major — Landing-to-report exit gate regressed

The Phase 1 exit gate requires one automated browser journey from landing to report at [END_TO_END_PLAN.md:453](/Users/hy4-mac-006/nuave_v0.2/docs/END_TO_END_PLAN.md:453) and [END_TO_END_PLAN.md:473](/Users/hy4-mac-006/nuave_v0.2/docs/END_TO_END_PLAN.md:473). Current tests assert no fixture CTA on landing at [fixture-journey.spec.ts:44](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:44) and enter with direct `page.goto("/audit/fixture")` at [fixture-journey.spec.ts:823](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:823).

The test can pass while the real landing entry is absent or broken. Reproduce with `npm run test:e2e` and inspect the entry/full-journey tests.

### 3. Major — Landing page presents undisclosed dashboard/result imagery

The landing page calls the carousel a “Dashboard mockup card” and uses `alt="Dashboard"` at [page.tsx:159](/Users/hy4-mac-006/nuave_v0.2/src/app/page.tsx:159). I visually inspected `public/preview-step-1.png`, `public/preview-step-2.png`, and `public/preview-step-3.png`; they show result-like copy, a named business, recommendations, and `45% +7%` visibility-score content. The Phase 1 gate rejects dashboard concepts at [END_TO_END_PLAN.md:475](/Users/hy4-mac-006/nuave_v0.2/docs/END_TO_END_PLAN.md:475), and product truth rejects dashboard/unsupported score framing at [VISION.md:31](/Users/hy4-mac-006/nuave_v0.2/docs/VISION.md:31), [PRODUCT.md:69](/Users/hy4-mac-006/nuave_v0.2/docs/PRODUCT.md:69), and [AUDIT.md:262](/Users/hy4-mac-006/nuave_v0.2/docs/AUDIT.md:262).

Opening `/` is a direct reproduction: the images have no adjacent fixture disclosure explaining that the shown business/result/score is fictional.

### 4. Major — Report/export mutates `not_assessed` into `not_recommended`

The adapter documents the conversion at [adapter.ts:29](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/adapter.ts:29) and implements it at [adapter.ts:459](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/adapter.ts:459). Frozen observations 07–10 are `not_assessed` at [fixture-kopi-taman-senja.ts:803](/Users/hy4-mac-006/nuave_v0.2/src/lib/audit/fixtures/fixture-kopi-taman-senja.ts:803), [fixture-kopi-taman-senja.ts:838](/Users/hy4-mac-006/nuave_v0.2/src/lib/audit/fixtures/fixture-kopi-taman-senja.ts:838), [fixture-kopi-taman-senja.ts:877](/Users/hy4-mac-006/nuave_v0.2/src/lib/audit/fixtures/fixture-kopi-taman-senja.ts:877), and [fixture-kopi-taman-senja.ts:912](/Users/hy4-mac-006/nuave_v0.2/src/lib/audit/fixtures/fixture-kopi-taman-senja.ts:912). The fidelity test omits recommendation at [report.test.ts:40](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/report.test.ts:40).

This turns “no recommendation judgment” into a negative judgment. Exporting the report is a concrete counter-example: `report.details[6].recommendation` is `not_recommended`, while the frozen observation is `not_assessed`.

### 5. Major — Crafted client storage bypasses every fixture gate

The validator accepts a fully ready state at [state.test.ts:121](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/state.test.ts:121). The helper creates that state at [helpers.ts:119](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/helpers.ts:119), and the report test seeds it directly at [fixture-journey.spec.ts:636](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:636).

This does not defeat the server flag, but it means the tests do not prove that the user passed payment, facts, and questions in sequence. Writing `v3ReadyState()` to `nuave.fixtureJourney.v3` and loading `/audit/fixture` reproduces the bypass.

### 6. Major — Refresh loses the revealed offer state

`offerRevealed` is component-local at [FixtureJourney.tsx:1172](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:1172), and the reveal handler only updates local state at [FixtureJourney.tsx:1320](/Users/hy4-mac-006/nuave_v0.2/src/app/audit/fixture/FixtureJourney.tsx:1320). It is not persisted in [state.ts:23](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/state.ts:23). Refresh coverage starts at later injected states at [fixture-journey.spec.ts:595](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:595).

Reproduction: reveal the offer, refresh, and observe the summary and `Bayar Rp99.000` CTA disappear.

### 7. Major — Network test cannot prove the stated zero-request property

The helper observes browser requests at [helpers.ts:27](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/helpers.ts:27), marks all local requests safe at [helpers.ts:37](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/helpers.ts:37), allowlists Framer at [helpers.ts:48](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/helpers.ts:48), and only rejects direct `/api/audit*` paths at [helpers.ts:55](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/helpers.ts:55).

A local `/api/proxy` that calls an external provider server-side would pass this assertion. Current source inspection found no such call, so the current implementation is clean; the verification harness is not a reliable regression guard.

### 8. Major — CI does not run the tests that protect this phase

CI runs check/build at [.github/workflows/ci.yml:23](/Users/hy4-mac-006/nuave_v0.2/.github/workflows/ci.yml:23), and deploy also builds only at [.github/workflows/deploy.yml:22](/Users/hy4-mac-006/nuave_v0.2/.github/workflows/deploy.yml:22). `test:audit` targets only `src/lib/audit` at [package.json:13](/Users/hy4-mac-006/nuave_v0.2/package.json:13); e2e is separate at [package.json:14](/Users/hy4-mac-006/nuave_v0.2/package.json:14). Fixture unit tests are not part of the required CI path.

A browser journey or evidence-export regression can therefore leave CI green.

### 9. Minor — Current documentation baselines are stale and contradictory

The plan still says 93 audit tests at [END_TO_END_PLAN.md:475](/Users/hy4-mac-006/nuave_v0.2/docs/END_TO_END_PLAN.md:475); NOW contains both 93 and 208 references at [NOW.md:249](/Users/hy4-mac-006/nuave_v0.2/docs/NOW.md:249) and [NOW.md:289](/Users/hy4-mac-006/nuave_v0.2/docs/NOW.md:289); the actual command passed 263. Verification says 23 e2e at [VERIFICATION.md:98](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/VERIFICATION.md:98), while current e2e passed 31. README still says `.v2` at [README.md:133](/Users/hy4-mac-006/nuave_v0.2/README.md:133), while code uses `.v3` at [state.ts:20](/Users/hy4-mac-006/nuave_v0.2/src/lib/fixture-journey/state.ts:20). The verification’s Framer finding at [VERIFICATION.md:128](/Users/hy4-mac-006/nuave_v0.2/specs/001-simulated-journey-shell/VERIFICATION.md:128) is stale because current navigation/footer use local assets.

## Test-suite audit summary

- **Weak/vacuous:** landing-to-report, disclosure wording, processing transitions, refresh traversal, stale v1/v2 handling, evidence recommendation fidelity, network coverage, reduced-motion intermediate behavior, and print artifact validation.
- **Partially substantive:** keyboard and mobile tests. Keyboard uses real Tab/Space/Enter at [fixture-journey.spec.ts:870](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:870), but does not test focus trapping, Escape, or focus restoration. Mobile checks overflow and selected clicks at [fixture-journey.spec.ts:1002](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/fixture-journey.spec.ts:1002), but not every report/control layout.
- **Strongest:** disabled server protection and forced failure. The disabled test injects the furthest client state and still receives unavailable at [preview-disabled.spec.ts:15](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/preview-disabled.spec.ts:15); forced-failure tests assert the terminal UI at [preview-failure.spec.ts:25](/Users/hy4-mac-006/nuave_v0.2/tests/e2e/preview-failure.spec.ts:25).

## Summary

I would not trust this phase as the foundation for Phase 2. The server-side fixture boundary and basic simulated journey work, but the verification record is not an honest, reproducible statement of what was verified; the landing-to-report promise has regressed; the landing page presents undisclosed dashboard/score concepts; client storage can bypass every gate; refresh and stale-key guarantees are false; evidence export changes `not_assessed` into `not_recommended`; and CI does not run the browser or fixture tests intended to protect the phase.
