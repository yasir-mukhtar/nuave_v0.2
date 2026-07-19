# Nuave v2 artifact workflow

> Status: **Canonical instruction for artifact creation**
> Authority: [`FOUNDATION.md`](./FOUNDATION.md), [`MVP_SPEC.md`](./MVP_SPEC.md), and [`FUNNEL_AND_LIFECYCLE.md`](./FUNNEL_AND_LIFECYCLE.md)
> Live progress: [`ARTIFACT_STATUS.md`](./ARTIFACT_STATUS.md)
> Updated: 2026-07-19

## 1. Purpose

This workflow governs how Nuave turns the v2 strategy into low-fidelity
touchpoint artifacts without losing message consistency, overstating the
measurement, or depending on a long AI conversation for context.

Artifacts are decision tools before they are production designs. Their first
job is to expose gaps between acquisition promises, product evidence, customer
actions, operational states, and aftersales. Visual polish comes later.

## 2. Governing approach

Build one coherent end-to-end golden path before creating many variants:

```text
Ad or organic content
  -> vertical landing page
  -> clinic lookup and eligibility
  -> truthful pre-payment proof
  -> one offer and checkout
  -> post-payment brief
  -> audit progress
  -> reviewed report
  -> action selection
  -> support and completion follow-up
  -> comparable re-audit or referral
```

Use one dental-clinic customer, one provisional city, one acquisition message,
and one shared audit fixture throughout the first pass. A customer fact, clinic
identity, observation, finding, and recommendation must not change between
touchpoints merely because separate sessions produced them.

Do not optimize one screen at the expense of the lifecycle. A higher-converting
claim is a defect when the report cannot support it or operations cannot deliver
it.

## 3. Fixed boundaries

The artifact workflow inherits the settled v2 decisions. In particular:

- the first wedge is one single-location dental clinic;
- the first public cohort uses one city, still to be selected;
- the public founding offer is one Rp149,000 Full Audit;
- identity and eligibility are confirmed before checkout;
- the personalized audit starts after verified payment;
- launch measurement uses OpenAI web search and Gemini Google Search grounding;
- API observations are not represented as personalized consumer interfaces;
- the first ten reports have no composite score;
- the web report and PDF share one reviewed report version;
- no account is required; access is recoverable and revocable; and
- aftersales and action completion are part of the product.

### 3.1 Pre-payment proof boundary

The artifact formerly described as a “teaser” is called **pre-payment proof**.
It may contain:

- the resolved public clinic identity for customer confirmation;
- a real, dated category-and-city market observation;
- a permissioned sample report;
- a clearly labeled illustrative report section; and
- examples of the evidence and recommendation format.

It must not contain a fabricated personalized score, invented competitor gap,
fake analysis progress, or a claim that the selected clinic has already been
audited. The identity lookup is not a free personalized audit.

## 4. Phase model

Only [`ARTIFACT_STATUS.md`](./ARTIFACT_STATUS.md) declares the current phase.
A phase advances when its exit gate passes, not merely when files exist.

| Phase | Objective | Required outputs | Exit gate |
|---|---|---|---|
| P0 — Workflow setup | Establish instructions, tracking, directories, and templates | This workflow, status tracker, artifact index, artifact brief | Future sessions can locate current state and next task without chat history |
| P1 — Journey contract | Freeze one coherent working journey and shared facts | Journey map, message contract, shared fixture, initial traceability matrix | Every touchpoint uses one customer, city hypothesis, promise, offer, and evidence vocabulary |
| P2 — Acquisition and landing | Show how the right clinic discovers and understands Nuave | Initial ad concepts, organic content set, landing-page content contract and grayscale wireframe | Message, proof, CTA, vertical, and city remain matched from impression to landing |
| P3 — Eligibility and purchase | Design the pre-payment conversion path | Clinic lookup, eligibility outcomes, pre-payment proof, offer, checkout, abandonment and error states | Wrong or unsupported clinics cannot buy; payment promise matches the product |
| P4 — Intake and fulfillment | Design the post-payment handoff into delivery | Brief, recovery, status, clarification, delay, partial, failure, and delivery states | Optional context does not block fulfillment; every status is backed by a real system state |
| P5 — Product and action | Make the paid audit understandable and actionable | Report summary, evidence views, findings, recommendations, PDF behavior, feedback, action selection | Claims trace to the fixture; a clinic owner can identify and choose a realistic next action |
| P6 — Aftersales | Complete the service lifecycle | Delivery, Day 2, Day 7, completion check, support/correction, referral, and re-audit artifacts | Messages respect consent and state; completion is not misrepresented as caused visibility improvement |
| P7 — Integration and validation | Connect and test the complete low-fidelity journey | Clickable prototype, scenario coverage, test script, findings, revisions, and decision record | Representative users understand the offer, evidence, limitations, and next action without founder explanation |

Production visual design is a later decision. P7 completion does not silently
authorize a high-fidelity build or a change to the MVP.

