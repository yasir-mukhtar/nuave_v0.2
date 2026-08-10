# Nuave — AI Visibility Report: Design Critique

**Date**: 2026-08-06
**URL**: http://localhost:5173/
**Audited by**: senior-ui-design skill workflow
**Framework**: Slop Diagnostic (10 tells) + Surface Archetype analysis

---

## Step 0 — Gather Context

- **DESIGN.md**: Not present. The project uses a CSS custom properties system in `src/styles/tokens.css` (colors, type scale, spacing, radii, shadows, button specs) layered on top of Tailwind v4 + shadcn/ui-style semantic tokens in `src/app/globals.css`.
- **Active font stack**: Geist (headings, sans body) + Lora (serif accent). Served via Google Fonts.
- **Type scale**: Utopia perfect-fourth scale, 14px base, ratio 1.333.
- **Color system**: Purple brand accent (`#533afd`) for CTAs; a semantic callout palette (blue/green/amber/red) for status; Tailwind-derived neutral grays via oklch.

---

## Step 1 — Surface Archetype

This is a **Decide / Learn** surface: a long-form report that educates the reader about their AI visibility standing and convinces them to act. The reader is being taught and persuaded — not monitoring, operating, or comparing.

A Decide/Learn surface is the correct archetype for a report. The page commits to this consistently throughout: one section = one message, progressive disclosure from summary → detail → action plan.

**Verdict**: Surface choice is correct. No wrong-surface penalty.

---

## Step 2 — Design System Audit

### Colors

| Token | Value | Usage |
|---|---|---|
| `--background` | `#ffffff` | Page background |
| `--foreground` | near-black (oklch 0.145) | Body text |
| `--primary` | `#533afd` (purple) | Brand / CTA |
| `--muted` | `oklch(0.97)` | Secondary surfaces |
| `--border` | `#e5e7eb` | Card/table borders |
| Callout blue | `#eff6ff` bg / `#1e40af` text | Informational cards |
| Callout green | `#f0fdf4` bg / `#166534` text | Positive results |
| Callout amber | `#fffbeb` bg / `#92400e` text | Warnings / needs-work |
| Callout red | `#fef2f2` bg / `#991b1b` text | Gaps / negative |

**Observations**:
- The callout palette is well-chosen and consistently applied. Each status (Good, Needs Work, Narrow, Gap, Mixed) gets the right color.
- The purple brand accent (`#533afd`) is used sparingly — mostly in the Download PDF button and the "Do this tomorrow" CTA. This creates a clear visual distinction between "Nuave product UI" and "report content."
- **Issue**: The accent blue (`#2563eb`) is used for links and some highlights. This is a generic Tailwind blue, not derived from the brand purple. Two accent colors (purple + blue) dilute brand recognition.

### Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| Display (score) | Geist | ~57.8px (`3.6rem`) | 800 |
| h2 (section titles) | Geist | ~33.2px | 700 |
| h3 (subsection) | Geist | ~24.9px | 600 |
| h4 (callout headings) | Geist | ~18.7px | 600 |
| Body | Inter/Geist | 14–16px | 400 |
| Caption / meta | Inter | 12px | 400 |
| Blockquote | Lora (serif) | ~15px | 400 italic |

**Observations**:
- Geist + Lora is a strong pairing. Geist carries authority; Lora adds editorial warmth in the blockquotes.
- The type scale has clear hierarchy. Headings are distinct from body.
- **Issue**: The report uses `font-sans` (Geist) for body text, but the design system specifies `--font-body` (Inter) for body. In practice, Geist at 14–16px body text works fine — the difference is subtle — but there's a mismatch between the token system and the actual rendered font.
- **Issue**: Some inline font sizes use arbitrary values (`text-[0.88rem]`, `text-[1.15rem]`, etc.) rather than the semantic type scale tokens. This leads to slight inconsistencies in body text sizing across sections.

### Spacing

Base unit is `0.25rem` (4px). The report uses a generous vertical rhythm:
- `my-12` (48px) between major sections
- `my-6` to `my-8` (24–32px) between subsections  
- `p-6` (24px) inside cards
- `gap-5` (20px) between card grid items

**Observations**: Spacing is well-calibrated. The report is dense but never feels cramped. The generous whitespace between sections makes the 10-section structure scannable.

### Shadows & Elevation

