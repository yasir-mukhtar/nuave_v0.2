# Intake experience recovery plan — Spec 007 R-27 conformance

> Status: **Revision 2, awaiting founder approval**
> Created: 2026-09-02 · Revised: 2026-09-02 after implementation review
> Companion to [`SPEC.md`](./SPEC.md) (Approved) and
> [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md).
> Purpose: recover the approved Airbnb-style intake experience by finishing the
> three R-27 components package E1 did not build. Where this file disagrees
> with `SPEC.md`, **the spec wins** and this file is wrong.
>
> Revision 2 corrects seven findings from review of revision 1. The change
> table is at the end of this document.


## Context

Spec 007 shipped a runnable end-to-end journey. Its measurement core, workflow
authority, safe source handling, and payment sequencing are correct and are not
in question. But after payment the customer lands in something that looks and
feels like the old intake form rather than the approved prototype.

The cause is precise. Spec 007's package **E1** owned every experience
requirement (R-24…R-28) in one slice. Its diff (`0294a35`) built
`AuditPrePaymentJourney.tsx` fresh (+719 lines) and satisfied the entire
post-payment intake with **+242 lines inside the existing `AuditStages.tsx`
form**. `AuditV2Journey.tsx:47` is literal about the result:

```tsx
if (entry === "post-payment" || paymentCompleted) return <AuditWorkflow />;
```

Concretely, **three of the seven components R-27 required were never built** —
`SPEC.md:944` lists selection card, selection row, chip, bottom navigation with
chapter progress, floating pay bar, scan steps, example report card. The last
four exist. Selection card, selection row, and chip appear nowhere in `src/`.
Without them the screens had nowhere to land except `TextInput`, `LongInput`,
and `LineListInput`.

**This is Spec 007 conformance work, not a redesign.** No settled product
decision is reopened.

---

## 1. Diagnosis

### 1.1 What is already right

- **The screen sequence is exact.** `INTAKE_SCREENS`
  (`workflow-authority.ts:15`) and `intakeScreenSequence()` (`:209`) reproduce
  the prototype's flow, conditionals included, and are tested.
- **Chapter progress and the bottom Kembali/Lanjut bar shipped**
  (`AuditStages.tsx:60`, `:122`).
- **The token layer is already the prototype, variable for variable.**
  `src/styles/tokens.css:1-50` matches the prototype's `:root` exactly —
  `--action:#18181b`, `--action-soft:#f4f4f5`, `--border-default:#e5e7eb`,
  spacing 4/8/16/24/32/48/64, `cubic-bezier(0.16,1,0.3,1)`,
  `0 1px 2px rgba(0,0,0,0.05)`. Purple is retired (`--purple: var(--action)`).

**No token work is required.** The gap is composition and interaction only.

### 1.2 The differences that produce the old feeling

**(a) Every screen asks with a form field instead of offering a choice.**

| Screen | Prototype | Shipped (`AuditStages.tsx`) |
|---|---|---|
| brand-confirm | Brand card + two cards: *Ya, benar* / *Bukan, ganti brand* | `TextInput#brand-name` in a two-column `FieldGroup` (`:877-940`) |
| scope | Three cards, title + description | Bare `<fieldset>` + `<input type="radio">` + `TextInput#brand-type` (`:1007-1063`) |
| category | Prefilled card + add-line | Bare radio pair labelled "(saran dari ekstraksi)" + `TextInput` (`:1123-1168`) |
| offerings | Removable chips, pre-filled | `LineListInput` — a **newline-delimited textarea** (`:1299`) |
| customer-reasons | Chip multi-select | Three fields in `styles.gridTwo` (`:1225-1284`) |
| market | Four cards + a reveal | One free-text `TextInput` (`:1187`) |
| facts | One optional textarea | Two fields, one labelled **"Differentiator (opsional)"** (`:1369`) |
| review | Rows each with an **Ubah** link | A `<dl>` with no edit affordance (`:1434-1467`) |

