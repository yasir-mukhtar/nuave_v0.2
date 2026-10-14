# Spec 017: Payment, founder test pass and cap alerts (S4)

> Status: **In review — ready for founder approval.** Revision 6 passed the diff check (PASS+NOTES, notes applied). Build nothing before approval; the build runs in a new session.
> Owner: orchestrator
> Updated: 2026-10-14 (revision 6: closure-check findings B1–B4 and diff-check notes applied)
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
4. `specs/016-order-and-saved-report/SPEC.md` (what exists),
   `docs/journey/02-payment.md` (payment touchpoint guide; departures are
   listed below) and this spec
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
   notification, Get Status API, refunds, the override notification URL,
   and the DANA and GoPay/QRIS pages.

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
- Midtrans Snap checkout by redirect (sandbox keys), notification handling,
  status recovery and reconciliation, payment attempts.
- Paid-only gate on all paid work; a paid order can no longer be replaced.
- Short order number.
- Founder test pass.
- Hold moves from order creation to the moment of payment.
- Founder notices: cap alerts at 80%, 90%, 100%, "cap full", paid but not
  started, payment that needs a refund, rejected notifications.
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
3. Before payment starts, the server checks the daily cap (R-10). If there is
   no room: "Kuota audit sedang penuh. Coba lagi dalam beberapa jam." No
   payment is started; the founder is told (R-21).
4. Nuave sends the customer to Midtrans' hosted payment page (Snap redirect,
   as `docs/journey/02-payment.md` says). It offers QRIS, bank transfer,
   GoPay and DANA. Nuave never sees card, bank or wallet details. Midtrans
   sends its own payment instructions by email. After paying, or from the
   wallet app, the customer returns to `/audit` on the same browser.
5. **Paid:** "Pembayaran diterima", the order number, and the paid website
   reading and intake as today. From now on the website and business cannot
   be changed on this order; a wrong business is a support case (D5). The
   customer gets a Nuave "payment received" email.
6. **Waiting** (during the 60-minute window, chosen a method, not yet paid):
   "Menunggu pembayaran", with **Lihat cara bayar**, which goes back to the
   same Midtrans page. After the window, Experience 7 applies. The page
   checks the status. The customer may close the tab and come back on the
   same browser.
7. **Not paid yet.** While the 60-minute window is running, a denied,
   cancelled, failed or expired try shows an honest message and **Lihat cara
   bayar** (the same Midtrans page). After the window ends, the page says
   "Kami sedang memeriksa pembayaran Anda" with **Cek lagi**, and offers no
   new payment, until the attempt has a final answer (R-06). If Nuave cannot
   reach Midtrans for the check, it says "Status pembayaran belum dapat
   diperiksa" instead, also with **Cek lagi**. If the answer is
   "finally unpaid", the page says so and **Coba bayar lagi** returns to the
   order summary, which starts a replacement order (R-19) with a new
   payment.
8. **Paid order that cannot continue on this browser** (the order ended):
   the page never offers a new payment. It shows the order number and
   "Hubungi support@nuave.ai". A customer on another browser sees the entry
   screen, because progress lives in the original browser only; the payment
   email told them to use the same browser, and support finds the order by
   number.
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
  its `order_id`, such as `NV-7K3Q9P-2`; Midtrans may add it to the return
  URL, which is safe because it unlocks nothing.

### Payment attempts

- **R-04:** Payment attempts are stored in their own table: order, attempt
  number, Midtrans `order_id` (unique), window start and end, the Snap token
  and redirect URL, last status, payment method, amount and currency as
  received, refund state, and times. Every Midtrans `transaction_id` seen for
  the attempt is kept with its own status (one Snap `order_id` can have
  several tries). Rows are kept at least 24 months, like ledger rows, and are
  not removed with the order (D1). They hold no card, bank or wallet details.
- **R-05:** **Start payment.** A new route starts a payment for an open,
  unpaid order that is not a test-pass, legacy (R-23) or replaced order. Checks first: emergency switch,
  rate limit, email list (R-16), Midtrans and alert settings present (R-17),
  and the daily cap (R-10). It writes the attempt row (this claims the cap),
  then calls Snap. If Snap fails, the attempt is marked void: it holds no cap
  and blocks nothing, and the page offers a retry. The Snap request has:
  gross amount 99000 IDR; one item "Audit visibilitas AI" at 99000; the
  order email as customer email; enabled payments QRIS, bank transfer, GoPay
  and DANA; `expiry` with `start_time` now and a duration of 60 minutes
  (Q3); `page_expiry` of 60 minutes; `callbacks.finish`, the GoPay callback
  (turned on) and `dana.callback_url`, all set to `/audit` on
  `NUAVE_SITE_URL`; and the notification address in the
  `X-Override-Notification` header. Midtrans uses the account's dashboard
  Finish, Unfinish and Error addresses for the cases these fields do not
  cover, so those must also point to `/audit` (founder action). The route
  returns only the Snap redirect URL.
