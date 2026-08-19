# Spec 004: Hero source intake — one-field website or Instagram input

> Status: **Approved** (founder-approved 2026-08-19; implementation in progress)
> Owner: Founder
> Updated: 2026-08-19
> Implements: the **first data intake** of the live `/audit` workflow — step 0
> of `src/app/audit/AuditWorkflow.tsx`, replacing the current `SourceStep` form
> — aligned with touchpoint [`03 — Business Facts`](../../docs/journey/03-business-facts.md)
> "AI-prepared draft rather than empty fields."

> This is a UI capability only. It changes no backend contract, adds no API
> call, and does not move the canonical journey order (landing → free preview →
> payment → facts) recorded in `docs/DECISION_LOG.md` (2026-08-17). The hero
> replaces the intake *form* of the access-gated live tool so the first screen
> asks one warm question instead of presenting a four-field agency form.

## Required context

Read in order:

1. `AGENTS.md` — contributor rules and the no-commit/no-publish gate
2. `docs/NOW.md` — current objective, deployment state, and the known gap that
   the live `/audit` UI remains mostly English (this spec introduces Indonesian
   hero copy; the rest of the flow is a separate polish pass)
3. `docs/VOICE.md` — the Indonesian writing contract: settled labels
   (`bisnis Anda`, `situs web`, `Instagram`), tone (`kami`/`Anda`), and the rule
   that exact settled labels are never paraphrased
4. `docs/journey/03-business-facts.md` — **Source behavior**, **Provenance
   labels**, **Negative cases and edge cases**, **Privacy and trust
   requirements** (the intake belongs to this touchpoint's source submission
   behavior; it must not request credentials, must accept website, Instagram,
   and Google Maps sources, and must not fabricate)
5. `docs/DECISION_LOG.md` — the 2026-08-17 journey-order row and the 2026-08-19
   v2 launch row (facts about the live tool this spec changes)
6. `specs/README.md` (spec lifecycle) and `docs/templates/SPEC.md` (structure)
7. Code to ground the spec (read-only):
   - `src/app/audit/AuditWorkflow.tsx` — step 0 rendering, `websiteUrl` state,
     `extractWebsite()` (the `/api/audit/extract` call this hero must reuse
     unchanged), stepper visibility, restore-on-refresh behavior
   - `src/app/audit/AuditStages.tsx` — the `SourceStep` component this spec
     replaces, and the `BriefStep` screen the transition lands on
   - `src/app/audit/audit.module.css` — existing design tokens and the
     `.workspaceFocused` hero-like layout
   - `src/lib/audit/types.ts` — `extractionRequestSchema` (server requires a
     full `http(s)://` URL, so the hero must normalize Instagram input)
   - `src/app/api/audit/extract/route.ts` — the unchanged contract the hero
     calls

Do not load or use as product authority: `archive/`, `Archive Candidates/`,
`node_modules/`, superseded plans, `docs/journey/00-overview.md`, or the
landing copy in `docs/content/`. The canonical Order Preview touchpoint
(`docs/journey/01-order-preview.md`) is read only to confirm it is **not** in
this spec's scope.

## Problem

### Observed evidence

- Step 0 of the live `/audit` workflow (`SourceStep`) is a four-field agency
  form: "Official website", "Brand name", "Market or location", and "Business
  category", followed by a "Draft the client brief" button
  (`src/app/audit/AuditStages.tsx:252`). It is English, looks like a back-office
  tool, and asks four questions on the first screen.
- The intended customer (owner or marketing decision-maker of an Indonesian
  SME) is not an analyst (`docs/PRODUCT.md`) and finds forms intimidating
  (founder, 2026-08-19 brainstorm). The first screen should ask one question.
- The touchpoint plan for Business Facts already commits to "an AI-prepared
  draft rather than empty fields" and to customer language, not internal schema
  (`docs/journey/03-business-facts.md`, Core experience decision).
