# Clinic landing page: lofi v2.1 (light, ChatGPT and Google AI Overview)

> Status: lofi v2.1, for founder review (not hi-fi, not built), 24 October 2026. It updates v2.0 (kept in git history) after Yasir's feedback: Rp249.000, ChatGPT and Google AI Overview side by side, questions based on Google searches, and a list of everything the clinic gets. It replaces [`LOFI.md`](./LOFI.md) (v1.1, kept as history). Built by the designer agent from [`COPY-v2.md`](./COPY-v2.md) v2.1, with every text placed word for word. Checked by the growth marketer ([`GROWTH.md`](./GROWTH.md) Part 5) and the orchestrator.
> **Release gate:** the page describes the Spec 018 audit (approved, not merged; branch `claude/laughing-fermi-prsgqf`). It ships only in the same release as Spec 018.
> **Figma:** file `pE6HryXbVyJo24lxqy6JZE` ("Nuave Landing Page"), page [Lofi v2 · Light](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=16-2):
> - [00 · Strategy at a glance · v2.1](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=34-2)
> - [01 · Mobile 390 · lofi v2.1](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=35-2), with a note beside each section, plus the fold check, the sticky bar in use, the other three demo tabs and all four report tabs
> - [02 · Desktop 1440 · lofi v2.1](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=36-2), with notes on the right and the 1200×630 link-preview image
>
> v2.0 is in Figma's version history; v1.1 stays on the page "Lofi v1 · history (too heavy)".
>
> **Source:** [`lofi-v2.html`](./lofi-v2.html), a static, self-contained page. Open it in a browser to see both boards. Before the Figma import:
> - each note was moved beside its section;
> - each multi-line headline got a fixed width that keeps its line breaks even, with room to spare.
>
> Figma drops non-breaking spaces on import, so two were put back by hand in Figma: "ke ChatGPT" in the S3 headline and "saat pasien" in the S2 line (mobile).
> **How to read it:** grayscale on purpose. The dark button is the one action; grey buttons inside the pictures are not tappable. The `S0` to `S9` and `F` markers match the notes. Founder questions live in the notes only. Every clinic name is fictional; the search numbers in the examples are real Spec 018 probe data, labelled "Contoh".
> **Size:** mobile is about 9.1 phone screens (390×844) to the end of the final call to action (v2.0: 7.5); desktop is about 7.7 screens at 1440×900 (v2.0: 6.5). About 570 visible words.
> **Production notes:** the lofi uses Inter only so it renders without web fonts. Production uses Geist and the violet v2 kit ([`docs/DESIGN.md`](../../DESIGN.md)).

## Layout

