# Nuave Intake Redesign — Design Rationale & Interaction Spec

> Governed by [`docs/V1_PRODUCT_CONTRACT.md`](./docs/V1_PRODUCT_CONTRACT.md).
> Revised 2026-08-29 to comply with it. Where this spec and the contract
> disagree, the contract wins.

## 0. The core reframe

The brief asks for "a better form." The stronger move is to stop collecting and
start **correcting**.

> The intake is not a form the user fills in. It is a draft understanding of
> their business that Nuave writes first, and the user edits.

Everything cascades from one input: the brand's website (or Instagram) URL.
Nuave reads it, produces hypotheses, and every subsequent screen is either
*confirm*, *correct*, or *add the one thing only you know*. The user's job
shifts from composition (high effort, error-prone) to recognition and correction
(low effort, and — crucially — corrections are higher-signal than blank-slate
answers, because the user reacts to something concrete).

This also solves the schema-exposure problem: the user never sees "entity scope"
or "decision criteria." They see Nuave's guess about their business and fix it.
Contract §3 makes this explicit — the schema does not define the UI, and one UI
interaction may normalize into several engine fields.

A second reframe: **the intake ends with a readback, then the ten questions —
not a submit button.** The last two screens are "Ini yang akan Nuave audit" (the
editable audit brief in plain language) and the generated question pack. This is
where trust is built and where residual ambiguity surfaces, and it is what
contract §8.10 and §8.15 require.

---

## 1. Information requirements, classified

The contract (§4) fixes what may appear in the UI: brand and scope, category and
offerings, why customers look, market when it matters, alternatives, and one
optional "must not misunderstand" input. Everything else is inferred.

| Information | Strategy | Notes |
|---|---|---|
| Brand name, logo, URL | **Auto-extract** | Shown as plain fact, confirm with one tap. Manual path only if wrong. No source or confidence label (§4). |
| Brand aliases / name variations | **Auto-derive** | Generated from the read + common misspellings; shown in readback only, editable there. Never a question. Load-bearing: unbranded questions must not contain any alias (§5). |
| Official sources | **Auto-derive** | Site and IG detected while reading; confirmed in readback. Never a question. |
| Entity type (company/branch/product…) | **Derived** | Falls out of the scope answer. Not asked. |
| Audit scope | **Select + conditional follow-up** | The one question the crawl cannot answer. Every branch must resolve to a precise entity (see §3). |
| Category | **Infer + confirm** | Specific over broad: "Kedai kopi susu chain," not "F&B." Recommended card + alternatives + write-your-own. |
| Products/services | **Extract + edit** | Removable chips, add fallback. >~15 items → representative groups, not exhaustive list. |
| Priority offering | **Inferred, not asked** | Contract §4 permits omission. The engine derives the lead offering from prominence in the source. Restore as UI only if generated questions prove badly focused. |
| Customer situations, needs, goals | **Infer + multi-select + add** | One screen. Customer-phrased ("ngopi enak dekat kantor"), not demographics. Feeds unbranded questions 2, 3, 4. |
| Decision criteria | **Merged into the above** | Contract §4 permits merging. Criteria chips and goal chips both answer "why customers look for something like this"; splitting them was schema leakage. No "paling menentukan" ranking. |
| Buyer vs user | **Dropped from UI** | Contract §4 permits omission. Inferred from segment language when it matters. |
| Age / demographics | **Never asked** | |
| Market scope | **Conditional screen** | Shown only when geography materially affects recommendation — i.e. physical locations were found, or the category is location-bound. Online-only businesses skip it entirely (§4). |
| Competitors | **Infer + confirm/remove/add** | Suggested rows with a one-line identifying description. Remove is signal. "Tidak ada pesaing langsung" is a valid explicit answer. No direct/alternative tagging — advanced disambiguation is deferred (§7). |
| Conversion action | **Dropped** | Contract §7: no dedicated conversion-action screen. It served factual/next-step questions that §5 removes from the default audit. |
| Must-be-true facts | **One optional free-text input** | Contract §4: *one lightweight, optional section*. Reduced from five prompt expanders + textarea to a single textarea with static examples as helper text. This is the only place free text is the right tool — it is information only the owner has. |
| "Market context" as its own field | **Dropped** | Fully derivable from category + scope + geography. |
| Regulated-category notes | **Inferred** | The category flag still reaches the engine; it no longer adds a UI prompt, because the "must not misunderstand" input already invites it. |
| Provenance / confidence / source timestamp | **Backend only** | Contract §4 forbids showing it. See §4 below. |
| Google Maps as a source | **Deferred** | Contract §7. Entry accepts website or Instagram in V1. |

