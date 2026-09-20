# Smart consultant intake — revised implementation plan

> Status: **Revised candidate for founder review — not implementation authority**
> Owner: Founder / orchestrator
> Updated: 2026-09-20
> Revision: R2, incorporating `docs/reviews/findings/smart-consultant-intake-plan-review-2026-09-20.md`
> Repository baseline: `origin/main` at `4e6b2cf`
> Proposed outcome: replace the fixed business questionnaire with a prepared, summary-first confirmation journey

This revision keeps the original Smart Consultant plan as the implementation backbone and adopts the independent review's pragmatic changes: Indonesian extraction text, optional competitors and customer context, one happy-path confirmation, explicit contract amendments, a pre-code look at retained real drafts, and failure-layer diagnosis. It removes per-item evidence matching, name-matching research, the mandatory second confirmation, and the oversized verification matrix.

Publishing this plan does not approve implementation, live provider calls, merge, deployment, or canonical product changes. Those actions retain their existing gates.

## 1. Finish line

Nuave should behave like a prepared consultant:

1. The customer enters a brand name and one supported public business URL.
2. Nuave reads the available public material once and prepares a short understanding.
3. Nuave presents that understanding with an explicit audit-focus choice.
4. Nuave asks only for required meanings that are still empty.
5. The customer confirms the visible brief once and Nuave prepares the ten audit questions.
6. Existing question review, explicit audit-start approval, observations, report, and downloads remain unchanged.

```text
Nama brand + URL
  → membaca sumber
  → Ini yang Nuave pahami + pilih fokus audit
  → required-empty clarifications only, when needed
  → Sudah sesuai — buat pertanyaan audit
  → existing question review → audit → report
```

For a sufficiently populated whole-brand case, the acceptance target is:

- zero typed characters after `Periksa`;
- at most four substantive decisions before question review;
- no more than five selection/continue actions after initial entry;
- one business-information confirmation, not a summary confirmation followed by a duplicate final review.

For the rich fixture, the four-decision ceiling covers scope, service channel, market reach, and final confirmation. Its market reach must not require a separate area choice; local/area-based behavior is covered by the partial-business case. Every selection that changes confirmed meaning counts even when several controls share one clarification stage. Question editing and explicit audit-start approval remain separate.

## 2. Scope and non-scope

### In scope

- the public `/audit` business intake after name and URL;
- retaining useful `SourceIdentity` and `ExtractionDraft` output instead of dropping it;
- concise natural Indonesian preparation text;
- one summary-first understanding screen;
- explicit whole-brand, location, or product/service focus;
- preselected proposals that remain unconfirmed until the customer acts;
- deterministic clarification for required-and-empty meanings only;
- click-first corrections with guarded text fallbacks;
- optional customer context, decision criteria, competitors, and public facts;
- separate prepared and customer-confirmed values;
- a versioned frozen handoff that carries confirmed target customer and decision considerations when present;
- same-tab resume, stale-session rejection, and no-duplicate-request protections;
- focused offline tests and one separately authorized live preparation review.

### Not in scope

- a general crawler, JavaScript browser service, or reading extra pages in the first release;
- another model call, provider, semantic reviewer, or fallback chain;
- a chatbot or open-ended conversational intake;
- Google Maps, login scraping, broad social discovery, or arbitrary linked domains;
- payment, orders, authentication, durable storage, or cross-device resume;
- question-generation instruction, model, observation, report, or scoring changes;
- report findings based on differences between prepared and confirmed facts;
- a dashboard, CRM, analytics vendor, monitoring, or subscriptions;
- public rollout, paid calls, merge, or deployment without explicit authorization.

Retrieval improvements are considered only after one live preparation shows that information present on the source was lost by retrieval rather than mapping or presentation.

## 3. Verified baseline

The current runtime already has the expensive plumbing:

- `/audit` starts with brand name and URL.
- `GET /api/audit/identity` safely reads source metadata.
- `POST /api/audit/extract` performs one domain-restricted extraction and returns a structured draft.
- `prepareBoundaryIdentity()` retains only category, offerings, customer needs, and comparison names; it drops market context, target customer, decision criteria, USP, evidence, warnings, and discovered identity details.
- Live candidates arrive unselected, so the customer re-taps values Nuave already found.
- The fixed route visits roughly nine or ten fact screens and then reviews the customer's own answers.
- The local facts projection hardcodes `targetCustomer: null` and `buyerConstraints: []`, although the direct-ten writer can use both.
- A legacy compatibility adapter derives target customer and decision criteria from semantically different values to satisfy old schema minima.
- The extraction prompt currently requests explanatory text in English.
- Synthetic end-to-end extraction intentionally returns an empty draft, so current tests prove continuity but not the prepared-confirmation experience.

