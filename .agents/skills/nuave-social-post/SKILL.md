---
name: nuave-social-post
description: Make one Nuave Instagram carousel (6 slides, 1080×1350) in the approved violet style, with free Pexels photos picked without the Pexels API, Indonesian copy that follows docs/VOICE.md, a ready caption and photo credits. Use when asked for a Nuave social post, carousel, Instagram slides or a feed post. Produces a draft for founder review; it never posts anything.
---

# Nuave social post

One post is one carousel: six slides that tell one idea, plus a caption. The
first one (approved 2026-10-25) is in [`example/`](example/): open
`example/overview.jpg` to see the look to match, and copy
`example/carousel.html` as the starting point for every new post.

The result is a **draft**. Posting, paying for a boost or naming a real client
needs the founder's approval (`AGENTS.md`).

## The flow

1. **Pick one idea** (step A). Write it as one sentence before anything else.
2. **Plan six slides** on the approved story shape (step B).
3. **Write the words** and check them against the copy rules (step C).
4. **Find photos on Pexels** and download them by ID (step D).
5. **Build** from the template (step E).
6. **Render and look** at every slide (step F).
7. **Hand over** the slides, the caption and the photo links (step G).

Work in your scratchpad (or a folder the person names), one folder per post:

```sh
S=.agents/skills/nuave-social-post        # or .claude/skills/nuave-social-post
P=<scratchpad>/2026-10-25-tanya-ai-dulu    # date + short slug
cp -r $S/example $P && rm $P/overview.jpg
```

## A. Pick one idea

One post makes one point. Good sources, in this order: the landing copy
(`docs/content/landing-copy.md`), the examples in `docs/VOICE.md` §3 and §7.1,
and what the report actually shows (`docs/VOICE.md` §7.4). Ideas that fit:

- How customers now choose: they ask AI first (the 2026-10-25 post).
- What a report shows: the two counts, the quoted answers, other businesses
  named.
- What Nuave does not claim: not a ranking, not a guarantee (landing
  "Batasan" section).
- One business type's question, such as a clinic, café or bengkel, using an
  illustration.

Do not build a post on a number you cannot source, a customer story you do
not have, or fear of being left behind.

## B. Plan six slides (the approved shape)

The shape alternates photo slides with designed slides so the swipe keeps
changing. Keep it unless the idea really needs something else.

| # | Role | Template slide | What goes on it |
|---|---|---|---|
| 1 | **Hook** | `s1` photo-overlay | A person in the moment the idea is about. A headline of at most 8 words, one accent phrase, one short question, "Geser →". |
| 2 | **The change** | `s2` photo-split | The photo on top, a two-line headline and one plain sentence below. |
| 3 | **Show it** | `s3` illustration on cream | A designed picture of the idea, such as the chat example. Always labelled as an illustration. |
| 4 | **The question** | `s4` photo-overlay | A business owner, with the question the reader should ask about their own business. |
| 5 | **What Nuave does** | `s5` explainer | One headline, three numbered points and a "Contoh hasil" card with the beads. |
| 6 | **Call to action** | `s6` violet | The only full-violet slide: the CTA, price facts and "Link di bio". |

## C. The words

Write in Indonesian first, the way an owner would say it. Then check every
line against this list. It summarises `docs/VOICE.md`, which wins if they
differ.

- **Anda**, never kamu. Say **bisnis Anda**, or the business type
  (**klinik Anda**). Say **calon pelanggan**, not customer.
- Short: a headline of 4 to 10 words, one supporting sentence and one idea per
  slide. Light spoken words are fine (**cuma**, **dulu**, **kok**).
- **No em or en dashes.** No hype or fear words (**mendominasi**, **jangan
  sampai tertinggal**). No guarantee, ranking or forecast. No percentages or
  market numbers.
- Use the settled wording exactly: CTA **Cek bisnis saya di AI**, price
  **Rp249.000**, the audit checks **ChatGPT dan Google AI Overview**, the
  result line **Bisnis Anda muncul di X dari 10 pertanyaan**, and the report
  name **AI Visibility Report**.
