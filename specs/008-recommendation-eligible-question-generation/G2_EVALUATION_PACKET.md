# G2 evaluation packet — frozen offline (2026-09-13, corrected)

Status: **corrected and re-frozen for independent re-review**. This packet is
the versioned evaluation contract required by R5 §8. It is offline-only: it
authorizes no provider call, merge, production activation, or G2P/G3–G5 work.
Every number below is a proposed limit for later authorization, not a grant to
spend and not measured performance. Exact fallback wording and evaluation
examples remain subject to independent review before G2 acceptance.

This revision corrects the returned candidate against the independent review
(F1–F10): the comparison rule, complete-evidence validation, resource
accounting, executable input freeze, strict generation shape, component
attribution, recovery semantics, guard pairs, and fallback forms now match the
approved R5 clauses instead of approximating them.

Code-owned authority: `src/lib/audit/question-eval-g2.ts`
(`nuave.g2-evaluation-packet.v2`, decision policy
`nuave.g2-decision-policy.v2`, rubric `nuave.g2-review-rubric.v2`, frozen
inputs `nuave.g2-frozen-inputs.v1`, usage accounting
`nuave.g2-usage-accounting.v1`). Where this document and that module disagree,
the module is the executable record.

## 1. Case sets and input partitions

All frozen inputs are committed, executable envelopes in
`src/lib/audit/fixtures/g2-evaluation-inputs.json` (12 minimized fictional
intake envelopes). Each envelope parses through the G1 projection
(`parseQuestionFactsV3`) and is bound to evaluations by SHA-256 fingerprint of
its canonical JSON — the manifest (`G2_FROZEN_INPUT_MANIFEST`) maps inputId →
expected fingerprint, and every attempt record must name the fingerprint it
ran against. Mismatched, missing, or unknown input references fail validation.

### §8.1 G2P pilot (at most 10 primary provider calls)

Four pilot identities plus the predeclared repeat, frozen as
`G2_PILOT_INPUTS` / `G2_PILOT_SCHEDULE`:

| Pilot input | Envelope alias | Repeat |
| --- | --- | --- |
| G2P-AC | D1 (local AC service) | yes — second attempt on both variants |
| G2P-RETAIL | D3 (multi-brand laptop retailer) | no |
| G2P-B2B | D5 (B2B SaaS) | no |
| G2P-SPARSE | D8 (sparse sufficient consumer-product scope) | no |

Pilot/development overlap is intentional and frozen
(`G2_FROZEN_INPUT_MANIFEST.pilotEnvelopeAliases`): the pilot reuses the
development envelopes so the same bytes exercise both gates. H1–H4 are held
apart from all pilot/tuning outputs.

Schedule (predeclared interleaved order, per input rich then simple, repeat
pair last): `G2_PILOT_SCHEDULE.requestOrder` — 5 rich + 5 simple = **10
primary calls, the hard cap**. No structural-rerun headroom exists inside
§8.1; a structurally invalid pack is itself the recorded outcome.

The one global rich selection policy supplying Decision A is frozen as
`G2_SELECTION_POLICY = "default"` (M — the mechanical selector). P/M/C
attribution is replayed for evidence only; it is never a per-business
selector choice, and every attempt record must bind the policy it ran under.

### §8.2 G6 release allocation (at most 32 new primary calls)

Frozen as `G2_RELEASE_INPUTS` / `G2_RELEASE_SCHEDULES`:

- Development D1–D8: local AC; venue/café; multi-brand retail; consumer
  product/brand; B2B/SaaS; professional service; safe regulated discovery;
  sparse sufficient scope.
- Held out H1–H4: one location of a multi-location service; retail with
  limited fulfilment/reach; remote B2B/professional; different regulated
  category with sparse sufficient facts.
- Repeats chosen before output: second attempts for D1, D3, D5, H1.
- Full interleaved request order is frozen per allocation
  (`schedule.requestOrder`), rich before simple per input, repeats last.

Call allocation (either approved contract outcome): rich selected → 16
selected-v3 + 11 actual-v2 + 5 new simple-control = **32 new calls**; simple
adopted by amendment → 16 selected-v3 + 16 actual-v2 + 0 = **32**. Every
attempted provider request counts. Prior captures replace scheduled calls
only on exact input/provider/settings/instruction/schema/request-version
matches with complete attempt history; previously viewed captures never
replace fresh held-out evidence. Reuse/exclusion: pilot inputs are never
held out; changing instructions/schema/fallback/selector after seeing H
outputs retires those inputs from held-out status.

## 2. Blinded review procedure and rubric

Frozen as `G2_BLINDING`, `G2_NATURALNESS_SCALE`,
`G2_UNNAMED_PROPERTY_JUDGMENTS`, `G2_RUBRIC_RULES`.

