# Spec 011: Smart consultant prepared intake

> Status: **Verified** — acceptance closed on 2026-09-24 for preserved baseline `2a21f85` plus the reviewed 316-file working-tree manifest; current-main integration and PR/release readiness remain separate
> Owner: Founder / orchestrator
> Updated: 2026-09-24
> Implements: `docs/PRODUCT.md` — business confirmation that starts from Nuave's prepared understanding and preserves human approval
> Supersedes for the active `/audit` business-intake portion: conflicting fixed linear fact-screen, mandatory-comparator, per-screen confirmation, and duplicate final-review behavior from the earlier intake implementation
> Preserves: Spec 009/010 question review, explicit audit-start approval, observation method, measurement/evidence rules, report schema/layout, cost controls, and the `NUAVE_NEW_AUDIT_ENABLED` emergency switch; new-session context/export contracts and historical delivery behavior change only as specified below

This specification is the implementation authority for the prepared-understanding intake. The draft plan and its two reviews remain decision evidence, not implementation instructions.

The founder confirmed it on 2026-09-21 and approved the truthful downstream
boundary and historical hold on 2026-09-22. It incorporates the independent R2
review at commit `ca82d89`.

**Acceptance closed on 2026-09-24:** the orchestrator accepted the independent
[closeout PASS](./ACCEPTANCE_CLOSEOUT_REVIEW.md), which maps AC-00 through AC-08
to completed evidence and the founder's acceptance of the live reach and prepared
summary. **F-03 and AC-07 are closed; F-01 remains closed.** The verification
record below identifies the accepted working tree. Earlier approval-stage gates
below are historical; their required acceptance is now complete. The original
extraction cause remains unresolved under the approved exception, and the review's
language, retrieval and other stated limits remain. R-03 is unchanged. The app
remains unconfirmed; all live allowances are consumed.

