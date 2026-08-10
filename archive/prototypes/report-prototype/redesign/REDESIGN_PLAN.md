# Nuave AI Visibility Report — Redesign Plan

**For:** the agent implementing the redesign
**Target file:** `report-prototype/navy-cover-report-v2.html` (and the React equivalent in `src/AppId.tsx` / `src/AppEn.tsx` if that path is kept)
**Read with:** `DESIGN_GUIDE.md` (the rules) and `design-reference.html` (the rendered target)

Read all three before writing code. The guide is the law. The reference file is what "done" looks like.

---

## 1. What is actually wrong

This was measured on the current `navy-cover-report-v2.html`, rendered at 1280px wide. Total page height 10,061px.

**31 bordered white boxes sit on a white page.** Counted: 14 `.callout`, 6 `.action-card`, 4 `.ai-response`, 3 `.summary-card`, 2 `.comparison-card`, 2 `.scorecard-panel`. Twenty of them use the identical shape — white fill, 1px `#e5edf5` border, 8px radius, soft shadow, coloured 3px left rail.

That is the whole problem. Everything else follows from it.

### Why it reads as AI-generated

**The border does no work.** A 1px `#e5edf5` border around a white box on a white page separates white from white. It adds a line and communicates nothing. It is decoration standing in for structure.

**One shape carries every meaning.** A finding, a warning, a piece of evidence, a recommended action and a comparison are five different kinds of content. All five are drawn as the same rounded bordered box. The reader gets no signal about what kind of thing they are looking at, so the page reads as undifferentiated — which is exactly the texture of machine-generated layout.

**Four emphasis mechanisms fire at once.** A single callout carries a coloured left rail *and* a coloured icon *and* a filled pill *and* bold coloured text. Each was presumably added to make the point land. Together they cancel out. Nothing is emphasised when everything is.

**Vertical rhythm is flat.** The gap between two paragraphs and the gap between two major sections are close to the same. Hierarchy is therefore carried entirely by box colour, which is why removing the boxes felt impossible.

**One column width for 10,000px.** Prose, tables, three-up rows and evidence all sit in the same ~770px column. There is no change of pace anywhere in the document.

**Alignment defects.** The three-up summary row has ragged bottoms because the middle headline wraps to two lines and nothing aligns them. In the comparison cards the label and value collide with no gutter — the rendered output literally reads `Lead scholarTan Sri Dr Mohd Daud Bakar`.

**Type is doing nothing.** Source Sans 3 at weight 300 and 40px is thin and generic at display size. Lora italic is a third family used for pull-quotes that already sit inside a coloured box — double emphasis for one job.

### The correct read of the Stripe reference

The previous agent copied Stripe's *card component* and applied it to editorial content. Stripe does not do that. In Stripe's long-form and documentation pages the structure is carried by full-bleed background bands, a strict type scale and large vertical intervals. Boxes appear only where content is genuinely detached from the reading flow — a pricing table, a code sample, a nav popover. Prose is never boxed.

So the instruction "follow Stripe" was right and the execution inverted it.

---

## 2. The one idea

> **Space, rules and type organise the page. Containers do not.**
> Exactly one element type in the whole report gets a container: the verbatim AI response, because it is a machine transcript and genuinely foreign to the document's voice. Everything else loses its box.

Three decisions were confirmed with the founder and are **not open for reinterpretation**:

1. **Ruthless box removal.** One container type only.
2. **Editorial personality.** Serif display headings (Instrument Serif) + Inter for everything else. This should read like a paid advisory document, not a SaaS dashboard.
3. **Navy cover stays, simplified.** Kill the gradient on the metric numbers, kill the radial glow blob, keep the navy and the purple button.

---

## 3. Component mapping — old to new

Work through this table. Every row is a deletion followed by a replacement. Do not keep both.

| # | Current | Replace with | Boxes after |
|---|---------|--------------|-------------|
| 1 | `.summary-card` ×3 (bordered cards, coloured rails, icon tiles) | `.findings` — three plain columns, 72px gutter, status dot + label, 22px headline, 16px body. No border, no fill, no icon. | 0 |
| 2 | `.callout` ×14 (bordered, filled, left-railed) | `.note` — 1px top hairline across the text column, label line, body. No fill, no border, no rail, no radius. | 0 |
| 3 | `.ai-response` ×4 | `.evidence` — **the only container.** `#f4f6fa` fill, 10px radius, no border, no shadow. Label sits above and outside it. | 1 type |
| 4 | `.action-card` ×6 | `.actions` list — numeral in a 56px left gutter set in Instrument Serif at `--ink-4`, 1px top hairline per row, 40px vertical padding. | 0 |
| 5 | `.comparison-card` ×2 (two side-by-side cards faking a table) | One real `<table>`, hairline row rules, no outer border. Fixes the label/value collision. | 0 |
| 6 | `.scorecard-panel` ×2 | The bare `<table>` — delete the wrapper. | 0 |
| 7 | `.pill-*` ×13 (filled status pills) | `.status` — a 6px dot plus a word in the status colour. No fill, no radius, no border. | 0 |
| 8 | `.cost-badge` ×7 (filled FREE / BUDGET pills) | `.cost` — small caps, letterspaced, coloured text on the headline baseline. | 0 |
| 9 | Boxed pull-quote with left rail | `.pull` — 28px Instrument Serif italic, `--ink-1`, no container at all. | 0 |
| 10 | Cover gradient numerals + radial glow | Flat white numerals in Instrument Serif, glow removed. | — |

