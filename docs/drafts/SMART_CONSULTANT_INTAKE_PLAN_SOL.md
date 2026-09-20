# Smart consultant intake — independent implementation plan

> Status: **Independent candidate for founder review — not implementation authority**
> Owner: Founder / orchestrator
> Updated: 2026-09-20
> Repository baseline: `origin/main` at `4e6b2cf`
> Proposed outcome: replace the fixed business questionnaire with an evidence-backed, summary-first confirmation journey
> Independence note: authored without reading or modifying the concurrent `codex/confirmation-first-intake-plan` worktree or its candidate

This plan translates the founder's desired experience into a bounded path that can be specified, implemented, and verified without rebuilding the working question, audit, or report pipeline. It does not approve implementation, live provider calls, deployment, or a canonical product-contract change. Those actions retain their existing approval gates.

## 1. Decision summary

Nuave should behave like a prepared consultant, not an empty questionnaire:

1. The customer enters the brand name and one supported public business URL.
2. Nuave reads the available public material once and prepares a structured understanding.
3. Nuave presents that understanding in one compact, evidence-labelled summary.
4. One explicit confirmation accepts all visible, non-conflicting proposals.
5. Nuave asks only the consequential questions it could not answer responsibly.
6. Those questions use cards, chips, or short choices; typing is the fallback when no option fits.
7. The customer sees one final compact review before Nuave generates questions.
8. The existing frozen-intake, question-generation, audit-run, and report boundaries remain the downstream path.

The first release should use the existing identity fetch and one existing extraction request. It should not add another model call, a general crawler, a second provider, a chat interface, or a parallel intake system.

## 2. Why this work is needed

The product direction already says that Nuave should prepare the business draft and leave the customer mainly to check and correct it. The current runtime has much of the infrastructure, but not that experience:

- `/audit` starts correctly with brand name and URL.
- `GET /api/audit/identity` reads source metadata.
- `POST /api/audit/extract` performs one domain-restricted model extraction and returns a rich draft.
- `prepareBoundaryIdentity()` keeps only category, offerings, customer needs, and comparison names; it discards market context, target customer, decision criteria, evidence, warnings, identity details, and other useful preparation.
- Live prepared candidates remain unselected, so the user must tap facts Nuave already found.
- The route always visits roughly nine or ten stable fact screens after preparation.
- The current Review screen summarizes answers the customer has already supplied; it is not the first presentation of Nuave's understanding.
- The confirmed-intake projection cannot carry a distinct target customer or buyer criteria into direct-ten question generation.
- Synthetic end-to-end tests deliberately exercise an empty extraction and manual completion, so they prove pipeline continuity but not the desired prepared-confirmation experience.

The result is a real reading pipeline feeding a polite questionnaire.

## 3. Desired customer outcome

After entering a brand and URL, a customer with a reasonably readable public source should be able to say:

> "Nuave sudah memahami sebagian besar bisnis saya. Saya hanya perlu memastikan, memilih fokus audit, dan memperbaiki satu-dua hal yang kurang tepat."

For a sufficiently populated whole-brand case, the target journey is:

```text
Nama brand + URL
  → Nuave membaca sumber
  → "Ini yang Nuave pahami" + pilih fokus audit
  → Ya, sudah tepat
  → answer only unresolved material questions, if any
  → final confirmation
  → prepare audit questions
```

Success is not that every business follows the shortest route. Success is that Nuave never asks the customer to reconstruct information it already extracted, and every additional question has an obvious reason.

## 4. Experience principles

### 4.1 Prepared consultant, not omniscient authority

Nuave presents a draft, not a verdict. Customer-facing language should say:

> "Berdasarkan website, calon pelanggan kemungkinan memahami bisnis Anda seperti ini."

It should not say that an interpretation is a verified business fact merely because a model returned it.

### 4.2 Public understanding and intended reality remain distinct

The prepared snapshot records what the public source communicated. The confirmed draft records what the customer says is accurate and intended.

A correction must not erase the original prepared value. The difference may be useful evidence later, but using that difference in the report is outside this plan and requires its own approved report behavior.

### 4.3 Confirmation is explicit but not repetitive

A proposal may appear preselected because Nuave is recommending it for confirmation. It does not become confirmed until the customer uses the batch confirmation or saves a correction.