- **Never show a made-up AI answer as real.** A chat picture uses placeholder
  names (Klinik A, B, C) and the line "Ilustrasi. Nama ... bukan contoh
  nyata." A sample result says **Contoh hasil**.
- Only promise what the product does today. Check `docs/NOW.md` and the
  terms in `docs/content/website/` for price, delivery and refunds.

The caption follows the same rules: 5 to 8 short lines that retell the slides
and end with "Cek bisnis saya di AI, link di bio." See `example/caption.md`.

## D. Photos from Pexels (no API needed)

Pexels paused new API keys (seen October 2026), but the photos are still
free for commercial use and credit is not required. Pexels's own search pages
block automated visits, so find photos through web search instead:

1. **Search** with `WebSearch`, limited to `pexels.com`, using plain
   descriptions such as "pexels photo indonesian woman hijab smartphone cafe"
   or "pexels photo asian small shop owner counter". Run three or four
   searches at once. Every photo link ends in its ID, for example
   `.../woman-in-pink-hijab-holding-black-mobile-phone-13502903/`.
2. **Preview** the candidates and put them side by side:
   `PREVIEW=1 $S/pexels.sh $P <id> <id> ...` saves small copies in
   `$P/preview/`. Open them with Read, or make a contact sheet, before you
   choose.
3. **Choose** with these rules:
   - People who look like Nuave's customers: Indonesian or Southeast Asian.
     Hijab is common and welcome.
   - Natural, warm light and real places (cafés, shops, clinics), not studio
     backdrops.
   - The person is in the act the slide is about, such as holding a phone or
     serving a customer.
   - There must be room for text: a dark or plain area at the bottom for the
     overlay slides (`s1`, `s4`), and a centred face for the split slide
     (`s2`).
   - Portrait photos crop best. No readable English screen text, no other
     brands' logos, nothing that looks like a famous stock cliché.
4. **Download** the chosen ones at full size: `$S/pexels.sh $P <id> ...`
   saves `$P/img/pexels-<id>.jpg`.
5. **Record** each photo's page link in the post's `caption.md`.

## E. Build from the template

Edit `$P/carousel.html`. Change only the words and the photo file names.
Adjust `background-position` on a photo so that faces stay clear of the text.
The template already holds the approved design, which is Nuave's v2 violet
look from `docs/DESIGN.md`:

- 1080×1350 slides (Instagram portrait), Geist at weight 600, tight letter
  spacing and an 80px margin.
- **One violet accent per slide**: one accent phrase (lavender `#ccc3ff` on
  photos, violet `#533afd` on white), the beads, or the violet CTA slide.
- Photo overlays darken from the middle down, and the text sits at the
  bottom. The Nuave mark sits top left, white on photos.
- The cream (`#f5f3ff`) background is kept for the illustration slide, and
  the violet gradient for the last slide only.

If a post needs a new slide type, add it in the same style and keep the
`id="s1"` to `id="sN"` order. `render.mjs` renders every `section.slide`.

## F. Render and look

```sh
node $S/render.mjs $P     # slide-1.png ... slide-6.png and overview.png
```

It needs Playwright (`npm ci` in the checkout) and internet access for the
Geist font, and it warns if Geist did not load. If Playwright says its browser
is missing, point it at an installed Chromium with
`CHROMIUM_PATH=/opt/pw-browsers/chromium` in the cloud container (or any local
Chrome or Chromium path). Then open `overview.png` and each slide, and check:

- Every line is readable and no text covers a face.
- No slide has a large empty band.
- Only one violet accent per slide.
- The words still pass step C after layout, including line breaks that
  change meaning.

Fix and render again until all four checks pass.

## G. Hand over

Send the person `overview.png`, the six slides and `caption.md` (with
SendUserFile in a cloud session). Say what still needs their eye: the
illustration labels, any sample result, where "Link di bio" points, and that
nothing has been posted. Keep the photos and PNGs out of Git. If the person
wants a post saved, commit only its `carousel.html` and `caption.md`.
