# Spec 009 — orchestrator verification

Updated 2026-09-19. **AC-04 passed; four-item Block B offline extension accepted;
authorized live audit/report completed.** All 11 requests succeeded; live access
is off. On September 19 the founder judged the report not useful enough and
deferred report improvements in favor of completing the continuous audit flow.
AC-08's usefulness condition is not passed; it is deferred as a prerequisite
for that continuation. The continuous-flow code corrections are accepted;
the founder's PDF review now permits advancing from offline AC-10 to a
complete real end-to-end test, which still needs explicit paid authorization.

## Founder PDF review and test priority — 2026-09-19

The founder reported: “I've seen the PDF report” and identified desired
format changes, including the actual question and actual AI answer. They
reaffirmed finishing the workflow for end-to-end testing before iterating the
report. Treat this as founder-reported PDF review and acceptance of the
current format as an interim test output, not satisfaction with its quality.
No saved-file path or independent inspection of that specific PDF is claimed.

Combined with the independent Chrome journey/JSON/recovery checks and the
worker's printable-content evidence below, **offline AC-10 is accepted for
moving to the real test**. No additional PDF verification or report redesign
round should hold that test preparation up. AC-08 usefulness remains deferred;
Spec 009 is not globally Verified and the fresh-session live path is unproven.

Source inspection confirms that the customer evidence export preserves the
exact question and full captured `raw_answer`, source URLs, observation time
and model identity; it removes internal call telemetry, not answer content.
The actual downloaded synthetic JSON was reopened: all ten observations
contain the question, answer and model/time. `ReportView.DetailContent`
currently renders `observation.question` and `detail.answer_excerpt`.
Displaying the full captured answer can therefore reuse saved evidence.
This does not mean that improving findings, classification or recommendations
is merely a layout change; those are separate analysis improvements, usually
possible using the same saved answers.

Next: prepare one complete real-flow authorization scope, including real
preparation and a fresh GLM generation followed by explicit question approval,
then ten grounded observations and report/download. Preserve accepted earlier
evidence; do not substitute its pack into the new session. No live calls,
application edits, commits, pushes or deployment occurred in this follow-up.
The earlier PDF handoff below remains the dated review record.

## Continuous-flow correction review — 2026-09-19

**Disposition: three code corrections accepted; normal JSON download passed;
PDF save handed to the founder.** No further worker implementation round is
needed on present evidence. Do not mark all four items or AC-10 passed until
the PDF saved through the normal control is opened and checked. Report
usefulness/format remains deferred; AC-08 is not passed.

Reviewed attachment `bfa6a8e9-0765-4566-9614-b1b02b668884` and the actual
implementation in `/Users/yasir/nuave-worktrees/spec009-block-a`, branch
`codex/spec-009-block-a-direct-ten`. The worker records approximately 75
additional active minutes and reports final `npm run verify` passing:
**1,241 unit tests / 95 files, 96 + 3 + 3 browser tests, both builds and the
static checks.** The full gate was not independently repeated. The
orchestrator independently ran **31/31 tests across three files**:
`local-audit-session`, `local-preparation-routes`, and `direct-ten-route`.

### Accepted corrections and independent evidence

- **Completed-result preservation:** source checks confirm bound-record
  re-entry uses `autoStart: false` and `execute()` rejects a done record.
  A newly entered Batik Laras session was completed in normal Chrome with
  one question edited before approval. Back → unchanged continue immediately
  reopened its report; reload also restored it. The server log contains
  exactly one run POST and one report POST, both HTTP 200, across these actions.
- **Captured-answer recovery:** the substitute-only validator is threaded
  through both route and orchestrator. Protected live validation remains.
  The focused route tests passed, including labeled resume acceptance,
  rejection of foreign model claims and flag-off rejection. The worker's
  partial-three-answer browser resume regression was inspected and its pass
  is worker-reported, not a second manual reproduction by the orchestrator.
- **Preparation selection:** the client now requests `local_mode: auto`;
  the server chooses the labeled substitute unless explicit live execution
  is enabled. Mocked live dispatch and missing-key failure tests passed.
  Extraction telemetry and mode are carried into the saved session and audit
  ledger. The manual Chrome session used the real identity/extraction routes
  with substitutes and buyer-entered facts, never a real source fetch.
- **Retry accounting:** report requests combine preparation, observation
  and prior report telemetry. The persisted attempt count limits failures
  without telemetry; the direct retry sets its in-flight guard before fetch.
  Focused ledger, counter and guard tests passed. The worker's browser test
  covers two same-tick retry activations producing one POST.
- **Normal JSON download:** clicked “Unduh bukti JSON” in that Chrome session
  and opened the actual downloaded file. It contains Batik Laras, ten prompts,
  ten observations, the exact approved edit, direct-ten method,
  `preparation_mode: synthetic-local`, `synthetic: true`, and zero provider
  calls. Retained copy: `/tmp/nuave-continuous-final-review/chrome-evidence.json`.
  SHA-256: `4354dbf8b7a43a96fde9f8faf325be89a6a522a17a9f876ac1912f0efc28a43e`.

The approved edit was: “Rekomendasi penjahit batik tulis untuk seragam kantor
di seluruh Indonesia apa ya?” The session used `https://batiklaras.example`,
whole-business scope, Batik tulis, Kain batik tulis, delivery to customers,
Seluruh Indonesia, and no named competitor. This is a synthetic test case,
not public evidence about an actual business.

### Remaining PDF check and founder handoff

