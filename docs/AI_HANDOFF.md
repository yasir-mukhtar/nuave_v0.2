# Nuave AI handoff context

> Status: **Working continuity reference — not product authority**
> Updated: 2026-08-22
> Purpose: preserve the minimum durable context needed to continue Nuave in a
> fresh AI session without relying on long chat history.
>
> This file is intentionally subordinate to the repository authority chain. If
> anything here conflicts with a newer founder-approved decision or canonical
> document, the canonical source wins. Update this file when a major phase,
> release, or product decision changes the operating context; do not turn it
> into a second decision log.

## 1. How a fresh agent should use this file

Read in this order:

1. `AGENTS.md` — contributor and safety rules.
2. `docs/NOW.md` — current objective and next action.
3. this file — continuity, chronology, release topology, and why the current
   implementation has its unusual constraints.
4. the approved specification named by `NOW.md`.
5. only the canonical/domain documents that specification requires.

Repository authority remains:

1. newest founder-approved entry in `docs/DECISION_LOG.md`;
2. `docs/VISION.md`;
3. `docs/PRODUCT.md`;
4. relevant domain guide such as `docs/AUDIT.md` or `docs/VOICE.md`;
5. the approved bounded specification; and
6. implementation and tests.

`docs/NOW.md` owns operating state. This file is a handoff aid, not permission
for an agent to override those sources.

## 2. Product snapshot

Nuave is an AI visibility audit for small and medium Indonesian businesses. It
serves the owner or marketing decision-maker responsible for the business being
audited. The practical promise is bounded evidence: show how the business
appears in a defined sample of AI-assisted searches, explain what matters, and
recommend a small number of evidence-backed next actions.

Important product constraints already settled in canonical documents:

- The primary customer is the business owner/marketing decision-maker, not an
  agency reseller. Agency/white-label is a later layer.
- The offer is one paid audit plus an optional comparable re-check after roughly
  six to eight weeks, not a monitoring subscription or dashboard.
- The working audit price is `Rp99.000` total, still provisional until real
  buyers respond.
- Customer-facing product language is Indonesian. English is acceptable for
  internal engineering artifacts only.
- The headline result is the direct observed appearance count with denominator
  (for example `4/10`), not an invented rank, forecast, or universal score.
- `Tanpa menyebut bisnis Anda`, `Menyebut bisnis Anda`, recommendation,
  comparison, and public-information assessment keep separate denominators.
- Evidence comes before scoring. Findings must distinguish observation,
  interpretation, and action.
- Nuave does not promise ranking, future inclusion, revenue, leads, or causal
  improvement.
- The product remains pre-customer. A successful founder-run audit is evidence
  that the pipeline works, not evidence of demand or willingness to pay.

The target journey remains:

```text
Landing
→ Order Preview
→ Payment
→ Business Facts
→ Questions
→ Audit Run
→ Audit Report
→ later comparable re-check
```

During development, selected boundaries are intentionally simulated until the
preceding quality gate has passed.

## 3. Original end-to-end plan and current phase position

`docs/END_TO_END_PLAN.md` defines the thin v2 build order. The core sequencing
principle is: make one complete journey reviewable, replace simulated boundaries
one at a time, and stop at the report-quality gate if the report is not worth
paying for.

Current phase context:

- **Spec 001 — simulated journey shell:** verified. It established the frozen
  fixture-backed journey and honest simulated checkout.
- **Spec 002 — Indonesian audit contract:** verified. It established the
  Indonesian question/report contracts and fixture baseline.
- **Spec 003 — live report-quality gate:** implementation reached the reviewed
  pre-live state, was deployed as a bounded release candidate, and the founder
  subsequently completed a manual audit end to end and successfully generated
  a report. The remaining formal closeout is the evidence-backed R-31/R-32
  founder quality judgment and repository verification update. Do not call Spec
  003 Verified merely because the workflow completed.
- **Spec 004 — source hero intake:** approved and represented in current `main`;
  it simplifies the first audit input into a one-field public-source handoff.
  Its status documents still describe implementation as in progress unless a
  later verification says otherwise.
- **Spec 006 — product-wide polish:** implementing. P0 foundation and P1 landing
  were verified on 2026-08-20. P2–P7 were deliberately gated on the Spec 003
  report-quality gate.

After Spec 003 formally passes, continue the founder-approved plan rather than
inventing a new roadmap: durable private delivery/state, real checkout and
remedies, the remaining product-wide polish, then bounded customer exposure and
later launch work. Exact phase boundaries remain governed by
`docs/END_TO_END_PLAN.md` and newly approved specs.

