# Implementation brief: audit provider hang, provenance, and cost guard

Status: ready to implement
Author: code review, 2026-08-15
Scope: `src/lib/audit/*`, `src/app/api/audit/*`
Audience: the agent implementing the fix

---

## What you are fixing

The multi-provider audit work (`NUAVE_PROVIDER` + `groq.ts` + `gemini.ts` + `provider.ts`)
is structurally sound but has one blocking defect, two correctness defects that make the
product dishonest, and one regression bundled in from unrelated work.

Typecheck and all 199 tests currently pass. **The tests passing is not evidence the code
works** — a live audit run hangs indefinitely and no test covers the path that hangs. Treat
green tests as a starting point, not a result.

---

## Ground rules

These are non-negotiable for this task.

1. **Never change an assertion to match observed behavior.** If a test fails, the default
   assumption is that the code is wrong. If you conclude the test is wrong, stop and say so
   explicitly in your report with reasoning — do not edit the expectation and move on.
2. **Do not bundle unrelated changes.** This task is: make the free-provider path stop
   hanging and stop lying about itself. Anything else needs its own change.
3. **`npm run check` must pass** (`typecheck` + `lint` + `format:check`) before you report
   done. It currently fails on `prettier --check src/lib/audit/telemetry.test.ts`.
4. **Do not burn free-tier quota to verify.** The Groq daily budget is already exhausted
   (see below). All acceptance tests in this brief are offline with a mocked `fetch`.
5. **Report honestly.** If you cannot complete an item, say which one and why. Do not report
   partial work as done.

---

## Task 1 (BLOCKING) — the audit hangs forever instead of failing

### Evidence

Traced against the real on-disk module with an instrumented `fetch`:

```
0.0s  FETCH-> https://api.tavily.com/search                    status=200
1.0s  FETCH-> https://api.groq.com/openai/v1/chat/completions  status=429  retry-after=2776
      ... no further activity. Killed at 300s.
```

Groq's response body:

> Rate limit reached for model `llama-3.3-70b-versatile` … service tier `on_demand` on
> **tokens per day (TPD): Limit 100000, Used 97730, Requested 4132**. Please try again in
> 26m48.768s.

`POST /api/audit/extract` returns nothing after 150s. No error, no log, no timeout.

### Root cause

`src/lib/audit/groq.ts:213-221` honors `retry-after` with no ceiling:

```ts
const retryAfter = Number(res.headers.get("retry-after"));
const delayMs =
  Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000      // 2776 * 1000 = 46 minutes
    : 8000 * attempt;
await new Promise((resolve) => setTimeout(resolve, delayMs));
```

With `maxAttempts = 6` a single call can sleep for hours. A daily-quota 429 can never
succeed inside one request lifetime, so retrying it is always wrong.

### Also relevant

The rate-limit engineering in this file targets the wrong limit. The comments at
`groq.ts:40-45` and the `GROQ_MAX_INPUT_CHARS` tuning are entirely about the 12,000
**tokens-per-minute** ceiling. TPM was never the binding constraint. TPD is, and it is
never mentioned or handled.

Groq charges `max_tokens` against the daily budget whether the tokens are used or not
(note `Requested 4132` for a two-character prompt with `max_tokens: 4096`). With the
current settings — extract 4096, observation 1500 ×10, report 4096 — one full audit run
costs roughly 40,000–50,000 tokens. The free tier is 100,000/day, so **about two runs per
day**, then everything hangs.

### Required changes

1. **Cap the backoff.** Clamp the honored delay to a small ceiling (60s is reasonable).
   Never sleep for a provider-supplied duration unbounded.
2. **Do not retry a non-retryable 429.** Distinguish a short-window limit (TPM/RPM, worth
   one or two retries) from a quota limit (TPD, hopeless inside this request). If the
   retry-after exceeds the cap, or the message indicates a per-day limit, fail immediately.
3. **Surface the provider's own message.** The error that reaches the user must include
   Groq's text — "tokens per day (TPD): Limit 100000, Used 97730" is exactly what the
   operator needs to see. Right now that message is discarded into a silent sleep.
4. **Add a request timeout to every raw `fetch` in `groq.ts` and `gemini.ts`.** There is
   currently none anywhere on these paths, so a stalled connection hangs regardless of the
   retry logic. Use `AbortSignal.timeout(...)` with a sane per-call bound and make the
   resulting error legible.
