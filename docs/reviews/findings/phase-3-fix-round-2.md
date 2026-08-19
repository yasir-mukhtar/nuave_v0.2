# Spec 003 / Phase 3 — Fix verification, round 2

**Purpose:** hand this to the next agent. It records what the round-1 fix commit
actually fixed, what it did not, and two new defects it introduced.
**State reviewed:** commit `c18fe8e` ("fix: connect Indonesian live report
pipeline"), working tree clean, branch `fix/phase-1-adversarial-review`.
**Reviewed:** 2026-08-18.
**Verdict: Phase 3 is NOT done.** The Indonesian report path is genuinely
connected and a fresh live run succeeded — real progress. But two of the four
Critical findings from `docs/reviews/findings/phase-3-adversarial-review.md` are still open, four
Majors are untouched, and the new `ReportView.tsx` prints a wrong number on the
report's headline grid.

---

## 0. Commands I ran (so you don't repeat them)

| Command | Result |
|---|---|
| `npm run check` | **passes** (typecheck ✓, lint 0 errors / 14 warnings, prettier ✓) |
| `npm run build` | **passes** |
| `npm run test:audit` | **275 tests / 18 files, green** |
| `npx vitest run src/lib/fixture-journey` | **82 tests / 4 files, green** |
| `npm run test:e2e` | **33 passed** (28 + 3 + 2) |
| `npx vitest run` (whole repo) | 364 tests pass; the 3 "failed files" are `tests/e2e/*.spec.ts` being picked up by vitest instead of playwright — pre-existing config noise, not a regression |

---

## 1. What round 1 genuinely fixed — do not redo this work

1. **A real live run happened, and the pipeline wrote the report itself.**
   `.secrets/sozo-live-run-2026-08-17/run-record.json` records a run at
   `2026-08-18T14:04:02Z → 14:06:36Z`: 10/10 completed, `evaluable_gate
   "10/10 PASS"`, 0 retries, 3 variance re-asks, `report_pipeline.status
   "completed"`, total accounted USD 1.0427 of a USD 5 ceiling.
   `report-pipeline-output.json` is Indonesian in conclusion, findings,
   priorities, method summary, and every facts label, with
   `report_call_count: 1` and `language_retry_performed: false`. **Original
   finding C-2 (hand-assembled report) is resolved.**
2. **Indonesian synthesis is wired.** `openai.ts:495-497` sends the Indonesian
   instruction when `language === "id"`; `src/app/api/audit/report/route.ts:35`
   passes `language: "id"`; `report-pipeline.ts` now routes through
   `validateIndonesianReportLanguage`, `validateIndonesianReportLanguageRevision`,
   `INDONESIAN_AUDIT_REPORT_LABELS`, and `indonesianReportBuiltFieldErrors`.
3. **`ReportView.tsx` is Indonesian** end to end, with `id-ID` date formatting,
   and **Download PDF is now the primary action** (`ReportView.tsx:169`,
   `window.print()`), with `Unduh bukti JSON` secondary. Print CSS already
   expands the details (`audit.module.css:1360-1366`). AC-22 is substantially
   addressed.
4. **The ten-of-ten gate now also runs inside the pipeline**
   (`report-pipeline.ts:120-122`), with a regression test at
   `report-pipeline.test.ts:35-50`. `scripts/sozo/report-rerun.ts:218` passes
   `language: "id"`, so it is gated too.
5. **M-6 fixed:** `gemini.ts:153-158` no longer retries `429`.
6. **M-4 partly fixed:** the browser-open caveat is now in the running-state
   description (`AuditStages.tsx:789`), not only in the interrupted branch.
7. **AC-25 fixed:** `npm run check` and `npm run build` both pass.
8. **m-3 fixed:** the private artifacts are no longer committed (`git ls-files
   test-results/` is empty).
9. **The evidence directory exists.** `.secrets/sozo-live-run-2026-08-17/`
   holds `questions.json`, `observations.json` (with per-attempt telemetry,
   sources, and full raw answers), `variance.json`, `telemetry.json`,
   `run-record.json`, `report-pipeline-output.json`. AC-14/AC-19 are now at
   least inspectable.

---

## 2. New defects introduced by the fix — highest priority

### N-1 (Critical) — the live report shows the wrong number in the "Tanpa menyebut bisnis Anda" tile

`src/app/audit/ReportView.tsx:249-253`:

```tsx
{indonesianCountLabel(
  report.counts.unbranded_mentioned,
  report.counts.unbranded_total,
)}
```

`unbranded_mentioned` is **not** "appeared in unbranded questions". Per
`contracts.ts:1088-1092` it counts observations that are `appearance ===
"mentioned"` **and** `recommendation !== "recommended"` — i.e. mentioned *but
not* recommended.

The settled measure is unbranded **appeared**. The reference implementation is
the fixture, which the Indonesian contract was approved against:
`src/lib/fixture-journey/adapter.ts:242-245` (`unbranded.filter(appeared)`,
where `appeared` is `appearance === "mentioned"`) rendered at
`src/app/audit/fixture/FixtureReportView.tsx:218-224`.

Concrete consequence on the run that just executed
(`report-pipeline-output.json`): `unbranded_recommended: 3`,
`unbranded_mentioned: 0`, `unbranded_total: 5`. The live report renders
**`0/5` — "Tanpa menyebut bisnis Anda"**, while the correct value is **`3/5`**.
The report's own headline says "Bisnis Anda muncul di 8 dari 10 pertanyaan" and
its own conclusion says the business "ditemukan dan direkomendasikan" — a
reader sees 0/5 directly under a headline of 8/10 and a conclusion that says it
was recommended. This is exactly the C-4 class of defect the original review
called blocking, now in the product surface instead of a markdown file.

**Fix:** derive unbranded appeared and branded appeared the same way the
fixture does, or add the counts to `contracts.ts` `buildAuditReport` so the
view never derives them. Do not leave the numerator as `unbranded_mentioned`.

### N-2 (Major) — the headline emphasis is inverted, and it breaks the layout

`ReportView.tsx:242-247`:

```tsx
<strong>{indonesianHeadline(appearanceCount)}</strong>
<span>{indonesianCountLabel(appearanceCount, observations.length)}</span>
```

`audit.module.css:764-770` styles `.resultGrid strong` at
`font-size: clamp(2.5rem, 4vw, 3.6rem)` in a serif face, inside a `1.4fr`
grid column with `min-height: 9.5rem`. That slot is a big-number slot. The full
sentence "Bisnis Anda muncul di 8 dari 10 pertanyaan" now renders at 40–58px in
that column, and the actual figure "8/10" renders in the 0.76rem `<span>`.

The settled fixture does the reverse — `FixtureReportView.tsx:202-209` puts
`indonesianCountLabel(...)` in `<strong>` and `indonesianHeadline(...)` in an
`<h3>`. AC-16 asks for **both** the sentence and **X/10**; the figure is the
one that belongs in the display slot.

**Fix:** mirror the fixture structure (`<strong>` = `X/10`, heading =
sentence), and add the supporting `.resultNote` copy if you want parity.

### N-3 (Minor) — `appearanceCount` is re-derived in the view

`ReportView.tsx:162-164` counts `report.details.filter(d => d.appearance ===
"mentioned")` in the presentation layer. `report-labels.ts:1-12` states
explicitly that these helpers "NEVER recompute, reinterpret, or re-derive
evidence (no counting appearances)". The headline number is now derived
client-side from an unvalidated projection instead of read from validated
report facts. Move the count into `buildAuditReport`'s `counts`/`facts` and
read it from there.

---

## 3. Findings from the original review that are still open

### O-1 (Critical, was C-1, half fixed) — the run still does not travel through the interface

`scripts/sozo/sozo-live-run.spec.ts:496` still calls `runAuditObservations`
directly and `:685` still calls `createValidatedAuditReport` directly. There is
no HTTP request to `/api/audit/run` or `/api/audit/report` anywhere in the
file, so the run still bypasses:

- `src/middleware.ts` (the access gate),
- `run/route.ts:20-45` (Indonesian pack validation, resume dedup, server-side
  budget folding),
- the route-level request schemas.

Phase 3's Outcome sentence is "one real Indonesian business travels **through
the same interface**". Calling the library and calling the product are still
two different claims. The added in-pipeline gate closes the *gate* half of C-1;
it does not close the *interface* half.

Related, and worth fixing in the same pass: the in-pipeline gate is conditional
on language (`report-pipeline.ts:120`):

```ts
if (input.language === "id") {
  assertReportGenerationGate(input);
}
```

"No synthesis spend on a partial evidence set" is not a language-specific
invariant. Make it unconditional and extend the new test to the English path.

**Fix:** drive the Sozo run (or a fresh equivalent run) through
`POST /api/audit/run` and `POST /api/audit/report` against a locally running
server with `NUAVE_ACCESS_CODE` set, and record the HTTP status and the
access-gate 401 for an unauthenticated call in the run record.

### O-2 (Critical, was C-3/AC-21) — the Indonesian report is still stamped `plain-en-v1`

`contracts.ts:1181` hardcodes `writing_standard_version:
REPORT_WRITING_STANDARD_VERSION`, which is `"plain-en-v1"`
(`report-language.ts:4`), regardless of which label pack `buildAuditReport`
receives. `contracts.ts:1186-1187` likewise stamps `prompt_contract_version:
"deterministic-v4-en"`.

The 2026-08-18 output proves it: `report-pipeline-output.json` carries
`"writing_standard_version": "plain-en-v1"` and `"prompt_contract_version":
"deterministic-v4-en"` on a fully Indonesian report validated against the
Indonesian calibration.

Two comments are now false and must be corrected in the same change:

- `types.ts:353-354` — "The live route uses plain-id-v1" (it does not).
- `report-language.ts:285-286` — "this calibration ... is NOT wired into the
  live engine path (plain-en-v1 stays the runtime default)" (it is now wired,
  but the stamp was not switched).

