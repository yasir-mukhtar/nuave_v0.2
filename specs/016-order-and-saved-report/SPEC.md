# Spec 016: Order, saved report and private link (S3)

> Status: **Draft — waiting for founder approval. Do not implement.**
> Owner: orchestrator
> Updated: 2026-10-12
> Implements: S3 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md),
> plus the per-order cost limit that the plan lists under S4
> Decision basis: [S0 decision, 2026-10-05](../../docs/DECISION_LOG.md#2026-10-05--s0-private-report-delivery-and-recovery-approved)
> (D1–D8 and the ten flows); S2 spending cap (PR #127)
> Number: 015 is taken by the held, unadopted paid-report draft on
> `docs/stage2-paid-report-spec`. This spec does not use or adopt it.

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/PAYING_CUSTOMER_PLAN.md`: §2, §4.2, §5 S3 and S4
3. `docs/DECISION_LOG.md`: the 2026-10-05 S0 entry
4. This spec
5. Code: `src/app/api/audit/run/route.ts`, `src/app/api/audit/report/route.ts`,
   `src/lib/spending/`, `src/lib/audit/protected-observation-provider.ts`,
   `src/app/audit/` (journey and `ReportView.tsx`), `wrangler.jsonc`
6. `.agents/skills/verify-nuave/` and `tests/e2e/journey.ts`

Do not load: `archive/`, Spec 015, old checkpoints.

## Problem

**Evidence.** Today `/audit` has no order and asks for no email. The audit
runs inside the open browser tab: the run route passes the tab's stop signal
into the audit (`src/app/api/audit/run/route.ts`), so closing the tab stops
the audit. The browser holds the answers and asks the server to write the
report. Nothing is saved on the server. The report exists only in that tab.
S2 limits total AI cost per day, but one audit has no cost limit of its own.

**Interpretation.** A customer who pays (S4) must not lose the audit or the
report when they close the tab, and must be able to open the report later on
any device. Nuave must also know the most one order can cost, so the daily
limit can say how many orders fit in one day.

## Desired outcome

The customer gives an email before the intake. Nuave saves an order. After
the customer approves the ten questions, the audit runs on the server. The
customer can close the tab. When the report is ready, Nuave saves it and
emails a private link. The link opens the same report on any device until it
expires or is switched off. One order never costs more than its own limit.

## Scope

- The order screen (no payment button) after "is this your business?".
- The saved order, with its email, in D1.
- The audit and report run on the server and continue after the tab closes.
- Each finished question is saved, so a restart never repeats it.
- The saved report page, opened by a private link; the PDF is the browser's
  print of that page, as today.
- The report-ready email (and a failure email) through Resend.
- The neutral "not available" page.
- Founder support commands: resend the link, replace the link, switch it off.
- The per-order cost limit, and the daily-cap check when an order is created.

## Non-scope

- Payment, price, Midtrans, the founder test pass (S4).
- Cap alert emails to the founder at 80/90/100% (S4).
- Final customer wording, terms and privacy (S5). S3 uses plain draft wording
  that the founder checks at review.
- Saving intake progress. If the tab closes before the audit starts, the
  customer starts again (see open question Q4).
- Accounts, passwords, a dashboard, report history, self-service link
  recovery, a stored PDF file.
- Changing the recipient email (D5): support does this by hand, outside S3.
- Automatic deletion of records. S3 records the expiry date only.
- Any change to the audit method, the questions or the report content.

## Experience

| # | Screen | What the customer sees |
|---|---|---|
| 1–3 | Entry, reading, brand confirm | Unchanged |
| 3a | **Order summary (new)** | Business name and website, what the report includes, an email field (required), `Lanjut`. No price, no payment. |
| 4–14 | Intake and question review | Unchanged |
| 15 | Audit running | Progress by question, as today. New line: "Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke <email>." |
| 16 | Report | Opens at the private link. Same report and PDF button as today. |
| — | Not available | "Laporan ini tidak tersedia." Nothing else: no business name, no reason. |
| — | Audit failed | "Audit belum bisa diselesaikan. Kami sudah mencatatnya dan akan menghubungi Anda di <email>." |

If the daily cap cannot cover one more order, screen 3a shows today's
"Audit tidak tersedia saat ini." and no order is created.

## Requirements

**Order**

- **R-01:** Screen 3a follows the brand confirm. It requires one valid email.
  `Lanjut` creates one order on the server and the intake starts only after
  that succeeds.
- **R-02:** An order has a random server-made ID. The server records the
  email, business name, website, created time and status. The browser never
  sets the status, the cost, or the times.
- **R-03:** Every later paid call (preparation, question writing, audit,
  report) names its order. The server refuses a paid call with no valid
  order, or for an order in the wrong status.
- **R-04:** Order creation has a per-IP rate limit, like the other routes.

**Per-order cost limit**

- **R-05:** Each order has a cost limit, set on the server only
  (`NUAVE_ORDER_SPEND_LIMIT_USD`, default USD 1.00, see Q1). An invalid value
  fails closed.
- **R-06:** When the order is created, the server reserves the whole order
  limit against today's daily cap in the S2 ledger, in one step. If the
  daily cap cannot cover it, no order is created (screen 3a shows "not
  available").
- **R-07:** Each paid call for the order reserves its maximum cost against
  the order's limit before it is sent, and settles to the actual cost after,
  using the S2 rules (an unknown cost stays held). A call that would pass the
  order limit is not sent. Calls draw on the order's reservation, so a
  running order is not stopped by the daily cap.
- **R-08:** When the order finishes, fails for good, or expires unstarted
  (R-10), the unused part of its reservation is returned to the daily cap.
  Held unknown costs are not returned.
- **R-09:** The worker computes and reports the largest possible cost of one
  full order from the S2 per-call maximums (all retries included), and shows
  that the default limit covers it, or reports that it does not.

**Order lifetime**

- **R-10:** An order whose audit has not started 2 hours after creation
  expires (see Q2). Its reservation is returned. A later call for it is
  refused.

**Server-side audit**

- **R-11:** Approving the questions starts the audit on the server. The
  server records the start time once (the D2 clock) and never changes it.
- **R-12:** The audit continues when the tab closes, the network drops, or the
  worker restarts. Each finished question is saved before the next one
  starts. A resumed audit runs only questions without a saved result.
- **R-13:** Technical failures use today's retry rule per question. When the
  audit cannot finish, the order is marked failed once, with the reason, and
  the failure email (R-17) is sent.
- **R-14:** After the ten questions, the server writes the report from the
  saved results and saves it. The saved report never changes. A failed report
  step retries the report only, not the questions.
- **R-15:** An open tab shows progress by asking the server for the order
  status. If the tab is reopened during the run, it shows the same progress.

**Private link and email**

- **R-16:** When the report is saved, the server makes a private link with at
  least 128 random bits. Only a hash of the secret is stored. The link works
  until 12 months after completion (D1) or until it is switched off.
- **R-17:** The server sends through Resend: (a) the report-ready email with
  the link, and (b) on failure, the failure email with the support address.
  Each send is recorded with its result. A failed send is retried; it never
  reruns the audit or rewrites the report (D3).
- **R-18:** The link opens the saved report on any device with no login. The
  page and its data are `noindex`, `no-store`, and send no referrer. The PDF
  button prints this page.
- **R-19:** A wrong, expired or switched-off link shows the "not available"
  page, with the same response for every case. It starts no AI call.

**Support (founder only)**

- **R-20:** A founder-only command, protected by a server secret, can:
  resend the current link to the order email; replace the link (the old one
  stops at once, the new one goes to the same email, D8); switch the link
  off. The founder first confirms through the order email (D7); the command
  does not do that check. An order number alone never sends access anywhere.

## Failure and recovery

| Failure | Saved | Customer sees | Retried |
|---|---|---|---|
| Daily cap full at order creation | Nothing | "Audit tidak tersedia saat ini." | Customer tries later |
| Tab closed during the audit | All finished questions | Email when ready | Remaining questions only |
| Worker restart during the audit | Same | Same | Same |
| One question fails all retries | Finished questions | Failure screen and email | No; founder handles by hand (D3) |
| Order limit reached | Finished questions | Failure screen and email | No |
| Report step fails | All ten results | Waiting, then email | Report step only |
| Email fails | Report and link | Nothing new | Email only |
| Bad or old link | — | "Laporan ini tidak tersedia." | — |

Never invent a result, a report, or a delivery. A failed question is never
shown as an answer.

## Evidence, data, privacy, and cost

- **Records and how long they live (D1 asks for each class):**
  - Order with email: kept with its report, 12 months after completion. An
    order that never completed: kept 30 days for support (see Q3).
  - Saved question results and the report: 12 months after completion.
  - Link: hash only; ends at report expiry or when switched off.
  - Email send records: kept with the order.
  - Spend ledger rows: no personal data; kept (cost records).
  - S3 stores each expiry date and blocks access after it. It does not delete.
    A deletion job needs a later founder decision.
- The email goes only to D1 and Resend. Never to an AI prompt, analytics,
  logs or Git. The `safety_identifier` sent to providers is not the email.
- Storage is the existing D1 database. Keys: a new Resend key and the support
  secret go into Cloudflare/GitHub secrets only (founder action).
- **Infrastructure cost:** the runner must work on the current Cloudflare plan.
  If it needs a paid plan, the worker stops and asks the founder.
- **No live AI calls** during the build or review. All tests use synthetic
  mode. One live end-to-end run for acceptance needs a separate named founder
  approval, with its budget.

## Acceptance criteria

All in synthetic mode unless named.

- **AC-01:** Given the brand confirm, when the customer enters an email and
  taps `Lanjut`, then one order exists on the server and the intake starts.
  With no or a bad email, no order is created.
- **AC-02:** Given a paid route called with no order, an unknown order or an
  expired order, then it is refused and no provider call starts.
- **AC-03:** Given a daily cap with room for fewer than one order limit, when
  an order is created, then it is refused with "not available" and the ledger
  is unchanged.
- **AC-04:** Given an order near its limit, when the next call would pass the
  limit, then that call is not sent and the order fails safely.
- **AC-05:** Given a running order, when the daily total from other orders
  reaches the cap, then this order still finishes within its own limit.
- **AC-06:** Given a finished, failed or expired order, then its unused
  reservation is back in the daily cap.
- **AC-07:** Given an audit with some finished questions, when the tab closes
  (or the run is stopped and restarted), then the audit completes, and the
  finished questions are not run again (count of provider calls proves it).
- **AC-08:** Given a completed audit, then one report-ready email (fake sender
  in tests) holds a link that opens the same report in a new browser with no
  cookies, and the PDF button works.
- **AC-09:** Given a random, expired or switched-off link, then the response is
  the same neutral page, with no business data and no AI call.
- **AC-10:** Given the replace command, then the old link fails, the new link
  works, and the new email goes to the same order email only.
- **AC-11:** Given a failed send, then the email is retried and the audit and
  report are not run again.
- **AC-12:** The email does not appear in any provider request, log line or
  analytics event (test checks request bodies and logs).
- **AC-13:** `verify-nuave` drives URL → order → intake → questions → close
  tab → report by link, in synthetic mode, with evidence in the PR.
- **AC-14 (live, needs named approval):** one founder-approved live run on
  the deployed preview reaches the report by email link, and its total cost
  stays under the order limit.
- **AC-15:** `npm run verify` passes. R-09's worst-case number is in the PR.

## Delivery plan

Two PRs, each with an Opus review before merge:

- **S3a:** order screen, order record, per-order limit, server-side audit and
  report, progress by status. Starts with a short spike that proves the
  runner (Cloudflare Workflows, or a cron sweep if Workflows does not fit the
  OpenNext worker) on a preview worker. The spike is not the final code.
- **S3b:** private link, report page, emails, not-available page, support
  commands.

## Open questions (founder)

- **Q1:** Per-order limit. Proposal: **USD 1.00** (about 5 × the observed
  USD 0.20 per run). With the USD 5 daily cap, at most 5 orders can be open
  at once each day; finished orders give back their unused part. R-09 may
  show the worst case needs more.
- **Q2:** Unstarted order expiry. Proposal: **2 hours**, so abandoned orders
  do not hold the daily cap.
- **Q3:** Keep an order that never completed for **30 days**, then it may be
  deleted later.
- **Q4:** Intake progress is not saved in S3. After S4 a paid customer who
  closes the tab during the intake must restart it. Proposal: accept for S3;
  decide in the S4 spec.
- **Q5:** The founder creates the Resend key for `nuave.ai` and the support
  secret before S3b review.

## Verification record

- Verification artifact: `VERIFICATION.md` (added when implementation starts)
- Result: Pending