- **R-06:** **When an attempt can still take money.** An attempt is
  *open* from its start until it has a final answer:
  - **paid:** a transaction meets R-09;
  - **needs refund:** any other settled transaction (for example a wrong
    amount, R-12). Any settled transaction makes the attempt final;
  - **finally unpaid:** its window has ended plus a 30-minute grace and a
    further 60 minutes (longer than DANA's own expiry and Midtrans' first
    notification retries), and Get Status, asked by every known
    `transaction_id` and by `order_id`, answers `expire`, `cancel`, `deny`,
    `failure` or "not found", with no settled transaction;
  - **closed unknown:** no final answer 7 days after the window ended (R-14).
    It stops counting against the cap and no longer blocks the order, and it
    stays listed in `support refunds`; a support command can also close an
    attempt as unknown earlier.
  Midtrans `deny`, `failure`, `cancel` or `expire` notifications before then
  change only the message: Midtrans lets one `order_id` be tried again until
  it is paid or expires. A new attempt on the same order starts only when the
  order has no open attempt and has not ended; in practice a finally unpaid
  attempt comes after the order's own end time (R-07), so the customer starts
  again with a replacement order (Experience 7, R-19). If Get Status cannot
  answer (error, wrong key), the attempt stays open: the cron retries (R-14)
  and the page says the status cannot be checked yet.
- **R-07:** **Unpaid order lifetime.** An unpaid order ends (`expired`) at
  the later of 2 hours after creation and the end of its last attempt's
  window plus the grace. The four places that apply the 2-hour rule today
  (`orderInState`, `approveOrder`, `orderStatus`, `expireOpenOrders` in
  `store.ts`) use this one rule, and an order with an open attempt (R-06)
  never ends: `orderStatus` reports "checking payment" for it instead of
  `expired`. A replaced order (R-19) is ended in the same write. The write
  that ends an order checks, inside
  the same statement, that the order is still unpaid and its end time has
  passed, so a payment applied a moment earlier is never undone.

### Payment notification and status

- **R-08:** **Notification route** `/api/payments/midtrans/notification`:
  - It works even while the emergency switch is off. It only records
    payments; it starts no AI work.
  - It checks the signature: SHA-512 of the raw strings `order_id`,
    `status_code`, `gross_amount` (for example `99000.00`) and the server
    key, joined exactly as received.
  - It asks the Midtrans Get Status API for the notification's
    `transaction_id` and decides only from that answer (R-09).
  - Answers: 200 when handled, or when the signature is good but the
    `order_id` is unknown or the amount is wrong (recorded, ignored). 503 when
    the signature fails or the server key is missing (a wrong key on Nuave's
    side must not drop real payments silently; Midtrans retries 503 four
    times over about 2 hours) and on any unexpected error. A signature
    failure also records a `notification_rejected` founder notice.
  - It logs no email, key, signature or internal order ID.
- **R-09:** **When a transaction counts as paid.** The Get Status answer has
  `transaction_status` `settlement`, or `capture` with `fraud_status`
  `accept`; a `fraud_status`, when present, is `accept`; `gross_amount` is
  `99000.00`; currency is IDR; and `order_id` equals a stored attempt. A
  settled transaction for a stored attempt with a different amount or
  currency is not applied but becomes "needs refund" (R-12).
  Midtrans addresses: Snap `app.sandbox.midtrans.com` (production
  `app.midtrans.com`); API `api.sandbox.midtrans.com` (production
  `api.midtrans.com`), status at `/v2/{transaction_id or order_id}/status`.
  Basic auth is the base64 of the server key followed by ":".
- **R-10 (cap check before payment):** A payment starts only if today's cap
  total, plus one order limit (`NUAVE_ORDER_SPEND_LIMIT_USD`, now USD 2.00)
  for every open attempt of any order (R-06, counted across all days), plus
  one order limit for this one, is within the daily cap. This
  is one query. A payment confirmed while its attempt is open is already
  counted, so it cannot push the day past the cap. Only a payment confirmed
  after its attempt stopped being open (R-06) can; that sends a
  `late_payment_over_cap` notice when it does (R-21).
