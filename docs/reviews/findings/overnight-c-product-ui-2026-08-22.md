# Overnight Review C — Product & Client

## 1. Executive summary

**Verdict: FAIL**

The frozen client/product implementation is not ready to be relied on as a complete customer audit path. The review verified **14 findings** from **15 raw worker findings**: **0 P0, 10 P1, 4 P2, 0 P3**.

Highest-risk themes:

1. **Run-state recovery can strand or destroy recoverable work.** A pre-stream run failure leaves the UI trapped in the run stage; a failed resume can erase preserved completed observations; and an in-flight question-generation response can restore stale state after the user navigates back.
2. **The live audit surface does not consistently enforce the product contract.** The audit begins without the required final confirmation boundary, raw technical failure text reaches customers, the live shell is substantially English and declares `lang="en"`, and the live report omits contracted evidence structure.
3. **A preview route is not isolated.** `/audit/spec004` is directly reachable and issues real audit extraction API requests.
4. **Public surfaces are materially inconsistent with active behavior.** The FAQ identifies the wrong model and describes unimplemented payment/email delivery; legal pages contain unresolved placeholders; `/audit` loads a third-party hero image; and the closed mobile menu remains keyboard-focusable.

No P0 was found. K-01 through K-10 were not re-reported.

## 2. Scope and frozen baseline

- Repository: `https://github.com/yasir-mukhtar/nuave_v0.2`
- Frozen application baseline: `028aaa72149c81d71b940adfcb16bd144f0df047`
- Review branch: `review/overnight-c-product-ui`
- Review mode: review only; no production code, tests, CSS, config, deployment, merge, PR, or provider calls
- Active surfaces reviewed:
  - C1 — live `/audit` state machine and recovery
  - C2 — live audit UI semantics and accessibility
  - C3 — fixture/demo isolation
  - C4 — landing and public product surfaces
- Excluded:
  - abandoned prototypes and archives
  - subjective aesthetic critique
  - future dashboard/account/payment infrastructure
  - known roots K-01 through K-10

## 3. Recovery note

The original four-lane review completed, but the Sol synthesis stalled before the report was persisted. This recovery run reused the existing worker outputs, challenged their cited source paths, deduplicated and severity-adjusted the candidates, and wrote the final report. It did not restart the broad review.

- C1: **available**
- C2: **available**
- C3: **available**
- C4: **available**
- Lane rerun: **none**

## 4. Execution metrics

### Parallel execution

All four Luna/Medium workers started concurrently at `2026-08-22 22:11:56`. The fan-out completed in **231.59 seconds** wall time.

| Lane | Runtime | Tool/API calls | Raw findings |
|---|---:|---:|---:|
| C1 | 154.98 s | 9 | 3 |
| C2 | 225.90 s | 21 | 7 |
| C3 | 231.31 s | 16 | 1 |
| C4 | 225.58 s | 15 | 4 |
| **Total** | parallel wall time 231.59 s | **61** | **15** |

- Parallel execution: **yes**
- Raw findings: **15**
- Accepted findings: **14**
- Rejected findings: **1**
- Severity downgrades: **2**
- Token counts: **not exposed by the available delegation records; not invented**
- Provider calls from the reviewed application: **none**
- Browser E2E with live providers: **not run**

## 5. Verified findings

