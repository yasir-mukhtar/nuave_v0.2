# Spec 011 current-main integration result

2026-09-24. **PASS — worker integration and offline checks. Independent review pending.**
This is an uncommitted candidate, not independent acceptance, PR/CI readiness or
release authority. The shared source checkout and its Git state are unchanged.

## Candidate and exact bases

- Candidate: `/private/tmp/nuave-main-integration-lvjrueuh/candidate/`
- Branch: `codex/spec011-main-integration`; HEAD remains fetched main, with all new work unstaged.
- Main at initial fetch and final remote check: `4470deb2553ae1413b039191a192828c93c7fcca`.
  Final remote check recorded at `2026-09-24T13:48:47.482809+00:00`;
  no drift was observed. Future drift requires a new check before PR readiness.
- Accepted source: `/Users/hy4-mac-006/nuave_v0.2`, branch
  `devin/sol-smart-consultant-intake-plan`, HEAD
  `2a21f856d33264887df6287f9b6d9dd22468fea5` plus its reviewed working tree.
- All 316 accepted product hashes matched before transfer. Source manifest:
  `/private/tmp/nuave-f03-location-j1557mch/candidate-product-hashes.json`, SHA-256
  `78027f56252a682631488b680151ea795fa90b0c56d6089e705bd0498b759403`.
- Common ancestor: `4e6b2cf6302a0679aa7820d163b214ac8b486e1f`.
- Spec 012's governing sections were read from approved commit
  `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174`; its documentation branch was not imported.

The accepted public product and necessary public Spec 011/status records were
frozen into the read-only `/private/tmp/nuave-main-integration-lvjrueuh/snapshot/` (351 files, plus
its manifest). The complete accepted delta from the common ancestor was built
with a separate temporary index and reconciled against current main. This includes
accepted untracked source-excerpt and preparation regressions; it is not a HEAD-only
cherry-pick or a wholesale source-tree replacement. Initial three-way reconciliation
found two code conflicts and cleanly combined `docs/NOW.md`; there were no path moves.

## Reconciled behavior and bounded exceptions

1. **Report context/body/navigation.** `ReportView.tsx` retains Spec 011's
   `AuditSubject`, exact v2 identity/focus/market helpers and optional absence.
   It also retains main's explicit `question_method === "direct-ten"` routing,
   `DirectTenReportBody`, historical renderer and PR #77's report-local contents
   handler. No compatibility brief, agency fallback or second context store was
   introduced for v2.
2. **Active v2 browser coverage.** `new-intake-glm.spec.ts` retains the accepted
   Smart preparation, edited-question, exact run/report/export and recovery cases.
   Main's full-answer/Markdown/raw/copy/source/navigation/responsive/print case now
   starts through actual Smart confirmation and explicit audit approval and reads
   `nuave.localIntakeAudit.v2`. It verifies national reach with empty areas and
   optional target absent, identical retained context/provenance, ten full answers,
   safe sources, inert Markdown, unchanged storage and no additional requests across
   contents/references, JSON, print, reload and Back/re-entry.
3. **Reproduced Smart Back regression.** Before the navigation fix, browser Back
   from the report after reload did not return to the approved question screen
   (`browser-navigation-red.log`, test assertion now near line 753). The Smart
   journey had no history handler. `SmartIntakeJourney.tsx:99` now creates marked
   question/audit history entries and handles only its question entry; unmarked,
   fragment-like and legacy markers leave the report intact. The existing Back
   button uses that same history boundary. Returning to the saved report makes
   no budget, source or provider request. No persisted schema or context changes.
4. **Historical eligibility.** Old started/completed v1 records remain under the
   accepted UI/server delivery/resume/retry hold. Main's historical renderer
   navigation case moved to `report-body.test.tsx` at the component boundary,
   covering absent/canonical/GLM methods, original denominators and all five links
   by mouse and keyboard without changing history or fixture bytes. The public
   v2 flow never reactivates a v1 report to satisfy a presentation fixture.
