# Spec 007 — adversarial review, round 2

> Target: `specs/007-intake-airbnb-revamp/SPEC.md` (Draft, updated 2026-08-30)
> Branch: `feat/intake-big-revamp` · Reviewed 2026-08-30 · Read-only pass
> Method: every line citation in the spec was opened and checked against the
> working tree. Nothing was edited, committed, or run against a paid provider.

## 1 · Verdict

**Not ready.** Not because the spec is wrong — its line citations are unusually
accurate and its central diagnosis (R-03a, R-04) is correct and verified — but
because **§1's inventory is presented as exhaustive and is not.** The spec says
measurement is encoded positionally in "fourteen places" and that "all of them
must derive from the matrix instead," and acceptance criterion 4 promises "no
positional slot number remaining in the codebase."

At least **eight** further encodings exist. One of them is the model
instruction that actually authors the questions. Two of them break the shipped
product outright. Blocker A can be completed exactly as written, R-05 can pass,
and production question generation will silently collapse to the deterministic
fallback pack on every run.

The fix is bounded: extend the R-03 inventory, add one surface to R-07, and
add one assertion to R-05. No architectural change is needed.

---

## 2 · Material findings

### F-1 · The live question-writer instruction is not in the inventory — Blocker A completes while generation silently degrades — **critical**

`src/lib/audit/questions-id-provider.ts:98-111` is
`INDONESIAN_QUESTION_WRITER_INSTRUCTION`, the prompt sent to the model at
`:277` (OpenAI path) and `:298` (Gemini path). It encodes the **old** ten-slot
semantics as prose:

```
101  "Write exactly ten independent questions in the assigned order:",
102  "1–2: customer needs or situations, without the audited business name.",
103  "3–4: requests for relevant options, without the audited business name.",
104  "5: compare relevant unnamed options, without the audited business name.",
105  "6: compare the audited business with the supplied comparison business; …",
106  "7–8: check useful public facts about the audited business.",
107  "9–10: help a customer make a decision or take a practical next step …",
```

R-03a correctly identifies that the **deterministic fallback** slot-6 template
names both parties. It does not notice that **line 105 instructs the model to
do the same thing** — and the fallback pack is only the resilience path. The
instruction is the primary path.

**Failure scenario, with Blocker A completed exactly as specified:** the matrix
exists, the guards derive from it, the fallback pack is rewritten, R-05 passes.
A real business runs. The model receives line 105 and writes a slot-6 question
naming the business and the comparison target. The new guard rejects it
(`identity_leakage` + `competitor_leakage`). `repairIndonesianSuggestion`
(`questions-id.ts:645`) swaps in the deterministic slot-6 template. Slots 7–10
were authored against "public facts" and "practical next step", not
`brand_fit` / `explicit_recommendation` / `direct_comparison` / `fit_misfit`,
so several more get repaired too. Every pack is part-fallback, and
`generatedSuggestionGuardIssues` fires on all of them (see F-6). No test fails.
No error surfaces. The product ships the fallback pack under the name of the
live generator — which is exactly the outcome DECISION_LOG.md:60 was written to
avoid.

R-05 as specified cannot catch this: it tests *packs*, and the deterministic
pack will have been rewritten correctly.

**Required:** add `questions-id-provider.ts:98-111` to R-03; state that the
instruction is rewritten from the matrix in the same change; and add to R-05 an
assertion that the instruction's slot descriptions agree with the matrix, slot
by slot. Also specify that `INDONESIAN_QUESTION_INSTRUCTION_VERSION`
(`questions-id.ts:41`, `"question-writer-v1"`) is bumped — it is pinned in
`fixture-kopi-taman-senja.ts:435`, `questions-id-provider.test.ts:194,436`, and
`fixture-journey/report.test.ts:54`, so a changed instruction under an unchanged
version makes the frozen fixture record untrue.

### F-2 · `docs/AUDIT.md` outranks this spec, contradicts it twice, and is in neither R-07 nor the required context — **critical**

`docs/INDEX.md:9-20` sets the authority order. The domain guide (`AUDIT.md`)
sits at rank 4; "the approved specification for the bounded capability" sits at
rank 5. `AUDIT.md` is the canonical authority for "measurement, evidence,
report, and data-handling method" (`INDEX.md:26`) — which is precisely what §1
of this spec redefines.

