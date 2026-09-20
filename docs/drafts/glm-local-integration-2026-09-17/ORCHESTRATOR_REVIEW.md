# Independent review — local GLM integration draft

2026-09-17. **Revise before implementation.** This is review and a bounded
correction handoff, not approval to implement, send a request, or change R5.

The winning instruction and GLM-5.3 Flash choice remain settled. Much of the
source instruction survives in the specimen, the two founder invoice edits
are preserved, and no diversity quota is reintroduced. Endpoint, one-call
transport, timeout, nested billing extraction, and production isolation are
reasonable directions. The problems below concern how the proposed integration
would treat the resulting questions and what its evidence actually proves.

## Reviewed inputs

Reviewed against repository commit `6c9553f81e199756bbd02a82cdc5556055a24b30`,
the checkpoint [handoff](../../checkpoints/2026-09-17-winning-prompt-glm/NEXT_STEP.md),
the winning instruction and founder feedback, the relevant R5 requirements,
and the actual generation, review, and facts-adapter code.

| File as reviewed | SHA-256 |
| --- | --- |
| `INTEGRATION_DRAFT.md` | `577e385ba21b42cdd357f4f427aa6334548b9e7d40817f82dd21bdfa2c7e265b` |
| `REQUEST_SPECIMEN.json` | `bcd6cda4084e9b71701414a2f2df105f28ffceea240ebf072fe882a146282865` |

The specimen's actual hash differs from the abbreviated `eb21556e…051d` in
the worker return. This review applies to the files above; the mismatch is
not evidence of its cause. Return full hashes with the revision.

## R1 — Unchanged legacy validation and fallback would undo accepted wording

**Blocking:** draft §§1, 4, 8–10 claim that validation, repair, fallback and
edit behavior can remain unchanged. They cannot satisfy the proposed v3
behavior that way.

An offline probe called the existing functions with a fictional laptop-store
brief and a mechanically valid ten-slot baseline. It replaced only slot 1
with the founder's exact accepted wording:

> Laptop saya mulai lemot. Kayaknya butuh beli baru. Cariin dong toko laptop di Bandung/Cimahi yang bagus.

`validateCanonicalIndonesianQuestionPack` rejects it solely as
`question_form` because it lacks a terminal question mark
(`questions-id.ts:687`). Passing the same numbered pack through
`generateIndonesianQuestionPack` selects this deterministic replacement:

> Rekomendasi toko laptop di Bandung/Cimahi untuk pembeli laptop untuk kerja apa saja?

The returned record still says `source: "parsed"` and
`generation.fallback_used: false`; `warnings: ["slot_safety_repair:1"]`
and `original_suggestion` are the clues that substitution happened.
Thus §9's claim that every substitution has `source:"fallback"` and
`fallback_used` is false for partial repair. This probe is synthetic function
evidence, not a GLM output or a quality rating.

A second probe used the R5 §5.2 open preference, with matching Depok context:

> Toko laptop mana di Depok yang pilihannya terlengkap untuk kebutuhan kuliah desain?

It is rejected as `unsupported_premise` by the blanket superlative rule and
likewise substituted. R5 explicitly distinguishes this preference from a
claim that a particular shop is the most complete. The review-screen save
transaction calls the same validator (`intake/questionEditTransaction.ts`),
so changing only the writer instruction would not fix founder/customer edits.

The existing fallback also retains the informational slot-2 form
`Dalam situasi apa … biasanya mencari …?` (`questions-id.ts:559`). Reuse
alone does not establish recommendation eligibility or naturalness.

**Required revision:** name the compatible, GLM-only validation boundary and
the exact affected repair/edit/approval boundaries. Preserve shipped v2
behavior. Apply already-approved R5 §§5.1–5.2 rather than asking the founder
again whether direct requests are allowed. Specify truthful per-text origin
for partial/full substitution. Do not declare old fallback quality accepted;
if repairing the fallback would exceed this slice, expose that limitation
and keep the first prototype outside customer dispatch. No new fallback
authoring project is authorized by this review.

## R2 — The specimen is not reproducible from the proposed input path

**Blocking:** draft §4 calls
`parseQuestionFactsV3({requestId, brief, factsRevision})`, omitting
`factsContext`. The specimen nevertheless includes `entityType: "service"`,
`entityScope.kind: "whole-brand"`, structured local areas and service channels.

For the legacy brief path, the actual adapter derives those typed fields
from `factsContext`; without it they are respectively `null`, `unknown`,
empty/unknown reach and areas, and `null` channels
(`question-facts-v3.ts:471–535`). A pure adapter probe confirmed this behavior.
The specimen's `fixtureFacts` is a descriptive fixture, not the exact accepted
request envelope that can reproduce the supplied projection.

The instruction also says **“Every supplied value is a confirmed fact about
the audited business.”** Its context includes buyer preferences explicitly
tagged `provenance: "buyer_constraint"`. These are not verified claims that
the business satisfies them. That blanket sentence contradicts both the
typed data and R5's fact/preference distinction.

**Required revision:** include one exact, valid fictional adapter input in the
specimen and derive its writer context with the actual G1 functions. Either
keep unknown typed fields unknown on the selected legacy path, or name the
real confirmed source and plumbing for `factsContext`; do not infer missing
values merely to match the specimen. Compare the complete embedded projection
to the builder output, with any specimen-only labels explicitly separate.
Correct the instruction to preserve facts, buyer preferences, and unknowns
as different kinds of information. No G1 schema rewrite is required.

## R3 — The proposed editable-review path and gate amendment are incomplete