The customer should not need to select every extracted offering and then press `Lanjut` on a separate screen for each information category.

### 4.4 Ask only questions that change the audit

A clarification is shown only when all of the following are true:

- the meaning is required for the chosen audit scope or materially improves question relevance;
- Nuave has no responsible ready-to-confirm proposal, or the available sources conflict;
- the customer has not already confirmed an equivalent answer; and
- the answer cannot be represented honestly as unknown.

Optional unknown information remains unknown. It does not create another required screen.

### 4.5 Click first, type only as an escape hatch

Use, in order:

1. one batch confirmation;
2. a single-select or multi-select set derived from the business;
3. a small fixed choice set where the answer is private intent;
4. `Tidak ada yang cocok` or `Tambah sendiri` for text entry.

An open-ended chat prompt is not the primary interaction. It would move the questionnaire into a chat box without reducing cognitive work.

Every text fallback and correction field must use bounded lengths and extend the existing sensitive-data screening before the value is committed, persisted, or sent to a model. A summary-first UI must not create new unguarded free-text paths.

### 4.6 Trust through evidence, not numerical confidence

Customer-facing proposals use plain provenance states:

- **Ditemukan di website** — supported by an extraction evidence record from the submitted domain;
- **Saran Nuave** — a bounded interpretation or comparison suggestion;
- **Ditambahkan oleh Anda** — customer supplied;
- **Perlu dipastikan** — required but unsupported or ambiguous;
- **Sumber berbeda** — conflicting public values require a choice.

Do not display a percentage confidence score. The current extraction does not establish calibrated confidence, and numerical precision would not help the correction task.

## 5. Scope

This plan includes:

- the public `/audit` business-intake path after brand name and URL;
- retaining and mapping the useful identity and extraction output;
- one summary-first understanding screen;
- batch confirmation of visible proposals;
- an adaptive clarification queue;
- click-first correction controls and text fallbacks;
- whole-brand, one-product/service, and one-location scope behavior;
- preservation of prepared versus customer-confirmed meaning;
- a semantically complete frozen handoff to direct-ten question generation;
- session restoration and stale-session handling;
- representative unit, component, and browser tests;
- one explicitly authorized live preparation/usability check after offline acceptance.

## 6. Non-scope

The first implementation must not add or redesign:

- a general crawler or browser-rendering service;
- multiple extraction providers or automatic provider fallback;
- additional model calls merely to summarize the existing extraction;
- question-generation instructions or the direct-ten method;
- observation execution, report synthesis, scoring, or report presentation;
- payment, orders, authentication, cross-device resume, or durable customer storage;
- Google Maps support, broad social discovery, or automatic search for extra official accounts;
- a dashboard, monitoring, CRM, or analytics platform;
- automatic report findings based on differences between prepared and confirmed facts;
- public rollout, paid calls, or deployment without the existing founder authorization.

## 7. Target journey

### 7.1 Entry

Keep the current neutral entry:

- `Nama brand`
- `Link website`
- `Periksa`

Both remain required. Source validation and SSRF/rate-limit protections remain unchanged.

### 7.2 Reading

Keep one honest processing state. Its messages must describe only work actually performed:

- checking the submitted source;
- identifying the business;
- preparing products, customer context, market, and alternatives when supported.

Synthetic mode must continue to say that no source was read. A loading animation must not imply successful extraction before the boundary returns.

### 7.3 Understanding summary

The first stable screen after successful preparation is **`Ini yang Nuave pahami`**. It shows compact sections rather than a long editable form:

1. **Business identity**
   - submitted name;
   - discovered display name when different;
   - canonical source;
   - source description or icon when safely available;
   - an explicit identity warning when the source did not support the submitted name.
2. **Audit focus**
   - one explicit choice: whole brand, one location, or one product/service;
   - extracted offerings become product choices;
   - detected locations appear when responsibly available, otherwise the location fallback is explained.
3. **Business category and offers**
   - primary category proposal;
   - selected principal offerings;
   - additional extracted offerings behind a disclosure.
4. **Customer context**
   - likely target customer;
   - needs or situations that prompt a search;
   - decision considerations, when supported.
