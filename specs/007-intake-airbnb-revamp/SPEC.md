# Spec 007: Runnable V1 audit journey

> Status: **Draft**
> Owner: Founder
> Updated: 2026-08-30
> Implements: the V1 customer journey, end to end, with real business data

## Purpose

Make the Nuave workflow runnable end to end with a real business source:

**Landing → Preview → Simulated payment → AI extraction → Intake review →
Prompt review → Audit**

The intake mental model is **AI drafts → the user verifies, corrects, and
adds**. It must never become a blank questionnaire.

Everything here exists to make that sequence work with real data. Anything else
is deferred.

## Required context

1. `AGENTS.md` · `docs/INDEX.md` §Authority
2. **`docs/AUDIT.md`** — higher authority than this spec on measurement method
3. `docs/PRODUCT.md` §2–§5 · `docs/DECISION_LOG.md` (2026-08-17 entries)
4. `docs/VOICE.md` §2, §7.1 · **`docs/DESIGN.md`**
5. `docs/journey/04-questions.md` · `docs/V1_PRODUCT_CONTRACT.md`
6. `intake-prototype.html` — the approved experience
7. `src/lib/audit/`: `contracts.ts`, `types.ts`, `questions-id.ts`,
   `questions-id-provider.ts`, `questions-id-live.ts`,
   `question-suggestion-guards.ts`, `report-prompt-contract.ts`,
   `source-input.ts`, `workflow-storage.ts`
8. `src/app/audit/AuditWorkflow.tsx` · `AuditStages.tsx` · `ReportView.tsx`
9. `src/components/LandingAuditHero.tsx` · `src/lib/fixture-journey/adapter.ts`
10. `src/app/api/audit/extract/route.ts` · `tests/e2e/network-guard.ts`

---

# Blocker A — Measurement authority

## R-01 · The canonical matrix

Ten slots. Six do not name the business; four do. Identity policy is stated in
**both directions** — forbidden *and* required — so a pack cannot pass
structural validation while being semantically wrong.

| # | Category | Audited brand | Comparison target | Purpose |
|---|---|---|---|---|
| 1 | `category_recommendation` | forbidden | forbidden | Which options exist in this category and context |
| 2 | `situation` | forbidden | forbidden | A real occasion that leads someone to look |
| 3 | `need_fit` | forbidden | forbidden | A specific need and what suits it |
| 4 | `offering_use_case` | forbidden | forbidden | One concrete offering or use case |
| 5 | `shortlist` | forbidden | forbidden | A short list a customer would consider |
| 6 | `open_comparison` | forbidden | forbidden | Comparison among realistic **unnamed** options |
| 7 | `brand_fit` | **required** | forbidden | Whether the business suits a stated need |
| 8 | `explicit_recommendation` | **required** | forbidden | Whether the model recommends the business |
| 9 | `direct_comparison` | **required** | **required** | The business against the comparison target |
| 10 | `fit_misfit` | **required** | forbidden | Who it suits, who it does not, trade-offs |

## R-02 · The matrix is the only measurement authority

One exported structure carries, per slot: id, order, category,
`auditedBrandIdentity: "forbidden" | "required"`,
`comparisonTargetIdentity: "forbidden" | "required"`, measurement purpose,
customer-facing label, report assessment class, and the generator's slot
description.

No measurement policy may exist outside it. Ordering and ids may of course
contain numbers; what is prohibited is **positional measurement-policy logic**
— any code deciding branded state, leakage rules, or composition from a slot's
number rather than from the matrix.

## R-03 · Migration inventory

Every surface below encodes the old model. This inventory was built by scanning
the tree for the legacy category enum and the 5/5 composition markers. The
acceptance criterion is that no legacy policy consumer remains — not that a
count was matched.

### Measurement core

