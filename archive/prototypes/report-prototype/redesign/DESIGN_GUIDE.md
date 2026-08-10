# Nuave AI Visibility Report — Design Guide

The rules. `REDESIGN_PLAN.md` says what to change; this says what to change it to. `design-reference.html` is the same system rendered — open it and match it.

**Personality:** an editorial advisory document. Something a real firm charges for. Not a SaaS dashboard, not a landing page.

---

## 0. The four laws

Everything below is an application of these. When a situation isn't covered, decide from these.

**Law 1 — The container law.**
Exactly one element type in the report has a background or a border: `.evidence`, the verbatim AI response. It earns a container because it is a machine transcript quoted inside a document written in a different voice. Nothing else gets one. If you are reaching for a box, you want space or a hairline instead.

**Law 2 — The rhythm law.**
Hierarchy comes from the size of the gap, not from a line or a fill. The largest gap *inside* a section must be less than half the gap *between* sections. Currently: 56px max inside, 208px between. If you add a bigger internal gap, the section stops reading as one thing.

**Law 3 — The colour law.**
Colour means status, and only status: good, watch, gap. It appears as a 6px dot plus a word. Never as a fill, never as a border, never as a rail. Ink, rules and surfaces are all neutral navy-greys. Purple is the accent and is reserved for interactive elements — buttons and links, nothing else.

**Law 4 — The two-width law.**
There are two content widths and no third. Prose and anything read as a sentence: 680px. Anything scanned as a grid — tables, the findings row, the cover: 960px. The alternation between them is what gives a long document pace.

---

## 1. Tokens

Copy this block verbatim. Nothing outside it may declare a hex value, a font size, or a space value.

```css
:root{
  /* ── Ink (all derived from the navy cover) ── */
  --ink-1:#0d1738;   /* headings, emphasis, table labels */
  --ink-2:#3d4a6b;   /* body text */
  --ink-3:#6b7794;   /* eyebrows, captions, table headers */
  --ink-4:#9aa4bd;   /* quiet display numerals */

  /* ── Surfaces ── */
  --paper:#ffffff;   /* page */
  --band:#f7f8fb;    /* full-bleed section band */
  --fill:#f4f6fa;    /* the ONLY box fill in the report */

  /* ── Rules ── */
  --rule:#e4e8f0;         /* hairlines: notes, table rows, action rows */
  --rule-strong:#ccd3e2;  /* table header underline only */

  /* ── Accent (interactive only) ── */
  --accent:#533afd;
  --accent-ink:#3a26c9;   /* purple that passes contrast as text */

  /* ── Status (text colour only — never a filled pill) ── */
  --good:#0f7a3d;
  --watch:#8a5a12;
  --gap:#b3261e;

  /* ── Widths ── */
  --w-text:680px;
  --w-wide:960px;

  /* ── Space: 8px base ── */
  --s-1:8px;  --s-2:16px; --s-3:24px; --s-4:32px;
  --s-5:40px; --s-6:56px; --s-7:72px; --s-8:96px;
}
```

Contrast: `--ink-2` on `--paper` is 8.2:1. `--ink-3` on `--paper` is 4.8:1 — fine for the 11px eyebrows because they are 600 weight and letterspaced. `--watch` on `--paper` is 5.4:1. All pass AA.

---

## 2. Type

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

Two families. Instrument Serif is display only — it never sets a sentence of body copy. Inter sets everything else, including all sub-headings.

| Role | Family | Size / line-height | Weight | Tracking | Colour |
|---|---|---|---|---|---|
| Cover H1 | Instrument Serif | 64 / 1.05 | 400 | −0.02em | `#fff` |
| Section H2 | Instrument Serif | 40 / 1.15 | 400 | −0.015em | `--ink-1` |
| Pull quote | Instrument Serif italic | 28 / 1.4 | 400 | −0.01em | `--ink-1` |
| Display numeral | Instrument Serif | 52 (cover) / 34 (action) | 400 | — | `#fff` / `--ink-4` |
| Sub-head H3 | Inter | 19 / 1.35 | 600 | −0.01em | `--ink-1` |
| Finding headline | Inter | 22 / 1.35 | 600 | −0.01em | `--ink-1` |
| Lead paragraph | Inter | 20 / 1.6 | 400 | — | `--ink-2` |
| Body | Inter | 17 / 1.7 | 400 | — | `--ink-2` |
| Secondary body | Inter | 16 / 1.6 | 400 | — | `--ink-2` |
| Table cell | Inter | 16 / 1.5 | 400 | — | `--ink-2` |
| Eyebrow / table header | Inter | 11 | 600 | 0.14em, uppercase | `--ink-3` |
| Status / cost label | Inter | 13 (11 in a row) | 600 | 0.01em (0.12em uppercase) | status colour |
| Caption | Inter | 14 / 1.5 | 400 | — | `--ink-3` |