### C1-01 — Initial run failure strands the workflow

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/AuditWorkflow.tsx:843-857, 862-925`; `src/lib/audit/stream.ts:162-172`
- **Finding:** A failure of the initial `POST /api/audit/run` moves the client into the run stage before the request is accepted and provides no run retry or safe return path.
- **Evidence:** `runAudit()` sets `executionStarted=true` before `fetch`. Its catch sets only `error`; it does not reset `executionStarted`. `deriveAuditStep()` prioritizes `executionStarted` and returns the run step. `AuditRunStep` has report-retry controls but no run-start retry control.
- **User path:** `/audit` → confirm facts → approve questions → select **Run the audit** → request fails before the first stream event.
- **Reproduction:** Intercept or abort the first `POST /api/audit/run` before any stream event. The error appears while `executionStarted` remains true. Refresh restores the persisted run-stage state with no observations and no recovery control.
- **Impact:** A transient request failure can strand the active workflow and force start-over or manual support.
- **Existing coverage:** Server orchestration is covered; no live UI test covers a pre-stream run failure.
- **Known-root relationship:** Independent of K-01; this is a failed-start transition, not stale work surviving reset.
- **Recommendation:** Do not commit the client to the run stage until request acceptance/first valid event, or add an explicit recoverable run-start error state preserving the approved pack.

### C1-02 — Failed resume erases preserved completed observations

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/AuditWorkflow.tsx:425-460, 847-877, 917-925`
- **Finding:** A resume attempt clears the displayed and persisted observation list before the resume request succeeds; if that request fails, previously completed observations are lost from session recovery.
- **Evidence:** `resumeObservations` is captured from completed observations, then `setObservations([])` runs before `fetch`. The catch does not restore the captured observations. The persistence effect subsequently writes the empty list.
- **User path:** Interrupted run with completed observations → resume/retry → resume request fails before streaming.
- **Reproduction:** Seed a restorable workflow with `executionStarted=true` and completed observations. Trigger the resumed run and abort `POST /api/audit/run` before the first chunk. Inspect `nuave.audit.workflow.v7` after state persistence: `observations` becomes empty.
- **Impact:** Recoverable evidence is destroyed locally, increasing rerun/cost risk and preventing safe continuation.
- **Existing coverage:** Server resume behavior is tested; failed client resume persistence is not.
- **Known-root relationship:** Independent of K-01/K-02; the client destroys its resume source before the server can use it.
- **Recommendation:** Keep completed observations in durable state while the resumed request is pending; use a separate stream buffer or restore the snapshot on failure.

### C1-03 — Back navigation accepts a stale question-generation response

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/AuditStages.tsx:341-365, 606-618`; `src/app/audit/AuditWorkflow.tsx:656-692, 1107-1118`; `src/lib/audit/stream.ts:162-172`
- **Finding:** The **Change website** action remains enabled during prompt generation. A late response can repopulate `promptPack` after the user has navigated back, producing an impossible `factsExtracted=false` plus prompt-pack state.
- **Evidence:** The back button has no `busy` guard. `generatePrompts()` sets `busy="prompts"` but does not abort or identify the request. The response unconditionally calls `setPromptPack(pack)`. The back handler only calls `setFactsExtracted(false)`, while `deriveAuditStep()` prioritizes `hasPromptPack`.
- **User path:** Facts review → **Create 10 audit questions** → immediately **Change website** → delayed response completes.
- **Reproduction:** Delay `POST /api/audit/prompts`, click **Change website**, then release the response. The client advances to Questions using the old brief while `factsExtracted` remains false; the inconsistent state is persisted.
- **Impact:** A user can proceed with questions generated from a workflow state they intentionally left.
- **Existing coverage:** No test covers back navigation during pending question generation.
- **Known-root relationship:** Independent async-navigation race; not K-01.
- **Recommendation:** Disable back navigation while prompt generation is pending or abort/invalidate the request and ignore results after leaving the stage.

### C2-01 — Live audit starts without the required final confirmation boundary

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/AuditStages.tsx:625-714`; `src/app/audit/AuditWorkflow.tsx:812-878`; `docs/PRODUCT.md:163-168`; `docs/JOURNEY_CONTRACT.md:30-31, 87-88`
- **Finding:** The live Questions screen invokes `runAudit()` directly from one button press without the required explicit run confirmation dialog.
- **Evidence:** `QuestionsStep` binds **Run the audit** directly to `onRun`. `runAudit()` immediately sets `executionStarted=true` and starts the API request. The product contract requires approval of the exact ten questions and atomic acceptance of **Mulai audit sekarang**.
- **User path:** `/audit` → confirm facts → review questions → select **Run the audit**.
- **Reproduction:** Select the live launch button once. The request begins without a confirmation dialog, cancel path, Escape handling, or restored focus.
- **Impact:** The irreversible evidence-producing boundary can be crossed accidentally.
- **Existing coverage:** The fixture has a `RunStartDialog`; the live flow lacks equivalent acceptance coverage.
- **Known-root relationship:** None.
- **Recommendation:** Put the live request behind the required confirmation dialog and explicit final action.

