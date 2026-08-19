# Nuave

Nuave is an AI visibility audit for small and medium Indonesian businesses,
used by the owner or person accountable for marketing. It shows how that
business appears across defined AI-assisted searches, then delivers the
findings as a short report the reader can understand, share, and act on.

The audited business is the customer's own business, not a client's. Nuave is
one automated path from intake form to downloadable report, not a monitoring
dashboard or subscription platform.

The complete journey is reviewable end to end with deterministic fixtures and a
clearly simulated checkout, and `https://v2.nuave.ai` is live behind an access
code. The current objective in [`docs/NOW.md`](./docs/NOW.md) is to connect the
live engine, produce one real Indonesian report, and put it through the
report-quality gate. Real payment, durable delivery, and design polish remain
gated later in the build order.

## Start here

| Need | Read |
|---|---|
| Which documents govern a task | [`docs/INDEX.md`](./docs/INDEX.md) |
| Why Nuave exists, who it serves, what it believes | [`docs/VISION.md`](./docs/VISION.md) |
| Current stage and next action | [`docs/NOW.md`](./docs/NOW.md) |
| End-to-end v2 build sequence and gates | [`docs/END_TO_END_PLAN.md`](./docs/END_TO_END_PLAN.md) |
| Cross-module sequence, ownership, and handoffs | [`docs/JOURNEY_CONTRACT.md`](./docs/JOURNEY_CONTRACT.md) |
| Active specification | [`specs/003-live-report-quality-gate/SPEC.md`](./specs/003-live-report-quality-gate/SPEC.md) |
| Customer, offer, touchpoints, and scope | [`docs/PRODUCT.md`](./docs/PRODUCT.md) |
| How to collect evidence and make the report | [`docs/AUDIT.md`](./docs/AUDIT.md) |
| How documents, specs, workers, and verification operate | [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) |
| Specification lifecycle and active packages | [`specs/README.md`](./specs/README.md) |
| How to generate a prompt pack for one business | [`docs/PROMPT_GENERATION_CONTEXT.md`](./docs/PROMPT_GENERATION_CONTEXT.md) |
| Dated product decisions | [`docs/DECISION_LOG.md`](./docs/DECISION_LOG.md) |
| Indonesian writing contract for customer copy | [`docs/VOICE.md`](./docs/VOICE.md) |
| What each customer touchpoint must do | [`docs/journey/`](./docs/journey/) |
| Landing, Order Preview, and website page copy | [`docs/content/`](./docs/content/) |

Earlier vertical-specific material and experiments are retained as
non-authoritative history under [`archive/`](./archive/), including the former
dental prompt context in
[`archive/prompt-contexts/`](./archive/prompt-contexts/) and `EXP-001` in
[`archive/experiments/`](./archive/experiments/). They are not part of the
current direction and should not be loaded for current work.

[`Archive Candidates/`](./Archive%20Candidates/) is a staging area for material
that looks superseded or completed but has not yet been folded into `archive/`.
Its [`README.md`](./Archive%20Candidates/README.md) records where each item came
from and which decision it is waiting on. Nothing there is authoritative or
active either.

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
  -> collect one public business link
  -> show a free identity and Rp99.000 order preview valid for 30 days
  -> pay through Midtrans with QRIS, bank transfer, GoPay, or DANA
  -> prepare and confirm the business facts
  -> prepare and approve the ten-question pack in Indonesian
  -> run ten independent OpenAI API observations with web search
  -> generate the final-format web report and evidence export
  -> named recipient opens the report through private access
  -> provide Download PDF when its derived artifact is ready
  -> recommend a re-check six to eight weeks later
```

The current build starts with a fixture-backed version of this whole journey,
including an unmistakably simulated checkout and report destination. The live
report and its quality gate come next. Durable private delivery and real
checkout are added only after that report proves worth paying for.

The settled commercial direction does not make the current fixture a real
checkout: production payment still requires its approved implementation
specification, Midtrans verification, durable delivery, and remaining remedy
and access decisions. A validated web report may be delivered while PDF
generation is retried from the same report version.

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
customer accounts, public rate limiting, or hosted report access. The current
journey shell may simulate checkout and a private destination, but must not
claim either is real. Durable access and real payment follow the quality gate.

Use Node.js 22 and npm. From a clean checkout:

```bash
npm ci
npm run dev
```

When you change dependencies, regenerate the lockfile with
`npm install --package-lock-only`, never a plain `npm install`. A plain install
on macOS prunes the `wasm32` optional-platform packages (`@emnapi/*`,
`@napi-rs/wasm-runtime`) out of `package-lock.json`, which still leaves the
tree valid locally but makes `npm ci` fail the in-sync check on every machine,
including CI — a failure that has already been fixed and reintroduced twice.
Confirm with `npm ci --dry-run` before committing a lockfile change.

Copy `.env.example` to `.env.local`, add `OPENAI_API_KEY`, and open
<http://localhost:3000/audit>. `NUAVE_PROVIDER` selects a free provider
instead for local testing — `groq` (Groq + Tavily, web search on) or
`openrouter` (free models, no web search, so observations carry no sources).
Both are testing-only: the protected live path fails closed to OpenAI unless
`NUAVE_LIVE_PROVIDER_TESTING=1` is also set, and that flag is always ignored
when `NODE_ENV=production`. See `.env.example` for each provider's limits. The optional `OPENAI_AUDIT_MODEL` defaults to
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

To review the protected fixture-preview journey, set
`NUAVE_FIXTURE_PREVIEW_ENABLED=true` (in `.env.local` or the shell
environment) before starting the server, then open
<http://localhost:3000/audit/fixture>. The landing page then shows one
fictional-preview action instead of the default sample-audit action. When the
variable is unset or false, the fixture route renders a safe unavailable state
and the landing page keeps its normal behavior. The flag is read only on the
server and is not a query parameter or client toggle. The fixture journey
makes no `/api/audit/*` call and stores only its own versioned state
(`nuave.fixtureJourney.v4`) in the browser session, separate from the live
workflow keys.

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
