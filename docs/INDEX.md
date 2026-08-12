# Nuave document index

> Status: **Canonical repository map**
> Updated: 2026-08-12

Use this page to decide what to read. Do not load every document by default.
The active task or specification should name its required context.

## Authority

When documents conflict, use this order:

1. the newest founder-approved decision in [`DECISION_LOG.md`](./DECISION_LOG.md);
2. [`VISION.md`](./VISION.md) for enduring purpose, customer, promise,
   principles, and boundaries;
3. [`PRODUCT.md`](./PRODUCT.md) for the current offer, journey, scope, and
   success signals;
4. the relevant domain guide, such as [`AUDIT.md`](./AUDIT.md);
5. the approved specification for the bounded capability; and
6. implementation and tests.

[`NOW.md`](./NOW.md) identifies the current objective and next action. It does
not override product truth. A new settled decision should be reflected in the
affected canonical document in the same change whenever practical, so the
decision log does not become a permanent hidden override.

## Canonical product documents

| Document | Governs | Status |
|---|---|---|
| [`VISION.md`](./VISION.md) | Why Nuave exists and the principles all downstream work follows | Canonical |
| [`PRODUCT.md`](./PRODUCT.md) | Current customer, offer, promise, journey, scope, and success signals | Aligned with the canonical vision on 2026-08-12 |
| [`AUDIT.md`](./AUDIT.md) | Measurement, evidence, report, and data-handling method | Aligned with the canonical vision on 2026-08-09 |
| [`NOW.md`](./NOW.md) | Current objective, facts, blockers, and next action | Current operating state |
| [`DECISION_LOG.md`](./DECISION_LOG.md) | Dated material founder decisions and superseded directions | Canonical history |

## Current development plan

| Document | Governs | Status |
|---|---|---|
| [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md) | Thin v2 journey, integration sequence, quality gates, and launch readiness | Founder-approved direction; each implementation phase still requires an approved spec |

## Guidance documents

Create these only when their decisions are needed:

| Document | Purpose | When needed |
|---|---|---|
| `docs/VOICE.md` | Natural Indonesian customer language, terminology, and writing rules | Before finalizing Indonesian questions, reports, and customer copy |
| `docs/DESIGN.md` | Product experience, interaction, accessibility, and visual principles | Before the product-wide design pass |
| `docs/GTM.md` | Target segment, positioning, acquisition, offer testing, and evidence rules | Before outreach or launch work |

No canonical `docs/DESIGN.md` exists yet. The former root [`DESIGN.md`](../archive/design/DESIGN.md)
and dated design studies are archived as historical evidence only until a
founder-approved `docs/DESIGN.md` replaces them as the canonical design guide.

## Specifications

[`WORKFLOW.md`](./WORKFLOW.md) defines document creation, specifications,
worker delegation, and verification. [`../specs/README.md`](../specs/README.md)
defines the specification lifecycle.

Each active specification lives at `specs/NNN-short-name/SPEC.md` and lists the
exact context an agent must read. Do not implement a draft specification.

| Active package | Outcome | Status |
|---|---|---|
| [`001-simulated-journey-shell`](../specs/001-simulated-journey-shell/SPEC.md) | Fixture-backed landing-to-report preview with unmistakably simulated checkout | Implementing |

## Reference and history

- [`../archive/`](../archive/) preserves superseded canonical documents,
  experiments, prototypes, design work, and completed reviews.
- [`../archive/experiments/`](../archive/experiments/) contains archived tests,
  runs, samples, and historical validation material. An experiment is not
  product truth unless a founder-approved decision adopts its result.
- Dated design critiques and revision plans are archived under
  [`../archive/design/`](../archive/design/) as evidence of earlier work, not
  standing instructions.
- [`../archive/prototypes/report-prototype/`](../archive/prototypes/report-prototype/)
  is an archived prototype implementation and reference, not a separate source
  of product requirements.

## Default context by task

| Task | Read first | Then read |
|---|---|---|
| Orient to current work | `AGENTS.md`, `README.md`, `docs/NOW.md` | The active spec named by `NOW.md` |
| Draft a canonical document | `AGENTS.md`, its document brief | Only the sources listed in the brief |
| Implement a capability | `AGENTS.md`, approved `SPEC.md` | Only the spec's required context and relevant code |
| Verify implementation | `AGENTS.md`, approved `SPEC.md`, verification template | The diff, relevant code, and test output |
| Make a product decision | `VISION.md`, `PRODUCT.md` | Relevant evidence and decision-log entries |
| Work on audit logic | `AUDIT.md`, active spec | Referenced audit code and tests |
