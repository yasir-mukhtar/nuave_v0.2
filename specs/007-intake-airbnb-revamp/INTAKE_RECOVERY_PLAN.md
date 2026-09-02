# Intake experience recovery plan — Spec 007 R-27 conformance

> Status: **Revision 3.1, ready for worker handoff on founder approval**
> Created: 2026-09-02 · Revised: 2026-09-02 (two review rounds + closure correction)
> Companion to [`SPEC.md`](./SPEC.md) (Approved) and
> [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md).
> Purpose: recover the approved Airbnb-style intake experience by finishing the
> three R-27 components package E1 did not build. Where this file disagrees
> with `SPEC.md`, **the spec wins** and this file is wrong.
>
> The revision history at the end records what each review round corrected.


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
5. **Everything Nuave believes is correctable.** A drafted value may be shown
   compactly, but never in a way that makes it unchangeable (§6.1).
6. **One column, one progress bar, one Back, 560px, thumb-reachable.**

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

**`AuditWorkflow.tsx` remains the workflow controller** (§6.0).

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
the screen opens.

---

## 4. What changes

| Kind | Item |
|---|---|
| **New** | R-27 primitives: selection card, selection row, chip (+ add-line, reveal) |
| **New** | Intake shell: 560px column, one bottom nav, one progress bar |
| **New** | `intakeSurface` — an optional `AuditWorkflow` prop letting new and old screens coexist (§6.0) |
| **New** | A per-question save transaction for R-10 (§6.5) |
| **Rebuilt** | The twelve intake screens and the question review, as presentation only |
| **Reshaped** | Headings become the customer's question; internal metadata removed |
| **Moved** | `INTAKE_CHAPTER_LABELS` + `intakeChapterFor` (`AuditStages.tsx:46-58`) → `workflow-authority.ts` |
| **Deleted, after Gate 2** | `B1BriefStep`, `QuestionsStep`, `StageIntro`, `TextInput`/`LongInput`/`LineListInput`/`LineListEditor`, `B1ComparisonTarget`, the topbar stepper on intake steps, `tweakcn-intake.css`, orphaned `SimilarBusinessesEditor.tsx`, the surface flag and preview route |
| **Rewritten** | The e2e specs that pin form-field labels (§8) |

---

## 5. Highest-leverage recovery work

1. **Build the three missing primitives (R-27).** Nothing else is possible
   without them.
2. **Replace the frame** — one progress indicator, one Back, 560px column.
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

`AuditWorkflow.tsx` owns session restore and persistence (`:435-492`,
`:530-572`), the payment-satisfied marker (`:279`), budget bootstrap
(`:494-528`), extraction (`:870-988`), prompt generation (`:990-1022`),
question editing (`:1024-1045`), audit execution (`:1172-1307`), report
creation (`:1047-1124`), variance (`:301-429`), and the run/report branches.
`SourceHero.tsx:59-95` consumes the paid source handoff and calls back into
`extractWebsite`. Repointing the routes at a presentation-only journey would
either break the audit or duplicate 1,548 lines.

So:

- `AuditV2Journey.tsx` and `AuditEntryShell.tsx` are **not modified.** Both
  render `<AuditWorkflow />` with no props today; the new prop is optional and
  they keep the production default.
- New screens are **presentation only**, taking the props `B1BriefStep` and
  `QuestionsStep` already take: `brief`, `extraction`, `workflowMeta`,
  `fieldErrors`, `busy`, and the existing callbacks (`updateBrief`,
  `onContinue`, `onBack`, `onScopeKindChange`, `onConfirmIdentity`,
  `onAcceptComparison`, `onGenerate`, `onEdit`, `onRun`).
- `AuditWorkflow`'s step-1 and step-2 branches (`:1484-1523`) choose between
  the old and new renderer. Nothing else in the controller changes.

**The seam, defined exactly.** Revision 2 left this ambiguous; it is settled
here.

```ts
// src/app/audit/intakeSurface.ts
export type IntakeSurface = ReadonlySet<IntakeScreen | "questions">;

/** What production serves. Empty until S6, then every screen. */
export const PRODUCTION_INTAKE_SURFACE: IntakeSurface = new Set();

/** What the preview route serves: the screens implemented so far. */
export const PREVIEW_INTAKE_SURFACE: IntakeSurface = new Set([
  /* S2 adds: "scope", "branch", "offerings", "review", "questions" */
]);
```

