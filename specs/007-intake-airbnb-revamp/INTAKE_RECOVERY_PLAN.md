# Intake experience recovery plan — Spec 007 R-27 conformance

> Status: **Draft, awaiting founder approval**
> Created: 2026-09-02
> Companion to [`SPEC.md`](./SPEC.md) (Approved) and
> [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md).
> Purpose: recover the approved Airbnb-style intake experience by finishing the
> three R-27 components package E1 did not build. Where this file disagrees
> with `SPEC.md`, **the spec wins** and this file is wrong.


## Context

Spec 007 shipped a technically substantial, runnable end-to-end journey. Its
measurement core, workflow authority, safe source handling, and payment
sequencing are correct and are not in question here.

But the founder opens `/audit/v2`, pays, and lands in something that looks and
feels like the old intake form rather than the approved prototype. This plan
locates why, and recovers the experience without touching the engine.

The cause is precise and verifiable. Spec 007's final package **E1** owned every
experience requirement (R-24 through R-28) in one slice. Its diff
(`0294a35`) shows what happened:

| E1 built | Lines |
|---|---|
| `src/components/AuditPrePaymentJourney.tsx` (new) | +719 |
| `src/components/AuditPrePaymentJourney.module.css` (new) | +426 |
| `src/app/audit/AuditStages.tsx` (edited) | **+242** |

The **pre-payment** half of R-24 was built fresh, to the prototype. The
**post-payment** half — the twelve intake screens, the question review, the
shell around them — was satisfied by extending the pre-existing
`AuditStages.tsx` form in place. `AuditV2Journey.tsx:47` makes it literal:

```tsx
if (entry === "post-payment" || paymentCompleted) return <AuditWorkflow />;
```

`AuditWorkflow` is the 1,548-line component that renders the previous intake.
So the customer crosses payment and steps out of the approved experience into
the old one.

Concretely, **three of the seven components R-27 required were never built**:

> `SPEC.md:944` — "Build only what the journey needs: selection card, selection
> row, chip, bottom navigation with chapter progress, floating pay bar, scan
> steps, example report card."

Bottom navigation, floating pay bar, scan steps, and example report card exist.
**Selection card, selection row, and chip do not exist anywhere in `src/`.**
They are the three primitives that carry the entire "selection instead of form"
character of the prototype. Without them the screens had nowhere to land except
`TextInput`, `LongInput`, and `LineListInput`.

**This is therefore Spec 007 conformance work, not a redesign.** No settled
product decision is reopened. The plan finishes R-27.

---

## 1. Diagnosis

### 1.1 What is already right — more than expected

The recovery is cheap because most of the prototype's structure already shipped:

- **The screen sequence is exact.** `INTAKE_SCREENS`
  (`src/lib/audit/workflow-authority.ts:15`) and `intakeScreenSequence()`
  (`:209`) reproduce the prototype's flow, conditional screens included. This is
  the prototype's `flow()` function, in TypeScript, tested.
- **The four-chapter progress model shipped.** `IntakeChapterProgress`
  (`AuditStages.tsx:60`) renders four fractional bars with the prototype's own
  chapter labels.
- **The persistent bottom Kembali/Lanjut bar shipped.** `IntakeActions`
  (`AuditStages.tsx:122`).
- **The token layer is already the prototype, variable for variable.**
  `src/styles/tokens.css:1-50` and the prototype's `:root` block are an exact
  match: `--bg-page:#ffffff`, `--action:#18181b`, `--action-soft:#f4f4f5`,
  `--border-default:#e5e7eb`, `--text-muted:#52525b`, spacing 4/8/16/24/32/48/64,
  `--motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1)`,
  `--shadow-card: 0 1px 2px rgba(0,0,0,0.05)`. The historical purple is retired
  (`--purple: var(--action)`).

**No token work is required.** The gap is entirely composition and interaction.

### 1.2 The five differences that produce the old feeling

**(a) Every screen asks with a form field instead of offering a choice.**
This is the largest single difference. Prototype vs shipped, same screen:

| Screen | Prototype | Shipped (`AuditStages.tsx`) |
|---|---|---|
| brand-confirm | Centred brand card + two big cards: *Ya, benar* / *Bukan, ganti brand* | `TextInput#brand-name` in a two-column `FieldGroup` + a source list + a ghost button (`:877-940`) |
| scope | Three `.card`s with title + description | Bare `<fieldset>` + `<input type="radio">` + a `TextInput#brand-type` (`:1007-1063`) |
| category | Three pre-selected `.card`s + an add-line | Bare radio pair labelled "(saran dari ekstraksi)" + `TextInput#category` (`:1123-1168`) |
| offerings | Removable `.chip`s, pre-filled, + add-line | `LineListInput` — a **newline-delimited textarea** (`:1299`) |
| customer-reasons | One chip multi-select, pre-selected | Three fields: `LongInput` + two `LineListInput`s in `styles.gridTwo` (`:1225-1284`) |
| market | Four `.card`s + a `.reveal` for cities | One free-text `TextInput#market-context` (`:1187`) |
| facts | One optional textarea | Two fields, one labelled **"Differentiator (opsional)"** (`:1369-1393`) |
| review | Seven readback rows each with an **Ubah** link | A `<dl>` with no edit affordance (`:1434-1467`) |

**(b) Three competing progress indicators on every intake screen.**
1. `AuditWorkflow`'s sticky topbar stepper — "Pengaturan audit / Langkah 2 dari 4"
   over `Fakta bisnis · Periksa fakta · Periksa pertanyaan · Jalankan audit`
   (`AuditWorkflow.tsx:1433-1462`)
2. `StageIntro` — "Langkah 2 dari 4 · Periksa fakta" (`AuditStages.tsx:853`)
3. `IntakeChapterProgress` — "Bab 1 dari 4 / Brand dan yang Anda tawarkan"

Plus **two Kembali buttons**: a ghost one at the top (`:843`) and one in the
bottom bar. The prototype has exactly one progress element and one Back.

**(c) The frame is a desktop admin workspace, not a mobile-first column.**

| | Prototype | Shipped |
|---|---|---|
| Column | `#app{max-width:560px}` | `.workspace{width:min(64rem,…)}` = 1024px (`audit.module.css:160`) |
| Screen body | `h1` 20px → 24px at 640px | `StageIntro h1` + `.stageSection{grid-template-columns:minmax(10rem,0.34fr) minmax(0,1fr)}` — a label/content documentation grid (`:242`) |
| Chrome | 16px wordmark row | `.topbar{position:sticky;min-height:4rem;padding:… max(1.25rem,calc((100vw - 72rem)/2))}` (`:17`) |

