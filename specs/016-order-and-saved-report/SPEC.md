# Spec 016: Order, saved report and private link (S3)

> Status: **Approved** by the founder on 2026-10-12 (revision 6, `a006048`; [decision](../../docs/DECISION_LOG.md#2026-10-12--approve-spec-016-s3)). Implementation may begin with S3a.
> Owner: orchestrator
> Updated: 2026-10-12 (revision 6: plan re-review notes 1–10 applied)
> Implements: S3 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md),
> plus the per-order cost limit that the plan lists under S4
> Decision basis: [S0 decision, 2026-10-05](../../docs/DECISION_LOG.md#2026-10-05--s0-private-report-delivery-and-recovery-approved)
> (D1–D8 and the ten flows); S2 spending cap (PR #127); founder answers in
> "Founder decisions" below
> Number: 015 is taken by the held, unadopted paid-report draft on
> `docs/stage2-paid-report-spec`. This spec does not use or adopt it.

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/PAYING_CUSTOMER_PLAN.md`: §2, §4.2, §5 S3 and S4
3. `docs/DECISION_LOG.md`: the 2026-10-05 S0 entry
4. This spec
5. Code: `src/lib/spending/` (ledger, provider spend, sqlite test helper),
   `src/app/api/audit/*/route.ts`, `src/lib/audit/openai.ts`,
   `src/lib/audit/protected-observation-provider.ts`,
   `src/lib/audit/telemetry.ts`, `src/lib/audit/retry.ts`,
   `src/lib/audit/report-recovery.ts`, `src/lib/audit/deployment-gate.ts`,
   `src/lib/intake/SmartIntakeJourney.tsx`, `src/lib/intake/smart-session.ts`,
   `src/lib/intake/glm-local.ts`, `src/app/audit/`, `wrangler.jsonc`,
   `open-next.config.ts`, `next.config.ts`, `.github/workflows/`
6. `.agents/skills/verify-nuave/`, `tests/e2e/journey.ts`,
   `scripts/verify-offline.mjs`

Do not load: `archive/`, Spec 015, old checkpoints.

## Problem

**Evidence.** Today `/audit` has no order and asks for no email. The free
identity lookup runs first; then a paid AI reading of the website
(`/api/audit/extract`, up to about USD 0.41 reserved per attempt) runs before
the "is this your business?" screen (`SmartIntakeJourney.tsx`). The audit runs
inside the open tab: the run route passes the tab's stop signal into the
audit, so closing the tab stops it. The browser holds the answers and sends
them back to write the report. Nothing is saved on the server. S2 limits total
AI cost per UTC day, but one audit has no cost limit of its own.

**Interpretation.** A customer who pays (S4) must not lose the audit or the
report when they close the tab, must be able to open the report later on any
device, and must not cause AI cost before they give an email (and, in S4,
pay). Nuave must also know the most one order can hold, so the daily cap says
how many orders fit in one day.

## Desired outcome

The customer enters a website and confirms the business from a free lookup.
They give an email; Nuave saves an order. Only then does Nuave read the website
with AI. After the customer approves the ten questions, the audit runs on the
server. The customer can close the tab. When the report is ready, Nuave saves
it and emails a private link. The link opens the same report on any device
until it expires or is switched off. An order never holds more than its own
limit.

## User and situation

The owner or marketing lead of a small Indonesian business, on a phone or a
laptop. Before S4, only the founder (and emails on the founder's list, Q6)
can run a live order. They may close the tab during the audit and expect the
report by email.

## Scope

- New screen order: free brand confirm, then the order screen, then the paid
  website reading (D1).
- The saved order, with its email, in D1.
- The audit and report run on the server (cron runner) and continue after the
  tab closes.
- Each finished step is saved, so no finished step is paid for twice.
- The saved report page, opened by a private link, with today's PDF (browser
  print) and JSON downloads.
- The report-ready and failure emails, through Resend.
- The neutral "not available" page.
- Founder support script: resend, replace, switch off, show.
- The per-order cost limit.
- The founder-only email list for live orders until S4 (Q6).
- Intake progress kept in the customer's browser (Q4).
- A separate preview database, and database change files (migrations).

## Non-scope

- Payment, price, Midtrans, the founder test pass (S4).
- Cap alert emails to the founder (S4).
- Final customer wording, terms and privacy (S5). S3 uses the draft wording
  below.
- Intake progress on another device, or a "continue" email link (Q4).
- Accounts, passwords, a dashboard, report history, self-service link
  recovery, a stored PDF file.
- Changing the recipient email (D5): by hand, outside S3.
- Handling email bounces: the founder checks the Resend dashboard.
- Answers-only recovery for order-bound audits: a failed order is handled by
  the founder by hand (D3); the support script can show the saved answers.
- Deleting any record. S3 stores expiry dates and blocks access after them.
- Any change to the audit method, the questions or the report content.

## Experience

| # | Screen | What the customer sees |
|---|---|---|
| 1 | Entry | Unchanged |
| 2 | Reading (free) | Short wait while the free lookup runs. No AI. |
| 3 | Brand confirm | "Ini brand yang ingin Anda audit?" with the business name and website from the free lookup only. |
| 3a | **Order summary (new)** | Business name and website, what the report includes, an email field (required), `Lanjut`. No price, no payment. |
| 3b | **Preparing (new place)** | Today's step-by-step "Nuave sedang membaca" while the paid reading runs under the order. |
| 4–14 | Intake and question review | Unchanged |
| 15 | Audit running | Progress by question. New line: "Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke email Anda." |
| 15a | Audit done (open tab) | "Laporan Anda sudah siap dan kami kirim ke email Anda." The tab does not show the report itself. |
| 16 | Report | Opens from the email link. Same report, PDF and JSON buttons as today. |
| — | Not available | "Laporan ini tidak tersedia." No business name, no reason. |
| — | Audit failed | "Audit belum bisa diselesaikan. Kami sudah mencatatnya dan akan menghubungi Anda lewat email." |

If the daily cap cannot hold one more order, or the email is not on the list
(Q6), screen 3a shows today's "Audit tidak tersedia saat ini." and no order
is made.

**Draft email wording (S5 finalizes):**

- Ready: "Laporan audit untuk <bisnis> sudah siap: <link>. Siapa pun yang
  memegang link ini bisa membuka laporan, jadi jangan teruskan. Link berlaku
  12 bulan. Bantuan: support@nuave.ai."
- Failed: "Audit untuk <bisnis> belum bisa diselesaikan. Kami akan menghubungi
  Anda dalam 1 hari kerja. Bantuan: support@nuave.ai."

## Requirements

### Order

- **R-01:** Screen 3 uses only the free identity lookup. Screen 3a requires one
  valid email. `Lanjut` makes one order. The paid reading (screen 3b) starts
  only after that succeeds, and uses the website saved on the order. Going
  back past screen 3a to change the website or brand starts a new order.
- **R-02:** The order ID has at least 128 random bits, is made by the server,
  and never appears in a URL. The server records the email, business name,
  website, mode (`live` or `synthetic`), environment (`production` or
  `preview`), state and times. The browser never sets the state, a cost, a
  mode or a time.
- **R-03:** Order states and the paid calls allowed in each:

  | State | Allowed paid calls | Next state |
  |---|---|---|
  | `open` | website reading, question writing | `running` (questions approved), `expired` |
  | `running` | questions (cron only) | `reporting`, `failed` |
  | `reporting` | report (cron only) | `delivered`, `failed` |
  | `delivered`, `failed`, `expired` | none | — |

  The server refuses a paid call with no order, an unknown order, or the
  wrong state.
- **R-04:** For order-bound work the server ignores any observations, resume
  data, costs or `safety_identifier` from the browser. The `safety_identifier`
  comes from the order ID, never the email. The old browser-driven
  `/api/audit/run` and `/api/audit/report` refuse every request; question
  approval plus the cron replace them.
- **R-05:** Order creation has a per-IP rate limit (Cloudflare rate limiter,
  like the other routes). No IP address is stored.
- **R-06 (Q6):** In live mode, an order is made only if the email is on
  `NUAVE_ORDER_EMAIL_ALLOWLIST`: a Cloudflare secret, never in
  `wrangler.jsonc` or Git, matched without case after trimming spaces. An
  empty or missing list allows no live order. Synthetic mode has no list but
  never sends a real email (R-28).

### Per-order cost limit (S2 ledger)

- **R-07:** The order limit is set on the server only
  (`NUAVE_ORDER_SPEND_LIMIT_USD`, default **USD 2.00**, D2). A value that is not
  a number, is negative, or is above the daily cap fails closed.
- **R-08 (hold):** Synthetic orders write no ledger rows and hold nothing;
  the cap applies only to live orders, as in S2. Making a live order writes the order record and one ledger row
  of kind `order_hold`, which carries the order ID, is dated the UTC creation
  day, and holds the limit. Both writes are one D1 batch. The hold insert is
  one conditional statement that checks the day's total, like S2. If the cap
  cannot hold it, nothing is written.
- **R-09 (calls):** Each paid call for an order writes a ledger row of kind
  `order_call` with the order ID. It is one conditional insert that succeeds
  only if: the order's hold is not settled; the order is in a state that
  allows the call; and the order's call total (settled plus held) plus this
  reservation is not more than the amount in the order's own hold row (not the
  current setting). The daily sum counts `order_hold` and other rows, and
  leaves out `order_call` rows, so nothing counts twice and no later day's cap
  stops the order. A call that would pass the hold is not sent.
- **R-10 (settle):** When the order becomes `delivered`, `failed` or
  `expired`, one D1 batch changes the state and settles the hold row to the
  sum of its call rows (settled plus held unknown costs). The rest returns to
  the creation day's cap.
- **R-11:** A call may cost more than its reservation (S2 settles the actual
  cost). An order whose total passes its hold is flagged and shown by the
  support script.
- **R-12:** The worker reports in the PR the peak hold of one order: the actual
  cost of a normal order (about USD 0.20) plus the largest single reservation
  (about USD 0.41). At USD 2.00 an order survives about three calls with
  unknown cost; the next is refused and the order fails (founder accepted, D2).
- **R-13 (database changes):** Table changes are SQL files in `migrations/`
  (`wrangler d1 migrations`). Migration 1 is `CREATE TABLE IF NOT EXISTS
  provider_spend` with today's columns, so new databases match; later
  migrations add columns that are nullable or have defaults (the old worker
  runs between migration and deploy) and never drop data. The
  create-on-first-use code in `spend-ledger.ts` is removed. The deploy job applies them before it deploys; the
  preview job applies them to the preview database. `SpendDb` and the sqlite
  test helper gain `batch` and `first`.

### Environments

- **R-14:** PR previews use their own D1 database (`nuave-v2-preview`, founder
  creates it, Q5) through a `preview` environment in `wrangler.jsonc`.
  Previews have no cron and no runner: a preview journey stops at screen 15,
  and the full path is checked locally (AC-20). `env.preview` sets
  `crons: []` explicitly and declares its own D1 and rate-limiter bindings.
  A test reads `wrangler.jsonc` and fails if a preview cron exists.
  Production is the only worker with a cron. Every runner and route touches
  only orders whose environment matches its own.

### Server-side audit (cron runner)

- **R-15 (runner):** A Cloudflare cron trigger on the production worker runs
  every minute. Today's mode and keys are build-time values that OpenNext
  loads only for web requests, so the cron cannot see them. The deploy job
  therefore also sets the values the cron needs as Worker vars and secrets:
  mode, emergency switch (`NUAVE_NEW_AUDIT_ENABLED`), daily cap, order limit,
  site address, the email list, and the keys the mode needs (synthetic needs
  none). The handler reads only these, from the cron's own environment. If a
  needed value or the database is missing, off or unclear, it does nothing. It never runs an order whose stored mode differs from its own.
- **R-16 (Free plan, D3):** The account is on Workers Free. Each cron run does
  at most one audit step per order (one question attempt, or one report run
  including its language fix) and stops starting new work after a time
  budget, with a margin, based on R-18's explicit call timeout. AC-21 records
  the real times. The worker checks
  the current Free limits (CPU, outbound requests, D1 queries, cron triggers)
  in Cloudflare's docs and writes them in the PR. If one audit step cannot fit,
  the worker stops and asks the founder (a paid plan needs founder approval).
- **R-17:** Approval first runs today's checks from the run route: the
  question pack lock, the identity guard and `validateDirectTenQuestions`.
  Then it moves the order to `running` in one batch
  that saves, unchanged from then on: the confirmed business details, the ten
  approved questions and their original wording, the mode, the start time
  (the D2 clock) and the deadline (start + 24 hours).
- **R-18 (one runner at a time):** A runner claims the order with an owner
  token and a lease that expires (one conditional update). It renews the lease
  before each question claim and each paid call, and stops if renewal fails.
  It claims each question the same way. Every provider call has an explicit
  timeout; the claim lasts longer than that timeout. Each finished question is
  saved before the next starts. A resumed run does only questions with no
  saved result.
- **R-19 (retry counts):** Attempts per question and report calls per order are
  stored in D1 and checked from there, not from a per-request budget. Today's
  limits apply: 3 attempts per question; the report follows
  `classifyReportRecovery` (`src/lib/audit/report-recovery.ts`). A call cut off
  mid-flight counts as one attempt, and its cost stays held (S2).
- **R-20:** After ten saved results, the order moves to `reporting`; the
  runner writes and saves the report. The saved report never changes.
- **R-21:** The tab shows progress by asking for the order status. The answer
  has the state and question progress only: never the report, the email or the
  link secret.
- **R-22 (expiry):** An `open` order 2 hours after creation becomes `expired`
  on the next cron run, which settles it (R-10).
- **R-23 (end states):** `reporting` → `delivered` when the report is saved,
  the link is active, and Resend has accepted the ready email (S0 D2). An order
  that cannot finish (attempts used, report recovery says final, hold reached)
  becomes `failed` then. At the deadline, an order not yet `delivered` becomes
  `failed`. Becoming `failed` happens once and sends the failure email.
  "Completion" (the start of the 12-month clock) is the moment the report is
  saved.

### Private link and email

- **R-24:** Each send of the ready email makes a new link secret with at least
  128 random bits and replaces the stored hash in the same write, so only the
  newest link works (D4). Only the hash is stored. The link is
  `<site>/r#<secret>`, where `<site>` is a fixed setting per environment
  (`https://v2.nuave.ai` in production, localhost in local tests), never the
  request's host. The secret is after `#`, so it is not in request logs. The
  page sends it in a POST body to get the report. It works until 12 months
  after completion or until switched off.
- **R-25:** Emails go through Resend. An idempotency key covers only retries
  of one attempt, with the same body, so one attempt never sends twice. A
  later attempt (a later cron run, or `resend`) is a new send with a new key
  and a new secret; the customer may get a second email, and only the newest
  link works (D4). The business name is escaped in the email. Each send
  is recorded with its result. The ready email is retried until the deadline;
  the failure email is retried for 24 hours after the failure. Retrying an
  email never reruns the audit or rewrites the report (D3).
- **R-26:** A valid secret opens the saved report on any device with no login
  and no provider call. The page and its data are `noindex`, `no-store`, and
  send no referrer.
- **R-27:** A wrong, expired or switched-off secret gets the same response
  (status code, headers and page) and starts no provider call. The report-data
  route has a per-IP rate limit.
- **R-28:** Synthetic mode never calls Resend. It uses a fake sender. In local
  development only, the fake sender writes the email to an ignored folder
  (`.local-evidence/test-mail/`), so tests can read the link. It never serves
  it over HTTP.

### Intake progress (Q4: option A)

- **R-29:** The intake progress (answers, prepared summary, questions) and the
  order ID are kept in the browser's local storage. If the customer closes the
  tab and opens `/audit` again in the same browser, the journey continues at
  the same screen. No completed paid step is repeated.
- **R-30:** If the saved order has expired, the customer sees screen 3a again
  and types the email again. `Lanjut` makes a new order (same list and cap
  check), and the saved progress continues on it with no new paid call.
- **R-31:** The intake progress is removed from the browser when the audit
  starts, and after 7 days. Only the order ID stays until the order ends, so a
  reload shows screen 15 or 15a; then it is removed too. The email is never
  kept in local storage.

### Support (founder only)

- **R-32:** A founder-run script (`npm run support -- <command> <order-id>`)
  uses `wrangler` against D1 and the founder's Resend key from a git-ignored
  file. No public admin endpoint. It checks the order ID format strictly
  before use, keeps the email out of SQL text, and never prints a secret.
  Commands:
  - `resend`: new secret, old one stops, email to the same address (D4, D8);
  - `off`: switch the link off (the order state does not change);
  - `show`: state, times, costs, overruns, saved answers; the email only with a
    flag.

  The founder first confirms through the order email (D7). The script never
  sends to another email. Its database and sender can be replaced in tests.

### Tests and local development

- **R-33:** Local development and the offline tests use a local D1 database
  (`initOpenNextCloudflareForDev()` with the migrations applied). The runner is
  started in tests by a trigger that exists only when `NODE_ENV` is
  `development` and the mode is synthetic; production builds do not contain
  it; the built worker answers 404 to it. Local rate limiters are given
  test-only limits high enough for the suite (every local request is the same
  caller), and a missing binding in dev is not a 503. The R-15 cron proof
  fires the cron first, in a fresh `wrangler dev --test-scheduled` on the
  built worker, with values set the same way as the deploy job (no `--var`),
  and shows the cron sees the same settings and database as a request.

## Failure and recovery

| Failure | Saved | Customer sees | Retried |
|---|---|---|---|
| Daily cap full, or email not on the list | Nothing | "Audit tidak tersedia saat ini." | Customer tries later |
| Tab closed or worker restart | Finished steps | Email when ready | Unfinished steps only, within R-19 |
| A question uses all attempts | Finished questions | Failure screen and email | No; founder by hand (D3) |
| Order hold reached | Finished steps | Failure screen and email | No |
| Report step fails | All ten results | Waiting, then email or failure | Per `classifyReportRecovery` |
| Email fails | Report | Nothing new | Email only, until the deadline |
| Bad, expired or switched-off link | — | "Laporan ini tidak tersedia." | — |
| Emergency switch off | Everything | Waiting | Nothing runs until it is on again |

Never invent a result, a report or a delivery. A failed question is never shown
as an answer.

## Evidence, data, privacy, and cost

- **Storage:** orders, saved results, reports and send records go in the
  existing D1 database (`nuave-v2-spend`), in the same database as the ledger,
  so one statement can check an order's hold (R-09). Previews use
  `nuave-v2-preview`.
- The email goes only to D1 and Resend. Never to an AI prompt, analytics, logs
  or Git. The link secret never goes to logs, analytics or Git.
- Record lifetimes: see Q3. No deletion is built or authorized.
- **Infrastructure:** Workers Free, D1 and one cron trigger (R-16). No paid plan
  without founder approval.
- **No live AI calls** during the build or review. AC-21 needs a separate named
  founder approval, with its budget.

## Acceptance criteria

The cost criteria (AC-04 to AC-09) run against the real ledger code on the
sqlite D1 test helper with a fake paid provider. The others run in synthetic
mode on local D1 unless named.

**Order and screens**

- **AC-01:** Given a website, the screens before 3a make no paid call (the fake
  provider counts zero). With an email on the list, `Lanjut` makes one `open`
  order, then the paid reading runs. A missing, bad or not-listed email makes
  no order; an empty or missing list makes no live order.
- **AC-02:** A paid route called with no order, an unknown order, or a state
  that does not allow it (R-03) is refused with no provider call. Browser-sent
  observations or costs are ignored. `/api/audit/run` and `/api/audit/report`
  refuse every request.
- **AC-03:** Order creation past the per-IP rate limit is refused. No IP is
  stored in D1.

**Money**

- **AC-04:** An invalid, negative, or above-cap order limit makes order
  creation fail closed.
- **AC-05:** With less room in the daily cap than one order limit, order
  creation is refused and the database is unchanged.
- **AC-06:** When the next call would pass the order's hold, it is not sent
  and the order ends `failed`. A higher limit set after the order was made does
  not change that order's hold.
- **AC-07:** A running order still finishes within its hold when other spend
  fills the daily cap, and when the UTC day changes mid-run; the new day's
  total is unchanged by it.
- **AC-08:** After `delivered`, `failed` or `expired`, the hold equals the sum
  of its call rows, and the rest is back in the cap. A call insert after the
  hold is settled is refused. A crash between the two writes of R-08 or R-10
  leaves neither.
- **AC-09:** An order whose actual cost passes its hold is flagged and shown by
  `show`.

**Runner**

- **AC-10:** With some finished questions, when the tab closes, or the run
  stops and restarts, or two runners start on one order: the audit completes,
  no saved question is called again, two runners never call the same question
  at once, and a question cut off mid-call uses at most its 3 attempts.
- **AC-11:** With the mode, database or a needed key missing, or the emergency
  switch off, the cron does nothing. The built worker answers 404 to the
  dev-only trigger. No preview cron exists in `wrangler.jsonc`. A runner never runs an order whose mode or
  environment differs from its own.
- **AC-12:** With a test clock, an `open` order is `expired` 2 hours after
  creation, and a `running` order with no accepted ready email is `failed` at
  its deadline, with one failure email. The start time and deadline never
  change after approval.
- **AC-13:** A report that `classifyReportRecovery` marks final makes the order
  `failed` with no more report calls.

**Link and email**

- **AC-14:** A completed audit gives one ready email (fake sender). Its link
  opens the same report in a fresh browser with no cookies and no provider
  call; PDF and JSON work; the response has `noindex`, `no-store` and
  no-referrer headers. The status answer never has the report, email or
  secret. The order becomes `delivered` only after the send is accepted.
- **AC-15:** A random, expired or switched-off secret gets an identical
  response (status, headers, body), with no business data and no provider
  call. The report-data route has a rate limit.
- **AC-16:** A failed send inside one attempt is retried with the same
  idempotency key; a later attempt uses a new key and a new secret, and only
  the newest link works. Each adds a send record, and does not rerun the audit or report. Synthetic mode never
  calls Resend.
- **AC-17:** Support script: `resend` makes the old link fail and the new one
  work, to the same address; `off` gives the neutral page and keeps the state;
  `show` hides the email unless asked; an unknown or badly formed order ID
  sends nothing.
- **AC-18:** The email and the link secret do not appear in any provider
  request, log line or analytics event (tests check request bodies and logs).

**Browser progress and the whole path**

- **AC-19:** At intake screen 8, when the tab closes and `/audit` opens again in
  the same browser, the journey is at screen 8 with the same answers and no
  completed paid step repeated. With an expired order, the customer types the
  email again, a new order is made, and the answers stay. Progress is gone
  after the audit starts or after 7 days; a reload during the audit shows
  screen 15 or 15a; the email is never in local storage. A synthetic order
  writes no ledger rows.
- **AC-20:** `verify-nuave` drives URL → brand confirm → order → preparing →
  intake → questions → close tab → report by link, in synthetic mode, with
  evidence in the PR. The cron proof (R-33) and the Free-plan limits (R-16) are
  in the PR. `npm run verify` passes.
- **AC-21 (live, needs named approval):** after the combined deploy, one live
  run on production with a listed email reaches the report by email link. Its
  recorded total and the time of each cron run are shown, and the total is
  within the hold.

## Delivery plan

A Sonnet worker builds each part. An Opus reviewer gives a verdict on each.
Both go live in **one** merge to `main`, because every merge deploys.

- **S3a** (PR against `main`, reviewed, not merged): migrations, preview
  database, order and screen order, list, per-order limit, browser progress,
  cron runner and report, status progress, and the fake sender (so the
  failure email and `delivered` can be tested). Must pass AC-01 to AC-13 and
  AC-19.
- **S3b** (PR against the S3a branch): link, report page, emails, not-available
  page, support script. Must pass AC-14 to AC-18 and AC-20.
- After S3b passes, it merges into the S3a branch. The combined S3a PR gets a
  final review on its exact head, then the founder merges once. AC-21 follows,
  with named approval.

## Founder decisions (2026-10-12)

- **Q1 / D2 — Order limit: USD 2.00.** Each order holds USD 2.00 of the daily
  cap until it ends; unused money returns. With the USD 5 cap, at most 2 orders
  run at the same time in one UTC day (the day starts at 07:00 Jakarta time).
  An order survives about three AI calls with unknown cost. In S4 the hold moves
  to the moment of payment.
- **Q2 — Unstarted order expiry: 2 hours.**
- **Q3 — Record lifetimes** (expiry dates only; no deletion now):
  - Order with email, saved business details and questions, saved results,
    report, send records: 12 months after completion (D1).
  - Order that failed or expired: 30 days, unless a support case is open.
  - Link secret hash: ends with the report, when replaced, or when switched off.
  - Ledger rows (order ID and costs, no email): 24 months, as cost records.
  - Browser progress: on the customer's device, 7 days at most (R-31).
  - Resend's copy of each email (has the link): Resend's own retention, set to
    the shortest available.
  - Cloudflare logs: never hold the email or secret; kept for Cloudflare's own
    period. No IP address is stored by Nuave.
- **Q4 — Intake progress: option A** (browser only).
- **Q5 — Founder actions before review:** create the Resend key for
  `nuave.ai` and confirm the domain; check that Resend open and click tracking
  is off for the domain (this may also affect v0.1 mail on `nuave.ai`); create
  the free D1 database `nuave-v2-preview`; give the CI Cloudflare token D1
  edit permission (for migrations) and Worker secret permission (R-15); put
  only unpublished addresses on the email list.
- **Q6 — Live orders only for the founder's email list until S4.**
- **D1 — Screen order:** free brand confirm → order → paid reading → intake.
- **D3 — Plan:** Workers Free (R-16).
- **D4 — A resend makes a new link; the old one stops.**

## Verification record

- Verification artifact: `VERIFICATION.md` (added when implementation starts)
- Result: Pending
