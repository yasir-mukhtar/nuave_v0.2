# Nuave

Nuave is a one-time AI visibility audit for single-location dental clinics. It
uses real web information and observed AI responses to show what a clinic can
learn and improve. The first version is a manually delivered concierge product,
not a subscription platform.

## Start here

| Need | Read |
|---|---|
| Current stage and next action | [`docs/NOW.md`](./docs/NOW.md) |
| Customer, offer, touchpoints, and scope | [`docs/PRODUCT.md`](./docs/PRODUCT.md) |
| How to collect evidence and make the report | [`docs/AUDIT.md`](./docs/AUDIT.md) |
| How to generate the ten audit questions | [`docs/PROMPT_GENERATION_CONTEXT.md`](./docs/PROMPT_GENERATION_CONTEXT.md) |
| Experiment to run now | [`experiments/ACTIVE.md`](./experiments/ACTIVE.md) |
| Current go-to-market action | [`gtm/NOW.md`](./gtm/NOW.md) |
| Dated product decisions | [`docs/v2/DECISION_LOG.md`](./docs/v2/DECISION_LOG.md) |

Load only the document needed for the current task. The larger `docs/v2/`,
`artifacts/`, and `experiments/EXP-001/` materials preserve earlier detailed
planning, but they are not required reading for raw-MVP work.

## Current product flow

```text
outreach or simple landing page
  -> confirm one clinic
  -> payment link
  -> short intake
  -> manual audit
  -> reviewed report
  -> customer feedback
```

The `src/` landing page preserves the previous Nuave website as the visual and
interaction baseline. Its copy still describes the earlier free-audit platform
and does not yet reflect the current one-time raw-MVP offer.
