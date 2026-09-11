# protocol-v4 clean Stage 1 execution and review summary

Status: **complete screening run; founder review pending**. This package is independent of protocol-v3 generated results. The eight fixture inputs are reused screening material; they are not fresh held-out confirmation.

## Call accounting

- One-shot S: 8 calls, 8 completed, 0 failed.
- Planner→realizer P: 16 calls attempted: 8 planners and 8 realizers.
- Total: **24/24 authorized calls**, with no retries, replacement attempts, ranking, repairs, or confirmation generations.
- Pack records: 16 (8 S, 8 P).
- Persisted attempt records: 24; planner results were persisted before each corresponding realizer request.
- Usage: S 15,791 total tokens; P 35,656 total tokens; total 51,447 tokens.
- Latency sums: S 97,736 ms; P 162,658 ms; total 260,394 ms.
- Provider-reported cost: unavailable in the usage payload; no cost estimate is asserted.

## Failed outcomes

- `v3-language-course-sparse`: planner completed and passed its plan validator; realizer completed but failed final composition validation because the output lacked both named and unnamed comparisons.
- `v3-inventory-software-sparse`: same final composition validation failure.

Those failures remain in their pack records and are rendered as unavailable in the blind review until technical reveal. No replacement questions were inserted.

## Provenance verification

Every attempted request has an immutable pre-request record under `results/attempts/` containing the exact non-secret request body, request hash, stage, fixture ID/hash, instruction text/hash, schema/hash, settings, and parent-plan hash where applicable. Every completed/failed result retains the raw response or provider failure, returned model/response ID where available, usage, latency, parsed output, validation issues, and provenance errors. All 24 completed provider responses returned `gpt-5.6-luna` with HTTP 200 and response identities. Manifest hashes for the contract, instructions, schemas, and eight fixtures match.

The runner's offline tests intercept the same payload builder used by live execution and cover schema routing, exact plan forwarding, question-shaped plan rejection, invalid-plan realization blocking, pre-request persistence, provenance mismatch failure, composition-vs-semantic distinction, and no-overwrite behavior. Offline result: 6 test files, 44 tests passed. Full repository typecheck passed.

## Review package

- Opening path: `experiments/buyer-decision-questions/protocol-v4/review/index.html`
- Data bundle: `experiments/buyer-decision-questions/protocol-v4/review/data.js`
- Pack evidence: `experiments/buyer-decision-questions/protocol-v4/results/clean-stage1-*.json`
- Attempt evidence: `experiments/buyer-decision-questions/protocol-v4/results/attempts/*.json`
- Frozen package: `experiments/buyer-decision-questions/protocol-v4/`

The review page uses a v4-only storage key, deterministic anonymous labels and question order, exact question/run bindings at mark time, pack-level preference bindings, and a reveal step for technical/semantic review. Temporary browser-state verification passed: 8 sections, 480 controls, 10 marks per temporary pack, correct preference run IDs, exact stored question text, metadata hidden before reveal, and marks cleared afterward. Actual founder review state is blank.

## Review instructions

1. Open the HTML file directly in a browser.
2. For each fixture, read both anonymous packs against the displayed business brief.
3. Mark every request Keep, Light, or Replace. Do not infer quality from the technical summary.
4. Select the overall preference only after both packs are marked.
5. Use **Reveal semantic metadata** only after the blind language pass; then record semantic/measurement concerns in the technical review controls.
6. Use **Export review JSON** and preserve the downloaded file. Do not reset the page before exporting.

Founder marks, preferences, semantic decisions, and acceptance judgments are not prefilled.
