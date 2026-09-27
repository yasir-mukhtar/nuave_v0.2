# Plan: first real paying customer

> Status: **Active plan.** Approved by the founder on 2026-09-27
> ([decision](./DECISION_LOG.md#2026-09-27--approve-the-paying-customer-plan)).
> Author: orchestrator (Claude), 2026-09-27
> Baseline: `main` at `3c07495`
> Inputs: [`docs/END_TO_END_PLAN.md`](./END_TO_END_PLAN.md), [`docs/NOW.md`](./NOW.md), the two
> 2026-09-27 readiness reviews (Codex and Claude) in `docs/reviews/`, and the
> founder's sequencing direction of 2026-09-27 (§3.4)
>
> **Relationship to [`docs/END_TO_END_PLAN.md`](./END_TO_END_PLAN.md).** This
> plan replaces it for the order of work, the stages, and the
> gates. `END_TO_END_PLAN.md` stays as the reference for the detailed
> requirements this plan points to (for example, the Phase 4 exit gate, §6
> technical shape and private report access, §10 failure matrix, §12
> non-scope). Where the two disagree, this plan wins.
>
> **Fresh agents: start here.** The ledger in §1 is the current state. Read
> §2 for the finish line and §5 for your milestone. [`NOW.md`](./NOW.md) holds
> the deployment facts and standing rules; older history is in Git.

## 1. Progress ledger

The orchestrator updates this table after each reviewer PASS. Nobody else
edits it. Work runs top to bottom; a stage starts only when the one above is
done.

| # | Milestone | Owner | State | PR | Verdict |
|---|---|---|---|---|---|
| **Stage 1** | **Finish the intake journey** | | | | |
| J0 | Reset the working docs | Orchestrator | In review | — | — |
| J1 | Gap list: Airbnb-style reference vs today's `/audit` | Worker (read-only) | Not started | — | — |
| J2…Jn | Build the gaps, one PR each (filled in from J1) | Worker | Not started | — | — |
| JZ | Founder signs off the journey after real test runs | Founder | Not started | — | — |
| **Stage 2** | **Get ready to take money** | | | | |
| S0 | Decision: how to save and email reports (§4.2) | Founder | Waiting for Stage 1 | — | — |
| S1 | Security patches | Worker | Not started | — | — |
| S2 | Spending cap on the server | Worker | Not started | — | — |
| S3 | Create the order (with email); save and deliver reports; audit survives tab close (shape set by S0) | Worker | Not started | — | — |
| S4 | Real payment + founder test pass | Worker | Not started | — | — |
| S5 | Terms, price and promise wording | Worker | Not started | — | — |
| S6 | Landing page | Founder | Not started | — | — |
| **Stage 3** | **Go live** | | | | |
| G1 | One real purchase and refund | Founder + worker | Not started | — | — |
| **Parallel** | | | | | |
| V | Show reports to 3–5 real owners | Founder | Optional | — | — |

## 2. Finish line

Nuave is ready for paying customers when a stranger can do all of this without
the founder stepping in:

1. Open `v2.nuave.ai` and enter their business website. Nuave reads the
   site's public name and details to show "is this your business?" This step
   is free and uses no AI.
2. See the price (Rp99.000) and what they get, and pay through Midtrans.
3. Go through the Airbnb-style intake: Nuave shows what it understood, and the
   owner confirms, corrects, or answers a few quiz-like choices.
4. Review and approve the ten questions.
5. The audit runs; the owner reads the report and downloads the PDF.
6. The owner can get back to their report later (how is decided in S0).
7. If the audit fails, Nuave tells them and the founder refunds by hand.

Every step after 1 that costs AI money sits behind payment. This matches the
original plan's order (Order Preview → Payment → Business Facts → Questions).

**Testing without payment.** In Stage 1 there is no payment step at all: the
founder tests the whole journey for real, with real AI cost, as often as
wanted. Once payment exists (S4), the founder keeps doing this with a private
test pass that skips step 2.

Polish and everything in the parking lot (§6) come **after** this works.

## 3. Where we are

### 3.1 What the original plan wanted, and what happened

[`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md) set nine phases: simulated shell →
Indonesian → live report → durable delivery → real payment → polish → pilot →
launch → re-check.

| Plan phase | State on 2026-09-27 |
|---|---|
| 0–1 Simulated shell | Done (Spec 001) |
| 2 Indonesian contract | Done (Spec 002; questions, observations, report in Indonesian) |
| 3 Live engine + report quality | Engine done; real run 2026-09-19. Report accepted "for now" 2026-09-26 after Specs 011–012 |
| Intake experience (added later: Spec 007, 011) | **Partial.** The founder's Airbnb-style proof of concept is only partly in the live `/audit` (§3.4) |
| 4 Durable orders, jobs, private reports | Not started |
| 5 Real payment + launch safety | Not started. Rate limits exist; no payment code |
| 6 Polish | Landing wave 1 done (Spec 006 P1); rest waiting |
| 7–9 Pilot, launch, re-check | Not started |

**Drift.** Phases 0–3 ran from mid-August to 2026-09-19. Most later effort
went into question generation (Spec 008), intake (Specs 007, 011), report
redesign (Spec 012), and a large volume of process documents: 24 of the 39
non-merge commits since 2026-09-20 were docs, and `NOW.md` has grown to 954
lines. The intake work is still the right target (§3.4); the process weight
is what slowed it.

### 3.2 What the two reviews say

Both agree on the facts: the engine works; nothing is saved server-side;
payment is simulated; delivery/refund/retention decisions are open; two
dependency patches are pending; no target owner has seen a report.

They disagree on what comes first:

- **Claude review:** run a manual pilot now (hand-delivered PDF, bank-transfer
  payment) and build only what it proves necessary.
- **Codex review:** build durable delivery next, then payment. Show reports to
  a few owners early, but do not take manual payments.

**Synthesis.** Both treated the intake as finished. The founder does not, and
the intake is the product's first impression and the input to every report, so
it comes first (Stage 1). After that, Codex's order holds: save and deliver →
pay. Claude's point that value is unvalidated is kept as optional track V; it
never blocks the build. Manual payment is not needed.

### 3.3 Things the reviews missed or got wrong

1. **The live audit is free to anyone with the link today.** Production runs
   `NUAVE_AUDIT_MODE=live` with the audit switched on
   (`.github/workflows/ci.yml:159-160`). There is no payment step, and the
   USD 5 spending limit is checked per request using history the browser
   sends (`src/lib/audit/telemetry.ts:121-135`). The founder accepted this
   while the site is unlisted (2026-08-20). S2 adds a server-side cap; S4
   adds payment.
2. **The landing page is not agency-facing any more.** Both reviews cite a
   stale line in `README.md`. The founder will rework the landing in S6.
3. **Accounts are mostly ready.** The founder has an active Midtrans account.
   Resend was set up for Nuave v0.1; if `nuave.ai` is already a verified
   sending domain there, v2 only needs its own API key.

### 3.4 Founder direction, 2026-09-27

- **Order:** (1) finish the intake journey (URL → Airbnb-style confirm and
  quiz → review questions → generate report → read report); (2) payment and
  landing; (3) everything else.
- **Real tests without payment** must stay possible throughout, including after
  payment exists. For now there is no payment step at all.
- **Where payment goes** (founder, via the plan review): right after the
  customer enters the website URL and before Nuave prepares or asks for any
  business details. Order: URL → price + pay → intake → approve questions →
  report (§2).
- **Saving and emailing reports:** the founder is open to solutions other than
  the ones in the original plan. Decide at S0, after Stage 1. *Orchestrator:
  remind the founder when Stage 1 closes.*
- The current intake is half-built. **The reference is settled:**
  1. **Primary:** [`intake-prototype.html`](../intake-prototype.html) (repo
     root, 2026-08-30): the cleanest version and closest to the vision.
  2. **Secondary:** [`drafts/nuave-intake-design-workbench.html`](./drafts/nuave-intake-design-workbench.html):
     an attempt to recreate the prototype, less clean, but may hold good
     ideas worth keeping.
  3. **Not references:** today's `/audit` and the PR #58 `/audit/new-intake`
     version. They are half-built implementations to measure against, not
     to copy.

  Where the prototype and the workbench disagree, the prototype wins unless
  the founder picks otherwise.

### 3.5 Changes to the original plan

1. **The Airbnb-style intake is Stage 1**, ahead of durable delivery and
   payment.
2. **Polish (Phase 6) is no longer a gate** before payment or before owners
   see the product. The `NOW.md` "Not now" line that holds back customer
   exposure until after polish is replaced.
3. **Lighter paperwork.** Each milestone is one PR, proven by the PR
   description plus one reviewer verdict, as [`docs/WORKFLOW.md`](./WORKFLOW.md) already requires.
   Customer-visible work still needs an approved spec, kept short: one for
   Stage 1 (after J1), one for Stage 2 (after S0).
4. **Manual operations over features** at low volume: refunds, recipient
   changes, wrong-business replacements, and retry after failure are support
   emails, not code.

## 4. Founder input needed

### 4.1 Now

- ~~Name the Airbnb-style reference~~ Done 2026-09-27 (§3.4).
- **Say what "done" means for the journey** if it is more than matching the
  reference, such as a list of screens that must exist.
- Real test runs during Stage 1 are the founder's own (§5, JZ); about
  USD 0.20 of AI cost each.

### 4.2 At S0, after Stage 1 (reminder)

How do customers get their report and get back to it, and how does a paid
audit keep running if they close the tab? The orchestrator brings two or three
options with costs. Every option must meet S3's list (§5), including audits
that survive the tab closing, for example:

- report saved on our server + private link by email (the original plan);
- private link only, no email;
- a lighter option the founder suggests.

The same sitting settles the related answers, with suggested defaults:

| # | Question | Suggested default |
|---|---|---|
| D1 | How long do we keep a report, and how long does its link work? | Keep 12 months, then delete. The link works until the report is deleted; after that it shows "not available". Support can reissue a link while the report exists (D7, D8) |
| D2 | Delivery promise | "Usually about 15 minutes; at most 24 hours" |
| D3 | If the audit can't finish | Automatic retry; if still failing, email the customer and refund in full by hand within 3 business days |
| D4 | Support reply time | Within 1 business day, at support@nuave.ai |
| D5 | Wrong email or wrong business | Handled by support email, by hand |
| D6 | Terms and privacy text | Founder approves plain wording in S5; legal review is parked |
| D7 | How support confirms it's really the customer before resending or cutting off access | The order number (or Midtrans receipt) is used **only to find the order**, never as proof. Proof is confirmation **from the order's email**: the request comes from that address, or support emails a confirmation there and acts only after the customer confirms. A signed-in order session also counts, if S3 builds one |
| D8 | How a replacement link is issued | Only after D7 confirmation: send a new link to the order's email and switch off the old one. Sending access to a **different** email is never done on an order number; it stays under D5, by hand, with a stronger check |

### 4.3 Accounts

- **Midtrans:** active. S4 needs the sandbox and production server keys added
  to GitHub secrets.
- **Resend:** check that `nuave.ai` shows as a verified domain in the v0.1
  account; create a new API key for v2 when S3 needs it.
- **Cloudflare:** allow a database on the `nuave-v2` worker when S2 needs it.

Keys go into GitHub secrets or Cloudflare only. Never into chat, Git, or a
prompt.

## 5. Milestones

Rules for every milestone:

- One branch, one PR, `npm run verify` green, proven on the real browser path
  with the `verify-nuave` skill (extend the skill when a milestone adds a new
  step).
- Synthetic mode by default. No live provider call, real email, or real charge
  without a named founder approval.
- Anything found that does not block this milestone goes to the parking lot
  (§6) in the PR description. Do not fix it.
- The orchestrator writes each worker prompt from
  [`docs/templates/WORKER_PROMPT.md`](./templates/WORKER_PROMPT.md) when the milestone before it passes review.

### Stage 1 — Finish the intake journey

**J0 — Reset the working docs** (orchestrator, ~half day)

- Replace [`docs/NOW.md`](./NOW.md) with a page under 100 lines: current state, pointer to this
  plan, active milestone. The old text stays in Git history.
- [`docs/DECISION_LOG.md`](./DECISION_LOG.md): record approval of this plan and §3.4–3.5,
  including that this plan replaces `END_TO_END_PLAN.md` for the order of
  work, stages and gates.
- Relabel [`docs/END_TO_END_PLAN.md`](./END_TO_END_PLAN.md): change its status
  line from "Current development plan" to "Reference: order of work replaced
  by `PAYING_CUSTOMER_PLAN.md` (2026-09-27)", with a pointer here. Leave its
  body unchanged.
- Fix stale [`README.md`](../README.md) lines (landing, "no public rate
  limiting"). Point [`docs/INDEX.md`](./INDEX.md) and the `README.md`
  "build sequence and gates" row here, and describe `END_TO_END_PLAN.md` as
  the requirements reference.

*Done when:* nothing on the carry-over list below is lost, no document still
presents `END_TO_END_PLAN.md` as the current build order, and a fresh agent
reading `README.md` → `docs/NOW.md` → this plan knows
the next task without reading anything else.

**Carry-over list.** Scanned from `docs/NOW.md` on 2026-09-27. These are
still in force, and none is in this plan. J0 must keep each one in its target
or confirm it is already there.

| Still in force | Where it goes |
|---|---|
| Deployment facts: Cloudflare worker `nuave-v2` at `v2.nuave.ai` (fallback `nuave-v2.mail-yasirmukhtar.workers.dev`); CI jobs `validate`, `verify-main-origin`, `deploy`; per-PR preview workers; settings are baked in at build, so a settings change needs a redeploy; names (never values) of the required secrets and settings; the `NUAVE_NEW_AUDIT_ENABLED` / `NUAVE_AUDIT_MODE` switch; founder to-do: delete the unused `NUAVE_ACCESS_CODE` secret | New `docs/NOW.md`, short "Deployment" block |
| Production AI setup: OpenAI direct, `gpt-5.6-luna`, low reasoning; web-search rules per stage; per-stage call limits; USD 5 per-session ceiling and the carry-over setting | Confirm in `docs/AUDIT.md` or the 2026-09-20 `DECISION_LOG` entry; otherwise new `NOW.md` |
| Live-spend rule: all earlier live allowances are used up; recorded spend is USD 1.06241155 of 5; agents make live AI calls only with a named founder approval (the founder's own test runs are exempt, §5 JZ) | New `NOW.md` |
| 2026-08-20 acceptance of the unlisted, ungated live audit | Already in `DECISION_LOG` (2026-08-20 table row); link it from new `NOW.md` |
| Historical v1 report hold | Already in `DECISION_LOG` (2026-09-22) |
| Spec states: 011 Verified; 012 Verified with the AC-18 exception; latest checkpoint 2026-09-19 | One line each in new `NOW.md` |
| Engineering track: playbook adopted 2026-09-26; its §B.3 guards merged through PR #91 on 2026-09-27 | New `NOW.md`, one line |
| Open questions ("What is not known": willingness to pay, price, action on reports, re-check demand, run-to-run variation, and others) | Parking lot (§6), one bullet pointing to the old list in Git |
| Non-scope ("Not now": white-label, dashboards, subscriptions, credits, multi-vertical, banded/ranked scores, fabricated proof) | New `NOW.md`, pointer to `docs/END_TO_END_PLAN.md` §12 plus any item §12 lacks |
| Private evidence stays outside Git (`.local-evidence/`, `.secrets/`) | New `NOW.md`, one line |

**J1 — Gap list** (worker, read-only, ~half day)

Walk `intake-prototype.html` and today's `/audit` (synthetic mode) side by
side, screen by screen. Note anything in the workbench that the prototype lacks
and that looks worth keeping, as a separate list for the founder to accept or
reject. Output one table in the PR description:

- each reference screen or interaction;
- what `/audit` does today, with the file path;
- the gap; and
- a rough size (S/M/L).

Also list what today's `/audit` does that the reference lacks, and which
existing engine pieces can be reused (preparation, question generation,
run, report). The orchestrator turns the table into J2…Jn and a short
Stage 1 spec for founder approval.

*Done when:* the founder agrees the table is complete.

**J2…Jn — Build the gaps** (worker, one PR each)

Defined after J1. Each PR takes one slice of the journey to the reference and
keeps the whole path working in synthetic mode. Rules:

- Reuse the existing engine: preparation, question generation, observations,
  and report. Change the screens, not the audit method.
- The live route is `/audit`. Retire `/audit/new-intake` rather than keep two
  intakes.

**JZ — Journey sign-off** (founder)

Throughout Stage 1 the founder runs real businesses from URL to report on the
deployed site, as often as wanted, with real AI cost. Problems found become
J-tasks or parking-lot items. Agents still make live AI calls only with a
named founder approval. JZ is the moment the founder says the journey is
done.

*Done when:* the founder says the journey is done. Orchestrator then triggers
S0.

### Stage 2 — Get ready to take money

**S1 — Security patches** (worker, no spec, ~half day)

Update root `fast-uri` to ≥3.1.7 and `hono` to ≥4.13.7, review the remaining
dependency security alerts, and recheck current advisories when doing the
work. This is small and independent: it may be pulled forward into Stage 1
whenever a worker is idle.

Background (copied from the former `NOW.md` "Deferred security work",
2026-09-27):

- The founder deferred this to the final pre-customer checks. It must be done
  before any customer testing or public link sharing.
- The root lockfile had `fast-uri` 3.1.6 and `hono` 4.13.5. `fast-uri` can
  misinterpret crafted web addresses
  ([host confusion](https://github.com/fastify/fast-uri/security/advisories/GHSA-58mr-gqgx-xq4g),
  [destination injection](https://github.com/fastify/fast-uri/security/advisories/GHSA-qw65-cvwx-89v3)).
  Affected Hono page-rendering features can treat untrusted text as
  executable page content
  ([security notice](https://github.com/honojs/hono/security/advisories/GHSA-hxh3-vqpv-xpqv)).
- `npm explain` traced both through shadcn tooling; a source search found no
  direct application use of the affected features. That supports the
  deferral but is not a full runtime security assessment.
- The alert tools do not catch these yet: `npm audit` reported nothing for the
  root app, and every open Dependabot alert pointed at an archive folder
  (`archive/prototypes/report-prototype/` or `Archive Candidates/lp-remote/`).
  Check the root `package-lock.json` versions directly; a clean alert list
  does not mean done.
- The root lockfile already has `js-yaml` 4.3.2 and `qs` 6.16.0. The archived
  report prototype's own lockfile is out of date; update it before reviving
  that prototype.

*Done when:* the lockfile shows the patched versions and `npm run verify`
passes.

**S2 — Spending cap on the server** (worker, no spec, ~1–2 days)

- Record every paid provider call's cost on the server (Cloudflare D1 unless S0
  chooses otherwise).
- Refuse new paid work when today's total passes a server-set daily limit.
  Show the existing "not available" message. (Once S4 adds payment, the cap
  is checked before payment and an already-paid order may finish; see S4.)
- Stop trusting spending history sent by the browser.

*Done when:* a test shows the cap blocks work after the limit and survives a
restart.

**S3 — Save and deliver reports; audit survives tab close** (worker, Stage 2
spec, ~6–9 days including the order summary, the largest build in Stage 2;
may split into two PRs)

Shape set at S0. Today the audit is tied to the open browser tab: the run
route passes the browser connection's stop signal into the audit
(`src/app/api/audit/run/route.ts:213`), and the provider stops when it fires
(`src/lib/audit/protected-observation-provider.ts:123`). Moving the run to a
server-side job is most of this milestone.

**S3 also creates the order.** Today `/audit` never asks for an email and has
no order. Right after the free "is this your business?" step, S3 adds the
**order summary without a payment button**: business, what's included, and
the customer's **email** (required). This creates a server-side order. The
audit run, the report, its link, delivery and recovery all hang off that
order and its email. S4 later adds payment to this same screen. This matches
the original plan, where durable orders (Phase 4) came before real payment
(Phase 5).

Whatever is chosen must pass:

- the order summary collects the email and creates an order before the
  intake starts;

- close the browser during an audit, and it completes or safely resumes,
  without repeating questions that already succeeded (no double AI cost);
- a finished paid report is not lost if the customer closes the tab;
- the customer can open the report again on another device;
- nobody can open someone else's report by guessing;
- a lost link can be recovered through support, and a link is revoked or
  replaced only after confirmation from the order's email (D7, D8); and
- expired access (after the report is deleted, D1) and revoked access fail
  safely, with a neutral "not available" page.

These come from the original plan's Phase 4 exit gate
(`docs/END_TO_END_PLAN.md` §7, Phase 4).

**S4 — Real payment + founder test pass** (worker, Stage 2 spec, ~3–4 days)

- Add payment to the order summary that S3 built (it already collects the
  email, which delivery and support D3, D5, D7, D8 depend on). The summary now
  also shows the Rp99.000 total, the delivery promise, and links to Terms and
  Privacy. It sits right after the free "is this your business?" result.
  Payment comes **before** the intake asks for or prepares any business
  details.
- The free step before payment only reads the website's public page (no AI);
  today that is `/api/audit/identity` (`src/lib/audit/source-identity.ts`).
  If building the price screen seems to need anything more, such as an AI
  call, stop and ask the founder.
- Pay through Midtrans' hosted checkout (Snap). Nuave never sees card or bank
  details.
- Check each Midtrans payment notification (signature and a status lookup)
  and apply it once, even if it arrives twice.
- Everything that costs AI money needs a paid order **or the founder test
  pass**: preparing the business details (the intake), question generation,
  the audit run, and the report. One payment = one audit.
- **Founder test pass:** a secret code set only on the server. It is never
  shown in the page, marks the run as a test in every record, counts against
  the S2 cap, and never works for anyone else.
- Pending, expired, and failed payments show an honest message and a retry.
- **Check the S2 daily cap before taking payment**, so Nuave never sells an
  audit it can't run today; if the cap is reached, the order summary says to
  try again later and no payment is taken. An order that is already paid is
  allowed to finish even if the cap is passed meanwhile; if it still cannot
  run, it falls under D2 and D3 (retry, then refund by hand).

*Done when:* in Midtrans sandbox, URL → pay → intake → approve questions →
report works end to end. A duplicated notification does not create a second audit. The test pass
runs a real audit with no payment. Calling the audit endpoints with neither
payment nor test pass is refused. With the daily cap reached, no new payment
can start, and an already-paid order still completes.

**S5 — Terms, price and promise wording** (worker, ~1 day)

- Update `/terms`, `/privacy` and `/support` with the S0 answers: price,
  delivery promise, refund, retention and support contact.
- Remove "simulasi / tidak ada pembayaran" wording from live pages.
- Add a "Minta bantuan" (mailto support) link on the failure and delayed
  screens.
- The founder approves the final Indonesian wording.

**S6 — Landing page** (founder)

The founder reworks the landing page. The orchestrator writes a worker prompt
only if asked.

### Stage 3 — Go live

**G1 — One real purchase and refund** (founder + worker, ~1 day)

1. Worker runs the full sandbox journey with `verify-nuave` and records
   evidence in the PR.
2. Founder switches Midtrans to production keys.
3. Founder buys one real audit for a business they own or have permission for
   (Rp99.000), reaches the report on a phone, and refunds it from the Midtrans
   dashboard.
4. Founder records "open for paying customers" in `DECISION_LOG.md`.

### Track V — Owner feedback (optional, founder)

Show an existing report we have permission to share to 3–5 owners and ask
three questions. **Approved by the founder on 2026-09-27** (recorded in
`docs/DECISION_LOG.md` with the plan's approval):

1. Did this report tell you something you didn't know about your business?
2. Would you do anything differently because of it? What?
3. Would you pay Rp99.000 for a report like this about your own business?

Record each owner's answers in one short note. Findings go to the parking lot
unless they show the report is unsellable. In that case, stop and re-plan.

## 6. Parking lot, after we have paying customers

Noted so they are not lost. Nothing here may be worked on before G1 unless the
founder moves it into a milestone.

**Report and content**
- Report format and reference-section simplification; AC-18 same-evidence
  comparison (deferred 2026-09-26).
- Remaining English JSX in `/audit/fixture`; product-wide design pass (Spec
  006 P2–P7).
- Native-speaker review of emails and all copy beyond the founder's review.
- Server-side PDF generation (the browser PDF path stays for now).

**Question generation and engine**
- GLM model name and billing field (copied from the former `NOW.md`,
  2026-09-17 connection check): the provider returned model name
  `zai/glm-5.3-flash` where `glm-5.3-flash` was requested, so the runner
  marked a complete HTTP 200 response `UNSUCCESSFUL`. A public catalog lookup
  names Z.ai as the provider but lists no aliases, so the mapping is
  unconfirmed. The runner also reads the wrong billing field: the saved
  response has the cost at `cheaper_inference.billing.billed_cost_usd`. Both
  can be investigated from the saved response, without a new paid request.
- Spec 008 G2P and remaining guard findings; run-to-run variation study.
- Structured-output failures: provider limit or call bug.

**Open questions**
- The former `NOW.md` "What is not known" list (willingness to pay, price,
  whether owners act on reports, re-check demand and interval, run-to-run
  variation, benchmark size, other verticals, outreach conversion, and more):
  see `git show 29addbe:docs/NOW.md`. Track V answers the first three.

**Operations and features**
- Self-service recipient change, wrong-business replacement audit, founder
  admin screen (manual by support until volume demands).
- 30-day unpaid quote expiry and refresh.
- Funnel analytics and monitoring alerts.
- Comparable re-check (Phase 9).
- Unit economics with payment fees, retries, and support time.
- Launch wedge (one city, one category): needed before outreach, not before
  launch.
- Qualified legal review of terms and privacy.

**Cleanup**
- Historical v1 report reactivation; legacy code deletion.
- Root-level leftovers (`irongrid-*.html`, `prepay-handoff.md`,
  `acceptance-review-2026-09-22/`, `report-prototype/`, `Archive Candidates/`)
  and archived-prototype dependency updates. Keep `intake-prototype.html`, the
  workbench, `intake-redesign-spec.md` and `intake-handoff.md` until Stage 1
  closes: they are the intake reference and its notes.
- Slimming `docs/` and `specs/` beyond the J0 reset.

## 7. How agents work on this plan

- **Orchestrator** (refresh by reading `AGENTS.md` → this file): keeps §1
  current, writes the next worker prompt, triages reviewer verdicts, routes
  new issues to §6, and brings only real decisions to the founder, in plain
  language.
- **Worker**: reads `AGENTS.md`, the prompt, the stage spec, and the files the
  prompt names. Does one milestone. Puts evidence and parked items in the PR
  description.
- **Reviewer**: reads the prompt, the stage spec, and the PR. Checks the
  milestone's "Done when" on the real path (`verify-nuave`). Posts one verdict
  comment: PASS, PASS+NOTES, or FAIL.
- **Founder**: approves specs and wording, answers
  S0, merges and deploys, and runs JZ and G1.

Keep what is written down small: this ledger, the two stage specs, PR
descriptions, and verdict comments. No new tracker, review files, or handoff
documents.
