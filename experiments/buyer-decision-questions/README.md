# Buyer-decision question experiment (Nuave audit, Indonesian)

Isolated, additive experiment comparing **two ways of generating the ten
Indonesian audit questions** a prospective customer would ask an AI:

- **A — current approach:** the actual production writer instruction
  (`question-writer-v2`), the real minimized-brief input projection, and the
  fixed ten measurement slots, run through the real generation boundary.
- **B — buyer-decision approach:** a short normalized buyer brief, a few
  language examples, broader coverage requirements, and no compulsory slot
  intentions.

The founder is the sole reviewer. Nothing here changes production behavior:
no intake wiring, no measurement-matrix changes, no deployment, no reporting
changes, no new dependencies, no live calls during implementation.

## Directory map

```
experiments/buyer-decision-questions/
├── fixtures/            three frozen fixture JSONs + manifest (sha256 frozen)
├── instructions/        frozen condition-b instructions (v1 = 2026-09-06 live
│                        runs; v2 = calibration revision, frozen, not yet
│                        run live) + manifest + condition-a-snapshot.json
├── evidence/            the review record, calibration, and findings
│   ├── founder-review-2026-09-06.json   founder marks (immutable copy)
│   ├── ai-review-2026-09-06.json        AI pre-review (kept separate)
│   ├── ai-evaluation-2026-09-06.md      AI findings (separate)
│   ├── calibration.md / .json           (run_id, question) aligned matrix
│   ├── findings-2026-09-06.md           consolidated findings
│   ├── next-test-proposal.md            smaller next review (founder-initiated)
│   └── b-v2-live-2026-09-07.md          observed v2 call/result addendum
├── src/                 runner, loaders, record model, validation (TS)
├── live/                paid-run specs: initial / confirmation / challenger
├── tests/               offline verification (vitest, no provider calls)
├── review/              standalone review page + node CLIs
│   ├── index.html       blind review surface (open from disk; ?bundle=… for
│   │                    a snapshot bundle such as the v2 next test)
│   ├── build-data.mjs   bundles fixtures+instructions+results into data.js
│   │                    (flags: --results <dir>, --out <file>,
│   │                    --instruction condition-b-v2)
│   ├── build-calibration.mjs  rebuilds evidence/calibration.* from the two
│   │                    review JSONs + run records
│   ├── compute-gates.mjs  prints per-pack gates + decision summary
│   └── gate-logic.mjs   pure gate rules (shared with tests)
├── vitest.offline.config.mts   offline tests (default-safe)
└── vitest.live.config.mts      paid runs only (never part of offline gates)
```

## Freeze facts

- Fixture 1 (`fixture-1-kopi-sudut`) is **development material**; its results
  are never described as unseen generalization.
- Fixtures 2 and 3 are **held-out**, clearly fictional, with explicit buyer
  needs. Facts and sample questions from the held-out fixtures are **not** in
  the B instruction (enforced by an offline test).
- Fixture/business fields that are absent stay absent (empty strings, empty
  arrays, empty comparator). The fixtures intentionally do not satisfy the
  production intake zod schema, which requires provenance fields such as
  `official_sources`; they are validated by the experiment's own shape check
  instead. A fixture's business facts are the same for both conditions; B's
  normalized brief only drops provenance signals
  (`official_source_urls`, comparison `source_url`) and accuracy caveats
  (`known_accuracy_questions`) and omits empty fields (tested).
- Every fixture and the B instruction are frozen by sha256 over file bytes.
  The live runners **refuse to run** when a file no longer matches its frozen
  hash, so the confirmation/challenger runs provably reuse the same
  instruction. To change a fixture or the B instruction, add a new version to
  the manifests and treat any affected review as superseded.
- Condition A intentionally drifts with the production writer: each run
  records the instruction actually used. A mismatch with the freeze-time
  snapshot is reported loudly by the initial run.

## Run commands (founder-initiated paid calls)

Both conditions call the **existing OpenCode Go provider with the
`OPENCODEGO_API_KEY` credential** (the same credential mechanism the audit
pipeline uses; values are read from `.env.local`, never printed). Model:
`gpt-5.6-luna` for A and B; the challenger uses an explicit Terra identifier
and verifies the returned identifier. No web-search tools. Each run writes
records under `results/` with fresh run ids and never overwrites.

```bash
# 0. Offline verification (no provider calls, run anytime)
npx vitest run --config experiments/buyer-decision-questions/vitest.offline.config.mts

# 1. Initial comparison — 3 fixtures × (A + B) = 6 calls
EXPERIMENT_BDQ_LIVE=1 npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts initial

# 2. Confirmation — B once more on the two held-out fixtures = 2 calls
EXPERIMENT_BDQ_LIVE=1 npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts confirmation

# 3. Optional challenger — B on the two held-out fixtures via GPT-5.6 Terra = 2 calls
#    (default identifier gpt-5.6-terra; override with EXPERIMENT_BDQ_TERRA_MODEL.
#     The returned identifier must equal the requested one or the run fails.)
EXPERIMENT_BDQ_LIVE=1 npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts challenger

# 4. Refresh the review surface with the new results
node experiments/buyer-decision-questions/review/build-data.mjs

# 5. Next test: condition B v2 calibration only — 3 calls, Luna.
#    This uses the dedicated B-v2 spec; it does NOT call condition A.
EXPERIMENT_BDQ_LIVE=1 \
  OPENAI_AUDIT_MODEL=gpt-5.6-luna \
  OPENAI_AUDIT_REASONING_EFFORT=low \
  NUAVE_QUESTION_PROVIDER=opencodego \
  BDQ_INSTRUCTION_ID=condition-b-v2 \
  npx vitest run --config experiments/buyer-decision-questions/vitest.live.config.mts b-v2

# 5b. Snapshot bundle for the v2 review (keeps data.js = prior bundle)
node experiments/buyer-decision-questions/review/build-data.mjs \
  --instruction condition-b-v2 --out review/data-v2.js
# The query is relative to review/index.html:
open "experiments/buyer-decision-questions/review/index.html?bundle=data-v2.js"
```

