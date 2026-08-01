# Nuave Report Generation — Implementation Plan

> Persistent execution context for implementing the Nuave report-generation pipeline.
>
> **Status:** Product context synchronized; implementation not started  
> **Current batch:** Batch 0 — baseline the existing local `/audit` workflow  
> **Next action:** Preserve the dirty worktree in `/Users/yasir/nuave_v0.2`, run the existing non-mutating checks, then inspect one founder-approved private live audit before changing report contracts.  
> **Last updated:** 2026-08-01

## 1. Purpose

Improve the existing report-generation system so an agency, SEO freelancer, Google Business Profile consultant, independent marketer, or website agency can credibly deliver one AI Visibility Audit to one client business.

The client-ready report should consistently tell the agency and its non-technical client reader:

1. whether prospective customers can discover the client business through the tested AI questions;
2. whether the tested system understands and accurately represents the client business;
3. whether the business was absent, mentioned, recommended, or explicitly preferred in the sampled answers;
4. how the client business compares with observed alternatives without claiming a permanent ranking; and
5. which few actions should be prioritized next.

The implementation must preserve methodological honesty while remaining fast and cost-efficient. The customer-facing generation path must not use an iterative writer-reviewer conversation.

The current experiment is one bounded, self-service, agency-facing workflow. It runs five unbranded and five branded questions independently through the OpenAI Responses API with web search, then creates one downloadable report and JSON evidence export. It is not a dashboard, subscription product, multi-client system, or proof of cross-industry reliability.

This document is implementation memory. The active repository documents in `/Users/yasir/nuave_v0.2` govern product truth. The older synced context under this workspace's `sources/` directory is historical reference when it conflicts with the active repository.

## 2. How to Resume Work in a New Session

At the beginning of every implementation session:

1. Read `/Users/yasir/nuave_v0.2/AGENTS.md` and `/Users/yasir/nuave_v0.2/README.md`.
2. Follow the repository authority chain: newest founder-approved entry in `docs/DECISION_LOG.md`, then `docs/NOW.md`, then `docs/PRODUCT.md`, then the task-relevant `docs/AUDIT.md`.
3. Read this document completely.
4. Inspect the application repository and preserve all uncommitted changes.
5. Read the latest entry in **Progress Ledger**.
6. Work only on the current batch unless its exit criteria are satisfied.
7. Run the checks required by that batch.
8. Update the header, Progress Ledger, Decision Log, changed-file list, and next action before ending the session.

Do not rely on chat history for implementation state. If chat history and committed code disagree, inspect the code and record the resolution here.

## 3. Delivery Strategy

Use a step-by-step implementation with small, verifiable batches.

The design can be agreed in one pass, but implementation should not be one-shotted because it changes several contracts at once:

- observation classification;
- metric calculation;
- prompt inputs and outputs;
- claim validation;
- report rendering; and
- production telemetry.

A one-shot rewrite would make it difficult to identify whether a defect came from evidence extraction, aggregation, model interpretation, or rendering.

## 4. Locked Architecture Decisions

These decisions remain in force unless the Decision Log explicitly changes them.

1. **Code owns arithmetic and hard claim boundaries.** Counts, denominators, coverage, test segmentation, report versions, and method copy are computed outside the report-writing model. Semantic labels may be model-assigned only when deterministic parsing is insufficient, and must remain schema-constrained and evidence-validated.
2. **Branded and non-branded results remain separate.** They must never be merged into a flattering visibility metric.
3. **Result dimensions remain separate.** Appearance, mention, recommendation, comparison/preference, information accuracy, source use, and presentation order must not be collapsed into one status or score. “Favored” is allowed only when the answer explicitly supports preference in that tested context.
4. **One initial report call.** The normal path uses one schema-constrained call to classify retained answers and produce the structured report.
5. **No model critic loop.** Validation after synthesis is deterministic.
6. **At most one protected language retry.** The existing `plain-en-v1` retry may fix only machine-detected writing violations and must not change classifications, evidence IDs, sources, answer excerpts, priority order/timing/owner, or other protected facts.
7. **Every material finding is traceable.** Findings and recommendations carry evidence IDs.
8. **Structured output precedes rendering.** The model returns typed data; application code renders the final report.
9. **Maximum three immediate priorities.** Recommendations are ranked and tied to observed gaps.
10. **Version everything material.** Methodology, prompt set, evidence schema, report policy, synthesis prompt, and output schema receive explicit versions.
11. **English is the current workflow language.** Intake, questions, API observations, report, and evidence export use English. The public landing page remains bilingual.
12. **The report is agency-ready and client-facing.** It supports neutral presentation or optional permitted agency name/logo, identifies who it was prepared for and by, and preserves Nuave's method, evidence, limitations, attribution, correction path, and commercial-use boundary.

