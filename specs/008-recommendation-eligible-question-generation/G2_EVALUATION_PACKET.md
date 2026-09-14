# G2 evaluation packet — frozen offline (2026-09-14, fifth correction)

Status: **corrected and re-frozen for independent re-review**. This packet is
the versioned evaluation contract required by R5 §8. It is offline-only: it
authorizes no provider call, merge, production activation, or G2P/G3–G5 work.
Every number below is a proposed limit for later authorization, not a grant to
spend and not measured performance. Exact fallback wording and evaluation
examples remain subject to independent review before G2 acceptance.

This fifth revision corrects the candidate against the independent fourth
re-review (E1/E2): every offline `replay` now carries the
derivation-emitted fingerprint of the complete parsed source response
(primaries, unused reserves, named texts, and market/selection metadata)
and must equal the attempt's recorded `sourceResponseFingerprint` — an
identical M selection can never identify the source response, so a
different response's replay can no longer stand in for the recorded
attempt's, and an attempt that recorded no usable source (explicit null)
still lands on the shared fallback outcome but earns no replay or
component credit. The §8.2.5 component gates now derive their required
evidence from the same adopted reserve-bearing request/selection
configuration the attempts are validated against — a `retainedComponents`
declaration that omits or contradicts reserves is rejected rather than
trusted. The fourth revision (T1a/T1b/T2/T3: the restored R5 §8.1
alternatives, capture-shape/origin/counter validation, coherent D2/D6
fallback decisions, corrected conflict-index mapping), the third revision
(T1–T3: exact input/variant/pass attribution binding,
request-configuration fingerprints, the explicit three-way combined
outcome, keyword-anchor removal, bounded matching repair), the second
revision (R1–R6), and the first revision (F1–F10) are preserved.

Code-owned authority: `src/lib/audit/question-eval-g2.ts`
(`nuave.g2-evaluation-packet.v6`, decision policy
`nuave.g2-decision-policy.v6`, rubric `nuave.g2-review-rubric.v2`, frozen
inputs `nuave.g2-frozen-inputs.v2`, usage accounting
`nuave.g2-usage-accounting.v2`). This document describes that executable
record; approved R5 remains authoritative — a disagreement between the module
and approved R5 is a defect to correct, never a silent override.

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

| Pilot input | Envelope alias                                | Repeat                                |
| ----------- | --------------------------------------------- | ------------------------------------- |
| G2P-AC      | D1 (local AC service)                         | yes — second attempt on both variants |
| G2P-RETAIL  | D3 (multi-brand laptop retailer)              | no                                    |
| G2P-B2B     | D5 (B2B SaaS)                                 | no                                    |
| G2P-SPARSE  | D8 (sparse sufficient consumer-product scope) | no                                    |

Pilot/development overlap is intentional and frozen
(`G2_FROZEN_INPUT_MANIFEST.pilotEnvelopeAliases`): the pilot reuses the
development envelopes so the same bytes exercise both gates. H1–H4 are held
apart from all pilot/tuning outputs.

Schedule (predeclared interleaved order, per input rich then simple, repeat
pair last): `G2_PILOT_SCHEDULE.attempts` — 5 rich + 5 simple = **10
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
  (`schedule.attempts`), rich before simple per input, repeats last.

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

Canonical judgment records (`G2TextJudgment`, validated by
`validateG2TextJudgments`): every scheduled attempt carries exactly the ten
canonical slot IDs in order
(`NUAVE-BRAND-NEED-01` … `NUAVE-BRAND-ACTION-02`), each judgment bound to the
SHA-256 text fingerprint of the exact final text the reviewer saw.
Duplicate, extra, missing, out-of-order, or mismatched-pair judgments fail
validation; unknown or invalid required judgments fail validation. Scores are
bounded to the frozen 0–3 integer scale.

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

Attempt-record bindings (`G2AttemptRecord`, validated by
`validateG2AttemptRecord`): beyond the envelope/facts/pack/text fingerprints,
each attempt carries `finalOrigins` (the per-slot mechanical outcome of its
selection, in canonical order) and `requestConfigFingerprint` — the SHA-256
of the variant's canonical request configuration
(`G2_V3_REQUEST_CONFIG`: the frozen settings object, the accepted transport
contract, instruction/schema/contract versions, and the selection policy).
A v3 attempt must equal the frozen fingerprint exactly; a v2 attempt records
its actual configuration hash. Credentials are never part of the record.

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

Matched-pair comparison (`compareMatchedAttempt`, per input+pass, six
unnamed texts only):

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

