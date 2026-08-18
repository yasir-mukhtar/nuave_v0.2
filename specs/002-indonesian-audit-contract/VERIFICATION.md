# Verification: Spec 002 — Indonesian audit and report contract

> Result: **Pending founder/human re-confirmation — automated criteria pass**
> Reviewer: Adversarial review + fix pass (this record)
> Date: 2026-08-18
> Spec version or commit: `specs/002-indonesian-audit-contract/SPEC.md`, status **Approved** (founder-approved 2026-08-17)
> Implementation version or commit: this commit (`git log -1`), parent `87bb1e2` (a concurrent, unrelated Spec 001 fix pass — see "Process note" below)

## Why this record replaces the 2026-08-17 verification

An adversarial review (`/tmp/nuave-phase2-adversarial-review.md`, reviewed at
`f22b8ec`) found that the 2026-08-17 verification's automated-pass claim did
not hold: 6 acceptance criteria were **NOT MET**, 2 were **PARTIALLY MET**, and
the AC-27 test-count arithmetic was measured over an inflated baseline. This
record fixes the underlying defects, adds a reproducing test per finding, and
re-measures every number against a real commit instead of a working tree
(the review's own Finding 0 — and, per the process note below, this ran into
the same class of problem a second time).

## Process note (repeat of review Finding 0)

While these fixes were in progress, a **second, unrelated** session committed
a Spec 001 ("Phase 1 adversarial-review findings") fix pass directly from the
shared working tree (`87bb1e2`). Because `git commit` was run without a
pathspec, that commit absorbed most of this session's in-progress Spec 002
edits alongside its own Spec 001 changes — one commit message, two specs'
worth of fixes, authored by two different sessions. Nothing was lost (every
fix below is present and tested), but `87bb1e2`'s message does not mention
Spec 002 and should not be read as a description of the changes in this file.
This commit contains the remainder of the Spec 002 fix pass (the Indonesian
report-label pack and calibration work, plus this file) on top of `87bb1e2`.
**Verification must be pinned to a commit, not a working tree, precisely
because this kind of concurrent-write collision is otherwise undetectable —
confirmed twice now in this spec's history.**

## Findings fixed, with reproducing tests

