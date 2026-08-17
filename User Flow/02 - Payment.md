# 02 — Payment

> Status: Working product plan
> Payment provider: Midtrans
> Depends on: [`01 - Order Preview.md`](./01%20-%20Order%20Preview.md)
> Updated: 2026-08-17

## Objective

Let a customer pay once for one Nuave audit using a familiar Indonesian payment
method, clearly understand whether payment has succeeded, and continue safely
even when the payment is delayed, interrupted, duplicated, or completed on a
different device.

The experience should feel simple on the customer side while preserving one
strict rule behind the scenes:

> A browser redirect or success message never unlocks an audit. Nuave unlocks
> the paid workflow only after the payment is verified with Midtrans.

## Position in the journey

```text
Order Preview
  → Midtrans payment
  → Nuave payment status
  → verified payment
  → business information review
  → question review
  → explicit audit run
```

Payment unlocks preparation of the personalized audit. It does not
automatically generate the question pack, spend the audit, or run any AI
observation.

## Settled production direction

- Use **Midtrans Snap hosted checkout** for the first production implementation.
- Offer **QRIS, bank transfer, DANA, and GoPay**.
- Let Midtrans present the method selector and method-specific instructions.
- Do not build a custom payment form or collect bank, wallet, PIN, OTP, or card
  credentials in Nuave.
- Use Midtrans's method-specific expiry defaults initially and display the
  actual expiry returned for each transaction.
- Enable Midtrans customer payment emails as the low-cost instruction and
  status-email mechanism.
- Build one Nuave payment-status destination that handles checking, pending,
  confirmed, expired, cancelled, and failed states.
- Unlock the paid workflow only after server-side payment verification.
- Keep one Nuave order separate from its payment attempts. An expired or failed
  attempt can be replaced without creating a second audit purchase.

The server-owned customer total is **Rp99.000** for one audit. Nuave adds no tax
or fee at checkout. The unpaid quote is valid for 30 days; an expired quote must
return to Order Preview for refreshed price and policy versions before Midtrans
checkout is created.

## Why hosted Snap is the selected direction

Hosted Snap is the smallest credible payment experience for the current stage.
It gives the customer a recognizable payment interface, handles different bank
and wallet instructions, and avoids Nuave becoming responsible for a custom
payment form.

Leaving Nuave for a Midtrans-hosted page is acceptable when:

- the merchant is clearly identified as Nuave;
- the item names the audit and business;
- the amount matches the order preview exactly;
- the customer can return to a Nuave payment-status page; and
- the Nuave page explains what happens next.

A custom embedded or pop-up checkout can be reconsidered only if observed
customer behavior shows that the hosted redirect causes material abandonment.

## Payment methods

### QRIS

QRIS gives broad coverage across supporting mobile-banking and wallet apps.
Midtrans should generate a dynamic, order-specific QR; Nuave must not use a
static merchant QR because a static payment is harder to reconcile safely with
one specific order.

On a wider screen, the customer can scan the QR using another device. On a
phone, the Midtrans experience should provide the available mobile handoff. The
page always shows the actual expiry and does not assume the customer returned
after paying.

### DANA and GoPay

Keep both wallet options for customers who prefer a direct mobile-app flow.
Midtrans may send the customer into an app or web view and then attempt to
return them. Nuave treats that return only as a reason to check payment status,
not as proof of payment.

### Bank transfer

Use the virtual-account or bill-payment options activated for the Midtrans
merchant. Midtrans shows the number, bank-specific instructions, amount, and
expiry. The payment can remain pending after the customer leaves Nuave, so the
order must be recoverable from the emailed payment information or private order
link.

Nuave does not hardcode a bank list in its own interface. It displays only the
methods that are actually enabled and available through Midtrans.

## Normal customer flow

1. On Order Preview, the customer confirms the business, price, email, Terms,
   and Privacy notice.
2. The customer activates **“Bayar Rp99.000.”**
3. Nuave creates one server-side order and requests a Midtrans Snap transaction
   for the exact order and amount.
4. Nuave redirects the customer to the hosted Snap checkout.
5. The customer chooses QRIS, bank transfer, DANA, or GoPay and follows
   Midtrans's instructions.