The worker's new-business test still overwrites `window.print` with a counter
and then uses `page.pdf()`. Its “all four complete” statement overstates that
evidence. Independent text inspection of the retained ten-page test PDF
confirmed the business, exact edit, all ten question IDs and synthetic labels,
with no question-edit controls. It proves printable content, not the native
save dialog. That artifact stays labeled as test output.

The orchestrator clicked the real product Print control in normal Chrome;
the browser-control call timed out and direct tab control later reported a
disconnected debugger. Native inspection encountered unrelated active Chrome
content, and automatic approval review rejected a subsequent inspection for
that reason. The rejection was not bypassed. After offering to pause Chrome,
the founder chose **“I’ll save the PDF myself.”** The report tab was marked
for handoff, and the offline loopback server was left running for this action.

The only remaining step is “Cetak / simpan PDF” → “Save as PDF”, then open
that saved file and confirm Batik Laras, the edited first question, ten
question details, synthetic labels and report-only content. Do not rerun the
audit to save the PDF. No application failure in the native save path has
been established; its outcome remains unverified.

Review URL: `http://127.0.0.1:3031/audit/new-intake?glm=1`, in Chrome tab
“Uji coba intake | Nuave”, group “🧾 Nuave export check”. The review launcher
explicitly set both live authorizations to `0`, blanked provider keys and
bound `next dev -p 3031 -H 127.0.0.1`. Log and launcher PID are under
`/tmp/nuave-continuous-final-review/`. This review made zero live provider
calls and changed no application code, commits, branches or deployments.

### Later real-run scope needs these corrections

The worker's proposed fresh-session live test leaves GLM generation synthetic,
while its table says “retained pack”. Neither is a complete new-business live
journey. After the PDF check, a complete real-flow proposal must explicitly
include one fresh GLM generation and human question approval, in addition to
preparation, ten observations and report synthesis. Previous live permissions
remain consumed. This is preparation for a later approval, not authorization.

Also distinguish the report workflow's initial synthesis plus at most one
language repair from the general three-call stage allowance across retries.
SDK transport retries can add HTTP requests and potentially billed usage;
received telemetry does not establish total supplier billing. The USD 5
reservation check is against the supplied ledger, not an absolute billing cap.
Keep these scope/accounting corrections in the next proposal; no new spend
system or report work is requested.

The earlier return review below is retained as the dated failure record.

## Continuous-flow return review — 2026-09-19

**Disposition: main wiring retained; functional completion not accepted yet.**
The worker reports final `npm run verify` passing: 1,222 unit tests / 94 files,
95 + 3 + 3 Playwright tests, typecheck/lint/format and both builds. This is a
worker-reported full gate; the orchestrator did not repeat it. Independently
ran **57/57 tests across three files**: `local-audit-session`, `local-questions`,
and `preparation`. Source and browser review found the scoped gaps below.
Report usefulness remains deferred and is not a reason for this return.

The worker's complete return is at
`/Users/yasir/nuave-worktrees/spec009-block-a/specs/009-recommendation-eligible-audit/VERIFICATION.md`.
The submitted transcript is attachment `b7373f2b-00ca-405a-810b-b6d9d4c5d4f5`.
Branch/base remain `codex/spec-009-block-a-direct-ten` /
`687f340343aa5be547d03e7d6fe23a9f5262a2df`; implementation is uncommitted.
The return did not state this continuation's elapsed active time, a concrete
launch command/URL, or retained artifacts for the new-business PDF.

### 1. Completed-report return and captured-answer recovery fail

**Reproduced in the actual browser**, all keys blank and both live flags off:
`/audit/new-intake?fixture=GLM&glm=1` → facts review → prepare questions →
explicit start → completed synthetic report. The first run/report both returned
HTTP 200. Then “Kembali ke pertanyaan” → unchanged “Mulai audit” left the UI at
“Menjalankan sepuluh pertanyaan audit.” with **10 of 10 complete** and no report
or download controls. Reload showed “Audit terhenti” / “Laporan belum tersedia”.
“Lanjutkan audit” then returned HTTP 422: saved synthetic observations were
rejected by production-model/search validation.

`IntakeJourney.tsx:781–782` sets `autoStart: true` on re-entry even for unchanged
completed input; `LocalAuditStage.tsx:475–477` calls `execute()` again, and its
base record clears `report`. Preserve/reopen the matching completed result.
Recovery must also accept labeled offline observations only in the explicitly
enabled substitute path; keep protected live validation unchanged. Add focused
completed-return and partial-capture recovery regressions. The existing test
stops after Back; its interrupted case has zero saved observations.

Evidence: `/tmp/nuave-continuous-review/back-reentry.json` and `server.log`.
Do not call this an observed billed duplicate: no provider was enabled and no
second successful synthesis response was observed. The reproduced defect is
loss of the completed-report view and failed recovery.

### 2. Entered-business preparation has no live selection

**Source-confirmed:** `prepareEnteredBusinessFixture()` in
`IntakeJourney.tsx:228–283` always sends `substitute=local` to identity and
`local_mode: "synthetic"` to extraction. Those routes always return substitutes
for these fields regardless of downstream audit authorization. This proves an
offline demonstration but leaves fresh source preparation disconnected from
its existing live boundary. Add explicit server-controlled, authorized mode
selection with safe offline default and visible provenance. Prove dispatch
with offline provider mocks; no paid call is authorized for the correction.
Carry returned preparation telemetry into the session's audit budget. Do not
solve this by silently enabling extraction or sending a fixture as real data.

### 3. Report retry loses its own budget history

