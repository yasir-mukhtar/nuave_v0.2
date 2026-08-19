# Spec (draft): Nuave Modules 00 (Landing) and 01 (Order Preview)

> Status: **DRAFT** — not approved, not for implementation
> Owner: Orchestrator (founder approval required before approval)
> Updated: 2026-08-17
> Implements: entry and order-preview touchpoints in the target journey
> Path: `docs/drafts/00-01-entry-and-preview-spec-draft.md`

This is a **draft** bounded specification. It encodes settled facts from the
product plans and flags the open decisions that remain. It must not be
implemented, committed, or promoted until it is reviewed, revised, and marked
**Approved**. Nothing here overrides `docs/VISION.md`, `docs/PRODUCT.md`, or
`docs/JOURNEY_CONTRACT.md`.

---

## Required context

Read in order:

1. `AGENTS.md`
2. `docs/journey/01-order-preview.md` (working product plan for the preview touchpoint)
3. `docs/content/order-preview-copy.md` (customer-facing page copy and section order)
4. `docs/content/landing-copy.md` (landing copy source)
5. `docs/content/WEBSITE_STRUCTURE_CONTENT_PLAN.md`
6. `Archive Candidates/completed-plans/HANDOFF_LP_REPLACE.md`
7. `docs/content/website/FAQ.md`, `docs/content/website/TERMS.md`,
   `docs/content/website/PRIVACY.md`, `docs/content/website/SUPPORT.md`
8. `docs/JOURNEY_CONTRACT.md` (module ownership, 00/01 rows, and the 01→02 handoff fields)
9. `src/app/page.tsx` and `Archive Candidates/lp-remote/src/app/page.tsx` (current landing implementation state, read-only)

Do not load: `archive/`, `node_modules/`, or the later-module plans (02–07)
beyond the handoff fields named in `JOURNEY_CONTRACT.md`.

---

## Problem

A visitor arriving from the landing page needs to (a) recognize that Nuave has
found **the correct** business, (b) understand what one paid audit includes,
and (c) decide whether to pay — without Nuave running a personalized AI audit
or incurring avoidable language-model cost **before** verified payment.

The current landing (`Archive Candidates/lp-remote` / `src/app/page.tsx`) explains the offer but
does not yet collect a business source, render a preview, or form an order
summary. There is no bounded implementation contract for the entry and preview
touchpoints.

---

## Desired outcome

A visitor submits **one supported public business source** and **one delivery
email**, and immediately sees:

- a best-effort identity preview (logo/profile image, name, description, and
  source) that is **not** an audit result;
- a one-audit quote of **Rp99.000** total, no added tax or fee, valid 30 days;
- Terms + Privacy acceptance; and
- a clear split between "continue to summary" and "pay now."

No language-model call, no audit question, no personalized brief, and no
observation runs before verified payment. The result of a successful entry is a
server-owned `checkout_intent` that Module 02 (Payment) can consume.

---

## Scope

- **00 — Landing:** explain the offer and accept exactly one supported public
  business source, then hand that source to 01.
- **01 — Order Preview:** best-effort identity preview; recipient email; one-audit
  scope; limitations; policy links; the Rp99.000 30-day quote; the split CTA;
  Terms + Privacy acceptance; caching by normalized source; and the
  `checkout_intent` handoff to 02.
- Server-owned customer states `draft → preview_ready → awaiting_payment`, plus
  the preview recovery states `preview_attention` and `quote_expired`.

## Non-scope

- Payment execution, Midtrans reconciliation, order creation, and paid events
  (Module 02).
- Business-facts preparation, questions, audit run, report, and report
  access/recovery (Modules 03–07).
- TikTok extraction, multi-business orders, subscriptions, packages, credits, or
  multiple pricing tiers.
- Customer accounts, passwords, OTP, or a report dashboard.
- Any score, competitor finding, or recommendation shown before payment.
- The design of the later business-information, question-review, processing, or
  report pages.

---

## Experience

### Entry condition

The landing page accepts **one** customer-submitted public business link:

- an official website;
- a Google Maps business listing, including a shared Maps link; or
- a public Instagram business profile.

**TikTok and additional sources are not supported at this touchpoint.** They
may be collected after payment if the audit needs them. The accepted
landing-page entry action is the primary CTA; the accepted wording in the
Module 01 plan is **“Cek bisnis saya di AI”** (see Open decisions — the landing
copy currently still says “Audit bisnis saya”).

### Customer-visible states

- **Loading** — state that Nuave is looking for the business; never say the
  audit is running.
- **Preview found** — show the available identity and source; allow replacing
  the link.
- **Partial preview** — show what was found, use a neutral image fallback, omit
  an unsupported description; the visitor may continue.
- **Business not confidently identified** — ask for the business name and, when
  necessary, city or service area; never select a branch silently.
- **Unsupported or inaccessible link** — explain the link could not be read and
  ask for a website, Google Maps listing, or public Instagram profile; do not
  spend an AI call to rescue it.
- **Payment cancelled or failed** — keep the source, preview, and email for a
  retry; state clearly that no audit has started.
- **Payment successful** — confirm payment and move to business-information
  review; never start the audit automatically.

### Server-owned states (spine prefix)

```text
draft → preview_ready → awaiting_payment
```

- `draft` — a source was submitted and preview resolution has not completed.
- `preview_ready` — a usable (possibly partial) preview and the current
  Rp99.000 quote are available.
- `awaiting_payment` — Terms + Privacy accepted and a `checkout_intent` is ready
  for Module 02.

Recovery states owned by this touchpoint: `preview_attention` (ambiguous or
unreadable identity) and `quote_expired` (the 30-day quote lapsed before
payment).

### Page structure (in `docs/content/order-preview-copy.md` order)

1. **Business identity** — “Kami menemukan bisnis Anda,” then logo, name, short
   description, source, and a “Bukan bisnis Anda?” correction path.
2. **What Nuave checks** — ten customer-like questions tested with AI, with a
   statement that the customer can review business facts and the full question
   pack before the audit runs.
3. **What the customer receives** — answers, analysis, other businesses
   mentioned, improvement recommendations, and a downloadable PDF report.
4. **How it works** — payment, business-information review, question review,
   report delivery.
5. **Order summary** — audited business, one-audit price, recipient email,
   payment action, and the statement that payment does not immediately run the
   audit.
6. **Limitations and consent** — sampled-at-a-point-in-time limitation, no
   outcome guarantee, public-information boundary, Terms and Privacy links.

Interface language is common Indonesian. Prefer **“Periksa informasi bisnis”**
over “Isi informasi bisnis”; prefer **“Periksa pertanyaan audit”** over
“Review pertanyaan audit.” Do not use “visibilitas” as a primary customer
action or explanation.

---

## Requirements

### Entry contract

- **R-01:** The landing accepts exactly one supported public source
  (official website, Google Maps listing or shared Maps link, or public
  Instagram business profile). TikTok and any additional source are rejected at
  this touchpoint with an explanation, not silently ignored.
- **R-02:** The customer must enter one valid delivery email before payment; the
  page states the email is used for the payment/order record, private report
  access, and essential order information. Marketing consent is not bundled
  into the purchase.
- **R-03:** A visitor may replace an incorrect business link; the preview and
  order summary update to the new source and never merge two businesses.

### No-model-call preview

- **R-04:** The identity preview is built only from inexpensive public metadata
  (website metadata, public business description, or public profile bio). It
  must not call a language model, generate a personalized brief, generate
  questions, or run observations before verified payment.
- **R-05:** A description is shown only when Nuave can attribute it to the
  submitted public source; Nuave never invents one to fill an empty card.
- **R-06:** Fallbacks are clean and non-blocking: no logo → neutral business
  initial or generic mark; no description → omit it; no confident name → require
  the visitor to enter it manually before the order summary. Nuave never guesses
  between branches or similarly named businesses.
- **R-07:** The preview always identifies its public source and never presents
  itself as an audit result. It must not show a score, competitors, findings,
  recommendations, or any AI-visibility claim.

