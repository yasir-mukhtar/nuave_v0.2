# Plan: first real paying customer

> Status: **Draft for review**. It becomes the active plan when the founder
> approves it and the approval is recorded in `DECISION_LOG.md`.
> Author: orchestrator (Claude), 2026-09-27
> Baseline: `main` at `3c07495`
> Inputs: [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md), `NOW.md`, and the two
> 2026-09-27 readiness reviews (Codex and Claude) in `docs/reviews/`
>
> **Fresh agents: start here.** The ledger in §1 is the current state. Read
> §2 for the finish line and §5 for your milestone. Read `NOW.md` only if you
> need history.

## 1. Progress ledger

The orchestrator updates this table after each reviewer PASS. Nobody else
edits it.

| # | Milestone | Owner | State | PR | Verdict |
|---|---|---|---|---|---|
| F0 | Founder decisions (§4) | Founder | Not started | — | — |
| F1 | Accounts: Midtrans, Resend, Cloudflare storage (§4.2) | Founder | Not started | — | — |
| M0 | Reset the working docs + Spec 013 | Orchestrator | Not started | — | — |
| M1 | Security patches | Worker | Not started | — | — |
| M2 | Server storage + spending cap | Worker | Not started | — | — |
| M3 | Saved report with a private link | Worker | Not started | — | — |
| M4 | Audit keeps running after the tab closes | Worker | Not started | — | — |
| M5 | Report-ready email + "send my link again" | Worker | Not started | — | — |
| M6 | Real payment (Midtrans sandbox) | Worker | Not started | — | — |
| M7 | Customer-facing words: price, promise, terms | Worker | Not started | — | — |
| M8 | Go-live check with one real payment | Founder + worker | Not started | — | — |
| V | Show reports to 3–5 real owners (runs in parallel) | Founder | Not started | — | — |

## 2. Finish line

Nuave is ready for paying customers when a stranger can do all of this without
the founder stepping in:

1. Open `v2.nuave.ai`, enter their business, and see Nuave recognize it (free).
2. See the price (Rp99.000), what they get, and the delivery promise.
3. Pay through Midtrans (QRIS, bank transfer, GoPay, DANA).
4. Confirm the business summary and approve ten questions.
5. Start the audit. They may close the tab and the audit still finishes.
6. Receive an email with a private link to the report.
7. Open the report on any device with that link and download the PDF.
8. Ask for the link again if they lose the email.
9. If the audit fails, Nuave tells them and the founder refunds by hand.

Everything else, including polish, is **after** this works. The founder
accepted the current report on 2026-09-26; report quality is not a gate here.

## 3. Where we are

### What the original plan wanted, and what happened

