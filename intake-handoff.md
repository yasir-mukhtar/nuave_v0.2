# Intake handoff brief — read alongside intake-redesign-spec.md + intake-prototype.html

For the implementing agent. The spec explains *why*; the prototype shows *feel*.
This file states what's real, what's fake, and what's decided.

> Governed by [`docs/V1_PRODUCT_CONTRACT.md`](./docs/V1_PRODUCT_CONTRACT.md).
> Revised 2026-09-01 to comply with Spec 007 and the contract. Spec 007 owns
> the runnable V1 intake and wins over anything here.

## Design intent in one line

The intake is a correction loop, not a form: read the user's URL first, present
Nuave's draft understanding, let the owner confirm/correct/add — then show the
ten questions before anything runs. Never expose internal schema terms, and
never expose how sure Nuave is.

## Locked decisions (don't relitigate)

1. **IA:** Bab 0 (URL + read) → 1 Brand & yang Anda tawarkan → 2 Pelanggan → 3
   Pasar & pembanding → 4 Sebelum audit (fakta opsional → readback → 10
   pertanyaan). 4-segment progress, hidden micro-steps, persistent
   Kembali/Lanjut. No chapter interstitial screens — a kicker on each screen
   does the same orientation work without a tap.
2. **Chapter 4 is one optional textarea**, not five prompt expanders. Contract §4
   allows exactly one lightweight optional section for "something Nuave must not
   misunderstand." Examples go in the helper line, not into separate inputs.
3. Flow ends with an **editable readback** ("Ini yang akan Nuave audit") and then
   a **question review** ("Periksa pertanyaan audit") showing 6 + 4 under the
   settled group labels **Tanpa menyebut bisnis Anda** / **Menyebut bisnis
   Anda**. The readback CTA is **Buat pertanyaan audit**; the final CTA is
   **Jalankan audit**. These four strings are settled copy, do not paraphrase.
4. **No confidence or provenance in the UI at all.** No Terdeteksi/Perkiraan
   badges, no "Rekomendasi Nuave" tag, no source labels, no AI decoration.
   Confident facts are shown as plain editable content; inferences are shown as
   pre-selected, one-tap-removable options. Metadata is still stored backend-side.
5. **Never asked:** age, "market context", entity type, brand aliases, official
   sources, audit priority, priority offering, buyer-vs-user role, conversion
   action. Aliases and sources are auto-derived and confirmed in the readback
   only.
6. **Conditional-only screens:** branch resolution (cabang scope), product
   resolution (produk scope), market (only when geography materially affects
   recommendation — physical location found or location-bound category).
7. Every vague selection must still resolve: cabang→exact branch entity,
   produk→exact product (and later screens re-scope to it), kota→named cities +
   location-bound flag.
8. Copy is Bahasa Indonesia, phrased in the owner's language (see prototype for
   tone).
9. **Nothing blocks Lanjut except brand confirmation, scope, and category.**
   Contract §8.7.

### Superseded by the contract (was locked, now isn't)

| Previously locked | Now |
|---|---|
| Bab 1 named "Konfirmasi brand" with a conversion-action screen in Bab 4 | Conversion action removed entirely (contract §7) |
| Two confidence states shown in UI | No confidence shown (contract §4) |
| Chapter 4 = prompt-chip expanders + textarea | One optional textarea (contract §4) |
| Priority offering radio on the offerings screen | Inferred, no UI |
| Separate goals screen and criteria screen with ★ ranking | Merged into one "kenapa pelanggan mencari yang seperti ini" screen |
| Buyer-vs-user conditional on split-role segments | Dropped; inferred |
| Competitor direct/alternative tag toggle | Dropped; engine classifies (contract §7) |
| Google Maps link accepted at 0.1 | Website or Instagram only (contract §7) |

## Design system

The prototype is authored directly on the shipped design system so engineering
can map it mechanically: the zinc custom-property set with production values
(`--bg-page`, `--bg-surface`, `--border-default`, `--text-heading`, `--action`,
…), Geist Sans only, the eight semantic type roles at the sanctioned sizes,
4/8/16/24/32/48/64 spacing, 6/8/10/14 radii (pills for chips only), near-black
action accent with status green confined to the payment/done checkmarks,
hairline cards with at most `0 1px 2px rgba(0,0,0,0.05)`, two-layer focus
rings, 44px+ targets, one ease-out curve at 150/250/400ms, and
`prefers-reduced-motion` support. Component mapping: option cards and radio
rows → shadcn RadioGroup-style compositions; chips → Toggle/Badge-as-button
pills; add lines → Input + outline Button; readback rows → Field + Separator;
the scenario select in the top bar is prototype chrome, not product UI. No
provenance, confidence, or AI decoration anywhere; the reading screen is the
only indeterminate indicator and is announced via `aria-live`.

