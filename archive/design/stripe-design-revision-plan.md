# Stripe-Inspired Design Revision Plan — Nuave AI Visibility Report

**Date**: 2026-08-06
**Reference**: Stripe design system (loaded from `popular-web-designs/templates/Stripe.md`)
**Surface**: Decide / Learn (unchanged)
**Goal**: Re-skin the report with Stripe's design principles while preserving all content and information hierarchy.

---

## What We're Keeping

The report's information architecture, content, and section structure are strong and don't change. Specifically:

- 10-section flow (score → summary → methodology → scorecard → 5 steps → action plan → appendices)
- All copy, tables, callout text, and data
- The three-card executive summary layout
- Status color-coding (Good / Needs Work / Narrow / Gap)
- The "Do this tomorrow" and "Download PDF" CTAs
- Language toggle (EN/ID)

---

## 7 Design Changes (Stripe Principles Applied)

### 1. Font → Source Sans 3, Light-Weight Headlines

| Current | → Stripe |
|---|---|
| Geist, weight 600–800 for headings | Source Sans 3, weight 300 for headings |
| Geist, weight 400 for body | Source Sans 3, weight 400 for body |
| Lora italic for blockquotes | Source Sans 3 italic (or keep serif for editorial contrast) |

**Rationale**: Stripe's signature is weight-300 headlines — the text is so confident it doesn't need boldness to be authoritative. For a report about AI visibility, this projects "we know what we're talking about" rather than "we're trying to convince you."

**How**: Replace Google Fonts import (`Geist` + `Lora`) with `Source Sans 3` (weight 300, 400, 600). Map heading weights:
- `score display` (57px): 300
- `h2` section headings (33px): 300
- `h3` subheadings (25px): 300
- `h4` callout headings (19px): 400 (smaller sizes need more weight for readability)
- Body text: 400
- Buttons: 400
- Captions/meta: 400

**Decision needed**: Keep Lora italic for blockquotes or switch to Source Sans 3 italic? Stripe uses sohne-var for everything. Recommendation: keep Lora — the serif editorial voice in blockquotes is a Nuave-specific design choice that distinguishes the report from a generic Stripe clone.

---

### 2. Color Palette → Stripe's Navy-Slate-Purple