[`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md) set nine phases: simulated shell →
Indonesian → live report → durable delivery → real payment → polish → pilot →
launch → re-check.

| Plan phase | State on 2026-09-27 |
|---|---|
| 0–1 Simulated shell | Done (Spec 001) |
| 2 Indonesian contract | Done (Spec 002; questions, observations, report in Indonesian) |
| 3 Live engine + report quality | Engine done; real run 2026-09-19. Report accepted "for now" 2026-09-26 after Specs 011–012 |
| 4 Durable orders, jobs, private reports | **Not started** |
| 5 Real payment + launch safety | **Not started.** Rate limits exist; no payment code |
| 6 Polish | Landing wave 1 done (Spec 006 P1); rest waiting |
| 7–9 Pilot, launch, re-check | Not started |

**Drift.** Phases 0–3 ran from mid-August to 2026-09-19. Most of the effort after
2026-09-12 went into question generation (Spec 008), intake redesign
(Specs 007, 011), and report redesign (Spec 012), plus a large volume of
process documents: 24 of the 39 non-merge commits since 2026-09-20 were docs, and
`NOW.md` has grown to 954 lines. That work improved the product, but none of
it moved Phases 4–5, which are what taking money needs. The plan's direction
still holds. Its **order** and its **gates** need three changes (§3.3).

### What the two reviews say

Both agree on the facts: the engine works; nothing is saved server-side;
payment is simulated; delivery/refund/retention decisions are open; two
dependency patches are pending; no target owner has seen a report.

They disagree on what comes first:

- **Claude review:** run a manual pilot now (hand-delivered PDF, bank-transfer
  payment) and build only what it proves necessary.
- **Codex review:** build durable delivery next, then payment. Show reports to
  a few owners early, but do not take manual payments; that still needs the
  same delivery and refund decisions and changes the product direction.

**Synthesis.** The founder's goal is a working self-serve paid product, so the
build follows Codex's order (save → deliver → pay). Claude's point that value
is unvalidated is real, and cheap to address: the founder shows existing
reports to a few owners **in parallel** (track V). It does not block or change
the build. Manual payment is not needed.

### Three things the reviews missed or got wrong

1. **The live audit is free to anyone with the link today.** Production runs
   `NUAVE_AUDIT_MODE=live` with the audit switched on
   (`.github/workflows/ci.yml:159-160`). There is no payment step, and the
   USD 5 spending limit is checked per request using history the browser
   sends (`src/lib/audit/telemetry.ts:121-135`). The founder accepted this
   while the site is unlisted (2026-08-20). The fix is a server-side daily
   spending cap (M2), and later payment (M6).
2. **The landing page is not agency-facing any more.** Both reviews cite a
   stale line in `README.md`. The landing was rewritten in Indonesian for
   owners in Spec 006 P1 ("Apakah brand Anda muncul di ChatGPT?"). It needs
   small fixes only, such as removing "simulasi / tidak ada pembayaran"
   notices once payment is real (M7).
3. **Two slow outside steps must start now:** Midtrans merchant approval and
   email-domain setup in Resend can take days to weeks. They are founder
   tasks (F1) and run while M1–M5 are built.

### Changes to the original plan

1. **Polish (Phase 6) is no longer a gate** before payment or before owners
   see the product. The `NOW.md` "Not now" line that holds back customer
   exposure until after polish is replaced.
2. **One compact spec** (Spec 013, "paid self-serve audit") covers M3–M7,
   instead of one spec plus heavy verification per phase. Each milestone is one
   PR, proven by the PR description plus one reviewer verdict, as
   `WORKFLOW.md` already requires.
3. **Manual operations over features** where a founder can do it by hand at low
   volume: refunds, recipient changes, wrong-business replacements, and retry
   after failure are support emails, not code.

## 4. Founder input needed

### 4.1 Decisions (F0), one sitting, ~30 minutes

Each has a recommended default. Answering "use the defaults" is fine.

| # | Question | Recommended default |
|---|---|---|
| D1 | How does a customer get back to their report? | A private link in the email. "Send my link again" form on the site. No account. |
| D2 | How long do we keep a report? | 12 months, then delete. |
| D3 | What do we promise about delivery time? | "Report usually ready in about 15 minutes; at the latest within 24 hours." |
| D4 | What if we can't finish the audit? | Automatic retry. If it still fails, email the customer and give a full refund within 3 business days, done by the founder in the Midtrans dashboard. |
| D5 | How fast does support reply? | Within 1 business day, at support@nuave.ai. |
| D6 | Customer typed the wrong email or wrong business? | Handled by support email, by hand. No self-service. |
| D7 | Is the free business check before payment OK to stay free? | Yes: only the cheap "we found your business" step is free; everything after it needs payment. |
| D8 | Keep the live audit open (unlisted, free) until payment ships? | Yes, once M2's daily spending cap is live. Before M2, keep it as today (already accepted 2026-08-20). |
| D9 | Terms and privacy text | Founder approves plain wording drafted in M7. A lawyer's review is optional and parked (§6). |
| D10 | Show existing reports to a few owners now (track V)? | Yes, only reports we have permission to show. |

### 4.2 Accounts and setup (F1), start today

- **Midtrans:** merchant account, sandbox keys now, production keys after
  approval. Enable QRIS, bank transfer, GoPay, DANA.
- **Resend:** verify the `nuave.ai` sending domain for
  `Tim Nuave <support@nuave.ai>`.
- **Cloudflare:** allow a D1 database (and later a Workflow) on the
  `nuave-v2` worker; add the new secrets to GitHub when a milestone asks.

Keys go into GitHub secrets or Cloudflare only. Never into chat, Git, or a
prompt.

## 5. Milestones

Rules for every milestone:

- One branch, one PR, `npm run verify` green, proven on the real browser path
  with the `verify-nuave` skill (extend the skill when a milestone adds a new
  step).
- Synthetic mode only. No live provider call, real email, or real charge
  without a named founder approval.
- Anything found that does not block this milestone goes to the parking lot
  (§6) in the PR description. Do not fix it.
- The orchestrator writes each worker prompt from
  `templates/WORKER_PROMPT.md` when the milestone before it passes review.

Estimated total: two to three weeks of worker cycles if F1 is not the
bottleneck. This is an estimate, not a promise.

### M0 — Reset the working docs + write Spec 013 (orchestrator, ~half day)

- Replace `NOW.md` with a page under 100 lines: current state, pointer to this
  plan, active milestone. The old text stays in Git history.
- `DECISION_LOG.md`: record approval of this plan, the F0 answers, and the
  three changes in §3.3.
- Fix stale lines in `README.md` (landing, "no public rate limiting") and point
  `INDEX.md` at this plan.
- Write `specs/013-paid-self-serve-audit/SPEC.md` (short: finish line §2,
  F0 answers, one acceptance check per milestone M3–M7). Founder approves it.

**Done when:** a fresh agent reading `README.md` → `NOW.md` → this plan knows
the next task without reading anything else.

### M1 — Security patches (worker, no spec, ~half day)

Update root `fast-uri` to ≥3.1.7 and `hono` to ≥4.13.7. Check
`package-lock.json` directly (`npm audit` does not flag these yet; see
`NOW.md` "Deferred security work").

**Done when:** the lockfile shows the patched versions and `npm run verify`
passes.

### M2 — Server storage + daily spending cap (worker, no spec, ~1–2 days)

This proves server storage works on Cloudflare in a small, useful step.

- Add a Cloudflare D1 database binding with a migration setup that CI can run.
- Record every paid provider call's cost in D1. Refuse new paid work when
  today's total passes a server-set daily limit (for example USD 3). Return the
  existing customer-safe "not available" message.
- Stop trusting spending history sent by the browser.

**Done when:** a test shows the cap blocks work after the limit and survives a
restart; the deployed worker reads and writes D1.

### M3 — Saved report with a private link (worker, Spec 013, ~2–3 days)

- Create an **order** when the customer starts, holding the email, business,
  confirmed summary, approved questions, each observation as it completes,
  and the final report.
- The finished report lives at a private address with a long random token.
  Store only a hash of the token. Pages are `noindex` and send no referrer.
- The web report and PDF render from the saved report, not the browser
  session.

**Done when:** in synthetic mode, finish an audit, copy the link, open it in a
fresh browser, and see the same report and PDF. A wrong token shows a neutral
"not available" page.

### M4 — Audit keeps running after the tab closes (worker, Spec 013, ~2–4 days)

- **Start with a half-day spike:** can Cloudflare Workflows run beside the
  OpenNext worker? If yes, run the ten questions and the report as durable
  steps. If not, use the fallback: a scheduled job every minute picks up
  unfinished paid orders and runs only the missing questions. Record the
  choice in the PR.
- Each finished observation is saved at once. A retry never repeats a question
  that already succeeded.
- After automatic retries, a still-failing run is marked failed. The founder
  gets an email with the order ID; the customer sees "delayed, we will email
  you".

**Done when:** start a synthetic audit, close the tab after two questions, and
the report is finished and saved with ten observations and no duplicated
question.

### M5 — Report-ready email + "send my link again" (worker, Spec 013, ~1–2 days)

- Send the report-ready email through Resend, from
  `Tim Nuave <support@nuave.ai>`, in Indonesian, with the private link.
- Add a "send my link again" form. It always answers "if we have a report for
  this email, we've sent it", so nobody can check whether an email has an
  order.
- A failed email does not fail the report. Resending creates a new send, not a
  new report.

**Done when:** in test mode (Resend test address or a mocked sender in CI),
both emails are sent with a working link, and the form answers the same way
for known and unknown emails.

### M6 — Real payment, Midtrans sandbox (worker, Spec 013, ~3–4 days)

- After the free business check, show the order summary: business, email,
  Rp99.000 total, what's included, delivery promise, links to Terms and
  Privacy.
- Pay through Midtrans' hosted checkout (Snap). Nuave never sees card or bank
  details.
- The Midtrans payment notification is checked (signature plus a status
  lookup) and applied once, even if it arrives twice.
- Preparing the summary, generating questions, and running the audit all
  require a paid order. One payment = one audit.
- The simulator stays only in synthetic mode and can never run in live
  production.
- Pending, expired, and failed payments show an honest message and a retry.

**Done when:** in Midtrans sandbox, pay → confirm → approve → report → email
works end to end; a duplicated notification does not create a second audit;
calling the audit endpoints without a paid order is refused.

### M7 — Customer-facing words (worker, Spec 013, ~1 day)

- Update `/terms`, `/privacy`, `/support`, and the landing page with the F0
  answers: price, delivery promise, refund, retention, support contact.
- Remove "simulasi / tidak ada pembayaran" wording from live pages.
- Add a "Minta bantuan" (mailto support) link on the failure and delayed
  screens.
- The founder approves the final Indonesian wording in the PR.

**Done when:** no live page claims simulation, and every F0 promise appears
where the customer pays.

### M8 — Go-live check (founder + worker, ~1 day)

1. Worker runs the full sandbox journey with `verify-nuave` and records
   evidence in the PR.
2. Founder switches Midtrans to production keys.
3. Founder buys one real audit for a business they own or have permission for
   (Rp99.000, about USD 0.20 of AI cost), receives the email, opens it on a
   phone, and refunds it from the Midtrans dashboard to prove the refund path.
4. Founder gives the go-ahead to accept strangers' payments.

**Done when:** the founder records "open for paying customers" in
`DECISION_LOG.md`.

### Track V — Owner feedback, in parallel (founder)

Show an existing report we have permission to share to 3–5 owners. Ask the
three questions in `PRODUCT.md`. Record answers in one short note. Findings
feed the parking lot unless they reveal that the report is unsellable. In that
case, stop and re-plan with the orchestrator.

## 6. Parking lot, after we have paying customers

Noted so they are not lost. Nothing here may be worked on before M8 unless the
founder moves it into a milestone.

**Report and content**
- Report format and reference-section simplification; AC-18 same-evidence
  comparison (deferred 2026-09-26).
- Remaining English JSX in `/audit` and `/audit/fixture`; product-wide design
  pass (Spec 006 P2–P7); landing copy rewrite beyond M7.
- Native-speaker review of emails and all copy beyond the founder's review.
- Server-side PDF generation (the browser PDF path stays for now).

**Question generation and engine**
- GLM returned model name `zai/glm-5.3-flash` vs requested; runner reads the
  wrong billing field (see `NOW.md`).
- Spec 008 G2P and remaining guard findings; run-to-run variation study.
- Structured-output failures: provider limit or call bug.

**Operations and features**
- Self-service recipient change, wrong-business replacement audit, founder
  admin screen (manual by support until volume demands).
- 30-day unpaid quote expiry and refresh.
- Funnel analytics and monitoring alerts beyond the M4 failure email.
- Comparable re-check (Phase 9).
- Unit economics with payment fees, retries, and support time.
- Launch wedge (one city, one category): needed before outreach, not before
  launch.
- Qualified legal review of terms and privacy.

**Cleanup**
- Historical v1 report reactivation; legacy code deletion.
- Root-level leftovers (`intake-prototype.html`, `irongrid-*.html`,
  `intake-redesign-spec.md`, `prepay-handoff.md`, `intake-handoff.md`,
  `acceptance-review-2026-09-22/`, `report-prototype/`,
  `Archive Candidates/`), the disabled `/audit/new-intake` preview route, and
  archived-prototype dependency updates.
- Slimming `docs/` and `specs/` beyond the M0 reset.

## 7. How agents work on this plan

- **Orchestrator** (refresh by reading `AGENTS.md` → this file): keeps §1
  current, writes the next worker prompt, triages reviewer verdicts, routes
  new issues to §6, and brings only real decisions to the founder, in plain
  language.
- **Worker**: reads `AGENTS.md`, the prompt, Spec 013, and the files the
  prompt names. Does one milestone. Puts evidence and parked items in the PR
  description.
- **Reviewer**: reads the prompt, Spec 013, and the PR. Checks the milestone's
  "Done when" on the real path (`verify-nuave`). Posts one verdict comment:
  PASS, PASS+NOTES, or FAIL.
- **Founder**: answers F0, does F1, merges and deploys, approves wording, runs
  M8.

Keep what is written down small: this ledger, Spec 013, PR descriptions, and
verdict comments. No new tracker, review files, or handoff documents.
