# Active experiment — EXP-R3 owner-direct audit purchase

> Status: ready to prepare
> Updated: 2026-08-08
> Time box: one working cycle
> Owner: founder or assigned operator

## Question

Will an Indonesian small or medium business owner pay for one AI visibility
audit of their own business, after being shown a real observed finding about
that business?

## Hypothesis

Showing an owner the actual AI answer that omits them and names a competitor
instead is sufficient to make the problem real and produce a paid decision,
without the owner needing to be taught the category first.

This is a working hypothesis, not proven demand.

## Scope

- One business vertical in one Indonesian city.
- Roughly thirty candidate businesses pulled from Google Maps for that vertical
  and city, with owner-reachable contact details recorded from public listings.
- A small number of unbranded Indonesian questions, written as a real local
  customer would type them, run against ChatGPT for every candidate business
  before any contact is made.
- A second run of two or three of those questions on at least one business,
  done only to measure how much the answers vary between identical runs.
- Outreach only to businesses that did not appear, leading with the observed
  finding and the screenshot of the answer that named someone else.
- One hand-made Indonesian sample report, produced without depending on the
  automated workflow.
- One founder-approved price for one audit.
- Questions, report, and every message in Indonesian.
- No dashboard, subscription, agency or white-label offer, paid-ad scale,
  second vertical, or second city.

Review the chosen vertical before running anything. Categories that touch
health, legal, or financial advice carry claim limits that this experiment is
not scoped to handle. Founder approval is required before the first message is
sent, and before any observed finding about a named business is shown to anyone
outside Nuave.

## Actions

1. Choose one vertical and one Indonesian city, and record why.
2. Build the candidate list of about thirty businesses from Google Maps,
   recording name, area, and public contact details.
3. Write the small set of unbranded Indonesian questions for that vertical and
   city, and human-review them for language a real customer would use.
4. Run every question against ChatGPT for the candidate set before any contact,
   retaining the answer text, the screenshot, and the observation date.
5. Re-ask two or three questions on at least one business in a separate run,
   and record how the named businesses differed between the two runs.
6. Record, per business, whether it appeared, which competitors were named
   instead, and in how many of the questions.
7. Produce one hand-made Indonesian sample report from a business in the set,
   separating observation, inference, recommendation, and limitation.
8. Set one founder-approved price for one audit, with no tiers or discounts.
9. Contact only the businesses that did not appear, in Indonesian, leading with
   the observed finding and the screenshot for that specific business.
10. Offer the paid audit at the single price, with no ranking, lead, or revenue
    guarantee attached.
11. Record, per conversation: whether the owner understood the problem without
    being taught the category, whether payment was made, the objections raised,
    and any concession requested.
12. For any owner who paid, deliver the audit and record whether the owner acted
    on at least one recommendation, and whether they asked about a re-check.

## Evidence and result labels

- `PASS_CANDIDATE`: at least one business owner pays for one audit of their own
  business after being shown the observed finding.
- `REVISE`: owners understand the finding but a repeated, specific objection
  blocks payment.
- `INCONCLUSIVE`: too few owners are reached or respond, or the offer, price, or
  question set changes during the test.
- `STOP`: owners consistently see the finding, understand it, and do not treat
  the absence as a problem worth paying to fix.

Compliments, clicks, sample views, free-report requests, and hypothetical
willingness to pay do not count as payment.

## Guardrails

- Preserve the exact tested scope, evidence, observation dates, and limitations.
- Separate observation, Nuave inference, recommendation, confidence, and
  limitation.
- Do not imply that one observed answer is a permanent ChatGPT ranking.
- Do not forecast future visibility, revenue, or leads.
- Do not state a peer benchmark until enough businesses in the category have
  been measured to state one honestly.
- Report the score as a band beside the observed counts, never as an exact
  integer.
- Do not contact a business using a finding that has not actually been observed
  and retained for that business.
- Do not collect patient or other sensitive customer data.
- Do not fabricate demand, testimonials, or results.

## Previous evidence

EXP-R1 produced a `PASS_CANDIDATE` internal dental-clinic report for Sozo Dental
Depok on 2026-07-20. It showed that the method can produce specific,
evidence-backed findings from a small observed sample. It did not test whether a
business owner will pay, Indonesian-language questions, pricing, or re-check
purchase.

- Report: [`runs/2026-07-20-sozo-dental-depok/REPORT.md`](./runs/2026-07-20-sozo-dental-depok/REPORT.md)
- Evidence: [`runs/2026-07-20-sozo-dental-depok/EVIDENCE.md`](./runs/2026-07-20-sozo-dental-depok/EVIDENCE.md)

EXP-R2, agency offer validation, was retired on 2026-08-08 without being run. It
tested whether an agency, freelancer, or consultant would pay for an audit of
their client's business. The vision's customer decision supersedes it: the
business owner is the direct customer, and the reseller layer is deferred until
owner demand is proven or disproven.

Do not add more tracking fields before running this experiment. Add only what a
real execution proves necessary.
