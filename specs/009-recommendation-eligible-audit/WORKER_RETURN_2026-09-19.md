# Spec 009 — correction return: recovery, preparation mode, retry ledger, artifacts (worker → orchestrator)

Status: **the consolidated four-item correction is implemented; offline
verification complete.** `npm run verify` passed on this branch after the
final source edits. Nothing was committed, pushed, merged, deployed, or
sent to a provider. No live audit/report/preparation call was made or
authorized — every result below comes from the labeled
synthetic-substitute path at the real boundaries and the real browser
flow. The continuous-flow wiring from the earlier return is retained,
not restarted.

## Time and location

| Field            | Value                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| Active time used | ~75 minutes (approximate)                                                              |
| Branch           | `codex/spec-009-block-a-direct-ten` (uncommitted — founder has not requested a commit) |
| Base             | `origin/main` `687f340343aa5be547d03e7d6fe23a9f5262a2df`                               |
| Worktree         | `/Users/yasir/nuave-worktrees/spec009-block-a`                                         |

## The four corrections

### 1 — Completed reports and captured answers survive Back / re-entry / reload

Root cause (from the review's reproduction): re-entry set `autoStart:
true`, `execute()` rebuilt the base record — clearing the finished report
— and the resumed synthetic observations hit the **production**
observation-method gate → HTTP 422, leaving a corrupted `interrupted`
record.

Fixed at both doors:

- **Journey** (`IntakeJourney.next()`): approving questions when a bound
  audit record already exists (Back then forward, or a restored session)
  transitions with `autoStart: false` — the stage reopens captured state:
  a done report renders, an interrupted run offers resume, nothing is
  replayed. Hydration restore applies the same rule.
- **Stage** (`LocalAuditStage.execute()`): hard done-guard — a `done`
  record can never be re-executed, so its report is never cleared.
- **Resume evidence gates**: `/api/audit/run` and `runAuditObservations`
  now dispatch on execution mode — the founder-local substitute path
  validates resumed observations with the new
  `syntheticLocalObservationMethodErrors` (requires the
  `synthetic-local-fixture` label on system/requested/returned model);
  live and canonical keep `productionObservationMethodErrors` unchanged.
  Unlabeled or real-provider claims fail closed (422) under the
  substitute too — the substitute door can never absorb evidence that
  pretends to be something else.
- Stale records stay rejected: the record binds the frozen-intake
  fingerprint **and** the exact ordered question wording
  (`localAuditQuestionsKey`).

e2e proof: Back→re-approval after `done` issues **zero** run/report
requests (counts stay 1/1); a run truncated after three captured
observations reloads to `interrupted`, resumes those three through the
real boundary (resume body verified: 3 labeled observations, not
re-executed), and finishes `done` (run=2, report=1). Route tests: labeled
synthetic resume accepted in substitute mode; foreign-system resume 422;
flag-off 404 even with a resume payload — zero provider work.

### 2 — Server-controlled preparation mode (offline default)

`prepareEnteredBusinessFixture` no longer pins the substitute
client-side. It sends `local_mode: "auto"` to **both** boundaries and the
**server** selects the mode:

- `local_mode` absent → the historical behavior is untouched.
- `local_mode` present → only inside `NUAVE_GLM_LOCAL_EXPERIMENT`
  (non-production); any other value, or the flag off, 404s **before** any
  fetch, credential read, or provider call.
- `auto` → labeled substitute unless `NUAVE_AUDIT_LIVE_AUTHORIZED` is
  also set — the default is safely offline with **zero** credential
  reads. `synthetic` → pins the substitute even when live is authorized.
- Live selected → the same protected boundary as the normal path:
  credentials asserted before the call; authorized-without-keys **stops**
  honestly, never silently falls back to the substitute.
- Every response carries `preparation_mode: "synthetic-local" | "live"`
  — explicit provenance, surfaced into the audit record and the JSON
  evidence export (`provenance.preparation_mode`).
- Extract telemetry (labeled-zero in the substitute, real usage in live)
  is captured into `LocalSession.preparationCalls`, seeded into the audit
  record, and folded into every subsequent run/report `budget.calls` —
  preparation spend rides the session ledger.

Route-dispatch tests (`local-preparation-routes.test.ts`, 9/9, providers
mocked): offline default makes zero credential reads and zero provider
calls; authorized `auto` makes exactly one live extract call with
credentials asserted; `synthetic` pins the substitute even when
authorized; authorized-without-keys stops; unknown mode and flag-off
404 before any work. **No paid/live call was made** — the live branch is
proven with mocks only.

### 3 — Report retry accounting and duplicate prevention

- `callReport` sends `budget.calls = reportRequestCalls(working)` —
  preparation + observation + **prior report** telemetry, deduplicated by
  `response_id` — so recorded spend is forwarded on every retry instead
  of dropping earlier `reportCalls`.
- `reportCallAttempts` is the bounded counter (persisted in the record,
  incremented before each POST); a failure that returns **no telemetry**
  still consumes the allowance via `reportAttemptsUsed()` =
  `max(attempts, reportCalls.length)`. `classifyReportRecovery` reads
  that counter — the existing `can_retry` policy and its ceiling are
  unchanged.
- The direct retry action runs a synchronous pre-submit guard
  (`reportRetryAllowed`) and raises the in-flight ref **before** the
  fetch leaves — repeated activations cannot overlap; the button also
  unmounts while `busy`. e2e proof: two same-tick activations produce
  exactly one retry POST; the retry body carries the ten-observation
  ledger; a telemetry-less 500 consumed its bounded attempt.
- Run-resume `runCalls` merges the prior ledger with resumed-observation
  telemetry, so failed-attempt usage is never dropped either.
- The client ledger is an accounting aid, not a supplier billing cap —
  the enforced stops remain the server-side USD 5 reservation cap and
  stage ceilings (see the corrected proposal).

### 4 — Real entered-business PDF + JSON, saved and opened

The **entered-business** e2e (Batik Laras through the real
identity/extraction boundary substitutes → buyer facts → direct-ten
questions → edit → approval → audit → report) now produces both artifacts
through the normal product controls in the same session:

- **JSON** — downloaded via the product button and saved to
  `test-results/…/entered-business-evidence.json` (19 KB). Asserted
  in-test: 10 prompts/observations, `brief.brand_name: "Batik Laras"`,
  `provenance.question_method: "direct-ten"`, `synthetic: true`,
  `provider_calls: 0`, **`preparation_mode: "synthetic-local"`** (new
  provenance), `pack_method: "nuave-glm-direct-ten-v1"`, and
  `prompts[0].question` equal to the founder-edited wording.
- **PDF** — the product "Cetak / simpan PDF" control fires the print
  path (counter = 1) and the live report page is captured via Chromium
  `page.pdf()` to `test-results/…/entered-business-report.pdf`
  (260 KB). Decoded per-font text (throwaway extractor, never committed)
  confirms: all ten `NUAVE-DT-01..10` detail blocks, the exact edited
  question text ("Rekomendasi penjahit batik tulis untuk seragam kantor
  di seluruh Indonesia apa ya?"), "Batik Laras" throughout (no other
  business's name), `0/10` recommendation measure, "10 dari 10
  pertanyaan berhasil diuji", `[SINTETIS]` answer labels, and Indonesian
  findings/evidence copy ("Tidak disebut", "Hasil tiap pertanyaan").
  The retained screenshot shows the normal layout — header, summary
  cards, findings, recommendations, per-question details, both download
  controls.

Private inspected copies (not committed):

```
/tmp/nuave-spec009-artifacts/entered-business-evidence.json
/tmp/nuave-spec009-artifacts/entered-business-report.pdf
/tmp/nuave-spec009-artifacts/report-text.txt        (decoded PDF text)
/tmp/nuave-spec009-artifacts/entered-report.png
```

## Also corrected in this round

- **Loopback binding done deliberately**: `journeyWebServer` now runs
  `npm run dev -- --port <p> --hostname 127.0.0.1` — `next dev`'s default
  hostname is `0.0.0.0` (LAN-reachable), so the founder-local preview now
  listens on the IPv4 loopback interface itself. `baseURL` in all three
  Playwright configs, the readiness URL, the access-cookie domain, and
  the pinned `spec008-review-port.test.ts` contract were updated
  together; the deferred note's conflict is resolved by deliberately
  updating that pin.
- **Founder-local guards confirmed unchanged**: `/api/audit/run` and
  `/api/audit/report` 404 `question_method: "direct-ten"` unless the
  experiment flag is set on a non-production server — before schema,
  credentials, or provider work (route tests assert zero provider calls
  in disabled/production cases). Canonical unaffected.
- **Direct-ten appearance/recommendation semantics**: already covered —
  the mixed-answer regression (explicit endorsement / mention-only /
  absence / failed → `{assessed: 9, recommended: 1}`) and the
  denominator counterexample (10 completed, 9 `not_assessed` →
  `{recommended: 1, assessed: 10}`) remain green; the ten-evaluable
  delivery gate and historical denominators are untouched.

## Files changed in this round

- `src/lib/intake/IntakeJourney.tsx` — bound-record check on approval and
  hydration (`autoStart` only on a fresh approval); `local_mode: "auto"`
  preparation calls returning fixture + telemetry + provenance;
  preparation ledger persisted per session; `AuditStage` props.
- `src/app/audit/LocalAuditStage.tsx` — `preparationCalls` /
  `preparationMode` props seeded into the record; done-guard in
  `execute()`; run/report budgets carry the full session ledger; resume
  merges prior run telemetry; report attempts bounded by
  `reportAttemptsUsed`; synchronous in-flight retry guard; provenance in
  the evidence export.
- `src/lib/intake/local-audit-session.ts` — `preparationCalls`,
  `preparationMode`, `reportCallAttempts` record fields (+schema);
  `dedupeCalls`, `reportRequestCalls`, `reportAttemptsUsed`,
  `reportRetryAllowed` helpers. `.test.ts` — binding + retry-helper
  coverage (15 tests).
- `src/lib/intake/local-session.ts` — optional `preparationCalls` /
  `preparationMode` (+schema).
- `src/lib/audit/production-observation-method.ts` —
  `syntheticLocalObservationMethodErrors` substitute gate.
- `src/lib/audit/run-orchestrator.ts` — `resume.allowSynthetic` dispatch.
- `src/app/api/audit/run/route.ts` — mode-matched resume validation +
  `allowSynthetic` threading.
- `src/app/api/audit/identity/route.ts` + `extract/route.ts` —
  `local_mode` server-side selection + `preparation_mode` provenance.
- `src/lib/audit/direct-ten-route.test.ts` — +3 resume-gate tests.
- `src/lib/audit/local-preparation-routes.test.ts` (new) — 9 mocked-
  provider dispatch tests.
- `tests/e2e/new-intake-glm.spec.ts` — return-and-continue, partial-
  capture resume, retry ledger + double activation, entered-business
  artifacts (7/7).
- `tests/e2e/shared-config.ts`, `tests/e2e/helpers.ts`,
  `playwright.config{,.failure,.disabled}.ts`,
  `tests/spec008-review-port.test.ts` — deliberate `127.0.0.1` bind.

## Runnable URL and browser behavior

```
cd /Users/yasir/nuave-worktrees/spec009-block-a
NUAVE_GLM_LOCAL_EXPERIMENT=1 npm run dev -- --port 3031 --hostname 127.0.0.1
```

- Entered-business flow: `http://127.0.0.1:3031/audit/new-intake?glm=1`
  → enter a name + source → labeled-substitute preparation → buyer
  confirms facts → ten questions → edit → approve → audit → report.
- Fixture flow: `http://127.0.0.1:3031/audit/new-intake?fixture=GLM&glm=1`.
- Browser behavior verified by the e2e suite: reload and Back→forward on
  a finished report reopen it with **zero** boundary requests; a
  partially captured run resumes through the boundary; a failed report
  retries in-session without replaying the run; every request count is
  asserted (`trackRequests`).

## Corrected live-call proposal (awaiting explicit authorization)

Tied to the **actual fresh-session path** now implemented. Expected use
and enforced limits are stated separately; estimates are not hard upper
bounds — the enforced stops are the server-side caps.

**What one authorization would do:** the founder sets
`NUAVE_AUDIT_LIVE_AUTHORIZED=1` on the same local server and repeats the
journey — `local_mode: "auto"` then selects the real source fetch +
`liveExtractBusinessDraft` for preparation, `liveExecuteAuditPrompt` per
question, and `liveGenerateReportContent` for the report, all through the
identical boundaries. Question generation itself stays on the synthetic
stub unless `NUAVE_GLM_LIVE_AUTHORIZED` is also granted (a separate,
already-consumed gate — not part of this proposal).

**Logical calls (expected vs enforced ceiling):**

| Stage                | Expected | Enforced ceiling                          | Basis                                                 |
| -------------------- | -------- | ----------------------------------------- | ----------------------------------------------------- |
| Identity fetch       | 1        | rate-limited, not a provider call         | `fetchSourceIdentity` — HTTP fetch, no cost           |
| Extraction           | 1        | 2 (`AUDIT_STAGE_CALL_LIMITS.extract`)     | `liveExtractBusinessDraft`                            |
| Prompt generation    | 0        | 0 (`prompts` stage limit)                 | retained pack — not part of this send                 |
| Observations         | 10       | 30 (10 × `MAX_ATTEMPTS_PER_QUESTION` = 3) | `liveExecuteAuditPrompt`; `non_retryable` stops early |
| Report               | 1        | 3                                         | `liveGenerateReportContent` + ≤2 synthesis retries    |
| **Total (expected)** | **12**   | **35 provider calls + 1 source fetch**    |                                                       |

**SDK transport retries (distinct):** no `maxRetries`/`timeout` override —
the installed SDK defaults apply (up to 2 transport retries per logical
call, 600 s per-attempt timeout). Transport retries multiply HTTP
requests, not billing — cost is accounted only from received
`provider_usage`.

**Search usage (advisory, not a cap):** each observation request sends
`max_tool_calls: 1` — a requested hint, not a guarantee (a prior live
attempt recorded 2 searches under cap 1). Billing uses actual
`web_search_call` count × USD 0.01. Expected ≈10 searches (~$0.10).

**Cost basis (`cost_basis: "provider_usage"`)**: real token usage at
Luna rates + actual search fees (input $0.20/M, output $1.20/M; input

> 272k: $0.40/$1.80 — observed 2026-08-01).

- Extraction (expected): ~2–4k input + bounded output ≈ **$0.01–0.03**.
- Per observation (expected): ~2–5k input + ≤3,000 output + ~1 search ≈
  **$0.015–0.02** → 10 ≈ $0.15–0.20.
- Per report (expected): request bytes + ≤16,000 output ≈ **$0.03–0.05**.
- **Expected session total: ≈ USD 0.20–0.30** (estimate, not a bound —
  the USD 5 cap below is the enforced bound).

**Cumulative carryover:** `budget.carryover_cost_usd` plus the
`OPENAI_AUDIT_CARRYOVER_COST_USD` floor counts before this session's
calls; the client folds every known stage's telemetry (preparation +
observation + prior report attempts, deduplicated) into each next
request's `budget.calls`, so recorded spend follows retries. Documented
limit (unchanged): `budget.calls` is client-supplied — a fresh or hostile
request could under-claim; the cap is enforced against claimed+reserved
spend per request, not a server-owned session ledger. Acceptable in
founder-local scope.

