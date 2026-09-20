# 2026-09-19 — legacy audit flow (pre-Spec-010)

This was the old intake → question → variance audit journey: the `/audit` and
`/audit/v2` page flows (`AuditWorkflow`, `AuditStages`, `AuditEntryShell`,
`AuditPrePaymentJourney`, the Spec-007 `intake/` screens, the `fixture/` and
`spec004/` preview pages, the founder-only `local-report` page), their API
routes (`/api/audit/prompts`, `/api/audit/variance`, `/api/audit/local-audit`),
the libraries that served only that flow (`workflow-authority`,
`workflow-storage`, `payment-boundary`, `fixture-journey`, the
`fixture-kopi-taman-senja` pack), the old handoff/e2e specs under `tests/e2e/`,
and `playwright.config.failure.ts` (the forced-failure suite for the fixture
preview). It was archived — not deleted — because Spec 010
(`specs/010-gated-new-audit-flow`) made the direct-ten journey the public trial
on `/audit` and rejected the legacy `canonical`/`glm-slots` question methods at
the shared routes. Snapshot: the working tree on `codex/spec010-public-flow`
on 2026-09-19 (commit `18d860b` plus uncommitted Spec 010 work). Archived files
keep their original import specifiers (`@/…`) for readability; they are
excluded from tsconfig, vitest, and eslint and are not compiled or runnable.
