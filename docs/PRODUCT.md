# Nuave product

> Status: **Current product direction**
> Updated: 2026-07-31

## Product in one sentence

Nuave is a manually delivered, one-time AI visibility audit that helps agencies,
freelancers, and marketing consultants show how one client business appears in
tested AI recommendations and deliver the findings as a client-ready report.

## Customer

The first buyer is a small digital or SEO agency, SEO freelancer, Google
Business Profile consultant, independent marketing consultant, or website
agency that already provides marketing services.

The audited business is the buyer's client. The buyer may use the report to
support a sales conversation, deliver a paid service, or strengthen existing
SEO, website, or local-search work.

Their practical question is:

> Does ChatGPT recommend my client's business, what appears instead, and what
> can I credibly show the client to improve next?

This buyer direction is a working launch hypothesis. Nuave has not proven that
agencies will pay, resell the audit, win work, retain clients, or buy repeatedly.

## Promise

> Help your agency sell, deliver, and differentiate with client-ready AI
> Visibility Audits.

The report shows sampled observations, not a permanent ranking. Nuave does not
promise future inclusion, client revenue, leads, retention, or sales outcomes.

## Current offer

One audit for one client business, delivered as a client-ready report.

The current workflow experiment lets the user confirm public business facts,
approve the ten questions, and receive an automatically generated final-format
report. It has no separate Nuave report-review gate. This is not evidence that
the automatic report is reliable enough for public or paid delivery.

The agency-facing per-audit price is open and must be tested as one clear pilot
price. Do not add public tiers, subscriptions, bundles, credits, or volume plans
before real purchasing behavior supports them.

## Minimum customer journey

### 1. Discovery

A short outreach message, ad, or one-screen landing page leads with the agency's
commercial use and shows a truthful sample report. The primary CTA is:

> See Sample Audit

### 2. Buyer and client confirmation

Confirm the buyer's business and one exact client business to audit. Confirm the
client name, location, public listing, and official website or social profile so
Nuave does not analyze the wrong entity. Before using buyer or client branding,
confirm that the buyer is allowed to supply and use it for this report.

### 3. Offer and payment

State one per-audit pilot price, what the report includes, delivery timing,
commercial-use rights, and limitations. Confirm payment before starting the
personalized audit. A payment link is sufficient for the raw MVP.

### 4. Intake

Collect only what changes the report:

- client business and exact location;
- priority services or offers;
- intended customer;
- important differentiators;
- known competitors, optional;
- public facts that AI may get wrong, optional; and
- agency name and logo, optional.

Mark buyer-supplied facts as such until they are verified. Do not collect
patient data, private client-customer records, payment credentials, or other
sensitive information that the audit does not need.

### 5. Self-service audit experiment

The user confirms the client identity and business facts, reviews the selected
questions, and starts the audit. Nuave runs each question independently through
the OpenAI Responses API with web search, retains the observed answers and
sources in the browser session, and automatically generates the report.

### 6. Delivery

Deliver a short, downloadable, client-facing report with neutral presentation
or the buyer's basic branding. It should contain:

- a concise executive or sales summary;
- what was tested;
- where the client appeared or did not appear;
- relevant competitor observations;
- inaccurate, inconsistent, or missing public information;
- the top three recommended actions; and
- sources, confidence, limitations, and a suggested recheck point.

A web application is optional. A useful report is the product.

The report must state who it was prepared for and by, what the buyer may do
with it, and whether any client name, logo, quote, or finding may be published.
Basic branding and commercial use do not remove Nuave's method, evidence,
limitations, source attribution, or correction path.

### 7. Feedback

Ask the buyer:

1. Would you show or sell this report to a real client?
2. What was useful, confusing, missing, or unconvincing?
3. Would you pay for this audit for another client?

Record payment, intended client use, actual use when known, objections,
requested concessions, and repeat-purchase interest. Do not treat stated intent
as completed client use or revenue.

## What happens behind the scenes

The workflow prototype uses public web sources, a user-confirmed brief, OpenAI
API observations, automated evidence checks, and a report generated from those
retained observations. Agency name and logo remain optional and device-local.
Manual inspection remains useful for learning, but it is not a blocking report
gate in this experiment.

Build software only when it removes a problem observed in the working one-audit
flow. Do not build infrastructure for a hypothetical agency operation.

## Non-goals

- permanent or universal AI rankings;
- guarantees of inclusion, leads, revenue, sales, or client retention;
- clinical-quality assessment or medical recommendations;
- a full traditional SEO audit or automatic optimization tool;
- customer accounts, agency dashboards, or client-management systems;
- recurring monitoring or subscriptions;
- team accounts, custom domains, API access, or bulk workflows;
- broad multi-vertical support without a reviewed method; and
- replacing the buyer's strategy or implementation work.

## Current success signals

The raw MVP is promising when:

- a relevant agency or freelancer understands the sample without a long
  explanation;
- a buyer pays for one client audit without a ranking or revenue guarantee;
- the buyer identifies a real client conversation or delivery use;
- the report contains a specific useful finding beyond casual chatbot use;
- basic neutral or agency-branded delivery is sufficient; and
- at least one buyer requests or purchases another client audit without hidden
  delivery effort overwhelming the price.

These are questions to test, not claims that Nuave has already proven.

## Open terms before a paid offer

Before accepting a paid audit, state one founder-approved price, a realistic
delivery promise, the exact report scope, commercial-use and sharing terms,
privacy and retention treatment, and a correction or remedy path. Legal or
regulatory requirements remain subject to qualified review; do not present an
internal checklist as legal advice or a completed compliance review.
