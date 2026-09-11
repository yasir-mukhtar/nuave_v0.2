# Next test proposal — calibration-aligned B v2 (ready for founder initiation)

Status: **proposal only. No paid generation has been run for v2.** All
artifacts below are prepared and verified offline. The founder initiates the
live step; the agent executes it only after explicit authorization.

## Goal

Answer one question: does the revised instruction (`condition-b-v2`, frozen
`724ace53…`, `instructions/condition-b-v2.json`) generate packs that sound
like what a customer would actually type — on the specific question shapes
where the founder and the earlier AI disagreed?

## Scope (small, by design)

- **V1 evidence stays the acceptance reference** for the 39 founder-reviewed
  questions (`evidence/calibration.md`). The next test does not re-review
  those 39.
- **One live generation set**: condition B v2 only on the existing three
  fixtures (1 development + 2 held-out) = **3 generation calls**, Luna via
  OpenCode Go, same locked settings as the 2026-09-06 initial run.
- No condition A calls, no Terra challenger in this step. The existing A/v1
  records remain untouched. (Challenger stays optional and is never implied to
  be better than Luna.)

## Frozen instruction

`instructions/condition-b-v2.json` (schema `nuave-buyer-decision-instruction-v2`,
`frozen_at: 2026-09-06`) — already in `instructions/manifest.json` with its
SHA-256. The live runner refuses to run if the file drifts from that hash.

Changes vs v1 are summarized in `evidence/findings-2026-09-06.md`.

## Live step (authorized and completed)

The dedicated runner was used so this calibration made no condition-A calls:

    cd /Users/yasir/nuave_v0.2 && \
    EXPERIMENT_BDQ_LIVE=1 \
    OPENAI_AUDIT_MODEL=gpt-5.6-luna \
    OPENAI_AUDIT_REASONING_EFFORT=low \
    NUAVE_QUESTION_PROVIDER=opencodego \
    BDQ_INSTRUCTION_ID=condition-b-v2 \
    npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts b-v2

This made exactly 3 provider calls. The runner's final assertion failed
honestly because two completed records did not satisfy the existing B contract;
all three immutable records remain under `results/`. No repair or retry was
applied.

Guardrails (unchanged from the v1 runs): refused without
`EXPERIMENT_BDQ_LIVE=1` and the `OPENCODEGO_API_KEY` credential (zero calls,
no record); each B record used one call, and requested/returned model identity
was checked.

## Review step (small by design)

Build the snapshot bundle into its own file so it never overwrites the v1
review (`review/data.js` stays the v1 record):

    node experiments/buyer-decision-questions/review/build-data.mjs \
      --instruction condition-b-v2 --out review/data-v2.js

Then open, in the founder's browser:

    open "experiments/buyer-decision-questions/review/index.html?bundle=data-v2.js"

In this v2 bundle, the two blind packs are explicitly paired as **B v1
baseline** and **B v2 candidate** after reveal. The bundle hides unrelated
confirmation/challenger packs and uses a separate local-storage review key.
The page still supports the normal full ten-question-per-pack review; the
three-call generation set is smaller than the original eight-record review,
but this bundle does not lower the acceptance threshold or create a partial
gate.

## Export and gates

    # after the review, in the page: Export → e.g. ~/Downloads/nuave-bdq-v2-review.json
    node experiments/buyer-decision-questions/review/compute-gates.mjs \
      ~/Downloads/nuave-bdq-v2-review.json

Exit codes: 0 = founder marks pass the mechanical quality thresholds for the
reviewed pack, 1 = a gate is red, 2 = the review is incomplete. **An
incomplete review never passes.** Note: the v2 step does not claim a decision
(no SUPPORTS_B / overall verdict) — it is a language-bar check against the
calibration examples. A later confirmation round with fresh fixtures would be
needed before any confirmation-level claim.

## What would NOT be done

- No production changes (`src/lib/audit/*` untouched).
- No schema/threshold changes to make v2 "pass" (the 7/10-keep thresholds
  stay).
- No live Terra challenger, no claim that another model fixes v1.
- No averaging of founder and AI marks, no AI marks as founder acceptance.