- **R-11:** **Marking paid.** When R-09 holds for a transaction and the
  order is unpaid, not replaced (R-19) and not a test pass, one write marks
  the order paid: paid time (Nuave's clock at that write), payment kind
  `midtrans`, the attempt and the `transaction_id` that paid. The same write
  sets the order's end time to paid time plus 7 days (R-13) and reserves the
  order-limit hold on the UTC day of the paid time, even if the cap is now
  full: the customer has paid. A unique index allows one hold row per order.
  **A late payment on an expired unpaid order that was not replaced revives
  it** as paid, as `docs/journey/02-payment.md` says ("treat it as paid"):
  the customer continues on the same browser. A second copy of the same
  notification, or a status check of the same transaction, changes nothing.
- **R-12:** **A paid transaction that cannot be applied** is stored as
  "needs refund" on its attempt, and the founder gets a `needs_refund`
  notice. This covers: the order already paid by another transaction (of
  this or another attempt), the order replaced by a newer order (R-19), a
  test-pass order, the wrong amount or currency (R-09), and the order already
  `failed`, `delivered` or refunded. The remedy is a refund by the founder,
  recorded per transaction (R-15). The customer is never
  asked to pay again for that order.
- **R-13:** **Paid order lifetime.** A paid order whose questions are not
  approved within 7 days of payment ends as `failed` with code
  `paid_not_started`. Its hold returns. The customer gets the S3 failure
  email with the order number; the founder gets a `paid_not_started` notice
  to refund by hand (Q4). The browser keeps progress for 7 days, the same
  span.
- **R-14:** **Status recovery** (Q7).
  - When the page asks for the status of an order with an open attempt, the
    server may ask Get Status: by the known `transaction_id`s, else by the
    attempt's `order_id`. It applies the result as in R-09 to R-12. Midtrans'
    return URL carries only `order_id` and status words, never a
    `transaction_id`; the server ignores its status words.
  - At most one Midtrans check per attempt per 30 seconds.
  - Midtrans answers DANA status only by `transaction_id`, so for DANA a
    "not found" by `order_id` proves nothing before the R-06 wait has
    passed.
  - **Cron reconciliation** runs before the expiry sweep in every cron run,
    for at most 2 attempts per run (oldest due first). It checks each open
    attempt whose window has ended: every 10 minutes for the first 2 hours,
    then hourly, until R-06 gives a final answer. If no final answer exists
    24 hours after the window ended, the founder gets a `payment_unknown`
    notice (one per attempt); checks continue daily, and after 7 days the
    attempt is closed as unknown (R-06).
- **R-15:** **Refunds and other late states.**
  - Only a full `refund` of the transaction that paid the order (R-11) ends
    the order: if its questions were not yet approved, the order ends as
    `failed` with code `refunded`, no AI work runs, and no failure email is
    sent (the S3 failure-email sweep skips this code). After approval, it is
    only recorded.
  - A refund of a "needs refund" transaction only closes that case.
  - `partial_refund` and `chargeback` are recorded and send a founder notice;
    they change nothing else. A chargeback before approval is treated like a
    full refund of the paying transaction.
  - A support command records a refund done outside Midtrans (for example a
    bank transfer refund, Q9). It names the **transaction**, not the order,
    and has the same effect as a Midtrans `refund` of that transaction.

### Email list and settings

- **R-16:** The founder's email list always applies in S4, to every order and
  test pass. Dropping it is a separate founder decision at G1.
- **R-17:** Settings, written by the deploy job as Worker secrets as in S3:
  `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION` (`false` until G1),
  `NUAVE_TEST_PASS_CODE`, `NUAVE_FOUNDER_ALERT_EMAIL` (`hello@nuave.ai`,
  Q8). The Snap redirect needs no client key in the page. If the server key,
  the production switch or the alert address is missing, no payment and no
  test pass start (fail closed). Preview workers never get real keys.
  Synthetic mode (local, tests, previews) uses a labeled simulated payment
  and never calls Midtrans.

### Paid-only gate and replacement

- **R-18:** Every step that costs AI money needs a paid, test-pass or
  legacy (R-23) order: `/api/audit/extract`, `/api/audit/glm-questions`,
  `/api/orders/approve`, and the cron's audit steps. An unpaid or refunded
  order is refused with the same neutral answer as today.
- **R-19:** **Replacement.** Orders get a `replaced_by` column.
  - `POST /api/orders` with `previous_order_id` marks the old order replaced
    only if it is unpaid, not a test pass, and has no open attempt, checked
    inside the same write; if the old order is still open, the same write
    also ends it, as in S3. This also works when the old order has already
    expired, so a late payment on it becomes "needs refund" (R-12) instead of
    reviving it.
  - If the old order is paid or has an open attempt, the new order is refused
    and the page shows the old order's state.
  - Test-pass and legacy (R-23) orders are handled as S3 does today in
    `expireSupersededOrder`: one that is still open (not started) is ended by
    the same write and its hold returns; one that has started or ended is
    left alone and the new order is made. An unknown ID is ignored.
  - R-05 refuses to start a payment on a replaced order.
  - The browser keeps an ended unpaid order's ID and sends it as
    `previous_order_id` when it starts a new order. After payment it locks
    the website and business, never sends a paid order as
    `previous_order_id`, and never turns an "ended" answer for a paid order
    into a new order (Experience 8).

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
    the 2-hour unstarted rule (not the 7 days) and never causes a
    `paid_not_started` or `paid_order_failed` notice. A real payment made on a
    test-pass order is "needs refund" (R-12).

### Founder notices and cap alerts

- **R-21:** **Founder notices** go to `NUAVE_FOUNDER_ALERT_EMAIL` and are
  recorded in one table. Daily kinds are keyed by (UTC day, kind); kinds
  about one order or transaction are keyed by (kind, subject), so they are
  never repeated on a later day. A notice is claimed in the table first and
  then sent, so overlapping cron runs never send it twice. Kinds:
  - `cap_80`, `cap_90`, `cap_100` (daily): the cron sees today's cap total
    (holds plus settled daily rows) at or above that share of the cap for
    the first time that day. When two levels pass at once, one email names
    the highest and records both.
  - `cap_full` (daily): a customer was turned away by R-10. Separate from
    `cap_100`.
  - `notification_rejected` (daily): a bad signature or a missing server key
    (R-08).
  - **Refund cases, per subject:** `paid_order_failed` (a paid, non-test
    order ended `failed` with any code except `refunded` and
    `paid_not_started`, for example a failed question or report, the order
    limit, or the deadline), `paid_not_started` (R-13), `needs_refund`
    (R-12), `payment_unknown` (R-14).
  - **Other per subject:** `late_payment_over_cap` (R-10), `partial_refund`
    and `chargeback` (R-15).
  - Each email says what happened, the order number when there is one, the
    amount and payment method, and the action. For refund cases it says the
    D3 deadline: refund within three business days. For the cap it says: to
    raise it, change `NUAVE_DAILY_SPEND_LIMIT_USD` in `ci.yml` and deploy; a
    change made only in the dashboard is overwritten by the next deploy.
  - A notice found in a web request is only recorded there; the cron sends
    it. Refund-case notices are retried until sent; others for 24 hours.
  - `npm run support -- refunds` lists every open refund case.

### Cron, emails and budget

- **R-22:** After an order is marked paid, the customer gets one Nuave
  "payment received" email (Resend, S3 sender) with the business name, the
  order number, the amount, the delivery promise (Q5), "Lanjutkan di browser
  yang sama untuk mengisi data bisnis Anda", and the support address. It has
  no link and no secret. The cron sends it, not the notification route
  (which must answer Midtrans quickly). Each send attempt has its own
  idempotency key, as in S3.
- **R-23:** **Cron tasks and budget.**
  - The cron's tasks that make no AI call (reconciliation, payment emails,
    founder notices, the expiry and 7-day sweeps) also run while the
    emergency switch is off or AI settings are missing; only audit steps stop.
    They need only the database, the Midtrans key (reconciliation) and the
    Resend settings (emails).
  - Order in each run: reconciliation, then sweeps, then any payment email
    or refund notice that has already waited one run, then audit steps, then
    the other emails and notices.
  - When a payment email or refund-case notice is due, the run reserves room
    in the S3 per-run meter for one of each before it starts audit steps. If
    the reservation and the next audit step do not both fit (a report step
    costs 27 of the 40 units), the audit step runs and the email or notice is
    sent in the next run; an email or notice that has already waited one run
    goes before audit steps. So none waits more than about two minutes, and
    report steps always get a run.
  - If the worker confirms from Cloudflare's docs that outside requests and
    D1 queries are now counted separately per invocation (Free: 50 each;
    Paid: 10,000 and 1,000), it may rebase the meter on the limits of the
    plan in use (Free during S4 testing, Q10), with the evidence in the PR.
  - The worker checks the current Workers limits for outside requests and D1
    queries per invocation in Cloudflare's docs, writes them in the PR, and
    extends `runner-worst-case.test.ts` to the new tasks. CPU time cannot be
    measured offline; AC-25 records it (Q10: Workers Paid before G1).
  - **Rollout:** S4 code sets a payment kind on every order it creates
    (`unpaid`, or `test` for a test pass). An order with no payment kind was made by S3 code
    (before the deploy, including the gap between the migration and the
    deploy) and counts as `legacy`: it may finish as in S3 (R-18). The
    migration gives existing orders an order number, and any order without
    one gets it before its next email.