**Source-confirmed:** `LocalAuditStage.tsx:172–175` sends only `working.runCalls`
to every report request, omitting `working.reportCalls` accumulated after a
failed synthesis. `reportCallAttempts` increments at line 155 but the retry
ceiling uses only `record.reportCalls.length` at line 504. Thus recorded report
costs are not forwarded, and repeated failures without returned telemetry do
not advance that recovery ceiling. The direct retry callback also does not set
the in-flight guard before calling `callReport`.

Preserve/deduplicate the current session's preparation, observation and report
history across retries, enforce the existing bounded recovery allowance even
when telemetry is absent, and prevent overlapping retry submissions. Do not
build a new generic spend system or claim a supplier billing cap. A narrow
failure/retry request-capture regression is required; no new live audit needed.

### 4. Normal PDF export remains unproven

The test replaces `window.print` with a counter (`new-intake-glm.spec.ts:77–79`),
then saves via a separate `page.pdf()` call (line 181). The new-business test
checks JSON only (lines 313–325). These checks cover button wiring and print
layout but do not demonstrate the required normal-browser save/print action.
Return opened PDF and JSON from the same newly entered session using the normal
controls in a supported browser, with the business and edited question checked.
Reuse the existing print flow; this is artifact verification, not a redesign.

One consolidated correction handoff is ready in the existing NEXT_STEP file.
No commit/live-run decision is the next action while these functional gaps
remain. The review server was explicitly bound to 127.0.0.1 and stopped after
inspection. Zero provider calls, application edits, agent dispatches or Git
publication occurred. The report's content/format issues remain deferred.

## Worker return and independent checks

Worker Block A: `/Users/yasir/nuave-worktrees/spec009-block-a`, branch
`codex/spec-009-block-a-direct-ten`, base `687f340343aa5be547d03e7d6fe23a9f5262a2df`.
Its own `specs/009-recommendation-eligible-audit/VERIFICATION.md` retains the
worker's complete return and reported ~135/150 active minutes.

The supplied URL on port 3027 actually serves
`/Users/yasir/nuave-worktrees/glm-prototype` (confirmed by process cwd).
The founder's tested old preview is not evidence of the new implementation's
naturalness. Both implementations have explicitly synthetic sample wording.
Independent local UI review of the new worktree remains pending.

Inspected the actual source/request builder, method dispatch, source
adaptations and freeze/consume/evidence protections. The recovered source
body hash still equals `652cfeda5cb6b11fa08d33f80325854738fdaacd8f0f59b3533ae0ad0cf71d0a`.
Independently ran the existing direct-ten module, GLM adapter and local-pack
tests: **72/72 passed across 3 files**, offline with live credentials blanked.
This does not replace the required full `npm run verify` in Block B.

## Authorized real generation

The founder supplied a real business brief for a corporate advisory business
operating across several markets — the business name and source URL stay in
private evidence (the identifying details are withheld from the public
repository). Desired credibility, expertise, authority, end-to-end support
and modern-product understanding were kept as buyer criteria, not verified
service-quality claims.
Dubai was consolidated under UAE; all supplied countries remain in the brief.
No service channel or competitor was invented. Indonesian question language
remains the approved method.

Exact instruction: “But doesnt matter, just summon the GLM and recommendation
eligible prompt approach and we will evaluate from that.” Treated as one new
generation authorization, not audit/report permission or question acceptance.

The orchestrator used the worker's unchanged request builder and guarded
adapter for this standalone generation. It did not dispatch agents or change
application code. The input was assembled from the founder's message with an
empty reviewRows array; this is not a fabricated UI review or product-path pass.
The new request was frozen once and not changed after submission.

Restricted evidence directory (gitignored, directory 0700 / files 0600): a
dated `.secrets/spec009-…-2026-09-18/` directory in the canonical checkout
(its name is withheld from the public repository).
Contains `brief.txt`, frozen input/request plus hashes, `PREPARED.md`, consumed
marker, exact raw response, `generation-result.json`, and `QUESTIONS.md`.
Existing consumed attempts and captures were untouched.

- Request SHA-256: `e7ad443884c49127df73aa072074891fd7887d47ed3a05c31e7c5bf6a46621f8`.
- Intake SHA-256: `d5692290088eefe6a0efd247f3199c85a75afd4f806874c23f57083ae3c17028`.
- Started `2026-09-18T01:01:50.558Z`; elapsed 16,438 ms.
- One Cheaper Inference call, requested/returned `glm-5.3-flash`; no model mismatch.
- `max_tokens: 4096`, reasoning `low`, no search, 180-second client wait,
  zero client retries, redirect error; attempt consumed before send.
- HTTP 200, finish `stop`, response ID `gen-1789693315-97pgxMrsOcxNZLjahddQ`.
- Usage: 3,007 input + 1,148 output = 4,155 tokens.
- Ten texts extracted; adapter mechanical status `ok`; subsequently accepted
  unchanged by the founder as recorded below.
- Settled billing **USD 0.000496**, read from retained
  `cheaper_inference.billing.billed_cost_usd`; no billing lookup call.

**Observed billing issue:** the provider returned `billed_cost_usd` as the
string `"0.000496"`. The current number-only parser therefore exposes
`billedUsd: null` despite settled billing. Preserve the raw receipt; correct
and regression-test this narrowly in the worker's remaining budget. No fix
or additional provider call was made by the orchestrator.

## Founder wording feedback

This feedback refers to the old laundry preview, not the retained-business
response:

> The others are a bit unnatural too in terms of word structure and choices, but these above are questions normal people wouldnt ask.

