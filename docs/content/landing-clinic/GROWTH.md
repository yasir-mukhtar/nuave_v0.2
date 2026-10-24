# Clinic landing page: growth plan and reviews

> Status: draft for founder review. Written by the growth marketer agent; decisions marked **[FOUNDER]** need Yasir.
> Read with [`STRATEGY-v2.md`](./STRATEGY-v2.md), [`COPY-v2.md`](./COPY-v2.md) and [`LOFI-v2.md`](./LOFI-v2.md). Parts 2 and 3 review the first, heavier round ([`STRATEGY.md`](./STRATEGY.md), [`COPY.md`](./COPY.md), [`LOFI.md`](./LOFI.md)), kept as history.
> Contents: **Part 1** the funnel, conversion requirements, metrics and test plan (written before the copy). **Part 2** the review of copy v2, whose fixes are in the final copy. **Part 3** the review of the first lofi, whose fixes are in the final lofi, plus the short page for the first live test (long vs short). **Part 4** the risk check of the light page (v2), whose fixes are in the v2 copy and lofi. **Part 5** the risk check of v2.1 (Rp249.000, ChatGPT and Google AI Overview, the value list).
> No number in this file is a Nuave result unless it says "observed". Benchmarks are named as benchmarks.

---

# Part 1. Funnel, requirements, metrics and tests

> Author: growth marketer, round 1, 24 October 2026
> For: copywriter, designer, orchestrator. Decisions flagged **[FOUNDER]** need Yasir.
> Inputs: [`BRIEF.md`](./BRIEF.md), `docs/PRODUCT.md`, `docs/NOW.md`, `docs/PAYING_CUSTOMER_PLAN.md`, the decision log entry for J01–J35, and the live code (`Landing.tsx`, `step-one-screens.tsx`, `order-screens.tsx`, `SmartIntakeJourney.tsx`, `orders/mail.ts`, `app/faq`, `app/layout.tsx`, `app/robots.ts`). A read-only load of `v2.nuave.ai` on a 390px phone profile (no form touched).
> Status: draft requirements. No numbers in this file are Nuave results unless marked "observed".

---

### 0. The short version

**What the page must do:** take a clinic owner who has never thought about AI answers to "I want to see what AI says about my clinic" and get them to type their website, *without* letting them believe the free step shows an AI result. The real conversion event is paying Rp99.000 three screens later. Everything on the landing page should be judged by whether it raises the chance of that payment, not just the click.

**Things I found in the product that the landing rewrite depends on** (not copy problems, but they will hurt conversion whatever the copy says):

| # | Finding | Where | Why it matters | Owner |
|---|---|---|---|---|
| P1 | The hero microcopy says **"Pratinjau gratis"** (free preview). The free step only reads name, logo and description. "Pratinjau" suggests a preview of the AI result. | `step-one-screens.tsx:197` | Classic expectation mismatch. The visitor arrives at checkout feeling baited. This is the single cheapest fix in the funnel. | Copy (shared component, so also a small code change) |
| P2 | `/faq` still says payment is not active and the product is in private testing, with no price promise. The landing footer links to it. | `src/app/faq/page.tsx` | A careful owner who checks the FAQ before paying reads that Nuave does not take payment. Trust breaks right before checkout. | **[FOUNDER]** update with S5 |
| P3 | Site metadata title is "Apakah brand Anda muncul di ChatGPT?", and there is no Open Graph image. | `src/app/layout.tsx` | (a) Contradicts the rule that Nuave does not claim to measure ChatGPT. (b) WhatsApp, LinkedIn and Instagram DM shares show a bare link preview. WhatsApp sharing between owners is a named channel. | Copy + designer (OG image 1200×630), small code change |
| P4 | The site is `noindex` and `robots: disallow /`. | `app/robots.ts`, `layout.tsx` | Fine for now. Organic search is not a channel until this changes. Do not plan SEO content for this page yet. | **[FOUNDER]** at launch |
| P5 | Live orders are still gated (email allowlist; "No outside users yet" until S5 + G1). A non-listed visitor who completes the free check and enters an email gets **"Audit tidak tersedia saat ini."** | `api/orders/route.ts`, `provider-spend.ts:16` | Do not send real traffic to the new page before G1, or the page converts into a dead end. See painted-door option in §6.3. | **[FOUNDER]** |
| P6 | Every order holds USD 2.00 of a USD 5 daily cap. So only about **two orders can be in progress at the same time**. A third buyer in that window gets the same "Audit tidak tersedia saat ini." (before paying, so no money is lost, but the sale is). | `NOW.md`, `orders/route.ts` | Irrelevant for outreach volume. Fatal for a paid-ad burst. Raise the cap or add a graceful "full today, we'll email you" path before any paid test. | **[FOUNDER]** |
| P7 | After the landing, the product says "bisnis" and "pelanggan" ("Ya, ini bisnis saya", "Bisnis Anda muncul di X dari 10 pertanyaan"). The clinic page says "klinik" and "pasien". | intake + report labels (settled) | Mild message break. The landing should prepare it ("Di laporan, klinik Anda disebut 'Bisnis Anda'") or the product should switch nouns when the category is a clinic. | Copy now; product later **[FOUNDER]** |
| P8 | The report email says "jangan teruskan email ini" (private link). The only way to share with the owner/team is **Download PDF**. | `orders/mail.ts:100` | The marketing-team persona's whole job is to show the owner. The landing must sell the PDF as the sharing tool, not "send the link". | Copy |
| P9 | No analytics of any kind runs on the site (only `v2.nuave.ai` is contacted; the intake event emitter in `src/lib/intake/events.ts` builds events but sends nothing). Funnel analytics is in the plan's parking lot. | load test, `events.ts` | We cannot measure the landing at all today. §5 proposes the smallest way to fix this. | **[FOUNDER]** |

Observed page weight today: about 315 KB transferred across 24 requests, largest contentful paint about 1.9 s on a fast datacenter connection (not a phone on 4G). That is a good starting budget; the long-form rewrite must not blow it.

---

### 1. End-to-end journey map

Screen IDs follow the decision log (J01–J35). "Drop-off risk" is my judgement, ranked H / M / L.

#### 1A. Before the landing page

| Step | Visitor's goal | Main doubt or anxiety | What we must say or do | Biggest drop-off risk | Metric |
|---|---|---|---|---|---|
| **Outreach message** (founder WhatsApp, IG DM, LinkedIn, email) | Decide if this stranger is worth a reply | "Siapa ini? Jualan apa? Ini spam?" | Lead with one real, specific observation ("Saya tanya ke AI 'klinik gigi yang buka sore di Dago'. Lima klinik disebut. Klinik Anda belum."), the date and the system, then one question back. No link in the first message. Link only after a reply. | H: no reply | Reply rate per opening line |
| **Social share** (IG post, LinkedIn post, WhatsApp forward between owners) | Kill a few seconds; "is this relevant to me?" | "Ini cuma tren AI lagi" | One clinic-specific scene (the patient's long question, the AI's short list). Link preview must look like it is about clinics (P3). | H: link preview does not earn the tap | Link click-through (platform-side), landing sessions by `src` |
| **Paid ad** (later, bounded) | Same, but less patient | "Iklan lagi" | Ad shows the question and a blurred short list; the landing hero must repeat the exact question the ad showed (message match). | H: hero does not match the ad | Cost per free check started |
| **Referral** (agency or fellow owner) | Check that the friend's tip is real | "Benar nggak sih?" | The page must quickly confirm "this is the thing your friend meant": what it does, what it costs, what you get. | M | Landing → form start for `src=ref` |

#### 1B. Landing to payment (this round's scope)

| Step | Visitor's goal | Main doubt or anxiety | What the page/product must say or do | Biggest drop-off risk | Metric |
|---|---|---|---|---|---|
| **Landing, first screen (J01)** | Work out "what is this, is it for me, what happens if I tap" | "AI? Untuk klinik saya? Ini pasti jualan software." | Clinic-specific tension headline, one line on what Nuave does, website field, CTA, one line saying free step vs paid step (see §3.3). | H: bounce in 5 seconds | Bounce, scroll past 1st screen, form start |
| **Landing, education** | Understand why this matters (cold) or confirm and jump (warm) | "Pasien saya kan datang dari Instagram dan Google Maps." | Pace what they already do, then lead to the new place patients ask. Show the report. Answer objections. Repeat CTA. | M: cold readers stop scrolling before the price and report sections | Section reach (scroll depth), CTA click by position |
| **Website field + submit (J01 → J02)** | Start the check without effort | "Website saya jelek / nggak punya website" | Accept website **or Instagram** (say so in the placeholder and in the microcopy). Clear error text. | M: clinics with only Instagram or only a Maps listing think they can't use it (Maps links are not accepted) | Form start → submit rate, validation errors |
| **Free check (J02–J04)** | See that Nuave found my clinic | "Lama banget" | Already good: three progress lines, "Biasanya kurang dari 10 detik", way out after 30 s, waiting-bubble that shows how patients ask. | L–M: slow websites (decision 2026-10-18 retries) | Free check completed / started; slow-path rate |
| **Business card (J05)** | Confirm it's my clinic | "Kok cuma ini? Mana hasil AI-nya?" | Card says "Hasil audit belum ada di sini" (good). The landing must have already said this, so it is a confirmation, not a surprise. | **H if the landing over-promised (P1)** | "Ya, ini bisnis saya" / J05 views |
| **Three steps (J06)** | See what's left and the price | "Rp99.000 untuk apa persisnya? Ribet nggak?" | Shows 3 steps and "Rp99.000 untuk satu audit, tanpa pajak atau biaya tambahan". | M | J06 → checkout |
| **Order + email (J07)** | Give an email safely | "Nanti di-spam? Email untuk apa?" | "Untuk pembayaran, akses laporan, dan info pesanan." Good. Add one line on no marketing emails if true **[FOUNDER/S5]**. | M; **H while gated (P5/P6)** | Order created / J07 views; "Audit tidak tersedia" count |
| **Payment (J08 → Midtrans)** | Pay quickly with a familiar method | "Aman nggak? Kalau gagal, uang saya?" | QRIS, transfer bank, GoPay, DANA shown; Midtrans named; total Rp99.000; refund line `[KONFIRMASI S5]`. | H: first payment to an unknown brand | Payment success / payment started; failure reasons by state |

#### 1C. After payment

| Step | Visitor's goal | Main doubt | What the product must do | Drop-off risk | Metric |
|---|---|---|---|---|---|
| **Paid reading (J09)** | Feel the payment started real work | "Sudah bayar, terus?" | Starts by itself; shows what it found (20–40 s). | L | Reading completed |
| **Clinic details, Step 2 (J10–J26)** | Finish quickly and correctly | "Banyak banget pertanyaannya"; "Pesaing saya siapa ya?" | Prefilled answers, tap to confirm, skip allowed for competitors ("Belum tahu"). Landing should say "sebagian besar sudah kami isi" so this is expected. | M: paid users abandon mid-intake (paid but no report = support and refund load) | Intake completed / paid; median active minutes; corrections count |
| **10 questions (J27–J28)** | Check questions sound like real patients | "Pertanyaannya nggak relevan" | Editable; final start sheet warns it can't be changed. | L–M | Questions approved / intake completed; edit count |
| **Running (J29)** | Know it's working, know I can leave | "Harus nunggu di sini?" | "You can close the tab, report comes by email." | L | Run completed / started |
| **Report email (J31)** | Find it and trust it | "Masuk spam?"; "Ini phishing?" | From Tim Nuave, support@nuave.ai; one button. The landing should name the sender so the email is expected. | M: email in Promotions/Spam | Report link opened / delivered |
| **Report (J32–J35)** | Understand the result in one minute | "Jadi saya bagus atau jelek?"; "Kenapa klinik sebelah disebut?" | Hasil singkat first, answers with sources, analysis, actions, limits. | M: reads, nods, does nothing | Report opened, scroll to "Yang dapat dilakukan", PDF downloads |
| **Share with owner/team** | Show it in a meeting | "Link-nya pribadi, jangan diteruskan" | Download PDF is the share tool (P8). | M | PDF downloads per report |
| **Act** | Fix the first thing | "Mulai dari mana?" | One to ten actions tied to evidence, first one first. | H (unmeasurable today) | Manual: founder follow-up at 2 weeks ("did you change anything?") |
| **Re-check at 6–8 weeks** | See if anything moved | "Bayar lagi?" | There is no reminder mechanism today. See §8. | H: nobody remembers | Re-check orders / delivered reports from 6–8 weeks before |
| **Referral** | Tell a fellow owner or the agency | "Malu kalau hasilnya jelek" | Nothing exists today. See §8. | H | `src=ref` sessions |

**Where I expect the funnel to leak most, in order:**
1. Landing first screen (cold traffic does not get it in 5 seconds).
2. Business card → order: the "where is the AI result?" moment plus a Rp99.000 ask from an unknown brand with no social proof.
3. Payment (first-time trust).
4. After report: no action, no re-check, no referral (lifetime value and word of mouth).

---

### 2. Segments and message match

| Segment | Arrives knowing | Needs from the page | Where they should land | Hero emphasis |
|---|---|---|---|---|
| **Outreach** (warmest, the main channel until G1) | One real finding about their clinic, from Yasir personally | "This is the same person/thing", trust, the full picture (10 questions, sources, competitors named), price, a fast path to the form | Top of page with form in view | "Anda sudah lihat satu jawaban. Lihat sepuluh." |
| **Social / content** (cold, curious) | Nothing, maybe the post's scene | Education: the new behaviour, why it matters, how it works, proof of format | Top; must scroll | The tension and the scene |
| **Paid ad** (cold, impatient) | The ad's one image or line | Instant match with the ad, then the shortest route to the form and the price | Top; form in first screen | The ad's question repeated |
| **Referral** (warm) | "My friend/agency said check this" | Confirmation of what it is, price, the report sample | Top; "Contoh laporan" is their second click | Same as default |

**Recommendation [FOUNDER decision]: one page, one optional hero variant by link parameter.**

- **Option A, one page for all.** Simplest. Outreach visitors scroll past education they don't need, but the form is in the first screen and the sticky CTA covers them. Choose this if engineering time is tight.
- **Option B (recommended), one page + `?src=` parameter that swaps only the hero subtitle and one line above the field.** For example `?src=wa` or `?src=ob` (outbound) shows: "Anda sudah melihat satu jawaban AI tentang klinik Anda. Nuave menanyakan 10 pertanyaan seperti pasien, lalu menunjukkan semuanya." Same headline, same form, same everything below. Cheap (static text switch), keeps message match for the main channel, and gives us a clean segment in analytics.
- **Option C, personalised hero with the clinic's name or the observed question.** Strongest match, but: the clinic name or website in a URL ends up in logs, referrers and screenshots, and the analytics rule forbids source URLs and brand names in events. If wanted later, use an opaque short code mapped on the server, never the name in the URL. Not before G1.

