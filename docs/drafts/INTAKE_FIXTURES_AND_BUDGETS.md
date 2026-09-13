# Intake fixtures + budgets (Gate 0)

> Status: draft for Gate 0. Derives ONLY from sanitized recorded/test output
> listed in §0 — no live calls, no invented business facts. Business names and
> values below are pointers to existing prototype mocks or historical fictional
> fixtures, never new claims. No answer text, source content, or
> contact/payment data appears anywhere in this document.

## §0 Source register (what each fixture derives from)

| # | Source file | Lines used | What is reused |
|---|---|---|---|
| S1 | `intake-prototype.html` (1463 lines) | `SCENARIOS.lengkap` :757-778; `flow()` :878-890 | F1 rich shape: brand card, 3 branches, 3 products, 3 categories, 7 offerings, 7 customer chips, 4 competitors, 3 cities |
| S2 | `intake-prototype.html` | `SCENARIOS.tipis` :782-811 | F2 messy-thin shape: 2 detected + 4 suggested offerings (`offeringsAsk`), 5 customer chips, generic competitors, `thinNote` |
| S3 | `docs/drafts/00-journey-fixtures.md` (771 lines) | warnings :197-207; provenance enum :137-138; fiction rule :42-45 | F3 messy-conflict shape: `source_conflict` warning pair carried into review; provenance labels |
| S4 | `intake-prototype.html` | `SCENARIOS.keliru` :813-814 + :833-834; `applyBrandFix()` :1155-1170 | F4 wrong-identity shape: wrong brand card first, `s-brand-fix` re-read resolving to `lengkap` data |
| S5 | `intake-prototype.html` | `SCENARIOS.manual` :817-832; `enterIntake()` :1108 | F5 manual shape: no source, `p-manual` → intake starts at `s-scope`, `catSel:null`, all offerings suggested-only |
| S6 | `src/lib/audit/telemetry.ts` (437 lines) + `tests/e2e/forced-failure.spec.ts` (106 lines) | extract retry ceiling :66-72 (`extract: 2`); terminal-failure with retry/start-over :14-22, :50-57 | F6 preparation-failure shape: one retry then manual fallback; failure screen always offers two exits, never a dead end |
| S7 | `src/lib/intake/screens.ts` (50 lines) | canonical order :19-34 | Screen ids and sequence authority for all fixtures and funnel events |
| S8 | `docs/drafts/NUAVE_AIRBNB_INTAKE_PHASE0_CHECKPOINT.md` (72 lines) | §6 :49-54; §7 :56-58; Gate 0 package :64-65 | Budget caps (§6: normal path ≤10 + review; zero free-typing happy path) and funnel privacy rule (§7) |

Checkpoint §7 constraint honored throughout: funnel carries no answer text,
no source content, no contact/payment data.

---

## §1 Fixture specs (6)

Common contract for all six: every fixture ends at `s-review`
("Ini yang akan Nuave audit") with `Buat pertanyaan audit` enabled, i.e. all
blocking validations (`validate()`: brand confirmation, scope, category;
branch/product only when their conditional screen was shown) satisfied.
`s-crawl` and `s-brand-fix` are transition/correction overlays and never
count toward the screen budget (§3.1). "Routable, no dead end" means: from
every screen in the fixture path, Kembali/Lanjut or a stated fallback reaches
`s-review`.

### F1 — Rich case (source: S1)

- **Derives from:** `SCENARIOS.lengkap` verbatim (brand, 3 branches, 3 products, categories, offerings, customers, competitors, cities as mocked there).
- **Path:** `s-brand` (confirm Ya) → `s-scope` (=brand, whole-brand) → `s-category` (preselect index 0) → `s-offerings` (confirm mode: 7 detected chips, remove/add) → `s-customers` (4 on / 3 off as mocked) → `s-market` (3 city chips preselected) → `s-competitors` (4 kept) → `s-facts` (skipped, optional) → `s-review`.
- **Expected corrections:** ≤2 taps each (remove chip, toggle chip); zero free-typing on the happy path.
- **Exit:** all blocks satisfied → `s-review` builds all six readback rows; aliases row shows the two mocked aliases.

### F2 — Messy, thin source (source: S2)

