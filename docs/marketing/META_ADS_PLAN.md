# Nuave Meta Ads plan

> Status: **Draft for founder review**, not an approved decision
> Written: 2026-10-24
> Market: clinic owners and clinic marketing teams in Jakarta, Bogor, Depok,
> Tangerang, Bekasi and Bandung
> Channels: Instagram first, then Facebook, then Threads
> First segment: **beauty and aesthetic clinics** (founder, 2026-10-24)
> Founder answers of 2026-10-24 are recorded in section 12

This is the whole plan in plain words: why, who, what we say, what videos to
make, how to set up the account, how to test, when to stop or grow an ad, and
what Claude can run for you.

---

## 0. Read this first: three honest points

**1. Nuave is not open to strangers yet.** `docs/NOW.md` says "No outside users
yet". Before paid ads send strangers to `v2.nuave.ai`, these must be done:

| Must be done | Why it matters for ads | Who |
|---|---|---|
| S5: terms, price and promise wording | Ad visitors read these before paying. Meta also checks that the landing page has a privacy policy. | Worker + founder approval |
| S6: landing page reworked for clinics | Every ad sends people here. A weak page wastes every rupiah. | Founder |
| G1: one real purchase and refund | Proves money actually works before we pay to bring buyers. | Founder + worker |
| Workers Paid plan | Ads bring bursts of visitors; the free plan's CPU limit can stop the site. | Founder |
| Raise the daily AI spending cap | Today it is USD 5 a day and each order holds USD 2. That means only about **2 paid orders a day**. One good ad day could hit the cap and turn paying customers away. Founder accepts up to USD 50 a day for the ad period (about 25 orders in flight; actual cost per audit is about USD 0.14–0.20). | Founder (accepted 2026-10-24; set at launch) |
| Meta Pixel + Conversions API on the site | Without it, Meta cannot see who checked or paid, so it cannot find more people like them, and we cannot measure ROAS. The privacy page must mention it. | Worker (Claude can build it) |

We can still do all the preparation now (accounts, videos, warm-up posts), so
the ads start the day the gates are done.

**2. ROAS 2 on day one is not realistic. Plan for it in three steps.**

The maths, with our real price (Rp99.000, one time):

- ROAS 2 means every Rp49.500 of ads brings one paid audit.
- A cold visitor who has never heard of Nuave has to (a) understand a brand new
  problem, (b) trust a new brand, and (c) pay. Typical new-product numbers in
  Indonesia: about Rp3.000 per click, 20–30% of clickers try the free check,
  5–10% of those pay. That is roughly **Rp150.000–250.000 per purchase**, or
  a ROAS of about 0.4–0.7 at the start.
- Your profit per audit is about Rp90.000 (after AI cost and Midtrans fee).
  So "break even" is ROAS of about **1.1**.

So the targets are:

| Stage | Target | What it means |
|---|---|---|
| Month 1 (learning) | Cost per **free check** below Rp15.000, and the first 10 purchases | We are buying data, not profit. |
| Month 2 (fixing) | ROAS 1.1 or better (break even) | Retargeting and better videos close the gap. |
| Month 3+ (profit) | ROAS 2 | Comes from cheaper winning ads, retargeting, WhatsApp follow-up, and the **cek ulang** (re-check) six to eight weeks later, which costs almost nothing in ads. |

ROAS 2 is a fine long-term goal. It is just not the first-week goal.

**3. Your "3.000 impressions" rule is good for one job only.**

3.000 impressions tell you whether people **stop and watch** (the hook works).
They are far too few to tell you whether people **pay**. At Rp20.000–40.000
per 1.000 impressions, 3.000 impressions cost about Rp60.000–120.000, which
usually brings 0–1 purchase whatever the ad is. So we use three gates, one
after another (section 7).

---

## 1. The strategy in one picture

