# Nuave v2 foundation

> Status: **Canonical strategy and product vision**
> Version: 2.0
> Approved direction: 2026-07-19
> Audience: founders, contributors, and future AI sessions

This document defines why Nuave v2 exists, whom it serves, what it promises,
and which principles constrain implementation. It supersedes the earlier v2
Grand Design. Detailed execution belongs in the sibling documents listed in
[`README.md`](./README.md).

## 1. Vision

Nuave helps a local business understand how selected AI search and answer
surfaces represent and recommend it, then turns those observations into a
small, evidence-backed action plan the business can execute or delegate.

Nuave should make an uncertain new discovery channel concrete without
pretending that AI answers are stable rankings or that any action guarantees
future inclusion.

## 2. Current product thesis

**[SETTLED]** Nuave v2 is a one-time paid diagnostic, not subscription software.

**[SETTLED]** The initial validation wedge is single-location dental clinics.
Aesthetic clinics are the first planned vertical experiment, not part of the
same launch prompt pack.

**[OPEN]** The first operating city among Jakarta, Bandung, and Surabaya will be
selected according to founder access, partner access, and the feasibility
study. The first paid cohort should not launch three cities simultaneously.

**[HYPOTHESIS]** Clinic owners or marketing leads will pay for a qualified,
non-guaranteed diagnosis because patient acquisition value, local competition,
trust, and public reputation make incorrect or absent AI representation worth
investigating.

The core business risk is not model cost. It is whether the problem feels urgent,
the report is materially better than casual chatbot use, customers can act on
the recommendations, and acquisition remains economic.

## 3. Customer and job to be done

The initial buyer is the owner, operator, or marketing lead of a small or
medium single-location dental clinic. The reader is a non-technical decision
maker who may delegate work to staff, a freelancer, a developer, or an agency.

Their job is:

> Show me where my clinic appeared or did not appear in a defined sample of AI
> recommendations, what the systems said, which competitors appeared, what
> evidence may explain the gap, and what I should fix first.

A successful report helps the customer decide:

- what to do;
- why it matters;
- which evidence supports it;
- who should own it;
- how much effort it may require;
- how completion can be verified; and
- when a comparable re-audit is appropriate.

## 4. Promise and positioning

Customer-facing promise:

> See where your clinic is missing from tested AI recommendations, what AI says
> about it, and what to fix first.

“Why” always means a qualified Nuave inference supported by observed evidence.
It does not mean proven causation.

Nuave is better than asking one chatbot once because it combines a versioned
prompt set, repeated core observations, multiple provider surfaces, exact
business identity resolution, source and competitor analysis, explicit
limitations, and a prioritized action plan.

If customers do not consistently perceive that difference, the product thesis
has failed validation.

## 5. Launch product

**[SETTLED]** There is one public founding-cohort offer:

> Full AI Visibility Audit — Rp149,000

The price is a validation price, not a proven long-term price. An OpenAI-only
downsell may be tested privately after an objection or abandoned checkout, but
it is not a public launch tier and must not be labeled “ChatGPT” when it uses an
API surface that does not reproduce the ChatGPT consumer experience.

The first audit uses two named, web-grounded API surfaces:

- OpenAI with web search; and
- Gemini with Google Search grounding.

It also inspects relevant public source readiness such as the clinic website and
confirmed business listing. Perplexity and Google AI Mode/Overviews are deferred
until the base methodology is reliable and customers demonstrate that platform
breadth adds value.

**[SETTLED]** API and standardized SERP observations must not be represented as
exact replicas of personalized consumer interfaces.

**[SETTLED]** The first ten paid reports do not use a composite 0–100 score.
They lead with inclusion counts, a platform-and-intent evidence matrix,
accuracy findings, source gaps, and prioritized actions. Whether a composite
score improves comprehension is a later experiment.

## 6. Customer journey

The intended lifecycle is:

```text
Message-matched ad, content, referral, or outreach
  -> vertical landing page
  -> exact clinic lookup and eligibility confirmation
  -> real market evidence and sample report
  -> one offer and Midtrans checkout
  -> short post-payment brief
  -> durable audit pipeline and operator QA
  -> secure mobile-first report and PDF
  -> action commitment and support
  -> completion follow-up, referral, and comparable re-audit
```

**[SETTLED]** Exact business identity is confirmed before payment. This is an
eligibility check, not a free personalized audit.

