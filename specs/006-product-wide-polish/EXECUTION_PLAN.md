# Modular execution plan — product-wide design pass

> Status: **Draft** — unapproved working document. Companion to `SPEC.md`
> (same folder); implementation begins only after that spec is approved.
> Created: 2026-08-19
> Sequencing decision: founder, 2026-08-19 — decide now, build in waves (see
> `FOUNDER_DECISIONS.md`, D1).

This plan splits the design pass into phases that can each be implemented,
tested, and judged independently, so a failing phase never blocks another.

## Operating rules

1. **One spec governs.** Every phase reads the approved design-pass SPEC and
   implements only its own requirement groups. If a phase uncovers a missing
   product decision, it stops and returns the question; it never patches the
   spec from code.
2. **Additive-first foundation.** P0 introduces new tokens and primitives
   alongside the old, migrates consumers, and removes only what the spec's
   bounded removal set lists. Phases in flight never break each other.
3. **Fixture-first where live is gated.** The fixture journey is the only
   fully reviewable path before END_TO_END Phases 4–5. Screens whose live
   behavior depends on later functional specs (payment wiring, durable run,
   hosted PDF) land in the fixture first; the live side adopts the same
   language without changing contracts.
4. **Every phase has four gates:** `npm run check` and `npm run build` green;
   the relevant unit/e2e suites green; visual QA (mobile ~390px and desktop
   ~1440px, every state the spec lists); and a judgment review by a fresh
   reviewer against the spec's judgment criteria.
5. **Wave discipline.** Wave 1 (P0, P1) is parallel-safe with specs 003/004 —
   it touches tokens and the landing page, not the audit pipeline. Wave 2
   (P2–P7) starts after the report-quality gate, per the founder's sequencing
   decision and `docs/NOW.md`'s build order.

## Wave overview

| Phase | Scope | Wave | Depends on | Blocks |
|---|---|---|---|---|
| P0 Foundation | Tokens, type, color, spacing, motion, a11y, shared primitives | 1 | Nothing | P1–P7 |
| P1 Landing | Hero intake → `/audit`, copy excision, nav fixes, motion cleanup, access-gate removal | 1 | P0 (OQ-04, OQ-06 settled 2026-08-20) | — |
| P2 Preview / intake + hero consolidation | One hero, preview states, demo neutralization | 2 | P0; Spec 004 coordination; D7 (settled) | — |
| P3 Payment status | Seven designed states, fixture first | 2 | P0 (OQ-01 settled 2026-08-20) | — |
| P4 Business Facts | Prepared-draft presentation, provenance system | 2 | P0 | — |
| P5 Questions | Reading-first cards, composition, dialog ceremony | 2 | P0 | — |
| P6 Audit Run | Quiet status board, state-bound motion, help states | 2 | P0 | — |
| P7 Report web + PDF | Unified document language, PDF art direction | 2 | P0; live PDF mechanism = Phase 4 | — |

Phases P2–P7 have no interdependencies beyond P0; any order works, and any
single failure leaves the others shippable.

---

## P0 — Foundation

**Objective.** The calm-instrument foundation exists as one system: tokens,
typography, color, spacing, motion rules, accessibility foundations, and the
shared component language — the seed of a future canonical `docs/DESIGN.md`.

**Bounded scope.** SPEC requirements R-01 through R-09. No screen is
restyled; no copy changes; no component adoption beyond what migration
requires.

**Files in scope.**

- `src/styles/tokens.css`, `src/styles/landing.css`, `src/app/globals.css`
- `src/app/audit/audit.module.css`,
  `src/app/audit/fixture/fixture.module.css` (consumer migration only:
  `--muted` split, `--font-mono`, raw-hex replacement)
- New shared primitives module(s) at the location the approved spec names
  (the empty `src/components/ui/` is the candidate home)
- `src/app/layout.tsx` (unloads the unused Lora webfont — founder-approved
  2026-08-20; the dormant `.dark` token set is removed in the same phase per
  SPEC R-01)

**Exit gate.**

- New token set complete and consumed through the Tailwind theme; the
  `--muted` collision and undefined `--font-mono` resolved with migrated
  consumers verified at contrast.
- Motion duration/easing tokens defined; a project-wide reduced-motion
  foundation exists; focus-visible ring token exists.
