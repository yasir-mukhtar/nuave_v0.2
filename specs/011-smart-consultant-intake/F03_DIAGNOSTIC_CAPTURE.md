# F-03 diagnostic capture — offline preparation

Date: 2026-09-22. Branch: `devin/sol-smart-consultant-intake-plan`.
HEAD: `2a21f856d33264887df6287f9b6d9dd22468fea5`.

## Superseding authority — controlled input approved on 2026-09-22

The founder approved the [controlled-input amendment](./F03_CONTROLLED_INPUT_PROPOSAL.md).
The [new decision](../../docs/DECISION_LOG.md#2026-09-22--authorize-the-f-03-controlled-input-diagnostic)
replaces this plan's provider-receipt prerequisite and ordinary-Periksa-only
diagnostic vehicle for the one still-unused allowance. Follow the
[controlled-input worker handoff](./F03_CONTROLLED_INPUT_WORKER_PROMPT.md): verify
its temporary runner offline, then execute the single approved experiment
without repeat approval. No OpenAI capability answer or further receipt search
is required. Do not connect the candidate `web_search_call.results` include or
execute both the old and new experiments.

Everything below records the earlier capture work and its limitations. The
old readiness hold and unsent provider question are historical, not pending
tasks. Keep the capture code, tests, logs and preservation records unchanged.
Its privacy, accounting and honest-unknown principles still apply. The new
experiment observes submitted source input; it does not establish historical
hosted-tool delivery or close F-03/AC-07.

## Result and authority

The capture core is prepared and passes **18 mocked checks**, including a real
installed-SDK parse against a stub transport. It is not installed in the app,
and no server, source fetch, provider request or live walkthrough was started.
The current response contract cannot establish whether the extractor received
the missing service content. **F-03/AC-07 remain unresolved.**

The founder authorized offline preparation and, **once ready**, one diagnostic
preparation with at most the existing technical retry, current cost limits and
a stop before confirmation/question generation. That conditional allowance is
recorded and unused. Another approval for the same preparation is not needed.
The founder's subsequent **“Yes you may”** approves the bounded request below
for a documentation check and a conditional response diagnostic. That check is
complete; documented content-delivery evidence remains unavailable in the
reviewed material. The diagnostic include remains disconnected and the live
readiness condition is unmet. The existing extraction method, prompts,
retrieval, budgets, runtime changes and protected notes are preserved.

## Actual acceptance provider — corrected after review, 2026-09-22

The preserved runner at
`/private/tmp/nuave-spec011-acceptance-p5o4z0vx/live-server.mjs:4` explicitly sets
`NUAVE_PROVIDER=openai`, `OPENAI_BASE_URL=https://api.openai.com/v1`,
`OPENAI_AUDIT_MODEL=gpt-5.6-luna` and
`OPENAI_AUDIT_REASONING_EFFORT=low`. These four literal settings were rechecked
without executing the runner or reading credentials. The actual acceptance
path was **direct OpenAI Responses**, and the diagnostic must use that same
path. This plan previously attributed the endpoint and capability question to
OpenCode Go incorrectly. The provider references and unsent question below are
corrected; the preparation allowance remains unused.

## Approved capability check — 2026-09-22

Only public documentation was searched/read. No business website, authenticated
endpoint, model-list endpoint, preparation route or provider inference API was
called. The following findings do not assert that an undocumented capability
cannot exist:

| Official documentation reviewed | Finding relevant to this capture |
|---|---|
| [OpenAI web-search guide](https://developers.openai.com/api/docs/guides/tools-web-search), output/citations, sources and image-results sections | Describes action/status and source URLs. Its concrete `web_search_call.results` example contains image URLs/metadata. It does not establish a text-content delivery receipt for this extraction path. |
| [OpenCode Go documentation](https://opencode.ai/v2/docs/console/go), endpoints section | Reviewed under the incorrect provider assumption recorded above. This page does not establish the required receipt for the actual direct OpenAI path. |

Targeted official-domain searches and an accessible beta Responses reference
also did not establish the missing contract. Stable Responses create-reference
page attempts returned documentation-tool fetch errors; those are not product
or provider-request failures and do not prove API support or lack of support.
A beta API description would not establish the existing direct Responses
path's behavior.

**Readiness decision: blocked on the observation, with authorization recorded.**
The include name alone does not justify a paid compatibility probe. No receipt
adapter was invented, no candidate include was connected, and no extra mocked
payload was presented as a provider guarantee. The previous 18 mocked checks
remain the offline result; their artifacts are unchanged. Product acceptance
checks were not repeated.

### Smallest action that can unblock the capture

Supply one public OpenAI reference or sanitized OpenAI answer identifying the
supported response field and a minimal example for the **existing direct
OpenAI Responses path**, model and hosted-search method. It must say whether
the returned text was actually delivered to that model before final output,
how it is associated with
the same attempt/source/tool call, and how failed or omitted tool results are
represented. Failure diagnosis additionally requires complete result coverage.
No business name, website, account identifiers, raw response or credentials are
needed to answer that capability question.

Prepared question for the founder to obtain that answer; **not sent**:

> For `gpt-5.6-luna` using the direct OpenAI Responses API at
> `https://api.openai.com/v1/responses`, low reasoning and hosted web search
> restricted to the official domain, is there a supported response-only field
> exposing the text actually delivered to the model before its structured
> answer? Please provide the field/schema, a synthetic example, association with
> the extraction attempt, source and tool call, delivery semantics and failure
> coverage.
> Does `web_search_call.results` provide that evidence without changing
> retrieval, prompts or model settings?

Once such evidence is supplied, test its minimal receipt projection offline
before using the already authorized preparation. No further approval for that
same bounded preparation or the conditional include is needed. If the provider
cannot expose the receipt within those constraints, report that limitation;
changing retrieval or prompts would require a separately scoped decision.

## What the current boundary exposes

The following findings came from the initial local-code/installed-SDK pass,
before the approved documentation check above. They are not claims of current
hosted provider support. No credential files were accessed in either pass.

- `src/lib/audit/openai.ts:291`: the request supplies a URL and domain-restricted
  hosted web search; its only `include` is `web_search_call.action.sources`.
  It does not include the identity fetch's HTML as model input.
- `node_modules/openai/resources/responses/responses.d.ts:2856`, installed
  **openai 7.4.0**: `ResponseFunctionWebSearch` exposes an ID, action and status.
  Search sources contain type/URL; open-page/find actions identify a URL or
  pattern. That declared shape contains no page body or delivery receipt.
- `node_modules/openai/lib/ResponsesParser.mjs:36`: completed message text is
  parsed into the structured draft. That is model output, not retrieved input.
- `src/lib/audit/openai.ts:438`: the app returns the draft, model/response
  identity and accounting telemetry; it does not return hosted tool content.
- The same installed SDK's `ResponseIncludable` at line 3080 names
  `web_search_call.results`, described as including search results. The local
  web-search item type does **not** specify that payload or assert it is the
  exact content delivered to the model. Receipt support and delivery semantics
  for the actual direct OpenAI Responses path are **unverified**.

### Exact retained observations

| Boundary | Sanitized capture | What it proves / does not prove |
|---|---|---|
| Provider HTTP response, before SDK parsing | Local transport ordinal, HTTP status; allowlisted completion/incomplete status; tool action/status and listed-source count; presence of a results extension; refusal flag; JSON-object/invalid/absent state; category-present flag and offering/channel/area/evidence/warning counts; token counts when returned | Shows execution/output state. A completed search/open-page, a source URL, model warning or model-written evidence does not prove service-content delivery. A failed tool is not automatically a website-fetch failure. |
| Extraction route response | Same field-presence/count summary; preparation mode; returned extraction attempt numbers, status, existing accounted cost, cost basis and search-call counts | Shows what was handed to preparation and preserves existing accounting. Absent accounting stays unknown. Transport ordinals are not paid-attempt numbers. |
| Capture health | Number of observed transport calls and capture failures | Missing, oversized, malformed or timed-out capture stays unavailable/unresolved; it never becomes a successful access result. |

All exported observations use fixed keys, allowlisted enums, booleans, numbers
or null. They omit names, URLs, queries, tool/response IDs, request/response
headers, credentials, free-text warnings, raw error messages, source text,
model-written quotes and raw responses. Model warning text is deliberately not
used as a causal diagnosis. Unknown provider fields cannot promote a diagnosis.

The observer delegates the original request exactly once and returns the
original response or exception. It adds no request, retry, prompt, include
field, cost calculation, budget mutation or product persistence. It reads a
bounded response clone (256 KiB, 500 ms maximum wait); failure is recorded
without replacing or consuming the product response. It does not by itself
block later routes: the eventual browser driver must enforce the stop below.

## What would distinguish the two causes

The missing observation is a **provider/tool-generated receipt of the content
actually delivered to the extractor in the same attempt, before its final
structured output**. It must be independent of the model's own narrative.

The minimum useful receipt is:

1. An in-memory association to this extraction attempt and tool call. Raw IDs
   stay local and are reduced to an ordinal/match flag, not exported to Git.
2. Whether the tool result was delivered before extraction, and its retrieval
   outcome. `completed` alone is insufficient. Delivery must have documented
   provider semantics, not a field invented by this capture or a model claim.
3. For a successful result, just one necessary, non-sensitive public service
   passage from the authorized official source, with its source association.
   A human can confirm that it states the missing offering. Retain only the
   safe minimal passage in owner-only evidence and a reviewed presence flag in
   the repository. A title, URL, candidate-result list or independent website
   fetch does not substitute for this delivered passage.
4. For a failure conclusion, an explicit failed retrieval/no-usable-content
   result plus complete coverage of the attempt's other tool results, so a
   failed call cannot hide a successful alternate result. If coverage is
   incomplete, the diagnosis remains unresolved.
5. The same attempt's final draft presence/counts, paired with the receipt.

| Receipt + final output | Permitted conclusion |
|---|---|
| Explicit source retrieval failure; no usable content delivered through any other tool result; required values empty | Source-access failure is supported for that attempt. A generic HTTP/provider/tool error alone does not establish this. |
| A public service statement was demonstrably delivered before extraction; its offering is absent from the final draft | Extraction missed that available offering. Category must be assessed separately against supported meaning; empty service channels/reach are not automatically defects. |
| Content was fetched but delivery is unknown; only sources/results metadata exists; warning claims a failure; a guessed `delivered_to_model` field appears | Unresolved. Do not tune prompts or add retrieval. |
| Category/offerings are populated in a new attempt | Observe that attempt's result; it does not retroactively diagnose the earlier failure or supply renewed founder acceptance. |

The mocked counterexample gives both hidden causes the exact same observable
response (completed search, one official source, empty draft). Their captures
are identical. Therefore no classifier using only today's exposed metadata can
reliably separate those causes. The helper always records the failing layer as
unresolved; it contains no pretend adapter for an undocumented content receipt.

## Smallest additional observation and approved request

A possible response-only observation is to append `web_search_call.results` to
the existing `include` list for the already authorized diagnostic preparation.
This does not request a new page, search, prompt or provider. The candidate
transformation is prepared but **not connected** to the capture or app. Its
mocked check proves that only `include` changes; all model, input, tool, token,
reasoning and other request parameters remain identical.

This is a candidate channel for the missing receipt, **not proof that the
existing direct OpenAI path exposes content delivered to the model**. Before
spending the preparation allowance, establish those semantics from public
provider documentation or an already supplied sanitized provider contract.
Do not probe compatibility with a paid call. If results are merely candidates,
or the required receipt is unavailable, report that blocker and keep the
allowance unused. Do not fall back to a fresh site fetch, a second model call,
different retrieval, prompt instructions asking the model what it saw, or
private historical responses.

If documented receipt semantics are available, first implement their minimal
projection in the temporary capture and test its attempt association, delivery
ordering, service-passage review and failure coverage using mocks. The present
helper deliberately does not interpret the undocumented `results` payload.
Enabling that include without a verified receipt projection would simply
discard the needed evidence and is **not ready** for the authorized live run.

**Recorded bounded request — approved by “Yes you may”:**

> Authorize a documentation-only capability check and, only if the existing
> provider supports content/delivery evidence with documented semantics,
> appending `web_search_call.results` to the single diagnostic preparation
> already authorized. Keep all other request parameters, retrieval, prompts,
> budgets and carryover unchanged. No paid compatibility probe or extra retry
> for missing diagnostics. If the receipt cannot be established, stop before
> spending the preparation allowance and report the missing provider evidence.

The prior “once ready” authorization covers the preparation itself; the later
approval covers the narrow diagnostic-output extension and its read-only
capability check. It grants no publication, provider contact/message or account
access. The documentation check above did not satisfy the receipt condition.

## Execution boundary if the observation becomes available

Use ordinary local `/audit`, the existing configured protected method and one
fresh tab for desktop/mobile. Attach the tested observer to the SDK transport
in the temporary local runner; do not patch product source. Verify observer
coverage using a stub transport before enabling the authorized run. Preserve
existing attempt accounting, limits and carryover. One Periksa only; at most
the existing technical extraction retry. Record route counts separately from
HTTP transport observations and the returned paid-attempt ledger.

Block `/api/audit/glm-questions`, `/api/audit/run` and `/api/audit/report` in that
tab, treating any attempted blocked request as a finding. Stop before the final
confirmation, including Enter/submit equivalents. Missing diagnostics never
authorize another attempt. Stop on sensitive content, unexpected calls or
scope/budget violations. Keep any necessary sanitized receipt in owner-only,
ignored evidence; do not retain raw responses. Diagnose only a supported layer
before proposing a correction; obtain renewed founder judgment afterward.

## Offline artifacts and checks

Visible, Git-ignored, owner-only directory:
`/Users/hy4-mac-006/nuave_v0.2/acceptance-review-2026-09-22/f03-diagnostic/`.

- `capture.mjs`: bounded read-only provider observer and route summarizer;
  disconnected proposed `include` transformation.
- `capture.test.mjs`: 18 mocked checks; no live transport or server.
- `offline-check.log`: Node test runner output.
- `preservation-before.json`: runtime/test/configuration and four-note hashes.
- `preservation-after.json`: 276 checked files, zero changed or missing.
- `preservation-after-capability.json`: repeated preservation comparison after
  the documentation-only capability check; no product tests repeated.

| Artifact | SHA-256 |
|---|---|
| `capture.mjs` | `e724319664700f8ffcbeef8a381af957d63a604fd343afcff61003fcde289b7d` |
| `capture.test.mjs` | `5a0e225b5acdfe1e509eeb827dc7aab57e3e1d1f59eef7f2a46448454baa19e7` |
| `offline-check.log` | `762e265e12f2935736e72e3db5398b79dee3842df2fc6170a84f4171c82a89d2` |

Reproduce the new check only:

```sh
node --test acceptance-review-2026-09-22/f03-diagnostic/capture.test.mjs
```

Coverage includes ambiguous causes, completed/failed tools, model warnings and
citations, unsupported results extensions, populated/empty fields, truncated/
invalid/refused output, SDK parsing with unchanged request/response, separate
transport counts without retry, returned/unknown cost, omission of private
text/IDs, transport/HTTP errors, size/deadline/sink failures, and the exact
proposed include-only difference. All 18 passed. No completed unit/build/
browser/PDF acceptance check was repeated.

Tracked documentation updates are this plan, `ACCEPTANCE_EVIDENCE.md`,
`VERIFICATION.md` and `docs/NOW.md`; the plan is a new unstaged file. Existing
runtime/test changes are byte-for-byte preserved. The branch/HEAD are unchanged,
`git diff --check` passes and the index is empty. No commit, publication or
live call occurred.

The approved documentation-only continuation updates the same four documents.
The existing 18-check log and capture files retain the hashes above; no check
was rerun. The 276-file preservation comparison, protected-note hashes, empty
index, branch/HEAD and `git diff --check` were rechecked. F-01 remains closed;
F-03/AC-07 remain open and Spec 011 remains Approved, not Verified.

After the provider-reference review, only this plan, `ACCEPTANCE_EVIDENCE.md`,
`VERIFICATION.md` and `docs/NOW.md` were corrected. The preserved runner was
read only for its four non-secret settings and was not executed or changed.
The 276-file preservation comparison and capture/test/log hashes still match;
the index remains empty and `git diff --check` passes. No tests, documentation
lookup or live work were repeated. The reviewer independently checked the
earlier evidence limits and preservation; the 18 passing mocked checks remain
worker-reported. The readiness hold and existing authorization are unchanged.
