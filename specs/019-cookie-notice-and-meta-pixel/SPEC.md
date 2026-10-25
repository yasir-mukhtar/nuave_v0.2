# Spec 019: Cookie notice and Meta Pixel (switched off until the Pixel ID is set)

> Status: **Approved** by Yasir on 2026-10-25 (Q-1 and Q-2 answered as
> recommended; all four events)
> Owner: orchestrator
> Updated: 2026-10-25

## Required context

- Privacy page section 10 (`src/app/privacy/page.tsx`,
  `docs/content/website/PRIVACY.md`) and its change notes: the seven-point
  list a tracking change must meet.
- Decision 2026-10-24 "S5: Meta consent, operator, refunds and record
  deletion": keep the promise of a choice before tracking.
- Founder answer 2026-10-25: build the notice together with the Meta Pixel;
  no Pixel ID yet; server events (Conversions API) are a later step.

## Problem

Meta ads need the Meta Pixel to measure which ads bring free checks and
purchases. The privacy page already promises that nothing goes to Meta until
the visitor taps **Setuju** on a cookie notice, and that a **Pengaturan
cookie** footer link reopens the choice. Neither exists yet.

## Desired outcome

When the founder sets a Pixel ID, every public page except the report link
and the test-pass page shows a cookie notice. The Pixel loads only after
**Setuju**, and only sends the four events listed below. Without a Pixel ID,
the site looks and behaves exactly as today.

## Scope

- A cookie notice (bottom bar) with **Setuju** and **Tolak**.
- A **Pengaturan cookie** link in both footers (landing and the legal pages)
  that reopens the notice.
- Loading the Meta Pixel after **Setuju**, and four browser events.
- One setting, `NEXT_PUBLIC_META_PIXEL_ID`, set at build time by CI. Empty
  means off.
- Privacy page wording that matches what is built (see R-12).

## Non-scope

- Conversions API (server events) and the hashed purchase email: the next
  step, with its own change.
- Scroll depth ("seberapa jauh Anda membacanya"): not sent in this step.
  Sending less than the page lists keeps the page true.
- Other trackers (Google Analytics, TikTok and so on).
- A cookie choice per purpose. There is one choice: Meta ads measurement.

## Experience

The notice sits at the bottom of the screen, over the content. On a phone it
covers the bottom of the page, including the main button on `/audit`, until
the visitor taps either choice; both are one tap. Until they choose, nothing
from Meta loads. Draft wording (Indonesian, for Yasir to
approve):