5. **Upstream intake fixes.** `IntakeJourney.tsx` and `journey-state.test.tsx`
   remain byte-identical to fetched main, preserving PR #77. PR #76's ledger waits
   remain. A focused run reproduced a remaining retry-success storage race at
   `generation-attempts.test.tsx:175`; the two success assertions now wait for the
   persisted two-attempt ledger. Call counts, cost/execution assertions and runtime
   generation behavior remain unchanged. See the failing `focused.log`.
6. **Print/labels.** `smart-intake.spec.ts` expected the old label and internal IDs
   printed by the former renderer; the first combined run reproduced that mismatch.
   It now asserts retained IDs, exact visible questions, ten visible answer bodies
   under print media and main's `Download PDF` label. The accepted two F-01 print
   rules in `audit.module.css` remain byte-identical to source. Main's report-local
   CSS/full-answer print protections remain byte-identical to main; no CSS fix was
   needed for the integrated PDF.
7. **Records.** Candidate README/NOW/INDEX/spec index route to this result. Source
   Spec 011 Verified/closed acceptance and main's PR A merged records are retained.
   Current routing states that PR #77 fixed the old nav defect; header labels/order,
   printed URL tails, B1/B2 and the report documentation-branch promotion remain
   separate. Existing live-flow items and consumed authorization boundaries remain.

All other carried extraction/preparation/contract/recovery implementation is
byte-identical to accepted source. Provider instructions/settings, request counts,
retry eligibility, fetch/privacy policies, accounting, question/observation methods,
report synthesis/schema, emergency switch and CI/deployment gates were not changed
for integration. Main-only report runtime/adapter files and pinned dependencies
are unchanged. Every exception is listed above and classified in the evidence.

## Actual worker verification

Environment: Darwin arm64, Node v22.23.2, npm 10.9.8; Next 16.3.5,
Vitest 4.1.11. `npm ci --offline --no-audit --no-fund` exited 0 and installed
1,061 packages from the local cache. Both dependency files match fetched main:

- `package.json`: `e3f4c125aadd88f3bb4c9a69c260dfa60415e8fa9c51cf17a68fae31a82ac69e`
- `package-lock.json`: `9bd9ecf66b8494f44d48348fa8ab170dc155e49e4ff3912df35d00f86edefc5a`
- Exact pins remain `react-markdown@10.1.0` and `remark-gfm@4.0.1`.

Commands used the external `evidence/offline-run.py` with a cleared environment,
required dummy build keys, other provider keys blank, live-provider testing off
and loopback-only synthetic browser servers. `offline-environment.json` records
safe settings. The verifier restored its temporary production environment file.
No source/business lookup, retained live driver or live provider call was used.

| Command / check | Actual result | Evidence file |
|---|---|---|
| Initial focused Vitest selection | 366 passed, 1 failed; retry-success ledger race | `focused.log` |
| Initial adapted report browser case | Test used `kind` instead of the existing context's `reach`; corrected the test | `browser-before-navigation.log` |
| Corrected pre-navigation browser case | Reproduced Smart Back failure | `browser-navigation-red.log` |
| First combined browser run | 12 passed, 1 stale print assertion failed | `browser-combined.log` |
| Final focused Vitest selection | **402 passed in 20 suites**, exit 0 | `focused-final.log` |
| `playwright test tests/e2e/new-intake-glm.spec.ts tests/e2e/smart-intake.spec.ts` | **13 passed**, exit 0 | `browser-combined-final.log` |
| `npm run verify` | **PASS**, exit 0: **1,301 tests in 92 suites**, Next production and OpenNext/Cloudflare builds, **29 enabled + 3 disabled browser checks** | `verify.log` |
| Type/lint/format/typography | PASS; **23 existing lint warnings, zero errors** | `verify.log` |
| Whitespace, source preservation, manifest and patch reconstruction | PASS | `final-preservation.json`, `reconstruction.json` |

