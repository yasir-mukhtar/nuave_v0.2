# Nuave v2 end-to-end development plan

> Status: **Current development plan — founder-approved direction**
> Updated: 2026-08-12
> Governs: build sequence, integration boundaries, quality gates, and release
> readiness for the thin v2 journey
>
> This plan does not approve every implementation detail. Each phase still
> requires one bounded approved specification under `specs/` before code is
> changed. Product truth remains governed by `VISION.md`, `PRODUCT.md`,
> `AUDIT.md`, and the newest founder-approved decision in `DECISION_LOG.md`.

## 1. Outcome

Build one thin but complete Indonesian journey for one AI visibility audit:

```text
landing page
  -> short business intake
  -> confirm extracted business facts
  -> review the ten questions
  -> simulated checkout, later replaced by real checkout
  -> visible audit processing
  -> private report link
  -> read, download, share, and request a correction
```

The first version should feel complete even while selected boundaries are
simulated. Simulation is a development mechanism, not a customer claim. The
existing evidence and report engine remains the protected core and is connected
to the journey after the shell is reviewable.

The plan succeeds when a stranger can eventually complete this journey without
an account or founder intervention, while Nuave preserves the questions,
observations, sources, report version, payment state, and private report access
needed for delivery and a later re-check.

## 2. Strategic decisions carried into the plan

1. **Direct business owner first.** Nuave serves the owner or person accountable
   for marketing in an Indonesian small or medium business. The audited business
   is their own business.
2. **One paid diagnosis, not subscription software.** The recurring product is
   an optional comparable re-check after six to eight weeks.
3. **One honest surface first.** The launch measurement names the OpenAI
   Responses API, exact returned model, date, language, and web-search condition.
   It does not claim to reproduce every consumer ChatGPT answer.
4. **Evidence before scores.** Counts keep their denominators. Mention,
   recommendation, comparison, information accuracy, non-appearance, and failed
   tests remain separate.
5. **Indonesian is part of measurement quality.** Every customer-facing screen,
   question, explanation, report field, email, and remedy path uses reviewed,
   natural Indonesian.
6. **No account for the first purchase.** A private, unguessable, revocable link
   is the primary access mechanism. Account creation remains deferred.
7. **Simulate before integrating.** The full journey is made reviewable with
   deterministic fixture data and an explicitly simulated checkout. Real audit,
   persistence, jobs, delivery, and payment replace those boundaries one at a
   time.
8. **The report-quality gate remains decisive.** After the first complete real
   Indonesian report, stop if it contains no finding worth paying for. Do not
   hide a weak product behind polish or payment infrastructure.

## 3. Current baseline

### Reusable foundation in this repository

- A five-stage `/audit` workflow for website extraction, fact confirmation,
  question review, live observations, and report display.
- Ten-question contract with five unbranded and five branded questions.
- Independent OpenAI Responses API observations with web search and streamed
  per-question progress.
- Evidence contracts that preserve exact excerpts, sources, failures, model
  provenance, usage, latency, and accounted cost.
- A compact report-synthesis path in which code owns observable facts and the
  model supplies bounded interpretation and priorities.
- A five-section web report, A4 print/PDF path, and complete evidence JSON
  export.
- A privacy-safe golden fixture reproducing known report failure modes.
- Ninety-three passing audit tests, plus a passing type, lint, and formatting
  check as of 2026-08-12.

### Gaps between the baseline and the target experience

| Area | Current state | Target state |
|---|---|---|
| Landing | Attractive but agency-facing and disconnected | Owner-facing Indonesian entry into the audit |
| Intake | Long, English, operator-oriented | Short first step with progressive fact confirmation |
| Questions | Deterministic English templates | Natural Indonesian with a safe deterministic fallback |
| Checkout | Missing | Clearly simulated first, then real hosted payment |
| Execution | Browser-connected request | Durable run that survives navigation and interruption |
| State | Browser session only | Server-owned order, run, evidence, and report state |
| Report | English and local-session bound | Indonesian, privately hosted, downloadable, shareable |
| Delivery | No email or return path | Named recipient receives and can recover a private link |
| Recovery | Partial local recovery | Explicit retry, partial-result, remedy, and support states |
| Re-check | Product intent only | Persisted question pack replayed under compatible versions |
| Public safety | Private cost guard only | Rate limits, abuse controls, retention, privacy, correction |

