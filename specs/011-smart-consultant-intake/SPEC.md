# Spec 011: Smart consultant prepared intake

> Status: **Approved** — founder-confirmed on 2026-09-21; incorporates the independent R2 review at commit `ca82d89`
> Owner: Founder / orchestrator
> Updated: 2026-09-21
> Implements: `docs/PRODUCT.md` — business confirmation that starts from Nuave's prepared understanding and preserves human approval
> Supersedes for the active `/audit` business-intake portion: conflicting fixed linear fact-screen, mandatory-comparator, per-screen confirmation, and duplicate final-review behavior from the earlier intake implementation
> Preserves: Spec 009/010 question review, explicit audit-start approval, observations, report, JSON/PDF downloads, cost accounting, persistence, and the `NUAVE_NEW_AUDIT_ENABLED` emergency switch

This specification is the implementation authority for the prepared-understanding intake. The draft plan and its two reviews remain decision evidence, not implementation instructions.

## Required context

Read in order:

1. `AGENTS.md`
2. This specification
3. `docs/PRODUCT.md`, sections **Customer**, **Customer journey → Business confirmation**, **Question review**, and **What happens behind the scenes**
4. `docs/DESIGN.md`, sections **Approved stack**, **Motion and accessibility**, and **Design judgment**
5. Relevant implementation only:
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
7. Existing identity plus one extraction call remains the preparation mechanism. No retrieval expansion occurs without a named live failure.
8. The representative rich case is a local Indonesian business: zero typing after `Periksa`, one summary screen, at most two substantive customer decisions, and one confirmation before question review.
9. The existing extraction output is extended in the same call with service channels, market reach, and market areas; unsupported values remain empty.
10. `Brand secara keseluruhan` is the visible default focus proposal. It is a `Saran Nuave`, not website-derived evidence, and is not confirmed until the customer uses the final confirmation action.

No additional founder decision is required by this specification.

## Pre-implementation evidence gate

Before a worker changes code, the founder must inspect one retained extraction response in `.secrets/`. The worker and reviewer must not open `.secrets/`, copy the response, or receive private/provider content.

The founder records only a field-level note outside private evidence, marking each inspected field as `filled`, `empty`, or `wrong`. At minimum the note covers:

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

This inspection is evidence about the current extractor, not permission to copy raw evidence into Git. If no retained response is available, implementation stops and asks the founder whether to authorize one preparation-only call. It does not read credentials and does not proceed to question generation.

## Pre-implementation R-23 sizing gate

Before changing runtime code, the implementation worker performs a read-only sizing pass for R-23. The worker traces every active consumer of the current compatibility `BusinessBrief`, including question preparation, audit-run requests, report requests, persistence, exports, and historical-record readers, then returns a short sizing note.

Classify the work as:

- **bounded** when honest optional values can be carried by the v2 frozen intake, `QuestionFactsV3`, and a direct-ten-specific/versioned request boundary without changing observation or report payloads, persisted audit records, report schemas, or historical readers; or
- **cross-cutting** when removing the compatibility fallbacks requires any of those downstream contracts to change.

If bounded, R-23 remains in this implementation. If cross-cutting, split the legacy `BusinessBrief` cleanup into a separately reviewed follow-up. Spec 011 still ships the prepared summary and carries confirmed target customer and decision considerations through frozen v2, `QuestionFactsV3`, and the direct-ten writer brief. Existing compatibility fallbacks may remain temporarily only inside the legacy bridge, must be enumerated in verification, and must not populate prepared, confirmed, frozen, facts-projection, or writer state. R-27 remains controlling: this product PR does not become an audit-run or report redesign.

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
- Focused unit/browser coverage, offline repository verification, and one separately authorized preparation-only founder walkthrough.

## Non-scope

- A new provider, model, provider call, crawler, browser service, research agent, fallback chain, or automatic retry for optional-empty fields.
- Reading extra website pages beyond the current extraction behavior.
- Google Maps, login-only sources, broad social discovery, arbitrary linked-domain discovery, or branch search.
- A conversational/chat intake.
- Payment, account, authentication, checkout, delivery, dashboard, CRM, analytics-vendor, or cross-device-resume work.
- Changes to the direct-ten writer instruction, question model, question review/edit contract, observation method, report content, report layout, scoring, export meaning, or re-check behavior.
- A report finding based on differences between prepared and confirmed values.
- Per-chip evidence labels, evidence-to-value matching, confidence percentages, conflict inference, or fuzzy brand-name matching.
- Production deployment, merge, public rollout, or any live provider call without separate explicit founder authorization.
- Updates to `docs/PRODUCT.md`, `docs/NOW.md`, or `docs/DECISION_LOG.md` inside this specification task.

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

- **R-00A — Founder-only evidence note:** The pre-implementation evidence gate above must be completed before code changes. The worker records only that the note was received; the worker does not read `.secrets` or private evidence.

