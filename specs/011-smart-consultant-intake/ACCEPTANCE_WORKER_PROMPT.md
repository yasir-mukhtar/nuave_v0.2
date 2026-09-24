# Spec 011 remaining acceptance: rendered PDF and founder preparation review

Prepared: 2026-09-22. Use this prompt in the existing local working tree.

## Role and single deliverable

You are the acceptance worker for the completed Spec 011 implementation.

Repository: `/Users/hy4-mac-006/nuave_v0.2`

Close the remaining acceptance evidence: inspect an actual rendered PDF from
the fictional offline product flow, then conduct the founder's preparation-only
desktop/mobile walkthrough **only after separate explicit live authorization**.
Record what passed, failed, or remains pending without changing runtime code.

The founder relayed the independent reviewer's latest **PASS**: 27 focused
tests and six mocked report-recovery cases passed; first/third attempts in
running, interrupted, and report-failed states behave correctly; exhausted
attempts make no requests, including Back/re-entry; restoration preserves
stored bytes. All reported findings are closed. The 1,140-test gate, both
builds, and 31 browser checks remain implementation-agent results, not tests
the reviewer independently repeated. The orchestrator has not rerun them.

This is the next acceptance task, not another implementation or broad code
review. The PASS does not itself mark Spec 011 Verified or authorize live
calls, commits, publication, or deployment. Historical delivery/retry remains
held; the accepted scope is not reopened.

## Verify and preserve the working tree

Run:

```sh
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-parse origin/devin/sol-smart-consultant-intake-plan
git status --short
git diff --cached --stat
shasum -a 256 specs/011-smart-consultant-intake/EXTRACTION_FIELD_NOTE.md
shasum -a 256 specs/011-smart-consultant-intake/R23_SIZING_NOTE.md
shasum -a 256 specs/011-smart-consultant-intake/REPORT_EXPORT_BOUNDARY_REVIEW.md
shasum -a 256 specs/011-smart-consultant-intake/REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md
```

Required branch: `devin/sol-smart-consultant-intake-plan`.

Required HEAD and local remote-tracking ref:
`194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4`.

The implementation and accepted documentation are **uncommitted working-tree
changes**. HEAD alone does not identify the reviewed code. Do not use the old
implementation prompt's pre-code file-status list as today's expected state.
Read the current status and preserve it. Confirm the worker has paused runtime
edits; record the current diff/file state before acceptance. If implementation
has changed since the reported PASS, identify the changed scope and return it
for focused review before treating that PASS as applicable.

The following artifacts remain untouched and outside the index:

| Artifact in this spec directory | SHA-256 |
|---|---|
| `EXTRACTION_FIELD_NOTE.md` | `7cb622777797c8bb5fbe8851e58dfdfe79ce5272a4693524bab6b88500466427` |
| `R23_SIZING_NOTE.md` | `5637833c7eaecf30d520ec8b160c1fbdb7faba65dee162ca30e46053009ad129` |
| `REPORT_EXPORT_BOUNDARY_REVIEW.md` | `98e246b1a7c322d6721ef3900ea7627c5c2ab903a13e2d0bf576424da095c762` |
| `REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md` | `0ccd5684f26cbd2842f48f6cfdead9cf6b2b74a3bb30ee4863d90e68e95f3b9c` |

Stop on a branch/head/hash discrepancy; never silently repair it. No checkout,
reset, stash, clean, migration, broad staging, or deletion of existing files.
Do not inspect or modify the unrelated
`docs/drafts/NUAVE_REPORT_REDESIGN_PLAN_ASTRA_ITERATION_PROMPT.md`. It is not
authority for this task. Do not open `.secrets/`, credential files, raw retained
responses, old real-business records, or `archive/`.

## Required context

Read in order:

1. `AGENTS.md`, `README.md`, and the current Spec 011 status in `docs/NOW.md`.
2. `docs/WORKFLOW.md` and `docs/templates/VERIFICATION.md`.
3. `specs/011-smart-consultant-intake/SPEC.md`, particularly the experience,
   R-21/R-25/R-27, AC-07/AC-08, and live-check failure classification.
4. `specs/011-smart-consultant-intake/VERIFICATION.md`, including the
   founder-relayed independent PASS and the limits of earlier print checks.
5. Only implementation/test surfaces needed to drive this task:
   `tests/e2e/smart-intake.spec.ts`, `tests/e2e/new-intake-glm.spec.ts`,
   `tests/e2e/shared-config.ts`, `playwright.config.ts`,
   `src/lib/intake/SmartIntakeJourney.tsx`, `src/app/audit/SmartAuditStage.tsx`,
   `src/app/audit/ReportView.tsx`, and existing print styles.
