# Nuave now

> Updated: 2026-09-01
> Stage: pre-customer, building the pipeline

## Current objective

Phase 3 of [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md), specified by
[`003-live-report-quality-gate`](../specs/003-live-report-quality-gate/SPEC.md):
the protected live engine is now integrated on the OpenCode Go production
method. The remaining Phase 3 gate is to produce the first founder-supervised
real Indonesian report through the actual product path and judge whether it
contains a finding worth paying for.

## Active presentation-layer work

The founder-approved UI-stack migration is active on the dedicated
`feat/ui-stack-migration` branch from baseline `1f28bdd`. Its canonical design
authority is [`docs/DESIGN.md`](./DESIGN.md). The migration is presentation-layer
work: it standardizes generic UI on shadcn/Base UI, uses Tailwind CSS v4 and
the BeUI light baseline, and preserves the existing intake, audit, report,
fixture, validation, and provider-call contracts. It must make no live or paid
AI-provider calls and must not change backend or business logic.

Wave 1 of the Phase 6 design pass
([`006-product-wide-polish`](../specs/006-product-wide-polish/SPEC.md)) shipped
alongside it on 2026-08-20: P0 foundation and P1 landing are verified (see its
`VERIFICATION.md`). Wave 2 (P2–P7) waits for the report-quality gate.

## Deployment state

**`https://v2.nuave.ai` is live** on Cloudflare Workers, serving the Indonesian
landing. `nuave.ai` and `www.nuave.ai` are untouched.

The v2 subdomain launch is **complete**. Its plan is retired to
[`Archive Candidates/completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md`](../Archive%20Candidates/completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md)
as a record of how the deployment was built. It is no longer an active
objective; the facts it established are recorded here instead.

**The access gate is removed in code** (2026-08-20, spec 006 P1): the
middleware rule and `/access` page are deleted, and `/audit` and `/api/audit/*`
ship ungated under the founder's recorded interim-exposure acceptance
(`docs/DECISION_LOG.md`, 2026-08-20) — the site remains noindex and
direct-link only, and a minimal server-side rate/cost guard is a prerequisite
before any public link sharing. **The live deployment still serves the
previous gated build** until the next redeploy; deleting the now-unused
`NUAVE_ACCESS_CODE` GitHub secret is a founder action. The custom domain is
attached to worker `nuave-v2` (Cloudflare manages the proxied AAAA record).
The deployment URL `https://nuave-v2.mail-yasirmukhtar.workers.dev` remains as a
fallback.

**CI is live**: GitHub Actions (`.github/workflows/deploy-pages.yml`) builds with
`@opennextjs/cloudflare` and deploys to the `nuave-v2` worker on every push to
`main`, verified end to end. The production provider configuration is pinned to
`NUAVE_PROVIDER=opencodego`, `NUAVE_QUESTION_PROVIDER=opencodego`,
`OPENAI_BASE_URL=https://opencode.ai/zen/go/v1`,
`OPENAI_AUDIT_MODEL=gpt-5.6-luna`, and
`OPENAI_AUDIT_REASONING_EFFORT=low`. The canonical server credential is
`OPENCODEGO_API_KEY`; because the implementation reuses the OpenAI SDK as a
Responses-compatible adapter, CI also aliases the same secret to
`OPENAI_API_KEY` inside the gitignored build env. That alias is an SDK/build
compatibility detail, not a second production credential. The founder reports
the required GitHub configuration is set. Other required deployment values
remain `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`NUAVE_FIXTURE_PREVIEW_ENABLED=true`, and
`OPENAI_AUDIT_CARRYOVER_COST_USD=0.4357`. Credential values are never committed.

Deploy target note: Next.js 16 via OpenNext officially targets **Workers with
static assets**, not Pages — Pages advanced mode (`_worker.js`) ran the gate but
could not serve static assets. Runtime envs are inlined at build time in CI, so
env changes require a redeploy.

Known gap carried over from the launch, partially closed: the surrounding
`/audit` and `/audit/fixture` interface still contains English hardcoded JSX in
places (closes in the product-wide polish pass, spec 006 P2–P7). This does not
change the protected Spec 003 method contract: generated questions, audit
observations, and the final report are Indonesian. The landing's prohibited
claims were excised and replaced with the approved interim copy on 2026-08-20
(spec 006 P1); final landing copywriting remains a separate approved copy task.

## Build order and sequencing

After the shell passes, replace boundaries in the order defined by
[`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md): Indonesian contracts, live report
and quality gate, durable private delivery, real checkout and remedies, polish,
pilot, launch, then re-check. Cumulative accounted private-run spend remains USD
0.4357, leaving USD 4.5643 under the USD 5 ceiling. No additional paid
observation is approved by this documentation reconciliation.

