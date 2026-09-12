# Handoff: Nuave intake recovery — slices S3 + S4 + S5 (Spec 007 R-27)

You are implementing the remaining intake screens for Nuave, an AI-visibility
audit product for Indonesian small businesses. The approved "Airbnb-style"
intake experience was only partially built: the foundation (selection
primitives, intake shell, five converted screens) already shipped. This task
converts every remaining intake screen so `/audit/v2/intake-preview` runs the
full prototype-shaped flow end to end. This is conformance work — finish what
the plan specifies, do not redesign.

## Read in this order before writing any code

1. `AGENTS.md` — repo rules: branching, verification gate, UI stack.
2. `specs/007-intake-airbnb-revamp/INTAKE_RECOVERY_PLAN.md` — **your execution
   authority**. Especially §2 (north star + five screen tests), §3 (the fence
   and the settled overrides table), §6.1 (drafted-values rule), §6.2
   (customer-reasons mapping), §6.3 (slices), §8 (required tests).
3. `specs/007-intake-airbnb-revamp/SPEC.md` — the approved spec (R-10…R-18,
   R-27). **Where the plan disagrees with the spec, the spec wins.**
4. `intake-prototype.html` (repo root) — the approved experience. Reference
   for composition and copy only; where §3's overrides table conflicts with
   it, the spec/plan wins.
5. `src/app/audit/intake/` — the shipped S2 implementation: `IntakeShell.tsx`,
   `screens/ScopeScreen.tsx`, `BranchScreen.tsx`, `OfferingsScreen.tsx`,
   `ReviewScreen.tsx`, `QuestionReviewScreen.tsx`, plus the primitives in
   `src/components/product/selection/` (SelectionCard, SelectionRow, Chip,
   AddLine, Reveal). **Reuse all of it. Do not rebuild.**
6. `src/app/audit/intakeSurface.ts` — the surface mechanism (below).
7. `src/lib/audit/workflow-authority.ts` — the intake state machine
   (`INTAKE_SCREENS`, `FIELD_OWNERSHIP`, sequence + error routing). Read it;
   do not change it.

## Deliverable

- **S3 — Chapter 1 remainder:** `brand-confirm` (brand card + two selection
  cards "Ya, benar" / "Bukan, ganti brand"; the customer's official source
  stays visible per R-12; R-18 copy when unverified), `source-correction`,
  `product`, `category` (one prefilled selection card + **Ganti** revealing an
  add-line per §6.1 — the extraction contract has no alternatives array and is
  fenced, so do NOT build a multi-card picker).
- **S4 — Chapters 2–3:** `customer-reasons` (three visibly distinct groups per
  §6.2: `target_customer` as a read-first statement + **Ubah** → inline input;
  `verified_customer_needs` and `verified_decision_criteria` as chip groups
  with drafted chips pre-selected. Exact field writes only — a chip toggle or
  add-line writes that group's array only, no inference, no cross-field
  writes), `market` (four cards + city reveal; always shown per R-14 even for
  national/online scope — wording varies by scope), `comparison-target` (the
  R-13 proposal as one card with accept/replace, plus the `alternatif` list
  and the "bukan kategori X" fallback per §6.3).
- **S5 — Chapter 4:** `facts` (one optional textarea with an `Opsional` badge;
  `usp` as a read-first statement + **Ubah** when drafted, open input with a
  plain explanation when empty per §6.1). Review readback complete across all
  fields; primary CTA is **"Buat pertanyaan audit"**.

As each screen lands, add it to `PREVIEW_INTAKE_SURFACE` in
`src/app/audit/intakeSurface.ts`. Unconverted screens keep working through
the old renderer until replaced — the flow must stay runnable end to end at
every commit.

## Hard rules

- **Stop after S5.** Do NOT touch `PRODUCTION_INTAKE_SURFACE`, do NOT flip
  production, do NOT perform S6 or S7 (no deletions, no legacy-spec rewrites).
  The founder gates the flip separately.