## 5. Target Runtime Pipeline

```text
Verified client brief and approved 10-question Intent-5 pack
    ↓
10 independent OpenAI Responses API observations with web search
    ↓
One schema-constrained report call: semantic classification + report synthesis
    ↓
Deterministic evidence, count, claim, and plain-language validation
    ↓
One structured report rendered to screen/print and JSON evidence export
```

### Model-call budget

The current report-generation portion should use:

- **Normal path:** one initial schema-constrained report call after the ten audit observations finish.
- **Protected retry:** one language-only revision when deterministic `plain-en-v1` validation fails.
- **Future fallback only if live evidence requires it:** split semantic classification from writing. Do not add this extra call pre-emptively.
- **Prohibited:** writer → reviewer → revision loops in the customer request path.

The ten audit observations are already independent provider calls and are outside this report-call budget. Measure them separately. Keep the existing exact returned model, web-search condition, and execution-surface disclosure.

## 6. Layer Responsibilities

### 6.1 Evidence normalizer

Inputs:

- raw AI response;
- prompt definition and customer intention;
- platform, provider, model, language, location, and timestamp;
- run identifier;
- audited business identity; and
- resolved competitor identities where available.

Outputs one normalized observation per prompt run. Minimum fields:

```text
prompt_id
category: need_discovery | solution_discovery | comparison | validation | action
branded: boolean
question
system: OpenAI Responses API
requested_model
returned_model
response_id
run_status: completed | failed
failure_reason
raw_answer
sources[]
observed_at
```

This base observation already exists in `auditObservationSchema`. Preserve it rather than introducing a parallel storage model. The structured per-test analysis should evolve toward independent dimensions:

```text
appearance_status: recommended | mentioned | absent | could_not_be_tested
information_status: no_clear_issue | incomplete | conflicting | not_assessed
comparison_status: explicitly_preferred | compared | not_compared | not_assessed
competitors[]
answer_excerpt
source_urls[]
evidence_note
```

Semantic labels must retain an exact answer excerpt and references to the raw response. A model may assign labels in the one report call, but it may not create business facts or causal conclusions. Deterministic validation must confirm identity signals, failure handling, exact excerpts, permitted sources, prompt IDs, and dimension consistency.

### 6.2 Fact and claim builder

The fact builder computes:

- successful and failed coverage;
- discovery results from non-branded prompts;
- recognition results from branded prompts;
- mention and recommendation counts;
- explicitly supported comparison/preference observations;
- results grouped by Intent-5 category;
- observed competitors and their scoped frequency/status;
- incomplete or conflicting information kept separate from appearance status;
- confirmed accuracy issues;
- gaps supported by the sample; and
- limitations that constrain conclusions.

It also produces an explicit `allowed_claims` collection. Each claim contains:

```text
claim_id
claim_type
statement_or_fact
scope
evidence_ids[]
confidence
limitations[]
```

For the raw MVP, implement allowed-claim behavior in the existing TypeScript/Zod contracts and validators rather than creating a new policy service. The model must not infer a permanent ranking, universal consumer ChatGPT result, guaranteed outcome, revenue loss, or untested cause.

### 6.3 Report synthesizer

The model is responsible for:

- concise plain-English wording under `plain-en-v1`;
- an evidence-qualified overall diagnosis;
- explaining business meaning;
- selecting the most material strengths and gaps;
- ranking at most three feasible actions; and
- distinguishing observation, interpretation, action, confidence, and limitation.

The model is not responsible for:

- arithmetic;
- deciding denominators;
- inventing competitors or attributes;
- claiming causation;
- deciding whether coverage is complete; or
- generating layout markup.

Minimum structured output:

```text
conclusion
accuracy_status
key_findings[]           # 1–5
priorities[]              # 1–3
details[]                 # exactly 10, one per prompt
```

Keep `nuave-report-v2` until a material schema change requires a version bump. Every finding and action must include `evidence_prompt_ids`. Every action should include what to do, why it matters, evidence basis, likely owner, completion check, and relevant caveat. Method copy and direct counts must be built deterministically from recorded run facts, not generated as free narrative.

### 6.4 Deterministic validator

Validation must reject or route to manual review when:

- a count differs from computed facts;
- branded and non-branded samples are combined incorrectly;
- an unknown competitor or attribute appears;
- appearance, comparison, and information-accuracy dimensions are conflated;
- a material finding lacks evidence IDs;
- a recommendation lacks an observed gap;
- more than three immediate priorities are returned;
- the report asserts permanent ranking, guaranteed improvement, unsupported causation, or modeled revenue loss;
- required limitations are omitted;
- an answer excerpt is not copied exactly from its retained answer;
- a source URL was not attached to the corresponding observation;
- a language-only retry changes protected classifications or evidence;
- contradictory sections appear; or
- required output fields are missing or exceed length limits.

Warnings may be used for non-material wording issues. Material evidence or integrity failures must not be silently rendered.

### 6.5 Renderer

The renderer owns:

- one-minute summary hierarchy;
- number cards and denominator labels;
- business findings;
- expandable evidence and methodology;
- typography and layout;
- platform/failure disclosure; and
- web/PDF consistency.

The current five-section customer sequence remains: **Main Result**, **Key Findings**, **What to Do Next**, **Test-by-Test Results**, and **How This Audit Works**. Screen and print must use the same report data and version. The JSON evidence export must retain the complete evidence and contract versions.

Technical QA details such as “0 failed tests” must not be a headline metric. Coverage should appear quietly as context, for example “10 of 10 questions were successfully analyzed.” The report must show the audited business and scope, audit date, prepared-for client business, and prepared-by agency when supplied and permitted.

## 7. Canonical Policy Structure

Extend the current repository-native TypeScript/Zod contracts rather than create a parallel policy tree:

```text
src/lib/audit/types.ts             # Zod schemas and report/evidence types
src/lib/audit/contracts.ts         # prompt, evidence, count, and export rules
src/lib/audit/report-language.ts   # canonical plain-en-v1 writing contract
src/lib/audit/openai.ts            # schema-constrained report prompt/call
src/lib/audit/contracts.test.ts    # contract and evidence guardrails
src/lib/audit/openai.test.ts       # model-call configuration behavior
src/app/api/audit/report/route.ts  # generation, validation, protected retry
src/app/audit/ReportView.tsx       # screen/print rendering
```

Treat rules as:

- `hard_rule`: enforced by code or schema;
- `writing_rule`: included in the synthesis prompt;
- `evaluation_rule`: checked in offline fixtures or human QA.

`report-language.ts` is the single runtime source for writing limits and disallowed customer-facing wording. `types.ts` and `contracts.ts` are the sources for structural and evidence integrity. Do not duplicate these rules in a Codex skill. Bump the writing-standard or report version only when its material contract changes.

## 8. Implementation Batches

### Batch 0 — Existing-workflow baseline

Goal: observe the current workflow before changing its report contract.

Tasks:

- preserve the existing dirty worktree and identify overlapping user changes before every edit;
- run `npm run test:audit`, `npm run check`, and `npm run build` without changing files;
- map the current report call, language retry, validators, counts, renderer, print path, and evidence export;
- complete one founder-approved private live audit when the required API key and exact public business are available;
- inspect all ten retained answers, sources, classifications, findings, actions, and the final screen/print output;
- capture report-call count, latency, retry behavior, and provider usage/cost where returned; and
- record concrete failures against the AI Report Improvement Criteria.

