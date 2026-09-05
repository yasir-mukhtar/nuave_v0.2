# NUAVE — Post-Payment Intake Shell Journey Contract

> Status: **Founder-approved authoritative shell contract**  
> Approved: 2026-09-04  
> Scope: post-payment `Membaca` through Question Review and the `Mulai audit` handoff  
> Authority: newest founder decisions, read with the approved Gate 0 package and `INTAKE_SHELL_REVIEWER_FENCE.md`

This contract governs only the customer-visible intake shell: screens, interaction grammar, route branching, validation meaning, navigation, Review behavior, and the two boundary interfaces. It does not replace the approved rebuild plan, its technical state/data contracts, preparation or question-generation internals, payment and entitlement logic, audit execution, reporting, storage keys, or deployment work.

Where this contract differs from the Gate 0 shell, the differences are recorded in §2 and are founder-approved. Outside those listed differences, the approved Gate 0 contracts remain authoritative.

## 1. Contract summary

The intake is one correction journey over one canonical shell draft. Every stable screen asks one mental question and uses one of four interaction grammars:

- **Confirm:** inspect an AI-prepared answer, optionally correct it, then continue.
- **Pick:** choose from clear options; typing is a fallback.
- **Prune:** start from prepared suggestions; remove or add.
- **Correct:** leave the main route, repair the input, reprocess, and reconfirm.

`Lanjut` validates and commits the current answer. There is no redundant Yes selection before it. The route is derived from committed answers. Back follows stable states actually visited; processing states are never Back destinations. Review reads the same committed draft as the screens, and the outgoing question handoff must reproduce the displayed Review exactly.

The settled brand sequence is:

`s-crawl → s-brand → next applicable intake state`

The settled wrong-brand loop is:

`s-brand → s-brand-fix → s-crawl → s-brand`

### Boundary interfaces

| Boundary | Shell contract | Owned elsewhere |
|---|---|---|
| Entry from payment/preparation | The shell receives the submitted primary source, a preparation status, and any prepared identity and intake candidates for the same purchased business. It begins at `s-crawl` and cannot show `s-brand` until preparation reports success. | Payment verification, orders, entitlement, retrieval, extraction, preparation jobs, persistence, and remedies. |
| Intake Review to questions | `s-review` hands the question module a frozen copy of the exact active answers displayed in Review. The shell waits for either a valid ten-slot pack or a recoverable failure response. | Provider selection, prompts, composition rules, generation budgets, retries, and fallback construction. |
| Question Review to audit | `s-questions` hands the existing audit-start boundary the exact approved pack together with the confirmed intake meaning it was made from. | Entitlement consumption, audit execution, provider orchestration, and reporting. |

## 2. Founder-approved Gate 0 shell deltas

These decisions settle the earlier Gate 0 ambiguities. They are not invitations to redesign the owning technical modules.

| Topic | Earlier Gate 0 treatment | Settled shell contract |
|---|---|---|
| Brand confirmation | Separate “Ya, benar / Bukan” choice before Continue | Editorial brand confirmation with `Ubah` and footer `Lanjut`. Continuing implicitly confirms. |
| Reading failure | `Coba lagi / Isi manual` and automatic manual routing after the retry ceiling | Failure remains on `s-crawl` with `Coba lagi` and `Ubah sumber`. It never auto-advances or creates a brand candidate. The shell adds no manual bypass to `s-scope`. |
| Location availability | Location scope hidden when no branches were detected | Location scope remains available. `s-branch` offers detected locations or manual addition and requires one exact target. |
| Product offerings | Every scope visits `s-offerings` | Product scope skips `s-offerings` because the exact target product/service is the sole offering context. |
| Service and market | One conditional `s-market` combines reach with local/online behavior | Add `s-service` for service mode. `s-market` then asks only geographic reach and is shown on every route; only its area controls are conditional. |
| Blocking rules | Gate 0 Experience and Data contracts disagreed | Whole-brand/location offerings require at least one; customer reasons are optional; service mode and market reach are required; comparator mode must resolve to named comparators or category alternatives. |
| Names and sources | A differently behaving inline field in `s-review` | Keep it owned by `s-review`, but use a dedicated Review edit substate with the same Save/Cancel return semantics as every other Review edit. It is not a new normal-route screen. |
| Review edits | Direct jumps were defined, but return behavior was incomplete | Save returns to Review after any necessary dependent reconfirmation. Cancel or Back returns to unchanged Review. An edit never resumes the remaining linear intake. |