**Enforced stops (not estimates):** `reserveAuditCall` aborts when
accounted + reserved > **USD 5** (`AUDIT_COST_LIMIT_USD`, 402);
stage ceilings abort at 30 observation / 3 report / 2 extract logical
calls; `non_retryable` verdicts stop a question immediately; backoff ≤
20 s between retries; the abort signal cancels at every attempt check;
`assertLiveProviderCredentialsConfigured` stops before any call when
keys are missing — never falls back to the substitute.

**Excluded:** question generation (separate consumed gate), variance,
customer delivery, any second run, any spend beyond one preparation +
one direct-ten run + one report. **No live call occurs until the founder
explicitly authorizes this scope.**

## Deferred / not passed

- **AC-08 usefulness remains unpassed** — report format/usefulness is
  still explicitly deferred by the founder.
- The synthetic report is plumbing proof only — `recommended: 0,
assessed: 10` honest counters, `[SINTETIS]` labels, no visibility claim.
- The client-side session ledger aids accounting honestly; it is not a
  supplier billing cap (the enforced caps are server-side, above).

---

Status: **amendment implemented; offline verification complete.** `npm run
verify` passed on this branch after the final source edits. Nothing was
committed, pushed, merged, deployed, or sent to a provider. Every result
below comes from the labeled synthetic-substitute path at the real
boundaries and the real browser flow — no live call was made or
authorized.