The result is a real reading pipeline feeding a polite questionnaire.

## 4. Product amendments requiring approval

The desired experience conflicts with active intake rules. The eventual specification must carry these replacements explicitly, and approved decisions must be recorded once in `docs/DECISION_LOG.md`.

| Current rule | Proposed replacement |
|---|---|
| The September 5 journey contract fixes the linear route and forbids skips based on extraction state. | The visible prepared summary owns confirmation. Separate correction controls or a clarification stage appear only for explicit focus/target choice, required empty meaning, or requested edit. |
| Each conceptual screen is committed separately with `Lanjut`. | One explicit action confirms every visible active proposal. Display or preselection alone never confirms it. |
| Provenance is hidden from the intake shell. | Use three plain field-based labels: **Dari website Anda**, **Saran Nuave**, and **Dari Anda**. Keep technical confidence hidden. |
| Comparator mode is required: named competitors or explicit no-direct mode. | Competitors are optional. Unknown is distinct from “there are no competitors”; no named competitor is required by direct-ten generation. |
| Optional customer reasons and public fact still receive mandatory screens. | Put optional context behind `Tambah detail`; absence never creates a clarification or blocks questions. |
| `s-review` always follows all fact screens as a separate confirmation. | The understanding summary is the review. After corrections or clarifications, return to that same summary and confirm once. |

Retain these existing protections:

- exact intended business and one supported source are required;
- scope is an explicit customer choice, never silently inferred;
- location/product scope requires one exact target;
- whole-brand/location requires at least one offering; product target fulfills the offering meaning for product scope;
- service channels and market reach/area remain required because the current question handoff uses them;
- material confirmed changes invalidate the question pack;
- approving facts never starts observations;
- `NUAVE_NEW_AUDIT_ENABLED` remains the single emergency off switch; do not add a parallel intake-flag matrix.

## 5. Target experience

### 5.1 Entry and reading

Keep the current neutral entry:

- `Nama brand`
- `Link website`
- `Periksa`

Keep one honest reading state. It may say that Nuave is checking the source and preparing business information, but must not imply success before the boundaries return. Synthetic mode remains unmistakably labelled as not reading the source.

A source that cannot be read is a failure state, not an empty successful understanding.

### 5.2 `Ini yang Nuave pahami`

Keep the summary short enough to read—normally five or six rows, not a dashboard:

1. **Business** — submitted name, discovered name when different, canonical source.
2. **Audit focus** — whole brand, one location, or one product/service.
3. **Category and main offers** — primary category and selected principal offerings.
4. **How and where customers receive it** — service channels and market reach/area.
5. **Optional customer context** — target customer, needs, or considerations only when prepared or deliberately added.
6. **Optional alternatives and important fact** — comparison suggestions and one must-be-correct public fact behind `Tambah detail`.

Do not show internal schema names, confidence percentages, unsupported praise, or a generic AI biography.

### 5.3 Identity without a matching algorithm

Show the name the customer typed. When the source returns a different display name, show it as a second selectable option with the typed name preselected.

The customer sees both before confirmation. Selecting or retaining one settles the identity. Do not build fuzzy name matching or block solely because the strings differ. Block only when the source could not be read or no valid name/source remains.

Owner-entered identity stays labelled **Dari Anda**; a discovered display name stays **Dari website Anda** even after acceptance.

### 5.4 Focus and targets

Scope is explicit intent inside the summary:

- Brand secara keseluruhan
- Satu lokasi
- Satu produk atau layanan

For product scope, reuse extracted offerings as product choices before showing a text fallback.

For location scope, offer a location only when existing preparation responsibly provides one. The current extraction has no reliable location list, so the first release may use a focused name-and-address fallback. State that Nuave could not identify a specific location; do not show an unexplained empty choice list.

Changing scope updates active summary rows from retained preparation. It does not copy whole-brand coverage into a branch or silently discard unrelated facts.