| File | What |
|---|---|
| `types.ts:164-171` | `unbranded_prompts`, `branded_prompts`, `five_unbranded`, `five_branded` schema fields; prompt category enum and derived types |
| `contracts.ts:153` | `PROMPT_MATRIX` |
| `contracts.ts:336-344` | `unbranded_prompts: 5`, `five_unbranded`, `two_per_category` self-check |
| `contracts.ts:727` | `prompt_id !== "NUAVE-BRAND-COMPARISON-02"` competitor exception |
| `contracts.ts:765-774` | Five categories × exactly two — **delete**, it encodes the old model |
| `contracts.ts:775-778` | Branded count `!== 5` and its message |
| `questions-id.ts:352` / `:371` | `INDONESIAN_SLOT_CATEGORIES`, `INDONESIAN_SLOT_MATRIX` |
| `questions-id.ts:378` | `default_branded: index >= 5` |
| `questions-id.ts:454-494` | The ten deterministic fallback templates — see R-05 |
| `questions-id.ts:586` / `:599` | `slot <= 5` identity guard, `slot !== 6` competitor guard |
| `questions-id.ts:645` | `repairIndonesianSuggestion` — corrected by consequence of the templates |
| **`question-suggestion-guards.ts:92`** | **`if (unbranded !== 5) … "default_composition_not_five_five"`** |
| **`question-suggestion-guards.ts:102`** | **`if (index === 5) return;` — the positional slot-6 competitor exception** |
| `questions-id-live.ts:351` | `categoryLabels`, role, and rationale keyed on the five legacy categories |
| `questions-id-live.ts:368-370` | `two_per_category: true`, `five_unbranded: … === 5`, `five_branded: … === 5` |

### Generation instruction

| File | What |
|---|---|
| `questions-id-provider.ts` | `INDONESIAN_QUESTION_WRITER_INSTRUCTION` — still describes the old slot semantics |
| `questions-id.ts:41` | `INDONESIAN_QUESTION_INSTRUCTION_VERSION = "question-writer-v1"` — **bump** |
| `fixture-journey/report.ts:119` | Consumes the version; update with the bump |

### Report and interpretation

| File | What |
|---|---|
| `report-prompt-contract.ts:2-6` | Assessment rules keyed on `need_discovery`/`solution_discovery`/`comparison` and `validation`/`action` |
| `contracts.ts` observation validation | Legacy `validation`/`action` special-casing |
| `ReportView.tsx` | Report category labels |
| `fixture-journey/adapter.ts:34-38` | Category role/input mapping and the legacy assessed-denominator comments |

### UI and customer-facing

| File | What |
|---|---|
| `AuditStages.tsx` | Question-review grouping by the five legacy categories, and the group counts |
| **`ExampleReportPreview.tsx:26`** | **"Tanpa menyebut bisnis Anda: 1/5 · Menyebut bisnis Anda: 3/5"** |
| **`ReportPagePreview.tsx:22`** | Same hardcoded `/5` denominators |
| `QuestionsPreview.tsx:30,51` | Hardcoded group counts of 5 and 5 |

### Fixtures and tests

`fixtures/fixture-kopi-taman-senja.ts` · `contracts.test.ts` ·
`questions.test.ts` · `questions-id.test.ts` ·
`questions-id-provider-regression.test.ts` · `wave2-route-contract.test.ts` ·
`locked-question-pack.test.ts` · `report-pipeline.test.ts` ·
`report-prompt-contract.test.ts` · `run-orchestrator.test.ts` ·
`variance.test.ts` · `variance-route-proof.test.ts` · `stream.test.ts` ·
`retry.test.ts` · `groq.test.ts` · `openrouter.test.ts` ·
`fixture-journey/adapter.test.ts` · `tests/e2e/live-audit-variance.spec.ts` ·
`tests/e2e/wave1-workflow-lifecycle.spec.ts`

### Documentation

`docs/AUDIT.md` · `docs/journey/04-questions.md` · `docs/PRODUCT.md` ·
`docs/DECISION_LOG.md` · `docs/NOW.md` · `docs/V1_PRODUCT_CONTRACT.md` ·
`docs/content/website/FAQ.md` · `docs/PROMPT_GENERATION_CONTEXT.md` — see R-09.