Rules:

- `font-variant-numeric: tabular-nums` on `body`. Every number in this report is compared against another number.
- Never Inter below 500 for anything on a coloured or dark surface.
- Never more than four weights on the page: serif 400, serif 400 italic, Inter 400/500/600.
- `<em>` in body copy renders in Instrument Serif italic at `1.08em`. That is the only place the serif touches body text and it is why no third family is needed for quotes.
- Body measure never exceeds 680px ≈ 68 characters.

---

## 3. Rhythm

```css
.section{padding:104px var(--s-4)}   /* 104 top + 104 bottom = 208px between sections */
.band{background:var(--band)}
```

| Interval | Value |
|---|---|
| Between sections | 208px (104 + 104) |
| Section eyebrow → H2 | 16px |
| H2 → first content | 32px |
| Section intro → first component | 56px |
| Between paragraphs | 24px |
| Sub-head → its body | 16px |
| Between action rows | 40px + 1px hairline |
| Findings column gutter | 72px |
| Table row padding | 24px vertical |

**The ratio check:** largest internal gap 56, inter-section gap 208. 56 < 104. Passes. Any new internal gap must stay under 104px or the section fragments.

**Bands.** Full-bleed `--band`, used on 3–4 of ~9 sections, never two in a row. They mark a change of *mode* — evidence, recommendations, methodology — not merely a new section. Everything else sits on `--paper`.

---

## 4. Components

### 4.1 Findings row

Three columns. No card, no border, no fill, no icon. The gutter is the separator.

```css
.findings{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s-7);align-items:start}
.finding .status{margin-bottom:var(--s-2);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.finding h3{font-size:22px;margin-bottom:var(--s-1)}
.finding p{font-size:16px;line-height:1.6}
```

```html
<div class="findings">
  <div class="finding">
    <div class="status is-good">Ditemukan</div>
    <h3>AI tahu Anda ada</h3>
    <p>ChatGPT mengenali Masryef dan menyebut keahlian fintech Anda.</p>
  </div>
  <!-- ×3 -->
</div>
```

- Headline **≤26 characters** so it sets on one line. This is a copy constraint, not a CSS one — rewrite the copy, do not shrink the type.
- Body 2–4 lines. Ragged bottoms are fine and expected; ragged *headlines* are not.
- Exactly three columns. Never two, never four.
- Width: `--w-wide`.

### 4.2 Note — replaces every callout

A margin note, not a card. One hairline above it and a labelled first line.

```css
.note{border-top:1px solid var(--rule);padding-top:var(--s-3);
      margin-top:var(--s-6);max-width:var(--w-text)}
.note-head{display:flex;align-items:baseline;gap:var(--s-2);margin-bottom:var(--s-1)}
.note-head h3{margin-bottom:0}
.note p{font-size:16px}
```

```html
<div class="note">
  <div class="note-head">
    <span class="cost is-free">Gratis</span>
    <h3>Lakukan besok</h3>
  </div>
  <p>Samakan nomor telepon dan alamat kantor Anda di semua tempat. <strong>Ini tindakan termurah dengan dampak terbesar.</strong></p>
</div>
```

- **Maximum one note per section.** The current file has 14; the redesign should land near 6. If a section needs two notes, one of them is body copy.
- The label slot takes either a `.status` or a `.cost`, never both.
- Emphasis inside a note is `<strong>` only — that is `--ink-1` at 600. No colour, no highlight.

### 4.3 Evidence — the only container

```css
.evidence-label{font-size:11px;font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink-3);margin-bottom:var(--s-1)}
.evidence{background:var(--fill);border-radius:10px;padding:var(--s-3) var(--s-4);
  max-width:var(--w-text);margin-bottom:var(--s-5);
  font-size:16px;line-height:1.65;color:var(--ink-2)}
```

