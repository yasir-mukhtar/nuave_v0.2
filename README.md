# Nuave

Nuave is a manually delivered, one-time AI visibility audit for agencies, SEO
freelancers, Google Business Profile consultants, and independent marketers. It
helps them show how one client business appears across tested AI
recommendations, then deliver the findings as a client-ready report.

The current experiment is one bounded self-service audit workflow, not an
agency dashboard or subscription platform.

## Start here

| Need | Read |
|---|---|
| Current stage and next action | [`docs/NOW.md`](./docs/NOW.md) |
| Customer, offer, touchpoints, and scope | [`docs/PRODUCT.md`](./docs/PRODUCT.md) |
| How to collect evidence and make the report | [`docs/AUDIT.md`](./docs/AUDIT.md) |
| How to generate a universal client-brand prompt pack | [`docs/PROMPT_GENERATION_CONTEXT.md`](./docs/PROMPT_GENERATION_CONTEXT.md) |
| Dental-clinic prompt method for later experiments | [`docs/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md`](./docs/DENTAL_CLINIC_PROMPT_GENERATION_CONTEXT.md) |
| Broader agency-offer validation experiment | [`experiments/ACTIVE.md`](./experiments/ACTIVE.md) |
| Current go-to-market action | [`gtm/NOW.md`](./gtm/NOW.md) |
| Dated product decisions | [`docs/DECISION_LOG.md`](./docs/DECISION_LOG.md) |

## Authority chain

When repository documents conflict, trust them in this order:

1. the newest founder-approved entry in
   [`docs/DECISION_LOG.md`](./docs/DECISION_LOG.md);
2. [`docs/NOW.md`](./docs/NOW.md) for the current stage, facts, objective, and
   next action;
3. [`docs/PRODUCT.md`](./docs/PRODUCT.md) for the current customer, offer,
   promise, journey, and non-goals; and
4. one relevant audit, prompt, experiment, or GTM document for task detail.

This `README.md` is the repository-wide routing page. [`AGENTS.md`](./AGENTS.md)
contains contributor instructions, and [`CLAUDE.md`](./CLAUDE.md) is only a
compatibility pointer to that same route.

Load only the document needed for the current task. The locked, unrun
`experiments/EXP-001/` package is a deliberate dental-method reference, not an
active task or evidence that its prepared experiment passed.

## Current product flow

```text
targeted outreach or simple landing page
  -> show a truthful sample audit
  -> confirm one agency and one client business
  -> agree one per-audit price and payment
  -> collect a short client and branding brief
  -> confirm facts and approve the ten-question pack
  -> run ten independent OpenAI API observations with web search
  -> generate the final-format report and evidence export
  -> deliver the client-ready report
  -> collect agency feedback and purchase evidence
```

The `src/` landing page keeps the previous Nuave website as its visual baseline,
but its English and Indonesian copy now describes the agency-facing raw-MVP
offer. Its report preview is explicitly illustrative and contains no client
result or performance claim.

## Development

The implemented application includes the existing bilingual Next.js landing
page and a local `/audit` workflow. The workflow has no database, payments,
customer accounts, public rate limiting, or hosted report access.

Use Node.js 22 and npm. From a clean checkout:

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env.local`, add `OPENAI_API_KEY`, and open
<http://localhost:3000/audit>. The optional `OPENAI_AUDIT_MODEL` defaults to
`gpt-5.6`; every completed observation records the exact returned model. Set
`OPENAI_AUDIT_REASONING_EFFORT` to override reasoning effort for every audit
stage with one supported value: `none`, `low`, `medium`, `high`, `xhigh`, or
`max`.

Run the non-mutating engineering checks and production build with:

```bash
npm run check
npm run build
```

Code map:

| Area | Location |
|---|---|
| Page assembly and root layout | `src/app/` |
| Reusable page and interface components | `src/components/` |
| English and Indonesian messages | `src/messages/` |
| Locale selection and routing | `src/i18n/` |
| Global styles and design tokens | `src/app/globals.css`, `src/styles/` |
| Static images, icons, and web manifest | `public/` |
| Current repository prompt skills | `skills/` |
