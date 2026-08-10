# Nuave

Nuave is an AI visibility audit for small and medium Indonesian businesses,
used by the owner or person accountable for marketing. It shows how that
business appears across defined AI-assisted searches, then delivers the
findings as a short report the reader can understand, share, and act on.

The audited business is the customer's own business, not a client's. Nuave is
one automated path from intake form to downloadable report, not a monitoring
dashboard or subscription platform.

The current objective in [`docs/NOW.md`](./docs/NOW.md) is to make that path run
end to end without human rescue. Payment, durable report access beyond the
private-link requirement, and design polish come later in the current build
order.

## Start here

| Need | Read |
|---|---|
| Which documents govern a task | [`docs/INDEX.md`](./docs/INDEX.md) |
| Why Nuave exists, who it serves, what it believes | [`docs/VISION.md`](./docs/VISION.md) |
| Current stage and next action | [`docs/NOW.md`](./docs/NOW.md) |
| Customer, offer, touchpoints, and scope | [`docs/PRODUCT.md`](./docs/PRODUCT.md) |
| How to collect evidence and make the report | [`docs/AUDIT.md`](./docs/AUDIT.md) |
| How documents, specs, workers, and verification operate | [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) |
| Specification lifecycle and active packages | [`specs/README.md`](./specs/README.md) |
| How to generate a prompt pack for one business | [`docs/PROMPT_GENERATION_CONTEXT.md`](./docs/PROMPT_GENERATION_CONTEXT.md) |
| Dated product decisions | [`docs/DECISION_LOG.md`](./docs/DECISION_LOG.md) |

Earlier vertical-specific material and experiments are retained as
non-authoritative history under [`archive/`](./archive/), including the former
dental prompt context in
[`archive/prompt-contexts/`](./archive/prompt-contexts/) and `EXP-001` in
[`archive/experiments/`](./archive/experiments/). They are not part of the
current direction and should not be loaded for current work.

## Authority chain

[`docs/INDEX.md`](./docs/INDEX.md) defines the full authority chain. In short:
the newest founder-approved decision, then the vision, product definition,
relevant domain guide, approved specification, and implementation. `NOW.md`
routes agents to the current objective; it does not override product truth.

This `README.md` is the repository-wide routing page. [`AGENTS.md`](./AGENTS.md)
contains contributor instructions, and [`CLAUDE.md`](./CLAUDE.md) is only a
compatibility pointer to that same route.

Load only the document needed for the current task. The locked, unrun `EXP-001`
package is retained non-authoritative history under
[`archive/experiments/`](./archive/experiments/), not an active task or evidence
that its prepared experiment passed.

## Current product flow

```text
run a few unbranded questions on a prospect before any contact
  -> lead with the observed finding
  -> collect a short intake brief
  -> confirm facts and approve the ten-question pack in Indonesian
  -> pay for one audit
  -> run ten independent OpenAI API observations with web search
  -> generate the final-format report and evidence export
  -> named recipient opens the report at a private link
  -> recommend a re-check six to eight weeks later
```

The current pipeline build covers the path from intake through an unguessable
private report link. Checkout and the later commercial journey remain outside
that bounded outcome.

The `src/` landing page keeps the previous Nuave website as its visual baseline,
but its English and Indonesian copy still describes the agency-facing raw-MVP
offer. That copy contradicts the customer defined in
[`docs/VISION.md`](./docs/VISION.md) and is rewritten in Indonesian for the
target customer during the later product-wide polish pass; treat it as a known
gap, not as aligned. Its report preview is explicitly illustrative and
contains no client result or performance claim.

## Development

The implemented application includes the existing bilingual Next.js landing
page and a local `/audit` workflow. The workflow has no database, payments,
customer accounts, public rate limiting, or hosted report access. Those are
outside the current pipeline outcome, except hosted access at an unguessable
link, which is required so a run can be closed and reopened.

Use Node.js 22 and npm. From a clean checkout:

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env.local`, add `OPENAI_API_KEY`, and open
<http://localhost:3000/audit>. The optional `OPENAI_AUDIT_MODEL` defaults to
`gpt-5.6-luna`; every completed observation records the exact returned model. Set
`OPENAI_AUDIT_REASONING_EFFORT` to override reasoning effort for every audit
stage with one supported value: `none`, `low`, `medium`, `high`, `xhigh`, or
`max`. For a resumed private run, set `OPENAI_AUDIT_CARRYOVER_COST_USD` to the
already-accounted cost before starting the server. The server treats that value
as a minimum, shows it in the UI, and subtracts it from the USD 5 run ceiling.

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