### 5.5 Clarify required empty meanings only

The gap rule is deliberately simple:

> Ask only when an active required meaning is empty.

The first release does not create a clarification because evidence text failed to match, optional context is absent, a suggestion was omitted, or a confidence score is low.

Typical clarifications:

- no usable category;
- no offering for whole-brand/location scope;
- no selected product/location target for its scope;
- no service channel;
- no market reach, or no area for an area-based reach.

Render unresolved items in one persistent `Perlu dipastikan` stage, not one route screen per field. Each item explains in one sentence why it affects the audit and offers business-specific or fixed choices before `Tidak ada yang cocok`.

After clarification, return to the same summary. There is no additional final-review screen.

### 5.6 One confirmation

When required meanings are valid, the primary action is:

> **Sudah sesuai — buat pertanyaan audit**

It atomically confirms every visible active proposal exactly as shown, freezes that version, and starts question preparation. Hidden, collapsed-unselected, optional-missing, or inactive values do not enter confirmed state.

If corrections or clarifications changed the draft, the updated summary remains visible before this action. Questions still receive their own review, editing, and approval before audit start.

## 6. Required and optional meanings

| Meaning | First-release behavior |
|---|---|
| Identity and primary source | Required. Show entered and discovered names when different; customer confirmation chooses the intended identity. |
| Scope | Required explicit choice. Never inferred from homepage prominence. |
| Location/product target | Required only for its scope. Product reuses offerings; location has an honest manual fallback when no candidate exists. |
| Category | Required. Preselect extracted category; ask only when empty or customer chooses to edit. |
| Offerings | At least one for whole-brand/location. Product target fulfills this meaning for product scope. Avoid collecting the full catalogue. |
| Service channels | Required fixed multi-select until extraction provides a trustworthy structured field. |
| Market reach/area | Required. Use prepared market wording when available; area-based reach requires an area. |
| Target customer and customer needs | Optional. Show when prepared; `Tambah detail` when absent. Never force a persona or demographic description. |
| Decision considerations | Optional. Keep buyer preference distinct from business capability. |
| Competitors | Optional. Show suggestions when present; unknown is valid and non-blocking. Never equate unknown with no competitors. |
| Must-be-correct fact/differentiator | Optional, owner-attributed, with existing sensitive-text protections. |

The direct-ten writer already represents absent customer context as unknown and does not require a named competitor. If later question-quality evidence shows an optional meaning must become required, that is a separate product decision.

## 7. Preparation and data continuity

### 7.1 Inspect retained real drafts before code

Before finalizing the specification or summary rows, inspect the extraction drafts retained from already authorized runs:

- record which fields are populated, empty, or misleading;
- note whether evidence records are useful enough for an optional source disclosure;
- check whether target customer/context would be absent on most cases;
- record only field-level observations and counts in public planning—never raw business/provider content.

The known private evidence folders exist, but they are ignored/restricted and were not readable in this planning environment. An authorized reviewer with access should perform this check. If no usable retained draft is available, request one preparation-only call under a new explicit allowance before implementation—not after the interface is built.

This inspection may simplify which optional rows appear. It must not expand the first release into a five-business evaluation or a retrieval rewrite.

### 7.2 Indonesian extraction display text

Change the production extraction instruction from English explanatory text to concise natural Indonesian while preserving official brand names, product names, place names, URLs, and exact source evidence as published.

This uses the existing extraction call. It is not a translation call or model change. Add a rich deterministic fixture assertion that market, customer, and differentiator display text is Indonesian while official names remain unchanged.

### 7.3 Minimal prepared-understanding shape

Do not route raw provider responses into React. Add one small application-owned representation:

```ts
type PreparedMeaning<T> = {
  proposed: T | null;
  origin: "website" | "nuave";
  alternatives: T[];
  applicability: "whole" | "target";
};

type ConfirmedMeaning<T> = {
  value: T;
  origin: PreparedMeaning<T>["origin"] | "owner";
};
```

Prepared values never have owner origin. A customer selection that accepts an unchanged proposal retains its prepared origin; typed or edited meaning becomes `owner` in confirmed state.

Keep separately:

- `preparedUnderstanding` — immutable for the accepted source version;
- `confirmed` — active customer-approved meaning;
- the original extraction evidence/warnings — retained for restricted evidence and an optional summary-level `Lihat sumber`, not for per-item gating.

