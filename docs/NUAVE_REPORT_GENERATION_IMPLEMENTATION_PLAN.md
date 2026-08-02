# Nuave Report Generation — Implementation Plan

> Persistent execution context for implementing the Nuave report-generation pipeline.
>
> **Status:** Batches 0–6 complete; Batch 7 question generation is now deterministic and unpaid
> **Current batch:** Batch 7 — private live evaluation incomplete; no observations, report, or sample produced
> **Next action:** With founder approval, resume the private run at extraction plus the ten observations; make no paid question-generation call.
> **Last updated:** 2026-08-02

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
| 2026-08-01 | Do not inject a default country or timezone into audit web search | The private smoke test exposed a false Indonesia location for a Malaysia-scoped audit; location must come from a future verified structured field | Accepted |
| 2026-08-01 | Keep retained private audit evidence outside the repository and use fictionalized fixtures | Preserves the founder's private-report boundary while allowing observed failure patterns to drive tests | Accepted |
| 2026-08-01 | Use `gpt-5.6-luna` with low reasoning for the cost-capped private smoke test | Provides live behavioral evidence while keeping the run comfortably scoped below the founder's USD 5 ceiling; exact total cost still requires runtime usage telemetry | Accepted |
| 2026-08-01 | Keep known contract gaps executable with Vitest expected-failure tests | The suite remains green without skipping behavior; later batches must remove the expected-failure marker as each gap is implemented | Accepted |

## 14. Application Repository Map

> Active repository: `/Users/yasir/nuave_v0.2`. It currently contains uncommitted user changes; preserve them and inspect overlap before editing.

| Responsibility | Current file/module | Target change |
|---|---|---|
| Audit orchestration and browser-session state | `src/app/audit/AuditWorkflow.tsx`, `src/lib/audit/stream.ts` | Preserve five-stage flow; add only report-related state needed by accepted contract changes |
| Business extraction | `src/app/api/audit/extract/route.ts`, `src/lib/audit/openai.ts` | Keep verified-input boundary; change only if a report defect traces to missing evidence |
| Prompt generation and validation | `src/app/api/audit/prompts/route.ts`, `src/lib/audit/contracts.ts`, `src/lib/audit/openai.ts` | Preserve Intent-5, five unbranded/five branded, human review, and `deterministic-v4-en` unless evidence requires a version change |
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

### 2026-08-01 — Batch 0 baseline and private live smoke test

Completed:

- preserved the existing worktree and mapped the extraction, prompt generation, ten independent observations, one-call report synthesis, protected language retry, validators, counts, screen/print renderer, and JSON evidence export;
- ran a founder-approved private audit with ten reviewed questions and retained all ten completed observations;
- inspected every retained answer, source set, generated classification, finding, priority, and the screen report;
- invoked the print path and confirmed from the shared report object and print styles that all ten detail records are expanded for print;
- recorded report behavior, retry behavior, timing, source volume, and the limits of current cost telemetry; and
- removed the hardcoded Indonesia web-search location, which was not verified for the audited provider, and added a regression test.

Files changed:

- `src/lib/audit/openai.ts` — stopped injecting an unverified provider location into audit searches;
- `src/lib/audit/openai.test.ts` — added the location-integrity regression test;
- `docs/NOW.md` — replaced the pre-run status with observed private-smoke-test status and the next bounded action; and
- `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded Batch 0 evidence, decisions, exit status, and Batch 1 scope.

Verification:

- pre-change `npm run test:audit`: 22 tests passed across 3 files;
- post-fix `npm run test:audit`: 23 tests passed across 3 files;
- `npm run check`: passed typecheck, lint, and formatting; lint reported 304 existing warnings and 0 errors;
- `npm run build`: passed with the `/audit` page and audit API routes included;
- `git diff --check`: passed;
- private run: 10 of 10 observations completed and 0 failed;
- one initial report attempt was deterministically rejected for claiming brand appearance without the brand in the visible answer; one manual report retry then produced a schema-valid report;
- the retained private evidence export remains outside the repository at `/Users/yasir/Downloads/masryef-nuave-evidence.json`, exported `2026-08-01T15:48:55.887Z`, SHA-256 `fd779e9850788109b00e5da8b344e5a7914ddf3fd5b971f01dd841f077b52c34`;
- the screen report rendered without a visible runtime error, and the print action invoked the browser print path without a JavaScript error; no report was published; and
- the run used `gpt-5.6-luna` with low reasoning. Fifteen API calls are directly known across verification and the workflow, with one additional protected language retry possible but not observable. Exact total tokens and USD cost cannot be reconstructed because the current routes discard provider usage.

Observed contract gaps:

- a client-domain citation can cause an unsupported appearance or recommendation classification even when the visible answer never names the client;
- the current detail `status` collapses branded factual recognition, service confirmation, contact information, preparation guidance, comparison, and recommendation into one label;
- run failure remains structurally adjacent to non-appearance instead of being an independent result dimension;
- “needs confirmation” input claims can surface as “needs correction,” overstating what the evidence proves;
- a priority can be justified by a positive observation rather than an observed gap;
- the report request included 366 source references across 253 unique URLs, but request usage, report-call count, retry reason, latency, and cost are not retained as audit telemetry; and
- the existing deterministic appearance validator correctly blocked one unsupported classification, demonstrating that hard evidence boundaries are valuable but incomplete.

Batch 0 exit criteria:

- **Passed:** engineering checks and results are recorded.
- **Passed:** one founder-approved real retained-evidence run exposes current behavior.
- **Passed:** report problems are supported by retained evidence rather than inferred only from code.
- **Passed:** Batch 1 has exact fixtures, files, and behaviors to encode.

Batch 1 test targets:

- add fictionalized fixtures under `src/lib/audit/fixtures/` without copying the private business, answers, or report;
- extend `src/lib/audit/contracts.test.ts` and `src/lib/audit/openai.test.ts` only where the tested responsibility belongs;
- encode that a cited client domain without the visible client name is not appearance, mention, or recommendation;
- encode branded recognition, information accuracy, recommendation, comparison/preference, and run failure as independent expected dimensions;
- encode “needs confirmation” separately from “needs correction”;
- require every immediate priority to cite an observed gap and limit the list to three;
- retain exact evidence IDs, excerpts, and permitted source URLs;
- require direct denominators for unbranded discovery and branded recognition; and
- record the five-section screen/print sequence and `plain-en-v1` limits as explicit tests or review criteria.

Remaining blocker:

- none for Batch 1. Exact cost and retry telemetry remain a later implementation gap, not a fixture blocker.

Next action:

- implement Batch 1 fixtures and expected-failure gap tests while leaving production behavior unchanged.

### 2026-08-01 — Batch 1 privacy-safe fixtures and gap tests

Completed:

- created a fully fictional ten-question golden fixture covering citation-only sourcing, true mention, explicit recommendation, one failed run, branded comparison, factual recognition, conflicting information, and contact guidance;
- recorded the required five-section screen/print sequence and shared-report review criteria;
- added passing tests for the prompt pack, retained evidence, exact excerpts, attached sources, failure visibility, and `plain-en-v1` limits;
- added seven executable expected-failure tests for the missing structured dimensions, confirmation state, three-priority maximum, gap-based priority evidence, and direct denominator labels; and
- kept production behavior unchanged.

Files changed:

- `src/lib/audit/fixtures/report-golden.ts` — added fictional brief, prompts, observations, report content, expected result dimensions, denominator labels, and review criteria;
- `src/lib/audit/report-gaps.test.ts` — added golden validation, seeded integrity failures, and explicit expected-failure gap tests; and
- `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded Batch 1 completion and Batch 2 handoff.

Verification:

- `npm run test:audit`: 27 tests passed and 7 expected failures passed as expected across 4 files;
- `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors;
- `npm run build`: passed with all audit routes and `/audit` included; and
- `git diff --check`: passed before this ledger update.

Batch 1 exit criteria:

- **Passed:** the good fictional fixture validates, and seeded excerpt, source, citation-only appearance, and hidden-failure defects are rejected.
- **Passed:** every desired Batch 2–3 behavior has an explicit test or recorded five-section review criterion.
- **Passed:** production runtime behavior is unchanged by Batch 1.

Remaining blocker:

- none for Batch 2.

Next action:

- implement separate result dimensions in `src/lib/audit/types.ts`, update report generation and validation consumers, and convert the first three expected-failure tests to normal passing tests without adding another model call.

### 2026-08-01 — Batch 2 structured result dimensions

Completed:

- replaced the overloaded detail `status` with independent `run`, `appearance`, `recommendation`, `comparison`, and `information` fields;
- added `needs_confirmation` so unverified input claims are not automatically described as corrections;
- added prompt-linked `observed_competitors` with deterministic name and relationship checks;
- strengthened identity matching so a source URL or citation domain alone cannot count as visible brand appearance;
- blocked hidden visible mentions, recommendations without appearance, comparison or information claims without appearance, run-state mismatches, and assessed dimensions on failed runs;
- protected every new result dimension and observed-competitor record from the language-only retry;
- updated report synthesis instructions and the renderer's summary label without adding a model call; and
- bumped the material output contracts to `nuave-report-v3` and `nuave-evidence-v3` while retaining `plain-en-v1`.

Files changed:

- `src/lib/audit/types.ts` — defined the v3 result and observed-competitor schemas;
- `src/lib/audit/contracts.ts` — added identity, dimension, competitor, and version validation and computed counts from separate dimensions;
- `src/lib/audit/openai.ts` — instructed the existing report call to populate the v3 schema;
- `src/lib/audit/report-language.ts` — protected v3 classifications during a language retry;
- `src/app/audit/ReportView.tsx` — derived a readable detail label from the separate dimensions;
- `src/lib/audit/fixtures/report-golden.ts` — migrated the fictional golden fixture to v3;
- `src/lib/audit/report-gaps.test.ts` — converted four expected gaps into passing tests and added v3 integrity edges;
- `src/lib/audit/contracts.test.ts` — migrated existing contracts and added retry protection coverage; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded current state and the next bounded batch.

Verification:

- `npm run test:audit`: 37 tests passed and 3 expected failures remained across 4 files;
- `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors;
- `npm run build`: passed with all audit routes and `/audit` included; and
- `git diff --check`: passed.

Batch 2 exit criteria:

- **Passed:** recommendation, mention, absence, failure, accuracy, and comparison are independent schema values.
- **Passed:** explicit client preference, competitor preference, comparison without preference, and no comparison are distinct values.
- **Passed:** the fictional fixture and edge tests validate the new dimensions with the existing single report call.