### C2-03 — Raw technical failure text is rendered to customers

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/AuditRunStep.tsx:125-141`; `src/lib/audit/telemetry.ts:350-390`
- **Finding:** Observation `failure_reason` is rendered verbatim in a customer-facing question row.
- **Evidence:** `AuditRunStep` prints `observation.failure_reason`. `failedCallTelemetry()` derives this field from `input.error.message`, which may contain provider, network, HTTP, or implementation exception text.
- **User path:** A live audit question exhausts technical retries.
- **Reproduction:** Cause a timeout/provider exception that settles an observation as failed. The underlying error message appears below the question.
- **Impact:** Internal/provider terminology and unstable infrastructure details can leak to customers and conflict with the finite Indonesian status model.
- **Existing coverage:** Telemetry is unit-tested; UI sanitization is not.
- **Known-root relationship:** None.
- **Recommendation:** Render only a customer-safe failure state and recovery message; keep raw text in restricted telemetry/logging.

### C2-04 — Live audit uses the wrong document language and extensive English copy

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/AuditWorkflow.tsx:1024`; `src/app/audit/AuditStages.tsx:271-332, 341-619, 625-714`; `src/app/audit/AuditRunStep.tsx:39-108`; `docs/VOICE.md`; `src/messages/id.json`
- **Finding:** The intended Indonesian customer workflow declares `lang="en"` and exposes extensive English headings, labels, controls, and recovery copy.
- **Evidence:** The live shell explicitly uses `lang="en"`. Active examples include “Change website”, “Create 10 audit questions”, “Run the audit”, “Step 4 of 4”, and “Collecting ten independent observations.” The fixture and Indonesian catalog do not correct the live components.
- **User path:** Any user who progresses through `/audit` beyond intake.
- **Reproduction:** Complete facts, questions, and run stages. Inspect the live main element and visible controls: language metadata and most workflow copy are English.
- **Impact:** Key controls and error/recovery states do not meet the Indonesian product contract; assistive technology receives incorrect language metadata.
- **Existing coverage:** No live audit localization/catalog parity check.
- **Known-root relationship:** None.
- **Recommendation:** Set the live shell to `lang="id"` and move customer-facing live strings into the Indonesian catalog, preserving only settled English authority terms.

### C2-05 — Live report omits observed-business evidence and the required evidence structure

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/ReportView.tsx:128-532`; `src/app/audit/fixture/FixtureReportView.tsx:300-341`; `src/lib/audit/types.ts:295`
- **Finding:** The live report accepts an `AuditReport` containing `observed_competitors` but never renders that collection, and its high-level findings do not present the contract’s observation/interpretation/action separation.
- **Evidence:** Repository search finds `observed_competitors` rendering only in `FixtureReportView`, not live `ReportView`. Live key findings render title, explanation, and question IDs; priorities render action metadata separately. The underlying live report schema carries observed competitor evidence.
- **User path:** Complete a live audit whose report contains observed other businesses and evidence-backed findings.
- **Reproduction:** Render `ReportView` with a report containing `observed_competitors`. No observed-business section appears; high-level findings do not show the complete evidence triad.
- **Impact:** Contracted evidence is silently omitted and the live artifact materially differs from the protected fixture/report model.
- **Existing coverage:** Fixture rendering covers competitor evidence; no live `ReportView` test asserts it.
- **Known-root relationship:** None; this is a presentation omission, not inadequate provenance acceptance under K-03.
- **Recommendation:** Render observed-business evidence and use a canonical evidence-triad presentation for report findings/actions.

### C3-01 — `/audit/spec004` is public and performs live extraction calls

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/audit/spec004/page.tsx:4-13`; `src/app/audit/spec004/Spec004Demo.tsx:40-78, 80-120`; `specs/006-product-wide-polish/SPEC.md:518-520`
- **Finding:** The Spec 004 demo route is directly reachable without a server-side gate and performs real `GET` and `POST /api/audit/extract` requests.
- **Evidence:** The route unconditionally renders `Spec004Demo`; `robots` metadata is only indexing guidance. On mount the demo fetches the live budget, and submission sends an arbitrary source to the live extraction endpoint. Spec 006 requires this route to be fixture-backed, disabled, or removed and to issue no live extraction calls.
- **User path:** Direct navigation to `/audit/spec004` → enter a source → submit.
- **Reproduction:** Open `/audit/spec004`; observe `GET /api/audit/extract`. Submit a URL; observe `POST /api/audit/extract` containing that source and a budget payload.
- **Impact:** A preview route can consume provider budget and process arbitrary user-submitted sources outside the canonical workflow.
- **Existing coverage:** Fixture E2E covers `/audit/fixture`, not `/audit/spec004`; the fixture no-fetch source scan excludes Spec 004 files.
- **Known-root relationship:** None.
- **Recommendation:** Disable/remove the route or make it fully fixture-backed, including eliminating the initial budget request; add a no-side-effects route assertion.

