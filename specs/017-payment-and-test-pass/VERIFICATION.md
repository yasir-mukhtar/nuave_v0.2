# Verification: Spec 017 — Payment, founder test pass and cap alerts (S4)

> Result: **Verified, with a founder-accepted exception.** Offline criteria AC-01 to AC-24 PASS+NOTES; AC-25 live run PASS on 2026-10-18, except the refund-notification check, which the Midtrans sandbox could not run (no merchant balance) and the founder moved to G1 (Midtrans production).
> Reviewer: independent Opus reviewers per slice and on the full PR (did not write the code)
> Date: 2026-10-14
> Spec version: revision 6 (approved 2026-10-14, merged in PR #136 as `5db12a4`), plus founder answers Q11, Q12 and Q13 given during the build
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
  shows only the order number and support (founder answer Q13 A).
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
| `38da817` | Full PR, Opus max, founder-requested ([comment](https://github.com/yasir-mukhtar/nuave_v0.2/pull/137#issuecomment-6169705849)) | PASS+NOTES | 24 h notice and 7-day close came about a day late under the real cron; closed-unknown and needs-refund screens still offered Kembali to a new payment; a paid order first seen as refunded or ended was not locked; no chargeback notice after a partial chargeback; fixed in `8493341` (red-green tests). Four founder questions raised |
| `d8ed6d5` | Founder answers Q14, Q15, Q17 (Opus) | PASS+NOTES | Refusal reason after a race; hold-guard half of Q14 untested; comments; exact 409 text; fixed in `e7d434a` (red-green where the code changed). One founder question raised (Q18) |

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| AC-01 | Pass | `payment-routes.test.ts` (paid only after a good signature and Get Status; Snap body and override header); `midtrans.test.ts` |
| AC-02 | Pass | `payment-routes.test.ts` (same notification or status check again; two copies at once: one paid write, one hold). One payment email and one audit follow by design (one paid order); not asserted directly |
| AC-03 | Pass | `payment-routes.test.ts` (unknown order 200 and recorded; wrong amount/currency needs refund; bad signature or missing key 503 with one notice per day; DB/Midtrans error 503; switch off still records) |
| AC-04 | Pass | `payment-foundations.test.ts` and `order-routes.test.ts` ("the paid-only gate"; no ledger row) |
| AC-05 | Pass | `payment-foundations.test.ts` (order number); `order-routes.test.ts` (number is not an order ID); `support.test.ts` (find by number and Midtrans order_id, `show`, `close`); `payment-journey.test.tsx` (number on screen once paid) |
| AC-06 | Pass | `payment-foundations.test.ts` (Resend, provider inputs, console); `payment-routes.test.ts` (Snap and Get Status requests; live AI adapter fetch spy); `founder-notices.test.ts` (new emails and keys) |
| AC-07 | Pass | `payment-routes.test.ts` (no room → no attempt, one `cap_full` per day; switch, rate limit); `payment-journey.test.tsx` and e2e `payment-screens.spec.ts` (full-cap message) |
| AC-08 | Pass | `payment-routes.test.ts` (three starts at once, USD 5 cap → at most two); `payment-lifecycle.test.ts` (open across 00:00 UTC; `late_payment_over_cap`) |
| AC-09 | Pass | `payment-foundations.test.ts` ("a paid order runs past a full daily cap, never past its own limit") |
| AC-10 | Pass | `order-routes.test.ts` and `payment-routes.test.ts` (unpaid holds nothing); `payment-lifecycle.test.ts` (hold at payment, on the UTC day, once); test pass holds at creation |
| AC-11 | Pass | `payment-routes.test.ts`, `payment-lifecycle.test.ts` (open attempt blocks a new one and returns the same page; DANA wait; void on Snap failure; no start on a test pass; every needs-refund case, one notice) |
| AC-12 | Pass | `payment-lifecycle.test.ts` (open attempt never ends; 2-hour rule; race; revive vs needs refund; finally unpaid → replacement; closed unknown just after 7 days with the every-minute cron); `payment-journey.test.tsx` and e2e (Cek lagi, Coba bayar lagi) |
| AC-13 | Pass | `payment-foundations.test.ts` and `order-routes.test.ts` (replacement rules); `payment-journey.test.tsx` (lock in waiting, try_failed, checking and cannot_check; lock after payment; 409 keeps the old order; 409 after "Coba bayar lagi" continues as paid; closed-unknown and needs-refund screens locked with no path to Bayar; a paid order first seen as ended or refunded is stored as paid and locked) and e2e (paid lock on the review) |
| AC-14 | Pass | `founder-notices.test.ts` (7 days → `paid_not_started`, hold returned, failure email, one notice; test pass keeps 2 hours) |
| AC-15 | Pass | `payment-lifecycle.test.ts` (recovery by order_id and transaction_id; 30 s limit; return-URL words ignored; cron marks paid; Get Status failing → cannot check, `payment_unknown` just after 24 h with the every-minute cron; Q12 second try found by order_id) |
| AC-16 | Pass | `payment-lifecycle.test.ts` (refund/chargeback before and after approval; needs-refund refund; partial refund; Q11 partial chargeback); `support.test.ts` (`refunded` by transaction, wrangler path, half-way repeat) |
| AC-17 | Pass | `order-routes.test.ts` ("the founder test pass, server side"; one neutral answer incl. rate limit); `uji.test.tsx`; e2e `/uji` (session storage only, not in URLs or saved intake); the full audit on a test pass: `npm run test:workers` (test-pass orders delivered by the cron) and the e2e journeys that use a test pass |
| AC-18 | Pass | `founder-notices.test.ts` (80/90/100 once per day, restart and overlapping runs, two levels at once, per-subject once ever, refund cases retried, contents); `support.test.ts` (`refunds`) |
| AC-19 | Pass | `founder-notices.test.ts` (payment-received email contents, no link or secret) |
| AC-20 | Pass | `order-routes.test.ts` and `payment-routes.test.ts` (missing settings stop payment and test pass in live mode); `payment-routes.test.ts` "simulated payment (synthetic mode)"; `wrangler-config.test.ts` (preview gets no keys); PR preview pages load |
| AC-21 | Pass | `cron.test.ts` ("the cron with the emergency switch off or AI settings missing"); live-mode reconciliation with the switch off: `runner-worst-case.test.ts` ("with the switch off or AI settings missing…") |
| AC-22 | Pass | `runner-worst-case.test.ts` ("the spec 017 tasks in the cron's run budget": idle run, large reconciliations, worst mix ≤ 40, waits at most one run, legacy orders) |
| AC-23 | Pass | `order-routes.test.ts`, `payment-routes.test.ts` (email list; the start route is tested with both production switch values, order creation and the test pass with `false`; the email-list code does not read the switch) |
| AC-24 | Pass | `npm run verify` green on `aa24489` (reviewer) and `f2ce2a6` (worker); `verify-nuave drive all` 6/6 PASSED on `aa24489` (run `20261014T104333Z-8mas`) and on the `38da817` code (Opus max review, run `20261014T132843Z-c5tc`), both in git-ignored `.local-evidence/`, with a local `lsof` stand-in outside the repo (this sandbox's `lsof` cannot see the listener) |
| AC-25 | Pass, with founder-accepted exception (2026-10-18) | Founder-run on production, budget worst case USD 4.00 approved. Paid order NV-45M3AW and test-pass order NV-SQ7SPT both reached the report by email link; total USD 0.4048. Refund check moved to G1. See [AC-25 live run](#ac-25-live-run-2026-10-18) |

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
- `npm run verify` on `e7d434a` (worker): 2314 unit tests; passed. On
  `d8ed6d5`: 2312 unit tests, browser 62 + 3, passed; `npm run test:workers`
  31 checks green, bundle 2963.53 KiB.
- `npm run verify` on `8493341` (worker): 2296 unit tests, browser 62,
  disabled-config 3, passed. `npm run test:workers` on `8493341`
  (orchestrator): 31 checks green, bundle 2963.21 KiB gzipped.
- `npm run verify` on `f2ce2a6` (worker): 123 unit files, 2289 tests;
  browser 62; disabled-config 3; passed.
- PR CI `validate`: success on `789c291` and `aa24489`; the exact merge head
  is checked by CI on the PR.
- Every fix in `f2ce2a6` has a test shown failing without it (the reviewer
  repeated this for the lock tests and the 409 test).

## Findings

No open blocking or should-fix finding. The questions from the Opus max review are answered (Q14–Q17) and built; Q18 (A) is built in PR #138. Notes kept, for the founder:

- **Q13 (answered A):** after 7 days with no Midtrans answer the screen
  shows only the order number and support, no new payment.
- **Email list in synthetic mode:** R-16 says the list "always applies in
  S4"; the code applies it in live mode only, as S3 does. Synthetic orders
  spend nothing and call no outside service.
- The behaviour left open by the spec and decided in code is listed under
  Requirements trace and in the PR.
- Not tested offline: real Midtrans pages, CPU time, the support command's
  wrangler batch against a remote database (it is safe to repeat). AC-25
  covers the first two.

## AC-25 live run (2026-10-18)

Run by Yasir on production (`v2.nuave.ai`, worker version
`e2e70345-3bcb-4cbd-9f1c-40c70b3e7d6a`, PRs #137 and #138 deployed), with
Midtrans sandbox keys and an email on the founder's list. Budget: worst case
USD 4.00 approved (Q16). Order rows read from production D1 with read-only
queries; no write was made by an agent.

**Paid order NV-45M3AW** (QRIS through GoPay, sandbox):

| Step | Time (UTC) | Evidence |
|---|---|---|
| Order created | 04:46:20 | `orders.payment_kind = midtrans` after payment |
| Paid | 04:49:17 | One attempt `NV-45M3AW-1`; Midtrans dashboard "Settlement", QRIS, Rp99.000; stored transaction `settlement / paid / qris / IDR / 99000.00` |
| Payment-received email | 04:50 | Received by the founder; order number, amount, promise, "browser yang sama" line, support address, no link |
| Questions approved | 04:52:42 | |
| Report saved, ready email | 05:03:17 | Received; private link, order number, support address |
| Hold | — | Reserved on the payment day (2026-10-18), settled to USD 0.202972 of 2.00; no overrun |

- Return URL carried `order_id=NV-45M3AW-1&status_code=200&transaction_status=settlement`;
  the page ignored those words and showed "Pembayaran diterima" from the
  server's own status.
- The Midtrans page showed QRIS, bank transfer, GoPay and DANA (founder,
  2026-10-18). Q15 (missing currency) was not needed: the answer carried
  `IDR`.
- The first press of "Lanjut" after payment showed "Halaman website belum
  dapat dibaca…": the founder's site answered Nuave's server slowly. A
  second press worked. No AI spend happened before the read. Addressed by
  PR #139 (one automatic retry) and a follow-up (founder Option A: up to
  10 s per try, 12 s per read). After #139 was deployed, the free first
  check on masryef.com still failed 3/3 (both tries timed out); the live
  re-check after Option A is pending.

**Test pass NV-SQ7SPT** (`/uji`, no payment): created 07:02:58, approved
07:04:07, report saved and ready email accepted 07:15:19; received by the
founder. `payment_kind = test`, no payment attempt, every ledger row marked
`test`, hold settled to USD 0.188271 of 2.00. An earlier test-pass order
NV-J25U6S was ended when the founder started NV-SQ7SPT (one website reading,
USD 0.013517).

**Total live spend:** USD 0.404760 (0.202972 + 0.188271 + 0.013517).
Question writing is still counted at its full USD 0.05 reservation per
order, as in S3 (the provider's actual cost is not settled).

**Refund check: founder-accepted exception.** A refund of NV-45M3AW from the
Midtrans sandbox dashboard was refused by Midtrans: "Sorry, your refund
request was declined due to merchant insufficient funds." The sandbox account
holds no balance, so whether a dashboard refund sends its notification to the
per-transaction address, and whether a DANA payment can be refunded from the
dashboard, could not be observed. Yasir moved both checks to G1 (the first
real purchase and refund, on Midtrans production), 2026-10-18.

**Cloudflare (dashboard, last 24 hours, all invocations of `nuave-v2`, not
only the cron):** CPU time P50 197 ms, P90 337 ms, P99 414 ms, P999 418 ms;
median CPU 196.84 ms; 1.89k invocations; errors 0, "Exceeded CPU Time
Limits" 0. Outside requests in the window: api.openai.com 12, masryef.com 3,
api.resend.com 2, api.sandbox.midtrans.com 2, api.cheaperinference.com 1,
app.sandbox.midtrans.com 1. The account is still on Workers Free; these
figures are far above Free's 10 ms, which supports Q10 (move to Workers Paid
before G1).

## Verdict

**Verified, with a founder-accepted exception (2026-10-18).** AC-01 to AC-24
pass offline on the final head; AC-25 passes on production for the paid path
and the test pass. The refund-notification and DANA-refund checks move to G1
on Midtrans production.