### Legacy repository policy

This repository remains the v2 product base. The legacy Nuave subscription-SaaS
repository is a donor only. Reuse from it must be small, reviewed, and
low-coupling. Likely donors are Midtrans request/webhook patterns, Supabase
client conventions, and individual design tokens or UI components.

Do not port organizations, workspaces, subscriptions, credits, plan gating,
dashboards, monitoring, agency management, or multi-client concepts.

## 4. Target customer journey

### Touchpoint 1 — Landing

**Customer question:** “What will I learn about my business?”

The landing page should:

- lead with the practical situation, not AEO terminology;
- explain that Nuave tests ten realistic Indonesian questions;
- show a clearly illustrative or permissioned report sample;
- explain the named test surface and snapshot limitation in plain language;
- state that the customer receives a private, downloadable report;
- use one primary CTA that starts the audit; and
- avoid unearned pricing, customer proof, benchmarks, or outcome guarantees.

The shell phase changes navigation and enough copy to make the journey coherent.
The final product-wide visual and copy pass happens only after the report-quality
gate and commercial terms are settled.

### Touchpoint 2 — Short intake

**Customer question:** “Which exact business are you checking?”

Collect only the minimum required to begin:

- official website or authoritative public profile;
- business name if extraction cannot resolve it;
- city, branch, or service area;
- customer email for draft recovery and eventual delivery; and
- consent to use the submitted public sources for this audit.

Do not collect payment credentials, customer records, private operational data,
or broad marketing questionnaires.

### Touchpoint 3 — Fact confirmation

**Customer question:** “Did Nuave understand my business correctly?”

Show extracted facts with source attribution and ask the customer to confirm or
correct:

- exact identity and scope;
- category and target customer;
- priority services or offers;
- known name variants;
- location or service area;
- one verified competitor when available; and
- optional public facts that AI may get wrong.

Facts supplied by the customer remain labelled until verified. If extraction
fails, open the same confirmation screen with blank manual fields rather than
ending the journey.

### Touchpoint 4 — Question review

**Customer question:** “What exactly will Nuave ask?”

Show all ten Indonesian questions in their final order. Explain the five
unbranded discovery questions and five branded recognition or factual questions
without requiring the customer to learn those internal terms.

The customer may edit wording, but validation must still block brand leakage,
unsupported facts, duplicate questions, unsafe regulated claims, and competitor
names outside the designated comparison question. Confirmation locks the brief
and question pack for the run.

### Touchpoint 5 — Order summary and checkout

**Customer question:** “What am I buying, when will I receive it, and what if it
fails?”

The summary shows:

- the exact business and scope;
- ten approved questions;
- one named AI execution surface;
- report contents and limitations;
- delivery estimate;
- one price when approved; and
- the correction, partial-delivery, failure, and remedy policy.

In the journey-shell phase, this screen is labelled **Simulasi pembayaran — tidak
ada tagihan**. It collects no real payment details, emits no real receipt, and
cannot be mistaken for a purchase. A deterministic action advances to a
simulated paid state.

Real checkout replaces the simulator only after the report-quality gate and
after price, delivery promise, privacy, retention, and remedy terms are
founder-approved.

### Touchpoint 6 — Processing

**Customer question:** “Is my audit still working, and can I safely leave?”

Use customer-meaningful stages rather than provider internals:

1. preparing the verified business brief;
2. running the ten questions;
3. checking evidence and sources;
4. preparing the report; and
5. report ready.

