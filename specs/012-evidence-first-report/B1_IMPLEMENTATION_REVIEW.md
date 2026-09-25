# Spec 012 B1 independent implementation review

2026-09-25. Reviewed the unstaged candidate on `codex/spec012-b1-report-content`
against base `8907d96d10ca101f6fdd68c8c77607cd994d83f3`.

## Findings

**No actionable B1 defect found. No corrective implementation change requested.**
There is therefore no new severity-ranked reproduction or fix list.

The disclosed Gemini schema problem is a **pre-existing limitation**, not a
B1 regression: [gemini.ts:636](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/lib/audit/gemini.ts:636) converts the
Zod schema through `typeName`, while this repository uses Zod 4. The report
request consequently lacks meaningful array/order constraints. I confirmed
the helper is byte-identical to the base. B1 widens the shared post-response
validation and adds count instructions; this review does **not** certify
Gemini's provider-side structured-output schema. Gemini remains testing-only
and unavailable for v2 context. Any schema repair belongs to separately scoped
work, not a prerequisite invented for this instruction-only change.

## Scope and evidence integrity

- Read the candidate's `AGENTS.md`, `README.md`, `docs/NOW.md`,
  `docs/WORKFLOW.md`, the B1 result and verification addition, the approved
  Spec 012 requirements, and their relevant product/audit/voice/design,
  journey, and Specs 009–011 context.
- Approved spec: Git object
  `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`.
  Its SHA-256 independently matches
  `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`.
  This pinned document, including D-03's approved ten-item limit, is the B1
  authority; the candidate does not contain that spec as a working-tree file.
- Independently confirmed the base contains `7f34d69` (Spec 011), `d08b9e9`
  (report A), and `dd9e405` (privacy R3). No fetch, rebase, or integration was
  performed. The worker's remote-main freshness check was not repeated.
- Inspected the complete 20-file working-tree delta: 18 code/test files,
  including the untracked header helper, plus two result/verification records.
  No dependency, lockfile, persisted-field, migration, export, provider
  transport, observation, intake, scoring, repair, pipeline, or privacy-rule
  change is hidden in the patch.
- All 18 entries in `evidence/changed-file-hashes.txt` match the candidate.
  Applied `b1-code.patch` to a temporary index at the base: all 263 source/test
  files in that reconstructed index match the candidate, with no mismatch.
- Created an independent test copy at
  `/private/tmp/nuave-spec012-b1-review-_khzzt91/repo`. All 327 copied product,
  test, script and configuration files matched before testing and remained
  equal afterwards. No credentials, environment files or archived evidence
  were copied. Reviewer-only probes were added solely to this copy.

Verified artifact SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| `evidence/b1-code.patch` | `11df20b3b25fe3023efb6b61bb262c7d2c6fb0e880ece4e9dafe0f9d21821f28` |
| `evidence/verify.log` | `67a43f74e3a784838594cd137e116bb161d720d269fbd6b26057e5430a8cf9f8` |
| Worker `report-print-a4.pdf` | `257944bccbcfac6dd3377108c1a11d7193474271c7712ea99191f47cb6210493` |

## Acceptance assessment

| Requirement | Independent assessment |
| --- | --- |
| AC-11 / R-10 | PASS. [types.ts:377](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/lib/audit/types.ts:377) raises findings, priorities and order to ten through the shared schema; synthesis derives those fields. Minimum one remains. Three stay three; ten/order ten pass and eleven/order eleven fail. A reviewer rendering probe confirms all ten findings and actions appear once, without changing retained evidence. Existing positive-only action rejection, empty-content delivery and recovery tests pass. |
| AC-12 / R-11 | PASS within B1's scope and the Gemini limitation above. [report-prompt-contract.ts:129](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/lib/audit/report-prompt-contract.ts:129) supplies direct-ten-only evidence, non-padding, owner, completion and caveat guidance to all four adapters, including language-only requests. The count helper changes only the count sentence; the existing OpenAI/Gemini gap clauses remain verbatim. No B2 exception is advertised. Provider settings, request construction outside instructions, retry eligibility, cost accounting and observation messages are unchanged. |
| Version and language | PASS. [contracts.ts:76](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/lib/audit/contracts.ts:76) records `report-synthesis-v6` and `report-synthesis-v6-context`. The unchanged [report-pipeline.ts:505](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/lib/audit/report-pipeline.ts:505) selects the context version for new v2 reports. Existing saved provenance is not rewritten. The base and candidate language module are byte-identical: no sentence floor, advisory maximum 20 words, hard maximum 25, no field totals. |
| AC-13 / R-12 | PASS. [ReportView.tsx:196](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/app/audit/ReportView.tsx:196) consumes the existing `AuditSubject` identity/focus/market mapping. It shows the exact brand/product/location scope without inventing optional values or agency attribution. Header dates and actual system/returned models come from the same validated answers as the body. [report-header.ts:14](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/app/audit/report/report-header.ts:14) compares instants without sorting the observations and displays explicitly labeled UTC. Invalid evidence bindings show unavailable metadata rather than a creation-date substitute. Historical/absent-method routing remains unchanged. |
| Contents and creation time | PASS. [ReportView.tsx:223](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/app/audit/ReportView.tsx:223) uses body order and labels; its existing navigation handler still focuses and scrolls locally without URL/history changes. Creation time remains separately labeled in [DirectTenReportBody.tsx:169](/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/src/app/audit/report/DirectTenReportBody.tsx:169). The existing suggested-owner label is retained. |
| Inherited A / AC-10 / R-16–R-17 | PASS offline. The affected browser regression passes exact retained questions/answers, raw view/copy, inert Markdown, evidence references, report-local navigation, reflow, print/JSON and Back/reload. Run/report counters stay at one each and the saved snapshot remains unchanged. Export/session/intake-contract regressions pass. No new provider call, source fetch, persistence or downstream contract is introduced. |
| B1 AC-19 | PASS offline. The patch respects the B1 boundary and uses integrated A and verified Spec 011. The canonical gate is reused only after checking its log and matching code/test hashes. B2 behavior and whole-spec acceptance are not claimed. |

