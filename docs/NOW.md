# Nuave now

> Updated: 2026-08-16
> Stage: pre-customer, building the pipeline

## Current objective

Implementing the founder-approved [`V2_SUBDOMAIN_LAUNCH_PLAN.md`](./V2_SUBDOMAIN_LAUNCH_PLAN.md):
ship this repository to `v2.nuave.ai` in Indonesian with the audit tool behind an
access code, without touching `nuave.ai`.

Status: Phases 1–2 are implemented, committed, and verified; **Phase 3 is
deployed to Cloudflare Workers** (founder chose Cloudflare over the plan's
Vercel target): live at `https://nuave-v2.mail-yasirmukhtar.workers.dev`
(project `nuave-v2`, account `Mail.yasirmukhtar@gmail.com's Account`). The
Indonesian landing renders, robots noindex is active, and the access gate holds
on the live URL: `/` public 200; `/audit` and `/audit/fixture` redirect to
`/access` without the cookie; `/api/audit/*` returns 401 before any handler
runs; correct `nuave_access` cookie passes (200/400); static assets and CSS
serve correctly.

**CI is live**: GitHub Actions (`.github/workflows/deploy-pages.yml`) builds
with `@opennextjs/cloudflare` and deploys to the `nuave-v2` worker on every
push to `main` (verified end to end). All GitHub secrets are set
(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NUAVE_ACCESS_CODE`,
`NUAVE_PROVIDER=gemini`, `GEMINI_API_KEY`, `NUAVE_FIXTURE_PREVIEW_ENABLED=true`,
`OPENAI_AUDIT_CARRYOVER_COST_USD=0.4357`).

Deploy target note: Next.js 16 via OpenNext officially targets **Workers with
static assets**, not Pages — Pages advanced mode (`_worker.js`) ran the gate
but could not serve static assets. The GitHub Actions workflow
(`.github/workflows/deploy-pages.yml`) builds with build-time env from secrets
and deploys with `cloudflare/wrangler-action@v3`. **Middleware env is inlined
at build time**, so `NUAVE_ACCESS_CODE` and all runtime envs must be set as
build-time envs in CI; changing the access code requires a redeploy. The
production access code is stored locally at `.secrets/v2-access-code.txt`
(gitignored) and in `.env.production.local`; CI secrets still need to be
created in the repo (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID,
NUAVE_ACCESS_CODE, NUAVE_PROVIDER=gemini, GEMINI_API_KEY,
NUAVE_FIXTURE_PREVIEW_ENABLED=true, OPENAI_AUDIT_CARRYOVER_COST_USD=0.4357).

Remaining: attach `v2.nuave.ai` custom domain to the worker (Cloudflare
dashboard, DNS record auto-managed; DNS host is Cloudflare, apex `nuave.ai`
untouched), then the Phase 5 live smoke test (founder names a business;
budgeted for the free Gemini path, `NUAVE_PROVIDER=gemini`, against the USD
0.4357 accounted spend / USD 5 ceiling in NOW.md below).

Known gap logged by the launch plan, not fixed in this task: `/audit` and
`/audit/fixture` remain mostly English in hardcoded JSX, and the landing copy is
still agency-facing by explicit founder decision; the founder edits the landing
directly after the task.

The earlier journey-shell objective below remains the active product build once
the launch task ships.

After the shell passes, replace boundaries in the order defined by
[`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md): Indonesian contracts, live report
and quality gate, durable private delivery, real checkout and remedies, polish,
pilot, launch, then re-check. Cumulative accounted private-run spend remains USD
0.4357, leaving USD 4.5643 under the USD 5 ceiling. No additional paid
observation is approved by this planning change.