## R-04 · Migration order

1. Write R-06's agreement tests against the matrix.
2. Fold every matrix and guard onto the matrix, keeping current counts.
3. Migrate the report contract, UI labels, and fixtures.
4. **Only then** change the composition to 6/4.

Changing counts first leaves `slot <= 5` and `index === 5` in place, which stops
checking identity leakage on unnamed slot 6 while today's tests still pass —
they pin the old composition rather than deriving from a matrix.

## R-05 · The deterministic fallback pack is new work

`questions-id.ts:454-494` encodes the old semantics throughout:

- **Slot 6** is `Bandingkan ${brand} dengan ${competitor}…` — it names both.
  Under R-01 slot 6 forbids both. It is also the repair target used by
  `repairIndonesianSuggestion`, so a leak here is written *by the safety
  mechanism itself*.
- **No template carries a target-bearing comparison.** New slot 9 requires the
  target; today's slot 9 is `Bagaimana cara ${action} dengan ${brand}?`, a
  contact question. That template must be written.
- The remaining eight map to different purposes than the categories they were
  written for.

Derive all ten from the matrix. A template adapted by analogy will not satisfy
R-06.

## R-06 · Agreement tests, in both directions

All derive their slot sets from the matrix; none may hard-code `1–6`.

1. **Forbidden identity is rejected.** For every slot where the audited brand
   is forbidden, a question containing the brand name or any known variant is
   rejected. Same for the comparison target.
2. **Required identity cannot disappear.** For every slot where the audited
   brand is required, a question *omitting* it is rejected. Slot 9 additionally
   rejects a question omitting the comparison target.
3. **Slot 6 names neither** — the one slot where both prohibitions apply, and
   the one the current fallback violates.
4. **Composition integrity.** A pack of six unnamed plus three genuinely-named
   questions must not pass as valid 6/4.
5. All four run against the deterministic fallback pack as well as generated
   packs. That is what proves R-05.

## R-07 · The generation instruction derives from the matrix

`INDONESIAN_QUESTION_WRITER_INSTRUCTION` still describes the old slot
semantics. Left unchanged, the migration can look green while the model
generates invalid questions and the repair layer silently substitutes fallback
templates — a degraded product with no failing test.

Required: slot descriptions generated from or derived from the matrix; an
agreement test comparing writer-instruction semantics with the matrix slot by
slot; a bump of `INDONESIAN_QUESTION_INSTRUCTION_VERSION`; and every fixture
pinned to that version updated. This is Blocker A, not cleanup.

## R-08 · Report semantics move into the measurement definition

`report-prompt-contract.ts:2-6` keys assessment rules on the five legacy
categories. R-01's ten match none of them, which produces both failure modes:

- **silent degradation** — blank report labels, generic role and rationale
  fallbacks, observations falling through per-category assessment;
- **hard failure** — observation validation still special-cases `validation`
  and `action`.

Each slot's report assessment class, customer-facing label, and recommendation
applicability live in the matrix or a structure derived directly from it. Do
not create a third independent category mapping.

## R-09 · Document reconciliation

`docs/AUDIT.md` outranks this spec on measurement method (`INDEX.md` §Authority)
and currently preserves the old policy.

| Document | What contradicts the locked model |
|---|---|
| **`AUDIT.md:33`** | "the final customer-approved composition, which **may contain any mix**" |
| `AUDIT.md:81` | "five-and-five composition" |
| **`journey/04-questions.md:51-55`** | 5/5 default, and customers "may freely rewrite … including changing the original purpose or the five/five balance" |
| `journey/04-questions.md:72,84-86` | The five-purpose coverage guide and its 5/5 breakdown |
| `DECISION_LOG.md:60` | The 2026-08-17 five-and-five coverage brief |
| `PRODUCT.md:164-165` | "five … five … may change that composition" |
| `PRODUCT.md:109` | Lists Google Maps as an accepted source, which R-11 defers |
| `NOW.md:141-144` | "not a composition the customer must preserve" |
| `FAQ.md:61-63` | Customer-facing 5/5 and composition-change language |
| `V1_PRODUCT_CONTRACT.md:291-300` | The 6/4-versus-shipped conflict; mark resolved |
| `PROMPT_GENERATION_CONTEXT.md` | Legacy category semantics |