| Token | Current | → Stripe | Role |
|---|---|---|---|
| Headings | near-black (`#111827`) | `#061b31` (deep navy) | Warmer, premium, financial-grade |
| Body text | `#374151` | `#64748d` (slate) | Softer, less harsh |
| Muted text | `#6b7280` | `#64748d` (same as body tinted) | |
| Borders | `#e5e7eb` | `#e5edf5` (soft blue-tinted) | Subtle warmth |
| Accent/CTA | `#533afd` | `#533afd` (unchanged — matches Stripe!) | |
| Accent hover | `#3d2bc7` | `#4434d4` (Stripe's hover) | |
| Link blue | `#2563eb` | `#533afd` (use purple) | Single accent system |
| Background | `#ffffff` | `#ffffff` (unchanged) | |

**The big win**: Nuave's brand purple (`#533afd`) is Stripe's exact primary purple. The accent color doesn't change — just the neutral palette around it. This means the brand identity stays intact while the report feels fundamentally more premium.

**Status callout colors** (keep but refine):
| Status | Current bg | → Stripe-inspired bg | Current text | → Stripe-inspired text |
|---|---|---|---|---|
| Blue (info) | `#eff6ff` | `#f0f4ff` (slightly cooler) | `#1e40af` | `#273951` (label color) |
| Green (good) | `#f0fdf4` | `rgba(21,190,83,0.08)` | `#166534` | `#108c3d` (Stripe success) |
| Amber (warning) | `#fffbeb` | `rgba(155,104,41,0.08)` | `#92400e` | `#9b6829` (Stripe lemon) |
| Red (gap) | `#fef2f2` | keep | `#991b1b` | keep (Stripe doesn't use red much) |

---

### 3. Shadows → Blue-Tinted Multi-Layer

| Current | → Stripe |
|---|---|
| Cards: nearly flat (`rgba(0,0,0,0.04)`) | Standard card: `rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px` |
| No elevation system | Two tiers: ambient (`rgba(23,23,23,0.06)`) + elevated (above) |

**Rationale**: Stripe's blue-tinted shadows are its most distinctive visual signature. The shadow color (`50,50,93`) is directly related to the navy heading color (`#061b31` ≈ `6,27,49`). This creates "chromatic depth" — elevation that feels brand-colored.

**Where**: Apply to the executive summary cards, scorecard tables, AI response quote boxes, and action plan cards. Not to inline text or the page background.

**Pitfall**: The current report has many colored-background cards. Blue-tinted shadows work best on white cards. For colored callout cards, use a lighter ambient shadow or none.

---

### 4. Border Radius → Tight & Conservative

| Current | → Stripe |
|---|---|
| Pill-shaped buttons (`rounded-full`) | 4px radius buttons |
| `rounded-lg` (14px) for cards | 6px radius for cards |
| `rounded-full` for status pills | 4px radius for badges |

**Rationale**: Stripe's conservative border-radius (4–8px range) conveys precision and seriousness. Pill shapes feel consumer-app; tight radii feel financial-grade.

**Exception**: The score circle (56/100) should stay circular — it's a data visualization element, not a button.

**Status pills**: These currently use `rounded-full` with colored backgrounds. Changing to 4px radius with the same background+text colors works the same way visually — the reader still recognizes the color-coding instantly. Example: `border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 400`.

---

### 5. Card Design → White + Border + Shadow (Strip Colored Backgrounds)

The report currently uses full-color backgrounds for callout cards:
- Blue bg (`#eff6ff`) for informational callouts
- Green bg (`#f0fdf4`) for positive results
- Amber bg (`#fffbeb`) for warnings
- Red bg (`#fef2f2`) for gaps

**Stripe approach**: White card background, use color through:
1. A 3px left border in the status color (keep the "accent rail" — it's functional here)
2. A colored badge/pill in the card header
3. Blue-tinted shadow for elevation

**Before/after example** (Executive Summary "You're findable" card):
```
BEFORE:                                    AFTER:
┌─────────────────────────┐               ┌──────────────────────────┐
│ 🟢 bg-green-light        │               │ ┃ white bg                │
│ ┃ 3px green left border  │               │ ┃ 3px green left border   │
│ ┃ "You're findable"      │               │ ┃ [Good] pill + heading   │
│ ┃ Body text here...      │               │ ┃ Body text in slate      │
└─────────────────────────┘               │ ┃ blue-tinted shadow      │
                                           └──────────────────────────┘
```

**Why**: Full-color backgrounds are the "colored paper" approach — functional but unsophisticated. Stripe puts color in the borders/accents and keeps surfaces white. This makes the color more deliberate and the report feels more premium.

**Tradeoff**: The current design's colored backgrounds are highly scannable (green = good, amber = warning). The Stripe approach preserves scannability through the left border + pill combo while looking cleaner.

---

### 6. Spacing → Stripe's Precision Scale

| Current (Tailwind) | → Stripe scale |
|---|---|
| `p-6` (24px) card padding | 16–20px card padding |
| `my-12` (48px) section gap | ~64px section gap |
| `gap-5` (20px) grid gap | 16–18px grid gap |

**Rationale**: Stripe uses "precise, measured spacing" — generous around UI chrome, tighter within data displays. The report should feel more airy between sections (64px+) and tighter within cards (16–18px).

---

### 7. CTA Buttons → Stripe Button Specs

| Current | → Stripe |
|---|---|
| Pill-shaped purple button | 4px radius, `#533afd` bg, white text, 8px 16px padding |
| Pill-shaped green button ("Do this tomorrow") | Ghost/outlined: transparent bg, `#533afd` text, `1px solid #b9b9f9` border |
| Ghost secondary buttons | Same as Stripe ghost: transparent, `#533afd` text |

**Rationale**: "Do this tomorrow" is currently a green pill. Green (`#15be53`) is Stripe's success color — but for a CTA, purple is the interactive accent. Make it a purple ghost button to match the Stripe visual language. If "Do this tomorrow" needs to feel different from the Download button, use the outlined variant.

---

## What We're NOT Changing

1. **Lora serif blockquotes** — This editorial voice is a Nuave signature. Stripe doesn't use serif, but the report is a Decide/Learn surface (not a SaaS product page), so this editorial warmth is appropriate.
2. **The score circle shape** — Stays circular. It's data viz, not a UI component.
3. **10-section structure** — The information architecture is the report's strongest asset.
4. **AI response quote boxes** — Keep the current quote-card pattern. Apply Stripe styling (white bg, blue-tinted shadow, tighter radius).
5. **Tables** — Keep functional. Apply Stripe border color (`#e5edf5`) and label color (`#273951` for headers).

---

## Implementation Order

### Phase 1: Foundation (tokens only)
1. Add Stripe color tokens to `tokens.css` (navy, slate, soft-blue border, shadow values)
2. Swap font import: `Geist` + `Lora` → `Source Sans 3` + `Lora`
3. Update CSS custom properties: `--text-heading`, `--text-body`, `--text-muted`, `--border-default`

### Phase 2: Surface changes (visual only)
4. Change all heading weights from 600–800 to 300–400
5. Apply deep navy (`#061b31`) to all headings
6. Apply slate (`#64748d`) to all body text
7. Apply soft blue border (`#e5edf5`) to all cards and tables
8. Add Stripe blue-tinted shadows to cards

### Phase 3: Component refinements
9. Tighten all border radii: buttons → 4px, cards → 6px, pills → 4px
10. Convert colored-background cards to white + left border + badge
11. Restyle buttons to Stripe specs (4px radius, 8px 16px padding)
12. Switch link color from blue (`#2563eb`) to purple (`#533afd`)

### Phase 4: Polish
13. Adjust section spacing to Stripe scale (64px between sections)
14. Review responsive behavior at 375px and 768px
15. Run slop diagnostic against final output

---

## Risk: Will It Still Look Like a Nuave Report?

The concern is that applying Stripe's system too literally produces a report that looks like a Stripe marketing page instead of a Nuave product.

**Mitigations**:
- **Keep Lora blockquotes** — the serif editorial voice is distinctly Nuave
- **Keep the status color system** (green/amber/red/blue) — Stripe doesn't have this; it's Nuave's domain vocabulary
- **Keep the score circle** — Stripe doesn't do big circular score badges; this is a Nuave signature element
- **Don't add Stripe's dark brand sections** (`#1c1e54`) — the report stays on white. Dark sections are for marketing pages, not reports.
- **Don't add ruby/magenta gradients** — these are Stripe's decorative accent colors, not appropriate for a report

The goal is *Stripe's precision and premium feel*, not *Stripe's exact visual identity*.

---

## Files That Will Change

| File | What changes |
|---|---|
| `src/styles/tokens.css` | New color tokens, shadow tokens, border-radius alignment |
| `src/app/globals.css` | Font import, CSS variable overrides |
| Report page component(s) | Heading weights, border radii, card backgrounds → white, shadow application, button restyle |

---

## Next Action

Build a standalone HTML prototype (Stripe-skinned report) to verify the look before touching the production codebase. This lets us iterate visually without risk.
