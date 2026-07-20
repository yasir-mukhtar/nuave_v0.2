# EXP-001 — Dental-clinic measurement feasibility

> Status: **SAMPLE LOCKED — no observations collected**
> Protocol version: `exp-001-v0.1`
> Measurement version: `measurement-v0.1`
> Prompt pack: `dental-id-jakarta-v0.1`
> Prepared: 2026-07-19
> Governing documents: [`EXPERIMENTS_AND_GATES.md`](../../docs/v2/EXPERIMENTS_AND_GATES.md), [`MEASUREMENT_SPEC.md`](../../docs/v2/MEASUREMENT_SPEC.md), [`OPERATIONS_RUNBOOK.md`](../../docs/v2/OPERATIONS_RUNBOOK.md), and [`COMPLIANCE_AND_DATA.md`](../../docs/v2/COMPLIANCE_AND_DATA.md)

This is an internal methodology experiment. It is not a customer audit, a free
lead magnet, a case study, or evidence that clinics will pay for Nuave.

## Experiment record

| Field | Pre-registered value |
|---|---|
| ID and dates | `EXP-001`; preparation on 2026-07-19; run dates recorded when execution begins |
| Hypothesis | The v0 identity and prompt design will produce traceable, differentiated observations for single-location dental clinics without requiring fabricated certainty. |
| Governing decision | Gate 0 and EXP-001 in `EXPERIMENTS_AND_GATES.md`; measurement boundary in `MEASUREMENT_SPEC.md` |
| Segment | Publicly identifiable, single-location dental clinics in Jakarta that meet the sampling rules below |
| Variant/control | No customer-facing variant. The fixed operational treatment is one prompt pack, two named grounded API surfaces, and one review rubric. |
| Primary metric | Proportion of sampled clinics for which the protocol produces a reviewable, traceable audit candidate under the pre-registered coverage and truth criteria |
| Guardrails | No guessed identity, patient data, consumer-interface equivalence, universal ranking, unsupported causation, clinical-quality inference, or publication of clinic-specific results |
| Sample/stop rule | One excluded calibration clinic, then 10 evidence clinics. Do not replace weak evidence clinics after observation begins. Stop for a secret exposure, patient data, systematic wrong-entity attribution, unapproved provider configuration, or material clinical-claims risk. |
| Result | Not available |
| Decision | Pending: proceed, revise, change city, narrow promise, or stop |
| Follow-up | Name the execution owner and measurement reviewer, freeze provider and evidence-handling configuration, then run the excluded calibration clinic. |

## Fixed experiment boundary

- **[HYPOTHESIS] City:** Jakarta is the provisional feasibility and artifact
  city. This does not settle the public launch city.
- **[HYPOTHESIS] Working acquisition message:** competitive discovery. It
  shapes the primary customer question but does not change observation rules.
- **[SETTLED] Vertical:** single-location dental clinics.
- **[SETTLED] Surfaces:** OpenAI with web search and Gemini with Google Search
  grounding. The exact model identifiers and supported settings must be frozen
  before calibration.
- **[SETTLED] Measurement claim:** observed visibility within a defined sample,
  not a permanent or personalized AI ranking.
- **[EXPERIMENT] Run design:** 36 planned observations per clinic using
  [`prompt-pack.json`](./prompt-pack.json).
- **[OPEN] Execution owner, measurement reviewer, provider models and settings,
  run spacing, audit-window maximum, secure evidence store, and approved
  retention duration.

## Sample and calibration

The identity-only sample is frozen in
[`sample-manifest.json`](./sample-manifest.json) under
[`SAMPLE_PROTOCOL.md`](./SAMPLE_PROTOCOL.md): 10 evidence clinics, one clinic
reserved for calibration and excluded from the result, and one candidate
excluded before selection because its current official location conflicted with
the Jakarta listing. Provider visibility was not used to select, exclude, order,
or replace subjects.

Use calibration only to verify that the runner, metadata capture, prompt
rendering, identity fields, citations, failure classification, and review
materials work.

After calibration:

1. freeze the protocol, prompt pack, provider configuration, schema, and rubric;
2. confirm the locked evidence membership and identity dossiers without using
   calibration visibility to remove, replace, or reorder a clinic;
3. do not remove or replace a clinic because its result is sparse, unstable,
   uninteresting, or operationally inconvenient; and
4. record every exclusion or replacement made before the first evidence run.

## Run matrix

| Class | Calculation | Planned observations per clinic |
|---|---:|---:|
| Core non-branded discovery | 4 prompts × 3 independent runs × 2 surfaces | 24 |
| Exploratory non-branded | 4 prompts × 1 run × 2 surfaces | 8 |
| Branded accuracy | 2 prompts × 1 run × 2 surfaces | 4 |
| **Total** |  | **36** |

The ten-clinic evidence sample therefore contains 360 planned provider
observations. Source-readiness checks are supporting evidence and are not
counted as a third surface.

## Execution sequence

For each evidence clinic:

1. Freeze its canonical identity dossier and public-source snapshots.
2. Render all prompts from the frozen prompt pack with exact placeholder values.
3. Issue each prompt as an independent request with no shared conversation
   history and no hidden instruction favoring the audited clinic.