```
 People who do not know the problem exists
            │   Video ads that teach: "patients now ask AI which clinic to pick"
            ▼
 People who now know the problem
            │   Ads that show proof: a real AI answer, the report, the price
            ▼
 People who visited / watched but did not act
            │   Retargeting: answers to doubts, the Rp99.000 offer, WhatsApp
            ▼
 Free check (enter clinic website)  ──►  Pay Rp99.000  ──►  Report
                                                              │
                                     Cek ulang after 6–8 weeks ◄┘
```

Because Nuave is a new category, most money in month 1 goes to **teaching**
videos. The teaching video does the selling; the landing page only needs to
confirm it.

---

## 2. Who we target

**The person:** clinic owner, doctor-owner, or the clinic's marketing person.
**We start with beauty and aesthetic clinics** (klinik kecantikan / estetika:
facial, acne, laser, skin care), the kind of clinic Sozo is. Other clinic
types come later, once one segment works. Already pays for ads, influencers
or a marketing agency. Usually 25–50 years old.

Beauty clinics fit well: they already spend heavily on Instagram ads and
influencers, they compete hard with nearby clinics, and their patients
compare options before booking — exactly when people ask AI.

**How big is this group?** A rough guess: 5.000–10.000 clinics across
Jabodetabek and Bandung, so perhaps 10.000–25.000 people we want. That is
**small** for Meta. It changes how we target:

- Meta can no longer reliably target "clinic owner" as a job. Interest
  targeting (for example "dentistry", "aesthetic medicine", "small business
  owners", "Facebook ads") is broad and noisy.
- So the **video itself must pick the audience.** The first seconds say "Untuk
  pemilik klinik…". A non-owner scrolls on (we pay little for that); an owner
  stops. This is called a "call-out".
- We let Meta find the right people (Advantage+ audience) and feed it good
  signals from the Pixel.

**Three audiences we test:**

| Audience | Setting | Use |
|---|---|---|
| A. Broad + call-out | Locations below, age 25–55, Advantage+ audience on, no interests | Main test. Usually wins in 2026. |
| B. Interest hint | Same, plus suggested interests: dental, dermatology, aesthetic clinic, beauty clinic, small business, digital marketing, Facebook/Instagram ads | Compare with A. |
| C. Warm (later) | People who watched 50%+ of our videos, visited the site, or engaged our Instagram in the last 30 days | Retargeting, from week 2. |

**Locations:** Jakarta, Bogor, Depok, Tangerang (city + regency + South
Tangerang), Bekasi (city + regency), Bandung (city + regency). Use "People
living in or recently in this location".

**Do not:** upload lists of clinic phone numbers or emails scraped from public
listings into Meta. Meta's rules require that you have permission to use that
contact data, and Indonesia's personal data law (UU PDP) applies. Clinic
lists are fine for your own direct outreach, not for Meta uploads.

**Placements:** Instagram Reels, Stories and Feed first. Facebook Feed and
Reels on. Threads on (it is cheap and Meta adds it automatically; we watch
whether it brings checks). Turn off Audience Network (other apps), which
brings low-quality clicks.

---

## 3. What we say (the message)

### The core idea

> Calon pasien sekarang tanya AI dulu sebelum pilih klinik. AI biasanya cuma
> menyebut beberapa nama. Apakah klinik Anda salah satunya?

### Why it works for this audience

They already spend on ads and influencers. The angle is **not** "here is
another place to spend money". It is: "you already pay to be found; there is a
new place where patients look, it shows only 2–4 names, and nobody is
measuring it for you".

### Five angles to test (each becomes one video)

| # | Angle | One-line hook (Indonesian) |
|---|---|---|
| 1 | Shift | "Pasien Anda sekarang tanya ChatGPT dulu sebelum pilih klinik." |
| 2 | Only a few names | "ChatGPT biasanya cuma menyebut 3 klinik. Klinik Anda masuk atau tidak?" |
| 3 | Invisible leak | "Iklan Anda terukur. Yang ini tidak: calon pasien yang tanya AI lalu pilih klinik lain." |
| 4 | Pesaing | "Saya tanya AI 'klinik kecantikan terbaik untuk jerawat di Depok'. Yang disebut bukan klinik yang paling ramai iklannya." |
| 5 | Cheap check | "Rp99.000 untuk tahu apa kata AI tentang klinik Anda, dari 10 pertanyaan calon pasien." |

### Words we must follow (from `docs/VOICE.md` and the product promise)

- Say **bisnis Anda / klinik Anda**, **calon pasien / calon pelanggan**,
  **pesaing**, **temuan**, **cek ulang**.
- Main button text: **Cek bisnis saya di AI**.
- We may say people use ChatGPT. We must **not** say our results are
  "ChatGPT's answers". Say "jawaban AI" and "AI buatan OpenAI, pembuat
  ChatGPT".
- Never promise more patients, more revenue, ranking first, or "guaranteed
  to appear". Nuave shows what AI said at one moment and what to fix.
- Never show a real clinic's result without its written permission. Use a
  made-up clinic, or your own permission-given example, and label examples
  as examples.

---

## 4. The videos

You are right: video wins, and an explainer suits a new idea. You do not need
to be on camera. Four formats, from cheapest to strongest:

### Format A — "Screen test" (cheapest, make first)

A phone screen recording: someone types "klinik kecantikan yang bagus
untuk jerawat di Depok yang mana ya?" into ChatGPT, the answer appears with three clinic names, then
text on screen: "Klinik Anda tidak disebut. Kenapa?" Voice-over explains.
Feels real, costs almost nothing, very strong for a "never heard of this"
product. Use a city per version (Depok, Bekasi, Bandung…) so it feels local.

### Format B — Vox-style explainer (your idea; the main teaching ad)

Moving text, simple icons, a map of Jabodetabek, a chat bubble, numbers
popping up, a calm confident voice-over. 30–45 seconds. This is the main
"teach the market" ad.

### Format C — A trusted voice (strongest, from month 2)

A paid creator speaks to camera: a clinic-marketing consultant, a doctor who
runs a clinic, or a business/marketing content creator popular with clinic
owners. Run it as a **Partnership ad** (the ad shows their Instagram name),
which borrows their trust. You stay off camera. Budget roughly Rp1–5 juta per
video for a micro creator; agree in writing what they may say (no
guarantees).

### Format D — Proof stills and carousels (for retargeting)

Report screenshots (example clinic), "4 dari 10" style result card, "what you
get for Rp99.000", short FAQ cards ("Apakah perlu login? Tidak").

### Rules for every video

- Vertical 9:16, 15–45 seconds. Subtitles burned in (most people watch muted).
- **The first 2 seconds decide everything.** Start with the hook line on
  screen and in the voice. No logo intro.
- One idea per video. End with one action: "Cek bisnis saya di AI".
- Make 3 different openings (hooks) for each video. Same body, new first 3
  seconds. This is the cheapest test there is.

### Script 1 — Format B, angle 2 "Only a few names" (about 35 seconds)

| Time | On screen | Voice-over (Indonesian) |
|---|---|---|
| 0–3s | Big text: "Klinik Anda disebut AI atau tidak?" over a chat bubble | "Pemilik klinik, coba jawab ini: kalau calon pasien tanya AI, klinik Anda disebut atau tidak?" |
| 3–9s | Chat: "Klinik kecantikan yang bagus di Bekasi?" Answer with 3 names | "Sekarang banyak orang tanya ChatGPT dulu sebelum memilih klinik. Dan jawabannya biasanya cuma 3 atau 4 nama." |
| 9–16s | Google page with 10 links → AI answer with 3 names (shrink animation) | "Di Google ada sepuluh link. Di AI, cuma beberapa nama. Kalau klinik Anda tidak disebut, calon pasien pindah ke pesaing — dan Anda tidak pernah tahu." |
| 16–24s | Dashboard icons with a question mark | "Iklan bisa diukur. Influencer bisa diukur. Tapi jawaban AI tentang klinik Anda? Belum ada yang mengecek." |
| 24–32s | Report preview (example): "Bisnis Anda muncul di 4 dari 10 pertanyaan" | "Nuave menguji 10 pertanyaan calon pasien ke AI buatan OpenAI, pembuat ChatGPT, lalu memberi laporan: kapan klinik Anda disebut, siapa yang disebut, dan apa yang bisa diperbaiki." |
| 32–35s | Button: "Cek bisnis saya di AI" · nuave.ai | "Mulai gratis. Masukkan website klinik Anda." |

Alternative hooks for the first 3 seconds:
- "Saya tanya AI klinik terbaik di Bekasi. Jawabannya bikin kaget."
- "Anggaran iklan klinik Anda besar. Tapi AI tidak menyebut nama Anda."
- "Ini pertanyaan yang sekarang diketik calon pasien Anda."

### Script 2 — Format A, angle 4 "Pesaing" (about 25 seconds)

| Time | On screen | Voice-over |
|---|---|---|
| 0–3s | Text: "Saya tanya AI: klinik jerawat terbaik di Depok?" Typing on phone | "Saya coba tanya AI: klinik kecantikan terbaik untuk jerawat di Depok yang mana?" |
| 3–10s | The answer scrolls, three names highlighted (blurred) | "Yang disebut cuma tiga. Dan bukan yang paling banyak pasang iklan." |
| 10–18s | Text: "Kenapa? AI memilih klinik yang informasinya paling jelas." | "AI memilih bisnis yang informasinya jelas dan konsisten di internet. Iklan tidak bisa membeli tempat di jawaban ini." |
| 18–25s | Nuave report example + button | "Mau tahu klinik Anda disebut atau tidak? Cek gratis dulu di Nuave." |

(Blur the real clinic names in the answer. Always show a fresh, real
recording — never a fake answer.)

### Script 3 — Format C, creator brief (for the trusted voice)

"Talk for 30–45 seconds, to camera, as yourself. Points: (1) You noticed
patients now ask ChatGPT which clinic to choose. (2) The AI names only a few
clinics. (3) Most clinic owners have never checked what AI says about them.
(4) You tried Nuave: it asks AI 10 real patient questions and gives a report
in Indonesian. (5) It starts free, the full report is Rp99.000. Do not
promise more patients or a top position. Do not read a script word for word."

### Who makes the videos (founder choice: Rp0, Claude + ElevenLabs)

| Step | Tool | Cost |
|---|---|---|
| Script, storyboard, hooks, captions | Claude | Rp0 |
| Indonesian voice-over | ElevenLabs | Your plan. Check it allows **commercial use**; the free plan does not. The cheapest paid plan is enough for 10–20 short scripts a month. |
| Screen recordings (Format A) | Your phone's screen recorder + the ChatGPT app | Rp0 |
| Animated explainer (Format B) | Claude builds the animation in code and renders the MP4 with your voice-over file, in this cloud session | Rp0 |
| Final touches, music, burned-in subtitles | CapCut (free version is enough) | Rp0 |
| Icons, photos, music | Canva free, Pexels, CapCut library | Rp0 |

How it works: Claude writes the script → you make the voice-over in
ElevenLabs and upload the audio file → Claude renders the animated video to
the audio's timing → you check it on your phone → small fixes in CapCut.

**Where spending money would pay off (optional, later):**

| Spend | When | Why |
|---|---|---|
| Rp150.000–300.000 for one real person's face (a friend, a hired actor from a casting group) reading the hook to camera for 3 seconds, used across many videos | If our hook rate stays under 25% | A human face in the first second usually stops more thumbs than text or animation. |
| Rp300.000–500.000 for one freelance editor to polish the winning video | Once one video clearly wins | The winner then runs for weeks; a better edit pays back on all that spend. |
| Rp1–5 juta for a creator (Format C) | Month 2+, only after sales come in | Borrowed trust; biggest gain but not needed to start. |

Nothing above is needed to start.

---

## 5. Ad copy (the text above the video)

Primary text, version 1 (short):
> Calon pasien sekarang tanya AI sebelum memilih klinik. Apakah klinik Anda
> disebut? Cek gratis dalam 1 menit.

Version 2 (teaching):
> Di Google ada 10 link. Di ChatGPT, biasanya cuma 3–4 nama klinik.
> Nuave menguji 10 pertanyaan calon pasien ke AI buatan OpenAI dan
> menunjukkan kapan klinik Anda disebut, siapa yang disebut, dan apa yang
> bisa diperbaiki. Laporan lengkap Rp99.000, tanpa langganan.

Version 3 (for marketing teams):
> Anda sudah mengukur iklan, influencer, dan SEO. Satu kanal belum: jawaban
> AI. Laporan Nuave siap dibawa ke rapat tim dalam 10 menit.

Headline: "Klinik Anda disebut AI?" · Button: "Pelajari selengkapnya" (Meta's
button list has no custom text; the landing page button says "Cek bisnis saya
di AI").

---

## 6. Account setup (you do this once; about 2 hours)

1. **Facebook Page + Instagram business account** for Nuave. Post 6–9 things
   first (the explainer videos work as posts too) so the profile does not look
   empty when people check it.
2. **Meta Business Portfolio** (business.facebook.com) → add the Page and the
   Instagram account.
3. **Ad account** → currency **IDR**, time zone **Asia/Jakarta**. Add a
   payment method. Note: Indonesian ad accounts are charged VAT (PPN) on top
   of ad spend.
4. **Verify the domain** `nuave.ai` in Business settings (a DNS record in
   Cloudflare).
5. **Create a dataset (Pixel)**, then give the ID to Claude to install on the
   site with Conversions API (server side, so iPhone and ad-blocker losses are
   smaller).
6. **Business verification** (company documents). Not required to start, but
   it reduces the risk of the account being restricted.
7. **Two-factor login** on your Facebook account. New ad accounts get hacked
   and banned often.
8. Start with a **small daily budget** (Rp100.000, section 8). New accounts that
   spend big on day one often get flagged.

### Events the site will send to Meta

| Event | When | Why |
|---|---|---|
| PageView | Landing page loads | Retargeting audiences |
| ViewContent | Visitor scrolls past the first screen | Shows real interest |
| Lead (custom: "Free check done") | The free check finds the business | **Main optimisation goal in month 1** |
| InitiateCheckout | Order preview opens | Retargeting "almost bought" |
| Purchase (value 99000, IDR) | Payment confirmed by Midtrans (sent from the server) | ROAS |

We optimise for "Free check done" first because Meta needs about 50 results a
week per ad set to learn, and we will not get 50 purchases a week at the
start. When we pass about 30 purchases a week, we switch to optimising for
Purchase.

Add UTM tags to every ad link so our own numbers agree with Meta's:
`?utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`

---

## 7. The testing system

### Campaign structure

```
Campaign 1  "N1 | Test | Free check"    (Sales objective, optimise: Free check done)
  ├─ Ad set A: Broad + call-out          (all of the budget at step 1)
  │    ├─ Video angle 1, hook a/b/c
  │    ├─ Video angle 2, hook a/b/c
  │    └─ ...
  └─ Ad set B: Interest hint             (from step 2, same ads)

Campaign 2  "N2 | Retarget"  (from step 2; about 20% of the daily budget)
  └─ Ad set: video viewers 50%, site visitors, IG engagers (30 days),
             excluding buyers
       ├─ Proof carousel (report example)
       ├─ FAQ / price objection video
       └─ Click-to-WhatsApp ad ("Tanya dulu via WhatsApp")

Campaign 3  "N3 | Scale"  (month 2+; only proven winners, Advantage+ campaign)
```

Name every ad the same way so reports read easily:
`[angle]-[format]-[hook]-[version]`, for example `only3-vox-hookB-v1`.

### The three gates (replaces "3.000 impressions decides everything")

**Gate 1 — Does it stop the scroll?** Decide after about 3.000 impressions
(your rule, used for the job it is good at).

| Measure | Kill if below | Good |
|---|---|---|
| Hook rate (3-second views ÷ impressions) | 20% | 30%+ |
| Hold rate (15-second views ÷ 3-second views) | 25% | 40%+ |
| Link click-through rate | 0,6% | 1,2%+ |

**Gate 2 — Does it bring free checks?** Decide after spending about
**Rp50.000** (3× the target cost per check) on that ad.

| Measure | Kill if | Good |
|---|---|---|
| Cost per free check | above Rp25.000, or zero checks after Rp50.000 | below Rp15.000 |
| Landing page → free check started | below 15% | 30%+ (if low, the page is the problem, not the ad) |

**Gate 3 — Does it sell?** Decide after spending about **Rp200.000** (about 2×
what we can afford per sale) on that ad.

| Measure | Kill if | Winner |
|---|---|---|
| Purchases | zero after Rp200.000 | at least 2 purchases, cost per purchase under Rp100.000 |

A winner gets: its budget raised by no more than 20% every 2–3 days, new hook
versions, and a copy in the Scale campaign.

### How we test, step by step

1. **Weeks 1–2: find the angle.** 5 angles × 1 video each × 3 hooks = 15 ads.
   Only the angle changes; everything else stays the same.
2. **Weeks 3–4: find the hook and format.** Take the best 1–2 angles. Make new
   hooks, a Format A and B version, and different lengths.
3. **Month 2: beat the winner.** Every week, the current best ad (the
   "champion") runs against 2–3 new challengers. A challenger that beats it
   on cost per free check *and* has purchases becomes the new champion. This
   is the "keep comparing the winner to a better version" you described.
4. **Change one thing at a time** (hook, or format, or audience, or copy), or
   you cannot tell what caused the change.
5. **Do not touch an ad set for 3 days after any edit.** Every edit restarts
   Meta's learning.
6. **Ads tire out.** When frequency (times the same person saw it) passes 3
   in the retargeting campaign or 2 in the test campaign and costs climb, swap
   in a new hook. With a small audience this will happen fast — plan for 3–5
   new videos every two weeks.

### What we also test later

- **Click-to-WhatsApp vs website.** In Indonesia, many owners prefer to chat
  first. You answer on WhatsApp (no camera). Could beat the website for
  purchases.
- **Instagram-only vs all placements.**
- **A free mini-finding** ("We asked AI 1 question about your clinic — here
  is the answer") as a stronger free offer. This is a product change and
  costs AI money per visitor, so only if free-check-to-purchase stays weak.
- **Price display** in the ad ("Rp99.000") vs no price.

---

## 8. Budget: the step-up ladder (founder approach)

Founder approach: start small, and spend more only when money comes back. No
fixed monthly cap. This works well, with two rules so each step gives a fair
answer:

1. **"Rp100.000" means Rp100.000 a day**, not in total. Rp100.000 in total
   buys about 3.000–5.000 views and usually zero sales, whatever the ad. That
   says nothing.
2. **Each step runs at least 7 days** before we judge it. Meta's own system
   needs a few days to settle, and weekdays differ from weekends.

| Step | Daily | About 7 days | Move up when | Go back / stop when |
|---|---|---|---|---|
| 1 | Rp100.000 | Rp700.000 | Cost per free check under Rp20.000 and at least 1 purchase | No free checks after Rp300.000, or hook rate under 20% on all ads |
| 2 | Rp200.000 | Rp1,4 juta | ROAS 0,7 or better over the step | ROAS under 0,4 → back to step 1 with new videos |
| 3 | Rp500.000 | Rp3,5 juta | ROAS 1,1 or better (break even) | ROAS under 0,7 → back to step 2 |
| 4 | Rp1 juta | Rp7 juta | ROAS 1,5 or better | ROAS under 1,1 → back to step 3 |
| 5+ | Up 20–30% every 3 days | — | ROAS stays at or above target | ROAS drops two days in a row → hold |

At step 1 (Rp100.000 a day), keep the test small so each ad gets enough
views: **one campaign, one ad set (broad + call-out), 3 angles × 2 hooks = 6
ads.** Retargeting starts at step 2, with about 20% of the daily budget.

Remember: one sale is likely to cost Rp150.000–250.000 at first, so in step 1
"getting a return" means **free checks at a good price plus the first one or
two sales**, not profit yet. Profit is the goal from step 3.

Video production: Rp0 (section 4). Plus PPN on ad spend.

**Hard stop:** if after Rp5 juta of total ad spend we have fewer than 3
purchases, we pause and fix the offer or landing page before spending more.
More ad money will not fix a page or offer that does not convert.

---

## 9. Weekly routine

| When | What | Who |
|---|---|---|
| Daily, 5 minutes | Check spend, cost per free check, any ad past a kill line; pause losers | Claude (see section 10) or you |
| Monday | Weekly report: champion vs challengers, ROAS, what to make next | Claude |
| Monday | Approve new budget and new videos | You |
| Every 2 weeks | Brief and produce 3–5 new videos or hooks | Claude writes, editor makes |
| Monthly | Review the whole funnel: ad → page → free check → pay → report | Together |

The weekly report always shows: spend, impressions, hook rate, CTR, cost per
free check, purchases, cost per purchase, ROAS, and the funnel drop-off at
each step.

---

## 10. What you can hand over to Claude, and how

**Claude can do today, with no setup:**
- Write all scripts, hooks, ad text, storyboards and editor briefs.
- Review video cuts, landing page copy and the funnel.
- Analyse any Ads Manager export you share (CSV or screenshot) and say what
  to pause, keep and make next.

**Claude can build (needs your approval, then a normal pull request):**
- The Meta Pixel and Conversions API on `v2.nuave.ai`, with the events in
  section 6, plus the privacy-page wording for it.

**Claude can run the ads day to day, after a one-time setup by you:**
1. In Business settings, create a **System User**, give it access to the ad
   account, and create a token with `ads_management` and `ads_read`.
2. Add the token and ad account ID as secrets in this Claude Code environment
   (names: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`).
3. Allow `graph.facebook.com` in the environment's network settings.
4. Ask Claude to set up a daily Routine (a scheduled check).

Then Claude can:
- Build campaigns, ad sets and ads through Meta's API, **created paused**, for
  you to look at and switch on.
- Every morning: pull the numbers, pause ads that crossed a kill line, and
  send you a short report.
- Every Monday: write the weekly report and the next batch of video briefs.

**What stays with you (on purpose):**
- Switching on new spend, raising budgets, and anything that costs more money.
- Approving every video and text before it runs (it carries your brand).
- Payment method, account security and Meta's business verification.
- Answering WhatsApp messages from clinic owners.

Pausing an ad is safe and can be undone at any time, so Claude can do it alone.
Spending more is not, so it always asks.

---

## 11. Before launch checklist

- [ ] S5, S6, G1 done; Workers Paid on; daily AI cap raised
- [ ] Landing page speaks to clinic owners in its first screen
- [ ] Pixel + Conversions API live; test events seen in Events Manager
- [ ] Privacy page mentions Meta Pixel
- [ ] Page and Instagram have 6–9 posts
- [ ] Ad account in IDR, Asia/Jakarta, payment added, 2FA on, domain verified
- [ ] At least 3 angles × 2 hooks ready (6 ads)
- [ ] UTM tags on every link
- [ ] Kill lines written down (section 7) and agreed
- [ ] Someone ready to answer WhatsApp and support email within a few hours

---

## 12. Founder answers (2026-10-24)

1. **Budget:** start at Rp100.000 a day and step up as returns come
   (section 8). No fixed cap. Video production: Rp0, using Claude and
   ElevenLabs (section 4).
2. **First segment:** beauty and aesthetic clinics, like Sozo.
3. **Example report:** none yet. The founder may ask a colleague who owns a
   circumcision (khitan) clinic. Worth doing: a real report, shared with
   written permission (name may be blurred), is the strongest proof we can
   show, even though it is a different clinic type. It also opens khitan
   clinics as a possible second segment.
4. **WhatsApp:** the founder can answer at the start.
5. **Trusted voice:** none for now. Start with faceless formats A, B and D.
6. **Daily AI cap:** the founder accepts raising it, up to USD 50 a day, for
   the live ad period. To be set when ads go live and recorded in
   `DECISION_LOG.md`.
7. **Timing:** depends on S5, S6 and G1 (see `docs/PAYING_CUSTOMER_PLAN.md`).