## Time and location

| Field    | Value                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| Branch   | `codex/spec-009-block-a-direct-ten` (uncommitted — founder has not requested a commit) |
| Base     | `origin/main` `687f340343aa5be547d03e7d6fe23a9f5262a2df`                               |
| Worktree | `/Users/yasir/nuave-worktrees/spec009-block-a`                                         |

## What the amendment required and what now happens

The amendment removes the fresh-session detour through the retained-pack
handoff. The old ordinary flow ended at `LocalStartHandoff` and
sent users to `/audit/local-report`, which loaded a separately stored
accepted pack — another business's facts. The fresh-session path is now
one continuous journey:

```
entered name + source
  → GET  /api/audit/identity?source=…&local_mode=auto   (server selects:
         labeled substitute by default; real fetch only under live auth)
  → POST /api/audit/extract  { local_mode: "auto" }     (same server-side
         selection; preparation_mode is the explicit provenance)
  → buyer reviews/confirms every fact screen (substitute draft invents
    nothing; source-derived / unknown / buyer-supplied stay distinct)
  → POST /api/audit/glm-questions  (method "direct-ten", synthetic stub)
  → flat review: free edit, diubah markers, explicit approval click
  → approval IS the audit start: LocalAuditStage inside the same journey
  → POST /api/audit/run     (question_method "direct-ten", exact wording)
  → POST /api/audit/report  (locked prompts + 10 observations + budget)
  → ReportView + evidence JSON download + window.print() PDF
```

`/audit/local-report` still exists as retained regression evidence for
the retained pack; a fresh session never navigates there and never sees
the retained business's facts. The entered business is the brief subject
end to end — the JSON export carries `evidence.brief.brand_name` equal to
the entered name (proven for "Batik Laras").

## New pieces

- `src/lib/intake/preparation.ts` — `prepareBoundaryIdentity()`: builds
  the entered-business fixture from the real identity/extraction boundary
  results. The entered name is authoritative; prepared candidates come
  only from the draft's evidenced lists — the substitute draft carries
  none, so each context screen asks the buyer. A known fixture's rich
  example data is never presented as facts for an entered URL.
- `src/lib/intake/local-questions.ts` — `sessionConfirmedBrief()`:
  projects the session's `FrozenLocalIntake.confirmed` into a schema-valid
  `BusinessBrief`. Buyer-supplied facts land in `customer_supplied_facts`,
  explicit unknowns in `known_accuracy_questions`, `primarySource` is
  normalized through `parseSourceInput`, and the competitor name uses a
  non-empty category fallback (sidestepping the deferred-notes schema
  rejection `retainedConfirmedBrief` still has).
- `src/lib/intake/local-audit-session.ts` — `LocalAuditRecord` +
  sessionStorage helpers under `nuave.localIntakeAudit.v1`. The record is
  bound to the frozen-intake fingerprint **and** the exact ordered
  `NUAVE-DT-*` wording; a stale record for different facts or wording is
  discarded, never resumed. Statuses: `running | interrupted | unfinished
| report-failed | failed | done`.
- `src/app/audit/LocalAuditStage.tsx` — the audit stage, injected into
  `IntakeJourney` as a prop by `intake-screens.client.tsx` (the intake
  isolation guard still passes — `IntakeJourney` imports no audit UI).
  Reuses `AuditRunStep`, `AuditRunEventParser`, `mergeObservation`,
  `classifyReportRecovery`, `canonicalLockedDirectTenPack`, `ReportView`,
  `makeCustomerEvidenceExport`.
- `syntheticLocalIdentity` / `syntheticLocalExtraction` in
  `local-direct-ten-audit.ts`, selected **server-side** by `local_mode:
"auto" | "synthetic"` at the real identity/extract routes —
  flag-gated, fail-closed 404 without `NUAVE_GLM_LOCAL_EXPERIMENT`, and
  they invent nothing: identity carries `confidence: false`; extraction
  returns empty factual fields plus explicit warnings. "auto" defaults to
  the substitute and reaches the live fetch/extraction only under
  `NUAVE_AUDIT_LIVE_AUTHORIZED`; "synthetic" pins the substitute even
  when live is authorized. Every response carries `preparation_mode`
  provenance.