- **Page:** white with soft grey bands (#f6f6f7) marking the "look at this" moments: S3 (both places), S5 report, S9 final call to action.
- **Desktop:** 1440 wide, 1152 container, section padding 96px, centred section heads.
- **Mobile:** 390 wide, 24px gutters, section padding 52px (v2.0: 64, trimmed to stay near 9 screens). No eyebrows or labels above titles.
- **Type:**

  | Role | Desktop | Mobile |
  |---|---|---|
  | H1 | 56/60 | 32/38 |
  | H2 (centred) | 40/44 | 28/32 |
  | Line under a heading (grey) | 18/28 | 16/24 |
  | Card title | 16 to 18 semibold | 15 to 16 semibold |
  | Card line | 14/20 | 13 to 14/18 to 20 |
  | Source / caption | 12 | 12 |

- **Line breaks:** headlines and the lines under them use balanced breaks, so no line ends with one word on its own. "Google AI Overview" never splits across lines. The H1 breaks at the comma: "Pasien sekarang / tanya AI dulu, / baru pilih klinik."
- **Cards:** soft fill or hairline border (never both), 18 to 20px radius. The product pictures carry a hairline plus a soft shadow so they read as product, not decoration. These are the hero demo, the S3 panels, the report panel and the value card.
- **One dark button style** for the one action: the hero form, the price-card form, the final form and the mobile sticky bar.
  - The menu button is an outline.
  - Buttons inside the pictures are grey and inert ("Download PDF", "Buka laporan").
- **New small parts (v2.1):**
  - the Google search bar (pill);
  - the "AI Overview" box (soft fill, diamond mark, label);
  - source chips;
  - the dark "Dipakai sebagai sumber" tag;
  - the origin-label chip ("Dicari di Google");
  - the black "Contoh" tag;
  - mini bead rows in the hero report card.
- **Small print:** one source line under the number cards, and one "Contoh. Nama klinik fiktif." under each picture. The S3 caption adds "Google tidak selalu menampilkan AI Overview." `[KONFIRMASI]` items live only in the notes.
- **Section markers** (S0 to S9, F) are tiny grey tags at each section's top-left, used to place the notes. Delete them in Figma if unwanted.

## Sections and visuals

| # | Section | Desktop | Mobile | Visual |
|---|---|---|---|---|
| S0 | Menu | Logo · 4 anchors · outline "Cek klinik saya" (sticky top bar) | Logo + outline "Cek klinik saya" | none. "Harga" jumps to the S7 heading, where the price now sits |
| S1 | Hero | Text left (500px), demo right (600px) | H1 → line → field → button → microcopy → facts → demo | **AI chat demo** with clinic tabs (Gigi active; the other three drawn as extra frames), dashed "Klinik Anda?" slot. Floating "AI Visibility Report" card with two tiny rows: **ChatGPT** "muncul di 3 dari 10" and **Google AI Overview** "muncul di 1 dari 6" |
| S2 | AI kini jadi rujukan pasien | 3 number cards in a row | 3 horizontal number cards | numbers with their scope, plus one source line. The 47% card uses rater8's "AI seperti ChatGPT atau Google AI Overview"; the 2024 card says "Google AI Overview hadir di Indonesia." |
| S3 | **Pasien bertanya ke ChatGPT dan mencari di Google.** (new) | Two panels side by side (1000px, equal height) | Stacked, a label above each panel | The same question, word for word, in both. **ChatGPT** chat names Klinik A, B and C. **Google** page: search bar, tabs, a labelled **AI Overview** box with source chips naming Klinik A, D and E, then two greyed results. Both end in the dashed "Klinik Anda?". Replaces v2.0's dashboards picture |
| S4 | Cara kerja | 3 cards with small screen sketches | 3 numbered rows | Step 2's picture is a real probe question card: "Contoh", "Pertanyaan 3", the chip "Dicari di Google", "implan gigi surabaya harga", and the topic line "Topik: harga implan gigi · ±4.400 pencarian/bulan di Google, seluruh Indonesia (data September 2026)". Tags Gratis / Rp249.000. Step 3 names both sources and "Biasanya 15 menit." |
| S5 | Laporan | Tabs + 720px report panel | Same, full width | **The two-source report in 4 tabs**, with the exact Spec 018 labels. Klinik Gigi Fiksi · Surabaya, "Diperiksa di ChatGPT dan Google AI Overview · 20 Oktober 2026", "Google: Surabaya · ChatGPT: Indonesia". **Skor:** two cards, ChatGPT 3 and 1 of 10, Google AI Overview shown in 6 of 10 with the clinic in 1 of 6. **Jawaban AI:** a real probe question, then both answers with sources, one marked "Dipakai sebagai sumber". **Klinik lain:** one list per source. **Perbaikan:** the priority card and "Topik yang belum menyebut Anda". All four states are drawn beside the mobile board |
| S6 | Bukti, bukan janji | 4 cards in a row | 2×2 cards, icon beside the title | icon + 1 to 2 word title + one line (copy unchanged) |
| S7 | **Yang Anda dapat dari satu audit.** (new) | One card split in two: the list left (header "Diperiksa di ChatGPT dan Google AI Overview", nine rows), the price block right | One card: the list, then the price block joined at its foot | The price sits in the line under the H2. Nine rows, each an icon box, a bold title and one line. Price block: Rp249.000; "Sekali bayar. Tanpa langganan. Tanpa biaya tambahan."; "Bayar setelah klinik Anda kami temukan."; **the form**; payment chips (names only); "Laporan biasanya siap dalam 15 menit setelah Anda menyetujui pertanyaan." |
| S8 | FAQ | 760px accordion | Full width | 11 rows, the first open: "Bagaimana cara klinik muncul di Google AI Overview?". Anchor #faq |
| S9 | Final call to action | Centred, inline form 600px | Stacked form | Rp249.000 in the microcopy; founder contact line |
| F | Footer | One row | Stacked | |

**Extra frames (mobile board):**
- the fold check at 360×640;
- the sticky bar in use (390×844, at the report), showing "Gratis dulu · Audit Rp249.000" and "Cek klinik saya";
- the hero demo tabs Kecantikan, Kulit and Anak;
- all four report tabs.

**Desktop board:** the link-preview (OG) image at 1200×630: "Klinik Anda muncul di Google AI Overview?", the logo, and the search bar with the AI Overview box ending in "Klinik Anda?".

**Interactions** (described in the notes, not drawn):
- the demo tabs swap the question and the answers;
- the report tabs swap the panel and the caption;
- FAQ rows expand one at a time;
- sticky bar:
  - shows after the hero form leaves view;
  - hides while any form is on screen or the keyboard is open;
  - a tap scrolls to the nearest form below;
  - safe-area padding.

## Fold check (mobile, 360×640)

| Element | Bottom edge | Result |
|---|---|---|
| H1 | 195 | visible |
| Line (3 lines) | 283 | visible |
| Field | 351 | visible |
| Button | 413 | visible |
| Microcopy (free step + Rp249.000) | **461** | **Pass** (growth limit: about 520) |
| Three facts | 569 | visible (fold at 640) |

At 390×844 the demo's top edge sits at 580px, so it still peeks above the fold.

## Length (to the end of the final call to action)

| | Pixels | Screens | v2.0 | Target |
|---|---|---|---|---|
| **Mobile** (390×844) | 7,700 | **9.1** | 7.5 | about 9 |
| **Desktop** (1440×900) | 6,886 | **7.7** | 6.5 | none set |

| Section | Mobile px | Desktop px | Mobile v2.0 |
|---|---|---|---|
| S0 menu | 56 | 72 | 56 |
| S1 hero | 1,068 | 602 | 1,018 |
| S2 numbers | 644 | 598 | 624 |
| S3 both places | 1,120 | 962 | 810 |
| S4 cara kerja | 624 | 670 | 492 |
| S5 laporan | 945 | 961 | 753 |
| S6 bukti | 442 | 466 | 516 |
| S7 value list + price | 1,394 | 1,116 | 763 |
| S8 FAQ | 880 | 922 | 744 |
| S9 final call to action | 527 | 517 | 551 |

v2.1 adds about 1,370px on mobile (1.6 phone screens). Most of it is the new S3 picture (+310) and the value list (+631). S4, S5 and the FAQ grew with the two sources; S6 and S9 got shorter. If the page must be under 9 screens, the cheapest cuts are one greyed Google result on mobile (about 30px) or a shorter open FAQ answer (about 60px).

## Open items for Yasir (also in the notes)

- Approve the exact delivery and refund words from Spec 018 (its Q-1). They appear in step 3, the price card, "Berapa lama?" and "Kalau ada masalah?".
- Keep or remove the one "Ringkasan AI" mention in the FAQ "AI apa yang diuji?".
- OK to draw a recognisable Google results page and ChatGPT chat in production (text labels only, no logos)?
- At launch, let search engines in (`src/app/robots.ts` blocks the whole site while it is pre-release).
- The wording of the founder contact line.
- H1 variants for a later test: "Lihat apa kata AI tentang klinik Anda." and "Klinik Anda direkomendasikan AI?".

Already decided: the rater8 figure stays, labelled as a US survey ("di AS").