For the immediate task, the end-to-end plan governs sequencing, while
[`VISION.md`](./VISION.md), [`PRODUCT.md`](./PRODUCT.md), and
[`AUDIT.md`](./AUDIT.md) govern product and evidence behavior. The [`001-simulated-journey-shell`](../specs/001-simulated-journey-shell/SPEC.md)
specification is founder-approved and now **Implementing**. Chunk 1 built the
protected landing entry, example intake, fact confirmation, and ten-question
approval. Chunk 2 added the order summary, unmistakably simulated checkout,
deterministic simulated processing, and the evidence-faithful example report
destination with backward navigation, refresh recovery, start over, and a
testable construction-failure path. The next bounded action is Chunk 3:
small browser automation proving the complete fixture path, refresh
restoration, reset behavior, the persistent simulation disclosure, and the
absence of audit API calls.

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
- The score is reported counts-led: the observed count with its denominator is
  the headline, and the AI Visibility Score sits underneath it as a band, not an
  exact integer, with discovery, recognition, recommendation, and information
  accuracy keeping their own denominators.
- The re-check, run six to eight weeks after the first audit, is the recurring
  product. The interval is a recommended cadence, not a derived one.
- Outreach is demonstrate-before-selling: run a few unbranded questions on a
  prospect before any contact, then lead with the observed finding.
- Nuave has zero paying v2 customers.
- Pricing is open. The Rp149,000 price from the v1 pilot must not be carried
  forward as an anchor. A price has to be chosen when real checkout is built;
  treat that price as provisional until strangers respond to it. The simulated
  checkout must not introduce a numeric price anchor.
- The universal brand prompt context and `generate-ai-visibility-prompts` skill
  are retained mechanisms for building one verified question pack with five
  unbranded and five branded questions.
- The active launch scope remains one vertical in one city until it works. The
  universal matrix is not permission to claim cross-industry support; each new
  category still needs claims and report review.
- ChatGPT remains the named target product for prompt generation. Any later
  execution must record the exact surface honestly.
- The local landing page describes the agency-facing raw-MVP offer in English
  and Indonesian. The journey shell changes only enough routing and copy to make
  the owner-facing walkthrough coherent. The full landing rewrite remains in
  the later product-wide polish pass.
- A local `/audit` workflow covers official-website extraction, human fact
  confirmation, ten-question prompt review, independent OpenAI Responses API
  execution with web search, final-format report generation, A4 print/PDF, and
  complete JSON evidence export.
- The unlisted workflow uses a route-scoped HeroUI five-stage interface, locks
  verified inputs after execution starts, streams real per-prompt status,
  preserves interrupted observations in the browser session, and expands all ten
  detailed findings in print from the same report data shown on screen.
- The `/audit` workflow currently uses English from intake through prompt
  generation, API observations, the final report, and the evidence export. That
  is a known gap against the Indonesian requirement above and must close in the
  current pipeline build, because an English report cannot pass the
  report-quality gate.
- New reports use the versioned `plain-en-v1` writing contract: short
  customer-facing explanations, result-first wording, exact evidence excerpts,
  technical run details in the method section, and one protected language-only
  retry when the first draft misses a writing limit. An Indonesian contract
  version is required before an Indonesian report can be checked properly.
- The workflow stores state only in the browser session. It has no account,
  database, payment, public rate limit, or hosted report access. The shell may
  simulate checkout and a private destination, but durable persistence and real
  payment follow the report-quality gate. The first real product uses an
  unguessable, revocable link with no required account; retention and recovery
  details remain open.
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
- The single report synthesis returns at most three priorities, each tied to an
  observed gap. The report retains synthesis/prompt versions and requested/
  returned model provenance, and all audit contract tests pass normally.
- Report orchestration records one-call versus language-retry behavior, retry
  violations, and initial/final response IDs. Evidence failures never retry, and
  a protected-field mutation after retry is blocked.
- Fictional screen/print QA passed the five-section report, ten screen details,
  ten expanded print details, buyer attribution, direct denominators, and v3
  export. The temporary QA route was removed before the final build.
- Private audit calls retain usage, latency, response IDs, web-search calls,
  failures, retries, and accounted cost. The workflow is pinned to
  `gpt-5.6-luna`, standard service tier, a USD 5 per-session ceiling, and stage
  ceilings of 1 extraction, 1 prompt generation, 10 observations, and 3 report
  calls.
- A private batch run completed extraction, human fact review, ten question
  review, and all ten observations. It stopped at 19 calls and USD 0.3483
  because no report cleared both structured-output and integrity gates. No
  report, PDF, export, sample, or business finding was published or stored in
  this repository.
