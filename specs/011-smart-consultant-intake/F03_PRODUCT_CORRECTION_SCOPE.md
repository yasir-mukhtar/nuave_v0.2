# F-03 product correction: bounded public-page text handoff

Date: 2026-09-23.
Status: **Approved for offline implementation; Spec 011 addendum.**
Repository: `/Users/hy4-mac-006/nuave_v0.2`.
Branch: `devin/sol-smart-consultant-intake-plan`.
HEAD: `2a21f856d33264887df6287f9b6d9dd22468fea5`.

The founder approved this scope on 2026-09-23. The
[dated decision](../../docs/DECISION_LOG.md#2026-09-23--approve-the-f-03-product-correction)
and [Spec 011 amendment](./SPEC.md#f-03-product-correction--approved-2026-09-23)
record its authority. The [original worker prompt](./F03_PRODUCT_CORRECTION_IMPLEMENTATION_PROMPT.md)
is completed; use the continuation below. Live testing and publication remain separate.

**2026-09-24 continuation:** the excerpt correction above has independent
offline PASS; do not rerun its completed handoff. The founder approved the
[location-source instruction package](./F03_LOCATION_SOURCE_PROPOSAL.md).
Use its [new implementation handoff](./F03_LOCATION_SOURCE_IMPLEMENTATION_PROMPT.md)
for the bounded instruction change. This amendment changes the instruction-freeze
and request-equivalence clauses below only as stated; source/fetch/privacy and
all other protected boundaries remain in force.


## Privacy-screen amendment — approved 2026-09-25

The founder approved [R3](./PRIVACY_SCREEN_FOLLOWUP_PLAN.md) for bounded offline
implementation and independent review. Its explicit word groups, whole words,
one occurrence-specific `jantung kota` exception and two calmer privacy-stop
messages refine the previous conservative text check. P9/P14 remain accepted
cautious stops. Source selection, call limits, origins, persistence, historical
holds and strong secret/record protections stay in force.

The [worker result](./PRIVACY_SCREEN_FOLLOWUP_RESULT.md) records the isolated
candidate and offline evidence. This amendment is **Verified offline** after
independent implementation PASS, accepted in the
[closeout](./PRIVACY_SCREEN_FOLLOWUP_ACCEPTANCE.md). Publication approval is next.
Prior Verified acceptance and F-01/F-03/AC-07 closure stand; this acceptance does
not authorize publication or live work.

## Accepted decision

Implement one bounded addition to real preparation: the server reads the supplied
official website page, selects a short safe excerpt, and includes it in the
existing extraction request. Keep website-restricted hosted search enabled.
The customer still uses one `Periksa` action and reviews one prepared summary.
No extra model call or customer confirmation is added.

The new failure-behavior choice is this: if the page is readable but contains
no usable safe excerpt, continue the existing website-search extraction once
and show a short limitation notice. Do not turn missing excerpt text into a
claim that the business has no services.

Preserve the already-approved provenance decision: returned information remains
a proposal for customer confirmation, with existing row-level origins and
evidence rules. Do not call every offering independently verified, discard it
merely because it is absent from the excerpt, or introduce automatic per-offering
verification. This existing decision does not need repeat approval.

Unsafe or unreadable pages still stop before paid extraction. No silent bypass
of privacy, network safety, rate limits or budget controls is proposed.

The earlier [F-03 exception](./SPEC.md#f-03-controlled-input-exception--approved-2026-09-22)
authorized a temporary diagnostic only. The separate 2026-09-23 founder approval
now extends the mechanism to product preparation with the no-text behavior below.
The diagnostic PASS remains evidence, not the source of implementation authority.

## Accepted evidence and its limits

The founder relayed an independent **PASS** on 2026-09-23. The reviewer reran
all 35 focused checks in a separate ignored directory, inspected capture logic
and ordered events, verified rebuilt overlays/artifact hashes and 303 preservation
entries, and independently recomputed accounting. Live execution and earlier
broad gates remain worker-recorded, not independently repeated live checks.

The [completed experiment](./F03_CONTROLLED_INPUT_RESULT.md#worker-continuation-completed--2026-09-23)
used one direct page fetch and one extraction. Category and eight offerings
survived preparation. Passage review supports five offerings, partly supports
one and leaves two unestablished there. Hosted search remained active, so the
excerpt is not a complete account of possible sources. Model-written evidence
is not independent verification. The original failure's cause remains unknown.

Channels, reach and areas remained empty. This experiment neither proves a
complete rich summary nor justifies inventing missing meanings. Both paid
extraction slots and the diagnostic allowance are consumed. The USD 1.00
carryover is an approved estimate; USD 0.01325185 new cost and USD 1.03498655
total are application accounting, not independently verified billing.

## Product integration boundary

The active customer path is `SmartIntakeJourney` → identity →
`POST /api/audit/extract` → `liveExtractBusinessDraft` → OpenAI extraction →
`prepareUnderstanding` → `SmartSummary`. Scope the correction to this path;
changing only a legacy mapper or the temporary runner is insufficient.

- Preserve the existing identity endpoint, head-only identity fetch and icon
  behavior. The additional server fetch happens inside the extraction boundary,
  after existing switch, caller limits, mode/credentials and input validation.
  Use the validated canonical website URL already submitted for extraction.
- This is one **additional document read**, beyond the existing identity/icon
  work. It is not a claim that the whole preparation performs only one HTTP
  request. Keep the direct read limited to that document and permitted safe
  redirects. No crawl, discovered link, extra page, favicon, JavaScript execution,
  headless browser or automatic fetch retry is added.
- Reuse `safeFetchPublicResource` with an explicit bounded document mode. Its
  default stays head-only. Preserve the existing 512 KiB decoded-byte bound,
  five-second request/ten-second total limits, maximum three redirects, public
  DNS/destination validation and per-hop destination-rate charging. Missing
  production rate bindings must fail closed; a local stub must never substitute
  in production. Reject unrelated final hosts rather than widening the source.
- Website sources receive the new step. Existing Instagram handling remains
  unchanged and must not claim this website excerpt was obtained. Synthetic
  mode remains labeled and network-free. Do not expand source/provider authority.
- Accept source text only from this server-owned fetch/selection. A caller's
  `public_source_data`, success flag, URL or timestamp must not establish trusted
  fetched content. Keep the public extraction request schema's existing input
  boundary; construct supplemental input internally.
- Pass at most 8,000 UTF-8 bytes of selected text, the actual safe final source
  URL and retrieval time as labeled user-message data. The 2026-09-24 amendment
  permits the approved location-source discovery/meaning instructions and the
  market-area exception to generic retry shortening, with OpenAI/Gemini parity.
  Keep all other developer instructions, output schema, configured approved
  model/provider, reasoning, hosted-search settings, includes and token limits
  unchanged. Both enabled
  production aliases must reach the same input path. Testing-only adapters stay
  compatible and cannot claim to have consumed an excerpt they ignored.
- Build the complete request before the existing budget reservation. Preserve
  configured carryover, submitted prior ledger and current caps; do not hardcode
  the diagnostic's estimated reserve into product defaults. An allowed technical
  retry reuses the same excerpt and running ledger without another page fetch.
  Empty values or missing evidence never create an extra attempt.

## Source selection and privacy

Use a small, deterministic static-HTML-to-text helper with fictional tests.
Review its selection rules as product code; do not copy the experimental runner's
business-specific keyword decisions or manual inspection into the customer flow.

- Select business-description/product/service and explicit delivery/service-area
  text from visible heading, paragraph and list blocks, preferring main/article
  content, then eligible body content. Preserve page order and complete blocks
  under the byte limit; deduplicate repeated blocks without rewriting meaning.
  Standard entity decoding and whitespace cleanup are allowed; names, amounts,
  places and service wording must retain their meaning and spelling.
- Exclude scripts, styles, hidden content, embedded resources, forms, navigation,
  contact widgets, staff/customer profiles, testimonials and unrelated personal
  content. Do not execute page instructions or treat text as developer messages.
  Do not use an LLM or another provider to select or summarize the excerpt.
- Exclude ordinary contact details from selected blocks. Screen the candidate
  text before model use or any persistence using existing sensitive-input
  protections plus focused HTML/privacy regressions. A detected sensitive record
  or credential stops processing; do not merely remove that signal and continue
  with the rest of the page. This is a conservative screen, not a guarantee of
  perfect automated identification of personal data.
- No full HTML, excerpt, raw model response, inspector trace or diagnostic claim
  file enters browser storage, analytics, application logs, customer exports or
  Git. Keep the new excerpt in request memory only. Retain existing safe source
  links and origin semantics, not the experiment's evidence-storage mechanism.
- Selection need not recover every fact from a page. A page that requires
  JavaScript, lacks eligible blocks, or has only excluded content may produce
  no usable excerpt. Do not reconstruct its services from the business name,
  URL, category, address or source-selection keywords.

## Failure behavior and customer copy

| Outcome | Required behavior in the approved correction |
|---|---|
| Safe readable page with eligible excerpt | Attach it to the existing extraction; map returned proposals normally. No new confirmation or success badge. |
| Safe readable page but no eligible excerpt | Continue the unchanged website-search extraction once, without a fake/empty source-data object. Show a non-blocking summary notice: `Teks halaman belum cukup untuk menyiapkan informasi bisnis. Periksa draf ini dan lengkapi bagian yang masih kosong.` Do not claim the excerpt was read successfully. |
| Fetch/DNS/redirect/HTTP/media/byte/deadline failure | No extraction. Preserve typed entry, any already validated identity and prior ledger; show `Halaman website belum dapat dibaca untuk menyiapkan informasi bisnis. Coba lagi atau ganti URL.` Retrying is an explicit customer action subject to existing controls. |
| Rate limit/binding failure | Preserve existing 429/503 behavior, no provider work and no URL-only bypass. |
| Sensitive content detected | Stop before model use/persistence; use the existing restriction treatment. No excerpt or raw source in the error. |
| Budget/stage limit prevents extraction | Preserve current cost/error state and all prior ledger entries; no provider call or reset. |
| Extraction fails after a usable excerpt | Preserve source-stage outcome separately from extraction failure and retain returned telemetry. Do not classify it as page-fetch failure. |
| Valid empty/partial extraction | Keep Spec 011's summary and required-gap behavior. No retry for empty optional fields, unknown channels/reach or absent evidence. |

Use a minimal typed preparation status to distinguish included/no-usable-text/
not-attempted from source-stage failure, without raw text or free-form diagnostics.
Persist only an optional small status enum if needed to preserve the notice on
summary reload. Its absence in an existing v2 session means unknown, never
success. This is preparation metadata: it must not alter confirmed facts,
frozen versions, writer context, saved audit records or report/export contracts.
No migration or automatic rewrite of historical records is allowed.

## Output facts and provenance

Preserve Spec 011 R-03/R-06/R-09: website-derived model outputs are prepared
proposals, customer changes become owner-sourced, and confirmation is distinct
from independent verification. `Brand secara keseluruhan` stays `Saran Nuave`.

The supplemental excerpt is one input alongside existing hosted search. Do not
use literal string matching against that excerpt to accept/reject each offering,
invent missing citations, upgrade evidence confidence, or convert unsupported
values into Nuave suggestions merely to keep them. Keep actual evidence/source
links available through the existing summary disclosure without asserting that
each chip was individually checked. Missing model evidence alone does not block
a nonempty required proposal under the approved spec.

The five/one/two diagnostic assessment stays an uncertainty statement. A known
false claim or unsafe output remains a defect, not an accepted exception.
If future acceptance reveals a specific incorrect proposal, return that bounded
finding before changing the extraction/evidence policy. Automated fact matching,
new per-value provenance schemas and removing hosted search are separate product
decisions, not hidden requirements of this correction.

## Files and regression boundary

Approved implementation surfaces:

The following list records the original excerpt correction. The 2026-09-24
continuation is narrower: extraction instructions in `openai.ts` and `gemini.ts`,
their focused tests, and relevant intake/downstream regression tests. It does
not reopen the fetcher, selector, runtime UI, schema, mapper, report or observation
implementation. See the approved location-source package for its added cases.

- `src/lib/audit/safe-source-fetch.ts` and its existing tests: bounded document
  mode with unchanged default behavior.
- One small source-excerpt helper and fictional tests in `src/lib/audit/`, using
  existing parsing/privacy utilities where suitable; no new general scraper.
- `src/app/api/audit/extract/route.ts`, `src/lib/audit/openai.ts`, and focused
  route/provider tests: server-owned input, rate limits, request construction,
  unchanged method and accounting. Touch `provider.ts`/shared types only for the
  necessary typed handoff; no report/observation changes.
- `src/lib/intake/SmartIntakeJourney.tsx`, `SmartSummary.tsx` and focused tests;
  `smart-session.ts` only if minimal status persistence is needed. Preserve
  `smart-intake-contract.ts` proposal/confirmation semantics and all v2 locks.

Read relevant installed Next.js documentation before implementation. Do not
promote the temporary overlay, filesystem locks, inspector or live runner into
runtime. Preserve the accepted print CSS/test changes and all four protected
notes. No source/business content from private evidence is a test fixture.

Required meaningful regressions:

1. Real Smart intake integration, using a fictional local-business page with
   published offerings, channel and local area: one Periksa, same identity plus
   extraction API sequence, new bounded server read, exact supported values in
   the prepared summary. A separate sparse page leaves unknown values empty.
2. Client-injected excerpt/source metadata cannot replace server text; safe
   final URL and the complete exact user payload reach reservation/SDK dispatch.
   Removing that payload field and accounting for only the approved 2026-09-24
   extraction/area-retry instruction delta restores protected request equivalence.
   Assert all other request settings exactly; do not weaken equivalence checks
   with broad message omissions or snapshots that hide unrelated changes.
3. Default identity/head/icon behavior, synthetic mode and existing Instagram
   path remain unchanged; no new network work in fixtures/synthetic mode.
4. Whole-block UTF-8 boundaries, oversized/hidden/contact/personal/sensitive
   content, prompt-injection text, unsafe redirects, unavailable rate bindings,
   timeouts and no-text outcomes follow the table, with no content in logs,
   storage or downstream/export data.
5. Prior ledger/carryover, valid empty output, exhausted stage/cost, failed
   extraction and permitted technical retry: no reset, duplicate fetch or extra
   model call; no-text continuation occurs at most once per explicit attempt.
6. No-text notice and distinct failures are accessible and survive the relevant
   Back/reload flow without replay. Existing v2 restoration/confirmation locks
   and literal old v1 records remain intact.
7. Row origins, optional unknowns, unsupported channels/reach, source disclosure
   and owner correction behave as before. Missing excerpt matches do not become
   an unapproved per-value gate or a claim of verification.

Run focused tests, `npm run validate:fast`, then `npm run verify`; obtain an
independent review of the product diff. The diagnostic's 35 tests and PASS do
not replace those gates. No full product gate was run in this scoping turn.

## Accepted Spec 011 amendment and next sequence

The dated decision and Spec 011 now amend R-01, the preparation failure table
and AC-05/AC-07 to permit the bounded server excerpt step and no-text behavior
above. The F-03 exception is extended narrowly: the known successful controlled
input justifies this product correction while the historical cause remains
unresolved. Do not claim to have proven that old hosted search failed. All other
settled product and downstream boundaries remain in force.

The original offline correction and independent review passed. Its subsequently
authorized founder walkthrough completed, but completeness remained open. The
current continuation is the approved location-source instruction handoff above.
After its own focused/broad gates and independent review pass, prepare a
separately authorized founder walkthrough in one tab at desktop/mobile sizes,
stopping before final confirmation/question generation. Identify the source and
available required meanings honestly. The previous diagnostic business is not
automatically the rich local fixture: unknown service/reach/area values still
need customer choices and cannot be invented to satisfy the zero-typing outcome.

A successful corrected walkthrough and founder judgment can close F-03/AC-07;
diagnostic PASS alone cannot. Spec 011 becomes Verified only after all remaining
required checks pass or the founder explicitly accepts a documented exception.
Commit, push, PR publication, merge, deployment and live calls are not authorized
by this scope. Historical reactivation, legacy cleanup and report redesign
remain deferred.

Rough size: **medium**. The request extension is small; safe text selection,
source-stage errors, no-text continuation and real Smart-flow regressions carry
most of the work. This does not reopen the large run/report/export boundary.