6. Midtrans sends Nuave a payment-status notification. Nuave verifies it and
   stores the latest status without processing the same event twice.
7. The customer returns—or later opens the private order link—and sees the
   current status from Nuave's server.
8. Only a verified successful payment enables **“Periksa informasi bisnis.”**

## Order and payment-attempt model

One Nuave order represents one intended audit for one business and recipient.
Each time Midtrans creates a new payable instruction, QR, virtual account, or
wallet session, that is a payment attempt under the same order.

Nuave needs to retain only the payment information required to reconcile and
support the purchase:

- Nuave order reference;
- private order-access reference;
- business identity and submitted source;
- delivery email;
- exact total and currency;
- accepted Terms and Privacy versions;
- Midtrans order and transaction references;
- payment method, status, and actual expiry;
- status and settlement timestamps; and
- whether the single paid entitlement has already been granted, consumed,
  refunded, or revoked.

Nuave does not store bank-account credentials, wallet credentials, PINs, OTPs,
or raw payment secrets. The amount, currency, business scope, and entitlement
are determined on the server; browser-submitted replacements are ignored.

## Payment-status destination

This is one stable Nuave page, not a one-time success screen. It works when the
customer returns from Midtrans, refreshes the page, opens it on another device
from an authorized link, or returns after a delayed bank transfer.

Show the business, order reference, amount, masked recipient email, current
status, payment expiry when relevant, and the correct next action.

### Checking

Use while Nuave is retrieving or confirming the latest server-side status.

> **Memeriksa pembayaran Anda…**
>
> Jangan tutup halaman ini sampai status pembayaran tampil.

If the check takes longer than expected, switch to a recoverable state with a
manual **“Cek lagi”** action. Do not leave an endless spinner.

### Waiting for payment

Use when Midtrans has created the payment attempt but has not confirmed funds.

> **Pembayaran belum selesai**
>
> Selesaikan pembayaran sebelum waktu yang tertera berakhir. Audit Anda belum
> dimulai.

Possible actions:

- **Lihat petunjuk pembayaran**
- **Saya sudah membayar — cek lagi**
- **Pilih cara pembayaran lain**

The third action first cancels or expires the replaceable pending attempt when
appropriate, or clearly warns the customer not to pay both instructions. It
then creates a new attempt under the same Nuave order.

### Payment confirmed

Use only after the server has verified a successful Midtrans status, matching
order, and matching amount.

> **Pembayaran berhasil**
>
> Pesanan audit untuk **[Nama Bisnis]** sudah aktif. Selanjutnya, periksa
> informasi bisnis yang akan digunakan untuk menyiapkan pertanyaan audit.

Primary action:

> **Periksa informasi bisnis**

The page may show the selected payment method and payment time, but it must not
show unnecessary provider metadata.

### Payment expired

> **Waktu pembayaran sudah berakhir**
>
> Pembayaran ini tidak dapat digunakan lagi. Audit belum dimulai dan pesanan
> Anda belum aktif.

Primary action:

> **Buat pembayaran baru**

A new attempt keeps the same business, recipient, and Nuave order. The page
must not say that the customer was not charged unless the latest server status
actually supports that statement.

### Payment cancelled

> **Pembayaran dibatalkan**
>
> Audit belum dimulai. Anda dapat kembali ke pesanan atau memilih cara
> pembayaran lain.

Actions:

- **Coba lagi**
- **Kembali ke ringkasan pesanan**

### Payment failed or denied

> **Pembayaran belum berhasil**
>
> Metode pembayaran menolak atau tidak dapat menyelesaikan transaksi ini.
> Audit belum dimulai dan Anda dapat mencoba cara pembayaran lain.

Do not expose raw fraud, bank, or provider messages that are confusing or could
reveal security behavior. Preserve a provider reference for support.

### Status temporarily unavailable

> **Status pembayaran belum dapat diperiksa**
>
> Kami belum dapat memastikan status pembayaran Anda. Jangan melakukan
> pembayaran kedua. Coba periksa kembali beberapa saat lagi.

