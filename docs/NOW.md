# Nuave now

> Updated: 2026-08-01
> Stage: pre-customer raw MVP

## Current objective

Create one credible agency-ready sample audit, then test whether small agencies,
SEO freelancers, Google Business Profile consultants, or independent marketers
will pay for one client-ready AI Visibility Audit for one of their clients.

The immediate implementation step is to run one founder-approved business
through the new bounded self-service workflow and inspect whether its verified
facts, prompt pack, API evidence, and final-format report remain truthful.
For this immediate task, [`AUDIT.md`](./AUDIT.md) governs execution and review;
the broader agency-offer validation remains in
[`experiments/ACTIVE.md`](../experiments/ACTIVE.md).

## What is known

- Nuave is a manually delivered, one-time audit, not subscription software.
- The buyer is now an agency, freelancer, or marketing consultant; the audited
  business is that buyer's client.
- The working promise is to help the buyer sell, deliver, or strengthen a client
  service with a credible AI Visibility Audit.
- The minimum delivery is a reviewed, downloadable client-facing report with a
  concise summary, neutral presentation, and optional agency name and logo.
- One agency can order one audit for one client without an account or dashboard.
- Nuave has zero paying v2 customers, including zero agency customers.
- Pricing for the agency-facing offer is open. The former Rp149,000 clinic-owner
  price must not be carried forward without validation.
- EXP-R1 produced a `PASS_CANDIDATE` dental-clinic report from real evidence:
  [`REPORT.md`](../experiments/runs/2026-07-20-sozo-dental-depok/REPORT.md).
  It is methodology evidence, not agency-demand evidence.
- The universal brand prompt context and `generate-ai-visibility-prompts` skill
  now support varied client categories through one verified brand scope, five
  unbranded questions, and five branded questions.
- The universal matrix is a working method, not validated cross-industry proof.
  Each client category still needs claims and report review.
- The former dental prompt context and skill are preserved under explicit
  dental-clinic names for later dental experiments.
- ChatGPT remains the named target product for prompt generation. Any later
  execution must record the exact surface honestly.
- The local landing page now describes the agency-facing raw-MVP offer in
  English and Indonesian. Its report preview is illustrative, the pilot price
  remains unpublished, and no client result or agency-demand claim is shown.
- A local `/audit` workflow now covers official-website extraction, human fact
  confirmation, ten-question prompt review, independent OpenAI Responses API
  execution with web search, final-format report generation, A4 print/PDF, and
  complete JSON evidence export.
- The unlisted workflow now uses a route-scoped HeroUI five-stage interface,
  locks verified inputs after execution starts, streams real per-prompt status,
  preserves interrupted observations in the browser session, and expands all
  ten detailed findings in print from the same report data shown on screen.
- The workflow stores state only in the browser session. It has no account,
  database, payment, public rate limit, or hosted report access.
- Live workflow behavior is not yet observed because `OPENAI_API_KEY` is not
  configured. A successful build and mocked contract tests are engineering
  evidence only, not audit-quality evidence.

## What is not known

- Whether agencies or freelancers will pay for the audit.
- Whether the report helps them sell, deliver, differentiate, or retain work.
- Whether a neutral template plus agency name and logo is sufficient.
- Which client verticals should be supported after the first test.
- What per-audit price leaves the buyer a useful resale margin.
- Whether targeted paid advertising can acquire agency buyers economically.
- Whether buyers will purchase repeatedly for multiple clients.

## Do now

1. Configure an OpenAI API key outside the repository and choose one exact,
   founder-approved public business for a private smoke test.
2. Complete the `/audit` workflow, verify every extracted fact and question,
   then inspect all ten retained answers, sources, classifications, findings,
   and actions before treating the output as sample evidence.
3. Correct any evidence or report-contract failure without publishing the
   tested business's findings without permission.
4. Turn the validated result into one concise agency-ready sample without
   inventing results or publishing client-specific findings without permission.
5. Add only the minimum agency delivery layer: neutral presentation, optional
   agency name and logo, and a short sales or executive summary.
6. State the tested scope, evidence, limitations, and commercial-use boundary
   clearly in the sample and pilot offer.
7. Choose one founder-approved pilot price before making a paid offer; do not
   create tiers, subscriptions, or volume plans.
8. Show the sample to three to five relevant agencies or freelancers, make a
   concrete per-audit offer, and record payment, rejection, intended use, and
   objections.

## Not now

- agency dashboard, client management, or team accounts;
- custom domains or advanced brand controls;
- bulk imports, API access, or integrations;
- automated recurring monitoring or subscriptions;
- complex credits, packages, or volume tiers;
- broad multi-vertical support before one client workflow works;
- cold paid-ad scaling before the sample and offer receive direct buyer review;
- automated scoring or a composite visibility score; or
- fabricated agency demand, resale results, client outcomes, or testimonials.
- public exposure of the workflow before rate limits, cost controls, privacy
  terms, and a correction or remedy path exist.

## Done for this cycle

This cycle ends when one agency-ready sample and one clear per-audit offer have
been reviewed with three to five relevant buyers and the actual responses are
recorded. A compliment, click, or request for a free report is not payment
evidence.

Material changes to customer, offer, promise, or scope belong in
[`DECISION_LOG.md`](./DECISION_LOG.md). Historical dental-clinic plans and
experiments remain evidence and decision history, not the active customer
definition.