- Reserves retained iff ≥1 recorded M-over-P mechanical rescue/avoided
  fallback with no M-caused final-text regression **or** ≥1 independently
  justified C−M benefit — R5 §8.1's explicit alternative (P/M/C replayed
  offline from each rich response under identical guards/fallbacks, bound
  to the exact attempt by input/variant/pass). A rescue resolves to the
  recorded P-to-M difference: the slot lost its original text under P
  (slot or full fallback) while M kept an original candidate. Each benefit
  route is gated on its own regression — a rescue counts only when M
  caused no final-text regression; a gain only when C caused none and the
  reviewed benefit is real.
- Coverage retained iff ≥1 independently reviewed material consumer-decision
  or wording gain in C−M on a mechanically valid M, with no C-caused
  regression. Mechanical-only rescue cannot justify coverage; label-only
  changes earn nothing; reserve-only rescue does not earn coverage.

Each attribution row carries the P/M/C replay **captures** — the canonical
final texts, per-slot origins, and pack fingerprint of each portfolio —
plus the recorded offline `replay` (`deriveV3Attribution` under identical
guards/fallbacks) they resolve against. The replay carries the
derivation-emitted `sourceResponseFingerprint` of the complete parsed
response and must equal the attempt's recorded source identity: replay.M
equalling the recorded pack remains an additional check, never the proof —
two different responses can select the identical M pack, so the replay
binds to the source fingerprint. Every non-null capture must equal its
replay portfolio exactly. Captures are structurally validated — canonical
lengths and order, allowed origins with policy/slot compatibility (P never
uses reserves, named slots carry none, full fallback is all-or-nothing),
and nonempty final texts. Null, unrelated, identical, empty, or merely
relabelled portfolios earn no component credit, a self-consistent hash can
never invent a replay, and a replay bound to a different or absent source
earns none either.

The combined pilot outcome is explicit: `retain` requires Decision A quality
**and** complete valid evidence **and** retained reserves for the frozen M
contract; `amendment_required` when A and evidence pass but the reserves
component shows no benefit (a reserves-free or coverage contract is a
different contract needing its own evaluation — never silently adopted);
`not_retained` otherwise.

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
allocation's attempt records) — every gate below is mandatory; no overall
release acceptance is emitted while any mandatory input is missing:

1. **All 16 selected-v3 packs usable** under the frozen usability rule —
   a missing pack scores zero and is unusable.
2. **Per-input v2 naturalness comparison over all ten texts**
   (`meanAllNaturalness`, grouped by each frozen input over its scheduled
   repeats): selected v3 must be non-worse than the matching actual v2 for
   every paired input. The rich allocation carries **11 actual-v2 attempts
   across the eight development inputs** (D1–D8, with preselected repeats on
   D1/D3/D5) and pairs v3 against them per input; the simple-by-amendment
   allocation pairs all 16. No held-out v2 pairs are invented.
3. **Writer-contribution thresholds** (derived from the recorded finalization
   origins — substituted fallback text never counts as model-written, and
   records whose flags or judgments contradict those origins are rejected,
   never reconciled): ≥15/16 structurally complete records, ≥14/16 packs
   retaining ≥5 model-written unnamed texts, ≤2 full-fallback packs.
4. **§8.2.5 integrated gates**: the §8.1 pilot replay must pass on the same
   corrected rules, and the release P/M/C attribution must show ≥1 relevant
   observed benefit without regression for **each component actually
   retained** under the adopted configuration — a recorded P-to-M rescue
   or an independently justified C−M gain supports reserves; only a
   reviewed C−M gain supports coverage. Required components are bound to
   the same adopted request/selection configuration the attempt records
   are validated against: the frozen rich contract is reserve-bearing, so
   a `retainedComponents` declaration that omits or contradicts reserves
   is rejected — caller flags can never remove required evidence. An
   unretained component's regression is recorded, never an automatic
   failure, and an aggregate benefit count can never justify a component
   it did not earn. Reserve attribution uses the same R5 §8.1
   alternatives as the pilot.
5. **§8.2.7 resource samples**: absolute limits over **all** attempts in the
   allocation (failures, timeouts, and fallback latency included), plus
   selected-v3 means and empirical nearest-rank p95 over the selected 16 —
   kept distinct from allocation totals and from the held-out matched
   increments, which `evaluateG2HeldOutRetention` reports separately.

Later browser/history/rollback evidence remains separately evaluated at G6;
it is not an input to this evaluator.

### Missing-evidence policy

`g2ExecutionEvidenceDecision` is the dormant decision-policy check for
absent execution evidence: runtime semantics stay `not_evaluated` unless the
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
are omitted (provider defaults apply). The transport header contract is the
**accepted OpenCode Go method**, declared in code as
`V3_OPENCODEGO_TRANSPORT` and emitted by the code-owned
`opencodeGoTransportHeaders()` helper: `Authorization: Bearer …`,
`Content-Type: application/json`, `x-opencode-session` with a fresh random
ID per one-shot call, and `User-Agent: nuave-audit/1.0`. An offline
regression test compares this declaration against the accepted helper's
output and the serialized request body for omitted sampling keys. These
constants declare the contract; they do not themselves enforce transport
behavior — the later transport still owns real AbortSignal enforcement.