**Fix:** thread the language through `buildAuditReport` so an Indonesian report
stamps `INDONESIAN_REPORT_WRITING_STANDARD_VERSION` (`plain-id-v1`), add an
Indonesian prompt-contract version, and assert the stamp in a test.

### O-3 (Critical, was AC-17) — the assessed-denominator rule has no live implementation

`ReportView.tsx` renders four summary tiles: headline, unbranded, branded, and
failed count. It renders **no** recommendation, comparison, or information
measure at all, and it dropped `unbranded_recommended` (the "how many searches
recommended you" number) entirely — that measure now appears nowhere on the
live report.

AC-17 requires those three measures to use **eligible** denominators and to
render **Tidak diuji** on an empty denominator. On the live surface:

- there is nothing to apply the rule to, and
- `indonesianCountLabel` (`report-labels.ts:76-84`) only returns `Tidak diuji`
  when the denominator is `<= 0`; the view always passes a raw total, so
  `Tidak diuji` can never appear.

The fixture has both pieces: `measureLabel` (`FixtureReportView.tsx:60-66`,
keyed on *assessed* counts) and the `dimensionList` block. Port them.

### O-4 (Major, was AC-24) — the verification record is still Pending

`specs/003-live-report-quality-gate/VERIFICATION.md` does not exist.
`specs/003-live-report-quality-gate/SPEC.md:809-813` still reads
`Verification artifact / Result / Date / Verified commit — Pending`. Specs 001
and 002 both have a `VERIFICATION.md`; 003 does not. This is a required
deliverable, not paperwork — AC-24 and AC-26 are recorded nowhere.

### O-5 (Major, was M-1/AC-02) — the recorded test baseline still does not match reality

| Suite | SPEC.md R-33 / AC-02 baseline | Measured at `c18fe8e` |
|---|---|---|
| audit unit | 276 | **275** (18 files) |
| fixture-journey unit | 126 | **82** (4 files) |
| e2e | 31 | **33** |

`SPEC.md:43, 79, 522-523, 607` all repeat 276/126/31. The original review
established the 276/126 baseline was never reproducible from committed history.
Either reconcile the spec to the real numbers with an explanation of the
discrepancy, or explain where 44 fixture-journey tests went. Right now R-33
("the existing baseline stays green") cannot be evaluated at all.

### O-6 (Major, was M-2) — real spend still booked as USD 0.00

`specs/003-live-report-quality-gate/evaluation-results.md:126` still records
`Accounted cost (repo convention) USD 0.00` against `:123`'s
`Luna notional cost USD 0.0654`, repeated at `:60` and `:281-288`. The
carryover at `:127` is still `0.4357 (unchanged)`. Book the real figure and
advance the carryover, or delete the "repo convention" and state plainly that
evaluation spend is excluded from the session ceiling and why.

### O-7 (Major, was M-3) — session cost accounting is still client-supplied

`run/route.ts:20-29` and `report/route.ts:21-27` still accept the full `budget`
object, including the `calls` array, from the request body. No server-side
store exists. A client posting `calls: []` restores full headroom, so the
"USD 5 per-session ceiling" is per-request. `.env.example:17`
(`OPENAI_AUDIT_CARRYOVER_COST_USD=`) is still blank and labelled Optional, so
the carryover floor is unenforced in a default deployment.

### O-8 (Major, was M-5) — confirmed as a real behaviour, not a documentation error

The new run's `telemetry.json` records `main_run.summary.web_search_calls: 11`
across 10 observation calls with 0 retries. Per-observation:
`NUAVE-BRAND-VALIDATION-02` recorded `web_search_calls: 2` on attempt 1, every
other question recorded 1.

`AUDIT_CALL_LIMITS.observation.max_tool_calls = 1` (`telemetry.ts:40`) is
passed to the provider at `openai.ts:364`, but it did not bind. So the original
"11 searches for 10 single-attempt observations" was not a bookkeeping mistake
in a hand-written doc — the cap is advisory in practice. Decide whether the cap
is a real constraint (and enforce/verify it) or a soft hint (and stop stating
it as a limit in the method record).

### O-9 (Major) — no test covers anything the fix added

The only test added is the gate test (`report-pipeline.test.ts:35-50`). A grep
across `src/lib/audit/*.test.ts` for `language: "id"`,
`INDONESIAN_AUDIT_REPORT_LABELS`, and `validateIndonesianReportLanguage`
returns nothing outside that one file. There is still no test that:

- `createValidatedAuditReport({ language: "id" })` produces Indonesian facts
  labels and an Indonesian method summary;
- the Indonesian report stamps the Indonesian writing standard (this is why
  O-2 shipped);
- `ReportView.tsx` renders the headline, the two component measures, the
  `Tidak diuji` rule, or the Download PDF action (this is why N-1 and N-2
  shipped — a component test comparing the tiles against a fixture report
  would have caught both).

`report-language-id.test.ts:215-264` remains the tautological suite the
original review flagged (§5.1): it asserts constants equal their own literals.
Now that the symbols have production consumers, replace those assertions with
assertions against rendered output.

### O-10 (Minor, unchanged) — m-1 and m-2

- `provider.ts:50-51`: `NUAVE_LIVE_PROVIDER_TESTING=1` still re-enables
  Gemini/Groq on the protected live path. R-13 says "cannot be selected".
- `openai.ts:55-58`: the `OPENAI_API_KEY` check still throws lazily inside
  `client()`, called from inside `executeAuditPrompt`'s try block, so a missing
  key is classified `temporary` and burns 3 attempts × 10 questions. R-13
  requires startup/deployment to fail closed.

### O-11 (Minor, was AC-03) — the run surface is still English, now with one Indonesian sentence spliced in

`AuditStages.tsx:789` appends "Browser tetap harus terbuka: menutup tab
menghentikan proses, tanpa kelanjutan di latar belakang." to an otherwise
English paragraph. `:799` and `:805` still embed "Belum berhasil diuji" and
"Minta bantuan" inside English sentences. The report is now Indonesian and the
journey leading to it is not — AC-03's "same customer-meaningful vocabulary"
still fails. Either translate the run surface or record an explicit decision to
defer it.

---

## 4. Housekeeping in `.secrets/sozo-live-run-2026-08-17/`

Not blocking, but it will confuse the next reviewer:

- `report.md` (2026-08-17 22:28) is the **hand-written** Indonesian report the
  original review rejected, and `report-pipeline.md` (2026-08-17 23:10) is the
  **English** machine report stamped `plain-en-v1`. Both sit next to the new
  2026-08-18 JSON output. Anyone opening the directory sees three mutually
  inconsistent reports for "the same run".
- The 2026-08-18 run produced **no human-readable artifact** — only
  `report-pipeline-output.json`. There is no markdown render and no PDF, so
  exit-gate criteria 4 ("understandable by a non-technical Indonesian reader in
  ~10 minutes") and 8 ("same facts rendered in the PDF") still have nothing to
  be applied to. Produce a rendered report (screen capture or print-to-PDF from
  `/audit`) for the run you drive through the interface.
- `run_id` is still `sozo-live-run-2026-08-17` for a run executed on
  2026-08-18, and `evidence-notes.md` still describes the 08-17 run.

---

## 5. Suggested order of work

1. **N-1** — wrong number on the live report (one-line class of fix, highest
   reader impact).
2. **N-2 / N-3** — headline structure and the derived count.
3. **O-3** — port the dimension measures and the `Tidak diuji` rule from the
   fixture.
4. **O-2** — stamp `plain-id-v1`; correct the two false comments.
5. **O-9** — add the component test and the Indonesian pipeline test, so 1–4
   stay fixed.
6. **O-1** — re-run the audit through `/audit` + `/api/audit/*` end to end,
   capture the report as a rendered artifact and a PDF, and make the pipeline
   gate unconditional.
7. **O-4** — write `specs/003-live-report-quality-gate/VERIFICATION.md` against
   that run.
8. **O-5, O-6, O-7, O-8** — reconcile the baseline, the cost accounting, the
   server-side budget, and the tool-call cap.
9. **O-10, O-11** — the two Minors and the journey-language decision.

Do not record a quality-gate pass until step 6 produces a report the product
itself rendered, and step 3 makes the numbers on it internally consistent.