- **R-00B — Size R-23 first:** Before runtime implementation, the worker must submit the R-23 sizing note defined above, enumerate every current fallback and downstream consumer, and classify the cleanup as bounded or cross-cutting. No implementation begins until this classification is recorded.

- **R-01 — Existing call boundary:** Entry uses the existing identity request and exactly one existing extraction request. This specification adds no provider request. Existing retry behavior for an invalid/truncated structured response may remain; an empty new optional field never triggers a retry.

- **R-02 — Extraction contract:** Extend `extractionDraftSchema`, every manual/synthetic fallback that constructs `ExtractionDraft`, and the matching provider schemas with these exact fields:

  | Field | Wire contract | Unsupported state |
  |---|---|---|
  | `service_channels` | Array containing zero or more unique values from `on_premise`, `on_customer`, `delivery`, `online`; maximum four. | `[]` |
  | `market_reach` | One of `sekitar`, `beberapa`, `seluruh`, `luar`, or the empty string. These map directly to the current `MarketKind`. | `""` |
  | `market_areas` | Deduplicated short place names published by the business; at most eight values, preserving the business's spelling. | `[]` |

  The extractor must not infer a service channel, reach, or area from generic category knowledge. A contact address alone is not service coverage. `market_areas` names where the business says it serves or receives customers, not every address found on the site.

- **R-03 — Indonesian and evidence preservation:** Change extraction explanatory text to concise natural Indonesian. Preserve official brand names, place names, product/service names, URLs, and exact source evidence as published. Do not translate or normalize those protected strings. Keep source evidence and warnings available to the boundary, but do not use them for per-value gating.

- **R-04 — Provider parity:** Update the OpenAI extraction schema/instruction and the matching Gemini extraction schema/instruction in the same change. OpenAI remains the protected production extraction path; Gemini remains testing-only, but it must not produce a different contract. Other adapters that construct the shared `ExtractionDraft` must at least compile and return the three new fields empty when unsupported; this does not expand their production authority.

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
  - `FACTS_PROJECTION_VERSION` because local projection semantics change; and
  - any direct-ten request-contract literal whose parser changes.

  Do not change the direct-ten writer-instruction version because this specification does not change that instruction.

- **R-21 — Safe old-state behavior:** Reject incompatible pre-confirmation intake and unstarted question-pack state. At most, recover the plain typed name and a valid normalized source as a fresh entry; never restore old prepared/confirmed meaning. If an audit has already started or completed, preserve its exact old frozen input, approved pack, observations, report, and downloads under the old contract in read-only/resume form. Never migrate or regenerate it merely to fit v2.

- **R-22 — Exact downstream projection:** The exact confirmed v2 values, not prepared leftovers, reach the frozen input, `QuestionFactsV3`, the direct-ten writer brief, and the existing audit/report handoff. Hidden, inactive, rejected, unselected, and optional-empty values do not. Confirmed target customer and decision considerations appear in the writer brief when present.

- **R-23 — No fabricated completeness:** The prepared, confirmed, frozen-v2, `QuestionFactsV3`, and direct-ten writer paths must never create these substitutions:
  - service channels as decision criteria;
  - category plus market as target customer;
  - target customer duplicated as customer needs;
  - category, channel, or target customer used as buyer criteria;
  - unknown comparator converted to a category-alternative claim;
  - category used as an offering when required offering/target validation should have caught absence;
  - entered name treated as independently discovered identity; and
  - category treated as a verified business/legal type.

  First complete R-00B. If the sizing result is **bounded**, remove these substitutions from the active direct-ten audit/report path and use a direct-ten-specific request schema or equivalent versioned boundary that permits explicit unknown/empty values. Do not weaken historical legacy validation.

  If the sizing result is **cross-cutting**, defer only the old `BusinessBrief` compatibility cleanup to a separately approved follow-up. In that case this implementation still removes fabrication from prepared/confirmed/frozen/facts/writer state, carries target customer and decision considerations exactly, preserves the existing run/report contracts under R-27, and records every temporarily retained legacy fallback plus its consumer in `VERIFICATION.md`. No retained compatibility fallback may be shown to the customer, frozen as confirmed meaning, or sent to the direct-ten writer as fact.

- **R-24 — Material correction:** A material change after question generation increments the fact version, invalidates the stale question pack, and requires a fresh question preparation and approval. Cancel/Back restores the last committed stable summary. Identity/source change creates a new preparation version and may make one new existing preparation call only after the customer explicitly selects `Periksa`.

### Safety, cost, and preserved behavior

- **R-25 — Request and cost controls:** Reload, Back, mobile emulation, disclosure toggles, and duplicate clicks do not repeat settled identity, extraction, question, observation, or report work. Existing telemetry, rate-limit responses, interrupted-attempt accounting, per-request ceilings, and session cost limit remain intact.