- `AuditRunStep` pack prop loosened to the structural subset the progress
  list needs (`{prompt_id, question}[]`) so the wire-thin direct-ten pack
  typechecks without fabricating pack metadata.

## Honesty and safety properties (verified in tests)

- Zero sends on mount, reload, or Back. Execution starts only from the
  explicit approval click (`autoStart`) or the "Mulai audit" button.
- Exact approved wording reaches `/api/audit/run` unchanged — the e2e
  downloads the evidence JSON and asserts `prompts[0].question` equals the
  founder-edited text; the server lock still enforces the `NUAVE-DT-01..10`
  id order.
- A transport/stream end once the run request is sent records
  `interrupted` (the server outcome is unknown — honest, resumable); only
  definitive server rejections (HTTP error, `fatal_error` event, short
  completed set) record `failed`. A persisted `running` record after
  reload displays as `interrupted`.
- `run_unfinished` shows the honest partial state; no report call is made
  before ten evaluable observations exist.
- Report failure surfaces the same-session "Coba buat laporan lagi" retry
  via `classifyReportRecovery` — the run is never replayed (e2e: run stays
  1 POST, report 2 POSTs). Integrity/limit failures offer no unsafe retry.
- Completed observations resume via `resume_observations`; nothing
  already paid is repurchased.
- Restart clears the audit record; a new journey never inherits the prior
  session's run.
- Synthetic stays labeled end to end — `AuditNotice` "Audit lokal —
  jawaban sintetis", `synthetic-local-fixture` system/model labels,
  `web_search_calls: 0`, `provider_calls: 0` in export provenance. The
  synthetic report conclusion now names `brief.brand_name` (fixed: it
  previously hardcoded a fixed business name).
- e2e environment hardening: `NUAVE_GLM_LIVE_AUTHORIZED=0`,
  `NUAVE_AUDIT_LIVE_AUTHORIZED=0`, provider API keys blanked; the spec's
  route guard aborts all non-boundary requests.

## Files added / changed (this block)

- `src/lib/intake/preparation.ts` — `prepareBoundaryIdentity()` + tests.
- `src/lib/intake/local-questions.ts` — `sessionConfirmedBrief()` + tests.
- `src/lib/intake/local-audit-session.ts` (new) + `.test.ts` (new) —
  record binding, stale rejection, malformed-payload discard.
- `src/app/audit/LocalAuditStage.tsx` (new) — continuous run/report/
  download stage.
- `src/lib/intake/IntakeJourney.tsx` — boundary reading phase under the
  GLM flag, audit-record restore on load (autoStart stays false),
  approval → `audit` transition for `glm-direct-ten-local` packs, Back →
  questions, audit chrome suppression, `AuditStage` prop injection, GLM
  failure inspection block.
- `src/app/audit/new-intake/intake-screens.client.tsx` + `page.tsx` —
  supplies `LocalAuditStage`, threads `?glm=1` / `?glm-stub=`.
- `src/app/api/audit/identity/route.ts` — `substitute=local` branch,
  flag-gated fail-closed.
- `src/app/api/audit/extract/route.ts` — `local_mode: "synthetic"`
  branch, flag-gated fail-closed.
- `src/lib/audit/local-direct-ten-audit.ts` — labeled substitutes;
  synthetic conclusion now uses `brief.brand_name`.
- `src/app/audit/AuditRunStep.tsx` — pack prop → structural `RunPack`.
- `tests/e2e/shared-config.ts` — live-authorization blanking +
  `NUAVE_GLM_LOCAL_EXPERIMENT` allow-listing.
- `tests/e2e/new-intake-glm.spec.ts` — 6 continuous-flow tests.
- `specs/009-recommendation-eligible-audit/DEFERRED_NOTES.md` —
  localhost-vs-127.0.0.1 binding observation.

## Verification results

| Check                                                        | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                                             | **PASS** — after the final source edits (typecheck, eslint, prettier, typography, **1,241 unit tests / 95 files**, production build, Cloudflare build, **96 + 3 + 3 Playwright**)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tests/e2e/new-intake-glm.spec.ts`                           | **7/7** — confirmed-fixture journey (10 questions → edit → approve → audit → report → JSON/PDF downloads → reload restores `done`, zero replays → Back to questions → **re-approval reopens the saved report, still zero replays**); entered business (identity+extract boundary calls, buyer-supplied facts, approved wording, report names "Batik Laras", export carries its brief + `preparation_mode`, report request carries the prep+observation ledger); interrupted run → `interrupted` + resume (run=2, report=1); **partially captured run resumes 3 saved labeled observations through the real boundary** (run=2, report=1, resume body verified); report failure → same-session retry (run=1, report=2, **same-tick double activation sends one request**, retry body carries the ten-observation ledger); `run_unfinished` honest state, no report call; stub failures truthful, exactly 1 request each |
| `tests/e2e/new-intake-journey.spec.ts`                       | **10/10** — deterministic path unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `local-audit-session.test.ts`                                | fingerprint+wording binding, stale rejection, malformed discard, unfinished/report-failure readability; **reportRequestCalls carry+dedupe across prep/run/report, reportAttemptsUsed counts telemetry-less attempts, reportRetryAllowed blocks in-flight/unbound/past-ceiling retries**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `local-preparation-routes.test.ts`                           | **9/9** — identity+extract `local_mode` dispatch: auto→substitute offline default (zero credential reads/provider calls), auto+authorized→one live call with credentials asserted, synthetic pins substitute even when authorized, authorized-without-keys stops honestly (no fallback), unknown mode/flag-off 404 before any work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `direct-ten-route.test.ts` resume gates                      | **3/3** — substitute mode resumes labeled synthetic observations and runs the rest (echoed, not re-executed); resume observations claiming another system 422; flag-off 404 even with a resume payload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `local-questions.test.ts`                                    | `sessionConfirmedBrief` derives only from confirmed intake; normalizes the entered source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `preparation.test.ts`                                        | `prepareBoundaryIdentity` keeps entered identity authoritative, substitute draft yields buyer-answered screens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `tests/spec008-review-port.test.ts` + intake isolation guard | **PASS** — pinned contract deliberately updated to `127.0.0.1` (`--hostname 127.0.0.1`, baseURL, cookie domain); `IntakeJourney` carries no audit-UI import                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Deferred / not passed

- **AC-08 usefulness remains unpassed** — report format/usefulness is
  explicitly deferred by the founder ("the report isn't that useful now;
  rush the end-to-end experience").
- The retained `retainedConfirmedBrief` competitor-empty-name gap stays
  documented in `DEFERRED_NOTES.md`; `sessionConfirmedBrief` avoids it.

---

# Spec 009 — Block B extension return (worker → orchestrator)

Status: **all four correction items implemented; offline verification
complete.** `npm run verify` passed on this branch after the final source
edits. Nothing was committed, pushed, merged, deployed, or sent to a
provider. No live audit/report call was made or authorized — every result
below comes from the labeled synthetic-substitute path at the real
boundaries and the real browser flow.

## Time and location

| Field                      | Value                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Extension active time used | ~70 of the approved 90 additional minutes (approximate; reported separately from the ~140/210 Block B clock) |
| Branch                     | `codex/spec-009-block-a-direct-ten` (uncommitted — founder has not requested a commit)                       |
| Base                       | `origin/main` `687f340343aa5be547d03e7d6fe23a9f5262a2df`                                                     |
| Worktree                   | `/Users/yasir/nuave-worktrees/spec009-block-a`                                                               |

## The four items

### 1 — Browser flow connected to the real run/report boundaries

`/audit/local-report` no longer posts to the synthetic-only local-audit
route. After the human approves the accepted pack it drives the **real**
boundaries with the same approved questions and receipt-bound brief:

```
GET /api/audit/local-audit → LocalQuestionPack + provenance + projected
    BusinessBrief (from bound input.confirmed) + live_authorized flag
  → real LocalQuestionsScreen review (edit/diubah/reset, session persistence,
    stale-approval invalidation — all preserved from Block B)
  → POST /api/audit/run  (question_method "direct-ten", exact accepted text)
      NDJSON stream → runAuditObservations with the substitute executor
      occupying the same `execute` slot liveExecuteAuditPrompt uses live
  → POST /api/audit/report  (brief + locked prompts + 10 observations +
      run telemetry folded into budget.calls)
      liveGenerateReportContent slot → synthetic generator in substitute mode
  → ReportView + makeCustomerEvidenceExport + Chromium PDF