5. **Market and service context**
   - extracted market wording as a proposal;
   - service channels remain a compact fixed-choice clarification if extraction cannot support them.
6. **Alternatives**
   - up to three suggested comparable businesses;
   - category-alternative mode when no responsible named suggestion exists.
7. **Unknowns and conflicts**
   - only material required gaps;
   - source conflicts that must be resolved;
   - optional unknowns are disclosed compactly, not turned into required questions.

Identity mismatch detection is new work. The current identity `confidence` boolean only reports that a display name was found; it does not establish that the submitted and discovered names refer to the same entity. The specification must define a conservative deterministic comparison and route uncertain cases to confirmation rather than treating `confidence: true` as a match.

The active summary is conditioned on the selected focus. Changing focus updates which proposals are active before confirmation; it does not confirm or discard anything by itself. **Ya, sudah tepat** remains unavailable until a focus is selected and every visible conflict is resolved.

Primary action:

- **Ya, sudah tepat** — confirms every visible active non-conflicting proposal exactly as displayed.

Secondary action:

- **Perbaiki bagian tertentu** — exposes card-level correction controls without leaving the understanding context.

Batch confirmation cannot include hidden values. Collapsed additional offerings are not confirmed unless their selected state is visible before confirmation.

### 7.4 Audit-focus behavior

Audit scope remains an explicit customer decision inside the understanding summary because it is intent, not a fact Nuave should silently infer:

- Brand secara keseluruhan
- Satu lokasi
- Satu produk atau layanan

For product scope, extracted offerings become product choices before a text fallback appears.

For location scope, detected locations may be offered when responsibly available. The first release may retain manual name and distinguishing address when no structured location candidate exists. It must state that Nuave could not identify a specific location rather than presenting an empty list as successful preparation.

### 7.5 Clarification queue

After scope is chosen, derive a short queue from unresolved active meanings.

Examples:

- category has two plausible proposals → choose one;
- local market is evident but exact area is missing → choose or add the area;
- no service-channel proposal exists → select one or more fixed options;
- no comparison business exists → choose category alternatives or add one.

Conflicts are resolved on the understanding summary before batch confirmation; they do not enter the post-confirmation clarification queue.

The queue is recalculated after a correction. It is not a fixed route and does not silently skip a required meaning.

The customer sees progress as a small count such as `2 hal perlu dipastikan`, not the current four-chapter representation of a fixed questionnaire.

### 7.6 Final confirmation

Show one compact final projection of the confirmed active meanings. Every row remains directly editable. The primary action remains **`Buat pertanyaan audit`**.

The final confirmation must not introduce a new field or value. It is the exact projection that will be frozen and sent to question generation.

## 8. Minimal prepared-understanding contract

Do not route the raw provider response directly into React components. Introduce one small application-owned prepared-understanding value at the existing extraction-to-intake seam.

A field needs only these semantics:

```ts
type PreparedMeaning<T> = {
  proposed: T | null;
  basis: "observed" | "suggested" | "unknown" | "conflict";
  evidence: EvidenceReference[];
  alternatives: T[];
};
```

This is not a generalized knowledge graph. It exists only to preserve information the current extraction already returns and to support honest confirmation. A list field uses one `PreparedMeaning` per displayed item so offerings with different evidence or status are not collapsed into one field-level label.

The session keeps two separate values:

- `preparedUnderstanding` — immutable result of the current source-version preparation;
- `confirmed` — customer-approved active meaning used by questions and audit.

Customer edits update `confirmed` and its provenance. They do not mutate `preparedUnderstanding`.

### 8.1 Initial field mapping

