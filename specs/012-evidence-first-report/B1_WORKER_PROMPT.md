# Worker handoff: Spec 012 B1 — report content and final header

> Prepared: 2026-09-25 by the orchestrator
> Status: completed; independent PASS accepted on 2026-09-25
> Scope: one offline B1 candidate; publication remains separate

The worker and reviewer have completed this handoff. See the
[B1 acceptance record](./B1_ACCEPTANCE.md) for the exact candidate, attributed
checks and remaining gates. The instructions below are retained as the task
contract, not a request to repeat implementation.

You are the worker for one bounded task in the Nuave repository.

Repository: `/Users/hy4-mac-006/nuave_v0.2` — preserve this shared checkout.

## Objective and authority

Complete **Spec 012 B1 / block 3a**: evidence-led report findings and actions,
up to ten without padding, plus the final truthful identity/date/header and
contents integration. Deliver one independently reviewable offline candidate.
Do not implement B2's action templates, final usefulness gate or answers-only
recovery. B1 must work with the existing repair and recovery behavior.

The founder approved Spec 012 on 2026-09-22. Its approved source is commit
`9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174` on
`docs/astra-report-redesign-plan`, path
`specs/012-evidence-first-report/SPEC.md`. That file's SHA-256 is
`294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`.
The documentation branch has not been promoted into the inspected main, so
absence of `SPEC.md` there is expected. Read the approved file using `git show`
into scratch storage; fetch the named branch read-only if its object is absent.
Do not use the older untracked report-iteration draft as implementation authority.

The approved spec's R-10–R-12 and B1 allowlist govern this task. Its September 22
report decision supersedes the older blanket report-work deferral; do not ask
the founder to decide D-01–D-08 again. Statements describing the original
documentation-only promotion are historical, not a prohibition on the later
approved implementation sequence. This founder-delivered handoff releases the
bounded offline B1 work when the founder hands it to the worker.

## Entry and checkout