## Checks independently rerun

All tests used fictional fixtures, a clean environment without live credentials,
and the repository's offline/synthetic paths. Node 22.23.2 / npm 10.9.8.

- **305 existing focused tests passed across 17 suites:** contracts, shared
  report instructions, four report adapters, report gaps, priority validation,
  language, pipeline, delivery resilience, recovery, presentation, report body,
  customer evidence export, local session and smart-intake contract.
- **Four reviewer-only probes passed:** ten findings/actions render once with
  immutable retained evidence; mixed timezone offsets sort by actual instant;
  equivalent instants display as one UTC time; invalid ID binding cannot leak
  apparently valid header metadata. Date probes also ran under
  `TZ=Pacific/Honolulu`.
- **One affected Playwright regression passed:**
  `tests/e2e/new-intake-glm.spec.ts:476`, including the B1 header assertions and
  inherited report interactions. The first launch was blocked by sandbox
  `listen EPERM`; the same command passed after approval to bind the isolated
  synthetic server on loopback `127.0.0.1:3187`. No product change was made.
- **`git diff --check` passed.** Independently inspected the package scripts:
  `format:check` does not include Markdown. The two later documentation edits
  therefore do not invalidate the unchanged product gate; no Markdown
  formatting success is inferred from that gate.
- Independently inspected the worker's 1440, 390 and 320px header screenshots,
  its CSS-zoom screenshot, and **all 11 PDF page images**. No clipping,
  duplicated answer body or stranded section heading was found. Re-rendered
  the retained PDF with PDFKit and re-extracted its text: 11 pages, text equal
  to the worker extraction, and ten answer starts and ten final caveats each
  present once in order. PDFKit splits some glyphs across lines; marker counts
  remove whitespace, rather than pretending the extraction is verbatim raw
  answer text. Exact raw-text preservation is checked by the browser tests.

Reviewer logs, commands, probes and manifests are retained in
`/private/tmp/nuave-spec012-b1-review-_khzzt91/`, notably `focused.log`,
`intake-contract.log`, `reviewer-probes.log`, `browser-rerun.log`,
`evidence-integrity.json`, `pdf-marker-check.json` and
`preservation-after.json`.

## Checks reused and limits

- **Reused, not independently rerun:** the final worker `npm run verify`.
  I inspected its log: 93 unit-test files / **1,429 tests**, Next and OpenNext
  builds, **29 + 3 browser tests**, formatting/type/typography checks, and lint
  with zero errors / 23 warnings, ending `Offline verification passed`.
  The matching manifest and instruction to reuse this gate support reuse;
  no concrete concern required another full build/gate run.
- The worker's pre-fix header log contains three behavioral failures. Its
  pre-fix contract log fails at import because helpers did not yet exist;
  this is not a behavioral red/green proof of every new count assertion.
- Mocked requests establish instructions and validation, not real model
  compliance, better synthesis, successful live delivery or owner usefulness.
  No real answers or private live payloads were inspected. No live/provider
  request, source fetch, spending, commit, push, publication or deployment
  occurred during this review.
- CSS `zoom: 2` is an approximation, not native browser zoom. Chromium PDF
  generation and a print spy do not exercise the native OS Save dialog.
- Candidate/shared status, HEAD, branch and index remain unchanged. All 20
  candidate changed-file hashes and all 327 candidate product-file hashes are
  unchanged. The review file is outside the candidate checkout; worker records
  and evidence were preserved.

## Verdict

**PASS — accept the bounded offline B1 implementation.** No implementation fix
is required before its separately authorized PR/release process. Recheck the
published diff and required CI against the eventual PR base.

This does **not** complete Spec 012: B2, the founder's AC-18 before/after
usefulness judgment, and combined verification remain outstanding. Spec 012
remains Approved/in progress, not Verified. Existing Spec 011 closeout and
privacy acceptance are not reopened.
