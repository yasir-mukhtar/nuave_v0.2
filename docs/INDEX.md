# Nuave document index

> Status: **Canonical repository map**
> Updated: 2026-08-19

Use this page to decide what to read. Do not load every document by default.
The active task or specification should name its required context.

## Authority

When documents conflict, use this order:

1. the newest founder-approved decision in [`DECISION_LOG.md`](./DECISION_LOG.md);
2. [`VISION.md`](./VISION.md) for enduring purpose, customer, promise,
   principles, and boundaries;
3. [`PRODUCT.md`](./PRODUCT.md) for the current offer, journey, scope, and
   success signals;
4. the relevant domain guide, such as [`AUDIT.md`](./AUDIT.md) or
   [`VOICE.md`](./VOICE.md);
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
| [`PRODUCT.md`](./PRODUCT.md) | Current customer, offer, promise, journey, scope, and success signals | Canonical |
| [`AUDIT.md`](./AUDIT.md) | Measurement, evidence, report, and data-handling method | Canonical |
| [`VOICE.md`](./VOICE.md) | Indonesian writing contract for questions, reports, and customer copy | Canonical (founder-approved 2026-08-17) |
| [`NOW.md`](./NOW.md) | Current objective, deployment state, facts, blockers, and next action | Current operating state |
| [`DECISION_LOG.md`](./DECISION_LOG.md) | Dated material founder decisions and superseded directions | Canonical history |
| [`WORKFLOW.md`](./WORKFLOW.md) | Document creation, specifications, worker handoffs, and verification | Canonical working method |

## Current development plan

| Document | Governs | Status |
|---|---|---|
| [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md) | Thin v2 journey, integration sequence, quality gates, and launch readiness | Founder-approved direction; each implementation phase still requires an approved spec |
| [`JOURNEY_CONTRACT.md`](./JOURNEY_CONTRACT.md) | Cross-module sequence, state ownership, handoffs, email ownership, and phase boundaries | Current founder-approved product contract; implementation still requires an approved spec |
| [`PROMPT_GENERATION_CONTEXT.md`](./PROMPT_GENERATION_CONTEXT.md) | Universal brand context for building one ten-question pack | Working product context |

## Touchpoint plans

[`journey/`](./journey/) holds the working product plan for each customer
touchpoint, in customer order. These are detailed behavior plans, not approved
specifications — implementation still requires a spec.

| Plan | Touchpoint |
|---|---|
| [`journey/00-overview.md`](./journey/00-overview.md) | The whole sequence at a glance |
| [`journey/01-order-preview.md`](./journey/01-order-preview.md) | Order Preview |
| [`journey/02-payment.md`](./journey/02-payment.md) | Payment |
| [`journey/03-business-facts.md`](./journey/03-business-facts.md) | Business Facts |
| [`journey/04-questions.md`](./journey/04-questions.md) | Questions |
| [`journey/05-audit-run.md`](./journey/05-audit-run.md) | Audit Run |
| [`journey/06-audit-report.md`](./journey/06-audit-report.md) | Audit Report |

## Customer-facing content

[`content/`](./content/) holds copy sources, not implementation. The published
pages live in `src/`.

| Document | Holds |
|---|---|
| [`content/landing-copy.md`](./content/landing-copy.md) | Working landing copy source |
| [`content/order-preview-copy.md`](./content/order-preview-copy.md) | Order Preview page copy and section order |
| [`content/audit-report-sample-wip.md`](./content/audit-report-sample-wip.md) | Founder-edited report sample, work in progress |
| [`content/WEBSITE_STRUCTURE_CONTENT_PLAN.md`](./content/WEBSITE_STRUCTURE_CONTENT_PLAN.md) | Site structure, routes, and legal/compliance content plan |
| [`content/website/`](./content/website/) | `FAQ`, `TERMS`, `PRIVACY`, and `SUPPORT` page copy |

## Working documents

