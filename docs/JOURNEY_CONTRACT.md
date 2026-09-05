# Nuave journey contract

> Status: **Current cross-module product contract**
> Updated: 2026-08-17
> Governs: module ownership, customer-state order, handoffs, idempotency, and
> phase boundaries from landing through report delivery

This contract connects the touchpoint plans without turning them into one large
implementation specification. Product truth remains governed by
[`VISION.md`](./VISION.md), [`PRODUCT.md`](./PRODUCT.md), and
[`AUDIT.md`](./AUDIT.md). Build order remains governed by
[`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md). Each code change still requires
one bounded approved specification.

## Canonical customer sequence

```text
00 Landing
  → 01 Order Preview
  → 02 Payment
  → 03 Business Facts
  → 04 Questions
  → 05 Audit Run
  → 06 Audit Report and report-ready email
  → 07 Report Access and Recovery, later
```

Payment unlocks personalized Business Facts and question preparation. It does
not run an observation or consume the purchased audit. The entitlement is
consumed only when 05 atomically accepts **Mulai audit** for the exact
confirmed fact and question-pack versions.

## Target state spine

```text
draft
  → preview_ready
  → awaiting_payment
  → paid
  → facts_preparing
  → facts_review
  → facts_confirmed
  → questions_preparing
  → questions_review
  → questions_approved
  → audit_queued
  → audit_running
  → evidence_ready
  → report_preparing
  → web_report_ready
  → report_delivered
```

PDF is a derived artifact of the same report version and has an independent
status: `pdf_pending`, `pdf_ready`, or `pdf_failed`. Web delivery does not wait
for `pdf_ready`.

Recovery states attach to the module that owns the failure. They do not create
a second order or skip the next required approval:

```text
preview_attention
quote_expired
payment_attention
facts_manual_required
questions_fallback_ready
question_attention_required
audit_delivery_delayed
report_attention_required
pdf_failed
delivery_failed
access_recovery_required
```

There is no `partial_report` state. A paid report requires 10/10 evaluable
observations. Completed observations remain preserved while a failed question
receives targeted recovery or the approved remedy.

## Module ownership and handoffs

| Module | Entry and owned work | Successful handoff | Side effect and idempotency | Failure owner | Customer email |
|---|---|---|---|---|---|
| **00 — Landing, later** | Explains the offer and accepts one supported public business source | Supported source to 01 | No personalized model, payment, or audit call | Landing navigation and source-entry errors | None |
| **01 — Order Preview** | Best-effort identity preview, recipient email, one-audit scope, limitations, policy links, and Rp99.000 total valid for 30 days | `checkout_intent`: normalized source, preview identity, recipient, current quote and expiry | Cache by normalized source; repeated submission restores the current unexpired preview; expiry requires refresh before payment | Unsupported source, inaccessible metadata, ambiguous preview identity, expired quote | None |
| **02 — Payment** | Creates one order and reconciles Midtrans QRIS, bank transfer, GoPay, or DANA attempts under that order | Verified `order_id`, one unused entitlement, and paid event to 03 | Repeated checkout action creates one order; provider events are authenticated and idempotent; a replacement attempt cannot create a second entitlement | Payment status, duplicate payment, reversal, refund, and pre-audit payment remedy | Midtrans may own method instructions; no report-ready email |
| **03 — Business Facts** | One prepared draft per paid order and draft version; source-flagged (backend-only, never rendered) correction and confirmation for the same intended business | Immutable `business_fact_version_id` to 04 | Reload resumes the same preparation job; a same-business correction creates a new version and supersedes its question pack; customer edits are never overwritten | Extraction, source conflict, ambiguous business, wrong-business escalation, manual fallback, sensitive-text stop | None initially |
| **04 — Questions** | One suggested pack per confirmed fact version; free editing, coverage advice, narrow blockers, and approval | Immutable `question_pack_version_id` with exact ten strings, order, classification, edits, warnings, and approval | One bounded generation call per fact version; deterministic Indonesian fallback; reload does not regenerate; fact change supersedes the pack | Generation failure, invalid customer question, fallback, fact/pack mismatch | None initially |
| **05 — Audit Run** | Atomic entitlement consumption; locked method; ten independent observations; targeted technical retry; delayed delivery and founder-support escalation when recovery is exhausted; frozen evidence | Immutable `evidence_set_version_id` and one report request to 06 | Repeated start returns one job; completed observations never rerun; support may retry only failed work under the locked method | Audit start, observation execution, persistent technical failure, run-stage support | No report-ready email |
| **06 — Audit Report** | Web report generation and validation, derived PDF status, report version, Resend report-ready email, delivery failure, and resend | Immutable validated `report_version_id`, web artifact, independent PDF status, delivery record, and access destination supplied by 07 | Report retry reuses frozen evidence; PDF retry uses the same report version; email key is report version + recipient version + template version; resend creates a delivery attempt, not a new report | Report construction, validation, PDF rendering, report-stage support, delivery email | Sole owner of report-ready email as **Tim Nuave <support@nuave.ai>**, delivery failure, and resend |
| **07 — Report Access and Recovery, later** | Provision private access for an immutable report; own access opening, another-device return, expired or revoked access, and recovery | Approved access destination back to 06 for delivery, then authorized access to the existing report version | Provisioning and recovery are idempotent and rate-limited; neither can duplicate or mutate an order, report, or audit | Access provisioning, lost, invalid, expired, or revoked access | Owns access-recovery email only |

`07` is a product responsibility, not an architecture decision. Its later
specification chooses a private link, narrow report history, account, or another
bounded mechanism. It must not silently become an analytics, monitoring, team,
or agency dashboard.

A restricted founder admin support action may grant one replacement audit
chance after a genuine customer wrong-business mistake. It links the remedy to
the original order and preserves the original run and evidence. This is an
internal remedy control, not the customer-facing dashboard or access mechanism.

## Required handoff fields

These are conceptual product records, not approval for a generalized schema.
An implementation specification may combine storage where that keeps the path
smaller without weakening ownership.

| Handoff | Minimum server-owned fields |
|---|---|
| 01 → 02 | Preview/reference ID, normalized public source, previewed identity, recipient version, Rp99.000 quote reference, `quote_expires_at`, policy versions |
| 02 → 03 | Order ID, verified Midtrans payment state, one unused entitlement, private order access, submitted source, recipient version, optional original-order/remedy link |
| 03 → 04 | Confirmed fact version, exact business and scope, source/provenance status, customer confirmation, warnings |
| 04 → 05 | Approved question-pack version, exact ordered ten strings, final name/no-name classification, edit record, approval timestamp |
| 05 → 06 | Frozen evidence-set version, ten selected evaluable observations, every attempt, method/version record, sources, completion timestamp, recorded support recovery when used |
| 06 → 07 | Immutable validated report version, web artifact status, PDF artifact status, recipient version, and approved expiry/retention policy needed to provision access |
| 07 → 06 | Approved access destination and access-grant version; 06 records it in delivery and sends or resends the report-ready email |

## Cross-module invariants

1. Browser redirects, callbacks, and displayed success messages never prove
   payment, audit completion, report readiness, or email delivery.
2. A module may mutate only the state it owns. A later module consumes a
   versioned output and never silently rewrites it.
3. Customer refresh, duplicate click, reconnect, and authorized return restore
   the existing state instead of creating duplicate paid work.
4. A confirmed fact change supersedes the complete question pack and requires a
   new review. It never rewrites observations after the audit starts.
5. A substantive answer that declines to recommend or cannot verify a fact is
   evaluable. A provider or policy block with no usable answer is a failed test
   and receives targeted same-method recovery.
6. Report generation begins only at 10/10 evaluable observations. A report
   retry never reruns an observation; an email retry never regenerates a report.
   Persistent failure delays delivery and exposes support; it never reduces the
   ten-question scope.
7. Recipient email, payment data, access secrets, and unrelated customer text
   never enter observation or report-model prompts.
8. The report uses the direct appearance count out of ten, plus separate
   **Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda** measures.
9. The report contains one to five material findings and one to five
   evidence-backed actions. One or two strong findings are sufficient.
10. When no immediate corrective gap is supported, an action may preserve a
    supported strength, improve its public evidence, or investigate an
    explicitly untested aspect. It cannot invent a deficiency.
11. An unpaid quote expires after 30 days. Expiry requires a refreshed preview,
    price, and policy versions; it does not expire or change an already-paid order.
12. Web-report readiness and PDF readiness are separate. PDF retry may change
    only the derived artifact status, never the immutable report facts.

## Target journey versus build phases

Touchpoint number describes where the customer encounters behavior. Phase
number describes when Nuave is allowed to make that behavior real. They are not
the same sequence.

| Build phase | Allowed module work | Explicitly excluded |
|---|---|---|
| **1 — Existing fixture shell** | Finish and verify approved Spec 001 as its historical implementation record | Rewriting the approved spec after implementation, live calls, real email, real payment |
| **2 — Indonesian contract** | Align the protected fixture to the current 01 → 02 simulated → 03 → 04 sequence; finalize 03, 04, and 06 language and data contracts | Real payment, durable jobs, public customer delivery |
| **3 — Live report quality gate** | Connect protected live behavior for 03 → 04 → 05 → 06 and judge one real report | Requiring real checkout, durable customer delivery, or a dashboard before the report proves value |
| **4 — Durable delivery** | Make 05 durable; implement 06 Resend email, separate web/PDF artifact states, and delivery recovery; specify and implement 07 private access | Real customer charge |
| **5 — Real checkout** | Implement and verify Rp99.000 Midtrans checkout, the 30-day quote, QRIS, bank transfer, GoPay, DANA, and approved remedies | Manual transfer outside Midtrans, subscriptions, credits |
| **6 — Cohesion pass** | Complete 00 and harmonize web, report, PDF, email, failure, and support presentation | New dashboard, monitoring, account, or agency scope without a proven need |

An agent receives work from the active approved specification for its phase,
not directly from a complete target-state touchpoint plan.

## Open decisions

`Recipient-change verification` means proving that a request to replace the
post-payment report email is authorized. An order number alone is insufficient
because it would allow report redirection. The Module 07 session must choose
between original-email confirmation, an authenticated order session plus new
email verification, and a manual founder exception when the original inbox is
unavailable. Any change creates a new recipient version without mutating the
order, evidence, or report.

These remain founder homework before the affected live specification:

- maximum delayed-delivery period and terminal remedy if targeted retries and
  founder support still cannot complete the audit;
- private access and recovery mechanism, retention, revocation, and identity
  proof;
- support response expectation;
- recipient-change verification; and
- whether objectively wrong content in an already delivered report needs a
  separate correction submission and corrected-report notification workflow.

Use [`briefs/REPORT_ACCESS_RECOVERY.md`](./briefs/REPORT_ACCESS_RECOVERY.md) to
start the later access-mechanism decision session without preselecting its
architecture.