Exit criteria:

- current engineering checks and their results are recorded;
- at least one real or approved retained-evidence fixture exposes the current report behavior;
- current report problems are evidenced rather than inferred from code alone;
- Batch 1 can name exact failing tests and files.

### Batch 1 — Golden fixtures and gap tests

Goal: encode expected facts and prohibited conclusions before changing runtime behavior.

Tasks:

- convert approved retained observations into privacy-safe test fixtures;
- add edge cases for branded recognition, unbranded discovery, mention, recommendation, comparison, accuracy, and failure;
- add tests for the current five-section report contract and `plain-en-v1` limits;
- add failing tests for no more than three priorities, separated result dimensions, exact evidence, and direct denominator labels; and
- characterize—not snapshot—the current output so useful flexibility remains.

Exit criteria:

- good fixtures validate and seeded integrity failures are rejected;
- each desired behavior has an explicit test or review criterion;
- production behavior remains unchanged.

### Batch 2 — Structured result dimensions

Goal: stop overloading one detail status with visibility and information quality.

Tasks:

- evolve the current `ReportDetail` schema into separate appearance, information, and comparison dimensions;
- keep run failure independent from non-appearance;
- add structured observed competitors with prompt-level evidence;
- preserve exact answer excerpts and permitted source URLs;
- strengthen identity-aware appearance checks using verified brand names and variants; and
- keep semantic classification inside the existing report call unless live evaluation proves a separate classifier is necessary.

Exit criteria:

- recommendation, mention, absence, failure, accuracy, and comparison cannot be conflated by schema;
- ambiguous or unsupported preference remains explicit rather than promoted to “favored”;
- fixtures demonstrate correct dimension handling without an additional runtime call.

### Batch 3 — Deterministic facts and claim boundaries

Goal: remove arithmetic and scope decisions from Nuave-written prose.

Tasks:

- extend `buildAuditReport` to compute all visible counts and denominators;
- keep five unbranded discovery questions separate from five branded recognition questions;
- compute recommendation, comparison, accuracy, and failed-test summaries separately;
- generate customer-visible metric labels and methodology copy from recorded facts;
- block unscoped “number one,” permanent ranking, consumer ChatGPT equivalence, guaranteed outcome, revenue loss, and unsupported causal claims; and
- add unit tests for denominator, identity, failure, and contradiction cases.

Exit criteria:

- every displayed number is reproducible from retained observations and validated detail classifications;
- the synthesis model never writes or recalculates headline metrics;
- identical validated evidence produces identical facts and method copy.

### Batch 4 — Agency-ready one-call synthesis

Goal: improve business meaning while retaining the existing one-call report path.

Tasks:

- update the schema-constrained report prompt using the compact reporting principles;
- retain `plain-en-v1` unless the accepted writing rules materially require a new version;
- make the conclusion answer the client discovery/recommendation question within the tested scope;
- require each key finding to state what happened and what it may mean;
- limit immediate priorities to three and link each to evidence;
- keep method narrative out of model-authored fields; and
- record report, writing-standard, prompt-contract, requested-model, returned-model, and evidence-export versions.

Exit criteria:

- one initial report call produces schema-valid output for every fixture;
- output is useful to both an agency buyer and a non-technical client reader;
- no model reviewer or subjective revision loop is required;
- exact questions and evidence excerpts remain unchanged.

### Batch 5 — Deterministic validation and protected retry

Goal: prevent polished but unsupported reports from being rendered.

Tasks:

- strengthen structural, arithmetic, provenance, terminology, and prohibited-claim validation;
- distinguish blocking evidence errors from machine-detected writing violations;
- retain one protected `plain-en-v1` language retry only when needed;
- ensure the retry cannot change classifications, evidence IDs, sources, answer excerpts, or protected priority fields;
- re-run all evidence and language validation after the retry; and
- fail clearly rather than manufacture a complete-looking report.

