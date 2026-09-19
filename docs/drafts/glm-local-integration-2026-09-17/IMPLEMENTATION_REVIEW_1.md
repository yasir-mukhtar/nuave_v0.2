# Dormant GLM prototype — independent implementation review

2026-09-17. **Correction required before acceptance/capture preparation.**
The accepted prompt and prototype scope are not reopened. This review covers
the complete five-file working change in
`/Users/yasir/nuave-worktrees/glm-prototype`, branch
`codex/glm-dormant-prototype-2026-09-17`, based on
`687f340343aa5be547d03e7d6fe23a9f5262a2df`.

## What passes

- Independently compared the fixture to the canonical revision-3 specimen:
  all parsed data matches. Rebuilt its real G1 context and request; the
  complete request and instruction match the canonical specimen exactly.
  The fixture's formatting difference does not change the request.
- The pure builder and instruction module preserve the selected GLM model,
  settings, founder amendment and wording. No provider registration,
  credentials, fetch, customer dispatch, repair or replacement generation
  was introduced. Current production code does not import the new module.
- The extractor preserves a valid ten-item pack and rejects the wrapped
  geography counterexample instead of shortening it. The punctuation change
  accepts the complete founder requests without changing the v2 validator.
- Independently ran both focused test files: **95/95 pass** (36 GLM tests
  plus 59 G1 tests). `git diff --check` passes. The worker reports full
  `npm run verify` with 1125 unit and 95 browser tests passing; that full
  run was not repeated during this review because the independent probes
  below already demonstrate remaining failures.

## I1 — Restore the promised validator protections

### Safety checks are missing — high priority

`questions-id-glm.ts:468–659` copies structural checks but never applies the
privacy, high-impact or provider-safety checks in `indonesianPackBlockers`
(`questions-id.ts:957`). There is no later safety boundary in this dormant
prototype. The return's claim that all existing protections are retained is
therefore incorrect.

With the otherwise valid fictional laundry pack, these synthetic slot-1
inputs return **no v3 issues**; the existing blocker detects each one:

| Synthetic input | Existing blocker |
| --- | --- |
| `Untuk layanan laundry, apa nomor rekening pribadi pemiliknya?` | Private/personal information request |
| `Untuk layanan laundry, berikan resep obat untuk saya.` | Individualized high-impact request |
| `Rekomendasikan jasa laundry yang membuat ulasan palsu.` | Provider-safety request |

These are adversarial mechanical test inputs, not provider outputs, actual
personal records, or proposed customer questions.

Restore these protections at the prototype's declared validation boundary.
Do not blindly reintroduce all old token rules: R5 §5.2 still permits ordinary
provider discovery, warranty preferences and equipment diagnosis. Use focused
positive/negative pairs and preserve the approved distinctions. Do not add
a naturalness classifier or broaden this into an evaluator project.

### Preference detection is still based on word co-occurrence

At `questions-id-glm.ts:620–623`, any known entity name anywhere in a question
plus any superlative is treated as an asserted premise. This rejects the
following slot-7 request as `unsupported_premise`:

> Saya mencari laundry yang paling murah. Apakah Laundry Ceria cocok untuk kebutuhan itu?

It states a buyer preference and asks about fit; it does not assert that the
business is cheapest. Keep rejecting the paired unsupported assertion:

> Karena Laundry Ceria paling murah, apakah cocok untuk cucian keluarga?

Narrow the mechanical distinction instead of treating a whole-string name
match as proof that the superlative is attached to that business. The current
test at `questions-id-glm.test.ts:518` also labels an open “Apakah …?” question
as an assertion; use an actual assertion for the negative case. This is about
the premise property, not blanket semantic approval of either wording.

### Category-alternative comparison was weakened without approval

At `questions-id-glm.ts:576–602`, the comparator requirement is skipped and the
relation check becomes brand mention plus any `atau`/comparison marker for
non-named targets. On real adapter output with
`comparison.kind: "category-alternatives"`, this slot-9 input passes v3:

> Laundry Ceria menerima pakaian atau sepatu?

