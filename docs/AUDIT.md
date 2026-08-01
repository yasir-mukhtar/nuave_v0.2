# Nuave audit method

> Status: **Current self-service workflow experiment**
> Updated: 2026-07-31
>
> Buyer context: Nuave's current customer is an agency, freelancer, or marketing
> consultant ordering an audit for one client business. The retained dental
> work is methodology evidence, not the definition of Nuave's buyer or proof
> that another vertical is supported.

## Purpose

The raw audit should turn real public information and observed AI responses
into a short, honest, client-ready report. It needs enough structure to be
trustworthy, but not enough machinery to delay the first useful result.

## Measurement statement

Nuave observes selected AI systems across a defined set of questions at a
recorded time. Results can vary by system, model, date, location, language, and
conversation context. The audit is not a permanent, universal, or personalized
AI ranking.

## Raw-MVP scope

For the current agency-ready sample, use:

- one exact, verified client business;
- one user-reviewed ten-question pack from the current prompt method;
- five unbranded and five branded questions;
- ChatGPT on one honestly named execution surface;
- relevant public client and competitor sources;
- the exact run design recorded before execution; and
- automatic report analysis with evidence-reference and count validation.

Name the execution surface as the OpenAI Responses API, exact returned model,
and web-search condition. Do not represent an API, standardized run, or one
account's result as every consumer's personalized ChatGPT experience. Do not
add repetitions, systems, or broad vertical claims unless the current sample
shows why they are needed.

The completed EXP-R1 dental run used a different five-question, two-system
method. Preserve its recorded scope when citing that evidence; do not silently
convert its observations into the current ten-question method.

## Confirm the client business first

Before running questions, record:

- official business name and known variants;
- exact location, branch, or service area;
- public business-listing URL;
- official website or authoritative social profile; and
- public phone or another signal when needed to distinguish similar names.

If identity remains ambiguous, stop or select another business. Never guess
which branch or entity an AI answer refers to.

## Question rules

Generate the current pack through
[`PROMPT_GENERATION_CONTEXT.md`](./PROMPT_GENERATION_CONTEXT.md) and its
repository skill. The user review gate must confirm that:

- the questions sound like ordinary customer language;
- unbranded questions do not leak the client name or a unique identifier;
- branded questions test recognition and factual representation rather than
  inflating discovery;
- every business, service, location, and competitor fact is verified; and
- regulated, clinical-quality, medical-advice, or unsupported superiority
  requests are excluded.

## Capture only what the report needs

For every AI response, save:

- exact question;
- system, execution surface, and model name when available;
- date, time, timezone, language, and location context;
- raw answer or a durable restricted reference to it;
- source links returned by the system;
- whether the selected business appeared;
- whether it was mentioned, compared, or actively recommended;
- named competitors relevant to the finding;
- factual conflicts, missing information, or uncertainty; and
- failure or unavailable-source notes.

A simple document, table, or spreadsheet is enough. Do not create a database or
schema solely for the first run.

Use the following terms consistently:

- **Appearance:** the resolved client business is identifiable in the answer.
- **Mention:** the business is named but is not necessarily proposed.
- **Recommendation:** the answer affirmatively proposes the business for the
  requested need.
- **Non-appearance:** the business was not observed in that specified answer;
  this is not universal absence.
- **Failed test:** the question produced no evaluable answer because of a
  technical, policy, or source failure; this is not non-appearance.

Count one business at most once per answer. Keep recommendation, comparison,
presentation order, sources, and factual accuracy as separate observations.
Use plain-language detail statuses such as `recommended`, `mentioned but not
recommended`, `did not appear`, `incomplete information`, `conflicting
information`, or `could not be tested`.

## Verify sources and conflicts

For factual checks, prefer the exact official website and business listing,
then an applicable authoritative registry or source, then clearly labeled
buyer-supplied facts, then relevant third-party sources. Public availability
does not prove accuracy, and a source returned by ChatGPT does not by itself
validate the claim it supports.

Record conflicting authoritative sources as a finding instead of selecting the
version that makes the report cleaner. Never attribute a competitor fact or
client appearance to a name-only match.

## Turn evidence into findings

Keep three layers separate:

1. **Observation:** what the AI response or public source actually showed.
2. **Interpretation:** a qualified explanation of what the pattern may mean.
3. **Action:** something the client business can complete or delegate.

Example:

- Observation: the official service page lists teeth cleaning, but one AI
  response cited a directory that omitted it.
- Interpretation: the clinic's service information may not be equally clear
  across sources used by the tested system.
- Action: make the service description consistent on the official website and
  priority business profiles, then verify the updates directly.

Do not claim that a source gap caused exclusion unless causal evidence exists.
Do not turn one response into a percentage or stable rank.

## Handle missing and weak evidence

