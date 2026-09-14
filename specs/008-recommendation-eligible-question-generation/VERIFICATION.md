# Spec 008 — verification and evidence index

> Status: G0 recorded in R5; the G1 adapter is **merged and deployed via PR #59**
> (merge `687f340`, 2026-09-13) but remains dormant with no runtime consumer.
> **G2 is in fourth correction** on `codex/spec008-g2-evaluation-freeze`
> after the independent third re-review (T1a/T1b/T2/T3) and awaits independent
> acceptance; it is
> not an empirical quality pass and proves no provider feasibility. No G2 merge,
> route integration, provider call, or release is claimed.
> Index owner:
> [`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`](./NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md)
> §9–§10 (execution ledger and acceptance evidence index).

This file is the single evidence index required by R5 §9. It records adoption
provenance now and will link concrete evidence per gate as work lands.

## Adoption provenance

| Artifact                                   | Role                                                                             | Source SHA-256                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md` | Sole current implementation/execution authority for Spec 008                     | `6fa504d8e7e9e8b0985cebbb77556fd51b56c3eca9fc36a7a320ad8dd3338f44` |
| `NUAVE_SPEC_008_ADVERSARIAL_REVIEW_5.md`   | Final adversarial review of R5; verdict "proceed to G0–G2P, no broad R6 rewrite" | `6fecf01f95bf824957e2e723f2259063c188145a762a5bbcacaa3fd51186f62c` |

- R5 was committed byte-identical to the supplied source (SHA-256 verified at
  adoption, 2026-09-11). Later ledger edits live in R5's own §9 record.
- Adversarial Review 5 attach findings: F-01 → G1, F-02 → G3 (both are
  clarifications inside already-required work, not new gates).
- Superseded pre-R5 execution plan: preserved at
  [`Archive Candidates/superseded-plans/SPEC_008_EXECUTION_PLAN_PRE_R5.md`](../../Archive%20Candidates/superseded-plans/SPEC_008_EXECUTION_PLAN_PRE_R5.md);
  the tombstone at `./EXECUTION_PLAN.md` redirects here.
- Ordinary historical pack preserved for baseline/replay evidence:
  `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts`
  (`NVA-FIKTIF-001.questions.v1`, fictional/privacy-safe).

## Gate evidence

### G1 dormant facts/context boundary — 2026-09-12

- Worktree: `/Users/yasir/nuave-worktrees/spec008-g1`; branch
  `codex/spec008-g1-adapter`, originally from refreshed `origin/main@505ccd4`
  and merged onto `main@ac3cc50` (post-#58) on 2026-09-13 for integration
  preparation.
- The accepted intake was separately committed/pushed at `5821d2f` on
  `codex/complete-local-intake` when this section was first recorded; it has
  since merged to `main` via PR #58 (`ac3cc50`). The committed snapshots were
  re-derived through main's real `freezeLocalIntake` and remain equal
  (`tests/g1-intake-compatibility.test.ts`). Its source was read without
  importing its UI or changing that worktree.
- Implementation: `src/lib/audit/question-facts-v3.ts` and
  `src/lib/audit/question-context-v3.ts`; tests:
  `src/lib/audit/question-facts-v3.test.ts`.
- Fixture: `src/lib/audit/fixtures/intake-g1-snapshots.json` contains three
  fictional snapshots serialized by the accepted branch's `freezeLocalIntake`.
  Inputs follow its `local-questions.test.ts` answered-scope examples: F1,
  custom branch/product, two competitors, two service channels, fact version 7.
  Includes original Review/fingerprint fields specifically to prove exclusion.
  No source was fetched. Fixture names, URLs and facts are illustrative only.
  Fixture SHA-256:
  `e969d16af919d024819622af14b3a94d5d74165bc13270cae3593405b164bf6c`.
- Playwright accepts `NUAVE_E2E_PORT` (default remains 3000) so this branch's
  full gate can use an isolated port without stopping unrelated services;
  earlier gates used 3300/3400 and the 2026-09-13 preparation gate used 3500.

#### Parsing and projection contract

`parseQuestionFactsV3` accepts decoded JSON in one of two dormant envelopes:
`{ requestId, intake, factsContext? }` for the accepted frozen snapshot, or
`{ requestId, factsRevision, brief, factsContext? }` for the legacy brief.
Transport must select exactly one source. These are internal G1 contracts,
not new production endpoint payloads. Neither module has a runtime consumer.

The optional confirmed metadata seam carries structured scope, role, market
and channels for legacy inputs; local scope/market/channels remain owned by the
accepted snapshot and cannot be overwritten through the seam. An unknown role
remains unknown. Business type is retained separately from competitive role.
No generic role inference, fabricated locality, added screen, or new universally
required field was introduced.

Malformed types return a value-free `INVALID_REQUEST`. Recoverable missing
source/scope/offerings/comparator and demonstrated conflicts return bounded
`INPUT_CORRECTION_REQUIRED` field/code/target records. Empty optional needs,
criteria or channels do not become errors merely to satisfy the old schema.
The old production `businessBriefSchema` and prompts route remain unchanged.
Legacy correction targets use existing brief-field keys consumed by
`AuditWorkflow.inputIdForField`, plus the existing `customer-supplied-facts`
control ID. No legacy category-safety editor exists, so that target is null.
G5 must resolve and navigate these destinations; local targets are approved
screen IDs. Invalid legacy sources target `official_sources`. A scope
conflict returns to `s-scope`; a missing target returns to `s-branch` or
`s-product`. Metadata with no customer-edit owner returns a null target rather
than inventing a screen. Actual customer recovery/route responses remain G5.

The normalized record preserves exact active scope/target, all offerings,
optional needs, typed legacy buyer constraints, reach/areas, every channel and
all known comparator identities. Inactive targets/offerings/areas are omitted.
Source URLs, contact/payment fields, UI rows and labels never enter writer
context. Safe optional public facts remain attributed as buyer-supplied in the
adapter record but have no writer permission or fallback-fragment permission.
Demonstrably unsafe retained fields yield corrections without echoing values.
The mechanical privacy checks are conservative examples, not a comprehensive
personal-data detector or approval to process regulated records.

Revision binding uses a code-computed SHA-256 digest plus facts revision and
request ID. The legacy local fingerprint is never trusted or copied. Source
and optional-fact changes affect the digest; policy changes do not. The digest
is an equality key, not authentication, anonymization, or execution authority.
Future callers must retain their current confirmed binding and recheck it.

`V3_CONTEXT_MAP` derives safe legacy permissions from the unchanged measurement
matrix, adds shared scope/market/channels and the explicit need-fit addition.
Legacy criteria stay restricted to their original slots; they are never promoted
to general shared access constraints. No source URL has a writer permission.
Instruction permissions and diagnostics consume the same map. Per-slot
projections withhold forbidden identities, including derived Instagram handles,
exact targets and recognizable branded offerings; the explicit identity guard
remains necessary because a single call can see named slots too. Public safety
restrictions remain code-owned; a projection is not semantic certification.

#### Evidence and limits

- Focused offline suite: 59 tests passed after the independent-review fixes
  (44 original + 15 regression tests covering each confirmed finding).
- Gate history: `NUAVE_E2E_PORT=3300 npm run verify` passed on the pre-review
  head `8ef15a4` (880 unit tests, 84 browser tests, both builds; log
  `/private/tmp/nuave-spec008-g1-verify-final.log`).
- Post-fix gate: **PASS**, `NUAVE_E2E_PORT=3400 npm run verify` — typecheck,
  formatting and typography passed; 895 unit tests across 73 files; both Next
  and OpenNext/Cloudflare builds; 84 browser tests (79 primary, three
  forced-failure, two preview-disabled). Lint: zero errors, the same 17
  existing warnings. Log: `/private/tmp/nuave-spec008-g1-verify-reviewfix.log`,
  ending `Offline verification passed.` One intermediate run flaked on
  `e1-runnable-journey.spec.ts` Gate 1 (identity-scan heading timeout); that
  spec passed in isolation and the rerun passed in full — the dormant adapters
  have no runtime consumers.
- Independent review gate: **PASS**, 2026-09-13 on the orchestrator-reconstructed
  merged tree `677d0ee15ace4f3820de06c0cb51b8ee0318cebf` (main `ac3cc50` +
  branch content + doc resolutions). 1097 unit tests in 89 files — the
  committed suite plus 14 temporary review cases (6 serializer checks, 8
  probes) that were not all committed — and 89+3+3 browser tests; both builds;
  exit 0. The first review run flaked once on `offline-network.spec.ts`
  mobile navigation (`aria-expanded` timeout); the spec passed 5/5 in
  isolation and the full rerun passed. The flake attribution is recorded as
  intermittent, not proven suite load; both runs' logs are preserved in the
  review evidence directory outside Git.
- The six reviewed serializer checks are retained as the ordinary committed
  suite file `tests/g1-intake-compatibility.test.ts`; the eight additional
  review probes remain external evidence only.
- Preparation gate: **PASS**, `NUAVE_E2E_PORT=3500 npm run verify` on the
  published merged head — 1089 unit tests in 88 files, 89+3+3 browser tests,
  both builds, exit 0, `Offline verification passed.` Logs and the resolution
  patch are preserved in the preparation evidence directory outside Git.
- Complete change review and whitespace checks passed; documentation links and
  the three serialized fixture scopes were checked. Verification's temporary
  build environment was restored. No diagnostic scripts were added to Git.
- No provider/model/network request was made by the adapter. The dormant-import
  regression checks that no active route, UI or generator consumes it.
- Existing v2 generation/instruction behavior and matrix metadata are unchanged.
  The full gate covers existing report and browser regressions.
- Review 5 F-01's dormant parsing classification is implemented. Its actual
  capable-client route, zero-call correction/retry, navigation and regeneration
  scenario remains G5; no end-to-end recovery pass is claimed here.

Two limitations are explicit data, not silent guesses: missing competitive role
and multiple named comparators without a settled slot-9 relation. Multiple names
stay separate; the adapter neither selects the first nor concatenates a fictional
single business. The accepted UI exposes no dedicated role correction owner.
These require concrete resolution before applicable generation/client integration;
this G1 implementation does not amend those product contracts. General proprietary
abstraction, premise checks and fallback realization remain the later writer/
finalizer work; G1 withholds known identifying text rather than inventing an
abstraction or declaring an entire pack safe.

#### Independent-review fixes — 2026-09-12

A reviewer reproduction suite (`/private/tmp/nuave-spec008-g1-review`, detached
at the reviewed head `8ef15a4`) demonstrated eight findings against the original
G1 adapter. Each confirmed case is now a committed regression test in
`src/lib/audit/question-facts-v3.test.ts`:

1. **Sensitive retained/derived text** — the mechanical screen now also covers
   long digit runs (formatted card numbers), Indonesian personal health
   statements, and source-derived Instagram handles, which are screened before
   becoming aliases. The screen remains a conservative boundary, not a
   comprehensive personal-data detector.
2. **Safety restriction preservation** — `projectSafetyRestriction` removes
   forbidden identities from a confirmed restriction, strips a leftover leading
   label fragment, rechecks the residual, and keeps the safe meaning (e.g.
   "jangan mengasumsikan layanan bedah tersedia"). If nothing safe remains the
   slot gets a truthful null, never a silently erased premise.
3. **Website source signals** — every confirmed website source contributes a
   code-owned `identity.sourceSignals` entry (host/path, www stripped) used by
   `forbiddenV3Identities`/`hasForbiddenV3Identity`; source URLs still never
   enter writer context.
4. **Generic product targets** — `identity.targets` now holds branch names
   always and offering/target names only when they carry a distinctive brand
   token, so an ordinary confirmed target such as "Pembersihan AC" stays a
   usable slot-4 offering while "Langganan Kopi Sudut" stays withheld.
5. **Binding coverage** — the canonical fingerprint now includes all official
   sources, comparator source provenance, similar-business provenance,
   unprojected confirmed brief fields, and (through normalized facts) the
   active product target's `detail`, which is retained on `entityScope` and
   kept separate from market context.
6. **Alias correction target** — unsafe legacy `brand_name_variants` entries
   report `identityAliases` → `brand-name-variants`, the existing alias editor
   ID, instead of `brand_name`.
7. **Typed shared access/fulfilment constraints** — `factsContext` accepts an
   optional `accessConstraints` list (R5 §3.2 shared subset), and legacy
   `verified_decision_criteria` entries are additionally shared only when they
   match a bounded access/fulfilment marker vocabulary. Arbitrary criteria keep
   `permission: "legacy-criteria"` and stay in their original slots; nothing
   invents buyer facts.
8. **Slot-9 relation — product decision recorded 2026-09-12** — two confirmed
   comparator names stay separate in `identity.comparators` and
   `facts.comparison` remains `{ kind: "unresolved", name: null }` as honest
   data. Per the founder decision, an **optional comparator designation** will
   be added to the intake (future work on the intake branch — not this
   adapter), and **without a designation slot 9's writer context receives the
   category-alternatives relation** (`alternatif lain di kategori …`), so the
   unresolved state degrades truthfully instead of blocking or inventing a
   target. Competitive role stays sourced from the existing `factsContext`
   `entityType` seam only; the intake keeps it unknown for self-serve until a
   later optional question. `comparison_relation_unresolved` now documents the
   undesignated fact state, not an open policy gap; `competitive_role_unknown`
   remains a genuine limitation. No competitor is selected, joined, or given
   an inferred role, and no required screen was added.

### G2 dormant prototype and frozen evaluation packet — 2026-09-14 (fifth correction)

- Worktree: `/Users/yasir/nuave-worktrees/spec008-g2`; branch
  `codex/spec008-g2-evaluation-freeze`, created from `main@687f340` (the
  post-#59 merge). Fourth correction reviewed at head `05ddc47`; this
  section now describes the fifth corrected candidate returned for
  independent re-review.
- Scope: dormant v3 writer prototype + bounded finalizer/fallback + frozen
  evaluation packet + executable §8.3 decision rules. No route, UI, report,
  config, dispatch, provider, or dependency change. Customer dispatch remains
  v2; nothing in production routes through these modules.
- Fifth correction: the fourth corrected candidate was independently
  re-reviewed (E1/E2) and corrected in place on this branch. The offline
  replay now carries the derivation-emitted `sourceResponseFingerprint` of
  the complete parsed response and must equal the attempt's recorded
  source identity — an identical M selection no longer proves the same
  source — and an attempt that recorded no usable source (explicit null)
  still lands on the shared fallback outcome but earns no replay or
  component credit. The §8.2.5 component gates derive their required
  evidence from the adopted reserve-bearing request contract, so a
  `retainedComponents` declaration that omits or contradicts reserves is
  rejected. `G2_EVALUATION_PACKET.md` is re-frozen at
  `nuave.g2-evaluation-packet.v6`. The F1–F10, R1–R6, and prior T1–T3 and
  T1a–T3 resolutions are preserved.
- Implementation:
  - `src/lib/audit/question-writer-v3.ts` — versioned rich (16 texts incl.
    reserves + dimension/context metadata) and simple (10 final strings,
    canonical order) writer contracts. Candidate `contextRefs`/`dimensionIds`
    are required bounded arrays: explicit empty arrays are valid, missing
    arrays are structural failures, and duplicate/unknown/impermissible
    references are rejected. The market object binds to confirmed facts —
    entity role must match a confirmed role or be `"unknown"`; absence is not
    permission to invent. Includes an offline provider-schema compatibility
    check and explicit evaluation settings pins (`V3_PROPOSED_EVALUATION_SETTINGS`:
    4096 output cap, 60s deadline, zero retries, concurrency one; sampling
    omitted). `V3_OPENCODEGO_TRANSPORT` declares the accepted transport
    contract (Authorization bearer, `application/json`, fresh
    `x-opencode-session` per call, `User-Agent: nuave-audit/1.0`) from the
    same code-owned `opencodeGoTransportHeaders` constants the production
    adapter uses. Transport-independent request builders consume G1's
    `buildV3WriterContext`.
  - `src/lib/audit/question-finalize-v3.ts` — mechanical finalizer: all
    R5 §5 guard pairs under confirmed category/safety context (guarantees,
    superlatives, regulated categories, diagnosis — including `perangkat`
    not exempting human/mixed diagnosis — personal treatment, high-impact
    advice), context-reference resolution against permitted and supplied
    projection fields, valid-only selection with bounded named-slot
    backtracking (each named slot has at most two choices; a later conflict
    can substitute an earlier slot's reviewed fallback), true affected-slot
    identification via a bounded bipartite matching analysis over the
    resolvable subproblem (the slots left unmatched in some maximum matching
    — invalid slots and genuine conflict groups are found in one pass and
    bystanders are never marked), purpose-preserving deterministic fallbacks
    that consume the shared `safetyRestrictions` projection (real occasion
    framing in slot 2 — an already-framed need is kept intact, never
    "Saat Saat", and regulated categories take a plausible ordinary occasion
    that keeps the category noun — role-appropriate offering/use-case
    wording in slot 4, channels as qualifying criteria rather than order
    claims, regulated-category discovery kept administrative — never
    treatment suitability), honest missing-fact outcomes
    (`input_correction_required` when confirmed material is absent;
    `generation_temporarily_unavailable` when material exists but no valid
    pack can be formed), truthful `full_fallback` origins/count, one shared
    full-fallback path after at most one provider call, and a deterministic
    evidence/fingerprint record. P/M/C policies replay under identical
    guards/fallbacks for attribution only.
  - `src/lib/audit/question-eval-g2.ts` — frozen packet structures:
    `G2_PILOT_INPUTS`/`G2_PILOT_SCHEDULE` (§8.1; pilot envelopes alias
    development inputs via `G2_FROZEN_INPUT_MANIFEST.pilotEnvelopeAliases`),
    `G2_RELEASE_INPUTS`/`G2_RELEASE_SCHEDULES`/`G2_HELD_OUT_SCHEDULE` (§8.2),
    the executable frozen-input manifest binding inputId → envelope SHA-256,
    the complete rubric (`G2_UNNAMED_PROPERTY_JUDGMENTS`,
    `G2_RUBRIC_RULES`, `G2_BLINDING` with reviewer sequencing and founder
    adjudication), `G2_RESOURCE_LIMITS`/`G2_USAGE_ACCOUNTING` (dated
    2026-09-13 OpenCode Go usage-allowance rates), `G2_TRANSPORT_OWNERSHIP`,
    the single global `G2_SELECTION_POLICY` ("default"/M), and the decision
    functions `evaluateG2Pilot`, `evaluateG2HeldOutRetention`,
    `evaluateG2Release`, and `g2ExecutionEvidenceDecision` (the dormant
    missing-execution-evidence check). Attempt records bind real
    fingerprints — envelope, facts, pack, and per-text SHA-256 plus the
    frozen selection policy, version pins, per-slot `finalOrigins`, and the
    canonical `requestConfigFingerprint` (frozen request configuration:
    settings, transport contract, instruction/schema/contract versions —
    never credentials) — and attribution rows reconcile exactly to scheduled
    rich captures by input/variant/pass, with every P/M/C claim resolving to
    the captured final texts/origins/fingerprints (missing, duplicate, extra,
    mismatched, or nonexistent-portfolio rows are rejected). Comparison is
    per matched input+pass pair over the six unnamed texts: material win =
    usable rich plus unusable simple or ≥0.5 unnamed-mean advantage; any
    pair-level regression fails the applicable decision; businesses count
    once. The release evaluator requires all 16 selected-v3 packs usable,
    compares mean naturalness across all ten texts per paired input
    (11 actual-v2 attempts across the eight development inputs under rich
    selection, all 16 under simple-by-amendment), enforces
    the §8.2.5 integrated pilot-replay and release-attribution gates, and
    reports selected-v3 resource samples (mean, nearest-rank p95) distinct
    from allocation totals and held-out increments. Usage accounting
    (`nuave.g2-usage-accounting.v2`) prices cached-read and cached-write
    input portions separately — never double-charged — with validated
    nonnegative finite integer counters.
  - `src/lib/audit/question-v3-testkit.ts` — shared test fixtures/helpers:
    confirmed-fact envelopes, judgment/attempt-record builders, pilot
    alias-aware frozen-input hashing, missing-attempt and attribution
    builders.
  - `src/lib/audit/fixtures/g2-evaluation-inputs.json` — 12 minimized
    fictional intake envelopes (D1–D8, H1–H4), each projecting through the
    G1 adapter; pilot inputs alias D1/D3/D5/D8. H1–H4 are fresh v2
    envelopes of the same four approved archetypes: the v1 held-out set
    was retired after its deterministic fallback forms were rendered and
    inspected during correction and independent re-review (exposure record
    in `G2_FROZEN_INPUT_MANIFEST.retiredInputs`, manifest version
    `nuave.g2-frozen-inputs.v2`). No fallback or model output was
    generated, rendered, inspected, or tuned against the fresh envelopes;
    development inputs carry all form tests.
  - `src/lib/audit/questions-id.ts` — behavior-preserving additive seams:
    exported `INDONESIAN_PRIVATE_DATA_PATTERNS`,
    `INDONESIAN_HIGH_IMPACT_ADVICE_PATTERNS`,
    `INDONESIAN_PROVIDER_SAFETY_PATTERNS`, and
    `hasIndonesianComparisonRelationForIdentities`; the original
    `hasIndonesianComparisonRelation` delegates to it unchanged.
  - `src/lib/audit/question-facts-v3.test.ts` — dormancy invariant extended to
    permit the dormant G2 modules as importers while still rejecting runtime
    consumers.
- Frozen packet document:
  [`G2_EVALUATION_PACKET.md`](./G2_EVALUATION_PACKET.md) — case sets, input
  partitions, blinded review procedure and rubric, decision rules,
  provider/settings pins, numeric limits with dated derivation, versions,
  amendment rules. Content hashes recorded in the correction evidence
  directory.
- Tests (offline, synthetic fixtures only):
  - `question-writer-v3.test.ts` — 13 tests: request construction, schema
    malformed/truncated/duplicate/missing-slot/invalid-reference handling,
    required-vs-empty provenance arrays, unknown-role binding, provider-schema
    compatibility, privacy/identity withholding, safety markers.
  - `question-finalize-v3.test.ts` — 51 tests: valid-only selection, P/M/C
    policies, named resolution, bounded named-slot backtracking with
    earlier-slot fallback substitution, matching-based affected-slot
    identification (shared two-option cycles, conflict-plus-invalid-slot
    mixes, bystander preservation), conflict-aware repair, guard pairs
    across categories/scopes, purpose-preserving fallback forms on
    development inputs (occasion framing without marker doubling,
    category-preserving regulated discovery, offering/channel semantics),
    reviewed-override mechanical revalidation, truthful full-fallback and
    failure semantics, deterministic scoring and evidence records.
  - `question-eval-g2.test.ts` — 68 tests: all six §8.3 counterexamples,
    matched-pair comparison semantics (0.5 boundary, unusable/missing simple,
    named-only non-wins, repeat regression), complete record/judgment
    validation, exact fingerprint binding (envelope/facts/pack/text,
    selection policy, version pins), attribution reconciliation
    (missing/duplicate/extra/mismatched/nonexistent-portfolio rows
    rejected), accepted-transport contract assertion against the code-owned
    helper, cached-read/cached-write usage accounting, resource accounting
    (missing/nonfinite/over-limit observations, failures included, sample
    dilution, mean-cost ceiling, held-out vs overall vs selected-v3
    samples), component-attribution exclusions, release-level checks
    (all-16 usable, per-input v2 naturalness comparison, repeat grouping,
    both allocations, §8.2.5 mandatory gates), and the missing-evidence
    policy. The third correction adds variant-scoped rich-attempt binding
    (an interleaved simple record cannot shadow it), exact P/M/C capture
    resolution (texts/origins/pack fingerprints must verify against the
    recorded captures — a rescue requires the recorded P-to-M difference),
    request-configuration fingerprints, and the explicit combined outcome
    (`retain` requires A + complete evidence + retained reserves; A with
    zero component benefit is `amendment_required`, never a silently
    adopted reserves-free request).
- Focused regression: 132 G2 tests plus the surrounding audit/test surface
  (`npx vitest run src/lib/audit tests/` — 949 tests across 69 files) — all
  pass; v2 behavior unchanged.
- Complete change review performed on the full diff: no route/UI/report/
  config/dispatch changes, no provider calls, no temporary diagnostics or
  bypasses.
- Prior-record corrections: the earlier freeze report's "identical final
  tree / exclusively infrastructure cause" wording overstated the evidence —
  the preserved logs show a Turbopack panic followed by passing reruns but
  carry no tree stamps; the current correction's tested tree is recorded
  from `git write-tree`/`rev-parse` on the committed content. Preview
  provenance is also corrected: the PR preview deploys the **PR head**
  checkout, whereas `validate` tests the GitHub-produced merge tree.
- Full gate (second correction): **PASS**, `NUAVE_E2E_PORT=3600 npm run
verify` on the second-corrected candidate — typecheck, formatting and
  typography passed; lint zero errors with the same 17 pre-existing
  warnings; **1212 unit tests across 91 files**; `next build` and
  OpenNext/Cloudflare builds; **89 + 3 + 3 browser tests**; exit 0,
  `Offline verification passed.` The tested tree was recorded via
  `git write-tree` before the run
  (`5db3801ceeb54da8dcd1bebb551e753efe49e908`); the committed head differs
  only by this verification-record fill-in. Complete log and hashes are
  preserved in the `g2-second-correction-evidence/` directory outside Git.
- Full gate (third correction): **PASS**, `NUAVE_E2E_PORT=3600 npm run
verify` on the third-corrected candidate — typecheck, formatting and
  typography passed; lint zero errors with the same 17 pre-existing
  warnings; **1222 unit tests across 91 files**; `next build` and
  OpenNext/Cloudflare builds; **89 + 3 + 3 browser tests**; exit 0,
  `Offline verification passed.` The tested tree was recorded via
  `git write-tree` before the run
  (`2f8978a731efdbb356c29a6b9c574c04d95dd856`); the committed head differs
  only by this verification-record fill-in. Complete log and hashes are
  preserved in the `g2-third-correction-evidence/` directory outside Git.
- Full gate (fourth correction): **PASS**, `NUAVE_E2E_PORT=3600 npm run
verify` on the fourth-corrected candidate — typecheck, formatting and
  typography passed; lint zero errors with the same 17 pre-existing
  warnings; **1234 unit tests across 91 files**; `next build` and
  OpenNext/Cloudflare builds; **89 + 3 + 3 browser tests**; exit 0,
  `Offline verification passed.` The tested tree was recorded via
  `git write-tree` before the run
  (`b4bb9c440cd6065a1908abc4527aa478dcf83d93`); the committed head differs
  only by this verification-record fill-in. Complete log and hashes are
  preserved in the `g2-fourth-correction-evidence/` directory outside Git.
- Decision-rule tests prove decision mechanics only. They use synthetic bad
  examples and assert no empirical quality. Provider feasibility, naturalness
  outcomes, and cost/latency behavior remain unmeasured until the separately
  authorized G2P pilot.

## Verification record

- Result: G1 adapter implemented, offline-verified, revised for the eight
  independent-review findings, independently reviewed on the merged tree
  (2026-09-13, no application defect), then **merged to `main` via PR #59**
  (merge `687f340`, tree `1e0bae2f`) and deployed (worker `nuave-v2` version
  `a2279ec7-109d-4d43-8ecd-026cc669e8a0`); it remains dormant with no runtime
  consumer. **G2 fifth correction offline-verified and published on
  `codex/spec008-g2-evaluation-freeze`** — dormant prototype, frozen packet
  v6, executable decision rules, fresh v2 held-out inputs — after the
  independent fourth re-review (E1/E2); awaiting independent
  re-review/acceptance.
- Date: 2026-09-14
- Base: `687f340343aa5be547d03e7d6fe23a9f5262a2df` (main, post-#59 merge)
- Published head: `bee498d…` (tree `e9e2324…` — identical to the tested
  tree) on draft PR #65; CI results in
  `g2-fifth-correction-evidence/CI-RECORD.md`. Fourth-correction published
  head was `4f8f8d5…` (+docs `05ddc47…`); third-correction published head
  was `dda4a6cd…` (+docs `8bdecf69…`); second-correction published head
  was `28b5343` (+docs `91779de`).
- G2 first-correction gate: **PASS**, `NUAVE_E2E_PORT=3600 npm run verify` —
  1175 unit tests in 91 files, 89+3+3 browser tests, both builds, exit 0,
  `Offline verification passed.` Tested tree
  `20dbe49d4f5e6a659a938e68d68d3c3359ded7eb`; complete log in
  `g2-correction-evidence/` outside Git.
- G2 second-correction gate: **PASS**, `NUAVE_E2E_PORT=3600 npm run
verify` — 1212 unit tests in 91 files, 89+3+3 browser tests, both builds,
  lint 0 errors / 17 baseline warnings, exit 0, `Offline verification