6. For the live allowance, read the existing extraction retry/cost boundaries
   in `src/lib/audit/telemetry.ts` and the extraction implementation only as
   needed. Never read environment-secret values. For PDF rendering/inspection,
   follow the applicable PDF skill if available.

## Part A — actual rendered PDF, offline only

This part can proceed without a live-call authorization.

1. Use a dedicated loopback instance with the repository's existing offline
   synthetic/dummy-credential setup. Do not reuse a server whose live/synthetic
   mode is unknown. Reuse the fictional product journey exercised in
   `tests/e2e/smart-intake.spec.ts`; make no real identity/source/provider call.
   Keep any temporary driver outside tracked source and do not add a QA route.
2. Reach the actual product `ReportView` with fictional v2 context, ten
   observations, and a synthetic report. Generate a PDF using the browser's
   actual print rendering and existing application styles. Do not construct a
   separate report template, substitute a screenshot for a PDF, or treat the
   current test's stubbed `window.print` call as rendered-PDF evidence.
3. Save the PDF and rendered page images in a fresh temporary directory outside
   Git, with generic names and a clear fictional/synthetic label. Record the
   artifact paths, PDF SHA-256, page count, browser, viewport, and print settings.
4. Open/render and inspect every PDF page. Check readable Indonesian text,
   clipping, overlaps, blank/overflow pages, page breaks, links, and all ten
   expanded details. Check that identity/focus/market, observation counts,
   excerpts, report narrative, and existing provenance agree with the saved
   fictional report and context. Keep report schema/layout and export filtering
   unchanged. Record page-specific failures instead of redesigning the report.
5. State exactly what was exercised. A browser-generated PDF can prove print
   rendering without proving the operating system's save dialog. Record that
   distinction; do not create an extra live audit to test PDF output.

Do not repeat the entire unit/build/browser gate just for these documentation
and artifact checks. Run a focused offline check only if new evidence warrants
it. If a defect requires code changes, return the precise finding to the
orchestrator; no silent runtime patch or additional provider call belongs here.

## Part B — prepare the live walkthrough before requesting authorization

Complete the readiness work first: identify the local URL and one clean
acceptance tab, establish how you will switch its desktop/mobile viewport,
identify request-count and sanitized cost evidence, and confirm the PDF check
result. Use a fresh acceptance context rather than inspecting or clearing any
existing private/history tab. The same **live** tab will serve both viewports.

Then obtain these missing facts from the founder:

- The chosen business name and its public website URL. Prefer the representative
  local Indonesian business case; never infer a business from retained evidence.
- Explicit permission for **one preparation attempt via one Periksa action**,
  covering its identity request and extraction request, including the existing
  single automatic technical extraction retry if required, under current
  per-call and session cost limits. This is at most two paid extraction
  attempts, not permission to press Periksa twice or retry optional gaps.

Explain the authorization scope in plain language. Spec 011 AC-07 says the
walkthrough is **“After separate authorization for one live preparation”** and
stops before the final action unless question generation is separately allowed.
Forwarding this prompt or the reviewer PASS does not supply that authorization.

The founder can authorize with this statement alongside the chosen name/URL:

> I authorize one preparation-only walkthrough for the business and public
> website I provide: one Periksa action, its identity/extraction requests, and
> at most the existing one automatic technical extraction retry under current
> cost limits. Use the same tab for desktop and mobile. Stop before the final
> confirmation; no question generation, audit observations, or report calls.

Do not perform a live credential test, health check that contacts a provider,
source fetch, or preparation call to make the approval request concrete.
Use an already configured local environment without reading/listing/copying
credentials. If the founder must start/configure it, ask them to do that;
never open `.secrets` or change deployed configuration. If permission has not
arrived, finish Part A and the readiness record, mark Part C pending, and stop
before any live work. Do not wait indefinitely or treat silence as approval.

## Part C — one authorized preparation, same-tab desktop/mobile

Proceed only when Part B's business, source, and explicit permission exist.
Record the authorization source/scope and execution time before beginning.

1. Open ordinary `/audit` in the clean acceptance tab. Enter only the authorized
   name and public URL, then click **Periksa** once. Use the normal UI and
   protected production preparation method through the local environment.
   Do not issue direct provider requests or fetch extra source pages yourself.
