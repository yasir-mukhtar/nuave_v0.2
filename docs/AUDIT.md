# Nuave audit method

## Purpose

The raw audit should turn real public information and observed AI responses
into a short, honest report. It needs enough structure to be trustworthy, but
not enough machinery to delay the first useful result.

## Measurement statement

Nuave observes selected AI systems across a defined set of questions at a
recorded time. Results can vary by system, model, date, location, language, and
conversation context. The audit is not a permanent, universal, or personalized
AI ranking.

## Raw-MVP scope

For the active experiment, use:

- one verified dental clinic;
- five realistic customer questions;
- up to two available AI systems with web or source access;
- relevant public clinic and competitor sources;
- one independent run per question and system; and
- manual review of every observation and report statement.

Repetition, larger clinic samples, and automated extraction can be added only
after the first report shows why they are needed.

## Confirm the clinic first

Before running questions, record:

- official clinic name and known variants;
- exact single location and city;
- public business-listing URL;
- official website or authoritative social profile; and
- public phone or another signal when needed to distinguish similar names.

If identity remains ambiguous, stop or select another clinic. Never guess which
branch an AI answer refers to.

## Five-question starter set

Use or adapt these to the selected clinic and city:

1. General discovery: recommended dental clinics in the city.
2. Customer context: clinics a family or new patient could consider.
3. Service intent: clinics publicly mentioning one relevant service.
4. Comparison: clinics that can be compared using verifiable public facts.
5. Branded accuracy: verifiable information about the selected clinic.

Use ordinary customer language. Do not seed the clinic name into discovery
questions. Do not ask the system to assess treatment quality or give medical
advice.

## Capture only what the report needs

For every AI response, save:

- exact question;
- system and model name when available;
- date, time, language, and city context;
- raw answer or a durable restricted reference to it;
- source links returned by the system;
- whether the selected clinic appeared;
- whether it was mentioned, compared, or actively recommended;
- named competitors relevant to the finding;
- factual conflicts, missing information, or uncertainty; and
- failure or unavailable-source notes.

A simple document, table, or spreadsheet is enough. Do not create a database or
schema solely for the first run.

## Turn evidence into findings

Keep three layers separate:

1. **Observation:** what the AI response or public source actually showed.
2. **Interpretation:** a qualified explanation of what the pattern may mean.
3. **Action:** something the clinic can complete or delegate.

Example:

- Observation: the official service page lists teeth cleaning, but one AI
  response cited a directory that omitted it.
- Interpretation: the clinic's service information may not be equally clear
  across sources used by the tested system.
- Action: make the service description consistent on the official website and
  priority business profiles, then verify the updates directly.

Do not claim that a source gap caused exclusion unless causal evidence exists.
Do not turn one response into a percentage or stable rank.

## Short report format

1. **Scope:** clinic, date, systems, questions, and limitations.
2. **Summary:** three important observations in plain language.
3. **Evidence table:** question, observed result, competitors, and sources.
4. **Accuracy and source gaps:** only specific, verifiable issues.
5. **Three actions:** why, owner, effort, and completion check.
6. **Appendix:** raw answers or links to the retained evidence.

Do not use a composite visibility score in the first reports.

## Review checklist

Before showing the report:

- the exact clinic and branch are correct;
- every material statement links to an AI observation or public source;
- observation, interpretation, and action are visibly distinct;
- competitors are real and not confused with similarly named businesses;
- failed, contradictory, and missing results remain visible;
- no statement implies permanent ranking or consumer-interface equivalence;
- no clinical-quality, treatment, safety, lead, or revenue claim is made;
- the three actions are specific and realistically controllable; and
- the report can be understood by a non-technical owner.

If the evidence is weak, produce a clearly partial result or stop. Never create
a complete-looking report by filling gaps with invented certainty.

## Data boundaries

- Use public business information only for the internal raw experiment.
- Do not collect or send patient data.
- Keep API keys and account credentials outside reports and repository files.
- Keep raw provider responses restricted when they include unnecessary personal
  information or provider metadata.
- Do not publish clinic-specific findings or use them in outreach without the
  appropriate review and permission.

Before accepting paid orders, use a reliable payment method, state the delivery
promise and limitations, provide a correction or remedy path, and disclose the
minimum applicable privacy and retention terms. Expand these controls when real
orders reveal a need; do not build an enterprise compliance system first.
