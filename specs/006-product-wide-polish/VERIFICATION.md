# Verification: Spec 006 — Product-wide design pass (calm instrument)

> Result: **P0 and P1 Pass; P2–P7 Pending**
> Reviewer: orchestrator (automated + smoke visual QA); founder judgment review
> outstanding per `EXECUTION_PLAN.md` rule 4
> Date: 2026-08-20
> Spec version: `specs/006-product-wide-polish/SPEC.md` (approved 2026-08-20)
> Implementation version: working tree of 2026-08-20 (uncommitted)

This record covers Wave 1 only: phase P0 (Foundation, R-01–R-09) and phase P1
(Landing, R-10–R-14 plus the interim copy table). Phases P2–P7 are gated on
the report-quality gate per the execution plan's wave discipline and are not
verified here.

## Scope reviewed

- P0: `src/styles/tokens.css`, `src/app/globals.css`, `src/app/layout.tsx`,
  `src/app/audit/audit.module.css`, `src/app/audit/fixture/fixture.module.css`,
  `src/styles/landing.css`, `src/components/ui/` (Button, Card,
  ProvenancePill, StatusBanner, EvidenceTriad, FormField, Disclosure, Dialog).
- P1: `src/app/page.tsx`, `src/messages/id.json`, `src/styles/landing.css`,
  `src/components/LandingNav.tsx`, `HowItWorks.tsx`,
  `ExampleReportPreview.tsx`, `ReportPagePreview.tsx`, `PaymentPreview.tsx`;
  bounded removals (`VisibilityScoreChart.tsx`, `PromptResultPreview.tsx`,
  `RecommendationsPreview.tsx`, `dashboard/` cluster, `src/middleware.ts`,
  `src/app/access/`); `docs/content/landing-copy.md` source excision.
- Environment: local dev server (`next dev`), production build, Playwright
  chromium at 390px and 1440px.

## Acceptance results (Wave 1 criteria)

| Criterion | Result | Evidence |
|---|---|---|
| AC-01 | Pass | Token-consumption grep audit: screen stylesheets resolve color/type/radii/shadows to `tokens.css`; no raw hex outside documented exceptions |
| AC-02 | Pass | `--muted` split into `--bg-muted`/`--text-muted`; zero `var(--muted)` consumers remain in `audit.module.css`; `--font-mono` defined; `--text-muted` #5b5b5b measures 6.82:1 on #ffffff and 6.53:1 on #f9fafb (≥4.5:1) |
| AC-03 | Pass with noted exception | Catalogs carry the landing copy; shells declare `lang="id"`. Exception recorded: illustrative preview strings in `ExampleReportPreview.tsx` remain hardcoded in JSX, marked `Ilustrasi` per R-14; a strict reading of AC-03 would move them to the catalogs — deferred to the final-copy task |
| AC-04 | Pass | Grep-verified absent from `id.json`, `page.tsx`, and the three preview mocks: `5x`, `67%`, `73%`, `49%`, `90%`, `Pertama Ditemukan`, `jawaban pertama`; all nine interim copy rows present verbatim; stats section removed; mocks carry direct count `4/10` in ink with denominators, no band, no percentage bar, no card payment, fictional names only (`Seri Ceria`, `Lincah Ringan`, `tokosepatujaya.example`); `Ilustrasi` labels intact. Copy source `docs/content/landing-copy.md` excised in the same pass (initially missed by the P1 worker; corrected at closeout) |
| AC-05 | Pass | No `#cta` self-anchors; `/pricing` link removed; intake submits to `/audit`; `middleware.ts` and `src/app/access/` deleted; no `NUAVE_ACCESS_CODE` reference remains in `src/`; production build shows no `/access` route; `/audit` serves 200 ungated locally. **Exposure pairing: founder explicitly accepted interim exposure on 2026-08-20** (site-wide noindex unchanged, direct-link only); a server-side rate/cost guard remains a prerequisite before any public link sharing, per `docs/NOW.md` |

## Requirements trace (Wave 1)

- R-01–R-09: implemented by P0; covered by AC-01/AC-02 and the check/build
  suites. Light-only posture shipped (`.dark` set and `@custom-variant dark`
  removed); Lora unloaded; system serif stack reserved for report display.
- R-10–R-14: implemented by P1; covered by AC-03/AC-04/AC-05 and the visual
  smoke QA below.
- R-42: bounded removals match the spec's list exactly; `src/components/ui/`
  retained (populated by P0, so the "empty directory" removal no longer
  applies). Nothing outside the listed set was deleted.
- R-45: no new runtime dependency added.

## Judgment review

- Orchestrator smoke visual QA (2026-08-20): landing renders the
  one-question/one-input hero at 390px and 1440px with no horizontal overflow;
  detection chip, example chips, reassurance line, and `Cek bisnis saya di AI`
  present; reduced-motion reload clean; example-report preview shows the
  direct count with `Ilustrasi` labeling.
- Outstanding per `EXECUTION_PLAN.md` rule 4: the founder's judgment review of
  P0/P1 (fresh-reviewer question: can a reviewer say what Nuave offers and
  what to do next in under a minute) and full per-state visual QA. These run
  with the full-pass judgment gates (AC-18/AC-19/AC-20) after P7 at the
  latest.

## Checks run

- `npm run check` (tsc, eslint, prettier) — pass, 0 errors (16 pre-existing
  warnings).
- `npm run build` — pass; routes confirm `/` static, `/audit` dynamic, no
  `/access`.
- `npm run test:unit` — 26 files, 424 tests passed.
- `npx playwright test` — 28 passed; `playwright.config.failure.ts` — 3
  passed; `playwright.config.disabled.ts` — 2 passed.
- Grep audits for prohibited strings, interim copy rows, token consumers,
  Lora, `.dark`, `NUAVE_ACCESS_CODE` — results as tabled above.
- Playwright smoke script (throwaway, not committed): 390px/1440px
  screenshots, horizontal-overflow check, reduced-motion reload, `/audit`
  status — all pass.

## Findings

1. **Resolved at closeout:** the P1 worker excised prohibited claims from
   `src/` but missed the copy source `docs/content/landing-copy.md`, which the
   spec's Problem statement names explicitly. Excised in this pass (interim
   copy table applied; stats section removed; CTA heading replaced).
2. **Recorded founder decision:** interim exposure accepted without a
   server-side guard (see AC-05). The `NUAVE_ACCESS_CODE` GitHub secret
   deletion and a redeploy are founder actions; until redeploy, the live
   `v2.nuave.ai` still serves the previous gated build.
3. **Carried risk:** e2e expectations were patched to the interim copy; the
   final-copy task must re-sync them.
4. **Not a failure:** `ExampleReportPreview` hardcoded illustrative strings
   (see AC-03 exception).

## Verdict

P0 and P1 meet their exit gates. Wave 2 (P2–P7) remains gated on the
report-quality gate (Spec 003) per the execution plan; P2 additionally
coordinates with Spec 004 per decision D7.