4. Preserve every request, response, citation, provider setting, timestamp,
   latency, cost, warning, retry, safety block, and failure using
   [`schemas/observation.schema.json`](./schemas/observation.schema.json).
5. Resolve the audited clinic and every material competitor using the same
   identity standard. Never count an ambiguous or name-only match.
6. Extract observations without editing the raw response.
7. Apply [`REVIEW_RUBRIC.md`](./REVIEW_RUBRIC.md) to identity, coverage,
   variability, findings, inferences, recommendations, and safety.
8. Produce a static report slice showing scope, evidence matrix, branded
   accuracy, contradictions, limitations, and up to three candidate actions.
9. Record review minutes, interventions, cost, latency, and failure causes.

## Pre-registered experimental thresholds

These are decision thresholds for this experiment, not validated product
benchmarks or public claims.

### Proceed candidate

All of the following must be true:

- at least 8 of 10 clinic identities resolve without guessing;
- at least 8 of 10 clinics produce a reviewable audit candidate;
- each reviewable candidate includes both surfaces, at least 10 of 12 successful
  core runs per surface, at least two successful runs for each core prompt per
  surface, and at least 30 of 36 successful observations overall;
- every material finding in the reviewed slices traces to retained observations;
- at least 7 of 10 clinics produce at least one specific, non-generic candidate
  finding under operator review; and
- no critical truth or safety defect remains in a reviewed slice.

An operator's candidate-usefulness judgment is only a Gate 0 proxy. Customer
usefulness and willingness to pay remain unproven until later paid experiments.

### Revise or narrow

Revise the prompt pack, eligibility rule, coverage rule, extraction, review
process, or public promise when the methodology remains plausible but one or
more proceed criteria fail for a diagnosable and reversible reason.

Do not rerun the same 10 clinics under a changed protocol and present the result
as the original experiment. Version the protocol and label any repeat.

### Stop

Stop or fundamentally reconsider the product when the sample shows systematic
wrong-entity attribution, conclusions driven by unresolved entities, provider
behavior too unstable to summarize honestly, mostly generic findings, or a
report that requires unsupported causation or manufactured certainty.

## Required analysis

The result must report denominators and include:

- identity outcomes: resolved, ambiguous, and unresolved;
- successful, failed, blocked, retried, and unevaluable observations by surface;
- full-candidate coverage by clinic;
- appearance and recommendation counts without converting three runs into a
  percentage or permanent ranking;
- material repeated-run contradictions and provider disagreement;
- candidate useful-finding rate using the rubric, including negative cases;
- critical and non-critical QA defects and corrections;
- cost, latency, retries, and operator minutes by clinic and surface; and
- limitations, missing evidence, deviations, and sample-selection constraints.

## Evidence storage and publication boundary

- Versioned protocol, prompts, schemas, rubrics, sanitized results, and evidence
  manifests belong in the repository.
- Raw provider responses and source snapshots belong in restricted evidence
  storage, not Git, analytics, tickets, screenshots, or chat.
- Secrets remain server-side and outside repository history.
- Use only the public business identifiers needed for the experiment. Exclude
  customer contact, payment, patient, and sensitive personal data.
- Clinic-specific results remain internal. Publication, outreach, case-study
  use, or representation as a personalized customer audit requires separate
  permission and applicable review.

## Deliverables and completion

The pre-registration package is complete when:

- this record, prompt pack, sampling protocol, observation schema, and review
  rubric agree on scope and terminology;
- JSON files validate;
- every prompt has a stable ID, class, exact text, rationale, tags, and declared
  placeholders;
- thresholds and stop rules were recorded before model observations; and
- the next operator can reproduce the frozen selection record without relying
  on chat history.

The preparation package and identity sample are now complete. Execution
readiness still requires a named owner and reviewer, exact provider settings,
run timing, an approved restricted evidence store, and an approved retention
period.

EXP-001 itself is complete only after the ten-clinic run, reviewed evidence,
result summary, and decision are recorded. `SAMPLE_LOCKED` is not `PASSED`.

## Acceptance review

- [x] Serves the single-location dental-clinic wedge in provisional Jakarta.
- [x] Preserves competitive discovery as a hypothesis, not a stacked promise.
- [x] Separates provider observation, Nuave inference, and recommended action.
- [x] Prohibits consumer-interface equivalence, universal ranking, causation,
  clinical-quality inference, and outcome guarantees.
- [x] Covers ambiguous identity, missing evidence, provider failure, safety
  blocks, retries, correction, exclusion, and experiment stop paths.
- [x] Excludes secrets, patient data, customer contact data, raw outputs, and
  clinic-specific findings from Git and generic analytics.
- [x] Leaves the launch city, customer usefulness, willingness to pay, provider
  configuration, reviewer, evidence store, and retention decisions explicitly
  unresolved.
- [x] Locks 10 evidence identities and one excluded calibration identity with
  public sources, required fields, and reproducible selection hashes.
- [x] Records the failed Tiga Dental identity candidate instead of silently
  replacing or resolving the current location conflict by assumption.

Review outcome: **APPROVE preparation and identity sample only**. The experiment
has not run, Gate 0 has not passed, and the P1 journey contract remains
incomplete.