### Support

- **R-24:** `npm run support` finds an order by its internal ID, its order
  number or a Midtrans `order_id`. `show` also prints: payment kind, paid
  time, every attempt and transaction with its status, and refund and "needs
  refund" states. New commands: `refunds` (R-21); recording a refund done
  outside Midtrans, by transaction (R-15); and closing an open attempt by its
  Midtrans `order_id`, either as "unknown" (R-06) or, after the founder has
  confirmed in the Midtrans dashboard that it was never paid, as "unpaid",
  which also removes it from `refunds`.

## Failure and recovery

| Failure | What the customer sees | What is kept | What happens next |
|---|---|---|---|
| Cap has no room | "Kuota audit sedang penuh. Coba lagi dalam beberapa jam." | Unpaid order | No money taken; `cap_full` notice |
| Snap call fails | "Pembayaran belum bisa dimulai", retry | Order; attempt void | Retry makes a new attempt |
| Payment pending (during the window) | "Menunggu pembayaran", Lihat cara bayar | Order, attempt | Notification, status check or cron marks it paid |
| Try denied, failed, cancelled or expired during the window | Honest message, Lihat cara bayar | Attempt (open) | Customer may try again on the same Midtrans page |
| Status cannot be confirmed yet | "Status pembayaran belum dapat diperiksa" | Attempt (open) | Cron keeps checking; `payment_unknown` notice after 24 h |
| Window ended, no final answer yet | "Kami sedang memeriksa pembayaran Anda", Cek lagi | Attempt (open) | Cron reconciliation (R-14) |
| Attempt finally unpaid | Coba bayar lagi (back to the order summary) | Old order (ended) | Replacement order (R-19) and a new payment |
| No final answer after 7 days | Order number and support | Attempt closed unknown | Listed in `support refunds`; founder checks Midtrans |
| Notification never arrives | During the window "Menunggu pembayaran"; after it "Kami sedang memeriksa pembayaran Anda" | Order | Status recovery, then cron reconciliation (R-14) |
| Signature fails or server key missing | — | `notification_rejected` notice | 503; Midtrans retries; founder fixes the key |
| Database or Midtrans down during a notification | — | — | 503, Midtrans retries |
| Duplicate notification | Nothing changes | Order paid once | No second hold, email or audit |
| Unknown order (good signature) | Nothing changes | Recorded without personal data | 200 |
| Settled with the wrong amount | Order number and support | Transaction marked "needs refund" | `needs_refund` notice |
| Payment lands after the unpaid order expired (not replaced) | Order continues as paid | Order revived | Customer continues on the same browser |
| Second paid transaction, or payment on a replaced, failed or delivered order | Order number and support | Transaction marked "needs refund" | `needs_refund` notice; founder refunds |
| Paid, then the audit fails | S3 failure email, with order number | Saved data, hold | `paid_order_failed` notice; founder refunds by hand (D3) |
| Paid, questions not approved in 7 days | S3 failure email | Order | `paid_not_started` notice; founder refunds |
| Full refund of the paying transaction before approval | — | Refund state | Order ends `refunded`; no AI work, no failure email |
| Paid, customer returns on another browser | Entry screen; old progress not there | Order | Payment email said to use the same browser; support finds the order by number |
| Emergency switch off | Audit "waiting" as in S3 | Payments still recorded | Payment emails and notices still sent; audit steps wait |
| Midtrans or alert settings missing | "Audit tidak tersedia saat ini." | — | No payment or test pass starts |

