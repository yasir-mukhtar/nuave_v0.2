# Nuave v2 Operations Runbook

> **Purpose:** Define how a paid Nuave audit moves from confirmed clinic identity to delivery, support, correction, and remedy during the concierge-first launch.
>
> **Authority:** Operational execution policy for Nuave v2. The newest founder-approved entry in [DECISION_LOG.md](./DECISION_LOG.md) takes precedence; product scope is governed by [FOUNDATION.md](./FOUNDATION.md), while measurement and report-completeness rules are governed by [MEASUREMENT_SPEC.md](./MEASUREMENT_SPEC.md). If this runbook conflicts with one of those authorities, follow it and reconcile this file.
>
> **Status:** Working launch policy. Items marked **[HYPOTHESIS]** are service levels to test, not customer promises until explicitly adopted. Items marked **[OPEN]** need a founder decision or evidence.
>
> **Related:** [MVP_SPEC.md](./MVP_SPEC.md) · [MEASUREMENT_SPEC.md](./MEASUREMENT_SPEC.md) · [FUNNEL_AND_LIFECYCLE.md](./FUNNEL_AND_LIFECYCLE.md) · [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) · [EXPERIMENTS_AND_GATES.md](./EXPERIMENTS_AND_GATES.md) · [COMPLIANCE_AND_DATA.md](./COMPLIANCE_AND_DATA.md)

## 1. Operating model

- **[SETTLED]** The first cohort is a paid concierge pilot, not an unattended automated service.
- **[SETTLED]** Every one of the first 10 paid reports receives human QA before delivery.
- **[SETTLED]** Automation collects evidence, proposes findings, assembles the report, and records state. A named operator owns the customer outcome.
- **[SETTLED]** Manual work is permitted when disclosed internally and measured. It must not conceal a broken workflow or be assumed free in unit economics.
- **[SETTLED]** A truthful partial result, clarification request, or refund is preferable to a complete-looking report built from weak or missing evidence.
- **[SETTLED]** The web report is the delivery source of truth. The MVP PDF is generated from the same reviewed report version and must not become a second interpretation.
- **[NON-GOAL]** Launch support does not include implementing recommendations, indefinite consulting, or guaranteeing improved AI inclusion.

### 1.1 Launch roles

One person may hold several roles during the pilot, but ownership must remain explicit.

| Role | Accountable for |
|---|---|
| Founder/operator | Order queue, identity decisions, report QA, customer communication, remedies, and daily operational review |
| Audit system | Idempotent payment processing, evidence collection, retries, report assembly, event recording, and alerts |
| Engineering owner | Provider incidents, workflow failures, security incidents, data repair, and root-cause follow-up |
| Measurement owner | Prompt/methodology versions, evidence standards, completeness thresholds, and comparability decisions |

**[OPEN]** Name the primary and backup person for each role before accepting paid orders.

## 2. Order lifecycle

### 2.1 Canonical states

```text
identity_pending
  -> identity_confirmed
  -> checkout_created
  -> paid
  -> intake_pending
  -> queued
  -> collecting
  -> analyzing
  -> qa_review
  -> ready
  -> delivered
  -> opened
  -> action_selected
  -> followup
  -> recheck_eligible
```

Side states can interrupt the main path:

```text
clarification_required -> identity_confirmed | queued | cancelled
retry_scheduled        -> collecting | analyzing | qa_review
partial                -> retry_scheduled | delivered | refund_pending
failed                 -> retry_scheduled | refund_pending | refunded
payment_expired        -> checkout_created | cancelled
cancelled              -> refund_pending | refunded | closed
disputed               -> corrected | redelivered | refund_pending | closed
```

### 2.2 State rules

- Each transition records time, actor, reason, prior state, next state, and methodology/report version when relevant.
- Payment callbacks and audit jobs are idempotent. Replayed events must not create duplicate orders, charges, provider runs, or deliveries.
- An order cannot enter `checkout_created` until the customer has confirmed one exact clinic/location.
- An order cannot enter `queued` until payment is verified. Missing optional intake answers do not block the audit unless a required identity field is missing.
- `qa_review` is mandatory for the first 10 orders and for any later order that meets a manual-review trigger.
- `ready` means the delivery checklist has passed. `delivered` means a delivery attempt succeeded. `opened` requires a recorded report view, not merely a sent email.
- Terminal outcomes retain the evidence and reason needed for support and accounting, subject to the retention rules in [COMPLIANCE_AND_DATA.md](./COMPLIANCE_AND_DATA.md).
- Customer-visible status language should be plain: “payment confirmed,” “audit in progress,” “needs clarification,” “report ready,” or “we need to resolve a problem.” Do not expose internal provider or queue jargon.

