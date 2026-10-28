# Clinic landing page v2: after the founder's notes

> Status: design for founder review, 2026-10-25. Not product code. Nothing in
> `src/` uses these files.

The founder left 28 notes on the v1 page in Figma. This version follows up
each one: the copy changes they asked for, new wording where they asked us to
find better words, and three sections redesigned with new Mobbin benchmarks.

- Full page v2 in Figma: [Landing · Full page v2](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=244-2).
  Next to the page:
  - [the 28 notes, one by one](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=292-2);
  - [the open questions](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=293-2);
  - [the FAQ with every answer](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=246-2);
  - [S5's other three tabs](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=294-2).
- Web version: [`index.html`](./index.html), with the desktop and mobile
  artboards side by side. Fonts and images are local.
- Previews: [`previews/landing-desktop.jpg`](./previews/landing-desktop.jpg)
  (50%) and [`previews/landing-mobile.jpg`](./previews/landing-mobile.jpg).
- FAQ text: [`faq-draft.md`](./faq-draft.md).

## What changed from v1

| Section | v2 |
| --- | --- |
| Hero | The founder's headline ("Pasien sekarang tanya AI dulu sebelum pilih klinik."), the new line under the form, and the ticks "10 pertanyaan berdasarkan volume pencarian tertinggi Google" and "Laporan siap dalam 15 menit" (replaces "Tanpa data pasien") |
| S3 | New heading "Di jawaban AI, tidak ada halaman dua." The line now ends "Apa klinik Anda termasuk?" The two connecting lines are gone |
| S4 | The founder's two new lines. The example clinic is in Jakarta Selatan |
| S5 | "Theatre": the page's one dark section, where the white report is the light. All four tabs drawn |
| S6 | New heading "Bisa dipercaya, bisa dikerjakan." "Tanpa repot" and "Siap dikerjakan" replace "Data publik" and "Batasnya jelas". New clay checklist |
| S7 | "Struk": the nine parts of the report on one paper receipt, Rp249.000 as the total, and the form on a tear-off stub. The line is now "Rp249.000 sekali bayar." |
| S8 | Every answer drafted (Q2 to Q11 from the product docs) |
| S9 | "Jalan klinik": a clay street of clinics with one empty lot under the form, holding the "Klinik Anda?" slot. New contact line |

Each redesigned section's Figma page (S5, S7, S9) keeps its new benchmark
board, both round-2 concepts and the founder's notes, under round 1.

## Rules added in this round

- Never the founder's name on the page, the boards or these notes.
- One example city, Jakarta Selatan, so the page tells one story.
- Words the founder asked us to rewrite are proposals until the founder
  approves them; everything else is the founder's wording.

## Images

- New, generated with Codex's built-in image generation in the style of
  `public/v2/3d/` (2026-10-24/25):
  - `assets/s6/3d-clipboard.png`: the clay checklist;
  - `assets/s9/street6.png`: the clay street.
- Everything else is reused from v1.
- The street is one generated picture at 1500px wide. A sharper,
  higher-resolution render is needed before the page goes live.

## Open questions for the founder

- S5 is now a dark section. If it feels wrong for a clinic page, the light
  option ("Daylight desk") is on the S5 Figma page.
- The hero now says the questions come from the highest search volume. Can a
  real report still show "Tidak ada data jumlah pencarian" for a question?
- `docs/VOICE.md` says Nuave asks OpenAI's model through the API, not the
  ChatGPT app. The page says "Ditanyakan langsung ke ChatGPT". Which is true
  for the clinic audit?
- Three FAQ answers need a decision: branches (Q9), health-ad rules (Q10),
  and refunds (Q11).
- Not drawn yet:
  - hover and focus states outside the FAQ;
  - the open mobile menu;
  - the hero's other clinic-type tabs;
  - the targets of the footer's legal links.