Never infer payment from the browser, from the return URL, or from an
unchecked notification.

## Departures from `docs/journey/02-payment.md`

- **Expiry:** the guide says to use Midtrans' method defaults (bank transfer
  often 24 hours). This spec uses one 60-minute window for every method
  (founder decision Q3), so the cap can count open payments (R-10).
- **Mismatched notification:** the guide says to check directly with
  Midtrans. This spec always checks with Get Status (R-08); a mismatch that
  remains after that check is recorded and ignored.
- **Unknown status:** the guide forbids a new attempt while a status is
  unknown. This spec agrees for 7 days (R-06); after that the attempt closes
  as "unknown", stays on the founder's refund list, and a new payment may
  start.
- **Retry after an unpaid attempt:** the guide keeps the same order for a
  new attempt. Here the order has usually ended by then, so "Coba bayar
  lagi" makes a replacement order with a new order number (R-19).
- **Expiry display:** the guide says to show the actual expiry per
  transaction. Midtrans' own page and emails show it; Nuave shows only the
  60-minute window.
- **Chargeback:** the guide says a chargeback stops unused fulfilment; this
  spec treats a chargeback before approval like a refund (R-15) and records
  it after.
- **Item name:** the guide includes the business in the item name. This spec
  uses "Audit visibilitas AI" only, so Midtrans does not receive business
  details.