The report uses extremely subtle shadows:
- Cards: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)` — nearly flat.
- **Issue**: At this subtlety, shadows don't create meaningful elevation. The cards effectively read as bordered boxes, not elevated surfaces. This is fine for a report (print-like flatness is appropriate), but the shadow tokens in the design system (`--shadow-card`, `--shadow-modal`) are more pronounced and aren't being used here.

### Components

| Component | Specs |
|---|---|
| **Status pills** | Rounded-full, 12px font, colored bg + colored text (e.g., green bg + green text for "Good") |
| **Callout cards** | Rounded-lg (14px), light colored bg, 3px left border accent |
| **Tables** | Clean borders, muted header row, consistent cell padding |
| **Blockquotes** | Lora italic, left border accent, slightly indented |
| **Buttons** | Pill-shaped, purple fill for primary, ghost for secondary |

**Observations**:
- The status pills are well-executed. Small, scannable, color-coded — exactly what a report needs.
- **Issue**: Callout cards use a 3px left border for accent (blue/green/amber/red). This is the "accent rail" pattern (slop tell #4). However, in this context it's functional — the color rail provides immediate category recognition. The question is whether the same information could be communicated without the decorative rail (e.g., just the colored background + text).

---

## Step 3–4 — Visual Verification

Two screenshots were taken (full page + header). Key observations:

1. **Header layout**: Score badge (56/100) in a large circle dominates the top-left. The "AI VISIBILITY SCORE" label sits to its right. The score is the strongest visual anchor on the page — it immediately communicates the report's core finding.

2. **Executive summary cards**: Three cards (Findable / Not Recommendable / Fixable) in a 3-column grid. Green-amber-green color coding communicates "good, bad, hopeful" at a glance. This is effective information design.

3. **Typography contrast**: Heading sizes create clear section boundaries. The all-caps "SECTION N" labels act as wayfinding markers through the long document.

4. **Table design**: Clean and functional. No zebra striping (appropriate — this isn't a data table, it's a comparison matrix). Column widths are well-proportioned.

5. **"Do this tomorrow" CTA**: Prominent green button, centered, clear label. Good placement — it's an actionable takeaway at the right moment.

6. **Language toggle**: "EN" / "ID" buttons in the top bar. Small, functional, non-distracting. Good execution.

7. **Download PDF button**: Pill-shaped purple button, top-right. Clear, consistent with the brand accent.

---

## Step 5 — Slop Diagnostic

### Score: 2/10

Two tells fired; both are minor and functional in context.

| # | Tell | Fired? | Notes |
|---|---|---|---|
| 1 | Tech gradient | ❌ | No gradients used. Clean flat design. |
| 2 | Generic tech hue | ⚠️ | Accent blue (`#2563eb`) is generic Tailwind blue, not derived from brand purple. Minor — only used on a few elements. |
| 3 | Feature-tile grid | ❌ | The 3-card summary grid serves a real comparison purpose (Findable / Not / Fixable), not decoration. |
| 4 | Accent rail | ⚠️ | 3px left border on callout cards is the accent rail pattern. However, in this context it's functional color-coding, not empty decoration. Low severity. |
| 5 | Unearned blur | ❌ | No glassmorphism. |
| 6 | Monument stat | ❌ | The 56/100 score is the central finding, not filler. |
| 7 | Icon topper | ❌ | Checkmark/X icons in callouts serve semantic purpose. |
| 8 | Center stack | ❌ | Content is left-aligned within a centered container. Not everything-is-centered syndrome. |
| 9 | Default type | ⚠️ | Geist (the default sans) is used for body text instead of the token system's `--font-body` (Inter). The difference is minimal, but it violates the design system. |
| 10 | Wrong surface | ❌ | Decide/Learn is correct for a report. |

**Tell #9 (default type) analysis**: The CSS variables specify `--font-body: var(--font-inter)` for body text, but the rendered page uses Geist throughout. In practice, Geist at 14px reads nearly identically to Inter — this is a token hygiene issue, not a visual one. Fix the token or fix the usage, but pick one.

**Tell #2 (generic hue) analysis**: The accent blue `#2563eb` appears on links and some highlights. It's the default Tailwind/shadcn blue, not Nuave's purple (`#533afd`). Since blue is used for "informational" callouts while purple is the brand, this is arguably intentional — but it means the page has two competing accent colors. Consider whether informational elements should use a tint of the brand purple instead.

---

## Strengths

1. **Information architecture is outstanding.** The report flows naturally: score → executive summary → methodology → scorecard → detailed steps → action plan → appendices. Each section builds on the last. Readers can stop at the executive summary and get the full message, or dive deep.

2. **Status color-coding is consistent and meaningful.** Every status category (Good, Needs Work, Narrow, Gap, Mixed) has a dedicated color that's used consistently across the entire report. This is not decoration — it's a visual language the reader learns once and uses throughout.