Usage accounting (`G2_USAGE_ACCOUNTING`, observed 2026-09-13 from the
official OpenCode Go usage-limits documentation,
`https://opencode.ai/v2/docs/console/go`, GPT 5.6 Luna ≤272K-token tier):
$0.20/1M input, $0.02/1M cached-read, $0.25/1M cached-write, $1.20/1M
output. These are **subscription usage-allowance** dollars — Go bills a
fixed subscription and these values measure allowance consumption, not cash
spend. Any balance-fallback spending is an account setting this packet
neither infers nor changes.

Counter semantics (`G2Usage`, matching the accepted telemetry
normalization): `inputTokens` is **total** input; `cachedReadInputTokens`
and `cachedWriteInputTokens` are portions of that total, priced separately
and subtracted before the ordinary-input rate applies — cached tokens are
never charged twice. `g2UsageIsValid` requires nonnegative finite integer
counters and rejects cached portions exceeding total input.

Resource limits (`G2_RESOURCE_LIMITS`, proposed; computed from complete
attempt records — missing or nonfinite required telemetry cannot pass):

| Limit                         | Value                       | Derivation                                                                                                             |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Per-attempt output cap        | 4,096 tokens                | equal rich/simple cap (above)                                                                                          |
| Per-attempt timeout           | 60,000 ms                   | evaluation-side bound; equals the p95 ceiling                                                                          |
| Serialized request bound      | 28,000 chars                | complete instruction + projected writer context + schema for the largest frozen input measures well under this         |
| Estimated input bound         | 12,000 tokens               | 28,000 chars ÷ conservative 2.5 chars/token = 11,200 → frozen at 12,000                                                |
| Per-attempt usage ceiling     | $0.02                       | 12,000×$0.20 + 4,096×$1.20 per 1M ≈ $0.0073 → ≈2.7× headroom                                                           |
| Mean generation usage ceiling | $0.02                       | set equal to the frozen per-attempt ceiling — the defensible bound for a mean that must hold attempt-by-attempt anyway |
| §8.1 total usage ceiling      | $0.20                       | 10 calls × $0.02                                                                                                       |
| §8.2 new-calls usage ceiling  | $0.64                       | 32 calls × $0.02                                                                                                       |
| Mean latency ceiling          | 30,000 ms                   | absolute bound, both variants                                                                                          |
| p95 latency ceiling           | 60,000 ms                   | = per-attempt timeout; nearest-rank `ceil(0.95·n)`                                                                     |
| Rich-vs-simple incremental    | cost ≤ 2.0×, latency ≤ 1.5× | means over completed held-out matched pairs                                                                            |
| Automatic retries             | 0                           | every attempt counts                                                                                                   |

## 5. Versions and hashes

Pinned versions (`G2_VERSION_PINS` plus request versions): writer contract
`nuave.question-writer.v3.2`; rich instruction
`nuave.question-writer-instruction.v3.2-rich`; simple instruction
`nuave.question-writer-instruction.v3.2-simple`; schemas
`nuave.question-schema.v3.2-rich/-simple`; projection
`nuave.question-facts.v3.1`; context `nuave.question-context.v3.1` (G1
projection/context versions are unchanged and stay pinned); guard
policy `compatible-008`; selector `nuave.question-selector.v3.4`; fallback
`nuave.question-fallback.v3.4`; finalizer `nuave.question-finalizer.v3.4`;
evidence `nuave.question-evidence.v3`; packet/decision/rubric/frozen-input/
usage-accounting versions above. The v3.4/v6 bumps distinguish this
fifth-correction candidate — a record claiming v3.1 identity is the old
rejected candidate, v3.2/v3 marks the second candidate, v3.3/v4 the
third, and v3.4/v5 the fourth.

Held-out retirement record (`G2_FROZEN_INPUT_MANIFEST.retiredInputs`): the
v1 H1–H4 envelopes are retired from untouched held-out status — their
deterministic fallback forms were rendered and inspected during the
correction and independent re-review on 2026-09-13, which counts as output
exposure under §8.2's retirement clause even though no provider outputs
were generated. Retired envelope fingerprints:
H1 `b22a4aea…f627a8`, H2 `4e4dc43f…e05043`, H3 `6441fdac…294099`,
H4 `55beb88e…facf57` (full values in the manifest). The viewed cases remain
development/regression evidence only. The v2 manifest freezes fresh
fictional envelopes of the same four approved archetypes and the same
single-H1-repeat allocation; their fingerprints are pinned in the manifest
(`envelopeSha256` per input) and cross-checked by
`validateG2FrozenInputs`. No fallback or model output was generated,
rendered, inspected, or tuned against the fresh envelopes — development
equivalents carry all form tests.

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