---

## 2. Information architecture

Five moments, four visible chapters (segmented progress bar = 4 segments, above
persistent Back/Lanjut). Chapter interstitial screens are removed — each screen
carries a small chapter kicker instead, which gives the same orientation without
spending a tap.

**Bab 0 — Mulai (not shown as a chapter).** URL in → reading animation → the
"aha" moment: Nuave already knows you.

1. **Brand & yang Anda tawarkan** — "Is Nuave's understanding of *what you are*
   correct?" (brand → scope → category → offerings)
2. **Pelanggan Anda** — why customers look for something like this. One screen.
3. **Pasar & pembanding** — where you compete and against whom. Market screen is
   conditional.
4. **Sebelum audit** — the one optional correction, then the readback, then the
   ten questions.

Why this grouping matches the mental model: each chapter is a question a business
owner already knows how to answer about themselves (who am I / who buys from me /
who do I compete with / what must people get right about me). Chapters have
unequal screen counts by design. Micro-step counts are hidden.

Screen count, happy path: 9 (URL, reading, brand, scope, category, offerings,
customers, competitors, facts, readback, questions — 11 including the two
transient/terminal ones). Market adds one when applicable; scope adds one when
branch or product is chosen.

---

## 3. Screen-by-screen interaction spec

Persistent chrome on every screen: Back (text link, bottom-left), Lanjut
(primary, bottom-right), 4-segment progress directly above. One mental question
per screen; a screen may hold several controls if they form one thought.

Nothing except brand confirmation, scope, and category blocks Lanjut — contract
§8.7: missing non-critical information must not block the flow.

### Bab 0

**0.1 — "Dari mana Nuave bisa mengenal brand Anda?"**
- Single input: website URL or Instagram. Helper: "Nuave akan membacanya supaya
  Anda tidak perlu mengetik banyak."
- Google Maps links are not accepted in V1 (contract §7).
- Fallback link: "Mulai tanpa sumber" → manual-first mode: one screen asks brand
  name (+ optional city), then the same IA continues with screens degraded from
  *confirm* to *ask* (category gates progress, suggestions are
  category-conditioned).
- The flow is entered from a brief payment-success state ("Pembayaran berhasil"),
  shown for continuity only; checkout itself is out of scope.

**0.2 — Reading (transient, ~3s real / faked in prototype)**
- Progressive checklist: membaca situs → menemukan produk → memperkirakan
  pelanggan & pembanding. Sets up the correction loop that follows.

### Bab 1 — Brand & yang Anda tawarkan

**1.1 — "Ini brand yang ingin Anda audit?"**
- Identity card: logo, name, tagline, URL. No "Terdeteksi dari situs Anda" badge.
  Actions: **Ya, benar** / **Bukan, ganti**.
- "Bukan" → inline name+URL entry (re-read in real product).
- Engine receives: canonical brand entity, verified by user.

**1.2 — "Apa yang ingin Anda audit?"**
- Cards: Seluruh brand / Satu cabang atau lokasi / Satu produk atau layanan.
- **Cabang** → next screen: detected branch list (name + address, radio rows) +
  "Cari atau tambah cabang lain" (manual name/address). Engine receives an exact
  location entity, not "cabang tertentu."