Exit criteria:

- seeded unsupported claims and protected-field mutations are blocked;
- no validation path silently changes facts;
- normal and retry call counts are explicit and tested.

### Batch 6 — Client-ready rendering and export

Goal: present the report with progressive disclosure and minimal agency branding.

Tasks:

- refine **Main Result**, **Key Findings**, **What to Do Next**, **Test-by-Test Results**, and **How This Audit Works**;
- show discovery, recognition, recommendation, comparison, accuracy, and failure separately;
- show direct counts and denominators without a composite score;
- show prepared-for client and optional permitted prepared-by agency identity/logo;
- put exact API/model/web-search details in the method section;
- preserve prominent snapshot limitations, source types, and correction path; and
- verify that collapsed screen, expanded print/PDF, and JSON export use the same report data and versions.

Exit criteria:

- business meaning and actions appear before technical method details;
- internal enums are translated into plain English;
- screen and print pass visual QA with short, long, failed, and partial evidence;
- agency branding cannot hide Nuave's evidence or limitations.

### Batch 7 — Private live evaluation and sample

Goal: determine whether the improved automatic report is credible enough to become one agency-ready sample.

Tasks:

- run the full suite and current engineering checks;
- complete one founder-approved private live audit;
- manually inspect every retained answer, source, classification, finding, and action;
- compare the current and improved outputs without treating either as ground truth;
- measure observation calls, report calls, latency, retries, provider usage/cost, and manual-review time;
- correct evidence or contract failures without publishing client findings without permission; and
- turn the validated result into one concise agency-ready sample with permitted neutral or agency branding.

Exit criteria:

- all integrity gates pass for the live audit;
- the model-call ceiling and protected retry contract hold;
- the same facts appear on screen, in print/PDF, and in the evidence export;
- the result is ready for founder review and later presentation to three to five relevant buyers;
- the unlisted workflow remains private until cost, abuse, privacy, and correction controls exist.

### Batch 8 — Optional internal report-review skill

Goal: improve offline development review without entering the customer runtime path.

Only after the runtime contracts are stable and a recurring internal review need is observed:

- create a `nuave-report-reviewer` skill for internal use;
- make it read the repository contracts rather than duplicate `plain-en-v1` or evidence rules;
- use it to review samples and fixture coverage; and
- keep it out of production report generation.

## 9. Golden Evaluation Cases

The minimum evaluation suite should include:

1. strong non-branded discovery and recommendation;
2. complete branded recognition but weak non-branded discovery;
3. mention without recommendation;
4. recommendation without defensible competitive preference;
5. contradictory repeated runs;
6. one prompt failure in the ten-question run;
7. ambiguous business identity;
8. competitor with higher mention frequency but weaker recommendation status;
9. accuracy issue supported by a reliable source;
10. suspected website/SEO cause without causal evidence;
11. insufficient evidence requiring a partial report or manual review; and
12. long evidence input that tests token and output limits;
13. optional agency branding without permission to publish client findings;
14. regulated-category wording that must not imply quality, safety, or professional advice; and
15. language-only retry attempting to alter a protected classification or excerpt.

Each fixture should define expected facts and prohibited conclusions. Narrative wording should not be snapshot-tested word for word unless the wording itself is contractual.

## 10. Quality Gates

### Integrity

- 100% of displayed metrics match deterministic facts.
- 100% of material findings and actions have valid evidence IDs.
- Branded and non-branded results are never combined incorrectly.
- No unsupported permanent ranking, guarantee, causation, or revenue-loss claim passes validation.

### Usefulness

- The first screen/minute helps the agency explain the client's discovery, recognition, recommendation, competition, and next action where evidence permits.
- The report contains no more than three immediate priorities.
- Each priority states what to do, why it matters, supporting evidence, completion check, and caveat.
- The report can credibly be shown to a client without implying proven agency, client, revenue, lead, resale, or retention outcomes.

### Language