## 4. Critical repository and deployment topology as of 2026-08-22

Do not assume `main`, the reviewed Spec 003 branch, and the currently deployed
release are the same commit.

### Current `main`

At the time this continuity file was prepared:

```text
main = 18936b9d0faed8b0dc826797f587aee85c828bfd
```

The commit message was `style(landing): apply hero boundary cleanup`.

### Reviewed Spec 003 release candidate

PR #3:

```text
branch: spec-003-finish-live-quality-gate
reviewed head: a0fae0b5dd3ff4200f02be2dac0b11adfb4bc80b
F2 verdict: APPROVE WITH NON-BLOCKING NOTES
CI: run #156, green
unit: 462/462 across 30 files
E2E: 36/36
build: PASS
build:cf: PASS
```

PR #3 is currently **closed and unmerged**. Its head remains the reviewed SHA.
The branch and `main` have diverged from their older merge base; do not infer
that closing the PR merged the reviewed release into `main`.

The founder explicitly deployed the reviewed release candidate for the first
paid/founder-supervised gate and later reported that a manual audit completed
smoothly end to end and generated a report. That live-run fact has not yet been
closed out with the full R-31/R-32 evidence record in the Spec 003 verification
package.

### Why this matters

`.github/workflows/deploy-pages.yml` deploys on every push to `main`. Therefore
merging a documentation or unrelated branch into `main` can also deploy the
current `main` application code. Before merging any docs-only closeout branch,
verify whether the intended live code should remain the reviewed release
candidate or whether `main` has been reconciled and re-reviewed for deployment.

This is an operational safety rule, not a request to keep branches divergent
forever. Resolve the topology deliberately; do not accidentally replace the
known-good live build while doing documentation cleanup.

## 5. Protected Spec 003 production method

The current protected production method is deliberately narrow and fail-closed.
Do not reopen provider selection unless a new founder decision or real evidence
requires it.

```text
NUAVE_PROVIDER=opencodego
NUAVE_QUESTION_PROVIDER=opencodego
OPENCODEGO_API_KEY=<canonical server secret>
OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
OPENAI_AUDIT_MODEL=gpt-5.6-luna
OPENAI_AUDIT_REASONING_EFFORT=low
```

`OPENAI_API_KEY` may be populated internally/build-time only as the compatibility
alias consumed by the existing OpenAI SDK adapter. `OPENCODEGO_API_KEY` is the
canonical credential.

The complete protected method must fail before provider work if production is
configured with the wrong provider, question provider, endpoint, model, or
reasoning effort. `NUAVE_LIVE_PROVIDER_TESTING=1` is ignored for this purpose in
`NODE_ENV=production`.

Stage behavior:

| Stage | Production behavior |
|---|---|
| Extraction | OpenCode Go / GPT-5.6 Luna / low reasoning; web search required and restricted to the submitted official domain |
| Question generation | OpenCode Go / GPT-5.6 Luna / low reasoning; exactly one bounded no-search question-writer call, with deterministic Indonesian fallback for ordinary provider/format failure |
| 10 main observations | Same protected method; required web search for every observation; missing search is a technical failure, not evaluable evidence |
| Report synthesis | Same protected method; no web search; compact Indonesian synthesis with code-owned observable facts |
| Variance re-asks | Same protected observation method with required web search; stored separately from the ten main observations |

No audit may mix providers or stale observation methods. Resumed and report
observations must carry current OpenCode Go provenance and the locked requested
model before they can be accepted.

## 6. Spec 003 workflow invariants that must not regress

These were repeatedly found by adversarial review and now have regression
coverage. A future agent should preserve them unless a new spec explicitly
changes them.

### Main evidence and report

- Exactly ten locked primary questions feed exactly ten primary observations.
- A report cannot synthesize until the main observation set is complete and
  valid under the current production method.
- Retained completed observations are not rerun just because report generation
  fails.
- The report must not turn citation presence into visible brand appearance.
- Code owns observable facts and denominators; the model supplies bounded
  narrative/assessment, not a second source of truth.
- A language-only retry may improve writing but may not mutate protected
  evidence.
- Important claims must remain traceable to the retained evidence/public
  sources.
- Report actions are limited to one to five evidence-backed priorities; no
  deficiency may be invented merely to fill the list.

### Resume and browser state

- Browser workflow storage was versioned so pre-migration direct-OpenAI state is
  not silently resumed as a current OpenCode audit.
- There is still no Phase-4 server-owned durable order/run state. Do not build
  one inside a Spec 003 cleanup task.

### Variance

