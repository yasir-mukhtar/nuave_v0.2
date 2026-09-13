# Spec 008 — verification and evidence index

> Status: G0 recorded in R5; the G1 adapter is implemented, independently
> reviewed (2026-09-13), and published on draft PR #59 for the founder's
> integration decision. Final offline verification result is recorded below;
> no G1 merge, route integration, or release is claimed.
> Index owner:
> [`NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`](./NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md)
> §9–§10 (execution ledger and acceptance evidence index).

This file is the single evidence index required by R5 §9. It records adoption
provenance now and will link concrete evidence per gate as work lands.

## Adoption provenance

| Artifact | Role | Source SHA-256 |
| --- | --- | --- |
| `NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md` | Sole current implementation/execution authority for Spec 008 | `6fa504d8e7e9e8b0985cebbb77556fd51b56c3eca9fc36a7a320ad8dd3338f44` |
| `NUAVE_SPEC_008_ADVERSARIAL_REVIEW_5.md` | Final adversarial review of R5; verdict "proceed to G0–G2P, no broad R6 rewrite" | `6fecf01f95bf824957e2e723f2259063c188145a762a5bbcacaa3fd51186f62c` |

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

## Verification record

- Result: G1 adapter implemented and offline-verified, revised for the eight
  independent-review findings above, then independently reviewed on the merged
  tree on 2026-09-13 with no application defect found. The founder authorized
  preparing, committing, and pushing the merged result on draft PR #59; merge,
  route integration, and release remain pending and are not claimed here.
- Date: 2026-09-13
- Base: `ac3cc50a822b9901bfcafddf7ccf3f188553c5f9` (main, post-#58)
- Published head: recorded on PR #59 after push.
- Preparation gate: **PASS**, `NUAVE_E2E_PORT=3500 npm run verify`
  (1089 unit tests in 88 files, 89+3+3 browser tests, both builds; complete
  log in the preparation evidence directory outside Git).
- Next: the founder's integration decision on #59, then G2's offline
  evaluation freeze. G2/G2P retain R5's sequence and authorization gates; no
  G3–G5 plumbing or v3 activation is authorized by G1.

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