2. Record readiness time, identity/extraction route counts, actual provider
   attempts/retries, preparation mode, and sanitized cost/unknown-cost status.
   One extraction HTTP request may contain the one existing technical retry;
   distinguish route counts from paid attempt counts. Do not reset carryover,
   raise budgets, or infer zero cost from missing telemetry.
3. Inspect `Ini yang Nuave pahami.` on desktop: typed/discovered identity,
   default focus `Saran Nuave`, category/offerings, channels, reach/area,
   optional context, honest unknowns, source disclosure, and confirmation
   readiness. Observe actual typing, substantive decisions, and corrections.
   Do not fill optional gaps merely to make the screen appear complete.
4. Change only viewport/device emulation in this same tab to inspect mobile,
   then return to desktop if useful. Preserve the prepared state. Check text,
   choice controls, scrolling, touch targets, primary-action visibility, and
   provenance. No second tab/session/preparation for the mobile pass.
5. Safe local selection changes or disclosures are allowed; record them. Do
   not change identity/source or press Periksa again. If checking refresh/Back,
   first preserve evidence and verify it will not restart preparation; record
   any unexpected request rather than retrying.
6. **Stop before clicking `Sudah sesuai — buat pertanyaan audit`.** That action
   freezes confirmation and starts question generation. Do not use Enter or
   any equivalent submit action to bypass the stop. Do not start an audit or
   request a report. Where browser tooling supports it, block downstream
   `/api/audit/glm-questions`, `/api/audit/run`, and `/api/audit/report` requests
   for this tab without changing app code. Any attempted forbidden request is
   a finding even if blocked; it is not a successful zero-request check.
7. Ask the founder: **“Does this feel like confirming a consultant's prepared
   understanding rather than filling a form?”** Record their answer faithfully
   and whether the prepared meaning is accurate enough. If the founder has
   not answered, mark judgment pending; never supply the answer yourself.

Record executed actions only. The final confirmation is intentionally untested
live; distinguish observed decision count from the remaining confirmation click.
Earlier offline tests cover the confirmation-to-questions transition. Do not
claim that this preparation-only walkthrough proves a live report/audit path.

For a missing material fact, use the spec's five layers only when supported:
absent from website; access failure; extraction miss; mapping loss; presentation
loss. If existing authorized evidence cannot distinguish them, say unresolved
and ask a targeted question. Do not invent a diagnosis, inspect old private
responses, or make another call to investigate. Optional absence alone is not
a defect. Stop on an unexpected call, sensitive content, exhausted allowance,
or scope change, preserving only safe evidence.

## Evidence, output, and permissions

Create or append to:

`specs/011-smart-consultant-intake/ACCEPTANCE_EVIDENCE.md`

If it already exists, preserve earlier evidence and append a dated result;
do not overwrite it. You may append a concise, attributed status to
`VERIFICATION.md`. Leave all changes untracked/unstaged/uncommitted as applicable.
Do not edit the spec, decision log, existing four notes, runtime/tests, or
unrelated files. Do not mark Spec 011 Verified.

The acceptance record must separate:

- prior implementation test/build results;
- prior independent recovery PASS, relayed by the founder;
- this worker's actual offline PDF artifact/visual checks;
- authorization and this worker's actual live preparation observations; and
- the founder's own judgment and any pending evidence.

Include branch/HEAD and working-tree identity, date, artifact paths/hash/page
count, observed viewports and actions, typed-character/decision/correction
counts, timings, route and provider attempt counts, cost, zero downstream-call
evidence, problems with supported layer attribution, and a precise remaining
gate. Record PDF save-dialog limits separately.

Keep real-business screenshots and any narrowly necessary authorized review
artifacts outside Git in the temporary acceptance directory. The repository
note contains sanitized field presence/origins and metrics, not raw model
responses, complete browser storage, private provider metadata, credentials,
or business-identifying screenshots. Reference the founder authorization
message for the exact name/URL instead of republishing it in the repository.
Do not create or reuse `.secrets` storage or reopen prior private evidence.

At completion, verify no runtime/test diff changed, the four note hashes still
match, and nothing was staged. Return artifact/note paths, PDF result, live
authorization/execution state, actual call/cost totals, founder judgment,
limitations, and the next smallest action. No commits, pushes, merges,
deployments, public sharing, or provider work outside the explicit allowance.

Send the evidence to the existing reviewer using
`ACCEPTANCE_REVIEWER_PROMPT.md`; the founder relays it between sessions. Do not
dispatch agents or directly contact anyone. A later full live audit is a
separate authorization, not an added requirement for this preparation task.