The six rejected examples, preserved exactly:

1. Buat pelanggan sibuk yang butuh Laundry kiloan dengan layanan antar-jemput di Jakarta Selatan, kriteria apa yang sebaiknya dipakai untuk milih?
2. Apa saja bedanya Laundry kiloan di Jakarta Selatan kalau dilihat dari harga, kecepatan, dan opsi antar-jemput?
3. Apakah Laundry Ceria cocok untuk pelanggan yang butuh cucian cepat selesai di Jakarta Selatan?
4. Kalau disuruh milih Laundry kiloan buat langganan rutin, Laundry Ceria masuk akal nggak?
5. Bagaimana Laundry Ceria dibandingkan alternatif lain di kategori Laundry kiloan untuk cucian rutin di Jakarta Selatan?
6. Laundry Ceria cocoknya buat pelanggan seperti apa — misalnya yang butuh antar-jemput dibanding yang antar sendiri?

## Founder acceptance and Block B release

Exact founder verdict, 2026-09-18:

> Yes this is good enough, beyond what we achieved in the 6/4 formula. Move forward.

All ten actual retained-business texts are accepted unchanged; no human edits.
**AC-04
passes for this pack.** This is an explicit quality judgment, not an inference
from mechanical checks. It releases offline Block B, not paid audit/report
calls or acceptance of an untested UI/report.

The private evidence directory above now also contains `ACCEPTANCE.md`,
`ACCEPTANCE.json` and `accepted-local-pack.json`. The native pack was created
by the existing `prepareGlmLocalPack` and restored by `parseLocalQuestionPack`:
ten current texts and ten originals exactly match the retained GLM output.
No application code or historical capture was edited to produce it.

- Method: `nuave-glm-direct-ten-v1`.
- Ordered text hash: `0034f2271ae6abef0848cea349015f381c999b71429448992fe95d07fd87255e`.
  Encoding: SHA-256 of UTF-8 `JSON.stringify(orderedQuestionStringArray)`,
  no trailing newline.
- Native pack file hash: `0190ccc0ccc96178f655ebaecb8d99bc845d7eb985d99d42f7f230cc3ff3cda7`.
- The acceptance receipt binds the input/request hashes and response ID above.
- Approval occurred in this conversation. Native draft/review-status fields
  are left as emitted by Block A; do not misrepresent this as a UI approval
  event. Block B must carry the accepted text/context binding into its real
  approval and execution flow. Changes invalidate the binding.

One consolidated carryover list is included in the released handoff: (1)
return a verified server URL from the implementation worktree and demonstrate
retained-response review/persistence without new sends; (2) correct the bounded
numeric-string billing issue with regression coverage. Use remaining Block A
time for its corrections; keep the original Block B limit at 210 minutes.
No silent extension and no new question-generation call.

## Next action

The approved extension has returned and its four-item offline handoff is
accepted. Founder decides on the corrected live authorization proposal at the
end of this record. No further worker round is released. Orchestrator does not
dispatch agents or duplicate implementation. Do not mark the spec Verified or
infer AC-08 from offline checks. Unrelated findings remain in `DEFERRED_NOTES.md`.

## Orchestrator Block B review — 2026-09-18

**Verdict: useful partial implementation; Block B is not complete.** Review
began at 05:27:20 UTC and stayed inside the 15-minute review window. The worker
reports ~140/210 Block B minutes and ~15 minutes of Block A carryovers used.
Approximately 70 Block B minutes remain, including corrections and verification;
Block A has no remaining recorded allowance. No extension is granted here.

Independent checks:

- Inspected the changed lock/run/report contracts, outgoing observation request
  builder, local retained-pack loader, report counts, client and export path.
  The answering builder sends the individual question, not the business brief.
  Method dispatch and synthetic labels are useful completed work to preserve.
- Ran `direct-ten-audit.test.ts`, `locked-question-pack.test.ts`,
  `contracts.test.ts`, and `report-pipeline.test.ts` with live keys blanked:
  **93/93 tests passed across four files**, offline. These tests do not prove
  the missing product journey or correct new-method recommendation denominator.
- Called the inspected synthetic-only `POST /api/audit/local-audit` with `{}`.
  HTTP 200: ten exact retained prompts, ten completed synthetic observations,
  report, `provider_calls: 0`, no web search. Saved privately to
  `/Users/yasir/nuave_v0.2/.secrets/spec009-block-b-review/local-audit-response.json`
  (directory 0700, file 0600). This is plumbing evidence, not business findings.
- Opened the local page in the browser. It rendered its heading and run button;
  clicking, including after reload, did not produce a report in this review.
  The API worked separately. Cause is unresolved; no browser/download pass is
  claimed. No actual PDF was available to open. The worker's JSON was produced
  by calling the export function, and its PDF claim cites an older print test.
- Numeric-string billing parsing has focused regression coverage. The worker
  reports a full `npm run verify` pass (1,202 unit tests, 97 browser tests and
  builds), followed by source edits with only focused rechecks. A final-tree
  full verification pass remains required; it was not independently repeated.

Material failures, consolidated once in the linked handoff:

1. **Product connection and retained approval (AC-02/05/06).**
   `IntakeJourney.tsx` links every direct-ten handoff to the same fixed demo.
   `local-report.client.tsx` sends `{}` to a synthetic-only route, with no
   accepted-pack state passed from intake and no real run/report UI connection.
   The worker explicitly descoped retained review. Existing founder approval
   stands, but it does not remove required edit/original/Back/reload/invalidation
   behavior. `local-direct-ten-audit.ts` also hardcodes the retained-business
   brief instead
   of loading the receipt-bound private input; its loader verifies text/file
   hashes but does not enforce the accepted supported method/input binding.
