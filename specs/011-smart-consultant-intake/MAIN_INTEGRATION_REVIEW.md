# Spec 011 current-main integration — independent review

2026-09-24. Reviewer verdict: **PASS for this local integration candidate.**

## Findings

No actionable integration defect found. No implementation fix is requested.

The inherited two-digit section number wraps at 320px in `answer-320.png`.
It remains readable, does not conceal answer content, and comes from unchanged
main report styling. This is a minor existing presentation limitation, not a
reason to reopen this integration. Header labels/order and printed URL-tail
policy remain the separately recorded report work.

## Scope and comparison

Reviewed the unstaged candidate at
`/private/tmp/nuave-main-integration-lvjrueuh/candidate`, branch
`codex/spec011-main-integration`, against fetched main
`4470deb2553ae1413b039191a192828c93c7fcca` and the preserved accepted working tree
on `2a21f856d33264887df6287f9b6d9dd22468fea5`.

Authority/context: AGENTS, README, NOW, WORKFLOW, Spec 011 and its accepted
correction/closeout records, `MAIN_INTEGRATION_WORKER_PROMPT.md`, the worker's
result, and the relevant approved Spec 012 sections retained from
`9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174`. The scope is integration of those
accepted inputs, including the authorized reproduction-driven navigation fix.
This review does not reopen the earlier founder acceptance.

Independently checked all 98 changed-file classifications: 86 carried files
match the accepted snapshot byte for byte; the other 12 are the stated
integration resolutions, tests and records. All 316 accepted product paths
are included in the 351-file snapshot. All 596 candidate public-file hashes,
325 candidate product hashes and 35 worker artifact hashes match. All 22
upstream-preservation comparisons agree with the actual main blobs.

Applied the complete worker patch to the recorded main using a separate bare
repository and temporary index in reviewer evidence storage. The reconstructed
tree is exactly `aeee1d2c777a6ef5574c7e8990cbfe122e11ef6c`, matching the worker's
record. Neither the candidate nor shared checkout was staged.

## Code and behavioral checks

| Area | Independent assessment and references |
| --- | --- |
| Report integration | `src/app/audit/ReportView.tsx:186` retains the explicit direct-ten routing from main while using accepted `AuditSubject` identity/focus/market handling. Its delta from main consists of the accepted context/type/header/footer adaptation. The main body, historical renderer and report-local navigation remain intact. No fabricated compatibility brief or second persisted context was introduced. |
| Smart history | `src/lib/intake/SmartIntakeJourney.tsx:99` adds the marked question/audit entries and handles the question marker; `:633` routes the existing Back button through that boundary. This is the only new runtime delta beyond combining accepted code with main. Reviewed the retained pre-fix failure and independently passed `tests/e2e/new-intake-glm.spec.ts:476`, including unmarked events, repeated contents/reference navigation, reload, real browser Back and report re-entry (`:745`), with unchanged request counts. |
| Confirmation and continuity | The combined browser case enters through actual Smart preparation, confirmation and explicit audit approval. It checks exact retained/exported v2 context, national reach with an empty area list, absent optional target, unchanged provenance and storage, ten full answers, and one run plus one report request (`tests/e2e/new-intake-glm.spec.ts:724`, `:762`). No confirmation bypass was added. |
| Historical records | Accepted v1 output/resume/retry holds remain. Main's absent/canonical/GLM renderer navigation is tested at the component boundary in `src/app/audit/report/report-body.test.tsx:236`; it does not restore held public v1 delivery to satisfy a fixture. Existing recovery and literal-record regressions passed. |
| Generation accounting | `src/lib/intake/generation-attempts.test.tsx:174` and its second retry-success assertion wait for the existing persisted ledger. Inspected the worker's failing one-entry assertion and the final diff. Request counts, cost values, execution classifications and runtime generation logic are unchanged. PR #76's existing waits and PR #77's legacy journey implementation/tests are preserved. |
| Extraction, privacy and contracts | Extraction/adapters, bounded source selection/fetch, retry eligibility, preparation state/origins, accounting, run/report routes and export implementation match the accepted snapshot. Focused regressions cover these boundaries. Main-only report adapters/components, dependency files and exact Markdown pins match main. No new retrieval, raw-source persistence, provider setting, report schema, emergency-switch or CI/deployment change was introduced for integration. |
| Print and evidence | `tests/e2e/smart-intake.spec.ts:78` now checks retained IDs, exact visible questions, ten printable answer bodies and main's Download PDF callback. The combined case tests inert Markdown, exact raw/copy/export bytes, safe source links, keyboard focus, responsive overflow and a single print tree. Both accepted F-01 print rules and main's report print styling are retained. |