It contradicts the spec in two places:

- `AUDIT.md:33-34`, in the **run invariants** ("Every run uses:"): "the final
  customer-approved composition, **which may contain any mix of questions that
  mention or do not mention the business**." This is the direct negation of
  locked decision 6 and R-06.
- `AUDIT.md:79-81`, in the **question quality gate**: "Nuave explains how
  adding or removing the business name changes what the report can measure,
  **without forcing the customer to preserve the suggested five-and-five
  composition**." Under R-06 the product now does force it, so the method's own
  gate fails the new behaviour.

R-07 reconciles five surfaces — `DECISION_LOG.md:60`, `PRODUCT.md:164-165`,
`NOW.md:141-144`, `FAQ.md:61-63`, `V1_PRODUCT_CONTRACT.md:291-300` — and misses
the one that ranks highest. Under the repo's own precedence rules, an
unamended `AUDIT.md` overrides Spec 007.

`AUDIT.md` is also absent from the spec's Required context list, as is
`DESIGN.md` (`INDEX.md:29`, "Canonical current design authority") even though
§9 makes UI stack and component decisions.

**Required:** make R-07 six surfaces. Add `AUDIT.md` and `DESIGN.md` to
required context.

### F-3 · `contracts.ts:837` hard-fails report validation after the rename — R-03b's "silent degradation" framing is wrong here — **high**

R-03b characterises the report-side risk as "no error, no failing test, a
degraded report." That is true of the prompt strings it names. It is **not**
true of `src/lib/audit/contracts.ts:837`, which is executable validation:

```ts
const recommendationOptional = ["validation", "action"].includes(
  observation.category,
);
if (
  observation.run_status === "completed" &&
  (detail.appearance === "not_assessed" ||
    (detail.recommendation === "not_assessed" && !recommendationOptional))
) { errors.push(…) }
```

Under R-01 no category is `validation` or `action`, so `recommendationOptional`
is permanently `false`. Every completed observation that honestly returns
`recommendation: not_assessed` — the correct value for a fact-shaped question,
per the comment at `:830-836` — becomes a **hard validation error**. Under
R-01, `brand_fit` and `fit_misfit` are exactly those questions.

**Failure scenario:** the end-to-end acceptance run reaches report generation
with ten good observations and fails validation at the last step. Blocker E
cannot pass. This call site is not in R-03's inventory.

### F-4 · The shipped question-review screen renders zero questions after the rename, breaking R-34 step 1 — **high**

`src/app/audit/AuditStages.tsx:52-57` declares the five legacy categories, and
`:702-716` renders the question-review screen by grouping over them:

```tsx
{categories.map((category) => (
  …
  {pack.prompts.map((prompt, index) => {
    if (prompt.category !== category) return null;
```

After the R-01 rename no prompt matches any group, so the screen renders **ten
empty sections**. `AuditStages.tsx` is item 6 of the spec's own Required
context and is not in R-03's inventory.

This is a direct contradiction inside the spec: R-34 sequences the work as
"build and verify the complete journey at `/audit/v2` **while the existing
landing funnel stays intact and working**," but R-04 sequences the matrix change
*first* (Blocker A). Blocker A breaks the existing funnel's question-review
screen before `/audit/v2` exists to replace it. Either R-34's "stays intact and
working" is qualified, or Blocker A must carry the remap of every legacy-category
consumer with it.

### F-5 · The delivered report's category labels go blank — **high, customer-facing**

`src/app/audit/ReportView.tsx:49-55` defines `reportCategoryLabels` as a bare
`Record<string, string>` keyed on the five legacy categories, consumed at
`:500` (screen) and `:528` (print) as
`reportCategoryLabels[observation.category]` with no fallback. A missing key
renders nothing.

After the rename, every per-question label in the delivered report and its
printed version is blank. No type error, no failing test. This is the exact
silent degradation R-03b warns about, on a file R-03b does not name.

