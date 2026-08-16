# Nuave landing — content strategy (v1 draft)

**Folder:** `/Users/yasir/nuave_v0.2/LP - Claude/`
**Files:** `index.html`, `styles.css`, `script.js`
**Status:** Content-first draft for founder review. Static, no build step. Open `index.html` or serve the folder.

## Why this rewrite

The current Nuave landing copy (`src/messages/id.json`) is written for an
**agency / freelancer / consultant** buyer ("klien", "agensi", white-label,
manual delivery). That contradicts `docs/VISION.md` and `docs/PRODUCT.md`, where
the customer is the **owner or marketing decision-maker of their own** Indonesian
SME. README and NOW.md both flag this as a known gap. This draft fixes the
audience to the correct one.

## Method applied (from `HCLP — build-converting-landing-pages`)

- Conversion event: visitor submits business + location + email, then receives a
  report. (Form is a demo; real submission waits for checkout.)
- Conversion argument (belief sequence):
  1. "This is about MY business being found by AI" — Hero + Problem
  2. "I can see what the report actually looks like" — Report preview
  3. "The method is honest and bounded" — How it works + FAQ boundaries
  4. "Low risk to start" — CTA note (no subscription, no hard sell)
- Evidence-led, not fear-led: no vanity score, no guaranteed growth, no urgency.
- Proof sits next to the claim it supports (report preview beside the promise).

## Section plan

| Section | Job | Belief built |
|---|---|---|
| Hero | Recognize the visitor's question | "AI answers questions about my business" |
| Problem | Define the new risk | "I might be invisible to AI" |
| Cara kerja (3 steps) | Make the method credible | "This is a real, bounded measurement" |
| Contoh laporan | Show the deliverable | "I can read and share this" |
| Mulai (CTA + form) | Ask for action | "Easy and low-risk to start" |
| FAQ | Resolve objections | "Honest scope, no catch" |

## Claim ledger (honesty guardrails)

| Claim | Status | Note |
|---|---|---|
| AI increasingly used for recommendations | GENERAL KNOWLEDGE | Framed as observed trend, not a stat |
| Nuave measures appearance in defined AI searches | SUPPORTED | Matches VISION/PRODUCT method |
| 10 questions, 5 branded / 5 unbranded | SUPPORTED | Per PRODUCT.md and NOW.md |
| Report readable in ~10 minutes | SUPPORTED | Per PRODUCT.md offer |
| Re-check 6–8 weeks, not a subscription | SUPPORTED | Per PRODUCT.md |
| Score shown as a band, not exact integer | SUPPORTED | Per PRODUCT.md |
| Report preview "Muncul di 3 dari 10" | ILLUSTRATIVE | Labelled as illustration, no real result |
| Price published | NOT STATED | Deliberately open per NOW.md/PRODUCT.md |
| Any ranking / leads / revenue guarantee | BLOCKED | Never claimed |

All illustrative numbers in the preview are explicitly labelled "Ilustrasi. Tidak
ada hasil bisnis sungguhan."

## Known gaps before this goes live

- Indonesian copy uses "brand Anda" per the writing skill, but the live product
  is still English-first in `/audit`. Aligns with the later product-wide polish
  pass, not now.
- Form has no backend. Wire to checkout/private-link when that stage is built.
- One vertical, one city, one surface (ChatGPT) is the honest launch scope; the
  copy says "satu surface AI" to stay truthful.

## Copy length

This draft is roughly 50% shorter than the first cut: short headlines, one idea
per sentence, scannable cards. Intended to lower cognitive effort on first read.
