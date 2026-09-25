# Spec 012 B1 — implementation result

2026-09-25. **Worker PASS: offline B1 candidate complete.** Next: focused
independent B1 implementation review. This is not independent acceptance,
merge readiness, or verification of all of Spec 012.

## Objective and base

B1 / block 3a: up to ten evidence-led findings and actions without padding, and
the final truthful identity/date/header and contents for direct-ten reports.
B2 templates, the zero-priority synthesis contract, the usefulness gate and
answers-only recovery are not implemented.

- Candidate: `/private/tmp/nuave-spec012-b1-M1I6nTcs/repo`, branch
  `codex/spec012-b1-report-content`, unstaged and uncommitted.
- Base: freshly fetched `origin/main` `8907d96d10ca101f6fdd68c8c77607cd994d83f3`.
  Rechecked before handoff: unchanged, no drift.
- Approved spec: `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`,
  SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110` (matches).

Entry gates. These were verified with `git merge-base --is-ancestor` and read-only GitHub queries:

| Gate | Result |
|---|---|
| Spec 011 PR #78 merge `7f34d69` in base | Contained |
| Report PR A (PR #74) merge `d08b9e9` in base | Contained |
| Privacy PR #79: head `dd9e405`, merge `8907d96`, MERGED | Contained. The base *is* this merge. Main run `36099502093` succeeded on `8907d96`. Privacy rule, copy and regressions are untouched. |

## Actual Spec 011 `AuditSubject` mapping (R-12/R-23)

`SmartAuditStage` passes the saved `DirectTenAuditContext` (`record.context`)
to `ReportView` as `brief: AuditSubject`. No `BusinessBrief` or second store is
built. The direct-ten header now uses the following:

- Brand: `identity.name`.
- Scope: `focus.value`, shown as whole brand `Seluruh brand <name>`, product
  `Produk atau layanan: <name>`, or location `Lokasi: <name> — <address>`.
- Market: `contextMarketLabel`. `seluruh` gives `seluruh Indonesia`, `luar`
  gives `Indonesia dan luar negeri`, and `sekitar`/`beberapa` give the confirmed
  areas. Location focus has `market: null`, so nothing is shown.
- Optional meanings (target customer, needs, considerations, comparators,
  differentiator, public fact) are not used in the header. Absent values stay
  absent, and no agency logo or "Dibuat oleh" appears for direct-ten.

Historical `BusinessBrief` records keep their existing header, including
agency, `Tanggal audit` from `generated_at`, and the old contents labels. The
v1 delivery and resume hold is unchanged.

## What changed

| File | Change |
|---|---|
| `src/lib/audit/types.ts` | `REPORT_CONTENT_MAX_ITEMS = 10`. Findings maximum, priorities maximum and `priority.order` maximum go from 5 to 10. The minimum of 1 is unchanged. The stale AC-17 measures comment is corrected: direct-ten recommendation counts every completed answer. No arithmetic changed. |
| `src/lib/audit/report-prompt-contract.ts` | `DIRECT_TEN_REPORT_CONTENT_INSTRUCTIONS` / `reportContentInstructions(method)`. These are direct-ten only: 1–10 items, three stay three, no padding, and `why`/`basis`/`owner`/`done_when`/`caveat`/actual IDs. They also say absence is not a defect diagnosis, confirmed context is not verified fact, and late caveats are kept. `reportPriorityCountInstruction` replaces only the count sentence for direct-ten and keeps each adapter's observed-gap clause verbatim. |
| `openai.ts`, `gemini.ts`, `groq.ts`, `openrouter.ts` | Report instructions only: content guidance and a method-aware count. Groq has no count sentence to change. Provider routing, models, transports, observation, extraction and v2 routing are unchanged: v2 still goes only to OpenAI, and other adapters still reject or don't receive v2. |
| `src/lib/audit/contracts.ts` | Only the synthesis-version constants: `REPORT_SYNTHESIS_PROMPT_VERSION` `report-synthesis-v4` → `report-synthesis-v6`, and `_V2` `report-synthesis-v5-context` → `report-synthesis-v6-context`. |
| `src/app/audit/ReportView.tsx` | Direct-ten header and contents only. It shows the `AI Visibility Report` title, exact brand and scope, and no agency block. `Tanggal pengamatan` shows the earliest–latest retained `observed_at` in UTC. It also shows `Sistem yang diuji` and `Model jawaban` from the same validated answers. Contents are `Hasil singkat` → `Jawaban model AI` → `Analisis Nuave` → `Yang dapat dilakukan` → `Tentang audit ini`, with the existing report-local focus and scroll handler. |
| `src/app/audit/report/report-header.ts` (new) | Pure helpers: `observationWindow` (no sorting or mutation; any invalid instant returns null) and `formatObservationWindow` (named UTC display timezone). |
| Tests | Listed below. `report-gaps.test.ts` "rejects more than five" became "accepts ten, rejects an eleventh", which is the R-10 boundary and still rejects. `contracts.test.ts` updates the recorded version string. |

Version provenance: the only reachable path for new reports is v2 context to
OpenAI. It records `report-synthesis-v6-context` in `report.provenance`
(`report-pipeline.ts:505`). Legacy-brief synthesis records
`report-synthesis-v6`. It is bumped too because the shared schema bound it
validates against changed. Its non-direct-ten instruction wording is otherwise
byte-identical. Old saved provenance is untouched.

Language calibration was rechecked on the base (`report-language.ts:316–334`)
and matches the spec: `sentence_target_min_words: null`,
`sentence_target_max_words: 20`, hard ceiling `REPORT_MAX_SENTENCE_WORDS = 25`,
`field_word_limits: null`. The existing `report-language-id.test.ts` asserts it.
No description correction or language change was needed.

Unchanged (read-only): gap validation, repair, pipeline, `LocalAuditStage`,
`AuditRunStep`, exporter, intake/projection, source fetch, observation code,
privacy rules, dependencies, global typography, session storage and CSS.

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| **AC-11** | Pass | `report-prompt-contract.test.ts`: 3 stay 3, 10 and order 10 pass, 11 and order 11 fail, and 0 findings or 0 priorities fail in `reportSynthesisSchema`/`reportContentSchema`. The OpenAI structured-output JSON schema carries `maxItems: 10`/`maximum: 10`. `report-gaps.test.ts` covers a full 10-priority report passing and 11 failing. Existing positive-only-action, empty-content and recovery suites pass unchanged in `verify`. |
| **AC-12** | Pass | Mocked request capture for all four adapters, initial and language-only retry: `openai.test.ts` (v2 context, version `report-synthesis-v6-context`, gap clause kept, retry keeps draft priorities and the evidence/order/timing/owner instruction), and `gemini`/`groq`/`openrouter.test.ts` (fetch capture). Historical requests keep "no more than five" and get no direct-ten guidance. The guidance doesn't advertise a non-corrective exception. Calibration constants are asserted by the existing `report-language-id.test.ts`. The protected observation-message test still passes. |
| **AC-13** | Pass | `report-body.test.tsx` "Spec 012 B1 final header" covers whole-brand, product and location scope. It has no invented optional values and nonchronological retained times across two dates. The header shows `21 September 2026, 23.05 – 22 September 2026, 10.45 UTC`, answers stay in retained order, creation time appears only in `Tentang audit ini`, and two different returned models are listed. The requested model is not shown as the answer model. An invalid instant gives `Tidak tersedia` plus the existing unavailable body. The historical header is unchanged. |
| Inherited A / AC-10 | Pass | Spec 012 browser test: full answers, references, exact raw/copy, inert Markdown, safe sources, historical routing, report-local contents by mouse and keyboard, JSON v5 context, one print tree. Request counters stay at run 1 and report 1 across read/raw/copy/nav/print/export/Back/reload. New assertions cover contents order, title, no "Dibuat oleh", and the header time equal to the earliest retained `observed_at`. |
| B1 AC-19 | Pass (offline) | Diff is within the B1 allowlist plus the named helper and tests, with no dependency, lockfile, schema-field or storage change. Base and approval SHAs are recorded above. `npm run verify` passes. |

Reproduction before the fix:
- `../evidence/red-contract.log`: the new contract tests fail on base sources at import, because the helpers and constant did not exist.
- `../evidence/red-header.log`: three new header tests fail against the base `ReportView.tsx` (identity/date/creation time, contents order, invalid-date state). The scope and historical tests pass on both, as expected.

## Validation (Node v22.23.2, npm 10.9.8, locked `npm ci --offline`)

Commands ran with `env -i` (no real credentials), synthetic mode and dummy keys
from the repo's offline harness. There were no live calls or source fetches.

| Check | Result | Log (outside product tree) |
|---|---|---|
| Focused Vitest (contract, adapters, report body) | 92 + 19 + 51 pass | console, reproduced in `verify.log` |
| Focused browser: `new-intake-glm` + `smart-intake` | 13 passed | `browser-focused.log` |
| **Final `npm run verify`** | **PASS**, exit 0: 93 files / **1,429 unit tests**, Next and OpenNext builds, **29 + 3 browser tests**. Lint has 0 errors and 23 warnings; the one in a changed file (`new-intake-glm.spec.ts:117`) already exists on base. | `verify.log` (SHA-256 `67a43f74…f8f9`) |
| `git diff --check`, empty index | Pass | — |

Evidence root: `/private/tmp/nuave-spec012-b1-M1I6nTcs/evidence/`.

- Code patch `b1-code.patch` (SHA-256 `11df20b3…1f28`) covers all 18 code and test files, including the new helper. This record and the `VERIFICATION.md` entry are not in the patch.
- `changed-file-hashes.txt` lists per-file SHA-256 values. It was taken after the final code/test change and matches the verified candidate. Only these two documents changed afterwards.

Visual/print evidence (fictional Kedai Fiksi, synthetic):

- `header-capture/header-{1440,390,320}.png` (scratch spec `header-capture/header.spec.ts`, run from outside the tree against the repo's server config). I inspected all three. Title, brand, scope, observation date in UTC, system, model and contents all appear in body order. No horizontal overflow occurred (asserted), and keyboard Tab moves between contents links.
- `header-200-percent-css.png` uses CSS `zoom: 2`, an approximation rather than native browser zoom.
- `browser-focused/…/report-{1440,390,320}.png`, `answer-*.png` and `report-200-percent.png` come from the existing test.
- `browser-focused/…/report-print-a4.pdf` has **11 pages** (SHA-256 `257944bc…0493`), rendered by the Chromium print engine. Runtime files were unchanged between that run and the final `verify`; only a test file changed. I rendered all pages with macOS PDFKit (`render-pdf.swift` → `pdf-pages/`) and inspected every page:
  - The header facts appear on page 1, and the contents nav stays hidden in print, as before.
  - Each answer start and final caveat appears once and in order (`pdf-text-check.json`; the end marker is split by PDFKit glyph ordering, so the whole final-caveat sentence was counted).
  - No controls or duplicate raw body appear, and there is no clipping. Tables, URLs, lists and code reflow.
  - Section headings stay with their content. `04 Yang dapat dilakukan` and its action share page 10.
- `window.print` was only spied. The native OS Save dialog was not exercised.

## Observations and limits

- Gemini's `zodSchemaToGemini` already sends a degenerate `responseSchema`, with every field typed as a nullable STRING and no item bounds. B1 doesn't fix it, because it's outside the instruction-only allowlist, and Gemini remains testing-only and unable to take v2. Its output is still checked against the widened shared schema afterwards.
- Mocked responses prove request content and rendering, not better real synthesis or owner usefulness. AC-18 founder before/after judgment and B2 remain pending for combined Spec 012.
- The synthetic run has one shared observation instant, so its live header shows a single time. Ranges are covered by unit tests.
- `docs/NOW.md` and `docs/INDEX.md` were not edited. Status on main doesn't change until this candidate is reviewed and merged.
- No commit, push, PR, merge, deployment, live call or spend. Accounting stays USD 1.06241155 of 5.

## Reviewer handoff

Review the unstaged candidate at `/private/tmp/nuave-spec012-b1-M1I6nTcs/repo`
against base `8907d96` and the pinned approved spec (R-10–R-12, R-16–R-19,
AC-11–AC-13, inherited A, B1 AC-19). Use `b1-code.patch` and
`changed-file-hashes.txt` to confirm parity. Focus on these:

1. `reportPriorityCountInstruction` keeps the observed-gap clause and never advertises B2.
2. The version choice and provenance recorded for v2.
3. The header date path (`report-header.ts`, `ReportView.tsx` presentation reuse) against invalid or nonchronological data.
4. Report-local contents navigation and the unchanged historical header.

Rerun focused suites in a clean copy. Reuse `verify.log` unless something changes.
