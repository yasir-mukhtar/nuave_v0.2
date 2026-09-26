# Nuave document index

> Status: **Canonical repository map**
> Updated: 2026-09-26

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

| Document                               | Governs                                                                                 | Status                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| [`VISION.md`](./VISION.md)             | Why Nuave exists and the principles all downstream work follows                         | Canonical                               |
| [`PRODUCT.md`](./PRODUCT.md)           | Current customer, offer, promise, journey, scope, and success signals                   | Canonical                               |
| [`AUDIT.md`](./AUDIT.md)               | Measurement, evidence, report, and data-handling method                                 | Canonical                               |
| [`VOICE.md`](./VOICE.md)               | Indonesian writing contract for questions, reports, and customer copy                   | Canonical (founder-approved 2026-08-17) |
| [`NOW.md`](./NOW.md)                   | Current objective, deployment state, facts, blockers, and next action                   | Current operating state                 |
| [`DESIGN.md`](./DESIGN.md)             | Current UI stack, visual language, interaction, accessibility, and component boundaries | Canonical current design authority      |
| [`DECISION_LOG.md`](./DECISION_LOG.md) | Dated material founder decisions and superseded directions                              | Canonical history                       |
| [`WORKFLOW.md`](./WORKFLOW.md)         | Document creation, specifications, worker handoffs, and verification                    | Canonical working method                |

## Current development plan

| Document                                                         | Governs                                                                                                                            | Status                                                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md)                     | Thin v2 journey, integration sequence, quality gates, and launch readiness                                                         | Founder-approved direction; each implementation phase still requires an approved spec     |
| [`V1_PRODUCT_CONTRACT.md`](./V1_PRODUCT_CONTRACT.md)             | Locked V1 product hypothesis: intake correction loop, the 6 unbranded + 4 branded question structure, and required report outcomes | Locked product hypothesis (filed 2026-08-29); reconciled with Spec 007                    |
| [`JOURNEY_CONTRACT.md`](./JOURNEY_CONTRACT.md)                   | Cross-module sequence, state ownership, handoffs, email ownership, and phase boundaries                                            | Current founder-approved product contract; implementation still requires an approved spec |
| [`PROMPT_GENERATION_CONTEXT.md`](./PROMPT_GENERATION_CONTEXT.md) | Universal brand context for building one ten-question pack                                                                         | Working product context                                                                   |

## Latest progress checkpoint

[`NUAVE-LIVE-REPORT-2026-09-19`](./checkpoints/2026-09-19-live-direct-ten-report/CHECKPOINT.md)
preserves the accepted direct-ten questions reaching a real audit and report,
founder feedback on progress and pace, private evidence locations, remaining
limits and the next smallest action. Use it to resume without repeating the
completed work. It is a dated record, not a new implementation authorization.

## Question-generation checkpoint

For question-generation work, first read the dated
[`NUAVE-PROMPTS-2026-09-17` checkpoint](./checkpoints/2026-09-17-winning-prompt-glm/CHECKPOINT.md).
It preserves the winning source, tested request, captured questions, founder
feedback and next drafting task. It records settled direction and evidence;
it does not replace the authority chain or approve implementation.

## Touchpoint plans

[`journey/`](./journey/) holds the working product plan for each customer
touchpoint, in customer order. These are detailed behavior plans, not approved
specifications — implementation still requires a spec.

| Plan                                                             | Touchpoint                     |
| ---------------------------------------------------------------- | ------------------------------ |
| [`journey/00-overview.md`](./journey/00-overview.md)             | The whole sequence at a glance |
| [`journey/01-order-preview.md`](./journey/01-order-preview.md)   | Order Preview                  |
| [`journey/02-payment.md`](./journey/02-payment.md)               | Payment                        |
| [`journey/03-business-facts.md`](./journey/03-business-facts.md) | Business Facts                 |
| [`journey/04-questions.md`](./journey/04-questions.md)           | Questions                      |
| [`journey/05-audit-run.md`](./journey/05-audit-run.md)           | Audit Run                      |
| [`journey/06-audit-report.md`](./journey/06-audit-report.md)     | Audit Report                   |

## Customer-facing content

[`content/`](./content/) holds copy sources, not implementation. The published
pages live in `src/`.

