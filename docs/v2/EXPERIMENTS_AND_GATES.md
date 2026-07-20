# Nuave v2 experiments and validation gates

> Status: **Canonical validation framework**
> Authority: [`FOUNDATION.md`](./FOUNDATION.md)
> Updated: 2026-07-19

Features and traffic do not advance Nuave to the next stage. Recorded evidence
does. Thresholds below are initial experiment criteria, not proven benchmarks.

## 1. Instrumentation principles

- Track cohorts by vertical, city, offer, channel, partner, landing variant,
  audit-spec version, and delivery classification.
- Join acquisition to payment, fulfillment, usefulness, action, refund,
  referral, and re-audit.
- Count founder and operator minutes as a delivery cost.
- Record contradictory and negative evidence.
- Change one material acquisition or offer variable at a time when possible.
- Do not scale from a handful of favorable anecdotes.

## 2. Gate 0: measurement feasibility

Question: can Nuave observe and summarize clinic visibility credibly?

Required evidence:

- a defensible dental-clinic prompt taxonomy;
- exact identity resolution on a representative sample;
- a documented API-surface disclosure;
- measured repeated-run variability;
- traceability from raw response to finding and recommendation;
- known provider failure and safety-block behavior; and
- a report that does not require fabricated certainty.

Exit decision: proceed, revise methodology, narrow the promise, or stop.

## 3. Gate 1: paid problem validation

Question: will the target buyer pay without a ranking guarantee?

Method:

- founder-assisted discovery and sales;
- one public founding offer;
- recorded objections and buyer language; and
- paid orders rather than free-report enthusiasm.

Do not use a discounted or refunded order as willingness-to-pay evidence without
labeling the concession.

## 4. Gate 2: report-value validation

Question: is the report credible, non-obvious, and actionable?

First-cohort experimental thresholds:

- at least 70% report one useful finding unavailable from casual chatbot use;
- at least 50% select an intended action within seven days;
- at least 30% complete one action within 30 days;
- at least 90% of paid orders receive the promised full report or an accepted
  remedy within the delivery commitment;
- fewer than 10% result in a refund or material dispute; and
- median operator QA falls below 30 minutes by order 20 and continues downward.

Qualitative confusion, distrust, inaccessible recommendations, or heavy hidden
consulting can fail this gate even if numeric thresholds pass.

## 5. Gate 3: funnel validation

Question: can a proof-led, truthful journey convert beyond founder explanation?

Required evidence:

- the clinic lookup resolves qualified prospects;
- sample evidence and methodology build trust rather than confusion;
- landing-to-lookup, lookup-to-checkout, and checkout-to-payment are measured;
- the single offer is understood;
- abandonment reasons are known; and
- technical payment or delivery failures are not masking message performance.

Test the cached market Preview only after curated proof and direct sales establish
what buyers need to see before purchase.

## 6. Gate 4: acquisition validation

Question: can a channel acquire delivered, satisfied customers economically?

Track contribution per order:

```text
revenue
- tax and payment fees
- provider and storage costs
- operator and support cost
- refunds, disputes, and failures
= contribution before acquisition
- attributable acquisition cost
= contribution after acquisition
```

Scaling requires positive contribution after acquisition for a sufficiently
stable cohort, acceptable operational capacity, and no deterioration in refund,
usefulness, or action rates.

The ad pause rule and budget increase rule are **[OPEN]** until actual pilot cost
and conversion data exist.

## 7. Gate 5: repeat and expansion

Question: is there evidence for comparable re-audits, referrals, higher-value
packages, a second city, or aesthetic clinics?

Expansion requires:

- observed re-audit intent or purchases after customer action;
- comparable audit methodology;
- referral behavior;
- distinct evidence for the proposed new segment; and
- no degradation of the dental-clinic product or delivery operation.

Subscription monitoring remains out of scope unless repeated customer behavior,
not founder preference, creates a new decision.

## 8. Prioritized experiments

### EXP-001: dental-clinic feasibility sample

- **Hypothesis:** the v0 identity and prompt design produce traceable,
  differentiated observations for single-location dental clinics.
- **Sample:** at least 10 public clinics in the candidate launch city.
- **Primary evidence:** identity success, provider coverage, variance, useful
  finding rate under operator review.
- **Decision:** choose city and finalize or revise the v0 audit spec.
- **Status:** `SAMPLE_LOCKED` — 10 evidence clinics and one excluded calibration
  clinic are frozen; no provider observations or result are available.
- **Pre-registered record:**
  [`experiments/EXP-001/README.md`](../../experiments/EXP-001/README.md), including
  the frozen prompt pack, sampling rules, observation schema, review rubric,
  identity sample, experimental thresholds, and stop rules.

### EXP-002: paid founding offer

- **Hypothesis:** target owners will pay Rp149,000 without an outcome guarantee.
- **Sample:** founder-assisted prospects until at least 10 paid or a clear failure
  pattern emerges.
- **Primary evidence:** payment and objection quality.
- **Guardrails:** no deceptive personalization or unrecorded discount.

### EXP-003: report differentiation

- **Hypothesis:** at least 70% of paid customers receive a useful, non-obvious
  finding beyond casual chatbot use.
- **Sample:** first 20–30 paid reports.
- **Primary evidence:** structured post-delivery response and interview.
- **Guardrails:** credibility, dispute, and generic-recommendation rate.

### EXP-004: actionability

- **Hypothesis:** customers select and complete at least one realistic action.
- **Primary evidence:** tokenized report interactions and completion evidence.
- **Decision:** refine recommendation type, owner, effort, or aftersales support.

### EXP-005: single offer versus private downsell

- **Hypothesis:** one public Full Audit maximizes clarity and contribution.
- **Variant:** a private OpenAI-only downsell offered only after a recorded price
  objection or abandoned checkout; do not mislabel the API surface as ChatGPT.
- **Decision:** keep private, expose publicly, reprice, or remove.

### EXP-006: proof-led acquisition

- **Hypothesis:** permissioned findings and case evidence convert cold or partner
  traffic after report value is validated.
- **Guardrails:** positive contribution, refund rate, support load, and trust.
- **Decision:** scale, revise message/channel, or pause.

### EXP-007: composite score comprehension

- **Hypothesis:** a transparent score helps customers prioritize without hiding
  the sample or conflating discovery, accuracy, and citations.
- **Timing:** only after ten score-free reports.
- **Decision:** add component score, add composite score, or remain score-free.

## 9. Experiment record template

| Field | Required content |
|---|---|
| ID and dates | Stable identifier and actual run dates |
| Hypothesis | Falsifiable statement |
| Governing decision | Foundation or decision-log reference |
| Segment | Vertical, city, persona, eligibility |
| Variant/control | Exact customer-visible or operational difference |
| Primary metric | One decision-driving measure |
| Guardrails | Trust, quality, refund, support, compliance |
| Sample/stop rule | Bound before reviewing results |
| Result | Quantitative and qualitative evidence |
| Decision | Adopt, reject, revise, repeat, or inconclusive |
| Follow-up | Owner and next action |

## 10. Evidence register

Store customer language, interview notes, survey output, manual-review causes,
provider anomalies, funnel data, and financial calculations in dated records.
Summaries must link to the underlying evidence and state sample limitations.