### 7.4 Three field-based provenance labels

No per-item evidence matching is required in the first release.

| Label | Field-based rule |
|---|---|
| **Dari website Anda** | Submitted-source identity metadata and extracted fields defined as public business facts, such as category, offerings, market wording, official names, and variants. |
| **Saran Nuave** | `target_customer`, customer needs/decision considerations when interpretive, `usp`, `similar_businesses`, and any normalized summary wording. |
| **Dari Anda** | Anything the customer typed, selected as a correction, or edited. |

Keep source URLs available behind one small disclosure when the extraction returned evidence. Do not downgrade a non-empty required proposal or ask the customer again because model-authored evidence wording did not exactly match normalized Indonesian display text.

### 7.5 Field map

| Customer meaning | Existing source | First-release treatment |
|---|---|---|
| Identity | entry + `SourceIdentity` | Show typed and discovered names; typed preselected when different |
| Source | canonical identity URL | Keep the submitted canonical source; no automatic extra official links |
| Category | `category` | Visible preselected proposal |
| Offerings/product targets | `verified_offerings` | Visible preselected items; reused as product choices |
| Target customer | `target_customer` | Optional **Saran Nuave** |
| Customer needs | `verified_customer_needs` | Optional suggestions/chips |
| Decision considerations | `verified_decision_criteria` | Optional suggestions, distinct from capabilities |
| Market | `market_context` | Proposed wording; compact structured reach/area choice only when required |
| Comparison candidates | `similar_businesses` | Optional suggestions preserving source URL; never web-verified by implication |
| Name variants | `brand_name_variants` | Retain for identity protection; display only when useful |
| Differentiator | `usp` | Optional **Saran Nuave**; no superiority claim |
| Conversion action | `conversion_action` | Keep only if an existing downstream consumer uses it |
| Warnings/accuracy questions | `warnings`, `known_accuracy_questions` | Convert only a concrete required-empty or source-failure issue; never dump provider prose |
| Service channels | no reliable structured field | Compact required fixed choices |
| Locations | no reliable list | Honest focused manual fallback in first release |
| Public must-be-correct fact | none | Optional owner input behind `Tambah detail` |

### 7.6 Confirmation, versioning, and no fabricated completeness

`Sudah sesuai — buat pertanyaan audit`:

1. copies every visible selected active proposal into confirmed state;
2. preserves field origin;
3. excludes optional empty, hidden, inactive, and unselected values;
4. validates required meanings for the explicit scope;
5. advances the exact frozen version to question generation.

Advance `LOCAL_INTAKE_INPUT_VERSION` and the server-side local-schema literal together. Update the GLM preparation adapter, question-pack persistence, payload builders, and focused tests. Reject old in-progress intake/pack state with a fresh confirmation requirement; preserve completed historical evidence and reports under their original contract.

Remove semantically false compatibility fallbacks:

- service channels are not buyer decision criteria;
- category plus market is not a confirmed target customer;
- unknown competitor is not a customer claim of no competitors;
- entered name is not independently discovered identity.

If an old boundary requires a missing meaning, represent it as unknown or obtain it through a required clarification. Do not manufacture completeness.

## 8. Corrections and dependency rules

Reuse the current correction mechanics rather than building a second state system:

- identity/source change creates a new preparation version;
- scope change invalidates only target-dependent confirmations;
- product/location target change re-evaluates target-specific category, offerings, market, and context;
- category change re-evaluates offerings and optional comparison suggestions;
- material confirmed change invalidates the generated question pack;
- Save returns to the updated summary;
- Back/Cancel restores the last committed version;
- reload or duplicate clicks never repeat settled provider work.

Every text fallback uses bounded lengths and existing sensitive-data screening before commit, persistence, or model use.

## 9. Implementation sequence

Use one approved specification and one complete product PR because every merge to `main` deploys. Intermediate commits may be reviewed locally, but no half-connected journey lands on `main`.

### Step 0 — evidence and founder decisions

1. Inspect retained real extraction drafts as described in §7.1.
2. Approve or amend the replacements in §4 and decisions in §12.
3. Create the next available numbered spec from `docs/templates/SPEC.md`.
4. Mark the spec **Approved** before code.

### Work block A — stop losing data

Likely surfaces:

- `src/lib/audit/openai.ts`
- `src/lib/intake/preparation.ts`
- `src/lib/intake/state.ts`
- `src/lib/intake/local-session.ts`
- focused preparation/state tests

Deliver:

- Indonesian extraction display text;
- full relevant draft and discovered identity carried through;
- proposals preselected but unconfirmed;
- prepared and confirmed snapshots separated;
- no fixture-specific facts in entered-business state;
- old browser state rejected safely.

A founder can inspect this checkpoint locally even if it still uses existing editors; it must not merge separately.

### Work block B — summary, focus, and required-empty clarification

Likely surfaces:

- `src/lib/intake/IntakeJourney.tsx`
- `src/lib/intake/navigation.ts`
- `src/lib/intake/screens-bab1.tsx`
- `src/lib/intake/screens-bab2.tsx`
- existing product-selection primitives and intake styles

Deliver:

- short understanding summary;
- explicit focus/target choice;
- inline or existing per-row correction surfaces;
- one `Perlu dipastikan` stage for required empty meanings;
- optional details behind `Tambah detail`;
- one confirmation action that starts question preparation;
- keyboard, focus, and accessible-name behavior preserved through existing shadcn/Base UI controls.

### Work block C — exact handoff

Likely surfaces:

- `src/lib/intake/frozen-intake.ts`
- `src/lib/intake/local-questions.ts`
- `src/lib/intake/glm-local.ts`
- `src/lib/audit/question-facts-v3.ts`
- request validation, payload builders, persistence parsers, and focused tests

Deliver:

- confirmed target customer, needs, and criteria remain distinct when present;
- optional absence remains unknown;
- extend frozen comparator mode with `unknown` and map it to the existing unresolved comparison meaning; it no longer blocks direct-ten generation or claims category alternatives/no competitors on the customer's behalf;
- frozen input/server literal and persisted pack versions advance together;
- exactly what the summary confirmed reaches the writer;
- no direct-ten instruction, provider, observation, or report change.

### Work block D — offline verification and one live preparation

1. Run focused tests while iterating.
2. Run `npm run validate:fast`.
3. Run `npm run verify` before branch handoff.
4. Inspect the complete diff and generated artifacts.
5. Only after explicit authorization, perform one live identity + extraction preparation for a founder-chosen public business; do not continue to questions/audit unless separately authorized.

For any missing information in the live check, classify the failing layer:

1. absent from the website;
2. source access/fetch failed;
3. extraction missed available content;
4. mapping dropped extracted content;
5. summary hid mapped content.

Fix only the named layer and add one regression example. Do not repeatedly tune the prompt or add page retrieval without evidence that extraction lost available source information.

## 10. Failure and recovery

| Situation | Required behavior |
|---|---|
| Invalid source | Field-level correction; no provider call and no guessed URL |
| Source unreadable | Explain failure; retry or change source; never show a found-business summary |
| `429`/`503` rate-limit state | Preserve entry/stable work, show wait/unavailable message and explicit retry; no downstream provider call |
| Empty extraction | Keep readable identity and show the compact required-empty clarification set; no fixture facts |
| Partial extraction | Keep every prepared value; ask only for required empty meanings |
| Typed/discovered names differ | Show both; typed name preselected; one visible confirmation settles it |
| No product candidate | Offer extracted offerings if available, then focused text fallback |
| No location candidate | Focused name/address fallback without discarding whole-business preparation |
| No competitor suggestion | Continue without asking; unknown stays unknown |
| Correction changes material meaning | Invalidate stale questions and highlight affected summary rows |
| Refresh/Back/double-click | Restore stable state; do not silently repeat preparation or generation |
| Old in-progress session | Retain safe name/URL when practical, discard incompatible meaning, and require fresh preparation/confirmation |
| Audit already started/completed | Preserve its exact frozen inputs, observations, report, and downloads; never migrate it |
| Sensitive free text | Stop before persistence/model use and apply the existing restriction path |

## 11. Minimal verification and acceptance

The eventual specification should use a compact outcome-focused set.

### AC-01 — rich whole-brand effort

From blank name/URL entry and intercepted rich identity/extraction responses:

- the ordinary `/audit` route shows a populated Indonesian summary;
- the customer types nothing after `Periksa`;
- the journey stays within four substantive decisions and five selection/continue actions;
- one confirmation proceeds to question review.

