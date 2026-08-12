# Verification: Spec 001 — Simulated journey shell

> Result: **Pending independent verification**
> Reviewer: Builder (implementation checks only); independent reviewer: not yet assigned
> Date: 2026-08-12
> Spec version or commit: `specs/001-simulated-journey-shell/SPEC.md`, status **Implementing** (founder-approved 2026-08-12)
> Implementation version or commit: working tree, branch `main`; no commit made

## Scope reviewed

- Specification: `specs/001-simulated-journey-shell/SPEC.md`
- Implementation: Chunk 1 (protected landing entry, example intake, fact
  confirmation, ten-question approval), Chunk 2 (order summary, simulated
  checkout, deterministic simulated processing, fixture-backed example report,
  recovery behavior, and the correction pass), Chunk 3 (small Playwright
  browser harness for this journey only).
- Browser harness: `@playwright/test` (devDependency), three thin configs for
  the three server modes, specs under `tests/e2e/`.
- Environments: local Next.js dev server (preview enabled on port 3000,
  enabled + forced report failure on port 3200, disabled on port 3100),
  Chromium (Playwright), Node.js 24 toolchain.

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| AC-01 — Entry | Pass | E2E `landing entry` test: the primary fictional-preview action and before-entry notice render on `/` when enabled, and the action opens the example intake. |
| AC-02 — Protected boundary | Pass | E2E `preview disabled` suite: with the flag unset, `/audit/fixture` renders the safe unavailable state even with the furthest fixture state seeded in session storage, and the landing page keeps its normal actions. |
| AC-03 — Fixture identity | Pass | E2E fixture-identity test asserts the facts screen matches `goldenBrief` (name, scope, category, market, target customer, priority offering, official source, competitor and its source, accuracy question); unit tests in `state.test.ts`. |
| AC-04 — Fact gate | Pass | E2E fact-gate test: continuing without the confirmation stays on the facts screen with the specific accessible error; confirmed continuation advances. |
| AC-05 — Question gate | Pass | E2E question-gate tests: all ten `goldenPrompts` appear once in original order, five discovery and five named-business chips, and approval is required (gate error without it). |
| AC-06 — Scope consistency | Pass | E2E scope-summary test: entity scope, derived question count, derived execution surface, example-report limitation, and checkout disclosure all render from fixture-backed state. |
| AC-07 — Checkout truthfulness | Pass | E2E scope-summary test: **“Simulasi pembayaran — tidak ada tagihan.”** is prominent; zero input controls on the summary; body text contains no price pattern (Rp/USD/$). |
| AC-08 — Processing truthfulness | Pass | E2E complete-path and paused-resume tests: the run is identified as a simulation, advances through the five bounded stages, announces status via `aria-live`, and a restored run pauses until an explicit Resume. |
| AC-09 — Report fidelity | Pass | E2E report-fidelity test: five canonical sections; ten screen details; exactly one failed test (`NUAVE-BRAND-COMPARISON-01`, “Test could not run”); counts `1 of 5 recommended`, `5 of 5 recognized`, `9 of 10 completed`; `report.test.ts` asserts the same contract at unit level. |
| AC-10 — Print fidelity | Pass | E2E print test with emulated print media: the in-article disclosure stays visible, the screen toolbar is hidden, and the print variant of all ten details is expanded. |
| AC-11 — Persistent disclosure | Pass | E2E persistent-disclosure test asserts the notice on intake, facts, questions, checkout, processing, and ready, plus the in-article report notice. |
| AC-12 — Refresh recovery | Pass | E2E refresh tests: refresh at ready restores the same report; refresh mid-processing restores the paused state and resumes only on Resume; unit validation in `state.test.ts`. |
| AC-13 — Invalid-state recovery | Pass | E2E invalid-state test (stale v1 shape cleared with a visible explanation and safe return to intake); unit tests cover corrupt, stale, and inconsistent combinations. |
| AC-14 — Start over | Pass | E2E start-over isolation test (only `nuave.fixtureJourney.v2` affected, live keys untouched) and confirmation tests for the paused-processing and terminal-failure Start over actions. |
| AC-15 — No side effects | Pass | Every browser test records requests and asserts zero `/api/audit/*` requests and zero external-service requests across the complete path, the paused-resume path, the forced-failure path, and the disabled route. The only external origin ever observed is the pre-existing landing brand-mark SVG (see Findings). |
| AC-16 — No live fallback | Pass | E2E forced-failure suite: terminal failure shows no success representations, a failed retry produces focused alert feedback, Start over requires confirmation, and no audit-API or external requests occur. |
| AC-17 — Responsive and keyboard path | Pass | E2E mobile-viewport test (375×812, no horizontal scrolling through the full path) and keyboard-only completion test with visible focus assertions. |
| AC-18 — Reduced motion | Pass | E2E reduced-motion test: `emulateMedia({ reducedMotion: "reduce" })` completes to the same report in under 4 s (vs. ~5.6 s normal) and retains the meaningful stage text as the run summary. |
| AC-19 — Engine regression | Pass | `npm run test:audit`: 93/93 passed; no audit contract, provider orchestration, cost control, or fixture evidence file changed. |
| AC-20 — Repository checks | Pass | `npm run check` (typecheck, lint 0 errors — 2 pre-existing `<img>` warnings in `Footer.tsx`/`LandingNav.tsx` — Prettier clean) and `npm run build` both pass. |
| AC-21 — Human trust review | **Pending** | Requires a fresh founder or reviewer walkthrough on mobile and desktop (Chunk 3 cannot perform a human judgment review). |