The real product path now follows:

```text
10 main observations
→ report
→ variance
→ terminal completion
```

Variance behavior is separate measurement evidence:

- exactly two deterministic locked questions are selected by the implemented
  rule: the first unbranded question and the first branded question in locked
  pack order;
- variance runs only after a successful report;
- variance observations never become observation 11/12, never affect report
  denominators, and never feed report synthesis;
- successful or terminal stored variance for the same stable report run key
  prevents duplicate automatic execution;
- if variance fails after report success, the valid report remains available
  while variance is recorded as incomplete/failed;
- the post-report cost/call ledger is carried into the variance request so the
  final paid work is not under-accounted;
- a restored report without sufficient exact post-report ledger information
  fails variance closed rather than issuing an under-accounted provider call.

## 7. Why the implementation contains these guards: condensed review history

The current shape is the result of multiple independent implementation and
review passes, not arbitrary abstraction.

### Initial final-review findings

The first independent Spec 003 review found four important gaps:

1. production provider name was locked, but endpoint/model/reasoning were not
   completely fail-closed;
2. resumed or direct-report inputs could mix historical direct-OpenAI evidence
   with new OpenCode evidence;
3. useful `questions-id-provider` regression coverage had been lost during the
   provider migration; and
4. CI still contained stale direct-OpenAI credential assumptions.

Parallel fix tracks addressed those areas plus stale Sozo live scripts, then an
integration pass reconciled shared production-method authority.

### Later blockers found by independent reviewers

- The real `/api/audit/prompts` boundary originally checked only provider name;
  it was fixed to enforce the complete OpenCode production method before any
  question fetch.
- `npm run build:cf` was initially not part of the normal PR proof; a safe
  dummy-credential build-only CI step was added so Cloudflare/OpenNext build
  compatibility is continuously verified without deployment/provider calls.
- The variance API existed but the real `/audit` client never invoked it. The
  product workflow was fixed so report success leads into variance exactly once
  before terminal completion, with failure semantics that preserve the report.

### Final pre-live approval

The final F2 review returned **APPROVE WITH NON-BLOCKING NOTES** at
`a0fae0b5dd3ff4200f02be2dac0b11adfb4bc80b` with all required offline gates
green. The two non-blocking documentation notes were:

- the original Spec 003 document still contains historical direct-OpenAI
  wording that is superseded by the 2026-08-21 decision; and
- the automated checkpoint text in `VERIFICATION.md` lagged behind the final
  reviewed test/head metadata.

Those are documentation/history issues, not reasons to reopen provider
architecture.

## 8. Founder-supervised live-run state

After F2 approval, the reviewed release candidate was deployed for the bounded
founder-supervised quality gate. The founder then reported that a manual audit
ran smoothly from end to end and generated a report.

This establishes an important operational fact:

> the protected product path can complete from intake through report/variance
> under the deployed method without the earlier implementation blockers.

It does **not** by itself establish that the report is worth paying for. Spec
003 closes only after the founder records the human quality judgment required by
R-31/R-32 with concrete report/evidence references.

Do not reconstruct private report content from memory. Preserve or review the
actual report, evidence export, variance result, PDF/print artifact, cost/call
ledger, provenance, and visible failures/limitations when closing the gate.

## 9. Remaining Spec 003 closeout

The smallest remaining Spec 003 sequence is:

1. Preserve the successful live-run artifacts: rendered report, evidence export,
   variance result/status, PDF/print output, cost/call accounting, and relevant
   provider/model provenance.
2. Perform the founder R-31/R-32 review against the actual output.
3. Record the criterion-by-criterion evidence and final verdict in
   `specs/003-live-report-quality-gate/VERIFICATION.md`.
4. Refresh stale automated evidence metadata there to the final reviewed CI
   state (`462/462` unit tests, `36/36` E2E, build and `build:cf` green) or to a
   later exact verified head if the code changes first.
5. Add only a small dated superseding note to `SPEC.md` for historical
   direct-OpenAI wording; do not rewrite history as though OpenCode Go was
   always the plan.
6. Mark Spec 003 Verified only if the human report-quality gate passes or the
   founder explicitly accepts a documented exception.
7. Update `docs/NOW.md` and `docs/INDEX.md` to the next bounded outcome after
   closeout.
8. Resolve the reviewed-release-vs-`main` topology deliberately before allowing
   a `main` push to change the live deployment.

## 10. R-31 / R-32 human quality gate

This is intentionally a founder judgment gate. Automated CI cannot replace it.

The complete real report and evidence export are read as both:

