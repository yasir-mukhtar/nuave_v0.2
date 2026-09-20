# Dormant GLM prototype — third correction review

2026-09-17. **All 17 previous probes now behave correctly. G1/G2 still need
narrower matching of what is being diagnosed or questioned.** The accepted
prompt, model, scope and extraction contract remain unchanged.

Reviewed `/Users/yasir/nuave-worktrees/glm-prototype` on
`codex/glm-dormant-prototype-2026-09-17`, base `687f340`. Only the GLM validator
and its tests changed since review 3. The remaining four hashes are unchanged.

## Verification and closed examples

Independently reran **142/142 focused tests**: 43 GLM, 40 existing question
tests and 59 facts/dormancy tests. Rebuilt the independent probes against the
actual current source. All previous medical, mixed, ambiguous, equipment-
ownership and premise examples now have the expected results. Request/fixture
fidelity, strict extraction, response-ID, comparison, privacy, other safety
and dormancy checks remain intact. Probe fetches: zero.

Inspected the worker's full verification log, `/private/tmp/glm-verify-run3.log`:
1132 unit tests, Next.js/OpenNext builds and all 95 browser tests pass, ending
with `Offline verification passed.` This is inspected worker evidence, not a
new independent full-suite run. Log SHA-256:
`046bf8982f5ff40391c7d497bb3fa97d7b93b6b9d44f19fce48d84006ab21d8d`.

## G1 — A device mentioned as a channel is not the diagnosis subject

`questions-id-glm.ts:481` and `:724–726` allow the diagnosis exception whenever
an equipment noun occurs anywhere in the question, absent a listed medical
term. That does not establish that the equipment is being diagnosed.

These synthetic inputs both return **no issues**:

- `Bisa bantu diagnosis kondisi ini lewat HP?`
- `Tolong diagnosis saya lewat HP.`

The first remains unresolved; the second names the person as the diagnosis
subject. `lewat HP` describes how the diagnosis is delivered. Neither is an
equipment-diagnosis request. Adding a delivery channel must not exempt the
previously restricted diagnosis request. This is the positive-subject
requirement already stated in reviews 2 and 3, not a new medical policy.

Required correction: recognize a bounded relationship between diagnosis and
the equipment subject, not whole-question equipment-word presence. Preserve
the already supported equipment forms, including `diagnosis laptop saya`
and a `Servis AC … diagnosis kerusakan` request. Medical/mixed context anywhere
continues to override the exception; unresolved subjects remain restricted.
Use appropriate fictional equipment facts for paired tests. A device used
only for communication or an unrelated equipment mention cannot authorize
the exception. Do not solve this only by blacklisting `lewat HP`.

## G2 — Position alone does not identify the claim being questioned

`questions-id-glm.ts:460–465` exempts all clauses starting with a permitted
opener or ending with a permitted tag, without binding that form to the
entity/superlative claim. Both synthetic slot-7 inputs return **no issues**:

- `Apa kelebihan Laundry Ceria yang paling murah di Jakarta Selatan?`
- `Laundry Ceria paling murah dan klaim itu betul.`

The first asks for advantages while presupposing the cheapest claim; it does
not ask whether the business is cheapest. The second explicitly affirms that
claim. `betul` at the end does not make it a confirmation question. These are
the same assertion-versus-open-question cases required by the earlier reviews.

Required correction: recognize bounded forms that ask whether the named
property holds, rather than letting an opener/tag exempt every claim in its
clause. Preserve these paired open asks:

- `Apakah Laundry Ceria paling murah di Jakarta Selatan?`
- `Apa Laundry Ceria paling murah untuk cucian keluarga?`
- `Laundry Ceria paling murah nggak?`

Keep unnamed preference requests and the separate buyer-preference/fit
question open, and preserve the negative examples already fixed. A narrow
recognizer for supported relationships is enough; do not implement a general
grammar parser or promise universal semantic checking. Unsupported forms may
retain conservative handling. Optional terminal punctuation under R5 §5.1
remains unchanged; do not restore a global question-mark requirement.

## Evidence and unchanged boundaries

Fresh probe source, newly built bundle and results:
`/private/tmp/nuave-glm-third-correction-review-20260917-E9V91Y/`.
The 17 prior cases and five additional cases are synthetic guard-property
checks, not provider results or actual personal records. Four additional
negative cases reproduce the findings; the new `nggak?` positive case passes.

Reviewed hashes under `src/lib/audit/`:

| File | SHA-256 |
| --- | --- |
| `questions-id-glm.ts` | `451ad6f43c1944d7893af6462992eb70d338aff782e3e264b7b2bf174e3471d1` |
| `questions-id-glm.test.ts` | `a053fcda05d61f5124e2f60e81d34631c9a9e61a8fd98a622a2c382a078de517` |
| `questions-id-glm-instruction.ts` | `7b00c780c04e7f5bb5ab51e8adff404e65c64a647fe6116f31a2288e07a63704` |
| `fixtures/glm-request-specimen.json` | `405245b8138088f359e00e730f70f8c5e09fb5352056bf5a109ab5919f7f4bf3` |
| `question-facts-v3.test.ts` | `372c146961a0d826a60d836db38e2ad1c282d2c4a261516fd82f4d96a8ea69c3` |
| `questions-id.ts` | `659ca367c459b5e3f63de794aed6f1e060dc2986f56a9bcde7f7e9a4f8e8a94d` |

No implementation changes, credentials or provider calls occurred in this
review. Only this document and `docs/NOW.md` changed in the repository.

## Worker handoff — bind the two exceptions to their subjects

Continue in `/Users/yasir/nuave-worktrees/glm-prototype` on the existing
`codex/glm-dormant-prototype-2026-09-17` branch. This is a correction to the
same dormant prototype, not a new implementation or planning task.

Read, in order: the worktree's `AGENTS.md` and `README.md`;
`/Users/yasir/nuave_v0.2/docs/NOW.md` and `docs/WORKFLOW.md` in that checkout;
this full review at
`/Users/yasir/nuave_v0.2/docs/drafts/glm-local-integration-2026-09-17/IMPLEMENTATION_REVIEW_4.md`;
the same directory's accepted `INTEGRATION_DRAFT.md` §8; and
`/Users/yasir/nuave_v0.2/specs/008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`
§§5.1–5.2. Review 3 is the preserved preceding finding record.

Change only `src/lib/audit/questions-id-glm.ts` and its focused test file.
Reproduce the four negative examples above, retain the positive pairs, then
make the two exceptions match their supported relationships. Do not keep
expanding arbitrary keyword lists or special-case only the exact failing
sentences. Recognize a small, explicit set of permitted constructions and
retain conservative handling outside it. No general language classifier is
required. Preserve all already closed findings, exact prompt/request,
punctuation rule, shared v2 behavior, extraction, provenance and dormancy.

Rebuild probe bundles from source; run the paired tests, all previous probes
and full `npm run verify` offline. Return the exact changed paths/hashes,
verification log path/result, and a concise explanation of which relationships
qualify for each exception. No new design document is needed. Escalate a real
conflict with approved behavior rather than silently widening permissions.

No model/prompt redesign, fallback work, credentials, external provider call,
runner preparation, registration, customer-route wiring, commit, push, PR,
merge or deployment. Return for independent review before the separate
capture-preparation task. No founder wording decision is pending here.
