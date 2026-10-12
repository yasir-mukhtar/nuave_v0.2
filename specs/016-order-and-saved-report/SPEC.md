# Spec 016: Order, saved report and private link (S3)

> Status: **Draft — waiting for founder approval. Do not implement.**
> Owner: orchestrator
> Updated: 2026-10-12 (revision 2, after independent review)
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
   `src/lib/spending/` (including `sqlite-d1.test-helper.ts`),
   `src/lib/audit/protected-observation-provider.ts`, `src/app/audit/`
   (journey and `ReportView.tsx`), `wrangler.jsonc`
6. `.agents/skills/verify-nuave/` and `tests/e2e/journey.ts`

Do not load: `archive/`, Spec 015, old checkpoints.

## Problem

**Evidence.** Today `/audit` has no order and asks for no email. The audit
runs inside the open browser tab: the run route passes the tab's stop signal
into the audit (`src/app/api/audit/run/route.ts`), so closing the tab stops
the audit. The browser holds the answers and sends them back to the server
to write the report. Nothing is saved on the server. S2 limits total AI cost
per UTC day, but one audit has no cost limit of its own.

**Interpretation.** A customer who pays (S4) must not lose the audit or the
report when they close the tab, and must be able to open the report later on
any device. Nuave must also know the most one order may reserve, so the
daily cap says how many orders fit in one day.

## Desired outcome

The customer gives an email before the intake. Nuave saves an order. After
the customer approves the ten questions, the audit runs on the server. The
customer can close the tab. When the report is ready, Nuave saves it and
emails a private link. The link opens the same report on any device until it
expires or is switched off. An order never reserves more than its own limit.

## Scope

- The order screen (no payment button) after "is this your business?".
- The saved order, with its email, in D1.
- The audit and report run on the server and continue after the tab closes.
- Each finished question is saved, so no question is paid for twice.
- The saved report page, opened by a private link, with today's PDF (browser
  print) and JSON downloads.
- The report-ready email and the failure email, through Resend.
- The neutral "not available" page.
- Founder support script: resend the link, replace it, switch it off.
- The per-order cost limit.
- A founder-only gate on live orders until S4/S5 (Q6).

## Non-scope

- Payment, price, Midtrans, the founder test pass (S4).
- Cap alert emails to the founder at 80/90/100% (S4).
- Final customer wording, terms and privacy (S5). S3 uses the draft wording
  below; the founder checks it at review.
- Saving intake progress (Q4).
- Accounts, passwords, a dashboard, report history, self-service link
  recovery, a stored PDF file.
- Changing the recipient email (D5): by hand, outside S3.
- Deleting any record. S3 stores expiry dates and blocks access after them.
- Any change to the audit method, the questions or the report content.

## Experience

| # | Screen | What the customer sees |
|---|---|---|
| 1–3 | Entry, reading, brand confirm | Unchanged |
| 3a | **Order summary (new)** | Business name and website, what the report includes, an email field (required), `Lanjut`. No price, no payment. |
| 4–14 | Intake and question review | Unchanged |
| 15 | Audit running | Progress by question, as today. New line: "Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke email Anda." |
| 15a | Audit done (open tab) | "Laporan Anda sudah siap dan kami kirim ke email Anda." The tab does not show the report itself (R-16). |
| 16 | Report | Opens from the email link. Same report, PDF and JSON buttons as today. |
| — | Not available | "Laporan ini tidak tersedia." No business name, no reason. |
| — | Audit failed | "Audit belum bisa diselesaikan. Kami sudah mencatatnya dan akan menghubungi Anda lewat email." |

If the daily cap cannot cover one more order, or the email is not allowed
by the gate (Q6), screen 3a shows today's "Audit tidak tersedia saat ini."
and no order is created.

**Draft email wording (S5 finalizes):**

- Ready: "Laporan audit untuk <bisnis> sudah siap: <link>. Siapa pun yang
  memegang link ini bisa membuka laporan, jadi jangan teruskan. Link berlaku
  12 bulan. Bantuan: support@nuave.ai."
- Failed: "Audit untuk <bisnis> belum bisa diselesaikan. Kami akan menghubungi
  Anda dalam 1 hari kerja. Bantuan: support@nuave.ai."

## Requirements

**Order**

