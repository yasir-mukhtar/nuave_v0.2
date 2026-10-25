# Spec 019: Clinic landing page (S6)

> Status: **Approved** by the founder on 2026-10-25, with D-1 to D-4 answered
> (see Decisions)
> Owner: founder (S6); built by Claude Code on `claude/practical-brahmagupta-8y4ces`
> Updated: 2026-10-25
> Implements: [`PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md) S6, "Landing page"

## Required context

Read in order:

1. `AGENTS.md`, `docs/DESIGN.md` (type scale, Tabler, shadcn/Base UI).
2. Figma `pE6HryXbVyJo24lxqy6JZE`, page "Landing · Full page v2" (`244:2`):
   desktop `288:2`, mobile `289:2`, S5's other tabs (`294:2`), the clinic
   tab component (`312:2`). This is the design, including the founder's own
   edits of 2026-10-25.
3. [`COPY.md`](./COPY.md) in this folder: every word on the page.
4. `experiments/landing-page-v2/` (the HTML prototype the Figma page was
   built from) and `docs/content/website/FAQ.md` (approved FAQ wording).
5. `src/components/landing/Landing.tsx` (today's landing: form handoff,
   resume banner), `src/lib/audit/source-input.ts`,
   `src/lib/audit/source-handoff.ts`, `tests/e2e/journey.ts`.

Do not load: `archive/`, older landing plans, Spec 014 (#102, parked).

## Problem

`v2.nuave.ai/` still shows the earlier, generic landing page ("Bisnis Anda
disebut AI?", one phone-width column, a café example). Since then:

- Spec 018 made the product a clinic audit (ChatGPT and Google AI Overview,
  real Google search questions, Rp249.000).
- The target market is beauty clinics in Jabodetabek and Bandung.
- The founder designed and approved a clinic landing page in Figma.

## Desired outcome

A clinic owner who opens `v2.nuave.ai` on a phone or a laptop sees the new
clinic landing page. Every form on it starts the same free check in `/audit`
that today's form starts.

## User and situation

A clinic owner (dental, beauty, skin, children's or general clinic) reached
by direct outreach or an ad. They want to know whether patients who ask AI
hear about their clinic, what the audit costs, and how to start.

## Scope

- The page at `/`, replacing today's landing, responsive from 320px to
  1920px wide. It covers the menu, hero, S2 to S9 and the footer, as in the
  Figma page, with the words of [`COPY.md`](./COPY.md).
- Interactions:
  - the hero's clinic-type tabs;
  - the report tabs in S5;
  - the FAQ accordion;
  - the menu links to `#cara-kerja`, `#laporan`, `#harga` and `#faq`;
  - the mobile menu;
  - the sticky call-to-action bar;
  - the three website forms (hero, price receipt, closing section).
- The saved-journey banner that today's landing shows ("Lanjutkan audit …").
- Updating the tests that start on `/` to the new words.

## Non-scope

- Any change to `/audit`, payment, the report, `/faq`, `/terms`,
  `/privacy`, `/support` or their words.
- Analytics, Meta Pixel, cookies, A/B tests, new routes, search indexing
  (the site stays `noindex`, as today).
- Scroll animations beyond a gentle fade-in, such as count-up numbers or
  lines that draw themselves. These are a later polish pass.
- A higher-resolution render of the S9 clay street. The current image is
  used.

## Experience

- **Hero.**
  - Five clinic-type tabs: Kecantikan (selected), Gigi, Kulit, Anak, Lainnya.
  - Choosing a tab changes the patient question and the three named clinics
    in the phone (wording in COPY.md). The report card and "Klinik Anda?" stay.
  - Desktop: copy left, phone right. Phone: stacked, the tabs scroll sideways.
- **Forms.**
  - All three forms take one website or Instagram address and work like
    today's landing form: a valid entry is handed to `/audit`, which starts
    the free check at once.
  - An invalid entry shows "Masukkan satu website atau akun Instagram yang
    valid." under the field and puts the cursor back in it.
  - While leaving, the button shows a spinner and is disabled.
- **Menu.**
  - Desktop: logo, four section links and an outlined "Cek klinik saya" that
    takes the reader to the hero form.
  - Phone: logo, "Cek klinik saya" and a menu button that opens a sheet with
    the four links and "Cek klinik saya". Escape or the close button closes
    it, and focus goes back to the menu button.
- **Sticky bar** (from the lofi notes).
  - It says "Gratis dulu · Audit Rp249.000" with a "Cek klinik saya" button.
  - It appears once the hero form has scrolled out of view and hides while
    the hero, the price receipt or the closing form is on screen.
  - Phone: bottom bar. Desktop: top bar.
- **S5 report tabs.** Skor, Jawaban AI, Klinik lain and Perbaikan switch the
  report card. Desktop shows them as a contents list beside the card, phone
  as a segmented control.
- **FAQ.**
  - Eleven questions, the first one open, one open at a time.
  - The answers are the approved words of `docs/content/website/FAQ.md`, and
    every answer is in the page's HTML even while closed.
- **Pictures.** Local WebP files: the clay objects, the clinic thumbnails and
  the S9 street. They carry no meaning the text doesn't already give, so
  they have empty alt text.

## Requirements

- **R-01 Design fidelity.** Layout, spacing, colours, radii, shadows and
  pictures follow the Figma page at 1440 and 390 wide. Widths in between
  are composed, not squeezed.
- **R-02 Type scale.** Text uses the canonical roles and tokens of
  `docs/DESIGN.md`, so `npm run check:typography` passes.
  - A size that is not on the scale moves to the nearest step:
    - 13px to 12 or 14;
    - 15px to 14 or 16;
    - 17px to 16 or 18.
  - Big numbers use `type-number` (64px). The design's 96px figures
    therefore show at 64px.
  - The hero headline uses `type-display`, which now starts at 36px on a
    phone (D-1).
- **R-03 Words.** Every visible string comes from COPY.md. No new claims,
  numbers, names or testimonials. Clinic names are illustrative and
  labelled.
  - COPY.md lists nine small fixes to the design's words (for example, the
    S5 example now follows the real report's labels). Each is reversible in
    review.
- **R-04 Forms.** The source parsing, the session handoff key and the
  navigation to `/audit` are the same code as today's landing (moved, not
  rewritten).