`AuditWorkflow` takes `intakeSurface: IntakeSurface = PRODUCTION_INTAKE_SURFACE`.
`B1BriefStep` and `QuestionsStep` render the new screen when the current screen
is in the set they are given, otherwise the existing markup.

| Stage | Production default | Preview route |
|---|---|---|
| S2–S5 | **empty** — production is unchanged and its tests stay green | the screens implemented so far, growing each slice |
| S6 | **full** — every screen | same as production |
| S7 | prop, both constants, and the preview route deleted | — |

`/audit/v2/intake-preview` (noindex, not linked) renders
`<AuditWorkflow intakeSurface={PREVIEW_INTAKE_SURFACE} />`, seeded from
`sessionStorage` the way the e2e specs already do. Because unconverted screens
fall through to the existing renderer, a partially converted intake still runs
end to end — which is what makes Gate 1's vertical slice possible.

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

### 6.1 Drafted values stay correctable

`extractionDraftOrManualFallback` (`openai.ts:194-221`) returns
`brand_type: ""`, `entity_scope: ""`, `target_customer: ""`, and `usp: ""`
on the manual-fallback path. R-12 makes `brand_type` required and owns it on the Scope
screen, so cards alone would strand that customer with a validation error and no
control.

Revision 2 answered this with "when the draft has a value, no field is shown."
That is wrong in the other direction: it makes a **populated but incorrect**
value uncorrectable, which R-16 does not ask for and
`V1_PRODUCT_CONTRACT.md:44-51` forbids — the owner's job is to confirm *or
correct* Nuave's understanding. The rule is therefore:

> **An AI-owned field with no other control on its screen renders as a compact
> read-first statement with an **Ubah** affordance when the draft has a value,
> and as an open input with a plain explanation of what Nuave could not read
> when it is empty.**

"No other control" is the scope limit, and it keeps this from becoming a field
per screen. A field already correctable through its screen's primary control —
`category` via its card, `verified_offerings` via chips, `market_context` via
cards — gets no extra statement. Today the rule binds exactly three fields:
`brand_type` on Scope, `target_customer` on customer-reasons (§6.2 already
gives it this treatment), and `usp` on Facts. `usp` is extraction-owned
(`workflow-authority.ts:147-151`) and manual fallback returns it empty
(`openai.ts:221`), so R-16 applies even though the field is optional. The happy
path on Scope stays one tap plus a glance.

**Category — one card, not three.** `extractionDraftSchema.category` is a
single `z.string()` (`types.ts:138`); there is no alternatives array. Adding one
would change the extraction contract, which §3 fences off. So: one prefilled
selection card showing the drafted category, plus **Ganti** revealing an
add-line. No "(saran dari ekstraksi)".

### 6.2 Customer reasons — the chosen mapping

`V1_PRODUCT_CONTRACT.md:88` permits one interaction to populate several engine
fields. **This plan chooses not to exercise that here**, and the reason is
specific rather than structural: `minimizeIndonesianBrief`
(`questions-id.ts:132-150`) projects these three separately as
`customer_context`, `customer_needs`, and `decision_considerations`, so any
implicit split would have to be invented by the adapter and would quietly
change what the ten questions are built from. The schema informs that judgment;
it does not dictate it. An explicit mapping is the simplest thing that cannot
corrupt audit context, and it can be revisited once real packs show how owners
actually use the screen.

`target_customer` is a **string** (`requiredText.max(500)`); the other two are
**arrays** (`min(1).max(12)`) (`types.ts:96-100`).

One screen, heading *"Kenapa pelanggan biasanya mencari yang seperti ini?"*,
three visibly distinct groups:

| Group | Field | Control | Empty-draft behaviour |
|---|---|---|---|
| Who looks | `target_customer` | Read-first statement + **Ubah** → inline input | Open input, plain explanation (§6.1) |
| What they need | `verified_customer_needs` | Chip group, drafted chips pre-selected | Open add-line, plain explanation |
| What they weigh | `verified_decision_criteria` | Chip group, drafted chips pre-selected | Open add-line, plain explanation |