```

Authorization control: `auditLiveExecutionAuthorized()`
(`NUAVE_AUDIT_LIVE_AUTHORIZED=1` + non-production) decides substitute vs
live at both routes. Without it, `executeSyntheticLocalObservation` /
`generateSyntheticLocalReport` run inside the real engine and credential
assertion is skipped; with it, `assertLiveProviderCredentialsConfigured`
and the live providers run as usual. `live_authorized` is surfaced on the
page and in the export provenance. Zero sends on mount/Back/reload
retained — the run only fires on the explicit approved action.

Route-level proof (`direct-ten-route.test.ts`, 4/4): the real run route
streams `run_completed` with ten `synthetic-local-fixture` observations;
the real report route returns a validated report with
`question_method: "direct-ten"` provenance; both make **zero**
`assertLiveProviderCredentialsConfigured`/live-provider calls in
substitute mode and 404 with the flag off. The `POST
/api/audit/local-audit` all-in-one route remains for its own tests but is
no longer the page's path.

### 2 — Recommendation denominator = all evaluable answers

`buildAuditReport` now counts `assessed` over every eligible evaluable
record for direct-ten — completed observations whose recommendation
judgment is `not_assessed` no longer shrink the denominator. The
reproduced counterexample (10 completed, 1 endorsement, 9 `not_assessed`)
now reports **`{recommended: 1, assessed: 10}`** — regression test added
beside the earlier mixed-answer case (endorsement / mention-only /
absence / failed → `{assessed: 9, recommended: 1}`). Failed answers still
count as neither absence nor assessment; the ten-evaluable delivery gate
and canonical denominators are unchanged. The real run artifact now reads
`{recommended: 0, assessed: 10}`.

### 3 — Print/download excludes the editor and controls

The question editor, approval/reset/run controls, and page notices carry
`print:hidden`; only the report (with its synthetic disclosure) prints.
The real Chromium download is **9 pages / ~260 KB** (was 11 pages / ~318 KB
with the editor on pages 1–2). Decoded text confirms editor strings are
absent ("Periksa pertanyaan audit", "diubah", "Pulihkan", "Jalankan demo")
and report content is present (heading, REKOMENDASI block, `NUAVE-DT-*`
details, `[SINTETIS]` labels, Indonesian findings, disclosure).

### 4 — Corrected live proposal

See below — restated against the actual code, separating expected use from
enforced limits.

## Method-aware contract changes (code, not config)

- `AuditQuestionMethod = "canonical" | "direct-ten"` is explicit at the run,
  report, lock, and pipeline boundaries; unknown/missing methods fail
  closed. Canonical/historical paths keep their existing default adapter.
- `canonicalLockedDirectTenPack` locks exactly ten `NUAVE-DT-*` ids in
  order with exact approved text, unique ids, `category: "unassigned"`,
  honest `branded` classification re-derived from the final text, and **no**
  role/purpose/slot metadata. Observation binding verifies every
  observation's question text equals the locked text.
- `reportAssessmentClassesFor` makes report evidence method-aware:
  direct-ten → all three classes eligible per prompt (still gated by
  visible appearance + answer integrity); canonical → matrix slot class;
  unknown/unmapped → none. This also closed a pre-existing gap where
  non-slot prompts skipped every evidence check.
- **R-07 appearance/recommendation separation + denominator (correction).**
  `normalizeReportEvidence` no longer forces `not_assessed` when a direct-ten
  answer doesn't name the brand — a real recommendation judgment survives on
  an absent answer. `buildAuditReport` no longer pre-filters the assessable
  set to mentioned-only **and** the `assessed` denominator for direct-ten now
  counts every eligible evaluable record, so completed answers with
  `not_assessed` judgments do not shrink it (the reproduced 1/1 defect now
  reports 1/10). Mere mention is not endorsement; a failed answer is not
  absence; untested is not zero. Canonical denominators unchanged.
- `DIRECT_TEN_REPORT_ASSESSMENT_INSTRUCTIONS` — direct-ten synthesis judges
  each answer on its own terms; **no `measurement_definitions`** is sent.
  Canonical providers keep matrix definitions.
- `webSearchExecuted` now reaches `methodSummary`/`system_label` — a
  synthetic run honestly reads "tanpa pencarian web", never claims search.
- Synthetic evidence is admitted only by the server-internal
  `allow_synthetic_evidence` flag AND requires every observation labeled
  `synthetic-local-fixture`; unlabeled evidence still fails under the flag,
  and the label can never satisfy the production observation-method check.
- `protectedObservationRequest` extracted as a pure builder; the boundary
  test proves outgoing user content is exactly `prompt.question` — no
  brief, brand, domain, or internal metadata.
- **Founder-local scope at the live boundaries (correction).** `POST
/api/audit/run` and `POST /api/audit/report` now reject `question_method:
"direct-ten"` with 404 unless `NUAVE_GLM_LOCAL_EXPERIMENT` is set on a
  non-production server — the same guard the local routes use. The check
  runs before schema parse, credentials, or any provider call, so a
  disabled/production request makes zero provider sends. Canonical is
  unaffected.
- **Real boundaries with explicit authorization control (extension).** The
  page now drives `/api/audit/run` + `/api/audit/report` directly.
  `auditLiveExecutionAuthorized()` (`NUAVE_AUDIT_LIVE_AUTHORIZED` +
  non-production) selects execution per request: without it the labeled
  substitutes (`executeSyntheticLocalObservation`,
  `generateSyntheticLocalReport`) occupy the same `execute`/synthesis slots
  the live providers use — same lock, retry, budget, stream, and validation
  code — and credential assertion is skipped; with it, the live providers
  and credential checks run unchanged. `live_authorized` reaches the page
  and the export provenance.
- **Print scope (extension).** The review editor, approval/reset/run
  controls, and notices carry `print:hidden`; the report and its
  disclosure print alone.
- **`question_method` + provenance travel into the download (correction).**
  `AuditReport.provenance.question_method` is now stamped in
  `buildAuditReport`, and `makeCustomerEvidenceExport` accepts an optional
  provenance block so the local run's `pack_method`, `pack_response_id`,
  `question_method`, `synthetic` flag and `provider_calls` reach the JSON
  export instead of being dropped.
- **Indonesian delivered copy (correction).** `deterministicDetailCopy` is
  now language-aware via a threaded `language` param — the direct-ten
  delivered detail lines render Indonesian and name the audited business
  ("… tidak muncul dalam jawaban ini." /
  "Jawaban yang disimpan tidak menyebut bisnis.").
- Carryover fix: `billedCostUsdOf` accepts finite non-negative numeric
  strings (e.g. `"0.000496"`); shared parser in `questions-id-glm.ts`,
  `glm-local.ts` delegates, regression test added.

## Files added / changed

- `src/lib/audit/local-direct-ten-audit.ts` — retained-pack loading + hash
  verification, `retainedConfirmedBrief` projection from bound
  `input.confirmed`; `executeSyntheticLocalObservation` /
  `generateSyntheticLocalReport` exported as the route substitutes;
  `runLocalDirectTenAudit` retained for the all-in-one local-audit route.
- `src/lib/intake/glm-local.ts` — `auditLiveExecutionAuthorized()`
  (`NUAVE_AUDIT_LIVE_AUTHORIZED` + non-production).
- `src/app/api/audit/local-audit/route.ts` — GET returns the retained
  `LocalQuestionPack` + provenance + projected `brief` + `live_authorized`;
  POST (all-in-one local run) retained. Both behind the
  `NUAVE_GLM_LOCAL_EXPERIMENT` non-production guard.
- `src/app/audit/local-report/page.tsx` + `local-report.client.tsx` —
  founder-local review→run→report→download page. Loads the retained pack
  through the real `LocalQuestionsScreen`, persists edits in session state,
  invalidates stale approval on wording change, offers reset-to-accepted;
  on approval it calls the **real** `/api/audit/run` (NDJSON stream via
  `AuditRunEventParser`) then `/api/audit/report` with the bound brief,
  locked prompts, ten observations, and folded run telemetry; renders
  `ReportView` + evidence export + real PDF. Editor/controls `print:hidden`.
  `noindex`/`nofollow`, 404s without the flag.
- `src/app/api/audit/run/route.ts` + `report/route.ts` — direct-ten wire
  schema, founder-local 404 guard before provider work, substitute-executor
  swap + conditional credential assertion, `allow_synthetic_evidence` in
  substitute mode (report).
- `src/lib/audit/contracts.ts` — recommendation/appearance separation +
  direct-ten evaluable denominator, language-aware
  `deterministicDetailCopy`, `question_method` in provenance.
- `src/lib/audit/customer-evidence-export.ts` — optional provenance block
  (now incl. `live_authorized`).
- `src/lib/audit/types.ts` — `provenance.question_method`.
- `src/lib/audit/direct-ten-audit.test.ts` — 19 focused tests (incl. the
  10-completed/1-endorsement/9-`not_assessed` denominator counterexample).
- `src/lib/audit/direct-ten-route.test.ts` — 4 route-level substitute
  tests at the real run/report boundaries.
- `src/lib/audit/run-route-client-contract.test.ts` — +1 fail-closed test.
- `src/lib/intake/IntakeJourney.tsx` handoff section — "Demo audit lokal"
  link shown only for `glm-direct-ten-local` handoffs.
- `specs/009-recommendation-eligible-audit/DEFERRED_NOTES.md` — deferred
  observations per the extension instructions.

## Verification results

| Check                                                                                                                                                      | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify` (typecheck + eslint + prettier + typography + **1,209 unit tests / 93 files** + production build + Cloudflare build + **91 + 3 + 3 e2e**) | **PASS** — after the final source edits                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `direct-ten-audit.test.ts` focused suite                                                                                                                   | **19/19** — lock id/order/text/branded/method dispatch; request boundary (only `prompt.question` leaves); report classes + synthetic-flag rules + altered-question rejection; retained-pack hash verification, tamper refusal, end-to-end, bound-intake brief projection; **mixed-answer regression** (endorsement / mention-only / absence / failed → `{assessed:9, recommended:1}`) and the **denominator counterexample** (10 completed, 1 endorsement, 9 `not_assessed` → `{recommended:1, assessed:10}`) |
| `direct-ten-route.test.ts` (extension)                                                                                                                     | **4/4** — real `/api/audit/run` streams `run_completed` with ten `synthetic-local-fixture` observations and zero credential/live calls; real `/api/audit/report` returns a validated report with `question_method: "direct-ten"` provenance and `{recommended:0, assessed:10}`; both 404 with the flag off                                                                                                                                                                                                    |
| `run-route-client-contract.test.ts`                                                                                                                        | **3/3** — incl. direct-ten 404 fail-closed with zero `assertLiveProviderCredentialsConfigured`/`liveExecuteAuditPrompt` calls                                                                                                                                                                                                                                                                                                                                                                                 |
| Tamper check                                                                                                                                               | altered submitted questions → honest refusal; tampered pack file → hash-mismatch refusal (unit)                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Real browser flow (Playwright)**                                                                                                                         | 10 questions render through the real review UI; edit → `diubah` marker + approval invalidation + run disabled; reload → edit persists, still invalidated, **zero provider sends**; reset → approval restored; run → real `ReportView` via `/api/audit/run` + `/api/audit/report`; **zero console errors**                                                                                                                                                                                                     |