- **R-01:** Screen 3a follows the brand confirm. It requires one valid email.
  `Lanjut` creates one order on the server. The intake starts only after
  that succeeds.
- **R-02:** An order has a random server-made ID. The server records the
  email, business name, website, created time, status and the times below.
  The browser never sets the status, a cost, or a time.
- **R-03:** Order states and the paid calls allowed in each:
  `open` (preparation, question writing) → `running` (questions) →
  `reporting` (report) → `delivered` | `failed` | `expired`. The server
  refuses a paid call with no order, an unknown order, or the wrong state.
- **R-04:** For order-bound runs the server ignores any observations,
  resume data, costs or `safety_identifier` sent by the browser. It uses only
  saved results. The `safety_identifier` comes from the order ID, never the
  email.
- **R-05:** Order creation has a per-IP rate limit and at most 2 `open`
  orders per IP at a time.
- **R-06 (gate, Q6):** In live mode, an order is created only if the email is
  on a server-side allowlist (`NUAVE_ORDER_EMAIL_ALLOWLIST`, a Cloudflare
  secret, never in `wrangler.jsonc` or Git; matched without case after
  trimming spaces). An empty or missing list allows no live order. Synthetic mode has no gate.

**Per-order cost limit (S2 ledger, same D1 database)**

- **R-07:** The order limit is set on the server only
  (`NUAVE_ORDER_SPEND_LIMIT_USD`, default USD 1.00, Q1). A value that is not
  a number, is negative, or is above the daily cap fails closed.
- **R-08:** Creating an order inserts one order row in the ledger, dated the
  UTC creation day, holding the full order limit. It is one conditional insert
  that checks today's total, like S2. If the daily cap cannot cover it, no
  order is created and the ledger is unchanged.
- **R-09:** Each paid call for an order inserts a call row that carries the
  order ID. It is one conditional insert that checks the order's total
  (settled plus held call rows) against the order limit. Call rows with an
  order ID are left out of the daily sum, so nothing counts twice, and the
  calls are not refused by a later day's cap. A call that would pass the order
  limit is not sent. Settling and unknown costs follow S2.
- **R-10:** When the order ends (`delivered`, `failed` or `expired`), its
  order row is settled to the sum of its call rows (settled plus still-held
  unknown costs). The rest returns to the daily cap of the creation day.
- **R-11:** A call may cost more than its reserved maximum (S2 settles the
  actual cost). Any order whose total passes its limit is recorded and shown
  in the founder's support script output.
- **R-12:** The worker computes the largest possible reservation of one full
  order from the S2 per-call maximums, with all retries, and puts the number
  in the PR. If the default limit does not cover it, the worker stops and asks.

**Server-side audit**

- **R-13 (runner):** A Cloudflare cron trigger on the `nuave-v2` worker runs
  every minute. Each run takes the orders that have work to do, one at a time,
  and does the next steps. No other runner is used. The first S3a commit
  proves on the PR preview that the OpenNext worker can export the cron
  handler and that the run fits the current plan's limits. The PR records how
  many questions one cron run completes and how long it takes. If it cannot, or
  needs a paid plan, the worker stops and asks the founder.
- **R-14:** Approving the questions moves the order to `running` and records
  the start time once (the D2 clock) and the deadline (start + 24 hours).
  Neither changes later.
- **R-15 (one runner at a time):** A runner first claims the order with a
  lease that expires (one conditional update). It claims each question the
  same way before it calls the provider. A question claim lasts longer than
  the longest possible provider call. A second runner cannot work on a
  leased order. Each finished question is saved before the next starts. A
  resumed run does only questions with no saved result. A question whose call
  was cut off mid-flight has an unknown result: it counts as one attempt under
  today's retry rule, and its cost stays held (S2).
- **R-16:** The tab shows progress by asking for the order status. The status
  answer has the state and question progress only. It never has the report,
  the email, or the link secret.
- **R-17:** Technical failures use today's retry rule per question. After
  ten saved results, the server writes and saves the report. The saved report
  never changes. A failed report step retries the report only.
- **R-18:** An order that expires unstarted: an `open` order 2 hours after
  creation (Q2) becomes `expired` on the next cron run, which settles its
  order row (R-10).
- **R-19:** At the deadline, an order not yet `delivered` with no saved report, no active link,
  or no accepted ready email is marked `failed` once, and the failure email
  is sent (D3). An order that cannot finish earlier (all retries used, order
  limit reached) is marked `failed` at that time. Retries stop at the
  deadline or the order limit.