Exact mutations — no inference, no cross-field writes:

- **Select / deselect a chip** → toggles membership of *that group's array only*.
- **Add via that group's add-line** → appends to *that group's array only*.
- **Remove the last chip in a group** → the array is empty; Next stays enabled
  (R-17) and press routes the error to this screen with that group focused.
- **Editing the statement** → writes `target_customer` only.

If this reads heavy at Gate 1, the fallback is to move `target_customer` to its
own screen — not to merge the groups.

**Required test:** an e2e assertion on the `BusinessBrief` submitted to
`/api/audit/prompts` after a scripted select/remove/add, asserting all three
fields carry exactly the expected values.

### 6.3 Slices

**S1 — Primitives.** The five components, plus a unit test each covering
keyboard operation, ARIA selected/pressed state, and disabled behaviour.
Rendered nowhere. *Pure addition.*

**S2 — Frame + vertical slice (→ Gate 1).** `IntakeShell`, the surface prop and
both constants (§6.0), the chapter-label move, `/audit/v2/intake-preview`, and
**one screen per defining pattern, wired to real data**:

| Pattern | Screen |
|---|---|
| Selection card + read-first statement with **Ubah** | Scope (with `brand_type`, §6.1) |
| Selection row | Branch |
| Chip | Offerings (pre-filled removable chips + add-line) |
| Readback with **Ubah** | Review, styled, rows routing to owning screens |
| Read-first question editing | **Question review, complete — both groups** |

Question review is completed here, not split. `QuestionsStep` is a single
renderer mapping `AUDIT_MEASUREMENT_MATRIX` (`AuditStages.tsx:1566`); there is
no per-group seam to fall back through, so enabling `"questions"` at all
replaces all ten. Once `QuestionCard` and the save transaction (§6.5) exist,
mapping ten instead of six is trivial.

Plus the S2 test suite (§8). Implementation **stops** at Gate 1.

**S3 — Chapter 1 remainder.** brand-confirm (brand card + two cards; R-18 copy
when unverified; official source visible per R-12), source-correction, product,
category (§6.1).

**S4 — Chapters 2–3.** customer-reasons (§6.2), market (four cards + city
reveal; always shown per R-14, wording varies by scope), comparison-target (the
R-13 proposal as one card with accept / replace, plus the `alternatif lain di
kategori <kategori>` fallback — no entity picker).

**S5 — Chapter 4.** facts (one optional textarea with an `Opsional` badge;
`usp` as a read-first statement with **Ubah** when drafted, and an open input
with a plain explanation when empty, per §6.1). Review complete across all
fields, primary action **"Buat pertanyaan audit"**.

**S6 — Flip the default (→ Gate 2).** `PRODUCTION_INTAKE_SURFACE` becomes the
full set; rewrite the legacy journey specs and repoint the preview suite at the
default (§8); `npm run verify`. **The old renderers stay in the tree** — a
failed gate reverts by emptying one constant.

**S7 — Cleanup, only after Gate 2 passes.** Delete the old renderers, the
`intakeSurface` prop, both constants, `/audit/v2/intake-preview`,
`tweakcn-intake.css`, and `SimilarBusinessesEditor.tsx`; `npm run verify`.

### 6.4 Readback rows

`ReviewScreen` renders one row per fact: uppercase label, value, and an **Ubah**
button that sets `workflowMeta.intakeScreen` to the owning screen from
`FIELD_OWNERSHIP`. Empty states are plain Indonesian, never a blank.
`brand_name_variants` is editable inline.

### 6.5 The question-edit save transaction

R-10 (`SPEC.md:322-387`) requires hard blocks on save plus a **non-blocking**
purpose-drift warning, with the slot's purpose and policies displayed
throughout. Today `editPrompt` (`AuditWorkflow.tsx:1024-1045`) performs **no
validation at all** — it writes the text and clears downstream state, so a
customer only learns their edit is invalid when they press **Jalankan audit**.

**Every check already exists and is reused; only one customer-facing message
needs localization.**
`validateCanonicalIndonesianQuestionPack` (`questions-id.ts:635-780`) emits
`empty`, `length`, `unexecutable`, `question_form`, `identity_leakage`,
`competitor_leakage`, `identity_requirement`, `comparison_relation`,
`unsupported_premise`, `composition`, and `distinctness`. Every message
this edit transaction can surface is Indonesian except `distinctness`, which
currently emits `Question N duplicates another question.` (`:773`). S2
changes that message — not the rule or its attribution — to:

> **Pertanyaan ini sama dengan pertanyaan lain dalam paket. Setiap pertanyaan
> harus berbeda.**

It calls `hasIndonesianComparisonRelation` (`:361`), which reads
`comparisonRelationMarkers` off the matrix.

Two things about it decide the design:

- **It takes `string[]`, not a `PromptPack`.**
- **Two of its rules are not attributable to the edited slot.** `composition`
  carries `slot: null` (`:757`), and `distinctness` is attributed to the
  **later** duplicate (`:766-772`) — so editing slot 1 into a copy of slot 5
  produces an issue tagged slot 5. Filtering to the edited slot would accept
  both.

So the transaction blocks on **any newly introduced issue, whatever slot it is
attributed to** — a diff, not a filter. That also avoids trapping a customer
behind a pre-existing issue they did not cause.

```ts
const questionsOf = (prompts: PromptPack["prompts"]) =>
  prompts.map((prompt) => prompt.question);
const minimized = minimizeIndonesianBrief(brief);
const key = (issue: IndonesianValidationIssue) =>
  `${issue.slot}|${issue.rule}|${issue.message}`;

const before = new Set(
  validateCanonicalIndonesianQuestionPack(questionsOf(pack.prompts), minimized)
    .map(key),
);
const candidate = pack.prompts.map((prompt, i) =>
  i === index ? { ...prompt, question: draft } : prompt,
);
const introduced = validateCanonicalIndonesianQuestionPack(
  questionsOf(candidate),
  minimized,
).filter((issue) => !before.has(key(issue)));
```

The transaction:

1. **Ubah** replaces the read-only question with a textarea holding a **local
   draft**. The rest of the pack is untouched. Slot label and purpose stay
   visible throughout (R-10).
2. **Batal** discards the draft and restores the read-only card.
3. **Simpan** computes `introduced` as above.
4. `introduced` non-empty → **the save is rejected.** The messages render in
   `role="alert"` beneath the textarea, focus stays there, `onEdit` is never
   called, and nothing downstream is cleared. For `distinctness`, do not
   present the validator's later-slot attribution as if that unchanged slot
   caused the edit: render the localized message above beneath the card being
   edited. `composition` keeps its pack-level Indonesian message.
5. `introduced` empty → `onEdit(index, question)` (the existing callback,
   unchanged), the card returns to read-only, and
   `INDONESIAN_PURPOSE_DRIFT_WARNING` (`questions-id.ts:77`) renders beside it
   as a **non-blocking** note. Purpose drift is not mechanically detectable, so
   this shows after **every** successful manual edit rather than pretending to
   detect it; the existing constant already says exactly that, and moves from
   its current page-level `WarningAlert` (`AuditStages.tsx:1558`) to the edited
   card. The customer may proceed (R-10, settled 2026-08-30).

**Required tests:** a rejected save leaves the pack unchanged for each of —
forbidden identity on an unnamed slot; missing required identity on a named
slot; slot 9 without a comparison relation; over-length and non-question text;
**a duplicate of another slot's question** (attributed elsewhere), asserting
the card-local Indonesian message and the absence of English `Question N`
copy; and **an edit that breaks 6/4 composition** (`slot: null`). Plus one
asserting the drift warning appears after a valid edit and does not block.

---

## 7. Experience review gates

Two founder gates. `EXECUTION_PLAN.md:93-97` is explicit that CI does not cover
"human judgment on customer-facing copy and layout".

### Gate 1 — after S2. Every defining pattern, before the rest is built

Walk `/audit/v2/intake-preview` at phone width. This gate includes one live
example of **every** pattern the rest of the work repeats, so the interaction
model is approved before it is multiplied. Implementation **stops** until this
passes.

- [ ] One column ≈560px; reads as one product with the pre-payment side
- [ ] Exactly one progress indicator, exactly one Back
- [ ] Each screen asks one question in the customer's own words
- [ ] The first available action is a tap, not a text field
- [ ] Cards, rows, and chips each feel right to use on a thumb
- [ ] A drafted `brand_type` is visible and changeable; an empty one asks plainly
- [ ] The readback is legible and every row's **Ubah** lands on the right screen
- [ ] Questions are read-first; **Ubah** reveals editing; an invalid save is
      refused there and then, in plain Indonesian