The new `s-service` uses the existing “Pasar dan pembanding” chapter. No new chapter is introduced. The longest normal route contains ten stable content screens before `s-review`, so the approved ≤10 + Review budget still holds.

## 3. Compact journey diagram

~~~mermaid
flowchart TD
  C["s-crawl · Membaca"] --> B["s-brand · Konfirmasi"]
  B -->|Ubah| F["s-brand-fix · Koreksi"]
  F -->|Periksa lagi| C
  B -->|Lanjut| S["s-scope"]
  S -->|Seluruh brand| W["s-category → s-offerings"]
  S -->|Satu lokasi| L["s-branch → s-category → s-offerings"]
  S -->|Satu produk| P["s-product → s-category"]
  W --> T["s-customers → s-service → s-market → s-competitors"]
  L --> T
  P --> T
  T --> R["s-facts → s-review"]
  R --> G["Question handoff · transient"]
  G --> Q["s-questions"]
  Q --> A["Mulai audit · boundary"]
~~~

## 4. Journey states and transitions

### 4.1 Stable states

| State ID | Purpose and entry | Information shown; answer owned | Validation to leave | Possible next state | Back history |
|---|---|---|---|---|---|
| `s-brand` | Confirm the latest successfully prepared identity. Enters only after successful `s-crawl`. | Prominent logo, brand name, primary source, short reliable description, small `Ubah`, footer `Lanjut`. Owns confirmation of brand identity and primary source. | A successful candidate exists. `Lanjut` commits it; no Yes/No choice. | `Lanjut → s-scope`; `Ubah → s-brand-fix`. | Yes. Initial occurrence has no in-shell Back destination. After correction, Back may return to the previously visited `s-brand-fix`, never `s-crawl`. |
| `s-brand-fix` | Correct a wrong name or source. Enters from `Ubah` or `Ubah sumber`. | Current name and source prefilled; `Batal` and `Periksa lagi`. Owns staged identity/source correction. | A non-empty name and a source acceptable to the existing preparation boundary. Nothing commits before successful reprocessing and reconfirmation. | `Periksa lagi → s-crawl`; `Batal` → unchanged originating confirmation, or unchanged reading error when no candidate exists. | Recovery history only. Browser Back equals `Batal`. |
| `s-scope` | Choose what the audit covers after brand confirmation, or edit scope from Review. | Whole brand, one branch/location, or one product/service. Owns audit scope. | Exactly one explicit choice. | Whole → `s-category`; location → `s-branch`; product → `s-product`. | Yes; normal Back → `s-brand`. Review-edit Back cancels to Review. |
| `s-branch` | Choose one exact location when scope is location. | Detected locations with distinguishing area/address context; fallback to add one. Owns target location. | Exactly one target. A manual target must be sufficiently specific to distinguish it. | `s-category`. | Yes; Back → `s-scope`. |
| `s-product` | Choose one exact product or service when scope is product. | Detected targets with short distinguishing context; fallback to add one. Owns target product/service. | Exactly one non-empty target. | `s-category`. | Yes; Back → `s-scope`. |
| `s-category` | Confirm the customer-language category for the active audit target. | Prepared category choices and a fallback to add one. Owns category. | Exactly one category. | Whole/location → `s-offerings`; product → `s-customers`. | Yes; Back → the actually visited `s-scope`, `s-branch`, or `s-product`. |
| `s-offerings` | Confirm what the whole brand or selected location offers. Not active for product scope. | Extracted items selected, suggestions available, and add fallback. Owns offerings. | At least one offering. | `s-customers`. | Yes; Back → `s-category`. |
| `s-customers` | Optionally refine why customers seek this category or target. | Contextual reasons to prune or add. Owns customer reasons. | Empty is valid; entered items must be meaningful and non-empty. | `s-service`. | Yes; Back → `s-offerings`, or `s-category` on product scope. |
| `s-service` | Confirm how customers receive or use the active offering. | One proposed Pick: at the business location, at the customer location, remotely/delivered, or mixed. Owns service mode. | Exactly one service mode. | `s-market`. | Yes; Back → `s-customers`. |
| `s-market` | Confirm where customers are for this audit. | One reach choice: around one area, selected areas, nationwide, or international. Area controls appear only for the first two. Owns market reach and selected areas. | Exactly one reach. Area-based reach requires at least one area; nationwide/international requires none. | `s-competitors`. | Yes; Back → `s-service`. |
| `s-competitors` | Confirm named comparators or explicitly use category alternatives. | Prepared comparators to prune/add and `Tidak ada pesaing langsung`. Owns comparator mode and active names. | Exactly one valid mode: at least one named comparator, or category alternatives with no named comparator. | `s-facts`. | Yes; Back → `s-market`. |
| `s-facts` | Capture one optional public business fact that must not be misunderstood. | One optional free-text answer. Owns the must-be-correct fact. | Empty is valid. Unsafe personal or payment information cannot be committed. | `s-review`. | Yes; Back → `s-competitors`. |
| `s-review` | Approve the exact active shell draft before questions are requested. | Meaning-level Review rows, each with `Ubah`. Owns Review confirmation and the aliases/supporting-sources edit substate. | All active required answers are valid and no dependent answer awaits reconfirmation. | CTA → question handoff; `Ubah` → row owner; identifiers `Ubah` → `s-review:identifiers-edit`. | Yes; normal Back → `s-facts`. From `s-questions` it is the direct Back target. |
| `s-review:identifiers-edit` | Edit other names and supporting sources without adding a normal-route screen. | Existing aliases and accepted supporting-source candidates, with prune/add controls; primary-source correction routes to `s-brand-fix`. | Optional. Retained entries must be valid and deduplicated. | Save → `s-review`; source reprocessing, when required, follows `s-brand-fix → s-crawl → s-brand` before Review. | Review-owned substate. Back/Cancel → unchanged `s-review`. |
| `s-questions` | Review the ten-slot pack supplied by the existing question module before audit start. | The received questions in fixed slot order; wording may be edited within the constraints supplied by that module. | The received pack is valid under the existing question contract; edited unbranded wording contains no confirmed brand name or alias. | `Mulai audit` → audit-start boundary. | Yes; Back → `s-review`, never the generation wait. |

