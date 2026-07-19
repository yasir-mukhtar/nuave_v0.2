# Nuave v2 technical architecture

> Status: **Target architecture for the concierge MVP**
> Authority: [`FOUNDATION.md`](./FOUNDATION.md), [`MVP_SPEC.md`](./MVP_SPEC.md)
> Updated: 2026-07-19

## 1. Architecture objective

Build the smallest reliable system that preserves payment correctness, audit
provenance, independently retryable provider work, operator review, secure
delivery, attribution, and comparable re-audits.

Do not reproduce the legacy SaaS hierarchy. V2 has orders and audits, not
organizations, workspaces, plans, subscriptions, or dashboards.

## 2. Settled stack

- Next.js App Router with TypeScript.
- Vercel for the web application and API endpoints.
- A new Supabase PostgreSQL project with Row Level Security and object storage.
- Midtrans Snap and verified server-side notifications for payment.
- Inngest for durable, step-based audit orchestration and retries.
- Resend for transactional email.
- OpenAI web search and Gemini Google Search grounding as v0 audit surfaces.
- A server-side HTML report shared by mobile web and print/PDF rendering.

Provider and framework versions must be pinned and recorded at implementation
time. Model names are configuration, not timeless strategy decisions.

## 3. Repository policy

Use a clean v2 repository. Reuse is selective rather than ideological:

- allow small, low-coupling utilities after review, tests, and provenance notes;
- prefer concepts over copied application shells;
- prohibit legacy auth, membership, plan, subscription, dashboard, monitoring,
  and organization code; and
- port design tokens or UI components only when they support the new funnel and
  report without carrying legacy dependencies.

## 4. Core records

### `businesses`

Canonical public identity of one clinic location: normalized name, listing
provider ID and URL, address, city, category, website, social URL, contact phone
when public, identity status, and evidence used to resolve it.

### `orders`

One purchase attempt and lifecycle: business ID, contact email, optional
WhatsApp, consent flags, amount, currency, Midtrans identifiers, payment state,
fulfillment state, intake, first/last attribution, hashed access token,
revocation state, retention deadline, and timestamps.

### `audit_specs`

Immutable versioned methodology: vertical, city, language, prompt definitions,
surface adapters, run design, identity rules, extraction schemas, report schema,
and comparison compatibility. Published specs are never edited in place.

### `audits`

One audit execution: order ID, business ID, spec version, status, audit type,
retry lineage, coverage summary, cost, latency, QA state, reviewer, delivery
classification, and timestamps.

### `audit_observations`

One provider/prompt/run result: surface, provider, model/version, prompt ID,
prompt text snapshot, run index, location/language context, raw response,
citations/search results, mention and recommendation extraction, entity matches,
latency, cost, status, error, and observation time.

### `findings`

Evidence-backed interpretation: finding type, observation references, statement,
confidence, inference, limitation, QA state, and report inclusion state.

### `recommendations`

Action linked to one or more findings: action, rationale, expected directional
impact, confidence, effort, owner, priority, completion check, caveat, customer
commitment, and completion evidence.

### `report_versions`

Immutable rendered-report snapshot: audit ID, schema version, report JSON,
web release time, PDF object path, QA approval, access state, and supersession.

### `journey_events`

Append-only lifecycle instrumentation keyed by anonymous session, order, audit,
or report: source, medium, campaign, content/creative, landing variant, lookup,
sample view, checkout, payment, delivery, open, usefulness, action, support,
referral, refund, and re-audit events.

Avoid creating separate tables until query, integrity, retention, or security
requirements justify them. JSON fields must still have versioned schemas.

## 5. Order state ownership

- Browser actions may create `identity_confirmed` and `checkout_created` states.
- Only the verified Midtrans notification handler may set `paid`.
- Only the durable workflow may advance collection and analysis states.
- Only an approved operator action may advance `qa_review` to `ready` during the
  founding cohort.
- Only successful release and notification work may set `delivered`.
- Customer interactions set `opened`, `action_selected`, feedback, and support
  events; they cannot modify evidence records.
- Refund state follows verified provider results plus an auditable operator or
  policy decision.

Every transition records actor, previous state, next state, reason, and time.

## 6. Durable audit workflow

Suggested Inngest steps:

1. `validate-paid-order`
2. `freeze-audit-spec-and-input`
3. `collect-public-business-sources`
4. `run-openai-core-observations`
5. `run-gemini-core-observations`
6. `run-exploratory-observations`
7. `resolve-business-and-competitor-entities`
8. `extract-observations`
9. `generate-findings`
10. `generate-recommendations`
11. `evaluate-coverage-and-contradictions`
12. `prepare-review-package`
13. wait for operator approval or clarification
14. `render-report-and-pdf`
15. `release-and-notify`
16. `schedule-followups`

Provider calls use deterministic idempotency keys derived from audit, spec,
surface, prompt, and run index. A retry upserts the same observation rather than
creating another run.

Permanent errors such as unresolved identity do not retry as transient errors.
Partial-provider handling follows [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md).

## 7. Provider adapter contract

Each adapter accepts a normalized observation request and returns:

- raw response and provider request ID;
- provider surface and model identifier;
- request location, language, and configuration;
- citations, search results, or grounding metadata when available;
- token, search, request, and total cost when available;
- start/end time and latency;
- provider warnings, safety blocks, and errors; and
- the unmodified prompt snapshot.

Adapters do not generate final Nuave findings. Extraction and analysis operate
on stored provider results so that they can be re-run without paying for the
original observation again.

## 8. Report access

- Generate at least 256 bits of random token material.
- Store only a cryptographic hash of the bearer token.
- Support token rotation and immediate revocation.
- Bind recovery to the verified order email using a short-lived signed link or
  one-time code.
- Rate-limit token validation and recovery attempts.
- Never put payment identifiers, database IDs, or email addresses in public URLs.
- Keep the PDF behind the same authorization check or a short-lived signed URL.
- Enforce the disclosed retention deadline and deletion policy.

No account system is required.

## 9. Security and data boundaries

- Service-role credentials, payment secrets, provider keys, and report tokens
  remain server-side.
- Payment notification signatures are verified before processing.
- Raw public business data is separated logically from private contact and
  intake data.
- Patient or treatment-recipient data is prohibited.
- Provider prompts contain only the minimum public business and audit context.
- Logs use stable record IDs and redact prompts or payloads when they may contain
  contact or secret data.
- Operator access is authenticated, least-privilege, and audited.
- RLS denies anonymous access to orders, audits, observations, reports, and
  journey events; public report access goes through a token-verifying server.

See [`COMPLIANCE_AND_DATA.md`](./COMPLIANCE_AND_DATA.md).

## 10. Attribution

Persist first-touch and last-touch values at draft-order creation:

- source, medium, campaign, term, content;
- partner/referral code;
- landing page and variant;
- creative or content slug;
- initial referrer; and
- anonymous session ID.

Do not rely only on ad-platform dashboards. Payment, fulfillment, usefulness,
manual minutes, action completion, refund, referral, and re-audit must be
joinable to the originating channel and cohort.

## 11. Observability

Track per order and audit:

- state and state age;
- provider success, retries, latency, and cost;
- prompt/run coverage;
- extraction and validation failures;
- operator review reason and minutes;
- report-render and delivery outcomes;
- notification attempts;
- access and recovery events;
- refund and dispute events; and
- end-to-end time from payment to delivery.

Alert on paid orders without a queued audit, stuck states, exhausted workflow
retries, delivery failures, unusual refund volume, and access-token abuse.

## 12. Environments and release

Use separate development, preview, and production projects or credentials. A
preview deployment must never read or write production orders or send production
notifications.

Schema changes use versioned migrations applied by CI or a documented release
step; SQL files cannot be reference-only. Provider and prompt configuration is
versioned with the audit spec.

Production release requires the end-to-end acceptance tests in
[`MVP_SPEC.md`](./MVP_SPEC.md) and the operational readiness gate in
[`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md).

## 13. Open implementation decisions

- **[OPEN]** Exact business-listing/Places provider and terms.
- **[OPEN]** Exact PDF renderer after a same-component print spike. PDF delivery itself is part of the MVP.
- **[OPEN]** Retention duration and deletion automation.
- **[OPEN]** Error monitoring vendor and notification channel.
- **[OPEN]** Whether raw provider responses remain in PostgreSQL or encrypted
  object storage after measured size and retention requirements are known.

These decisions must be resolved before the dependent production feature, not
generalized prematurely.