### C4-01 — Public FAQ states the wrong model and an unimplemented order/delivery flow

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/faq/page.tsx:72-81, 132-153, 184-209`; `src/app/audit/page.tsx:4-12`; `src/lib/audit/telemetry.ts:10`; `src/lib/audit/questions-id-provider.ts:174-189`
- **Finding:** The public FAQ says Nuave tests GPT-4o and describes payment, email delivery, private report links, and retention as active behavior, while the protected audit model is GPT-5.6 Luna and the active `/audit` route directly renders the local workflow without checkout/delivery infrastructure.
- **Evidence:** FAQ lines 74-76 identify GPT-4o. Pricing and delivery sections contain payment/email/retention claims and unresolved placeholders. The live provider lock is `gpt-5.6-luna`; `/audit` renders `AuditWorkflow` directly.
- **User path:** Landing/footer → `/faq` → “Apa yang diuji?”, price, delivery, privacy, and report-access sections.
- **Reproduction:** Open `/faq`, read the cited sections, then follow the active CTA to `/audit`; there is no described checkout or email delivery path.
- **Impact:** Customers receive materially incorrect information about what is tested and how the product is purchased/delivered.
- **Existing coverage:** Landing handoff is covered; public-claim parity is not.
- **Known-root relationship:** None.
- **Recommendation:** Align the FAQ with current active behavior or render an explicit pre-launch state until the commercial flow exists.

### C4-02 — Public legal/support pages expose unresolved placeholders as active policy

- **Severity:** P1
- **Confidence:** High
- **Files/lines:** `src/app/terms/page.tsx:54-85, 147-190`; `src/app/privacy/page.tsx:59-106, 193-204`; `src/app/faq/page.tsx:132-153, 241-252`; `src/app/support/page.tsx`; `src/messages/id.json:151-182`
- **Finding:** Terms, privacy, FAQ, and support surfaces render unresolved operator, date/version, provider, price, payment, delivery, access, and support placeholders while presenting the pages as public policy/product information.
- **Evidence:** Active components render literal values such as `[TANGGAL]`, `[VERSI]`, `[NAMA LENGKAP PENGELOLA]`, `[HARGA TOTAL]`, `[PENYEDIA AI/SEARCH]`, `[PENYEDIA PEMBAYARAN]`, `[PENYEDIA EMAIL]`, and `[MASA AKSES]`.
- **User path:** Landing footer → Terms, Privacy, FAQ, or Support.
- **Reproduction:** Visit `/terms`, `/privacy`, `/faq`, and `/support`; bracketed unresolved values are visible to the user.
- **Impact:** Users cannot identify the operator or rely on the displayed commercial/privacy terms; future behavior is presented as current policy.
- **Existing coverage:** No E2E check rejects unresolved public placeholders.
- **Known-root relationship:** None.
- **Recommendation:** Do not present these pages as production-ready policy until founder decisions are final; otherwise render a clear pre-launch/unavailable state.

### C2-06 — “Download PDF” invokes print instead of a PDF download

- **Severity:** P2 (downgraded from worker P1)
- **Confidence:** High
- **Files/lines:** `src/app/audit/ReportView.tsx:164-173`; `src/app/audit/AuditWorkflow.tsx:1046-1050`
- **Finding:** The primary control labeled **Download PDF** calls `window.print()` and has no downloadable artifact URL or PDF readiness/error state.
- **Evidence:** Both live controls bind directly to `window.print()`; no PDF download request or link exists.
- **User path:** Complete a report → select **Download PDF**.
- **Reproduction:** Select the control; the browser print UI opens rather than a file download.
- **Impact:** The label and behavior differ, though many browsers allow “Save as PDF”; therefore this is meaningful but not a proven blocker.
- **Existing coverage:** No acceptance test verifies a downloaded PDF artifact.
- **Known-root relationship:** None.
- **Recommendation:** Relabel as print/save-to-PDF until a real artifact exists, or implement explicit PDF artifact states and download behavior.

### C2-07 — Invalid similar-business URL disappears silently on blur

- **Severity:** P2
- **Confidence:** High
- **Files/lines:** `src/app/audit/SimilarBusinessesEditor.tsx:20-40, 51-66`; `src/lib/audit/similar-businesses.ts:56-75`
- **Finding:** An invalid or incomplete URL is removed from controlled form state on blur without validation feedback.
- **Evidence:** `commitEntry()` normalizes the list and `normalizeSimilarBusinesses()` drops invalid entries. No inline error is rendered.
- **User path:** Business facts → add similar business → type an incomplete URL → leave the field.
- **Reproduction:** Enter `contoh` and press Tab. The row/value disappears without explanation.
- **Impact:** User input is silently lost and the user may proceed without the intended comparison business.
- **Existing coverage:** URL normalization is tested; editor error behavior is not.
- **Known-root relationship:** None.
- **Recommendation:** Preserve draft input and show associated validation, or require an explicit removal action.

### C4-03 — Active `/audit` performs an unrelated third-party image request

- **Severity:** P2 (downgraded from worker P1)
- **Confidence:** High
- **Files/lines:** `src/app/audit/SourceHero.module.css:48-57`; `src/app/audit/AuditWorkflow.tsx:1097-1104`; `src/app/audit/page.tsx:10-12`
- **Finding:** Opening `/audit` loads a CSS background image from `https://blume.codes/...` before the user submits a source.
- **Evidence:** `.skyField` contains the external URL and `SourceHero` is the initial active audit step.
- **User path:** Landing CTA or direct navigation → `/audit`.
- **Reproduction:** Load `/audit` with network logging and observe the request to `blume.codes`.
- **Impact:** Creates an avoidable third-party availability/privacy dependency. No sensitive form value is shown to be sent, so severity is P2 rather than P1.
- **Existing coverage:** Landing handoff tests guard audit API calls but do not enforce an external-host allowlist for `/audit`.
- **Known-root relationship:** None.
- **Recommendation:** Self-host the asset and add a public-surface network allowlist assertion.

