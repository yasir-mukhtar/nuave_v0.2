# F-03 controlled-input diagnostic — offline boundary result

**Latest (2026-09-23):** [the controlled experiment completed](#worker-continuation-completed--2026-09-23).
The allowance is consumed; category and eight offerings were populated, with
accuracy/provenance limits below. F-03/AC-07 remain open.

Date: 2026-09-22. Worker result, not independent acceptance.
Branch: `devin/sol-smart-consultant-intake-plan`.
HEAD: `2a21f856d33264887df6287f9b6d9dd22468fea5`.
Local upstream: `194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4`; ahead by one.

**Latest status — 2026-09-23:** the diagnostic completed and the founder relayed
independent **PASS**, including all 35 focused checks and source/accounting
review. The allowance and both extraction slots are consumed. The original cause
and some offering provenance remain unresolved; F-03/AC-07 stay open. The founder
has now approved the [product-correction scope](./F03_PRODUCT_CORRECTION_SCOPE.md)
for offline implementation through its separate worker prompt.
Earlier unused-allowance/blocker statements below are dated history and do not
authorize another execution.

**Historical disposition after orchestration review (2026-09-22):** the exact proposed patch
can be used in the temporary diagnostic bundle without changing product files.
Six independent fictional feasibility checks passed. Follow the
[continuation below](#orchestrator-review-and-continuation--2026-09-22) and the
updated worker prompt to complete runner readiness and establish carryover.
The worker's original boundary report is preserved below. No live experiment
has occurred and the allowance remains unused.

## Outcome

**Blocked before live execution: the existing functions need bounded input
extensions to support the proposed runner.** Five new fictional offline probes
passed and a concrete two-file diff is prepared, **not applied**. This is the
Step 2 escalation required by the [worker prompt](./F03_CONTROLLED_INPUT_WORKER_PROMPT.md).
It does not request repeat authorization for the diagnostic.

The controlled-input amendment supersedes the old provider-receipt prerequisite;
no provider answer or receipt search is pending. The single reassigned allowance
remains unused according to the authoritative handoff and this worker's zero
live dispatches. F-01 remains closed; F-03/AC-07 remain open; Spec 011 remains
Approved, not Verified.

## Observed implementation boundaries

1. `src/lib/audit/openai.ts:264` exposes no source-text argument. Its private
   `extractionRequest` at line 291 constructs a fixed user object at line 344.
   Supplying an extra `public_source_data` property to the exported function
   in a fictional JavaScript probe produces the exact same complete SDK request
   as the baseline: the passage is absent. A request-building extension is
   needed before `reserveAuditCall` at line 371 to reuse the existing parser,
   accounting and retry path.
2. `src/lib/audit/safe-source-fetch.ts:740` always applies its HTML head stopper.
   A mocked page with a literal service statement in its body returns only
   through `</head>`. This is intentional identity-fetch behavior, not evidence
   of website or historical hosted-search failure. A usable head passage is
   possible, but the existing helper cannot return a body passage. The proposed
   document option preserves the existing safety controls and default.
3. `src/lib/audit/telemetry.ts:66` limits extraction to two ledger entries. With
   one prior extraction and an unusable new response, the running ledger blocks
   a retry before dispatch. Preserve this ceiling; the authorized maximum of
   one technical retry does not guarantee remaining capacity.

The probes bundle unmodified product modules with the installed `esbuild`,
without source transforms or module substitutions, and use the installed OpenAI
SDK against a stub transport. All inputs and credentials are fictional. No
executable live runner or copied provider pipeline is claimed ready.

## Inputs, allowance and accounting

The same founder-supplied business and original HTTPS home page were nominated
from this conversation before any fetch. Identifiers remain only in the ignored,
owner-only `input-nomination.json`. No replacement URL or discovered page was
inferred; the nominated page was not read.

The prior sanitized acceptance record and allowlisted numeric fields from
`/private/tmp/nuave-spec011-acceptance-p5o4z0vx/live-preparation-metrics.json`
establish one completed extraction, attempt 1, USD **0.0217347** accounted on
`provider_usage`, two hosted-search tool calls and 9,987 ms latency. The two
earlier Periksa authorizations stay consumed. No historical content was
reconstructed and those records were not changed.

The sanitized metrics contain no carryover field. The configured carryover
floor was not loaded or verified in this step and remains **unknown**, never
zero. Before any future dispatch, recover it through the existing configured
runtime without inspecting credentials, preserve the prior paid-attempt entry,
and verify headroom. The probes' numeric budgets are fictional and must not be
reused as live accounting.

| This diagnostic | Actual result |
|---|---|
| Direct nominated-page fetch | 0; not dispatched |
| Live identity / extraction / technical retry | 0 / 0 / 0 |
| New paid cost | USD 0 because no inference was dispatched |
| Submitted public passage hash, bytes and source match | Not available; no live page fetch or request |
| Live parsed/prepared field presence and counts | Not observed; preparation mapping not exercised |
| Confirmation / questions / observations / report / walkthrough | None |
| Reassigned allowance | Unused; no dispatch or unresolved paid attempt created |

## New offline checks

Executed once:

```sh
node --test acceptance-review-2026-09-22/f03-controlled-input/probe.test.mjs
```

**5 passed, 0 failed**, worker-reported. The earlier 18 capture checks were not
rerun and do not verify this experiment.

| Probe | Actual observation |
|---|---|
| Safe fetch with fictional head/body HTML | One stub page fetch; bytes end at `</head>`; body passage absent; zero inference calls. |
| Extractor with/without extra source input | Two stub SDK transports; complete requests deep-equal; field and passage absent. Valid empty category/offerings remain empty, cost accounted, no retry. |
| Prior extraction plus unusable response | One stub SDK transport; completed/incomplete telemetry retained; retry blocked by stage ceiling; prior budget unchanged. |
| Exhausted stage ledger | Rejected before transport. |
| Insufficient cost headroom | Rejected before transport; carryover unchanged. |

Total: one fictional page fetch and three mock SDK transports; zero live
requests. Complete fictional request equality covers instructions, model,
reasoning, schema, search, include and token settings. Both requests lacked the
source field: this is blocker evidence, not a passing controlled-input match.
The request SHA-256 is
`1af0fd17f8fbae5c968a6b0ec0325ef9ba772a578391a642f8b528f11d62708a`.

Controlled-runner checks for exact passage inclusion before reservation, byte
bounds, safe passage selection, failure-to-no-inference sequencing, capture
failure, privacy projection and no downstream work remain **pending**. No
completed PDF, full unit/build/browser gate or founder walkthrough was repeated.

## Concrete proposed diff — not applied

Reviewable patch:
`/Users/hy4-mac-006/nuave_v0.2/acceptance-review-2026-09-22/f03-controlled-input/proposed-reuse-extension.patch`.

- `src/lib/audit/openai.ts`: add an optional validated `public_source_data`
  argument containing literal text, source URL and retrieval time. Bound text
  to 8,000 UTF-8 bytes, validate time/URL and official-domain association, and
  add only that field while building user JSON. The existing attempt function
  reserves the complete request and uses its unchanged parser/accounting/retry
  path. Omission preserves the current request. No developer instruction,
  model, schema, search setting, include or cost-limit change is proposed.
- `src/lib/audit/safe-source-fetch.ts`: add an explicit `htmlScope: "document"`
  option under the same 512 KiB decoded-byte bound, 5-second request/10-second
  total deadlines, DNS/public-network checks, per-hop destination limiting and
  maximum three redirects. Default HTML reads remain head-only. No route,
  environment switch or dependency is proposed.

`git apply --check` passed. This establishes applicability only; the candidate
was not applied, compiled or behaviorally verified. The patch contains no
business/source identifiers or credentials.

If the orchestrator approves these bounded extensions, regressions must cover:
unchanged default requests/head reads; document-mode body content and oversized,
timed-out or unsafe redirected responses; URL/time and multibyte input bounds;
exact source-data inclusion before every reservation; unchanged settings and
prior ledger; empty-output/no-retry behavior; technical retry only within limits;
and sanitized capture with no downstream work. Then complete the temporary
runner's full focused checks and resolve existing carryover before using the
already authorized experiment.

This proposal enables the experiment. These fictional probes establish no
business-preparation correction or historical cause.

## Artifacts and preservation

Owner-only Git-ignored directory (0700; files 0600):
`/Users/hy4-mac-006/nuave_v0.2/acceptance-review-2026-09-22/f03-controlled-input/`.

| Artifact | SHA-256 |
|---|---|
| `probe.test.mjs` | `04c4dfd0b00231187df1e22b2b97224cf40cf15f8726acbf2cd4710a6e9d7e67` |
| `probe-runtime.cjs` | `f6907c79b56fc09e44cfce71324c83c0af14530b725923275b7d4e903dff17f3` |
| `offline-check.log` | `67d2cc96db71d7158dc1ad55c6a05a0d13bede8a918d145d5fcf57d07348ded4` |
| `offline-observations.json` | `4609dcc1efd6c5b710ec2a632c89d79d642983d832b29e4844a2b302c7cddbfc` |
| `proposed-reuse-extension.patch` | `1044d9438f115999dbafbb9ceef447c935d712b4f8586a68e3ea401c81386e32` |
| `input-nomination.json` | `499e2460d7e4017504fcaf9ede219ed40a94341f7d716bad0c7cd4ebc4ab5ec2` |
| `preservation-before.json` | `ecafea8e145b61cf3e5ca29d7b83f54ee8e68bd7a900d44685483d5f592f40ee` |

`preservation-after.json` records **290 files unchanged**: the previous 276-file
inventory plus current approval/handoff documents and all six earlier capture
artifacts. Protected-note hashes match and remain untracked/unstaged. Existing
CSS/test edits, the approved spec/decision/proposal/prompts and earlier capture
plan/code/tests/logs/preservation records were preserved. The unrelated redesign
draft was not opened or changed.

Branch/HEAD/local upstream still match; index empty; `git diff --check`, new-note
whitespace and local-link checks pass. This result is untracked/unstaged. Other
repository edits are appended entries in `ACCEPTANCE_EVIDENCE.md`,
`VERIFICATION.md`, and the current next action in `docs/NOW.md`. No credential
inspection, raw historical response inspection, provider contact, stage, commit,
push, merge or deployment occurred.

**Next smallest action:** review this result and the unapplied diff using the
[diagnostic reviewer prompt](./F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md), then
separately scope the required product-function extensions. Worker-prompt Step 2
requires this return before implementation. The existing diagnostic allowance
is authorized; do not request it again.

## Orchestrator review and continuation — 2026-09-22

**Proceed with the exact extensions only inside the temporary runner.** The
worker correctly returned the proposed diff under Step 2. Inspection confirms
both boundaries: `extractionRequest` excludes additional source fields, and the
safe HTML reader deliberately stops at the head. Neither observation diagnoses
the old hosted-search/extraction failure.

A product change is unnecessary for this experiment. The orchestrator applied
the exact patch to two source strings in memory at esbuild load time, resolving
all imports from their original module directories. It reused the existing
extractor, installed SDK, parser, telemetry and safe-fetch implementation.
The original source files were never edited, patched-and-restored, or replaced.
This is an isolated execution of the reviewed diff within the approved runner
scope, not approval to ship these extensions or add a production input API.

The patch hash was checked, every old/context line matched exactly, and the
loader was restricted to the two named modules. Original and overlaid source
hashes are recorded in `overlay-manifest.json`. A separate unmodified bundle
provided the fictional comparison. No parallel hand-written extractor or
transport-time request rewrite was introduced.

Executed independently by the orchestrator:

```sh
node --test acceptance-review-2026-09-22/f03-controlled-input/orchestrator-overlay-review/check.mjs
```

**6 passed, 0 failed.** All source/SDK transports were stubbed and every input,
credential and cost value was fictional. Four mock SDK transports and four mock
page fetches occurred. There were zero real source/provider requests.

| Check | Result |
|---|---|
| Omit supplemental input | Complete SDK request exactly equals the unmodified bundle's request. |
| Supply supplemental input | Exact passage/source/time appear in user JSON; deleting only that field restores complete request equality. Valid empty output stays empty and accounted, without retry. |
| Invalid input | Blank text, over-limit multibyte text, wrong domain, URL credentials and invalid time are rejected before transport. |
| Exhausted prior extraction ledger | Existing stage ceiling blocks dispatch; supplied budget stays unchanged. |
| HTML mode | Default head bytes equal the original reader; document mode returns the fictional body and rejects a response over the existing 512 KiB bound. |
| Preservation | Both original product modules remain byte-identical after bundling and mock execution. |

These establish feasibility and default/request preservation, not complete
runner readiness. The full orchestration checks for passage selection and
privacy, no-passage/no-inference sequencing, redirect/DNS/deadline behavior,
actual configured carryover, dispatch recording, capture failure and downstream
exclusion still belong to the worker. No full product gate, broad type check,
browser or PDF check was rerun. The original five worker probes were not rerun.

Two accounting details govern continuation:

- `reserveAuditCall` receives the constructed request before SDK dispatch. With
  hosted search it reserves its fixed maximum-input estimate, so adding a small
  passage need not change the reserved amount. Do not change that policy or use
  equal reserved costs as proof of missing input.
- The known prior extraction occupies one of the two stage slots. The diagnostic
  has at most one remaining provider attempt; a subsequent technical retry is
  blocked by the existing ceiling. Preserve that entry and verify carryover
  from the configured runtime. A fresh process's absent-value default of zero
  does not establish the existing runtime's carryover. Its actual value was not
  inspected in this review and remains unresolved.

**Worker instruction:** use the reviewed diff in isolated copies or the exact
bundle-time overlay, verify hashes/context without fuzzy application, finish
the focused runner checks, resolve carryover, then execute the already-approved
single experiment. No further approval for these temporary extensions is
needed. Do not apply the patch to `src/`, relax any limit, add a live baseline,
repeat provider-receipt research, or turn the temporary mechanism into a
product feature. If new required changes exceed this runner scope, report only
that concrete difference. Preserve these review artifacts and write subsequent
outputs separately.

New owner-only, Git-ignored review artifacts are under
`acceptance-review-2026-09-22/f03-controlled-input/orchestrator-overlay-review/`:

| Artifact | SHA-256 |
|---|---|
| `check.mjs` | `2f3ecce029206bd0e10681f96317809a737c80eeed6e5ba34fd8fe95b42b146e` |
| `offline-check.log` | `31d577665c74ff13b5770e0fb1385128c0fb675f9a94e56074c123ee102084ae` |
| `overlay-manifest.json` | `2be193f511f3f2e509578e573ed0945017f466b844492467ff92b6883e015782` |
| `baseline.cjs` | `a21aaa7c1907c918ae219d2b94559e208ce377b0985524aa544b4479f5365a78` |
| `overlay.cjs` | `c526ad810d46fac3dbd9ec1a046d85761d3b72d7a1078d6b59e214f1dba1fbac` |

The original worker patch remains unchanged and unapplied to product files.
The allowance is still unused. Product correction and renewed founder judgment
remain separate; F-01 is closed, F-03/AC-07 remain open, and Spec 011 is Approved,
not Verified. No credentials, private historical content or nominated real
business input were inspected by the orchestrator; no stage, commit, push,
merge, deployment or publication occurred.

## Worker continuation completed — 2026-09-23

**Outcome: the authorized controlled-input experiment completed.** One direct
fetch of the nominated official page and one extraction transport occurred,
with zero technical retries or downstream calls. A category and eight offerings
were returned and preserved by the original preparation mapper. This is a
worker diagnostic result, not independent review or founder acceptance.
F-01 stays closed; F-03/AC-07 stay open; Spec 011 stays Approved, not Verified.
The earlier sections above remain the dated history of the offline blocker and
orchestrator review, not the current allowance state.

### Accounting input and scope

The existing development configuration was loaded through Next's `@next/env`
loader, matching the preserved acceptance runner, with only allowlisted numeric
accounting metadata retained. No carryover value was configured. The founder
then explicitly selected **“Use USD 1.00 estimated reserve”** in this conversation.
That is an approved conservative estimate, **not verified historical spend**.
The known prior completed extraction remains a separate ledger entry at
USD **0.0217347**; no ledger or stage ceiling was reset. Starting accounted
reserve plus known extraction was USD **1.0217347**, under the unchanged USD 5
limit. Credentials were neither printed nor inspected; the original configured
runtime supplied them. No further diagnostic authorization was requested.

The existing two-attempt extraction ceiling left one available slot and no
subsequent technical retry. The allowance was unused at execution preflight,
then consumed by this experiment. An exclusive, fsynced local claim remains in
place; do not rerun the live entry. This was not an ordinary Periksa, identity
refresh, UI walkthrough, confirmation or audit.

The actual run occurred on **2026-09-23 Asia/Jakarta**; machine timestamps use
UTC on 2026-09-22. Branch/HEAD and upstream remained exactly those at the top
of this note, with an empty index.

### Focused offline verification

Executed the new suite, not any of the earlier 18, five or six checks:

```sh
node --test acceptance-review-2026-09-22/f03-controlled-input/worker-continuation/runner.test.mjs
node --check acceptance-review-2026-09-22/f03-controlled-input/worker-continuation/live.mjs
```

**35 tests passed, 0 failed**, plus live-entry syntax validation. The final
suite performed 30 mocked page transports and ten mocked provider transports;
all HTML, responses, input values and credentials were fictional. No unmocked
network call was allowed. The first run had 33/34 passing checks: its negative
patch-context test mistakenly searched for `interface` where the source uses
`type`, so it changed nothing. The test fixture was corrected; its first log
and observations are preserved separately. No product fix was made for that
fixture error.

| Boundary | New runner check |
|---|---|
| Reviewed overlay | Exact patch/source/output hashes, exact hunk contexts and two-module allowlist; changed context and wrong module rejected. Original imports, extractor, parser, accounting and SDK reused. |
| Default behavior | Complete SDK request and transport equal the unmodified bundle. Default HTML head bytes match. |
| Only permitted request change | Deleting `input[role=user].public_source_data` restores full request equality, including developer instructions, model/reasoning, schema, hosted search, include, tokens and safety identifier. |
| Before reservation | A read-only in-process inspector observes the original `reserveAuditCall` argument, without changing its module, arguments or result. Exact passage/source/time and preserved ledger are present before dispatch; the actual SDK body matches that observed request hash. |
| Source safety | Private/no-answer DNS, rate limit, unsafe and excessive redirects, unrelated final host, HTTP/media failures, timeout/deadline and 512 KiB bound all stop inference. Permitted hops each receive original validation/rate charging. |
| Passage/privacy | Literal DOM text only, entity decoding/whitespace normalization, complete blocks within 8,000 UTF-8 bytes; no scripts/resources executed. Contact/unrelated person blocks omitted. Sensitive-content signal stops processing. No usable passage means no inference. A local inspection stop also prevents inference. |
| Accounting | Prior extraction and carryover reach the original guard. Explicit over-budget input and configured carryover floor both prevent dispatch. Missing carryover cannot silently become zero. |
| Empty/unusable output | Valid empty output remains empty and accounted without retry. Unusable output reaches the original retry path, whose second reservation sees both ledger entries and blocks another dispatch. |
| Capture/interruption | Failures before fetch, source retention, reservation capture or dispatch prevent provider transport. Failed final capture leaves the claim, blocking restart. An uncertain first transport cannot be repeated. |
| Mapping/export | Populated fields survive the original preparation mapper. Exported diagnostics omit identifiers, raw responses, headers, queries and free-text errors. No identity, confirmation, question, observation or report action occurs. |
| Preservation | All 303 protected runtime/test/configuration/doc/history artifact entries match. |

The SDK's native timeout/maxRetries and request settings were not changed. A
one-shot transport guard prevents another outgoing request after uncertain
first dispatch; SDK internal re-entry is not a new allowance. In the live run
there was exactly one SDK transport invocation. The existing local development
rate-limiter binding was retained; no distributed production limiter is claimed.
No full `validate:fast`, `verify`, build, browser or PDF gate was repeated.

### Observed live input and result

Executed once, after offline readiness and branch/hash checks:

```sh
node acceptance-review-2026-09-22/f03-controlled-input/worker-continuation/live.mjs
```

The existing safe-fetch implementation, with only the approved document-read
overlay, returned **281,090 decoded HTML bytes** from the nominated page.
There was **one direct HTTP transport and no redirect, favicon, crawl, second
page or fetch retry**. No full HTML page was retained. A **1,919-byte**, 17-block
literal service passage was retained owner-only and inspected before inference;
it visibly describes software and web/mobile application services and contains
no retained contact details or personal records. Marketing wording remained
untrusted source data, not a Nuave claim. The source URL is retained privately
with the passage and retrieval time; it matches the nominated official page.

- Retrieval timestamp: `2026-09-22T22:16:50.002Z` (UTC).
- Submitted text SHA-256:
  `4b97e3495f0dce1f017a2a6d8c1848ce62199a07e057094e2c98a87afa95d663`.
- Actual complete request SHA-256:
  `96ea8c7cbc8306870d710f1d70500a55cc131899b2efe3d9873d5ef332050340`.
- Reservation observation and dispatch record contain the same request hash;
  text, source URL and retrieval time match the actual SDK user-data field.
- Dispatch timestamp: `2026-09-22T22:17:20.760Z` (UTC). Direct OpenAI Responses,
  `gpt-5.6-luna`, low reasoning, unchanged schema/instructions/hosted-search
  settings. The original completed-call model/tier guard accepted the response.
- The original guard reserved USD **0.4076** under its fixed hosted-search
  input ceiling. The reservation included the complete request; equal policy
  cost is not evidence of omitted text.

| Field | Parsed result | Original preparation mapping |
|---|---:|---:|
| Category | Present | Present |
| Offerings | 8 | 8 |
| Service channels | 0 | 0 |
| Market reach | Empty | Empty |
| Market areas | 0 | 0 |

The draft also had one official source, nine evidence records, zero warnings,
one supplied-fact entry and zero accuracy questions. These are counts only,
not a validation of the evidence records or all returned meanings. The original
mapper was exercised mechanically with the existing typed name and no refreshed
discovered identity; no selection was confirmed or frozen.

The submitted wording supports a software/IT service category and several core
offerings. Worker comparison finds support for five of the eight returned
offering meanings, partial support for one, and no support for two in the
retained passage. Hosted search remained enabled, so the extra meanings might
have another source; this capture does **not** establish their provenance or
accuracy. The private `source-review.json` records the exact comparison. Do not
present eight populated offerings as eight verified offerings. No explicit
service-delivery location or geographic reach is established by this retained
passage; do not infer “flexible” delivery from a service category alone.

### Calls, usage and allowance

| Observation | Result |
|---|---:|
| Direct page fetch / HTTP transports | 1 / 1 |
| New extraction attempts / SDK transports | 1 / 1 |
| Extraction ledger ordinal | 2, after the preserved prior entry |
| Extractor's local attempt number | 1 (distinct from cumulative ledger ordinal) |
| Technical retries | 0 |
| Hosted-search calls reported | 1 |
| Provider/completion status | Completed; no refusal |
| Input / output tokens | 10,348 / 758 |
| Cached-input / cache-write tokens | 0 / 5,453 |
| Reasoning-output / total tokens | 181 / 11,106 |
| Extraction latency | 10,485 ms |
| New accounted cost, provider-usage basis | USD 0.01325185 |
| Known prior + new extraction cost | USD 0.03498655 |
| Total including estimated USD 1.00 reserve | USD 1.03498655 of 5 |
| Remaining extraction stage slots | 0 |
| Identity / confirmation / question / observation / report calls | 0 / 0 / 0 / 0 / 0 |

Costs are the existing application's usage-based accounting, not independently
confirmed billing. The USD 1.00 historical reserve remains an explicit estimate.
Dispatch/cost are resolved in this result; no timeout or ambiguous call remains.
The diagnostic allowance and both extraction ledger slots are consumed. A
remaining dollar balance does not authorize another attempt or walkthrough.

### Limits and smallest supported correction proposal

**This supplied input worked on this attempt.** It demonstrates that the existing
extractor and preparation mapper can populate category/offerings with explicit
service text available in their input. It does not prove the old hosted search
failed, distinguish the historical source-access/extraction cause, prove model
attention, or establish internal tool-content delivery. There was no paired
baseline; model and hosted-search behavior can vary. There is no refreshed
founder judgment, product walkthrough or acceptance closeout.

Return a bounded product proposal to the orchestrator: consider one safe,
bounded fetch of the supplied official page during preparation and pass only a
short literal service excerpt, with source/time, into the existing extractor's
user-data field **before** its original reservation. Keep the default identity
head read, current prompts/schema/provider/search/budgets/retry rules and manual
fallback behavior. Expose source-retrieval/no-usable-text failures distinctly
from extraction failures without treating a URL or successful identity request
as proof of service-content input. This is a candidate correction supported by
this run, not a proven historical diagnosis or approval to ship the temporary
runner, inspector or source-selection heuristics.

Before product implementation, review the source-selection/privacy boundary
and handling of output facts not supported by the supplied excerpt. Regressions
must cover the real preparation integration with a fictional service page,
complete input before reservation, truthful source origins and retained ledger,
fetch/no-text/sensitive/over-budget/capture failures, valid empty output, existing
technical limits, unchanged default identity behavior, and no fabrication of
channels/reach. Do not impose an excerpt-only truth rule silently: hosted search
is still part of the approved extraction method. A corrected product needs its
own verification and separately authorized refreshed founder walkthrough.

No product change, new source/model/prompt trial, live baseline, provider contact,
question, audit, report, publication, stage, commit, push, merge or deployment
was performed. Earlier UI/PDF/native-dialog/physical-mobile limitations and
independent-review attribution remain unchanged.

### Local artifacts and preservation

Owner-only, Git-ignored directory (existing historical date retained):

`/Users/hy4-mac-006/nuave_v0.2/acceptance-review-2026-09-22/f03-controlled-input/worker-continuation/`

Directory mode is 0700; all 25 files are 0600. Identifiers, the necessary literal
passage and minimal parsed meanings stay only in this private evidence directory.
No full page, raw provider response, headers, queries, credential or free-text
provider error was retained. Keep `execution-lock.json`; it prevents repeat use.

| Artifact | SHA-256 |
|---|---|
| `build-overlay.mjs` | `85888c6e98a67710ab715c6335a7d5091d78f47d52baf43e5acea8ef1d8d1b63` |
| `runner.mjs` | `cbea0a4c9b41b1499feae895767495ce65b067c5410e8bdf5b0766dd2aa505d4` |
| `runner.test.mjs` | `32a7cfa55745ee7f426e07d2026def5c24fb98b6712c0d5ac2c16518c952d026` |
| `live.mjs` | `7ceec5d52959fd02885b970c61f56e3eec613bbba5242ecf5acd4791118f6701` |
| `overlay-manifest.json` | `eb03d9c23842bc33cd7bf7851f716b529050a7ee592ce575223e525752f63530` |
| `baseline.cjs` | `7061e2eced171387db3770371cf60492332a80496956fe2d8bae782d67b6f235` |
| `overlay.cjs` | `67dae78701ecdf90dc644913b68bb81cccf139bb918eef1c8d2d94d8b9d8c125` |
| `offline-check.log` | `12f3f31f367afdef6781b436138b03f32b02fcedb8f83219fcfab2924159137a` |
| `offline-observations.json` | `a6bff9115a131891453a0cbe3edfb80be39cad94930a5d60eec3ef03d32038d9` |
| `readiness.json` | `1757d2d862f085afa7562775d663e25f6780ba87ae76e62c95e5ca6cb72a6314` |
| `accounting-input.json` | `3a5c007572298dc467a7bdb81018729bbfb0a9089d9ffe365fa0f115dec74b29` |
| `configured-accounting.json` | `e29d9527c22d3b1c40515ba1a845db241dce8319ef167d4f253fa2f9adc07df6` |
| `execution-lock.json` | `94de5f3f878d299dbe4079b090bae6b9cbfb88e2b2442b77b3eeb3a779f17928` |
| `source-data.json` | `aaa6283f5c891eb67732cfd611cc3ad27ec4b500be7363353278e4aabb717bcd` |
| `events.jsonl` | `14d0ee490559c1b664be6e3dc70c8ed941e821042c4b8761c9cf4ec36f1e77e7` |
| `minimal-meaning.json` | `1c70c7319df9e3fa6cd978b5f0d8c9c629f368e2349732b46ba1fc6941374c18` |
| `result.json` | `20338d1e08760fb9969c6e2540cebf6ac4890e317f009a201003110d0b00218f` |
| `source-review.json` | `ab96c140c864f84dcb083ea272bcc1dc73dc190c10f5c02598ae50854124176d` |
| `preservation-before.json` | `6ee54c362037306fee5b4439cb0e9b399f60a1123adcd05e2a02981b52b1ad55` |
| `preservation-after.json` | `6ee54c362037306fee5b4439cb0e9b399f60a1123adcd05e2a02981b52b1ad55` |

Full new-artifact manifest: `artifact-manifest.json`, SHA-256
`06f7b51807d6067a0e75c4363672756142b44e7b4b85a25a1c55bb730e08bbd7`.
It also covers the first failed test log/observations and documentation-before
hashes. Existing metadata capture, first five probes, exact patch and six-check
orchestrator artifacts were preserved unchanged.

All **303** preservation entries match before/after, including the original
276-entry inventory, current immutable approval documents and earlier evidence.
The four protected notes remain at their required hashes, untracked and
unstaged. Existing print CSS and extraction test changes remain byte-identical.
Branch/HEAD/upstream, empty index and `git diff --check` match/pass. Only this
result, `ACCEPTANCE_EVIDENCE.md`, `VERIFICATION.md` and `docs/NOW.md` changed in
the repository during this continuation; new runner/evidence files are ignored.
The next action is independent review using
[F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md](./F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md).