### 4.2 Transient and error states

| State | Purpose and entry | Information/actions | Exit | Back-history rule |
|---|---|---|---|---|
| `s-crawl:processing` | Genuine post-payment preparation or reprocessing. | Honest progress only; no Continue. | Success auto-advances to `s-brand`; failure becomes `s-crawl:error`. | Never pushed. |
| `s-crawl:error` | Recover from failed reading without inventing a candidate. | `Coba lagi` and `Ubah sumber`. | Retry → `s-crawl:processing`; change source → `s-brand-fix`. It never auto-advances. | Error substate; never a Back destination. |
| Question handoff pending | Wait for the existing question module after Review approval. | Honest progress only. | Valid response → `s-questions`. Failure uses the existing module’s recoverable response and permits return to `s-review`. | Never pushed. |

## 5. Scope-branch rules

All prepared suggestions and Review values must be conditioned on the committed scope and target. Merely relabelling whole-brand answers is not sufficient.

| Scope | Required route after `s-scope` | Context rules | Review and question outcome |
|---|---|---|---|
| Whole brand | `s-category → s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review` | Category and offerings describe the whole brand. Offerings require at least one. Customer reasons remain optional. | Location and product targets are inactive and omitted. |
| One branch/location | `s-branch → s-category → s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review` | Nuave proposes detected locations. With none, the customer manually adds one exact target. Prepared downstream answers are specific to that location. Offering confirmation remains required because a branch may offer only part of the brand catalogue. | Review names exactly one location and omits product target. Unbranded wording may use a confirmed geographic area but not the brand or branch name. |
| One product/service | `s-product → s-category → skip s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review` | Nuave presents detected products as a single-select list, with add fallback. The selected target is the sole offering context. Category, customer, service, market, and comparator answers are framed for that target. | Review names exactly one target and omits the general offerings row. Every question concerns that target; unbranded wording cannot leak a branded product name. |

## 6. Explicit skip rules

A skip may depend only on an explicit committed answer. Absence of extracted data, extraction confidence, fixture content, or a URL parameter cannot silently decide the route.