| Customer meaning | Existing source | First-release treatment |
|---|---|---|
| Submitted identity | entry + `SourceIdentity` | Show submitted and discovered identity; require resolution only on mismatch/ambiguity |
| Official source | canonical identity URL + extraction sources | Keep submitted canonical source; do not add unverified official links |
| Category | `ExtractionDraft.category` + evidence | Visible proposed primary category; alternatives only if later supported |
| Offerings/product candidates | `verified_offerings` | Visible and selected as proposals; product scope reuses them as target choices |
| Target customer | `target_customer` | Preserve as distinct: observed when evidence supports it, otherwise suggested or unknown; never collapse into customer needs |
| Customer needs | `verified_customer_needs` | Proposed chips or short rows |
| Decision considerations | `verified_decision_criteria` | Proposed chips; remain distinct from service channels |
| Market | `market_context` + evidence | Show wording; ask a structured reach/area clarification only when the downstream contract needs it |
| Comparison candidates | `similar_businesses` | Preserve name and source URL; offer category-alternative fallback |
| Name variants | `brand_name_variants` | Retain for question identity protection; show only when useful for correction |
| Differentiator | `usp` + evidence | Optional proposed public fact; do not require it |
| Conversion action | `conversion_action` | Retain only if a current downstream consumer uses it; otherwise omit from UI and handoff |
| Accuracy questions/warnings | `known_accuracy_questions`, `warnings` | Convert only material actionable items into conflicts or clarifications; do not dump provider prose into UI |
| Evidence | `evidence[]` | Attach relevant source reference to each displayed proposal; keep copied content minimal |
| Customer-only public fact | none | Starts empty and optional |
| Service channels | no reliable current extraction field | One compact fixed-choice clarification; do not infer silently in the first release |
| Locations | no reliable current list | Use a supported candidate only when available; otherwise focused manual fallback |

### 8.2 Evidence matching

Evidence records are matched to a proposal by an approved field-name map and conservative normalized-value equality. The specification must define that map per field. Initial normalization should be deterministic only: Unicode normalization, trim, whitespace collapse, and locale-insensitive case folding. Do not use a second model call, fuzzy similarity, or substring matching to upgrade a proposal to **Ditemukan di website**. List values are matched item by item.

If no supporting evidence can be matched:

- factual fields become **Saran Nuave** or **Perlu dipastikan**, not **Ditemukan di website**;
- a required unsupported value enters the clarification queue;
- an optional unsupported value is omitted or shown as a suggestion;
- provider warnings never become customer facts.

Distinct supported values for the same single-value field form a conflict. A warning alone may request review but must not invent the conflicting alternative.

The application does not need to expose exact excerpts in the primary summary. A small source disclosure is enough. Raw provider bodies remain subject to the existing restricted-evidence rules.

## 9. Confirmation and routing rules

### 9.1 Batch confirmation

`Ya, sudah tepat` performs one atomic transition:

1. copy every visible selected proposal into confirmed state;
2. attach its basis and source references;
3. leave unknown fields unconfirmed and fail closed if an unresolved conflict somehow reaches this transition;
4. compute active requirements from the explicit scope;
5. create the clarification queue;
6. advance to the first unresolved material question or final confirmation.

It makes no provider call.

### 9.2 Required meanings

The active minimum remains bounded:

- exact brand and primary public source;
- explicit audit scope;
- exact location or product target when that scope is chosen;
- customer-language category;
- at least one offering for whole-brand/location, or the selected product target;
- at least one service channel;
- market reach, plus area when area-based;
- named comparison candidates or explicit category alternatives.

Customer needs, target customer, and decision considerations materially improve question relevance. They should be prepared and confirmed when available, but an unsupported value must not be invented. If the approved specification decides one is mandatory for useful questions, the clarification uses suggested choices plus a text fallback rather than a blank text area.

The optional public fact remains optional and should be reachable from **Tambah informasi penting** on final confirmation, not a mandatory empty screen.

### 9.3 Dependency changes

Preserve the current dependency discipline:

- identity/source change creates a new preparation version and invalidates all unconfirmed prepared values;
- scope change invalidates only target-dependent confirmations;
- product/location target change re-evaluates category, offerings, customer context, market, and comparison relevance;
- category change re-evaluates offerings and comparisons;
- material confirmed changes invalidate the generated question pack;
- Back or Cancel restores the last committed snapshot.

Do not force the customer through every unaffected editor after one correction. Return to the summary with only newly unresolved meanings highlighted.

### 9.4 Honest unknowns

Do not satisfy an older schema minimum with semantically different data. In particular:

- service channels are not buyer decision criteria;
- category plus market is not a confirmed target customer;
- a category fallback comparator is not a named competitor;
- an entered brand name is not a discovered identity.

If a downstream boundary still requires one of these values, either obtain it through one focused clarification or update the boundary to represent an explicit unknown. Do not manufacture completeness in an adapter.

## 10. Implementation approach