Also state explicitly that Spec 007 absorbs Spec 004's source-intake
responsibility, set spec 004 to **Superseded** at the handoff (R-28), register
Spec 007 in `INDEX.md`, and note that approval does not reorder `NOW.md`'s
phase gates — the live-report quality gate remains the current objective until
the founder advances it.

## R-10 · Editing preserves measurement purpose

The ten slots are a measurement definition, not ten editable text boxes. A user
must not be able to turn `brand_fit` into an address lookup,
`category_recommendation` into an unrelated factual question, or
`direct_comparison` into a non-comparison — while still passing structural 6/4
validation.

**Mechanism: constrained editing.** The user edits within a slot; the slot's
category, purpose, and both identity policies are fixed and displayed. On save,
the question is validated against that slot's policies (R-06 rules 1 and 2) and
against a purpose check appropriate to the slot — a `direct_comparison` edit
that no longer compares is rejected with a plain Indonesian explanation naming
what the slot must ask.

Replacing a question means replacing it *for that slot*. There is no
free-composition editor.

Locked decision 6 reads: **users may edit wording, but may not change a slot's
measurement purpose, category, brand policy, or comparison-target policy.**

Reported denominators continue to derive from the actual final question text —
existing behavior, preserved.

---

# Blocker B — Workflow and data authority

## R-11 · Sources

Official website and Instagram profile; Google Maps deferred.
`parseSourceInput` remains the single authority. A public source is mandatory;
there is no brand-name-only entry path.

## R-12 · Field ownership contract

Every field has an owner, a screen, a requiredness decision, and invalidation
rules. Requiredness follows from whether the audit needs the field — not from
the existence of an old screen. **No required or editable field lacks a screen**,
because R-17's error routing must always be executable.

| Field | Owner | Screen | Required | Invalidated by |
|---|---|---|---|---|
| `brand_name` | Extracted | Brand confirm | Yes | — |
| `official_sources` | Derived from submitted source | Brand confirm (shown) | Yes (min 1) | Source change |
| `entity_scope` | Extracted | Scope | Yes | — |
| `brand_type` | Extracted | Scope | Yes | — |
| `category` | Extracted, offered as choices | Category | Yes | — |
| `market_context` | Extracted | Market | Yes | **Scope change** |
| `target_customer` | Extracted | Customer reasons | Yes | — |
| `verified_offerings` | Extracted chips | Offerings | Yes (min 1) | **Scope change to single product** |
| `verified_customer_needs` | Extracted chips | Customer reasons | **Yes — add `.min(1)`** | — |
| `verified_decision_criteria` | Extracted chips | Customer reasons | **Yes — add `.min(1)`** | — |
| `verified_competitor` | Proposed (R-13) | Comparison target | **Yes — add `.min(1)` on `name`** | **Scope or category change** |
| `similar_businesses` | Extracted suggestions | Comparison target (as choices) | No | Category change |
| `usp` | Extracted | Facts | No | — |
| `customer_supplied_facts` | Customer-entered | Facts | No | — |
| `brand_name_variants` | Derived; editable | Review | No — empty is legitimate | Brand name change |
| `priority_offering` | Derived from `verified_offerings` | — | Derived | Offerings change |
| `conversion_action` | Deterministic default by category | — | Default | Category change |
| `regulated_category_notes` | Deterministic default | — | Default | Category change |
| `known_accuracy_questions` | **No longer collected**; empty | — | — | — |
| `agency_name`, `agency_logo_data_url` | **No longer collected** (agency layer deferred, `NOW.md`); empty | — | — | — |
| `language` | Frozen literal `en-US` | — | Default | — |

