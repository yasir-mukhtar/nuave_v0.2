# Nuave v2 artifacts

This directory holds the durable low-fidelity touchpoint artifacts for Nuave
v2. Before changing anything here, read:

1. [`docs/v2/ARTIFACT_STATUS.md`](../docs/v2/ARTIFACT_STATUS.md) for the current
   phase and next exact task;
2. [`docs/v2/ARTIFACT_WORKFLOW.md`](../docs/v2/ARTIFACT_WORKFLOW.md) for phase,
   fidelity, session, and acceptance rules; and
3. the specialist documents assigned to the active phase.

## Working rules

- Build the complete golden path before multiplying variants.
- Use the shared P1 fixture across every touchpoint.
- Start each touchpoint with [`templates/ARTIFACT_BRIEF.md`](./templates/ARTIFACT_BRIEF.md).
- Keep low-fidelity artifacts grayscale and structurally focused until P7.
- Store durable decisions and outputs in files, not only in conversation.
- Update the live tracker and manifest in the same change as an artifact.
- Do not put production secrets, real patient data, or unapproved customer data
  in artifacts or fixtures.

## Planned structure

```text
artifacts/
  README.md
  JOURNEY_MAP.md
  MESSAGE_CONTRACT.md
  TRACEABILITY_MATRIX.md
  fixtures/
    dental-clinic-v0.json
  acquisition/
    ad-concepts.md
    organic-content.md
    landing-page.md
  conversion/
    clinic-lookup.md
    prepayment-proof.md
    checkout.md
  fulfillment/
    postpayment-brief.md
    status-and-recovery.md
  product/
    report.md
    action-selection.md
  lifecycle/
    delivery-and-followups.md
    support-corrections.md
    reaudit-referral.md
  prototypes/
  research/
  templates/
    ARTIFACT_BRIEF.md
```

Create directories only when their phase begins. The planned tree is a routing
map, not authorization to generate empty placeholders or start later phases.