5. **Reduce the daily burn** so a run is repeatable: lower `max_tokens` per stage to what
   each stage actually needs, and state the resulting estimated tokens-per-run in your
   report so the founder can judge whether the free tier is usable at all.

### Acceptance criteria

- A unit test with a mocked `fetch` returning `429` + `retry-after: 2776` proves
  `groqChat` **rejects in under a second** and the thrown message contains the provider's
  rate-limit text.
- A unit test with a mocked `fetch` returning `429` + a short `retry-after` proves the
  retry path still works and is bounded.
- A unit test proves a hung connection is aborted by the timeout rather than hanging.
- No test in this group makes a network call.

---

## Task 2 (BLOCKING) — the report misstates which system produced it

### Evidence

`src/lib/audit/contracts.ts:932`:

```ts
const systemLabel = `OpenAI Responses API - ${returnedModels.join(", ") || "model unavailable"} with web search`;
```

This is hardcoded. It flows into two customer-facing places:

- `system_label` on the report (`contracts.ts:985`)
- `methodSummary`, the prose the customer reads (`contracts.ts:978`):
  *"We tested 10 questions one at a time through OpenAI Responses API - …"*

`src/lib/audit/contracts.ts:1023`, in `makeEvidenceExport`, hardcodes the same claim:

```ts
disclosure: "Observations come from the OpenAI Responses API and do not exactly reproduce the consumer ChatGPT interface.",
```

The `system` field on `auditObservationSchema` was widened in `types.ts` to accept
`"Google Gemini API"` and `"Groq + Tavily"`, but neither of these two strings was updated.

**Result: run the audit on Groq and the report tells the reader the data came from
OpenAI's Responses API. It came from Llama-3.3-70b plus Tavily search results.**

This contradicts the SETTLED decision of 2026-07-19 in `docs/DECISION_LOG.md`
("Do not claim API observations reproduce personalized consumer interfaces") in the most
direct way possible, and it is the single most damaging defect in the current state.

### Required changes

1. Derive the system label from the actual `observation.system` values present in the
   completed observations, not from a literal. Handle the mixed case honestly (it should
   not occur, since `provider.ts` selects one provider per process, but do not silently
   collapse it if it does).
2. Derive the evidence-export `disclosure` the same way. The sentence about not reproducing
   the consumer interface stays; the claim about *which* system ran must become accurate.
3. Update `contracts.test.ts` and any fixture that asserts the old literal — **because the
   behavior is intentionally changing**, which is a legitimate reason to change a test.
   Add a case that proves a Groq-sourced observation set produces a label naming Groq and
   never the string "OpenAI".

### Acceptance criteria

- A test builds a report from observations with `system: "Groq + Tavily"` and asserts
  `system_label`, `method_summary`, and the evidence-export `disclosure` all name Groq and
  none of them contain "OpenAI".
- The equivalent existing assertions for the OpenAI path still pass.

---

## Task 3 — evidence provenance on the Groq path is fabricated

### Evidence

`src/lib/audit/groq.ts:435-457`: every observation gets all six raw Tavily results attached
as `sources`, regardless of whether the model's answer used any of them. The file's own
comment acknowledges Groq returns no citations. The OpenAI path uses real citation
annotations, so the two paths mean different things by the same field.

`src/lib/audit/groq.ts:370`: `void sources;` — extraction fetches Tavily sources and then
discards them.

### Required changes

1. Stop presenting unused search results as evidence. Either parse the `[n]` markers the
   prompt already instructs the model to emit and keep only the cited ones, or keep all
   results but record them in a field that does not claim they were used. Do not leave the
   current behavior.
2. Resolve the `void sources;` dead code — either use the extraction sources or stop
   fetching them.
3. Whatever you choose, the meaning of `sources` must be the same on the OpenAI and Groq
   paths, or the difference must be recorded in the observation itself.

### Acceptance criteria

- A test with a fixed model answer citing `[1]` and `[3]` out of five results proves the
  observation does not claim the uncited results as evidence.

---

## Task 4 — revert the cost-guard change (unrelated regression)

### Evidence

`src/lib/audit/telemetry.ts:140-147` changed `reserveAuditCall` so a web-search call
reserves only the byte length of the outgoing request instead of the model's full input
window:

```
reserved per observation call: $0.3842  →  $0.0136   (28× less)
```