- **The fence (§3):** no changes to `src/lib/audit/` logic, the
  `types.ts` schema, `workflow-authority.ts`, `measurement-matrix.ts`, any
  `/api/audit/*` route, providers, or extraction. New screens are
  presentation-only and take the same props the existing steps already take
  (`brief`, `extraction`, `workflowMeta`, `fieldErrors`, `busy`, existing
  callbacks: `updateBrief`, `onContinue`, `onBack`, `onScopeKindChange`,
  `onConfirmIdentity`, `onAcceptComparison`, `onGenerate`, `onEdit`, `onRun`).
- **Settled overrides (§3 table) beat the prototype:** market is never
  skipped; exactly one comparison target; needs/criteria are required min 1
  (chips arrive pre-selected so the minimum is already met); **Lanjut stays
  enabled** — pressing it surfaces the error and moves focus (R-17); a public
  source is mandatory.
- **No internal language in the UI:** banned strings include
  "saran dari ekstraksi", "Draft dari ekstraksi", "Terima saran Nuave",
  "Differentiator", "Konteks pasar", "Penawaran utama", "Pertimbangan
  keputusan" — plus prompt_ids, provenance, confidence, and schema names.
  The customer's own official source IS shown on brand-confirm.
- **Experience tests (§2):** one question per screen as `h1` in the
  customer's words; the answer is already present — tapping, not filling;
  one ~560px column; exactly one progress indicator and one Back.
- **Build rules (§6):** `@base-ui/react` primitives (radio-group, toggle,
  checkbox-group, collapsible). Do NOT run `npx shadcn add` — `components.json`
  is pinned to base-nova + @beui. Tabler icons only. CSS Modules over
  `src/styles/tokens.css` — **no raw `font-size`** (use `--type-*` roles;
  `check-typography` fails the build). Keyboard-operable, visible focus,
  correct ARIA, ≥44px touch targets. Bahasa Indonesia per `docs/VOICE.md`:
  `Anda`, `brand Anda`, `pesaing`, `model AI`, no em/en dashes in prose, the
  five verbatim labels never change. No external requests or fonts.
- Question review and its save transaction already shipped in S2 — do not
  rebuild them.

## Tests — required, not optional

- Extend `tests/e2e/intake-preview-journey.spec.ts` and
  `tests/e2e/intake-screen-contract.spec.ts` per §8: every converted screen
  gets contract coverage (no primary text input on single-choice screens;
  chips arrive selected; read-first readback with **Ubah** on every row;
  exactly one progress indicator and one Back; prohibited phrases absent).
- §6.2 requires an e2e assertion on the `BusinessBrief` POSTed to
  `/api/audit/prompts` after scripted select/remove/add — all three fields
  must carry exactly the expected values.
- `workflow-authority.test.ts` and `e1-workflow-navigation.test.ts` must pass
  **unchanged** — they pin the state machine. If a change seems to require
  editing them, you have left scope; stop and report instead.
- `npm run verify` must be fully green before declaring done. It runs
  offline — do not make live provider calls.

## Repo rules

- Branch from `origin/main`:
  `git checkout -b feat/spec-007-s3-s5-intake-screens origin/main`
- Commit your work on that branch when complete (the founder has authorized
  commits on this feature branch). Never push, never touch `main`.
- Do not modify `.env*` files. Note for manual testing only: live question
  generation requires `OPENAI_AUDIT_REASONING_EFFORT=low`
  (`.env.development.local` may carry `max` from earlier testing — the
  protected path fails closed with a 400 otherwise). The verify gate needs
  no keys.
- A separate branch `feat/spec-008-g1-facts-context` adds optional
  `service_areas` / `service_channels` to `types.ts` for unrelated Spec 008
  work — that is intentional divergence, not a bug; the intake does not
  collect these fields.
- Founder manual testing uses `/audit/v2/intake-preview?demo=1` (a seeded
  fictional brief that lands inside the flow without calling extraction).
  The demo-seed implementation lives on branch
  `feat/spec-008-g1-facts-context` — to reuse it on your branch:
  `git checkout feat/spec-008-g1-facts-context -- next.config.ts src/app/audit/v2/intake-preview/`
  (optional; e2e specs seed sessionStorage themselves and need nothing).

## Done means

Every screen in `INTAKE_SCREENS` renders the recovered surface on the preview
route; the journey runs end to end (intake → review → question review);
both preview specs cover all converted screens; `npm run verify` is green;
and you report: screens converted, files changed, test counts, and anything
deferred.