## 5. Fidelity ladder

Within each phase, advance artifacts through these levels:

1. **L0 — Content contract:** customer question, required content, proof, action,
   state, events, and constraints.
2. **L1 — Grayscale artifact:** information hierarchy, copy direction, controls,
   mobile order, and important states.
3. **L2 — Connected prototype:** touchpoints linked using the same fixture and
   truthful transitions.
4. **L3 — Tested revision:** changed in response to recorded comprehension,
   trust, usability, and objection evidence.
5. **L4 — Visual design:** brand expression and production-ready responsive
   behavior after the integrated low-fidelity journey passes P7.

Do not skip directly to L4. A polished artifact does not compensate for a weak
promise, unsupported proof, or broken downstream state.

## 6. Context-loading rules

Every artifact session reads:

1. [`README.md`](./README.md) for v2 authority;
2. this workflow;
3. [`ARTIFACT_STATUS.md`](./ARTIFACT_STATUS.md) for current state and exact next
   task;
4. only the specialist documents listed for the active phase; and
5. the upstream artifacts and shared fixture needed for the task.

| Phase | Minimum specialist context |
|---|---|
| P1 | `FOUNDATION.md`, `MVP_SPEC.md`, relevant journey sections of `FUNNEL_AND_LIFECYCLE.md` |
| P2 | `FOUNDATION.md`, `FUNNEL_AND_LIFECYCLE.md`, acquisition sections of `COMPLIANCE_AND_DATA.md` |
| P3 | `MVP_SPEC.md`, `FUNNEL_AND_LIFECYCLE.md`, relevant payment/data sections of `COMPLIANCE_AND_DATA.md` |
| P4 | `MVP_SPEC.md`, `OPERATIONS_RUNBOOK.md`, relevant states in `TECHNICAL_ARCHITECTURE.md` |
| P5 | `MVP_SPEC.md`, `MEASUREMENT_SPEC.md`, report QA sections of `OPERATIONS_RUNBOOK.md` |
| P6 | `FUNNEL_AND_LIFECYCLE.md`, `OPERATIONS_RUNBOOK.md`, consent sections of `COMPLIANCE_AND_DATA.md` |
| P7 | Current artifact set first; load specialist documents only for defects under review |

Do not load all v2 documents by default. The repository is the memory layer;
chat history is disposable working space.

## 7. Session protocol

Each AI session must:

1. state the active phase and bounded deliverable;
2. verify the tracker rather than infer progress from existing filenames;
3. use the shared fixture and upstream contracts without silently rewriting them;
4. label new assumptions as `[HYPOTHESIS]` or `[OPEN]`;
5. create or update artifacts using
   [`artifacts/templates/ARTIFACT_BRIEF.md`](../../artifacts/templates/ARTIFACT_BRIEF.md);
6. test the artifact against its upstream promise, downstream state, proof,
   compliance, mobile hierarchy, and failure paths;
7. update the artifact manifest and live tracker in the same change;
8. record cross-cutting strategy decisions in `DECISION_LOG.md`; and
9. end with one explicit next task that a fresh session can execute.

Start a new session when the bounded deliverable is complete or the active
phase changes. Do not preserve a thread merely for conversational continuity.

## 8. Parallel-agent rules

Parallel work begins only after P1 has a shared journey contract and fixture.

- One lead owns integration and tracker updates.
- Assign non-overlapping file ownership and bounded outputs.
- Agents may explore alternatives but may not independently settle strategy.
- Copy, UX/state, and truth/compliance reviews may run in parallel against the
  same brief.
- Every agent writes durable output to the repository; chat summaries are not
  the source of truth.
- The lead reconciles message, identity, fixture, state, and terminology before
  a phase is marked complete.

## 9. Artifact acceptance questions

Every artifact must answer yes to the applicable questions:

- Does it serve the active dental-clinic wedge and selected working city?
- Does it preserve the upstream message and set an honest downstream expectation?
- Is every proof element real, permissioned, dated, or visibly illustrative?
- Does it distinguish observation, Nuave inference, and recommended action?
- Does it avoid personalized-consumer-interface, ranking, causation, or outcome guarantees?
- Is the primary action clear on mobile?
- Are loading, empty, ambiguous, delayed, partial, failed, correction, and
  recovery states addressed when relevant?
- Can required analytics events be recorded without tokens or sensitive data?
- Does it use the shared fixture and current artifact version?
- Is the next touchpoint able to fulfill what this artifact promises?

## 10. Change control

Use the artifact tracker for local progress and artifact-specific revisions.
Use `DECISION_LOG.md` when an artifact proposes a change to product strategy,
offer, measurement, public claim, scope, lifecycle, or architecture.

If an artifact reveals a conflict with a settled decision, do not make the
artifact silently authoritative. Mark the conflict, stop the dependent work,
and request a founder decision. After approval, update the decision log and all
affected artifacts together.