The focused selection covers extraction/source safety/preparation, both adapters,
Smart contracts/journey, local audit sessions, direct-ten route, customer export,
report adapter/body/labels/recovery, generation attempts, navigation and main's
marked-history tests. The exact command is retained in `commands.json`.
The initial selection accidentally named `navigation.test.tsx`; the corrected
20-suite run used `navigation.test.ts` and included `journey-state.test.tsx`.
No test was skipped/deleted or assertion weakened to make the gate pass.
The 32 full-gate browser checks include explicit recovery, uncertainty/attempt
ceilings, duplicate protection, literal v1 holds and the disabled flow.
Only result/routing documents changed after the final code gates; no code/test
or dependency change followed their successful runs.

## New fictional visual/print evidence

Artifacts: `/private/tmp/nuave-main-integration-lvjrueuh/evidence/browser-combined-final/`
`new-intake-glm-Spec-012-re-8d586-s-reflow-and-one-print-tree/`.
Inspected `report-1440.png`, `answer-1440.png`, `report-390.png`, `answer-390.png`,
`report-320.png`, `answer-320.png` and `report-200-percent.png`. No horizontal
page overflow or clipped body text was observed. At 320px the inherited two-digit
section number can wrap vertically; this minor presentation limitation does not
hide content and is not a new integration runtime change.

Fresh A4 artifact: `report-print-a4.pdf`, **11 pages**, SHA-256
`0a59c988c474eddb7fc0e07dec8c3e878e4e9ea694813d4d526fc14bb5623688`.
Rendered every page with bundled Poppler at 1200px and visually inspected all
11 PNGs in `/private/tmp/nuave-main-integration-lvjrueuh/evidence/pdf-pages/`. Text checks are retained in
`report-print-a4.txt` and `visual-review.json`: all ten answer start/end markers
occur once, each exact question heading shares its answer-start page, controls
and duplicate raw bodies are absent, and the priority heading/action remain
together on page 10. All answers/late caveats, long URLs, nested lists, code,
inert HTML and the table are readable without clipping or stranded headings.

This is one Chromium print-engine rendering from the final product, plus a
separate `window.print()` callback spy. It does not validate a native OS Save
dialog, physical mobile, external PDF-link behavior or live model interpretation.
The 200% check uses CSS scaling, not browser-native zoom. The fixture establishes
presentation/continuity, not real visibility or report usefulness.

## Preservation and reproducible handoff

Evidence root: `/private/tmp/nuave-main-integration-lvjrueuh/evidence/`; evidence/scripts/screenshots stay outside the candidate.
The shared source's **592** inventoried public files, status, index, HEAD and refs
remain unchanged, including all four protected local notes (hash-only handling;
not read/copied) and prior independent reviews. The accepted 316 source product
hashes and all 17 prior implementation artifact hashes still match. The read-only
snapshot matches its 351-file manifest. Protected notes, `.env*`, secrets, raw/private
evidence, ignored diagnostics, archive trees and unrelated untracked drafts were
not transferred. Sparse checkout excludes archive/environment paths on main too.

The final product manifest contains **325 files**:
`candidate-product-hashes.json`, SHA-256
`5bafb5dc4c629cb4493cbccabce79a36800d65970f4d577c2857093341b53bb5`.
`candidate-files.json` additionally records all included public candidate files;
`changed-file-inventory.json` classifies the complete delta below. The full
`candidate.patch` includes additions and this result, generated with a separate
index without staging the candidate. **Exact patch/full-manifest/result hashes
are in `artifact-hashes.json`**, avoiding a self-referential checksum inside this
result. `reconstruction.json` records an independent temporary-index application
of that patch onto the recorded main and matching file hashes. `source-delta.patch`
and `accepted-tree.txt` retain the complete common-ancestor-to-accepted-source delta.

