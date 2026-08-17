# Nuave product

> Status: **Current product direction**
> Updated: 2026-08-12
>
> This document describes the current customer, offer, promise, journey, and
> non-goals. It derives from [`VISION.md`](./VISION.md), which states why Nuave
> exists and what it believes. Where the two disagree, the vision governs.

## Product in one sentence

Nuave is an AI visibility audit for small and medium Indonesian businesses. It
shows the person responsible for marketing how the business appears in defined
AI-assisted searches, what to improve, and — on a later re-check — what
changed.

## Customer

The customer is the owner or marketing decision-maker of a small or medium
Indonesian business that depends on being chosen locally. The audited business
is the customer's own business.

The initial focus is one category and location where customers research and
compare options before choosing, and where accurate representation could
materially affect consideration.

Their practical question is:

> When someone asks AI about my kind of business in my area, do I come up, and
> if not, who does?

They are not analysts. They will not log into a dashboard weekly and they do
not want a monitoring tool. They want that question answered, and they want to
know what to do about the answer.

This direction is a working launch hypothesis. Nuave has not proven that
Indonesian business decision-makers will pay, act on the report, or return for
a re-check.

Agencies, freelancers, and marketing consultants are a deliberate later layer.
A white-label offer for people who resell marketing services is a credible
second business, but it is deferred until direct-business demand is proven or
disproven. If one approaches us, we serve them; we do not market to them.

## Promise

> See what AI says about your business, and what to fix.

The report shows sampled observations at a recorded time, not a permanent
ranking. Nuave does not promise future inclusion, revenue, leads, or sales
outcomes, and does not forecast improvement.

## Current offer

One audit for one verified business, delivered as a report its marketing
decision-maker can read in ten minutes, in Indonesian.

A re-check of the same business after six to eight weeks, showing what changed,
is the recurring offer. The interval is a recommended cadence, not a
scientifically derived one.

The current price is **Rp99.000 total for one audit**, with no additional tax or
fee charged to the customer at checkout. An unpaid Order Preview keeps that
quoted total for 30 days; after expiry the customer refreshes the preview before
paying. There are no public tiers, subscriptions, bundles, credits, or volume
plans before real purchasing behaviour supports them. The price remains
provisional until strangers respond to it.

## How results are reported

The headline is the direct observed appearance count with its denominator, for
example **Bisnis Anda muncul di 4 dari 10 pertanyaan** and **4/10**. This is the
Nuave score for that audit. It is not a percentage forecast, permanent rank,
or claim about every AI answer.

Beneath the overall count, appearance in **Tanpa menyebut bisnis Anda** and
recognition in **Menyebut bisnis Anda** keep separate denominators. The report
also keeps recommendation, comparison, and public-information assessment
separate. This prevents recognition after the customer supplied the business
name from being presented as spontaneous discovery.

Each question is observed once and AI answers vary between runs. A re-check
therefore compares the direct counts only under the same approved question pack
and compatible method version, with ordinary run-to-run variation disclosed.
No peer benchmark is stated until enough businesses in one category support
one honestly.

## Customer journey

The journey below is the target. [`NOW.md`](./NOW.md) and the newest
founder-approved entry in [`DECISION_LOG.md`](./DECISION_LOG.md) own the current
build order. Step 1 describes how a customer arrives and sits outside the
product. Step 2 onward is the product journey.

### 1. Demonstrate before selling

Pick one vertical in one city. Pull a list of candidate businesses from public
listings. Run a small number of unbranded Indonesian questions against each
one, before any contact.

Approach only the businesses that did not appear, and lead with what was
actually observed: the question asked, the answer given, and the competitor
named instead. The first message is a finding about their business, not a
pitch.

Never contact a business using a finding that was not actually observed.

### 2. Free identity and order preview

Collect one official website, Google Maps listing, or public Instagram business
profile plus a delivery email. Show a best-effort identity preview from that
public source and the one-audit order scope without running personalized
preparation or audit questions. If a confident business name cannot be found,
ask for the name and location needed to present the order; never guess between
branches.

The preview is not an audit result. It shows no appearance count, competitor,
finding, recommendation, or score.

### 3. Offer and payment

State one founder-approved price, what one audit includes, the snapshot
limitation, and the applicable Terms and Privacy notice. A hosted payment link
is enough; no account is required to buy. Verified payment unlocks personalized
business-fact and question preparation, but does not start or consume the
audit.

The order total is Rp99.000 with no additional checkout tax or fee. Use
Midtrans hosted checkout with QRIS, bank transfer, GoPay, and DANA. The
implementation specification still has to verify the merchant configuration,
webhooks, reconciliation, and remedies before accepting a real payment.

### 4. Business confirmation

After verified payment, prepare a draft from the submitted source and any
additional official sources needed to resolve one exact business: name and
known variants, location or service area, public listing, official website, or
authoritative social profile. If identity remains ambiguous, stop or ask the
customer to correct it. Never guess which branch or entity an AI answer refers
to.

Tell the customer to verify the exact business and branch before starting the
audit. A correction to the same intended business before start creates a new
fact version and requires the question pack to be regenerated and reapproved.
After start, the run is locked. For a genuine wrong-business mistake, founder
support may grant one replacement audit chance while preserving the original
run; a replacement order is the last resort.