- **R-26 — Sole off switch:** `NUAVE_NEW_AUDIT_ENABLED` remains the only emergency off switch for the audit journey and routes. Do not add a smart-intake feature flag or a second flag matrix. Existing server-selected live/synthetic mode remains, but it is not a second emergency switch.

- **R-27 — Downstream preservation:** Question review/edit, explicit audit approval, ten observations, report generation, JSON/PDF controls, cost display, and their persistence behavior remain functionally unchanged. This work must not alter question wording policy, audit execution, report interpretation, or export semantics.

## Failure and recovery

| Situation | Required behavior |
|---|---|
| Invalid source | Show a field-level correction before provider work. Preserve typed name and URL draft. Never guess a URL. |
| Source unreadable or identity request fails | Preserve entry and show retry/change-source actions. Do not show a found-business summary. No extraction or downstream call occurs after the failure. |
| Extraction request fails | Preserve validated identity and the provider telemetry/failure state. Offer an explicit retry subject to existing limits; do not inject fixture facts. |
| Extraction succeeds with all business fields empty | Show the readable identity, default whole-brand proposal, and the fixed service/reach choices on the summary. Send only missing category/offering/target to `Perlu dipastikan`. No optional question blocks. |
| Partial extraction | Preserve and preselect every supported proposal. Ask only for active required empty meanings. |
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
| Audit already started/completed | Preserve exact old input, questions, observations, report, and downloads under their original version; never migrate them. |

## Evidence, data, privacy, and cost

- Use only the public business source supplied for the audit and the existing restricted-domain extraction behavior.
- The preparation draft is a proposal. It is not a verified fact until the customer uses the single confirmation action.
- Preserve exact official names, product/service names, place names, URLs, and source evidence. Do not manufacture evidence or imply that comparison suggestions were found on the website.
- Provenance is field/row based, not inferred by matching model-authored evidence text.
- Do not collect customer records, credentials, contact details unrelated to the audit, payment data, medical/legal/financial records, or sensitive free text.
- Raw provider content and private retained responses do not enter Git, analytics, customer-facing source disclosures, or the implementation worker's context.
- No additional provider call, model, fallback, or optional-field retry is authorized. Extending the structured output occurs inside the existing extraction request and its existing budget.
- A live identity/extraction check requires a fresh explicit founder authorization. It stops before question generation unless question generation is separately authorized.
- No commit, push, merge, deployment, production activation, or provider contact is authorized by this specification alone.

## Acceptance criteria

- **AC-00 — Pre-code gates:** Before runtime code changes, the founder field-level extraction note is recorded without exposing private evidence, and the worker's R-23 sizing note enumerates the compatibility fallbacks and every active downstream consumer. The note classifies R-23 as bounded or cross-cutting. A cross-cutting result identifies the exact follow-up boundary and temporarily retained legacy fallback sites before implementation proceeds.

- **AC-01 — Rich local one-screen path:** Given the ordinary blank `/audit` entry and intercepted live-shaped identity/extraction responses for a fictional local Indonesian business, when the customer enters brand/URL and selects `Periksa`, then:
  - the next customer-decision screen is `Ini yang Nuave pahami.`;
  - the fixture provides category, at least two offerings, at least one service channel, `market_reach = sekitar`, and exactly one proposed local area;
  - whole-brand focus, channels, reach, and area are selected proposals;
  - the customer types zero characters after `Periksa`;
  - the unchanged path remains on one summary screen and requires only the final confirmation;
  - a path with one customer correction stays within two substantive decisions including confirmation;
  - `Perlu dipastikan` is not visited; and
  - one `Sudah sesuai — buat pertanyaan audit` action opens question review without a duplicate business review.

- **AC-02 — Exact values and origins:** Given prepared website and Nuave suggestions plus customer edits, when the summary is confirmed, then the exact visible selected values and row origins reach the v2 frozen intake, facts projection, and writer brief. Target customer and decision considerations reach the writer when confirmed. Hidden, inactive, rejected, unselected, and optional-empty values do not. A customer-edited row is owner-sourced. Comparator unknown maps to unresolved and claims neither no competitors nor category alternatives.

- **AC-03 — Partial and empty preparation:** Given partial or empty extraction, when the summary renders, then focus, service channels, reach, and conditional area remain directly selectable on the summary; only missing category, offering, or active target can open the consolidated `Perlu dipastikan` stage. Optional absence never blocks. An entered business receives no fixture facts.

- **AC-04 — Focus behavior:** Given prepared whole-business proposals, when focus changes:
  - whole brand keeps all prepared proposals;
  - product focus can select an extracted offering without typing and freezes it as the sole offering meaning;
  - location focus keeps category, offerings, and channels, clears reach/area, and uses a name/address fallback when no responsible target exists; and
  - no focus change confirms a value or transfers branch coverage to whole-brand coverage.

