# Nuave audit method

> Status: **Current audit method**
> Updated: 2026-08-09
>
> Customer context: Nuave's customer is the owner or marketing decision-maker
> of a small or medium Indonesian business, ordering an audit of the business
> they are accountable for. Completed work in earlier verticals is methodology
> evidence, not proof that another vertical is supported. This document derives
> from [`VISION.md`](./VISION.md); where they disagree, the vision governs.

## Purpose

The raw audit should turn real public information and observed AI responses
into a short, honest report an Indonesian business decision-maker can read in
ten minutes. It needs enough structure to be trustworthy, but not enough
machinery to delay the first useful result.

## Measurement statement

Nuave observes selected AI systems across a defined set of questions at a
recorded time. Results can vary by system, model, date, location, language, and
conversation context. The audit is not a permanent, universal, or personalized
AI ranking.

## Scope of one audit

Every run uses:

- one exact, verified business;
- one customer-reviewed ten-question pack from the current question method,
  written in natural Indonesian and locked exactly as approved;
- the final customer-approved composition, which may contain any mix of
  questions that mention or do not mention the business;
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
a small number of questions to observe how much identical runs vary is a
separate, encouraged activity. Use it to explain ordinary variation in the
direct appearance count, not to change the reported result. Record such repeats
as variance measurement, not as additional observations feeding the count.

Completed runs from earlier cycles used a different five-question, two-system
method. Preserve their recorded scope when citing that evidence; do not silently
convert those observations into the current ten-question method.

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
- the default questions that do not name the business do not leak its name or
  a unique identifier;
- Nuave explains how adding or removing the business name changes what the
  report can measure, without forcing the customer to preserve the suggested
  five-and-five composition;
- every business, service, location, and competitor fact is verified;
- the location is expressed the way local customers would say it; and
- regulated, professional-advice, service-quality, or unsupported superiority
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

Capture is part of the pipeline, not a side note: the run must retain this
itself, so a report can be regenerated and a re-check can replay the same
question pack verbatim. Do not depend on browser session state for anything a
re-check will need.

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
applicable public registries — then clearly labeled buyer-supplied facts, then
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
3. **Action:** something the business can complete or delegate.

Example:

- Observation: the official service page lists a priority service, but one AI
  response cited a directory that omitted it.
- Interpretation: the business's service information may not be equally clear
  across sources used by the tested system.
- Action: make the service description consistent on the official website and
  priority business profiles, then verify the updates directly.

Do not claim that a source gap caused exclusion unless causal evidence exists.
Do not turn one response into a percentage or stable rank.

## Handle missing and weak evidence

A failed test is never converted into zero visibility or a fabricated result.
Retry only when the method stays the same, record the retry, and disclose any
material timing or configuration change. The current paid flow requires ten of
ten evaluable observations before automatic report generation and delivery. If
one question remains technically unexecutable, preserve the completed work and
route the order to recovery or an approved remedy instead of quietly producing
a nine-question report. Never fill a report to make it look complete.

Treat refusals according to whether they produced a usable observation:

- a substantive answer that declines to recommend, cannot verify a fact, or
  explains uncertainty is evaluable evidence and is not retried for a more
  favorable result; and
- a provider or policy refusal that blocks the request and returns no usable
  answer is a failed test. Preserve it as an attempt, retry only under the same
  method, and do not count it toward the required ten observations.

Zero appearance across successful questions classified **Tanpa menyebut bisnis
Anda** can be a valid result. State the tested denominator and limitations,
confirm that identity and questions were valid, and do not invent a cause.

## Report format

Use this five-section sequence for every report:

1. **Main Result:** report identity, tested scope, the direct appearance count
   out of ten and its separate name/no-name components, separate
   information-accuracy status, a short conclusion, and the snapshot
   limitation.
2. **Key Findings:** one to five specific evidence-led findings, including
   contradictory or negative evidence when material. One or two strong
   findings are deliverable; do not create filler to reach a visual quota.
3. **What to Do Next:** one to five evidence-backed actions, ordered by
   usefulness. Every action states what to do, why it matters, its evidence
   basis, owner, and observable completion check. Add effort, confidence,
   dependency, and caveat when useful. Do not invent a deficiency to satisfy
   the minimum. When no immediate corrective gap is supported, the action may
   preserve a supported strength, improve the public evidence behind it, or
   propose checking an explicitly untested aspect. Label that action as
   maintenance or further investigation, and never imply that the untested
   aspect is an observed problem.
4. **Test-by-Test Results:** one entry per tested question containing the
   finding, the exact question, the full answer or clearly marked
   excerpt, status, date, context, and separated source types.
5. **How This Audit Works:** identity, systems and surface, dates, language,
   question classes, run and failure handling, automatic-analysis disclosure,
   evidence terms, and what the audit does not prove.

Show before the main content:

- audited business, exact branch or service area, and location;
- audit date and number of questions; and
- prepared for the ordering business and named recipient.

An agency or reseller attribution line is not part of the standard report. It
is a later white-label concern, not a field to design around now.

Keep the exact language, system, execution surface, returned model, and web
search condition in **How This Audit Works**. The summary and findings should
use ordinary business language.

Use these customer-facing composition labels exactly:

- **Tanpa menyebut bisnis Anda** for final questions that do not contain the
  audited business name or a known variant; and
- **Menyebut bisnis Anda** for final questions that do.

Do not show an original suggestion category as if it still described a
question the customer substantially edited. Derive report composition and
denominators from the exact locked questions, not from the suggested matrix.

### Plain-language writing standard