Remaining blocker:

- none for Batch 3.

Next action:

- implement deterministic report facts, direct denominator labels, and prohibited-claim boundaries; convert the denominator expected failure to a normal test.

### 2026-08-01 — Batch 3 deterministic facts and claim boundaries

Completed:

- added a code-owned `facts` object for discovery, recognition, comparison, information, and execution coverage;
- kept both segment denominators at all five planned questions while stating failed runs separately;
- generated direct customer-visible denominator labels and method summary outside model-authored content;
- updated the renderer to use deterministic labels and method copy;
- added contradictions for completed-but-unassessed results and global accuracy claims that conflict with detailed information results;
- blocked permanent or number-one ranking, consumer ChatGPT equivalence, guaranteed outcomes, unsupported revenue loss, and unsupported causal claims in model-authored fields; and
- converted the direct-denominator expected failure into a normal passing test.

Files changed:

- `src/lib/audit/types.ts` — added typed deterministic report facts and method summary;
- `src/lib/audit/contracts.ts` — computed facts, fixed denominators, method copy, contradictions, and prohibited-claim checks;
- `src/app/audit/ReportView.tsx` — rendered code-owned labels and method summary;
- `src/lib/audit/contracts.test.ts` — added deterministic, contradiction, and prohibited-claim coverage;
- `src/lib/audit/fixtures/report-golden.ts`, `src/lib/audit/report-gaps.test.ts` — updated direct denominator expectations; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded Batch 3 and the next action.

Verification:

- `npm run test:audit`: 45 tests passed and 2 expected failures remained across 4 files;
- `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors;
- `npm run build`: passed with all audit routes and `/audit` included; and
- `git diff --check`: passed.

Batch 3 exit criteria:

- **Passed:** every displayed number is reproducible from retained observations and validated v3 details.
- **Passed:** model output contains no headline metric fields; `buildAuditReport` owns facts and method copy.
- **Passed:** identical validated evidence produces identical facts and method copy.

Remaining blocker:

- none for Batch 4.

Next action:

- enforce a three-priority schema, require priority evidence to represent an observed gap, tighten one-call synthesis guidance, and retain requested/returned report-model provenance.

### 2026-08-01 — Batch 4 agency-ready one-call synthesis

Completed:

- limited structured output to at most three immediate priorities;
- required every priority to cite at least one deterministic observed gap rather than only a positive factual result;
- tightened the existing synthesis prompt so the conclusion answers discovery and recommendation within the tested sample and each finding covers what happened and possible business meaning;
- retained the one initial report-call architecture with no classifier or critic call;
- versioned the synthesis prompt as `report-synthesis-v3`; and
- attached prompt contract, requested report model, returned report model, and report response ID to the built report outside model-authored prose.

Files changed:

- `src/lib/audit/types.ts` — enforced three priorities and typed report provenance;
- `src/lib/audit/contracts.ts` — added the synthesis version, gap-based priority validation, and provenance assembly;
- `src/lib/audit/openai.ts` — tightened the single-call prompt and returned provider metadata with parsed content;
- `src/app/api/audit/report/route.ts` — attached final call metadata to the report;
- `src/lib/audit/contracts.test.ts`, `src/lib/audit/report-gaps.test.ts` — converted the last expected failures into normal passing tests and verified provenance; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded Batch 4 and Batch 5 scope.

Verification:

- `npm run test:audit`: 47 tests passed across 4 files with no expected failures;
- `npm run build`: passed with all audit routes and `/audit` included;
- sequential `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors;
- an earlier parallel check collided with the build regenerating `.next`; the sequential rerun after build passed and is authoritative; and
- `git diff --check`: passed.

Batch 4 exit criteria:

- **Passed:** one initial schema-constrained call remains the normal report path.
- **Passed:** the fictional fixture is useful to an agency/client reader and retains exact questions and excerpts.
- **Passed:** no model reviewer or subjective revision loop exists.
- **Passed:** prompt, schema/report, writing, model, prompt-pack, and evidence-export provenance are retained.

Remaining blocker:

- none for Batch 5.

Next action:

- expose report call count, language retry status/reason, and initial/final response provenance; add route-level tests for evidence-blocking and protected retry paths.

### 2026-08-01 — Batch 5 deterministic validation and protected retry

Completed:

- extracted report orchestration into a testable pipeline with a thin HTTP route;
- kept evidence, provenance, contradiction, and prohibited-claim failures blocking and non-retriable;
- retained exactly one retry only for machine-detected `plain-en-v1` violations;
- reran protected-field, evidence, and language validation after the retry;
- recorded report call count, retry status, triggering writing violations, initial response ID, and final response ID; and
- returned validation failures as 422 responses without manufacturing a report.

Files changed:

- `src/lib/audit/report-pipeline.ts` — added the validated one-call/one-retry orchestration;
- `src/lib/audit/report-pipeline.test.ts` — covered normal, evidence-blocking, writing-retry, and protected-mutation paths;
- `src/app/api/audit/report/route.ts` — delegated to the validated pipeline and preserved validation status;
- `src/lib/audit/types.ts`, `src/lib/audit/contracts.ts` — added explicit call/retry provenance; and
- `src/lib/audit/contracts.test.ts`, `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — updated assertions and execution memory.

Verification:

- `npm run test:audit`: 51 tests passed across 5 files;
- `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors;
- `npm run build`: passed with all audit routes and `/audit` included;
- one earlier build stream detached while retaining Next's lock; the process was allowed to finish, no lock was removed, and the subsequent authoritative build passed; and
- `git diff --check`: passed before this ledger update.

