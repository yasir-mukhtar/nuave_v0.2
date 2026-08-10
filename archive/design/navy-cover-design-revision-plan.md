# Navy Cover + Dark Section Design Revision Plan — Nuave AI Visibility Report

**Date**: 2026-08-06
**Revision**: 2 (supersedes the pure-light Stripe pass from `docs/stripe-design-revision-plan.md`)
**References**: two user-supplied images —
  1. Ribbon ornament: `~/Downloads/ChatGPT Image Aug 6, 2026, 09_52_16 PM.png` (1536×1024, transparent RGBA)
  2. Navy section: `~/Library/Application Support/Hermes/composer-images/composer_2026-08-06_15-04-39-216_4c8bb3.png` (2880×1382, Stripe-style dark section)
**Surface**: Decide / Learn (unchanged — a report that teaches and persuades)
**Goal**: Add a navy cover page to the Nuave report, using the ribbon as the cover ornament and the navy `#0d1738` treatment modeled on the attached Stripe section. Preserve all content, information hierarchy, and the Stripe-revision-1 typography system; methodology stays light.

---

## 1. What We're Keeping (from revision 1 + critique)

- 10-section information architecture, all copy, tables, status vocabulary (appeared / mentioned / recommended / cited / not observed / failed / insufficient evidence)
- Typography: **Source Sans 3** (weight 300 headlines, 400 body) + **Lora** italic for editorial blockquotes
- Stripe discipline: tight 4–6px radii, blue-tinted shadows on white cards, `#533afd` purple as the only CTA accent, status colors via text + border + badge (never color alone)
- EN/ID toggle behavior and all report data
- The existing `report-prototype/stripe-report.html` is **not** replaced — this revision is a new file

## 2. Reference Analysis (measured, not guessed)

### 2.1 Ribbon ornament (`ChatGPT Image…`)
- **The PNG has a transparent background** (RGBA), not white. It can be placed on white *or* navy. (Verified by reading the PNG color type; the white in the chat preview is just the canvas.)
- Measured gradient stops along the ribbon, top-left → bottom-right:

| Stop | Hex | Position on image |
|---|---|---|
| Pale sky blue | `#a7e8f8` / `#a4bbfe` | top-left end |
| Violet | `#ac8dfb` | upper curve |
| Light magenta | `#dc8df7` | mid curve |
| Fuchsia pink | `#fc86da` | lower curve |
| Rose | `#fe799f` / `#ff5378` | lower curve |
| Orange | `#ff932f` | bottom-right |
| Golden orange / pale gold | `#ffb217` / `#feca67` | bottom-right end |

### 2.2 Navy section (`composer_2026-08-06…`)
| Element | Measured value | Note |
|---|---|---|
| Background navy | `#0d1738` | dominant color, ~90% of dark pixels |
| White text | `#fafafa` | |
| Wave gradient | `#f3a79d` (peach) → `#5e31a6` (deep violet) → `#8a37be` (purple) → magenta `#aa5c96` | thin parallel lines |
| Metric-number gradient | `#f2a9a0` (peach) → `#b551e6` (bright purple) | "500M+" style numbers |
| Button | navy fill ≈ `#121a3f`, thin light border, white text | "Chat now" pattern |
| Edge hairlines | thin light-blue lines at top/bottom of the section | ≈ 1px, low-opacity |

### 2.3 The shared color story
Both images belong to **one spectral family**: sky blue → violet → fuchsia → rose → warm gold.
The plan uses this as a single accent language — the ribbon is the full spectrum; the cover's metric numbers reuse the same family. **One gradient family, two sanctioned moments** (cover ornament, metric numbers).

## 3. The Composition (one line)

**A navy cover page with the ribbon ornament → the Stripe-revised body → light methodology section.**

The cover is the report's **one dark section**, modeled on the attached Stripe section: deep navy `#0d1738`, headline + scope + spectral metric strip + one primary action, with the ribbon as the hero ornament. The methodology section stays light (revision-1 treatment) with the evidence-flow diagram on white. This satisfies the `nuave-stripe-report-design` rule of **at most one dark section per page** — the cover owns the dark; the body and methodology remain in the "careful analyst's working document" register.

