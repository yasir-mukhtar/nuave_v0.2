# Landing page hero: two concepts

> Status: design exploration, 2026-10-24. Not product code. Nothing in `src/`
> uses these files.

Two high-fidelity versions of the clinic landing page's first screen (the menu
and the hero), made from the founder's lofi and benchmarked against Airbnb's
marketing pages. They exist so the founder can pick a direction, or a mix,
before anything is built in `src/`.

| Concept | Figma page | Web prototype | Previews |
| --- | --- | --- | --- |
| Opus | [Opus](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=58-2) | [`opus/index.html`](./opus/index.html) | `previews/opus-*.jpg` |
| Fable | [Fable](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=58-3) | [`fable/index.html`](./fable/index.html) | `previews/fable-*.jpg` |

Open an `index.html` in a browser. Each file shows the desktop (1440 wide) and
mobile (390 wide) versions side by side. The Figma pages are the reference if
the two ever differ.

## Source and rules

- Source: Figma file "Nuave-Landing-Page", page "Lofi v2.2 · Light" (S0 menu,
  S1 hero, and the hero's demo tabs).
- Every word is the lofi's wording, unchanged. Clinic names are fictional and
  labelled "Contoh. Nama klinik fiktif." The scores (3 of 10, 1 of 6) are the
  lofi's example. Rp249.000 is the lofi's price, not today's Rp99.000 offer.
- Benchmark: Airbnb's host pages (experiences, homes, services), AirCover for
  Hosts, the hosting resource centre, Airbnb-friendly apartments, the 2026
  Summer Release newsroom post, careers and gift cards. Captured in Chromium at
  1440×900 and 390×844 on 2026-10-24.

## The two concepts

**Opus: the empty fourth answer.** A patient's phone asks AI for a dental
clinic. AI names Klinik A, B and C, each with a small 3D clinic picture, and the
fourth slot, "Klinik Anda?", is empty. The report card floats beside the phone.
The clinic-type tabs use 3D icons with an underline, like Airbnb's Homes ·
Experiences · Services bar. The copy is centred, with the button inside a
rounded search bar, as on Airbnb's host pages.

**Fable: the chat on a calm stage.** Closer to the lofi layout: left-aligned
copy, the field and button joined in one bar, and the chat card on a pale violet
stage with pill-shaped tabs. The report card floats over the stage's edge, and
the empty "Klinik Anda?" slot holds the bare clinic miniature. It also shows a
second mobile state with "Lainnya" open.

## Images

- `opus/3d/*.webp` (tooth, skin cream, teddy bear and three clinic buildings)
  were generated on 2026-10-24 with Codex's built-in image generation, using
  the miniatures in `public/v2/3d/` as style references. They are trimmed to the
  object, at most 512 px.
- `opus/assets/` holds the sizes the prototype uses. The Kecantikan and Lainnya
  icons reuse `public/v2/3d/focus-product.webp` and `focus-brand.webp`.
- Fable embeds `public/v2/3d/kedai-bare.webp` in its HTML.

## Known gaps

- Not drawn: hover and focus states, the open mobile menu, and Opus's other tab
  states.
- Opus loads the Geist font from Google Fonts; Fable embeds it.
- Figma's HTML import dropped some small icons (ticks, the logo mark, the AI
  sparkle). They were redrawn by hand in Figma.