- `npm run check`, `npm run build`, full unit and e2e suites pass; no visual
  regression the spec does not sanction.

**Verification.** Automated checks; token-consumption audit (grep for raw
hexes in screen stylesheets); contrast spot-check; orchestrator judgment
review against SPEC AC-01, AC-02.

---

## P1 — Landing

**Objective.** The landing becomes the discovery screen: one question over
one input, prohibited claims excised, navigation fixed, perpetual motion
removed.

**Bounded scope.** SPEC requirements R-10 through R-14 plus the interim copy
table. Final copywriting is explicitly not in scope.

**Files in scope.**

- `src/app/page.tsx`, `src/messages/id.json`, `src/styles/landing.css`
- `src/components/LandingNav.tsx`, `HowItWorks.tsx`, `Footer.tsx`,
  `ExampleReportPreview.tsx`, `PaymentPreview.tsx`, `QuestionsPreview.tsx`,
  `ConfirmBusinessPreview.tsx`, `ReportPagePreview.tsx`
- Bounded removals per the SPEC's list: `VisibilityScoreChart.tsx`,
  `PromptResultPreview.tsx`, `RecommendationsPreview.tsx`, the `dashboard/`
  cluster, the empty `ui/` directory if unused after P0
- Access-gate plumbing for the approved removal: the middleware rule and
  `src/app/access/` (exact files identified by the worker at implementation),
  noting that `NUAVE_ACCESS_CODE` is a build-time CI env whose removal needs a
  redeploy

**Exit gate.**

- SPEC AC-03, AC-04, and AC-05 pass: prohibited strings absent
  (grep-verified), interim copy verbatim, every link resolves, preview mocks
  carry no band/percentage/card-payment/real-product content and keep
  `Ilustrasi` labels, and the intake submits to an ungated `/audit` with the
  handoff-approved exposure pairing (minimal guard or the founder's explicit
  interim acceptance) in place and recorded.
- Hero renders the intake pattern with entrance stagger and reduced-motion
  fallback; marquee and cursor-glow code deleted.
- Checks, build, and suites pass; mobile and desktop visual QA signed off.

**Verification.** Automated + visual QA + judgment review (a fresh reviewer
can say what Nuave offers and what to do next, in under a minute, without
scrolling).

**Settled dependencies.** OQ-04 (interim copy) is approved, so P1 may start
once the SPEC is approved. OQ-06 is settled: the intake submits to `/audit`
and the access gate is removed in this phase. **Exposure flag:** an ungated
`/audit` can spend real provider budget, and `docs/NOW.md` lists rate limits
and cost controls as prerequisites for external use — the P1 worker prompt
pairs the removal with the minimal server-side guard the founder approves at
handoff, unless the founder explicitly accepts the interim exposure.

---

## P2 — Order Preview / intake + hero consolidation

**Objective.** One hero exists (Spec004 interaction model on the new
foundation), wired into step 0 of `/audit`; the order preview renders its
designed states in the fixture journey.

**Bounded scope.** SPEC R-15 through R-18, R-42 (hero-related removals),
R-43, R-44. No backend contract change; extraction is reused unchanged.

**Files in scope.**

- `src/app/audit/AuditWorkflow.tsx` (step-0 wiring),
  `src/app/audit/spec004/Spec004Hero.tsx` (restyle),
  `src/app/audit/spec004/Spec004Demo.tsx` + `page.tsx` (neutralize live
  spend), `src/lib/audit/source-input.ts` (kept; tests already exist)
- Retire: `src/app/audit/SourceHero.tsx`,
  `src/app/audit/hero.module.css`, the dead `SourceStep` in
  `src/app/audit/AuditStages.tsx`
- Fixture preview screen: `src/app/audit/fixture/` `PreviewScreen` and its
  stylesheet sections

**Exit gate.**

- SPEC AC-06, AC-07, and AC-17 pass: one hero implementation; parser, chip,
  scan transition, and reduced-motion fallback verified; the demo route
  issues no live call.
- Preview states (loading, partial, unidentified, unsupported, expired,
  cancelled-return) render per spec in the fixture; dual-CTA semantics hold.
- `source-input` unit tests, audit unit tests, fixture unit tests, and e2e
  all pass.

**Verification.** Automated + e2e hero paths + visual QA + judgment review
(the scan transition reads deliberate and calm, never gimmicky — SPEC
AC-20 applies).