All implementation should land as one complete product PR because every merge to `main` deploys. Intermediate commits may be reviewable, but no partial summary/data migration should be merged into the live journey.

### Work block A — approve the behavior contract

Before code:

1. Record the founder decision that summary-first confirmation supersedes the current fixed-screen skip rule.
2. Resolve the open decisions in section 16.
3. Create the next available numbered specification from `docs/templates/SPEC.md`.
4. Mark it **Approved** before implementation.
5. Keep this plan as review evidence; do not silently promote it to canonical authority.

Done when the user outcome, active required meanings, batch-confirm semantics, fallback behavior, and acceptance criteria are approved.

### Work block B — preserve the prepared understanding

Likely code surfaces:

- `src/lib/intake/preparation.ts`
- `src/lib/intake/state.ts`
- `src/lib/intake/fixtures.ts` or a replacement test fixture module
- `src/lib/audit/types.ts` only where the existing extraction contract needs a bounded correction
- `src/lib/intake/local-session.ts`

Deliverables:

- application-owned prepared-understanding type;
- lossless mapping of relevant `SourceIdentity` and `ExtractionDraft` fields;
- field-level basis/evidence/unknown/conflict semantics;
- separate immutable prepared and mutable confirmed snapshots;
- a new session version that rejects incompatible old state safely;
- unit tests proving no fixture facts leak into an entered business.

No customer-facing route changes should be merged separately from the complete PR.

### Work block C — replace the linear questionnaire with summary plus clarifications

Likely code surfaces:

- `src/lib/intake/IntakeJourney.tsx`
- `src/lib/intake/navigation.ts`
- `src/lib/intake/screens-bab1.tsx`
- `src/lib/intake/screens-bab2.tsx`
- focused new components under `src/lib/intake/` or existing product-selection primitives
- existing intake CSS/tokens only as needed

Reuse current controls and correction screens where possible. The current category, offering, market, comparison, and target editors are useful as focused correction surfaces. They should no longer define the mandatory normal route.

Deliverables:

- understanding summary;
- batch confirmation;
- explicit scope selection;
- adaptive clarification queue;
- inline/per-card correction;
- compact final confirmation;
- truthful progress and failure copy;
- keyboard and screen-reader behavior equivalent to the existing accessible controls.

### Work block D — make the downstream handoff semantically complete

Likely code surfaces:

- `src/lib/intake/frozen-intake.ts`
- `src/lib/intake/local-questions.ts`
- `src/lib/intake/glm-local.ts`
- `src/lib/audit/question-facts-v3.ts`
- affected request validation, payload builders, persistence parsers, and focused tests

Deliverables:

- confirmed target customer, needs, and decision considerations remain distinct;
- advance `LOCAL_INTAKE_INPUT_VERSION` and the server-side `question-facts-v3.ts` local-schema literal together;
- revise the persisted question-pack/session contract where it embeds the old frozen input, so an old pack or audit record is rejected rather than reinterpreted;
- update the GLM preparation adapter and every test/payload builder that validates the frozen wire shape;
- choose an explicit backward policy: preserve completed old evidence as historical data, but require a fresh confirmation/preparation for an old in-progress intake rather than migrating its meaning silently;
- question generation receives every confirmed meaning it knows how to use;
- unknowns remain explicit;
- no service-channel/category fallbacks masquerade as different facts;
- fingerprinting and fact-version invalidation still bind questions to the exact visible final confirmation;
- no change to the direct-ten instruction, models, provider, observation method, or report method.

### Work block E — verification and one live preparation review

Offline first:

1. focused unit and component tests;
2. browser scenarios in section 12;
3. `npm run validate:fast` during iteration;
4. `npm run verify` before branch handoff;
5. full diff and generated-artifact review.

Only after offline acceptance and explicit founder authorization:

- run one live identity + extraction preparation for a named public business;
- stop before question generation unless separately authorized;
- founder reviews accuracy, provenance labels, correction effort, and typed-character count;
- record provider calls, cost, source, date, corrections, and outcome;
- do not publish the business or findings.

## 11. Failure and recovery