3. **Content density is well-managed.** This is a ~3,500-word report with tables, quote boxes, and callouts. It could easily feel overwhelming, but the generous spacing, clear section markers, and progressive disclosure pattern keep it readable.

4. **The blockquote voice is distinct.** Using Lora italic for the "editorial voice" blockquotes creates a clear separation between "the data says X" (body text) and "here's what this means for you" (blockquote). This is a thoughtful typographic choice.

5. **Language is action-oriented, not passive.** Headings like "This is where you lose clients" and "This is the leak" tell the reader what's at stake. The design reinforces this with direct, short headings.

6. **Token system exists and is well-structured.** `tokens.css` defines a complete design system: colors, type scale (with Utopia calculator link), spacing, radii, shadows, and button specs. The semantic type classes (`.type-body`, `.type-heading-md`, etc.) are a strong foundation. The issue is that this report page doesn't fully use them.

---

## Issues & Recommendations

### 1. Token usage drift (Medium)

The `tokens.css` system defines semantic type classes (`.type-body`, `.type-heading-md`, etc.) and a complete color palette. The report uses inline Tailwind utilities (`text-[0.88rem]`, `text-[1.15rem]`, arbitrary hex colors) instead of these semantic tokens. This creates an invisible fork: changes to `tokens.css` won't propagate to the report.

**Recommendation**: Replace arbitrary font-size and color utilities with the semantic type classes and CSS custom properties. If a size doesn't exist in the scale, add it to the scale rather than hardcoding it.

### 2. Two competing accent colors (Low)

Blue (`#2563eb`) for links/info, purple (`#533afd`) for brand/CTA. Users learn two different "this is interactive/important" colors.

**Recommendation**: Use purple as the sole accent for interactive elements. Use the blue callout palette only for informational status cards (where it's semantically correct). Alternatively, derive link blue from the purple brand color (a lighter tint) to maintain a single-hue accent system.

### 3. Shadow tokens are too subtle (Low)

Card shadows (`0 1px 3px rgba(0,0,0,0.04)`) are nearly invisible. Cards read as flat bordered boxes.

**Recommendation**: Either commit to flat design (remove shadows entirely, rely on borders) or use the design system's `--shadow-card` token (`0 1px 2px rgba(0,0,0,0.05)`) consistently. The current middle ground reads as unintentional.

### 4. The score circle could communicate more (Medium)

The 56/100 score circle is the page's strongest visual anchor, but it only shows a number. The semantic meaning (56 = below average, needs work) is carried by the text below it, not the visual.

**Recommendation**: Consider a donut/progress ring or color treatment on the circle itself. A 56% filled ring communicates "just over halfway" without reading a word. Or use the amber status color on the circle to signal "needs work" at a glance.

### 5. Report length has no table of contents or sticky nav (Low)

At 10+ sections, the report is long. The "SECTION N" labels help, but there's no way to jump to a specific section.

**Recommendation**: Add a sticky table of contents in the left margin (desktop only) or a "jump to" dropdown. This is a Decide/Learn surface — readers should be able to navigate non-linearly.

### 6. Mobile responsive behavior (Not tested)

The screenshots were taken at desktop width. The Tailwind classes suggest responsive grid collapse, but this wasn't verified.

**Recommendation**: Test at 375px and 768px widths. Ensure tables don't overflow, heading sizes remain readable, and the 3-column card grid collapses to single column.

---

## Final Score

| Criterion | Rating |
|---|---|
| Surface archetype fit | ✅ Correct |
| Information architecture | ⭐ Excellent |
| Typography hierarchy | ⭐ Excellent |
| Color system | ✅ Good (minor accent drift) |
| Spacing & rhythm | ⭐ Excellent |
| Component consistency | ✅ Good |
| Token system adherence | ⚠️ Needs alignment |
| Slop diagnostic | **2/10** (passes ≤2 threshold) |

**Overall**: This is a well-designed, professionally executed report. The design serves the content rather than competing with it. The issues are minor and concentrated in token hygiene (using semantic tokens vs. inline utilities) and accent color consistency. The page passes the slop diagnostic cleanly — no lazy AI design patterns, no decoration for decoration's sake, no wrong-surface mistake.

---

## Next Steps

1. **Align report CSS with `tokens.css` semantic classes** — this is the single highest-impact improvement for long-term maintainability.
2. **Pick one accent color** (purple) and derive link/info colors from it.
3. **Add a table of contents** for navigation in long reports.
4. **Test responsive breakpoints** at 375px and 768px.
5. **Consider a donut/progress ring** on the score badge for at-a-glance comprehension.
