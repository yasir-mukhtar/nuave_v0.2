# Nuave now

> Updated: 2026-08-08
> Stage: pre-customer raw MVP

## Current objective

Produce one credible Indonesian sample audit by hand, from real observations and
without depending on the automated workflow, then test whether Indonesian small
and medium business owners will pay for one AI visibility audit of their own
business.

The compact report synthesis, carry-over guard, and null-extraction fallback
pass offline. Two live attempts proved that model-authored structured question
generation is unreliable in this path, so question generation no longer calls
any model: the ten questions are now built in code from the verified brief and
the fixed Intent-5 matrix, and the prompts stage is capped at zero paid calls.
Cumulative accounted spend remains USD 0.4357, leaving USD 4.5643 under the
existing USD 5 ceiling. The next paid step is the ten observations, which still
needs founder approval. That automated run is no longer on the critical path;
the hand-made sample is.

For this immediate task, [`AUDIT.md`](./AUDIT.md) governs execution and review,
and [`VISION.md`](./VISION.md) governs who the customer is, what is sold, and
the principles the work must follow.

## What is known

- Nuave is a manually delivered, one-time audit, not subscription software.
- [`VISION.md`](./VISION.md) now exists and governs this repository. It sits
  above this document and below the newest founder-approved decision-log entry.
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
- One business owner can order one audit for one business without an account or
  dashboard.
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
- Pricing is open. The former Rp149,000 clinic-owner price must not be carried
  forward as an anchor without validation.
- EXP-R1 produced a `PASS_CANDIDATE` dental-clinic report from real evidence:
  [`REPORT.md`](../experiments/runs/2026-07-20-sozo-dental-depok/REPORT.md).
  It is methodology evidence, not demand evidence.
- The universal brand prompt context and `generate-ai-visibility-prompts` skill
  now support varied business categories through one verified brand scope, five
  unbranded questions, and five branded questions.
- The universal matrix is a working method, not validated cross-industry proof.
  Each business category still needs claims and report review.
- The former dental prompt context and skill are preserved under explicit
  dental-clinic names for later dental experiments.
- ChatGPT remains the named target product for prompt generation. Any later
  execution must record the exact surface honestly.
- The local landing page describes the agency-facing raw-MVP offer in English
  and Indonesian. That copy no longer matches the customer above and needs
  rewriting. Its report preview is illustrative, the pilot price remains
  unpublished, and no client result or demand claim is shown.
- A local `/audit` workflow now covers official-website extraction, human fact
  confirmation, ten-question prompt review, independent OpenAI Responses API
  execution with web search, final-format report generation, A4 print/PDF, and
  complete JSON evidence export.
- The unlisted workflow now uses a route-scoped HeroUI five-stage interface,
  locks verified inputs after execution starts, streams real per-prompt status,
  preserves interrupted observations in the browser session, and expands all
  ten detailed findings in print from the same report data shown on screen.
- The `/audit` workflow currently uses English from intake through prompt
  generation, API observations, the final report, and the evidence export. That
  is now a known gap against the Indonesian requirement above. The public
  landing page remains bilingual.
- New reports use the versioned `plain-en-v1` writing contract: short
  customer-facing explanations, result-first wording, exact evidence excerpts,
  technical run details in the method section, and one protected language-only
  retry when the first draft misses a writing limit.
- The workflow stores state only in the browser session. It has no account,
  database, payment, public rate limit, or hosted report access.
- One founder-approved private live smoke test completed all ten observations
  with `gpt-5.6-luna` and low reasoning. The first report attempt was correctly
  blocked for an unsupported brand-appearance claim; a manual retry rendered a
  report, but review exposed citation-only appearance, overloaded status,
  confirmation-versus-correction, priority-evidence, and telemetry gaps. The
  private report and raw evidence remain outside the repository and unpublished.
- The workflow no longer injects an unverified Indonesia location into audit web
  searches. A future location hint must come from verified structured input.
- A privacy-safe fictional golden fixture now reproduces the observed failure
  patterns. Current evidence guardrails pass, while seven executable expected-
  failure tests define the missing result dimensions, confirmation state,
  priority limits, gap linkage, and denominator labels.
- The report now uses `nuave-report-v3` and `nuave-evidence-v3`. Run,
  appearance, recommendation, comparison, and information are separate;
  observed competitors carry prompt evidence; citation URLs cannot count as
  visible brand appearance; and a language retry cannot change those facts.
- Discovery, recognition, comparison, information, and coverage facts are now
  computed in code with direct denominators and failed-test context. Method copy
  is deterministic, and unsupported ranking, equivalence, guarantee, revenue,
  and causal claims are blocked before rendering.
- The single report synthesis now returns at most three priorities, each tied to
  an observed gap. The report retains synthesis/prompt versions and requested/
  returned model provenance, and all audit contract tests pass normally.
- Report orchestration now records one-call versus language-retry behavior,
  retry violations, and initial/final response IDs. Evidence failures never
  retry, and a protected-field mutation after retry is blocked.
- Fictional screen/print QA passed the five-section report, ten screen details,
  ten expanded print details, buyer attribution, direct denominators, and v3
  export. The temporary QA route was removed before the final build.
- Private audit calls now retain usage, latency, response IDs, web-search calls,
  failures, retries, and accounted cost. The workflow is pinned to
  `gpt-5.6-luna`, standard service tier, a USD 5 per-session ceiling, and future
  stage ceilings of 1 extraction, 1 prompt generation, 10 observations, and 3
  report calls.
