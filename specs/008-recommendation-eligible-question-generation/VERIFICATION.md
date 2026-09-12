# Spec 008 — verification and evidence index

> Status: G0 recorded in R5; G1 adapter implemented in a dedicated working tree.
> Final offline verification result is recorded below; no G1 merge or release is claimed.
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

- Worktree: `/private/tmp/nuave-spec008-g1`; branch
  `codex/spec008-g1-adapter`, from refreshed `origin/main@505ccd4`.
- The accepted intake is separately committed/pushed at `5821d2f` on
  `codex/complete-local-intake`, not merged into this baseline. Its source was
  read without importing its UI or changing that worktree.
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
  full gate can use 3300 without stopping the unrelated existing service.

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

- Focused offline suite: 44 tests passed after final parsing/correction fixes.
- Final gate: **PASS**, `NUAVE_E2E_PORT=3300 npm run verify`.
  Typecheck, formatting and typography passed; 880 unit tests across 73 files;
  both Next and OpenNext/Cloudflare builds; 84 browser tests (79 primary,
  three forced-failure, two preview-disabled). Lint: zero errors, 17 existing
  warnings. Log: `/private/tmp/nuave-spec008-g1-verify-final.log`, ending
  `Offline verification passed.` This final rerun includes the last legacy
  source-correction regression. The earlier passing run is not substituted for it.
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

## Verification record

- Result: G1 adapter implemented and offline-verified locally. Founder subsequently
  authorized commit and push of this branch; merge and release remain pending.
- Date: 2026-09-12
- Working-tree base: `505ccd49ce857e8726bf85e796edf10f5738878c`
- Next: review G1 evidence and resolve concrete role/comparison contract gaps
  before affected downstream integration. G2/G2P retain R5's sequence and
  authorization gates; no G3–G5 plumbing or v3 activation is authorized by G1.

## Files changed in this G1 worktree

- `src/lib/audit/question-facts-v3.ts`
- `src/lib/audit/question-context-v3.ts`
- `src/lib/audit/question-facts-v3.test.ts`
- `src/lib/audit/fixtures/intake-g1-snapshots.json`
- `playwright.config.ts`
- `docs/NOW.md`
- `specs/008-recommendation-eligible-question-generation/NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md`
- `specs/008-recommendation-eligible-question-generation/VERIFICATION.md`
