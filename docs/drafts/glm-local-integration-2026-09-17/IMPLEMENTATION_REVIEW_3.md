# Dormant GLM prototype — second correction review

2026-09-17. **Original examples fixed; G1 and G2 remain open at the rule level.**
This is the same bounded correction, not a new prompt-design or model-selection
task. No further founder wording decision is needed.

Reviewed the six-file working change in
`/Users/yasir/nuave-worktrees/glm-prototype`, branch
`codex/glm-dormant-prototype-2026-09-17`, base `687f340`.
Only the GLM validator and its tests changed since review 2; the other four
reviewed hashes are unchanged. The worker return says the review text was not
available and reconstructs the task from probe examples. The handoff below
therefore names the full review explicitly; probe examples do not replace its
requirements.

## What now passes

The original personal-cancer, mixed human/equipment, `siapa saja` assertion and
`Kenapa … paling murah` probes now produce their expected blocking rules.
The genuine `Apakah … paling murah` question and separate buyer preference
remain open. Request/fixture fidelity, strict extraction, response IDs,
comparison checks, safety checks from review 1 and dormancy remain intact.

Independently ran the three focused test files: **141/141 passed** (42 GLM,
40 existing Indonesian-question tests, 59 facts/dormancy tests). Rebuilt the
independent probe bundle from source against this exact implementation;
fetch count was zero. These passing examples do not close the two rule-level
requirements below.

## G1 — Diagnosis still defaults to permission without equipment evidence

At `questions-id-glm.ts:455–471` and `:699–707`, the bare diagnosis check is
removed and a diagnosis request is rejected only if a listed medical/personal
word shares the same punctuation-delimited clause. There is still no positive
equipment-only condition, despite review 2 explicitly requiring one.

Fresh synthetic probes against the actual validator:

| Text | Observed relevant result | Required behavior |
| --- | --- | --- |
| `Bisa bantu diagnosis kondisi ini?` | No issue | Retain conservative handling: no equipment subject has been established. |
| `Untuk kanker saya, di mana tempat diagnosis yang cocok?` | No issue | Block personal diagnosis; the comma cannot erase the medical context. |
| `Di mana tempat diagnosis laptop saya yang sering lemot?` | `high_impact_advice` | In an appropriate equipment context, ownership alone must not turn an equipment request into medical advice. |
| `Di mana tempat diagnosis laptop yang sering lemot di Jakarta Selatan?` | No issue | Preserve the equipment permission. |

R5 §5.2 makes equipment diagnosis depend on text/category and retains
conservative handling of medical and mixed requests. The owned-laptop case
also demonstrates that `saya` is not itself medical context. These probes
isolate the guard property using synthetic facts; they are not claims about
the semantic suitability of a laptop question for the laundry fixture.

Correction: treat diagnosis as restricted unless a bounded, positively
identified equipment request qualifies for the existing exception. Consider
relevant medical/mixed context across the complete question; punctuation must
not reset that protection. Preserve conservative handling when the subject
is unresolved. Test equipment cases with appropriate fictional category facts,
including ordinary ownership, and pair them with medical, mixed and unresolved
cases. Preserve ordinary regulated-provider discovery and warranty preferences.
Expanding the medical-word list alone does not satisfy this correction.

## G2 — A smaller word list still exempts an entire assertion

At `questions-id-glm.ts:447–453` and `:560–568`, any occurrence of `apa`,
`mana`, `nggak`, etc. still exempts the entire clause. Removing `siapa` and
`kenapa` fixes the former literals without fixing the exemption's logic.

All three fresh synthetic slot-7 probes return **no issues**:

- `Laundry Ceria paling murah untuk cucian apa saja.`
- `Laundry Ceria paling murah dan nggak ribet.`
- `Kenapa Laundry Ceria paling murah untuk cucian apa saja?`

The first two assert the named business is cheapest; the third presupposes
that claim. Adding an unrelated marker must not convert the claim into an
open question. This is the same requirement as review 2, not a demand for
universal language understanding.