Show honest progress only. Never animate fake per-question completion in live
mode. Once durable jobs exist, tell the customer they may close the page and
will receive the private link by email.

### Touchpoint 7 — Report delivery

**Customer question:** “What happened, what matters, and what should I do?”

The private web report and its PDF render the same report version and facts. The
report keeps the five canonical sections:

1. main result;
2. key findings;
3. what to do next;
4. test-by-test results; and
5. how the audit works.

The report supports:

- private access through an opaque, unguessable token;
- PDF download;
- evidence inspection without overwhelming the main result;
- sharing the same private link;
- correction or problem reporting;
- clear report date, version, and limitations; and
- a later re-check invitation without implying guaranteed improvement.

### Touchpoint 8 — Return and recovery

**Customer question:** “How do I find my report again?”

Email the named recipient the private report link. Provide a recovery mechanism
that does not reveal whether arbitrary emails have an order. Tokens must be
revocable and governed by a founder-approved finite retention period.

No dashboard is needed. A customer returning to one report should land directly
on that report.

## 5. Experience state model

The simulation and live journey should share one small state vocabulary so
integration does not rewrite the interface.

### Customer-visible states

| State | Meaning | Main available action |
|---|---|---|
| Draft | Initial business details are incomplete | Continue intake |
| Facts ready | Nuave has a draft business profile | Confirm or correct facts |
| Questions ready | Ten questions are ready for review | Edit and approve |
| Awaiting payment | Scope is locked but checkout is incomplete | Pay or resume later |
| Paid | Payment is confirmed or explicitly simulated | Start/continue processing |
| Running | Observations are executing | View honest progress |
| Preparing report | Evidence is being validated and synthesized | Wait or leave safely |
| Ready | Private report is available | Read, download, share |
| Partial | A usable but incomplete report meets the approved partial policy | Read report and remedy note |
| Failed | No deliverable passed the evidence standard | Retry when safe or receive remedy |
| Cancelled | The customer abandoned or cancelled before execution | Start again or resume where valid |

### Internal invariants

- A run cannot start without confirmed facts and an approved question pack.
- Live execution cannot start without verified payment once real checkout is
  enabled; internal founder-approved test runs are explicitly marked.
- Simulated payment can exist only in non-production or protected preview mode.
- Failed tests never become non-appearance.
- Evidence validation failure never becomes a customer report.
- A report always points to one immutable brief version, question-pack version,
  observation set, method version, and report version.
- Re-checks reference the original approved question pack and may compare only
  compatible scoring and method versions.

## 6. Technical shape

### Keep the architecture narrow

Use one Next.js application with four replaceable boundaries:

```text
customer journey UI
  -> audit engine
  -> report store and private access
  -> payment adapter
  -> delivery adapter
```

Do not introduce a generalized plugin framework. Each boundary needs only the
operations required by this journey.

### Execution modes

**Fixture mode**

- Uses the privacy-safe golden fixture.
- Returns deterministic extraction, questions, progress events, and report.
- Uses simulated checkout.
- Makes no paid model call and sends no email.
- Is clearly indicated in the interface and unavailable as a public purchase.

**Live mode**

- Uses the current audit contracts and OpenAI execution path.
- Records exact provider and model provenance.
- Uses server-authoritative state once persistence is introduced.
- Requires real checkout for customer runs, but supports explicit protected
  founder test runs.

The mode is selected by trusted server configuration, never by an unrestricted
public query parameter.

### Recommended minimal persistence model

The persistence specification should start with the following concepts, then
remove any field that does not support the journey:

| Record | Responsibility |
|---|---|
| `audit_orders` | Customer contact, business identity, journey state, payment state, timestamps |
| `audit_runs` | Locked brief, execution mode, method/model versions, run status, cost summary |
| `audit_questions` | Ordered approved questions and provenance |
| `audit_observations` | Raw answer, sources, classifications, failure state, provider provenance |
| `audit_reports` | Immutable report payload, report versions, generated file reference |
| `report_access_tokens` | Hashed opaque token, expiry, revocation, last access |
| `payment_events` | Idempotent provider events and reconciled payment state |