## Requirements trace

| Requirement | Status |
|---|---|
| R-01 — Protected fixture mode | Implemented (server-only env gate; E2E disabled suite proves no client state can enable it). |
| R-02 — One canonical fixture | Implemented (adapter projects `goldenBrief`/`goldenPrompts`; `report.ts` composes `goldenReportContent()` through the existing report builder; E2E and unit tests assert identity and fidelity against the golden fixture). |
| R-03 — Coherent landing entry | Implemented; E2E covered. |
| R-04 — Persistent disclosure | Implemented on every screen and in printed output; E2E covered. |
| R-05 — No real intake | Implemented (no submittable inputs; `.example` contact only). |
| R-06 — Explicit fact confirmation | Implemented; E2E gate covered. |
| R-07 — Exact question review | Implemented; E2E order and 5+5 coverage. |
| R-08 — Accurate scope summary | Implemented (fixture-derived question count and execution surface); E2E + unit covered. |
| R-09 — Safe simulated checkout | Implemented (no price, no payment controls; session-scoped simulated-paid state only); E2E covered. |
| R-10 — Deterministic processing simulation | Implemented (five bounded stages, no provider call, explicit Resume after interruption); E2E covered. |
| R-11 — Evidence-faithful report | Implemented through the existing report model and view; E2E + unit covered. |
| R-12 — One screen/print payload | Implemented (same report/observation objects for screen, print, and evidence export); E2E print covered. |
| R-13 — Session-only recovery | Implemented (versioned `nuave.fixtureJourney.v2`, strict validation); E2E refresh and invalid-state covered. |
| R-14 — Safe reset | Implemented (clears only the fixture key, confirmation everywhere); E2E covered. |
| R-15 — No external side effects | Implemented; asserted by request recording in every browser test. |
| R-16 — Live-engine isolation | Implemented; `ReportView` gained only an optional `previewNotice` prop; 93-test audit baseline unchanged. |
| R-17 — Accessible state | Implemented (native controls, visible focus, `aria-live`, `role` semantics); E2E keyboard and focus-visible covered. |
| R-18 — Responsive completion | Implemented; E2E mobile viewport covered. |
| R-19 — Browser regression | Implemented as the Chunk 3 Playwright suite (23 tests across three server modes). |

## Judgment review

