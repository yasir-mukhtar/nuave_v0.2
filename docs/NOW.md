# Nuave now

> Updated: 2026-08-09
> Stage: pre-customer, building the pipeline

## Current objective

Get the measurement path working end to end: a business goes in at the intake
form and a finished report comes out, with nobody stepping in mid-run. This is
Phase 1 in [`VISION.md`](./VISION.md), and it is the blocking asset. Rough copy
and unstyled screens are acceptable at this stage. A broken or manual step is
not.

The compact report synthesis, carry-over guard, and null-extraction fallback
pass offline. Question generation no longer calls any model: the ten questions
are built in code from the verified brief and the fixed Intent-5 matrix, and the
prompts stage is capped at zero paid calls. That template set is currently in
English, which is a known gap. Cumulative accounted spend is USD 0.4357, leaving
USD 4.5643 under the USD 5 ceiling. The next paid step is the ten observations,
which still needs founder approval.

For this immediate task, [`AUDIT.md`](./AUDIT.md) governs execution and review,
and [`VISION.md`](./VISION.md) governs who the customer is, what is sold, the
principles the work must follow, and the phase order.

## What is known

- Nuave sells a one-time audit and a re-check, not subscription software.
- [`VISION.md`](./VISION.md) governs this repository. It sits above this
  document and below the newest founder-approved decision-log entry.
- The build order is pipeline first, then payment and report persistence, then
  one polish pass across every touchpoint, then owners we know, then strangers.
  Phase 2 is a gate: if the pipeline's first real report holds no finding worth
  paying for, everything after it stops until the method is fixed.
- The buyer is the owner or marketing decision-maker of a small or medium
  Indonesian business, approached directly. The audited business is the buyer's
  own business, not a client's.
- The agency, freelancer, and consultant white-label layer is a later business,
  deliberately deferred until direct owner demand is proven or disproven.
- The working promise is to show an owner whether AI systems name their business
  when a customer asks, with the observed answers as evidence, and what to do
  about it.
- The minimum delivery is a reviewed, downloadable report a non-technical owner
  can read in about ten minutes, with a concise summary and neutral
  presentation.
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
  forward as an anchor. A price has to be chosen in Phase 3 because a checkout
  needs a number; treat that price as provisional until strangers respond to it.
- The universal brand prompt context and `generate-ai-visibility-prompts` skill
  support varied business categories through one verified brand scope, five
  unbranded questions, and five branded questions.
- The universal matrix is a working method, not validated cross-industry proof.
  Each business category still needs claims and report review.
- ChatGPT remains the named target product for prompt generation. Any later
  execution must record the exact surface honestly.
- The local landing page describes the agency-facing raw-MVP offer in English
  and Indonesian. That copy contradicts the customer above. It is rewritten in
  Phase 4, not now.
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
  is a known gap against the Indonesian requirement above and must close inside
  Phase 1, because an English report cannot pass the Phase 2 gate.
- New reports use the versioned `plain-en-v1` writing contract: short
  customer-facing explanations, result-first wording, exact evidence excerpts,
  technical run details in the method section, and one protected language-only
  retry when the first draft misses a writing limit. An Indonesian contract
  version is required before an Indonesian report can be checked properly.
- The workflow stores state only in the browser session. It has no account,
  database, payment, public rate limit, or hosted report access. Report
  persistence and payment are Phase 3, and how reports persist — magic link,
  permanent emailed link with no login, or a real account — is still open.
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

- Whether Indonesian small and medium business owners will pay for one audit at
  all.
- What single price they will pay. The Rp149,000 v1 pilot price is not an
  anchor.
- Whether an owner who receives a report acts on any recommendation, or reads
  it, agrees, and does nothing.
- Whether an owner will buy a re-check, and on what interval.
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

Phase 1 only. Everything below is one path: intake form to downloadable report,
no human rescue.

1. Fix question generation so it produces natural Indonesian questions, and keep
   a deterministic Indonesian template set as the guaranteed fallback so the
   stage cannot hard-fail. Use the retained telemetry to attribute the next
   structured-output failure instead of inferring it.
2. Get the compact report path through one live report end to end. It passes 65
   tests offline and has never completed a paid run.
3. Write the Indonesian version of the report writing contract. The current
   limits and banned-jargon list are calibrated for English, so an Indonesian
   report cannot be checked properly until this exists.
4. Move the rest of the `/audit` workflow to Indonesian: intake, stage copy,
   observations, report, evidence export.
5. Make the finished report reachable at an unguessable link instead of living
   only in browser session state, so a run can be closed and reopened.
6. Run one real audit for one real Indonesian business, with founder approval
   for the ten observations. During that run, re-ask two or three questions to
   measure run-to-run variation and set the score band width from the result.
7. Then Phase 2: read that report twice, as a sceptical owner and as a
   professional. If it holds no finding worth paying for, stop and fix the
   method before anything else.

## Not now

- payment, checkout, and report persistence beyond an unguessable link — Phase 3;
- design polish, final copy, and the landing-page rewrite — Phase 4;
- showing the product to any business owner — Phase 5;
- outreach, pricing conversations, and selling — Phase 6;
- a white-label or agency reseller layer, including partner pricing, resale
  margins, and outreach to agencies or freelancers;
- an agency dashboard, client management, or team accounts;
- custom domains or advanced brand controls;
- bulk imports, API access, or integrations;
- automated recurring monitoring, or any subscription. The paid re-check is a
  second measurement the owner chooses to buy and is not covered by this line;
- complex credits, packages, or volume tiers;
- broad multi-vertical support before one vertical and one city work;
- an exact-integer visibility score, or any peer benchmark, before enough audits
  in one category support one honestly; and
- fabricated demand, business outcomes, results, or testimonials.

Public exposure of the workflow is no longer a "not now". Rate limits, cost
controls, privacy terms, and a correction or remedy path are the Phase 3
checklist, and they must exist before any owner outside this repository touches
the product in Phase 5.

## Done for this cycle

This cycle ends when the pipeline runs from intake form to downloadable
Indonesian report without human rescue, one real report has been produced by it,
and that report has been read against the Phase 2 gate with a written verdict on
whether it holds a finding worth paying for.

Material changes to customer, offer, promise, or scope belong in
[`DECISION_LOG.md`](./DECISION_LOG.md). Earlier vertical-specific and
agency-facing plans remain there as decision history, not as the active
direction.