| # | Finding | Severity | Fix | Reproducing test |
|---|---|---|---|---|
| 1 | State validator accepted inconsistent gates (`questionsApproved` true while `factsConfirmed` false, at an earlier stage than the stage rule catches) | Major (AC-03/AC-08/R-23) | `validateFixtureJourneyState` now checks each gate's predecessor directly (`factsConfirmed && !simulatedPaid`, `questionsApproved && !factsConfirmed`), not only "stage X requires gate Y" | `state.test.ts`: "rejects a question approval flag at an earlier stage than the stage rule itself would catch" + the payment-stage variant |
| 2 | `method_summary` and six `facts.*.label` strings were Nuave-authored English, invisible on screen but shipped in the "Unduh JSON" export; `plain-id-v1` structurally could not see them; `provenance.prompt_contract_version` was pinned to the English contract on an Indonesian pack | Major (AC-21/R-26/R-45 exit gate) | `buildAuditReport` takes an injectable `AuditReportLabelPack` (defaults to the exact prior English strings — live engine unaffected); added `INDONESIAN_AUDIT_REPORT_LABELS`; `authoredReportFields`/`validateIndonesianReportBuiltFields` bring these fields into the Indonesian validator; fixture path passes `prompt_contract_version: "question-writer-v1"` | `report.test.ts`: "carries no Nuave-authored English in the report object or its JSON export" |
| 3a | Business's own domain (`kopitamansenja.example`, in `official_source_urls`) and an unspaced brand rendering (`KopiTamanSenja`) passed identity-leakage validation and classified as unbranded | Major (AC-23/R-37) | `containsIdentityToken` adds a punctuation-insensitive compact-substring fallback; identity signals now include the business's own official-source domains, not brand name/variants alone | `questions-id.test.ts`: "rejects the audited business's own domain…" + "rejects an unspaced brand rendering…" |
| 3b | Indonesian sentence-splitter treated 24-hour time notation (`08.00`) as a sentence boundary, producing spurious one-word "sentences"; `CUSTOMER_FACING_JARGON` was not checked in the Indonesian path | Major (AC-25/R-38, review Finding 7) | `sentences()` protects digit-period-digit runs before splitting; jargon check ported into `validateIndonesianReportLanguage` as a hard error | `report-language-id.test.ts`: "does not split a sentence on a decimal-like period…" + "carries the customer-facing jargon check over…" |
| 3c | 12–20 word target band produced 52 warnings on the fixture, all on short fields (titles, one-clause rows); founder surfaced with the choice; **founder decision 2026-08-18: remove the floor, keep a 20-word ceiling only, advisory** | Major (AC-25/R-38) | `sentence_target_min_words` set to `null`; validator skips the floor check when `null`; warning message text updated | `report-language-id.test.ts`: "reports over-20-word sentences as advisory warnings, with no floor" |
| 4 | `approvedPackStore` keyed on `pack_version_id` alone; `replayIndonesianQuestionPack` shallow-copied only `questions`, so mutating a replay corrupted the store and every later replay; `generation` was stored by reference | Major (AC-24/R-33) | Composite key `(order_reference, pack_version_id)`; full deep clone (`cloneIndonesianQuestionPackRecord`) on both write and read; re-approval under the same key throws `IndonesianPackAlreadyApprovedError` instead of overwriting | `questions-id.test.ts`: "never lets a mutated replay corrupt the store or a later replay" + "rejects re-approval under the same order and pack version…" + "keys persistence on order and pack version together…" |
| 8 | `report-labels.ts` had zero production callers beyond run-status labels; `FixtureReportView.tsx` re-implemented `Tidak diuji`/headline/composition labels inline; no `report-labels.test.ts` existed despite being cited as AC-26 evidence | Minor (AC-26/R-40) | `FixtureReportView.tsx` now calls `indonesianCountLabel`, `indonesianHeadline`, and `INDONESIAN_REPORT_LABELS.{without,with}_business_name` instead of re-implementing them; created `report-labels.test.ts` | `report-labels.test.ts` (7 tests, including the zero-denominator branch and both throw paths) |
| 11 | `adapter.ts` hardcoded `run_status: "completed"` for every observation, ignoring the frozen record | Minor (latent) | Projects `observation.run_status` (and `run` in `kopiTamanSenjaReportContent`) instead of a literal | No red test possible: the frozen fixture type pins `run_status: "completed"` as a literal, so no input can currently exercise the other branch. See "Deliberately not fixed or only partially fixed" below. |