- **Produk** → next screen: extracted offerings as selectable rows + add.
  Selection then *scopes* chapters 2–3: suggested customers/competitors
  regenerate for that product, and the header shows "Audit: [produk]" so context
  is never ambiguous.
- Engine receives: scope type + resolved entity ID.

**1.3 — "Bisnis Anda paling tepat disebut apa?"**
- Recommended specific category pre-selected + 3 plausible alternatives +
  "Tulis sendiri." The recommendation carries no "Rekomendasi Nuave" tag — it is
  simply the pre-selected option (contract §4).
- Specificity rule: the label must be usable in a customer-style AI query
  ("kedai kopi susu di Jakarta" works; "F&B" doesn't). It is the direct input to
  unbranded question 1, direct category recommendation.
- A regulated category sets a backend flag. No conditional UI follows.

**1.4 — "Ini produk Anda. Sudah benar?"**
- Extracted offerings as removable chips + add input. >~15 detected → show
  representative groups ("Minuman kopi (12 item)") with expand.
- **No priority selection.** The engine infers the lead offering, which feeds
  unbranded question 4 (offering recommendation for a specific use case).
- Engine receives: verified offering list.

### Bab 2 — Pelanggan Anda

**2.1 — "Kenapa pelanggan biasanya mencari yang seperti ini?"**
- One chip set, generated from the category, mixing customer situations and the
  things they weigh — because both answer the same question and the user does not
  distinguish them: "Ngopi enak dekat kantor", "Tempat nugas nyaman", "Harga
  masuk akal untuk harian", "Rasa yang konsisten". Multi-select + add.
- Top guesses pre-selected. No "Perkiraan" label; the affordance to remove is the
  message.
- No buyer-role follow-up. No ★ ranking. No age question anywhere.
- Optional — skippable. Engine receives the situation/need set that parameterizes
  unbranded questions 2, 3, and 4.

### Bab 3 — Pasar & pembanding

**3.1 — "Di mana pelanggan Anda berada?" (conditional)**
- Shown only when geography materially affects recommendation quality: physical
  locations were found, or the category is inherently local. Otherwise skipped
  and inferred (contract §4).
- Cards: Sekitar lokasi tertentu / Beberapa kota / Seluruh Indonesia / Juga di
  luar negeri.
- Location-bound choices → inline city selection: detected cities pre-chipped
  from branches, add by text. Then one disambiguation: "Pelanggan harus datang ke
  lokasi Anda?" (Ya, bisnis kami lokal / Tidak, kami juga melayani online). This
  separates "restaurant in Senopati" from "roaster that ships nationwide," which
  changes which unbranded questions are worth asking — it earns its place.
- Seluruh Indonesia / luar negeri → no further input. Country enumeration is
  deferred; the flag alone is enough for V1.

**3.2 — "Ini yang mungkin dibandingkan dengan Anda"**
- Suggested competitor rows: name + one-line identifying description, so "Fore
  Coffee — chain kopi nasional" is unambiguous on sight. Disambiguation lives in
  the *display*, not in a follow-up question.
- Row actions: keep (default) / remove. **No direct-vs-alternative tag** —
  contract §7 defers advanced competitor disambiguation; the engine classifies.
- Add by plain text. Entity search is deferred.
- Escape hatch: "Tidak ada pesaing langsung yang saya tahu" → valid signal;
  engine falls back to category-level alternatives for branded question 9.
- A removed suggestion is negative signal and must reach the engine as such.

### Bab 4 — Sebelum audit

**4.1 — "Apa yang tidak boleh salah dipahami tentang brand Anda?" (optional)**
- **One** textarea. Helper line gives examples rather than five separate inputs:
  "Misalnya: keunggulan yang sering terlewat, fakta harga, sertifikasi, istilah
  khas, atau kesalahpahaman yang sering terjadi."
- Contract §4 allows exactly one lightweight optional section here. The five
  prompt expanders in the previous revision were five questions wearing one
  screen's clothing.
- Whole screen skippable — richness must be invited, never forced.

**4.2 — Readback: "Ini yang akan Nuave audit"**
- Grouped summary in plain sentences: entity + scope, category, offerings,
  customer situations, market & competitors, the must-not-misunderstand note.
  Auto-derived items (aliases, official sources) appear here for the first time
  as editable rows — confirm-only cost. Aliases matter: they are what unbranded
  questions are screened against.
- Every group: "Ubah" link jumping back to its screen.
- CTA: **Buat pertanyaan audit** (settled label).

**4.3 — Question review: "Periksa pertanyaan audit"**
- Two labelled groups with visible counts, using the settled label strings:
  **Tanpa menyebut bisnis Anda** (6 pertanyaan) and **Menyebut bisnis Anda**
  (4 pertanyaan). The split is the product's core claim made legible —
  the first six measure whether the brand comes up on its own, the last four
  measure what AI says when asked directly.
- Each question editable in place. Editing an unbranded question re-screens it
  against the brand name and aliases; a violation is refused with a plain
  message, not a warning badge.
- CTA: **Jalankan audit** (settled label) — the explicit run required by
  contract §8.15.

---

## 4. Confidence model: none in the UI

The previous revision showed two states, Terdeteksi (extracted) and Perkiraan
(inferred). Contract §4 forbids both: provenance, confidence, and
extracted/inferred/user-supplied status must not be shown.

They are still recorded in the backend. What changes is the display:

- A high-confidence extracted fact is shown as **plain content with an edit
  affordance**. If Nuave is confident, it should just say the thing.
- A lower-confidence inference is shown as a **pre-selected, one-tap-removable
  option**. The removability *is* the honesty signal — it says "you may need to
  fix this" without ranking Nuave's own certainty at the user.
- Copy carries what the badge used to: "Hapus yang salah, tambah yang kurang."
- No "AI ✨" decoration anywhere. The intelligence shows up as pre-filled correct
  answers, not branding.
- Removal remains signal: a removed competitor ≠ a never-suggested competitor.

The bet behind the contract's rule is that a confidence label asks the user to
audit Nuave's epistemics, which is not their job and not something they can do
well. Correcting a concrete wrong answer is.

## 5. Edge-case handling (via model, not extra UI)

- **Many branches / franchise** → scope screen + branch resolution path;
  "seluruh brand" remains valid for the chain.
- **House of brands** → "Bukan, ganti" on 1.1 or product-scope on 1.2 targets the
  sub-brand.
- **Online-only** → no branches found → branch option hidden, and the market
  screen is skipped entirely rather than shown and defaulted.
- **Sparse site / Instagram-first** → 0.1 accepts IG; a low-yield read degrades
  screens from confirm→ask without changing the flow.
- **B2B+B2C** → multi-select customer situations covers both without a role
  question.
- **No competitors** → explicit checkbox, not an empty required field.
- **Wrong category inference** → alternatives + write-your-own on 1.3; category
  drives the customer-situation suggestions, so correction propagates.
- **Regulated industries** → backend flag; the optional facts input is where the
  owner raises compliance nuance if it matters.
- **Hundreds of products** → representative groups. No priority question.

## 6. Open product decisions

Settled by the contract and removed from this list: priority offering (omitted),
conversion action (removed), provenance display (forbidden), competitor
resolution source (plain string for V1), Google Maps (deferred).

Still open:

1. **Read latency.** If reading takes >10s, does Bab 1 start while it finishes in
   the background (progressive intake)?
2. **Market-screen trigger.** The rule "shown only when it materially affects
   recommendation" needs an implementable test. Proposed: show it when a physical
   address is found, or the category is in a location-bound set; otherwise skip.
   Needs review against real businesses.
3. **Manual-first (no website) path.** Same IA confirmed, but suggestion quality
   without a source read is untested. If it is poor, this path may need to ask
   rather than confirm on more screens.
4. **Save & exit / resume.** Assumed yes, not designed here.
5. **Unbranded screening strength.** Contract §8.12 requires no alias in any of
   the six unbranded questions. Whether alias screening is exact-match,
   normalized, or model-judged is an engine decision with a real false-negative
   cost.

## 7. Prototype

`intake-prototype.html` — single file, mobile-first (one column that widens to
560px at desktop), authored directly on Nuave's design system: the zinc token
set (`--bg-page`, `--border-default`, `--text-heading`, `--action`, …) with the
exact values engineering ships, Geist Sans only, the eight semantic type roles,
the 4/8/16/24/32/48/64 spacing scale, 6–14px radii, near-black action accent,
two-layer focus rings, 44px+ targets, and one ease-out curve at 150/250/400ms.
`prefers-reduced-motion` removes spatial motion. No provenance or confidence
metadata, no AI decoration; the only indeterminate indicator is the reading
screen, announced via `aria-live`.

Working locally: full navigation, conditional branch/product/market flows, chip
toggling, suggestion removal, competitor removal, live readback with editable
aliases, the 6+4 question review under the settled labels, in-place question
editing with client-side alias screening of unbranded edits, and 4-segment
progress.

All four required states are reachable without editing code, via the
"Prototipe" scenario select in the top bar (prototype chrome only, not product
UI) and via the real in-flow mechanisms:

1. **Sumber lengkap** — rich read of "Kopi Sudut"; the owner mostly confirms.
2. **Sumber tipis** — "Kopi Ruang Kecil," a quiet Instagram. Nuave commits to
   guesses (category, customer situations, category-level competitors, shown as
   pre-selected removable options) and asks only what materially matters
   (offerings become an ask screen with tappable suggestions). One plain
   sentence on the brand screen sets expectations; no confidence language.
3. **Brand keliru** — the read lands on "Kopi Sudut Pandang" (wrong business).
   "Bukan, ganti brand" opens an inline name+source correction, triggers a
   re-read, and returns to the confirm card. Nothing already entered is
   discarded. This path also works in every other scenario.
4. **Tanpa sumber** — "Mulai tanpa sumber" on the entry screen. One screen asks
   name and optional city; scope, category (gating), and the rest of the IA
   continue in ask mode with category-conditioned suggestions. Same flow, no
   questionnaire.

## 8. Contract compliance

Against [`docs/V1_PRODUCT_CONTRACT.md`](./docs/V1_PRODUCT_CONTRACT.md) §8:

| # | Criterion | Where |
|---|---|---|
| 1 | Begin from a supported source | 0.1 |
| 2 | Read evidence before asking | 0.2 precedes all context screens |
| 3 | Draft understanding produced | 1.1–1.4 are pre-filled |
| 4 | Confirm/remove/correct dominates | Every screen except 0.1 and 4.1 |
| 5 | No audit priority asked | Removed |
| 6 | No conversion-action screen | Removed |
| 7 | Missing info does not block | Only 1.1–1.3 gate Lanjut |
| 8 | No provenance/confidence in UI | §4 above |
| 9 | UI simpler than schema | Criteria merged into situations; priority, buyer role, conversion inferred or dropped |
| 10 | Editable readback before generation | 4.2 |
| 11 | Exactly 10 questions, 6+4 | 4.3 — **engine does not yet comply, see contract appendix** |
| 12 | No brand name/alias in the 6 | 4.3 re-screens edits; aliases surfaced at 4.2 |
| 13 | Branded ≠ spontaneous discovery | 4.3 labels the split explicitly |
| 14 | No irrelevant factual lookup | No conversion action, no hours/address path |
| 15 | Explicit run after review | 4.3 CTA |
| 16–19 | Audit and report behavior | Out of scope for intake — **not yet compliant, see contract appendix** |