- Plain, natural English under the versioned `plain-en-v1` contract for an agency and non-technical client reader.
- Exact questions, business names, official terms, source titles, and answer excerpts are preserved even when they exceed Nuave-authored writing limits.
- Internal enums, prompt statuses, API language, and unexplained composite scores are not exposed as primary copy.

### Performance and cost

- No iterative model-review loop.
- Report generation uses one initial call in the normal path.
- One protected language-only retry is allowed only when deterministic writing validation fails.
- No separate classification call is added unless private live evidence shows the combined call is unreliable.
- Retry rate, tokens, latency, and model cost are observable per audit.
- Final numerical budgets should be set only after Batch 0 establishes a real baseline.

## 11. Definition of Done

The implementation is complete when:

- the existing `/audit` pipeline works from a verified client brief and approved questions through ten retained observations to a client-visible report and evidence export;
- all contracts and versions are persisted with the report;
- golden fixtures and integrity tests pass;
- report claims are traceable to evidence;
- failure and partial-report paths are tested;
- rendered output passes visual QA;
- model-call, latency, token, retry, and manual-review telemetry is available;
- one founder-approved private live report has passed evidence and permission review;
- the output is suitable as one agency-ready sample without inventing demand or outcomes; and
- this document records the final architecture and operating commands.

## 12. Open Decisions

Resolve these using the current code and fixtures rather than speculation:

1. Whether the existing combined classification-and-writing call assigns mention/recommendation/comparison labels reliably on real retained answers.
2. Whether separate appearance, information, and comparison dimensions require `nuave-report-v3` or can be introduced compatibly.
3. Whether a separate classification call is ever justified by measured quality failure; the default is no.
4. Which configured model and reasoning effort meet report quality at the lowest acceptable cost and latency after the private smoke test.
5. Thresholds for complete, partial, retry, manual inspection, correction, and remedy outcomes.
6. Exact latency and cost budgets after baseline measurement.
7. Whether `plain-en-v1` limits remain useful after direct agency/client comprehension review.

## 13. Decision Log

| Date | Decision | Reason | Status |
|---|---|---|---|
| 2026-08-01 | Use staged implementation rather than a one-shot rewrite | Isolates defects and makes every contract testable | Accepted |
| 2026-08-01 | Use deterministic facts plus one structured synthesis call | Balances integrity, consistency, latency, and cost | Accepted |
| 2026-08-01 | Keep any internal skill outside the production runtime | Prevents an agent workflow from becoming a latency/cost dependency | Accepted |
| 2026-08-01 | Keep final performance budgets open until a private live baseline exists | Builds and mocked tests do not establish live audit quality, latency, or cost | Accepted |
| 2026-08-01 | Treat agencies, SEO/GBP freelancers, and marketing consultants as the working buyer; treat the audited business as their client | Synchronizes the plan with the founder-approved 2026-07-31 product shift | Accepted |
| 2026-08-01 | Use English and the repository's `plain-en-v1` runtime contract for the current unlisted workflow | Synchronizes with the founder-approved 2026-08-01 language decision | Accepted |
| 2026-08-01 | Improve the existing `/audit` workflow in place rather than design a parallel report system | The repository already implements extraction, prompt review, ten observations, report generation, print, and evidence export | Accepted |
| 2026-08-01 | Keep semantic classification in the initial report call unless live evidence demonstrates a reliability problem | Avoids adding latency and cost before the current one-call design is tested | Accepted |

## 14. Application Repository Map

> Active repository: `/Users/yasir/nuave_v0.2`. It currently contains uncommitted user changes; preserve them and inspect overlap before editing.