- **Derives from:** `SCENARIOS.tipis` verbatim (`thinNote` shown on `s-brand`; `offeringsAsk:true`; competitors are generic placeholders per the mocked `compLead`).
- **Path:** same as F1, except `s-offerings` is in ask mode (2 detected chips + 4 unselected suggestions to tap) and `s-competitors` shows the "belum menemukan pembanding" lead.
- **Why messy:** category, customers, and competitors are Nuave guesses the owner must actively prune; offerings require positive selection, not just confirmation.
- **Exit:** identical to F1 — ask-mode selections still satisfy `validate()`; review row for offerings reflects tapped suggestions; no dead end (Lanjut never blocked on these screens).

### F3 — Messy, source conflict (sources: S3 + S1)

- **Derives from:** F1 data for all screens + the `source_conflict` warning shape from `00-journey-fixtures.md` Fixture A (`field`, `message`, per-source `versions[]`, values reused as-is from that frozen record).
- **Path:** identical screens to F1; the conflict does not add a screen.
- **How it surfaces:** as one extra readback row in `s-review` ("Perbedaan sumber: <field> — <version A> vs <version B>") with an Ubah link back to the owning screen. Provenance shown backend-side only, using the frozen enum (`found_website`, `suggestion_nuave`, …); no provenance badges in UI.
- **Exit:** conflict is advisory, never blocking → `s-review` → questions. Resolving or ignoring it both route forward.

### F4 — Wrong / ambiguous identity (source: S4)

- **Derives from:** `SCENARIOS.keliru` verbatim (wrong brand card first; correction resolves to `lengkap` data per `applyBrandFix()`).
- **Path:** `s-brand` shows the wrong card → owner taps "Bukan, ganti brand" → `s-brand-fix` (name + optional source; prior inputs preserved) → `s-crawl` re-read → `s-brand` shows the corrected card → continue as F1 from `s-scope`.
- **Ambiguity rule:** `s-brand` selection is reset on every render, so a wrong card is never silently pre-accepted; Lanjut stays disabled until explicit "Ya, benar".
- **Exit:** after re-read, identical to F1; the fix path adds zero permanent screens (overlay only).

### F5 — Manual fallback, no readable source (source: S5)

- **Derives from:** `SCENARIOS.manual` verbatim (entered via `p-manual`: name + optional city; intake starts at `s-scope`, skipping `s-brand`).
- **Path:** `s-scope` → `s-category` (no preselection, `catSel:null` — owner must pick or write one) → `s-offerings` (ask mode, all six suggested-only) → `s-customers` → `s-market` (single city chip from manual city) → `s-competitors` (generic lead) → `s-facts` → `s-review` (aliases row: "Tidak ada"; sources row: "diisi manual").
- **Exit:** category is the only added blocking choice (already a blocking field); everything else follows F2 ask-mode rules → `s-review`, no dead end.

### F6 — Preparation failure (sources: S6)

- **Derives from:** the `extract: 2` retry ceiling (one retry, then manual entry) and the forced-failure pattern (terminal failure screen with retry + start-over, no success representations).
- **Path:** `s-crawl` attempt 1 fails → inline failure notice on `s-crawl` with two buttons: "Coba lagi" (attempt 2, last automatic-level retry) and "Isi manual" (→ F5 path at `s-scope`). If attempt 2 fails → auto-route to F5 path with a notice; "Coba lagi" is not offered a third time.
- **No-dead-end guarantee:** at every failure state at least two forward exits exist (retry / manual); the manual exit preserves anything already entered. Mirrors the forced-failure spec: failure states must not show success representations and must always offer retry + start-over equivalents.
- **Exit:** via retry-success (→ F1/F2 path at `s-brand`) or via manual (→ F5 path) — both terminate at `s-review`.

---

## §2 Privacy-safe funnel event list

Allowed in every event: `session_id` (random, single-tab), `screen_id`
(from S7 canonical order), event name, timestamp, per-screen active ms,
counters/booleans (correction count, retry count, `completed` flag).
**Never:** answer text, field values, source content/URLs, brand names,
contact or payment data. (Cost-ledger telemetry in `fixtures/telemetry.ts`
stays server-side and is not part of this funnel.)

