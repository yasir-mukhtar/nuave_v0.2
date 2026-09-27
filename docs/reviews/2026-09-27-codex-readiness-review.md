# Codex Readiness Review — Gaps to Serving Paying Customers

> **Author:** Codex, acting as an external business and technical reviewer
> **Date:** 2026-09-27
> **Baseline:** local checkout at `3c07495` (after PR #90)
> **Status:** advisory and non-authoritative. This review does not override approved product decisions, specifications, or `docs/NOW.md`. Recommendations that change the approved sequence require a founder decision.
> **Scope:** repository documents, acceptance records, recent Git history, and selected implementation. No fresh test suite, live provider call, or deployment verification was performed for this review.

## Assessment

**Nuave has a working audit engine, but it is not yet ready to reliably accept and fulfil paid customer orders.** The next major step is dependable delivery and commercial readiness, rather than another report redesign.

There are two different gaps: whether Nuave can fulfil the purchase reliably, and whether customers value the result enough to buy it.

## Gaps and priorities

| Priority | Gap | Why it matters |
|---|---|---|
| 1 | **No durable orders, execution, or private report delivery** | Browser-session storage supports the current workflow, but does not provide dependable recovery across devices or browser closure. A purchased audit needs to survive interruption and remain retrievable. |
| 2 | **Delivery and failure commitments remain undecided** | Before taking money, customers need clear scope, delivery timing, retention, access recovery, support expectations, and a remedy if Nuave cannot deliver. |
| 3 | **Checkout is simulated** | Midtrans is selected, but real payment confirmation, purchase entitlement, duplicate-payment notifications, and reconciliation still need implementation. |
| 4 | **External-use safety is unfinished** | Dependency fixes are explicitly pending. Per-IP rate limits exist, but the cost ledger still relies on client-supplied history; this is not a durable server-enforced spending limit. |
| 5 | **Customer value is unvalidated** | Founder acceptance is meaningful, but the repository does not establish that target owners find the report useful, act on it, or pay Rp99.000. |
| 6 | **Customer-facing positioning is inconsistent** | The landing page still describes the older agency offer. Owners need an accurate explanation of what they buy and what the findings mean. |

The delivery and payment requirements are already defined broadly in the [end-to-end plan](../END_TO_END_PLAN.md#phase-4--durable-orders-jobs-and-private-reports). Remaining commercial decisions are listed in [PRODUCT.md](../PRODUCT.md#open-terms-before-a-paid-offer). Pending dependency work is recorded in [NOW.md](../NOW.md#deferred-security-work--before-customer-testing-or-public-sharing).

One technical qualification matters: **Nuave does have rate limiting and cost checks.** The gap is making spending and purchased-work controls authoritative on the server, across requests and restarts. Calling the current app completely unprotected would be inaccurate. Relevant implementation includes [rate-limit.ts](../../src/lib/audit/rate-limit.ts), [wrangler.jsonc](../../wrangler.jsonc), [the run route](../../src/app/api/audit/run/route.ts), and [telemetry.ts](../../src/lib/audit/telemetry.ts). Current session persistence is visible in [smart-audit-session.ts](../../src/lib/intake/smart-audit-session.ts).

## Latest meaningful progress

The recent product work addressed two legitimate obstacles: understanding the business correctly and producing a useful report.

- **September 19: the complete real journey worked.** A fresh session went through preparation, confirmed facts, approved questions, ten grounded observations, report generation, and PDF/JSON downloads. The recorded run used 13 provider requests, with approximately USD 0.17 accounted cost and no retries.
- **Spec 011, released through PRs #78–#79:** replaced the fixed questionnaire with a prepared business summary, confirmation, and clarification where needed. It also strengthened truthful input continuity and privacy.
- **Spec 012, implemented through the report releases and closed through PR #82:** improved the evidence-first report and handling of supported actions. The founder accepted the current report for progression on September 26, deferring formatting improvements.
- **The latest commits:** primarily engineering workflow, closeout, and security-deferral records. They preserve the milestone but do not add payment or durable delivery.

These results and the current next-action decision are recorded in [NOW.md](../NOW.md). The September 19 full-journey execution is documented in [Spec 009 verification](../../specs/009-recommendation-eligible-audit/VERIFICATION.md#complete-real-end-to-end-test--execution-2026-09-19).

There is an important limit: the earlier real end-to-end test predates the latest combined intake/report changes. The newer report acceptance included a disclosed fictional sample; the real same-evidence comparison remains deferred. **That is sufficient to proceed under the recorded founder decision, but it is not customer validation or proof of repeatable production reliability.** The [Spec 012 closeout explicitly preserves this distinction](../../specs/012-evidence-first-report/CLOSEOUT_ACCEPTANCE.md#accepted-exception-and-preserved-limits).

## Recommended next work

For the product Nuave has chosen to build, **make durable private delivery the next bounded capability**, following the existing plan.

Its finish condition should be concrete:

> An approved audit survives browser closure, completes or safely resumes without duplicating paid work, and its recipient can reopen the same saved report through private access in a fresh browser.

Before implementation, settle only the decisions that capability needs: access and recovery method, retention, and support handling. Then approve its bounded specification. A general account system or dashboard is unnecessary.

Recommended sequence:

1. **Durable execution and private delivery**, with server-owned spending records.
2. **Real checkout and failure remedies**, tested together from payment through delivery.
3. **Required security fixes and customer-facing clarity**, before external testing.
4. **A small known-owner pilot**, followed by controlled paid launch.

Security fixes remain a prerequisite for external testing even if other work is resequenced; their placement above is not permission to expose an unfinished application.

### Earlier customer learning: a proposed sequencing change

Allow a few known owners to review a permissioned report earlier, while delivery is being built. This can test comprehension, novelty, and usefulness without pretending the self-service product is ready.

This recommendation requires changing the recorded decision that postpones all customer exposure until after polish. It does not establish willingness to pay; actual paid purchases must test that separately. Existing privacy, permission, and external-use prerequisites still apply.

I would not immediately adopt the [previous review's manual-payment pilot recommendation](./2026-09-27-claude-readiness-review.md). It is a possible founder-approved alternative, but manual payment and emailed PDFs still require delivery, privacy, recovery, and remedy decisions. They also change the current automated-product direction.

The single inexpensive successful run is encouraging, but it does not establish unit economics. At Rp99.000, retries, support time, payment fees, and failed deliveries may matter more than the successful run's model cost.

## Handoff to the next agent

**Next smallest useful task:** prepare the minimal durable-delivery specification with the browser-close/reopen acceptance test above. Keep report formatting deferred, and avoid reopening settled question-generation work.

- Read [README.md](../../README.md) and current [NOW.md](../NOW.md) first; this is a dated review, not the current authority.
- Follow [WORKFLOW.md](../WORKFLOW.md) and the specification gate. Consult the existing [report access and recovery brief](../briefs/REPORT_ACCESS_RECOVERY.md) for the unresolved delivery decisions.
- Treat the proposed early owner review and any manual-payment alternative as recommendations requiring founder decisions, not authorized tasks.
- This review grants no permission for outreach, live provider calls, production payment, merge, or deployment.
- Preserve existing user work, including the separate Claude review. No product files were changed during the assessment.

The assessment was checked against repository evidence, but is not a fresh readiness certification or a full security audit.