**Decided 2026-08-06 (founder):** navy cover + light methodology.

## 4. Cover Page Spec (navy — the report's one dark section)

Full-viewport first screen, navy `#0d1738` background, Stripe hero composition:

```
┌────────────────────────────────────────────────────────┐
│  NUAVE · AI VISIBILITY REPORT         (label, violet)  │
│                                                       │
│  Masryef                             [ribbon ╱╲     ] │
│  Jakarta · Food & beverage          ╱  glow  ╱      │
│  Bagaimana Masryef muncul         ╱       ╱         │
│  dalam rekomendasi AI             ╱        ╱        │
│  ── scope sentence ──             ╲        ╱        │
│  5 platform · 10 prompt · 40 observasi ╲   ╱        │
│  [Lihat prioritas utama] [Unduh]     ╲  ╱           │
│  12 Agu 2026 · v3 · Selesai           ╲╱            │
└────────────────────────────────────────────────────────┘
```

- **Background**: `#0d1738` (measured). Thin light hairlines at the very top and bottom edges of the cover (1px, `rgba(159,178,255,0.22)`) — the Stripe edge-line detail.
- **Ribbon**: decorative `<img>` (or background layer) anchored to the right edge, sweeping top-center → bottom-right corner, ~55–65% of cover width. On navy the ribbon reads as a luminous light trail — keep it at full strength with one soft radial glow behind it for depth. `aria-hidden="true"` — pure decoration. The left 2/3 of the cover stays clear for the text block (mirrors the source image's own composition).
- **Typography**: white `#fafafa` headlines at 300 weight; body/scope in `#a7b4d9` (on-navy secondary — verify AA ≈6.5:1 in build).
- **Content block** (left, max-width ≈ 560px):
  - Small uppercase label "NUAVE · AI VISIBILITY REPORT" (12px, letterspaced, violet `#7ba2fe` on navy)
  - Business name — Source Sans 3, 300, white, ~56px
  - Concise title: "Bagaimana [Nama Bisnis] muncul dalam rekomendasi AI"
  - One-sentence scope line (`#a7b4d9`)
  - **Metric strip** — real audit counts only: platforms tested · prompts used · observations. Large 300-weight numbers in the spectral gradient (peach `#f2a9a0` → bright purple `#b551e6` — the "500M+" treatment), small muted labels. Counts describe the audit; they are not a score.
  - Exactly one primary action: "Lihat prioritas utama" (purple `#533afd`, 4px radius, white text). One quiet secondary: "Unduh ringkasan report" (navy-raised fill `#121a3f`, 1px `rgba(255,255,255,0.28)` border — the Stripe "Chat now" pattern).
  - Metadata row (small, `#a7b4d9`): audit date · methodology version · report status.
- **No score on the cover.** No hype copy ("definitive ranking", "invisible", "losing customers" are banned).

## 5. Methodology Section Spec (light — unchanged from revision 1)

"Bagaimana hasil ini didapat" stays on white with the revision-1 treatment (Source Sans 3, navy `#061b31` headings, slate body, white cards with blue-tinted shadows). The evidence-flow diagram renders on light as fine-line nodes with violet/cyan highlights — no dark band.

**Process metrics** (platforms, prompts, observations, model) live on the cover's metric strip; the methodology section keeps its numbered method steps, real-vs-illustrative legend (Tabler icons + labels, no emoji), and the one-sentence "what we did NOT do". Limitation callouts use the existing light amber variant.

## 6. Design Token Deltas

Additions to the prototype's `:root` (later mirrored into `src/styles/tokens.css` only when the production port is approved):

```css
/* Navy cover (the page's one dark section) */
--navy-bg:      #0d1738;   /* measured */
--navy-raised:  #121a3f;   /* measured button fill */
--navy-line:    rgba(159,178,255,0.22);
--navy-text:    #fafafa;
--navy-body:    #a7b4d9;   /* verify AA on #0d1738 in build */

/* Spectral accent family (from the ribbon + wave) */
--spec-blue:    #7ba2fe;
--spec-violet:  #ac8dfb;
--spec-fuchsia: #fc86da;
--spec-rose:    #fe799f;
--spec-orange:  #ff932f;
--spec-gold:    #feca67;

/* Sanctioned gradients (used ONLY at the two moments) */
--grad-metrics: linear-gradient(90deg, #f2a9a0, #b551e6); /* metric numbers on cover */
```

**Do not** change: `--purple: #533afd`, status palette, radii, shadows, spacing, fonts.

## 7. Anti-Slop Constraints (audit gates for the build)

1. **Ribbon only on the cover** — one hero visual plane. Never repeated, never behind body text at full opacity.
2. **Navy only on the cover** — the cover is the page's one dark section; body and methodology stay light.
3. **Spectral gradients only at the two sanctioned moments** (cover ornament, metric numbers). No random purple gradients, no glassmorphism, no AI-orb, no Web3 look.
4. **Status colors remain semantic and text+icon paired** — dark-surface variants are tints, not new hues.
5. **No new fonts**, no new components where revision-1 components exist (EvidencePanel, RecommendationCard, StickyReportNav, LimitationCallout all carry over).
6. **Cover never claims a ranking** — identity, scope, and what was tested only.

## 8. Implementation Phases

| Phase | Work | Target file |
|---|---|---|
| 0 | Copy ribbon PNG into the prototype, optionally downscale to ~1200px wide WebP/PNG (2.2 MB source is heavy for a web page) | `report-prototype/public/ribbon-swoosh.png` |
| 1 | Add navy + spectral tokens to `:root` | `report-prototype/navy-cover-report.html` |
| 2 | Build the navy cover page (ribbon layer, hairlines, content block, spectral metric strip, actions, metadata) | same |
| 3 | Carry the revision-1 body + light methodology (exec summary → appendices) unchanged into the new file | same |
| 4 | Verify: `open_preview` + screenshots at 1440px and 375px; slop audit; WCAG spot-check; A4 print check (cover = page 1, navy prints with `print-color-adjust: exact`) | — |
| 5 | **After founder approval**: port cover into the React prototype (`report-prototype/src/report-ui.tsx`, `AppEn.tsx`, `AppId.tsx`), then optionally into the production report (`src/app/audit/ReportView.tsx` + `audit.module.css`, with tokens added to `src/styles/tokens.css`) | — |

## 9. Verification Checklist

- [ ] Slop score ≤ 2 (senior-ui-design 10-point diagnostic); tells 3/8/10 (compositional) must not fire
- [ ] Screenshots at ≥2 widths (1440px, 375px) — cover composes correctly on both
- [ ] White text on `#0d1738` and `#a7b4d9` on `#0d1738` pass WCAG AA (≈13:1 and ≈6.5:1 expected)
- [ ] Ribbon is decoration: `aria-hidden`, no essential text inside it
- [ ] Exactly one dark section (the cover); ribbon appears exactly once
- [ ] Metric strip uses real audit counts with plain-language labels
- [ ] Print: cover renders as page 1; navy keeps its background; nothing breaks mid-finding
- [ ] EN/ID copy rules intact; no inflated language on the cover

## 10. Risks

- **Cover becomes a poster.** Mitigation: editorial composition (left-aligned text block, tight metadata grid), the ribbon as one layer at controlled size, no hype copy, score banned.
- **Dark overreach on the cover.** Mitigation: the ribbon is the only ornament; the wave motif from the reference stays out of the report (the ribbon replaces it); gradients limited to the metric numbers.
- **Asset weight.** 2.2 MB PNG slows the page; Phase 0 includes optional downscale.

## 11. Decisions — Status

1. **Cover background**: **RESOLVED — navy cover + light methodology** (founder, 2026-08-06).
2. **Metric strip placement**: cover (primary — the Stripe reference shows metrics in the navy hero; scope counts belong with identity). Alternative: move to the methodology section.
3. **Port scope**: build the standalone prototype first (recommended, matches the revision-1 workflow), or go straight into the React prototype.

## 12. Next Action

On approval of decisions 2–3: execute Phase 0–4 and deliver `report-prototype/navy-cover-report.html` for side-by-side comparison against `stripe-report.html`.