Batch 5 exit criteria:

- **Passed:** unsupported claims and protected-field mutations are blocked.
- **Passed:** no validation path changes facts.
- **Passed:** normal and retry call counts are explicit and tested.

Remaining blocker:

- none for Batch 6.

Next action:

- create a local fixture-only rendering path or equivalent test harness, inspect the v3 screen and print output, and verify the JSON export contract without using private live evidence.

### 2026-08-01 — Batch 6 client-ready rendering and export

Completed:

- rendered the fictional v3 golden report through the real `ReportView` using a temporary local-only fixture route;
- verified the five customer sections, business-first hierarchy, direct denominators, agency attribution, snapshot limitation, failed-result wording, and source links;
- confirmed 10 collapsed screen disclosures and 10 expanded print detail sections use the same report object;
- verified the v3 export retains facts, provenance, observations, and sources while replacing device-local logo data; and
- removed the temporary fixture route and regenerated the final production manifest.

Files changed:

- `src/lib/audit/contracts.test.ts` — added complete v3 export and local-logo omission coverage;
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded Batch 6 and the Batch 7 prerequisite;
- no temporary fixture route remains in the worktree.

Verification:

- visual QA: five sections in order, 10 screen details, 10 print details, readable accented primary metric, three priorities, and visible `Harbor Studio` prepared-by identity;
- `npm run test:audit`: 52 tests passed across 5 files;
- final `npm run build`: passed and exposes only `/audit` plus its four audit APIs;
- final sequential `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors; and
- `git diff --check`: passed.

Batch 6 exit criteria:

- **Passed:** business meaning and actions precede technical method details.
- **Passed:** internal enums render as plain-English result labels.
- **Passed:** screen and print handle short, failed, and partial fictional evidence.
- **Passed:** agency identity does not hide Nuave's evidence, limitations, or method.

Batch 7 prerequisite:

- another paid live audit is not safe yet because the founder capped this run at USD 5 and Batch 0 proved the current workflow discarded cumulative provider usage. Add usage/cost retention and an enforceable ceiling before another API call.

Next action:

- implement usage, call, retry, latency, and estimated-cost telemetry for extraction, prompts, observations, and report synthesis; then run the founder-approved private v3 evaluation without publishing its findings.

### 2026-08-01 — Batch 7 cost control and private live evaluation

Completed:

- pinned private audit calls to `gpt-5.6-luna` on the standard service tier and retained provider usage, latency, response IDs, retries, web-search calls, and accounted cost for every stage;
- enforced the founder's USD 5 ceiling with conservative preflight reservations, including the full Luna input allowance for web-search calls;
- added per-session stage ceilings of 1 extraction, 1 prompt generation, 10 observations, and 3 report calls for future runs;
- completed one private Masryef extraction, human brief review, ten-question review, and ten independent observations without publishing or writing client findings into the repository;
- raised the report output allowance to 40,000 tokens after live 10,000- and 20,000-token structured-output exhaustion;
- moved observable run, brand appearance, impossible dependent states, exact excerpts, allowed source links, and competitor evidence links into deterministic normalization; and
- stopped the live run when report synthesis still failed the structured-output or evidence gates.

Sources and observation date:

- OpenAI standard pricing: `https://developers.openai.com/api/docs/pricing`, observed 2026-08-01;
- Luna model limits: `https://developers.openai.com/api/docs/models/gpt-5.6-luna`, observed 2026-08-01;
- live audit source/query: `https://masryef.com`, observed privately 2026-08-01; no client answer, finding, or report content is stored in this repository.

Private live result:

- 19 API calls were retained: 1 extraction, 1 prompt generation, 10 observations, and 7 report synthesis attempts made while diagnosing the live blocker;
- the final accounted cost was USD 0.3483 against the USD 5 ceiling;
- all ten observations completed, but report attempts either exhausted the structured-output allowance or were rejected for evidence/classification mismatches;
- the last attempt returned no usable structured report, so no report, PDF, evidence export, or buyer-facing sample was produced or published; and
- exact aggregate tokens and full latency could not be exported because the report screen was never reached. The retained browser ledger proved call count and cost, but this is not sufficient for a passing sample.

Files changed in the Batch 7 correction:

- `src/lib/audit/telemetry.ts`, `src/lib/audit/telemetry.test.ts` — pricing, usage telemetry, USD ceiling, output caps, and stage call ceilings;
- `src/lib/audit/types.ts`, `src/lib/audit/fixtures/telemetry.ts` — operational telemetry contracts and fixtures;
- `src/lib/audit/openai.ts`, four audit API routes, and `src/app/audit/AuditWorkflow.tsx` — retained call telemetry and budget chaining;
- `src/lib/audit/contracts.ts`, `src/lib/audit/report-pipeline.ts`, and their tests — deterministic evidence normalization and protected report validation; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded the private result without client findings.

Verification:

- `npm run test:audit`: 62 tests passed across 6 files;
- `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors;
- `npm run build`: passed with `/audit` and all four audit API routes; and
- the live ledger stopped at USD 0.3483, below the founder's USD 5 maximum.

Batch 7 exit criteria:

- **Passed:** the cost ceiling, retained failed-call cost, and future per-stage call ceilings fail closed.
- **Passed:** the private workflow, questions, and ten observations remained unlisted and unpublished.
- **Failed:** no live report cleared every integrity gate.
- **Failed:** screen, print/PDF, export, and buyer-sample equality could not be checked because no report rendered.

Remaining blocker:

- the monolithic report schema asks the model to generate both deterministic evidence fields and customer narrative. Medium reasoning can consume 40,000 output tokens without parseable data, while completed drafts still vary on protected classifications. Another paid live run is not justified until that schema is reduced and the code-owned fields are removed from model authorship.

Next action:

- keep Batch 8 optional and out of scope; first redesign the Batch 7 report call so the model authors only compact conclusion, findings, and actions around code-owned details, then prove the long-output and incomplete-structured cases offline before requesting another private audit.

### 2026-08-01 — Batch 7 compact synthesis correction

Completed offline after the gated live run:

- replaced the monolithic model-authored report object with a compact synthesis containing conclusion, accuracy status, findings, priorities, and recommendation/comparison/information assessments only;
- moved run state, visible brand appearance, exact retained excerpts, attached source URLs, detail wording, and verified-competitor links entirely into code-owned assembly;
- required exactly one compact assessment for each retained prompt ID;
- changed report synthesis back to low reasoning and reduced its output cap from 40,000 to 16,000 tokens because deterministic evidence fields are no longer generated by the model;
- retained the existing evidence validator and protected language-retry checks around the assembled full report; and
- added a fictional compact-synthesis assembly test that passes the full v3 evidence contract.

Verification:

- `npm run test:audit`: 63 tests passed across 6 files;
- `npm run check`: passed typecheck, lint, and formatting; lint retained 304 existing warnings and 0 errors;
- final `npm run build`: passed with `/audit` and all four audit API routes; and
- no API call was made for this correction.

Remaining blocker:

- the compact contract has not run against live retained evidence. A fresh browser session would reset its visible cost ledger, so the previous USD 0.3483 must be treated as carry-over and the new run must be capped to the remaining USD 4.6517 before any further API call.

Next action:

- after explicit founder approval, run one fresh private Masryef audit with a USD 4.6517 remaining ceiling, stop at the new three-report-call limit, and only produce a sample if screen, print, export, and every integrity gate pass.

### 2026-08-02 — Batch 7 cross-session carry-over guard

Completed without a paid API call:

- added `carryover_cost_usd` to the run budget and final operational telemetry;
- added server-only `OPENAI_AUDIT_CARRYOVER_COST_USD` configuration, validated from USD 0 through the USD 5 ceiling;
- made the server enforce the greater of its configured carry-over and the browser-submitted value, so the browser cannot lower historical spend;
- added a read-only budget bootstrap on `GET /api/audit/extract` and blocked paid UI actions until it succeeds;
- included carry-over in preflight reservation, report telemetry, total accounted cost, and the visible remaining amount; and
- documented the guarded resume command without writing the value into a tracked runtime environment file.

Files changed:

- `src/lib/audit/types.ts` — added carry-over to the budget and report telemetry contracts;
- `src/lib/audit/telemetry.ts`, `src/lib/audit/telemetry.test.ts`, `src/lib/audit/fixtures/telemetry.ts` — added server configuration, effective-budget accounting, and fail-closed coverage;
- `src/lib/audit/report-pipeline.ts` — included the server-enforced carry-over in final report telemetry;
- `src/app/api/audit/extract/route.ts` — exposed the read-only budget bootstrap;
- `src/app/audit/AuditWorkflow.tsx` — bootstrapped, displayed, persisted through requests, and enforced the carry-over before paid actions;
- `.env.example`, `README.md` — documented the direct Luna default and optional carry-over setting; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded the current gate and exact next action.

Verification:

- `npm run test:audit`: 65 tests passed across 6 files;
- `npm run build`: passed with `/audit` and the four audit API routes;
- authoritative sequential `npm run check`: passed typecheck, lint, and formatting with 304 existing warnings and 0 errors;
- one earlier parallel check collided with the build regenerating `.next`; the post-build sequential check passed and is authoritative;
- `git diff --check`: passed after the ledger update;
- local visual QA with `OPENAI_AUDIT_CARRYOVER_COST_USD=0.3483`: `0 API calls · USD 0.3483 accounted of USD 5.00 · USD 4.6517 remaining · USD 0.3483 carried over`; and
- no OpenAI API call, private report generation, export, publication, commit, push, or deployment occurred.

Batch 7 status:

- **Passed:** prior paid spend is now enforced across a fresh local browser session.
- **Passed:** the next session cannot begin a paid action before the server budget bootstrap succeeds.
- **Still open:** the compact synthesis has not passed a founder-approved live report, and no agency-ready sample exists.

Remaining blocker:

- explicit founder approval is required before spending against the USD 4.6517 remaining ceiling and using Masryef in another private audit.

Next action:

- after approval, start `OPENAI_AUDIT_CARRYOVER_COST_USD=0.3483 npm run dev`, run one private Masryef audit, stop at three report calls, and accept a sample only if every live integrity, screen, print, and export criterion passes.

### 2026-08-02 — Batch 7 fresh private Masryef attempt

Founder approval received:

- one fresh private Masryef audit;
- USD 0.3483 carried over from the prior run; and
- maximum USD 4.6517 additional spend, with no publication or external transmission beyond the configured OpenAI calls required by the audit.

Observed result:

- started the guarded local workflow with `OPENAI_AUDIT_CARRYOVER_COST_USD=0.3483`;
- confirmed the browser-visible bootstrap before the paid action: zero new calls, USD 0.3483 accounted, and USD 4.6517 remaining;
- submitted `https://masryef.com` as the official public source;
- the single extraction call completed at the provider but returned no usable parsed structured output, so the API route returned HTTP 502 and the workflow showed its extraction integrity error;
- the completed call accounted for USD 0.0263, bringing cumulative accounted spend to USD 0.3746 and leaving USD 4.6254 under the founder's total USD 5 ceiling; and
- stopped immediately at the one-call extraction-stage ceiling. No prompt-generation, observation, report, print, PDF, export, sample, publication, commit, push, or deployment action followed.