| Situation | Customer experience | Preserved state | Prohibited behavior |
|---|---|---|---|
| Source is invalid | Field-level URL correction | Entered name | No provider call; no guessed URL |
| Identity source cannot be fetched | Explain that the source could not be read; retry or change source | Entered values and prior committed session | Do not show "brand found" |
| Identity/extraction is rate-limited or its limiter is unavailable | Show the existing Indonesian wait/unavailable state and an explicit retry; do not fall through to manual as if reading succeeded | Entered values, committed session, and any completed preparation stage | Do not make a provider call after rejection or hide `429`/`503` as an empty draft |
| Extraction returns no usable draft | Show the confirmed identity and a compact minimal clarification set | Identity, telemetry, source | Do not render an apparently populated summary or import fixture facts |
| Extraction is partial | Show supported proposals and only material gaps | Every supported proposal | Do not discard successful extraction because one field is missing |
| Submitted and discovered names differ | Show both and require a choice/correction | Both values and source | Do not silently prefer either |
| Sources conflict | Show the conflicting values and ask which is current | Evidence references | Do not choose the cleaner value automatically |
| No branch is detected | Focused branch name + distinguishing address fallback | Whole-business understanding | Do not imply that no branches exist |
| No product is detected | Offer extracted offerings if available, then text fallback | Whole-business understanding | Do not force product scope to continue without an exact target |
| No comparison candidate is credible | Offer category alternatives | Category and market | Do not invent a named competitor |
| Refresh during preparation | Resume the same request state or show an honest interrupted state under existing limits | Stable committed state and telemetry | Do not silently repeat a paid extraction |
| Old session schema is restored | Explain that preparation must be restarted; retain safe entry values where practical | Brand and URL if safely parseable | Do not reinterpret old state as the new contract |
| Correction changes material meaning | Invalidate questions and show what needs reconfirmation | Prepared snapshot and unaffected confirmations | Do not keep a stale approved pack |

## 12. Verification matrix

### 12.1 Unit and contract tests

- rich extraction maps every supported meaning and evidence reference;
- partial extraction preserves supported fields and marks only real gaps;
- empty/synthetic extraction imports no business facts;
- discovered/submitted identity mismatch creates a conflict;
- prepared proposals are visible and selected but unconfirmed before batch action;
- batch confirmation includes exactly the values shown;
- hidden or collapsed-unselected values are excluded;
- clarification queue contains only active unresolved required meanings;
- whole-brand, location, and product dependencies invalidate only affected meanings;
- prepared and confirmed snapshots remain separate;
- stale session and frozen-wire versions fail safely;
- frozen input reproduces final confirmation exactly;
- target customer, needs, and criteria reach question facts without semantic substitution;
- every new text fallback applies length and sensitive-data guards before commit/persistence;
- identity/extraction `429` and `503` responses preserve stable work and make no downstream provider request;
- a material correction invalidates the pack fingerprint.

### 12.2 Component/accessibility tests

- provenance labels have accessible names and do not rely on color;
- summary sections and correction disclosures have logical heading order;
- batch confirmation is keyboard-operable;
- conflict and unknown states move focus to the responsible control;
- chips/cards expose selected and confirmation state correctly;
- Back/Cancel returns to the previous committed understanding;
- desktop and 350–390 px mobile layouts do not hide confirmed values or actions.

### 12.3 Browser scenarios

The current synthetic extraction intentionally returns an empty draft, so it cannot prove the prepared-confirmation path. Browser tests should intercept the existing identity and extraction requests with deterministic rich, partial, conflict, and empty response payloads. Those payloads must still pass through the production client mapping and state transitions. Do not add a runtime query parameter, production-only test branch, or synthetic response that can be selected in live mode.

Define the **rich** payload as one supported identity plus evidence-backed category, at least two offerings, target customer, customer need, decision consideration, market context, and one comparison suggestion. Define partial/conflict payloads explicitly beside it so "rich" is not left to each test author's judgment.

1. **Rich whole-brand preparation**
   - enter name + URL;
   - see populated understanding;
   - confirm in one action;
   - choose/confirm scope and any compact private-intent choices;
   - reach final confirmation with zero additional typed characters.
2. **Partial local business**
   - supported category/offers remain populated;
   - only missing reach/area or service meaning is asked;
   - no duplicate category/offering question appears.
3. **Product scope**
   - choose one extracted offering as the product target;
   - general offerings screen is not shown;
   - downstream facts concern that target.
