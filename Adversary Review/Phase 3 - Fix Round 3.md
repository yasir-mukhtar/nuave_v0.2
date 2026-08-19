# Spec 003 / Phase 3 — Fix brief, round 3

**For:** the next agent. **State reviewed:** commit `6c5b8dd` ("fix: Phase 3
fix-round-2 adversarial review findings"), branch
`fix/phase-1-adversarial-review`. **Reviewed:** 2026-08-19.

`6c5b8dd` is real progress: the wrong number on the report is gone, the
Indonesian stamp is fixed with a genuine end-to-end test, and the
deliberately-deferred items are documented honestly. What follows is what
round 3 found still open. Eight items, ~half a day of work. None of them
require live provider spend.

---

## 0. Do not redo this work — verified correct at `6c5b8dd`

- **N-1** — `measures.unbranded.appeared` yields **3/5** on the recorded live
  data (`unbranded_recommended: 3, unbranded_mentioned: 0`), not 0/5.
- **N-2** — `<strong>` carries the X/10 figure, caption carries the sentence
  (`ReportView.tsx:252-260`), matching `FixtureReportView.tsx:202-209`.
- **O-2** — stamp moved onto the label pack (`contracts.ts:1246`,
  `report-language.ts:499-500`); `report-pipeline.test.ts:348-380` drives
  `createValidatedAuditReport({language:"id"})` end to end and asserts
  `plain-id-v1` / `deterministic-v4-id` / Indonesian facts and method copy.
  This is a good test — model the new ones on it.
- **O-10 (m-1)** — `NODE_ENV !== "production"` guard on the testing flag
  (`provider.ts:55-58`, `questions-id-provider.ts:166-172`), tested.
- **O-6 / O-11** — corrections and the deferral decision are recorded
  accurately. Leave them.

All four commands pass at `6c5b8dd` and must still pass when you are done:
`npm run check`, `npm run test:audit` (279/279, 18 files),
`npx vitest run src/lib/fixture-journey` (82/82, 4 files), `npm run build`.

---

## 1. Still open, in the order I would do them

### R3-1 (Major) — the N-1/N-3 regression test does not reproduce N-1

`src/lib/audit/contracts.test.ts:288-309`

The fixture has `unbranded_recommended: 0, unbranded_mentioned: 1`. Under that
data the buggy numerator and the fixed one are the same number (both 1), so:

- revert `contracts.ts:1145` to `appeared: unbrandedMentioned`, and
- revert `ReportView.tsx:265` to `report.counts.unbranded_mentioned`

…and the whole suite stays green. Same for N-3: the deleted client-side
`details.filter(d => d.appearance === "mentioned").length` also equals 1.
`VERIFICATION.md:39` and `:41` cite this test as the reproducing test for both
findings. It is not one.

**Fix:** add a case with `unbranded_recommended > 0` — the shape the live run
actually produced. Minimum: unbranded details where some are
`mentioned + recommended` and some are `mentioned + not_recommended`, and
assert `measures.unbranded.appeared` equals the count of `mentioned`, not
`counts.unbranded_mentioned`. Verify the new test **fails** against the
reverted line before you keep it.

### R3-2 (Major) — O-5 is not fixed; the "measured" baseline is still wrong

`specs/003-live-report-quality-gate/SPEC.md:43, 80, 91, 532, 617`;
`specs/003-live-report-quality-gate/VERIFICATION.md:111-113`

SPEC.md:91 claims the numbers are "corrected to the measured, reproducible
baseline: **276 audit unit tests (18 files)**". 276 was never measured:

- round 2 measured **275** at `c18fe8e`;
- `6c5b8dd` adds exactly **4** `it` blocks and removes none (`provider.test.ts`
  +3, `report-pipeline.test.ts` +1 — check with `git diff --unified=0`);
- `npm run test:audit` at `6c5b8dd` reports **279**; 279 − 4 = **275**;
- `specs/002-indonesian-audit-contract/VERIFICATION.md:108` — the document
  SPEC.md:88 cites as the authority for the 82 correction — records **274**,
  not 276.

`VERIFICATION.md:111-113` says 279 is "3 higher" than a 276 baseline. It is 4
higher than 275. AC-02 (`SPEC.md:617`) as written can never be satisfied.

**Fix:** the 82 and 33 figures are right — leave them. Correct the audit-unit
figure at all five SPEC.md locations to a number you measure yourself at the
commit you are on, state the commit you measured it at, and rewrite
VERIFICATION.md's reconciliation paragraph with the real arithmetic. Do not
carry a number forward that you have not run.

### R3-3 (Medium) — the three assessed denominators contradict each other

`src/lib/audit/contracts.ts:1117-1138`, rendered at `ReportView.tsx:286-316`

`normalizeReportEvidence` (`contracts.ts:552-566`) forces, for an `absent`
detail: `recommendation → "not_recommended"`, `comparison → "not_observed"`,
`information → "not_assessed"`. The new denominators count `not_recommended`
as assessed but `not_observed` / `not_assessed` as not assessed. So a question
where the brand never appeared sits **inside** recommendation's denominator and
**outside** the other two.

From the committed test's own expectations (`contracts.test.ts:301-308`), a
1-of-10 report renders:

> Rekomendasi — Direkomendasikan di **0 dari 10** pertanyaan yang dinilai
> Perbandingan — **Tidak diuji**
> Informasi publik — **Tidak diuji**

Nine questions are "dinilai" on one line and "Tidak diuji" on the next two. On
the live Sozo data the three denominators read 10 / 4 / 8.

The fixture reference preserves `not_assessed` verbatim
(`src/lib/fixture-journey/adapter.test.ts:254-266`), which is why its
denominators are genuinely eligible. The port copied the eligible-value lists
(`adapter.ts:200-213`) but inherited a normalization that defeats them.

**Fix:** exclude `absent` details from `recommendationAssessed` the same way
they are already excluded from the other two — i.e. eligibility should be
"the brand appeared and the dimension was judged", applied identically across
all three. Pin the three denominators in a test against one shared observation
set that includes at least one absent detail. This is an AC-17 rule, so update
the AC-17 evidence line in VERIFICATION.md when it is done.

### R3-4 (Medium) — restoring a session across this deploy crashes the report

`src/app/audit/AuditWorkflow.tsx:184` and `:58`; `src/app/audit/ReportView.tsx:254`

`measures` is a new **required** field on `AuditReport`. The restore path is an
unchecked `JSON.parse(saved) as SavedState` and `STORAGE_KEY` is still
`"nuave.audit.workflow.v3"`. A report written to sessionStorage by the previous
build has no `measures`, so on reload `report.measures.overall.appeared` throws
`TypeError: Cannot read properties of undefined`. The `try/catch` at `:180-203`
wraps only the parse; the crash is during render and takes out the report
screen for a completed audit.

Same shape in the evidence: `.secrets/sozo-live-run-2026-08-17/report-pipeline-output.json`
has no `measures`, so it cannot be fed to `ReportView` to produce the rendered
artifact the deferred O-1 step needs — it has to be regenerated.

**Fix:** bump `STORAGE_KEY` to `v4` (simplest, and correct — the shape
changed), or validate the restored report and drop it if `measures` is absent.
Do not add optional-chaining at the call sites; that would silently render a
report with missing numbers.

### R3-5 (Medium) — the O-10 (m-2) fix misses the only path that has run live

`src/lib/audit/provider.ts:122`; callers `run/route.ts:41`,
`report/route.ts:32`, `extract/route.ts:40`

`assertLiveProviderCredentialsConfigured` is called only from the three HTTP
handlers. The live run has never gone through them (that is O-1) —
`scripts/sozo/sozo-live-run.spec.ts` calls `runAuditObservations` /
`createValidatedAuditReport` directly, and the "OPENAI_API_KEY absent" failed
runs recorded in `evaluation-results.md:298` happened on that script path. The
30-guaranteed-failing-attempts burn is still reachable there today.
`VERIFICATION.md:50` claims it fires "before any provider work begins".

**Fix:** call it at the top of `runAuditObservations` and
`createValidatedAuditReport` so both the route and the script path are covered,
and correct the VERIFICATION.md wording.

### R3-6 (Low) — the pipeline ten-of-ten gate is still language-conditional

`src/lib/audit/report-pipeline.ts:120-125`

```ts
// Scripts and future callers must not be able to spend on synthesis for a
// partial evidence set.
if (input.language === "id") { assertReportGenerationGate(input); }
```

The comment is false for English. Round 2 asked for this explicitly ("Make it
unconditional and extend the new test to the English path") as an item
separable from O-1's live run, and it is not in VERIFICATION.md's
"Deliberately not fixed" list. `report/route.ts:36` gates unconditionally, so
HTTP is safe; the gap is direct library callers on the English path.

**Fix:** drop the `if`, extend `report-pipeline.test.ts`'s gate test to the
English path.

### R3-7 (Low) — `measures.*.appeared` does not compute what its comment says

`src/lib/audit/types.ts:416-419` vs `contracts.ts:1141, 1145`

The comment says appeared counts `appearance === "mentioned"` regardless of
recommendation. The code computes `unbrandedRecommended + unbrandedMentioned`,
i.e. `recommended ∪ mentioned`. These agree only because
`normalizeReportEvidence` forces `absent → not_recommended` two files away.
`buildAuditReport` is exported and is called directly with un-normalized
content by tests (`report-language-id.test.ts:92`); a detail with
`appearance: "absent", recommendation: "recommended"` would count as appeared
and overstate the headline.

**Fix:** filter on `appearance === "mentioned"` directly, as the fixture does
(`adapter.ts:217-218`). One line, and it removes the dependency on a
cross-file invariant.

### R3-8 (Low) — `measureLabel` is duplicated and untested

`src/app/audit/ReportView.tsx:56-62` is a verbatim copy of
`src/app/audit/fixture/FixtureReportView.tsx:60-66`. It is pure logic, so the
declared "no component-test framework" deferral does not cover it.
`VERIFICATION.md:43` credits `report-labels.test.ts`, which tests
`indonesianCountLabel` (`report-labels.ts:81`) — a different function on a
different path.

**Fix:** move it next to `indonesianCountLabel` in `report-labels.ts`, import
it in both views, and add the zero-denominator test there.

---

## 2. Deliberate scope decisions — leave them alone

These were decided, not missed. Do not reopen them without asking the founder.

- **O-1** — the live run through `/audit` + `/api/audit/*`. Needs real OpenAI
  spend against a running server with `NUAVE_ACCESS_CODE` set. Still the
  phase's blocking deliverable, still deferred.
- **O-7's full fix** — a server-owned session cost ledger. Deferred to Phase 4
  per SPEC.md's own Non-scope line.
- **O-8** — the provider's `max_tool_calls` cap. Third-party behaviour;
  documented as advisory in `telemetry.ts`.
- **O-11's full run-surface translation** — pending founder review of
  customer-facing Indonesian voice content.
- **DOM/rendering tests** — no component-test framework in this repo, declined
  for this pass. R3-8 is not an exception to this: `measureLabel` is pure logic
  and needs no DOM.

---

## 3. VERIFICATION.md corrections to make in the same pass

`specs/003-live-report-quality-gate/VERIFICATION.md` is otherwise honest — the
Verdict and the deferral section accurately describe what was not done. Three
claims overstate and should be corrected as you fix the underlying items:

- `:39` / `:41` — the cited N-1/N-3 reproducing test does not reproduce either
  (R3-1).
- `:111-113` — the test-count reconciliation is wrong arithmetic against an
  unreproducible baseline (R3-2).
- `:50` — "before any provider work begins" is true only of the HTTP routes
  (R3-5).

`:43`'s claim that the `measures` assertion "covers the assessed=0 branches" is
true of the data but not of `measureLabel`'s rendering — tighten it (R3-8).

---

## 4. Done means

1. R3-1 through R3-8 fixed, each with a test that **fails before the fix** —
   check that, do not assume it.
2. `npm run check`, `npm run test:audit`, `npx vitest run
   src/lib/fixture-journey`, `npm run build` all pass, with the audit-unit
   count **measured and recorded**, not carried forward.
3. VERIFICATION.md updated: the three overstated claims corrected, the new
   findings and their reproducing tests added to the table.
4. Phase 3 is still **not** a quality-gate pass after this work — O-1 and the
   founder exit-gate read (R-31/R-32, AC-24/AC-26) remain open. Do not record
   a pass.