Collect only the additional facts that change the report:

- priority services or offers;
- intended customer;
- important differentiators;
- known competitors, optional; and
- public facts that AI may get wrong, optional.

Mark buyer-supplied facts as such until verified. Do not collect customer
records, payment credentials, or other sensitive information the audit does not
need.

### 5. Question review

Suggest ten natural Indonesian questions from the confirmed facts. The default
pack contains five that do not name the business and five that do, but the
customer may replace any question and change that composition. Explain the
measurement consequence and block only narrow privacy, safety, business-scope,
and technical violations. Lock and persist the exact final pack. Do not start
the audit from unconfirmed facts or unapproved questions.

### 6. Audit

Run each approved Indonesian question independently with web search. Retain the
observed answers and sources as evidence, and do not silently change the locked
facts or question pack during execution.

### 7. Delivery

Deliver a short, downloadable, Indonesian report through private access the
named recipient can return to, containing:

- results only after 10/10 observations are evaluable;
- the overall appearance count out of ten and its direct score;
- separate name/no-name, recommendation, comparison, and public-information
  measures with their own eligible denominators;
- what was tested;
- where the business appeared and did not appear;
- relevant competitor observations;
- inaccurate, inconsistent, or missing public information;
- one to five material findings, with one or two strong findings sufficient;
- one to five evidence-backed actions; and
- sources, limitations, and the recommended re-check point.

The report is produced by the pipeline, not assembled by hand. A run that needs
a person to rescue it mid-way is a defect, not a delivery style.

If technical recovery cannot reach 10/10, delivery is delayed while only the
failed work is retried or founder support intervenes. No partial report is
delivered. If the complete, validated web report is ready but PDF generation
fails, deliver the web report and retry or troubleshoot the PDF artifact from
the same immutable report version. Never rerun observations to repair a PDF.

The report must also work as a shareable decision artifact: the primary reader
can use it to explain the evidence and recommended actions to the person who
approves or carries out the work.

### 8. Re-check

After six to eight weeks, offer to re-run the same questions and show what
changed. This requires the approved question pack to be persisted and replayed
verbatim, and the count to be compared only under a compatible method version.

### 9. Feedback

Ask the primary reader:

1. Was anything in this report new to you?
2. What was useful, confusing, missing, or unconvincing?
3. Which action will you actually do, and by when?

Record payment, objections, requested concessions, whether the customer acted,
and re-check interest. Do not treat stated intent as completed action.

## What happens behind the scenes

The workflow uses public web sources, a customer-confirmed brief, AI
observations with web search, automated evidence checks, and a report generated
from the retained observations.

The intake-to-report path is the product surface and is built before anything is
sold. Everything around it — dashboards, client management, integrations,
multi-vertical support — is built only to remove a problem observed in a real
delivery.

Two steps inside the run stay under human review and are not automated away:
confirming the business facts, and approving the ten questions.

## Non-goals

- permanent or universal AI rankings;
- guarantees or forecasts of inclusion, leads, revenue, or sales;
- monitoring subscriptions, general-purpose dashboards, or live-updating
  numbers;
- a normalized, banded, percentage, ranking, or peer-benchmark score beyond the
  direct observed count out of ten;
- clinical-quality assessment or medical recommendations;
- a full traditional SEO audit or automatic optimisation tool;
- client-management systems, team accounts, or a monitoring or analytics
  dashboard. A later bounded report-access mechanism remains open and may use
  only the minimum account-like behavior needed for private report access;
- an agency, reseller, or white-label offer at this stage;
- broad multi-vertical or multi-city support before one works; and
- replacing the customer's implementation work.

The re-check is not monitoring. It is a second measurement the customer chooses
to buy, at a cadence that matches how fast the underlying reality moves.

## Current success signals

The raw MVP is promising when:

- a target decision-maker reads the sample and understands the problem without
  being taught the category;
- a target decision-maker pays for one audit with no ranking or revenue
  guarantee offered;
- the report contains a specific finding the reader did not already know and
  could not have got by casually asking a chatbot;
- the report is shared with someone responsible for approving or completing an
  action;
- the customer completes at least one recommended action;
- the customer buys a re-check, or refers another business; and
- delivery effort per audit falls below what the price supports.

These are questions to test, not claims that Nuave has proven them.

## Open terms before a paid offer

Before accepting a paid audit, state the Rp99.000 total and 30-day quote
validity, a realistic delivery promise, the exact report scope, privacy and
retention treatment, and the approved correction and remedy path. Legal or
regulatory requirements remain subject to qualified review; do not present an
internal checklist as legal advice or a completed compliance review.

The remaining commercial decisions are the report-access and recovery
mechanism, retention period, wrong-recipient recovery, support response
expectation, and the terminal remedy if delayed delivery and founder-assisted
recovery still cannot complete the purchased audit. Transactional email uses
Resend as **Tim Nuave <support@nuave.ai>**, and Midtrans provides QRIS, bank
transfer, GoPay, and DANA checkout.