| Screen/control | Show trigger | Skip trigger | Trigger source | Destination | Prior dependent data |
|---|---|---|---|---|---|
| `s-brand-fix` | Customer chooses `Ubah` or `Ubah sumber`. | No correction action. | Explicit customer action. | Normal `s-brand → s-scope`. | Cancel discards staged correction and restores its origin unchanged. |
| `s-branch` | Scope = location. | Scope = whole or product. | Committed `s-scope` answer. | Whole → `s-category`; product → `s-product`. | Location target becomes inactive and is excluded downstream. |
| `s-product` | Scope = product. | Scope = whole or location. | Committed `s-scope` answer. | `s-category`, or `s-branch` for location. | Product target becomes inactive and is excluded downstream. |
| `s-offerings` | Scope = whole or location. | Scope = product. | Committed scope plus exact product target. | `s-customers`. | General offerings become inactive and cannot appear in Review or the handoff. |
| `s-customers` | Always shown. | Never journey-skipped. | — | `s-service`. | Empty is an explicit valid optional answer. No suggestions means add fallback, not a skip. |
| `s-service` | Always shown. | Never skipped. | — | `s-market`. | A prior incompatible answer requires reconfirmation. |
| Full `s-market` | Always shown, including online and nationwide businesses. | Never skipped. | — | `s-competitors`. | The proposal may change, but reach must be confirmed. |
| Area controls within `s-market` | Reach = around one area or selected areas. | Reach = nationwide or international. | Explicit reach answer. | Remain on `s-market`, then continue normally. | Previously selected areas are cleared from the active draft. |
| `s-facts` | Always shown. | Never journey-skipped; the customer may continue empty. | Explicit empty `Lanjut`. | `s-review`. | Empty is a valid optional value. |
| `s-review:identifiers-edit` | `Ubah` on the Review row. | No edit action. | Explicit customer action. | Save/Cancel → `s-review`. | Cancel applies nothing; inactive or removed entries are excluded. |

If no locations or products were detected, the required target state still appears with manual addition and `Lanjut` disabled until exactly one target is valid.

## 7. Canonical shell-draft ownership

This table describes customer-visible meaning, not a storage schema. The approved Gate 0 Data Contract continues to own technical representation and mapping.

An extracted or suggested candidate is not confirmed merely because it is displayed or preselected. `Lanjut` confirms the current answer. User additions become confirmed only after `Lanjut`. An inactive field is absent from Review and both outgoing handoffs.

| Canonical meaning | Owning state | Source and confirmation | Requirement/activity |
|---|---|---|---|
| Confirmed brand identity and primary source | `s-brand`; correction through `s-brand-fix` | Prepared candidate → user-confirmed; correction → user-created, reprocessed, then reconfirmed | Required; always active. |
| Audit scope | `s-scope` | User-selected and committed; no silent default | Required; always active. |
| Selected branch/location | `s-branch` | Detected suggestion → confirmed, or user-created | Required only for location scope; inactive otherwise. |
| Selected product/service | `s-product` | Detected suggestion → confirmed, or user-created | Required only for product scope; inactive otherwise; exactly one. |
| Category | `s-category` | Prepared/suggested → confirmed, or user-created | Required; always active and framed for the active target. |
| Offerings | `s-offerings` | Extracted/suggested → confirmed after pruning; additions → user-created | Required with ≥1 item for whole/location; inactive for product scope. |
| Customer reasons | `s-customers` | Suggested → confirmed after pruning; additions → user-created | Optional; may be explicitly empty. |
| Service mode | `s-service` | Prepared suggestion → confirmed or corrected | Required; always active. |
| Market reach | `s-market` | Prepared suggestion → confirmed or corrected | Required; always active. |
| Selected areas | `s-market` | Prepared/suggested → confirmed; additions → user-created | Required only for area-based reach; inactive and empty otherwise. |
| Comparator mode and names/alternatives | `s-competitors` | Prepared names → confirmed after pruning; additions → user-created; category alternatives → explicit confirmation | Required exclusive mode; always active. |
| Must-be-correct fact | `s-facts` | User-created | Optional; may be explicitly empty. |
| Aliases | `s-review:identifiers-edit` | Prepared suggestions → confirmed after pruning; additions → user-created | Optional; active when confirmed, including confirmed-empty meaning. |
| Supporting sources | `s-review:identifiers-edit`; primary-source correction through `s-brand-fix` | Prepared accepted sources → confirmed after pruning; additions follow the existing source boundary | Optional beyond the required primary source. Inactive or rejected sources are omitted. |
| Generated and edited audit questions | `s-questions` | Received pack → reviewed; wording edits → user-created; final pack → approved | Required by the existing question contract before `Mulai audit`. |

## 8. Navigation, dependency, and Review contract

### 8.1 Navigation