**Hero-consolidation dependency (decision D7, settled 2026-08-19).** This
phase executes the consolidation. **Coordination flag:** Spec 004 is
mid-implementation by another worker. P2 starts only after Spec 004 reaches
Verified, or after the founder explicitly hands step-0 wiring to this pass.
Do not edit the other worker's in-flight files before that handoff.

---

## P3 — Payment status destination

**Objective.** All seven payment states exist as designed screens answering
status, amount, and next action — landed in the fixture journey first, with
the live destination designed and component-ready for the Phase 5 payment
spec to wire.

**Bounded scope.** SPEC R-19 through R-22. No Midtrans integration, no
webhook, no live order state — presentation and client state rendering only.

**Files in scope.**

- Fixture payment screen and any new status-banner/status-card primitives
  (shared with P0's component language)
- Message catalogs for the seven states (settled copy from
  `docs/journey/02-payment.md`, verbatim)
- Live-side status components scaffolded per spec, clearly not wired to real
  payment

**Exit gate.**

- SPEC AC-08, AC-09 pass: seven states render at equal quality with settled
  copy; prolonged checking degrades to `Cek lagi`; confirmed renders only
  from verified state; the simulator remains unmistakably simulated.
- Checks, build, and suites pass; per-state visual QA (mobile especially —
  wallet handoff return).

**Verification.** Automated state rendering + visual QA per state + judgment
review (a reviewer shown any single state can say what happened and what to
do next).

**Settled dependencies.** OQ-01 is resolved: the pending-state action label
is `Saya sudah membayar. Cek lagi.` (settled 2026-08-20, no em dash).
Live wiring remains excluded until the Phase 5 payment specification.

---

## P4 — Business Facts

**Objective.** The facts screen reads as the prepared document the owner
annotates, in Indonesian, with the provenance-pill system — in the fixture
fully; the live `BriefStep` adopts the same visual language and Indonesian
presentation for its existing fields.

**Bounded scope.** SPEC R-23 through R-25, presentation and language only.
The live screen's field model stays as-is: moving it to the journey/03 field
set is a contract change owned by its own functional specification, not this
pass. This pass does, however, remove the false "no API call and costs
nothing" claim listed in the SPEC's Problem.

**Files in scope.**

- `src/app/audit/AuditStages.tsx` (`BriefStep` restyle + Indonesian via
  catalogs), `src/app/audit/audit.module.css` relevant sections
- Fixture `FactsScreen` and its stylesheet sections
- Message catalogs

**Exit gate.**

- SPEC AC-10 (fixture) and AC-03 pass: provenance pills on prepared values,
  exact confirmation sentence, gated primary action, field-level validation
  focus; no internal schema terms or confidence scores visible.
- Preparing, failed-with-manual-entry, conflict, and refresh-restore states
  render at equal quality in the fixture.
- Checks, build, and suites pass; visual QA.

**Verification.** Automated + visual QA + judgment review (the screen reads
as "Nuave did the work", not "fill out this form").

**Dependencies.** P0 only.

---

## P5 — Questions

**Objective.** Reading-first question review with live composition chips,
advisory-versus-blocking feedback, and the point-of-no-return dialog
ceremony.

**Bounded scope.** SPEC R-26 through R-29. Question generation, validation
rules, and the start boundary stay as they are; this pass changes
presentation and adds the confirmation dialog where missing.

**Files in scope.**

- `src/app/audit/AuditStages.tsx` (`QuestionsStep`), fixture
  `QuestionsScreen` and `RunStartDialog`, shared card/chip/dialog primitives
- Message catalogs

**Exit gate.**

- SPEC AC-11 passes: composition counts update from final text; warnings
  advise without blocking allowed edits; `Mulai audit sekarang` exists only
  inside the dialog; dialog focus and Escape behavior verified.
- No fake multi-stage preparing animation anywhere in the generation path.
- Checks, build, and suites pass; visual QA including long-question and
  all-edited packs.

**Verification.** Automated + e2e (edit, restore suggestion, composition
change, double-clicked start) + visual QA + judgment review.

**Dependencies.** P0 only.

---

## P6 — Audit Run

**Objective.** The quiet status board: honest progress, safe-to-close
messaging, and the retry/help states — with state-bound motion only.

**Bounded scope.** SPEC R-30 through R-33. Run execution, streaming, and
retry logic stay as they are; this pass changes presentation, copy language,
and motion.

**Files in scope.**

- `src/app/audit/AuditStages.tsx` (`RunStep`), fixture `RunScreen`, shared
  status-row/progress primitives
- Message catalogs

**Exit gate.**

- SPEC AC-12 passes: nothing moves without a real state change; the five
  settled labels are the only row states; the safe-to-close line with masked
  email is always present; the completion state is `Laporan Anda sudah siap`
  with no celebratory treatment.
- Retry-exhausted, report-failure, and help-sent states render per spec.
- Checks, build, and suites pass; visual QA including the failure states.

**Verification.** Automated + visual QA + judgment review (the screen reads
calm and trustworthy during a long operation; a reviewer can say whether the
run is healthy without reading any row twice).

**Dependencies.** P0 only.

---

## P7 — Audit Report (web) + Report PDF

**Objective.** One document language unifies the live and fixture reports;
the result hierarchy, evidence triad, and terminology match the contracts
exactly; the PDF becomes a designed A4 artifact with identical facts.

**Bounded scope.** SPEC R-34 through R-40. Report content, evidence
contracts, and generation logic stay as they are; this pass changes
presentation, terminology alignment, and print/PDF art direction.

**Files in scope.**

- `src/app/audit/ReportView.tsx`,
  `src/app/audit/fixture/FixtureReportView.tsx`, report sections of
  `audit.module.css` and `fixture.module.css`, print stylesheets
- `src/lib/audit/report-labels.ts` (terminology unification — one label set)
- Shared report/document primitives per P0's component language
- Message catalogs

**Exit gate.**

- SPEC AC-13, AC-14, AC-16 pass: result hierarchy exact; agency block and
  internal telemetry absent; `Tidak diuji` for empty denominators; one
  terminology set; PDF pending/failed states truthful beside `Download PDF`.
- Page-by-page PDF visual QA: same facts, no clipping, all ten tests
  expanded, grayscale-legible.
- Checks, build, and suites pass (including the 65+ report contract tests and
  fixture suites).

**Verification.** Automated + PDF page-by-page QA + judgment reviews:
AC-18 (uncoached fixture completion, with the whole journey restyled),
AC-19 (ten-minute report read by a non-technical Indonesian reader),
AC-20 (founder taste verdict).

**Dependencies.** P0. The live hosted-PDF mechanism is END_TO_END Phase 4;
this phase designs the artifact and applies it to the current print path,
which must remain implementable by a future generator without redesign.

---

## Dependency map

```text
P0 Foundation ─┬─ P1 Landing .............. Wave 1 (parallel-safe with 003/004)
               ├─ P2 Preview + heroes ..... Wave 2; also needs Spec 004
               │                             Verified or founder handoff (D7)
               ├─ P3 Payment status ....... Wave 2 (OQ-01 settled 2026-08-20);
               │                             live wiring = Phase 5 spec
               ├─ P4 Business Facts ....... Wave 2
               ├─ P5 Questions ............ Wave 2
               ├─ P6 Audit Run ............ Wave 2
               └─ P7 Report web + PDF ..... Wave 2; live PDF mechanism = Phase 4
```

A phase that fails verification returns a bounded fix list and retries; no
other phase waits on it, because each ships behind its own exit gate and the
foundation is additive-first.

## Judgment review protocol

Design quality cannot be verified by tests alone. Each phase's judgment
review uses a fresh reviewer (not the implementor) who receives only the
approved SPEC, the running build, and the relevant ACs — never the
implementor's narration. The reviewer answers the AC questions in writing;
the founder resolves any disagreement. The full-pass gates (SPEC AC-15, plus
the judgment gates AC-18, AC-19, AC-20) run after P7 and constitute the
design pass's verification record together with each phase's evidence.

## Worker prompt status

- P0 and P1: complete worker prompts already prepared by the orchestrator
  (2026-08-19); valid once the SPEC is approved.
- P2–P7: bounded skeletons prepared; each must be fleshed out from the
  approved SPEC's per-screen requirements and acceptance criteria at the
  start of its wave, then handed to a fresh worker per
  `docs/WORKFLOW.md`'s handoff standard.
