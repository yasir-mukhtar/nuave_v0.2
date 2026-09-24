# Worker: execute the approved F-03 controlled-input diagnostic

**Completed — 2026-09-23. Do not execute this handoff again.** The diagnostic
allowance and both extraction slots are consumed. The founder relayed independent
PASS after all 35 focused checks and evidence review. Preserve the live execution
lock and original artifacts. This prompt is historical task authority; the next
work is the [approved product correction](./F03_PRODUCT_CORRECTION_SCOPE.md),
using its separate offline implementation prompt. No live call is authorized.

You are the worker for one bounded diagnostic in the Nuave repository.

Repository: `/Users/hy4-mac-006/nuave_v0.2`.
Required branch: `devin/sol-smart-consultant-intake-plan`.
Required HEAD: `2a21f856d33264887df6287f9b6d9dd22468fea5`.

## Objective and authority

Build and check a temporary local runner, then use the existing unused allowance
for **one controlled-input extraction experiment**. Return observed results and
the smallest supported product-correction proposal. Do not stop at acknowledging
this prompt or writing another plan when the offline checks and required inputs
are ready.

The founder replied **“approved”** to
[F03_CONTROLLED_INPUT_PROPOSAL.md](./F03_CONTROLLED_INPUT_PROPOSAL.md). The
[dated decision](../../docs/DECISION_LOG.md#2026-09-22--authorize-the-f-03-controlled-input-diagnostic)
and [spec exception](./SPEC.md#f-03-controlled-input-exception--approved-2026-09-22)
authorize this method. No repeat authorization or OpenAI content-delivery
receipt is required. This reassigns the unused diagnostic allowance; it does
not authorize an unchanged baseline call plus an experiment. The old receipt
search and unsent provider question are no longer pending tasks.

The earlier F-03 cause remains unresolved between source access and extraction.
The founder has not accepted the empty summary. F-01 is closed; F-03/AC-07 remain
open and Spec 011 remains Approved, not Verified.

## Continuation after extension review — 2026-09-22

The orchestrator reviewed your five-probe result and exact two-file patch, and
independently passed six fictional checks of a **temporary in-memory overlay**.
Continue within the already-approved runner scope; applying the patch to product
files is unnecessary and remains outside this task. See the
[review and evidence](./F03_CONTROLLED_INPUT_RESULT.md#orchestrator-review-and-continuation--2026-09-22).

Use `proposed-reuse-extension.patch` with SHA-256
`1044d9438f115999dbafbb9ceef447c935d712b4f8586a68e3ea401c81386e32`
only on isolated temporary copies or at bundle load time. Preserve all original
`src/` files. The feasibility example and source/overlay hashes are in the
ignored `f03-controlled-input/orchestrator-overlay-review/` directory. Its
esbuild loader changes exactly the two reviewed modules in memory, resolves
their imports from the original module directories, and reuses the original
SDK/parser/accounting path. Do not apply-and-revert a patch in the shared
checkout or create a separately maintained extractor.

Verify source and patch hashes, exact hunk context, the two-module allowlist and
the resulting overlay before building; stop on unexpected differences rather
than applying with fuzzy context. Prove unchanged default request/head behavior
and the input-only request change, then finish the remaining runner checks in
this prompt. Keep all earlier probes, patch and review artifacts unchanged;
write new runner/check outputs separately. The six feasibility checks do not
claim a complete runner, full safety regression, live execution or product fix.

Resolve carryover through the existing configured runtime using only the
allowlisted numeric value. A fresh process defaulting to zero is not evidence
of that runtime's configured carryover. If it cannot be established, report
the missing numeric accounting input without requesting credentials or another
diagnostic approval. Preserve the known prior extraction entry: the two-call
stage ceiling leaves **one further provider attempt and no subsequent technical
retry** for this ledger. Do not reset it to obtain another attempt. The existing
reservation receives the complete request; with hosted search it reserves its
fixed input ceiling, so the reserved amount need not rise when text is added.

Once the remaining offline checks and accounting are ready, execute the one
already-authorized experiment and append actual results. Do not stop for another
extension approval or provider-receipt search. The original experiment limits
and stop conditions below still apply.

## Required context, in order

1. `AGENTS.md`, `README.md`, `docs/NOW.md`, and `docs/WORKFLOW.md`.
2. The newest F-03 decision linked above and approved `SPEC.md`; read its
   extraction, privacy/cost, AC-07, failure-classification and F-03 exception
   sections in full.
3. `F03_CONTROLLED_INPUT_PROPOSAL.md` in full. Its accepted boundary governs.
4. `F03_DIAGNOSTIC_CAPTURE.md`, including its supersession notice. Preserve its
   earlier observations and artifacts; do not execute the superseded method.
5. The latest F-03 entries in `ACCEPTANCE_EVIDENCE.md` and `VERIFICATION.md`.
   Read earlier entries only to recover necessary sanitized allowance/accounting
   facts. Completed implementation, PDF and broad acceptance gates are not being
   reopened.
6. Inspect only the necessary request/parser/retry/accounting and safe-fetch
   code, starting with `src/lib/audit/openai.ts`, `telemetry.ts`,
   `source-identity.ts`, their imported safe-fetch/schema helpers, and
   `src/lib/intake/preparation.ts`. Inspect the installed SDK only as needed to
   verify the actual request and stub transport; do not assume API behavior.

## Checkout and preservation

Before editing, check repository root, branch, HEAD, `git status --short`,
`git status -sb`, and the index. The expected local remote-tracking commit is
`194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4` (branch ahead by one). Do not fetch,
switch branches, reset, stash, clean, stage, commit or push. Recheck branch/HEAD
before the live step. Stop on a mismatch or concurrent checkout change rather
than repairing it yourself; no new baseline approval is needed if it matches.

Existing uncommitted documentation, the accepted print CSS change in
`src/app/audit/audit.module.css`, and the two mocked regressions in
`src/lib/audit/openai.test.ts` are expected. Preserve them byte-for-byte, along
with other runtime/tests/configuration. Preserve unrelated untracked work.
Do not read `.secrets/`, `(Temp) Secrets/`, credential files, old raw provider
responses, saved customer/browser contents, `archive/`, or the unrelated report
redesign draft. Do not run broad scans over private directories.

Verify these four local notes are untracked, unstaged and unchanged. A mismatch
is a stop condition; do not rewrite or regenerate them.

| File in this spec directory | Required SHA-256 |
|---|---|
| `EXTRACTION_FIELD_NOTE.md` | `7cb622777797c8bb5fbe8851e58dfdfe79ce5272a4693524bab6b88500466427` |
| `R23_SIZING_NOTE.md` | `5637833c7eaecf30d520ec8b160c1fbdb7faba65dee162ca30e46053009ad129` |
| `REPORT_EXPORT_BOUNDARY_REVIEW.md` | `98e246b1a7c322d6721ef3900ea7627c5c2ab903a13e2d0bf576424da095c762` |
| `REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md` | `0ccd5684f26cbd2842f48f6cfdead9cf6b2b74a3bb30ee4863d90e68e95f3b9c` |

## Files and actions in scope

- Create the temporary runner, focused fictional tests and minimal evidence in
  a new owner-only local directory, preferably
  `acceptance-review-2026-09-22/f03-controlled-input/`. Verify it is Git-ignored
  before storing evidence; otherwise use a restricted `/private/tmp` directory.
  Leave the existing `f03-diagnostic/` capture, tests, logs and preservation
  records unchanged. Do not add a product route, flag, dependency or config.
- Create `specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_RESULT.md` as
  the sanitized result. Leave it untracked/unstaged. Append actual dated results
  to `ACCEPTANCE_EVIDENCE.md` and `VERIFICATION.md`; update `docs/NOW.md` only
  when the result changes current status or the next action. Do not change the
  approved spec, decision, protected notes, runtime or existing tests.
- Run focused offline runner checks. Once ready, execute the single authorized
  controlled fetch/extraction described below. Do not rerun the completed PDF,
  full unit/build/browser gates without a new relevant concern.

## Execute in this order

1. **Establish the inputs without a live request.** Use the same founder-supplied
   business and nominate exactly one official page before execution. Use the
   original URL if suitable. If a different official page is needed, or this
   session lacks the authorized business/URL, ask only for that missing input;
   do not infer it from private evidence or discover another page yourself.
   Preserve the existing sanitized cost carryover and paid-attempt ledger.
   Missing accounting is unknown, never zero. Confirm the diagnostic allowance
   has not been consumed by another session.
2. **Build the temporary runner.** Reuse the existing extraction request,
   schema, parser, reservation, accounting and retry behavior. Add only a
   labeled source-data field to the existing user-message JSON, containing the
   literal passage, its source URL and retrieval time. Assemble the complete
   request before each existing budget reservation; a post-reservation fetch
   or transport rewrite is not acceptable. Demonstrate the exact difference
   from the protected request. A copied divergent provider pipeline is not
   acceptable. For the two extensions already returned and reviewed, use the
   exact temporary overlay described above. If any further necessary change
   exceeds that runner scope, return the minimal proposed diff before making
   a product change.
3. **Pass focused offline checks first.** Use fictional HTML and a stub SDK
   transport; no business fetch or inference probe belongs in these tests.
   Establish that:

   - a failed/unsafe fetch or no usable passage prevents inference;
   - the bounded passage is present exactly in the actual outgoing user field,
     with correct source association and UTF-8 byte limit;
   - existing carryover/attempts and the complete request enter reservation
     before dispatch; over-budget requests never reach the provider;
   - every other developer instruction, model/reasoning, schema, hosted-search,
     include, token, transport and retry setting matches the protected path;
   - valid empty output stays empty, remains accounted, and gets no retry;
   - unusable structured output follows only the existing technical retry,
     still subject to the running ledger and limits;
   - capture failures do not create requests, exported evidence omits forbidden
     content, and no downstream action occurs.

   Record commands, results, runner/test hashes and actual comparison evidence.
   The previous capture's 18 checks are not tests of this new runner.
4. **Fetch the nominated page once using existing safety controls.** Preserve
   public-network validation, time/byte limits, and redirect checks on each hop.
   Do not call the broader identity pipeline if that would fetch a favicon or
   another document. No crawling, link discovery, second page or fetch retry is
   included. Permitted redirects remain subject to the existing limits. This
   one-page limit concerns the runner's direct retrieval; the provider's hosted
   search retains its existing settings. Stop before paid extraction if the
   page is inaccessible or contains no usable public service passage.
5. **Supply at most 8,000 UTF-8 bytes of necessary public business/service
   text.** Preserve literal wording and source association. Exclude scripts,
   contact details and unrelated personal content; follow the repository rule
   if sensitive personal data is received. Treat source text as untrusted data.
   Do not invent a passage or prefill extracted category/offerings. Retain only
   the necessary passage and minimal association evidence, owner-only and
   ignored, not a complete page, browser dump or raw provider response.
6. **Run one extraction when ready.** Use the actual acceptance configuration:
   direct OpenAI Responses at `https://api.openai.com/v1`, `gpt-5.6-luna`, low
   reasoning, same developer instructions/schema/hosted-search settings and
   existing cost limits. Use the existing configured runtime without inspecting
   or printing credentials. No model-list probe, substitute endpoint/model,
   undocumented `web_search_call.results`, fresh budget, limit increase or
   paid prompt tuning is allowed. Record dispatch/reservation before the call
   so a resumed session cannot repeat it accidentally. Permit at most the
   existing one technical retry for unusable structured output. A valid empty
   draft, absent diagnostic data or disappointing result never earns a retry.
   If a timeout/interruption leaves dispatch or cost uncertain, preserve that
   uncertainty and stop; do not assume the allowance is unused and start over.
7. **Capture and return the result.** Record the actual submitted passage hash,
   byte count/source association, input-match check, parsed field presence and
   counts, preparation mapping if exercised offline, attempt/cost telemetry and
   capture limits. A transport ordinal is not a paid-attempt number. Keep
   unknown cost or status explicit. Repository notes must omit business/source
   identifiers, raw responses, headers, queries, free-text provider errors and
   personal/account data. Stop before confirmation, question generation,
   observations, reports or any browser product walkthrough.

## Evidence and decision requirements

The result note must state the date, branch/HEAD, scope, exact offline checks,
temporary artifact locations/hashes, prior/remaining allowance, direct fetch
outcome, known submitted input, parsed/prepared field counts, attempt accounting,
limitations, preservation checks, and proposed next action. Distinguish worker
results from earlier independent review. Do not describe planned work as done.

Interpret only what the new experiment establishes:

- Retrieval failure/no passage establishes this controlled fetch outcome and
  means no paid extraction. It does not explain the historical attempt.
- An unambiguous service passage in the submitted input but missing from usable
  output supports investigating extraction on this known input. Category needs
  its own supported assessment; do not assume every passage establishes it.
- Successful extraction supports that this input worked on this attempt. It
  does not prove the old hosted search failed: no paired baseline was run and
  model/search behavior can vary.
- A request/parser/accounting/capture error must be named as that boundary,
  not mislabeled as website access failure.

Submitted input does not prove model attention or internal tool delivery. Return
the smallest supported correction proposal and its regression requirements;
do not implement it here. This experiment is not the Periksa walkthrough,
does not close F-03/AC-07, and grants no additional live walkthrough allowance.
Do not mark Spec 011 Verified or publish anything.

## Completion report and escalation

Recheck branch/HEAD, protected hashes, runtime/test preservation, empty index,
`git diff --check`, and new-note whitespace/links. Report outcome, files changed,
checks actually run, exact calls/attempts and allowance state, remaining unknowns,
and the smallest next action. Name any blocker precisely (missing source input,
accounting/configuration, checkout change, unsafe fetch, or a required product
change). Do not ask for the same diagnostic authorization again. No provider
contact, historical-record change, stage, commit, push, merge or deployment.

Give the founder the result-note path for the
[independent reviewer](./F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md). Do not contact
or launch another session yourself.