`src/lib/audit/telemetry.test.ts` was then edited to assert the new numbers, and the case
verifying the guard refuses a call when $4.30 is already accounted for was replaced with
one asserting it now succeeds.

The in-code justification is that the authoritative cost is recorded from provider usage
after the call. That is true and beside the point: a preflight guard exists to stop
spending *before* it happens, and web search ingests an amount of content that is unknown
at preflight — which is precisely why the original reserved the worst case.

This change affects the **paid OpenAI path**, has nothing to do with adding free providers,
and reduces protection against a runaway bill across 10 observation calls.

### Required changes

1. Revert `telemetry.ts` and `telemetry.test.ts` to the committed behavior
   (`git diff` against `HEAD` shows exactly what to undo). Keep the deleted carry-over
   assertion.
2. If you still believe the reservation is too conservative, raise it as a **separate**
   proposal with the numbers, and leave the guard intact in this change.

### Acceptance criteria

- `git diff HEAD -- src/lib/audit/telemetry.ts src/lib/audit/telemetry.test.ts` is empty.

---

## Task 5 — configuration and hygiene

1. `.env.local` line 9 reads `/*OPENAI_API_KEY=sk-proj-…`. `/*` is not a dotenv comment;
   the line is silently dropped and `OPENAI_API_KEY` is unset. Switching
   `NUAVE_PROVIDER` back to `openai` will fail with a confusing "not configured" error.
   Fix the comment character to `#`. Do not print, move, or commit the key value.
2. An unrecognized `NUAVE_PROVIDER` value (e.g. a typo like `gemeni`) silently falls back
   to OpenAI in `provider.ts:29-34`. Make an unrecognized value a startup error.
3. `gemini.ts:107` puts the API key in the URL query string. Use the `x-goog-api-key`
   header so the key does not land in request logs.
4. `groq.ts`'s `extractBusinessDraft` returns `{ draft, telemetry }` while `openai.ts` and
   `gemini.ts` return `{ draft, returned_model, response_id, telemetry }`. Make the three
   signatures identical — `provider.ts` claims they are drop-in replacements and they are
   not.
5. Run `npm run check` and fix the `prettier` failure on `telemetry.test.ts`.

---

## Stop and ask the founder — do not decide these yourself

1. **Budget accounting on the free paths.** `groq.ts:237-239` defines
   `reservedBudget()` as *the entire remaining budget*, so one failed call records
   `accounted_cost_usd: 5.00` and telemetry reports a $5 spend on a free provider.
   Neither `groq.ts` nor `gemini.ts` calls `reserveAuditCall`, so `AUDIT_STAGE_CALL_LIMITS`
   is unenforced there. Recording $0 is defensible for a free tier; recording $5 is not.
   Propose an approach, state the trade-off, and get agreement before implementing.
2. **Whether Gemini and Groq belong here at all.** `docs/DECISION_LOG.md`, 2026-07-29,
   SETTLED: *"Target ChatGPT only for the next prompt pack and remove Gemini from this
   scope. This supersedes the two-provider rule."* This work reintroduces Gemini and adds
   Groq with no new decision-log entry. Either the decision is being reversed — which needs
   a founder decision and a new log entry — or the providers are a local development tool
   that must never produce a customer-facing report. Ask which, then reflect the answer in
   the code and the log.
3. **Whether a Groq run counts as evidence.** Llama-3.3 summarizing six Tavily results does
   not measure the same thing as "does ChatGPT recommend this brand." As a way to exercise
   the pipeline for free it is reasonable; as customer-facing evidence it is not, and
   nothing currently marks the difference. If the founder agrees it is a smoke test only,
   the report needs a visible, unremovable marker saying so.

---

## Verification before you report done

- [ ] `npm run check` passes clean.
- [ ] `npm run test:audit` passes, including the new tests from Tasks 1–3.
- [ ] `git diff HEAD -- src/lib/audit/telemetry.ts src/lib/audit/telemetry.test.ts` is empty.
- [ ] A mocked-fetch test proves a TPD 429 fails in under a second with the provider's
      message intact.
- [ ] A test proves a Groq-sourced report never contains the string "OpenAI".
- [ ] No new network calls in the test suite.
- [ ] You have stated the estimated tokens-per-run for the Groq path.

## In your final report, state plainly

- Which tasks you completed and which you did not.
- Every test assertion you changed and why the behavior change justified it.
- Anything you found that this brief did not anticipate.
- Your answers to, or blockers on, the three "stop and ask" items.