- The server extraction contract accepts a single `website_url` and only a full
  `http(s)://` URL (`src/lib/audit/types.ts:39`). Instagram is not yet a
  distinct server capability; the hero must therefore normalize an Instagram
  handle to a full `instagram.com` URL and send it through the existing field.

### Interpretation

The first screen should stop collecting data and start a conversation. A single
focused field that accepts either a website or an Instagram account, auto-
detects which one it is, and hands off to the existing extraction is the
smallest change that removes the "form" feeling while reusing every backend
contract. The "wow" is the hand-off: the field becomes a brand card that is
visibly being scanned, so the next screen (facts verification) reads as the
*answer* to the question, not as "screen two."

## Desired outcome

The first thing a user sees in the audit tool is one warm question, one large
input with a blinking caret, and nothing else competing for attention. The
input accepts a website link or an Instagram account, quietly shows which type
it understood, and — on Enter — visibly scans into the business-facts screen.
A user can go from empty page to "the tool already knows my business" in one
action and under roughly ten seconds.

## User and situation

The owner or marketing decision-maker of an Indonesian SME, on a desktop or
phone, landing on the audit tool for the first time after the access gate. They
have a business in mind and a link or handle ready, but no technical
vocabulary and no patience for forms. They want confirmation that the tool
understands their business before they invest attention.

## Scope

- Replace step 0 of the live `/audit` workflow with a single hero screen.
- One text input accepting a website URL **or** an Instagram account, with
  client-side type detection and normalization.
- A submit affordance that appears only when the input is usable, and a gentle
  (non-blocking) inline path for unusable input.
- A short scanning transition into the existing `BriefStep`, driven by the
  existing `onExtract` call.
- Example chips (fictional `.example` values) that fill the field.
- A pure, unit-tested parser (`parseSourceInput`).
- Hide the stepper nav on step 0; show it from step 1 onward.

## Non-scope

- Changing `/api/audit/extract` or any backend contract, budget, telemetry, or
  provider behavior.
- Improving server-side extraction quality for Instagram sources. An Instagram
  source may extract weakly or fail; the existing failure messaging applies and
  the hero must never fabricate a result or request login credentials.
- Translating the rest of the `/audit` flow (steps 1–4, report) to Indonesian.
  That is the known product-wide polish gap, tracked separately in `NOW.md`.
- Redesigning `BriefStep` or the report screens. The hero lands into the
  existing facts-verification screen unchanged.
- The canonical paid journey's Order Preview touchpoint
  (`docs/journey/01-order-preview.md`). The hero pattern may inform it later;
  this spec does not change it.
- Wiring a demo/fixture deep-link from the hero into
  `/audit/fixture` (recorded as an open question instead).
- Payment, accounts, history, dashboards, multi-business, or scale concerns.

## Experience

### Start condition

Step 0 renders a full-viewport centered stage. The top bar keeps the Nuave
brand (top-left) and the existing "Mulai ulang" action. The stepper nav and any
error/telemetry banners are hidden on this step. The page is otherwise empty.

### Main path

1. **Question.** On mount the center fades in (opacity 0→1, ~10 px upward
   drift) over roughly 400 ms, staggered: headline, subline, input. The input
   is autofocused, so the caret is already blinking when the fade finishes.
2. **Typing.** As the user types, the input quietly detects the source type.
   Once detected, a small chip appears inside the field (left side): a link
   glyph + "Situs web" for a website, or a glyph + "Instagram" for an
   Instagram account. Nothing errors while typing. The placeholder fades/scales
   away on focus.
3. **Submit affordance.** When the input parses as usable, the submit button
   fades/slides in under the field and its label matches the detection:
   "Analisis situs ini" or "Analisis akun ini". Enter submits at any time.
4. **Invalid input.** If the user presses Enter on an unusable value (or clicks
   the button without a usable value — the button is absent for invalid input,
   so this is Enter only), the field gives a gentle two-frame shake and one
   inline hint appears in accent tone: "Tambahkan link situs atau nama
   Instagram, contoh: kopitamansenja.example atau @kopitamansenja." The typed
   value is preserved. No red-block alert.
