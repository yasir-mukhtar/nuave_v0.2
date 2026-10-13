# Spec 017: Payment, founder test pass and cap alerts (S4)

> Status: **In review** — founder answers recorded (2026-10-13); independent plan review next, then founder approval. Build nothing before approval.
> Owner: orchestrator
> Updated: 2026-10-13 (revision 2: founder answers Q1–Q8)
> Implements: S4 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md)
> Decision basis: [S0, 2026-10-05](../../docs/DECISION_LOG.md#2026-10-05--s0-private-report-delivery-and-recovery-approved)
> (D2, D3, D5, D7); price and Midtrans methods (2026-08-17 rows);
> [post-S3 decisions, 2026-10-13](../../docs/DECISION_LOG.md#2026-10-13--s3-decisions-after-spec-016);
> cap alerts (2026-10-12, plan §5 S4); Spec 016 (Verified)

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/PAYING_CUSTOMER_PLAN.md`: §5 S4 and S5
3. `docs/DECISION_LOG.md`: the 2026-10-13, 2026-10-12 and 2026-10-05 entries
4. `specs/016-order-and-saved-report/SPEC.md` (what exists) and this spec
5. Code: `src/app/api/orders/`, `src/lib/orders/` (store, config, runner,
   cron, mail, support), `src/lib/spending/spend-ledger.ts` and
   `provider-spend.ts`, `src/app/api/audit/extract/route.ts`,
   `src/app/api/audit/glm-questions/route.ts`,
   `src/lib/intake/order-screens.tsx`, `src/lib/intake/SmartIntakeJourney.tsx`,
   `src/lib/intake/smart-session.ts`, `migrations/`, `wrangler.jsonc`,
   `.github/workflows/ci.yml`
6. Midtrans Snap and HTTP notification documentation (current version, read
   when building)

Do not load: `archive/`, Spec 015, old checkpoints.

## Problem

S3 made the audit work end to end for the founder's email list. The first
live order cost USD 0.1372 and was delivered in about 10.5 minutes
(Spec 016 AC-21). Nobody can pay yet. Today:

- The order hold (USD 2.00) is taken when the order is created, before any
  money. An unpaid order blocks 40% of the daily cap for up to 2 hours.
- The founder can only test by being on the email list; there is no test
  mark in the records.
- The founder learns that the daily cap is filling only by looking.
- The customer has no short reference to quote to support. The only order
  reference is the internal order ID, which the browser holds and which must
  stay private (decision 2026-10-13 #2).

## Desired outcome

In Midtrans sandbox, a listed customer goes from URL → order summary with
price → pay → intake → approve questions → report by email, and the founder
can run the same journey without paying. Every paid or test order has a
short order number in its emails. The founder gets one email when the day's
cap use first reaches 80%, 90% and 100%.

## User and situation

- **Customer:** a small-business owner (until G1: only addresses on the
  founder's list) who confirmed the business and now wants to pay Rp99.000
  for one audit.
- **Founder:** tests the live journey without paying, and watches spending.

## Scope

- Price, payment button and Terms and Privacy links on the existing order
  summary.
- Midtrans Snap (hosted) checkout, sandbox keys first; notification check.
- Payment state on the order; paid-only gate on all paid work.
- Short order number (decision 2026-10-13 #3).
- Founder test pass.
- Hold moves from order creation to the moment of payment.
- Founder cap alerts at 80%, 90%, 100%.
- A "payment received" email with the order number.

## Non-scope

- Production Midtrans keys and the first real purchase (G1, founder).
- Automatic refunds; refunds stay by hand in the Midtrans dashboard (D3).
- Final Terms, Privacy and Support wording (S5). S4 only links to the pages.
- Opening orders to emails outside the founder's list (see Q1).
- Invoices, tax documents, discounts, coupons, several audits per payment.
- A customer account or order history.
- Landing-page changes (S6). The landing mock `PaymentPreview.tsx` is not
  touched.

## Experience

1. Free website lookup and "is this your business?" stay as today.
2. **Order summary** (`OrderScreen`), now with: the total **Rp99.000**
   ("sekali bayar"), the delivery promise (Q5), links to `/terms`
   and `/privacy`, the email field, and the button **Bayar Rp99.000**.
3. Before the payment window opens, the server checks that the remaining
   daily cap covers one full order. If not: "Kuota audit hari ini sudah
   penuh. Coba lagi besok." No payment is started.
4. Midtrans' payment window opens (QRIS, bank transfer, GoPay, DANA). Nuave
   never sees card or bank details.
5. After payment, the page shows "Pembayaran diterima" with the order number
   and continues to the paid website reading and intake as today. The
   customer gets a "payment received" email with the order number.
6. **Waiting:** a bank transfer or QRIS can stay pending. The page shows
   "Menunggu pembayaran" and checks the order status. The customer may close
   the tab and come back on the same browser.
7. **Expired, cancelled or denied payment:** an honest message and a
   "Coba bayar lagi" button that starts a new payment attempt for the same
   order.
8. The rest (questions, server audit, emailed link) is unchanged. The ready
   and failure emails also show the order number.

All text is Indonesian. The order number is shown as text the customer can
copy.

## Requirements

### Order number

- **R-01:** Each order gets a short order number when it is created, for
  example `NV-7K3Q9P` (6 characters, no look-alike letters), unique in the
  database. It is stored on the order and shown on screen after payment, in
  the payment-received, ready and failure emails, and in `npm run support --
  show`.
- **R-02:** The order number unlocks nothing. No route accepts it in place
  of the internal order ID or the report-link secret. Support still follows
  D7: the number finds the order; it never proves ownership.
- **R-03:** The internal order ID is never sent to Midtrans, never put in a
  URL and never emailed (decision 2026-10-13 #2). Midtrans gets the order
  number plus an attempt suffix (for example `NV-7K3Q9P-2`) as its
  `order_id`, because a new payment attempt needs a new Midtrans ID.

### Payment

- **R-04:** A new route creates a Snap payment for an open, unpaid order:
  amount 99000 IDR, one item "Audit visibilitas AI", the order email as
  customer email, the enabled methods QRIS, bank transfer, GoPay and DANA,
  and a payment window of 60 minutes (Q3). It checks the emergency switch,
  the rate limit, the email list (R-14) and the daily cap (R-10) first. It
  returns only the Snap token to the browser.
- **R-05:** A new notification route receives Midtrans HTTP notifications.
  For each one it (a) checks the signature (SHA-512 of order_id, status_code,
  gross_amount and the server key); (b) asks the Midtrans status API for the
  same transaction; (c) accepts the payment only if the status is
  `settlement`, or `capture` with fraud status `accept`, and the amount is
  exactly 99000 IDR; (d) marks the order paid in one conditional write that
  succeeds only once. A second copy of the same notification changes
  nothing. An unknown or mismatched notification is logged without
  personal data and answered 200, so Midtrans stops resending.
- **R-06:** The browser never decides that an order is paid. The Snap
  "success" callback only makes the page ask the server for the order
  status.
- **R-07:** `refund`, `chargeback` and late `expire` notifications for a paid
  order are recorded on the order and change nothing else. A refund is done
  by hand by the founder.
- **R-08:** A paid order is not expired by the 2-hour unstarted rule. A paid
  order whose questions are not approved within 7 days ends as `failed` with
  code `paid_not_started`; the founder is emailed and decides on a refund by
  hand (Q4). Its hold returns at that point.

### Paid-only gate

- **R-09:** Every step that costs AI money needs a paid order or a test-pass
  order: the paid website reading (`/api/audit/extract`), question writing
  (`/api/audit/glm-questions`), approval (`/api/orders/approve`), and the
  cron runner. An unpaid order is refused with the same neutral answer as
  today. One payment = one audit: a paid order runs once, as in S3.

### Hold and daily cap

- **R-10:** Before a payment window opens, the server checks that today's
  cap total plus one order limit (USD 2.00) is within the daily cap (USD 5).
  If not, no payment starts.
- **R-11:** The USD 2.00 hold is no longer reserved at order creation. It is
  reserved when the order is marked paid (R-05) or when a test-pass order is
  created (R-13), on that UTC day. For a paid order it is reserved even if
  the cap is now full, because the customer has paid; the check in R-10 is
  the guard. The daily total may then pass the cap by at most the orders
  that were paid in the same few minutes. This is accepted (Q2).
- **R-12:** Order calls keep their S3 rules: they check only their own hold,
  never the daily cap, and never pass the hold.

### Founder test pass

- **R-13:** A founder test pass runs one order with no payment:
  - The founder opens a page that is not linked anywhere (Q6) and types the
    test code. The browser keeps it for that tab only and sends it with the
    order request. It is never in a URL, a page's source or a log.
  - The server compares it, in constant time, with the hash of a Worker
    secret `NUAVE_TEST_PASS_CODE`. A missing secret means no test pass.
    Wrong codes are rate limited and get the same neutral answer as any
    refused order.
  - The order email must also be on the founder's list.
  - The order is marked `test` on the order, its ledger rows and in
    `support show`. It reserves its hold at creation, only if the daily cap
    has room (it counts against the cap). It then runs exactly like a paid
    order.

### Email list until G1

- **R-14:** The founder's email list stays in force for paid orders while
  Midtrans runs on sandbox keys (Q1). Otherwise anyone could "pay" with the
  sandbox simulator and start a real, paid AI audit.
- **R-15:** Midtrans settings are Worker secrets written by the deploy job,
  like the S3 settings: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
  `MIDTRANS_IS_PRODUCTION` (`false` until G1), plus `NUAVE_TEST_PASS_CODE`
  and `NUAVE_FOUNDER_ALERT_EMAIL`. If a needed one is missing, no payment
  starts (fail closed). Preview workers never get real keys.
- **R-16:** Synthetic mode (local, tests, previews) uses a labeled simulated
  payment with no call to Midtrans, so the journey can be driven end to end
  offline.

### Emails

- **R-17:** After an order is marked paid, the customer gets one "payment
  received" email (Resend, same sender as S3) with the business name, the
  order number, the amount, the delivery promise (Q5),
  and the support address. It contains no link and no secret. Sends are
  recorded like S3's ready and failure emails, with a fixed idempotency key
  per order.

### Cap alerts

- **R-18:** The every-minute cron checks today's cap total (the same total
  that R-10 uses: holds plus settled daily rows). The first time on a UTC day
  that it is at or above 80%, 90% or 100% of `NUAVE_DAILY_SPEND_LIMIT_USD`,
  it emails `NUAVE_FOUNDER_ALERT_EMAIL` once for that level. If two levels
  are passed at once, one email names the highest. Each sent level is
  recorded so it is never sent twice in a day, even across restarts. The
  email says the total, the cap, and how to raise the cap.
- **R-19:** When a customer is turned away because the cap cannot fit one
  more order (R-10), the founder gets the 100% email if it was not sent yet
  that day. With a USD 5 cap and USD 2.00 holds, two orders use 80% and a
  third does not fit, so "full" is what the founder needs to know.
- **R-20:** The alert work stays within S3's per-run budget on Workers Free
  (at most a few extra D1 queries and one email per run).

## Failure and recovery

| Failure | What the customer sees | What is kept | What happens next |
|---|---|---|---|
| Cap full before payment | "Kuota audit hari ini sudah penuh. Coba lagi besok." | Unpaid order (expires in 2 h) | No money taken; founder alert (R-19) |
| Payment pending | "Menunggu pembayaran" | Order, attempt | Page checks status; notification marks it paid |
| Payment expired, denied or cancelled | Honest message, "Coba bayar lagi" | Order (until its 2 h expiry) | New attempt, new Midtrans ID |
| Notification never arrives | "Menunggu pembayaran" | Order | Status check asks Midtrans directly when the customer returns (Q7) |
| Duplicate notification | Nothing changes | Order paid once | No second audit, no second hold |
| Forged or wrong-amount notification | Nothing changes | Logged without personal data | Order stays unpaid |
| Paid, then the audit fails | S3 failure email, with order number | Saved data, hold | Founder refunds by hand (D3) |
| Paid, intake never finished | — | Order 7 days | `paid_not_started`; founder emailed; refund by hand (Q4) |
| Midtrans settings missing | "Audit tidak tersedia saat ini." | — | No payment starts |

Never infer payment from the browser, from the Snap callback alone, or from
an unchecked notification.

## Evidence, data, privacy, and cost

- **Payment data:** Nuave stores only the Midtrans transaction ID, the
  attempt's Midtrans `order_id`, the payment status, the method name, the
  amount and the times. No card, bank or wallet details. Midtrans holds the
  rest under its own terms.
- **Midtrans sees:** the order email, the amount, the item name and the
  order number. It never sees the business details, questions, report or the
  internal order ID.
- **Record lifetimes:** payment fields follow the order's lifetime from
  Spec 016 Q3. Payment records needed for accounting or refunds are kept at
  least as long as the ledger rows (24 months) and are not deleted with the
  report (D1). No deletion is built now.
- **Cost:** no new paid service; Midtrans charges per transaction (founder
  account). The test pass counts against the daily cap. No live AI call or
  real email during build or review; the S4 live check (AC-14) needs a
  named founder approval and budget.
- **Logs:** never the email, the test code, the server key, the signature or
  the internal order ID.

## Acceptance criteria

- **AC-01:** Given a listed email in sandbox, when the customer pays in the
  Snap window, then the order is marked paid only after a checked
  notification, and the intake continues.
- **AC-02:** Given a paid order, when the same notification arrives again,
  then nothing changes: no second hold, no second email, no second audit.
- **AC-03:** Given a notification with a bad signature, a status-API
  mismatch or a wrong amount, then the order stays unpaid.
- **AC-04:** Given an unpaid order, when any paid route or the cron is
  called for it, then it is refused and no ledger row is written.
- **AC-05:** Given an order, then its order number is unique, appears in the
  payment-received, ready and failure emails and in `support show`, and no
  route accepts it in place of the internal order ID.
- **AC-06:** The internal order ID never appears in a Midtrans request, a
  URL, an email or a log line (test with spies).
- **AC-07:** Given the cap cannot fit one more order, when the customer
  presses Bayar, then no payment starts, the "full" message shows and the
  founder gets the 100% alert once.
- **AC-08:** Given a paid order and a cap that filled after payment, then the
  order still runs to the end, within its own limit.
- **AC-09:** An unpaid order holds nothing; the hold is reserved at payment
  (or test-pass creation) and settles at the end as in S3.
- **AC-10:** The test pass runs a full audit with no payment, marks the order
  and its ledger rows `test`, counts against the cap, and fails with the
  same neutral answer for a wrong code, a missing secret or an unlisted
  email.
- **AC-11:** Crossing 80%, 90% and 100% of the cap each sends one founder
  email per UTC day, also after a restart; passing two levels at once sends
  one email.
- **AC-12:** Pending, expired and denied payments show the right message;
  "Coba bayar lagi" creates a new attempt with a new Midtrans ID.
- **AC-13:** `verify-nuave` drives URL → order summary with price →
  simulated payment → intake → questions → report by link, in synthetic
  mode; `npm run verify` passes; one cron run stays within the Free limits.
- **AC-14 (live, needs named approval):** after deploy, one sandbox payment
  on production with a listed email reaches the report by email link, and
  one test-pass run does too. Record totals, the order numbers and the
  emails received.

## Founder decisions (2026-10-13)

All open questions are answered. Yasir chose the recommended option in each
case.

- **Q1 — Email list:** stays in force for every order while Midtrans runs on
  sandbox (test-mode) keys, until G1.
- **Q2 — Hold timing:** the USD 2.00 hold is reserved when the payment is
  confirmed (R-11). A small overshoot of the daily cap when two payments land
  at the same moment is accepted.
- **Q3 — Payment window:** 60 minutes.
- **Q4 — Paid but intake not finished:** after 7 days the order ends as
  `paid_not_started`, the founder is emailed, and the founder refunds by hand.
- **Q5 — Delivery promise wording (approved):** "Laporan biasanya siap dalam
  15 menit setelah Anda menyetujui pertanyaan, paling lama 24 jam. Jika
  gagal, kami kembalikan uang Anda." Final legal wording of Terms and Privacy
  stays in S5.
- **Q6 — Test-pass entry:** an unlinked page (for example `/uji`) with one
  code field, plus an email on the founder's list.
- **Q7 — Missed notification:** when a customer returns to a waiting order,
  the server may ask Midtrans' status API directly (rate limited), with the
  same checks as R-05.
- **Q8 — Founder alert address:** `hello@nuave.ai`, set as the Worker secret
  `NUAVE_FOUNDER_ALERT_EMAIL`. It gets cap alerts and `paid_not_started`
  notices.

- **Founder actions before AC-14:** Midtrans sandbox account with QRIS, bank
  transfer, GoPay and DANA enabled; sandbox server and client keys as GitHub
  secrets; notification URL set to
  `https://v2.nuave.ai/api/payments/midtrans/notification` in the Midtrans
  dashboard; `NUAVE_TEST_PASS_CODE` and `NUAVE_FOUNDER_ALERT_EMAIL` as
  GitHub secrets; CI token keeps Worker-secret permission.

## Implementation notes

- New D1 migration: order columns for the order number (unique), paid time,
  payment kind (`midtrans` or `test_pass`), last payment status, Midtrans
  transaction ID and attempt counter; a `test` mark on ledger rows; a small
  table for sent cap alerts (day, level). Adding columns avoids rebuilding the
  `orders` state check; "paid" is a column, not a new state.
- `order_emails.kind` allows only `ready` and `failure`; changing that check
  needs a table rebuild, so a payment-received send may need its own small
  table or a rebuilt check. The worker chooses and says which.
- Delivery plan: one PR, Sonnet worker, Opus review on the exact head, as in
  S3. Founder merges.

## Verification record

Complete after implementation:

- Verification artifact: `specs/017-payment-and-test-pass/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
