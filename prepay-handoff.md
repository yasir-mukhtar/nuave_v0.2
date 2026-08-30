# Pre-payment flow handoff — read alongside intake-handoff.md + intake-prototype.html

For the next agent continuing this work. `intake-prototype.html` is now a
single-file, end-to-end clickable simulation:

**landing → URL entry → scan → brand reveal + audit preview → payment
(QRIS / VA / wallet) → processing → success → existing business intake.**

Everything in this file was added *in front of* the intake described in
`intake-handoff.md`. The intake itself was not redesigned; its flow was only
re-anchored (see "Transition adjustments" below).

> Governed by [`docs/V1_PRODUCT_CONTRACT.md`](./docs/V1_PRODUCT_CONTRACT.md).
> Price is the settled Rp99.000 total (docs/NOW.md, TERMS) — not a placeholder.

## Product distinctions that must survive future edits

1. **Before payment**: Nuave has *identified* the brand and shows the
   *structure* of the audit. No findings exist yet — the preview never shows a
   readable score, competitor name with a result, or any audit conclusion.
   Unknowns are blurred/grey placeholders, never fabricated values.
2. **After payment**: the audit is *unlocked*, not run.
3. **During intake**: Nuave confirms/corrects its working understanding
   before the audit is generated. The intake is framed as fulfilling the
   purchase, not as onboarding.

## Screen map (all new screens are `p-*`, intake screens stay `s-*`)

| Screen | Purpose | Notes |
|---|---|---|
| `p-landing` | URL entry (situs / Instagram / Google Maps) | Enter key submits; "Mulai tanpa sumber" → `p-manual` |
| `p-manual` | Manual name+city entry (no readable source) | Fills `#mName`/`#mCity`, reused later by `brandName()` |
| `p-scan` | 3-step analysis transition, ~2.2s | Deliberately brief, no AI theatrics |
| `p-reveal` | Brand readback + blurred report preview + payment section | See anatomy below |
| `p-pay` | Method selection (QRIS, GoPay, DANA, VA with 9-bank grid) | Midtrans mental model, Nuave visual language |
| `p-pay-qris` | Fake deterministic QR + "Saya sudah bayar" | QR drawn by `buildQr()` |
| `p-pay-va` | Per-bank VA number + copy button | Prefixes in `BANKS` array |
| `p-pay-wallet` | GoPay/DANA handoff card | One-tap simulated confirm |
| `p-processing` | Dots, 1.8s auto-advance | |
| `p-success` | "Pembayaran berhasil" → CTA into intake | `enterIntake()` |

## `p-reveal` anatomy (most-iterated screen — respect these decisions)

- H1 only: "Nuave menemukan brand Anda". **No kicker/eyebrow label, no
  subtitle.** The owner explicitly removed them; do not reintroduce.
- `.report` card = miniature of the future report (Acctual-inspired):
  - Brand header: logo+name row, then description row, then URL row — each
    its own row. Description truncates at 140 chars with "…" (in
    `renderReveal()`). Empty rows get `hidden`.
  - "Skor Visibilitas AI": number blurred to illegibility (`.rp-blur-num`,
    blur 9px). Not "–", not a readable number.
  - "Kompetitor": grey circles + grey bars (`.rp-dot`, `.rp-line`) — no
    colors, no real competitor names in the preview.
  - Bottom: skeleton lines; the **whole card** (stroke included) fades to
    transparent over the last 130px via `mask-image` on `.report`.
- Payment section `.buy2`: **no outer container/stroke.** "Audit sekarang" +
  "Apa yang akan Anda dapatkan di audit ini?" + three Uber-Pass-style
  pointers (tinted icon circles): AI responses (10 questions) / competitor
  performance / improvement suggestions. Then the `#payNote` paragraph
  ("Setelah membayar, Anda bisa memeriksa informasi brand Anda dan 10
  pertanyaan…") and CTA "Bayar Rp99.000".
- Floating pay bar `#floatpay` (Airbnb pill): Rp99.000 + "Bayar sekarang",
  fixed bottom. Hidden via IntersectionObserver in `armFloatPay()` when
  `#payNote` is **fully** visible (`threshold: 1`); reappears on scroll-up;
  force-hidden on any other screen (in `show()`).

## Transition adjustments made to the existing intake (the only ones)

- Old `s-pay` ("Pembayaran berhasil") and `s-url` screens were removed —
  superseded by `p-success` and `p-landing`.
- Old `s-manual-name` became pre-payment `p-manual` (same inputs/ids).
- `flow()` now starts at `s-brand` (read mode) or `s-scope` (manual mode).
  Everything from `s-scope` onward is untouched, including the wrong-brand
  fix path (`s-brand-fix` → `s-crawl` re-read), review, and question screens.

## Scenario selector (top-right) still drives everything

`lengkap` / `tipis` / `keliru` / `manual` in `SCENARIOS`. For `keliru`, the
reveal shows the *wrong* brand; "Ganti sumber" → `changeSource()` clears
`S.wrong` so a re-scan resolves correctly. Paying anyway keeps the wrong
brand into the intake, where the existing fix flow catches it. Keep both
paths working.

## Technical notes / gotchas

- **The document scrolls, not `#stage`.** `#stage` has `overflow-y:auto` but
  is never height-constrained. Any scroll logic (observers, scroll resets)
  must target the window/viewport. `show()` calls both
  `stage.scrollTo(0,0)` and `window.scrollTo(0,0)`.
- All simulation timers: scan 2.2s, crawl (intake re-read) 2.4s,
  processing 1.8s.
- Payment is simulation-only; every route's "pay" button = `finishPayment()`.
  Each payment screen carries a one-line `.simnote` disclosure — keep it.
- Copy is Bahasa Indonesia throughout; match the existing register (plain,
  warm, no enterprise-fintech tone).
- No build step, no dependencies. Test by serving the repo root
  (`python3 -m http.server`) and clicking through — `file://` breaks nothing
  but some agent tooling refuses it. A Playwright click-through of all four
  scenarios and all three payment routes passed as of this commit.

## Open items the next agent could pick up

- Real favicon/logo fetch for the brand card (currently initials).
- `tipis` scenario has no reveal-specific copy (its thin-source note only
  appears later, at intake `s-brand`); decide whether the reveal should
  acknowledge thin sources.
- VA/QRIS screens have no countdown/expiry state (intentionally light —
  add only if testing shows confusion).
- Desktop layout is the same centered 560px column; no wide-layout pass yet.
