# G1 accepted-intake boundary review

> Observation: 2026-09-12. Code inspected at `5821d2f` on
> `codex/complete-local-intake`; founder accepted the local logic, layout and flow.
> Outcome: mapping review complete; G1 implementation and verification remain open.

This is supporting evidence for [R5 §§3 and 7](./NUAVE_SPEC_008_IMPLEMENTATION_PLAN_R5.md),
not another execution plan or a new product specification. R5 owns the gates.
G0's historical baseline predates the accepted intake; preserve that evidence.

## Finding

The accepted local journey freezes confirmed meaning in `FrozenLocalIntake`
(`src/lib/intake/local-questions.ts`). It does not submit a `BusinessBrief`.
`POST /api/audit/prompts` currently parses only `{ brief: businessBriefSchema }`
and invokes the existing live writer. The accepted preview never calls it.
Its `generationInputOf` is a local legacy-validator projection, not the v3
facts adapter required by R5. Sending that projection directly would discard
structured scope, channels and comparator distinctions.

The existing `BusinessBrief` schema requires `brand_type`, `target_customer`,
nonempty needs and decision criteria. The accepted screens do not collect all
of those as required answers. Do not manufacture them or make optional reasons
mandatory to get through that parser.

## Confirmed-source mapping

Paths below are relative to `FrozenLocalIntake.confirmed`. Legacy fields refer
to `src/lib/audit/types.ts`. Destination meanings come from R5 §3.1, not a new
wire schema decided by this review.

| Accepted input | Legacy representation / gap | G1 obligation |
| --- | --- | --- |
| `brand.name`, `brand.primarySource` | `brand_name`, `official_sources` | Keep identity for guards. Source URLs stay outside writer input/captures. Never read removed alias controls back into the UI. |
| `scope`, `target.name`, `target.detail` | `entity_scope` is text | Preserve separate structured scope and exact branch/product target; retain branch address separately from market reach. |
| `category` | `category`; required `brand_type` has no equivalent | Preserve category. Do not infer a confirmed retailer/provider/product role from a label alone; represent unknown/conflict for sufficiency checks. |
| `offerings`; product `target.name` | `verified_offerings` requires at least one | Product target owns its offering; inactive general offerings stay excluded. Keep proprietary identity out of unnamed realization. |
| `customerReasons` | `verified_customer_needs`, `target_customer`, `verified_decision_criteria` all require content | Preserve optional absence. Reasons are not automatically demographics or decision criteria. Do not duplicate them into unrelated required fields. |
| `serviceChannels[].channel` | No structured legacy field | Preserve every approved channel: `on_premise`, `on_customer`, `delivery`, `online`. Do not infer geography or physical premises from channel alone. |
| `market.reach`, `market.areas` | `market_context` is text | Preserve reach and areas separately. Whole-country/international selection excludes stale areas. Missing area is unknown. |
| `comparators.mode`, `comparators.names` | One `verified_competitor` plus optional `similar_businesses` | Preserve all named identities for exclusion guards. Do not silently choose the first or treat joined names as one verified business. Keep category-alternative mode distinct. |
| `publicFact` | `customer_supplied_facts` / `usp` | A confirmed free-text value is not automatically safe writer input. Minimize under existing privacy/premise guards; exclude unsafe content and never use it as an arbitrary fallback fragment. |
| `factVersion`, `fingerprint` outside `confirmed` | No equivalent on the brief | Bind adapter output to facts revision and request identity; stale response rejection must be testable. |
| `reviewRows` | UI presentation only | Exclude from writer context. The local fingerprint serializes values and is not an anonymized identifier; never put it in logs, telemetry or URLs. |

## Bounded implementation handoff

Objective: implement dormant G1 parsing/projection and sufficiency checks for
both the actual legacy brief and the accepted confirmed snapshot, deriving one
context-permission map from R5 §3.2. Keep runtime generation dispatch unchanged.

Read `AGENTS.md`, repository entry points and workflow, R5 in full, this review,
then `src/lib/intake/local-questions.ts`, `state.ts`, the approved September 5
experience handoff, `src/lib/audit/types.ts`, `measurement-matrix.ts`,
`questions-id.ts`, and the prompts route. Read only relevant additional guards
and fixtures discovered from those files. Do not use archived contracts to
reverse the accepted optionality or multi-select behavior.

Before implementation, fetch current main and create a dedicated branch from
it. Check whether the accepted intake commit has landed; if not, use its
committed snapshot as a read-only adapter fixture/reference rather than silently
merging it or duplicating its UI on main. Preserve both existing worktrees.

Scope: ordinary dormant audit-generation modules and focused tests; the
smallest optional facts-schema seam if necessary; R5 ledger and verification
index once actual evidence exists. No React state imports into generation.
Do not wire client requests, replace the production parser, relax legacy
validation, alter measurement metadata, or change observation/report behavior
as part of G1. Those integrations belong to later R5 gates.

## Required offline evidence

- Parse actual serialized input, not only statically typed objects. Preserve
  each scope, exact target, multiple channels, optional empty reasons, named
  comparators, category-alternative mode, reach and active areas.
- Show missing geography/channels/role remains unknown. Show conflicting scope
  and role yields a demonstrable correction need, without a fabricated default.
- Test correction ownership against actual screen IDs: scope, category,
  branch/product, offerings, customers, service, market, competitors and facts.
  If a required correction has no existing owner, record that mismatch rather
  than adding an unapproved required screen.
- Test R5's slot 2 locality/channel and slot 3 approved-need permissions;
  derive permissions from one versioned map and retain identity denials.
- Exclude contact/payment data, source-only URLs, UI labels/rows, unsafe free
  text and raw source content from writer projections and diagnostic captures.
- Keep the full comparator registry separate from the slot-9 relation. If the
  existing relation contract cannot express the accepted multi-name selection,
  return that concrete contract conflict before choosing a new relation policy.
- Preserve revision/request binding, and test changed facts versus unchanged
  policy as distinct events. G1 tests the dormant contract; it does not claim
  browser race or restoration integration already works.
- Prove existing v2 parsing/generation behavior and matrix/report metadata are
  unchanged. Run `npm run verify` offline before declaring the implementation
  ready. No live provider call, merge, deployment, commit or push is implied.

## Review limits and next action

This review inspected local code and the approved R5 ledger; it did not run
providers, validate a real report, or implement the adapter. It identifies the
first dependency-ready technical backlog item without skipping G2/G2P before
G3–G5. Next: implement the dormant G1 adapter and its parsing/projection tests;
resolve only concrete missing correction/relationship decisions if encountered.