- a sceptical business owner; and
- an audit professional checking evidence/method integrity.

The R-32 exit criteria are:

1. **10/10 evaluable observations.** All ten primary observations are usable
   evidence.
2. **1–5 material, specific findings.** One or two genuinely strong findings
   are sufficient; filler is not required.
3. **Important claims are traceable.** Every material claim can be traced to an
   observation or public source.
4. **Understandable in about ten minutes.** A non-technical Indonesian
   decision-maker can understand the report in roughly ten minutes.
5. **Observation, interpretation, and action are distinguishable.** The reader
   can tell what was observed, what Nuave infers, and what Nuave recommends.
6. **1–5 feasible, evidence-linked actions.** When no immediate corrective gap
   is supported, a clearly labelled maintenance or further-investigation action
   is acceptable instead of inventing a problem.
7. **Failures and limitations remain visible.** Uncertainty, failed tests, and
   relevant method limitations are not hidden.
8. **PDF/print preserves the same facts.** The derived artifact must not change
   or omit material factual content from the validated report.

If the gate fails, stop the phase and improve the method before moving to
durable delivery/payment/customer exposure. A smooth pipeline is necessary but
not sufficient.

## 11. Current parallel/recent product work on `main`

`main` continued receiving UX/reliability work while the Spec 003 release
candidate was reviewed separately. A future agent should inspect the exact
branch it is asked to modify instead of assuming the deployed RC represents all
current UI work.

Notable current-main changes include:

- one-field source/hero intake work and landing-to-audit handoff improvements;
- audit reliability/client-contract regression work;
- landing visual cleanup/polish;
- a `SimilarBusinessesEditor` in Business Facts: similar businesses are
  optional URL entries, users can add/remove multiple entries, AI-suggested
  entries are labelled `Saran Nuave`, and supported sources are website,
  Instagram profile, or Google Business Profile; and
- removal of the old mandatory competitor business-scope text model in favor of
  a simpler similar-business URL concept.

These changes are relevant product evolution, but their verification status is
not automatically inherited from the separately reviewed Spec 003 release.
Read the active spec/current tests before shipping them.

## 12. Things future agents should not rediscover from scratch

Unless new evidence or a founder decision reopens them, treat these as settled
for the current protected Phase-3 method:

- OpenCode Go is the production transport.
- GPT-5.6 Luna is the locked audit model.
- Reasoning effort is `low`.
- `OPENCODEGO_API_KEY` is canonical; the OpenAI key name is compatibility
  plumbing only.
- Question generation uses no web search.
- Extraction searches only the submitted official domain.
- Main observations and variance re-asks require web search.
- Report synthesis uses no web search.
- One audit cannot mix provider/method provenance.
- Main report evidence is exactly ten observations; variance is separate.
- Customer-facing language is Indonesian.
- Browser-only workflow state remains acceptable for the founder-run phase;
  durable server state belongs later.
- Do not add payment, durable delivery, dashboard, subscriptions, multi-client
  management, or broad public launch scope merely because the live audit works.
- Do not mark the report-quality gate passed without the actual R-31/R-32 human
  evidence record.

## 13. Working style that has been effective in this project

The founder has been operating as orchestrator and using separate AI workers for
bounded implementation/review tasks. Preserve that separation for risky work:

1. write one bounded worker prompt;
2. use isolated branches/worktrees for parallel implementation when changes can
   be separated;
3. integrate deliberately when multiple agents touch shared invariants;
4. run independent adversarial review after integration;
5. freeze the exact reviewed SHA before deployment; and
6. if code changes after review, do not pretend the prior approval covers the
   new head.

Implementation success, CI success, deployment success, and product-quality
success are four different gates. Report them separately.

The founder prefers narrow, practical fixes over speculative architecture. When
something belongs to a later phase, record it and leave it there rather than
solving it opportunistically.

## 14. Fresh-agent handoff checklist

Before doing any new Nuave work, answer these questions from the repository:

- What branch/SHA am I actually working from?
- Is that SHA the deployed live build, current `main`, or another feature
  branch?
- What does `docs/NOW.md` say the current bounded outcome is?
- Has Spec 003's R-31/R-32 verdict been recorded yet?
- If I push/merge to `main`, will that automatically deploy a different build?
- Which approved spec owns this task?
- Am I being asked to change a settled production-method invariant or merely
  work around it?
- Does this task accidentally pull Phase 4/5 scope into a Phase 3/UI cleanup?
- What exact automated and human evidence will prove this task complete?

If those answers are unclear, inspect the authoritative files rather than
reconstructing decisions from chat history.