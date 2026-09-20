# Revision 2 re-review — GLM dormant prototype

2026-09-17. **Direction accepted; three narrow contract corrections remain
before implementation readiness.** This is not implementation or live-call
authorization. The winning instruction, GLM choice, and no-diversity-quota
decision remain settled.

Reviewed files match the worker's full reported hashes:

| File | SHA-256 |
| --- | --- |
| `INTEGRATION_DRAFT.md` | `d75e8ae36c0907e508abfa8af2e91ad1392c7046586a71fa2498efba902e56d4` |
| `REQUEST_SPECIMEN.json` | `0b643e551b388c0226d0300b53db0cfaa5b606be4105a4a6f80a68b120559ca6` |

## What closes from the first review

- **R2 closes.** Independently reran `parseQuestionFactsV3` and
  `buildV3WriterContext` on the recorded fictional input. The complete
  projection matches, including exact serialization after the disclosed
  fixture-only wrapper. Status, limitations and facts fingerprint also match.
  Unknown typed fields remain unknown; the instruction now distinguishes
  buyer preferences from business capabilities.
- **R3's scope correction is accepted.** Customer dispatch, route/client
  changes and actual history/evidence plumbing are explicitly deferred. The
  draft no longer claims the standalone edit helpers are wired into the UI.
  The remaining prototype/future-send inconsistencies are C3 below.
- **R4's prompt-format correction is accepted.** Market interpretation and
  self-critique return in the same provider response. The original G2P
  `not_retained`, four-business allocation and exact-pair-only alias proposal
  are preserved. The extractor still needs C2 below.
- **R1 is partially addressed.** The draft now exposes the legacy rule and
  fallback limitations and proposes a separate compatible validator. Its
  exact form rule still needs C1 below.

Both founder invoice edits remain byte-exact. The specimen's model, low
reasoning, 4096 output cap, single user message and omitted optional sampling/
structured-output settings pass inspection. No adapted output quality or
provider feasibility is established by these checks.

## C1 — Specify the actual approved punctuation rule

Draft §8, lines 374–377, says `question_form` becomes “one question or one
direct request” and “multi-sentence contamination still fails.” That invites
a new semantic or sentence-count gate. The founder's accepted laptop request
has three sentences; the accepted invoice Q3 has two. Sentence count is not
the number of consumer requests.

Replace that wording with the existing R5 §5.1 mechanical contract:

> Preserve nonempty and length checks. A terminal question mark is optional.
> Reject more than one `?`; if one occurs, it must be at the end after trimming.
> Do not add a grammar classifier, sentence-count rule or semantic edit gate.
> Context sentences followed by one request are not rejected for containing
> multiple sentences. Semantic quality remains an exact-text review question.

Require focused offline cases using the **complete** founder laptop and
invoice Q3 texts, not shortened substitutes. Retain identity, comparison,
safety and supported premise protections. Keep shipped v2 behavior unchanged.

## C2 — Do not silently discard response text

Draft §4a, lines 182–191, collects numbered lines and ignores non-numbered
lines. §9, line 412, repeats that behavior ambiguously. A planning
counterexample with ten numbered items demonstrates the problem:

```text
1. Cariin dong toko laptop yang bagus
di Bandung/Cimahi.
```

The written extraction rule retains only `Cariin dong toko laptop yang bagus`.
All ten numbers can still pass while geography is silently lost. This was
tested against the written algorithm in an isolated scratch probe; no
application extractor exists yet, and this is not provider evidence.

For this single-line output contract, specify strict extraction: require the
three exact section markers once each and in order; in section 2 accept only
ten nonempty numbered question lines in canonical order, blank lines, and
the defined optional `Intent pattern:` label after its question. Reject
unexpected continuation/prose lines, duplicate/missing markers, malformed
items or numbering instead of dropping text. Preserve question text apart
from explicitly allowed formatting. Keep critique outside extracted texts.
Add those cases to the proposed offline checks; no general parser framework
is needed.

Also scope the specimen's global “Do not include answers, explanations,
rationales …” requirement to **section 2's question text**. As currently
written it conflicts with the restored market interpretation/self-critique
sections. This is a narrow instruction clarification, not a new prompt design.

## C3 — Make the dormant scope and future capture preparation consistent

The recommendation is pure builder/parser/validator code. However, the diagram
at line 54 and §9 still route failures into deterministic fallback and failed
telemetry, despite repair/telemetry being deferred. For this prototype specify
explicit validation/parse failure with the original response preserved for
review; no replacement question generation, `PromptPack`, or telemetry
integration. Keep future fallback/origin requirements clearly deferred.

§11, lines 446–449, says the future adapted send uses the existing
`run-check-180s.mjs`. Inspection of that artifact shows it always reads its
adjacent frozen `request.json`, pins hash `7fc69cc3…9fc9`, and expects twelve
candidates. Unchanged, it sends the old invoice experiment; replacing its
request makes the hash guard refuse it. It is a transport reference, **not
a ready runner for this specimen**.

State that a future, separately bounded offline preparation must create and
review a separate capture artifact, freezing the actual request body at
`REQUEST_SPECIMEN.json.request` rather than sending the surrounding review
metadata. Preserve the original runner and frozen request. Carry forward
shared outcome assessment, nested billing extraction, honest model-name
handling, restricted evidence, 180-second wait and zero retries; freeze new
hashes before any authorization request. No such runner is requested now.

Finally, correct the deferred §4b wording “`self_check` omitted or made
truthful”: R5 §4.3 says **omit the whole object for v3**, with appropriate
checks/evidence carried separately. This is already an approved requirement,
not an open alternative. Keep the sectioned GLM response distinguished from
the previously frozen simple-control request; its future evaluation requires
an explicitly frozen configuration/amendment, not silent reuse of the old
control label. No new pilot design is needed for this dormant slice.

## Verification and next worker handoff

The independent scratch check uses actual G1 imports with a fetch tripwire;
it recorded zero fetches. Evidence is local at
`/private/tmp/nuave-glm-draft-r2-review-20260917/` (`check.mts`, `check.mjs`,
`result.json`). Runner verification was source inspection only. No credentials,
provider responses or application changes were needed.

**Next task: close C1–C3 in the same two draft files only.** Preserve the
accepted real-adapter fixture/projection, selected model, founder examples
and three-section instruction. Change only the contradictory contract text
and the narrowly scoped instruction sentence above; do not rewrite the
working approach. Synchronize the change notes and full hashes.

Return the exact changed sections, hashes and focused offline checks. No
application implementation, new fallback project, new sample-answer
generation, model comparison, runner creation, credential reads, network
calls, delegation, canonical-document edits, commit, push, merge or deployment.
Return to the orchestrator; implementation and any later send remain separate.