**Whole-brand reach meaning settled on 2026-09-24:** the founder chose broad
business presence, not exact served-area enumeration. A documented national
outlet network can support national reach, with delivery limits separate. The
[dated decision](../../docs/DECISION_LOG.md#2026-09-24--whole-brand-reach-means-broad-business-presence)
governs this meaning. The founder subsequently **approved the revised
[location-source package](./F03_LOCATION_SOURCE_PROPOSAL.md) for offline
implementation**, including its regional-representation limitation. The
[implementation decision](../../docs/DECISION_LOG.md#2026-09-24--approve-the-f-03-location-source-implementation)
and [worker handoff](./F03_LOCATION_SOURCE_IMPLEMENTATION_PROMPT.md) authorized
the completed bounded work. The separately authorized walkthrough is complete;
no further live calls are authorized.

**F-03 product correction accepted on 2026-09-23:** the founder approved the
[bounded source-text handoff](./F03_PRODUCT_CORRECTION_SCOPE.md) for offline
implementation. That addendum and the
[dated decision](../../docs/DECISION_LOG.md#2026-09-23--approve-the-f-03-product-correction)
extend the earlier diagnostic-only boundary as specified below. The consumed
live allowance was not renewed by this approval; F-03/AC-07 remained open until
the acceptance closeout recorded above.

**F-03 diagnostic amendment accepted on 2026-09-22:** the founder authorized
one controlled-source-input experiment using the existing unused diagnostic
allowance. The recorded earlier cause may remain unresolved between source
access and extraction. This is a limited diagnostic exception, not approval
of a production retrieval change or a waiver of founder acceptance. The
[dated decision](../../docs/DECISION_LOG.md#2026-09-22--authorize-the-f-03-controlled-input-diagnostic)
and [exception below](#f-03-controlled-input-exception--approved-2026-09-22)
govern the task.

The [2026-09-22 founder decision](../../docs/DECISION_LOG.md#2026-09-22--accept-the-spec-011-truthful-boundary-and-historical-hold) closes the report/export review gate. The accepted R-00B result is **Cross-cutting**: truthful new-session run/report/storage/export context is required in this implementation; only legacy-only code removal is deferred. Old started/completed records are preserved with delivery and provider retries held. Earlier local sizing/review notes retain their original pending-approval wording as decision evidence; this amended specification and the dated decision govern implementation.

## Required context

Read in order:

1. `AGENTS.md`
2. This specification
3. `docs/PRODUCT.md`, sections **Customer**, **How results are reported**, **Customer journey → Business confirmation**, **Question review**, **Audit**, **Delivery**, and **What happens behind the scenes**
4. `docs/DESIGN.md`, sections **Approved stack**, **Motion and accessibility**, and **Design judgment**
5. `docs/AUDIT.md`, sections **Measurement statement**, **Turn evidence into findings**, **Handle missing and weak evidence**, **Report format**, **Report acceptance checklist**, and **Data boundaries**
6. Relevant implementation only:
   - `src/lib/audit/types.ts`
   - `src/lib/audit/openai.ts`
   - `src/lib/audit/gemini.ts`
   - `src/lib/intake/IntakeJourney.tsx`
   - `src/lib/intake/preparation.ts`
   - `src/lib/intake/state.ts`
   - `src/lib/intake/navigation.ts`
   - `src/lib/intake/local-session.ts`
   - `src/lib/intake/frozen-intake.ts`
   - `src/lib/intake/local-questions.ts`
   - `src/lib/intake/glm-local.ts`
   - `src/lib/audit/question-facts-v3.ts`
   - `src/lib/audit/questions-id-direct-ten.ts`
   - `src/app/audit/LocalAuditStage.tsx` and `ReportView.tsx`
   - `src/lib/intake/local-audit-session.ts`
   - `src/lib/audit/locked-question-pack.ts`, `report-pipeline.ts`, `contracts.ts`, and `customer-evidence-export.ts`
   - active observation/report provider adapters and their retry/repair callers
   - the active intake screens and focused tests under `src/lib/intake/`
   - affected `/api/audit/identity`, `/api/audit/extract`, question-preparation, run, and report request validators only when required by the versioned handoff

Do not load or use:

- `.secrets/` or any retained private/provider evidence;
- `archive/`;
- superseded intake plans, prototypes, or historical experiments;
- unrelated landing, payment, account, report-redesign, or provider-evaluation work.

## Settled product decisions

The founder has approved the following behavior for this specification:

1. The fixed questionnaire becomes one prepared summary plus clarification only for genuinely missing required meanings.
2. The happy path has one visible business-information confirmation and no duplicate final review.
3. Provenance uses only `Dari website Anda`, `Saran Nuave`, and `Dari Anda`, applied at row level without evidence matching.
4. Competitors, target customer, customer needs, decision considerations, differentiator, and public fact remain optional.
5. Comparator `unknown` is distinct from both named competitors and an explicit no-direct/category-alternatives choice.
6. Product focus reuses extracted offerings; location focus uses a responsibly detected target or a focused name-and-address fallback.
7. Existing identity plus one extraction call remains the preparation mechanism. The accepted F-03 correction adds only the bounded server-owned website excerpt read in the approved addendum; no other retrieval expansion is authorized.
8. The representative rich case is a local Indonesian business: zero typing after `Periksa`, one summary screen, at most two substantive customer decisions, and one confirmation before question review.
9. The existing extraction output is extended in the same call with service channels, market reach, and market areas; unsupported values remain empty.
10. `Brand secara keseluruhan` is the visible default focus proposal. It is a `Saran Nuave`, not website-derived evidence, and is not confirmed until the customer uses the final confirmation action.
11. Every new v2 audit uses one versioned projection of exact confirmed values and origins through run/report validation, synthesis, deterministic interpretation, persistence, and customer export. Optional meanings remain absent; no legacy filler is permitted anywhere in this new path.
12. New report interpretation may change because fabricated input is removed. Customer JSON advances to a truthful versioned context. The observation method, measurement/evidence rules, report output schema/layout, and approval/cost controls remain protected.
13. Old started/completed v1 records remain unchanged in their existing browser-session storage. This release holds their in-app report display, JSON/PDF delivery, observation resume, and report retry. Already downloaded files remain unchanged. This is the accepted release behavior, not a pending implementation gate or a promise of permanent backup. Historical reactivation requires a separate founder decision.

No additional founder decision is required by this specification.

## Pre-implementation evidence gate

**Complete locally; do not repeat.** The founder supplied the sanitized `EXTRACTION_FIELD_NOTE.md` before this amendment. The evidence supports keeping the three structured extraction additions. Workers verify receipt and preservation of the note; they do not inspect extraction again. The worker and reviewer must not open `.secrets/`, copy a response, or receive private/provider content.

The completed gate required only a field-level note outside private evidence, marking each inspected field as `filled`, `empty`, or `wrong`. Its required coverage was:

- discovered brand name;
- category;
- offerings;
- `market_context`;
- target customer;
- customer needs;
- decision considerations;
- comparison suggestions;
- differentiator/USP;
- evidence and warnings usefulness;
- whether the market text names a place; and
- whether any retained field states how customers receive the service or product.

The sanitized note must remain untracked, unstaged, uncommitted, and unpushed. If it is missing or differs from the handoff hash, stop and report the discrepancy; do not regenerate it or make a replacement provider call. This gate does not authorize private-evidence access or live question generation.

## Pre-implementation R-23 sizing gate

**Complete and founder-accepted on 2026-09-22.** The local `R23_SIZING_NOTE.md` traced the compatibility `BusinessBrief` through question preparation, audit-run requests, report requests, persistence, exports, and historical readers. The separate `REPORT_EXPORT_BOUNDARY_REVIEW.md` established that report synthesis receives fallback-filled context and JSON exposes it. Do not repeat these reviews as a prerequisite to coding.

The sizing classification used these definitions:

- **bounded** when honest optional values can be carried by the v2 frozen intake, `QuestionFactsV3`, and a direct-ten-specific/versioned request boundary without changing observation or report payloads, persisted audit records, report schemas, or historical readers; or
- **cross-cutting** when removing the compatibility fallbacks requires any of those downstream contracts to change.

The accepted result is **Cross-cutting**, with a **large** complete downstream boundary. Spec 011 must ship the prepared summary and exact confirmed-to-writer handoff together with truthful versioned run/report inputs, saved audit context, customer JSON, and print display. Removing fallback exposure from new reports/exports cannot be deferred. R-27 permits only the necessary input-meaning, comparator-matching, export-version, and historical-hold changes; it does not authorize a report layout, scoring, or observation-method redesign.

Defer only removal of legacy-only `BusinessBrief` builders/types/validators, historical matrix adapters, old canonical/GLM-slot paths, and receipt-bound retained-pack helpers that no new v2 path can reach. Strict old readers remain for preservation and binding checks. Existing legacy substitutions may remain as literal stored v1 values; they may not be reconstructed or used for new synthesis, output, or provider work. The historical hold is settled under R-21. The local sizing/review notes remain untracked, unstaged, uncommitted, and unpushed; no temporary exposure exception is approved.

## Problem

### Observed evidence

The active intake already calls the identity and extraction boundaries, but the customer experience discards or obscures much of the result:

- `prepareBoundaryIdentity()` retains only a small subset of `ExtractionDraft` and ignores the discovered display name, market context, target customer, decision considerations, differentiator, evidence, and warnings.
- Extracted candidates are not selected, so the customer re-selects information Nuave just found.
- The journey always visits separate scope, category, offering, customer, service, market, competitor, fact, and review screens.
- Service channels, market reach, and market areas are absent from the extraction schema even though they are required by the current intake handoff.
- Extraction explanatory text is requested in English.
- The frozen input cannot carry a distinct target customer or decision considerations into `QuestionFactsV3`; the local projection currently sets them to unknown.
- Compatibility projection invents target customer, decision criteria, and competitor meaning from unrelated values to satisfy the older `BusinessBrief` minimum.
- Synthetic mode deliberately returns an empty extraction, so existing end-to-end tests prove continuity but not the prepared-summary experience.

### Interpretation

Nuave performs real preparation but presents a questionnaire. That contradicts the intended customer outcome: the customer should mainly review, select, correct, and confirm. Typing should be an escape hatch.

## Desired outcome

After the customer enters a brand name and website URL and selects `Periksa`, Nuave shows one concise Indonesian screen headed:

> **Ini yang Nuave pahami.**

For a sufficiently readable local business, the screen already proposes the intended identity, whole-brand focus, category, main offerings, service channels, local reach, and service area. The customer can confirm without typing, or change one material choice and then confirm. One action — `Sudah sesuai — buat pertanyaan audit` — freezes exactly what is visible and selected and opens the existing question review.

Success for the representative rich case is:

- zero typed characters after the initial brand/URL entry;
- one summary screen;
- the unchanged fixture path requires only the final confirmation;
- at most two substantive decisions when the customer changes one proposal before confirming;
- no `Perlu dipastikan` detour; and
- no second business-information review screen.

A substantive decision is an explicit action that changes active business meaning, plus the final confirmation. Merely reading, expanding `Lihat sumber`/`Tambah detail`, or scrolling does not count.

## User and situation

The user is the owner or marketing decision-maker of a small or medium Indonesian business, commonly a local business. They have already supplied the business name and one supported public website and are trying to ensure Nuave tests the correct business context before question generation.

They should not have to reconstruct facts already present on their website. They must retain control over identity, audit focus, required business meaning, optional context, and the exact moment of confirmation.

## Scope

- The active `/audit` intake from brand/URL entry through the handoff to question review.
- One existing identity request and one existing extraction request.
- Three additional structured extraction fields: service channels, market reach, and market areas.
- Concise natural Indonesian extraction display text while preserving official names and source evidence.
- A prepared-understanding model separate from mutable selections and confirmed meaning.
- A single summary containing the always-needed focus, service-channel, reach, and conditional-area choices.
- One consolidated `Perlu dipastikan` stage for missing category, offering, or target meanings only.
- Explicit focus behavior for whole brand, one product/service, and one location.
- Optional customer context, alternatives, differentiator, and public fact.
- Row-level provenance and owner-source transition after customer edits.
- Exact freezing, origin preservation, safe schema versioning, stale-state rejection, and downstream projection.
- Versioned truthful direct-ten run/report inputs, report synthesis and deterministic interpretation, saved audit context, JSON export, and print display for new v2 sessions.
- Exact preservation and customer-output/provider-retry hold for already-started/completed v1 records, with separate readers and storage isolation.
- Focused unit/browser coverage, offline repository verification, and one separately authorized preparation-only founder walkthrough.

## Non-scope

- A new provider, model, provider call, crawler, browser service, research agent, fallback chain, or automatic retry for optional-empty fields.
- Reading extra website pages beyond the current extraction behavior.
- Google Maps, login-only sources, broad social discovery, arbitrary linked-domain discovery, or branch search.
- A conversational/chat intake.
- Payment, account, authentication, checkout, durable/private delivery infrastructure, dashboard, CRM, analytics-vendor, or cross-device-resume work.
- Changes to the direct-ten writer instruction, question model, question review/edit contract, observation method, report output schema/layout, scoring, or re-check behavior. Report input meaning, exact named-comparator matching, and JSON context/version change only to meet R-22/R-23/R-27.
- Broad report usefulness/content redesign, legacy-only code deletion, historical reactivation, or migration/regeneration of old records.
- A report finding based on differences between prepared and confirmed values.
- Per-chip evidence labels, evidence-to-value matching, confidence percentages, conflict inference, or fuzzy brand-name matching.
- Production deployment, merge, public rollout, or any live provider call without separate explicit founder authorization.
- Further product-policy changes beyond the accepted amendment. Record implementation/verification status under `docs/WORKFLOW.md`; do not revise parent product promises to fit code.

## Experience

### 1. Entry and reading

The entry remains neutral and minimal:

- `Nama brand`
- `Link website`
- `Periksa`

`Periksa` validates the source before provider work. The reading state may say Nuave is checking the source and preparing business information, but it must not imply success before identity and extraction return. Synthetic mode remains visibly labeled and must not claim to have read the website.

An unreadable source is an error state, not a successful empty summary.

### 2. Summary screen

The summary heading is exactly `Ini yang Nuave pahami.` The supporting copy tells the customer to check the prepared choices and change only what is not right.

The summary is one responsive screen, not a dashboard and not a stack of unrelated cards. It contains these rows in this order:

| Row | Visible behavior | Initial proposal | Row provenance before customer change |
|---|---|---|---|
| Business | Show the typed name, the discovered name when different, and the canonical source. The typed name is selected initially. | Typed name plus discovered option when available. | Selected typed/edited identity: `Dari Anda`; selected discovered identity: `Dari website Anda`. |
| Audit focus | Show choices for `Brand secara keseluruhan`, `Satu lokasi`, and `Satu produk atau layanan`. | `Brand secara keseluruhan` selected. | `Saran Nuave`; becomes `Dari Anda` after a customer change. |
| Category and main offerings | Show the prepared category and selected principal offerings with an `Ubah` affordance. Do not ask for a full catalogue. | Extracted category and offerings. | `Dari website Anda`; becomes `Dari Anda` after any row correction. |
| Service channels | Show all four existing channel choices directly in the row and preselect extracted supported channels. | Extracted channels or none. | `Dari website Anda`; becomes `Dari Anda` after any change. |
| Market reach | Show all four existing reach choices directly in the row and preselect extracted reach. | Extracted reach or none. | `Dari website Anda`; becomes `Dari Anda` after any change. |
| Market area | Show only for `sekitar` or `beberapa`; show extracted area choices and a manual fallback. | One or more published areas when supported. | `Dari website Anda`; becomes `Dari Anda` after any change. |
| Optional details | Show prepared customer context, alternatives, and differentiator when present. Otherwise keep them behind `Tambah detail`. Public fact is an owner-only optional input. | Prepared optional suggestions or collapsed empty controls. | Customer context, alternatives, and differentiator: `Saran Nuave`; any changed or supplied value: `Dari Anda`. |

No row shows internal field names, model confidence, unsupported praise, raw warnings, or a generic AI-written company biography.

When extraction evidence contains source URLs, the screen may show one summary-level `Lihat sumber` disclosure containing deduplicated source links. Evidence is not matched to individual chips and never determines whether a required non-empty proposal is accepted.

### 3. Required-empty clarification

The rule is:

> Ask only when an active required meaning is empty.

`Perlu dipastikan` is one consolidated stage and is used only for:

- no category;
- no offering for whole-brand or location focus;
- no selected product/service target after product focus is chosen; or
- no location name and address after location focus is chosen.

Audit focus, service channels, market reach, and conditional market area never create this detour; their complete choices are already on the summary. Empty optional customer context, competitors, differentiator, public fact, low confidence, missing evidence text, wording mismatch, and an empty suggestion list never create a clarification.

When required gaps exist, the final confirmation is not presented as available. The summary instead offers `Lengkapi yang perlu dipastikan`, opens the single clarification stage, and returns to the updated summary after completion. There is no second final-review screen.

### 4. One confirmation

When all active required meanings are valid, the one visible business-information action is exactly:

> **Sudah sesuai — buat pertanyaan audit**

The action confirms and freezes the currently visible selected proposals. It does not confirm anything merely because it was displayed or preselected before the click. It excludes hidden, rejected, unselected, inactive, and optional-empty values. It then starts the existing question-preparation step.

Question review, wording edits, and the explicit audit-start action remain separate and unchanged.

### 5. Responsive and accessible behavior

Desktop and mobile present the same meaning and choices, but mobile is intentionally composed: information order remains logical, rows do not become dense card soup, choices have approximately 44 px targets, and the primary action remains discoverable without covering content.

All controls retain keyboard operation, visible focus, programmatic labels, logical headings, status/error announcements, and non-color-only provenance. A disclosure or dialog returns focus correctly and supports Escape when the chosen approved primitive provides it. Reduced motion does not remove state information.

## Requirements

### Preparation and extraction

- **R-00A — Founder-only evidence note:** Completed locally. Verify the supplied sanitized note and preserve it outside Git; do not repeat extraction inspection, read `.secrets`, or make a replacement call.

- **R-00B — Accepted sizing and boundary:** The recorded classification is Cross-cutting. The founder accepted the report/export review, required truthful new-session downstream context, and approved the historical hold on 2026-09-22. These pre-code decisions are complete. Implement the amended boundary; defer only legacy-only removal and historical reactivation. Do not reopen sizing or treat older pending-approval notes as a new blocker.

- **R-01 — Existing call boundary with F-03 correction:** Entry uses the existing identity request and exactly one existing extraction request. The approved F-03 addendum adds one bounded server-side document read inside website extraction, beyond existing identity/icon work. Pass at most 8,000 UTF-8 bytes of server-selected public text with source/time before the existing reservation. A safe readable page with no usable excerpt continues the existing extraction without supplemental text and shows the approved notice; unsafe/unreadable/sensitive/rate failures stop before paid extraction. Synthetic mode and existing Instagram behavior remain unchanged. This adds no provider request. Preserve existing technical retry rules and ledger; a retry reuses the excerpt without another fetch, and empty optional fields never trigger one.

  **Location-source amendment, approved 2026-09-24:** within that existing
  extraction, use homepage evidence first and direct the existing restricted
  search toward official location/service-area evidence when current reach is
  unsupported or ambiguous. Use the supplied identity/domain and generic intent;
  do not guess paths. Select at most one relevant page on the canonical host
  (`www` equivalence allowed), choosing locations for premises-based presence
  and coverage statements for delivery claims. Ambiguity remains unknown; do not
  merge partial lists or add an application fetch/model request. Request actual
  evidence URLs. Keep hosted-search settings unchanged: the requested tool/page
  limits are advisory instructions, not hard provider retrieval/time guarantees.
  Build amended initial/retry requests before reservation. Only the existing
  no-parsed-output technical retry is eligible; valid partial output never retries.

- **R-02 — Extraction contract:** Extend `extractionDraftSchema`, every manual/synthetic fallback that constructs `ExtractionDraft`, and the matching provider schemas with these exact fields:

  | Field | Wire contract | Unsupported state |
  |---|---|---|
  | `service_channels` | Array containing zero or more unique values from `on_premise`, `on_customer`, `delivery`, `online`; maximum four. | `[]` |
  | `market_reach` | One of `sekitar`, `beberapa`, `seluruh`, `luar`, or the empty string. These map directly to the current `MarketKind`. | `""` |
  | `market_areas` | Deduplicated short place names published by the business; at most eight values, preserving the business's spelling. | `[]` |

  The extractor must not infer a service channel, reach, or area from generic category knowledge. A contact address alone is not service coverage. `market_areas` names where the business says it serves or receives customers, not every address found on the site.

  For whole-brand audits, reach means supported broad business presence through
  the stated service channels, not a complete outlet inventory. A documented
  national outlet network can support `seluruh`; national presence does not
  imply delivery to every address. Keep delivery limits separate. A count,
  aspiration or overflowing area list alone cannot establish national reach.
  The eight-area bound does not require national/international audits to list
  every city; their active areas remain empty under R-05.

  Use `sekitar` for supported presence centered on one local area; `beberapa`
  for supported named cities/regions without evidence of national presence;
  `seluruh` for an explicit current national-availability statement or a
  documented geographically distributed domestic operating network; and `luar`
  for supported current presence in Indonesia and abroad. No outlet threshold
  or foreign-sounding name establishes those broader meanings. Unsupported
  classifications remain empty. Preserve channel meanings; ordering online
  does not alone establish receiving/using a service online.

  **Approved regional limit:** distinguish outlets from meaningful geographic
  areas. Reuse published broader area descriptions only when faithful to the
  evidence. If genuinely regional presence cannot fit within eight supported
  areas and no supported broader description exists, retain supported reach but
  leave areas empty and unresolved in the existing inline controls. Never sample
  the first/biggest eight, invent an umbrella region, broaden to national to
  escape the cap or automatically change focus. Directory size/pagination alone
  does not make national presence unresolved. Exempt market areas from generic
  retry list shortening so supported five-to-eight-area descriptions survive;
  retry eligibility and all other limits remain unchanged.

- **R-03 — Indonesian and evidence preservation:** Change extraction explanatory text to concise natural Indonesian. Preserve official brand names, place names, product/service names, URLs, and exact source evidence as published. Do not translate or normalize those protected strings. Keep source evidence and warnings available to the boundary, but do not use them for per-value gating.

- **R-04 — Provider parity:** Update the OpenAI extraction schema/instruction and the matching Gemini extraction schema/instruction in the same change. OpenAI remains the protected production extraction path; Gemini remains testing-only, but it must not produce a different contract. Other adapters that construct the shared `ExtractionDraft` must at least compile and return the three new fields empty when unsupported; this does not expand their production authority.

  The approved location-source amendment changes extraction instructions in
  both OpenAI and Gemini with the same geographic meanings and unknown states.
  Preserve each adapter's existing tools/settings and the shared schema. It
  does not authorize a new provider, fallback or production role for Gemini.

- **R-05 — Deterministic preparation mapping:** Map the new output without parsing `market_context` prose:
  - service values map to the existing service option IDs;
  - `market_reach` maps directly to the existing `MarketKind`;
  - trim and case-insensitively deduplicate areas while preserving the first published spelling;
  - for `sekitar`, preselect an area only when exactly one non-empty area is returned; keep zero or multiple areas as visible suggestions with no selected area;
  - for `beberapa`, preselect every returned area;
  - for `seluruh` or `luar`, clear active areas;
  - when reach is empty, retain returned areas only as suggestions and leave reach unselected.

### Prepared, draft, and confirmed meaning

- **R-06 — Separate authority states:** Keep three distinct concepts:
  1. immutable `preparedUnderstanding` for one accepted source/preparation version;
  2. the existing mutable working selection used by the summary; and
  3. `confirmed` meaning, which is absent until the final confirmation action.

  Display, preselection, navigation, and correction never mutate prepared evidence into confirmed facts.

- **R-07 — Minimal meaning shapes:** The application-owned representation must be semantically equivalent to:

  ```ts
  type PreparedOrigin = "website" | "nuave";
  type ConfirmedOrigin = PreparedOrigin | "owner";

  type PreparedMeaning<T> = {
    proposed: T | null;
    origin: PreparedOrigin;
  };

  type ConfirmedMeaning<T> = {
    value: T;
    origin: ConfirmedOrigin;
  };
  ```

  `PreparedMeaning` has no `alternatives` and no `applicability` in this release. The identity row holds `typedName`, `discoveredName`, and `canonicalSource` directly. Equivalent local names are allowed; these semantics are not.

- **R-08 — Required prepared fields:** `preparedUnderstanding` keeps, at minimum:
  - typed and discovered identity plus canonical source;
  - default focus proposal;
  - responsible detected target, if any;
  - category and offerings;
  - service channels;
  - market reach and areas;
  - target customer, customer needs, and decision considerations as distinct fields;
  - comparator suggestions;
  - differentiator;
  - name variants needed by identity protection; and
  - deduplicated source links for the optional summary disclosure.

  Raw provider output is not passed directly into presentation components.

- **R-09 — Row-level origin:** Apply one provenance label to each visible row, never one label per chip. Unchanged prepared values retain their prepared origin at confirmation. Any customer-entered or corrected row becomes `owner`/`Dari Anda`. For a combined row, any material customer change makes that row owner-sourced. Delete interpretive tests such as “when interpretive” and blanket rules such as “any normalized summary wording.”

### Identity, focus, and validation

- **R-10 — Identity choices:** Always show the typed name. Show the discovered display name as a second choice whenever its trimmed string is not exactly equal to the trimmed typed string; perform no fuzzy, token, case-folded, or semantic matching. The typed name is preselected. Selecting the typed/edited name is owner-sourced; selecting the discovered name is website-sourced. A name difference alone never blocks. An unreadable source or the absence of any valid name/source does block.

- **R-11 — Default focus:** Show `Brand secara keseluruhan` as the selected proposal on first summary render. The customer may choose one product/service or one location. A focus choice is never confirmation.

- **R-12 — Focus-change behavior:** Apply this table exactly:

  | Focus | Required behavior |
  |---|---|
  | Whole brand | All visible prepared proposals remain. No target is active. |
  | One product/service | Require one target. Reuse extracted offerings before text fallback. The offerings meaning becomes exactly the chosen offering; all other visible proposals remain. |
  | One location | Require one exact location name and address. Category, offerings, and service channels remain visible proposals. Clear reach and area because branch coverage is not brand coverage. Use a responsibly detected location only when the current source explicitly identifies the location and address; otherwise show the focused manual name/address fallback. Market-area suggestions never become branch targets. |

  Rows not cleared by the table remain proposals, not branch- or product-confirmed facts. Returning to whole-brand focus restores the retained whole-brand draft values rather than treating branch coverage as brand coverage. Changing focus never confirms anything.

- **R-13 — Required meanings:** Final confirmation requires:
  - valid identity and one supported canonical source;
  - explicit focus selection;
  - exact target only for product/location focus;
  - category;
  - at least one offering for whole-brand/location focus;
  - the chosen product as the sole offering meaning for product focus;
  - at least one service channel;
  - market reach; and
  - exactly one area for `sekitar`, at least one area for `beberapa`, and no active area for `seluruh`/`luar`.

- **R-14 — Optional meanings:** Target customer, customer needs, decision considerations, competitors/alternatives, differentiator, and public fact remain optional. Their absence, low confidence, wording mismatch, missing evidence, or empty suggestion list does not block and does not create `Perlu dipastikan`.

- **R-15 — Text escape hatches:** Product target offers extracted offerings first. Location uses a prepared target only when responsibly available. Category, offering, product target, location target/address, market area, comparator, differentiator, and public-fact text fallbacks retain existing length bounds and sensitive-data screening before commit, persistence, or model use. Typing is never the initial control when valid choices exist.

### Comparator and optional context

- **R-16 — Comparator state:** The confirmed comparator shape supports `named`, `category-alternatives`, and `unknown`.
  - untouched/empty optional comparison is `unknown` with no names;
  - selecting or entering names is `named`;
  - `category-alternatives` is used only after an explicit customer no-direct/category-alternatives choice;
  - `unknown` maps to `QuestionFactsV3.comparison.kind = "unresolved"` with `name = null` and never produces a correction requirement;
  - unknown never claims “no competitors” and never fabricates a confirmed category alternative.

- **R-17 — Distinct optional fields:** Carry confirmed target customer, customer needs, and decision considerations separately through the frozen input and facts adapter. `QuestionFactsV3.targetCustomer` comes only from confirmed target customer; `customerNeeds` comes only from confirmed needs; `buyerConstraints` comes only from confirmed decision considerations. Service channels remain service channels.

### Confirmation, handoff, and versioning

- **R-18 — Single atomic confirmation:** `Sudah sesuai — buat pertanyaan audit` must, in one guarded transaction:
  1. validate every active required meaning;
  2. copy the current visible selected values into confirmed meanings;
  3. preserve unchanged prepared origins and set changed/supplied meanings to `owner`;
  4. exclude inactive, hidden, rejected, unselected, and optional-empty values;
  5. encode comparator unknown explicitly;
  6. bump/materialize the exact fact version and fingerprint;
  7. persist/freeze that exact confirmed version; and
  8. start existing question preparation once.

  Double-clicks or rerenders cannot create a second freeze or question request. The summary itself is the review; no second business-information review follows it.

- **R-19 — Frozen input v2:** Advance the frozen intake contract to `nuave-local-intake-input-v2`. The v2 confirmed record must preserve value and origin for identity/source, focus, target, category, offerings, service channels, market, optional customer context, comparator state, differentiator, and public fact. Optional empty customer context/differentiator/public fact is omitted or `null`; comparator unknown is explicit. Product focus freezes the chosen target as the sole offering meaning rather than an empty offering list.

- **R-20 — Coupled version bumps:** Update together:
  - `LOCAL_INTAKE_INPUT_VERSION` and the server-side literal in `question-facts-v3.ts`;
  - the persisted question-pack version because it embeds the frozen input;
  - the local intake session schema/storage version because its state shape and route change;
  - `FACTS_PROJECTION_VERSION` because local projection semantics change;
  - the versioned direct-ten audit context and run/report request discriminators;
  - the saved audit record schema/storage key for truthful v2 context; and
  - customer JSON to `nuave-evidence-v5`, carrying confirmed context instead of a fallback-filled legacy brief.

  Keep strict old schemas/readers separate and preserve existing v1 storage keys/bytes before v2 initialization. Reject old run/report request variants before provider work. New request parsers must not silently reinterpret an old `brief` as truthful context. Do not change the direct-ten writer-instruction version. Identify the report context version in provenance and bump the report-prompt version when its instruction changes; retain the report output schema.

- **R-21 — Historical preservation and hold:** Reject incompatible pre-confirmation intake and unstarted question-pack state. At most, recover the plain typed name and a valid normalized source as a fresh entry; never restore old prepared/confirmed meaning. For an already-started/completed v1 audit:
  - preserve the exact serialized intake and audit-record pair, frozen input/fingerprint, approved pack/originals/edits, saved brief, observations, report, provenance, and cost ledger;
  - use the old strict reader only for preservation and binding checks; never rebuild its brief, migrate/regenerate it, or delete a valid old pair because v2 validation rejects it;
  - make no automatic provider or budget request on restoration;
  - hold in-app report display, JSON/PDF delivery, observation resume, and report-only retry; enforce the provider hold at the server boundary as well as the UI;
  - show a clear Indonesian availability state without displaying old business claims or promising a recovery date; a deliberate fresh entry may start a new audit, never an automatic conversion or rerun; and
  - keep old storage isolated when new v2 work begins. Existing downloaded files remain untouched. Preservation is limited to the existing browser session, not a durable backup or new retention promise.

  This hold is the founder-approved behavior for this release. Historical delivery/resume is separately deferred and is not a remaining implementation gate. New v2 sessions retain normal report display, download, and controlled resume/retry behavior.

- **R-22 — Exact downstream projection:** The exact confirmed v2 values and origins reach the frozen input, `QuestionFactsV3`, the direct-ten writer brief, and one explicitly versioned direct-ten audit context. Hidden, inactive, rejected, unselected, and optional-empty values do not. Confirmed target customer, needs, and decision considerations remain distinct; the target and considerations appear in the writer when present.

  The new context carries only confirmed identity/source/aliases, focus/target, category, active offerings, service channels, reach/areas, optional customer meanings, comparator mode/all named comparators, differentiator, and public fact. Preserve origin wherever a report claim uses the value. Business/legal type remains absent unless independently supported; category never supplies it. Report synthesis receives confirmed context, not a blanket claim that all inputs are independently verified.

  Use that same saved context for run/report validation, lock/identity checks, synthesis and repair, deterministic interpretation, interrupted-run resume, report retry, report display/print, and JSON export. Persist the exact context and ordered approved-question binding before execution; never rebuild them from mutable intake or a legacy bridge on retry. Preserve original questions, edits, observations, provenance, and cost ledgers. All confirmed named comparators remain available for identity protection and evidence-based matching; unknown and explicit category alternatives provide no named company to report as an observed competitor.

- **R-23 — No fabricated completeness:** Prepared, confirmed, frozen-v2, `QuestionFactsV3`, direct-ten writer, and new run/report/storage/export paths must never create these substitutions:
  - service channels as decision criteria;
  - category plus market as target customer;
  - target customer duplicated as customer needs;
  - category, channel, or target customer used as buyer criteria;
  - unknown comparator converted to a category-alternative claim;
  - category used as an offering when required offering/target validation should have caught absence;
  - entered name treated as independently discovered identity; and
  - category treated as a verified business/legal type.

  The accepted Cross-cutting result requires a truthful versioned direct-ten boundary for every new session. No new v2 run/report request, saved record, report input, deterministic interpretation, or customer export uses fallback-filled `BusinessBrief`. Empty/unknown values remain explicit absence, not sentinel prose in a required verified-fact field. Do not weaken historical legacy validation.

  Apply the truthful boundary to every report adapter enabled for v2. An unsupported testing-only adapter must reject v2 before provider work rather than receive a compatibility brief. Protected observation model messages remain the exact approved question plus the existing neutral instruction. No report retry/repair, pack convenience field, or restoration path may reintroduce filler or project legacy values back into v2 state.

  Legacy substitutions may survive only as unchanged stored v1 values under R-21's hold and in unreachable legacy-only code awaiting separate removal. Enumerate those sites and actual remaining consumers in `VERIFICATION.md`; prove that none serves new synthesis or customer output. Cleanup of obsolete code is deferred; removing new-path exposure is not.

- **R-24 — Material correction:** A material change after question generation increments the fact version, invalidates the stale question pack, and requires a fresh question preparation and approval. Cancel/Back restores the last committed stable summary. Identity/source change creates a new preparation version and may make one new existing preparation call only after the customer explicitly selects `Periksa`.

### Safety, cost, and preserved behavior

- **R-25 — Request and cost controls:** Reload, Back, mobile emulation, disclosure toggles, and duplicate clicks do not repeat settled identity, extraction, question, observation, or report work. Existing telemetry, rate-limit responses, interrupted-attempt accounting, per-request ceilings, and session cost limit remain intact.

- **R-26 — Sole off switch:** `NUAVE_NEW_AUDIT_ENABLED` remains the only emergency off switch for the audit journey and routes. Do not add a smart-intake feature flag or a second flag matrix. Existing server-selected live/synthetic mode remains, but it is not a second emergency switch.

- **R-27 — Protected behavior and accepted changes:** Preserve question review/edit, explicit audit approval, ten observations, observation model messages/method, measurement/evidence rules, 10/10 delivery gates, report output schema/layout, budget/retry controls, cost display, and the sole off switch. New v2 sessions retain report generation, JSON/PDF controls, persistence, and explicit recovery using their exact saved context.

  The founder permits the necessary changes to run/report input contracts, new report input meaning and resulting interpretation, exact named-comparator matching, saved-context contracts, and JSON context/version. A report can differ for the same observations because fabricated inputs have been removed; do not describe report interpretation or export semantics as unchanged. R-21's historical output/provider hold is also an explicit accepted behavior change. These exceptions do not authorize changing question wording policy, scoring, observation execution, report layout, or broad report usefulness work.

  Keep existing customer-export exclusions for internal call telemetry, provider failure diagnostics, and legacy report metrics. Preserving the internal cost ledger does not authorize exporting that whole ledger; retain only the existing customer-facing provenance and cost summary alongside the new confirmed context.

## Failure and recovery

| Situation | Required behavior |
|---|---|
| Invalid source | Show a field-level correction before provider work. Preserve typed name and URL draft. Never guess a URL. |
| Source unreadable or identity request fails | Preserve entry and show retry/change-source actions. Do not show a found-business summary. No extraction or downstream call occurs after the failure. |
| F-03 document read succeeds with no usable safe excerpt | Continue the existing hosted-search extraction once without supplemental text. Show the limitation notice in the approved addendum; preserve unknowns and existing required-gap behavior. |
| F-03 document read is unsafe, unreadable, rate-limited or contains sensitive records | Stop before paid extraction; preserve safe entry/identity and prior ledger. Use the addendum's distinct source/rate/privacy treatment. Do not fall back to URL-only extraction for these failures. |
| Extraction request fails | Preserve validated identity and the provider telemetry/failure state. Offer an explicit retry subject to existing limits; do not inject fixture facts. |
| Extraction succeeds with all business fields empty | Show the readable identity, default whole-brand proposal, and the fixed service/reach choices on the summary. Send only missing category/offering/target to `Perlu dipastikan`. No optional question blocks. |
| Partial extraction | Preserve and preselect every supported proposal. Ask only for active required empty meanings. Missing or ambiguous location evidence never triggers another fetch/model call. |
| Genuinely regional presence cannot fit eight supported areas and has no faithful published broader description | Retain supported reach, leave areas unresolved, and use the existing inline controls. Confirmation stays unavailable while a required area is missing. No arbitrary subset, national promotion or automatic focus change. Supported national/international presence retains its existing empty-area representation. |
| New service/reach/area fields are unsupported | Leave them empty. The customer selects from the summary choices. Do not retry extraction merely to fill them. |
| `sekitar` returns zero or multiple areas | Show area suggestions, select none, and require one area on the summary. Do not choose the first area silently. |
| Typed and discovered names differ | Show both; typed name remains selected. No fuzzy matching or conflict state. |
| Product focus has no extracted offering | Use the focused product/service text fallback inside `Perlu dipastikan`. |
| Location focus has no responsible candidate | Use the focused name-and-address fallback inside `Perlu dipastikan`; do not convert a market area into a branch. |
| No competitor suggestion or customer leaves it untouched | Freeze comparator `unknown`; continue without a question. |
| Optional value contains sensitive data | Stop before persistence/model use, keep the last safe committed value, and show the existing restriction message. |
| Required gap remains | Do not expose the final confirmation as available; link to the single `Perlu dipastikan` stage and return to the summary afterward. |
| Material correction after questions exist | Invalidate the pack and require regeneration/reapproval. Never keep stale questions bound to changed facts. |
| Refresh, Back, or double-click | Restore the last stable state and never silently repeat a settled provider request. |
| `429` or `503` | Preserve stable work, show the existing wait/unavailable message and explicit retry, and make no downstream provider call. |
| Incompatible old intake/pack | Reject it and require fresh preparation/confirmation, optionally retaining only safe name/source. |
| V1 audit already started/completed | Preserve exact old serialized records and provenance. Show the historical availability state; hold report display, JSON/PDF, observation resume, and report retry. No migration, deletion, automatic network work, or rebuilt brief. |
| Old client attempts run/report work | Reject its old request version before provider work, even if UI controls were bypassed. Preserve the sole off-switch and existing cost/rate protections. |
| New v2 run interrupted or report fails | Explicit recovery uses the saved exact v2 context, approved wording, completed observations, and ledger; execute only missing permitted work. |

## Evidence, data, privacy, and cost

- Use only the public business source supplied for the audit and the existing restricted-domain extraction behavior.
- The preparation draft is a proposal. The single confirmation establishes selected customer-confirmed meaning; it does not independently verify owner-supplied or Nuave-proposed claims. Preserve origin through report context and export.
- Preserve exact official names, product/service names, place names, URLs, and source evidence. Do not manufacture evidence or imply that comparison suggestions were found on the website.
- Provenance is field/row based, not inferred by matching model-authored evidence text.
- Do not collect customer records, credentials, contact details unrelated to the audit, payment data, medical/legal/financial records, or sensitive free text.
- Raw provider content and private retained responses do not enter Git, analytics, customer-facing source disclosures, or the implementation worker's context.
- No additional provider call, model, fallback, or optional-field retry is authorized. Extending the structured output occurs inside the existing extraction request and its existing budget.
- A live identity/extraction check requires a fresh explicit founder authorization. It stops before question generation unless question generation is separately authorized.
- No commit, push, merge, deployment, production activation, or provider contact is authorized by this specification alone.

## Acceptance criteria

- **AC-00 — Pre-code gates:** The sanitized extraction note is received locally, the sizing note records Cross-cutting with fallback/consumer inventory, and the report/export boundary review plus founder acceptance are recorded. The 2026-09-22 decision satisfies the acceptance gate. Preserve local evidence notes; do not repeat private inspection or seek approval already given. The required implementation includes truthful new downstream context and the historical hold; only legacy-only removal and historical reactivation are deferred.

- **AC-01 — Rich local one-screen path:** Given the ordinary blank `/audit` entry and intercepted live-shaped identity/extraction responses for a fictional local Indonesian business, when the customer enters brand/URL and selects `Periksa`, then:
  - the next customer-decision screen is `Ini yang Nuave pahami.`;
  - the fixture provides category, at least two offerings, at least one service channel, `market_reach = sekitar`, and exactly one proposed local area;
  - whole-brand focus, channels, reach, and area are selected proposals;
  - the customer types zero characters after `Periksa`;
  - the unchanged path remains on one summary screen and requires only the final confirmation;
  - a path with one customer correction stays within two substantive decisions including confirmation;
  - `Perlu dipastikan` is not visited; and
  - one `Sudah sesuai — buat pertanyaan audit` action opens question review without a duplicate business review.

- **AC-02 — Exact values and origins:** Given prepared website and Nuave suggestions plus customer edits, when the summary is confirmed, then the exact visible selected values and row origins reach the v2 frozen intake, facts projection, writer brief, and saved downstream context. Target customer and decision considerations reach the writer when confirmed. Hidden, inactive, rejected, unselected, and optional-empty values do not. A customer-edited row is owner-sourced. Comparator unknown maps to unresolved and claims neither no competitors nor category alternatives.

- **AC-03 — Partial and empty preparation:** Given partial or empty extraction, when the summary renders, then focus, service channels, reach, and conditional area remain directly selectable on the summary; only missing category, offering, or active target can open the consolidated `Perlu dipastikan` stage. Optional absence never blocks. An entered business receives no fixture facts.
  - Location-source amendment: a fictional unrepresentable regional case retains supported `beberapa` with empty areas and disabled confirmation until the required meaning is supplied through existing controls. A supported national case uses `seluruh`, has no active city list and can confirm when all other required meanings are valid. Neither case fabricates an optional customer segment or changes origins.

- **AC-04 — Focus behavior:** Given prepared whole-business proposals, when focus changes:
  - whole brand keeps all prepared proposals;
  - product focus can select an extracted offering without typing and freezes it as the sole offering meaning;
  - location focus keeps category, offerings, and channels, clears reach/area, and uses a name/address fallback when no responsible target exists; and
  - no focus change confirms a value or transfers branch coverage to whole-brand coverage.

- **AC-05 — Extraction contract and language:** Given OpenAI and Gemini extraction tests, when a supported website supplies delivery/access and a local service area, then the three structured fields parse within the exact enums, explanatory text is concise Indonesian, official names/place names/URLs/evidence remain unchanged, and the same call count is retained. When unsupported, the fields are empty and no optional-field retry occurs. Manual/synthetic fallbacks include empty values for all three fields.
  - F-03 correction: the real Smart intake integration proves server-owned excerpt/source/time reach the complete request before reservation and SDK dispatch, with unchanged provider request settings except that user-data addition and the approved location-source/area-retry instructions. Cover safe fetch/privacy/no-text failures, prior accounting and retry reuse, caller-injected text rejection, unchanged identity/synthetic/Instagram behavior, no raw text persistence/export, and existing proposal origins. Use the full regression boundary in the approved addendum.
  - Location-source amendment: inspect actual initial/retry requests and provider parity. Fictional cases cover official location evidence, aspiration/contact/count-only unknowns, one local area, six regional areas preserved through technical retry, explicitly published broader regions, national presence with empty active areas, and the accepted unresolved regional limit. Preserve exact values/origins through confirmation and downstream context without manufacturing universal delivery. Mocked results prove request and application behavior, not real hosted discovery or semantic reliability; those still require separately authorized live validation and founder judgment.

- **AC-06 — Recovery, versioning, and cost:** Reload, Back, double-click, and non-material disclosure actions do not repeat paid work. Material edits invalidate stale packs. New v2 interrupted-run resume and report-only retry use their exact saved context/questions/observations/ledger. Rate-limit/interrupted states retain honest telemetry and stable work. `NUAVE_NEW_AUDIT_ENABLED` remains the sole off switch.
  - Reject v1 pre-confirmation/unstarted state; preserve literal fictional pre-change started/completed intake/audit pairs with non-null briefs, originals/edits, ten-observation reports, and cost/provenance ledgers byte-for-byte in storage.
  - Cover completed, zero/partially observed, interrupted, report-failed, and pre-provider-failure states; apply the hold once execution has started, even with zero observations. Restoration performs no provider/budget requests, displays no old report, and enables no old JSON/print/resume/retry action.
  - Direct old-version run/report requests fail before provider work. Existing downloaded files are outside mutation scope.
  - Old readers/strict validators and explicit historical fixture IDs remain valid. V2 initialization, incompatible state, and fingerprint/question mismatches never overwrite/delete a valid old pair. Test old/new coexistence and maximum supported field/fingerprint sizes without truncating meaning.

- **AC-07 — Existing path and founder judgment:**
  - Focused tests pass.
  - `npm run validate:fast` passes offline.
  - `npm run verify` passes offline with dummy credentials and no live provider calls.
  - For a newly confirmed v2 session, question review/edit → explicit audit approval → ten observations → report → JSON/PDF controls remains intact, including reload/Back and explicit recovery without duplicate work. Historical behavior is assessed against AC-06's accepted hold.
  - After separate authorization for one live preparation, the founder performs desktop and mobile walkthroughs in the same browser tab, using browser device emulation for mobile unless a second preparation call is explicitly authorized. The walkthrough records typed characters, substantive decisions, corrections, readiness time, identity/extraction calls, extraction cost, and the failing layer for every missing material fact. The preparation-only authorization stops before pressing the final action unless question generation is separately authorized.
  - The founder answers: “Does this feel like confirming a consultant's prepared understanding rather than filling a form?” Zero typing is not sufficient if the summary is misleading.
  - The recorded F-03 attempt may retain the unresolved upstream cause under the approved diagnostic exception below. Its controlled-input experiment does not substitute for the product walkthrough or renewed founder judgment.
  - The accepted product correction requires its own focused tests, `validate:fast`, `verify` and independent product review. A later separately authorized walkthrough records the added document read and source outcome; no diagnostic rerun or new live allowance follows from implementation approval.

- **AC-08 — Truthful report and export boundary:** Fictional cases with absent optional target/needs/criteria/type, comparator unknown, explicit category alternatives, multiple named comparators, product focus, and distinct confirmed values prove:
  - no invented substitution reaches request validation, lock/minimizer, any v2-enabled report provider, synthesis/repair/retry, deterministic matching, saved audit context, or customer JSON/print display;
  - all and only confirmed named comparators are eligible for named-competitor matching against actual observations; an alternative-category phrase is not a named company;
  - protected observation messages and approved question text remain unchanged by the new context transport;
  - `nuave-evidence-v5` exports exact saved confirmed context/origins, questions/originals/edits, observations, report, and existing customer-facing provenance/cost summary without a legacy brief or newly exposed internal diagnostics; reload/export comparisons ignore only documented volatile fields such as `exported_at`;
  - new reports retain the current output schema/layout, ten details, evidence/measurement gates, and print mechanism; print checks cover DOM/content and rendering, not an untested OS save dialog; and
  - tests inspect actual request/export payloads, not just TypeScript types or comments. Old tests generated by the new builder alone do not prove historical preservation.

## Open questions

None for this implementation. R-00A, R-00B, the downstream boundary, and the historical hold are settled. Any future reactivation of historical delivery/resume needs a separate decision; it does not block the approved new-session implementation.

## Implementation notes

### Likely files

The smallest complete implementation is expected to touch these surfaces and their focused tests:

- extraction contract and implementations: `src/lib/audit/types.ts`, `src/lib/audit/openai.ts`, `src/lib/audit/gemini.ts`, and fallback constructors in other provider adapters;
- preparation/state/persistence: `src/lib/intake/preparation.ts`, `src/lib/intake/state.ts`, `src/lib/intake/local-session.ts`, `src/lib/intake/frozen-intake.ts`;
- summary and navigation: `src/lib/intake/IntakeJourney.tsx`, `src/lib/intake/navigation.ts`, `src/lib/intake/screens-bab1.tsx`, `src/lib/intake/screens-bab2.tsx`, and existing intake styles/components;
- exact handoff: `src/lib/intake/local-questions.ts`, `src/lib/intake/glm-local.ts`, `src/lib/audit/question-facts-v3.ts`, and affected request validators/payload builders;
- truthful run/report context: `src/app/audit/LocalAuditStage.tsx`, `src/app/api/audit/run/route.ts`, `src/app/api/audit/report/route.ts`, `src/lib/audit/locked-question-pack.ts`, shared context/contract types, report pipeline/provider/repair consumers;
- saved records, exports, and historical hold: `src/lib/intake/local-audit-session.ts`, old-version intake/pack readers, `src/lib/audit/contracts.ts`, `src/lib/audit/customer-evidence-export.ts`, and `src/app/audit/ReportView.tsx`;
- intercepted-request browser tests for rich local, partial, empty, product, and location cases.

The current `s-review` implementation may be repurposed as the prepared summary, or an equivalent bounded screen may replace it. In either case, there must be exactly one business-summary/review surface and no second final review.

### Work order inside one implementation branch and one product PR

1. **Verify the accepted handoff:** branch/working tree, preserved local notes, and this amendment. Do not repeat extraction inspection or sizing.
2. **Protect old state first:** establish literal fictional v1 intake/audit fixture pairs, strict old readers, isolated storage, and the historical hold before changing version defaults.
3. **Stop losing data:** extend extraction, map the complete relevant draft, add immutable prepared understanding, preselect proposals, and add versioned state.
4. **Build the one-screen experience:** summary rows, default focus, inline channel/reach/area choices, optional details, and consolidated required-gap stage.
5. **Complete the truthful handoff:** frozen v2, origins, optional fields, comparator unknown, exact facts/writer projection, and versioned run/report/storage/export context. Preserve protected observation messages; close synthesis, deterministic matching, retry/resume, JSON, and print exposure together. Defer only legacy-only removal.
6. **Verify offline:** focused regression and browser cases including historical preservation/hold, then `npm run validate:fast` and `npm run verify`. Record actual versions, remaining legacy consumers, and evidence in `VERIFICATION.md`.
7. **Founder walkthrough:** only after explicit preparation authorization; same tab for desktop/mobile; stop before question generation unless separately authorized. A full live audit and release require their own authorization.

No half-connected version lands on `main`. Every merge deploys, so the implementation is reviewed as one complete product PR.

### Live-check failure classification

For every missing material fact in the authorized preparation walkthrough, record exactly one failing layer:

1. absent from the website;
2. source access/fetch failed;
3. extraction missed content available on the source;
4. preparation mapping dropped extracted content; or
5. summary presentation hid mapped content.

Fix only the named layer and add one regression case. Do not add retrieval, extra pages, a fallback provider, or repeated prompt tuning without evidence that extraction lost available source information.

### F-03 controlled-input exception — approved 2026-09-22

**Completed historical authorization:** the diagnostic and independent review
are complete; its allowance and both extraction slots are consumed. Do not
execute its old worker handoff again. The following section retains its scope;
the separately approved product correction follows below.

For the recorded F-03 attempt only, retain **unresolved between source access
and extraction** when the available observations cannot distinguish them.
Do not infer the historical cause from a later successful attempt.

The founder's approval reassigns the existing unused diagnostic allowance to
the experiment in [F03_CONTROLLED_INPUT_PROPOSAL.md](./F03_CONTROLLED_INPUT_PROPOSAL.md):
one nominated official page through the existing safe-fetch limits; at most
8,000 UTF-8 bytes of necessary literal public service text added as labeled
source data to the same extractor's user input; direct OpenAI Responses,
`gpt-5.6-luna`, low reasoning; unchanged developer instructions, output schema,
hosted-search settings, and cost/retry limits. Assemble the complete request
before budget reservation and preserve carryover. At most the existing one
technical retry may follow unusable structured output; absent optional values
or a valid empty draft do not justify a retry.

Focused offline checks precede this one experiment. No provider receipt is
required for readiness; use the known request input as the new observable
boundary. Do not add an undocumented results include or make an unchanged
baseline call. If safe fetching fails or no usable passage exists, stop before
paid extraction. Source text remains data, never instructions or manufactured
extracted fields; preserve existing privacy and evidence restrictions.

This exception permits a temporary local diagnostic runner, not a product
route or production correction. Return its result and the smallest supported
correction proposal. It authorizes no questions, observations, reports, intake
confirmation, additional walkthrough, publication, or historical changes.
F-03/AC-07 required resulting product behavior and founder judgment to satisfy
acceptance; that gate is now closed as recorded above. The completed
[worker handoff](./F03_CONTROLLED_INPUT_WORKER_PROMPT.md) and
[diagnostic reviewer handoff](./F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md) retain
their historical scope and do not authorize repeat execution.

### F-03 product correction — approved 2026-09-23

The founder approved [F03_PRODUCT_CORRECTION_SCOPE.md](./F03_PRODUCT_CORRECTION_SCOPE.md)
as the implementation addendum. It governs exact source-selection/privacy rules,
failure copy, no-text continuation, integration surfaces and regression tests.
This explicitly permits the bounded product excerpt step despite the unresolved
historical cause. Do not infer that earlier hosted search failed.

Keep hosted search, row-level proposals and customer confirmation; do not add
per-value evidence matching, fabricated source attribution or verified-fact
claims. No audit/report/export contract or historical behavior change is included.
Only a minimal optional preparation-status enum may persist when needed for
honest summary reload; it is not confirmed/frozen/report context.

The [implementation prompt](./F03_PRODUCT_CORRECTION_IMPLEMENTATION_PROMPT.md)
records the completed correction. This approval covered code and offline checks
only; product verification and separately authorized founder judgment have since
completed. F-01, F-03 and AC-07 are closed. No further live call, commit, push,
publication, merge or deployment is granted.

## Verification record

- Verification artifacts: [VERIFICATION.md](./VERIFICATION.md),
  [ACCEPTANCE_EVIDENCE.md](./ACCEPTANCE_EVIDENCE.md) and independent
  [ACCEPTANCE_CLOSEOUT_REVIEW.md](./ACCEPTANCE_CLOSEOUT_REVIEW.md).
- Result: **PASS — Verified; AC-00 through AC-08 satisfied.** F-03/AC-07 closed;
  F-01 remains closed. No further acceptance review gate remains.
- Date: 2026-09-24. Orchestrator recorded closure under existing founder approvals.
- Verified working-tree state: branch `devin/sol-smart-consultant-intake-plan`,
  HEAD `2a21f856d33264887df6287f9b6d9dd22468fea5`, including reviewed
  uncommitted/untracked product identified by all 316 entries in
  `/private/tmp/nuave-f03-location-j1557mch/candidate-product-hashes.json`.
  Manifest SHA-256: `78027f56252a682631488b680151ea795fa90b0c56d6089e705bd0498b759403`.
  HEAD alone does not identify the verified product.
- Retained evidence: independent 259 focused tests, `validate:fast`, canonical
  `verify` (1,244 tests, both builds, 31 browser checks), corrected nine-page PDF
  review, authorized desktop/mobile preparation and explicit founder acceptance.
  Gates ran in a matching isolated copy; no shared-tree lint PASS is claimed.
- Limits: those assessed in the closeout review remain; verification does not
  establish current-main integration, PR/CI readiness or release authority.
  Confirmation remains unclicked. Accounting remains USD 1.06241155 of 5;
  no tests or live calls were repeated to record closure.
