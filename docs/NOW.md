# Nuave now

> Updated: 2026-10-13
> Stage: Stage 1 accepted; S0 decided; S2 merged (#127); S3 (Spec 016) Verified — merged, deployed and live-tested (#129, `d641701`); next: S4 spec draft
> Plan: [first paying customer](./PAYING_CUSTOMER_PLAN.md); S2 merged to main 2026-10-12 as `2d2c4ec`
> History: the previous 954-line page is at `git show 29addbe:docs/NOW.md`

## Current state

- **The plan:** [`PAYING_CUSTOMER_PLAN.md`](./PAYING_CUSTOMER_PLAN.md)
  ([approved 2026-09-27](./DECISION_LOG.md#2026-09-27--approve-the-paying-customer-plan)).
  Its §1 ledger is the progress record. Which plan governs what:
  [`INDEX.md`](./INDEX.md#current-development-plan).
- **What works today:** on `v2.nuave.ai`, anyone with the link can enter a
  business website and confirm the business (free). To go further they place
  an order with an email; in live mode only addresses on the founder's private
  list (`NUAVE_ORDER_EMAIL_ALLOWLIST`) are accepted until S4. The order holds
  USD 2.00 of the USD 5 daily cap. The paid website reading, intake and ten
  questions follow; after approval the audit runs on the server, one step per
  minute, so the customer can close the tab. The saved report is reached
  through a private link emailed by Resend (PDF and JSON downloads on the
  report page). There is no payment yet. First live order (AC-21,
  2026-10-13): delivered about 10.5 minutes after approval, USD 0.1372.
- **Specs:** [Spec 013](../specs/013-airbnb-intake-journey/SPEC.md) (Stage 1
  intake) is **Verified with documented evidence exceptions**; J2–J7/JQ and
  PR121 merged, the latter deployed. Alfred accepted JZ under delegated founder
  authority, with Yasir's successful-result approval and the composite
  [verification](../specs/013-airbnb-intake-journey/VERIFICATION.md#final-jz-closeout).
  Canonical docs merged in [PR #122](https://github.com/yasir-mukhtar/nuave_v0.2/pull/122#issuecomment-5979454013). Also verified:
  [Spec 011](../specs/011-smart-consultant-intake/SPEC.md) (intake) and
  [Spec 012](../specs/012-evidence-first-report/SPEC.md) (report, with the
  AC-18 exception). Checkpoint: [2026-09-19 live report](./checkpoints/2026-09-19-live-direct-ten-report/CHECKPOINT.md).
- **Engineering track:** [playbook](./AGENTIC_ENGINEERING_PLAYBOOK.md)
  adopted 2026-09-26; its §B.3 guards merged through PR #91 on 2026-09-27.

## Next action

- **S0 is decided** ([2026-10-05](./DECISION_LOG.md#2026-10-05--s0-private-report-delivery-and-recovery-approved)):
  one immutable private report per order, stored on the server, reached through
  a revocable private link emailed to the order email; no account, password,
  dashboard or report-history product at launch. Reviewed `a0738376`
  (PASS+NOTES), approved by Fox `d68c7478`. It is internal policy, not a
  published promise; main code and the live product are unchanged.
- **S2 is merged: [PR #127](https://github.com/yasir-mukhtar/nuave_v0.2/pull/127)**
  (2026-10-12; review PASS+NOTES, notes fixed in `8c9d6a6`). Every paid
  provider call reserves its maximum cost in D1 database `nuave-v2-spend`
  (binding `SPEND_DB`) before dispatch and settles to the actual cost. New
  paid work is refused once today's UTC total reaches
  `NUAVE_DAILY_SPEND_LIMIT_USD` (default USD 5, founder decision 2026-10-12).
  Live mode without the binding fails closed. Browser-sent spend history is
  ignored. It replaces the unmerged `feat/s2-ledger-foundation-20261004` and
  `feat/s2-spend-guard-integration-20261005` branches (PRs #123 and #125
  closed). S4 adds a per-order cost limit and founder alerts at 80%, 90% and
  100% of the cap.
- **S3 is merged and deployed: [PR #129](https://github.com/yasir-mukhtar/nuave_v0.2/pull/129)**
  (merge `d641701`, 2026-10-13). [CI run](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/38365476032):
  `validate`, `verify-main-origin`, D1 migrations 0001–0005 and the deploy all
  passed; 14 Worker secrets written; the every-minute cron is registered;
  worker version `e7e4ee58-4e4a-49f3-a6c1-005a94806aea`. Offline criteria
  AC-01..AC-20 pass (AC-20 with a founder-accepted evidence exception).
  **AC-21 passed** (2026-10-13, founder-run, USD 2.00 approved): the live
  order was delivered by email link for USD 0.1372, within its hold
  ([record](../specs/016-order-and-saved-report/VERIFICATION.md#ac-21-live-run-2026-10-13)).
  Cron CPU time against Free's 10 ms is still to be read from the Cloudflare
  dashboard. Spec 016 is **Verified**. **Next:** S4,
  [Spec 017](../specs/017-payment-and-test-pass/SPEC.md): founder answers
  recorded ([2026-10-13](./DECISION_LOG.md#2026-10-13--s4-answers-for-spec-017-draft));
  independent plan review, then founder approval; the build runs in a new
  session. Build nothing before approval.
  Post-spec decisions: [2026-10-13](./DECISION_LOG.md#2026-10-13--s3-decisions-after-spec-016).
- **S2 diagnostic (brief):** the last native child handoffs were complete; the
  old session identifiers are not recognized now, with no cancellation or
  billing proof. No unidentified process was killed and no Desktop state was
  edited.
- **The S0/Stage 2 pause is superseded only for this approved sequence.**
  Spec 015 stays an unapproved held draft on `docs/stage2-paid-report-spec`
  at `582f426`, not present on main. Outside users, payment, publication and
  polish remain gated as below. No spending allowance is reset.
- **Polish waits until all intended screens exist**, for one later pass.
  [Current delegation and limits](./DECISION_LOG.md#2026-10-05--s0-private-report-delivery-and-recovery-approved):
  Fox is the scoped decision/merge-deploy delegate; Pac coordinates delivery.
  Merge, closure, deletion, privacy/spending changes and live actions remain
  separate.

## Rules still in force

- **No outside users yet.** Before anyone other than the founder uses the
  live product: the server-side spending cap (S2), terms and privacy wording
  (S5), and a way to fix or refund a bad result (D3, D5) must exist. Track V
  shows existing reports; it does not share the live link.
- **Open live audit:** the site is public with no login
  ([2026-09-19](./DECISION_LOG.md#2026-09-19--new-flow-becomes-the-public-trial-journey-on-v2nuaveai-without-login)).
  The founder watches provider billing. Per-IP limits and per-session ceilings
  reduce bursts but are not a hard cap. The 2026-08-20 "interim exposure" row
  in [`DECISION_LOG.md`](./DECISION_LOG.md) requires a server-side guard
  before sharing the link beyond direct outreach.
- **Live AI calls by agents** need a named founder approval; earlier
  allowances are used up. Agent-run spend was USD 1.06241155 of a USD 5
  allowance on 2026-09-27; update this line after each approved agent run.
  The founder's own test runs (plan §5, JZ) are not counted here; the
  provider dashboards show total spend.
- **JZ accounting:** parent-reported agent live spend is USD 0 for this JZ
  engagement only. This does not reset the separately dated September allowance
  usage above. Founder-run charges remain unknown; no new spending is authorized.
- **S0/S2 sequence allowance:** USD 5 total provider-call allowance, USD 0 used
  as of 2026-10-05. It does not authorize infrastructure charges or new tool
  subscriptions, and does not replace the named-approval rule above.
- **Private evidence stays out of Git:** `.local-evidence/` and `.secrets/`
  (both ignored). The old `devin/sol-smart-consultant-intake-plan` branch's
  uncommitted files are in `.local-evidence/branch-closeout-20260927/`.

## Deployment

- **Current main release:** [CI run](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/38365476032)
  validated `d641701` (PR #129) and passed the merged-PR-origin gate, D1
  migrations and deployment; worker version `e7e4ee58-4e4a-49f3-a6c1-005a94806aea`.
- **Previous main release:** [CI run](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/37198166636)
  validated `613f1b3` and passed the merged-PR-origin gate and deployment.
  [Closeout record](https://github.com/yasir-mukhtar/nuave_v0.2/pull/122#issuecomment-5979454013)
  reports worker version `00a8c286-d344-4a80-8954-2a0d2f2c9b4c`. This is recorded
  release evidence, not a fresh browser drive, provider call or live report.
- **Repository enforcement:** GitHub reports PRIVATE/unprotected main; protection
  APIs return HTTP 403. Mandatory review/release rules remain, but enforcement
  readiness is unresolved; no visibility, billing or settings change is approved.
- **Additional operational finding:** [PR #122 closed-preview removal failed](https://github.com/yasir-mukhtar/nuave_v0.2/pull/122#issuecomment-5979315878).
  Existence, cause and exposure are not established; no remediation is authorized.
- **PR121 earlier release:** [main CI](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/37192219597)
  validated/deployed `d7a2f50fddafae222eb62dbabaec5497010743b8`, the same tree as
  reviewed `7aa6fc9a08d141ecab03ff98e05a06408ade405d`.
  [Deployment job](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/37192219597/job/111407548044)
  reported worker `nuave-v2` version `09c25e17-02e8-498b-bfe7-20e43f7ea0cd`.
  GitHub's deployments API was empty; the association comes from that job log.
  Parent's `https://v2.nuave.ai` HTTP smoke: Python home GET 403, then curl home and
  `/audit` HTTP 200. No browser JavaScript, business submission, provider call,
  rendered QA or fresh production report was exercised.
- **Separate operational finding:** [closed-preview cleanup failed](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/37192219083/job/111406635060).
  Preview removal, cause and continuing exposure are not established. This does
  not negate the successful main deployment; no cleanup/remediation is authorized.
- Cloudflare **Workers** (not Pages; Pages could not serve the static assets)
  worker `nuave-v2` serves `https://v2.nuave.ai` (noindex). Fallback:
  `https://nuave-v2.mail-yasirmukhtar.workers.dev`. `nuave.ai` is untouched.
- CI (`.github/workflows/ci.yml`): `validate` on every PR; on `main`,
  `verify-main-origin` (fails a commit without a merged PR), then `deploy`.
  Each PR gets a `nuave-pr-<number>` preview worker with dummy keys.
- **Since Spec 016 (PR #129, deployed 2026-10-13):** the deploy job also writes the
  runtime settings as **Worker secrets** (mode, emergency switch, daily cap,
  order limit, email list, Resend key and sender, provider keys). At run time a
  Worker secret wins over the build-time value, and the every-minute cron reads
  only Worker secrets. The deploy job applies D1 migrations first.
- **Emergency stop:** in the Cloudflare dashboard, worker
  `nuave-v2` → Settings → Variables and Secrets, set `NUAVE_NEW_AUDIT_ENABLED`
  to `false` (change it; do not delete it, or the build value `true` applies). This stops new orders, paid steps and the cron within a minute; an
  open audit tab shows "waiting". The next deploy from `main` sets it back to
  `true` unless `ci.yml` is changed too. Changing only the build value in
  `ci.yml` stops nothing.
- Secrets (names only): `OPENAI_API_KEY`, `CHEAPERINFERENCE_API_KEY`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NUAVE_ORDER_EMAIL_ALLOWLIST`,
  `RESEND_API_KEY`, `NUAVE_MAIL_FROM`. D1:
  `nuave-v2-spend` (production), `nuave-v2-preview` (PR previews).
- Deploy settings: `NUAVE_PROVIDER=openai`, `NUAVE_QUESTION_PROVIDER=openai`,
  `OPENAI_BASE_URL=https://api.openai.com/v1`,
  `OPENAI_AUDIT_MODEL=gpt-5.6-luna`, `OPENAI_AUDIT_REASONING_EFFORT=low`,
  `NUAVE_AUDIT_MODE=live`, `NUAVE_NEW_AUDIT_ENABLED=true`. The last is the
  emergency switch: off stops every audit endpoint before provider work.
- Per-IP Cloudflare rate limits are in `wrangler.jsonc`.
- **Founder to-do:** delete the unused `NUAVE_ACCESS_CODE` GitHub secret.

## Production AI setup

- Extraction, observations and the report use OpenAI directly
  (`gpt-5.6-luna`, low reasoning). Question writing uses GLM 5.3 Flash
  through Cheaper Inference
  ([2026-09-20](./DECISION_LOG.md#2026-09-20--audit-provider-switches-to-direct-openai-opencode-go-dropped)).
- Web search: extraction only on the business's own website; required for
  every observation; none for question writing or the report.
- Call limits: `AUDIT_STAGE_CALL_LIMITS` in `src/lib/audit/telemetry.ts`.
  The USD 5 per-session ceiling uses spending history sent by the browser
  (S2 replaces this). `OPENAI_AUDIT_CARRYOVER_COST_USD` adds a minimum
  already-spent amount; the deploy job does not set it.

## Deferred security work — before customer testing or public sharing

**S1 merged in [#110](https://github.com/yasir-mukhtar/nuave_v0.2/pull/110):** root patches
and the production dependency audit pass; dev-only brace findings remain disclosed.
This is not full security or customer-exposure readiness; S2 and safeguards still apply.
Dependency alerts remain unassessed by the JZ acceptance, not waived or resolved.

## Not now

- Standing task exclusions remain in [AGENTS.md](../AGENTS.md#parked-work); broad cleanup does not reactivate them.
- The plan's [parking lot](./PAYING_CUSTOMER_PLAN.md#6-parking-lot-after-we-have-paying-customers),
  including the open questions, waits until after the first paying customer.
- Non-scope: [`END_TO_END_PLAN.md` §12](./END_TO_END_PLAN.md#12-explicit-non-scope-through-initial-launch),
  plus an agency or white-label reseller layer, advanced brand controls,
  automated recurring monitoring (a re-check the customer buys is allowed),
  any score beyond the direct count out of ten, and fabricated demand,
  results or testimonials.
