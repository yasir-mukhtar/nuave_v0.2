# Worker prompt: complete B2 visual and PDF evidence

> Prepared: 2026-09-25
> Status: completed; evidence accepted by the orchestrator on 2026-09-26
> Scope: offline verification of the accepted B2 snapshot; no implementation or publication

The [result](./B2_VISUAL_VERIFICATION_RESULT.md) and [acceptance](./B2_ACCEPTANCE.md)
record completion. Retain the instructions below as the task contract; do not
repeat the visual run or technical gates without a changed candidate or concern.

You are the worker for one bounded verification task in the Nuave repository.

Shared repository: `/Users/hy4-mac-006/nuave_v0.2`.
Accepted candidate: `/private/tmp/nuave-spec012-b2/candidate`.

## Objective

Complete the missing desktop/mobile, keyboard/reflow and completed-report PDF
evidence for B2. The worker and independent reviewer already passed its
technical implementation. Preserve that implementation and supply evidence
the orchestrator can use to finish publication readiness. Do not implement B2
again, publish it, or claim that this closes Spec 012.

## Required context, in order

1. Shared `AGENTS.md`, `README.md`, `docs/NOW.md`, and `docs/WORKFLOW.md`
   sections Roles, Independent verification and Worker handoff standard.
2. This prompt and shared `specs/012-evidence-first-report/B2_ACCEPTANCE.md`.
   Read the original `B2_WORKER_PROMPT.md` acceptance/validation and boundary
   sections as the task contract, not as a fresh implementation instruction.
3. Candidate `specs/012-evidence-first-report/B2_IMPLEMENTATION_RESULT.md`
   and `/private/tmp/nuave-spec012-b2/B2_IMPLEMENTATION_REVIEW.md` completely.
