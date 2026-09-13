# G2 evaluation packet — frozen offline (2026-09-13)

Status: **frozen for independent review**. This packet is the versioned
evaluation contract required by R5 §8. It is offline-only: it authorizes no
provider call, merge, production activation, or G2P/G3–G5 work. Every number
below is a proposed limit for later authorization, not a grant to spend and
not measured performance. Exact fallback wording and evaluation examples
remain subject to independent review before G2 acceptance.

Code-owned authority: `src/lib/audit/question-eval-g2.ts`
(`nuave.g2-evaluation-packet.v1`, decision policy
`nuave.g2-decision-policy.v1`, rubric `nuave.g2-review-rubric.v1`). Where
this document and that module disagree, the module is the executable record.

## 1. Case sets and input partitions

### §8.1 G2P pilot (at most 10 primary provider calls)

Four sufficient fictional inputs plus the predeclared repeat, frozen as
`G2_PILOT_INPUTS` / `G2_PILOT_SCHEDULE`:

| Input | Frozen brief | Repeat |
| --- | --- | --- |
| G2P-AC | local AC service with approved home visits | yes — second attempt on both variants |
| G2P-RETAIL | multi-brand laptop retailer | no |
| G2P-B2B | B2B SaaS | no |
| G2P-SPARSE | sparse sufficient consumer-product scope | no |

Schedule (predeclared interleaving, per input rich then simple, repeat pair
last): `G2_PILOT_SCHEDULE.requestOrder` — 5 rich + 5 simple = **10 primary
calls, the hard cap**. No structural-rerun headroom exists inside §8.1; a
structurally invalid pack is itself the recorded outcome. Pilot inputs are
tuning/dev evidence only — never held-out evidence.

The minimized fictional intake inputs are prepared at G2P from these frozen
briefs (privacy-safe, no external findings). The existing G1 fixture
`src/lib/audit/fixtures/intake-g1-snapshots.json` (3 fictional snapshots)
may exercise request construction offline but is not a §8.1 pilot input.

### §8.2 G6 release allocation (at most 32 new primary calls)

Frozen as `G2_RELEASE_INPUTS` / `G2_RELEASE_ALLOCATION`:

- Development D1–D8: local AC; venue/café; multi-brand retail; consumer
  product/brand; B2B/SaaS; professional service; safe regulated discovery;
  sparse sufficient scope.
- Held out H1–H4: one location of a multi-location service; retail with
  limited fulfilment/reach; remote B2B/professional; different regulated
  category with sparse sufficient facts.
- Repeats chosen before output: second attempts for D1, D3, D5, H1.

Call allocation (either approved contract outcome): rich selected → 16
selected-v3 + 11 actual-v2 + 5 new simple-control = **32 new calls**;
simple adopted by amendment → 16 selected-v3 + 16 actual-v2 + 0 = **32**.
Every attempted provider request counts; exactly one structural rerun of a
generated pack is allowed as an attempt (it consumes the allocation). Prior
captures replace scheduled calls only on exact
input/provider/settings/instruction/schema/request-version matches with
complete attempt history; previously viewed captures never replace fresh
held-out evidence. Reuse/exclusion: pilot inputs are never held out;
changing instructions/schema/fallback/selector after seeing H outputs
retires those inputs from held-out status.

## 2. Blinded review procedure

Frozen as `G2_BLINDING`, `G2_NATURALNESS_SCALE`, `G2_RUBRIC_RULES`.

- Unit: one input, two anonymized packs (A/B) per input.
- Assignment: per-input coin flip by the evaluation operator before review;
  the writer/implementer never judges its own final quality. The founder or
  orchestrator arranges independent reviewers at G2P/G6; this packet does
  not assign individuals and spends no reviewer-model calls.
- Reviewer sees: the confirmed business projection both variants used, plus
  the ten final texts per pack, in canonical slot order.
- Reviewer never sees: variant labels, request/response metadata, market
  dimensions, contextRefs, guard outcomes, costs, latency.
- Independent text judgments are stored separately from writer hints
  (choice/dimensionIds/contextRefs).
- Per text: naturalness 0–3 (0 implausible, 1 needs rewriting, 2 plausible
  with minor issues, 3 natural/clear), standalone-request flag,
  input-adherence flag. A question mark is **not** required; an equivalent
  direct request scores identically (§5.1 compatible-008 form).
- Per pack: distinct-consumer-decision count among the six unnamed texts,
  implicit-recommendation-opportunity presence, named-purpose intactness,
  and one A-better / B-better / indistinguishable preference judgment.
- Missing pack: all ten texts score invalid. Truncated or structurally
  invalid structured responses count as serialization failures, not usable
  packs. Fallback texts are reviewed as texts but never count as successful
  serialization.

Usable pack (all conditions, `G2_USABLE_PACK`): mechanical/identity/slot/
purpose/safety validity; ≥6 materially distinct consumer decisions among
unnamed texts; every text naturalness ≥2; named purposes intact; ≥1 unnamed
text with an implicit recommendation opportunity.

Material gain vs label-only change (frozen examples,
`G2_RUBRIC_RULES.materialGainExample` / `.labelOnlyExample`): a materially
different consumer decision or wording on a mechanically valid M text earns
credit; a changed dimension label/ID on the same final wording earns none.
No synthetic example counts as an empirical win.

## 3. Decision rules

### §8.1 Decision A — whole contract (`evaluateG2Pilot`)

Retain the fixed rich variant only if all hold:

1. All five scheduled rich structured responses parse complete, without
   truncation (`serializationComplete`).
2. All five attempts produce usable packs under bounded recovery.
3. Material wins on ≥2 **distinct** pilot businesses under the frozen
   comparison rule: pooled per-business rich minus simple mean naturalness
   ≥ 0.3, both packs usable. Two attempts on one business count once.