## Runnable URL and inspected downloads

Dev server (this worktree, fresh port, bound to loopback):

```
NUAVE_GLM_LOCAL_EXPERIMENT=1 npx next dev -p 3031
```

- Demo/review page: `http://127.0.0.1:3031/audit/local-report` — the
  retained accepted pack loads for review, then runs the real path.
- Intake path: `http://127.0.0.1:3031/audit/new-intake?fixture=GLM&glm=1`
  → handoff screen shows the "Demo audit lokal" link.

**Inspected downloads (real artifacts, opened and decoded):**

- **JSON evidence export** — `/tmp/nuave-blockb-artifacts/nuave-local-audit-evidence.json`
  (saved from the real toolbar download in the browser flow).
  `export_version: nuave-evidence-v4`; top-level `provenance` carries
  `{pack_method: "nuave-glm-direct-ten-v1", pack_response_id:
"gen-1789693315-…", question_method: "direct-ten", synthetic: true,
live_authorized: false, provider_calls: 0}`;
  `report.provenance.question_method: "direct-ten"`; disclosure states
  observations come from `synthetic-local-fixture`; telemetry/failure
  diagnostics stripped; `method_summary` honestly says "tanpa pencarian
  web … Disebut bukan berarti direkomendasikan, dan tes yang gagal bukan
  hasil negatif."; `details[0].finding` Indonesian;
  `measures.recommendation` `{recommended:0, assessed:10}` — the corrected
  denominator: ten evaluable answers assessed, zero explicit
  recommendations (synthetic answers yield `not_assessed` judgments, which
  count as neither recommendations nor denominator removals); 10 prompts +
  10 observations; no keys/secrets.