**Private link and email**

- **R-20:** When the report is saved, the server makes a link secret with at
  least 128 random bits. Only its hash is stored. The link is
  `https://v2.nuave.ai/r#<secret>`: the secret is after `#`, so it is not in
  server or Cloudflare request logs. The page sends it to the server in a
  POST body to get the report. The secret works until 12 months after
  completion (D1) or until it is switched off.
- **R-21:** The server sends the two emails through Resend, with click and
  open tracking off. Each send is recorded with its result. A failed send is
  retried until the deadline; it never reruns the audit or rewrites the
  report (D3).
- **R-22:** A valid secret opens the saved report on any device with no
  login and no provider call. The page and its data are `noindex`,
  `no-store`, and send no referrer.
- **R-23:** A wrong, expired or switched-off secret gets the same response
  (same status code, headers and page) and starts no provider call. The
  report-data route has a per-IP rate limit.

**Support (founder only)**

- **R-24:** A founder-run script (`npm run support -- <command> <order>`)
  uses `wrangler` against the D1 database and the founder's local Resend key.
  No public admin endpoint. Commands: `resend` (same report and secret, new
  send record), `replace` (new secret to the same email; the old secret stops
  in the same database write, D8), `off` (switch the secret off), `show`
  (state, times, costs, overruns; never the email unless asked). The founder
  first confirms through the order email (D7); the script does not do that
  check. It never sends to any other email. `off` never changes the order
  state.

## Failure and recovery

| Failure | Saved | Customer sees | Retried |
|---|---|---|---|
| Daily cap full, or email not allowed | Nothing | "Audit tidak tersedia saat ini." | Customer tries later |
| Tab closed or worker restart during the audit | Finished questions | Email when ready | Remaining questions only |
| One question fails all retries | Finished questions | Failure screen and email | No; founder handles by hand (D3) |
| Order limit reached | Finished questions | Failure screen and email | No |
| Report step fails | All ten results | Waiting, then email | Report step only, until the deadline |
| Email fails | Report and link | Nothing new | Email only, until the deadline |
| Bad, expired or switched-off link | — | "Laporan ini tidak tersedia." | — |

Never invent a result, a report or a delivery. A failed question is never
shown as an answer.

## Evidence, data, privacy, and cost

- **Storage:** orders, saved results, reports and send records go in the
  existing D1 database (`nuave-v2-spend`, binding `SPEND_DB`). They must sit
  in the same database as the ledger, so one statement can check an order's
  limit (R-09). The database name stays.
- The email goes only to D1 and Resend. Never to an AI prompt, analytics, logs
  or Git. The link secret never goes to logs, analytics or Git.
- Keys: a new Resend key in Cloudflare/GitHub secrets, and a copy the founder
  holds locally for the support script (founder action, Q5).
- **Record lifetimes:** see Q3. S3 stores each expiry date and blocks access
  after it. No deletion is built or authorized.
- **Infrastructure cost:** the cron trigger and D1 must work on the current
  Cloudflare plan (R-13).
- **No live AI calls** during the build or review. One live run for AC-15
  needs a separate named founder approval, with its budget.

## Acceptance criteria

The cost criteria (AC-03 to AC-07) run against the real ledger code on the
sqlite D1 test helper, with a fake paid provider. The rest run in synthetic
mode.

- **AC-01:** Given the brand confirm, when the customer enters an allowed
  email and taps `Lanjut`, then one `open` order exists and the intake starts.
  A missing, bad or not-allowed email creates no order.
- **AC-02:** Given a paid route called with no order, an unknown order, or an
  order in a state that does not allow it (R-03), then it is refused and no
  provider call starts. Browser-sent observations or costs are ignored.
- **AC-03:** Given a daily cap with less room than one order limit, when an
  order is created, then it is refused and the ledger is unchanged.
- **AC-04:** Given an order near its limit, when the next call would pass it,
  then the call is not sent and the order ends `failed`.
- **AC-05:** Given a running order, when other spend fills the daily cap, or
  the UTC day changes mid-run, then this order still finishes within its own
  limit and the new day's total is unchanged by it.
- **AC-06:** Given a `delivered`, `failed` or `expired` order, then its order
  row equals the sum of its call rows and the rest is back in the daily cap.
