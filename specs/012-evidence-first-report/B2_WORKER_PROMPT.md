# Worker handoff: Spec 012 B2 — useful completion and answers-only recovery

> Prepared: 2026-09-25 by the orchestrator
> Status: implementation, independent technical review and visual follow-up complete
> Remaining: publication authorization and PR/CI review
> Scope: one offline B2 candidate; publication and AC-18 remain separate

The worker and reviewer have completed the implementation and technical
review; the visual follow-up is also accepted. See [B2 acceptance](./B2_ACCEPTANCE.md)
for the exact state, attributed checks and publication package. The instructions below remain the
task contract; do not repeat implementation or unchanged test gates.

You are the worker for one bounded task in the Nuave repository.

Repository: `/Users/hy4-mac-006/nuave_v0.2`. Preserve this shared checkout and
all previous candidates. Work in a fresh isolated clone under `/private/tmp/`.

## Objective and authority

Complete **Spec 012 B2 / block 3b**: add the approved code-owned action when
eligible evidence supports useful work but no corrective action survives;
require a supported finding and action before completing a new report; show
the ten retained answers when that final minimum cannot be met. Deliver one
reviewable offline implementation. Do not manufacture a business defect or
claim a finished report when analysis remains unfinished.

The founder approved Spec 012 on 2026-09-22. Read the approved source at
`9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`,
SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`.
Retrieve it with `git show` into scratch storage; if needed, fetch
`docs/astra-report-redesign-plan` read-only. Absence of the working-tree spec
on main is expected while broader documentation promotion remains separate.
Do not merge that whole branch or use an older untracked draft as authority.

R-13–R-19, AC-14–AC-17, inherited A/B1 regressions and B2's portion of AC-19
govern this work. Settled D-01–D-08 and the S3/S4 corrections are not open
product questions. The founder's delivery of this prompt releases the bounded
offline work once its entry conditions hold; routine implementation choices
inside it do not need another plan-approval cycle.

## Entry and checkout

1. Record [B1 PR #80](https://github.com/yasir-mukhtar/nuave_v0.2/pull/80),
   approved head `eb5483e75ef2a9eb7608e6492d0a28454c4bc672` and merge
   `d93ec8256200b662796103246e224bd4a3800603`, with prior main
   `8907d96d10ca101f6fdd68c8c77607cd994d83f3`. The founder said
   **“PR 80 approved. Merge deploy.”** Required PR `validate` passed on that
   exact head; the merge preserves approved tree
   `300f6cd5eb7dca278ae67c04c47d63bdae76cd1a`. The original offline independent
   PASS and founder PR approval are recorded in B1 acceptance; do not invent a
   separate published-PR review report that was not supplied.
   [Main CI and deployment](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36123028659)
   passed on the merge commit: 1,429 tests, both builds and 32 browser checks.
2. Fetch current `origin/main`, require it to contain B1 merge `d93ec82`, and
   record the actual starting SHA and acceptance evidence. The prior B1
   approval/merge prerequisite is complete; do not wait for another approval
   or stack B2 on a scratch candidate. Preserve later main changes and report
   an actual conflicting boundary rather than reopening settled decisions.
3. Create `codex/spec012-b2-useful-recovery` from current main in the isolated
   clone. Verify ancestry for report A (`d08b9e9`), Spec 011 (`7f34d69`),
   privacy R3 (`8907d96`) and the actual B1 merge. Preserve the privacy rule,
   messages and regressions; Spec 011/F-01/F-03/AC-07 remain closed.
4. Refresh main before final verification and integrate relevant drift in
   this isolated branch, preserving both changes. Recheck affected behavior
   after a changed base. Never reset, clean, switch, stage or commit the shared
   checkout or previous candidates. Do not dispatch other agents.

## Required context, in order

1. `AGENTS.md`, `README.md`, shared-source and runtime-base `docs/NOW.md`,
   and `docs/WORKFLOW.md` sections Roles, Specification-driven development
   and Worker handoff standard.
2. This prompt and the complete pinned approved Spec 012, including the exact
   R-13 template table and failure matrix; its `SPEC_REVIEW_1.md` section
   Re-check after revision 1. Read the B1 acceptance, implementation result,
   independent review and relevant `VERIFICATION.md` entries from merged B1.
3. The spec's parent sections: VISION Product principles; PRODUCT Customer,
   Promise, How results are reported and Delivery; AUDIT Report format,
   Report acceptance checklist, Handle missing and weak evidence, and Data
   boundaries; VOICE Terminology table and Report; DESIGN; journey 06's
   Direct-ten report contract. Use current-main documents plus the approved
   September 22 report amendments at the pinned source where still unmerged.
   Record that distinction; do not replace newer intake decisions wholesale.
4. Spec 009 R-07 and continuous-flow amendment; Spec 010 Failure and recovery
   and retry/cost boundaries; verified Spec 011 R-23/R-27 and historical hold.
   Spec 012 explicitly refines the narrow usefulness-failure recovery case.
   Its older R-17 version examples do not override Spec 011's merged v2
   context/report/export contract. Preserve actual current versions and fields.
5. Only the implementation paths below and their callers/tests. Read the
   relevant installed `node_modules/next/dist/docs/` guidance before Next.js
   changes. Use existing report components and approved UI primitives.

## Implementation boundary and current mappings

Before editing, state the exact expected files and any real conflict.

- Add `src/lib/audit/report-noncorrective.ts` and focused tests. Modify only
  necessary priority-validation/identity-helper access and synthesis versions
  in `contracts.ts`, plus `report-priority.ts`, `report-quality-repair.ts`,
  `report-pipeline.ts` and `report-recovery.ts` for R-13–R-15.
- In `types.ts`, derive the method-specific intermediate synthesis schema
  allowing zero priorities. Keep finished-report and findings minima intact.
  In `openai.ts`, `gemini.ts`, `groq.ts`, `openrouter.ts` and the shared report
  contract, change only the no-gap guidance and matching method-specific
  synthesis schema selection/parsing for initial and language-only requests.
  Update the actual synthesis-version constants used by affected paths; B1
  starts at `report-synthesis-v6` / `report-synthesis-v6-context`.
- `src/app/api/audit/report/route.ts` already carries pipeline error code,
  status, telemetry and diagnostics. Change its error plumbing only if needed;
  do not create a second endpoint or response envelope.
- **Current path mapping:** Spec 011 moved the active confirmed-context
  journey to `src/app/audit/SmartAuditStage.tsx`. Apply the spec's small
  audit-stage recovery integration there and in the shared `AuditRunStep.tsx`.
  Read `LocalAuditStage.tsx` for inherited behavior; do not revive held v1
  sessions or implement recovery solely in the obsolete active-flow location.
  This is the spec's permitted path mapping, not an intake redesign.
- Reuse `report-presentation.ts`, `ReportAnswer.tsx`, `AnswerMarkdown.tsx`
  and report-local styles for an observation-only projection/reader. A small
  recovery wrapper is allowed; a duplicate answer renderer is not. The
  current `AnswerPresentation.detail` is required: refactor the reading
  boundary explicitly so recovery needs no fabricated `ReportDetail`,
  classifications, measures or `AuditReport`. Keep finished-report behavior.
- `SmartAuditRecord` already has `status: "report-failed"`, string
  `reportFailure.code`, observations, attempts and cost fields. Reuse them
  and current retry/accounting helpers. No session schema/version/store change.
  Add assertions in smart and local session tests as relevant.

Protect intake/preparation/confirmation, observation transport and instructions,
measurement semantics, identities, exporter, saved fields, dependencies,
global typography, deployment configuration and privacy behavior. No new
provider/source call, candidate-payload plumbing or runtime testing switch.
Do not broaden the known testing-only Gemini converter repair into this task.
Document its inherited limitation honestly; it is not permission to skip the
required B2 method-specific parsing/zero-priority checks. If satisfying a
requirement genuinely needs an out-of-scope converter change, report the
specific failing contract and smallest proposed boundary change first.

## Required behavior

1. **Intermediate synthesis:** direct-ten permits 0–10 priorities initially
   and in language-only revision. Findings keep minimum one, final report
   actions keep minimum one, historical synthesis still rejects zero, and
   eleven/order eleven still fail. Align request and parsing contracts. Tell
   the model to return `priorities: []` if no observed gap supports an action.
   Do not include template candidates or template instructions in any model
   request or revision draft.
2. **Order of work:** existing evidence normalization and ordinary corrective
   support/quality repair, then any already permitted language-only revision
   and integrity revalidation, then code-owned selection, then final minimum.
   Empty priorities alone never trigger a retry. Permit an otherwise valid
   direct-ten language revision with empty priorities while retaining all
   evidence/classification/order/timing/owner invariants and current budgets.
3. **Exact templates:** implement P and V verbatim from approved R-13. Use
   approved human ordinal and actual evidence ID, existing identity matching,
   completed/bound observations and normalized classifications. Both require
   mentioned brand and no gap under the unchanged gap predicate. P also
   requires recommended; V requires information not assessed. Prefer P, then
   V, then earliest approved ordinal within the chosen type. Insert at most
   one only when no supported corrective action survives. Never pad findings.
4. **Origin and exactness:** every model-authored action, even one copying a
   template or adding a flag, follows ordinary gap validation. Only the later
   code-owned insertion may use the exception. Recompute the eligible object
   and require exact strings/enums/IDs/reference order/field set; only display
   order may receive normal contiguous numbering. Check extra fields before
   a parser strips them. Never normalize a forged model object into a valid
   code-owned template. No persisted discriminator, flag, score or template ID.
   Check inserted text locally against unchanged writing rules; do not send it
   back to a model. No exception for non-recoverable integrity failures.
5. **Final minimum:** for newly synthesized direct-ten only, require at least
   one supported finding AND one supported action after the above processing.
   If either is empty, do not build or return a completed report and do not
   expose the surviving section. Return `REPORT_USEFULNESS_FAILURE`, HTTP 422,
   through the existing error path with complete paid-call telemetry/costs.
   Do not reinterpret or revalidate delivered reports on read.
6. **Eligible recovery:** require the explicit usefulness-failure code and
   ten usable retained observations with valid binding. A count of ten alone
   is insufficient. Show the approved questions/full answers in retained
   order, sources, actual observation time/model, exact copy/raw controls,
   unfinished notice and permitted report retry. No rejected/surviving
   synthesis, classification badges, conclusion, comparator, score, findings,
   actions, report-ready announcement or invented metadata may appear.
7. Use notice title `Analisis Nuave belum selesai` and copy:
   `Sepuluh jawaban model AI sudah tersimpan. Analisis belum memenuhi syarat laporan. Anda dapat membaca dan menyalin jawaban di bawah.`
   Keep current retry label and truthful disabled/limit explanation. Reading,
   copy, Back and reload make no request and preserve the ledger. Retry is
   explicit, guarded against double-clicks, uses existing ceilings and the
   same observations, and never repeats completed observations. A successful
   retry replaces recovery with a newly validated report. The retained
   usefulness reader stays readable when the retry ceiling is exhausted;
   later failure codes follow their own existing recovery behavior.
8. **G4:** no Nuave print/PDF/JSON control, callback or export route is attached
   to recovery, and no report serializer runs for it. Do not suppress or
   intercept browser-native printing. Ordinary finished-report exports remain
   intact. Unsafe/incomplete/unbound/integrity/transport failures retain their
   existing handling and do not enter the new reader.

## Acceptance and validation

Use fictional public fixtures, mocked transports, a credential-free environment,
Node 22 and locked dependencies. No real customer answers or private evidence.

- AC-14/15: cover initial/retry zero-priority acceptance, final/historical
  minima, count ceilings, exact P/V eligibility and tie-breaking, no candidate
  leakage into requests, no filler beside corrective actions, and rejected
  unknown IDs/edited strings/extra keys/forged flags/model-copied templates.
  Capture requests on all four adapters without enabling unsupported v2 paths.
- AC-16: independently test findings empty/actions survive, actions empty/
  findings survive with no eligible candidate, and both empty. Each eligible
  case produces the code/422 plus preserved telemetry and no completed report.
  Also test valid code insertion followed by completed-report validation.
- AC-17: exercise the actual smart-intake journey through failure, exact raw
  text/copy, Back/reload, retry double-click, ceiling/cost exhaustion and
  successful retry. Assert no observation rerun, no automatic retry, no lost
  uncertain-attempt accounting, no hidden export callback or serializer call,
  and no rejected analysis in the DOM. Invalid binding and fictional sensitive
  input exercise existing unavailable/restrict handling without extra calls.
- Inherited A/B1: retain full answers and late caveats, safe/inert Markdown,
  all references, header dates/model provenance, truthful optional context,
  report-local focus/scroll, finished JSON fields/omissions and one print tree.
  Preserve privacy R3 and the historical hold. Confirm 20-word advisory,
  25-word hard sentence ceiling, no floor and no field totals remain unchanged.
- Check recovery and success at 1440, 390 and 320px, keyboard/focus and zoom/
  reflow. Use a representative fictional completed report for A4 PDF text
  extraction and inspection of every page; reuse final-gate artifacts where
  adequate. Confirm native browser print is not deliberately suppressed in
  recovery. State the limits of headless print/CSS zoom; do not claim native
  Save-dialog, native zoom or real-phone success from those substitutes.
- Reproduce new behavior on the base where practical, run focused checks
  while editing, then one successful final **`npm run verify`**. A changed
  candidate, failed check or uncovered risk justifies reruns; unchanged full
  gates need not be repeated for paperwork. Inspect the entire final diff,
  remove temporary diagnostics/bypasses, and tie evidence to final hashes.

## Deliverable and completion report

Return an unstaged isolated candidate plus
`specs/012-evidence-first-report/B2_IMPLEMENTATION_RESULT.md` and a dated B2
entry in `VERIFICATION.md`. Keep artifacts and logs outside the product tree.
Update narrow status records only if facts change; preserve existing history.

Record base/B1 merge and review references, actual path mappings, changed files
and complete patch, exact versions, request/schema/template order, AC-14–17
and inherited results, telemetry/export/session invariants, matching hashes,
checks actually run versus reused, screenshots/PDF page review, remaining
limits and any concrete conflict. Provide a focused independent reviewer
handoff; the founder will pass it to a separate reviewer.

No commit, push, PR, merge, deployment, live provider call, business-site fetch,
external contact or private-evidence access is authorized by this worker task.
Do not read `archive/`, credentials, raw live evidence or the four protected
Spec 011 notes. Accounting stays USD 1.06241155 of 5; old live allowances are
consumed. AC-18's founder before/after usefulness judgment remains separate:
prepare the evidence needed to review behavior without claiming that mocked
results establish usefulness. Do not mark all of Spec 012 Verified.