Specs 001 and 002 provide the verified fixture and Indonesian-contract
baselines. The current bounded work is Spec 003 only: the OpenCode Go migration
and production-method lock are implemented and automated checks are green; the
first founder-supervised paid product-path report and its quality-gate judgment
remain intentionally pending.

## What is known

- Nuave sells a one-time audit and a re-check, not subscription software.
- [`VISION.md`](./VISION.md) governs this repository. It sits above this
  document and below the newest founder-approved decision-log entry.
- The build order is a fixture-backed complete journey first, then Indonesian
  audit/report contracts, the live report and quality gate, durable private
  delivery, real payment, one polish pass, target owners we know, and strangers.
  The simulated checkout is never a real purchase. If the first real report
  holds no finding worth paying for, everything commercial stops until the
  method is fixed.
- The buyer is the owner or marketing decision-maker of a small or medium
  Indonesian business, approached directly. The audited business is the buyer's
  own business, not a client's.
- The agency, freelancer, and consultant white-label layer is a later business,
  deliberately deferred until direct-business demand is proven or disproven.
- The working promise is to show the person responsible for marketing whether
  AI systems name their business when a customer asks, with the observed
  answers as evidence, and what to do about it.
- The minimum delivery is a reviewed, downloadable report a non-technical
  business decision-maker can read in about ten minutes, with a concise summary
  and neutral presentation.
- Every customer-facing touchpoint moves to Indonesian: landing page, intake,
  the questions asked of AI systems, the report, and outreach messages. English
  remains acceptable only for internal engineering artefacts no customer sees.
- The Nuave score is the direct visible-appearance count across the ten retained
  answers, for example 4/10. **Tanpa menyebut bisnis Anda**, **Menyebut bisnis
  Anda**, recommendation, comparison, and public-information assessment remain
  visible separately with their own eligible denominators.
- The re-check, run six to eight weeks after the first audit, is the recurring
  product. The interval is a recommended cadence, not a derived one.
- Outreach is demonstrate-before-selling: run a few unbranded questions on a
  prospect before any contact, then lead with the observed finding.
- Nuave has zero paying v2 customers.
- The current one-audit total is Rp99.000, with no additional tax or fee charged
  to the customer at checkout. An unpaid Order Preview keeps that quote for 30
  days, after which the customer must refresh it. Treat the price as provisional
  until strangers respond to it.
- Midtrans is the approved checkout provider for QRIS, bank transfer, GoPay,
  and DANA, subject to production configuration and verification.
- The target customer sequence is Landing → Order Preview → Payment → Business
  Facts → Questions → Audit Run → Audit Report. Payment unlocks personalized
  preparation; only the explicit approved-question start action consumes the
  audit.
- The canonical ten-slot matrix and retained `generate-ai-visibility-prompts`
  skill suggest one verified question pack. It has 6 unnamed slots and 4 named
  slots; slot 9 also requires the comparison target and a comparison relation.
  Customers may edit wording within a fixed slot, but cannot change its
  category, declared purpose, identity policies, comparison-target policy, or
  composition. Deterministic invalid edits are blocked; undetectable purpose
  drift warns and proceeds in V1 without a model-assisted validator.
