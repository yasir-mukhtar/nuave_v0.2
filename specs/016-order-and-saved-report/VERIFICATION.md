# Verification: Spec 016 — Order, saved report and private link (S3)

> Result: **Offline criteria PASS+NOTES (AC-01 to AC-20); AC-21 pending (live run, needs named founder approval)**
> Reviewer: independent Opus reviewer (did not write the code)
> Date: 2026-10-12
> Spec version: revision 6, `a006048` (approved 2026-10-12)
> Implementation: [PR #129](https://github.com/yasir-mukhtar/nuave_v0.2/pull/129), branch `claude/nuave-stage-3-spec-je7pqf`; last reviewed head `da04910` (PASS+NOTES); notes closed in `beb86ab` and this record

## Scope reviewed

- S3a (`70cc93f..0e8bba1`): migrations, preview database and environment,
  orders and the new screen order, email list, per-order limit, browser
  progress, cron runner and server-side report.
- S3b (`0e8bba1..9caa6f5`): private link and `/r` page, report-data route,
  Resend sender, ready and failure emails, retry backoff, support script,
  restored report-page browser tests, verify-nuave skill update.
- Environments: unit tests (vitest, sqlite D1 stand-in), browser tests
  (Playwright on `next dev` with local D1), the built worker in `wrangler dev
  --test-scheduled` (`scripts/test-workers.mjs`), and the PR preview worker.
  No live AI call, no real email and no remote database write were made.

## Review history

| Head | Scope | Verdict | Result |
|---|---|---|---|
| `b51512a` | S3a | PASS+NOTES | 7 notes fixed in `89b1821`, `52e9e98` |
| `52e9e98` | S3a | FAIL | Deadline cap allowed a paid step on an overdue order; fixed in `a7edecc` |
| `a7edecc` | S3a | PASS+NOTES | Ledger now refuses calls past the deadline (`3afbf02`) |
| `0adebd2` | S3a+S3b | PASS+NOTES | 7 notes fixed in `9caa6f5` |
| `da04910` | S3a+S3b, final | PASS+NOTES | New run-mix test added in `beb86ab`; this record corrected (AC-20 evidence, figures) |

## Acceptance results

| Criterion | Result | Evidence |
|---|---|---|
| AC-01 | Pass | `order-routes.test.ts`; `order-journey.test.tsx`; `smart-journey.test.tsx` (free lookup → brand → order → paid reading) |
| AC-02 | Pass | `order-routes.test.ts` (paid routes need an order; run/report routes 410); `test-workers.mjs` |
| AC-03 | Pass | `order-routes.test.ts` (rate limit, no stored IP) |
| AC-04 | Pass | `order-routes.test.ts`; `config.ts` (limit 0 refused) |
| AC-05 | Pass | `spend-ledger.test.ts`; `order-routes.test.ts` |
| AC-06 | Pass | `spend-ledger.test.ts`; `runner.test.ts` (own hold, later setting ignored) |
| AC-07 | Pass | `spend-ledger.test.ts`; `runner.test.ts` (cap full, UTC day change) |
| AC-08 | Pass | `spend-ledger.test.ts` (settlement, settled hold refuses calls, crash between batch writes) |
| AC-09 | Pass | `spend-ledger.test.ts`; `runner.test.ts`; `support.test.ts` (`show` prints OVERRUN) |
| AC-10 | Pass | `runner.test.ts` (one runner at a time, restart, attempts); `test-workers.mjs` restart check |
| AC-11 | Pass | `cron.test.ts`; `wrangler-config.test.ts` (no preview cron); `test-workers.mjs` (dev trigger 404, switch off, mode unclear or missing) |
| AC-12 | Pass | `runner.test.ts` (expiry, deadline, overdue orders get no paid step) |
| AC-13 | Pass | `runner.test.ts` (report recovery final) |
| AC-14 | Pass | `report-link.test.ts`; e2e `new-intake-glm.spec.ts` AC-14; `test-workers.mjs` |
| AC-15 | Pass | `report-link.test.ts` (identical neutral answer, rate limit); e2e AC-15; `test-workers.mjs` |
| AC-16 | Pass | `report-link.test.ts`; `mail.test.ts`; synthetic mode never calls Resend (fetch spy) |
| AC-17 | Pass | `support.test.ts` (`resend`, `off`, `show`, bad ID, sender made before the link changes) |
| AC-18 | Pass | `report-link.test.ts` (provider inputs and console lines); `mail.test.ts` (key never logged) |
| AC-19 | Pass | `order-journey.test.tsx`; e2e reload, ended order, 7-day removal; synthetic order writes no ledger rows |
| AC-20 | Pass, with founder-accepted evidence exception (2026-10-13) | `npm run verify` passes on `da04910` (reviewer). The verify-nuave drives (6 features, 0 external requests) passed in the worker's sandbox on a pre-fix S3b head (run `20261012T193415Z-6z5v`), with screenshots kept only in the git-ignored `.local-evidence/`. They are **not attached to the PR** and were **not re-run on the final head**: the reviewer's sandbox blocks the skill's port check (`lsof`). The same journey is covered by the browser tests in `npm run verify`. |
| AC-21 | Pending | Live run on production after the combined deploy, with a listed email; needs named founder approval and budget |

## Requirements trace

Every requirement R-01 to R-33 maps to at least one criterion above. Recorded
deviations, all accepted by the reviewer:

- The cron reaches the runner through an internal request with a per-isolate
  key (404 to the web). A second bundle would not fit the Free size limit.
- Live orders and the cron need `RESEND_API_KEY` and `NUAVE_MAIL_FROM`.
  Without them no live order is taken.
- Resend open and click tracking is a domain setting, not per email (founder
  action).
- `resend` after `off` switches the link on again with a new secret.
- A report step runs alone in its cron run, so one run stays within the Free
  plan's limits.
- A failed order with no accepted ready email has its link cleared. The saved
  report is kept for the founder.
- The ready-email idempotency key includes a hash prefix of the secret, so a
  crash cannot cause a refused retry. A lost acceptance record can still
  cause a second email, and then only the newest link works (D4).

## Measurements

- One cron run, worst live mixes (tests in `runner-worst-case.test.ts` and
  `runner.test.ts`, measured on `beb86ab`): an email-only delivery plus a
  report step uses 40 D1 queries and 10 outbound requests; a report step alone
  uses 33 and 9; two question steps use at most 40. The tests fail above 40
  queries or 10 outbound requests. The Free plan allows 50 of each.
- Worker size: 2924 KiB gzipped on `da04910` against the Free limit of 3072 KiB (95%).
- Largest single reservation: USD 0.41. A normal order holds at most about
  USD 0.61 at one time; at USD 2.00 an order survives 4 unknown-cost calls.
- Not measured offline: CPU time per cron run against Free's 10 ms. This is
  recorded in AC-21.

## Checks run

- `npm run verify` (reviewer, at `da04910`): 114 files / 1993 unit tests;
  Playwright 51 + 3. The sandbox's stock browser is missing, so the browser
  run used the installed Chromium.
- `node scripts/test-workers.mjs` (reviewer, at `da04910`): 30/30.
- CI `validate` and `Deploy PR preview`: green on `da04910`.

## Open before merge

- Founder: GitHub secrets `RESEND_API_KEY` and `NUAVE_MAIL_FROM`; Resend
  domain confirmed with tracking off and the shortest retention; the local
  `.secrets/resend-api-key` and `.secrets/resend-from` files for
  `npm run support`.
- After merge and deploy: AC-21 with named approval.

## Verdict

**Pass with one pending criterion and one founder-accepted evidence exception.** All offline
criteria pass. AC-20's browser-drive evidence is local only (see above). AC-21
stays pending until the founder-approved live run.

**Founder decision, 2026-10-13:** Yasir accepted the AC-20 evidence exception
(drive screenshots local only and from a pre-fix head; the final head is
covered by the browser tests in `npm run verify`). The AC-21 live run after
the merge is the end-to-end check with real email.
