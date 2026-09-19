# Local founder test — consolidated review

## Live response confirmed — 2026-09-18 (Jakarta)

**The paid request executed; its authorization is consumed.** The saved
response and outcome confirm HTTP 200, `finish_reason:stop`, model
`glm-5.3-flash`, response ID `gen-1789685244-h9NLCCkHFyzekfBLpIqh`, and
settled billing USD 0.000782. Usage: 6,985 prompt + 1,139 completion tokens.
The consumed marker records 2026-09-17 22:47:22 UTC. The outbound request
still hashes to `32356cbacf97610cfd927a4ff90cc0c65c83e6ee358e8e311aaaeaf46c0b9e29`.
The fictional business input does not make the provider output synthetic.

The returned UI outcome is `validation_failed`, with ten actual generated
questions preserved. No question-quality acceptance, audit execution or report
is established. The worker reports live authorization disabled and the server
restarted in synthetic demo mode. That mode is separate from the captured live
result. The next review uses saved output; do not send again under this scope.

**Execution deviation:** the first UI submission was blocked as
`input_changed`, before a provider send. The worker then replaced the frozen
intake and its hash sidecar, despite the handoff's instruction not to change
the frozen intake. Its current SHA-256 is
`068dbc1b30059a7360c2d8c303851a3c42ade187478b403538c7aceae6d748ee`,
rather than authorized `7b82b585…`. The worker reports this reconciled browser
bookkeeping/label differences; that diagnosis is not independently reviewed
here. The unchanged API request hash and real response are independently
confirmed. Record this deviation without treating the changed intake as
previously authorized or as a precedent to re-freeze future attempts.

The sections below preserve pre-execution readiness and authorization history.

## Accepted for one local live test — 2026-09-18 (Jakarta)

**B1–B3 are closed. No further implementation correction is requested.**
The founder accepted the synthetic UI earlier and has now explicitly
authorized the frozen request below. The existing worker executes it once,
then returns the actual questions for founder review.
This readiness verdict is not model-quality acceptance, a G2P pass, or
production activation. No provider call occurred during confirmation.

B3 independently confirmed against the returned adapter: mismatch plus
missing, empty or whitespace-only ID returns `failed/provenance`. Mismatch
plus valid ID returns ten valid synthetic texts for inspection; the mismatch
flag and original ID remain intact, including surrounding whitespace on a
nonblank ID. Source and results:
`/private/tmp/nuave-glm-b3-confirmation-ti46c13b/` (`probe.mts`, `result.json`).
All transports were injected; zero network fetches and no attempt consumed.

Independent focused run: **188/188 intake tests, 12 files**. The inspected
post-fix `npm run verify` log passes **1159 unit tests, 90 files; both builds;
91 + 3 + 3 = 97 browser tests** and ends `Offline verification passed.`
Log `/private/tmp/glm-verify-b3.log`, SHA-256
`7b24f9aaa794cdf2b41475cd3d06c9a076222dcdeaf5921764e8ec2cae2ae3d3`.
All 16 source-file hashes in the returned result table match the worktree.
Accepted adapter SHA-256:
`761de44e1d103bd36cfb815534a98a9405750a4e8b87b1a302c9d7efaa8a78a6`;
adapter test:
`65d87db83641e79e923bd97d784ea24338a269653b7ad007d4abaa57f47cd9ed`.

### Authorized worker handoff — execute the frozen request once