### C4-04 — Closed mobile menu remains keyboard-focusable

- **Severity:** P2
- **Confidence:** High
- **Files/lines:** `src/components/LandingNav.tsx:20-74, 175-217`; `src/styles/landing.css:187-195`
- **Finding:** Mobile menu descendants remain mounted and focusable while the menu is visually hidden with only `opacity:0` and `pointer-events:none`; the trigger lacks `aria-expanded` and `aria-controls`.
- **Evidence:** `MobileMenu` always renders support/audit links. Closed state does not use `hidden`, `inert`, conditional rendering, or tabindex management.
- **User path:** Public page at mobile viewport → keyboard or screen-reader navigation while menu is closed.
- **Reproduction:** At width ≤768px, leave the menu closed and press Tab repeatedly; focus can enter invisible menu descendants.
- **Impact:** Keyboard users can focus or activate controls that are not visually available.
- **Existing coverage:** Mobile containment is tested; keyboard order and disclosure semantics are not.
- **Known-root relationship:** None.
- **Recommendation:** Conditionally render or apply `hidden`/`inert` while closed; add trigger disclosure attributes and restore focus on close.

## 6. Known-root extensions

No accepted finding is counted as a direct extension of K-01 through K-10. The closest candidates were deliberately separated:

- C1-01 is a failed-start transition, not stale async work after reset (K-01).
- C1-02 is client-side deletion of the resume source, not prompt-binding weakness (K-02).
- C2-05 is omission of already-present evidence in the rendered artifact, not acceptance of inadequate provenance (K-03).

