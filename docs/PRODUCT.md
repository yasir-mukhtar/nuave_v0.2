# Nuave product

> Status: **Current product direction**
> Updated: 2026-08-09
>
> This document describes the current customer, offer, promise, journey, and
> non-goals. It derives from [`VISION.md`](./VISION.md), which states why Nuave
> exists and what it believes. Where the two disagree, the vision governs.

## Product in one sentence

Nuave is an AI visibility audit for small and medium Indonesian businesses. It
shows the owner what AI assistants actually say when a customer asks about
their kind of business in their area, what to fix, and — on a later re-check —
what changed.

## Customer

The customer is the owner or marketing decision-maker of a small or medium
Indonesian business that depends on being chosen locally. The audited business
is the customer's own business.

Their practical question is:

> When someone asks AI about my kind of business in my area, do I come up, and
> if not, who does?

They are not analysts. They will not log into a dashboard weekly and they do
not want a monitoring tool. They want that question answered, and they want to
know what to do about the answer.

This direction is a working launch hypothesis. Nuave has not proven that
Indonesian business owners will pay, act on the report, or return for a
re-check.

Agencies, freelancers, and marketing consultants are a deliberate later layer.
A white-label offer for people who resell marketing services is a credible
second business, but it is deferred until direct owner demand is proven or
disproven. If one approaches us, we serve them; we do not market to them.

## Promise

> See what AI says about your business, and what to fix.

The report shows sampled observations at a recorded time, not a permanent
ranking. Nuave does not promise future inclusion, revenue, leads, or sales
outcomes, and does not forecast improvement.

## Current offer

One audit for one verified business, delivered as a report the owner can read
in ten minutes, in Indonesian.

A re-check of the same business after six to eight weeks, showing what changed,
is the recurring offer. The interval is a recommended cadence, not a
scientifically derived one.

One founder-approved price per audit. No public tiers, subscriptions, bundles,
credits, or volume plans before real purchasing behaviour supports them. The
Rp149,000 price from the v1 pilot must not be carried forward as an anchor. The
price is chosen when checkout is built, because a checkout needs a number, and
stays provisional until strangers respond to it.

## How results are reported

The headline is always the observed count with its denominator — *muncul di 3
dari 10 pertanyaan*. Underneath it, the report gives an AI Visibility Score as
a **band**, not an exact integer, so the owner has something to benchmark
against and improve.

The band is deliberate. Each question is observed once and AI answers vary
between runs, so a few points of movement means nothing. A band only changes
when something real has changed, which means a re-check cannot show an owner an
improvement they did not earn or a decline they did not cause.

Discovery, recognition, recommendation, and information accuracy each keep
their own denominator and appear beside the band. The formula and band
definitions are published in the report and versioned; a re-check may only
compare scores computed under the same version. No peer benchmark is stated
until enough businesses in a category have been measured to state one honestly.

## Customer journey

The journey below is the target. It is built in the order set out in
[`VISION.md`](./VISION.md): the measurement path first (steps 4 to 6), then
payment and report persistence (step 3), then one polish pass across all of it,
then owners. Steps 1 and 2 are how an owner arrives, and are not automated.

### 1. Demonstrate before selling

Pick one vertical in one city. Pull a list of candidate businesses from public
listings. Run a small number of unbranded Indonesian questions against each
one, before any contact.

Approach only the businesses that did not appear, and lead with what was
actually observed: the question asked, the answer given, and the competitor
named instead. The first message is a finding about their business, not a
pitch.

Never contact a business using a finding that was not actually observed.

### 2. Business confirmation

Confirm one exact business: name and known variants, location or service area,
public listing, official website or authoritative social profile. If identity
is ambiguous, stop or select another business. Never guess which branch or
entity an AI answer refers to.

### 3. Offer and payment

State one price, what the report includes, delivery timing, and limitations.
Confirm payment before starting the personalised audit. A hosted payment link is
enough; no account is required to buy.

### 4. Intake

Collect only what changes the report:

- exact business location or service area;
- priority services or offers;
- intended customer;
- important differentiators;
- known competitors, optional; and
- public facts that AI may get wrong, optional.

Mark owner-supplied facts as such until verified. Do not collect customer
records, payment credentials, or other sensitive information the audit does not
need.

### 5. Audit

Confirm the business facts, review the ten Indonesian questions, and run each
one independently with web search. Retain the observed answers and sources as
evidence.

### 6. Delivery

Deliver a short, downloadable, Indonesian report at a private link the owner can
return to, containing:

- the headline counts with denominators, and the score band;
- what was tested;
- where the business appeared and did not appear;
- relevant competitor observations;
- inaccurate, inconsistent, or missing public information;
- the top three recommended actions; and
- sources, limitations, and the recommended re-check point.

The report is produced by the pipeline, not assembled by hand. A run that needs
a person to rescue it mid-way is a defect, not a delivery style.

### 7. Re-check

After six to eight weeks, offer to re-run the same questions and show what
changed. This requires the approved question pack to be persisted and replayed
verbatim, and the score to be computed under the same version.

### 8. Feedback

Ask the owner:

1. Was anything in this report new to you?
2. What was useful, confusing, missing, or unconvincing?
3. Which action will you actually do, and by when?

Record payment, objections, requested concessions, whether the owner acted, and
re-check interest. Do not treat stated intent as completed action.

## What happens behind the scenes

The workflow uses public web sources, an owner-confirmed brief, AI observations
with web search, automated evidence checks, and a report generated from the
retained observations.

The intake-to-report path is the product surface and is built before anything is
sold. Everything around it — dashboards, client management, integrations,
multi-vertical support — is built only to remove a problem observed in a real
delivery.

Two steps inside the run stay under human review and are not automated away:
confirming the business facts, and approving the ten questions.

## Non-goals

- permanent or universal AI rankings;
- guarantees or forecasts of inclusion, leads, revenue, or sales;
- monitoring subscriptions, dashboards, or live-updating numbers;
- an exact-integer score, or a peer benchmark before it is earned;
- clinical-quality assessment or medical recommendations;
- a full traditional SEO audit or automatic optimisation tool;
- client-management systems, team accounts, or any dashboard;
- an agency, reseller, or white-label offer at this stage;
- broad multi-vertical or multi-city support before one works; and
- replacing the owner's implementation work.

The re-check is not monitoring. It is a second measurement the owner chooses to
buy, at a cadence that matches how fast the underlying reality moves.

## Current success signals

The raw MVP is promising when:

- an owner reads the sample and understands the problem without being taught
  the category;
- an owner pays for one audit with no ranking or revenue guarantee offered;
- the report contains a specific finding the owner did not already know and
  could not have got by casually asking a chatbot;
- the owner completes at least one recommended action;
- an owner buys a re-check, or refers another business; and
- delivery effort per audit falls below what the price supports.

These are questions to test, not claims that Nuave has proven them.

## Open terms before a paid offer

Before accepting a paid audit, state one founder-approved price, a realistic
delivery promise, the exact report scope, privacy and retention treatment, and
a correction or remedy path. Legal or regulatory requirements remain subject to
qualified review; do not present an internal checklist as legal advice or a
completed compliance review.
