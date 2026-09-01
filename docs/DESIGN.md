# Nuave design guide

> Status: **Canonical current UI/design authority**
> Updated: 2026-09-01

This guide governs Nuave's presentation layer. Product, audit, voice, privacy,
and journey contracts remain governed by their canonical documents in
[`docs/INDEX.md`](./INDEX.md). This document does not change those contracts.

## Approved stack

- **shadcn/ui** provides generic reusable components.
- **Base UI** provides the behavioral and accessibility foundation underneath
  shadcn components.
- **Tailwind CSS v4** provides styling, layout, responsive behavior, and the
  token bridge.
- **BeUI** provides higher-order visual character, AI UI, progressive
  disclosure, and meaningful interaction patterns. Search its registry before
  building a custom animated, AI, or disclosure component.
- **Motion** may be added only when a selected BeUI interaction genuinely needs
  an animation engine. It is not a foundation dependency.
- **Tabler Icons** is the canonical generic icon library.

The initial visual baseline is **BeUI light**: a light canvas, clear ink
hierarchy, quiet hairlines, restrained radii and shadows, and a focused action
accent. The historical Nuave purple skin is not an aesthetic constraint.

## Composition and ownership

Use the smallest approved component that fits the job:

```text
Base UI → shadcn → Nuave product components
                         ↑
                 BeUI interactions
```

- `src/components/ui/` contains generic shadcn/Base UI primitives only.
- `src/components/agents/` contains borrowed or composed BeUI AI-oriented
  components.
- `src/components/motion/` contains reusable low-level motion only when a
  retained interaction needs it.
- `src/components/product/` contains Nuave-specific semantic composition.
- Existing feature-local components do not need to move solely to satisfy this
  tree. New and migrated components should use these boundaries where useful.

Product components compose approved generic primitives; product meaning must
not leak into `ui/`. Do not recreate a generic button, field, dialog,
disclosure, sheet, or progress primitive when an approved component can serve
it. Record the source/name of borrowed BeUI components in the implementation
verification record so their provenance stays reviewable.

## Tokens, typography, and icons

`src/styles/tokens.css` is the single owner of global design values: canvas and
surface colors, ink and muted text, borders, radii, spacing, shadows, type
scale, focus, semantic status colors, and motion values. `src/app/globals.css`
is the application adapter and Tailwind/shadcn bridge; do not create a second
`theme.css` or duplicate semantic ownership. Components consume semantic tokens,
not ad hoc raw values.

### Typography families

`src/app/fonts.ts` is the only font-loading owner.

- **Geist Sans** is the canonical interface and marketing font.
- **Geist Mono** is the canonical technical/code font.
- A system serif stack is allowed only inside bounded report-display surfaces
  such as the report cover name, editorial section headings, and result metrics.

Do not add per-component font loaders, introduce Inter or another UI font, or
use the report serif as a second application-wide type system.

### Canonical scale

The only general text sizes are:

| Token | Size |
| --- | ---: |
| `--type-size-xs` | 12px |
| `--type-size-sm` | 14px |
| `--type-size-base` | 16px |
| `--type-size-lg` | 18px |
| `--type-size-xl` | 20px |
| `--type-size-2xl` | 24px |
| `--type-size-3xl` | 32px |
| `--type-size-4xl` | 48px |
| `--type-size-5xl` | 64px |

Tailwind's standard `text-*` utilities map to these same values. Do not create a
parallel mathematical scale or arbitrary one-off sizes for normal UI copy.

### Semantic roles

Prefer semantic role classes for product and marketing copy:

- `type-display` — major hero/display text; the only strongly fluid role.
- `type-heading-xl` — expressive section/page heading; fluid 32–48px.
- `type-heading-lg` — 32px heading.
- `type-heading-md` — 24px heading.
- `type-heading-sm` — 20px heading.
- `type-copy-lg` — 18px intro/emphasized copy.
- `type-copy` — 16px default reading copy.
- `type-copy-sm` — 14px supporting copy.
- `type-label` — 14px labels and controls.
- `type-label-sm` — 12px metadata and compact labels.
- `type-mono` — 14px technical/code text.
- `type-mono-sm` — 12px compact technical identifiers.