| Responsibility | Current file/module | Target change |
|---|---|---|
| Audit orchestration and browser-session state | `src/app/audit/AuditWorkflow.tsx`, `src/lib/audit/stream.ts` | Preserve five-stage flow; add only report-related state needed by accepted contract changes |
| Business extraction | `src/app/api/audit/extract/route.ts`, `src/lib/audit/openai.ts` | Keep verified-input boundary; change only if a report defect traces to missing evidence |
| Prompt generation and validation | `src/app/api/audit/prompts/route.ts`, `src/lib/audit/contracts.ts`, `src/lib/audit/openai.ts` | Preserve Intent-5, five unbranded/five branded, human review, and `draft-v2-en` unless evidence requires a version change |
| Ten independent audit observations | `src/app/api/audit/run/route.ts`, `src/lib/audit/openai.ts`, `src/lib/audit/stream.ts` | Preserve exact OpenAI Responses API/model/web-search provenance and failed observations |
| Schemas and report types | `src/lib/audit/types.ts` | Separate appearance, information, and comparison dimensions; tighten priorities to three when implemented |
| Semantic classification and report prompt | `src/lib/audit/openai.ts#generateReportContent` | Improve one-call structured synthesis under the runtime writing contract |
| Counts and evidence export | `src/lib/audit/contracts.ts#buildAuditReport`, `makeEvidenceExport` | Expand deterministic facts, versions, and claim boundaries |
| Evidence validation | `src/lib/audit/contracts.ts#validateReportContent` | Add dimension, competitor, denominator, and prohibited-claim checks |
| Plain-language validation/retry protection | `src/lib/audit/report-language.ts`, `src/app/api/audit/report/route.ts` | Retain `plain-en-v1` and protected retry; extend only with evidenced rules |
| Report rendering and print/PDF | `src/app/audit/ReportView.tsx`, `src/app/audit/audit.module.css` | Improve Main Result hierarchy and agency/client presentation using one report object |
| JSON evidence export | `src/lib/audit/contracts.ts#makeEvidenceExport`, `src/app/audit/AuditWorkflow.tsx` | Preserve full evidence and all contract versions; omit device-local logo data |
| Tests | `src/lib/audit/contracts.test.ts`, `src/lib/audit/openai.test.ts`, `src/lib/audit/stream.test.ts` | Add golden fixtures and new integrity cases |
| Persistence, public delivery, and operational telemetry | Not implemented; browser session only | Do not build accounts/database/hosting now; add only measurements needed for the private experiment |

## 15. Progress Ledger

### 2026-08-01 — Planning session

Completed:

- reviewed the canonical Nuave product context;
- reviewed the full AI Report Improvement Criteria conversation;
- selected the deterministic-facts + one-synthesis-call architecture;
- decomposed implementation into eight testable batches; and
- created this persistent execution plan.

Files changed:

- `NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — created.

Verification:

- document structure reviewed against the product's audit and claims standard;
- no synced file under `sources/` was modified.

Remaining blocker:

- the active application repository had not yet been identified during this first planning entry.

Next action:

- superseded by the context-synchronization entry below.

### 2026-08-01 — Active repository and product-context synchronization

Completed:

- identified `/Users/yasir/nuave_v0.2` as the active local repository;
- read its `AGENTS.md`, latest `README.md`, `docs/NOW.md`, `docs/PRODUCT.md`, `docs/AUDIT.md`, and newest authoritative decisions in `docs/DECISION_LOG.md`;
- confirmed the agency/freelancer/consultant buyer shift and buyer-client separation;
- confirmed the current English-only unlisted workflow and `plain-en-v1` runtime contract;
- inspected the existing report schemas, report call, deterministic validators, protected language retry, counts, renderer, and evidence export; and
- rewrote this plan around improving the existing raw-MVP workflow rather than building a new clinic-owner report system.

Files changed:

- `NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — synchronized with the active repository and product direction.

Verification:

- no file in `/Users/yasir/nuave_v0.2` was modified;
- existing uncommitted repository changes were preserved;
- outdated clinic-owner, Indonesian-runtime, unknown-repository, and parallel-policy assumptions were removed from this plan;
- application module paths were mapped from the current implementation.

Current constraint:

- live workflow quality, cost, latency, and report behavior have not yet been observed; builds and mocked tests are engineering evidence only.

Next action:

- complete Batch 0: run the repository's non-mutating checks and, with a configured API key and one founder-approved public business, perform the private live audit that will determine the exact Batch 1 failing fixtures and contract changes.