`verified_customer_needs`, `verified_decision_criteria`, and
`verified_competitor.name` accept empty values today while the audit needs
them. Those three schema changes are deliberate.

## R-13 · How the comparison target is created

Extraction does not currently produce `verified_competitor`. Specify it as an
**explicit deterministic post-extraction derivation step**: after extraction,
Nuave proposes one target from the extracted category and market context,
offering `similar_businesses` as selectable candidates when present.

It is **not** silently taken from `similar_businesses` — that array is
suggestions, and the product contract does not define it as the target.

The user accepts, edits, or replaces the proposal. The goal is to learn how the
model positions the business against something a customer would realistically
choose; it is not a competitor taxonomy.

**Field mapping**, because three concepts coexist unnamed:

| Concept | Where | Role |
|---|---|---|
| `verified_competitor` | `types.ts:76-80` | **The comparison target** |
| `comparison_business` | `questions-id.ts:103` | Derived from `verified_competitor` and nothing else; the string the guard screens |
| `similar_businesses` | `types.ts:81` | Optional suggestions offered as choices |

## R-14 · Conditional screens and stale data

Scope determines which screens apply: a single location shows the branch
screen, a single product shows the product screen, whole-brand shows neither.
The market screen is skipped when scope makes geography immaterial.

**Changing scope after answering downstream screens must not leave stale data
in the audit.** Concretely: a user picks a single location, answers
location-specific market questions, goes back, and switches to a nationwide
product. The branch-specific market answer must not survive into the final
brief.

Rules, per the invalidation column in R-12:

- **Clear and re-ask** `market_context` when scope changes in a way that
  changes whether geography applies.
- **Re-derive** `conversion_action`, `regulated_category_notes`, and
  `priority_offering` from their new upstream values.
- **Re-propose** `verified_competitor` on scope or category change, preserving
  a user-edited value but marking it for re-confirmation at review.
- **Preserve** everything else.

Skipping a conditional screen may never leave a required field with no screen
that owns it. If a skip would orphan a field, the field is either not required
in that path or the screen is not skipped.

## R-15 · Extraction runs after payment, once per journey

On entry to intake, `AuditWorkflow` calls `/api/audit/extract` with the
confirmed source and any user-corrected name. Route behavior is unchanged.

Two POST call sites exist today — `LandingAuditHero.tsx:96` (removed by R-19)
and `AuditWorkflow.tsx:694`. R-15 adds a third trigger point.

**Guarantee: no duplicate extraction during the supported uninterrupted client
journey.** Achieved with an in-flight guard plus a draft-present check: extract
only when no draft exists and no extraction is in flight.

This is deliberately **not** called idempotency. It does not protect against a
lost session, a retry before state is stored, or concurrent transitions.
Durable request idempotency is deferred with that risk accepted.

## R-16 · The intake presents a populated draft

Every **AI-owned** field is pre-populated when extraction produced a usable
value. Intentionally customer-supplied fields — `customer_supplied_facts` — may
start empty.

Where extraction returned nothing for an AI-owned field, the screen says so
plainly and asks. It never renders an unexplained blank.

## R-17 · Validation and correction

- **Next stays enabled.** Do not pair a disabled Next with an error that only
  appears on press. Pressing Next either advances or surfaces an actionable
  error on the responsible field and moves focus there.
- **Final validation routes to the owning screen** with the field focused.
  `AuditWorkflow.tsx:209`'s global schema-path string is replaced.
- **Messages are human Indonesian**, tied to the field, reviewed against
  `VOICE.md`. Never a schema path.
- **Confirmation stays explicit.** The existing `factsConfirmed` action is the
  review screen's primary action. Traversing screens does not imply it.

## R-18 · Recovery when identification fails

A valid source that yields no confident name asks the user to confirm or
correct it. The copy must say Nuave could not read the name from this source —
**never "we found your business."**