This is not an organization/workspace schema. One order belongs to one recipient
and one business. JSON fields may hold versioned audit contracts where relational
queries provide no customer value.

### Durable execution requirements

Before a real customer run:

- execution must continue after the browser disconnects;
- each completed observation must be persisted immediately;
- retry must resume missing work rather than repeat successful paid calls;
- duplicate job delivery and webhook delivery must be idempotent;
- the report step must run only when observation policy is satisfied;
- terminal failure must preserve evidence and expose an operator-readable cause;
- customer-facing errors must not leak provider internals; and
- cost ceilings must be enforced server-side per run.

The job provider is chosen in the persistence/execution specification after a
small compatibility spike. The product requirement is durable, idempotent work,
not a particular vendor.

### Private report access

- Generate at least 128 bits of randomness for the bearer token.
- Store only a token hash when practical.
- Use an opaque public route such as `/r/<token>`.
- Allow revocation and replacement without changing the report.
- Apply a founder-approved expiry and retention policy.
- Prevent indexing, referrer leakage, and sensitive analytics capture.
- Do not expose raw provider metadata or unnecessary personal information.

### Payment boundary

Define a small adapter around:

- create checkout;
- retrieve or reconcile checkout status;
- verify webhook authenticity;
- apply an idempotent payment event; and
- request the approved refund or remedy action.

The simulator implements the same state transitions without contacting a
provider. Midtrans is the first donor candidate because the legacy repository
already contains IDR payment patterns, but provider choice and copied code must
be confirmed by the payment specification.

## 7. Delivery phases

Each phase receives one approved specification and one independent verification
record. Only one phase is active at a time unless two tasks are genuinely
independent and cannot create conflicting product behavior.

### Phase 0 — Baseline and journey contract

**Outcome:** everyone can point to one intended journey, one state model, and one
fixture before implementation begins.

**Work**

- Adopt this plan and route repository documentation to it.
- Record the simulated-journey decision and revised build order.
- Preserve the current golden fixture as the initial journey fixture.
- Define the first bounded specification: simulated end-to-end journey shell.
- Record the current passing checks and audit tests as the regression baseline.

**Exit gate**

- The first spec is founder-approved with observable acceptance criteria.
- No unresolved decision prevents a fixture-backed journey from being built.

### Phase 1 — Simulated end-to-end journey shell

**Outcome:** a reviewer can complete the entire intended journey without a paid
model call, database, real email, or real payment.

**Work**

- Connect the landing CTA to the audit journey.
- Reshape `/audit` around the customer touchpoints in Section 4.
- Introduce the shared journey state vocabulary.
- Use fixture-backed extraction, questions, processing progress, and report.
- Add the explicitly simulated order-summary and checkout screen.
- Simulate a private report destination without claiming durable hosting.
- Cover desktop and mobile layout, keyboard flow, refresh behavior, and primary
  failure states.
- Add browser-level end-to-end tests for the fixture path.

**Exit gate**

- One automated browser test completes landing to report.
- A human reviewer can tell what is real and what is simulated.
- No screen relies on agency, subscription, dashboard, or account concepts.
- The real audit engine remains unchanged and its 93 tests continue to pass.

**Deliberately excluded**

- natural Indonesian final copy;
- live audit calls;
- database and job queue;
- real email; and
- real payment.

### Phase 2 — Indonesian audit and report contract

**Outcome:** the fixture journey and audit contracts can produce customer-facing
Indonesian that is natural, bounded, and machine-checkable.

**Work**

- Create and approve `docs/VOICE.md` for customer vocabulary, tone, prohibited
  jargon, numerals, dates, and explanation patterns.
- Change customer-facing locale contracts from `en-US` to Indonesian.
- Build natural Indonesian question generation with a deterministic Indonesian
  fallback that cannot hard-fail.