Evidence separation:

- the repository records only the operational result, source domain, date, and cost accounting;
- no extracted client facts, model response content, or private report finding was written to Git; and
- the failure was observed on 2026-08-02 through the local `/audit` workflow using the configured `gpt-5.6-luna` OpenAI Responses API path.

Batch 7 status:

- **Passed:** the cross-session carry-over and remaining-spend guard held before and after the paid call.
- **Passed:** the extraction failure stopped the workflow before unreviewed facts could reach later stages.
- **Still open:** the extraction path did not produce a reviewable brief, the compact report path was not reached, and no agency-ready sample exists.

Offline verification after recording the run:

- `npm run test:audit`: 65 tests passed across 6 files;
- `npm run check`: passed typecheck, lint, and formatting with 304 existing warnings and 0 errors;
- `npm run build`: passed with `/audit` and all four audit API routes; and
- `git diff --check`: passed.

Next action:

- diagnose the null structured extraction result with fixtures and mocked provider responses, make only an offline correction that preserves the one-call and spend ceilings, and rerun the audit test/check/build gates before requesting approval for another paid attempt.

### 2026-08-02 — Batch 7 null-extraction manual fallback

Observed evidence and bounded diagnosis:

- the failed fresh run retained completed-call usage and cost, but did not retain the provider response body or completion reason;
- therefore the repository cannot truthfully claim whether the null parsed output came from an output limit, content filtering, refusal, or another provider completion state; and
- the confirmed workflow defect was narrower: any completed extraction response without parsed structured output returned HTTP 502 and left no manual continuation path, despite the one-call stage ceiling prohibiting a paid retry.

Completed offline:

- replaced the null-output exception in extraction with a manual-review draft;
- retained only founder-entered brand, market, category, and official URL values in that fallback;
- discarded all unparsed provider content, extracted evidence, offerings, needs, and other unsupported fields;
- added a visible warning that identifies an available safe provider state such as output-limit or incomplete status without copying provider content;
- required the founder to complete and verify every required field against the official website before approving the brief;
- preserved normal parsed drafts unchanged; and
- made no automatic retry, second extraction call, API call, or change to the existing one-call and USD 5 guards.

Files changed:

- `src/lib/audit/openai.ts` — added the manual fallback and replaced the null-output exception for extraction only;
- `src/lib/audit/openai.test.ts` — added mocked completed-null, incomplete-output-limit, and valid-parsed response cases; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded the correction and next approval gate.

Verification:

- `npm run test:audit`: 68 tests passed across 6 files;
- `npm run check`: passed typecheck, lint, and formatting with 304 existing warnings and 0 errors;
- `npm run build`: passed with `/audit` and all four audit API routes;
- the fallback is parsed by `extractionDraftSchema` and reuses the already-rendered warning and editable human-review brief; and
- no OpenAI API call, private report action, publication, commit, push, or deployment occurred.

Batch 7 status:

- **Passed offline:** a null parsed extraction can continue through explicit human fact entry without a second extraction call.
- **Passed offline:** unparsed model content cannot become client facts or evidence.
- **Still open:** the correction has not run live, the compact report path has not passed live, and no agency-ready sample exists.

Next action:

- after fresh founder approval, start a private Masryef run with `OPENAI_AUDIT_CARRYOVER_COST_USD=0.3746`, cap remaining spend at USD 4.6254, review every fallback or extracted fact manually, and accept a sample only if every later integrity, screen, print, and export criterion passes.

### 2026-08-02 — Batch 7 final automated Masryef attempt

Founder approval received:

- try the private Masryef audit one more time;
- carry forward USD 0.3746 under the existing USD 5 ceiling; and
- stop for a founder-led manual path if the automated attempt fails.

Observed result:

- confirmed the server-enforced bootstrap at USD 0.3746 carried over and USD 4.6254 remaining;
- supplied the verified brand name, Kuala Lumpur market, and business category before extraction;
- the one extraction call reached its output limit, and the new correction correctly opened the warned manual-review brief instead of returning HTTP 502;
- manually completed and approved the remaining public business facts inside the private workflow;
- the one permitted question-generation call completed without usable parsed structured data, so the API returned HTTP 502 and no question pack was retained; and
- stopped immediately without retrying. No observations, report synthesis, print, PDF, evidence export, sample, publication, commit, push, or deployment followed.