**Blocking:** §4 says `AuditWorkflow` must supply request IDs/revisions, then
lists its orchestration as untouched. The route currently accepts only
`{brief}` and returns a generic 400 on errors. There is no current
`INPUT_CORRECTION_REQUIRED` response/UI path to “return unchanged.”

Draft §§3 and 10 also mistake library helpers for the actual UI flow.
`AuditWorkflow.generatePrompts` consumes `pack` and telemetry;
`editPrompt` changes `prompt.question` directly
(`AuditWorkflow.tsx:1005–1060`). It does not call
`applyIndonesianQuestionEdits` or `approveIndonesianQuestionPack`.
Those helpers' existence does not establish that their edit record reaches
the real saved/replayed pack.

Unchanged `questions-id-live.ts:353` additionally emits legacy `self_check`
claims including `verified_inputs_only: true` and
`independent_natural_questions: true`. R5 §4.3 explicitly requires omitting
that object for v3 and carrying truthful evidence through the actual wire.
Changing the instruction-version label alone does not satisfy this.

The proposed §7 amendment merely records the connection evidence. It does
not permit the proposed provider/live/route/UI plumbing before G2P, nor
resolve the departure from §§4.3/5/6. The draft correctly says it cannot
bypass a gate, but leaves its recommended scope unable to proceed under the
amendment it proposes.

**Required revision:** recommend one executable next slice and state its
boundary honestly. The smallest recommendation for this revision is a
dormant adapter/prototype for the adopted prompt contract, with offline
checks and exact-text review before any separately authorized send. Defer
customer-route, history and execution integration rather than claiming
those are already solved. Describe the later affected boundaries briefly.
If recommending an editable product route instead, explicitly identify all
necessary input/correction/evidence/guard changes and provide a narrow
proposed gate amendment covering that scope. Either proposal remains subject
to approval; this review authorizes neither.

## R4 — Preserve the winning response mechanism; make amendments specific

**Blocking rationale gap:** C5 calls ten numbered lines “forced” by the old
parser; C6 says moving market interpretation/self-critique into unobservable
internal reasoning “keeps” the quality mechanism. Neither conclusion follows.
A provider-response adapter can extract ten customer strings from a richer
response. R-30 limits customer questions, not every byte returned by a model.
Removing visible analysis/critique is a further untested prompt change,
separate from the necessary twelve-unnamed to ten-slot adaptation.

**Required revision:** treat that removal as a choice, not an unavoidable
constraint or proven equivalent. For the smallest first prototype, recommend
preserving the source's market-interpretation and self-critique sections in
the single provider response and extracting the ten questions separately.
Specify a bounded, unambiguous parser and honest failure behavior; trailing
critique must never become question 10. Keep provider-only material out of
customer questions and audit-answer inputs. This is a proposed revision for
review, not approval of a new schema, metadata contract, or paid experiment.

Reconcile the amendment/status wording at the same time:

- Preserve the original G2P result as **historical `not_retained`**. The
  adapted GLM pilot has not run; the original pilot did. The checkpoint/NOW
  records supersede the old frozen ledger's “Not started” status.
- R5 §8.1 specifies **four businesses, with AC repeated**, producing five
  attempts per arm; not a five-business corpus. Any changed evaluation
  proposal must be explicit and must not imply authorization for calls.
- Propose at most the exact pair `glm-5.3-flash` →
  `zai/glm-5.3-flash`, pending acceptance/evidence. One observed pair does
  not justify a wildcard `zai/<model>` mapping. Preserve both strings.
- Correct “zero retries means zero client attempts” to **one client
  request, zero client retries**.
- Instruction-version plumbing and an honestly named billing enum are
  ordinary implementation choices inside approved scope; they need a
  concrete recommendation, not separate founder product decisions.

## Verification and limits

The JSON parses. It is clearly fictional and unsent; its transport settings
match the proposed model/low-reasoning/4096-cap/one-message contract. Both
exact founder invoice edits remain present. Actual message size is 32,390
characters; that is not a token count or a cost estimate. Provider feasibility
and quality of this adapted request remain untested.

The two text probes used existing functions, existing founder/R5 examples,
fictional context, and injected output. The baseline had no validator issues;
both substitutions were reproduced; the facts-adapter probe was projected;
the network tripwire recorded **zero fetches**. Local scratch evidence was
written under `/private/tmp/nuave-glm-draft-review-20260917/` (`probe.mts`,
bundled `probe.mjs`, `result.json`). No credentials or raw provider response
were needed. No application code changed, and no full application test run
was needed for this documentation review.

## Worker handoff — one offline correction

Revise only `INTEGRATION_DRAFT.md` and `REQUEST_SPECIMEN.json` in this
directory to close R1–R4 above. Read this review, the checkpoint's `NEXT_STEP.md`,
the full winning instruction, and only the cited code/R5 sections needed
to resolve the findings. Preserve the winning approach, selected GLM model,
exact founder examples, no-diversity-quota amendment, historical results,
and production isolation. Do not reopen model selection.

Return one recommended bounded slice with accurate current/proposed behavior,
an exact reproducible fictional input-to-request specimen, and narrowly
worded proposed amendments. Separate genuine founder choices from routine
implementation details. Do not generate sample answers or declare semantic
quality from structural checks. No new evaluator framework is needed.

Run only focused offline validation: exact projection derivation, specimen
JSON/settings, complete instruction diff, exact founder wording, and code-path
checks addressing the four findings. Scratch scripts outside the repo may
import existing pure functions with network disabled. Return full hashes,
changed paths, checks, unresolved material decisions, and next smallest action.

Do not edit application code, this review, canonical documents, other
worktrees, captures, or configuration. No credential reads, network/provider
calls, delegation, commit, push, merge, or deployment. Return the revision
to the orchestrator before implementation or a live-test authorization.
