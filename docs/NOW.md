# Nuave now

> Updated: 2026-09-28
> Stage: Stage 1 of the [paying-customer plan](./PAYING_CUSTOMER_PLAN.md):
> finish the intake journey
> History: the previous 954-line page is at `git show 29addbe:docs/NOW.md`

## Current state

- **The plan:** [`PAYING_CUSTOMER_PLAN.md`](./PAYING_CUSTOMER_PLAN.md)
  ([approved 2026-09-27](./DECISION_LOG.md#2026-09-27--approve-the-paying-customer-plan)).
  Its §1 ledger is the progress record. Which plan governs what:
  [`INDEX.md`](./INDEX.md#current-development-plan).
- **What works today:** on `v2.nuave.ai`, anyone with the link can enter a
  business website, confirm the prepared summary, approve ten questions, run a
  live audit, and download the report (PDF and JSON). Nothing is saved on the
  server, and there is no payment or email.
- **Specs:** [Spec 013](../specs/013-airbnb-intake-journey/SPEC.md) (Stage 1
  intake) is implementing; J2 and J3 merged with PASS (plan §1). The full
  spec is not yet verified. Latest verified:
  [Spec 011](../specs/011-smart-consultant-intake/SPEC.md) (intake) and
  [Spec 012](../specs/012-evidence-first-report/SPEC.md) (report, with the
  AC-18 exception). Checkpoint: [2026-09-19 live report](./checkpoints/2026-09-19-live-direct-ten-report/CHECKPOINT.md).
- **Engineering track:** [playbook](./AGENTIC_ENGINEERING_PLAYBOOK.md)
  adopted 2026-09-26; its §B.3 guards merged through PR #91 on 2026-09-27.

## Next action

- **Active milestone: J4** (Spec 013, "Delivery slices"): focus, location
  and product screens. Carry #98 M2 (enforces R-02): drop locations with
  a source host outside the audited website (allow `www`) before website
  attribution. Handoff: [`WORKER_PROMPT.md`](./templates/WORKER_PROMPT.md).

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
- **Private evidence stays out of Git:** `.local-evidence/` and `.secrets/`
  (both ignored). The old `devin/sol-smart-consultant-intake-plan` branch's
  uncommitted files are in `.local-evidence/branch-closeout-20260927/`.

## Deployment

- Cloudflare **Workers** (not Pages; Pages could not serve the static assets)
  worker `nuave-v2` serves `https://v2.nuave.ai` (noindex). Fallback:
  `https://nuave-v2.mail-yasirmukhtar.workers.dev`. `nuave.ai` is untouched.
- CI (`.github/workflows/ci.yml`): `validate` on every PR; on `main`,
  `verify-main-origin` (fails a commit without a merged PR), then `deploy`.
  Each PR gets a `nuave-pr-<number>` preview worker with dummy keys.
- Settings are baked in at build time; a settings change needs a redeploy.
- Secrets (names only): `OPENAI_API_KEY`, `CHEAPERINFERENCE_API_KEY`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
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

Update root `fast-uri` and `hono` first: plan §5, **S1**. A clean
`npm audit` or Dependabot list does not mean this is done.

## Not now

- The plan's [parking lot](./PAYING_CUSTOMER_PLAN.md#6-parking-lot-after-we-have-paying-customers),
  including the open questions, waits until after the first paying customer.
- Non-scope: [`END_TO_END_PLAN.md` §12](./END_TO_END_PLAN.md#12-explicit-non-scope-through-initial-launch),
  plus an agency or white-label reseller layer, advanced brand controls,
  automated recurring monitoring (a re-check the customer buys is allowed),
  any score beyond the direct count out of ten, and fabricated demand,
  results or testimonials.