- The active launch scope remains one vertical in one city until it works. The
  universal matrix is not permission to claim cross-industry support; each new
  category still needs claims and report review.
- ChatGPT remains the named target product for prompt generation. Any later
  execution must record the exact surface honestly.
- The local landing page describes the agency-facing raw-MVP offer in English
  and Indonesian. The journey shell changes only enough routing and copy to make
  the owner-facing walkthrough coherent. The full landing rewrite remains in
  the later product-wide polish pass.
- A local `/audit` workflow covers official-website or Instagram-source
  extraction, human fact confirmation, ten-question prompt review, independent
  OpenCode Go Responses-compatible execution with GPT-5.6 Luna and web search, final-format
  report generation, A4 print/PDF, and complete JSON evidence export.
- The protected Phase 3 production path is OpenCode Go end to end:
  `NUAVE_PROVIDER=opencodego`, `NUAVE_QUESTION_PROVIDER=opencodego`, endpoint
  `https://opencode.ai/zen/go/v1`, model `gpt-5.6-luna`, and reasoning `low`.
  `OPENCODEGO_API_KEY` is the canonical credential. `OPENAI_API_KEY` may be
  populated internally/build-time only for the existing OpenAI SDK adapter.
  Direct OpenAI, Gemini, Groq/Tavily, and OpenRouter are testing-only and are
  rejected by the protected path in production.
- The production method uses no web search for Indonesian question generation;
  web search restricted to the submitted official website/domain for
  extraction; required web search for every audit observation; and no web
  search for report synthesis. Missing observation search is a technical
  failure, not a valid visibility result.
- The unlisted workflow now uses shadcn/ui generic primitives backed by Base UI,
  Tailwind CSS v4 tokens, BeUI higher-order activity, Motion only for the
  indeterminate report phase, and Tabler generic icons. It locks verified inputs
  after execution starts, streams real per-prompt status, preserves interrupted
  observations in the browser session, and expands all ten detailed findings in
  print from the same report data shown on screen.
- The live question-generation boundary writes ten natural Indonesian
  questions from the minimized confirmed brief with no search, then keeps human
  review before audit start. The live observation path uses the versioned
  Indonesian `neutral-response-v1` instruction with required web search. The
  report route synthesizes in Indonesian and applies the Indonesian report
  language checks. Exact evidence excerpts and technical provenance remain
  faithful to the recorded run rather than being translated or rewritten.
- Protected Indonesian reports use the versioned `plain-id-v1` writing
  contract: concise customer-facing explanations, result-first wording, exact
  evidence excerpts, technical run details in the method section, and one
  protected language-only retry when the first draft misses a writing limit.
- The workflow stores state only in the browser session. It has no account,
  database, payment, public rate limit, or hosted report access. The shell may
  simulate checkout and a private destination, but durable persistence and real
  payment follow the report-quality gate. The later access specification must
  provide private, revocable, recoverable access, but whether it uses a private
  link, narrow report history, an account, or another bounded mechanism remains
  open. A general dashboard remains out of scope.
- One founder-approved private live smoke test completed all ten observations
  with `gpt-5.6-luna` and low reasoning. The first report attempt was correctly
  blocked for an unsupported brand-appearance claim; a manual retry rendered a
  report, but review exposed citation-only appearance, overloaded status,
  confirmation-versus-correction, priority-evidence, and telemetry gaps. The
  private report and raw evidence remain outside the repository and unpublished.
- The workflow no longer injects an unverified Indonesia location into audit web
  searches. A future location hint must come from verified structured input.
- A privacy-safe fictional golden fixture reproduces the observed failure
  patterns. Current evidence guardrails pass, while seven executable expected-
  failure tests define the missing result dimensions, confirmation state,
  priority limits, gap linkage, and denominator labels.
- The report uses `nuave-report-v3` and `nuave-evidence-v3`. Run, appearance,
  recommendation, comparison, and information are separate; observed competitors
  carry prompt evidence; citation URLs cannot count as visible brand appearance;
  and a language retry cannot change those facts.