**(b) Three competing progress indicators** on every intake screen —
`AuditWorkflow`'s topbar stepper (`:1433-1462`), `StageIntro`'s "Langkah 2 dari
4" (`AuditStages.tsx:853`), and `IntakeChapterProgress`. Plus **two Kembali
buttons** (`:843` and the bottom bar).

**(c) The frame is a desktop admin workspace.** `.workspace` is
`min(64rem,…)` = 1024px (`audit.module.css:160`); `.stageSection` is a
`minmax(10rem,0.34fr) minmax(0,1fr)` label/content grid (`:242`); `.topbar` is
a sticky 4rem app bar spanning 72rem (`:17`). The prototype is a 560px column
with a 16px wordmark row.

**(d) Provenance and internal schema leak into the interface** — prohibited by
`V1_PRODUCT_CONTRACT.md:126` and `:88`. Shipped anyway: `"(saran dari
ekstraksi)"`, `"Draft dari ekstraksi"`, `"Terima saran Nuave"`, `"Periksa
catatan ekstraksi"`; labels `Konteks pasar`, `Differentiator`, `Penawaran
utama`, `Pertimbangan keputusan`; and screen titles that instruct rather than
ask — `"Pilih kategori brand."` where the prototype asks *"Bisnis Anda paling
tepat disebut apa?"*

**(e) Two shipped defects.**
1. **The review readback renders unstyled.** `AuditStages.tsx:1434` uses
   `styles.factList/factRow/factLabel/factValue`; those classes exist only in
   `fixture.module.css:247`, not `audit.module.css`. All resolve to `undefined`.
2. **The approved intake theme is dead code.** `tweakcn-intake.css` (10.5 KB,
   imported by `audit/layout.tsx:2`) scopes every rule to
   `:has(#identity-scope-heading)` — an id present in no `.tsx`.

**(f) The question review** renders ten `StageSection`s, each with an
always-open `<Textarea rows={3}>`, an English `Badge` ("Branded"/"Unbranded"),
and `<code>{prompt.prompt_id}</code>` shown to the customer
(`AuditStages.tsx:1511-1632`).

---

## 2. Experience north star

> **Nuave shows what it believes. The owner fixes what matters. Nuave then
> creates the audit.** — `V1_PRODUCT_CONTRACT.md:33-42`

Five tests every screen must pass:

1. **One question, asked in the customer's words**, as an `h1`. A heading that
   names a backend field is wrong.
2. **The answer is already there.** The default action is confirm or remove.
   Typing is the escape hatch, in a secondary add-line.
3. **Tapping, not filling.** Cards for single choice, rows for choosing from a
   detected list, chips for multi-select and removal.
4. **No internal metadata.** No provenance, confidence, extraction, or
   source-timestamp language, and no schema names.
   **The customer's own official public source stays visible** on brand
   confirm — R-12 requires it. The prohibition is on *how Nuave knows*, never
   on *what Nuave read*.
5. **One column, one progress bar, one Back, 560px, thumb-reachable.**

---

## 3. What stays — the fence

**Engine and contracts — unchanged.** All of `src/lib/audit/` except the two
named moves in §4: measurement matrix, question generation, extraction, run
orchestration, report, variance, safe source handling, rate limiting,
`payment-boundary.ts`, all six `/api/audit/*` routes, and **`types.ts` — the
`BusinessBrief` schema does not change.**

**The intake state machine — reused as-is.** `workflow-authority.ts`:
`INTAKE_SCREENS`, `intakeScreenSequence`, `nextIntakeScreen`,
`previousIntakeScreen`, `validateBriefForReview`, `applyBriefFieldChange`,
`applyScopeSelection`, `acceptComparisonTarget`, `confirmIdentity`,
`mergeExtractionIntoBrief`, `FIELD_OWNERSHIP`.

**`AuditWorkflow.tsx` remains the workflow controller.** See §6.0 — this is the
correction that shapes the whole sequence.

**Untouched surfaces:** the pre-payment journey, `AuditRunStep`, `ReportView`,
the fixture journey, the landing.

**Settled decisions that override the prototype — do not "restore" it here:**