The same shape recurs in `questions-id-live.ts:30-51` / `:53-59`, where
`categoryLabels()` has a `??` fallback to a generic
`{ role: "Pertanyaan pelanggan", rationale: "Pertanyaan pelanggan." }` — so
after the rename **every question in every live pack** silently carries the
generic role and rationale.

### F-6 · `question-suggestion-guards.ts` carries two more positional encodings, is wired live, and states the policy R-06 reverses — **high**

Not in R-03's inventory. Imported at `questions-id-live.ts:25`, so it runs on
the production path.

- `:92` — `if (unbranded !== 5) issues.push("default_composition_not_five_five");`
  A hard 5/5 assertion on every model-authored pack. Under R-01 it fires on
  every correct 6/4 pack.
- `:102` — `if (index === 5) return;` — a **second, independent copy** of the
  "only slot 6 may name the comparison target" rule, separate from
  `questions-id.ts:599`. This is precisely the hazard R-04 was written to
  prevent, on a file R-04 does not know exists: change the counts without
  touching this line and it stops screening slot 6 *and* starts flagging the
  legitimate slot-9 target mention as `compact_competitor_leakage:9`.
- `:75-78` — the doc comment states, in code, the policy R-06 reverses: "These
  constraints are not applied after customer editing: the final approved pack
  may have any name/no-name balance allowed by the locked-pack contract."
  R-07 reconciles five *documents*; this is a sixth statement of the old policy,
  and it sits next to the mechanism that would have to enforce the new one.

### F-7 · The category rename's real gate — `promptCategories` — is not in the inventory — **medium**

`src/lib/audit/types.ts:3-9` declares `promptCategories` as a `const` tuple,
consumed by `promptSchema.category: z.enum(promptCategories)` at `:138`.
Changing R-01's category names means changing this enum, which is the hard gate
every pack passes through. R-03's `types.ts` row cites only `:164-171` (the
summary and self-check fields).

Downstream, uninventoried:

- `src/lib/fixture-journey/adapter.ts:306-320` (`roleOf`) and `:322-335`
  (`inputsUsedOf`) are exhaustive switches over `AuditPrompt["category"]` with
  Indonesian role text per legacy category. Both need ten new cases written.
- `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts:117,377,381` — the golden
  fixture that drives `fixture-journey`, the first suite in
  `playwright.config.ts:13-14`.

These fail loudly (type errors), which is better than F-3/F-5 — but they are
work the spec does not budget.

### F-8 · The "enumerated so they are not discovered as red CI" guarantee is ~17 files short — **medium**

R-03's last row names three test files. Files that reference the legacy
categories, the 5/5 self-check fields, or the pinned instruction:

```
contracts.test.ts · groq.test.ts · locked-question-pack.test.ts
question-suggestion-wave2.test.ts · questions-id-provider-regression.test.ts
questions-id-provider.test.ts · questions-id.test.ts · questions.test.ts
report-pipeline.test.ts · report-prompt-contract.test.ts · retry.test.ts
run-orchestrator.test.ts · stream.test.ts · variance-route-proof.test.ts
variance.test.ts · wave2-route-contract.test.ts
fixture-journey/adapter.test.ts · fixture-journey/report.test.ts
tests/e2e/live-audit-variance.spec.ts · tests/e2e/wave1-workflow-lifecycle.spec.ts
```

Twenty files, three enumerated. Several are incidental fixtures
(`retry.test.ts:19`, `stream.test.ts:19`, `groq.test.ts:78` merely construct a
prompt with `category: "need_discovery"`), but all become compile errors once
the enum changes. The stated guarantee — that they are enumerated so they are
not discovered as red CI — does not hold.

### F-9 · R-26's pre-payment example card contradicts R-01's own contract — **medium**

R-26 requires an example report card on the preview screen and settles its
result label. `src/components/ExampleReportPreview.tsx:26` and
`src/components/ReportPagePreview.tsx:22` both hardcode:

> `Tanpa menyebut bisnis Anda: 1/5 · Menyebut bisnis Anda: 3/5`

