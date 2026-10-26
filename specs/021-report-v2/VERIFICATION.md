# Verification: Spec 021 — Report v2

> Result: **Pending** (Part A built; Parts D, P, C and B to come)
> Reviewer: independent agent review on each PR (verdict comment on the PR)
> Date: 2026-10-26
> Spec version or commit: `specs/021-report-v2/SPEC.md` at 590a273
> Implementation version or commit: Part A, PR 2 (this file's first entry)

Each PR in [`PLAN.md`](./PLAN.md) adds its results here. The spec is marked
**Verified** after PR 6 and the founder's AC-A7 and AC-B4 readings.

## Part A, layout (PR 2)

### Scope reviewed

- New two-source renderer: `src/app/audit/report/TwoSourceReport.tsx`,
  `report-v2.module.css`, `report-v2-data.ts`,
  `src/components/product/report/MentionDot.tsx` and its CSS, the new tokens
  in `src/styles/tokens.css`.
- Routing: `DirectTenReportPage.tsx` and `DirectTenReportBody.tsx` send
  two-source reports to the new renderer; the old renderer is otherwise
  unchanged. Unused two-source sections removed from `TwoSourceSections.tsx`.
- Support export: `npm run support -- export <order>`
  (`src/lib/orders/support.ts`, `scripts/support.mjs`), sharing
  `savedReportEvidence` with the old reports' JSON button.
- Tests: `two-source-report.test.tsx`, `report-v2-data.test.ts`,
  `support.test.ts`, `tests/e2e/new-intake-glm.spec.ts`, `tests/e2e/journey.ts`,
  and the `verify-nuave` skill.

### Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| AC-A1 | Pass | e2e "Spec 012 on the saved report": at 390×844 the verdict and the first card's ten dots are in the first viewport (with the synthetic-test notice above them) |
| AC-A2 | Pass | unit "AC-A2: each card's headline count equals its dots"; `report-v2-data.test.ts` covers every look, including no AI Overview, cited and failed |
| AC-A3 | Pass | unit chip-order test; e2e chip names (Celah Topik is hidden in the synthetic run because its saved topics equal the questions, per A-05) |
| AC-A4 | Pass | unit and e2e: no "Tidak ada data jumlah pencarian", "Unduh bukti JSON", "Tentang audit ini", or the removed recommendation labels; saved topic lines that carry the no-volume phrase are shown without it |
| AC-A5 | Pass | the pre-Spec 018 snapshot in `two-source-report.test.tsx` passes unchanged |
| AC-A6 | Pass | `npm run check` and `npm run test:unit` pass; all three Playwright suites pass (see Checks run); no sideways scroll at 1920, 1280, 768, 390 and 320 wide and at 200% zoom |
| AC-A7 | Pending | founder reading on the PR preview, then on NV-3WDSAY after deploy |

### Checks run

- `npm run check`: pass (no new lint warnings).
- `npm run test:unit`: 2599 passed. Run with this container's own
  `CHEAPERINFERENCE_API_KEY` unset: `glm-local.test.ts` assumes no key is
  present and fails on the unchanged code when one is.
- `npm run build` and `npm run build:cf`: pass (inside `npm run verify`).
- Playwright, all three configs: 85 + 3 + 11 passed. Run with the
  container's installed browser build through an uncommitted wrapper config,
  because the pinned Playwright expects a browser build this container does
  not ship.

### Findings

- In-page links in the new layout (question references and dots) keep the
  address unchanged, so the link secret after `#` is never replaced.
- Delivered reports show the new layout as soon as it deploys, before the
  founder's NV-3WDSAY reading (presentation only; saved reports unchanged).