- **Order access:** the guide mentions a private order link. S4 keeps
  progress in the browser only (Spec 016 Q4); support handles a lost
  browser by order number.

## Evidence, data, privacy, and cost

- **Payment data:** only what R-04 lists. Midtrans holds the rest under its
  own terms. Midtrans also emails the customer its own payment instructions
  and receipts (as the guide says).
- **Midtrans sees:** the order email, the amount, the item name and the
  order number with attempt. Never the business details, questions, report
  or the internal order ID.
- **Record lifetimes:** payment attempts, transactions and founder notices
  at least 24 months, like ledger rows; they are not removed with the report
  or a failed order. No deletion is built now.
- **Cost:** no new paid service; Midtrans charges per transaction (founder
  account). The test pass counts against the daily cap. No live AI call or
  real email during build or review. AC-01 to AC-24 run offline against a
  fake Midtrans and the fake mail sender. The live check (AC-25) needs a
  named founder approval and budget.
- **Logs:** never the email, the test code, a key, a signature or the
  internal order ID.

## Acceptance criteria

All except AC-25 run offline, with a fake Midtrans (Snap, notification and
Get Status) and the fake mail sender.

- **AC-01:** Given a listed email, when the customer pays, then the order is
  marked paid only after a notification whose signature and Get Status answer
  pass R-08 and R-09, and the intake continues. The Snap request has the
  R-05 contents.
- **AC-02:** Given a paid order, when the same notification or status check
  arrives again, then nothing changes: one hold, one payment email, one
  audit.
- **AC-03:** A good signature with an unknown `order_id`: 200, nothing
  changes. A settled transaction with a wrong amount or currency: "needs
  refund" and a notice. A bad signature or missing server key: 503 and one
  `notification_rejected` notice per day. A database or Midtrans error: 503.
  With the emergency switch off, notifications are still recorded.
- **AC-04:** An unpaid, replaced or refunded order is refused by every paid
  route and by the cron's audit steps, with no ledger row.
- **AC-05:** The order number is unique (collision retried), shown on screen
  once paid, in every customer email of the order and in `support show`; no
  route accepts it in place of the internal order ID; support finds an order
  by number and by Midtrans `order_id`, and `show` prints the R-24 lines; the
  close-attempt command closes an attempt as unknown or confirmed unpaid
  (which removes it from `refunds`).
- **AC-06:** Spies on every outside request (Midtrans, Resend, AI providers),
  every URL, email and log line show the internal order ID nowhere,
  including email idempotency keys.
- **AC-07:** With no room for one more order (counting open attempts),
  Bayar starts no payment, shows the full message, and records one
  `cap_full` notice per day. The start-payment route also obeys the
  emergency switch and its rate limit.
- **AC-08:** Open attempts are counted: three listed customers starting
  payment at once with a USD 5 cap get at most two attempts. An attempt
  open across 00:00 UTC is counted on the new day. A payment confirmed
  after its attempt stopped being open, when it passes the cap, records a
  `late_payment_over_cap` notice.
- **AC-09:** A paid order whose cap filled after payment still runs to the
  end, within its own limit.
- **AC-10:** An unpaid order holds nothing; the hold is reserved at payment
  (on the UTC day of payment) or at test-pass creation, once per order, and
  settles at the end as in S3.