## Checks performed by this reviewer

Independent execution/evidence directory:
`/private/tmp/nuave-main-integration-review-0bifml2_/`.

Created a fresh 325-file product copy and checked every file against the candidate
product manifest before and after the gates. Dependencies were copied from the
worker's installed tree; the reviewer did not perform another dependency install.
Commands used a cleared environment, fictional/blank provider keys,
`NUAVE_LIVE_PROVIDER_TESTING=0`, synthetic browser mode and local test servers.
No live provider, business-site fetch or diagnostic runner was used.

| Reviewer check | Result | Reviewer evidence |
| --- | --- | --- |
| Exact 20-suite focused Vitest selection from worker `commands.json` | **402 tests passed**, exit 0 | `focused.log` |
| Canonical `npm run verify` | **PASS**, exit 0; **1,301 tests / 92 suites**, Next and OpenNext/Cloudflare builds, **29 enabled + 3 disabled browser checks** | `verify.log` |
| Type, lint, format and typography within canonical verify | PASS; 23 warnings, zero lint errors | `verify.log` |
| Hashes, source/snapshot comparisons, patch reconstruction and whitespace | PASS | `independent-integrity.json`, separate reconstruction repository/index |
| Product-copy preservation and temporary environment restoration | All 325 hashes unchanged; temporary production environment file absent afterward | `final-preservation.json` |
| PDF and viewport inspection | All 11 pages and all seven retained viewport screenshots inspected | `independent-visual-review.json`, `pdf-pages/` |

`verify` independently ran the check and unit-test constituents of
`validate:fast`; a separate invocation of that alias was not repeated.
The worker's 402/1,301/32 success claims therefore have fresh execution support.
The worker's earlier failing runs were inspected as reproduction evidence, not
claimed as reviewer reproductions or rerun as old diagnostics.

For visual review, independently rendered the worker's final fictional Chromium
PDF with PDFKit at 1200px and inspected pages 1–11. Its independently checked
SHA-256 is
`0a59c988c474eddb7fc0e07dec8c3e878e4e9ea694813d4d526fc14bb5623688`.
All ten answers and late caveats are visible; each question heading shares the
answer's starting page; the priority heading and action share page 10. No
overlapping/clipped body text or duplicate answer tree was observed. Long URLs,
the table, nested lists, code and inert HTML remain readable. Inspected
`report-1440`, `answer-1440`, `report-390`, `answer-390`, `report-320`,
`answer-320` and `report-200-percent` screenshots.

The retained worker Poppler text contains each answer start/end marker once.
Independent PDFKit extraction reordered isolated glyphs and inserted breaks
inside words, so its exploratory token scans were not used to assert text
completeness; their outputs are retained. Independent completeness assessment
rests on the page images and the freshly rerun browser assertions. The PDF and
viewport artifacts inspected here are worker-generated artifacts, independently
inspected, not newly authored reviewer browser captures.

## Preservation and limitations

The shared source's 592 inventoried public files and four protected-note hashes
remain unchanged. Protected notes were handled by hashes only. Shared Git
status, staged diff, HEAD, branch and refs remain unchanged. The candidate's
original 596 public files, product files, branch, HEAD and empty staged diff
remain unchanged. This review adds only `MAIN_INTEGRATION_REVIEW.md` to the
candidate; original worker manifests/patch and review evidence are preserved.

This is offline integration evidence. It does not establish live extraction,
model interpretation, business visibility or report usefulness. Print coverage
is Chromium rendering and a callback spy, not a native Save dialog. Mobile
coverage is viewport emulation; 200% coverage uses CSS scaling rather than
native browser zoom. No credentials or private live payloads were inspected.

The review is tied to the recorded main SHA. The worker's final remote-main
check was inspected; the reviewer did not fetch or make a new remote freshness
claim. A later PR-readiness step must check current main and required CI.

## Verdict and next action

**PASS.** The bounded integration preserves accepted Spec 011 behavior and
main's merged report/intake fixes, with independently green offline verification.
No corrective implementation work is requested by this review.

F-01, F-03 and AC-07 remain closed; Spec 011's prior Verified acceptance on its
preserved manifest is retained. This does not mark all of Spec 012 Verified,
implement B1/B2 or authorize release. Recorded accounting stays USD 1.06241155
of 5; live allowances remain consumed. No commit, push, PR, merge or deployment
was performed. The next smallest action is a separate PR-readiness check of this
candidate against then-current main and the repository's required CI rules.