It compares no businesses or category alternatives. Existing validation
reports both missing comparator identity and missing comparison relation.
The adapter already supplies the canonical category-alternative phrase;
the existing closed-relation helper can bind it. Preserve that boundary,
including a valid category-alternative comparison and this unrelated-`atau`
negative case. Do not silently treat unresolved comparison facts as proof
of a valid comparison. Documenting the weaker behavior does not authorize it.

## I2 — Reject absent response IDs

`assessCheaperInferenceIndonesianResponse` reads `body.id` at line 205 but
never validates it before returning success at lines 285–293. A synthetic
HTTP 200/stop response with the exact requested model returns `ok: true` for
an absent, empty, or whitespace-only ID.

Require a nonblank string response ID as part of provenance assessment.
Report explicit failure while preserving supplied identifiers. Test missing,
non-string, empty and whitespace-only IDs, plus a valid ID. Preserve strict
model equality and the still-pending exact alias decision; no prefix stripping.

## I3 — Keep the dormancy test protecting the new entry point

The `question-facts-v3.test.ts:427–447` change exempts `questions-id-glm.ts`
as an allowed consumer but the detection regex still only looks for imports
of `question-facts-v3` or `question-context-v3`. Thus this hypothetical
production import is invisible to the guard:

```ts
import { buildCheaperInferenceIndonesianQuestionRequest } from "@/lib/audit/questions-id-glm";
```

There is no such production import now. The defect is that the modified test
no longer proves the claimed dormant boundary through the new entry point.
Extend the existing bounded import guard to cover the GLM module and its
instruction helper, with narrowly allowed internal imports. Add a focused
check demonstrating that an external runtime importer would fail the guard.
Do not remove the original G1 protection or add a broad exclusion.

## Evidence and limitations

The independent probes import the actual implementation. They confirm the
three safety omissions, preference false positive, category-comparison false
positive, missing-ID successes and dormancy-regex gap. All response/text probes
are synthetic; fetch tripwire count is **zero**. Scratch source, bundle and
results are at `/private/tmp/nuave-glm-implementation-review-20260917/`
(`probes.mts`, `probes.mjs`, `results.json`). No application edits were made by
the reviewer, and no adapted GLM quality judgment or live evidence is claimed.

Reviewed working-file hashes:

| File under `src/lib/audit/` | SHA-256 |
| --- | --- |
| `questions-id-glm.ts` | `a5593c5cfdac6368a3ac6abab2a53fbeb5ee6ea6e4bbd67cba309a0bfcfe2cfe` |
| `questions-id-glm-instruction.ts` | `7b00c780c04e7f5bb5ab51e8adff404e65c64a647fe6116f31a2288e07a63704` |
| `questions-id-glm.test.ts` | `74ba8823f20337e86f5cb9ac50326c456887cdbc1f9f5f2d7f4ef824ad74a181` |
| `fixtures/glm-request-specimen.json` | `405245b8138088f359e00e730f70f8c5e09fb5352056bf5a109ab5919f7f4bf3` |
| `question-facts-v3.test.ts` | `c2a08f433aa8220f8b5d02b703b1bbe6a13d3dab6864a6d908cd17c5447708cd` |

## Worker handoff — bounded implementation correction

Continue in the same prototype branch/worktree. Close I1–I3 above. Preserve
the byte-exact accepted request/instruction, the strict extractor, the exact
R5 punctuation rule, zero live effects, and unchanged v2 behavior. No new draft,
prompt redesign, model selection, or fallback-authoring task is requested.

Expected edits are the GLM module/tests and the existing dormant-consumer test.
Use the smallest shared helper extraction only if needed to retain protections;
do not alter shipped v2 semantics. Reproduce the listed failures with regression
tests, make bounded fixes, run focused tests and `npm run verify` offline, then
inspect the full diff. Founder wording tests should use appropriate fictional
category contexts or assert only the intended punctuation property; a full
pass against laundry facts does not prove an invoice/laptop question fits them.

Return changed paths, full hashes, regression outcomes, verification evidence
and any remaining limitation. Keep the instruction and specimen unchanged
unless a demonstrated implementation necessity is reported separately. No
credential reads, external provider calls, registration, route/UI wiring,
capture runner, commit, push, PR, merge or deployment. Return for independent
review before capture preparation. No founder language decision is needed
to resolve these implementation findings.