- **AC-11:** While an attempt is open (R-06), no new attempt starts, even
  after `deny`, `failure`, `cancel` or `expire` of one try, and "Lihat cara
  bayar" returns to the same page. A DANA try that has no notification yet
  keeps the attempt open until the R-06 wait has passed. A failed Snap call
  voids its attempt. A payment cannot start on a test-pass order. A second
  paid transaction (same or other attempt), or a payment on a replaced,
  test-pass, failed, delivered or already refunded order, is stored as "needs
  refund" and sends one notice; the customer is not asked to pay again.
- **AC-12:** An unpaid order with an open attempt does not end, and its
  status reads "checking payment"; with no attempt it ends after 2 hours. A
  payment applied just before the ending write keeps the order paid (race
  test). A late payment on an expired, unreplaced unpaid order revives it as
  paid; on a replaced one it becomes "needs refund". After the window, the
  page offers "Cek lagi", not "Lihat cara bayar"; once finally unpaid, "Coba
  bayar lagi" makes a replacement order. Any settled transaction makes its
  attempt final; an attempt with no answer after 7 days closes as unknown,
  stops counting against the cap and is listed in `support refunds`.
- **AC-13:** A paid order, or an order with an open attempt, is never
  replaced; an ended unpaid order sent as `previous_order_id` is marked
  replaced (and ended if still open); an unknown ID or ended test-pass order
  is ignored; no payment starts on a replaced order; after payment the
  browser locks website and business and never starts a new payment for that
  order.
- **AC-14:** A paid order with no approval after 7 days ends as
  `paid_not_started`: hold returned, customer failure email, one founder
  notice. A test pass still ends after 2 hours.
- **AC-15:** Status recovery: when a notification was lost, a returning
  customer's status check marks the order paid, by `transaction_id` when
  known (DANA) or `order_id`; checks are limited to one per attempt per 30
  seconds; return-URL status words are ignored. When the customer never
  returns, cron reconciliation marks it paid. When Get Status keeps failing,
  the attempt stays open, the page says the status cannot be checked, and a
  `payment_unknown` notice is sent after 24 hours.
- **AC-16:** A full refund (or a chargeback) of the paying transaction
  before approval ends the order `refunded` with no AI work and no failure
  email; after approval it is only recorded. A refund of a "needs refund"
  transaction closes only that case and leaves the paid order running.
  `partial_refund` and `chargeback` send a notice. The support command for
  an outside refund names a transaction and has the same effect as a
  Midtrans `refund` of it.
- **AC-17:** The test pass runs a full audit with no payment, marks the order
  and its ledger rows `test`, counts against the cap, keeps the code out of
  URLs and logs and in session storage only, and gives the same neutral
  answer for a wrong code, a short or missing secret, an unlisted email or
  a rate-limited caller.
- **AC-18:** Founder notices: crossing 80%, 90% and 100% each sends one email
  per UTC day, also after a restart and with two overlapping cron runs;
  passing two levels at once sends one email; each per-subject kind is sent
  once ever, not again on a later day; a paid order failing during the audit
  sends one `paid_order_failed` notice; refund-case notices keep retrying
  until sent; each email has the R-21 contents; `support refunds` lists the
  open cases.
- **AC-19:** The payment-received email has the order number, amount,
  promise and "same browser" line, and no link or secret.
- **AC-20:** Missing Midtrans or alert settings stop payment and test pass.
  Preview workers run with no Midtrans keys and use the simulated payment.
- **AC-21:** With the emergency switch off, the cron still runs
  reconciliation, payment emails and notices, and no audit step.
- **AC-22:** The worst-case cron test passes with the new tasks: a due payment
  email or refund notice waits at most one run behind audit steps, report
  steps still run, and reconciliation handles at most 2 attempts per run;
  with the emergency switch off or AI settings missing, the non-AI tasks
  still run; orders without a payment kind (`legacy`) finish as before and
  get an order number. The PR states the current Cloudflare limits used.
- **AC-23:** The email list applies to every order and test pass, with
  `MIDTRANS_IS_PRODUCTION` set to either value.
- **AC-24:** `verify-nuave` drives URL → order summary with price →
  simulated payment → intake → questions → report by link, in synthetic
  mode; `npm run verify` passes.
- **AC-25 (live, needs named approval):** after deploy, one sandbox payment
  on production with a listed email reaches the report by email link, and
  one test-pass run does too. Record totals, order numbers, emails received,
  the cron CPU time of the runs, and whether a refund made in the Midtrans
  dashboard sends its notification to the address given per transaction
  (the docs say the override covers transaction notifications; if refunds
  do not arrive, the founder records them with the support command), and
  whether a DANA payment can be refunded from the Midtrans dashboard.

## Founder decisions (2026-10-13)

