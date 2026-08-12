# Spec 001: Simulated journey shell

> Status: **Implementing**
> Owner: Founder
> Updated: 2026-08-12
> Implements: Phase 1 of `docs/END_TO_END_PLAN.md` — one reviewable,
> fixture-backed landing-to-report journey

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/VISION.md`: **Who Nuave serves**, **Product promise**, **Product
   principles**, and **Product boundaries**
3. `docs/PRODUCT.md`: **Customer**, **Promise**, **Current offer**, **Customer
   journey**, and **Non-goals**
4. `docs/END_TO_END_PLAN.md`: **Target customer journey**, **Experience state
   model**, **Phase 1 — Simulated end-to-end journey shell**, **Cross-cutting
   quality requirements**, **Verification strategy**, and **Failure and
   recovery matrix**
5. `docs/AUDIT.md`: **Confirm the business first**, **Question rules**,
   **Capture only what the report needs**, **Report format**, **Report
   acceptance checklist**, and **Data boundaries**
6. `src/app/page.tsx`, `src/components/LandingHeroSection.tsx`,
   `src/components/LandingNav.tsx`, `src/app/audit/`,
   `src/lib/audit/fixtures/report-golden.ts`, `src/lib/audit/types.ts`,
   `src/lib/audit/contracts.ts`, and the existing audit tests

Do not load or use as product authority: `/Users/hy4-mac-006/nuave`,
`archive/`, private run artefacts, historical design studies, or superseded
plans. The legacy repository may be consulted later only through a separately
approved, named donor task.

## Problem

### Observed evidence

- The landing page does not currently lead into a complete audit journey.
- The local `/audit` route is an English, internal operator workflow that calls
  the live extraction, question, observation, and report boundaries.
- The current workflow ends at an in-browser report. It has no order summary,
  checkout state, processing destination, durable private delivery, or return
  path.
- A privacy-safe fictional fixture already contains a verified brief, ten
  questions, nine completed observations, one failed observation, report
  content, and expected evidence dimensions.
- The live audit engine has passing contract coverage and known paid-run
  constraints. It is not approved for additional paid use in this phase.

### Interpretation

Nuave cannot yet review the product as one customer experience. Building the
missing infrastructure first would commit to commercial and operational
decisions before the journey is understandable. A thin fixture-backed shell is
the lowest-risk way to expose missing states and transitions while preserving
evidence integrity, privacy, and the existing live engine.

## Desired outcome

With a protected fixture preview enabled, a reviewer can start from Nuave's
landing page and complete one coherent path through business intake, fact
confirmation, question review, an unmistakably simulated checkout, simulated
processing, and a downloadable example report.

Every step makes clear that the business, payment, AI run, private destination,
and report are fictional or simulated. Completing the path makes no paid model
call, records no real payment, sends no email, stores no durable customer data,
and does not alter the live audit engine.

## User and situation

The immediate user is the founder or an invited product reviewer evaluating the
future experience from the perspective of an Indonesian small- or medium-
business owner responsible for marketing. They need to judge the order,
clarity, trustworthiness, and completeness of the journey before Nuave replaces
any simulated boundary with a live one.

This is a protected product preview, not a customer pilot and not a purchasable
offer.

## Scope

- One server-controlled fixture-preview entry from the landing page.
- One fixed, fictional business: Northstar Advisory in Port Aurora.
- A short example intake that shows the minimum future inputs without accepting
  a real business submission.
- Review and explicit confirmation of the fixture business facts.
- Review and explicit approval of the fixture's ten-question pack.
- A scope summary followed by an unmistakably simulated checkout action.
- Deterministic, explicitly simulated customer-facing processing stages.
- A dedicated example-report destination backed by the existing golden fixture.
- Screen and print/PDF views derived from the same fixture report.
- Same-tab backward navigation, refresh recovery, and start-over behavior for
  the fixture journey.
- Desktop, mobile, keyboard, and basic assistive-technology behavior for the
  primary path.
- Automated browser coverage for the complete fixture path and its no-side-
  effect boundary.
- Preservation of the current live audit engine, audit contracts, and passing
  audit test baseline.

## Non-scope

- Real business submissions or arbitrary URL extraction.
- Live model, search, extraction, question-generation, observation, or report
  calls.
- Changes to audit evidence rules, scoring, report contracts, provider
  orchestration, cost accounting, or the golden fixture's conclusions.
- Editing fixture facts or questions. The shell represents those touchpoints as
  review-and-approve states; corrections and validated question editing arrive
  with the live Indonesian contract rather than fabricating fixture evidence.
- Natural, final Indonesian copy. New simulation disclosures must be clear,
  but full localization is Phase 2.
- A database, durable order, background job, queue, account, dashboard, report
  token, durable private link, or cross-device recovery.
- Real email collection, email delivery, notifications, or receipts.
- A payment provider, payment credentials, numeric price, tax, invoice, refund,
  credit, or remedy implementation.
- A final delivery-time promise, retention policy, or commercial terms.
- Public customer access, customer testing, outreach, analytics, or launch.
- A full landing-page rewrite, final visual system, or product-wide copy pass.
- Re-check purchase or comparison behavior.
- Selecting the first live vertical, city, or launch price.

## Experience

### Start condition and preview boundary

The fixture journey exists only when a server-controlled preview setting is
enabled. The setting is not a customer-selectable query parameter or browser
toggle. When the preview is disabled, the simulated checkout and fixture report
cannot be reached through the public interface.

When enabled, the landing page presents one clear action to start the example
journey. The action and its nearby context say that this is a fictional product
preview. This phase changes only enough landing routing and copy to make that
entry coherent.

### Persistent trust signal

Every journey screen, including the report and printed output, has a visible
fixture-preview signal. At minimum it communicates all of the following:

- the business and results are fictional;
- the AI processing is simulated;
- no payment is taken; and
- the preview is not a delivered customer audit.

The checkout screen uses the exact disclosure **“Simulasi pembayaran — tidak
ada tagihan”**. If the surrounding shell remains English in this phase, an
equally prominent English explanation appears with it. The disclosure is not
hidden in a tooltip, footer, legal text, or transient toast.

### Main path

1. **Landing — start preview.** The reviewer opens the fixture journey from the
   primary landing action.
2. **Draft — example intake.** The screen shows the fixed official example
   website, business identity, market scope, and fictional contact context. It
   explains which minimum inputs a real customer will eventually provide. The
   reviewer starts the example; no arbitrary business or personal data is
   accepted.
3. **Facts ready — confirm facts.** The screen shows the fixture's exact
   business identity, category, target customer, service, market context,
   official source, name variant, competitor, and known accuracy question. The
   reviewer must affirm that the example facts have been reviewed before
   continuing. The facts are intentionally read-only in this fixture phase.
4. **Questions ready — approve questions.** The screen shows all ten fixture
   questions in final order, separated or labelled so a non-technical reviewer
   can understand that five discover possible providers and five check the
   named business. The reviewer must explicitly approve the pack. Questions are
   read-only so the example observations and report cannot become misaligned.
5. **Awaiting payment — review scope.** The order summary repeats the exact
   fictional business and ten-question scope, names the example execution
   surface, describes the example report, and states the preview limitation. It
   shows no numeric price and no payment fields.
6. **Paid (simulated) — continue.** One deterministic action marked as a
   simulation advances the journey. The confirmation says that no charge,
   receipt, order, or entitlement was created. The interface must never present
   the state simply as “Paid” without the simulation qualifier.
7. **Running / preparing report — watch simulation.** Customer-meaningful
   stages show preparation, running ten questions, checking evidence, and
   preparing the report. The entire state is visibly simulated. It does not
   claim that a provider is responding, animate fabricated live per-question
   results, or become an indefinite spinner.
8. **Ready — inspect example report.** A dedicated destination renders the
   existing five-section report with its real fixture counts, evidence links,
   nine completed observations, and one failed observation. The reviewer can
   inspect details and print or save the report as PDF. The destination explains
   that it is session-only and does not claim secure, durable, or private
   hosting.

### Navigation and completion

- Before simulated processing starts, the reviewer can move backward without
  losing prior fixture confirmations.
- After processing starts, locked fixture inputs remain locked; the reviewer
  can either continue to the report or start over.
- Refreshing in the same tab restores the furthest valid fixture state from
  session storage.
- Start over clears the fixture journey state and returns to the example
  intake after confirmation if the action could discard visible progress.
- The report is the completion state. No upsell, outreach capture, dashboard,
  subscription, testimonial, or claim of customer delivery appears.

### Language and presentation

Copy is concise, non-technical, and truthful enough for journey review. The
golden fixture's English questions, evidence, and report content remain exact
in this phase and are labelled as an English fictional fixture. Phase 2 owns
the Indonesian audit and report contract and must not be pre-empted with ad hoc
translation here.

The primary path works at narrow mobile widths without horizontal scrolling,
does not depend on hover, has visible focus, uses native or equivalent semantic
controls, and announces processing and terminal state changes accessibly.
Reduced-motion preferences must not make the reviewer wait through decorative
progress animation.

## Requirements

- **R-01 — Protected fixture mode:** The journey shell is available only from a
  server-controlled fixture-preview mode. Client input cannot switch a live
  journey into fixture-paid or report-ready state.
- **R-02 — One canonical fixture:** All displayed identity, facts, questions,
  observations, report content, and source URLs come from the existing golden
  fixture or a thin presentation projection of it. The shell must not maintain
  a second hand-copied business or report fixture.
- **R-03 — Coherent landing entry:** With fixture preview enabled, one visible
  landing action opens the example intake and tells the reviewer that the path
  is a fictional preview before they enter it.
- **R-04 — Persistent disclosure:** The intake, facts, questions, checkout,
  processing, on-screen report, and printed report each visibly distinguish
  the experience from a real audit. Checkout includes **“Simulasi pembayaran —
  tidak ada tagihan.”**
- **R-05 — No real intake:** The shell does not submit an arbitrary website,
  business name, email address, consent record, or other customer data. If
  input-shaped controls are used to illustrate future intake, they contain
  fixed `.example` fixture values and cannot change the audited identity.
- **R-06 — Explicit fact confirmation:** The reviewer cannot approve the
  question pack until the fixture facts have been visibly reviewed and
  explicitly confirmed.
- **R-07 — Exact question review:** The shell presents the fixture's ten
  questions in their original order and distinguishes five unbranded discovery
  questions from five branded questions in plain language. Approval locks the
  pack for the simulated run.
- **R-08 — Accurate scope summary:** The order summary derives its business,
  question count, and execution-surface statements from the same fixture state
  shown earlier. It does not invent delivery, privacy, remedy, or commercial
  terms.
- **R-09 — Safe simulated checkout:** Checkout has no numeric price, payment
  instrument controls, provider widget, real receipt, real transaction
  identifier, or payment API call. Its action produces only a session-scoped
  simulated-paid state and a visible no-charge confirmation.
- **R-10 — Deterministic processing simulation:** Processing advances through
  the shared customer-visible `Running`, `Preparing report`, and `Ready` states
  without a provider call. Its progress is bounded, deterministic, explicitly
  simulated, and never described as live per-question completion.
- **R-11 — Evidence-faithful report:** The destination constructs and renders
  the report through the existing report model and view. It preserves the
  fixture's exact questions, raw excerpts, sources, denominators, conclusions,
  and failed-observation treatment.
- **R-12 — One screen/print payload:** The screen report, printable report, and
  any evidence export offered by the existing view use the same report and
  observation objects. The print result retains the fixture-preview disclosure.
- **R-13 — Session-only recovery:** The furthest valid state and required
  confirmations survive a same-tab refresh in session storage only. Restored
  state is validated against the fixture and journey-state version before use.
- **R-14 — Safe reset:** Start over clears only the fixture journey's own
  session keys, returns to the example intake, and never clears unrelated
  browser or live-workflow state.
- **R-15 — No external side effects:** Walking the fixture path makes no request
  to `/api/audit/*`, an AI/search provider, payment provider, email service,
  analytics service, database, or background-job service.
- **R-16 — Live-engine isolation:** Existing audit contracts, API behavior,
  live provider orchestration, cost controls, and their tests remain unchanged.
  Presentation code may be reused only if doing so does not weaken this
  boundary.
- **R-17 — Accessible state:** Every required confirmation and primary action is
  keyboard operable and visibly focused. Step names, errors, simulation status,
  and terminal readiness are available without relying only on color, motion,
  or an icon.
- **R-18 — Responsive completion:** The complete path and report controls remain
  usable on a representative mobile viewport and desktop viewport without
  obscured required actions or horizontal page scrolling.
- **R-19 — Browser regression:** Automated browser coverage proves the primary
  landing-to-report path, refresh restoration, reset behavior, persistent
  simulation disclosure, and absence of audit API calls.

## Failure and recovery

| Failure or interruption | Preserve | Reviewer sees | Recovery and forbidden behavior |
|---|---|---|---|
| Required confirmation is missing | Current fixture step | A specific inline prompt identifying the required confirmation | Confirm and continue; never infer consent or approval |
| Reviewer navigates back before processing | Valid fixture state and confirmations | The earlier step with prior state intact | Review again and continue |
| Same-tab refresh | Furthest validated fixture state | The restored step and persistent preview disclosure | Continue; never restart a live call |
| Missing, corrupt, stale, or incompatible session state | Nothing from the invalid state | A concise reset explanation | Return to example intake; never partially trust or migrate unvalidated state |
| Fixture or report construction fails | Valid earlier step when possible | A terminal example-preview error with start-over action | Reset or retry fixture construction locally; never fall back to a live API |
| Simulated processing is interrupted | The simulated-paid state | A clear option to resume the simulation or start over | Resume deterministically; never claim background work continued |
| One fixture observation is failed | All fixture observations, including the failure | The report's approved failed-test treatment | Keep the failure separate; never convert it into non-appearance or success |
| Browser print/save is cancelled or unavailable | Ready report state | The on-screen report remains usable | Retry through the browser; never claim a PDF was delivered |
| Fixture preview is disabled | No fixture paid/report state | A safe unavailable or normal landing state | Enable through server-controlled preview configuration; never accept a client-side override |

No failure in this phase may trigger a paid call, submit customer data, invent
evidence, create an order, or imply that a customer remedy is owed.

## Evidence, data, privacy, and cost

- The sole business fixture is Northstar Advisory in Port Aurora. Its
  `northstar.example` and `meridian.example` sources, provider IDs, timestamps,
  contact context, and findings are fictional test data.
- Raw fixture observations remain immutable. The failed observation remains
  failed, exact answer excerpts remain exact, and source URLs cannot be
  promoted into visible brand appearances.
- The shell derives the report through existing audited contracts. It does not
  translate evidence, recompute a more favorable result, or add a testimonial,
  benchmark, rank, outcome, revenue, lead, or guarantee claim.
- The browser retains only a versioned fixture journey state in session storage.
  No local storage, cookie, durable server record, account, personal-data
  record, or recovery lookup is created.
- No real customer email or consent is collected. Any contact value used for
  illustration must use the reserved `.example` domain and remain part of the
  fictional fixture.
- The fixture report must not be indexed, represented as a real customer result,
  or reused as public proof without a later explicit decision.
- Provider-call cost for the complete path is USD 0. No previously accounted
  private-run budget is consumed or reset.
- Fixture mode and payment mode are authoritative configuration/state, not
  values inferred from customer-visible labels.

## Acceptance criteria

- **AC-01 — Entry:** Given fixture preview is enabled and the landing page is
  open, when the reviewer activates the primary preview action, then the
  example intake opens and visibly identifies the path as fictional before any
  confirmation.
- **AC-02 — Protected boundary:** Given fixture preview is disabled, when a
  visitor uses normal navigation or a fixture URL, then the simulated checkout
  and fixture report are unavailable and no client input can enable them.
- **AC-03 — Fixture identity:** Given any step from intake through report, when
  business identity or scope is shown, then it matches `goldenBrief` and no
  editable control can change which business the observations claim to cover.
- **AC-04 — Fact gate:** Given the facts screen is open and the review
  confirmation is absent, when the reviewer tries to continue, then they remain
  on the facts screen with a specific accessible prompt; after confirmation,
  they can continue.
- **AC-05 — Question gate:** Given facts are confirmed, when the question screen
  opens, then the ten `goldenPrompts` appear once each in original order, five
  are explained as discovery questions, five as named-business questions, and
  processing remains unavailable until explicit approval.
- **AC-06 — Scope consistency:** Given the question pack is approved, when the
  summary opens, then it shows Northstar Advisory in Port Aurora, ten questions,
  the fixture execution surface, and the example-report limitation from the
  same fixture-backed state.
- **AC-07 — Checkout truthfulness:** Given the summary is open, when the reviewer
  inspects and completes checkout, then **“Simulasi pembayaran — tidak ada
  tagihan”** is prominent, no numeric price or payment credential control is
  present, and the confirmation states that no charge, receipt, or real order
  was created.
- **AC-08 — Processing truthfulness:** Given simulated checkout is complete,
  when processing begins, then the screen identifies the whole sequence as a
  simulation, advances through customer-meaningful stages within a bounded
  interval, announces state changes, and does not display fabricated live
  per-question completion.
- **AC-09 — Report fidelity:** Given processing reaches `Ready`, when the report
  opens, then all five canonical sections render from the golden fixture, all
  ten question details are available, nine observations are completed, one is
  failed, and the displayed counts and conclusions match the report contract.
- **AC-10 — Print fidelity:** Given the report is ready, when print/PDF output is
  invoked, then the print layout uses the same report data, expands the required
  details, and retains a visible fictional/simulated disclosure.
- **AC-11 — Persistent disclosure:** Given any step from intake through report,
  when a reviewer scans the main content without opening secondary help, then
  they can tell that the business/result is fictional, processing is simulated,
  and no payment is taken.
- **AC-12 — Refresh recovery:** Given the reviewer has reached each gated state
  in turn, when the tab is refreshed, then the furthest valid state restores
  without losing its required confirmations or calling a live boundary.
- **AC-13 — Invalid-state recovery:** Given stored fixture state is missing,
  stale, corrupt, or inconsistent with the fixture version, when the journey
  loads, then it explains the reset and returns safely to example intake rather
  than rendering a later state.
- **AC-14 — Start over:** Given the reviewer has reached processing or report,
  when they confirm start over, then only fixture-journey state is cleared and
  the example intake opens with no live-workflow session state removed.
- **AC-15 — No side effects:** Given a browser test records network traffic for
  the complete path, when the reviewer proceeds from landing to report and
  refreshes once, then no request reaches `/api/audit/*`, an AI/search provider,
  payment, email, analytics, database, or job service.
- **AC-16 — No live fallback:** Given fixture or report construction is forced
  to fail, when recovery is offered, then the reviewer can reset or retry the
  local fixture only and no live audit call occurs.
- **AC-17 — Responsive and keyboard path:** Given representative mobile and
  desktop viewports and keyboard-only input, when the complete path is
  performed, then every required action is reachable, focus is visible,
  required messages are perceivable, and no horizontal page scrolling hides
  content or actions.
- **AC-18 — Reduced motion:** Given reduced motion is preferred, when simulated
  processing begins, then the reviewer reaches the same report without waiting
  for decorative staged animation and still receives meaningful state text.
- **AC-19 — Engine regression:** Given the implementation is complete, when all
  existing audit tests run, then the current 93-test baseline passes without a
  change to live audit contracts, provider orchestration, cost controls, or
  fixture evidence.
- **AC-20 — Repository checks:** Given the implementation is complete, when the
  repository's formatting/type/lint check and production build run, then both
  pass, with any pre-existing warnings distinguished from new regressions.
- **AC-21 — Human trust review:** Given a founder or fresh reviewer completes
  the path on mobile and desktop, when asked what was real, simulated, stored,
  charged, and delivered, then they correctly identify that the entire business
  audit and payment are fictional, state is same-tab/session-only, cost is zero,
  and no customer report was delivered.

## Open questions

None block approval. This specification deliberately resolves the fixture
integrity trade-off by making business facts and questions review-only in Phase
1. Editable correction behavior remains required by the target journey and is
deferred to the live Indonesian contract rather than simulated against
pre-recorded answers.

The founder approved this specification on 2026-08-12. Implementation is
proceeding in bounded chunks against the approved spec.

## Implementation notes

- Prefer a small fixture journey adapter that composes `goldenBrief`,
  `goldenPrompts`, `goldenObservations`, and `goldenReportContent()` through the
  existing report builder. Do not copy fixture strings into page components.
- Keep the existing live workflow and fixture journey as explicit modes or
  entry points selected on the server side. Do not expose a customer-facing
  live/fixture switch.
- Reuse the current report component where it can satisfy R-11 and R-12 without
  coupling the fixture shell to live API calls.
- Version the fixture journey's session state separately from the existing live
  workflow keys.
- Do not change `BusinessBrief.language`, the question contract, or the report
  writing contract in this phase; those changes belong to Spec 002.
- Add the smallest browser-test setup that can prove AC-01 through AC-18. Do not
  build a general end-to-end framework beyond this path.
- Add `VERIFICATION.md` from the repository template when implementation
  begins. Verification must include automated results plus a fresh human review
  for AC-21.

## Verification record

- Verification artifact: `specs/001-simulated-journey-shell/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