- Discovery, recognition, comparison, information, and coverage facts are
  computed in code with direct denominators and failed-test context. Method copy
  is deterministic, and unsupported ranking, equivalence, guarantee, revenue,
  and causal claims are blocked before rendering.
- Report synthesis allows at most five priorities. A delivered report still
  requires one to five evidence-backed actions and must not invent a deficiency
  to meet the minimum. When no corrective gap is supported, an action may
  preserve a strength, improve its public evidence, or check an explicitly
  untested aspect. The report retains synthesis/prompt versions and exact
  requested/returned model provenance.
- A delivered paid report requires 10/10 evaluable observations, one to five
  material findings, and one to five evidence-backed actions. One or two strong
  findings are sufficient. A substantive refusal is evaluable; a provider or
  policy block with no usable answer is a failed test and receives targeted
  recovery.
- If technical recovery cannot reach 10/10, delivery is delayed while Nuave
  retries the failed work or the customer asks founder support for help. No
  partial report is delivered. A validated web report may be delivered while
  PDF generation is retried from the same immutable report version.
- Before audit start, an incorrect business can be corrected under the same
  order and its questions regenerated. After start, the original run stays
  locked; founder support may grant one replacement audit chance from the admin
  support view. A replacement order is the last resort.
- Transactional email uses Resend as **Tim Nuave <support@nuave.ai>**. Customer
  support uses `support@nuave.ai`.
- Report orchestration records one-call versus language-retry behavior, retry
  violations, and initial/final response IDs. Evidence failures never retry, and
  a protected-field mutation after retry is blocked.
- Fictional screen/print QA passed the five-section report, ten screen details,
  ten expanded print details, buyer attribution, direct denominators, and v3
  export. The temporary QA route was removed before the final build.
- Private audit calls retain usage, latency, response IDs, web-search calls,
  failures, retries, and accounted cost. The protected method is pinned to
  `gpt-5.6-luna`, low reasoning, standard service tier, a USD 5 per-session
  ceiling, and stage ceilings of 1 extraction, 1 prompt generation, 10
  observations, and 3 report calls.
- A private batch run completed extraction, human fact review, ten question
  review, and all ten observations. It stopped at 19 calls and USD 0.3483
  because no report cleared both structured-output and integrity gates. No
  report, PDF, export, sample, or business finding was published or stored in
  this repository.
- Earlier live report failures showed that a monolithic schema was unstable:
  medium reasoning exhausted 10,000, 20,000, and sometimes 40,000 output-token
  allowances, while completed drafts still varied on protected evidence fields.
  Those runs predate the current protected low-reasoning OpenCode Go method.
  Observable run, appearance, exact excerpts, allowed sources, and competitor
  links are now normalized in code.
- The corrected report call asks the model only for compact narrative,
  priorities, and recommendation/comparison/information assessments. Code owns
  the ten run states, visible appearances, exact excerpts, source links, detail
  wording, and verified-competitor links. Automated coverage is green on the
  integrated migration, but the first founder-supervised paid report through
  the current product path has not yet occurred.
- A fresh private session can bootstrap a server-enforced carry-over before any
  paid action. With `OPENAI_AUDIT_CARRYOVER_COST_USD=0.3483`, the local UI shows
  zero new calls, USD 0.3483 accounted, and USD 4.6517 remaining. A client
  cannot lower the configured carry-over in its request.
- Null parsed extraction output falls back to manual fact entry without a second
  paid call. The fallback keeps only founder-entered identity/context fields and
  the official URL, discards unparsed model content and extracted evidence,
  explains the provider state when safely available, and requires verification
  before the brief can be approved.
- Model-authored question generation previously failed four consecutive live
  attempts on structured output. The current live path uses one bounded,
  no-search OpenCode Go/GPT-5.6 Luna question-writer call from the minimized
  confirmed brief, preserves provider telemetry/provenance, and falls back to a
  deterministic Indonesian pack when the provider or format fails. Every one of
  the ten resulting questions remains subject to human review before audit
  start.