- Fill only. **No border, no shadow, no left rail.** A fill without a border is dramatically quieter than a fill with one, and the quietness is the point.
- The label sits *above and outside* the box. Nothing floats on the box edge.
- The prompt that produced the response is set as a small pull quote (22px Instrument Serif italic) directly above the label — the question is the document's voice, the answer is the machine's.

### 4.4 Action list

```css
.actions{max-width:var(--w-text);margin-top:var(--s-5)}
.action{display:grid;grid-template-columns:56px 1fr;gap:var(--s-3);
  border-top:1px solid var(--rule);padding:var(--s-5) 0}
.action-num{font-family:"Instrument Serif",Georgia,serif;font-size:34px;
  line-height:1;color:var(--ink-4);padding-top:2px}
.action-head{display:flex;align-items:baseline;gap:var(--s-2);
  margin-bottom:var(--s-1);flex-wrap:wrap}
.action-head h3{margin-bottom:0}
.action p{font-size:16px}
```

The numeral lives in the gutter, outside the text column, set large and quiet in the serif. It reads as an index rather than a badge. That single move is what turns six cards into a list.

- Title one line at 680px.
- The cost label follows the title on the same baseline, not before it.
- Body 2–3 sentences. If an action needs more, it is two actions.

### 4.5 Status and cost labels

```css
.status{display:inline-flex;align-items:center;gap:7px;
  font-size:13px;font-weight:600;letter-spacing:.01em;white-space:nowrap}
.status::before{content:"";width:6px;height:6px;border-radius:50%;
  background:currentColor;flex:none}
.status.is-good{color:var(--good)}
.status.is-watch{color:var(--watch)}
.status.is-gap{color:var(--gap)}

.cost{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.cost.is-free{color:var(--good)}
.cost.is-paid{color:var(--watch)}
```

Three status values only. If a fourth appears, the scale is wrong — fix the scale, not the palette.

### 4.6 Tables

Used for the scorecard and the competitor comparison. No outer border, no wrapper panel, no zebra striping.

```css
table{width:100%;border-collapse:collapse;max-width:var(--w-wide)}
th{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  color:var(--ink-3);text-align:left;padding:0 var(--s-4) var(--s-2) 0;
  border-bottom:1px solid var(--rule-strong)}
td{padding:var(--s-3) var(--s-4) var(--s-3) 0;border-bottom:1px solid var(--rule);
  vertical-align:top;font-size:16px}
tr td:first-child{color:var(--ink-1);font-weight:500;white-space:nowrap}
td:last-child,th:last-child{padding-right:0}
th.t-num,td.t-num{text-align:right}
.num{font-weight:600;color:var(--ink-1);font-variant-numeric:tabular-nums}
```

- The 32px right padding on every cell is what prevents the label/value collision in the current file. Do not remove it.
- Left-align everything. Right-align only columns explicitly marked `.t-num`.
- Comparison tables are one table with two value columns — never two cards side by side.

### 4.7 Pull quote

```css
.pull{font-family:"Instrument Serif",Georgia,serif;font-style:italic;
  font-size:28px;line-height:1.4;color:var(--ink-1);letter-spacing:-.01em;
  max-width:var(--w-text);margin:var(--s-6) 0}
```

No box, no rail, no quotation-mark graphic. Maximum two in the whole report — one in the summary, one in the closing. A third makes them worthless.

---

## 5. Cover

```css
.cover{background:var(--ink-1);color:#fff;padding:128px var(--s-4) var(--s-8)}
.cover .eyebrow{color:#8fa0d4}
.cover h1{color:#fff;margin:var(--s-3) 0 var(--s-2)}
.cover .sub{font-size:19px;color:#a7b4d9;max-width:560px;line-height:1.6}
.cover-meta{display:flex;gap:var(--s-8);margin-top:var(--s-7)}
.metric-num{font-family:"Instrument Serif",serif;font-size:52px;line-height:1;color:#fff}
.metric-label{font-size:11px;font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;color:#8fa0d4;margin-top:var(--s-1)}
.cover-rule{height:1px;background:rgba(159,178,255,.2);margin:var(--s-7) 0 var(--s-3)}
.cover-foot{display:flex;gap:var(--s-6);font-size:13px;color:#8fa0d4}
.cover-foot strong{color:#e8ecf8;font-weight:500}
```

