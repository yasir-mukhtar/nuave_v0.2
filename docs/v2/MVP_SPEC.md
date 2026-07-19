# Nuave v2 concierge MVP specification

> Status: **Build specification for the first paid cohort**
> Authority: [`FOUNDATION.md`](./FOUNDATION.md)
> Updated: 2026-07-19

## 1. Objective

Deliver a truthful, secure, paid, end-to-end audit for one single-location
dental clinic without requiring an account. The MVP is successful when a
customer can move from exact clinic confirmation through payment, reviewed
report delivery, action selection, and feedback.

The seven-day target describes the first sellable concierge slice. It does not
require self-serve scale, zero manual work, four providers, or a generalized
platform.

## 2. Customer and eligibility

Supported at launch:

- one dental clinic location;
- the selected launch city;
- an active, resolvable public business listing;
- a website or authoritative public social profile;
- Bahasa Indonesia audit context; and
- a verified customer email, with optional WhatsApp consent.

Unsupported clinics receive a clear explanation before payment. Sparse-data,
duplicate-name, franchise, multi-location, and out-of-city cases are clarified
or rejected rather than forced through the standard audit.

## 3. Public journey

### 3.1 Landing page

The landing page must contain:

1. a dental-clinic-specific problem and promise;
2. exact clinic lookup as the primary CTA;
3. a real, dated, clearly non-personalized market observation;
4. a permissioned or representative sample report;
5. what is measured and what is not guaranteed;
6. concrete examples of deliverable actions;
7. one founding-cohort offer;
8. delivery and remedy expectations; and
9. methodology, privacy, and clinic-claims disclosures.

### 3.2 Clinic confirmation

Before checkout, collect or resolve:

- confirmed business name;
- exact location and city;
- business-listing URL or stable provider identifier;
- website or authoritative social URL;
- clinic category; and
- customer confirmation that the selected entity is correct.

The lookup may show a category-and-city market example but must not imply that
the clinic's paid personalized audit has already run.

### 3.3 Checkout

Show one public offer: `Full AI Visibility Audit — Rp149,000`.

Checkout requirements:

- collect email before redirecting to Midtrans;
- preserve first-touch and last-touch attribution;
- create an idempotent draft order;
- handle return, cancel, expiration, duplicate notification, and delayed
  notification states; and
- never start the audit from a client-side success redirect alone.

Only a verified Midtrans payment notification transitions the order to paid.

### 3.4 Post-payment brief

Collect a brief that can be completed in approximately two minutes:

- priority services;
- target customer;
- differentiators or USP;
- known competitors, optional;
- factual details AI often gets wrong, optional;
- WhatsApp delivery/reminder consent, optional; and
- permission to use anonymized findings, separate and optional.

If the brief is abandoned, send a recovery link. After the defined waiting
period, the audit may proceed using confirmed public data if the customer was
clearly told this would happen.

### 3.5 Progress and delivery

The customer receives:

- a durable order status page;
- a realistic delivery promise;
- an email when the report is ready;
- an optional WhatsApp notification when consented;
- a mobile-first secure web report; and
- a downloadable PDF rendered from the same report data and components.

**[EXPERIMENT]** The founding-cohort promise is delivery within 24 hours. Tighten
the promise only after measured p95 generation and review time supports it.

## 4. Audit deliverable

The report must include:

- confirmed clinic identity;
- audit scope, date, language, city, surfaces, prompt version, and run count;
- observed inclusion by platform and intent;
- clear separation of mention and recommendation;
- branded accuracy findings;
- competitor observations with resolved identities;
- public source and information gaps;
- failed or missing observations;
- prioritized actions with evidence, confidence, effort, owner, and completion
  check;
- three actions highlighted as the starting sequence; and
- methodology, limitations, and re-audit guidance.

The first ten reports do not show a composite score. See
[`MEASUREMENT_SPEC.md`](./MEASUREMENT_SPEC.md).

## 5. Operator workflow

Every founding-cohort report enters review before delivery. The operator can:

- inspect the confirmed business identity;
- inspect raw provider responses and sources;
- see failed and retried steps;
- approve, reject, or correct competitor resolution;
- approve, edit, or reject findings and recommendations;
- request customer clarification;
- mark the result full, partial, failed, or refunded;
- record the reason for every intervention; and
- preview the web and PDF report before release.

Manual work is measured per order. The operator must not make unsupported
report claims merely to avoid a partial result or refund.

## 6. Aftersales requirements

Without creating an account, the report page must support:

- usefulness and credibility feedback;
- selection of at least one intended action;
- optional completion evidence or URL;
- correction/dispute submission;
- report-link recovery and revocation; and
- a comparable re-audit CTA when eligible.

Lifecycle timing and message rules are governed by
[`FUNNEL_AND_LIFECYCLE.md`](./FUNNEL_AND_LIFECYCLE.md).

## 7. Internal states

The MVP must implement the canonical lifecycle:

```text
identity_confirmed -> checkout_created -> paid -> intake_pending
-> queued -> collecting -> analyzing -> qa_review
-> ready -> delivered -> opened -> action_selected
-> followup -> recheck_eligible
```

Supported terminal or side states include `clarification_required`, `partial`,
`failed`, `cancelled`, `payment_expired`, `refund_pending`, and `refunded`.
State-transition ownership is defined in
[`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md).

## 8. Acceptance criteria

The MVP is sellable only when all of the following pass:

- an eligible clinic can be selected without ambiguous identity;
- a real Midtrans test payment produces exactly one paid order;
- a duplicate webhook produces no duplicate audit or delivery;
- provider steps can retry without duplicating completed observations;
- raw evidence is traceable to every material finding;
- a failed provider results in disclosure, retry, partial handling, or refund;
- operator review blocks unapproved delivery;
- the secure report link is unguessable, revocable, and recoverable;
- the report is readable on mobile and printable as PDF;
- secrets and access tokens do not appear in client code or logs;
- delivery, report-open, feedback, and action-selection events are recorded;
- a full end-to-end test covers payment through report and follow-up; and
- the customer-facing copy contains no ranking, outcome, or causation guarantee.

## 9. Explicitly deferred

- public OpenAI-only tier;
- composite visibility score;
- Perplexity and AI Mode/Overview surfaces;
- cached self-serve market Preview at broad scale;
- automated report delivery without a QA gate;
- accounts, dashboard, saved report library, and subscriptions;
- recurring monitoring;
- second vertical or multiple simultaneous cities;
- implementation marketplace or managed service; and
- generalized multi-tenant or enterprise architecture.

## 10. Seven-day implementation sequence

The feasibility spike precedes the seven build days.

1. Establish the repository, environments, schema, tokens, and document routing.
2. Build the landing page, clinic lookup, attribution, and draft-order creation.
3. Implement Midtrans checkout, verified notifications, and post-payment brief.
4. Implement the immutable audit specification and the first provider adapter.
5. Implement the second adapter, durable workflow, evidence storage, and errors.
6. Build operator review, secure web report, PDF rendering, and delivery.
7. Test failures and recovery, run a real end-to-end order, and admit the first
   paid customer only after the acceptance checklist passes.

If time is lost, defer automation and visual polish before weakening evidence,
payment correctness, access security, or failure handling.
