# Nuave specifications

Specifications convert canonical product direction into bounded,
implementation-ready behavior.

## Structure

Each capability uses a numbered directory:

```text
specs/
  001-short-capability-name/
    SPEC.md
    VERIFICATION.md
```

Copy [`../docs/templates/SPEC.md`](../docs/templates/SPEC.md) when starting a
specification. Add `VERIFICATION.md` from the verification template when
implementation begins.

## Lifecycle

1. **Draft:** the outcome, scope, or decisions are still being developed.
2. **In review:** the candidate is complete enough for contradiction and
   acceptance review.
3. **Approved:** the founder or delegated authority has approved the product
   behavior; implementation may begin.
4. **Implementing:** code is being changed against the approved spec.
5. **Verified:** independent verification passed every required acceptance
   criterion or records an explicit founder-approved exception.
6. **Superseded:** a newer named specification replaces this one.

Do not implement a draft. Do not mark a spec verified because the build passes;
verification is against its acceptance criteria.

## Scope rules

- One spec owns one reviewable user outcome.
- A spec links to parent guidance instead of copying it.
- Requirements use stable IDs; acceptance criteria use stable IDs.
- Non-scope is mandatory to prevent adjacent automation.
- A product conflict returns to the orchestrator and founder.
- An implementation discovery may update an approved spec only through an
  explicit reviewed change.
- The specification package records evidence, not a diary of agent activity.

## Active specifications

- [Spec 012 PR A verification](./012-evidence-first-report/VERIFICATION.md)
  — PR A is merged; PR #77 subsequently fixed report contents navigation.
  Its complete-answer presentation is retained in the Spec 011 integration
  candidate. B1/B2, header labels/order, printed URL-tail work and the report
  documentation-branch promotion remain separate. Whole Spec 012 is not Verified.

- [`011-smart-consultant-intake/SPEC.md`](./011-smart-consultant-intake/SPEC.md)
  — **Verified** (2026-09-24, preserved `2a21f85` plus reviewed 316-file product
  manifest; main integration and PR/release readiness separate): replaces
  the fixed intake questionnaire with one prepared summary, a Nuave-proposed whole-brand
  default, inline focus/service/reach/area choices, clarification only for
  genuinely missing required meanings, and one confirmation before question
  review. Evidence/sizing/boundary gates are complete: **Cross-cutting**, with
  truthful versioned new-session run/report/storage/export context required
  in this implementation. Old v1 records remain unchanged under an approved
  customer-output/provider-retry hold. Defer legacy-only deletion and historical
  reactivation. Observation method, measurement/evidence rules, report
  schema/layout, and cost controls remain protected. The package's completed
  [`IMPLEMENTATION_PROMPT.md`](./011-smart-consultant-intake/IMPLEMENTATION_PROMPT.md)
  records implementation scope. Evidence history: the F-03 diagnostic has
  independent PASS and its live allowance is consumed. The founder approved the
  [bounded product correction](./011-smart-consultant-intake/F03_PRODUCT_CORRECTION_SCOPE.md)
  on 2026-09-23. The [independent re-review](./011-smart-consultant-intake/F03_PRODUCT_CORRECTION_REVIEW_2.md)
  passes the bounded offline correction. The separately authorized
  [founder walkthrough](./011-smart-consultant-intake/F03_FOUNDER_WALKTHROUGH.md)
  completed one preparation and stopped before confirmation. On 2026-09-24 the
  founder found completeness lacking and everything else acceptable.
  The completeness and source-support reviews are complete; historical extraction
  cause remains unresolved. The founder approved the revised
  [location-source instruction package](./011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL.md)
  on 2026-09-24, using broad business presence and the stated regional limit.
  Its [independent review](./011-smart-consultant-intake/F03_LOCATION_SOURCE_REVIEW.md)
  passes the offline correction on preserved baseline `2a21f85`; current-main
  integration is separate. The subsequently authorized
  [preparation-only walkthrough](./011-smart-consultant-intake/F03_LOCATION_SOURCE_WALKTHROUGH_RESULT.md)
  populated reach and enabled confirmation without retry, stopping before
  confirmation. The founder accepted the reach and prepared summary. The
  [acceptance closeout review](./011-smart-consultant-intake/ACCEPTANCE_CLOSEOUT_REVIEW.md)
  passes AC-00 through AC-08, with its stated limits retained. The combined main
  candidate has [independent integration PASS](./011-smart-consultant-intake/MAIN_INTEGRATION_REVIEW.md).
  Its [local PR package](./011-smart-consultant-intake/PR_READINESS.md) is complete;
  publication approval and required CI are next. Do not repeat founder judgment
  or paid preparation. Merge and production release remain separate.
  All live allowances are consumed; accounting is USD 1.06241155 of 5.
  F-03/AC-07 are closed; F-01 remains closed. No further acceptance gate remains
  on this preserved baseline.

