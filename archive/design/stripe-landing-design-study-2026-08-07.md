# Stripe Landing Page Design Study — Observed via Mobbin

**Date**: 2026-08-07
**Method**: Mobbin MCP `search_sections` (natural-language queries), 21 Stripe sections examined as screenshots
**Scope**: Homepage hero variants, feature/resource grids, customer showcase, pricing (5 patterns), dark/developer section, footers
**Use**: Evidence base for the Stripe-inspired Nuave report design (`docs/stripe-design-revision-plan.md`, `nuave-stripe-report-design` skill)

> This study records **observed evidence** — what the screenshots actually show. The static token template
> (`popular-web-designs/templates/stripe.md`) supplies colors/type/shadow values; this document supplies
> **composition and section rhythm**, which the template cannot. Where the two disagree, the screenshots win.

---

## 1. What Was Examined

| # | Section | What it shows | Mobbin |
|---|---|---|---|
| H1 | Hero — "A complete payments platform, engineered for growth" | Split hero; left text, right **layered floating payment mockups** (cart modal, mobile pay screen, Apple Pay sheet, checkout bar) | [section](https://mobbin.com/sites/sections/8247f8fd-e608-43c7-a149-92d16e163277) |
| H2 | Hero — "Global payments are evolving. Stripe can help." | Split hero; right = **abstract pointillist globe** with orbiting colored lines; eyebrow "Use cases" | [section](https://mobbin.com/sites/sections/4e30933c-7533-4812-ba94-eb510facc2f8) |
| H3 | Hero — "Payments infrastructure for the internet" | Split hero; right = payment form mockup + small analytics chart; logo strip below | [section](https://mobbin.com/sites/sections/7814a670-cc37-42c9-8e8e-6b51a74c9785) |
| H4 | Hero — "Financial infrastructure to grow your revenue" | Split hero; **gradient text on "your revenue"**; right = fluid mesh-gradient graphic; metric eyebrow above headline; grayscale logo strip below | [section](https://mobbin.com/sites/sections/fc905901-fe5f-4813-bc2a-112fd8de0c21) |
| H5 | Hero — "Financial infrastructure for the internet" | Split hero on **gradient-mesh background**; right = dashboard mockup (ROCKET RIDES) + checkout mockup; logo strip | [section](https://mobbin.com/sites/sections/f8f0c7c8-7538-4d10-b49a-d7e6c9e16d61) |
| H6 | Header only (dark variant) | Dark-navy nav; white "Contact sales" button — captured for the dark treatment | [section](https://mobbin.com/sites/sections/e0a82ca0-168f-49d8-832a-06abd394671c) |
| H7 | Hero — "Build an app on Stripe" (Stripe Apps) | Eyebrow + **Beta pill badge**; right = dashboard mockup + pastel 3D shapes; gradient wave at section bottom | [section](https://mobbin.com/sites/sections/f164cb2d-c891-42d8-9156-979865f91558) |
| H8 | Hero — ecommerce "A complete payments platform for ecommerce" | Right = **two-product metaphor**: browser mockup (Warby Parker) + POS terminal; blue ribbon background plane | [section](https://mobbin.com/sites/sections/7d973658-cfe5-4e1d-a425-0f492fa341da) |
| H9 | Dark section — "Develop a Stripe App" | Deep navy; white headline; 3D isometric tiles; cyan CTA; one light section below | [section](https://mobbin.com/sites/sections/085b389d-3f41-4f17-9ed0-51a6ba23eccc) |
| H10 | Hero — Connect "Send payouts around the world" | Left text; right = **fluid blue wave graphic**; sub-nav under global nav (product-level tabs) | [section](https://mobbin.com/sites/sections/7bcbb3a8-b450-4cd1-845d-bc7bee4209ed) |
| F1 | Feature grid — "Product resources" | Header row (title + subtitle + "See all >" CTA) above **2×4 colored cards** (magenta/navy/lavender/violet) with abstract line-art, white card text | [section](https://mobbin.com/sites/sections/bad3b406-920e-435e-98cc-3a7086b5775a) |
| F2 | Customer showcase carousel — "Build a foundation for your startup" | Headline + intro + arrows; row of 4 dark cards (Lovable, Runway, Supabase, Linear) each with logo, one-line story, "Read story >" link; 2 gradient program cards below | [section](https://mobbin.com/sites/sections/6896fea8-b19e-4b90-8c84-b1faaed46940) |
| F3 | Hybrid — Atlas "Trusted by founders and investors" | Left = 3 feature blocks with orange icons; right = vertical **testimonial quote cards** (headshot, name, quote) | [section](https://mobbin.com/sites/sections/4a74fb8d-9068-4c58-811a-b1db8dea9a23) |
| F4 | Resource hub (same grid as F1 with nav) | "Guides" blue eyebrow → "Product resources" headline → colored card grid | [section](https://mobbin.com/sites/sections/69cab259-e062-4d57-9e12-529a187f3f33) |
| P1 | Pricing — full platform fee breakdown | Sticky left category nav; right = product card + **fee list rows** (method | description | price) with hairline dividers | [section](https://mobbin.com/sites/sections/43111b7e-c3b7-4197-bd68-c5cc1ce2b8c1) |
| P2 | Pricing — Connect plans | **3-column plan cards** (Standard/Express/Custom): icon + plan name + headline + description + feature checklist + price; full-width banner below with "Contact sales >" | [section](https://mobbin.com/sites/sections/1364b8ea-7265-4526-9caf-40b29f2128e7) |
| P3 | Pricing — "Know what you'll pay" | Structured list: **feature | description | price** rows, hairline dividers, purple text links, no cards at all | [section](https://mobbin.com/sites/sections/86c81eeb-bce6-4113-892c-78b9284405e0) |
| P4 | Pricing — "Pricing built for businesses of all sizes" | Two stacked tiers (Standard / Custom); price highlighted in a **pale-blue box**; teal checkmark feature list; text-link CTAs only | [section](https://mobbin.com/sites/sections/2cac1cc3-8382-4d23-a2e6-0799f116719a) |
| P5 | Pricing — Support plans + CTA band | 3 white cards (Growth/Premium/Enterprise) with gradient tier labels; purple→blue gradient "Contact sales" button; separate centered CTA band "Ready to get started?" below | [section](https://mobbin.com/sites/sections/61967abd-ba7f-45ad-84e2-6f1462c2cc6f) / [section](https://mobbin.com/sites/sections/bac03a33-34c2-49d9-bc1e-2d0e625cb5e1) |
| D1 | Dark developer section — "Developer-centric" | Deep navy split: left copy + cyan checkmark feature list + cyan "Explore the docs" button; right = **code editor with language tabs** (Node.js/Ruby/Python/Go/PHP/Java/.NET), syntax-highlighted Payment Intent code | [section](https://mobbin.com/sites/sections/3f00c318-d158-43a9-aee5-d0e69166e1a7) |
| FT1 | Footer v1 | Light gray (`#F6F9FC`) background; 4 link columns (brand/locale + Products + Solutions/Dev + Resources/Company); **no newsletter, no CTA**; dark utility strip at the very bottom | [section](https://mobbin.com/sites/sections/aedbe0cb-192a-4e87-bed2-307065b1e559) |
| FT2 | Footer v2 | White background; category column (About/Products/Use cases) + 3 link columns; purple links; dark utility strip | [section](https://mobbin.com/sites/sections/3652bdff-2a9f-43d3-ad78-06ee40c2fdc9) |

---

## 2. Observed Composition Techniques (the transferable layer)

These recur across nearly every section and are the *design intelligence* the token template can't convey:

1. **Asymmetric split, never 50/50.** Text column is ~40–50%, visual column ~50–60% (H1–H5, H7–H10, D1). The visual side is a **layered composition of 2–3 overlapping elements** — one main panel (dashboard/form/code), one smaller supporting card, one background plane (ribbon, wave, mesh, dot-field). The report's hero right-side stack (platform summary + priority card + one chart + angular gradient plane) is the same recipe.
2. **Eyebrow label system.** A small colored category label above the headline ("Payments", "Use cases", "Ecommerce solution", "Stripe Apps", "Guides", "Pricing") — always a noun phrase, always quiet, usually purple or blue (H2, H7, H8, F4, P4).
3. **One primary CTA + one quiet secondary.** Every section has exactly one filled button ("Start now >", "Contact us >", "Explore the docs >"); the secondary is a plain text link with a ">" ("Contact sales >"). Secondary actions never compete (H1–H5, H8, H10, D1).
4. **Gradient used surgically, in three sanctioned spots only:** (a) a gradient on 1–2 key words in the headline (H4: "your revenue"), (b) an abstract background plane (mesh gradient H4/H5, wave H10, ribbon H8, gradient wave H7), (c) one CTA button (P5). Flat surfaces everywhere else.
5. **Metric eyebrow as social proof** (H4: "Global GDP running on Stripe: 1.56192878T" above the headline) — a single real number, not a stats grid.
6. **Logo strip directly under the hero**, logos in grayscale so they don't fight the palette (H3, H4, H5).
7. **Hairline dividers over card walls.** Fee lists and pricing rows use thin horizontal rules on white, not nested boxes (P1, P3, P4). Cards are reserved for things that need elevation (plans, support tiers, testimonials).
8. **Dark section = exactly one, full-width, purposeful.** Deep navy, white headline, one bright accent color (cyan or light blue) used consistently for both CTA and data accents, and it always explains/teaches something (developer section D1, "Develop a Stripe App" H9). It appears mid-page or late, never as the page's opening move.
9. **Section background rhythm.** White sections alternate with light-gray (`#F6F9FC`) sections and one pale-tinted highlight box for a single key figure (P4's pale-blue price box). Color carries meaning; it doesn't decorate.
10. **Footer is deliberately quiet.** No newsletter, no CTA, just a dense link grid on a light background + a dark utility strip. The conversion energy stays in the page body.
11. **Cards: white surface, 1px border, small radius, blue-tinted shadow.** Elevation is a language — only plan cards and support tiers float (P2, P5); content lists stay flat (P1, P3).
12. **Product visuals are always "real-ish".** Mockups show plausible data (ROCKET RIDES dashboard, $12,198.72 gross volume, "pm_card_mastercard") — never lorem ipsum, never decorative nonsense.

---

## 3. What This Study Adds vs. the Token Template

| Gap in the template | Filled by Mobbin evidence |
|---|---|
| No sense of page structure | Full section library + order: hero → logo strip → feature/resource → showcase → pricing → CTA band → quiet footer |
| No hero composition guidance | The layered-preview recipe (main panel + smaller card + background plane) is now concrete |
| No eyebrow/label pattern | Observed across 8+ sections; it's a system, not an ornament |
| No CTA discipline | One filled button + one ">" text link per section, consistently |
| No guidance on gradient placement | Exactly 3 sanctioned spots, observed repeatedly |
| Dark section use unclear | Always single, full-width, educational, with one accent color |
| List vs card decision unclear | Hairline-divider lists for data; cards only for things needing elevation |

---

## 4. Mapping to the Nuave Report Design

Direct translations from the observed Stripe system to the Nuave report (`docs/stripe-design-revision-plan.md` + `nuave-stripe-report-design` skill):

| Stripe pattern (observed) | Nuave report application |
|---|---|
| Asymmetric split hero (40/60) with layered visual stack | ReportHeader: left identity/scope narrative, right layered preview (platform summary + priority card + one chart + angular plane) — already the plan, now evidence-backed |
| Eyebrow label ("Payments", "Use cases") | Small labels above report sections: "Ringkasan", "Metodologi", "Kesimpulan" — uppercase, 12–14px, muted/purple |
| Metric eyebrow (H4) | Audit meta above the title: "Diuji pada 3 platform · 12 prompt · Agustus 2026" — one line, not a stats grid |
| One primary + one quiet secondary CTA | "Lihat prioritas utama" (filled) + "Unduh ringkasan report" (text link with ">") — exactly one emphasized |
| Gradient on key phrase (H4) | Optional: violet→blue gradient on the business name or "AI visibility" in the title — one phrase max, sanctioned by the skill's gradient rules |
| Grayscale logo strip | **Do not fake customer logos.** Replace with a "platforms tested" strip: ChatGPT / Gemini / Perplexity marks, flat gray, same role (scope credibility) |
| Hairline-divider fee list (P1, P3) | Source & information gaps table and competitor observation rows: divider-separated lines, no nested cards |
| Pale highlight box for one key figure (P4) | The executive summary's priority card or the key count ("3 dari 12 prompt non-branded") — one pale-lavender field per page |
| Single dark educational section (D1) | The methodology section: deep navy `#0A1433`, white text, one accent (violet/cyan), compact evidence-flow diagram — already the skill's rule, now visually confirmed |
| Section rhythm: white ↔ pale gray | Alternate white and `#F6F8FC`/pale-lavender section fields instead of card walls |
| Quiet footer, no CTA | ReportFooter: next-action recap + limitations recap; CTA stays in the body (PriorityAction section) |
| Real-looking product visuals | Report previews use real or clearly marked sample data — no lorem ipsum |

## 5. Explicit Non-Transfers (observed but deliberately rejected)

- **Equal-weight 3-card plan grids (P2, P5).** Nuave's one-highlighted-priority recommendation is a deliberate deviation: Stripe sells *choice*; the report must sell *one next step*.
- **Customer showcase carousels with brand logos (F2).** Nuave never fabricates customer proof (AGENTS.md rule 8).
- **Testimonial quote cards (F3).** Same rule — no fabricated quotes.
- **Fluid mesh-gradient backgrounds (H4, H5).** Too loud for a document surface; the report's gradient budget stays at one hero plane + sanctioned accents.
- **Pill buttons (seen in several variants).** The revision plan already moves to 4px radius; pills contradict the precision language.
- **Colored card grids as content carriers (F1).** Works for marketing resource discovery; a report needs white surfaces + status rails.

---

## 6. Open Questions for the Prototype

1. Should the report hero's "platforms tested" strip be a grayscale logo row (Stripe-style) or a plain metadata line? (Logo row is more Stripe; metadata line is more honest-report.)
2. Gradient on the business name in the title — yes/no? The revision plan didn't include it; this study shows it's Stripe's signature headline move.
3. Pale-lavender highlight box in the executive summary — confirm it stays at one per page (skill currently allows "decorative / exec-summary field").

---

## 7. Next Action

Use this study to build the standalone Stripe-skinned report prototype (the pending next action in `docs/stripe-design-revision-plan.md`), applying Section 4's mappings and resolving Section 6's questions in the prototype.
