# 07 — Report Access and Recovery: Mechanism Recommendation (DRAFT)

> Status: **Draft recommendation for founder decision — not approved, not implemented**
> Owner: Founder (through the orchestrator)
> Prepared: 2026-08-17 · from [`../briefs/REPORT_ACCESS_RECOVERY.md`](../briefs/REPORT_ACCESS_RECOVERY.md)
> Reads: AGENTS.md, README.md, NOW.md, PRODUCT.md, JOURNEY_CONTRACT.md, END_TO_END_PLAN.md (delivery / return-recovery / private-access / durable-delivery), docs/journey/06-audit-report.md (delivery + ownership)

This document recommends the smallest private-access mechanism for one paying
customer to reliably reach one audit report. It makes **no** implementation,
**no** code, and **no** decision on retention, identity proof, support
response time, or legal commitments — those are escalated to the founder in
section 7.

---

## 0. Summary recommendation

**Revocable private link (an opaque "access grant") plus an email-verified
re-issue for recovery — with no account, no password, and no standing report
history.**

- One unguessable, revocable link is the *access destination* 07 provisions and
  06 delivers in the report-ready email.
- The link persists (until expiry or revocation), so first-open, later-return,
  and another-device return are all "open the link again."
- A single bounded **"resend my access"** endpoint re-issues a fresh link to the
  verified recipient email, covering lost link, expired link, and another
  device — using a uniform response so it never reveals whether an email has an
  order.
- Recipient changes use the candidate verification flow (original-email
  confirmation → authenticated order session + new-email verification → manual
  founder exception); an order number alone is never accepted.

This is option **E** below. It keeps first-open friction at one click, adds the
recovery that a bare link lacks, and avoids the enumeration, cost, and
dashboard-creep of email-code-every-time, report-history, and account designs.

---

## 1. Comparison table

Ratings are qualitative for one-audit-at-a-time, Rp99.000, pre-customer scale.
"Orthogonal" means the criterion is decided by the recipient-change / retention
policy, not by the access mechanism.

| Criterion | A. Revocable private link | B. Emailed one-time code / magic link each open | C. Narrow report history (one verified email) | D. Bounded customer account | E. Hybrid: private link + email-verified re-issue (recommended) |
|---|---|---|---|---|---|
| First-open friction | Lowest — one click | Higher — enter email, wait for code every time | Medium — verify email once, then list | Highest — sign-up / password / login | Lowest — one click |
| Privacy / resistance to unauthorized access | High if token unguessable; a forwarded link still opens | High — email possession gates every open | High — email possession gates | High — credentials gate | High — unguessable token; re-issue is email-gated |
| Another-device return | Only if the link is available on that device | Good — enter email anywhere | Good — enter email anywhere | Good — log in anywhere | Good — reopen link, or email re-issue on the new device |
| Expiry, revocation, replacement | Simple — revoke/rotate the token; report untouched | Code expiry only; email is the stable handle | Per-report + per-email binding | Account-level + report-level | Simple — revoke/rotate token on re-issue; report untouched |
| Recovery when original email is unavailable | None self-service → founder exception | None (email-bound) | None (email-bound) | None without an extra channel (e.g. SMS — out of scope) | None self-service → founder exception (recipient change) |
| Order-existence enumeration prevention | Strong — opaque URL; "resend" must be uniform | Risk — "enter email" is an oracle; needs identical response | Risk — same | Risk — login/registration oracle | Strong — uniform resend endpoint + rate limit |
| Recipient-change verification | Orthogonal — candidate flow required regardless | Orthogonal | Orthogonal | Orthogonal (account transfer messy) | Orthogonal — candidate flow required |
| Founder support burden | Moderate — lost-link/email tickets | Moderate | Moderate | High — password resets, lockouts | Low–Moderate — self-service re-issue absorbs most tickets |
| Implementation + operating cost | Lowest | Low–Moderate — an email per open + rate limiting | Moderate — verified-email table + list UI | Highest — auth, sessions, security review | Low — token + one resend endpoint + one short code |
| Compatibility with Resend + 06 ownership | Perfect — the link *is* the destination 06 emails | Split — 06 report-ready email + 07 per-open codes | 06 email + separate 07 list surface | 06 email + separate 07 login surface | Perfect — 06 emails the link; 07 owns re-issue |
| Finite retention / deletion | Simple — delete token + report | Simple per record; email binding may linger | Moderate — email mapping + history | Complex — account + reports | Simple — delete grant + report |
| Risk of becoming a dashboard | Lowest | Low | Higher — history list → portal | Highest — account → portal | Lowest |

