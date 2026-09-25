# Privacy-screen R3 acceptance and publication scope

2026-09-25. **Verified offline — orchestrator accepts independent PASS.**
Publication is proposed, not authorized or completed.

## Accepted result

The founder-approved [R3](./PRIVACY_SCREEN_FOLLOWUP_PLAN.md) is implemented and
passes PS-01–PS-06. Eleven intended false alarms now pass; P5 stays allowed,
P9/P14 stay blocked as accepted cautious stops, and every blocking control
stays blocked. The retained 24-case matrix gives 12 Pass / 12 Block. Complete
word matching, both word orders and the occurrence-specific `jantung kota`
exception follow the approved word groups without guessing sentence meaning.

Both gentler messages, blocked reload, exact downstream text/origins, strong
privacy protections and existing call/retry/accounting boundaries passed.
The independent reviewer found no actionable defect and requested no code fix.
No dependency, schema, persistence, transport or provider-setting change exists.

## Exact reviewed candidate and evidence

- Worker candidate: `/private/tmp/nuave-privacy-r3-c6jkgucu/candidate/`.
- Branch: `codex/privacy-screen-false-positives`, unstaged and uncommitted.
- Base: `7f34d69d3be0c451e238f1cddf0da62dda250eb1`.
- Base tree: `1a9e3431f674e759f061a827993d4e89e124e7c4`.
- Reviewer-reconstructed tree: `a912319bca492b4fbb9627b9fae3a4d7db9b78c7`.
- Complete worker patch SHA-256:
  `59df8233eeac3377f59fbe29eec7178c8beee5cea1f8f4829cea2691f48bb0c3`.
- [Independent review](/private/tmp/nuave-privacy-r3-c6jkgucu/PRIVACY_SCREEN_FOLLOWUP_REVIEW.md)
  SHA-256: `310f40cbcb8520f57a0b2ce75f4c2da299b00df011c7a3906a59cc186fcf7756`.
- Worker result: `PRIVACY_SCREEN_FOLLOWUP_RESULT.md` inside the candidate's
  Spec 011 directory. Its pending-review language records its earlier handoff;
  this acceptance supersedes that status without rewriting the worker evidence.

The reviewer independently passed **287 affected tests plus 14 new fictional
probes** (301 total in seven suites), reproduced the baseline and corrected
matrices, and checked all callers and the full patch. It reused the matching
worker **`npm run verify`: 1,407 tests in 93 files, both builds and 32 browser
checks (29 enabled + 3 disabled), exit 0**. Lint has 23 warnings and zero errors.
The earlier failed gate had two browser assertions for the old copy; correcting
those assertions justified the successful final run. No full reviewer rerun
was required.

The orchestrator read the review/result and completion logs, independently
matched all **20 changed-file hashes, 19 gate-input hashes and 17 artifact
hashes**, and checked the worker patch hash. A read-only GitHub lookup still
returned the exact reviewed main base. No tests or live calls were repeated.
The evidence folders are historical local aids; this note retains the verdict,
scope, versions, counts and limitations without requiring those folders to
understand the result.

## Concrete publication proposal

Publication copy:
`/private/tmp/nuave-privacy-r3-publication-d5v5f4ll/candidate/`.
This starts from the exact base and worker patch. Only documentation closeout
differs from the reviewed candidate; all runtime and test files are identical.
The original worker candidate, review and evidence remain unchanged.

Proposed commit/PR title: **Fix privacy-screen false alarms in business preparation**.
Branch: `codex/privacy-screen-false-positives`; base: `main`; open as a **draft PR**.
The package is 21 files: the 20 reviewed task files plus this acceptance note.

- Runtime: `src/lib/audit/sensitive-intake.ts`, `src/lib/audit/types.ts`,
  `src/lib/intake/SmartIntakeJourney.tsx`, `src/lib/intake/smart-intake-contract.ts`.
- Tests: `src/lib/audit/sensitive-intake.test.ts`, `source-excerpt.test.ts`,
  `question-facts-v3.test.ts`, `direct-ten-route.test.ts` in the same audit folder;
  `src/lib/intake/smart-intake-contract.test.ts`, `smart-source-preparation.test.tsx`;
  `tests/e2e/new-intake-journey.spec.ts`, `tests/e2e/smart-intake.spec.ts`.
- Documents: `docs/NOW.md`, `docs/INDEX.md`, `docs/DECISION_LOG.md`;
  Spec 011 `SPEC.md`, `F03_PRODUCT_CORRECTION_SCOPE.md`, and
  `PRIVACY_SCREEN_FOLLOWUP_{PLAN,EVIDENCE,RESULT,ACCEPTANCE}.md`.

The exact PR body, file hashes, proposed tree and patch are retained beside the
publication copy. Approval would authorize committing this package, pushing
this branch, opening its draft PR, and the repository's existing automatic
isolated synthetic preview and preview-link workflow comment. The workflow
uses dummy provider credentials. Check current main again before publication;
material drift requires bounded reconciliation, not an automatic force push.
Wait for required CI on the exact published commit and report the result.

Merge, production deployment and live provider calls remain separate. The
repository requires explicit founder authorization for commit/push/publication;
offline approval and this PASS do not supply it.

## Preserved limits

The screen remains a mechanical check, not a guarantee of privacy detection.
P9/P14 and similar ambiguous wording can still stop. Fictional checks do not
establish real-site frequency, live discovery/model interpretation or production
transport behavior. Blocked reload was independently tested by UI remount with
retained session storage; browser checks are attributed to the worker gate.
Native PDF saving, physical-device and native-zoom limits remain unchanged.

Spec 011 stays Verified and F-01/F-03/AC-07 stay closed. Spec 012's separate work
is unaffected. No new paid allowance was used; accounting stays
**USD 1.06241155 of 5**. Next: the founder's bounded publication decision.