- [ ] No provenance, confidence, extraction, or schema language — while the
      customer's own official source is still visible on brand confirm
- [ ] It reads as the prototype, not as the old intake

A failure here is a model problem: fix S2 and re-gate. Do not proceed to S3.

### Gate 2 — after S6. "Would I let a paying customer do this?"

Full journey from the landing with a **real business source**, end to end, on a
phone. Per R-28 this is final acceptance; verifying the route in isolation is
not the same gate. **The old implementation is still in the tree** — if this
gate fails, reverting is one constant.

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

### New coverage starts at S2, not S6

Revision 2 left the new surface untested until the flip. Corrected: because
production stays on the old surface through S5 (§6.0), new specs target the
preview route and grow with it, while the legacy specs keep passing untouched.

**`tests/e2e/intake-preview-journey.spec.ts` — added in S2, grown S3–S5.**
Targets `/audit/v2/intake-preview` with a seeded session. Asserts, for the
screens implemented so far: the journey advances and returns, drafted values
arrive pre-populated, a required-field error routes to the owning screen and
focuses its control, and the brief submitted to `/api/audit/prompts` carries
the expected values (this is where §6.2's assertion lives).

**`tests/e2e/intake-screen-contract.spec.ts` — added in S2, scoped to
implemented screens, widened each slice.** Primitive unit tests prove a chip
works in isolation; journey invariants prove the flow works. Neither stops a
future change from replacing chips with a textarea again. This asserts the
interaction model itself:

- single-choice screens (scope, category, market) expose cards or radios, and
  **no primary text input**;
- offerings and customer-reasons expose selected chips;
- `usp` is read-first with **Ubah** when drafted; an empty extraction opens an
  input with a plain explanation rather than rendering an unexplained blank;
- the readback is read-first: values visible, **Ubah** present, no textarea
  until it is pressed;
- question textareas are absent until **Ubah**;
- exactly one progress indicator and one Back element render;
- the prohibited phrase list (`saran dari ekstraksi`, `Draft dari ekstraksi`,
  `Terima saran Nuave`, `Differentiator`, `Konteks pasar`, `Penawaran utama`,
  `Pertimbangan keputusan`) is absent everywhere.

Both are added to `playwright.config.ts`'s `testMatch` in S2.

### Rewritten deliberately, in S6

R-28: *"The Playwright specs … are updated deliberately at the handoff. Do not
claim they pass unchanged."* Operating rule 2: rewritten to derive from the new
authority — **never deleted, never skipped**.

| Spec | Coupling | Action in S6 |
|---|---|---|
| `e1-postpayment-journey.spec.ts` (835 lines) | Every screen title, every `getByLabel("…*")`, the nine-screen reverse walk (`:689-702`) | Rewrite against new roles; keep sequence, chapter-progress, and 44px assertions |
| `b1-workflow-authority.spec.ts` | Same, plus `#market-context-error`, `#source-correction-source-error`, `#comparison-scope-error` | Rewrite; **keep** the R-17 assertions that the error lands on the owning screen and the control takes focus |
| `intake-preview-journey` / `intake-screen-contract` | Target the preview route | Repoint at the default journey; the preview route is deleted in S7 |
| `payment-boundary.test.ts:39-64` | `readFileSync` on component names and import symbols | Update paths. **Keep the negative assertions** — `AuditPrePaymentJourney` must still not reach `/api/audit/extract` |
| `landing-audit-handoff.spec.ts` | Landing hero + `/audit/v2?entry=landing-paid` | Should survive; re-run and confirm |
| `e1-runnable-journey.spec.ts` | Pre-payment only | Untouched; must stay green as proof the pre-payment surface was not disturbed |

**Rewrite principle:** assert journey invariants — screen order, the submitted
brief, which screen an error routes to, CTA reachability — plus the screen
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
  become three cards as the prototype shows. A deliberate contract change.
- **A combined customer-reasons interaction.** §6.2 chooses three explicit
  groups; the product contract permits one interaction to feed several fields.
  Revisit once real packs show how owners use the screen.
- **Lifting the controller out of `AuditWorkflow`.** The 1,100 lines of
  orchestration inside a client component are worth extracting eventually.
  Explicitly not now — §6.0 depends on leaving it alone.
- **`/audit/fixture`** — a complete parallel journey (1,617 lines), not
  customer-facing. Leave it.
- **`audit.module.css`** — 30 KB still serving run, report, and legacy surfaces.
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

No open founder decisions remain. Two risks, each with a stated response:

1. *A test rewrite hides a regression.* `workflow-authority.test.ts` and
   `e1-workflow-navigation.test.ts` stay unchanged as the state-machine net; the
   rewritten e2e specs keep the R-17 error-routing and touch-target assertions;
   the screen contract pins the interaction model that regressed the first time;
   and every new screen is exercised from S2 rather than only after the flip.
2. *Scope creep into the engine.* §3 is a fence. `types.ts`,
   `workflow-authority.ts`'s logic, and the API routes are unchanged; a worker
   editing them has left scope and should report rather than proceed.

---

## Revision history

**Revision 2** corrected seven findings: the controller boundary (§6.0), missing
field controls and unavailable category alternatives (§6.1), the
customer-reasons mapping (§6.2), gate timing and deletion order (§6.3, §7),
the question-save contract (§6.5), interaction-model tests (§8), and the
official-source contradiction (§2).

**Revision 3** corrects five more, all verified in the tree:

| # | Finding | Correction |
|---|---|---|
| 1 | The save transaction passed a `PromptPack` to a `string[]` validator and filtered issues to the edited slot — which drops `composition` (`slot: null`) and misattributes `distinctness` to the later duplicate | §6.5 — map to `question` strings; block on a **diff of introduced issues** regardless of slot; two more required tests; the drift warning shows after every successful edit rather than pretending to be detected |
| 2 | The surface flag was described both as growing per slice and as leaving production on the old surface, and the preview was "forced full" when most screens did not exist | §6.0 — two named constants, an optional `AuditWorkflow` prop, and a stage table: production empty through S5, full at S6, deleted at S7; preview carries the implemented set |
| 3 | S2 proposed one question group, but `QuestionsStep` is a single renderer over the whole matrix with no group-level fallback | §6.3 — question review is completed in S2; removed from S5 |
| 4 | "When the draft has a value, no field is shown" made a populated but wrong value uncorrectable | §6.1 — read-first statement with **Ubah** when populated, open input when empty, scoped to fields with no other control on their screen; Revision 3.1 corrects the bound list to `brand_type`, `target_customer`, and `usp` |
| 5 | Legacy rewrites correctly waited for S6, but the new surface then went untested until the flip | §8 — a preview journey suite and the screen contract both start in S2 and grow through S5; legacy specs rewritten and the preview suite repointed in S6 |

Plus a wording correction in §6.2: the explicit mapping is a **choice** this
plan makes and defends, not something the schema dictates —
`V1_PRODUCT_CONTRACT.md:88` permits the combined interaction, and §9 records
revisiting it.

**Revision 3.1** closes two final handoff inconsistencies:

- §6.5 keeps the issue-set diff but localizes `distinctness` with a card-local
  Indonesian message and requires the duplicate-save test to assert that copy.
- §6.1 includes extraction-owned `usp` as the third field governed by the
  populated/read-first versus empty/open-input rule; S5 and §8 now cover both
  states.

Code claims verified in the tree: `openai.ts:194-221` (empty fallback
`brand_type`, `entity_scope`, `target_customer`, and `usp`),
`types.ts:96-100` and `:136-144` (field types), `questions-id.ts:132-150`
(separate projection), `:635-780` (rule set, `slot: null` on `composition`,
later-duplicate attribution on `distinctness`), `:77`
(`INDONESIAN_PURPOSE_DRIFT_WARNING`), `AuditStages.tsx:1566` (single renderer
over the matrix), `AuditWorkflow.tsx:1024-1045` (no save validation today),
`AuditEntryShell.tsx:6` and `AuditV2Journey.tsx:47` (both render
`<AuditWorkflow />` with no props), `SourceHero.tsx:59-95` (handoff-driven
extraction).