- [`010-gated-new-audit-flow/SPEC.md`](./010-gated-new-audit-flow/SPEC.md)
  — **Approved** (2026-09-19, r3): the new direct-ten journey becomes the
  public `/audit` entry on v2.nuave.ai (no login — accepted trial risk); local-only guards
  become deployed configuration; disk-based single-send protection becomes
  Cloudflare rate limits; the old flow is archived. Report usefulness stays
  deferred until this is verified.

- [`009-recommendation-eligible-audit/SPEC.md`](./009-recommendation-eligible-audit/SPEC.md)
  — **Approved** (2026-09-18), current bounded implementation: ten directly
  generated unnamed questions, human editing/approval, grounded execution and
  downloadable report. Supersedes conflicting fixed-slot/6–4 and R5 gate
  requirements for this method; legacy records retain their contracts.
  Two worker blocks (150 / 210 active minutes), with founder question and
  report judgments. No paid call or production activation included.

- [`001-simulated-journey-shell/SPEC.md`](./001-simulated-journey-shell/SPEC.md)
  — status **Verified** (2026-08-17; founder completed the AC-21 human trust
  review). Its fixture journey was later realigned by Spec 002; this package
  remains the verified implementation record of the earlier sequence.
- [`002-indonesian-audit-contract/SPEC.md`](./002-indonesian-audit-contract/SPEC.md)
  — status **Verified** (2026-08-17; founder walkthrough + language sign-off
  completed). Implements Phase 2 of `docs/END_TO_END_PLAN.md`: fixture-journey
  realignment to Order Preview → simulated payment → Business Facts → Questions
  → Audit Run → Report, plus the Indonesian audit and report contracts. The
  next capability is `003-live-report-quality-gate` (Phase 3).
- [`003-live-report-quality-gate/SPEC.md`](./003-live-report-quality-gate/SPEC.md)
  — status **Approved** (founder-approved 2026-08-17); implementation in
  progress. Implements Phase 3 of `docs/END_TO_END_PLAN.md`: connect the live
  engine behind the journey states (03 → 06), five-business provider
  evaluation (dental clinics, Depok), first live audit (Sozo Dental
  Depok/Margonda), and the report-quality gate verdict.
- [`004-source-hero-intake/SPEC.md`](./004-source-hero-intake/SPEC.md)
  — status **Superseded** by Spec 007 (founder-approved 2026-08-30 for the
  authority transition). Its historical hero-intake specification is retained,
  but Spec 007 owns the runnable V1 intake/customer journey.
- [`006-product-wide-polish/SPEC.md`](./006-product-wide-polish/SPEC.md)
  — status **Implementing** (founder-approved 2026-08-20). Phase 6 design and
  copy pass (calm instrument). Wave 1 verified 2026-08-20: P0 foundation and
  P1 landing (see its `VERIFICATION.md`). Wave 2 (P2–P7) is gated on the
  report-quality gate per the package's `EXECUTION_PLAN.md`.
- [`007-intake-airbnb-revamp/SPEC.md`](./007-intake-airbnb-revamp/SPEC.md)
  — status **Approved** (founder-approved 2026-08-30); implementation in
  progress. The runnable V1 journey end to end with real business data:
  canonical measurement matrix (6 unnamed + 4 named), workflow and data
  authority, the simulated-payment boundary, safe source handling, and the
  end-to-end acceptance run. All lettered packages (A1–A4, B1, C1, D1, E1) and
  the R-27 intake-recovery tranche are merged — the package's
  [`EXECUTION_PLAN.md`](./007-intake-airbnb-revamp/EXECUTION_PLAN.md) ledger
  records each landing. The intake-experience rebuild continues unmerged on
  draft PRs #58 and #60.
- [`008-recommendation-eligible-question-generation/SPEC.md`](./008-recommendation-eligible-question-generation/SPEC.md)
  — status **Approved** (founder-approved 2026-09-11). The semantic target
  for generated questions: natural Indonesian consumer decisions with genuine
  entity-recommendation opportunity. Execution authority is
  [`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`](./008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md)
  (adopted 2026-09-11); the package's older `EXECUTION_PLAN.md` is superseded
  and now only redirects to R5. Gate **G0 (baseline reconciliation) is
  complete** — merged via PRs #48 and #50 — and G1 is dependency-ready; a
  dormant facts/context adapter exists on unmerged draft PR #59. The R5 gate
  sequence continues from the package ledger; paid provider evaluation gates
  still require their own explicit authorization.

[`../docs/NOW.md`](../docs/NOW.md) names the current outcome and next action. If
no active spec is named, the next task is to prepare or approve one rather than
begin broad implementation.