## 3. Identity confirmation and clarification

### 3.1 Required pre-payment identity

The customer must confirm:

- one exact clinic location;
- clinic display name;
- city and full public address;
- authoritative Google Maps/Business Profile listing;
- official website, or an authoritative public social profile when no website exists;
- category eligibility under the current launch scope; and
- delivery email and, only when opted in, WhatsApp number.

The interface must show the resolved clinic and ask the customer to affirm: “Yes, this is my clinic.” Name, category, and city alone are insufficient.

### 3.2 Clarification triggers

Move to `clarification_required` when:

- the clinic name resolves to multiple branches or similarly named businesses;
- the customer-selected listing conflicts with the supplied website, phone, address, or city;
- the listing appears closed, moved, merged, duplicated, or newly created;
- there is no authoritative public source sufficient to distinguish the clinic;
- the order is for a multi-location group, franchise, unsupported category, or unsupported geography; or
- a material identity conflict emerges during evidence collection.

### 3.3 Clarification procedure

1. Pause collection that could be attributed to the wrong clinic.
2. Send one concise request showing the candidate identity and the exact missing or conflicting field.
3. Preserve any completed provider work, but do not attach it to the clinic until identity is resolved.
4. Resume idempotently after confirmation.
5. If the customer does not respond, follow the launch timing policy below; do not silently audit a best guess.

**[HYPOTHESIS]** Send one clarification reminder after one business day and a final reminder after three business days. Close and refund unresolved orders after five business days. Validate whether these intervals are understandable and operationally workable.

## 4. Queue, retries, and provider failures

### 4.1 Retry policy

- Retry only failures likely to be transient: rate limits, timeouts, temporary upstream errors, interrupted jobs, and render/storage timeouts.
- Do not automatically retry deterministic failures such as invalid input, unsupported location, a rejected safety request, or a schema/parser failure that repeats on the same raw output.
- Retry at the smallest durable step. Do not rerun completed paid provider calls unless required for evidence integrity.
- Use bounded exponential backoff with jitter; preserve every attempt and its cost/latency metadata.
- Never alter the prompt, locale, clinic identity, platform, or methodology silently to make a retry succeed.
- When a retry would make repeated runs temporally non-comparable, disclose the timing difference and route to review.

### 4.2 Initial retry limits

The exact values belong in technical configuration and may vary by provider.

- **[HYPOTHESIS]** Maximum three automatic attempts for a transient provider step.
- **[HYPOTHESIS]** Maximum two automatic attempts for report rendering or delivery.
- **[HYPOTHESIS]** Escalate an order to the operator if it remains incomplete 30 minutes after the first failed attempt.
- **[OPEN]** Set provider-specific timeouts and a maximum incremental retry-cost ceiling after the feasibility spike.

### 4.3 Degraded providers

If one audit surface is degraded:

1. stop promising an unaffected delivery time for new checkouts if the promise cannot be met;
2. retry within the defined bounds;
3. evaluate completeness using [MEASUREMENT_SPEC.md](./MEASUREMENT_SPEC.md);
4. deliver a clearly labeled partial report only when it still provides sufficient paid value and the customer accepts the remedy; otherwise rerun later or refund; and
5. disclose the unavailable surface and exclude it from composite conclusions.

Do not substitute an unapproved model or consumer-interface scrape for a named audit surface.

## 5. Manual review

### 5.1 Mandatory review triggers

Manual review is required when any of the following is true:

- the order is among the first 10 paid reports;
- clinic identity confidence is not high or changes after collection begins;
- a required platform or minimum coverage threshold fails;
- repeated runs materially disagree;
- a competitor cannot be confidently resolved;
- an output contains a potentially false, harmful, discriminatory, or medical claim;
- a finding relies on one unstable observation;
- a recommendation touches clinical outcomes, treatment suitability, safety, credentials, price claims, testimonials, before/after material, or regulated advertising;
- public sources contradict customer-supplied information;
- the system proposes a causal explanation not directly supported by evidence;
- the report includes unexpected personal information or possible patient data;
- report rendering omits evidence, changes meaning, or creates an internal contradiction;
- the customer disputes a material result; or
- cost, latency, retry count, or operator intervention exceeds its current alert threshold.

### 5.2 Review outcomes

The operator may:

- approve without changes;
- edit presentation while preserving the observation and provenance;
- downgrade confidence or narrow a claim;
- remove an unsupported finding or recommendation;
- request identity/input clarification;
- approve a partial report with a documented remedy;
- schedule an evidence-preserving rerun; or
- fail the audit and initiate a refund/remedy.

