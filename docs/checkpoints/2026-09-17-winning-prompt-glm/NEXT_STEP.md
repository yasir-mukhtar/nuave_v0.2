# Resume task: prepare the local GLM integration

Status at the checkpoint: prepared, not dispatched. **Offline drafting only.**
This portable brief carries forward the local orchestration handoff; it does
not approve the draft or authorize implementation/provider calls.

Repository: the Nuave checkout containing this file. All paths below are
relative to that checkout, so no particular device or local chat is required.

## Objective and context

Prepare one concrete proposal for:

`confirmed business information → winning instruction → GLM-5.3 Flash → editable questions`

Read `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/WORKFLOW.md`, this
[checkpoint](./CHECKPOINT.md), and the complete
[winning instruction](../../references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md).
Read the September 16–17 entries in `docs/DECISION_LOG.md`, including the
source-recovery entry recording the September 7 GLM decision preserved on the
separate GLM branch. That older entry is not present in main's decision log.
Read the full Spec 008 `SPEC.md` and
`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`, plus `docs/journey/04-questions.md`.
Older model-candidate wording does not reopen the later GLM decision.

Use the [tested request](./request.json), [fictional input](./business-input.json)
and [captured questions/feedback](./CAPTURED_QUESTIONS.md) as evidence. Raw private
response access is not needed to draft the integration; do not fetch it or
credentials merely to complete this task.

Inspect only the relevant functions/direct imports/tests in:

- `src/lib/audit/questions-id-provider.ts`, `questions-id-live.ts`, and
  `questions-id.ts`;
- `src/lib/audit/question-facts-v3.ts`, `question-context-v3.ts`, and
  `measurement-matrix.ts`;
- `src/app/api/audit/prompts/route.ts`;
- `src/app/audit/new-intake/` and its actual `src/lib/intake/` implementation;
- `src/app/audit/intake/screens/QuestionReviewScreen.tsx`.

Distinguish the old review screen from the new local preview. The preserved
GLM branch at commit `2dbd86737cf3f652733e21a90991bb342e3dae04` is an optional
read-only transport reference if available locally; it retains the old prompt
and changes defaults. Do not merge it wholesale or treat its instruction as
the winning source. Missing access to that branch does not block this draft.

## Deliverable

Write only two new files under `docs/drafts/glm-local-integration-2026-09-17/`:

1. `INTEGRATION_DRAFT.md`: one recommended implementation slice; exact affected
   functions/files; input, success, failure and editable-review behavior;
   focused offline checks; narrow proposed R5 amendments; remaining decisions.
2. `REQUEST_SPECIMEN.json`: one complete, unsent adapted request using clearly
   fictional confirmed input. Identify every added fixture fact and every
   instruction change. It is not the request whose response was captured.

Keep the full proposed instruction reviewable. Explain each departure from
the recovered source/no-quota amendment; preserve its substance and exact
founder wording examples. Make the change from twelve unnamed candidates to
ten product questions explicit, including what happens to market interpretation
and self-critique. Do not relabel the first ten unnamed texts as a product pack,
invent a diversity quota, or add a second model call. If a slot forces unnatural
wording, expose that precise conflict and propose its smallest amendment.

Trace the actual confirmed-input and editable-review path. Reuse existing
boundaries and protect edit/history/identity/safety behavior. Show honest
failure/fallback provenance; do not present canned output as generated output.
Do not start audit execution as part of question preparation or review.

Carry forward the tested endpoint/model, low reasoning, zero retries and
proposed 180-second wait. Check whether the selected server/client path can
support that wait. The tested 4096 output cap and observed charge do not prove
the adapted request's resource needs or impose a spending cap. Correct billing
extraction from the documented nested field; preserve both model identifiers
and explicit pending alias handling without silently stripping prefixes.

R5 §7 requires G2P before downstream implementation; §8.1 requires recorded
amendments before adopting simple or removing metadata/reserves. Identify the
exact affected requirements and propose narrow amendment wording and remaining
evidence needs. The connection capture is not a pilot pass. Preserve historical
`not_retained` and production configuration. Do not silently bypass a gate.

## Checks, exclusions and return

Parse the specimen JSON; inspect full prompt/input; verify exact founder text
and actual code paths. Separate offline validity from untested quality and
provider feasibility. No synthetic output may be labelled provider evidence.

Do not alter application code, canonical documents, other worktrees, frozen
inputs/captures, provider defaults or deployment configuration. No credential
reads, network/provider calls, new question generation, delegation, contact,
commit, push, merge or deployment. No broad refactor, new evaluator framework,
fallback-authoring project or model comparison.

Return both paths, the smallest proposed implementation slice, exact prompt
changes, offline check results and unresolved decisions. The orchestrator
reviews this concrete draft before implementation.