## What is not known

- Whether Indonesian small and medium business decision-makers will pay for one
  audit at all.
- Whether customers will pay the current Rp99.000 total.
- Whether a customer who receives a report acts on any recommendation, or reads
  it, agrees, and does nothing.
- Whether a customer will buy a re-check, and on what interval.
- How much ordinary run-to-run variation affects the direct appearance count.
- Whether a category benchmark can be stated after roughly twenty audits or
  needs many more.
- Which verticals the method transfers to without new claims and report review.
- Whether demonstrate-before-selling outreach converts, and at what rate.
- Whether the structured-output failures are a provider limit or a bug in how
  the call is made.
- The Module 07 private-access, return, expiry, revocation, and recovery
  mechanism; use [`briefs/REPORT_ACCESS_RECOVERY.md`](./briefs/REPORT_ACCESS_RECOVERY.md)
  when that decision session starts.
- The maximum delayed-delivery period and terminal remedy if targeted retries
  and founder support still cannot complete 10/10.
- The support response expectation and recipient-change verification method.
- Whether an objectively wrong delivered report needs a separate correction
  submission and corrected-version notification workflow.

## Do now

Follow the phase gates in [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md). The
current bounded sequence is:

1. Treat Specs 001 and 002 as the verified fixture/Indonesian-contract
   baselines. Spec 002's verified baseline at `83ad34c` is 274/274 audit unit
   tests (18 files), 82/82 fixture-journey unit tests (4 files), and 33/33 e2e
   tests; check and build passed.
2. Treat the 2026-08-21 OpenCode Go migration as implemented but not as the
   Spec 003 quality-gate pass. The protected path is locked to OpenCode Go,
   GPT-5.6 Luna, low reasoning, the method-specific search rules, and the
   Indonesian question/observation/report contracts; current automated
   verification is recorded in Spec 003 `VERIFICATION.md`.
3. Run the first founder-supervised paid real audit through the actual `/audit`
   product path without changing the production method mid-run. Do not replace
   this with a script-only provider exercise.
4. Apply the report-quality gate to that rendered Indonesian report and its
   evidence. Stop and fix the method if it holds no finding worth paying for.
5. Only after the gate, add durable private delivery, real payment and remedies,
   the remaining product-wide polish, and customer exposure in the planned
   order.

## Not now

- real payment, durable jobs, and durable report persistence — after the
  report-quality gate; an explicitly simulated checkout and destination are in
  scope for the fixture journey;
- the remaining design polish and final copy — after the report-quality gate;
- showing the product to any target customer — after the product-wide polish
  pass;
- outreach, pricing conversations, and selling — after known-customer review;
- a white-label or agency reseller layer, including partner pricing, resale
  margins, and outreach to agencies or freelancers;
- an agency dashboard, client management, or team accounts;
- custom domains or advanced brand controls;
- bulk imports, API access, or integrations;
- automated recurring monitoring, or any subscription. The paid re-check is a
  second measurement the customer chooses to buy and is not covered by this
  line;
- complex credits, packages, or volume tiers;
- broad multi-vertical support before one vertical and one city work;
- a normalized, banded, percentage, rank, or peer benchmark score beyond the
  direct observed count out of ten; and
- fabricated demand, business outcomes, results, or testimonials.

Public exposure of the workflow is no longer a "not now". Rate limits, cost
controls, privacy terms, and a correction or remedy path are prerequisites for
external use, and they must exist before any customer outside this repository
touches the product.

## Done for this cycle

This cycle ends when the pipeline runs from intake form to downloadable
Indonesian report without human rescue, one real report has been produced by it,
and that report has been read against the report-quality gate with a written
verdict on whether it holds a finding worth paying for.

Material changes to customer, offer, promise, or scope belong in
[`DECISION_LOG.md`](./DECISION_LOG.md). Earlier vertical-specific and
agency-facing plans remain there as decision history, not as the active
direction.