Do not report success on the basis of a green test suite alone. The suite was green while
the application hung indefinitely.

---

# Round 2 — verification of the first implementation

Verified 2026-08-15 against the code, not against the implementation report.

## Accepted

| Task | Result |
| --- | --- |
| 2 — system label | **Pass.** `describeAuditSystem` / `deriveSystemLabel` (`contracts.ts:884-917`) derive from `observation.system`, list mixed systems rather than collapsing them, and the evidence-export disclosure is interpolated. Better than specified. |
| 3 — provenance | **Pass.** `citedGroqSources` maps `[n]` markers back to injected results and ignores out-of-range markers. `void sources;` removed. |
| 4 — revert | **Pass.** `git diff HEAD -- telemetry.ts telemetry.test.ts` empty. |
| 5 — hygiene | **Pass**, all five items. |
| `npm run check` | **Pass** (4 pre-existing `<img>` lint warnings only). |

## Rejected

**The reported test result was wrong.** The report claimed 207 passing. A clean run gave
`3 failed | 204 passed`, and the three failures were the three Task 1 acceptance tests —
the ones proving the blocking hang was fixed.

Cause: `groq.test.ts` never stubbed `GROQ_API_KEY`, so `groqKey()` threw before the mocked
`fetch` was reached. The implementing shell had the key exported; CI and a clean checkout
do not. Demonstrated by:

```
GROQ_API_KEY=dummy npx vitest run src/lib/audit/groq.test.ts   -> 13/13 pass
npx vitest run src/lib/audit/groq.test.ts                      -> 3 fail
```

**A new hang was introduced by the fix.** `groqKey()` had been moved inside the `try`
block, so a missing or invalid credential was caught by the network-error handler and
retried: 4+8+12+16+20 = 60s of backoff before surfacing a configuration error that is
knowable instantly. Measured:

```
threw after 60.0s | Groq request failed: GROQ_API_KEY is not configured | fetchCalls: 0
```

A smaller instance of the exact bug being fixed. Root cause: the `catch` treated every
non-abort error as retryable.

---

# Round 3 — verification of the follow-up

Verified 2026-08-15. **Both round-2 defects are fixed. Task 1 now passes.**

- Credential read once before the retry loop (`groq.ts:222`, `const authKey = groqKey()`),
  with a comment recording why a configuration error must never be retried.
- Independent measurement, mocked `fetch`, empty key:
  `threw after 0.00s | GROQ_API_KEY is not configured | fetchCalls: 0` — down from 60.0s.
- All three Task 1 tests now stub `GROQ_API_KEY` explicitly rather than depending on
  ambient environment, plus a fourth test asserting the missing-key path rejects in under
  a second with zero fetch calls.
- Clean-environment run (`env -u GROQ_API_KEY`): **208 passed, 0 failed, 16 files.**
- `npm run check` passes. Telemetry revert still intact.

## Durable lessons from this task

1. **A test that depends on ambient environment is not a test.** Stub what the code reads.
   Two rounds were lost to a suite that was green on one machine and red everywhere else.
2. **Configuration errors are never retryable.** A credential will not appear on retry.
   Read credentials before the retry loop, and make the retry predicate name what it
   retries rather than catching everything that is not an abort.
3. **Verify in the environment the claim describes.** "Tests pass" means in a clean
   checkout, not in the shell that happens to have secrets exported.

## Still open — founder decisions, not implementation

Unchanged from the "Stop and ask" section above. None have been implemented, correctly:

1. Budget accounting on the free paths (`reserveAuditCall` unenforced; `$0` vs a reserved
   band).
2. Whether Gemini and Groq belong here at all, given the 2026-07-29 SETTLED decision
   ("ChatGPT only… remove Gemini"). Needs a decision and a `DECISION_LOG.md` entry either
   way.
3. Whether a Groq run counts as evidence, and whether the report needs a visible
   smoke-test-only marker.

## Field note on the original symptom

The first live request made during this review returned **HTTP 200 after 63 minutes**
(20:30 → 21:33) under the pre-fix code. The old path never failed — it slept through the
`retry-after: 2776` window, retried after the daily quota reset, and succeeded, holding an
HTTP connection open for over an hour. The reported symptom was not an error; it was the
complete absence of one. That is why it was hard to diagnose, and it is the reason Task 1
required both a bounded backoff and a hard request timeout rather than just better error
messages.