**[SETTLED]** The personalized audit starts only after confirmed payment.

**[SETTLED]** No account is required. Access uses a revocable, unguessable link
with email-based recovery. Report retention is finite and disclosed; it is not
an irrevocable permanent bearer link.

**[SETTLED]** Aftersales is part of the product. Nuave records whether the report
was opened, which action the customer selected, whether it was completed, and
whether a referral or comparable re-audit followed—with appropriate consent.

## 7. Acquisition strategy

**[SETTLED]** The first 20–30 paid customers come primarily from
founder-assisted outreach, referrals, relevant owner communities, and partners
such as clinic marketers, website specialists, or local-search practitioners.

The landing page supports this sales process before it becomes a scalable
self-serve acquisition engine.

Cold paid advertising begins only after report usefulness and operational
delivery pass their validation gates. Paid and organic messages must lead to a
landing experience with the same vertical, city, problem, and proof.

Marketing must create competitive tension without fearmongering, fake scarcity,
deceptive personalization, or guarantees. Lead with observed customer intent,
competitors, accuracy, and controllable actions—not AEO jargon or a vanity score.

## 8. Product principles

1. **Evidence before narrative.** Store raw observations before generating
   findings or recommendations.
2. **Observation is not causation.** Label Nuave explanations as inferences.
3. **Identity before measurement.** Ambiguous businesses are clarified or
   rejected, not guessed.
4. **Truthful incompleteness.** Partial data is disclosed; the product never
   manufactures a complete-looking report.
5. **Action over page count.** A short report that changes a decision is more
   valuable than a long generic audit.
6. **Purpose-built wedge.** Prompts, examples, recommendations, QA, and landing
   copy must feel specific to dental clinics.
7. **Comparable change only.** Re-audits compare the same methodology subset and
   disclose any changed surface, model, prompt, language, or location.
8. **Manual work is instrumentation.** Early operator QA is logged and measured,
   not hidden as free permanent labor.
9. **One lifecycle.** Acquisition attribution, payment, audit, delivery,
   usefulness, action, referral, and re-audit belong to one measurable journey.
10. **Scope follows evidence.** New platforms, verticals, packages, automation,
    and advertising scale require the preceding validation gate.

## 9. What Nuave is not

- **[NON-GOAL]** A permanent or universal AI ranking.
- **[NON-GOAL]** A guarantee of inclusion, recommendation, leads, or revenue.
- **[NON-GOAL]** Subscription monitoring or a user dashboard.
- **[NON-GOAL]** A full traditional SEO audit.
- **[NON-GOAL]** A clinic advertising, treatment, or medical-claims generator.
- **[NON-GOAL]** Automatic changes to websites or business profiles.
- **[NON-GOAL]** Patient-data collection or analysis.
- **[NON-GOAL]** Broad category, nationwide, multi-location, franchise, agency,
  or enterprise support at launch.
- **[NON-GOAL]** A marketplace or bundled implementation service.

## 10. Delivery strategy

The seven-day build target means a sellable concierge pilot, not a fully
automated production platform. The first cohort may include logged human review
and manual correction. The system must still be truthful, secure, traceable,
and complete from payment through aftersales.

Use a fresh repository and data model. Selectively extract small, proven,
low-coupling modules from the legacy product only after review and tests. Do not
port its organization, workspace, subscription, dashboard, or recurring-cron
architecture.

## 11. Definition of current success

Nuave succeeds at this stage when evidence shows that:

1. a target clinic owner pays without a ranking guarantee;
2. the clinic is measured through a documented and qualified method;
3. the report contains credible, non-obvious findings;
4. the customer selects and completes at least part of the action plan;
5. delivery is repeatable without unsustainable hidden labor;
6. customers refer, request help, or show re-audit intent; and
7. at least one acquisition path has plausible contribution economics.

Traffic, nominal margin, page count, platform count, and raw order volume are
secondary until those conditions hold.

## 12. Unresolved foundation questions

The specialist documents define operational open questions. The highest-level
items still requiring founder or feasibility evidence are:

- first launch city;
- exact long-term price and delivery promise;
- whether the second vertical is aesthetic clinics;
- whether a composite score improves customer understanding;
- target retention period and legal review outcome; and
- which channel can acquire customers profitably after founder-assisted sales.

Do not block the feasibility study on questions that can be learned from the
first paid cohort. Do not launch paid production while a required safety,
payment, identity, or evidence question remains unresolved.