- **R-05 Accessibility.**
  - One `h1`, section headings `h2`, and header, main and footer landmarks.
  - Tabs and the accordion use the shadcn/Base UI primitives, with full
    keyboard use.
  - Visible focus, contrast of at least AA, and reduced motion respected.
- **R-06 No outside requests.** The page loads nothing from other hosts.
  Fonts come from `src/app/fonts.ts` and pictures from `public/`.
- **R-07 Icons.** Tabler only (the clinic tabs: dental, flower, droplet,
  baby-carriage, stethoscope).
- **R-08 Performance.** Pictures below the fold load lazily. The street and
  the objects are WebP at about twice their largest shown size.

## Failure and recovery

- **Storage blocked.** `/audit` asks for the website again, as today.
- **Invalid input.** The error stays until the reader edits the field.
- **JavaScript off.** The page still shows all its content and every FAQ
  answer. The forms need JavaScript, as today.

## Evidence, data, privacy, and cost

The page has no data collection, no provider calls and no cost. It keeps
the existing `noindex`.

## Acceptance criteria

- **AC-01:** Given `/` at 1440 and at 390 wide, the page shows every section
  of the Figma page in order, with COPY.md's words, and no horizontal scroll
  at any width from 320 to 1920.
- **AC-02:** Given a valid website or Instagram address in any of the three
  forms, pressing its button opens `/audit` and starts only the free check,
  as today (`tests/e2e/audit-entry.spec.ts`).
- **AC-03:** Given an invalid entry, the error appears, the field is focused,
  and nothing navigates.
- **AC-04:** Each menu link scrolls to its section.
  - The phone menu opens, traps focus, and closes with Escape. Focus then
    returns to the menu button.
- **AC-05:** Each hero tab shows its own example, with the keyboard as well
  as the pointer.
- **AC-06:** Each S5 tab shows its report view, with the keyboard (arrow
  keys) as well as the pointer, on desktop and on a phone.
- **AC-07:** On load, FAQ Q1 is open and the other answers are in the HTML.
  - Opening one question closes the open one.
  - The answers match `docs/content/website/FAQ.md`.
- **AC-08:** The sticky bar follows the rules in Experience. Its button
  brings the reader to the hero form with the field focused.
- **AC-09:** With a saved journey in this browser, the resume banner appears
  above the headline.
- **AC-10:** Loading `/` makes no request to another host, and the page has
  no link to `/uji`.
- **AC-11:** `npm run verify` passes, including the updated end-to-end tests.
- **AC-12 (judgement):**
  - Side by side with the Figma page at 1440 and 390, an independent
    reviewer finds no layout, spacing or wording difference beyond the type
    scale (R-02).
  - The founder approves the PR preview on a phone and a laptop before
    merging.

## Decisions (founder, 2026-10-25)

- **D-1 Phone headline: allow 36px.**
  - The design's phone headlines are 38px (hero) and 36px (closing
    section). The type rules started big headlines at 48px, which would
    wrap the hero headline to four or five lines on a phone.
  - Decision: the display role's minimum drops from 48px to 36px
    (`--type-display-size: clamp(2.25rem, 5vw, 4rem)`). The `/audit`
    headline also shows at 36px on small phones; the founder accepted that.
- **D-2 "Volume pencarian tertinggi": keep as designed.**
  - The hero tick keeps "10 pertanyaan berdasarkan volume pencarian
    tertinggi Google", although the approved FAQ says a question is built
    from the clinic's profile when search data is thin.
- **D-3 Two wording differences: use the newest wording everywhere.**
  - The closing section's line takes the hero's "Rp249.000 untuk mulai
    audit lengkap."
  - The hero and S3 captions take "Nama klinik hanya ilustrasi."
- **D-4 Hero tab examples: approved** as written in COPY.md, with the other
  proposals there (page title, menu labels, sticky bar).
