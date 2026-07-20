# Nuave go-to-market operations

> Status: **Live commercial evidence workspace**
> Governing instruction:
> [`docs/v2/CMO_OPERATING_SYSTEM.md`](../docs/v2/CMO_OPERATING_SYSTEM.md)
> Updated: 2026-07-19

This directory stores operational go-to-market evidence and reviews. It does
not replace the canonical product strategy, funnel contract, validation gates,
decision log, or artifact tracker under [`docs/v2`](../docs/v2/README.md).

## Current baseline

- Nuave v2 has zero customers, as confirmed by the founder on 2026-07-19.
- No v2 customer outcome, testimonial, conversion rate, retention signal,
  referral behavior, or validated acquisition channel exists yet.
- EXP-001 has a locked identity sample but no provider observations.
- Current artifact phase is P1; use
  [`docs/v2/ARTIFACT_STATUS.md`](../docs/v2/ARTIFACT_STATUS.md) for the exact next
  task.

## Files

| File | Purpose | Update trigger |
|---|---|---|
| [`SCORECARD.md`](./SCORECARD.md) | Current commercial and validation baseline | A metric, denominator, period, or gate state changes |
| [`EVIDENCE_REGISTER.md`](./EVIDENCE_REGISTER.md) | Index of material GTM evidence and its limitations | New founder, market, prospect, customer, funnel, financial, or experiment evidence |
| [`templates/WEEKLY_CMO_REVIEW.md`](./templates/WEEKLY_CMO_REVIEW.md) | Repeatable decision review | A weekly review is requested or meaningful new activity exists |
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
8. Update canonical decisions in `docs/v2`, not in this operational workspace.

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
