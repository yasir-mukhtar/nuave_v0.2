# From questionnaire to prepared business understanding

> Status: **Review draft — not an approved implementation specification**
> Date: 2026-09-20
> Requested outcome: after a business name and public URL, Nuave does the
> discovery work; the customer mainly confirms, selects, or corrects.
> Scope of this change: this plan only. No application implementation,
> provider calls, merge, or deployment is authorized by publishing it.

## 1. Recommendation and finish line

Replace the fixed questionnaire with a prepared understanding of one business,
an explicit choice of audit focus, and follow-up questions only where a missing
or conflicting answer would change the audit. Keep the existing question,
observation, and report pipeline.

“Smart consultant” describes the division of work: Nuave reads, organizes,
proposes, and explains what needs a decision. The owner supplies judgment and
approval. It does not require a chat interface, an autonomous research agent,
or a complete marketing profile.

The first complete outcome is:

**Name + URL → prepared understanding → choose focus / resolve essential gaps
→ confirm the visible brief → review ten questions → existing audit/report.**

For a well-supported whole-brand business, the proposed acceptance target is
zero additional typing and at most three substantive confirmation decisions
before question review. Count scope selection, any required clarification, and
final confirmation separately. Also record actual taps, screens, and time so
one “decision” cannot conceal a long checklist. Target no more than five
selection/continue actions on the unedited happy path, excluding initial entry.
Question review and explicit audit-start approval remain separate.

These are targets to test, not claims about current performance. A sparse or
ambiguous source may require more effort; accuracy takes precedence over the
action target. The customer must understand the proposed brief, not merely
accept defaults to escape the intake.

## 2. Evidence and authority

