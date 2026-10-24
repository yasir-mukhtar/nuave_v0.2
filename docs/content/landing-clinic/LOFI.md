# Clinic landing page: lofi layout

> Status: lofi v1.1, final for founder review (not hi-fi, not built). Written by the designer agent; reviewed by the orchestrator and the growth marketer.
> **Figma:** file `pE6HryXbVyJo24lxqy6JZE` ("Nuave Landing Page"), page "Lofi v1 · Landing klinik":
> - [00 · Strategy at a glance](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=7-2)
> - [01 · Mobile 390 · lofi v1.1](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=8-2), with a note beside each section, plus the fold checks, the outreach variant and the sticky bar
> - [02 · Desktop 1440 · lofi v1.1](https://www.figma.com/design/pE6HryXbVyJo24lxqy6JZE/Nuave-Landing-Page?node-id=9-2), with notes on the right and the 1200×630 link-preview image
>
> **Source:** [`lofi.html`](./lofi.html), a static, self-contained page. Open it in a browser to see both boards. The Figma frames were imported from it after each note was moved beside its section.
> **How to read it:** grayscale on purpose. A dark fill marks a real button; grey buttons inside mocks are not tappable. Hatched boxes are visuals still to design, and their label says what they show. `S0` to `S17` markers match the notes. Yellow `[KONFIRMASI]` lines need Yasir. Every clinic name is fictional.
> **Size:** mobile is about 22 phone screens (390×844) to the final sign-up box; desktop about 17.5 screens at 1440×900. This long version is the control for the first live test (long vs short); see [`GROWTH.md`](./GROWTH.md) Part 3 §h.
> **Production notes:** the lofi uses Inter only so it renders without web fonts. Production uses Geist and the violet v2 kit ([`docs/DESIGN.md`](../../DESIGN.md)). The colour of the two dark bands is a founder decision.

---

# Part 1. Architecture, layout system and visuals (round 1)

> Author: designer (round 1). Status: draft for orchestrator review.
> Inputs: [[`BRIEF.md`](./BRIEF.md)](./BRIEF.md) (sections 2 to 8), [`docs/DESIGN.md`](../../DESIGN.md) (v2 violet kit), current `Landing.tsx` and its mobile screenshot.
> Companion files in this folder: lofi v0 (skeleton, not kept) (skeleton lofi, both breakpoints), its screenshots.
> Section numbers below are the brief's skeleton numbers (S0 to S17). Where I move a section, it keeps its S-number so copy, growth and design stay traceable.

---

### 1. What changes from the current page, in one paragraph

The current page is a short product page: hero, one "how customers ask" phone, three steps, four bullets, CTA. It assumes the reader already believes patients ask AI. The new page has to earn that belief first, so it becomes a long-form page in four chapters: **(A) the shift** (patients ask AI now), **(B) the clinic problem** (why it is different for clinics and why you cannot see it), **(C) the check** (Nuave, the report, the price, the limits) and **(D) the close** (FAQ, reminder, founder). Every chapter ends with something the reader can *see*: a chat, a search page, a question taken apart, a path to booking, a real report. The hero carries the product promise and the website field so warm visitors (outreach, referrals) never have to read the education to act.

---

### 2. Page architecture

#### 2.1 Proposed order (one move, two merges of visuals, no cuts)

| Order | S# | Section | Chapter | Band | CTA on this section |
|---|---|---|---|---|---|
| 1 | S0 | Top bar | - | white | Mobile: "Contoh laporan" pill. Desktop: anchors + small primary "Cek klinik saya" |
| 2 | S1 | Hero | - | white | **Primary form**: website/Instagram field + button + microcopy |
| 3 | S2 | You've done the right things | A | white | none (keep the slide going) |
| 4 | S3 | The new behaviour | A | tint | none; optional question module |
| 5 | S4 | Why it matters: intent | A | white | text link "Lihat pertanyaan seperti apa yang kami uji" (to S10) |
| 6 | S5 | Two doors: ChatGPT and Google AI | A | tint | none |
| 7 | S6 | Why clinics are different | B | white | none |
| 8 | S8 | What AI reads | B | white | none |
| 9 | S9 | From answer to booking | B | tint | none |
| 10 | **S7** | **The blind spot (moved)** | B to C bridge | **strong band** | **Bridge CTA**: button + "Lihat contoh laporan" |
| 11 | S10 | Nuave, how it works | C | white | none (steps explain the CTA) |
| 12 | S11 | What you get (report showcase) | C | tint | Primary button + "Lihat contoh laporan lengkap" |
| 13 | S12 | Price | C | white | Primary button inside the price card |
| 14 | S13 | Honest limits | C | tint | none |
| 15 | S14 | FAQ | D | white | text link to support |
| 16 | S15 | Second CTA (remind why) | D | strong band | **Second form**: field + button repeated |
| 17 | S16 | Founder's note | D | white | email/WhatsApp contact line |
| 18 | S17 | Footer | - | tint | none |
| always | - | Sticky mobile CTA | - | - | Appears once the hero button leaves the viewport; hides while the S15 form is on screen |

#### 2.2 Reasons for the changes

1. **Move S7 (blind spot) to sit right before S10 (Nuave).** In the brief's order, the blind spot ("you cannot see this anywhere") comes before the reader understands what AI reads and how an answer becomes a booking. Placed after S9, it becomes the hinge of the page: *now you know it matters, and you have no way to see it*. The very next section is the way to see it. That is the strongest moment for the bridge CTA, and it puts the "curiosity gap" right where the gap is closed.
2. **S6 then S8 then S9 read as one argument**: "you may not call yourself the best, yet AI compares you anyway" (S6) → "from what? from public information" (S8) → "and that answer leads to a booking; you cannot write it, you can fix what it reads" (S9). Keeping them adjacent removes repetition the copywriter would otherwise need to bridge.
3. **Visual merges, not section merges.** S4 and S3 share one patient question: S3 shows it as a chat, S4 takes the *same* question apart (need, area, budget, time). Using the identical question in both is cheaper to read than two different examples. Likewise the hero chat answer and the S11 report use the same fictional clinic and the same "3 dari 10" so the page tells one story.
4. **A repeated form at S15** instead of a button that scrolls back to the hero (what the current code does). On a long page, a scroll jump of 8,000px disorients. Growth should confirm; if they prefer one form, S15 keeps a button that scrolls.
5. **Chapter labels.** Four small chapter eyebrows ("Bagian 1 dari 3: Pasien sekarang bertanya" etc.) make a long page feel finite and let skimmers know where the product starts. Copywriter to name them.

Not proposed: cutting any section. If growth wants a shorter cold-ads variant later, the cut list is S5 door detail, S8 and S6 (in that order), never S11 or S13.

---

### 3. Layout system

#### 3.1 Frames and grid

| | Mobile (primary) | Desktop |
|---|---|---|
| Artboard | 390 wide | 1440 wide |
| Content width | 342 (24 side gutters, matches current `px-6`) | 1152 container, centred (144 side margins) |
| Columns | 4 columns, 16 gutters (rarely needed; most content is one column) | 12 columns of 74, 24 gutters |
| Common splits | single column; visuals full content width (342) or bleed to 390 for scrollers | 5 + 7, 6 + 6, 4 + 8, 3 x 4, centred 8 (760) for reading text |
| Reading measure | 342 (about 40 to 45 characters per line at 16px) | text blocks never wider than 7 columns (662), about 65 to 70 characters at 18px |

Mobile is designed first and the desktop layout is a re-composition, not a stretch. In the live build, the mobile column should be a true 390 to 480 layout (the v2 journey frame is 480), and desktop switches at 1024.

#### 3.2 Spacing scale (4-based)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`

| Use | Mobile | Desktop |
|---|---|---|
| Section padding (top/bottom) | 64 | 128 (hero 64 top) |
| Eyebrow → H2 | 12 | 16 |
| H2 → body | 16 | 24 |
| Body → visual | 32 | 48 (or side-by-side) |
| Between paragraphs | 16 | 16 |
| Between cards in a list | 12 | 24 |
| Visual inner padding | 16 | 24 |

#### 3.3 Lofi type scale (maps onto the canonical 12 to 64 tokens in DESIGN.md)

| Role | Mobile size / line | Desktop size / line | Token |
|---|---|---|---|
| H1 (hero) | 40 / 44, bold | 64 / 68, bold | between 3xl and 4xl on mobile; 5xl on desktop |
| H2 (section) | 28 / 34, bold | 48 / 52, bold | 3xl → 4xl |
| H3 (card title) | 20 / 26, semibold | 24 / 30, semibold | xl → 2xl |
| Body | 16 / 24 | 18 / 28 | base → lg |
| Small | 14 / 20 | 16 / 24 | sm → base |
| Eyebrow | 12 / 16, caps, tracked | 13 / 16 | xs |
| Source line / caption | 12 / 16, grey | 12 / 16, grey | xs |
| Big number (report, stats) | 56 / 56 | 80 / 80 | report serif allowed here (DESIGN.md) |

Note for build: DESIGN.md forbids Inter in production; Inter is used only because the lofi must render without external fonts. Production is Geist.

#### 3.4 Section rhythm and bands

- White is the default. A **tint band** (lofi #f3f3f3, production cream #f5f3ff or stone-50) marks the "look at this" sections: S3, S5, S9, S11, S13, footer.
- A **strong band** (lofi #e2e2e2, production probably ink-900 with white type, or full violet like the paid reading J09) is used exactly twice, for the two decision moments: S7 (bridge CTA) and S15 (second form). A strong band says "this is where you act".
- Never two tint bands in a row, so each band reads as a new chapter beat.

#### 3.5 How long-form stays scannable

1. **Every section has the same anatomy**: eyebrow (chapter or topic) → H2 that makes the point on its own → at most 3 short paragraphs → one visual → one bold takeaway line. A skimmer who reads only H2s and takeaways gets the whole argument. I will check this in round 2 by reading the page as H2s only.
2. **The visual carries the section**, the text explains the visual. No section is text-only (except FAQ).
3. **Short paragraphs**, 1 to 3 sentences, max 3 per section. Lists max 5 items.
4. **Source lines** sit directly under any number, 12px grey, so numbers feel checked without breaking the reading.
5. **Chapter eyebrows** ("Bagian 1 dari 3") so the reader knows how far they are.
6. **Mid-page exits**: the hero form, the S7 bridge CTA, the S11 button and the price card mean nobody has to reach the bottom to act. The sticky bar covers the rest on mobile.
7. **Desktop**: text left (5 columns), visual right (7) by default; alternate sides only where the visual is the hero of the section (S11). Centred layout only for S7, S12 and S15.

---

### 4. Section by section

Format per section: **Job** · **Mobile** · **Desktop** · **Visual concept** (what it shows, why it raises trust or conversion) · **Copy needed** · **CTA**.

#### S0 Top bar
- **Job:** orient, offer proof (the example report) to the sceptic, keep one action in reach.
- **Mobile:** 56 tall. Logo left, "Contoh laporan" outline pill right (as today). No primary button here: the sticky bar does that job once the hero form scrolls away.
- **Desktop:** 72 tall, container width. Logo left; anchors centre ("Cara kerja", "Contoh laporan", "Harga", "FAQ"); small primary "Cek klinik saya" right.
- **Visual:** none.
- **Copy needed:** anchor labels, short CTA label.
- **CTA:** desktop small primary; mobile "Contoh laporan" opens the existing bottom sheet.

#### S1 Hero
- **Job:** stop the scroll with the tension, say what Nuave does in one line, take the website.
- **Mobile:** eyebrow ("Untuk klinik") → H1 (max 3 lines at 40px, about 8 words) → subtitle (2 to 3 lines) → field "Website atau akun Instagram klinik" → primary button → microcopy (free check, Rp99.000 once, no patient data) → method strip (3 small facts in a row) → hero visual (about 320 tall, cropped phone). Field and button land above the fold at a 390 x 660 in-app browser viewport (WhatsApp and Instagram in-app browsers lose about 100px to chrome).
- **Desktop:** 6 + 6. Left: eyebrow, H1, subtitle, field and button inline (one row, 560 wide), microcopy, method strip. Right: hero visual, 564 wide, about 560 tall.
- **Visual concept V1 (must):** a phone with a generic AI chat (not ChatGPT's UI, no logos). The patient's question in Indonesian ("Klinik gigi di Depok yang bisa cicil behel dan buka Sabtu?"). The AI answers with a short list: Klinik A, Klinik B, Klinik C. Below the list, an empty dashed slot: "Klinik Anda?". Overlapping the phone's lower corner, a small **Nuave report card** ("3 dari 10" with a bead row). The pair reads left to right as *this is what your patient sees* → *this is what Nuave shows you*. It shows the tension and the product in one picture, with no illustration doing the selling. Caption: "Contoh tampilan. Nama klinik fiktif."
- **Copy needed:** eyebrow, H1, subtitle, field placeholder, CTA label (A/B: "Cek klinik saya di AI" vs control "Cek bisnis saya di AI"), microcopy (the main hesitation answered), method strip (3 facts of max 4 words: "10 pertanyaan bahasa Indonesia", "AI buatan OpenAI", "Tanpa data pasien"), the chat question and answer lines.
- **CTA:** primary form. Optional small line for outreach visitors under the microcopy: "Sudah menerima temuan dari Nuave? [lanjutkan di sini]" (growth to decide).

#### S2 You've done the right things
- **Job:** pace (Maps, reviews, Instagram, website, ads) then lead to the one new place.
- **Mobile:** H2 → one line of body → a checklist of 5 rows (icon + label + one short detail, each ticked) → a **sixth row, dashed and unticked**: "Jawaban AI · belum pernah dicek" → takeaway line.
- **Desktop:** 5 + 7. Left: eyebrow, H2, body, takeaway. Right: 3 x 2 grid of tiles; five ticked, the sixth dashed with a question mark.
- **Visual concept V2 (must, cheap):** "the sixth tile". The reader ticks five boxes in their head, then hits the empty one. It is the yes-set made visible and it takes a second to read. Production can reuse the v2 `CheckRow` and chips.
- **Copy needed:** H2, one lead line, 5 labels with a clinic detail each (e.g. "Ulasan Google Maps, 4,8 bintang"), sixth label, takeaway.
- **CTA:** none.

#### S3 The new behaviour (tint band)
- **Job:** show the shift from a keyword to a full question, and that AI answers with a short list of names.
- **Mobile:** H2 → body (2 short paragraphs) → V3 as two stacked cards, "Dulu" then "Sekarang" → optional V5 module below → caption.
- **Desktop:** H2 and body centred at 8 columns, then V3 side by side 6 + 6 with an arrow between; V5 module full width below.
- **Visual concept V3 (must): "dulu vs sekarang".** Left card "Dulu": a search box with "klinik gigi depok" and ten grey link rows (the patient does the work). Right card "Sekarang": a chat bubble with the full question (need, area, budget, day) and one answer naming three clinics (AI does the work and makes the short list). The contrast is visible before a word is read: ten links become three names.
- **Visual concept V5 (nice-to-have): "pertanyaan pasien Anda".** Two chip rows: clinic type (Gigi, Kecantikan, Kulit, Fisioterapi, Tumbuh kembang anak, Mata) and city (Jakarta, Depok, Bandung, Surabaya, Medan, + kota lain). Below, 3 example questions filled from static templates. Label: "Contoh pertanyaan. Bukan hasil AI." It works without JS as a static block showing one preset (Gigi, Depok); a small client-side swap is free to run. It makes the reader picture *their* patients' questions, which is the first step toward wanting to see the answers.
- **Copy needed:** H2, body, the keyword, the full question (reused in S1 and S4), 3 AI answer lines; for V5: 6 types x 3 question templates with a {kota} slot.
- **CTA:** none.

#### S4 Why it matters: intent
- **Job:** the question carries the whole decision; being named means being considered; fewer clicks when AI answers.
- **Mobile:** H2 → V4 (the question taken apart) → body → stat card (F3) with source → takeaway → text link to S10.
- **Desktop:** 7 + 5. Left: V4 large. Right: eyebrow, H2, body, stat card, takeaway.
- **Visual concept V4 (must): "anatomi satu pertanyaan".** The same patient question from S3, set large, with four parts underlined and labelled: *kebutuhan* (behel), *area* (dekat Margonda), *biaya* (bisa cicil), *waktu* (buka Sabtu). A fifth label at the end: "siap booking". It chunks the abstract word "intent" down to one sentence a clinic owner has heard at their own front desk.
- **Stat card (must):** two bars, "15%" (no AI summary) vs "8%" (with AI summary), clicks on a regular result. Source line: "Pew Research Center, Juli 2025. Studi di Amerika Serikat, 900 orang dewasa." The source and the "US study" note are part of the card, not a footnote.
- **Copy needed:** H2, body, the 4 labels, stat line in Indonesian, takeaway, link label.
- **CTA:** text link only.

#### S5 Two doors: ChatGPT and Google AI (tint band)
- **Job:** the two places this happens, with evidence, and the honest line about what Nuave tests.
- **Mobile:** H2 → body → door card 1 (ChatGPT) → door card 2 (Google) → honesty strip.
- **Desktop:** H2 and body left 5 columns; below, two door cards 6 + 6; honesty strip full width under both.
- **Visual concept V6 (must): two "doors".** Door 1: a small generic chat with a health question, and the F4 stat ("Lebih dari 40 juta orang bertanya soal kesehatan ke ChatGPT setiap hari", source OpenAI, Jan 2026, global). Door 2: a simplified search results page (no Google logo, no brand UI) with a grey "Ringkasan AI" block at the top naming clinics and the regular links pushed down, faded. Under it a two-point timeline: "Sep 2024: ringkasan AI di Indonesia" (F1), "Sep 2025: Mode AI dalam Bahasa Indonesia" (F2), each with a source line. Caption "Ilustrasi, tampilan disederhanakan."
- **Honesty strip (must):** one line, icon left: "Yang Nuave uji: AI buatan OpenAI, pembuat ChatGPT, dengan pencarian web. Nuave tidak mengukur ringkasan AI Google." Saying this here, at the moment we educate about Google, is a trust move: the reader sees we tell them what we do *not* do.
- **Copy needed:** H2, body, door titles, door one-liners, F1/F2/F4 lines, honesty strip wording (founder check).
- **CTA:** none.

#### S6 Why clinics are different
- **Job:** the tension only we can say: clinics may not call themselves the best or compare; AI compares anyway.
- **Mobile:** H2 → body → V8 as two stacked cards → regulation source line → "bukan nasihat hukum" note → takeaway.
- **Desktop:** H2 and body centred 8 columns; V8 6 + 6 with a thin divider; source line under.
- **Visual concept V8 (must): "yang tidak boleh Anda katakan / yang AI katakan".** Left card: a plain ad draft, "Klinik gigi terbaik di Depok, lebih bagus dari klinik sebelah", struck through, with a tag "Pasal 5 d, e" (no red needed in lofi; production uses the error red sparingly). Right card: an AI answer comparing three clinics by name ("Klinik A sering disebut untuk..., Klinik B lebih terjangkau..."). It turns a regulation the owner already knows into a sudden "oh". Source line: "Permenkes 1787/MENKES/PER/XII/2010, Pasal 4 dan 5. Ini pengamatan, bukan nasihat hukum."
- **Copy needed:** H2, body, the struck ad line, the AI comparison lines, takeaway. Founder checks wording.
- **CTA:** none.

#### S8 What AI reads
- **Job:** AI builds its answer from public information; unclear or inconsistent facts lead to a poor description or no mention.
- **Mobile:** H2 → body → V10 as a vertical list of 5 source cards → V10b mismatch example → takeaway.
- **Desktop:** 5 + 7. Left: eyebrow, H2, body, takeaway. Right: source cards in a 2 + 3 grid, mismatch example spanning full width below.
- **Visual concept V10 (must): "yang dibaca AI".** Five source cards (Website klinik, Profil Google Maps, Direktori kesehatan, Ulasan, Artikel dan media). Each card holds one clinic fact as AI might find it, marked found / unclear / missing: "Jadwal dokter: tidak ditemukan", "Harga scaling: tidak jelas", "Layanan behel: ada", "Alamat: ada". **V10b (nice): a mismatch.** Two small chips side by side: "Website: buka 09.00" vs "Maps: buka 10.00". One detail every clinic marketing admin will recognise.
- **Copy needed:** H2, body, 5 source names, 5 example facts with states, mismatch pair, takeaway.
- **CTA:** none.

#### S9 From answer to booking (tint band)
- **Job:** the honest mechanism: question → AI short list → patient checks Maps or WhatsApp → booking. You cannot write the answer; you can fix what AI reads.
- **Mobile:** H2 → V11 vertical path (4 nodes joined by a line) → callout card → body.
- **Desktop:** H2 and body left 5 columns, callout right 7; V11 full width below as a horizontal path of 4 nodes.
- **Visual concept V11 (must): "jalan dari pertanyaan ke booking".** Four nodes, each a tiny UI crop: (1) the patient's question, (2) the AI short list with three names, (3) a Maps listing / WhatsApp chat with the clinic, (4) "Booking: Sabtu 10.00". Under node 2 a marker: "Di sinilah klinik Anda disebut, atau tidak." It is the mechanism, drawn, so the page never needs to promise patients. Future pacing lives in the node 4 label.
- **Callout card:** two lines side by side: "Yang tidak bisa Anda tulis: jawaban AI" / "Yang bisa Anda benahi: informasi yang dibaca AI".
- **Copy needed:** H2, body, 4 node labels, the marker line, callout pair.
- **CTA:** none.

#### S7 The blind spot (moved; strong band)
- **Job:** curiosity gap: you cannot see this in Analytics or Instagram insights; answers vary; nobody tells you. Then the bridge to Nuave.
- **Mobile:** H2 (short, centred) → body → V9 three tiles stacked → bridge CTA (primary button + "Lihat contoh laporan" link).
- **Desktop:** centred 8 columns: H2, body; V9 as 3 tiles in a row (3 x 4 columns); button and link centred.
- **Visual concept V9 (nice-to-have, strong if done well): "tidak terlihat di mana pun".** Three generic dashboard tiles, no real brand UI: "Analytics website", "Insight Instagram", "Profil Google Maps". Each shows its usual numbers greyed out and one row reading "Disebut di jawaban AI: tidak ada datanya". If production cost is too high, fall back to three plain cards with icons.
- **Copy needed:** H2, body, tile labels, the row text, bridge CTA label and link.
- **CTA:** **bridge CTA** (primary). This is the first CTA since the hero.

#### S10 Nuave, how it works
- **Job:** clarity: 10 questions like your patients ask; three steps; what is free, what is paid.
- **Mobile:** H2 → one line → 3 step cards stacked, each: step number, title, one line, **real screen crop** from the v2 journey, a "Gratis" or "Rp99.000" tag → delivery line `[KONFIRMASI]`.
- **Desktop:** H2 and line left 5 columns; 3 step cards in a row (4 + 4 + 4) with screen crops on top.
- **Visual concept V12 (must): real screens, not miniatures.** Step 1 crop: the J01 website field and the "business found" card (free). Step 2 crop: the details check (services, patients, pesaing, areas) after paying. Step 3 crop: the 10 suggested questions, editable, then "laporan dikirim ke email". The current page uses 3D miniatures for the steps; real screens are more believable for a sceptical owner (Harry Dry: show the product in use). Keep the 3D miniatures as small accents only.
- **Copy needed:** H2, intro line, 3 step titles and lines, the free/paid tags, delivery line placeholder.
- **CTA:** none (the next section shows the outcome first).

#### S11 What you get (tint band, the proof section)
- **Job:** show the real report format with a fictional clinic: the two counts, answers with sources, other clinics named, analysis, actions, PDF.
- **Mobile:** H2 → "Contoh tampilan. Nama klinik fiktif." tag → the report *as a vertical scroll of its own parts*, each part a card with a numbered pin and a one-line caption: (1) Hasil singkat card, (2) one question card with highlighted excerpt and source chips, (3) Bisnis lain yang disebut list, (4) Analisis Nuave snippet, (5) Yang dapat dilakukan list, (6) Download PDF row → primary button + "Lihat contoh laporan lengkap".
- **Desktop:** 4 + 8 (visual dominant). Left (sticky on scroll in production): eyebrow, H2, six numbered captions as a legend. Right: a layered report composition, cards slightly overlapping, numbered pins matching the legend. CTA under the legend.
- **Visual concept V13 (must, most important visual on the page): the report, honestly.** Built from the real `ExampleReportSheet` and the report order in the brief:
  - Hasil singkat: "AI Visibility Report", "Klinik Fiksi", the big "3 dari 10", the exact labels "Bisnis Anda muncul di 3 dari 10 pertanyaan" and "Bisnis Anda direkomendasikan di 1 dari 10 pertanyaan", two bead rows of 10 (2, 7, 9 on; 9 on).
  - Jawaban model AI: "Pertanyaan 2", the question, an excerpt with "Klinik Fiksi" highlighted, and 2 to 3 source chips (domain-like stand-ins, fictional).
  - Bisnis lain yang disebut: Klinik A, B, C with "disebut di N pertanyaan".
  - Analisis Nuave: 2 lines.
  - Yang dapat dilakukan: 3 numbered actions, each with "Bukti: Pertanyaan 2, 7".
  - Download PDF button, with a line "untuk dibawa ke rapat" for the marketing team reader.
  Why it converts: it pairs the promise with proof and answers "what exactly do I get for Rp99.000" before the price appears. Real format, fictional clinic, labelled.
- **Copy needed:** H2, the 6 legend captions (each tied to a reader benefit), the fictional report content, CTA label.
- **CTA:** primary button + secondary link to the full example.

#### S12 Price
- **Job:** Rp99.000 once, anchored to something a clinic already pays; what is free.
- **Mobile:** H2 → price card (full width): "Rp99.000", "sekali bayar, sudah termasuk semua" → inclusions list (4 to 5 ticks) → "Gratis: cek klinik Anda dulu" row → primary button → payment methods row (QRIS, transfer bank, GoPay, DANA, via Midtrans; text in lofi) → refund line `[KONFIRMASI S5]`. Anchor line under the card.
- **Desktop:** 5 + 7: left eyebrow, H2, anchor comparison as a small 2-row table ("[Sesuatu yang klinik sudah bayar]: Rp[...]" vs "Audit Nuave: Rp99.000"); right the price card.
- **Visual concept V14 (must): price card + honest anchor.** No strikethrough price, no discount, no timer. The anchor must be a real, familiar cost the copywriter or growth can justify (I am not inventing one).
- **Copy needed:** H2, price sub-line, inclusions, the anchor comparison (with justification), payment line, refund placeholder.
- **CTA:** primary button inside the card.

#### S13 Honest limits (tint band)
- **Job:** trust through candour: not a ranking, not a guarantee, a snapshot; why a re-check after 6 to 8 weeks.
- **Mobile:** H2 → two cards stacked: "Yang Nuave lakukan" (ticks) and "Yang Nuave tidak lakukan" (crosses: not a ranking, no guarantee, does not test Google AI, no patient data, does not judge clinical quality) → V15b re-check line.
- **Desktop:** H2 and body centred; two cards 6 + 6; re-check timeline full width under.
- **Visual concept V15 (must): "is / is not" cards.** V15b (nice): a small timeline "Audit hari ini → benahi → cek ulang 6 sampai 8 minggu" to explain why answers change and why a snapshot is still useful.
- **Copy needed:** H2, both lists, re-check line.
- **CTA:** none.

#### S14 FAQ
- **Job:** objections in the reader's words.
- **Mobile:** H2 → accordion (8 to 10 items; first item open in the lofi) → "Pertanyaan lain? support@nuave.ai".
- **Desktop:** 4 + 8: H2 and contact left, accordion right.
- **Visual V16 (must):** accordion rows, 56 min height, chevron right.
- **Copy needed:** 8 to 10 questions and answers (growth to supply the objection list from outreach replies).
- **CTA:** support contact link.

#### S15 Second CTA (strong band)
- **Job:** remind why, not just repeat the button; future pacing.
- **Mobile:** H2 (future-paced) → one line → field + button (the same form as the hero) → microcopy.
- **Desktop:** centred 8 columns: H2, line, inline field + button, microcopy.
- **Visual:** none; the type and the form are the visual. Optional: the hero's empty "Klinik Anda?" slot repeated small, now filled with a question mark turning into a tick (production idea only).
- **Copy needed:** H2, line, microcopy.
- **CTA:** second form.

#### S16 Founder's note
- **Job:** people buy from people; four beats.
- **Mobile:** founder photo (circle, 64) + name + role → the letter (4 short paragraphs) → signature → contact line.
- **Desktop:** 4 + 8: left photo (larger, 280 portrait), name, role; right the letter at 8 columns' reading width.
- **Visual V17 (must):** a real photo of Yasir (not a 3D figure, not an illustration). A handwritten-style signature is optional.
- **Copy needed:** letter, `[KONFIRMASI]` gaps for Yasir, name and role line.
- **CTA:** "Balas langsung: support@nuave.ai" (or WhatsApp if the founder wants).

#### S17 Footer
- **Mobile:** links (FAQ, Syarat Penggunaan, Kebijakan Privasi, Kontak) wrapped, then © and social icons.
- **Desktop:** one row: logo and one-line description left, links centre, social right; © row below.
- **Copy needed:** one-line description.

#### Sticky mobile CTA (component)
- 72 tall bar fixed to the bottom, white with a top hairline: price hint left ("Rp99.000 · cek gratis dulu"), primary button right ("Cek klinik saya"). Appears when the hero button leaves the viewport; hides while the S15 form or the price card button is visible, so two identical buttons never stack. Tapping it scrolls to the hero form and focuses the field (no second form in the sticky bar: the keyboard would cover it).

---

### 5. Visual inventory

| ID | Visual | Section | Priority | Why |
|---|---|---|---|---|
| V1 | AI chat mock (question + answer naming 3 clinics + empty "Klinik Anda?" slot) with report card peek | S1 | **Must** | Tension and product in one picture |
| V2 | "Sixth tile" checklist (5 ticked channels, 1 unticked AI) | S2 | **Must** | Pacing made visible, cheap |
| V3 | Dulu vs sekarang (10 blue links vs one AI answer) | S3 | **Must** | The shift, readable without words |
| V4 | Anatomy of one patient question | S4 | **Must** | Turns "intent" into a sentence they know |
| V4b | F3 stat card with bars and source | S4 | **Must** | Evidence with its source visible |
| V5 | Clinic type + city → example questions | S3 | Nice | Personal, makes them picture their patients |
| V6 | Two doors: chat + simplified search page with AI summary on top, timeline F1/F2, stat F4 | S5 | **Must** | Where it happens, with dates and sources |
| V7 | Honesty strip "what Nuave tests" | S5 | **Must** | Candour at the exact point of risk |
| V8 | "What you may not say / what AI says" split | S6 | **Must** | The only-we-can-say-this moment |
| V9 | Blind-spot dashboard tiles | S7 | Nice (fallback: 3 icon cards) | Curiosity gap |
| V10 | What AI reads: 5 source cards with found/unclear/missing facts | S8 | **Must** | Makes "public information" concrete |
| V10b | Website vs Maps hours mismatch | S8 | Nice | The detail every admin recognises |
| V11 | Path from question to booking (4 nodes) | S9 | **Must** | Mechanism without a promise |
| V12 | Three steps with real journey screen crops | S10 | **Must** | Real product, not miniatures |
| V13 | Report showcase (Hasil singkat, answer with sources, other clinics named, analysis, actions, PDF) | S11 | **Must (most important)** | Proof of what Rp99.000 buys |
| V14 | Price card + honest anchor + payment methods | S12 | **Must** | Removes price and payment doubt |
| V15 | Is / is not cards, re-check timeline | S13 | **Must** (timeline nice) | Trust through candour |
| V16 | FAQ accordion | S14 | **Must** | Objections |
| V17 | Founder card with real photo | S16 | **Must** | A real person behind it |
| V18 | Sticky mobile CTA | all | **Must** | Action always in reach on phones |
| V19 | Method strip (3 facts) under hero CTA | S1 | **Must** | Believability above the fold |

Production notes: all mocks are built as UI in code (not images) so they stay sharp and editable; no real clinic names, logos or brand UI (ChatGPT, Google); every mock carries "Contoh tampilan. Nama klinik fiktif." or "Ilustrasi, tampilan disederhanakan." The 3D clinic miniatures stay as small accents (hero corner, S15, footer), never as the main proof.

---

### 6. Trust without social proof

We have no customers, logos, ratings or testimonials, and will not fake any. Believability is designed from five things:

1. **The real report format, early and often.** The hero already shows a report card; S11 shows every part in the real order with the real labels. A visitor knows exactly what they will receive.
2. **Method transparency.** The hero method strip, the 10-questions explanation in S10, the "what Nuave tests" strip in S5, and "Tentang audit ini" mentioned in S11. The reader always knows which AI, how many questions, in which language.
3. **A source line under every number.** Stats appear only as F1 to F4, with publisher, date and scope ("studi di AS", "global") in 12px under the number, in the same card. No unsourced number anywhere, including in mocks (mock numbers are labelled as examples).
4. **Candour placed at the points of doubt.** "Nuave does not measure Google AI" sits beside the Google education; "not a ranking, not a guarantee" sits right after the price; "bukan nasihat hukum" sits under the regulation. Saying what we do not do is our substitute for testimonials.
5. **A real person and real contact.** Founder photo and name, support@nuave.ai, payment through Midtrans with familiar methods, no patient data needed. Small, concrete, checkable.

What we avoid: fake counters ("500+ klinik"), stock photos of doctors, star ratings, "as seen in" rows, urgency timers.

---

### 7. Annotation plan

Each artboard in lofi v0 (skeleton, not kept) has a notes column beside it. Every section carries a small marker in its top-left corner (`S#` plus display order, e.g. "07 · S6"), and the notes column has one note card per section with the same marker, in the same order. Each note card has four parts:

1. **Job:** what the section must do for the reader (one line).
2. **Visual:** what the visual shows and its ID from the inventory (V#), with must/nice.
3. **Conversion:** why it raises trust or action, and the CTA on this section.
4. **Copy needed:** what the copywriter must supply, with length limits.

In Figma, each note becomes a sticky-note frame placed beside its section on the same y-position (I will align them by hand in Figma; the HTML keeps them in order without JS). Round-2 lofi will add a fifth line, **Open question**, for anything waiting on the founder (`[KONFIRMASI]`).

---

### 8. Open questions for the orchestrator

1. S7 move to just before S10: approve?
2. Repeated form at S15, or a button that scrolls to the hero form? (growth)
3. Price anchor: which familiar clinic cost may we name? (copy / growth; must be justifiable)
4. Founder photo available? If not, the founder card falls back to name + initials, and that weakens S16.
5. V5 question module: allowed as a small client-side swap with static templates, or static only?
6. Strong band colour in production: ink-900 or full violet (J09 style)? DESIGN.md allows violet once per screen, so the strong band must not also contain a violet button; it would carry a white button instead.

---

# Part 2. Changes in lofi v1 and v1.1

> Author: designer (round 2). Read with Part 1 of this file (layout system, visual inventory and trust rationale still apply).
> Files: lofi v1 (superseded by [`lofi.html`](./lofi.html)).
> Inputs: the orchestrator's round 1 decisions (see [`STRATEGY.md`](./STRATEGY.md)), [`GROWTH.md`](./GROWTH.md) Part 1 §3.1 to 3.8, [`COPY.md`](./COPY.md) (locked copy, placed verbatim; replaces v2).

### Changelog v0 to v1

1. **Order and numbering** now follow the orchestrator's section order (see [`STRATEGY.md`](./STRATEGY.md) §4): S7 what AI reads, S8 answer to booking, S9 blind spot + bridge form, S12 price straight after the report, S13 limits after the price. Section markers read `S0` to `S17`. Every note has Job, Layout, Visual, Conversion, plus a yellow **Open question** line where a `[KONFIRMASI]` applies.
2. **Real words everywhere** from copy v3 (locked), both breakpoints. The only placeholders left are the yellow `[KONFIRMASI]` items. Bracketed design labels (`[VISUAL: …]`) mark visuals still to be designed.
3. **One form component** (website field + button) in three places: hero S1, bridge S9 and final S15. The S9 and S15 forms sit on dark bands and use a white button. The S11 and S12 buttons are plain buttons that scroll to the nearest form (noted on the frame).
4. **The S4 report teaser** (new) gives a mini card with both exact count labels and small beads, then the link "Lihat contoh laporan". It sits at about 18% of the mobile page, so proof comes well before the 40% point growth asked for.
5. **Report mock (S11)** rebuilt to the factual corrections:
   - Hasil singkat has "10 dari 10 pertanyaan berhasil diuji" and the dated limitation line.
   - Source chips sit under the answer.
   - Analisis Nuave holds "Bisnis lain yang disebut", with relationship labels and question lists instead of counts.
   - One open action shows Kerjakan dulu, Mengapa, Berdasarkan, Penanggung jawab yang disarankan and Selesai ketika. A second action (Kerjakan berikutnya) is collapsed.
   - On mobile, the six legend captions become the labels of the numbered report parts, which saves about 350px. On desktop they are a separate legend next to the report.
6. **S10 steps**:
   - Tags are Gratis (dark), Rp99.000 and Tab boleh ditutup.
   - Each step shows a wireframed crop of the real journey screen: J05 with "Ya, ini bisnis saya"; J25 details with "Ditemukan di website", plus J27 questions with an edit mark; J31 with the real email subject.
   - A framed callout under the steps says that none of the ten questions names the clinic.
7. **S5:** the Google door now comes first. The honesty strip is a framed box with its `[KONFIRMASI]`.
8. **S7:** six source cards, Instagram included, each with one fact and a state. The two clashing cards (17.00 vs 20.00) have a heavier frame, and the mismatch pair sits under them. The self-check is drawn as empty checkboxes.
9. **S12:** a price card only, with no comparison table, and the effort anchor directly under it.
10. **S13:** "Yang Nuave tunjukkan" / "Yang tidak kami janjikan" cards, plus the re-check timeline.
11. **New frames, all beside the mobile artboard except the OG image:**
    - fold checks at 360×640 and 390×660, with a red fold line;
    - the outreach hero variant ("Varian outreach (?src=ob), keputusan founder");
    - the sticky CTA drawn on a 390×844 screen at S6 (64px bar);
    - the OG image at 1200×630, below the desktop artboard.
12. **The dark band** is #3b3b3b in lofi (used only for S9 and S15). Production colour is a founder question.
13. **Copy v3 sync:**
    - Hero: 20-word subtitle. The method strip is bold at 14px and carries "Rp99.000 sekali bayar". New microcopy.
    - S5: one number per door; new H2 and honesty strip.
    - S6: framed reassurance box ("…bukan iklan. Cuma melihat.") before the Permenkes source, with its `[KONFIRMASI]`.
    - S9: new DIY text and bridge microcopy.
    - S10: step 2 starts with the email.
    - S11: marketing card gets the bold "Angka rendah bukan rapor merah…" line. Mock wording is now "mencantumkan jam buka Sabtu".
    - S12:
      - new reason line and email line;
      - the 30-day line is gone (now in FAQ 4);
      - the effort anchor ends "Atau serahkan ke kami, Rp99.000.";
      - optional founder mini-block (dashed): left column on desktop, under the effort line on mobile.
    - S13, S15 and S16: line changes.
    - Outreach variant: new wording.
    - Footer: FAQ link noted as `#faq`.

### Fold check (growth §3.1)

| Frame | Field top | Button bottom | Microcopy bottom | Result |
|---|---|---|---|---|
| 360×640 | 337 | 461 | 509 | **Pass.** The bold method strip (with the price) ends at 609, also above the fold. |
| 390×660 | 337 | 461 | 509 | **Pass.** Strip ends at 577. |

H1 is 36/40 on mobile. The hero visual sits below the form. The shorter v3 subtitle moved the field up by 48px. At 360 the method strip wraps to one fact per line.

### Length (mobile 390, to the end of the final CTA)

**20,249px = 24.0 phone screens (390×844)** with copy v3. The target is ≤ 16. The copy volume drives this, not the spacing: section padding is already 48px and visuals are compact.

| Section | Screens | Section | Screens |
|---|---|---|---|
| S1 hero | 1.4 | S9 blind spot + form | 1.6 |
| S2 pacing | 0.9 | S10 how it works | 2.2 |
| S3 behaviour + module | 1.9 | S11 report | 3.2 |
| S4 intent + teaser | 1.7 | S12 price (+ founder mini-block) | 1.6 |
| S5 two doors | 1.9 | S13 limits | 1.2 |
| S6 clinics (+ reassurance) | 1.6 | S14 FAQ | 1.1 |
| S7 what AI reads | 1.8 | S15 final CTA | 0.6 |
| S8 answer to booking | 1.3 | | |

Options to reach about 16 screens, for the orchestrator to choose:
- **Copy:** in S4, the body paragraph repeats the three Pew numbers that the stat card already shows. Keep one of the two (about −0.3).
- **Copy:** S10 step 2, cut to one paragraph (about −0.15).
- **Design, mobile only:**
  - S3 module collapsed behind a "Coba dengan klinik Anda" row (−0.7);
  - S5 doors as a two-card horizontal swipe (−0.9);
  - S11 open action only, with "Tentang audit ini" collapsed (−0.5);
  - S7 source map replaced by the mismatch pair alone, since the checklist carries the point (−0.5).
- Those design options hide content, so growth should decide.

### Flags (copy that needed a layout decision; no words rewritten)

1. **Mock text I had to fill:**
   - S3 "Sekarang" answer: one short reason per clinic (copy gives none; current lines are design stand-ins);
   - S5 mocks: answer lines shown as "Klinik A …";
   - S7: centre card "Klinik Gigi Fiksi";
   - J27 crop: truncated module templates.
   The copywriter should confirm or replace these.
2. **The hero report card** follows the copy (label, 3 dari 10, one bead row) and has no count label. If the founder wants the exact label in the hero too, it fits at 342.
3. **The S9 bridge** reason line is set as an H3 above the form. The S15 reason line is set bold under the H2.
4. **S11 on mobile:** the two small lines and the marketing card sit under the mock. The button comes before the "Lihat contoh laporan lengkap" link.
5. **The OG headline** is set in two lines at 58px, per the brief. The chat crop is reduced to the three names and the dashed slot so it reads at thumbnail size.
6. **The S12 founder mini-block** is drawn dashed and labelled optional. Without it, S12 is 0.2 screens shorter.
7. **Desktop S15** no longer repeats the hero chat. Copy v2 does not ask for it, and the band is cleaner with the form alone.

---

### v1.1 changelog (last design round)

> Files: [`lofi.html`](./lofi.html) (final). Inputs: orchestrator's v1.1 list and [`GROWTH.md`](./GROWTH.md) Part 3 §a, c, d, e, g. Copy v3 is unchanged except the orchestrator's fit edit to S10 step 2.

#### A. Length (mobile only; desktop keeps full content)

1. **S4:** the body paragraph that repeated the Pew numbers is removed. The H3, the stat card and "Jawabannya sudah jadi pintu depan." stay.
2. **S10 step 2** is now one paragraph (the orchestrator's fit edit), on both breakpoints.
3. **S3 module** is collapsed: the H3 as the row label, one grey bubble with the Gigi + Depok preset question, and a row "Ganti jenis klinik dan kota" with a chevron. Desktop stays open.
4. **S5 ChatGPT door** is text and source only (no chat mock).
5. **S7** keeps the mismatch pair and the checklist. The six-card source map is desktop only.
6. **S10 crops** are compact:
   - J05 and J31 at about 70% height;
   - step 2 is one strip of three "Ditemukan di website" rows plus "+ 10 pertanyaan, bisa diubah".
7. **S11** is reordered:
   - report parts 1 to 4, then the primary button right after the open action;
   - then part 5 collapsed with its one-line summary ("Tentang audit ini · 10 pertanyaan, masing-masing sekali, AI buatan OpenAI dengan pencarian web"), and part 6;
   - then the marketing card, the two small lines and the link.
   - The report rows are denser on both breakpoints: name, questions and label on one line, and action details as "Label: value". No content was dropped.
8. **S13:** the "Yang Nuave tunjukkan" card is dropped. "Yang tidak kami janjikan" and the timeline stay.
9. **S12 founder mini-block** stays as the dashed `[KONFIRMASI]` slot. On mobile it sits directly under the price card; on desktop, in the left column beside it.
10. **S9 dashboards:** the dimmed number rows are dropped, so each tile shows its name plus "Disebut di jawaban AI: tidak ada datanya".

#### B. Hierarchy (both breakpoints)

11. **Dark bands S9 and S15:** the field is a dark input (#4d4d4d on the #3b3b3b band) with a light 1.5px border and light placeholder text. The button stays solid white with dark text, so it is the only bright solid shape (squint rule).
12. **Mock buttons** ("Ya, ini bisnis saya", "Buka laporan", "Download PDF" in the report) are light grey with grey text, inside thin screen frames with a top strip. Only real CTAs are dark filled.
13. **S12 price card** now holds the form (same component):
    - "Bayar setelah klinik Anda kami temukan." sits directly above it;
    - payment methods are four outlined chips, QRIS · Transfer bank · GoPay · DANA, plus "diproses Midtrans";
    - the email, support and refund-slot lines are smaller, under the chips.
14. **The hero strip** now puts the price first: "Rp99.000 sekali bayar · 10 pertanyaan seperti pasien · AI buatan OpenAI". The outreach variant drops the extra line above the field.
15. **The S4 teaser** is a product-look card (white, slight shadow, "AI VISIBILITY REPORT" label) instead of a dashed mock frame. "Lihat contoh laporan" is a full-width outline button.
16. **Notes:**
    - Sticky bar: it also hides while the S11 button or the S12 form is on screen, and adds padding-bottom `env(safe-area-inset-bottom)`.
    - Desktop S0: the top bar is sticky.

#### C. Figma import

The structure is unchanged: `.board > .board-row > .artcol (.artboard + extra frames)`, and `.notes` with one `.note` per section, each header carrying its S# marker. Notes are not hand-positioned. The file is static: no JS, inline CSS, Inter, nothing loaded from outside.

#### Fold check v1.1

| Frame | Button bottom | Price line (first strip line) bottom | Strip bottom | Result |
|---|---|---|---|---|
| 360×640 | 461 | **545** | 609 | **Pass.** The price now sits about 35px inside an in-app browser's roughly 580px visible height. |
| 390×660 | 461 | 545 | 609 | **Pass** |
| Outreach variant 390×660 | 485 | 569 | 633 | **Pass.** Strip above the fold (was below). |

#### Length v1.1

**Mobile: 18,688px = 22.1 phone screens (390×844)** to the end of the final CTA, down from 24.0. **Desktop: 15,713px, about 17.5 screens at 1440×900.**

| Section | Screens | Section | Screens |
|---|---|---|---|
| S1 hero | 1.4 | S9 blind spot + form | 1.5 |
| S2 pacing | 0.9 | S10 how it works | 2.0 |
| S3 behaviour + module | 1.5 | S11 report | 3.1 |
| S4 intent + teaser | 1.6 | S12 price + form + founder slot | 1.7 |
| S5 two doors | 1.5 | S13 limits | 0.9 |
| S6 clinics | 1.6 | S14 FAQ | 1.1 |
| S7 what AI reads | 1.4 | S15 final CTA | 0.6 |
| S8 answer to booking | 1.3 | | |

The remaining gap to about 20 screens is mostly S11 (3.1 screens). The report mock is the proof, so I did not cut it further. If 20 is a hard line, two mobile options:
- collapse the "Kerjakan berikutnya" action and the "Bisnis lain yang disebut" rows behind "Lihat semua" (about −0.6);
- drop the S12 founder slot until Yasir confirms (about −0.25).