2. **Report truth and method retention (AC-07).** In `contracts.ts:1234`,
   recommendation assessment is restricted to records where the brand appeared.
   The actual synthetic output therefore has appearance 0/10 but recommendation
   `{recommended: 0, assessed: 0}`; `ReportView.tsx:322` renders the latter as
   untested. R-07 requires explicit recommendation separately across ten
   evaluable answers. Customer export strips the legacy facts that happen to
   retain the ten-answer count. Its download also omits the new-method metadata
   held outside the report in the local route's response envelope. Detail
   findings/evidence notes remain English in this Indonesian report. Preserve
   historical semantics while correcting this delivered method and inspecting
   both actual PDF and JSON.
3. **Local-only enablement (AC-09).** Direct-ten branches in `/api/audit/run`
   and `/api/audit/report` have no local-experiment/non-production guard. The
   demo route/page guards do not protect these live endpoints. This would
   enable the new method outside the approved local scope if shipped; no
   deployment occurred. The development process also listens on `*:3031`;
   bind the founder preview to loopback.
4. **Live authorization proposal.** The proposed ≤11 calls / USD 0.006–0.01
   does not match the implementation. `retry.ts` allows three attempts per
   question (30 observation calls); `report-pipeline.ts` may send a language
   repair call after initial synthesis. `telemetry.ts` accounts USD 0.01 per
   web search, so ten single-search observations alone account for USD 0.10
   before tokens. This is a code-accounting observation, not a newly verified
   provider price. Document realistic expected and maximum calls/cost separately,
   current pricing evidence, carryover, existing retry/stop rules and any other
   sources/calls before requesting authorization. No provider call was made.

AC-04 remains passed. AC-05/06 have partial offline boundary evidence, not a
complete product-path pass. AC-02 retained UI evidence and AC-07/09 remain
incomplete; AC-08 remains unrun and unauthorized. These are existing spec
requirements, not a new question-quality gate or a redesign request.

## Orchestrator review of the correction return — 2026-09-18

**Verdict: substantial improvements, but not ready for live authorization.**
Review began 09:49:28 UTC, within a new bounded 15-minute review window.
The worker reports all four corrections complete and final `npm run verify`
passing. Its time table still says ~140/210 minutes, unchanged from before
the correction round. Do not treat that stale number as 70 fresh minutes.
The one permitted correction list has been used; no further implementation
round or budget extension is authorized by this review.

### Independently confirmed improvements

- Started the preview on `127.0.0.1:3031` in the implementation worktree,
  with provider credentials blanked. There was no running listener when the
  review began. This preview is explicitly synthetic and does not enable a live run.
- Browser: ten accepted texts loaded into `LocalQuestionsScreen`; an edit was
  saved, survived reload, and disabled running; reset restored the exact accepted
  wording and approval. Clicking the demo button rendered the report with zero
  provider calls. The earlier browser failure is resolved. The review's temporary
  wording change was reset; frozen acceptance files remain untouched.
- `input.confirmed` is now read from the hash-bound retained pack instead of a
  hardcoded business brief. Live run/report routes both use the non-production
  local flag before provider work. JSON retains direct-ten method and generation
  provenance; report detail copy is Indonesian. Preserve these improvements.
- Ran four offline suites (`direct-ten-audit`, `run-route-client-contract`,
  `contracts`, `report-pipeline`) with keys blanked: **81/81 passed**. The worker's
  reported final full gate is **1,204 unit tests / 97 browser tests / both builds**;
  this review did not independently repeat the full gate or locate its saved log.
  The new route test covers the run route with the flag absent; production and
  report-route rejection are supported by code inspection, not that one test.
- Opened the actual JSON and all 11 PDF pages, including a rendered contact
  sheet. Both include the synthetic report, all ten questions and Indonesian
  details. PDF text is readable. Artifact paths:
  `/tmp/nuave-blockb-artifacts/nuave-local-audit-evidence.json` and
  `/tmp/nuave-blockb-artifacts/nuave-local-audit-report.pdf`.
  Read-only PDF renders are in `/tmp/nuave-blockb-review/`.

### Remaining failures within the original correction scope

**Same-pack live product path:** `local-report.client.tsx` still calls only
`/api/audit/local-audit`; that route and `runLocalDirectTenAudit` explicitly
cannot call a live provider. No call to `/api/audit/run` or `/api/audit/report`
exists on this page. The ordinary `AuditWorkflow` still lacks direct-ten method
state. `IntakeJourney.tsx` still links every direct-ten handoff to the fixed
retained-pack page; it does not transmit that handoff's pack. The improved
review/demo therefore cannot be turned into the required founder live run by
granting permission alone. This is the original connection requirement, not a
request for another review surface or regenerated questions.

**Recommendation denominator:** the previous appearance-only filter is fixed,
but `recommendationAssessed` still removes completed answers with
`not_assessed`. The new report instructions permit that value for completed
answers without a supported dimension, so the nine manually assigned
`not_recommended` values in the worker's regression do not cover this case.
Independent controlled synthetic counterexample through
`normalizeReportEvidence` → `validateReportContent` → `buildAuditReport`:
ten completed usable answers, one explicit target endorsement, nine answers
about alternatives with `not_assessed` judgments. Result: appearance **1/10**,
recommendation **1/1**, **zero report-content validation errors**. This is an
offline report-layer test, not a real business result or a full provider run.
Result retained at `/tmp/nuave-blockb-review/denominator-counterexample.json`.
R-07 still requires the headline explicit-recommendation count across all ten
evaluable answers; uncertainty can be disclosed separately without shrinking
that denominator. Do not count failed answers as absence or invent endorsements.

