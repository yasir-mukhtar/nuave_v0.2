# Nuave go-to-market operations

> Status: **Live commercial evidence workspace**
> Updated: 2026-07-31

This directory stores operational go-to-market evidence and reviews. It does
not replace the repository authority chain in [`../README.md`](../README.md).
Use this file only for commercial evidence-recording detail.

## Current baseline

- Nuave v2 has zero customers, including zero agency customers.
- The working buyer is an agency, freelancer, or marketing consultant ordering
  one client-ready audit for one client business.
- The agency-facing pilot price and acquisition economics are not known.
- No v2 customer outcome, testimonial, conversion rate, retention signal,
  referral behavior, or validated acquisition channel exists yet.
- EXP-R1 is methodology evidence, not agency-demand evidence.
- The active commercial test is
  [`../experiments/ACTIVE.md`](../experiments/ACTIVE.md). Current status and next
  action live in [`../docs/NOW.md`](../docs/NOW.md).

## Files

| File | Purpose | Update trigger |
|---|---|---|
| [`EVIDENCE_REGISTER.md`](./EVIDENCE_REGISTER.md) | Index of material GTM evidence and its limitations | New founder, market, prospect, customer, funnel, financial, or experiment evidence |
| [`templates/PROSPECT_CONVERSATION.md`](./templates/PROSPECT_CONVERSATION.md) | Structured prospect/discovery record | A permitted prospect interaction occurs |

Create dated subdirectories or records only when real activity exists. Do not
generate empty campaign, customer, partner, or channel histories in advance.

## Recording rules

1. Distinguish founder input, product contract, hypothesis, prospect evidence,
   customer evidence, funnel data, financial data, and experiment results.
2. Use `OBSERVED_ZERO`, `OBSERVED`, `NOT_MEASURED`, `NOT_APPLICABLE`, or
   `BLOCKED`; do not turn an unknown value into zero.
3. Include a denominator and period for every rate.
4. Include actual cash treatment and concessions for willingness-to-pay claims.
5. Record negative and contradictory evidence.
6. Link to the underlying restricted record where needed; do not duplicate
   contact details, access tokens, patient data, sensitive free text, or secrets.
7. Do not publish private prospect or customer language without permission.
8. Record material product decisions in [`../docs/DECISION_LOG.md`](../docs/DECISION_LOG.md),
   not in this operational workspace.
9. Internal research, drafts, and evidence records may be prepared within the
   active task. Founder approval is required before outreach, publication,
   spend, discounts, contracts, or customer-facing experiments.

## Recommended record paths when evidence exists

```text
gtm/
  reviews/YYYY-MM-DD.md
  conversations/YYYY-MM-DD-prospect-id.md
  channel-records/YYYY-MM-DD-channel-experiment.md
  financials/YYYY-MM-period.md
```

Use non-identifying stable IDs in filenames. The paths are a routing convention,
not authorization to create placeholder records or collect unnecessary data.
