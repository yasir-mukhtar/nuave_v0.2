# Clinic landing page: lofi v2 (light)

> Status: lofi v2, for founder review (not hi-fi, not built). It replaces [`LOFI.md`](./LOFI.md) (v1.1, kept as history). Built by the designer agent from [`STRATEGY-v2.md`](./STRATEGY-v2.md) and [`COPY-v2.md`](./COPY-v2.md), with the copy placed word for word. Checked by the growth marketer ([`GROWTH.md`](./GROWTH.md) Part 4) and the orchestrator.
> **Figma:** file `pE6HryXbVyJo24lxqy6JZE` ("Nuave Landing Page"), page [Lofi v2 · Light](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=16-2):
> - [00 · Strategy at a glance · v2 (light)](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=17-2)
> - [01 · Mobile 390 · lofi v2](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=21-2), with a note beside each section, plus the fold check, the sticky bar in use, the other three demo tabs and all four report tabs
> - [02 · Desktop 1440 · lofi v2](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=22-2), with notes on the right and the 1200×630 link-preview image
>
> v1.1 stays in the same file, on the page "Lofi v1 · history (too heavy)".
>
> **Source:** [`lofi-v2.html`](./lofi-v2.html), a static, self-contained page. Open it in a browser to see both boards. Before the Figma import, each note was moved beside its section. Each multi-line headline also got a fixed width that keeps its line breaks even, because Figma wraps text a little differently from the browser.
> **How to read it:** grayscale on purpose. The dark button is the one action; grey buttons inside the pictures are not tappable. The `S0` to `S9` and `F` markers match the notes. Founder questions live in the notes only. Every clinic name is fictional.
> **Size:** mobile is about 7.5 phone screens (390×844) to the end of the final call to action; desktop is about 6.5 screens at 1440×900. v1.1 was about 22 phone screens.
> **Production notes:** the lofi uses Inter only so it renders without web fonts. Production uses Geist and the violet v2 kit ([`docs/DESIGN.md`](../../DESIGN.md)).

## Layout