**PDF scope:** pages 1–2 print the editable review screen, including “Ubah”
controls; page 3 begins with the rerun button before the report. The PDF exists
and is legible, but it is a printout of the combined review/demo page. The
download needs the report and relevant disclosure, with review/run controls
excluded. This is the existing actual-download requirement, not a redesign.

**Live proposal:** the revised USD 0.20–0.30 is an estimate from existing code,
not a verified current supplier price. Several purported hard limits are false:

- A roughly USD 0.3842 reservation is headroom for the next call, not a cumulative
  charge per successful call; it does not cap the run at roughly 13 attempts.
- `max_tool_calls: 1` is advisory; `telemetry.ts` explicitly records a previous
  response with two search calls. “Maximum 30 searches” is unsupported.
- The installed OpenAI SDK defaults to two transport retries and a ten-minute
  timeout (`node_modules/openai/src/client.ts:477,487`). Neither live client
  overrides them. The proposal says no client retries and omits this timeout;
  30 logical observation invocations is not a 30 HTTP-attempt guarantee.
- Report pipeline code performs at most one language repair after synthesis
  per invocation; the stage ledger ceiling of three is not proof of two repair
  attempts. State both actual invocation behavior and the stage ceiling.
- The run route folds client-supplied budget/resume telemetry; it does not
  reconstruct a trusted cumulative ledger. The report route receives its budget
  from the caller. The proposal acknowledges this gap then contradicts it.
  The actual connected local path must carry spend forward, and the proposal
  must distinguish its accounted budget guard from a guaranteed provider bill.

These are unresolved portions of the original four-item correction list.
Local-only route enforcement is fixed. AC-02 has independent edit/reload/reset
evidence; AC-05/06 retain boundary evidence but the live product connection is
incomplete. AC-07 remains incomplete for counts/download; AC-09 has the worker's
final gate report and inspected local guards, not a declaration of branch
readiness. AC-08 is still unrun and unauthorized. No new provider call, source
edit, commit, push, merge or deployment was made by the orchestrator.

### Proposed continuation — not released

Historical proposal; **subsequently approved** in the following section.

Recommend one **90-active-minute completion extension**, including final
verification (approximately 60 implementation + 30 checks). This is an
orchestrator planning estimate, not a worker commitment. Scope is only the
remaining original requirements: connect the accepted-pack local UI to the
existing live boundaries behind explicit authorization, make the direct-ten
recommendation denominator stable across ten evaluable answers, print only the
report, and prepare a code-accurate live scope with transport retries/timeouts
and spend carried across run/report. Reuse the finished review and backend;
no regenerated questions, new architecture, taxonomy or general polish.

The return must include final `npm run verify`, one browser demonstration with
offline provider substitutes at the actual live boundaries, inspected PDF/JSON,
correct cumulative time accounting and a concrete live proposal. Stop at the
new deadline with exact remaining failure if unfinished. No provider calls or
repository publication are part of this proposed extension. Release a worker
continuation only after the founder explicitly approves the extension; the
single correction round and 210-minute cap cannot be silently reset.

## Founder approval — focused 90-minute completion extension

The founder approved the proposal above on 2026-09-18:

> Yes of course, allowed. But be focus and fast, do not go chasing other goal or issues other than what already determined. Store issues found along the way (if any) in an .md note that we can revisit later.

The same worker now has **90 additional active minutes including final
verification** for the four named unfinished requirements, approximately
60 implementation and 30 checks. Start its extension clock when work resumes;
record it separately from prior Block B time. No restart of Block A, replacement
of the accepted questions, new goals or open-ended correction loop.

The ready handoff is in `docs/checkpoints/2026-09-17-winning-prompt-glm/NEXT_STEP.md`,
under “Worker continuation — approved 90-minute completion extension”. Founder
relays it; no agent is dispatched. After final edits, run `npm run verify`,
demonstrate the agreed browser path offline and inspect the actual report/PDF/JSON.
Return at the deadline with exact completed/remaining work and elapsed time.

Unrelated issues are recorded briefly in
[`DEFERRED_NOTES.md`](./DEFERRED_NOTES.md). Do not investigate or repair them
within this extension or make them new review gates. A problem that actually
prevents one of the four deliverables belongs to that existing item; explain
the direct dependency and handle it within the same clock. Review remains
limited to these deliverables and proportionate existing regression checks.

No new provider calls, commit, push, merge, deployment or production activation
are authorized. This approval removes the time-box blocker only; Block B is
not complete until its actual result is verified.

## Orchestrator extension closeout — 2026-09-18

**The four agreed offline deliverables are accepted.** Review began 11:02:52
UTC and stayed within the 15-minute review window. Worker reports ~70 of the
approved 90 extension minutes, separately from previous time. The review was
limited to the agreed scope; no additional implementation round is needed.

