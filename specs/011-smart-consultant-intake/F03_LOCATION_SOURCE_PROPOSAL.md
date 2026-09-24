# F-03: use official location evidence during preparation

**Approved for offline implementation — 2026-09-24.**
Revised by the orchestrator on 2026-09-24 after the founder selected broad
business presence as whole-brand reach. That [meaning decision](../../docs/DECISION_LOG.md#2026-09-24--whole-brand-reach-means-broad-business-presence)
is settled. The founder then replied **“approved”** to this revised package,
including its regional-representation limitation. The
[implementation decision](../../docs/DECISION_LOG.md#2026-09-24--approve-the-f-03-location-source-implementation)
and amended Spec 011 authorize the
[worker handoff](./F03_LOCATION_SOURCE_IMPLEMENTATION_PROMPT.md) without repeat approval.
Approval is not execution evidence; no source/provider request, business
selection or code change occurred in this documentation turn.
The [first-draft review](./F03_LOCATION_SOURCE_PROPOSAL_REVIEW.md) is preserved.

## Problem and evidence

**Observed:** the [homepage check](./F03_SOURCE_SUPPORT_RESULT.md) retained
aspirational geographic wording without establishing a selector defect. The later
[outlets-source reading](./ACCEPTANCE_EVIDENCE.md#2026-09-24-founder-supplied-official-outlets-source)
establishes published multi-city locations. The earlier `beberapa` interpretation
was not a confirmed classification; use the newly settled broad-presence meaning
to assess national versus regional scope. Neither reading establishes universal
delivery or a customer segment. Details remain in
`/private/tmp/nuave-outlets-source-ttw37ga2/outlets-source-note.json`;
its examples are not a complete or confirmed area selection.

**Interpretation:** useful official evidence exists beyond the homepage. Nuave
should seek it before asking customers to reconstruct public facts.
**Unknown:** the prior model's discovery, access and interpretation.
Hosted search already existed; later readings cannot reconstruct that run.

## Recommendation and current ordering

Amend the **existing extraction instruction**, preserving hosted-search settings.
This approved change remains untested in live preparation.

1. [SmartIntakeJourney](../../src/lib/intake/SmartIntakeJourney.tsx#L143)
   obtains identity, then posts the canonical URL and ledger to extraction.
2. The [route](../../src/app/api/audit/extract/route.ts#L111) checks switch,
   caller limits, mode/credentials and input; website extraction obtains its
   server-owned homepage excerpt before entering the provider boundary.
3. [OpenAI extraction](../../src/lib/audit/openai.ts#L294) constructs the entire
   request, [reserves budget](../../src/lib/audit/openai.ts#L394), then dispatches
   the model with required official-domain search. Only afterward do
   [mapping and preselection](../../src/lib/intake/smart-intake-contract.ts#L154)
   prepare the summary.

Within that attempt, instruct extraction to use homepage evidence
first; when current reach remains unsupported or ambiguous, prioritize official
locations/service-area evidence in its existing search. Search using the supplied
identity/domain and generic location/service-area intent, not a guessed URL.
Select at most one relevant official page to ground geographic meaning. Prefer
an explicit coverage page for delivery claims and an official location directory
for premises-based access. Multiple candidates require a clear relevance choice;
ambiguity leaves meaning unknown without merging partial lists.
No second customer URL is required. Discovery precedes the final draft.

**Alternative, not recommended yet:** one additional server-owned page read,
selected from an actual same-host homepage link before reservation, could supply
a known passage. It needs link selection, separate source/time attribution and
shared limits across two documents; it cannot be bolted on after extraction
without another model call. Evidence proves neither its necessity nor that the
directory fits static-reader bounds. It requires separate approval.

## Execution boundary

| Work | Approved boundary |
|---|---|
| Application requests | One identity request and one extraction request; existing identity/head/icon behavior unchanged. |
| Server document work | One existing homepage read; zero additional pages. Preserve 512 KiB decoded bytes, three safe redirects, five-second request/ten-second total bounds and destination charging. |
| Supplemental text | Existing combined limit of 8,000 UTF-8 bytes, with actual source/time, in memory only. No second excerpt or caller-supplied trusted evidence. |
| Model/search | One initial extraction attempt; request one hosted-search tool call and at most one selected location/coverage page. Keep `gpt-5.6-luna`, low reasoning, 16,000 output tokens, standard tier, medium search context and `store: false`. |
| Site restriction | Keep the existing official-domain filter. Instructions limit geographic evidence to the canonical host with `www` equivalence; no unrelated domains, external directories, guessed paths, branch-by-branch browsing or rendering service. |
| Reservation/retry | Build the amended request before each reservation. Preserve carryover, running ledger and USD 5 ceiling. Maximum two attempts including the existing no-parsed-output technical retry, reusing the homepage excerpt. Valid partial/optional-empty output never retries. |

The [cost-control code](../../src/lib/audit/telemetry.ts#L38) expressly describes
the requested tool cap as advisory: actual calls can exceed it and are accounted
from telemetry. Provider-internal page counts, text volume and retrieval time
are not bounded by Nuave's 8,000-byte/ten-second homepage limits. The
[client](../../src/lib/audit/openai.ts#L67) adds no application extraction deadline.
Thus one selected page is an instruction, not a transport guarantee; the
technical retry may search again.
If hard hosted-page/time ceilings are required, this recommendation cannot meet
them within the unchanged method; escalate instead of claiming enforcement.

## Meaning, areas and customer control

**Settled:** whole-brand reach describes supported geographic business presence
through the stated service channels, not a complete list of outlets or exact
delivery boundaries. Published operating locations support premises-based
presence; delivery-area statements support delivery coverage. National outlet
presence does not mean every channel delivers everywhere. A contact address,
count, aspiration or area overflow alone cannot establish broad reach.

Approved instruction definitions, using the existing values and labels:

| Reach | Evidence and representation |
|---|---|
| `sekitar` | Actual presence centered on one supported local area; retain the existing one-area selection rule. |
| `beberapa` | Actual presence in named cities/regions without support for national presence; use up to eight source-supported geographic areas at a meaningful published level, not an outlet inventory. |
| `seluruh` | A supported current national footprint: an explicit present-tense national-availability statement or a documented, geographically distributed domestic operating network. No numerical outlet threshold. Active areas are empty. This is not a universal-delivery claim. |
| `luar` | Supported current business presence in Indonesia and abroad. Aspirations and foreign-sounding outlet names do not qualify. Active areas are empty. |

The model must assess the evidence, not choose a broader enum to make validation
pass. If it cannot support a classification, keep it unknown. The schema cannot
prove geographic meaning; source disclosure and customer confirmation remain
necessary. Keep channel and reach meanings consistent, including the distinction
between ordering online and receiving/using a service online.

Unchanged location-derived reach/areas remain `Dari website Anda`, including
when a founder originally supplied a source link. Preserve `Saran Nuave` for
whole-brand focus and optional context, `Dari Anda` after row edits, the existing
summary-level source disclosure, and the single confirmation. Request actual
location-page evidence URLs; never fabricate links or introduce per-value matching.

The [schema](../../src/lib/audit/types.ts#L193) caps areas at eight;
[initial selection](../../src/lib/intake/smart-intake-contract.ts#L239) preselects
every `beberapa` area. The cap does not require exhaustive city enumeration for
a national business. Assess broad presence first; supported national/international
cases use their existing empty-area representation regardless of directory size.
Pagination or more than eight outlets is not, by itself, a reason to clear reach
or geography. This replaces the first draft's blanket empty-area overflow rule.

For local/regional cases, distinguish multiple outlets from multiple meaningful
geographic areas. Reuse explicitly published broader area descriptions when they
faithfully describe the documented presence. Do not invent an umbrella region or
select the first/biggest eight cities as the whole business's footprint. There
is no general requirement to enumerate every outlet or prove directory completeness.

**Residual limitation, approved 2026-09-24:** if a genuinely regional footprint
cannot be described faithfully within eight source-supported areas and no
supported broader area description is available, retain the supported reach but
leave its area selection unresolved. Use the existing inline controls, with no
extra model call or automatic focus change. This is a specific representation
limit, not a completed acceptance outcome. Exact wider regional representation
would need separate scope. It must not cause an otherwise supported national
network to be treated as an incomplete regional directory.

The [retry instruction](../../src/lib/audit/openai.ts#L291) asks for four items per
list. Exempt market areas from that generic shortening: preserve a supported
five-to-eight-area regional description rather than silently narrowing it to four.
Supported national/international cases still have no active areas. Preserve
retry eligibility and ceilings; a valid partial result never creates a retry.

### Expected prepared outcomes

These are approved expected interpretations and fictional acceptance cases, not executed
model results. Confirmation availability assumes all other required meanings
are valid and is not permission to press the action during a live review.

| Evidence | Expected proposal and customer state |
|---|---|
| Fictional local business names one operating area | `sekitar`, that area selected; confirmation available. |
| Fictional regional business names six service areas | `beberapa`, those six geographic areas retained through initial/technical-retry paths; confirmation available. No claim of exhaustive outlet enumeration. |
| Fictional directory lists many outlets but expressly describes two operating regions | `beberapa`, the two published regions when they faithfully describe that presence; confirmation available, no arbitrary city sampling. |
| Fictional broad domestic operating network is supported by geographically distributed named outlets | `seluruh`, no active areas; confirmation available. Local delivery remains local. |
| Fictional genuinely regional footprint exceeds eight supported areas without a faithful supported broader description | `beberapa`, unresolved areas; confirmation unavailable under the residual limitation above. Never promote it to national because of count. |
| Only an aspiration, office contact or unexplained outlet count is available | Reach remains unknown; no fabricated national/international classification or optional customer segment. |

For the nominated whole-brand case, the retained official evidence describes a
distributed domestic outlet network. Under the settled meaning, the revised
expected proposal is **national (`seluruh`) with no active city list**, based on
the geographic distribution of the listed operating locations, not the count
alone. It is not an already confirmed business fact or a successful extraction
result. The later live check must establish whether the model actually retrieves
and uses suitable evidence and the founder accepts the prepared interpretation.

## Failures and protections

Missing or ambiguous evidence leaves affected values unknown without another
call. An inaccessible hosted candidate is not evidence of absence and triggers no
server fetch. Homepage fetch/privacy/rate errors stop before paid extraction;
safe pages without usable text retain the existing search-only path.
Hosted/provider failures retain actual or reserved costs. Preserve 429/503
treatment and stable identity/ledger.
Detected sensitive output stops before prepared-state persistence. Hosted content
does not acquire a claim of having passed the local HTML screen. Never persist
raw pages/responses, bypass limits, execute source instructions, or fabricate facts.
Back/reload/disclosure actions must not replay work.

## Decisions, amendment and verification

**Founder decisions settled:** broad-presence meaning and this revised
instruction-only implementation package, including the residual regional limit,
are approved. Do not ask again. Do not expand schemas, sample a full market or
make national delivery claims. Later live validation still requires its own
execution authorization.

Spec 011 R-01/R-02/R-04 and AC-05 now include the discovery instructions,
definitions and provider parity. R-02, partial-extraction behavior and AC-03
record the regional rule; R-05's mapping remains unchanged. The addendum's
**Product integration boundary** instruction-freeze and **Files and regression
boundary** request-equivalence clauses now permit only this instruction delta.
Preserve R-13/R-14, origins, confirmation and fetch/privacy rules. No schema,
report/export, question path, historical hold, emergency switch or approved
provider/model change is authorized.

Likely edits: `openai.ts`, testing-only `gemini.ts`, their extraction tests,
`smart-source-preparation.test.tsx` and `smart-intake-contract.test.ts`; no fetcher,
selector or production UI redesign. Verify fictional cases covering useful
official locations and exact origins; aspiration/contact-only unknowns; optional
target absence; supported five-to-eight-area descriptions through technical retry;
national networks with no active city list; regional geographic grouping only
when explicitly supported; the remaining unrepresentable regional case;
source/rate/privacy failures; and unchanged reservation, costs, request counts,
restoration and confirmation. Check that exact confirmed context through writer,
report and export preserves reach/channel meaning without asserting universal
delivery. If a downstream semantic change is needed beyond the approved meaning,
report it before expanding this instruction-only scope. Request assertions and
mocked outputs cannot prove hosted discovery or real semantic compliance.
Follow implementation with focused checks, offline
`validate:fast`/`verify`, independent review, then a separately authorized live
preparation—not either consumed allowance.

Next: execute the bounded offline implementation handoff, then independent
review. No further product approval is pending within this scope. Accounting remains
USD 1.04786450 of 5, including the historical estimate. F-01 stays closed;
F-03/AC-07 stay open; Spec 011 stays Approved, not Verified.