- Unit: one input, two anonymized packs (A/B) per input.
- Assignment: per-input coin flip by the evaluation operator before review;
  the writer/implementer never judges its own final quality. The founder or
  orchestrator arranges independent reviewers at G2P/G6; this packet does
  not assign individuals and spends no reviewer-model calls.
- Reviewer sees: the confirmed business projection both variants used, plus
  the ten final texts per pack, in canonical slot order.
- Reviewer never sees: variant labels, request/response metadata, market
  dimensions, contextRefs, guard outcomes, costs, latency.
- Sequencing (frozen): the independent reviewer judges every §2.1 property
  and the naturalness score for each text **before** any pack-level
  preference; the founder adjudicates disagreements. Writer hints
  (choice/dimensionIds/contextRefs) stay separate from independent text
  judgments.
- Per text: naturalness 0–3 (0 implausible, 1 needs rewriting, 2 plausible
  with minor issues, 3 natural/clear) plus the six frozen §2.1 property
  judgments for every unnamed text — `commercialChoice`, `entityDemand`,
  `roleScopeFit`, `fairOpenness`, `singleUnderstandableRequest`,
  `criteriaDiscipline` — and an input-adherence flag. A question mark is
  **not** required; an equivalent direct request scores identically (§5.1
  compatible-008 form).
- Per pack: distinct-consumer-decision count among the six unnamed texts,
  implicit-recommendation-opportunity presence, named-purpose intactness,
  and one A-better / B-better / indistinguishable preference judgment.
- Missing pack: all ten texts score zero and the pack is unusable. Truncated
  or structurally invalid structured responses count as serialization
  failures, not usable packs. Fallback texts are reviewed as texts but never
  count as successful serialization.

Canonical judgment records (`G2JudgmentRecord`): every scheduled attempt
carries exactly the ten canonical judgment IDs in order
(`NUAVE-BRAND-NEED-01` … `NUAVE-BRAND-ACTION-02`), each bound to the exact
text and facts the reviewer saw. Duplicate, extra, missing, out-of-order, or
mismatched-pair judgments fail validation; unknown or invalid required
judgments fail validation. Scores are bounded to the frozen 0–3 integer
scale.

Usable pack (all conditions, `G2_USABLE_PACK`): mechanical/identity/slot/
purpose/safety validity; all six §2.1 property judgments true on every
unnamed text; ≥6 materially distinct consumer decisions among unnamed
texts; every text naturalness ≥2; named purposes intact; ≥1 unnamed text
with an implicit recommendation opportunity.

Material gain vs label-only change (frozen examples,
`G2_RUBRIC_RULES.materialGainExample` / `.labelOnlyExample`): a materially
different consumer decision or wording on a mechanically valid M text earns
credit; a changed dimension label/ID on the same final wording earns none.
No synthetic example counts as an empirical win.

## 3. Decision rules

### §8.1 Decision A — whole contract (`evaluateG2Pilot`)

Retain the fixed rich variant only if all hold:

1. All five scheduled rich structured responses parse complete, without
   truncation (`serializationComplete` on the attempt record).
2. All five scheduled rich attempts produce usable packs under bounded
   recovery.
3. Material wins on ≥2 **distinct** pilot businesses under the frozen
   comparison rule, and **no matched-attempt naturalness regression
   anywhere** in the pilot schedule.
4. All absolute and incremental resource ceilings pass (§4 below), computed
   from complete attempt records.

Matched-pair comparison (`comparePair`, per input+pass, six unnamed texts
only):

- A material win requires a usable rich pack **and** either an unusable
  simple pack, or an unnamed-mean naturalness advantage ≥ **0.5** with all
  required pack properties intact. Named-text quality cannot supply a
  rich/simple win; it belongs to pack usability and the separate all-ten
  v2 comparison.
- A pair regresses when the simple unnamed mean exceeds the rich unnamed
  mean. Any regression fails the applicable decision.
- A business counts once when at least one of its attempt pairs wins and no
  pair regresses. A regressing repeat removes the business.
- Missing final output scores zero and is unusable; defective available
  output is scored honestly. Ties favor simple.

If quality and usable-pack reliability tie, choose simple for amendment; if
both are inadequate, stop. Ties never retain complexity.

### §8.1 Decision B — components

- Reserves retained iff ≥1 M→P mechanical rescue/avoided fallback **or** an
  independently justified C−M benefit, each with no component-caused
  final-text regression (P/M/C replayed offline from each rich response
  under identical guards/fallbacks, bound to the exact attempt and one fixed
  candidate variant).