Customer-facing reports are written in Indonesian. The versioned writing
contract in
[`report-language.ts`](../src/lib/audit/report-language.ts). That file is the
single runtime source for section word limits, sentence length, and wording to
avoid. Increase the writing-standard version when those rules materially
change.

- Write in Indonesian, for a non-technical business decision-maker.
- The word limits and banned-jargon list are currently calibrated for English
  only. An Indonesian contract version is required before an Indonesian report
  can be checked properly.
- Settle and review that Indonesian writing contract in its own dedicated
  product-language session. This report-content plan does not pre-approve
  Indonesian headlines, explanations, or tone beyond explicitly settled labels.
- Put the result or action first and supporting detail after it.
- Prefer common words, active voice, one idea per sentence, and no filler.
- Apply the configured limits only to Nuave-written explanations. Do not shorten
  a business name, tested question, official term, source, or evidence excerpt
  to meet them.
- Copy every answer excerpt exactly from the retained answer. A language-only
  retry must not change classifications, evidence IDs, sources, or excerpts.
- Generate no separate methodology narrative. Build that section from recorded
  run facts so it stays short and consistent.

New outputs identify both `nuave-report-v3` and the writing-standard version.
The evidence export retains those versions and the complete underlying
evidence.

Use direct counts and denominators. Report appearance in **Tanpa menyebut
bisnis Anda**, recognition in **Menyebut bisnis Anda**, recommendation,
comparison, and information assessment separately. Use the final name/no-name
composition for the first two denominators. For recommendation, comparison,
and information, use only the questions where that dimension was meaningfully
assessed. Show **Tidak diuji** when a dimension has no eligible question; never
turn an empty denominator into zero performance.

The headline is the direct appearance count across the ten retained answers,
for example **Bisnis Anda muncul di 4 dari 10 pertanyaan** and **4/10**. This is
the Nuave score for that audit. It is not a percentage forecast, permanent
ranking, or peer benchmark.

Show appearance in **Tanpa menyebut bisnis Anda** and recognition in
**Menyebut bisnis Anda** directly beneath the overall count, each with its own
denominator. Never present recognition after the question supplied the business
name as spontaneous discovery. Recommendation, comparison, and information
assessment also keep their eligible denominators.

A re-check may compare the count only when the exact approved question pack and
relevant method versions remain compatible. Disclose that ordinary model
variation can change the observed count; do not describe movement as business
improvement or decline without supporting evidence.

Place the limitation beside the summary, not in fine print: this is a snapshot
of the stated test date, not a permanent ranking or every possible ChatGPT
answer; results may vary by model, time, location, language, and conversation
context, and business information should be verified before a decision.

The report uses neutral Nuave presentation. Presentation must never hide the
tested scope, evidence, limitations, source types, or correction path. Keep the report scannable on screen and printable; a PDF
must render the same generated report version rather than a second
interpretation.

The primary report action is labeled **Download PDF**. A complete evidence
export may remain available as a lower-hierarchy secondary action. The screen
and PDF may use layouts suited to their medium, but both must render the same
facts, evidence, actions, and report version.

Web-report validation and PDF rendering are separate artifact states. A
complete validated web report may be delivered while the PDF is failed or
retrying. Keep **Download PDF** visible but unavailable with truthful status,
then enable it when the PDF renders from the same immutable report version. A
PDF failure never reruns observations or changes report facts.

If a shorter internal draft is needed before the customer-facing version, it may
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
- recognition from **Menyebut bisnis Anda** and appearance from **Tanpa
  menyebut bisnis Anda** remain separate;
- competitors are real, locally relevant, and not confused with similarly
  named businesses;
- failed, contradictory, and missing results remain visible;
- all ten observations are evaluable before the report is delivered;
- the overall appearance count out of ten matches the retained answers and the
  separate name/no-name components are visible directly beneath it;
- no statement implies permanent ranking, consumer-interface equivalence, a
  peer benchmark that has not been earned, or a forecast of future results;
- no service-quality, treatment, safety, lead, or revenue claim is made;
- each action is specific, evidence-backed, realistically controllable, and has
  an owner and completion check;
- the report contains between one and five evidence-backed actions and none is
  present merely to fill the section;
- the report contains between one and five material findings, and accepts one
  or two strong findings without filler;
- any maintenance or further-investigation action is labelled honestly and
  does not present an untested aspect as an observed problem;
- permissions cover any external use of business identity, quotes,
  screenshots, or findings;
- limitations and any dimensions that were not assessed are prominent;
- the report can be understood by a non-technical Indonesian business
  decision-maker reading it alone;
- Nuave-written fields pass the current plain-language limits, while exact
  questions and answer excerpts remain unchanged; and
- the final screen and PDF, when both exist, show the same facts and report
  version.

Preserve the original evidence. If Nuave approves a material correction to an
objectively wrong delivered report, it creates a new report version with the
reason, author, date, and explanation of what changed; it does not silently
rewrite a provider answer or prior delivered report. A customer who selected
the wrong business after audit start instead uses the order-remedy path and may
receive a founder-granted replacement audit chance. That is not a report
correction.

## Data boundaries

- Use only the public business information the audit needs and record its
  source and observation date.
- Label buyer-supplied business facts until verified.
- Do not collect regulated personal records, and do not send customer contact,
  payment, private business records, access secrets, or other unnecessary
  personal data to an AI provider.
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
Report links are private and finite. State the retention period; do not promise
permanent report hosting or indefinite data retention.

Before accepting paid orders, use a reliable payment method, state the delivery
promise and limitations, provide a correction or remedy path, and disclose the
minimum applicable privacy and retention terms. These safeguards must exist
before any customer outside this repository uses the product. Expand them when
real orders reveal a need; do not build an enterprise compliance system first.