1. Record [privacy PR #79](https://github.com/yasir-mukhtar/nuave_v0.2/pull/79),
   approved head `dd9e405c704b874483ff0165c8e61c5e2dc2908b` and merge
   `8907d96d10ca101f6fdd68c8c77607cd994d83f3`. The founder explicitly approved
   the PR and instructed merge/deploy; main CI and production deployment passed
   in [run 36099502093](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36099502093).
   This settles the prior privacy-PR start condition. Do not reopen it or wait
   for a second approval. The source's R3 acceptance record retains the details.
2. Create an isolated clone under `/private/tmp/`, on
   `codex/spec012-b1-report-content`, from freshly fetched `origin/main`.
   Do not switch, reset, clean, stage or cherry-pick into the shared checkout.
   Preserve prior candidates and evidence. Do not dispatch sub-agents.
3. Record the base SHA and verify it contains merged Spec 011 PR #78
   (`7f34d69d3be0c451e238f1cddf0da62dda250eb1`) and integrated report PR A
   (PR #74, `d08b9e90e20930377873fe2fd79e2489ab9c39a6`). Read the actual
   integration verification, rather than assuming branch existence is proof.
   Spec 011 is Verified; F-01/F-03/AC-07 are closed. Do not reopen them.
4. Verify current main contains privacy merge `8907d96`; preserve its rule,
   copy and regressions. Do not stack or cherry-pick the former privacy branch.
   Before final verification, refresh main and
   integrate any relevant merged changes in this isolated branch. Reconcile
   overlaps without dropping either change; rerun affected checks after changes.
   This B1 handoff does not authorize merging or deploying B1.

The old shared-source HEAD `2a21f85` and the report documentation branch are
context sources, not runtime bases. Do not fold the whole documentation branch
into B1. Its broader promotion/rebase remains separate work under R-19.

## Required context, in order

1. `AGENTS.md`, `README.md`, current shared-source `docs/NOW.md`, then the
   implementation base's `docs/NOW.md`; `docs/WORKFLOW.md` sections **Roles**,
   **Specification-driven development** and **Worker handoff standard**.
2. This prompt and the complete approved Spec 012 at the pinned commit above.
   Also read its `SPEC_REVIEW_1.md` **Re-check after revision 1**. R-10–R-12,
   R-16–R-19, AC-11–AC-13, inherited A regressions and B1's portion of AC-19
   are the completion contract; AC-14–AC-18 are not B1 implementation scope.
3. The spec's parent sections: `docs/VISION.md` **Product principles**;
   `docs/PRODUCT.md` **Customer**, **Promise**, **How results are reported**,
   **7. Delivery**; `docs/AUDIT.md` **Report format**, **Report acceptance
   checklist**, **Handle missing and weak evidence**, **Data boundaries**;
   `docs/VOICE.md` **Terminology table**, **Report**; `docs/DESIGN.md`;
   `docs/journey/06-audit-report.md` **Direct-ten report contract**.
   Read sections completely. Use current-main versions plus the approved
   September 22 report amendments from the pinned documentation commit where
   those amendments are not yet integrated. Record that distinction; never
   replace current intake decisions with an older whole document.
4. On the runtime base: Spec 009 R-07 and continuous-flow amendment; Spec 010
   **Failure and recovery** and retry/cost boundaries; verified Spec 011 R-23,
   R-27 and historical hold, `MAIN_INTEGRATION_RESULT.md` and
   `MAIN_INTEGRATION_REVIEW.md`. Read Spec 012 `VERIFICATION.md` and
   `PR_A_REVIEW.md` for inherited limits. These files exist on merged main
   even while the approved Spec 012 `SPEC.md` remains on its separate branch.
5. Inspect only the B1 implementation and tests listed below. Read applicable
   installed `node_modules/next/dist/docs/` guidance before writing Next.js code.
   Use the existing UI components and report styles; follow AGENTS/DESIGN for
   any generic component need rather than adding another stack.

The old PR A contents-link defect is already fixed by PR #77 and preserved by
Spec 011 integration. B1 changes labels/order while retaining that report-local
focus/scroll behavior; it must not reintroduce hash navigation that leaves the
report. Prior headless PDF checks do not establish native Save-dialog behavior.

## Implementation scope

Before editing, state the current objective, exact expected files and any real
conflict. Record a small base/scope note in the result; no separate planning or
inventory system is needed. Then complete the bounded implementation.

### 1. Bounds and report instructions

- In `src/lib/audit/types.ts`, widen only findings/priorities maxima and
  `priority.order` maximum from five to ten; correct the stale AC-17 denominator
  comment. Shared/derived/provider schemas must agree. Keep the existing
  minimum one at initial synthesis and final report-content validation.
  Preserve other schemas, including privacy-copy constants and v2 contracts.
- Update only report instructions in `openai.ts`, `gemini.ts`, `groq.ts`,
  `openrouter.ts` and `report-prompt-contract.ts`. New content guidance is
  direct-ten-specific. Require supported findings and concrete actions with
  `why`, `basis`, `owner`, `done_when`, `caveat` and actual evidence IDs.
  Three supported items stay three. Do not infer a website defect from absence,
  overwrite owner facts, discard late caveats, or pad with generic advice.
- Keep existing provider capabilities and method routing. Align all four
  report adapters without enabling unsupported input/provider paths. Preserve
  extraction, question generation, observations, transport, models and costs.
- Recheck `INDONESIAN_REPORT_LANGUAGE_CALIBRATION` on the base: expected
  advisory maximum 20 words per sentence, hard maximum 25, no sentence floor
  and no Indonesian field-total limits. Preserve executable language behavior
  and language-only retry invariants; no additional critique/model call.
- In `contracts.ts`, edit only the report synthesis-version constant(s) used
  by changed instructions. The integrated base has both
  `REPORT_SYNTHESIS_PROMPT_VERSION` and `REPORT_SYNTHESIS_PROMPT_VERSION_V2`;
  trace which paths use each and ensure recorded provenance identifies the
  changed contract. Do not merely bump an unused legacy constant. Keep old
  saved provenance untouched and change no validation/repair/measurement code.

### 2. Final header and contents

- Consume the existing `AuditSubject` / `DirectTenAuditContext` boundary from
  `src/lib/audit/direct-ten-context-v2.ts`, as used by `ReportView.tsx`.
  Record its actual R-23 behavior. Reuse it; no second brief, fallback projection
  or fabricated optional customer/offering/area/comparator value.
- For direct-ten, keep `AI Visibility Report` as the artifact title and show
  the exact brand and confirmed whole-brand/product/location scope. No
  agency-era attribution for the current business-owner flow. Preserve
  historical rendering and the existing historical delivery/resume hold.
- Derive the observation date/range from retained `observed_at` values, with
  an explicit consistent display timezone (UTC when no audited timezone is
  recorded). Do not use `report.generated_at` as the observation date. Keep
  report creation time separately labeled in `Tentang audit ini`, and retain
  each answer's recorded time and requested/returned answer model. Name the
  recorded execution surface plainly; never substitute the question writer,
  synthesis model, or all consumer ChatGPT experiences for the observed model.
- Match contents to the existing direct-ten body, exactly:
  `Hasil singkat` (`summary`) → `Jawaban model AI` (`detail`) →
  `Analisis Nuave` (`findings`) → `Yang dapat dilakukan` (`priorities`) →
  `Tentang audit ini` (`method`). Preserve report-local keyboard focus/scroll
  and one target per section. Keep historical contents consistent with their
  own body. Retain `Penanggung jawab yang disarankan`, already present in A.
- Limit UI edits to `ReportView.tsx` header/identity/date/contents and necessary
  existing report presentation files/scoped styles. Keep exact answers, inert
  Markdown, raw/copy behavior, all evidence references and the single print tree.
  Do not shorten stored URL tails or evidence text to improve presentation.

### 3. Tests and records

Use focused schema/provider/header tests in existing audit/report suites,
adding a report-header test/helper only if needed. Existing relevant paths:
`src/lib/audit/{openai,gemini,groq,openrouter,report-prompt-contract,report-presentation,report-language-id,report-priority,report-gaps,report-pipeline,report-recovery,customer-evidence-export}.test.ts`,
`src/app/audit/report/report-body.test.tsx`,
`tests/e2e/new-intake-glm.spec.ts` and the existing v2 report/export tests.
Resolve moved test names by inspection, without creating parallel harnesses.

Runtime files outside the B1 allowlist are read-only. In particular, do not
change gap validation, repair, pipeline, `LocalAuditStage`, `AuditRunStep`,
exporter, intake/projection, source fetch, observation code, privacy rules,
dependencies, global typography or session storage. No B2 templates, zero-
priority synthesis contract, usefulness failure code or recovery reader.

Documents may add `specs/012-evidence-first-report/B1_IMPLEMENTATION_RESULT.md`
and a dated B1 entry in `VERIFICATION.md`; update narrowly relevant NOW/INDEX
status only when it changes. Preserve PR A evidence and prior founder decisions.
Reference the pinned approved spec without copying the entire report-doc branch
or silently promoting its shared documents. If a genuine requirement cannot
fit this boundary, report the concrete conflict and smallest adjustment.

## Acceptance and validation

1. **AC-11:** three findings/actions remain three; ten and order ten pass;
   eleven and order eleven fail in shared and provider contracts. Zero remains
   invalid for B1 initial synthesis. Preserve existing positive-only action
   rejection, post-repair empty-content outcomes and recovery behavior.
2. **AC-12:** mocked request tests cover all four adapters and initial/retry
   report instructions, with accurate synthesis versions. Verify non-padding,
   evidence/caveat guidance, direct-ten routing and unchanged observation and
   language-retry evidence/order/timing/owner invariants. Assert the actual
   calibration constants, not stale comments or test strings alone.
3. **AC-13:** fixtures include whole-brand/product/location scope, missing
   optional values, nonchronological retained observation order, one date and
   multiple dates, differing returned models, and later synthesis time. Header
   dates use the earliest/latest retained instants without sorting or changing
   the answer order. Show the named timezone and distinct creation time. Reuse
   existing defined invalid-evidence handling; do not invent a plausible date.
4. **Inherited A / AC-10:** full answers, all references, exact raw/copy text,
   safe Markdown, historical routing, report-local contents, frozen inputs,
   JSON omissions/versions and one print tree remain intact. Read/raw/copy/nav/
   print/export/Back/reload initiate no provider work; mocked counters prove it.
5. Verify the changed header/contents at 1440, 390 and 320px, keyboard focus
   and the existing zoom/reflow check. Capture one representative fictional
   A4 PDF, extract its text and inspect every page for clipping, duplicated
   answers and orphan headings. Reuse final-gate artifacts where adequate.
   Distinguish headless print/CSS and a `window.print` spy from a native Save
   dialog; label CSS zoom as an approximation if native zoom was not exercised.
6. Use Node 22 and locked dependencies. Keep real credentials out of the
   environment; mock/intercept transports and run downstream fixtures in
   synthetic mode. Reproduce changed behavior before the fix where practical,
   run targeted checks while editing, then one successful final
   **`npm run verify`**. A changed candidate, failure or uncovered risk can
   justify reruns. Do not duplicate an unchanged full gate for paperwork.
7. Inspect the complete task diff. Remove diagnostics, temporary switches and
   bypasses. Match final evidence to the candidate hashes. Recheck main before
   handoff, reporting any unresolved drift precisely. Do not declare the branch
   ready if required checks fail.

Passing these checks establishes offline B1 behavior. Mocked model responses
do not prove improved real synthesis or owner usefulness. AC-18's founder
before/after usefulness judgment and B2 remain pending for combined Spec 012;
do not mark the whole specification Verified or quietly spend money to close it.

## Deliverable and completion report

Return an unstaged isolated candidate and
`specs/012-evidence-first-report/B1_IMPLEMENTATION_RESULT.md` containing:

- Objective/outcome, base SHA and satisfied entry gates; current-main drift
  and the actual Spec 011 `AuditSubject` mapping; privacy PR inclusion status.
- Changed files and complete task patch; narrow changed-file hashes and logs
  tying validation to this candidate. Keep screenshots/PDF outside the product
  tree; record their paths and what was actually inspected.
- AC-11–AC-13, inherited regressions and B1 AC-19 results; confirmed language
  constants and report prompt versions; request/export/accounting invariants.
- Untested behavior, any exact blocker, and **next: focused independent B1
  implementation review**. Provide a concise reviewer handoff with exact paths.

No commit, push, PR, merge, deployment, live call, business-site fetch, external
contact or real-customer evidence access is authorized by this task. Do not
read `archive/`, credentials, raw/private evidence, or the four protected
Spec 011 notes. Use fictional public fixtures only. Existing accounting stays
USD 1.06241155 of 5; old live allowances remain consumed.

The founder will pass the result to a separate reviewer. Do not start that
review yourself or demand another plan-approval cycle for routine choices
already inside approved B1.
