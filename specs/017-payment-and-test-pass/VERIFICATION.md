# Verification: Spec 017 — Payment, founder test pass and cap alerts (S4)

> Result: **Offline criteria PASS+NOTES** (AC-01 to AC-24, final exact-head review; notes fixed). **AC-25 (live) not run**: needs a named founder approval and budget. Spec 017 is not Verified until AC-25 passes.
> Reviewer: independent Opus reviewers per slice and on the full PR (did not write the code)
> Date: 2026-10-14
> Spec version: revision 6 (approved 2026-10-14, merged in PR #136 as `5db12a4`), plus founder answers Q11 and Q12 given during the build (Q13 open)
> Implementation: [PR #137](https://github.com/yasir-mukhtar/nuave_v0.2/pull/137), branch `claude/vibrant-noether-5n3b4o`

## Scope reviewed

- **S4a** (`44e8718..d158cf0`): migration 0006; order number; payment kind
  (`unpaid`, `test`, `midtrans`, `simulated`; none = legacy); `replaced_by`;
  the hold moved from order creation to payment; the R-10 cap-room rule; the
  founder test pass on the server; email idempotency keys without the
  internal order ID; the paid-only gate.
- **S4b** (`d158cf0..174faaa`): migration 0007; Midtrans client (Snap, Get
  Status, signature); payment attempts and transactions; `POST
  /api/payments/start`; `/api/payments/midtrans/notification`; marking paid,
  needs refund, refunds and chargebacks; the R-07 lifetime rule; status
  recovery; the reconciliation function.
- **S4c** (`174faaa..c6f96c0`): migration 0008; founder notices and cap
  alerts; payment-received email; 7-day sweep; cron order and per-run meter;
  support commands `refunds`, `refunded`, `close`; founder answers Q11 and Q12.
- **S4d** (`c6f96c0..cb4d3dd`): order summary with price and promise; Midtrans
  return, waiting and checking screens; locks while a payment is open and
  after payment; replacement order; `/uji`; synthetic simulated payment;
  `verify-nuave` skill; `ci.yml` Worker secrets. The closed-unknown screen
  shows only the order number and support (founder question Q13 open).
- Environments: unit tests (vitest with the SQLite D1 stand-in and a fake
  Midtrans), browser tests (Playwright on `next dev` with local D1), the built
  worker in `wrangler dev` (`npm run test:workers`), the `verify-nuave`
  drives, and the PR preview worker (pages load; no order was made there).
  No live AI call, no real email, no Midtrans call (sandbox included) and no
  remote database write were made.

## Review history

| Head | Scope | Verdict | Result |
|---|---|---|---|
| `f6cbdd2` | S4a | PASS+NOTES | Neutral answer for a rate-limited test pass; overrun flag on replace; fixed in `d158cf0` |
| `d271905` | S4b | PASS+NOTES | DB error no longer reads as "cap full"; ignored notifications recorded; every transaction asked at the final check; notice label; status poll bounded to 12 s; late-payment notice in the same write; fixed in `174faaa` |
| `19c4d31` | S4c | FAIL | An attempt with 5+ transactions blocked the cron for good; per-run meter reached 45 of 40; fixed in `f591f06` |
| `f591f06` | S4c re-review | FAIL (one should-fix) | A chargeback-ended order was still listed in `support refunds`; fixed in `c6f96c0` (red-green test) |
| `0bbade8` | S4d | PASS+NOTES | 409 replacement saved the old order under the new business; lock while a payment is open; closed-unknown screen; no simulated payment on production; fixed in `cb4d3dd` |
| `aa24489` | Full PR, exact head | PASS+NOTES | Two S4d fixes lacked tests; chargeback email wording; no refund notice after an outside refund; stuck 409 after "Coba bayar lagi"; trim test-pass secret; stale comment; fixed in `f2ce2a6` (red-green tests) |
| `23cef95` | Delta re-check, exact head | PASS+NOTES | Fixes confirmed red-green; notes were wording only, fixed in the next commit |

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| AC-01 | Pass | `payment-routes.test.ts` (paid only after a good signature and Get Status; Snap body and override header); `midtrans.test.ts` |
| AC-02 | Pass | `payment-routes.test.ts` (same notification or status check again; two copies at once) |
| AC-03 | Pass | `payment-routes.test.ts` (unknown order 200 and recorded; wrong amount/currency needs refund; bad signature or missing key 503 with one notice per day; DB/Midtrans error 503; switch off still records) |
| AC-04 | Pass | `payment-foundations.test.ts` and `order-routes.test.ts` ("the paid-only gate"; no ledger row) |
| AC-05 | Pass | `payment-foundations.test.ts` (order number); `order-routes.test.ts` (number is not an order ID); `support.test.ts` (find by number and Midtrans order_id, `show`, `close`); `payment-journey.test.tsx` (number on screen once paid) |
| AC-06 | Pass | `payment-foundations.test.ts` (Resend, provider inputs, console); `payment-routes.test.ts` (Snap and Get Status requests; live AI adapter fetch spy); `founder-notices.test.ts` (new emails and keys) |
| AC-07 | Pass | `payment-routes.test.ts` (no room → no attempt, one `cap_full` per day; switch, rate limit); `payment-journey.test.tsx` and e2e `payment-screens.spec.ts` (full-cap message) |
| AC-08 | Pass | `payment-routes.test.ts` (three starts at once, USD 5 cap → at most two); `payment-lifecycle.test.ts` (open across 00:00 UTC; `late_payment_over_cap`) |
| AC-09 | Pass | `payment-foundations.test.ts` ("a paid order runs past a full daily cap, never past its own limit") |
| AC-10 | Pass | `order-routes.test.ts` and `payment-routes.test.ts` (unpaid holds nothing); `payment-lifecycle.test.ts` (hold at payment, on the UTC day, once); test pass holds at creation |
| AC-11 | Pass | `payment-routes.test.ts`, `payment-lifecycle.test.ts` (open attempt blocks a new one and returns the same page; DANA wait; void on Snap failure; no start on a test pass; every needs-refund case, one notice) |
| AC-12 | Pass | `payment-lifecycle.test.ts` (open attempt never ends; 2-hour rule; race; revive vs needs refund; finally unpaid → replacement; closed unknown at 7 days); `payment-journey.test.tsx` and e2e (Cek lagi, Coba bayar lagi) |
| AC-13 | Pass | `payment-foundations.test.ts` and `order-routes.test.ts` (replacement rules); `payment-journey.test.tsx` (lock in waiting, try_failed, checking and cannot_check; lock after payment; 409 keeps the old order; 409 after "Coba bayar lagi" continues as paid) and e2e (paid lock on the review) |
| AC-14 | Pass | `founder-notices.test.ts` (7 days → `paid_not_started`, hold returned, failure email, one notice; test pass keeps 2 hours) |
| AC-15 | Pass | `payment-lifecycle.test.ts` (recovery by order_id and transaction_id; 30 s limit; return-URL words ignored; cron marks paid; Get Status failing → cannot check, `payment_unknown` at 24 h; Q12 second try found by order_id) |
| AC-16 | Pass | `payment-lifecycle.test.ts` (refund/chargeback before and after approval; needs-refund refund; partial refund; Q11 partial chargeback); `support.test.ts` (`refunded` by transaction, wrangler path, half-way repeat) |
| AC-17 | Pass | `order-routes.test.ts` ("the founder test pass, server side"; one neutral answer incl. rate limit); `uji.test.tsx`; e2e `/uji` (session storage only, not in URLs or saved intake) |
| AC-18 | Pass | `founder-notices.test.ts` (80/90/100 once per day, restart and overlapping runs, two levels at once, per-subject once ever, refund cases retried, contents); `support.test.ts` (`refunds`) |
| AC-19 | Pass | `founder-notices.test.ts` (payment-received email contents, no link or secret) |
| AC-20 | Pass | `order-routes.test.ts` and `payment-routes.test.ts` (missing settings stop payment and test pass in live mode); `payment-routes.test.ts` "simulated payment (synthetic mode)"; `wrangler-config.test.ts` (preview gets no keys); PR preview pages load |
| AC-21 | Pass | `cron.test.ts` ("the cron with the emergency switch off or AI settings missing") |
| AC-22 | Pass | `runner-worst-case.test.ts` ("the spec 017 tasks in the cron's run budget": idle run, large reconciliations, worst mix ≤ 40, waits at most one run, legacy orders) |
| AC-23 | Pass | `order-routes.test.ts`, `payment-routes.test.ts` (email list with either production switch value) |
| AC-24 | Pass | `npm run verify` green on `aa24489` (reviewer) and `f2ce2a6` (worker); `verify-nuave drive all` 6/6 PASSED on `aa24489` (reviewer), run `20261014T104333Z-8mas` in git-ignored `.local-evidence/`, with a local `lsof` stand-in outside the repo (this sandbox's `lsof` cannot see the listener) |
| AC-25 | Not run | Live sandbox check after deploy; needs a named founder approval and budget |

## Requirements trace

Every requirement R-01 to R-24 is built and covered by at least one
criterion above. Behaviour the spec left open, decided in code and listed in
the PR: founder email wording (English); the try-failed wording on the
customer screen; the `PREVIOUS_ORDER_ACTIVE` refusal wording (fallback
only); the payment-received email is retried for 24 hours after payment and
then dropped; a chargeback of a needs-refund transaction stays on the
`refunds` list; the 24-hour deadline sweep pauses with the emergency switch
(as S3).

## Documentation checked (2026-10-14)

- **Midtrans:** signature formula, notification retries (503 retried four
  times, about 2 hours), paid rule, Get Status URL, auth and "not found"
  shape, DANA status by `transaction_id` only, Snap endpoint and redirect URL,
  `expiry`, `page_expiry`, `callbacks.finish`, GoPay callback,
  `dana.callback_url`, `X-Override-Notification` (transaction notifications
  only): all match the spec. Differences: the QRIS payment name in
  `enabled_payments` is `other_qris`; the Snap advanced-feature page does not
  list QRIS or DANA (the DANA page gives `dana`); `chargeback` is not
  described on the notification page; production hosts were not confirmed
  on these pages. AC-25 must confirm that QRIS and DANA appear on the Snap
  page.
- **Cloudflare:** outside requests per invocation Free 50 / Paid 10,000;
  requests to Cloudflare services Free 1,000 / Paid 10,000; D1 queries per
  invocation Free 50 / Paid 1,000. The pages do not say how D1 queries count
  against these limits, so the S3 40-unit per-run meter was kept (R-23).
  CPU time cannot be measured offline; AC-25 records it.

## Checks run

- `npm run verify` on `cb4d3dd` (worker): 122 unit files, 2276 tests passed;
  browser tests 62 passed; disabled-config browser tests 3 passed; "Offline
  verification passed". One earlier run had a single failure in the
  offline-network mobile navigation test that passed alone and on the full
  re-run.
- `npm run test:workers` (S4c and S4d workers): 31 checks green; worker
  bundle 2962 KiB gzipped of the 3072 KiB limit.
- `npm run verify` on `aa24489` (final reviewer): 122 unit files, 2276
  tests; browser 62; disabled-config 3; passed. `npm run test:workers` on
  `aa24489`: 31 checks green, bundle 2962.47 KiB gzipped of 3072.
- `npm run verify` on `f2ce2a6` (worker): 123 unit files, 2289 tests;
  browser 62; disabled-config 3; passed.
- PR CI `validate`: success on `789c291` and `aa24489`; the exact merge head
  is checked by CI on the PR.
- Every fix in `f2ce2a6` has a test shown failing without it (the reviewer
  repeated this for the lock tests and the 409 test).

## Findings

No open blocking or should-fix finding. Notes kept, for the founder:

- **Q13 (open):** after 7 days with no Midtrans answer the screen shows
  only the order number and support, no new payment. The spec's Departures
  allow a new payment; its Failure table shows support only.
- **Email list in synthetic mode:** R-16 says the list "always applies in
  S4"; the code applies it in live mode only, as S3 does. Synthetic orders
  spend nothing and call no outside service.
- The behaviour left open by the spec and decided in code is listed under
  Requirements trace and in the PR.
- Not tested offline: real Midtrans pages, CPU time, the support command's
  wrangler batch against a remote database (it is safe to repeat). AC-25
  covers the first two.

## Verdict

**Offline: PASS (with notes).** AC-01 to AC-24 pass on the final head.
**Spec 017 stays "built, not verified"** until AC-25, the live sandbox run
after the founder merges and deploys, passes with a named approval.