- Coverage retained iff ≥1 independently reviewed material consumer-decision
  or wording gain in C−M on a mechanically valid M, with no C-caused
  regression. Mechanical-only rescue cannot justify coverage; label-only
  changes earn nothing; reserve-only rescue does not earn coverage.

### §8.2 held-out retention (`evaluateG2HeldOutRetention`)

For rich to survive release review on the H1–H4 + H1-repeat pairs:

- ≥2 distinct held-out businesses with material wins (same frozen
  comparison rule; H1's repeat is the same business and counts once).
- Zero pair-level naturalness regressions across every matched pair.
- All scheduled held-out rich packs usable.
- No selected text may carry a flagged safety/privacy/identity issue
  (structurally impossible; re-verified mechanically).
- Incremental ceilings on the held-out matched pairs: rich mean
  usage-accounted cost ≤ 2.0× simple; rich mean latency ≤ 1.5× simple.

Release-level checks (`evaluateG2Release`, enforced at G6 over the complete
allocation's attempt records): all 16 selected-v3 attempts' contribution
thresholds — ≥15/16 structurally complete, ≥14/16 packs with ≥5
model-written unnamed texts, ≤2 full-fallback packs — plus absolute
resource limits over **all** attempts in the allocation (failures, timeouts,
and fallback latency included), the v2 naturalness no-worse comparison on
paired inputs, and nearest-rank p95 latency reporting. Overall release
selected-v3 metrics stay distinct from held-out matched increments.

### Missing-evidence policy

`evaluateG2EvidencePolicy` is the dormant decision-policy check for absent
execution evidence: runtime semantics stay `not_evaluated` unless the
required attempt records exist; missing evidence never relaxes a structural
or numerical requirement. This is a policy check only — it does not weaken
generation and does not implement wire transport.

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

Transport ownership pins (`G2_TRANSPORT_OWNERSHIP`, declared so a later
operator need not invent them): the evaluation transport owns the 60s
AbortSignal; no SDK/transport retries — a failed attempt is the recorded
outcome and a manual re-attempt is a new scheduled attempt; temperature/top_p
are omitted (provider defaults apply); Authorization bearer only, no
session-affinity headers. These constants declare the contract; they do not
themselves enforce transport behavior.

Usage accounting (`G2_USAGE_ACCOUNTING`, observed 2026-09-13 from the
official OpenCode Go usage-limits documentation,
`https://opencode.ai/v2/docs/console/go`, GPT 5.6 Luna ≤272K-token tier):
$0.20/1M input, $0.02/1M cached-read, $0.25/1M cached-write, $1.20/1M
output. These are **subscription usage-allowance** dollars — Go bills a
fixed subscription and these values measure allowance consumption, not cash
spend. Any balance-fallback spending is an account setting this packet
neither infers nor changes.

Resource limits (`G2_RESOURCE_LIMITS`, proposed; computed from complete
attempt records — missing or nonfinite required telemetry cannot pass):

| Limit | Value | Derivation |
| --- | --- | --- |
| Per-attempt output cap | 4,096 tokens | equal rich/simple cap (above) |
| Per-attempt timeout | 60,000 ms | evaluation-side bound; equals the p95 ceiling |
| Serialized request bound | 28,000 chars | complete instruction + projected writer context + schema for the largest frozen input measures well under this |
| Estimated input bound | 12,000 tokens | 28,000 chars ÷ conservative 2.5 chars/token = 11,200 → frozen at 12,000 |
| Per-attempt usage ceiling | $0.02 | 12,000×$0.20 + 4,096×$1.20 per 1M ≈ $0.0073 → ≈2.7× headroom |
| §8.1 total usage ceiling | $0.20 | 10 calls × $0.02 |
| §8.2 new-calls usage ceiling | $0.64 | 32 calls × $0.02 |
| Mean latency ceiling | 30,000 ms | absolute bound, both variants |
| p95 latency ceiling | 60,000 ms | = per-attempt timeout; nearest-rank `ceil(0.95·n)` |
| Rich-vs-simple incremental | cost ≤ 2.0×, latency ≤ 1.5× | means over completed held-out matched pairs |
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
evidence `nuave.question-evidence.v3`; packet/decision/rubric/frozen-input/
usage-accounting versions above.

Content hashes of the frozen packet file, the frozen input fixture, and the
versioned modules are recorded in the G2 report evidence directory — hashes
cover stable file content, not commit IDs.

## 6. Amendment and re-evaluation rules

Configuration changes require bounded, versioned re-evaluation. Removing
reserves changes the provider request — a replay that merely ignores them
cannot establish feasibility of the revised request. R-10/R-16 amendments
and revised-request feasibility remain G2P decisions, not adopted here. No
per-business selector choice, post-hoc threshold, hidden retry, or manual
output repair. Ties favor simplicity.