**(d) Provenance and internal schema leak into the interface.** Both are
explicitly prohibited by `docs/V1_PRODUCT_CONTRACT.md:126-129` ("Metadata such
as extracted, inferred, user supplied, confidence, provenance, or source
timestamp **must not be shown in the UI**") and `:88` ("**The schema does not
define the UI.**"). Shipped anyway:

- `"(saran dari ekstraksi)"`, `"Saran kategori"`, `"Draft dari ekstraksi"`,
  `"Terima saran Nuave"`, `"Periksa catatan ekstraksi"`,
  `"Nilai yang dipertahankan dari sumber sebelumnya"`
- Schema-shaped labels: `Konteks pasar`, `Differentiator`, `Penawaran utama`,
  `Fakta tambahan`, `Pertimbangan keputusan`, `Target pelanggan`, `Cakupan`
- Screen titles are imperative instructions — `"Pilih kategori brand."`,
  `"Jelaskan konteks pasar."` (`:786-799`) — where the prototype asks the
  customer's own question: *"Bisnis Anda paling tepat disebut apa?"*,
  *"Di mana pelanggan Anda berada?"*

**(e) Two shipped defects that hurt more than their size suggests.**

1. **The review readback renders completely unstyled.** `AuditStages.tsx:1434`
   uses `styles.factList / factRow / factLabel / factValue`. Those classes do
   **not exist** in `audit.module.css` — they are only defined in
   `src/app/audit/fixture/fixture.module.css:247`. Every class resolves to
   `undefined`. The single most important "here is what Nuave understood"
   moment is a bare `<dl>`.
2. **The approved intake theme is dead code.** `src/app/audit/tweakcn-intake.css`
   (10.5 KB, imported by `audit/layout.tsx:2`) scopes every rule to
   `main[data-theme="light"]:has(#identity-scope-heading)`. That id, and the
   sibling `#offer-needs-heading` / `#similar-businesses-heading`, exist in **no
   `.tsx` file**. The B1 rename to per-screen headings silently disabled the
   whole file.

### 1.3 The question review screen

`QuestionsStep` (`AuditStages.tsx:1511`) renders ten separate `StageSection`s,
each a full label/content grid containing an always-open `<Textarea rows={3}>`,
an English `Badge` reading **"Branded"** / **"Unbranded"**, and
`<code>{prompt.prompt_id}</code>` — an internal identifier shown to the
customer. The prototype shows two grouped lists of compact read-first cards with
an **Ubah** link that reveals editing on demand.

---

## 2. Experience north star

From `docs/V1_PRODUCT_CONTRACT.md:33-42` and the Fable brief:

> **Nuave shows what it believes. The owner fixes what matters. Nuave then
> creates the audit.**

Operationally, five tests every screen must pass:

1. **One question, asked in the customer's words**, as an `h1`. If the heading
   names a backend field, it is wrong.
2. **The answer is already there.** The default interaction is confirm or
   remove, not type. Typing is the escape hatch, in a secondary add-line.
3. **Tapping, not filling.** Cards for single choice, rows for choosing from a
   detected list, chips for multi-select and removal.
4. **Nothing about how Nuave knows.** No provenance, confidence, source, or
   extraction language. Removability is the honesty signal.
5. **One column, one progress bar, one Back, 560px wide, thumb-reachable.**

---

## 3. What stays — do not touch

Preserved unchanged. A worker that finds itself editing these has left scope.

**Engine and contracts (all of `src/lib/audit/` except two named moves):**
- Measurement matrix and question generation — `measurement-matrix.ts`,
  `questions-id*.ts`, `contracts.ts`, `locked-question-pack.ts`,
  `question-suggestion-guards.ts`
- Extraction, run orchestration, report, variance — `provider.ts`,
  `run-orchestrator.ts`, `stream.ts`, `report-*.ts`, `variance.ts`
- Safe source handling and rate limiting — `safe-source-fetch.ts`,
  `source-identity.ts`, `rate-limit.ts`
- Payment sequencing — `payment-boundary.ts`
- All six `/api/audit/*` routes
- `types.ts` — **the `BusinessBrief` schema does not change.** Every new screen
  writes the same fields.

**The intake state machine — reused as-is, this is the biggest asset:**
`src/lib/audit/workflow-authority.ts` — `INTAKE_SCREENS`,
`intakeScreenSequence`, `nextIntakeScreen`, `previousIntakeScreen`,
`validateBriefForReview`, `applyBriefFieldChange`, `applyScopeSelection`,
`acceptComparisonTarget`, `confirmIdentity`, `mergeExtractionIntoBrief`,
`FIELD_OWNERSHIP`. Pure functions. The new UI calls exactly these.

**Untouched surfaces:** the pre-payment journey (`AuditPrePaymentJourney.tsx`),
the run screen (`AuditRunStep.tsx`), the report (`ReportView.tsx`), the fixture
journey, the landing.

**Settled Spec 007 decisions that override the prototype — do not "restore" the
prototype here:**

| Prototype | Authority wins |
|---|---|
| Market screen is conditional | **Never skipped.** `market_context` required on every path (R-12, R-14) |
| A keep/remove list of competitors | **One** comparison target, proposed then accepted/edited/replaced (R-13) |
| Customer reasons is `Opsional` | `verified_customer_needs` and `verified_decision_criteria` are **required, min 1** (R-12) |
| `Lanjut` disabled until answered | **Next stays enabled**; press surfaces an actionable error and moves focus (R-17) |
| "Skor Visibilitas AI" | Retired. **Bisnis Anda muncul di X dari 10 pertanyaan** (R-25, `VOICE.md:42`) |
| Brand-name-only entry | A public source is mandatory (R-11) |

On requiredness: R-12 and the "must not block" rule in the product contract
(`:57`) are reconciled by R-16, not by a rule change. The chips arrive
**pre-selected from the draft**, so the required minimum is already satisfied
when the screen opens. The customer only meets a block if they remove every
option — which is a real correction, not an unanswered question.

---

## 4. What changes

| Kind | Item |
|---|---|
| **New** | Three R-27 primitives: selection card, selection row, chip (+ add-line, reveal) |
| **New** | An intake shell: 560px column, one bottom nav, one progress bar |
| **Rebuilt** | All twelve intake screens, as compositions of the above |
| **Rebuilt** | The question review screen, as two grouped read-first lists |
| **Reshaped** | Screen headings become the customer's question; all provenance and schema language removed |
| **Moved** | `INTAKE_CHAPTER_LABELS` + `intakeChapterFor` from `AuditStages.tsx:46-58` into `workflow-authority.ts`, next to `intakeScreenSequence` |
| **Lifted** | Intake navigation + error focus (`AuditWorkflow.tsx:804-868`) into the new journey container |
| **Deleted at switchover** | `B1BriefStep`, `QuestionsStep`, `StageIntro`, `TextInput`/`LongInput`/`LineListInput`/`LineListEditor`, `B1ComparisonTarget`, the `AuditWorkflow` topbar stepper for intake steps, `tweakcn-intake.css`, orphaned `SimilarBusinessesEditor.tsx` |
| **Rewritten** | The e2e specs that pin form-field labels (§8) |

---

## 5. Highest-leverage recovery work

Ranked. The first four recover most of the felt difference.

**1 — Build the three missing primitives (R-27).** Nothing else can be done
correctly without them, and every screen collapses to a few lines once they
exist.

**2 — Replace the frame.** Remove the topbar stepper and `StageIntro`'s step
counter from intake, drop `.workspace`'s 1024px grid, put the screens in a
560px column with one bottom nav. This alone changes the first impression
before a single screen is rebuilt.

**3 — Convert the six screens where a form field replaced a choice**: scope,
category, market, offerings, customer-reasons, brand-confirm. These carry the
"large administrative form" feeling.

**4 — Fix the review readback.** Style it, and give every row an **Ubah** link
that routes to the owning screen. It is currently unstyled, and it is the
moment the whole correction loop is supposed to pay off.

**5 — Strip provenance and schema language** across every screen and the
settled CTA (`"Konfirmasi fakta dan buat 10 pertanyaan"` → **"Buat pertanyaan
audit"**).

**6 — Rebuild the question review** into grouped, read-first cards.

**Explicitly not leverage:** pixel parity (R-27: "Pixel parity with the old
intake is not a goal"), radius alignment (tokens give 6/8/12/16 vs the
prototype's 6/8/10/14 — near enough), the focus-ring formula (R-27 defers
focus migration; use the existing `--shadow-focus` convention).

---

## 6. Recommended implementation sequence

New code lands **beside** the old journey so each slice is reviewable and
reversible; the final slice flips the routes and deletes the old path.

### New files

```
src/components/product/selection/
  SelectionCard.tsx      # single-choice card: icon? + title + optional description
  SelectionRow.tsx       # single-choice row from a detected list, with a radio dot
  Chip.tsx               # toggle / removable pill
  AddLine.tsx            # Input + outline Button, the "add your own" escape hatch
  Reveal.tsx             # conditional follow-up, left-rule subordination
  selection.module.css   # consumes tokens.css only; no raw font-size

src/app/audit/v2/intake/
  IntakeJourney.tsx      # container: state, navigation, validation focus
  IntakeShell.tsx        # 560px column, scroll body, one bottom nav + progress
  intake.module.css
  screens/BrandConfirmScreen.tsx, SourceCorrectionScreen.tsx, ScopeScreen.tsx,
          BranchScreen.tsx, ProductScreen.tsx, CategoryScreen.tsx,
          OfferingsScreen.tsx, CustomerReasonsScreen.tsx, MarketScreen.tsx,
          ComparisonTargetScreen.tsx, FactsScreen.tsx, ReviewScreen.tsx,
          QuestionReviewScreen.tsx
```

### Build rules for every worker

- Build on `@base-ui/react` — it ships `radio`, `radio-group`, `toggle`,
  `toggle-group`, `checkbox-group`, `collapsible`. **Do not run
  `npx shadcn add` against the default registry** (R-27); `components.json`
  is pinned to `base-nova` + `@beui`. Tabler icons only.
- CSS Modules consuming `src/styles/tokens.css`. **No raw `font-size`** —
  `scripts/check-typography.mjs` fails the build on it. Use `--type-*` roles.
- Every control: keyboard-operable, visible focus, correct ARIA, ≥44px target.
- Copy is Bahasa Indonesia per `docs/VOICE.md`: `Anda`, `brand Anda`, `pesaing`,
  `model AI`, **no em or en dashes in prose** (use `·` or a comma). The five
  verbatim labels never change.
- The prototype (`intake-prototype.html`) is the reference for composition and
  copy. Where §3's table says the spec overrides it, the spec wins.

### Slices

**S1 — Primitives.** The five components above, plus a unit test per component
covering keyboard operation and ARIA state. Renders nowhere yet. *Reversible:
pure addition.*

**S2 — Shell + chapter 1 opening (→ Gate 1).**
`IntakeShell` + `IntakeJourney` + `BrandConfirmScreen`, `ScopeScreen`,
`CategoryScreen`. Move `INTAKE_CHAPTER_LABELS`/`intakeChapterFor` into
`workflow-authority.ts`. Mount behind `/audit/v2/intake-preview` (noindex, not
linked) so the founder can walk it with a seeded session while `/audit/v2`
still serves the current journey.
- brand-confirm: brand card (logo/initials, name, meta) + two selection cards
  *Ya, benar* / *Bukan, ganti brand*. R-18 copy when the name is unverified —
  never "we found your business".
- scope: three selection cards. Writes `entity_scope` in the canonical form
  from R-12 (`Seluruh brand <brand_name>` / `Cabang: …` / `Produk: …`).
- category: up to three selection cards from the extraction draft, first
  pre-selected, plus an add-line. No "(saran dari ekstraksi)".

**S3 — Rest of chapter 1.** `SourceCorrectionScreen`, `BranchScreen`,
`ProductScreen`, `OfferingsScreen` (pre-filled removable chips + add-line,
replacing the newline textarea).

**S4 — Chapters 2–3.** `CustomerReasonsScreen` (one chip multi-select carrying
`target_customer`, `verified_customer_needs`, `verified_decision_criteria` —
the product contract at `:88` explicitly permits one interaction to populate
several engine fields), `MarketScreen` (four selection cards + `Reveal` for
cities; always shown per R-14, wording varies by scope),
`ComparisonTargetScreen` (the R-13 proposal as one card with accept / replace,
plus the `alternatif lain di kategori <kategori>` fallback — no entity picker).

**S5 — Chapter 4.** `FactsScreen` (one optional textarea, `Opsional` badge on
the heading; `usp` shown as a pre-filled editable line only when extraction
produced one). `ReviewScreen` — styled readback rows, each with **Ubah**
routing to its owning screen, `brand_name_variants` editable inline, primary
action **"Buat pertanyaan audit"**.

**S6 — Question review.** Two `.qgroup`s — **Tanpa menyebut bisnis Anda** (6)
and **Menyebut bisnis Anda** (4) — of compact read-first cards showing
`slot.customerFacingLabel` and the question, with an **Ubah** link that reveals
a textarea. R-10's fixed slot frame stays visible; identity-leak errors block
on save, purpose drift warns and proceeds. Drop the `prompt_id` `<code>` and
the English Branded/Unbranded badges. Primary action **"Jalankan audit"**.

**S7 — Switchover (→ Gate 2).** Point `AuditV2Journey`'s post-payment branch and
`AuditEntryShell` at `IntakeJourney`; remove `/audit/v2/intake-preview`; delete
the dead code listed in §4; rewrite the e2e specs (§8); run `npm run verify`.

---

## 7. Experience review gates

Two, as chosen. Both are founder-only. `EXECUTION_PLAN.md:93-97` is explicit
that CI does not cover "human judgment on customer-facing copy and layout".

### Gate 1 — after S2. "Does the frame feel like the prototype?"

Walk `/audit/v2/intake-preview` on a phone-width viewport. Implementation
**stops** until this passes; every later screen inherits this frame.

- [ ] One column, roughly 560px, reads as one product with the pre-payment side
- [ ] Exactly one progress indicator, exactly one Back
- [ ] Each screen asks one question in the customer's own words
- [ ] The first action available is a tap, not a text field
- [ ] No provenance, confidence, source, or schema language anywhere
- [ ] Primary action is thumb-reachable; targets feel ≥44px
- [ ] It reads as the prototype, not as the old intake

A failure here is a frame problem: fix S2 and re-gate. Do not proceed to S3.

### Gate 2 — after S7. "Would I let a paying customer do this?"

Full journey from the landing with a **real business source**, end to end, on a
phone. Per R-28 this is final acceptance — verifying the route in isolation is
not the same gate.

- [ ] Preview → payment → intake reads as one continuous experience
- [ ] The intake feels like confirming, not filling in a form
- [ ] Every screen arrives pre-populated, or says plainly what it could not
      find and asks (R-16)
- [ ] The readback is legible and every row is correctable
- [ ] The ten questions read naturally and are editable without friction
- [ ] Nothing exposes an internal identifier, schema name, or provenance label
- [ ] Wrong-brand correction works without losing entered work (R-15)

Record the verdict in `specs/007-intake-airbnb-revamp/VERIFICATION.md` —
which today still covers **only package A1** and marks ten acceptance rows
Blocked. E1 has no verification record at all.

---

## 8. Technical verification

### The gate
`npm run verify` → `check` (typecheck · eslint · prettier ·
**check:typography**) → `test:unit` → `build` → `build:cf` → `test:e2e`
(three Playwright configs). Per `AGENTS.md:57`, no slice is ready without it.

### What stays a machine safeguard

Untouched and must stay green — they protect the engine this plan preserves:
`measurement-matrix.test.ts`, `a3-composition.test.ts`, `contracts.test.ts`,
`questions-id*.test.ts`, `locked-question-pack.test.ts`, `report-*.test.ts`,
`run-orchestrator.test.ts`, `variance*.test.ts`, `safe-source-fetch.test.ts`,
`source-identity.test.ts`, `rate-limit*.test.ts`, provider tests,
`report-labels.test.ts` (the five verbatim strings).

**`workflow-authority.test.ts` and `e1-workflow-navigation.test.ts` are the
regression net for this work.** They pin the screen sequence and the
field→screen error routing. The new UI must satisfy them **unchanged**. If a
slice wants to edit either, it has changed the state machine — which is out of
scope.

New unit coverage to add: one test per primitive (keyboard operation, ARIA
selected/pressed state, disabled behaviour).

### What must be rewritten, deliberately

R-28 already anticipated this: *"The Playwright specs … are updated
deliberately at the handoff. Do not claim they pass unchanged."* And operating
rule 2: rewritten to derive from the new authority — **never deleted, never
skipped**.

| Spec | Coupling | Action |
|---|---|---|
| `tests/e2e/e1-postpayment-journey.spec.ts` (835 lines) | Every screen title, every `getByLabel("…*")`, the nine-screen reverse walk at `:689-702` | Rewrite against new headings and roles; keep the sequence, chapter-progress, and 44px assertions |
| `tests/e2e/b1-workflow-authority.spec.ts` | Same, plus error element ids `#market-context-error`, `#source-correction-source-error`, `#comparison-scope-error` | Rewrite; **keep** the R-17 assertions that the error appears on the owning screen and the control takes focus |
| `src/lib/audit/payment-boundary.test.ts:39-64` | `readFileSync` asserting on component names and import symbols | Update the asserted paths. **Keep the negative assertions** — `AuditPrePaymentJourney` must still not reach `/api/audit/extract` |
| `tests/e2e/landing-audit-handoff.spec.ts` | Landing hero + `/audit/v2?entry=landing-paid` URL contract | Should survive; re-run and confirm |
| `tests/e2e/e1-runnable-journey.spec.ts` | Pre-payment only | Untouched; must stay green as proof the pre-payment surface was not disturbed |

**Rewrite principle:** assert journey invariants — screen order, what the brief
contains at submission, which screen an error routes to, that the primary
action is reachable — not form-field labels. A label change must not turn CI
red; a lost screen must.

Also: `tests/e2e/offline-network.spec.ts` asserts no unexpected external
requests over `/`, `/audit`, `/audit/fixture`. **Do not add a font, icon, or
image CDN** — the prototype's Google Fonts link must not be copied across;
Geist is already local via `--font-geist-sans`.

### Green CI is not delivery
Every criterion in §7 is judgment. `specs/README.md:31` — *"Do not mark a spec
verified because the build passes."* A slice that is green and fails Gate 1 has
failed.

---

## 9. Deferred / future hardening

Real, and out of scope for this recovery:

- **Pre-payment frame alignment.** `AuditPrePaymentJourney` is a 768px column
  with `clamp()` display headings vs the intake's 560px / 20–24px. Structurally
  it is already prototype-shaped (kicker, heading, lead, scan steps, floating
  pay bar). Revisit only if Gate 2 shows the seam.
- **`/audit/fixture`** — a complete parallel journey (`FixtureJourney.tsx`,
  1,617 lines) in a card-heavier language. Not customer-facing. Leave it.
- **`audit.module.css`** — 30 KB serving the run, report, and legacy surfaces.
  The intake stops depending on it; a broader cleanup is separate work.
- **Durable persistence.** State is `sessionStorage` (`nuave.audit.workflow.v9`).
  R-15 explicitly declines to call this idempotency. Unchanged here; bump the
  key only if the shape changes (R-26).
- **Aggressive invalidation.** `updateBrief` → `clearAfterBriefChange()`
  (`AuditWorkflow.tsx:668`) discards the pack, observations and report on any
  brief edit. Correct per R-14, but a customer editing after generation loses
  work silently. Worth a warning later, not now.
- **Screenshot / visual-regression tooling.** None exists. Founder eyes remain
  the mechanism.
- **`NOW.md` and the Spec 007 status ledger are stale** — `NOW.md` still names
  Spec 003 and `/audit`; `EXECUTION_PLAN.md:296` shows every package "Not
  started" though all eight shipped. Reconcile after Gate 2, not during.
- Rare paths kept working but not re-designed: multi-branch disambiguation
  beyond the R-12 model, conflicting-source display, sensitive-text stop.

---

## 10. Risks and founder decisions

**One decision is genuinely open** — the rest are settled and cited above.

**Customer-reasons as one interaction.** S4 proposes a single chip multi-select
("Kenapa pelanggan biasanya mencari yang seperti ini?") populating three
required brief fields — `target_customer`, `verified_customer_needs`,
`verified_decision_criteria` — instead of three separate inputs. This is the
prototype's design and the product contract permits it explicitly (`:88`,
"One UI interaction may populate or normalize into several engine fields"). It
is called out here because it is the one place the plan maps user-facing
language onto engine structure rather than showing the structure. If the split
matters for question quality, say so before S4 and it becomes two screens.

**Two risks worth naming, both with a stated response:**

1. *Test rewrites hide a regression.* Mitigation: `workflow-authority.test.ts`
   and `e1-workflow-navigation.test.ts` stay unchanged as the state-machine net,
   and the rewritten e2e specs keep the R-17 error-routing and touch-target
   assertions rather than dropping them.
2. *Scope creep into the engine.* Mitigation: §3 is a fence. `types.ts`,
   `workflow-authority.ts`'s logic, and the API routes are unchanged; a worker
   editing them has left scope and should report rather than proceed.

---

## Verification of this plan

The test is the founder's own:

> If we execute this plan well, will the founder open Nuave and immediately
> recognise the Airbnb-inspired experience they approved, while retaining the
> technical correctness already achieved?

The plan answers yes because the missing 20% is unusually well-defined: three
named components from R-27 that were never built, one frame, and the screens
that had nowhere to land without them. The state machine, tokens, chapter
progress, bottom navigation, and every engine contract already exist and are
reused unchanged. Gate 1 tests the recognition within one slice of work; Gate 2
and `npm run verify` together test that nothing correct was lost.
