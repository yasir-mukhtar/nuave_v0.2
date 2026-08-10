# Nuave design direction

This document records the current visual direction for Nuave v0.2, with the
local `/audit` workflow and its client-facing report as the primary surface.
It describes the design that is already present so future iterations can be
judged against one consistent baseline.

## Product feeling

Nuave should feel like a careful analyst's working document: calm, credible,
specific, and easy to verify. The interface should help a marketer move through
a consequential audit without making the product feel more certain or more
automated than it is.

The desired character is:

- evidence-first, not promotional;
- editorial and precise, not dashboard-like;
- quiet enough for long-form reading, with obvious actions when needed;
- professional enough to hand to a client without looking generic or clinical;
- recognizably Nuave through disciplined typography and a restrained purple
  accent, not through decoration.

## Surface model

`/audit` contains two related experiences:

1. The five-step workspace helps the operator collect, verify, review, run, and
   inspect an audit.
2. The final report is a client-facing document that must work equally well on
   screen and as an A4 PDF.

The workspace may expose process and system status. The report should remove
operational noise and foreground scope, evidence, findings, priorities, and
limitations.

## Visual language

### Color

- Use white as the primary page and document background.
- Use very light neutral surfaces to group related content without turning
  every section into a floating card.
- Use near-black for headings, dark gray for body copy, and muted gray for
  metadata or explanatory text.
- Use Nuave purple (`#533afd`) for the active step, primary action, links, and
  small moments of brand recognition. It should not flood large surfaces.
- Reserve green, amber, and red for evidence-backed status or interface
  feedback. Color must never be the only status signal.
- Avoid gradients, decorative glows, glass effects beyond the subtle sticky
  header treatment, and arbitrary accent colors.

The shared source of truth is `src/styles/tokens.css`. Route-specific code may
use HeroUI semantic variables, but new colors should map back to the shared
palette instead of introducing near-duplicates.

### Typography

- Geist is the heading and brand typeface. Use it for page titles, report
  headings, and compact section labels.
- Inter is the body and interface typeface. Use it for fields, descriptions,
  findings, tables, and metadata.
- Use the type scale and semantic utilities defined in `src/styles/tokens.css`
  and `src/app/globals.css`; do not add one-off font sizes when an existing
  level fits.
- Headings should be compact and confident, with slightly tight tracking.
  Body copy should remain comfortable for evidence-heavy reading.
- Use monospace only for machine identifiers or other literal system values.

### Shape, border, and depth

- Prefer 1px neutral borders and modest corner radii over heavy shadows.
- Use one enclosing surface for a coherent section. Avoid stacks of nested
  cards when spacing or a divider communicates the hierarchy.
- Buttons and inputs should keep the compact existing radius. Pills are for
  short status, category, or scope labels—not general containers.
- Shadows should be subtle and functional: sticky actions, dialogs, or a
  raised header. The report itself should read as a document, not a card wall.

### Spacing and density

- Use the existing 4/8/16/24/32/48/64 spacing family.
- Give stage introductions and report sections generous vertical separation.
- Keep controls compact enough for an operational workflow, while giving
  findings and explanations enough room to scan without crowding.
- Align repeated metadata, counts, and definitions to a consistent grid.

## `/audit` workspace

- Keep the five stages visible and name them in plain language. Completed,
  current, and future stages must remain distinguishable without relying only
  on color.
- Each stage begins with one clear title and a short explanation of what the
  operator must decide or verify.
- Place the primary action at the end of the material it acts on. Sticky action
  bars are appropriate only when the relevant page is long.
- Put safety, evidence, and limitation copy close to the action it qualifies.
  Do not hide consequential caveats in tooltips.
- Show running, completed, interrupted, and failed states in place so the
  operator understands what was retained and what must be retried.
- Prefer progressive disclosure for raw evidence and long details, but keep the
  decision-driving summary visible.

## Report composition

The report should feel like an authored audit rather than an application
dashboard.

- Start with identity and scope: audited brand, market, date, tested system,
  question count, and preparing agency.
- Establish the main result before supporting counts. Counts describe the ten
  observations; they are not a composite score or ranking.
- Separate the report into a stable reading order: summary, key findings,
  priorities, detailed evidence, then method and limitations.
- Pair each conclusion or recommendation with its evidence basis. Prompt IDs,
  sources, excerpts, and observation times should be easy to locate but
  visually subordinate to the finding.
- Use direct, neutral language. Avoid gauges, celebratory charts, urgency
  styling, or visual cues that imply a guarantee.
- Keep agency branding optional and restrained. It should identify who prepared
  the report without overpowering the audited business.

## Responsive and print behavior

- Design desktop-first for evidence review, then collapse grids to a single
  readable column on narrow screens without changing the information order.
- Keep horizontal scrolling limited to controls that cannot sensibly wrap,
  such as the stage indicator.
- Touch targets must remain comfortable even when the surrounding interface is
  visually compact.
- The A4 version is a first-class output. Hide workspace controls, remove
  screen-only effects, expand all detailed findings, preserve source text, and
  avoid breaking a finding or priority across pages when practical.
- Do not depend on background color for meaning because printed output may be
  grayscale or omit backgrounds.

## Accessibility and interaction

- Preserve semantic headings, labels, fieldsets, lists, definitions, links,
  alerts, and disclosure controls.
- Maintain a visible focus state and logical keyboard order.
- Use descriptive action labels such as “Analisis website” or “Cetak / simpan
  PDF”; avoid vague labels such as “Continue” when the consequence can be named.
- Never communicate state through color alone. Pair it with text, icons, or
  structure.
- Motion should clarify a state change and respect reduced-motion preferences.
  Do not add animation to the report content itself.

## Reuse before invention

For future `/audit` iterations, prefer the existing HeroUI components, Tabler
icons, shared tokens, type utilities, and route-scoped CSS module. Add a new
pattern only when the current components cannot communicate the required
hierarchy, evidence, or action clearly.

The current implementation lives in:

- `src/app/audit/AuditWorkflow.tsx`
- `src/app/audit/AuditStages.tsx`
- `src/app/audit/ReportView.tsx`
- `src/app/audit/audit.module.css`
- `src/styles/tokens.css`
- `src/app/globals.css`