4. Approved Spec 012 at
   `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`
   (SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`):
   report presentation/print requirements, R-13–R-17 and AC-14–AC-19. Obtain
   that exact object locally with `git show`; the earlier preserved copy is
   `/private/tmp/nuave-b1-acceptance-qr5a9x4l/approved-spec012.md`. Verify its
   hash if using it. Do not substitute an untracked draft.
5. Candidate `docs/DESIGN.md` report/responsive rules, `docs/VOICE.md` report
   language, `tests/e2e/shared-config.ts`, `playwright.config.ts`, relevant
   tests in `tests/e2e/new-intake-glm.spec.ts`, and the recovery/report
   components those tests exercise. Load additional callers only as needed.

## Preserve the reviewed state

The candidate is an **uncommitted** 25-file change on branch
`codex/spec012-b2-useful-recovery`, HEAD/base
`d93ec8256200b662796103246e224bd4a3800603`. Cloning its Git HEAD alone will
omit B2. Its local `origin/main` ref is stale; do not reset to that ref.

Reviewer evidence is in `/private/tmp/nuave-b2-review-eopg00d2/`:

- `reviewed.patch`: complete patch, SHA-256
  `e67e46bfb1301470344be5dab7a70baa7dff8e022535a99353e5a8096480ce18`.
- `candidate-changes-before.json`: 25 changed-file hashes.
- `product-manifest.json`: 331 product, test and configuration hashes.
- `verify.log`: SHA-256
  `0af7bda02f1beb6626ead9f444a531c1929f68211aaf2a0bb0d2c8ddcb152c6c`.
- `reviewer-browser.spec.ts` and its log: existing accounting/recovery probe
  that can inform the capture setup; do not edit these evidence files.

Before work, record candidate/shared HEAD, branch, index and working-tree
state and preservation fingerprints. Make your own isolated copy at
`/private/tmp/nuave-b2-visual-<unique-id>/repo`, reproducing the exact base plus
complete reviewed patch. Match all 25 changed-file and 331 product hashes
before running the app. Keep original candidate, shared checkout and earlier
review evidence unchanged. No main integration belongs in this task.

Use Node 22, locked dependencies, fictional data and the existing
credential-free `journeyWebServer`/`offlineE2EServerEnv` setup in synthetic
mode. Do not copy `.env` files or inherit provider credentials. Bind to an
unused loopback port; do not reuse an unknown server or stop unrelated
processes. Block unexpected external requests. Stop your own server afterward.

Keep new capture probes/configuration, logs, screenshots and PDFs in your
scratch evidence root. Runtime, styling, dependencies, existing tests and
approved copy are read-only. Additional capture probes may be added in scratch
storage, with their source recorded. State the precise files you will create
before editing. If a required local artifact is unavailable or hashes differ,
report that prerequisite rather than silently changing the accepted baseline.

## Bounded checks

Reuse matching existing artifacts if available and actually inspect them.
Earlier B1 evidence alone does not establish these B2 checks. Otherwise run
only the relevant existing browser tests and a narrow capture probe. The
existing tests include:

- `usefulness failure shows answers-only recovery; explicit retry finishes the report`
- `Spec 012: retained Markdown answers, exact copy, references, reflow and one print tree`

Locate the actual tests by title. The rich-report test already writes report
and answer screenshots, a CSS-zoom screenshot and `report-print-a4.pdf`.
Route outputs outside the candidate and preserve them before another run can
replace Playwright's output directory.

1. **Recovery and successful completion.** Capture and visually inspect both
   states at 1440, 390 and 320 CSS pixels. Cover recovery with retry available
   and with its existing ceiling reached. Use the actual smart-intake path and
   fictional retained answers. Inspect the notice, retry control/limit message,
   answer text, provenance/sources and raw/copy controls. Check for clipping,
   overlap, lost content and page-level horizontal overflow; intentional local
   scrolling for wide content must remain usable. Success must show the finished
   report and replace the recovery notice. Include one eligible code-owned P/V
   action in the completed-state checks, using existing fictional fixtures.
2. **Keyboard and reflow.** Check logical keyboard access, visible focus and
   activation for recovery controls and completed-report navigation/controls.
   Exercise expanded raw text and exact copy. Check both states at 200% CSS
   zoom/reflow, recording the method and inspecting the result. Resizing,
   reading, copying and printing must not initiate audit/provider stages.
   Keep request counts in the evidence; only an explicit guarded report retry
   may rerun report generation. Reuse the independent accounting/reload/Back
   results instead of rebuilding that full regression matrix.
3. **Completed-report PDF.** Generate one representative fictional A4 PDF
   from the actual B2 report, retaining the rich Markdown/long-answer and late
   caveat coverage from the existing test. Extract its text, render **every
   page**, and visually inspect every page. Record the page count and per-page
   findings, with artifact paths. Check answer order/completeness, all ten
   answers and late caveats, sources, readable tables/code/long links,
   headings/page breaks, and absence of clipping, overlap or duplicate answer
   trees. Confirm expanded raw text and interactive controls do not duplicate
   printed answers. Use the available PDF skill if provided. Do not infer
   visual quality from text extraction or assertions alone.
4. **Recovery print boundary.** Confirm no Nuave PDF/print/JSON export control
   or callback is attached to recovery. Inspect relevant print styles/handlers
   and recovery under browser print media to confirm native printing is not
   intentionally intercepted or blanked. Native OS Save-dialog operation,
   native browser zoom and a physical phone are separate limits; headless PDF,
   CSS zoom and viewport emulation do not prove them.

The matching independent canonical gate already passed **1,460 unit tests,
both builds and 33 browser tests**, plus 22 reviewer assertions and the extra
accounting/recovery browser regression. Attribute these as reused evidence.
Do not repeat the full gate for this evidence-only handoff. A discovered
defect goes back to the orchestrator with severity, reproduction, exact source
lines, screenshot/page and the smallest proposed fix. Do not fix runtime code
or weaken a requirement in this task; continue unaffected checks where useful.

## Deliverable and completion report

Write `/private/tmp/nuave-spec012-b2/B2_VISUAL_VERIFICATION_RESULT.md`, linking
your new evidence root. Do not overwrite an existing result; if one exists,
preserve it and use a clearly named revision. Include:

- PASS, REVISE or incomplete, with each required check's observed result;
- exact candidate/base and before/after hash and preservation comparisons;
- commands, synthetic setup, browser/version, viewport/zoom method and request
  counts; distinguish checks run now from matching results reused;
- screenshot index with what was visually inspected, PDF/text/render paths,
  page count and page-by-page review, plus a SHA-256 artifact manifest;
- all files created, any findings and remaining native-device/tool limits.

End with the next action: orchestrator review of this bounded evidence, then
the exact B2 publication package. The founder's AC-18 before/after usefulness
judgment remains separate and must use approved real retained evidence;
synthetic screenshots do not establish it. Spec 012 stays Approved/in progress.

No commit, push, PR, merge, deployment, live provider call, business-site fetch,
external contact, private evidence or `archive/` access is authorized. Do not
read the four protected Spec 011 notes: `EXTRACTION_FIELD_NOTE.md`,
`R23_SIZING_NOTE.md`, `REPORT_EXPORT_BOUNDARY_REVIEW.md`, or
`REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md`. Existing Spec 011 closures stand.
Accounting remains **USD 1.06241155 of 5**; previous live allowances are consumed.