To reconstruct: clone the public repository into a new directory; configure the
same sparse exclusions if required; create a dedicated branch at the full main SHA
above; run `git apply --check /absolute/path/to/evidence/candidate.patch`, then
`git apply /absolute/path/to/evidence/candidate.patch` without `--index`; compare
SHA-256 values against both candidate manifests. Install from the unchanged
lockfile, rerun the focused/gate commands with the documented offline environment,
and inspect the new artifacts. Never copy the source checkout wholesale or use a
HEAD-only diff. No Git commit or ref publication is required to review this candidate.

## Complete changed-file inventory against fetched main

`A` means added; `M` means modified. There are **98 changed files** and
no deletions. Carried files are byte-identical to the accepted snapshot. Reconciled
files include only the bounded exceptions above and candidate status/result records.
The sidecar inventory records SHA-256 for every entry. Main additions that are
unchanged are separately recorded in `upstream-preservation.json`.

| Change | Path | Classification |
|---|---|---|
| M | `README.md` | integration reconciliation/record |
| M | `docs/DECISION_LOG.md` | carried Spec 011 |
| M | `docs/INDEX.md` | integration reconciliation/record |
| M | `docs/NOW.md` | integration reconciliation/record |
| M | `playwright.config.ts` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/ACCEPTANCE_CLOSEOUT_REVIEW.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/ACCEPTANCE_CLOSEOUT_REVIEW_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/ACCEPTANCE_EVIDENCE.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/ACCEPTANCE_REVIEWER_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/ACCEPTANCE_WORKER_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_COMPLETENESS_REVIEW.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_PROPOSAL.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_RESULT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_WORKER_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_DIAGNOSTIC_CAPTURE.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_FOUNDER_WALKTHROUGH.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_IMPLEMENTATION_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_IMPLEMENTATION_RESULT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL_REVIEW.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_REVIEW.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_WALKTHROUGH_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_WALKTHROUGH_RESULT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_IMPLEMENTATION_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_IMPLEMENTATION_RESULT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_REVIEW.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_REVIEW_2.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_SCOPE.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_SOURCE_SUPPORT_RESULT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/F03_SOURCE_SUPPORT_WORKER_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/IMPLEMENTATION_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/MAIN_INTEGRATION_RESULT.md` | integration reconciliation/record |
| A | `specs/011-smart-consultant-intake/MAIN_INTEGRATION_WORKER_PROMPT.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/SPEC.md` | carried Spec 011 |
| A | `specs/011-smart-consultant-intake/VERIFICATION.md` | integration reconciliation/record |
| M | `specs/README.md` | integration reconciliation/record |
| M | `src/app/api/audit/extract/route.ts` | carried Spec 011 |
| M | `src/app/api/audit/glm-questions/route.ts` | carried Spec 011 |
| M | `src/app/api/audit/report/route.ts` | carried Spec 011 |
| M | `src/app/api/audit/run/route.ts` | carried Spec 011 |
| M | `src/app/audit/ReportView.tsx` | integration reconciliation/record |
| A | `src/app/audit/SmartAuditStage.tsx` | carried Spec 011 |
| M | `src/app/audit/audit-intake.client.tsx` | carried Spec 011 |
| M | `src/app/audit/audit-page.test.tsx` | carried Spec 011 |
| M | `src/app/audit/audit.module.css` | carried Spec 011 |
| M | `src/app/audit/page.tsx` | carried Spec 011 |
| M | `src/app/audit/report/report-body.test.tsx` | integration reconciliation/record |
| M | `src/lib/audit/client-contract.ts` | carried Spec 011 |
| M | `src/lib/audit/contracts.test.ts` | carried Spec 011 |
| M | `src/lib/audit/contracts.ts` | carried Spec 011 |
| M | `src/lib/audit/customer-evidence-export.test.ts` | carried Spec 011 |
| M | `src/lib/audit/customer-evidence-export.ts` | carried Spec 011 |
| A | `src/lib/audit/direct-ten-context-v2.ts` | carried Spec 011 |
| M | `src/lib/audit/direct-ten-route.test.ts` | carried Spec 011 |
| M | `src/lib/audit/gemini.test.ts` | carried Spec 011 |
| M | `src/lib/audit/gemini.ts` | carried Spec 011 |
| M | `src/lib/audit/groq.ts` | carried Spec 011 |
| M | `src/lib/audit/local-direct-ten-audit.ts` | carried Spec 011 |
| M | `src/lib/audit/local-preparation-routes.test.ts` | carried Spec 011 |
| M | `src/lib/audit/locked-question-pack.ts` | carried Spec 011 |
| M | `src/lib/audit/openai.test.ts` | carried Spec 011 |
| M | `src/lib/audit/openai.ts` | carried Spec 011 |
| M | `src/lib/audit/openrouter.ts` | carried Spec 011 |
| M | `src/lib/audit/provider.ts` | carried Spec 011 |
| M | `src/lib/audit/question-facts-v3.ts` | carried Spec 011 |
| M | `src/lib/audit/questions-id-direct-ten.ts` | carried Spec 011 |
| M | `src/lib/audit/report-pipeline.ts` | carried Spec 011 |
| M | `src/lib/audit/report-priority.ts` | carried Spec 011 |
| M | `src/lib/audit/report-quality-repair.ts` | carried Spec 011 |
| M | `src/lib/audit/retry.ts` | carried Spec 011 |
| M | `src/lib/audit/run-orchestrator.ts` | carried Spec 011 |
| M | `src/lib/audit/safe-source-fetch.test.ts` | carried Spec 011 |
| M | `src/lib/audit/safe-source-fetch.ts` | carried Spec 011 |
| A | `src/lib/audit/sensitive-intake.ts` | carried Spec 011 |
| A | `src/lib/audit/source-excerpt.test.ts` | carried Spec 011 |
| A | `src/lib/audit/source-excerpt.ts` | carried Spec 011 |
| M | `src/lib/audit/types.ts` | carried Spec 011 |
| M | `src/lib/audit/website-input.test.ts` | carried Spec 011 |
| A | `src/lib/intake/SmartIntakeJourney.tsx` | integration reconciliation/record |
| A | `src/lib/intake/SmartQuestionsScreen.tsx` | carried Spec 011 |
| A | `src/lib/intake/SmartSummary.tsx` | carried Spec 011 |
| M | `src/lib/intake/generation-attempts.test.tsx` | integration reconciliation/record |
| M | `src/lib/intake/glm-local.ts` | carried Spec 011 |
| A | `src/lib/intake/historical-audit.ts` | carried Spec 011 |
| M | `src/lib/intake/local-audit-session.test.ts` | carried Spec 011 |
| A | `src/lib/intake/smart-audit-session.ts` | carried Spec 011 |
| A | `src/lib/intake/smart-intake-contract.test.ts` | carried Spec 011 |
| A | `src/lib/intake/smart-intake-contract.ts` | carried Spec 011 |
| A | `src/lib/intake/smart-journey.test.tsx` | carried Spec 011 |
| A | `src/lib/intake/smart-session.ts` | carried Spec 011 |
| A | `src/lib/intake/smart-source-preparation.test.tsx` | carried Spec 011 |
| M | `tests/e2e/audit-entry.spec.ts` | carried Spec 011 |
| M | `tests/e2e/new-intake-glm.spec.ts` | integration reconciliation/record |
| M | `tests/e2e/new-intake-journey.spec.ts` | carried Spec 011 |
| A | `tests/e2e/smart-intake.spec.ts` | integration reconciliation/record |
| A | `tests/spec011-v1-records.json` | carried Spec 011 |

## Disposition

No unresolved material integration requirement or blocker was found in worker
checks. Independent review is next; no reviewer sub-agent was dispatched. Spec 011
remains Verified on its original accepted manifest; F-01, F-03 and AC-07 remain
historically closed. This candidate has its own worker PASS, not independent
acceptance. Spec 012 remains in progress with PR A merged and B1/B2 pending.
No staging, commit, push, PR creation, merge, deployment, external message, new
live preparation or spend occurred. Accounting remains **USD 1.06241155 of 5**;
all previous live allowances remain consumed.