| Prototype | Authority wins |
|---|---|
| Market screen conditional | **Never skipped**; `market_context` required on every path (R-12, R-14) |
| A list of competitors | **One** comparison target, proposed then accepted/edited/replaced (R-13) |
| Customer reasons `Opsional` | `verified_customer_needs`, `verified_decision_criteria` **required, min 1** (R-12) |
| `Lanjut` disabled until answered | **Next stays enabled**; press surfaces an error and moves focus (R-17) |
| "Skor Visibilitas AI" | Retired → **Bisnis Anda muncul di X dari 10 pertanyaan** (R-25) |
| Brand-name-only entry | A public source is mandatory (R-11) |

Requiredness and "must not block" are reconciled by R-16, not a rule change:
chips arrive **pre-selected from the draft**, so the minimum is already met when
the screen opens. §6.2 handles the path where the draft is empty.

---

## 4. What changes

| Kind | Item |
|---|---|
| **New** | R-27 primitives: selection card, selection row, chip (+ add-line, reveal) |
| **New** | Intake shell: 560px column, one bottom nav, one progress bar |
| **New** | A per-screen surface flag inside `AuditWorkflow` so new and old screens coexist (§6.0) |
| **New** | A per-question save transaction for R-10 (§6.5) |
| **Rebuilt** | The twelve intake screens and the question review, as presentation only |
| **Reshaped** | Headings become the customer's question; internal metadata removed |
| **Moved** | `INTAKE_CHAPTER_LABELS` + `intakeChapterFor` (`AuditStages.tsx:46-58`) → `workflow-authority.ts` |
| **Deleted, after Gate 2** | `B1BriefStep`, `QuestionsStep`, `StageIntro`, `TextInput`/`LongInput`/`LineListInput`/`LineListEditor`, `B1ComparisonTarget`, the topbar stepper on intake steps, `tweakcn-intake.css`, orphaned `SimilarBusinessesEditor.tsx`, the surface flag |
| **Rewritten** | The e2e specs that pin form-field labels (§8) |

---

## 5. Highest-leverage recovery work

1. **Build the three missing primitives (R-27).** Nothing else is possible
   without them.
2. **Replace the frame** — one progress indicator, one Back, 560px column.
   Changes the first impression before any screen is rebuilt.
3. **Convert the screens where a form field replaced a choice** — scope,
   offerings, category, market, customer-reasons, brand-confirm.
4. **Fix the review readback** — style it and give every row an **Ubah** link.
5. **Strip internal metadata**, and the settled CTA
   (`"Konfirmasi fakta dan buat 10 pertanyaan"` → **"Buat pertanyaan audit"**).
6. **Rebuild the question review** with the R-10 save transaction (§6.5).

**Not leverage:** pixel parity (R-27 excludes it), radius alignment
(6/8/12/16 vs 6/8/10/14), the focus-ring formula (R-27 defers focus migration).

---

## 6. Implementation sequence

### 6.0 Architecture — `AuditWorkflow` stays the controller

**This corrects revision 1's central error.** `AuditWorkflow.tsx` owns session
restore and persistence (`:435-492`, `:530-572`), the payment-satisfied marker
(`:279`), budget bootstrap (`:494-528`), extraction (`:870-988`), prompt
generation (`:990-1022`), question editing (`:1024-1045`), audit execution
(`:1172-1307`), report creation (`:1047-1124`), variance (`:301-429`), and the
run/report branches. `SourceHero.tsx:59-95` consumes the paid source handoff and
calls back into `extractWebsite`. Repointing the routes at a presentation-only
journey would either break the audit or duplicate 1,548 lines.

So:

- `AuditV2Journey.tsx` and `AuditEntryShell.tsx` are **not modified.**
- New screens are **presentation only**. They receive `brief`, `extraction`,
  `workflowMeta`, `fieldErrors`, `busy` and the existing callbacks
  (`updateBrief`, `onContinue`, `onBack`, `onScopeKindChange`,
  `onConfirmIdentity`, `onAcceptComparison`, `onGenerate`, `onEdit`, `onRun`)
  as props — the same props `B1BriefStep` and `QuestionsStep` take today.