> **Cookie untuk iklan**
>
> Kami ingin memakai cookie Meta untuk mengukur iklan Nuave di Facebook dan
> Instagram. Jika Anda setuju dan membeli, email pesanan Anda dikirim ke Meta
> sebagai kode acak (hash). Laporan dan jawaban Anda tidak pernah dikirim.
> [Kebijakan Privasi](/privacy#cookie)
>
> [Tolak] [Setuju]

The two buttons have the same size and weight, so refusing is as easy as
agreeing. The notice names the hashed email now, as the privacy page's list
requires, even though this step does not send it yet, so the wording does not
have to change when the server step ships.

**Pengaturan cookie** in the footer reopens the same notice, showing the
current choice. Choosing **Tolak** after **Setuju** stops new events at once;
cookies Meta already set stay until they expire or the visitor clears them,
which the notice text on reopening says in one line: "Cookie Meta yang sudah
terpasang bisa Anda hapus lewat pengaturan browser."

## Requirements

- **R-01 Off by default.** With `NEXT_PUBLIC_META_PIXEL_ID` empty, there is no
  notice, no footer link, and no request to any Meta address. The production
  site stays unchanged until the founder sets the ID.
- **R-02 Nothing before Setuju.** No Meta script, image or request loads
  before the visitor taps **Setuju** in this browser.
- **R-03 The choice.** Stored in the browser (`localStorage`) as the choice,
  the date and the privacy-page version. The notice comes back after 12
  months, or when the privacy-page version changes. If the browser blocks
  storage, the notice shows on every page load and the Pixel never loads.
- **R-04 Pages.** The notice and the Pixel never appear on `/r` (the report
  link, whose secret is in the address) or `/uji` (the founder test pass).
  Links into `/r` use a full page load, so the Pixel cannot follow the visitor
  there.
- **R-05 No automatic collection.** The Pixel is set up with automatic
  configuration off (`autoConfig` false) and without advanced matching, so it
  never reads form fields, button text or the email the visitor types.
  `autoConfig` covers Meta's automatic events and page reading; Meta's
  "Automatic advanced matching" is a setting in Events Manager that code
  cannot switch off, so the founder keeps it off (R-13). It must be off
  before this ships.
- **R-06 PageView.** One PageView per page shown, including moves inside the
  site, never for `/r` or `/uji`. The Pixel's own history tracking is off;
  Nuave sends PageView itself.
- **R-07 Lead.** Once per website (within 7 days, in this browser), when the
  free check finds the business.
- **R-08 InitiateCheckout.** Once per website (within 7 days, in this
  browser), when the checkout screen opens, with value 249000 and currency
  IDR.
- **R-09 Purchase.** Once per order, when the server says the order is paid,
  value 249000, currency IDR. Never for test-pass orders (they need no
  payment). A buyer who pays and never comes back to the page sends no
  Purchase; the server step will cover that.
- **R-09a Kept in the browser.** To send each event once, the browser keeps a
  short one-way code per event for 7 days, never the website or order number
  itself.
- **R-10 Nothing else.** No event carries the email, business name, website,
  intake, questions, answers, report, order ID or report link. Only the event
  name, value and currency, plus what the Pixel sends by itself (page address,
  Meta cookie, browser details).
- **R-10a The page address.** Meta's script sends the page address with
  every event. Midtrans returns the buyer to `/audit?order_id=NV-…
  &status_code=…&transaction_status=…`, so those parameters leave the address
  before the Pixel loads or sends anything. Other parameters (an ad's
  `fbclid`, `utm_*`) stay.
- **R-11 Tolak stops it.** After **Tolak**, including after an earlier
  **Setuju**, no further events are sent in this page, in other open tabs
  (the stored choice is read again before every event), or later visits.
  Tolak also removes the codes kept for R-09a.
- **R-11a Founder test runs.** A tab holding the test-pass code sends no
  journey events.
- **R-12 Privacy page.** Section 10 adds that the cookie choice itself is
  kept in the browser for 12 months. The change notes record which items of
  the seven-point list this step meets (1, 3, 4, 5, 6) and that items 2 and 7
  wait for the server step. Version number and date move to 1.2 only if the
  public wording changes.
- **R-13 Founder setup.** Create the Pixel in Meta Events Manager (done
  2026-10-25, ID 890453577390181, set in `.github/workflows/ci.yml`), switch
  off automatic advanced matching before merging, and after deploy check the events
  with Meta's Test Events screen.

## Failure and recovery

- Meta's script fails to load (blocked by an ad blocker, network): the site
  works as normal; events are silently lost.
- Storage blocked: R-03 (no Pixel).

## Evidence, data, privacy, and cost

No cost. No personal data goes to Meta in this step beyond what the Pixel
sends by itself (page address, IP address seen by Meta, browser details, Meta
cookie), all listed in section 10. Nuave stores nothing new on its server.

## Acceptance criteria

- **AC-01** With the ID empty, a browser test finds no notice, no footer link
  and no request to a Meta address on the landing page, `/audit` and `/faq`.
- **AC-02** With a test ID: the notice shows; before a choice, no request to a
  Meta address (browser test watching network requests).
- **AC-03** **Setuju** loads the Pixel and sends PageView; **Tolak** sends
  nothing; both survive a reload.
- **AC-04** **Pengaturan cookie** reopens the notice; switching to **Tolak**
  stops further events.
- **AC-05** On `/r` and `/uji`, with **Setuju** stored, no notice and no
  request to a Meta address.
- **AC-06** In the synthetic journey with **Setuju**: Lead, InitiateCheckout
  and Purchase each fire once, with value 249000 IDR on the last two, no
  event carries the email, business name, website or order number, and a
  reload sends no second Purchase.
- **AC-07** Notice text follows `docs/VOICE.md` and is approved by Yasir.

## Open questions

- **Q-1** Notice wording: approved as drafted (2026-10-25).
- **Q-2** The notice names the hashed email now: approved (2026-10-25).

## Implementation notes

- Next.js inlines `NEXT_PUBLIC_` values at build time, so CI's build step
  needs the value; it is not secret (it appears in the page).
- The Pixel is Meta's standard snippet, inserted only after **Setuju**.
- Browser tests block real Meta addresses and stub `fbq` to record events.

## Verification record

Implementing (2026-10-25): unit tests `src/components/consent/cookie-consent.test.tsx`;
browser suite `tests/e2e/meta-pixel.spec.ts` (`npm run test:e2e:pixel`, a
server built with a fake Pixel ID); AC-01 in `tests/e2e/offline-network.spec.ts`.
