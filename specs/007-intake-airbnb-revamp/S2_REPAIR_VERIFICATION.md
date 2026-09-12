# Existing intake screen repair — verification

Date: 12 September 2026. Branch: `codex/spec-007-approved-s2-repair`.
Base: `origin/main` at `505ccd49ce857e8726bf85e796edf10f5738878c`.
Scope and authority: [approved repair plan](./S2_REPAIR_PLAN.md).

## Result

The existing Scope, Branch, Offerings, and Review screens use the September 5
composition. Question Review uses the same repaired frame and retains its
existing question-save rules. A fictional gallery at
`/audit/v2/intake-preview?demo=1` exposes all five screens directly. It does
not read or write the real workflow session and does not call an API.

The full September 5 journey is not implemented. Founder visual acceptance
is pending. Production activation, commits, pushes, and deployment are outside
this repair.

## Checks

- Approved HTML SHA-256 matches the handoff:
  `b7adc54fd2d83def25552e25961dd50eba7e63883a217861811e2f394f830a1c`.
- Workflow authority, navigation, question transactions, and selection
  primitive tests: **50 passed in 8 files**, with the engine/navigation tests
  unchanged.
- The **14 intake browser checks passed** in the final full run, including
  both 390px and 1280px demo cases and empty-selection recovery.
- Canonical `npm run verify`: **passed**. Typecheck, lint, formatting, and
  typography checks; **836 unit tests in 72 files**; Next.js and OpenNext
  Cloudflare builds; **86 enabled + 3 forced-failure + 2 disabled-preview
  browser tests**. Lint retains 17 existing warnings and has no errors.
  The offline verifier restored the production build environment on exit.
- `src/lib/audit/`, API routes, provider configuration, dependencies, and
  `intakeSurface.ts` have no diff. `PRODUCTION_INTAKE_SURFACE` remains empty.

## Behavior covered

The browser checks exercise the actual controller without `demo=1`, using
stubbed network responses: prepared values, submitted brief, branch validation
and focus, empty brand-type recovery, offerings deselect/reselect/add, empty
selection recovery, Review save/cancel, refresh during an uncommitted edit,
and scope changes that must reconfirm dependent fields before returning to
Review. Existing duplicate-question rejection and valid-question-save
regressions remain covered.

Phone and desktop checks cover chapter progress above the heading, one main
question, one footer, touch targets, full-row Review editing, no alias editor,
and all five demo screens with zero API requests and an unchanged real
workflow session. The demo tests save screenshots for each screen.

## Visual comparison and limits

The approved workbench and repaired screens were compared at phone (390px)
and desktop (1280px) widths for composition,
selected choices, typography hierarchy, chapter progress, chip grammar,
uncontained Review rows, and footer controls. Canonical Geist typography
roles replace the workbench's custom intermediate sizes and weights as
recorded in the repair plan. The workbench's outer demonstration frame and
navigation are not copied into the product.

Ten repaired-screen screenshots were inspected. The local Next.js development
indicator is separate from the product and is absent from production builds.

The current engine has one location string, not prepared location/address
records. Branch therefore shows actual supplied locations and a name-only
manual fallback. New service channels, optional customer-reasons data,
multiple competitors, complete product/source-correction routes, and the
canonical intake projection remain for the reconciled next package. Existing
Review owners outside the five repaired screens retain their current UI on
the real controller; the fictional gallery labels those edits as unavailable.

Next smallest action: founder reviews these five screens, then reconcile the
remaining data and routing package before resuming S3–S5.

## Files changed

- [docs/DECISION_LOG.md](../../docs/DECISION_LOG.md)
- [docs/NOW.md](../../docs/NOW.md)
- [docs/drafts/NUAVE_INTAKE_EXPERIENCE_HANDOFF.md](../../docs/drafts/NUAVE_INTAKE_EXPERIENCE_HANDOFF.md)
- [docs/drafts/nuave-intake-design-workbench.html](../../docs/drafts/nuave-intake-design-workbench.html)
- [specs/007-intake-airbnb-revamp/INTAKE_RECOVERY_PLAN.md](../../specs/007-intake-airbnb-revamp/INTAKE_RECOVERY_PLAN.md)
- [specs/007-intake-airbnb-revamp/S2_REPAIR_PLAN.md](../../specs/007-intake-airbnb-revamp/S2_REPAIR_PLAN.md)
- [specs/007-intake-airbnb-revamp/S2_REPAIR_VERIFICATION.md](../../specs/007-intake-airbnb-revamp/S2_REPAIR_VERIFICATION.md)
- [src/app/audit/AuditStages.tsx](../../src/app/audit/AuditStages.tsx)
- [src/app/audit/AuditWorkflow.tsx](../../src/app/audit/AuditWorkflow.tsx)
- [src/app/audit/audit.module.css](../../src/app/audit/audit.module.css)
- [src/app/audit/intake/IntakeShell.tsx](../../src/app/audit/intake/IntakeShell.tsx)
- [src/app/audit/intake/intake.module.css](../../src/app/audit/intake/intake.module.css)
- [src/app/audit/intake/screens/BranchScreen.tsx](../../src/app/audit/intake/screens/BranchScreen.tsx)
- [src/app/audit/intake/screens/OfferingsScreen.tsx](../../src/app/audit/intake/screens/OfferingsScreen.tsx)
- [src/app/audit/intake/screens/ReviewScreen.tsx](../../src/app/audit/intake/screens/ReviewScreen.tsx)
- [src/app/audit/intake/screens/ScopeScreen.tsx](../../src/app/audit/intake/screens/ScopeScreen.tsx)
- [src/app/audit/v2/intake-preview/IntakePreviewDemo.tsx](../../src/app/audit/v2/intake-preview/IntakePreviewDemo.tsx)
- [src/app/audit/v2/intake-preview/demo.module.css](../../src/app/audit/v2/intake-preview/demo.module.css)
- [src/app/audit/v2/intake-preview/demoData.ts](../../src/app/audit/v2/intake-preview/demoData.ts)
- [src/app/audit/v2/intake-preview/page.tsx](../../src/app/audit/v2/intake-preview/page.tsx)
- [src/components/product/selection/Chip.tsx](../../src/components/product/selection/Chip.tsx)
- [src/components/product/selection/SelectionRow.tsx](../../src/components/product/selection/SelectionRow.tsx)
- [src/components/product/selection/selection.module.css](../../src/components/product/selection/selection.module.css)
- [src/styles/tokens.css](../../src/styles/tokens.css)
- [tests/e2e/intake-preview-journey.spec.ts](../../tests/e2e/intake-preview-journey.spec.ts)
- [tests/e2e/intake-screen-contract.spec.ts](../../tests/e2e/intake-screen-contract.spec.ts)