- `AuditWorkflow`'s step-1 and step-2 branches (`:1484-1523`) each choose
  between the old and new renderer. Nothing else in the controller changes.

**The seam is a per-screen surface flag.**

```ts
// src/app/audit/intakeSurface.ts
export const NEXT_INTAKE_SCREENS: ReadonlySet<IntakeScreen | "questions"> =
  new Set([...]);   // grows one slice at a time; empty today
```

`B1BriefStep` and `QuestionsStep` consult it and render the new screen when the
current screen is in the set, otherwise the existing markup. This is what makes
a **thin vertical slice** possible: a partially converted intake still runs end
to end, so Gate 1 can show every interaction pattern without converting every
screen first. The route `/audit/v2/intake-preview` (noindex, not linked) renders
`AuditWorkflow` with the set forced full, seeded from `sessionStorage` the way
the e2e specs already do.

At S6 the set becomes every screen. At S7, after Gate 2, the flag and the old
renderers are deleted.

### New files

```
src/components/product/selection/
  SelectionCard.tsx   SelectionRow.tsx   Chip.tsx   AddLine.tsx   Reveal.tsx
  selection.module.css        # tokens.css only; no raw font-size

src/app/audit/intake/
  IntakeShell.tsx             # 560px column, scroll body, one bottom nav
  intake.module.css
  screens/*.tsx               # one per IntakeScreen + QuestionReviewScreen
```

### Build rules for every worker

- Build on `@base-ui/react` (`radio`, `radio-group`, `toggle`, `toggle-group`,
  `checkbox-group`, `collapsible`). **Do not run `npx shadcn add` against the
  default registry** (R-27) — `components.json` is pinned to `base-nova` +
  `@beui`. Tabler icons only.
- CSS Modules over `src/styles/tokens.css`. **No raw `font-size`** —
  `scripts/check-typography.mjs` fails the build. Use `--type-*` roles.
- Keyboard-operable, visible focus, correct ARIA, ≥44px targets.
- Bahasa Indonesia per `VOICE.md`: `Anda`, `brand Anda`, `pesaing`, `model AI`,
  **no em or en dashes in prose**. The five verbatim labels never change.
- `intake-prototype.html` is the reference for composition and copy; where §3
  says the spec overrides it, the spec wins.
- **Add no external request** — `offline-network.spec.ts` guards `/`, `/audit`,
  `/audit/fixture`. Geist is already local; do not copy the prototype's Google
  Fonts link.

### 6.1 Screens whose data does not match the prototype

Verified against the extraction contract. Two screens cannot be built as
revision 1 described them.

**Scope — `brand_type` needs a control.** R-12 makes `brand_type` required and
owned by the Scope screen, and `extractionDraftOrManualFallback`
(`openai.ts:194-216`) returns `brand_type: ""` — along with `entity_scope: ""`
and `target_customer: ""` — on the manual-fallback path. Three selection cards
alone would strand that customer with a validation error and no control.