Findings 5 (stale v1/v2/v3 sessions) and 10 (`not_assessed → not_recommended`
projection reaching the export) were already fixed by the concurrent Spec 001
session's commit (`87bb1e2`) before this pass reached them; both are verified
still fixed by the current test suite (`state.test.ts`'s legacy-purge tests,
`report.test.ts`'s `recommendation` assertion).

## Deliberately not fixed or only partially fixed, and why

- **`businessBriefSchema.language: z.literal("en-US")` (`types.ts`) and
  `kopiTamanSenjaBrief.language: "en-US"` (`adapter.ts`).** Changing this
  literal touches a shared live-engine contract (the schema every English
  brief is validated against), which the fix brief scoped out ("do not alter
  live-engine contracts"). Left as-is; a real fix requires widening
  `businessBriefSchema.language` to accept `"id-ID"` as a Phase 3 decision.
- **`deriveSystemParts`'s "model unavailable" and multi-system "and" join
  remain English inside the Indonesian method summary.** These only appear
  when no system completed or multiple systems mixed in one run — neither
  happens in the fixture (single always-available provider) — so the leak is
  real but unreachable today. Documented, not fixed.
- **`failure_reason`/`telemetry: []` in the observation projection stay
  hardcoded**, unlike `run_status`. The frozen fixture's per-attempt telemetry
  shape does not map 1:1 onto `AuditObservation.telemetry`, and the fixture
  never records a failure, so there is no frozen source value to project yet.
- **R-29/R-36 (no regeneration on refresh) has no cache.**
  `generateIndonesianQuestionPack` calls the provider unconditionally; no
  suggestion cache keyed on `(order_reference, fact_version_id)` exists. Per
  the fix brief, this is free with the stubbed provider and becomes a cost
  defect only once Phase 3 wires a paid provider — left for that phase.
- **Finding 9 (evidence reconciled to hit 5/5)** required no fix: it is
  disclosed in `docs/drafts/00-journey-fixtures.md`, the excerpts remain
  verbatim end-to-end, and `report-golden.ts` is untouched. No action taken.
- **AC-29/AC-30 (human trust review, native-language judgment).** The founder
  signed off on 2026-08-17 against report content that has since changed
  (Indonesian `method_summary`/facts labels now exist; the sentence-length
  floor was removed same-day by the founder). The underlying journey copy on
  screen is unchanged, but the full report object is not what was signed off
  on. Recommend a short re-confirmation rather than treating the 2026-08-17
  sign-off as covering the current object; not re-litigated here since it is
  a human gate, not an automated one.

## Acceptance results (re-verified criteria only; others unchanged from 2026-08-17)

| AC | Result | Evidence |
|---|---|---|
| AC-03 — Canonical order | **Pass** | `state.test.ts`: converse gate checks now reject the crafted `{stage:"facts", factsConfirmed:false, questionsApproved:true}` state the review reproduced. |
| AC-08 — Question gate | **Pass** | Same fix; the run-ready panel can no longer render on a session that never approved the pack. |
| AC-21 — Indonesian journey copy | **Pass** | `report.test.ts`: `method_summary` and all six `facts.*.label` strings are Indonesian; JSON export contains no "We tested" / "Recommended in" fragments. |
| AC-23 — Generation boundary | **Pass** | `questions-id.test.ts`: the business's own domain and an unspaced brand rendering are now caught as `identity_leakage` and classified `menyebut_bisnis_anda`. |
| AC-24 — Pack persistence | **Pass, with a scope note** | Deep-clone on write and read make the store un-corruptible by a mutated replay; composite keying stops cross-order collision. Still an in-memory `Map` — no process-restart durability. That gap is disclosed here explicitly (it was not in the 2026-08-17 record); durable persistence stays Phase 3/4 per the original design comment. |
| AC-25 — Report-language calibration | **Pass, band redefined** | Jargon check now enforced; sentence-splitter bug fixed; target band redefined by founder decision 2026-08-18 to a 20-word ceiling with no floor (was 12–20). `field_word_limits` remains `null` (founder-approved 2026-08-17, unchanged). |
| AC-26 — Label translation | **Pass** | `report-labels.ts` now has real production callers in `FixtureReportView.tsx` and a dedicated test file exercising every function including the zero-denominator branch. |
| AC-27 — Engine regression | **Pass, re-measured against a commit** | See "Checks run" below. The 2026-08-17 record's `276/276 (19 files) — 208 baseline + 68 new` arithmetic is not reproduced or relied upon; this record reports only directly-measured, reproducible counts. |

## Checks run

All against this commit (parent `87bb1e2`):

| Command | Result |
|---|---|
| `npm run test:audit` | **274/274 passed (18 files)** |
| `npx vitest run src/lib/fixture-journey` | **82/82 passed (4 files)** |
| `npm run test:e2e` | **33/33 passed (28 enabled + 3 forced-failure + 2 disabled)** |
| `npm run check` | Passed: typecheck clean, lint 0 errors (12 pre-existing warnings, unrelated to this pass), Prettier clean |

Reference point: at `f22b8ec` (pristine, pre-Phase-1-commit), `npm run
test:audit` was 263/263 (17 files) and `npx vitest run
src/lib/fixture-journey` was 71/71 (4 files) — both baselines the fix brief
set. Neither regressed; both grew from fixes and their reproducing tests, plus
one new file (`report-labels.test.ts`) and Spec 001's concurrent work.

## Verdict

**Automated criteria pass at this commit.** AC-24's persistence gap is now
disclosed rather than implied fixed. AC-29/AC-30 (human gates) were completed
2026-08-17 against report content that has since changed in this pass;
recommend a short founder re-confirmation of the current report object before
treating AC-29/AC-30 as covering it. The next capability remains
`003-live-report-quality-gate` (Phase 3); this pass does not change Phase 3
scope or touch the live engine, provider orchestration, or cost controls.