- Keep human review for every question pack.
- Create a versioned Indonesian report-writing contract with field and sentence
  limits calibrated for Indonesian.
- Translate deterministic method, status, failure, and evidence labels.
- Ensure evidence excerpts remain exact and are never translated.
- Update fixtures and tests without weakening the existing evidence guardrails.

**Exit gate**

- All ten questions pass mechanical safety rules and native-language judgment.
- Report fixture passes the Indonesian writing contract.
- Every customer-facing string in the journey is Indonesian except exact source,
  provider, model, or official business text.
- Existing evidence, provenance, and cost tests still pass.

### Phase 3 — Live engine connection and report-quality gate

**Outcome:** one real Indonesian business travels through the same interface and
produces one complete real report without manual rescue.

**Work**

- Connect live extraction, observation streaming, and compact report synthesis
  behind the same journey states.
- Preserve explicit fixture/live separation.
- Run the first founder-approved audit within the server cost ceiling.
- Re-ask two or three designated questions separately to measure run-to-run
  variation; do not blend repeats into reported counts.
- Set or defer score-band width based on observed variation. If evidence is
  insufficient, show the component counts without pretending the band is
  calibrated.
- Review the final web report, PDF, and evidence export as a sceptical owner and
  as an audit professional.
- Record the quality-gate verdict and the concrete evidence behind it.

**Exit gate: report worth paying for**

The report must:

- reveal at least one material, specific finding not obvious from casually
  asking one chatbot question;
- make every important claim traceable to an observation or public source;
- be understandable by a non-technical Indonesian decision-maker in about ten
  minutes;
- distinguish observation, interpretation, and action;
- offer no more than three feasible, evidence-linked priorities;
- retain failures and limitations visibly; and
- render the same facts on screen and in PDF.

If the gate fails, stop. Improve questions, observation analysis, evidence
normalization, or report synthesis and repeat this phase. Do not proceed to real
persistence, payment, or polish merely because the software ran.

### Phase 4 — Durable orders, jobs, and private reports

**Outcome:** a live run survives browser closure and its recipient can reopen the
finished report at a private link.

**Work**

- Add the minimal persistence records from Section 6.
- Move journey authority from browser session storage to the server.
- Add opaque resumable draft access before payment.
- Move execution to a durable, idempotent job path.
- Persist each observation and terminal status.
- Store immutable report versions and serve `/r/<token>` privately.
- Add report-link delivery and recovery email in protected test mode.
- Define and implement token revocation, retention, deletion, and recovery
  behavior after founder approval.
- Migrate interrupted local runs only if needed for current private evidence;
  do not build a general migration system.

**Exit gate**

- Close the browser during a live run; the run finishes or safely resumes.
- Open the delivered private link in a fresh browser and retrieve the same
  report.
- Duplicate job delivery does not duplicate paid observations or reports.
- Revoked and expired tokens fail safely.
- The stored approved question pack can support a future re-check.

### Phase 5 — Real checkout and launch safety

**Outcome:** a real customer can pay once, receive exactly one audit entitlement,
and receive the approved remedy when delivery fails.

**Founder decisions required before implementation**

- one provisional price;
- what the price includes;
- realistic delivery promise;
- partial-result threshold;
- refund, rerun, or credit remedy;
- report retention period;
- correction process; and
- minimum privacy and terms copy, subject to qualified review where needed.

**Work**

- Replace the simulator through the payment adapter.
- Use hosted provider payment UI; never collect card or bank credentials.
- Verify and reconcile webhooks idempotently.
- Start customer execution only from trusted paid state.
- Add pending, cancelled, expired, failed, paid, refunded, and disputed states
  required by the selected provider.
- Add public rate limits, bot/abuse controls, per-brand caching where useful,
  server cost ceilings, and operational alerts.
- Add correction and delivery-failure support paths.
- Test provider sandbox behavior before any production credential is enabled.