Rule for all options: **the parameter must never carry the clinic's name, website, email or phone.** Only a channel code.

Message-match requirement for outreach: the outreach message and the landing must use the same words for the same thing ("10 pertanyaan seperti pasien bertanya", "AI buatan OpenAI, pembuat ChatGPT", "Rp99.000 sekali bayar"). Give Yasir a 3-line outreach template that mirrors the hero once the copy is final.

---

### 3. Landing page conversion requirements

These are requirements, not copy. The copywriter and designer choose the words and layout; growth will check each item in the round-2 review.

#### 3.1 Above the fold (390 × 844 phone, before any scroll)

**Must have, all visible without scrolling:**
1. A headline that a clinic owner recognises as about **their clinic and their patients** (the word *klinik* or a clinic scene, not "bisnis").
2. One sentence that says what Nuave does in plain words: asks AI 10 questions like patients do, shows whether the clinic is named.
3. The website field (placeholder says website **or Instagram**) and the primary CTA button.
4. One line of microcopy under the button that sets the free/paid split honestly (see 3.3). Not "Pratinjau gratis".
5. The "Contoh laporan" entry in the top bar.

**Must not:**
- Use a hero image that pushes the field below the fold. Today the 290px illustration does exactly that on shorter phones: in the current screenshot the field starts at about 575px and the button ends at about 690px (CSS pixels). Fine on a 390×844 screen, but on a 360×640 Android the button is below the fold. Requirement: **field and button visible at 360×640.** Shrink or crop the art, or put the visual below the form.
- Mention ChatGPT in a way that implies Nuave tests ChatGPT. "AI buatan OpenAI, pembuat ChatGPT" near any claim about what Nuave tests.

**5-second test pass criteria** (see §6.1): after 5 seconds, at least 4 of 5 clinic owners can say (a) it checks whether AI names my clinic, (b) I type my website, (c) it costs money at some point. If (c) fails, the price is too hidden; if (a) fails, the headline is too clever.

#### 3.2 CTA strategy