| Document                                                                                   | Holds                                                     |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [`content/landing-copy.md`](./content/landing-copy.md)                                     | Working landing copy source                               |
| [`content/order-preview-copy.md`](./content/order-preview-copy.md)                         | Order Preview page copy and section order                 |
| [`content/audit-report-sample-wip.md`](./content/audit-report-sample-wip.md)               | Founder-edited report sample, work in progress            |
| [`content/WEBSITE_STRUCTURE_CONTENT_PLAN.md`](./content/WEBSITE_STRUCTURE_CONTENT_PLAN.md) | Site structure, routes, and legal/compliance content plan |
| [`content/website/`](./content/website/)                                                   | `FAQ`, `TERMS`, `PRIVACY`, and `SUPPORT` page copy        |

## Working documents

| Directory                                  | Holds                                                       | Rule                                                                        |
| ------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`briefs/`](./briefs/)                     | Decision-session prompts and implementation briefs          | A brief is an input to a decision or a fix, never an approved specification |
| [`drafts/`](./drafts/)                     | Unapproved candidate documents and plans                    | Do not implement from a draft                                               |
| [`reviews/prompts/`](./reviews/prompts/)   | Adversarial-review and fix prompts, one per phase           | Reusable inputs                                                             |
| [`reviews/findings/`](./reviews/findings/) | What each review actually found                             | Evidence of a completed review, not standing instructions                   |
| [`templates/`](./templates/)               | `SPEC`, `VERIFICATION`, and `WORKER_PROMPT` starting points | Copy, do not edit in place                                                  |

Future Module 07 access-mechanism work starts from
[`briefs/REPORT_ACCESS_RECOVERY.md`](./briefs/REPORT_ACCESS_RECOVERY.md). It is a
decision-session prompt, not an approved implementation specification.

## Guidance documents not yet written

Create these only when their decisions are needed:

| Document      | Purpose                                                                     | When needed                    |
| ------------- | --------------------------------------------------------------------------- | ------------------------------ |
| `docs/GTM.md` | Target segment, positioning, acquisition, offer testing, and evidence rules | Before outreach or launch work |

## Specifications