A failed test is never converted into zero visibility or a fabricated result.
Retry only when the method stays the same, record the retry, and disclose any
material timing or configuration change. If coverage is too weak, produce a
clearly partial report, rerun later, or stop. Never fill a report to make it
look complete.

Zero appearance across successful unbranded questions can be a valid result.
State the tested denominator and limitations, confirm that identity and
questions were valid, and do not invent a cause.

## Client-ready report format

Use this five-section sequence for the agency-ready sample:

1. **Ringkasan Audit:** report identity, tested scope, visible counts, separate
   information-accuracy status, a short conclusion, and the snapshot
   limitation.
2. **Temuan Utama:** three to five specific evidence-led findings, including
   contradictory or negative evidence when material.
3. **Prioritas Perbaikan:** a short ordered action list. Each material action
   states what to do, why it matters, its evidence basis, owner, and observable
   completion check. Add effort, confidence, dependency, and caveat when useful.
4. **Temuan Detail:** one entry per tested question containing the finding, the
   exact question (`Pertanyaan yang diuji`), the full answer or clearly marked
   excerpt, status, date, context, and separated source types.
5. **Metode dan Batasan:** identity, systems and surface, dates, language,
   question classes, run and failure handling, automatic-analysis disclosure,
   evidence terms,
   and what the audit does not prove.

Show before the main content:

- audited business, exact branch or service area, and location;
- audit date, language, system, surface, and number of questions;
- prepared for the client business; and
- prepared by the agency when supplied and permitted.

Use direct counts and denominators. Report unbranded discovery, branded
recognition, recommendation, accuracy, and failed tests separately. Do not use
a composite 0–100 score or blend branded recognition into unbranded discovery.

Place the limitation beside the summary, not in fine print: this is a snapshot
of the stated test date, not a permanent ranking or every possible ChatGPT
answer; results may vary by model, time, location, language, and conversation
context, and business information should be verified before a decision.

The report may use neutral presentation or the buyer's basic name and logo.
Branding must not hide the tested scope, evidence, limitations, source types,
or correction path. Keep the report scannable on screen and printable; a PDF
must render the same generated report version rather than a second
interpretation.

If a shorter internal draft is needed before the client-ready version, it may
use this compact review shape:

1. **Scope:** business, date, systems, questions, and limitations.
2. **Summary:** three important observations in plain language.
3. **Evidence table:** question, observed result, competitors, and sources.
4. **Accuracy and source gaps:** only specific, verifiable issues.
5. **Priority actions:** why, owner, effort, and completion check.
6. **Appendix:** raw answers or links to the retained evidence.

## Report acceptance checklist

The workflow must reject machine-checkable evidence failures. During the
private workflow test, inspect the remaining judgment and permission items
before treating the generated report as usable sample evidence:

- the exact client business, branch, and buyer are correct;
- the report identifies who it was prepared for and by;
- every material statement links to an AI observation or public source;
- observation, interpretation, and action are visibly distinct;
- appearance, mention, recommendation, non-appearance, and failure are not
  conflated;
- branded recognition and unbranded discovery remain separate;
- competitors are real and not confused with similarly named businesses;
- failed, contradictory, and missing results remain visible;
- no statement implies permanent ranking or consumer-interface equivalence;
- no clinical-quality, treatment, safety, lead, or revenue claim is made;
- each action is specific, evidence-backed, realistically controllable, and has
  an owner and completion check;
- permissions cover any agency logo and any external use of client identity,
  quotes, screenshots, or findings;
- limitations and any partial coverage are prominent;
- the report can be understood by a non-technical agency and client reader;
  and
- the final screen and PDF, when both exist, show the same facts and report
  version.

Preserve the original evidence. A material correction creates a new report
version with the reason, author, date, and explanation of what changed; it does
not silently rewrite a provider answer or prior delivered report.

## Data boundaries

- Use only the public business information the audit needs and record its
  source and observation date.
- Label buyer-supplied business facts until verified.
- Do not collect patient data or send customer contact, payment, private client
  records, access tokens, or other unnecessary personal data to an AI provider.
- Keep API keys and account credentials outside reports and repository files.
- Keep raw provider responses restricted when they include unnecessary personal
  information or provider metadata.
- Minimize copied third-party content; retain the source link and only the
  excerpt needed for evidence.
- Do not publish a client name, logo, quote, screenshot, or finding, or use it
  in outreach, without the appropriate review and specific permission.

If sensitive personal information is received, stop processing it, restrict
access, do not copy it into another tool or model, and escalate to the founder.
Do not promise permanent report hosting or indefinite data retention.

Before accepting paid orders, use a reliable payment method, state the delivery
promise and limitations, provide a correction or remedy path, and disclose the
minimum applicable privacy and retention terms. Expand these controls when real
orders reveal a need; do not build an enterprise compliance system first.