- The private Masryef Batch 7 run completed extraction, human fact review, ten
  question review, and all ten observations. It stopped at 19 calls and USD
  0.3483 because no report cleared both structured-output and integrity gates.
  No report, PDF, export, sample, or business finding was published or stored in
  this repository.
- Live report failures showed that a monolithic schema is still unstable:
  medium reasoning exhausted 10,000, 20,000, and sometimes 40,000 output-token
  allowances, while completed drafts still varied on protected evidence fields.
  Observable run, appearance, exact excerpts, allowed sources, and competitor
  links are now normalized in code, but the model-authored schema remains too
  large for another paid run.
- The corrected report call now asks the model only for compact narrative,
  priorities, and recommendation/comparison/information assessments. Code owns
  the ten run states, visible appearances, exact excerpts, source links, detail
  wording, and verified-competitor links. The compact path passes 65 audit tests
  but has not yet passed a live report.
- A fresh private session can now bootstrap a server-enforced carry-over before
  any paid action. With `OPENAI_AUDIT_CARRYOVER_COST_USD=0.3483`, the local UI
  shows zero new calls, USD 0.3483 accounted, and USD 4.6517 remaining. A client
  cannot lower the configured carry-over in its request.
- One founder-approved fresh Masryef attempt confirmed that carry-over guard,
  then stopped after its single extraction call returned no usable parsed
  structured output. The call accounted for USD 0.0263; cumulative spend is USD
  0.3746 and no prompt, observation, report, PDF, export, sample, or publication
  followed.
- Null parsed extraction output now falls back to manual fact entry without a
  second paid call. The fallback keeps only founder-entered identity/context
  fields and the official URL, discards unparsed model content and extracted
  evidence, explains the provider state when safely available, and requires
  verification before the brief can be approved. Mocked completed-null,
  incomplete-output-limit, and valid-parsed cases pass offline.
- The final automated Masryef attempt confirmed the extraction fallback live,
  but the one question-generation call then completed without usable parsed
  structured data. The run stopped at two new calls and USD 0.4062 cumulative
  spend; no questions, observations, report, PDF, export, sample, or publication
  followed.
- The live `draft-v3-en` retry still returned no usable parsed question output
  despite the ten-string-only schema, no default reasoning, and a 3,000-token
  ceiling. The call increased cumulative spend from USD 0.4317 to USD 0.4357,
  consistent with output exhaustion, but exact completion details were not
  retained. No questions, observations, report, PDF, export, or sample followed.
- Question generation now uses `deterministic-v4-en` and makes no API call. Code
  builds the ten ordered questions from the verified brief and the fixed matrix,
  keeps five branded and five unbranded questions, two per category, records the
  brief fields each question actually used, and keeps every question in human
  review. The prompts stage now refuses any paid call, so this step cannot fail
  on structured output and cannot change accounted spend. Ninety-three audit
  tests pass offline.
- Whether the failed question calls exhausted their output allowance is still an
  inference, not a proven provider diagnosis. Audit call telemetry now retains
  provider status, incomplete reason, and whether output text or a refusal was
  returned, so the remaining structured-output stages can be attributed next
  time without keeping any provider-authored content.

## What is not known

- Whether Indonesian small and medium business owners will pay for one audit at
  all.
- What single price they will pay. The former Rp149,000 clinic price is not an
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

## Do now

1. Build one credible Indonesian sample audit by hand, from real observations,
   without depending on the automated workflow. This is the blocking asset.
2. Pick one vertical and one city, and fix the question set and competitor set
   to that scope.
3. While collecting those observations, re-ask two or three questions to measure
   run-to-run variation, and use the result to set the score band width.
4. Write the sample in Indonesian, counts-led, with the limitation stated beside
   each finding and no ranking, revenue, or causal claim.
5. Choose one founder-approved price for one audit before making any offer. No
   tiers, bundles, credits, or volume plans.
6. Run the demonstrate-before-selling outreach on about thirty businesses in
   that vertical and city: run a few unbranded questions first, then approach
   the ones that do not appear with the actual observed answer.
7. Record the real responses: payment, rejection, price objection, what the
   owner said they would do next, and whether they asked for a re-check.
8. Rewrite the landing page copy in Indonesian for the business owner, since it
   still describes the agency-facing offer.
9. Resume the automated private run only with founder approval, and only when it
   does not delay the sample. The ten observations remain the next paid stage
   after the one extraction call, and the three-report-call ceiling still holds.

## Not now

- a white-label or agency reseller layer, including partner pricing, resale
  margins, and outreach to agencies or freelancers;
- an agency dashboard, client management, or team accounts;
- custom domains or advanced brand controls;
- bulk imports, API access, or integrations;
- automated recurring monitoring or subscriptions;
- complex credits, packages, or volume tiers;
- broad multi-vertical support before one vertical and one city work;
- cold paid-ad scaling before the sample and offer receive direct buyer review;
- an exact-integer visibility score, or any peer benchmark, before enough
  audits in one category support one honestly; or
- fabricated demand, business outcomes, results, or testimonials.
- public exposure of the workflow before rate limits, cost controls, privacy
  terms, and a correction or remedy path exist.

## Done for this cycle

This cycle ends when one hand-made Indonesian sample audit and one clear
per-audit price have been shown to real Indonesian business owners through
demonstrate-before-selling outreach, and the actual responses are recorded. A
compliment, click, or request for a free report is not payment evidence.

Material changes to customer, offer, promise, or scope belong in
[`DECISION_LOG.md`](./DECISION_LOG.md). Historical dental-clinic and
agency-facing plans remain evidence and decision history, not the active
customer definition.
