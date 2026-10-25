# Clinic landing page: lofi v2.2 (light, ChatGPT and Google AI Overview)

> Status: lofi v2.2, for founder review (not hi-fi, not built), 24 October 2026.
> - **v2.2:** applies Yasir's annotations and Fable's Indonesian-voice review of v2.1 (see [`STRATEGY-v2.md`](./STRATEGY-v2.md) §11), and gives mobile and desktop exactly the same content and structure.
> - **v2.1:** added Rp249.000, ChatGPT and Google AI Overview side by side, questions based on Google searches, and the value list.
> - **History:** it replaces [`LOFI.md`](./LOFI.md) (v1.1). v2.0 and v2.1 are in git history.
> - **Who:** built by the designer agent from [`COPY-v2.md`](./COPY-v2.md) v2.2, with every text placed word for word; checked by the orchestrator.
>
> **Release gate:** the page describes the Spec 018 audit, which went live on 24 October 2026 (PR #151). The product side is met; the page still has to be built. The notes inside the lofi and on the Figma boards are the v2.2 snapshot, so they still say "Klinik Anda" is not built.
> **Figma:** file `pE6HryXbVyJo24lxqy6JZE` ("Nuave Landing Page"), page [Lofi v2.2 · Light](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=16-2):
> - [00 · Strategy at a glance · v2.2](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=54-2)
> - [01 · Mobile 390 · lofi v2.2](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=55-2), with a note beside each section. Below the page it has these extra frames:
>   - the fold check;
>   - the menu opened;
>   - the sticky bar in use;
>   - the demo tabs, including "Lainnya";
>   - all four report tabs.
> - [02 · Desktop 1440 · lofi v2.2](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=56-2), with notes on the right, the sticky bar in use, and the 1200×630 link-preview image
>
> The reviewed v2.1 frames, with Yasir's annotations, Fable's blue review column and Fable's summary frame, are kept on the page [Lofi v2.1 · review notes (Yasir + Fable)](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=48-2). v1.1 stays on "Lofi v1 · history (too heavy)".
>
> **Source:** [`lofi-v2.html`](./lofi-v2.html), a static, self-contained page. Open it in a browser to see both boards. Before the Figma import:
> - each note was moved beside its section;
> - each multi-line headline got a fixed width that keeps its line breaks even, with room to spare.
>
> Figma drops non-breaking spaces on import, so they were put back in Figma, in the same places as the source. "Google AI Overview" and "15 menit" never split; neither do a few headline phrases such as "pertanyaan pasien" and "Klinik Anda termasuk?".
> **How to read it:** grayscale on purpose. The dark button is the one action; grey buttons inside the pictures are not tappable. The `S0` to `S9` and `F` markers match the notes. Founder questions live in the notes only. Every clinic name is fictional; the search numbers in the examples are real Spec 018 probe data, labelled "Contoh".
> **Size:** about 9.6 phone screens (390×844) to the end of the final call to action (v2.1: 9.1; v2.0: 7.5). The extra half screen is mobile catching up with desktop. Desktop is about 7.7 screens at 1440×900. About 585 visible words.
> **Production notes:** the lofi uses Inter only so it renders without web fonts. Production uses Geist and the violet v2 kit ([`docs/DESIGN.md`](../../DESIGN.md)).

## Mobile = desktop

Both boards carry the same text in the same order, section by section. A script compares the visible text of every section on the two artboards (`diff-boards.cjs`, run on the source before import). For v2.2 it reports "identical" for S1 to S9 and the footer.

S0 differs by design: on mobile, the four menu links sit behind the menu icon and are drawn open in the "Menu terbuka" frame. Only the layout differs between the boards: desktop puts some things side by side that mobile stacks.

The five gaps found in v2.1, now closed:

| Where | v2.1 | v2.2 |
|---|---|---|
| S0 menu | Links on desktop only | Mobile: a menu icon that opens the same 4 links and the button |
| S3 ChatGPT panel | "Tanyakan apa saja" input bar on desktop only | On both |
| S3 AI Overview box | 2 source chips on desktop, 1 on mobile | 2 on both, on their own row |
| S4 Cara kerja | Step 1 and step 3 pictures and their caption on desktop only | On both, under each step |
| S7 value card | "AI Visibility Report" label and row ticks on desktop only | On both |
| Sticky bar | "Gratis dulu · Audit Rp249.000" on mobile only | Desktop's sticky top bar shows it too after the hero (extra frame) |

## Layout

- **Page:** white with soft grey bands (#f6f6f7) marking the "look at this" moments: S3 (both places), S5 report, S9 final call to action.
- **Desktop:** 1440 wide, 1152 container, section padding 96px, centred section heads.
- **Mobile:** 390 wide, 24px gutters, section padding 52px. No eyebrows or labels above titles.
- **Type:**

  | Role | Desktop | Mobile |
  |---|---|---|
  | H1 | 56/60 | 32/38 |
  | H2 (centred) | 40/44 | 28/32 |
  | Line under a heading (grey) | 18/28 | 16/24 |
  | Card title | 16 to 18 semibold | 15 to 16 semibold |
  | Card line | 14/20 | 13 to 14/18 to 20 |
  | Source / caption | 12 | 12 |

- **Line breaks:**
  - Headlines and the lines under them use balanced breaks, so no line ends with one word on its own.
  - "Google AI Overview" never splits across lines.
  - The H1 breaks at the comma: "Pasien sekarang / tanya AI dulu, / baru pilih klinik."
  - The S3 headline does too: "Satu pertanyaan pasien, / dua jawaban AI."
- **Chat mocks:** clinic names are bold with a colon ("**Klinik A:** behel bisa dicicil"), the way ChatGPT writes them; middle dots are kept for Nuave's own chips and labels.
- **Cards:** soft fill or hairline border (never both), 18 to 20px radius. The product pictures carry a hairline plus a soft shadow so they read as product, not decoration. These are the hero demo, the S3 panels, the report panel and the value card.
- **One dark button style** for the one action: the hero form, the price-card form, the final form and the sticky bars.
  - The menu button is an outline, and so is the button in the opened mobile menu.
  - Buttons inside the pictures are grey and inert ("Download PDF", "Buka laporan").
- **Small print:** one source line under the number cards, and one "Contoh. Nama klinik fiktif." under each picture. The S3 caption adds "Google tidak selalu menampilkan AI Overview." `[KONFIRMASI]` items live only in the notes.
- **Section markers** (S0 to S9, F) are tiny grey tags at each section's top-left, used to place the notes. Delete them in Figma if unwanted.

## Sections and visuals

| # | Section | Visual (same on both boards) |
|---|---|---|
| S0 | Menu | Logo · 4 anchors (desktop) or menu icon (mobile) · outline "Cek klinik saya". "Harga" jumps to the S7 heading |
| S1 | Hero | **AI chat demo** with clinic tabs **Gigi · Kecantikan · Kulit · Anak · Lainnya**. "Lainnya" opens more types (Mata · Fisioterapi · Kandungan · THT · Klinik umum), drawn as an extra frame. Dashed "Klinik Anda?" slot. Floating "AI Visibility Report" card with two rows: **ChatGPT** "muncul di 3 dari 10" and **Google AI Overview** "muncul di 1 dari 6" |
| S2 | Makin banyak pasien pilih dokter lewat AI. | Three number cards, Indonesia first: 2024 (Google AI Overview mulai muncul di pencarian di Indonesia), 47% (warga AS, rater8), 40 juta (OpenAI). One source line in the same order |
| S3 | Satu pertanyaan pasien, dua jawaban AI. | The same question in a **ChatGPT** chat (with its "Tanyakan apa saja" input bar) and on a **Google** results page with the labelled **AI Overview** box (two source chips). The chat names Klinik A, B and C; the AI Overview box names Klinik A, D and E. Both end in the dashed "Klinik Anda?". The line ends "Klinik Anda termasuk?" |
| S4 | Kami tanya AI persis seperti pasien Anda. | Three steps, each with its picture: the website field and the found clinic; the real probe question card ("implan gigi surabaya harga", "Dicari di Google", ±4.400 pencarian/bulan, data September 2026); the "Tim Nuave" email. Tags Gratis / Rp249.000. Caption under the steps |
| S5 | Lihat apa kata AI tentang klinik Anda. | **The two-source report in 4 tabs** (Skor · Jawaban AI · Klinik lain · Perbaikan), with the Spec 018 labels in their clinic wording: "Klinik Anda muncul di ...", "Klinik lain yang disebut" (Yasir's decision, built in Spec 018; the live report still heads the other clinics "Bisnis lain yang disebut"). All four states are drawn beside the mobile board |
| S6 | Bukti, bukan janji. | Four cards: Apa adanya · Bahasa pasien · Data publik · Batasnya jelas |
| S7 | Yang Anda dapat dari satu audit. | One card: "AI Visibility Report · Diperiksa di ChatGPT dan Google AI Overview", nine rows with ticks, then the price block: Rp249.000, "Bayar setelah klinik Anda ketemu.", **the form**, payment chips, "Laporan siap dalam 15 menit setelah audit dimulai." Desktop: list left, price right; mobile: stacked |
| S8 | FAQ | 11 rows in this lofi, the first open: "Bagaimana cara klinik muncul di Google AI Overview?". Anchor #faq. The copy now has 13 rows with the approved /faq words (`COPY-v2.md` §8); the lofi catches up at the next update |
| S9 | Final call to action | Rp249.000 in the microcopy; founder line "Ada pertanyaan? Email Yasir, pendiri Nuave: support@nuave.ai." |
| F | Footer | Logo, four links, ©. The copy now says "Syarat dan Ketentuan", as on the live site; the lofi still says "Syarat Penggunaan" |

**Extra frames, mobile board:**
- the fold check at 360×640;
- "Menu terbuka" (the opened menu);
- the sticky bar in use (390×844, at the report);
- the demo tabs Kecantikan, Kulit, Anak and Lainnya;
- all four report tabs.

**Extra frames, desktop board:**
- the sticky bar in use (the top bar with "Gratis dulu · Audit Rp249.000" and the button, at the report);
- the link-preview (OG) image at 1200×630: "Klinik Anda muncul di Google AI Overview?", the logo, and the search bar with the AI Overview box ending in "Klinik Anda?".

**Interactions** (described in the notes, not drawn):
- the demo tabs swap the question and the answers;
- "Lainnya" opens the extra clinic types;
- the report tabs swap the panel and the caption;
- FAQ rows expand one at a time;
- the mobile menu icon opens the links;
- sticky bars:
  - show after the hero form leaves view;
  - hide while any form is on screen or the keyboard is open;
  - a tap scrolls to the nearest form below;
  - safe-area padding on mobile.

## Fold check (mobile, 360×640)

| Element | Bottom edge | Result |
|---|---|---|
| H1 | 195 | visible |
| Line (3 lines) | 283 | visible |
| Field | 351 | visible |
| Button | 413 | visible |
| Microcopy (free check + Rp249.000) | **461** | **Pass** (growth limit: about 520) |
| Three facts | 569 | visible (fold at 640) |

The demo's tab row starts just above the 640 fold. At 390×844 the demo's top edge sits at 580px, so it peeks above the fold.

## Length (to the end of the final call to action)

| | Pixels | Screens | v2.1 | v2.0 |
|---|---|---|---|---|
| **Mobile** (390×844) | 8,104 | **9.6** | 9.1 | 7.5 |
| **Desktop** (1440×900) | 6,914 | **7.7** | 7.7 | 6.5 |

| Section | S0 | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|---|
| Mobile px | 56 | 1,052 | 620 | 1,184 | 908 | 969 | 510 | 1,398 | 880 | 527 |
| Desktop px | 72 | 622 | 590 | 962 | 686 | 961 | 466 | 1,116 | 922 | 517 |

Most of mobile's extra length is the step pictures in S4 (about +280px), now on both boards. If the page must get shorter, the cheapest cut is smaller step 1 and step 3 pictures, on both boards.

## Decisions and open items (also in the notes)

**Decided by Yasir (24 October 2026):**
- **Delivery line:** "Laporan siap dalam 15 menit setelah audit dimulai." Spec 018's promise text now matches (PR #151, commit 727843a).
- **Naming:** "Google AI Overview" everywhere, including inside the Google mock; no "Ringkasan AI".
- **Contact:** email only (support@nuave.ai); no WhatsApp.
- **Report label:** "Klinik Anda" in the report, as the S5 mock shows. Spec 018 built it and is live, except the heading of the other clinics list (below).
- **No "coba sendiri" line**, and the H1 stays as it is.
- **rater8:** the figure stays, labelled as a US survey ("di AS").
- **FAQ (S5, approved 25 October 2026):** the FAQ uses the /faq words, and refunds are partial ([`STRATEGY-v2.md`](./STRATEGY-v2.md) §14).

**Still open:**
- **Lofi update:** the FAQ (13 rows, the approved words) and the footer label, together with the examples decision below.
- **Search engines:** let them in at launch (`src/app/robots.ts` blocks the whole site while it is pre-release).
- **Other clinics heading:** the live report says "Bisnis lain yang disebut"; the S5 mock says "Klinik lain yang disebut". Recommendation: the product says "Klinik lain yang disebut" for clinics.
- **Which clinic leads the examples:** the target market is now beauty clinics in Jabodetabek and Bandung. Recommendation: "Kecantikan" becomes the first, selected tab, and S3 to S5 use a beauty example in Jabodetabek or Bandung ([`STRATEGY-v2.md`](./STRATEGY-v2.md) §13).