---

## 2. Recommended launch mechanism

**Option E: one revocable private link (access grant) + email-verified re-issue.**

Why it wins for today:

1. **Smallest thing that works.** One opaque token per report-version/recipient,
   one resend endpoint, one short verification code. No password, no session,
   no history list, no account table.
2. **Zero added first-open friction.** The customer already receives a
   report-ready email; the link in it is the whole mechanism. One click opens
   the report — matching the "ten-minute read, not a weekly dashboard" customer.
3. **Recovery without a portal.** Lost link, expired link, or a second device is
   handled by re-issuing a fresh link to the verified recipient email. This is
   the one capability a bare private link (option A) lacks, and it does not
   require the per-open emails (option B), the list surface (option C), or the
   account (option D).
4. **Anti-enumeration is achievable and localized.** The only existence-revealing
   surface is "resend my access," which is made uniform and rate-limited. Options
   B/C/D spread that risk across every visit or login.
5. **Clean 06/07 split and Resend fit.** 06 keeps report-ready email, delivery
   failure, and resend; 07 provisions and rotates the access destination and
   owns only the access-recovery email. No second login or list UI to maintain.
6. **Lowest dashboard-creep risk.** There is deliberately no standing "your
   reports" page. A later re-check is a *new* order → new report → new link →
   new email, so nothing in this mechanism tempts a portal.

**One explicit trade-off to accept (flag):** like every link-based private
report, the link itself is bearer proof — a forwarded report-ready email lets
the forwardee open the report. Option E mitigates this with revocation +
re-issue (scenario 4) rather than by forcing email re-verification on every
open. If the founder wants stricter per-open or per-device binding, that is an
identity-proof decision (section 7), and it moves the design toward option B.

---

## 3. Exact customer flows (ten scenarios)

Terminology used throughout: **access grant** = the opaque private link bound to
one report version + recipient version; **access destination** = what 07 returns
to 06 for the email.

### 3.1 — Recipient opens the report-ready email on the original device

1. 06 validates the web report (10/10 evaluable) and asks 07 for an access
   destination.
2. 07 provisions an access grant (unguessable token, stored hashed) bound to the
   report version + recipient version, and returns the destination to 06.
3. 06 records the grant in its delivery record and sends the report-ready email
   via Resend (`Tim Nuave <support@nuave.ai>`) containing the link and the
   current PDF status.
4. The recipient taps the link; 07 verifies the grant is unexpired and
   unrevoked, then serves the immutable report.
5. 07 records access/last-access metadata only (no report content or recipient
   PII into analytics).

### 3.2 — Recipient returns later on the same device

1. The recipient reopens the link (email, bookmark, history).
2. If unexpired and unrevoked, 07 serves the same report again.
3. If expired/revoked, 07 shows a neutral "access expired — request a new link"
   state and routes them to the resend flow (3.6). It does not reveal anything
   beyond what they already possessed.

### 3.3 — Recipient opens the report on another device

1. Two paths, both valid:
   - **a.** Reopen the report-ready email on the new device → the same link
     works (the grant is per-report, not per-device).
   - **b.** If the email is not reachable there, use "resend my access" (3.6) to
     have 07 rotate the grant and email a fresh link to the verified recipient.
2. Open the link on the new device → report served.

### 3.4 — Original email is forwarded, or the access secret is suspected leaked

1. **Forwarded (no suspicion):** the forwarded link opens the report — inherent
   to bearer links (see trade-off in section 2). No action unless the customer
   reports a problem.
2. **Suspected leak:** the recipient (or support) reports it; 07 revokes the
   current grant and issues a replacement link to the verified recipient email.
   The leaked link stops working immediately; the report, order, and evidence
   are unchanged.
3. Support records the revocation; any follow-up email is a new delivery
   attempt against the same immutable report, not a new report.

### 3.5 — Access expires or is revoked

1. **Expiry:** after the founder-approved expiry, the link returns a neutral
   "expired" state. The recipient uses "resend my access" for a fresh link while
   the founder-approved retention window is open; after it closes, re-issue
   stops (see section 7 — retention is a founder decision).
2. **Revocation:** founder support revokes (leak, recipient change, disputed
   order). The link fails safely; replacement flows only through the approved
   path (3.6 / 3.8), never by guessing.

### 3.6 — Recipient loses the original email or cannot use its access action

1. The recipient uses **"resend my access"**: submit the recipient email (never
   an order number).
