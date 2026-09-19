# Dormant GLM prototype — correction re-review

2026-09-17. **Two guard exceptions still require correction.** This is an
implementation review, not another prompt-design round. The accepted prompt,
model, prototype scope and strict extraction contract remain settled.

Reviewed the returned six-file working change on
`codex/glm-dormant-prototype-2026-09-17` at base `687f340`, in
`/Users/yasir/nuave-worktrees/glm-prototype`. File hashes match the worker return.

## Closed findings

- **I2 closes:** missing/non-string/empty/whitespace response IDs fail
  provenance. Requested and returned identifiers remain preserved, and
  model alias acceptance stays pending.
- **I3 closes:** the dormancy scan now covers the GLM module and instruction
  helper, with an explicit synthetic external-import check. No production
  caller was added.
- **I1 category-alternative comparison closes:** the canonical alternative
  phrase and original closed-relation predicate are required again. The
  unrelated clothing/shoes `atau` example now fails correctly.
- **I1's original safety probes close:** private-data, prescription and
  fake-review requests now produce the corresponding issues. The named
  buyer-preference example passes and the `Karena … paling murah` assertion
  fails. These examples alone do not validate the new exceptions below.
- Full request/fixture comparison still matches the accepted specimen.
  Instruction and fixture files are unchanged. Valid extracted text is
  preserved and wrapped continuation text is rejected.

The shared `questions-id.ts` change exports existing pattern arrays and splits
the diagnosis alternative into a separate regex in the same v2 `.some` check.
Inspection confirms that this refactor preserves the old v2 match set; the
remaining findings concern the new GLM exceptions.

## G1 — Diagnosis exception drops the explicit R5 negative cases

`questions-id-glm.ts:449–455` replaces the generic diagnosis blocker with a
pattern requiring a short list of words immediately after `diagnos…`.
This does not establish that an otherwise unmatched request concerns equipment.

Both synthetic inputs return **no v3 issues**, while the retained v2 blocker
identifies high-impact advice:

> Klinik mana yang cocok untuk diagnosis kanker saya?

> Di mana saya bisa mendapat diagnosis AC rusak dan kanker saya?

R5 §5.2 explicitly lists personal cancer-diagnosis suitability and mixed
human/equipment text on the reject/conservative side. This is not a request
to expand medical policy or create a general language classifier.

Make the equipment exception positively bounded: keep ordinary equipment
diagnosis permitted, but do not treat failure to match a small medical-word
list as evidence of an equipment-only request. Preserve conservative handling
when the text is medical, mixed or ambiguous. Test equipment-only, personal
cancer, mixed equipment/human and uncertain-context cases; keep ordinary
regulated-provider discovery allowed. Do not solve only the literal word
`kanker` while leaving the exception's logic unchanged.

## G2 — A question-word occurrence is not an open-question test

`V3_INTERROGATIVE_MARKERS` at lines 439–441 and the exemption at lines 544–555
skip the premise rule whenever any listed word appears anywhere in a clause.
These two synthetic slot-7 texts therefore return **no v3 issues**:

> Laundry Ceria paling murah untuk siapa saja.

> Kenapa Laundry Ceria paling murah di Jakarta Selatan?

The first is a direct unsupported superlative assertion. The second presupposes
that the business is cheapest and asks why. Neither is equivalent to asking
whether that claim is true. Keep this genuine open ask permitted under the
premise check:

> Apakah Laundry Ceria paling murah di Jakarta Selatan?

Narrow the exception to supported open-question forms instead of exempting an
entire clause because it contains `siapa`, `kenapa`, `nggak`, etc. Preserve the
already passing separate buyer-preference + fit-question case and reject actual
attached assertions/presuppositions. Add paired regression cases. Do not add a
semantic quality gate or claim the resulting mechanical rule proves universal
input adherence.

## Verification

