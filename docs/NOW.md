# Nuave now

> Updated: 2026-08-22
> Stage: pre-customer, closing the live report-quality gate

## Current objective

Close Phase 3 / Spec 003 formally.

The engineering gate is no longer the blocker. The protected OpenCode Go live
path was independently approved for the first founder-supervised paid audit,
the reviewed release candidate was deployed, and the founder reports that a
manual audit then ran smoothly end to end and generated a report.

The remaining bounded outcome is the **R-31/R-32 founder quality judgment** on
that real report and evidence package, followed by an accurate Spec 003
verification record. Do not mark Spec 003 Verified merely because the workflow
completed successfully.

Use [`AI_HANDOFF.md`](./AI_HANDOFF.md) when a fresh AI session needs the review
history, exact release topology, and the reasons behind the production guards.
It is a continuity aid, not product authority.

Wave 1 of the Phase 6 design pass
([`006-product-wide-polish`](../specs/006-product-wide-polish/SPEC.md)) remains
verified for P0 foundation and P1 landing. P2–P7 remain gated on the formal
report-quality verdict.

## Deployment and repository state

**`https://v2.nuave.ai` is live** on Cloudflare Workers. `nuave.ai` and
`www.nuave.ai` remain separate.

The successful founder-run Spec 003 audit was performed after deploying the
independently reviewed release candidate:

```text
reviewed/deployed Spec 003 SHA:
a0fae0b5dd3ff4200f02be2dac0b11adfb4bc80b

final F2 review:
APPROVE WITH NON-BLOCKING NOTES

reviewed CI:
check       PASS
unit        462/462 (30 files)
build       PASS
build:cf    PASS
E2E         36/36
```

PR #3 (`spec-003-finish-live-quality-gate`) is currently **closed and
unmerged**. Its reviewed head remains the SHA above.

Current `main` is on a separate, actively moving line of development. During
this documentation refresh it advanced from
`18936b9d0faed8b0dc826797f587aee85c828bfd` to
`f1ee248dc877a56f8f45f642fa39f689fe9ea9ae` through landing/hero style work.
A fresh agent must resolve the remote `main` SHA again before release or merge
work; these SHAs are a dated snapshot, not a permanent definition of `main`.

The reviewed Spec 003 release branch and current `main` have diverged. Do not
assume that `main` is identical to the deployed founder-run release.

This matters because `.github/workflows/deploy-pages.yml` deploys on every push
to `main`. A documentation-only merge can therefore also replace the live
application with whatever application code is on current `main`. Resolve the
release/main topology deliberately before merging closeout docs to `main`.

The access gate was removed in code under the founder's recorded interim
exposure acceptance. Do not reintroduce it casually. Public sharing still
requires the later safety/cost/privacy controls defined by the plan.

## Protected production method

The Phase-3 protected live method remains:

```text
NUAVE_PROVIDER=opencodego
NUAVE_QUESTION_PROVIDER=opencodego
OPENCODEGO_API_KEY=<canonical server secret>
OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
OPENAI_AUDIT_MODEL=gpt-5.6-luna
OPENAI_AUDIT_REASONING_EFFORT=low
```

`OPENAI_API_KEY` may be populated internally/build-time only as the compatibility
alias needed by the reused OpenAI SDK adapter. `OPENCODEGO_API_KEY` is the
canonical credential.

Production fails closed on a wrong provider, question provider, endpoint,
model, or reasoning effort. Alternate providers remain testing-only and cannot
be re-enabled in production through `NUAVE_LIVE_PROVIDER_TESTING=1`.

Stage-specific method:

- **Extraction:** web search required and restricted to the submitted official
  website/domain.
- **Question generation:** Indonesian, one bounded OpenCode Go/GPT-5.6 Luna
  call, no web search; deterministic Indonesian fallback remains for ordinary
  provider/format failure.
- **Main observations:** exactly ten locked questions; web search required for
  every observation; missing search is a technical failure.
- **Report synthesis:** Indonesian `plain-id-v1` path; no web search; code owns
  observable facts and denominators.
- **Variance:** same protected observation method with required web search,
  executed only after successful report generation and stored separately from
  the ten main observations.

Do not reopen these method decisions during documentation or UI cleanup unless
new evidence and a founder decision explicitly require it.

## Product facts that still govern

- Nuave serves the owner or marketing decision-maker of a small or medium
  Indonesian business auditing their own business.
- Nuave sells one audit plus an optional comparable re-check after roughly six
  to eight weeks, not subscription monitoring software.
- The working one-audit price is **Rp99.000 total**, still provisional until
  real buyers respond.
- The target journey remains Landing → Order Preview → Payment → Business Facts
  → Questions → Audit Run → Audit Report.
- Customer-facing language is Indonesian. English is acceptable for internal
  engineering artifacts only.
- The headline result is the direct observed appearance count with denominator,
  for example `4/10`.
- **Tanpa menyebut bisnis Anda**, **Menyebut bisnis Anda**, recommendation,
  comparison, and public-information assessment keep separate eligible
  denominators.
- The report requires 10/10 evaluable primary observations before delivery.
- One to five material findings and one to five evidence-backed actions are the
  target; one or two strong findings are sufficient.
- Observation, interpretation, and action must remain distinguishable.
- Important claims must remain traceable to retained observations/public
  sources.
- Failures and limitations remain visible; Nuave does not hide uncertainty to
  make the report look stronger.
- Nuave does not promise rankings, guaranteed inclusion, leads, revenue, or
  causal improvement.
- There are still zero paying v2 customers. The successful founder-run audit is
  product-operability evidence, not demand evidence.

## Spec 003 implementation facts that must not regress