The known roots remain relevant synthesis context but were not duplicated in the severity totals.

## 7. Rejected/downgraded findings

| Candidate | Decision | Reason |
|---|---|---|
| C2-02 — Browser-close interruption contradicts required durable background execution | **Rejected** | `docs/JOURNEY_CONTRACT.md:156-160` places durable run/delivery in a later phase; broad background execution is explicitly future scope for this review. The actionable current recovery defects are already captured more precisely by C1-01 and C1-02. |
| C2-06 — Print action labeled Download PDF | **Downgraded P1 → P2** | Behavior is incorrect/misleading, but browser print can produce a PDF and no universal customer blocker was proven offline. |
| C4-03 — Third-party hero image request | **Downgraded P1 → P2** | Active reachability is proven, but no sensitive form data leakage or complete workflow blockage was demonstrated. |

No finding was accepted merely because multiple workers repeated it. Fixture existence alone, aesthetic preference, hypothetical dead-code risk, and K-01 through K-10 restatements were excluded.

## 8. User-path / reproduction evidence

| Finding | Active route/path | Reproduction proof |
|---|---|---|
| C1-01 | `/audit` Questions → Run | Abort initial run POST before stream; persisted run stage has no retry |
| C1-02 | `/audit` interrupted run → resume | Abort resume POST; completed observation list is cleared/persisted empty |
| C1-03 | `/audit` Facts → generate → back | Delay prompts POST, navigate back, release response; old pack returns |
| C2-01 | `/audit` Questions | One click starts the run without final confirmation |
| C2-03 | `/audit` Run | Failed observation renders raw `failure_reason` |
| C2-04 | `/audit` stages | Main is `lang="en"`; English controls visible throughout |
| C2-05 | `/audit` Report | Report with `observed_competitors` renders no such section |
| C3-01 | `/audit/spec004` | Route mount GETs extract budget; submit POSTs live extraction |
| C4-01 | `/faq` → `/audit` | FAQ says GPT-4o/payment/email; active model/path contradicts it |
| C4-02 | `/terms`, `/privacy`, `/faq`, `/support` | Literal bracketed placeholders render publicly |
| C2-06 | `/audit` Report | Download PDF opens print UI |
| C2-07 | `/audit` Facts | Invalid similar-business URL disappears on blur |
| C4-03 | `/audit` | Network request to `blume.codes` occurs on initial hero load |
| C4-04 | Public mobile navigation | Closed menu links remain in keyboard focus order |

No provider-backed reproduction was performed. P0/P1 findings were accepted only where active component wiring and exact state/request paths were visible in source.

## 9. Tests inspected or executed

### Executed

- Orchestrator recovery run: `npm run check` — **passed**
  - TypeScript: passed
  - ESLint: 0 errors, 18 warnings
  - Prettier check: passed
- C1 worker: `npx vitest run src/lib/audit/workflow-storage.test.ts src/lib/audit/report-recovery.test.ts` — **2 files, 8 tests passed**
- C1/C2 workers: `npx tsc --noEmit` — passed
- C3 worker fixture-focused Vitest run — **5 files, 104 tests passed**
- C3/C4 workers: `npm run check` — passed with the same 18 warnings

### Inspected, not executed with providers