Independent probes re-imported the actual updated implementation and rebuilt
the request from real G1 projection. They reproduce G1/G2 and confirm the closed
findings above. All extra texts and envelopes are synthetic test inputs, not
provider evidence or actual personal records. Fetch tripwire count: **zero**.
The tests isolate guard properties; they do not claim every probe is a
semantically suitable laundry question.

Probe source/bundle/results:
`/private/tmp/nuave-glm-correction-review-20260917/`.
The independent full `npm run verify` run **passed, exit 0**: typecheck,
lint, formatting, typography, 1130 unit tests, Next.js and OpenNext builds,
and all 95 browser tests (89 + 3 + 3). Log:
`/private/tmp/nuave-glm-correction-verify-20260917.log`.
The earlier worker result of 94/95 plus an isolated retry was not treated
as a complete gate or proof of the failure's cause; this fresh full run
closes that verification gap. It does not invalidate the G1/G2 probes.

Next.js appended its generated instruction block to the worktree's
`AGENTS.md` during verification. The reviewer removed only that exact
append after confirming all preceding bytes matched the pre-run file.
All six reviewed implementation files remain unchanged.

Reviewed hashes under `src/lib/audit/`:

| File | SHA-256 |
| --- | --- |
| `questions-id-glm.ts` | `0854057e99f86be2d27620daa00ee396d97596e20ebbc70d9295524d258a2e7e` |
| `questions-id-glm-instruction.ts` | `7b00c780c04e7f5bb5ab51e8adff404e65c64a647fe6116f31a2288e07a63704` |
| `questions-id-glm.test.ts` | `5e3d0420ecfd870e0294f9a38e8c11120abc7a9fb9350ec9e3fc5fd0b0c386dd` |
| `fixtures/glm-request-specimen.json` | `405245b8138088f359e00e730f70f8c5e09fb5352056bf5a109ab5919f7f4bf3` |
| `question-facts-v3.test.ts` | `372c146961a0d826a60d836db38e2ad1c282d2c4a261516fd82f4d96a8ea69c3` |
| `questions-id.ts` | `659ca367c459b5e3f63de794aed6f1e060dc2986f56a9bcde7f7e9a4f8e8a94d` |

## Founder-requested verification rerun

Rechecked on 2026-09-17 after “Try to verify now.” All six implementation
hashes above are unchanged: the G1/G2 corrections are not present in this
worktree. Freshly rebuilt probes against the current source still reproduce
both findings; request fidelity, extraction and the previously closed cases
remain correct. Probe fetch count: zero. Evidence:
`/private/tmp/nuave-glm-reverify-20260917-seMYso/`.

The fresh full `npm run verify` also passed, exit 0: 1130 unit tests,
both builds and all 95 browser tests. Log:
`/private/tmp/nuave-glm-reverify-20260917.log`.
Passing the existing suite does not close the independently reproduced
G1/G2 gaps. The handoff below remains the next action. No source changes or
provider calls were made; only the exact build-generated `AGENTS.md` append
was removed to restore its saved pre-run bytes.

## Worker handoff — correct only G1 and G2

Continue on the same prototype branch. Reproduce and fix the two exceptions
above in `questions-id-glm.ts` and its focused tests. Preserve the closed
findings, shared v2 semantics, exact request/instruction, strict extractor,
approved punctuation rule and offline-only behavior. No new planning document,
model comparison, prompt rewrite, fallback project or test infrastructure is
needed. Provider-input token budgeting belongs to the later bounded capture
preparation; do not port the legacy brief-size heuristic as proof of this
request's actual token size.

Run the focused regressions and full `npm run verify` offline. Return exact
changed paths/hashes and the full gate result; an isolated retry does not
replace the gate. Preserve source files during build-artifact cleanup.
No credentials, external provider calls, runner creation, registration,
customer-route wiring, commit, push, PR, merge or deployment. Return for
independent review before capture preparation. No founder wording decision
is needed for these two implementation fixes.