5. **Scanning transition.** On valid submit the input content collapses into a
   small centered brand card (subtle border, empty-state placeholder showing
   the detected source glyph), a thin gradient scan line sweeps top-to-bottom
   across the card twice, and three status lines fade in sequentially beneath
   it:
   - "Membaca sumber publik…"
   - "Mencari nama, logo, dan deskripsi…"
   - "Menyusun draf ringkasan…"
   These lines are cosmetic; the real work is the existing `onExtract()` call,
   fired once at submit. When extraction resolves, the card fades/scales into
   the `BriefStep` header and the existing focus-and-scroll behavior takes
   over. If extraction fails, the scanning stops, the card dissolves, the field
   returns editable with the value intact, and the existing error message is
   shown in the hero's layout: "Kami tidak dapat menganalisis sumber ini.
   Periksa kembali linknya atau coba situs resmi lainnya."
6. **Examples.** Three small chips sit under the input ("Coba contoh:") and
   fill the field on click without submitting: `kopitamansenja.example`,
   `@kopitamansenja`. Values are fictional `.example` sources so they never
   imply a real business or a real crawl result.
7. **Reassurance.** A small fixed line sits near the bottom: "Hanya informasi
   publik dari situs web atau Instagram resmi."

### Completion state

The user is on the facts-verification screen (`BriefStep`) with the
AI-drafted business information, which is the existing screen they already
trust. Returning via "Change website" restores the hero with the previous value
intact and the input focused.

### Language

All hero copy is Indonesian per `docs/VOICE.md`: `Anda`/`kami`, "situs web",
"Instagram", no internal schema terms ("entity scope", "brand type",
"decision criteria") on this screen.

### Accessibility