| Agreed item                            | Independent evidence and disposition                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser → actual run/report boundaries | Started loopback preview with live authorization off and provider keys blanked. In the browser, the accepted pack loaded and one explicit run returned `POST /api/audit/run` 200 then `POST /api/audit/report` 200. The report rendered and declared zero real provider calls. Route source selects live providers only with the local/non-production and separate audit-authorization flags; no paid call was made. Accepted offline.                     |
| Ten-answer recommendation denominator  | New exact regression (one endorsement, nine `not_assessed`, ten completed) passes as 1/10. Failed-answer and historical-contract tests also pass. Actual exported synthetic run is 0/10. Accepted.                                                                                                                                                                                                                                                         |
| Report-only PDF                        | Opened all nine pages through text extraction and rendered contact sheet. Question editor, “Ubah” and run controls are absent; all ten question details and synthetic disclosure remain. Text is legible. JSON contains ten prompts/observations, direct-ten provenance, `live_authorized: false`, `provider_calls: 0`. Accepted for the agreed scope.                                                                                                     |
| Accurate live proposal                 | Browser now forwards run telemetry into the report budget. Worker documented SDK retries, timeout, advisory search hint and client-ledger limitations. Two statements remained false: report pipeline has one repair, not two; unseen provider charges are not bounded by an application ledger that cannot see them. The orchestrator corrects these statements in the proposal below. No coding round is required to state existing behavior accurately. |

Independent focused verification: **86/86 tests across five files**:
`direct-ten-route`, `direct-ten-audit`, `run-route-client-contract`, `contracts`,
and `report-pipeline`. `git diff --check` passes. Worker reports final
`npm run verify` **PASS: 1,209 unit tests / 93 files, 97 browser tests, typecheck,
lint, formatting, typography, both builds** after final source edits. That full
run was not independently repeated; do not conflate the two evidence sets.

Inspected artifacts:

- `/tmp/nuave-blockb-artifacts/nuave-local-audit-report.pdf` — 9 pages, 260,119 bytes.
- `/tmp/nuave-blockb-artifacts/nuave-local-audit-evidence.json`.
- Review-only PDF renders: `/tmp/nuave-blockb-extension-review/`.

The worker's unrelated empty-comparator schema observation was copied to the
canonical deferred note with the factual clarification that the current pack
uses category-alternatives wording, not a named competitor. No deferred issue
was investigated or fixed. Application code and frozen acceptance evidence
were untouched by the orchestrator; only review/status/handoff/deferred docs
were updated. No commit, push, merge or deployment occurred.

The offline acceptance does not establish real business visibility or report
usefulness. AC-08 remains unrun; the founder must judge the actual report after
the separately authorized run. Spec 009 remains Approved, not Verified.

### Live authorization proposal — corrected by the orchestrator

**Authorized and consumed on 2026-09-18; retained as the approved scope.** One local run of the ten already accepted,
unchanged retained-business questions, followed by one report workflow and
its PDF/JSON.
The accepted method/file/text/input bindings recorded above remain the inputs.
No question regeneration, extraction, variance, customer delivery, second run,
publication or production activation is included.

Use the existing OpenCode Go Responses endpoint and `gpt-5.6-luna`, reasoning
`low`. Each observation sends its exact question independently with required
web search; the business context is used only for matching/report synthesis.
Normal workload: **10 observation invocations + 1 report invocation**.

The following limits describe the existing implementation, not new promises:

- Observation policy: up to three logical attempts per question, at most **30**
  observation invocations, subject to early failure/budget stops. Only existing
  automatic technical retries are included; no manual rerun is authorized.
- The report workflow sends initial synthesis and may send **one** language
  repair: **at most two report invocations** for this one workflow. The generic
  report-stage ledger ceiling of three does not cause a third invocation here.
- Each installed SDK client may retry transport twice; each transport attempt
  has a 600-second timeout. Thus the outer envelope for this one run is up to
  **96 HTTP attempts** (30 × 3 + 2 × 3), usually far fewer. These are request
  attempts, not 96 expected answers or a claim about how many are billed.
- Existing retry backoff is at most 20 seconds. A non-retryable failure ends
  that question's retries. An incomplete ten-answer run must not produce a
  delivered report; return the actual failure and retain evidence. Do not
  automatically start another run to obtain a complete result.
- Requested one-search-per-observation is advisory. Count actual returned
  searches. No guaranteed 30-search ceiling is claimed.

**Cost:** allow the existing **USD 5 accounted-usage limit**, including prior
carryover. The currently recorded audit carryover is USD 0.4357 (USD 4.5643
remaining accounted headroom before this run); preserve the configured floor
and reconcile any newer recorded usage before enabling live execution. The
client passes observation telemetry to synthesis, so that normal connected
flow carries its spend forward. It does not reset the ledger between stages.