2. 07 always returns the same neutral message ("if we have an order for this
   email, we have sent a link").
3. If the email matches the current verified recipient, 07 rotates the grant
   (old one revoked) and emails a fresh link; otherwise nothing is sent, and the
   response is indistinguishable.
4. If the recipient **cannot access the original inbox at all**, this is a
   recipient-change case → 3.8.

### 3.7 — Someone submits an arbitrary email to discover whether it has an order

1. The only existence surface is "resend my access." It always returns the
   identical neutral message and sends **no** email to a non-recipient address.
2. The endpoint is rate-limited per email and per client; it never confirms or
   denies an order.
3. The access grant is high-entropy and unindexed, so link-guessing is not a
   viable probe. No enumeration is possible through this module.

### 3.8 — Customer asks to change the recipient email after payment

1. Possession of an order number alone is **rejected**.
2. Verification (candidate, to be approved by founder):
   - confirmation from the **original email** when it is available; **or**
   - an **authenticated current order session** plus verification of the new
     email; **or**
   - a **manual founder exception** when the original inbox is inaccessible.
3. On approval, 07 creates a **new recipient version** and a **new access
   grant**, revokes the old grant, and 06 records the recipient-version change
   and sends/resends the report-ready email to the new address. The order,
   evidence, and report are **never** mutated.

### 3.9 — Web report ready while the PDF remains failed or retrying

1. 06 validates the web report and requests the access destination regardless
   of PDF state (web and PDF are independent artifact states).
2. 07 provisions the grant and serves the web report; **Download PDF** shows a
   truthful pending/failed status and stays unavailable until `pdf_ready`.
3. 06 sends the report-ready email with the current PDF status. PDF retry
   reuses the same report version; when it succeeds, the same link simply
   enables **Download PDF** — no new report, no new grant.

### 3.10 — 06 resends the report-ready email without creating a new report

1. Resend creates a new delivery attempt keyed on (report version + recipient
   version + template version); it never regenerates the report or reruns an
   observation.
2. 07 does **not** provision a new grant unless the current one is expired or
   revoked; the same link is reused, so a resent email stays valid and a
   duplicate send cannot create a link storm.

---

## 4. Module boundaries and handoffs (06 ↔ 07)

Mechanism-neutral language is used for anything 06 consumes.

| Concern | 06 — Audit Report | 07 — Report Access and Recovery |
|---|---|---|
| Owns | Report generation + validation; web-artifact status; derived PDF status; report-ready email (Resend, `Tim Nuave <support@nuave.ai>`); delivery failure; resend | Access-grant provisioning; opening/validating access; another-device return; expiry/revocation/replacement; recovery ("resend my access"); access-recovery email |
| 06 → 07 handoff | Immutable validated report version, web-artifact status, PDF status, recipient version, and the founder-approved expiry/retention policy needed to provision access | — |
| 07 → 06 handoff | — | The approved **access destination** + **access-grant version**; 06 records it in the delivery record and sends/resends the report-ready email |
| Email split | Sole owner of report-ready email, delivery failure, resend | Sole owner of access-recovery email only |
| Invariant | Resend = new delivery attempt, never a new report | Provision/re-issue is idempotent, rate-limited, and never duplicates or mutates an order, report, or audit |

An implementation spec may combine storage where that keeps the path smaller,
provided ownership and idempotency are not weakened (per JOURNEY_CONTRACT).

---

## 5. Security, privacy, retention, and support rules

**Security / access**
- Access proof is an unguessable token (≥128 bits, CSPRNG), stored hashed (or
  as a salted verifier), never in logs, Git, analytics, or model prompts.
- Revocation and replacement are first-class: rotating a grant changes only the
  grant, never the report, evidence, or order.
- "Resend my access" and any verification-code endpoint are rate-limited and
  return a uniform response regardless of whether an email has an order.
- An order number is never accepted as proof of recipient authority.

**Privacy**
- Report contents, recipient email, payment data, and access secrets stay out of
  model prompts, analytics, and Git.
- No indexing (`noindex`/robots), no referrer leakage (`Referrer-Policy` +
  `rel="noreferrer"`), and no sensitive analytics capture on the access path.
- No raw provider metadata or unnecessary personal information is exposed
  through access.

**Retention / deletion** (values are founder decisions — see section 7)
- A founder-approved expiry and retention policy governs when a grant and its
  report may be re-issued, and when both are deleted.
- Deletion is finite and reversible only through the founder-approved path; it
  removes the grant and the report, not the order/audit record (subject to the
  founder-approved retention decision).

**Support**
- All human support flows through `support@nuave.ai`.
- Founder support performs revocation, recipient-change exception, and
  replacement; these are internal controls, not a customer-facing dashboard.
- Support **response expectation** (time/target) is a founder decision.

---

## 6. Minimum data and state (no generalized schema)

Conceptual records only — an implementation spec may merge them. Nothing here
introduces an account, password, session, or history list.

- **Access grant** — token verifier (hashed), `report_version_id`,
  `recipient_version_id`, status (`active` / `revoked` / `expired`),
  `issued_at`, `expires_at`, `revoked_at`, `last_accessed_at`, and a replacement
  pointer (`supersedes` / `superseded_by`) so rotation is auditable.
- **Recipient version** — `recipient_version_id`, email (verification flag),
  link to the order. Versioning supports recipient change without mutating the
  order/evidence/report.
- **Short verification code** — a bounded, expiring code used only to verify a
  *new* email during a recipient change (and, if reused, for re-issue). Not a
  standing credential.
- **Delivery record (06-owned)** — report version + recipient version + template
  version + attempt count; 06 already owns this for idempotent email/resend.

Nothing else. The existing `report_access_grants` concept in END_TO_END_PLAN
section 6 is the natural home; this recommendation does not add an
organization/workspace model.

---

## 7. Decisions the founder must approve (escalated — not answered here)

1. **Retention period and deletion schedule** for reports and access grants.
2. **Access expiry / link lifetime**, and whether re-issue is self-service or
   support-gated during the pilot.
3. **Identity-proof strength** for recovery and recipient change — specifically
   what counts as an "authenticated current order session," and whether any
   second factor is required (this determines how much of option B's stricter
   gating is adopted).
4. **Recipient-change verification policy** — approve the candidate (original-
   email confirmation → authenticated session + new-email verification → manual
   founder exception) or a variant.
5. **Support response expectation** (target time / SLA).
6. **Terminal remedy / maximum delayed-delivery period** if retries and support
   still cannot reach 10/10 (already founder homework; it interacts with
   recovery).
7. **Privacy, retention, and terms language** for customers — subject to
   qualified legal review (no legal commitment made here).
8. **Whether the initial report-ready email also carries a re-check reminder**
   (already flagged in END_TO_END_PLAN "Needed before durable delivery").

---

## 8. Explicit non-goals

- No customer account, password, or login session.
- No standing "my reports" history list or customer portal.
- No dashboard, monitoring, analytics, team, agency, or subscription surface.
- No re-check portal — a re-check is a new order → new report → new link.
- No enumeration oracle (an email must never reveal order existence).
- No mutation of order, evidence, or report by any access action.
- No generalized schema, plugin framework, or multi-tenant/workspace model.

---

## 9. Acceptance criteria for the later specification

A later `007`-scope spec should satisfy all of the following, verifiably:

1. First open is a single click from the report-ready email; no password or
   account step.
2. The access token is unguessable, stored as a verifier (not plaintext), and
   absent from logs, Git, analytics, and model prompts.
3. Returning later and opening on another device both reach the same immutable
   report (via the persistent link and/or email re-issue).
4. Revoked or expired access fails safely with a neutral message; replacement
   flows only through the approved path.
5. "Resend my access" returns an identical response for existing and
   non-existing emails, sends nothing to non-recipients, and is rate-limited.
6. A recipient change never accepts an order number alone; it creates a new
   recipient version and grant, revokes the old grant, and leaves order,
   evidence, and report unchanged.
7. PDF `pending`/`failed` never withholds the web report or its email; PDF
   success flips **Download PDF** on the same report and grant (no new report,
   no new grant).
8. Resend creates a delivery attempt only — idempotent, no report regeneration,
   no observation rerun.
9. No report content or recipient PII appears in analytics, logs, or Git.
10. The design stays within the 06/07 ownership split and Resend sender
    (`Tim Nuave <support@nuave.ai>`), with 07 owning only the access-recovery
    email.

---

## Assumptions (flagged)

- **A1.** The link persists (is not single-use) until expiry/revocation — this
  is what makes "return later" and "another device" one-click. A stricter
  per-open or per-device bar is an identity-proof decision (section 7.3).
- **A2.** "Resend my access" is self-service at launch. If the founder prefers
  support-gated re-issue for the pilot, flows 3.2/3.3/3.5/3.6 route through
  `support@nuave.ai` instead.
- **A3.** One report per order per recipient; no multi-report list is needed
  until the re-check actually ships as a separate order.
- **A4.** A forwarded email granting access to the forwardee is accepted for
  launch (mitigated by revocation), rather than requiring per-open email
  verification.
- **A5.** Expiry/retention values are placeholders here until the founder
  approves them (section 7.1/7.2).