The unverified state is a boolean on the identity result, carried into the
extraction request so the draft is not built as though the name were verified,
surfaced on brand confirm as the reason it is asking, and cleared when the user
confirms. It is not persisted into `BusinessBrief`: once the user confirms, the
name is user-verified, which is this product's standard everywhere else.

This is recovery after a real source, not entity search. The user may correct a
detected name at any point during review.

---

# Blocker C — Payment boundary

## R-19 · Workflow invariant

The supported Nuave journey does not trigger personalized extraction before
simulated payment success.

`LandingAuditHero.tsx:96` currently POSTs `/api/audit/extract` after a GET
budget bootstrap at `:78`, then writes `factsExtracted: true` via
`createInitialExtractedAuditWorkflowState` (`workflow-storage.ts:38`) and
redirects to `/audit?entry=landing-extracted`. Rewire it to call R-21 and hand
off to the preview.

**Two distinct mechanisms carry that handoff and must not be described as one:**
the `?entry=landing-extracted` query parameter drives `AuditEntryShell.tsx:13`,
while `factsExtracted` drives `deriveAuditStep` (`stream.ts:174`). Both need
updating.

State whether the GET budget bootstrap is still needed at the landing after the
pre-payment flow changes; if extraction no longer happens there, it is not.
`AuditWorkflow.tsx:484` performs its own unconditional GET bootstrap on mount,
which is not personalized extraction and does not violate this invariant.

## R-20 · What is proven, and what is not

Payment/extraction ordering is proven **for the supported client journey**
using routing and unit tests, a single-call-site guarantee, and E2E network
assertions.

**True server-authorized entitlement enforcement remains deferred.** A
client-side paid flag is not authorization; a determined caller can invoke the
extraction route directly. This spec does not build, and must not be described
as building, a security boundary. No anti-double-charge guarantee is specified,
because no charge exists.

---

# Blocker D — Safe source handling

## R-21 · The identity endpoint

`GET /api/audit/identity?source=…` performs **no provider call and costs
nothing**. It fetches the public source server-side and returns only: display
name, description, canonical URL, inlined icon, source type, and a confidence
flag. Never category, offerings, customers, or competitors.

**Instagram** — business name from `og:title`, parsed before ` (@`; **not**
`og:site_name`. Do **not** use Instagram's `og:description` as the description,
it contains follower and post counts. Do **not** render Instagram's `og:image`
from the browser: those URLs expire and `tests/e2e/network-guard.ts` fails any
third-party browser request. Proxy and inline server-side, or omit.

These behaviors were observed during spec research and are **not reproduced in
a committed test**. Confirm each against a live profile as the first step of the
Instagram path and record the observation date.

**Website** — name from `og:site_name` → `og:title` → `<title>`; description
from `og:description` → `meta[name=description]`; favicon from
`link[rel~=icon]` with a `/favicon.ico` fallback.

## R-22 · SSRF is a release blocker and needs a feasibility determination first

This introduces the first first-party server-side fetching of user-supplied
URLs — `extract/route.ts` performs none today; extraction reaches URLs only
through the provider's web search.

**Before implementation planning**, produce a short technical feasibility
determination for the Cloudflare Workers runtime. Resolving a hostname and
validating the returned IP does **not** pin the subsequent fetch to that
address, so the naive "resolve → validate → fetch" pattern does not deliver the
intended property on this runtime. Name a mechanism that actually does, or
record why the risk is accepted for a pre-customer prototype.

Objectively testable acceptance, each with a stated value:

| Control | Must define |
|---|---|
| Protocols | HTTP/HTTPS only; every other scheme rejected |
| Reserved networks | Reject localhost, loopback, private, link-local, unique-local, and cloud-metadata ranges |
| DNS rebinding | The stated mitigation, or the accepted risk |
| Redirects | A cap, with every hop revalidated against all rules |
| Timeout | A value, applied per request and in total |
| Response size | A byte limit, enforced during streaming |
| Content type | The identity fetch accepts HTML only |
| Credentials | Never forward cookies, authorization headers, or credentials |
| Icon fetching | The same rules as the identity fetch |