1. **`Lanjut`** validates the working answer, commits it, applies the applicable-route rules, and moves forward. It does not create a separate confirmation choice.
2. **`Kembali`** discards uncommitted changes on the current state and returns to the most recently visited, still-applicable stable state. Committed answers remain.
3. **Browser Back**, where enabled by the approved shell implementation, mirrors `Kembali`. Processing states replace rather than add history entries. Behavior after leaving the first stable shell state remains owned by the upstream boundary.
4. **Correction cancellation** discards every staged correction and returns to the unchanged originating confirmation. When correction began from reading failure with no candidate, it returns to that unchanged failure.
5. **Processing failure** remains visibly failed. Retry repeats the same shell attempt; `Ubah sumber` enters correction. Failure never fabricates success or moves forward automatically.
6. **Review editing** always starts from the committed Review value. Save returns to Review after any required dependent reconfirmation. Cancel, `Kembali`, or browser Back applies nothing and returns to unchanged Review.
7. **Changing scope from Review** removes the old branch from the applicable route. The customer visits only the new target and answers made invalid by that change, then returns to Review.
8. **Question Review Back** returns directly to `s-review`. It never enters the question-preparation wait.
9. **Refresh/resume**, when supported by the approved rebuild plan, restores the last committed stable state and committed shell answers. It does not restore uncommitted edits. This contract does not define the storage mechanism.

### 8.2 Dependency rules

The approved Gate 0 materiality table remains authoritative for established fields. The shell adds these experience rules:

- Inactive branch answers are removed from the active draft, not merely hidden.
- A scope change clears the old location/product target. Product scope deactivates general offerings; whole/location scope requires offerings before Review.
- A target change replaces target-conditioned prepared suggestions. Customer-created answers remain available only when they are still semantically valid; otherwise the owning state must be reconfirmed.
- A category change refreshes category-conditioned offering, customer, and comparator suggestions. Existing customer-created values are preserved when still valid.
- A service-mode change clears or reconfirms market information that has become contradictory.
- Nationwide/international reach immediately deactivates and clears selected areas.
- Named comparators and category-alternative mode are mutually exclusive.
- Reprocessing a name/source replaces stale prepared candidates. Customer-corrected values are preserved when still valid; unanswered or invalid values are re-asked.
- A material intake change after questions exist makes that pack unavailable for `Mulai audit` until the existing question module returns a valid replacement.

### 8.3 Review behavior and every `Ubah` action

Review is a current projection of the committed active shell draft. It never reads fixture fallbacks, stale prepared values, inactive branch data, or hidden defaults. It does not display provenance or confidence.

Optional empty answers are shown only when the absence is useful to verify: customer reasons, must-be-correct fact, aliases, and supporting sources. They use a neutral “not added” meaning, not an error badge.

| Review row | Exact source | `Ubah` destination | Save/cancel behavior |
|---|---|---|---|
| Brand and primary source | Confirmed identity | `s-brand`; its `Ubah` opens `s-brand-fix` | Unchanged confirmation or cancel → Review; successful correction → necessary reconfirmation → Review. |
| Scope | Committed scope | `s-scope` | No-op → Review; material change → new branch/invalid dependents → Review. |
| Target location | Selected location; location scope only | `s-branch` | Valid save → affected dependents → Review; cancel unchanged. |
| Target product/service | Selected target; product scope only | `s-product` | Valid save → affected dependents → Review; cancel unchanged. |
| Category | Confirmed category | `s-category` | Save → affected dependents if required, then Review. |
| Offerings | Confirmed offerings; whole/location only | `s-offerings` | Save requires ≥1; then affected dependents/Review. |
| Customer reasons | Confirmed reasons or explicit empty | `s-customers` | Empty or saved list → Review. |
| Service mode | Confirmed mode | `s-service` | Save → market reconfirmation only if contradictory, then Review. |
| Market | Confirmed reach plus active areas | `s-market` | Save → dependent reconfirmation if required, then Review. |
| Comparators/alternatives | Confirmed exclusive mode | `s-competitors` | Save valid mode → Review. |
| Must-be-correct fact | Confirmed fact or explicit empty | `s-facts` | Save/empty → Review; unsafe content cannot commit. |
| Other names and supporting sources | Confirmed aliases and accepted additional sources, or explicit none | `s-review:identifiers-edit` | Save/empty → Review; primary-source correction follows the brand correction loop; cancel unchanged. |

The Review CTA freezes exactly what is displayed and requests questions. It does not start the audit.

## 9. Validation invariants

