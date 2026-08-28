# Nuave design guide

> Status: **Canonical current UI/design authority**
> Updated: 2026-08-28

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

`src/app/fonts.ts` is the only font-loading owner. Geist is the default product
UI font. A system serif stack may be used only for report display surfaces
such as the cover business name or display result. Do not add per-component
font loaders or retain unused webfonts.

Use Tabler for generic interface icons. A different icon is allowed only for a
specific non-generic product asset or a documented compatibility reason. Do not
add Lucide or another general-purpose icon library.

## Motion and accessibility

Motion communicates a meaningful state transition, progressive disclosure, AI
activity, or visual character; it is not ambient decoration. Prefer named
`fast`, `base`, and `slow` durations with one ease-out curve. No perpetual
loops, cursor glows, marquees, drifting gradients, or animated filler. Every
motion path has a `prefers-reduced-motion` fallback that preserves the state
and information. Do not retain global Lenis scrolling unless a concrete
customer experience justifies it here.

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
