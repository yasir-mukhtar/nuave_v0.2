# Spec 022: Meta Conversions API (server Purchase event)

> Status: **Implementing** on PR #170 (build started 2026-10-26; see
> [VERIFICATION.md](./VERIFICATION.md)). **Approved** by Yasir on 2026-10-26 (revision 6: his answers to
> Q-1 to Q-8, with the layered cookie notice of Q-1; see Decisions). The
> revised "How it works" wording (Q-9) and Q-2 summary, reworded after
> review round 4, were re-approved by Yasir as written; the layered
> approach itself needs the lawyer check before ads start. Revisions 2 and 3 applied independent
> review rounds 1 and 2; round 3 PASS (PR #170).
> Number: drafted and approved as Spec 021; renumbered 022 on 2026-10-27
> (founder) because Report v2 reached main first as Spec 021 (PR #171), as
> with Spec 019/020. Its migration is 0015, so Report v2 keeps 0014.
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
   the browser Pixel's Purchase (R-09, R-09a, R-10, R-11). This spec changes
   Spec 019 R-09 and R-10 (see R-09 and Non-scope below).
3. `docs/DECISION_LOG.md`, 2026-10-24 "S5: Meta consent…" and the 2026-10-25
   entries "Cookie notice and Meta Pixel (Spec 019)", "Cookie notice in
   English, shorter" and "Cookie notice: Allow cookies?"; and the two
   2026-10-26 entries on Spec 022 ("Approve Spec 022…" and "Cookie notice:
   layered disclosure").
4. The paid screen and how the page learns an order is paid:
   `src/app/api/orders/status/route.ts`, `src/lib/payments/attempts.ts`
   (`paymentView`), `src/lib/payments/apply.ts` (the writes that record a
   payment), and the Purchase effect in
   `src/lib/intake/SmartIntakeJourney.tsx`.
5. `src/lib/orders/retention.ts` (the hourly cleanup), `wrangler.jsonc`
   (`observability`), the deploy job in `.github/workflows/ci.yml` (Worker
   secrets list) and `.github/workflows/pr-preview.yml`.

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
is slow or down, the customer notices nothing. Nuave keeps no copy of the IP
address or browser type; R-22 and AC-14 aim to make that true of its
Cloudflare logs as well, and check it.

## User and situation

A clinic owner who came from a Facebook or Instagram ad, tapped Allow, paid
in Midtrans and was sent back to `/audit`, where the page polls the order
status until it shows the payment as received.

## Scope

- One server event: **Purchase**, sent once per paid order.
- A small server route the browser calls when it shows the paid screen.
- A random event code per paid order, shared by the Pixel and the server.
- A layered cookie notice (Q-1): a short, purpose-led notice, a visible
  "How it works" link that opens a concise explanation inside the notice
  (Q-9), and the privacy page change that goes with it (Q-2).
- Secret `META_CAPI_ACCESS_TOKEN` in the deploy job; an optional test code
  for Meta's Test Events screen.
- Switching off Cloudflare's automatic per-request log, if founder step 0
  shows it holds the IP address or browser type (R-22, Q-8).
- Founder steps in Meta Events Manager.

## Non-scope

- **Server Lead and InitiateCheckout.** Purchase only for this first version
  (R-02 says why).
- **Sending from anywhere but the browser's call.** Founder decision
  (Option A): the IP address and browser type exist only during the
  visitor's own request, and Nuave must not store them. So the Midtrans
  background notification, the status check and the cron never contact Meta
  (R-23). A buyer who pays and never comes back to the Nuave page sends no
  Purchase from either the browser or the server. This replaces Spec 019
  R-09's "the server step will cover that".
- Retrying a failed send, a queue, or a dashboard of sent events.
- Other trackers, phone numbers, names, city or any other matching field.
- Changing how the browser Pixel's Lead, InitiateCheckout and PageView work.

## Experience

Nothing changes on screen except the cookie notice (Q-1: new text and a
"How it works" link that opens a short explanation within the notice) and
the privacy page (Q-2); everyone is asked for their cookie choice again. The paid
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
  - Meta's required envelope, which describes no one: the event time (the
    time of this call), `action_source: "website"`, and a page address that
    is the fixed `<site>/audit` with no query string (Q-4).

  Never the report, questions, AI answers, intake facts, business name,
  website, order number, report link or email in readable form, and no
  other Meta field.
- **R-04 Value.** Always 249000 IDR, the same as the Pixel.

### Who gets one

- **R-05 Only after Allow.** The browser calls the server only when, at that
  moment, all of these hold (the same checks as the Pixel's Purchase):
  the stored choice is Allow under the current privacy-page version (read
  again at that moment, so Don't allow chosen in another tab counts), the
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
  sends only when a Test Events code is set (R-17), and then always with it
  (Q-3). This keeps sandbox sends to the moments the founder is
  deliberately checking. It does not keep them out of Meta's numbers: Meta
  counts events sent with a test code like any other, so the check is done
  before ads start and the code is removed straight after.

### Counting once

- **R-07 The event code.** Each paid order gets one random event code
  (128 bits, for example a UUID), made in the same write that records the
  payment: the Midtrans paid write in `src/lib/payments/apply.ts` and the
  simulated payment. It is stored on the order and never changes. It says
  nothing about the order, the buyer or the business. Orders paid before
  this ships have none.
- **R-08 Sharing it.** The order status answer for a paid order adds
  `payment.purchase_event_id` with that code (an addition to Spec 016 R-21's
  field list; still no email, report or secret). Simulated payments in
  synthetic mode get one too, so browser tests can check it; the server
  never sends for them (R-06).
- **R-09 Same code on both sides.** The browser sends the Pixel Purchase
  with `eventID` set to that code (`fbq`'s fourth argument), and the server
  sends it as `event_id`. Meta treats a browser and a server Purchase with
  the same name and code, arriving within 48 hours, as one purchase. This
  changes Spec 019 R-10: the Pixel Purchase now also carries the event code,
  which identifies no one. An older paid order with no code sends the Pixel
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
  once, and never retries. The route answers `204` with no body whatever
  happened with Meta, so the browser learns nothing about the order or
  Meta. The only other answers are the shared rate limit's own (R-15).
- **R-13 What is recorded.** On the order, the server keeps only: the event
  code (R-07), when the send was tried, the privacy-page version the visitor
  agreed under (proof of consent, Q-6), and the outcome as a short code
  (`sent`, `meta_<http status>`, `timeout`, `error`). Never the IP address,
  browser type, cookie codes, hashed email, the request sent to Meta or
  Meta's reply.
- **R-14 Nuave's own logs.** No log line Nuave writes holds the IP address,
  browser type, cookie codes, order email, its hash or the access token. The
  route writes exactly one line per call, with the outcome code only (also
  when nothing is sent, e.g. `skipped`), so AC-14 has a line to inspect.
- **R-15 Abuse.** The route uses the existing per-IP rate limit (as the
  status route does); when it trips, the route gives that limit's usual
  answer (429, or 503 when the limit cannot be checked), which the browser
  ignores. The route reads only `order_id` and the privacy-page version
  from the body.

### Where it runs

- **R-16 Off without the secret.** With `META_CAPI_ACCESS_TOKEN` or the
  Pixel ID empty, the route sends nothing and answers `204`. The deploy job
  in `ci.yml` adds `META_CAPI_ACCESS_TOKEN` to its Worker secrets list.
  Preview workers (`pr-preview.yml`) get no token, so previews send nothing;
  local and synthetic runs never send.
- **R-17 Test Events code.** An optional Worker secret,
  `META_CAPI_TEST_EVENT_CODE`, set by hand in the Cloudflare dashboard only
  while checking (not in the deploy job, which fails on an empty secret).
  When set, the request carries it once as `test_event_code`, at the top
  level next to the list of events, so the event shows on Meta's Test
  Events screen.
- **R-18 Meta's address.** A POST to
  `https://graph.facebook.com/<version>/<Pixel ID>/events`, with the API
  version fixed in code (a current version at build time). The events, the
  token and any test code go as form fields in the request body, never in
  the address.

### Words and records

- **R-19 Cookie notice, first layer.** Before this ships, the notice shows
  the exact Q-1 text: short and about the purpose, with a visible
  **How it works** link and the buttons Don't allow and Allow, both one tap
  and in plain view. It does not need to name the coded email or Meta; this
  replaces privacy item 1's "the notice names it" and the 2026-10-25 rule
  that the server step brings the email back into the notice.
- **R-19a Second layer, before consent.** **How it works** opens the Q-9
  explanation inside the notice (it expands in place; no new page, nothing
  loaded from Meta), with Don't allow and Allow still in reach and a link
  to the privacy page. It states what is shared (including the coded order
  email), with whom (Meta), and why, so this is clearly available before
  the visitor chooses. It is the same when the notice is reopened from
  **Pengaturan cookie**, and follows Spec 019 R-14 (focus and buttons never
  hidden on a phone).
- **R-19b Don't allow means no Meta at all.** Don't allow, no choice, or a
  choice under an older privacy version turns off both the browser Pixel
  (Spec 019 R-02, R-11) and server conversion matching (R-05): no call to
  the route, so no hashed email, IP address or browser type reaches Meta
  for that order. Switching to Don't allow later stops every send not yet
  made; a Purchase already sent cannot be recalled (the privacy page says
  withdrawal does not undo earlier processing, section 5).
- **R-20 Privacy page.** Version 1.4 (`PRIVACY_VERSION` and date in
  `src/lib/legal.ts`, page and `PRIVACY.md` together) with the section 10
  changes of Q-2; it remains the full explanation and names Meta. The
  change notes record that items 2 and 7 are met and how, that item 1 now
  reads "a How it works link opens, inside the notice and before the
  choice, a short explanation that names the hashed order email and Meta"
  (R-19, R-19a), that this spec changes
  Spec 019 R-09 and R-10, and how Q-8 was settled.
- **R-21 Cleanup.** The hourly cleanup clears the order's event code when it
  makes the order anonymous. The send time, version and outcome code may
  stay on the bare row; they identify no one.
- **R-22 Cloudflare's request log.** Cloudflare's Workers Logs are on for
  the site (`wrangler.jsonc`, `observability`) and record details of every
  request, kept 3 days (7 on Workers Paid) in Nuave's Cloudflare account.
  Cloudflare hides cookies there but, by its documentation, probably not the
  IP address or browser type. As decided in Q-8, the founder first opens
  one request in that log (founder step 0); if it shows the IP address or
  browser type, this change switches off that automatic per-request log
  (`observability.logs.invocation_logs: false`) for the production worker,
  keeping Nuave's own log lines, so that section 2's "Nuave sendiri tidak
  menyimpan alamat IP Anda" holds for the whole site, not only this route.
  Cloudflare's documentation does not say whether it attaches request
  details to Nuave's own log lines; AC-14 checks that.
- **R-23 Only the browser's call sends.** No other code path (the Midtrans
  notification, the status check, which can itself record a payment, the
  cron, the support script) makes any request to a Meta address.

## Failure and recovery

| What goes wrong | What happens |
|---|---|
| Meta slow (over 3 s), down, or refuses the token | Not sent; outcome recorded; customer sees nothing; no retry. The Pixel Purchase, if it loaded, still counts. |
| Ad blocker blocks Meta's script | The server event still goes (that is its point), with no `_fbp`. |
| Browser call fails or the tab closes first | No server event for that order; the Pixel may still have sent. |
| Token expired or revoked | Every send records a `meta_4xx` code (Meta usually answers 400 with error 190); Events Manager shows no server events. Founder makes a new token and updates the GitHub secret. |
| Server events must stop now | Founder deletes `META_CAPI_ACCESS_TOKEN` in Cloudflare; nothing is sent (R-16) until the next deploy puts it back. |
| Buyer never returns from Midtrans | No Purchase from either side (accepted with Option A). |

## Evidence, data, privacy, and cost

- No cost from Meta. One extra short request per paid order.
- New data stored on Nuave's server: per paid order, a random event code,
  a send time, a privacy-page version and an outcome code. No IP address,
  browser type or cookie code is stored by Nuave's code. R-22 aims to keep
  none in Nuave's Cloudflare logs either, and AC-14 checks it, so section
  2's "Nuave sendiri tidak menyimpan alamat IP Anda" stays true. Cloudflare still
  processes the IP address to run the site, as sections 2 and 7 say.
- Personal data sent to Meta: the hashed order email, IP address, browser
  type and Meta cookie codes, only after Allow, as section 10 lists. Section
  10 also allows a server Lead; not sending one keeps the page true.
- Sending the hashed order email to Meta is the founder's approved
  exception (decisions of 2026-10-24 and 2026-10-25) to AGENTS.md working
  rule 10 ("keep customer contact out of analytics"), only after Allow.
- Consent proof: UU PDP, as we understand it, expects Nuave to be able to
  show the consent was given; the stored version and time do that for each
  send. Lawyer check alongside the other open privacy checks.
- **Layered notice, for legal review.** The founder's view (2026-10-26) is
  that informed consent does not require the first layer to name the hashed
  email, provided the explanation is clearly available before the choice
  and the full detail is on the privacy page. This is a decision awaiting
  the lawyer's check, not a claim that it is compliant. Points for the
  lawyer: whether the Q-1 and Q-9 text meet UU PDP's requirements for
  informed consent, and whether they meet Meta's Business Tools terms on
  notice to visitors; in particular, that the first layer names one purpose
  (measuring which ads lead to sales) but not the second (showing ads to
  people similar to buyers), which Q-9 and privacy sections 4 and 10 name;
  and whether "limited purchase information" fairly describes a coded
  email, an IP address and a browser type.

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
  `_fbp`/`_fbc` come from its cookies; value 249000, currency IDR; the event
  code equals the one stored on the order; the page address is exactly
  `<site>/audit`; with a test code set, `test_event_code` appears once at the
  top level. The token is not in the request address. The serialised
  request contains none of: the order number, the internal order id, plain
  email, business name,
  website, report link, questions or intake text.
- **AC-04** After a send, no stored row or column and no captured log line
  contains the test IP address, user agent, cookie codes, order email, its
  hash or the access token.
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
- **AC-08** Browser test: no call to the route and no Pixel event with
  Don't allow or no choice; with Don't allow chosen in another tab before
  the paid screen; on `/r`; on `/uji`; and in a tab with a test-pass code
  (no call to the route in each case; R-19b).
- **AC-09** The deploy job in `ci.yml` lists `META_CAPI_ACCESS_TOKEN` among
  its Worker secrets; `pr-preview.yml` sets no Meta token.
- **AC-10** The cleanup clears the event code of an order it makes
  anonymous (extends the existing cleanup test).
- **AC-11** The notice text matches Q-1 exactly and the How it works text
  matches Q-9 word for word; the privacy page shows
  version 1.4 with the Q-2 changes, and a choice stored under 1.3 brings
  the notice back (Spec 019 R-03).
- **AC-11a** Browser test (phone 390×844 and desktop): **How it works** is
  visible in the notice, opens the Q-9 text in place with no request to a
  Meta address, keeps Don't allow and Allow visible and tappable, and links
  to the privacy page; the same from **Pengaturan cookie**.
- **AC-12** Founder-run (see Founder steps): one sandbox purchase with the
  test code shows a server Purchase in Test Events, 249000 IDR, with email,
  IP address and browser type matched, and the browser Purchase counted once
  with it.
- **AC-13** Recording a paid Midtrans notification, a status check that
  records a payment, and a cron run make no request to a Meta address (unit
  tests with a fake `fetch` that fails on any Meta address).
- **AC-14** If R-22 stands (founder step 0): the production worker's
  `wrangler.jsonc` has `observability.logs.invocation_logs` set to `false`.
  After deploy, the founder opens, in Cloudflare's logs, the route's own
  outcome line from the AC-12 check purchase (R-14) and finds no IP address
  or browser type attached to it. If Cloudflare does attach them, the
  question goes back to Yasir under Q-8 before ads start.

## Founder steps in Meta Events Manager

0. **Before the build merges, check Cloudflare's log (Q-8, R-22).**
   Cloudflare → Workers & Pages → `nuave-v2` → Observability: open one
   request. If it shows the IP address or browser type, R-22 stands and the
   build switches that log off; if not, tell the orchestrator so R-22 can
   be dropped.
1. **Before merging, make the token.** In Events Manager, open the Pixel
   (890453577390181) → **Settings** → **Conversions API** → **Generate
   access token**. Save it only in GitHub (repository **Settings → Secrets
   and variables → Actions**) as `META_CAPI_ACCESS_TOKEN`. If the merge
   comes first, that deploy fails and nothing new goes live; adding the
   secret afterwards does not restart it, so re-run the failed deploy in
   GitHub **Actions** (open the run → **Re-run jobs**).
2. **Keep "Automatic advanced matching" off** (unchanged from Spec 019).
3. **Before the check:** Events Manager → the Pixel → **Test events** →
   copy the test code (it looks like `TEST12345`). In Cloudflare, worker
   `nuave-v2` → Settings → Variables and Secrets, add the secret
   `META_CAPI_TEST_EVENT_CODE` with that code.
4. **Check, before ads start:** in a fresh browser window opened from the
   Test events screen (so browser events show there too), tap **Allow**,
   order with an email on your list, pay in the Midtrans sandbox, and wait
   for the "payment received" screen. In Test events you should see
   Purchase from **Server** and from **Browser**, 249000 IDR, counted once
   (Meta marks the second as deduplicated). Open the server event:
   "Customer information" should show email (hashed), IP address and user
   agent, and browser ID if the Pixel loaded. This check purchase also
   counts in Events Manager as one real Purchase; that is harmless while no
   ads run.
5. **Straight after the check:** delete `META_CAPI_TEST_EVENT_CODE` in
   Cloudflare, and tap **Don't allow** again in your test browsers.
6. **Cloudflare log check (AC-14):** Cloudflare → Workers & Pages →
   `nuave-v2` → Observability: find the route's outcome line from the
   check purchase in step 4 and confirm no IP address or browser type is
   shown with it. If one is, tell the orchestrator before ads start (Q-8).
   Cloudflare keeps these lines only 3 days (7 on Workers Paid), so do this
   within that time after step 4; if the line cannot be found, AC-14 is not
   checked yet (repeat step 4), not passed.
7. **To stop server events at once:** delete `META_CAPI_ACCESS_TOKEN` in
   Cloudflare (`nuave-v2` → Settings → Variables and Secrets). Nothing is
   sent until the next deploy from `main` puts it back; to stop for good,
   also remove it from `ci.yml`.
8. **After G1** (Midtrans production): real purchases send without a test
   code. After the first few sales, look at **Overview → Event match
   quality** for Purchase and the **Diagnostics** tab.

Menu names are from memory and may differ slightly in Meta's and
Cloudflare's current screens.

## Decisions (answered by Yasir on 2026-10-26)

- **Q-1 Cookie notice: layered disclosure** (Yasir, 2026-10-26; replaces
  the options A and B offered earlier). First layer, exact text:

  > **Help us understand what works**
  > We use cookies and limited purchase information to measure which ads
  > lead to sales. Your report and business answers are never shared with
  > advertising partners. [How it works]
  >
  > [Don't allow] [Allow]

  The second layer (Q-9) and the privacy page explain the data shared,
  including the hashed order email, and name Meta. Yasir's reasoning:
  informed consent without needlessly alarming visitors or hiding what
  happens. Kept as a decision for legal review (see Evidence), not a claim
  of compliance. The privacy page keeps naming Meta, because Meta's terms
  for advertisers and UU PDP, as we understand them, expect visitors to be
  told who receives the data.
- **Q-2 Privacy page: version 1.4, with a reassurance paragraph.** Raising
  the version asks everyone to choose again, under the notice above. The
  public changes, all in section 10:
  - a new first paragraph of the Meta part, before the details: "Singkatnya:
    kami tidak mengirim data Anda ke Meta kecuali Anda memilih Allow. Email
    Anda tidak pernah dikirim ke Meta dalam bentuk yang bisa dibaca.
    Laporan, pertanyaan, jawaban AI, dan data bisnis Anda tidak pernah
    dikirim ke Meta. Kami tidak menjual data Anda, dan Anda bisa mengubah
    pilihan kapan saja." (Revised after review round 4, which added "data
    Anda" and "ke Meta" so no sentence suggests nothing is shared with
    anyone; **re-approved by Yasir as written**, 2026-10-26.)
  - the third point, narrowing server events to purchases and naming the
    page address: "untuk pembelian, catatan yang sama dari server kami,
    beserta alamat IP, jenis browser, kode cookie Meta Anda, dan alamat
    halaman pemesanan Nuave; dan" (was "untuk cek gratis dan pembelian, …");
  - only if the lawyer agrees, after "Pilihan cookie Anda sendiri disimpan
    di browser Anda selama 12 bulan.": "Untuk setiap pembelian yang kami
    kirim ke Meta, kami mencatat waktu pengirimannya dan versi kebijakan
    yang Anda setujui."

  The page must not say or suggest that data is not shared with anyone: it
  is shared with Meta after Allow. Adding a server Lead later needs its own
  version change and fresh consent.
- **Q-3 Sandbox payments: as recommended.** The server sends a Purchase for
  a sandbox payment only while a Test Events code is set (R-06). Meta still
  counts it, so the check runs before ads start and the code is removed
  straight after. (The browser Pixel still sends sandbox purchases; Yasir
  taps Don't allow in his test browsers.)
- **Q-4 Page address: as recommended.** The fixed `<site>/audit`, never the
  real address with its query string.
- **Q-5 Failed sends: as recommended.** One try per order, never again.
- **Q-6 Consent record: as recommended.** The privacy-page version and time
  of each send stay on the order (R-13), also on the bare row after
  cleanup.
- **Q-7 Purchase only: as recommended** (R-02).
- **Q-8 Cloudflare's request log: as recommended, option (a).** Open one
  log entry first; if it holds the IP address, switch off the automatic
  per-request log (R-22), accepting that Cloudflare then keeps no saved
  history of past requests and cron runs (a check like the 2026-10-14 cron
  CPU reading needs a temporary switch back on).

- **Q-9 "How it works" text.** Yasir approved the first draft as written
  (2026-10-26). Review round 4 found it said less than the privacy page
  and overstated in two places, so the text below was revised; **Yasir
  re-approved it as written** (2026-10-26). English like the notice:

  > **How it works**
  > - If you allow, Meta (Facebook and Instagram), our advertising partner,
  >   sets cookies and learns which Nuave pages you open and when you
  >   finish the free check or open checkout, with your IP address and
  >   device type, so we can see which ads bring visitors.
  > - If you buy, we also send Meta that a purchase happened and its value
  >   (Rp249.000), your IP address, browser type and Meta cookie codes, and
  >   your order email in coded (hashed) form, never as readable text. Meta
  >   uses these to match the purchase to your Facebook or Instagram
  >   account and the ad you saw, and to show our ads to people similar to
  >   our buyers.
  > - We never send Meta your report, your questions, AI answers or your
  >   business details.
  > - If you don't allow, none of your data is sent to Meta, from your
  >   browser or from our server. You can change your choice anytime under
  >   Pengaturan cookie, at the bottom of our home page and privacy page.
  > [Privacy policy]

  What changed from the first draft: bullet 1 now says what the browser
  shares for everyone who allows (privacy section 10, first two points);
  bullet 2 adds the Meta cookie codes and says the email is matched to the
  buyer's account, as section 10 does; bullet 3 says "never send Meta"
  (questions and business data do go to the AI and search providers,
  sections 6 and 7); bullet 4 says "none of your data" (the free check
  reads a business's public Instagram page whatever the choice) and names
  the real link, which `/audit` does not show.

  It names Meta here because this is the place a visitor goes to learn who
  receives the data; the first layer stays free of it, as Yasir chose.
  Lawyer check with Q-1.

## Implementation notes

- One migration (next free number) adds nullable columns to `orders`: the
  event code, send time, consent version and outcome code. The payment
  writes in `src/lib/payments/apply.ts` set the event code; existing paid
  orders have none and send no server event (R-09).
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

Build and offline checks: [VERIFICATION.md](./VERIFICATION.md). Review round 1 (PR #170, 2026-10-26): ALMOST; findings 1–8
applied in revision 2. Round 2: ALMOST; findings 1–5 applied in revision 3.
Round 3: PASS; its two nits applied. Approved 2026-10-26 (revision 4).
Revision 5 (same day): the layered cookie notice of Q-1, R-19a, R-19b,
AC-11a and Q-9, on Yasir's instruction; Q-9 approved as written. Review
round 4 on revision 5: ALMOST; findings 1–6 applied in revision 6 (Q-9 and
the Q-2 summary reworded; both re-approved by Yasir as written). Round 5: PASS;
its nit (AC-14 and Scope conditional on founder step 0) applied.