## R-23 · Rate limiting: decide, do not defer implicitly

Durable infrastructure is deferred, which is what a rate limiter would normally
need. Choose one and record it:

- name a Cloudflare-compatible mechanism and include it now; or
- defer rate limiting and record the accepted risk — that a bypassed extraction
  call spends founder budget.

Blocker D must not depend on an undefined capability.

---

# The journey

## R-24 · Screens

**Pre-payment:** source entry · scan · preview · order and delivery email ·
simulated checkout · processing · success.

**Post-payment:** brand confirm · scope · (branch | product, conditional) ·
category · offerings · customer reasons · market · comparison target · facts ·
review · question review · run.

## R-25 · What the preview shows

Real, from R-21: business name, description, source URL, and icon. **The
preview is personalized identity by design** — `PRODUCT.md` §2 requires a
best-effort identity preview.

What must not appear before payment: **no personalized audit measurement,
finding, recommendation, competitor result, score, appearance count, or
paid-report result.**

The report card's result region is illustrative only — visibly labelled in
Indonesian as an example, obscured, and `aria-hidden`.

The result slot uses the settled label **Bisnis Anda muncul di X dari 10
pertanyaan** (`VOICE.md:42`). The prototype's "Skor Visibilitas AI" is a
retired concept (`DECISION_LOG`, 2026-08-17) and must not ship. Any example
composition rendered as `/5 + /5` — `ExampleReportPreview.tsx:26`,
`ReportPagePreview.tsx:22` — becomes `/6` and `/4`.

## R-26 · Order screen, navigation, session, copy

- **Order screen** between preview and checkout: delivery email, audit scope,
  the Rp99.000 total with no additional fee, the 30-day quote validity, and
  Terms and Privacy — per `PRODUCT.md:64` and `:277`, `DECISION_LOG.md:67`.
- **In-product Back only.** Previous currently-applicable screen, skipping
  conditional screens that no longer apply, recalculating the later flow per
  R-14. After payment, Back never re-enters the unpaid journey; the first
  post-payment screen may omit Back. No browser-history state machine.
- **Session state** as needed to run the journey. Bump
  `AUDIT_WORKFLOW_STORAGE_KEY` when the shape changes
  (`workflow-storage.ts:25`). Persistence architecture is not what this
  iteration tests.
- **Copy** passes VOICE review: "Cek brand saya" → the settled **Cek bisnis
  saya di AI**; "Kompetitor" → the preferred term; bare "AI" as actor →
  **model AI**. **Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda**
  stay verbatim.

## R-27 · UI implementation

Build on `@base-ui/react`, which already ships `radio`, `radio-group`,
`toggle`, `toggle-group`, `checkbox-group`, and `collapsible`.

**Do not run `npx shadcn add` against the default registry** — it installs
Radix primitives and forks the stack. `components.json` is configured for
`base-nova` with the `@beui` registry; check `@beui`, then compose on Base UI.

Build only what the journey needs: selection card, selection row, chip, bottom
navigation with chapter progress, floating pay bar, scan steps, example report
card. Each keyboard-operable, with visible focus, correct ARIA state, and 44px
targets.

Global token, typography, focus, and legacy-CSS migration are **not**
prerequisites. Pixel parity with the old intake is not a goal.

## R-28 · Sequencing and acceptance

Blocker A includes migrating **every legacy-category consumer required to keep
the current funnel working** — notably `AuditStages.tsx`, whose question-review
screen groups by the five legacy categories and would render empty if the enum
changed underneath it. Complete that migration first; then build `/audit/v2`.

Two distinct gates:

**Pre-handoff verification.** The complete `/audit/v2` journey verified
independently while the production entry path is unchanged. A disconnected
`/audit/v2` may pass this. It is **not** final acceptance.

**Final acceptance.** Connect the landing handoff, then run the end-to-end
journey starting from the real landing entry.