- `tests/e2e/live-audit-variance.spec.ts`
- `tests/e2e/forced-failure.spec.ts`
- `tests/e2e/fixture-journey.spec.ts`
- `tests/e2e/landing-audit-handoff.spec.ts`
- `tests/e2e/preview-disabled.spec.ts`
- `src/lib/audit/workflow-storage.test.ts`
- `src/lib/audit/report-recovery.test.ts`
- fixture state/adapter/report tests
- audit provider, telemetry, stream, report-pipeline, and report-gap tests relevant to cited behavior

No live provider call, deployment, or provider-dependent browser E2E was run.

## 10. Coverage ledger

| Lane | Primary active coverage inspected | Verified findings | Important coverage gap |
|---|---|---:|---|
| C1 | Workflow state, storage, stream step derivation, report recovery, live variance/forced-failure E2E | 3 P1 | Pre-stream failure, failed resume persistence, pending-generation navigation |
| C2 | Run UI, audit stages, report view, similar-business editor, audit CSS/UI primitives, Indonesian catalog | 4 P1, 2 P2; 1 rejected | Live run confirmation, customer-safe failure rendering, live localization, complete report evidence, real download behavior, invalid-form feedback |
| C3 | Fixture route/config/state, golden fixtures, Spec 004 demo, fixture E2E/import edges | 1 P1 | `/audit/spec004` no-side-effect/access-gate assertion |
| C4 | Landing/public pages, metadata/robots/sitemap, assets, landing handoff and preview-disabled E2E | 2 P1, 2 P2 | Public claim parity, placeholder rejection, external-host allowlist, mobile keyboard traversal |

Checked clean:

- Canonical `/audit/fixture` is server-gated and uses isolated versioned session state.
- No live production import of the protected golden report fixture was found.
- Landing CTAs hand off to `/audit`; no active `/pricing` or `/access` link was found.
- Referenced local public assets inspected by C4 existed.
- `robots.ts`/metadata deliberately implement noindex/direct-link behavior; no separate sitemap defect was accepted.

## 11. Cross-subsystem synthesis handoff

For the overall overnight synthesis:

1. **Correlate C1 recovery findings with audit-core findings without merging them into K-01/K-02.** C1-01 and C1-02 are client transition/persistence defects even if server-side orchestration is corrected.
2. **Treat C2-05 as the client rendering consequence of report-contract work, not as another provenance root.** The report object carries evidence that the UI drops.
3. **Correlate C3-01 with infrastructure/test isolation review.** The route is active Next.js code, but fixture tests exclude it, allowing a green fixture suite alongside live provider-capable demo behavior.
4. **Correlate C4-01/C4-02 with product-truth and launch-readiness review.** They are public implementation defects, not marketing-style disagreements.
5. **Do not pull durable background jobs, checkout, account, dashboard, or delivery infrastructure into this correction set.** Only remove false current claims or provide accurate pre-launch states.

## 12. Recommended correction order

1. **Protect recoverable audit work:** fix C1-01 and C1-02 together, with regression tests for pre-stream run failure and failed resume persistence.
2. **Close the stale async navigation race:** fix C1-03 with cancellation/request identity and disabled unsafe navigation.
3. **Restore the irreversible boundary:** add the live final confirmation dialog for C2-01.
4. **Stop unsafe customer representation:** sanitize run failures (C2-03) and complete the live report evidence surface (C2-05).
5. **Isolate the preview route:** disable/remove or fixture-back `/audit/spec004` and add a no-network assertion (C3-01).
6. **Correct public truth before relying on public pages:** fix the FAQ/model/commercial claims (C4-01) and gate/finalize legal/support placeholders (C4-02).
7. **Complete Indonesian semantics:** correct `lang` and live audit copy/catalog coverage (C2-04).
8. **Address non-blocking functional defects:** honest print/PDF behavior (C2-06), similar-business validation (C2-07), self-hosted hero asset (C4-03), and mobile-menu focus semantics (C4-04).

---

**Final count:** 15 raw → 14 accepted → **P0 0 / P1 10 / P2 4 / P3 0**.