Actions:

- **Cek lagi**
- **Hubungi bantuan**

Do not unlock the order and do not create another attempt while the status of a
possibly paid attempt is unknown.

## Negative cases and edge cases

### Before Midtrans opens

| Case | Nuave response |
|---|---|
| Invalid or mistyped email | Stop before creating the order; ask the customer to correct and confirm the delivery email. |
| Terms or Privacy not accepted | Keep the payment action disabled and explain what is required. Optional marketing consent remains separate. |
| Customer double-clicks the payment action | Reuse the same in-progress creation request and open only one payment attempt. Do not create two order entitlements. |
| Midtrans transaction creation fails | Keep the order preview and email; show a retry action. Do not mark the order pending or paid. |
| Network fails after Nuave requests a transaction | Reconcile using the server-side request/order reference before retrying, so an uncertain response does not create duplicate attempts. |
| Price or business data in the browser was altered | Ignore it; use the server-owned order amount and scope. If they do not match the visible order, stop and require a refreshed summary. |
| Midtrans is unavailable | State that payment is temporarily unavailable, preserve the order, and provide a later retry. Do not ask for manual transfer outside Midtrans. |

### During payment

| Case | Nuave response |
|---|---|
| Customer closes Snap before choosing a method | Preserve the unpaid order and allow payment to be reopened. No payment-attempt instruction is assumed to exist unless Midtrans created one. |
| Customer chooses a method but does not pay | Show pending status, exact expiry, and Midtrans instructions. Send or rely on the enabled Midtrans customer email. |
| Customer changes their mind about the method | Replace the pending attempt carefully under the same Nuave order. Warn against paying an older instruction that remains valid. |
| QR or wallet session expires while visible | Stop presenting it as payable, refresh server status, and offer a new attempt. |
| Wallet app does not return to Nuave | The order remains pending or paid server-side; the customer can return through the order link or payment email. |
| Customer pays bank transfer from another person's account | Accept based on the reconciled Midtrans order and amount; report access still belongs to the named delivery email. Do not collect the payer's bank details. |
| Customer transfers the wrong amount or uses an unsupported transfer route | Keep the status returned by Midtrans and route unresolved cases to support. Never manually mark the order paid from a screenshot. |

### After an apparent payment

| Case | Nuave response |
|---|---|
| Customer returns before the webhook arrives | Show “Memeriksa pembayaran,” then check the current status directly with Midtrans. |
| Browser callback says success but server status is pending | Show pending. Do not unlock the paid workflow. |
| Webhook is duplicated | Process idempotently; one verified payment grants one entitlement once. |
| Webhooks arrive out of order | Preserve the valid forward status or retrieve the latest status from Midtrans. Never downgrade a settled order to pending. |
| Webhook is delayed or missed | Reconcile using Midtrans's status API when the customer opens the page or requests “Cek lagi.” |
| Signature, order reference, amount, or merchant does not match | Reject the event, keep the order locked, record the anomaly, and check directly with Midtrans. |
| Customer refreshes or presses Back | Render the server-owned latest state. Never repeat the charge or lose a confirmed entitlement. |
| Customer opens the status page on another device | Require the private order link or equivalent access proof; do not expose status through a guessable order number alone. |
| Customer pays after an expiry was displayed | Reconcile the actual Midtrans status. If Midtrans accepted and settled it, treat it as paid; if status is uncertain, stop and route to support. |
| Payment is confirmed but the customer never returns | Keep the paid order available and send the available confirmation/order-access email. Do not start the audit automatically. |

### Duplicate, reversal, and refund cases

| Case | Nuave response |
|---|---|
| Two successful attempts exist for the same Nuave order | Grant one audit entitlement and flag the extra payment for a full duplicate-payment refund after verification. |
| Customer pays the same valid instruction twice | Trust Midtrans reconciliation, flag any confirmed excess payment, and do not create a second audit automatically. |
| Payment settles after the customer created a replacement attempt | Lock further payment creation as soon as any attempt settles. If another attempt also settles, handle it as a duplicate. |
| A rare provider reversal changes a settled payment | Stop unused entitlement immediately. If the audit already started or finished, flag for founder/support review rather than silently deleting access or claiming payment remains valid. |
| Payment is refunded before audit starts | Revoke the unused entitlement and show the order as refunded. |
| Refund occurs after processing started | Follow the approved remedy decision; preserve evidence and an audit trail. Do not improvise customer-facing promises. |
| Chargeback or disputed payment | Restrict unused fulfillment and route to founder/support review. Do not put sensitive dispute detail in the customer UI. |