4. **Location scope without detected locations**
   - one focused name/address fallback appears;
   - all unaffected prepared understanding remains intact.
5. **Identity conflict**
   - both names are visible;
   - final confirmation is blocked until resolved.
6. **Empty extraction/manual fallback**
   - no fictional or fixture fact appears;
   - minimum clarification path still reaches final confirmation.
7. **Correction and resume**
   - edit one summary card, reload, and return without another extraction;
   - generated questions invalidate only after a material saved change.
8. **Failure/retry accounting**
   - one preparation attempt per accepted source version;
   - interrupted/retried attempts remain in telemetry;
   - no hidden provider request.

### 12.4 Experience budget

For this budget, a **content stage** is one top-level journey state. The clarification queue is one persistent `Perlu dipastikan` stage containing the unresolved cards; it must not become one route screen per field. A **substantive decision** is a selection or correction that changes confirmed business meaning; navigation buttons do not count.

For the rich whole-brand browser fixture, automated assertions should enforce:

- exactly two required text fields before preparation;
- zero typed characters after `Periksa`;
- no more than three customer-visible content stages between reading and question review: understanding, at most one clarification stage, and final confirmation;
- no more than four substantive decisions after reading, including focus and batch confirmation;
- no repeated request for a meaning already visible and batch-confirmed;
- one extraction request for one accepted source version.

For product scope with extracted offerings, zero additional typing remains the target. Location scope may use the focused address fallback until structured location extraction is separately justified. Partial fixtures have no arbitrary decision-count target, but every clarification card must map to one active unresolved requirement.

## 13. Measurement without a new analytics system

The initial trial can be judged through automated action budgets and founder-observed sessions. Do not add an analytics vendor for this work.

Record for each authorized usability run:

- typed characters after initial name and URL;
- number of substantive choices after preparation;
- number and type of corrected proposals;
- time from extraction completion to final confirmation;
- fields most often missing or wrong;
- whether the generated questions reflect the confirmed customer context;
- preparation provider calls and cost;
- whether the customer says the summary represented what the website currently communicates.

If remote funnel collection is later approved, reuse the existing privacy-safe event allowlist and send only screen/state IDs, counts, booleans, and timing. Never send brand names, URLs, answer text, source content, or correction text as analytics.

## 14. Rollout and repository safety

- Refresh `origin/main` immediately before creating the implementation branch and again before final review.
- Use the next available spec number; do not assume one while another agent may be drafting.
- Preserve concurrent user and agent work. Never overwrite another candidate plan or implementation branch.
- Build the complete replacement on one dedicated branch and one PR because `main` deploys after merge.
- PR previews remain synthetic and must visibly say so.
- Existing `NUAVE_NEW_AUDIT_ENABLED` remains the emergency off switch; do not create a permanent flag matrix for two intake implementations.
- Before merge, bump/revise the intake session contract so old state cannot corrupt the new journey.
- After merge, perform no live provider test without a separately stated allowance.
- If the live preparation review finds material misinformation or excessive correction, use the existing off switch under founder authority and prepare a reviewed revert; do not silently restore an undocumented parallel journey.
- Remove obsolete fixed-route code only after the replacement passes verification. Archive only when repository instructions require it; do not delete historical evidence.

## 15. Main risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Domain-restricted web search misses source content | Empty or incomplete understanding | Partial-draft path; focused clarifications; do not add a crawler before evidence justifies it |
| Prefilled proposals create false trust | Customer batch-confirms an incorrect fact | Provenance labels, visible selection, conflicts excluded from batch confirm, easy correction |
| Summary hides too much detail | Customer cannot spot a wrong assumption | Material values remain visible; disclosure only for additional non-active items |
| Adaptive routing silently skips required meaning | Weak or invalid question input | Derive queue from explicit active requirements; final frozen-input validation remains authoritative |
| Existing brief minima encourage fabricated completeness | Irrelevant or misleading questions | Preserve semantic fields; clarify or represent unknown instead of substituting another meaning |
| Scope expansion into extraction infrastructure | Long, risky rewrite | First release uses the current identity fetch and one extraction request |
| Separate implementations drift | Higher maintenance and inconsistent sessions | Replace the route in one complete PR; reuse existing editors and controls |
| Session migration breaks resume | Lost trial work | Explicit session version; safe rejection/restart; test reload and stale state |
| Branch/product cases delay the whole outcome | Confirmation-first never ships | Reuse offerings for product; allow honest focused location fallback in first release |
| Live testing spends or exposes data unexpectedly | Cost/privacy incident | Offline gate first; one named preparation-only authorization; private evidence; no publication |