**Current report specification:** [Spec 012 — Evidence-first AI Visibility
Report](../specs/012-evidence-first-report/SPEC.md) is **Verified with
founder-approved exception (AC-18)** on 2026-09-26 after independent closeout
PASS. Original approval followed [review 1](../specs/012-evidence-first-report/SPEC_REVIEW_1.md)
on 2026-09-22.
Both files are restored from the pinned approval commit `9c5d4c0`. A, B1 and B2
are merged and deployed: PR #74 (`d08b9e9`), [PR #80](https://github.com/yasir-mukhtar/nuave_v0.2/pull/80)
(`d93ec82`; [B1 acceptance](../specs/012-evidence-first-report/B1_ACCEPTANCE.md)) and
[PR #81](https://github.com/yasir-mukhtar/nuave_v0.2/pull/81) (`d45a944`;
[B2 acceptance](../specs/012-evidence-first-report/B2_ACCEPTANCE.md), with its
[independent review](../specs/012-evidence-first-report/B2_IMPLEMENTATION_REVIEW.md)
and [visual/PDF follow-up](../specs/012-evidence-first-report/B2_VISUAL_VERIFICATION_RESULT.md)).
The founder [accepted the current report for now](./DECISION_LOG.md#2026-09-26--accept-the-current-report-for-now-and-defer-formatting-improvements)
and deferred format and reference-clutter improvements. The original AC-18
real-evidence comparison is unperformed and deferred. The documentation-only
[combined closeout candidate](../specs/012-evidence-first-report/CLOSEOUT_RESULT.md)
maps AC-01–AC-19 in [VERIFICATION.md](../specs/012-evidence-first-report/VERIFICATION.md).
Independent review passed; the [orchestrator acceptance](../specs/012-evidence-first-report/CLOSEOUT_ACCEPTANCE.md)
records Verified with the AC-18 exception. Next is publication of the
documentation-only package under separate founder authorization.

The [privacy-screen follow-up R3](../specs/011-smart-consultant-intake/PRIVACY_SCREEN_FOLLOWUP_PLAN.md)
was released through PR #79 as `8907d96`, after Spec 011 PR #78 as `7f34d69`.
Both releases passed main CI and deployment. Existing acceptance stays closed.
The integration sequence below is retained historical context.

The isolated [main integration candidate](../specs/011-smart-consultant-intake/MAIN_INTEGRATION_RESULT.md)
combines verified Spec 011 with merged Spec 012 PR A and the later intake/navigation
fixes. Independent integration review passed before the PR #78 release; it did not
mark all of Spec 012 Verified. PR #77 fixed the old contents-anchor defect;
header labels/order and printed URL tails remain separate report work. The
[PR A record](../specs/012-evidence-first-report/VERIFICATION.md) retains its dated
scope; B1 and B2 were later released, and the report documentation promotion
is reconciled in the closeout candidate above.

**Current bounded implementation:** [Spec 011](../specs/011-smart-consultant-intake/SPEC.md)
is **Verified** (2026-09-24) on preserved `2a21f85` plus the reviewed 316-file
product manifest for the prepared summary and truthful new-session report/export
boundary. Its 2026-09-22 amendment accepts the Cross-cutting sizing result and
historical output/retry hold; the pre-code gates are complete. The
[implementation handoff](../specs/011-smart-consultant-intake/IMPLEMENTATION_PROMPT.md)
records the implemented scope. The F-03 diagnostic has independent PASS and its
live allowance is consumed. The founder approved the
[bounded product correction](../specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_SCOPE.md)
on 2026-09-23. Its [independent re-review](../specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_REVIEW_2.md)
now passes the bounded offline correction. The separately authorized
[founder walkthrough](../specs/011-smart-consultant-intake/F03_FOUNDER_WALKTHROUGH.md)
has completed one preparation and stopped before confirmation. The founder's
earlier 2026-09-24 review accepted everything except lacking completeness. The
[completeness review](../specs/011-smart-consultant-intake/F03_COMPLETENESS_REVIEW.md)
confirmed the required/optional behavior; source support for reach was required
before a code correction could be justified. The reviewed
[source-support result](../specs/011-smart-consultant-intake/F03_SOURCE_SUPPORT_RESULT.md)
finds aspirational homepage text retained by selection, with no code fix justified
by that check. The founder subsequently supplied an official outlets page;
[its reading](../specs/011-smart-consultant-intake/ACCEPTANCE_EVIDENCE.md#2026-09-24-founder-supplied-official-outlets-source)
establishes published multi-city outlet evidence. The
[location-source package](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL.md)
was revised after the [orchestrator REVISE](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL_REVIEW.md)
and the founder's [broad-presence decision](./DECISION_LOG.md#2026-09-24--whole-brand-reach-means-broad-business-presence).
The founder then [approved offline implementation](./DECISION_LOG.md#2026-09-24--approve-the-f-03-location-source-implementation),
including the stated regional limit. Its implementation now has
[independent offline PASS](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_REVIEW.md)
on the explicitly preserved baseline `2a21f85`; main integration is separate.
The subsequently authorized [one-Periksa walkthrough](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_WALKTHROUGH_RESULT.md)
populated national reach and enabled confirmation without retry. It stopped
before confirmation. The founder then accepted the reach and prepared summary.
The [acceptance closeout review](../specs/011-smart-consultant-intake/ACCEPTANCE_CLOSEOUT_REVIEW.md)
passes AC-00 through AC-08 with its stated limits retained. The combined main
candidate has [independent integration PASS](../specs/011-smart-consultant-intake/MAIN_INTEGRATION_REVIEW.md)
and was released through PR #78 (`7f34d69`).
Do not repeat the founder question or infer another live-test gate.
Neither meaning nor implementation approval needs repeating.
Target customer remains optional. Follow `NOW.md`; do not rerun preparation,
the consumed source check, the diagnostic or the completed excerpt-correction
handoff. The latest walkthrough allowance is also consumed; no further live
work is authorized. Accounted cost is USD 1.06241155 of 5.
F-03/AC-07 are closed; F-01 remains closed. Spec 011 is Verified for the preserved
working tree, with no further acceptance review gate remaining.
Specs 009/010 remain the protected question, observation, measurement, and report-
layout foundation except for this explicit context/historical amendment.
Report usefulness redesign and legacy-only removal remain deferred.

[`WORKFLOW.md`](./WORKFLOW.md) defines document creation, specifications,
worker delegation, and verification. [`../specs/README.md`](../specs/README.md)
defines the specification lifecycle.

Each specification lives at `specs/NNN-short-name/SPEC.md` and lists the exact
context an agent must read. Do not implement a draft specification.

| Package                                                                                                               | Outcome                                                                                                                                               | Status                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`011-smart-consultant-intake`](../specs/011-smart-consultant-intake/SPEC.md) | One prepared summary and truthful confirmed context through reports/downloads; preserved old records with output/retry held | Verified (2026-09-24), preserved `2a21f85` working tree plus reviewed 316-file manifest; main integration and PR/release readiness separate |
| [`001-simulated-journey-shell`](../specs/001-simulated-journey-shell/SPEC.md)                                         | Fixture-backed landing-to-report preview with unmistakably simulated checkout                                                                         | Verified (2026-08-17); realigned by Spec 002                                                                                                                                                                                                  |
| [`002-indonesian-audit-contract`](../specs/002-indonesian-audit-contract/SPEC.md)                                     | Indonesian audit and report contracts, journey realigned to the canonical sequence                                                                    | Verified (2026-08-17)                                                                                                                                                                                                                         |
| [`003-live-report-quality-gate`](../specs/003-live-report-quality-gate/SPEC.md)                                       | Live engine connected, first real Indonesian report, report-quality gate verdict                                                                      | Approved; report quality unmet/deferred while Spec 009 completes the local audit flow                                                                                                                                                                                            |
| [`004-source-hero-intake`](../specs/004-source-hero-intake/SPEC.md)                                                   | One-field website/Instagram hero intake with scan transition, replacing the audit tool's step-0 form                                                  | Superseded by Spec 007                                                                                                                                                                                                                        |
| [`006-product-wide-polish`](../specs/006-product-wide-polish/SPEC.md)                                                 | Product-wide design and copy pass (calm instrument): foundation, landing, and the six remaining screens                                               | Historical/partially implemented context; its visual-stack direction is superseded by [`DESIGN.md`](./DESIGN.md)                                                                                                                              |
| [`007-intake-airbnb-revamp`](../specs/007-intake-airbnb-revamp/SPEC.md)                                               | Runnable V1 journey: canonical 6/4 measurement matrix, workflow/data authority, safe source handling, payment boundary, and end-to-end acceptance     | Approved (founder-approved 2026-08-30); lettered packages and R-27 intake recovery merged; intake-experience rebuild unmerged (draft PRs #58, #60)                                                                                            |
| [`008-recommendation-eligible-question-generation`](../specs/008-recommendation-eligible-question-generation/SPEC.md) | Recommendation-eligible semantic target for generated questions: natural Indonesian consumer decisions with genuine entity-recommendation opportunity | Approved (founder-approved 2026-09-11); execution authority is [`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`](../specs/008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md), whose ledger owns gate status |

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

| Task                                    | Read first                                             | Then read                                                                                                           |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Orient to current work                  | `AGENTS.md`, `README.md`, `docs/NOW.md`                | The active spec named by `NOW.md`                                                                                   |
| Draft a canonical document              | `AGENTS.md`, its document brief                        | Only the sources listed in the brief                                                                                |
| Implement a capability                  | `AGENTS.md`, approved `SPEC.md`                        | Only the spec's required context and relevant code                                                                  |
| Verify implementation                   | `AGENTS.md`, approved `SPEC.md`, verification template | The diff, relevant code, and test output                                                                            |
| Make a product decision                 | `VISION.md`, `PRODUCT.md`                              | Relevant evidence and decision-log entries                                                                          |
| Work on audit logic                     | `AUDIT.md`, active spec                                | Referenced audit code and tests                                                                                     |
| Work on one touchpoint                  | `JOURNEY_CONTRACT.md`, the matching `journey/` plan    | The active spec and referenced code                                                                                 |
| Write customer-facing copy              | `VOICE.md`, the matching `content/` source             | `PRODUCT.md` for claim boundaries                                                                                   |
| Work on a design or presentation change | `AGENTS.md`, `docs/DESIGN.md`                          | The owning product, journey, voice, audit, or approved-spec contract for any behavior or meaning the change touches |