Expected accounted usage for an uncomplicated run is approximately
**USD 0.20–0.30**, including the code's USD 0.01 per recorded search. This is an
estimate, not a bill or upper bound. The official [OpenCode Go pricing page](https://opencode.ai/docs/go/)
checked 2026-09-18 confirms Luna input/output rates of USD 0.20/1.20 per million
tokens up to 272k input, and USD 0.40/1.80 above that. Go uses subscription usage
allowances; account billing/overage settings were not inspected. The page does
not independently confirm this application's search-fee assumption.

**Important accounting limitation:** the USD 5 check limits accounted usage
plus estimated headroom for the next call. It cannot guarantee a hard maximum
provider bill: processed requests with lost responses may be charged without
usage in this ledger; additional searches can exceed reserved headroom; the
ledger is client-supplied. Transport retries may also incur provider usage.
Do not repeat the worker's claim that retries cannot multiply billing or that
the ledger bounds charges it never receives. These existing limitations are
disclosed for the founder-operated run, not repaired through a new system.

After authorization only: prepare the existing credential without exposing its
value, pin the named provider/model/carryover, enable audit-live permission on
the loopback server, reload to show live mode, and run the accepted pack once
through the product page. Preserve responses/usage in restricted evidence,
download the report and JSON, and turn live permission off after completion or
failure. Stop on missing/mismatched bindings, missing credentials, provider
failure or budget refusal; do not switch model/provider or silently substitute
synthetic answers. Report actual observed usage and limitations to the founder.

This proposal is ready for the founder's explicit live-run decision. The
previous 90-minute approval covered implementation/offline verification only.

## Authorized live execution — 2026-09-18

The founder replied **“authorized”** to the corrected proposal above. The
orchestrator ran the unchanged accepted pack through the browser's actual
`/api/audit/run` and `/api/audit/report` boundaries, using OpenCode Go Responses,
`gpt-5.6-luna`, reasoning `low`. Credentials remained process-local and were
never included in captured request headers, outputs or Git. Application source
was not changed; no worker was dispatched.

**Execution:** 11:47:48–11:50:14 UTC (18:47:48–18:50:14 WIB). Ten observations,
one report; **11 captured HTTP requests, all 200/completed, zero logical or
transport retries**, no language-repair provider call. There were **12 returned
web-search calls**, confirming that the requested one-search limit is advisory.
All ten request questions match the accepted ordered texts verbatim, each has
only the neutral developer instruction plus its independent user question,
and each returned answer matches the customer evidence export. Both product
routes returned HTTP 200; the browser rendered the real-run disclosure and 11
provider calls. The report performed deterministic excerpt normalization
(`excerpt_repaired`), which is not another provider request.

**Accounted usage:** 158,799 input / 14,799 output tokens; new usage
**USD 0.16450316**, prior carryover USD 0.4357, resulting ledger
**USD 0.60020316**. This uses existing code pricing, including its assumed
search charge; it is not confirmed provider billing. Preserve this newer total
when preparing any future separately authorized run. The existing USD 5 ledger
was not reset. No generation, extraction, variance or second audit was sent.

**Pre-provider interruption:** the orchestrator's temporary evidence helper
initially listened to the incoming request body and disturbed Next's body
adapter. That dispatch returned local HTTP 500 before provider execution:
zero outgoing provider requests. Only that incoming-body listener was removed
from the private helper. An empty-body boundary check then returned the
expected HTTP 409 without contacting the provider. The original consumed
marker and failure record were preserved; the still-unexecuted authorized
provider audit was then started once. These local diagnostics are not hidden
provider retries or additional completed audits.

**Restricted artifacts:** the dated `.secrets/` live-run evidence directory,
gitignored, directory 0700 / files 0600 (its name is withheld from the public
repository). Includes authorization/bindings, consumed marker,
unchanged accepted inputs, all raw requests/responses (no credentials), route
responses, `RUN_RESULT.json`, the live evidence JSON export,
`RECORDED_ANSWERS.md`, the labeled PDF review copy, and `REVIEW.md`. Business
findings
remain private; they are not copied into this public repository's documents.

**Export limitation:** in-app browser JSON download yielded no download event
or resulting file, and its print action yielded no PDF. Native Codex control
is unavailable. The exact existing `makeCustomerEvidenceExport` was therefore
called offline with the captured completed inputs; no provider request was
replayed. The PDF is explicitly labeled as a separate founder-review layout
of the same report. It is not claimed to be the actual live product print
output. The earlier synthetic product PDF check remains separate evidence. The eight-page review PDF was rendered and visually checked; all ten complete question texts are present and editor/run controls are absent.

The server listening on 127.0.0.1:3031 was stopped after completion; a listener
check confirmed it is off. The completed browser page was retained. **The
one-run authorization is consumed.** No commit, push, merge, deployment,
customer delivery or publication occurred. The report and evidence are now
available for founder review. Short unhelpful excerpts and classification/
recommendation concerns were recorded without implementation. AC-08 and Spec
009 Verified status are not granted by successful transport or artifact creation.

## Founder verdict and continuation — 2026-09-19

> The report isnt that useful now. I can improve the format later. But now what we need to rush to complete is the end-to-end audit experience, despite the report is not match our standard yet.

Report usefulness: **not yet sufficient**. Format/usefulness corrections are
deferred, not another blocker or report-repair round. The approved Spec 009
amendment now prioritizes the ordinary new-business journey through the same
session's questions, audit, current report and working downloads. Source review
confirmed the present intake ends at `createLocalStartHandoff` and links to a
separate retained-pack page; its reading phase still uses local fixture
preparation. These are functional gaps, not a request for a report redesign.

A concrete worker continuation is ready in the existing NEXT_STEP file. The
founder still relays it; no application edits, dispatch, provider calls or
publication occurred while recording this decision. The dated milestone remains
unchanged. Acceptance of functional completion is separate from the deferred
quality verdict. AC-10 remains to be implemented and verified.

Documentation changed for this priority amendment: `README.md`; `docs/NOW.md`,
`docs/DECISION_LOG.md`, `docs/INDEX.md`, `docs/END_TO_END_PLAN.md`,
`docs/JOURNEY_CONTRACT.md`; the existing checkpoint `NEXT_STEP.md`;
`specs/003-live-report-quality-gate/SPEC.md`; and this package's `SPEC.md`,
`VERIFICATION.md`, `DEFERRED_NOTES.md`. The dated checkpoint was preserved.
Validation: relative links for the new amendment/handoff resolve and
`git diff --check` passes. No application change, provider call or test-suite
rerun was needed for this documentation/handoff-only action.