**Exit gate**

- One sandbox payment traverses checkout, webhook, order, job, report, and email.
- A duplicate webhook cannot create a second audit.
- A failed run produces the approved remedy rather than silent loss.
- Public inputs cannot bypass payment, cost limits, or rate limits.
- No production charge is possible in preview or fixture mode.

### Phase 6 — Product-wide design and copy pass

**Outcome:** all touchpoints feel like one calm, trustworthy Indonesian product
rather than a landing page joined to an internal tool.

**Work**

- Create and approve `docs/DESIGN.md` from actual journey needs.
- Rewrite the landing page for the direct business owner.
- Harmonize navigation, layout, component states, typography, progress, report,
  email, and error presentation.
- Make the evidence hierarchy and next actions scannable.
- Complete responsive, keyboard, focus, contrast, loading, empty, and failure
  behavior.
- Produce a permissioned or clearly fictional full sample report.
- Run PDF page-by-page visual QA.
- Remove internal cost telemetry and engineering terminology from customer UI
  while retaining them in restricted operations data.

**Exit gate**

- A fresh reviewer completes the journey without coaching.
- The report can be read and acted on without learning AEO terminology.
- Mobile and desktop browser paths pass.
- Screen and PDF have no factual divergence, clipping, or unreadable evidence.

### Phase 7 — Known-owner pilot

**Outcome:** a small number of target business owners encounter the complete
product before it is sold broadly.

**Work**

- Select one vertical and city and document why it is the launch wedge.
- Use only businesses and reports covered by appropriate permission.
- Observe where owners hesitate, abandon, misunderstand, or distrust.
- Ask the three canonical feedback questions from `PRODUCT.md`.
- Record whether each report revealed something new, was shared, and led to one
  concrete action.
- Fix only issues that block comprehension, trust, completion, or delivery.

**Exit gate**

- Owners can complete or understand the journey without founder interpretation.
- At least one owner identifies a material new finding and a plausible next
  action.
- No unresolved safety or remedy failure remains.
- The founder explicitly approves moving from known owners to strangers.

### Phase 8 — Controlled public launch

**Outcome:** Nuave accepts real orders from strangers in the selected wedge and
collects evidence about willingness to pay and action.

**Work**

- Publish final price, scope, limitations, delivery, privacy, retention, and
  remedy terms.
- Activate production payment and delivery credentials.
- Monitor funnel completion, payment reconciliation, run success, delivery,
  cost, support, and report access.
- Use demonstrate-before-selling outreach only with findings actually observed.
- Keep manual operational review outside the customer delivery path; never use
  invisible rescue to make a report appear successful.

**Initial evaluation signals**

- landing-to-intake start;
- fact-confirmation and question-approval completion;
- checkout completion;
- paid run and report generation success;
- median provider cost and processing time;
- report open and PDF download;
- correction or refund incidence;
- finding novelty, intended action, and report sharing; and
- re-check interest.

Do not optimize vanity traffic before the paid and delivered-report funnel is
observable.

### Phase 9 — Comparable re-check

**Outcome:** an earlier customer can buy a second measurement and understand what
changed under a comparable method.

**Work**

- Retrieve the original verified brief and approved question pack.
- Confirm only facts that may legitimately have changed.
- Replay questions verbatim unless a disclosed incompatibility prevents it.
- Compare counts and score bands only under compatible versions.
- Separate observed change from claimed causation.
- Show completed customer actions as customer-supplied until independently
  verified.
- Price and sell the re-check as a second value event, not a subscription.

**Exit gate**

- The report explains what stayed comparable and what changed.
- Ordinary model variation is not presented as business improvement or decline.
- The customer understands why a second measurement was or was not useful.

## 8. Cross-cutting quality requirements

### Evidence integrity

- Keep raw observations immutable.
- Preserve exact answer excerpts and source URLs.
- Derive counts and deterministic method copy in code.
- Block unsupported ranking, causation, revenue, lead, and guarantee claims.
- Version question, method, scoring, writing, and report contracts.