Cost result:

- extraction moved cumulative accounted spend from USD 0.3746 to USD 0.3998;
- question generation moved it to USD 0.4062; and
- USD 4.5938 remained under the founder's cumulative USD 5 ceiling when the automated run stopped.

Evidence separation:

- no manually entered client facts, provider response content, questions, findings, or report content were written to the repository;
- the repository records only the source domain, date, stage outcomes, API route statuses, and aggregate cost; and
- the local server and private browser tab were closed after the failure.

Batch 7 status:

- **Passed live:** carry-over, spend accounting, one-call stage ceilings, and the null-extraction manual fallback held.
- **Passed live:** no unparsed extraction or question-generation content reached later audit stages.
- **Failed live:** question generation produced no usable structured pack, so the audit could not run observations or generate a report.
- **Still open:** no agency-ready sample exists.

Next action:

- stop further automated paid attempts. If the founder still wants the Masryef sample, proceed through a separately reviewed manual audit process and request help only for the bounded manual step needed; do not resume API spending without new explicit approval.

### 2026-08-02 — Batch 7 compact question-only correction

Founder decision:

- accept a smaller question-generation contract in which the model authors only the ten question strings;
- keep the existing review screen, fixed Intent-5 matrix, provenance, safety checks, and downstream `PromptPack`; and
- mitigate lost model rationale and self-reporting through code-owned metadata, deterministic checks, minimum verified context, and human approval.

Completed offline:

- introduced `draft-v3-en` with one compact structured output: an ordered array of exactly ten question strings;
- reduced question-generation reasoning from low to none by default and the output ceiling from 5,000 to 3,000 tokens;
- supplied each question spec only the minimum verified context selected for its fixed matrix role instead of the entire brief;
- withheld brand identity from unbranded question contexts and supplied the verified competitor only to `NUAVE-BRAND-COMPARISON-02`;
- assembled IDs, categories, roles, branded flags, deterministic rationales, `inputs_used`, review status, brand summary, counts, self-checks, and warnings in code;
- preserved the existing full `PromptPack` returned to the UI and later observation/report stages;
- rejected brand leakage, competitor leakage outside the designated comparison, duplicate questions, missing question marks, multiple requests expressed through multiple question marks, and unsupported best/safest/most-trusted premises before review; and
- retained mandatory human review for every question.

Files changed:

- `src/lib/audit/types.ts` — added the ten-string compact response schema and type;
- `src/lib/audit/contracts.ts`, `src/lib/audit/contracts.test.ts` — added minimum-context specs, deterministic full-pack assembly, `draft-v3-en`, and guardrail tests;
- `src/lib/audit/openai.ts`, `src/lib/audit/openai.test.ts` — switched the live request to compact output with no default reasoning and preserved provider telemetry;
- `src/lib/audit/telemetry.ts`, `src/lib/audit/telemetry.test.ts` — reduced and tested the question output ceiling; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md` — recorded the correction and approval gate.

Verification:

- `npm run test:audit`: 75 tests passed across 6 files;
- `npm run check`: passed typecheck, lint, and formatting with 304 existing warnings and 0 errors;
- `npm run build`: passed with `/audit` and all four audit API routes;
- the assembled `PromptPack` passes its existing Zod schema and downstream validator; and
- no OpenAI API call, private audit action, publication, commit, push, or deployment occurred.

Batch 7 status:

- **Passed offline:** the model no longer authors redundant prompt-pack metadata, provenance, counts, or self-checks.
- **Passed offline:** the full UI and downstream prompt contract remain available after deterministic assembly.
- **Passed offline:** compact-output and context-isolation guardrails are executable and tested.
- **Still open:** `draft-v3-en` has not run live, the compact report path has not passed live, and no agency-ready sample exists.

Next action:

- obtain explicit founder approval before any further paid run. If approved, start with `OPENAI_AUDIT_CARRYOVER_COST_USD=0.4062`, retain the USD 5 cumulative ceiling, and stop if the compact question or later integrity gates fail.

### 2026-08-02 — Batch 7 compact question-only live retry

Founder approval received:

- retry the private Masryef test using `draft-v3-en`;
- carry forward USD 0.4062 under the existing cumulative USD 5 ceiling; and
- continue only while every stage integrity gate passes.

Observed result:

- confirmed the guarded bootstrap at USD 0.4062 carried over and USD 4.5938 remaining;
- the single extraction call again reached its output limit, and the manual fallback again opened correctly;
- manually completed and approved the same public Masryef brief inside the private workflow;
- the `draft-v3-en` call used the ten-string-only structured schema, no default reasoning, minimum per-question context, and a 3,000-token output ceiling;
- the call still returned no usable parsed structured output, so the prompt API returned HTTP 502 and no question pack was retained; and
- stopped immediately at the one-call question ceiling. No observations, report calls, print, PDF, evidence export, sample, publication, commit, push, or deployment followed.

Cost result:

- extraction moved cumulative accounted spend from USD 0.4062 to USD 0.4317;
- compact question generation moved it to USD 0.4357;
- the roughly USD 0.0040 question-call increment is consistent with consuming the 3,000-token output allowance plus input, but exact token breakdown and provider completion details were not exported; and
- USD 4.5643 remained under the cumulative USD 5 ceiling when the run stopped.

Interpretation:

- reducing the structured schema removed redundant model authorship but did not make Luna structured question generation reliable in this live path;
- network, brief validation, and preflight budget failure are ruled out because the provider call completed, cost was retained, and the route reached the null parsed-output guard; and
- output exhaustion remains the strongest explanation, but it is an inference because response status, incomplete reason, and token breakdown are not retained outside the closed browser session.

Batch 7 status:

- **Passed live:** carry-over, spend accounting, one-call ceilings, manual extraction fallback, and fail-closed handling held.
- **Failed live:** `draft-v3-en` produced no usable question pack.
- **Not reached:** observations, compact report generation, screen/print/export comparison, and sample review.

Next action:

- make no further paid structured question-generation attempt. The smallest reliable raw-MVP option is to assemble all ten questions deterministically from the verified brief and fixed matrix without an API call; an unstructured model-text fallback would require separate approval and stronger parsing/review controls.

### 2026-08-02 — Batch 7 deterministic code-owned question pack

Independent review of the question-generation failure.

Observed evidence:

- the installed OpenAI SDK (`openai` 7.2.0, `lib/ResponsesParser.js`) sets `output_parsed` to `null` in exactly three cases: the response status is present and not `completed`; no `output_text` message item is returned; or the only message content is a refusal. A schema-invalid payload throws instead of returning null;
- the live failure reached `parsedOrThrow`, so the provider call itself completed, telemetry was retained, and the failure was one of those three cases; and
- the retained telemetry did not include provider status, incomplete reason, or the output shape, so which case occurred was not recorded.

Interpretation:

- output exhaustion remains the most likely explanation and is consistent with the roughly USD 0.0040 increment, but it is still an inference. The confirmed defect is narrower: question generation had no path to a reviewable pack unless a provider returned parsed structured output, and the retained diagnostics could not attribute the failure.

Implemented correction:

- questions are now built in code. `src/lib/audit/questions.ts` derives ten ordered question drafts from the verified brief and the fixed Intent-5 matrix, with per-question fallbacks for briefs that carry only the required fields;
- the prompt contract version moved from `draft-v3-en` to `deterministic-v4-en` so report provenance does not imply model-authored questions;
- `assemblePromptPack` now takes code-owned drafts, rejects any question that used an input outside its matrix scope, derives the rationale from the fields the question actually used, and still fails closed on the existing leakage, duplication, single-request, and unsupported-premise rules;
- `/api/audit/prompts` no longer accepts a budget or safety identifier, makes no OpenAI call, and returns no call telemetry;
- `generatePromptPack` was removed from `openai.ts`, and the prompts stage ceiling is now zero calls, so a future accidental question call fails closed before any spend; and
- audit call telemetry now retains `provider_status`, `incomplete_reason`, `output_text_present`, and `refusal_present`, and a failed structured parse on the remaining report path explains the provider state in its error message. No provider-authored content is retained.

Deliberately retained:

- the fixed matrix, prompt IDs and order, five branded and five unbranded questions, two per category, competitor isolation, mandatory human review, the editable review screen, and the full `PromptPack` consumed by the observation runner, report, and evidence export.

Deliberately removed:

- the paid question-generation call, its structured `questionTextPackSchema`, its prompt instructions, and its output-token allowance.

Files changed:

- `src/lib/audit/questions.ts`, `src/lib/audit/questions.test.ts` (new);
- `src/lib/audit/contracts.ts`, `src/lib/audit/contracts.test.ts`;
- `src/lib/audit/telemetry.ts`, `src/lib/audit/telemetry.test.ts`, `src/lib/audit/fixtures/telemetry.ts`;
- `src/lib/audit/openai.ts`, `src/lib/audit/openai.test.ts`, `src/lib/audit/types.ts`;
- `src/app/api/audit/prompts/route.ts`, `src/app/audit/AuditWorkflow.tsx`, `src/app/audit/AuditStages.tsx`; and
- `docs/NOW.md`, `docs/NUAVE_REPORT_GENERATION_IMPLEMENTATION_PLAN.md`.

Verification:

- `npm run test:audit`: 93 tests passed across 7 files;
- `npm run check`: passed typecheck, lint, and formatting with 304 existing warnings and 0 errors;
- `npm run build`: passed with `/audit` and all four audit API routes;
- `git diff --check`: clean; and
- no OpenAI API call, private audit action, publication, commit, push, or deployment occurred.

Batch 7 status:

- **Passed offline:** the ten-question pack is produced without a provider call, without telemetry, and without any budget movement.
- **Passed offline:** matrix order, category counts, branded split, brand and competitor isolation, provenance, single-request wording, premise safety, and full `PromptPack`/report/export compatibility are executable tests.
- **Not verified:** the question review screen was not visually inspected, because it is only reachable after the one paid extraction call. The pack shape the screen consumes is unchanged apart from the rationale line.
- **Still open:** the compact report path has not passed live, and no agency-ready sample exists.

Next action:

- request founder approval to resume the private Masryef run with `OPENAI_AUDIT_CARRYOVER_COST_USD=0.4357`. That run should spend on one extraction call and ten observations only, and stop at the report gates as before.