| Directory | Holds | Rule |
|---|---|---|
| [`briefs/`](./briefs/) | Decision-session prompts and implementation briefs | A brief is an input to a decision or a fix, never an approved specification |
| [`drafts/`](./drafts/) | Unapproved candidate documents and plans | Do not implement from a draft |
| [`reviews/prompts/`](./reviews/prompts/) | Adversarial-review and fix prompts, one per phase | Reusable inputs |
| [`reviews/findings/`](./reviews/findings/) | What each review actually found | Evidence of a completed review, not standing instructions |
| [`templates/`](./templates/) | `SPEC`, `VERIFICATION`, and `WORKER_PROMPT` starting points | Copy, do not edit in place |

Future Module 07 access-mechanism work starts from
[`briefs/REPORT_ACCESS_RECOVERY.md`](./briefs/REPORT_ACCESS_RECOVERY.md). It is a
decision-session prompt, not an approved implementation specification.

## Guidance documents not yet written

Create these only when their decisions are needed:

| Document | Purpose | When needed |
|---|---|---|
| `docs/DESIGN.md` | Product experience, interaction, accessibility, and visual principles | Before the product-wide design pass |
| `docs/GTM.md` | Target segment, positioning, acquisition, offer testing, and evidence rules | Before outreach or launch work |

No canonical `docs/DESIGN.md` exists yet. The former root [`DESIGN.md`](../archive/design/DESIGN.md)
and dated design studies are archived as historical evidence only until a
founder-approved `docs/DESIGN.md` replaces them as the canonical design guide.

## Specifications

[`WORKFLOW.md`](./WORKFLOW.md) defines document creation, specifications,
worker delegation, and verification. [`../specs/README.md`](../specs/README.md)
defines the specification lifecycle.

Each specification lives at `specs/NNN-short-name/SPEC.md` and lists the exact
context an agent must read. Do not implement a draft specification.

| Package | Outcome | Status |
|---|---|---|
| [`001-simulated-journey-shell`](../specs/001-simulated-journey-shell/SPEC.md) | Fixture-backed landing-to-report preview with unmistakably simulated checkout | Verified (2026-08-17); realigned by Spec 002 |
| [`002-indonesian-audit-contract`](../specs/002-indonesian-audit-contract/SPEC.md) | Indonesian audit and report contracts, journey realigned to the canonical sequence | Verified (2026-08-17) |
| [`003-live-report-quality-gate`](../specs/003-live-report-quality-gate/SPEC.md) | Live engine connected, first real Indonesian report, report-quality gate verdict | Approved; implementing — **the current objective** |

## Reference and history

- [`../archive/`](../archive/) preserves superseded canonical documents,
  experiments, prototypes, design work, and completed reviews. Do not read it
  unless a task names a specific archived path.
- [`../Archive Candidates/`](../Archive%20Candidates/) is a staging area for
  material that looks superseded or completed but has not yet been folded into
  `archive/`. Its [`README.md`](../Archive%20Candidates/README.md) records where
  each item came from and which decision it is waiting on. Nothing there is
  authoritative or active.
- An experiment, prototype, or archived plan is not product truth unless a
  founder-approved decision adopts its result.

## Default context by task

| Task | Read first | Then read |
|---|---|---|
| Orient to current work | `AGENTS.md`, `README.md`, `docs/NOW.md` | The active spec named by `NOW.md` |
| Draft a canonical document | `AGENTS.md`, its document brief | Only the sources listed in the brief |
| Implement a capability | `AGENTS.md`, approved `SPEC.md` | Only the spec's required context and relevant code |
| Verify implementation | `AGENTS.md`, approved `SPEC.md`, verification template | The diff, relevant code, and test output |
| Make a product decision | `VISION.md`, `PRODUCT.md` | Relevant evidence and decision-log entries |
| Work on audit logic | `AUDIT.md`, active spec | Referenced audit code and tests |
| Work on one touchpoint | `JOURNEY_CONTRACT.md`, the matching `journey/` plan | The active spec and referenced code |
| Write customer-facing copy | `VOICE.md`, the matching `content/` source | `PRODUCT.md` for claim boundaries |