### Quote and expiry

- **R-08:** The customer total is **Rp99.000** for one audit; no tax or fee is
  added at checkout.
- **R-09:** The unpaid quote is valid for **30 days**. After expiry the customer
  must refresh the business preview, price, and accepted policy versions before
  paying. This rule never expires or changes an already-paid order. The page
  states the purchase is one audit and not a subscription.

### CTA split

- **R-10:** A prominent upper action scrolls to the priced order summary and does
  not charge. Label: **“Lanjut ke pembayaran.”**
- **R-11:** The final action starts payment and includes the full amount. Label:
  **“Bayar Rp99.000.”**
- **R-12:** The page must not present “Bayar” as a payment trigger before the
  price, recipient email, limitations, and terms are visible.

### Consent

- **R-13:** Payment requires acceptance of the applicable Terms and Privacy
  notice, with unchecked affirmative acceptance and version recording. Optional
  marketing consent, if ever offered, is separate, specific, unchecked by
  default, and revocable — and is **not** bundled into this touchpoint in the
  first paid flow.
- **R-14:** The accepted Terms version and Privacy version are captured as
  server-owned values and carried in the handoff (see below).

### Caching and abuse controls

- **R-15:** The preview is cached by **normalized public source** and does not
  rerun on refresh. A repeated submission restores the current unexpired preview
  instead of creating new work; an expired quote requires refresh before payment.
- **R-16:** Before verified payment, Nuave performs only the smallest work needed
  for the identity preview, protected by: an allowlist of supported URL types
  and safe URL handling; request and response-size limits; short timeouts;
  per-visitor or per-network rate limits; caching by normalized source; and
  graceful fallback instead of repeated automated retries.

---

## Handoff: `checkout_intent` (01 → 02)

On successful acceptance, Module 01 produces one server-owned `checkout_intent`
for Module 02. Minimum fields (conceptual product records, not a generalized
schema — an implementation spec may combine storage where it keeps the path
smaller without weakening ownership):

| Field | Meaning |
|---|---|
| `preview/reference id` | Opaque id for this preview/entry; used to restore the cached preview and as the anchor for the eventual order. |
| `normalized public source` | Canonical, deterministic form of the submitted source (used for cache keying and idempotent restore). |
| `previewed identity` | `{ logo/profile image or neutral fallback, name or null, short description or null, attributed source }`. |
| `recipient version` | Versioned delivery-email record. A later recipient change creates a new recipient version and never mutates this intent. |
| `Rp99.000 quote reference` | Reference tying this intent to the Rp99.000 one-audit quote the customer was shown. |
| `quote_expires_at` | The 30-day expiry timestamp of the unpaid quote. |
| `policy versions` | The accepted Terms version and Privacy version (and effective dates) recorded at acceptance. |

Nothing in `checkout_intent` contains a score, finding, competitor, or
recommendation. It is a quote-and-identity record, not an audit result.

---

## Failure and recovery

| Failure | Preserve | Customer sees | Retry / rule | Never |
|---|---|---|---|---|
| Source unsupported (e.g. TikTok) | nothing | Explanation + ask for website/Maps/Instagram | Re-enter a supported source | Do not spend an AI call to rescue it |
| Metadata inaccessible / empty | normalized source | Partial preview with neutral fallbacks | Continue is allowed | Do not invent a name or description |
| Identity ambiguous (branches / similar names) | normalized source | Ask for name and, if needed, city/service area | Manual entry → preview | Do not silently pick a branch |
| Quote expired (30 days) | nothing | Refresh preview, price, and policy versions required | Re-run preview before payment | Do not let an expired quote pay without refresh |
| Payment cancelled or failed (handled at 02 boundary) | source, preview, email | "No audit has started"; retry available | Retry with same intent | Do not mark the audit started |
| Provider metadata fetch fails transiently | cached preview (if any) | Graceful fallback | Cache hit; no repeated automated retries | Do not retry in a loop or bypass rate limits |

