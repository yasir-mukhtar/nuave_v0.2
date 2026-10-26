# Spec 021: Meta Conversions API (server Purchase event)

> Status: **Draft** (for Yasir's review; Q-1 to Q-7 need answers)
> Owner: orchestrator
> Updated: 2026-10-26
> Implements: privacy page change notes, "Before the Meta Pixel or
> Conversions API goes live", items 2 and 7 (and the item 1 notice wording)

## Required context

Read in order:

1. `docs/content/website/PRIVACY.md`: the "Before the Meta Pixel or
   Conversions API goes live" list, section 2 ("Nuave sendiri tidak
   menyimpan alamat IP Anda") and section 10 (what goes to Meta).
2. [Spec 019](../019-cookie-notice-and-meta-pixel/SPEC.md) and
   `src/lib/consent/meta-pixel.ts`: the cookie notice, the stored choice, and
   the browser Pixel's Purchase (R-09, R-09a, R-11).
3. `docs/DECISION_LOG.md`, 2026-10-24 "S5: Meta consent…" and the 2026-10-25
   entries "Cookie notice and Meta Pixel (Spec 019)", "Cookie notice in
   English, shorter" and "Cookie notice: Allow cookies?".
4. The paid screen and how the page learns an order is paid:
   `src/app/api/orders/status/route.ts`, `src/lib/payments/attempts.ts`
   (`paymentView`), and the Purchase effect in
   `src/lib/intake/SmartIntakeJourney.tsx`.
5. `src/lib/orders/retention.ts` (the hourly cleanup) and the deploy job in
   `.github/workflows/ci.yml` (Worker secrets list).

Do not load: `archive/`, parked PRs, Spec 014.

## Problem

The browser Pixel (Spec 019) misses purchases when an ad blocker or the
phone's browser blocks Meta's script, and it cannot send the hashed order
email that helps Meta match a purchase to an ad. Meta's Conversions API lets
Nuave's server send the same Purchase directly. The privacy page already
describes this, but two of its promises are not built yet:

- **Item 2:** server events go only for visitors who tapped **Allow**, with
  no fields beyond those section 10 lists.
- **Item 7:** the visitor's IP address and browser type go to Meta at the
  moment of their own request, and Nuave never stores them.

## Desired outcome

When a paying customer who tapped **Allow** reaches the "payment received"
screen, Nuave's server sends Meta one Purchase (Rp249.000) carrying the
hashed order email, their IP address, browser type and Meta cookie codes.
The browser Pixel sends the same Purchase with the same event code, so Meta
counts one purchase, not two. Nothing is sent for anyone who did not tap
Allow, for test-pass orders, from previews, or from `/r` and `/uji`. If Meta
is slow or down, the customer notices nothing.

## User and situation

A clinic owner who came from a Facebook or Instagram ad, tapped Allow, paid
in Midtrans and was sent back to `/audit`, where the page polls the order
status until it shows the payment as received.

## Scope

- One server event: **Purchase**, sent once per paid order.
- A small server route the browser calls when it shows the paid screen.
- A random event code per paid order, shared by the Pixel and the server.
- The cookie notice naming the hashed email (wording in Q-1), and the privacy
  page change that goes with it (Q-2).
- Secret `META_CAPI_ACCESS_TOKEN` in the deploy job; an optional test code
  for Meta's Test Events screen.
- Founder steps in Meta Events Manager.

## Non-scope

- **Server Lead and InitiateCheckout.** Purchase only for this first version
  (R-02 says why).
- **Sending from the Midtrans background notification.** Founder decision
  (Option A): the IP address and browser type exist only during the
  visitor's own request, and Nuave must not store them. So a buyer who pays
  and never comes back to the Nuave page sends no Purchase from either the
  browser or the server. This replaces Spec 019 R-09's "the server step will
  cover that".
- Retrying a failed send, a queue, or a dashboard of sent events.
- Other trackers, phone numbers, names, city or any other matching field.
- Changing how the browser Pixel's Lead, InitiateCheckout and PageView work.

## Experience

Nothing changes on screen except the cookie notice text (Q-1). The paid
screen appears exactly as fast as today. The server call happens in the
background and its outcome is never shown.

## Requirements

### What is sent, and when

- **R-01 One moment.** The browser asks the server to send Purchase when the
  journey shows the order as paid (`payment.state` is `paid`), the same
  moment it sends the Pixel Purchase today (Spec 019 R-09). The request comes
  from the paying customer's own browser.
- **R-02 Purchase only.** No server Lead, InitiateCheckout or PageView in
  this version. Why: Purchase is the event ads are judged and optimised on,
  and it is the one the browser loses most, because the buyer leaves for
  Midtrans and comes back; Lead and InitiateCheckout happen before any order
  exists, so there is no email to match and the free check would need a new
  public server call; and sending less keeps the privacy promises easier to
  check. Revisit once Events Manager shows real numbers after the first
  sales.
- **R-03 Allowed fields only.** The server event carries exactly:
  - event name `Purchase`, value `249000`, currency `IDR` (the order price
    constant, as the Pixel uses);
  - the visitor's IP address (`CF-Connecting-IP`) and browser type
    (`User-Agent`), read from this request;
  - the Meta cookie codes `_fbp` and `_fbc`, read from this request's own
    cookies (the browser sends them with the call; each is left out when
    absent);
  - the order email, trimmed, lower-cased and hashed with SHA-256 (Meta's
    `em` field). The plain email never leaves Nuave;
  - the event code of R-07;
  - Meta's required envelope, which describes no one: the event time,
    `action_source: "website"`, and a page address that is the fixed
    `<site>/audit` with no query string (Q-4).

  Never the report, questions, AI answers, intake facts, business name,
  website, order number, report link or email in readable form, and no
  other Meta field.
- **R-04 Value.** Always 249000 IDR, the same as the Pixel.

### Who gets one

- **R-05 Only after Allow.** The browser calls the server only when, at that
  moment, all of these hold (the same checks as the Pixel's Purchase):
  the stored choice is Allow under the current privacy-page version, the
  page is not `/r` or `/uji`, and the tab holds no test-pass code. The call
  carries the privacy-page version the choice was made under; the server
  sends nothing unless it equals its own `PRIVACY_VERSION`. A browser that
  never tapped Allow, chose Don't allow, or chose under an older version
  never makes the call.
- **R-06 Only real paid orders.** The server sends only for an order in this
  environment, in live mode, paid through Midtrans (`payment_kind`
  `midtrans`), with an event code. Never for a test pass (`/uji`, payment
  kind `test`), a simulated payment, an unpaid or legacy order. While
  Midtrans is in sandbox (`MIDTRANS_IS_PRODUCTION` false, until G1), it
  sends only when a Test Events code is set, and then always with it (Q-3),
  so sandbox payments never count as real sales.

### Counting once

- **R-07 The event code.** Each paid order gets one random event code
  (128 bits, for example a UUID), made once, in the same write that records
  the payment (or the first time it is needed, by a write that keeps an
  existing code, so two tabs get the same one). It is stored on the order
  and never changes. It says nothing about the order, the buyer or the
  business.
- **R-08 Sharing it.** The order status answer for a paid order adds
  `payment.purchase_event_id` with that code (an addition to Spec 016 R-21's
  field list; still no email, report or secret). Simulated payments in
  synthetic mode get one too, so browser tests can check it; the server
  never sends for them (R-06).
- **R-09 Same code on both sides.** The browser sends the Pixel Purchase
  with `eventID` set to that code, and the server sends it as `event_id`.
  Meta treats a browser and a server Purchase with the same name and code
  as one purchase. An older paid order with no code sends the Pixel
  Purchase without one, as today, and no server event.
- **R-10 Once per order on the server.** Before sending, the server marks
  the order as sent in one write that succeeds only if it was not marked
  already. Only the request that made the mark sends. A reload, a second
  tab, or a second browser for the same order sends nothing more.

### Never in the customer's way

- **R-11 The browser does not wait.** The call is made after the paid screen
  is shown, in the background (`keepalive`, so leaving the page does not
  cancel it), and its answer and any error are ignored. Nothing on screen
  depends on it.
- **R-12 One short try.** The server gives Meta at most 3 seconds, tries
  once, and never retries. The route always answers `204` with no body,
  whatever happened, so the browser learns nothing about the order or Meta.
- **R-13 What is recorded.** On the order, the server keeps only: the event
  code (R-07), when the send was tried, the privacy-page version the visitor
  agreed under (proof of consent, Q-6), and the outcome as a short code
  (`sent`, `meta_<http status>`, `timeout`, `error`). Never the IP address,
  browser type, cookie codes, hashed email, the request sent to Meta or
  Meta's reply.
- **R-14 Logs.** No log line holds the IP address, browser type, cookie
  codes, email, hash, access token or order email. At most one line per call
  with the outcome code.
- **R-15 Abuse.** The route uses an existing per-IP rate limit (as the
  status route does), and reads only `order_id` and the privacy-page version
  from the body.

### Where it runs

- **R-16 Off without the secret.** With `META_CAPI_ACCESS_TOKEN` or the
  Pixel ID empty, the route sends nothing and answers `204`. The deploy job
  adds `META_CAPI_ACCESS_TOKEN` to its Worker secrets list. Preview workers
  get no token, so previews send nothing; local and synthetic runs never
  send.
- **R-17 Test Events code.** An optional Worker secret,
  `META_CAPI_TEST_EVENT_CODE`, set by hand in the Cloudflare dashboard only
  while checking (not in the deploy job, which fails on an empty secret).
  When set, every server event carries it as `test_event_code`, so it shows
  on Meta's Test Events screen.
- **R-18 Meta's address.** `https://graph.facebook.com/<version>/<Pixel ID>/events`,
  with the API version fixed in code (a current version at build time) and
  the token in the request body, never in a logged address.

### Words and records

- **R-19 Cookie notice.** Before this ships, the notice names the hashed
  email (privacy item 1), in the wording Yasir approves (Q-1).
- **R-20 Privacy page.** The change notes record that items 2 and 7 are met
  and how. The public page changes only as Yasir decides in Q-2.
- **R-21 Cleanup.** The hourly cleanup clears the order's event code when it
  makes the order anonymous. The send time, version and outcome code may
  stay on the bare row; they identify no one.

## Failure and recovery

| What goes wrong | What happens |
|---|---|
| Meta slow (over 3 s), down, or refuses the token | Not sent; outcome recorded; customer sees nothing; no retry. The Pixel Purchase, if it loaded, still counts. |
| Ad blocker blocks Meta's script | The server event still goes (that is its point), with no `_fbp`. |
| Browser call fails or the tab closes first | No server event for that order; the Pixel may still have sent. |
| Token expired or revoked | Every send records `meta_401`/`meta_403`; Events Manager shows no server events. Founder makes a new token and updates the GitHub secret. |
| Buyer never returns from Midtrans | No Purchase from either side (accepted with Option A). |

## Evidence, data, privacy, and cost

- No cost from Meta. One extra short request per paid order.
- New data stored on Nuave's server: per paid order, a random event code,
  a send time, a privacy-page version and an outcome code. No IP address,
  browser type or cookie code is stored, so section 2's "Nuave sendiri tidak
  menyimpan alamat IP Anda" stays true.
- Personal data sent to Meta: the hashed order email, IP address, browser
  type and Meta cookie codes, only after Allow, as section 10 lists. Section
  10 also allows a server Lead; not sending one keeps the page true.
- Consent proof: UU PDP, as we understand it, expects Nuave to be able to
  show the consent was given; the stored version and time do that for each
  send. Lawyer check alongside the other open privacy checks.

## Acceptance criteria

- **AC-01** Without the token (and in a preview build), the route answers
  `204` and makes no request to a Meta address (unit test with a fake
  `fetch`).
- **AC-02** No request to Meta when: the body's privacy version differs from
  `PRIVACY_VERSION`; the order is a test pass, simulated, unpaid, legacy, in
  another environment, or has no event code; Midtrans is in sandbox and no
  test code is set.
- **AC-03** The request to Meta holds exactly the R-03 fields: for an order
  email `" Name@Example.COM "` the `em` value is the SHA-256 of
  `name@example.com`; the IP and browser type equal the request's headers;
  `_fbp`/`_fbc` come from its cookies; value 249000, currency IDR. The
  serialised request contains none of: the order number, plain email,
  business name, website, report link, questions or intake text.
- **AC-04** After a send, no stored row or column and no log line contains
  the test IP address, user agent or cookie codes (test searches the
  database and captured logs).
- **AC-05** Two calls for the same order (two tabs at once) make one request
  to Meta.
- **AC-06** With Meta faked to hang, the route answers within about 3.5 s
  and records `timeout`; with Meta faked to answer 500, one request only,
  `meta_500` recorded.
- **AC-07** Browser test (synthetic, Allow stored): on the paid screen the
  Pixel Purchase carries `eventID` equal to `payment.purchase_event_id`, and
  one call to the route carries the order and privacy version. With the
  route made to hang or fail, the paid screen appears as fast as without it
  and shows no error.
- **AC-08** Browser test: with Don't allow or no choice, on `/r`, on `/uji`,
  and in a tab with a test-pass code, no call to the route.
- **AC-09** The deploy job's Worker secrets list holds
  `META_CAPI_ACCESS_TOKEN`; the preview job sets no Meta token.
- **AC-10** The cleanup clears the event code of an order it makes
  anonymous (extends the existing cleanup test).
- **AC-11** Notice wording and privacy page match Yasir's answers to Q-1 and
  Q-2.
- **AC-12** Founder-run (see Founder steps): one sandbox purchase with the
  test code shows a server Purchase in Test Events, 249000 IDR, with email,
  IP address and browser type matched, and the browser Purchase counted once
  with it.

## Founder steps in Meta Events Manager

1. **Token:** confirm `META_CAPI_ACCESS_TOKEN` is saved as a GitHub Actions
   secret (the deploy job copies it into the Worker).
2. **Keep "Automatic advanced matching" off** (unchanged from Spec 019).
3. **Before the check:** Events Manager → the Pixel → **Test events** →
   copy the test code (it looks like `TEST12345`). In Cloudflare, worker
   `nuave-v2` → Settings → Variables and Secrets, add the secret
   `META_CAPI_TEST_EVENT_CODE` with that code.
4. **Check:** in a fresh browser window opened from the Test events screen
   (so browser events show there too), tap **Allow**, order with an email on
   your list, pay in the Midtrans sandbox, and wait for the "payment
   received" screen. In Test events you should see Purchase from **Server**
   and from **Browser**, 249000 IDR, counted once (Meta marks the second as
   deduplicated). Open the server event: "Customer information" should show
   email (hashed), IP address and user agent, and browser ID if the Pixel
   loaded.
5. **After the check:** delete `META_CAPI_TEST_EVENT_CODE` in Cloudflare,
   and tap **Don't allow** again in your test browsers.
6. **After G1** (Midtrans production): real purchases send without a test
   code. After the first few sales, look at **Overview → Event match
   quality** for Purchase and the **Diagnostics** tab.

## Open questions

- **Q-1 Cookie notice wording (English).** Today: "🍪 Allow cookies?
  Cookies help us measure our ads. Your report and answers are never
  shared." Proposed:

  > 🍪 **Allow cookies?**
  > Cookies help us measure our ads. If you buy, Meta also gets your order
  > email as a scrambled code, never as readable text. Your report and
  > answers are never shared. [Privacy policy]
  >
  > [Don't allow] [Allow]

  **Recommended:** approve as written (one added sentence; buttons
  unchanged).
- **Q-2 Does the privacy page version go up (which asks everyone again)?**
  The page's words are already true: section 2 and section 10 name the
  hashed purchase email and server events. But everyone who tapped Allow so
  far saw a notice that did not mention the email, and the stored choice
  only resets when `PRIVACY_VERSION` changes. **Recommended:** yes, raise it
  to **1.4**, so every Allow behind a server event was given under the
  notice that names the email. It costs little now: no ads run yet and
  almost every Allow is a founder test. Make one true public change with it,
  in section 10's third point, narrowing server events to purchases:
  "untuk pembelian, catatan yang sama dari server kami, beserta alamat IP,
  jenis browser, dan kode cookie Meta Anda; dan" (was "untuk cek gratis dan
  pembelian, …"). Adding a server Lead later would then need its own
  version change and fresh consent, which is right.
- **Q-3 Sandbox payments.** Until G1, payments go through the Midtrans
  sandbox. **Recommended:** the server sends a Purchase for a sandbox payment
  only with a Test Events code, so test payments never reach Meta as real
  sales (R-06). (The browser Pixel still does today; you tap Don't allow in
  your test browsers.)
- **Q-4 Page address.** Meta requires a page address for website events.
  **Recommended:** send the fixed `<site>/audit`, never the real address with
  its query string. It names no one and is the page section 10 already
  covers ("halaman Nuave yang Anda buka").
- **Q-5 Failed sends.** **Recommended:** one try per order, never again,
  even on a later visit. A missed server event is covered by the Pixel when
  it loaded; Events Manager's diagnostics show if sends fail often.
- **Q-6 Consent record.** **Recommended:** keep the privacy-page version
  and time of each send on the order (R-13) as proof of consent, kept on
  the bare row after cleanup.
- **Q-7 Purchase only.** **Recommended:** confirm R-02 (no server Lead or
  InitiateCheckout in this version).

## Implementation notes

- One migration (next free number) adds nullable columns to `orders`: the
  event code, send time, consent version and outcome code. Existing paid
  orders have no code and send no server event (R-09).
- Making the code in the payment write (`src/lib/payments/apply.ts`) is the
  natural place; if that code is risky to touch, make it lazily in the
  status route with `UPDATE … WHERE meta_event_id IS NULL`, then read it
  back.
- Use Web Crypto (`crypto.subtle.digest("SHA-256", …)`) for the hash and
  `crypto.randomUUID()` for the code; `AbortSignal.timeout(3000)` for the
  Meta request.
- The Pixel ID comes from `metaPixelId()`; the site address from
  `siteOrigin()`.
- In the browser, extend `trackJourneyEvent("Purchase", …)` to take the
  event code: pass it to `fbq` as `{ eventID }` and make the background call
  inside the same once-per-order guard, after the same consent checks.
- Tests fake Meta's address; no test calls Meta.

## Verification record

Not started.