Under R-01 those denominators are `/6` and `/4`. R-26 corrects the retired
"Skor Visibilitas AI" but says nothing about the denominators, and R-07's
reconciliation list does not include these components.
`docs/V1_PRODUCT_CONTRACT.md:311-320` already records this as open conflict #3
(along with `adapter.ts` splitting composition at question 6) — the spec cites
`V1_PRODUCT_CONTRACT.md:291-300`, which is conflict #1 only, and leaves #2 and
#3 unaddressed while claiming to make V1 runnable.

Conflict #2 (`V1_PRODUCT_CONTRACT.md:302-309`) is F-1 restated from the
document side: it names `docs/journey/04-questions.md:453-462` as assigning
slots 7–8 to factual lookup. That file is the prose source of the instruction in
F-1 and must be amended with it.

### F-10 · R-15's mechanism claim is factually wrong, and the change it requires is unnamed — **medium**

R-15 says the landing "writes `factsExtracted: true` … which `AuditEntryShell.tsx:13`
uses to hide the source screen and `deriveAuditStep` uses to route to step 1.
Both must route that state to the preview instead."

Two different mechanisms are conflated. `AuditEntryShell` never reads
`factsExtracted`. It reads a **query parameter**:

- `src/app/audit/page.tsx:17` — `landingExtracted={params.entry === "landing-extracted"}`
- `src/app/audit/AuditEntryShell.tsx:41` — `if (!landingExtracted) return <AuditWorkflow />;`
- set by `src/components/LandingAuditHero.tsx:155` — `router.push("/audit?entry=landing-extracted")`

Only `deriveAuditStep` (`stream.ts:174`) reads `factsExtracted`. R-15 names
`LandingAuditHero.tsx:78` and `:96` — both citations exact — but not `:155`,
which is the line that actually drives the entry shell. An implementer
following R-15 literally will search `AuditEntryShell` for a `factsExtracted`
read, not find one, and may leave the query-param path in place.

R-15 also does not say whether the GET budget bootstrap at `:78` survives the
rewire. R-13's endpoint "costs nothing", so a budget bootstrap before it has no
purpose — but the spec does not say to remove it.

### F-11 · R-12's rate limiting has no substrate, so Blocker D is unsatisfiable as written — **medium**

R-12 requires "proportional rate and budget protection on the endpoint," and
R-16 extends it to the extraction route. Blocker D is "done when R-12 holds."

There is no rate-limiting primitive anywhere in `src/` (the only `rateLimit`
matches are provider-response classifiers in `groq.ts:275` and
`openrouter.ts:303`). R-11 states the deployment target is Cloudflare Workers,
where per-isolate in-memory counters do not survive. Durable rate limiting
needs KV, a Durable Object, or equivalent — and R-29 says "persistence
architecture is not what this iteration tests," with durable persistence on the
Deferred list.

The spec requires a capability whose only implementations it defers. Either
name the mechanism, or scope Blocker D to the SSRF controls and state that rate
limiting is deferred with the risk accepted.

R-12's premise is otherwise verified: `src/app/api/audit/extract/route.ts`
contains zero `fetch` calls, so the SSRF surface genuinely is new.

### F-12 · Three fields are ownerless in practice, contradicting R-19's own principle — **medium**

R-19 states "No field may be ownerless" and acceptance criterion 3 requires
"every retained `BusinessBrief` field has a defined owner." R-25 enumerates the
screens. Cross-referencing:

| Field | R-19 says | Screen in R-25 |
|---|---|---|
| `brand_type` | Extracted; editable · **Required Yes** | none |
| `target_customer` | Extracted; editable · **Required Yes** | none (`customer reasons` reads as needs/criteria) |
| `usp` | Extracted; editable | none |

"Editable" without a named screen is not an owner. Two implementers will place
`brand_type` differently — brand confirm, category, or review — and one may
place a *required* field on no screen at all, which strands R-22's "route to
the screen owning the failing field."

### F-13 · Acceptance criterion 4 cannot be satisfied as written — **low**

"no positional slot number remaining in the codebase" — the matrix itself
carries `order: 1…10`; R-01 designates slot 9 by position; prompt ids are
`NVA-ID-01…10` (`questions-id-live.ts:353`) and
`${…}-Q${order}` (`adapter.ts:303`). The criterion is unfalsifiable as phrased
and a reviewer cannot sign it off. Intended meaning is presumably "no positional
slot logic outside the canonical matrix" — say that.

