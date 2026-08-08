# Nuave audit method

> Status: **Current self-service workflow experiment**
> Updated: 2026-08-08
>
> Customer context: Nuave's customer is the owner of a small or medium
> Indonesian business, ordering an audit of their own business. The retained
> dental work is methodology evidence, not proof that another vertical is
> supported. This document derives from [`VISION.md`](./VISION.md); where they
> disagree, the vision governs.

## Purpose

The raw audit should turn real public information and observed AI responses
into a short, honest report an Indonesian business owner can read in ten
minutes. It needs enough structure to be trustworthy, but not enough machinery
to delay the first useful result.

## Measurement statement

Nuave observes selected AI systems across a defined set of questions at a
recorded time. Results can vary by system, model, date, location, language, and
conversation context. The audit is not a permanent, universal, or personalized
AI ranking.

## Raw-MVP scope

For the current sample, use:

- one exact, verified business;
- one user-reviewed ten-question pack from the current prompt method, written
  in natural Indonesian;
- five unbranded and five branded questions;
- ChatGPT on one honestly named execution surface;
- relevant public business and competitor sources, weighted towards the
  Indonesian sources AI systems actually draw on;
- the exact run design recorded before execution; and
- automatic report analysis with evidence-reference and count validation.

Name the execution surface as the OpenAI Responses API, exact returned model,
and web-search condition. Do not represent an API, standardized run, or one
account's result as every consumer's personalized ChatGPT experience. Do not add systems or
broad vertical claims unless the current sample shows why they are needed.

Each question is observed once for the reported result. Deliberately re-asking
a small number of questions to measure how much identical runs vary is a
separate, encouraged activity: the score band must be wider than that
variation, and it has never been measured. Record such repeats as variance
measurement, not as additional observations feeding the reported counts.

The completed EXP-R1 dental run used a different five-question, two-system
method. Preserve its recorded scope when citing that evidence; do not silently
convert its observations into the current ten-question method.

## Confirm the business first

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

- the questions are in natural Indonesian and sound like something a real
  Indonesian customer would actually type, not a translated English sentence;
- unbranded questions do not leak the business name or a unique identifier;
- branded questions test recognition and factual representation rather than
  inflating discovery;
- every business, service, location, and competitor fact is verified;
- the location is expressed the way local customers would say it; and
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

- **Appearance:** the resolved business is identifiable in the answer.
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

For factual checks, prefer the exact official website and Google Business
Profile listing, then the Indonesian sources that actually feed answers about
this kind of business — marketplaces, sector directories, local news, and
applicable public registries — then clearly labeled owner-supplied facts, then
other third-party sources. A source hierarchy built for another market will
mis-weight what Indonesian AI answers are drawn from. Public availability
does not prove accuracy, and a source returned by ChatGPT does not by itself
validate the claim it supports.

Record conflicting authoritative sources as a finding instead of selecting the
version that makes the report cleaner. Never attribute a competitor fact or
business appearance to a name-only match.

## Turn evidence into findings

Keep three layers separate:

1. **Observation:** what the AI response or public source actually showed.
2. **Interpretation:** a qualified explanation of what the pattern may mean.
3. **Action:** something the business owner can complete or delegate.

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

## Report format

Use this five-section sequence for the sample:

1. **Main Result:** report identity, tested scope, visible counts with their
   denominators, the score band and its components, separate
   information-accuracy status, a short conclusion, and the snapshot
   limitation.
2. **Key Findings:** three to five specific evidence-led findings, including
   contradictory or negative evidence when material.
3. **What to Do Next:** a short ordered action list. Each material action
   states what to do, why it matters, its evidence basis, owner, and observable
   completion check. Add effort, confidence, dependency, and caveat when useful.
4. **Test-by-Test Results:** one entry per tested question containing the
   finding, the exact question, the full answer or clearly marked
   excerpt, status, date, context, and separated source types.
5. **How This Audit Works:** identity, systems and surface, dates, language,
   question classes, run and failure handling, automatic-analysis disclosure,
   evidence terms, and what the audit does not prove.

Show before the main content:

- audited business, exact branch or service area, and location;
- audit date and number of questions; and
- prepared for the business owner.

An agency or reseller attribution line is not part of the standard report. It
is a later white-label concern, not a field to design around now.

Keep the exact language, system, execution surface, returned model, and web
search condition in **How This Audit Works**. The summary and findings should
use ordinary business language.

### Plain-language writing standard