- **AC-07:** Given an `open` order and a test clock 2 hours later, when the
  cron run happens, then it is `expired` and its reservation is returned.
- **AC-08:** Given an audit with some finished questions, when the tab closes,
  or the run stops and restarts, or two runners start on the same order, then
  the audit completes, no saved question is called again, and two runners
  never call the same question at once (counted on the fake provider). A
  question cut off mid-call is retried only within today's retry rule.
- **AC-09:** Given a completed audit, then one ready email (fake sender) holds
  a link that opens the same report in a fresh browser with no cookies, makes
  no provider call, and the PDF and JSON buttons work. The status answer never
  has the report, email or secret.
- **AC-10:** Given a random, expired or switched-off secret, then the
  response is identical (status, headers, body), with no business data and no
  provider call.
- **AC-11:** Support script: `replace` makes the old secret fail and the new
  one work, with the email to the same address; `resend` adds a send record
  for the same report; `off` gives the neutral page; a command for an unknown
  order sends nothing.
- **AC-12:** Given a failed send, then the email is retried and the audit and
  report are not run again. At the deadline with no accepted ready email, the
  order is `failed` once and the failure email is sent.
- **AC-13:** The email and the link secret do not appear in any provider
  request, log line, or analytics event (tests check request bodies and
  logs).
- **AC-14:** `verify-nuave` drives URL → order → intake → questions → close
  tab → report by link, in synthetic mode, with evidence in the PR.
- **AC-15 (live, needs named approval):** one founder-approved live run on the
  PR preview reaches the report by email link; its recorded total is shown and
  is within the order limit.
- **AC-16:** `npm run verify` passes. R-12's number and R-13's proof are in
  the PR.

## Delivery plan

Two PRs. A Sonnet worker builds each. An Opus reviewer gives the verdict on
each before merge.

- **S3a:** cron runner proof (R-13) first, then order screen, order record,
  gate, per-order limit, server-side audit and report, status progress.
- **S3b:** private link, report page, emails, not-available page, support
  script.

S3a is not deployed to production until S3b is merged, because S3a alone
saves reports that nobody can open.

## Open questions (founder)

- **Q1 — Order limit.** Proposal: **USD 1.00** (about 5 × the observed USD
  0.20 per run). Note: the plan says the daily cap must *cover* one order. This
  spec goes one step further and *holds* the limit for each order until it
  ends, so a running order can never be stopped by the cap and the cap is never
  passed. With the USD 5 cap, at most 5 orders can be open at the same time in
  one UTC day (the day starts at 07:00 Jakarta time). Finished orders give back
  what they did not use. Held unknown costs lower that number. R-12 may show the
  worst case needs more.
- **Q2 — Unstarted order expiry.** Proposal: **2 hours**, so abandoned orders
  do not hold the daily cap.
- **Q3 — Record lifetimes.** Proposal (expiry dates only; no deletion now):
  - Order with email, saved results, report, send records: 12 months after
    completion (D1).
  - Order that failed or expired: 30 days, unless a support case is open.
  - Link secret hash: ends with the report or when switched off.
  - Ledger rows (order ID and costs, no email): 24 months, as cost records.
  - Resend's copy of each email (has the link): Resend's own retention, set to
    the shortest available; the founder checks it in the Resend account.
  - Cloudflare logs: never hold the email or secret (R-20, AC-13); kept for
    Cloudflare's own period.
- **Q4 — Intake progress.** Not saved in S3. After S4 a paid customer who
  closes the tab during the intake must restart it. Proposal: accept for S3;
  decide in the S4 spec.
- **Q5 — Accounts.** The founder creates the Resend key for `nuave.ai` and
  confirms the domain before S3b review.
- **Q6 — Who can make a live order before S4/S5.** S3 has no payment and no
  privacy wording. If any visitor could make orders, anyone could send reports
  to any inbox, and 5 free orders could hold the whole daily cap. Proposal:
  **live orders only for emails on the founder's allowlist** until S4/S5.
  Other visitors see "Audit tidak tersedia saat ini." Effect: after S3 is
  deployed, the public site stops running live audits for strangers. This
  matches the rule "no outside users yet".

## Verification record

- Verification artifact: `VERIFICATION.md` (added when implementation starts)
- Result: Pending