Cross-module invariant (from `JOURNEY_CONTRACT.md`): browser redirects,
callbacks, and displayed success messages never prove payment. A module may
mutate only the state it owns.

---

## Evidence, data, privacy, and cost

- No customer records, payment details, or sensitive business information are
  collected at this touchpoint beyond the public business source and the
  delivery email.
- The delivery email, payment data, access secrets, and unrelated customer text
  must never enter observation or report-model prompts (future modules).
- Public business information is the only source material; buyer-supplied facts
  are minimized and labeled.
- Cost boundary: only metadata resolution (website/Maps/Instagram) is permitted;
  no language-model or audit-model spend occurs before verified payment.
- Retention defaults for abandoned intake and order inputs are governed by
  `docs/content/website/PRIVACY.md`; this touchpoint does not invent a value.

---

## Acceptance criteria

Mirrors the 12 criteria in `docs/journey/01-order-preview.md`:

- **AC-01:** Given a supported business link, when the visitor submits it, then a
  best-effort identity preview renders without any language-model or audit call.
- **AC-02:** Given a preview, when displayed, then it identifies its public
  source and never presents itself as an audit result.
- **AC-03:** Given an incorrect link, when the visitor replaces it, then the
  preview and summary update to the new source.
- **AC-04:** Given missing logo or description data, when previewed, then a clean
  fallback renders — not invented content and not a blocked checkout.
- **AC-05:** Given an ambiguous business or branch, when resolved, then customer
  clarification is required; no branch is selected silently.
- **AC-06:** Given the preview page, when shown, then it explains the ten-question
  scope, deliverables, process, limitation, and one-audit nature.
- **AC-07:** Given the page, when the upper CTA is used, then it reveals the full
  order summary; only the **Bayar Rp99.000** CTA starts payment.
- **AC-08:** Given payment, when attempted, then it requires a valid recipient
  email and acceptance of the applicable Terms and Privacy notice.
- **AC-09:** Given any pre-payment action, then no audit-model, personalized
  brief, question-generation, or observation call occurs before verified payment.
- **AC-10:** Given successful payment (02 boundary), when it completes, then the
  journey moves to business-information review without running the audit.
- **AC-11:** Given a cancelled or failed payment, when it occurs, then the
  preview and email are preserved and the audit is never marked started.
- **AC-12:** Given mobile viewport, when the page renders, then price, quote
  expiry, correction path, and limitations are not hidden.

---

## Open decisions

Flagged explicitly — **not** resolved here, and values must not be invented:

1. **Named AI surface to disclose** — which AI service the ten observations run
   against (FAQ/terms placeholder `[LAYANAN AI YANG DIUJI]`). Required before
   the offer can state its method accurately. Owner: founder.
2. **Realistic delivery-time promise** — the report delivery window and clock
   start (`[WAKTU PENGIRIMAN]`). Owner: founder.
3. **Report access and retention duration** — how long the private report link
   stays available (`[MASA AKSES LAPORAN]`) and the retention period. Owner:
   founder (also gated by the Module 07 access decision).
4. **Terminal remedy** — the remedy when Nuave cannot produce a usable report,
   and the terminal remedy when delayed delivery plus founder support still
   cannot complete the audit (`[BATAS PENUNDAAN]` / `[PENYELESAIAN TERAKHIR]`).
   Owner: founder.

Additional related founder decisions that must be closed before **live**
checkout (already recorded in the source docs, listed here for completeness):

- Final production **Midtrans** merchant configuration and instructions.
- **Support response expectation** and monitored hours.
- **Recipient-change verification** rule (how a post-payment email change is
  authorized).
- Whether wrong content in an already-delivered report needs a separate
  correction-submission and corrected-report notification workflow.
- **Reconcile the entry CTA wording**: the Module 01 plan accepts “Cek bisnis
  saya di AI,” while `docs/content/landing-copy.md` and the website plan still say
  “Audit bisnis saya.” One canonical label should be chosen.

---

## Verification record

- Verification artifact: (pending — draft not implemented)
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