**31 containers become 1 container type.**

---

## 4. Execution order

Do these in sequence. Each step has a check that must pass before moving on.

**Step 1 — Replace the token block.**
Delete the entire `:root{}` from the current file. Paste the token block from `DESIGN_GUIDE.md` §1. Swap the Google Fonts link to Instrument Serif + Inter.
*Check:* no hex value appears anywhere outside `:root`.

**Step 2 — Set the two-tier grid.**
Introduce `--w-text: 680px` and `--w-wide: 960px`. Prose, notes, evidence and actions use `--w-text`. Tables, the findings row and the cover use `--w-wide`.
*Check:* every content block is on one of the two widths. No third width exists.

**Step 3 — Set the rhythm.**
Sections get `padding: 104px 32px`. Bands alternate. Nothing inside a section may use a vertical gap larger than 56px.
*Check:* the largest intra-section gap is under half the inter-section gap. See the ratio law in the guide §3.

**Step 4 — Delete the boxes.**
Work down the mapping table in order 1→10. Delete the old CSS rule before writing the new one, so nothing orphaned survives.
*Check:* `border:` and `box-shadow` appear in the stylesheet zero times outside `.evidence`, `.note`, table rules and the cover.

**Step 5 — Fix the copy that the layout depends on.**
Three headlines in the findings row must fit one line each. **Hard limit: 26 characters.** Rewrite them if they don't fit; the current middle one ("But not recommendable") wraps and breaks the row's alignment. Same for action titles — one line at 680px.
*Check:* no headline in a multi-column row wraps at 1280px.

**Step 6 — Simplify the cover.**
Remove `--grad-metrics` and the `.cover-glow` element. Numerals become Instrument Serif 52px in white. Keep the navy `#0d1738`, keep the purple CTA.
*Check:* no gradient text remains.

**Step 7 — Audit.**
Run the console script in `DESIGN_GUIDE.md` §9. It counts violations. Every count must be zero except the allowed ones.

---

## 5. Acceptance checklist

Countable, so there is no argument about whether it's done.

- [ ] Bordered or shadowed containers in the body: **exactly one class** (`.evidence`)
- [ ] Coloured left rails (`border-left` ≥2px): **0**
- [ ] Filled pills (background + border-radius on an inline label): **0**
- [ ] Distinct content column widths: **2**
- [ ] Type families loaded: **2** (Instrument Serif, Inter)
- [ ] Font weights in use: **≤4** (serif 400/400italic, Inter 400/500/600)
- [ ] Border-radius values in the stylesheet: **≤2**
- [ ] Box-shadow declarations in the body: **0**
- [ ] Hex colours outside `:root`: **0**
- [ ] Headlines wrapping inside a multi-column row at 1280px: **0**
- [ ] Full-bleed bands: **3–4**, alternating, never two in a row
- [ ] Every table cell has ≥32px gutter between label and value

**Expect the page to get taller.** Roughly 10,000px becomes roughly 12,000px. That is correct. Do not claw the space back by shrinking gaps — the space is the design.

---

## 6. Do not do these

- Do not add an icon to make a section feel finished. There are no decorative icons in this system.
- Do not reintroduce a border "just to define the edge." If an element needs an edge to be legible, it needs more space instead.
- Do not use colour to encode importance in body content. Colour encodes **status** only (good / watch / gap) and appears as a dot plus a word.
- Do not centre body text or headings. Everything is left-aligned to the column.
- Do not add a third font, a third column width, or a gradient anywhere in the body.
- Do not animate on scroll.
- Do not compensate for the removed boxes with dividers. One hairline per note, one per table row. That is the budget.

---

## 7. Open items for the founder

Flag these; don't decide them silently.

1. **Language.** The reference specimen is written in Indonesian, which matches the locked product decision that all customer-facing surfaces are Indonesian. The current v2 prototype is in English against a Malaysian sample business. If this prototype stays the English demo, keep the system and swap the copy — nothing in the design depends on the language.
2. **Instrument Serif has one weight (400).** That is deliberate and sufficient for display use. If a heavier display weight is ever needed, switch the display family to Fraunces (variable, `SOFT` and `WONK` axes at 0) and change nothing else.
3. **PDF export.** The report has a "Download PDF" CTA. This system prints better than the current one — bands become light grey blocks, hairlines survive, no shadows to flatten. But nobody has tested the print path. Worth one pass.