## 16. Founder decisions required before specification approval

The plan recommends the default shown for each decision.

1. **Supersede the fixed-screen skip rule?**
   - Recommended: yes. Required meanings stay enforced, but prepared and confirmed meanings do not create separate mandatory screens.
2. **Allow one batch confirmation for every visible selected proposal?**
   - Recommended: yes. Hidden, unknown, and conflicting values are excluded.
3. **Accept the current extraction mechanism for the first release?**
   - Recommended: yes. Keep direct identity metadata plus one domain-restricted OpenAI extraction; evaluate a crawler only from observed failures.
4. **Restore target customer and decision considerations as distinct confirmed meanings?**
   - Recommended: yes. They materially affect question relevance and must not be replaced by needs or service channels.
5. **Accept manual location fallback in the first release?**
   - Recommended: yes. Product scope reuses offerings; structured location extraction should not block the core experience.
6. **Make one customer-context meaning required when extraction has none?**
   - Recommended: require one click-first customer need or target-context answer before questions, because the product's usefulness depends on realistic discovery intent. The specification should settle the exact minimum.
7. **Adopt the rich-case experience budget in section 12.4?**
   - Recommended: yes. It gives the implementation an observable customer-effort constraint rather than only a visual target.

## 17. Acceptance gates for the eventual specification

The approved specification should include at least these observable outcomes:

- **AC-01 — Minimal entry:** public `/audit` asks only brand name and supported public URL before preparation.
- **AC-02 — Prepared summary:** a rich extraction produces one evidence-labelled understanding summary before any fact questionnaire.
- **AC-03 — Batch confirmation:** one action confirms exactly all visible selected non-conflicting proposals.
- **AC-04 — Rich-case effort:** whole-brand rich preparation requires zero typing after entry and stays within the section 12.4 stage budget.
- **AC-05 — Adaptive clarification:** only active unresolved material meanings are requested; confirmed values are not asked again.
- **AC-06 — Product scope:** extracted offerings are available as product targets without retyping.
- **AC-07 — Honest location fallback:** absent location candidates produce one focused manual fallback without discarding unrelated preparation.
- **AC-08 — Provenance:** every displayed proposal is labelled as observed, suggested, customer-added, unknown, or conflicting; no unsupported item is labelled found.
- **AC-09 — Semantic handoff:** final confirmation, frozen intake, question facts, and question-writer context retain the same active meanings, including target customer and decision considerations when confirmed.
- **AC-10 — No fabricated completeness:** missing semantics stay unknown or cause a focused clarification; no adapter substitutes a semantically different field.
- **AC-11 — Cost boundary:** one accepted source version causes at most the existing bounded extraction attempt/retry behavior and no new summary call.
- **AC-12 — Recovery:** partial extraction, conflict, failure, correction, Back, and reload preserve stable work and never replay settled provider work silently.
- **AC-13 — Isolation:** entered businesses never receive fictional fixture facts, and synthetic mode remains unmistakably labelled.
- **AC-14 — Regression gate:** question approval, audit execution, report generation, JSON/PDF controls, cost telemetry, and existing off/rate-limit protections remain intact.
- **AC-15 — Human review:** the founder completes desktop and mobile rich/partial walkthroughs and explicitly judges whether the journey feels like confirming a prepared consultant's work rather than filling a form.

## 18. Recommended next action

Review this candidate alongside the independently authored alternative without merging their prose. Decide section 16 explicitly, then ask the orchestrator to produce one reconciled, next-numbered draft specification with stable requirements and acceptance criteria.

Do not begin implementation directly from this plan. The smallest useful implementation authority is an approved specification for one outcome:

> After brand name and URL, Nuave presents an evidence-backed understanding that a well-read business can confirm without further typing, and asks only the unresolved facts needed to prepare useful audit questions.