1. `s-brand` cannot be reached from a failed reading result, and the intake cannot leave it without confirming a successfully prepared identity.
2. A location audit has exactly one active target location.
3. A product audit has exactly one active target product or service.
4. Every required Pick has exactly one committed value.
5. Whole-brand and location audits have at least one offering. Product audits have no active general-offerings list.
6. Customer reasons and the must-be-correct fact may be empty because they are semantically optional.
7. Service mode and market reach are required on every route.
8. Area-based reach has at least one area. Nationwide/international reach has no active areas.
9. “No direct competitors/category alternatives” cannot coexist with active named comparators. Named-comparator mode cannot be empty.
10. Review, the question input handoff, and the audit-start intake meaning match exactly for the same committed answers.
11. Inactive or skipped-branch answers never appear in Review or either handoff.
12. An answer awaiting required reconfirmation blocks Review approval.
13. `s-questions` accepts only a pack valid under the existing question contract; wording edits cannot change slot identity or classification.
14. An unbranded question contains neither the confirmed brand name nor any confirmed alias after normal case, spacing, and punctuation variation is considered. A branded product name that reveals the brand is also forbidden there.
15. Invalid dependent data cannot survive a parent-answer change.

## 10. Acceptance scenarios

Route shorthand uses the exact state IDs above. The question handoff wait is transient and omitted from Back routes.

| # | Scenario | Expected route | Required Review/result |
|---|---|---|---|
| 1 | Whole-brand happy path | `s-crawl → s-brand → s-scope[whole] → s-category → s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review → s-questions` | Review shows whole-brand meaning, category, ≥1 offering, service, reach/areas, comparator mode, and optional answers; no target row. Questions are requested from exactly this Review. |
| 2 | One-location happy path | `… → s-scope[location] → s-branch → s-category → s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review` | Review names exactly one location and location-specific active answers; no product target. |
| 3 | One-product happy path | `… → s-scope[product] → s-product → s-category → skip s-offerings → s-customers → s-service → s-market → s-competitors → s-facts → s-review` | Review names exactly one product/service, omits general offerings, and uses product-specific context. |
| 4 | Wrong brand, successful correction | `s-crawl → s-brand → s-brand-fix → s-crawl → s-brand → s-scope → applicable route → s-review` | Only the corrected, successfully reprocessed, reconfirmed identity appears. Stale prepared answers do not survive. |
| 5 | Wrong brand, correction failure, retry, cancel | `s-brand → s-brand-fix → s-crawl:error → Coba lagi → s-crawl:error → Ubah sumber → s-brand-fix → Batal` | The originating confirmation remains unchanged. No failed candidate or processing state enters history, and the customer cannot proceed on an unprocessed correction. |
| 6 | Back through a branched route | Location example: `s-market ← s-service ← s-customers ← s-offerings ← s-category ← s-branch ← s-scope ← s-brand` | Committed answers remain. Back never enters `s-crawl`, `s-product`, or an inactive branch. |
| 7 | Edit every Review section | `s-review → row owner → s-review`; only invalid dependents may appear between save and return | Each saved value appears immediately. Every cancel leaves all Review rows unchanged. No edit resumes the remaining linear intake. |
| 8 | Change scope after downstream completion | `s-review → s-scope[new] → required target if any → invalid dependents only → s-review` | Old target and inactive offerings are absent. Only active, reconfirmed meaning remains. Existing questions cannot be started. |
| 9 | Online or nationwide business | `… → s-service[remote/delivery or mixed] → s-market[nationwide/international] → s-competitors …` | Market is still confirmed; area controls/data are absent. Review contains one coherent service mode and reach, with no contradictory local-only statement. |
| 10 | No direct competitors or alternatives | `… → s-competitors[category alternatives] → s-facts → s-review` | Named comparators are empty. Review explicitly states category alternatives; it never restores removed fixture competitors. |
| 11 | Empty extracted locations or products | `s-scope[location/product] → required target state with manual add` | `Lanjut` remains unavailable until exactly one user-created target is valid. Review contains that target and no fixture fallback. |
| 12 | Intake Review to Question Review and Back | `s-review → question handoff → s-questions → Kembali → s-review` | Without an intake change, the approved pack remains available under the existing question contract. A material intake edit requires a replacement pack and another Question Review before `Mulai audit`. |

## 11. Founder decisions

There are no unresolved founder decisions inside this shell contract. The deltas in §2 were approved on 2026-09-04.

Multi-location audits, combined product-plus-location scope, payment remedies, preparation retry ceilings, source-provider support, generation budgets, storage/versioning, audit execution, and reporting remain outside this contract and retain their existing owners.

