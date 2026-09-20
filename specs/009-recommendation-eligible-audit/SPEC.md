# Spec 009: recommendation-eligible questions through a downloadable report

> Status: **Approved** — founder approved the orchestrator's combined plan on 2026-09-18 and requested these bounded fresh-session handoffs.
> Owner: Founder / orchestrator
> Updated: 2026-09-19
> Delivery: one founder-only local path, not production activation

**Confirmed business brief → ten natural unnamed questions → human editing
and approval → ten independent grounded answers → downloadable report.**

This is the revised implementation plan and its single execution contract.
The founder starts the fresh sessions using the
[orchestrator and worker handoffs](../../docs/checkpoints/2026-09-17-winning-prompt-glm/NEXT_STEP.md).
Offline implementation is approved within the blocks below. Paid calls,
commits, pushes, merges and deployment are not authorized by this approval.

## 2026-09-19 amendment — finish the continuous audit experience

**Approved by the founder's latest instruction.** The completed real report is
not useful enough yet. Its format and usefulness work are deferred so the
end-to-end audit experience can be completed now. See the
[exact decision](../../docs/DECISION_LOG.md#2026-09-19--complete-the-audit-experience-before-improving-the-report).
This amendment takes precedence over the earlier requirement to stop all flow
work until the report is judged useful. AC-08's usefulness verdict is **not
passed; deferred for this continuation**, not relabeled as success. The report
standard remains; Spec 009 is not automatically Verified.

**Single deliverable:** one continuous founder-local browser journey from a
new business/source through prepared and confirmed facts, ten GLM questions,
free edits and explicit approval, visible audit progress, the existing web
report, and PDF/evidence download. The same session's confirmed facts and exact
approved texts must reach execution. The retained real-business checkpoint is
regression evidence, never a hidden substitute for the current session.

Complete the remaining connections in the existing UI and engine:

1. Use the existing identity/extraction boundaries to prepare facts for the
   entered business, retaining their source/unknown/buyer-supplied distinctions.
   Preserve the existing scope choices and correction UI. Offline tests use
   explicit substitutes at those boundaries; a fixture's facts cannot pass as
   facts extracted from a newly entered URL.
2. Carry the session's approved direct-ten pack and confirmed brief directly
   into the existing run/report boundaries. Replace the simulated handoff stop
   and separate retained-case-demo detour for this enabled flow. No operator
   copying JSON, editing a receipt, or preloading one business's pack is allowed
   between normal UI steps. Preserve existing retained evidence separately.
3. Reuse progress, failure and report components. Back/reload preserve settled
   inputs and completed results and must not trigger another paid stage.
   An interrupted running request may show an honest interrupted state; no
   durable job system is required. Preserve captured progress without claiming
   unsaved work completed. No duplicate audit from repeated clicks.
4. Use the current report content and layout. Make its normal PDF/print and
   evidence download controls work for the completed session. Verify actual
   artifacts in a supported normal browser. A separately authored review PDF
   or script-only export is not a pass. PDF recovery uses the same report and
   never reruns observations.

**Functional completion check (AC-10):** demonstrate a newly entered business
through the entire browser flow above, with one question edited and explicitly
approved, exact text/input carry-through, ten evaluable observations, opened
PDF/JSON artifacts, preserved Back/reload state and no incidental provider
sends. Verify offline first through real routes with labeled provider
substitutes and the existing `npm run verify` gate. One happy-path integration
plus focused stale-approval, failed-stage and no-duplicate-send checks is enough;
do not create another broad benchmark or cosmetic test project.

A missing comparator must not become a new requirement; correct its schema
only if it directly blocks this ordinary flow. Similarly, correct mode/progress
copy only where it misstates the current journey. Other deferred issues remain
notes. Report finding quality, excerpt selection, recommendation semantics,
format redesign and action-writing improvements are outside this continuation;
retain existing integrity protections rather than loosening them to pass.

Continue `/Users/yasir/nuave-worktrees/spec009-block-a` on its existing branch,
preserving dirty work. This is continuation of the existing deliverable, not a
restart from a new checkout. Previous block time/spend records remain intact;
record continuation time separately. The founder relays the worker handoff;
the orchestrator does not implement or dispatch agents. Return one verified
flow or one exact blocker and remaining estimate, not another general plan.
No new paid calls are covered; prepare any later live-test scope only after
this path is concrete. Payment, hosted delivery, publishing and deployment
remain outside this founder-local task.

## 1. Authority and settled choices

The [founder-accepted prompt](../../docs/references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md)
governs generation, with the repeated-needs amendment. Its central test is:
would naming actual businesses, providers, stores or products materially help
answer this natural consumer-choice request? Preserve its reasoning and
examples; do not reduce it to a sentence template.

The [founder's approval](../../docs/DECISION_LOG.md#2026-09-18--approve-the-bounded-recommendation-eligible-delivery)
settles these choices:

- Generate **ten directly**, all without the audited business's name or
  identifying aliases. No 12-to-10 selection interface in this delivery.
  Ten is the audit workload, not ten prescribed purposes.
- Keep human review, free wording edits and explicit approval. Direct-ten
  generation does not remove the human quality gate.
- No fixed purposes, 6/4 split, mandatory comparisons, distinct-need quota,
  punctuation-count gate or exact comparison phrase. Repeated needs are fine.
- One minimized business brief replaces repeated per-slot contexts. Supplied
  competitors are optional; intake must work without naming a competitor.
- GLM-5.3 Flash via Cheaper Inference writes questions. Existing OpenCode Go /
  GPT-5.6 Luna grounded observation and report infrastructure remains.
- The report interprets actual questions and answers, not positions or model
  intent labels. Historical packs keep their original method.

These requirements supersede conflicting fixed-slot generation, editing,
locking and report assumptions in Product, Audit, journey 04, Spec 007/008 and
R5 **for this method**. Spec 008's rich writer, P/M/C experiments and remaining
pilot/release gates do not govern this delivery. Their results are historical,
not retroactively passed. Existing unrelated intake, privacy, evidence,
provider, payment and delivery protections remain. Deployment stays unchanged.

The [worker opinion](../../docs/drafts/RECOMMENDATION_ELIGIBLE_WORKER_OPINION_2026-09-18.md)
supports the direction and confirms downstream coupling. Its recommendation
to generate 12/select 10 was considered but is not adopted: the founder agreed
to the orchestrator's simpler direct-ten flow. Nor are relaxed 10–14 parsing,
required competitor intake or intent-label report dimensions adopted.

Evidence corrections: the invoice verdict was “Mostly—some questions need
edits”, not approval of all twelve. The laundry comparison had a supplied
category-alternatives target; the failure was not a missing target. A context
sentence followed by a question does not itself violate the old punctuation
rule. Named questions do not inherently require slots; they are outside this
first delivery because it measures appearance without supplying the target.

## 2. Required context and existing work

Read `AGENTS.md`, `README.md`, `docs/NOW.md`, this spec and the complete
winning prompt, in that order. Then read only Product's question review/report
sections, Audit's evidence/report/data boundaries, and the connected code.
Their legacy matrix passages are migration dependencies, not competing rules.
Use `docs/WORKFLOW.md` for verification and handoff responsibilities.

Canonical checkout: `/Users/yasir/nuave_v0.2`.
Reusable uncommitted implementation:
`/Users/yasir/nuave-worktrees/glm-prototype`.
Preserve both; the source worktree must not be reset or overwritten. Start a
dedicated `codex/` branch from freshly fetched `origin/main`, then explicitly
carry forward the useful changes. Do not branch from the stale prototype HEAD
as a shortcut. Record the actual base and carried files in the return.

Reuse transport, evidence storage, attempt binding, original/edit history,
review persistence and honest failure display. Inspect rather than assume
they are unchanged: extraction and pack boundaries currently encode count,
format or metadata requirements. Port valid B1–B3 protections; do not import
old slot assertions merely to keep tests green.

Known dependency starting points, not an instruction to rewrite every file:

- Generation/intake: `src/lib/audit/questions-id-glm.ts`,
  `questions-id-glm-instruction.ts`, `question-context-v3.ts`,
  `src/lib/intake/glm-local.ts`, `local-questions.ts`, `questions-screen.tsx`,
  `IntakeJourney.tsx`, `src/app/api/audit/glm-questions/route.ts`, and
  `src/app/audit/intake/screens/QuestionReviewScreen.tsx`.
- Execution/report: `src/lib/audit/types.ts`, `locked-question-pack.ts`,
  `questions-id-live.ts`, `contracts.ts`, `report-prompt-contract.ts`,
  `report-pipeline.ts`, `customer-evidence-export.ts`, and
  `src/app/audit/AuditWorkflow.tsx`, `AuditRunStep.tsx`, `ReportView.tsx`.

Follow direct dependencies only. No repository-wide redesign or historical
review is required. Keep one short return/verification file in this package;
do not create another series of diagnosis and counter-diagnosis documents.

## 3. Required behavior

**R-01 — source fidelity.** Preserve the recovered instruction's market
interpretation, consumer-choice reasoning, examples, openness and self-critique.
Record the exact runtime diff: twelve→ten, the no-diversity-quota amendment,
business-placeholder substitution and only necessary section-format guidance.
Do not append matrix roles, per-slot permissions, named exceptions, forced
intent mixes or a separate evaluator prompt. The recovered source file's
exact body remains unchanged. A runtime example is calibration, not a formula.

**R-02 — one brief.** Use confirmed public business context, distinguishing
facts, buyer preferences and unknowns. Allow plausible consumer situations
without asserting them as verified business capabilities. Preserve geography,
offering and answer level; never require missing needs or a named competitor
just to satisfy a removed purpose. Keep sensitive/contact/payment data out.
The question writer may receive the target identity with an instruction not
to name it. This permission does not extend to the audit answering request.

**R-03 — faithful capture and correction.** Request ten questions using the
existing sectioned plain-text approach. Preserve the raw response, market
interpretation, optional intent labels and self-critique for inspection.
Extract only question text, preserving its wording; critique is not a question.
Do not silently drop wrapped content, reword text, pad missing questions or
truncate an unexpected count and claim success. Format/count failures stay
inspectable and can be corrected explicitly by a human; originals and human
replacements remain distinguishable. Approval requires exactly ten complete
texts. Further model generation is an explicit, separately authorized action.

**R-04 — review and approval.** Show one flat editable list of ten questions,
with original wording recoverable. No purpose cards, named/unnamed allocation
controls or mandatory selection step. Edits, navigation and reload preserve
the exact draft and do not make calls. Changes to facts or approved wording
invalidate stale approval. Approval binds the exact final texts, facts and
method version. A direct request with no question mark, multiple question
marks, or context sentences is allowed.

Retain concrete privacy, safety, nonempty/size and target-identity protections.
Do not convert a desired quality or price into an unsupported business claim.
Keep recommendations open rather than supplying a target or forcing a named
competitor. Do not build a universal proper-name ban: familiar products in a
natural context, such as moving from Word/Excel to an invoice app, are not the
same as leaking the audited business. No automated naturalness classifier or
new broad regex catalog. Same-need repetition is allowed; exact duplicates
may flag human review without fabricating diverse replacements.

**R-05 — versioned pack.** Introduce the smallest explicit method distinction
needed by the existing pack/lock/run/report boundaries. Stable IDs locate
questions; they assign no category, role or measurement purpose. Never stamp
legacy metadata onto new texts just to pass old schemas. Historical records
continue through their historical interpretation. Unknown or inconsistent
method state fails before provider work; it never silently takes a legacy path.

**R-06 — actual execution.** Connect the approved pack to the existing audit
engine, not merely a simulated start/download handoff. Execute each text
verbatim and independently with required web search, model provenance and
existing budget controls. Inspect the serialized request at the answering-
model boundary: no target identity, hidden brand-bearing brief, comparator
list or other question's answer may be supplied to help it discover the target.
Target identity may remain server-side for matching and be supplied later to
report synthesis. A `brand:` field's existence is not proof of leakage or
purity; verify the actual outgoing messages/tools. Reuse existing retry policy
only within a subsequently explicit live audit authorization.

**R-07 — honest report and download.** Produce the existing web report and
actual PDF/evidence download from that same pack. Show appearance and explicit
recommendation separately across the ten evaluable answers, with supporting
excerpts, sources, observed competitors and actionable findings. A mere name
mention is not recommendation. No position-derived purpose, coverage or
assessment class; model intent labels are not measurement evidence and need
not appear in the customer report. Unmeasured named recognition is “Tidak
diuji” or omitted, never zero-filled. Comparisons may be discussed when actual
answers support them, without a mandatory comparison question or score.

Ten evaluable observations remain the delivery floor. Failed observations are
not evidence of absence. Counts describe this sample, not market share or
coverage of all customer needs; repeated needs do not prove breadth. Preserve
observation / interpretation / recommendation distinctions and the existing
report-quality bar. Re-checks require the same texts and compatible method;
old 6/4 and new ten-unnamed results are not directly comparable.

**R-08 — local scope and provenance.** Keep this behind founder-only local
enablement. Clearly label synthetic fixtures, retained real responses and new
live calls. Do not swap modes silently or present a fixture as fresh output.
No automatic calls on mount, Back, refresh or retry. Use server-side keys,
restricted evidence storage, attempt/request binding, response IDs, exact
requested/returned models and nested billing. Preserve previous consumed
markers and captures. Freeze a new request for a new authorization; never
edit an authorized fixture to make a submit pass.

## 4. Bounded sessions and founder judgment

Use one fresh orchestrator and one fresh worker, with the founder relaying
handoffs and returns. The orchestrator reviews; it does not duplicate code.
Do not launch sessions automatically. These are effort limits, not a promise
that completion or provider latency will fit them. Human wait time is separate.

| Block | Hard active-work budget | Deliverable and stop point |
| --- | --- | --- |
| Orchestrator start | 15 minutes | Confirm settled scope, inspect checkout availability, help founder choose one business, release worker Block A. No new planning round. |
| Worker A: generation and review | 150 minutes total: aim for 120 build + 30 focused checks | Current-main branch with reused plumbing; flat brief → direct-ten request → editable/reloadable/approvable new-method pack in the local UI. Show an explicitly synthetic or retained-response demonstration; prepare the exact new request for live authorization. Stop and return. |
| Orchestrator A review | 15 minutes | Check source diff, usable UI, preservation and send guards. Show the actual request/context and cost estimate for one founder-authorized question-generation call. No model-ranking exercise. |
| Founder question check | About 10 minutes after the authorized response | Read the ten actual questions before the agents' verdict. Edit freely; say “good enough, proceed”, supply exact fixes, or reject with examples. Naturalness acceptance is required before Block B. |
| Worker B: audit and report | 210 minutes total: aim for 150 build + 60 verification | Same approved pack reaches real audit/report code; offline fixtures prove execution, report and download. Complete `npm run verify`, review complete diff, prepare bounded live audit scope. Stop and return. |
| Orchestrator B review | 15 minutes | Check all acceptance criteria, outgoing-answer request isolation, actual download and honest denominators. Present the live scope with expected calls/cost and existing retry limits. |
| Founder report check | About 15 minutes after the separately authorized audit | Use the local product from approved pack to real report, download it, and judge clarity, evidence and usefulness. Record concrete feedback and whether it is useful enough to proceed. |
| Orchestrator closeout | 15 minutes | Record exact completion, failed criteria and next action. No merge/deploy or unrequested polish. |

**Time-box behavior:** worker active time includes investigation, coding,
debugging, tests and fix rounds. At the deadline, stop and return the working
state, exact remaining blocker and a concrete continuation estimate. Do not
silently open another correction task or weaken criteria. The orchestrator
allows at most one consolidated correction list per block; any work beyond
the remaining budget requires the founder to extend that block explicitly.
Keep finished work even if the block is incomplete. Do not claim success from
a running verification command. A timeout is not a reason to resurrect slots.

At the question checkpoint, small wording issues may be corrected by the
founder and the exact edited pack used downstream. A pack-wide return to
formulaic or informational questions stops Block B: show the exact source
deviation and ask for one bounded change, rather than automatically tuning,
regenerating or restarting a validator project. No good-enough threshold is
invented by an agent in place of the founder's judgment.

If a paid call is not authorized yet, retain the ready artifact and wait on
that dependent step. Useful offline checks may continue within the active
block, but synthetic output cannot satisfy the naturalness checkpoint.

## 5. Live permissions and failure handling

The old Laundry Ceria generation allowance is consumed: HTTP 200/stop, settled
USD 0.000782, but the adapted pack failed validation. No approved audit or
report followed. That response is regression evidence, not the new method's
quality pass. Current demo mode must be checked; its last reported state was
synthetic.

At startup the founder chooses/confirms one business and a public context.
Prefer the same business for both checkpoints; do not substitute a fixture
for a real-business test without saying so. No new benchmark set is needed.

For generation, prepare one exact request, GLM-5.3 Flash, existing plain-text
transport with 180-second client wait, zero client retries and honest model
identity checks. State the input/output limits, estimate and that timeout is
not a spending cap. Show the new request binding before asking authorization.
No credential reads are needed for preparation. After explicit authorization,
use the existing server-side credential by name without displaying it.

For the audit, separately specify the ten approved questions, grounded
observation provider, report-synthesis calls, any source/preparation calls,
retry limits, cost budget and timeout/stop behavior before authorization.
Do not assume approval of one generation includes those calls. Reuse working
controls rather than creating a new budget framework. Payment and private
hosted delivery remain simulated/deferred, accurately labelled.

Transport/provenance/format failures preserve available evidence and display
an honest error. Do not substitute fallback questions or retry without scope.
Ambiguous completion stays ambiguous; reconcile retained evidence first.
Failed observations preserve completed work, block delivery below ten
evaluable answers and follow only authorized retry/recovery. Report/PDF
failure preserves the validated report and evidence; PDF regeneration must
not rerun observations. Unsupported historical/method combinations fail
explicitly rather than quietly changing their meaning.

## 6. Acceptance and verification

| ID | Observable pass condition | Evidence |
| --- | --- | --- |
| AC-01 | Actual GLM request is the accepted source with the documented count/amendment/format/context adaptations and no fixed roles or hidden matrix. | Full request + concise source diff; original source-body hash unchanged. |
| AC-02 | Ten questions are editable and approvable; originals/edits survive Back/reload; facts or text changes invalidate stale approval; no incidental calls. | Focused tests and local browser demonstration with provenance label. |
| AC-03 | Natural context-plus-request wording, multiple/no question marks and repeated needs work; identity/privacy protections remain; malformed extraction never silently changes text. | Relevant regression examples including the complete founder laptop and invoice texts, plus honest failure cases. |
| AC-04 | Founder accepts the real generated questions, including any explicit human edits, before downstream execution. | Verbatim response, edits and exact founder verdict; synthetic evidence cannot pass this. |
| AC-05 | New pack locks/runs without manufactured legacy categories; historical fixtures retain their original interpretation; unknown method rejected before calls. | Focused boundary and compatibility tests. |
| AC-06 | Ten approved texts reach ten independent grounded answering requests verbatim, without target/context leakage. | Outgoing-request capture/test at provider boundary; full audit retains model, search and response provenance. |
| AC-07 | Report and download use actual evidence with correct mention/recommendation counts and untested handling; no old position-based claims. | End-to-end offline fixture through the real code, inspected web report and opened download. |
| AC-08 | One authorized real business run yields ten evaluable answers and downloadable report; founder judges it useful enough to proceed. | Retained live provenance, downloaded artifact, exact founder verdict. |
| AC-09 | Complete diff is scoped, repository offline gate passes, local-only enablement and no-extra-send protections remain. | `npm run verify` exit/result with working-tree identity and reviewed diff. |

The orchestrator reviews intent and material failures, not stylistic code
preferences. A blocker prevents the agreed flow, corrupts text/evidence,
leaks private/target context, permits unauthorized spend, makes a false claim,
or contradicts the accepted generation method. Apply the September 19
amendment when judging report-usefulness work. Cosmetic polish and harmless
phrasing improvements do not start another implementation cycle.

Use `VERIFICATION.md` in this package for the concise Block A/B returns and
acceptance evidence. Create it when work begins; preserve real/synthetic and
pending/passed distinctions. Record no “Verified” status until all criteria
pass or the founder explicitly accepts a named exception. Offline-ready and
real-product-accepted are different outcomes.

## 7. Non-scope and open items

No provider bake-off, automatic ranker, selection pool, intent taxonomy,
synthetic naturalness score, new fallback authoring, G2 reevaluation, broad UI
redesign, general framework, benchmark expansion, payment integration, hosted
delivery, production rollout, commit or push. Reuse existing UI primitives and
design rules. Make only necessary canonical-document corrections; preserve
the exact winning source and historical captures.

No unresolved strategic choice blocks offline Block A. The fresh orchestrator
obtains the actual business context and later paid authorizations from the
founder. Whether target identity leaks into the answering request is an
implementation fact to verify in Block B, not a question for the founder.

**Verification status:** Pending. Plan approved; implementation of this method
has not started in this revision session. The old prototype is reusable work,
not completion of this specification.

## Revision record

Documentation changed in this revision: this `SPEC.md`;
`docs/drafts/RECOMMENDATION_ELIGIBLE_PLAN_2026-09-18.md` (promotion pointer);
`docs/checkpoints/2026-09-17-winning-prompt-glm/NEXT_STEP.md` (fresh handoffs);
`docs/DECISION_LOG.md`, `docs/NOW.md`, `README.md`, `docs/INDEX.md`,
`specs/README.md` (decision/status/routing); `docs/PRODUCT.md`, `docs/AUDIT.md`,
`docs/PROMPT_GENERATION_CONTEXT.md`, `docs/journey/04-questions.md`,
`skills/generate-ai-visibility-prompts/SKILL.md`,
`specs/007-intake-airbnb-revamp/SPEC.md`,
`specs/008-recommendation-eligible-question-generation/SPEC.md` and its
`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md` (scoped supersession notices);
`docs/references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md` (reading
guidance only). Worker opinion and exact recovered source body are unchanged.
No application code, evidence capture or Git history changed.