4. All absolute and incremental resource ceilings pass (§4 below).

If quality and usable-pack reliability tie, choose simple for amendment; if
both are inadequate, stop. Ties never retain complexity.

### §8.1 Decision B — components

- Reserves retained iff ≥1 M→P mechanical rescue/avoided fallback with no
  M-caused final-text regression (P/M/C derived offline from each rich
  response under identical guards/fallbacks).
- Coverage retained iff ≥1 independently reviewed material consumer-decision
  or wording gain in C−M on a mechanically valid M, with no C-caused
  regression. Mechanical-only rescue cannot justify coverage; label-only
  changes earn nothing.

### §8.2 held-out retention (`evaluateG2HeldOutRetention`)

For rich to survive release review on the H1–H4 + H1-repeat pairs:

- ≥2 distinct held-out businesses with material wins (delta ≥ 0.3, both
  packs usable; H1's repeat is the same business).
- Zero pair-level naturalness regressions (pooled simple > pooled rich).
- No selected text may carry a flagged safety/privacy/identity issue
  (structurally impossible; re-verified mechanically).
- Incremental ceilings: rich mean cost ≤ 2.0× simple; rich mean latency
  ≤ 1.5× simple.

Release additionally requires (frozen in §8.2, enforced at G6): all 16
selected-v3 attempts usable; ≥15/16 structurally complete; ≥14/16 packs
with ≥5 model-written unnamed texts; ≤2 full-fallback packs; the v2
naturalness no-worse comparison on the paired inputs; nearest-rank p95
(`ceil(0.95 × n)`) latency reporting; replayed P/M/C attribution with ≥1
relevant observed benefit and no component-caused regression when rich is
retained.

### Frozen counterexamples (executable, `question-eval-g2.test.ts`)

All six §8.3 rows are executable rule tests: self-rescue vs simple tie;
metadata-only coverage; pilot wins vs failed held-out; H1 counted once;
direct-request equivalence; missing provenance. They prove decision
mechanics only — no empirical performance is claimed.

## 4. Provider, settings, and numerical limits

Production method preserved and confirmed from source (`opencodego.ts`,
`questions-id-provider.ts`): OpenCode Go `https://opencode.ai/zen/go/v1`
`/responses`, model `gpt-5.6-luna` (`OPENAI_AUDIT_MODEL`/`AUDIT_MODEL`),
reasoning `low`, no search, `store:false`, `service_tier:default`,
JSON-schema strict. Live v2 output cap is
`INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS = 2048`; the inspected fetch has no
per-request timeout.

Evaluation settings (`V3_PROPOSED_EVALUATION_SETTINGS`, identical for rich
and simple): same endpoint/model/reasoning/store/tier/no-search; strict
JSON-schema; **`maxOutputTokens 4096`** — raised above the live 2048 cap for
evaluation only so the 16-text rich contract is not structurally truncated
and simple truncation stays observable under an equal cap; live defaults
unchanged; **`timeoutMs 60000`** — an evaluation-side bound the v2 fetch
lacks; `retries 0`; `concurrency 1`.

Resource limits (`G2_RESOURCE_LIMITS`, proposed):

| Limit | Value | Derivation |
| --- | --- | --- |
| Per-attempt output cap | 4,096 tokens | equal rich/simple cap (above) |
| Per-attempt timeout | 60,000 ms | evaluation-side bound; p95 ceiling |
| Per-attempt est. max tokens | 6,500 | ~2,000 in + 4,096 out + margin |
| Assumed blended rate | USD 25/1M tokens | **labelled assumption**, not a measured price; re-check the actual OpenCode Go invoice basis at G2P before spend |
| Per-attempt cost ceiling | USD 0.20 | 6,500 × $25/1M = $0.1625, rounded up |
| §8.1 total cost ceiling | USD 2.50 | 10 calls × $0.20 + rerun headroom |
| §8.2 new-calls ceiling | USD 7.00 | 32 calls × $0.20 = $6.40, rounded up |
| Mean latency ceiling | 30,000 ms | absolute bound, both variants |
| p95 latency ceiling | 60,000 ms | = per-attempt timeout; nearest-rank |
| Rich-vs-simple incremental | cost ≤ 2.0×, latency ≤ 1.5× | mean over completed attempts |
| Automatic retries | 0 | every attempt counts |

## 5. Versions and hashes

Pinned versions (`G2_VERSION_PINS` plus request versions): writer contract
`nuave.question-writer.v3.1`; rich instruction
`nuave.question-writer-instruction.v3.1-rich`; simple instruction
`nuave.question-writer-instruction.v3.1-simple`; schemas
`nuave.question-schema.v3.1-rich/-simple`; projection
`nuave.question-facts.v3.1`; context `nuave.question-context.v3.1`; guard
policy `compatible-008`; selector `nuave.question-selector.v3.1`; fallback
`nuave.question-fallback.v3.1`; finalizer `nuave.question-finalizer.v3.1`;
evidence `nuave.question-evidence.v3`; packet/decision/rubric versions
above.

Content hashes of the frozen packet file and the versioned modules are
recorded in the G2 report evidence directory — hashes cover stable file
content, not commit IDs.

## 6. Amendment and re-evaluation rules

Configuration changes require bounded, versioned re-evaluation. Removing
reserves changes the provider request — a replay that merely ignores them
cannot establish feasibility of the revised request. R-10/R-16 amendments
and revised-request feasibility remain G2P decisions, not adopted here. No
per-business selector choice, post-hoc threshold, hidden retry, or manual
output repair. Ties favor simplicity.