`BDQ_INSTRUCTION_ID` defaults to `condition-b-v1` in the historical A+B
initial/confirmation specs. The dedicated `b-v2` spec requires the explicit
v2 value and makes B calls only. v2 is used only when explicitly requested.

Every scheduled run makes exactly the number of calls above (asserted), one
call per condition and fixture, in fresh contexts, no best-of selection, no
hidden quality retries, no automatic retry after a timeout — an unresolved
attempt is recorded as a failed record with the reason.

## Review surface

Open `experiments/buyer-decision-questions/review/index.html` from disk
(after running `build-data.mjs`). No server, no framework. For the v2
calibration bundle, use:

```text
review/index.html?bundle=data-v2.js
```

That bundle pairs the prior B v1 run with the new B v2 run as the two blind
packs, keeps confirmation/challenger packs out of the calibration view, and
uses a separate browser storage key. The normal review still marks all ten
questions per pack; no threshold is lowered for v2.

- **Pass 1 (blind):** per fixture you see the business context and two
  complete packs labelled `Paket 1` / `Paket 2` (randomized and persisted in
  `localStorage`, so refreshing does not reshuffle). Question order within a
  pack is randomized and persisted too. Model, condition, old slot names,
  coverage labels, and provenance are hidden. Mark every question Keep /
  Light / Replace (Replace requires a short reason), add optional notes, then
  choose an overall pack preference (tie allowed). Metadata unlocks only
  after all marks **and** the preference are saved.
- **Pass 2:** reveals condition, model/instruction provenance, raw vs
  repaired output, per-question old-slot metadata (A) or declared coverage
  tags (B), and mechanical contract issues, then asks you to answer the
  checklist (standalone answerability, unsupported claims, identity leakage,
  useful coverage, repetition/padding, changed-or-lost old measurements).
  Semantic checks are human judgment — the page says so; mechanical checks
  only assist.
- **Save/export:** every change autosaves to `localStorage`. Use
  **Export review** to download a JSON file; **Import** restores it. The
  export carries run ids and the exact displayed question text for every mark,
  so gates can bind each judgment to an immutable run/question pair. Exports
  missing that text binding are intentionally incomplete and must not be used
  for a gate decision. A `reviewer` identity (founder by default) prevents AI
  pre-reviews from being mistaken for founder acceptance.

The confirmation and challenger B packs appear under **Additional packs**
(identity of the run kind stays hidden until that pack is fully marked) with
the same marking rules for their own per-pack quality gates.

## Gate summary

After review, compute gates (no network):

```bash
node experiments/buyer-decision-questions/review/compute-gates.mjs ~/Downloads/nuave-bdq-review-YYYY-MM-DD.json
# exit 0 = decided gates pass · 1 = a gate fails · 2 = a review is incomplete
```

Proposed gates (decision rules, **not** statistical proof):

- Per B pack: ≥ 9/10 Keep or Light; ≥ 7/10 Keep; no unresolved grounding,
  identity, or standalone-context failures; useful coverage beyond repeated
  recommendation requests (pass-2 items; incomplete answers never pass).
- Initial comparison: founder prefers B on ≥ 2 fixtures **including a
  held-out fixture**, with no material regression on the remaining fixture
  (operationalized: B's per-pack quality gates still pass there).
- The two confirmation packs must meet the same per-pack quality gates.

Language quality and audit validity stay separate: a strong language score
never masks invalid context or reduced coverage. Counts, fallback provenance
(A deterministic fallback / slot repairs) and validation issues are printed
from the run records, and fallback wording is never attributed to the model.

If B wins, describe the result only as support for the **revised approach as
a package** — the experiment does not isolate the effects of normalization,
examples, or relaxed slots, and does not prove equivalence with the old
audit. If instructions are revised after seeing held-out results, those
fixtures become development material and fresh fixtures are needed for any
later confirmation.

## What was checked offline

`tests/` covers the meaningful failure risks with mocked provider responses:

- run counts and condition/model routing (exactly one call per condition and
  fixture; same model, provider, compatible settings; no tools);
- no accidental paid calls (guard flag + credential checked before any
  fetch; live spec without the flag fails with zero calls);
- raw vs repaired provenance for A (slot repair and full fallback recorded,
  never attributed to the model);
- B exposed failures instead of the old fallback (B output is never run
  through slot repair or the deterministic pack);
- persistence of records, blind labels, and review marks (page logic is
  exercised in the browser; record no-overwrite is unit-tested);
- correct gate calculations including incomplete and failing reviews;
- freeze integrity: fixture/B-instruction hashes, role split, B brief values
  drawn only from the A projection, held-out facts absent from the B
  instruction.

## Known limitations

- Fixture 1 has no office geography, so proximity cannot be tested as
  written; questions are expected to broaden around the stated scope (Depok)
  and record the limitation instead of inventing details.
- Language naturalness, grounding, identity leakage, and coverage usefulness
  remain human judgments; keyword checks do not prove naturalness.
- Records contain raw provider output (locally, gitignored); credentials are
  never recorded — only the credential variable name.
- The B output schema differs from A's (B carries one coverage tag and
  limitation notes per request) — a documented, necessary difference; all
  other generation settings are shared.
- Terra support depends on the existing provider; the challenger verifies the
  returned model identifier and refuses to silently substitute another model.