| CTA | Where | Label (requirement) | Behaviour |
|---|---|---|---|
| **Primary** | Hero, under field | Test candidate "Cek klinik saya di AI"; control "Cek bisnis saya di AI" (settled). Pick one for launch **[FOUNDER]**; my recommendation is the clinic version on this page because it is the page's whole promise. | Submits the field |
| **Secondary** | Top bar, and inside "Yang Anda terima" / report section | "Contoh laporan" | Opens the sample report sheet. Must never compete visually with the primary (outline/pill vs filled). |
| **Sticky mobile CTA** | Bottom of viewport, appears **after the hero field scrolls out of view**, hides when the hero field or the final CTA block is on screen, and hides while the keyboard is open | Same label as primary, plus price in small text ("Rp99.000 setelah cek gratis") | Scrolls back to the hero field and focuses it (the current `toForm()` behaviour). It should not open a second form. Height ≤ 64px plus safe-area; never covers the "Contoh laporan" sheet. |
| **Repeats** | After "how it works", after the report/price block, and the final CTA after the FAQ | Same label. Each repeat gets a different one-line *reason* above it (Harry Dry: remind why, don't just repeat the button) | Same scroll-and-focus |

Rules:
- One action name everywhere. Do not mix "Mulai", "Coba", "Audit sekarang".
- No more than one CTA per screen-height in the long section; the sticky bar already covers the gap.
- The CTA must be a call to value plus an answer to the main hesitation, e.g. label + microcopy "Gratis untuk memastikan klinik Anda. Bayar hanya kalau lanjut."
- Track every CTA with its position (§5).

#### 3.3 Expectation management (highest-risk item)

The visitor must know **before tapping**:
1. **Step 1 is free and confirms the clinic** (name, logo, description). It is *not* an AI answer.
2. **The AI audit is the paid step: Rp99.000, once**, after the clinic is confirmed.
3. What happens after paying: they confirm details (mostly prefilled), check 10 questions, and the report comes by email from Tim Nuave (support@nuave.ai). Delivery time `[KONFIRMASI]`.

Required in three places, in consistent words: hero microcopy, "Cara kerjanya" (three steps with "Gratis" and "Rp99.000" tags on the steps), and the price section. The designer should tag step 1 visibly "Gratis" and step 2 "Rp99.000".

Banned: "pratinjau", "lihat hasil gratis", "cek gratis apakah AI menyebut klinik Anda", or anything that implies a free AI result. If we want a free AI taste, that is a product decision (§8.1), not copy.

#### 3.4 Trust stack without social proof

We have no customers, logos, testimonials, ratings or results, and must not invent them. Believability comes from these, in rough order of strength:

1. **Show the real report format** with a fictional clinic, labelled "Contoh tampilan. Nama klinik fiktif." The two exact count labels, one full question and answer with a source link, "bisnis lain yang disebut" as Klinik A/B, one action. This is our substitute for social proof. It should be visible *inline* on the page (not only in a sheet), around the middle.
2. **Method transparency**: 10 questions in Indonesian, written like patients ask, AI buatan OpenAI with web search, date of the run, answers shown in full "apa adanya", sources listed.
3. **Candour**: "Bukan peringkat. Bukan jaminan. Satu potret pada satu waktu. Jawaban AI bisa berubah." Owners who are sceptical of digital salespeople trust the vendor who says what it can't do.
4. **A real person**: founder's note with name and photo `[KONFIRMASI]`, and a real contact (support@nuave.ai). No WhatsApp number unless one exists and is staffed.
5. **Payment familiarity**: QRIS, transfer bank, GoPay, DANA, "diproses Midtrans", "tanpa langganan", "tanpa biaya tambahan".
6. **Privacy for clinics**: "Kami tidak meminta data pasien. Kami hanya membaca informasi publik klinik Anda." This matters more for clinics than for other SMBs.
7. **The regulation tension** done carefully (F6): shows we understand their world better than a generic SEO agency.
8. **Cited facts** (F1–F4 only) with sources in small text beside each number.

Not allowed: invented counts ("100+ klinik"), "dipercaya oleh", trust badges we don't hold, star ratings, "as seen in".

#### 3.5 Pricing presentation and anchoring

- State the price **plainly and early**: in hero microcopy and in "Cara kerjanya", then a dedicated price block. Hiding it until checkout increases the J05→J07 drop and feels like a trap.
- Show it as "Rp99.000, sekali bayar" with "Tanpa langganan. Tanpa biaya tambahan."
- **Anchor honestly without invented numbers.** Options, in my order of preference:
  1. *Reader's own number*: "Berapa nilai satu pasien baru untuk klinik Anda? Rp99.000 untuk tahu apakah AI menyebut klinik Anda saat pasien bertanya." The reader supplies the anchor, so nothing is invented.
  2. *Effort anchor*: what it would take to do it yourself properly: write 10 patient-style questions, ask each one, record every answer and source, list every other clinic named, then work out what to fix. True, and it answers the "I can ask ChatGPT myself" objection.
  3. *Familiar spend, no figure*: "kurang dari biaya satu kali boost Instagram" only if the founder confirms a typical figure and is happy with it **[FOUNDER]**; otherwise skip. No specific rupiah comparison unless sourced.
- Itemise the Rp99.000 in the price block (what you get list), next to the report visual. Price next to proof, never alone.
- No discounts, strike-through prices, "harga perkenalan" or countdowns (ethical lines in the brief; also we can't test anchors honestly yet).

#### 3.6 Risk reversal

- Refund line: `[KONFIRMASI S5]` placeholder. Draft terms propose a full refund if cancelled before the audit starts. Design a slot for one line under the price and in the FAQ; the copy goes in only when S5 approves it.
- Until then, reduce risk with *process* reassurance, which is true today:
  - "Bayar setelah klinik Anda kami temukan" (payment comes after the free confirmation).
  - "Kalau ada masalah dengan laporan, balas email atau tulis ke support@nuave.ai."
  - "Audit berjalan di server. Anda boleh menutup halaman."
- Never say "garansi uang kembali" or "jaminan" before S5.

#### 3.7 Structure of long-form education

Cold readers must keep scrolling; warm readers must be able to skip. Requirements:

1. **Form in the hero, sticky CTA after it.** Warm readers never need to scroll to act.
2. **A "jump bar" or short contents line** right under the hero for warm readers: e.g. three chips "Kenapa ini penting", "Contoh laporan", "Harga". Optional, test candidate (backlog T9).
3. **Every section opens with a one-line headline that carries the argument by itself.** Reading only the section headlines top to bottom must tell the whole story (skimmer test, §6.4).
4. **Slippery slide**: each section ends with a line that pulls into the next (question or tension), not a summary.
5. **Visual every 1–1.5 screen heights** (chat scene, AI short list, report snippet, path from answer to booking). Text-only stretches longer than 1.5 screens on mobile will lose cold readers.
6. **Show the report by the 40% scroll point.** Today's skeleton puts "What you get" at section 11 of 17, roughly 60–65% down. Requirement: a small report teaser (the two counts, one answer) appears early, ideally right after "The new behaviour" or "Why it matters", with the full section later. Proof should not wait behind nine sections of education.
7. **Merge where possible.** Sections 4–7 of the skeleton (intent, ChatGPT/AIO, clinics are different, blind spot) risk feeling like four versions of "this is important". I'd like the copywriter to justify keeping all four or merge to three. Target total length: **≤ 12 phone screens** to the final CTA (excluding footer). Anything beyond is cut, collapsed, or moved into the FAQ.
8. **Collapse depth, don't delete it**: FAQ as accordions; source notes in small text; "Tentang metode" expandable.
9. **CTA blocks at natural decision points**: after the reader has the problem (after blind spot), after proof (report + price), and at the end.

#### 3.8 Mobile and page-speed constraints

- Design at 390 first; verify at **360×640** (common Android) and 320 width.
- **Budget: ≤ 500 KB transferred on first load, LCP ≤ 2.5 s on a mid-range phone on 4G** (2.5 s is Google's "good" Core Web Vitals threshold, a public benchmark, not a Nuave figure). Today ≈ 315 KB and ≈ 1.9 s on a fast connection, so the rewrite has about 185 KB to spend.
- Hero visual: one optimised WebP/AVIF, or CSS/SVG; no video, no autoplay, no Lottie in the hero. Below-the-fold art lazy-loaded.
- Fonts: no new web fonts.
- Interactive module (clinic type × city → example questions): static templates in the page bundle, no API call, under 10 KB, and labelled "Contoh pertanyaan".
- Tap targets ≥ 44px; field font ≥ 16px (prevents iOS zoom on focus); no horizontal scroll.
- Readable in bright light: body text contrast WCAG AA.
- Respect `prefers-reduced-motion` for the reveal animations.
- Open Graph image and title for link previews (P3).

#### 3.9 Objections, in the clinic owner's words

Each must be answered somewhere on the page (section or FAQ). Wording below is what I'd expect to hear; the copywriter adapts it.

| # | Objection (owner's words) | Answer belongs in |
|---|---|---|
| O1 | "Pasien saya datang dari Instagram dan Google Maps, bukan dari AI." | Section 2 (pace then lead) + 3 |
| O2 | "Saya bisa tanya ChatGPT sendiri, kenapa harus bayar?" | Price block + FAQ. Yes you can, and it's worth trying. Nuave asks 10 patient-style questions, records every answer and source, lists every other clinic named, counts, and says what to fix first, in a PDF you can show. |
| O3 | "Jawaban AI kan berubah-ubah. Hasilnya bisa dipercaya?" | Honest limits section: a snapshot, dated, all answers shown; that's why a re-check matters |
| O4 | "Klinik saya kecil. AI pasti cuma sebut klinik besar." | Section 8 (what AI reads): it reads public information; small clinics with clear facts can be named. No promise. |
| O5 | "Ini aman? Boleh nggak klinik promosi begini?" (advertising rules) | Section 6 + FAQ: Nuave doesn't advertise for you, it shows what AI says. Not legal advice. |
| O6 | "Apakah perlu data pasien?" | Trust stack + FAQ: no |
| O7 | "Kalau hasilnya jelek, terus apa?" | What you get: actions tied to evidence, first one first |
| O8 | "Rp99.000 terus bulanan?" | Price: sekali bayar, tanpa langganan |
| O9 | "Kalau sudah bayar tapi gagal?" | Risk reversal `[KONFIRMASI S5]` + support email |
| O10 | "Berapa lama? Saya sibuk praktik." | How it works: a few minutes of tapping, then close the tab; delivery `[KONFIRMASI]` |
| O11 | "Website saya jelek / cuma punya Instagram." | Field microcopy + FAQ: website or Instagram both work |
| O12 | "Ini ngukur Google AI juga?" | FAQ: no. Nuave tests AI buatan OpenAI. Google's AI answers are explained for context only. |
| O13 | "Siapa di balik Nuave?" | Founder's note |
| O14 | "Bisa ganti klinik / cabang?" | FAQ: one audit = one clinic (one branch picked in Step 2) |
| O15 | (marketing team) "Saya harus jelasin ke owner." | What you get: PDF for the meeting |
| O16 | "Ini bilang klinik saya lebih buruk dari klinik sebelah?" | Honest limits: not a ranking, no judgement of clinical quality |

---

### 4. Persona checks

#### Clinic owner
| Must believe before clicking | Delivered by |
|---|---|
| Patients really do ask AI about clinics like mine, with full questions | Sections 3, 5 (F1, F2, F4 with sources) |
| Those patients are close to booking | Section 4 |
| I can't see this anywhere I already look | Section 7 (blind spot) |
| It's about my clinic's name being chosen, not "tech" | Hero + section 4 reframe |
| What I get is concrete and readable | Report teaser (early) + section 11 |
| It's honest, not hype | Section 13 limits, founder's note, cited facts |
| It's cheap enough to just find out, and safe to pay | Price block, payment methods, risk line |
| It's quick and doesn't need my patients' data | How it works, trust stack |
| The first tap is free and just confirms my clinic | Hero microcopy, how it works |

#### Clinic marketing team
| Must believe before clicking | Delivered by |
|---|---|
| This is a new channel, and I'll look sharp for finding it first | Sections 3, 5, 7 |
| The result is something I can put in front of the owner | Section 11 (PDF, two counts, sources) |
| It gives me actions I can actually do (website, Maps, directories) | Section 8 + "Yang dapat dilakukan" sample |
| It names the clinics we lose to | Section 11 ("bisnis lain yang disebut") |
| It won't make me look bad if the result is low | Section 13 framing: a starting point and a re-check |
| I can justify Rp99.000 without a budget meeting | Price block |

**Requirement:** add one short line or card addressed to the marketing team (e.g. "Mengelola marketing klinik? Bawa PDF ini ke rapat."), near the report section. One line, not a separate section.

---

### 5. KPI tree and instrumentation

#### 5.1 KPI tree

**North star (now):** *paid clinic reports opened per week.* (Paid alone misses delivery problems; opened proves value reached the customer.)

```
Paid reports opened / week
├── Landing sessions (by src: ob, wa, ig, li, ads, ref, direct)
│   └── × Form start rate   (field focused or CTA tapped / sessions)       ← landing copy + design
│       └── × Free check completion   (business card shown / submits)      ← product, website speed
│           └── × Confirm rate   ("Ya, ini bisnis saya" / card shown)       ← expectation set by landing
│               └── × Checkout reach   (J07 shown / confirmed)              ← price clarity on J06
│                   └── × Order created   (order OK / J07 shown)            ← email trust; gates P5/P6
│                       └── × Payment success   (paid / orders)             ← payment trust
│                           └── × Intake completed → questions approved → delivered → opened
└── Secondary: PDF downloads per report; re-check orders; referral sessions
```

**Leading indicators per step**

| Stage | Leading metric | Healthy signal (my working target, to be replaced by data) |
|---|---|---|
| Landing | Form start rate; % reaching report teaser | Set after the first 200 sessions; no target invented |
| Landing | Contoh laporan opens / sessions | Opens that then start the form is a strong buying signal |
| Free check | Completed / submitted; slow path used | Slow path < 20% |
| Card | Confirm rate | Low rate = wrong business found or "where's the AI?" surprise |
| Checkout | Order created / checkout shown | Watch "Audit tidak tersedia" count separately |
| Payment | Paid / order created; method mix | Failure reasons by state |
| Delivery | Delivered / paid; minutes from approval to email | Every non-delivery is a support case |
| Value | Opened / delivered; PDF / opened | Opened < 80% = email deliverability problem |

#### 5.2 Events to log

Privacy rules (from `AGENTS.md` and `events.ts`): no email, phone, name, website, Instagram handle, clinic name, source URL, answer text or payment data in analytics. Only event name, timestamp, random tab session id, screen/section id, channel code, and counts/booleans. The existing `emitIntakeEvent` allowlist pattern is the model to copy.

| Event | When | Allowed fields |
|---|---|---|
| `lp_viewed` | Landing renders | `src` (channel code only), `variant` (hero/CTA variant id), viewport bucket (`s/m/l`) |
| `lp_section_viewed` | A section is 50% visible the first time | `section` id (e.g. `s03_behaviour`) |
| `lp_cta_clicked` | Any CTA tapped | `position` (`hero`, `sticky`, `after_how`, `after_price`, `final`, `topbar`) |
| `lp_example_opened` | Contoh laporan opened | `position` |
| `lp_example_scrolled_end` | Reached the end of the sample sheet | — |
| `lp_faq_opened` | FAQ item expanded | `faq` id (e.g. `o02_chatgpt_sendiri`) |
| `lp_form_focused` | Field focused first time | `position` |
| `lp_form_submitted` | Valid submit | `kind` (`website` / `instagram`) |
| `lp_form_invalid` | Validation error shown | `reason` code |
| `lp_module_used` | Interactive example module used | `clinic_type` from the fixed list (not free text) |
| `check_completed` | J05 shown | `path` (`found` / `slow_named`), `ms` |
| `card_confirmed` / `card_changed` | J05 actions | — |
| `checkout_viewed` | J07 shown | — |
| `order_created` / `order_refused` | Order API answer | `code` (`ORDER_UNAVAILABLE`, `PREVIOUS_ORDER_ACTIVE`, ...) |
| `payment_started` / `payment_result` | Midtrans hand-off / return | `state` (paid, denied, cancelled, expired, failed, pending) |
| existing `intake_*` E1–E7 | Already defined | as in `events.ts` |
| `questions_approved`, `run_completed` | J28 / J29 | `edits` count |
| `report_opened`, `pdf_downloaded` | Report page | — |

Two cheap sources before any new tooling:
1. **The D1 orders table already holds order states** (created, paid, delivered). A weekly founder query gives the bottom of the funnel with no new analytics.
2. **For the landing, choose one [FOUNDER]:** (a) Cloudflare Web Analytics (cookieless, page views and referrers, no custom events, one small script); or (b) a tiny first-party `POST /api/e` beacon with a strict allowlist like `events.ts`, counted in D1. (b) gives CTA-position and section data, which is what our tests need; (a) is zero code. Either needs a line in the privacy policy (S5). I recommend (b) for the landing events only, because without `lp_cta_clicked` and `lp_section_viewed` none of the tests in §7 can be read.

UTM / `src`: use a single `src` parameter with a fixed list of codes. Strip it from the URL after reading (so shared links don't carry someone else's channel).

---

### 6. De-risking without real A/B tests

Realistic traffic before G1 is outreach-sized: tens of visitors a week, not thousands. So the job is to catch *big* problems with *small* samples. Each method below needs no live AI calls.

#### 6.1 Five-second test (5–8 clinic owners, 1 day)
1. Recruit: clinic owners or managers Yasir can reach (Track V contacts, friends of friends). Not marketers, not the team.
2. Show the mobile hero screenshot on a phone for exactly 5 seconds. Remove.
3. Ask, in Indonesian, and write answers verbatim: (1) Ini untuk apa? (2) Untuk siapa? (3) Kalau Anda ketuk tombolnya, apa yang terjadi? (4) Ada biayanya? (5) Kata apa yang paling Anda ingat?
4. Pass: ≥ 4/5 get (1) and (3) right; ≥ 3/5 mention money for (4). Fail any → rewrite the hero before round 3.
5. Repeat for the two strongest hero candidates (alternate which one goes first).

#### 6.2 Preference + reasoning test (same people, 10 minutes)
1. Show two hero versions side by side (or one after another, order alternated).
2. Ask "Mana yang membuat Anda ingin cek klinik Anda?" then "Kenapa?" The *why* is the data, not the vote.
3. Then ask them to read the whole page on the phone and **think aloud**; note the first point they say "oh" (insight) and the first point they would stop scrolling. Note which objection they voice first.
4. Record in a simple table: participant (no name, just P1..P8), clinic type, preferred, reason, stop point, objections. Keep it out of Git if it contains anything identifying.

#### 6.3 Painted door (until G1)
The free check costs nothing (no AI), so it is already a free intent signal. Before payment opens to outsiders:
1. **Option A (no product change):** run outreach to a landing link with `src=ob`. Count form submits and business cards confirmed. Anyone who reaches checkout and is refused gets a personal follow-up from Yasir. Tells us landing → confirm rates.
2. **Option B [FOUNDER, small product change]:** while gated, replace the refusal at J07 with "Audit untuk klinik dibuka [tanggal]. Kami kabari lewat email ini." plus a consent line. Measures checkout intent with an email, the strongest pre-launch signal we can get. Needs privacy wording and must not store emails in the browser (R-31).
3. Decide in advance: if fewer than ~1 in 5 of confirmed clinics leave an email at the painted door, revisit price presentation before launch. (This threshold is my judgement for a go/no-go, not a benchmark.)

#### 6.4 Heuristic scoring: LIFT model (1 hour, growth + copy + design)
The LIFT model (WiderFunnel's conversion framework, public) scores each page area on six factors: **Value proposition** (the driver), **Relevance**, **Clarity**, **Anxiety**, **Distraction**, **Urgency** (we only use honest urgency: "pasien sudah bertanya hari ini", never countdowns).
Protocol: each of the three roles scores each section 1–5 on all six, independently. Any section where two people give ≤ 2 on Clarity or ≥ 4 on Anxiety goes on the fix list. Plus two quick checks:
- **Skimmer test:** read only the headings top to bottom. Does the story hold?
- **Squint test:** blur the screenshot. Is the primary CTA the most visible thing in every screen that has one?

#### 6.5 Message testing through outreach replies
Outreach is our only channel with real volume and it doubles as copy research.
1. Write 2–3 opening lines that express different hero angles: *tension* ("Saat pasien tanya AI klinik gigi di Dago, klinik Anda tidak disebut"), *curiosity* ("Saya penasaran apa kata AI tentang klinik Anda, jadi saya tanya"), *competitor* ("AI menyebut lima klinik di Dago. Saya ingin tunjukkan yang mana").
2. Alternate them in strict rotation (1, 2, 3, 1, 2, 3) so day of week and clinic type spread evenly.
3. Log: angle, clinic type, reply yes/no, positive/neutral/negative, and the reply's first sentence (words owners use = copy material). Keep this log out of Git.
4. After ~30 messages per angle, a difference of roughly 2× in reply rate is worth acting on; smaller differences are noise at this size. The winning angle informs the hero test (T2).
5. Every objection in replies gets added to §3.9.

#### 6.6 Sample report review (Track V style)
Show the fictional sample report section to 3–5 owners and ask: "Apa yang Anda pelajari? Apa yang akan Anda lakukan? Apakah Anda bayar Rp99.000 untuk ini tentang klinik Anda?" If the sample doesn't make them want their own, the page won't either.

---

### 7. A/B test backlog

**Sample-size reality check.** Standard two-sided test, 95% confidence, 80% power, equal split (my arithmetic, not a benchmark):
- Baseline 5% → 10% (2×): about **430 visitors per arm**.
- Baseline 5% → 6.5% (+30%): about **3,800 per arm**.
- Baseline 1% → 2% (purchase-level, 2×): about **2,300 per arm**.

At outreach-scale traffic (assume 50–300 sessions a month, unknown until §5 exists), only **big swings on upstream metrics** (form start, CTA click, confirm rate) are readable, and even those take weeks to months. Purchase-level tests are not realistic before a paid channel runs. So:
- Test **big, different ideas**, not button colours.
- Use **form start rate** as the primary metric for landing tests, and watch purchase as a guardrail.
- Where an A/B split is impossible, run **sequential tests** (version A for two full weeks, then B for two weeks, same channels), accept the bias, and only act on large differences. Prefer a 50/50 split by session whenever traffic allows.
- Stop rules decided in advance; no peeking-and-stopping on a good day.

ICE = Impact, Confidence, Ease, each 1–10; score is the average. Ordered by ICE.

| # | Test | Hypothesis | Control vs variant | Primary metric | Expected | I | C | E | ICE | Sample reality |
|---|---|---|---|---|---|---|---|---|---|---|
| T1 | **Free-step microcopy** | Saying plainly that step 1 only confirms the clinic and the audit is Rp99.000 lowers early clicks a little but raises confirm → checkout → pay, because no one feels baited | "Pratinjau gratis. Audit Rp99.000, sekali bayar." vs "Gratis: kami pastikan klinik Anda dulu. Audit AI Rp99.000, sekali bayar." | Checkout reach / form submits (guardrail: form start) | Form start flat or slightly down; checkout reach up | 8 | 8 | 10 | **8.7** | Do this as a fix, not a test, if founder agrees. Test only if we want proof. |
| T2 | **Hero framing: tension vs question** | Cold clinic owners respond to their own patient's question more than to an abstract claim | "Pasien sekarang bertanya ke AI. Klinik Anda disebut?" vs a hero that opens with a real-looking patient question in a chat bubble ("Klinik gigi di Depok yang bisa cicil dan buka Sabtu?") and the line "AI menjawab dengan nama. Apakah salah satunya klinik Anda?" | Form start rate | Variant up | 9 | 6 | 7 | **7.3** | Needs ~430/arm for 2×. Sequential 2+2 weeks on outreach + social. Pre-screen with 6.1/6.2 first. |
| T3 | **CTA label** (required by brief) | "klinik" is the reader's word; it lifts clicks on a clinic page | "Cek bisnis saya di AI" (control) vs "Cek klinik saya di AI" | CTA click / sessions | Variant up, modestly | 4 | 6 | 10 | **6.7** | Expected lift is small, so not readable at our traffic for months. Recommend shipping the variant on judgement and keeping the test on the list for when ads run. Honest call. |
| T4 | **Early report teaser** | Showing the two counts and one answer by 30–40% scroll makes the paid step feel concrete and lifts form start among cold readers | Report only in section 11 vs mini teaser after section 3 plus full section later | Form start; % reaching teaser | Up | 8 | 7 | 7 | **7.3** | 2× plausible for cold traffic; sequential. |
| T5 | **Education length** | Cold visitors need the long story; warm ones don't care if it's there | Long (12 screens) vs short (6 screens: hero, behaviour, report, price, FAQ, CTA), same hero | Form start; checkout reach | Unknown direction (this is a real question) | 8 | 5 | 6 | **6.3** | Big swing, good candidate. Segment by `src`: expect long to win for social, short for outreach. |
| T6 | **Outreach hero variant** (`?src=ob`) | Acknowledging the finding they already saw raises form start for outreach visitors | Default hero vs outreach subtitle (Option B §2) | Form start, outreach only | Up | 7 | 7 | 7 | **7.0** | Outreach volume is small; read it qualitatively + sequentially. |
| T7 | **Price anchor format** | The reader's own "value of one new patient" anchor makes Rp99.000 feel small without invented numbers | Price stated plainly vs price + "Berapa nilai satu pasien baru untuk klinik Anda?" | Checkout reach → payment | Up | 6 | 5 | 9 | **6.7** | Purchase-level, unreadable before volume. Pre-test in 6.2 interviews. |
| T8 | **Sticky CTA** | A sticky bar after the hero raises CTA use on mobile without hurting reading | No sticky vs sticky after hero field leaves view | CTA clicks / sessions; scroll depth guardrail | Up | 6 | 7 | 8 | **7.0** | Click metric moves a lot; readable sooner. |
| T9 | **Jump chips under hero** | Warm readers who want proof jump straight to the report and price | None vs 3 chips (Kenapa penting, Contoh laporan, Harga) | Form start for warm `src` | Up | 5 | 5 | 8 | **6.0** | Small; low priority. |
| T10 | **Education format: story vs explainer** | A single patient story (one question, one answer, one booking path) keeps readers better than separate explainer sections | Sections 3–9 as separate explainers vs one continuous illustrated story | Reach of price section | Up | 7 | 5 | 4 | **5.3** | Expensive to build twice; do as a preference test (6.2) first. |
| T11 | **Interactive example module** | Picking clinic type and city to see example patient questions makes the behaviour personal and lifts form start | No module vs static module after section 3 | Form start among module users vs non-users; overall form start | Up | 6 | 5 | 6 | **5.7** | Self-selection biases the module-user comparison; judge on overall rate. |
| T12 | **Hero visual** | A chat screenshot (the patient's question and AI's short list) explains faster than an illustration of a clinic | Illustration vs mock chat (labelled fictional) | 5-second test comprehension; form start | Up | 7 | 6 | 7 | **6.7** | Do as 5-second test first; A/B only with ads. |
| T13 | **Founder's note position** | For a sceptical audience with no social proof, a real person near the price beats a note at the bottom | Note at end vs short founder block beside the price | Checkout reach | Up | 5 | 4 | 8 | **5.7** | Purchase-adjacent; slow. |
| T14 | **Regulation tension in hero** | The "you can't advertise as the best, but AI compares anyway" line is the one only Nuave can say; it lifts relevance for clinic owners | Hero without vs subtitle with the tension | Form start | Unknown; risk of feeling legalistic | 7 | 4 | 9 | **6.7** | Test in 6.1/6.5 first; legal wording needs founder sign-off. |

**Run order:** T1 (ship as a fix), then 5-second and preference tests on T2/T12/T14, then live sequential T2 → T4 → T5, with T8 and T3 shipped on judgement. T7 and T13 wait for paid traffic.

---

### 8. Beyond the landing page (all [FOUNDER] product decisions)

Ranked by expected funnel impact against cost.

| # | Fix | Why | Cost and risk |
|---|---|---|---|
| 8.1 | **Fix "Pratinjau gratis", the /faq page and the site title/OG image** (P1, P2, P3) | Removes three trust breaks before anything else | Small code and copy change. /faq needs S5 wording. No AI cost. |
| 8.2 | **Graceful capacity and gate message** (P5, P6): when an order is refused, say "Kuota audit hari ini penuh. Tinggalkan email, kami kabari besok" instead of "Audit tidak tersedia saat ini." | A refusal after the email field is the worst possible moment to lose someone | Small product change; needs privacy wording for storing an email for a callback. Raising the daily cap costs only the AI spend actually used (observed USD 0.14–0.20 per order), but raises worst-case exposure. |
| 8.3 | **Outreach personalisation without the product** | The sales motion already runs a few unnamed questions before contact. Send the observed question and a cropped answer as a screenshot in WhatsApp, then the landing link with `src=ob`. | No code. AI cost per prospect is the founder's existing outreach spend; keep within the named approvals. Never send a real clinic's name to anyone else. |
| 8.4 | **Share loop for the PDF**: a "Bagikan PDF ke pemilik/tim" button on the report that uses the phone's share sheet with the PDF file | The marketing-team persona needs to show the owner; the email forbids forwarding the link | Medium. Browser PDF generation is already there; share sheet for files works on most mobile browsers. Risk: the PDF travels further than intended; it already can via download. |
| 8.5 | **Re-check reminder**: an opt-in tick at checkout or on the report, "Ingatkan saya cek ulang dalam 6–8 minggu" | The report recommends a re-check; nothing makes it happen | Raw-MVP version: founder adds a calendar reminder by hand from the order list. Automated version needs consent wording, a scheduled email, and a re-check product decision (price, comparability). |
| 8.6 | **Clinic nouns in the journey** (P7): when the confirmed category is a clinic, say "klinik" and "pasien" in J05–J35 instead of "bisnis" and "pelanggan" | Keeps the landing promise continuous | Medium; the report labels are settled and exact, so this touches settled wording. Could be landing-only copy instead ("di laporan, klinik Anda disebut 'Bisnis Anda'"). |
| 8.7 | **Free look at one real AI question** before paying | The strongest possible "aha": seeing the clinic named or missing in one real answer | **High risk.** Costs real AI money per free visitor on an open public link with a USD 5 daily cap; needs a question generated from intake that today happens after payment; one answer out of ten is noisy and could mislead (named once ≠ visible, missing once ≠ invisible); may cannibalise the paid report. Safer versions: (a) outreach-only, pre-run by the founder (8.3); (b) a static, clearly labelled *example* of the question format for their clinic type and city (the landing module), no live call. Recommend (a) + (b), not a live free call. |
| 8.8 | **Post-report follow-up by the founder** at 2 weeks: "Apa yang sudah Anda ubah?" | Measures "act", the step we can't see; produces the first real evidence for the page later (with consent) | Founder time only. Any quote reused on the page later needs written permission and must be real. |
| 8.9 | **Referral line** in the report email footer or report end: "Kenal pemilik klinik lain yang perlu tahu ini?" with a `src=ref` link | Owners talk to owners; agencies serve several clinics | Tiny. No incentives or codes before G1 (incentives are promotions, and Permenkes context makes clinics wary of anything that looks like a scheme). |
| 8.10 | **Agency path** (later) | One agency can bring many clinics | Out of scope for raw MVP; note only. |

---

### 9. Open items for the orchestrator

1. Founder decisions requested: CTA label for launch (T3), hero variant by `src` (Option A/B), landing analytics option (a/b), painted-door message while gated, fixes 8.1 and 8.2 before any traffic.
2. Placeholders the page must carry until approved: delivery time `[KONFIRMASI]`, refund line `[KONFIRMASI S5]`, founder's note facts `[KONFIRMASI]`.
3. I will review copy v2 and lofi v1 against §3 (checklist), §4 (belief map) and run the LIFT scoring in §6.4.

---

# Part 2. Review of copy v2

> Reviewer: growth marketer, 24 October 2026
> Reviewed: copy v2 (an earlier draft of [`COPY.md`](./COPY.md)) against Part 1 of this file §3–§4 and the orchestrator's round 1 decisions (summarised in [`STRATEGY.md`](./STRATEGY.md)). I checked these product facts in the code: the price card's "Ringkasan ini berlaku 30 hari" (`order-screens.tsx:358`), the privacy page's patient-data line (`app/privacy/page.tsx:56`), the J05/J06 wording, and the report email.
> Proposed Indonesian wording is a suggestion. The copywriter decides the final phrasing.

### Verdict

This copy can carry a paid funnel. It answers all 16 objections, keeps the free/paid split honest next to every form, and the S11 report showcase is the strongest asset on the page. **Three things limit conversion:**

1. The hero hides the price where a 5-second reader won't see it.
2. The "I'll ask ChatGPT myself" answer in S9 can be turned against us, because Nuave also asks each question only once.
3. The price section has friction it doesn't need.

I also found **four lines with promise or accuracy risk**. They are small fixes.

---

### 1. §3 requirements: pass/fail checklist

| # | Requirement (Part 1 §3) | Result | Line that passes or fails |
|---|---|---|---|
| 3.1.1 | Headline is about *their clinic and patients* | **Pass** | H1 "Klinik Anda disebut AI, atau klinik sebelah?" |
| 3.1.2 | One sentence on what Nuave does | **Pass, but long** | The subtitle is 32 words, two sentences. That is too long to read in 5 s (see §3). |
| 3.1.3 | Field (website **or Instagram**) and CTA | **Pass** | "Website atau Instagram klinik" / "Cek klinik saya di AI" |
| 3.1.4 | Honest free/paid microcopy, no "pratinjau" | **Pass** | "Langkah pertama gratis: kami temukan klinik Anda dulu. Audit 10 pertanyaan Rp99.000, sekali bayar." |
| 3.1.5 | "Contoh laporan" in the top bar | **Pass** | Mobile pill |
| 3.1 | Field and button above the fold at 360×640 | **Design check (lofi)** | Copy allows it only if the eyebrow plus a 3-line H1 plus a 4-line subtitle fit above the field. At 360px I estimate the subtitle wraps to 5 lines. Trimming it (§7, change 1) makes this safe. |
| 3.1 | No implication that Nuave tests ChatGPT | **Pass** | Strip "AI buatan OpenAI"; meta title has no ChatGPT; S5 honesty strip; FAQ 3 |
| 3.2 | One action name everywhere | **Pass with a note** | The sticky button and the desktop top bar say "Cek klinik saya" (no "di AI"). That's fine for width, but treat it as one name, not a second action. |
| 3.2 | Sticky shows price | **Pass** | "Cek gratis dulu · Audit Rp99.000" |
| 3.2 | Each repeat has a different reason | **Pass** | S9 "Tidak ada yang memberi tahu Anda. Jadi lihat sendiri." · S12 "Bayarnya nanti, setelah Anda lihat klinik yang kami temukan." · S15 "Sepuluh pertanyaan. Satu laporan. ..." |
| 3.2 | CTA answers the main hesitation | **Pass** | S9's "Gratis dulu, karena kami perlu menemukan klinik Anda sebelum bertanya ke AI." This is the best microcopy on the page because it says the AI part comes later. |
| 3.3 | Free/paid stated in hero, how-it-works and price, in consistent words | **Pass** | Tags Gratis / Rp99.000; "Ini belum hasil AI." (S10); "Ini bukan hasil AI." (S12 free row); FAQ "Katanya gratis, kok bayar?" |
| 3.3 | What happens after paying (details, questions, email from Tim Nuave) | **Partial** | S10 covers details, questions, email and sender. **Missing: the email is asked *before* payment.** Nothing on the page says "masukkan email penerima laporan, lalu bayar". |
| 3.3 | Delivery time as `[KONFIRMASI]` | **Pass** | S10, FAQ 9 |
| 3.4.1 | Real report format inline, labelled fictional | **Pass (strong)** | S4 teaser plus S11 full mock; "Angka di contoh ini bukan hasil nyata." |
| 3.4.2 | Method transparency | **Pass** | S10 unnamed-questions callout; S11 "Tentang audit ini" |
| 3.4.3 | Candour | **Pass** | S13 is / is not |
| 3.4.4 | Real person and contact | **Pending** | S16 is mostly placeholders. It works only if Yasir fills at least one real beat and a photo. |
| 3.4.5 | Payment familiarity | **Pass** | "QRIS, transfer bank, GoPay, atau DANA, diproses Midtrans." |
| 3.4.6 | No patient data | **Pass, but overclaims** | S13 "Tidak kami minta, **tidak kami simpan**." The privacy page only asks people *not to enter* health data. We can't promise that nothing gets stored if someone types it (see §6). |
| 3.4 | No invented social proof | **Pass** | None found |
| 3.5 | Price stated plainly and early | **Pass** | Hero microcopy, sticky, S10 tag, S12 |
| 3.5 | Honest anchor, no invented figures | **Pass** | "Bandingkan dengan harga satu tindakan di klinik Anda sendiri." |
| 3.5 | Price next to proof | **Pass** | S12 directly after S11 |
| 3.5 | No discounts, countdowns, scarcity | **Pass** | |
| 3.6 | Refund slot as `[KONFIRMASI S5]`; process reassurance meanwhile | **Pass** | S12 support line plus the refund slot |
| 3.6 | No "garansi"/"jaminan" before S5 | **Pass, one soft spot** | S16 "Kalau ada yang keliru di laporan Anda, itu tanggung jawab kami." reads as a correction or refund commitment, and there is no approved process (D3/D5) yet. Mark it `[KONFIRMASI S5]`. |
| 3.7.1 | Form in hero, sticky after | **Pass** | |
| 3.7.3 | Skimmer test: H2s alone tell the story | **Pass** | The skimmer list reads as a story. S5's H2 is the weakest link: it is long and not about clinics. |
| 3.7.4 | Slippery slide between sections | **Pass** | Good endings: S8 "Masalahnya, jawaban itu tidak pernah sampai ke Anda." → S9 |
| 3.7.6 | Report proof by ~40% scroll | **Pass** | S4 teaser |
| 3.7.7 | Length ≤ 16 screens (orchestrator's decision overrides my ≤ 12) | **Lofi check** | Copy is 16% shorter than v1. S5 and S12 are where cutting would cost least. |
| 3.7.8 | Depth collapsed (FAQ accordions, sources small) | **Pass** | |
| 3.8 | Static module, labelled | **Pass** | "Contoh pertanyaan. Bukan hasil AI." |
| 3.8 | OG/meta copy | **Pass** | Title 40 characters, description 142 characters, OG brief readable at thumbnail size |
| 3.9 | O1–O16 answered | **Pass** | Part F map checked. O2 is answered but weakened (§2, S9). |
| 4 | Marketing-team line near the report | **Pass** | "Pegang marketing klinik? Bawa PDF-nya ke rapat dengan pemilik." |
| P7 | Prepare "Bisnis Anda" wording | **Pass** | S11 small line |
| P8 | PDF is the sharing tool | **Pass** | "Untuk dibagikan ke pemilik atau tim, pakai Download PDF." |

**Score: 30 pass, 3 partial or pending, 0 hard fails.** The partial items are fixed in §7.

---

### 2. LIFT scoring per section

Scale 1–5. For **Value proposition, Relevance, Clarity, Urgency**, higher is better. For **Anxiety and Distraction**, higher is *worse*. Urgency means honest urgency only. Scores are my own judgement; the orchestrator and designer should score independently and compare (Part 1 §6.4).

| # | Section | Value | Relev. | Clarity | Anxiety ↓ | Distr. ↓ | Urgency | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | Hero | 4 | 5 | 3 | 2 | 2 | 3 | The subtitle is too long for 5 s, and the price sits in small grey text |
| 2 | Pacing | 3 | 5 | 5 | 1 | 1 | 2 | Clean yes-set |
| 3 | New behaviour + module | 4 | 5 | 4 | 1 | 3 | 3 | Module has 6 × 8 chips. Keep the default preset visible, and don't let the chips push the next H2 off-screen |
| 4 | Intent + Pew + teaser | 4 | 4 | 4 | 1 | 3 | 3 | Three jobs in one section (anatomy, stat, teaser) |
| 5 | Two doors | 3 | 3 | 2 | 2 | **4** | 3 | **Weak.** Five numbers, three sources, two scopes (US, global), and a "we don't measure Google" strip |
| 6 | Clinics are different | 4 | 5 | 3 | **3** | 2 | 2 | The tension is unique, but it may raise "is this legal for me?" anxiety. FAQ 6 rescues it 8 sections later |
| 7 | What AI reads | 5 | 5 | 5 | 2 | 2 | 3 | Best section. The self-check works |
| 8 | Answer → booking | 4 | 4 | 4 | 1 | 2 | 3 | Good. The honest "tidak menjamin" line is in the right place |
| 9 | Blind spot + bridge | 4 | 4 | 3 | 2 | 2 | 4 | **Weak where it matters.** The DIY rebuttal contradicts the method (see below) |
| 10 | How it works | 4 | 4 | 4 | 2 | 2 | 2 | The email-before-payment step is missing |
| 11 | Report showcase | 5 | 5 | 3 | 1 | 3 | 2 | Dense, but it is the proof. The legend pins carry it |
| 12 | Price | 3 | 4 | 4 | **3** | **3** | 2 | **Weak.** Empty refund slot, "berlaku 30 hari", and an effort list with no payoff line |
| 13 | Limits | 3 | 4 | 5 | 1 | 1 | 1 | Does its job |
| 14 | FAQ | 3 | 5 | 4 | 1 | 1 | 1 | Good owner voice |
| 15 | Final CTA | 4 | 4 | 4 | 1 | 1 | 3 | Fine |
| 16 | Founder's note | 3 | 3 | 3 | 2 | 1 | 1 | Depends on placeholders being filled |

#### The three weakest sections, with fixes

I weighted these by closeness to the money: S12 is next to the price, and S9 holds the first CTA after the hero.

**Weakest 1: S12 Price (anxiety 3, distraction 3)**

- *Problem a:* "Harga di ringkasan pesanan berlaku 30 hari." is true (it is product copy at checkout), but on the landing page it raises a question nobody had: "will the price change?". **Cut it from the landing page.** Keep "Total. Tanpa pajak atau biaya tambahan. Tanpa langganan."
- *Problem b:* the effort anchor lists the work and then stops. The reader is left holding a to-do list. Add the payoff:
  > "Bisa juga dikerjakan sendiri: tulis 10 pertanyaan seperti pasien, tanyakan satu per satu, catat setiap jawaban dan sumbernya, daftar klinik lain yang disebut, lalu simpulkan apa yang dibenahi duluan. **Atau serahkan ke kami, Rp99.000.**"
- *Problem c:* until S5, the risk line is only "Ada masalah dengan laporan? Balas emailnya...". Lead with the strongest true reassurance, right above the button, and keep the reason line short:
  > Reason line: "**Bayar setelah klinik Anda kami temukan.**"
  > Small: "Ada masalah dengan laporan? Balas email laporannya, atau tulis ke support@nuave.ai."
- *Problem d:* the email step is invisible (see the §1 partial item). Add one small line: "**Email hanya untuk pembayaran dan link laporan.**" This must match the J07 text "Untuk pembayaran, akses laporan, dan info pesanan." Add "Tidak untuk promosi" only if S5 confirms it.

**Weakest 2: S9 Blind spot + bridge (clarity 3)**

- *Problem:* the DIY rebuttal says "itu satu jawaban, sekali. Jawaban AI bisa berbeda setiap kali ditanya ... Anda perlu bertanya berkali-kali". The S11 mock then says "masing-masing ditanyakan sekali". A sharp owner or marketing lead will spot it: "you also ask each question only once." It weakens our answer to O2 at the first CTA after the hero.
- *Fix:* argue the true difference, which is breadth plus recording plus analysis, not repetition:
  > "Boleh, dan layak dicoba. Tapi itu satu pertanyaan, dari satu cara bertanya. Pasien Anda bertanya dengan sepuluh cara: soal harga, jadwal, cicilan, dokter, lokasi.
  > Untuk melihat polanya, Anda perlu sepuluh pertanyaan seperti itu, menyimpan setiap jawaban dan sumbernya, mencatat klinik lain yang disebut, lalu membacanya dengan teliti. Itu pekerjaan kami."
  Keep "Jawaban AI bisa berbeda setiap kali ditanya" for S13 and the re-check, where it supports the re-check and doesn't undercut the audit. FAQ 2 already argues breadth, so align S9 to it.

**Weakest 3: S5 Two doors (clarity 2, distraction 4)**

- *Problem:* five statistics, three source blocks, a US scope and a global scope, a timeline, and a strip about what we *don't* measure, all on one screen and a half. Cold readers will skim it as "data section" and some will stop. It is also the one section whose H2 isn't about clinics.
- *Fix:*
  1. **One number per door.** Google: the two dates (F1, F2) only. ChatGPT: "Lebih dari 40 juta orang bertanya soal kesehatan ke ChatGPT setiap hari." Cut "1 dari 4" (it is a second way of saying the same thing).
  2. **Move the Pew 60% / 53% line to S3**, under the long question, as its proof: "Di satu studi di AS, pencarian 10 kata atau lebih memunculkan ringkasan AI di 53% kasus." It proves S3's "mereka bercerita" exactly. Or cut it. S4 already uses Pew.
  3. **Shorter H2 that is about patients:** "**Pasien Anda tidak perlu aplikasi baru. Jawaban AI sudah ada di Google.**" (copywriter to polish; keep "bisa" for accuracy, e.g. "...bisa muncul di Google").
  4. Keep the honesty strip, but word it positively first: "**Nuave menguji AI buatan OpenAI, pembuat ChatGPT, dengan pencarian web.** Ringkasan AI Google tidak kami ukur." The first clause is what we do; the limit follows.

**Also watch S6 (anxiety 3).** The regulation tension may make a careful owner wonder whether checking this is itself risky. Add one closing reassurance in S6, not only in FAQ 6: "**Membaca jawaban AI tentang klinik Anda bukan iklan. Itu cuma melihat.**" (founder to check the wording, together with the Permenkes line).

---

### 3. Five-second test prediction (hero)

What a clinic owner sees in 5 seconds, in order: H1 → visual → button → maybe the eyebrow. The subtitle (32 words) and grey microcopy are mostly not read.

| Question | Predicted correct | Why |
|---|---|---|
| (a) What is it? "Checks whether AI names my clinic" | **5/5** | H1 plus button say it twice |
| (b) What happens if I tap? | **2–3/5** say "it checks my clinic in AI right away". **1–2/5** say "it finds my clinic first" | The button "Cek klinik saya di AI" promises the end result. Only the microcopy, which 5-second readers rarely reach, says step 1 just finds the clinic |
| (c) Does it cost money? | **1–2/5** | Rp99.000 appears only in small grey microcopy |

**Prediction: passes (a), borderline on (b), fails (c).** Criterion (c) matters because people who don't expect a price drop off at J06/J07, and that is where the funnel is most expensive to lose them.

**Fix (cheap, keeps everything approved):**
- Put the price into the **method strip**, which is bold and scannable: "**10 pertanyaan seperti pasien · AI buatan OpenAI · Rp99.000 sekali bayar**". Move "Tanpa data pasien" into the microcopy: "Langkah pertama gratis: kami temukan klinik Anda dulu. Tanpa data pasien."
- Trim the subtitle to one breath (about 20 words): "**Pasien sekarang tanya AI dulu, baru chat admin. Nuave bertanya seperti mereka, 10 kali, lalu menunjukkan klinik mana yang disebut.**" "Apa yang perlu dibenahi duluan" is already carried by the method strip, S10 and S11.
- Then run the real 5-second test with 5–8 owners (Part 1 §6.1) on the lofi before round 3. I'd put money on (c) improving from about 2/5 to about 4/5 with the strip change.

---

### 4. Expectation management, end to end

**Every CTA:**

| CTA | Free/paid truth kept? |
|---|---|
| Hero | Yes (microcopy). Weak in 5 s, fixed by the strip change |
| S4 "Lihat contoh laporan" | Yes; the mock is labelled fictional |
| S9 bridge | **Yes, best on the page**: "Gratis dulu, karena kami perlu menemukan klinik Anda sebelum bertanya ke AI." |
| S11 button (scrolls to nearest form) | Yes, because the form it lands on carries microcopy. **Requirement for design:** the scroll target must be a form *with* its microcopy in view, not just the field |
| S12 price | Yes ("Gratis: cek klinik Anda dulu ... Ini bukan hasil AI.") |
| S15 final | Yes |
| Sticky | Yes ("Cek gratis dulu · Audit Rp99.000") |
| Desktop top bar "Cek klinik saya" | Yes, as long as it scrolls to the hero form |
| Outreach variant | Yes (same microcopy), but see the wording issue below |

**Lines that could make a visitor feel baited at J05–J07:**

1. **The button label itself.** "Cek klinik saya di AI" → J05 "Kami menemukan bisnis Anda ... Hasil audit belum ada di sini." The product handles this honestly, and the microcopy prepares it. Residual risk: low to medium, only for people who skip the microcopy. The strip change (§3) reduces it. Keep "Cek bisnis saya di AI" as the control for the label test anyway; both labels carry this risk equally.
2. **Step numbering mismatch.** The landing's three steps are 1 Gratis cek → 2 Rp99.000 details + questions → 3 report. The product's J06 "Tinggal 3 langkah" starts again at 1 with "Konfirmasi dan bayar". The visitor who thought they finished step 1 now sees "step 1" again. **Fix (product copy, founder):** J06 says "Tinggal 3 langkah lagi", or the landing names steps by name, not number. Low cost.
3. **Email before payment** is not mentioned on the landing (see §1). Add the S12 line, and in S10 step 2: "Masukkan email penerima laporan, bayar Rp99.000, lalu Nuave membaca website Anda..."
4. **Outreach variant:** "Anda sudah melihat satu jawaban AI **tentang klinik Anda**" may be untrue when the outreach finding was that the clinic was *not* named. The answer was about the area, not the clinic. And "Masukkan website atau Instagram klinik **yang kami hubungi**" reads cold and like a CRM. Suggest:
   > Subtitle: "Anda sudah melihat satu jawaban AI untuk pertanyaan pasien di area Anda. Nuave mengajukan 10 pertanyaan seperti itu, lalu menunjukkan semua jawabannya, dengan sumbernya."
   > Line above the field: "Lanjutkan dengan website atau Instagram klinik Anda."
5. **"/faq" is still stale** (funnel-v1 P2): it says payment isn't active. The footer "FAQ" link must point to the on-page FAQ (`#faq`) until `/faq` is rewritten. **Designer and founder.**
6. **S10 step 1 "Biasanya kurang dari 10 detik."** This matches the product, which has a 30-second way out. Fine.

---

### 5. Persona belief map check

#### Clinic owner

| Belief | Delivered? | Where |
|---|---|---|
| Patients ask AI about clinics like mine, with full questions | **Strong** | S3 plus module (own city), S5 |
| Those patients are close to booking | **Good** | S4 anatomy (Lokasi, Layanan, Cara bayar, Jadwal → Siap memilih) |
| I can't see it anywhere I look | **Strong** | S9 tiles |
| This is about being chosen, not tech | **Strong** | H1, S8 "Admin klinik yang mana?" |
| The result is concrete and readable | **Strong** | S4 teaser, S11 |
| It's honest, not hype | **Strong** | S13, sourced numbers, "Bukan jaminan pasien" |
| Cheap enough and **safe to pay** | **Weak** | No refund line yet, no real person yet (S16 placeholders), no social proof. Process reassurance exists but is quiet |
| Quick, no patient data | **Good** | S10 tags, FAQ 9. The delivery time is still a placeholder |
| First tap is free and only confirms the clinic | **Good on read, weak at 5 s** | See §3 |

#### Marketing team

| Belief | Delivered? | Where |
|---|---|---|
| A new channel; I'll look sharp for finding it | **Medium** | Eyebrow names them; S5 and S9 imply it. Nothing speaks to "being first" (fine, we avoid FOMO) |
| Something I can show the owner | **Strong** | S11 line, caption 6, PDF line |
| Actions I can actually do | **Strong** | S11 action mock (Penanggung jawab, Selesai ketika) is the best line for this persona |
| It names the clinics we lose to | **Strong** | S11 "Bisnis lain yang disebut" with relationship labels |
| **It won't make me look bad if the result is low** | **Weak / missing** | Nothing addresses it. A marketing lead deciding whether to run this on their own clinic fears a "3 dari 10" in front of the boss |
| I can justify Rp99.000 without a meeting | **Good** | S12 |

**Fix for the missing belief.** Add one line to the S11 marketing card or S13: "**Angka rendah bukan rapor merah. Itu daftar kerja pertama Anda, lengkap dengan buktinya.**" This is honest: the report is built to give actions, and the line makes the marketer the person who found the problem, not the cause of it.

**Fix for "safe to pay" (owner).** This depends on founder decisions (refund wording at S5, the founder's photo and one real beat in S16). From the copy side, move a two-line founder mini-block next to the price card, with photo or initials and name: "Yasir, pendiri Nuave. Ada masalah dengan laporan? Balas emailnya, saya baca." This is backlog idea T13. Only use "saya baca" if Yasir confirms he will.

---

### 6. Promise and falsifiability risks

| Line | Risk | Suggested fix |
|---|---|---|
| S13 "Tanpa data pasien. Tidak kami minta, **tidak kami simpan**." | A falsifiable promise we can't fully keep. If someone types patient data into a field, it is received. The privacy page only says "Jangan masukkan ... data kesehatan" | "Tidak kami minta, dan tidak diperlukan." |
| S16 "Kalau ada yang keliru di laporan Anda, **itu tanggung jawab kami**." | Reads as a correction or refund commitment before S5 and D3/D5 exist | Keep it as `[KONFIRMASI S5]`, or soften: "Kalau ada yang keliru di laporan Anda, balas emailnya. Kami periksa." |
| S3 "AI membaca semuanya, lalu menjawab **dengan segelintir nama klinik**." | Stated as always true. AI sometimes answers with general advice and no names | "...lalu **bisa langsung** menjawab dengan beberapa nama klinik." |
| S4 "Itu orang yang **tinggal memilih** klinik." | Interpretation stated as fact; can't be falsified | Acceptable as reasoning from the tagged question. Optionally "Itu orang yang **sudah hampir** memilih klinik." Low priority |
| S15 "...Anda **tidak perlu menebak lagi**." | "Lagi" implies an ongoing state. One audit is one snapshot, and answers change | "...Anda **sudah pernah membaca sendiri** jawabannya." or keep and rely on S13. Low priority |
| S11 mock action "Di Pertanyaan 4, AI memilih klinik lain **yang jelas buka Sabtu**." | Implies we know *why* AI chose. Fine in a fictional mock only if the real report talks this way | Check against a real "Mengapa" line. If the real report says "AI menyebut ... yang mencantumkan jam Sabtu", mirror that |
| S1 / S2 presuppositions ("Sekarang pasien tanya AI dulu", "pasien bertanya di satu tempat baru") | Universal claims with no Indonesian clinic data (F4 is global) | Accepted by the brief as honest presupposition. Note it for the founder; don't escalate |
| S7 small line "Klinik kecil tidak otomatis kalah." | A judgement, not a measurement | OK as phrased ("tidak otomatis"). It promises nothing. Approve |
| S12 "Harga di ringkasan pesanan berlaku 30 hari." | True, but distracting (§2) | Cut from the landing page |

There is **no promise of patients, revenue or ranking** anywhere. S8 and S13 explicitly deny it. Good.

---

### 7. Top 5 changes for copy v3, ranked by expected conversion impact

1. **Hero: price in the method strip, shorter subtitle.** Strip: "10 pertanyaan seperti pasien · AI buatan OpenAI · Rp99.000 sekali bayar". Move "Tanpa data pasien" to the microcopy. Subtitle about 20 words. *Why first:* it fixes the predicted 5-second failure on "costs money", reduces J06/J07 surprise for every visitor, and makes the 360×640 fold safe.
2. **S12 price: remove friction, add the payoff.** Cut "berlaku 30 hari"; end the effort anchor with "Atau serahkan ke kami, Rp99.000."; reason line "Bayar setelah klinik Anda kami temukan."; add the email line; a founder mini-block if Yasir agrees. *Why:* it is the section read right before the decision to pay.
3. **S9 DIY rebuttal: argue breadth, not repetition.** "Itu satu pertanyaan, dari satu cara bertanya. Pasien Anda bertanya dengan sepuluh cara..." *Why:* O2 is the most common objection to a Rp99.000 AI product, and the current answer can be turned against us at the first CTA after the hero.
4. **Close the two expectation gaps after the click.** Mention the email in S10 step 2; fix the outreach variant wording ("satu jawaban AI untuk pertanyaan pasien di area Anda"; "Lanjutkan dengan website atau Instagram klinik Anda"); flag J06 "Tinggal 3 langkah **lagi**" and the stale `/faq` footer link to the founder and designer. *Why:* outreach is the main channel before G1, and the J06 step restart is a small "wait, what?" right before the price.
5. **Persona and promise fixes in one pass.** Add the marketing-team line "Angka rendah bukan rapor merah. Itu daftar kerja pertama Anda, lengkap dengan buktinya."; S13 "Tidak kami minta, dan tidak diperlukan."; S16 "tanggung jawab kami" to `[KONFIRMASI S5]`; S3 "bisa langsung menjawab"; S5 cut to one number per door and the honesty strip worded positively first. *Why:* each one is small, but together they remove the only lines a careful owner or a reviewer could call untrue, and they unlock the marketing team as the person who forwards the page.

Next: run the 5-second and preference tests (Part 1 §6.1–6.2) on lofi v1 with the v3 hero before round 3. I'll score the lofi on part 2 with the same LIFT table.

---

# Part 3. Review of lofi v1

> Reviewer: growth marketer, 24 October 2026
> Reviewed:
> - lofi v1 (superseded by [`lofi.html`](./lofi.html)). I rendered it with Playwright: `#art-mobile` is 390 × 21,345 px and `#art-desktop` is 1440 × 15,767 px. I cut the mobile artboard into 844 px phone screens and blurred each one for the squint test.
> - The fold, outreach, sticky and OG frames.
> - [`LOFI.md`](./LOFI.md) and [`COPY.md`](./COPY.md) (locked).
>
> Screen numbers below are 390 × 844 phone screens counted from the top of the mobile artboard. The lofi shows 26 screens including the founder's note and footer, and 24.0 to the end of the final CTA, matching the designer's table.

### Verdict in one paragraph

The lofi is a good long-form control. The hero passes the fold, the proof comes early, and the price sits next to the report. **Length is not what most limits conversion now. Three hierarchy problems in the drawing do:**

1. On the two dark bands (S9 bridge, S15 final), the white field and the white button look identical when squinted at. The two forms that catch readers mid-page and at the end have no single dominant action.
2. The S10 journey crops draw *black filled* buttons ("Ya, ini bisnis saya", "Buka laporan") that look exactly like our primary CTA.
3. At the highest-intent moment, the S12 price card, the button only scrolls away to a form somewhere else.

All three are cheap to fix. I accept the cut plan with three changes and one addition, and I agree with ~20 screens as the long control.

---

### (a) The cut plan and the length target

**Target.** Accept **~20 screens (390 × 844) as the long-form control**. The ≤ 16 target was my proxy for "cold readers reach the proof and price before they give up". The lofi meets that intent another way:

- proof at about 18% of the page (the S4 teaser);
- the price in the bold hero strip and on the sticky bar on every screen;
- the bridge form at about 60%.

Removing more education would go against the founder's explicit direction without a measured reason. **T5 (long vs short) is the right first live test**, and §h outlines the short page.

**The eight cuts:**

| # | Cut | Verdict | Note |
|---|---|---|---|
| 1 | S4: drop the body that repeats the Pew numbers | **Agree** | The stat card carries the numbers, and the bold "Jawabannya sudah jadi pintu depan." stays |
| 2 | S10 step 2 to one paragraph | **Agree** | Keep "Masukkan email penerima laporan, lalu bayar." It is the expectation line I asked for |
| 3 | S3 module collapsed behind "Coba dengan klinik Anda" | **Agree, with a change** | Collapsed, the row must still **show one example question** (the Gigi + Depok preset) and the chevron. Otherwise the module becomes invisible and its job (make the behaviour personal) is lost. Suggested row: the label, then one grey bubble "Klinik gigi di Depok yang bisa pasang behel dan bisa dicicil, ada rekomendasi?", then "Ganti jenis klinik dan kota ▾". This costs about 0.15 screens back, net −0.55 |
| 4 | S5: ChatGPT door as text plus source, no chat mock | **Agree** | Right call. A horizontal swipe would hide the door that most owners have heard of |
| 5 | S7: mismatch pair plus checklist; source map only on desktop | **Agree** | The 17.00 vs 20.00 clash appears three times today (highlighted cards, pair chips, first checklist item). Once as the pair is enough |
| 6 | S11: "Tentang audit ini" collapsed | **Agree** | Keep its one-line summary visible in the collapsed row: "Tentang audit ini · 10 pertanyaan, masing-masing sekali, AI buatan OpenAI dengan pencarian web" |
| 7 | S12: founder mini-block hidden until confirmed | **Agree, but don't bank the saving** | This is the only real person near the price. If Yasir confirms it, it goes back in. I'd rather spend 0.2 screens here than anywhere else |
| 8 | S13: drop "Yang Nuave tunjukkan" on mobile | **Agree** | It repeats S11 and the price card's ticks |

**Addition.** Compact the **S10 journey crops** on mobile: 2.2 screens is the second-longest section.

- Show the step 1 (J05) and step 3 (J31) crops at about 70% height.
- Replace the step 2 crop (J25 detail list plus J27 question list) with a single strip of three "Ditemukan di website" rows and "+ 10 pertanyaan, bisa diubah".

That gives about −0.5. With the module change it comes to **about 20.3 screens**.

**Guardrail for any future cut:** never collapse or remove, on mobile:
- the S4 teaser;
- the S11 Hasil singkat, the one open answer or the one open action;
- the S12 card;
- the honest-limits crosses.

These are the conversion-carrying parts. Everything else is education the founder wants and T5 will price.

---

### (b) LIFT scoring of the lofi (visual hierarchy, not words)

Scale 1–5. For Value, Relevance, Clarity and Urgency, higher is better. For **Anxiety and Distraction, higher is worse**. Scored on what the eye does with the drawing.

| # | Section | Value | Relev. | Clarity | Anx. ↓ | Distr. ↓ | Urg. | What the drawing does |
|---|---|---|---|---|---|---|---|---|
| 1 | Hero | 4 | 5 | 4 | 2 | 1 | 3 | H1, then field, then black button. Clean order. The strip's dots are weak, but the bold text carries it. The visual starts below the fold, so the first screen is all text. Acceptable |
| 2 | Pacing | 3 | 5 | 5 | 1 | 1 | 2 | The dashed sixth tile reads instantly |
| 3 | Behaviour + module | 4 | 5 | 4 | 1 | **4** | 3 | Ten grey link rows plus 14 chips plus three bubbles. The chip grid is the busiest block on the page. Fixed by cut 3 |
| 4 | Intent + teaser | 4 | 4 | 4 | 1 | 3 | 3 | Three stacked cards (anatomy, stat, teaser) with the same frame weight. The teaser doesn't stand out as "this is what you get" |
| 5 | Two doors | 3 | 3 | 3 | 2 | **4** | 2 | Two mocks, a timeline, three source blocks and a framed honesty box. Fixed partly by cut 4 |
| 6 | Clinics different | 4 | 5 | 4 | 2 | 2 | 2 | The struck-through ad is a great visual. The reassurance box lowers anxiety |
| 7 | What AI reads | 5 | 5 | 4 | 2 | **4** | 3 | The source map, the pair and the checklist say the same thing three times. Fixed by cut 5 |
| 8 | Answer → booking | 4 | 4 | 5 | 1 | 1 | 3 | The four-node path is the clearest visual on the page |
| 9 | Blind spot + bridge | 4 | 4 | 3 | 1 | 2 | 4 | The dark band works, **but the field and button are both white boxes** (see c) |
| 10 | How it works | 4 | 4 | 4 | 2 | **4** | 2 | Black filled mock buttons compete with the real CTA. The crops are tall |
| 11 | Report | 5 | 5 | 3 | 1 | 3 | 2 | Strong proof, but 3.2 screens. The numbered labels help. The CTA arrives only at the end |
| 12 | Price | 4 | 4 | 4 | 2 | 3 | 2 | The big Rp99.000 is right. Four small grey lines under the button (methods, email, support, refund slot) form a block of fine print. The button is a scroll, not a form |
| 13 | Limits | 3 | 4 | 5 | 1 | 1 | 1 | Cross-marked card scans well |
| 14 | FAQ | 3 | 5 | 5 | 1 | 1 | 1 | Clean accordion |
| 15 | Final CTA | 4 | 4 | 4 | 1 | 1 | 3 | Strong band, but the same white-on-white field and button issue |
| 16 | Founder | 3 | 3 | 3 | 2 | 2 | 1 | Initials plus yellow placeholders. It works only once it is filled |

**Weakest by conversion weight:** S10 and S12 (the two closest to the money, both with fixable hierarchy problems), then S9/S15 (CTA contrast). S3, S5 and S7 are the busiest but are fixed by the cut plan.

---

### (c) Squint test and the sticky bar

Each screen was blurred with a 6 px Gaussian blur. Question: on every screen with a CTA, is the primary CTA the most visible thing?

| Screen | CTA | Most visible element when blurred | Pass? |
|---|---|---|---|
| 1 (S1) | Hero button | H1, then the black button block. The button is the heaviest solid shape | **Pass** |
| 5–6 (S4) | "Lihat contoh laporan" link | Anatomy card; the link is a secondary action, as intended | Pass (secondary) |
| 14–15 (S9 bridge) | Field + button on the dark band | **Two identical white rectangles.** The button can't be told from the field | **Fail** |
| 15–17 (S10) | none (crops) | The **black "Ya, ini bisnis saya" and "Buka laporan" pills** are the darkest shapes on screen. They look like CTAs and will get mis-taps | **Fail (false CTA)** |
| 20 (S11) | Black button | The button is the heaviest shape | **Pass** |
| 21 (S12) | Black button | "Rp99.000" at display size first, then the button. Fine for a price card | **Pass** |
| 24–25 (S15) | Field + button on the dark band | Same as S9: white field and white button are the same weight | **Fail** |
| Top bar | "Contoh laporan" outline pill | Correctly secondary | Pass |

**Fixes:**

1. **On dark bands, the button must be a different shape and colour from the field.** Use the filled production accent (violet) for the button and a white field, or keep a white button but make the field a dark-grey input with a light border. Pick whichever the hi-fi palette supports. The rule: in the blurred image, the button is the one shape that differs.
2. **Mock UI never uses the primary button style.** Inside crops and mocks, draw buttons as light-grey fills with grey text, inside a thin device or screen frame. In production, the crops are images, not interactive, and they must not look tappable.

**Sticky bar (390 × 844 frame at S6):**

| Check | Result |
|---|---|
| Height 64 px, clear of content, top border and shadow | Pass |
| Left text "Cek gratis dulu · Audit Rp99.000" keeps the free/paid truth | Pass |
| Button "Cek klinik saya" (short form of the main label) | Pass. The width makes this sensible |
| Hides while a form is on screen and while the keyboard is open | Pass, as specified |
| **Also hide while the S11 or S12 primary button is on screen** | **Add.** Otherwise two identical black buttons stack at the bottom of screens 20–21 |
| Safe area | Add `env(safe-area-inset-bottom)` padding in the build note (iPhone home bar) |
| Left text contrast | In the frame it is about 12 px grey-black. Keep ≥ 12 px and AA contrast in hi-fi |
| Tap target | The button is ~48 px tall. Pass |

---

### (d) Fold and above-the-fold check

| Frame | Field | Button | Microcopy | Strip incl. price | Verdict |
|---|---|---|---|---|---|
| 360 × 640 (drawn) | ✓ (top 337) | ✓ (bottom 461) | ✓ (509) | ✓ (ends 609) | **Pass as drawn** |
| 390 × 660 (drawn) | ✓ | ✓ | ✓ | ✓ (577) | **Pass** |
| 360 × 640 **inside the Instagram/WhatsApp in-app browser** (my estimate: about 60–80 px lost to browser chrome, so the visible height is about 560–580 px) | ✓ | ✓ | ✓ | **Third strip line at risk.** At 360 the strip wraps one fact per line, and "Rp99.000 sekali bayar" is the *last* line (about 577–609) | **Borderline** |
| Outreach variant (390 frame) | ✓ (~485–540) | ✓ (~553–609) | ~650 | Strip below the fold | **Price below the fold** |

**Fixes:**

1. **Reorder the strip so the price comes first:** "Rp99.000 sekali bayar · 10 pertanyaan seperti pasien · AI buatan OpenAI". This only changes the order of locked copy. The price is the fact a 5-second reader most needs and is least likely to see anywhere else above the fold.
2. **Outreach variant:** drop or merge the extra line above the field ("Lanjutkan dengan website atau Instagram klinik Anda.") so the strip climbs about 50 px. The placeholder already says it. If the founder wants the line kept, put it *as* the field placeholder.
3. The hero visual sits entirely below the fold at 360 and at 390 × 660. That's accepted (form first). Make sure its top edge (the chat bubble's frame) peeks above the fold at 390 × 844, so readers see there is something to scroll to. It does at about 620 px today. Keep it.

---

### (e) Proof placement and trust-stack visibility

| Item | Where (mobile) | Verdict |
|---|---|---|
| **S4 report teaser** | Screens 5–6, about 18–22% | **Pass, well before 40%.** Visual tweak: give the teaser card the *report* look (a white card with a slight shadow and the "AI VISIBILITY REPORT" label) instead of the same dashed frame as every other mock, so it reads as "the product" and not "another illustration". Make "Lihat contoh laporan" a full-width secondary button (outline), not an underlined link. It is the only action in screens 2–13 apart from the sticky bar |
| **S11 report** | Screens 18–21 now; about 15–18 of 20 after the cuts | Pass. The price follows directly (good). Move the **S11 primary button up**: place it right after "Yang dapat dilakukan" (the action is the most persuasive part), and keep the marketing card and small lines after it. That saves a full screen of scrolling between peak conviction and the button |
| Method transparency | S10 callout, S11 "Tentang audit ini" | Pass |
| Candour | S13 crosses | Pass |
| **Payment familiarity** | S12, a 12 px grey line under the button | **Too quiet.** Show QRIS, transfer bank, GoPay and DANA as a row of four small outlined chips (names only, no logos unless permitted), plus "diproses Midtrans". Familiar payment names lower first-purchase anxiety more than any sentence |
| Real person | S12 mini-block (hidden until confirmed), S16 at screen 25 | **Weak.** On mobile no human appears before the last screen. If Yasir confirms, restore the S12 mini-block first; it is worth more than the S16 note |
| Contact | S12 small line, FAQ footer | Pass |
| "Tanpa data pasien" | Hero microcopy, S10 small line, S13 | Pass |
| Sources beside numbers | S4 stat card, S5 | Pass |
| Fictional labels | Every mock | Pass |

---

### (f) Desktop issues

1. **No sticky CTA on desktop.** Make the top bar sticky (logo, anchors, "Cek klinik saya"). The anchors (Cara kerja, Contoh laporan, Harga, FAQ) are exactly what warm desktop readers (marketing teams at a desk) use to jump.
2. **The dark-band field and button issue** (c) repeats in S9 and S15 on desktop.
3. **The S10 crops' black mock buttons** repeat on desktop.
4. **S12 desktop** is good: H2 and founder block left, card right. Same fix: the card holds the form, not a scroll button (g2).
5. **"Contoh laporan" behaves differently:** a sheet on mobile, an anchor to S11 on desktop. That's fine, but log both in analytics with `position` so we can compare them.
6. **Desktop hero** is strong: inline field and button, visual right, strip under the microcopy. The price-first strip order applies here too.
7. **After the click, desktop drops into the 480 px phone column** (decision 2026-10-21, desktop journey not designed yet). A desktop visitor goes from a wide page to a phone-width flow. Low risk, but add one line to the founder's list: the desktop journey design matters more if the marketing-team persona converts mostly on desktop. Measure the device split first.
8. Desktop length is about 17.5 screens at 1440 × 900. Fine.

---

### (g) Highest-impact layout changes for lofi v1.1 (ranked)

1. **Make the button the only dominant shape in every form on dark bands (S9, S15).** Filled accent button, visually distinct field. *Why first:* these are the two catch-forms for readers who scroll, and the squint test fails on both today.
2. **Put the form inside the S12 price card** (same component: field plus button, with "Bayar setelah klinik Anda kami temukan." directly above it), and set payment methods as a visible chip row. *Why:* S12 is the highest-intent screen on the page. A button that scrolls the reader up to S9 or down to S15 breaks the moment and makes them lose their place. S11's button may keep scrolling to the S12 form, which is then one short scroll away.
3. **Demote every mock button** (S10 crops J05 and J31, any button inside a mock) to grey, non-tappable styling inside a thin screen frame. *Why:* the darkest shapes on screens 15–17 are fake CTAs. They pull clicks and attention from the real one, and mis-taps on a "Ya, ini bisnis saya" that does nothing feel broken.
4. **Hero strip with the price first; the outreach variant's extra line removed or merged into the placeholder.** *Why:* it keeps "it costs money" above the fold inside the WhatsApp and Instagram in-app browsers, where most of our outreach and social traffic will open the page (5-second criterion c).
5. **Apply the cut plan with my changes** (module collapsed but showing one example; S10 crops compacted; S11 button moved up after the open action), and **make the S4 teaser look like the product, with an outline "Lihat contoh laporan" button**. Also hide the sticky bar while the S11/S12 buttons are visible, and make the desktop top bar sticky. *Why:* this gets to about 20 screens, puts a real action in the 2–13 gap, and stops duplicate CTAs stacking.

---

### (h) Short variant for T5 (about 8 screens, mobile)

**Purpose.** T5 tests whether cold and warm visitors convert better with the full education (control, about 20 screens) or a compressed argument (variant). Same hero, same words wherever a section survives. No new copy except the joins, which the copywriter writes.

| Order | Section (from the long page) | What stays | Est. screens |
|---|---|---|---|
| 1 | **S1 Hero** | Unchanged: eyebrow, H1, subtitle, form, microcopy, strip (price first), chat visual | 1.4 |
| 2 | **S3 New behaviour** (compact) | H2, "Dulu / Sekarang" two-card visual, one line of body. No module | 0.9 |
| 3 | **S4 Intent** (compact) | H2, the anatomy card with four tags, the **report teaser** card with "Lihat contoh laporan". Pew stat card dropped | 1.0 |
| 4 | **S7 What AI reads** (compact) | H2, the mismatch pair, 3 of the 5 checklist items, closing line "AI tidak tahu, kalau tidak tertulis." | 1.0 |
| 5 | **S9 Blind spot + bridge form** | H2, one body line, the DIY H3 with its first paragraph, the bridge form | 1.1 |
| 6 | **S10 How it works** | Three steps with tags (Gratis / Rp99.000 / Tab boleh ditutup), no crops, the unnamed-questions callout | 0.8 |
| 7 | **S11 Report** (compact) | Hasil singkat, one answer with sources, one open action, Download PDF, marketing card | 1.6 |
| 8 | **S12 Price with form** + the three most important limits | Price card with inline form; under it "Bukan peringkat · Bukan jaminan pasien · Bukan semua AI" as one compact line | 0.9 |
| 9 | **FAQ (top 5)** | SEO? · Cek sendiri di ChatGPT? · Katanya gratis, kok bayar? · Pertanyaannya menyebut nama klinik saya? · Kalau sudah bayar tapi ada masalah? | 0.6 |
| 10 | **Final CTA** | S15 band and form, plus one founder line if confirmed | 0.6 |

**Total: about 9.9 screens.** To land at about 8, drop row 4 (S7) and the FAQ to 3 items. Then it is pure "problem → proof → price".

**Dropped entirely in the short variant:** S2 pacing, S5 two doors (the Google/ChatGPT facts move to one line in the hero visual's caption if wanted), S6 the regulation tension, S8 answer → booking, S13 as a section, S16 the founder note (one line kept in the final band if confirmed).

**Test design:**
- **Primary metric:** form start rate (`lp_form_focused` or `lp_cta_clicked` per session).
- **Secondary metric:** checkout reach per form submit. The short page might win clicks but send less-convinced people to J06/J07.
- **Guardrail:** the "Ya, ini bisnis saya" confirm rate.
- **Split:** 50/50 by session if traffic allows. Otherwise sequential, two full weeks each, same channels, segmented by `src`. I expect the short page to win for outreach and referral traffic and the long page to win for social traffic. Choosing a page per `src` is a likely outcome, not a failure.
- **Sample reality:** about 430 sessions per arm detects a 2× difference at a 5% baseline (Part 1 §7). Below that, read only large gaps plus the qualitative signals.
- **Prerequisite:** the landing events from Part 1 §5.2 (`lp_viewed` with `variant`, `lp_cta_clicked`, `lp_section_viewed`, `lp_form_focused`) must be live before T5 starts, or the test can't be read. **[FOUNDER]**

Before any live traffic, run the same pair (long vs short) as a **preference test with 5–8 owners** (Part 1 §6.2). Ask each one to scroll as far as they'd naturally read and mark where they would stop or tap. That gives an early read on where the long page loses people, at no cost.

---

# Part 4. Risk check of the light page (v2)

> Reviewer: growth marketer, 24 October 2026. Checked [`STRATEGY-v2.md`](./STRATEGY-v2.md) against Part 1 §3 and my reviews in Parts 2 and 3.
> Only must-fix items, ranked by conversion risk. The weight rules are respected: every fix fits the word budgets (headline ≤ 8 words, line ≤ 15, card line ≤ 10).
> Outcome: all eight fixes are in [`COPY-v2.md`](./COPY-v2.md) and [`LOFI-v2.md`](./LOFI-v2.md). Where the final wording differs from a suggestion below, `COPY-v2.md` wins; the last list shows where each fix landed.

**Verdict:** the right weight, and most of my earlier requirements survive. Eight items need fixing before lofi v2 is final.

| # | Risk (one line) | Fix |
|---|---|---|
| 1 | **The hero never says the first step is free.** "Cek klinik saya di AI" plus "Nuave menunjukkan apakah AI merekomendasikan klinik Anda" reads as "tap = AI result". "Rp99.000 ... Bayar setelah ..." under it makes some people think tapping means paying, and others feel baited at J05. | Under the button: **"Gratis: kami temukan klinik Anda dulu. Audit AI Rp99.000, sekali bayar."** (11 words). Use the same line under the final form. |
| 2 | **First-screen fold at 360×640.** With the HaloAI-style demo inside the hero, the field and the price line drop below the fold, especially inside the WhatsApp and Instagram in-app browsers (my estimate is about 560 to 580 px visible). | On mobile, the order is H1 → line → field → button → price line → three facts → **then** the demo. The demo's top edge should peek above the fold at 390×844. Pass criterion: the button and the price line end by about 520 px at 360 wide. |
| 3 | **Step 2 hides the owner's own work.** "Kami tanya AI" implies done-for-you. After paying, the product asks the owner to check details (J10 to J26) and approve 10 questions. Paid visitors who didn't expect that are the costliest drop-off: paid with no report means a support case and a refund. | Step 2: **"Bayar, lalu cek detail dan 10 pertanyaan. Sebagian besar sudah kami isi."** Keep the Rp99.000 tag. Step 3 stays. |
| 4 | **The rater8 card mislabels the stat and mixes scopes without saying so.** The stat is "used a tool like ChatGPT or AI Overviews to research a provider", from 992 US adults. "Pasien di AS sudah mencari dokter lewat AI" reads as all US patients. The 40 juta card is global but unlabelled. The line under the H2 states a US vendor survey as a general fact. | Put the scope on each card, not only in the source line: **"47% · orang dewasa di AS memakai AI untuk mencari info dokter (survei rater8, 2026)"** · **"40 juta · orang di dunia bertanya soal kesehatan ke ChatGPT setiap hari"** · **"2024 · Google mulai menampilkan jawaban AI di Indonesia"**. Line under the H2: **"Di AS, AI sudah ikut menentukan pilihan dokter dan klinik."** Name rater8 in the source line as a survey by a reputation-services company (FAQ or notes if space is short). |
| 5 | **The report H2 "Lihat posisi klinik Anda" implies a ranking**, which contradicts "Bukan peringkat" two sections later. A careful owner will notice. | **"Lihat apa kata AI tentang klinik Anda."** (7 words). Keep "Tahu apa yang dibenahi." as the line under it. |
| 6 | **The final H2 "Tahu jawabannya sebelum pasien bertanya" is a promise we can't keep.** Answers vary and the report is one snapshot. It is the last line before the decision. | **"Baca sendiri apa kata AI tentang klinik Anda."** Or, for future pacing: **"Saat pasien bertanya ke AI, Anda sudah tahu polanya."** I prefer the first. |
| 7 | **The objection a sceptical owner raises first, "jawaban AI kan berubah-ubah" (O3), has no answer anywhere.** "Bisa dicek ulang" on the Jujur card also reads as a free re-check. | Jujur card: **"Satu potret, bukan peringkat. Cek ulang disarankan 6 sampai 8 minggu."** Add FAQ: **"Jawaban AI kan berubah-ubah?"** → **"Benar. Laporan mencatat jawaban pada satu waktu, lengkap dengan tanggal dan sumbernya. Karena itu kami sarankan cek ulang setelah 6 sampai 8 minggu."** Merge "Perlu data pasien?" into the "Tanpa data pasien" card to keep 9 FAQ questions. |
| 8 | **The bottom bar "Rp99.000 · Cek klinik saya" drops the free step.** On a 9-screen page it is the CTA most taps go through, so it must carry the free/paid truth. | Left text: **"Gratis dulu · Audit Rp99.000"**; button: **"Cek klinik saya"**. It shows after the hero form leaves view. It hides while the hero form, the price-card form or the final form is on screen, and while the keyboard is open. Tapping it scrolls to the **nearest form below** (the price card) and focuses the field; if no form is below, to the final form. Add safe-area padding. |

### Bridge form

**Not needed.** On a page of about 9 screens, the hero form, the price-card form (about screen 6), the final form and the sticky bar are enough. A fourth form would add weight without adding reach.

### Checked and fine (no action)

- **One action:** the same form and button in three places, plus the sticky bar. ✓
- **Proof early:** the report card in the hero, and the report tabs at about 50% of the page. ✓ The hero "3 dari 10" card must sit under the same "Contoh. Nama klinik fiktif." caption as the chat.
- **Price card with the form inside**, the reason line above the form, and payment chips. ✓ (These were my v1.1 changes.)
- **Objections now covered:** DIY (O2), Google (O12), cost and subscription (O8), branches (O14), Instagram-only (O11, placeholder), the regulation (O5), patient data (O6), PDF for the team (O15), not a ranking (O16), who's behind (O13, via the founder line).
- **Deliberately dropped and not a conversion risk:** O4 (small clinics) and O1 (Maps and Instagram) are carried well enough by section 2.
- **Still placeholders (notes only, not on the page):** delivery time and refund.
- **The long vs short test can't be read without analytics.** The landing events (`lp_viewed` with `variant`, `lp_cta_clicked` with `position`, `lp_form_focused`) must be live before v1 is tested against v2. **[FOUNDER]**

### Where each fix landed (orchestrator)

1. Hero and final form: "Gratis: kami temukan klinik Anda dulu. Audit Rp99.000, sekali bayar."
2. Mobile order as asked. The fold check passes: the price line ends at 461 px at 360×640 ([`LOFI-v2.md`](./LOFI-v2.md)).
3. Step 2: "Bayar dan cek" with "Cek detail dan 10 pertanyaan. Sebagian besar sudah kami isi."
4. Each card names its scope (di AS, di dunia, di Indonesia), and the source line names rater8 and the survey size. The line under the H2 keeps the report's finding, scoped to the US: "Di AS, AI sudah lebih berpengaruh daripada Google saat pasien memilih dokter." The notes call rater8 a vendor survey.
5. Report H2: "Lihat apa kata AI tentang klinik Anda."
6. Final H2: "Cek klinik Anda sebelum pasien berikutnya bertanya." It asks for the check and promises nothing about the answer.
7. Jujur card: "Satu potret, bukan peringkat. Cek ulang setelah 6 sampai 8 minggu." The FAQ "Jawaban AI kan berubah-ubah?" is in.
8. Sticky bar: "Gratis dulu · Audit Rp99.000" and "Cek klinik saya", with the show and hide rules in the lofi notes.


---

# Part 5. Risk check of v2.1 (Rp249.000, ChatGPT and Google AI Overview)

> Reviewer: growth marketer, 24 October 2026. Checked the round 5 brief (summarised in [`STRATEGY-v2.md`](./STRATEGY-v2.md) §10) against Part 1 §3 and Part 4, `COPY-v2.md` v2.0, and Spec 018 (Desired outcome, Experience, Report layout, R-10, R-17 to R-23, on branch `claude/laughing-fermi-prsgqf`).
> Only must-fix items, ranked by conversion risk. Every copy fix fits the weight rules (headline ≤ 8 words, line ≤ 15, card title 1 to 3 words with a line ≤ 10, FAQ ≤ 2 sentences).
> Outcome: all eight fixes are in [`COPY-v2.md`](./COPY-v2.md) v2.1 and [`LOFI-v2.md`](./LOFI-v2.md) v2.1; the last list shows where each landed. Orchestrator correction: the example's data month is **September 2026** (checked in the probe data), not October.

**Verdict:** the structure works, and the value list is the right answer to the price jump. Eight things must change first. The two biggest are launch timing and wording that promises more than the product delivers.

| # | Risk (one line) | Fix |
|---|---|---|
| 1 | **The page can go live before the product does.** Spec 018 is not merged. R-23 says the price and promise go live "only together with the checks". If v2.1 ships first, visitors see Rp249.000 and Google AI Overview, then get a Rp99.000 checkout or an OpenAI-only report. That means refunds and lost trust. | Gate the v2.1 release on the Spec 018 production deploy, in the same release. Keep v2 (Rp99.000) live until then. Before switching, run `verify-nuave` once on the Rp249.000 journey; its skill files still say Rp99.000 (R-23 lists them). |
| 2 | **The value list will lose to the price if it is long, vague or in the wrong place.** Eleven items of about 12 words each (≈130 words) breaks the 600-word budget once S3 and S4 grow. Items like "search numbers per topic" or "Google AI Overview answers" promise things not every report has. | **9 items, in this order** (questions, then answers, then result, then why, then what to do):<br>1. **10 pertanyaan pasien** · Berdasarkan pencarian Google untuk jenis klinik dan kota Anda.<br>2. **Jumlah pencarian** · Berapa kali topiknya dicari per bulan, bila datanya ada.<br>3. **Jawaban ChatGPT** · Setiap jawaban utuh, dengan sumber yang dibacanya.<br>4. **Google AI Overview** · Jawaban dari kota Anda, dan seberapa sering Google menampilkannya.<br>5. **Skor** · Muncul di berapa pertanyaan, di masing-masing tempat.<br>6. **Klinik lain** · Klinik lain yang disebut, dan di pertanyaan mana.<br>7. **Sumber AI** · Situs yang dibaca AI, dan apakah situs Anda salah satunya.<br>8. **Topik terlewat** · Topik yang dicari orang, tapi belum menyebut klinik Anda.<br>9. **Perbaikan dan PDF** · Yang dikerjakan duluan, siap dibawa ke rapat.<br>**Price placement:** the price goes in the line under the H2, so every item is read against it: H2 **"Yang Anda dapat dari satu audit."** Line: **"Rp249.000, sekali bayar. Bandingkan dengan harga satu tindakan di klinik Anda."** (12 words). Then the list, then the price card with the form directly under it. On desktop, put the list on the left and the price card on the right. No "senilai", no struck-through price, no "hingga 20 jawaban" (Google may show far fewer). |
| 3 | **At Rp249.000, "what if it fails or takes long?" decides the purchase, and the page still has no answer.** R-23 now gives a real one. Step 3 "15 menit" without "biasanya" is a promise the product does not make. The DIY objection is also sharper at 2.5 times the price. | **Price card, under the chips:** "Laporan biasanya siap dalam 15 menit setelah Anda menyetujui pertanyaan." **Step 3 line:** "Kami tanyakan ke ChatGPT dan Google AI Overview. Biasanya 15 menit." **FAQ "Kalau ada masalah?":** the R-23 text, word for word (it is exactly two sentences). **FAQ "Berapa lama?":** the first R-23 sentence. Mark both `[KONFIRMASI Q-1]` in the notes, because the founder approves the exact R-23 words. **FAQ "Bisa cek sendiri di ChatGPT?":** "Bisa, dan layak dicoba. Nuave menanyakan 10 pertanyaan berdasarkan pencarian Google ke ChatGPT dan ke Google AI Overview dari kota Anda, lalu mencatat jawaban, sumber, klinik lain yang disebut, dan apa yang dibenahi." |
| 4 | **"Pencarian asli" and "jawaban asli" overclaim.** Many questions are labelled "Disusun dari topik yang dicari": R-10a rewords any provider-choice text to add the city. Thin data falls back to "Disusun dari profil bisnis". "Asli" also invites "I asked ChatGPT and got something else", because answers vary by time, account and place. | **Hero fact:** "10 pertanyaan berdasarkan pencarian Google" (not "dari pencarian asli"). **Answers:** say "utuh" and "apa adanya", never "asli". **FAQ, new "Dari mana pertanyaannya?":** "Dari data pencarian Google untuk jenis klinik dan kota Anda; setiap pertanyaan diberi label asalnya. Bila datanya sedikit, sebagian kami susun dari profil klinik, dan labelnya menyebut itu." |
| 5 | **The S3 picture and the S5 mock imply Google always shows an AI Overview.** It often does not for local questions: the Spec records 3 of 6; the probe SUMMARY I read shows 2 of 6 "not shown", including "klinik kecantikan terbaik di Bandung". A buyer who gets "AI Overview di 3 dari 10" without warning will feel short-changed at Rp249.000. | **S3 caption:** "Contoh. Nama klinik fiktif. Google tidak selalu menampilkan AI Overview." **S3 H2:** "Pasien bertanya ke ChatGPT dan mencari di Google." (8 words; patients search Google, they don't "ask in AI Overview"). **S3 line:** "Jawaban ChatGPT dan Google AI Overview cuma menyebut beberapa klinik." (9 words). **S5 Skor mock:** show Z below M, for example "Google menampilkan AI Overview di 6 dari 10 pertanyaan", so a gap reads as normal and as a finding. Value list item 4 already says "seberapa sering". **FAQ "AI apa yang diuji?":** "ChatGPT dan Google AI Overview, dengan pertanyaan yang sama persis. Google sering tidak menampilkan AI Overview untuk pencarian lokal, dan laporan mencatat seberapa sering." Put no coverage number on the page. |
| 6 | **The hero line draft no longer says what the check finds.** "Mengecek klinik Anda di ChatGPT..." could mean anything, so 5-second criterion (a), "it checks whether AI names my clinic", is at risk. The longer line and three facts also push the fold at 360×640. | **Hero line:** "Lihat apakah klinik Anda muncul di ChatGPT dan Google AI Overview, dan apa yang dibenahi." (15 words; it also carries the search phrase, see 7). Keep the microcopy "Gratis: kami temukan klinik Anda dulu. Audit Rp249.000, sekali bayar." The designer re-runs the Part 4 fold check: the button and the price line must end by about 520 px at 360 wide. If they don't, the facts row may wrap below the fold, but the price line may not. |
| 7 | **The "cara muncul di Google AI Overview" search will not find this page unless the phrase is in the title, the description, a visible heading and the FAQ.** The site-wide title today is "Nuave · Apakah brand Anda muncul di ChatGPT?" | **Title** (61 characters): "Klinik Anda muncul di Google AI Overview dan ChatGPT? \| Nuave". **Meta description** (143 characters): "Cara tahu klinik Anda muncul di Google AI Overview dan ChatGPT: pertanyaan pasien dari pencarian Google, jawaban utuh, dan yang perlu dibenahi." Set both as page-level metadata on the clinic page; don't rely on the root layout. **FAQ question, first in the list:** "Bagaimana cara klinik muncul di Google AI Overview?" → "Tidak ada yang bisa menjaminnya: Google memilih sendiri sumbernya, dan sering tidak menampilkan AI Overview untuk pencarian lokal. Langkah pertama adalah tahu kondisi sekarang: pertanyaan mana yang memunculkan AI Overview, klinik dan situs apa yang disebut, dan informasi apa yang perlu dibenahi." The hero line (6) and the S3 heading carry the phrase too. Link-preview image: the AI Overview box with the "Klinik Anda?" slot. Expect little from the landing page itself: a "cara" query is usually won by an article. The next touchpoint should be one short article on this question that links here. Note only; it's not on this page. |
| 8 | **S6 and S7 become about two screens of text grids with no picture, right before the decision.** The four honesty cards are followed by nine list items. Cold readers drop off here, and the price card moves from about screen 6 to about 7.5. | Draw the value list as **one card that looks like a report or order summary** (the report header "Diperiksa di ChatGPT dan Google AI Overview", the nine rows, then the price card joined at its foot), so it reads as a picture, not a grid. Keep the S6 cards one line each, as in v2. The menu link "Harga" jumps to the S7 H2, where the price now appears. The sticky bar covers the gap. |

### Checked and fine (no action)

- **The free step survives the price jump.** "Gratis: kami temukan klinik Anda dulu. Audit Rp249.000, sekali bayar." (11 words) is still honest and early. "Bayar setelah klinik Anda kami temukan." in the price card matters more at the higher price, so keep it.
- **The anchor line** "Bandingkan dengan harga satu tindakan di klinik Anda." still holds at Rp249.000 for most clinic treatments, and it now sits in the S7 line (item 2).
- **Sticky bar** "Gratis dulu · Audit Rp249.000" / "Cek klinik saya" fits at 360 wide; the show and hide rules from Part 4 still apply.
- **FAQ "Apa yang gratis?":** swap the number only, and keep "Itu belum hasil AI".
- **Branches:** "Satu audit untuk satu kota: kota utama atau cabang yang Anda pilih." matches Spec 018.
- **The S4 example number** is fine if it's a real probe text with its real origin label and the full topic line: "Topik: harga implan gigi · ±4.400 pencarian/bulan di Google, seluruh Indonesia (data September 2026)", labelled "Contoh". Don't shorten it to "±4.400/bulan": "seluruh Indonesia" stops readers from reading it as their city's number. Don't pair an invented question with a real number.
- **S2 cards:** the 47% card keeps rater8's "seperti" ("AI seperti ChatGPT atau Google AI Overview"); the survey asked about "a tool like" these. The 2024 card is fine.
- **Names:** "ChatGPT dan Google AI Overview" everywhere; "klinik lain yang disebut", never "kompetitor". The hero demo staying ChatGPT-only is fine, because the floating card shows both sources.
- **FAQ count:** about 10 with the two new questions (7 and 4), once "Perlu data pasien?" stays merged into the card as in v2.
- **Price format:** always "Rp249.000", never "249rb" or "249K".

### One A/B test for v2.1

| # | Test | Hypothesis | Control vs variant | Primary metric | I | C | E | ICE |
|---|---|---|---|---|---|---|---|---|
| T15 | **Value list length** | At Rp249.000, the full concrete list makes the price feel small and raises form use at the price card more than it slows readers. | Variant: the nine-item list (item 2). Control: v2's four-item card at the new price. | Price-card form start (`lp_form_focused`, position `price`) per visitor who reaches S7; guardrails: checkout reach and scroll to S9 | 7 | 5 | 8 | **6.7** |

**Must be live first:** none of the landing events exist in `src/` yet. Ship `lp_viewed` (with `variant`, `src`), `lp_section_viewed` (S7), `lp_cta_clicked` and `lp_form_focused` (with `position`), joined by session to `checkout_started` and payment. At outreach traffic, run it as a 50/50 split by session if possible, otherwise two weeks each in sequence, and act only on a large difference. **[FOUNDER]** approves the analytics work before the test.

### Where each fix landed (orchestrator)

1. **Launch gate:** written into the status of `COPY-v2.md`, `LOFI-v2.md` and `STRATEGY-v2.md` §10. v2.1 ships only with Spec 018; v2 (Rp99.000) stays live until then.
2. **Value list:** nine items in growth's order under "Yang Anda dapat dari satu audit.", with the price in the line under it, drawn as one report-style card with the price card joined at its foot.
3. **Delivery and failure:** "biasanya 15 menit" in step 3; the R-23 sentence in the price card; R-23 in "Berapa lama?" and "Kalau ada masalah?"; marked `[KONFIRMASI Q-1]` for Yasir.
4. **No "asli":** the hero fact says "10 pertanyaan berdasarkan pencarian Google", and so does step 2. The answers are "ditanyakan langsung ke ChatGPT, dijawab utuh". The new FAQ "Dari mana pertanyaannya?" explains the labels.
5. **Google does not always show AI Overview:** the S3 caption says so, the S5 mock shows 6 of 10, value item 4 says "seberapa sering", and the FAQ "AI apa yang diuji?" says it plainly.
6. **Hero line:** "Lihat apakah klinik Anda muncul di ChatGPT dan Google AI Overview, dan apa yang dibenahi." The fold check is in `LOFI-v2.md`.
7. **Search capture:** the page-level title and description, the hero line, and the first FAQ question "Bagaimana cara klinik muncul di Google AI Overview?". The FAQ briefly named "Ringkasan AI", the feature's name on Google's Indonesian help page; Yasir removed it on 24 October 2026 and kept "Google AI Overview" only. Indexing needs `src/app/robots.ts` (today `disallow: /`, pre-release) removed at launch; a short article is the suggested next touchpoint.
8. **S6 and S7:** S6 stays one line per card; S7 is one card, not a grid.