| # | Event name | Trigger point |
|---|---|---|
| E1 | `intake_started` | First intake screen shown (`s-crawl`, or `s-scope` for F5 manual) |
| E2 | `intake_screen_viewed` | Each intake screen becomes visible (one per screen id; overlays `s-crawl`/`s-brand-fix` included with their own ids) |
| E3 | `intake_continued` | Lanjut tapped and the next screen shown (pairs with the preceding E2) |
| E4 | `intake_validation_failed` | Lanjut tapped while `validate()` blocks (only brand/scope/category/branch/product can emit this) |
| E5 | `intake_answer_corrected` | A prepared answer is changed (chip removed/added/toggled, competitor removed, card re-picked, brand fix submitted, question edited later). Count only — never what changed |
| E6 | `intake_resumed` | Existing per-screen draft rehydrated into a screen (intake-owned draft key only; canonical record untouched until review-confirm) |
| E7 | `intake_completed` | `s-review` confirmed (`Buat pertanyaan audit` tapped with all blocks satisfied) |

Derived metrics (counts/ratios over the above, no new payload): drop-off per
screen (E2 without following E3), correction rate (E5 ÷ E7, §3.4), validation
friction (E4 per blocking screen), resume rate (E6 ÷ E1).

---

## §3 Journey budgets

### 3.1 Screen-count cap: ≤10 + review

- At most **10 content screens before `s-review`**, plus `s-review` itself.
  (`s-questions` sits after review-confirm and is outside the intake budget.)
- `s-crawl` (transition) and `s-brand-fix` (correction overlay) are excluded.
- Happy path (scope=brand): `s-brand, s-scope, s-category, s-offerings, s-customers, s-market, s-competitors, s-facts` = 8 + `s-review`. Worst normal path adds exactly one of `s-branch`/`s-product` (scope picks at most one) = 9 + `s-review`. `s-market` is skipped for shipped products, which only reduces the count. Headroom: 1 screen; any new screen needs founder approval (checkpoint §6).
- `s-facts` is optional but counts as shown; it is never removed to save budget — it is skipped by the user, not by the journey.

### 3.2 Happy-path active-time target: ≤10% over timed static-prototype baseline

- **Baseline measurement method** (run against the frozen `intake-prototype.html`, scenario `lengkap`, scope=brand, desktop viewport 1280px, no devtools throttle):
  1. Operator follows the fixed script: confirm brand → scope=brand → keep preselected category → remove nothing → continue through customers/market/competitors with defaults → skip `s-facts` → reach `s-review`.
  2. Record wall-clock per screen with a stopwatch; subtract the two deterministic prototype timers (`runScan` 2200ms, `runCrawl` 2400ms — code constants, system-wait, not active time). The remainder is active time.
  3. Repeat N=5; `T_base` = median total active time. System-wait floor is fixed at 4.6s and is not part of the active budget.
- **Budget:** `T_active ≤ 1.10 × T_base` on the same script and setup.
  `T_base` is unmeasured as of this draft (no human trial has been run; no value is fabricated here) — running the method above and filling in `T_base` is a Gate 0 entrance requirement, after which the 10% rule binds numerically. Worked arithmetic, not a claim: if `T_base` measures 150s active, the budget is 165s active (+ 4.6s fixed system wait).
- Typing metric (checkpoint §6, stands alongside the time budget): happy path needs zero free-typing; every prepared answer correctable in ≤2 taps.

### 3.3 Fixed deterministic recovery script (F6), with active vs system-wait split

| Step | What happens | Active (user) | System-wait |
|---|---|---|---|
| R1 | `s-crawl` attempt 1 runs to failure | 0 | one preparation wait (prototype `runCrawl` schedule, ≈2.4s) |
| R2 | Failure notice shown; owner reads and taps "Coba lagi" or "Isi manual" | read + 1 tap | 0 |
| R3 | If retry: `s-crawl` attempt 2 (exactly one failed attempt + one retry, per `extract: 2`) | 0 | one preparation wait (≈2.4s) |
| R4 | Attempt 2 fails → auto-route to F5 manual path with notice; no third retry offered | continue as F5 | 0 |

Budget: recovery adds at most 2 system-waits (≈4.8s) + one read-and-tap (≈R2, counted against `T_active`). Recovery never adds content screens (manual path reuses F5 screens within the §3.1 cap).

### 3.4 Correction rate: observed, not optimized

- Definition: `E5 events ÷ E7 completions`, overall and per screen.
- Recorded only. No target, no threshold, no optimization goal: a high rate means the correction loop is working (checkpoint: intake is a correction loop, not a form), and optimizing it down would punish the behavior the journey is designed to invite. Per-screen rates may inform copy tweaks after Gate 1; they never gate launch.
