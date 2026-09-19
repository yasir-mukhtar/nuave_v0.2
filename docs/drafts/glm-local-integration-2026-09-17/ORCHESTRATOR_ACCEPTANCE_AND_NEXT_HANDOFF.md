# Revision 3 accepted for the dormant prototype handoff

2026-09-17. **Independent drafting review complete: C1–C3 closed.** No further
drafting round is requested. Acceptance covers the offline prototype described
below; it does not adopt the deferred integration/evaluation proposals or
authorize implementation, a runner, a live call, merge or deployment by itself.

| Reviewed file | Verified SHA-256 |
| --- | --- |
| `INTEGRATION_DRAFT.md` | `4312212391284172573b31210d79b749631d78aedababa5a08c332cee066401e` |
| `REQUEST_SPECIMEN.json` | `e521721626af770881332d6efd432b9b2171536d05cc59a7661ca69a00dec9b4` |

## Review outcome

- **C1 closed:** §8 states the approved punctuation rule without grammar,
  sentence-count or semantic edit gates. Tests must use the complete founder
  laptop and invoice Q3 texts. Legacy v2 behavior stays unchanged.
- **C2 closed:** §4a rejects unexpected continuation/prose lines and invalid
  markers/numbering instead of silently dropping text. Section-2 question
  text is preserved. The specimen's no-extras requirement now explicitly
  applies to those questions, allowing the restored analysis sections.
- **C3 closed for this slice:** prototype failures remain explicit, with no
  replacement questions, `PromptPack` or telemetry integration. The old runner
  is correctly identified as an invoice-experiment reference. A future
  adapted capture requires its own frozen artifact and authorization. v3
  `self_check` omission is correctly recorded as an existing requirement.

Independently re-ran the existing G1 adapter/projection on the recorded
fictional input: status, limitations, fingerprint and complete embedded
projection match. Unnamed identity checks, exact founder invoice wording,
request settings, scoped instruction and full file hashes pass. These are
offline artifact checks, not tests of an implemented GLM prototype. No
provider call, credential access, app code change or adapted quality judgment
was needed. The reviewed worker files remain unchanged.

The draft's §15 heading still says “revision 2”; its actual hashes and top-level
status identify revision 3. This cosmetic label does not require another
correction round. The deferred sections are context, not approval of future
route, fallback, history, model-alias or pilot behavior. In particular, future
facts-correction handling must still follow R5 §6.1 rather than become fallback.

## Next worker handoff — build only the offline prototype

**Prepared for founder dispatch; not yet dispatched.** The founder may pass the
following task to the implementation worker to authorize this bounded offline
work. No paid-call or customer-path authorization is included.

Build and verify the dormant GLM request/response prototype described in the
reviewed revision 3. Preserve the winning instruction, GLM-5.3 Flash choice,
three-section response, no-diversity-quota amendment and exact founder examples.
This is the minimum offline experiment-support prototype allowed before later
G2P-dependent product plumbing, not adoption of a replacement production contract.

Read `AGENTS.md`, `README.md`, `docs/NOW.md`, `docs/WORKFLOW.md`, this acceptance,
the reviewed draft §§1/4a/5/8/9, the specimen, and R5 §§3.2/5/7. Use the checkpoint
and winning source to verify prompt fidelity. Do not reopen settled design or
model choices. The review records explain resolved issues; they do not request
another planning document.

Start from current `origin/main` on a dedicated `codex/` branch. The checkpoint
is currently on `codex/prompt-generation-checkpoint-2026-09-17` at `6c9553f`; the
reviewed draft/specimen are local working files. Read/copy the exact reviewed
inputs as necessary without resetting the existing checkout, altering frozen
evidence or merging the preserved GLM branch. If the base moves, check only
relevant API/guard differences before proceeding.

Expected implementation files: `src/lib/audit/questions-id-glm.ts` and its
focused test file, with a small fixture/instruction file only if needed. Reuse
existing G1 and matrix helpers. No provider registration, fetch, credentials,
route/UI dispatch, runner, history plumbing, fallback authoring or default changes.

Implement pure functions for:

1. The exact proposed request body, using the real per-slot projection and
   the reviewed instruction/settings. Reproduce `REQUEST_SPECIMEN.json.request`
   for its fictional input; fixture-only labels must not be asserted about
   arbitrary real inputs. Freeze/document any strictly necessary serialization
   difference; do not silently rewrite the instruction.
2. Response-envelope assessment from supplied status/body data, preserving
   the input and reporting explicit failures for error/refusal, missing text,
   non-stop completion and invalid provenance. Preserve requested and returned
   model strings; keep alias acceptance pending, with no prefix stripping.
3. The strict three-section extractor in §4a. Accept only permitted question,
   blank and optional label lines in section 2. Reject wrapped continuations,
   stray prose and malformed markers/numbering; never shorten a question.
4. The separate compatible validator in §8: the exact R5 punctuation rule,
   open-preference versus asserted-premise handling, and retained mechanical
   identity/comparison/safety checks. No naturalness classifier, special bypass
   for founder examples, or claim that passing mechanics proves question quality.

Use synthetic responses only as labeled test fixtures. Exercise positive and
negative response-envelope cases; strict extraction including the dropped-
geography counterexample; both complete founder examples with appropriate
fictional context; R5 preference/assertion pairs; and retained protections.
Prove existing v2 behavior is unchanged. The prototype has no replacement text
and no live effects; failures stay explicit. Preservation means returning or
retaining supplied data for the caller, not creating a new evidence storage service.

Run focused tests and `npm run verify` offline, inspect the complete diff, and
report changed files, checks and any real limitation. Do not claim a pilot,
quality approval, readiness to send or customer integration. Return to the
orchestrator for implementation review. Do not commit, push, open a PR, merge,
deploy, create a capture runner or make external network/provider calls as part of this
task, except the repository read needed to establish current `origin/main`.

After that implementation review, the next separate task is offline capture
preparation. Only once the concrete request/runner, expected cost and stopping
conditions are reviewable should a live-call authorization be requested.