The rich payload contains supported identity, category, at least two offerings, a nationwide or international market context that needs no area choice, and optional customer/decision context. Browser tests intercept the existing boundaries and still exercise production mapping/state; no live-selectable test switch is added. A separate partial local-business case covers area selection without weakening the rich-case budget.

### AC-02 — exact visible continuity

Exactly the visible selected values confirmed on the summary reach:

- confirmed intake;
- frozen input;
- question facts;
- direct-ten writer context.

Target customer and decision considerations reach the writer when confirmed. Hidden, inactive, optional-empty, rejected, and unselected values do not.

### AC-03 — partial and empty preparation

Only active required empty meanings are clarified. Optional customer context, competitors, and public fact never block. Entered businesses never receive fixture facts.

### AC-04 — scopes

- Product scope selects an extracted offering without typing when available.
- Location scope shows the honest manual fallback when no location candidate exists.
- Target-specific state never inherits unsupported whole-brand coverage.

### AC-05 — correction, recovery, and cost

Reload, Back, duplicate click, and correction do not repeat settled provider requests. Material edits invalidate stale question packs. Old incompatible sessions fail safely. Rate-limit and interrupted states preserve honest telemetry and prior stable work.

### AC-06 — existing complete path

Question review/edit → explicit audit approval → ten observations → report → JSON/PDF controls remains intact. `npm run verify` passes offline.

### AC-07 — founder walkthrough

On desktop and phone, the founder answers:

> "Does this feel like confirming a consultant's prepared understanding rather than filling a form?"

Record typed characters, substantive decisions, corrections, time to question review, provider calls, cost, and the failing layer for every missing material fact. Zero typing alone is not a pass if the summary is misleading.

New summary/correction components must retain keyboard operation, focus handling, logical headings, and non-color-only labels. Assert those properties where new UI is introduced rather than creating a separate accessibility program.

## 12. Founder decisions before specification approval

The plan recommends:

1. **Replace the fixed route with summary + required-empty clarification:** yes.
2. **Use one visible batch confirmation and no duplicate final review on the happy path:** yes.
3. **Use three field-based provenance labels with no per-item evidence matching:** yes.
4. **Make competitors optional and preserve unknown distinct from none:** yes.
5. **Keep customer context and decision criteria optional in the first release:** yes; inspect retained drafts before reconsidering.
6. **Use the current identity/extraction mechanism and one existing extraction call:** yes; retrieval work only after a named live failure.
7. **Accept product-from-offerings and manual location fallback for the first release:** yes.
8. **Adopt the rich-case effort budget in AC-01:** yes.

Once approved, record the replacements in `docs/DECISION_LOG.md`, update only directly conflicting active journey rules, and create one bounded next-numbered specification. Update `docs/NOW.md` only when this actually becomes the current implementation task.

## 13. Risks and controls

| Risk | Control |
|---|---|
| Thin extraction undermines the consultant experience | Inspect retained drafts first; one authorized live preparation; classify the failing layer before changing retrieval |
| Preselection encourages careless acceptance | Keep five or six summary rows, visible selections, plain origin labels, and easy correction |
| Field-based provenance overstates interpretation | Classify target customer, decision criteria, USP, comparison suggestions, and normalized prose as **Saran Nuave** |
| Adaptive routing skips required meaning | Required list is deterministic; final freeze validates it |
| Compatibility adapter invents useful-looking context | Remove semantic substitution; preserve unknown or ask only when truly required |
| Branch/location work delays the outcome | Product reuses offerings; location uses an honest focused fallback |
| Session changes corrupt active work | Advance versions together; reject incompatible in-progress state; preserve completed old runs |
| Intake work delays report usefulness | Keep one spec, one PR, seven acceptance outcomes, and one live preparation check |

## 14. Next action

The founder reviews §4 and answers §12. An authorized reviewer inspects retained real extraction drafts and records only field-level observations. The orchestrator then writes the next-numbered draft specification directly from this plan and the accepted decisions—without another general strategy round.

Do not implement directly from this plan. The bounded specification outcome is:

> After brand name and URL, Nuave shows a short Indonesian understanding that a well-read business can confirm without further typing, asks only for required empty meanings, and sends exactly the visible confirmed brief into the existing question-review and audit path.
