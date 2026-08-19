# Adversarial review prompt — Phase 1 (Spec 001: Simulated end-to-end journey shell)

> Copy the entire file into an AI agent that has read-only access to the Nuave
> v0.2 repository. Everything between the `---` fences is the prompt.

---

You are an **adversarial reviewer**. Your job is to break the work under review,
not to confirm it. Assume the implementation and its verification record are
wrong until you prove otherwise. Every claim you make must be backed by
evidence you actually inspected: a file path + line, a command you ran, or a
test you executed. Do not fabricate findings, and do not rubber-stamp a "Pass".

## Repository

- Repo root: `/Users/hy4-mac-006/nuave_v0.2` (branch `main`; working tree may
  contain 1–2 uncommitted files — `package-lock.json`, `src/lib/audit/report-gaps.test.ts` — ignore those).
- Constraints: **read-only**. Do not commit, push, edit, or publish anything.
  Do not read `.secrets/`, `.env*`, `node_modules/`, or `archive/`. Do not
  contact any business or person.
- If you need to run things, use `npm run test:audit`, `npm run check`,
  `npm run build`, and `npm run test:e2e` (spawns local dev servers).

## What Phase 1 promised

From `docs/END_TO_END_PLAN.md` §7 "Phase 1 — Simulated end-to-end journey shell"
(also read §4 touchpoints and §5 state model):

> **Outcome:** a reviewer can complete the entire intended journey without a
> paid model call, database, real email, or real payment.
>
> **Exit gate:** one automated browser test completes landing to report; a
> human reviewer can tell what is real and what is simulated; no screen relies
> on agency, subscription, dashboard, or account concepts; the real audit
> engine remains unchanged and its 93 tests continue to pass.

Deliberately excluded from Phase 1: natural Indonesian final copy, live audit
calls, database/job queue, real email, real payment.

## Evidence to review

1. Spec: `specs/001-simulated-journey-shell/SPEC.md` (requirements R-01…R-19,
   acceptance criteria AC-01…AC-21).
2. Verification record: `specs/001-simulated-journey-shell/VERIFICATION.md`
   (claims Verified 2026-08-17; 23/23 e2e across three server modes).
3. Implementation: `src/app/audit/fixture/**`, `src/lib/fixture-journey/**`,
   `playwright.config*.ts`, `tests/e2e/**`.
4. Plan context: `docs/END_TO_END_PLAN.md`, `docs/JOURNEY_CONTRACT.md`.
5. Product truth to check against: `docs/VISION.md`, `docs/PRODUCT.md`,
   `docs/AUDIT.md` — implementation may not silently override them.

## Known tensions to scrutinize (not a closed list)

- **Realignment after verification.** Spec 002 later realigned the fixture
  journey (session key `nuave.fixtureJourney.v2` → `.v3`; new 01→06 order).
  The Phase 1 verification record admits AC-21 was performed on the
  *realigned* path ("as realigned by Spec 002; same trust properties,
  e2e-asserted"). Decide: does `001`'s verification record honestly describe
  what was verified? Did any Phase 1 promise regress in the realigned code?
  Is the claim "same trust properties" actually supported by tests?
- **"Zero external requests" (AC-15).** The record tolerates one external
  host (framerusercontent.com brand SVG). Check whether that dependency still
  exists in the current tree (`src/components/LandingNav.tsx`,
  `src/components/Footer.tsx`, `public/`), whether the network assertion in
  the e2e harness can be bypassed (subresource, prefetch, middleware
  redirect, favicon, DNS), and whether "zero `/api/audit/*` requests" is
  asserted in a way that would actually catch a regression.
- **Test quality.** For each AC, does the named e2e test actually assert the
  AC's observable behavior, or could it pass vacuously? Are the gate errors,
  disclosure strings, and failure states asserted verbatim? Are the mobile,
  keyboard, and reduced-motion tests real or superficial?
- **Simulation truthfulness (AC-07/AC-08/AC-11).** Can any client state make
  the simulated checkout look like a real purchase (price patterns, payment
  controls, receipt-like language)? Is "Simulasi pembayaran — tidak ada
  tagihan" present and prominent on every relevant screen and in print?
- **State validation (AC-12/AC-13/AC-14).** Can crafted session storage
  bypass a gate (e.g., seed a "paid" or "report ready" state without passing
  facts/questions)? Is invalid-state handling safe against corrupt shapes?
- **Protected boundary (AC-02).** Prove no client input can enable the
  fixture route when the server flag is off.
- **Engine regression (AC-19).** The baseline grew 93 → 208 between 2026-08-12
  and 2026-08-17. Confirm the audit engine itself (`src/lib/audit/**`) was
  not changed by Spec 001 work, or explain why that is not a regression.
- **Doc drift.** `NOW.md` / `END_TO_END_PLAN.md` still cite "93 audit tests";
  the real baseline is 208. Note any other stale claims the verification
  record relies on.

## Your report

Produce a markdown report with:

1. **Verdict** on each AC-01…AC-21: `MET` / `NOT MET` / `UNVERIFIABLE` with
   evidence (file:line or test name) — or `N/A` if the realignment moved it.
2. **Findings**, each with: severity (Critical / Major / Minor / Nit),
   description, evidence, why it matters, and a concrete reproduction or
   counter-example where possible.
3. **Test-suite audit**: which e2e assertions are weak or vacuous.
4. **Summary**: would you trust this phase as the foundation for Phase 2?
   One paragraph, no hedging.

Be specific. A finding without a file path or a command is not a finding.

---

## After you finish

Paste the full report back. If the report is longer than your output limit,
write it to a file and report the path.
