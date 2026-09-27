# Spec 013: Airbnb-style intake journey

> Status: **Draft**. The founder approves it before any J2 work starts.
> Owner: orchestrator
> Updated: 2026-09-27
> Implements: Stage 1 of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md)
> (milestones J2–J7 and JQ)
> Decision basis: plan §4.1 ("done" for the journey), the three 2026-09-27
> entries in [`docs/DECISION_LOG.md`](../../docs/DECISION_LOG.md), and the
> founder's J1 decisions F1–F18 on
> [PR #94](https://github.com/yasir-mukhtar/nuave_v0.2/pull/94)
> (recorded in the decision log, 2026-09-27)

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/PAYING_CUSTOMER_PLAN.md`: §4.1 and §5 Stage 1
3. This spec
4. [PR #94](https://github.com/yasir-mukhtar/nuave_v0.2/pull/94) description,
   sections A–C: the screen-by-screen comparison with file and line
   references. Section F there is superseded by this spec wherever they
   differ.
5. `specs/011-smart-consultant-intake/SPEC.md`: "Settled product decisions"
   and "Requirements". This spec changes Spec 011's screens, not its rules.
6. The references: `intake-prototype.html` (primary),
   `docs/drafts/nuave-intake-design-workbench.html` (secondary, only where
   this spec names it)
7. Code for your slice: `src/lib/intake/SmartIntakeJourney.tsx`,
   `SmartSummary.tsx`, `smart-intake-contract.ts`, `smart-session.ts`,
   `src/lib/audit/direct-ten-context-v2.ts`; parts donors
   `src/lib/intake/IntakeJourney.tsx`, `screens-bab1.tsx`, `screens-bab2.tsx`
8. `.agents/skills/verify-nuave/` and `tests/e2e/journey.ts`

Do not load: `archive/`, old checkpoints, other drafts, or the PR #58 design
as a reference (its code is a parts donor only).

## Problem

**Evidence (J1, PR #94):** today's `/audit` asks everything on one dense
summary page, with a separate clarification stage for missing required
answers (`smart-session.ts:37`). The founder's reference asks one question
per screen, with Back/Continue and chapter progress. Today's page holds
several rules the reference lacks or loosens: row-level source labels, a
three-way competitor choice, four service channels, strict market rules,
single-target product focus, required location address, and required-field
checks. The business's other names (aliases) are used but shown nowhere.

**Interpretation:** the owner should get the reference's calm, one-step-at-a-
time feel without losing any information or rule that today's intake keeps.

## Desired outcome

An owner goes from their business name and website to approved audit
questions through short screens in the prototype's order. Nuave's prepared
answers are already selected, so an owner with a rich website mostly taps
"Lanjut". Everything is confirmed once, on a review screen. Nothing today's
intake asks for or passes to question generation and the report is lost.

## User and situation

The owner or marketing lead of a small or medium Indonesian business, on a
phone or a laptop, entering their own business for the first time. In Stage 1
the journey is free and has no payment step; the founder tests it with real
businesses (plan §5, JZ).

## Scope

- The screens from the `/audit` entry to the question-review screen.
- One extension to the existing preparation call: published locations and
  focus-specific category suggestions (R-24).
- Updates to the `verify-nuave` journey and tests for every new screen.

## Non-scope

- Payment, the order summary, email, and the pre-payment reveal and price
  screens (Stage 2, S3/S4).
- The no-website path, `p-manual` (F3: Stage 2).
- Google Maps as a source (F16).
- The audit method: question generation, the locked all-unnamed ten-question
  pack, observations, and the report (F17).
- Keeping answers when the owner changes the website (F4: the website change
  resets preparation, as today).
- Any rule that skips the market screen (F9: none).
- Whether the owner must answer target customer, customer needs, buyer
  considerations, competitors and differentiator, or only be asked. That is
  decided at the start of JQ.
- A new AI call, a new retrieval step, or a new data store.

## Experience

Headings and helper copy come from the prototype unless this spec says
otherwise. The founder reviews final wording at JZ.

| # | Screen | Heading (prototype) | Required? | Decision |
|---|---|---|---|---|
| **Chapter 1** | **Brand Anda** | | | |
| 1 | Entry: business name + website or Instagram, `Periksa` | (today's entry) | Yes | F2, F16 |
| 2 | Reading: step-by-step progress while Nuave reads | "Sebentar, Nuave sedang membaca" | — | F15 |
| 3 | Brand confirm | "Ini brand yang ingin Anda audit?" | Yes | F4, F15 |
| **Chapter 2** | **Yang diaudit** | | | |
| 4 | Focus: whole brand, one location, one product | "Apa yang ingin Anda audit?" | Yes | F6, F7 |
| 5a | Location (only for location focus) | "Cabang mana yang ingin diaudit?" | Yes | F7 |
| 5b | Product (only for product focus) | "Produk atau layanan mana?" | Yes | — |
| 6 | Category | "Bisnis Anda paling tepat disebut apa?" | Yes | F18 |
| 7 | Offerings | "Ini produk Anda. Sudah benar?" | Yes, except product focus | F8 |
| **Chapter 3** | **Pelanggan Anda** | | | |
| 8 | Customer needs | "Kenapa pelanggan biasanya mencari yang seperti ini?" | Opsional | F12 |
| 9 | Service channels (workbench `service` screen) | (workbench copy) | Yes | F10 |
| 10 | Market (not for location focus) | "Di mana pelanggan Anda berada?" | Yes | F9 |
| 11 | Competitors | "Ini yang mungkin dibandingkan dengan Anda" | See R-18 | F11 |
| 12 | Public fact | "Apa yang tidak boleh salah dipahami tentang brand Anda?" | Opsional | F12 |
| **Chapter 4** | **Periksa** | | | |
| 13 | Review: the single confirmation | "Ini yang akan Nuave audit" | — | F5, F13, F14 |
| 14 | Question review (unchanged) | (today's screen) | — | F17 |

After JQ, screens for target customer, buyer considerations and
differentiator join chapter 3; until then those answers live on the review
screen (R-20).

## Requirements

**Navigation and state**

- **R-01:** One question per screen, in the order above. Every screen from 3
  to 13 shows the chapter progress, `Kembali`, and `Lanjut`. Browser Back
  behaves like `Kembali`.
- **R-02:** Every prepared proposal arrives already selected and carries
  exactly one of `Dari website Anda`, `Saran Nuave`, or `Dari Anda`, as
  today. Any owner change makes it `Dari Anda` (F5).
- **R-03:** `Lanjut` is disabled only while a required answer on that screen
  is missing or invalid, by today's rules: a category; at least one offering
  (except product focus); the product target; location name **and**
  address; at least one service channel; market reach and areas under
  R-16. Optional screens are labelled `Opsional` and never block. The
  prototype's `need` map is not the contract (F1, F12).
- **R-04:** Answers on screens 3–12 are working answers, saved in the
  session: a refresh returns to the same screen with the same answers.
  Nothing is confirmed until the review action (R-21).
- **R-05:** Changing an earlier answer keeps the later answers it does not
  invalidate. Switching focus keeps today's retention of the whole-brand
  market (`retainedBrandReach`, `retainedBrandAreas`).

**Entry, reading and brand**

- **R-06:** The entry keeps both fields, business name and website or
  Instagram (F2). No copy offers Google Maps (F16).
- **R-07:** The reading screen shows step-by-step progress while the
  existing identity and preparation calls run. It claims no result before
  they return. Synthetic mode stays visibly labelled.
- **R-08:** An unreadable or unsafe website stays an error on the entry
  screen, as today. A thin website continues, with today's no-usable-text
  note shown on the brand-confirm screen (F15).
- **R-09:** The brand-confirm screen shows the typed name, the discovered
  name when different, and the website. `Ubah nama` corrects the name and
  keeps every other answer (today's inline correction). Changing the website
  returns to the entry screen and resets preparation (F4).

**Focus and target**

- **R-10:** The focus screen shows cards for whole brand, one location, and
  one product or service. Whole brand is pre-selected and labelled
  `Saran Nuave` (F6). The one-location card appears only when preparation
  found at least one published location; otherwise the screen offers a
  secondary link to enter a location by hand (F7).
- **R-11:** The location screen lists the found locations (name and address)
  to pick one, and offers a manual form in which both name and address are
  required (the workbench's manual panel, F7).
- **R-12:** The product screen lists the prepared offerings to pick one, or
  lets the owner type one, as today.

**Business details**

- **R-13:** The category screen shows up to three suggested categories that
  fit the chosen focus, the prepared one pre-selected, plus "write your own"
  (F18). With no suggestions, it shows the prepared category and "write your
  own".
- **R-14:** The offerings screen, for whole-brand or location focus, is
  editable (remove, add, at least one). For product focus, the audit input
  stays the chosen product alone, as today, and the rest of the catalogue is
  shown read-only as context (F8).
- **R-15:** The service-channel screen offers the four choices: at your
  location, at the customer's location, delivered, used online. At least
  one is required; prepared channels arrive selected (F10).
- **R-16:** The market screen offers the four reach cards and, for
  `sekitar` and `beberapa`, the area choices, under today's rules. It is not
  shown for location focus. `sekitar` needs exactly one area; `beberapa`
  needs one to eight; `seluruh` and `luar` take no areas. Spec 011's
  regional limit applies: never pick the first or largest eight areas,
  invent a wider region, or raise the reach to pass the check. An
  unsupported reach stays empty for the owner to choose. There is no skip
  rule (F9).

**Customers and competitors**

- **R-17:** The customer-needs screen is optional. Prepared needs appear as
  tappable chips, plus "add your own". This replaces today's
  semicolon-separated text field (F12).
- **R-18:** The competitor screen offers three choices: named competitors
  (suggestions plus "add", up to five), "no direct competitor", and "don't
  know yet". The default stays today's: "don't know yet" (F11; open
  question 2). If the owner picks named competitors but adds none, the screen
  asks for a name or another choice. Today that case is silently saved as
  "don't know yet"; this is the one tightening. Otherwise `Lanjut` never
  blocks on this screen until JQ decides otherwise.
- **R-19:** The public-fact screen stays optional, with today's privacy
  check.
- **R-20:** Until JQ, target customer, buyer considerations and
  differentiator keep their prepared values and stay editable in an
  `Opsional` section on the review screen. No slice may remove them, or the
  code that passes them on (plan §5, JQ).

**Review and questions**

- **R-21:** The review screen is the only confirmation. It reads back every
  answer with its source label. Each row has `Ubah`, which opens that screen
  and returns to review. It includes an editable "Nama lain" (aliases) row
  and the `Lihat sumber` links (F13, F14). The action keeps today's exact
  label, `Sudah sesuai — buat pertanyaan audit`, and calls today's
  confirmation and freeze unchanged. If a required answer is missing, the
  review points to the screen that needs it; the separate clarification
  stage is removed.
- **R-22:** Edited aliases are frozen as `identity.aliases` (up to twelve),
  pass today's privacy check, and are used by the existing question
  screening. No other frozen-context field changes meaning.
- **R-23:** Question review, audit start, the run and the report are
  unchanged (F17). The old summary page is removed once the review screen
  exists; `/audit` stays the only intake.

**Preparation**

- **R-24:** Preparation stays one identity check plus one extraction call.
  Its output gains: (a) up to eight locations the business publishes, each
  with name and address; (b) up to three category suggestions for the whole
  brand; (c) one short category suggestion per offering, for product focus.
  Anything not supported by the website stays empty; nothing is inferred.
  Location focus uses the whole-brand suggestions (open question 1).
- **R-25:** The privacy check covers every new input and prepared value, as
  today (F14).
- **R-26:** A stored session from before a slice restarts safely, as today
  (a version change, never a crash or a mixed state).

**Quality**

- **R-27:** Each screen works with the keyboard, moves focus to its heading
  on arrival, and fits a 320 px wide phone with no sideways scrolling.
  Customer copy is Indonesian (`docs/VOICE.md`).
- **R-28:** Each slice extends `tests/e2e/journey.ts` and the matching
  `verify-nuave` feature, and the whole path passes in synthetic mode.

## Failure and recovery

- **Website unreadable, unsafe or blocked:** error on entry; nothing
  prepared is kept (R-08).
- **Preparation fails or times out:** the reading screen returns to entry
  with today's message; typed name and website are kept.
- **Privacy stop:** today's calm message on the screen with the problem
  input; nothing is saved from it.
- **Refresh or tab restore mid-journey:** same screen, same working answers
  (R-04). An incompatible stored session restarts at entry (R-26).
- **Question generation fails:** unchanged from today.
- Never fill a missing required answer from a guess, a larger area, or a
  default the owner did not see.

## Evidence, data, privacy, and cost

- Source labels stay row-level and truthful (R-02).
- Locations are public business addresses the website publishes (AGENTS rule
  11). No personal data is added.
- Cost: no new call. The one extraction call returns a little more text,
  inside today's per-call limits and the USD 5 per-session ceiling.
- Agents make no live AI call without a named founder approval. The founder's
  own runs (JZ) are the live check for R-24.

## Acceptance criteria

- **AC-01:** In synthetic mode, an owner goes from entry to question review
  through screens 1–13 in order, with `Kembali` and `Lanjut` and chapter
  progress (R-01).
- **AC-02:** With the rich synthetic preparation, every required screen
  arrives with its answer selected and the owner reaches review by tapping
  `Lanjut` only (R-02, R-03).
- **AC-03:** Each required screen blocks `Lanjut` when its answer is
  removed, and each optional screen never blocks (R-03).
- **AC-04:** Refreshing on any screen from 3 to 12 returns to it with the
  same answers (R-04).
- **AC-05:** `Ubah nama` on brand confirm keeps every later answer; changing
  the website resets preparation (R-09).
- **AC-06:** With no found locations, the location card is hidden and the
  manual link still leads to a form that requires name and address. With
  found locations, picking one fills both (R-10, R-11).
- **AC-07:** Under product focus, the offerings screen shows the rest of the
  catalogue read-only and the frozen offerings are the chosen product only
  (R-14).
- **AC-08:** The market screen enforces the `sekitar`, `beberapa`,
  `seluruh` and `luar` rules and is absent under location focus (R-16).
- **AC-09:** The competitor screen freezes each of its three choices
  distinctly, and "named" with no name cannot continue (R-18).
- **AC-10:** Target customer, buyer considerations and differentiator are
  editable on review and reach the frozen context (R-20).
- **AC-11:** On review, every `Ubah` returns to review. An edited alias
  reaches `identity.aliases`. The confirmation label is exact (R-21, R-22).
- **AC-12:** The frozen context for the same answers is the same as today's,
  apart from edited aliases (R-22).
- **AC-13:** Sensitive text in any new input is stopped with today's message
  (R-25).
- **AC-14:** `npm run verify` passes, and `verify-nuave drive all` passes
  with no unexpected external requests (R-28).
- **AC-15 (judgment, founder, JZ):** on real businesses, the journey feels
  like the prototype, loses nothing today's intake asks, and every nuance
  decision F1–F18 is visible.

## Delivery slices

One PR each, in this order. Each keeps the whole path working: new screens
come before a shrinking version of today's summary page, which becomes the
review screen in J7. R-02, R-03, R-25, R-27 and R-28 apply to every screen
in every slice.

| Slice | Contents | Requirements | Size |
|---|---|---|---|
| **J2** | Screen frame (per-screen state, `Kembali`/`Lanjut`, chapter progress, refresh restore), entry copy, reading screen, brand confirm. Then continue to today's summary. Also fix the stale `src/lib/intake/README.md`. | R-01, R-04, R-06–R-09, R-26–R-28 | M |
| **J3** | Preparation additions: locations and category suggestions in the same call; synthetic data and tests. No screens. | R-24, R-25 | M |
| **J4** | Focus, location and product screens. | R-05, R-10–R-12 | M |
| **J5** | Category, offerings, service channels and market screens. | R-13–R-16 | M |
| **J6** | Customer needs, competitors and public fact screens. | R-17–R-19 | S–M |
| **J7** | Review replaces the summary and the clarification stage; editable aliases; JQ answers held on review. | R-20–R-23 | M |
| **JQ** | Screens for target customer, buyer considerations and differentiator, after the founder decides must-answer vs asked. | plan §5, JQ | S–M |

## Open questions

The founder answers these at approval. Each has a default.

1. **Location-focus categories.** Default: a location uses the whole-brand
   suggestions, since each location is the same kind of business.
   Alternative: separate location suggestions (more preparation output).
2. **Competitor default.** Default: "don't know yet" stays selected until the
   owner chooses (today's behavior; suggestions are only Nuave's guesses).
   Alternative: pre-select the suggested names.
3. **Copy.** Default: the prototype's Indonesian headings and helper text
   for Stage 1; the founder reviews final wording at JZ.

## Implementation notes

- `SmartSummary.tsx` holds the right control for most screens (market rules
  with retention, three-way competitors, service checkboxes, offerings,
  name correction). Lift those into per-screen components rather than
  rewriting them.
- The unused PR #58 journey (`IntakeJourney.tsx`, `screens-bab*.tsx`) has
  the per-screen mechanics (Back history, review-edit return), but runs on
  the old state format. Use it as a parts donor only.
- `SmartSession.stage` gains the per-screen states; bump the stored version
  (R-26).

## Verification record

Complete after implementation:

- Verification artifact: `specs/013-airbnb-intake-journey/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