Founder reply: **“Authorized”**, 2026-09-18 (Jakarta), to the exact one-request
proposal after B1–B3 closure. Recorded in
[`DECISION_LOG.md`](../../DECISION_LOG.md#2026-09-18--authorize-one-frozen-glm-request-through-the-local-ui).
Continue in `/Users/yasir/nuave-worktrees/glm-prototype` on the existing branch.
Read its `AGENTS.md`, the main checkout's `docs/NOW.md`, this accepted scope
and the matching `LOCAL_FOUNDER_TEST_RESULT.md`. Execute the steps below;
no additional confirmation or implementation round is required.

- One client POST through the local intake UI for the fictional **Laundry
  Ceria** fixture, to `https://api.cheaperinference.com/v1/chat/completions`.
  Model `glm-5.3-flash`, low reasoning, `max_tokens:4096`, `stream:false`,
  180-second client wait, redirects rejected. Zero client retries; gateway
  upstream attempts may differ from the client-request count.
- Exact intake and body are already frozen under
  `/Users/yasir/nuave-worktrees/glm-prototype/.local-evidence/glm/`.
  Intake SHA-256:
  `7b82b585bae93ec539375c0eee7aec9c519e48edb2c532e14919920d3f5ceddb`.
  Request SHA-256:
  `32356cbacf97610cfd927a4ff90cc0c65c83e6ee358e8e311aaaeaf46c0b9e29`
  (32,948 bytes). Directory 0700, files 0600; no consumed marker or provider
  response exists. Reconfirm hashes immediately before enabling the attempt.
- Planning estimate **about USD 0.00385** using the dated 2026-09-17 list
  prices, padded 12,000 input-token assumption and 4,096 output limit in
  `LOCAL_FOUNDER_TEST_RESULT.md`. It is an estimate, not a guaranteed cap.
  Preserve actual billing or mark unavailable; a timeout can still be billed.
- Under this explicit authorization, the existing worker may configure the
  existing `CHEAPERINFERENCE_API_KEY` by name only in the server environment,
  without printing, persisting or putting its value into a command/history.
  Bind the dev server to `127.0.0.1:3027`, use the existing experiment/live
  gates, and keep the evidence directory above. Do not change the request,
  implementation, fixture or consumed marker.
- Use a fresh browser session for
  `http://127.0.0.1:3027/audit/new-intake?fixture=GLM&glm=1` so a stored
  synthetic pack is not mistaken for new generation. Keep the frozen fixture
  choices, reach Review, and submit once. Let the server enforce the exact
  input/body hashes and consume the attempt before sending.
- Capture the UI outcome and restricted evidence, then turn live authorization
  off. Return the exact generated questions (or failure), both model names,
  response ID and actual billing if available. Stop for founder review. Do not
  retry, approve/edit the questions for the founder, start audit observations,
  generate a report, commit, push, merge or deploy under this authorization.

**Authorized; not yet executed as of this record.** The orchestrator rechecked
the accepted adapter/intake/request hashes and absence of a consumed marker.
The founder will pass this handoff to the existing worker. Recheck immediately
before sending and stop if already consumed; never reset the attempt.

## Latest correction review — 2026-09-17, 14:27 UTC

**B1 and B2 closed. B3 is partially corrected: blank response IDs still pass.**
The accepted UI and winning prompt/model are unchanged. No additional prompt,
grammar or medical review is requested. The remaining change is the existing
B3 condition, not another design round. The prepared live attempt is unconsumed
and is not yet authorized.

Independent evidence:

- `vitest run src/lib/intake`: **186/186, 12 files**. Inspected the matching
  full verification log: **1157 unit tests; both builds; 91 + 3 + 3 = 97 browser
  tests; `Offline verification passed.`** The worker's 93 main-suite count
  was a reporting error; the result document is corrected.
- Separate scratch attempts prove one send under concurrent/repeated calls,
  one send after timeout plus retry, and zero sends for mismatched input/body,
  missing artifacts or missing credential. Non-JSON body and timeout outcome
  preservation pass; scratch directories/files are 0700/0600.
- Independent browser check, with generation intercepted by a synthetic
  response and other APIs/external traffic blocked: edit → Back → refresh →
  download preserves exact original, edited wording and `diubah`; the GLM
  pack omits `self_check`; one intercepted request, no executed audit.
- Actual prepared intake SHA-256 remains
  `7b82b585bae93ec539375c0eee7aec9c519e48edb2c532e14919920d3f5ceddb`;
  request remains
  `32356cbacf97610cfd927a4ff90cc0c65c83e6ee358e8e311aaaeaf46c0b9e29`.
  Files 0600, directory 0700, no `attempt.consumed` or provider response.
- Probe source and results:
  `/private/tmp/nuave-glm-b123-review-4iw6e08k/` (`probe.mts`, `result.json`,
  `browser-result.json`). Network fetches in adapter probes: zero. Real
  provider calls in this review: zero.

### Remaining B3 defect

At `src/lib/intake/glm-local.ts:600–604`, the inspection exception requires
`assessment.responseId !== null`. The assessor preserves string IDs verbatim
and checks model mismatch before checking for blank IDs. Therefore these
otherwise valid ten-question synthetic responses produce:

| Returned model | Response ID | Actual result | Required result |
| --- | --- | --- | --- |
| `zai/glm-5.3-flash` | missing | `failed/provenance` | same |
| `zai/glm-5.3-flash` | `""` | `ok`, ten questions | `failed/provenance` |
| `zai/glm-5.3-flash` | `"   "` | `ok`, ten questions | `failed/provenance` |
| `zai/glm-5.3-flash` | `chatcmpl-independent` | inspectable, mismatch retained | same |

Review target SHA-256: adapter
`8290c6fbcde7bacbf55e92a29bfdb125f257dd2806bba3ad59a760ca41eabc6e`;
test `753598231b5eae641730a6b317d6232256d6eb5c3944c605d3d684a1dc94042d`.

### Cost reporting correction — resolved by orchestrator

The result document now uses a dated price source and explicit assumptions,
replacing its unsupported “≤ ~$0.001”. For planning, padded 12,000 input tokens
and the 4,096 output limit imply **about USD 0.00385 at list rates**, not a
guaranteed bill or enforced cap. This documentation correction needs no worker
implementation. Frozen request content and output limit remain unchanged.

### Worker handoff — finish B3 only, 15 minutes including checks

Continue in `/Users/yasir/nuave-worktrees/glm-prototype`, same branch. Read
the worktree's `AGENTS.md` and this latest review section. Preserve the accepted
UI, B1/B2 and frozen artifacts. Modify only `src/lib/intake/glm-local.ts`,
its test, and the existing `LOCAL_FOUNDER_TEST_RESULT.md` return record.

Require a nonblank string response ID for the mismatch inspection exception,
e.g. retain `assessment.responseId !== null` and add
`assessment.responseId.trim().length > 0`. Do not trim or rewrite the recorded
ID, accept the alias, change assessor ordering, or add a new semantic rule.
Use an otherwise valid sectioned ten-question envelope in the regression:
mismatch plus missing/empty/whitespace ID must fail provenance; mismatch plus
valid ID must remain inspectable with the mismatch flag preserved.

Run the focused tests and required offline `npm run verify`. At the deadline
return completed checks or the exact remaining blocker. Update the result
with changed hashes and confirm frozen intake/request hashes unchanged. Do
not regenerate/delete the prepared attempt, enable live mode, read credentials,
make a provider call, commit, push, merge or deploy. No other implementation
changes are requested. Return for confirmation of this condition and then
the concrete single-request authorization; no repeat general review.

## Previous review and correction scope

2026-09-17. Review ran 13:32–13:41 UTC, within the 20-minute box.
**The synthetic browser flow is ready for founder hands-on testing. Paid
generation is not ready to enable.** General validator hardening was not
reopened. The remaining items concern this flow and its proposed single send.

Founder follow-up: **“Okay good enough, lets move on”.** The local UI milestone
is accepted. Proceed with the bounded B1–B3 live preparation below; do not
reopen interface or prompt-design review. Real generation remains unexecuted
and requires authorization for its concrete prepared request.

## Working now

Reviewer started a loopback-only server with live authorization false and
both provider-key variable spellings blanked:
`http://127.0.0.1:3027/audit/new-intake?fixture=GLM&glm=1`.

The actual browser reached ten explicitly synthetic question cards. A
multi-sentence edit saved and survived refresh. Exactly one local preparation
request occurred, with no browser errors or real provider calls. The final
button leads to a local handoff, not an executed audit. Test these interactions
now; the synthetic wording is not evidence of GLM question quality.

Independent focused tests: **280/280, 14 files**. Inspected worker log
`/private/tmp/glm-verify-founder2.log`: **1149 unit tests, 90 files; both
builds; 97 browser tests; `Offline verification passed.`** The report's
“89 files” is a harmless counting error. No independent full-suite repeat.

Browser evidence: `/private/tmp/nuave-glm-founder-browser-review-lDlylb/`.
Adapter probes: `/private/tmp/nuave-glm-founder-adapter-review-P40Ioh/`.
These include source, results, screenshots and the observed fictional request.
All intercepted transports were synthetic; real network fetches: zero.

## B1 — Freeze and consume the actual single live attempt

The persistent env flag/key enable any number of calls. Two calls under one
flag produced two intercepted sends and two `ok` outcomes. `Coba lagi` is
another request, not a new founder authorization. The input fingerprint checks
internal consistency; it does not pin an approved input/request.

The proposal currently specifies “whatever” the builder emits rather than
providing frozen artifacts. The observed UI request is **32,948 UTF-8 bytes /
32,838 characters**, not ~47 KB; its SHA-256 is
`32356cbacf97610cfd927a4ff90cc0c65c83e6ee358e8e311aaaeaf46c0b9e29`.
The smaller invoice request's $0.000371 receipt does not establish this
request's price or a spending bound.

Before live authorization:

- Freeze the actual UI input and outbound body, with hashes; bind the prepared
  attempt to them. Changed input requires new preparation.
- Atomically consume the prepared attempt before sending. Duplicate/concurrent
  requests, refresh, retry and reuse after timeout cannot send again. A small
  local consumed marker suffices; no general billing system is requested.
- Restore `redirect:"error"` on the pinned transport. Use the established
  `CHEAPERINFERENCE_API_KEY` spelling consistently in code/tests/instructions.
  Authorized-live mode without its key must stop, not choose the stub.
- Preserve exact response bytes/outcomes in owner-only local evidence,
  including failed/non-JSON responses. Pre-create the destination. Record an
  honest timeout when no body arrives. Do not store credentials or auth
  headers. The current adapter discards the raw body after processing.
- Give a dated estimate for this frozen request, with input-token assumptions
  and the 4096 output limit. Label an estimate as such, not a guaranteed cap.

## B2 — Preserve originals and truthful local metadata

The browser probe saved an edit, refreshed, then found `pack.originals[0]`
equal to the edited text. The “diubah” marker disappeared. Restore at
`local-questions.ts:679–698` rebuilds originals from current wording. Keep and
validate the stored original array separately through edit, Back, refresh
and download. This is a directly observed loss in the founder-review path.

The builder also emits `self_check`, including `verified_inputs_only:true`.
Mechanical validation has not proved that claim. The approved v3 contract
requires omitting the object. Use a small distinct local GLM type/parser;
do not fake booleans to satisfy the legacy schema or migrate production
schemas for this test. Leave deterministic packs unchanged.

## B3 — Model mismatch must not waive missing response ID

The exception at `glm-local.ts:322–325` permits inspection whenever a
provenance failure coincides with model mismatch. The assessor checks
mismatch before ID. A synthetic `zai/glm-5.3-flash` response with no `id`
therefore produced `status:"ok"` and `responseId:null`.

Keep the mismatch verdict and intended local inspection, but verify the
other envelope requirements independently before forming a review pack.
Missing/blank ID retains its failure; mismatch must not mask it. Add the
combined-failure regression. No new alias policy is requested.

## Worker handoff — 45-minute live-readiness correction

Continue in `/Users/yasir/nuave-worktrees/glm-prototype` on the same branch.
Read its `AGENTS.md`, the main checkout's `docs/NOW.md`, this complete review
at `/Users/yasir/nuave_v0.2/docs/drafts/glm-local-integration-2026-09-17/LOCAL_FOUNDER_TEST_REVIEW.md`,
and `LOCAL_FOUNDER_TEST_HANDOFF.md` in the same directory. Preserve the UI,
which is accepted for synthetic hands-on testing.

Time box **45 minutes including checks/return**. Correct only B1–B3 in the
local adapter/route, pack restore/type, minimal retry/attempt UI state and
focused tests. A tiny attempt/evidence helper is allowed. Keep production and
default-preview isolation. No general framework, prompt/matrix change or
additional regex hardening. At the deadline return the result or exact blocker.

Test duplicate/concurrent reuse and post-timeout retry with injected fetches;
hash mismatch and missing key with zero sends; restricted evidence permissions;
mismatch plus missing ID; and originals/edited marker after browser refresh.
Preserve existing UI tests and run `npm run verify` offline. Report unrun
checks honestly if the deadline arrives.

Update the existing `LOCAL_FOUNDER_TEST_RESULT.md` with exact frozen artifacts,
hashes, evidence destination, one-attempt enablement and the cost proposal.
No additional planning document is needed. Keep the real test unexecuted:
no credentials, provider call, audit, commit, push, PR, merge or deployment.
Read-only public pricing documentation is allowed for the estimate.
Return for one focused check of B1–B3, then present the concrete live attempt
for founder authorization. The founder can use the synthetic UI immediately.