All open questions are answered. Yasir chose the recommended option in each
case.

- **Q1 — Email list:** stays in force for every order while Midtrans runs on
  sandbox (test-mode) keys, until G1.
- **Q2 — Hold timing:** the USD 2.00 hold is reserved when the payment is
  confirmed (R-11). The cap check also counts open attempts (R-10), so the
  overshoot the founder accepted is limited to a payment confirmed after its
  attempt stopped being open, which sends a notice.
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

## Founder decisions (2026-10-14)

- **Q9 — Bank transfer refunds: A.** Bank transfer stays. Midtrans cannot
  refund it from the dashboard, so the founder refunds a bank transfer by
  hand from the founder's bank, asking the customer for the account number
  by support email at that moment (never stored in Nuave), and records it
  with the support command (R-15).
- **Q10 — Workers plan: A.** The account moves to Workers Paid (USD 5 per
  month) before G1, the first real purchase, because the S3 live run used
  12–55 ms of CPU per cron run against Free's 10 ms. S4's sandbox testing may
  stay on Free. This replaces the 2026-10-13 decision "stay on Workers Free
  for now". CPU time is recorded in AC-25; R-23 has no offline CPU target.

**Founder actions before AC-25:**

- Midtrans sandbox account with QRIS, bank transfer, GoPay and DANA active.
  QRIS for other wallets needs GoPay or ShopeePay QRIS active.
- Midtrans customer payment emails turned on in the sandbox settings.
- GitHub secrets: `MIDTRANS_SERVER_KEY`, `NUAVE_TEST_PASS_CODE` (at least 24
  characters), `NUAVE_FOUNDER_ALERT_EMAIL`. A `MIDTRANS_CLIENT_KEY` secret is
  not needed (redirect checkout); it may stay if already added.
- In the Midtrans sandbox dashboard, set the Finish, Unfinish and Error
  redirect URLs to `https://v2.nuave.ai/audit`. Midtrans uses them for
  failed tries and some wallet returns that the per-transaction fields do not
  cover. If the old v0.1 site still uses the same Midtrans account, tell the
  orchestrator first.
- The notification address is sent with each transaction (R-05), so the
  account's Payment Notification URL does not need to change.
- The CI token keeps Worker-secret permission.

## Implementation notes

- New D1 migration: order columns for the order number (unique index, not a
  `UNIQUE` column: SQLite cannot add one), paid time, payment kind and the
  refund end code; a `test` mark on ledger rows; a unique index on
  `provider_spend(order_id)` where `kind = 'order_hold'`; tables for payment
  attempts and their transactions (R-04), founder notices (R-21) and
  payment-received sends. "Paid"
  is a column, not a new state, so the `orders` state check is not rebuilt.
  `order_emails.kind` allows only `ready` and `failure`; the worker either
  rebuilds that check or uses the new send table, and says which.
- The cron already runs overlapping runs (300 s budget); every new task
  claims its row before it acts.
- S4 adds about 5 fixed queries to every cron run (reconciliation, the 7-day
  sweep, payment emails, notices, the cap check). A report step (27 units)
  fits only if that fixed cost plus other work stays at or under 13 units of
  the 40-unit meter. Measure an idle run and a reconciliation of an attempt
  with several transaction IDs, and show it in `runner-worst-case.test.ts`.
- Cap blocking: each open attempt holds one order limit of the cap for at
  least 2.5 hours (window, grace and the R-06 wait), and at most 7 days if
  Midtrans never answers. With a USD 5 cap and USD 2.00 orders, one abandoned
  attempt plus one running paid order already leaves no room for a test pass.
  For G1, once the email list is dropped, revisit the cap or the counting.
- Delivery plan: one PR, Sonnet worker, Opus review on the exact head, as in
  S3. Founder merges. The build runs in a new session after approval.

## Plan review history

| Revision | Review | Verdict |
|---|---|---|
| 2 | Independent plan review, Opus max | FAIL (4 blocking); applied in revision 3 |
| 3 | Re-review, Opus max | FAIL (1 blocking: refund of a duplicate ended the real order); applied in revision 4 |
| 4 | Third review, Opus max | FAIL (1 blocking: no founder notice for a paid order that fails); applied in revision 5 |
| 5 | Closure check, Opus max | FAIL (4 contradictions from revision 5's text); applied in revision 6 |
| 6 | Diff check, Opus max | PASS+NOTES; notes applied in revision 6 |

## Verification record

Complete after implementation:

- Verification artifact: `specs/017-payment-and-test-pass/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