This plan incorporates the founder-supplied repository audit and checks its
central findings against current `origin/main`, commit
[`4e6b2cf6302a0679aa7820d163b214ac8b486e1f`](https://github.com/yasir-mukhtar/nuave_v0.2/tree/4e6b2cf6302a0679aa7820d163b214ac8b486e1f),
observed on 2026-09-20. This was a source review, not a new live-business test.
The supplied report's percentage-complete estimates and approximate click
counts are not treated as measured results.

Read these authorities when reviewing or implementing the eventual spec:

- [Vision](../VISION.md), [Product](../PRODUCT.md), and
  [Journey Contract](../JOURNEY_CONTRACT.md): customer, evidence boundaries,
  confirmation ownership, and downstream handoffs.
- [Business Facts](../journey/03-business-facts.md): the intended prepared-draft
  experience; older conflicting details remain subordinate to later decisions.
- [Approved intake handoff](NUAVE_INTAKE_EXPERIENCE_HANDOFF.md) and its
  [journey contract](NUAVE_NEW_INTAKE_JOURNEY_CONTRACT.md): current screen,
  confirmation, navigation, and edit rules that this proposal would amend.
- [Spec 009](../../specs/009-recommendation-eligible-audit/SPEC.md) and
  [Spec 010](../../specs/010-gated-new-audit-flow/SPEC.md): direct-ten questions,
  continuous audit/report, trial entry, execution and cost protections.
- [Workflow](../WORKFLOW.md): a reviewed plan must become an approved bounded
  specification before implementation begins.

### What is present and what must change

| Verified finding                                                                                                                                                  | Evidence in the current source                                                                                                                                                                                                         | Consequence                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity preparation fetches metadata; richer extraction uses domain-restricted model web search. It is not a general website crawler.                            | [source-identity.ts](../../src/lib/audit/source-identity.ts), `fetchSourceIdentity`; [openai.ts](../../src/lib/audit/openai.ts), `extractionRequest`                                                                                   | Improve the use of existing results first; measure retrieval gaps before adding another retrieval system. Metadata presence alone does not prove the correct business was found. |
| The extraction draft carries market/customer context, criteria, evidence, and warnings beyond the four lists used by intake.                                      | [types.ts](../../src/lib/audit/types.ts), `extractionDraftSchema`; [preparation.ts](../../src/lib/intake/preparation.ts), `prepareBoundaryIdentity`                                                                                    | Preserve useful meaning and provenance across the handoff. Do not blindly expose every extracted field.                                                                          |
| The brand card echoes the entered name; discovered identity details are not fully carried through. Branch/product candidates are empty for entered businesses.    | [IntakeJourney.tsx](../../src/lib/intake/IntakeJourney.tsx), `prepareEnteredBusinessFixture`; [preparation.ts](../../src/lib/intake/preparation.ts)                                                                                    | Show what was actually learned and prepare real target choices. Do not relabel fixture examples as discoveries.                                                                  |
| Live candidates have empty selected lists, despite preselection metadata and pruning-oriented copy. Tests enforce the empty lists.                                | [preparation.test.ts](../../src/lib/intake/preparation.test.ts); [screens-bab1.tsx](../../src/lib/intake/screens-bab1.tsx)                                                                                                             | Separate a visible proposed selection from customer approval; align controls and wording with their actual state.                                                                |
| The route asks the same conceptual questions, then shows a readback of committed answers. Non-brand context preparation still includes fixture-specific behavior. | [navigation.ts](../../src/lib/intake/navigation.ts), `resolvePath`; [preparation.ts](../../src/lib/intake/preparation.ts), `deriveContextFixture`                                                                                      | Introduce deterministic gap-based follow-ups; use target-specific evidence rather than fictional brand rules.                                                                    |
| The confirmed-intake projection sets target customer to null and buyer preferences to an empty list. The writer can consume both.                                 | [question-facts-v3.ts](../../src/lib/audit/question-facts-v3.ts); [questions-id-direct-ten.ts](../../src/lib/audit/questions-id-direct-ten.ts)                                                                                         | Carry approved context through to questions, with correct meaning. Decision criteria are not automatically business capabilities or buyer preferences.                           |
| Editing, fact versions, frozen input, question approval, session restoration, and the report path already exist.                                                  | [state.ts](../../src/lib/intake/state.ts), [frozen-intake.ts](../../src/lib/intake/frozen-intake.ts), [local-session.ts](../../src/lib/intake/local-session.ts), [local-audit-session.ts](../../src/lib/intake/local-audit-session.ts) | Extend these boundaries; avoid a second journey state system or report rewrite.                                                                                                  |

## 3. Product amendments proposed for approval

The desired direction is established by the founder's request. These specific
behavior changes are recommendations for review, not decisions silently applied
to the canonical documents.

| Current rule                                                                                            | Proposed replacement                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The September 5 handoff locks the linear routes; journey §6 forbids skipping based on extraction state. | A visible prepared summary owns confirmation. Separate screens appear only for an essential gap, conflict, explicit focus choice, or requested correction. Routing follows validated state, not a model's instruction to skip. |
| Each conceptual screen must be committed individually.                                                  | One explicit action may confirm all active values visibly presented in the summary. Merely displaying or preselecting a value never confirms it.                                                                               |
| The handoff hides provenance and internal confidence.                                                   | Keep technical confidence hidden. Use ordinary language to distinguish suggestions and owner additions, with optional source details where useful. This is an explicit amendment to the provenance-display restriction.        |
| Competitor selection requires names or an explicit no-direct-competitor answer.                         | Competitors are optional. “Lewati / belum tahu” means unknown, not “there are no competitors.” No named comparator is needed for the direct-ten method.                                                                        |
| Optional customer reasons and the optional public fact still have mandatory screens.                    | Put optional refinements behind a clearly optional action on the summary. Their absence does not generate a follow-up.                                                                                                         |

Retain all three existing scopes: whole brand, one location, or one
product/service. Require a deliberate scope choice; never infer the owner's
commercial priority from homepage prominence. Do not change payment placement,
price, delivery promises, report-quality status, or the direct-ten method.
The public trial remains the current trial; later paid preparation must remain
behind verified payment as defined by the product contract.

After approval, record these amendments in `docs/DECISION_LOG.md`, update only
the conflicting active journey rules, and create one bounded implementation
spec. Update `docs/NOW.md` when the founder actually makes this the next task.
This draft does not change those authorities.

## 4. The customer experience

### A. Read before asking

Keep name and one supported public URL as entry. Show honest reading progress.
Distinguish a completed reading with gaps from a source that could not be read.
Do not claim understanding merely because the URL was normalized or a page
title was found. Retain successful partial preparation rather than discarding
everything because one optional field is absent.

### B. Present “Ini yang kami pahami tentang bisnis Anda”

Show a short factual introduction and compact editable rows covering:

- the exact business and source;
- category and principal products/services;
- where and how customers can receive them;
- optional customer situations, explicitly phrased as suggestions when inferred.

Do not display a large form, internal field names, confidence percentages,
unsupported praise, or a generic AI biography. Missing logos never block the
experience. Website marketing claims must not become Nuave endorsements.

Supported answers can already be selected as a **proposal**. The primary action
later confirms the visible brief; it does not ask users to reconstruct every
selection. Optional source details explain an important fact without turning
the summary into an evidence dashboard.

### C. Let the owner choose the focus

On the summary or one short follow-up, offer the three existing scope choices.
For a location/product focus, show discovered targets with enough information
to distinguish them. Select one target; do not silently choose the first branch.
If a category or offering priority is genuinely ambiguous, present a small
set of meaningful alternatives rather than a blank field.

After a target is chosen, update the visible summary from evidence for that
target. Whole-brand delivery coverage, offerings, or customer context must not
automatically become branch-specific facts. A scope change must not wipe out
unrelated facts that remain valid.

### D. Ask only what changes the test

Every follow-up must explain its purpose in one sentence and prefer prepared
choices. For example, a local business with two conflicting service areas
needs an area decision because it changes the consumer questions.

Use “Tidak ada yang cocok” for manual correction. Text entry remains available
whenever choices are incomplete. Optional refinements include customer needs,
buyer considerations, known competitors, and one public fact Nuave should not
misunderstand. Do not force an owner to describe a marketing persona.

### E. Confirm once, then prepare questions

Return to the updated summary after corrections. Show every active value that
will materially shape the questions. An explicit action such as
**“Sudah sesuai — buat pertanyaan audit”** confirms that version and starts
question preparation only when essentials are valid. Essential conflicts keep
this action blocked with a precise next action; optional unknowns do not.

Preserve editable review of all ten questions and explicit audit-start approval.
Approving business information never starts the observations.

## 5. What is essential, optional, or uncertain

| Meaning                            | Requirement and behavior                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and source                | Exact intended business and one supported source are required. A mismatch must be resolved. Owner-entered identity is attributed to the owner, not presented as independently discovered.                                                   |
| Scope and target                   | Explicit scope is required; one distinguishing location or product is required only for its respective scope.                                                                                                                               |
| Category and offering              | A usable category and at least one relevant offering are required. For product scope, the selected offering fulfills that requirement. Avoid collecting the entire catalogue.                                                               |
| Service channel and market         | Preserve explicit confirmed channels and reach in the existing handoff. Prepare them where supported; ask only for missing or conflicting values. Area-based reach requires an area. A branch address does not prove its delivery coverage. |
| Customer situations and audience   | Optional context. Propose source-supported audience information or modest interpretations of an offering; never invent sensitive demographics, demand, or outcomes.                                                                         |
| Decision criteria                  | Optional. Separate an observed capability from a customer preference. “Customers care about speed” cannot become “this business delivers quickly.” Omit criteria that cannot be represented honestly in the writer's existing meaning.      |
| Competitors                        | Optional names for owner review, with unknown distinct from none. Existing knowledge-only suggestions are not web-verified. Do not expand research to find competitors in this first change.                                                |
| Public correction / differentiator | Optional. Retain owner attribution and existing sensitive-text handling. No unsupported service-quality claims.                                                                                                                             |

The gap rule is deliberately simple: ask when an essential value is missing,
contradictory, or applies to the wrong target. Leave optional unknowns out of
generation and make their omission visible under optional details. A model
confidence score alone cannot resolve a conflict or authorize progression.

## 6. Preparation and data continuity

### Preserve meaning through one path

Use the existing extraction boundary, canonical intake state, and frozen input.
Introduce only the small typed preparation representation needed to retain
candidate values, their applicable target, sources, and review status. Production
meaning must not depend on an `IntakeFixture` or a known fictional brand.
Fixtures should exercise the same normalization and confirmation path.

For each value used in the brief, retain these distinctions:

1. **Origin:** supported by a named public source, Nuave interpretation, or owner
   supplied. Keep a minimal supporting excerpt/reference and observation date
   where relevant; preserve original evidence wording when normalizing labels.
2. **Review state:** proposed, accepted, edited, or unresolved.
3. **Applicability:** whole business or the exact selected location/offering.

Acceptance does not change origin. An accepted suggestion remains an accepted
interpretation; an owner correction does not become independently verified.
Associate warnings with the affected fact instead of losing them in an unused
warnings array. Retain contradictions until explicitly resolved.

The same confirmed values must appear in the summary, frozen input, and
question-writer brief. Include approved audience and useful criteria only after
the customer can see and change them. Do not fill currently empty fields directly
from extraction behind the user's back. Extend/version the narrow handoff where
necessary; do not force meanings into the wrong existing field.

Keep the winning direct-ten instruction and unnamed-question protections.
Richer context should help generate realistic consumer situations, not questions
engineered to uniquely identify the audited business. Preparation evidence must
not be injected into independent audit answers or counted as audit visibility.

### Improve retrieval only to close demonstrated gaps

First evaluate the current extraction after fixing the lossy mapping. If the
required information is already present, do not buy another research call.
Request concise natural Indonesian display text while preserving official names,
places, and exact source evidence; the current extractor requests English prose.

Where essential public information is missing despite existing on the site,
extend preparation to read a bounded set of relevant official pages: the
submitted page plus, as needed, up to four about, offering, location, or delivery
pages. This is a proposed maximum, not an instruction to fetch five pages on
every run. Prefer explicit relevant links, using the existing safe source-fetch
controls and bounded content extraction. Feed useful content into the same
preparation call rather than adding one model call per field or page.

Do not build a site-wide crawler, JavaScript browser fleet, vector database,
general research agent, or multi-provider fallback chain. Reuse current domain
restrictions and public-fetch protections, including redirect checks, private
network blocking, byte limits, and timeouts. Treat page text as untrusted data,
never instructions. Discard irrelevant personal/contact details before model
input or retained evidence.

Keep website and public Instagram inputs, with honest limitations when content
cannot be accessed. Do not add Google Maps, login scraping, or arbitrary linked
domains in this work. An alternative supported public source is an explicit
user correction, not permission for unbounded source discovery.

### Bound calls, latency, and retries

Reuse the current model/provider and preparation allowance initially. The
inspected code permits one extraction attempt and one retry for a returned
unusable structured result, with at most one hosted search tool call per attempt.
Keep the existing ledger and USD 5 session accounting ceiling; it is not a
supplier-enforced billing guarantee.

Do not spend the retry allowance merely because optional fields are empty.
Scope changes, corrections, Back, and reload operate on retained evidence and
must not automatically launch extraction again. An explicit reread uses the
remaining shared allowance; it does not reset budgets. When no allowance remains,
offer minimal manual completion instead of silently starting a fresh session.

Preserve finite request timeouts and show a recoverable partial/interrupted state
when reading stops. Unknown execution remains unknown; do not automatically
repeat a request whose response was lost. Record calls, latency, known cost,
and uncertain attempts. Change numerical limits only through an explicit spec
amendment backed by the small evaluation below.

## 7. Correction, failure, and recovery

| Situation                                       | Required behavior                                                                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rich source, clear identity                     | Prepared summary and choices; no extra typing.                                                                                                                              |
| Useful partial source                           | Keep discovered facts. Ask only for essential gaps; optional gaps remain empty.                                                                                             |
| Source blocked or unreadable                    | Explain what failed. Offer a different supported source or the smallest manual brief. Never show fixture facts or pretend reading succeeded.                                |
| Similar names, branches, or conflicting sources | Present distinguishable candidates/conflicting values. Require the relevant choice before approval.                                                                         |
| Wrong category                                  | Offer alternatives/correction, then reconsider only dependent offerings/customer context. Do not restart identity.                                                          |
| Scope or target changes                         | Recompute applicability from retained evidence; remove inactive target data and reconfirm materially affected values. Do not silently copy whole-brand facts into a branch. |
| Owner edits a value                             | Stage the edit. Save updates the summary; Cancel/Back restores the previous committed version. Later preparation cannot overwrite the correction silently.                  |
| Facts change after questions exist              | Preserve the old pack for history, invalidate its approval, and require explicit regeneration/review for the changed fact version before starting.                          |
| Back, reload, duplicate click                   | Restore settled preparation, edits, confirmation, cost history, and pack. No duplicate paid request. A processing state is not a Back destination.                          |
| Audit already started or completed              | Keep the existing frozen inputs and results. Do not migrate or mutate an in-flight/completed run to the new intake meaning.                                                 |
| Sensitive free text                             | Preserve the existing stop/restrict/notify behavior; do not send the text to another model, report, analytics, or Git.                                                      |

Version browser-session and frozen-input changes explicitly. Safely migrate
supported unfinished sessions; if approval meaning cannot be preserved, show the
retained information as a draft needing confirmation. Keep budget/attempt history.
Older approved packs and completed reports must remain usable under their original
contract; do not invalidate them merely by loading the new application. This is
same-browser-session recovery, not a promise of cross-device product persistence.

## 8. Delivery sequence

Use one approved specification with three implementation slices and one live
validation gate. Each slice must be independently reviewable, but the new public
experience ships only after the complete supported path passes. Avoid launching
an improved whole-brand route while leaving branch/product routes broken.

### Step 0 — settle the contract before code

Review the amendments in §3, the required/optional boundary in §5, and the
acceptance cases in §9. Then approve a bounded specification with exact display
and confirmation semantics, failure states, session migration, and call limits.
Reuse this plan's decisions and tests; do not commission another general audit
or a separate strategy framework.

Use existing authorized private preparation evidence, where available, to choose
representative populated and partial test cases. If no suitable evidence exists,
request a small preparation-only baseline on the existing application before
committing to retrieval changes. That needs its own explicit live-call allowance;
it does not require building a new interface first. Record availability gaps
honestly rather than assuming a rich invented response represents real coverage.

**Exit:** one approved spec; conflicts with the old locked route are explicitly
resolved. Until then, this remains a review draft.

### Slice 1 — one real-shaped whole-brand path

Preserve useful extraction results and provenance; produce the visible proposed
brief; allow scope choice, edits, and one batch confirmation; carry exactly that
brief into the existing question review. Use deterministic populated provider
responses at the actual identity/extraction route boundaries. Exercise a local
market, not only the easiest nationwide example.

Primary files: `src/lib/intake/{preparation,state,IntakeJourney,navigation,
screens-bab1,screens-bab2,frozen-intake,local-session}`, the relevant extraction
types/normalization, and `src/lib/audit/question-facts-v3.ts`. Extend the existing
controls and design system; follow `docs/DESIGN.md`. No new generic UI stack.

**Exit:** a new name/URL reaches question review without additional typing;
accepted, edited, and omitted values reach the writer correctly. This is an
integration result, not proof that live extraction is sufficient.

### Slice 2 — targets, gaps, and recovery

Prepare/select real-shaped branch and product candidates. Replace fixture-specific
conditioning on the entered-business path. Add the deterministic essential-gap
rules, unknown-versus-none handling, partial/unreadable-source behavior, selective
reconfirmation, migration, and no-duplicate-send protections from §7.

**Exit:** all supported scopes and the focused failure cases pass. A poor source
does not turn into invented facts or a demand for a complete business profile.

### Slice 3 — bounded retrieval improvements, only where needed

Compare source content, extraction output, and the displayed brief for each
missing essential. Fix the layer losing the information. Add the bounded relevant
page reading from §6 only when the current retrieval demonstrably misses available
information; skip that work if mapping/normalization is sufficient. Keep model
selection stable so the cause of improvement is interpretable.

**Exit:** each remaining gap is attributed to source absence, access failure,
extraction, mapping, or confirmation. Avoid repeated prompt tweaks without an
identified failure and a regression example.

### Gate 4 — small live evaluation, then release decision

After offline verification, request a separate bounded live-call authorization
covering five preparation cases and one complete audit/report continuation. Use
founder-owned or explicitly approved businesses; include a rich local website,
a sparse website, a multi-location business, a multi-offering business, and a
supported social-only or access-limited case. Prefer the initial target segment;
these are failure cases, not a multi-vertical expansion.

For each case, retain private minimal evidence with source, query, exact
provider/model, observation date, attempts, cost, latency, corrections, typed
fields, taps, and time to question review. Record whether a missing fact was
available on the source. Do not publish business names or findings in this public
repo; sanitized test cases are fictional and clearly labeled.

Run only preparation for the five cases unless question generation is explicitly
included in the allowance. Continue one suitable confirmed case through fresh
questions, explicit approval, ten observations, and existing PDF/JSON downloads.
Use a finite agreed request/spend allowance, count retries, and stop at its limit.
No live calls are authorized by this plan.

**Exit:** the founder recognizes the prepared brief as their business, makes
corrections rather than building it from scratch, and receives relevant questions
without unsupported context. Review each case, not an average that hides failures.
Apply the zero-typing and action targets to the rich live whole-brand cases too;
record why a sparse or inaccessible case cannot meet them. Do not classify a
failed extraction of available information as an inherently sparse business.
Release still needs explicit merge/deployment authorization and green required CI.

## 9. Acceptance and verification

| ID                              | Observable pass condition                                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 Prepared whole-brand path | From blank name/URL entry and populated route responses, a supported local business reaches question review with zero further typing, at most three substantive decisions, and at most five selection/continue actions. No hidden preconfirmation or manual field population in the test harness. |
| AC-02 Evidence versus approval  | Source facts, interpretations, owner edits, conflicts, and unknowns retain their meaning. Unaccepted suggestions cannot enter the confirmed brief. Accepting one does not change its origin.                                                                                                      |
| AC-03 Exact continuity          | A test traces useful audience/criteria/market context from preparation through visible summary, correction, frozen input, and writer brief. Rejected, inactive, hidden, or optional missing values do not leak through.                                                                           |
| AC-04 Essential-gap routing     | Sparse preparation asks only for missing essentials. Optional customer/competitor/fact fields never block. Unknown competitors do not become a claim of no competitors.                                                                                                                           |
| AC-05 Target correctness        | Branch and product cases can select discovered targets without typing. Conflicting branches require an explicit choice, and target-specific facts cannot inherit unsupported whole-brand coverage.                                                                                                |
| AC-06 Corrections and freshness | Save, Cancel, Back, scope changes, stale responses, and edits after question generation preserve the right version. An old request cannot overwrite a newer source/target or owner correction. Stale pack approval cannot start a run.                                                            |
| AC-07 Recovery and cost         | Reload/Back/double-click do not repeat successful preparation or generation. Interrupted calls remain honest and counted; manual continuation preserves prior spend. No reset of the allowance on a correction.                                                                                   |
| AC-08 Source failure and safety | Inaccessible sources and malicious/irrelevant page content yield honest partial/manual states, not invented facts or changed system behavior. Public-fetch and sensitive-text protections remain effective.                                                                                       |
| AC-09 Session compatibility     | An unfinished old session retains usable facts and cost history with explicit reconfirmation where needed; approved/running/completed old sessions retain exact inputs, packs, and exports without rerunning work.                                                                                |
| AC-10 Existing full path        | One offline browser journey edits a question, approves the exact pack, finishes ten observations and the current report/downloads, then survives Back/reload without another run/report request.                                                                                                  |
| AC-11 Human comprehension       | In the small authorized evaluation, the founder can identify the business, scope, offerings, and market they approved and explain any important correction. Record typing, correction burden, time, and misleading proposals; zero typing alone is not a pass.                                    |
| AC-12 Engineering gate          | Focused regression tests and `npm run verify` pass offline; inspect the full diff and keep required CI green on an up-to-date PR before release. No provider calls in verification.                                                                                                               |

Use the existing unit, browser, and offline verification tools. Add a compact
case set for rich local, partial, ambiguous, branch, product, and failed-source
preparation. Browser tests must enter through the ordinary route and stub provider
boundaries, rather than prefill internal confirmed state. This prevents another
polished fixture from disguising a disconnected live adapter.

When a case fails, first classify the failing layer and add its regression case.
Do not lower evidence requirements, invent optional facts, or weaken the audit
method to meet the action target. Report-quality improvements remain a separate
deferred obligation; better intake does not establish that the report is useful.

## 10. Limits and next action

This work excludes a chatbot conversation history, general research orchestration,
accounts, payments, durable background jobs, cross-device customer sessions,
dashboards, subscriptions, new source platforms, model benchmarking, and report
redesign. It changes how one business becomes an approved audit brief.

The next smallest useful action is a founder review of the proposed amendments
in §3 and acceptance cases in §9. Once accepted, turn them into one approved
bounded specification and begin Slice 1. Do not treat the publication of this
plan as approval to implement or change the live experience.