- **AC-05 — Extraction contract and language:** Given OpenAI and Gemini extraction tests, when a supported website supplies delivery/access and a local service area, then the three structured fields parse within the exact enums, explanatory text is concise Indonesian, official names/place names/URLs/evidence remain unchanged, and the same call count is retained. When unsupported, the fields are empty and no optional-field retry occurs. Manual/synthetic fallbacks include empty values for all three fields.

- **AC-06 — Recovery, versioning, and cost:** Reload, Back, double-click, and non-material disclosure actions do not repeat paid work. Material edits invalidate stale packs. V1 pre-confirmation sessions/packs are rejected; already-started/completed old audits remain available under their exact old contract. Rate-limit/interrupted states retain honest telemetry and prior stable work. `NUAVE_NEW_AUDIT_ENABLED` remains the sole off switch.

- **AC-07 — Existing path and founder judgment:**
  - Focused tests pass.
  - `npm run validate:fast` passes offline.
  - `npm run verify` passes offline with dummy credentials and no live provider calls.
  - Question review/edit → explicit audit approval → ten observations → report → JSON/PDF controls remains intact.
  - After separate authorization for one live preparation, the founder performs desktop and mobile walkthroughs in the same browser tab, using browser device emulation for mobile unless a second preparation call is explicitly authorized. The walkthrough records typed characters, substantive decisions, corrections, readiness time, identity/extraction calls, extraction cost, and the failing layer for every missing material fact. The preparation-only authorization stops before pressing the final action unless question generation is separately authorized.
  - The founder answers: “Does this feel like confirming a consultant's prepared understanding rather than filling a form?” Zero typing is not sufficient if the summary is misleading.

## Open questions

None. The founder evidence note in R-00A and the worker sizing note in R-00B are execution prerequisites, not unresolved product decisions.

## Implementation notes

### Likely files

The smallest complete implementation is expected to touch these surfaces and their focused tests:

- extraction contract and implementations: `src/lib/audit/types.ts`, `src/lib/audit/openai.ts`, `src/lib/audit/gemini.ts`, and fallback constructors in other provider adapters;
- preparation/state/persistence: `src/lib/intake/preparation.ts`, `src/lib/intake/state.ts`, `src/lib/intake/local-session.ts`, `src/lib/intake/frozen-intake.ts`;
- summary and navigation: `src/lib/intake/IntakeJourney.tsx`, `src/lib/intake/navigation.ts`, `src/lib/intake/screens-bab1.tsx`, `src/lib/intake/screens-bab2.tsx`, and existing intake styles/components;
- exact handoff: `src/lib/intake/local-questions.ts`, `src/lib/intake/glm-local.ts`, `src/lib/audit/question-facts-v3.ts`, and affected request validators/payload builders;
- intercepted-request browser tests for rich local, partial, empty, product, and location cases.

The current `s-review` implementation may be repurposed as the prepared summary, or an equivalent bounded screen may replace it. In either case, there must be exactly one business-summary/review surface and no second final review.

### Work order inside one implementation branch and one product PR

1. **Evidence gate:** receive the founder's field-level note; do not inspect `.secrets`.
2. **Size R-23 without coding:** trace the compatibility brief through question preparation, audit run, report, persistence, exports, and historical readers; return the bounded/cross-cutting classification.
3. **Stop losing data:** extend extraction, map the complete relevant draft, add immutable prepared understanding, preselect proposals, and add versioned state.
4. **Build the one-screen experience:** summary rows, default focus, inline channel/reach/area choices, optional details, and consolidated required-gap stage.
5. **Make the handoff exact:** frozen v2, origins, optional fields, comparator unknown, and exact facts/writer projection. Implement the legacy-fallback cleanup only when R-00B classified it as bounded; otherwise document and defer that cleanup while preserving R-27.
6. **Verify offline:** focused tests, `npm run validate:fast`, then `npm run verify`.
7. **Founder walkthrough:** only after explicit preparation authorization; same tab for desktop/mobile; stop before question generation unless separately authorized.

No half-connected version lands on `main`. Every merge deploys, so the implementation is reviewed as one complete product PR.

### Live-check failure classification

For every missing material fact in the authorized preparation walkthrough, record exactly one failing layer:

1. absent from the website;
2. source access/fetch failed;
3. extraction missed content available on the source;
4. preparation mapping dropped extracted content; or
5. summary presentation hid mapped content.

Fix only the named layer and add one regression case. Do not add retrieval, extra pages, a fallback provider, or repeated prompt tuning without evidence that extraction lost available source information.

## Verification record

Complete after implementation:

- Verification artifact: `specs/011-smart-consultant-intake/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
