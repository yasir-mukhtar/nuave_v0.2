# Nuave visual style — Refero Apple reference

Status: **experimental adoption candidate**

Source:

- https://styles.refero.design/style/c9cabb96-32fa-4896-837a-f2497ce1c856
- Reference: **Apple (España)**

This document records the visual language being tried on the
`style/refero-apple-foundations` branch. It does not replace Nuave product
behavior, accessibility requirements, or the existing UI technology stack.

## Visual principle

Use a quiet, near-monochrome interface with generous whitespace and strong
headline typography. Let Nuave's product content and the interactive landing
hero carry visual interest instead of adding decorative UI chrome.

The defining system is:

- primary ink: `#1d1d1f`;
- secondary text: `#707070`;
- medium-emphasis text/icons: `#474747`;
- paper: `#ffffff`;
- alternating canvas: `#f5f5f7`;
- hover wash: `#e8e8ed`;
- elevated/frosted surface: `#fafafc`;
- hairline: `#d6d6d6`, used sparingly;
- filled action: `#0071e3`;
- text link: `#0066cc`;
- feature-card radius: `28px`;
- action geometry: pill/full radius;
- card shadows: none;
- section rhythm: alternating white/gray surfaces instead of divider lines.

The canonical source values live in `src/styles/tokens.css` as `--ref-*`
variables. Nuave semantic tokens map onto them rather than duplicating colors
throughout components.

## Typography

Refero specifies SF Pro Display/Text. Nuave uses **Geist** as the practical,
cross-platform implementation substitute; do not add or redistribute Apple
font files.

Marketing surfaces should follow the reference scale closely:

| Role | Size | Line height | Weight | Tracking |
| --- | ---: | ---: | ---: | ---: |
| Body small | 17px | 25px | 400 | -0.374px |
| Body | 21px | 29px | 600 where used as a title | +0.231px |
| Body large | 28px | 32px | 600 | +0.196px |
| Heading small | 40px | 48px | 600 | normal |
| Heading | 56px | 60px | 700 | -0.28px |
| Heading large | 80px | 84px | 700 | -1.2px |
| Display | 96px | 100px | 600-700 | -1.44px |

Use `font-feature-settings: "numr" 1` on numeric-heavy marketing content when
practical.

## Layout and shape

Reference defaults:

- base spacing unit: `4px`;
- content max width: about `1200px`;
- section vertical rhythm: `100-120px`;
- card padding: about `28-40px`;
- local element gap: usually `8-10px`;
- card and showcase radius: `28px`;
- interactive elements: never visually sharper than about `10px`;
- primary/secondary action buttons: pill shaped.

## Component rules

### Primary actions

Use Electric Blue (`#0071e3`) with white text and pill geometry. Blue is an
action signal, not decorative color.

### Text links

Use Link Blue (`#0066cc`) with no filled container. Underline on hover is fine.

### Cards

Use white on gray canvas, or gray on white canvas. Prefer no border and no
shadow. Hierarchy should come from surface contrast, radius, whitespace, and
type.

### Sections

Do not add divider lines merely to separate marketing sections. Alternate
`#ffffff` and `#f5f5f7` instead.

### Navigation

Keep navigation visually quiet. After scroll, use a subtle `#fafafc`/frosted
surface rather than a heavily bordered or elevated container.

## Nuave-specific adaptations

These are intentional differences from the source reference.

1. **Interactive blue landing hero stays.** It is a Nuave product/brand moment
   and an interaction surface, not a generic decorative card. Do not remove it
   merely to make the page more Apple-like.
2. **Dense audit/report workflows keep compact type.** The full 17-96px Refero
   marketing scale would reduce information density in task-oriented screens.
   Shared colors, surfaces, radii, and action styling still apply there.
3. **Semantic status colors stay.** Success, warning, and error states keep
   green/amber/red because they communicate audit state, validation, and safety.
4. **Accessibility overrides visual imitation.** Keep 44px mobile targets,
   visible focus, reduced-motion behavior, and sufficient contrast.
5. **BeUI remains an interaction source.** Use BeUI for motion, AI activity, and
   progressive disclosure where appropriate, but style the resulting surface to
   this document.
6. **Tabler remains the icon set.** Do not introduce SF Symbols as a second icon
   dependency.

## Agent decision rule

When building or restyling Nuave UI:

1. Start with the existing shadcn/Base UI primitive.
2. Use `src/styles/tokens.css`; do not hard-code a parallel palette unless a
   bounded visual experiment requires it.
3. For marketing surfaces, prefer the Refero geometry and typography here.
4. For task-heavy product screens, preserve usable density while keeping the
   same palette, flat surfaces, and rounded interaction language.
5. Use BeUI for interaction/motion patterns, not as the default visual palette.
6. If a product requirement conflicts with this visual reference, preserve the
   product requirement and record the intentional exception.
