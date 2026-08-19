# Session prompt: 07 — Report Access and Recovery

> Status: **Ready for a future decision session**
> Owner: Founder through the orchestrator
> Output: recommendation first; no implementation until the founder approves

Copy the prompt below into a fresh AI session.

---

You are reviewing the future **07 — Report Access and Recovery** module for
Nuave. Do not implement it yet. Help the founder choose the smallest private
access mechanism that gives a paying customer reliable access to one audit
report.

Start by reading:

1. `AGENTS.md`
2. `README.md`
3. `docs/NOW.md`
4. `docs/PRODUCT.md`
5. `docs/JOURNEY_CONTRACT.md`
6. `docs/END_TO_END_PLAN.md`, only the report delivery, return/recovery,
   private-access, and durable-delivery sections
7. `docs/journey/06-audit-report.md`, only the delivery and ownership sections

Do not read `archive/` or the full historical planning set unless the founder
names a specific file.

## Settled context

- Nuave sells one audit for one business, currently Rp99.000 total.
- The customer supplies a recipient email before Midtrans payment.
- The report is private and immutable. The validated web report may be
  delivered even while its PDF artifact is failed or retrying.
- `06 — Audit Report` owns report generation, the report-ready email through
  Resend, delivery failure, and resend.
- Email sender: `Tim Nuave <support@nuave.ai>`.
- `07` owns opening private access, returning on another device, expired or
  revoked access, and access recovery.
- The founder has deliberately not chosen between a private link, narrow report
  history, bounded account, or another mechanism.
- A general monitoring, analytics, team, agency, or subscription dashboard is
  out of scope. Minimum account-like behavior is allowed only if it is necessary
  for private report access and recovery.
- A later re-check exists, but this module must not invent monitoring or a broad
  customer portal to prepare for it.
- Customer contact, payment data, access secrets, and private report contents
  must stay out of model prompts, analytics, and Git.

## Scenarios the design must handle

1. The recipient opens the report-ready email on the original device.
2. The recipient returns later on the same device.
3. The recipient opens the report on another device.
4. The original email is forwarded or an access secret is suspected leaked.
5. Access expires or is revoked.
6. The recipient loses the original email or cannot use its access action.
7. Someone submits an arbitrary email to discover whether it has a Nuave order.
8. The customer asks to change the recipient email after payment.
9. The web report is ready while the PDF remains failed or retrying.
10. Module 06 resends the report-ready email without creating a new report.

## Work required

Compare at least these options:

- one revocable private link;
- emailed one-time code or magic-link recovery;
- narrow report history for one verified email;
- bounded customer account; and
- any materially simpler hybrid you recommend.

Evaluate each option against:

- first-open friction;
- privacy and resistance to unauthorized access;
- another-device return;
- expiry, revocation, and replacement;
- recovery when the original email is unavailable;
- prevention of order-existence enumeration;
- recipient-email change verification;
- founder support burden;
- implementation and operating cost;
- compatibility with Resend and Module 06 ownership;
- finite retention and deletion; and
- risk of expanding into a general dashboard.

For recipient changes, do not accept possession of an order number alone.
Evaluate this minimum candidate: confirmation from the original email when
available, or an authenticated current order session plus verification of the
new email, with a manual founder exception when the original email is
inaccessible. A recipient change creates a new recipient version; it does not
mutate the order, evidence, or report.

## Output

Return:

1. a compact comparison table;
2. one recommended launch mechanism and why;
3. the exact customer flows for the ten scenarios above;
4. module boundaries and handoffs between 06 and 07;
5. security, privacy, retention, and support rules;
6. the minimum data and state needed, without designing a generalized schema;
7. decisions the founder must approve;
8. explicit non-goals; and
9. acceptance criteria for a later specification.

Flag assumptions clearly. Prefer the smallest mechanism that works today. Do
not write code, create a broad architecture, or silently decide retention,
identity proof, support response time, or legal commitments for the founder.

---