passed.` Tested tree
  `5db3801ceeb54da8dcd1bebb551e753efe49e908`; complete log in
  `g2-second-correction-evidence/` outside Git.
- G2 third-correction gate: **PASS**, `NUAVE_E2E_PORT=3600 npm run verify`
  — 1222 unit tests in 91 files, 89+3+3 browser tests, both builds, lint 0
  errors / 17 baseline warnings, exit 0, `Offline verification passed.`
  Tested tree `2f8978a731efdbb356c29a6b9c574c04d95dd856`; complete log in
  `g2-third-correction-evidence/` outside Git.
- G2 fourth-correction gate: **PASS**, `NUAVE_E2E_PORT=3600 npm run verify`
  — 1234 unit tests in 91 files, 89+3+3 browser tests, both builds, lint 0
  errors / 17 baseline warnings, exit 0, `Offline verification passed.`
  Tested tree `b4bb9c440cd6065a1908abc4527aa478dcf83d93`; complete log in
  `g2-fourth-correction-evidence/` outside Git.
- G2 fifth-correction gate: **PASS**, `NUAVE_E2E_PORT=3600 npm run verify`
  — 1237 unit tests in 91 files, 89+3+3 browser tests, both builds, lint 0
  errors / 17 baseline warnings, exit 0, `Offline verification passed.`
  Tested tree `e9e232496f1f01468f689a9bbd847450174cfa33` (recorded via
  `git write-tree` before the run; committed code tree identical);
  complete log in `g2-fifth-correction-evidence/` outside Git.
- Next: independent G2 acceptance review, then a separately authorized G2P
  pilot. G3–G5 plumbing and any v3 activation remain unauthorized; customer
  dispatch stays v2.

## Files changed in this G1 branch (vs `main`)

- `src/lib/audit/question-facts-v3.ts`
- `src/lib/audit/question-context-v3.ts`
- `src/lib/audit/question-facts-v3.test.ts`
- `src/lib/audit/fixtures/intake-g1-snapshots.json`
- `tests/spec008-review-port.test.ts` (review-preserved port/env check)
- `tests/g1-intake-compatibility.test.ts` (reviewed serializer checks, retained)
- `docs/NOW.md`
- `docs/DECISION_LOG.md` (review-fix round: slot-9 relation and role decision)
- `specs/008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`
- `specs/008-recommendation-eligible-question-generation/VERIFICATION.md`
