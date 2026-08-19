# 01 — Order Preview

> Status: Working product plan
> Source copy: [`../content/order-preview-copy.md`](../content/order-preview-copy.md)
> Updated: 2026-08-17

## Objective

Help a visitor recognize that Nuave has found the correct business, understand
what one paid audit includes, and decide whether to pay—without running a
personalized AI audit or incurring avoidable model cost before payment.

The intended customer reaction is:

> “This is my business, I understand what Nuave will check, and I know what I
> will receive for the price.”

## Position in the journey

```text
Landing page
  → customer submits one website, Google Maps listing, or Instagram link
  → Order Preview
  → payment
  → business information review
  → question review
  → audit run
  → report
```

The accepted landing-page CTA is **“Cek bisnis saya di AI.”**

## Entry condition

The page receives one customer-submitted public business link:

- an official website;
- a Google Maps business listing, including a shared Maps link; or
- a public Instagram business profile.

TikTok and additional business sources are not supported at this touchpoint.
They may be collected after payment if the audit needs them.

## Free business preview

The top of the page shows a small identity preview:

- business logo or public profile image, when available;
- business name;
- a short description found in public metadata, when available; and
- the submitted or normalized public source.

This preview exists to create recognition and confidence. It is not an audit
result and must not show an AI visibility result, competitors, findings,
recommendations, or a score.

The preview uses inexpensive public metadata where possible, such as website
metadata, a public business description, or a public profile bio. It does not
use a language model or run audit questions before verified payment. A
description is shown only when Nuave can attribute it to the submitted public
source; Nuave does not invent one to fill an empty card.

Source expectations are deliberately best-effort:

- **Website:** usually provides the strongest logo, name, and description
  metadata.
- **Google Maps:** accept the listing link, resolve the exact business, and ask
  the customer to confirm the resulting name and location after payment.
- **Instagram:** use public profile information when it can be read reliably;
  fall back gracefully when it cannot.

If Nuave cannot obtain a logo, it shows a neutral business initial or generic
business mark. If it cannot obtain a description, it omits the description. If
it cannot identify a confident business name, it asks the visitor to enter the
name manually before showing the order summary. It never guesses between
branches or similarly named businesses.

## Page structure and content

The customer-facing copy follows [`order-preview-copy.md`](../content/order-preview-copy.md), in this order:

1. **Business identity** — “Kami menemukan bisnis Anda,” followed by the logo,
   name, short description, source, and “Bukan bisnis Anda?” correction path.
2. **What Nuave checks** — ten customer-like questions tested with AI, with a
   clear statement that the customer can check the business facts and review
   the complete question pack before the audit runs.
3. **What the customer receives** — answers, analysis, other businesses
   mentioned, improvement recommendations, and a downloadable PDF report.
4. **How it works** — payment, business-information review, question review,
   and report delivery.
5. **Order summary** — audited business, one-audit price, recipient email,
   payment action, and the statement that payment does not immediately run the
   audit.
6. **Limitations and consent** — sampled-at-a-point-in-time limitation, no
   outcome guarantee, public-information boundary, Terms, and Privacy links.

Use common Indonesian in the interface. Prefer **“Periksa informasi bisnis”**
over “Isi informasi bisnis,” because Nuave has already found preliminary
information. Prefer **“Periksa pertanyaan audit”** over the mixed-language
“Review pertanyaan audit.” “Visibilitas” is not used as a primary customer
action or explanation.

## Calls to action

There may be a visually prominent action near the business preview and the
actual payment action in the order summary, but they have different behavior:

- The upper action scrolls to the priced order summary. It does not charge the
  customer. Label it **“Lanjut ke pembayaran”**, not simply “Bayar.”
- The final action starts the payment flow. Its label includes the full amount:
  **“Bayar Rp99.000.”**

This prevents a visitor from appearing to start payment before seeing the
price, recipient email, limitations, and applicable terms.

## Price and email

The customer total is **Rp99.000** for one audit. Nuave adds no tax or fee at
checkout. The unpaid Order Preview keeps that price for 30 days. After expiry,
the customer must refresh the business preview, price, and accepted policy
versions before paying. This rule does not expire an already-paid order. The
page states that the purchase is one audit and not a subscription.

The customer enters one delivery email before payment. The page explains that
the email is used for:

