# Nuave now

> Updated: 2026-09-27
> Stage: Stage 1 of the [paying-customer plan](./PAYING_CUSTOMER_PLAN.md):
> finish the intake journey
> History: the previous 954-line page is at `git show 29addbe:docs/NOW.md`

## Current state

- **The plan:** [`PAYING_CUSTOMER_PLAN.md`](./PAYING_CUSTOMER_PLAN.md),
  approved by the founder on 2026-09-27
  ([decision](./DECISION_LOG.md#2026-09-27--approve-the-paying-customer-plan)).
  Its §1 ledger is the progress record; §2 is the finish line; §5 has each
  milestone. It replaces [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md) for the
  order of work; the old plan stays as the reference for detailed requirements.
- **What works today:** on `v2.nuave.ai`, anyone with the link can enter a
  business website, confirm the prepared summary, approve ten questions, run a
  live audit, and read and download the report (PDF and JSON). Nothing is
  saved on the server, and there is no payment or email.
- **Specs:** [Spec 011](../specs/011-smart-consultant-intake/SPEC.md) (prepared
  intake) is Verified. [Spec 012](../specs/012-evidence-first-report/SPEC.md)
  (report) is Verified with the founder-approved AC-18 exception. No spec is
  active; the Stage 1 spec comes after J1. Latest checkpoint:
  [2026-09-19 live report](./checkpoints/2026-09-19-live-direct-ten-report/CHECKPOINT.md).
- **Engineering track:** the [Agentic Engineering Playbook](./AGENTIC_ENGINEERING_PLAYBOOK.md)
  was adopted on 2026-09-26; its §B.3 guards merged through PR #91 on
  2026-09-27.

## Next action

- **Active milestone: J1, the gap list** (plan §5). The orchestrator writes
  the worker prompt from [`templates/WORKER_PROMPT.md`](./templates/WORKER_PROMPT.md).
- **Founder, when ready:** say what "done" means for the journey if it is
  more than matching the reference (plan §4.1).

## Rules still in force

- **Live AI spend:** every earlier live allowance is used up. Recorded spend is
  USD 1.06241155 of 5. Agents make live AI calls only with a named founder
  approval. The founder's own test runs are exempt (plan §5, JZ).
- **Open live audit:** the founder accepted the ungated, unlisted live audit on
  2026-08-20 (the 2026-08-20 "interim exposure" row in
  [`DECISION_LOG.md`](./DECISION_LOG.md)). S2 adds a server-side spending cap;
  S4 adds payment.
- **Private evidence stays out of Git:** keep it in `.local-evidence/` and
  `.secrets/` (both ignored). The old
  `devin/sol-smart-consultant-intake-plan` branch's uncommitted files are
  backed up in `.local-evidence/branch-closeout-20260927/`.

## Deployment

- Cloudflare worker `nuave-v2` serves `https://v2.nuave.ai` (noindex, direct
  link only). Fallback: `https://nuave-v2.mail-yasirmukhtar.workers.dev`.
  `nuave.ai` and `www.nuave.ai` are untouched.
- CI (`.github/workflows/ci.yml`): `validate` on every PR; on `main`,
  `verify-main-origin` (fails a commit without a merged PR) then `deploy`.
  Each PR also gets its own `nuave-pr-<number>` preview worker with dummy
  provider keys (`.github/workflows/pr-preview.yml`).
- Settings are baked in at build time, so a settings change needs a redeploy.
- Secrets (names only): `OPENAI_API_KEY`, `CHEAPERINFERENCE_API_KEY`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. The deploy job also sets
  the provider settings below and `NUAVE_NEW_AUDIT_ENABLED` /
  `NUAVE_AUDIT_MODE`. `NUAVE_NEW_AUDIT_ENABLED` is the emergency switch:
  turning it off stops every audit endpoint before any provider work.
  `NUAVE_AUDIT_MODE` is `live` in production and `synthetic` for testing.
- Per-IP Cloudflare rate limits (`wrangler.jsonc`) act as a burst brake.
- **Founder to-do:** delete the unused `NUAVE_ACCESS_CODE` GitHub secret.

## Production AI setup

- Audit stages (extraction, observations, report) call OpenAI directly:
  `gpt-5.6-luna`, low reasoning, `OPENAI_API_KEY`. Question writing uses GLM
  5.3 Flash through Cheaper Inference
  ([2026-09-20 decision](./DECISION_LOG.md#2026-09-20--audit-provider-switches-to-direct-openai-opencode-go-dropped)).
- Web search: extraction searches only the business's own website; every
  audit observation must search; question writing and the report do not.
- Per-stage call limits are `AUDIT_STAGE_CALL_LIMITS` in
  `src/lib/audit/telemetry.ts`. The USD 5 per-session ceiling is checked per
  request using spending history sent by the browser (S2 replaces this).
  `OPENAI_AUDIT_CARRYOVER_COST_USD` sets a minimum already-spent amount
  counted against that ceiling; the deploy job does not set it today.

## Deferred security work — before customer testing or public sharing

Still pending: update root `fast-uri` and `hono` before any customer testing
or public link sharing. The details and done-when are in plan §5, **S1**. A
clean `npm audit` or Dependabot list does not mean this is done.

## Not now

- Everything in the plan's [parking lot](./PAYING_CUSTOMER_PLAN.md#6-parking-lot-after-we-have-paying-customers)
  waits until after the first paying customer.
- Non-scope through launch: [`END_TO_END_PLAN.md` §12](./END_TO_END_PLAN.md#12-explicit-non-scope-through-initial-launch),
  plus: an agency or white-label reseller layer (partner pricing, resale
  margins, agency outreach); advanced brand controls; automated recurring
  monitoring (a re-check the customer chooses to buy is allowed); any score
  beyond the direct count out of ten (no banded, percentage or rank score);
  and fabricated demand, results or testimonials.