The Playwright specs that assume landing → extraction behavior are updated
deliberately at the handoff. Do not claim they pass unchanged.
`wave1-workflow-lifecycle` is in no configured `testMatch`
(`playwright.config.ts:13-14`) and must be added to one before it counts.

---

## Locked decisions

1. The journey is Landing → Preview → Simulated payment → AI extraction →
   Intake review → Prompt review → Audit.
2. Intake is AI-drafted and user-verified, never a blank questionnaire.
3. Sources are website and Instagram; Google Maps deferred.
4. A public source is mandatory. Manual name entry exists only as recovery
   after a real source fails identification, and is labelled unverified.
5. The pack is semantically 6 unnamed + 4 named per R-01, with identity policy
   enforced in both directions, and one canonical matrix is the only
   measurement authority.
6. Users may edit wording, but may not change a slot's measurement purpose,
   category, brand policy, or comparison-target policy.
7. One comparison target is proposed by an explicit derivation step and may be
   accepted, edited, or replaced.
8. Simulated payment sequences the workflow; it is not a security boundary.
9. Real Midtrans, durable persistence, and global design-system work are out.

## Implementation blockers

| | Blocker | Done when |
|---|---|---|
| **A** | Measurement authority | The canonical matrix exists with both-direction identity policy; every surface in R-03 derives from it; the generation instruction and report semantics are migrated and the instruction version bumped; R-06's agreement tests pass; no positional measurement-policy logic remains outside the matrix |
| **B** | Workflow and data authority | Every field in R-12 has an owner, screen, requiredness, and invalidation rule; the comparison target has an explicit creation step; conditional screens and stale-data rules are implemented; validation routing is executable for every field |
| **C** | Payment boundary | No personalized extraction occurs in the supported client journey before simulated payment success, proven by routing tests, a single-call-site guarantee, and E2E network assertions — with server-side entitlement explicitly deferred |
| **D** | Safe source handling | The SSRF feasibility determination is recorded, R-22's controls each have a stated value and a test, and R-23's rate-limit decision is made |
| **E** | End-to-end runnable journey | The acceptance scenario passes from the real landing entry |

## Deferred after workflow validation

Real Midtrans integration · server-side payment entitlement · durable request
idempotency · durable persistence · comprehensive refresh and restore · browser
Back/Forward · analytics · accounts · delivery-email persistence · global
token, typography, focus, and primitive migration · legacy intake CSS parity ·
Google Maps sources · desktop wide layout.

## End-to-end acceptance scenario

A real supported business source completes:

**Landing source → identity preview → simulated payment → real populated AI
draft → user verification and correction → canonical 6/4 prompt review → real
audit execution**

Stub provider infrastructure or dummy credentials where automated verification
needs them. **No paid or live provider call without explicit authorization.**

Verified along the way:

1. no personalized extraction call occurs in the supported journey before
   simulated payment success — proven by routing unit tests, a test asserting a
   single post-payment call site, and an E2E network assertion. Each is
   client-spoofable by design; that is R-20, not a gap;
2. intake is populated by Nuave, not a blank form, for every AI-owned field;
3. every retained `BusinessBrief` field has a defined owner and screen;
4. no positional measurement-policy logic exists outside the canonical matrix;
5. forbidden identities are rejected and required identities cannot disappear,
   with slot sets derived from the matrix;
6. a six-unnamed-plus-three-named pack is rejected as invalid 6/4;
7. the final pack remains semantically 6/4 after user corrections, and no edit
   can change a slot's measurement purpose;
8. the generation instruction agrees with the matrix slot by slot;
9. report assessment, labels, and denominators derive from the matrix, with no
   observation falling through per-category rules;
10. the comparison target is proposed by the R-13 derivation step and can be
    accepted, edited, or replaced;
11. changing scope invalidates dependent values per R-14 and leaves no stale
    branch-specific data in the final brief;
12. website identity works; Instagram identity works on the intended deployment
    path, or exercises the R-18 recovery state if the edge fetch cannot
    identify it;
13. audit execution receives the reviewed final business context and the
    reviewed final question pack.