## Fake in the prototype → real behavior expected

- Reading screen is a ~2.4s timer per scenario → real read of site/IG; all
  suggestion lists (offerings, branches, categories, customer situations,
  competitors, cities, aliases, sources) come from the read plus
  category-conditioned generation. All mocked data is coffee-category.
- Payment success is a static entry state → real post-checkout redirect.
- All four required states are demonstrated: successful extraction ("Kopi
  Sudut"), thin evidence ("Kopi Ruang Kecil": committed guesses pre-selected,
  offerings degraded to ask), wrong-brand correction (inline name+source fix,
  then a re-read that in the prototype always resolves to the sample data), and
  manual fallback ("Mulai tanpa sumber": name + optional city, then ask-mode).
  The "Prototipe" select that jumps between them is inspection chrome only.
- Manual-path suggestions ignore the typed name/category and reuse the coffee
  sets → in the real product they are generated from name + chosen category.
  Aliases in manual mode are empty in the prototype → really derived from the
  typed name.
- The 10 questions are hardcoded templates parameterized by brand, city, and
  first kept competitor → generated per contract §5 (6 unbranded testing
  category recommendation, situation, need/criterion, offering use case,
  shortlist, comparison; 4 branded testing fit, explicit recommendation,
  competitor comparison, trade-offs).
- Editing an unbranded question is re-screened client-side by case-insensitive
  substring match against brand + aliases, refused with a plain message → the
  real product needs contract §8.12-strength screening (see open decision 5).
- Competitor add is a plain text append → stays plain text for V1; entity search
  is deferred (contract §7).
- Category alternatives are hardcoded → generated, specific enough to be usable
  in a customer-style AI query.
- The market screen's conditional logic is real in shape (skipped for
  nationally-shipped product scopes) but its trigger is mocked → implementable
  test is open decision 2.
- No persistence/save-and-exit, no back end.

## Data contract — what the engine must receive

```
brand:        { name, url, verified: bool, aliases[], sources[] }
scope:        { type: brand|branch|product, entity: {id/name, address?|productName?} }
category:     { label (specific), regulated: bool }
offerings:    { items[], leadOffering: inferred }
customers:    { situations[], removedSuggestions[] }
market:       { shown: bool, type: local|cities|national|global,
                cities[]?, locationBound?: bool }
competitors:  { items: [{name, context}], removedSuggestions[], noneKnown: bool }
facts:        { freeText? }
```

Notes:

- `removedSuggestions` matters everywhere it appears: a dismissed suggestion is
  negative signal, keep it.
- `leadOffering`, `buyerRole`, `decisionCriteria`, and the regulated flag are
  **inferred, not collected**. They may exist as engine fields; they have no UI.
- `conversion` is gone from both UI and this contract.
- Provenance/confidence per field may still be stored — just never rendered.
- `market.shown: false` means the screen was correctly skipped, not that the
  user declined to answer. The engine should distinguish these.

## Open decisions (flag, don't silently pick)

1. Progressive intake if the source read takes >10s (start Bab 1 while it
   finishes)?
2. The implementable test for "market materially affects recommendation."
   Proposed: physical address found, or category in a location-bound set.
3. Suggestion quality bar for the no-website path — may need to ask rather than
   confirm on more screens.
4. Save & exit / resume — assumed yes, not designed.
5. Alias screening for unbranded questions: exact-match, normalized, or
   model-judged.

## Resolved by Spec 007

The former conflict between the intake contract's 6/4 structure and the
pre-A3 implementation is resolved by the founder-approved and landed
[`Spec 007`](./specs/007-intake-airbnb-revamp/SPEC.md). Its R-01/R-02 canonical
matrix defines ten fixed slots: 6 unnamed and 4 named; slot 9 also requires a
comparison target and a comparison relation. R-10 keeps wording edits inside a
slot and blocks changes to slot identity, category, declared purpose, identity
policies, comparison-target policy, or composition; undetectable purpose drift
warns and proceeds in V1 without model-assisted validation.

This handoff therefore contains no unresolved 5/5-versus-6/4 decision. New
intake work must follow Spec 007 and the matrix implementation it names. The
supported source inputs remain the official website and Instagram; Google Maps
is deferred.

## Success bar (from the original brief)

Not "simpler than the current form" but: a business owner can give rich, precise,
audit-ready context with remarkably little thinking and typing — and the engine
receives an unambiguous entity + context at every stage.