Changes from the current cover:

- **Gradient numerals removed.** Flat white in the serif. The gradient was the single most "AI-generated" element on the page.
- **Radial glow blob removed.** Flat navy.
- The metric row carries the report's headline facts — prompts tested, journey stages, times mentioned. Three metrics, never more.
- The cover ends with a hairline and a metadata row. No border at the navy/white boundary; the 104px of white below it is the transition.
- The purple CTA stays `--accent`.

---

## 6. Responsive

One breakpoint at 840px. This is a document, not an app.

```css
@media(max-width:840px){
  .findings{grid-template-columns:1fr;gap:var(--s-5)}
  .cover-meta{gap:var(--s-5)}
  h1{font-size:44px} h2{font-size:32px}
  .section{padding:var(--s-8) var(--s-3)}
}
```

Body stays 17px on mobile. Do not reduce it. Tables scroll horizontally in a `overflow-x:auto` wrapper rather than collapsing into stacked cards — stacked cards would reintroduce boxes.

---

## 7. Accessibility

- Heading order is strict: one `h1` on the cover, `h2` per section, `h3` for components. Never pick a level for its size.
- Status is never colour alone — the dot is always accompanied by a word.
- Keep the skip link that exists in the React version.
- Focus rings: `outline:2px solid var(--accent); outline-offset:2px`. Do not remove them.
- Every `<table>` gets real `<th>` elements with `scope`.

---

## 8. Print / PDF

The report offers a PDF download, so the print path matters.

```css
@media print{
  .section{padding:48px 0;break-inside:avoid}
  .band{background:var(--band) !important;-webkit-print-color-adjust:exact}
  .cover{-webkit-print-color-adjust:exact}
  .action,.note,.evidence{break-inside:avoid}
  h2{break-after:avoid}
}
```

This system prints better than the current one — no shadows to flatten, hairlines survive at 1px, bands become clean grey blocks.

---

## 9. Self-audit

Paste into the browser console on the finished page. Every number must be zero except where noted.

```js
const $=s=>[...document.querySelectorAll(s)];
const cs=el=>getComputedStyle(el);
const body=$('body *').filter(el=>!el.closest('.cover'));

const boxed=body.filter(el=>{
  const s=cs(el);
  const hasBorder=['Top','Right','Bottom','Left'].some(d=>
    parseFloat(s['border'+d+'Width'])>0 && s['border'+d+'Style']!=='none');
  const hasFill=s.backgroundColor!=='rgba(0, 0, 0, 0)' && s.backgroundColor!=='transparent';
  const hairline=el.tagName==='TD'||el.tagName==='TH'||el.classList.contains('note')||el.classList.contains('action');
  return (hasBorder&&!hairline)||(hasFill&&!el.classList.contains('band'));
});

console.table({
  'boxed elements (allow: .evidence only)': boxed.filter(e=>!e.classList.contains('evidence')).length,
  'box-shadows in body (allow 0)': body.filter(e=>cs(e).boxShadow!=='none').length,
  'left rails >=2px (allow 0)': body.filter(e=>parseFloat(cs(e).borderLeftWidth)>=2).length,
  'filled pills (allow 0)': body.filter(e=>parseFloat(cs(e).borderRadius)>0
      && cs(e).backgroundColor!=='rgba(0, 0, 0, 0)'
      && !e.classList.contains('evidence')).length,
  'font families (allow 2)': new Set(body.map(e=>cs(e).fontFamily.split(',')[0])).size,
  'font weights (allow <=4)': new Set(body.map(e=>cs(e).fontWeight)).size,
  'border-radius values (allow <=2)': new Set(body.map(e=>cs(e).borderRadius).filter(v=>v!=='0px')).size,
  'content widths (allow 2)': new Set(body.map(e=>cs(e).maxWidth).filter(v=>v!=='none')).size,
});
console.log('boxed offenders:', boxed.filter(e=>!e.classList.contains('evidence')));
```

If `boxed offenders` is non-empty, the redesign is not finished. Fix the offenders; do not adjust the script.