- **Page:** white with one soft grey band (#f6f6f7). The bands alternate, so each one marks a "look at this" moment: S3 blind spot, S5 report, S9 final call to action.
- **Desktop:** 1440 wide, 1152 container, section padding 96px, centred section heads.
- **Mobile:** 390 wide, 24px gutters, section padding 64px. No eyebrows or labels above titles.
- **Type:**

  | Role | Desktop | Mobile |
  |---|---|---|
  | H1 | 56/60 | 32/38 |
  | H2 (centred) | 40/44 | 28/32 |
  | Line under a heading (grey) | 18/28 | 16/24 |
  | Card title | 16 to 18 semibold | 15 to 16 semibold |
  | Card line | 14/20 | 13 to 14/18 to 20 |
  | Source / caption | 12 | 12 |

- **Line breaks:** headlines and the lines under them use balanced breaks, so no line ends with one word on its own. The H1 breaks at the comma: "Pasien sekarang / tanya AI dulu, / baru pilih klinik."
- **Cards:** soft fill or hairline border (never both), 18 to 20px radius. The two product pictures (hero demo, report panel) carry a hairline plus a soft shadow so they read as product, not decoration.
- **One dark button style** for the one action: the hero form, the price-card form, the final form and the mobile sticky bar.
  - The menu button is an outline.
  - Buttons inside the pictures are grey and inert ("Download PDF", "Buka laporan").
- **Small print:** one source line under the number cards, and one "Contoh. Nama klinik fiktif." under each picture. `[KONFIRMASI]` items live only in the notes.
- **Section markers** (S0 to S9, F) are tiny grey tags at each section's top-left, used to place the notes. Delete them in Figma if unwanted.

## Sections and visuals

| # | Section | Desktop | Mobile | Visual |
|---|---|---|---|---|
| S0 | Menu | Logo · 4 anchors · outline "Cek klinik saya" (sticky top bar) | Logo + outline "Cek klinik saya" | none |
| S1 | Hero | Text left (500px), demo right (600px) | H1 → line → field → button → microcopy → facts → demo | **AI chat demo** with clinic tabs (Gigi active; the other three drawn as extra frames), dashed "Klinik Anda?" slot, floating "AI Visibility Report · 3 dari 10" card |
| S2 | AI kini jadi rujukan pasien | 3 number cards in a row | 3 horizontal number cards | numbers with their scope, plus one source line |
| S3 | AI cuma menyebut beberapa klinik | Two panels side by side (900px) | Stacked | "Yang dilihat pasien" (AI answer, 3 names) vs "Yang dilihat klinik" (Google Analytics, Statistik Instagram, Google Maps: "Belum ada data jawaban AI"); text labels, no brand UI |
| S4 | Cara kerja | 3 cards with small screen sketches | 3 numbered rows | tags Gratis / Rp99.000 |
| S5 | Laporan | Tabs + 720px report panel | Same, full width | **Report in 4 tabs** (Skor active; all four states drawn beside the mobile board); exact report labels |
| S6 | Bukti, bukan janji | 4 cards in a row | 2×2 cards | icon + 1 to 2 word title + one line |
| S7 | Harga | Centred 560px price card | Full-width card | checks, reason line, **the form**, payment chips (names only), "Tanpa langganan. Tanpa biaya tambahan." |
| S8 | FAQ | 760px accordion | Full width | 9 rows, first open, anchor #faq |
| S9 | Final call to action | Centred, inline form 600px | Stacked form | founder contact line |
| F | Footer | One row | Stacked | |

**Extra frames on the mobile board:**
- the fold check at 360×640;
- the sticky bar in use (390×844, at the report);
- the hero demo tabs Kecantikan, Kulit and Anak;
- all four report tabs.

**Desktop board:** the link-preview (OG) image at 1200×630, with the H1 in two lines and the chat ending in the "Klinik Anda?" slot.

**Interactions** (described in the notes, not drawn):
- the demo tabs swap the question and the answers;
- the report tabs swap the panel and the caption;
- FAQ rows expand one at a time;
- sticky bar: shows after the hero form leaves view; hides while any form is on screen or the keyboard is open; a tap scrolls to the nearest form below; safe-area padding.

## Fold check (mobile, 360×640)

| Element | Bottom edge | Result |
|---|---|---|
| H1 | 195 | visible |
| Line | 283 | visible |
| Field | 351 | visible |
| Button | 413 | visible |
| Microcopy (free step + Rp99.000) | **461** | **Pass** (growth limit: about 520) |
| Three facts | 529 | visible |

At 390×844 the demo's top edge sits at 560px, so it peeks above the fold, as the growth marketer asked.

## Length (to the end of the final call to action)

| | Pixels | Screens | Target |
|---|---|---|---|
| **Mobile** (390×844) | 6,327 | **7.5** | ≤ 9 |
| **Desktop** (1440×900) | 5,887 | **6.5** | about 6 |

| Section | Mobile px | Desktop px |
|---|---|---|
| S0 menu | 56 | 72 |
| S1 hero | 1,018 | 608 |
| S2 numbers | 624 | 574 |
| S3 blind spot | 810 | 634 |
| S4 cara kerja | 492 | 640 |
| S5 laporan | 753 | 799 |
| S6 bukti | 516 | 466 |
| S7 harga | 763 | 785 |
| S8 FAQ | 744 | 792 |
| S9 final call to action | 551 | 517 |

v1.1 for comparison: 22.1 mobile screens.

## Open items for Yasir (also in the notes)

- Delivery time, for the FAQ "Berapa lama?".
- The refund line, for the FAQ "Kalau ada masalah?".
- The wording of the advertising-rule answer in the FAQ.
- The wording of the founder contact line.
- H1 variants for a later test: "Lihat apa kata AI tentang klinik Anda." and "Klinik Anda direkomendasikan AI?".

Already decided: the rater8 figure stays, labelled as a US survey ("di AS").