- the payment and order record;
- private report access; and
- essential information about that order.

Marketing consent is not bundled into the purchase.

## After successful payment

Payment does not consume or immediately run the audit. It unlocks the paid
preparation flow:

1. Nuave prepares the business facts from public sources.
2. The customer confirms or corrects those facts.
3. Nuave prepares the ten-question pack.
4. The customer reviews and approves the questions.
5. Only the explicit audit-run action spends the purchased audit and starts the
   observations.

The order remains tied to the submitted business and recipient email. Tell the
customer to verify the exact business and branch before payment and again before
starting the audit. A same-business identity correction before start stays in
the order. After start, a genuine wrong-business mistake goes to founder
support for one recorded replacement audit chance; a replacement order is the
last resort.

## Cost and abuse boundaries

Before verified payment, the product may perform only the smallest work needed
for the identity preview. It must not call the audit model, generate the
personalized brief, generate questions, or run observations.

Protect the preview with:

- an allowlist of supported URL types and safe URL handling;
- request and response-size limits;
- short timeouts;
- per-visitor or per-network rate limits;
- caching by normalized public source; and
- graceful fallback instead of repeated automated retries.

These controls should remain simple and proportionate. The goal is to prevent
easy automated abuse and uncontrolled provider cost, not to build an account
or fraud platform before demand is proven.

## Customer-visible states

### Loading

State that Nuave is looking for the business. Do not say the audit is running.

### Preview found

Show the available identity information and the source. Allow the visitor to
replace the submitted link.

### Partial preview

Show the information found, use a neutral image fallback if needed, and omit
unsupported description text. The visitor may still continue.

### Business not confidently identified

Ask for the business name and, when necessary, city or service area. Do not
select a branch silently.

### Unsupported or inaccessible link

Explain that Nuave could not read the link and ask for an official website,
Google Maps business listing, or public Instagram profile. Do not spend an AI
call trying to rescue it.

### Payment cancelled or failed

Keep the submitted source, preview, and email available for a retry. State
clearly that no audit has started.

### Payment successful

Confirm the payment and move to business-information review. Do not start the
audit automatically.

## Trust requirements

- Always distinguish the free identity preview from the paid AI audit.
- Identify the public source behind previewed information.
- Do not manufacture a description when the source has none.
- Do not claim that the business has appeared in AI before observations run.
- Do not imply that ten sampled questions represent every possible AI answer.
- Do not promise rankings, traffic, customers, sales, or guaranteed change.
- Keep the business result private and tied to the named recipient.
- Collect no customer records or sensitive business information.

## Acceptance criteria

The touchpoint is ready for implementation review when:

1. A visitor can submit a supported business link and see a best-effort
   identity preview without a language-model or audit call.
2. The preview identifies its public source and never presents itself as an
   audit result.
3. A visitor can replace an incorrect business link.
4. Missing logo or description data produces a clean fallback, not invented
   content or a blocked checkout.
5. An ambiguous business or branch requires customer clarification.
6. The page explains the ten-question scope, deliverables, process, limitation,
   and one-audit nature of the purchase.
7. The upper CTA reveals the full order summary; only the **Bayar Rp99.000** CTA
   starts payment.
8. Payment requires a valid recipient email and acceptance of the applicable
   Terms and Privacy notice.
9. No audit-model, personalized brief, question-generation, or observation call
   occurs before verified payment.
10. Successful payment moves to business-information review without running the
    audit.
11. Cancelled or failed payment does not lose the preview and never marks the
    audit as started.
12. The page works on mobile without hiding the price, quote expiry, correction path, or
    limitations.

## Decisions required before live checkout

The page can be prototyped before these are settled, but real payment must not
be enabled until the founder approves:

- the named AI surface used for the ten observations;
- a realistic completion-time promise;
- report access and retention duration;
- the remedy when Nuave cannot produce a usable report;
- the terminal remedy when delayed delivery and founder support cannot complete
  the audit; and
- the final production Midtrans merchant configuration and instructions.

## Out of scope

- customer accounts, passwords, OTP, or a report dashboard;
- subscriptions, packages, credits, or multiple pricing tiers;
- a free personalized AI audit;
- competitor findings or scores before payment;
- TikTok extraction;
- multi-business orders; and
- the design of the later business-information, question-review, processing, or
  report pages.