- **PDF** — `/tmp/nuave-blockb-artifacts/nuave-local-audit-report.pdf`
  (real Chromium `page.pdf()` A4, **9 pages, ~260 KB**, `%PDF-1.4`). The
  question editor, approval/reset/run controls, and notices no longer
  print — decoded text confirms editor strings are absent ("Periksa
  pertanyaan audit", "diubah", "Pulihkan", "Jalankan demo") and the report
  renders alone with its disclosure: report heading, REKOMENDASI block,
  assessment dimensions honestly "Tidak diuji", the synthetic-only
  conclusion, per-question detail blocks `NUAVE-DT-01..10` with the real
  Indonesian question texts, `[SINTETIS] Jawaban contoh` labels, and
  Indonesian finding/evidence copy. This is the actual rendered report,
  not `window.print` hand-waving.

## Known limits / honest labels

- The demo report says it is synthetic everywhere: conclusion
  ("uji alur lokal dengan jawaban sintetis berlabel, bukan bukti
  visibilitas"), `accuracy_status: "could_not_assess"`, disclosure string,
  `synthetic-local-fixture` system/model labels, `web_search_calls: 0`.
- `measures.recommendation` on the synthetic run is `{recommended: 0,
assessed: 10}` and is **honest**: all ten completed answers are evaluable,
  so the denominator is 10; deterministic synthetic synthesis returns
  `not_assessed` judgments (a synthetic answer cannot support a real
  endorsement), so zero recommendations — not "0 of 1" as the old
  mentioned-only filter produced, and not "0 recommended of 10" as a
  certainty claim. The two regressions pin both semantics.
- `prompts[].review_status` exports `needs_human_review` — the pack
  schema's only status value; founder approval is recorded and verified in
  `ACCEPTANCE.json`, not in that field.
- Synthetic answers never name the audited business, so every detail shows
  "tidak muncul" by design — plumbing proof, never visibility evidence.
- Documented cost-ledger gap (pre-existing, unchanged): `budget.calls` is
  client-supplied per request; the USD 5 ceiling is enforced per-request
  unless the route reconstructs `calls` from a trusted ledger. Founder-local
  only; the carryover floor (`OPENAI_AUDIT_CARRYOVER_COST_USD`) still
  applies.

## Proposed live-call scope (awaiting explicit authorization)

Accurate proposal tied to the connected path. **Expected use** and
**enforced limits** are stated separately; neither is the other.

**What one authorization would do:** the founder sets
`NUAVE_AUDIT_LIVE_AUTHORIZED=1` on the same local server, reloads
`/audit/local-report` (GET reports `live_authorized: true`), approves the
unchanged accepted pack, and clicks run — the same click now drives live
providers through the identical boundaries: `liveExecuteAuditPrompt` per
question + `liveGenerateReportContent` for synthesis. The UI and export
label the run as live (`live_authorized: true`, real model/system ids,
real `provider_calls`).

**Logical calls (expected vs enforced ceiling):**

- **Observations:** expected **10** (one per question);
  `MAX_ATTEMPTS_PER_QUESTION = 3` → enforced ceiling **30** logical calls
  (`AUDIT_STAGE_CALL_LIMITS.observation`). A `non_retryable` verdict stops
  that question immediately.
- **Report:** expected **1**; enforced ceiling **3** — the report pipeline
  may issue up to 2 additional synthesis calls on validation/language
  failure before failing honestly.
- **Extract: 0** (bound confirmed brief, projected server-side);
  **prompts: 0** (`AUDIT_STAGE_CALL_LIMITS.prompts = 0` — questions are the
  retained pack); **variance: 0**.

**SDK transport retries (distinct from logical calls):** `client()` in
`openai.ts` sets no `maxRetries`/`timeout` — the installed SDK defaults
apply: **up to 2 transport retries per logical call** and a **10-minute
(600 s) timeout per attempt**. Transport retries fire on connection/5xx
failures; they multiply HTTP requests (worst case ≈3 transports × 30
logical + 3 × 3 report) but not billing — cost is accounted only from
received `provider_usage`. Edge case: a server-processed request whose
response is lost to a transport failure could bill without a ledger entry;
the USD 5 cap bounds that risk.

**Search usage (advisory, not a cap):** each observation request sends
`max_tool_calls: 1` — a **requested** hint to the Responses API, not a
guaranteed ceiling (telemetry.ts documents a prior live attempt recording
2 searches under cap 1). Billing uses the **actual** `web_search_call`
count × USD 0.01. Expected ≈10 searches (~$0.10); could be higher if the
provider ignores the hint — priced by actuals inside the USD 5 cap, never
claimed as capped.

**Cost basis (`cost_basis: "provider_usage"`):** `accounted_cost_usd` per
call = real token usage at Luna rates + actual search fees. Luna pricing
(observed 2026-08-01): input $0.20/M, output $1.20/M (input >272k:
$0.40/$1.80).

- Per observation (expected): ~2–5k input + ≤3,000 output cap + ~1 search
  ≈ **$0.015–0.02**.
- Per report (expected): request bytes (no search) + ≤16,000 output cap ≈
  **$0.03–0.05**.
- **Expected total: ≈ USD 0.20–0.30.**

**Spend carried from run to report:** the client folds the run's
`completed` telemetry into the report request's `budget.calls`
(`dedupeAuditCalls`), so the report route's reservation check accounts the
observation spend — cumulative accounting across the pair **as sent by
this client**. Remaining limit (pre-existing, unchanged): `budget.calls`
is client-supplied; a fresh or hostile request could under-claim — the USD
5 cap is enforced against claimed+reserved spend per request, not a
server-owned session ledger. Founder-local scope makes this acceptable;
no new ledger was built.

**Enforced stops (not estimates):** `reserveAuditCall` aborts any call
when `accounted + reserved > AUDIT_COST_LIMIT_USD` (**USD 5**, 402
`AuditBudgetError`); stage ceilings abort at 30 observation / 3 report / 2
extract / 0 prompts logical calls; backoff between retries ≤
`MAX_RETRY_BACKOFF_MS = 20 s`; browser/server abort signal cancels at every
attempt check. Reservation is worst-case headroom per **next** call
(≈$0.38 with search) — it is not cumulative billing and implies **no**
fixed call-count maximum; the stage ceilings bound call count, the cap
bounds spend.

**Carryover:** `budget.carryover_cost_usd` plus the
`OPENAI_AUDIT_CARRYOVER_COST_USD` floor counts against the cap before this
run's calls.

**Minimal enforcement implemented for this bounded run:** the
`NUAVE_AUDIT_LIVE_AUTHORIZED` opt-in (non-production only) plus existing
controls — USD 5 reservation cap, stage ceilings, retry/backoff/abort,
no-extra-send protections. No new budget system was built; the accounting
limits above are described, not hidden.

**Explicitly excluded:** extract/prompts/variance calls, customer
delivery, activation, any second run, any spend beyond one `direct-ten`
run + one report. **No live call occurs until the founder explicitly
authorizes this scope.**

---

# Spec 009 — Block A return (worker → orchestrator)

Status: **returned for orchestrator review** — not "verified", not
branch-ready. Full `npm run verify` remains the Block B delivery gate per the
founder's instruction. Nothing was committed, pushed, merged, deployed, or
sent to a provider.

## Time and location

| Field                          | Value                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Active time used               | ~135 of 150 budgeted minutes (implementation ~110, checks ~25; approximate)            |
| Branch                         | `codex/spec-009-block-a-direct-ten` (uncommitted — founder has not requested a commit) |
| Base                           | `origin/main` `687f340343aa5be547d03e7d6fe23a9f5262a2df`                               |
| Worktree                       | `/Users/yasir/nuave-worktrees/spec009-block-a`                                         |
| Canonical checkout + prototype | Both preserved untouched with their uncommitted work                                   |

## What was implemented

The approved direct-ten contract: one minimized confirmed brief → ten
directly generated, unnamed, purpose-free questions → flat editable review →
explicit human approval → local pack. `method: "direct-ten"` is explicit end
to end; the dormant `glm-slots` matrix method is preserved for its own
historical data.

- **Instruction**: verbatim recovered source body + asserted substitutions
  (`questions-id-direct-ten-instruction.ts`). Exact diff: 12→10 with
  "candidate" dropped; the section-2 sample block replaced by the numbered-
  line contract the extractor reads; the sample-brand placeholder replaced
  by the one minimized brief; founder amendments appended verbatim
  (2026-09-16 no-quota + 2026-09-18 all-unnamed delivery). Source hash
  re-verified: `652cfeda5cb6b11fa08d33f80325854738fdaacd8f0f59b3533ae0ad0cf71d0a`.
- **Brief** (`buildDirectTenWriterBrief`): one confirmed brief — brand,
  category, scope, offerings, area, channels, needs, tagged buyer
  preferences, do-not-name identities, explicit unknowns. No per-slot
  context, no guard-only signals.
- **Extraction** (`extractDirectTenQuestions`): strict three-marker parse,
  exactly ten numbered lines 1–10 in order, optional `Intent pattern:`
  labels preserved, sections 1/3 kept verbatim for inspection. Any
  malformed/ambiguous/mis-numbered span fails honestly — nothing is trimmed
  into a question.
- **Validation** (`validateDirectTenQuestionPack`): exactly ten, non-empty,
  bounded length; unnamed identity protection for brand/aliases/targets/
  comparators; asserted-premise guarantee tokens; retained private-data,
  high-impact and provider-safety patterns; exact duplicates flagged for
  review. **No** purpose/composition/punctuation rules, no distinct-needs
  quota, no naturalness score.
- **Pack boundary**: `DirectTenPromptPack` (`method:
nuave-glm-direct-ten-v1`) — prompts carry only `prompt_id`, `question`,
  `review_status`; summary 10/0; no `self_check`, no category/role/branded/
  rationale/inputs_used. Stable IDs `NUAVE-DT-01..10`. Generation kind
  `glm-direct-ten-local`; provenance carries method, requested/returned
  model, responseId, mismatch verdict, transport.
- **UI**: flat numbered list of ten (no group headers or purpose labels),
  edit/diubah markers, synthetic-transport label with requested/returned
  model and cost, approval via the existing handoff button. Legacy grouped
  rendering unchanged for deterministic/historical packs.
- **Route**: `/api/audit/glm-questions` — founder-only flag, disabled in
  production, method validated before any work, synthetic stub default,
  live only under `NUAVE_GLM_LIVE_AUTHORIZED` + server key (stops if the
  key is missing — never falls back silently).

## Reused from the prototype (reviewed, not blindly copied)

- B1 frozen input/request binding + atomic attempt consume + owner-only raw
  response evidence (`glm-local.ts`, `frozen-intake.ts`, `.local-evidence/`).
- B2 separate `originals` array; no `self_check` on GLM packs; truthful
  provider metadata.
- B3 mismatch-inspectable / missing-response-ID-fails assessment.
- Single-request transport, synthetic stub, e2e isolation and offline env
  blanking, fixtures, journey/route plumbing.

## Tests run (all offline, zero provider calls)

| Check                                | Result                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                   | clean                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `npx vitest run` (whole suite)       | **1,184 tests / 91 files — all pass**                                                                                                                                                                                                                                                                                                                                                                                                |
| `npx eslint` on touched files        | clean                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `npx playwright test new-intake-glm` | **2/2 pass** — edit→Back→reload→persisted edit→approved pack download; timeout/malformed stubs truthful, exactly 1 request each                                                                                                                                                                                                                                                                                                      |
| Focused new tests                    | `questions-id-direct-ten.test.ts` (15): extraction failures, multi-sentence/no-`?` texts, unnamed/comparator/guarantee/private-data rules, repeated-need allowance, exact-duplicate flagging, request/brief/hash assertions. `glm-local.test.ts` +4 direct-ten; `local-questions.test.ts` +6 direct-ten (flat pack shape, edit persistence/invalidation, kind↔method mismatch rejection, handoff mode). B1–B3 suites rerun unchanged |

Not run: `npm run verify` (Block B gate), no live transport, no production.

## Local URL / mode

`http://127.0.0.1:3027/audit/new-intake?fixture=GLM&glm=1` — fictional
Laundry Ceria fixture, **synthetic-stub transport** (labeled; not provider
output). Optional `&glm-stub=malformed|timeout|mismatch` probes failure
paths. Live transport unreachable: no key, no authorization in this env.

## Request readiness — NOT READY

Prepared artifact: `docs/checkpoints/2026-09-18-direct-ten-glm/`
(`PREPARED.md`, `request.json`, `business-input.json`).

- Compact-body SHA-256 `fce81baf…a40e` (13,821 bytes); message 13,162 chars.
- `glm-5.3-flash`, `max_tokens: 4096`, `reasoning_effort: "low"`, 180 s
  client wait, zero client retries, atomic consume before send.
- Estimated cost ≈ USD 0.0004–0.0008 (2026-09-17 settled observation).
- **Not ready**: built on the fictional fixture; real founder business
  context is pending and must rebuild the request + hashes. Prior consumed
  2026-09-17 request/marker untouched. No credential read.

## Known failures / limits

- None observed in the focused checks above.
- Deliberate limits: synthetic plumbing proves nothing about live
  naturalness; a `zai/` returned-model keeps a mismatch verdict
  (inspectable, not accepted); direct-ten `Intent pattern:` labels are
  inspection-only metadata, never shipped.

## Exact next founder test

Founder confirms real business/public context → orchestrator rebuilds the
request from that confirmed intake → founder reviews the concrete request,
model, single-call count and ≈USD 0.0004–0.0008 estimate → authorize
**one** live call → review the real ten questions in the UI and edit,
approve, or flag concrete problems. Only then release Block B.