Correction: recognize bounded supported open-question forms in relation to
the named claim, rather than testing whether any marker occurs anywhere.
Unrecognized forms retain conservative handling. Preserve
`Apakah Laundry Ceria paling murah di Jakarta Selatan?`, unnamed preference
requests, and the separate buyer-preference/fit-question case. Keep the
existing `Karena …` assertion blocked. Paired tests must cover affirmative
assertions containing the remaining marker words, not only removed words.
Do not add a model call, semantic quality classifier or universal-truth claim.

## Evidence and preservation

Fresh probe source, rebuilt bundle and results:
`/private/tmp/nuave-glm-second-correction-review-20260917-UH3jkM/`.
All additional texts/envelopes are synthetic, not provider observations or
personal records. Canonical request equality and extraction assertions pass.

The worker reports full `npm run verify` passing with 1131 unit tests and
95 browser tests, both builds and checks. This review independently ran the
141 focused tests and probes; it did not repeat the full suite after finding
these unresolved requirements. The previous independent full runs tested
the earlier hashes and are not evidence of this revision's full gate.

Reviewed hashes under `src/lib/audit/`:

| File | SHA-256 |
| --- | --- |
| `questions-id-glm.ts` | `8f79edb1bf515f56f5d1520a00cb0ac3848eeb7b0994e811fb7760f892374cc2` |
| `questions-id-glm.test.ts` | `97a7c28d62030c887de52366d3f9d71ce1d946215de384d2ca082c55b4dcbcaf` |
| `questions-id-glm-instruction.ts` | `7b00c780c04e7f5bb5ab51e8adff404e65c64a647fe6116f31a2288e07a63704` |
| `fixtures/glm-request-specimen.json` | `405245b8138088f359e00e730f70f8c5e09fb5352056bf5a109ab5919f7f4bf3` |
| `question-facts-v3.test.ts` | `372c146961a0d826a60d836db38e2ad1c282d2c4a261516fd82f4d96a8ea69c3` |
| `questions-id.ts` | `659ca367c459b5e3f63de794aed6f1e060dc2986f56a9bcde7f7e9a4f8e8a94d` |

No implementation, credentials, provider calls, runner, commit, push, merge
or deployment occurred in this review. Only this review and `docs/NOW.md`
were changed in the repository.

## Worker handoff — finish G1/G2 as rules

Continue the existing dormant-prototype task in
`/Users/yasir/nuave-worktrees/glm-prototype` on
`codex/glm-dormant-prototype-2026-09-17`. Do not start another implementation.

Before editing, read in this order:

1. The worktree's `AGENTS.md` and `README.md`.
2. `/Users/yasir/nuave_v0.2/docs/NOW.md` and `docs/WORKFLOW.md` in that same
   main checkout.
3. This complete file at
   `/Users/yasir/nuave_v0.2/docs/drafts/glm-local-integration-2026-09-17/IMPLEMENTATION_REVIEW_3.md`.
4. `IMPLEMENTATION_REVIEW_2.md` in the same directory, especially its G1/G2
   requirements; then the accepted `INTEGRATION_DRAFT.md` §8.
5. `/Users/yasir/nuave_v0.2/specs/008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`
   §§5.1–5.2.

The deliverable is the smallest effective correction in
`src/lib/audit/questions-id-glm.ts` and `questions-id-glm.test.ts`, with no new
design document. Reproduce the counterexamples, correct both exception
mechanisms and add paired regression coverage described above. Preserve the
already closed findings and the four unchanged files, exact prompt/request,
model choice, strict extractor, response-ID checks, v2 behavior and dormancy.

Rebuild any bundled probe from its TypeScript source before running it. A
runtime source hash in old bundle output does not establish that its inlined
code is current. Run focused tests, the fresh probes and full `npm run verify`
offline. Inspect the complete diff. Return exact paths/hashes, a short
explanation of how each rule now satisfies its exception boundary, and the
verification log path/result. Do not declare closure solely because the
previously named literals pass.

No prompt/model redesign, fallback work, token-budgeting project, credentials,
external provider call, runner preparation, registration, customer-route
wiring, commit, push, PR, merge or deployment. Escalate a genuine conflict with
approved behavior; do not silently relax it. Return for independent review.
Capture preparation remains a separate later task.
