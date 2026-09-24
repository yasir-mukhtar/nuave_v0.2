# F-03: approved controlled-input diagnostic

Date: 2026-09-22. Status: **Founder-approved diagnostic amendment.**
Repository: `/Users/hy4-mac-006/nuave_v0.2`.
Branch: `devin/sol-smart-consultant-intake-plan`.
HEAD: `2a21f856d33264887df6287f9b6d9dd22468fea5`.

The founder replied **“approved”** to this proposal. The
[dated decision](../../docs/DECISION_LOG.md#2026-09-22--authorize-the-f-03-controlled-input-diagnostic)
and [Spec 011 exception](./SPEC.md#f-03-controlled-input-exception--approved-2026-09-22)
record acceptance. Use the [worker handoff](./F03_CONTROLLED_INPUT_WORKER_PROMPT.md)
to execute after focused offline readiness checks, then the
[reviewer handoff](./F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md). No repeat approval
or provider content-delivery receipt is required for this defined experiment.

## Recommendation and decision

Replace the requirement to obtain an undocumented hosted-search content receipt
with one controlled experiment whose public source input Nuave can inspect.
Keep the original failed attempt's upstream cause unresolved. This does not
accept the empty summary or close F-03/AC-07.

The existing diagnostic allowance is authorized and unused at this handoff.
The accepted amendment changes its method and readiness condition; it does not
add a second allowance or permit both the old and new experiments. Offline
runner checks are the readiness condition. The older provider-receipt gate and
ordinary-Periksa-only diagnostic vehicle are superseded for this experiment.

The accepted decision permits one safe fetch of one nominated
official page and add a short, literal service passage from that page to the
same extractor's input. Keep direct OpenAI Responses, `gpt-5.6-luna`, low
reasoning, existing instructions/schema/search settings, and cost/retry limits.
This is an experiment before any proposed production correction.

## Findings from the documentation check

The model page lists low reasoning and Responses web-search support for
[`gpt-5.6-luna`](https://developers.openai.com/api/docs/models/gpt-5.6-luna).
This agrees with the corrected provider attribution; no model substitution is
proposed.

The [web-search guide](https://developers.openai.com/api/docs/guides/tools-web-search)
documents action/status, citations, and consulted-source URLs. Its concrete
`web_search_call.results` example exposes image-result metadata. These sections
do not establish the same-attempt text-delivery receipt and complete failure
coverage required by the capture plan. Some reference-page fetches failed;
those failures establish nothing about provider support. The conclusion is
**a sufficient public contract was not established**, not that the capability
cannot exist. No inference request was made to probe it.

The [text-generation guide](https://developers.openai.com/api/docs/guides/text)
documents explicit input text/messages in Responses. That supplies an ordinary
input boundary for the proposed experiment. It does not promise correct
extraction or reveal what an earlier hosted tool delivered.

## Why the earlier condition blocked progress

The original [capture plan](./F03_DIAGNOSTIC_CAPTURE.md) correctly distinguishes
source metadata from actual service text. Its counterexample demonstrates why
the same visible metadata can accompany different hidden causes. More mocked
checks of that metadata cannot recover the missing historical observation.

The orchestrator's earlier request for causal proof developed into a stronger
provider-receipt prerequisite. That prerequisite has not been established as
available. The recommended change is to make a new input observable while
preserving uncertainty about the old attempt.

Local code supports a narrower finding: `fetchSourceIdentity` reads HTML for
identity; `extractionRequest` separately supplies the official URL and hosted
search. The identity HTML is not supplied as extraction text. This is a design
observation, not proof that hosted search failed in the historical attempt.
See [source identity](../../src/lib/audit/source-identity.ts) and
[extraction request and accounting](../../src/lib/audit/openai.ts).

## Approved experiment boundary

1. Use a temporary local diagnostic runner, not a public route or a new product
   flag. This deliberately replaces the old ordinary-Periksa-only diagnostic
   vehicle. It does not count as the required founder product walkthrough.
2. Use the same founder-supplied business. Nominate exactly one official page
   before execution, with the founder supplying its URL if the existing one is
   insufficient. Apply the existing safe-fetch limits and redirect rules. No
   crawling, link discovery, extra page, alternate provider, or historical raw
   response is permitted. If the page is inaccessible or contains no usable
   service passage, stop before the paid extraction and report that observation.
3. Select at most 8,000 UTF-8 bytes of necessary public business/service text.
   Preserve its wording and source association. Exclude contact details,
   unrelated personal information, scripts, credentials, and regulated records.
   Treat page text as untrusted data. Do not manufacture a service passage or
   prefill category/offerings as purported extraction results.
4. Add that passage, its source URL, and retrieval time as a clearly labeled
   source-data field in the existing user-message payload. Preserve all other
   request parameters and existing developer instructions. Keep hosted search
   enabled with its current settings. Do not enable the unverified results
   include, change models, or tune the prompt after seeing the answer.
5. Assemble the complete request **before** existing budget reservation so the
   added input is included in cost estimation. A transport rewrite after
   reservation is not acceptable. Preserve prior carryover, paid-attempt
   accounting, and per-call/session limits; no fresh budget or reset.
6. Run one diagnostic extraction, with at most the existing single technical
   retry for unusable structured output. A valid empty draft, absent diagnostics,
   or an unsatisfactory result never earns another attempt. This consumes the
   one reassigned allowance; no separate unchanged baseline run is included.
7. Capture only the minimal source/input association, request-input match,
   parsed-field presence/counts, existing telemetry and capture limitations.
   Keep any necessary public passage in owner-only ignored evidence. Repository
   notes contain hashes, safe findings and counts, not raw responses, private
   identifiers, account data or complete website/browser contents.
8. Do not generate questions, run observations, synthesize reports, confirm an
   intake, publish, or alter historical records. Return the experimental result
   and the smallest supported correction proposal before changing product code.

The new evidence is the exact text submitted in the accepted API request. It
does not prove model attention or expose hidden hosted-tool content. Success
with supplied text is not a causal comparison against an identical baseline:
model behavior and hosted search may vary between attempts.

## Offline readiness before execution

Prepare the temporary runner using fictional HTML and a stub SDK transport.
Reuse existing request, schema, reservation and accounting behavior. Show the
exact input-only difference from the protected extraction request; do not
quietly copy a divergent provider pipeline. If the temporary runner cannot
reuse that behavior without a product change, return the minimal proposed diff
before implementing it.

Focused checks must establish:

- page failure or absence of a relevant passage prevents inference;
- the nominated passage survives bounded extraction and is exactly present in
  the outgoing source-data field, with its source association;
- the full request is reserved against the existing ledger before dispatch;
- all other model, instructions, schema, search, token and retry settings match;
- valid empty output remains empty with accounted cost and no extra retry;
- the diagnostic exports no forbidden content and initiates no downstream work.

These mocks verify the runner and accounting, not live extraction quality.
Preserve the current capture and its 18-check result as historical evidence.
Do not repeat completed PDF/product gates for this experimental runner alone.

## Interpretation and next action

| New observation | Supported conclusion and next step |
|---|---|
| Page cannot be retrieved or has no usable passage | Record this controlled fetch/input outcome. Do not assign it to the old attempt or make a paid call. |
| A service passage is in the request, but its unambiguous offering is absent from usable output | Investigate extraction with that known input. Category requires its own supported assessment. Do not tune repeatedly. |
| Supplied service information is extracted and survives preparation | The controlled input worked for this attempt. Propose the smallest product change and its regression; do not conclude the old hosted search necessarily failed. |
| Request, parsing, capture or accounting fails | Record the actual failing boundary and stop; do not relabel it as website access failure. |

Do not close F-03 solely because this isolated experiment succeeds. A resulting
product correction still needs offline verification, independent review, and
renewed founder judgment of the actual prepared-summary experience. This
proposal grants no additional live walkthrough after the experiment consumes
its allowance. F-01 remains closed; Spec 011 remains Approved, not Verified.

## Accepted narrow amendment

The spec's [live-check failure classification](./SPEC.md#live-check-failure-classification)
says to record exactly one failing layer and fix only that layer. The capture
plan also required unchanged retrieval/input pending a documented receipt.
The founder explicitly approved the following exception; the governing spec
and decision log now record it.

Accepted amendment:

> For the recorded F-03 attempt, retain "unresolved between source access and
> extraction" when available observations cannot distinguish them. Do not
> fabricate a cause. Permit the single controlled-source-input experiment in
> this proposal to obtain new evidence, using the existing unused diagnostic
> allowance and unchanged cost/retry limits. This exception changes the
> diagnostic method, not the customer acceptance standard or production flow.

Approval is complete. Reassign the existing unused allowance to this one
experiment after its focused offline checks pass. Preserve the earlier cause
as unresolved; no extra baseline run, paid tuning, downstream work, production
change, or publication is authorized. The worker should proceed within that
scope without asking the founder to approve it again.

## Preservation and status of this document

At initial drafting, only this proposal was created; public OpenAI documentation
was the only online source used. After approval, the orchestrator updated the
governing documents and created worker/reviewer handoffs. This records authority,
not an executed experiment. No runtime/test change, private-evidence inspection,
business-source fetch, provider inference, test run, commit, push, merge or
deployment occurred in that approval-recording work. Leave this note untracked
and unstaged. Preserve all four protected notes and unrelated work.