Edits that change a material finding require a new report version and a reason. Never edit raw provider output.

## 6. QA checklist

An operator must confirm each applicable item before `ready`:

### Identity and scope

- [ ] The exact clinic location matches the customer-confirmed listing, website/social source, city, and category.
- [ ] Audit date, language, location context, platforms, prompt pack, and methodology version are present.
- [ ] Branded accuracy and non-branded discovery are presented separately.

### Evidence and analysis

- [ ] Required coverage meets the current measurement threshold, or missing coverage is explicit.
- [ ] Every material finding traces to preserved observations and sources.
- [ ] Appearance, mention, recommendation, citation, and order are not conflated.
- [ ] Contradictory runs and meaningful variability are visible.
- [ ] Competitors and public sources are real, resolved entities; no attribute is invented.
- [ ] Observation, Nuave inference, recommendation, confidence, and limitation are distinguishable.
- [ ] No unsupported causation, guaranteed result, universal ranking, or fabricated commercial-loss estimate appears.

### Recommendations and clinic safety

- [ ] Each priority recommendation has evidence, rationale, action, owner, effort, confidence, caveat, and completion check.
- [ ] Recommendations are feasible for the intended small-clinic operator or clearly identify needed specialist help.
- [ ] No recommendation encourages unsupported medical, credential, treatment-result, testimonial, or comparative-superiority claims.
- [ ] Any potentially regulated copy is framed as a draft requiring clinic and legal/professional review, or excluded from the launch report.
- [ ] No patient data or irrelevant personal data appears.

### Delivery

- [ ] Top three actions are clear on mobile without reading the entire report.
- [ ] Limitations and partial/failure disclosures are prominent, not hidden in fine print.
- [ ] The secure report link works, is non-enumerable, and is not exposed in logs or analytics payloads.
- [ ] Customer identity, order, payment, report version, and delivery recipient match.
- [ ] Delivery and recovery paths have been tested.

## 7. Delivery promises and service-level progression

Service levels are hypotheses until validated and placed in customer-facing terms.

| Stage | Internal target | Customer-facing posture | Promotion gate |
|---|---|---|---|
| Feasibility and first 10 paid orders | **[HYPOTHESIS]** Deliver within 24 hours after resolved identity and verified payment | State the tested window and that the report is reviewed | At least 90% full, on-time delivery; all failures remedied; median manual QA measured |
| Orders 11–30 | **[HYPOTHESIS]** Deliver within four hours during stated operating hours | Publish the tested window only if staffing and providers support it | Two consecutive cohorts meet the window; partial/failure rate within the agreed ceiling |
| Post-validation automation | **[HYPOTHESIS]** Most eligible orders ready within 30–60 minutes | Never promise “instant”; disclose exceptions and operating-hours support | Unattended reports meet the same QA bar and manual-review triggers reliably fire |

- The clock pauses while required customer clarification is outstanding, but the customer must be told.
- Optional post-payment brief questions do not pause fulfillment.
- A late report triggers proactive communication before the promised window expires.
- “About 15 minutes” must not appear in customer-facing copy until production evidence supports it at the required quality level.
- **[OPEN]** Founder must approve the first public delivery promise, operating hours, weekend treatment, and timezone.

## 8. Full, partial, failed, and no-mention outcomes

### 8.1 Full report

A full report meets all minimum platform, prompt, evidence, identity, and recommendation thresholds in [MEASUREMENT_SPEC.md](./MEASUREMENT_SPEC.md) and passes QA. “No recommendation observed” is a valid result and does not by itself make the report incomplete.

### 8.2 Partial report

A partial report is acceptable only when:

- identity is resolved;
- the successful evidence remains methodologically valid and useful;
- missing surfaces or prompts are named prominently;
- conclusions are narrowed to the successful sample;
- the report does not visually imply full coverage; and
- the customer receives the approved remedy.

**[OPEN]** Founder must choose the launch remedy matrix after provider feasibility and customer interviews. Candidate remedies to test are: later completion at no charge, a proportional refund, full refund, or customer choice between rerun and refund. Store credit alone is not an adequate default for an unvalidated product.

### 8.3 Failed audit

An audit is failed when identity cannot be resolved, successful evidence falls below the minimum useful threshold, the report cannot be safely rendered/delivered, or a material integrity problem cannot be corrected promptly. A failed audit cannot be marked delivered.

### 8.4 Sparse or zero visibility

A clinic appearing in none of the tested non-branded prompts is not a system failure. The report must still:

- state the tested scope and zero-appearance result without universalizing it;
- verify that identity and prompts were valid;
- avoid inventing causal reasons;
- show relevant public-source readiness observations; and
- provide evidence-backed actions or explicitly state when evidence is insufficient.

## 9. Refunds, remedies, and disputes

### 9.1 Operating principles

- Make the remedy proportional to the product not delivered, the delay, and the customer’s ability to use the result.
- Never condition a required refund on a testimonial, referral, or waiver of correction rights.
- Refund and cancellation copy must match actual Midtrans/payment-method capabilities and reviewed terms.
- Do not promise refund timing until payment-method behavior is verified.
- Any legal requirement governing cancellation, refunds, consumer protection, tax, or invoices remains **[OPEN] pending Indonesian legal review**; see [COMPLIANCE_AND_DATA.md](./COMPLIANCE_AND_DATA.md).

### 9.2 Launch remedy matrix

| Event | Default operational response | Policy status |
|---|---|---|
| Duplicate charge | Verify idempotency incident, refund duplicate, notify customer | **[SETTLED] operational intent; legal/payment wording OPEN** |
| Wrong clinic due to Nuave error | Stop delivery, correct and rerun promptly; offer refund if timely correction is not useful | **[SETTLED] operational intent** |
| Customer confirmed the wrong clinic | Pause; assess whether paid provider work has begun; offer a reasonable correction path | **[OPEN]** |
| Full audit cannot meet minimum evidence | Full refund or customer-approved rerun; do not deliver filler | **[SETTLED] operational intent; exact timing OPEN** |
| Partial report | Explain missing scope before acceptance; apply approved partial remedy | **[OPEN] after feasibility data** |
| Missed delivery promise | Proactively update; prioritize completion; apply delay remedy when the report is no longer useful | **[OPEN]** |
| Customer dislikes a valid result | Review evidence and product description; correct factual errors, but do not alter truthful observations to create a favorable result | **[SETTLED]** |
| Material factual error in Nuave analysis | Correct, version, redeliver, explain the change; refund if the error undermines the paid value | **[SETTLED] operational intent** |
| Chargeback/payment dispute | Preserve order, consent, payment, delivery, open, support, and remedy records; respond through the payment provider without exposing unrelated data | **[SETTLED] operational intent** |

### 9.3 Dispute workflow

1. Acknowledge receipt and assign an owner.
2. Freeze automatic follow-up and marketing for the disputed order.
3. Preserve the challenged report version and underlying evidence.
4. Classify the issue: identity, observation, inference, recommendation, billing, access, privacy, or expectation mismatch.
5. Independently re-check the evidence and methodology; do not overwrite history.
6. Respond with the specific evidence, limitation, correction, or remedy.
7. Version and redeliver any correction; record whether the customer accepts the resolution.
8. Feed recurring causes into the experiment log and product backlog.

**[HYPOTHESIS]** Acknowledge support and disputes within one business day during the pilot. **[OPEN]** Define final resolution targets after measuring case complexity and reviewing legal requirements.

## 10. Support and aftersales operations

- The founder/operator owns support for the first 30 paid orders so objections and confusion are not abstracted away.
- Use one support inbox as the system of record. WhatsApp may be a customer-facing channel only with appropriate consent, but material decisions and remedies must be copied into the order record.
- Delivery messages should identify the clinic, report date, secure access method, top next step, support contact, and correction path.
- Day 2 support asks whether anything is unclear or inaccurate; it is not a marketing message.
- Day 7 asks which action, if any, the customer selected.
- Day 21–30 may request completion evidence, testimonial, or referral only under the consent and claims rules in [COMPLIANCE_AND_DATA.md](./COMPLIANCE_AND_DATA.md).
- Re-audit outreach must preserve a comparable prompt/provider subset and honor communication consent.
- A report explanation call may be offered during the pilot, but minutes spent must be logged and the boundary stated. It is not an implicit ongoing advisory service.

## 11. Instrumentation and daily review

### 11.1 Required order-level instrumentation

Record:

- state-entry and state-exit timestamps;
- payment verification, duplicates, refund, and dispute events;
- provider, model/surface, prompt version, attempt, latency, result, and direct cost;
- successful/failed prompt and platform coverage;
- automated and manual QA outcome;
- every manual intervention: actor, reason code, start/end time, action, and report version;
- report render, delivery, bounce, recovery, revocation, open, and correction events;
- support contacts, reason codes, resolution, and minutes;
- final outcome: full, partial, clarification, failed, cancelled, refunded, or disputed.

### 11.2 Manual-minute taxonomy

Use consistent reason codes:

