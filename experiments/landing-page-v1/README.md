# Clinic landing page v1: full design

> Status: design for founder review, 2026-10-24. Not product code. Nothing in
> `src/` uses these files.

The complete clinic landing page: the approved "Opus" hero plus sections S2–S9
and the footer. It was designed section by section in Figma, each section
benchmarked against 5–6 Mobbin examples and Airbnb's marketing pages, then
reviewed and revised before the next one started.

- Full page in Figma: [Landing · Full page v1](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=219-2)
  (desktop 1440 and mobile 390, plus an index card and an open-questions card).
- Web version: [`index.html`](./index.html), with the desktop and mobile
  artboards side by side. Open it in a browser; fonts and images are local.
- Previews: [`previews/landing-desktop.jpg`](./previews/landing-desktop.jpg)
  (50%) and [`previews/landing-mobile.jpg`](./previews/landing-mobile.jpg).

## Sections and where each was approved

| Section | What it does | Figma page |
| --- | --- | --- |
| Menu + S1 hero | The shift, the check, the form; a patient's phone where "Klinik Anda?" is missing | [Opus](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=58-2) |
| S2 Pasien pilih lewat AI | Three figures (2024 · 47% · 40 juta) on one centre line; 47 of 100 dots | [S2](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=82-2) |
| S3 Dua jawaban AI | The same question in ChatGPT and Google; only Klinik A in both, you in neither | [S3](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=104-2) |
| S4 Cara kerja | Three steps on one track, each with a small real product moment | [S4](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=126-2) |
| S5 Laporan | The report in its real format, four tabs as a contents list; sticky bars | [S5](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=149-2) |
| S6 Bukti, bukan janji | Four 3D objects, no boxes: candour instead of testimonials | [S6](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=174-2) |
| S7 Yang Anda dapat + harga | One receipt: nine parts of the report, then Rp249.000 and the form | [S7](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=182-2) |
| S8 FAQ | A quiet list; the first answer open and readable | [S8](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=193-2) |
| S9 CTA akhir + footer | A rounded closing panel with the form; Yasir's line as a P.S. | [S9](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=204-2) |

Each section page keeps its benchmark board, the synthesis, every concept and
every revision, with the approved one tagged.

## Rules kept

- Every word is the founder's lofi wording ("Lofi v2.2 · Light"), unchanged.
  Only line breaks and emphasis were set. Clinic names are fictional and
  labelled "Contoh. Nama klinik fiktif."
- No ChatGPT, Google or payment logos; text labels only.
- Nuave's own look: Geist, ink greys, and solid violet #4129E0 for the one
  action. 3D objects follow the clay style of `public/v2/3d/`.
- No testimonials, invented numbers, fake discounts or countdowns.

## Images

- Generated on 2026-10-24 with Codex's built-in image generation, using the
  miniatures in `public/v2/3d/` as style references:
  - `assets/hero/`: the Gigi, Kulit and Anak tab icons and the three clinic
    buildings;
  - `assets/s6/`: all four objects.
- Reused from the repo: the hero's Kecantikan and Lainnya tab icons
  (`public/v2/3d/focus-product.webp` and `focus-brand.webp`).
- `assets/s4/tab-gigi.png` is the hero's tooth again.

## Open questions for the founder

- S5: the "Perbaikan" tab says "Di Pertanyaan 4, ChatGPT menyebut klinik
  lain…", but the "Klinik lain" tab lists no question 4 for ChatGPT.
- From the lofi notes: the refund wording for "Kalau ada masalah?", and FAQ
  answers 2–11 are not written yet.
- Not drawn yet: hover and focus states outside the FAQ, the open mobile menu,
  and the hero's other tab states. The sticky bars and S5's other tabs are on
  S5's page.
- The footer's "Syarat Penggunaan" and "Kebijakan Privasi" links have no
  target yet.
