# Nuave checkpoint: winning prompt recovered, API response captured

**Checkpoint ID: `NUAVE-PROMPTS-2026-09-17`**

Created at the founder's request to preserve this milestone and give future
sessions a reliable place to resume if question-generation work drifts.

**Milestone:** the accepted question-generation approach is recovered, a GLM
API request has returned twelve questions, and the founder has reviewed them
and supplied two wording edits. Product integration remains ahead.

This is a dated reference, not a new implementation specification. Read it
alongside the newest [decisions](../../DECISION_LOG.md) and
[current status](../../NOW.md). Later explicit founder decisions may supersede
it; preserve this record and link the superseding decision rather than silently
rewriting the milestone.

## What future sessions should preserve

- **The winning source exists.** Use the
  [exact recovered prompt](../../references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md),
  not a reconstruction from later specifications. It comes from the founder's
  **Winning Prompt Generation Approach** conversation, document `58314`,
  September 7. It aims for natural consumer requests about choosing, finding,
  buying, hiring or visiting, where naming specific entities helps the answer.
- **GLM-5.3 Flash through Cheaper Inference is the selected direction for this
  question-writing integration.** This checkpoint does not reopen model
  selection or change the separate audit-answer provider in production.
- **Natural questions may address the same need.** No distinct-needs quota or
  equivalent rejection/retry rule is allowed under the September 16 amendment.
  A narrow product may naturally produce several questions around one need.
- **Show the founder real question text at meaningful quality checkpoints.**
  Preserve exact feedback before presenting agent verdicts. Mechanical validity
  or the model's self-critique does not establish naturalness. Buyer preferences
  are not automatically verified facts about the audited business.
- **Do not force unnatural wording to satisfy an implementation rule.** Identify
  the precise conflict and propose the smallest explicit amendment. Do not
  silently drop the product's identity, context, safety or measurement rules.

## What was actually observed

The fictional fixture is [ContohInvoice](./business-input.json). The exact
[request](./request.json) uses one user message, `glm-5.3-flash`,
`stream: false`, `max_tokens: 4096`, and `reasoning_effort: low`, with no
`response_format`, temperature, web tools or second model call. The tested
endpoint was `https://api.cheaperinference.com/v1/chat/completions`.

| Observation | Evidence and limit |
|---|---|
| First request, 60-second client timeout | No local response captured. The founder's provider receipt later showed settled usage, 66.708 seconds total duration and a displayed USD 0.0004 charge. That amount is rounded. |
| Second request, 180-second client timeout | HTTP 200, `finish_reason: stop`, full response captured in 53.263 seconds; one client request and no client retries. |
| Returned content | [Twelve original question texts](./CAPTURED_QUESTIONS.md), extracted verbatim from the saved response. They are experimental candidates, not the product's final ten-question pack. |
| Second request billing | Settled USD `0.000371`, recorded at `cheaper_inference.billing.billed_cost_usd`, also in `usage.cost`. |
| Second request usage | 2,684 prompt + 1,164 completion = 3,848 tokens; 34 reasoning tokens within completion details. |
| Model identity | Requested `glm-5.3-flash`; returned `zai/glm-5.3-flash`. The original runner reports `UNSUCCESSFUL` solely because those strings differ. Exact alias acceptance remains unconfirmed. |
| Founder quality feedback | **“Mostly—some questions need edits.”** Exact replacements for Q1 and Q3 are preserved below and beside the original texts. |

Connection and response capture are demonstrated. The billing report has a
known extraction defect: it reads the wrong field and prints “not supplied”
despite the nested settled amount. Both metadata issues can be investigated
without another generation request. Do not silently normalize arbitrary model
prefixes or overwrite the original runner result.

The provider's own model page identifies Z.ai, but the public catalog lookup
on September 17 returned an empty aliases list. That is insufficient to mark
the exact alias pair verified. This caveat does not erase the captured text.

## Founder wording references

For this captured invoice sample, the founder supplied:

- **Q1:** “Aplikasi buat bikin invoice untuk usaha kecil enaknya pakai apa ya?”
- **Q3:** “Bikin invoice tiap bulan capek kalau manual. Biasanya UMKM pakai aplikasi apa sih?”

These are specific wording edits, not universal word bans or templates. The
remaining ten questions received no individual edit or drop instruction;
approval of the entire set was not inferred. Earlier invoice/cafe/laptop
examples and the rejected dental question remain in the September 16
[decision entries](../../DECISION_LOG.md#2026-09-16--natural-questions-may-address-the-same-need).

## What this milestone does not establish

- The winning prompt is not yet integrated into the app's question-review path.
  Main still uses its existing writer, and the new local intake preview uses
  deterministic preparation. The preserved GLM branch/PR #47 changes transport
  but retains the old instruction; merging it alone would not install this method.
- The twelve-unnamed-question experiment has not demonstrated the product's ten
  questions, six unnamed and four named. That adaptation is still to be reviewed.
- The separate Luna-based G2P pilot remains historical `not_retained`. It did
  not test this exact recovered GLM request. This sample does not pass G2P,
  establish broad quality/reliability, or authorize downstream R5 gates.
- No additional generation, merge, deployment or production configuration
  change is authorized. Both single-request generation authorizations are consumed.

## Resume here

Use the portable [next worker task](./NEXT_STEP.md): prepare one integration
draft and an unsent request specimen. Preserve the successful instruction's
substance and founder wording while explicitly addressing the ten-slot output,
confirmed-input boundary, editable review, metadata handling and narrow R5
amendments. This is offline preparation before implementation.

Future-session instruction:

> Resume from `NUAVE-PROMPTS-2026-09-17`. Read this checkpoint, the exact winning
> prompt, and the latest decision log/NOW. Preserve the accepted approach and
> founder wording. Explain any proposed deviation against them before changing
> the generation method; do not restart model selection or force distinct needs.

## Provenance and integrity

Repository base when recorded: `687f340343aa5be547d03e7d6fe23a9f5262a2df`.
The associated documentation amendments were present as uncommitted working
changes at checkpoint creation. This is a documentation checkpoint, not a Git
commit/tag or a claim of remote publication. Its ID remains usable after a
later authorized commit.

Portable inputs and text are included here so another session or device need
not retrieve this chat. Credentials, billing identifiers, headers, screenshots
and full raw provider responses remain outside the public repository.

SHA-256:

| Artifact | Digest |
|---|---|
| Recovered prompt body, between its markers, trimmed outer whitespace | `652cfeda5cb6b11fa08d33f80325854738fdaacd8f0f59b3533ae0ad0cf71d0a` |
| `request.json`, exact bytes | `7fc69cc31cd2287a0e134bae51b2c02671eeb1b0e0b17039743851832c309fc9` |
| `business-input.json`, exact bytes | `1d9afee9c024851f2f3ce6a18ad43147b88b38dfaee3d73ad9deaac1f2ae997d` |
| Original 180-second runner, retained locally | `b38a81315c0c1a15b031ffbd4ccf76567ca54e85672969ba3881dfc9f49b23a8` |
| Original restricted response JSON, retained locally | `6d7d23bcc7ad90fe165a673e609932fe2fead343e6dd26d952fc9c03248cf85e` |
| Original full assistant text, retained locally | `b560230ddb8c900a0c689eb09d1b4db36efad71ba9c28c71e744e38aa0d5146d` |

Local detailed evidence is in the orchestration artifact
`glm-winning-prompt-api-smoke-test-2026-09-17/results/live-2026-09-17T00-17-41-797Z-70fd04/`;
the independent reconciliation is `GLM_SECOND_ATTEMPT_REVIEW_2026-09-17.md`.
If these private files are unavailable on another device, use the portable
record for planning and state the raw-evidence limitation rather than inventing
provenance or repeating a paid call to recreate it.