### Order identity and recipient problems

| Case | Nuave response |
|---|---|
| Customer notices the wrong business before payment | Return to Order Preview and replace the business; no charge occurs. |
| Customer corrects the same intended business after payment but before audit starts | Create a new business-fact version, regenerate the complete question pack, and require review again under the same order. |
| Customer selected a different business and the audit has started | Preserve the original run and route to founder support. The founder may grant one linked replacement audit chance from the restricted admin support view; a replacement order is the last resort. |
| Customer entered the wrong email before payment | Let them correct it and regenerate the payment context if needed. |
| Customer reports a wrong email after payment | Preserve the request but do not redirect report access based on an order number or this payment module. Wait for the verification policy approved in Module 07. |
| Payment email and later report recipient differ | Block redirection until Module 07 authorizes and records a new recipient version; Module 02 does not choose the proof method. |

## Notification and verification rules

Midtrans's browser return and Snap callbacks are navigation signals only.
Nuave's backend verifies payment through an authentic Midtrans notification or
a direct status lookup.

For every provider event:

1. Verify the notification signature or retrieve the status directly from
   Midtrans.
2. Match the merchant, Midtrans reference, Nuave order, amount, and currency.
3. Accept success only for the appropriate successful transaction status and
   accepted fraud status when present.
4. Apply status changes idempotently so retries cannot duplicate fulfillment.
5. Reject backward or impossible transitions and reconcile uncertain state
   directly with Midtrans.
6. Respond quickly to legitimate notifications; trigger Business Facts
   preparation only through a separate, durable order state.

No staff member or automated path may mark an order paid from a customer
screenshot, email claim, or browser callback alone.

## Email behavior

For the initial version:

- pass the confirmed customer email to Midtrans;
- enable Midtrans customer payment emails;
- let Midtrans send method-specific instructions and payment-status notices;
- keep the Nuave status page as the authoritative customer view; and
- avoid building a second Nuave email that copies expiring QR, wallet, or bank
  instructions.

The Midtrans email template is functional but not brand-controlled. Nuave may
later add a branded payment-confirmation and order-access email when durable
delivery is implemented. That email should link back to Nuave rather than copy
payment credentials or unnecessary provider metadata.

## Cancellation and remedies

The product direction currently includes:

- a full refund for duplicate payment;
- cancellation and full refund before the audit starts;
- delayed delivery, targeted retry of only failed work, and founder support
  intervention when 10/10 cannot yet be reached;
- a discretionary founder-granted replacement audit chance for a genuine
  wrong-business mistake after start, with a replacement order last;
- free correction for a Nuave scope, factual, or formatting error; and
- no refund merely because the observed AI result is unfavorable.

The maximum delay and terminal remedy remain open. The founder must still
confirm cancellation and refund operations for each Midtrans method before
Nuave accepts real payment. The UI must not promise an automatic refund or a
full-audit rerun unless the actual process and settled policy support it.

The product also needs one unambiguous definition of **audit started**. The
working definition in this flow is: the customer has approved the final
question pack and Nuave has accepted the explicit **“Jalankan audit”** action
for processing. Payment and fact/question preparation alone do not mean the
audit has started.

## Privacy and trust requirements

- State that Midtrans processes payment and that Nuave does not receive bank,
  wallet, PIN, password, or OTP credentials.
- Record the Terms and Privacy versions accepted for the order.
- Mask the recipient email on any status page reachable through the selected
  private-access mechanism.
- Do not include the customer email, payment metadata, or payment references in
  AI prompts or the audit report.
- Do not bundle marketing permission with payment.
- Do not expose raw provider fraud decisions or unnecessary transaction
  metadata.
