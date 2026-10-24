# Nuave

Start with [`docs/NOW.md`](./docs/NOW.md) for current work. The September 19
[resume notes](./docs/RESUME_DEVELOPMENT.md) describe a preserved earlier
checkpoint, not the current development baseline.

Nuave is an AI visibility audit for small and medium Indonesian businesses,
used by the owner or person accountable for marketing. It shows how that
business appears across defined AI-assisted searches, then delivers the
findings as a short report the reader can understand, share, and act on.

The audited business is the customer's own business, not a client's. Nuave is
one automated path from intake form to downloadable report, not a monitoring
dashboard or subscription platform.

The live `https://v2.nuave.ai` deployment is public with no login and marked
noindex. Its audit path runs without payment; the separate fixture journey
includes a clearly simulated checkout. The founder's recorded interim-exposure
acceptance remains in force. Before outside users or public link sharing, the
safeguards listed in [`docs/NOW.md`](./docs/NOW.md#rules-still-in-force), including
the server-side spending cap and
[deferred dependency security updates](./docs/NOW.md#deferred-security-work--before-customer-testing-or-public-sharing),
are still required.

The real end-to-end path has worked since 2026-09-19. The prepared intake
(Spec 011) and redesigned report (Spec 012) shipped through PRs #78–#81, and
the founder accepted the report for now on 2026-09-26. Work now follows the
[paying-customer plan](./docs/PAYING_CUSTOMER_PLAN.md), approved on
2026-09-27: finish the intake journey, get ready to take money, then go live.
[`docs/NOW.md`](./docs/NOW.md) names the active milestone.

## Start here

| Need | Read |
|---|---|
| Which documents govern a task | [`docs/INDEX.md`](./docs/INDEX.md) |
| Why Nuave exists, who it serves, what it believes | [`docs/VISION.md`](./docs/VISION.md) |
| Current stage and next action | [`docs/NOW.md`](./docs/NOW.md) |
| Build sequence and gates to the first paying customer | [`docs/PAYING_CUSTOMER_PLAN.md`](./docs/PAYING_CUSTOMER_PLAN.md) |
| Detailed requirements the plan points to (reference; which plan governs what is in `docs/INDEX.md`) | [`docs/END_TO_END_PLAN.md`](./docs/END_TO_END_PLAN.md) |
| Cross-module sequence, ownership, and handoffs | [`docs/JOURNEY_CONTRACT.md`](./docs/JOURNEY_CONTRACT.md) |
| Current bounded implementation | Named in [`docs/NOW.md`](./docs/NOW.md). Latest verified: [`specs/011-smart-consultant-intake/SPEC.md`](./specs/011-smart-consultant-intake/SPEC.md) (prepared intake) and [`specs/012-evidence-first-report/SPEC.md`](./specs/012-evidence-first-report/SPEC.md) (report, with the founder-approved AC-18 exception) |
| Customer, offer, touchpoints, and scope | [`docs/PRODUCT.md`](./docs/PRODUCT.md) |
| How to collect evidence and make the report | [`docs/AUDIT.md`](./docs/AUDIT.md) |
| How documents, specs, workers, and verification operate | [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) |
| Specification lifecycle and active packages | [`specs/README.md`](./specs/README.md) |
| How to generate a prompt pack for one business | [`docs/PROMPT_GENERATION_CONTEXT.md`](./docs/PROMPT_GENERATION_CONTEXT.md) |
| Resume from the completed real audit/report milestone | [`NUAVE-LIVE-REPORT-2026-09-19` checkpoint](./docs/checkpoints/2026-09-19-live-direct-ten-report/CHECKPOINT.md) |
| Resume question generation without losing the accepted approach | [`NUAVE-PROMPTS-2026-09-17` checkpoint](./docs/checkpoints/2026-09-17-winning-prompt-glm/CHECKPOINT.md) |
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
  -> show a free identity check and the Rp249.000 order preview
  -> pay through Midtrans with QRIS, bank transfer, GoPay, or DANA
  -> prepare and confirm the business facts
  -> prepare and approve the ten-question pack in Indonesian
  -> run ten independent OpenAI Responses API observations with GPT-5.6 Luna and web search
  -> generate the final-format web report and evidence export
  -> named recipient opens the report through private access
  -> provide Download PDF when its derived artifact is ready
  -> recommend a re-check six to eight weeks later
```

Today the live path runs from the business link to the report without payment
or saving on the server. Saved reports and delivery (S3) and real payment (S4)
are Stage 2 of the [paying-customer plan](./docs/PAYING_CUSTOMER_PLAN.md).

The settled commercial direction does not make the current fixture a real
checkout: production payment still requires its approved implementation
specification, Midtrans verification, durable delivery, and remaining remedy
and access decisions. A validated web report may be delivered while PDF
generation is retried from the same report version.

The `src/` landing page is Indonesian and addressed to the business owner. It
carries the interim copy approved on 2026-08-20 (Spec 006 P1) and is no longer
agency-facing. The founder reworks it in milestone S6 of the plan. Its report
preview is explicitly illustrative and contains no client result or
performance claim.

## Development

The implemented application includes the Indonesian Next.js landing page and
the `/audit` workflow. The workflow has no database, payments, customer
accounts, or hosted report access. The deployed worker has per-IP rate limits,
but no server-side spending cap yet (S2 adds one). The journey may simulate
checkout and a private destination, but must not claim either is real.

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

Copy `.env.example` to `.env.local`, add `OPENAI_API_KEY` and
`CHEAPERINFERENCE_API_KEY`, set `NUAVE_NEW_AUDIT_ENABLED=true` and
`NUAVE_AUDIT_MODE=synthetic`, and open
<http://localhost:3000/audit>. The audit journey is publicly reachable when
the switch is on — there is no login; during the trial the founder monitors
provider billing and can set the switch off to stop every audit endpoint
before provider work. `NUAVE_AUDIT_MODE=live` needs the `SPEND_DB` D1 binding (daily
spend cap), which plain `next dev` does not provide, so local live mode refuses
paid work by design (it fails closed). The deployed worker also uses per-IP Cloudflare rate
limits (`wrangler.jsonc`) as a burst brake. The protected production
configuration is
`NUAVE_PROVIDER=openai`, `NUAVE_QUESTION_PROVIDER=openai`,
`OPENAI_BASE_URL=https://api.openai.com/v1`,
`OPENAI_AUDIT_MODEL=gpt-5.6-luna`, and
`OPENAI_AUDIT_REASONING_EFFORT=low`. Nuave uses the OpenAI SDK directly
against OpenAI's Responses API, which serves Luna with hosted web search.
`OPENAI_API_KEY` is the canonical production credential. (The earlier OpenCode
Go proxy was dropped after its subscription lapsed; Cheaper Inference serves
Luna but ignores the `web_search` tool, so it cannot ground observations.)

The protected method uses one bounded no-search call for Indonesian question
generation; official-domain-restricted web search for business extraction;
required web search for every audit observation; and no web search for report
synthesis. Questions, audit observations, and the final report use the
Indonesian contracts required by Spec 003, while exact evidence excerpts and
technical provenance remain faithful to the recorded run.

Direct OpenAI, Gemini, Groq + Tavily, and OpenRouter remain available for
explicit local pipeline testing. They are testing-only on the protected live
path: set the corresponding provider credential and
`NUAVE_LIVE_PROVIDER_TESTING=1`; that flag is always ignored when
`NODE_ENV=production`. OpenRouter's free path has no web search and therefore
cannot be used to judge real visibility or report quality. See `.env.example`
for the current provider variables and limits.

Every completed observation records the exact returned model. The protected
OpenAI production path is locked to `low` reasoning and fails closed if
`OPENAI_AUDIT_REASONING_EFFORT` is set to another value. The broader
`none`/`low`/`medium`/`high`/`xhigh`/`max` setting remains available only for
explicit local or test-provider work outside that protected production path.
For a resumed private run, set `OPENAI_AUDIT_CARRYOVER_COST_USD` to the
already-accounted cost before starting the server. The server treats that value
as a minimum, shows it in the UI, and subtracts it from the USD 5 run ceiling.

Run the non-mutating engineering checks, unit tests, and production build with:

```bash
npm run check
npm run test:unit
npm run build
```

### Local-first validation

Use the fast gate while iterating and the full offline gate before declaring a
branch ready to push:

```bash
# Repeat after bounded changes while iterating.
npm run validate:fast

# Run before pushing or reporting the implementation complete.
npm run validate:full
```

`validate:fast` runs `check` and the complete unit-test suite. `validate:full`
delegates to `verify`, which runs the same checks plus the Next.js build,
Cloudflare/OpenNext build, and all three Playwright configurations. The full
gate uses dummy provider settings and does not make live provider calls. It is
the local equivalent of the repository's offline integration gate; GitHub CI
remains the authoritative PR and `main` validation gate.

To review the fixture-preview journey, set
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
| Indonesian messages | `src/messages/` |
| Locale selection and routing | `src/i18n/` |
| Global styles and design tokens | `src/app/globals.css`, `src/styles/` |
| Static images, icons, and web manifest | `public/` |
| Current repository prompt skills | `skills/` |
