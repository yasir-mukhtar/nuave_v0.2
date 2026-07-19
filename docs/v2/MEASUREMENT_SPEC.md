# Nuave v2 Measurement Specification

> Purpose: Define what a Nuave audit measures, how evidence is collected and interpreted, and what must be true before a report can be delivered.
>
> Authority: This specification is subordinate to [`FOUNDATION.md`](./FOUNDATION.md) for product strategy and is authoritative for audit methodology, evidence language, and re-audit comparability. [`MVP_SPEC.md`](./MVP_SPEC.md) governs the customer experience, [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) governs human review and remedies, [`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md) governs implementation, and [`EXPERIMENTS_AND_GATES.md`](./EXPERIMENTS_AND_GATES.md) records validation results and changes in status.
>
> Status: Working specification for the first paid concierge cohort. Version `measurement-v0.1`. Last updated 2026-07-19.

## 1. Decision labels

- **[SETTLED]** — Current operating rule. Do not change without evidence and a recorded decision.
- **[HYPOTHESIS]** — A plausible design choice that has not yet earned operating-rule status.
- **[EXPERIMENT]** — A bounded test with an expected evidence outcome.
- **[OPEN]** — A material question that remains unresolved.

The labels apply to the sentence or subsection in which they appear. Unlabelled normative language such as “must” implements a settled safeguard from the foundation rather than introducing a new product decision.

## 2. Measurement claim and boundary

**[SETTLED]** Nuave measures observed visibility across a defined sample of prompts, surfaces, contexts, and runs. It does not measure a permanent, universal, personalized, or deterministic “AI ranking.”

Every audit has a fixed boundary:

- one resolved business entity and one physical clinic location;
- one vertical prompt pack;
- one city and one language/locale context;
- named provider surfaces;
- a recorded audit window;
- a versioned run design and interpretation method.

An audit result is valid only within that boundary. A non-appearance is “not observed in the tested sample,” never proof that an AI system cannot find or recommend the clinic. A positive appearance is evidence of that run, not a promise that another user will receive the same answer.

### 2.1 Launch audit surfaces

**[SETTLED]** The first paid cohort uses two defensible, web-grounded API surfaces:

1. OpenAI with web search enabled.
2. Gemini with Google Search grounding enabled.

**[SETTLED]** A separate source-readiness scan may inspect the clinic’s website, Google Business Profile/Maps listing, and other public sources. It is supporting evidence, not a third AI visibility surface and must not be included in a “platform count.”

**[SETTLED]** Perplexity and Google AI Overviews/AI Mode are deferred until their adapters, location behavior, reproducibility, disclosure, and economics pass a separate feasibility decision. Their absence must not be obscured with generic claims such as “all major AI platforms.”

### 2.2 API-versus-consumer disclosure

**[SETTLED]** Nuave tests named API or standardized provider surfaces. API output must not be represented as an exact replica of the signed-in, personalized ChatGPT, Gemini, Google, or other consumer experience.

The report must identify the tested surface in plain language and include this disclosure in substance:

> Nuave tested standardized, web-grounded API requests. Results can differ from consumer apps because of model updates, personalization, conversation history, location signals, and product-specific behavior.

Marketing may use familiar provider names to orient the customer only when the adjacent methodology text names the actual surface. It must not say “exactly what your patients see.”

## 3. Business identity resolution

Identity resolution occurs before payment and is confirmed again before evidence is attributed.

### 3.1 Canonical audit subject

**[SETTLED]** The launch audit covers one clinic location. The canonical subject must include:

- public business name and known name variants;
- exact Google Business Profile/Maps listing;
- street address and city;
- business category;
- canonical website, or an authoritative public social profile if no website exists;
- public phone number when available;
- customer confirmation that the selected listing is their clinic.

Customer contact details identify the purchaser, not the audited entity, and must not be used as public corroboration.

**[HYPOTHESIS]** A clinic without both a resolvable Maps listing and at least one authoritative website or social profile is ineligible for the standard audit and should receive clarification or a separately designed data-readiness outcome.

### 3.2 Matching an observed entity

An observed business is attributed to the audited clinic only when the response contains enough corroborating signals. Matching evidence is evaluated in this order:

1. canonical website, Maps URL/place, exact address, or phone number;
2. business name or known variant plus the correct city/location and category;
3. business name plus distinctive services or other facts that agree with authoritative sources.

**[SETTLED]** Name-only matches are insufficient when another plausible business has the same or a confusingly similar name. Branches are distinct entities unless the response clearly refers to the audited location.

Use one of three identity outcomes:

- **Resolved:** sufficient corroborating evidence supports attribution.
- **Ambiguous:** more than one entity remains plausible; do not count the observation until a reviewer resolves it.
- **Unresolved:** no reliable entity can be established; do not attribute the mention.

Identity confidence must be explained with evidence, not converted into a fabricated numeric probability.

### 3.3 Competitor identity

The same rules apply to competitors. A named entity is included in competitor analysis only when it can be resolved to a real, relevant clinic in the audit’s market context. Unresolved or hallucinated entities may be reported as response-quality issues but never described as genuine competitors.

## 4. Prompt taxonomy and run design

### 4.1 Prompt design rules

**[SETTLED]** Prompts must reflect plausible customer intent, use natural customer language, avoid seeding the audited clinic in non-branded prompts, and avoid unsupported medical claims or requests for unsafe medical advice.

Every prompt definition must have:

- a stable prompt ID and taxonomy class;
- exact rendered text;
- vertical, city, language, and intent tags;
- branded or non-branded status;
- prompt-pack version;
- a short rationale for inclusion;
- placeholders and the exact values used for the audit.

Prompts are issued as independent requests with no shared conversation history. Nuave must not add hidden instructions intended to favor the audited business.

### 4.2 Taxonomy

| Class | Count | Repetition | Purpose |
|---|---:|---:|---|
| Core non-branded discovery | 4 | 3 runs per surface | Observe whether the clinic appears across high-value local discovery intents and expose run-to-run variability. |
| Exploratory non-branded | 4 | 1 run per surface | Explore service, comparison, trust, and informational intents without implying frequency. |
| Branded accuracy | 2 | 1 run per surface | Inspect identity, service, location, and factual representation when the clinic is named. |

**[HYPOTHESIS]** The four exploratory prompts should cover one service intent, one comparison/choice intent, one trust intent, and one informational intent. Final intent selection belongs in the vertical prompt pack and must be reviewed for clinical-claims safety.

**[SETTLED]** Branded results are reported separately from non-branded discovery. A correct answer to a branded prompt is not evidence that the clinic is discoverable when the user does not already know its name.

### 4.3 Proposed v0 run matrix

**[EXPERIMENT]** For each of the first ten paid audits, run the following matrix on both OpenAI web search and Gemini with Google Search grounding:

| Class | Calculation | Observations |
|---|---:|---:|
| Core discovery | 4 prompts × 3 runs × 2 surfaces | 24 |
| Exploratory | 4 prompts × 1 run × 2 surfaces | 8 |
| Branded accuracy | 2 prompts × 1 run × 2 surfaces | 4 |
| **Planned total** |  | **36** |

The experiment asks whether 36 observations produce a credible, useful report while keeping variance, cost, latency, and manual review manageable. The result must record provider success, variance patterns, owner comprehension, useful-finding feedback, and reviewer minutes.

Three observations are a small repeated sample. Report “appeared in 1 of 3 runs,” not “33% visibility,” and do not imply statistical precision.

**[OPEN]** Exact model versions, supported randomness settings, spacing between repeated runs, audit-window maximum, and whether provider caching compromises independence. Until settled, capture the available settings and timestamps and keep all three requests independent.

## 5. Units and operational definitions

### 5.1 Evidence hierarchy

The system must preserve these distinct units:

1. **Audit:** the complete bounded measurement event for one clinic location.
2. **Surface:** the named provider/API configuration tested.
3. **Prompt definition:** versioned intent and exact template.
4. **Run:** one independent request-response event for one rendered prompt on one surface.
5. **Raw response:** the unaltered provider output and provider-supplied source metadata retained internally subject to retention policy.
6. **Observation:** a structured fact extracted from a run.
7. **Finding:** one or more observations summarized without causal interpretation.
8. **Inference:** Nuave’s evidence-backed interpretation of what a finding may mean.
9. **Recommendation:** a proposed customer action, supported by findings and qualified by confidence and limitations.

### 5.2 Result definitions

| Term | Operational definition |
|---|---|
| Appearance | The resolved audited business is identifiable anywhere in the response text or structured result. |
| Mention | The resolved business is named or otherwise explicitly referenced, without necessarily being proposed. A mention is one form of appearance. |
| Recommendation inclusion | The response affirmatively proposes the resolved business as an option for the user’s stated need. Mere directory-style listing or incidental mention does not qualify. |
| Comparative inclusion | The resolved business is included in a response that compares multiple options, whether or not it is recommended as the best option. |
| Citation/source | A provider-returned link or source reference that supports a statement or option in the response. A link to the clinic’s own property and a third-party source must be distinguished. |
| Order | The business’s presentation position only when the response is explicitly ordered or presents a coherent list. It is not called “rank” in customer-facing copy unless the provider itself defines a ranking. |
| Factual statement | A checkable assertion about the clinic, such as location, services, hours, credentials, or facilities. |
| Accuracy issue | A material factual statement that conflicts with an authoritative public source or customer-supplied source accepted through review. Absence of evidence alone is not proof of inaccuracy. |
| Hallucinated entity | A named business that cannot be resolved after reasonable source checks, or whose supplied details combine incompatible real entities. |
| Non-appearance | The audited business was not observed in one specified run. It is not a universal absence. |
| Provider failure | A planned run did not produce evaluable output because of an API, policy, timeout, malformed-response, or upstream failure. It is not a non-appearance. |

**[SETTLED]** One business is counted at most once per run for frequency purposes, regardless of repeated textual mentions. Recommendation inclusion, citations, factual statements, and order are separate attributes of that run.

## 6. Evidence provenance and interpretation

### 6.1 Required provenance

Every run must preserve, where available:

- audit, surface, prompt, and run identifiers;
- rendered prompt and prompt-pack version;
- provider, API surface, model name/version, and request settings;
- request start, response timestamp, and audit timezone;
- language, locale, city/location context, and whether the provider accepted each context signal;
- raw response and completion/failure status;
- provider-returned citations, links, and grounding metadata;
- extraction/evaluation method version;
- reviewer decisions and overrides with reason, actor, and timestamp;
- cost, latency, retry count, and error class.

Raw evidence must be retained internally according to [`COMPLIANCE_AND_DATA.md`](./COMPLIANCE_AND_DATA.md). Customer-facing reports may excerpt or summarize it, but every material report claim must be traceable to retained evidence.

### 6.2 Source authority

**[HYPOTHESIS]** For factual accuracy checks, use this default precedence: official clinic website and exact Maps/Business Profile listing; relevant regulator or professional registry; customer-confirmed business facts; authoritative third-party directory; general public source. Conflicts between authoritative sources are findings, not an invitation to choose whichever makes the report cleaner.

Customer assertions must be marked customer-supplied. Public availability does not guarantee truth, and model citations do not by themselves validate the cited claim.

### 6.3 Observation, inference, and recommendation

Every material finding must be expressible in this chain:

| Layer | Required content | Permitted language |
|---|---|---|
| Observation | What was returned, by which surface/run, and when | “Gemini included Clinic A in 2 of 3 runs for prompt P.” |
| Inference | A qualified interpretation supported by one or more observations | “This pattern may indicate that Clinic A has stronger retrievable public information for this intent.” |
| Recommendation | A controllable action, expected direction, owner, effort, caveat, and completion check | “Clarify service X on the clinic service page; this may improve source clarity but does not guarantee inclusion.” |

**[SETTLED]** Correlation and source overlap are not causation. Nuave must not say a competitor appeared “because of” a source pattern unless causal evidence exists. Contradictory runs and disconfirming evidence remain visible.

## 7. Scoring and summary policy

**[SETTLED]** The first ten paid reports will not use a composite 0–100 score or a single “visibility percentage.” This protects comprehension testing from an authoritative-looking number that combines unlike evidence.

Reports use direct counts and denominators:

- “appeared in 1 of 3 runs” for repeated core prompts;
- “recommended in 0 of 3 runs” when recommendation inclusion is evaluated;
- “mentioned in this single exploratory run” for one-run prompts;
- “2 accuracy issues observed across 4 branded responses,” with issue-level evidence.

Discovery, recommendation inclusion, branded accuracy, citations/sources, and provider coverage remain separate dimensions. A summary may use plain-language labels only when the underlying counts and rules appear adjacent.

**[EXPERIMENT]** During first-cohort interviews, test whether owners can correctly explain the evidence matrix, distinguish branded from non-branded results, and select an action without a composite score.

**[OPEN]** Whether a later composite score improves comprehension and decision-making enough to justify its simplification. Any proposal must publish components and weights, avoid false precision, and be validated against the no-score report.

## 8. Provider failure and missing evidence

**[SETTLED]** Provider failure is never converted into non-appearance, zero visibility, or a fabricated result.

For each failed run:

1. record the failure class and attempt metadata;
2. retry according to the operations policy without changing the prompt or context;
3. if a materially different model or configuration is used, record it as a changed surface rather than a transparent retry;
4. route unresolved failure to manual review;
5. disclose missing coverage in any delivered report.

An answer that validly returns no recommendations is an observation, not a provider failure. A safety refusal or irrelevant answer is evaluable only if the evaluation rules explicitly classify it; otherwise it requires review.

### 8.1 Pilot coverage thresholds

**[EXPERIMENT]** Use the following candidate thresholds for the first ten reports and record every exception:

- A **full report** includes both launch surfaces, at least 10 of 12 successful core runs per surface, at least two successful runs for each core prompt per surface, and at least 30 of 36 successful observations overall.
- A result below that threshold is not auto-delivered. It enters manual review and may become a clearly labeled partial report, a delayed retry, or a refund/remedy under the operations runbook.
- Zero appearance is deliverable when coverage succeeds; it is potentially important evidence and must not be treated as a technical failure.

These thresholds are operational hypotheses, not claims of statistical adequacy. Promote, revise, or reject them after the first ten audits using failure patterns, report usefulness, and customer expectations.

**[OPEN]** The minimum evidence required for a paid partial report and the corresponding customer remedy.

## 9. Quality gates

### 9.1 Audit evidence gate

Before interpretation begins:

- the audited clinic is resolved and customer-confirmed;
- prompt text, pack version, context, surfaces, and run plan are recorded;
- coverage is calculated without counting failures as non-appearances;
- every counted business and material competitor is resolved;
- raw responses and source metadata are traceable;
- extraction conflicts and ambiguous entities are queued for review.

### 9.2 Finding and recommendation gate

Before a report is approved:

- observations, inferences, and recommendations are structurally distinct;
- every material claim links internally to one or more observations;
- no inference uses causal language beyond its evidence;
- contradictory evidence and meaningful limitations are disclosed;
- branded results do not inflate discovery results;
- competitor attributes are sourced and identity-checked;
- accuracy issues cite the conflicting authoritative fact;
- recommendation priority reflects expected directional impact, evidence confidence, effort, dependency, and customer control;
- each material recommendation names an owner and a verifiable completion check;
- regulated or medical-claim-sensitive recommendations pass the applicable compliance review;
- generic filler and unsupported revenue-loss estimates are absent.

**[SETTLED]** A human reviews every report in the first ten paid audits. The reason and minutes must be logged even when no changes are made. Later automation requires evidence from these review logs and a decision recorded in [`DECISION_LOG.md`](./DECISION_LOG.md).

## 10. Report outcomes and structure

### 10.1 Required outcomes

A report must enable the owner to:

- understand exactly what was tested and what was not;
- see appearances, non-appearances, recommendation inclusions, and variability in the tested sample;
- distinguish non-branded discovery from branded accuracy;
- see meaningful differences between the two surfaces;
- inspect evidence for competitor, source, and factual findings;
- understand which explanations are inference rather than fact;
- identify the three highest-priority controllable actions;
- know who can perform each action and how completion can be verified;
- understand how and when a comparable re-audit can be run.

A report may legitimately conclude that evidence is limited, the clinic already performs strongly within the sample, or no material accuracy issue was found. It must not manufacture a “non-obvious” problem to satisfy a marketing promise.

### 10.2 Working report structure

**[HYPOTHESIS]** Use this structure for the first cohort and evaluate comprehension, not page count:

1. **What to do first:** three actions, expected direction, effort, owner, and limitations.
2. **Executive finding:** plain-language summary with the sampled-result disclosure.
3. **Audit scope and coverage:** clinic identity, surfaces, dates, city, language, prompts, run counts, failures, and versions.
4. **Discovery evidence matrix:** core and exploratory non-branded observations by intent and surface.
5. **How the clinic is represented:** branded accuracy, factual statements, contradictions, and unresolved issues.
6. **Competitor and source patterns:** resolved entities, citations, and qualified inferences.
7. **Prioritized action plan:** evidence, action, confidence, effort, owner, dependency, completion check, and caveat.
8. **30-day sequence and re-audit baseline:** suggested order of work and the frozen comparable subset.
9. **Methodology, glossary, and limitations.**

The web report is the source of truth. Any PDF must render the same evidence, versions, and limitations rather than generating a second interpretation.

## 11. Comparable re-audits

**[SETTLED]** A re-audit may claim change only for a materially comparable subset. At minimum, preserve:

- the same resolved clinic location and identity rules;
- exact prompt IDs and rendered prompt text;
- branded/non-branded classification;
- language, city, locale, and declared context;
- provider/API surface;
- run count and run procedure;
- extraction and evaluation definitions;
- evidence dimension and denominator.

Provider model versions and search indexes may change outside Nuave’s control. Record such changes, display them as comparability limitations, and never describe an observed difference as caused by the customer’s actions without stronger evidence.

The re-audit report must separate:

- **comparable observations:** eligible for baseline-versus-current count comparison;
- **new or changed-method observations:** informative but not part of the change claim;
- **unavailable observations:** provider/prompt combinations that could not be reproduced.

Use language such as “appearance increased from 1 of 3 to 2 of 3 runs in this comparable prompt/surface sample.” Avoid “visibility improved by 100%” and causal claims.

**[HYPOTHESIS]** Freeze all four core non-branded prompts per surface as the minimum v0 re-audit baseline. Preserve the original branded prompts for factual-change checks; exploratory prompts may evolve but are not used for change claims when text or intent changes.

**[OPEN]** Maximum interval after which provider evolution makes the original baseline unsuitable, and the threshold for labelling an entire re-audit non-comparable.

## 12. Versioning and change control

Every audit must record these independently versioned artifacts:

- measurement specification;
- vertical prompt pack;
- provider surface configuration;
- business and competitor identity rules;
- extraction/evaluation rules;
- recommendation policy;
- report schema/template;
- compliance rules used for review.

**[SETTLED]** Published audit evidence is immutable. Corrections create a new report version with a reason, author, timestamp, and link to the prior version; they do not silently rewrite the underlying run.

Use semantic intent for method versions:

- **Patch:** clarification or bug fix that does not change classification or comparability.
- **Minor:** additive change, such as a new report field, that preserves the comparable core.
- **Major:** change to prompts, surfaces, run counts, identity/classification rules, or denominators that can alter interpretation.

**[SETTLED]** A major methodology change starts a new comparison series unless an explicit mapping proves which subset remains comparable.

Experiment results and status changes must be recorded in [`EXPERIMENTS_AND_GATES.md`](./EXPERIMENTS_AND_GATES.md); material operating decisions and their revisit triggers must be recorded in [`DECISION_LOG.md`](./DECISION_LOG.md).

## 13. Open decisions before automated delivery

The following remain **[OPEN]** and must not be silently settled in code or copy:

1. Exact dental vertical prompt text and clinical-claims review criteria.
2. Exact OpenAI and Gemini API/model configurations and supported location controls.
3. Timing/spacing and independence criteria for repeated runs.
4. The first-cohort partial-report threshold and customer remedy.
5. The source-authority policy when customer input conflicts with official public sources.
6. Handling of newly opened or sparse-data clinics.
7. Maximum audit window and customer-facing delivery-time claim.
8. Raw-response, source, and report retention periods.
9. Rules for quoting or displaying provider output and third-party source material.
10. Re-audit comparability expiry and provider-substitution policy.

These questions do not prevent a founder-operated feasibility run. They do prevent unattended paid delivery where the unresolved choice could materially change the customer outcome.

## 14. Acceptance criteria

This specification is ready to govern the first paid concierge cohort when all of the following are true:

- [ ] One dental prompt pack contains four core non-branded, four exploratory non-branded, and two branded accuracy prompts, each versioned and reviewed.
- [ ] One representative set of at least ten clinics has been used to test identity resolution, including duplicate names, branches, and sparse public data.
- [ ] Both launch surfaces have passed an end-to-end 36-observation feasibility audit with provenance intact.
- [ ] Evaluators can distinguish appearance, mention, recommendation inclusion, order, citation, accuracy issue, and provider failure using a shared labelled test set.
- [ ] Inter-reviewer disagreements and ambiguous cases have a documented escalation path.
- [ ] Candidate coverage thresholds have been exercised against real provider failures and do not create complete-looking reports from insufficient evidence.
- [ ] Every report claim can be traced to a raw run, prompt, surface, timestamp, and evaluation version.
- [ ] First-cohort reports show counts and denominators without a composite score.
- [ ] A human-review checklist covers identity, evidence, inference, recommendations, clinical claims, failures, and rendering.
- [ ] Report copy includes the sampled-result and API-versus-consumer disclosures.
- [ ] The report structure works on mobile and its PDF, if offered, contains the same evidence and limitations.
- [ ] A baseline and re-audit fixture demonstrates which observations are comparable after a method or provider-version change.
- [ ] All remaining open decisions that affect a paid customer have an owner, deadline, and documented temporary operating rule in the relevant sibling document.

## 15. First-cohort evidence to collect

For each of the first ten paid audits, capture:

- planned versus successful observations by prompt class and surface;
- core repeated-run appearance and recommendation variability;
- ambiguous identity and competitor cases;
- provider retries, failures, latency, and direct cost;
- automated extraction disagreements and human corrections;
- reviewer minutes and review reason;
- number of report claims without direct traceability (target: zero);
- owner comprehension of counts, branded versus non-branded results, and limitations;
- whether the owner identifies at least one useful, non-obvious finding without prompting;
- the action selected and evidence of completion when later supplied;
- complaints, disputes, and requested corrections.

After audit ten, review the v0 run matrix, coverage thresholds, report structure, no-score policy, and manual-review requirement. No experimental item becomes settled merely because it was implemented.
