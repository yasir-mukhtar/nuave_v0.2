# Verification: Spec 022 — Meta Conversions API (server Purchase event)

> Result: **Implementing.** Offline criteria checked by the builder (below);
> independent review of the code and the founder-run AC-12 and AC-14 are
> still to come.
> Spec version: revision 6, approved 2026-10-26 (all wording re-approved)
> Implementation: [PR #170](https://github.com/yasir-mukhtar/nuave_v0.2/pull/170),
> branch `claude/great-ritchie-w8rnub`

## What was built

- **Migration 0015** (`migrations/0015_meta_purchase.sql`): four nullable
  columns on `orders`: `meta_event_id`, `meta_sent_at`,
  `meta_consent_version`, `meta_outcome`.
- **Event code (R-07):** made with `crypto.randomUUID()` in the write that
  records a Midtrans payment and in the simulated payment
  (`src/lib/payments/apply.ts`). Orders paid before this have none.
- **Status answer (R-08):** `payment.purchase_event_id` for a paid order
  (`src/lib/payments/attempts.ts`).
- **Server route (R-01 to R-18):** `POST /api/meta/purchase`
  (`src/app/api/meta/purchase/route.ts`, `src/lib/meta/conversions.ts`).
  Reads only `order_id` and `consent_version`; the IP address, browser type
  and `_fbp`/`_fbc` come from the request and go no further than Meta. One
  claim write per order, one try of at most 3 seconds, always `204` (or the
  shared per-IP limit's own 429/503). One log line per call with the outcome
  code. Graph API `v26.0`; the token and any test code are form fields.
- **Browser (R-09, R-11, R-19b):** `trackJourneyEvent("Purchase", …)` sends
  the Pixel Purchase with `{ eventID }` and makes one background
  `keepalive` call, under the same checks as the Pixel
  (`src/lib/consent/meta-pixel.ts`, `src/lib/intake/SmartIntakeJourney.tsx`).
- **Layered notice (R-19, R-19a):** the Q-1 text and a **How it works**
  button that opens the Q-9 text inside the notice
  (`src/components/consent/CookieConsent.tsx`).
- **Privacy page 1.4 (R-20):** `PRIVACY_VERSION` 1.4 (asks everyone again),
  the "Singkatnya" paragraph and the purchase-only server-event point in
  section 10 (`src/app/privacy/page.tsx`, `docs/content/website/PRIVACY.md`).
- **Cleanup (R-21):** the hourly cleanup clears `meta_event_id`.
- **Deploy (R-16, R-22):** `META_CAPI_ACCESS_TOKEN` in the deploy job's
  Worker secrets; `observability.logs.invocation_logs: false` in
  `wrangler.jsonc` (to keep only if founder step 0 shows the log holds IP
  addresses).

## Builder's offline checks

| AC | How it is checked | Result |
|---|---|---|
| AC-01 | `src/lib/meta/purchase-route.test.ts`: no token or no Pixel ID → 204, no Meta request | pass |
| AC-02 | same file: wrong or missing privacy version; test pass, unpaid, legacy, other environment, no code, bad id; synthetic and simulated; sandbox without a test code | pass |
| AC-03 | same file: exact fields, hash of `name@example.com` for `" Name@Example.COM "`, IP and browser type from the headers, cookie codes from `Cookie`, value and currency, stored event code, page address `<site>/audit`, test code once at the top level, token not in the address, no order number, internal id, email, business or website | pass |
| AC-04 | same file: every table and every log line searched for the IP, browser type, cookie codes, email, hash and token | pass |
| AC-05 | same file: three calls at once and a reload make one Meta request | pass |
| AC-06 | same file: a hanging Meta answers within 3.5 s with `timeout`; a 500 is one request, `meta_500`, never retried | pass |
| AC-07 | `tests/e2e/meta-pixel.spec.ts`: Pixel `eventID` equals `payment.purchase_event_id`; one server call with the order and version; a hanging call never holds up the paid screen or the next step | pass |
| AC-08 | `cookie-consent.test.tsx` (no choice, Don't allow, older version, Don't allow in another tab, test-pass code, `/r`, `/uji`) and the browser suite (Don't allow) | pass |
| AC-09 | `src/lib/orders/wrangler-config.test.ts` | pass |
| AC-10 | `src/lib/orders/retention.test.ts` | pass |
| AC-11 | `cookie-consent.test.tsx`: Q-1 and Q-9 word for word, a 1.3 choice brings the notice back; `src/lib/public-truth-wave2.test.ts`: version 1.4 and the section 10 wording | pass |
| AC-11a | `cookie-consent.test.tsx` and the browser suite on a 390×844 phone | pass |
| AC-12 | founder-run (founder steps 3 to 5) | not run |
| AC-13 | `src/lib/payments/payment-routes.test.ts`: notification, status check and cron make no Meta request | pass |
| AC-14 | `wrangler-config.test.ts` checks the setting; the founder log check (step 6) is after deploy | setting pass; founder check not run |

## Runs (2026-10-26, builder)

- `npm run check`: typecheck, lint (no errors), format and typography pass.
- `npm run test:unit`: 145 files, 2,616 tests pass.
- `npm run build` and `npm run build:cf`: pass.
- Browser suites: main 86 passed, switched-off 3 passed, Pixel 14 passed.

## Founder step 0 (2026-10-27)

Yasir opened a page-visit entry (`$workers.eventType = "fetch"`) in
Cloudflare → `nuave-v2` → Observability, last 3 days. Cloudflare's automatic
per-request log keeps, for every visit, the request headers
`cf-connecting-ip`, `x-real-ip` and `user-agent`, and the visitor's city,
region, postal code, latitude and longitude (cookies show as "REDACTED").
So R-22 stands: `observability.logs.invocation_logs: false` stays in this
change. The every-minute cron entries carry no visitor data. AC-14's
after-deploy check (the route's own log line) is still to do.

## Notes

- This session's shell sets `CHEAPERINFERENCE_API_KEY` and
  `META_CAPI_ACCESS_TOKEN`, which makes the existing
  `glm-local.test.ts` case "live send requires live mode and a server
  credential" fail; with both unset it passes. The checks above ran with
  both unset. No test or check called Meta or any AI provider.
- The browser suite ran against this session's pre-installed Chromium (the
  pinned Playwright expects a different browser build), through a temporary
  config that was not committed.