- Keep payment records only as long as needed for fulfillment, support,
  bookkeeping, fraud prevention, and applicable obligations.

## Acceptance criteria

The payment touchpoint is ready for implementation review when:

1. The priced action creates one server-owned Nuave order and one initial
   Midtrans attempt despite repeated clicks or retries.
2. Hosted Snap offers only the enabled QRIS, bank transfer, DANA, and GoPay
   methods and displays the exact order amount.
3. Nuave never collects payment credentials or accepts the price from the
   browser as authoritative.
4. Closing, refreshing, navigating back, switching apps, or returning on
   another authorized device does not lose the recoverable order state.
5. The status destination truthfully renders checking, pending, confirmed,
   expired, cancelled, failed, and temporarily unavailable states.
6. Pending methods show their actual expiry and a route back to Midtrans's
   instructions.
7. A browser callback cannot unlock the paid workflow without server-side
   verification.
8. Verified provider notifications are authenticated, matched to order and
   amount, and processed idempotently.
9. Delayed, duplicated, missed, and out-of-order notifications do not duplicate
   or incorrectly revoke the audit entitlement.
10. A successful payment grants exactly one unused audit entitlement and does
    not start the audit.
11. A failed, cancelled, denied, expired, uncertain, or mismatched payment never
    grants an entitlement.
12. A replacement payment attempt remains tied to the same Nuave order and
    cannot create a second audit automatically.
13. Two successful attempts are flagged as duplicate payment while granting
    only one audit.
14. Payment confirmation leads to **“Periksa informasi bisnis.”**
15. The customer can recover from a payment-provider outage without being told
    to pay manually outside Midtrans.
16. Customer payment emails are enabled in Midtrans and use the confirmed
    checkout email.
17. The page remains usable and understandable on mobile, including after an
    e-wallet app handoff.
18. A quote older than 30 days cannot create a Midtrans attempt until Order
    Preview refreshes the business identity, Rp99.000 total, and policy versions.

## Decisions required before production payment

Real payment remains blocked until the founder approves and operations can
honor:

- the public Nuave merchant/operator identity shown by Midtrans;
- the exact bank-transfer methods activated in the Midtrans account;
- the private order-link and cross-device access method;
- the support response expectation;
- the maximum delayed-delivery period and terminal remedy;
- cancellation, duplicate-payment, and refund operations;
- the procedure and expected time for refunds by payment method;
- payment-record retention; and
- the production Midtrans webhook, Finish URL, credentials, and sandbox-to-live
  verification.

## Required product-copy alignment

The founder has chosen payment before personalized preparation to prevent
unpaid cost and abuse. The Terms draft and canonical journey now reflect that
sequence. Before live checkout, every public page and accepted contract must be
verified to say consistently:

- the customer sees a source-derived business identity preview before payment;
- verified payment unlocks personalized business-fact and question preparation;
- the customer still confirms the facts and approves the complete questions
  before the audit starts; and
- cancellation and refund rights follow the final approved audit-start
  definition.

This plan does not itself change or approve the legal or commercial terms.

## Out of scope

- credit and debit cards;
- cash or over-the-counter payments;
- installment payments;
- subscriptions, saved payment methods, or recurring billing;
- manual bank transfers outside Midtrans;
- a Nuave wallet, balance, or credit system;
- customer accounts or a payment-history dashboard;
- custom payment-instruction emails;
- automatic audit execution immediately after payment; and
- implementation of the later business-information or question-review pages.

## Candidate provider references

- [Midtrans Snap](https://docs.midtrans.com/docs/snap)
- [Transaction status cycle](https://docs.midtrans.com/docs/transaction-status-cycle)
- [HTTP notifications and verification](https://docs.midtrans.com/docs/https-notification-webhooks)
- [Bank-transfer integration](https://docs.midtrans.com/docs/coreapi-core-api-bank-transfer-integration)
- [GoPay and QRIS](https://docs.midtrans.com/reference/gopay)
- [DANA](https://docs.midtrans.com/reference/dana)
- [Midtrans customer email notifications](https://docs.midtrans.com/docs/midtrans-notification-features)