Each role owns font family, size, weight, line-height, and tracking. Color is a
separate semantic concern. Do not mix a role with competing local font-size,
font-weight, line-height, tracking, or font-family declarations.

Native `h1`–`h6` elements provide semantics only. They intentionally do not
impose visual sizes. Choose visual hierarchy explicitly with a semantic role or,
where attaching a global class is impractical, the corresponding canonical
`--type-*` tokens.

### Responsive typography

Keep responsive behavior intentional and scarce:

- `type-display` uses `clamp()` for large display moments.
- `type-heading-xl` uses `clamp()` for expressive section headings.
- normal copy, labels, controls, and ordinary headings stay stable across
  breakpoints;
- do not create page-specific mobile/desktop typography systems.

### Report exception

Report display typography is a bounded editorial exception. Its serif display,
heading, title, and metric values live in `tokens.css` and may only be used
inside the report subtree. Report body copy, labels, controls, metadata, and
technical identifiers still use the core Geist roles.

### Drift guard

`npm run check:typography` rejects legacy perfect-fourth tokens, Inter, the old
text-color/font-size collision, arbitrary Tailwind typography, non-canonical
650 weights, and raw CSS font sizes outside the canonical owner. It runs as
part of `npm run check` and therefore `npm run verify`.

Use Tabler for generic interface icons. A different icon is allowed only for a
specific non-generic product asset or a documented compatibility reason. Do not
add Lucide or another general-purpose icon library.

## Motion and accessibility

Motion communicates a meaningful state transition, progressive disclosure, AI
activity, or visual character; it is not ambient decoration. Prefer named
`fast`, `base`, and `slow` durations with one ease-out curve. Do not use
decorative perpetual loops, cursor glows, marquees, drifting gradients, or
animated filler. Indeterminate activity indicators may loop only while genuine
work is in progress. Reduced-motion mode must remove unnecessary spatial motion
while preserving the state and information. Do not retain global Lenis scrolling
unless a concrete customer experience justifies it here.

All migrated interactions preserve keyboard operation, visible focus, Escape
and focus-return behavior where applicable, status announcements, responsive
layout, and approximately 44px touch targets. Presentation refactors must not
change provider-call gates, audit/report semantics, validation, persistence,
or handoff contracts.

## Prohibited competing stacks

Do not introduce or retain a second generic UI, primitive, motion, icon, or
font system. In particular, do not add new HeroUI components, bespoke generic
primitive layers, Lucide icons, or global Lenis scrolling. HeroUI may remain
only temporarily while an active feature slice is being migrated; it is removed
once the repository-wide active-code search proves there are no consumers.

## Design judgment

These are reusable presentation judgments. They do not define product meaning,
behavior, or copy; those remain owned by the contracts listed in
[`docs/INDEX.md`](./INDEX.md).

### Avoid card soup

Do not give every concept its own card, bordered panel, or raised surface.
Establish hierarchy first through layout, spacing, typography, alignment, and
grouping. Use a container when it communicates a meaningful boundary, state, or
interaction, not merely because content exists.

### Visual prominence follows product importance

Visual hierarchy should reflect what matters most to the customer's current
task. Implementation complexity, data volume, backend importance, or
engineering effort must not determine visual prominence.

### Mobile is an intentionally composed state

Treat mobile as a deliberate composition, not a desktop layout that has merely
become narrower or vertically stacked. Decide information order, what is
visible first, density, grouping, primary-action placement, touch-target
usability, and progressive disclosure on purpose. Typography stays governed by
the responsive-typography rules above; this principle does not authorize
page-specific mobile typography systems.

## Where recurring design knowledge belongs

When a recurring design failure is observed, first check whether an existing
canonical Nuave document already owns the decision. If none does:

- judgment that requires interpretation belongs in this guide;
- repeatable presentation mechanics belong in tokens, components, or shared
  styles;
- objectively detectable violations belong in deterministic checks;
- an isolated failure does not become a global rule without evidence that it
  recurs.

This keeps this guide from accumulating one-off preferences while still letting
repeated failures improve the system.