Not performed by Builder. Judgment-based review of customer comprehension,
language quality, accessibility, privacy, and failure clarity is the
independent verifier's responsibility and is required for AC-21. Builder
noted for the reviewer: the disclosure wording, gate-error wording, checkout
copy, and the terminal construction-error copy were written for a non-technical
reviewer; Indonesian localization is explicitly Phase 2 and is not assessed
here.

## Checks run

Builder implementation checks (not independent verification), all on
2026-08-12:

| Command or procedure | Result |
|---|---|
| `npx vitest run src/lib/fixture-journey` | 55/55 passed |
| `npm run test:audit` | 93/93 passed — live engine baseline unchanged |
| `npm run test:e2e` | 23/23 passed (18 enabled + 3 forced failure + 2 disabled) |
| `npm run check` | Passed: typecheck clean, lint 0 errors (2 pre-existing `<img>` warnings), Prettier clean |
| `npm run build` | Passed; `/` and `/audit/fixture` dynamic, `/audit` and `/api/audit/*` unchanged |
| `git diff --check` | Clean |
| Browser walkthroughs (Chunks 1–2 records) | Landing entry, gates, checkout, processing, report, refresh, resume, reset, failure, retry, start over, disabled mode — all as specified; 0 JS errors |

## Findings

Priority order:

1. **Pre-existing landing brand-mark SVG is an external request** (pre-existing,
   tolerated, documented). `LandingNav.tsx` and `Footer.tsx` render a brand
   mark from `framerusercontent.com` (a static image CDN). It is not an
   AI/search, payment, email, analytics, database, or background-job service,
   it predates the fixture journey, and changing the landing page is out of
   scope for Spec 001. The network assertion documents this single host as the
   only tolerated external origin; every other external request fails the
   suite. A future landing polish pass should self-host the image.
2. **`next-env.d.ts` is rewritten by the dev server** (housekeeping). The
   generated file is restored to its committed form after verification runs.
3. **`/` landing page is `force-dynamic`** (optional improvement, carried from
   Chunk 1). Required so the server-controlled preview flag is evaluated per
   request; the polish phase may revisit caching.
4. **Session state is versioned at `nuave.fixtureJourney.v2`** (intentional,
   documented). Stored v1 shapes are treated as stale and reset with an
   explanation.
5. **Browser harness scope is deliberately narrow** (intentional). One spec per
   server mode, Chromium only, `workers: 1`, three configs sharing a
   web-server helper. No general end-to-end framework was built.

## Verdict

**Pending independent verification.** Builder issues no Pass/Fail verdict. The
specification is **not** marked Verified. Remaining before a verdict:

- a fresh human review for AC-21 (founder or invited reviewer completes the
  path on mobile and desktop and confirms what was real, simulated, stored,
  charged, and delivered); and
- an independent reviewer's confirmation of this record against the working
  tree described below.

Working-tree state ready for independent verification (branch `main`, no
commit made):

- Pre-existing (Chunks 1–2, modified): `.env.example`, `README.md`,
  `docs/DECISION_LOG.md`, `docs/INDEX.md`, `docs/NOW.md`, `docs/PRODUCT.md`,
  `specs/README.md`, `src/app/page.tsx`, `src/components/LandingHeroSection.tsx`,
  `src/components/LandingNav.tsx`, `src/messages/en.json`,
  `src/messages/id.json`, `src/app/audit/ReportView.tsx`;
- Pre-existing (Chunks 1–2, new): `docs/END_TO_END_PLAN.md`,
  `specs/001-simulated-journey-shell/SPEC.md`,
  `src/app/audit/fixture/**`, `src/lib/fixture-journey/**`;
- Chunk 3 (new): `playwright.config.ts`, `playwright.config.failure.ts`,
  `playwright.config.disabled.ts`, `tests/e2e/**`, `@playwright/test`
  devDependency and `test:e2e*` scripts in `package.json` /
  `package-lock.json`, Playwright artifact entries in `.gitignore`.