- Live report failures showed that a monolithic schema is unstable: medium
  reasoning exhausted 10,000, 20,000, and sometimes 40,000 output-token
  allowances, while completed drafts still varied on protected evidence fields.
  Observable run, appearance, exact excerpts, allowed sources, and competitor
  links are now normalized in code.
- The corrected report call asks the model only for compact narrative,
  priorities, and recommendation/comparison/information assessments. Code owns
  the ten run states, visible appearances, exact excerpts, source links, detail
  wording, and verified-competitor links. The compact path passes 65 audit tests
  but has not yet passed a live report.
- A fresh private session can bootstrap a server-enforced carry-over before any
  paid action. With `OPENAI_AUDIT_CARRYOVER_COST_USD=0.3483`, the local UI shows
  zero new calls, USD 0.3483 accounted, and USD 4.6517 remaining. A client
  cannot lower the configured carry-over in its request.
- Null parsed extraction output falls back to manual fact entry without a second
  paid call. The fallback keeps only founder-entered identity/context fields and
  the official URL, discards unparsed model content and extracted evidence,
  explains the provider state when safely available, and requires verification
  before the brief can be approved.
- Model-authored question generation failed four consecutive live attempts on
  structured output, most recently on a ten-strings-only schema with no default
  reasoning and a 3,000-token ceiling. Whether those calls exhausted their output
  allowance is an inference, not a confirmed provider diagnosis. Audit call
  telemetry now retains provider status, incomplete reason, and whether output
  text or a refusal was returned, so the remaining structured-output stages can
  be attributed next time.
- Question generation currently uses `deterministic-v4-en` and makes no API
  call. Code builds the ten ordered questions from the verified brief and the
  fixed matrix, keeps five branded and five unbranded questions, two per
  category, records the brief fields each question used, and keeps every
  question in human review. Ninety-three audit tests pass offline.

## What is not known

- Whether Indonesian small and medium business decision-makers will pay for one
  audit at all.
- What single price they will pay. The Rp149,000 v1 pilot price is not an
  anchor.
- Whether a customer who receives a report acts on any recommendation, or reads
  it, agrees, and does nothing.
- Whether a customer will buy a re-check, and on what interval.
- How wide the score bands need to be. They must be wider than the variation
  between two identical runs, and that run-to-run variation has not been
  measured.
- Whether a category benchmark can be stated after roughly twenty audits or
  needs many more.
- Which verticals the method transfers to without new claims and report review.
- Whether demonstrate-before-selling outreach converts, and at what rate.
- Whether the structured-output failures are a provider limit or a bug in how
  the call is made.

## Do now

Follow the phase gates in [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md). The
current bounded sequence is:

1. Chunk 1 of the founder-approved
   [`001-simulated-journey-shell`](../specs/001-simulated-journey-shell/SPEC.md)
   is complete: the protected landing entry, example intake, fact
   confirmation, and ten-question approval now exist.
2. Chunk 2 is complete: the order summary, simulated checkout, deterministic
   simulated processing, and fixture-backed example report now exist, with the
   review corrections applied (truthful construction-failure state, explicit
   resume after interruption, confirmed start over everywhere, tighter
   persisted-state validation, and a fixture-derived order summary).
3. Build Chunk 3: the smallest browser automation that proves the complete
   fixture path, refresh restoration, explicit resume, reset behavior, the
   persistent simulation disclosure, and the absence of audit API calls, then
   independently verify the fixture path.
4. Specify and implement the Indonesian audit and report contract.
5. Connect the live engine and produce one real Indonesian report.
6. Apply the report-quality gate. Stop and fix the method if the report holds no
   finding worth paying for.
7. Only after the gate, add durable private delivery, real payment and remedies,
   product-wide polish, and customer exposure in the planned order.

## Not now

- real payment, durable jobs, and durable report persistence — after the
  report-quality gate; an explicitly simulated checkout and destination are in
  scope for the fixture journey;
- design polish, final copy, and the landing-page rewrite — after checkout and
  persistence;
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
- an exact-integer visibility score, or any peer benchmark, before enough audits
  in one category support one honestly; and
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
