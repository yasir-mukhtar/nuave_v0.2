# Spec 017: Payment, founder test pass and cap alerts (S4)

> Status: **In review** — revision 3 answers the independent plan review (FAIL on revision 2); re-review next, then founder approval. Build nothing before approval.
> Owner: orchestrator
> Updated: 2026-10-14 (revision 3: plan review findings 1–19 applied)
> Implements: S4 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md)
> Decision basis: [S0, 2026-10-05](../../docs/DECISION_LOG.md#2026-10-05--s0-private-report-delivery-and-recovery-approved)
> (D2, D3, D5, D7); price and Midtrans methods (2026-08-17 rows);
> [post-S3 decisions, 2026-10-13](../../docs/DECISION_LOG.md#2026-10-13--s3-decisions-after-spec-016);
> [S4 answers, 2026-10-13](../../docs/DECISION_LOG.md#2026-10-13--s4-answers-for-spec-017-draft);
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
   `src/lib/audit/deployment-gate.ts`, `src/lib/intake/order-screens.tsx`,
   `src/lib/intake/SmartIntakeJourney.tsx`, `src/lib/intake/smart-session.ts`,
   `migrations/`, `wrangler.jsonc`, `.github/workflows/ci.yml`,
   `src/lib/orders/runner-worst-case.test.ts`
6. Midtrans documentation, current version, read when building: Snap
   integration and advanced features (expiry, page expiry, callbacks), HTTP
   notification, Get Status API, and the DANA page.

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
can run the same journey without paying. A customer who pays always gets
either the audit or a recorded refund case; nobody pays twice for one order
without the founder being told. Every paid or test order has a short order
number. The founder gets one email when the day's cap use first reaches 80%,
90% and 100%, and when the cap turns a customer away.

## User and situation

- **Customer:** a small-business owner (until G1: only addresses on the
  founder's list) who confirmed the business and now wants to pay Rp99.000
  for one audit.
- **Founder:** tests the live journey without paying, watches spending, and
  refunds by hand when a notice says so.

## Scope

- Price, payment button, delivery promise and Terms and Privacy links on the
  existing order summary.
- Midtrans Snap checkout (sandbox keys), notification handling, status
  recovery, payment attempts.
- Paid-only gate on all paid work; a paid order can no longer be replaced.
- Short order number.
- Founder test pass.
- Hold moves from order creation to the moment of payment.
- Founder notices: cap alerts at 80%, 90%, 100%, "cap full", paid but not
  started, payment that needs a refund.
- A "payment received" email.
- Email idempotency keys no longer contain the internal order ID (S3 code
  included).

## Non-scope

- Production Midtrans keys, dropping the email list, and the first real
  purchase (G1, founder). G1 also needs S5 first: `/privacy` still says the
  product takes no payments.
- Automatic refunds; refunds stay by hand in the Midtrans dashboard (D3).
- Final Terms, Privacy and Support wording (S5). S4 only links to the pages.
- Invoices, tax documents, discounts, coupons, several audits per payment.
- A customer account or order history; continuing an order on another
  browser.
- Landing-page changes (S6). The landing mock `PaymentPreview.tsx` is not
  touched.

## Experience

1. Free website lookup and "is this your business?" stay as today.
2. **Order summary** (`OrderScreen`), now with: the total **Rp99.000**
   ("sekali bayar"), the delivery promise (Q5), links to `/terms` and
   `/privacy`, the email field, and the button **Bayar Rp99.000**.
3. Before the payment window opens, the server checks the daily cap (R-10).
   If there is no room: "Kuota audit sedang penuh. Coba lagi dalam beberapa
   jam." No payment is started; the founder is told (R-21).
4. The Midtrans payment window opens over the page (Snap popup). It offers
   QRIS, bank transfer, GoPay and DANA. Nuave never sees card, bank or
   wallet details. GoPay and DANA may send the customer to their app; they
   return to `/audit` on the same browser.
5. **Paid:** the page shows "Pembayaran diterima", the order number, and
   continues to the paid website reading and intake as today. From now on
   the website and business cannot be changed on this order; a wrong
   business is a support case (D5). The customer gets a "payment received"
   email.
6. **Waiting** (bank transfer or QRIS not yet paid): "Menunggu pembayaran",
   with **Lihat cara bayar**, which reopens the same payment window. The
   page checks the status. The customer may close the tab and come back on
   the same browser.
7. **Window closed without paying, expired, cancelled, denied or failed:** an
   honest message and **Coba bayar lagi**, which starts a new attempt only
   when the old one can no longer be paid (R-06).
8. **Paid order that cannot continue** (ended, or opened later on a browser
   that lost its progress): the page never offers a new payment. It shows the
   order number and "Hubungi support@nuave.ai".
9. The rest (questions, server audit, emailed link) is unchanged. The ready
   and failure emails also show the order number.

All text is Indonesian. The order number is shown as text the customer can
copy.

## Requirements

### Order number

- **R-01:** Each order gets a short order number when it is created, such as
  `NV-7K3Q9P`: "NV-" and 6 characters without look-alike letters. It is
  unique through a unique index; on a collision the server makes a new one.
  It is shown on screen once paid, in every customer email of the order, and
  in `npm run support -- show`.
- **R-02:** The order number unlocks nothing. No route accepts it in place
  of the internal order ID or the report-link secret. Support still follows
  D7: the number finds the order; it never proves ownership.
- **R-03:** The internal order ID never leaves Nuave's server and the
  customer's browser storage. It is not sent to any outside service
  (Midtrans, Resend, the AI providers), not in a URL, an email, a request
  header or a log line. Email idempotency keys use the order number or a
  hash instead; this also changes the S3 keys in `runner.ts` and
  `support.ts`. Midtrans gets the order number plus the attempt number as
  its `order_id`, such as `NV-7K3Q9P-2`.

### Payment attempts

- **R-04:** Payment attempts are stored in their own table: order, attempt
  number, Midtrans `order_id` (unique), window start and end, Midtrans
  `transaction_id` once known, last status, payment method, amount and
  currency as received, refund state, and times. Rows are kept at least 24
  months, like ledger rows, and are not removed with the order (D1). They
  hold no card, bank or wallet details.
- **R-05:** **Start payment.** A new route creates a Snap transaction for an
  open, unpaid order. Checks first: emergency switch, rate limit, email list
  (R-16), Midtrans and alert settings present (R-17), and the daily cap
  (R-10). The Snap request has: gross amount 99000 IDR; one item "Audit
  visibilitas AI" at 99000; the order email as customer email; enabled
  payments QRIS, bank transfer, GoPay and DANA; `expiry` with `start_time`
  set to now and a duration of 60 minutes (Q3); `page_expiry` of 60 minutes;
  and the notification URL through the `X-Override-Notification` header
  (R-08). The route returns only the Snap token.
- **R-06:** **One payable attempt at a time.** A new attempt is created only
  when the order has no attempt that could still be paid: its window has
  ended plus a 30-minute grace, or Midtrans has reported it `expire`,
  `cancel`, `deny` or `failure`. While an attempt can still be paid, the
  button reopens that attempt's token.
- **R-07:** **Unpaid order lifetime.** An unpaid order ends (`expired`) at
  the later of 2 hours after creation and the end of its last attempt's
  window plus the 30-minute grace. The four places that apply the 2-hour rule
  today (`orderInState`, `approveOrder`, `orderStatus`, `expireOpenOrders`
  in `store.ts`) use this one rule.

### Payment notification and status

- **R-08:** **Notification route** `/api/payments/midtrans/notification`:
  - It works even while the emergency switch is off. It only records
    payments; it starts no AI work.
  - It checks the signature: SHA-512 of the raw strings `order_id`,
    `status_code`, `gross_amount` (for example `99000.00`) and the server
    key, joined exactly as received.
  - It asks the Midtrans Get Status API for the notification's
    `transaction_id` and decides only from that answer (R-09).
  - It answers 200 when the notification was handled or is to be ignored
    (bad signature, unknown `order_id`, wrong amount). It answers 503 on a
    passing error (database or Midtrans not reachable), so Midtrans retries.
  - It logs no email, key, signature or internal order ID.
- **R-09:** **When an attempt counts as paid.** The Get Status answer has
  `transaction_status` `settlement`, or `capture` with `fraud_status`
  `accept`; a `fraud_status`, when present, is `accept`; `gross_amount` is
  `99000.00`; currency is IDR; and `order_id` equals a stored attempt.
  Midtrans base addresses: Snap and snap.js `app.sandbox.midtrans.com` (with
  production `app.midtrans.com`), API `api.sandbox.midtrans.com` (production
  `api.midtrans.com`), status at `/v2/{transaction_id}/status`. Basic auth
  is the base64 of the server key followed by ":".
- **R-10 (cap check before payment):** A payment window opens only if today's
  cap total plus USD 2.00 for every attempt that can still be paid (R-06),
  plus USD 2.00 for this one, is within the daily cap. This is one query,
  counted across all days, so windows that cross 00:00 UTC are counted on
  the new day too. With this rule, payments cannot push the day past the cap;
  only a payment confirmed after its window and grace ended can, and that
  case sends a founder notice (R-21).
- **R-11:** **Marking paid.** When R-09 holds, one write marks the order paid
  (paid time, payment kind `midtrans`, the attempt), sets the order's end
  time to paid time plus 7 days (R-13), and reserves the USD 2.00 hold on
  the UTC day of payment, even if the cap is now full: the customer has paid.
  A unique index allows one hold row per order. A second copy of the same
  notification, or a status check of the same attempt, changes nothing.
- **R-12:** **A paid attempt that cannot be applied** (the order already
  paid by another attempt, already ended, or replaced) is stored as "needs
  refund" on its attempt, and the founder gets a notice (R-21). The customer
  is never asked to pay again for that order.
- **R-13:** **Paid order lifetime.** A paid order whose questions are not
  approved within 7 days of payment ends as `failed` with code
  `paid_not_started`. Its hold returns. The customer gets the S3 failure
  email with the order number; the founder gets a notice to refund by hand
  (Q4). The browser keeps progress for 7 days, the same span.
- **R-14:** **Status recovery** (Q7). When the page asks for the status of an
  order with a payable or recently ended attempt, the server may ask Get
  Status and apply the result as in R-09 to R-12. It asks by
  `transaction_id`; Midtrans answers DANA status only by transaction ID. If
  only the Snap callback gave a `transaction_id`, it is a hint: the server
  checks that its `order_id` matches the attempt. At most one Midtrans check
  per attempt per 30 seconds. If no transaction exists (window closed before
  a method was chosen), Get Status answers "not found" and the attempt is
  treated as unpaid.
- **R-15:** **Refunds and other late states.** `refund`, `partial_refund` and
  `chargeback` are recorded on the attempt. If the order's questions were not
  yet approved, the order ends as `failed` with code `refunded`, no AI work
  runs, and no failure email is sent (the founder already refunded). After
  approval, a refund changes nothing else. `expire`, `cancel`, `deny` and
  `failure` on an unpaid attempt end that attempt only.

### Email list and settings

- **R-16:** The founder's email list applies to every order and test pass
  while `MIDTRANS_IS_PRODUCTION` is not `true`. Dropping it is a separate
  founder decision at G1, not automatic.
- **R-17:** Settings, written by the deploy job as in S3:
  - Worker secrets: `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`
    (`false` until G1), `NUAVE_TEST_PASS_CODE`, `NUAVE_FOUNDER_ALERT_EMAIL`
    (`hello@nuave.ai`, Q8).
  - Build value: `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (public by design; snap.js
    needs it in the page), set in `ci.yml` from a GitHub secret.
  - If the server key, the production switch or the alert address is
    missing, no payment and no test pass start (fail closed).
  - Preview workers never get real keys. Synthetic mode (local, tests,
    previews) uses a labeled simulated payment and never calls Midtrans.

### Paid-only gate and replacement

- **R-18:** Every step that costs AI money needs a paid order or a test-pass
  order: `/api/audit/extract`, `/api/audit/glm-questions`,
  `/api/orders/approve`, and the cron runner. An unpaid or refunded order is
  refused with the same neutral answer as today.
- **R-19:** **A paid or test-pass order is never replaced.** `POST
  /api/orders` with `previous_order_id` only ends the old order if it is
  unpaid. After payment the browser locks the website and business, never
  sends a paid order as `previous_order_id`, and never turns an "ended"
  answer for a paid order into a new order (Experience 8).

### Founder test pass

- **R-20:** A founder test pass runs one order with no payment:
  - The founder opens an unlinked page `/uji` (Q6) and types the test code.
    The browser keeps it in session storage for that tab only and sends it in
    the order request body. It is never in a URL, page source or log.
  - The server compares a hash of it with a hash of `NUAVE_TEST_PASS_CODE`
    in constant time. The secret must be at least 24 characters; shorter or
    missing means no test pass. Wrong codes share the order rate limit and
    get the same neutral answer as any refused order.
  - The order email must be on the founder's list.
  - The order, its ledger rows and `support show` mark it `test`. It reserves
    its hold at creation, only if the cap has room by the R-10 rule. It keeps
    the 2-hour unstarted rule (not the 7 days) and never causes a refund
    notice.

### Founder notices and cap alerts

- **R-21:** **Founder notices** go to `NUAVE_FOUNDER_ALERT_EMAIL` and are
  recorded in one table keyed by (UTC day, kind, subject). A notice is
  claimed in the table first and then sent, so overlapping cron runs never
  send it twice; failed sends are retried for 24 hours. Kinds:
  - `cap_80`, `cap_90`, `cap_100`: the cron sees today's cap total (holds
    plus settled daily rows) at or above that share of the cap for the first
    time that day. When two levels pass at once, one email names the highest
    and records both.
  - `cap_full`: a customer was turned away by R-10. Separate from `cap_100`,
    once per day.
  - `paid_not_started` (one per order, R-13) and `needs_refund` (one per
    attempt, R-12), plus `late_payment_over_cap` (R-10).
  - Each email says what happened, the order number when there is one, and
    the action. For the cap it says: to raise it, change
    `NUAVE_DAILY_SPEND_LIMIT_USD` in `ci.yml` and deploy. A change made only
    in the dashboard is overwritten by the next deploy.
  - A notice found in a web request (`cap_full`) is only recorded there; the
    cron sends it.

### Emails and the cron budget

- **R-22:** After an order is marked paid, the customer gets one "payment
  received" email (Resend, S3 sender) with the business name, the order
  number, the amount, the delivery promise (Q5), "Lanjutkan di browser yang
  sama untuk mengisi data bisnis Anda", and the support address. It has no
  link and no secret. The cron sends it, not the notification route (which
  must answer Midtrans quickly). Each send attempt has its own idempotency
  key, as in S3.
- **R-23:** Each new cron task (payment emails, founder notices, the 7-day
  sweep, the cap check) has a cost entry in the S3 per-run meter and runs
  only if it fits. `runner-worst-case.test.ts` covers the new tasks, and one
  run stays within Workers Free limits (50 combined D1 queries and outside
  requests, 10 ms CPU).

### Support

- **R-24:** `npm run support` finds an order by its internal ID, its order
  number or a Midtrans `order_id`. `show` also prints: payment kind, paid
  time, every attempt with its status, and refund and "needs refund" states.

## Failure and recovery

| Failure | What the customer sees | What is kept | What happens next |
|---|---|---|---|
| Cap has no room | "Kuota audit sedang penuh. Coba lagi dalam beberapa jam." | Unpaid order | No money taken; `cap_full` notice |
| Payment pending | "Menunggu pembayaran", Lihat cara bayar | Order, attempt | Notification or status check marks it paid |
| Window closed, no method chosen | "Pembayaran belum dilakukan", Coba bayar lagi | Attempt (unpaid) | New attempt after the old one can no longer be paid |
| Expired, cancelled, denied, failed | Honest message, Coba bayar lagi | Order until its end time | New attempt, new Midtrans ID |
| Notification never arrives | "Menunggu pembayaran" | Order | Status recovery (R-14) when the customer returns |
| Midtrans or database down during a notification | — | — | 503, Midtrans retries |
| Duplicate notification | Nothing changes | Order paid once | No second hold, email or audit |
| Forged or wrong-amount notification | Nothing changes | Logged without personal data | Order stays unpaid |
| Payment lands after the order ended, or a second attempt is paid | Order number and support | Attempt marked "needs refund" | `needs_refund` notice; founder refunds |
| Paid, then the audit fails | S3 failure email, with order number | Saved data, hold | Founder refunds by hand (D3) |
| Paid, questions not approved in 7 days | S3 failure email | Order | `paid_not_started` notice; founder refunds |
| Refund before approval | — | Attempt refund state | Order ends `refunded`; no AI work |
| Paid, customer returns on another browser | Entry screen; old progress not there | Order | Payment email told them to use the same browser; support finds the order by number |
| Midtrans or alert settings missing | "Audit tidak tersedia saat ini." | — | No payment or test pass starts |

Never infer payment from the browser, from the Snap callback alone, or from
an unchecked notification.

## Evidence, data, privacy, and cost

- **Payment data:** only what R-04 lists. Midtrans holds the rest under its
  own terms.
- **Midtrans sees:** the order email, the amount, the item name and the
  order number with attempt. Never the business details, questions, report
  or the internal order ID.
- **Record lifetimes:** payment attempts and founder notices at least 24
  months, like ledger rows; they are not removed with the report or a failed
  order. No deletion is built now.
- **Cost:** no new paid service; Midtrans charges per transaction (founder
  account). The test pass counts against the daily cap. No live AI call or
  real email during build or review. AC-01 to AC-20 run offline against a
  fake Midtrans and the fake mail sender. The live check (AC-21) needs a
  named founder approval and budget.
- **Logs:** never the email, the test code, a key, a signature or the
  internal order ID.

## Acceptance criteria

All except AC-21 run offline, with a fake Midtrans (Snap, notification and
Get Status) and the fake mail sender.

- **AC-01:** Given a listed email, when the customer pays, then the order is
  marked paid only after a notification whose signature and Get Status answer
  pass R-08 and R-09, and the intake continues. The Snap request has the
  R-05 contents.
- **AC-02:** Given a paid order, when the same notification or status check
  arrives again, then nothing changes: one hold, one payment email, one
  audit.
- **AC-03:** Bad signature, Get Status mismatch, wrong amount, wrong currency
  or unknown `order_id`: the order stays unpaid and the route answers 200.
  A database or Midtrans error answers 503. With the emergency switch off,
  notifications are still recorded.
- **AC-04:** An unpaid or refunded order is refused by every paid route and by
  the cron, with no ledger row.
- **AC-05:** The order number is unique (collision retried), shown on screen
  once paid, in every customer email of the order and in `support show`;
  no route accepts it in place of the internal order ID; support finds an
  order by number and by Midtrans `order_id`.
- **AC-06:** Spies on every outside request (Midtrans, Resend, AI providers),
  every URL, email and log line show the internal order ID nowhere,
  including email idempotency keys.
- **AC-07:** With no room for one more order (counting payable attempts),
  Bayar starts no payment, shows the full message, and records one
  `cap_full` notice per day.
- **AC-08:** Payable attempts are counted: three listed customers starting
  payment at once with a USD 5 cap get at most two windows. A window open
  across 00:00 UTC is counted on the new day.
- **AC-09:** A paid order whose cap filled after payment still runs to the
  end, within its own limit.
- **AC-10:** An unpaid order holds nothing; the hold is reserved at payment
  (on the UTC day of payment) or at test-pass creation, once per order, and
  settles at the end as in S3.
- **AC-11:** Only one attempt can be paid at a time; "Coba bayar lagi" while
  an attempt is payable reopens the same token. A payment on an ended order,
  or a second paid attempt, is stored as "needs refund" and sends one notice;
  the customer is not asked to pay again.
- **AC-12:** An unpaid order with an open window does not end before the
  window and grace end; with no attempt it ends after 2 hours.
- **AC-13:** A paid order is never ended by `previous_order_id`; after payment
  the browser locks website and business and never starts a new payment for
  that order.
- **AC-14:** A paid order with no approval after 7 days ends as
  `paid_not_started`: hold returned, customer failure email, one founder
  notice. A test pass still ends after 2 hours.
- **AC-15:** Status recovery: when a notification was lost, a returning
  customer's status check marks the order paid (including DANA through
  `transaction_id`); checks are limited to one per attempt per 30 seconds;
  "not found" means unpaid.
- **AC-16:** Refund before approval ends the order `refunded` with no AI
  work; after approval it is only recorded. `expire`, `cancel`, `deny` and
  `failure` end only that attempt and show the right message.
- **AC-17:** The test pass runs a full audit with no payment, marks the order
  and its ledger rows `test`, counts against the cap, keeps the code out of
  URLs and logs and in session storage only, and gives the same neutral
  answer for a wrong code, a short or missing secret, an unlisted email or
  a rate-limited caller.
- **AC-18:** Founder notices: crossing 80%, 90% and 100% each sends one email
  per UTC day, also after a restart and with two overlapping cron runs;
  passing two levels at once sends one email; `cap_full`, `paid_not_started`
  and `needs_refund` are separate and sent once each.
- **AC-19:** The payment-received email has the order number, amount,
  promise and "same browser" line, and no link or secret. Missing Midtrans
  or alert settings stop payment and test pass.
- **AC-20:** `verify-nuave` drives URL → order summary with price →
  simulated payment → intake → questions → report by link, in synthetic
  mode; the worst-case cron test passes with the new tasks; `npm run verify`
  passes.
- **AC-21 (live, needs named approval):** after deploy, one sandbox payment
  on production with a listed email reaches the report by email link, and
  one test-pass run does too. Record totals, order numbers, emails received,
  and the cron CPU time of the runs.

## Founder decisions (2026-10-13)

All open questions are answered. Yasir chose the recommended option in each
case.

- **Q1 — Email list:** stays in force for every order while Midtrans runs on
  sandbox (test-mode) keys, until G1.
- **Q2 — Hold timing:** the USD 2.00 hold is reserved when the payment is
  confirmed (R-11). Revision 3 also counts open payment windows in the cap
  check (R-10), so the overshoot the founder accepted is now limited to a
  payment confirmed after its window ended, which sends a notice.
- **Q3 — Payment window:** 60 minutes.
- **Q4 — Paid but intake not finished:** after 7 days the order ends as
  `paid_not_started`, the founder is emailed, and the founder refunds by hand.
- **Q5 — Delivery promise wording (approved):** "Laporan biasanya siap dalam
  15 menit setelah Anda menyetujui pertanyaan, paling lama 24 jam. Jika
  gagal, kami kembalikan uang Anda." Final legal wording of Terms and Privacy
  stays in S5.
- **Q6 — Test-pass entry:** an unlinked page `/uji` with one code field, plus
  an email on the founder's list.
- **Q7 — Missed notification:** when a customer returns to a waiting order,
  the server may ask Midtrans' status API directly (R-14).
- **Q8 — Founder alert address:** `hello@nuave.ai`, set as the Worker secret
  `NUAVE_FOUNDER_ALERT_EMAIL`.

**Founder actions before AC-21:**

- Midtrans sandbox account with QRIS, bank transfer, GoPay and DANA active.
  QRIS for other wallets needs GoPay or ShopeePay QRIS active.
- GitHub secrets: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
  `NUAVE_TEST_PASS_CODE` (at least 24 characters), `NUAVE_FOUNDER_ALERT_EMAIL`.
- In the Midtrans sandbox dashboard, set the Finish, Unfinish and Error
  redirect URLs to `https://v2.nuave.ai/audit`.
- The notification URL is sent per transaction (R-05), so the account's
  Payment Notification URL setting does not need to change. If it is empty,
  it may be set to `https://v2.nuave.ai/api/payments/midtrans/notification`.
  If it already points to another site (such as the old v0.1), leave it.
- The CI token keeps Worker-secret permission.

## Implementation notes

- New D1 migration: order columns for the order number (unique index, not a
  `UNIQUE` column: SQLite cannot add one), paid time, payment kind and the
  refund end code; a `test` mark on ledger rows; a unique index on
  `provider_spend(order_id)` where `kind = 'order_hold'`; tables for payment
  attempts (R-04), founder notices (R-21) and payment-received sends. "Paid"
  is a column, not a new state, so the `orders` state check is not rebuilt.
  `order_emails.kind` allows only `ready` and `failure`; the worker either
  rebuilds that check or uses the new send table, and says which.
- The cron already runs overlapping runs (300 s budget); every new task
  claims its row before it acts.
- Delivery plan: one PR, Sonnet worker, Opus review on the exact head, as in
  S3. Founder merges. The build runs in a new session after approval.

## Verification record

Complete after implementation:

- Verification artifact: `specs/017-payment-and-test-pass/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