- One `h1`; the input has a visible `aria-label` ("Situs web atau nama
  Instagram").
- The scanning status lines live in an `aria-live="polite"` region so the
  transition is announced but not noisy.
- Enter submits (native form semantics). Chips are real buttons (focusable).
- `prefers-reduced-motion`: skip the scan-line sweep and card scale; the three
  status lines still appear as plain fades, and the input caret remains.
- Touch targets at least 44 px; the input widens to full container width on
  small screens; no interaction depends on hover.
- Contrast uses the existing design tokens; the input border meets 3:1 for UI
  components.

## Requirements

- **R-01 (Hero screen):** Step 0 of the audit workflow renders one
  full-viewport hero with a single `h1`, subline, input, and submit affordance.
  The stepper nav is hidden on step 0 and visible from step 1.
- **R-02 (Input):** One `type="text"` input, autofocused on mount, with a
  blinking caret and a placeholder that is a hint, not a label. The label is
  conveyed via `aria-label`.
- **R-03 (Parser):** A pure, exported function `parseSourceInput(value)`
  classifies input as `{ sourceType: "website" | "instagram"; normalizedUrl:
  string }` or `null` (unusable), per these rules:
  - trim the input; empty or whitespace → unusable;
  - full `http(s)://` URL → website, preserved (Instagram host is detected);
  - `www.` prefix → website, `https://` prepended;
  - `@<handle>` (1–30 chars of letters, digits, `.`, `_`) → Instagram,
    normalized to `https://instagram.com/<handle>`;
  - bare `instagram.com/<handle>` or `www.instagram.com/<handle>` → Instagram,
    `https://` prepended, query/fragment dropped;
  - otherwise a plausible bare domain (no spaces, contains a dot, TLD ≥ 2
    chars) → website, `https://` prepended;
  - anything else, including values over 2000 chars, → unusable.
- **R-04 (Detection feedback):** While typing, once `parseSourceInput` yields a
  type, a chip inside the field shows "Situs web" or "Instagram". While the
  value is unusable, no chip and no error appear.
- **R-05 (Submit affordance):** The submit button exists only for usable
  values. It fades/slides in and its label is "Analisis situs ini" (website) or
  "Analisis akun ini" (Instagram). Enter submits. During extraction the button
  is disabled and shows the existing spinner state.
- **R-06 (Invalid submit):** Enter on an unusable value triggers a gentle
  two-frame shake and one inline accent-tone hint (copy above). The value is
  preserved and no API call is made.
- **R-07 (Extract call):** On usable submit, `websiteUrl` is set to
  `normalizedUrl` and the existing `extractWebsite()` path runs unchanged —
  same endpoint, same body shape; `brand_name`, `market_context`, and
  `category` are sent empty strings from this screen (they remain editable on
  `BriefStep`).
- **R-08 (Scanning transition):** During extraction the input collapses into a
  brand card, a scan line sweeps twice, and the three status lines fade in
  sequentially. The transition is cosmetic, non-cancelable, and respects the
  actual extraction result (success → `BriefStep`; failure → editable hero with
  the friendly inline error).
- **R-09 (Reduced motion):** With `prefers-reduced-motion`, the sweep and card
  scale are skipped; status lines appear as plain fades.
- **R-10 (Example chips):** Two fictional `.example` chips fill the field on
  click and never auto-submit.
- **R-11 (Reassurance line):** The hero shows "Hanya informasi publik dari
  situs web atau Instagram resmi."
- **R-12 (Return and recovery):** Returning from `BriefStep` ("Change
  website") or after a failed extraction restores the hero with the previous
  value intact and the input focused.
- **R-13 (Session state):** The restored `websiteUrl` from session storage is
  pre-filled into the hero on reload, with the detection chip shown for it.

## Failure and recovery

| Failure | Preserved | User sees | May retry | Never |
|---|---|---|---|---|
| Unusable input on Enter | Typed value | Gentle shake + inline hint | Yes, freely | An API call |
| Extraction fails | Typed value; existing telemetry/budget state | Hero returns editable with "Kami tidak dapat menganalisis sumber ini…" | Yes, after editing or unchanged | A fabricated result; a second unpaid call beyond existing budget rules |
| Instagram source private/inaccessible | Typed value | Same extraction-failure path | Yes, after changing source | A request for credentials |
| Budget/cost guard not ready | Existing guard behavior | Existing guard message rendered in the hero layout | Yes | An API call |
| User refreshes mid-flow | Session-stored `websiteUrl` | Hero pre-filled, chip shown | Yes | A repeated extraction call merely for reopening |

## Evidence, data, privacy, and cost

- Only the typed public source is transmitted, exactly as today, to the
  existing `/api/audit/extract` call. No new data is collected or logged.
- The hero adds no provider call and no cost. The scanning animation performs
  no network work; the status lines are cosmetic.
- Session-storage restore behavior is unchanged. Raw provider responses,
  personal data rules, and the no-fabrication rule from `AGENTS.md` and
  `docs/journey/03-business-facts.md` apply unchanged.
- Never request social-media or Google credentials, and never imply Nuave
  "owns" or can log into the submitted account.

## Acceptance criteria

- **AC-01:** Given the audit tool step 0, when the page loads, then a single
  focused hero renders with one `h1`, subline, and an autofocused input with a
  blinking caret, and the stepper nav is hidden.
- **AC-02:** Given a blank hero, when the user types `kopitamansenja.example`,
  then the chip shows "Situs web" and the submit button fades in labelled
  "Analisis situs ini".
- **AC-03:** Given a blank hero, when the user types `@kopitamansenja` or
  `instagram.com/kopitamansenja`, then the chip shows "Instagram" and the
  button is labelled "Analisis akun ini", and the value normalized for the
  request is a full `https://instagram.com/…` URL.
- **AC-04:** Given an unusable value (e.g. `kopisenja`), when the user presses
  Enter, then the field shakes twice, the inline hint appears, the value is
  preserved, and no `/api/audit/extract` request is issued.
- **AC-05:** Given a usable value, when the user presses Enter, then exactly
  one `/api/audit/extract` request is issued with `website_url` set to the
  normalized URL and empty `brand_name`/`market_context`/`category`, and the
  scanning card with the three status lines appears.
- **AC-06:** Given a successful extraction, when the scan completes, then the
  user lands on the existing `BriefStep` with the drafted facts and the stepper
  visible from step 1.
- **AC-07:** Given a failed extraction, when the scan stops, then the hero
  returns editable with the value intact and the friendly inline error, and no
  fabricated result is shown.
- **AC-08:** Given `prefers-reduced-motion`, when the user submits, then no
  scan sweep or card scale plays; the status lines still appear as fades and
  the transition still lands on `BriefStep`.
- **AC-09:** Given an example chip, when the user clicks it, then the field is
  filled with that fictional `.example` value and no request is issued.
- **AC-10:** Given a return from `BriefStep` via "Change website", when the
  hero remounts, then the previous value is present, the detection chip is
  shown, and the input is focused.
- **AC-11 (judgment):** A first-time user viewing the hero can identify what to
  do in under three seconds without reading a label, and the screen does not
  look like a form or a generic search engine.
- **AC-12 (judgment):** The scan transition reads as deliberate and calm, not
  gimmicky: it completes under ~2 seconds, never blocks on animation, and never
  outruns or outlasts the real extraction by more than a moment.
- **AC-13 (tests):** `parseSourceInput` has unit tests covering every rule in
  R-03 (bare domain, `www.`, full URL, `@handle`, `instagram.com/…` with and
  without scheme, query-param stripping, uppercase handle, whitespace, no-dot
  value, >2000 chars), and the existing audit, fixture, and e2e suites still
  pass after the swap.

## Open questions

- **Hero copy approval (owner: founder):** the exact Indonesian H1, subline,
  placeholder, button labels, status lines, and hints above. Drafted in this
  spec per `docs/VOICE.md`; founder confirms at approval. No material product
  decision is otherwise open.
- **Example chip values (owner: founder):** confirm the fictional
  `kopitamansenja.example` / `@kopitamansenja` pair (consistent with the
  fixture) or another pair.
- **Demo deep-link (owner: founder):** wiring the hero to run the fixture
  journey for demos is deliberately out of scope; confirm it stays deferred.

## Implementation notes

- Parser: `src/lib/audit/source-input.ts` (pure, no React) with a
  table-driven test file `source-input.test.ts`, following the existing test
  style in `src/lib/audit`.
- Component (isolated build): `src/app/audit/spec004/Spec004Hero.tsx`
  ("use client") with its own `spec004.module.css` (hero + demo styles) and a
  preview route `src/app/audit/spec004/page.tsx` at `/audit/spec004`
  (`robots: { index: false, follow: false }`), plus
  `Spec004Demo.tsx` harness that reads the cost guard via
  `GET /api/audit/extract` and posts `{ website_url, budget: { ...guard,
  calls: [] } }` to show the resulting draft. `tw-animate-css` and CSS
  transitions only; no new dependency.
- Isolation reason: a parallel agent concurrently owns
  `src/app/audit/SourceHero.tsx` (glow design), `audit.module.css`,
  `hero.module.css`, `AuditWorkflow.tsx`, and `AuditStages.tsx`. Per the
  founder decision ("keep that, build yours separately"), the Spec 004 hero is
  built separately in `spec004/` and does not edit the other agent's files.
- Wiring: `AuditWorkflow.tsx` step 0 is currently wired to the other agent's
  `SourceHero`. Swapping step 0 to the Spec 004 hero is deferred until the
  founder coordinates ownership; the spec-004 component keeps the props
  contract needed for that swap.
- Banners (global error, cost-guard telemetry) must render within the hero's
  layout, not above it, so the centered stage stays clean on happy paths.
- No commit or push unless the founder explicitly requests it.

## Verification record

- Verification artifact: `specs/004-source-hero-intake/VERIFICATION.md`
- Result: Pending (preview route `/audit/spec004` builds clean)
- Date: Pending
- Verified working-tree state: `npm run build` succeeds (2026-08-19); parser
  unit tests 18/18 pass; the only remaining repo-wide typecheck/lint errors
  are in the other agent's in-flight files and the pre-existing
  `scripts/kopikenangan` experiment script.