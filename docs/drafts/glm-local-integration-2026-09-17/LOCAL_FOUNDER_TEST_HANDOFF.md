# GLM founder test — one working session

2026-09-17. **Prepared for founder dispatch.** The founder approved time-boxing
and requested this action plan. Passing this handoff to the worker authorizes
the bounded offline implementation below; it does not authorize paid calls,
production changes, commit or push. This document is the complete task contract,
not a request for another implementation plan.

## Outcome and clock

Continue with the existing worker in
`/Users/yasir/nuave-worktrees/glm-prototype`, branch
`codex/glm-dormant-prototype-2026-09-17`. Preserve its six-file working change.

Deliver one local, founder-only path:

**Confirm one fictional business → prepare GLM questions → inspect/edit ten
questions → save/approve the local pack.**

Reuse `/audit/new-intake` and its existing confirmation and question screens.
Start with a non-regulated whole-brand fixture, preferably the fictional
Laundry Ceria context already used by the accepted specimen. Preparation of
business facts remains explicitly fixture/manual; do not imply live extraction.
The default preview remains deterministic. The experimental GLM mode must be
explicit, server-controlled, and unavailable in deployed production.

Time box: **120 minutes elapsed from starting implementation, including checks
and the return.** Target 15 minutes to trace the seams, 60 to connect them,
30 for verification and 15 for demo instructions/handoff. Record start/end.
At 60 minutes, report whether the UI path works with a stub. At the deadline,
stop and return the working result or precise blocker and remaining work.
Do not silently extend the session, reopen broad design, or start another
validator-hardening round. A timeout is not a pass and does not waive checks.

## Authority and required context

Read the worktree's `AGENTS.md` and `README.md`, then in
`/Users/yasir/nuave_v0.2/` read:

1. `docs/NOW.md`, `docs/WORKFLOW.md`, this handoff, and the decision-log entry
   “time-box the next founder test.”
2. `docs/checkpoints/2026-09-17-winning-prompt-glm/CHECKPOINT.md` and the complete
   `docs/references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md`.
3. This directory's `REQUEST_SPECIMEN.json`, accepted `INTEGRATION_DRAFT.md`
   §§4a/8, and `IMPLEMENTATION_REVIEW_4.md` for recorded limitations.
4. Spec 008 R5 §§3.2/4.3/5 and `src/lib/intake/README.md` in the worktree.

This dispatch creates a narrow sequencing exception for a local founder
experiment before general validator closure/G2P. It does not pass G2P, close
the recorded defects, authorize customer release or adopt the deferred
production contract. Production gates and the existing audit-answer provider
remain unchanged. Stop expanding hypothetical edge cases during this task.
Fix issues that actually prevent this bounded test or break its protections.

## Implementation boundary

Use the existing frozen intake → `parseQuestionFactsV3` → `buildV3WriterContext`
→ accepted GLM request builder. Keep the instruction, ten-slot matrix,
no-diversity-quota amendment, founder examples and strict extractor unchanged.
Return missing/invalid facts for correction; do not invent them.

Implement the minimum server transport and UI connection, tested through an
injected/stubbed transport first. The real path stays disabled pending a
separate founder authorization: pinned Cheaper Inference endpoint,
`glm-5.3-flash`, low reasoning, existing 4096 output limit, 180-second wait,
one request per authorized attempt, no automatic retries or hidden fallback.
Credentials stay server-side. Client refresh, double clicks, fact changes and
error recovery must not silently issue additional requests. Reuse existing
operation and stale-response handling where possible.

Show honest waiting/failure states and allow inspection of returned questions.
Use the same v3 rules for generated text and edits; preserve exact saved text
and invalidate it when confirmed facts change. Retain original and edited
wording separately in the local state. A failed check is displayed as such;
do not silently replace questions, stamp unearned `self_check` truths, or
pretend a fixture response is live output. A local review record need not
migrate the production PromptPack/history schemas.

Keep both requested and returned model identifiers. The observed
`zai/glm-5.3-flash` name remains unconfirmed; retain the assessor's mismatch
verdict while making returned text available for local inspection. Inspection
is not model-identity acceptance. No arbitrary prefix stripping. Read billing
from the nested provider field and label unavailable cost honestly. Minimize
browser metadata; any raw provider capture stays in restricted local storage.

Stop at local question approval. Disable audit execution in this experimental
mode and retain truthful `auditExecuted:false`. Do not label the new record as
the old zero-provider-call simulated handoff. Connecting this approved pack
to the existing audit/report is the next bounded milestone.

Expected edit scope: the existing GLM module and a small server transport/
local API adapter; `src/app/audit/new-intake/`; the necessary files in
`src/lib/intake/`; focused tests; and the existing dormancy/isolation guard
tests. Keep default no-provider behavior covered. Permit only explicitly named
experimental callers in those guards; do not remove the guards. Reuse existing
UI components. No redesign, new evaluator, generic framework, fallback project,
provider-default change, payment work or production schema migration.

## Definition of done and return

Demonstrate the actual browser path with a clearly labeled synthetic response:
confirmed input reaches the real builder; ten texts appear; a founder-style
multi-sentence edit saves; Back/refresh preserves it; a facts edit invalidates
the pack; timeout/malformed output shows a truthful failure without a retry.
Verify the experimental route cannot be used in production, default preview
stays offline, and no secret reaches the client or logs. Run focused checks
and full `npm run verify` offline. If unfinished at the deadline, report the
remaining check rather than claiming readiness.

Return a local URL and exact startup command, checks/results, changed paths,
and a short screen recording/screenshots or reproducible browser walkthrough.
Also return a concrete, **unexecuted** live-test proposal: frozen fictional
input/request and source hashes, one-request scope, current cost estimate
with its assumptions, timeout/no-retry stop rules, metadata caveat, and how
the single attempt is enabled. Do not read credentials or send a real request.
Do not add another planning document; a short `LOCAL_FOUNDER_TEST_RESULT.md`
in this directory is sufficient.

The orchestrator gets **20 minutes** for one consolidated review of this
definition of done. New unrelated guard counterexamples are recorded for
later, not used to restart general hardening. A concrete privacy, identity,
spend, production-isolation or exact-input/output failure in this test still
blocks the affected action. Return that exact blocker without relabeling it
as a pass.

Next: founder authorizes the prepared single GLM request, tries the flow for
about 15–20 minutes and judges the actual questions. Then scope the shortest
connection from the approved pack to one audit and downloadable report.
Audit calls require their own explicit authorization. No merge, deployment,
public/customer exposure, commit or push is included here.