### F-14 · Governance overlaps the spec does not resolve — **low**

- `docs/INDEX.md:115` lists spec 004 as **"Approved; implementing"**, governing
  "one-field website/Instagram hero intake … replacing the audit tool's step-0
  form." Spec 007's R-25 replaces that screen and R-15 rewires its entry point.
  Two approved specs would own the same surface at authority rank 5. Spec 007
  never states whether it supersedes, absorbs, or defers to 004.
- `docs/NOW.md:91` — "The current bounded work is Spec 003 only." R-36 says
  governance "does not block implementation," but NOW.md is the current-objective
  document and this spec does not address displacing it.
- R-36 says to "commit or fold in the untracked prototype." `intake-prototype.html`
  and `prepay-handoff.md` are **already tracked**; the untracked artifacts are
  the four `docs/content/` files and `docs/reviews/prompts/spec-007-plan-review.md`.

### F-15 · Citation errors — **low, but they will send implementers to the wrong line**

| Spec says | Actual |
|---|---|
| `types.ts:76-80` — `verified_competitor` | `types.ts:74-78` |
| `types.ts:81` — `similar_businesses` | `types.ts:79` |
| `questions-id-live.ts:351` — "`categoryLabels` keyed on the five legacy categories" | `:351` is a call site; the keyed record is `CATEGORY_LABELS` at `:30-51`, the accessor at `:53` |
| `PRODUCT.md:109` — "Google Maps listing" | `PRODUCT.md:110` |
| `PRODUCT.md:64` — the Rp99.000 total | `:62`; `:64` is the 30-day validity |
| R-03: "encoded positionally in **fourteen** places" | the table has **fifteen** rows |
| `types.ts:164-171` — rename `unbranded_prompts`, `branded_prompts`, `five_unbranded` | the range also spans `two_per_category` (`:170`); `five_branded` (`:172`) is outside it and is named nowhere, though R-03 calls it out on the producer side (`questions-id-live.ts:370`) |

---

## 3 · What the spec gets right — do not undo these

Verified against the tree:

1. **R-03a's diagnosis is exact.** `questions-id.ts:475-477` is
   `Bandingkan ${brand} dengan ${competitor}…` at slot 6, and `:485-487` is
   `Bagaimana cara ${action} dengan ${brand}?` at slot 9. Both quoted correctly,
   and the "highest-risk line" judgment is right — `repairIndonesianSuggestion`
   (`:645`) does write that template as the repair.
2. **The structural-identity claim holds.** `PROMPT_MATRIX` (`contracts.ts:153`)
   and `INDONESIAN_SLOT_MATRIX` (`questions-id.ts:371`) both yield five
   categories × two, unbranded 1–5, branded 6–10, designated comparison at 6.
   They are duplicated, not conflicting — exactly as stated. Folding them first
   is the right move.
3. **R-04's ordering argument is correct.** Changing counts before deriving the
   guards would leave `slot <= 5` (`:586`) silently unguarding slot 6 with all
   tests green.
4. **R-35's Playwright catch is real.** `playwright.config.ts:13-14` selects only
   `fixture-journey|landing-audit-handoff|live-audit-variance|offline-network`;
   `wave1-workflow-lifecycle` is genuinely uncovered.
5. **R-19's three schema changes are correctly identified.**
   `types.ts:72,73` (`verified_customer_needs`, `verified_decision_criteria`)
   carry `.max(12)` with no `.min(1)`, and `:75` (`verified_competitor.name`)
   has no minimum, while `official_sources` (`:70`) and `verified_offerings`
   (`:71`) already do.
6. **The payment-boundary citations are exact** — `LandingAuditHero.tsx:78`/`:96`,
   `AuditWorkflow.tsx:209`/`:484`/`:694`, `stream.ts:174`,
   `workflow-storage.ts:25`/`:38`, `contracts.ts:336-344`/`:727`/`:765-774`/`:775-778`,
   `questions-id.ts:352`/`:371`/`:378`/`:586`/`:599`/`:645`,
   `questions-id-live.ts:368-370`, `NOW.md:141-144`, `DECISION_LOG.md:60`/`:67`,
   `FAQ.md:61-63`, `PRODUCT.md:164-165`/`:277`, `VOICE.md:42`,
   `V1_PRODUCT_CONTRACT.md:291-300`. All confirmed.