Rule, applied to **every** AI-owned field, straight from R-16 ("Where
extraction returned nothing for an AI-owned field, the screen says so plainly
and asks. It never renders an unexplained blank."):

> When the draft has a value, it is confirmed silently by continuing — no field
> is shown. When the draft is empty, the screen opens a `Reveal` that says
> plainly what Nuave could not read and asks for it in customer language.

So Scope shows three cards writing `entity_scope` in R-12's canonical form
(`Seluruh brand <brand_name>` / `Cabang: …` / `Produk: …`), and a `Reveal`
for `brand_type` only when it is empty. The happy path stays two taps.

**Category — one card, not three.** `extractionDraftSchema.category` is a
single `z.string()` (`types.ts:138`); there is no alternatives array. Adding one
would change the extraction contract, which §3 fences off. So: one prefilled
selection card showing the drafted category, plus **Ganti** revealing an
add-line. No "(saran dari ekstraksi)".

### 6.2 Customer reasons — the mapping, decided by the schema

Revision 1 proposed one undifferentiated chip set for three fields. That is
unsafe: `minimizeIndonesianBrief` (`questions-id.ts:132-150`) projects them
separately as `customer_context`, `customer_needs`, and
`decision_considerations`, so mirroring corrupts the question inputs. The schema
settles the shape — `target_customer` is a **string** (`requiredText.max(500)`),
the other two are **arrays** (`min(1).max(12)`) (`types.ts:96-100`).

One screen, heading *"Kenapa pelanggan biasanya mencari yang seperti ini?"*,
three visibly distinct groups:

| Group | Field | Control | Empty-draft behaviour |
|---|---|---|---|
| Who looks | `target_customer` | One prefilled statement + **Ubah** → inline input | `Reveal` asks plainly (R-16) |
| What they need | `verified_customer_needs` | Chip group, drafted chips pre-selected | `Reveal` + add-line |
| What they weigh | `verified_decision_criteria` | Chip group, drafted chips pre-selected | `Reveal` + add-line |

Exact mutations — no inference, no cross-field writes:

- **Select / deselect a chip** → toggles membership of *that group's array only*.
- **Add via that group's add-line** → appends to *that group's array only*.
- **Remove the last chip in a group** → the array is empty; Next stays enabled
  (R-17) and press routes the error to this screen with that group focused.
- **Editing the statement** → writes `target_customer` only.

If this reads heavy at Gate 1, the fallback is to move `target_customer` to its
own screen — not to merge the groups.

**Required test:** an e2e assertion on the `BusinessBrief` submitted to
`/api/audit/prompts` after a scripted select/remove/add on this screen,
asserting all three fields carry exactly the expected values.

### 6.3 Slices

**S1 — Primitives.** The five components, plus a unit test each covering
keyboard operation, ARIA selected/pressed state, and disabled behaviour.
Rendered nowhere. *Pure addition.*

**S2 — Frame + vertical slice (→ Gate 1).** `IntakeShell`, the surface flag
(§6.0), the chapter-label move, `/audit/v2/intake-preview`, and **one screen
per defining pattern, wired to real data**:

| Pattern | Screen |
|---|---|
| Selection card + reveal | Scope (with the `brand_type` reveal, §6.1) |
| Selection row | Branch |
| Chip | Offerings (pre-filled removable chips + add-line) |
| Readback with **Ubah** | Review, styled, rows routing to owning screens |
| Read-first question editing | Question review, one group, full save transaction (§6.5) |

Unconverted screens fall through to the existing renderer, so the journey still
runs end to end. Implementation **stops** at Gate 1.

**S3 — Chapter 1 remainder.** brand-confirm (brand card + two cards; R-18 copy
when unverified; official source visible per R-12), source-correction, product,
category (§6.1).

**S4 — Chapters 2–3.** customer-reasons (§6.2), market (four cards + city
reveal; always shown per R-14, wording varies by scope), comparison-target (the
R-13 proposal as one card with accept / replace, plus the `alternatif lain di
kategori <kategori>` fallback — no entity picker).

**S5 — Chapter 4 and both question groups.** facts (one optional textarea with
an `Opsional` badge; `usp` as a prefilled editable line only when drafted).
Review complete, primary action **"Buat pertanyaan audit"**. Question review
complete, primary action **"Jalankan audit"**.

**S6 — Flip the default (→ Gate 2).** The surface set becomes every screen;
rewrite the e2e specs (§8); `npm run verify`. **The old renderers stay in the
tree.**

**S7 — Cleanup, only after Gate 2 passes.** Delete the old renderers, the
surface flag, `/audit/v2/intake-preview`, `tweakcn-intake.css`, and
`SimilarBusinessesEditor.tsx`; `npm run verify`.

### 6.4 Readback rows

`ReviewScreen` renders one row per fact: uppercase label, value, and an **Ubah**
button that sets `workflowMeta.intakeScreen` to the owning screen from
`FIELD_OWNERSHIP`. Empty states are plain Indonesian, never a blank.
`brand_name_variants` is editable inline.

### 6.5 The question-edit save transaction

R-10 (`SPEC.md:322-387`) requires **four hard-block classes on save**, not one:
forbidden identities absent; required identities present (the comparison target
on slot 9); slot 9's comparison relation; and non-empty / ≤700 characters /
question-shaped. Plus a **non-blocking** purpose-drift warning, with the slot's
purpose and policies displayed throughout.

Today `editPrompt` (`AuditWorkflow.tsx:1024-1045`) performs **no validation at
all** — it writes the text and clears downstream state. A customer only learns
their edit is invalid when they press **Jalankan audit**.

**Every check already exists and is reused, not rewritten.**
`validateCanonicalIndonesianQuestionPack` (`questions-id.ts:635`) emits
`empty`, `length`, `question_form`, `identity_leakage`, `competitor_leakage`,
`identity_requirement`, and `comparison_relation` issues with Indonesian
messages, each carrying a `slot`. It calls `hasIndonesianComparisonRelation`
(`:361`), which reads `comparisonRelationMarkers` off the matrix.

The save transaction:

1. **Ubah** replaces the read-only question with a textarea holding a **local
   draft**. The rest of the pack is untouched. Slot label and purpose stay
   visible.
2. **Batal** discards the draft and restores the read-only card.
3. **Simpan** builds a candidate pack (current prompts, edited question
   substituted), runs
   `validateCanonicalIndonesianQuestionPack(candidate, minimizeIndonesianBrief(brief))`,
   and filters issues to the edited slot.
4. Any issue in a hard-block class → **the save is rejected**, the message
   renders in `role="alert"` beneath the textarea, focus stays in the textarea,
   and `onEdit` is never called. Nothing downstream is cleared.
5. No blocking issue → `onEdit(index, question)` (the existing callback,
   unchanged), the card returns to read-only, and any purpose-drift warning
   renders non-blocking beside it. The customer may proceed (R-10, settled
   2026-08-30).

**Required tests:** one per hard-block class — forbidden identity on an unnamed
slot, missing required identity on a named slot, slot 9 without a comparison
relation, and over-length / non-question text — each asserting the pack is
unchanged after a rejected save; plus one asserting the drift warning does not
block.

---

## 7. Experience review gates

Two founder gates. `EXECUTION_PLAN.md:93-97` is explicit that CI does not cover
"human judgment on customer-facing copy and layout".

### Gate 1 — after S2. Every defining pattern, before the rest is built

Walk `/audit/v2/intake-preview` at phone width. Revision 1 showed only cards
here; this gate now includes one live example of **every** pattern the rest of
the work repeats, so the interaction model is approved before it is multiplied.
Implementation **stops** until this passes.

- [ ] One column ≈560px; reads as one product with the pre-payment side
- [ ] Exactly one progress indicator, exactly one Back
- [ ] Each screen asks one question in the customer's own words
- [ ] The first available action is a tap, not a text field
- [ ] Cards, rows, and chips each feel right to use on a thumb
- [ ] The `brand_type` reveal appears only when Nuave genuinely had nothing
- [ ] The readback is legible and every row's **Ubah** lands on the right screen
- [ ] A question is read-first; **Ubah** reveals editing; an invalid save is
      refused there and then, in plain Indonesian
- [ ] No provenance, confidence, extraction, or schema language — while the
      customer's own official source is still visible on brand confirm
- [ ] It reads as the prototype, not as the old intake

A failure here is a model problem: fix S2 and re-gate. Do not proceed to S3.

### Gate 2 — after S6. "Would I let a paying customer do this?"

Full journey from the landing with a **real business source**, end to end, on a
phone. Per R-28 this is final acceptance; verifying the route in isolation is
not the same gate. **The old implementation is still in the tree** — if this
gate fails, reverting is one flag.

- [ ] Preview → payment → intake reads as one continuous experience
- [ ] The intake feels like confirming, not filling in a form
- [ ] Every screen arrives pre-populated, or says plainly what it could not
      find and asks (R-16)
- [ ] The ten questions read naturally; editing is quick and errors are clear
- [ ] Nothing exposes an internal identifier, schema name, or provenance label
- [ ] Wrong-brand correction works without losing entered work (R-15)
- [ ] The manual-fallback path completes without a dead end

Record the verdict in `specs/007-intake-airbnb-revamp/VERIFICATION.md`, which
today covers **only package A1** and marks ten acceptance rows Blocked. E1 has
no verification record at all.

---

## 8. Technical verification

### The gate
`npm run verify` → `check` (typecheck · eslint · prettier ·
**check:typography**) → `test:unit` → `build` → `build:cf` → `test:e2e`
(three Playwright configs). Per `AGENTS.md:57`, no slice is ready without it.

### Untouched safeguards
`measurement-matrix.test.ts`, `a3-composition.test.ts`, `contracts.test.ts`,
`questions-id*.test.ts`, `locked-question-pack.test.ts`, `report-*.test.ts`,
`run-orchestrator.test.ts`, `variance*.test.ts`, `safe-source-fetch.test.ts`,
`source-identity.test.ts`, `rate-limit*.test.ts`, provider tests,
`report-labels.test.ts`.

**`workflow-authority.test.ts` and `e1-workflow-navigation.test.ts` are the
regression net.** They pin the screen sequence and field→screen error routing,
and must pass **unchanged**. A slice wanting to edit either has changed the
state machine — out of scope.

### New: a screen contract test

Primitive unit tests prove a chip works in isolation; the journey invariants
below prove the flow works. Neither stops a future change from replacing chips
with a textarea again. One integrated Playwright spec —
`tests/e2e/intake-screen-contract.spec.ts` — closes that:

- single-choice screens (scope, category, market) expose cards or radios, and
  **no primary text input**;
- offerings and customer-reasons expose selected chips;
- the readback is read-first: values visible, **Ubah** present, no textarea
  until it is pressed;
- question textareas are absent until **Ubah**;
- exactly one progress indicator and one Back element render;
- the prohibited phrase list (`saran dari ekstraksi`, `Draft dari ekstraksi`,
  `Terima saran Nuave`, `Differentiator`, `Konteks pasar`, `Penawaran utama`,
  `Pertimbangan keputusan`) is absent everywhere.

This asserts the *interaction model*, which is the thing that regressed.

### Rewritten deliberately

R-28: *"The Playwright specs … are updated deliberately at the handoff. Do not
claim they pass unchanged."* Operating rule 2: rewritten to derive from the new
authority — **never deleted, never skipped**. All of this lands in **S6**, when
the default flips; S2–S5 leave the default on the old surface, so CI stays green
throughout.

| Spec | Coupling | Action |
|---|---|---|
| `e1-postpayment-journey.spec.ts` (835 lines) | Every screen title, every `getByLabel("…*")`, the nine-screen reverse walk (`:689-702`) | Rewrite against new roles; keep sequence, chapter-progress, and 44px assertions |
| `b1-workflow-authority.spec.ts` | Same, plus `#market-context-error`, `#source-correction-source-error`, `#comparison-scope-error` | Rewrite; **keep** the R-17 assertions that the error lands on the owning screen and the control takes focus |
| `payment-boundary.test.ts:39-64` | `readFileSync` on component names and import symbols | Update paths. **Keep the negative assertions** — `AuditPrePaymentJourney` must still not reach `/api/audit/extract` |
| `landing-audit-handoff.spec.ts` | Landing hero + `/audit/v2?entry=landing-paid` | Should survive; re-run and confirm |
| `e1-runnable-journey.spec.ts` | Pre-payment only | Untouched; must stay green as proof the pre-payment surface was not disturbed |

**Rewrite principle:** assert journey invariants — screen order, the submitted
brief, which screen an error routes to, CTA reachability — plus the §8 screen
contract. A label change must not turn CI red; a lost screen or a lost
interaction pattern must.

### Green CI is not delivery
Every criterion in §7 is judgment. `specs/README.md:31` — *"Do not mark a spec
verified because the build passes."*

---

## 9. Deferred / future hardening

- **Pre-payment frame alignment.** `AuditPrePaymentJourney` is a 768px column
  with `clamp()` display headings vs the intake's 560px / 20–24px.
  Structurally already prototype-shaped. Revisit only if Gate 2 shows the seam.
- **Category alternatives in the extraction contract.** Would let Category
  become three cards as the prototype shows. A deliberate contract change,
  not part of this recovery.
- **Lifting the controller out of `AuditWorkflow`.** The 1,100 lines of
  orchestration inside a client component are worth extracting eventually.
  Explicitly not now — §6.0 depends on leaving it alone.
- **`/audit/fixture`** — a complete parallel journey (1,617 lines), not
  customer-facing. Leave it.
- **`audit.module.css`** — 30 KB still serving run, report, and legacy
  surfaces after the intake stops depending on it.
- **Durable persistence.** State is `sessionStorage`
  (`nuave.audit.workflow.v9`); R-15 declines to call this idempotency. Bump the
  key only if the shape changes (R-26).
- **Aggressive invalidation.** `updateBrief` → `clearAfterBriefChange()`
  (`AuditWorkflow.tsx:668`) discards pack, observations, and report on any brief
  edit. Correct per R-14, but silent. Worth a warning later.
- **Screenshot / visual-regression tooling.** None exists; founder eyes remain
  the mechanism.
- **`NOW.md` and the Spec 007 status ledger are stale** — `NOW.md` still names
  Spec 003 and `/audit`; `EXECUTION_PLAN.md:296` shows every package "Not
  started" though all eight shipped. Reconcile after Gate 2.

---

## 10. Risks

Revision 1 listed the customer-reasons mapping as an open founder decision.
**It is now closed** — §6.2 derives the mapping from the field types, so nothing
is left to interpretation. Two risks remain, each with a stated response:

1. *A test rewrite hides a regression.* `workflow-authority.test.ts` and
   `e1-workflow-navigation.test.ts` stay unchanged as the state-machine net; the
   rewritten e2e specs keep the R-17 error-routing and touch-target assertions;
   and the new screen contract (§8) pins the interaction model that regressed
   the first time.
2. *Scope creep into the engine.* §3 is a fence. `types.ts`,
   `workflow-authority.ts`'s logic, and the API routes are unchanged; a worker
   editing them has left scope and should report rather than proceed.

---

## What changed in revision 2

| # | Finding | Correction |
|---|---|---|
| 1 | S7 repointed routes at a presentation-only journey, dropping the controller | §6.0 — `AuditWorkflow` stays the controller; new screens render inside its step branches behind a per-screen surface flag |
| 2 | Scope had no control for the required `brand_type`; Category assumed alternatives that `ExtractionDraft` does not carry | §6.1 — R-16 empty-draft reveal for every AI-owned field; Category becomes one prefilled card + **Ganti** |
| 3 | Customer reasons had no field mapping | §6.2 — three groups derived from the field types, exact mutations, e2e assertion on the submitted brief |
| 4 | Gate 1 covered only cards; most patterns were approved after S7 deleted the old path | §6.3 S2 is a vertical slice showing every pattern; deletion moves to S7, after Gate 2 |
| 5 | The question-edit contract named one of R-10's four hard blocks and no save transaction | §6.5 — full transaction reusing `validateCanonicalIndonesianQuestionPack`; tests for all four classes |
| 6 | Safeguards did not protect the interaction model | §8 — a screen contract spec |
| 7 | "No source language" contradicted R-12 | §2 test 4 and Gate 1 — no internal metadata; the customer's own source stays visible |

Every code claim above was verified in the tree: `openai.ts:194-216`
(`brand_type: ""`), `types.ts:96-100` and `:136-144` (field types),
`questions-id.ts:132-150` (separate projection), `:635-780` (all four hard-block
rules already implemented), `AuditWorkflow.tsx:1024-1045` (no save validation
today), `SourceHero.tsx:59-95` (handoff-driven extraction).