### Indonesian language quality

- Use Indonesian written for an owner or marketing lead, not translated product
  jargon.
- Test generated questions with native-language judgment in addition to string
  rules.
- Never translate exact provider evidence.
- Keep provider names and unavoidable technical terms in the methodology, not
  the headline.

### Privacy and security

- Minimize personal data and keep customer contact out of model prompts.
- Use only necessary public business information.
- Keep payment details with the payment provider.
- Protect report links, raw evidence, admin diagnostics, and API credentials.
- Define finite retention, deletion, correction, and incident handling before
  external use.

### Accessibility and resilience

- Support keyboard completion, visible focus, semantic labels, and status
  announcements.
- Preserve confirmed work across refresh or interruption once persistence
  exists.
- Show what was saved, what failed, and what the customer can safely do next.
- Never use an indefinite spinner for terminal failure.

### Cost and operations

- Preserve stage call limits and per-run cost ceilings.
- Record actual provider usage and preflight reservation where usage is missing.
- Avoid duplicate paid calls on retries.
- Alert on stuck jobs, webhook reconciliation failures, report generation
  failures, delivery failures, and abnormal cost.

## 9. Verification strategy

### Automated layers

1. **Contract tests:** brief, question pack, observations, evidence, report,
   language, score, telemetry, payment state, and access tokens.
2. **Integration tests:** each API boundary with provider calls stubbed, including
   retries, duplicate events, partial results, and failures.
3. **Browser tests:** fixture journey from landing to report; recovery after
   refresh; simulated and sandbox checkout; private report access.
4. **Rendering tests:** report screen and print/PDF use the same payload and
   version.
5. **Security tests:** token guessing resistance, revoked/expired access,
   webhook verification, rate limiting, and server-authoritative mode/payment
   state.

### Human gates

- Native Indonesian review of questions, workflow copy, report, and emails.
- Sceptical-customer and professional review of the first real report.
- Mobile and desktop visual QA.
- Permission and privacy review before using any real business as a public
  sample.
- Founder approval for price, delivery promise, retention, and remedy terms.

Every specification receives a `VERIFICATION.md`. A passing build is necessary
but does not replace judgment-based acceptance.

## 10. Failure and recovery matrix

| Failure | Preserve | Customer response | Recovery |
|---|---|---|---|
| Website extraction fails | URL and entered identity | Ask for manual facts | Continue without a second extraction call |
| Questions fail validation | Confirmed brief and edits | Identify the unsafe or unsupported wording | Edit or use safe fallback |
| Simulated checkout abandoned | Locked draft in preview | State that no charge occurred | Resume or restart |
| Real payment pending/cancelled | Locked order, no run | Show provider status without claiming payment | Retry checkout or expire order |
| Observation fails | All completed observations and telemetry | Show failed test separately | Retry only under approved same-method policy |
| Browser closes | Persisted order/run state | Explain that work continues | Resume status from server |
| Evidence validation fails | Raw observations and diagnostics | Do not publish a report | Safe engineering retry or approved remedy |
| Report writing check fails | Protected evidence and first attempt | Keep processing within retry policy | One language-only retry |
| Delivery email fails | Ready report and token | Do not mark report failed | Retry email and allow recovery |
| Private token expires/revokes | Immutable report | Safe unavailable page | Verified recovery or replacement token |
| Full run fails after payment | Order, evidence, payment record | Clear apology and remedy state | Approved rerun/refund/credit policy |

## 11. Risks and controls