- One audit cannot mix stale direct-OpenAI observations with current OpenCode Go
  evidence.
- The report gate is enforced inside the report library boundary as well as the
  HTTP route, so direct callers cannot bypass it.
- Browser workflow storage was versioned so pre-migration state is not silently
  resumed as a current audit.
- The main report receives exactly ten primary observations.
- Variance never becomes observation 11/12, never changes report denominators,
  and never feeds report synthesis.
- The real product sequence is now:

  ```text
  10 main observations
  → report
  → variance
  → terminal completion
  ```

- Variance deterministically selects the first unbranded and first branded
  locked questions, executes exactly once per settled report/run key, and uses
  the exact post-report budget/call ledger.
- If variance fails after report success, the valid report remains available
  while variance is recorded as failed/incomplete.
- Report retries cannot mutate protected evidence merely to pass language or
  presentation checks.
- `npm run build:cf` is part of the safe PR verification path with dummy
  non-secret production-shaped values; it is not a deploy action.

## Recent/current-main product work

Current `main` continued moving while the Spec 003 release candidate was
reviewed separately. Notable work present on `main` includes:

- source/hero intake and landing-to-audit handoff improvements;
- landing visual cleanup;
- audit reliability/client-contract regression coverage; and
- simpler competitor/similar-business input in Business Facts through
  `SimilarBusinessesEditor`: optional URL entries, add/remove behavior,
  AI-suggested entries labelled `Saran Nuave`, and website/Instagram/Google
  Business Profile source support.

These changes do not automatically inherit the verification status of the
separately reviewed/deployed Spec 003 SHA. Inspect the exact branch and active
spec before shipping them.

## What is not known

- Whether Indonesian small and medium business decision-makers will pay for the
  audit at all.
- Whether buyers will pay the current Rp99.000 total.
- Whether the successful founder-run report actually passes all eight R-32
  "worth paying for" criteria until that judgment is recorded with concrete
  evidence.
- Whether a buyer will act on the recommendations.
- Whether a buyer will purchase the six-to-eight-week re-check.
- How much ordinary run-to-run variation affects direct appearance counts in
  real repeated customer use.
- Which launch vertical/location will show the strongest combination of demand,
  understandable findings, and actionable public-information gaps.
- The final private report-access/recovery mechanism for Module 07.
- The final delayed-delivery remedy, support SLA, retention/correction policy,
  and production payment remedy details.

## Do now

Keep the next sequence narrow:

1. **Preserve the successful founder-run evidence.** Keep the rendered report,
   evidence export, variance result/status, PDF/print artifact, provider/model
   provenance, cost/call ledger, and any visible failures/limitations. Do not
   reconstruct private report facts from memory.
2. **Perform R-31/R-32 founder review.** Read the complete real report as both a
   sceptical owner and an audit professional. Record PASS/FAIL and concrete
   evidence for every exit criterion.
3. **Close Spec 003 accurately.** Update
   `specs/003-live-report-quality-gate/VERIFICATION.md` with the actual live-run
   facts, the quality verdict, and final automated evidence. Mark the spec
   Verified only if the quality gate passes or the founder explicitly accepts a
   documented exception.
4. **Repair the historical-document ambiguity.** Add a small dated superseding
   note to the Spec 003 `SPEC.md` explaining that the 2026-08-21 OpenCode Go
   decision supersedes its original direct-OpenAI production wording; do not
   rewrite history.
5. **Resolve release topology before merging.** Decide how the reviewed/deployed
   Spec 003 release is reconciled with current `main` before a `main` push
   changes the live deployment.
6. **Only after the quality gate passes, unlock the next planned work.** Continue
   with durable private delivery/state, real checkout/remedies, remaining
   product-wide polish, then bounded customer exposure according to
   `END_TO_END_PLAN.md` and newly approved specs.

## R-32 exit criteria

The report-quality gate is not replaced by CI. The report must satisfy all of
these human-review criteria:

1. 10/10 primary observations are genuinely evaluable.
2. It contains one to five material, specific findings; one or two strong
   findings are sufficient.
3. Every important claim is traceable to an observation or public source.
4. A non-technical Indonesian decision-maker can understand it in about ten
   minutes.
5. Observation, interpretation, and recommended action are clearly
   distinguishable.
6. It offers one to five feasible, evidence-linked actions; when no corrective
   gap is supported, maintenance or further-investigation is acceptable instead
   of inventing a problem.
7. Failures and limitations remain visible.
8. The PDF/print artifact preserves the same material facts as the validated
   report.

If this gate fails, stop and improve the method before proceeding to durable
delivery, real payment, or customer exposure.

## Not now

Until Spec 003 is formally closed, do not expand into:

- durable jobs or generalized server-owned workflow architecture;
- real customer payment or checkout activation;
- public launch/customer exposure;
- subscriptions or automated recurring monitoring;
- agency dashboards, multi-client management, team accounts, bulk workflows,
  or white-label infrastructure;
- multi-provider production fallback;
- broad multi-vertical launch claims; or
- invented benchmarks, ranks, guarantees, testimonials, or demand evidence.

The approved next phases may intentionally add some of these boundaries later;
this section prevents them from being pulled backward into Spec 003 closeout.

## Done for this cycle

This cycle is complete when:

1. the founder-run live report/evidence is preserved;
2. the R-31/R-32 judgment is recorded with concrete evidence;
3. Spec 003 receives an accurate final verification status;
4. repository/live release topology is understood before the next `main`
   deployment; and
5. `NOW.md` is advanced to the next smallest founder-approved outcome.

Material changes to customer, offer, promise, scope, or production method belong
in [`DECISION_LOG.md`](./DECISION_LOG.md), not in this operating-state file.