Customer-facing reports are written in Indonesian. The versioned writing
contract in
[`report-language.ts`](../src/lib/audit/report-language.ts). That file is the
single runtime source for section word limits, sentence length, and wording to
avoid. Increase the writing-standard version when those rules materially
change.

- Write in Indonesian, for a non-technical business owner.
- The word limits and banned-jargon list are currently calibrated for English
  only. An Indonesian contract version is required before an Indonesian report
  can be checked properly.
- Put the result or action first and supporting detail after it.
- Prefer common words, active voice, one idea per sentence, and no filler.
- Apply the configured limits only to Nuave-written explanations. Do not shorten
  a business name, tested question, official term, source, or evidence excerpt
  to meet them.
- Copy every answer excerpt exactly from the retained answer. A language-only
  retry must not change classifications, evidence IDs, sources, or excerpts.
- Generate no separate methodology narrative. Build that section from recorded
  run facts so it stays short and consistent.

New outputs identify both `nuave-report-v2` and the writing-standard version.
The evidence export retains those versions and the complete underlying
evidence.

Use direct counts and denominators. Report unbranded discovery, branded
recognition, recommendation, accuracy, and failed tests separately.

The headline is always the count with its denominator. Beneath it, report an
AI Visibility Score as a **band**, never an exact integer:

- the band is a transparent composition of the separately reported components,
  each shown beside it with its own denominator;
- the formula and band definitions are published in the report and versioned,
  and a re-check may only compare scores computed under the same version;
- the band must be wider than the observed variation between identical runs,
  so that a change in the band means a change in the world; and
- no peer benchmark is stated until enough businesses in the category have
  been measured to state one honestly.

Never blend branded recognition into unbranded discovery. The score is a
composition of separate measures, not a replacement for them.

Place the limitation beside the summary, not in fine print: this is a snapshot
of the stated test date, not a permanent ranking or every possible ChatGPT
answer; results may vary by model, time, location, language, and conversation
context, and business information should be verified before a decision.

The report uses neutral Nuave presentation. Presentation must never hide the
tested scope, evidence, limitations, source types, or correction path. Keep the report scannable on screen and printable; a PDF
must render the same generated report version rather than a second
interpretation.

If a shorter internal draft is needed before the owner-facing version, it may
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

- the exact business and branch are correct;
- the report identifies who it was prepared for;
- every material statement links to an AI observation or public source;
- observation, interpretation, and action are visibly distinct;
- appearance, mention, recommendation, non-appearance, and failure are not
  conflated;
- branded recognition and unbranded discovery remain separate;
- competitors are real, locally relevant, and not confused with similarly
  named businesses;
- failed, contradictory, and missing results remain visible;
- no statement implies permanent ranking, consumer-interface equivalence, a
  peer benchmark that has not been earned, or a forecast of future results;
- no clinical-quality, treatment, safety, lead, or revenue claim is made;
- each action is specific, evidence-backed, realistically controllable, and has
  an owner and completion check;
- permissions cover any external use of business identity, quotes,
  screenshots, or findings;
- limitations and any partial coverage are prominent;
- the report can be understood by a non-technical Indonesian business owner
  reading it alone;
- Nuave-written fields pass the current plain-language limits, while exact
  questions and answer excerpts remain unchanged; and
- the final screen and PDF, when both exist, show the same facts and report
  version.

Preserve the original evidence. A material correction creates a new report
version with the reason, author, date, and explanation of what changed; it does
not silently rewrite a provider answer or prior delivered report.

## Data boundaries

- Use only the public business information the audit needs and record its
  source and observation date.
- Label owner-supplied business facts until verified.
- Do not collect patient data or send customer contact, payment, private
  business records, access tokens, or other unnecessary personal data to an AI
  provider.
- Keep API keys and account credentials outside reports and repository files.
- Keep raw provider responses restricted when they include unnecessary personal
  information or provider metadata.
- Minimize copied third-party content; retain the source link and only the
  excerpt needed for evidence.
- Do not publish a business name, logo, quote, screenshot, or finding without
  the appropriate review and specific permission. Showing a business its own
  observed result during outreach is permitted; publishing it is not.

If sensitive personal information is received, stop processing it, restrict
access, do not copy it into another tool or model, and escalate to the founder.
Do not promise permanent report hosting or indefinite data retention.

Before accepting paid orders, use a reliable payment method, state the delivery
promise and limitations, provide a correction or remedy path, and disclose the
minimum applicable privacy and retention terms. Expand these controls when real
orders reveal a need; do not build an enterprise compliance system first.