| Risk | Why it matters | Control or decision point |
|---|---|---|
| Beautiful shell hides a weak report | Creates false product confidence | Mandatory real-report quality gate before commercial integration |
| Indonesian sounds translated | Undermines local differentiation and test validity | `VOICE.md`, native review, deterministic safe fallback |
| Structured report call fails live | Current compact path lacks a successful paid run | Keep code-owned evidence, bounded synthesis, telemetry, stop-on-failure |
| Serverless request dies | Paid report can disappear after navigation | Durable job and per-observation persistence before external use |
| Simulated checkout looks real | Misleads reviewers or leaks into production | Persistent demo label, no payment fields, server-controlled mode |
| Cost exceeds viable price | Business may be structurally uneconomic | Per-run ceiling, actual cost tracking, cost review before price approval |
| Private bearer link leaks | Exposes business findings | Strong token, hashing, finite retention, revocation, no indexing |
| Score implies false precision | Damages trust and re-check value | Counts first, band only after variance measurement, versioned formula |
| Scope broadens too early | Recreates the legacy SaaS | One vertical/city, explicit non-scope, one bounded spec at a time |
| Payment precedes policy decisions | Creates unresolved customer obligations | Block real checkout until price, delivery, privacy, retention, remedy approval |

## 12. Explicit non-scope through initial launch

- customer accounts and passwords;
- dashboards or continuous monitoring;
- subscriptions, credits, packages, bundles, or volume tiers;
- organizations, teams, workspaces, roles, or agency client management;
- white-label reports or custom domains;
- multi-platform AI coverage;
- automatic optimization or implementation services;
- peer benchmarks;
- broad multi-city or multi-vertical claims;
- API access, bulk import, CRM, analytics, or marketing integrations; and
- mobile applications.

## 13. Founder decisions by gate

### Needed before the first real audit

- The real business, with permission for the private run.
- Initial vertical and city for the launch wedge.
- Approval for paid provider calls and the per-run ceiling.
- Whether a score band is omitted until variance evidence exists.

### Needed before durable delivery

- Private report retention period.
- Recovery identity check and token replacement rules.
- Whether the initial email is transactional delivery only or also includes a
  re-check reminder.

### Needed before real checkout

- Provisional price.
- Payment provider.
- Delivery promise.
- Partial-result threshold.
- Refund, rerun, or credit policy.
- Correction path.
- Customer-facing privacy, retention, and terms language.

### Needed before public launch

- Permissioned or fictional sample strategy.
- Production support contact and response expectation.
- Known-owner pilot verdict.
- Explicit go/no-go approval for strangers.

## 14. Candidate specification sequence

Create and approve only the next specification, not all of them at once:

1. `001-simulated-journey-shell`
2. `002-indonesian-audit-contract`
3. `003-live-report-quality-gate`
4. `004-durable-private-delivery`
5. `005-real-checkout-and-remedy`
6. `006-product-wide-polish`
7. `007-known-owner-pilot`
8. `008-public-launch-controls`
9. `009-comparable-recheck`

The numbering is a candidate sequence. If implementation evidence changes the
critical path, record the change in `NOW.md` and the decision log rather than
quietly reordering work.

## 15. Definition of done for the thin v2 launch

Nuave v2 is ready for a controlled public launch when:

- the landing page accurately explains one Indonesian audit;
- an owner can enter and confirm one exact business;
- the owner can review and approve ten natural Indonesian questions;
- one real payment creates exactly one paid audit entitlement;
- the audit continues without the browser and without founder rescue;
- each observation, source, failure, and version is retained;
- the report passes evidence and Indonesian-language checks;
- the recipient receives and can recover a private report link;
- web and PDF reports show the same facts;
- payment, generation, delivery, and access failures have defined recovery;
- public cost, rate, privacy, retention, correction, and remedy controls exist;
- the product has passed the real-report quality gate and known-owner review;
  and
- everything listed in Section 12 remains absent unless a later approved
  decision adds it.

## 16. Immediate next action

Prepare `specs/001-simulated-journey-shell/SPEC.md` as a draft from this plan,
then review and approve it before changing the application. Its single outcome
is a deterministic, clearly simulated landing-to-report walkthrough using the
existing golden fixture while leaving the live audit engine behavior intact.