- identity resolution;
- provider retry/failure;
- competitor resolution;
- evidence/claim review;
- regulated-content review;
- recommendation editing;
- render/delivery repair;
- customer support/explanation;
- dispute/correction; and
- other, with required note.

Report median and 90th-percentile manual minutes per delivered order, not only the average. Include founder support time in contribution calculations.

### 11.3 Pilot dashboard

Review daily:

- paid orders by state and age;
- delivery rate and promised-window compliance;
- full, partial, clarification, failure, refund, and dispute rates;
- provider success, retry, latency, and cost;
- manual minutes by reason;
- reports delivered but not opened;
- unresolved support and access issues;
- finding usefulness, action selection, and correction feedback; and
- any security, privacy, or medical-claim flag.

## 12. Incident handling

### 12.1 Severity

| Severity | Example | Immediate action |
|---|---|---|
| SEV-1 | Secret/token exposure, unauthorized report access, patient data received or disclosed, incorrect report delivered to another customer, payment integrity failure affecting multiple orders | Stop affected workflow/delivery, restrict access, preserve evidence, notify accountable owners, begin containment |
| SEV-2 | Provider or queue outage blocking paid orders, systemic incorrect findings, broken report recovery, widespread missed promise | Pause affected promises/checkouts, communicate with impacted customers, remediate or refund |
| SEV-3 | Single-order failure, broken formatting, isolated delayed email, recoverable source mismatch | Assign owner, repair within normal support workflow, monitor recurrence |

### 12.2 Incident procedure

1. Detect and create an incident record; do not debug only in chat.
2. Contain the customer, data, payment, or delivery impact.
3. Preserve relevant logs without copying secrets or unnecessary personal data.
4. Identify affected orders and stop unsafe automation.
5. Communicate facts, current impact, next update, and remedy; do not speculate.
6. Recover through idempotent rerun, corrected report version, access-token rotation, or refund.
7. Record root cause, timeline, customer impact, manual minutes, and preventive action.
8. Decide whether the incident invalidates a readiness gate or requires legal/regulatory notification.

Notification duties and timelines are **[OPEN] pending Indonesian legal review**. Security handling must follow [COMPLIANCE_AND_DATA.md](./COMPLIANCE_AND_DATA.md).

## 13. Launch readiness gates

Do not accept paid production orders until all prelaunch items pass:

- [ ] Primary and backup operational owners are named.
- [ ] Exact clinic identity confirmation works before checkout.
- [ ] Payment verification, duplicate webhook, cancellation, and refund paths are tested in the intended Midtrans environment.
- [ ] Durable retries resume at the failed step and do not duplicate work.
- [ ] Full/partial/failure thresholds are defined in the measurement spec.
- [ ] Every first-cohort report is routed to human QA.
- [ ] The QA checklist and material manual edits are versioned and auditable.
- [ ] Secure report delivery, recovery, revocation, and wrong-recipient response are tested.
- [ ] Customer support inbox and escalation contacts are staffed for the published operating window.
- [ ] Public delivery copy matches the conservative, currently approved service level.
- [ ] Refund/remedy wording and operational capability match.
- [ ] Privacy notice, terms, payment copy, consent language, and clinic-claims guardrails have completed the review described in [COMPLIANCE_AND_DATA.md](./COMPLIANCE_AND_DATA.md), or launch is explicitly constrained to an approved pilot arrangement.
- [ ] A complete synthetic order and at least three representative clinic dry runs pass end to end.
- [ ] Event, cost, latency, manual-minute, and incident instrumentation is visible to the operator.

### 13.1 Gate to reduce human review

Do not remove universal human QA merely because order volume grows. Consider sampling-based QA only after:

- at least 20 paid reports have been reviewed;
- two consecutive cohorts meet the agreed full-delivery, timeliness, factual-correction, and refund ceilings;
- all mandatory trigger classes reliably route to review;
- automated reports meet the same evidence and claims bar as reviewed reports; and
- the founder records the decision and rollback trigger in [DECISION_LOG.md](./DECISION_LOG.md).

The numeric ceilings remain **[OPEN]** until the feasibility spike and first cohort establish a baseline. Initial experimental targets belong in [EXPERIMENTS_AND_GATES.md](./EXPERIMENTS_AND_GATES.md), not in customer promises.

## 14. Change control

- Operational policy changes that affect customer promises, refunds, identity, delivery completeness, access, or regulated content require a dated decision-log entry.
- Temporary incident workarounds must have an owner and expiration condition.
- Update this runbook when a repeated manual intervention becomes a designed workflow, or when a support/dispute cause recurs three times.
- Never turn a favorable pilot observation into a permanent SLA without recording cohort size, dates, and exclusions.