7. **R-16 and acceptance item 1 are honest.** Naming the three achievable proofs
   and stating plainly that each is client-spoofable is better engineering than
   claiming a boundary that does not exist.
8. **R-15's "the defect is narrower than…" correction is right.** A fresh unpaid
   visitor does land on step 0 (`deriveAuditStep` returns 0 when
   `factsExtracted` is false), and the mount-time GET at `AuditWorkflow.tsx:484`
   is indeed not personalized extraction.
9. **R-30's copy fix is correctly settled.** `Cek bisnis saya di AI` is settled
   at `VOICE.md:61` and `:173`.

---

## 4 · Smallest set of changes to reach "approve with changes"

1. **Extend R-03's inventory** with, at minimum:
   `questions-id-provider.ts:98-111` (the instruction) · `docs/journey/04-questions.md:453-462`
   (its prose source) · `question-suggestion-guards.ts:92,102` ·
   `types.ts:3-9` (`promptCategories`) · `contracts.ts:837` ·
   `AuditStages.tsx:52-57,702` · `ReportView.tsx:49-55,500,528` ·
   `questions-id-live.ts:30-53` · `fixture-journey/adapter.ts:306-335` ·
   `fixtures/fixture-kopi-taman-senja.ts:117,377,381` ·
   `ExampleReportPreview.tsx:26` · `ReportPagePreview.tsx:22`.
   Replace the "fourteen places" count with the actual figure, or drop the count.
2. **Add one assertion to R-05:** the question-writer instruction's slot
   descriptions agree with the matrix, slot by slot. Without it, F-1 ships green.
3. **Specify the `INDONESIAN_QUESTION_INSTRUCTION_VERSION` bump** and the fixture
   records pinned to it.
4. **Make R-07 six surfaces** by adding `docs/AUDIT.md:33-34` and `:79-81`, and
   add `AUDIT.md` and `DESIGN.md` to Required context.
5. **Correct R-03b's characterisation** — the report side fails both silently
   (`ReportView`, `categoryLabels`) *and* loudly (`contracts.ts:837`) — and fold
   `V1_PRODUCT_CONTRACT.md` conflicts #2 and #3 into R-07 or state explicitly
   that they remain open.
6. **Reconcile R-04 with R-34.** Say what "the existing funnel stays intact and
   working" means once Blocker A lands, given F-4. The likely answer is that
   Blocker A carries the legacy-category consumer remap with it.
7. **Fix R-15's mechanism sentence** and name `LandingAuditHero.tsx:155` and the
   `?entry=landing-extracted` parameter. State whether the `:78` bootstrap stays.
8. **Resolve R-12's rate limiting** — name a mechanism, or scope Blocker D to the
   SSRF controls and record the accepted risk.
9. **Assign screens to `brand_type`, `target_customer`, and `usp`** in R-25/R-19.
10. **Reword acceptance criterion 4** to "no positional slot logic outside the
    canonical matrix."
11. **State the relationship to spec 004** and to `NOW.md:91`.
12. **Correct the citations in F-15**, and expand R-03's test enumeration to the
    twenty files in F-8.

---

## 5 · Not findings — checked and cleared

- `parseSourceInput` (`source-input.ts`) is 150 lines and is genuinely the single
  entry-point authority R-08 claims.
- R-06's "denominators derive from the actual final question text" is true of the
  live Indonesian path (`questions-id-live.ts:347` uses
  `classificationSummary`). The English deterministic path hardcodes 5/5 at
  `contracts.ts:335-337`, but R-03 already schedules that row for derivation.
- `NOW.md:76`'s "protected Spec 003 method contract" concerns **language**
  (Indonesian questions, observations, report), not composition. No conflict.
- R-30's `bisnis saya` usage does not violate `VOICE.md:41`'s
  "prefer *brand Anda*, avoid *bisnis Anda*" rule — that rule targets the
  second-person prose form, and the CTA is separately settled at `VOICE.md:61`.
